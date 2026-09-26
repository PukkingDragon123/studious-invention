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
  wood: 650, fossil: 646, wallart: 762, table: 828, plaque: 920,   // the eating dome
  stove: 1006, door: 1150, lamps: [260, 782],
  shower: 1390, car: 1650, end: 1800,
};

// The mouth of the cave: the eating hollow runs out of the hill here, under
// an overhang, into the yard. A flat-topped arch, with a jamb of rock on the
// inside edge so the far wall does not just stop at the sky.
const MOUTH = { cx: HOME.door + 58, rx: 112, ry: 192, jamb: 20, end: HOME.door + 152 };

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

    // Inside the hill the rock covers nearly all of the sky, so the country
    // behind it is only painted where there is a hole to see it through:
    // either end of the hill, the crack over the bed, and the smoke holes.
    const ctx = Gfx.ctx, a0 = SHELL.x0 + 110, a1 = MOUTH.cx - MOUTH.rx - 30;
    const inside = R > a0 && L < a1;
    if (inside) {
      ctx.save(); ctx.beginPath();
      if (L < a0) ctx.rect(L, -600, a0 - L, 1400);
      if (R > a1) ctx.rect(a1, -600, R - a1, 1400);
      for (const hx of [HOME.bed + 44, DOMES[0].x, DOMES[1].x]) if (hx + 40 > L && hx - 40 < R) ctx.rect(hx - 40, -600, 80, 1400);
      ctx.clip();
    }
    World.sky(t, o, camX, L, R);
    World.yard(t, o, camX, L, R);
    if (inside) ctx.restore();

    // ---- the house itself, seen in cutaway
    if (L < HOME.door + 260) {
      World.houseShell();
      World.homeWall(t, o, camX);
      World.homeStuff(t, o, camX);
      World.homeLight(t, o);
    }

    // ---- the ground you are standing on, cut open
    World.soil(t, o, camX, L, R);

    // ---- the little wooden house at the bottom of the yard
    World.outhouse(HOME.shower, GY + 2, o);
    // and what went past it
    if (o.prints) for (let i = 0; i < 9; i++) {
      const px = HOME.door + 70 + i * 74, py = GY - 2 + (i % 2) * 5;
      Gfx.ctx.globalAlpha = 0.55;
      Gfx.round(px - 12, py - 3, 24, 7, 3, '#241109');
      for (let k = -1; k <= 1; k++) Gfx.round(px + 10 + k * 2, py - 5 + k * 5, 10, 4, 2, '#241109');
      Gfx.ctx.globalAlpha = 1;
    }
  },
  // A privy of split logs with a moon cut in the door. When it is in use it
  // is extremely in use.
  outhouse(x, y, o = {}) {
    const lo = o.loo || {}, t = Time.t, sh = lo.shake || 0;
    const dx = sh ? rnd(-2, 2) * sh : 0, rot = sh ? Math.sin(t * 38) * 0.035 * sh : 0;
    const hop = sh > 1 ? Math.abs(Math.sin(t * 17)) * 7 : 0;
    const q = sh ? Math.sin(t * 29) * 0.035 * sh : 0;
    Gfx.shadow(x, y, 76 - hop, 0.3);
    Gfx.sprite('h_outhouse', x + dx, y - hop, { anchor: 'bc', rot, frame: lo.open ? 1 : 0, sx: 1 + q, sy: 1 - q });
    // the flowers beside it have opinions
    Gfx.sprite('v_flowers', x + 44, y + 1, { anchor: 'bc', tint: lo.used || sh ? '#5c3a20' : null, tintAmount: 0.7 });
    if (sh) lo.used = true;
    if (sh > 0) {
      const ctx = Gfx.ctx;
      for (let i = 0; i < 4; i++) {                                 // the smell, going up in wiggles
        const u = ((t * 0.8 + i / 4) % 1), sx = x - 22 + i * 14;
        for (let k = 0; k < 8; k++) {
          const yy = y - 92 - u * 60 - k * 5, xx = sx + Math.sin(yy * 0.2 + i) * 4;
          ctx.globalAlpha = (1 - u) * 0.8;
          Gfx.rect(xx, yy, 2, 3, k % 2 ? '#6cc95c' : '#a8e878');
        }
      }
      ctx.globalAlpha = 1;
      for (let i = 0; i < 5; i++) {                                 // and the flies it brings
        const a = t * (5 + i) + i * 1.3, fx = x + Math.cos(a) * (26 + i * 5), fy = y - 70 + Math.sin(a * 1.3) * 18;
        Gfx.rect(fx, fy, 2, 2, '#120c16'); Gfx.rect(fx - 1, fy - 1, 1, 1, '#d6cfe0'); Gfx.rect(fx + 2, fy - 1, 1, 1, '#d6cfe0');
      }
      if (chance(0.1 * sh)) Particles.spawn(x + rnd(-10, 10), y - 84, { n: 1, color: ['#a8e878', '#6cc95c'], speed: 30, angle: -Math.PI / 2, spread: 0.8, gravity: -20, life: 1.2, size: 4, sizeEnd: 0 });
    }
  },
  // a shell lamp hung from its top, lit
  hangLamp(x, y, s = 1, t = Time.t) {
    Gfx.sprite('h_lamp', x, y, { anchor: 'tc', scale: s });
    World.flame(x, y + 11 * s, (8 + Math.sin(t * 11 + x) * 2) * s, 3 * s, Math.sin(t * 3 + x) * 1.5, World.FIRE, x);
  },
  // Bronk's car, in two halves so whoever is driving sits down inside it.
  // ------------------------------------------------- what is under the floor
  // The house sits on the fossil record. Topsoil with roots in it, a clay
  // band, then rock - and every few paces something long dead in the rock.
  soil(t, o, camX, L, R) {
    Vista.soil(L, R, GY + 4);
    const ROCK = GY + 48;
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
  // stays readable whatever time the script says it is. The country between
  // the yard and the sky is four baked bands from vista.js.
  sky(t, o, camX, L, R) {
    const night = !!o.night, mood = night ? 'night' : o.dusk ? 'dusk' : null;
    const bands = night ? ['#241c2e', '#4b2070', '#7c3eb2', '#a03a68', '#e06a1b', '#ffa832']
      : o.dusk ? ['#2a1430', '#5c1f3d', '#a03a68', '#e06a1b', '#ffa832', '#ffe08a']
        : ['#1d3d72', '#3570c0', '#3570c0', '#6aa9ee', '#a8d8ff', '#ffe08a'];
    World.skyRamp(L, R, -460, GY, bands);
    // the last of the stars, while it is still dark
    if (night) for (let i = 0; i < 60; i++) {
      const sx = camX * 0.98 + ((i * 97.3) % 820) - 170, sy = 176 + ((i * 53.7) % 96);
      const a = 0.35 + Math.sin(t * (1.5 + (i % 5) * 0.4) + i) * 0.3;
      if (a > 0.1) Gfx.rectA(sx, sy, i % 7 ? 1 : 2, i % 7 ? 1 : 2, '#fffaea', a);
    }
    // the sun, low: coming up behind the peaks at dawn, going down red at dusk
    const sx = 1350 + camX * 0.04, sy = night ? 262 : o.dusk ? 250 : 196;
    Gfx.glow(sx, sy, night ? 260 : 200, night ? '#ffa832' : o.dusk ? '#ff7a3a' : '#ffe98a', night ? 0.34 : 0.28);
    Gfx.circle(sx, sy, night ? 20 : 17, night ? '#ffd08a' : o.dusk ? '#ffa06a' : '#fff4c2');
    World.clouds(t, camX, L, R, night, 150);
    World.flock(t, camX, L, R, night, 168);
    for (const Lr of Vista.HOME_LAYERS) {
      Vista.draw(Lr, mood, camX, L, R);
      if (Lr.key === 'range') World.volcanoSmoke(t, camX, Lr, night);
      if (Lr.key === 'hills') World.farVillage(t, camX, mood, !!o.dusk);
    }
    // the air at the foot of it all
    { const hz = Gfx.ctx.createLinearGradient(0, 330, 0, 420);
      hz.addColorStop(0, 'rgba(168,216,255,0)');
      hz.addColorStop(1, night ? 'rgba(224,106,27,0.16)' : o.dusk ? 'rgba(255,122,58,0.18)' : 'rgba(168,216,255,0.22)');
      Gfx.ctx.fillStyle = hz; Gfx.ctx.fillRect(L, 330, R - L, 90); }
  },
  // the volcano in the east, never quite finished
  volcanoSmoke(t, camX, Lr, night) {
    const off = camX * Lr.depth;
    for (let k = Math.floor((camX - 800 - off) / 1024); k <= Math.floor((camX + 800 - off) / 1024); k++) {
      const vx = 186 + off + k * 1024, vy = Lr.y + 200 * 0.62 - 110 + 4;
      const ctx = Gfx.ctx;
      for (let i = 0; i < 8; i++) {
        const u = ((t * 0.04 + i / 8) % 1);
        const px = Math.round(vx + Math.sin(u * 5 + i) * 6 + u * 70), py = Math.round(vy - u * 120);
        const r = 5 + u * 20;
        ctx.globalAlpha = Math.sin(Math.min(1, u * 5) * Math.PI / 2) * (1 - u) * (night ? 0.32 : 0.5);
        ctx.fillStyle = night ? '#3b3048' : '#9a8f9c';
        ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.72, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = night ? '#4d4a5c' : '#c4bccb';
        ctx.beginPath(); ctx.ellipse(px - r * 0.3, py - r * 0.25, r * 0.55, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      Gfx.glow(vx, vy + 6, 34, '#ff7a3a', night ? 0.4 : 0.2);
    }
  },
  // the village across the valley: where everyone Bronk knows lives, for now
  farVillage(t, camX, mood, dusk) {
    const vx = 1700 + (camX - 1400) * 0.26;
    const huts = [[-96, 'v_hut'], [-54, 'v_hut'], [-10, 'v_hut_ruin'], [34, 'v_hut'], [84, 'v_hut'], [126, 'v_hut']];
    const tint = mood === 'night' ? { tint: '#241c4e', tintAmount: 0.6 } : dusk ? { tint: '#6a1f3a', tintAmount: 0.45 } : { tint: '#a8c8e0', tintAmount: 0.22 };
    for (const [dx, spr] of huts) {
      const x = vx + dx, y = Vista.top('hills', x, camX) + 4;
      Gfx.sprite(spr, x, y, Object.assign({ anchor: 'bc', scale: 0.26 }, tint));
      if (spr === 'v_hut') for (let i = 0; i < 3; i++) {                 // a thread of smoke from each
        const u = ((t * 0.08 + i / 3 + dx * 0.01) % 1);
        Gfx.rectA(x + Math.sin(u * 4 + dx) * 3 + u * 10, y - 34 - u * 34, 2, 2, '#e8eef9', (1 - u) * 0.55);
      }
    }
    const tx = vx + 58;
    Gfx.sprite('v_totem', tx, Vista.top('hills', tx, camX) + 4, Object.assign({ anchor: 'bc', scale: 0.3 }, tint));
  },

  // Fat cartoon clouds, built from lobes with a lit crown and a flat shaded
  // underside, drifting at three depths. Each one is baked into its own little
  // canvas and faded as a whole, so the lobes never show through each other.
  LOBES: [[0, 0, 62, 20], [40, -14, 48, 22], [-38, -6, 40, 17], [84, -2, 34, 15], [-72, 4, 26, 11]],
  _cloud: {},
  cloudSprite(d, night) {
    const key = d + (night ? 'n' : 'd');
    if (World._cloud[key]) return World._cloud[key];
    const s2 = 0.6 + d * 0.22;
    const c = document.createElement('canvas');
    c.width = Math.ceil(260 * s2); c.height = Math.ceil(96 * s2);
    const real = Gfx.ctx; Gfx.ctx = c.getContext('2d');
    const cx = c.width / 2 - 6 * s2, cy = c.height * 0.58;
    const L = World.LOBES;
    for (const [ox, oy, rx, ry] of L)                         // the shaded belly
      Gfx.round(cx + ox * s2 - rx * s2, cy + oy * s2 - ry * s2 + 5, rx * 2 * s2, ry * 2 * s2, ry * s2, night ? '#7c3eb2' : '#a8d8ff');
    for (const [ox, oy, rx, ry] of L)
      Gfx.round(cx + ox * s2 - rx * s2, cy + oy * s2 - ry * s2, rx * 2 * s2, ry * 2 * s2, ry * s2, '#ffffff');
    for (const [ox, oy, rx, ry] of L)                         // the lit crown
      Gfx.round(cx + ox * s2 - rx * s2 * 0.8, cy + oy * s2 - ry * s2, rx * 1.6 * s2, ry * 0.7 * s2, ry * 0.4 * s2, night ? '#ffe08a' : '#ffffff');
    Gfx.ctx = real;
    c.ox = cx; c.oy = cy;
    return (World._cloud[key] = c);
  },
  clouds(t, camX, L, R, night, top = -190) {
    for (let d = 0; d < 3; d++) {
      const depth = 0.03 + d * 0.035, span = 1100 + d * 260, n = 4;
      const spr = World.cloudSprite(d, night);
      for (let i = 0; i < n; i++) {
        const cx = ((i * span / n + d * 190 - camX * depth + t * (2 + d)) % span + span) % span + L - 220;
        const cy = top + d * 52 + (i % 3) * 22;
        Gfx.ctx.globalAlpha = night ? 0.24 + d * 0.05 : 0.55 + d * 0.14;
        Gfx.ctx.drawImage(spr, Math.round(cx - spr.ox), Math.round(cy - spr.oy));
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
  // The ground runs out of the cave mouth into a yard with a shower in it and
  // the car at the end, planted with the same things that grow in the valley.
  YARD: [
    ['v_bush_berry', -250, 1], ['v_fern', -214, 1], ['v_tree', -300, 0.9],
    ['v_palm', HOME.door + 196, 0.85], ['v_fern', HOME.door + 172, 1], ['v_flowers', HOME.door + 222, 1],
    ['v_bush', HOME.shower - 84, 1], ['v_rock', HOME.shower - 118, 0.8], ['v_flowers', HOME.shower + 62, 1],
    ['v_tree_fruit', HOME.shower + 196, 0.9], ['v_fern', HOME.shower + 236, 1], ['v_bush', HOME.car - 128, 1],
    ['v_flowers', HOME.car - 88, 1], ['v_stump', HOME.car + 96, 1], ['v_tree', HOME.car + 150, 1],
    ['v_bush_berry', HOME.car + 204, 1], ['v_fern', HOME.car + 250, 1], ['v_palm', HOME.car + 330, 0.9],
    ['v_rock', HOME.car + 390, 1], ['v_bush', HOME.car + 450, 1], ['v_tree_big', HOME.car + 520, 1],
  ],
  yard(t, o, camX, L, R) {
    Vista.ground(L, R, GY - 8);
    const tint = o.night ? { tint: '#241c4e', tintAmount: 0.35 } : {};
    for (const [spr, x, s] of World.YARD) {
      if (x < L - 80 || x > R + 80) continue;
      Gfx.shadow(x, GY + 2, 40 * s, 0.22);
      Gfx.sprite(spr, x, GY + 3, Object.assign({ anchor: 'bc', scale: s, frame: Math.floor(t * 1.2 + x) % 2 }, tint));
    }
  },
  // ------------------------------------------------------------- the domes
  // The height of the dome's inner face at world x, or null outside it.
  domeY(d, x) {
    const k = (x - d.x) / d.rx;
    if (k <= -1 || k >= 1) return null;
    return GY - d.ry * Math.sqrt(1 - k * k);
  },
  // A flat-topped arch standing on the floor: its top at x, or Infinity
  // outside it. p = 2 is an ellipse; higher is squarer.
  archY(cx, rx, ry, x, p = 2) {
    const k = Math.abs(x - cx) / rx;
    if (k >= 1) return Infinity;
    return GY - ry * Math.pow(1 - Math.pow(k, p), 1 / p);
  },
  // the underside of the overhang over the mouth
  mouthTop(x) {
    const t = World.archY(MOUTH.cx, MOUTH.rx, MOUTH.ry, x, 3);
    return t === Infinity ? t : t + Math.sin(x * 0.061) * 5 + Math.sin(x * 0.023 + 2) * 4;
  },
  // The rock, the hollows and the floor never change, so they are painted
  // once, a pixel at a time, by CaveBake (cave.js) and blitted from there.
  houseShell() {
    Gfx.ctx.drawImage(CaveBake.get(), SHELL.x0, SHELL.top);
  },
  // ------------------------------------------------------------- THE CAVE
  // The Rockbottoms live in a hill, not in a house. Everything above the floor
  // line is one mass of rock with two hollows eaten out of it - the one you
  // sleep in and the one you eat in - joined by a crawl the two of them have
  // worn smooth, and open at the east end onto the yard.

  // The crest of the hill the cave is cut into: thick rock everywhere, thicker
  // over each hollow, and never a straight line anywhere on it.
  hillY(x) {
    let h = 104;
    for (const d of DOMES) {
      const k = clamp(1 - Math.abs(x - d.x) / (d.rx * 1.7), 0, 1);
      h = Math.max(h, 104 + Ease.outCubic(k) * (d.ry - 26));
    }
    h += 70 + Math.sin(x * 0.0071) * 24 + Math.sin(x * 0.019 + 1.3) * 11 + Math.sin(x * 0.053) * 5;
    // it runs out into the ground at the west end, instead of stopping dead
    h *= Ease.inOutQuad(clamp((x - SHELL.x0) / 150, 0, 1));
    let y = GY - h;
    // and at the east end it thins into an overhang over the mouth
    if (x > HOME.door - 60) {
      const m = World.mouthTop(x);
      const lip = (m === Infinity ? GY : m) - (8 + 74 * (1 - Ease.inOutQuad(clamp((x - HOME.door - 30) / 120, 0, 1))));
      y = lerp(y, lip, Ease.inOutQuad(clamp((x - HOME.door + 60) / 120, 0, 1)));
    }
    return y;
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

  // ------------------------------------------------------ the wall dressing
  // The rock, the paintings and the crack over the bed are baked into the
  // hill. What is left is the stuff that hangs on it and the stuff that burns.
  FIRE: ['#e06a1b', '#ffa832', '#ffe98a', '#9c3510'],
  homeWall(t, o, camX) {
    // employee of the week, for the fortieth week running
    const px = HOME.plaque, py = 330;
    // (after the journey, somebody has quietly changed what it says)
    Gfx.sprite('h_plaque', px, py, { anchor: 'bc' });
    Gfx.text(o.gran ? 'GRAN' : 'HUNTER', px - 3, py - 74, { color: '#241c2e', align: 'center', font: 'small' });
    Gfx.text('OF THE YEAR', px - 3, py - 65, { color: '#241c2e', align: 'center', font: 'small' });
    if (o.gran) Gfx.sprite('grandma_idle', px - 5, py - 21, { anchor: 'bc', scale: 0.25 });
    else Gfx.sprite('trex_idle', px - 5, py - 21, { anchor: 'bc', scale: 0.32 });
    Gfx.text(o.gran ? 'REX' : 'BRONK', px - 5, py - 18, { color: '#7d1d2b', align: 'center', font: 'small' });
    // the lamps, hung off the roof on cords
    for (const lx of HOME.lamps) {
      const sw = Math.sin(t * 1.2 + lx * 0.01) * 2;
      const top = World.roofAt(lx) + 6, hang = Math.max(top + 30, 252);
      Gfx.line(lx, top, lx + sw, hang, '#241109', 2);
      Gfx.sprite('h_lamp', lx + sw, hang + 26, { anchor: 'bc' });
      World.flame(lx + sw, hang + 11, 9 + Math.sin(t * 11 + lx) * 2, 3, Math.sin(t * 3 + lx) * 1.5, World.FIRE, lx);
      if (chance(0.12)) Particles.fire(lx + sw, hang + 2, 1);
    }
    // the torches either side of the crawl
    for (const tx of [HOME.arch - 96, HOME.arch + 96]) {
      Gfx.sprite('h_torch', tx, 362, { anchor: 'bc' });
      for (const i of [0, 2, 1])
        World.flame(tx + (i - 1) * 3, 318, (i === 1 ? 24 : 15) + Math.abs(Math.sin(t * 6.4 + i + tx)) * 10,
          i === 1 ? 7 : 5, Math.sin(t * 4.4 + i * 2) * 3, World.FIRE, i * 2.1 + tx);
      if (chance(0.45)) Particles.fire(tx, 312, 1);
    }
    // what is kept in the niches: a pot, a skull, and a candle by the door
    Gfx.sprite('h_pot', HOME.shelf + 8, 337, { anchor: 'bc' });
    Gfx.sprite('h_skull', HOME.bed - 104, 319, { anchor: 'bc' });
    const cx = MOUTH.cx - MOUTH.rx - MOUTH.jamb - 20;
    Gfx.sprite('h_candle', cx, 333, { anchor: 'bc' });
    World.flame(cx, 315, 7 + Math.sin(t * 9) * 1.5, 2.4, Math.sin(t * 2.3) * 1.2, World.FIRE, 7);
  },

  // --------------------------------------------------------- the furniture
  // Tidy. Everything has a place and is in it, which is the only thing in this
  // house that is Vela's doing rather than Bronk's.
  drop(x, w, y = GY + 3, a = 0.34) { Gfx.shadow(x, y, w, a); },
  homeStuff(t, o, camX) {
    for (const [x, w] of [[HOME.bed, 150], [HOME.drum, 56], [HOME.perch, 54], [HOME.table, 150],
                          [HOME.table - 90, 34], [HOME.table + 90, 34], [HOME.stove, 140], [HOME.wood, 46]])
      World.drop(x, w);
    // ============ the sleeping hollow
    Gfx.sprite('h_rug', HOME.rug, GY + 3, { anchor: 'bc' });
    Gfx.sprite('h_bed', HOME.bed, GY + 2, { anchor: 'bc' });
    Gfx.sprite('h_drum', HOME.drum, GY + 2, { anchor: 'bc' });
    Gfx.sprite('h_club', HOME.drum + 29, GY + 1, { anchor: 'bc' });
    Gfx.sprite('h_perch', HOME.perch, GY + 2, { anchor: 'bc' });
    // ============ the eating hollow
    Gfx.sprite('h_woodpile', HOME.wood, GY + 2, { anchor: 'bc' });
    Gfx.sprite('h_stool', HOME.table - 90, GY + 2, { anchor: 'bc' });
    Gfx.sprite('h_stool2', HOME.table + 90, GY + 2, { anchor: 'bc', flip: true });
    Gfx.sprite('h_table', HOME.table, GY + 2, { anchor: 'bc' });
    for (let i = 0; i < 4; i++) {                                 // four places laid
      if (i === 1) continue;                                      // where the pot goes
      const sx = HOME.table - 50 + i * 34;
      Gfx.round(sx - 10, GY - 52, 20, 4, 2, '#8a7f68');
      Gfx.round(sx - 9, GY - 53, 18, 3, 1, '#e8dfc6');
      Gfx.rect(sx + 11, GY - 57, 1, 6, '#fffaea');
    }
    Gfx.sprite('h_pot', HOME.table - 16, GY - 48, { anchor: 'bc' });
    // the raptor's pit: charcoal, and whatever state the fire is in
    Gfx.sprite('h_hearth', HOME.stove, GY + 2, { anchor: 'bc' });
    const f = o.fire || 0;
    for (let k = 0; k < 7; k++) {
      const fx = HOME.stove - 48 + k * 16;
      if (f > 0) World.flame(fx, GY - 16, (12 + Math.abs(Math.sin(t * 5 + k * 1.7)) * 16) * (0.35 + f * 0.65), 6 + (k % 2),
        Math.sin(t * 3.1 + k) * 3, World.FIRE, k * 3.1);
      else if (Math.sin(t * 2 + k * 2.3) > 0.2) Gfx.rectA(fx - 2, GY - 18, 4, 2, '#e06a1b', 0.5 + Math.sin(t * 3 + k) * 0.2);
    }
    if (f > 0) for (let i = 0; i < 3; i++) if (chance(f * 0.8)) Particles.fire(HOME.stove + rnd(-44, 44), GY - 24, 1);
    // his chain, from the stake into the pit - until the evening he slips it
    const sx = HOME.stove - 58, sy = GY - 34;
    const ex = o.dusk ? sx + 16 : HOME.stove - 12, ey = o.dusk ? GY - 22 : GY - 14;
    for (let i = 0; i <= 9; i++) {
      const u = i / 9, x = sx + (ex - sx) * u, y = sy + (ey - sy) * u + Math.sin(u * Math.PI) * 7;
      Gfx.round(x - 2, y - 1.5, 4, 3, 1, i % 2 ? '#6e6b80' : '#9391a6');
    }
    // ferns on the threshold, in the light
    for (let i = 0; i < 4; i++) Gfx.sprite('v_fern', MOUTH.cx - 34 + i * 30, GY + 4, { anchor: 'bc', scale: 0.9 + (i % 2) * 0.2, flip: i % 2 === 1 });
  },
  // drawn after the people, so the raptor stands in his pit and not on it
  homeFront(t, o, camX) {
    Gfx.sprite('h_hearth_front', HOME.stove, GY + 2, { anchor: 'bc' });
    const f = o.fire || 0;
    if (f > 0.5) for (let k = 0; k < 4; k++)
      World.flame(HOME.stove - 36 + k * 24, GY - 22, (6 + Math.abs(Math.sin(t * 6 + k)) * 8) * f, 4, Math.sin(t * 3 + k) * 2, World.FIRE, k * 5.3 + 1);
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
        const spr = ['v_tree', 'v_palm', 'v_pine', 'v_deadtree'][i % 4];
        Gfx.sprite(spr, x - off + j(i * 3.1, step * 0.55), base + j(i + 5, 12),
          { anchor: 'bc', scale: scale * 0.78 * (0.82 + j(i + 2, 0.5)), tint: col, tintAmount: 1 });
      }
    };
    wall(0.40, GY - 52, '#241c2e', 1.5, 112, 0);
    wall(0.26, GY - 26, '#1d1230', 1.9, 142, 7);
    wall(0.13, GY - 4, '#07060f', 2.4, 176, 13);
    // undergrowth packed in at their feet, so the wall has no gaps under it
    for (let x = Math.floor((L + camX * 0.13) / 46) * 46; x < R + camX * 0.13; x += 46) {
      const i = Math.abs((x / 46) | 0);
      Gfx.sprite(i % 3 ? 'v_bush' : 'v_fern', x - camX * 0.13 + j(i, 30), GY + 2,
        { anchor: 'bc', scale: (1.1 + j(i + 4, 0.7)) * (i % 3 ? 0.85 : 1), tint: '#07060f', tintAmount: 1 });
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
      if (i % 11 === 0) Gfx.sprite('v_bones', x + j(i + 2, 18), GY + 26 + j(i + 8, 40),
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
const Scroll = (name, opt = {}) => {
  const f = (camX, t) => World[name](t, opt, camX);
  f.set = name; f.opt = opt;                 // so a stage knows how to light it
  if (World[name + 'Front']) f.front = (camX, t) => World[name + 'Front'](t, opt, camX);
  return f;
};
