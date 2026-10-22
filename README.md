# Libraries Against Loneliness • Constellate: Reflect & Connect
### Responsive PWA Kiosk & TouchDesigner Generative Installation
**Site:** RMIT Swanston Library Level 6 Wellbeing Installation  
**Authors:** Curtis Cox, Akira Lordsmith, Sabrina Tanamas, Cole Milott

---

## Overview

**Constellate: Reflect & Connect** is an interactive, responsive Progressive Web App (PWA) kiosk engineered for a proposed dedicated wellbeing booth in RMIT Swanston Library (Level 6). 

The installation allows students to take a 60-second pause during high-stress study periods, privately assess their emotional feeling and energy state across four dedicated, one-question-per-screen steps, and optionally leave an anonymous reflection (via 300-character text, 30-second voice recording, or skipping without words).

As participants reflect, an individual Star forms in real time on the kiosk interface via WebGL. Upon submission, their star joins the larger generative audiovisual constellation cast into the library space, driven in real time by TouchDesigner via Supabase.

---

## System Architecture

The project operates across a flexible **dual-pipeline architecture**:

1. **Client-Side Real-Time Feedback (WebGL / Canvas):**  
   A custom WebGL fragment shader (`star-visualizer.js`) reproduces the TouchDesigner 2D TOP network (`Rectangle/Circle` → `Blur` → `Comp` → `Select` → `Constant` → `Switch` → `Level` → `Transform`) directly within the browser, complete with continuous spin integration and luminance equalization across all emotion colors.
2. **Installation Projection (TouchDesigner):**  
   Final reflection records trigger large-scale generative projection mapping and ambisonic audio in the physical installation space.
   - **Mode 0 (Local Exhibition Bridge):** The PWA streams draft state to `local_bridge_server.py` on `localhost:8080`, writing zero-latency state to `live_draft.json` for live TouchDesigner parameter smoothing.
   - **Mode 1 (Cloud / Remote Testing):** Deployed statically via Cloudflare Pages, the PWA writes directly to Supabase (`public.reflections`), where TouchDesigner’s polling DAT ingests new records in real time.
  
---

## Key Features & Guidelines

### 1. Accessibility & Tone
- **"No Wrong Answers":** Stated once at the start in warm, plain language: *"There are no wrong answers here. Take whatever time you need."*
- **One Question Per Screen:** Each question is presented on its own focused screen with a clear progress indicator (`Step X of 5`).
- **Meaning Never Encoded in Colour Alone:** Q1 utilizes word plus icon for each emotion (`😊 Happy`, `😌 Calm`, `🥱 Tired`, `😰 Anxious`, `😔 Sad`, `😤 Frustrated`). The star's colour is an expressive output, not an input requirement.
- **Large Tap Targets:** Minimum 48px to 80px touch targets for seamless public kiosk interaction.
- **`prefers-reduced-motion` Support:** Smoothly reduces animations, particle velocities, and rotational spins for users who prefer reduced motion.
- **Gapless Ambient Soundscape:** Features an optimized web-standard ambient audio loop by Cole Milott that fades in seamlessly on interaction.

---

### 2. The Four Questions

- **Q1: Emotion / Feeling**
  > *"How are you feeling right now?"*
  - Options: **Happy**, **Calm**, **Tired**, **Anxious**, **Sad**, **Frustrated** (Word + Icon).
  - Determines star color palette: **Happy** (Yellow), **Calm** (White), **Tired** (Red), **Anxious** (Purple), **Sad** (Blue), **Frustrated** (Orange).
 
- **Q2: Star Intensity (1 to 5)**
  > *"How strongly are you feeling that right now?"*
  - Scale: `1 • Barely there` · `2 • A little` · `3 • Moderate` · `4 • Quite strong` · `5 • Very strong`
  - Determines star luminosity & brightness (25% to 100% range; normalized 0.25 to 1.0).

- **Q3: Scale & Presence (1 to 5)**
  > *"How open do you feel to the people around you right now?"*
  - Scale: `1 • Turned inward` · `2 • A little busy` · `3 • Somewhere in between` · `4 • Fairly open` · `5 • Get amongst it!`
  - Determines star scale ($0.5$ to $1.5$) and constellation line thickness ($1.0$ to $6.0\text{px}$).

- **Q4: Rotation & Orientation (1 to 5)**
  > *"How busy does your mind feel right now?"*
  - Scale: `1 • Very quiet` · `2 • Mostly quiet` · `3 • In between` · `4 • Quite busy` · `5 • Racing`
  - Determines orbit/rotation speed ($3^\circ/\text{s}$ to $45^\circ/\text{s}$) and orientation tilt ($0^\circ$ to $55^\circ$ askew), kept wide enough to read clearly at a distance in the installation.

---

### 3. Open-Ended Prompt & Rotating Question Bank

Students can attach their words to their star via 300-character text or a 30-second voice note, or choose **"Skip reflection & light star without words"**. 

Using the **"Different question"** button, students can cycle through a rotating bank of 9 gentle, grounding reflective prompts:

| # | Theme & Tag | Prompt Question | Guidance / Subtext |
|---|---|---|---|
| 1 | 💬 **Shared Experience** | *"If someone else in the library was feeling the exact same way, what would you want them to hear?"* | You can share a thought, a piece of advice, reassurance, or something you wish someone told you today. |
| 2 | 🕊️ **Words of Warmth** | *"If someone else felt the way you do right now, what would you want them to hear?"* | A gentle sentence can travel far across this room. |
| 3 | 🌱 **Quiet Truths** | *"What do you wish you could say out loud right now without anyone judging?"* | A silent thought, a pressure you're feeling, or an honest reflection on your day. |
| 4 | ✨ **Encouragement** | *"If you could share some words of encouragement with someone else in the library today, what would it be?"* | A quick reminder that we're all figuring it out together. |
| 5 | 📖 **Inner Reflection** | *"What is one quiet thought you've been carrying with you today as you study?"* | A phrase, a memory, or a lingering question. |
| 6 | ☕ **Mindful Pause** | *"What does a moment of peace feel like to you in the middle of a busy university week?"* | A breath, looking out the window, or closing your laptop. |
| 7 | 🌟 **Collective Hope** | *"If this room could hear one gentle wish for everyone sharing this space right now, what would you say?"* | Sending goodwill to fellow students. |
| 8 | 🍵 **Simple Comforts** | *"What is something that helped ground you recently? It could be a sound, a sight, a memory or even a cup of tea!"* | Small anchors that bring us back to calm. |
| 9 | 🏡 **Safe Haven** | *"What is your happy place?"* | A corner of the city, a favourite spot at home, or a memory. |

- **Short Consent Notice:** Prominently displayed before response input:
  > *"By sharing your reflection, you agree that your anonymous words or voice recording may be softly projected in the library installation. No names, student IDs, or personal identifiers are ever collected or stored."*
- **Choice to Not Submit Words:** Clear option **"Skip reflection & light star without words"** allows students to participate and generate their star without writing or recording if they prefer.

---

### 4. Support Services at End of Form
Support links appear at the completion screen regardless of user response:
- **🎓 RMIT Counselling and Psychological Services:** `03 9925 5000` (Mon–Fri 9am–5pm) | After Hours: `1300 305 737` (Text: `0488 884 165`)
- **🌱 Headspace (Youth Mental Health):** `1800 650 890` | `headspace.org.au`
- **💙 Lifeline (24/7 Crisis Support):** `13 11 14`


## Quick Start

### Mode 0: Local Exhibition Setup (TouchDesigner + Bridge Server)
For live on-site physical kiosk exhibition with real-time parameter streaming to TouchDesigner:

### 
1. **Launch the local Python bridge server:**
   ```bash
   python3 touchdesigner/local_bridge_server.py
   ```
   Serves static kiosk assets on `http://localhost:8080`, receives `/api/live-draft` updates, and saves completed submissions to `touchdesigner/records/`.

2. Launch TouchDesigner:  
    Open `touchdesigner/LAL_Constellate.toe`.  
    Set the master mode toggle to Mode 0 (Local).  
    TouchDesigner will read `live_draft.json` for live slider previews and monitor the records directory for finished submissions.

### Mode 1: Cloud & Remote Testing (Cloudflare Pages + Supabase)  
For remote client evaluation and testing without local Python servers:  

1. Access the Cloudflare Pages Deployment:  
    Open your deployed URL (e.g., `[https://lal-kiosk.pages.dev](https://lal-kiosk.pages.dev)`).  
    
2. TouchDesigner Cloud Sync:  
    Open TouchDesigner and set the mode toggle to Mode 1 (Cloud).  
    TouchDesigner polls Supabase (`public.reflections`) every 90 frames (~1.5s), rendering new submissions as remote users complete check-ins.