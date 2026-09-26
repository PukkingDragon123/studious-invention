// ---------------------------------------------------------------------------
// dice.js - a carved bone die, rolled in 3D.
//
// A real cube: six faces, each a little texture of old bone with the pips
// chipped into it, turned by a quaternion, projected with a touch of
// perspective, and drawn face by face with an affine texture per triangle.
// It is rendered at half resolution into its own canvas and blown up with
// smoothing off, so while it tumbles it is still made of pixels.
//
// The number is decided before it is thrown. The throw tumbles freely, then
// the last third of it slerps onto the orientation that shows that number to
// the camera, so it always lands honestly on what the RNG said.
// ---------------------------------------------------------------------------
'use strict';

const Dice3D = (() => {
  const FACE = 40;                         // texture size, texels per face
  // which cube face shows which number: opposite faces add up to seven
  //   +z:1  -z:6  +x:2  -x:5  +y:3  -y:4
  const FACES = [
    { n: 1, normal: [0, 0, 1], verts: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
    { n: 6, normal: [0, 0, -1], verts: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
    { n: 2, normal: [1, 0, 0], verts: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]] },
    { n: 5, normal: [-1, 0, 0], verts: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] },
    { n: 3, normal: [0, -1, 0], verts: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] },
    { n: 4, normal: [0, 1, 0], verts: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]] },
  ];
  const PIPS = {
    1: [[0.5, 0.5]], 2: [[0.28, 0.28], [0.72, 0.72]], 3: [[0.26, 0.26], [0.5, 0.5], [0.74, 0.74]],
    4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
    5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]],
    6: [[0.28, 0.24], [0.72, 0.24], [0.28, 0.5], [0.72, 0.5], [0.28, 0.76], [0.72, 0.76]],
  };
  // ---- quaternions: [w, x, y, z]
  const qmul = (a, b) => [
    a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
    a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
    a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
    a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
  const qaxis = (x, y, z, ang) => { const l = Math.hypot(x, y, z) || 1, s = Math.sin(ang / 2); return [Math.cos(ang / 2), x / l * s, y / l * s, z / l * s]; };
  const qnorm = q => { const l = Math.hypot(...q) || 1; return q.map(v => v / l); };
  const qslerp = (a, b, t) => {
    let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    if (d < 0) { b = b.map(v => -v); d = -d; }
    if (d > 0.9995) return qnorm(a.map((v, i) => v + (b[i] - v) * t));
    const th = Math.acos(d), s = Math.sin(th);
    const ka = Math.sin((1 - t) * th) / s, kb = Math.sin(t * th) / s;
    return a.map((v, i) => v * ka + b[i] * kb);
  };
  const qrot = (q, v) => {
    const [w, x, y, z] = q, [vx, vy, vz] = v;
    const ix = w * vx + y * vz - z * vy, iy = w * vy + z * vx - x * vz, iz = w * vz + x * vy - y * vx, iw = -x * vx - y * vy - z * vz;
    return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
  };
  // the orientation that turns face n toward the camera (+z), spun by roll
  const showing = (n, roll) => {
    const f = FACES.find(f => f.n === n);
    const [nx, ny, nz] = f.normal;
    let q;
    if (nz > 0.5) q = [1, 0, 0, 0];
    else if (nz < -0.5) q = qaxis(0, 1, 0, Math.PI);
    else q = qaxis(ny, -nx, 0, Math.PI / 2);         // rotate the normal onto +z
    // and tip it toward the camera a little, so it rests as a block and not a tile
    const tilt = qmul(qaxis(1, 0, 0, -0.42), qaxis(0, 1, 0, 0.34));
    return qnorm(qmul(tilt, qmul(qaxis(0, 0, 1, roll), q)));
  };

  // ---- the face textures: old bone, a crack or two, pips chipped in
  let TEX = null;
  function bake(style) {
    const out = {};
    for (let n = 1; n <= 6; n++) {
      const c = document.createElement('canvas'); c.width = FACE; c.height = FACE;
      const g = c.getContext('2d');
      const img = g.createImageData(FACE, FACE), px = img.data;
      const R = style.ramp;
      for (let y = 0; y < FACE; y++) for (let x = 0; x < FACE; x++) {
        const h = Math.sin(x * 12.9898 + y * 78.233 + n * 37.7) * 43758.5453;
        const noise = h - Math.floor(h);
        const edge = Math.min(x, y, FACE - 1 - x, FACE - 1 - y);
        let lv = 2.2 + (noise - 0.5) * 0.9 + (edge < 3 ? (edge - 3) * 0.35 : 0) + (1 - (x + y) / (FACE * 2)) * 0.6;
        // a crack across the corner of some faces
        if ((n === 3 || n === 5) && Math.abs(x - y * 0.8 - 6) < 0.8 && y > 14) lv -= 1.4;
        const i = Math.max(0, Math.min(R.length - 1, Math.round(lv)));
        const col = R[i];
        const k = (y * FACE + x) * 4;
        px[k] = col[0]; px[k + 1] = col[1]; px[k + 2] = col[2]; px[k + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      // the pips: a dark hollow, a lit lower lip where the chisel came out
      for (const [u, v] of PIPS[n]) {
        const cx = u * FACE, cy = v * FACE, r = n === 1 ? 6.5 : 4.2;
        g.fillStyle = style.pipRim; g.beginPath(); g.arc(cx + 0.5, cy + 1, r + 0.6, 0, Math.PI * 2); g.fill();
        g.fillStyle = style.pip; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
        g.fillStyle = style.pipDeep; g.beginPath(); g.arc(cx - 0.8, cy - 0.8, r * 0.55, 0, Math.PI * 2); g.fill();
        if (n === 1) { g.fillStyle = style.paint; g.beginPath(); g.arc(cx, cy, r * 0.42, 0, Math.PI * 2); g.fill(); }
      }
      out[n] = c;
    }
    return out;
  }
  const STYLES = {
    bone: { ramp: [[88, 80, 68], [138, 127, 104], [196, 184, 154], [232, 223, 198], [255, 250, 234]].map(c => c),
      pip: '#3a2415', pipDeep: '#1a0e08', pipRim: '#fffaea', paint: '#c2333c' },
  };

  // ---- a die in flight
  class Die {
    constructor(x, y, size = 30) {
      this.x = x; this.y = y; this.size = size;
      this.q = qnorm([1, 0.3, 0.5, 0.1]);
      this.phase = 'rest'; this.t = 0; this.value = 1;
      this.spin = [0, 0, 0]; this.from = null; this.to = null; this.hop = 0; this.vy = 0; this.floor = y;
      this.cv = document.createElement('canvas'); this.cv.width = 96; this.cv.height = 96;
      this.g = this.cv.getContext('2d');
      this.flash = 0; this.bounces = 0;
    }
    // throw it; it will come to rest showing `value` after about `dur` seconds
    roll(value, dur = 1.25) {
      this.value = value; this.phase = 'tumble'; this.t = 0; this.dur = dur;
      this.spin = [rnd(9, 16) * (chance(0.5) ? 1 : -1), rnd(9, 16) * (chance(0.5) ? 1 : -1), rnd(3, 8)];
      this.to = showing(value, rnd(-0.35, 0.35));
      this.vy = -rnd(260, 320); this.hop = 0; this.bounces = 0;
    }
    // put it straight onto a number (a charm, a nudge)
    set(value) { this.value = value; this.q = showing(value, rnd(-0.2, 0.2)); this.phase = 'rest'; this.flash = 0.35; }
    get busy() { return this.phase === 'tumble'; }
    update(dt) {
      this.flash = Math.max(0, this.flash - dt);
      if (this.phase !== 'tumble') return;
      this.t += dt;
      const k = this.t / this.dur;
      // hops on the board, fewer and lower each time
      this.vy += 1500 * dt; this.hop += this.vy * dt;
      if (this.hop > 0) {
        this.hop = 0;
        if (this.vy > 90) { this.vy = -this.vy * 0.42; this.bounces++; if (typeof AudioSys !== 'undefined') AudioSys.sfx('dice_hit', { vol: clamp(0.9 - this.bounces * 0.22, 0.2, 0.9) }); }
        else this.vy = 0;
      }
      if (k < 0.62) {
        const damp = 1 - k * 0.9;
        const s = this.spin;
        this.q = qnorm(qmul(qaxis(s[0], s[1], s[2], Math.hypot(...s) * dt * damp), this.q));
        this.from = this.q;
      } else {
        const u = Ease.outCubic(clamp((k - 0.62) / 0.38, 0, 1));
        this.q = qslerp(this.from, this.to, u);
      }
      if (k >= 1) { this.q = this.to; this.phase = 'rest'; this.hop = 0; this.flash = 0.5; }
    }
    // draw centred at (x, y) on the current context, `size` is half the edge in screen px
    draw(o = {}) {
      if (!TEX) TEX = bake(STYLES.bone);
      const g = this.g, S = 96, C = S / 2, sz = S * 0.26;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, S, S);
      g.imageSmoothingEnabled = false;
      const light = [-0.45, -0.62, 0.65];
      const P = v => { const r = qrot(this.q, v), z = 5.2 - r[2]; return { x: C + r[0] * sz * 4.6 / z, y: C + r[1] * sz * 4.6 / z, z: r[2] }; };
      const faces = [];
      for (const f of FACES) {
        const n = qrot(this.q, f.normal);
        if (n[2] <= 0.02) continue;
        faces.push({ f, n, pts: f.verts.map(P), depth: n[2] });
      }
      faces.sort((a, b) => a.depth - b.depth);
      for (const F of faces) {
        const [p0, p1, p2, p3] = F.pts, tex = TEX[F.f.n];
        quad(g, tex, p0, p1, p2, p3);
        // light it: faces turned away from the lamp go darker, facing ones catch a sheen
        const lam = F.n[0] * light[0] + F.n[1] * light[1] + F.n[2] * light[2];
        g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y); g.lineTo(p2.x, p2.y); g.lineTo(p3.x, p3.y); g.closePath();
        if (lam < 0.72) { g.fillStyle = `rgba(26,14,20,${clamp((0.72 - lam) * 0.85, 0, 0.62)})`; g.fill(); }
        else { g.fillStyle = `rgba(255,250,234,${clamp((lam - 0.72) * 0.5, 0, 0.18)})`; g.fill(); }
        g.lineWidth = 1.4; g.strokeStyle = '#1a0e08'; g.stroke();
      }
      // chipped corners: a lit pixel on the corner nearest the light
      if (this.flash > 0) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = this.flash * 0.8; g.fillStyle = '#fffaea'; g.fillRect(0, 0, S, S); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
      const ctx = Gfx.ctx, scale = (o.size || this.size) / (S * 0.26), dx = this.x - C * scale, dy = this.y + this.hop - C * scale;
      // its shadow on whatever it is rolling across
      ctx.globalAlpha = 0.34 * clamp(1 + this.hop / 200, 0.35, 1);
      ctx.fillStyle = '#07050a';
      ctx.beginPath(); ctx.ellipse(this.x, this.y + this.size * 1.05, this.size * 1.05 * clamp(1 + this.hop / 300, 0.6, 1), this.size * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      const was = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.cv, Math.round(dx), Math.round(dy), Math.round(S * scale), Math.round(S * scale));
      ctx.imageSmoothingEnabled = was;
    }
  }
  // one face: clip to the quad and lay the texture along its two near edges
  // (affine - the perspective on a die this small is too gentle to need more)
  function quad(g, img, p0, p1, p2, p3) {
    g.save();
    g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y); g.lineTo(p2.x, p2.y); g.lineTo(p3.x, p3.y); g.closePath();
    g.clip();
    // p0 -> p1 is the texture's u axis, p0 -> p3 its v axis; average in the
    // far corner so the skew is shared out rather than all on one edge
    const ux = ((p1.x - p0.x) + (p2.x - p3.x)) / 2, uy = ((p1.y - p0.y) + (p2.y - p3.y)) / 2;
    const vx = ((p3.x - p0.x) + (p2.x - p1.x)) / 2, vy = ((p3.y - p0.y) + (p2.y - p1.y)) / 2;
    const cx = (p0.x + p1.x + p2.x + p3.x) / 4, cy = (p0.y + p1.y + p2.y + p3.y) / 4;
    g.setTransform(ux / FACE, uy / FACE, vx / FACE, vy / FACE, cx - (ux + vx) / 2, cy - (uy + vy) / 2);
    g.drawImage(img, -0.5, -0.5, FACE + 1, FACE + 1);
    g.restore();
  }
  return { Die, showing };
})();
