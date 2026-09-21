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

// The slab the cave is baked into. hillY tapers to nothing at both ends of it,
// so the hillside meets the ground instead of stopping at a wall.
const SHELL = { x0: -190, x1: 1372, top: -300, bot: GY + 240 };

const HOME = {
  bed: 152, drum: 268, rug: 330, perch: 402, shelf: 476,      // the sleeping dome
  arch: 546,                                                  // the passage
  fossil: 646, wallart: 762, table: 828, plaque: 920,         // the eating dome
  stove: 1026, clutter: 1104, door: 1150,
  shower: 1390, car: 1650, end: 1800,
};

// The quarry, laid out left to right: you park, the foreman tells you what to
// do, you hit the face until three crystals come out, and they go in the box.
// The quarry is a place you walk through, not a backdrop: half a mile of pit
// between the car park and the box, with three working faces strung along it
// and a shift's worth of people in between.
const QUARRY = {
  park: 150, boss: 460, box: 2460, end: 2900,
  faces: [900, 1540, 2080],
  gems: [{ x: 880, y: GY - 92 }, { x: 1524, y: GY - 68 }, { x: 2062, y: GY - 104 }],
  get face() { return QUARRY.faces[0]; },
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
  // The dither repeats every 8 pixels, so it is baked into an 8-wide tile once
  // and laid down as a pattern. Drawing it a rect at a time was five thousand
  // fill calls a frame, on the one thing every stage starts with.
  _ramp: new Map(),
  skyRamp(L, R, top, bot, cols) {
    const h = Math.max(1, Math.ceil(bot - top));
    const key = h + '|' + cols.join(',');
    let hit = World._ramp.get(key);
    if (!hit || hit.ctx !== Gfx.ctx) {
      const c = document.createElement('canvas');
      c.width = 8; c.height = h;
      const g = c.getContext('2d');
      const n = cols.length, bh = h / n;
      for (let i = 0; i < n; i++) {
        g.fillStyle = cols[i]; g.fillRect(0, i * bh, 8, Math.ceil(bh) + 1);
        if (!i) continue;
        for (let k = 0; k < 3; k++) {
          const y = i * bh + k * 2;
          const w = [4, 2, 1][k], off = [0, 2, 5][k];
          g.fillStyle = cols[i - 1]; g.fillRect(off, y, w, 2);
          if (k === 0) { g.fillStyle = cols[i]; g.fillRect(4, y + 1, 4, 1); }
        }
      }
      hit = { ctx: Gfx.ctx, pat: Gfx.ctx.createPattern(c, 'repeat') };
      World._ramp.set(key, hit);
      if (World._ramp.size > 14) World._ramp.delete(World._ramp.keys().next().value);
    }
    const ctx = Gfx.ctx;
    ctx.save();
    ctx.translate(0, Math.round(top));
    ctx.fillStyle = hit.pat;
    ctx.fillRect(Math.round(L), 0, Math.ceil(R - L), h);
    ctx.restore();
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
    const { x0, x1, top, bot } = SHELL;
    const key = (night ? 'n' : dusk ? 'd' : 'day');
    let c = World._shell.get(key);
    if (!c) {
      const w = Math.ceil(x1 - x0), h = Math.ceil(bot - top);
      c = document.createElement('canvas'); c.width = w; c.height = h;
      const real = Gfx.ctx;
      Gfx.ctx = c.getContext('2d');
      Gfx.ctx.translate(-x0, -top);
      World.caveMass(x0, x1, night);
      for (const d of DOMES) World.caveHollow(d, night);
      World.cavePassage(night);             // the crawl, before the floor runs through it
      World.indoorFloor(x0, x1);
      for (const d of DOMES) World.caveLip(d, night);
      Gfx.ctx = real;
      World._shell.set(key, c);
      if (World._shell.size > 4) World._shell.delete(World._shell.keys().next().value);
    }
    Gfx.ctx.drawImage(c, x0, top);
  },
  // ------------------------------------------------------------- THE CAVE
  // The Rockbottoms live in a hill, not in a house. Everything above the floor
  // line is one mass of rock with two hollows eaten out of it - the one you
  // sleep in and the one you eat in - joined by a crawl the two of them have
  // worn smooth. All of it is baked once, so it can afford to be fussy.

  // The crest of the hill the cave is cut into: thick rock everywhere, thicker
  // over each hollow, and never a straight line anywhere on it.
  hillY(x) {
    let h = 104;
    for (const d of DOMES) {
      const k = clamp(1 - Math.abs(x - d.x) / (d.rx * 1.7), 0, 1);
      h = Math.max(h, 104 + Ease.outCubic(k) * (d.ry - 26));
    }
    h += 70 + Math.sin(x * 0.0071) * 24 + Math.sin(x * 0.019 + 1.3) * 11 + Math.sin(x * 0.053) * 5;
    // and it runs out at both ends, into the ground, instead of stopping dead
    h *= Ease.inOutQuad(clamp((x - SHELL.x0) / 150, 0, 1))
       * Ease.inOutQuad(clamp((SHELL.x1 - x) / 190, 0, 1));
    return GY - h;
  },
  // The roof of a hollow at world x, or null where there is no hollow. A dome
  // underneath, roughed up so it reads as something water made, not masons.
  caveRoof(d, x) {
    const y = World.domeY(d, x);
    if (y == null) return null;
    const edge = clamp((1 - Math.abs(x - d.x) / d.rx) * 2.6, 0, 1);
    const wob = Math.sin(x * 0.041) * 11 + Math.sin(x * 0.017 + 2.1) * 8 + Math.sin(x * 0.113) * 3;
    return y + (wob + 8) * edge;
  },

  // The roof over world x, wherever it is - used by anything that hangs.
  roofAt(x) {
    let y = null;
    for (const d of DOMES) { const r = World.caveRoof(d, x); if (r != null && (y == null || r < y)) y = r; }
    return y == null ? GY - 150 : y;
  },

  // ---- the hillside itself: strata, blotches, cracks and a mineral seam
  caveMass(x0, x1, night) {
    const S = 6;
    const body = night ? ['#3b3048', '#4d4a5c', '#574a66'] : ['#4d4a5c', '#574a66', '#6e6b80'];
    const lip = night ? '#7a6d8a' : '#9391a6';
    const grass = night ? '#27632f' : '#3f9a45';
    const grassLit = night ? '#3f9a45' : '#6cc95c';
    for (let x = Math.floor(x0 / S) * S; x < x1; x += S) {
      const y = Math.round(World.hillY(x + S / 2) / S) * S;
      Gfx.rect(x, y, S, GY + 250 - y, body[0]);
      Gfx.rect(x, y + 10, S, 8, body[1]);
      Gfx.rect(x, y, S, 5, lip);                                  // the sunlit crest
      // turf only where a slope could hold it. bare rock on the steep flanks.
      const slope = Math.abs(World.hillY(x + S * 1.5) - World.hillY(x - S * 0.5));
      if (slope < 9) {
        Gfx.rect(x, y - 4, S, 5, grass);
        Gfx.rect(x, y - 6, S, 3, grassLit);
      } else if (slope < 16) Gfx.rectA(x, y - 2, S, 4, grass, 0.5);
    }
    // strata running through the rock, bent the way rock bends
    for (let k = 0; k < 9; k++) {
      for (let x = Math.floor(x0 / 14) * 14; x < x1; x += 14) {
        const top = World.hillY(x);
        const y = top + 46 + k * 58 + Math.sin(x * 0.0092 + k * 1.4) * 15 + Math.sin(x * 0.031) * 5;
        if (y < top + 14) continue;
        Gfx.rectA(x + jitter(x + k * 5, 10), y, 11, 4, k % 2 ? body[2] : '#241c2e', 0.34);
        Gfx.rectA(x + jitter(x + k * 5, 10), y - 2, 8, 2, lip, 0.16);
      }
    }
    // blotches, so no two square feet of it are the same colour
    for (let x = Math.floor(x0 / 26) * 26; x < x1; x += 26) {
      const i = Math.abs((x / 26) | 0);
      const top = World.hillY(x);
      for (let k = 0; k < 4; k++) {
        const bx = x + jitter(x + k, 20), by = top + 24 + Math.abs(jitter(x + k * 3, 430));
        if (by > GY + 200) continue;
        Gfx.round(bx, by, 12 + (i + k) % 9, 8 + (i * k) % 6, 4, (i + k) % 2 ? body[1] : body[2]);
      }
    }
    // cracks
    for (let x = Math.floor(x0 / 150) * 150; x < x1; x += 150) {
      let px = x + jitter(x, 80), py = World.hillY(px) + 20;
      for (let i = 0; i < 9; i++) {
        const nx = px + Math.sin(i * 2.3 + x) * 9, ny = py + 22;
        Gfx.line(px, py, nx, ny, '#241c2e', 3 - i * 0.2);
        px = nx; py = ny;
      }
    }
    // and one seam of the same crystal they dig for at the quarry
    for (let x = Math.floor(x0 / 9) * 9; x < x1; x += 9) {
      const y = World.hillY(x) + 132 + Math.sin(x * 0.0061) * 44 + Math.sin(x * 0.024) * 9;
      const on = Math.sin(x * 0.0037 + 1.1);
      if (on < 0.35) continue;
      Gfx.rectA(x, y, 9, 5, '#2f7d8f', 0.8);
      Gfx.rectA(x, y + 1, 7, 2, '#86e8d2', 0.55);
      Gfx.rect(x, y - 1, 9, 1, '#120c16');
      Gfx.rect(x, y + 5, 9, 1, '#120c16');
    }
  },

  // ---- one hollow, eaten out of the mass
  caveHollow(d, night) {
    const S = 4;
    const air = night ? '#2a2338' : '#3b3048';
    const back = night ? '#3b3048' : '#4d4a5c';
    const backLit = night ? '#4d4a5c' : '#6e6b80';
    for (let x = d.x - d.rx; x < d.x + d.rx; x += S) {
      const y = World.caveRoof(d, x + S / 2);
      if (y == null) continue;
      const yt = Math.round(y / S) * S;
      Gfx.rect(x, yt, S, GY - yt + 10, back);              // the far wall of the chamber
      Gfx.rect(x, yt, S, 22, air);                         // deep shadow up under the roof
      Gfx.rect(x, yt + 22, S, 5, night ? '#332b42' : '#443c55');
    }
    // the far wall is not flat either: shelves and bulges of rock on it
    for (let x = d.x - d.rx + 20; x < d.x + d.rx - 20; x += 34) {
      const y = World.caveRoof(d, x);
      if (y == null) continue;
      const i = Math.abs((x / 34) | 0);
      for (let k = 0; k < 3; k++) {
        const by = y + 44 + k * 62 + jitter(x + k * 7, 26);
        if (by > GY - 14) continue;
        Gfx.round(x + jitter(x + k, 22), by, 26 + (i % 3) * 10, 13 + (k % 2) * 6, 6, k % 2 ? back : backLit);
        Gfx.round(x + jitter(x + k, 22) + 2, by, 20 + (i % 3) * 8, 4, 2, night ? '#574a66' : '#7a6d8a');
      }
    }
    // a warm wash off the floor, because there is a fire in here somewhere
    const g = Gfx.ctx.createLinearGradient(0, GY - d.ry, 0, GY);
    g.addColorStop(0, 'rgba(18,12,22,0.34)');
    g.addColorStop(0.62, 'rgba(255,154,32,0.05)');
    g.addColorStop(1, 'rgba(255,154,32,0.16)');
    Gfx.ctx.save();
    Gfx.ctx.beginPath();
    Gfx.ctx.ellipse(d.x, GY, d.rx, d.ry, 0, Math.PI, 0);
    Gfx.ctx.lineTo(d.x + d.rx, GY); Gfx.ctx.lineTo(d.x - d.rx, GY);
    Gfx.ctx.clip();
    Gfx.ctx.fillStyle = g; Gfx.ctx.fillRect(d.x - d.rx, GY - d.ry, d.rx * 2, d.ry);
    Gfx.ctx.restore();
    // the light shaft: a hole worn through the crown, which is where the smoke goes
    const hy = World.caveRoof(d, d.x);
    Gfx.round(d.x - 30, hy - 8, 60, 16, 7, '#241c2e');
    Gfx.round(d.x - 24, hy - 5, 48, 10, 5, night ? '#4b2070' : '#a8d8ff');
    Gfx.round(d.x - 24, hy - 5, 48, 4, 2, night ? '#7c3eb2' : '#ffe08a');
  },

  // ---- the crawl between the two hollows: low, round and rubbed smooth
  cavePassage(night) {
    const a = DOMES[0], b = DOMES[1];
    const cx = ((b.x - b.rx) + (a.x + a.rx)) / 2, rx = Math.max(60, ((a.x + a.rx) - (b.x - b.rx)) / 2 + 46), ry = 158;
    const back = night ? '#332b42' : '#443c55';
    for (let x = cx - rx; x < cx + rx; x += 4) {
      const k = (x + 2 - cx) / rx;
      if (k <= -1 || k >= 1) continue;
      const wob = Math.sin(x * 0.047) * 9 + Math.sin(x * 0.019 + 1) * 6;
      const yt = Math.round((GY - ry * Math.sqrt(1 - k * k) + wob * (1 - Math.abs(k))) / 4) * 4;
      Gfx.rect(x, yt, 4, GY - yt + 10, back);
      Gfx.rect(x, yt, 4, 18, night ? '#241c2e' : '#3b3048');
    }
    Gfx.rectA(cx - rx, GY - 54, rx * 2, 60, '#120c16', 0.26);      // it is dim in there
    // the lip of the crawl, worn pale by sixty years of shoulders
    for (let x = cx - rx; x < cx + rx; x += 3) {
      const k = (x + 1.5 - cx) / rx;
      if (k <= -1 || k >= 1) continue;
      const wob = Math.sin(x * 0.047) * 9 + Math.sin(x * 0.019 + 1) * 6;
      const yt = GY - ry * Math.sqrt(1 - k * k) + wob * (1 - Math.abs(k));
      Gfx.rect(Math.round(x / 3) * 3, Math.round(yt / 3) * 3, 3, 3, night ? '#574a66' : '#7a6d8a');
      Gfx.rect(Math.round(x / 3) * 3, Math.round((yt - 3) / 3) * 3, 3, 3, night ? '#3b3048' : '#574a66');
    }
    World.dripstone(cx - rx + 30, cx + rx - 30, k => {
      const kk = (k - cx) / rx;
      if (kk <= -1 || kk >= 1) return null;
      return GY - ry * Math.sqrt(1 - kk * kk) + (Math.sin(k * 0.047) * 9 + Math.sin(k * 0.019 + 1) * 6) * (1 - Math.abs(kk));
    }, night, 0.55);
  },

  // ---- teeth. stalactites off a given roof line, and stalagmites under them.
  dripstone(x0, x1, roofAt, night, density = 1) {
    const rock = night ? '#574a66' : '#7a6d8a';
    const dark = night ? '#3b3048' : '#574a66';
    const wet = night ? '#6e6b80' : '#bdbccd';
    for (let x = Math.floor(x0 / 27) * 27; x < x1; x += 27) {
      const i = Math.abs((x / 27) | 0);
      if ((i * 7 % 10) / 10 > density) continue;
      const y = roofAt(x);
      if (y == null) continue;
      const h = 14 + (i % 5) * 11, w = 7 + (i % 3) * 3;
      for (let k = 0; k < h; k += 2) {                      // a tapering tooth
        const ww = Math.max(1, w * (1 - k / h));
        Gfx.rect(x - ww / 2, y + k - 2, ww, 3, k > h * 0.62 ? dark : rock);
      }
      Gfx.rect(x - 1, y + h - 6, 2, 4, wet);                // the drip on the point
      if (i % 4 === 0) {                                    // and what it has built below
        const gh = 9 + (i % 3) * 8;
        for (let k = 0; k < gh; k += 2) {
          const ww = Math.max(2, (w + 2) * (k / gh));
          Gfx.rect(x - ww / 2, GY - 2 - k, ww, 3, k > gh * 0.6 ? rock : dark);
        }
      }
    }
  },

  // ---- the mouth of each hollow, drawn last so it stands in front of the room
  caveLip(d, night) {
    const S = 5;
    const rock = night ? '#4d4a5c' : '#6e6b80';
    const lit = night ? '#6e6b80' : '#9391a6';
    for (let x = d.x - d.rx - 6; x < d.x + d.rx + 6; x += S) {
      const y = World.caveRoof(d, x + S / 2);
      if (y == null) continue;
      Gfx.rect(Math.round(x / S) * S, Math.round((y - 7) / S) * S, S, S * 2, rock);
      Gfx.rect(Math.round(x / S) * S, Math.round((y - 12) / S) * S, S, S, lit);
    }
    World.dripstone(d.x - d.rx + 26, d.x + d.rx - 26, x => World.caveRoof(d, x), night);
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
    // ---------------- sleeping hollow: a fissure in the rock, and the morning
    // coming through it sideways. nobody cut this. it was already here.
    const wx = HOME.bed + 44, wy = 236;
    const fissTop = World.roofAt(wx) + 14;
    for (let y = fissTop; y < fissTop + 150; y += 3) {
      const k = (y - fissTop) / 150;
      const hw = (4 + 12 * Math.sin(k * Math.PI)) * (0.72 + Math.abs(Math.sin(y * 0.17)) * 0.5);
      const lean = Math.sin(y * 0.031) * 9;
      Gfx.rect(wx + lean - hw - 4, y, hw * 2 + 8, 3, '#241c2e');
      Gfx.rect(wx + lean - hw, y, hw * 2, 3, o.night ? '#1d3d72' : '#a8d8ff');
      Gfx.rect(wx + lean - hw, y, hw * 0.8, 3, o.night ? '#3570c0' : '#fffaea');
      if (o.night && ((y * 7) % 23) < 2) Gfx.rect(wx + lean - 1, y, 2, 2, '#fffaea');   // a star through it
    }
    { const g2 = ctx.createLinearGradient(wx, wy, wx + 150, wy + 200);   // the shaft it throws
      g2.addColorStop(0, o.night ? 'rgba(53,112,192,0.16)' : 'rgba(168,216,255,0.24)');
      g2.addColorStop(1, 'rgba(168,216,255,0)');
      ctx.fillStyle = g2; ctx.beginPath();
      ctx.moveTo(wx - 18, fissTop); ctx.lineTo(wx + 18, fissTop);
      ctx.lineTo(wx + 150, GY + 4); ctx.lineTo(wx + 30, GY + 4); ctx.fill(); }
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
    // ---------------- eating hollow: bare rock, and the one thing on it
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
    for (const lx of [HOME.rug - 30, HOME.table - 46]) {
      const sw = Math.sin(t * 1.2 + lx * 0.01) * 2;
      const top = World.roofAt(lx) + 8, hang = Math.max(top + 30, 250);
      Gfx.rect(lx - 5, top - 4, 10, 7, '#574a66');                  // the peg it is jammed on
      Gfx.line(lx, top, lx + sw, hang, '#3a2415', 2);
      Gfx.sprite('house_lamp', lx + sw, hang + 2, { anchor: 'tc', scale: 1.15 });
      Gfx.glow(lx + sw, hang + 28, 130, '#ff9a20', 0.22 + Math.sin(t * 7 + lx) * 0.04);
      if (chance(0.25)) Particles.fire(lx + sw, hang + 20, 1);
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
    for (const [x, w] of [[HOME.bed, 130], [HOME.drum, 60], [HOME.perch, 64],
                          [HOME.table, 140], [HOME.table - 90, 40], [HOME.table + 90, 40],
                          [HOME.stove, 140], [HOME.clutter, 60]])
      World.drop(x, w);

    // ============ the sleeping hollow. four things in it, and that is all.
    Gfx.sprite('house_bed', HOME.bed, GY + 4, { anchor: 'bc', scale: 1.1 });
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

    // ============ the eating hollow
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
    Gfx.sprite('house_hearth', HOME.stove, GY + 6, { anchor: 'bc', scale: 1.1 });
    if (o.fire > 0) {
      for (let i = 0; i < 4; i++) if (chance(o.fire)) Particles.fire(HOME.stove + rnd(-40, 40), GY - 20, 1);
      Gfx.glow(HOME.stove, GY - 40, 260, '#ff9a20', 0.26 * o.fire * (0.85 + Math.sin(t * 9) * 0.15));
    }
    for (let k = 0; k < 6; k++)                                   // firewood, stacked square
      Gfx.round(HOME.clutter + 34 + (k % 2) * 5, GY - 4 - ((k / 2) | 0) * 10, 34, 9, 4, k % 2 ? '#5c3a20' : '#85562f');
    // the mouth of the cave: daylight, and a rough rock jamb around it
    const dx = HOME.door;
    for (let y = GY + 6; y > GY - 190; y -= 4) {
      const k = (GY - y) / 186;
      const hw = 56 * Math.sqrt(Math.max(0, 1 - k * k * k)) + Math.sin(y * 0.07) * 5;
      Gfx.rect(dx - hw, y - 4, hw * 2, 4, o.night ? '#7c3eb2' : '#a8d8ff');
      Gfx.rect(dx - hw, y - 4, hw * 0.5, 4, o.night ? '#a03a68' : '#ffe08a');
      Gfx.rect(dx - hw - 7, y - 4, 7, 4, '#3b3048');
      Gfx.rect(dx + hw, y - 4, 7, 4, '#3b3048');
      Gfx.rect(dx - hw - 10, y - 4, 3, 4, '#241c2e');
      Gfx.rect(dx + hw + 7, y - 4, 3, 4, '#241c2e');
    }
    World.dripstone(dx - 44, dx + 44, () => GY - 178, !!o.night, 0.5);
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

  // A tongue of flame: a teardrop with a hooked tip and a lick or two coming
  // off it, never a cone. Every fire in the game is a row of these.
  // A flame, built out of pixels instead of curves. Four nested envelopes -
  // a dark ember skin, orange body, yellow heart and a white core at the very
  // bottom - each one a stack of 3px rows whose width tapers to a tip and
  // whose edge is chewed by a bit of noise. It leans with `sway`, it breathes
  // on its own clock, and now and then the top of it lets go and rises as a
  // separate blob, which is the thing that makes fire look like fire.
  flame(cx, by, h, w, sway, cols, seed = 0) {
    if (h < 2 || w < 1) return;
    const STEP = 3;
    const T = Time.t * 1000 % 1e6 / 1000;
    const skin = cols[3] || '#7d1d2b';
    const bands = [
      { c: skin, k: 1.00, wk: 1.00 },
      { c: cols[0], k: 0.93, wk: 0.78 },
      { c: cols[1], k: 0.72, wk: 0.54 },
      { c: cols[2], k: 0.44, wk: 0.32 },
    ];
    if (h > 26) bands.push({ c: '#fffaea', k: 0.20, wk: 0.17 });
    const noise = (a) => ((Math.sin(a * 12.9898 + seed * 7.13) * 43758.5453) % 1);
    for (const b of bands) {
      const bh = h * b.k, bw = w * b.wk;
      for (let y = 0; y < bh; y += STEP) {
        const u = y / bh;                                   // 0 at the logs, 1 at the tip
        // widest a little above the base, pinched to nothing at the top
        let ww = bw * Math.pow(1 - u, 0.92) * (0.82 + 0.24 * Math.sin(u * 2.6 + 0.4));
        ww += noise(y * 0.7 + Math.floor(T * 9)) * bw * 0.16 * (0.3 + u);
        if (ww < 0.8) continue;
        // it leans more the further up you go, and the lean travels
        const lean = sway * u * u * 1.7 + Math.sin(T * 6.2 + seed + u * 4.4) * w * 0.20 * u;
        const px = Math.round(cx + lean - ww);
        Gfx.rect(px, Math.round(by - y - STEP), Math.max(1, Math.round(ww * 2)), STEP, b.c);
      }
    }
    // the bit that lets go, riding up above the tip
    const lift = (T * 1.6 + seed * 0.37) % 1;
    if (h > 18) {
      const ly = by - h * (0.92 + lift * 0.55);
      const lw = Math.max(1, Math.round(w * 0.34 * (1 - lift)));
      Gfx.rect(Math.round(cx + sway * 1.6 - lw), Math.round(ly), lw * 2, Math.max(1, Math.round(STEP * (1 - lift * 0.5))), lift > 0.55 ? skin : cols[0]);
      if (lift > 0.3) Gfx.rect(Math.round(cx + sway * 1.9 - lw * 0.5), Math.round(ly - 4), Math.max(1, lw), 2, skin);
    }
    // the hot floor right under it
    Gfx.rectA(Math.round(cx - w * 1.1), Math.round(by - 2), Math.round(w * 2.2), 3, cols[1], 0.5);
  },
  // ------------------------------------------------------------------- ROAD
  // The chill commute. Nothing to dodge, just a long warm morning.
  // ------------------------------------------------------------------- ROAD
  // The commute. Seven bands of parallax between the camera and the horizon,
  // a valley floor somebody actually lives in, and a road with other people
  // on it. Two moods: the morning run to the quarry, and the run home, which
  // is the same road on fire.
  road(t, o = {}, camX = 0) {
    const L = camX - 160, R = camX + VW + 160;
    const ev = !!o.scared;                                  // the evening / the bad one
    // ---- sky
    if (ev) {
      Gfx.rect(L, -400, R - L, 560, '#2a1220');
      World.skyRamp(L, R, 60, GY - 56, ['#1b0e1c', '#2a1220', '#5c1607', '#a03a68', '#e06a1b', '#ffa832']);
    } else {
      Gfx.rect(L, -400, R - L, 560, '#1d3d72');
      World.skyRamp(L, R, 120, GY - 56, ['#1d3d72', '#3570c0', '#3570c0', '#6aa9ee', '#a8d8ff', '#ffe08a']);
    }
    const sx = camX * 0.02 + 760, sy = ev ? 268 : 196;
    Gfx.circle(sx, sy, ev ? 38 : 30, ev ? '#e06a1b' : '#ffe98a');
    Gfx.circle(sx, sy, ev ? 30 : 22, ev ? '#ffa832' : '#fffaea');
    Gfx.glow(sx, sy, ev ? 300 : 220, ev ? '#e06a1b' : '#ffe98a', ev ? 0.34 : 0.26);
    World.clouds(t, camX, L, R, ev, ev ? 150 : 180);
    World.flock(t, camX, L, R, ev, ev ? 172 : 196);
    // the big ones, a long way off and in no hurry
    for (let i = 0; i < 2; i++) {
      const px = ((t * (7 + i * 4) + i * 900 + camX * 0.05) % 1700) - 300;
      Gfx.sprite('ptero_fly', px, 150 + i * 46 + Math.sin(t * 0.7 + i) * 9, {
        anchor: 'c', scale: 0.7 + i * 0.2, frame: Math.floor(t * 5 + i),
        tint: ev ? '#5c1607' : '#4b2070', tintAmount: ev ? 0.7 : 0.55, alpha: 0.8,
      });
    }

    // ---- BAND 1: snow peaks, almost not moving at all
    World.peaks(t, camX, L, R, ev);
    // ---- BAND 2 and 3: the purple ridges, with spires on the far one
    const ridge = (depth, col, edge, base, amp, scrub) => {
      const ctx = Gfx.ctx, off = camX * depth;
      const hy = x => base + Math.sin((x + off) * 0.0031) * amp + Math.sin((x + off) * 0.009) * amp * 0.35;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(L, GY);
      for (let x = L; x <= R; x += 22) ctx.lineTo(x, hy(x));
      ctx.lineTo(R, GY + 200); ctx.lineTo(L, GY + 200); ctx.fill();
      for (let x = Math.floor(L / 6) * 6; x < R; x += 6) Gfx.rect(x, hy(x), 6, 4, edge);
      for (let x = Math.floor(L / 6) * 6; x < R; x += 6) Gfx.rectA(x, hy(x) + 4, 6, 2, '#120c16', 0.22);
      for (let x = Math.floor(L / 36) * 36; x < R; x += 36) {
        const y = hy(x) + 12 + jitter(x + depth * 90, 36);
        Gfx.rectA(x + jitter(x, 26), y, 11, 5, edge, 0.5);
        if (scrub && ((x / 36) | 0) % 3 === 0) Gfx.round(x + jitter(x + 2, 26), y + 9, 16, 9, 4, edge);
        if (((x / 36) | 0) % 4 === 0) Gfx.rectA(x + jitter(x + 5, 26), y + 22, 7, 3, '#120c16', 0.18);
      }
    };
    ridge(0.6, ev ? '#4b2070' : '#7c3eb2', ev ? '#7c3eb2' : '#b177e6', 322, 30);
    for (let x = Math.floor(L / 420) * 420; x < R; x += 420) {    // rock spires on the far ridge
      const px = x - camX * 0.42, hgt = 70 + jitter(x, 46), fy = 352;
      Gfx.ctx.fillStyle = ev ? '#2a1220' : '#4b2070'; Gfx.ctx.beginPath();
      Gfx.ctx.moveTo(px - 18, fy); Gfx.ctx.lineTo(px - 5, fy - hgt);
      Gfx.ctx.lineTo(px + 4, fy - hgt * 0.8); Gfx.ctx.lineTo(px + 20, fy); Gfx.ctx.fill();
      Gfx.rectA(px - 8, fy - hgt, 7, hgt, ev ? '#5c1607' : '#7c3eb2', 0.6);
      Gfx.rectA(px - 18, fy - 2, 38, 3, '#120c16', 0.3);
    }
    ridge(0.42, ev ? '#2a1220' : '#4b2070', ev ? '#5c1607' : '#7c3eb2', 352, 22);
    // ---- BAND 4: the treeline on the last ridge before the valley floor
    World.treebelt(t, camX, L, R, ev);
    ridge(0.22, ev ? '#241109' : '#27632f', ev ? '#5c3a20' : '#3f9a45', 382, 12, true);
    // ---- the haze that sits between the valley and everything behind it
    Gfx.rectA(L, 352, R - L, 44, ev ? '#e06a1b' : '#a8d8ff', ev ? 0.14 : 0.18);
    Gfx.rectA(L, 368, R - L, 22, ev ? '#ffa832' : '#ffe08a', 0.09);

    // ---- BAND 5: the town along the road, and everything at the side of it
    World.suburb(t, camX, L, R, ev);
    World.roadside(t, camX, L, R, ev);

    // everything behind the road gets a little of the air between it and you,
    // which is what stops the town competing with the car for your attention
    Gfx.rectA(L, -400, R - L, GY + 300, ev ? '#2a1220' : '#3570c0', ev ? 0.26 : 0.10);

    // ---- BAND 6: the road surface
    const tar = ev ? '#3a2415' : '#85562f', lit = ev ? '#5c3a20' : '#b07a45';
    Gfx.rect(L, GY - 6, R - L, 300, tar);
    Gfx.rect(L, GY - 6, R - L, 6, lit);
    Gfx.rect(L, GY - 7, R - L, 1, '#120c16');
    Gfx.rectA(L, GY + 24, R - L, 8, ev ? '#241109' : '#5c3a20', 0.5);
    for (let x = Math.floor(L / 120) * 120; x < R; x += 120) {   // wheel ruts and loose stones
      Gfx.rectA(x, GY + 8, 72, 4, ev ? '#85562f' : '#d8a86b', 0.45);
      Gfx.rectA(x + 30, GY + 20, 58, 4, ev ? '#85562f' : '#d8a86b', 0.35);
      Gfx.round(x + 86, GY + 14, 13, 7, 3, '#7a6d8a');
      Gfx.rectA(x + 86, GY + 20, 13, 2, '#120c16', 0.4);
      Gfx.round(x + 20, GY + 28, 9, 5, 2, '#574a66');
      Gfx.rectA(x + 52, GY + 2, 30, 2, '#120c16', 0.22);        // hairline cracks
      Gfx.rectA(x + 8, GY + 34, 44, 2, '#120c16', 0.18);
    }
    // the middle of the road, painted in ochre by somebody who was paid by the dash
    for (let x = Math.floor(L / 96) * 96; x < R; x += 96) {
      Gfx.rectA(x, GY + 15, 46, 4, ev ? '#a8801f' : '#e8dfc6', 0.5);
      Gfx.rectA(x, GY + 19, 46, 1, '#120c16', 0.2);
    }
    World.traffic(t, camX, L, R, ev);
    World.verge(t, camX, L, R, ev ? ['#241109', '#3a2415', '#5c3a20'] : ['#27632f', '#3f9a45', '#6cc95c'], ev ? '#3a2415' : '#85562f', 'prop_fern', 1.6, GY + 48);
    // ---- the light on top of all of it
    if (ev) {
      Gfx.rectA(L, -400, R - L, GY + 300, '#5c1607', 0.12);
      for (let i = 0; i < 7; i++) {                             // ash and embers going the wrong way
        const ax = ((i * 331 + t * 210) % (VW + 300)) + camX - 150;
        const ay = 120 + ((i * 97 + t * 90) % 300);
        Gfx.rectA(ax, ay, 3, 3, i % 3 ? '#e06a1b' : '#ffa832', 0.5);
      }
    } else {
      for (let i = 0; i < 4; i++)                               // morning light, coming in low
        Gfx.rectA(camX - 160 + i * 300 - (camX * 0.1 % 300), -60, 70, GY + 60, '#ffe08a', 0.03);
    }
  },

  // Snow peaks: the furthest thing in the valley, and the slowest. Separate
  // mountains with caps and a shaded side, not a sine wave with a white edge.
  peaks(t, camX, L, R, ev) {
    const off = camX * 0.78, ctx = Gfx.ctx, foot = 344;
    const rock = ev ? '#3b3048' : '#574a66', lit = ev ? '#574a66' : '#7a6d8a';
    const snow = ev ? '#9391a6' : '#e8dfc6', snowLit = ev ? '#c4b89a' : '#fffaea';
    const SP = 190;
    for (let x = Math.floor((L + off) / SP) * SP - off - SP; x < R + SP; x += SP) {
      const i = Math.abs(((x + off) / SP) | 0);
      const px = x + jitter(i * 7, 60), h = 62 + jitter(i * 3, 62), w = 96 + jitter(i * 5, 70);
      const top = foot - h, kink = px + w * 0.12;
      ctx.fillStyle = rock; ctx.beginPath();
      ctx.moveTo(px - w / 2, foot); ctx.lineTo(kink - w * 0.16, top + h * 0.22);
      ctx.lineTo(kink, top); ctx.lineTo(kink + w * 0.2, top + h * 0.3);
      ctx.lineTo(px + w / 2, foot); ctx.fill();
      ctx.fillStyle = lit; ctx.beginPath();                 // the lit face
      ctx.moveTo(kink, top); ctx.lineTo(kink - w * 0.16, top + h * 0.22);
      ctx.lineTo(px - w * 0.1, foot); ctx.lineTo(kink - w * 0.02, foot); ctx.fill();
      ctx.fillStyle = snow; ctx.beginPath();                // the cap, with a ragged hem
      ctx.moveTo(kink, top); ctx.lineTo(kink - w * 0.1, top + h * 0.14);
      ctx.lineTo(kink - w * 0.05, top + h * 0.26); ctx.lineTo(kink + w * 0.03, top + h * 0.16);
      ctx.lineTo(kink + w * 0.09, top + h * 0.28); ctx.lineTo(kink + w * 0.13, top + h * 0.2); ctx.fill();
      Gfx.rect(kink - 2, top, 4, h * 0.1, snowLit);
      for (let k = 1; k < 4; k++)                           // strata, so it is not a flat shape
        Gfx.rectA(px - w / 2 + k * 6, top + h * (0.34 + k * 0.16), w - k * 14, 2, '#120c16', 0.16);
      Gfx.rectA(px - w / 2, foot - 3, w, 3, '#120c16', 0.25);
    }
    Gfx.rectA(L, foot - 4, R - L, 10, ev ? '#5c1607' : '#a8d8ff', 0.16);
  },

  // A band of small trees on the last ridge: enough of them to read as forest,
  // few enough to stay cheap.
  treebelt(t, camX, L, R, ev) {
    const off = camX * 0.3;
    for (let x = Math.floor((L + off) / 34) * 34 - off; x < R; x += 34) {
      const i = Math.abs(((x + off) / 34) | 0);
      const h = 22 + jitter(x + off, 20), bx = x + jitter(x + 1, 22);
      const y = 386 + jitter(x + 7, 8);
      const dark = ev ? '#241109' : '#1c4a24';
      Gfx.rect(bx - 2, y - h * 0.4, 4, h * 0.4, ev ? '#120c16' : '#241109');
      if (i % 3 === 0) {                        // a conifer
        for (let k = 0; k < 3; k++) Gfx.round(bx - 10 + k * 2, y - h + k * h * 0.28, 20 - k * 4, h * 0.4, 3, dark);
      } else {
        Gfx.round(bx - 11, y - h, 22, h * 0.72, 8, dark);
        Gfx.round(bx - 8, y - h + 2, 13, h * 0.3, 5, ev ? '#3a2415' : '#27632f');
      }
    }
  },

  // Roadside furniture: mile stones, warning signs, a shrine, bone poles with
  // vines strung between them, and the odd animal that has no business here.
  roadside(t, camX, L, R, ev) {
    const SP = 260;
    for (let x = Math.floor(L / SP) * SP; x < R + SP; x += SP) {
      const i = Math.abs((x / SP) | 0), bx = x + jitter(x + 11, 40), gy = GY - 8;
      // bone pole, and the vine to the next one
      Gfx.rect(bx - 3, gy - 120, 6, 120, ev ? '#5c3a20' : '#c4b89a');
      Gfx.rect(bx - 3, gy - 120, 2, 120, ev ? '#3a2415' : '#e8dfc6');
      Gfx.rect(bx + 3, gy - 120, 1, 120, '#120c16');
      Gfx.round(bx - 9, gy - 128, 18, 12, 5, ev ? '#5c3a20' : '#c4b89a');
      Gfx.rectA(bx - 9, gy - 118, 18, 2, '#120c16', 0.4);
      const ctx = Gfx.ctx;                                    // the sag between poles
      ctx.strokeStyle = ev ? '#241109' : '#27632f'; ctx.lineWidth = 2; ctx.beginPath();
      for (let k = 0; k <= 8; k++) {
        const px = bx + (SP * k) / 8, py = gy - 122 + Math.sin((k / 8) * Math.PI) * 20;
        k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
      if (i % 3 === 1) {                                      // a sign nobody reads
        Gfx.rect(bx + 70, gy - 70, 8, 76, '#5c3a20');       // the post it is nailed to
        Gfx.rect(bx + 70, gy - 70, 3, 76, '#85562f');
        Gfx.rect(bx + 78, gy - 70, 1, 76, '#120c16');
        Gfx.sprite('prop_signpost', bx + 118, gy + 6, { anchor: 'bc', scale: 1.1 });
        World.tablet(bx + 74 - 34, gy - 96, 68, 28, [{ t: ev ? 'RUN' : 'QUARRY', s: 0.9 }], { pad: 9 });
      } else if (i % 3 === 2) {                               // a roadside shrine, still lit
        Gfx.round(bx + 96, gy - 44, 44, 46, 6, '#574a66');
        Gfx.round(bx + 100, gy - 40, 36, 38, 5, '#3b3048');
        Gfx.round(bx + 106, gy - 32, 24, 26, 4, '#241c2e');
        Gfx.sprite('prop_skull', bx + 118, gy - 8, { anchor: 'bc', scale: 0.7 });
        World.flame(bx + 118, gy - 34, 14, 7, Math.sin(t * 3 + i), ['#e06a1b', '#ffa832', '#ffe98a', '#7d1d2b'], i);
        Gfx.glow(bx + 118, gy - 40, 70, '#ffa832', 0.22);
      } else {                                                // a milestone, and somebody's laundry rock
        Gfx.round(bx + 110, gy - 26, 26, 28, 5, '#7a6d8a');
        Gfx.round(bx + 113, gy - 24, 20, 22, 4, '#9391a6');
        Gfx.rectA(bx + 113, gy - 4, 20, 3, '#120c16', 0.4);
        Gfx.text(`${i * 3}`, bx + 123, gy - 20, { color: '#241109', align: 'center', scale: 0.9 });
      }
      if (i % 4 === 0) {                                      // a compy that is going to get flattened
        const cx2 = bx + 160 + Math.sin(t * 1.3 + i) * 44;
        Gfx.shadow(cx2, gy + 4, 22, 0.28);
        Gfx.sprite('compy_walk', cx2, gy + 4, { anchor: 'bc', scale: 0.7, frame: Math.floor(t * 10 + i) % 4, flip: Math.cos(t * 1.3 + i) < 0 });
      }
      if (i % 5 === 2) Gfx.sprite('prop_bones', bx + 190, gy + 6, { anchor: 'bc', scale: 0.9 });
    }
  },

  // Everything at the side of the road: houses of four kinds, and a villager
  // outside most of them getting on with something.
  suburb(t, camX, L, R, ev) {
    const BLOCK = 300;
    for (let x = Math.floor(L / BLOCK) * BLOCK; x < R + BLOCK; x += BLOCK) {
      const i = Math.abs((x / BLOCK) | 0);
      const hx = x + jitter(x, 60);
      const kind = i % 5;
      const hy = GY - 4;
      Gfx.shadow(hx, hy + 2, 120, 0.28);
      if (kind === 0) {                                    // a round hut with a smoking hole
        Gfx.sprite('prop_hut', hx, hy, { anchor: 'bc', scale: 1.15 });
        for (let k = 0; k < 4; k++) {
          const sy = hy - 96 - ((t * 22 + k * 22) % 88);
          Gfx.ctx.globalAlpha = 0.28 * (1 - ((t * 22 + k * 22) % 88) / 88);
          Gfx.round(hx - 8 + Math.sin(t + k) * 7, sy, 18, 12, 6, ev ? '#574a66' : '#d6cfe0');
          Gfx.ctx.globalAlpha = 1;
        }
        if (ev) { Gfx.round(hx - 9, hy - 40, 18, 16, 4, '#ffa832'); Gfx.glow(hx, hy - 32, 90, '#ffa832', 0.22); }
      } else if (kind === 1) {                             // a lean-to under a rock shelf
        Gfx.round(hx - 62, hy - 74, 124, 22, 8, '#574a66');
        Gfx.round(hx - 58, hy - 72, 116, 14, 6, '#7a6d8a');
        Gfx.rectA(hx - 62, hy - 56, 124, 3, '#120c16', 0.45);
        for (let k = 0; k < 7; k++) Gfx.line(hx - 52 + k * 17, hy - 54, hx - 44 + k * 17, hy, '#5c3a20', 5);
        for (let k = 0; k < 7; k++) Gfx.line(hx - 52 + k * 17, hy - 54, hx - 44 + k * 17, hy, '#85562f', 2);
        Gfx.round(hx - 58, hy - 56, 116, 8, 3, '#3a2415');
        Gfx.sprite('prop_pot', hx + 34, hy + 2, { anchor: 'bc' });
      } else if (kind === 2) {                             // a two-storey stack of stone boxes
        Gfx.round(hx - 52, hy - 78, 104, 78, 5, '#4d4a5c');
        Gfx.round(hx - 48, hy - 74, 96, 70, 4, '#7a6d8a');
        Gfx.round(hx - 40, hy - 122, 80, 48, 5, '#4d4a5c');
        Gfx.round(hx - 36, hy - 118, 72, 42, 4, '#9391a6');
        for (let k = 0; k < 8; k++) Gfx.rectA(hx - 46 + k * 12, hy - 70, 10, 3, '#574a66', 0.6);
        for (let k = 0; k < 6; k++) Gfx.rectA(hx - 44 + k * 15, hy - 40, 11, 3, '#574a66', 0.4);
        for (const [wx, wy, ww] of [[-30, -60, 22], [6, -60, 22], [-16, -108, 24]]) {
          Gfx.round(hx + wx, hy + wy, ww, 20, 3, '#241c2e');
          Gfx.round(hx + wx + 2, hy + wy + 2, ww - 4, 16, 2, '#ffa832');
          if (ev) Gfx.glow(hx + wx + ww / 2, hy + wy + 10, 70, '#ffa832', 0.2);
        }
        Gfx.round(hx - 46, hy - 130, 92, 10, 4, '#3a2415');
      } else if (kind === 3) {                             // a market stall, open since before dawn
        for (let k = 0; k < 4; k++) Gfx.rect(hx - 48 + k * 32, hy - 62, 4, 62, '#3a2415');
        Gfx.round(hx - 58, hy - 78, 120, 18, 5, '#a03a68');
        Gfx.round(hx - 54, hy - 76, 112, 7, 3, '#e06a9b');
        Gfx.rectA(hx - 58, hy - 62, 120, 3, '#120c16', 0.45);
        Gfx.round(hx - 50, hy - 36, 104, 14, 4, '#5c3a20');   // the counter
        Gfx.round(hx - 48, hy - 35, 100, 6, 3, '#85562f');
        Gfx.rectA(hx - 50, hy - 24, 104, 3, '#120c16', 0.4);
        for (let k = 0; k < 5; k++) {                         // what is for sale
          const px = hx - 38 + k * 20;
          if (k % 2) Gfx.sprite('meat_leg', px, hy - 36, { anchor: 'bc', scale: 0.55 });
          else { Gfx.circle(px, hy - 42, 5, ['#6cc95c', '#e0b93a', '#ef6a5e'][k % 3]); Gfx.circle(px - 2, hy - 44, 2, '#fffaea'); }
        }
        Gfx.sprite('villager2_idle', hx + 4, hy + 2, { anchor: 'bc', scale: 0.85, frame: Math.floor(t * 2 + i) % 2 });
        if (ev) Gfx.rectA(hx - 58, hy - 78, 120, 78, '#120c16', 0.35);   // shut, in a hurry
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
      const act = ev ? 0 : i % 3;
      const px = hx + 56 + jitter(x + 3, 24);
      if (act === 0) Gfx.sprite(who + '_walk', px, hy + 2, { anchor: 'bc', scale: 0.85, flip: ev, frame: Math.floor(t * (ev ? 13 : 7) + i) % 4 });
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
  traffic(t, camX, L, R, ev) {
    // in the morning the road is busy both ways. in the evening everybody is
    // going the other way, fast, and nobody is waving.
    const LANES = [
      { y: GY - 10, dir: ev ? -1 : 1, speed: ev ? 150 : 78, span: 1500, n: 3, scale: 0.92 },
      { y: GY + 26, dir: -1, speed: ev ? 210 : 112, span: 1800, n: 4, scale: 1.1 },
    ];
    for (let li = 0; li < LANES.length; li++) {
      const ln = LANES[li];
      for (let i = 0; i < ln.n; i++) {
        const base = (i * ln.span / ln.n + li * 420 + t * ln.speed * ln.dir);
        const vx = ((base % ln.span) + ln.span) % ln.span + L - 200;
        const kind = (i + li) % 4;
        const bounce = Math.sin(t * (ev ? 14 : 9) + i * 2) * (ev ? 3 : 2);
        Gfx.shadow(vx, ln.y + 2, 96 * ln.scale, 0.3);
        if (kind === 2) {                                   // somebody riding a triceratops
          Gfx.sprite('tricera_walk', vx, ln.y, { anchor: 'bc', scale: ln.scale * 0.8, flip: ln.dir < 0, frame: Math.floor(t * (ev ? 13 : 8) + i) % 4 });
          Gfx.round(vx - 16 * ln.dir, ln.y - 44 * ln.scale, 26, 12, 4, '#5c3a20');   // a saddle blanket
          Gfx.rectA(vx - 16 * ln.dir, ln.y - 34 * ln.scale, 26, 3, '#120c16', 0.4);
          Gfx.sprite('villager_idle', vx - 4 * ln.dir, ln.y - 40 * ln.scale + bounce * 0.4, { anchor: 'bc', scale: ln.scale * 0.55, flip: ln.dir < 0 });
        } else if (kind === 3) {                            // the bus: a stegosaur with benches on it
          Gfx.sprite('stego_walk', vx, ln.y, { anchor: 'bc', scale: ln.scale * 0.95, flip: ln.dir < 0, frame: Math.floor(t * (ev ? 11 : 6) + i) % 4 });
          const by = ln.y - 62 * ln.scale;
          Gfx.round(vx - 34, by, 68, 16, 4, '#5c3a20');     // the platform
          Gfx.round(vx - 32, by + 2, 64, 9, 3, '#85562f');
          Gfx.rectA(vx - 34, by + 13, 68, 3, '#120c16', 0.45);
          for (let k = 0; k < 4; k++) Gfx.rect(vx - 30 + k * 20, by - 16, 3, 17, '#3a2415');   // canopy poles
          Gfx.round(vx - 36, by - 24, 72, 10, 4, '#a03a68');
          Gfx.rectA(vx - 36, by - 15, 72, 3, '#120c16', 0.4);
          for (let k = 0; k < 3; k++) Gfx.sprite(k % 2 ? 'villager2_idle' : 'villager_idle',
            vx - 20 + k * 20, by + 2 + bounce * 0.3, { anchor: 'bc', scale: ln.scale * 0.5, flip: ln.dir < 0 });
        } else {
          Gfx.sprite('car', vx, ln.y + bounce * 0.3, { anchor: 'bc', scale: ln.scale, flip: ln.dir < 0, frame: Math.floor(Math.abs(vx) / 18) % 4 });
          Gfx.sprite(kind ? 'villager2_idle' : 'villager_idle', vx - 8 * ln.dir, ln.y - 16 * ln.scale + bounce,
            { anchor: 'bc', scale: ln.scale * 0.55, flip: ln.dir < 0 });
          if (ev && (i + li) % 2 === 0) {                   // everything they own, on the roof
            Gfx.round(vx - 16, ln.y - 40 * ln.scale, 32, 14, 4, '#5c3a20');
            Gfx.rectA(vx - 16, ln.y - 28 * ln.scale, 32, 3, '#120c16', 0.4);
            Gfx.round(vx - 10, ln.y - 48 * ln.scale, 18, 10, 3, '#a03a68');
          }
        }
        if (chance(Time.dt * (ev ? 8 : 3))) Particles.dust(vx - 40 * ln.dir, ln.y, 1);
        if (ev && chance(Time.dt * 0.35)) Popups.add(vx, ln.y - 80, pick(['GO GO GO', 'MOVE!', '!!!']), '#ef6a5e', { scale: 1.0, life: 1.1 });
      }
    }
  },

  // The strip that runs in FRONT of the action, scrolling faster than the
  // ground it sits on. Without it a side-scroller is a painting; with it the
  // camera is in the world.
  verge(t, camX, L, R, green, dirt, prop = 'prop_fern', pscale = 1.6, topY) {
    const off = camX * 0.48;                       // it moves faster than the ground
    const FL = camX - 260, FR = camX + VW + 260;
    const TOP = topY ?? GY + 34;
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
    const L = camX - 300, R = camX + VW + 300;
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
    Gfx.rect(L, GY - 7, R - L, 1, '#120c16');
    Gfx.rect(L, GY - 6, R - L, 5, '#bdbccd');
    Gfx.rectA(L, GY - 1, R - L, 2, '#120c16', 0.35);
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

    // ---- the plant: derricks lifting rock out of the pit
    for (let x = Math.floor((L - 300) / 760) * 760; x < R + 300; x += 760) {
      if (Math.abs(x - QUARRY.boss) < 280 || Math.abs(x - QUARRY.box) < 260) continue;
      if (QUARRY.faces.some(fx => Math.abs(x - fx) < 300)) continue;    // never over a face
      World.crane(t, x, GY + 8, Math.abs((x / 760) | 0));
    }
    // ---- the office and the working face
    if (L < QUARRY.boss + 260 && R > QUARRY.boss - 260) World.quarryOffice(t);
    QUARRY.faces.forEach((fx, i) => {
      if (L < fx + 320 && R > fx - 320) World.quarryFace(t, o, fx, i);
    });
    if (L < QUARRY.box + 300 && R > QUARRY.box - 300) World.quarryBox(t, o);
    World.quarryFolk(t, L, R);
    // ---- the crew, on the haul road: five species, all of them on the payroll
    const KIND = ['tricera', 'stego', 'mammoth', 'brute', 'raptor'];
    // the haul road runs along the front of the pit, nearer the camera than
    // the face, so nothing on it ever parks in front of the work
    for (let i = 0; i < 5; i++)
      World.patrol(L, R, 2400, i * 480, (i % 2 ? 1 : -1) * (15 + i * 4), t,
        px => World.workBeast(t, px, GY + 42 + (i % 3) * 10, KIND[i], { ph: i, drag: i % 2 === 0, flip: i % 2 === 1 }));
    // ---- and the ones doing it with their hands
    for (let i = 0; i < 7; i++)
      World.patrol(L, R, 1700, i * 243, (i % 2 ? -1 : 1) * (21 + i * 3), t,
        px => World.hauler(t, px, GY + 26 + (i % 3) * 14, i, i % 2 ? -1 : 1));
  },

  // Something walking a loop of world, drawn wherever that loop currently puts
  // it - anchored to the world, not to the camera, so it does not swim.
  patrol(L, R, span, phase, speed, t, fn) {
    const p = ((phase + t * speed) % span + span) % span;
    for (let k = Math.floor((L - 300 - p) / span); ; k++) {
      const px = p + k * span;
      if (px > R + 300) break;
      if (px > L - 300) fn(px);
    }
  },
  // Where the shift actually happens. Fixed positions, because the mining game
  // and the cutscene both need to know where the face and the box are.
  quarryFace(t, o = {}, fx, gi = 0) {
    const x = fx ?? QUARRY.faces[0];
    // ---- a shoulder of rock left standing where they are cutting. Not a slab:
    // the profile is ragged and it sits into the pit floor.
    const prof = px => {
      const k = (px - x) / 132;
      if (k <= -1 || k >= 1) return null;
      return GY - 220 * Math.pow(1 - k * k * k * k * k * k, 0.34)
        + Math.sin(px * 0.071) * 13 + Math.sin(px * 0.021 + 1.4) * 19 + Math.sin(px * 0.19) * 6
        + Math.sin(px * 0.41 + 2) * 3;
    };
    Gfx.shadow(x, GY + 4, 250, 0.3);
    for (let px = Math.floor((x - 136) / 4) * 4; px < x + 136; px += 4) {
      const y = prof(px + 2); if (y == null) continue;
      const yt = Math.round(y / 4) * 4;
      Gfx.rect(px, yt, 4, GY - yt + 12, '#574a66');
      Gfx.rect(px, yt, 4, 6, '#9391a6');                          // the lit top edge
      Gfx.rect(px, yt + 6, 4, 6, '#7a6d8a');
      Gfx.rect(px, yt - 3, 4, 3, '#241c2e');
    }
    for (let k = 0; k < 8; k++)                                   // strata, following the cut
      for (let px = Math.floor((x - 132) / 9) * 9; px < x + 132; px += 9) {
        const y = prof(px); if (y == null) continue;
        const sy = y + 28 + k * 24 + Math.sin(px * 0.012 + k) * 5;
        if (sy > GY - 4) continue;
        Gfx.rectA(px, sy, 9, 3, k % 2 ? '#3b3048' : '#7a6d8a', 0.38);
      }
    for (let i = 0; i < 26; i++) {                                // chisel scars
      const px = x - 118 + (i % 7) * 34 + jitter(i, 14);
      const y = prof(px); if (y == null) continue;
      const sy = y + 22 + ((i * 53) % 160);
      if (sy > GY - 6) continue;
      Gfx.rectA(px, sy, 11, 3, '#241c2e', 0.34);
      Gfx.rectA(px, sy - 1, 7, 1, '#bdbccd', 0.22);
    }
    for (let i = 0; i < 5; i++) {                                 // vertical jointing
      const px = x - 96 + i * 48 + jitter(i * 3, 16);
      const y = prof(px); if (y == null) continue;
      Gfx.rectA(px, y + 10, 3, GY - y - 14, '#241c2e', 0.32);
      Gfx.rectA(px + 3, y + 10, 2, GY - y - 14, '#9391a6', 0.10);
    }
    // a ladder against the left shoulder, and the spoil heaped at the foot
    { const lx = x - 108, ly = prof(lx) || GY - 90;
      Gfx.rect(lx - 4, ly + 8, 4, GY - ly - 6, '#3a2415');
      Gfx.rect(lx + 18, ly + 8, 4, GY - ly - 6, '#3a2415');
      for (let k = 0; k * 16 < GY - ly - 10; k++) Gfx.rect(lx - 4, GY - 12 - k * 16, 26, 4, '#5c3a20'); }
    for (let i = 0; i < 9; i++)
      Gfx.round(x - 120 + i * 30 + jitter(i, 12), GY - 8 - (i % 3) * 5, 22 + (i % 4) * 7, 12, 4, i % 2 ? '#4d4a5c' : '#3b3048');
    // ---- the pocket of crystal this face is being cut for
    [QUARRY.gems[gi]].forEach((g, _i) => {
      const i = gi;
      const got = (o.mined || 0) > i;
      const c = World.oreCols[[2, 1, 0][i]];
      // the hollow it sits in, broken open rather than framed
      for (let k = 0; k < 7; k++) {
        const a = k / 7 * 6.283;
        Gfx.circle(g.x + Math.cos(a) * 20, g.y + 4 + Math.sin(a) * 15, 13 + jitter(k * 9, 6), '#241c2e');
      }
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * 6.283 + 0.4;
        Gfx.circle(g.x + Math.cos(a) * 17, g.y + 4 + Math.sin(a) * 12, 9, '#120c16');
      }
      for (let k = 0; k < 5; k++)                                 // fresh chisel marks around it
        Gfx.rectA(g.x - 34 + k * 17, g.y - 26 + (k % 2) * 46, 10, 3, '#bdbccd', 0.26);
      if (got) {                                                  // an empty socket, and the dust
        Gfx.round(g.x - 19, g.y - 16, 38, 32, 6, '#241c2e');
        for (let k = 0; k < 4; k++) Gfx.rectA(g.x - 14 + k * 9, g.y + 12, 7, 3, '#574a66', 0.7);
        return;
      }
      for (let k = 0; k < 7; k++) {                               // the crystal, growing out
        const a = -2.7 + k * 0.4, len = 17 + (k % 3) * 9;
        const ex = g.x + Math.cos(a) * len, ey = g.y + 10 + Math.sin(a) * len;
        Gfx.line(g.x, g.y + 10, ex, ey, '#120c16', 10);
        Gfx.line(g.x, g.y + 10, ex, ey, c[0], 6);
        Gfx.line(g.x, g.y + 10, g.x + Math.cos(a) * len * 0.7, g.y + 10 + Math.sin(a) * len * 0.7, c[1], 2);
        Gfx.circle(ex, ey, 2.5, c[1]);
      }
      Gfx.glow(g.x, g.y, 66, c[1], 0.30 + Math.sin(t * 2.4 + i) * 0.09);
      // the face number, painted on the rock by somebody with one brush
      Gfx.text(`FACE ${i + 1}`, g.x, g.y - 52, { color: '#ffe98a', align: 'center', scale: 1.2, outline: true });
    });
  },

  // The box at the end of the shift. Three crystal in, one shell out.
  quarryBox(t, o = {}) {
    // ---- the box the crystal goes in, with a tally scratched on the lid
    const bx = QUARRY.box;
    Gfx.shadow(bx, GY + 4, 90, 0.32);
    Gfx.round(bx - 44, GY - 52, 88, 56, 5, '#3a2415');
    Gfx.round(bx - 40, GY - 48, 80, 48, 4, '#5c3a20');
    for (let i = 0; i < 4; i++) Gfx.rect(bx - 36 + i * 21, GY - 48, 5, 48, '#3a2415');
    Gfx.rect(bx - 40, GY - 30, 80, 5, '#85562f');
    Gfx.round(bx - 46, GY - 58, 92, 12, 4, '#3a2415');            // the rim
    Gfx.round(bx - 43, GY - 57, 86, 5, 2, '#b07a45');
    for (let i = 0; i < Math.min(3, o.mined || 0); i++)           // what is in it so far
      World.oreLump(bx - 18 + i * 18, GY - 58, 1.1, [2, 1, 0][i]);
    Gfx.text('3 = 1', bx, GY - 82, { color: '#ffe98a', align: 'center', scale: 1.1, outline: true });
    Gfx.sprite('relic_shell', bx + 36, GY - 80, { anchor: 'c', scale: 0.9 });
    Gfx.glow(bx + 36, GY - 80, 46, '#ffe98a', 0.22);
  },

  // The foreman works out of a lean-to with a slate on the front of it. He has
  // never once been inside the mine.
  quarryOffice(t) {
    const x = QUARRY.boss;
    Gfx.shadow(x, GY + 4, 150, 0.3);
    for (const px of [x - 62, x + 58]) { Gfx.rect(px, GY - 120, 9, 124, '#3a2415'); Gfx.rect(px, GY - 120, 3, 124, '#85562f'); }
    Gfx.round(x - 76, GY - 134, 156, 18, 4, '#3a2415');           // the lintel
    Gfx.round(x - 72, GY - 132, 148, 6, 3, '#85562f');
    for (let i = 0; i < 9; i++)                                   // a thatched lean-to roof
      Gfx.round(x - 74 + i * 17, GY - 152 + (i % 2) * 4, 20, 22, 6, i % 2 ? '#85562f' : '#b07a45');
    // the slate: this week's numbers, badly written
    Gfx.round(x - 44, GY - 114, 88, 66, 4, '#241c2e');
    Gfx.round(x - 40, GY - 110, 80, 58, 3, '#3b3048');
    for (let i = 0; i < 4; i++) Gfx.rectA(x - 33, GY - 100 + i * 13, 44 + (i % 3) * 12, 3, '#bdbccd', 0.7);
    Gfx.rectA(x + 14, GY - 100, 18, 42, '#ef6a5e', 0.5);
    Gfx.sprite('prop_barrel', x + 76, GY + 4, { anchor: 'bc' });
    Gfx.sprite('art_club', x - 84, GY - 6, { anchor: 'bc', scale: 1.2, rot: -0.5 });
  },

  // The people who are here every day. They are at posts, not on loops: each
  // one has a job, a spot and something to say to you when you walk past it.
  FOLK: [
    { x: 250, base: 'villager', name: 'GRIT', job: 'lamp', line: "Lamp oil's short. Mine carefully, or mine in the dark." },
    { x: 620, base: 'villager2', name: 'MOSS', job: 'sharpen', line: 'Blunt pick, long day. Give it here.' },
    { x: 760, base: 'brute', name: 'TUSK', job: 'haul', line: 'Face one is soft today. Face three is not.' },
    { x: 1160, base: 'villager', name: 'PEAT', job: 'sit', line: "Fourteen years. Never found a rock shaped like a face." },
    { x: 1330, base: 'villager2', name: 'BRACK', job: 'tally', line: 'Every crystal gets written down. Every one.' },
    { x: 1760, base: 'brute', name: 'SHALE', job: 'sharpen', line: "Something's been knocking on the deep wall. Not us." },
    { x: 1920, base: 'villager', name: 'FLINT', job: 'sleep', line: '...five more minutes...' },
    { x: 2260, base: 'villager2', name: 'CINDER', job: 'haul', line: 'Box is that way. Foreman counts it twice.' },
    { x: 2380, base: 'villager', name: 'OCHRE', job: 'sit', line: 'One shell. Buys a fish. Half a fish.' },
  ],
  quarryFolk(t, L, R) {
    for (let i = 0; i < World.FOLK.length; i++) {
      const f = World.FOLK[i];
      if (f.x < L - 80 || f.x > R + 80) continue;
      const gy = GY + 4, sc = f.base === 'brute' ? 0.95 : 0.9;
      Gfx.shadow(f.x, gy + 2, 34 * sc, 0.3);
      if (f.job === 'lamp') {
        Gfx.rect(f.x + 26, gy - 96, 6, 96, '#3a2415');
        Gfx.rect(f.x + 26, gy - 96, 2, 96, '#85562f');
        Gfx.sprite('house_lamp', f.x + 29, gy - 96, { anchor: 'tc', scale: 1.1 });
        Gfx.glow(f.x + 29, gy - 78, 100, '#ff9a20', 0.26 + Math.sin(t * 3 + i) * 0.05);
        Gfx.sprite(f.base + '_idle', f.x, gy, { anchor: 'bc', scale: sc, frame: Math.floor(t * 2 + i) % 2 });
      } else if (f.job === 'sharpen') {
        Gfx.round(f.x + 20, gy - 24, 34, 26, 6, '#574a66');       // the grindstone
        Gfx.round(f.x + 23, gy - 22, 28, 8, 3, '#9391a6');
        Gfx.rectA(f.x + 20, gy - 2, 34, 3, '#120c16', 0.4);
        const sw = Math.sin(t * 6 + i) * 0.22;
        World.pickaxe(f.x + 34, gy - 30, -0.6 + sw, 0.5);
        if (chance(Time.dt * 8)) Particles.spawn((f.x + 36), (gy - 30), { n: 1, color: ['#ffe98a', '#ffa832'], speed: 120, spread: 1.4, angle: -0.8, gravity: 300, life: 0.4, size: 2, sizeEnd: 0 });
        Gfx.sprite(f.base + '_idle', f.x, gy, { anchor: 'bc', scale: sc, frame: Math.floor(t * 5 + i) % 2 });
      } else if (f.job === 'haul') {
        const push = Math.sin(t * 2.2 + i) * 5;
        World.oreCart(f.x + 52 + push, gy + 2, i);
        Gfx.sprite(f.base + '_walk', f.x + push, gy, { anchor: 'bc', scale: sc, frame: Math.floor(t * 5 + i) % 4 });
      } else if (f.job === 'tally') {
        Gfx.round(f.x + 22, gy - 76, 44, 54, 4, '#241c2e');       // the slate
        Gfx.round(f.x + 25, gy - 73, 38, 48, 3, '#3b3048');
        for (let k = 0; k < 4; k++) Gfx.rectA(f.x + 29, gy - 66 + k * 11, 18 + (k % 3) * 8, 3, '#bdbccd', 0.7);
        Gfx.rect(f.x + 40, gy - 22, 6, 26, '#3a2415');
        Gfx.sprite(f.base + '_idle', f.x, gy, { anchor: 'bc', scale: sc, frame: Math.floor(t * 3 + i) % 2 });
        if (chance(Time.dt * 0.5)) Popups.add(f.x + 44, gy - 92, 'tick', '#bdbccd', { scale: 0.9, life: 1.0 });
      } else if (f.job === 'sleep') {
        Gfx.sprite('prop_barrel', f.x + 34, gy + 2, { anchor: 'bc' });
        Gfx.sprite('bronk_sleep', f.x, gy, { anchor: 'bc', scale: 0.75, frame: Math.floor(t * 2) % 4, tint: '#5c3a20', tintAmount: 0.35 });
        const zk = (t * 0.7 + i) % 1;
        Gfx.text('z', f.x + 22, gy - 46 - zk * 30, { color: '#d6cfe0', align: 'center', scale: 1 + zk, alpha: 1 - zk });
      } else {                                                    // sitting on a rock with a jar
        Gfx.sprite('prop_rock', f.x + 6, gy + 2, { anchor: 'bc', scale: 1.1 });
        Gfx.sprite(f.base + '_idle', f.x, gy - 16, { anchor: 'bc', scale: sc, frame: Math.floor(t * 1.6 + i) % 2 });
        Gfx.sprite('house_waterjar', f.x + 34, gy + 2, { anchor: 'bc', scale: 0.8 });
      }
    }
  },

  // Five ores, and each one looks like itself: amber, copper, amethyst,
  // emerald and the plain grey stone that pays the wages.
  oreCols: [['#e06a1b', '#ffa832', '#5c1607'], ['#18706a', '#2cb3a2', '#0f3838'],
            ['#7c3eb2', '#b177e6', '#281040'], ['#3f9a45', '#6cc95c', '#14331e'],
            ['#3570c0', '#6aa9ee', '#101f3d']],
  // A chunk of ore reads as a chunk of ore because it has flat faces. Rounded
  // ones read as sweets, which is not what this quarry sells.
  LUMP: [[-4, 8], [-6, 12], [-7, 14], [-6, 13], [-4, 9], [-2, 5]],
  oreLump(x, y, s, kind) {
    const c = World.oreCols[kind % 5], top = y - 11 * s;
    for (let i = 0; i < World.LUMP.length; i++) {
      const [ox, w] = World.LUMP[i], yy = top + i * 2 * s;
      Gfx.rect(x + (ox - 1) * s, yy - s, (w + 2) * s, 4 * s, '#120c16');
    }
    for (let i = 0; i < World.LUMP.length; i++) {
      const [ox, w] = World.LUMP[i], yy = top + i * 2 * s;
      Gfx.rect(x + ox * s, yy, w * s, 2 * s, c[0]);
      Gfx.rect(x + ox * s, yy, Math.max(1, w * 0.4) * s, 2 * s, c[1]);
      if (i > 3) Gfx.rect(x + (ox + w * 0.56) * s, yy, w * 0.44 * s, 2 * s, c[2]);
    }
    Gfx.glow(x, y - 5 * s, 15 * s, c[1], 0.16);
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

  // ------------------------------------------------------- THE WORKFORCE
  // Nobody at this quarry works alone. Every beast on the payroll gets a hide
  // blanket, a hammered plate over the shoulder and somebody sitting on it.
  // The table is per-species because a stegosaur's back is not where a
  // triceratops keeps one.
  // back:  how high off the ground the saddle sits
  // seat:  how far behind the middle the rider sits (negative is behind)
  // plate: how far forward the shoulder plate rides
  CREW: {
    tricera: { spr: 'tricera_walk', scale: 1.05, back: 52, seat: -8, plate: 22, fps: 7 },
    stego: { spr: 'stego_walk', scale: 1.05, back: 50, seat: -12, plate: 18, fps: 6 },
    brute: { spr: 'brute_walk', scale: 0.95, back: 62, seat: -2, plate: 12, fps: 8 },
    mammoth: { spr: 'mammoth_walk', scale: 0.95, back: 66, seat: -10, plate: 26, fps: 6 },
    raptor: { spr: 'raptor_walk', scale: 0.9, back: 40, seat: -6, plate: 14, fps: 10 },
  },
  workBeast(t, x, gy, kind, o = {}) {
    const c = World.CREW[kind] || World.CREW.tricera;
    const sp = Gfx.spr(c.spr), sc = (o.scale || 1) * c.scale;
    const w = sp.w * sc, h = sp.h * sc, dir = o.flip ? -1 : 1, ph = o.ph || 0;
    const bob = Math.abs(Math.sin(t * c.fps * 0.8 + ph)) * 3;
    Gfx.shadow(x, gy + 2, w * 0.66, 0.3);
    // ---- what it is dragging, drawn behind it
    if (o.drag) {
      const sx = x - dir * (w * 0.5 + 44);
      Gfx.line(x - dir * w * 0.36, gy - h * 0.34, sx + dir * 26, gy - 20, '#3a2415', 3);
      Gfx.round(sx - 30, gy - 24, 60, 20, 4, '#3a2415');            // the sledge
      Gfx.round(sx - 27, gy - 22, 54, 15, 3, '#5c3a20');
      for (let i = 0; i < 6; i++) World.oreLump(sx - 20 + i * 8, gy - 28 - (i % 3) * 4, 0.85, (i + ph) % 5);
      Gfx.round(sx - 32, gy - 6, 64, 6, 3, '#241c2e');              // the runners
    }
    Gfx.sprite(c.spr, x, gy - bob, { anchor: 'bc', scale: sc, frame: Math.floor(t * c.fps + ph * 3), flip: o.flip });
    // ---- the tack: a hide blanket over the back, held with a bronze-studded girth
    const by = gy - c.back * sc - bob, bx = x + dir * c.seat * sc, bw = 30 * sc;
    Gfx.round(bx - bw / 2, by - 3, bw, 11, 3, '#7d1d2b');
    Gfx.round(bx - bw / 2, by - 3, bw, 4, 2, '#ef6a5e');
    for (let i = 0; i < 4; i++) Gfx.rect(bx - bw / 2 + 3 + i * (bw / 4.4), by + 6, 3, 4, '#e0b93a');
    // ---- one plate of hammered bronze, over the shoulder and no bigger
    const px = x + dir * c.plate * sc;
    Gfx.round(px - 8, by + 2, 16, 20, 5, '#6b4a10');
    Gfx.round(px - 6, by + 4, 12, 15, 4, '#e0b93a');
    Gfx.round(px - 5, by + 5, 5, 5, 2, '#ffe98a');
    Gfx.rectA(px - 6, by + 14, 12, 3, '#6b4a10', 0.7);
    // ---- and the driver, sitting on it
    if (o.rider !== false) {
      const rx = bx - dir * 2, ry = by + 2;
      Gfx.sprite(ph % 2 ? 'villager2_idle' : 'villager_idle', rx, ry, { anchor: 'bc', scale: 0.55, flip: o.flip });
      Gfx.round(rx - 8, ry - 40, 16, 7, 3, '#6b4a10');              // a hard hat, of sorts
      Gfx.round(rx - 6, ry - 41, 11, 3, 2, '#e0b93a');
      Gfx.line(rx + dir * 6, ry - 28, px + dir * 4, by + 6, '#3a2415', 2);     // reins
    }
  },

  // ---- a worker with a basket of rock on one shoulder, plodding
  hauler(t, x, gy, seed, dir = 1) {
    const ph = seed * 1.7;
    const bob = Math.abs(Math.sin(t * 7 + ph)) * 3;
    Gfx.shadow(x, gy + 2, 26, 0.3);
    Gfx.sprite(seed % 2 ? 'villager_walk' : 'villager2_walk', x, gy - bob,
      { anchor: 'bc', scale: 0.85, frame: Math.floor(t * 8 + ph) % 4, flip: dir < 0 });
    // the basket, riding the shoulder and leaning with the step
    const bx = x - dir * 12, by = gy - 54 - bob;
    Gfx.round(bx - 15, by - 12, 30, 20, 5, '#3a2415');
    Gfx.round(bx - 13, by - 10, 26, 15, 4, '#85562f');
    for (let i = 0; i < 4; i++) Gfx.rectA(bx - 12 + i * 7, by - 10, 3, 15, '#5c3a20', 0.8);
    for (let i = 0; i < 4; i++) World.oreLump(bx - 9 + i * 6, by - 12, 0.7, (seed + i) % 5);
    Gfx.line(bx + dir * 12, by - 2, x - dir * 2, gy - 44 - bob, '#3a2415', 2);
  },

  // ---- a derrick: two legs, a boom, a rope and a bucket of rock going up
  crane(t, x, gy, seed) {
    const sw = Math.sin(t * 0.7 + seed) * 0.16;           // the boom swings, slowly
    const topY = gy - 210, footW = 62;
    Gfx.shadow(x, gy + 2, 130, 0.3);
    // the legs
    for (const s of [-1, 1]) {
      Gfx.line(x + s * footW, gy, x + s * 8, topY + 12, '#3a2415', 9);
      Gfx.line(x + s * footW, gy, x + s * 8, topY + 12, '#5c3a20', 5);
    }
    for (let i = 1; i < 5; i++) {                          // cross-bracing
      const k = i / 5, y = gy - (gy - topY) * k;
      const hw = footW * (1 - k) + 8 * k;
      Gfx.line(x - hw, y, x + hw, y, '#3a2415', 4);
      Gfx.line(x - hw, y, x + hw, y - 22, '#5c3a20', 2);
    }
    // the boom, out over the pit
    const bx = x + Math.cos(-0.5 + sw) * 150, by = topY + 12 + Math.sin(-0.5 + sw) * 150;
    Gfx.line(x, topY + 12, bx, by, '#3a2415', 10);
    Gfx.line(x, topY + 12, bx, by, '#85562f', 5);
    Gfx.line(x, topY + 12, x - 62, topY + 52, '#3a2415', 7);    // the counterweight arm
    Gfx.round(x - 76, topY + 44, 28, 26, 6, '#574a66');
    Gfx.round(x - 73, topY + 46, 22, 9, 3, '#9391a6');
    // the rope, and what is on the end of it
    const drop = 96 + Math.sin(t * 0.9 + seed * 2) * 52;
    Gfx.line(bx, by, bx, by + drop, '#241c2e', 2);
    Gfx.round(bx - 22, by + drop, 44, 30, 6, '#3a2415');
    Gfx.round(bx - 19, by + drop + 3, 38, 23, 5, '#5c3a20');
    for (let i = 0; i < 5; i++) World.oreLump(bx - 14 + i * 7, by + drop - 1, 0.8, (seed + i) % 5);
    Gfx.line(bx - 18, by + drop + 2, bx, by + drop - 10, '#241c2e', 2);
    Gfx.line(bx + 18, by + drop + 2, bx, by + drop - 10, '#241c2e', 2);
    // two of them on the winch, walking it round
    const wr = 26;
    Gfx.round(x - 34, gy - 26, 68, 26, 6, '#3a2415');
    Gfx.round(x - 31, gy - 24, 62, 9, 3, '#5c3a20');
    for (let i = 0; i < 2; i++) {
      const a = t * 1.1 + i * Math.PI + seed;
      Gfx.sprite('villager_walk', x + Math.cos(a) * wr * 1.6, gy + 2,
        { anchor: 'bc', scale: 0.7, frame: Math.floor(t * 7 + i) % 4, flip: Math.cos(a) < 0, alpha: 0.95 });
    }
  },

  // ---- the tool of the trade: a stone head lashed to a bent haft
  pickaxe(x, y, rot, s = 1) {
    const ctx = Gfx.ctx;
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(rot); ctx.scale(s, s);
    Gfx.round(-4, -2, 8, 62, 3, '#3a2415');                 // the haft
    Gfx.round(-2, 0, 3, 58, 1, '#85562f');
    Gfx.round(-5, 44, 10, 10, 3, '#5c3a20');                // the grip binding
    ctx.save(); ctx.rotate(-0.12);
    Gfx.round(-30, -16, 60, 13, 5, '#241c2e');              // the head
    Gfx.round(-27, -14, 54, 8, 4, '#7a6d8a');
    Gfx.round(-25, -14, 22, 4, 2, '#bdbccd');
    Gfx.round(-34, -14, 9, 9, 3, '#4d4a5c');                // the two points
    Gfx.round(25, -14, 9, 9, 3, '#4d4a5c');
    ctx.restore();
    for (let i = 0; i < 3; i++) Gfx.rectA(-6, -6 + i * 5, 12, 3, '#b07a45', 0.85);   // the lashing
    ctx.restore();
  },

  // ---- a stone tablet with something chiselled on it. This is paperwork, and
  // it is cut from exactly the same rock as the rest of the interface.
  tablet(x, y, w, h, lines, o = {}) {
    UI.slab(x, y, w, h, { r: 5, shadow: o.shadow !== false });
    lines.forEach((ln, i) => {
      const ty = y + (o.pad ?? 22) + i * (o.gap ?? 26);
      Gfx.text(ln.t, x + w / 2, ty + 2, { color: SKIN.faceHi, align: 'center', scale: ln.s || 1.4 });
      Gfx.text(ln.t, x + w / 2, ty, { color: ln.c || SKIN.text, align: 'center', scale: ln.s || 1.4 });
    });
  },

  // ------------------------------------------------------------- THE FLIGHT
  // The road out of the valley, after dark, with the village burning behind
  // it. Three layers and nothing else: what is happening back there, the
  // trees going past, and the road you are on. Everything in it is a tree, a
  // hut or a dinosaur - no new parts, just more of them and worse news.
  RAMPAGE: ['trex_walk', 'tricera_walk', 'stego_walk', 'raptor_walk', 'brute_walk', 'boar_walk'],
  flight(t, o = {}, camX = 0) {
    const L = camX - 300, R = camX + VW + 300;
    const ctx = Gfx.ctx;
    const j = (i, m) => Math.abs(jitter(i, m));

    // ---- a sky that has already decided how this evening is going
    World.skyRamp(L, R, -440, GY - 60, ['#0b0a18', '#281040', '#5c1f3d', '#a03a68', '#e06a1b', '#ffa832']);
    { const mx = 520 - camX * 0.03;
      Gfx.circle(mx, -30, 38, '#ef6a5e'); Gfx.glow(mx, -30, 300, '#e06a1b', 0.30); }
    World.flock(t, camX, L, R, true, -230);

    // ---- BACK: the village, and what is in it. All silhouette, all on fire.
    const bo = camX * 0.16;
    ctx.fillStyle = '#241c2e'; ctx.beginPath(); ctx.moveTo(L, GY);
    for (let x = L; x <= R; x += 22) {
      const k = (x + bo) * 0.0036;
      ctx.lineTo(x, 288 + Math.sin(k) * 26 + Math.sin(k * 3.1 + 1) * 11);
    }
    ctx.lineTo(R, GY + 40); ctx.lineTo(L, GY + 40); ctx.fill();
    for (let x = Math.floor((L + bo) / 128) * 128; x < R + bo; x += 128) {
      const i = Math.abs((x / 128) | 0), px = x - bo;
      const gy = 300 + j(i, 12);
      const burning = i % 3 !== 1;
      Gfx.sprite(i % 4 === 2 ? 'prop_hut_ruin' : 'prop_hut', px, gy,
        { anchor: 'bc', scale: 0.76 + j(i + 2, 0.24), tint: '#3f0e18', tintAmount: 0.88 });
      if (!burning) continue;
      // flame on the roof, and a column of smoke leaning off it
      for (let k = 0; k < 3; k++)
        World.flame(px - 12 + k * 12, gy - 40 - j(i + k, 8),
          18 + Math.abs(Math.sin(t * 5 + i + k)) * 14, 7, Math.sin(t * 3.7 + k) * 3,
          ['#7d1d2b', '#e06a1b', '#ffa832']);
      Gfx.glow(px, gy - 42, 120, '#e06a1b', 0.22 + Math.sin(t * 4 + i) * 0.05);
      for (let k = 0; k < 6; k++) {                                // smoke, leaning off
        const sy = gy - 62 - k * 46 - j(i + k, 14);
        const sx = px + Math.sin(t * 0.35 + k * 0.55 + i) * (6 + k * 7) + k * 10;
        Gfx.ctx.globalAlpha = 0.13 - k * 0.018;
        for (const [ox, oy, r] of [[-10, 0, 17], [11, -7, 14], [2, 8, 12]])
          Gfx.round(sx + ox - r - k * 2, sy + oy - r, (r + k * 4) * 2, (r + k * 3.4) * 2, r + k * 2, '#3b3048');
        Gfx.ctx.globalAlpha = 1;
      }
    }
    // the rampage: six species, all of them having a much better night than you
    for (let i = 0; i < 9; i++) {
      const spr = World.RAMPAGE[i % World.RAMPAGE.length];
      const lane = i % 3;                                          // three depths of chaos
      World.patrol(L, R, 2000, i * 222, (i % 2 ? 1 : -1) * (26 + i * 7), t, px => {
        const sc = [0.6, 0.85, 1.05][lane];
        const gy = [286, 306, 332][lane] + j(i, 8);
        Gfx.sprite(spr, px, gy, {
          anchor: 'bc', scale: sc, frame: Math.floor(t * 8 + i), flip: i % 2 === 0,
          tint: '#3f0e18', tintAmount: 0.86,
        });
        if (i % 3 === 0 && chance(0.04)) Particles.spawn(px, gy - 20,
          { n: 1, color: ['#e06a1b', '#ffa832'], speed: 40, gravity: -20, life: 1.6, size: 3, sizeEnd: 0 });
      });
    }
    Gfx.rectA(L, 236, R - L, 100, '#e06a1b', 0.10);                 // the glow off it all

    // ---- MIDDLE: the treeline going past, twice, at two speeds
    const band = (depth, gy, scale, step, seed, tint) => {
      const off = camX * depth;
      for (let x = Math.floor((L + off) / step) * step; x < R + off; x += step) {
        const i = Math.abs((x / step) | 0) + seed;
        Gfx.sprite(['prop_tree', 'prop_palm', 'prop_deadtree', 'prop_tree'][i % 4],
          x - off + j(i * 3.1, step * 0.5), gy + j(i + 4, 10),
          { anchor: 'bc', scale: scale * (0.85 + j(i + 1, 0.4)), tint, tintAmount: 1 });
      }
    };
    // a low bank for the far band to stand on, so nothing floats
    { const off = camX * 0.30;
      ctx.fillStyle = '#1d1230'; ctx.beginPath(); ctx.moveTo(L, GY);
      for (let x = L; x <= R; x += 20) ctx.lineTo(x, 352 + Math.sin((x + off) * 0.0052) * 13);
      ctx.lineTo(R, GY + 60); ctx.lineTo(L, GY + 60); ctx.fill(); }
    band(0.30, 356, 0.95, 96, 0, '#241c2e');
    band(0.62, GY - 4, 1.3, 146, 5, '#0b0a18');

    // ---- FRONT: the road
    Gfx.rect(L, GY - 6, R - L, 300, '#241109');
    Gfx.rect(L, GY - 6, R - L, 5, '#5c3a20');
    Gfx.rectA(L, GY - 1, R - L, 300, '#3f0e18', 0.24);
    for (let x = Math.floor(L / 17) * 17; x < R; x += 17) {
      const i = Math.abs((x / 17) | 0);
      const yy = GY + 6 + j(i, 88);
      Gfx.rectA(x + j(i + 1, 15), yy, 7 + j(i + 4, 10), 3, '#85562f', 0.55);
      Gfx.rectA(x + j(i + 1, 15), yy - 1, 5, 1, '#d8a86b', 0.35);
      if (i % 5 === 0) Gfx.rectA(x + j(i + 6, 15), yy + 7, 3, 2, '#e06a1b', 0.4);
    }
    for (let x = Math.floor(L / 210) * 210; x < R; x += 210) {
      const i = Math.abs((x / 210) | 0);
      Gfx.sprite(i % 3 ? 'prop_rock' : 'prop_bones', x + j(i, 70), GY + 4, { anchor: 'bc', scale: 0.85 });
    }
    World.verge(t, camX, L, R, ['#241109', '#3a2415', '#5c3a20'], '#120c16', 'prop_fern', 1.2);
    // embers, riding up the whole frame
    for (let i = 0; i < 3; i++) if (chance(0.55))
      Particles.spawn(camX + rnd(-40, VW + 40), GY - rnd(0, 240),
        { n: 1, color: ['#ffa832', '#e06a1b', '#ef6a5e'], speed: 16, gravity: -28, life: 3.2, size: 3, sizeEnd: 0 });
    // ash coming down through it, which is the village arriving in pieces
    for (let i = 0; i < 2; i++) if (chance(0.5))
      Particles.spawn(camX + rnd(-60, VW + 60), GY - 320,
        { n: 1, color: ['#574a66', '#3b3048', '#9391a6'], speed: 18, angle: Math.PI / 2, spread: 0.4,
          gravity: 12, life: 4.2, size: 2, sizeEnd: 2, drag: 0.999 });
    // and now and then a whole piece of roof, thrown from somewhere behind
    if (chance(0.014))
      Particles.spawn(camX + VW + 40, GY - rnd(140, 250),
        { n: 1, color: ['#5c3a20', '#3a2415', '#85562f'], speed: 0, vx: -330, vy: -70,
          gravity: 540, life: 2.6, size: 7, sizeEnd: 5, shape: 'square', bounceY: GY + 4 });
    // grit skidding along the road towards you
    if (chance(0.5))
      Particles.spawn(camX + VW + 20, GY + rnd(-4, 26),
        { n: 1, color: ['#85562f', '#3a2415'], speed: 0, vx: -rnd(240, 420), vy: -rnd(0, 60),
          gravity: 420, life: 1.4, size: 3, sizeEnd: 2, bounceY: GY + 26 });
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
    Gfx.rect(L, GY - 5, R - L, 1, '#07060f');                  // the ink line the ground sits under
    Gfx.rect(L, GY - 4, R - L, 3, '#281040');
    for (let x = Math.floor(L / 9) * 9; x < R; x += 9)          // grain, so the floor is not a flat fill
      Gfx.rectA(x, GY - 1 + j(x, 5), 5 + j(x + 3, 4), 1, '#07060f', 0.35);
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
    // one bed of fire, not five candles: seven tongues that overlap, tallest
    // in the middle, drawn edges-first so the hot middle sits on top
    for (const i of [0, 6, 1, 5, 2, 4, 3]) {
      const k = i / 6;
      const mid = 1 - Math.abs(k - 0.5) * 2;
      const h2 = (14 + mid * 32 + Math.abs(Math.sin(t * 6.3 + i * 1.9)) * (10 + mid * 14)) * lick;
      World.flame(FX2 + (k - 0.5) * 98, GY - 20, h2, 7 + mid * 9,
        Math.sin(t * 4.7 + i * 2.1) * 5, ['#e06a1b', '#ffa832', '#ffe98a', '#9c3510'], i * 3.7);
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
