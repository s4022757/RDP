/**
 * Ambient Soundscape Audio Controller for CONSTELLATE
 * RMIT Swanston Library Wellbeing Installation
 * Plays a continuous, calming ambient loop with seamless cross-browser fallback:
 * Primary: M4A (AAC-LC)
 * Fallback: WebM (Opus encoding)
 */

class AmbientSoundscape {
  constructor(options = {}) {
    this.m4aSrc = options.m4aSrc || './audio/soundscape_loop.m4a';
    this.webmSrc = options.webmSrc || './audio/soundscape_loop.webm';
    this.targetVolume = options.volume !== undefined ? options.volume : 0.50;
    this.isMuted = localStorage.getItem('LAL_MUTED') === 'true';
    this.hasStarted = false;
    this.fadeTimer = null;
    this.isDucked = false;

    // Create background audio element
    this.audio = document.createElement('audio');
    this.audio.id = 'ambient-soundscape';
    this.audio.loop = true;
    this.audio.preload = 'auto';

    // Verify format support (canPlayType)
    const canPlayM4a = this.audio.canPlayType('audio/mp4; codecs="mp4a.40.2"') ||
                       this.audio.canPlayType('audio/x-m4a') ||
                       this.audio.canPlayType('audio/aac');
    const canPlayWebm = this.audio.canPlayType('audio/webm; codecs="opus"') ||
                        this.audio.canPlayType('audio/webm');

    if (canPlayM4a && canPlayM4a !== 'no') {
      this.audio.src = this.m4aSrc;
    } else if (canPlayWebm && canPlayWebm !== 'no') {
      this.audio.src = this.webmSrc;
    } else {
      // W3C standard source element fallback
      const s1 = document.createElement('source');
      s1.src = this.m4aSrc;
      s1.type = 'audio/mp4; codecs="mp4a.40.2"';
      const s2 = document.createElement('source');
      s2.src = this.webmSrc;
      s2.type = 'audio/webm; codecs="opus"';
      this.audio.appendChild(s1);
      this.audio.appendChild(s2);
    }

    this.audio.muted = this.isMuted;
    this.audio.volume = 0;
    document.body.appendChild(this.audio);

    this.setupGestureUnlock();
  }

  setupGestureUnlock() {
    const unlock = () => {
      if (!this.hasStarted && !this.isMuted) {
        this.start();
      }
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('touchstart', unlock, true);
      window.removeEventListener('click', unlock, true);
    };

    window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
    window.addEventListener('touchstart', unlock, { capture: true, passive: true });
    window.addEventListener('click', unlock, { capture: true, passive: true });
  }

  start() {
    if (this.hasStarted && !this.audio.paused) return;
    this.hasStarted = true;

    if (this.isMuted) {
      this.audio.muted = true;
      this.audio.play().catch(() => {});
      return;
    }

    this.audio.volume = 0;
    this.audio.play().then(() => {
      this.fadeIn(2500);
    }).catch(err => {
      console.warn('[AmbientSoundscape] Autoplay blocked, waiting for user interaction:', err);
      this.hasStarted = false;
    });
  }

  fadeIn(durationMs = 2500) {
    clearInterval(this.fadeTimer);
    const steps = 30;
    const stepTime = durationMs / steps;
    const effectiveTarget = this.isDucked ? this.targetVolume * 0.25 : this.targetVolume;
    const volStep = effectiveTarget / steps;
    let currentStep = 0;

    this.fadeTimer = setInterval(() => {
      currentStep++;
      if (this.audio) {
        this.audio.volume = Math.min(effectiveTarget, currentStep * volStep);
      }
      if (currentStep >= steps) clearInterval(this.fadeTimer);
    }, stepTime);
  }

  fadeOut(durationMs = 1500) {
    clearInterval(this.fadeTimer);
    const steps = 20;
    const stepTime = durationMs / steps;
    const initialVol = this.audio ? this.audio.volume : 0;
    let currentStep = 0;

    this.fadeTimer = setInterval(() => {
      currentStep++;
      if (this.audio) {
        this.audio.volume = Math.max(0, initialVol - (initialVol * (currentStep / steps)));
      }
      if (currentStep >= steps) {
        clearInterval(this.fadeTimer);
        if (this.audio) this.audio.volume = 0;
      }
    }, stepTime);
  }

  setMuted(muted) {
    this.isMuted = Boolean(muted);
    if (this.audio) {
      this.audio.muted = this.isMuted;
      if (!this.isMuted) {
        if (this.audio.paused) {
          this.audio.play().then(() => this.fadeIn(1500)).catch(() => {});
        } else if (this.audio.volume === 0) {
          this.fadeIn(1500);
        }
      }
    }
    return this.isMuted;
  }

  toggleMute() {
    return this.setMuted(!this.isMuted);
  }

  duck(shouldDuck) {
    this.isDucked = Boolean(shouldDuck);
    if (this.audio && !this.isMuted) {
      this.audio.volume = this.isDucked ? this.targetVolume * 0.15 : this.targetVolume;
    }
  }
}

window.AmbientSoundscape = AmbientSoundscape;