/**
 * TouchDesigner Compatibility Layer & Flat Record Formatter
 * Formats kiosk entries into flat, graphics-ready JSON objects
 * specifically engineered for TouchDesigner Web Client DAT and Python scripts.
 */

class TouchDesignerBridge {
  /**
   * Converts HSV (h in 0..1, s in 0..1, v in 0..1) to RGB (0..1)
   */
  static hsvToRgb(h, s, v) {
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    return [
      Math.round(r * 1000) / 1000,
      Math.round(g * 1000) / 1000,
      Math.round(b * 1000) / 1000
    ];
  }

  /**
   * Computes normalized TouchDesigner visual parameters from 1-10 scores
   */
  static computeVisualParameters(scores) {
    const connectedness = Math.max(1, Math.min(10, scores.connectedness || 5));
    const socialEnergy = Math.max(1, Math.min(10, scores.socialEnergy || 5));
    const empathy = Math.max(1, Math.min(10, scores.collectiveEmpathy || 5));

    // 1. Star Brightness: Driven by Collective Empathy (1-10 -> 0.15 to 1.00)
    const td_star_brightness = Math.round((0.15 + ((empathy - 1) / 9) * 0.85) * 1000) / 1000;

    // 2. Pulse Rate: Empathy also influences starlight pulse rhythm (0.2 Hz to 2.2 Hz)
    const td_pulse_rate_hz = Math.round((0.2 + ((empathy - 1) / 9) * 2.0) * 100) / 100;

    // 3. Color Hue: Driven by Social Energy (1-10 -> Cool Indigo/Cyan to Radiant Warm Amber/Rose)
    // 1 (Quiet focus) = 0.65 (indigo) -> 5 (Gentle balance) = 0.48 (teal) -> 10 (Open door) = 0.08 (amber/gold)
    const tEnergy = (socialEnergy - 1) / 9;
    // Non-linear smooth curve from indigo (0.65) down to warm gold (0.08)
    const td_color_hue = Math.round((0.65 - (tEnergy * 0.57)) * 1000) / 1000;
    const saturation = 0.78;
    const value = Math.max(0.6, td_star_brightness);
    const [r, g, b] = this.hsvToRgb(td_color_hue, saturation, value);

    // 4. Line Thickness: Driven by Environmental Connectedness (1-10 -> 0.8 to 6.5)
    const td_line_thickness = Math.round((0.8 + ((connectedness - 1) / 9) * 5.7) * 100) / 100;

    // 5. Connection Proximity Distance: Driven by Connectedness (1-10 -> 70 to 290 px)
    const td_connection_distance = Math.round(70 + ((connectedness - 1) / 9) * 220);

    // 6. Star Scale: 0.8 to 2.4
    const td_star_scale = Math.round((0.8 + ((empathy - 1) / 9) * 1.6) * 100) / 100;

    return {
      td_star_brightness,
      td_pulse_rate_hz,
      td_color_hue,
      td_color_r: r,
      td_color_g: g,
      td_color_b: b,
      td_line_thickness,
      td_connection_distance,
      td_star_scale
    };
  }

  /**
   * Generates a flat, normalized JSON record ready for Supabase & TouchDesigner
   */
  static formatRecord(data) {
    const id = data.id || ('lal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
    const timestamp = data.timestamp || new Date().toISOString();
    const scores = {
      connectedness: parseInt(data.connectedness, 10) || 5,
      socialEnergy: parseInt(data.socialEnergy, 10) || 5,
      collectiveEmpathy: parseInt(data.collectiveEmpathy, 10) || 5
    };

    const visual = this.computeVisualParameters(scores);

    // Flat JSON object strictly formatted for TouchDesigner Web Client DAT / Python table ingestion
    return {
      id,
      timestamp,
      kiosk_id: KIOSK_CONFIG.kioskId,
      score_connectedness: scores.connectedness,
      score_social_energy: scores.socialEnergy,
      score_collective_empathy: scores.collectiveEmpathy,
      prompt_id: data.promptId || 'encouragement',
      prompt_question: data.promptQuestion || '',
      response_type: data.responseType || 'text', // 'text' | 'audio'
      response_text: data.responseType === 'text' ? (data.responseText || '').trim().slice(0, 300) : '',
      response_audio_base64: data.responseType === 'audio' ? (data.responseAudioBase64 || '') : '',
      audio_duration_sec: data.responseType === 'audio' ? (Math.round((data.audioDurationSec || 0) * 10) / 10) : 0,
      char_count: data.responseType === 'text' ? (data.responseText || '').length : 0,
      
      // Flat TouchDesigner visual parameters
      td_star_brightness: visual.td_star_brightness,
      td_pulse_rate_hz: visual.td_pulse_rate_hz,
      td_color_hue: visual.td_color_hue,
      td_color_r: visual.td_color_r,
      td_color_g: visual.td_color_g,
      td_color_b: visual.td_color_b,
      td_line_thickness: visual.td_line_thickness,
      td_connection_distance: visual.td_connection_distance,
      td_star_scale: visual.td_star_scale,
      
      is_active: true
    };
  }

  /**
   * TouchDesigner-friendly Python sample script generator for Web Client DAT
   */
  static getSamplePythonScript() {
    return `# TouchDesigner Python Script: Fetch Reflections from Supabase
# Attach to an Execute DAT or Web Client DAT callback
import json

def onTable(dat):
    pass

def pollSupabase(url, anon_key):
    import urllib.request
    headers = {
        "apikey": anon_key,
        "Authorization": "Bearer " + anon_key,
        "Content-Type": "application/json"
    }
    req = urllib.request.Request(url + "/rest/v1/reflections?select=*&order=timestamp.desc&limit=25", headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            # Process records directly into TouchDesigner CHOPs or SOPs
            for item in data:
                star_id = item['id']
                brightness = item['td_star_brightness']
                hue = item['td_color_hue']
                rgb = (item['td_color_r'], item['td_color_g'], item['td_color_b'])
                line_w = item['td_line_thickness']
                dist = item['td_connection_distance']
                # print(f"Star {star_id}: Brightness={brightness}, Hue={hue}, Line={line_w}")
            return data
    except Exception as e:
        print("Polling error:", e)
        return []
`;
  }
}

window.TouchDesignerBridge = TouchDesignerBridge;
