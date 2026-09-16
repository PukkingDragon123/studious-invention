// ---------------------------------------------------------------------------
// core.js - constants, math, RNG, coroutines, tweens, camera, juice, particles
// ---------------------------------------------------------------------------
'use strict';

const W = 960, H = 540;          // logical canvas: art is authored at 1:1
const TILE = 32;                 // village tile size

// ------------------------------------------------------------------ math
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, v) => (v - a) / (b - a || 1);
const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));
const sign = v => v < 0 ? -1 : v > 0 ? 1 : 0;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
const inRect = (px, py, x, y, w, h) => px >= x && py >= y && px < x + w && py < y + h;
const deepClone = o => JSON.parse(JSON.stringify(o));
const roman = n => ['', 'I', 'II', 'III', 'IV', 'V'][n] || String(n);
const wrapAngle = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

const Ease = {
  linear: t => t,
  inQuad: t => t * t,
  outQuad: t => 1 - (1 - t) * (1 - t),
  inOutQuad: t => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2,
  inCubic: t => t * t * t,
  outCubic: t => 1 - (1 - t) ** 3,
  inOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2,
  outQuart: t => 1 - (1 - t) ** 4,
  outExpo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  inExpo: t => t <= 0 ? 0 : Math.pow(2, 10 * t - 10),
  outBack: t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2; },
  inBack: t => { const c1 = 1.9, c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; },
  outElastic: t => { if (t === 0 || t === 1) return t; const c4 = (2 * Math.PI) / 3; return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1; },
  outBounce: t => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  inOutBounce: t => t < 0.5 ? (1 - Ease.outBounce(1 - 2 * t)) / 2 : (1 + Ease.outBounce(2 * t - 1)) / 2,
};
const easeOut = Ease.outCubic, easeIn = Ease.inCubic, easeInOut = Ease.inOutCubic;

// ------------------------------------------------------------------ RNG
class RNG {
  constructor(seed) { this.s = (seed >>> 0) || 0x9e3779b9; }
  next() {
    let t = (this.s += 0x6D2B79F5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  float(a = 0, b = 1) { return a + (b - a) * this.next(); }
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
  chance(p) { return this.next() < p; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  weighted(items) { let total = 0; for (const it of items) total += it.w; let r = this.next() * total; for (const it of items) { r -= it.w; if (r <= 0) return it.v; } return items[items.length - 1].v; }
}
const rng = new RNG((Date.now() ^ 0x5bd1e995) >>> 0);
const rnd = (a = 0, b = 1) => rng.float(a, b);
const rndInt = (a, b) => rng.int(a, b);
const pick = arr => rng.pick(arr);
const shuffle = arr => rng.shuffle(arr);
const chance = p => rng.chance(p);

// ------------------------------------------------------------------ coroutines
const Co = {
  list: [],
  run(gen, ctx) {
    const it = typeof gen === 'function' ? gen.call(ctx) : gen;
    const h = { it, wait: 0, cond: null, done: false, child: null, tag: null };
    Co.list.push(h); Co.step(h, 0); return h;
  },
  step(h, dt) {
    if (h.done) return;
    if (h.wait > 0) { h.wait -= dt; if (h.wait > 0) return; }
    if (h.cond) { if (!h.cond()) return; h.cond = null; }
    if (h.child) { if (!h.child.done) return; h.child = null; }
    let guard = 0;
    while (guard++ < 2000) {
      let r;
      try { r = h.it.next(); } catch (e) { console.error('coroutine error', e); h.done = true; return; }
      if (r.done) { h.done = true; return; }
      const v = r.value;
      // a number always yields the frame: > 0 waits that long, 0 waits one frame
      if (typeof v === 'number') { if (v > 0) h.wait = v; return; }
      if (typeof v === 'function') { if (v()) continue; h.cond = v; return; }
      if (v && typeof v === 'object' && 'done' in v) { if (v.done) continue; h.child = v; return; }
      return;
    }
  },
  update(dt) { for (let i = 0; i < Co.list.length; i++) Co.step(Co.list[i], dt); Co.list = Co.list.filter(h => !h.done); },
  clear() { Co.list.length = 0; },
  stop(h) { if (h) h.done = true; },
  // convenience: yield* Co.over(0.4, k => { ... })   runs fn(0..1) over a duration
  *over(dur, fn, ease) {
    let t = 0;
    while (t < dur) { yield 0; t += Time.dt; const k = clamp(t / dur, 0, 1); fn(ease ? ease(k) : k, k); }
  },
};

// ------------------------------------------------------------------ time
const Time = { dt: 0, t: 0, frame: 0, scale: 1, freeze: 0 };

// ------------------------------------------------------------------ tweens
const Tweens = {
  list: [],
  to(obj, props, dur, opt = {}) {
    const from = {}; for (const k in props) from[k] = obj[k];
    const tw = { obj, from, to: props, dur, t: 0, ease: opt.ease || Ease.outCubic, delay: opt.delay || 0, onDone: opt.onDone, done: false };
    this.list.push(tw); return tw;
  },
  update(dt) {
    for (const tw of this.list) {
      if (tw.delay > 0) { tw.delay -= dt; continue; }
      tw.t += dt;
      const k = tw.ease(clamp(tw.t / tw.dur, 0, 1));
      for (const p in tw.to) tw.obj[p] = lerp(tw.from[p], tw.to[p], k);
      if (tw.t >= tw.dur) { tw.done = true; if (tw.onDone) tw.onDone(); }
    }
    this.list = this.list.filter(t => !t.done);
  },
  clear() { this.list.length = 0; }
};

// ------------------------------------------------------------------ camera
class Camera {
  constructor() { this.x = 0; this.y = 0; this.tx = 0; this.ty = 0; this.zoom = 1; this.tzoom = 1; this.rot = 0; this.shakeT = 0; this.shakeMag = 0; this.ox = 0; this.oy = 0; this.follow = null; this.bounds = null; this.lead = 0; this.zoomRate = 6; this.rate = 8; }
  setBounds(x, y, w, h) { this.bounds = { x, y, w, h }; }
  lookAt(x, y, instant) { this.tx = x; this.ty = y; if (instant) { this.x = x; this.y = y; } }
  zoomTo(z, instant) { this.tzoom = z; if (instant) this.zoom = z; }
  shake(mag, t = 0.3) { this.shakeMag = Math.max(this.shakeMag, mag); this.shakeT = Math.max(this.shakeT, t); this.shakeDur = this.shakeT; }
  update(dt) {
    if (this.follow) { this.tx = this.follow.x + (this.follow.vx || 0) * this.lead; this.ty = this.follow.y + (this.follow.vy || 0) * this.lead; }
    this.x = damp(this.x, this.tx, this.rate, dt);
    this.y = damp(this.y, this.ty, this.rate, dt);
    this.zoom = damp(this.zoom, this.tzoom, this.zoomRate, dt);
    if (this.bounds) {
      const hw = W / (2 * this.zoom), hh = H / (2 * this.zoom);
      const b = this.bounds;
      if (b.w >= hw * 2) this.x = clamp(this.x, b.x + hw, b.x + b.w - hw); else this.x = b.x + b.w / 2;
      if (b.h >= hh * 2) this.y = clamp(this.y, b.y + hh, b.y + b.h - hh); else this.y = b.y + b.h / 2;
    }
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const k = clamp(this.shakeT / (this.shakeDur || 0.3), 0, 1), m = this.shakeMag * k * k;
      this.ox = rnd(-m, m); this.oy = rnd(-m, m);
      if (this.shakeT <= 0) { this.shakeMag = 0; this.ox = this.oy = 0; }
    }
  }
  // apply to a context: world space -> screen
  apply(ctx) {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(this.zoom, this.zoom);
    if (this.rot) ctx.rotate(this.rot);
    ctx.translate(-Math.round(this.x) + Math.round(this.ox), -Math.round(this.y) + Math.round(this.oy));
  }
  restore(ctx) { ctx.restore(); }
  toScreen(wx, wy) { return { x: (wx - this.x + this.ox) * this.zoom + W / 2, y: (wy - this.y + this.oy) * this.zoom + H / 2 }; }
  toWorld(sx, sy) { return { x: (sx - W / 2) / this.zoom + this.x - this.ox, y: (sy - H / 2) / this.zoom + this.y - this.oy }; }
  visible(x, y, pad = 64) { const hw = W / (2 * this.zoom) + pad, hh = H / (2 * this.zoom) + pad; return Math.abs(x - this.x) < hw && Math.abs(y - this.y) < hh; }
}

// ------------------------------------------------------------------ juice
const Juice = {
  shakeX: 0, shakeY: 0, _mag: 0, _t: 0, _dur: 0,
  flashes: [], hitstop: 0, vignette: 0, chroma: 0, zoomPunch: 0, bars: 0, barsTarget: 0,
  shake(mag, t = 0.25) { this._mag = Math.max(this._mag, mag); this._t = Math.max(this._t, t); this._dur = Math.max(this._dur, t); },
  flash(color = '#fff', a = 0.5, decay = 3) { this.flashes.push({ color, a, decay }); },
  stop(t = 0.06) { this.hitstop = Math.max(this.hitstop, t); },
  punch(amount = 0.06) { this.zoomPunch = Math.max(this.zoomPunch, amount); },
  letterbox(on) { this.barsTarget = on ? 56 : 0; },
  update(dt) {
    if (this._t > 0) {
      this._t -= dt; const k = clamp(this._t / (this._dur || 0.25), 0, 1); const m = this._mag * k * k;
      this.shakeX = rnd(-m, m); this.shakeY = rnd(-m, m);
      if (this._t <= 0) { this._mag = 0; this.shakeX = this.shakeY = 0; }
    }
    for (const f of this.flashes) f.a -= dt * f.decay;
    this.flashes = this.flashes.filter(f => f.a > 0);
    this.zoomPunch = damp(this.zoomPunch, 0, 9, dt);
    this.chroma = damp(this.chroma, 0, 7, dt);
    this.bars = damp(this.bars, this.barsTarget, 7, dt);
  },
  drawOverlay(ctx) {
    for (const f of this.flashes) { ctx.globalAlpha = clamp(f.a, 0, 1); ctx.fillStyle = f.color; ctx.fillRect(0, 0, W, H); }
    ctx.globalAlpha = 1;
    if (this.bars > 0.5) {
      ctx.fillStyle = '#080510';
      ctx.fillRect(0, 0, W, this.bars); ctx.fillRect(0, H - this.bars, W, this.bars);
    }
  },
  reset() { this.flashes.length = 0; this.hitstop = 0; this.bars = 0; this.barsTarget = 0; this._t = 0; this._mag = 0; this.shakeX = this.shakeY = 0; }
};

// ------------------------------------------------------------------ particles
const Particles = {
  list: [], max: 900,
  spawn(x, y, o = {}) {
    const n = o.n || 1;
    for (let i = 0; i < n; i++) {
      if (this.list.length >= this.max) break;
      const ang = o.angle !== undefined ? o.angle + rnd(-(o.spread ?? 0.6), o.spread ?? 0.6) : rnd(0, Math.PI * 2);
      const sp = rnd(o.speedMin ?? (o.speed || 80) * 0.35, o.speed || 80);
      this.list.push({
        x: x + rnd(-(o.jitter || 0), o.jitter || 0), y: y + rnd(-(o.jitter || 0), o.jitter || 0),
        vx: Math.cos(ang) * sp + (o.vx || 0), vy: Math.sin(ang) * sp + (o.vy || 0),
        life: rnd(o.lifeMin ?? (o.life || 0.6) * 0.6, o.life || 0.6), t: 0,
        size: o.size || 3, sizeEnd: o.sizeEnd,
        color: Array.isArray(o.color) ? pick(o.color) : (o.color || '#fff'),
        colors: Array.isArray(o.color) ? o.color : null,
        gravity: o.gravity ?? 200, drag: o.drag ?? 0.985,
        shape: o.shape || 'square', rot: rnd(0, 6.28), spin: rnd(-8, 8),
        world: o.world !== false, fade: o.fade !== false, glow: o.glow, bounceY: o.bounceY,
        trail: o.trail,
      });
    }
  },
  // preset bursts -----------------------------------------------------------
  dust(x, y, n = 8) { this.spawn(x, y, { n, color: ['#9391a6', '#bdbccd', '#7a6d8a'], speed: 70, angle: -Math.PI / 2, spread: 1.5, gravity: 40, life: 0.5, size: 3, sizeEnd: 0 }); },
  impact(x, y, col = ['#ffffff', '#ffe08a', '#ffa832'], n = 16) { this.spawn(x, y, { n, color: col, speed: 320, life: 0.32, size: 4, sizeEnd: 0, gravity: 260, shape: 'streak' }); },
  fire(x, y, n = 3) { this.spawn(x, y, { n, color: ['#ffa832', '#e06a1b', '#ffe08a', '#9c3510'], speed: 46, angle: -Math.PI / 2, spread: 0.7, gravity: -110, life: 0.65, size: 5, sizeEnd: 0, drag: 0.94 }); },
  sparkle(x, y, n = 6, col) { this.spawn(x, y, { n, color: col || ['#ffe98a', '#ffffff', '#86e8d2'], speed: 90, gravity: -30, life: 0.7, size: 3, shape: 'star', sizeEnd: 0 }); },
  confetti(x, y, n = 30) { this.spawn(x, y, { n, color: ['#e06a9b', '#6aa9ee', '#a8e878', '#ffe08a', '#ffffff', '#b177e6'], speed: 340, spread: 3.14, life: 1.6, size: 5, gravity: 420, shape: 'confetti', drag: 0.97 }); },
  notes(x, y, n = 4) { this.spawn(x, y, { n, color: ['#ffe08a', '#e06a9b', '#86e8d2', '#ffffff'], speed: 60, angle: -Math.PI / 2, spread: 0.8, gravity: -50, life: 1.1, size: 8, shape: 'note' }); },
  blood(x, y, col = ['#c2333c', '#7d1d2b'], n = 12) { this.spawn(x, y, { n, color: col, speed: 220, life: 0.6, size: 4, gravity: 600, shape: 'square' }); },
  splash(x, y, n = 14) { this.spawn(x, y, { n, color: ['#6aa9ee', '#a8d8ff', '#ffffff'], speed: 220, angle: -Math.PI / 2, spread: 1.2, life: 0.6, size: 4, gravity: 520, shape: 'drop' }); },
  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.t += dt; if (p.t >= p.life) { L.splice(i, 1); continue; }
      p.vy += p.gravity * dt; p.vx *= p.drag; p.vy *= p.drag;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
      if (p.bounceY !== undefined && p.y > p.bounceY && p.vy > 0) { p.y = p.bounceY; p.vy *= -0.42; p.vx *= 0.7; }
    }
  },
  draw(ctx, world) {
    for (const p of this.list) {
      if (!!p.world !== !!world) continue;
      const k = 1 - p.t / p.life;
      ctx.globalAlpha = p.fade ? clamp(k * 1.4, 0, 1) : 1;
      ctx.fillStyle = p.color;
      const s = Math.max(1, Math.round(lerp(p.sizeEnd !== undefined ? p.sizeEnd : p.size, p.size, k)));
      const x = Math.round(p.x), y = Math.round(p.y);
      switch (p.shape) {
        case 'streak': {
          const len = Math.min(26, Math.hypot(p.vx, p.vy) * 0.045);
          const a = Math.atan2(p.vy, p.vx);
          ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillRect(-len, -s / 2, len + s, s); ctx.restore(); break;
        }
        case 'star': {
          ctx.fillRect(x - s, y, s * 2 + 1, 1); ctx.fillRect(x, y - s, 1, s * 2 + 1);
          ctx.fillRect(x - 1, y - 1, 3, 3); break;
        }
        case 'confetti': {
          ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot); ctx.fillRect(-s, -s / 2, s * 2, Math.max(1, s)); ctx.restore(); break;
        }
        case 'note': {
          ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(p.t * 6) * 0.25);
          ctx.fillRect(-s / 2, -s / 4, s * 0.7, s * 0.6); ctx.fillRect(s * 0.1, -s, 2, s * 0.9); ctx.fillRect(s * 0.1, -s, s * 0.45, 2);
          ctx.restore(); break;
        }
        case 'drop': ctx.fillRect(x, y - s, Math.max(1, s / 2), s * 1.6); break;
        case 'ring': { ctx.globalAlpha *= 0.8; ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, (1 - k) * p.size * 6 + 2, 0, 6.29); ctx.stroke(); break; }
        default: ctx.fillRect(x - (s >> 1), y - (s >> 1), s, s);
      }
    }
    ctx.globalAlpha = 1;
  },
  clear() { this.list.length = 0; }
};

// ------------------------------------------------------------------ popups
const Popups = {
  list: [],
  add(x, y, text, color = '#fff', o = {}) {
    this.list.push({
      x, y, text, color, t: 0, life: o.life || 0.95, scale: o.scale || 1, pop: o.pop !== false,
      vy: o.vy ?? -70, vx: o.vx || 0, gravity: o.gravity ?? 110, outline: o.outline !== false,
      world: o.world !== false, shake: o.shake || 0, font: o.font,
    });
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i]; p.t += dt;
      if (p.t >= p.life) { this.list.splice(i, 1); continue; }
      p.vy += p.gravity * dt; p.y += p.vy * dt; p.x += p.vx * dt;
    }
  },
  draw(world) {
    for (const p of this.list) {
      if (!!p.world !== !!world) continue;
      const k = p.t / p.life;
      const a = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
      let sc = p.scale;
      if (p.pop) sc *= k < 0.14 ? Ease.outBack(k / 0.14) : 1;
      const sx = p.shake ? rnd(-p.shake, p.shake) : 0;
      Gfx.ctx.globalAlpha = a;
      Gfx.text(p.text, Math.round(p.x + sx), Math.round(p.y), { color: p.color, scale: sc, align: 'center', outline: p.outline ? '#120c16' : null, font: p.font, bold: true });
      Gfx.ctx.globalAlpha = 1;
    }
  },
  clear() { this.list.length = 0; }
};

// ------------------------------------------------------------------ misc
const Bus = { h: {}, on(e, f) { (this.h[e] = this.h[e] || []).push(f); }, emit(e, ...a) { (this.h[e] || []).forEach(f => f(...a)); }, clear() { this.h = {}; } };
