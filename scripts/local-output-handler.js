/**
 * Local JSON Output & Directory Interaction Handler for TouchDesigner
 * Project: CONSTELLATE • Libraries Against Loneliness
 * Site: RMIT Swanston Library Level 6 Wellbeing Installation
 *
 * Provides triple-layer local disk output so TouchDesigner can run
 * 100% offline without requiring Supabase:
 * 1. Local HTTP Bridge POST: Sends to local Python server to save directly to touchdesigner/records/
 * 2. File System Access API: Writes directly to a user-selected folder via showDirectoryPicker()
 * 3. File Downloads / Batch Export: Instant download of individual or combined JSON files
 */

class LocalOutputHandler {
  constructor() {
    this.directoryHandle = null;
    this.autoDownloadEnabled = localStorage.getItem('LAL_AUTO_DOWNLOAD_JSON') === 'true';
    this.initIndexedDb();
  }

  /* -------------------------------------------------------------------------
     1. IndexedDB Directory Handle Persistence
     ------------------------------------------------------------------------- */
  initIndexedDb() {
    const request = indexedDB.open('ConstellateLocalKioskDB', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('handles')) {
        db.createObjectStore('handles');
      }
    };
    request.onsuccess = (e) => {
      this.db = e.target.result;
      this.restoreDirectoryHandle();
    };
    request.onerror = (e) => {
      console.warn('[LocalOutput] IndexedDB error:', e);
    };
  }

  async restoreDirectoryHandle() {
    if (!this.db) return;
    try {
      const tx = this.db.transaction('handles', 'readonly');
      const store = tx.objectStore('handles');
      const req = store.get('recordsDirHandle');
      req.onsuccess = async () => {
        const handle = req.result;
        if (handle && (await this.verifyPermission(handle, false))) {
          this.directoryHandle = handle;
          this.notifyStatusChange(`Connected to folder: ${handle.name}`);
        }
      };
    } catch (err) {
      console.warn('[LocalOutput] Error restoring directory handle:', err);
    }
  }

  async storeDirectoryHandle(handle) {
    if (!this.db) return;
    try {
      const tx = this.db.transaction('handles', 'readwrite');
      const store = tx.objectStore('handles');
      store.put(handle, 'recordsDirHandle');
    } catch (err) {
      console.warn('[LocalOutput] Error storing directory handle:', err);
    }
  }

  async verifyPermission(fileHandle, readWrite = true) {
    const options = {};
    if (readWrite) options.mode = 'readwrite';
    if ((await fileHandle.queryPermission(options)) === 'granted') return true;
    if ((await fileHandle.requestPermission(options)) === 'granted') return true;
    return false;
  }

  /* -------------------------------------------------------------------------
     2. File System Access API (showDirectoryPicker)
     ------------------------------------------------------------------------- */
  async pickOutputDirectory() {
    if (!('showDirectoryPicker' in window)) {
      return {
        supported: false,
        message: 'File System Access API is not supported in this browser. Use the local bridge server or automatic downloads.'
      };
    }

    try {
      const handle = await window.showDirectoryPicker({
        id: 'constellate_records_dir',
        mode: 'readwrite',
        startIn: 'documents'
      });

      const hasPermission = await this.verifyPermission(handle, true);
      if (!hasPermission) {
        return { supported: true, success: false, message: 'Write permission was not granted.' };
      }

      this.directoryHandle = handle;
      await this.storeDirectoryHandle(handle);
      this.notifyStatusChange(`Connected to folder: ${handle.name}`);
      return { supported: true, success: true, folderName: handle.name };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { supported: true, success: false, message: 'Directory selection cancelled.' };
      }
      return { supported: true, success: false, message: err.message };
    }
  }

  async writeRecordToDirectory(record) {
    if (!this.directoryHandle) return false;
    try {
      const hasPerm = await this.verifyPermission(this.directoryHandle, true);
      if (!hasPerm) return false;

      // 1. Write individual timestamped record: reflection_<id>.json
      const fileName = `reflection_${record.id}.json`;
      const fileHandle = await this.directoryHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(record, null, 2));
      await writable.close();

      // 2. Overwrite latest_reflection.json
      const latestHandle = await this.directoryHandle.getFileHandle('latest_reflection.json', { create: true });
      const latestWritable = await latestHandle.createWritable();
      await latestWritable.write(JSON.stringify(record, null, 2));
      await latestWritable.close();

      // 3. Update all_reflections.json feed
      let allRecords = [];
      try {
        const allHandle = await this.directoryHandle.getFileHandle('all_reflections.json', { create: false });
        const file = await allHandle.getFile();
        const text = await file.text();
        allRecords = JSON.parse(text);
      } catch (e) {
        allRecords = [];
      }

      allRecords = [record, ...allRecords.filter((r) => r.id !== record.id)];
      const allHandleWrite = await this.directoryHandle.getFileHandle('all_reflections.json', { create: true });
      const allWritable = await allHandleWrite.createWritable();
      await allWritable.write(JSON.stringify(allRecords, null, 2));
      await allWritable.close();

      return true;
    } catch (err) {
      console.warn('[LocalOutput] Error writing to directory handle:', err);
      return false;
    }
  }

  /* -------------------------------------------------------------------------
     3. Local HTTP Bridge Server Auto-Post
     ------------------------------------------------------------------------- */
  async postToLocalBridge(record) {
    try {
      // Try relative endpoint first (when served via local_bridge_server.py)
      const res = await fetch('/api/save-reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Try fallback to localhost:8080 if kiosk opened from another port or file://
      try {
        const fallbackRes = await fetch('http://localhost:8080/api/save-reflection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
        if (fallbackRes.ok) {
          return await fallbackRes.json();
        }
      } catch (e2) {
        // Silently ignore if local server not running
      }
    }
    return null;
  }

  /* -------------------------------------------------------------------------
     4. Browser File Download Utilities
     ------------------------------------------------------------------------- */
  downloadFile(content, fileName, mimeType = 'application/json') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }

  downloadSingleRecord(record) {
    this.downloadFile(JSON.stringify(record, null, 2), `reflection_${record.id}.json`);
  }

  downloadAllRecords() {
    const list = window.supabaseHandler ? window.supabaseHandler.getLocalHistory() : [];
    this.downloadFile(JSON.stringify(list, null, 2), 'all_reflections.json');
  }

  setAutoDownload(enabled) {
    this.autoDownloadEnabled = Boolean(enabled);
    localStorage.setItem('LAL_AUTO_DOWNLOAD_JSON', this.autoDownloadEnabled ? 'true' : 'false');
  }

  /* -------------------------------------------------------------------------
     5. Unified Save Entry Point (Called on each submission)
     ------------------------------------------------------------------------- */
  async handleRecordOutput(record) {
    const results = {
      bridgeSaved: false,
      directorySaved: false,
      downloaded: false
    };

    // 1. Post to local bridge server (touchdesigner/records/)
    const bridgeResult = await this.postToLocalBridge(record);
    if (bridgeResult && bridgeResult.status === 'success') {
      results.bridgeSaved = true;
    }

    // 2. Write to selected directory handle if active
    if (this.directoryHandle) {
      results.directorySaved = await this.writeRecordToDirectory(record);
    }

    // 3. Auto-download fallback if enabled
    if (this.autoDownloadEnabled) {
      this.downloadSingleRecord(record);
      results.downloaded = true;
    }

    return results;
  }

  notifyStatusChange(statusText) {
    const statusEl = document.getElementById('local-dir-status');
    if (statusEl) {
      statusEl.textContent = statusText;
      statusEl.classList.remove('hidden');
    }
  }
}

window.localOutputHandler = new LocalOutputHandler();
