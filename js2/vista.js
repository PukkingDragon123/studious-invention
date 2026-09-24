// ---------------------------------------------------------------------------
// vista.js - the valley seen from the Rockbottoms' front door.
//
// Four bands of country between the yard and the sky, each painted once a
// pixel at a time and scrolled at its own depth:
//
//   peaks  - the far range, blue with distance, snow on the tops
//   range  - the nearer mountains, slate and heather, a volcano in the east
//   hills  - the green hill the village stands on
//   woods  - the treeline at the bottom of the yard
//
// Each layer repeats every 1024 pixels, which at these depths is never on
// screen twice. The faces are shaded the way a pixel artist shades a range:
// every slope that faces the sun is lit, every slope that faces away is in
// shadow, and the facets get bigger the further down the mountain you go.
// Night and dusk are the day layer run through a tint, baked once.
// ---------------------------------------------------------------------------
'use strict';

const Vista = (() => {
  const LW = 1024;
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const hash = (x, s) => {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(s | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const dith = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16 - 0.5;
  // value noise that wraps round every LW pixels
  const pn = (x, period, seed) => {
    const f = ((x % LW) + LW) % LW / LW * period, i = Math.floor(f), t = f - i, u = t * t * (3 - 2 * t);
    const a = hash(i % period, seed), b = hash((i + 1) % period, seed);
    return a + (b - a) * u;
  };
  const fbm = (x, seed, oct = 5, p0 = 3) => {
    let v = 0, a = 1, n = 0;
    for (let o = 0; o < oct; o++) { v += pn(x, p0 << o, seed + o * 17) * a; n += a; a *= 0.5; }
    return v / n;
  };
  // ridged: sharp tops and soft valleys, which is what mountains look like
  const ridged = (x, seed, oct = 5, p0 = 3) => {
    let v = 0, a = 1, n = 0;
    for (let o = 0; o < oct; o++) { const r = 1 - Math.abs(pn(x, p0 << o, seed + o * 31) * 2 - 1); v += r * r * a; n += a; a *= 0.52; }
    return v / n;
  };

  function out(w, h) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const img = new ImageData(w, h);
    return { cv, img, px: new Uint32Array(img.data.buffer) };
  }
  const pack = (c) => ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;
  const lerpC = (a, b, k) => [a[0] + (b[0] - a[0]) * k | 0, a[1] + (b[1] - a[1]) * k | 0, a[2] + (b[2] - a[2]) * k | 0];

  // ------------------------------------------------------------ mountains
  function mountains(o) {
    const { h, seed } = o;
    const O = out(LW, h);
    const ramp = o.ramp.map(hex), snow = (o.snow || []).map(hex), haze = hex(o.haze);
    const top = new Float32Array(LW + 64);
    for (let x = 0; x < LW + 64; x++) {
      let y = h * o.base - o.amp * ridged(x, seed, 5, o.p0 || 3) - o.amp * 0.25 * fbm(x, seed + 5, 3, 9);
      if (o.volcano) {                                           // one cone, flat-topped
        const d = Math.abs(((x - o.volcano.x) % LW + LW * 1.5) % LW - LW / 2);
        if (d < o.volcano.w) y = Math.min(y, h * o.base - o.volcano.h * (1 - Math.pow(d / o.volcano.w, 1.4)) + (d < o.volcano.w * 0.12 ? o.volcano.h * 0.06 : 0));
      }
      top[x] = y;
    }
    const T = x => top[((x % LW) + LW) % LW];
    for (let x = 0; x < LW; x++) {
      const st = Math.round(T(x));
      for (let y = Math.max(0, st); y < h; y++) {
        const d = y - st;
        // which way this bit of mountain faces: the skyline's slope, sampled a
        // little sideways and over a wider window the deeper we are
        const wob = Math.sin(y * 0.09 + x * 0.013) * (2 + d * 0.12) + (hash(Math.floor(y / 3), x >> 3) - 0.5) * 2;
        const k = 2 + d * 0.22;
        const xs = Math.round(x + wob);
        const slope = (T(xs + Math.round(k)) - T(xs - Math.round(k))) / (2 * k);
        let lv = o.mid + (slope < 0 ? 1.4 : -1.1) * Math.min(1, Math.abs(slope) * 2.4 + 0.25);
        lv += (fbm(x * 3 + y * 7, seed + 9, 2, 64) - 0.5) * 0.8;
        // gullies running down the faces
        if (Math.abs(Math.sin((x + wob * 2) * 0.21 + fbm(x, seed + 3, 2, 12) * 9)) < 0.06 && d > 6) lv -= 1;
        if (d < 1) lv += 1.2;                                     // the rim of the skyline
        let c;
        const sl = o.snowLine != null ? h * o.snowLine + (fbm(x, seed + 7, 3, 24) - 0.5) * 18 : -1;
        if (snow.length && y < sl && d < 60) {
          const sv = (slope < 0 ? 2.2 : 0.8) + (d < 2 ? 1 : 0) + dith(x, y) * 0.8;
          c = snow[Math.max(0, Math.min(snow.length - 1, Math.floor(sv)))];
        } else {
          const i = Math.floor(lv + dith(x, y) * 0.9 + 0.5);
          c = ramp[i < 0 ? 0 : i >= ramp.length ? ramp.length - 1 : i];
        }
        // haze: the foot of the range fades into the air
        const hz = Math.min(1, Math.pow(Math.max(0, (y - h * 0.35) / (h * 0.65)), 1.3) * o.hazeK);
        if (hz > 0) {
          const q = hz + dith(x, y) * 0.12;
          c = lerpC(c, haze, Math.max(0, Math.min(1, Math.round(q * 4) / 4)));
        }
        O.px[y * LW + x] = pack(c);
      }
    }
    O.cv.getContext('2d').putImageData(O.img, 0, 0);
    return O.cv;
  }

  // ------------------------------------------------------ hills and woods
  // A rolling skyline of crowns: each tree is a bump with a lit cap, the gaps
  // between them are in shadow, and under the crowns it goes dark and dense.
  function woods(o) {
    const { h, seed } = o;
    const O = out(LW, h);
    const ramp = o.ramp.map(hex), haze = o.haze ? hex(o.haze) : null;
    const top = new Float32Array(LW), who = new Int16Array(LW), cxs = [], rs = [];
    const R = new RNGl(seed);
    for (let x = 0; x < LW; x++) { top[x] = h * o.base - o.amp * fbm(x, seed, 4, 2); who[x] = -1; }
    const base = Float32Array.from(top);
    // crowns along the ridge
    for (let x = -30; x < LW + 30;) {
      const r = o.r0 + R.next() * (o.r1 - o.r0);
      const cx = x + r * 0.7;
      cxs.push(cx); rs.push(r);
      for (let xx = Math.floor(cx - r); xx <= Math.ceil(cx + r); xx++) {
        const X = ((xx % LW) + LW) % LW;
        const b = base[X] + r * 0.35;
        const y = b - Math.sqrt(Math.max(0, r * r - (xx - cx) ** 2)) * o.tall;
        if (y < top[X]) { top[X] = y; who[X] = cxs.length - 1; }
      }
      x += r * (o.gap || 1.1) + R.next() * r * 0.6;
    }
    for (let x = 0; x < LW; x++) {
      const st = Math.round(top[x]), w = who[x];
      for (let y = Math.max(0, st); y < h; y++) {
        const d = y - st;
        let lv = o.mid;
        if (w >= 0) {
          const cx = cxs[w], r = rs[w];
          const cy = base[x] + r * 0.35 - r * 0.3;
          // a sphere-ish crown lit from the upper left
          const nx = (x - cx) / r, ny = (y - cy) / (r * o.tall);
          lv += (-nx * 0.7 - ny * 0.9) * 1.6;
          if (d < 1) lv += 1;
        } else lv -= 0.6;
        lv -= Math.max(0, d - (o.band || 14)) * 0.08;                // deep under the canopy
        lv += (hash(x * 3 + (y >> 1), seed + 2) - 0.5) * 1.1;        // leaf texture
        const i = Math.floor(lv + dith(x, y) * 0.8 + 0.5);
        let c = ramp[i < 0 ? 0 : i >= ramp.length ? ramp.length - 1 : i];
        if (haze) c = lerpC(c, haze, o.hazeK || 0);
        O.px[y * LW + x] = pack(c);
      }
    }
    O.cv.getContext('2d').putImageData(O.img, 0, 0);
    return O.cv;
  }
  // a tiny seeded generator of our own, so the layers never change
  function RNGl(s) { this.s = s >>> 0 || 1; }
  RNGl.prototype.next = function () { this.s = (Math.imul(this.s, 1664525) + 1013904223) >>> 0; return this.s / 4294967296; };

  // the green hill the village sits on: two soft humps, a lit crest, fields
  // and hedges down the slope, copses dotted about, and a path
  function hill(o) {
    const { h, seed } = o;
    const O = out(LW, h);
    const ramp = o.ramp.map(hex), haze = hex(o.haze);
    const top = x => h * o.base - o.amp * (fbm(x, seed, 3, 2) * 0.8 + fbm(x, seed + 9, 2, 5) * 0.2);
    O.cv.top = x => top(((x % LW) + LW) % LW);
    const R = new RNGl(seed + 1);
    const copses = [];
    for (let i = 0; i < 70; i++) copses.push([R.next() * LW, 8 + R.next() * (h - 30), 2 + R.next() * 4]);
    for (let x = 0; x < LW; x++) {
      const st = Math.round(top(x));
      const sl = (top(x + 3) - top(x - 3)) / 6;
      for (let y = Math.max(0, st); y < h; y++) {
        const d = y - st;
        let lv = o.mid + (sl < 0 ? 0.5 : -0.5) * Math.min(1, Math.abs(sl) * 4) - d * 0.02;
        if (d < 2) lv += 1.6; else if (d < 4) lv += 0.7;
        // fields: bands across the slope, a shade apart, with a hedge between
        const f = Math.floor((y + fbm(x, seed + 4, 2, 6) * 30 + x * 0.05) / 14);
        lv += (hash(f, seed + 5) - 0.5) * 0.9;
        if (((y + fbm(x, seed + 4, 2, 6) * 30 + x * 0.05) % 14) < 1.2 && d > 5) lv = 0.6;
        lv += (hash(x + y * 131, seed) - 0.5) * 0.7;
        let c;
        const pw = Math.abs(x - (o.path + Math.sin(y * 0.08) * 20 + d * 0.8));
        if (o.path != null && pw < 2 + d * 0.05 && d > 3) c = hex(o.pathCol);
        else { const i = Math.floor(lv + dith(x, y) * 0.8 + 0.5); c = ramp[i < 0 ? 0 : i >= ramp.length ? ramp.length - 1 : i]; }
        c = lerpC(c, haze, o.hazeK * (0.6 + 0.4 * (1 - y / h)));
        O.px[y * LW + x] = pack(c);
      }
    }
    // little copses of trees on the slopes: a dark blob with a lit cap
    for (const [cx, cy, r] of copses) {
      const st = top(cx);
      if (cy < st + r + 3) continue;
      for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r * 1.3); x <= cx + r * 1.3; x++) {
        const dx = (x - cx) / (r * 1.3), dy = (y - cy) / r;
        if (dx * dx + dy * dy > 1) continue;
        const lit = -dx * 0.6 - dy * 0.8 > 0.3;
        const c = lerpC(ramp[lit ? 3 : 0], haze, o.hazeK * 0.8);
        const X = ((x % LW) + LW) % LW;
        if (y >= 0 && y < h) O.px[y * LW + X] = pack(c);
      }
    }
    O.cv.getContext('2d').putImageData(O.img, 0, 0);
    return O.cv;
  }

  // ---------------------------------------------------- ground and soil
  // The yard's turf edge, and the cut-away earth under everything: topsoil
  // with roots and stones in it, a band of clay, and rock. One tile each.
  function ground() {
    const h = 16, O = out(LW, h);
    const G = ['#14331e', '#27632f', '#3f9a45', '#6cc95c', '#a8e878'].map(hex);
    const D = ['#2e1a10', '#3a2415', '#4a2e1a', '#5c3a20', '#744a2a'].map(hex);
    for (let x = 0; x < LW; x++) {
      const tuft = pn(x, 256, 7) > 0.55 ? Math.floor(pn(x, 512, 9) * 5) : Math.floor(pn(x, 128, 8) * 2);
      const g0 = 8 - tuft;                                    // grass starts here (row)
      for (let y = 0; y < h; y++) {
        let c = null;
        if (y >= g0 && y < 11) c = G[Math.max(0, Math.min(4, (y === g0 ? 4 : y < g0 + 2 ? 3 : 2) - (hash(x, 3) < 0.2 ? 1 : 0)))];
        else if (y === 11) c = G[1];
        else if (y > 11) c = D[Math.max(0, Math.min(4, Math.floor(3.2 - (y - 12) * 0.4 + dith(x, y) * 0.8 + (hash(x * 7 + y, 4) - 0.5))))];
        if (c) O.px[y * LW + x] = pack(c);
      }
    }
    O.cv.getContext('2d').putImageData(O.img, 0, 0);
    return O.cv;
  }
  function soil() {
    const h = 200, O = out(LW, h);
    const TOP = ['#1a0e08', '#2a170d', '#3a2213', '#4a2d18', '#5c3a20'].map(hex);
    const CLAY = ['#4a2d18', '#5c3a20', '#744a2a', '#85562f', '#9c6a3c'].map(hex);
    const ROCK = ['#241c2e', '#2e2538', '#3b3048', '#4d4a5c', '#574a66', '#6e6b80'].map(hex);
    const STONE = ['#4d4a5c', '#6e6b80', '#9391a6', '#bdbccd'].map(hex);
    for (let x = 0; x < LW; x++) {
      const b1 = 20 + (pn(x, 64, 21) - 0.5) * 6 + (pn(x, 16, 22) - 0.5) * 4;
      const b2 = 44 + (pn(x, 48, 23) - 0.5) * 10 + (pn(x, 12, 24) - 0.5) * 4;
      for (let y = 0; y < h; y++) {
        let c;
        const n = hash(x * 13 + y * 7919, 25);
        if (y < 2) c = TOP[0];
        else if (y < b1) {
          let lv = 2.2 + (pn(x * 3 + y * 17, 128, 26) - 0.5) * 1.6 - (y < 4 ? 0.8 : 0);
          c = TOP[Math.max(0, Math.min(4, Math.floor(lv + dith(x, y) * 0.8 + 0.5)))];
          if (n < 0.012) c = STONE[1 + (n < 0.004 ? 1 : 0)];
        } else if (y < b2) {
          const streak = Math.sin((y + pn(x, 32, 27) * 6) * 1.3) > 0.7 ? -1 : 0;
          const lv = 2.6 + streak + (pn(x * 5 + y * 3, 256, 28) - 0.5) * 1.2 - (y < b1 + 1.5 ? 1.4 : 0);
          c = CLAY[Math.max(0, Math.min(4, Math.floor(lv + dith(x, y) * 0.7 + 0.5)))];
        } else {
          const lv = 2.6 + (pn(x * 2 + y * 11, 256, 29) - 0.5) * 1.8 - (y < b2 + 1.5 ? 1.6 : 0) - (y - b2) * 0.012;
          c = ROCK[Math.max(0, Math.min(5, Math.floor(lv + dith(x, y) * 0.8 + 0.5)))];
          if (n < 0.02) c = STONE[n < 0.006 ? 2 : 1];
        }
        O.px[y * LW + x] = pack(c);
      }
    }
    // roots, reaching down out of the turf
    const R = new RNGl(31);
    for (let k = 0; k < 40; k++) {
      let x = Math.floor(R.next() * LW), y = 2;
      const len = 8 + Math.floor(R.next() * 22);
      for (let i = 0; i < len; i++) {
        O.px[y * LW + ((x % LW) + LW) % LW] = pack(TOP[0]);
        y++; if (R.next() < 0.35) x += R.next() < 0.5 ? 1 : -1;
      }
    }
    O.cv.getContext('2d').putImageData(O.img, 0, 0);
    return O.cv;
  }
  const tiles = {};
  function tile(name, fn, L, R, y) {
    const c = tiles[name] || (tiles[name] = fn());
    for (let x = Math.floor(L / LW) * LW; x < R; x += LW) Gfx.ctx.drawImage(c, x, y);
  }

  // ----------------------------------------------------- the home's layers
  const HOME_LAYERS = [
    { key: 'peaks', y: 150, depth: 0.05, make: () => mountains({
      h: 210, seed: 101, base: 0.72, amp: 96, mid: 3.2, p0: 3,
      ramp: ['#3b3a63', '#4a4c78', '#5b608c', '#6d74a0', '#8189b2', '#98a2c6'],
      snow: ['#9aa6cc', '#c4cde6', '#e8eef9', '#ffffff'], snowLine: 0.42,
      haze: '#b8c8ee', hazeK: 0.85 }) },
    { key: 'range', y: 222, depth: 0.14, make: () => mountains({
      h: 200, seed: 202, base: 0.62, amp: 78, mid: 2.8, p0: 2,
      ramp: ['#2c2440', '#3b2f52', '#4b3c62', '#5c4b72', '#6f5c82', '#836f93'],
      snow: [], haze: '#9fb3de', hazeK: 0.55,
      volcano: { x: 186, w: 120, h: 110 } }) },
    { key: 'hills', y: 296, depth: 0.26, make: () => hill({
      h: 150, seed: 303, base: 0.40, amp: 52, mid: 2.7,
      ramp: ['#1f4a2a', '#27632f', '#357a38', '#3f9a45', '#56b04e', '#6cc95c'],
      haze: '#a8c8e0', hazeK: 0.28, path: 520, pathCol: '#b08a5c' }) },
    { key: 'woods', y: 332, depth: 0.44, make: () => woods({
      h: 110, seed: 404, base: 0.66, amp: 22, mid: 2.6, r0: 10, r1: 20, tall: 1.0, gap: 0.85, band: 12,
      ramp: ['#102c1b', '#173c22', '#21532a', '#2c6b33', '#3f8a40', '#58a84f'] }) },
  ];
  // mood tints for layers painted in daylight
  const MOOD = {
    night: { col: '#241c4e', a: 0.62, glow: '#e06a1b', ga: 0.10 },
    dusk: { col: '#6a1f3a', a: 0.42, glow: '#ffa832', ga: 0.16 },
  };
  const cache = new Map();
  function layer(L, mood) {
    const key = L.key + '|' + (mood || 'day');
    let c = cache.get(key);
    if (c) return c;
    let base = cache.get(L.key + '|day');
    if (!base) { base = L.make(); cache.set(L.key + '|day', base); }
    if (!mood) return base;
    const m = MOOD[mood];
    c = document.createElement('canvas'); c.width = base.width; c.height = base.height;
    const g = c.getContext('2d');
    g.drawImage(base, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = m.a; g.fillStyle = m.col; g.fillRect(0, 0, c.width, c.height);
    // the low sun on the tops
    const gr = g.createLinearGradient(0, 0, 0, c.height);
    gr.addColorStop(0, m.glow); gr.addColorStop(0.4, 'rgba(0,0,0,0)');
    g.globalAlpha = m.ga; g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
    cache.set(key, c);
    return c;
  }
  // lay one layer across [L, R] in world space at its depth
  function draw(Lr, mood, camX, L, R) {
    const c = layer(Lr, mood);
    const off = camX * Lr.depth;
    let x = Math.floor((L - off) / LW) * LW + off;
    for (; x < R; x += LW) Gfx.ctx.drawImage(c, Math.round(x), Lr.y);
  }
  return {
    HOME_LAYERS, draw, layer,
    ground: (L, R, y) => tile('ground', ground, L, R, y),
    soil: (L, R, y) => tile('soil', soil, L, R, y),
    // the height of a layer's skyline at world x, for standing things on it
    top(key, x, camX) {
      const Lr = HOME_LAYERS.find(l => l.key === key), c = layer(Lr, null);
      return c.top ? Lr.y + c.top(x - camX * Lr.depth) : Lr.y;
    },
    // bake whatever is not baked yet, a layer at a time; true when done
    step() {
      if (!tiles.ground) { tiles.ground = ground(); return false; }
      if (!tiles.soil) { tiles.soil = soil(); return false; }
      for (const L of HOME_LAYERS) if (!cache.has(L.key + '|day')) { layer(L, null); return false; }
      for (const m of ['night', 'dusk']) for (const L of HOME_LAYERS) if (!cache.has(L.key + '|' + m)) { layer(L, m); return false; }
      return true;
    },
  };
})();
