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
          const barHeight = Math.max(3, (dataArray[i] / 255) * height * 0.9);

          // Calming gradient from cyan to amber
          const grad = ctx.createLinearGradient(0, height, 0, height - barHeight);
          grad.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
          grad.addColorStop(0.5, 'rgba(129, 140, 248, 0.8)');
          grad.addColorStop(1, 'rgba(251, 191, 36, 0.95)');

          ctx.fillStyle = grad;
          // Symmetrical rounded bar centered vertically
          const y = (height - barHeight) / 2;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth - 2, barHeight, 3);
          ctx.fill();

          x += barWidth;
        }
      };

      render();
    } catch (e) {
      console.warn('Could not initialize audio visualizer canvas:', e);
    }
  }

  stopVisualizer() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.canvas) {
      const ctx = this.canvas.getContext('2d');
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
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
