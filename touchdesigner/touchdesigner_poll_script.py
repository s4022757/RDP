"""
TouchDesigner Python Integration Script
Project: Libraries Against Loneliness • Reflect & Connect
Site: RMIT Swanston Library Level 6 Wellbeing Installation
Updated for "To change.md" guidelines:
- Emotion / Feeling (Word + Icon, Not Color Alone)
- Q2: Star Intensity (1-5) -> Brightness
- Q3: Openness (1-5) -> Scale & Line Thickness
- Q4: Mind Busyness (1-5) -> Rotation Speed & Orientation
- Optional Response / Skip support
"""

import urllib.request
import json
import time

# --- CONFIGURATION ---
SUPABASE_URL = "https://viwuibpyqwlpztencstv.supabase.co" # Configured Supabase project
SUPABASE_ANON_KEY = "sb_publishable_xzr4AYx0vHpicyRGNzTZ9Q_kkf1vfLH"
TABLE_NAME = "reflections"
FETCH_LIMIT = 20

# Cache of known reflection IDs to detect newly arrived stars
seen_ids = set()

def fetch_recent_reflections():
    """
    Polls the Supabase PostgREST endpoint for recent reflections.
    Returns a list of flat dictionaries ready for TouchDesigner operators.
    """
    if not SUPABASE_URL.startswith("http"):
        print("[LAL Warning] Please set a valid SUPABASE_URL in the script.")
        return []

    endpoint = f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}?select=*&order=timestamp.desc&limit={FETCH_LIMIT}"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json"
    }

    req = urllib.request.Request(endpoint, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                body = response.read().decode('utf-8')
                records = json.loads(body)
                return records
            else:
                print(f"[LAL Error] Supabase returned status {response.status}")
                return []
    except Exception as e:
        print(f"[LAL Polling Error] {e}")
        return []

def update_touchdesigner_table(records):
    """
    Populates an existing TouchDesigner Table DAT ('table_reflections')
    with flat parameters for direct CHOP/SOP referencing.
    """
    try:
        table_dat = op('table_reflections')
    except NameError:
        table_dat = None

    if not table_dat:
        return

    # Clear and set column headers matching our flat JSON keys
    columns = [
        "id", "timestamp", "feeling_id", "feeling_label",
        "score_intensity", "score_openness", "score_mind_busyness",
        "response_type", "response_text",
        "td_star_color", "td_star_brightness", "td_star_scale",
        "td_color_hue", "td_color_r", "td_color_g", "td_color_b",
        "td_line_thickness", "td_connection_distance",
        "td_rotation_speed", "td_rotation_angle", "td_pulse_rate_hz"
    ]
    
    table_dat.clear()
    table_dat.appendRow(columns)

    for item in records:
        row = [
            str(item.get("id", "")),
            str(item.get("timestamp", "")),
            str(item.get("feeling_id", "calm")),
            str(item.get("feeling_label", "Calm")),
            str(item.get("score_intensity", 3)),
            str(item.get("score_openness", 3)),
            str(item.get("score_mind_busyness", 3)),
            str(item.get("response_type", "text")),
            str(item.get("response_text", "")),
            str(item.get("td_star_color", "calm")),
            str(item.get("td_star_brightness", 0.6)),
            str(item.get("td_star_scale", 1.2)),
            str(item.get("td_color_hue", 0.48)),
            str(item.get("td_color_r", 0.18)),
            str(item.get("td_color_g", 0.83)),
            str(item.get("td_color_b", 0.75)),
            str(item.get("td_line_thickness", 3.0)),
            str(item.get("td_connection_distance", 150)),
            str(item.get("td_rotation_speed", 25.0)),
            str(item.get("td_rotation_angle", 0.0)),
            str(item.get("td_pulse_rate_hz", 1.0))
        ]
        table_dat.appendRow(row)

def trigger_new_star_event(record):
    """
    Called when a brand new reflection has just arrived.
    Fires visual burst and sound cues in TouchDesigner.
    """
    star_id = record.get("id")
    feeling = record.get("feeling_label", "Calm")
    brightness = record.get("td_star_brightness", 0.6)
    scale = record.get("td_star_scale", 1.0)
    rot_speed = record.get("td_rotation_speed", 25.0)
    rgb = (record.get("td_color_r", 0.5), record.get("td_color_g", 0.5), record.get("td_color_b", 0.5))
    
    print(f"✨ [New Star Formed] ID: {star_id} | Emotion: {feeling} | Brightness: {brightness} | Scale: {scale} | Rot: {rot_speed} deg/s | RGB: {rgb}")
    
    try:
        trigger_chop = op('trigger_new_star')
        if trigger_chop:
            trigger_chop.par.triggerpulse.pulse()
    except Exception:
        pass

def onFrame():
    """
    Execute DAT callback to poll and update TouchDesigner parameters.
    """
    global seen_ids
    records = fetch_recent_reflections()
    if not records:
        return

    update_touchdesigner_table(records)

    # Detect new records
    for rec in reversed(records):
        rec_id = rec.get("id")
        if rec_id and rec_id not in seen_ids:
            seen_ids.add(rec_id)
            if len(seen_ids) > len(records):
                trigger_new_star_event(rec)

if __name__ == "__main__":
    print("Testing TouchDesigner polling handler...")
    data = fetch_recent_reflections()
    print(f"Fetched {len(data)} records.")
