#!/usr/bin/env python3
"""
CONSTELLATE • Local TouchDesigner Bridge & Static Server
Site: RMIT Swanston Library Level 6 Wellbeing Installation

Serves the Kiosk PWA locally while capturing all submitted reflections
and automatically writing them to the local 'touchdesigner/records/' directory.

This allows completely offline, zero-cloud TouchDesigner interaction
for prototype playback on the day.

Usage:
    python3 touchdesigner/local_bridge_server.py
    or
    npm run start:bridge
"""

import os
import sys
import json
import glob
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8080
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
RECORDS_DIR = os.path.join(SCRIPT_DIR, "records")

os.makedirs(RECORDS_DIR, exist_ok=True)


class TouchDesignerBridgeHandler(SimpleHTTPRequestHandler):
    """
    Serves static PWA files from project root while handling
    POST /api/save-reflection to write JSON records directly to disk.
    """

    def __init__(self, *args, **kwargs):
        # Serve static files from the repository root
        super().__init__(*args, directory=PROJECT_ROOT, **kwargs)

    def end_headers(self):
        # Enable CORS for local testing from any port or host
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200, "OK")
        self.end_headers()

    def do_GET(self):
        # API: Return all local reflection records as JSON array
        if self.path == "/api/reflections" or self.path.startswith("/api/reflections?"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            
            all_file = os.path.join(RECORDS_DIR, "all_reflections.json")
            if os.path.exists(all_file):
                with open(all_file, "rb") as f:
                    self.wfile.write(f.read())
            else:
                self.wfile.write(b"[]")
            return

        # API: Return the latest single reflection record
        if self.path == "/api/latest-reflection":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            
            latest_file = os.path.join(RECORDS_DIR, "latest_reflection.json")
            if os.path.exists(latest_file):
                with open(latest_file, "rb") as f:
                    self.wfile.write(f.read())
            else:
                self.wfile.write(b"{}")
            return

        # Fallback to standard static file server
        super().do_GET()

    def do_POST(self):
        # API: Save a new reflection to the local records directory
        if self.path in ("/api/save-reflection", "/api/reflection"):
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)

            try:
                record = json.loads(post_data.decode("utf-8"))
                record_id = record.get("id", f"lal_{int(self.date_time_string())}")
                
                # 1. Write individual JSON file
                indiv_filename = f"reflection_{record_id}.json"
                indiv_path = os.path.join(RECORDS_DIR, indiv_filename)
                with open(indiv_path, "w", encoding="utf-8") as f:
                    json.dump(record, f, indent=2)

                # 2. Overwrite latest_reflection.json
                latest_path = os.path.join(RECORDS_DIR, "latest_reflection.json")
                with open(latest_path, "w", encoding="utf-8") as f:
                    json.dump(record, f, indent=2)

                # 3. Update all_reflections.json
                all_path = os.path.join(RECORDS_DIR, "all_reflections.json")
                all_records = []
                if os.path.exists(all_path):
                    try:
                        with open(all_path, "r", encoding="utf-8") as f:
                            all_records = json.load(f)
                    except Exception:
                        all_records = []

                # Prepend new record (prevent duplicates)
                all_records = [r for r in all_records if r.get("id") != record_id]
                all_records.insert(0, record)

                with open(all_path, "w", encoding="utf-8") as f:
                    json.dump(all_records, f, indent=2)

                print(f"[Bridge] Saved local record: {indiv_filename} (Emotion: {record.get('feeling_label')}, Intensity: {record.get('score_intensity')})")

                response_body = json.dumps({
                    "status": "success",
                    "saved_file": indiv_filename,
                    "total_local_records": len(all_records),
                    "records_dir": RECORDS_DIR
                }).encode("utf-8")

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(response_body)))
                self.end_headers()
                self.wfile.write(response_body)

            except Exception as e:
                print(f"[Bridge Error] Failed to save record: {e}")
                err_body = json.dumps({"status": "error", "message": str(e)}).encode("utf-8")
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(err_body)))
                self.end_headers()
                self.wfile.write(err_body)
            return

        # 404 for unknown POST
        self.send_response(404)
        self.end_headers()


def run_server():
    server_address = ("", PORT)
    httpd = HTTPServer(server_address, TouchDesignerBridgeHandler)
    print("=" * 70)
    print("  CONSTELLATE • TouchDesigner Local Bridge Server")
    print("  RMIT Swanston Library Level 6 Wellbeing Installation")
    print("=" * 70)
    print(f"  PWA URL:              http://localhost:{PORT}/")
    print(f"  Local JSON Output:    {RECORDS_DIR}")
    print(f"  Latest Record File:   {os.path.join(RECORDS_DIR, 'latest_reflection.json')}")
    print(f"  All Records Feed:     {os.path.join(RECORDS_DIR, 'all_reflections.json')}")
    print("=" * 70)
    print("  Ready! Every kiosk reflection will automatically save to disk.")
    print("  Press Ctrl+C to stop.\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Bridge] Server stopped cleanly.")
        httpd.server_close()


if __name__ == "__main__":
    run_server()
