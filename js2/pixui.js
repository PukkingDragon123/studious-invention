// ---------------------------------------------------------------------------
// pixui.js - the interface, painted as pixel art.
//
// Every panel, plate, button and tooltip is a little picture of a real thing,
// painted a pixel at a time at the world's pixel size (two screen pixels) and
// cached by size: a slab of sandstone with a chiselled, uneven edge; a plate
// of obsidian with glassy streaks; a wooden plank lashed with rope; a piece
// of stitched hide; a bone frame. Nothing is a flat rectangle with rounded
// corners any more.
// ---------------------------------------------------------------------------
'use strict';

const PixUI = (() => {
  const PX = 2;
  const cache = new Map();
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const hash = (x, y, s) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  // ramps run dark to light; ink is the outline
  const MAT = {
    stone:    { ramp: ['#5c3a20', '#8a7f68', '#a89c80', '#c4b89a', '#d8cfb4', '#e8dfc6', '#fffaea'], ink: '#241109', base: 3.2 },
    obsidian: { ramp: ['#07050a', '#120c16', '#1a1320', '#241c2e', '#2e2538', '#3b3048', '#574a66'], ink: '#07050a', base: 2.2 },
    wood:     { ramp: ['#241109', '#3a2415', '#5c3a20', '#75401f', '#85562f', '#b07a45', '#d8a86b'], ink: '#140a05', base: 4.0 },
    woodhot:  { ramp: ['#3a2415', '#5c3a20', '#85562f', '#a3663a', '#b07a45', '#d8a86b', '#ffe0a8'], ink: '#241109', base: 4.2 },
    hide:     { ramp: ['#3a2415', '#5c3a20', '#75401f', '#85562f', '#a3663a', '#b07a45', '#d8a86b'], ink: '#140a05', base: 3.6 },
    bone:     { ramp: ['#5c503c', '#8a7f68', '#a89c80', '#c4b89a', '#dcd2b6', '#e8dfc6', '#fffaea'], ink: '#241c2e', base: 4.0 },
    red:      { ramp: ['#3f0e18', '#5c1420', '#7d1d2b', '#9c2a34', '#c2333c', '#e0404a', '#ef6a5e'], ink: '#1a060a', base: 3.4 },
  };
  function render(mat, bw, bh, o) {
    const hot = o.hot ? 1 : 0, seed = o.seed || 0;
    const key = mat + '|' + bw + '|' + bh + '|' + hot + '|' + seed + '|' + (o.cut ?? 2);
    let cv = cache.get(key); if (cv) return cv;
    const M = MAT[mat] || MAT.stone, R = M.ramp.map(hex), INK = hex(hot ? '#e0b93a' : M.ink), GOLD = hex('#ffe98a');
    const W = bw + 2, H = bh + 3;                 // room for the drop shadow
    // an uneven, chiselled edge: every column and row gives or takes a pixel
    const cut = o.cut ?? 2, rough = mat === 'stone' || mat === 'bone' || mat === 'hide';
    const T = [], B = [], L = [], Rr = [];
    for (let x = 0; x < bw; x++) { T[x] = rough && hash(x >> 1, 1, seed) > 0.7 ? 1 : 0; B[x] = rough && hash(x >> 1, 2, seed) > 0.75 ? 1 : 0; }
    for (let y = 0; y < bh; y++) { L[y] = rough && hash(3, y >> 1, seed) > 0.72 ? 1 : 0; Rr[y] = rough && hash(4, y >> 1, seed) > 0.72 ? 1 : 0; }
    const inside = (x, y) => {
      if (x < 0 || y < 0 || x >= bw || y >= bh) return false;
      if (y < T[x] || y >= bh - B[x] || x < L[y] || x >= bw - Rr[y]) return false;
      const dx = Math.min(x, bw - 1 - x), dy = Math.min(y, bh - 1 - y);
      return dx + dy >= cut;                     // cut corners, not rounded ones
    };
    cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d'), img = g.createImageData(W, H), px = new Uint32Array(img.data.buffer);
    const put = (x, y, c, a = 255) => { px[y * W + x] = ((a << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0; };
    // the shadow first, under everything, dithered
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) if (inside(x, y) && ((x + y) & 1)) put(x + 1, y + 2, [0, 0, 0], 120);
    const n2 = (x, y) => Math.sin(x * 0.19 + seed) * 0.5 + Math.sin(y * 0.31 - x * 0.07 + seed * 2) * 0.4 + Math.sin((x + y) * 0.53) * 0.2;
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      if (edge) { put(x, y, INK); continue; }
      const top = !inside(x, y - 2) || !inside(x - 1, y - 1), left = !inside(x - 2, y);
      const bot = !inside(x, y + 2) || !inside(x + 1, y + 1), right = !inside(x + 2, y);
      let lv = M.base - y / bh * 0.8;
      if (top || left) lv += 1.6; else if (bot || right) lv -= 1.5;
      const d = (BAY[((y & 3) << 2) | (x & 3)] + 0.5) / 16 - 0.5;
      if (mat === 'stone' || mat === 'bone') {
        lv += n2(x, y) * 0.55;
        if (hash(x, y, seed + 7) > 0.97) lv -= 1.2;                                  // pits
        if (hash(x >> 2, y >> 2, seed + 3) > 0.94 && hash(x, y, seed) > 0.5) lv -= 0.7;  // weathering
      } else if (mat === 'obsidian') {
        const streak = ((x - y * 1.6 + seed * 13) % 40 + 40) % 40;               // glassy streaks
        if (streak < 2 && y < bh * 0.6) lv += 1.8;
        else if (streak < 4 && y < bh * 0.6) lv += 0.8;
        lv += n2(x * 0.5, y) * 0.3;
      } else if (mat === 'wood' || mat === 'woodhot') {
        const grain = Math.sin(y * 1.3 + Math.sin(x * 0.09 + seed) * 2.2);
        lv += grain > 0.82 ? -1.1 : grain < -0.9 ? 0.6 : 0;
        if (hash(x >> 3, y >> 2, seed + 11) > 0.97) lv -= 1.4;                      // a knot
      } else if (mat === 'hide') {
        lv += (hash(x, y, seed) - 0.5) * 0.9;
      } else if (mat === 'red') lv += n2(x, y) * 0.4;
      let c = R[clamp(Math.floor(lv + d * 0.9 + 0.5), 0, R.length - 1)];
      // stitches round the hide, rope round the ends of a plank
      if (mat === 'hide' && (x === 3 || x === bw - 4 || y === 3 || y === bh - 4) && ((x + y) % 4 < 2) && x > 2 && y > 2 && x < bw - 3 && y < bh - 3) c = hex('#e8dfc6');
      if ((mat === 'wood' || mat === 'woodhot') && bw > 30 && ((x >= 5 && x <= 7) || (x >= bw - 8 && x <= bw - 6))) c = ((x + y) & 1) ? hex('#c4b89a') : hex('#8a7f68');
      if (hot && (top || left) && !edge && (x + y) % 3 === 0) c = GOLD;
      put(x, y, c);
    }
    // a crack or two across big stone
    if ((mat === 'stone') && bw > 40 && bh > 24) for (let k = 0; k < 2; k++) {
      let cx = 6 + Math.floor(hash(k, 9, seed) * (bw - 12)), cy = 3;
      while (cy < bh - 4) {
        if (inside(cx, cy) && inside(cx + 1, cy)) { put(cx, cy, R[1]); if ((cx + cy) & 1) put(cx + 1, cy, R[5]); }
        cy++; cx += hash(cx, cy, seed + k) > 0.66 ? 1 : hash(cx, cy, seed + k + 5) > 0.66 ? -1 : 0;
        if (hash(cx, cy, k) > 0.93) break;
      }
    }
    // moss in the lower corners of stone
    if (mat === 'stone' && o.moss !== false) for (let i = 0; i < bw * 0.25; i++) {
      const x = Math.floor(hash(i, 5, seed) * bw), y = bh - 3 - Math.floor(hash(i, 6, seed) * 3);
      if (inside(x, y) && (x < bw * 0.25 || x > bw * 0.75)) put(x, y, hex(hash(i, 7, seed) > 0.5 ? '#3f9a45' : '#27632f'));
    }
    g.putImageData(img, 0, 0);
    if (cache.size > 400) { let n = 80; for (const k of cache.keys()) { cache.delete(k); if (--n <= 0) break; } }
    cache.set(key, cv);
    return cv;
  }
  // draw a panel whose top-left is (x, y) and size w x h, in screen pixels
  function panel(mat, x, y, w, h, o = {}) {
    const bw = Math.max(4, Math.round(w / PX)), bh = Math.max(4, Math.round(h / PX));
    const cv = render(mat, bw, bh, o);
    const ctx = Gfx.ctx;
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cv, Math.round(x), Math.round(y), cv.width * PX, cv.height * PX);
    ctx.imageSmoothingEnabled = sm;
    return { x, y, w: bw * PX, h: bh * PX };
  }
  // a gem set into a panel, faceted, as a mark of colour
  function stud(x, y, col) {
    const c = hex(col);
    Gfx.rect(x - 2, y - 4, 4, 8, '#120c16'); Gfx.rect(x - 4, y - 2, 8, 4, '#120c16');
    Gfx.rect(x - 2, y - 2, 4, 4, col);
    Gfx.rect(x - 2, y - 2, 2, 2, `rgb(${Math.min(255, c[0] + 90)},${Math.min(255, c[1] + 90)},${Math.min(255, c[2] + 90)})`);
  }
  return { panel, render, stud, MAT, PX };
})();
