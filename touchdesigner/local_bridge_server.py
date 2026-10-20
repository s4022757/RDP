#!/usr/bin/env python3
"""
CONSTELLATE • Local TouchDesigner Bridge & Static Server
Site: RMIT Swanston Library Level 6 Wellbeing Installation

Serves the Kiosk PWA locally and writes every submitted reflection to
touchdesigner/records/ for TouchDesigner to read.

Files written:
  reflection_lal_{seq:02d}_{feeling}.json   full record (includes audio if any)
  latest_reflection.json                    most recent record (audio stripped)
  all_reflections.json                      newest-first feed (audio stripped)

All writes are atomic (temp file + rename) so TouchDesigner never reads a
half-written file.

Usage:
    python3 touchdesigner/local_bridge_server.py
    or
    npm run start:bridge
"""

import os
import re
import json
import time
import glob
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8080
MAX_FEED = 500
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
RECORDS_DIR = os.path.join(SCRIPT_DIR, "records")
ALL_PATH = os.path.join(RECORDS_DIR, "all_reflections.json")
LATEST_PATH = os.path.join(RECORDS_DIR, "latest_reflection.json")
DRAFT_PATH = os.path.join(RECORDS_DIR, "live_draft.json")

os.makedirs(RECORDS_DIR, exist_ok=True)


def write_json_atomic(path, obj):
    """Write JSON to a temp file, then swap it into place in one step."""
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)
    os.replace(tmp, path)


def clean_record(record):
    """Remove bloated legacy/visual keys: score_connectedness, score_social_energy, score_collective_empathy, td_*."""
    if not isinstance(record, dict):
        return record
    cleaned = {}
    for k, v in record.items():
        if k in ("score_connectedness", "score_social_energy", "score_collective_empathy"):
            continue
        if k.startswith("td_"):
            continue
        cleaned[k] = v
    return cleaned


def strip_audio(record):
    """Copy of the record without the heavy base64 audio payload and cleaned of bloated keys."""
    return {k: v for k, v in clean_record(record).items() if k != "response_audio_base64"}


def highest_existing_number():
    """Highest N among files named reflection_lal_NN_*.json (0 if none)."""
    highest = 0
    for path in glob.glob(os.path.join(RECORDS_DIR, "reflection_lal_*.json")):
        match = re.match(r"reflection_lal_(\d+)_", os.path.basename(path))
        if match:
            highest = max(highest, int(match.group(1)))
    return highest


def get_next_record_identifier(record):
    """
    Returns a readable record ID such as 'lal_01_calm'.
    Descriptive IDs sent by the client (e.g. 'lal_sample_03_tired') are kept
    after sanitising. Auto-generated client IDs (lal_17..., or ending in a
    long random suffix) are replaced with the next sequential ID.
    """
    raw_id = str(record.get("id", "")).strip()
    feeling = str(record.get("feeling_id") or record.get("feeling_label") or "neutral").lower()
    feeling = re.sub(r"[^a-z0-9_-]", "", feeling) or "neutral"

    if raw_id and not raw_id.startswith("lal_17") and not re.search(r"_[a-z0-9]{6,}$", raw_id):
        return re.sub(r"[^A-Za-z0-9_-]", "-", raw_id)

    return f"lal_{highest_existing_number() + 1:02d}_{feeling}"


class TouchDesignerBridgeHandler(SimpleHTTPRequestHandler):
    """Serves the PWA from the project root and handles reflection saves."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PROJECT_ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_file_or_default(self, path, default_bytes):
        data = default_bytes
        if os.path.exists(path):
            with open(path, "rb") as f:
                data = f.read()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(200, "OK")
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/reflections" or self.path.startswith("/api/reflections?"):
            self._send_file_or_default(ALL_PATH, b"[]")
            return
        if self.path == "/api/latest-reflection":
            self._send_file_or_default(LATEST_PATH, b"{}")
            return
        if self.path == "/api/live-draft":
            self._send_file_or_default(DRAFT_PATH, b"{}")
            return
        super().do_GET()

    def do_POST(self):
        # 1. Real-time Live Draft Feedback Stream (Atomic rename, collision-free)
        if self.path in ("/api/live-draft", "/api/draft-reflection"):
            try:
                length = int(self.headers.get("Content-Length", 0))
                record = json.loads(self.rfile.read(length).decode("utf-8"))
                if not isinstance(record, dict):
                    raise ValueError("Body must be a JSON object")
            except Exception as e:
                self._send_json(400, {"status": "error", "message": f"Bad request: {e}"})
                return

            try:
                draft = clean_record(record)
                draft["id"] = "live_draft"
                draft["is_draft"] = True
                if not draft.get("timestamp"):
                    draft["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

                write_json_atomic(DRAFT_PATH, draft)
                self._send_json(200, {"status": "success", "file": "live_draft.json"})
            except Exception as e:
                self._send_json(500, {"status": "error", "message": str(e)})
            return

        # 2. Final Reflection Submission (Light My Star)
        if self.path not in ("/api/save-reflection", "/api/reflection"):
            self.send_response(404)
            self.end_headers()
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            record = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(record, dict):
                raise ValueError("Body must be a JSON object")
        except Exception as e:
            self._send_json(400, {"status": "error", "message": f"Bad request: {e}"})
            return

        try:
            record = clean_record(record)
            record_id = get_next_record_identifier(record)
            record["id"] = record_id
            record["is_draft"] = False
            if not record.get("timestamp"):
                record["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

            # 1. Full individual record (keeps audio)
            indiv_filename = f"reflection_{record_id}.json"
            write_json_atomic(os.path.join(RECORDS_DIR, indiv_filename), record)

            # Lightweight copy for the feed files
            feed_record = strip_audio(record)

            # 2. latest_reflection.json
            write_json_atomic(LATEST_PATH, feed_record)

            # 3. Synchronize live_draft.json so TouchDesigner knows draft is now finalized
            draft_final = dict(feed_record)
            draft_final["id"] = record_id
            draft_final["is_draft"] = False
            draft_final["is_submitted"] = True
            write_json_atomic(DRAFT_PATH, draft_final)

            # 3. all_reflections.json (newest first, no duplicates, capped)
            all_records = []
            if os.path.exists(ALL_PATH):
                try:
                    with open(ALL_PATH, "r", encoding="utf-8") as f:
                        loaded = json.load(f)
                    if isinstance(loaded, list):
                        all_records = loaded
                except Exception:
                    all_records = []

            all_records = [r for r in all_records if str(r.get("id")) != record_id]
            all_records.insert(0, feed_record)
            all_records = all_records[:MAX_FEED]
            write_json_atomic(ALL_PATH, all_records)

            print(f"[Bridge] Saved {indiv_filename} "
                  f"(feeling={record.get('feeling_id')}, "
                  f"intensity={record.get('score_intensity')}, "
                  f"openness={record.get('score_openness')}, "
                  f"busyness={record.get('score_mind_busyness')})")

            self._send_json(200, {
                "status": "success",
                "record_id": record_id,
                "saved_file": indiv_filename,
                "total_local_records": len(all_records),
                "records_dir": RECORDS_DIR,
            })
        except Exception as e:
            print(f"[Bridge Error] Failed to save record: {e}")
            self._send_json(500, {"status": "error", "message": str(e)})


def run_server():
    httpd = HTTPServer(("", PORT), TouchDesignerBridgeHandler)
    print("=" * 70)
    print("  CONSTELLATE • TouchDesigner Local Bridge Server")
    print("  RMIT Swanston Library Level 6 Wellbeing Installation")
    print("=" * 70)
    print(f"  PWA URL:            http://localhost:{PORT}/")
    print(f"  Records directory:  {RECORDS_DIR}")
    print(f"  Star feed for TD:   {ALL_PATH}")
    print("=" * 70)
    print("  Ready. Every reflection is saved to disk. Ctrl+C to stop.\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Bridge] Server stopped cleanly.")
        httpd.server_close()


if __name__ == "__main__":
    run_server()