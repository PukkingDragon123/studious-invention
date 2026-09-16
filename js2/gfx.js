// ---------------------------------------------------------------------------
// gfx.js - palette, sprite compiler (+ outline/shadow style pass), drawing,
//          speech bubbles, text, input (mouse + multi-touch), immediate UI
// ---------------------------------------------------------------------------
'use strict';

// 50-colour palette in ramps. One character per pixel in sprite data.
const PAL = {
  '.': null,
  // neutrals
  '0': '#120c16', '1': '#241c2e', '2': '#3b3048', '3': '#574a66', '4': '#7a6d8a', '5': '#a79bb4', '6': '#d6cfe0', '7': '#ffffff',
  // skin
  'a': '#6b3520', 'b': '#a05a30', 'c': '#d2874f', 'd': '#f0b985', 'e': '#ffdcb8',
  // hair / dark brown
  'f': '#241109', 'g': '#4a2512', 'h': '#75401f', 'i': '#a3663a',
  // wood / leather
  'j': '#3a2415', 'k': '#5c3a20', 'l': '#85562f', 'm': '#b07a45', 'n': '#d8a86b',
  // stone
  'o': '#2e2b38', 'p': '#4d4a5c', 'q': '#6e6b80', 'r': '#9391a6', 's': '#bdbccd',
  // green
  't': '#14331e', 'u': '#27632f', 'v': '#3f9a45', 'w': '#6cc95c', 'x': '#a8e878',
  // fire / orange
  'y': '#5c1607', 'z': '#9c3510', 'A': '#e06a1b', 'B': '#ffa832', 'C': '#ffe08a',
  // red
  'D': '#3f0e18', 'E': '#7d1d2b', 'F': '#c2333c', 'G': '#ef6a5e',
  // blue
  'H': '#101f3d', 'I': '#1d3d72', 'J': '#3570c0', 'K': '#6aa9ee', 'L': '#a8d8ff',
  // teal
  'M': '#0f3838', 'N': '#18706a', 'O': '#2cb3a2', 'P': '#86e8d2',
  // purple
  'Q': '#281040', 'R': '#4b2070', 'S': '#7c3eb2', 'T': '#b177e6',
  // pink
  'U': '#58203c', 'V': '#a03a68', 'W': '#e06a9b', 'X': '#ffb0cf',
  // gold
  'Y': '#6b4a10', 'Z': '#a8801f', '8': '#e0b93a', '9': '#ffe98a',
  // bone
  '!': '#8a7f68', '@': '#c4b89a', '#': '#e8dfc6', '$': '#fffaea',
};

const SPRITES = {};   // filled in by the art files

const Gfx = {
  canvas: null, ctx: null, spriteCache: new Map(), tintCache: new Map(), outlineCache: new Map(),
  font: 'main',
  init() {
    this.canvas = document.getElementById('game');
    this.canvas.width = W; this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
  },
  // ------------------------------------------------------------------ sprites
  compile(name) {
    let def = SPRITES[name];
    if (!def) {
      // placeholder so a missing sprite is obvious but never crashes the frame
      if (!this._warned) this._warned = {};
      if (!this._warned[name]) { console.warn('missing sprite', name); this._warned[name] = 1; }
      const rows = [];
      for (let y = 0; y < 16; y++) { let r = ''; for (let x = 0; x < 16; x++) r += ((x >> 2) + (y >> 2)) % 2 ? 'W' : '0'; rows.push(r); }
      def = rows;
    }
    const frames = Array.isArray(def) ? [def] : def.frames;
    const pal = def.pal ? Object.assign({}, PAL, def.pal) : PAL;
    const w = frames[0][0].length, h = frames[0].length;
    const out = { w, h, frames: [], def, anchorX: def.anchorX ?? w / 2, anchorY: def.anchorY ?? h };
    for (const rows of frames) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d');
      for (let y = 0; y < rows.length; y++) {
        const row = rows[y];
        for (let x = 0; x < row.length; x++) {
          const ch = row[x]; if (ch === '.') continue;
          const col = pal[ch];
          if (!col) { console.warn('sprite', name, 'unknown colour', ch); continue; }
          g.fillStyle = col; g.fillRect(x, y, 1, 1);
        }
      }
      out.frames.push(def.outline ? this.addOutline(c, def.outline === true ? '#120c16' : def.outline) : c);
    }
    if (def.outline) { out.w += 2; out.h += 2; out.anchorX += 1; out.anchorY += 1; }
    this.spriteCache.set(name, out);
    return out;
  },
  // grow a 1px dark border around every opaque pixel: the "sticker" look
  addOutline(src, color) {
    const w = src.width + 2, h = src.height + 2;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 1); g.drawImage(src, 2, 1); g.drawImage(src, 1, 0); g.drawImage(src, 1, 2);
    g.drawImage(src, 0, 0); g.drawImage(src, 2, 0); g.drawImage(src, 0, 2); g.drawImage(src, 2, 2);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over'; g.drawImage(src, 1, 1);
    return c;
  },
  spr(name) { return this.spriteCache.get(name) || this.compile(name); },
  size(name) { const s = this.spr(name); return { w: s.w, h: s.h }; },
  frames(name) { return this.spr(name).frames.length; },
  tinted(name, frame, color, amount) {
    const key = name + '|' + frame + '|' + color + '|' + (amount || 1);
    let c = this.tintCache.get(key); if (c) return c;
    const s = this.spr(name), src = s.frames[frame % s.frames.length];
    c = document.createElement('canvas'); c.width = s.w; c.height = s.h;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalAlpha = amount === undefined ? 1 : amount;
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = color; g.fillRect(0, 0, s.w, s.h);
    this.tintCache.set(key, c); return c;
  },
  /* draw a sprite.
     anchor: 'bc' bottom-centre (default for actors), 'c', 'tl', 'bl', 'tc'
     opts: scale, frame, flip, rot, alpha, tint, tintAmount, sx, sy (squash),
           shadow (ground ellipse), additive */
  sprite(name, x, y, o = {}) {
    const s = this.spr(name);
    const scale = o.scale ?? 1;
    let frame = Math.floor(o.frame || 0) % s.frames.length; if (frame < 0) frame += s.frames.length;
    const sx = (o.sx ?? 1), sy = (o.sy ?? 1);
    const w = s.w * scale, h = s.h * scale;
    const anchor = o.anchor || 'bc';
    let dx = x, dy = y;
    if (anchor === 'bc') { dx = x - w / 2; dy = y - h; }
    else if (anchor === 'bl') { dy = y - h; }
    else if (anchor === 'c') { dx = x - w / 2; dy = y - h / 2; }
    else if (anchor === 'tc') { dx = x - w / 2; }
    const ctx = this.ctx;
    const img = o.tint ? this.tinted(name, frame, o.tint, o.tintAmount) : s.frames[frame];
    if (o.alpha !== undefined) ctx.globalAlpha = clamp(o.alpha, 0, 1);
    if (o.additive) ctx.globalCompositeOperation = 'lighter';
    if (o.flip || o.rot || sx !== 1 || sy !== 1) {
      ctx.save();
      // pivot at the anchor point so squash/stretch keeps feet planted
      const px = dx + w / 2, py = anchor === 'c' ? dy + h / 2 : dy + h;
      ctx.translate(Math.round(px), Math.round(py));
      if (o.rot) ctx.rotate(o.rot);
      ctx.scale((o.flip ? -1 : 1) * sx, sy);
      ctx.drawImage(img, Math.round(-w / 2), anchor === 'c' ? Math.round(-h / 2) : -h, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(img, Math.round(dx), Math.round(dy), w, h);
    }
    if (o.additive) ctx.globalCompositeOperation = 'source-over';
    if (o.alpha !== undefined) ctx.globalAlpha = 1;
    return { x: dx, y: dy, w, h };
  },
  shadow(x, y, w, alpha = 0.3, h) {
    const ctx = this.ctx; ctx.globalAlpha = alpha; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), w / 2, h ?? Math.max(2, w / 4), 0, 0, 6.29); ctx.fill();
    ctx.globalAlpha = 1;
  },
  // ------------------------------------------------------------------ prims
  clear(color = '#120c16') { this.ctx.fillStyle = color; this.ctx.fillRect(0, 0, W, H); },
  rect(x, y, w, h, color) { this.ctx.fillStyle = color; this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); },
  rectA(x, y, w, h, color, a) { this.ctx.globalAlpha = a; this.rect(x, y, w, h, color); this.ctx.globalAlpha = 1; },
  outlineRect(x, y, w, h, color, t = 1) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, t); this.ctx.fillRect(x, y + h - t, w, t);
    this.ctx.fillRect(x, y, t, h); this.ctx.fillRect(x + w - t, y, t, h);
  },
  circle(x, y, r, color) { const c = this.ctx; c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill(); },
  ring(x, y, r, color, lw = 2) { const c = this.ctx; c.strokeStyle = color; c.lineWidth = lw; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.stroke(); },
  line(x1, y1, x2, y2, color, lw = 1) { const c = this.ctx; c.strokeStyle = color; c.lineWidth = lw; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); },
  bands(x, y, w, h, colors) { const n = colors.length, bh = h / n; for (let i = 0; i < n; i++) this.rect(x, y + i * bh, w, Math.ceil(bh) + 1, colors[i]); },
  // rounded-corner rectangle drawn with pixel steps (no anti-aliasing)
  round(x, y, w, h, r, color) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x + r, y, w - r * 2, h);
    this.ctx.fillRect(x, y + r, w, h - r * 2);
    const steps = [[r, r], [w - r, r], [r, h - r], [w - r, h - r]];
    for (let i = 0; i < steps.length; i++) {
      const [cx, cy] = steps[i];
      for (let py = -r; py <= r; py++) for (let px = -r; px <= r; px++) {
        if (px * px + py * py > r * r) continue;
        const qx = (i % 2 === 0 ? px <= 0 : px >= 0), qy = (i < 2 ? py <= 0 : py >= 0);
        if (qx && qy) this.ctx.fillRect(x + cx + px, y + cy + py, 1, 1);
      }
    }
  },
  bar(x, y, w, h, frac, fg, o = {}) {
    frac = clamp(frac, 0, 1);
    this.rect(x - 1, y - 1, w + 2, h + 2, o.border || '#120c16');
    this.rect(x, y, w, h, o.bg || '#241c2e');
    if (o.ghost !== undefined && o.ghost > frac) { this.rect(x, y, Math.round(w * clamp(o.ghost, 0, 1)), h, o.ghostColor || '#7d1d2b'); }
    const fw = Math.round(w * frac);
    if (fw > 0) {
      this.rect(x, y, fw, h, fg);
      this.rectA(x, y, fw, Math.max(1, h / 3 | 0), '#ffffff', 0.22);
    }
  },
  glow(x, y, r, color, a = 0.5) {
    const g = this.ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    this.ctx.globalAlpha = a; this.ctx.fillStyle = g;
    this.ctx.fillRect(x - r, y - r, r * 2, r * 2);
    this.ctx.globalAlpha = 1;
  },
  vignette(a = 0.5) {
    const g = this.ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.92);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(6,3,10,${a})`);
    this.ctx.fillStyle = g; this.ctx.fillRect(0, 0, W, H);
  },
  // ------------------------------------------------------------------ panels
  panel(x, y, w, h, o = {}) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const fill = o.fill || '#241c2e', edge = o.border || '#8a7f68', dark = o.dark || '#120c16';
    if (o.shadow !== false) this.rectA(x + 4, y + 6, w, h, '#000', 0.4);
    this.round(x, y, w, h, o.radius ?? 4, dark);
    this.round(x + 2, y + 2, w - 4, h - 4, Math.max(0, (o.radius ?? 4) - 1), fill);
    // top highlight + bottom shade
    this.rectA(x + 4, y + 3, w - 8, 2, '#ffffff', 0.10);
    this.rectA(x + 4, y + h - 5, w - 8, 2, '#000000', 0.25);
    this.round(x + 1, y + 1, w - 2, h - 2, o.radius ?? 4, 'rgba(0,0,0,0)');
    this.outlineRound(x + 1, y + 1, w - 2, h - 2, (o.radius ?? 4) - 1, edge);
    if (o.title) {
      const tw = this.measure(o.title, o.titleScale || 1) + 18;
      this.round(x + (w - tw) / 2, y - 9, tw, 18, 4, dark);
      this.outlineRound(x + (w - tw) / 2, y - 9, tw, 18, 4, edge);
      this.text(o.title, x + w / 2, y - 5, { color: o.titleColor || '#ffe98a', align: 'center', scale: o.titleScale || 1 });
    }
  },
  outlineRound(x, y, w, h, r, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x + r), Math.round(y), Math.round(w - r * 2), 1);
    this.ctx.fillRect(Math.round(x + r), Math.round(y + h - 1), Math.round(w - r * 2), 1);
    this.ctx.fillRect(Math.round(x), Math.round(y + r), 1, Math.round(h - r * 2));
    this.ctx.fillRect(Math.round(x + w - 1), Math.round(y + r), 1, Math.round(h - r * 2));
    const pts = r <= 1 ? [] : (r === 2 ? [[1, 1]] : [[1, 1], [2, 1], [1, 2]]);
    for (const [px, py] of pts) {
      this.ctx.fillRect(Math.round(x + px), Math.round(y + py), 1, 1);
      this.ctx.fillRect(Math.round(x + w - 1 - px), Math.round(y + py), 1, 1);
      this.ctx.fillRect(Math.round(x + px), Math.round(y + h - 1 - py), 1, 1);
      this.ctx.fillRect(Math.round(x + w - 1 - px), Math.round(y + h - 1 - py), 1, 1);
    }
  },
  // speech bubble with a tail pointing at (tx, ty)
  bubble(x, y, w, h, tx, ty, o = {}) {
    const fill = o.fill || '#fffaea', edge = o.border || '#120c16';
    this.rectA(x + 3, y + 5, w, h, '#000', 0.3);
    // tail first so the body covers its base
    const cx = clamp(tx, x + 14, x + w - 14), cy = y + h;
    const ctx = this.ctx;
    ctx.fillStyle = edge; ctx.beginPath();
    ctx.moveTo(cx - 11, cy - 4); ctx.lineTo(cx + 11, cy - 4); ctx.lineTo(tx, ty); ctx.closePath(); ctx.fill();
    this.round(x, y, w, h, 6, edge);
    this.round(x + 2, y + 2, w - 4, h - 4, 5, fill);
    ctx.fillStyle = fill; ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 6); ctx.lineTo(cx + 7, cy - 6); ctx.lineTo(lerp(tx, cx, 0.22), lerp(ty, cy, 0.22)); ctx.closePath(); ctx.fill();
  },
  // ------------------------------------------------------------------ text
  fontOf(name) { return FONTS[name || this.font] || FONTS.main; },
  measure(str, scale = 1, font) { return this.fontOf(font).width(String(str), scale); },
  lineHeight(scale = 1, font) { return this.fontOf(font).lh * scale; },
  text(str, x, y, o = {}) {
    str = String(str);
    const f = this.fontOf(o.font), scale = o.scale || 1, color = o.color || '#e8dfc6';
    const w = f.width(str, scale, o.tracking || 0);
    if (o.align === 'center') x -= w / 2; else if (o.align === 'right') x -= w;
    x = Math.round(x); y = Math.round(y);
    if (o.shadow) f.draw(this.ctx, str, x + scale, y + scale * 2, o.shadow === true ? '#120c16' : o.shadow, scale, o.tracking || 0);
    if (o.outline) {
      const oc = o.outline === true ? '#120c16' : o.outline;
      const s = o.outlineWidth || 1;
      for (const [dx, dy] of [[-s, 0], [s, 0], [0, -s], [0, s], [-s, -s], [s, -s], [-s, s], [s, s]]) f.draw(this.ctx, str, x + dx, y + dy, oc, scale, o.tracking || 0);
    }
    f.draw(this.ctx, str, x, y, color, scale, o.tracking || 0);
    return w;
  },
  wrap(str, maxW, scale = 1, font) {
    const f = this.fontOf(font);
    const plain = s => s.replace(/\{[^}]*\}/g, '');
    const out = [];
    for (const para of String(str).split('\n')) {
      let cur = '';
      for (const word of para.split(' ')) {
        const test = cur ? cur + ' ' + word : word;
        if (f.width(plain(test), scale) <= maxW || !cur) cur = test;
        else { out.push(cur); cur = word; }
      }
      out.push(cur);
    }
    return out;
  },
  textWrap(str, x, y, maxW, o = {}) {
    const scale = o.scale || 1, lh = o.lineHeight || this.lineHeight(scale, o.font);
    const lines = this.wrap(str, maxW, scale, o.font);
    for (let i = 0; i < lines.length; i++) this.rich(lines[i], x, y + i * lh, o);
    return lines.length * lh;
  },
  // inline colour tags: {y}gold{/} {g}green{/} {r}red{/} {c}cyan{/} {p}pink{/} {b}blue{/} {o}orange{/} {w}white{/} {d}dim{/}
  rich(str, x, y, o = {}) {
    const scale = o.scale || 1;
    const cols = { y: '#ffe98a', g: '#a8e878', r: '#ef6a5e', c: '#86e8d2', o: '#ffa832', w: '#ffffff', p: '#ffb0cf', b: '#6aa9ee', d: '#7a6d8a', s: '#bdbccd' };
    const base = o.color || '#e8dfc6';
    const segs = []; let re = /\{([^}]*)\}/g, last = 0, m, col = base;
    while ((m = re.exec(str))) {
      if (m.index > last) segs.push({ t: str.slice(last, m.index), c: col });
      col = m[1] === '/' ? base : (cols[m[1]] || base);
      last = re.lastIndex;
    }
    if (last < str.length) segs.push({ t: str.slice(last), c: col });
    const f = this.fontOf(o.font);
    const total = segs.reduce((a, s) => a + f.width(s.t, scale), 0);
    if (o.align === 'center') x -= total / 2; else if (o.align === 'right') x -= total;
    let cx = x;
    for (const s of segs) { this.text(s.t, cx, y, Object.assign({}, o, { color: s.c, align: 'left' })); cx += f.width(s.t, scale); }
    return total;
  },
};

// ---------------------------------------------------------------------------
// Input: mouse + multi-touch, audio-stamped so rhythm judging is frame-independent
// ---------------------------------------------------------------------------
const Input = {
  mx: -1, my: -1, down: false, clicks: [], keys: [], held: {}, wheel: 0,
  touch: false, touches: new Map(), releases: [], dragDX: 0, dragDY: 0, anyPress: false,
  audioNow() { return (typeof AudioSys !== 'undefined' && AudioSys.ctx) ? AudioSys.ctx.currentTime : 0; },
  init(canvas) {
    this.canvas = canvas;
    const pt = (cx, cy) => { const r = canvas.getBoundingClientRect(); return { x: (cx - r.left) * W / r.width, y: (cy - r.top) * H / r.height }; };
    canvas.addEventListener('mousemove', e => { if (this.touch) return; const p = pt(e.clientX, e.clientY); this.mx = p.x; this.my = p.y; });
    canvas.addEventListener('mousedown', e => {
      if (this.touch) return;
      const p = pt(e.clientX, e.clientY); this.mx = p.x; this.my = p.y; this.down = true; this.anyPress = true;
      this.clicks.push({ x: p.x, y: p.y, button: e.button, at: this.audioNow(), id: 'mouse' });
      e.preventDefault();
    });
    canvas.addEventListener('mouseup', () => { if (this.touch) return; this.down = false; this.releases.push('mouse'); });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('wheel', e => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchstart', e => {
      this.touch = true; this.down = true; this.anyPress = true;
      const at = this.audioNow();
      for (const T of e.changedTouches) {
        const p = pt(T.clientX, T.clientY); this.touches.set(T.identifier, p);
        this.mx = p.x; this.my = p.y;
        this.clicks.push({ x: p.x, y: p.y, button: 0, at, touch: true, id: T.identifier });
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
    const end = e => {
      for (const T of e.changedTouches) { this.touches.delete(T.identifier); this.releases.push(T.identifier); }
      if (!this.touches.size) { this.down = false; this.mx = -9999; this.my = -9999; }
      e.preventDefault();
    };
    canvas.addEventListener('touchend', end, { passive: false });
    canvas.addEventListener('touchcancel', end, { passive: false });
    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      this.held[e.code] = true; this.anyPress = true;
      this.keys.push({ code: e.code, key: e.key, at: this.audioNow() });
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => { this.held[e.code] = false; });
    window.addEventListener('blur', () => { this.held = {}; this.down = false; this.touches.clear(); });
  },
  pressed(...codes) { return this.keys.some(k => codes.includes(k.code)); },
  isDown(...codes) { return codes.some(c => this.held[c]); },
  flush() { this.clicks.length = 0; this.keys.length = 0; this.wheel = 0; this.releases.length = 0; this.dragDX = 0; this.dragDY = 0; this.anyPress = false; },
};

// ---------------------------------------------------------------------------
// Immediate-mode UI
// ---------------------------------------------------------------------------
const UI = {
  items: [], tips: [], hoverAny: false, locked: false, hot: new Map(),
  begin() { this.items.length = 0; this.tips.length = 0; this.hoverAny = false; },
  hovered(x, y, w, h) { return inRect(Input.mx, Input.my, x, y, w, h); },
  anim(key, target, rate = 14) {
    const v = this.hot.get(key) ?? 0;
    const nv = damp(v, target, rate, Math.min(0.05, Time.dt || 0.016));
    this.hot.set(key, nv); return nv;
  },
  hit(x, y, w, h, cb, o = {}) {
    const hov = !this.locked && this.hovered(x, y, w, h);
    if (hov && !o.noCursor) this.hoverAny = true;
    this.items.push({ x, y, w, h, cb, disabled: o.disabled || this.locked, right: o.right });
    return hov;
  },
  button(x, y, w, h, label, cb, o = {}) {
    const key = o.key || (label + x + ',' + y);
    const hov = !this.locked && !o.disabled && this.hovered(x, y, w, h);
    if (hov) this.hoverAny = true;
    const k = this.anim(key, hov ? 1 : 0, 16);
    const lift = Math.round(k * 2);
    const yy = y - lift;
    const base = o.disabled ? '#3b3048' : (o.fill || '#5c3a20');
    const lit = o.disabled ? '#3b3048' : (o.hover || '#85562f');
    const edge = o.disabled ? '#574a66' : (hov ? '#ffe98a' : (o.border || '#d8a86b'));
    Gfx.round(x, y + 4, w, h, 5, '#120c16');
    Gfx.round(x, yy, w, h, 5, '#120c16');
    Gfx.round(x + 2, yy + 2, w - 4, h - 4, 4, k > 0.5 ? lit : base);
    Gfx.rectA(x + 4, yy + 3, w - 8, 2, '#ffffff', 0.14 + k * 0.1);
    Gfx.outlineRound(x + 1, yy + 1, w - 2, h - 2, 4, edge);
    const scale = o.scale || 1;
    const ty = yy + Math.round((h - Gfx.fontOf(o.font).gh * scale) / 2);
    if (o.icon) Gfx.sprite(o.icon, x + 12, yy + h / 2, { anchor: 'c', scale: o.iconScale || 1 });
    Gfx.text(label, x + w / 2 + (o.icon ? 8 : 0), ty, { color: o.disabled ? '#7a6d8a' : (o.color || '#fffaea'), align: 'center', scale, shadow: true, font: o.font });
    this.items.push({ x, y: yy, w, h: h + lift, cb, disabled: o.disabled || this.locked });
    return hov;
  },
  iconButton(x, y, w, h, icon, cb, o = {}) {
    const hov = !this.locked && this.hovered(x, y, w, h);
    if (hov) this.hoverAny = true;
    Gfx.round(x, y, w, h, 4, '#120c16');
    Gfx.round(x + 2, y + 2, w - 4, h - 4, 3, hov ? '#85562f' : '#3b3048');
    Gfx.outlineRound(x + 1, y + 1, w - 2, h - 2, 3, hov ? '#ffe98a' : '#8a7f68');
    Gfx.sprite(icon, x + w / 2, y + h / 2, { anchor: 'c', scale: o.scale || 1 });
    this.items.push({ x, y, w, h, cb, disabled: this.locked });
    if (hov && o.tip) this.tooltip(x, y + h + 4, o.tip);
    return hov;
  },
  tooltip(x, y, lines, o = {}) { this.tips.push({ x, y, lines: Array.isArray(lines) ? lines : [lines], o }); },
  drawTips() {
    for (const t of this.tips) {
      const maxW = t.o.width || 230, scale = 1;
      const all = [];
      for (const l of t.lines) for (const w of Gfx.wrap(l, maxW - 16, scale)) all.push(w);
      const lh = Gfx.lineHeight(scale);
      const wdt = Math.min(maxW, Math.max(...all.map(l => Gfx.measure(l.replace(/\{[^}]*\}/g, ''), scale))) + 16);
      const h = all.length * lh + 12;
      let x = clamp(t.x, 4, W - wdt - 4), y = t.y; if (y + h > H - 4) y = t.y - h - 22; y = clamp(y, 4, H - h - 4);
      Gfx.panel(x, y, wdt, h, { fill: '#1a1424', border: '#ffe98a', radius: 4 });
      for (let i = 0; i < all.length; i++) Gfx.rich(all[i], x + 8, y + 6 + i * lh, { color: i === 0 && t.o.titleColor !== false ? '#ffe98a' : '#d6cfe0' });
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
