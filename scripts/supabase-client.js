/**
 * Supabase Database Integration Handler for Libraries Against Loneliness
 * Pushes ratings, timestamps, and text/audio payloads to Supabase table
 * with offline resilience, local queue buffering, and connection testing.
 */

class SupabaseKioskHandler {
  constructor() {
    this.url = KIOSK_CONFIG.supabase.url;
    this.anonKey = KIOSK_CONFIG.supabase.anonKey;
    this.tableName = KIOSK_CONFIG.supabase.tableName || 'reflections';
    this.client = null;
    this.isConfigured = false;
    this.initClient();
  }

  updateCredentials(url, anonKey) {
    this.url = (url || '').trim();
    this.anonKey = (anonKey || '').trim();
    localStorage.setItem('LAL_SUPABASE_URL', this.url);
    localStorage.setItem('LAL_SUPABASE_KEY', this.anonKey);
    KIOSK_CONFIG.supabase.url = this.url;
    KIOSK_CONFIG.supabase.anonKey = this.anonKey;
    this.initClient();
  }

  initClient() {
    this.isConfigured = Boolean(this.url && this.anonKey && this.url.startsWith('https://'));
    if (this.isConfigured && window.supabase && window.supabase.createClient) {
      try {
        this.client = window.supabase.createClient(this.url, this.anonKey);
      } catch (e) {
        console.warn('Supabase client init error:', e);
        this.client = null;
      }
    } else {
      this.client = null;
    }
  }

  /**
   * Tests the Supabase connection by making a lightweight HEAD / SELECT query
   */
  async testConnection() {
    if (!this.isConfigured) {
      return { success: false, message: 'Supabase URL and Anon Key are not yet configured.' };
    }

    try {
      // Use direct REST endpoint to verify PostgREST
      const endpoint = `${this.url}/rest/v1/${this.tableName}?select=id&limit=1`;
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'apikey': this.anonKey,
          'Authorization': `Bearer ${this.anonKey}`,
          'Range': '0-0'
        }
      });

      if (res.ok || res.status === 206) {
        return { success: true, message: 'Successfully connected to Supabase table!' };
      } else {
        const errorText = await res.text();
        return { 
          success: false, 
          message: `Supabase returned HTTP ${res.status}: ${errorText || res.statusText}` 
        };
      }
    } catch (err) {
      return { 
        success: false, 
        message: `Network error reaching Supabase: ${err.message}` 
      };
    }
  }

  /**
   * Submits a reflection record to Supabase (or queues locally if offline/unconfigured)
   */
  async submitRecord(record) {
    // 1. Always save a copy to local history for TouchDesigner inspection & offline kiosk resilience
    this.saveToLocalHistory(record);

    if (!this.isConfigured) {
      this.queueOffline(record);
      return {
        success: true,
        mode: 'offline_local',
        message: 'Saved to local kiosk memory (Supabase credentials not configured).',
        record
      };
    }

    try {
      // Try official Supabase client first
      if (this.client) {
        const { data, error } = await this.client
          .from(this.tableName)
          .insert([record])
          .select();

        if (error) throw error;

        return {
          success: true,
          mode: 'supabase_live',
          message: 'Instantly synced to Supabase!',
          record: (data && data[0]) ? data[0] : record
        };
      }

      // Fallback: direct PostgREST fetch if CDN script failed or blocked
      const endpoint = `${this.url}/rest/v1/${this.tableName}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': this.anonKey,
          'Authorization': `Bearer ${this.anonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(record)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const returnedData = await response.json();
      return {
        success: true,
        mode: 'supabase_live',
        message: 'Instantly synced to Supabase via REST!',
        record: returnedData[0] || record
      };

    } catch (err) {
      console.warn('Supabase live push failed, queueing record for offline sync:', err);
      this.queueOffline(record);
      return {
        success: true,
        mode: 'queued_offline',
        message: 'Saved locally in kiosk queue; will sync when network reconnects.',
        record
      };
    }
  }

  saveToLocalHistory(record) {
    try {
      const history = JSON.parse(localStorage.getItem('LAL_LOCAL_SUBMISSIONS') || '[]');
      // Keep most recent 50 submissions locally
      history.unshift(record);
      if (history.length > 50) history.pop();
      localStorage.setItem('LAL_LOCAL_SUBMISSIONS', JSON.stringify(history));
    } catch (e) {
      console.warn('Local storage write error:', e);
    }
  }

  queueOffline(record) {
    try {
      const queue = JSON.parse(localStorage.getItem('LAL_OFFLINE_QUEUE') || '[]');
      queue.push(record);
      localStorage.setItem('LAL_OFFLINE_QUEUE', JSON.stringify(queue));
    } catch (e) {
      console.warn('Offline queue write error:', e);
    }
  }

  getOfflineQueueCount() {
    try {
      const queue = JSON.parse(localStorage.getItem('LAL_OFFLINE_QUEUE') || '[]');
      return queue.length;
    } catch (e) {
      return 0;
    }
  }

  getLocalHistory() {
    try {
      return JSON.parse(localStorage.getItem('LAL_LOCAL_SUBMISSIONS') || '[]');
    } catch (e) {
      return [];
    }
  }

  async flushOfflineQueue() {
    if (!this.isConfigured) return { flushed: 0, remaining: 0 };
    try {
      const queue = JSON.parse(localStorage.getItem('LAL_OFFLINE_QUEUE') || '[]');
      if (queue.length === 0) return { flushed: 0, remaining: 0 };

      const successful = [];
      for (const item of queue) {
        try {
          const res = await this.submitRecord(item);
          if (res.mode === 'supabase_live') {
            successful.push(item.id);
          }
        } catch (e) {
          break; // Stop on first error
        }
      }

      const remaining = queue.filter(item => !successful.includes(item.id));
      localStorage.setItem('LAL_OFFLINE_QUEUE', JSON.stringify(remaining));
      return { flushed: successful.length, remaining: remaining.length };
    } catch (e) {
      return { flushed: 0, remaining: 0 };
    }
  }
}

window.supabaseHandler = new SupabaseKioskHandler();
