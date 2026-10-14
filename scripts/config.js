/**
 * Libraries Against Loneliness • Reflect & Connect
 * Central Application Configuration & Built-in Prompt Bank
 * Site: RMIT Swanston Library Level 6 Wellbeing Installation
 */

const KIOSK_CONFIG = {
  kioskId: 'rmit-swanston-lvl6-booth-01',
  installationName: 'Libraries Against Loneliness',
  subheading: 'Reflect & Connect • Generative Constellation',
  
  // Idle timeout settings (in seconds)
  idleTimeoutSec: 80,
  idleWarningSec: 15,

  // Text & Audio Input limits
  maxTextChars: 300,
  maxAudioDurationSec: 30,

  // Built-in rotating prompt bank
  prompts: [
    {
      id: 'encouragement',
      text: "If you could share a single word of encouragement with someone else walking through this space today, what would it be?",
      tag: "Words of Warmth",
      icon: "💬"
    },
    {
      id: 'quiet-thought',
      text: "What is one quiet thought you've been carrying with you today as you study?",
      tag: "Inner Reflection",
      icon: "🌱"
    },
    {
      id: 'peace-moment',
      text: "What does a moment of peace feel like to you in the middle of a busy university week?",
      tag: "Mindful Pause",
      icon: "🕊️"
    },
    {
      id: 'library-wish',
      text: "If this room could hear one gentle wish for everyone sharing this space right now, what would you say?",
      tag: "Collective Hope",
      icon: "✨"
    },
    {
      id: 'grounding',
      text: "What is something small—a sound, a sight, a cup of tea—that helped ground you recently?",
      tag: "Simple Comforts",
      icon: "☕"
    }
  ],

  // Scale question specifications
  scales: {
    connectedness: {
      id: 'connectedness',
      number: 1,
      title: "Environmental Connectedness",
      question: "Right now, how connected do you feel to the energy and people around you in this space?",
      minLabel: "In my own bubble",
      midLabel: "Quietly aware",
      maxLabel: "Warmly connected",
      defaultVal: 5,
      tdTarget: "Line Thickness & Proximity"
    },
    socialEnergy: {
      id: 'socialEnergy',
      number: 2,
      title: "Social Energy / Battery",
      question: "How would you describe your social energy today—are you leaning toward quiet focus or an open door to others?",
      minLabel: "Deep quiet focus",
      midLabel: "Gentle balance",
      maxLabel: "Open door to others",
      defaultVal: 5,
      tdTarget: "Star Color Hue & Warmth"
    },
    collectiveEmpathy: {
      id: 'collectiveEmpathy',
      number: 3,
      title: "Collective Empathy",
      question: "How much do you feel that others around you might be sharing similar thoughts or study pressures right now?",
      minLabel: "Carrying it alone",
      midLabel: "Sense of overlap",
      maxLabel: "Shared journey together",
      defaultVal: 6,
      tdTarget: "Star Luminosity & Glow"
    }
  },

  // TouchDesigner visual parameter mapping ranges
  touchDesignerMapping: {
    // Collective Empathy (1-10) -> Star Brightness (0.15 to 1.00)
    brightness: { min: 0.15, max: 1.00 },
    // Collective Empathy (1-10) -> Pulse Rate Hz (0.2 Hz to 2.2 Hz)
    pulseRate: { min: 0.2, max: 2.2 },
    // Social Energy (1-10) -> Color Hue in HSV/Degrees (0.0 to 1.0)
    // 1 (Quiet focus) = Cool Indigo/Teal (Hue ~ 0.62)
    // 10 (Open door) = Radiant Amber/Gold/Rose (Hue ~ 0.08)
    hueRange: { focus: 0.62, open: 0.08 },
    // Connectedness (1-10) -> Constellation line thickness (0.8 to 6.5)
    lineThickness: { min: 0.8, max: 6.5 },
    // Connectedness (1-10) -> Connection clustering distance (60 to 280)
    connectionRadius: { min: 60, max: 280 },
    // Star particle scale (0.6 to 2.4)
    starScale: { min: 0.6, max: 2.4 }
  },

  // Supabase defaults (can be edited directly in the Kiosk Settings UI or overridden here)
  supabase: {
    url: localStorage.getItem('LAL_SUPABASE_URL') || '',
    anonKey: localStorage.getItem('LAL_SUPABASE_KEY') || '',
    tableName: 'reflections',
    storageBucket: 'audio-reflections'
  }
};

window.KIOSK_CONFIG = KIOSK_CONFIG;
