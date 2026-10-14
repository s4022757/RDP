# Libraries Against Loneliness • Reflect & Connect
### Responsive PWA Kiosk & TouchDesigner Generative Installation
**Site:** RMIT Swanston Library Level 6 Wellbeing Installation  
**Authors:** Digital Media Studio 3 Project Team

---

## Overview

**Libraries Against Loneliness ("Reflect & Connect")** is an interactive, responsive Progressive Web App (PWA) kiosk engineered for a dedicated wellbeing booth in RMIT Swanston Library (Level 6). 

The installation allows students to take a 60-second pause during high-stress study periods, privately assess their energy and sense of connection on three 1–10 scales, and leave an anonymous reflection (via 300-character text or a 30-second voice recording).

Upon completion, their reflection instantly lights up an individual **Star** in a generative audiovisual constellation projected beside the booth, powered in real time by **TouchDesigner** via **Supabase**.

---

## Key Features & Core Requirements

### 1. Three Reflection Scales (Rated 1 to 10)
- **1. Environmental Connectedness:**
  > *"Right now, how connected do you feel to the energy and people around you in this space?"*
  - Spectrum: `1 • In my own bubble` ↔ `10 • Warmly connected`
  - Drives TouchDesigner: **Constellation line thickness** (0.8–6.5 px) and **connection clustering distance** (70–290 px).
- **2. Social Energy / Battery:**
  > *"How would you describe your social energy today—are you leaning toward quiet focus or an open door to others?"*
  - Spectrum: `1 • Deep quiet focus` ↔ `10 • Open door to others`
  - Drives TouchDesigner: **Star color hue & temperature** (cool twilight indigo at 1 → warm golden amber at 10) and precomputed `(R, G, B)` floats.
- **3. Collective Empathy:**
  > *"How much do you feel that others around you might be sharing similar thoughts or study pressures right now?"*
  - Spectrum: `1 • Carrying it alone` ↔ `10 • Shared journey together`
  - Drives TouchDesigner: **Star brightness / luminosity** (15%–100%) and **pulse rate** (0.2–2.2 Hz).
- **Dual Touch Interaction:**
  - Both smooth continuous sliders with glowing gradient fill AND large, accessible 1–10 touch pills (minimum 48px touch target for kiosks).

### 2. Open-Ended Response Bank & Dual Input Modes
- **Rotating Prompt Bank:**
  - Built-in bank of gentle, non-confrontational prompts:
    - *"If you could share a single word of encouragement with someone else walking through this space today, what would it be?"*
    - *"What is one quiet thought you've been carrying with you today as you study?"*
    - *"What does a moment of peace feel like to you in the middle of a busy university week?"*
    - *"If this room could hear one gentle wish for everyone sharing this space right now, what would you say?"*
    - *"What is something small—a sound, a sight, a cup of tea—that helped ground you recently?"*
  - "Cycle prompt ↺" button with smooth haptic transitions.
- **Dual Input Modes:**
  - **✍️ Text Mode:** Strictly capped at **300 characters** with a live counter and character limit warning.
  - **🎙️ Voice Recording Mode:** Strictly capped at **30 seconds** using the browser `MediaRecorder` API.
    - Real-time animated audio visualizer rendering live microphone frequencies via Web Audio `AnalyserNode`.
    - Live countdown timer (`00:14 / 00:30`) with auto-stop at 30 seconds.
    - In-browser playback review player and "Re-record" option.
    - Automatic conversion to high-quality audio payload.

### 3. Supabase Database Integration
- Full JavaScript handler with dual support:
  - Official `@supabase/supabase-js` v2 client.
  - Direct REST PostgREST API fallback.
- **Offline & Kiosk Resilience:**
  - If network disconnects or Supabase credentials are not yet entered, records are safely queued in `localStorage`.
  - Automatic queue flushing when connection resumes.
  - Built-in "Test Connection" tool in the operator drawer.

### 4. TouchDesigner Compatibility Layer
- Database records and real-time feeds are structured as **flat JSON objects** engineered specifically for TouchDesigner `Table DAT`, `Web Client DAT`, and Python scripts.
- **Flat JSON Schema:**
  ```json
  {
    "id": "lal_1728800000_a1b2",
    "timestamp": "2026-10-13T16:50:00.000Z",
    "kiosk_id": "rmit-swanston-lvl6-booth-01",
    "score_connectedness": 8,
    "score_social_energy": 4,
    "score_collective_empathy": 9,
    "prompt_id": "encouragement",
    "prompt_question": "If you could share a single word of encouragement...",
    "response_type": "text",
    "response_text": "You are doing better than you realize.",
    "response_audio_base64": "",
    "audio_duration_sec": 0.0,
    "char_count": 39,
    "td_star_brightness": 0.908,
    "td_pulse_rate_hz": 1.98,
    "td_color_hue": 0.46,
    "td_color_r": 0.205,
    "td_color_g": 0.908,
    "td_color_b": 0.785,
    "td_line_thickness": 5.87,
    "td_connection_distance": 266,
    "td_star_scale": 2.22,
    "is_active": true
  }
  ```
- Ready-to-use Python script: [`touchdesigner/touchdesigner_poll_script.py`](./touchdesigner/touchdesigner_poll_script.py).
- Supabase SQL schema: [`touchdesigner/supabase_table_schema.sql`](./touchdesigner/supabase_table_schema.sql).
- Integration documentation: [`touchdesigner/README_TOUCHDESIGNER.md`](./touchdesigner/README_TOUCHDESIGNER.md).

### 5. Public Kiosk Hardening & Wellbeing Aesthetics
- **Calm, Soothing Aesthetics:** Deep twilight palette (`#070B14`), translucent glassmorphism cards with `backdrop-filter: blur(24px)`, accessible contrast, and gentle micro-animations.
- **Live Interactive Constellation Canvas:** Background canvas rendering floating stars that respond dynamically in real time to the student's slider movements.
- **Procedural Audio Chimes:** Web Audio API sound designer producing pentatonic singing-bowl harmonics on interaction and star formation (no external audio files required, toggleable via mute button).
- **Idle Privacy Timeout:** Resets smoothly to the attract screen after 80 seconds of inactivity (with a 15s warning modal) to protect student privacy in public library spaces.
- **PWA Capabilities:** Standalone kiosk mode, fullscreen toggle, `manifest.webmanifest`, service worker (`sw.js`) with offline caching, and custom app icons.

---

## Project Structure

```
RDprotoA3/
├── index.html                   # Semantic HTML5 kiosk application
├── manifest.webmanifest         # PWA Manifest (standalone display, icons)
├── sw.js                        # Service worker with offline cache strategy
├── package.json                 # Project scripts and metadata
├── README.md                    # Main documentation
│
├── styles/
│   ├── main.css                 # Design system tokens, typography, layout
│   └── components.css           # Sliders, pills, voice recorder, star views
│
├── scripts/
│   ├── config.js                # Built-in prompt bank and scale metadata
│   ├── sound-effects.js         # Procedural Web Audio API ambient chime engine
│   ├── audio-recorder.js        # MediaRecorder API module (30s strict cap + visualizer)
│   ├── touchdesigner-bridge.js  # Flat JSON formatter & parameter normalizer
│   ├── supabase-client.js       # Supabase integration & offline queue handler
│   └── app.js                   # Application state machine & kiosk controller
│
├── icons/
│   ├── icon.svg                 # Scalable vector starlight emblem
│   ├── icon-192.png             # 192x192 PWA app icon
│   └── icon-512.png             # 512x512 PWA app icon
│
└── touchdesigner/
    ├── supabase_table_schema.sql     # Complete Supabase SQL table & RLS policies
    ├── touchdesigner_poll_script.py  # Python polling script for TouchDesigner
    └── README_TOUCHDESIGNER.md       # Step-by-step TouchDesigner installation guide
```

---

## Quick Start / Running Locally

1. **Serve locally:**
   ```bash
   python3 -m http.server 8080
   # or with npm:
   npx serve -l 8080 .
   ```
2. Open `http://localhost:8080` in Chrome, Safari, or Edge.
3. Tap **Begin Check-In** to test the kiosk flow.
4. Click the gear icon in the top right to open the **TouchDesigner & Supabase Bridge** modal to enter Supabase credentials or copy the live flat JSON preview!
# RDP
