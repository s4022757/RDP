# Libraries Against Loneliness • Reflect & Connect
### Responsive PWA Kiosk & TouchDesigner Generative Installation
**Site:** RMIT Swanston Library Level 6 Wellbeing Installation  
**Authors:** Digital Media Studio 3 Project Team

---

## Overview

**Libraries Against Loneliness ("Reflect & Connect")** is an interactive, responsive Progressive Web App (PWA) kiosk engineered for a dedicated wellbeing booth in RMIT Swanston Library (Level 6). 

The installation allows students to take a 60-second pause during high-stress study periods, privately assess their emotional feeling and energy state across four dedicated, one-question-per-screen steps, and optionally leave an anonymous reflection (via 300-character text, 30-second voice recording, or skipping without words).

Upon completion, their reflection instantly lights up an individual **Star** in a generative audiovisual constellation projected beside the booth, powered in real time by **TouchDesigner** via **Supabase**.

---

## Key Features & Guidelines

### 1. Accessibility & Tone
- **"No Wrong Answers":** Stated once at the start in warm, plain language: *"There are no wrong answers here. Take whatever time you need."*
- **One Question Per Screen:** Each question is presented on its own focused screen with a clear progress indicator (`Step X of 5`).
- **Meaning Never Encoded in Colour Alone:** Q1 utilizes word plus icon for each emotion (`😊 Happy`, `😌 Calm`, `🥱 Tired`, `😰 Anxious`, `😔 Sad`, `😤 Frustrated`). The star's colour is an expressive output, not an input requirement.
- **Large Tap Targets:** Minimum $48\text{px}$ to $80\text{px}$ touch targets for seamless public kiosk interaction.
- **`prefers-reduced-motion` Support:** Smoothly reduces animations, particle velocities, and rotational spins for users who prefer reduced motion.

---

### 2. The Four Questions

- **Q1: Emotion / Feeling**
  > *"How are you feeling right now?"*
  - Options: **Happy**, **Calm**, **Tired**, **Anxious**, **Sad**, **Frustrated** (Word + Icon).
  - Determines star color palette: **Happy** (Yellow), **Calm** (White), **Tired** (Red), **Anxious** (Purple), **Sad** (Blue), **Frustrated** (Orange).

- **Q2: Star Intensity (1 to 5)**
  > *"How strongly are you feeling that right now?"*
  - Scale: `1 • Barely there` · `2 • A little` · `3 • Moderate` · `4 • Quite strong` · `5 • Very strong`
  - Determines star luminosity & brightness ($20\%$ to $100\%$).

- **Q3: Scale & Presence (1 to 5)**
  > *"How open do you feel to the people around you right now?"*
  - Scale: `1 • Turned inward` · `2 • A little busy` · `3 • Somewhere in between` · `4 • Fairly open` · `5 • Get amongst it!`
  - Determines star scale ($0.8$ to $2.4$) and constellation line thickness ($1.0$ to $6.0\text{px}$).

- **Q4: Rotation & Orientation (1 to 5)**
  > *"How busy does your mind feel right now?"*
  - Scale: `1 • Very quiet` · `2 • Mostly quiet` · `3 • In between` · `4 • Quite busy` · `5 • Racing`
  - Determines orbit/rotation speed ($4^\circ/\text{s}$ to $75^\circ/\text{s}$) and orientation tilt ($-60^\circ$ to $+60^\circ$), kept wide enough to read clearly at a distance in the installation.

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


## Quick Start / Running Locally

1. **Serve locally:**
   ```bash
   python3 -m http.server 8080
   # or with npm:
   npx serve -l 8080 .
   ```
2. Open `http://localhost:8080` in Chrome, Safari, or Edge.
3. Tap **Begin Check-In** to step through the one-question-per-screen flow.
