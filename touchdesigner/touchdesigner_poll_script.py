"""
TouchDesigner Python Integration Script: Dual-Mode (Local Directory & Supabase)
Project: CONSTELLATE • Libraries Against Loneliness
Site: RMIT Swanston Library Level 6 Wellbeing Installation

Allows instantaneous switching between:
1. "LOCAL": Reads flat JSON files from the local 'records/' directory (offline prototype playback).
2. "SUPABASE": Polls the live Supabase cloud database via REST (server-side interaction).
"""

import os
import glob
import json
import time
import urllib.request

# ==============================================================================
# PLAYBACK MODE CONFIGURATION
# Set to "LOCAL" for local directory playback or "SUPABASE" for live cloud sync.
# ==============================================================================
MODE = "LOCAL"  # Options: "LOCAL" or "SUPABASE"

# --- LOCAL DIRECTORY SETTINGS ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOCAL_RECORDS_DIR = os.path.join(SCRIPT_DIR, "records")
LOCAL_ALL_FILE = os.path.join(LOCAL_RECORDS_DIR, "all_reflections.json")
LOCAL_LATEST_FILE = os.path.join(LOCAL_RECORDS_DIR, "latest_reflection.json")

# --- SUPABASE SERVER SETTINGS ---
SUPABASE_URL = "https://viwuibpyqwlpztencstv.supabase.co"
SUPABASE_ANON_KEY = "sb_publishable_xzr4AYx0vHpicyRGNzTZ9Q_kkf1vfLH"
TABLE_NAME = "reflections"
FETCH_LIMIT = 20

# Cache of known reflection IDs to detect newly arrived stars in TouchDesigner
seen_ids = set()


def fetch_from_local_directory():
    """
    Reads reflection records from the local json directory.
    Supports either all_reflections.json or individual reflection_*.json files.
    """
    records = []
    
    # 1. Prefer reading individual reflection_*.json files sorted by mod time / timestamp
    if os.path.isdir(LOCAL_RECORDS_DIR):
        file_pattern = os.path.join(LOCAL_RECORDS_DIR, "reflection_*.json")
        json_files = glob.glob(file_pattern)
        
        # Sort files by newest modification time first
        json_files.sort(key=os.path.getmtime, reverse=True)
        
        for fpath in json_files[:FETCH_LIMIT]:
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict) and "id" in data:
                        records.append(data)
            except Exception as e:
                print(f"[TD Local Error] Could not read {fpath}: {e}")

    # 2. Fallback to all_reflections.json if no individual files found
    if not records and os.path.isfile(LOCAL_ALL_FILE):
        try:
            with open(LOCAL_ALL_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    records = data[:FETCH_LIMIT]
        except Exception as e:
            print(f"[TD Local Error] Could not read {LOCAL_ALL_FILE}: {e}")

    # 3. Fallback to latest_reflection.json as a single entry
    if not records and os.path.isfile(LOCAL_LATEST_FILE):
        try:
            with open(LOCAL_LATEST_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    records = [data]
        except Exception as e:
            print(f"[TD Local Error] Could not read {LOCAL_LATEST_FILE}: {e}")

    return records


def fetch_from_supabase():
    """
    Polls the Supabase PostgREST endpoint for recent reflections.
    """
    if not SUPABASE_URL.startswith("http"):
        print("[TD Warning] Please set a valid SUPABASE_URL in the script.")
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
                print(f"[TD Error] Supabase returned status {response.status}")
                return []
    except Exception as e:
        print(f"[TD Polling Error] {e}")
        return []


def fetch_recent_reflections():
    """
    Dispatches to local directory or Supabase based on the active MODE.
    """
    if MODE.upper() == "LOCAL":
        return fetch_from_local_directory()
    else:
        return fetch_from_supabase()


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
            str(item.get("td_color_hue", 0.51)),
            str(item.get("td_color_r", 0.824)),
            str(item.get("td_color_g", 0.969)),
            str(item.get("td_color_b", 0.977)),
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
    
    print(f"✨ [New Star Formed] Mode: {MODE} | ID: {star_id} | Emotion: {feeling} | Brightness: {brightness} | Scale: {scale} | Rot: {rot_speed} deg/s | RGB: {rgb}")
    
    try:
        trigger_chop = op('trigger_new_star')
        if trigger_chop:
            trigger_chop.par.triggerpulse.pulse()
    except Exception:
        pass


def onFrame():
    """
    Execute DAT callback to poll and update TouchDesigner parameters.
    Can be called on every frame or on a Timer CHOP tick (e.g. 1 Hz).
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
    print(f"Testing TouchDesigner handler in MODE = '{MODE}'...")
    data = fetch_recent_reflections()
    print(f"Successfully fetched {len(data)} records in {MODE} mode.")
    for idx, r in enumerate(data):
        print(f"  [{idx+1}] {r.get('id')} - {r.get('feeling_label')} (Intensity: {r.get('score_intensity')}, Openness: {r.get('score_openness')}, Mind: {r.get('score_mind_busyness')})")
