'use strict';
// Tiny pixel-art drawing framework: implicit shapes + form shading + rim passes.
// Light comes from the upper-left (per ART_SPEC).

const LV = (() => { const v = [-0.52, -0.62, 0.59]; const n = Math.hypot(v[0], v[1], v[2]); return v.map(k => k / n); })();
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

class Cv {
  constructor(w, h) {
    this.w = w; this.h = h; const n = w * h;
    this.r = new Array(n).fill(null);   // ramp string per pixel
    this.s = new Float64Array(n);       // shade 0..1
    this.c = new Array(n).fill(null);   // literal char (overrides ramp)
    this.dk = 0;                        // global darken (for far-side limbs)
  }
  i(x, y) { return y * this.w + x; }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  has(x, y) { if (!this.inb(x, y)) return false; const i = this.i(x, y); return this.r[i] !== null || this.c[i] !== null; }
  rampAt(x, y) { return this.inb(x, y) ? this.r[this.i(x, y)] : null; }

  put(x, y, ramp, s, o) {
    x = Math.round(x); y = Math.round(y);
    if (!this.inb(x, y)) return;
    const i = this.i(x, y);
    const occupied = this.r[i] !== null || this.c[i] !== null;
    if (o) {
      if (o.behind && occupied) return;
      if (o.onlyOver && this.r[i] !== o.onlyOver) return;
      if (o.keepChar && this.c[i] !== null) return;
    }
    this.r[i] = ramp; this.c[i] = null;
    this.s[i] = clamp(s - this.dk - ((o && o.dark) || 0), 0, 1);
    if (this.touch) this.touch[i] = 1;
  }
  pix(x, y, ch, o) {
    x = Math.round(x); y = Math.round(y);
    if (!this.inb(x, y)) return;
    const i = this.i(x, y);
    if (o && o.behind && (this.r[i] !== null || this.c[i] !== null)) return;
    if (o && o.onlyOver && this.r[i] !== o.onlyOver) return;
    if (o && o.onlyFilled && this.r[i] === null && this.c[i] === null) return;
    this.c[i] = ch; this.r[i] = null;
    if (this.touch) this.touch[i] = 1;
  }
  // --- contact shadows: everything drawn between begin() and sep() gets a dark
  //     halo on the material underneath, so limbs read against the body.
  begin() { this.touch = new Uint8Array(this.w * this.h); return this; }
  sep(dark = 0.24, light = 0) {
    const t = this.touch; this.touch = null;
    if (!t) return;
    const add = new Float64Array(this.w * this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = this.i(x, y);
      if (this.r[i] === null) continue;
      if (!t[i]) {           // underlying material next to the new shape
        let near = false;
        for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (this.inb(xx, yy) && t[this.i(xx, yy)]) { near = true; break; }
        }
        if (near) add[i] -= dark;
      } else if (light) {    // upper-left edge of the new shape catches light
        const up = this.inb(x, y - 1) && !t[this.i(x, y - 1)] && this.r[this.i(x, y - 1)] !== null;
        const lf = this.inb(x - 1, y) && !t[this.i(x - 1, y)] && this.r[this.i(x - 1, y)] !== null;
        if (up || lf) add[i] += light;
      }
    }
    for (let i = 0; i < add.length; i++) if (add[i]) this.s[i] = clamp(this.s[i] + add[i], 0, 1);
  }
  clearPix(x, y) { if (this.inb(x, y)) { const i = this.i(x, y); this.r[i] = null; this.c[i] = null; } }

  // ---- implicit shapes -----------------------------------------------------
  // squashed sphere: real form shading
  ell(cx, cy, rx, ry, ramp, o = {}) {
    const base = o.base ?? 0.52, gain = o.gain ?? 0.46, bias = o.bias || 0, grow = o.grow ?? 0.0;
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const nx = (x - cx) / rx, ny = (y - cy) / ry, r2 = nx * nx + ny * ny;
        if (r2 > 1 + grow) continue;
        let s;
        if (o.flat) s = base + bias;
        else {
          const nz = Math.sqrt(Math.max(0, 1 - Math.min(1, r2)));
          let a = nx, b = ny, cc = nz * (o.round ?? 1);
          const l = Math.hypot(a, b, cc) || 1; a /= l; b /= l; cc /= l;
          s = base + gain * (a * LV[0] + b * LV[1] + cc * LV[2]) + bias;
        }
        this.put(x, y, ramp, s, o);
      }
    }
  }
  // cylinder-ish limb / tail segment
  cap(x0, y0, x1, y1, r0, r1, ramp, o = {}) {
    const base = o.base ?? 0.52, gain = o.gain ?? 0.44, bias = o.bias || 0;
    const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1e-6, len = Math.sqrt(L2);
    const ux = dx / len, uy = dy / len, px = -uy, py = ux;
    const minx = Math.floor(Math.min(x0 - r0, x1 - r1) - 1), maxx = Math.ceil(Math.max(x0 + r0, x1 + r1) + 1);
    const miny = Math.floor(Math.min(y0 - r0, y1 - r1) - 1), maxy = Math.ceil(Math.max(y0 + r0, y1 + r1) + 1);
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      let t = ((x - x0) * dx + (y - y0) * dy) / L2; t = clamp(t, 0, 1);
      const cxp = x0 + dx * t, cyp = y0 + dy * t;
      const d = Math.hypot(x - cxp, y - cyp), r = r0 + (r1 - r0) * t;
      if (d > r + 0.35) continue;
      const off = r > 0.01 ? clamp(((x - cxp) * px + (y - cyp) * py) / r, -1, 1) : 0;
      const along = r > 0.01 ? clamp(((x - cxp) * ux + (y - cyp) * uy) / r, -1, 1) : 0;
      const nz = Math.sqrt(Math.max(0, 1 - off * off - along * along * 0.55));
      let a = px * off + ux * along * 0.7, b = py * off + uy * along * 0.7, cc = nz;
      const l = Math.hypot(a, b, cc) || 1; a /= l; b /= l; cc /= l;
      const s = o.flat ? base + bias : base + gain * (a * LV[0] + b * LV[1] + cc * LV[2]) + bias;
      this.put(x, y, ramp, s, o);
    }
  }
  // polygon, shaded by a 2D directional gradient (+ optional edge rounding)
  poly(pts, ramp, o = {}) {
    const base = o.base ?? 0.52, gain = o.gain ?? 0.34, bias = o.bias || 0;
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (const p of pts) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); }
    const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
    const hw = Math.max(1, (maxx - minx) / 2), hh = Math.max(1, (maxy - miny) / 2);
    const round = o.round ?? 0;
    for (let y = Math.floor(miny); y <= Math.ceil(maxy); y++) {
      for (let x = Math.floor(minx); x <= Math.ceil(maxx); x++) {
        if (!ptIn(pts, x, y)) continue;
        let s;
        if (o.flat) s = base + bias;
        else {
          const ux = (x - cx) / hw, uy = (y - cy) / hh;
          s = base + gain * (-(ux * 0.55 + uy * 0.83)) + bias;
          if (round > 0) { const d = edgeDist(pts, x, y); s -= (1 - clamp(d / round, 0, 1)) * round * 0.06; }
        }
        this.put(x, y, ramp, s, o);
      }
    }
  }
  tri(a, b, c, ramp, o) { this.poly([a, b, c], ramp, o); }
  rect(x0, y0, x1, y1, ramp, o = {}) {
    for (let y = Math.round(y0); y <= Math.round(y1); y++) for (let x = Math.round(x0); x <= Math.round(x1); x++)
      this.put(x, y, ramp, (o.base ?? 0.52) + (o.bias || 0), o);
  }
  // 1px-ish line of literal chars
  lineCh(x0, y0, x1, y1, ch, o) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) this.pix(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, ch, o);
  }
  // shade adjustment over a predicate (stripes, spots, belly, scales)
  adj(pred, delta, ramp) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = this.i(x, y);
      if (this.r[i] === null) continue;
      if (ramp && this.r[i] !== ramp) continue;
      if (!pred(x, y)) continue;
      this.s[i] = clamp(this.s[i] + delta, 0, 1);
    }
  }
  swap(pred, from, to, keepShade) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = this.i(x, y);
      if (this.r[i] !== from) continue;
      if (pred && !pred(x, y)) continue;
      this.r[i] = to;
      if (keepShade === false) this.s[i] = clamp(this.s[i], 0, 1);
    }
  }
  // one coherent light over a whole blobby mass (kills the "pile of boulders" look)
  relight(cx, cy, rx, ry, base = 0.44, gain = 0.5, ramp) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = this.i(x, y);
      if (this.r[i] === null) continue;
      if (ramp && this.r[i] !== ramp) continue;
      const nx = (x - cx) / rx, ny = (y - cy) / ry, r2 = Math.min(1, nx * nx + ny * ny);
      const nz = Math.sqrt(Math.max(0, 1 - r2));
      let a = nx, b = ny, cc = nz;
      const l = Math.hypot(a, b, cc) || 1; a /= l; b /= l; cc /= l;
      this.s[i] = clamp(base + gain * (a * LV[0] + b * LV[1] + cc * LV[2]), 0, 1);
    }
  }
  // ---- passes --------------------------------------------------------------
  finish(o = {}) {
    const n = this.w * this.h;
    const mask = new Uint8Array(n);
    for (let i = 0; i < n; i++) mask[i] = (this.r[i] !== null || this.c[i] !== null) ? 1 : 0;
    const dark = o.rimDark ?? 0.17, lite = o.rimLight ?? 0.11;
    const s2 = Float64Array.from(this.s);
    const em = (x, y) => !(x >= 0 && y >= 0 && x < this.w && y < this.h) || !mask[this.i(x, y)];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = this.i(x, y);
      if (!mask[i] || this.r[i] === null) continue;
      let d = 0;
      if (em(1, 0) || em(0, 1)) d -= dark;
      else if (em(1, 1)) d -= dark * 0.45;
      if (em(-1, 0) || em(0, -1)) d += lite;
      s2[i] = clamp(this.s[i] + d, 0, 1);
    }
    this.s = s2;
  }
  rows() {
    const out = [];
    for (let y = 0; y < this.h; y++) {
      let line = '';
      for (let x = 0; x < this.w; x++) {
        const i = this.i(x, y);
        if (this.c[i] !== null) line += this.c[i];
        else if (this.r[i] !== null) {
          const rp = this.r[i];
          line += rp[clamp(Math.round(this.s[i] * (rp.length - 1)), 0, rp.length - 1)];
        } else line += '.';
      }
      out.push(line);
    }
    return out;
  }
  bbox() {
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.has(x, y)) {
      minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y);
    }
    return { minx, maxx, miny, maxy };
  }
}

function ptIn(pts, x, y) {
  let inside = false;
  const px = x + 0.0001, py = y + 0.0001;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function edgeDist(pts, x, y) {
  let best = 1e9;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const x0 = pts[j][0], y0 = pts[j][1], x1 = pts[i][0], y1 = pts[i][1];
    const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1e-6;
    let t = clamp(((x - x0) * dx + (y - y0) * dy) / L2, 0, 1);
    best = Math.min(best, Math.hypot(x - (x0 + dx * t), y - (y0 + dy * t)));
  }
  return best;
}

// two-bone IK; sign picks which way the knee bends
function ik(hx, hy, fx, fy, l1, l2, sign) {
  let dx = fx - hx, dy = fy - hy, d = Math.hypot(dx, dy);
  if (d < 1e-4) { dx = 0; dy = 1; d = 1; }
  const maxd = (l1 + l2) * 0.985, mind = Math.abs(l1 - l2) + 0.6;
  const dc = clamp(d, mind, maxd);
  const ux = dx / d, uy = dy / d;
  const fx2 = hx + ux * dc, fy2 = hy + uy * dc;
  const a = (l1 * l1 - l2 * l2 + dc * dc) / (2 * dc);
  const hgt = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const mx = hx + ux * a, my = hy + uy * a;
  return { x: mx + sign * (-uy) * hgt, y: my + sign * ux * hgt, fx: fx2, fy: fy2 };
}

// walk-cycle foot path: stance drags back along the ground, swing lifts forward
function footPath(ph, frontX, backX, ground, lift, stanceFrac = 0.62) {
  ph = ph - Math.floor(ph);
  if (ph < stanceFrac) { const t = ph / stanceFrac; return { x: frontX + (backX - frontX) * t, y: ground, down: true }; }
  const t = (ph - stanceFrac) / (1 - stanceFrac);
  const e = t * t * (3 - 2 * t);
  return { x: backX + (frontX - backX) * e, y: ground - Math.sin(t * Math.PI) * lift, down: false };
}

// ---- face parts -------------------------------------------------------------
// Big cartoon eye: white ball, blocky pupil (never a cross), glint only when the
// pupil is wide enough to hold one.
// Every eye in the game is the same joke: a plain black dot. Pass dot:false for
// the two creatures whose eyes ARE the character (the goo and the burning one).
function eyeBall(c, x, y, rx, ry, px, py, o = {}) {
  const white = o.white || '7', shade = o.shade || '6';
  x = Math.round(x); y = Math.round(y);
  if (o.dot !== false) {
    for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
      const nx = dx / rx, ny = dy / ry;
      if (nx * nx + ny * ny <= 1.05) c.pix(x + dx, y + dy, '0');
    }
    if (o.lid) for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
      const ny = Math.round(-ry * Math.sqrt(Math.max(0, 1 - (dx / rx) * (dx / rx))));
      c.pix(x + dx, y + ny, o.lid, { onlyFilled: true });
    }
    return;
  }
  for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
    const nx = dx / rx, ny = dy / ry;
    if (nx * nx + ny * ny > 1.05) continue;
    c.pix(x + dx, y + dy, (dx - dy >= Math.max(rx, ry) * 0.9 || dx + dy >= Math.max(rx, ry) * 1.25) ? shade : white);
  }
  const pw = o.pw ?? Math.max(2, Math.round(rx * 0.95)), ph = o.ph ?? Math.max(2, Math.round(ry * 1.05));
  const x0 = Math.round(x + px - (pw - 1) / 2), y0 = Math.round(y + py - (ph - 1) / 2);
  for (let dy = 0; dy < ph; dy++) for (let dx = 0; dx < pw; dx++) c.pix(x0 + dx, y0 + dy, '0');
  if (o.glint !== false && pw >= 3 && ph >= 3) c.pix(x0, y0, '7');
  if (o.lid) for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {   // heavy upper lid
    const ny = Math.round(-ry * Math.sqrt(Math.max(0, 1 - (dx / rx) * (dx / rx))));
    c.pix(x + dx, y + ny, o.lid, { onlyFilled: true });
  }
}

module.exports = { Cv, ik, footPath, eyeBall, clamp, LV, ptIn };
