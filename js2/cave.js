// ---------------------------------------------------------------------------
// cave.js - the hill the Rockbottoms live in, painted one pixel at a time.
//
// The cave used to be a few hundred rounded rectangles. This paints it the
// way a pixel artist would, and bakes it once into a canvas in world pixels:
//
//   - the cut face of the hill is a heap of boulders, each one lit on its
//     upper-left shoulder, shadowed at its foot, with an ink crack round it
//   - the far wall of each hollow is bedded sandstone, the beds bent the way
//     rock bends, darker up under the roof, warmer down by the floor, damp
//     in streaks and mossy at the foot
//   - the crest is turf over a band of topsoil with roots going down into it
//   - the mouth is a real opening under an overhang, so the yard and the sky
//     show through it, and a crack over the bed lets the morning in
//
// Every value is snapped to a short colour ramp through an ordered dither,
// so it sits with the sprites instead of looking like a photo of a rock.
// It runs in slices while the title screen is up (CaveBake.step), and
// finishes on the spot if a scene needs it sooner (CaveBake.get).
// ---------------------------------------------------------------------------
'use strict';

const CaveBake = (() => {
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const u32 = c => ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;
  const ramp = list => list.map(h => u32(hex(h)));
  const mix = (a, b, k) => {                       // blend two packed colours
    const ar = a & 255, ag = (a >>> 8) & 255, ab = (a >>> 16) & 255;
    const br = b & 255, bg = (b >>> 8) & 255, bb = (b >>> 16) & 255;
    return ((255 << 24) | (Math.round(ab + (bb - ab) * k) << 16) | (Math.round(ag + (bg - ag) * k) << 8) | Math.round(ar + (br - ar) * k)) >>> 0;
  };

  // ------------------------------------------------------------- the ramps
  // dark -> light. The cut face is the nearest thing, so it is the darkest
  // and the coolest; the far walls are lit by the room, so they are warm.
  const R = {
    sect: ramp(['#0c0810', '#161019', '#201823', '#2b2030', '#382a3c', '#48364a', '#5b4558', '#715667', '#8c6c78']),
    wall: ramp(['#261a22', '#33232c', '#432d35', '#553a3f', '#684849', '#7c5853', '#91695d', '#a67b69', '#bb8f78']),
    wallB: ramp(['#241b25', '#30242f', '#3e2e3a', '#4f3a45', '#62484f', '#76585b', '#8a6967', '#9e7b73', '#b38f82']),
    wallC: ramp(['#281b1d', '#372629', '#483236', '#5b3f40', '#6f4f4a', '#846054', '#99735f', '#ad866b', '#c29b7b']),
    moss: ramp(['#161d14', '#1f2a18', '#29371c', '#354621', '#435627']),
    stone: ramp(['#2e2b38', '#4d4a5c', '#6e6b80', '#9391a6', '#bdbccd']),
    soil: ramp(['#150b08', '#22120b', '#311b10', '#432616', '#56331c']),
    turf: ramp(['#14331e', '#1f4f26', '#27632f', '#3f9a45', '#6cc95c', '#a8e878']),
    floor: ramp(['#2a1a14', '#3a2419', '#4c301f', '#5f3d26', '#744b2e', '#8a5b37', '#a26d42']),
    crystal: ramp(['#0f3838', '#18706a', '#2cb3a2', '#86e8d2', '#e6fff8']),
    bone: ramp(['#5a5144', '#8a7f68', '#c4b89a', '#e8dfc6', '#fffaea']),
  };
  const INK = u32(hex('#0a060c'));
  const PIG = {                                     // cave painting pigments
    red: u32(hex('#b33a2c')), ochre: u32(hex('#d98a3a')), black: u32(hex('#1c1216')), chalk: u32(hex('#e8dcc4')),
  };

  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const dith = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16 - 0.5;
  const pick = (rmp, lv, x, y, amt = 0.7) => {
    const i = Math.floor(lv + dith(x, y) * amt + 0.5);
    return rmp[i < 0 ? 0 : i >= rmp.length ? rmp.length - 1 : i];
  };
  // integer hash -> [0, 1)
  const hash = (x, y, s) => {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  // smooth value noise, for moss patches and the colour of the beds
  const vnoise = (x, y, s) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };

  // --------------------------------------------------------- the cells
  // A jittered grid of seeds. The metric is squashed by `ay` so a wide grid
  // gives wide cells without the 3x3 search missing a closer seed.
  function cells(w, h, gw, gh, seed) {
    const cols = Math.ceil(w / gw) + 3, rows = Math.ceil(h / gh) + 3;
    const sx = new Float32Array(cols * rows), sy = new Float32Array(cols * rows), tone = new Float32Array(cols * rows);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const c = j * cols + i;
      sx[c] = (i - 1 + 0.12 + hash(i, j, seed) * 0.76) * gw;
      sy[c] = (j - 1 + 0.12 + hash(i, j, seed + 1) * 0.76) * gh;
      tone[c] = hash(i, j, seed + 2) - 0.5;
    }
    return { gw, gh, cols, sx, sy, tone, ay: gw / gh };
  }
  const V = { f1: 0, f2: 0, id: 0, vx: 0, vy: 0 };
  function vor(C, x, y) {
    const gx = Math.floor(x / C.gw), gy = Math.floor(y / C.gh), ay = C.ay;
    let f1 = 1e12, f2 = 1e12, id = 0, vx = 0, vy = 0;
    for (let j = 0; j <= 2; j++) {
      const row = (gy + j) * C.cols + gx;
      for (let i = 0; i <= 2; i++) {
        const c = row + i;
        const dx = x - C.sx[c], dy = (y - C.sy[c]) * ay;
        const d = dx * dx + dy * dy;
        if (d < f1) { f2 = f1; f1 = d; id = c; vx = dx; vy = dy; }
        else if (d < f2) f2 = d;
      }
    }
    V.f1 = f1; V.f2 = f2; V.id = id; V.vx = vx; V.vy = vy;
  }

  // --------------------------------------------------- distance fields
  // Two-pass chamfer (3/4), capped at 255, so /3 is roughly pixels.
  function chamfer(src, w, h, j0, j1) {
    const d = new Uint8Array(w * h).fill(255);
    for (let j = j0; j < j1; j++) for (let i = 0; i < w; i++) if (src[j * w + i]) d[j * w + i] = 0;
    for (let j = j0; j < j1; j++) for (let i = 0; i < w; i++) {
      const k = j * w + i; let v = d[k];
      if (!v) continue;
      if (i > 0 && d[k - 1] + 3 < v) v = d[k - 1] + 3;
      if (j > j0) {
        if (d[k - w] + 3 < v) v = d[k - w] + 3;
        if (i > 0 && d[k - w - 1] + 4 < v) v = d[k - w - 1] + 4;
        if (i < w - 1 && d[k - w + 1] + 4 < v) v = d[k - w + 1] + 4;
      }
      d[k] = v;
    }
    for (let j = j1 - 1; j >= j0; j--) for (let i = w - 1; i >= 0; i--) {
      const k = j * w + i; let v = d[k];
      if (!v) continue;
      if (i < w - 1 && d[k + 1] + 3 < v) v = d[k + 1] + 3;
      if (j < j1 - 1) {
        if (d[k + w] + 3 < v) v = d[k + w] + 3;
        if (i < w - 1 && d[k + w + 1] + 4 < v) v = d[k + w + 1] + 4;
        if (i > 0 && d[k + w - 1] + 4 < v) v = d[k + w - 1] + 4;
      }
      d[k] = v;
    }
    return d;
  }

  // ------------------------------------------------------------ regions
  const AIR = 0, SECT = 1, WALL = 2, PASS = 3, FLOOR = 4, OPEN = 5;
  const FLOOR_TOP = GY - 8;

  // the crawl between the hollows
  const PAS = (() => {
    const a = DOMES[0], b = DOMES[1];
    return { cx: ((b.x - b.rx) + (a.x + a.rx)) / 2, rx: 64, ry: 150 };
  })();
  const arch = (cx, rx, ry, x, p) => World.archY(cx, rx, ry, x, p);
  const passTop = x => {
    const t = arch(PAS.cx, PAS.rx, PAS.ry, x, 2.4);
    return t === Infinity ? t : t + Math.sin(x * 0.047) * 6 + Math.sin(x * 0.019 + 1) * 4;
  };
  const mouthTop = x => World.mouthTop(x);
  // the crack over the bed: a jagged slot, wider in the middle
  const FISS = { x: HOME.bed + 44, len: 136 };
  function fissure(X, Y, top) {
    const k = (Y - top) / FISS.len;
    if (k < 0 || k > 1) return false;
    const lean = Math.sin(Y * 0.031) * 8 + (hash(0, Math.floor(Y / 5), 77) - 0.5) * 3;
    const hw = (1.5 + 8 * Math.sin(k * Math.PI) ** 0.8) * (0.7 + hash(1, Math.floor(Y / 4), 78) * 0.6);
    return Math.abs(X - (FISS.x + lean)) < hw;
  }

  // ------------------------------------------------------------ the job
  // Everything is computed column by column first, then row by row in
  // slices, so the title screen can pay for it a few milliseconds a frame.
  function start() {
    const { x0, x1, top, bot } = SHELL;
    const w = Math.ceil(x1 - x0), h = Math.ceil(bot - top);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const J = { cv, w, h, x0, top, stage: 0, row: 0 };
    // columns
    J.surf = new Float32Array(w); J.roof = new Float32Array(w); J.dome = new Int8Array(w);
    J.pass = new Float32Array(w); J.passB = new Float32Array(w);
    J.mouth = new Float32Array(w); J.mouthB = new Float32Array(w);
    let ymin = GY;
    for (let i = 0; i < w; i++) {
      const X = x0 + i + 0.5;
      J.surf[i] = X > MOUTH.end ? Infinity : World.hillY(X);
      ymin = Math.min(ymin, J.surf[i]);
      let r = Infinity, di = -1;
      DOMES.forEach((d, n) => { const y = World.caveRoof(d, X); if (y != null && y < r) { r = y; di = n; } });
      J.roof[i] = r; J.dome[i] = di;
      J.pass[i] = passTop(X);
      J.passB[i] = arch(PAS.cx, PAS.rx + 12, PAS.ry + 12, X, 2.4);
      J.mouth[i] = mouthTop(X);
      J.mouthB[i] = X < MOUTH.cx ? arch(MOUTH.cx, MOUTH.rx + MOUTH.jamb, MOUTH.ry + MOUTH.jamb * 0.8, X, 3) : J.mouth[i] - MOUTH.jamb * 0.8;
    }
    J.j0 = Math.max(0, Math.floor(ymin - 8 - top)); J.j1 = Math.min(h, Math.ceil(GY + 8 - top));
    J.reg = new Uint8Array(w * h);
    J.img = new ImageData(w, h);
    J.px = new Uint32Array(J.img.data.buffer);
    J.boulders = cells(w, h, 25, 22, 11);
    J.pebbles = cells(w, h, 9, 5, 31);
    // the beds of sandstone in the far walls: bands of varying thickness that
    // pinch and swell, each broken into blocks by joints that never line up
    // from one bed to the next
    const sr = new RNG(606);
    J.bands = [];
    for (let y = ymin - 60; y < GY + 40;) {
      const hb = sr.chance(0.25) ? sr.int(22, 32) : sr.int(9, 19);
      const js = []; let x = x0 - 40 - sr.int(0, 60);
      const long = sr.chance(0.35);
      while (x < x1 + 80) { js.push(x); x += long ? sr.int(90, 230) : sr.chance(0.3) ? sr.int(60, 130) : sr.int(28, 76); }
      J.bands.push({
        y0: y, amp: sr.float(0.6, 3.2), fq: sr.float(0.006, 0.028), ph: sr.float(0, 6.28),
        ramp: sr.chance(0.18) ? 2 : sr.chance(0.4) ? 1 : 0, tone: sr.float(-0.7, 0.5), slant: sr.float(-0.4, 0.4),
        joints: Float32Array.from(js), tones: Float32Array.from(js.map(() => sr.float(-1, 1))),
      });
      y += hb;
    }
    J.bandBase = Math.floor(ymin - 60);
    J.bandLut = new Uint16Array(Math.ceil(GY + 40 - J.bandBase) + 2);
    for (let b = 0, y = J.bandBase; y < GY + 40; y++) {
      while (b < J.bands.length - 1 && J.bands[b + 1].y0 <= y) b++;
      J.bandLut[y - J.bandBase] = b;
    }
    // where water comes down the walls: a weight per column and how far it runs
    J.stW = new Float32Array(w); J.stL = new Float32Array(w);
    for (let n = 0; n < 34; n++) {
      const cx = sr.int(0, w - 1), hw = sr.float(1.5, 5), len = sr.float(40, 190), dark = sr.float(0.5, 1.1);
      for (let i = Math.max(0, Math.floor(cx - hw)); i <= Math.min(w - 1, Math.ceil(cx + hw)); i++) {
        const k = Math.pow(Math.max(0, 1 - Math.abs(i - cx) / hw), 0.6) * dark;
        if (k > J.stW[i]) { J.stW[i] = k; J.stL[i] = len; }
      }
    }
    return J;
  }

  // one row of the region map
  function classify(J, j) {
    const { w, x0, top, reg } = J, Y = top + j + 0.5, o = j * w;
    for (let i = 0; i < w; i++) {
      const X = x0 + i + 0.5;
      let r;
      if (Y < J.surf[i] || Y > GY + 6) r = AIR;
      else if (Y >= FLOOR_TOP && X > DOMES[0].x - DOMES[0].rx + 4 && X < MOUTH.cx + 8 + hash(Math.floor(Y), 3, 41) * 14) r = FLOOR;
      else if (Y >= J.mouth[i]) r = OPEN;
      else if (Y >= J.mouthB[i]) r = SECT;
      else if (Y >= J.pass[i]) r = PASS;
      else if (Y >= J.passB[i] && J.roof[i] < Y) r = SECT;
      else if (Y >= J.roof[i]) r = WALL;
      else r = SECT;
      if (r === WALL && J.dome[i] === 0 && fissure(X, Y, J.roofFiss)) r = OPEN;
      // the smoke hole over each hollow, up through the rock to the sky
      if (r === SECT) for (const d of DOMES) {
        const dx = X - d.x - Math.sin(Y * 0.05) * 4;
        if (Math.abs(dx) < 7 + Math.max(0, (Y - (GY - d.ry - 20)) * 0.3) && Y > J.surf[i] - 2 && Y < GY - d.ry + 30) r = OPEN;
      }
      reg[o + i] = r;
    }
  }

  // ------------------------------------------------------------ paint
  const bend = X => Math.sin(X * 0.0045) * 16 + Math.sin(X * 0.013 + 1) * 5;
  const bedY = (b, X, B) => b.y0 + B + b.amp * Math.sin(X * b.fq + b.ph);
  function paintRow(J, j) {
    const { w, x0, top, reg, px } = J, Y = top + j, o = j * w;
    const B = J.boulders, bands = J.bands, nb = bands.length;
    for (let i = 0; i < w; i++) {
      const k = o + i, r = reg[k];
      if (r === AIR || r === OPEN) continue;
      const X = x0 + i;
      if (r === SECT) {
        const da = J.dAir[k] / 3, di = J.dIn[k] / 3;
        const slope = Math.abs(J.surf[Math.min(w - 1, i + 3)] - J.surf[Math.max(0, i - 3)]) / 6;
        // turf and topsoil along the crest, where a slope could hold them
        const hang = hash(Math.floor(X / 4), 0, 5);
        if (da < 5 + (hang > 0.7 ? 2 : 0) && slope < 1.25 && di > 3) {
          const t = da < 1 ? 5 : da < 2 ? 4 : da < 3.3 ? 3 : da < 4.6 ? 2 : 1;
          px[k] = R.turf[t];
          continue;
        }
        if (da < 17 && slope < 1.7 && di > 3) {
          vor(J.pebbles, i, j);
          const e = Math.sqrt(V.f2) - Math.sqrt(V.f1);
          let lv = 2.2 - (da - 5) / 12 * 1.2 + J.pebbles.tone[V.id] * 1.4;
          if (e < 0.9) lv = 0.4;
          else if (V.vy < 0 && e < 2) lv += 0.8;
          // topsoil gives way to rock through a ragged seam
          if (!(da > 13 && dith(i, j) + (da - 13) / 4 > 0.5)) { px[k] = pick(R.soil, lv, i, j, 0.4); continue; }
        }
        vor(B, i, j);
        const f1 = Math.sqrt(V.f1), e = Math.sqrt(V.f2) - f1;
        const t = f1 / (f1 + e * 0.5 + 0.001), tt = Math.pow(t, 1.35);
        const inv = 1 / (f1 + 0.001), dx = V.vx * inv, dy = V.vy * inv;
        const nx = dx * tt, ny = dy * tt, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        const lam = -nx * 0.52 - ny * 0.62 + nz * 0.58;
        let lv = 1.4 + lam * 3.8 + B.tone[V.id] * 1.6;
        // a hard lit lip on the upper-left of every boulder, so they stand out
        if (e < 3 && -dx * 0.6 - dy * 0.8 > 0.35) lv += 1.3;
        const g = hash(X, Y, 3);
        if (g > 0.965) lv -= 1; else if (g < 0.02 && ny < 0) lv += 1;
        if (e < 1.35) lv = 0.2;                              // the crack between two boulders
        // the edge of the cut, catching the light of the room it opens onto
        if (di < 1.5) lv = 7.8;
        else if (di < 3) lv = Math.max(lv, 6);
        else if (di < 14) lv += (14 - di) / 14 * 1.2;
        lv -= Math.min(1, Math.max(0, (di - 14) / 80)) * 1.4;   // and further in, the dark
        if (da < 2.5) lv = Math.max(lv, 6.2);                   // a lit lip on bare crest
        px[k] = pick(R.sect, lv, i, j, 0.5);
        continue;
      }
      if (r === FLOOR) { px[k] = floorPx(J, X, Y, i, j); continue; }
      // ---- the far wall of a hollow, or of the crawl between them
      const bn = bend(X);
      let b = J.bandLut[Math.max(0, Math.min(J.bandLut.length - 1, Math.floor(Y - bn - J.bandBase)))];
      while (b > 0 && Y < bedY(bands[b], X, bn)) b--;
      while (b < nb - 1 && Y >= bedY(bands[b + 1], X, bn)) b++;
      const bd = bands[b];
      const yt = bedY(bd, X, bn), yb = b < nb - 1 ? bedY(bands[b + 1], X, bn) : yt + 20;
      const dt = Y - yt, db = yb - Y, v = dt / Math.max(1, yb - yt);
      // which block of the bed: the joints lean a little, bed by bed
      const xs = X - bd.slant * dt, J2 = bd.joints;
      let lo = 0, hi = J2.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (J2[m] <= xs) lo = m; else hi = m; }
      const dl = xs - J2[lo], dr = J2[hi] - xs;
      let lv = 4.1 + bd.tone + bd.tones[lo] * 0.4 + (0.5 - v) * 0.8;
      lv += (vnoise(X * 0.07, Y * 0.13, 81) - 0.5) * 1.0;          // weathering
      // and the big shapes: bulges that catch the light, hollows that do not
      const rel = vnoise(X * 0.011, Y * 0.019, 83) * 0.65 + vnoise(X * 0.03, Y * 0.05, 85) * 0.35;
      lv += (rel - 0.5) * 2.6;
      if (db < 1.2) lv -= 2.3;                                      // the seam under the bed
      else if (db < 2.7) lv -= 1.0;
      if (dt < 1.1) lv += 1.8;                                      // its top catches the light
      else if (dt < 2.3) lv += 0.6;
      // a joint - which weathers away to nothing in places
      const jf = hash(lo, b, 87) < 0.3 ? Math.max(0, 1 - Math.abs(v - 0.5) * 3) : 1;
      if (dl < 1.15) lv -= 2.3 * jf;
      else if (dl < 2.6) lv += 0.7 * jf;
      if (dr < 1.3) lv -= 0.9;
      if (Math.min(dl, dr) + Math.min(dt, db) < 3.4 && Math.min(dl, dr) < 3.2 && Math.min(dt, db) < 3.2) lv -= 1.5;  // worn corners
      const g = hash(X, Y, 9);
      if (g > 0.975) lv -= 1.1; else if (g < 0.014) lv += 0.9;
      // darker up under the roof and in toward the sides of the hollow
      const dd = J.dOut[k] / 3;
      const ao = Math.max(0, 1 - dd / 30);
      lv -= ao * ao * 3.4;
      lv -= Math.max(0, (GY - Y - 60) / 260) * 1.1;
      lv += Math.max(0, 1 - (GY - Y) / 50) * 0.8;                   // the floor throws a little back up
      // damp, running down from the roof
      const si = Math.min(w - 1, Math.max(0, Math.round(i + Math.sin(Y * 0.045 + i) * 1.2)));
      const wet = J.stW[si] * Math.max(0, 1 - dd / J.stL[si]);
      lv -= wet * 1.6;
      if (r === PASS) lv -= 1.4;
      // the fissure gets an ink edge, like everything else that is cut
      if (dd < 1.6 && J.dome[i] === 0) {
        const up = reg[k - w], dn = reg[k + w], lf = reg[k - 1], rt = reg[k + 1];
        if (up === OPEN || dn === OPEN || lf === OPEN || rt === OPEN) { px[k] = INK; continue; }
      }
      // moss at the foot of the wall and wherever the water runs
      const mn = vnoise(X * 0.045, Y * 0.085, 61) * 0.8 + Math.max(0, 1 - (GY - Y) / 30) * 0.42 + wet * 0.35;
      if (mn > 0.88 && r === WALL && dd > 2) {
        const edge = mn < 0.91 && dith(i, j) > 0;
        if (!edge) { px[k] = pick(R.moss, 1.2 + (mn - 0.88) * 14 - (db < 2 ? 1 : 0) + (dt < 2 ? 1 : 0), i, j, 0.4); continue; }
      }
      const rmp = bd.ramp === 2 ? R.wallC : bd.ramp === 1 ? R.wallB : R.wall;
      px[k] = pick(rmp, lv, i, j, 0.45);
    }
  }
  // the floor: packed earth, darker at the back where it meets the wall,
  // a stone in it here and there, straw in the bedroom, and a lit front edge
  function floorPx(J, X, Y, i, j) {
    const row = Y - FLOOR_TOP;                          // 0..14
    let lv = 2.1 + row * 0.24 + (vnoise(X * 0.16, Y * 0.55, 91) - 0.5) * 1.3;
    if (row < 2) lv -= 1.4 - row * 0.5;                  // the wall's foot, in shadow
    if (row === 10) return R.floor[5];                   // the front lip
    if (row === 11) return R.floor[4];
    if (row > 11) return R.floor[1];
    const cx = Math.floor(X / 7), cy = Math.floor(Y / 4), hs = hash(cx, cy, 93);
    if (hs < 0.14 && row > 1 && row < 10) {                // a pebble
      const px0 = cx * 7 + 1.5 + hash(cx, cy, 94) * 4, py0 = cy * 4 + 1.5 + hash(cx, cy, 95) * 1.5;
      const dx = X - px0, dy = (Y - py0) * 1.7;
      if (dx * dx + dy * dy < 3.4) return R.stone[dy < -0.4 ? 3 : dy > 0.8 ? 0 : 1 + (hs < 0.05 ? 1 : 0)];
    }
    if (X < DOMES[0].x + DOMES[0].rx && hash(Math.floor(X / 3), Y, 97) < 0.05) return R.wallC[7 - (row & 1)];   // straw
    const g = hash(X, Y, 13);
    if (g > 0.95) lv += 1.1; else if (g < 0.05) lv -= 1;
    return pick(R.floor, lv, i, j, 0.4);
  }

  // ---------------------------------------------------------- details
  // All in world coordinates, straight into the pixel buffer.
  function put(J, X, Y, c, a = 1) {
    const i = Math.round(X - J.x0), j = Math.round(Y - J.top);
    if (i < 0 || j < 0 || i >= J.w || j >= J.h) return;
    const k = j * J.w + i;
    J.px[k] = a >= 1 ? c : mix(J.px[k] || c, c, a);
  }
  const regAt = (J, X, Y) => {
    const i = Math.round(X - J.x0), j = Math.round(Y - J.top);
    return (i < 0 || j < 0 || i >= J.w || j >= J.h) ? AIR : J.reg[j * J.w + i];
  };
  // a pixel-art stamp: rows of characters, '.' clear
  function stamp(J, X, Y, rows, pal, a = 1, only = null) {
    for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === '.' || ch === ' ') continue;
      if (only && !only.includes(regAt(J, X + x, Y + y))) continue;
      put(J, X + x, Y + y, pal[ch], a);
    }
  }

  // stalactites off the roof of each hollow, and the lip of the mouth
  function teeth(J) {
    const rng = new RNG(4242);
    const S = R.sect;
    const tooth = (x, y, len, w0) => {
      for (let k = 0; k < len; k++) {
        const hw = Math.max(0.5, w0 * Math.pow(1 - k / len, 0.9) / 2);
        const x0 = Math.round(x - hw), x1 = Math.round(x + hw);
        for (let xx = x0 - 1; xx <= x1 + 1; xx++) {
          const edge = xx === x0 - 1 || xx === x1 + 1;
          if (edge) { if (regAt(J, xx, y + k) !== SECT) put(J, xx, y + k, INK); continue; }
          const u = (xx - x0) / Math.max(1, x1 - x0);
          const lv = 6.4 - u * 3.6 - (k / len) * 1.2 + (u < 0.25 ? 1 : 0);
          put(J, xx, y + k, pick(S, lv, xx, y + k, 0.5));
        }
      }
      put(J, x, y + len, INK);
      put(J, Math.round(x), y + len - 2, R.crystal[3]);           // the drip on the point
      put(J, Math.round(x), y + len - 1, R.crystal[4], 0.7);
    };
    for (let i = 3; i < J.w - 3; i += 1) {
      const X = J.x0 + i;
      const want = rng.chance(0.07);
      if (!want) continue;
      // find where the rock above gives way to a room below
      let y = null;
      for (const cand of [J.mouth[i], J.pass[i], J.roof[i]]) {
        if (cand === Infinity) continue;
        const Y = Math.round(cand);
        if (regAt(J, X, Y - 2) === SECT && [WALL, PASS, OPEN].includes(regAt(J, X, Y + 2))) { y = Y; break; }
      }
      if (y == null || y > GY - 70) continue;
      if (Math.abs(X - FISS.x) < 16) continue;
      const big = rng.chance(0.35);
      tooth(X, y - 1, big ? rng.int(14, 30) : rng.int(5, 12), big ? rng.int(6, 9) : rng.int(3, 5));
      i += big ? 10 : 5;
    }
    // stalagmites where the hollows come down to the floor
    for (const [x, n, dir] of [[DOMES[0].x - DOMES[0].rx + 30, 3, 1], [MOUTH.cx - MOUTH.rx - MOUTH.jamb - 14, 2, -1]]) {
      for (let m = 0; m < n; m++) {
        const bx = x + m * 11 * dir, h = 10 + ((m * 7 + x) % 3) * 8 - m * 3, w0 = 7 + (m % 2) * 3;
        for (let k = 0; k < h; k++) {
          const hw = Math.max(0.5, w0 * (k / h) / 2 + 0.5);
          const yy = FLOOR_TOP - h + k + 1;
          const x0 = Math.round(bx - hw), x1 = Math.round(bx + hw);
          put(J, x0 - 1, yy, INK); put(J, x1 + 1, yy, INK);
          for (let xx = x0; xx <= x1; xx++) {
            const u = (xx - x0) / Math.max(1, x1 - x0);
            put(J, xx, yy, pick(R.sect, 6 - u * 3.4 - (k / h) * 0.6, xx, yy, 0.5));
          }
        }
        put(J, bx, FLOOR_TOP - h, INK);
      }
    }
  }

  // roots in the topsoil, going down into the rock
  function roots(J) {
    const rng = new RNG(99);
    for (let n = 0; n < 60; n++) {
      const i = rng.int(20, J.w - 20), X = J.x0 + i;
      if (J.surf[i] === Infinity) continue;
      let x = X, y = J.surf[i] + 4;
      const len = rng.int(10, 34);
      for (let k = 0; k < len; k++) {
        if (regAt(J, x, y) !== SECT) break;
        put(J, x, y, k < len * 0.4 ? R.soil[0] : R.sect[1]);
        if (k < len * 0.3) put(J, x + 1, y, R.soil[1]);
        y += 1; x += rng.chance(0.3) ? (rng.chance(0.5) ? 1 : -1) : 0;
        if (rng.chance(0.06)) {                                    // a side root
          let sx = x, sy = y;
          const dir = rng.chance(0.5) ? 1 : -1;
          for (let q = 0; q < rng.int(3, 8); q++) { sx += dir; sy += rng.chance(0.6) ? 1 : 0; if (regAt(J, sx, sy) === SECT) put(J, sx, sy, R.soil[0]); }
        }
      }
    }
  }

  // grass blades above the crest, and a flower now and then
  function turf(J) {
    const rng = new RNG(7);
    const G = R.turf;
    const FL = [u32(hex('#ffb0cf')), u32(hex('#ffe98a')), u32(hex('#ffffff')), u32(hex('#a8d8ff'))];
    for (let i = 1; i < J.w - 1; i++) {
      const s = J.surf[i];
      if (s === Infinity) continue;
      const slope = Math.abs(J.surf[i + 1] - J.surf[i - 1]) / 2;
      if (slope > 1.2) continue;
      const X = J.x0 + i, Y = Math.round(s);
      const h = rng.chance(0.5) ? rng.int(1, 3) : rng.chance(0.4) ? rng.int(3, 6) : 0;
      for (let k = 1; k <= h; k++) put(J, X, Y - k, k === h ? G[5] : G[4 - (k > 2 ? 1 : 0)]);
      if (rng.chance(0.012)) {                                        // a flower on a stalk
        const fh = rng.int(5, 9), c = rng.pick(FL);
        for (let k = 1; k < fh; k++) put(J, X, Y - k, G[2]);
        put(J, X, Y - fh, c); put(J, X - 1, Y - fh, c); put(J, X + 1, Y - fh, c); put(J, X, Y - fh - 1, c);
        put(J, X, Y - fh + 1, c); put(J, X, Y - fh, u32(hex('#e0b93a')));
      }
    }
  }

  // bone and shell in the rock: the house sits on the fossil record
  const FOSSILS = {
    ammonite: ['...@@@@@...', '.@@####@@..', '@##@@@@##@.', '@#@####@#@.', '@#@#@@#@#@.', '@#@#@.@#@@.', '@#@##@##@..', '@##@@@@#@..', '.@@###@@...', '...@@@@....'],
    fish: ['..........@@.....', '.@....@..@#@@....', '@#@.@.@.@.@##@@..', '@@#@#@#@#@#@#@#@.', '@#@.@.@.@.@##@@..', '.@....@..@#@@....', '..........@@.....'],
    skull: ['....@@@@@@@@.....', '..@@########@@...', '.@##@@@##@####@..', '@##@..@##@#####@.', '@###@@###########', '.@##########@@@@#', '..@@@#@#@#@@.....', '....@.@.@.@......'],
    spine: ['@@..@@..@@..@@..@@', '##@@##@@##@@##@@##', '@@..@@..@@..@@..@@'],
  };
  // somewhere in the rock, clear of the rooms and under the topsoil, and in
  // the band of it the camera actually sees
  function spot(J, rng, w, h, margin) {
    for (let tries = 0; tries < 400; tries++) {
      const X = rng.int(SHELL.x0 + 20, MOUTH.end - 20), Y = rng.int(150, GY - 20 - h);
      let ok = true;
      for (let yy = -2; yy <= h + 2 && ok; yy += 2) for (let xx = -2; xx <= w + 2; xx += 2) {
        const i = Math.round(X + xx - J.x0), j = Math.round(Y + yy - J.top);
        const k = j * J.w + i;
        if (J.reg[k] !== SECT || J.dIn[k] / 3 < margin || J.dAir[k] / 3 < 20) { ok = false; break; }
      }
      if (ok) return [X, Y];
    }
    return null;
  }
  function fossils(J) {
    const rng = new RNG(303);
    const pal = { '@': R.bone[1], '#': R.bone[3] };
    const order = ['ammonite', 'skull', 'fish', 'spine', 'ammonite', 'fish', 'skull', 'ammonite'];
    for (const kind of order) {
      const rows = FOSSILS[kind];
      const at = spot(J, rng, rows[0].length, rows.length, 7);
      if (!at) continue;
      const [x, y] = at;
      // an ink shadow first, one pixel down and right, so it sits in the rock
      for (let yy = 0; yy < rows.length; yy++) for (let xx = 0; xx < rows[yy].length; xx++)
        if (rows[yy][xx] !== '.') put(J, x + xx + 1, y + yy + 1, INK);
      stamp(J, x, y, rows, pal);
    }
  }

  // seams of the crystal they dig for at the quarry, through the rock
  function crystals(J) {
    const rng = new RNG(5);
    const C = R.crystal;
    const cluster = (x, y, n) => {
      for (let m = 0; m < n; m++) {
        const cx = x + rng.int(-6, 6), h = rng.int(4, 10), w0 = rng.int(1, 2), lean = rng.float(-0.45, 0.45);
        for (let k = 0; k <= h; k++) {
          const hw = k > h - 2 ? 0 : w0;
          const xx = Math.round(cx + lean * k);
          for (let q = -hw - 1; q <= hw + 1; q++) {
            const edge = q === -hw - 1 || q === hw + 1;
            if (regAt(J, xx + q, y - k) !== SECT) continue;
            put(J, xx + q, y - k, edge ? INK : q < 0 ? C[3] : q === 0 ? C[2] : C[1]);
          }
        }
        put(J, Math.round(cx + lean * h), y - h - 1, INK);
        put(J, Math.round(cx + lean * (h - 2)) - 1, y - h + 2, C[4]);
      }
    };
    for (let n = 0; n < 14; n++) {
      const at = spot(J, rng, 14, 12, 6);
      if (at) cluster(at[0] + 7, at[1] + 12, rng.int(2, 4));
    }
  }

  // --------------------------------------------------------- paintings
  // A tiny rasteriser: shapes go into a set of pixels, and the set is daubed
  // onto the wall in pigment, flaking here and there, so the rock shows.
  const addDisc = (S, cx, cy, r) => {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.25) S.add(x * 4096 + y);
  };
  const addEll = (S, cx, cy, rx, ry) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.03) S.add(x * 4096 + y);
  };
  const addLine = (S, x0, y0, x1, y1, wd = 1) => {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.6) + 1;
    for (let q = 0; q <= n; q++) {
      const x = x0 + (x1 - x0) * q / n, y = y0 + (y1 - y0) * q / n;
      if (wd <= 1.1) S.add(Math.round(x) * 4096 + Math.round(y)); else addDisc(S, x, y, wd / 2);
    }
  };
  function daub(J, S, col, a = 0.8, flake = 0.07, seed = 1) {
    for (const key of S) {
      const x = Math.floor(key / 4096), y = key - x * 4096;
      if (regAt(J, x, y) !== WALL || hash(x, y, seed) < flake) continue;
      put(J, x, y, col, a * (0.82 + hash(x, y, seed + 1) * 0.18));
    }
  }
  // the pigment has an edge, a shade darker, like it soaked into the stone
  function daubEdged(J, S, col, edge, a, seed) {
    const E = new Set();
    for (const key of S) for (const d of [4096, -4096, 1, -1]) if (!S.has(key + d)) E.add(key + d);
    daub(J, E, edge, a * 0.6, 0.2, seed + 5);
    daub(J, S, col, a, 0.06, seed);
  }
  const P = {
    mammoth(S, T, x, y, s = 1, dir = 1) {
      addEll(S, x, y, 16 * s, 9 * s);
      addDisc(S, x - 5 * s * dir, y - 6 * s, 8 * s);                      // the hump
      addDisc(S, x + 14 * s * dir, y - 3 * s, 7 * s);                     // the head
      let px = x + 19 * s * dir, py = y - 1 * s;
      for (let q = 0; q < 10; q++) {                                      // the trunk, curling
        const nx = px + (q < 6 ? 0.7 : -0.5) * s * dir, ny = py + 1.4 * s;
        addLine(S, px, py, nx, ny, Math.max(1.2, 3.4 * s * (1 - q / 13))); px = nx; py = ny;
      }
      for (const lx of [-11, -5, 6, 11]) addLine(S, x + lx * s * dir, y + 5 * s, x + lx * s * dir, y + 16 * s, 3.4 * s);
      addLine(S, x - 16 * s * dir, y - 2 * s, x - 19 * s * dir, y + 6 * s, 1.4);   // the tail
      // the tusk, in chalk
      for (let q = 0; q <= 8; q++) { const u = q / 8; T.add(Math.round(x + (15 + u * 9) * s * dir) * 4096 + Math.round(y + (3 + Math.sin(u * 2.4) * 3 - u * 5) * s)); }
    },
    hunter(S, x, y, s = 1, dir = 1, spear = true) {
      addDisc(S, x, y - 12 * s, 2 * s);
      addLine(S, x, y - 10 * s, x - 0.5 * dir, y - 3 * s, 1.8 * s);
      addLine(S, x, y - 3 * s, x - 3.5 * s * dir, y + 4 * s, 1.5 * s); addLine(S, x, y - 3 * s, x + 3.5 * s * dir, y + 4 * s, 1.5 * s);
      addLine(S, x, y - 8 * s, x + 4.5 * s * dir, y - 10.5 * s, 1.3 * s);
      addLine(S, x, y - 8 * s, x - 3.5 * s * dir, y - 5.5 * s, 1.3 * s);
      if (spear) addLine(S, x - 5 * s * dir, y - 5 * s, x + 13 * s * dir, y - 13 * s, 1);
    },
    hand(S, x, y, s = 1) {
      addEll(S, x, y, 3.3 * s, 3.8 * s);
      for (const [a, b, c, d] of [[-3, -3, -4.8, -8.5], [-1, -4, -1.6, -10.5], [1.2, -4, 1.6, -11], [3, -3, 4, -9], [3.4, 0.5, 7, -3]])
        addLine(S, x + a * s, y + b * s, x + c * s, y + d * s, 1.9 * s);
    },
    sun(S, x, y, r) {
      addDisc(S, x, y, r);
      for (let q = 0; q < 10; q++) { const a = q / 10 * Math.PI * 2; addLine(S, x + Math.cos(a) * (r + 2), y + Math.sin(a) * (r + 2), x + Math.cos(a) * (r + 5), y + Math.sin(a) * (r + 5), 1.4); }
    },
    spiral(S, x, y, turns = 2.6, gap = 2.2) {
      let px = x, py = y;
      for (let a = 0; a < turns * Math.PI * 2; a += 0.15) {
        const r = 0.6 + a * gap / (Math.PI * 2) * 1.6;
        const nx = x + Math.cos(a) * r, ny = y + Math.sin(a) * r;
        addLine(S, px, py, nx, ny, 1.3); px = nx; py = ny;
      }
    },
    raptor(S, x, y, s = 1, dir = 1) {
      addEll(S, x, y, 7.5 * s, 4.2 * s);
      addLine(S, x + 5 * s * dir, y - 2 * s, x + 9 * s * dir, y - 8.5 * s, 2.6 * s);
      addEll(S, x + 11.5 * s * dir, y - 9.5 * s, 3.6 * s, 2.2 * s);
      addLine(S, x - 6 * s * dir, y - 1 * s, x - 18 * s * dir, y - 5 * s, 2.2 * s);
      addLine(S, x - 17 * s * dir, y - 5 * s, x - 22 * s * dir, y - 6 * s, 1.2);
      addLine(S, x - 1 * s * dir, y + 3 * s, x - 2.5 * s * dir, y + 10 * s, 1.7 * s); addLine(S, x + 2.5 * s * dir, y + 3 * s, x + 3.5 * s * dir, y + 10 * s, 1.7 * s);
      addLine(S, x + 6 * s * dir, y, x + 9 * s * dir, y + 3 * s, 1.1);
    },
    trex(S, x, y, s = 1, dir = 1) {
      addEll(S, x, y, 13 * s, 8.5 * s);
      addLine(S, x + 9 * s * dir, y - 4 * s, x + 12 * s * dir, y - 9 * s, 6 * s);
      addEll(S, x + 15 * s * dir, y - 12 * s, 7 * s, 5 * s);
      for (let q = 0; q < 10; q++) { const u = q / 10; addLine(S, x - (10 + u * 18) * s * dir, y + u * 5 * s, x - (12 + u * 18) * s * dir, y + (u + 0.1) * 5 * s, (5.5 - u * 4.5) * s); }
      addLine(S, x - 3 * s * dir, y + 6 * s, x - 6 * s * dir, y + 17 * s, 4 * s); addLine(S, x + 4 * s * dir, y + 6 * s, x + 6 * s * dir, y + 17 * s, 4 * s);
      addLine(S, x + 10 * s * dir, y + 1 * s, x + 13 * s * dir, y + 4 * s, 1.3);
    },
    guitar(S, x, y, s = 1) {
      addDisc(S, x, y, 4.2 * s); addDisc(S, x + 4 * s, y - 3.4 * s, 3.2 * s);
      addLine(S, x + 5 * s, y - 4.5 * s, x + 14 * s, y - 14 * s, 1.8 * s);
      addLine(S, x + 13 * s, y - 15 * s, x + 16.5 * s, y - 16.5 * s, 2.4 * s);
    },
    tally(S, x, y, n) {
      for (let q = 0; q < n; q++) {
        if (q % 5 === 4) addLine(S, x + (q - 4) * 3 - 1, y + 6, x + q * 3 - 2, y - 1, 1);
        else addLine(S, x + q * 3, y, x + q * 3, y + 7, 1);
      }
    },
  };
  function paintings(J) {
    const red = PIG.red, och = PIG.ochre, blk = PIG.black, chk = PIG.chalk;
    const edgeR = mix(red, INK, 0.45), edgeO = mix(och, INK, 0.4);
    const draw = (fn, col, edge, a, seed) => { const S = new Set(), T = new Set(); fn(S, T); daubEdged(J, S, col, edge, a, seed); if (T.size) daub(J, T, chk, 0.9, 0, seed + 9); };
    // ---- the sleeping hollow: the hunt, over the drum and the rug
    const hx = HOME.drum + 30, hy = 268;
    draw((S, T) => P.mammoth(S, T, hx, hy, 1, 1), red, edgeR, 0.78, 1);
    draw(S => { P.hunter(S, hx - 36, hy + 8, 1, 1); P.hunter(S, hx - 56, hy + 10, 0.9, 1); P.hunter(S, hx + 50, hy + 9, 1, -1); }, blk, blk, 0.78, 2);
    draw(S => P.sun(S, hx - 70, 226, 4), och, edgeO, 0.66, 3);
    draw(S => P.spiral(S, HOME.perch + 34, 250), och, edgeO, 0.6, 4);
    // the kids' hands, low down by the bed, where kids can reach
    draw(S => P.hand(S, HOME.bed - 76, 350, 1), och, edgeO, 0.62, 5);
    draw(S => P.hand(S, HOME.bed - 62, 358, 0.9), red, edgeR, 0.58, 6);
    draw(S => P.hand(S, HOME.bed + 98, 346, 0.85), chk, chk, 0.5, 7);
    // days since the last raptor incident
    draw(S => P.tally(S, HOME.perch - 40, 310, 9), blk, blk, 0.7, 8);
    // ---- the eating hollow: the band, the family, and the thing in the pit
    const fx = HOME.wallart, fy = 286;
    draw(S => {
      // four of them holding hands, the big one with a guitar
      const people = [[fx - 26, 1.3], [fx - 8, 1.1], [fx + 8, 0.8], [fx + 20, 0.75]];
      for (const [x, s] of people) P.hunter(S, x, fy, s, 1, false);
      for (let q = 0; q < people.length - 1; q++) addLine(S, people[q][0] + 4, fy - 9 * people[q][1], people[q + 1][0] - 3, fy - 8 * people[q + 1][1], 1);
    }, blk, blk, 0.8, 11);
    draw(S => P.guitar(S, fx - 38, fy - 6, 1), red, edgeR, 0.8, 12);
    draw(S => { const S2 = new Set(); addDisc(S, fx + 4, fy - 34, 3); addDisc(S, fx + 9, fy - 34, 3); addLine(S, fx + 2, fy - 33, fx + 6.5, fy - 28, 3); addLine(S, fx + 11, fy - 33, fx + 6.5, fy - 28, 3); }, red, edgeR, 0.72, 13);
    // blaze, on his chain
    draw(S => { P.raptor(S, HOME.stove - 70, 286, 1, 1); for (let q = 0; q < 6; q++) addDisc(S, HOME.stove - 88 - q * 4, 292 + q * 2, 1); }, red, edgeR, 0.7, 14);
    // and what is coming, in the corner, very big
    draw(S => P.trex(S, HOME.fossil + 44, 258, 1.2, -1), red, edgeR, 0.52, 15);
    draw(S => P.hunter(S, HOME.fossil - 10, 272, 0.9, -1, false), blk, blk, 0.7, 16);
    draw(S => P.hand(S, HOME.wallart + 52, 250, 1), och, edgeO, 0.5, 17);
    // soot, rising off the cook pit
    for (let y = GY - 56; y > GY - 260; y--) {
      const k = (GY - 56 - y) / 204;
      const hw = 24 + k * 46 + Math.sin(y * 0.07) * 6;
      for (let x = -hw; x <= hw; x++) {
        const X = Math.round(HOME.stove + x + Math.sin(y * 0.03) * 10);
        if (regAt(J, X, y) !== WALL) continue;
        const a = (1 - Math.abs(x) / hw) * (1 - k);
        if (a > 0.04 && hash(X, y, 71) < a * 0.9 + 0.2) put(J, X, y, INK, Math.min(0.55, a * 0.7));
      }
    }
  }

  // niches cut into the wall: a round-topped pocket, dark at the back, with
  // a lit sill and the shadow of the sill under it
  function niche(J, x, y, w, h) {
    for (let yy = -h; yy <= 0; yy++) for (let xx = -Math.floor(w / 2); xx <= Math.floor(w / 2); xx++) {
      const k = Math.abs(xx) / (w / 2);
      const yTop = -h * (0.58 + 0.42 * Math.sqrt(Math.max(0, 1 - k * k)));
      if (yy < yTop) continue;
      const X = x + xx, Y = y + yy;
      if (regAt(J, X, Y) !== WALL) continue;
      const edge = yy < yTop + 1 || k > 0.92;
      const lv = 0.4 + (yy - yTop) / h * 1.4 + (xx > 0 ? 0.5 : 0) - (yy < yTop + 4 ? 0.5 : 0);
      put(J, X, Y, edge ? INK : pick(R.wall, lv, X, Y, 0.35));
    }
    for (let xx = -Math.floor(w / 2) - 1; xx <= Math.floor(w / 2) + 1; xx++) {
      put(J, x + xx, y + 1, R.wall[8]); put(J, x + xx, y + 2, R.wall[5]); put(J, x + xx, y + 3, INK, 0.7);
    }
  }
  function niches(J) {
    niche(J, HOME.shelf + 8, 336, 30, 22);
    niche(J, MOUTH.cx - MOUTH.rx - MOUTH.jamb - 20, 332, 22, 18);
    niche(J, HOME.bed - 104, 318, 20, 16);
  }

  // --------------------------------------------------------- the driver
  function run(J, budget) {
    const t0 = performance.now();
    const over = () => performance.now() - t0 > budget;
    while (J.stage < 9) {
      if (J.stage === 0) {                            // where the crack over the bed starts
        let r = Infinity;
        for (const d of DOMES) { const y = World.caveRoof(d, FISS.x); if (y != null) r = Math.min(r, y); }
        J.roofFiss = r + 12;
        J.row = J.j0; J.stage = 1;
      }
      if (J.stage === 1) {                            // the region map
        while (J.row < J.j1) { classify(J, J.row++); if ((J.row & 15) === 0 && over()) return false; }
        J.stage = 2;
      }
      if (J.stage === 2) {                            // how far everything is from everything else
        const n = J.w * J.h, m1 = new Uint8Array(n), m2 = new Uint8Array(n), m3 = new Uint8Array(n);
        const under = (GY - J.top) * J.w;
        for (let k = J.j0 * J.w; k < J.j1 * J.w; k++) {
          const r = J.reg[k];
          m1[k] = r === AIR && k < under ? 1 : 0;
          m2[k] = (r === WALL || r === PASS || r === FLOOR || r === OPEN) ? 1 : 0;
          m3[k] = (r === SECT || r === OPEN || r === AIR) ? 1 : 0;
        }
        J.dAir = chamfer(m1, J.w, J.h, J.j0, J.j1);
        J.dIn = chamfer(m2, J.w, J.h, J.j0, J.j1);
        J.dOut = chamfer(m3, J.w, J.h, J.j0, J.j1);
        J.row = J.j0; J.stage = 3;
        if (over()) return false;
      }
      if (J.stage === 3) {                            // the paint
        while (J.row < J.j1) { paintRow(J, J.row++); if ((J.row & 7) === 0 && over()) return false; }
        J.stage = 4;
      }
      if (J.stage === 4) { paintings(J); niches(J); J.stage = 5; if (over()) return false; }
      if (J.stage === 5) { fossils(J); crystals(J); roots(J); J.stage = 6; if (over()) return false; }
      if (J.stage === 6) { teeth(J); turf(J); J.stage = 7; if (over()) return false; }
      if (J.stage === 7) {
        const g = J.cv.getContext('2d');
        g.putImageData(J.img, 0, 0);
        J.stage = 8;
      }
      if (J.stage === 8) {                            // scenery on the crest, from the valley set
        const g = J.cv.getContext('2d'), real = Gfx.ctx;
        Gfx.ctx = g; g.save(); g.translate(-J.x0, -J.top);
        const rng = new RNG(17);
        const kinds = ['v_bush', 'v_fern', 'v_flowers', 'v_bush_berry', 'v_fern', 'v_rock', 'v_bush'];
        for (let X = SHELL.x0 + 90; X < MOUTH.end - 40; X += rng.int(40, 90)) {
          const i = Math.round(X - J.x0);
          const s = J.surf[i], sl = Math.abs(J.surf[Math.min(J.w - 1, i + 8)] - J.surf[Math.max(0, i - 8)]) / 16;
          if (s === Infinity || sl > 0.5) continue;
          Gfx.sprite(rng.pick(kinds), X, s + 3, { anchor: 'bc', scale: rng.float(0.8, 1.05), flip: rng.chance(0.5) });
        }
        g.restore(); Gfx.ctx = real;
        J.stage = 9;
      }
    }
    return true;
  }

  return {
    job: null, canvas: null,
    // do a few milliseconds of it; true once it is finished
    step(ms = 6) {
      if (this.canvas) return true;
      if (!this.job) this.job = start();
      if (run(this.job, ms)) { this.canvas = this.job.cv; this.job = null; return true; }
      return false;
    },
    // the finished canvas, finishing it now if it has to
    get() { if (!this.canvas) this.step(1e9); return this.canvas; },
    reset() { this.canvas = null; this.job = null; },
    MOUTH,
  };
})();
