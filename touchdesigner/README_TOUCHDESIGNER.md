# TouchDesigner Integration Guide
### Project: *CONSTELLATE • Libraries Against Loneliness*
**Site:** RMIT Swanston Library Level 6 Wellbeing Installation

---

## 1. System Overview & Dual Interaction Architecture

The kiosk supports **both local and server-side TouchDesigner interaction** so you can seamlessly choose your playback strategy for prototype testing and on the day of the exhibition:

```
                      ┌───────────────────────────────────────┐
                      │    CONSTELLATE Interactive Kiosk      │
                      │         (Tablet / Browser PWA)        │
                      └──────────────────┬────────────────────┘
                                         │
                 ┌───────────────────────┴────────────────────────┐
                 ▼                                                ▼
     [LOCAL INTERACTION MODE]                         [SERVER-SIDE CLOUD MODE]
  Zero-internet offline prototype                    Multi-device cloud sync
                 │                                                │
                 ▼                                                ▼
   Local Directory: touchdesigner/records/            Supabase PostgreSQL Table
   • reflection_<timestamp>_<id>.json                 • reflections table (PostgREST)
   • latest_reflection.json (single star)
   • all_reflections.json (full feed)
                 │                                                │
                 └───────────────────────┬────────────────────────┘
                                         │
                                         ▼
                      ┌───────────────────────────────────────┐
                      │             TouchDesigner             │
                      │     (MODE = "LOCAL" or "SUPABASE")    │
                      │       Constellation Installation      │
                      └───────────────────────────────────────┘
```

---

## 2. Choosing Between Local and Server-Side on the Day

### How to Toggle Modes in TouchDesigner:
Open [`touchdesigner_poll_script.py`](./touchdesigner_poll_script.py) in TouchDesigner (inside an Execute DAT or Text DAT) and change line 19:

```python
# To read from local directory (100% offline, zero internet needed):
MODE = "LOCAL"

# Or to read live from the connected Supabase cloud database:
MODE = "SUPABASE"
```

Both modes output into the **exact same `table_reflections` DAT**, with identical column names and normalized ranges. Your TouchDesigner CHOPs, SOPs, and MATs will function identically regardless of which mode you select.

---

## 3. Local Directory Output (`touchdesigner/records/`)

When running in **LOCAL mode**, TouchDesigner watches the `./records` directory. The kiosk PWA automatically writes 3 formats to this directory:

1. **`reflection_<id>.json`**: An individual JSON file generated for each student submission.
2. **`latest_reflection.json`**: Always holds the single most recent submission (great for quick `File In DAT` or `JSON DAT` triggers).
3. **`all_reflections.json`**: An array containing all historical records in descending order (great for populating full constellation scenes).

### How the Kiosk PWA Outputs to `touchdesigner/records/`:

You have two convenient ways to have the kiosk write files to disk:

#### Option A: Run the Local Bridge Server (Zero-Click, Recommended)
Run the built-in lightweight local server from your terminal:
```bash
npm run start:bridge
# or: python3 touchdesigner/local_bridge_server.py
```
- Opens the kiosk at `http://localhost:8080/`.
- Every time a student taps "Light My Star", the server automatically captures the flat JSON and writes it into `touchdesigner/records/`.
- Runs completely offline without external network access.

#### Option B: Direct File System Access API (In Kiosk Settings)
1. Open the kiosk in any modern browser (Chrome, Edge, etc.).
2. Click the **TouchDesigner Bridge icon (⚙️)** in the top right.
3. In the **Local JSON Output Directory** section, click **"Select Output Folder"**.
4. Select the `touchdesigner/records/` folder.
5. Grant write permission. The kiosk will now write every submission directly into that directory on your hard drive!
6. You can also click **"Download Latest JSON"** or **"Export All Records"** at any time.

---

## 4. Flat Record Data Structure

Every record (both in Supabase and in local JSON files) uses the following clean, unbloated flat structure:

| Field Name | Type | Range / Format | Description |
| :--- | :--- | :--- | :--- |
| `id` | String | `lal_01_calm`, `lal_sample_01_calm` | Human-readable identifiable identifier |
| `timestamp` | ISO String | UTC Timestamp | Submission timestamp |
| `kiosk_id` | String | `'rmit-swanston-lvl6-booth-01'` | Kiosk booth identifier |
| `feeling_id` | String | `'happy'`, `'calm'`, `'tired'`, `'anxious'`, `'sad'`, `'frustrated'` | Q1 Emotion / Feeling ID |
| `feeling_label` | String | `'Happy'`, `'Calm'`, etc. | Human-readable emotion name |
| `score_intensity` | Integer | `1` to `5` | Q2: Star Intensity (1 Barely there to 5 Very strong) |
| `score_openness` | Integer | `1` to `5` | Q3: Scale & Presence (1 Turned inward to 5 Get amongst it!) |
| `score_mind_busyness` | Integer | `1` to `5` | Q4: Rotation & Orientation (1 Very quiet to 5 Racing) |
| `consent_given` | Boolean | `true` | Explicit user consent for installation display |
| `prompt_id` | String | `'main-library-connection'` | Active reflection prompt identifier |
| `prompt_question` | String | Text | Prompt question presented to user |
| `response_type` | String | `'text'`, `'audio'`, `'none'` | Media type (supports skip without words) |
| `response_text` | String | Max 300 chars | Text reflection (if provided) |
| `response_audio_base64`| String | Base64 URL | WebM/Ogg audio payload (in individual records if audio recorded) |
| `audio_duration_sec` | Float | `0.0` to `30.0` | Recorded duration in seconds |
| `char_count` | Integer | 0 to 300 | Character count of text response |
| `is_active` | Boolean | `true` | Moderation / display flag |

---

## 5. TouchDesigner Node Network Setup

### Setup 1: Python Table DAT (Dual-Mode Script)
1. Add a **Table DAT** and name it `table_reflections`.
2. Add a **Text DAT** and paste the code from [`touchdesigner_poll_script.py`](./touchdesigner_poll_script.py).
3. Set an **Execute DAT** (or **Timer CHOP**) to run `onFrame()` periodically (e.g., 1–2 times per second).
4. `table_reflections` will populate automatically whether you are reading from `records/` or Supabase.

### Setup 2: Direct Folder DAT (Pure TouchDesigner Nodes)
If you prefer not using Python:
1. Place a **Folder DAT**. Set `Folder` parameter to `./records` and `File Mask` to `reflection_*.json`.
2. Attach a **Sort DAT** set to sort by file modification date descending.
3. Connect to a **File In DAT** or **JSON DAT** referencing the first row of the Folder DAT to load the newest star data.

### Setup 3: Single File In DAT (`latest_reflection.json`)
1. Place a **JSON DAT** or **File In DAT**.
2. Set the file path to `./records/latest_reflection.json`.
3. Set `Auto Reload` to **On**.
4. Whenever the kiosk writes a new reflection, the node immediately updates!

### Setup 4: Real-Time Live Draft Feedback (`live_draft.json` & `table_live_draft`)
For live responsive visual feedback as the participant is currently moving sliders or typing at the booth:
1. Place a **JSON DAT** or **File In DAT** pointing to `./records/live_draft.json` with `Auto Reload` set to **On**.
2. Alternatively, add a **Table DAT** named `table_live_draft`; [`touchdesigner_poll_script.py`](./touchdesigner_poll_script.py) automatically streams the active participant's emotion, 1–5 scores, and text into it on every tick.
3. **No Burst Collisions**: Draft updates have `is_draft: true` and will **never** pulse `trigger_new_star` or trigger star explosion bursts. Only the final submission (`Light My Star`) triggers the explosion!
4. **Collision-Free Atomic Updates**: Files are swapped atomically (`.tmp` + rename) with a 75ms debounce, preventing file-lock collisions and UI lag.

---

## 6. Visual Parameter Mapping Guide (Inside TouchDesigner)

You can easily drive visual graphics in TouchDesigner directly from the clean 1–5 scores using Math CHOPs or expressions:

- **Star Emotion & Color (`feeling_id`)**:
  - Map `feeling_id` (`'happy'`, `'calm'`, `'tired'`, `'anxious'`, `'sad'`, `'frustrated'`) to your color lookup table or MAT colors.
- **Star Brightness / Luminosity (`score_intensity` 1–5)**:
  - Scale `score_intensity` (1–5) via Math CHOP to `0.20` – `1.00` for Constant MAT `Emit` or `Alpha`.
- **Star Scale & Presence (`score_openness` 1–5)**:
  - Scale `score_openness` (1–5) to `0.80` – `2.40` for Transform SOP scale and constellation line width.
- **Star Rotation Speed & Orientation (`score_mind_busyness` 1–5)**:
  - Scale `score_mind_busyness` (1–5) to `4.0` – `75.0` °/s for LFO / Speed CHOP rotation and `-60°` to `+60°` static tilt.
