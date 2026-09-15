// ---------------------------------------------------------------------------
// util.js - math helpers, seeded RNG, coroutines, particles, floating text
// ---------------------------------------------------------------------------
'use strict';

const W = 640, H = 360;

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;
const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const sign = v => v < 0 ? -1 : v > 0 ? 1 : 0;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const inRect = (px, py, x, y, w, h) => px >= x && py >= y && px < x + w && py < y + h;
const padNum = (n, w) => String(n).padStart(w, '0');
const deepClone = o => JSON.parse(JSON.stringify(o));

// Seeded RNG (mulberry32)
class RNG {
  constructor(seed) { this.s = (seed >>> 0) || 0x9e3779b9; }
  next() {
    let t = (this.s += 0x6D2B79F5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  float(a = 0, b = 1) { return a + (b - a) * this.next(); }
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); } // inclusive
  chance(p) { return this.next() < p; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  weighted(items) { // [{w, v}]
    let total = 0; for (const it of items) total += it.w;
    let r = this.next() * total;
    for (const it of items) { r -= it.w; if (r <= 0) return it.v; }
    return items[items.length - 1].v;
  }
}
const rng = new RNG((Date.now() ^ 0x5bd1e995) >>> 0); // general purpose, unseeded
const rnd = (a = 0, b = 1) => rng.float(a, b);
const rndInt = (a, b) => rng.int(a, b);
const pick = arr => rng.pick(arr);
const shuffle = arr => rng.shuffle(arr);
const chance = p => rng.chance(p);

// ---------------------------------------------------------------------------
// Coroutines: generator based sequencing. yield <seconds> waits, yield <fn>
// waits until fn() is truthy, yield <handle> waits for another coroutine.
// ---------------------------------------------------------------------------
const Co = {
  list: [],
  run(gen, ctx) {
    const it = typeof gen === 'function' ? gen.call(ctx) : gen;
    const h = { it, wait: 0, cond: null, done: false, child: null };
    Co.list.push(h);
    Co.step(h, 0);
    return h;
  },
  step(h, dt) {
    if (h.done) return;
    if (h.wait > 0) { h.wait -= dt; if (h.wait > 0) return; }
    if (h.cond) { if (!h.cond()) return; h.cond = null; }
    if (h.child) { if (!h.child.done) return; h.child = null; }
    let guard = 0;
    while (guard++ < 1000) {
      let r;
      try { r = h.it.next(); } catch (e) { console.error('coroutine error', e); h.done = true; return; }
      if (r.done) { h.done = true; return; }
      const v = r.value;
      if (typeof v === 'number') { if (v > 0) { h.wait = v; return; } continue; }
      if (typeof v === 'function') { if (v()) continue; h.cond = v; return; }
      if (v && typeof v === 'object' && 'done' in v) { if (v.done) continue; h.child = v; return; }
      return; // yield undefined => wait one frame
    }
  },
  update(dt) {
    for (let i = 0; i < Co.list.length; i++) Co.step(Co.list[i], dt);
    Co.list = Co.list.filter(h => !h.done);
  },
  clear() { Co.list.length = 0; },
  stop(h) { if (h) { h.done = true; } }
};

// ---------------------------------------------------------------------------
// Particles
// ---------------------------------------------------------------------------
const Particles = {
  list: [],
  spawn(x, y, opt = {}) {
    const n = opt.n || 1;
    for (let i = 0; i < n; i++) {
      const ang = opt.angle !== undefined ? opt.angle + rnd(-(opt.spread || 0.5), opt.spread || 0.5) : rnd(0, Math.PI * 2);
      const sp = rnd(opt.speedMin !== undefined ? opt.speedMin : 20, opt.speed || 80);
      this.list.push({
        x: x + rnd(-(opt.jitter || 0), opt.jitter || 0), y: y + rnd(-(opt.jitter || 0), opt.jitter || 0),
        vx: Math.cos(ang) * sp + (opt.vx || 0), vy: Math.sin(ang) * sp + (opt.vy || 0),
        life: rnd(opt.lifeMin || 0.3, opt.life || 0.7), t: 0,
        size: opt.size || 2, color: Array.isArray(opt.color) ? pick(opt.color) : (opt.color || '#fff'),
        gravity: opt.gravity !== undefined ? opt.gravity : 120, drag: opt.drag || 0.98,
        shape: opt.shape || 'square', glow: opt.glow || false
      });
    }
  },
  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.t += dt; if (p.t >= p.life) { L.splice(i, 1); continue; }
      p.vy += p.gravity * dt; p.vx *= p.drag; p.vy *= p.drag;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  },
  draw(ctx) {
    for (const p of this.list) {
      const k = 1 - p.t / p.life;
      ctx.globalAlpha = k;
      ctx.fillStyle = p.color;
      const s = Math.max(1, Math.round(p.size * (0.5 + 0.5 * k)));
      if (p.shape === 'note') {
        ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
        ctx.fillRect(Math.round(p.x) + s - 1, Math.round(p.y) - s * 2, 1, s * 2);
      } else {
        ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
      }
    }
    ctx.globalAlpha = 1;
  },
  clear() { this.list.length = 0; }
};

// ---------------------------------------------------------------------------
// Floating text popups (damage numbers, judgements)
// ---------------------------------------------------------------------------
const Popups = {
  list: [],
  add(x, y, text, color = '#fff', opt = {}) {
    this.list.push({ x, y, text, color, t: 0, life: opt.life || 0.9, scale: opt.scale || 1, vy: opt.vy !== undefined ? opt.vy : -38, vx: opt.vx || 0, outline: opt.outline !== undefined ? opt.outline : true, shadow: opt.shadow });
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i]; p.t += dt;
      if (p.t >= p.life) { this.list.splice(i, 1); continue; }
      p.y += p.vy * dt; p.x += p.vx * dt; p.vy *= 0.94;
    }
  },
  draw() {
    for (const p of this.list) {
      const k = p.t / p.life;
      const a = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      const sc = p.scale * (k < 0.12 ? 1 + (0.12 - k) * 4 : 1);
      Gfx.ctx.globalAlpha = a;
      Gfx.text(p.text, Math.round(p.x), Math.round(p.y), { color: p.color, scale: sc, align: 'center', outline: p.outline ? '#16101c' : null });
      Gfx.ctx.globalAlpha = 1;
    }
  },
  clear() { this.list.length = 0; }
};

// Screen shake
const Shake = {
  t: 0, mag: 0, x: 0, y: 0,
  add(mag, t = 0.25) { this.mag = Math.max(this.mag, mag); this.t = Math.max(this.t, t); },
  update(dt) {
    if (this.t > 0) { this.t -= dt; const m = this.mag * clamp(this.t / 0.25, 0, 1); this.x = rnd(-m, m); this.y = rnd(-m, m); if (this.t <= 0) { this.mag = 0; this.x = this.y = 0; } }
  }
};

// Timers / flashes
const Flash = { color: null, a: 0, decay: 3,
  add(color, a = 0.5, decay = 3) { this.color = color; this.a = a; this.decay = decay; },
  update(dt) { if (this.a > 0) this.a = Math.max(0, this.a - dt * this.decay); },
  draw(ctx) { if (this.a > 0 && this.color) { ctx.globalAlpha = this.a; ctx.fillStyle = this.color; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; } }
};

// Simple event bus
const Bus = { h: {}, on(e, f) { (this.h[e] = this.h[e] || []).push(f); }, emit(e, ...a) { (this.h[e] || []).forEach(f => f(...a)); } };

// Roman numerals for acts
const roman = n => ['', 'I', 'II', 'III', 'IV', 'V'][n] || String(n);
