/**
 * Audio Recording Module for Libraries Against Loneliness Kiosk
 * Handles browser MediaRecorder API, strictly capped at 30 seconds,
 * with real-time waveform visualizer and playback controls.
 */

class KioskAudioRecorder {
  constructor(options = {}) {
    this.maxDurationSec = options.maxDurationSec || 30;
    this.onStateChange = options.onStateChange || (() => {});
    this.onTick = options.onTick || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onError = options.onError || (() => {});

    this.mediaRecorder = null;
    this.stream = null;
    this.audioChunks = [];
    this.recordedBlob = null;
    this.recordedBase64 = null;
    this.recordedDuration = 0;
    this.recordingStartTime = 0;
    this.timerInterval = null;

    // Web Audio API for live waveform visualizer
    this.audioCtx = null;
    this.analyser = null;
    this.sourceNode = null;
    this.animFrameId = null;
    this.canvas = options.canvas || null;

    this.state = 'idle'; // idle | recording | recorded | error
    if (this.canvas) {
      setTimeout(() => this.drawIdleWaveform(), 60);
    }
  }

  isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  }

  async startRecording() {
    if (!this.isSupported()) {
      this.state = 'error';
      this.onError('Audio recording is not supported in this browser.');
      return;
    }

    try {
      this.audioChunks = [];
      this.recordedBlob = null;
      this.recordedBase64 = null;
      this.recordedDuration = 0;

      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Determine supported mime type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/aac'
      ];
      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      const recorderOptions = selectedMime ? { mimeType: selectedMime } : {};
      this.mediaRecorder = new MediaRecorder(this.stream, recorderOptions);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const mime = selectedMime || 'audio/webm';
        this.recordedBlob = new Blob(this.audioChunks, { type: mime });
        this.recordedDuration = Math.min(
          this.maxDurationSec,
          (Date.now() - this.recordingStartTime) / 1000
        );

        // Convert blob to base64 payload for Supabase / TouchDesigner
        this.recordedBase64 = await this.blobToBase64(this.recordedBlob);

        this.stopVisualizer();
        this.drawRecordedWaveform();
        this.releaseStream();

        this.state = 'recorded';
        this.onStateChange(this.state);
        this.onComplete({
          blob: this.recordedBlob,
          base64: this.recordedBase64,
          duration: this.recordedDuration,
          mimeType: mime
        });
      };

      // Start recorder
      this.mediaRecorder.start(250); // Slice every 250ms
      this.recordingStartTime = Date.now();
      this.state = 'recording';
      this.onStateChange(this.state);

      if (window.soundEngine) {
        window.soundEngine.playRecordBeep(true);
      }

      // Start visualizer
      this.setupVisualizer(this.stream);

      // Start countdown timer strictly capped at maxDurationSec
      clearInterval(this.timerInterval);
      this.timerInterval = setInterval(() => {
        const elapsed = (Date.now() - this.recordingStartTime) / 1000;
        const remaining = Math.max(0, this.maxDurationSec - elapsed);
        this.onTick({ elapsed, remaining, max: this.maxDurationSec });

        if (elapsed >= this.maxDurationSec) {
          this.stopRecording();
        }
      }, 100);

    } catch (err) {
      console.warn('Microphone permission / access error:', err);
      this.state = 'error';
      this.releaseStream();
      this.stopVisualizer();
      clearInterval(this.timerInterval);
      this.onStateChange(this.state);
      this.onError(err.name === 'NotAllowedError' 
        ? 'Microphone access was denied. You can freely type your reflection instead.' 
        : 'Could not access microphone on this device.');
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.state === 'recording') {
      clearInterval(this.timerInterval);
      if (window.soundEngine) {
        window.soundEngine.playRecordBeep(false);
      }
      this.mediaRecorder.stop();
    }
  }

  cancelRecording() {
    clearInterval(this.timerInterval);
    this.stopVisualizer();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.releaseStream();
    this.audioChunks = [];
    this.recordedBlob = null;
    this.recordedBase64 = null;
    this.recordedDuration = 0;
    this.state = 'idle';
    this.drawIdleWaveform();
    this.onStateChange(this.state);
  }

  releaseStream() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  setupVisualizer(stream) {
    if (!this.canvas) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      this.sourceNode = this.audioCtx.createMediaStreamSource(stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
      this.sourceNode.connect(this.analyser);

      const ctx = this.canvas.getContext('2d');
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const render = () => {
        if (this.state !== 'recording') return;
        this.animFrameId = requestAnimationFrame(render);
        this.analyser.getByteFrequencyData(dataArray);

        const width = this.canvas.width;
        const height = this.canvas.height;
        ctx.clearRect(0, 0, width, height);

        const barWidth = (width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = Math.max(4, (dataArray[i] / 255) * height * 0.92);

          // Constellate palette: Slate Teal (#528B90) -> Ice Cyan (#D2F7F9) -> Pale Starlight Lime (#ECF8C0)
          const y = (height - barHeight) / 2;
          const grad = ctx.createLinearGradient(0, height - y, 0, y);
          grad.addColorStop(0, 'rgba(82, 139, 144, 0.45)');   // Muted Slate Teal #528B90
          grad.addColorStop(0.5, 'rgba(210, 247, 249, 0.85)'); // Ice Starlight Cyan #D2F7F9
          grad.addColorStop(1, 'rgba(236, 248, 192, 1.0)');    // Pale Starlight Lime #ECF8C0

          ctx.shadowColor = 'rgba(236, 248, 192, 0.45)';
          ctx.shadowBlur = 6;
          ctx.fillStyle = grad;

          // Symmetrical rounded bar centered vertically
          ctx.beginPath();
          ctx.roundRect(x, y, Math.max(2, barWidth - 3), barHeight, 3);
          ctx.fill();

          x += barWidth;
        }
      };

      render();
    } catch (e) {
      console.warn('Could not initialize audio visualizer canvas:', e);
    }
  }

  /**
   * Draws a gentle, calm resting baseline on the canvas when idle
   */
  drawIdleWaveform() {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext('2d');
    const width = this.canvas.width;
    const height = this.canvas.height;
    ctx.clearRect(0, 0, width, height);

    const barCount = 32;
    const barWidth = (width / barCount) * 0.65;
    const step = width / barCount;

    ctx.shadowBlur = 0;

    for (let i = 0; i < barCount; i++) {
      const normalizedDist = Math.sin((i / (barCount - 1)) * Math.PI);
      const barHeight = Math.max(4, normalizedDist * 18);
      const x = i * step + (step - barWidth) / 2;
      const y = (height - barHeight) / 2;

      ctx.fillStyle = `rgba(210, 247, 249, ${0.18 + normalizedDist * 0.3})`;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 2);
      ctx.fill();
    }
  }

  /**
   * Draws the frozen captured waveform once audio recording is completed
   */
  drawRecordedWaveform() {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext('2d');
    const width = this.canvas.width;
    const height = this.canvas.height;
    ctx.clearRect(0, 0, width, height);

    const barCount = 32;
    const barWidth = (width / barCount) * 0.7;
    const step = width / barCount;

    for (let i = 0; i < barCount; i++) {
      const envelope = Math.sin((i / (barCount - 1)) * Math.PI);
      const ripple = 0.5 + 0.5 * Math.sin(i * 1.3);
      const barHeight = Math.max(6, envelope * ripple * (height * 0.75));
      const x = i * step + (step - barWidth) / 2;
      const y = (height - barHeight) / 2;

      const grad = ctx.createLinearGradient(0, height - y, 0, y);
      grad.addColorStop(0, 'rgba(82, 139, 144, 0.6)');
      grad.addColorStop(0.6, 'rgba(210, 247, 249, 0.9)');
      grad.addColorStop(1, 'rgba(236, 248, 192, 1.0)');

      ctx.shadowColor = 'rgba(236, 248, 192, 0.5)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 3);
      ctx.fill();
    }
  }

  stopVisualizer() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  blobToBase64(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  }
}

window.KioskAudioRecorder = KioskAudioRecorder;
