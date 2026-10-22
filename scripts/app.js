/**
 * Libraries Against Loneliness • Main Kiosk Application Controller
 * Handles 1-question-per-screen flow, feeling selection, 1-5 scales,
 * rotating prompt bank, audio/text submission, skip option, support links,
 * live constellation background canvas, and kiosk idle timeout reset.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- WEBGL STAR VISUALIZER (TouchDesigner TOP Network Replica) ---
  if (typeof StarVisualizer !== 'undefined') {
    try {
      window.starVisualizer = new StarVisualizer('star-webgl-canvas');
      if (typeof window.starVisualizer.setScreenContext === 'function') {
        window.starVisualizer.setScreenContext('screen-welcome');
      }
    } catch (e) {
      console.warn('Could not initialize StarVisualizer:', e);
    }
  }

  // --- APPLICATION STATE ---
  const state = {
    currentScreen: 'screen-welcome',
    // 4 Questions Data
    feeling: 'calm',
    intensity: 3,
    openness: 3,
    mindBusyness: 3,

    // Open reflection
    activePromptIndex: 0,
    inputMode: 'text', // 'text' | 'audio'
    responseText: '',
    audioData: null,
    lastSubmittedRecord: null,

    // Idle management
    isIdleModalActive: false,
    idleTimer: null,
    idleCountdownTimer: null,
    idleSecondsRemaining: 15,
    successResetInterval: null
  };

  // --- DOM ELEMENT REFERENCES ---
  const screens = {
    welcome: document.getElementById('screen-welcome'),
    q1Feeling: document.getElementById('screen-q1-feeling'),
    q2Intensity: document.getElementById('screen-q2-intensity'),
    q3Openness: document.getElementById('screen-q3-openness'),
    q4Mind: document.getElementById('screen-q4-mind'),
    openEnded: document.getElementById('screen-open-ended'),
    success: document.getElementById('screen-success')
  };

  // Q1 Feeling elements
  const feelingCards = document.querySelectorAll('.feeling-card');
  const btnQ1Back = document.getElementById('btn-q1-back');
  const btnQ1Next = document.getElementById('btn-q1-next');

  // Q2 Intensity elements
  const sliderIntensity = document.getElementById('slider-intensity');
  const stepCardsIntensity = document.querySelectorAll('#step-cards-intensity .scale-step-btn');
  const badgeIntensityNum = document.getElementById('badge-intensity-num');
  const badgeIntensityLabel = document.getElementById('badge-intensity-label');
  const badgeIntensitySub = document.getElementById('badge-intensity-sub');
  const btnQ2Back = document.getElementById('btn-q2-back');
  const btnQ2Next = document.getElementById('btn-q2-next');

  // Q3 Openness elements
  const sliderOpenness = document.getElementById('slider-openness');
  const stepCardsOpenness = document.querySelectorAll('#step-cards-openness .scale-step-btn');
  const badgeOpennessNum = document.getElementById('badge-openness-num');
  const badgeOpennessLabel = document.getElementById('badge-openness-label');
  const badgeOpennessSub = document.getElementById('badge-openness-sub');
  const btnQ3Back = document.getElementById('btn-q3-back');
  const btnQ3Next = document.getElementById('btn-q3-next');

  // Q4 Mind elements
  const sliderMind = document.getElementById('slider-mind');
  const stepCardsMind = document.querySelectorAll('#step-cards-mind .scale-step-btn');
  const badgeMindNum = document.getElementById('badge-mind-num');
  const badgeMindLabel = document.getElementById('badge-mind-label');
  const badgeMindSub = document.getElementById('badge-mind-sub');
  const btnQ4Back = document.getElementById('btn-q4-back');
  const btnQ4Next = document.getElementById('btn-q4-next');

  // Open-ended prompt elements
  const promptCard = document.getElementById('prompt-card');
  const promptQuestionEl = document.getElementById('prompt-question');
  const promptGuidanceEl = document.getElementById('prompt-guidance');
  const promptTagEl = document.getElementById('prompt-tag');
  const cyclePromptBtn = document.getElementById('btn-cycle-prompt');

  // Input mode tabs & panels
  const tabText = document.getElementById('tab-mode-text');
  const tabAudio = document.getElementById('tab-mode-audio');
  const panelText = document.getElementById('panel-mode-text');
  const panelAudio = document.getElementById('panel-mode-audio');

  // Text input elements
  const textInput = document.getElementById('reflection-text-input');
  const charCounter = document.getElementById('text-char-counter');

  // Audio recording elements
  const audioVisualizerCanvas = document.getElementById('audio-visualizer-canvas');
  const btnStartRecord = document.getElementById('btn-start-record');
  const btnStopRecord = document.getElementById('btn-stop-record');
  const btnRerecord = document.getElementById('btn-rerecord');
  const audioTimerDisplay = document.getElementById('audio-timer-display');
  const audioRecordingIndicator = document.getElementById('audio-recording-state');
  const audioPlaybackContainer = document.getElementById('audio-playback-container');
  const audioPlayer = document.getElementById('audio-playback-player');
  const audioDurationBadge = document.getElementById('audio-recorded-duration');
  const audioErrorMessage = document.getElementById('audio-error-message');
  const audioGuidanceTitle = document.getElementById('audio-guidance-title');
  const audioGuidanceDesc = document.getElementById('audio-guidance-desc');
  const audioStatusBadge = document.getElementById('audio-status-badge');

  // Actions
  const btnBegin = document.getElementById('btn-begin-reflection');
  const btnBackToScales = document.getElementById('btn-back-to-scales');
  const btnSubmitReflection = document.getElementById('btn-submit-reflection');
  const btnSkipReflection = document.getElementById('btn-skip-reflection');
  const btnResetDone = document.getElementById('btn-reset-done');

  // Success screen elements
  const successStarVisual = document.getElementById('success-star-visual');
  const successStarAura = document.getElementById('success-star-aura');
  const successStarOrbit = document.getElementById('success-star-orbit');
  const paramStarColor = document.getElementById('param-star-color');
  const paramStarBrightness = document.getElementById('param-star-brightness');
  const paramLineThickness = document.getElementById('param-line-thickness');
  const paramRotationSpeed = document.getElementById('param-rotation-speed');
  const sumFeeling = document.getElementById('sum-feeling');
  const sumIntensity = document.getElementById('sum-intensity');
  const sumOpenness = document.getElementById('sum-openness');
  const sumMind = document.getElementById('sum-mind');
  const successAutoResetTimer = document.getElementById('success-autoreset-timer');

  // Top bar & utility buttons
  const btnToggleSound = document.getElementById('btn-toggle-sound');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  const btnOpenDevModal = document.getElementById('btn-open-dev-modal');

  // Idle timeout modal elements
  const idleModal = document.getElementById('idle-modal');
  const idleCountdownNum = document.getElementById('idle-countdown-seconds');
  const btnStayActive = document.getElementById('btn-stay-active');
  const btnResetNow = document.getElementById('btn-reset-now');

  // TouchDesigner / Settings Drawer
  const devModal = document.getElementById('dev-modal');
  const btnCloseDevModal = document.getElementById('btn-close-dev-modal');
  const supabaseUrlInput = document.getElementById('cfg-supabase-url');
  const supabaseKeyInput = document.getElementById('cfg-supabase-key');
  const btnSaveSupabase = document.getElementById('btn-save-supabase');
  const btnTestSupabase = document.getElementById('btn-test-supabase');
  const supabaseStatusAlert = document.getElementById('supabase-status-alert');
  const tdJsonPreview = document.getElementById('td-json-preview');
  const btnCopyJson = document.getElementById('btn-copy-json');
  const btnCopyPython = document.getElementById('btn-copy-python');
  const localQueueCountBadge = document.getElementById('local-queue-count');
  const btnFlushQueue = document.getElementById('btn-flush-queue');
  const btnPickLocalDir = document.getElementById('btn-pick-local-dir');
  const btnDownloadLatestJson = document.getElementById('btn-download-latest-json');
  const btnExportAllJson = document.getElementById('btn-export-all-json');
  const chkAutoDownloadJson = document.getElementById('chk-auto-download-json');
  const localDirStatus = document.getElementById('local-dir-status');

  // --- INITIALIZE AUDIO RECORDER ---
  const audioRecorder = new KioskAudioRecorder({
    maxDurationSec: KIOSK_CONFIG.maxAudioDurationSec,
    canvas: audioVisualizerCanvas,
    onStateChange: (recState) => {
      updateAudioUIState(recState);
    },
    onTick: ({ elapsed, remaining, max }) => {
      const elSec = Math.floor(elapsed);
      const strElapsed = `00:${elSec < 10 ? '0' : ''}${elSec}`;
      const strMax = `00:${max}`;
      audioTimerDisplay.textContent = `${strElapsed} / ${strMax}`;
      if (remaining <= 5) {
        audioTimerDisplay.classList.add('timer-warning');
      } else {
        audioTimerDisplay.classList.remove('timer-warning');
      }
    },
    onComplete: (data) => {
      state.audioData = data;
      if (audioPlayer && data.blob) {
        audioPlayer.src = URL.createObjectURL(data.blob);
      }
      if (audioDurationBadge) {
        audioDurationBadge.textContent = `${data.duration.toFixed(1)}s recorded`;
      }
      updateTouchDesignerLivePreview();
    },
    onError: (msg) => {
      if (audioErrorMessage) {
        audioErrorMessage.textContent = msg;
        audioErrorMessage.classList.remove('hidden');
      }
    }
  });

  // --- 1. QUESTION 1: FEELING SELECTION ---
  function initFeelingSelection() {
    feelingCards.forEach((card) => {
      card.addEventListener('click', () => {
        const feelingId = card.getAttribute('data-feeling');
        selectFeeling(feelingId);
        if (window.soundEngine) window.soundEngine.playPromptSwitch();
      });
    });
  }

  function selectFeeling(feelingId) {
    state.feeling = feelingId;
    feelingCards.forEach((c) => {
      const isSelected = c.getAttribute('data-feeling') === feelingId;
      c.classList.toggle('selected', isSelected);
      c.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    });
    updateTouchDesignerLivePreview();
  }

  // --- 2. QUESTIONS 2-4: 1-5 SCALES INITIALIZATION ---
  function initScales() {
    // Setup Q2: Intensity
    setupScale({
      key: 'intensity',
      slider: sliderIntensity,
      cards: stepCardsIntensity,
      badgeNum: badgeIntensityNum,
      badgeLabel: badgeIntensityLabel,
      badgeSub: badgeIntensitySub,
      config: KIOSK_CONFIG.intensityScale
    });

    // Setup Q3: Openness
    setupScale({
      key: 'openness',
      slider: sliderOpenness,
      cards: stepCardsOpenness,
      badgeNum: badgeOpennessNum,
      badgeLabel: badgeOpennessLabel,
      badgeSub: badgeOpennessSub,
      config: KIOSK_CONFIG.opennessScale
    });

    // Setup Q4: Mind Busyness
    setupScale({
      key: 'mindBusyness',
      slider: sliderMind,
      cards: stepCardsMind,
      badgeNum: badgeMindNum,
      badgeLabel: badgeMindLabel,
      badgeSub: badgeMindSub,
      config: KIOSK_CONFIG.mindScale
    });
  }

  function setupScale({ key, slider, cards, badgeNum, badgeLabel, badgeSub, config }) {
    const updateUI = (val) => {
      state[key] = val;
      if (slider) {
        slider.value = val;
        const percent = ((val - 1) / 4) * 100;
        slider.style.background = `linear-gradient(to right, #528B90 0%, #D2F7F9 ${percent / 2}%, #ECF8C0 ${percent}%, rgba(255, 255, 255, 0.12) ${percent}%, rgba(255, 255, 255, 0.12) 100%)`;
      }
      if (cards) {
        cards.forEach((btn) => {
          const btnVal = parseInt(btn.getAttribute('data-val'), 10);
          btn.classList.toggle('active', btnVal === val);
        });
      }
      const step = config.steps.find((s) => s.val === val) || config.steps[2];
      if (badgeNum) badgeNum.textContent = val;
      if (badgeLabel) badgeLabel.textContent = step.label;
      if (badgeSub) badgeSub.textContent = step.sub;

      updateTouchDesignerLivePreview();
    };

    if (slider) {
      slider.addEventListener('input', (e) => {
        updateUI(parseInt(e.target.value, 10));
      });
      slider.addEventListener('change', (e) => {
        const val = parseInt(e.target.value, 10);
        if (window.soundEngine) window.soundEngine.playSliderTick(val * 2);
      });
    }

    if (cards) {
      cards.forEach((btn) => {
        btn.addEventListener('click', () => {
          const val = parseInt(btn.getAttribute('data-val'), 10);
          updateUI(val);
          if (window.soundEngine) window.soundEngine.playSliderTick(val * 2);
        });
      });
    }

    updateUI(state[key]);
  }

  // --- 3. OPEN-ENDED PROMPT ROTATION & DUAL INPUT MODES ---
  function initPromptBank() {
    renderCurrentPrompt();

    if (cyclePromptBtn) {
      cyclePromptBtn.addEventListener('click', () => {
        state.activePromptIndex = (state.activePromptIndex + 1) % KIOSK_CONFIG.prompts.length;
        renderCurrentPrompt();
        if (window.soundEngine) window.soundEngine.playPromptSwitch();
        if (promptCard) {
          promptCard.classList.remove('prompt-pulse');
          void promptCard.offsetWidth;
          promptCard.classList.add('prompt-pulse');
        }
        updateTouchDesignerLivePreview();
      });
    }
  }

  function renderCurrentPrompt() {
    const prompt = KIOSK_CONFIG.prompts[state.activePromptIndex];
    if (promptQuestionEl) promptQuestionEl.textContent = prompt.text;
    if (promptGuidanceEl) promptGuidanceEl.textContent = prompt.subtext || '';
    if (promptTagEl) promptTagEl.textContent = `${prompt.icon} ${prompt.tag}`;
  }

  function initInputModes() {
    tabText.addEventListener('click', () => switchInputMode('text'));
    tabAudio.addEventListener('click', () => switchInputMode('audio'));

    if (textInput) {
      textInput.addEventListener('input', (e) => {
        let val = e.target.value;
        if (val.length > KIOSK_CONFIG.maxTextChars) {
          val = val.slice(0, KIOSK_CONFIG.maxTextChars);
          textInput.value = val;
        }
        state.responseText = val;
        const count = val.length;
        charCounter.textContent = `${count} / ${KIOSK_CONFIG.maxTextChars}`;
        if (count >= KIOSK_CONFIG.maxTextChars - 20) {
          charCounter.classList.add('char-limit-near');
        } else {
          charCounter.classList.remove('char-limit-near');
        }
        updateTouchDesignerLivePreview();
      });
    }

    if (btnStartRecord) {
      btnStartRecord.addEventListener('click', () => {
        if (audioErrorMessage) audioErrorMessage.classList.add('hidden');
        audioRecorder.startRecording();
      });
    }

    if (btnStopRecord) {
      btnStopRecord.addEventListener('click', () => {
        audioRecorder.stopRecording();
      });
    }

    if (btnRerecord) {
      btnRerecord.addEventListener('click', () => {
        audioRecorder.cancelRecording();
        if (audioPlayer) {
          audioPlayer.pause();
          audioPlayer.src = '';
        }
        state.audioData = null;
        updateAudioUIState('idle');
        updateTouchDesignerLivePreview();
      });
    }
  }

  function switchInputMode(mode) {
    state.inputMode = mode;
    tabText.classList.toggle('active', mode === 'text');
    tabAudio.classList.toggle('active', mode === 'audio');
    panelText.classList.toggle('hidden', mode !== 'text');
    panelAudio.classList.toggle('hidden', mode !== 'audio');

    if (mode === 'text' && audioRecorder.state === 'recording') {
      audioRecorder.cancelRecording();
    } else if (mode === 'audio' && audioRecorder.state === 'idle') {
      audioRecorder.drawIdleWaveform();
    }
    updateTouchDesignerLivePreview();
  }

  function updateAudioUIState(recState) {
    if (btnStartRecord) btnStartRecord.classList.toggle('hidden', recState !== 'idle');
    if (btnStopRecord) btnStopRecord.classList.toggle('hidden', recState !== 'recording');
    if (audioRecordingIndicator) audioRecordingIndicator.classList.toggle('hidden', recState !== 'recording');
    if (audioPlaybackContainer) audioPlaybackContainer.classList.toggle('hidden', recState !== 'recorded');

    if (recState === 'idle') {
      audioTimerDisplay.textContent = `00:00 / 00:${KIOSK_CONFIG.maxAudioDurationSec}`;
      audioTimerDisplay.classList.remove('timer-warning');
      if (audioGuidanceTitle) audioGuidanceTitle.textContent = 'Speak your reflection aloud';
      if (audioGuidanceDesc) audioGuidanceDesc.textContent = 'Tap the microphone to record up to 30 seconds. Your voice note will be softly woven into the library constellation.';
      if (audioStatusBadge) {
        audioStatusBadge.textContent = 'Ready to record';
        audioStatusBadge.classList.remove('recording');
      }
      if (audioRecorder) audioRecorder.drawIdleWaveform();
    } else if (recState === 'recording') {
      if (audioGuidanceTitle) audioGuidanceTitle.textContent = 'Listening... Speak clearly';
      if (audioGuidanceDesc) audioGuidanceDesc.textContent = 'Recording your voice reflection. Tap the square button when you are finished, or speak for up to 30 seconds.';
      if (audioStatusBadge) {
        audioStatusBadge.textContent = 'Recording in progress';
        audioStatusBadge.classList.add('recording');
      }
    } else if (recState === 'recorded') {
      if (audioGuidanceTitle) audioGuidanceTitle.textContent = 'Reflection recorded!';
      if (audioGuidanceDesc) audioGuidanceDesc.textContent = 'You can listen back to your voice note below, or tap Re-record if you wish to try again.';
      if (audioStatusBadge) {
        audioStatusBadge.textContent = '✓ Ready to submit';
        audioStatusBadge.classList.remove('recording');
      }
    } else if (recState === 'error') {
      if (audioGuidanceTitle) audioGuidanceTitle.textContent = 'Microphone unavailable';
      if (audioGuidanceDesc) audioGuidanceDesc.textContent = 'Microphone permission was denied or not supported on this device. You can freely switch to the "Write Reflection" tab above.';
      if (audioStatusBadge) {
        audioStatusBadge.textContent = 'Switched to text';
        audioStatusBadge.classList.remove('recording');
      }
    }
  }

  // --- 4. STEP NAVIGATION ---
  function goToScreen(screenId) {
    state.currentScreen = screenId;
    Object.keys(screens).forEach((key) => {
      const el = screens[key];
      if (el) {
        if (el.id === screenId) {
          el.classList.remove('hidden');
          el.classList.add('fade-in');
        } else {
          el.classList.add('hidden');
          el.classList.remove('fade-in');
        }
      }
    });

    if (window.starVisualizer && typeof window.starVisualizer.setScreenContext === 'function') {
      window.starVisualizer.setScreenContext(screenId);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateTouchDesignerLivePreview();
  }

  // Navigation Event Listeners (One question per screen)
  btnBegin.addEventListener('click', () => {
    if (window.soundEngine) window.soundEngine.init();
    goToScreen('screen-q1-feeling');
  });

  // Q1 Navigation
  btnQ1Back.addEventListener('click', () => goToScreen('screen-welcome'));
  btnQ1Next.addEventListener('click', () => {
    if (window.soundEngine) window.soundEngine.playPromptSwitch();
    goToScreen('screen-q2-intensity');
  });

  // Q2 Navigation
  btnQ2Back.addEventListener('click', () => goToScreen('screen-q1-feeling'));
  btnQ2Next.addEventListener('click', () => {
    if (window.soundEngine) window.soundEngine.playPromptSwitch();
    goToScreen('screen-q3-openness');
  });

  // Q3 Navigation
  btnQ3Back.addEventListener('click', () => goToScreen('screen-q2-intensity'));
  btnQ3Next.addEventListener('click', () => {
    if (window.soundEngine) window.soundEngine.playPromptSwitch();
    goToScreen('screen-q4-mind');
  });

  // Q4 Navigation
  btnQ4Back.addEventListener('click', () => goToScreen('screen-q3-openness'));
  btnQ4Next.addEventListener('click', () => {
    if (window.soundEngine) window.soundEngine.playPromptSwitch();
    goToScreen('screen-open-ended');
  });

  // Open-Ended Back Button
  btnBackToScales.addEventListener('click', () => goToScreen('screen-q4-mind'));

  // Reset Home
  btnResetDone.addEventListener('click', resetKiosk);

  // --- 5. SUBMISSION HANDLERS ---
  // A) Submit With Reflection Words / Audio
  btnSubmitReflection.addEventListener('click', async () => {
    await handleSubmission(false);
  });

  // B) Choice to Not Submit 
  btnSkipReflection.addEventListener('click', async () => {
    await handleSubmission(true);
  });

  async function handleSubmission(isSkipped = false) {
    btnSubmitReflection.disabled = true;
    btnSkipReflection.disabled = true;

    const currentPrompt = KIOSK_CONFIG.prompts[state.activePromptIndex];

    const payload = TouchDesignerBridge.formatRecord({
      feeling: state.feeling,
      intensity: state.intensity,
      openness: state.openness,
      mindBusyness: state.mindBusyness,
      consentGiven: true,
      promptId: isSkipped ? 'none' : currentPrompt.id,
      promptQuestion: isSkipped ? '' : currentPrompt.text,
      responseType: isSkipped ? 'none' : state.inputMode,
      responseText: isSkipped ? '' : (state.inputMode === 'text' ? state.responseText : ''),
      responseAudioBase64: isSkipped ? '' : ((state.inputMode === 'audio' && state.audioData) ? state.audioData.base64 : ''),
      audioDurationSec: isSkipped ? 0 : ((state.inputMode === 'audio' && state.audioData) ? state.audioData.duration : 0)
    });

    state.lastSubmittedRecord = payload;

    // Send to Supabase (with offline queue fallback)
    const result = await window.supabaseHandler.submitRecord(payload);

    // Also output to local directory for TouchDesigner offline playback
    if (window.localOutputHandler) {
      window.localOutputHandler.handleRecordOutput(payload);
    }

    // Play celestial starlight chord
    if (window.soundEngine) window.soundEngine.playStarFormation();

    // Render Star Success View & Support Links
    renderSuccessScreen(payload, result);

    btnSubmitReflection.disabled = false;
    btnSkipReflection.disabled = false;

    // Transition to success screen
    goToScreen('screen-success');

    // Trigger 60s auto-reset countdown
    startSuccessCountdown(60);

    // Trigger visual burst in background constellation canvas
    if (window.constellationBg) {
      window.constellationBg.triggerStarBurst(payload);
    }

    updateQueueCountDisplay();
  }

  function renderSuccessScreen(payload, submitResult) {
    if (window.starVisualizer) {
      window.starVisualizer.updateFromRecord(payload);
    }

    const feeling = TouchDesignerBridge.getFeelingConfig(payload.feeling_id);
    const visual = TouchDesignerBridge.computeVisualParameters({
      feeling: payload.feeling_id,
      intensity: payload.score_intensity,
      openness: payload.score_openness,
      mindBusyness: payload.score_mind_busyness
    });
    const brightness = visual.td_star_brightness;
    const r = Math.round(visual.td_color_r * 255);
    const g = Math.round(visual.td_color_g * 255);
    const b = Math.round(visual.td_color_b * 255);
    const rgbStr = `rgb(${r}, ${g}, ${b})`;
    const glowStr = `rgba(${r}, ${g}, ${b}, ${brightness * 0.85})`;

    if (successStarVisual) {
      successStarVisual.style.backgroundColor = rgbStr;
      successStarVisual.style.boxShadow = `0 0 ${Math.round(brightness * 45)}px ${Math.round(brightness * 18)}px ${glowStr}`;
      successStarVisual.style.transform = `scale(${visual.td_star_scale})`;
    }

    if (successStarAura) {
      successStarAura.style.background = `radial-gradient(circle, ${glowStr} 0%, transparent 70%)`;
      successStarAura.style.animationDuration = `${(1 / Math.max(0.2, visual.td_pulse_rate_hz)).toFixed(2)}s`;
    }

    if (successStarOrbit) {
      successStarOrbit.style.transform = `rotate(${visual.td_rotation_angle}deg) scale(${visual.td_star_scale * 1.1})`;
      successStarOrbit.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.3)`;
    }

    // TouchDesigner Parameters Output
    if (paramStarColor) paramStarColor.textContent = `${feeling.label} (${feeling.colorName})`;
    if (paramStarBrightness) paramStarBrightness.textContent = `${Math.round(brightness * 100)}%`;
    if (paramLineThickness) paramLineThickness.textContent = `${visual.td_line_thickness.toFixed(1)} px`;
    if (paramRotationSpeed) paramRotationSpeed.textContent = `${visual.td_rotation_speed.toFixed(1)} °/s (Tilt: ${visual.td_rotation_angle > 0 ? '+' : ''}${visual.td_rotation_angle}°)`;

    // Summary pills
    if (sumFeeling) sumFeeling.textContent = `${feeling.icon} ${feeling.label}`;
    if (sumIntensity) sumIntensity.textContent = `${payload.score_intensity}/5 Intensity`;
    if (sumOpenness) sumOpenness.textContent = `${payload.score_openness}/5 Presence`;
    if (sumMind) sumMind.textContent = `${payload.score_mind_busyness}/5 Mind`;

    // Sync status badge
    const syncStatusEl = document.getElementById('success-sync-status');
    if (syncStatusEl) {
      if (submitResult.mode === 'supabase_live') {
        syncStatusEl.innerHTML = `<span class="badge-dot live"></span> Synced to TouchDesigner &amp; Supabase`;
      } else {
        syncStatusEl.innerHTML = `<span class="badge-dot local"></span> Stored in Kiosk Local Memory (Ready to sync)`;
      }
    }
  }

  function startSuccessCountdown(seconds) {
    clearInterval(state.successResetInterval);
    let rem = seconds;
    if (successAutoResetTimer) successAutoResetTimer.textContent = rem;

    state.successResetInterval = setInterval(() => {
      rem -= 1;
      if (successAutoResetTimer) successAutoResetTimer.textContent = rem;
      if (rem <= 0) {
        clearInterval(state.successResetInterval);
        resetKiosk();
      }
    }, 1000);
  }

  // --- 6. KIOSK RESET & PRIVACY PROTECTION ---
  function resetKiosk() {
    clearInterval(state.successResetInterval);
    clearInterval(state.idleCountdownTimer);
    hideIdleModal();

    // Reset answers
    state.feeling = 'calm';
    state.intensity = 3;
    state.openness = 3;
    state.mindBusyness = 3;

    selectFeeling('calm');
    initScales();

    // Reset open-ended text & audio
    state.responseText = '';
    if (textInput) textInput.value = '';
    if (charCounter) charCounter.textContent = `0 / ${KIOSK_CONFIG.maxTextChars}`;

    audioRecorder.cancelRecording();
    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer.src = '';
    }
    state.audioData = null;
    updateAudioUIState('idle');
    switchInputMode('text');

    goToScreen('screen-welcome');
  }

  // --- 7. IDLE TIMEOUT ENGINE ---
  function resetIdleTimer() {
    clearTimeout(state.idleTimer);
    if (state.currentScreen !== 'screen-welcome') {
      state.idleTimer = setTimeout(triggerIdleWarning, KIOSK_CONFIG.idleTimeoutSec * 1000);
    }
  }

  function triggerIdleWarning() {
    state.isIdleModalActive = true;
    state.idleSecondsRemaining = KIOSK_CONFIG.idleWarningSec;
    idleCountdownNum.textContent = state.idleSecondsRemaining;
    idleModal.classList.remove('hidden');

    clearInterval(state.idleCountdownTimer);
    state.idleCountdownTimer = setInterval(() => {
      state.idleSecondsRemaining -= 1;
      idleCountdownNum.textContent = state.idleSecondsRemaining;
      if (state.idleSecondsRemaining <= 0) {
        clearInterval(state.idleCountdownTimer);
        resetKiosk();
      }
    }, 1000);
  }

  function hideIdleModal() {
    state.isIdleModalActive = false;
    clearInterval(state.idleCountdownTimer);
    idleModal.classList.add('hidden');
    resetIdleTimer();
  }

  btnStayActive.addEventListener('click', hideIdleModal);
  btnResetNow.addEventListener('click', resetKiosk);

  const activityEvents = ['pointerdown', 'mousemove', 'keydown', 'touchstart'];
  activityEvents.forEach((ev) => {
    window.addEventListener(ev, () => {
      if (!state.isIdleModalActive) {
        resetIdleTimer();
      }
    }, { passive: true });
  });

  // --- 8. TOP BAR CONTROLS ---
  if (window.soundEngine && window.soundEngine.isMuted) {
    btnToggleSound.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
    btnToggleSound.setAttribute('aria-label', 'Unmute Sound');
  }

  btnToggleSound.addEventListener('click', () => {
    if (window.soundEngine) {
      const isMuted = window.soundEngine.toggleMute();
      btnToggleSound.innerHTML = isMuted 
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
      btnToggleSound.setAttribute('aria-label', isMuted ? 'Unmute Sound' : 'Mute Sound');
    }
  });

  btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  // --- 9. TOUCHDESIGNER & OPERATOR DRAWER ---
  btnOpenDevModal.addEventListener('click', () => {
    devModal.classList.remove('hidden');
    supabaseUrlInput.value = window.supabaseHandler.url || '';
    supabaseKeyInput.value = window.supabaseHandler.anonKey || '';
    updateQueueCountDisplay();
    updateTouchDesignerLivePreview();
    if (window.starVisualizer && typeof window.starVisualizer.mountToolkit === 'function') {
      window.starVisualizer.mountToolkit();
    }
  });

  // Dedicated button to mount TouchDesigner Star Visualizer Calibrator
  const btnOpenCalibrator = document.getElementById('btn-open-calibrator');
  if (btnOpenCalibrator) {
    btnOpenCalibrator.addEventListener('click', () => {
      if (window.starVisualizer && typeof window.starVisualizer.mountToolkit === 'function') {
        window.starVisualizer.mountToolkit();
      }
    });
  }

  // Keyboard shortcut: Shift + D to open Star Visualizer Calibrator Toolkit
  window.addEventListener('keydown', (e) => {
    if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
      if (window.starVisualizer && typeof window.starVisualizer.mountToolkit === 'function') {
        window.starVisualizer.mountToolkit();
      }
    }
  });

  btnCloseDevModal.addEventListener('click', () => {
    devModal.classList.add('hidden');
  });

  btnSaveSupabase.addEventListener('click', () => {
    window.supabaseHandler.updateCredentials(supabaseUrlInput.value, supabaseKeyInput.value);
    supabaseStatusAlert.className = 'status-alert info';
    supabaseStatusAlert.textContent = 'Configuration saved in kiosk local storage.';
    supabaseStatusAlert.classList.remove('hidden');
  });

  btnTestSupabase.addEventListener('click', async () => {
    btnTestSupabase.disabled = true;
    btnTestSupabase.textContent = 'Testing...';
    supabaseStatusAlert.className = 'status-alert info';
    supabaseStatusAlert.textContent = 'Connecting to Supabase...';
    supabaseStatusAlert.classList.remove('hidden');

    const test = await window.supabaseHandler.testConnection();
    btnTestSupabase.disabled = false;
    btnTestSupabase.textContent = 'Test Connection';

    if (test.success) {
      supabaseStatusAlert.className = 'status-alert success';
      supabaseStatusAlert.textContent = `✓ ${test.message}`;
    } else {
      supabaseStatusAlert.className = 'status-alert error';
      supabaseStatusAlert.textContent = `✕ ${test.message}`;
    }
  });

  btnCopyJson.addEventListener('click', () => {
    const text = tdJsonPreview.textContent;
    navigator.clipboard.writeText(text).then(() => {
      btnCopyJson.textContent = 'Copied!';
      setTimeout(() => { btnCopyJson.textContent = 'Copy Flat JSON'; }, 2000);
    });
  });

  btnCopyPython.addEventListener('click', () => {
    const script = TouchDesignerBridge.getSamplePythonScript();
    navigator.clipboard.writeText(script).then(() => {
      btnCopyPython.textContent = 'Copied Python Script!';
      setTimeout(() => { btnCopyPython.textContent = 'Copy TouchDesigner Python Script'; }, 2000);
    });
  });

  btnFlushQueue.addEventListener('click', async () => {
    btnFlushQueue.disabled = true;
    btnFlushQueue.textContent = 'Syncing...';
    const res = await window.supabaseHandler.flushOfflineQueue();
    btnFlushQueue.disabled = false;
    btnFlushQueue.textContent = 'Sync Offline Queue Now';
    updateQueueCountDisplay();
    alert(`Flushed ${res.flushed} items. ${res.remaining} remaining in offline queue.`);
  });

  // Local Directory Output Listeners for TouchDesigner
  if (btnPickLocalDir) {
    btnPickLocalDir.addEventListener('click', async () => {
      btnPickLocalDir.disabled = true;
      const res = await window.localOutputHandler.pickOutputDirectory();
      btnPickLocalDir.disabled = false;
      if (localDirStatus) {
        localDirStatus.classList.remove('hidden');
        if (res.success) {
          localDirStatus.className = 'status-alert success';
          localDirStatus.textContent = `✓ Connected to folder: "${res.folderName}". Reflections will auto-save here!`;
        } else {
          localDirStatus.className = 'status-alert info';
          localDirStatus.textContent = res.message || 'Folder selection was not completed.';
        }
      }
    });
  }

  if (btnDownloadLatestJson) {
    btnDownloadLatestJson.addEventListener('click', () => {
      const currentPrompt = KIOSK_CONFIG.prompts[state.activePromptIndex];
      const currentRecord = state.lastSubmittedRecord || TouchDesignerBridge.formatRecord({
        feeling: state.feeling,
        intensity: state.intensity,
        openness: state.openness,
        mindBusyness: state.mindBusyness,
        consentGiven: true,
        promptId: currentPrompt.id,
        promptQuestion: currentPrompt.text,
        responseType: state.inputMode,
        responseText: state.responseText || 'Preview reflection text...',
        audioDurationSec: state.audioData ? state.audioData.duration : 0
      });
      window.localOutputHandler.downloadSingleRecord(currentRecord);
    });
  }

  if (btnExportAllJson) {
    btnExportAllJson.addEventListener('click', () => {
      window.localOutputHandler.downloadAllRecords();
    });
  }

  if (chkAutoDownloadJson) {
    chkAutoDownloadJson.checked = window.localOutputHandler.autoDownloadEnabled;
    chkAutoDownloadJson.addEventListener('change', (e) => {
      window.localOutputHandler.setAutoDownload(e.target.checked);
    });
  }

  function updateQueueCountDisplay() {
    if (localQueueCountBadge) {
      localQueueCountBadge.textContent = window.supabaseHandler.getOfflineQueueCount();
    }
  }

  function updateTouchDesignerLivePreview() {
    const currentPrompt = KIOSK_CONFIG.prompts[state.activePromptIndex] || {};
    const draftRecord = TouchDesignerBridge.formatRecord({
      id: 'live_draft',
      feeling: state.feeling,
      intensity: state.intensity,
      openness: state.openness,
      mindBusyness: state.mindBusyness,
      consentGiven: Boolean(state.consentGiven !== false),
      promptId: currentPrompt.id || 'main-library-connection',
      promptQuestion: currentPrompt.text || '',
      responseType: state.inputMode,
      responseText: state.responseText || '',
      audioDurationSec: state.audioData ? state.audioData.duration : 0
    });
    draftRecord.is_draft = true;

    if (tdJsonPreview) {
      tdJsonPreview.textContent = JSON.stringify(draftRecord, null, 2);
    }

    // Stream live draft to TouchDesigner with debouncing to prevent UI lag or collisions
    if (window.localOutputHandler && typeof window.localOutputHandler.sendLiveDraft === 'function') {
      window.localOutputHandler.sendLiveDraft(draftRecord);
    }

    // Update real-time WebGL star visualizer (TouchDesigner TOP network replica)
    if (window.starVisualizer) {
      window.starVisualizer.updateFromRecord(draftRecord);
    }
  }

  // --- 10. BACKGROUND LIVE CONSTELLATION CANVAS ---
  function initConstellationBackground() {
    const canvas = document.getElementById('constellation-bg');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const particleCount = Math.floor(Math.min(width, height) / 18);
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: isReducedMotion ? 0 : (Math.random() - 0.5) * 0.35,
        vy: isReducedMotion ? 0 : (Math.random() - 0.5) * 0.35,
        baseRadius: 1.2 + Math.random() * 2.2,
        phase: Math.random() * Math.PI * 2
      });
    }

    const bursts = [];

    function triggerStarBurst(payload) {
      if (isReducedMotion) return;
      const cx = width / 2;
      const cy = height * 0.35;
      const feeling = TouchDesignerBridge.getFeelingConfig(payload.feeling_id);
      const [cr, cg, cb] = feeling.rgb || [0.925, 0.973, 0.753];
      const r = Math.round(cr * 255);
      const g = Math.round(cg * 255);
      const b = Math.round(cb * 255);

      for (let i = 0; i < 28; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 4.5;
        bursts.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 2 + Math.random() * 3,
          color: `rgb(${r}, ${g}, ${b})`,
          alpha: 1.0,
          decay: 0.015 + Math.random() * 0.02
        });
      }
    }

    window.constellationBg = { triggerStarBurst };

    let frame = 0;
    function animate() {
      requestAnimationFrame(animate);
      frame++;
      ctx.clearRect(0, 0, width, height);

      const visual = TouchDesignerBridge.computeVisualParameters({
        feeling: state.feeling,
        intensity: state.intensity,
        openness: state.openness,
        mindBusyness: state.mindBusyness
      });

      const connDist = visual.td_connection_distance * 0.85;
      const lineThickness = visual.td_line_thickness * 0.4;
      const r = Math.round(visual.td_color_r * 255);
      const g = Math.round(visual.td_color_g * 255);
      const b = Math.round(visual.td_color_b * 255);

      // Draw connection lines
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connDist) {
            const alpha = (1 - dist / connDist) * 0.25 * visual.td_star_brightness;
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx.lineWidth = lineThickness;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // Draw particle stars
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!isReducedMotion) {
          p.x += p.vx * (visual.td_rotation_speed / 25);
          p.y += p.vy * (visual.td_rotation_speed / 25);
        }

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const pulse = isReducedMotion ? 0 : Math.sin(frame * 0.02 * visual.td_pulse_rate_hz + p.phase);
        const radius = p.baseRadius * (1 + pulse * 0.3) * visual.td_star_scale * 0.65;

        const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 3.5);
        glowGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.5 * visual.td_star_brightness})`);
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + visual.td_star_brightness * 0.3})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Bursts
      for (let i = bursts.length - 1; i >= 0; i--) {
        const bItem = bursts[i];
        bItem.x += bItem.vx;
        bItem.y += bItem.vy;
        bItem.alpha -= bItem.decay;

        if (bItem.alpha <= 0) {
          bursts.splice(i, 1);
          continue;
        }

        ctx.fillStyle = bItem.color;
        ctx.globalAlpha = bItem.alpha;
        ctx.beginPath();
        ctx.arc(bItem.x, bItem.y, bItem.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
    }

    animate();
  }

  // --- INITIALIZE EVERYTHING ---
  initFeelingSelection();
  initScales();
  initPromptBank();
  initInputModes();
  initConstellationBackground();
  resetIdleTimer();
  updateTouchDesignerLivePreview();

  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
});
