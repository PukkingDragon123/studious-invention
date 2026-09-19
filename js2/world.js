// ---------------------------------------------------------------------------
// world.js - the painted stages of the opening, in world coordinates.
//
// Every stage is one long horizontal strip. The same painter serves both the
// cutscene camera (which applies its own transform) and the side-scrolling
// mini-games (which translate by -camX), so walking out of the bedroom, through
// the passage, past the stove, out of the door and up to the car is one
// unbroken place.
// ---------------------------------------------------------------------------
'use strict';

const GY = 428;                      // the floor / ground line, everywhere

// The house is two domes leaning into each other: you sleep in the small one,
// you eat in the big one, and the low passage between them is where Bronk
// bangs his head every single morning.
const DOMES = [
  { x: 280, rx: 268, ry: 282 },      // the sleeping dome:  12 .. 548
  { x: 866, rx: 322, ry: 338 },      // the eating dome:   544 .. 1188
];

const HOME = {
  bed: 152, drum: 268, rug: 330, perch: 402, shelf: 476,      // the sleeping dome
  arch: 546,                                                  // the passage
  fossil: 646, wallart: 762, table: 828, plaque: 920,         // the eating dome
  stove: 1026, clutter: 1104, door: 1150,
  shower: 1390, car: 1650, end: 1800,
};

// The camp: one clearing, laid out left to right. He sits west of the fire so
// the thing in the east treeline is looking straight down the light at him.
const CAMP = { bronk: 452, fire: 540, rex: 836, end: 1100 };

// small deterministic wobble so scattered junk does not jitter between frames
const jitter = (i, m = 1) => ((Math.sin(i * 12.9898) * 43758.5453) % 1) * m;

const World = {
  // ------------------------------------------------------------------- HOME
  // x -12..974 is the pair of domes; past the door it is the yard, the mammoth
  // shower, the dodo nest and the car.
  home(t, o = {}, camX = 0) {
    const L = camX - 160, R = camX + VW + 160;
    const night = !!o.night;

    World.sky(t, o, camX, L, R);
    World.yard(t, o, camX, L, R);

    // ---- the house itself, seen in cutaway
    if (L < HOME.door + 260) {
      World.houseShell(night, !!o.dusk);
      World.homeWall(t, o, camX);
      World.homeStuff(t, o, camX);
      World.homeLight(t, o);
    }

    // ---- the ground you are standing on, cut open
    World.soil(t, o, camX, L, R);

    // ---- outdoor fixtures
    Gfx.sprite('shower_frame', HOME.shower, GY + 2, { anchor: 'bc', scale: 1.2 });
    if (o.showerOn) for (let i = 0; i < 2; i++) Particles.splash(HOME.shower + rnd(-20, 20), GY - 130, 1);
    if (!o.carGone) {
      Gfx.shadow(HOME.car, GY + 2, 120, 0.3);
      Gfx.sprite('car', HOME.car, GY + 2, { anchor: 'bc', frame: 0 });
    }
  },

  // ------------------------------------------------- what is under the floor
  // The house sits on the fossil record. Topsoil with roots in it, a clay
  // band, then rock - and every few paces something long dead in the rock.
  soil(t, o, camX, L, R) {
    const TOP = GY + 4, CLAY = GY + 22, ROCK = GY + 48, BOT = GY + 200;
    Gfx.rect(L, TOP, R - L, CLAY - TOP, '#3a2415');
    Gfx.rect(L, CLAY, R - L, ROCK - CLAY, '#5c3a20');
    Gfx.rect(L, ROCK, R - L, BOT - ROCK, '#4d4a5c');
    // the boundaries are never straight
    for (let x = Math.floor(L / 6) * 6; x < R; x += 6) {
      const w1 = Math.sin(x * 0.031) * 3 + Math.sin(x * 0.011) * 2;
      const w2 = Math.sin(x * 0.019 + 2) * 4 + Math.sin(x * 0.007) * 3;
      Gfx.rect(x, CLAY + w1 - 2, 6, 3, '#4a2d18');
      Gfx.rect(x, ROCK + w2 - 2, 6, 3, '#574a66');
      Gfx.rect(x, ROCK + w2 - 2, 6, 1, '#7a6d8a');
      Gfx.rect(x, TOP, 6, 2, '#241109');
    }
    // grit, pebbles and roots
    for (let x = Math.floor(L / 11) * 11; x < R; x += 11) {
      const k = Math.abs((x * 7) | 0) % 6;
      Gfx.rectA(x + jitter(x, 8), TOP + 4 + jitter(x + 1, 14), 3, 2, '#241109', 0.7);
      if (k < 2) Gfx.round(x + jitter(x + 2, 9), CLAY + 3 + jitter(x + 3, 18), 7, 4, 2, '#85562f');
      if (k === 3) Gfx.rectA(x + jitter(x + 4, 9), ROCK + 6 + jitter(x + 5, 60), 9, 3, '#574a66', 0.8);
      if (k === 4) Gfx.rectA(x + jitter(x + 6, 9), ROCK + 14 + jitter(x + 7, 70), 5, 2, '#7a6d8a', 0.6);
    }
    for (let x = Math.floor(L / 96) * 96; x < R; x += 96) {          // roots reaching down
      if (x > -40 && x < HOME.door + 40) continue;
      const rx = x + jitter(x, 50);
      let px = rx, py = TOP;
      for (let i = 0; i < 7; i++) {
        const nx = px + Math.sin(i * 1.7 + x) * 5, ny = py + 6;
        Gfx.line(px, py, nx, ny, '#241109', 3 - i * 0.3);
        if (i === 3) Gfx.line(nx, ny, nx + 13, ny + 9, '#241109', 1.6);
        if (i === 5) Gfx.line(nx, ny, nx - 11, ny + 7, '#241109', 1.4);
        px = nx; py = ny;
      }
    }
    // and the things in the rock
    for (let k = 0; k < 4; k++) {                                   // strata lines in the rock
      for (let x = Math.floor(L / 13) * 13; x < R; x += 13) {
        const y = ROCK + 16 + k * 22 + Math.sin(x * 0.013 + k) * 5;
        Gfx.rectA(x + jitter(x + k, 9), y, 10, 3, k % 2 ? '#3b3048' : '#7a6d8a', 0.30);
      }
    }
    for (let x = Math.floor(L / 230) * 230; x < R; x += 230) {
      World.buried(x + jitter(x, 90), ROCK + 12 + jitter(x + 9, 30), Math.abs((x / 230) | 0) % 6);
    }
  },
  // one fossil, picked from six, drawn straight into the strata
  buried(x, y, kind) {
    const A = '#c4b89a', B = '#8a7f68', C = '#e8dfc6';
    if (kind === 0) {                                     // a skull in profile
      Gfx.round(x - 15, y - 9, 30, 18, 6, B);
      Gfx.round(x - 13, y - 8, 26, 14, 5, A);
      Gfx.round(x + 8, y - 4, 12, 8, 3, A);               // the snout
      Gfx.circle(x - 4, y - 3, 3.2, '#241c2e');           // the eye socket
      for (let i = 0; i < 5; i++) Gfx.rect(x + 8 + i * 2.4, y + 3, 2, 3, C);
    } else if (kind === 1) {                              // a ribcage
      Gfx.line(x - 22, y - 6, x + 22, y - 2, B, 4);
      for (let i = 0; i < 8; i++) {
        const rx = x - 19 + i * 5.4;
        Gfx.line(rx, y - 5, rx - 3, y + 9 + (i % 2) * 3, A, 2.6);
      }
    } else if (kind === 2) {                              // a small ammonite
      for (let i = 0; i < 90; i++) {
        const a = i * 0.16, r = 1.6 * Math.exp(a * 0.12);
        if (r > 13) break;
        Gfx.circle(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.4 + r * 0.16, i % 10 < 5 ? A : B);
      }
      Gfx.circle(x, y, 2, C);
    } else if (kind === 3) {                              // a fish
      Gfx.line(x - 16, y, x + 12, y, B, 3);
      for (let i = 0; i < 11; i++) {
        const fx = x - 14 + i * 2.6, h = 7 - Math.abs(i - 5) * 0.9;
        Gfx.line(fx, y - h, fx, y + h, A, 1.4);
      }
      Gfx.line(x + 12, y, x + 20, y - 7, A, 2); Gfx.line(x + 12, y, x + 20, y + 7, A, 2);
      Gfx.circle(x - 15, y - 1, 2, C);
    } else if (kind === 4) {                              // a three-toed footprint
      Gfx.round(x - 8, y - 2, 16, 11, 4, '#3b3048');
      for (let i = 0; i < 3; i++) {
        const a = -2.2 + i * 0.55;
        Gfx.line(x, y, x + Math.cos(a) * 15, y + Math.sin(a) * 15, '#3b3048', 5);
      }
    } else {                                              // a tooth and some chips
      Gfx.line(x - 3, y - 11, x + 1, y + 8, C, 5);
      Gfx.line(x - 3, y - 11, x + 1, y + 8, A, 2);
      for (let i = 0; i < 4; i++) Gfx.rectA(x + 8 + i * 5, y - 4 + (i % 3) * 5, 4, 3, B, 0.9);
    }
  },

  // --------------------------------------------------------------- the sky
  // Bright by default. Night is a warm dawn, never a blackout - the picture
  // stays readable whatever time the script says it is.
  sky(t, o, camX, L, R) {
    const night = !!o.night;
    const bands = night ? ['#241c2e', '#4b2070', '#7c3eb2', '#a03a68', '#e06a1b', '#ffa832']
      : o.dusk ? ['#2a1430', '#5c1f3d', '#a03a68', '#e06a1b', '#ffa832', '#ffe08a']
        : ['#1d3d72', '#3570c0', '#3570c0', '#6aa9ee', '#a8d8ff', '#ffe08a'];
    World.skyRamp(L, R, -460, GY, bands);
    const sx = 360 - camX * 0.04;
    Gfx.circle(sx, night ? -20 : -70, night ? 26 : 34, night ? '#ffe08a' : '#ffe98a');
    Gfx.glow(sx, night ? -20 : -70, 230, '#ffe98a', 0.3);
    World.clouds(t, camX, L, R, night);
    World.flock(t, camX, L, R, night);
    const ridge = (depth, col, edge, base, amp, scrub) => {
      const ctx = Gfx.ctx, off = camX * depth;
      const hy = x => base + Math.sin((x + off) * 0.0035) * amp + Math.sin((x + off) * 0.011) * amp * 0.4;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(L, GY);
      for (let x = L; x <= R; x += 24) ctx.lineTo(x, hy(x));
      ctx.lineTo(R, GY + 220); ctx.lineTo(L, GY + 220); ctx.fill();
      for (let x = Math.floor(L / 6) * 6; x < R; x += 6) Gfx.rect(x, hy(x), 6, 4, edge);   // lit crest
      for (let x = Math.floor(L / 34) * 34; x < R; x += 34) {                              // scrub on the slope
        const y = hy(x) + 10 + jitter(x + depth * 100, 40);
        Gfx.rectA(x + jitter(x, 24), y, 9, 4, edge, 0.28);
        if (scrub && ((x / 34) | 0) % 3 === 0) Gfx.round(x + jitter(x + 2, 24), y + 8, 13, 7, 3, edge);
      }
    };
    ridge(0.55, night ? '#7c3eb2' : '#7a6d8a', night ? '#b177e6' : '#9391a6', 226, 48);
    ridge(0.35, night ? '#4b2070' : '#574a66', night ? '#7c3eb2' : '#7a6d8a', 282, 30);
    // the village across the valley
    for (let i = 0; i < 11; i++) {
      const hx = 1700 + i * 150 - camX * 0.22;
      if (hx < L - 140 || hx > R + 140) continue;
      Gfx.sprite(i % 3 === 1 ? 'prop_hut_ruin' : 'prop_hut', hx, 340 + (i % 2) * 8, { anchor: 'bc', scale: 0.62, alpha: night ? 0.7 : 0.82 });
    }
    Gfx.sprite('prop_totem', 1940 - camX * 0.22, 338, { anchor: 'bc', scale: 0.7, alpha: 0.85 });
    { const hz = Gfx.ctx.createLinearGradient(0, 232, 0, 362);
      hz.addColorStop(0, 'rgba(168,216,255,0)');
      hz.addColorStop(0.55, night ? 'rgba(224,106,27,0.30)' : 'rgba(168,216,255,0.32)');
      hz.addColorStop(1, 'rgba(168,216,255,0)');
      Gfx.ctx.fillStyle = hz; Gfx.ctx.fillRect(L, 232, R - L, 130); }
    ridge(0.16, night ? '#27632f' : '#3f9a45', night ? '#3f9a45' : '#6cc95c', 372, 14, true);
    for (let x = Math.floor(L / 140) * 140; x < R; x += 140) {        // trees on the near hill
      const hx = x - camX * 0.16 * 0 + jitter(x, 60);
      Gfx.sprite(((x / 140) | 0) % 3 ? 'prop_tree' : 'prop_palm', hx, 386 + jitter(x + 4, 8),
        { anchor: 'bc', scale: 0.5, alpha: night ? 0.6 : 0.85 });
    }
  },

  // Fat cartoon clouds, built from lobes with a lit crown and a flat shaded
  // underside, drifting at three depths.
  clouds(t, camX, L, R, night, top = -190) {
    const LOBES = [[0, 0, 62, 20], [40, -14, 48, 22], [-38, -6, 40, 17], [84, -2, 34, 15], [-72, 4, 26, 11]];
    for (let d = 0; d < 3; d++) {
      const depth = 0.03 + d * 0.035, span = 1100 + d * 260, n = 4;
      for (let i = 0; i < n; i++) {
        const cx = ((i * span / n + d * 190 - camX * depth + t * (2 + d)) % span + span) % span + L - 220;
        const cy = top + d * 52 + (i % 3) * 22;
        const s2 = 0.6 + d * 0.22;
        Gfx.ctx.globalAlpha = night ? 0.24 + d * 0.05 : 0.55 + d * 0.14;
        for (const [ox, oy, rx, ry] of LOBES)                     // the shaded belly
          Gfx.round(cx + ox * s2 - rx * s2, cy + oy * s2 - ry * s2 + 5, rx * 2 * s2, ry * 2 * s2, ry * s2, night ? '#7c3eb2' : '#a8d8ff');
        for (const [ox, oy, rx, ry] of LOBES)
          Gfx.round(cx + ox * s2 - rx * s2, cy + oy * s2 - ry * s2, rx * 2 * s2, ry * 2 * s2, ry * s2, '#ffffff');
        for (const [ox, oy, rx, ry] of LOBES)                     // the lit crown
          Gfx.round(cx + ox * s2 - rx * s2 * 0.8, cy + oy * s2 - ry * s2, rx * 1.6 * s2, ry * 0.7 * s2, ry * 0.4 * s2, night ? '#ffe08a' : '#ffffff');
        Gfx.ctx.globalAlpha = 1;
      }
    }
  },
  // pterodactyls, always. three depths, wings on their own clock.
  flock(t, camX, L, R, night, top = -170) {
    for (let d = 0; d < 3; d++) {
      const depth = 0.05 + d * 0.06, span = 1500 + d * 420, n = d === 0 ? 2 : 3;
      for (let i = 0; i < n; i++) {
        const px = ((i * span / n + d * 330 - camX * depth + t * (26 + d * 22)) % span + span) % span + L - 260;
        const py = top + d * 58 + (i % 3) * 28 + Math.sin(t * (0.7 + d * 0.2) + i * 2) * 14;
        const sc = 0.34 + d * 0.22;
        Gfx.sprite('ptero_fly', px, py, {
          anchor: 'c', scale: sc, frame: Math.floor(t * (5 + d) + i * 2) % 4,
          alpha: night ? 0.62 : 0.9,
        });
      }
    }
  },

  // Hard colour bands with a two-row checker where they meet: a pixel-art sky
  // gradient, and the only kind this game is allowed to have.
  skyRamp(L, R, top, bot, cols) {
    const n = cols.length, bh = (bot - top) / n;
    for (let i = 0; i < n; i++) {
      Gfx.rect(L, top + i * bh, R - L, Math.ceil(bh) + 1, cols[i]);
      if (!i) continue;
      // three rows of ordered dither, 50 / 25 / 12 per cent of the band above
      for (let k = 0; k < 3; k++) {
        const y = top + i * bh + k * 2;
        const w = [4, 2, 1][k], off = [0, 2, 5][k];
        for (let x = Math.floor(L / 8) * 8; x < R; x += 8) {
          Gfx.rect(x + off, y, w, 2, cols[i - 1]);
          if (k === 0) Gfx.rect(x + 4, y + 1, 4, 1, cols[i]);
        }
      }
    }
  },

  // ------------------------------------------------------- the yard outside
  // Ferns, cycads, horsetails and flowers, thick enough that the ground never
  // reads as an empty brown strip.
  yard(t, o, camX, L, R) {
    const night = !!o.night;
    Gfx.rect(L, GY - 6, R - L, 320, night ? '#5c3a20' : '#85562f');
    Gfx.rect(L, GY - 6, R - L, 6, night ? '#85562f' : '#b07a45');
    { const g = Gfx.ctx.createLinearGradient(0, GY + 10, 0, GY + 200);
      g.addColorStop(0, 'rgba(92,58,32,0)'); g.addColorStop(1, 'rgba(58,36,21,0.6)');
      Gfx.ctx.fillStyle = g; Gfx.ctx.fillRect(L, GY + 10, R - L, 190); }
    // grass tufts and pebbles everywhere
    for (let x = Math.floor(L / 22) * 22; x < R; x += 22) {
      if (x > -200 && x < HOME.door + 44) continue;        // not indoors
      const gx = x + jitter(x, 16), gy = GY + 2 + jitter(x + 3, 52);
      for (let k = 0; k < 3; k++) Gfx.rect(gx + k * 3, gy - 4 - (k === 1 ? 3 : 0), 2, 5 + (k === 1 ? 3 : 0), night ? '#27632f' : '#3f9a45');
      if (((x / 22) | 0) % 4 === 0) Gfx.round(gx + 8, gy + 6, 7, 4, 2, '#7a6d8a');
    }
    for (let x = Math.floor(L / 96) * 96; x < R; x += 96) {
      if (x > -200 && x < HOME.door + 44) continue;          // not through the house
      const k = ((x / 96) | 0) % 5, px = x + jitter(x, 40);
      if (k === 0) World.cycad(px, GY + 4, 1);
      else if (k === 1) Gfx.sprite('prop_fern', px, GY + 4, { anchor: 'bc', scale: 1.2 });
      else if (k === 2) World.horsetail(px, GY + 4, t);
      else if (k === 3) World.flowerPatch(px, GY + 3, x);
      else Gfx.sprite('prop_bush', px, GY + 4, { anchor: 'bc' });
    }
    Gfx.sprite('prop_palm', HOME.door + 150, GY + 4, { anchor: 'bc' });
    Gfx.sprite('prop_tree', HOME.shower + 290, GY + 6, { anchor: 'bc', alpha: 0.95 });
    Gfx.sprite('prop_rock', HOME.shower - 180, GY + 4, { anchor: 'bc' });
    World.cycad(HOME.door + 66, GY + 4, 1.3);
    World.flowerPatch(HOME.nest - 90, GY + 3, 7);
    World.horsetail(HOME.car - 120, GY + 4, t);
  },
  // a squat prehistoric palm: a stubby trunk and a crown of stiff fronds
  cycad(x, y, s = 1) {
    Gfx.shadow(x, y + 1, 30 * s, 0.26);
    for (let k = 0; k < 5; k++) Gfx.round(x - 9 * s, y - (k + 1) * 7 * s, 18 * s, 8 * s, 3, k % 2 ? '#5c3a20' : '#85562f');
    const top = y - 36 * s;
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      const ex = x + Math.cos(a) * 30 * s, ey = top + Math.sin(a) * 22 * s;
      Gfx.line(x, top, ex, ey, '#14331e', 5 * s);
      Gfx.line(x, top, ex * 0.98 + x * 0.02, ey * 0.98 + top * 0.02, i % 2 ? '#3f9a45' : '#27632f', 3 * s);
      for (let f = 2; f < 7; f++) {                       // leaflets down each frond
        const fx = x + Math.cos(a) * 4.2 * f * s, fy = top + Math.sin(a) * 3.1 * f * s;
        Gfx.rect(fx - 1, fy - 3 * s, 2, 5 * s, '#6cc95c');
      }
    }
    Gfx.round(x - 5 * s, top - 4 * s, 10 * s, 8 * s, 3, '#85562f');
  },
  // horsetails: jointed green rods that sway
  horsetail(x, y, t) {
    Gfx.shadow(x, y + 1, 22, 0.2);
    for (let i = 0; i < 5; i++) {
      const bx = x - 14 + i * 7, h = 34 + (i % 3) * 13;
      const sway = Math.sin(t * 1.3 + i) * 2;
      for (let k = 0; k < h; k += 5) {
        Gfx.rect(bx + sway * (k / h), y - k - 5, 3, 4, k % 10 ? '#27632f' : '#3f9a45');
        if (k % 10 === 0) Gfx.rect(bx - 1 + sway * (k / h), y - k - 5, 5, 1, '#14331e');
      }
      Gfx.round(bx - 1 + sway, y - h - 8, 5, 6, 2, '#a8e878');
    }
  },
  // a patch of cretaceous flowers, in whatever colour this bit of ground got
  flowerPatch(x, y, seed) {
    const cols = [['#ffb0cf', '#e06a9b'], ['#ffe98a', '#e0b93a'], ['#a8d8ff', '#6aa9ee'], ['#ffffff', '#d6cfe0']];
    for (let i = 0; i < 6; i++) {
      const fx = x - 26 + i * 10 + jitter(seed + i, 7), h = 12 + jitter(seed + i * 3, 12);
      Gfx.rect(fx, y - h, 2, h, '#27632f');
      Gfx.rect(fx - 3, y - h * 0.6, 4, 2, '#3f9a45');
      const c = cols[(seed + i) % cols.length];
      Gfx.rect(fx - 3, y - h - 3, 8, 3, c[0]);
      Gfx.rect(fx - 1, y - h - 5, 4, 7, c[0]);
      Gfx.rect(fx, y - h - 2, 2, 2, c[1]);
    }
  },
  // ------------------------------------------------------------- the domes
  // The height of the dome's inner face at world x, or null outside it.
  domeY(d, x) {
    const k = (x - d.x) / d.rx;
    if (k <= -1 || k >= 1) return null;
    return GY - d.ry * Math.sqrt(1 - k * k);
  },
  // Stamp chunky squares along the top half of an ellipse. Everything curved in
  // this house is built this way, so nothing reads as a vector arc.
  archDots(cx, cy, rx, ry, col, size = 3, step = 0.05) {
    for (let a = 0; a <= Math.PI + 0.001; a += step) {
      const x = cx - Math.cos(a) * rx, y = cy - Math.sin(a) * ry;
      Gfx.rect(Math.round(x / size) * size, Math.round(y / size) * size, size, size, col);
    }
  },
  // The wall, the domes and the floor are static, so they are baked once into
  // an offscreen canvas and blitted.
  _shell: new Map(),
  // NB: the extents are constants on purpose. They key the cache, so anything
  // derived from the camera would rebuild this canvas every single frame.
  houseShell(night, dusk) {
    const x0 = -110, x1 = 1250, top = -300, bot = GY + 240;
    const key = (night ? 'n' : dusk ? 'd' : 'day');
    let c = World._shell.get(key);
    if (!c) {
      const w = Math.ceil(x1 - x0), h = Math.ceil(bot - top);
      c = document.createElement('canvas'); c.width = w; c.height = h;
      const real = Gfx.ctx;
      Gfx.ctx = c.getContext('2d');
      Gfx.ctx.translate(-x0, -top);
      for (const d of DOMES) World.dome(d, night);
      World.indoorFloor(x0, x1);
      for (const d of DOMES) World.domeRim(d, night);
      World.passage(night);                 // last, so the two domes really join
      Gfx.ctx = real;
      World._shell.set(key, c);
      if (World._shell.size > 4) World._shell.delete(World._shell.keys().next().value);
    }
    Gfx.ctx.drawImage(c, x0, top);
  },
  // one dome, in cutaway: plastered inner face, rib beams, woven panels, a
  // stone footing and a smoke hole at the crown
  dome(d, night) {
    const S = 4;
    const wall = night ? '#6e6b80' : '#9391a6';
    const wallDark = night ? '#4d4a5c' : '#7a6d8a';
    // --- the inner face, stepped in 4px columns so the curve stays pixelly
    for (let x = d.x - d.rx; x < d.x + d.rx; x += S) {
      const y = World.domeY(d, x + S / 2);
      if (y == null) continue;
      const yt = Math.round(y / S) * S;
      Gfx.rect(x, yt, S, GY - yt + 8, wall);
      Gfx.rect(x, yt, S, 6, wallDark);                       // the curve's own shading
    }
    // --- a soft vertical wash: brighter under the smoke hole
    const g = Gfx.ctx.createLinearGradient(0, GY - d.ry, 0, GY);
    g.addColorStop(0, 'rgba(255,233,138,0.10)');
    g.addColorStop(0.45, 'rgba(255,233,138,0.02)');
    g.addColorStop(1, 'rgba(59,48,72,0.26)');
    Gfx.ctx.save();
    Gfx.ctx.beginPath();
    Gfx.ctx.ellipse(d.x, GY, d.rx, d.ry, 0, Math.PI, 0);
    Gfx.ctx.lineTo(d.x + d.rx, GY); Gfx.ctx.lineTo(d.x - d.rx, GY);
    Gfx.ctx.clip();
    Gfx.ctx.fillStyle = g; Gfx.ctx.fillRect(d.x - d.rx, GY - d.ry, d.rx * 2, d.ry);
    Gfx.ctx.restore();
    // --- latitude rings, then rib beams: a woven dome, seen from inside
    for (const s of [0.34, 0.58, 0.79, 0.93]) {
      World.archDots(d.x, GY, d.rx * s, d.ry * s, night ? '#4d4a5c' : '#6e6b80', 3, 0.03);
      World.archDots(d.x, GY - 2, d.rx * s, d.ry * s, night ? '#6e6b80' : '#bdbccd', 3, 0.03);
    }
    for (let i = 1; i < 6; i++) {
      const s = i / 6;
      World.archDots(d.x, GY, d.rx * s, d.ry, '#3a2415', 5, 0.02);
      World.archDots(d.x - 1, GY, d.rx * s, d.ry - 2, '#b07a45', 3, 0.02);
    }
    // --- hide panels stitched between the ribs, low down where you see them
    for (let i = 0; i < 6; i++) {
      const a0 = Math.PI * (i + 0.12) / 6, a1 = Math.PI * (i + 0.88) / 6;
      for (let k = 0; k < 5; k++) {
        const a = a0 + (a1 - a0) * (k / 4), r = 0.72 + (k % 2) * 0.04;
        const x = d.x - Math.cos(a) * d.rx * r, y = GY - Math.sin(a) * d.ry * r;
        Gfx.rect(Math.round(x / 3) * 3, Math.round(y / 3) * 3, 3, 3, '#b07a45');
      }
    }
    // --- the stone footing: three courses of proper blocks around the base
    World.footing(d, night);
    // --- the smoke hole
    const hy = GY - d.ry;
    Gfx.rect(d.x - 26, hy - 2, 52, 16, '#3a2415');
    Gfx.rect(d.x - 22, hy + 1, 44, 10, night ? '#4b2070' : '#a8d8ff');
    Gfx.rect(d.x - 22, hy + 1, 44, 3, night ? '#7c3eb2' : '#ffe08a');
    for (let i = 0; i < 4; i++) Gfx.rect(d.x - 18 + i * 11, hy - 1, 3, 14, '#5c3a20');
  },
  // three courses of blocks around the foot of a dome, following its curve
  footing(d, night) {
    const base = night ? ['#4d4a5c', '#574a66', '#3b3048'] : ['#6e6b80', '#7a6d8a', '#574a66'];
    const lit = night ? '#7a6d8a' : '#bdbccd';
    for (let row = 0; row < 3; row++) {
      const y = GY - 8 - row * 24;
      for (let x = d.x - d.rx; x < d.x + d.rx; x += 46) {
        const px = x + (row % 2) * 23;
        const top = World.domeY(d, px + 22);
        if (top == null || top > y - 6) continue;
        const bw = Math.min(42, d.x + d.rx - px - 2);
        if (bw < 10) continue;
        Gfx.rect(px, y, bw, 21, base[Math.abs((px * 7 + row * 13) | 0) % base.length]);
        Gfx.rectA(px, y, bw, 2, lit, 0.55);
        Gfx.rectA(px, y + 19, bw, 2, '#120c16', 0.4);
        Gfx.rectA(px + 5, y + 6, 5, 3, lit, 0.22);
        Gfx.rectA(px + bw - 12, y + 12, 6, 3, '#120c16', 0.18);
      }
    }
  },
  // the thick outer shell, drawn last so it reads in front of the furniture
  domeRim(d, night) {
    const col = night ? '#3b3048' : '#574a66';
    const lit = night ? '#574a66' : '#9391a6';
    World.archDots(d.x, GY, d.rx, d.ry, col, 6, 0.012);
    World.archDots(d.x, GY - 5, d.rx - 1, d.ry - 5, col, 5, 0.012);
    World.archDots(d.x, GY - 10, d.rx - 2, d.ry - 10, lit, 3, 0.012);
    // block joints around the shell
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI * i / 16;
      const x = d.x - Math.cos(a) * d.rx, y = GY - Math.sin(a) * d.ry;
      Gfx.line(x, y, d.x - Math.cos(a) * (d.rx - 16), GY - Math.sin(a) * (d.ry - 16), '#241c2e', 3);
    }
  },
  // the low barrel passage where the two domes lean together: a stone-ringed
  // tunnel with a hide curtain hooked back, so you can see it is a way through
  passage(night) {
    const a = DOMES[0], b = DOMES[1];
    const x0 = b.x - b.rx, x1 = a.x + a.rx;
    const cx = (x0 + x1) / 2, rx = Math.max(52, (x1 - x0) / 2 + 40), ry = 152;
    const inner = night ? '#4d4a5c' : '#7a6d8a';
    for (let x = cx - rx; x < cx + rx; x += 4) {
      const k = (x + 2 - cx) / rx;
      if (k <= -1 || k >= 1) continue;
      const yt = Math.round((GY - ry * Math.sqrt(1 - k * k)) / 4) * 4;
      Gfx.rect(x, yt, 4, GY - yt + 8, inner);
      Gfx.rect(x, yt, 4, 6, night ? '#3b3048' : '#574a66');
    }
    // ring courses down the vault, so it reads as a tunnel and not a wall
    for (const t of [0.86, 0.70, 0.54, 0.38, 0.22]) {
      World.archDots(cx, GY, rx * t, ry * t, night ? '#4d4a5c' : '#6e6b80', 4, 0.02);
      World.archDots(cx, GY - 3, rx * t, ry * t, night ? '#6e6b80' : '#9391a6', 2, 0.02);
    }
    Gfx.rectA(cx - rx, GY - 40, rx * 2, 46, '#120c16', 0.18);      // it is dim in there
    // the arch itself
    World.archDots(cx, GY, rx, ry, '#3b3048', 6, 0.012);
    World.archDots(cx, GY - 6, rx - 1, ry - 6, '#7a6d8a', 4, 0.012);
    World.archDots(cx, GY - 11, rx - 2, ry - 11, '#bdbccd', 2, 0.012);
    for (let i = 0; i <= 8; i++) {                            // keystones
      const ang = Math.PI * i / 8;
      const x = cx - Math.cos(ang) * rx, y = GY - Math.sin(ang) * ry;
      Gfx.line(x, y, cx - Math.cos(ang) * (rx - 15), GY - Math.sin(ang) * (ry - 15), '#241c2e', 3);
    }
    // the door-hide, rolled up and tied off, because someone here is tidy
    Gfx.rect(cx - rx + 16, GY - ry + 14, rx * 2 - 32, 6, '#5c3a20');
    for (let i = 0; i < 4; i++)
      Gfx.round(cx - rx + 20 + i * ((rx * 2 - 44) / 4), GY - ry + 20, (rx * 2 - 44) / 4 - 2, 20, 6, i % 2 ? '#85562f' : '#b07a45');
    for (let i = 0; i < 3; i++) Gfx.rect(cx - rx + 34 + i * 30, GY - ry + 18, 3, 26, '#3a2415');
  },

  // The floor indoors is the same packed earth as the yard, just swept, with
  // stones set into it and a skirting where it meets the wall. No fill of its
  // own - the yard already laid the ground, so nothing seams at the edges.
  indoorFloor(x0, x1) {
    for (let y = GY - 2; y < GY + 90; y += 9) {
      for (let x = x0; x < x1; x += 14) {
        const k = Math.abs(((x * 5 + y * 11) | 0)) % 7;
        if (k < 3) Gfx.rectA(x + jitter(x + y, 8), y, 7 + k * 3, 3, '#b07a45', 0.30);
        else if (k === 4) Gfx.rectA(x + jitter(x - y, 8), y + 2, 4, 3, '#5c3a20', 0.45);
      }
    }
    for (let x = Math.floor(x0 / 52) * 52; x < x1; x += 52) {
      const sx = x + jitter(x, 34), sy = GY + 6 + jitter(x + 5, 44);
      Gfx.round(sx, sy, 13, 7, 3, '#7a6d8a');
      Gfx.round(sx + 1, sy, 10, 3, 2, '#9391a6');
    }
    Gfx.rect(x0, GY - 12, x1 - x0, 8, '#3a2415');              // skirting
    Gfx.rectA(x0, GY - 15, x1 - x0, 3, '#b07a45', 0.5);
  },

  // ------------------------------------------------------ the wall dressing
  homeWall(t, o, camX) {
    const ctx = Gfx.ctx;
    // ---------------- sleeping dome: a round window over the bed
    const wx = HOME.bed + 44, wy = 236;
    World.archDots(wx, wy + 46, 48, 50, '#3a2415', 5, 0.02);
    for (let x = wx - 42; x < wx + 42; x += 4) {
      const k = (x + 2 - wx) / 42;
      if (k <= -1 || k >= 1) continue;
      const h = 44 * Math.sqrt(1 - k * k);
      Gfx.rect(x, wy + 46 - h, 4, h * 2, o.night ? '#7c3eb2' : '#6aa9ee');
      Gfx.rect(x, wy + 46 - h, 4, h * 0.66, o.night ? '#a03a68' : '#a8d8ff');
    }
    for (let i = 0; i < 3; i++)                                   // hills through the glass
      Gfx.round(wx - 30 + i * 24, wy + 60 + (i % 2) * 6, 34, 24, 12, o.night ? '#4b2070' : '#3f9a45');
    Gfx.rect(wx - 3, wy - 4, 6, 96, '#3a2415'); Gfx.rect(wx - 46, wy + 43, 92, 6, '#3a2415');
    Gfx.round(wx - 50, wy + 88, 100, 9, 3, '#5c3a20');            // the sill
    Gfx.round(wx - 50, wy + 88, 100, 3, 2, '#b07a45');
    Gfx.sprite('prop_mushroom', wx - 26, wy + 88, { anchor: 'bc', scale: 0.6 });
    World.flowerPatch(wx + 20, wy + 89, 3);
    // ---------------- cave paintings between the window and the shelf
    const cx = HOME.drum + 4;
    const paint = (x, y, s, col) => {
      ctx.globalAlpha = 0.6;
      Gfx.circle(x, y, 4 * s, col); Gfx.rect(x - 1.5 * s, y, 3 * s, 12 * s, col);
      Gfx.line(x - 6 * s, y + 14 * s, x + 6 * s, y + 14 * s, col, 2);
      Gfx.line(x - 5 * s, y + 3 * s, x + 5 * s, y + 3 * s, col, 2);
      ctx.globalAlpha = 1;
    };
    paint(cx, 258, 1, '#a03a68'); paint(cx + 30, 264, 0.8, '#a03a68');
    paint(cx + 54, 268, 0.6, '#a03a68'); paint(cx + 74, 268, 0.6, '#a03a68');
    ctx.globalAlpha = 0.5;
    Gfx.round(cx + 104, 248, 62, 30, 12, '#5c1607');
    Gfx.rect(cx + 109, 276, 6, 14, '#5c1607'); Gfx.rect(cx + 154, 276, 6, 14, '#5c1607');
    Gfx.line(cx + 104, 252, cx + 92, 244, '#5c1607', 4);
    ctx.globalAlpha = 1;
    Gfx.sprite('house_shelf', HOME.shelf, GY - 148, { anchor: 'bc', scale: 1.15 });
    // ---------------- eating dome: the fossil, the painting and the plaque
    Gfx.sprite('house_fossil', HOME.fossil, 300, { anchor: 'c', scale: 1.05 });
    Gfx.sprite('house_wallart', HOME.wallart, 282, { anchor: 'c', scale: 1.25 });
    for (let i = 0; i < 4; i++) {                                 // a rib fossil in the wall
      const rx = HOME.fossil + 76 + i * 20;
      ctx.strokeStyle = '#c4b89a'; ctx.lineWidth = 5; ctx.beginPath();
      ctx.arc(rx, 352, 34, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      ctx.strokeStyle = '#e8dfc6'; ctx.lineWidth = 2; ctx.stroke();
    }
    const px = HOME.plaque;
    Gfx.round(px - 66, 236, 132, 104, 6, '#241c2e');
    Gfx.round(px - 62, 240, 124, 96, 5, '#7a6d8a');
    Gfx.round(px - 57, 245, 114, 86, 4, '#bdbccd');
    Gfx.text('EMPLOYEE', px, 252, { color: '#241c2e', align: 'center', scale: 1, font: 'small' });
    Gfx.text('OF THE WEEK', px, 262, { color: '#241c2e', align: 'center', scale: 1, font: 'small' });
    Gfx.sprite('bronk_idle', px, 322, { anchor: 'bc', scale: 0.7 });
    Gfx.text('BRONK', px, 324, { color: '#241c2e', align: 'center', scale: 1, font: 'small' });
    Gfx.rectA(px - 57, 245, 114, 20, '#ffffff', 0.12);
    // ---------------- the lamps, hung off the ribs, and the torches by the arch
    for (const lx of [HOME.rug - 30, HOME.table - 60, HOME.stove - 80]) {
      const sw = Math.sin(t * 1.2 + lx * 0.01) * 2;
      Gfx.line(lx, 196, lx + sw, 252, '#3a2415', 2);
      Gfx.sprite('house_lamp', lx + sw, 254, { anchor: 'tc', scale: 1.15 });
      Gfx.glow(lx + sw, 280, 130, '#ff9a20', 0.22 + Math.sin(t * 7 + lx) * 0.04);
      if (chance(0.25)) Particles.fire(lx + sw, 272, 1);
    }
    for (const tx of [HOME.arch - 96, HOME.arch + 96]) {
      Gfx.rect(tx - 4, 318, 8, 46, '#5c3a20');
      Gfx.round(tx - 9, 308, 18, 14, 6, '#3a2415');
      if (chance(0.5)) Particles.fire(tx, 306, 1);
      Gfx.glow(tx, 302, 130, '#ff9a20', 0.22 + Math.sin(t * 7 + tx) * 0.04);
    }
  },

  // --------------------------------------------------------- the furniture
  // Tidy. Everything has a place and is in it, which is the only thing in this
  // house that is Vela's doing rather than Bronk's.
  drop(x, w, y = GY + 3, a = 0.34) { Gfx.shadow(x, y, w, a); },
  homeStuff(t, o, camX) {
    for (const [x, w] of [[HOME.bed, 130], [HOME.drum, 60], [HOME.perch, 64], [HOME.perch + 98, 52],
                          [HOME.perch + 48, 34], [HOME.fossil - 40, 40],
                          [HOME.table, 140], [HOME.table - 90, 40], [HOME.table + 90, 40],
                          [HOME.stove, 140], [HOME.clutter, 60], [HOME.door - 70, 46]])
      World.drop(x, w);

    // ============ the sleeping dome
    Gfx.sprite('house_bed', HOME.bed, GY + 4, { anchor: 'bc', scale: 1.1 });
    Gfx.sprite('house_hiderack', HOME.bed - 120, GY + 4, { anchor: 'bc' });
    Gfx.sprite('house_drum', HOME.drum, GY + 4, { anchor: 'bc' });
    Gfx.sprite('art_club', HOME.drum + 30, GY - 16, { anchor: 'bc', scale: 1.3, rot: -0.42 });
    // a woven rug, laid square to the wall
    Gfx.round(HOME.rug - 74, GY - 14, 154, 22, 9, '#5c3a20');
    Gfx.round(HOME.rug - 68, GY - 12, 142, 17, 7, '#b07a45');
    for (let i = 0; i < 11; i++) Gfx.rect(HOME.rug - 60 + i * 13, GY - 9, 6, 12, i % 2 ? '#d8a86b' : '#85562f');
    for (let i = 0; i < 22; i++) {
      Gfx.rect(HOME.rug - 74 + i * 7, GY + 8, 3, 4, '#5c3a20');
      Gfx.rect(HOME.rug - 72 + i * 7, GY - 17, 3, 3, '#85562f');
    }
    // the dodo's perch: a squared stump with a worn top
    Gfx.round(HOME.perch - 26, GY - 52, 52, 56, 6, '#574a66');
    Gfx.round(HOME.perch - 23, GY - 50, 44, 52, 5, '#7a6d8a');
    Gfx.round(HOME.perch - 23, GY - 50, 16, 50, 5, '#9391a6');
    Gfx.round(HOME.perch - 32, GY - 64, 64, 18, 5, '#574a66');
    Gfx.round(HOME.perch - 29, GY - 62, 58, 12, 4, '#bdbccd');
    Gfx.round(HOME.perch - 29, GY - 62, 24, 10, 4, '#ffffff');
    for (let i = 0; i < 4; i++) Gfx.rectA(HOME.perch - 16 + i * 10, GY - 40 + (i % 2) * 12, 3, 9, '#3b3048', 0.5);
    Gfx.sprite('house_stool', HOME.perch + 48, GY + 4, { anchor: 'bc' });
    Gfx.sprite('house_basket', HOME.perch + 98, GY + 4, { anchor: 'bc' });
    Gfx.sprite('house_waterjar', HOME.perch + 140, GY + 4, { anchor: 'bc' });
    Gfx.sprite('house_broom', HOME.bed + 76, GY + 4, { anchor: 'bc', rot: 0.16 });

    // ============ the eating dome
    Gfx.sprite('house_waterjar', HOME.fossil - 40, GY + 4, { anchor: 'bc', scale: 1.1 });
    Gfx.sprite('house_table', HOME.table, GY + 6, { anchor: 'bc', scale: 1.1 });
    Gfx.sprite('house_stool', HOME.table - 90, GY + 5, { anchor: 'bc' });
    Gfx.sprite('house_stool', HOME.table + 90, GY + 5, { anchor: 'bc' });
    for (let i = 0; i < 4; i++) {                                 // four places laid
      const sx = HOME.table - 48 + i * 32;
      Gfx.round(sx - 11, GY - 56, 22, 7, 3, '#c4b89a');
      Gfx.round(sx - 8, GY - 57, 16, 4, 2, '#e8dfc6');
      Gfx.rect(sx + 12, GY - 58, 2, 8, '#fffaea');
    }
    Gfx.sprite('prop_pot', HOME.table + 6, GY - 56, { anchor: 'bc', scale: 0.6 });
    // the pot rack over the hearth
    { const sw = Math.sin(t * 0.9) * 1.5;
      Gfx.line(HOME.stove - 66, 200, HOME.stove - 66 + sw, 252, '#3a2415', 2);
      Gfx.line(HOME.stove + 20, 200, HOME.stove + 20 + sw, 252, '#3a2415', 2);
      Gfx.sprite('house_potrack', HOME.stove - 23 + sw, 252, { anchor: 'tc', scale: 1.1 }); }
    Gfx.sprite('house_hearth', HOME.stove, GY + 6, { anchor: 'bc', scale: 1.1 });
    if (o.fire > 0) {
      for (let i = 0; i < 4; i++) if (chance(o.fire)) Particles.fire(HOME.stove + rnd(-40, 40), GY - 20, 1);
      Gfx.glow(HOME.stove, GY - 40, 260, '#ff9a20', 0.26 * o.fire * (0.85 + Math.sin(t * 9) * 0.15));
    }
    Gfx.sprite('house_basket', HOME.clutter, GY + 4, { anchor: 'bc' });
    for (let k = 0; k < 6; k++)                                   // firewood, stacked square
      Gfx.round(HOME.clutter + 34 + (k % 2) * 5, GY - 4 - ((k / 2) | 0) * 10, 34, 9, 4, k % 2 ? '#5c3a20' : '#85562f');
    // the doorway: a bright arch punched through the shell on the right
    const dx = HOME.door;
    for (let x = dx - 52; x < dx + 52; x += 4) {
      const k = (x + 2 - dx) / 52;
      if (k <= -1 || k >= 1) continue;
      const h = 176 * Math.sqrt(1 - k * k);
      Gfx.rect(x, GY - h, 4, h + 6, o.night ? '#7c3eb2' : '#a8d8ff');
      Gfx.rect(x, GY - 46, 4, 52, '#85562f');
    }
    World.archDots(dx, GY, 54, 178, '#3a2415', 5, 0.02);
    World.archDots(dx, GY - 6, 52, 172, '#85562f', 3, 0.02);
    for (let i = 0; i < 3; i++) Gfx.sprite('prop_fern', dx - 20 + i * 20, GY + 4, { anchor: 'bc', scale: 0.8 });
  },

  // ----------------------------------------------------------- the lighting
  // Warm pools under the smoke holes and the doorway. Nothing here darkens the
  // picture; the house is meant to look lived-in, not haunted.
  homeLight(t, o) {
    const flick = 0.88 + Math.sin(t * 9) * 0.07 + Math.sin(t * 23) * 0.03;
    for (const d of DOMES) {
      const hy = GY - d.ry;
      const g = Gfx.ctx.createLinearGradient(0, hy, 0, GY);
      g.addColorStop(0, 'rgba(255,233,138,0.16)');
      g.addColorStop(1, 'rgba(255,233,138,0.0)');
      Gfx.ctx.fillStyle = g;
      Gfx.ctx.beginPath();
      Gfx.ctx.moveTo(d.x - 22, hy); Gfx.ctx.lineTo(d.x + 22, hy);
      Gfx.ctx.lineTo(d.x + 74, GY + 4); Gfx.ctx.lineTo(d.x - 74, GY + 4);
      Gfx.ctx.fill();
      Gfx.rectA(d.x - 70, GY - 8, 140, 12, '#ffe98a', 0.06);
    }
    if (o.fire > 0) {
      Gfx.glow(HOME.stove, GY - 46, 220, '#ff9a20', 0.26 * o.fire * flick);
      Gfx.rectA(HOME.stove - 96, GY - 12, 192, 16, '#ffa832', 0.16 * o.fire * flick);
    }
    Gfx.glow(HOME.door - 20, GY - 60, 220, '#ffe98a', o.night ? 0.12 : 0.24);
    Gfx.glow(HOME.bed + 30, 300, 170, '#a8d8ff', 0.18);
  },

  // ---------------------------------------------------------------- CONCERT
  // Bronk's dream, and it does not care what is possible. An amphitheatre cut
  // into the flank of a live volcano, meteors coming down on the beat, and a
  // megalodon doing laps over the crowd. Painted bright: the fire is the point.
  concert(t, o = {}, camX = 0) {
    const L = camX - 160, R = camX + VW + 160;
    const beat = o.beat || 0;                       // 0..1, pulses on the downbeat
    const SX = 580;                                 // the stage, in world x
    const wob = Math.sin(t * 0.7) * 3;              // everything breathes, gently
    Gfx.rect(L, -460, R - L, 580, '#0b0a18');
    World.skyRamp(L, R, 128 + wob, GY - 120, ['#0b0a18', '#161233', '#281040', '#4b2070', '#7c3eb2', '#a03a68']);
    // stars
    for (let i = 0; i < 90; i++) {
      const sx2 = ((i * 137) % 2400) - 200 - camX * 0.04, sy = -180 + ((i * 73) % 330);
      if (sx2 < L || sx2 > R) continue;
      const tw = 0.5 + 0.5 * Math.sin(t * 3 + i);
      Gfx.rectA(sx2, sy + wob, 2, 2, i % 5 ? '#d6cfe0' : '#ffe98a', 0.35 + tw * 0.65);
    }
    const mx = 810 - camX * 0.03;
    Gfx.circle(mx, 150, 40, '#ffe98a'); Gfx.glow(mx, 150, 280, '#ffe98a', 0.24);
    Gfx.circle(mx - 13, 138, 8, '#e0b93a'); Gfx.circle(mx + 11, 166, 6, '#e0b93a');

    World.meteors(t, camX, L, R);
    World.volcano(t, SX - 40, camX, beat);

    // sweeping stage lights, drawn behind the crowd
    for (let i = 0; i < 4; i++) {
      const a = -1.35 + Math.sin(t * 0.5 + i * 1.9) * 0.5;
      const ox = 300 + i * 160;
      const ctx = Gfx.ctx;
      const g = ctx.createLinearGradient(ox, GY - 40, ox + Math.cos(a) * 600, GY - 40 + Math.sin(a) * 600);
      g.addColorStop(0, ['rgba(255,233,138,0.32)', 'rgba(134,232,210,0.28)', 'rgba(177,119,230,0.30)', 'rgba(255,176,207,0.28)'][i]);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(ox, GY - 40);
      ctx.lineTo(ox + Math.cos(a - 0.12) * 900, GY - 40 + Math.sin(a - 0.12) * 900);
      ctx.lineTo(ox + Math.cos(a + 0.12) * 900, GY - 40 + Math.sin(a + 0.12) * 900);
      ctx.fill();
    }

    // the amphitheatre: three terraces of packed stone, low enough that the
    // mountain behind them is the thing you look at
    for (let s2 = 2; s2 >= 0; s2--) {
      const y = GY - 36 - s2 * 30;
      Gfx.rect(L, y, R - L, 32, ['#9391a6', '#7a6d8a', '#574a66'][s2]);
      Gfx.rectA(L, y, R - L, 3, '#bdbccd', 0.45);
      Gfx.rectA(L, y + 29, R - L, 3, '#120c16', 0.5);
      for (let x = Math.floor(L / 34) * 34; x < R; x += 34) {
        const j = jitter(x + s2 * 31, 12);
        const bob = Math.sin(t * 5.4 + x * 0.05 + s2) * 3 + beat * 4;
        const hx = x + j, hy = y + 4 - bob;
        Gfx.round(hx - 5, hy - 14, 11, 16, 4, '#120c16');   // body
        Gfx.circle(hx, hy - 18, 5, '#120c16');              // head
        const up = Math.sin(t * 5.4 + x * 0.05 + s2) > 0;
        Gfx.line(hx - 4, hy - 12, hx - 9, hy - (up ? 26 : 18), '#120c16', 3);
        Gfx.line(hx + 4, hy - 12, hx + 9, hy - (up ? 26 : 18), '#120c16', 3);
        if (((x / 34) | 0) % 3 === 0) {                     // torches in the crowd
          Gfx.rect(hx + 8, hy - 30, 2, 12, '#3a2415');
          Gfx.circle(hx + 9, hy - 33, 4, '#ffa832');
          Gfx.circle(hx + 9, hy - 35, 2, '#ffe98a');
          Gfx.glow(hx + 9, hy - 33, 30, '#ffa832', 0.4);
        }
      }
    }
    // banners, hung low off the front of the top terrace so they do not cover
    // the mountain
    for (let x = Math.floor(L / 190) * 190; x < R; x += 190) {
      if (Math.abs(x - 580) < 200) continue;                // nothing in front of the stage
      const sw = Math.sin(t * 1.2 + x) * 3;
      Gfx.rect(x - 14, GY - 132, 28, 38, ['#a03a68', '#7c3eb2', '#18706a'][Math.abs((x / 190) | 0) % 3]);
      Gfx.rect(x - 14 + sw, GY - 96, 28, 8, '#ffe98a');
      Gfx.rect(x - 14, GY - 136, 28, 5, '#3a2415');
    }
    // the floor of the pit
    Gfx.rect(L, GY - 6, R - L, 300, '#241c2e');
    Gfx.rect(L, GY - 6, R - L, 5, '#4d4a5c');
    for (let x = Math.floor(L / 24) * 24; x < R; x += 24)
      Gfx.rectA(x + jitter(x, 18), GY + 6 + jitter(x + 2, 60), 7, 2, '#574a66', 0.5);
    // the stage: stacked slabs, with a bone rig over it
    Gfx.round(SX - 194, GY - 46, 388, 54, 6, '#120c16');
    Gfx.round(SX - 188, GY - 42, 376, 48, 5, '#3b3048');
    Gfx.round(SX - 188, GY - 46, 376, 9, 4, '#9391a6');
    Gfx.rectA(SX - 188, GY - 46, 376, 3, '#ffe98a', 0.5);
    for (let i = 0; i < 9; i++) Gfx.rect(SX - 176 + i * 42, GY - 36, 3, 38, '#241c2e');
    for (let i = 0; i < 11; i++) {                                // footlights
      const fx2 = SX - 170 + i * 34;
      Gfx.rect(fx2 - 4, GY - 40, 9, 6, '#241c2e');
      Gfx.rect(fx2 - 3, GY - 42, 7, 3, i % 2 ? '#ffe98a' : '#86e8d2');
      Gfx.glow(fx2, GY - 44, 40 + beat * 26, i % 2 ? '#ffe98a' : '#86e8d2', 0.34);
    }
    for (const rx of [SX - 210, SX + 210]) {
      Gfx.rect(rx - 6, GY - 134, 12, 134, '#3a2415');
      Gfx.rect(rx - 9, GY - 138, 18, 10, '#5c3a20');
      for (let i = 0; i < 3; i++) {
        Gfx.round(rx - 12, GY - 118 + i * 28, 24, 17, 6, '#241c2e');
        Gfx.circle(rx, GY - 109 + i * 28, 6, i === 1 ? '#86e8d2' : '#ffe98a');
        Gfx.glow(rx, GY - 109 + i * 28, 60 + beat * 40, i === 1 ? '#86e8d2' : '#ffe98a', 0.35);
      }
    }
    Gfx.rect(SX - 216, GY - 128, 432, 11, '#3a2415');
    Gfx.rect(SX - 216, GY - 128, 432, 4, '#5c3a20');
    // the pyro: a wall of cartoon flame across the front of the stage
    World.pyro(t, SX, beat);
    // smoke rolling across the stage
    for (let i = 0; i < 6; i++) {
      const fx = SX - 200 + ((i * 74 + t * 20) % 400);
      Gfx.ctx.globalAlpha = 0.10;
      Gfx.round(fx, GY - 18 + Math.sin(t + i) * 4, 76, 18, 9, '#d6cfe0');
      Gfx.ctx.globalAlpha = 1;
    }
    // the near crowd, right up against the camera: big, black and jumping
    for (let x = Math.floor(L / 30) * 30; x < R; x += 30) {
      const j = jitter(x + 7, 14);
      const bob = Math.abs(Math.sin(t * 5.2 + x * 0.04)) * 6 + beat * 5;
      const hx = x + j, hy = GY + 104 - bob;
      Gfx.round(hx - 9, hy - 30, 19, 36, 6, '#120c16');
      Gfx.circle(hx, hy - 37, 9, '#120c16');
      const up = Math.sin(t * 5.2 + x * 0.04) > 0;
      Gfx.line(hx - 8, hy - 26, hx - 15, hy - (up ? 54 : 38), '#120c16', 5);
      Gfx.line(hx + 8, hy - 26, hx + 15, hy - (up ? 54 : 38), '#120c16', 5);
      if (((x / 30) | 0) % 5 === 0) {
        Gfx.rect(hx + 13, hy - 66, 3, 16, '#3a2415');
        Gfx.circle(hx + 14, hy - 69, 5, '#ffa832');
        Gfx.circle(hx + 14, hy - 71, 3, '#ffe98a');
        Gfx.glow(hx + 14, hy - 69, 40, '#ffa832', 0.5);
      }
    }
    // embers drifting up through the whole shot, and a warm dream haze over it
    for (let i = 0; i < 46; i++) {
      const ex = ((i * 211 - camX * 0.4) % 1600 + 1600) % 1600 + L - 200;
      const ey = GY + 60 - ((t * (22 + (i % 5) * 9) + i * 97) % 640);
      Gfx.rectA(ex + Math.sin(t * 2 + i) * 5, ey, 3, 3, i % 3 ? '#ffa832' : '#ffe98a', 0.75);
    }
    Gfx.rectA(L, GY - 300, R - L, 400, '#e06a1b', 0.05);
    Gfx.glow(SX, GY - 90, 420, '#ffa832', 0.10 + beat * 0.08);
    // the dream wash: slow coloured light sliding over everything, and soft edges
    for (let i = 0; i < 3; i++) {
      const wx = SX + Math.sin(t * (0.21 + i * 0.07) + i * 2.1) * 320;
      Gfx.glow(wx, GY - 150 + Math.cos(t * 0.3 + i) * 50, 300,
        ['#b177e6', '#86e8d2', '#ffb0cf'][i], 0.07);
    }
    { const ctx = Gfx.ctx;
      const g = ctx.createRadialGradient(SX, GY - 120, 120, SX, GY - 120, 460);
      g.addColorStop(0, 'rgba(124,62,178,0)'); g.addColorStop(1, 'rgba(40,16,64,0.42)');
      ctx.fillStyle = g; ctx.fillRect(L, -420, R - L, GY + 440); }
    if (beat > 0.4) Gfx.rectA(L, -420, R - L, GY + 420, '#ffe98a', (beat - 0.4) * 0.10);
  },

  // a live volcano behind the stage: lava in the crater, three flows down the
  // flank, an ash column, and a bomb thrown every few seconds
  volcano(t, vx, camX, beat) {
    const ctx = Gfx.ctx;
    const BASE = GY - 124, APEX = GY - 286, HW = 186;
    const px = vx - camX * 0.06;
    // the ash column first, so the cone sits in front of it
    for (let i = 0; i < 12; i++) {
      const k = i / 11;
      const py = APEX - 14 - k * 190 + Math.sin(t * 0.5 + i) * 6;
      const r = 20 + k * 62;
      Gfx.ctx.globalAlpha = 0.30 * (1 - k * 0.7);
      Gfx.round(px - r + Math.sin(t * 0.4 + i * 1.3) * 22, py - r * 0.5, r * 2, r, r * 0.5, '#3b3048');
      Gfx.ctx.globalAlpha = 1;
    }
    // the cone
    ctx.fillStyle = '#120c16'; ctx.beginPath();
    ctx.moveTo(px - HW, BASE + 40);
    for (let x = -HW; x <= HW; x += 8) {
      const k = Math.abs(x) / HW;
      ctx.lineTo(px + x, APEX + (BASE - APEX) * (k ** 0.8) + Math.sin(x * 0.06) * 4);
    }
    ctx.lineTo(px + HW, BASE + 40); ctx.fill();
    // the lit left flank
    ctx.fillStyle = '#281040'; ctx.beginPath();
    ctx.moveTo(px - HW, BASE + 40);
    for (let x = -HW; x <= 0; x += 8) {
      const k = Math.abs(x) / HW;
      ctx.lineTo(px + x, APEX + (BASE - APEX) * (k ** 0.8) + Math.sin(x * 0.06) * 4);
    }
    ctx.lineTo(px, BASE + 40); ctx.fill();
    for (let x = -HW; x <= HW; x += 7) {                       // the crest, catching the fire
      const k = Math.abs(x) / HW;
      const y = APEX + (BASE - APEX) * (k ** 0.8) + Math.sin(x * 0.06) * 4;
      Gfx.rect(px + x, y, 7, 5, k < 0.34 ? '#ef6a5e' : k < 0.7 ? '#a03a68' : '#7c3eb2');
      Gfx.rect(px + x, y + 5, 7, 3, k < 0.34 ? '#a03a68' : '#4b2070');
    }
    // three lava flows down the flank
    for (let f = 0; f < 3; f++) {
      let lx = px + (f - 1) * 30, ly = APEX + 10;
      for (let i = 0; i < 22; i++) {
        const nx = lx + (f - 1) * 6 + Math.sin(i * 0.9 + f) * 4;
        const ny = ly + 9;
        Gfx.line(lx, ly, nx, ny, i % 3 ? '#e06a1b' : '#ffa832', 5 - i * 0.12);
        Gfx.line(lx, ly, nx, ny, '#ffe98a', 2);
        lx = nx; ly = ny;
        if (ly > BASE + 14) break;
      }
    }
    Gfx.glow(px, APEX + 8, 200 + beat * 50, '#e06a1b', 0.4);
    // the crater, and what comes out of it
    Gfx.round(px - 34, APEX - 4, 68, 14, 6, '#5c1607');
    Gfx.round(px - 28, APEX - 2, 56, 10, 5, '#e06a1b');
    Gfx.round(px - 22, APEX, 44, 6, 3, '#ffe98a');
    for (let i = 0; i < 7; i++) {                              // fountaining lava
      const k = ((t * 1.3 + i * 0.31) % 1);
      const bx = px + (i - 3) * 12 + Math.sin(i * 2.1) * 6;
      const by = APEX - k * 120 + k * k * 105;
      Gfx.circle(bx, by, 5 - k * 2.4, k < 0.5 ? '#ffe98a' : '#e06a1b');
      Gfx.glow(bx, by, 34, '#ffa832', 0.5 * (1 - k));
    }
  },

  // meteors, coming down behind the volcano on their own schedule
  meteors(t, camX, L, R) {
    for (let i = 0; i < 4; i++) {
      const period = 5.5 + i * 2.1;
      const k = ((t + i * 3.7) % period) / period;
      if (k > 0.55) continue;
      const u = k / 0.55;
      const sx = L - 200 + u * (R - L + 700) * (i % 2 ? 1 : 0.7);
      const sy = 100 + u * (170 + i * 22);
      const s2 = i === 0 ? 1.6 : 0.7 + (i % 3) * 0.2;
      for (let t2 = 0; t2 < 16; t2++) {                        // the tail
        const tx = sx - t2 * 11 * s2, ty = sy - t2 * 6 * s2;
        Gfx.rectA(tx, ty, 8 * s2, 5 * s2, t2 < 4 ? '#ffe98a' : t2 < 9 ? '#ffa832' : '#e06a1b', (1 - t2 / 16) * 0.85);
      }
      Gfx.circle(sx, sy, 7 * s2, '#ffe98a');
      Gfx.circle(sx + 2, sy + 1, 4 * s2, '#ffffff');
      Gfx.glow(sx, sy, 90 * s2, '#ffa832', 0.5);
    }
  },

  // a wall of cartoon flame across the front of the stage. A flame is a
  // teardrop with a hooked tip and a lick or two coming off it - never a cone.
  flame(cx, by, h, w, sway, cols) {
    const ctx = Gfx.ctx;
    for (let k = 0; k < cols.length; k++) {
      const kk = k / (cols.length - 1 || 1);
      const ww = w * (1 - kk * 0.42), hh = h * (1 - kk * 0.30);
      const tip = cx + sway * (1 + kk);
      ctx.beginPath();
      ctx.moveTo(cx - ww, by);
      ctx.bezierCurveTo(cx - ww * 1.15, by - hh * 0.42, cx - ww * 0.45, by - hh * 0.62, tip - ww * 0.22, by - hh * 0.86);
      ctx.quadraticCurveTo(tip + ww * 0.30, by - hh * 0.96, tip + ww * 0.05, by - hh);
      ctx.quadraticCurveTo(tip + ww * 0.62, by - hh * 0.70, cx + ww * 0.55, by - hh * 0.40);
      ctx.bezierCurveTo(cx + ww * 1.1, by - hh * 0.26, cx + ww, by - hh * 0.1, cx + ww, by);
      ctx.closePath();
      ctx.fillStyle = cols[k]; ctx.fill();
    }
  },
  pyro(t, SX, beat) {
    for (let i = 0; i < 19; i++) {
      const fx = SX - 186 + i * 21;
      const h = 15 + Math.abs(Math.sin(t * 5 + i * 1.7)) * 9 + beat * 16 + (i % 3) * 3;
      const sway = Math.sin(t * 4.4 + i) * 3.5;
      World.flame(fx, GY - 33, h, 7.5, sway, ['#e06a1b', '#ffa832', '#ffe98a']);
      if ((i + ((t * 3) | 0)) % 4 === 0)                        // a lick breaking free
        World.flame(fx + sway * 2, GY - 33 - h - 5, 7, 3.4, sway, ['#ffa832', '#ffe98a']);
      if (i % 3 === 0) Gfx.glow(fx, GY - 42, 50, '#ffa832', 0.18);
    }
  },

  // ------------------------------------------------------------------- ROAD
  // The chill commute. Nothing to dodge, just a long warm morning.
  road(t, o = {}, camX = 0) {
    const L = camX - 160, R = camX + VW + 160;
    Gfx.rect(L, -400, R - L, 560, '#1d3d72');
    World.skyRamp(L, R, 120, GY - 56, ['#1d3d72', '#3570c0', '#3570c0', '#6aa9ee', '#a8d8ff', '#ffe08a']);
    const sx = camX * 0.02 + 760; Gfx.circle(sx, 196, 30, '#ffe98a'); Gfx.glow(sx, 196, 220, '#ffe98a', 0.26);
    World.clouds(t, camX, L, R, false, 180);
    World.flock(t, camX, L, R, false, 196);
    const ridge = (depth, col, edge, base, amp, scrub) => {
      const ctx = Gfx.ctx, off = camX * depth;
      const hy = x => base + Math.sin((x + off) * 0.0031) * amp + Math.sin((x + off) * 0.009) * amp * 0.35;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(L, GY);
      for (let x = L; x <= R; x += 22) ctx.lineTo(x, hy(x));
      ctx.lineTo(R, GY + 200); ctx.lineTo(L, GY + 200); ctx.fill();
      for (let x = Math.floor(L / 6) * 6; x < R; x += 6) Gfx.rect(x, hy(x), 6, 4, edge);
      for (let x = Math.floor(L / 36) * 36; x < R; x += 36) {
        const y = hy(x) + 12 + jitter(x + depth * 90, 36);
        Gfx.rectA(x + jitter(x, 26), y, 11, 5, edge, 0.5);
        if (scrub && ((x / 36) | 0) % 3 === 0) Gfx.round(x + jitter(x + 2, 26), y + 9, 16, 9, 4, edge);
        if (((x / 36) | 0) % 4 === 0) Gfx.rectA(x + jitter(x + 5, 26), y + 22, 7, 3, '#120c16', 0.18);
      }
    };
    ridge(0.6, '#7c3eb2', '#b177e6', 288, 34);
    for (let x = Math.floor(L / 420) * 420; x < R; x += 420) {    // rock spires on the far ridge
      const px = x - camX * 0.42, hgt = 60 + jitter(x, 40);
      Gfx.ctx.fillStyle = '#4b2070'; Gfx.ctx.beginPath();
      Gfx.ctx.moveTo(px - 18, 330); Gfx.ctx.lineTo(px - 5, 330 - hgt);
      Gfx.ctx.lineTo(px + 4, 330 - hgt * 0.8); Gfx.ctx.lineTo(px + 20, 330); Gfx.ctx.fill();
      Gfx.rectA(px - 8, 330 - hgt, 7, hgt, '#7c3eb2', 0.6);
    }
    ridge(0.42, '#4b2070', '#7c3eb2', 326, 24);
    ridge(0.22, '#27632f', '#3f9a45', 368, 14, true);

    // ---- the town along the road: no two houses the same, and all of them in use
    World.suburb(t, camX, L, R);

    // ---- the road surface
    Gfx.rect(L, GY - 6, R - L, 300, '#85562f');
    Gfx.rect(L, GY - 6, R - L, 6, '#b07a45');
    Gfx.rectA(L, GY + 24, R - L, 8, '#5c3a20', 0.5);
    for (let x = Math.floor(L / 120) * 120; x < R; x += 120) {   // wheel ruts and loose stones
      Gfx.rectA(x, GY + 8, 72, 4, '#d8a86b', 0.45);
      Gfx.rectA(x + 30, GY + 20, 58, 4, '#d8a86b', 0.35);
      Gfx.round(x + 86, GY + 14, 13, 7, 3, '#7a6d8a');
      Gfx.round(x + 20, GY + 28, 9, 5, 2, '#574a66');
    }
    World.traffic(t, camX, L, R);
    World.verge(t, camX, L, R, ['#27632f', '#3f9a45', '#6cc95c'], '#85562f');
  },

  // Everything at the side of the road: houses of four kinds, and a villager
  // outside most of them getting on with something.
  suburb(t, camX, L, R) {
    const BLOCK = 300;
    for (let x = Math.floor(L / BLOCK) * BLOCK; x < R + BLOCK; x += BLOCK) {
      const i = Math.abs((x / BLOCK) | 0);
      const hx = x + jitter(x, 60);
      const kind = i % 4;
      const hy = GY - 4;
      Gfx.shadow(hx, hy + 2, 120, 0.28);
      if (kind === 0) {                                    // a round hut with a smoking hole
        Gfx.sprite('prop_hut', hx, hy, { anchor: 'bc', scale: 1.15 });
        for (let k = 0; k < 4; k++) {
          const sy = hy - 96 - ((t * 22 + k * 22) % 88);
          Gfx.ctx.globalAlpha = 0.28 * (1 - ((t * 22 + k * 22) % 88) / 88);
          Gfx.round(hx - 8 + Math.sin(t + k) * 7, sy, 18, 12, 6, '#d6cfe0');
          Gfx.ctx.globalAlpha = 1;
        }
      } else if (kind === 1) {                             // a lean-to under a rock shelf
        Gfx.round(hx - 62, hy - 74, 124, 22, 8, '#574a66');
        Gfx.round(hx - 58, hy - 72, 116, 14, 6, '#7a6d8a');
        for (let k = 0; k < 7; k++) Gfx.line(hx - 52 + k * 17, hy - 54, hx - 44 + k * 17, hy, '#5c3a20', 5);
        for (let k = 0; k < 7; k++) Gfx.line(hx - 52 + k * 17, hy - 54, hx - 44 + k * 17, hy, '#85562f', 2);
        Gfx.round(hx - 58, hy - 56, 116, 8, 3, '#3a2415');
        Gfx.sprite('prop_pot', hx + 34, hy + 2, { anchor: 'bc' });
      } else if (kind === 2) {                             // a two-storey stack of stone boxes
        Gfx.round(hx - 52, hy - 78, 104, 78, 5, '#4d4a5c');
        Gfx.round(hx - 48, hy - 74, 96, 70, 4, '#7a6d8a');
        Gfx.round(hx - 40, hy - 122, 80, 48, 5, '#4d4a5c');
        Gfx.round(hx - 36, hy - 118, 72, 42, 4, '#9391a6');
        for (const [wx, wy, ww] of [[-30, -60, 22], [6, -60, 22], [-16, -108, 24]]) {
          Gfx.round(hx + wx, hy + wy, ww, 20, 3, '#241c2e');
          Gfx.round(hx + wx + 2, hy + wy + 2, ww - 4, 16, 2, '#ffa832');
        }
        for (let k = 0; k < 8; k++) Gfx.rectA(hx - 46 + k * 12, hy - 70, 10, 3, '#574a66', 0.6);
        Gfx.round(hx - 46, hy - 130, 92, 10, 4, '#3a2415');
      } else {                                             // a ruin somebody still lives in
        Gfx.sprite('prop_hut_ruin', hx, hy, { anchor: 'bc', scale: 1.15 });
        Gfx.sprite('prop_barrel', hx - 52, hy + 2, { anchor: 'bc' });
        for (let k = 0; k < 5; k++)                         // washing on a line
          Gfx.round(hx - 30 + k * 16, hy - 86 + Math.sin(t * 1.4 + k) * 2, 12, 18, 3,
            ['#a03a68', '#3570c0', '#e0b93a', '#6cc95c', '#e06a9b'][k]);
        Gfx.line(hx - 36, hy - 88, hx + 48, hy - 84, '#3a2415', 2);
      }
      // somebody outside, doing something
      const who = ['villager', 'villager2'][i % 2];
      const act = i % 3;
      const px = hx + 56 + jitter(x + 3, 24);
      if (act === 0) Gfx.sprite(who + '_walk', px, hy + 2, { anchor: 'bc', scale: 0.85, frame: Math.floor(t * 7 + i) % 4 });
      else if (act === 1) {
        Gfx.sprite(who + '_idle', px, hy + 2, { anchor: 'bc', scale: 0.85, frame: Math.floor(t * 2 + i) % 2 });
        Gfx.sprite('prop_pot', px + 20, hy + 2, { anchor: 'bc', scale: 0.8 });
      } else {
        Gfx.sprite(who + '_idle', px, hy + 2, { anchor: 'bc', scale: 0.85, flip: true, frame: Math.floor(t * 2 + i) % 2 });
        const kx = px - 26;
        Gfx.sprite('kid_a_walk', kx, hy + 2, { anchor: 'bc', scale: 0.7, frame: Math.floor(t * 9 + i) % 4 });
      }
      // the crossing, and the chameleon that runs it
      if (i % 2 === 0) World.crossing(t, hx + 150, i);
    }
  },
  // A chameleon on a pole IS the traffic light: it turns red, amber or green
  // on its own schedule and nobody has ever argued with it.
  crossing(t, cx, seed) {
    for (let k = 0; k < 5; k++)                            // the painted crossing
      Gfx.rectA(cx - 40 + k * 18, GY + 6, 12, 40, '#e8dfc6', 0.55);
    Gfx.rect(cx - 4, GY - 96, 8, 100, '#3a2415');          // the pole
    Gfx.rect(cx - 4, GY - 96, 3, 100, '#85562f');
    Gfx.round(cx - 22, GY - 118, 44, 26, 6, '#5c3a20');    // the branch it sits on
    const phase = Math.floor((t * 0.5 + seed * 0.37) % 3);
    const col = ['#ef6a5e', '#ffe08a', '#6cc95c'][phase];
    const dark = ['#7d1d2b', '#a8801f', '#27632f'][phase];
    // the animal, tinted to whatever it has decided
    const bob = Math.sin(t * 2 + seed) * 1.5;

    Gfx.round(cx - 20, GY - 130 + bob, 40, 16, 7, dark);   // body
    Gfx.round(cx - 18, GY - 132 + bob, 34, 12, 6, col);
    Gfx.round(cx + 12, GY - 134 + bob, 18, 14, 6, col);    // head
    Gfx.circle(cx + 24, GY - 130 + bob, 4, '#120c16');     // eye turret
    Gfx.circle(cx + 25, GY - 130 + bob, 1.6, col);
    for (let k = 0; k < 4; k++)                            // crest
      Gfx.rect(cx - 14 + k * 8, GY - 138 + bob, 4, 6, dark);
    for (let k = 0; k < 7; k++) {                          // the curled tail
      const a = -0.2 - k * 0.55, r = 13 - k * 1.4;
      Gfx.circle(cx - 24 + Math.cos(a) * r, GY - 122 + bob + Math.sin(a) * r, 3.4 - k * 0.3, k % 2 ? col : dark);
    }
    Gfx.line(cx - 8, GY - 120 + bob, cx - 12, GY - 112 + bob, dark, 4);
    Gfx.line(cx + 6, GY - 120 + bob, cx + 10, GY - 112 + bob, dark, 4);
    Gfx.glow(cx + 20, GY - 130 + bob, 60, col, 0.30);
    Gfx.text(['STOP', 'WAIT', 'GO'][phase], cx, GY - 158, { color: col, align: 'center', scale: 1.2, outline: true });
  },
  // Other people's vehicles, both directions, at their own speeds.
  traffic(t, camX, L, R) {
    const LANES = [
      { y: GY - 2, dir: 1, speed: 78, span: 1500, n: 3, scale: 1.0 },
      { y: GY + 26, dir: -1, speed: 112, span: 1800, n: 3, scale: 1.1 },
    ];
    for (let li = 0; li < LANES.length; li++) {
      const ln = LANES[li];
      for (let i = 0; i < ln.n; i++) {
        const base = (i * ln.span / ln.n + li * 420 + t * ln.speed * ln.dir);
        const vx = ((base % ln.span) + ln.span) % ln.span + L - 200;
        const kind = (i + li) % 3;
        const bounce = Math.sin(t * 9 + i * 2) * 2;
        Gfx.shadow(vx, ln.y + 2, 96 * ln.scale, 0.3);
        if (kind === 2) {                                   // somebody riding a triceratops
          Gfx.sprite('tricera_walk', vx, ln.y, { anchor: 'bc', scale: ln.scale * 0.8, flip: ln.dir < 0, frame: Math.floor(t * 8 + i) % 4 });
          Gfx.sprite('villager_idle', vx - 4 * ln.dir, ln.y - 34 * ln.scale + bounce * 0.4, { anchor: 'bc', scale: ln.scale * 0.55, flip: ln.dir < 0 });
        } else {
          Gfx.sprite('car', vx, ln.y + bounce * 0.3, { anchor: 'bc', scale: ln.scale, flip: ln.dir < 0, frame: Math.floor(Math.abs(vx) / 18) % 4 });
          Gfx.sprite(kind ? 'villager2_idle' : 'villager_idle', vx - 8 * ln.dir, ln.y - 16 * ln.scale + bounce,
            { anchor: 'bc', scale: ln.scale * 0.55, flip: ln.dir < 0 });
        }
        if (chance(Time.dt * 3)) Particles.dust(vx - 40 * ln.dir, ln.y, 1);
      }
    }
  },

  // The strip that runs in FRONT of the action, scrolling faster than the
  // ground it sits on. Without it a side-scroller is a painting; with it the
  // camera is in the world.
  verge(t, camX, L, R, green, dirt, prop = 'prop_fern', pscale = 1.6) {
    const off = camX * 0.48;                       // it moves faster than the ground
    const FL = camX - 260, FR = camX + VW + 260;
    const TOP = GY + 34;
    Gfx.rect(FL, TOP, FR - FL, 240, dirt);
    Gfx.rect(FL, TOP, FR - FL, 5, green[2]);
    Gfx.rectA(FL, TOP + 5, FR - FL, 14, '#120c16', 0.28);
    for (let x = Math.floor((FL + off) / 18) * 18 - off; x < FR; x += 18)   // the cut face of the bank
      Gfx.rectA(x + jitter(x + off, 14), TOP + 10 + jitter(x + 2, 40), 9, 3, '#120c16', 0.3);
    // clumps of tapering blades, not a picket fence
    for (let x = Math.floor((FL + off) / 30) * 30 - off; x < FR; x += 30) {
      const gx = x + jitter(x + off, 22), n = 5 + (Math.abs((x / 30) | 0) % 3);
      for (let k = 0; k < n; k++) {
        const bx = gx + k * 5 - n * 2, h = 10 + Math.abs(Math.sin(k * 2.1 + x)) * 22;
        const lean = (k - n / 2) * 1.6;
        for (let y2 = 0; y2 < h; y2 += 3) {
          const w2 = Math.max(1, 4 - (y2 / h) * 3);
          Gfx.rect(bx + lean * (y2 / h), TOP - y2 - 3, w2, 4, y2 > h * 0.6 ? green[2] : y2 > h * 0.25 ? green[1] : green[0]);
        }
      }
      if (((x / 30) | 0) % 4 === 0) { Gfx.round(gx + 8, TOP - 9, 24, 15, 6, '#574a66'); Gfx.round(gx + 10, TOP - 10, 16, 6, 3, '#9391a6'); }
      if (((x / 30) | 0) % 7 === 0) Gfx.sprite(prop, gx, TOP + 8, { anchor: 'bc', scale: pscale });
    }
  },

  // ----------------------------------------------------------------- QUARRY
  // A working mine. Every face is veined with something worth digging out, and
  // the whole place is scaffolded, carted, lamped and full of people.
  quarry(t, o = {}, camX = 0) {
    const L = camX - 160, R = camX + VW + 160;
    Gfx.rect(L, -400, R - L, 460, '#3f0e18');
    World.skyRamp(L, R, 60, 250, ['#3f0e18', '#7d1d2b', '#a03a68', '#e06a1b', '#ffa832']);
    const ctx = Gfx.ctx;
    // terraced pit walls stepping down, each one a band of cut rock
    const face = ['#241c2e', '#3b3048', '#574a66', '#7a6d8a'];
    const lit = ['#4d4a5c', '#7a6d8a', '#9391a6', '#bdbccd'];
    for (let s2 = 0; s2 < 4; s2++) {
      const y = 190 + s2 * 46;
      const hy = x => y + Math.sin((x + s2 * 300) * 0.009) * 7 + Math.sin(x * 0.03) * 3;
      ctx.fillStyle = face[s2];
      ctx.beginPath(); ctx.moveTo(L, y);
      for (let x = L; x <= R; x += 24) ctx.lineTo(x, hy(x));
      ctx.lineTo(R, GY + 200); ctx.lineTo(L, GY + 200); ctx.fill();
      for (let x = Math.floor(L / 8) * 8; x < R; x += 8) {        // the cut lip
        Gfx.rect(x, hy(x), 8, 3, lit[s2]);
        Gfx.rectA(x, hy(x) + 3, 8, 2, '#120c16', 0.25);
      }
      for (let k = 1; k < 5; k++)                                 // strata
        for (let x = Math.floor(L / 16) * 16; x < R; x += 16)
          Gfx.rectA(x + jitter(x + k, 10), hy(x) + k * 10, 11, 2, k % 2 ? '#120c16' : lit[s2], 0.20);
      // ---- the ore. This is why anyone is here.
      World.oreSeam(t, L, R, hy, s2);
      for (let x = Math.floor(L / 30) * 30; x < R; x += 30) {      // chips
        const cy = hy(x) + 8 + jitter(x + s2, 34);
        Gfx.rectA(x + jitter(x, 22), cy, 5, 3, '#120c16', 0.3);
        Gfx.rectA(x + jitter(x + 4, 22), cy - 1, 3, 2, lit[s2], 0.35);
      }
      if (s2 < 3) World.scaffold(t, L, R, hy, s2);
    }
    // mine mouths cut into the terraces, lit from inside
    for (let i = 0; i < 4; i++) {
      const mx = 260 + i * 520;
      if (mx < L - 220 || mx > R + 220) continue;
      Gfx.round(mx - 80, 236, 160, 130, 62, '#241c2e');
      Gfx.round(mx - 68, 248, 136, 118, 54, '#120c16');
      Gfx.glow(mx, 320, 120, '#ffa832', 0.28 + Math.sin(t * 3 + i) * 0.05);
      for (let k = 0; k < 5; k++) {                               // rails running out of it
        Gfx.rectA(mx - 40 + k * 20, 352, 6, 14, '#3a2415', 0.8);
      }
      Gfx.rect(mx - 78, 352, 156, 14, '#3a2415');
      for (let b = 0; b < 3; b++) { Gfx.rect(mx - 62 + b * 52, 248, 10, 110, '#5c3a20'); Gfx.rect(mx - 62 + b * 52, 248, 3, 110, '#85562f'); }
      Gfx.rect(mx - 86, 240, 172, 12, '#5c3a20');
      Gfx.rect(mx - 86, 240, 172, 4, '#85562f');
      // a lamp on the lintel, and somebody coming out
      Gfx.sprite('house_lamp', mx + 60, 252, { anchor: 'tc', scale: 1.1 });
      Gfx.glow(mx + 60, 272, 90, '#ff9a20', 0.24);
      const wx = mx - 40 + ((t * 26 + i * 130) % 240);
      Gfx.sprite('villager_walk', wx, 366, { anchor: 'bc', scale: 0.7, frame: Math.floor(t * 8 + i) % 4, alpha: 0.95 });
    }
    // the pit floor
    Gfx.rect(L, GY - 6, R - L, 300, '#7a6d8a');
    Gfx.rect(L, GY - 6, R - L, 5, '#bdbccd');
    Gfx.rectA(L, GY - 6, R - L, 300, '#3a2415', 0.20);
    for (let x = Math.floor(L / 16) * 16; x < R; x += 16) {
      const yy = GY + 6 + jitter(x, 86);
      Gfx.rectA(x + jitter(x + 1, 14), yy, 7 + jitter(x + 4, 9), 3, '#574a66', 0.6);
      Gfx.rectA(x + jitter(x + 2, 14), yy - 1, 5, 1, '#bdbccd', 0.5);
      if (((x / 16) | 0) % 7 === 0) World.oreLump(x + jitter(x + 6, 12), yy + 4, 0.8, Math.abs((x / 16) | 0) % 5);
    }
    // cart tracks, and the carts on them
    Gfx.rectA(L, GY + 34, R - L, 4, '#3a2415', 0.8);
    Gfx.rectA(L, GY + 52, R - L, 4, '#3a2415', 0.8);
    for (let x = Math.floor(L / 26) * 26; x < R; x += 26) Gfx.rectA(x, GY + 34, 7, 22, '#5c3a20', 0.5);
    for (let i = 0; i < 3; i++) {
      const cx2 = ((i * 700 - t * 44) % 2100 + 2100) % 2100 + L - 200;
      World.oreCart(cx2, GY + 46, i);
    }
    // heaps, barrels and the tools left where they were dropped
    for (let x = Math.floor(L / 150) * 150; x < R; x += 150) {
      Gfx.sprite('prop_rock', x + jitter(x, 50), GY + 4, { anchor: 'bc', scale: 0.9 + jitter(x + 1, 0.4) });
      if (((x / 150) | 0) % 3 === 0) Gfx.sprite('prop_barrel', x + 70, GY + 4, { anchor: 'bc' });
      if (((x / 150) | 0) % 4 === 1) World.orePile(x + 92, GY + 4, Math.abs((x / 150) | 0) % 5);
      if (((x / 150) | 0) % 5 === 2) Gfx.sprite('art_club', x + 40, GY - 10, { anchor: 'bc', scale: 1.2, rot: -0.7 });
    }
    for (let x = Math.floor(L / 700) * 700; x < R; x += 700) Gfx.sprite('prop_stage', x, GY + 4, { anchor: 'bc', scale: 0.8, alpha: 0.9 });
  },
  // Five ores, and each one looks like itself: amber, copper, amethyst,
  // emerald and the plain grey stone that pays the wages.
  oreCols: [['#e06a1b', '#ffa832', '#5c1607'], ['#18706a', '#2cb3a2', '#0f3838'],
            ['#7c3eb2', '#b177e6', '#281040'], ['#3f9a45', '#6cc95c', '#14331e'],
            ['#3570c0', '#6aa9ee', '#101f3d']],
  oreLump(x, y, s, kind) {
    const c = World.oreCols[kind % 5];
    Gfx.round(x - 7 * s, y - 6 * s, 14 * s, 11 * s, 3, c[2]);
    Gfx.round(x - 5 * s, y - 5 * s, 10 * s, 8 * s, 2, c[0]);
    Gfx.round(x - 4 * s, y - 5 * s, 4 * s, 3 * s, 1, c[1]);
    Gfx.glow(x, y - 2 * s, 18 * s, c[0], 0.22);
  },
  // An ore vein: not a cable. It runs in broken lenses through the host rock,
  // thick in places and pinched out in others, with crystal growing where it
  // has broken the surface.
  oreSeam(t, L, R, hy, band) {
    const c = World.oreCols[band % 5];
    for (let x = Math.floor(L / 4) * 4; x < R; x += 4) {
      const n = (x + band * 411) * 0.021;
      // the lens: thickness swells and pinches right out
      const swell = Math.sin(n) * 0.5 + Math.sin(n * 2.7 + band) * 0.35 + Math.sin(n * 0.31) * 0.4;
      if (swell < 0.12) continue;
      const th = Math.max(1, Math.round(swell * 7));
      const y = hy(x) + 24 + band * 4 + Math.sin(n * 0.8) * 8 + Math.sin(x * 0.006) * 5;
      Gfx.rect(x, y, 4, th, c[0]);
      Gfx.rect(x, y - 1, 4, 1, '#120c16');                     // host rock, above and below
      Gfx.rect(x, y + th, 4, 1, '#120c16');
      if (th > 2) Gfx.rect(x, y, 4, 1, c[1]);
      if (((x / 4) | 0) % 3 === 0) Gfx.rect(x + 1, y + th - 1, 2, 1, c[2]);
      if (th >= 5 && ((x / 4) | 0) % 17 === 0) {               // crystal, where it has broken out
        for (let k = 0; k < 5; k++) {
          const a = -2.3 + k * 0.42, len = 9 + (k % 3) * 6;
          const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
          Gfx.line(x, y, ex, ey, '#120c16', 7);
          Gfx.line(x, y, ex, ey, c[0], 5);
          Gfx.line(x, y, x + Math.cos(a) * len * 0.75, y + Math.sin(a) * len * 0.75, c[1], 2);
          Gfx.circle(ex, ey, 2, c[1]);
        }
        Gfx.glow(x, y - 6, 34, c[1], 0.20 + Math.sin(t * 2 + x) * 0.05);
      }
    }
  }
,
  // timber scaffolding across a terrace, with a ladder and a lamp
  scaffold(t, L, R, hy, band) {
    for (let x = Math.floor(L / 340) * 340; x < R; x += 340) {
      const sx = x + band * 90 + jitter(x + band, 60);
      const y = hy(sx) + 2;
      Gfx.rect(sx - 44, y + 34, 88, 5, '#3a2415');              // the deck
      Gfx.rect(sx - 44, y + 34, 88, 2, '#85562f');
      for (const px of [sx - 40, sx + 36]) {                     // legs
        Gfx.rect(px, y + 38, 6, 26, '#3a2415');
        Gfx.rect(px, y + 38, 2, 26, '#85562f');
      }
      Gfx.line(sx - 38, y + 64, sx + 38, y + 38, '#3a2415', 3);  // a brace
      for (let k = 0; k < 5; k++) Gfx.rect(sx + 10, y + 36 - k * 8, 22, 3, '#5c3a20');  // the ladder
      Gfx.rect(sx + 10, y - 6, 3, 44, '#3a2415'); Gfx.rect(sx + 29, y - 6, 3, 44, '#3a2415');
      Gfx.sprite('house_lamp', sx - 30, y + 8, { anchor: 'tc', scale: 0.9 });
      Gfx.glow(sx - 30, y + 26, 70, '#ff9a20', 0.22);
    }
  },
  orePile(x, y, kind) {
    Gfx.shadow(x, y, 46, 0.3);
    for (let i = 0; i < 9; i++) {
      const a = i * 1.9;
      World.oreLump(x + Math.cos(a) * (7 + i), y - 4 - (i % 3) * 5, 0.9, (kind + i) % 5);
    }
  },
  oreCart(x, y, seed) {
    Gfx.shadow(x, y + 2, 66, 0.32);
    Gfx.round(x - 30, y - 26, 60, 26, 4, '#3a2415');
    Gfx.round(x - 27, y - 24, 54, 21, 3, '#5c3a20');
    for (let k = 0; k < 5; k++) Gfx.rect(x - 24 + k * 11, y - 24, 4, 21, '#3a2415');
    for (let i = 0; i < 7; i++) World.oreLump(x - 20 + i * 7, y - 28 - (i % 3) * 4, 0.85, (seed + i) % 5);
    for (const wx of [x - 17, x + 17]) {
      Gfx.circle(wx, y - 2, 9, '#241c2e'); Gfx.circle(wx, y - 2, 6, '#574a66');
      Gfx.circle(wx, y - 2, 2, '#9391a6');
    }
    Gfx.rect(x - 34, y - 14, 10, 4, '#3a2415');
  },

  // ----------------------------------------------------------------- CANYON
  // Dusk, on the way home, with something behind you.
  canyon(t, o = {}, camX = 0) {
    const L = camX - 160, R = camX + VW + 160;
    Gfx.bands(L, -400, R - L, 760, ['#0b0a18', '#2a1430', '#5c1f3d', '#a03a68', '#e06a1b']);
    const mx = 620 - camX * 0.04; Gfx.circle(mx, 130, 44, '#ef6a5e'); Gfx.glow(mx, 130, 260, '#e06a1b', 0.32);
    const ctx = Gfx.ctx;
    const wall = (depth, col, edge, base, amp, seed) => {
      const off = camX * depth;
      const hy = x => { const k = (x + off + seed) * 0.004;
        return base + Math.sin(k) * amp + Math.sin(k * 3.3) * amp * 0.5 + Math.sin(k * 9) * amp * 0.3 + Math.sin(k * 23) * amp * 0.16; };
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(L, GY);
      for (let x = L; x <= R; x += 18) ctx.lineTo(x, hy(x));
      ctx.lineTo(R, GY + 220); ctx.lineTo(L, GY + 220); ctx.fill();
      for (let x = Math.floor(L / 6) * 6; x < R; x += 6) Gfx.rect(x, hy(x), 6, 4, edge);      // sunlit rim
      for (let k = 1; k < 6; k++)                                                            // strata
        for (let x = Math.floor(L / 14) * 14; x < R; x += 14)
          Gfx.rectA(x + jitter(x + k * 3, 10), hy(x) + 14 + k * 17, 10, 3, k % 2 ? edge : '#120c16', 0.22);
    };
    wall(0.62, '#3f0e18', '#7d1d2b', 170, 70, 0);
    wall(0.44, '#281040', '#7c3eb2', 250, 50, 900);
    wall(0.24, '#241c2e', '#574a66', 320, 30, 1700);
    for (let x = Math.floor(L / 320) * 320; x < R; x += 320) Gfx.sprite('prop_deadtree', x + jitter(x, 60), GY + 2, { anchor: 'bc', alpha: 0.75 });
    Gfx.rect(L, GY - 6, R - L, 300, '#5c3a20');
    Gfx.rect(L, GY - 6, R - L, 5, '#b07a45');
    Gfx.rectA(L, GY - 1, R - L, 300, '#3f0e18', 0.22);
    for (let x = Math.floor(L / 18) * 18; x < R; x += 18) {
      const yy = GY + 6 + jitter(x, 92);
      Gfx.rectA(x + jitter(x + 1, 16), yy, 7 + jitter(x + 4, 10), 3, '#85562f', 0.6);
      Gfx.rectA(x + jitter(x + 1, 16), yy - 1, 5, 1, '#d8a86b', 0.4);
      if (((x / 18) | 0) % 4 === 0) Gfx.rectA(x + jitter(x + 6, 16), yy + 7, 3, 2, '#e06a1b', 0.45);
    }
    for (let x = Math.floor(L / 190) * 190; x < R; x += 190) Gfx.sprite('prop_rock', x + jitter(x, 60), GY + 4, { anchor: 'bc', scale: 0.8, alpha: 0.95 });
    for (let x = Math.floor(L / 560) * 560; x < R; x += 560) Gfx.sprite('prop_bones', x + 120, GY + 6, { anchor: 'bc', alpha: 0.95 });
    for (let i = 0; i < 4; i++) {                              // pteranodons riding the updraft
      const px = ((i * 520 - camX * 0.12 + t * 34) % 2080 + 2080) % 2080 + L - 300;
      Gfx.sprite('ptero_fly', px, 150 + (i % 3) * 40 + Math.sin(t + i) * 14,
        { anchor: 'c', scale: 0.45 + (i % 2) * 0.2, frame: Math.floor(t * 6 + i) % 4, alpha: 0.85 });
    }
    World.verge(t, camX, L, R, ['#241109', '#3a2415', '#5c3a20'], '#120c16', 'prop_bones', 0.8);
    if (o.embers) for (let i = 0; i < 2; i++) if (chance(0.5))
      Particles.spawn(camX + rnd(0, VW), GY - rnd(0, 200), { n: 1, color: ['#ffa832', '#e06a1b'], speed: 12, gravity: -20, life: 3, size: 3, sizeEnd: 0 });
  },

  // ------------------------------------------------------ THE CAMP, AT NIGHT
  // A clearing at the end of a long day's walking. One fire, one man, and a
  // treeline with more in it than trees. Everything here is lit by the fire
  // and by nothing else, so a single flicker value drives the whole painting -
  // the pool on the ground, the rim on the stones, the reach of the dark.
  camp(t, o = {}, camX = 0) {
    const ctx = Gfx.ctx;
    const L = camX - 240, R = camX + VW + 240;
    const FX2 = o.fireX ?? CAMP.fire;
    const lick = 0.80 + Math.sin(t * 9.3) * 0.13 + Math.sin(t * 22.7) * 0.07;
    const j = (i, m) => Math.abs(jitter(i, m));

    // ---- a long way down into the blue. no sunset left, no moonrise yet.
    World.skyRamp(L, R, -520, GY - 40, ['#07060f', '#0b0a18', '#140f26', '#1d1230', '#281040', '#3a1638']);
    const soff = camX * 0.05;
    for (let x = Math.floor((L + soff) / 44) * 44; x < R + soff; x += 44) {
      const i = Math.abs((x / 44) | 0);
      const sy = -500 + j(i * 1.7, 640);
      if (sy > 210) continue;
      const big = j(i + 9, 10) > 7.6;
      const tw = 0.30 + Math.abs(Math.sin(t * (0.9 + j(i, 2.2)) + i)) * 0.62;
      Gfx.rectA(x - soff, sy, big ? 2 : 1, big ? 2 : 1, big ? '#fffaea' : '#d6cfe0', tw);
    }
    // the moon, with a bite out of it
    const mx = 300 - camX * 0.03, my = -168;
    Gfx.glow(mx, my, 300, '#b177e6', 0.18);
    Gfx.circle(mx, my, 40, '#e8dfc6');
    Gfx.circle(mx + 16, my - 10, 34, '#140f26');
    Gfx.circle(mx - 14, my + 7, 6, '#c4b89a');
    Gfx.circle(mx - 3, my + 21, 4, '#c4b89a');
    for (let i = 0; i < 3; i++) {                              // something high up, crossing it
      const px = ((i * 700 - camX * 0.09 + t * 19) % 2100 + 2100) % 2100 + L - 300;
      Gfx.sprite('ptero_fly', px, -60 + i * 46 + Math.sin(t * 0.6 + i) * 10,
        { anchor: 'c', scale: 0.3 + i * 0.1, frame: Math.floor(t * 4 + i) % 4, tint: '#1d1230', tintAmount: 0.8, alpha: 0.8 });
    }

    // ---- three walls of trees, each darker and slower than the one behind it
    const wall = (depth, base, col, scale, step, seed) => {
      const off = camX * depth;
      for (let x = Math.floor((L + off) / step) * step; x < R + off; x += step) {
        const i = Math.abs((x / step) | 0) + seed;
        const spr = ['prop_tree', 'prop_palm', 'prop_tree', 'prop_deadtree'][i % 4];
        Gfx.sprite(spr, x - off + j(i * 3.1, step * 0.55), base + j(i + 5, 12),
          { anchor: 'bc', scale: scale * (0.82 + j(i + 2, 0.5)), tint: col, tintAmount: 1 });
      }
    };
    wall(0.40, GY - 52, '#241c2e', 1.5, 112, 0);
    wall(0.26, GY - 26, '#1d1230', 1.9, 142, 7);
    wall(0.13, GY - 4, '#07060f', 2.4, 176, 13);
    // undergrowth packed in at their feet, so the wall has no gaps under it
    for (let x = Math.floor((L + camX * 0.13) / 46) * 46; x < R + camX * 0.13; x += 46) {
      const i = Math.abs((x / 46) | 0);
      Gfx.sprite(i % 3 ? 'prop_bush' : 'prop_fern', x - camX * 0.13 + j(i, 30), GY + 2,
        { anchor: 'bc', scale: 1.1 + j(i + 4, 0.7), tint: '#07060f', tintAmount: 1 });
    }

    // ---- the floor of the clearing, trodden flat where people sit
    Gfx.rect(L, GY - 4, R - L, 320, '#140f26');
    Gfx.rect(L, GY - 4, R - L, 3, '#281040');
    // the bare patch people have worn into it - flat, or it reads as a bench
    Gfx.ctx.globalAlpha = 0.85; Gfx.round(FX2 - 236, GY - 6, 472, 18, 9, '#1d1230'); Gfx.ctx.globalAlpha = 1;
    Gfx.ctx.globalAlpha = 0.7; Gfx.round(FX2 - 186, GY - 4, 372, 13, 6, '#241109'); Gfx.ctx.globalAlpha = 1;
    for (let x = Math.floor(L / 22) * 22; x < R; x += 22) {
      const i = Math.abs((x / 22) | 0);
      Gfx.rectA(x + j(i, 16), GY + 4 + j(i + 3, 78), 6 + j(i + 7, 7), 2, '#281040', 0.5);
      if (i % 5 === 0) Gfx.rectA(x + j(i + 1, 16), GY + 12 + j(i + 4, 62), 3, 2, '#3a2415', 0.55);
      if (i % 11 === 0) Gfx.sprite('prop_bones', x + j(i + 2, 18), GY + 26 + j(i + 8, 40),
        { anchor: 'bc', scale: 0.7, tint: '#241c2e', tintAmount: 0.8 });
    }

    // ---- the pool of firelight, before anything stands in it
    Gfx.glow(FX2, GY - 34, 320 * lick, '#e06a1b', 0.24);
    Gfx.glow(FX2, GY - 14, 180 * lick, '#ffa832', 0.20);

    // ---- the fire: a ring of stones, three logs and a bed of embers
    const stone = (i, a) => {
      const sx2 = FX2 + Math.cos(a) * 70, sy2 = GY - 4 + Math.sin(a) * 12;
      const w2 = 14 + (i % 3) * 5;
      Gfx.round(sx2 - w2 / 2, sy2 - 12, w2, 14, 5, '#3b3048');
      Gfx.round(sx2 - w2 / 2 + 2, sy2 - 13, w2 - 5, 5, 2, '#574a66');
      Gfx.rectA(sx2 - w2 / 2 + 1, sy2 - 10, w2 - 3, 6, '#ffa832', 0.30 * lick);
    };
    for (let i = 0; i < 5; i++) stone(i, Math.PI + i / 4 * Math.PI);          // the back of the ring
    const log = (lx, ly, lw, lh, col, lit) => {
      Gfx.round(lx, ly, lw, lh, lh / 2, col);
      Gfx.round(lx + 3, ly + 1, lw - 6, 2, 1, lit);
      Gfx.rectA(lx + 2, ly + lh - 4, lw - 4, 3, '#e06a1b', 0.45 * lick);
    };
    log(FX2 - 48, GY - 16, 68, 11, '#241109', '#5c3a20');
    log(FX2 - 14, GY - 21, 62, 10, '#3a2415', '#85562f');
    log(FX2 - 36, GY - 28, 56, 9, '#241109', '#5c3a20');
    for (let i = 0; i < 13; i++) {
      const ex = FX2 - 42 + i * 7, ey = GY - 13 + (i % 3);
      Gfx.rectA(ex, ey, 4, 3, i % 2 ? '#e06a1b' : '#ffa832', 0.45 + Math.abs(Math.sin(t * 5 + i * 1.3)) * 0.55);
    }
    for (let i = 0; i < 5; i++) {
      const k = i / 4;
      const h2 = (50 + Math.abs(Math.sin(t * 6.3 + i * 1.9)) * 44) * (1 - Math.abs(k - 0.5) * 0.66) * lick;
      World.flame(FX2 - 34 + k * 68, GY - 22, h2, 15 - Math.abs(k - 0.5) * 9,
        Math.sin(t * 4.7 + i * 2.1) * 6, ['#e06a1b', '#ffa832', '#ffe98a']);
    }
    Gfx.glow(FX2, GY - 56, 130 * lick, '#ffe98a', 0.28);
    for (let i = 0; i < 4; i++) stone(i + 5, 0.16 + i / 3 * 0.68 * Math.PI);  // and the front of it
    if (chance(0.6)) Particles.spawn(FX2 + rnd(-26, 26), GY - 36,
      { n: 1, color: ['#ffa832', '#e06a1b', '#ffe98a'], speed: 26, gravity: -34, life: 2.2, size: 3, sizeEnd: 0 });

    // ---- and the dark, which is the real set. it closes on the fire.
    const g = ctx.createRadialGradient(FX2, GY - 64, 96, FX2, GY - 64, 560);
    g.addColorStop(0, 'rgba(7,6,15,0)');
    g.addColorStop(0.42, 'rgba(7,6,15,0.20)');
    g.addColorStop(1, 'rgba(7,6,15,0.80)');
    ctx.fillStyle = g; ctx.fillRect(L, -520, R - L, GY + 400);

    // low mist crawling across the clearing floor
    for (let i = 0; i < 5; i++) {
      const mxx = FX2 - 500 + ((t * (8 + i * 4) + i * 240) % 1000);
      Gfx.ctx.globalAlpha = 0.07;
      Gfx.round(mxx, GY - 20 + i * 6, 240, 15, 7, '#7c3eb2');
      Gfx.ctx.globalAlpha = 1;
    }

    // there is more than one thing out there, and none of it is close enough
    for (let i = 0; i < (o.watchers || 0); i++) {
      const wx = FX2 + [-360, 330, -210, 450][i % 4], wy = GY - 74 - (i % 3) * 30;
      if (Math.sin(t * 0.8 + i * 2.3) < -0.88) continue;                      // it blinks
      for (const s of [-1, 1]) {
        Gfx.glow(wx + s * 7, wy + 1, 20, '#ffa832', 0.22);
        Gfx.rectA(wx + s * 7, wy, 3, 2, '#ffe98a', 0.7);
      }
    }
  },
};

// A side-scroll painter. The caller (MiniGame.stage) already put the camera in
// place, so this just paints the stage in world coordinates.
const Scroll = (name, opt = {}) => (camX, t) => World[name](t, opt, camX);
