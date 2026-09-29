// ---------------------------------------------------------------------------
// bubble.js - speech bubbles, drawn as pixel art.
//
// Every bubble is painted into a small canvas a pixel at a time, at the same
// chunky pixel size as the world, and scaled up with no smoothing. The tail is
// part of the shape, so the ink line runs round it without a seam. Each mood
// has its own body and its own way of moving:
//
//   talk     a soft round blob that breathes
//   happy    bouncier, with sparkles popping off its corners
//   sad      it droops at the bottom, goes a little blue, and drips
//   scared   the outline trembles and sweat flies off it
//   angry    red spikes, and steam
//   shout    big white spikes, shaking
//   think    a cloud of puffs, with little bubbles trailing to the head
//   whisper  small and dotted
//   scroll   narration: a strip of parchment with a rolled end each side
//
// Frames are cached (eight per shape), so a bubble costs one drawImage.
// ---------------------------------------------------------------------------
'use strict';

const Bubble = (() => {
  const PX = 2;                                     // screen pixels per bubble pixel
  const cache = new Map();
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const MOOD = {
    talk:    { fill: '#fffaea', shade: '#d6cfe0', ink: '#120c16', hi: '#ffffff' },
    happy:   { fill: '#fffaea', shade: '#f4d8a8', ink: '#120c16', hi: '#ffffff' },
    sad:     { fill: '#e8f0ff', shade: '#a8b8d8', ink: '#101f3d', hi: '#ffffff' },
    scared:  { fill: '#f6f0ff', shade: '#c8c0d8', ink: '#120c16', hi: '#ffffff' },
    angry:   { fill: '#fff0e4', shade: '#f4b098', ink: '#3f0e18', hi: '#ffffff' },
    shout:   { fill: '#fffaea', shade: '#e0d4b8', ink: '#120c16', hi: '#ffffff' },
    pow:     { fill: '#ffffff', shade: '#e8e4ee', ink: '#08060c', hi: '#ffffff' },
    think:   { fill: '#f4f8ff', shade: '#c8d4ea', ink: '#241c2e', hi: '#ffffff' },
    whisper: { fill: '#ece6f0', shade: '#c8c0cc', ink: '#574a66', hi: '#fffaea' },
    scroll:  { fill: '#e8dfc6', shade: '#c4b89a', ink: '#3a2415', hi: '#fffaea', roll: '#a88d62', rollD: '#6e5634' },
    dark:    { fill: '#2a1c24', shade: '#1a1016', ink: '#ffa832', hi: '#5c3a30' },
  };
  const tri = v => { const f = v - Math.floor(v); return 1 - Math.abs(f * 2 - 1); };
  const noise = (a, s) => Math.sin(a * 3.1 + s) * 0.5 + Math.sin(a * 7.3 + s * 1.7) * 0.3 + Math.sin(a * 13.1 + s * 0.3) * 0.2;

  // is (x, y) inside the body? coordinates relative to the centre, in bubble pixels
  function body(kind, x, y, a, b, f) {
    const th = Math.atan2(y / b, x / a), ph = f / 8 * Math.PI * 2;
    if (kind === 'pow') {
      // a sound-effect burst: few, long, uneven spikes that twitch
      const n = 9, u = th / (Math.PI * 2) * n, sp = tri(u) ** 1.6, jag = 0.12 * Math.sin(Math.floor(u) * 2.7 + f * 0.8);
      const r = 0.78 + sp * (0.42 + jag);
      return (x / a) ** 2 + (y / b) ** 2 <= r * r;
    }
    if (kind === 'shout' || kind === 'angry') {
      const n = kind === 'shout' ? 16 : 12, sp = tri(th / (Math.PI * 2) * n + (kind === 'angry' ? f * 0.06 : 0));
      const r = 0.86 + sp * (kind === 'shout' ? 0.3 : 0.24);
      return (x / a) ** 2 + (y / b) ** 2 <= r * r;
    }
    if (kind === 'think') {
      if ((x / (a * 0.86)) ** 2 + (y / (b * 0.78)) ** 2 <= 1) return true;
      const n = Math.max(7, Math.round((a + b) / 7));
      for (let i = 0; i < n; i++) {
        const t = i / n * Math.PI * 2, pr = b * 0.42 * (1 + 0.08 * Math.sin(ph + i * 1.7));
        const px = Math.cos(t) * a * 0.84, py = Math.sin(t) * b * 0.76;
        if ((x - px) ** 2 + (y - py) ** 2 <= pr * pr) return true;
      }
      return false;
    }
    if (kind === 'scroll') return Math.abs(x) <= a && Math.abs(y) <= b * (1 - 0.06 * Math.sin(x / a * Math.PI * 3 + ph));
    let n = 3.4, r = 1 + 0.02 * Math.sin(th * 5 + ph);
    let bb = b;
    if (kind === 'happy') r = 1 + 0.04 * Math.sin(th * 4 + ph * 2);
    if (kind === 'scared') r = 1 + 0.045 * noise(th * 3, f * 5.3);
    if (kind === 'sad' && y > 0) bb = b * (1 + 0.16 * (1 - Math.abs(x) / a));
    if (kind === 'whisper') n = 2.6;
    return Math.abs(x / a) ** n + Math.abs(y / bb) ** n <= r ** n;
  }

  // the canvas for one frame of one bubble; w, h are the body size on screen,
  // tail {x, y} relative to the body's top-left on screen (or null)
  function render(kind, w, h, tail, f) {
    const tx = tail ? Math.round(tail.x / PX) : 0, ty = tail ? Math.round(tail.y / PX) : 0;
    const key = kind + '|' + w + '|' + h + '|' + tx + '|' + ty + '|' + f;
    let cv = cache.get(key);
    if (cv) return cv;
    const C = MOOD[kind] || MOOD.talk;
    const M = 8;                                              // room round the body for spikes and puffs
    const bw = Math.ceil(w / PX), bh = Math.ceil(h / PX);
    const extra = tail ? Math.max(0, ty - bh) + 4 : 0;
    const CW = bw + M * 2, CH = bh + M * 2 + extra;
    const a = bw / 2, b = bh / 2, cx = M + a, cy = M + b;
    const mask = new Uint8Array(CW * CH);
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (body(kind, x + 0.5 - cx, y + 0.5 - cy, a, b, f)) mask[y * CW + x] = 1;
    // the tail: a tapering curve from the underside down to the speaker
    const blobs = [];
    if (tail && kind !== 'scroll') {
      const tipx = M + tx, tipy = M + ty;
      const bx = clamp(tipx, M + 6, M + bw - 6), by = cy + b * 0.6;
      const kx = lerp(bx, tipx, 0.2) + (tipx < cx ? 3 : -3), ky = lerp(by, tipy, 0.6);
      if (kind === 'think') {
        for (let i = 0; i < 3; i++) { const u = 0.35 + i * 0.27; blobs.push({ x: lerp(bx, tipx, u), y: lerp(by + 2, tipy, u), r: 3.2 - i * 0.9 }); }
      } else {
        for (let s = 0; s <= 30; s++) {
          const u = s / 30, x = (1 - u) ** 2 * bx + 2 * (1 - u) * u * kx + u * u * tipx, y = (1 - u) ** 2 * by + 2 * (1 - u) * u * ky + u * u * tipy;
          const r = lerp(kind === 'whisper' ? 2.6 : 4.2, 0.6, u);
          for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++) for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
            if (xx < 0 || yy < 0 || xx >= CW || yy >= CH) continue;
            if ((xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2 <= r * r) mask[yy * CW + xx] = 1;
          }
        }
      }
    }
    for (const B of blobs) for (let y = Math.floor(B.y - B.r); y <= Math.ceil(B.y + B.r); y++) for (let x = Math.floor(B.x - B.r); x <= Math.ceil(B.x + B.r); x++) {
      if (x < 0 || y < 0 || x >= CW || y >= CH) continue;
      if ((x + 0.5 - B.x) ** 2 + (y + 0.5 - B.y) ** 2 <= B.r * B.r) mask[y * CW + x] = 2;
    }
    const at = (x, y) => (x < 0 || y < 0 || x >= CW || y >= CH) ? 0 : mask[y * CW + x];
    cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
    const g = cv.getContext('2d'), img = g.createImageData(CW, CH), px = new Uint32Array(img.data.buffer);
    const put = (x, y, c, al = 255) => { px[y * CW + x] = ((al << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0; };
    const FILL = hex(C.fill), SH = hex(C.shade), INK = hex(C.ink), HI = hex(C.hi), DROP = [18, 12, 22];
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
      const m = at(x, y);
      if (m) {
        // fill, a shaded rim on the lower right, a dithered shine on the upper left
        const lowR = !at(x + 1, y) || !at(x, y + 1) || !at(x + 1, y + 1) || !at(x, y + 2);
        const upL = !at(x - 2, y) || !at(x, y - 2) || !at(x - 1, y - 1);
        let c = FILL;
        if (lowR) c = SH;
        else if (upL && (x - cx) < a * 0.1 && (y - cy) < 0 && ((x + y) & 1)) c = HI;
        if (kind === 'scroll' && (x - M < 5 || x - M > bw - 5)) c = (x & 1) === (y & 1) ? hex(C.roll) : hex(C.rollD);
        if (kind === 'scroll' && !lowR && BAY[((y & 3) << 2) | (x & 3)] > 13) c = SH;
        put(x, y, c);
        continue;
      }
      // the ink line, one bubble pixel thick (two on screen), and under it a
      // dithered drop shadow
      const edge = at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1);
      if (edge) {
        if (kind === 'whisper' && ((x + y + f) % 4) < 2) continue;
        put(x, y, INK);
      } else if ((at(x - 1, y - 2) || at(x - 2, y - 2)) && ((x + y) & 1)) put(x, y, DROP, 110);
    }
    g.putImageData(img, 0, 0);
    cv.ox = M * PX; cv.oy = M * PX;
    if (cache.size > 160) { let n = 40; for (const k of cache.keys()) { cache.delete(k); if (--n <= 0) break; } }
    cache.set(key, cv);
    return cv;
  }

  // draw a bubble whose body's top-left is (x, y) on screen
  function draw(kind, x, y, w, h, tail, t, o = {}) {
    const f = Math.floor(t * 8) % 8;
    const cv = render(kind, w, h, tail ? { x: tail.x - x, y: tail.y - y } : null, f);
    const ctx = Gfx.ctx;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cv, Math.round(x - cv.ox), Math.round(y - cv.oy), cv.width * PX, cv.height * PX);
    ctx.restore();
    // the moods that do something outside their own line
    if (kind === 'happy') for (let i = 0; i < 3; i++) {
      const q = (t * 1.3 + i / 3) % 1, sx = x + (i === 1 ? w + 4 : i === 0 ? -6 : w * 0.3), sy = y - 4 - q * 14 + (i === 2 ? -6 : 0);
      ctx.globalAlpha = Math.sin(q * Math.PI); star(sx, sy, i === 1 ? '#ffe98a' : '#ffb0cf'); ctx.globalAlpha = 1;
    }
    if (kind === 'sad') {
      const q = (t * 0.7) % 1;
      Gfx.rect(x + w * 0.5 - 1, y + h + 6 + q * 18, 3, 4, '#6aa9ee'); Gfx.rect(x + w * 0.5, y + h + 5 + q * 18, 1, 2, '#a8d8ff');
    }
    if (kind === 'scared') for (let i = 0; i < 2; i++) {
      const q = (t * 1.8 + i * 0.5) % 1, sx = x + (i ? w + 2 : -4) + (i ? 1 : -1) * q * 12, sy = y + 6 - q * 6 + q * q * 20;
      ctx.globalAlpha = 1 - q; Gfx.rect(sx, sy, 3, 4, '#6aa9ee'); Gfx.rect(sx, sy, 1, 1, '#ffffff'); ctx.globalAlpha = 1;
    }
    if (kind === 'angry') for (let i = 0; i < 2; i++) {
      const q = (t * 1.4 + i * 0.5) % 1, sx = (i ? x + w - 6 : x + 6) + (i ? 1 : -1) * q * 10, sy = y - 6 - q * 16, r = 3 + q * 5;
      ctx.globalAlpha = (1 - q) * 0.9; Gfx.circle(sx, sy, r + 1, '#574a66'); Gfx.circle(sx, sy, r, '#e8dfc6'); ctx.globalAlpha = 1;
    }
    void o;
  }
  function star(x, y, c) {
    Gfx.rect(x - 1, y - 4, 3, 9, '#120c16'); Gfx.rect(x - 4, y - 1, 9, 3, '#120c16');
    Gfx.rect(x, y - 3, 1, 7, c); Gfx.rect(x - 3, y, 7, 1, c); Gfx.rect(x - 1, y - 1, 3, 3, c);
  }
  // which mood a line is in, if nobody said
  function moodOf(text, o = {}) {
    if (o.mood) return o.mood;
    const plain = text.replace(/\{[^}]*\}/g, '');
    const L = plain.replace(/[^A-Za-z]/g, '');
    if (L.length > 3 && L.replace(/[^A-Z]/g, '').length / L.length > 0.7) return 'shout';
    if (/^\(/.test(plain)) return 'think';
    if (/^\.\.\./.test(plain) && plain.length < 40) return 'whisper';
    return 'talk';
  }
  return { draw, render, moodOf, star, MOOD, PX };
})();
