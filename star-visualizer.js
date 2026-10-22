/**
 * WebGL Star Renderer & Calibration Toolkit for TouchDesigner TOP Mimicry
 * Recreates: Rectangle/Circle -> Blur -> Comp -> Select -> Constant -> Switch -> Level -> Transform
 * Site: RMIT Swanston Library Level 6 Wellbeing Installation
 * Calibrated against "visualCalibrationNotes.md" and "touchdesigner/poll_script".
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

    this.gl = this.canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true });
    if (!this.gl) {
      console.error('WebGL not supported');
      return;
    }

    // Default calibration parameters matching TouchDesigner TOP network from visualCalibrationNotes.md:
    // Rectangles: size x = 0.5 aspect (half-length 0.25), size y = 0.01 aspect (half-width 0.005)
    // Blur on rectangles: Gaussian, pre-shrink 2, filter size 10 (sigma ~0.022)
    // Circle halo: radius = 0.2 aspect, blur: Gaussian, pre-shrink 8, filter size 12 (sigma ~0.12, aura intensity 0.22)
    // Circle central: radius = 0.05 aspect, no blur (crisp solid core)
    // Comp order (Add): rectY + rectX + halo + central
    this.config = {
      rectArmLength: 0.25,   // TD Rect TOP size x: 0.5 fraction aspect -> half-length 0.25
      rectArmWidth: 0.005,   // TD Rect TOP size y: 0.01 fraction aspect -> half-width 0.005
      rectBlur: 0.022,       // TD Blur TOP on rects: Gaussian, Pre-shrink 2, Filter 10
      rectIntensity: 2.2,    // Rect arm intensity multiplier (yields optical flare peak ~0.40)
      haloRadius: 0.18,      // TD Circle TOP (halo): Radius ~0.2 fraction aspect
      haloBlur: 0.12,        // TD Blur TOP on halo: Gaussian, Pre-shrink 8, Filter 12
      haloIntensity: 0.22,   // Halo ambient aura intensity (soft, translucent glow)
      centralRadius: 0.05,   // TD Circle TOP (central): Radius 0.05 fraction aspect, NO blur
      coreWhiteHot: 0.50     // Core highlight whitening factor for intense stellar center
    };

    // Load persisted calibration if saved previously (v3 format)
    const savedConfig = localStorage.getItem('LAL_STAR_CALIBRATION_V3');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.rectArmLength !== undefined && parsed.haloIntensity !== undefined) {
          Object.assign(this.config, parsed);
        }
      } catch (e) {}
    }

    // State matching star_core.py and touchdesigner/poll_script:
    // BRIGHTNESS = (0.25, 1.0)
    // SCALE      = (0.6, 1.6)
    // ROT_SPEED  = (3.0, 45.0) deg/s
    this.targetState = {
      emo: 1, // 1 = calm (default white)
      brightness: 0.625,
      gamma: 1.0,
      scale: 1.1,
      rot_speed: 24.0, // deg/s
      rot_tilt: 22.5,  // deg
      active: 1
    };

    this.smoothedState = { ...this.targetState };
    this.currentRotationZ = 0.0;
    this.lastTime = performance.now();

    // 6-Emotion Palettes strictly aligned with visualCalibrationNotes.md:
    // Happy: yellow      r: 0.913725, g: 1.0,    b: 0.0
    // Calm: uncolored    r: 1.0,      g: 1.0,    b: 1.0 (default white)
    // Tired: red         r: 0.5,      g: 0.0,    b: 0.0
    // Anxious: purple    r: 0.3739,   g: 0.0,    b: 0.552
    // Sad: blue          r: 0.0,      g: 0.1843, b: 1.0
    // Frustrated: orange r: 1.0,      g: 0.5450, b: 0.0
    this.palettes = [
      [0.913725, 1.000000, 0.000000], // 0: Happy (Yellow)
      [1.000000, 1.000000, 1.000000], // 1: Calm (Default White / Uncoloured)
      [0.500000, 0.000000, 0.000000], // 2: Tired (Red)
      [0.373900, 0.000000, 0.552000], // 3: Anxious (Purple)
      [0.000000, 0.184300, 1.000000], // 4: Sad (Blue)
      [1.000000, 0.545000, 0.000000]  // 5: Frustrated (Orange)
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

    // Fragment Shader strictly reproducing TouchDesigner TOP chain:
    // 1. Rectangle (y-axis): size x=0.01 aspect, size y=0.5 aspect -> Blur (Pre-shrink 2, Filter 10)
    // 2. Rectangle (x-axis): size x=0.5 aspect, size y=0.01 aspect -> Blur (Pre-shrink 2, Filter 10)
    // 3. Circle (halo): Radius 0.2 aspect -> Blur (Pre-shrink 8, Filter 12)
    // 4. Circle (central): Radius 0.05 aspect -> Unblurred
    // 5. Comp (Add): rectY + rectX + halo + central
    // 6. Select -> Constant -> Switch -> Level -> Transform
    const fsSource = `
      precision highp float;
      varying vec2 v_uv;

      uniform vec2 u_resolution;
      uniform vec3 u_color;
      uniform float u_brightness;
      uniform float u_gamma;
      uniform float u_scale;
      uniform float u_rotation;

      // Calibration uniforms matching TouchDesigner TOP network
      uniform float u_rectArmLength;
      uniform float u_rectArmWidth;
      uniform float u_rectBlur;
      uniform float u_rectIntensity;
      uniform float u_haloRadius;
      uniform float u_haloBlur;
      uniform float u_haloIntensity;
      uniform float u_centralRadius;
      uniform float u_coreWhiteHot;

      // 2D Rotation matrix (Transform TOP)
      vec2 rotate2D(vec2 p, float angle) {
        float s = sin(angle);
        float c = cos(angle);
        return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
      }

      // Fast, continuous Abramowitz & Stegun erf(x) approximation
      float approxErf(float x) {
        float ax = abs(x);
        float t = 1.0 / (1.0 + 0.3275911 * ax);
        float poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
        float result = 1.0 - poly * exp(-ax * ax);
        return sign(x) * result;
      }

      // 1D Gaussian-blurred box convolution: evaluates integral of [-extent, +extent] convolved with Gaussian
      float blurredBox1D(float x, float extent, float sigma) {
        float invSqrt2Sigma = 1.0 / (1.41421356 * max(0.0005, sigma));
        return 0.5 * (approxErf((extent + x) * invSqrt2Sigma) + approxErf((extent - x) * invSqrt2Sigma));
      }

      void main() {
        // Centered coordinates with aspect ratio correction
        // Full height corresponds to [-0.5, +0.5] (1.0 fraction aspect unit)
        vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

        // Transform TOP: Scale & Rotation
        float safeScale = max(0.01, u_scale);
        p = p / safeScale;
        p = rotate2D(p, u_rotation);

        // 1: Rectangle (y-axis) - Vertical arm
        // Convolved with Gaussian Blur TOP (Pre-shrink 2, Filter 10)
        float rectY = blurredBox1D(p.x, u_rectArmWidth, u_rectBlur) * blurredBox1D(p.y, u_rectArmLength, u_rectBlur) * u_rectIntensity;

        // 2: Rectangle (x-axis) - Horizontal arm
        // Convolved with Gaussian Blur TOP (Pre-shrink 2, Filter 10)
        float rectX = blurredBox1D(p.x, u_rectArmLength, u_rectBlur) * blurredBox1D(p.y, u_rectArmWidth, u_rectBlur) * u_rectIntensity;

        // 3: Circle (halo) - Radius 0.2 aspect
        // Convolved with Gaussian Blur TOP (Pre-shrink 8, Filter 12)
        float dist = length(p);
        float invSqrt2SigmaHalo = 1.0 / (1.41421356 * max(0.001, u_haloBlur));
        float halo = 0.5 * (1.0 - approxErf((dist - u_haloRadius) * invSqrt2SigmaHalo)) * u_haloIntensity;

        // 4: Circle (central) - Radius 0.05 aspect
        // Unblurred (crisp subpixel anti-aliased edge)
        float aa = 1.5 / (min(u_resolution.x, u_resolution.y) * safeScale);
        float central = smoothstep(u_centralRadius + aa, u_centralRadius - aa, dist);

        // Comp TOP (Order via Add):
        // 1: rectY + 2: rectX + 3: halo + 4: central
        float totalLuminance = rectY + rectX + halo + central;

        // Level TOP: Brightness & Gamma
        float luminance = pow(max(0.0, totalLuminance * u_brightness), 1.0 / max(0.01, u_gamma));

        // Switch / Constant TOP: Emotion coloring
        // High-luminance core whitening for stellar core
        float whiteHot = clamp((luminance - 0.8) * u_coreWhiteHot, 0.0, 1.0);
        vec3 starColor = mix(u_color, vec3(1.0), whiteHot);

        // Premultiplied alpha output for clean WebGL compositing
        vec3 finalRgb = starColor * luminance;
        float alpha = clamp(luminance, 0.0, 1.0);

        gl_FragColor = vec4(finalRgb, alpha);
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
      rectArmLength: gl.getUniformLocation(program, 'u_rectArmLength'),
      rectArmWidth: gl.getUniformLocation(program, 'u_rectArmWidth'),
      rectBlur: gl.getUniformLocation(program, 'u_rectBlur'),
      rectIntensity: gl.getUniformLocation(program, 'u_rectIntensity'),
      haloRadius: gl.getUniformLocation(program, 'u_haloRadius'),
      haloBlur: gl.getUniformLocation(program, 'u_haloBlur'),
      haloIntensity: gl.getUniformLocation(program, 'u_haloIntensity'),
      centralRadius: gl.getUniformLocation(program, 'u_centralRadius'),
      coreWhiteHot: gl.getUniformLocation(program, 'u_coreWhiteHot')
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

    // Normalization matching TouchDesigner's _n() in touchdesigner/poll_script:
    // score 1 to 5 -> 0.0 to 1.0
    const ni = ((Math.max(1, Math.min(5, record.score_intensity || 3))) - 1) / 4.0;
    const no = ((Math.max(1, Math.min(5, record.score_openness || 3))) - 1) / 4.0;
    const nm = ((Math.max(1, Math.min(5, record.score_mind_busyness || 3))) - 1) / 4.0;

    // Exact ranges from touchdesigner/poll_script:
    // BRIGHTNESS = (0.25, 1.0)
    // SCALE      = (0.6, 1.6)
    // ROT_SPEED  = (3.0, 45.0)
    this.targetState.emo = emo;
    this.targetState.brightness = 0.25 + ni * 0.75;
    this.targetState.gamma = 1.0;
    this.targetState.scale = 0.6 + no * 1.0;
    this.targetState.rot_speed = 3.0 + nm * 42.0;
    this.targetState.rot_tilt = nm * 45.0;
  }

  render(timestamp) {
    const gl = this.gl;
    if (!gl) return;
    const dt = Math.min((timestamp - this.lastTime) / 1000.0, 0.1);
    this.lastTime = timestamp;

    // Filter CHOP emulation: LERP smooth transitions (12 Hz smoothing)
    const factor = 1.0 - Math.exp(-dt * 12.0);
    this.smoothedState.brightness += (this.targetState.brightness - this.smoothedState.brightness) * factor;
    this.smoothedState.gamma += (this.targetState.gamma - this.smoothedState.gamma) * factor;
    this.smoothedState.scale += (this.targetState.scale - this.smoothedState.scale) * factor;
    this.smoothedState.rot_speed += (this.targetState.rot_speed - this.smoothedState.rot_speed) * factor;
    this.smoothedState.rot_tilt += (this.targetState.rot_tilt - this.smoothedState.rot_tilt) * factor;
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

    // Dynamic TouchDesigner TOP calibration uniforms
    gl.uniform1f(this.uniforms.rectArmLength, this.config.rectArmLength);
    gl.uniform1f(this.uniforms.rectArmWidth, this.config.rectArmWidth);
    gl.uniform1f(this.uniforms.rectBlur, this.config.rectBlur);
    gl.uniform1f(this.uniforms.rectIntensity, this.config.rectIntensity);
    gl.uniform1f(this.uniforms.haloRadius, this.config.haloRadius);
    gl.uniform1f(this.uniforms.haloBlur, this.config.haloBlur);
    gl.uniform1f(this.uniforms.haloIntensity, this.config.haloIntensity);
    gl.uniform1f(this.uniforms.centralRadius, this.config.centralRadius);
    gl.uniform1f(this.uniforms.coreWhiteHot, this.config.coreWhiteHot);

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
      background: rgba(14, 22, 28, 0.95); border: 1px solid rgba(210, 247, 249, 0.3);
      border-radius: 12px; padding: 16px; color: #D2F7F9; font-family: monospace;
      font-size: 11px; width: 330px; box-shadow: 0 16px 40px rgba(0,0,0,0.85);
      backdrop-filter: blur(14px); max-height: 88vh; overflow-y: auto;
    `;

    const fields = [
      { key: 'rectArmLength', label: 'Arm Length (TD Rect: 0.5 -> 0.25)', min: 0.05, max: 0.50, step: 0.005 },
      { key: 'rectArmWidth', label: 'Arm Width (TD Rect: 0.01 -> 0.005)', min: 0.001, max: 0.030, step: 0.001 },
      { key: 'rectBlur', label: 'Arm Blur (TD Pre-shrink 2, Filter 10)', min: 0.005, max: 0.080, step: 0.002 },
      { key: 'rectIntensity', label: 'Arm Boost / Multiplier', min: 0.2, max: 5.0, step: 0.1 },
      { key: 'haloRadius', label: 'Halo Radius (TD Circle halo: 0.2)', min: 0.05, max: 0.40, step: 0.01 },
      { key: 'haloBlur', label: 'Halo Blur (TD Pre-shrink 8, Filter 12)', min: 0.02, max: 0.30, step: 0.01 },
      { key: 'haloIntensity', label: 'Halo Boost / Multiplier', min: 0.0, max: 1.0, step: 0.02 },
      { key: 'centralRadius', label: 'Central Radius (TD Circle core: 0.05, No Blur)', min: 0.01, max: 0.15, step: 0.005 },
      { key: 'coreWhiteHot', label: 'Core White-Hot Blend', min: 0.0, max: 1.0, step: 0.05 }
    ];

    const emotions = [
      { id: 0, label: 'Happy 🟡', color: '#E9FF00' },
      { id: 1, label: 'Calm ⚪', color: '#FFFFFF' },
      { id: 2, label: 'Tired 🔴', color: '#FF3333' },
      { id: 3, label: 'Anxious 🟣', color: '#B347FF' },
      { id: 4, label: 'Sad 🔵', color: '#2670FF' },
      { id: 5, label: 'Frustrated 🟠', color: '#FF8B00' }
    ];

    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.15); padding-bottom:8px;">
        <span style="font-weight:bold; letter-spacing:1px; color:#ECF8C0;">✨ TD VISUAL CALIBRATOR</span>
        <button id="btn-close-toolkit" style="background:none; border:none; color:#fff; cursor:pointer; font-size:14px; padding:2px 6px;">✕</button>
      </div>

      <!-- Quick Emotion Switcher -->
      <div style="margin-bottom:12px; padding:8px; background:rgba(255,255,255,0.05); border-radius:8px;">
        <div style="font-size:10px; text-transform:uppercase; color:#9cb1b7; margin-bottom:6px; letter-spacing:0.5px;">Preview Emotion:</div>
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:4px;">
    `;

    emotions.forEach(emo => {
      html += `
        <button class="btn-cal-emo" data-emo="${emo.id}" style="
          background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.15); border-radius:4px;
          color: ${emo.color}; padding: 4px; font-size: 10px; cursor: pointer; text-align:center;
        ">${emo.label}</button>
      `;
    });

    html += `
        </div>
      </div>
    `;

    fields.forEach(f => {
      html += `
        <div style="margin-bottom: 9px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <span style="color:#d2f7f9; font-size:10.5px;">${f.label}</span>
            <span id="val-${f.key}" style="color:#ECF8C0; font-weight:bold;">${this.config[f.key]}</span>
          </div>
          <input type="range" id="slider-${f.key}" min="${f.min}" max="${f.max}" step="${f.step}" value="${this.config[f.key]}" style="width:100%; accent-color:#528B90; cursor:pointer;">
        </div>
      `;
    });

    html += `
      <div style="margin-top:14px; display:flex; gap:8px;">
        <button id="btn-copy-config" style="flex:1; background:#528B90; color:#fff; border:none; border-radius:6px; padding:7px; cursor:pointer; font-weight:bold;">Copy Config</button>
        <button id="btn-reset-config" style="background:rgba(255,255,255,0.12); color:#fff; border:none; border-radius:6px; padding:7px 12px; cursor:pointer;">Reset</button>
      </div>
    `;

    drawer.innerHTML = html;
    document.body.appendChild(drawer);

    // Emotion preview buttons event listeners
    drawer.querySelectorAll('.btn-cal-emo').forEach(btn => {
      btn.addEventListener('click', () => {
        const emo = parseInt(btn.getAttribute('data-emo'), 10);
        this.targetState.emo = emo;
        drawer.querySelectorAll('.btn-cal-emo').forEach(b => b.style.borderColor = 'rgba(255,255,255,0.15)');
        btn.style.borderColor = '#ECF8C0';
      });
    });

    // Sliders event listeners
    fields.forEach(f => {
      const slider = document.getElementById(`slider-${f.key}`);
      const valDisplay = document.getElementById(`val-${f.key}`);
      if (slider && valDisplay) {
        slider.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          this.config[f.key] = val;
          valDisplay.textContent = val;
          localStorage.setItem('LAL_STAR_CALIBRATION_V3', JSON.stringify(this.config));
        });
      }
    });

    document.getElementById('btn-close-toolkit').onclick = () => drawer.remove();

    document.getElementById('btn-copy-config').onclick = () => {
      navigator.clipboard.writeText(JSON.stringify(this.config, null, 2));
      alert('Config JSON copied to clipboard! Paste this into star-visualizer.js when satisfied.');
    };

    document.getElementById('btn-reset-config').onclick = () => {
      localStorage.removeItem('LAL_STAR_CALIBRATION_V3');
      localStorage.removeItem('LAL_STAR_CALIBRATION_V2');
      localStorage.removeItem('LAL_STAR_CALIBRATION');
      location.reload();
    };
  }
}

window.StarVisualizer = StarVisualizer;
