# TouchDesigner Integration Guide
### Project: *Libraries Against Loneliness • Reflect & Connect*
**Site:** RMIT Swanston Library Level 6 Wellbeing Installation

---

## 1. System Overview

```
 ┌────────────────────────┐         ┌─────────────────────────┐         ┌──────────────────────────┐
 │   Interactive Kiosk    │         │    Supabase Database    │         │      TouchDesigner       │
 │      PWA on Tablet     │ ──────> │      (Table: reflections│ ──────> │   Constellation Visual   │
 │ (4 Questions + Stream) │  HTTPS  │     Flat JSON format)   │  POLL   │  (Projection / Display)  │
 └────────────────────────┘         └─────────────────────────┘         └──────────────────────────┘
```

The kiosk interface collects 4 questions (1-question-per-screen) and an optional reflection (text, 30s voice recording, or skipped). Before saving to Supabase, it formats the data as a **flat JSON object** pre-computed with normalized visual parameters specifically designed for TouchDesigner.

---

## 2. Flat Record Data Structure

Every row in the `reflections` table is structured as a flat object ready for TouchDesigner:

| Field Name | Type | Range / Format | Description & Mapping |
| :--- | :--- | :--- | :--- |
| `id` | String | `lal_172...` | Unique identifier for the reflection star |
| `timestamp` | ISO String | UTC Timestamp | Creation time |
| `feeling_id` | String | `'happy'`, `'calm'`, `'tired'`, `'anxious'`, `'sad'`, `'frustrated'` | Q1 Emotion / Feeling |
| `feeling_label` | String | `'Happy'`, `'Calm'`, etc. | Human-readable emotion name |
| `score_intensity` | Integer | `1` to `5` | Q2: Star Intensity (1 Barely there to 5 Very strong) |
| `score_openness` | Integer | `1` to `5` | Q3: Scale & Presence (1 Turned inward to 5 Get amongst it!) |
| `score_mind_busyness` | Integer | `1` to `5` | Q4: Rotation & Orientation (1 Very quiet to 5 Racing) |
| `consent_given` | Boolean | `true` | Explicit user consent for installation display |
| `response_type` | String | `'text'`, `'audio'`, `'none'` | Media type (supports skip without words) |
| `response_text` | String | Max 300 chars | Text reflection (if provided) |
| `response_audio_base64`| String | Base64 URL | WebM/Ogg audio payload (if provided) |
| `audio_duration_sec` | Float | `0.0` to `30.0` | Recorded duration in seconds |
| **`td_star_color`** | String | `'amber'`, `'teal'`, etc. | Named palette of star |
| **`td_color_hue`** | Float | **`0.000` to `1.000`** | **Color Hue** (derived from Q1 Emotion) |
| **`td_color_r`** | Float | **`0.000` to `1.000`** | Pre-calculated Red float for Constant MAT |
| **`td_color_g`** | Float | **`0.000` to `1.000`** | Pre-calculated Green float for Constant MAT |
| **`td_color_b`** | Float | **`0.000` to `1.000`** | Pre-calculated Blue float for Constant MAT |
| **`td_star_brightness`** | Float | **`0.200` to `1.000`** | **Star luminosity** (mapped from Q2 Intensity 1-5) |
| **`td_star_scale`** | Float | **`0.80` to `2.40`** | **Particle star scale** (mapped from Q3 Openness 1-5) |
| **`td_line_thickness`** | Float | **`1.00` to `6.00` px** | **Constellation line thickness** (from Q3 Openness) |
| **`td_connection_distance`**| Integer | **`70` to `270` px** | **Connection clustering distance** (from Q3 Openness) |
| **`td_rotation_speed`** | Float | **`4.0` to `75.0` °/s** | **Continuous orbit / rotation speed** (from Q4 Mind 1-5) |
| **`td_rotation_angle`** | Float | **`-60.0` to `+60.0` °** | **Geometric orientation tilt** (read at distance) |
| **`td_pulse_rate_hz`** | Float | **`0.30` to `2.20` Hz** | **LFO pulse cadence** |

---

## 3. How to Connect in TouchDesigner

### Option A: Using the Python Script (Recommended)
1. In TouchDesigner, add a **Table DAT** and rename it `table_reflections`.
2. Add a **Text DAT** or **Execute DAT** and paste the code from [`touchdesigner_poll_script.py`](./touchdesigner_poll_script.py).
3. Set the Execute DAT to run periodically (e.g., via a **Timer CHOP** pulsing every 1–2 seconds).
4. The `table_reflections` DAT will automatically populate with rows containing all the flat parameters above.

### Option B: Using a Web Client DAT
1. Place a **Web Client DAT** in your network.
2. In the **URL** parameter, enter:
   `https://viwuibpyqwlpztencstv.supabase.co/rest/v1/reflections?select=*&order=timestamp.desc&limit=25`
3. In the **Headers DAT**, provide:
   ```
   apikey           <your-anon-key>
   Authorization    Bearer <your-anon-key>
   ```
4. Attach a **JSON DAT** to the Web Client output to parse the response into DAT tables or Python dictionaries.

---

## 4. Visual Parameter Binding Guide

- **Star Emotion & Color (`td_color_r`, `td_color_g`, `td_color_b`)**:
  - Connect directly to the RGB channels of a Constant MAT, Line MAT, or Point SOP color attribute (`Cd[0], Cd[1], Cd[2]`).
- **Star Brightness / Luminosity (`td_star_brightness`)**:
  - Connect to a Constant MAT's `Emit` or `Alpha` multiplier, or a Particle SOP's life color alpha.
- **Star Scale & Presence (`td_star_scale`, `td_line_thickness`)**:
  - Connect to a Transform SOP scale attribute and Line MAT width.
- **Star Rotation Speed & Orientation (`td_rotation_speed`, `td_rotation_angle`)**:
  - Connect `td_rotation_speed` to an LFO CHOP or Speed CHOP driving geometry `rx, ry, rz` rotation.
  - Connect `td_rotation_angle` to a static orientation tilt so stars are visibly tilted and readable at a distance in the installation.
