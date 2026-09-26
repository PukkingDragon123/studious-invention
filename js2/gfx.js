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
  // Circles are rasterised in chunky steps rather than stroked as vector arcs:
  // a smooth anti-aliased circle is the one shape that always gives a pixel
  // game away. STEP is the size of a "pixel" in the drawn shape.
  circleStep: 3,
  circle(x, y, r, color) {
    const c = this.ctx, st = this.circleStep, rr = r * r;
    c.fillStyle = color;
    const y0 = Math.round(y - r), n = Math.ceil((r * 2) / st);
    for (let i = 0; i <= n; i++) {
      const yy = y0 + i * st, dy = yy + st / 2 - y;
      const w = Math.sqrt(Math.max(0, rr - dy * dy));
      if (w <= 0.4) continue;
      c.fillRect(Math.round(x - w), yy, Math.max(st, Math.round(w * 2)), st);
    }
  },
  ring(x, y, r, color, lw = 2) {
    const c = this.ctx, st = this.circleStep, ir = Math.max(0, r - Math.max(lw, st));
    c.fillStyle = color;
    const y0 = Math.round(y - r), n = Math.ceil((r * 2) / st);
    for (let i = 0; i <= n; i++) {
      const yy = y0 + i * st, dy = yy + st / 2 - y;
      const o = Math.sqrt(Math.max(0, r * r - dy * dy));
      if (o <= 0.4) continue;
      const inr = Math.sqrt(Math.max(0, ir * ir - dy * dy));
      if (inr <= 0.4) { c.fillRect(Math.round(x - o), yy, Math.max(st, Math.round(o * 2)), st); }
      else {
        const w = Math.max(st, Math.round(o - inr));
        c.fillRect(Math.round(x - o), yy, w, st);
        c.fillRect(Math.round(x + inr), yy, w, st);
      }
    }
  },
  line(x1, y1, x2, y2, color, lw = 1) { const c = this.ctx; c.strokeStyle = color; c.lineWidth = lw; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); },
  // A chunky diagonal drawn as fills rather than a stroke. Stroking is the most
  // expensive thing this engine can ask a canvas for, and a crowd wants four
  // hundred little waving arms every frame.
  seg(x1, y1, x2, y2, w, color) {
    const c = this.ctx;
    c.fillStyle = color;
    const dx = x2 - x1, dy = y2 - y1, ww = Math.max(1, Math.ceil(w));
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / Math.max(1, w * 0.8)));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      c.fillRect(Math.round(x1 + dx * t - w / 2), Math.round(y1 + dy * t - w / 2), ww, ww);
    }
  },
  bands(x, y, w, h, colors) { const n = colors.length, bh = h / n; for (let i = 0; i < n; i++) this.rect(x, y + i * bh, w, Math.ceil(bh) + 1, colors[i]); },
  // rounded-corner rectangle drawn with pixel steps (no anti-aliasing)
  // A rounded rect, drawn as spans. The corners used to go out one pixel at a
  // time, which is O(r^2) fillRects - with a crowd of two hundred people on
  // screen that alone was costing fifty thousand calls a frame.
  round(x, y, w, h, r, color) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    r = Math.max(0, Math.min(Math.round(r), w >> 1, h >> 1));
    const c = this.ctx;
    c.fillStyle = color;
    if (r <= 1) { c.fillRect(x, y, w, h); return; }   // too small to be worth rounding
    // every pixel is covered exactly once, so a translucent one has no seams
    c.fillRect(x, y + r, w, h - r * 2);
    for (let j = 0; j < r; j++) {
      const dy = r - j - 0.5, inset = Math.round(r - Math.sqrt(Math.max(0, r * r - dy * dy)));
      c.fillRect(x + inset, y + j, w - inset * 2, 1);
      c.fillRect(x + inset, y + h - 1 - j, w - inset * 2, 1);
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
  // A dark sunken panel, framed in the same cut stone as everything else, with
  // an optional carved plaque hung over the top edge.
  panel(x, y, w, h, o = {}) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const fill = o.fill || '#241c2e', r = o.radius ?? 4;
    if (o.shadow !== false) this.rectA(x + 4, y + 6, w, h, '#000', 0.4);
    this.round(x, y, w, h, r, SKIN.ink);
    this.round(x + 1, y + 1, w - 2, h - 2, r, SKIN.faceDark);
    this.round(x + 3, y + 3, w - 6, h - 6, Math.max(0, r - 1), SKIN.faceMid);
    this.round(x + 6, y + 6, w - 12, h - 12, Math.max(0, r - 1), fill);
    this.rectA(x + 7, y + 7, w - 14, 2, '#000000', 0.45);          // it is sunk, so it is dark up top
    this.rectA(x + 7, y + h - 10, w - 14, 3, '#ffffff', 0.06);
    UI.filigree(x, y, w, h, { len: 9 });
    if (o.title) {
      const tw = this.measure(o.title, o.titleScale || 1) + 26;
      UI.slab(x + (w - tw) / 2, y - 14, tw, 26, {
        face: SKIN.bar, lit: SKIN.barLit, mid: SKIN.barDark, dark: SKIN.ink,
        r: 3, shadow: false, rough: false, len: 7,
      });
      this.text(o.title, x + w / 2, y - 5, { color: SKIN.barDark, align: 'center', scale: o.titleScale || 1 });
      this.text(o.title, x + w / 2, y - 6, { color: o.titleColor || SKIN.goldLit, align: 'center', scale: o.titleScale || 1 });
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
    // two tag palettes: one for dark backgrounds, one for the parchment panels
    const cols = o.onLight
      ? { y: '#7d1d2b', g: '#27632f', r: '#c2333c', c: '#18706a', o: '#9c3510', w: '#14331e', p: '#a03a68', b: '#1d3d72', d: '#574a66', s: '#3b3048', v: '#4b2070' }
      : { y: '#ffe98a', g: '#a8e878', r: '#ef6a5e', c: '#86e8d2', o: '#ffa832', w: '#ffffff', p: '#ffb0cf', b: '#6aa9ee', d: '#7a6d8a', s: '#bdbccd', v: '#c28cff' };
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
// The thumb pad
// ---------------------------------------------------------------------------
// One stick and a column of round stone buttons, shared by every stage that
// is played rather than watched. It is immediate-mode like the rest of the UI:
// you draw it where you want it and it hands you back what the thumb is doing.
// The only state it keeps between frames is which touch owns the stick.
const Pad = {
  stickId: null,
  // A thumb stick anchored at (cx, cy). The first touch that lands in the
  // claim zone owns it until it lifts, so the stick follows your thumb
  // instead of teleporting to it. Returns { x, y } in -1..1.
  joystick(cx, cy, r, o = {}) {
    if (!Input.touch) return { x: 0, y: 0, live: false };
    const ZW = o.zoneW ?? W * 0.46, ZY = o.zoneY ?? H * 0.30;
    if (this.stickId === null)
      for (const c of Input.clicks) if (c.touch && c.x < ZW && c.y > ZY) { this.stickId = c.id; break; }
    if (this.stickId !== null && !Input.touches.has(this.stickId)) this.stickId = null;
    let dx = 0, dy = 0;
    if (this.stickId !== null) {
      const p = Input.touches.get(this.stickId);
      dx = (p.x - cx) / r; dy = (p.y - cy) / r;
      const m = Math.hypot(dx, dy);
      if (m > 1) { dx /= m; dy /= m; }
    }
    const ctx = Gfx.ctx;
    ctx.globalAlpha = 0.30; Gfx.circle(cx, cy, r, '#120c16'); ctx.globalAlpha = 1;
    Gfx.ring(cx, cy, r, SKIN.ink, 3);
    Gfx.ring(cx, cy, r - 3, SKIN.faceMid, 2);
    for (let i = 0; i < 4; i++) {                    // four notches, so it reads as a stick
      const a = i * Math.PI / 2;
      Gfx.rectA(cx + Math.cos(a) * (r - 14) - 3, cy + Math.sin(a) * (r - 14) - 3, 7, 7, SKIN.faceLit, 0.7);
    }
    const kx = cx + dx * (r - 24), ky = cy + dy * (r - 24), live = this.stickId !== null;
    Gfx.circle(kx, ky, 29, SKIN.ink);
    Gfx.circle(kx, ky, 26, SKIN.btnDark);
    Gfx.circle(kx, ky, 23, live ? SKIN.btn : SKIN.btnFace);
    Gfx.circle(kx - 6, ky - 8, 8, SKIN.btnLit);
    Gfx.ring(kx, ky, 24, SKIN.gold, 2);
    return { x: dx, y: dy, live };
  },
  // A round stone button. Returns { held, pressed } - held for run and move,
  // pressed for the one-shot things like a jump or a swing.
  button(cx, cy, r, label, o = {}) {
    let held = false, pressed = false;
    const inside = (x, y) => (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r * 1.1;
    if (Input.touch) {
      for (const [id, p] of Input.touches) if (id !== this.stickId && inside(p.x, p.y)) held = true;
      for (const c of Input.clicks) if (c.touch && inside(c.x, c.y)) pressed = true;
    } else {
      held = Input.down && inside(Input.mx, Input.my);
      pressed = Input.clicks.some(c => inside(c.x, c.y));
    }
    if (o.disabled) { held = false; pressed = false; }
    const lit = held && !o.disabled;
    Gfx.circle(cx, cy + 3, r, '#120c16');
    Gfx.circle(cx, cy + (lit ? 2 : 0), r, SKIN.ink);
    Gfx.circle(cx, cy + (lit ? 2 : 0), r - 3, o.danger ? SKIN.redDark : SKIN.btnDark);
    Gfx.circle(cx, cy + (lit ? 2 : 0), r - 5, o.disabled ? SKIN.faceMid : o.danger ? SKIN.red : lit ? SKIN.btnLit : SKIN.btn);
    Gfx.circle(cx - r * 0.3, cy - r * 0.34 + (lit ? 2 : 0), r * 0.3, o.disabled ? SKIN.face : SKIN.btnLit);
    Gfx.ring(cx, cy + (lit ? 2 : 0), r - 2, o.disabled ? SKIN.faceDark : SKIN.gold, 2);
    Gfx.text(label, cx, cy - 6 + (lit ? 2 : 0), {
      color: o.disabled ? SKIN.faceDark : SKIN.textLit, align: 'center', scale: o.scale || 1.2,
    });
    return { held, pressed };
  },
  // Everything a walking stage needs, laid out for two thumbs. Pass what the
  // buttons should say; get back one object the stage can read like a gamepad.
  legs(o = {}) {
    if (!Input.touch) return { x: 0, jump: false, act: false, run: false };
    const st = this.joystick(o.stickX ?? 104, o.stickY ?? H - 100, 64);
    const R = 44, bx = W - 74;
    const jump = this.button(bx, H - 176, R, o.jumpLabel || 'JUMP');
    const act = o.act === false ? { held: false, pressed: false }
      : this.button(bx - 104, H - 108, R - 4, o.actLabel || 'ACT', { disabled: !!o.actOff });
    const main = this.button(bx, H - 80, R + 6, o.mainLabel || 'GO', { danger: !!o.mainDanger });
    return {
      x: st.x, y: st.y, stick: st.live,
      jump: jump.pressed, jumpHeld: jump.held,
      act: act.pressed, actHeld: act.held,
      run: main.held, runPressed: main.pressed,
    };
  },
};

// ---------------------------------------------------------------------------
// Immediate-mode UI
// ---------------------------------------------------------------------------
// The look of every window in the game: dark ink outline, parchment face,
// a green title bar with a close box, and buttons that are chunky enough to
// hit with a thumb.
// Everything in this game's interface is a slab of cut stone with gold let into
// the corners. Pale sandstone for anything you have to read off, ochre for the
// bands and the buttons, and one gold ramp for the metal.
const SKIN = {
  ink: '#120c16', inkSoft: '#241c2e',
  face: '#c4b89a', faceMid: '#8a7f68', faceDark: '#5c3a20', faceLit: '#e8dfc6', faceHi: '#fffaea',
  bar: '#85562f', barDark: '#241109', barLit: '#b07a45', barInk: '#241109',
  btn: '#b07a45', btnLit: '#d8a86b', btnDark: '#3a2415', btnFace: '#85562f',
  gold: '#e0b93a', goldLit: '#ffe98a', goldDark: '#6b4a10',
  red: '#c2333c', redDark: '#7d1d2b',
  text: '#241109', textLit: '#fffaea', textDim: '#5c3a20',
};

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
  // ---------------------------------------------------------------- stone
  // A slab of cut stone: an ink edge, a chiselled bevel, a pitted face and
  // gold let into the corners. Every panel, button and slot in this game is
  // one of these at some size, so the whole interface reads as one material.
  slab(x, y, w, h, o = {}) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const face = o.face || SKIN.face, lit = o.lit || SKIN.faceLit;
    const mid = o.mid || SKIN.faceMid, dark = o.dark || SKIN.faceDark;
    const r = o.r ?? 4;
    if (o.shadow !== false) Gfx.rectA(x + 5, y + 7, w, h, '#000000', 0.42);
    Gfx.round(x, y, w, h, r, SKIN.ink);                      // the cut edge
    Gfx.round(x + 1, y + 1, w - 2, h - 2, r, dark);
    Gfx.round(x + 2, y + 2, w - 4, h - 4, Math.max(1, r - 1), mid);
    Gfx.round(x + 3, y + 3, w - 6, h - 7, Math.max(1, r - 1), face);
    Gfx.rect(x + 4, y + 3, w - 8, 2, lit);                   // the light comes from above
    Gfx.rect(x + 3, y + 5, 2, h - 12, lit);
    Gfx.rect(x + w - 5, y + 5, 2, h - 11, mid);
    Gfx.rect(x + 4, y + h - 6, w - 8, 3, mid);
    // pitting, mottle and hairline cracks, seeded off the rect so nothing crawls
    if (o.rough !== false && w > 26 && h > 26) {
      const n = clamp(((w * h) / 620) | 0, 6, 70);
      for (let i = 0; i < n; i++) {
        const px = x + 7 + ((i * 53 + (w | 0)) % (w - 16));
        const py = y + 7 + ((i * 37 + (h | 0)) % (h - 16));
        Gfx.rectA(px, py, 2 + (i % 4), 2, i % 3 ? mid : lit, i % 3 ? 0.55 : 0.75);
        if (i % 5 === 0) Gfx.rectA(px + 1, py + 2, 2, 1, dark, 0.35);
      }
      for (let k = 0; k < 2; k++) {                          // a crack running across it
        let px = x + 10 + ((k * 61 + (w | 0)) % Math.max(1, w - 30));
        let py = y + 8;
        for (let i = 0; i < ((h - 16) / 6) | 0; i++) {
          const nx = px + (((i + k * 3) * 29) % 7) - 3;
          Gfx.rectA(px, py, 2, 6, dark, 0.28);
          px = clamp(nx, x + 6, x + w - 8); py += 6;
        }
      }
      for (let i = 0; i < 3; i++) {                          // chips out of the rim
        const t = ((i * 37 + (w | 0)) % 100) / 100;
        Gfx.rect(x + 8 + t * (w - 22), y + (i % 2 ? h - 4 : 1), 5, 3, SKIN.ink);
        Gfx.rect(x + (i % 2 ? 1 : w - 4), y + 8 + t * (h - 22), 3, 5, SKIN.ink);
      }
    }
    if (o.gold !== false) UI.filigree(x, y, w, h, o);
    return { x, y, w, h };
  },
  // The gold corner pieces off the reference sheet: a flared bracket with a
  // scroll curling in off the elbow. Two sizes, drawn from a little bitmap and
  // mirrored into all four corners.
  FIL_BIG: [
    'DDDDDDDDDDDDD',
    'DLLLLLLLLLGD.',
    'DLGGGGGGGGD..',
    'DLGDDDDDDD...',
    'DLGD.........',
    'DLGD..DDD....',
    'DLGD.DGLGD...',
    'DLGD.DGGGD...',
    'DGGD..DDD....',
    'DGGD.........',
    'DGD..........',
    'DD...........',
    'D............',
  ],
  FIL_SMALL: [
    'DDDDDDD',
    'DLLLLGD',
    'DLGGGD.',
    'DLGD...',
    'DGGD...',
    'DGD....',
    'DD.....',
  ],
  filigree(x, y, w, h, o = {}) {
    if (w < 18 || h < 18) return;
    const g = o.goldCol || SKIN.gold, gl = o.goldLit || SKIN.goldLit, gd = o.goldDark || SKIN.goldDark;
    const COL = { D: gd, G: g, L: gl };
    const small = (o.len && o.len < 10) || Math.min(w, h) < 46;
    const pat = small ? UI.FIL_SMALL : UI.FIL_BIG;
    const sc = o.filScale || (!small && Math.min(w, h) >= 120 ? 2 : 1);
    const n = pat.length;
    if (n * sc * 2 > Math.min(w, h)) return;
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]])
      for (let v = 0; v < n; v++) {
        const row = pat[v];
        for (let u = 0; u < row.length; u++) {
          const c = COL[row[u]];
          if (!c) continue;
          const ux = sx > 0 ? cx + u * sc : cx - (u + 1) * sc;
          const vy = sy > 0 ? cy + v * sc : cy - (v + 1) * sc;
          Gfx.rect(ux, vy, sc, sc, c);
          // the same piece turned on its side fills the other arm
          const vx = sx > 0 ? cx + v * sc : cx - (v + 1) * sc;
          const uy = sy > 0 ? cy + u * sc : cy - (u + 1) * sc;
          Gfx.rect(vx, uy, sc, sc, c);
        }
      }
  },
  // Letters cut into stone: a lit ghost one pixel below, the letter on top.
  carve(text, x, y, o = {}) {
    Gfx.text(text, x, y + 1, Object.assign({}, o, { color: o.under || SKIN.faceHi }));
    Gfx.text(text, x, y, Object.assign({}, o, { color: o.color || SKIN.text }));
  },

  button(x, y, w, h, label, cb, o = {}) {
    const key = o.key || (label + x + ',' + y);
    const hov = !this.locked && !o.disabled && this.hovered(x, y, w, h);
    if (hov) this.hoverAny = true;
    const k = this.anim(key, hov ? 1 : 0, 16);
    const lift = Math.round(k * 2);
    const yy = y - lift;
    const face = o.disabled ? '#8a7f68' : (o.fill || (k > 0.5 ? SKIN.btn : SKIN.btnFace));
    const lit = o.disabled ? '#c4b89a' : (o.hover || SKIN.btnLit);
    Gfx.round(x, y + 4, w, h, 4, SKIN.ink);
    UI.slab(x, yy, w, h, { face, lit, mid: SKIN.btnDark, dark: SKIN.ink, r: 4, shadow: false, rough: false, len: 9 });
    if (hov) UI.filigree(x, yy, w, h, { goldCol: SKIN.goldLit, goldLit: '#ffffff', len: 9 });
    const scale = o.scale || 1;
    const ty = yy + Math.round((h - Gfx.fontOf(o.font).gh * scale) / 2);
    if (o.icon) Gfx.sprite(o.icon, x + 14, yy + h / 2, { anchor: 'c', scale: o.iconScale || 1 });
    Gfx.text(label, x + w / 2 + (o.icon ? 8 : 0), ty + 1, { color: SKIN.ink, align: 'center', scale, font: o.font });
    Gfx.text(label, x + w / 2 + (o.icon ? 8 : 0), ty, { color: o.disabled ? '#5c3a20' : (o.color || SKIN.textLit), align: 'center', scale, font: o.font });
    this.items.push({ x, y: yy, w, h: h + lift, cb, disabled: o.disabled || this.locked });
    return hov;
  },
  iconButton(x, y, w, h, icon, cb, o = {}) {
    const hov = !this.locked && this.hovered(x, y, w, h);
    if (hov) this.hoverAny = true;
    UI.slab(x, y, w, h, {
      face: hov ? SKIN.btn : SKIN.faceMid, lit: hov ? SKIN.btnLit : SKIN.face,
      mid: SKIN.btnDark, dark: SKIN.ink, r: 3, shadow: false, rough: false, len: 7,
    });
    Gfx.sprite(icon, x + w / 2, y + h / 2, { anchor: 'c', scale: o.scale || 1 });
    this.items.push({ x, y, w, h, cb, disabled: this.locked });
    if (hov && o.tip) this.tooltip(x, y + h + 4, o.tip);
    return hov;
  },
  // ------------------------------------------------------------- windows
  // A window is a tablet: sandstone face, gold in the corners, and an ochre
  // band cut across the top with the name chiselled into it.
  window(x, y, w, h, title, o = {}) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const BAR = title ? 30 : 0;
    UI.slab(x, y, w, h, { shadow: o.shadow !== false });
    if (title) {
      Gfx.round(x + 7, y + 7, w - 14, BAR, 3, SKIN.ink);
      Gfx.round(x + 8, y + 8, w - 16, BAR - 2, 2, SKIN.barDark);
      Gfx.round(x + 9, y + 9, w - 18, BAR - 5, 2, SKIN.bar);
      Gfx.rect(x + 10, y + 10, w - 20, 2, SKIN.barLit);
      Gfx.rect(x + 10, y + BAR + 3, w - 20, 2, SKIN.barDark);
      for (let i = 0; i < 6; i++)                                 // tool marks in the band
        Gfx.rectA(x + 16 + ((i * 71 + w) % Math.max(1, w - 34)), y + 13 + (i % 3) * 4, 5, 2, SKIN.barDark, 0.45);
      Gfx.text(title, x + w / 2, y + 13, { color: SKIN.barDark, align: 'center', scale: o.titleScale || 1.4 });
      Gfx.text(title, x + w / 2, y + 12, { color: SKIN.goldLit, align: 'center', scale: o.titleScale || 1.4 });
      if (o.onClose) {
        const bx = x + w - 32, by = y + 10;
        const hov = this.hit(bx - 2, by - 2, 24, 24, o.onClose);
        Gfx.round(bx, by, 19, 19, 3, SKIN.ink);
        Gfx.round(bx + 1, by + 1, 17, 17, 2, SKIN.goldDark);
        Gfx.round(bx + 2, by + 2, 15, 15, 2, hov ? SKIN.red : SKIN.faceMid);
        for (let i = 0; i < 9; i++) {
          Gfx.rect(bx + 5 + i, by + 5 + i, 2, 2, SKIN.ink);
          Gfx.rect(bx + 13 - i, by + 5 + i, 2, 2, SKIN.ink);
        }
      }
    }
    return { x: x + 12, y: y + 10 + BAR + (title ? 6 : 0), w: w - 24, h: h - 24 - BAR };
  },
  // A button is a smaller slab set into a socket, and it drops into the
  // socket when you lean on it.
  wbutton(x, y, w, h, label, cb, o = {}) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const key = o.key || (label + x + ',' + y);
    const hov = !this.locked && !o.disabled && this.hovered(x, y, w, h);
    if (hov) this.hoverAny = true;
    const k = this.anim(key, hov ? 1 : 0, 18);
    const down = hov && Input.down;
    const dy = down ? 3 : 0;
    const face = o.disabled ? '#8a7f68' : (o.danger ? SKIN.red : (k > 0.4 ? SKIN.btn : SKIN.btnFace));
    const lit = o.disabled ? '#c4b89a' : (o.danger ? '#ef6a5e' : SKIN.btnLit);
    const dark = o.disabled ? '#3b3048' : (o.danger ? SKIN.redDark : SKIN.btnDark);
    Gfx.round(x, y + 5, w, h - 2, 4, SKIN.ink);                   // the socket it sits in
    Gfx.round(x + 1, y + 6, w - 2, h - 4, 3, SKIN.faceDark);
    UI.slab(x, y + dy, w, h, {
      face, lit, mid: dark, dark: SKIN.ink, r: 4, shadow: false,
      rough: w > 70, len: clamp((h / 3) | 0, 6, 10),
    });
    Gfx.rect(x + 6, y + dy + 4, w - 12, 2, lit);
    const scale = o.scale || 1.5;
    const ty = y + dy + Math.round((h - Gfx.fontOf(o.font).gh * scale) / 2) - 1;
    if (o.icon) Gfx.sprite(o.icon, x + 18, y + dy + h / 2, { anchor: 'c', scale: o.iconScale || 1.4 });
    Gfx.text(label, x + w / 2 + (o.icon ? 10 : 0), ty + 1, { color: SKIN.ink, align: 'center', scale, font: o.font });
    Gfx.text(label, x + w / 2 + (o.icon ? 10 : 0), ty, { color: o.disabled ? '#5c3a20' : SKIN.textLit, align: 'center', scale, font: o.font });
    this.items.push({ x, y, w, h: h + 5, cb, disabled: o.disabled || this.locked });
    return hov;
  },
  // A value as a row of gold stones set into a channel cut in the slab.
  segbar(x, y, w, h, frac, o = {}) {
    const n = o.segments || 14, gap = 2;
    const sw = Math.floor((w - gap * (n - 1)) / n);
    const on = Math.round(clamp(frac, 0, 1) * n);
    const tw = n * (sw + gap) - gap;
    Gfx.round(x - 4, y - 4, tw + 8, h + 8, 3, SKIN.ink);
    Gfx.round(x - 3, y - 3, tw + 6, h + 6, 2, SKIN.faceDark);
    Gfx.rect(x - 2, y - 2, tw + 4, 2, SKIN.faceMid);
    for (let i = 0; i < n; i++) {
      const bx = x + i * (sw + gap), on2 = i < on;
      Gfx.rect(bx, y, sw, h, on2 ? (o.col || SKIN.gold) : '#3b3048');
      Gfx.rect(bx, y, sw, 2, on2 ? (o.colLit || SKIN.goldLit) : '#574a66');
      Gfx.rect(bx, y + h - 2, sw, 2, on2 ? SKIN.goldDark : '#241c2e');
    }
    return tw;
  },
  checkbox(x, y, size, on, cb, o = {}) {
    const hov = this.hit(x, y, size, size, cb);
    UI.slab(x, y, size, size, {
      face: on ? SKIN.gold : SKIN.faceMid, lit: on ? SKIN.goldLit : SKIN.face,
      mid: SKIN.faceDark, dark: SKIN.ink, r: 3, shadow: false, rough: false, gold: false,
    });
    if (on) {                                                     // a tick chiselled into it
      for (let i = 0; i < 4; i++) Gfx.rect(x + 5 + i, y + size / 2 - 1 + i, 3, 3, SKIN.ink);
      for (let i = 0; i < 6; i++) Gfx.rect(x + 8 + i, y + size / 2 + 2 - i, 3, 3, SKIN.ink);
    }
    if (hov) UI.filigree(x, y, size, size, { len: 7 });
    if (o.label) Gfx.text(o.label, x + size + 12, y + (size - Gfx.fontOf().gh * 1.4) / 2, { color: SKIN.text, scale: 1.4 });
    return hov;
  },
  // A stone arrowhead, chipped out the way an arrowhead is.
  arrow(x, y, size, dir, cb, o = {}) {
    const hov = this.hit(x, y, size, size, cb, { disabled: o.disabled });
    const ctx = Gfx.ctx;
    const tri = (ox, oy, col) => {
      ctx.beginPath();
      const p = dir === 'left' ? [[0.10, 0.5], [0.84, 0.08], [0.84, 0.92]]
        : dir === 'right' ? [[0.90, 0.5], [0.16, 0.08], [0.16, 0.92]]
          : dir === 'up' ? [[0.5, 0.10], [0.08, 0.84], [0.92, 0.84]]
            : [[0.5, 0.90], [0.08, 0.16], [0.92, 0.16]];
      p.forEach(([px, py], i) => (i ? ctx.lineTo(x + ox + px * size, y + oy + py * size)
        : ctx.moveTo(x + ox + px * size, y + oy + py * size)));
      ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    };
    tri(0, 2, SKIN.ink);
    tri(0, 0, SKIN.ink);
    tri(1, 1, o.disabled ? '#8a7f68' : (hov ? SKIN.goldLit : SKIN.gold));
    tri(2, 3, o.disabled ? '#5c3a20' : SKIN.goldDark);
    tri(1.5, 1.5, o.disabled ? '#c4b89a' : (hov ? '#ffffff' : SKIN.goldLit));
    return hov;
  },
  dropdown(x, y, w, h, value, cb) {
    const hov = this.hit(x, y, w, h, cb);
    UI.slab(x, y, w, h, { face: hov ? SKIN.faceLit : SKIN.face, r: 3, shadow: false, rough: false, gold: false });
    Gfx.text(value, x + 12, y + (h - Gfx.fontOf().gh * 1.4) / 2, { color: SKIN.text, scale: 1.4 });
    this.arrow(x + w - h + 2, y + 2, h - 4, 'down', cb, {});
    return hov;
  },
  // A slot is a hole cut through a tablet, with gold framing the cut.
  slot(x, y, size, o = {}) {
    Gfx.round(x, y, size, size, 4, SKIN.ink);
    Gfx.round(x + 1, y + 1, size - 2, size - 2, 4, o.rare ? SKIN.goldLit : SKIN.gold);
    Gfx.round(x + 2, y + 2, size - 4, size - 4, 3, SKIN.goldDark);
    Gfx.round(x + 4, y + 4, size - 8, size - 8, 3, o.fill || '#3a2415');
    Gfx.rectA(x + 5, y + 5, size - 10, 3, '#241109', 0.9);        // it is sunk, so it is dark up top
    Gfx.rectA(x + 5, y + size - 9, size - 10, 3, '#5c3a20', 0.8);
    UI.filigree(x, y, size, size, { len: clamp((size / 3.4) | 0, 6, 11) });
    if (o.icon) Gfx.sprite(o.icon, x + size / 2, y + size / 2, { anchor: 'c', scale: o.iconScale || 1.6 });
    if (o.hot) UI.filigree(x - 1, y - 1, size + 2, size + 2, { goldCol: SKIN.goldLit, goldLit: '#ffffff', len: clamp((size / 3.4) | 0, 6, 11) });
    if (o.count !== undefined) Gfx.text(String(o.count), x + size - 5, y + size - 13, { color: SKIN.textLit, align: 'right', scale: 1.2, outline: true });
    return { x, y, size };
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
