/**
 * CONSTELLATE • Libraries Against Loneliness
 * Central Application Configuration & Guidance
 * Site: RMIT Swanston Library Level 6 Wellbeing Installation
 * Aligned with "Colour palette.md" and "styleguide.pdf".
 */

const KIOSK_CONFIG = {
  kioskId: 'rmit-swanston-lvl6-booth-01',
  installationName: 'CONSTELLATE',
  subheading: 'reflect and connect. • RMIT Swanston Library Level 6',
  
  // Idle timeout settings (in seconds)
  idleTimeoutSec: 80,
  idleWarningSec: 15,

  // Text & Audio Input limits
  maxTextChars: 300,
  maxAudioDurationSec: 30,

  // Warm reassurance notice
  reassuranceNotice: "There are no wrong answers here. Take whatever time you need.",

  // Question 1: Emotional Feeling (Never encoded in colour alone - uses word plus icon)
  // Palettes harmonized with the styleguide duos:
  // Variant 1: #102D37 Core & #ECF8C0 Accent (Lime)
  // Variant 2: #528B90 Core & #D2F7F9 Accent (Ice Cyan)
  // Variant 3: #255953 Core & #8C9E50 Accent (Olive)
  feelings: [
    {
      id: 'happy',
      label: 'Happy',
      icon: '😊',
      colorName: 'Starlight Lime',
      hue: 0.19,
      rgb: [0.925, 0.973, 0.753],
      cssColor: '#ECF8C0',
      description: 'Lighter, uplifted, or content'
    },
    {
      id: 'calm',
      label: 'Calm',
      icon: '😌',
      colorName: 'Ice Starlight',
      hue: 0.51,
      rgb: [0.824, 0.969, 0.977],
      cssColor: '#D2F7F9',
      description: 'Grounded, peaceful, or steady'
    },
    {
      id: 'tired',
      label: 'Tired',
      icon: '🥱',
      colorName: 'Muted Slate Teal',
      hue: 0.51,
      rgb: [0.322, 0.545, 0.565],
      cssColor: '#528B90',
      description: 'Low battery, drained, or sleepy'
    },
    {
      id: 'anxious',
      label: 'Anxious',
      icon: '😰',
      colorName: 'Eucalyptus Teal',
      hue: 0.47,
      rgb: [0.145, 0.349, 0.325],
      cssColor: '#255953',
      description: 'On edge, fluttery, or uneasy'
    },
    {
      id: 'sad',
      label: 'Sad',
      icon: '😔',
      colorName: 'Quiet Midnight Teal',
      hue: 0.54,
      rgb: [0.063, 0.177, 0.216],
      cssColor: '#102D37',
      description: 'Heavy, quiet, or holding something'
    },
    {
      id: 'frustrated',
      label: 'Frustrated',
      icon: '😤',
      colorName: 'Olive Chartreuse',
      hue: 0.21,
      rgb: [0.549, 0.620, 0.314],
      cssColor: '#8C9E50',
      description: 'Stuck, overwhelmed, or annoyed'
    }
  ],

  // Question 2: Star Intensity (1-5)
  intensityScale: {
    id: 'intensity',
    question: "How strongly are you feeling that right now?",
    subtitle: "This guides the luminosity and brightness of your star in the space.",
    min: 1,
    max: 5,
    defaultVal: 3,
    steps: [
      { val: 1, label: "Barely there", sub: "A faint whisper" },
      { val: 2, label: "A little", sub: "Noticeable, but gentle" },
      { val: 3, label: "Moderate", sub: "Present and steady" },
      { val: 4, label: "Quite strong", sub: "Deeply felt right now" },
      { val: 5, label: "Very strong", sub: "Intense and front-of-mind" }
    ]
  },

  // Question 3: Scale & Presence (1-5)
  opennessScale: {
    id: 'openness',
    question: "How open do you feel to the people around you right now?",
    subtitle: "This shapes the size of your star and its connection lines in the space.",
    min: 1,
    max: 5,
    defaultVal: 3,
    steps: [
      { val: 1, label: "Turned inward", sub: "In my own quiet bubble" },
      { val: 2, label: "A little busy", sub: "Mostly focused on my work" },
      { val: 3, label: "Somewhere in between", sub: "Balanced, aware of others" },
      { val: 4, label: "Fairly open", sub: "Welcoming gentle connection" },
      { val: 5, label: "Get amongst it!", sub: "Energised and eager to connect" }
    ]
  },

  // Question 4: Rotation & Orientation (1-5)
  mindScale: {
    id: 'mind',
    question: "How busy does your mind feel right now?",
    subtitle: "This sets the gentle orbit and rotation of your star across the installation.",
    min: 1,
    max: 5,
    defaultVal: 3,
    steps: [
      { val: 1, label: "Very quiet", sub: "Still, slow, meditative" },
      { val: 2, label: "Mostly quiet", sub: "Gentle thoughts drifting by" },
      { val: 3, label: "In between", sub: "Normal study focus" },
      { val: 4, label: "Quite busy", sub: "Many tabs open in mind" },
      { val: 5, label: "Racing", sub: "Full speed, thoughts swirling" }
    ]
  },

  // Open-Ended Prompt Bank (Main + Alternative Pool from To change.md)
  prompts: [
    {
      id: 'main-library-connection',
      text: "If someone else in the library was feeling the exact same way, what would you want them to hear?",
      subtext: "You can share a thought, a piece of advice, reassurance, or something you wish someone told you today.",
      tag: "Shared Experience",
      icon: "💬"
    },
    {
      id: 'alt-felt-the-way',
      text: "If someone else felt the way you do right now, what would you want them to hear?",
      subtext: "A gentle sentence can travel far across this room.",
      tag: "Words of Warmth",
      icon: "🕊️"
    },
    {
      id: 'alt-nearby-know',
      text: "What do you wish you could say out loud right now without anyone judging?",
      subtext: "A silent thought, a pressure you're feeling, or an honest reflection on your day.",
      tag: "Quiet Truths",
      icon: "🌱"
    },
    {
      id: 'alt-words-encouragement',
      text: "If you could share some words of encouragement with someone else in the library today, what would it be?",
      subtext: "A quick reminder that we're all figuring it out together.",
      tag: "Encouragement",
      icon: "✨"
    },
    {
      id: 'alt-quiet-thought',
      text: "What is one quiet thought you've been carrying with you today as you study?",
      subtext: "A phrase, a memory, or a lingering question.",
      tag: "Inner Reflection",
      icon: "📖"
    },
    {
      id: 'alt-peace-moment',
      text: "What does a moment of peace feel like to you in the middle of a busy university week?",
      subtext: "A breath, looking out the window, or closing your laptop.",
      tag: "Mindful Pause",
      icon: "☕"
    },
    {
      id: 'alt-gentle-wish',
      text: "If this room could hear one gentle wish for everyone sharing this space right now, what would you say?",
      subtext: "Sending goodwill to fellow students.",
      tag: "Collective Hope",
      icon: "🌟"
    },
    {
      id: 'alt-grounding',
      text: "What is something that helped ground you recently? It could be a sound, a sight, a memory or even a cup of tea!",
      subtext: "Small anchors that bring us back to calm.",
      tag: "Simple Comforts",
      icon: "🍵"
    },
    {
      id: 'alt-happy-place',
      text: "What is your happy place?",
      subtext: "A corner of the city, a favourite spot at home, or a memory.",
      tag: "Safe Haven",
      icon: "🏡"
    }
  ],

  // Consent line for open response
  consentLine: "By sharing your reflection, you agree that your anonymous words or voice recording may be softly projected in the library installation. No names or personal identifiers are ever collected or stored.",

  // Support links (appear at the end of the form regardless of user response)
  supportLinks: [
    {
      name: "RMIT Counselling and Psychological Services",
      tagline: "Free, confidential wellbeing support for all RMIT students.",
      phone: "03 9925 5000",
      phoneAction: "tel:0399255000",
      hours: "Monday – Friday: 9am – 5pm",
      afterHours: "1300 305 737 (After hours crisis line) or Text 0488 884 165",
      url: "https://www.rmit.edu.au/students/support-services/counselling",
      icon: "🎓"
    },
    {
      name: "Headspace",
      tagline: "Free mental health and wellbeing support for young people aged 12–25.",
      phone: "1800 650 890",
      phoneAction: "tel:1800650890",
      hours: "9am – 1am AEDT daily",
      url: "https://headspace.org.au",
      icon: "🌱"
    },
    {
      name: "Lifeline (24/7 Crisis Support)",
      tagline: "Immediate crisis support and suicide prevention services.",
      phone: "13 11 14",
      phoneAction: "tel:131114",
      hours: "Available 24 hours a day, 7 days a week",
      url: "https://www.lifeline.org.au",
      icon: "💙"
    }
  ],

  // Supabase defaults (can be edited directly in the Kiosk Settings UI or overridden here)
  supabase: {
    url: localStorage.getItem('LAL_SUPABASE_URL') || 'https://viwuibpyqwlpztencstv.supabase.co',
    anonKey: localStorage.getItem('LAL_SUPABASE_KEY') || 'sb_publishable_xzr4AYx0vHpicyRGNzTZ9Q_kkf1vfLH',
    tableName: 'reflections',
    storageBucket: 'audio-reflections'
  }
};

window.KIOSK_CONFIG = KIOSK_CONFIG;
