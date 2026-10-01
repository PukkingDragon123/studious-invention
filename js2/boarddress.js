// ---------------------------------------------------------------------------
// boarddress.js - the small life of the land.
//
// The baked ground is the floor; this is what grows on it and lives in it.
// Ferns and grass tufts and flower clumps everywhere the road is not, reeds
// and cattails along the river banks, lily pads and wet rocks in the water
// with the current foaming round them. And the things that live there:
// butterflies and bees round the flowers, dragonflies over the water, frogs
// that plop into the river when you come near, skinks that dart, beetles and
// snails that do not, little birds that peck about and fly off. Everything is
// placed from the board's seed, so the land is the same every time you come
// back to it, and everything sways or rustles when you walk through it.
// ---------------------------------------------------------------------------
'use strict';

const BoardDress = (() => {
  // ------------------------------------------------------------ palettes
  const PAL = {
    1: { leaf: ['#123018', '#1f5226', '#2f7a34', '#52a446', '#8fd060'], tuft: ['#1f5226', '#3f8a3c', '#78bc54', '#a8e078'], flowers: ['#ff8ab8', '#ffe066', '#fffaea', '#b890f0', '#ff6a4a'], rock: ['#3b3a4a', '#555468', '#727088', '#9290a6', '#b4b2c6'], moss: '#4f9642' },
    2: { leaf: ['#062016', '#0c3a24', '#165a34', '#2a8044', '#5ab45a'], tuft: ['#0c3a24', '#1f6a38', '#3f9a4a', '#6ac860'], flowers: ['#ff5aa8', '#ffa832', '#86e8d2', '#ff3a5a'], rock: ['#2a3034', '#3a4446', '#4e5c5c', '#6a7a76', '#8a9c94'], moss: '#2a8044' },
    3: { leaf: ['#3a2a14', '#5a4420', '#7c642e', '#a08a42', '#c8b462'], tuft: ['#5a4420', '#8a7438', '#b29c4e', '#d4c06a'], flowers: ['#ffe066', '#fffaea', '#ff8a4a'], rock: ['#5a3a26', '#74503a', '#8e684c', '#aa8462', '#c8a27c'], moss: null },
    4: { leaf: ['#1a2a2c', '#2a403e', '#3e5a54', '#5e7c72', '#a8c4bc'], tuft: ['#2a403e', '#4a625a', '#7a948a', '#c8dcd8'], flowers: ['#a8d8ff', '#fffaea', '#c8b0ff'], rock: ['#3a4258', '#525c76', '#6e7a96', '#94a0ba', '#dce6f4'], moss: '#f0f6ff' },
    5: { leaf: ['#0e080c', '#1e1218', '#2e1c24', '#422a32', '#5a3a40'], tuft: ['#1e1218', '#3a2630', '#5a3a44', '#7a4a50'], flowers: ['#ffa832', '#e06a1b'], rock: ['#140e14', '#241a22', '#362630', '#4a3440', '#5e4450'], moss: null },
  };
  const INK = '#120c16';
  // --------------------------------------------------------------- sprites
  // world pixels: one painted pixel is one board unit
  function fern(b, v) {
    const L = PAL[b].leaf, w = 30, h = 20;
    return Pix.make(`dr_fern${b}_${v}`, w, h, P => {
      const n = 6 + (v % 3), bx = w / 2, by = h - 1;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1), a = -Math.PI + 0.25 + u * (Math.PI - 0.5), len = 9 + ((i * 7 + v * 3) % 5) + (Math.abs(u - 0.5) < 0.2 ? 3 : 0);
        const bend = (u - 0.5) * 1.1;
        let x = bx, y = by;
        for (let k = 0; k < len; k++) {
          const t = k / len, ang = a + bend * t * t;
          x += Math.cos(ang); y += Math.sin(ang) * 0.85;
          const col = L[Math.min(4, 1 + Math.floor(t * 3.4))];
          P.put(x, y, col);
          // leaflets, shrinking to the tip
          const s = Math.max(1, Math.round((1 - t) * 3.2));
          if (k % 2 === 0) for (let j = 1; j <= s; j++) {
            P.put(x + Math.cos(ang - 1.25) * j, y + Math.sin(ang - 1.25) * j, j === s ? L[Math.min(4, 2 + Math.floor(t * 2.5))] : col);
            P.put(x + Math.cos(ang + 1.25) * j, y + Math.sin(ang + 1.25) * j, L[Math.max(0, Math.min(4, Math.floor(t * 3.4)))]);
          }
        }
      }
      P.rect(bx - 2, by - 1, 4, 2, L[0]);
    }, { ink: L[0] });
  }
  function tuft(b, v) {
    const T = PAL[b].tuft, w = 14, h = 11;
    return Pix.make(`dr_tuft${b}_${v}`, w, h, P => {
      const n = 6 + (v % 3);
      for (let i = 0; i < n; i++) {
        const x0 = 3 + (i * 8 / n) + (P.hash(i, v, 3) - 0.5) * 2, lean = (x0 - w / 2) * 0.18 + (P.hash(i, v, 5) - 0.5) * 0.6, len = 5 + Math.floor(P.hash(i, v, 7) * 5);
        for (let k = 0; k < len; k++) P.put(x0 + lean * k * (1 + k * 0.05), h - 1 - k, T[Math.min(3, Math.floor(k / len * 4))]);
      }
    }, { ink: false });
  }
  function flowers(b, v) {
    const F = PAL[b].flowers, T = PAL[b].tuft, w = 16, h = 12;
    return Pix.make(`dr_flow${b}_${v}`, w, h, P => {
      P.ball(5, 9, 4, [T[0], T[1], T[1], T[2], T[2]], 2.5); P.ball(11, 9.5, 3.5, [T[0], T[1], T[1], T[2], T[2]], 2.2);
      const n = 3 + (v % 3), col = F[v % F.length], col2 = F[(v + 2) % F.length];
      for (let i = 0; i < n; i++) {
        const x = 3 + Math.round(i * 10 / Math.max(1, n - 1) + (P.hash(i, v, 2) - 0.5) * 2), y = 2 + Math.round(P.hash(i, v, 4) * 4);
        P.line(x, y + 1, x + (P.hash(i, v, 6) > 0.5 ? 1 : 0), 9, T[1]);
        const c = i % 3 === 2 ? col2 : col;
        P.put(x - 1, y, c); P.put(x + 1, y, c); P.put(x, y - 1, c); P.put(x, y + 1, c);
        P.put(x, y, i % 2 ? '#ffe066' : '#fffaea');
      }
    }, { ink: T[0] });
  }
  function reeds(b, v) {
    const T = PAL[b].tuft, w = 14, h = 28;
    return Pix.make(`dr_reed${b}_${v}`, w, h, P => {
      const n = 5 + (v % 2);
      for (let i = 0; i < n; i++) {
        const x0 = 2 + i * 10 / n + P.hash(i, v, 1) * 2, len = 12 + Math.floor(P.hash(i, v, 2) * 14), lean = (P.hash(i, v, 3) - 0.5) * 0.25;
        for (let k = 0; k < len; k++) P.put(x0 + lean * k, h - 1 - k, T[Math.min(3, Math.floor(k / len * 3.5))]);
        // a cattail head on the tall ones
        if (len > 19 && i % 2 === 0) { const hx = x0 + lean * (len - 4), hy = h - len + 1; P.rect(Math.round(hx) - 1, hy, 3, 5, '#5a3a1e'); P.put(Math.round(hx) - 1, hy, '#7a5230'); P.put(Math.round(hx), hy - 1, T[2]); P.put(Math.round(hx), hy - 2, T[2]); }
      }
      // a curling leaf blade or two
      for (let k = 0; k < 10; k++) P.put(4 + k * 0.7, h - 1 - k * 1.1 + k * k * 0.06, T[1]);
    }, { ink: T[0] });
  }
  function lily(b, v) {
    const w = 14, h = 8;
    return Pix.make(`dr_lily${b}_${v}`, w, h, P => {
      const G = ['#164a2a', '#1f6a34', '#2f8a3e', '#52a84e', '#86c860'];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = (x + 0.5 - 7) / 6.5, dy = (y + 0.5 - 4) / 3.2, d = dx * dx + dy * dy;
        if (d > 1) continue;
        if (dx > 0 && Math.abs(dy) < dx * 0.45) continue;                    // the notch
        P.put(x, y, G[d > 0.75 ? (dy < 0 ? 3 : 1) : 2 + (P.hash(x, y, v) > 0.85 ? 1 : 0)]);
      }
      if (v % 3 === 0) { P.put(5, 2, '#ff8ab8'); P.put(4, 3, '#ff8ab8'); P.put(6, 3, '#ff8ab8'); P.put(5, 1, '#ffd0e4'); P.put(5, 3, '#ffe066'); }
    }, { ink: '#0c2a18' });
  }
  function rock(b, v, wet) {
    const Rk = PAL[b].rock, w = 18 + (v % 2) * 4, h = 11 + (v % 2) * 2;
    return Pix.make(`dr_rock${b}_${v}_${wet ? 1 : 0}`, w, h, P => {
      P.ball(w / 2, h * 0.58, w / 2 - 1, Rk, h * 0.5);
      if (v % 3 === 1) P.ball(w * 0.3, h * 0.72, w * 0.2, Rk, h * 0.3);
      // moss or frost on top, a wet dark line at the waterline
      const m = PAL[b].moss;
      if (m) for (let x = 2; x < w - 2; x++) { const top = Math.round(h * 0.58 - (h * 0.5) * Math.sqrt(Math.max(0, 1 - ((x + 0.5 - w / 2) / (w / 2 - 1)) ** 2))); if (P.hash(x, v, 9) > 0.35) { P.put(x, top + 1, m); if (P.hash(x, v, 8) > 0.6) P.put(x, top + 2, m); } }
      if (wet) for (let x = 1; x < w - 1; x++) P.put(x, h - 2, Rk[0]);
    }, { ink: INK });
  }
  function pebbles(b, v) {
    const Rk = PAL[b].rock;
    return Pix.make(`dr_peb${b}_${v}`, 12, 6, P => { P.ball(3, 3.5, 2.4, Rk, 1.8); P.ball(7.5, 4, 2, Rk, 1.5); if (v % 2) P.ball(10, 3.5, 1.4, Rk, 1.2); }, { ink: INK });
  }
  function shrooms(v) {
    return Pix.make(`dr_shroom${v}`, 12, 10, P => {
      const C = v % 2 ? ['#5a1a14', '#8a2a1e', '#c23a2a', '#ef6a4e', '#ffb090'] : ['#5a3a1e', '#7a5230', '#a8743e', '#d0a060', '#f0d090'];
      const caps = [[4, 5, 3.4], [8.5, 6.5, 2.4]];
      for (const [x, y] of caps) P.rect(x - 0.5, y, 2, 10 - y, '#e8dfc6');
      for (const [x, y, r] of caps) { P.ball(x, y, r, C, r * 0.62); if (v % 2) { P.put(x - 1, y - 1, '#fffaea'); P.put(x + 1, y, '#fffaea'); } }
    }, { ink: INK });
  }
  function logSpr(b) {
    return Pix.make(`dr_log${b}`, 32, 11, P => {
      const B = b === 4 ? ['#2a2028', '#3e2e30', '#54403a', '#6e5444', '#8a6c52'] : ['#2a1a10', '#45291a', '#623c24', '#855430', '#a87042'];
      P.tube(4, 6, 28, 6, 4.2, 4.2, B);
      for (let y = 2; y < 10; y++) for (let x = 25; x < 31; x++) { const d = ((x - 28) / 3) ** 2 + ((y - 6) / 4) ** 2; if (d < 1) P.put(x, y, d < 0.3 ? '#8a6c52' : d < 0.65 ? '#c8a070' : '#e0bc88'); }
      if (PAL[b].moss) for (let x = 5; x < 24; x++) if (P.hash(x, 1, 2) > 0.4) P.put(x, 2 + (P.hash(x, 2, 3) > 0.5 ? 1 : 0), PAL[b].moss);
      if (b === 4) for (let x = 5; x < 26; x++) P.put(x, 2, '#f0f6ff');
    }, { ink: INK });
  }
  function bone(v) {
    return Pix.make(`dr_bone${v}`, 18, 12, P => {
      const B = ['#8a7f68', '#a89c80', '#c4b89a', '#e8dfc6', '#fffaea'];
      if (v % 2) { for (let i = 0; i < 3; i++) for (let k = 0; k < 9; k++) P.put(4 + i * 4 + Math.sin(k * 0.3) * 2, 11 - k, B[2 + (k > 5 ? 1 : 0)]); }
      else { P.tube(2, 9, 15, 7, 1.4, 1.4, B); P.ball(2, 9, 2, B); P.ball(15, 7, 2, B); }
    }, { ink: INK });
  }
  // little critters, painted once
  function frogSpr(b, f) {
    const G = b === 2 ? ['#3a0a10', '#7a1420', '#c2283a', '#ef5a5a', '#ff9a8a'] : ['#163a18', '#265c22', '#3f8a32', '#6cba4a', '#a8e078'];
    return Pix.make(`dr_frog${b}_${f}`, 11, 8, P => {
      if (f === 0) { P.ball(5.5, 5, 4, G, 2.8); P.ball(3.5, 2.8, 1.4, G); P.ball(7.5, 2.8, 1.4, G); P.rect(1, 6, 2, 2, G[1]); P.rect(8, 6, 2, 2, G[1]); }
      else { P.ball(5.5, 4, 3.6, G, 2.4); P.ball(3.8, 2, 1.3, G); P.ball(7.4, 2, 1.3, G); P.line(1, 5, 0, 7, G[1]); P.line(10, 5, 11, 7, G[1]); }
      P.put(3.5, 2.5, INK); P.put(7.5, 2.5, INK); P.put(f ? 3.8 : 3.5, f ? 1.6 : 2, INK); P.put(f ? 7.4 : 7.5, f ? 1.6 : 2, INK);
    }, { ink: INK });
  }
  function birdSpr(b, f) {
    const C = b === 4 ? ['#3a3a4a', '#6a6a7a', '#c8c8d4', '#f0f0f8'] : b === 3 ? ['#4a2a14', '#7a4a24', '#a86a34', '#d8a060'] : ['#2a2a40', '#3a5a9a', '#6a9ae0', '#ffe066'];
    return Pix.make(`dr_bird${b}_${f}`, 10, 8, P => {
      P.ball(5, 4.5, 3.2, [C[0], C[1], C[1], C[2], C[2]], 2.4); P.ball(7.5, 2.8, 1.8, [C[0], C[1], C[2], C[2], C[3]]);
      P.put(9.5, 3, '#ffa832'); P.put(8, 2.4, INK);
      P.rect(1, 3, 2, 2, C[0]);
      if (f) { P.line(3, 4, 1, 0, C[2]); P.line(5, 4, 4, 0, C[2]); }                  // wings up
      P.put(4, 8, '#ffa832'); P.put(6, 8, '#ffa832');
    }, { ink: INK });
  }
  function snailSpr() {
    return Pix.make('dr_snail', 9, 6, P => {
      P.rect(0, 4, 9, 2, '#c8b49a'); P.put(8, 2, '#c8b49a'); P.put(8, 3, '#c8b49a');
      P.ball(4, 3, 2.8, ['#4a2a14', '#7a4a24', '#a86a34', '#d8a060', '#f0d090']);
      P.put(4, 3, '#4a2a14'); P.put(5, 2, '#4a2a14');
    }, { ink: INK });
  }
  // --------------------------------------------------------------- placing
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function build(B) {
    const bd = B.board, b = B.bd.biome, R = rng((bd.seed || 7) * 31 + b * 977), T = B.T;
    const rivers = (bd.feats || []).filter(f => f.type === 'river' && f.cx), lavas = (bd.feats || []).filter(f => f.type === 'lava' && f.cx);
    const segs = []; for (const t of T) for (const n of t.next) segs.push([t.x, t.y, T[n].x, T[n].y]);
    const placed = [];
    const nearRoad = (x, y, r) => {
      for (const t of T) { const dx = t.x - x, dy = (t.y - y) * 1.6; if (dx * dx + dy * dy < (t.big ? r + 12 : r) ** 2) return true; }
      for (const s of segs) {
        const vx = s[2] - s[0], vy = s[3] - s[1], L2 = vx * vx + vy * vy, k = clamp(((x - s[0]) * vx + (y - s[1]) * vy) / (L2 || 1), 0, 1);
        const dx = s[0] + vx * k - x, dy = (s[1] + vy * k - y) * 1.5; if (dx * dx + dy * dy < (r * 0.5) ** 2) return true;
      }
      return false;
    };
    // a standing thing just in front of a tile must not reach up over it
    const hides = (x, y, h) => { for (const t of T) if (Math.abs(t.x - x) < (t.big ? 52 : 42) && t.y < y + 4 && t.y > y - h - 18) return true; return false; };
    const water = (x, y, pad = 0) => { for (const f of rivers.concat(lavas)) if (Math.abs(x - f.cx(y)) < f.hw(y) + pad) return f; return null; };
    const nearProp = (x, y, r) => { for (const p of bd.props) { const dx = p.x - x, dy = (p.y - y) * 1.5; if (dx * dx + dy * dy < r * r) return true; } return false; };
    const crowd = (x, y, r) => { for (const p of placed) { const dx = p.x - x, dy = (p.y - y) * 1.6; if (dx * dx + dy * dy < r * r) return true; } return false; };
    const Y0 = HORIZON + 26, Y1 = BOARD_H - 30, W = bd.w;
    const put = (o) => { placed.push(o); return o; };
    const land = (r) => {
      for (let k = 0; k < 8; k++) {
        const x = R() * W, y = Y0 + R() * (Y1 - Y0);
        if (water(x, y, 14) || nearRoad(x, y, r + 18) || nearProp(x, y, r + 8) || crowd(x, y, r) || (r > 8 && hides(x, y, r * 1.6))) continue;
        return { x, y };
      }
      return null;
    };
    const P = PAL[b];
    // ferns, tufts, flowers, pebbles, mushrooms, logs, bones: thick, but never on the road
    const N = W / 7;
    for (let i = 0; i < N; i++) {
      const roll = R();
      let kind;
      if (b === 3) kind = roll < 0.42 ? 'tuft' : roll < 0.6 ? 'pebbles' : roll < 0.74 ? 'bone' : roll < 0.86 ? 'fern' : roll < 0.95 ? 'rock' : 'flowers';
      else if (b === 5) kind = roll < 0.4 ? 'tuft' : roll < 0.62 ? 'pebbles' : roll < 0.78 ? 'rock' : roll < 0.9 ? 'bone' : 'fern';
      else if (b === 4) kind = roll < 0.36 ? 'tuft' : roll < 0.54 ? 'fern' : roll < 0.7 ? 'pebbles' : roll < 0.84 ? 'rock' : roll < 0.92 ? 'flowers' : 'log';
      else kind = roll < 0.3 ? 'fern' : roll < 0.56 ? 'tuft' : roll < 0.76 ? 'flowers' : roll < 0.85 ? 'pebbles' : roll < 0.92 ? 'shrooms' : roll < 0.97 ? 'rock' : 'log';
      const r = kind === 'log' ? 22 : kind === 'fern' ? 13 : kind === 'rock' ? 12 : 8;
      const at = land(r); if (!at) continue;
      const v = (R() * 6) | 0;
      const spr = kind === 'fern' ? fern(b, v) : kind === 'tuft' ? tuft(b, v) : kind === 'flowers' ? flowers(b, v) : kind === 'pebbles' ? pebbles(b, v) : kind === 'shrooms' ? shrooms(v) : kind === 'rock' ? rock(b, v % 3, false) : kind === 'bone' ? bone(v) : logSpr(b);
      put({ kind, x: at.x, y: at.y, spr, flip: R() < 0.5, ph: R() * 6, sway: kind === 'fern' ? 1 : kind === 'tuft' || kind === 'flowers' ? 0.7 : 0, flat: kind === 'pebbles' || kind === 'bone' && v % 2 === 0, rustle: 0, sc: kind === 'fern' && R() < 0.3 ? 1.3 : 1 });
    }
    // the river: reeds along the banks, lily pads and rocks in the water
    for (const f of rivers) {
      for (let y = Y0 - 10; y < BOARD_H; y += 7 + R() * 8) {
        const cx = f.cx(y), hw = f.hw(y);
        for (const side of [-1, 1]) {
          if (R() < 0.5) {
            const x = cx + side * (hw + 4 + R() * 9);
            if (!nearRoad(x, y, 22) && !crowd(x, y, 7) && !hides(x, y, 26)) put({ kind: R() < 0.6 ? 'reeds' : 'tuft', x, y, spr: R() < 0.6 ? reeds(b, (R() * 4) | 0) : tuft(b, (R() * 6) | 0), flip: R() < 0.5, ph: R() * 6, sway: 1.2, rustle: 0, sc: 1 });
          }
          if (R() < 0.18) { const x = cx + side * (hw + 7 + R() * 6); if (!nearRoad(x, y, 18) && !crowd(x, y, 9)) put({ kind: 'rock', x, y: y + 2, spr: rock(b, (R() * 3) | 0, true), flip: R() < 0.5, ph: 0, sway: 0, rustle: 0, sc: 1 }); }
        }
        if (R() < 0.28 && !nearRoad(cx, y, 24)) {
          const x = cx + (R() - 0.5) * hw * 1.2;
          if (R() < 0.55 && b !== 3 && b !== 5) put({ kind: 'lily', x, y, spr: lily(b, (R() * 6) | 0), flip: R() < 0.5, ph: R() * 6, sway: 0, flat: true, water: true, sc: 1 });
          else put({ kind: 'wrock', x, y, spr: rock(b, (R() * 3) | 0, true), flip: R() < 0.5, ph: R() * 6, sway: 0, flat: true, water: true, sc: 0.8 });
        }
      }
    }
    // ------------------------------------------------------------ critters
    const crit = [];
    const flowersAt = placed.filter(p => p.kind === 'flowers');
    const banks = []; for (const f of rivers) for (let y = Y0; y < BOARD_H - 20; y += 22) for (const side of [-1, 1]) { const x = f.cx(y) + side * (f.hw(y) + 6); if (!nearRoad(x, y, 20)) banks.push({ x, y, f, side }); }
    const count = (n) => Math.round(n * W / 3000);
    const flyers = b === 1 ? count(14) : b === 2 ? count(12) : b === 4 ? count(3) : b === 3 ? count(4) : 0;
    for (let i = 0; i < flyers; i++) {
      const home = flowersAt.length ? flowersAt[(R() * flowersAt.length) | 0] : land(6); if (!home) continue;
      const bee = R() < 0.3 && b < 3;
      const cols = b === 2 ? ['#3a8aff', '#86e8d2', '#ff5aa8'] : b === 4 ? ['#fffaea', '#a8d8ff'] : b === 3 ? ['#ffe066', '#ff8a4a'] : ['#ffe066', '#ff8ab8', '#fffaea', '#ff8a3a', '#b890f0', '#6aa9ee'];
      crit.push({ type: bee ? 'bee' : 'fly', hx: home.x, hy: home.y - 6, x: home.x, y: home.y - 10, ph: R() * 6, col: cols[(R() * cols.length) | 0], spd: 0.6 + R() * 0.5, flee: 0, z: 10 });
    }
    if (rivers.length && b !== 3 && b !== 5) for (let i = 0; i < count(b === 4 ? 2 : 8); i++) { const f = rivers[(R() * rivers.length) | 0], y = Y0 + R() * (Y1 - Y0); crit.push({ type: 'dragon', f, x: f.cx(y), y, tx: f.cx(y), ty: y, t: R() * 2, ph: R() * 6, col: R() < 0.5 ? '#3ac8e8' : '#e8483a' }); }
    if (b !== 3 && b !== 5 && b !== 4) for (let i = 0; i < count(10) && banks.length; i++) { const k = banks[(R() * banks.length) | 0]; crit.push({ type: 'frog', x: k.x + (R() - 0.5) * 6, y: k.y + (R() - 0.5) * 10, home: k, t: 2 + R() * 6, hop: 0, gone: 0, face: -k.side, croak: R() * 8 }); }
    for (let i = 0; i < count(b === 4 ? 4 : 10); i++) { const a = land(4); if (a) crit.push({ type: 'beetle', x: a.x, y: a.y, a: R() * 6, t: R() * 3, col: b === 5 ? '#ff6a1a' : b === 3 ? '#2a5a8a' : R() < 0.5 ? '#3a8a4a' : '#7a3aaa', walk: 0 }); }
    if (b === 1 || b === 2) for (let i = 0; i < count(6); i++) { const a = land(4); if (a) crit.push({ type: 'snail', x: a.x, y: a.y, face: R() < 0.5 ? 1 : -1 }); }
    if (b !== 4) for (let i = 0; i < count(8); i++) { const a = land(6); if (a) crit.push({ type: 'skink', x: a.x, y: a.y, tx: a.x, ty: a.y, t: R() * 4, face: 1, col: b === 5 ? ['#7d1d2b', '#e06a1b'] : b === 3 ? ['#8a5a2a', '#d8a060'] : ['#1f6a5a', '#5ac8a8'], run: 0 }); }
    if (b !== 5) for (let i = 0; i < count(9); i++) { const a = land(6); if (a) crit.push({ type: 'bird', x: a.x, y: a.y, z: 0, t: R() * 3, face: R() < 0.5 ? 1 : -1, peck: 0, fly: 0, vx: 0, vz: 0, gone: 0, hx: a.x, hy: a.y }); }
    if (b === 2 || b === 5) for (let i = 0; i < count(18); i++) { const a = land(4); if (a) crit.push({ type: b === 5 ? 'ember' : 'firefly', x: a.x, y: a.y - 6 - R() * 20, ph: R() * 6, hx: a.x, hy: a.y }); }
    // the water's own movement: sparkles and the odd ripple
    const glints = [];
    for (const f of rivers) for (let y = Y0 - 6; y < BOARD_H; y += 5) if (R() < 0.5) glints.push({ f, y, u: (R() - 0.5) * 1.6, ph: R() * 6 });
    return { placed, crit, glints, rings: [], R, b };
  }
  // ---------------------------------------------------------------- update
  function update(B, dt) {
    if (!B.board) return;
    if (!B.dress || B.dress.key !== B.board.key) { B.dress = build(B); B.dress.key = B.board.key; }
    const D = B.dress, me = B.me, R = Math.random, t = Time.t;
    const camX = B.cam.x, span = W / (2 * BZ) + 80;
    // you brush through the plants as you go
    for (const p of D.placed) {
      if (!p.sway || Math.abs(p.x - camX) > span) continue;
      const dx = p.x - me.x, dy = (p.y - me.y) * 1.5;
      if (dx * dx + dy * dy < 22 * 22 && Math.abs(me.vx) > 10) p.rustle = Math.min(1, p.rustle + dt * 6);
      p.rustle = Math.max(0, p.rustle - dt * 1.6);
    }
    for (const c of D.crit) {
      if (Math.abs(c.x - camX) > span + 60) continue;
      const dx = c.x - me.x, dy = c.y - me.y, near = dx * dx + dy * dy < 48 * 48;
      if (c.type === 'fly' || c.type === 'bee') {
        // flutter round the flowers; scatter up and away from you
        if (near) c.flee = 2;
        c.flee = Math.max(0, c.flee - dt);
        const f = c.flee > 0 ? 1 : 0, sp = c.type === 'bee' ? 3 : c.spd;
        const ox = Math.sin(t * sp + c.ph) * (c.type === 'bee' ? 9 : 26) + Math.sin(t * sp * 2.3 + c.ph * 2) * 6;
        const oy = Math.cos(t * sp * 1.4 + c.ph) * (c.type === 'bee' ? 4 : 8);
        c.x = damp(c.x, c.hx + ox + f * Math.sign(dx || 1) * 50, 2.5, dt); c.y = damp(c.y, c.hy + oy, 2.5, dt);
        c.z = damp(c.z, 12 + f * 34 + Math.sin(t * 2 + c.ph) * 4, 3, dt);
      } else if (c.type === 'dragon') {
        // hover, dart, hover
        c.t -= dt;
        if (c.t <= 0) { c.t = 0.6 + R() * 1.8; c.ty = clamp(c.y + (R() - 0.5) * 80, HORIZON + 30, BOARD_H - 30); c.tx = c.f.cx(c.ty) + (R() - 0.5) * c.f.hw(c.ty) * 2.2; }
        c.x = damp(c.x, c.tx, 7, dt); c.y = damp(c.y, c.ty, 7, dt);
      } else if (c.type === 'frog') {
        c.t -= dt; c.croak -= dt;
        if (c.croak <= 0) c.croak = 4 + R() * 9;
        if (c.gone > 0) { c.gone -= dt; if (c.gone <= 0) { c.x = c.home.x; c.y = c.home.y; c.hop = 0; } continue; }
        if (c.hop > 0) {
          c.hop -= dt / 0.4; c.x += c.hvx * dt; c.y += c.hvy * dt;
          if (c.hop <= 0) { c.hop = 0; if (c.dive) { c.gone = 5 + R() * 6; c.dive = false; D.rings.push({ x: c.x, y: c.y, t: 0 }); if (Math.abs(c.x - camX) < span) Particles.spawn(c.x, c.y, { n: 5, color: ['#a8d8ff', '#ffffff'], speed: 50, angle: -Math.PI / 2, spread: 1, gravity: 300, life: 0.4, size: 2 }); } }
        } else if (near) {
          // plop: into the river
          const f = c.home.f, tx = f.cx(c.y); c.dive = true; c.hop = 1; c.hvx = (tx - c.x) / 0.4; c.hvy = 0; c.face = Math.sign(tx - c.x) || 1;
        } else if (c.t <= 0) { c.t = 3 + R() * 7; c.hop = 1; const a = (R() - 0.5) * 16; c.hvx = a / 0.4; c.hvy = (R() - 0.5) * 10 / 0.4; c.face = Math.sign(a) || c.face; }
      } else if (c.type === 'beetle') {
        c.t -= dt;
        if (c.t <= 0) { c.t = 1 + R() * 3; c.walk = R() < 0.6 ? 1 : 0; c.a += (R() - 0.5) * 2.4; }
        if (c.walk) { c.x += Math.cos(c.a) * 7 * dt; c.y = clamp(c.y + Math.sin(c.a) * 4 * dt, HORIZON + 26, BOARD_H - 26); }
      } else if (c.type === 'snail') {
        c.x += c.face * 1.2 * dt;
      } else if (c.type === 'skink') {
        // still, still, then gone in a dash
        c.t -= dt;
        if (near && c.run <= 0) { c.run = 0.5; c.tx = c.x + Math.sign(dx || 1) * 60; c.ty = clamp(c.y + (R() - 0.5) * 30, HORIZON + 26, BOARD_H - 26); }
        else if (c.t <= 0 && c.run <= 0) { c.t = 2 + R() * 5; c.run = 0.35; c.tx = c.x + (R() - 0.5) * 70; c.ty = clamp(c.y + (R() - 0.5) * 24, HORIZON + 26, BOARD_H - 26); }
        if (c.run > 0) { c.run -= dt; const ddx = c.tx - c.x; c.x = damp(c.x, c.tx, 9, dt); c.y = damp(c.y, c.ty, 9, dt); if (Math.abs(ddx) > 1) c.face = Math.sign(ddx); }
      } else if (c.type === 'bird') {
        if (c.gone > 0) { c.gone -= dt; if (c.gone <= 0) { c.x = c.hx; c.y = c.hy; c.z = 60; c.vz = -40; c.fly = 0.6; } continue; }
        if (c.fly > 0 && c.vz > 0) { c.x += c.vx * dt; c.z += c.vz * dt; c.vz += 30 * dt; if (c.z > 160) { c.gone = 6 + R() * 8; } continue; }
        if (c.fly > 0 && c.vz <= 0) { c.z = Math.max(0, c.z + c.vz * dt); if (c.z <= 0) c.fly = 0; continue; }
        if (near) { c.fly = 1; c.vx = Math.sign(dx || 1) * (70 + R() * 30); c.vz = 60; c.face = Math.sign(c.vx); continue; }
        c.t -= dt; c.peck = Math.max(0, c.peck - dt * 5);
        if (c.t <= 0) {
          c.t = 0.4 + R() * 1.6;
          if (R() < 0.45) c.peck = 1;
          else { const h = (R() - 0.5) * 18; c.x += h; c.face = Math.sign(h) || c.face; c.z = 0.01; c.hopT = 0.18; }
        }
        if (c.hopT > 0) { c.hopT -= dt; c.z = Math.sin(Math.max(0, c.hopT) / 0.18 * Math.PI) * 3; } else c.z = 0;
      }
    }
    for (const r of D.rings) r.t += dt;
    D.rings = D.rings.filter(r => r.t < 1.1);
    if (Math.random() < dt * 0.9) {
      // a ripple somewhere on the visible water
      const g = D.glints[(Math.random() * D.glints.length) | 0];
      if (g && Math.abs(g.f.cx(g.y) - camX) < span) D.rings.push({ x: g.f.cx(g.y) + g.u * g.f.hw(g.y) * 0.5, y: g.y, t: 0 });
    }
  }
  // ----------------------------------------------------------------- drawing
  // a plant, leaning with the wind and with you brushing past
  function plant(p) {
    const c = p.spr, ctx = Gfx.ctx, sc = p.sc || 1;
    const sk = p.sway ? (Math.sin(Time.t * 1.6 + p.ph + p.x * 0.01) * 0.08 + Math.sin(Time.t * 14 + p.ph) * p.rustle * 0.22) * p.sway : 0;
    if (!sk && !p.flip) { ctx.drawImage(c, Math.round(p.x - c.width * sc / 2), Math.round(p.y - c.height * sc), Math.round(c.width * sc), Math.round(c.height * sc)); return; }
    ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y)); ctx.transform(1, 0, -sk, 1, 0, 0);
    if (p.flip) ctx.scale(-1, 1);
    ctx.drawImage(c, -Math.round(c.width * sc / 2), -Math.round(c.height * sc), Math.round(c.width * sc), Math.round(c.height * sc));
    ctx.restore();
  }
  function ringPx(cx, cy, rx, ry, col) {
    const n = Math.max(8, Math.round(rx * 1.2));
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; Gfx.rect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1, col); }
  }
  // flat things, under the tiles and everyone's feet
  function drawFlat(B, L, Rr) {
    const D = B.dress; if (!D) return;
    const ctx = Gfx.ctx, t = Time.t;
    // light on the water: glints that come and go
    for (const g of D.glints) {
      const x = g.f.cx(g.y) + g.u * g.f.hw(g.y) * 0.8; if (x < L || x > Rr) continue;
      const k = Math.sin(t * 2.2 + g.ph + g.y * 0.05);
      if (k > 0.75) { const dx = ((t * 8 + g.ph * 10) % 6) - 3; Gfx.rect(Math.round(x + dx), Math.round(g.y), k > 0.92 ? 3 : 2, 1, k > 0.9 ? '#ffffff' : '#a8d8ff'); }
    }
    for (const r of D.rings) {
      if (r.x < L || r.x > Rr) continue;
      ctx.globalAlpha = clamp(1 - r.t / 1.1, 0, 1) * 0.8; ringPx(r.x, r.y, 2 + r.t * 9, 1 + r.t * 3.5, '#d8f0ff'); ctx.globalAlpha = 1;
    }
    for (const p of D.placed) {
      if (!p.flat || p.x < L - 30 || p.x > Rr + 30) continue;
      if (p.water) {
        // bobbing on the current, foam on the upstream side of a rock
        const bob = p.kind === 'lily' ? Math.sin(t * 1.4 + p.ph) * 0.6 : 0;
        if (p.kind === 'wrock') {
          for (let i = 0; i < 5; i++) { const a = Math.PI + (i - 2) * 0.45, k = Math.sin(t * 6 + i * 1.7 + p.ph); if (k > -0.3) Gfx.rect(Math.round(p.x + Math.cos(a) * 9 * p.sc), Math.round(p.y - 2 + Math.sin(a) * 3 + i % 2), 2, 1, k > 0.5 ? '#ffffff' : '#a8d8ff'); }
          ctx.globalAlpha = 0.5; Gfx.rect(Math.round(p.x - 6), Math.round(p.y + 1), 12, 1, '#d8f0ff'); ctx.globalAlpha = 1;
        }
        plant({ spr: p.spr, x: p.x, y: p.y + bob + (p.kind === 'wrock' ? 3 : 4), flip: p.flip, sc: p.sc, sway: 0 });
      } else plant(p);
    }
  }
  // standing things: plants and critters, into the y-sorted list
  function collect(B, list, L, Rr) {
    const D = B.dress; if (!D) return;
    for (const p of D.placed) if (!p.flat && p.x > L - 30 && p.x < Rr + 30) list.push({ y: p.y, f: () => plant(p) });
    for (const c of D.crit) {
      if (c.x < L - 20 || c.x > Rr + 20) continue;
      if (c.type === 'frog' && !(c.gone > 0)) list.push({ y: c.y, f: () => {
        const z = c.hop > 0 ? Math.sin((1 - c.hop) * Math.PI) * 8 : 0, puff = c.croak < 0.4 && !c.hop ? 1 : 0;
        Gfx.shadow(c.x, c.y, 5, 0.25);
        plant({ spr: frogSpr(B.dress.b, c.hop > 0 ? 1 : 0), x: c.x, y: c.y - z, flip: c.face < 0, sc: 1, sway: 0 });
        if (puff) Gfx.rect(Math.round(c.x) - 1, Math.round(c.y) - 3, 3, 2, '#e8f0c8');
      } });
      else if (c.type === 'beetle') list.push({ y: c.y, f: () => {
        const x = Math.round(c.x), y = Math.round(c.y), lg = c.walk && Math.floor(Time.t * 12) % 2;
        Gfx.rect(x - 2, y - 3, 4, 3, '#120c16'); Gfx.rect(x - 1, y - 3, 2, 2, c.col); Gfx.rect(x - 1, y - 3, 1, 1, '#ffffff');
        Gfx.rect(x - 3 + lg, y - 1, 1, 1, '#120c16'); Gfx.rect(x + 2 - lg, y - 1, 1, 1, '#120c16');
        if (c.col === '#ff6a1a' && Math.sin(Time.t * 4 + c.a) > 0.3) { Gfx.ctx.globalAlpha = 0.5; Gfx.rect(x - 2, y - 4, 4, 1, '#ffe08a'); Gfx.ctx.globalAlpha = 1; }
      } });
      else if (c.type === 'snail') list.push({ y: c.y, f: () => plant({ spr: snailSpr(), x: c.x, y: c.y, flip: c.face < 0, sc: 1, sway: 0 }) });
      else if (c.type === 'skink') list.push({ y: c.y, f: () => {
        const x = Math.round(c.x), y = Math.round(c.y), f = c.face, wig = c.run > 0 ? Math.round(Math.sin(Time.t * 40)) : 0;
        Gfx.rect(x - 4, y - 2, 8, 2, '#120c16'); Gfx.rect(x - 3, y - 2, 6, 1, c.col[1]); Gfx.rect(x - 3, y - 1, 6, 1, c.col[0]);
        Gfx.rect(x + f * 4, y - 2, 2, 2, c.col[1]); Gfx.rect(x + f * 5, y - 2, 1, 1, '#120c16');       // head and eye
        Gfx.rect(x - f * 5, y - 1 + wig, 3, 1, c.col[0]); Gfx.rect(x - f * 8, y - 1 - wig, 3, 1, c.col[0]);   // the tail
        const lg = c.run > 0 ? Math.floor(Time.t * 30) % 2 : 0;
        Gfx.rect(x - 2 + lg, y, 1, 1, c.col[0]); Gfx.rect(x + 2 - lg, y, 1, 1, c.col[0]);
      } });
      else if (c.type === 'bird' && !(c.gone > 0)) list.push({ y: c.y, f: () => {
        if (c.z < 40) Gfx.shadow(c.x, c.y, 4, 0.22 * clamp(1 - c.z / 40, 0, 1));
        const fl = c.fly > 0 ? Math.floor(Time.t * 16) % 2 : 0;
        const rot = c.peck > 0 ? c.face * 0.6 * Math.sin(c.peck * Math.PI) : 0;
        Gfx.ctx.save(); Gfx.ctx.translate(Math.round(c.x), Math.round(c.y - c.z)); Gfx.ctx.rotate(rot);
        plant({ spr: birdSpr(B.dress.b, fl), x: 0, y: 0, flip: c.face < 0, sc: 1, sway: 0 });
        Gfx.ctx.restore();
      } });
    }
  }
  // things in the air, over everything on the ground
  function drawAir(B, L, Rr) {
    const D = B.dress; if (!D) return;
    const t = Time.t, ctx = Gfx.ctx;
    for (const c of D.crit) {
      if (c.x < L - 20 || c.x > Rr + 20) continue;
      const x = Math.round(c.x), y = Math.round(c.y - (c.z || 0));
      if (c.type === 'fly') {
        const open = Math.sin(t * 22 + c.ph) > 0;
        if (c.z < 30) { ctx.globalAlpha = 0.18; Gfx.rect(x - 1, Math.round(c.y), 3, 1, '#07050a'); ctx.globalAlpha = 1; }
        Gfx.rect(x, y - 1, 1, 3, '#120c16');
        if (open) { Gfx.rect(x - 3, y - 2, 3, 3, c.col); Gfx.rect(x + 1, y - 2, 3, 3, c.col); Gfx.rect(x - 3, y - 2, 1, 1, '#120c16'); Gfx.rect(x + 3, y - 2, 1, 1, '#120c16'); }
        else { Gfx.rect(x - 1, y - 3, 1, 3, c.col); Gfx.rect(x + 1, y - 3, 1, 3, c.col); }
      } else if (c.type === 'bee') {
        Gfx.rect(x - 1, y, 3, 2, '#ffd23a'); Gfx.rect(x, y, 1, 2, '#120c16');
        if (Math.sin(t * 50 + c.ph) > 0) { ctx.globalAlpha = 0.8; Gfx.rect(x - 1, y - 2, 2, 2, '#fffaea'); ctx.globalAlpha = 1; }
      } else if (c.type === 'dragon') {
        const f = Math.sin(t * 60 + c.ph) > 0, hov = Math.sin(t * 3 + c.ph) * 2, yy = y - 16 + Math.round(hov);
        ctx.globalAlpha = 0.18; Gfx.rect(x - 3, y, 7, 1, '#07050a'); ctx.globalAlpha = 1;
        Gfx.rect(x - 4, yy, 9, 1, c.col); Gfx.rect(x + 4, yy - 1, 2, 2, '#120c16');
        ctx.globalAlpha = 0.65; Gfx.rect(x - 1, yy - (f ? 3 : 1), 2, f ? 3 : 1, '#e8f4ff'); Gfx.rect(x + 1, yy + 1, 2, f ? 2 : 1, '#e8f4ff'); Gfx.rect(x - 1, yy + 1, 2, f ? 1 : 2, '#e8f4ff'); ctx.globalAlpha = 1;
      } else if (c.type === 'firefly' || c.type === 'ember') {
        const k = Math.sin(t * 2.5 + c.ph), xx = Math.round(c.hx + Math.sin(t * 0.7 + c.ph) * 14), yy = Math.round(c.hy - 10 - ((c.type === 'ember' ? (t * 14 + c.ph * 10) % 40 : 0)) + Math.cos(t * 0.9 + c.ph) * 8);
        if (k < -0.2) continue;
        ctx.globalAlpha = clamp(k, 0, 1) * 0.35; Gfx.rect(xx - 1, yy - 1, 3, 3, c.type === 'ember' ? '#ff6a1a' : '#d8ff6a'); ctx.globalAlpha = clamp(k + 0.3, 0, 1);
        Gfx.rect(xx, yy, 1, 1, c.type === 'ember' ? '#ffe08a' : '#f8ffc8'); ctx.globalAlpha = 1;
      }
    }
  }
  return { update, drawFlat, collect, drawAir };
})();
