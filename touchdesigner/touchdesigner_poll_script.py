"""
TouchDesigner Python Integration Script
Project: Libraries Against Loneliness • Reflect & Connect
Site: RMIT Swanston Library Level 6 Wellbeing Installation

How to use in TouchDesigner:
1. Place a Table DAT in your network named 'table_reflections'.
2. Place a Text DAT or Execute DAT with this script.
3. Configure your SUPABASE_URL and SUPABASE_ANON_KEY below.
4. Set Execute DAT 'Timer' or 'Frame End' to poll every 1-2 seconds,
   or trigger on demand when the kiosk signals a new reflection.
"""

import urllib.request
import json
import time

# --- CONFIGURATION ---
SUPABASE_URL = "https://your-project.supabase.co" # Replace with your Supabase URL
SUPABASE_ANON_KEY = "your-anon-key"               # Replace with your Supabase Anon Key
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
    # Check if table_reflections DAT exists in TouchDesigner
    try:
        table_dat = op('table_reflections')
    except NameError:
        # Running outside TouchDesigner test environment
        table_dat = None

    if not table_dat:
        # If running outside TD or DAT not found, print sample
        return

    # Clear and set column headers matching our flat JSON keys
    columns = [
        "id", "timestamp", "score_connectedness", "score_social_energy", 
        "score_collective_empathy", "response_type", "response_text",
        "td_star_brightness", "td_pulse_rate_hz", "td_color_hue",
        "td_color_r", "td_color_g", "td_color_b",
        "td_line_thickness", "td_connection_distance", "td_star_scale"
    ]
    
    table_dat.clear()
    table_dat.appendRow(columns)

    for item in records:
        row = [
            str(item.get("id", "")),
            str(item.get("timestamp", "")),
            str(item.get("score_connectedness", 5)),
            str(item.get("score_social_energy", 5)),
            str(item.get("score_collective_empathy", 5)),
            str(item.get("response_type", "text")),
            str(item.get("response_text", "")),
            str(item.get("td_star_brightness", 0.5)),
            str(item.get("td_pulse_rate_hz", 1.0)),
            str(item.get("td_color_hue", 0.5)),
            str(item.get("td_color_r", 0.5)),
            str(item.get("td_color_g", 0.5)),
            str(item.get("td_color_b", 0.5)),
            str(item.get("td_line_thickness", 2.0)),
            str(item.get("td_connection_distance", 150)),
            str(item.get("td_star_scale", 1.0))
        ]
        table_dat.appendRow(row)

def trigger_new_star_event(record):
    """
    Called when a brand new reflection has just arrived.
    Can trigger an animation pulse, particle burst, or sound cue in TouchDesigner.
    """
    star_id = record.get("id")
    brightness = record.get("td_star_brightness", 1.0)
    rgb = (record.get("td_color_r", 1.0), record.get("td_color_g", 1.0), record.get("td_color_b", 1.0))
    line_thickness = record.get("td_line_thickness", 2.0)
    
    print(f"✨ [New Star Formed] ID: {star_id} | Brightness: {brightness} | RGB: {rgb} | Line: {line_thickness}")
    
    # Example: Fire a pulse parameter on a trigger CHOP
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
            # Only trigger visual pulse if we've already done initial fetch
            if len(seen_ids) > len(records):
                trigger_new_star_event(rec)

if __name__ == "__main__":
    # Test execution outside TouchDesigner
    print("Testing TouchDesigner polling handler...")
    data = fetch_recent_reflections()
    print(f"Fetched {len(data)} records.")
