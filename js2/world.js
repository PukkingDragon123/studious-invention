// ---------------------------------------------------------------------------
// world.js - the painted stages of the opening, in world coordinates.
//
// Every stage is one long horizontal strip. The same painter serves both the
// cutscene camera (which applies its own transform) and the side-scrolling
// mini-games (which translate by -camX), so walking out of the bedroom, past
// the stove, through the door and up to the car is one unbroken place.
// ---------------------------------------------------------------------------
'use strict';

const GY = 428;                      // the floor / ground line, everywhere

// A small house, deliberately over-furnished: you should never be able to look
// at a stretch of wall or floor without something of theirs in the way.
const HOME = {
  bed: 96, perch: 176, rug: 244, shelf: 302, fossil: 358, plaque: 424,
  table: 488, stove: 578, clutter: 636, door: 688,
  shower: 850, nest: 990, car: 1140, end: 1250,
};

// small deterministic wobble so scattered junk does not jitter between frames
const jitter = (i, m = 1) => ((Math.sin(i * 12.9898) * 43758.5453) % 1) * m;

const World = {
  // ------------------------------------------------------------------- HOME
  // x 0..1400 is the one-floor house; past the door it is the yard, the
  // mammoth shower, the dodo nest and the car.
  home(t, o = {}, camX = 0) {
    const L = camX - 200, R = camX + W + 200;
    const night = !!o.night, lamp = night ? 0.5 : 1;

    // ---- the open air beyond the door, drawn first and always
    const sky = night ? ['#0b0a18', '#161233', '#2a1b4a', '#4b2070', '#7c3eb2']
      : o.dusk ? ['#2a1430', '#5c1f3d', '#a03a68', '#e06a1b', '#ffa832']
        : ['#1d3d72', '#3570c0', '#6aa9ee', '#a8d8ff', '#ffe08a'];
    Gfx.bands(L, -400, R - L, 700, sky);
    if (night) { Gfx.circle(HOME.shower + 260 - camX * 0.06, -110, 26, '#d6cfe0'); Gfx.glow(HOME.shower + 260 - camX * 0.06, -110, 150, '#a8d8ff', 0.18); }
    else { const sx = 300 - camX * 0.05; Gfx.circle(sx, -60, 30, '#ffe98a'); Gfx.glow(sx, -60, 180, '#ffe98a', 0.28); }
    // far ridges, parallaxed
    const ridge = (depth, col, base, amp) => {
      const ctx = Gfx.ctx, off = camX * depth;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(L, GY);
      for (let x = L; x <= R; x += 36) ctx.lineTo(x, base + Math.sin((x + off) * 0.0035) * amp + Math.sin((x + off) * 0.011) * amp * 0.4);
      ctx.lineTo(R, GY + 200); ctx.lineTo(L, GY + 200); ctx.fill();
    };
    ridge(0.55, night ? '#161233' : '#4d4a5c', 250, 46);
    ridge(0.35, night ? '#241c2e' : '#3b3048', 300, 30);
    // the village across the valley - visible the whole time you are outdoors
    for (let i = 0; i < 9; i++) {
      const hx = 1500 + i * 150 - camX * 0.22 + camX * 0;
      if (hx < L - 120 || hx > R + 120) continue;
      Gfx.sprite(i % 3 === 1 ? 'prop_hut_ruin' : 'prop_hut', hx, 344 + (i % 2) * 8, { anchor: 'bc', scale: 0.62, alpha: night ? 0.55 : 0.78 });
    }
    Gfx.sprite('prop_totem', 1720 - camX * 0.22, 342, { anchor: 'bc', scale: 0.7, alpha: night ? 0.5 : 0.8 });
    { const hz = Gfx.ctx.createLinearGradient(0, 236, 0, 366);
      hz.addColorStop(0, night ? 'rgba(22,18,51,0)' : 'rgba(168,216,255,0)');
      hz.addColorStop(0.55, night ? 'rgba(22,18,51,0.40)' : 'rgba(168,216,255,0.34)');
      hz.addColorStop(1, night ? 'rgba(22,18,51,0)' : 'rgba(168,216,255,0)');
      Gfx.ctx.fillStyle = hz; Gfx.ctx.fillRect(L, 236, R - L, 130); }
    ridge(0.16, night ? '#14331e' : '#27632f', 356, 16);
    // ---- the ground outside
    Gfx.rect(HOME.door - 40, GY - 6, R - (HOME.door - 40) + 200, 300, night ? '#241109' : '#5c3a20');
    Gfx.rect(HOME.door - 40, GY - 6, R - (HOME.door - 40) + 200, 5, night ? '#3a2415' : '#85562f');
    for (let x = Math.floor(L / 78) * 78; x < R; x += 78) {
      if (x < HOME.door) continue;
      Gfx.sprite(((x / 78) | 0) % 3 === 0 ? 'prop_bush' : 'prop_fern', x + jitter(x, 20), GY + 6, { anchor: 'bc', alpha: 0.9 });
    }
    Gfx.sprite('prop_palm', HOME.door + 120, GY + 4, { anchor: 'bc' });
    Gfx.sprite('prop_tree', HOME.shower + 300, GY + 6, { anchor: 'bc', alpha: 0.9 });
    Gfx.sprite('prop_rock', HOME.shower - 150, GY + 4, { anchor: 'bc' });
    for (let x = Math.floor(L / 46) * 46; x < R; x += 46) {
      if (x < HOME.door) continue;
      Gfx.rectA(x + jitter(x, 30), GY + 26 + jitter(x + 3, 56), 3 + jitter(x + 7, 4), 2, '#3a2415', 0.55);
      if (((x / 46) | 0) % 3 === 0) Gfx.rectA(x + jitter(x + 1, 30), GY + 40 + jitter(x + 9, 40), 6, 3, '#85562f', 0.4);
    }

    // ---- the house shell: one floor, stone wall, beaten-earth ground
    if (L < HOME.door + 80) {
      const x0 = Math.min(L, -240), x1 = HOME.door + 60;
      Gfx.rect(x0, -320, x1 - x0, GY + 320, '#241c2e');
      // plain stone in running bond for the wall itself; house_wall is the
      // hanging-meat accent and is hung sparingly, the way it was drawn to be
      for (let y = -200, row = 0; y < GY - 6; y += 32, row++) {
        const off = (row % 2) * 16;
        for (let x = Math.floor((x0 - off) / 32) * 32 + off; x < x1; x += 32)
          Gfx.sprite('house_floor', x, y, { anchor: 'tl', flip: ((x * 5 + row * 11) & 3) < 2, tint: '#3b3048', tintAmount: 0.5 });
      }
      for (let x = Math.floor(x0 / 224) * 224; x < x1; x += 224) {
        if (x < 60) continue;
        Gfx.sprite('house_wall', x + jitter(x, 40), 196 + jitter(x + 9, 60), { anchor: 'tl' });
      }
      Gfx.rectA(x0, -320, x1 - x0, GY + 314, '#120c16', night ? 0.50 : 0.30);
      for (let y = GY - 6, row = 0; y < GY + 240; y += 32, row++) {
        const off = (row % 2) * 16;
        for (let x = Math.floor((x0 - off) / 32) * 32 + off; x < x1; x += 32)
          Gfx.sprite('house_floor', x, y, { anchor: 'tl', flip: ((x * 5 + row * 11) & 3) < 2 });
      }
      Gfx.rectA(x0, GY - 6, x1 - x0, 240, '#5c3a20', 0.52);
      const g = Gfx.ctx.createLinearGradient(0, GY - 6, 0, GY + 200);
      g.addColorStop(0, 'rgba(6,3,10,0.66)'); g.addColorStop(0.35, 'rgba(6,3,10,0.12)'); g.addColorStop(1, 'rgba(6,3,10,0.5)');
      Gfx.ctx.fillStyle = g; Gfx.ctx.fillRect(x0, GY - 6, x1 - x0, 210);
      Gfx.rect(x0, GY - 16, x1 - x0, 10, '#120c16');
      Gfx.rectA(x0, GY - 20, x1 - x0, 4, '#b07a45', 0.5);
      World.homeWall(t, o, camX, x0, x1);
      World.homeStuff(t, o, camX);
      World.homeRoof(t, o, camX, x0, x1);
      // the doorway: a bright arch punched through the end wall
      const dx = HOME.door;
      Gfx.rect(dx - 34, -60, 74, GY - 54, '#120c16');
      Gfx.round(dx - 30, -50, 66, GY - 42, 30, night ? '#161233' : '#6aa9ee');
      Gfx.round(dx - 30, -50, 66, GY - 42, 30, 'rgba(255,255,255,0.0)');
      Gfx.rectA(dx - 30, GY - 130, 66, 124, night ? '#2a1b4a' : '#a8d8ff', 0.9);
      Gfx.rectA(dx - 30, GY - 40, 66, 34, '#5c3a20', 1);
      for (let i = 0; i < 3; i++) Gfx.sprite('prop_fern', dx + 4 + i * 14, GY - 6, { anchor: 'bc', scale: 0.6, alpha: 0.8 });
      // light spilling in across the floor
      if (!night) Gfx.glow(dx - 96, GY - 20, 180, '#ffe98a', 0.2);
      Gfx.rect(dx + 34, -320, 26, GY + 320, '#241c2e');
      Gfx.rectA(dx + 34, -320, 26, GY + 320, '#120c16', 0.5);
    }

    // ---- outdoor fixtures
    Gfx.sprite('shower_frame', HOME.shower, GY + 2, { anchor: 'bc' });
    if (o.showerOn) for (let i = 0; i < 2; i++) Particles.splash(HOME.shower + rnd(-20, 20), GY - 120, 1);
    // the nest, up on its own rock
    Gfx.round(HOME.nest - 46, GY - 40, 92, 46, 14, '#4d4a5c');
    Gfx.round(HOME.nest - 42, GY - 44, 84, 40, 12, '#6e6b80');
    for (let i = 0; i < 18; i++) {
      const a = Math.PI + (i / 17) * Math.PI;              // rim of the bowl, left to right
      const bx = HOME.nest + Math.cos(a) * 44, by = GY - 42 + Math.sin(a) * 6;
      Gfx.line(bx, by, bx - Math.cos(a) * 9, by - 20 - jitter(i, 8), '#3a2415', 4);
      Gfx.line(bx, by, bx - Math.cos(a) * 9, by - 20 - jitter(i, 8), '#85562f', 2);
    }
    if (!o.eggGone) Gfx.sprite('prop_egg', HOME.nest, GY - 56, { anchor: 'bc', scale: 0.9 });
    // the car, parked and patient
    if (!o.carGone) {
      Gfx.shadow(HOME.car, GY + 2, 120, 0.3);
      Gfx.sprite('car', HOME.car, GY + 2, { anchor: 'bc', frame: 0 });
    }
  },
  // the wall dressing: fossils, cave paintings, the plaque, a window
  homeWall(t, o, camX, x0, x1) {
    const ctx = Gfx.ctx;
    // window over the bed
    const wx = HOME.bed + 62, wy = 236;
    Gfx.round(wx - 46, wy, 92, 78, 10, '#120c16');
    Gfx.round(wx - 41, wy + 5, 82, 68, 8, o.night ? '#161233' : '#6aa9ee');
    if (!o.night) { Gfx.rectA(wx - 41, wy + 38, 82, 35, '#a8d8ff', 0.8); Gfx.glow(wx + 20, wy + 96, 150, '#ffe98a', 0.16); }
    Gfx.rect(wx - 3, wy, 6, 78, '#3a2415'); Gfx.rect(wx - 46, wy + 36, 92, 6, '#3a2415');
    // a big ammonite fossil set into the stone
    const fx = HOME.fossil, fy = 296;
    Gfx.circle(fx, fy, 46, '#2e2b38');
    for (let i = 0; i < 160; i++) {
      const a = i * 0.16, r = 5 + i * 0.25;
      if (r > 42) break;
      Gfx.circle(fx + Math.cos(a) * r, fy + Math.sin(a) * r, 3.4, i % 12 < 6 ? '#c4b89a' : '#8a7f68');
    }
    Gfx.circle(fx, fy, 6, '#e8dfc6');
    Gfx.ring(fx, fy, 47, 'rgba(18,12,22,0.9)', 3);
    // a rib fossil next to it
    for (let i = 0; i < 5; i++) {
      const rx = fx + 74 + i * 17;
      ctx.strokeStyle = '#8a7f68'; ctx.lineWidth = 5; ctx.beginPath();
      ctx.arc(rx, 330, 34, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      ctx.strokeStyle = '#c4b89a'; ctx.lineWidth = 2; ctx.stroke();
    }
    // EMPLOYEE OF THE WEEK, hung with obvious pride
    const px = HOME.plaque;
    Gfx.round(px - 62, 248, 124, 96, 6, '#120c16');
    Gfx.round(px - 58, 252, 116, 88, 5, '#6e6b80');
    Gfx.round(px - 53, 257, 106, 78, 4, '#9391a6');
    Gfx.text('EMPLOYEE', px, 264, { color: '#241c2e', align: 'center', scale: 1, font: 'small' });
    Gfx.text('OF THE WEEK', px, 274, { color: '#241c2e', align: 'center', scale: 1, font: 'small' });
    Gfx.sprite('bronk_idle', px, 326, { anchor: 'bc', scale: 0.62 });
    Gfx.text('BRONK', px, 328, { color: '#241c2e', align: 'center', scale: 1, font: 'small' });
    Gfx.rectA(px - 53, 257, 106, 20, '#ffffff', 0.10);
    // cave paintings: the family, some cattle, one very large disappointment
    const cx = HOME.rug + 30;
    const paint = (x, y, s, col) => { Gfx.ctx.globalAlpha = 0.5; Gfx.circle(x, y, 4 * s, col); Gfx.rect(x - 1.5 * s, y, 3 * s, 12 * s, col); Gfx.line(x - 6 * s, y + 14 * s, x + 6 * s, y + 14 * s, col, 2); Gfx.line(x - 5 * s, y + 3 * s, x + 5 * s, y + 3 * s, col, 2); Gfx.ctx.globalAlpha = 1; };
    paint(cx, 286, 1, '#a03a68'); paint(cx + 28, 292, 0.8, '#a03a68'); paint(cx + 50, 296, 0.6, '#a03a68'); paint(cx + 68, 296, 0.6, '#a03a68');
    Gfx.ctx.globalAlpha = 0.42;
    Gfx.round(cx + 104, 278, 54, 26, 10, '#5c1607');
    Gfx.rect(cx + 108, 302, 5, 12, '#5c1607'); Gfx.rect(cx + 148, 302, 5, 12, '#5c1607');
    Gfx.ctx.globalAlpha = 1;
    // a torch, because the one window does not reach the kitchen
    const tx = HOME.table - 130;
    Gfx.rect(tx - 3, 278, 6, 44, '#5c3a20');
    if (chance(0.5)) Particles.fire(tx, 276, 1);
    Gfx.glow(tx, 272, 130, '#ff9a20', 0.18 + Math.sin(t * 7) * 0.03);
  },
  // a low thatched roof on log beams - a one-floor hut has no room above you
  homeRoof(t, o, camX, x0, x1) {
    const CY = 168;                                   // underside of the beams
    Gfx.rect(x0, -320, x1 - x0, CY + 320, '#120c16');
    // thatch, laid in overlapping courses
    for (let y = -40, row = 0; y < CY; y += 22, row++) {
      for (let x = Math.floor(x0 / 30) * 30; x < x1; x += 30) {
        const w = 30, h = 26;
        Gfx.rectA(x, y, w, h, row % 2 ? '#3a2415' : '#4a2512', 1);
        Gfx.rectA(x + 2, y + 2, w - 5, 3, '#85562f', 0.35);
        for (let i = 0; i < 4; i++) Gfx.rectA(x + 3 + i * 7 + jitter(x + i, 4), y + 6, 2, 14, '#241109', 0.5);
      }
    }
    Gfx.rectA(x0, -320, x1 - x0, CY + 320, '#120c16', 0.45);
    // the beams
    Gfx.rect(x0, CY, x1 - x0, 16, '#241109');
    Gfx.rect(x0, CY, x1 - x0, 5, '#5c3a20');
    Gfx.rect(x0, CY + 13, x1 - x0, 3, '#0f0a12');
    for (let x = Math.floor(x0 / 132) * 132; x < x1; x += 132) {      // rafter ends
      Gfx.round(x, CY - 12, 18, 14, 4, '#3a2415');
      Gfx.round(x + 2, CY - 10, 13, 5, 3, '#85562f');
    }
    // everything hanging off them
    for (let x = Math.floor(x0 / 96) * 96; x < x1; x += 96) {
      if (x < 40) continue;
      const k = ((x / 96) | 0) % 4, hx = x + jitter(x, 28), sw = Math.sin(t * 1.1 + x) * 1.5;
      Gfx.line(hx, CY + 14, hx + sw, CY + 30, '#5c3a20', 2);
      if (k === 0) Gfx.sprite('house_wall', hx + sw - 16, CY + 28, { anchor: 'tl' });
      else if (k === 1) { for (let i = 0; i < 5; i++) { const a = -1.9 + i * 0.4; Gfx.line(hx + sw, CY + 30, hx + sw + Math.cos(a) * 13, CY + 30 - Math.sin(a) * 13 + 20, '#27632f', 3); } Gfx.round(hx + sw - 5, CY + 27, 10, 7, 3, '#5c3a20'); }
      else if (k === 2) Gfx.sprite('prop_pot', hx + sw, CY + 60, { anchor: 'bc', scale: 0.7 });
      else { Gfx.sprite('prop_bones', hx + sw, CY + 44, { anchor: 'bc', scale: 0.3 }); Gfx.sprite('prop_bones', hx + sw + 12, CY + 52, { anchor: 'bc', scale: 0.22 }); }
    }
    // the light that gets past the thatch
    Gfx.rectA(x0, CY + 16, x1 - x0, 26, '#120c16', 0.35);
  },
  // the furniture and the mess
  homeStuff(t, o, camX) {
    // bed, slept in
    Gfx.sprite('house_bed', HOME.bed, GY + 4, { anchor: 'bc' });
    Gfx.sprite('prop_pot', HOME.bed - 54, GY + 4, { anchor: 'bc', scale: 0.62 });
    // the dodo's perch: a worn rock stump by the bed
    Gfx.round(HOME.perch - 26, GY - 44, 52, 46, 9, '#2e2b38');
    Gfx.round(HOME.perch - 23, GY - 42, 44, 42, 8, '#4d4a5c');
    Gfx.round(HOME.perch - 23, GY - 42, 17, 40, 8, '#6e6b80');
    Gfx.round(HOME.perch - 30, GY - 52, 60, 18, 8, '#2e2b38');
    Gfx.round(HOME.perch - 27, GY - 50, 54, 13, 6, '#9391a6');
    Gfx.round(HOME.perch - 27, GY - 50, 24, 11, 6, '#bdbccd');
    for (let i = 0; i < 4; i++) Gfx.rectA(HOME.perch - 14 + i * 9, GY - 32 + (i % 2) * 12, 3, 9, '#2e2b38', 0.55);
    // a fur rug with a shaggy fringe
    Gfx.round(HOME.rug - 62, GY - 14, 136, 22, 11, '#3a2415');
    Gfx.round(HOME.rug - 57, GY - 12, 126, 17, 8, '#85562f');
    Gfx.round(HOME.rug - 52, GY - 11, 92, 9, 4, '#b07a45');
    for (let i = 0; i < 20; i++) {
      const rx = HOME.rug - 62 + i * 6.8;
      Gfx.rect(rx, GY + 8, 3, 3 + jitter(i, 4), '#3a2415');
      Gfx.rect(rx + 2, GY - 17, 3, 3 + jitter(i + 5, 3), '#5c3a20');
    }
    // the mess: bones, shells and dropped tools, thick on the ground
    for (let i = 0; i < 22; i++) {
      const x = 80 + i * 38 + jitter(i * 3, 18);
      if (x > HOME.door - 34) continue;
      const k = (i * 7) % 5;
      if (k === 0) Gfx.sprite('prop_bones', x, GY + 2, { anchor: 'bc', scale: 0.34, alpha: 0.95 });
      else if (k === 1) Gfx.sprite('prop_bones', x, GY + 4, { anchor: 'bc', scale: 0.24, alpha: 0.9 });
      else if (k === 2) Gfx.sprite('prop_egg', x, GY + 3, { anchor: 'bc', scale: 0.4, alpha: 0.9 });
      else if (k === 3) { Gfx.round(x - 5, GY - 4, 11, 6, 3, '#5c3a20'); Gfx.round(x - 4, GY - 5, 8, 4, 2, '#85562f'); }
      else { Gfx.circle(x, GY - 2, 3, '#c4b89a'); Gfx.circle(x - 1, GY - 3, 1.6, '#fffaea'); }
    }
    // shelf, and everything that will not fit on it
    Gfx.sprite('house_shelf', HOME.shelf, GY - 128, { anchor: 'bc' });
    Gfx.sprite('prop_pot', HOME.shelf - 40, GY + 2, { anchor: 'bc', scale: 0.8 });
    Gfx.sprite('prop_barrel', HOME.shelf + 44, GY + 4, { anchor: 'bc' });
    Gfx.sprite('prop_pot', HOME.shelf + 20, GY + 4, { anchor: 'bc', scale: 0.55 });
    Gfx.sprite('prop_skull', HOME.plaque + 96, GY - 132, { anchor: 'bc', scale: 0.8, alpha: 0.95 });
    Gfx.sprite('prop_mushroom', HOME.plaque - 30, GY + 4, { anchor: 'bc', scale: 0.5, alpha: 0.9 });
    // the table, mid-meal and never cleared
    Gfx.sprite('house_table', HOME.table, GY + 6, { anchor: 'bc' });
    Gfx.sprite('prop_pot', HOME.table + 48, GY + 4, { anchor: 'bc', scale: 0.7 });
    Gfx.sprite('prop_pot', HOME.table - 50, GY + 3, { anchor: 'bc', scale: 0.5 });
    for (let i = 0; i < 4; i++) Gfx.sprite('prop_bones', HOME.table - 22 + i * 15, GY - 34, { anchor: 'bc', scale: 0.2 });
    // the club, leaning where it was dropped, and the rest of the pile
    Gfx.sprite('art_club', HOME.clutter, GY - 24, { anchor: 'bc', scale: 1.5, rot: -0.5 });
    Gfx.sprite('art_club', HOME.clutter + 18, GY - 18, { anchor: 'bc', scale: 1.1, rot: 0.7 });
    Gfx.sprite('prop_barrel', HOME.clutter + 44, GY + 4, { anchor: 'bc', scale: 0.9 });
    Gfx.sprite('prop_barrel', HOME.clutter + 62, GY + 2, { anchor: 'bc', scale: 0.7 });
    Gfx.sprite('prop_pot', HOME.clutter - 26, GY + 4, { anchor: 'bc', scale: 0.6 });
    // the stove pit, with its resident
    Gfx.sprite('stove_pit', HOME.stove, GY - 12, { anchor: 'bc' });
    Gfx.sprite('prop_pot', HOME.stove - 52, GY + 4, { anchor: 'bc', scale: 0.7 });
    Gfx.sprite('prop_barrel', HOME.stove + 54, GY + 4, { anchor: 'bc', scale: 0.8 });
    if (o.fire > 0) {
      for (let i = 0; i < 3; i++) if (chance(o.fire)) Particles.fire(HOME.stove + rnd(-26, 26), GY - 34, 1);
      Gfx.glow(HOME.stove, GY - 60, 240, '#ff9a20', 0.22 * o.fire * (0.85 + Math.sin(t * 9) * 0.15));
    }
  },

  // ------------------------------------------------------------------- ROAD
  // The chill commute. Nothing to dodge, just a long warm morning.
  road(t, o = {}, camX = 0) {
    const L = camX - 200, R = camX + W + 200;
    Gfx.bands(L, -400, R - L, 760, ['#1d3d72', '#3570c0', '#6aa9ee', '#a8d8ff', '#ffe08a', '#ffb0cf']);
    const sx = camX * 0.02 + 760; Gfx.circle(sx, 70, 34, '#ffe98a'); Gfx.glow(sx, 70, 230, '#ffe98a', 0.26);
    for (let i = 0; i < 14; i++) {
      const cx = ((i * 380 - camX * 0.08) % 2600 + 2600) % 2600 + L - 200;
      Gfx.ctx.globalAlpha = 0.5;
      Gfx.round(cx, 70 + (i % 3) * 34, 120, 30, 15, '#ffffff');
      Gfx.round(cx + 40, 56 + (i % 3) * 34, 90, 34, 17, '#ffffff');
      Gfx.ctx.globalAlpha = 1;
    }
    const ridge = (depth, col, base, amp) => {
      const ctx = Gfx.ctx, off = camX * depth;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(L, GY);
      for (let x = L; x <= R; x += 34) ctx.lineTo(x, base + Math.sin((x + off) * 0.0031) * amp + Math.sin((x + off) * 0.009) * amp * 0.35);
      ctx.lineTo(R, GY + 200); ctx.lineTo(L, GY + 200); ctx.fill();
    };
    ridge(0.6, '#7c3eb2', 236, 52); ridge(0.42, '#4b2070', 282, 34); ridge(0.22, '#27632f', 340, 20);
    // distant herd, plodding the other way
    for (let i = 0; i < 4; i++) {
      const hx = ((i * 700 - camX * 0.3 + t * 12) % 2800 + 2800) % 2800 + L - 300;
      Gfx.sprite('mammoth_walk', hx, 356, { anchor: 'bc', scale: 0.5, alpha: 0.55, frame: Math.floor(t * 4 + i) % 4 });
    }
    Gfx.rect(L, GY - 6, R - L, 300, '#85562f');
    Gfx.rect(L, GY - 6, R - L, 6, '#b07a45');
    Gfx.rectA(L, GY + 26, R - L, 10, '#5c3a20', 0.6);
    for (let x = Math.floor(L / 120) * 120; x < R; x += 120) Gfx.rectA(x, GY + 54, 64, 5, '#d8a86b', 0.5);
    for (let x = Math.floor(L / 260) * 260; x < R; x += 260) {
      Gfx.sprite(((x / 260) | 0) % 2 ? 'prop_palm' : 'prop_deadtree', x + jitter(x, 40), GY - 2, { anchor: 'bc', alpha: 0.92 });
      Gfx.sprite('prop_bush', x + 140, GY + 4, { anchor: 'bc', alpha: 0.9 });
    }
    for (let x = Math.floor(L / 640) * 640; x < R; x += 640) Gfx.sprite('prop_bones', x + 300, GY + 6, { anchor: 'bc', scale: 0.8, alpha: 0.9 });
  },

  // ----------------------------------------------------------------- QUARRY
  quarry(t, o = {}, camX = 0) {
    const L = camX - 200, R = camX + W + 200;
    Gfx.bands(L, -400, R - L, 760, ['#3f0e18', '#7d1d2b', '#a03a68', '#e06a1b', '#ffa832']);
    const ctx = Gfx.ctx;
    // terraced pit walls stepping down
    for (let s = 0; s < 4; s++) {
      const y = 190 + s * 46;
      ctx.fillStyle = ['#2e2b38', '#4d4a5c', '#6e6b80', '#9391a6'][s];
      ctx.beginPath(); ctx.moveTo(L, y);
      for (let x = L; x <= R; x += 30) ctx.lineTo(x, y + Math.sin((x + s * 300) * 0.009) * 7 + Math.sin(x * 0.03) * 3);
      ctx.lineTo(R, GY + 200); ctx.lineTo(L, GY + 200); ctx.fill();
    }
    // mine mouths cut into the terraces
    for (let i = 0; i < 4; i++) {
      const mx = 260 + i * 520;
      if (mx < L - 200 || mx > R + 200) continue;
      Gfx.round(mx - 80, 236, 160, 130, 62, '#241c2e');
      Gfx.round(mx - 68, 248, 136, 118, 54, '#120c16');
      Gfx.rect(mx - 78, 352, 156, 14, '#3a2415');
      for (let b = 0; b < 3; b++) Gfx.rect(mx - 62 + b * 52, 248, 10, 110, '#5c3a20');
      Gfx.rect(mx - 86, 240, 172, 12, '#5c3a20');
    }
    Gfx.rect(L, GY - 6, R - L, 300, '#6e6b80');
    Gfx.rect(L, GY - 6, R - L, 5, '#9391a6');
    Gfx.rectA(L, GY - 6, R - L, 300, '#3a2415', 0.28);
    for (let x = Math.floor(L / 26) * 26; x < R; x += 26) {          // broken stone underfoot
      const yy = GY + 10 + jitter(x, 86);
      Gfx.rectA(x + jitter(x + 1, 22), yy, 7 + jitter(x + 4, 9), 3, '#4d4a5c', 0.6);
      Gfx.rectA(x + jitter(x + 2, 22), yy - 1, 5, 1, '#9391a6', 0.45);
    }
    for (let x = Math.floor(L / 150) * 150; x < R; x += 150) {
      Gfx.sprite('prop_rock', x + jitter(x, 50), GY + 4, { anchor: 'bc', scale: 0.9 + jitter(x + 1, 0.4) });
      if (((x / 150) | 0) % 3 === 0) Gfx.sprite('prop_barrel', x + 70, GY + 4, { anchor: 'bc' });
    }
    for (let x = Math.floor(L / 700) * 700; x < R; x += 700) Gfx.sprite('prop_stage', x, GY + 4, { anchor: 'bc', scale: 0.8, alpha: 0.9 });
  },

  // ----------------------------------------------------------------- CANYON
  // Dusk, on the way home, with something behind you.
  canyon(t, o = {}, camX = 0) {
    const L = camX - 200, R = camX + W + 200;
    Gfx.bands(L, -400, R - L, 760, ['#0b0a18', '#2a1430', '#5c1f3d', '#a03a68', '#e06a1b']);
    const mx = 620 - camX * 0.04; Gfx.circle(mx, 130, 44, '#ef6a5e'); Gfx.glow(mx, 130, 260, '#e06a1b', 0.32);
    const ctx = Gfx.ctx;
    const wall = (depth, col, base, amp, seed) => {
      const off = camX * depth;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(L, GY);
      for (let x = L; x <= R; x += 24) {
        const k = (x + off + seed) * 0.004;
        ctx.lineTo(x, base + Math.sin(k) * amp + Math.sin(k * 3.3) * amp * 0.5 + Math.sin(k * 9) * amp * 0.3 + Math.sin(k * 23) * amp * 0.16);
      }
      ctx.lineTo(R, GY + 220); ctx.lineTo(L, GY + 220); ctx.fill();
    };
    wall(0.62, '#3f0e18', 170, 70, 0); wall(0.44, '#281040', 250, 50, 900); wall(0.24, '#120c16', 320, 30, 1700);
    for (let x = Math.floor(L / 320) * 320; x < R; x += 320) Gfx.sprite('prop_deadtree', x + jitter(x, 60), GY + 2, { anchor: 'bc', alpha: 0.75 });
    Gfx.rect(L, GY - 6, R - L, 300, '#241109');
    Gfx.rect(L, GY - 6, R - L, 5, '#3a2415');
    for (let x = Math.floor(L / 24) * 24; x < R; x += 24) {
      const yy = GY + 8 + jitter(x, 92);
      Gfx.rectA(x + jitter(x + 1, 20), yy, 6 + jitter(x + 4, 10), 2, '#3a2415', 0.8);
      if (((x / 24) | 0) % 4 === 0) Gfx.rectA(x + jitter(x + 6, 20), yy + 6, 3, 2, '#5c1607', 0.5);
    }
    for (let x = Math.floor(L / 190) * 190; x < R; x += 190) Gfx.sprite('prop_rock', x + jitter(x, 60), GY + 4, { anchor: 'bc', scale: 0.8, alpha: 0.95 });
    for (let x = Math.floor(L / 560) * 560; x < R; x += 560) Gfx.sprite('prop_bones', x + 120, GY + 6, { anchor: 'bc', alpha: 0.95 });
    if (o.embers) for (let i = 0; i < 2; i++) if (chance(0.5))
      Particles.spawn(camX + rnd(0, W), GY - rnd(0, 200), { n: 1, color: ['#ffa832', '#e06a1b'], speed: 12, gravity: -20, life: 3, size: 3, sizeEnd: 0 });
  },
};

// A side-scroll painter that hands a World stage the camera it needs.
const Scroll = (name, opt = {}) => (camX, t) => {
  const ctx = Gfx.ctx;
  Gfx.clear('#120c16');
  ctx.save(); ctx.translate(-Math.round(camX), 0);
  World[name](t, opt, camX);
  ctx.restore();
};
