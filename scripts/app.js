/**
 * Libraries Against Loneliness • Main Kiosk Application Controller
 * Handles UI state transitions, live background constellation canvas,
 * scale interactions, rotating prompt bank, audio/text submission,
 * TouchDesigner parameter previews, and kiosk idle timeout reset.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- APPLICATION STATE ---
  const state = {
    currentScreen: 'screen-welcome', // 'screen-welcome' | 'screen-scales' | 'screen-open-ended' | 'screen-success'
    scores: {
      connectedness: 5,
      socialEnergy: 5,
      collectiveEmpathy: 6
    },
    activePromptIndex: 0,
    inputMode: 'text', // 'text' | 'audio'
    responseText: '',
    audioData: null, // { blob, base64, duration, mimeType }
    lastSubmittedRecord: null,
    isIdleModalActive: false,
    idleTimer: null,
    idleCountdownTimer: null,
    idleSecondsRemaining: 15
  };

  // --- DOM ELEMENT REFERENCES ---
  const screens = {
    welcome: document.getElementById('screen-welcome'),
    scales: document.getElementById('screen-scales'),
    openEnded: document.getElementById('screen-open-ended'),
    success: document.getElementById('screen-success')
  };

  // Scale elements
  const sliders = {
    connectedness: document.getElementById('slider-connectedness'),
    socialEnergy: document.getElementById('slider-social-energy'),
    collectiveEmpathy: document.getElementById('slider-collective-empathy')
  };

  const scaleValueBadges = {
    connectedness: document.getElementById('val-connectedness'),
    socialEnergy: document.getElementById('val-social-energy'),
    collectiveEmpathy: document.getElementById('val-collective-empathy')
  };

  const pillContainers = {
    connectedness: document.getElementById('pills-connectedness'),
    socialEnergy: document.getElementById('pills-social-energy'),
    collectiveEmpathy: document.getElementById('pills-collective-empathy')
  };

  // Open-ended prompt elements
  const promptCard = document.getElementById('prompt-card');
  const promptQuestionEl = document.getElementById('prompt-question');
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

  // Navigation & Action buttons
  const btnBegin = document.getElementById('btn-begin-reflection');
  const btnToOpenEnded = document.getElementById('btn-to-open-ended');
  const btnBackToScales = document.getElementById('btn-back-to-scales');
  const btnSubmitReflection = document.getElementById('btn-submit-reflection');
  const btnResetDone = document.getElementById('btn-reset-done');

  // Success screen elements
  const successStarVisual = document.getElementById('success-star-visual');
  const successStarAura = document.getElementById('success-star-aura');
  const successParamBrightness = document.getElementById('param-star-brightness');
  const successParamHue = document.getElementById('param-star-hue');
  const successParamLine = document.getElementById('param-line-thickness');
  const successParamPulse = document.getElementById('param-pulse-rate');
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

  // --- INITIALIZE AUDIO RECORDER ---
  const audioRecorder = new KioskAudioRecorder({
    maxDurationSec: KIOSK_CONFIG.maxAudioDurationSec,
    canvas: audioVisualizerCanvas,
    onStateChange: (recState) => {
      updateAudioUIState(recState);
    },
    onTick: ({ elapsed, remaining, max }) => {
      const elSec = Math.floor(elapsed);
      const remSec = Math.ceil(remaining);
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
    },
    onError: (msg) => {
      if (audioErrorMessage) {
        audioErrorMessage.textContent = msg;
        audioErrorMessage.classList.remove('hidden');
      }
    }
  });

  // --- 1. SCALE QUESTIONS INITIALIZATION ---
  function initScales() {
    ['connectedness', 'socialEnergy', 'collectiveEmpathy'].forEach((scaleKey) => {
      const slider = sliders[scaleKey];
      const badge = scaleValueBadges[scaleKey];
      const pillsContainer = pillContainers[scaleKey];

      // Populate 1-10 clickable pills for accessible touch kiosk interaction
      if (pillsContainer) {
        pillsContainer.innerHTML = '';
        for (let i = 1; i <= 10; i++) {
          const pill = document.createElement('button');
          pill.type = 'button';
          pill.className = `scale-pill ${i === state.scores[scaleKey] ? 'active' : ''}`;
          pill.textContent = i;
          pill.setAttribute('aria-label', `Rate ${i} out of 10`);
          pill.addEventListener('click', () => {
            updateScaleValue(scaleKey, i);
            if (window.soundEngine) window.soundEngine.playSliderTick(i);
          });
          pillsContainer.appendChild(pill);
        }
      }

      // Slider drag / input event
      if (slider) {
        slider.value = state.scores[scaleKey];
        slider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          updateScaleValue(scaleKey, val);
        });
        slider.addEventListener('change', (e) => {
          const val = parseInt(e.target.value, 10);
          if (window.soundEngine) window.soundEngine.playSliderTick(val);
        });
      }

      if (badge) {
        badge.textContent = state.scores[scaleKey];
      }
    });

    updateSliderGradients();
  }

  function updateScaleValue(scaleKey, val) {
    state.scores[scaleKey] = val;
    if (sliders[scaleKey]) sliders[scaleKey].value = val;
    if (scaleValueBadges[scaleKey]) scaleValueBadges[scaleKey].textContent = val;

    // Update active pill
    if (pillContainers[scaleKey]) {
      const pills = pillContainers[scaleKey].querySelectorAll('.scale-pill');
      pills.forEach((p, idx) => {
        p.classList.toggle('active', (idx + 1) === val);
      });
    }

    updateSliderGradients();
    updateTouchDesignerLivePreview();
  }

  function updateSliderGradients() {
    // Dynamic fill for sliders
    ['connectedness', 'socialEnergy', 'collectiveEmpathy'].forEach((scaleKey) => {
      const slider = sliders[scaleKey];
      if (!slider) return;
      const val = state.scores[scaleKey];
      const percent = ((val - 1) / 9) * 100;
      
      let startColor = '#6366F1';
      let endColor = '#38BDF8';
      if (scaleKey === 'socialEnergy') {
        startColor = '#818CF8';
        endColor = '#FB923C';
      } else if (scaleKey === 'collectiveEmpathy') {
        startColor = '#2DD4BF';
        endColor = '#FBBF24';
      }

      slider.style.background = `linear-gradient(to right, ${startColor} 0%, ${endColor} ${percent}%, rgba(255, 255, 255, 0.12) ${percent}%, rgba(255, 255, 255, 0.12) 100%)`;
    });
  }

  // --- 2. OPEN-ENDED PROMPT ROTATION & INPUT MODES ---
  function initPromptBank() {
    renderCurrentPrompt();

    if (cyclePromptBtn) {
      cyclePromptBtn.addEventListener('click', () => {
        state.activePromptIndex = (state.activePromptIndex + 1) % KIOSK_CONFIG.prompts.length;
        renderCurrentPrompt();
        if (window.soundEngine) window.soundEngine.playPromptSwitch();
        // Gentle card flip / pulse animation
        if (promptCard) {
          promptCard.classList.remove('prompt-pulse');
          void promptCard.offsetWidth; // trigger reflow
          promptCard.classList.add('prompt-pulse');
        }
      });
    }
  }

  function renderCurrentPrompt() {
    const prompt = KIOSK_CONFIG.prompts[state.activePromptIndex];
    if (promptQuestionEl) promptQuestionEl.textContent = prompt.text;
    if (promptTagEl) promptTagEl.textContent = `${prompt.icon} ${prompt.tag}`;
  }

  function initInputModes() {
    // Tab switching
    tabText.addEventListener('click', () => switchInputMode('text'));
    tabAudio.addEventListener('click', () => switchInputMode('audio'));

    // Textarea character counter (strictly max 300)
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
      });
    }

    // Audio recording button events
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
    }
  }

  function updateAudioUIState(recState) {
    // idle | recording | recorded | error
    if (btnStartRecord) btnStartRecord.classList.toggle('hidden', recState !== 'idle');
    if (btnStopRecord) btnStopRecord.classList.toggle('hidden', recState !== 'recording');
    if (audioRecordingIndicator) audioRecordingIndicator.classList.toggle('hidden', recState !== 'recording');
    if (audioPlaybackContainer) audioPlaybackContainer.classList.toggle('hidden', recState !== 'recorded');

    if (recState === 'idle') {
      audioTimerDisplay.textContent = `00:00 / 00:${KIOSK_CONFIG.maxAudioDurationSec}`;
      audioTimerDisplay.classList.remove('timer-warning');
      if (audioVisualizerCanvas) {
        const ctx = audioVisualizerCanvas.getContext('2d');
        ctx.clearRect(0, 0, audioVisualizerCanvas.width, audioVisualizerCanvas.height);
      }
    }
  }

  // --- 3. STATE & SCREEN NAVIGATION ---
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

    // Reset scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // When on scales or open-ended, update live TouchDesigner preview
    updateTouchDesignerLivePreview();
  }

  // Navigation handlers
  btnBegin.addEventListener('click', () => {
    // Initialize procedural audio context on first user interaction
    if (window.soundEngine) window.soundEngine.init();
    goToScreen('screen-scales');
  });

  btnToOpenEnded.addEventListener('click', () => {
    if (window.soundEngine) window.soundEngine.playPromptSwitch();
    goToScreen('screen-open-ended');
  });

  btnBackToScales.addEventListener('click', () => {
    goToScreen('screen-scales');
  });

  btnResetDone.addEventListener('click', () => {
    resetKiosk();
  });

  // --- 4. SUBMISSION HANDLER ---
  btnSubmitReflection.addEventListener('click', async () => {
    await handleReflectionSubmission();
  });

  async function handleReflectionSubmission() {
    // Disable submit button while sending
    btnSubmitReflection.disabled = true;
    btnSubmitReflection.textContent = 'Generating Star...';

    const currentPrompt = KIOSK_CONFIG.prompts[state.activePromptIndex];

    // Format clean flat TouchDesigner record
    const payload = TouchDesignerBridge.formatRecord({
      connectedness: state.scores.connectedness,
      socialEnergy: state.scores.socialEnergy,
      collectiveEmpathy: state.scores.collectiveEmpathy,
      promptId: currentPrompt.id,
      promptQuestion: currentPrompt.text,
      responseType: state.inputMode,
      responseText: state.inputMode === 'text' ? state.responseText : '',
      responseAudioBase64: (state.inputMode === 'audio' && state.audioData) ? state.audioData.base64 : '',
      audioDurationSec: (state.inputMode === 'audio' && state.audioData) ? state.audioData.duration : 0
    });

    state.lastSubmittedRecord = payload;

    // Send to Supabase (with offline fallback)
    const result = await window.supabaseHandler.submitRecord(payload);

    // Play celestial starlight formation chord
    if (window.soundEngine) window.soundEngine.playStarFormation();

    // Render Star Success View
    renderSuccessScreen(payload, result);

    // Re-enable button
    btnSubmitReflection.disabled = false;
    btnSubmitReflection.textContent = 'Light My Star in the Constellation ✨';

    // Transition to success screen
    goToScreen('screen-success');

    // Trigger auto-reset countdown (15s)
    startSuccessCountdown(15);

    // Trigger burst in background constellation canvas!
    if (window.constellationBg) {
      window.constellationBg.triggerStarBurst(payload);
    }

    // Refresh operator drawer queue count
    updateQueueCountDisplay();
  }

  function renderSuccessScreen(payload, submitResult) {
    // Apply TouchDesigner parameters to visual star representation
    const brightness = payload.td_star_brightness;
    const r = Math.round(payload.td_color_r * 255);
    const g = Math.round(payload.td_color_g * 255);
    const b = Math.round(payload.td_color_b * 255);
    const rgbStr = `rgb(${r}, ${g}, ${b})`;
    const glowStr = `rgba(${r}, ${g}, ${b}, ${brightness * 0.8})`;

    if (successStarVisual) {
      successStarVisual.style.backgroundColor = rgbStr;
      successStarVisual.style.boxShadow = `0 0 ${Math.round(brightness * 45)}px ${Math.round(brightness * 18)}px ${glowStr}`;
      successStarVisual.style.transform = `scale(${payload.td_star_scale})`;
    }

    if (successStarAura) {
      successStarAura.style.background = `radial-gradient(circle, ${glowStr} 0%, transparent 70%)`;
      successStarAura.style.animationDuration = `${(1 / payload.td_pulse_rate_hz).toFixed(2)}s`;
    }

    // Display TouchDesigner mapped values
    if (successParamBrightness) successParamBrightness.textContent = `${Math.round(brightness * 100)}%`;
    if (successParamHue) successParamHue.textContent = `Hue ${(payload.td_color_hue * 360).toFixed(0)}° (${rgbStr})`;
    if (successParamLine) successParamLine.textContent = `${payload.td_line_thickness.toFixed(1)} px`;
    if (successParamPulse) successParamPulse.textContent = `${payload.td_pulse_rate_hz.toFixed(2)} Hz`;

    // Show sync status badge
    const syncStatusEl = document.getElementById('success-sync-status');
    if (syncStatusEl) {
      if (submitResult.mode === 'supabase_live') {
        syncStatusEl.innerHTML = `<span class="badge-dot live"></span> Live Synced to RMIT Supabase & TouchDesigner`;
      } else {
        syncStatusEl.innerHTML = `<span class="badge-dot local"></span> Stored in Kiosk Local Constellation (Ready to sync)`;
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

  // --- 5. KIOSK RESET & PRIVACY PROTECTION ---
  function resetKiosk() {
    clearInterval(state.successResetInterval);
    clearInterval(state.idleCountdownTimer);
    hideIdleModal();

    // Reset scores to defaults
    state.scores.connectedness = KIOSK_CONFIG.scales.connectedness.defaultVal;
    state.scores.socialEnergy = KIOSK_CONFIG.scales.socialEnergy.defaultVal;
    state.scores.collectiveEmpathy = KIOSK_CONFIG.scales.collectiveEmpathy.defaultVal;

    // Reset text & audio inputs
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

    // Reset scales visual controls
    initScales();

    // Return to attract / welcome screen
    goToScreen('screen-welcome');
  }

  // --- 6. IDLE TIMEOUT KIOSK ENGINE ---
  function resetIdleTimer() {
    clearTimeout(state.idleTimer);
    // Only engage idle reset when not on the idle attract screen
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

  // Global activity listener
  const activityEvents = ['pointerdown', 'mousemove', 'keydown', 'touchstart'];
  activityEvents.forEach((ev) => {
    window.addEventListener(ev, () => {
      if (!state.isIdleModalActive) {
        resetIdleTimer();
      }
    }, { passive: true });
  });

  // --- 7. TOP BAR CONTROLS ---
  // Sound Mute Toggle
  btnToggleSound.addEventListener('click', () => {
    if (window.soundEngine) {
      const isMuted = window.soundEngine.toggleMute();
      btnToggleSound.innerHTML = isMuted 
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
      btnToggleSound.setAttribute('aria-label', isMuted ? 'Unmute Sound' : 'Mute Sound');
    }
  });

  // Fullscreen Kiosk Mode
  btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  // --- 8. TOUCHDESIGNER & OPERATOR DRAWER ---
  btnOpenDevModal.addEventListener('click', () => {
    devModal.classList.remove('hidden');
    supabaseUrlInput.value = window.supabaseHandler.url || '';
    supabaseKeyInput.value = window.supabaseHandler.anonKey || '';
    updateQueueCountDisplay();
    updateTouchDesignerLivePreview();
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

  function updateQueueCountDisplay() {
    if (localQueueCountBadge) {
      localQueueCountBadge.textContent = window.supabaseHandler.getOfflineQueueCount();
    }
  }

  function updateTouchDesignerLivePreview() {
    if (!tdJsonPreview) return;
    const currentPrompt = KIOSK_CONFIG.prompts[state.activePromptIndex];
    const previewRecord = TouchDesignerBridge.formatRecord({
      connectedness: state.scores.connectedness,
      socialEnergy: state.scores.socialEnergy,
      collectiveEmpathy: state.scores.collectiveEmpathy,
      promptId: currentPrompt.id,
      promptQuestion: currentPrompt.text,
      responseType: state.inputMode,
      responseText: state.responseText || "Preview reflection text...",
      audioDurationSec: state.audioData ? state.audioData.duration : 0
    });

    tdJsonPreview.textContent = JSON.stringify(previewRecord, null, 2);
  }

  // --- 9. BACKGROUND LIVE CONSTELLATION CANVAS ---
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

    // Particle nodes
    const particleCount = Math.floor(Math.min(width, height) / 16);
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        baseRadius: 1.2 + Math.random() * 2.2,
        phase: Math.random() * Math.PI * 2
      });
    }

    const bursts = [];

    function triggerStarBurst(payload) {
      const cx = width / 2;
      const cy = height * 0.38;
      const r = Math.round(payload.td_color_r * 255);
      const g = Math.round(payload.td_color_g * 255);
      const b = Math.round(payload.td_color_b * 255);

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

      // Current interactive visual settings derived from active slider scores
      const visual = TouchDesignerBridge.computeVisualParameters(state.scores);
      const connDist = visual.td_connection_distance * 0.85;
      const lineThickness = visual.td_line_thickness * 0.45;
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
            const alpha = (1 - dist / connDist) * 0.28 * visual.td_star_brightness;
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
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const pulse = Math.sin(frame * 0.02 * visual.td_pulse_rate_hz + p.phase);
        const radius = p.baseRadius * (1 + pulse * 0.3) * visual.td_star_scale * 0.7;

        // Soft outer glow
        const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 3.5);
        glowGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.5 * visual.td_star_brightness})`);
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Core star
        ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + visual.td_star_brightness * 0.3})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Render star burst particles if any
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
  initScales();
  initPromptBank();
  initInputModes();
  initConstellationBackground();
  resetIdleTimer();

  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.log('SW registration note:', err);
    });
  }
});
