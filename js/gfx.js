// ---------------------------------------------------------------------------
// gfx.js - canvas, palette, sprite compiler, drawing primitives, UI, input
// ---------------------------------------------------------------------------
'use strict';

// Global pixel palette: one character per color used in sprite strings
const PAL = {
  '.': null,
  '0': '#16101c', '1': '#3a2c3f', '2': '#6b5a6e', '3': '#a89aa8', '4': '#ece6dc', 'w': '#ffffff',
  's': '#f0b088', 'S': '#c47a55', 'q': '#ffd6b0',
  'h': '#4a2a1a', 'H': '#7a4a2a',
  't': '#d9a066', 'T': '#a06a3a', 'b': '#8a5a2b', 'B': '#5a3a1b',
  'g': '#5cb84a', 'G': '#2f7a30', 'l': '#a3e04a',
  'y': '#f6d743', 'o': '#f28c28', 'O': '#c25a1c', 'x': '#ff5c00',
  'e': '#d83a3a', 'E': '#8e1f2b',
  'k': '#f5a3c7', 'K': '#c95c93',
  'p': '#8b5cf6', 'P': '#4b2a8a',
  'u': '#3b82f6', 'U': '#1e3a8a', 'c': '#5ee0f0',
  'n': '#f5eed3', 'N': '#c9bc90',
  'r': '#8f8f9a', 'R': '#55555f',
  'm': '#2aa198', 'M': '#1a6b66',
  'd': '#7a8f3a', 'D': '#4a5c22',
  'v': '#c9a15a', 'V': '#8a6a33',
  'a': '#e6c35c', 'A': '#b08a2a',
  'i': '#5a6b8a', 'j': '#334a5a',
  'z': '#c4b8f0', 'Z': '#8b7fb8',
  'f': '#ffb347', 'F': '#e0791b',
};

const Gfx = {
  canvas: null, ctx: null,
  spriteCache: new Map(), tintCache: new Map(),
  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
  },
  // --- sprites -------------------------------------------------------------
  compile(name) {
    let def = SPRITES[name];
    if (!def) { console.warn('missing sprite', name); def = ['e']; }
    const frames = Array.isArray(def) ? [def] : def.frames;
    const pal = Object.assign({}, PAL, (def.pal || {}));
    const w = Math.max(...frames[0].map(r => r.length)), h = frames[0].length;
    const out = { w, h, frames: [] };
    for (const rows of frames) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d');
      for (let y = 0; y < rows.length; y++) {
        const row = rows[y];
        for (let x = 0; x < row.length; x++) {
          const col = pal[row[x]];
          if (col === undefined) { if (row[x] !== '.') console.warn('sprite', name, 'unknown color', row[x]); continue; }
          if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
        }
      }
      out.frames.push(c);
    }
    this.spriteCache.set(name, out);
    return out;
  },
  spr(name) { return this.spriteCache.get(name) || this.compile(name); },
  spriteSize(name) { const s = this.spr(name); return { w: s.w, h: s.h }; },
  tinted(name, frame, color) {
    const key = name + '|' + frame + '|' + color;
    let c = this.tintCache.get(key);
    if (c) return c;
    const s = this.spr(name); frame = Math.floor(frame) % s.frames.length; if (frame < 0) frame += s.frames.length; const src = s.frames[frame];
    c = document.createElement('canvas'); c.width = s.w; c.height = s.h;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = color; g.fillRect(0, 0, s.w, s.h);
    this.tintCache.set(key, c);
    return c;
  },
  // draw sprite: anchor 'bl' (bottom-left), 'bc' (bottom-center), 'c' (center), 'tl'
  sprite(name, x, y, o = {}) {
    const s = this.spr(name);
    const scale = o.scale || 1; let frame = Math.floor(o.frame || 0) % s.frames.length; if (frame < 0) frame += s.frames.length;
    const w = s.w * scale, h = s.h * scale;
    let dx = x, dy = y;
    const anchor = o.anchor || 'tl';
    if (anchor === 'bl') dy = y - h;
    else if (anchor === 'bc') { dx = x - w / 2; dy = y - h; }
    else if (anchor === 'c') { dx = x - w / 2; dy = y - h / 2; }
    else if (anchor === 'tc') { dx = x - w / 2; }
    dx = Math.round(dx); dy = Math.round(dy);
    const ctx = this.ctx;
    const img = o.tint ? this.tinted(name, frame, o.tint) : s.frames[frame];
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    if (o.flip || o.rot || o.sx || o.sy) {
      ctx.save();
      ctx.translate(dx + w / 2, dy + h / 2);
      if (o.rot) ctx.rotate(o.rot);
      ctx.scale((o.flip ? -1 : 1) * (o.sx || 1), (o.sy || 1));
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(img, dx, dy, w, h);
    }
    if (o.alpha !== undefined) ctx.globalAlpha = 1;
    return { x: dx, y: dy, w, h };
  },
  // --- primitives ----------------------------------------------------------
  clear(color = '#0b0710') { this.ctx.fillStyle = color; this.ctx.fillRect(0, 0, W, H); },
  rect(x, y, w, h, color) { this.ctx.fillStyle = color; this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); },
  rectA(x, y, w, h, color, a) { this.ctx.globalAlpha = a; this.rect(x, y, w, h, color); this.ctx.globalAlpha = 1; },
  outline(x, y, w, h, color) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, 1); this.ctx.fillRect(x, y + h - 1, w, 1);
    this.ctx.fillRect(x, y, 1, h); this.ctx.fillRect(x + w - 1, y, 1, h);
  },
  // Stone-age styled panel: dark fill, light border, notched corners
  panel(x, y, w, h, o = {}) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const fill = o.fill || '#2a2030', border = o.border || '#a89aa8', dark = o.dark || '#16101c';
    if (o.shadow !== false) this.rectA(x + 2, y + 3, w, h, '#000', 0.35);
    this.rect(x + 1, y, w - 2, h, dark); this.rect(x, y + 1, w, h - 2, dark);
    this.rect(x + 2, y + 1, w - 4, h - 2, fill); this.rect(x + 1, y + 2, w - 2, h - 4, fill);
    // border highlight
    this.ctx.fillStyle = border;
    this.ctx.fillRect(x + 2, y + 1, w - 4, 1); this.ctx.fillRect(x + 1, y + 2, 1, h - 4);
    this.ctx.fillStyle = o.borderDark || '#55555f';
    this.ctx.fillRect(x + 2, y + h - 2, w - 4, 1); this.ctx.fillRect(x + w - 2, y + 2, 1, h - 4);
    if (o.title) {
      const tw = Font.width(o.title, 1) + 10;
      this.rect(x + (w - tw) / 2, y - 5, tw, 11, dark);
      this.text(o.title, x + w / 2, y - 3, { color: o.titleColor || '#f6d743', align: 'center' });
    }
  },
  bar(x, y, w, h, frac, fg, bg = '#16101c', border = '#16101c') {
    frac = clamp(frac, 0, 1);
    this.rect(x, y, w, h, border);
    this.rect(x + 1, y + 1, w - 2, h - 2, bg);
    const fw = Math.round((w - 2) * frac);
    if (fw > 0) { this.rect(x + 1, y + 1, fw, h - 2, fg); this.rectA(x + 1, y + 1, fw, 1, '#fff', 0.35); }
  },
  circle(x, y, r, color) { const c = this.ctx; c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); },
  line(x1, y1, x2, y2, color, wd = 1) { const c = this.ctx; c.strokeStyle = color; c.lineWidth = wd; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); },
  // vertical banded gradient (pixel-art friendly)
  bands(x, y, w, h, colors) {
    const n = colors.length; const bh = h / n;
    for (let i = 0; i < n; i++) this.rect(x, y + i * bh, w, Math.ceil(bh), colors[i]);
  },
  // --- text ----------------------------------------------------------------
  measure(str, scale = 1) { return Font.width(str, scale); },
  text(str, x, y, o = {}) {
    str = String(str);
    const scale = o.scale || 1, color = o.color || '#ece6dc';
    const w = Font.width(str, scale);
    if (o.align === 'center') x -= w / 2; else if (o.align === 'right') x -= w;
    x = Math.round(x); y = Math.round(y);
    if (o.shadow) Font.draw(this.ctx, str, x + scale, y + scale, o.shadow === true ? '#16101c' : o.shadow, scale);
    if (o.outline) {
      const oc = o.outline === true ? '#16101c' : o.outline;
      Font.draw(this.ctx, str, x - 1, y, oc, scale); Font.draw(this.ctx, str, x + 1, y, oc, scale);
      Font.draw(this.ctx, str, x, y - 1, oc, scale); Font.draw(this.ctx, str, x, y + 1, oc, scale);
    }
    Font.draw(this.ctx, str, x, y, color, scale);
    return w;
  },
  // word-wrapped text; supports inline color tags like {y}text{/} for yellow etc.
  wrapLines(str, maxW, scale = 1) {
    const words = String(str).split(' '); const lines = []; let cur = '';
    const plain = s => s.replace(/\{[^}]*\}/g, '');
    for (const w of words) {
      if (w.includes('\n')) {
        const parts = w.split('\n');
        for (let i = 0; i < parts.length; i++) {
          const test = cur ? cur + ' ' + parts[i] : parts[i];
          if (i === 0 && Font.width(plain(test), scale) <= maxW) cur = test; else { if (cur) lines.push(cur); cur = parts[i]; }
          if (i < parts.length - 1) { lines.push(cur); cur = ''; }
        }
        continue;
      }
      const test = cur ? cur + ' ' + w : w;
      if (Font.width(plain(test), scale) <= maxW) cur = test; else { if (cur) lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines;
  },
  textWrap(str, x, y, maxW, o = {}) {
    const scale = o.scale || 1, lh = o.lineHeight || Font.lh * scale;
    const lines = this.wrapLines(str, maxW, scale);
    for (let i = 0; i < lines.length; i++) this.richText(lines[i], x, y + i * lh, Object.assign({}, o, { maxW }));
    return lines.length;
  },
  // text with color tags: {y}...{/}  y=yellow g=green r=red c=cyan o=orange w=white p=pink b=blue
  richText(str, x, y, o = {}) {
    const scale = o.scale || 1;
    const colors = { y: '#f6d743', g: '#a3e04a', r: '#ff6b6b', c: '#5ee0f0', o: '#f28c28', w: '#ffffff', p: '#f5a3c7', b: '#7fb0ff', d: '#a89aa8', '/': null };
    const segs = []; let re = /\{([^}]*)\}/g; let last = 0, m, col = o.color || '#ece6dc';
    const base = col;
    while ((m = re.exec(str))) {
      if (m.index > last) segs.push({ t: str.slice(last, m.index), c: col });
      col = colors[m[1]] === undefined ? base : (colors[m[1]] || base);
      last = re.lastIndex;
    }
    if (last < str.length) segs.push({ t: str.slice(last), c: col });
    const total = segs.reduce((a, s) => a + Font.width(s.t, scale) + scale, 0) - scale;
    if (o.align === 'center') x -= total / 2; else if (o.align === 'right') x -= total;
    let cx = x;
    for (const s of segs) {
      this.text(s.t, cx, y, { color: s.c, scale, outline: o.outline, shadow: o.shadow });
      cx += Font.width(s.t, scale) + scale;
    }
    return total;
  },
};

// ---------------------------------------------------------------------------
// Input: mouse in canvas coords, click queue, key queue with audio timestamps
// ---------------------------------------------------------------------------
const Input = {
  mx: -1, my: -1, down: false, clicks: [], keys: [], held: {}, wheel: 0,
  touch: false,          // true once any touch is seen: switches the game to touch UI
  touches: new Map(),    // identifier -> {x, y} for every finger currently down
  dragDX: 0, dragDY: 0,  // movement of the primary finger this frame (for scrolling)
  releases: [],          // touch/mouse releases this frame (used to release held frets)
  audioNow() { return (typeof AudioSys !== 'undefined' && AudioSys.ctx) ? AudioSys.ctx.currentTime : 0; },
  init(canvas) {
    this.canvas = canvas;
    const pt = (clientX, clientY) => {
      const r = canvas.getBoundingClientRect();
      return { x: (clientX - r.left) * W / r.width, y: (clientY - r.top) * H / r.height };
    };
    canvas.addEventListener('mousemove', e => { if (this.touch) return; const p = pt(e.clientX, e.clientY); this.mx = p.x; this.my = p.y; });
    canvas.addEventListener('mousedown', e => {
      if (this.touch) return;
      const p = pt(e.clientX, e.clientY); this.mx = p.x; this.my = p.y; this.down = true;
      this.clicks.push({ x: p.x, y: p.y, button: e.button, t: performance.now(), at: this.audioNow(), id: 'mouse' });
      e.preventDefault();
    });
    canvas.addEventListener('mouseup', () => { if (this.touch) return; this.down = false; this.releases.push('mouse'); });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('wheel', e => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    // --- multi-touch: every finger is its own press, so chords and fast alternating taps work
    canvas.addEventListener('touchstart', e => {
      this.touch = true; this.down = true;
      const at = this.audioNow(), t = performance.now();
      for (const T of e.changedTouches) {
        const p = pt(T.clientX, T.clientY);
        this.touches.set(T.identifier, p);
        this.mx = p.x; this.my = p.y;
        this.clicks.push({ x: p.x, y: p.y, button: 0, t, at, touch: true, id: T.identifier });
      }
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      for (const T of e.changedTouches) {
        const p = pt(T.clientX, T.clientY), prev = this.touches.get(T.identifier);
        if (prev && T.identifier === this.touches.keys().next().value) { this.dragDX += p.x - prev.x; this.dragDY += p.y - prev.y; }
        this.touches.set(T.identifier, p); this.mx = p.x; this.my = p.y;
      }
      e.preventDefault();
    }, { passive: false });
    const endTouch = e => {
      for (const T of e.changedTouches) { this.touches.delete(T.identifier); this.releases.push(T.identifier); }
      if (!this.touches.size) { this.down = false; this.mx = -9999; this.my = -9999; }
      e.preventDefault();
    };
    canvas.addEventListener('touchend', endTouch, { passive: false });
    canvas.addEventListener('touchcancel', endTouch, { passive: false });
    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      this.held[e.code] = true;
      this.keys.push({ code: e.code, key: e.key, t: performance.now(), at: this.audioNow() });
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => { this.held[e.code] = false; });
    window.addEventListener('blur', () => { this.held = {}; this.down = false; this.touches.clear(); });
  },
  flush() { this.clicks.length = 0; this.keys.length = 0; this.wheel = 0; this.releases.length = 0; this.dragDX = 0; this.dragDY = 0; }
};

// ---------------------------------------------------------------------------
// Immediate-mode UI: buttons registered while drawing, resolved on click
// ---------------------------------------------------------------------------
const UI = {
  items: [], tips: [], hoverAny: false, locked: false,
  begin() { this.items.length = 0; this.tips.length = 0; this.hoverAny = false; },
  hovered(x, y, w, h) { return inRect(Input.mx, Input.my, x, y, w, h); },
  // invisible clickable region
  hit(x, y, w, h, cb, o = {}) {
    const hov = !this.locked && this.hovered(x, y, w, h);
    if (hov && !o.noCursor) this.hoverAny = true;
    this.items.push({ x, y, w, h, cb, disabled: o.disabled || this.locked, right: o.right });
    return hov;
  },
  button(x, y, w, h, label, cb, o = {}) {
    const hov = !this.locked && !o.disabled && this.hovered(x, y, w, h);
    if (hov) this.hoverAny = true;
    const fill = o.disabled ? '#3a2c3f' : hov ? (o.hover || '#7a4a2a') : (o.fill || '#5a3a1b');
    const border = o.disabled ? '#55555f' : hov ? '#f6d743' : (o.border || '#d9a066');
    const yy = hov && !o.disabled ? y - 1 : y;
    Gfx.rectA(x + 1, y + 2, w, h, '#000', 0.4);
    Gfx.rect(x, yy, w, h, '#16101c');
    Gfx.rect(x + 1, yy + 1, w - 2, h - 2, fill);
    Gfx.outline(x + 1, yy + 1, w - 2, h - 2, border);
    if (o.icon) Gfx.sprite(o.icon, x + 6, yy + h / 2, { anchor: 'c', scale: o.iconScale || 1 });
    const scale = o.scale || 1;
    Gfx.text(label, x + w / 2 + (o.icon ? 6 : 0), yy + (h - 7 * scale) / 2 + 1, { color: o.disabled ? '#8f8f9a' : (o.color || '#ece6dc'), align: 'center', scale, shadow: true });
    this.items.push({ x, y, w, h, cb, disabled: o.disabled || this.locked });
    return hov;
  },
  // small icon button
  iconButton(x, y, w, h, icon, cb, o = {}) {
    const hov = !this.locked && this.hovered(x, y, w, h);
    if (hov) this.hoverAny = true;
    Gfx.rect(x, y, w, h, '#16101c'); Gfx.rect(x + 1, y + 1, w - 2, h - 2, hov ? '#7a4a2a' : '#3a2c3f');
    Gfx.outline(x + 1, y + 1, w - 2, h - 2, hov ? '#f6d743' : '#a89aa8');
    Gfx.sprite(icon, x + w / 2, y + h / 2, { anchor: 'c', scale: o.scale || 1 });
    this.items.push({ x, y, w, h, cb, disabled: this.locked });
    if (hov && o.tip) this.tooltip(x, y + h + 2, o.tip);
    return hov;
  },
  tooltip(x, y, lines, o = {}) { this.tips.push({ x, y, lines: Array.isArray(lines) ? lines : [lines], o }); },
  drawTips() {
    for (const t of this.tips) {
      const scale = 1; const maxW = t.o.width || 150;
      const all = [];
      for (const l of t.lines) for (const w of Gfx.wrapLines(l, maxW - 10, scale)) all.push(w);
      const wdt = Math.min(maxW, Math.max(...all.map(l => Font.width(l.replace(/\{[^}]*\}/g, ''), scale))) + 10);
      const h = all.length * 9 + 8;
      let x = clamp(t.x, 2, W - wdt - 2), y = t.y; if (y + h > H - 2) y = t.y - h - 12; y = clamp(y, 2, H - h - 2);
      Gfx.panel(x, y, wdt, h, { fill: '#1d1626', border: '#f6d743' });
      for (let i = 0; i < all.length; i++) Gfx.richText(all[i], x + 5, y + 4 + i * 9, { color: i === 0 && t.o.titleColor !== false ? '#f6d743' : '#ece6dc' });
    }
  },
  click(x, y, button = 0) {
    if (this.locked) return false;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (inRect(x, y, it.x, it.y, it.w, it.h)) {
        if (it.disabled) return true;
        if (button === 2 && !it.right) continue;
        if (button !== 2 && it.right) continue;
        if (it.cb) it.cb();
        return true;
      }
    }
    return false;
  }
};
