/**
 * WebGL Star Renderer & Calibration Toolkit for TouchDesigner TOP Mimicry
 * Recreates: Rectangle/Circle -> Blur -> Comp -> Select -> Constant -> Switch -> Level -> Transform
 * Site: RMIT Swanston Library Level 6 Wellbeing Installation
 */

class StarVisualizer {
  constructor(canvasId = 'star-webgl-canvas') {
    this.canvas = document.getElementById(canvasId);
    if (!canvasId || !this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'star-webgl-canvas';
      this.canvas.style.position = 'fixed';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.width = '100vw';
      this.canvas.style.height = '100vh';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.zIndex = '0';
      document.body.prepend(this.canvas);
    }

    this.gl = this.canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
    if (!this.gl) {
      console.error('WebGL not supported');
      return;
    }

    // Default calibration parameters matching TouchDesigner TOP network
    this.config = {
      coreRadius: 0.12,      // Circle / Rectangle core size
      crossArmWidth: 0.035,  // Rectangle arm thickness
      crossArmLength: 0.42,  // Rectangle arm length
      blurSoftness: 0.28,    // Blur TOP radius / falloff softness
      glowFalloff: 3.2,      // Comp TOP falloff power (ambient aura)
      glowIntensity: 1.25,   // Comp TOP brightness multiplication
      bloomMix: 0.65,        // Blend ratio between sharp core & diffuse glow
      bgDim: 0.15            // Ambient background dimming
    };

    // Load persisted calibration if saved previously
    const savedConfig = localStorage.getItem('LAL_STAR_CALIBRATION');
    if (savedConfig) {
      try { Object.assign(this.config, JSON.parse(savedConfig)); } catch (e) {}
    }

    // State matching star_core.py
    this.targetState = {
      emo: 1, // calm
      brightness: 1.0,
      gamma: 1.0,
      scale: 1.0,
      rot_speed: 25.0, // deg/s
      rot_tilt: 27.5,  // deg
      active: 1
    };

    this.smoothedState = { ...this.targetState };
    this.currentRotationZ = 0.0;
    this.lastTime = performance.now();

    // 6-Emotion Palettes (RGB normalized 0.0 - 1.0 matching TouchDesigner Constant TOPs)
    this.palettes = [
      [1.000, 0.843, 0.314], // 0: Happy (Warm Gold / Solar)
      [0.824, 0.969, 0.977], // 1: Calm (Ice Starlight / Cyan-Teal)
      [0.612, 0.639, 0.686], // 2: Tired (Soft Slate / Dusty Violet)
      [0.980, 0.620, 0.420], // 3: Anxious (Flickering Amber / Coral)
      [0.450, 0.600, 0.900], // 4: Sad (Deep Cobalt / Indigo)
      [0.880, 0.360, 0.360]  // 5: Frustrated (Volcanic Ember / Rose)
    ];

    this.initShaders();
    this.initBuffers();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.render = this.render.bind(this);
    requestAnimationFrame(this.render);
  }

  initShaders() {
    const gl = this.gl;
    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = (a_position + 1.0) * 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // Fragment Shader emulating:
    // Rectangle/Circle -> Blur -> Comp -> Select -> Constant -> Switch -> Level -> Transform
    const fsSource = `
      precision highp float;
      varying vec2 v_uv;

      uniform vec2 u_resolution;
      uniform vec3 u_color;
      uniform float u_brightness;
      uniform float u_gamma;
      uniform float u_scale;
      uniform float u_rotation;

      // Calibration uniforms
      uniform float u_coreRadius;
      uniform float u_armWidth;
      uniform float u_armLength;
      uniform float u_blurSoftness;
      uniform float u_glowFalloff;
      uniform float u_glowIntensity;
      uniform float u_bloomMix;

      // 2D Rotation matrix (Transform TOP)
      vec2 rotate2D(vec2 p, float angle) {
        float s = sin(angle);
        float c = cos(angle);
        return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
      }

      // Signed Distance Field for Rectangle (Rectangle TOP)
      float sdBox(vec2 p, vec2 b) {
        vec2 d = abs(p) - b;
        return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
      }

      void main() {
        // Center UV coordinates (-1.0 to 1.0) with aspect ratio correction
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y) * 2.0;

        // Transform TOP: Apply scale & rotation
        float safeScale = max(0.01, u_scale);
        vec2 p = uv / safeScale;
        p = rotate2D(p, u_rotation);

        // Procedural Star Geometry (Circle + 4-Point Cruciform Rectangle TOPs)
        float distCircle = length(p);
        float arm1 = sdBox(p, vec2(u_armLength, u_armWidth));
        float arm2 = sdBox(p, vec2(u_armWidth, u_armLength));
        float shapeDist = min(distCircle - u_coreRadius, min(arm1, arm2));

        // Blur TOP & Comp TOP emulation (multi-tier exponential falloff)
        // 1. Sharp core luminance
        float core = smoothstep(0.02, -0.02, shapeDist);

        // 2. Diffuse Blur TOP emulation
        float blurAura = exp(-max(0.0, shapeDist) / max(0.001, u_blurSoftness));

        // 3. Ambient Celestial Glow (Comp TOP Additive aura)
        float ambientGlow = pow(max(0.0, 1.0 - length(p) * 0.7), u_glowFalloff) * u_glowIntensity;

        // Composite layers
        float luminance = mix(blurAura, core, 0.5) + ambientGlow * u_bloomMix;

        // Level TOP emulation: Brightness scaling & Gamma correction
        luminance = pow(max(0.0, luminance * u_brightness), 1.0 / max(0.01, u_gamma));

        // Switch & Constant TOP emulation: Tone mapping to emotion palette
        vec3 finalColor = u_color * luminance;
        float alpha = clamp(luminance * 1.1, 0.0, 1.0);

        gl_FragColor = vec4(finalColor * alpha, alpha);
      }
    `;

    const compileShader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
      }
      return s;
    };

    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vsSource));
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(program);
    this.program = program;

    // Cache uniform locations
    this.uniforms = {
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      color: gl.getUniformLocation(program, 'u_color'),
      brightness: gl.getUniformLocation(program, 'u_brightness'),
      gamma: gl.getUniformLocation(program, 'u_gamma'),
      scale: gl.getUniformLocation(program, 'u_scale'),
      rotation: gl.getUniformLocation(program, 'u_rotation'),
      coreRadius: gl.getUniformLocation(program, 'u_coreRadius'),
      armWidth: gl.getUniformLocation(program, 'u_armWidth'),
      armLength: gl.getUniformLocation(program, 'u_armLength'),
      blurSoftness: gl.getUniformLocation(program, 'u_blurSoftness'),
      glowFalloff: gl.getUniformLocation(program, 'u_glowFalloff'),
      glowIntensity: gl.getUniformLocation(program, 'u_glowIntensity'),
      bloomMix: gl.getUniformLocation(program, 'u_bloomMix')
    };
  }

  initBuffers() {
    const gl = this.gl;
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  updateFromRecord(record) {
    if (!record) return;
    const EMOS = { happy: 0, calm: 1, tired: 2, anxious: 3, sad: 4, frustrated: 5 };
    const emoId = String(record.feeling_id || record.feeling_label || 'calm').toLowerCase();
    const emo = EMOS[emoId] !== undefined ? EMOS[emoId] : 1;

    const ni = ((Math.max(1, Math.min(5, record.score_intensity || 3))) - 1) / 4.0;
    const no = ((Math.max(1, Math.min(5, record.score_openness || 3))) - 1) / 4.0;
    const nm = ((Math.max(1, Math.min(5, record.score_mind_busyness || 3))) - 1) / 4.0;

    this.targetState.emo = emo;
    this.targetState.brightness = 1.0 + (ni * 2.0 - 1.0) * 0.25;
    this.targetState.gamma = 1.0 + (ni * 2.0 - 1.0) * 0.50;
    this.targetState.scale = 0.5 + no * 1.0;
    this.targetState.rot_speed = 5.0 + nm * 80.0;
    this.targetState.rot_tilt = nm * 55.0;
  }

  render(timestamp) {
    const gl = this.gl;
    const dt = Math.min((timestamp - this.lastTime) / 1000.0, 0.1);
    this.lastTime = timestamp;

    // Filter CHOP emulation: LERP smooth transitions (12 Hz smoothing)
    const factor = 1.0 - Math.exp(-dt * 12.0);
    this.smoothedState.brightness += (this.targetState.brightness - this.smoothedState.brightness) * factor;
    this.smoothedState.gamma += (this.targetState.gamma - this.smoothedState.gamma) * factor;
    this.smoothedState.scale += (this.targetState.scale - this.smoothedState.scale) * factor;
    this.smoothedState.rot_speed += (this.targetState.rot_speed - this.smoothedState.rot_speed) * factor;
    this.smoothedState.rot_tilt += (this.targetState.rot_tilt - this.smoothedState.rot_tilt) * factor;
    // Categorical emotion does not lerp to prevent intermediate flickering
    this.smoothedState.emo = this.targetState.emo;

    // Speed CHOP emulation: integrate continuous degrees per second
    this.currentRotationZ += (this.smoothedState.rot_speed * (Math.PI / 180.0)) * dt;
    const totalRotationRad = this.currentRotationZ + (this.smoothedState.rot_tilt * (Math.PI / 180.0));

    // Clear buffer
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);

    const rgb = this.palettes[this.smoothedState.emo] || this.palettes[1];
    gl.uniform3f(this.uniforms.color, rgb[0], rgb[1], rgb[2]);
    gl.uniform1f(this.uniforms.brightness, this.smoothedState.brightness);
    gl.uniform1f(this.uniforms.gamma, this.smoothedState.gamma);
    gl.uniform1f(this.uniforms.scale, this.smoothedState.scale);
    gl.uniform1f(this.uniforms.rotation, totalRotationRad);

    // Dynamic calibration uniforms
    gl.uniform1f(this.uniforms.coreRadius, this.config.coreRadius);
    gl.uniform1f(this.uniforms.armWidth, this.config.crossArmWidth);
    gl.uniform1f(this.uniforms.armLength, this.config.crossArmLength);
    gl.uniform1f(this.uniforms.blurSoftness, this.config.blurSoftness);
    gl.uniform1f(this.uniforms.glowFalloff, this.config.glowFalloff);
    gl.uniform1f(this.uniforms.glowIntensity, this.config.glowIntensity);
    gl.uniform1f(this.uniforms.bloomMix, this.config.bloomMix);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(this.render);
  }

  // --- CALIBRATION TOOLKIT DRAWER ---
  mountToolkit() {
    if (document.getElementById('star-tweak-toolkit')) return;

    const drawer = document.createElement('div');
    drawer.id = 'star-tweak-toolkit';
    drawer.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 99999;
      background: rgba(14, 22, 28, 0.94); border: 1px solid rgba(210, 247, 249, 0.25);
      border-radius: 12px; padding: 16px; color: #D2F7F9; font-family: monospace;
      font-size: 11px; width: 310px; box-shadow: 0 12px 36px rgba(0,0,0,0.7);
      backdrop-filter: blur(12px); max-height: 85vh; overflow-y: auto;
    `;

    const fields = [
      { key: 'blurSoftness', label: 'Blur Softness (Blur TOP)', min: 0.05, max: 0.8, step: 0.01 },
      { key: 'glowIntensity', label: 'Glow Boost (Comp TOP)', min: 0.2, max: 3.5, step: 0.05 },
      { key: 'glowFalloff', label: 'Glow Tightness (Aura)', min: 1.0, max: 6.0, step: 0.1 },
      { key: 'bloomMix', label: 'Core / Glow Mix', min: 0.1, max: 1.0, step: 0.02 },
      { key: 'coreRadius', label: 'Circle Radius (Circle TOP)', min: 0.02, max: 0.35, step: 0.01 },
      { key: 'crossArmWidth', label: 'Arm Width (Rect TOP)', min: 0.01, max: 0.15, step: 0.005 },
      { key: 'crossArmLength', label: 'Arm Length (Rect TOP)', min: 0.15, max: 0.85, step: 0.01 }
    ];

    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px;">
        <span style="font-weight:bold; letter-spacing:1px; color:#ECF8C0;">✨ TD VISUAL CALIBRATOR</span>
        <button id="btn-close-toolkit" style="background:none; border:none; color:#fff; cursor:pointer; font-size:14px;">✕</button>
      </div>
    `;

    fields.forEach(f => {
      html += `
        <div style="margin-bottom: 10px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <span>${f.label}</span>
            <span id="val-${f.key}" style="color:#ECF8C0;">${this.config[f.key]}</span>
          </div>
          <input type="range" id="slider-${f.key}" min="${f.min}" max="${f.max}" step="${f.step}" value="${this.config[f.key]}" style="width:100%; accent-color:#528B90; cursor:pointer;">
        </div>
      `;
    });

    html += `
      <div style="margin-top:14px; display:flex; gap:8px;">
        <button id="btn-copy-config" style="flex:1; background:#528B90; color:#fff; border:none; border-radius:6px; padding:6px; cursor:pointer; font-weight:bold;">Copy Config</button>
        <button id="btn-reset-config" style="background:rgba(255,255,255,0.1); color:#fff; border:none; border-radius:6px; padding:6px 12px; cursor:pointer;">Reset</button>
      </div>
    `;

    drawer.innerHTML = html;
    document.body.appendChild(drawer);

    // Event listeners
    fields.forEach(f => {
      const slider = document.getElementById(`slider-${f.key}`);
      const valDisplay = document.getElementById(`val-${f.key}`);
      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.config[f.key] = val;
        valDisplay.textContent = val;
        localStorage.setItem('LAL_STAR_CALIBRATION', JSON.stringify(this.config));
      });
    });

    document.getElementById('btn-close-toolkit').onclick = () => drawer.remove();
    document.getElementById('btn-copy-config').onclick = () => {
      navigator.clipboard.writeText(JSON.stringify(this.config, null, 2));
      alert('Config JSON copied to clipboard! Paste this into star-visualizer.js when satisfied.');
    };
    document.getElementById('btn-reset-config').onclick = () => {
      localStorage.removeItem('LAL_STAR_CALIBRATION');
      location.reload();
    };
  }
}

window.StarVisualizer = StarVisualizer;
