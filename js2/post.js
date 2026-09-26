// ---------------------------------------------------------------------------
// post.js - the light and the colour, done on the graphics card.
//
// Every frame the world is painted into the ordinary 2D canvas, fully lit,
// and the interface into a second, transparent one. This pass takes both,
// and in one shader:
//
//   - lights the world. The dark is the scene's ambient colour; every light
//     brightens and tints it around itself. The light is worked out per ART
//     pixel (2x2 screen pixels) and cut into four hard bands, with an ordered
//     dither where one band meets the next - so a torch throws a stepped,
//     hand-shaded pool of light, the way a pixel artist would paint it, and
//     never a smooth airbrushed circle
//   - grades it: saturation, contrast, a tint in the shadows and one in the
//     lights, per land and per set
//   - pulls the corners in with a stepped, dithered vignette, and adds a
//     fine grain that crawls a pixel at a time
//   - lays the interface over the top, untouched by any of it
//
// Without WebGL - or with LIGHTING switched off - none of this happens and
// the game draws straight to the 2D canvas as it always has.
// ---------------------------------------------------------------------------
'use strict';

const Post = (() => {
  const MAXL = 24, MAXB = 4;
  let gl = null, prog = null, cv = null, texW = null, texU = null, loc = {};
  let uiCanvas = null, uiCtx = null, worldCtx = null, uiUsed = false;
  const lights = [], boxes = [];
  const NEUTRAL = { amb: [1, 1, 1], tint: [1, 1, 1], ta: 0, lift: [0, 0, 0], sat: 1.04, con: 1.03, vig: 0.28, grain: 0.025 };
  let G = Object.assign({}, NEUTRAL);

  const VS = `attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`;
  const FS = `
precision mediump float;
uniform sampler2D uW, uU;
uniform vec2 uRes;
uniform float uTime, uTA, uSat, uCon, uVig, uGrain, uUI;
uniform vec3 uAmb, uTint, uLift;
uniform int uN, uNB;
uniform vec4 uL[${MAXL}];
uniform vec3 uLC[${MAXL}];
uniform vec4 uB[${MAXB}];
uniform vec2 uBP[${MAXB}];
float b2(vec2 a) { return mod(2.0 * a.x + 3.0 * a.y, 4.0); }
float bayer(vec2 p) { vec2 q = mod(p, 4.0); return (4.0 * b2(mod(q, 2.0)) + b2(floor(q / 2.0))) / 16.0; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 art = floor(px / 2.0);
  vec2 uv = px / uRes;
  vec3 c = texture2D(uW, uv).rgb;
  float d = bayer(art) - 0.5;
  // ---- the light: ambient, plus every source, plus any open daylight
  vec3 lit = uAmb;
  vec3 add = vec3(0.0);
  vec2 ap = art * 2.0 + 1.0;
  for (int i = 0; i < ${MAXL}; i++) {
    if (i >= uN) break;
    vec4 L = uL[i];
    float f = clamp(1.0 - length(ap - L.xy) / L.z, 0.0, 1.0);
    f = f * f * (3.0 - 2.0 * f);
    lit += uLC[i] * f * L.w;
    add += uLC[i] * f * f * f * L.w * 0.22;
  }
  for (int i = 0; i < ${MAXB}; i++) {
    if (i >= uNB) break;
    vec4 B = uB[i];
    float fx = clamp(min(ap.x - B.x, B.z - ap.x) / max(1.0, uBP[i].y), 0.0, 1.0);
    float fy = (ap.y >= B.y && ap.y <= B.w) ? 1.0 : 0.0;
    lit = mix(lit, max(lit, vec3(1.0)), fx * fy * uBP[i].x);
  }
  // four hard bands, dithered where they meet
  lit = floor(lit * 4.0 + d * 0.95 + 0.5) / 4.0;
  add = floor(add * 6.0 + d * 0.9 + 0.5) / 6.0;
  c = c * lit + add;
  // ---- the grade
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, uSat);
  c = (c - 0.5) * uCon + 0.5;
  c = mix(c, c * uTint * 1.25, uTA * (0.35 + 0.65 * l));
  c += uLift * (1.0 - clamp(l * 1.6, 0.0, 1.0));
  // ---- the corners
  vec2 v = (uv - 0.5) * vec2(1.25, 1.0);
  float vg = clamp((length(v) - 0.42) * 2.1, 0.0, 1.0);
  vg = floor(vg * 5.0 + d * 0.9 + 0.5) / 5.0;
  c *= 1.0 - vg * uVig;
  // ---- the grain, a pixel of art at a time
  float g = hash(art + floor(uTime * 12.0) * 7.31) - 0.5;
  c += g * uGrain;
  // ---- and the interface, over all of it
  vec4 u = texture2D(uU, uv);
  c = mix(c, u.rgb, u.a * uUI);
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

  const hex = h => { h = String(h); if (h[0] !== '#') return [1, 0.7, 0.4]; if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]; };

  function compile(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function tex() {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  const P = {
    on: false, ready: false, failed: false,
    // build the GL view over the game canvas; false if the card cannot do it
    init() {
      if (this.ready || this.failed) return this.ready;
      try {
        const game = Gfx.canvas;
        cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.id = 'glview';
        gl = cv.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
        if (!gl) throw new Error('no webgl');
        prog = gl.createProgram();
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
        gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
        gl.useProgram(prog);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
        const ap = gl.getAttribLocation(prog, 'p');
        gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);
        for (const n of ['uW', 'uU', 'uRes', 'uTime', 'uTA', 'uSat', 'uCon', 'uVig', 'uGrain', 'uUI', 'uAmb', 'uTint', 'uLift', 'uN', 'uNB', 'uL', 'uLC', 'uB', 'uBP'])
          loc[n] = gl.getUniformLocation(prog, n);
        texW = tex(); texU = tex();
        gl.uniform1i(loc.uW, 0); gl.uniform1i(loc.uU, 1);
        gl.uniform2f(loc.uRes, W, H);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        uiCanvas = document.createElement('canvas'); uiCanvas.width = W; uiCanvas.height = H;
        uiCtx = uiCanvas.getContext('2d'); uiCtx.imageSmoothingEnabled = false;
        worldCtx = Gfx.ctx;
        // the GL view sits exactly over the game canvas and lets the pointer
        // straight through to it, so input and cursors are untouched
        const par = game.parentNode;
        if (getComputedStyle(par).position === 'static') par.style.position = 'relative';
        const cs = getComputedStyle(game);
        cv.style.cssText = `position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:${game.style.width || cs.width};height:${game.style.height || cs.height};image-rendering:pixelated;image-rendering:crisp-edges;pointer-events:none;`;
        this.fit = () => { const r = game.getBoundingClientRect(); cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px'; };
        window.addEventListener('resize', () => this.fit && this.fit());
        par.appendChild(cv);
        this.fit();
        cv.addEventListener('webglcontextlost', e => { e.preventDefault(); this.disable(); this.failed = true; });
        this.ready = true;
      } catch (e) {
        console.warn('post pass unavailable:', e.message);
        this.failed = true; if (cv && cv.parentNode) cv.parentNode.removeChild(cv);
      }
      return this.ready;
    },
    enable() {
      if (!this.init()) { this.on = false; return; }
      this.on = true; cv.style.display = 'block'; Gfx.canvas.style.opacity = '0';
    },
    disable() { this.on = false; if (cv) cv.style.display = 'none'; if (Gfx.canvas) Gfx.canvas.style.opacity = '1'; },
    // --------------------------------------------------------- per frame
    begin() {
      lights.length = 0; boxes.length = 0; uiUsed = false;
      G = Object.assign({}, NEUTRAL);
      if (!this.on) return;
      Gfx.ctx = worldCtx;
      uiCtx.setTransform(1, 0, 0, 1, 0, 0); uiCtx.clearRect(0, 0, W, H);
    },
    // the world is done: everything drawn from here on is interface
    ui() {
      if (!this.on || uiUsed) return;
      uiUsed = true;
      Gfx.ctx = uiCtx;
      uiCtx.setTransform(1, 0, 0, 1, 0, 0);
      uiCtx.globalAlpha = 1; uiCtx.globalCompositeOperation = 'source-over';
    },
    end() {
      if (!this.on) { Gfx.ctx = worldCtx || Gfx.ctx; return; }
      if (this.fit && (Time.frame % 30) === 0) this.fit();
      gl.viewport(0, 0, W, H);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texW);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, Gfx.canvas);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texU);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, uiCanvas);
      const n = Math.min(MAXL, lights.length);
      const L = new Float32Array(MAXL * 4), LC = new Float32Array(MAXL * 3);
      // the brightest and nearest lights win if there are too many
      lights.sort((a, b) => b.w * b.r - a.w * a.r);
      for (let i = 0; i < n; i++) { const l = lights[i]; L.set([l.x, l.y, l.r, l.w], i * 4); LC.set(l.c, i * 3); }
      const nb = Math.min(MAXB, boxes.length), B = new Float32Array(MAXB * 4), BP = new Float32Array(MAXB * 2);
      for (let i = 0; i < nb; i++) { const b = boxes[i]; B.set([b.x0, b.y0, b.x1, b.y1], i * 4); BP.set([b.p, b.f], i * 2); }
      gl.uniform4fv(loc.uL, L); gl.uniform3fv(loc.uLC, LC); gl.uniform1i(loc.uN, n);
      gl.uniform4fv(loc.uB, B); gl.uniform2fv(loc.uBP, BP); gl.uniform1i(loc.uNB, nb);
      gl.uniform1f(loc.uTime, Time.t);
      gl.uniform3fv(loc.uAmb, G.amb); gl.uniform3fv(loc.uTint, G.tint); gl.uniform1f(loc.uTA, G.ta);
      gl.uniform3fv(loc.uLift, G.lift); gl.uniform1f(loc.uSat, G.sat); gl.uniform1f(loc.uCon, G.con);
      gl.uniform1f(loc.uVig, G.vig); gl.uniform1f(loc.uGrain, G.grain); gl.uniform1f(loc.uUI, uiUsed ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      Gfx.ctx = worldCtx;
    },
    // ----------------------------------------------------------- the API
    // a light at world (x, y), reach r, colour, strength; transformed to the
    // screen through whatever transform the drawing context has right now
    light(x, y, r, color = '#ffa832', k = 0.6, flicker = 0) {
      if (!this.on) return;
      const m = Gfx.ctx.getTransform(), s = Math.hypot(m.a, m.b);
      const sx = m.a * x + m.c * y + m.e, sy = m.b * x + m.d * y + m.f, sr = r * s;
      if (sx < -sr || sx > W + sr || sy < -sr || sy > H + sr) return;
      const fl = flicker ? 1 + Math.sin(Time.t * 17 + x * 0.1) * flicker * 0.5 + Math.sin(Time.t * 31 + y) * flicker * 0.5 : 1;
      lights.push({ x: sx, y: sy, r: sr * fl, w: k, c: hex(color) });
    },
    // open daylight over a world-space box, feathered at its sides
    box(x0, y0, x1, y1, power = 1, feather = 60) {
      if (!this.on) return;
      const m = Gfx.ctx.getTransform(), s = Math.hypot(m.a, m.b);
      const ax = m.a * x0 + m.c * y0 + m.e, ay = m.b * x0 + m.d * y0 + m.f;
      const bx = m.a * x1 + m.c * y1 + m.e, by = m.b * x1 + m.d * y1 + m.f;
      boxes.push({ x0: Math.min(ax, bx), y0: Math.min(ay, by), x1: Math.max(ax, bx), y1: Math.max(ay, by), p: power, f: feather * s });
    },
    // the look of the frame; anything left out stays neutral
    set(o) {
      for (const k in o) {
        const v = o[k];
        G[k] = (k === 'amb' || k === 'tint' || k === 'lift') && typeof v === 'string' ? hex(v) : v;
      }
    },
    // the look of each land on the board and in its fights
    grade(b, fight) {
      const g = P.LANDS[b] || P.LANDS[1];
      P.set(g);
      if (fight) P.set({ vig: g.vig + 0.08 });
    },
    LANDS: {
      1: { amb: [1, 0.99, 0.96], tint: '#ffe0b0', ta: 0.18, lift: [0.02, 0.01, 0.04], sat: 1.08, con: 1.04, vig: 0.26, grain: 0.022 },
      2: { amb: [0.8, 0.92, 0.88], tint: '#9ae4c8', ta: 0.24, lift: [0, 0.03, 0.04], sat: 1.05, con: 1.06, vig: 0.36, grain: 0.03 },
      3: { amb: [1, 0.94, 0.84], tint: '#ffb070', ta: 0.26, lift: [0.05, 0.02, 0], sat: 1.12, con: 1.07, vig: 0.32, grain: 0.03 },
      4: { amb: [0.9, 0.95, 1.05], tint: '#c8dcff', ta: 0.24, lift: [0.01, 0.03, 0.07], sat: 0.94, con: 1.05, vig: 0.3, grain: 0.025 },
      5: { amb: [0.66, 0.56, 0.6], tint: '#ff7a4a', ta: 0.3, lift: [0.07, 0.01, 0.02], sat: 1.12, con: 1.1, vig: 0.44, grain: 0.035 },
    },
  };
  return P;
})();

// Gfx.glow used to airbrush a soft disc of colour; now it is a light, handed
// to the post pass, and without the post pass it is nothing at all.
Gfx.glow = function (x, y, r, color, a = 0.5) { Post.light(x, y, r, color, a * 1.3); };
