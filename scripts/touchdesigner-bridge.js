/**
 * TouchDesigner Compatibility Layer & Flat Record Formatter
 * Formats kiosk entries into flat, graphics-ready JSON objects
 * specifically engineered for TouchDesigner Web Client DAT and Python scripts.
 */

class TouchDesignerBridge {
  /**
   * Look up feeling configuration
   */
  static getFeelingConfig(feelingId) {
    const list = KIOSK_CONFIG.feelings || [];
    return list.find(f => f.id === feelingId) || list[1] || {
      id: 'calm',
      label: 'Calm',
      icon: '😌',
      colorName: 'Ice Starlight',
      hue: 0.51,
      rgb: [0.824, 0.969, 0.977],
      cssColor: '#D2F7F9'
    };
  }

  /**
   * Computes normalized TouchDesigner visual parameters
   */
  static computeVisualParameters(data) {
    const feeling = this.getFeelingConfig(data.feeling);
    const intensity = Math.max(1, Math.min(5, parseInt(data.intensity, 10) || 3));
    const openness = Math.max(1, Math.min(5, parseInt(data.openness, 10) || 3));
    const mind = Math.max(1, Math.min(5, parseInt(data.mindBusyness, 10) || 3));

    // 1. Color from Q1 Feeling: Hue, RGB and Named Palette
    const td_star_color = feeling.id;
    const td_color_hue = feeling.hue;
    const [r, g, b] = feeling.rgb;

    // 2. Star Intensity & Brightness: Driven by Q2 Intensity (1-5 -> 0.20 to 1.00)
    const td_star_brightness = Math.round((0.20 + ((intensity - 1) / 4) * 0.80) * 1000) / 1000;

    // 3. Scale & Presence: Driven by Q3 Openness (1-5)
    // Scale: 0.8 to 2.4
    const td_star_scale = Math.round((0.8 + ((openness - 1) / 4) * 1.6) * 100) / 100;
    // Constellation Line Thickness: 1.0 to 6.0 px
    const td_line_thickness = Math.round((1.0 + ((openness - 1) / 4) * 5.0) * 100) / 100;
    // Proximity connection distance: 70 to 270 px
    const td_connection_distance = Math.round(70 + ((openness - 1) / 4) * 200);

    // 4. Rotation & Orientation: Driven by Q4 Mind Busyness (1-5)
    // "keep the rotation range wide enough to read at a distance in the installation"
    // Rotation speed in deg/s: 4 deg/s (serene) to 75 deg/s (swirling)
    const td_rotation_speed = Math.round((4.0 + ((mind - 1) / 4) * 71.0) * 10) / 10;
    // Static orientation tilt in degrees: -60 deg to +60 deg
    const td_rotation_angle = Math.round((-60.0 + ((mind - 1) / 4) * 120.0) * 10) / 10;
    // Starlight pulse rate: 0.3 Hz to 2.2 Hz
    const td_pulse_rate_hz = Math.round((0.3 + ((mind - 1) / 4) * 1.9) * 100) / 100;

    return {
      td_star_color,
      td_color_hue,
      td_color_r: r,
      td_color_g: g,
      td_color_b: b,
      td_star_brightness,
      td_star_scale,
      td_line_thickness,
      td_connection_distance,
      td_rotation_speed,
      td_rotation_angle,
      td_pulse_rate_hz
    };
  }

  /**
   * Generates a flat, normalized JSON record ready for Supabase & TouchDesigner
   */
  static formatRecord(data) {
    const id = data.id || ('lal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
    const timestamp = data.timestamp || new Date().toISOString();
    const feeling = this.getFeelingConfig(data.feeling);

    const intensity = Math.max(1, Math.min(5, parseInt(data.intensity, 10) || 3));
    const openness = Math.max(1, Math.min(5, parseInt(data.openness, 10) || 3));
    const mind = Math.max(1, Math.min(5, parseInt(data.mindBusyness, 10) || 3));

    const isSkipped = data.responseType === 'none' || (!data.responseText && !data.responseAudioBase64);
    const responseType = isSkipped ? 'none' : (data.responseType || 'text');

    const visual = this.computeVisualParameters({
      feeling: feeling.id,
      intensity,
      openness,
      mindBusyness: mind
    });

    return {
      id,
      timestamp,
      kiosk_id: KIOSK_CONFIG.kioskId,

      // Q1: Emotion / Feeling
      feeling_id: feeling.id,
      feeling_label: feeling.label,

      // Q2-Q4: 1-5 Scores
      score_intensity: intensity,
      score_openness: openness,
      score_mind_busyness: mind,

      // Backward-compatible 1-10 aliases for TouchDesigner / Supabase schema
      score_connectedness: openness * 2,
      score_social_energy: intensity * 2,
      score_collective_empathy: mind * 2,

      // Open reflection fields
      consent_given: Boolean(data.consentGiven !== false),
      prompt_id: isSkipped ? 'none' : (data.promptId || 'main-library-connection'),
      prompt_question: isSkipped ? '' : (data.promptQuestion || ''),
      response_type: responseType,
      response_text: responseType === 'text' ? (data.responseText || '').trim().slice(0, 300) : '',
      response_audio_base64: responseType === 'audio' ? (data.responseAudioBase64 || '') : '',
      audio_duration_sec: responseType === 'audio' ? (Math.round((data.audioDurationSec || 0) * 10) / 10) : 0,
      char_count: responseType === 'text' ? (data.responseText || '').length : 0,

      // Pre-calculated TouchDesigner visual parameters required by Supabase table schema
      td_star_color: visual.td_star_color,
      td_color_hue: visual.td_color_hue,
      td_color_r: visual.td_color_r,
      td_color_g: visual.td_color_g,
      td_color_b: visual.td_color_b,
      td_star_brightness: visual.td_star_brightness,
      td_star_scale: visual.td_star_scale,
      td_line_thickness: visual.td_line_thickness,
      td_connection_distance: visual.td_connection_distance,
      td_rotation_speed: visual.td_rotation_speed,
      td_rotation_angle: visual.td_rotation_angle,
      td_pulse_rate_hz: visual.td_pulse_rate_hz,

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
import urllib.request

def pollSupabase(url, anon_key):
    headers = {
        "apikey": anon_key,
        "Authorization": "Bearer " + anon_key,
        "Content-Type": "application/json"
    }
    req = urllib.request.Request(url + "/rest/v1/reflections?select=*&order=timestamp.desc&limit=25", headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            for item in data:
                star_id = item['id']
                feeling = item.get('feeling_label', 'Calm')
                brightness = item['td_star_brightness']
                scale = item['td_star_scale']
                rot_speed = item['td_rotation_speed']
                rgb = (item['td_color_r'], item['td_color_g'], item['td_color_b'])
                line_w = item['td_line_thickness']
                # print(f"Star {star_id}: {feeling} | Brightness={brightness} | Scale={scale} | Rot={rot_speed} deg/s")
            return data
    except Exception as e:
        print("Polling error:", e)
        return []
`;
  }
}

window.TouchDesignerBridge = TouchDesignerBridge;
