/**
 * Procedural Audio Synthesizer for Libraries Against Loneliness
 * Creates calm, meditative chimes and haptic audio cues using Web Audio API.
 * Engineered for cross-browser autoplay unlocking on mobile & desktop HTTPS sites.
 */

class KioskSoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = localStorage.getItem('LAL_MUTED') === 'true';
    this.masterGain = null;
    this.defaultGain = 0.65;
    this.unlockOnGesture();
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : this.defaultGain;
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Automatically unlocks AudioContext on the first user interaction
   * required by Chrome, Safari, and Edge autoplay policies.
   */
  unlockOnGesture() {
    const unlock = () => {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('touchstart', unlock, true);
      window.removeEventListener('click', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };

    window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
    window.addEventListener('touchstart', unlock, { capture: true, passive: true });
    window.addEventListener('click', unlock, { capture: true, passive: true });
    window.addEventListener('keydown', unlock, { capture: true, passive: true });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('LAL_MUTED', this.isMuted ? 'true' : 'false');
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.defaultGain, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  // Soft glass chime when slider values change
  playSliderTick(value = 5) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    // Pentatonic scale mapped from 1 to 10
    const baseFreqs = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];
    const freq = baseFreqs[Math.min(Math.max(value - 1, 0), 9)];

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    // Warm gentle envelope
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.30);
  }

  // Gentle singing bowl bell chord when star is created / reflection submitted
  playStarFormation() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const freqs = [329.63, 440.00, 523.25, 659.25, 987.77]; // E minor 9 celestial chord
    const now = this.ctx.currentTime;

    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const delay = idx * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + delay);

      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.24 / (idx + 1), now + delay + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.00001, now + delay + 2.5);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + delay);
      osc.stop(now + delay + 2.6);
    });
  }

  // Soft warm pop when selecting a feeling or switching prompts
  playPromptSwitch() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.12);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.24);
  }

  // Soft beep for recording start / stop
  playRecordBeep(isStart = true) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isStart ? 587.33 : 440, now);
    osc.frequency.exponentialRampToValueAtTime(isStart ? 880 : 330, now + 0.12);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.26);
  }
}

window.soundEngine = new KioskSoundEngine();
