// ---------------------------------------------------------------------------
// wildlife.js - the land is not empty.
//
// Herds wander the board between the tiles: they graze, look up, amble on,
// and scatter when you walk too close. Pteros cross the sky with their
// shadows sliding over the ground under them, and fish jump in the rivers.
// None of it can hurt you. It is just the place being alive.
// ---------------------------------------------------------------------------
'use strict';

const Wildlife = (() => {
  const HERDS = {
    1: ['stego', 'compy', 'dodo', 'tricera', 'dodo', 'stego', 'compy', 'mammoth'], 2: ['dodo', 'compy', 'boar', 'stego', 'raptor', 'tricera', 'compy'], 3: ['compy', 'lizard', 'stego', 'tricera', 'raptor', 'lizard'],
    4: ['mammoth', 'boar', 'compy', 'mammoth', 'stego'], 5: ['lizard', 'compy', 'raptor', 'lizard'],
  };
  const SIZE = { stego: 0.55, tricera: 0.55, mammoth: 0.5, boar: 0.7, raptor: 0.6, compy: 0.8, dodo: 0.8, lizard: 0.75 };
  function inWater(B, x, y) {
    for (const f of B.board.feats || []) if ((f.type === 'river' || f.type === 'lava') && f.cx && Math.abs(x - f.cx(y)) < f.hw(y) + 8) return true;
    return false;
  }
  function clear(B, x, y) {
    if (inWater(B, x, y)) return false;
    for (const t of B.T) { const dx = t.x - x, dy = t.y - y; if (dx * dx + dy * dy < 56 * 56) return false; }
    return true;
  }
  function init(B) {
    const b = B.bd.biome, kinds = HERDS[b] || HERDS[1];
    const maxX = Math.max(...B.T.map(t => t.x)), list = [];
    let tries = 0;
    while (list.length < Math.max(30, Math.round(maxX / 90)) && tries++ < 1400) {
      const x = Math.random() * (maxX + 200) - 100, y = HORIZON + 24 + Math.random() * (BOARD_H - HORIZON - 64);
      if (!clear(B, x, y)) continue;
      const id = kinds[(Math.random() * kinds.length) | 0];
      // a small herd: the little ones in flocks, the big ones in twos and threes, a calf trailing
      const n = id === 'compy' || id === 'dodo' ? 2 + ((Math.random() * 3) | 0) : 1 + ((Math.random() * 2.4) | 0);
      for (let i = 0; i < n; i++) {
        const hx = x + i * ((SIZE[id] || 0.7) < 0.65 ? 46 : 24) + Math.random() * 10, hy = y + (i % 2) * 10;
        if (!clear(B, hx, hy)) continue;
        const calf = i > 0 && SIZE[id] < 0.65 && Math.random() < 0.5;
        list.push({ id, x: hx, y: hy, tx: hx, ty: hy, s: (SIZE[id] || 0.7) * (calf ? 0.6 : 1), face: Math.random() < 0.5 ? 1 : -1, state: 'graze', t: Math.random() * 3, spd: id === 'compy' ? 40 : 18, flee: 0, ph: Math.random() * 6 });
      }
    }
    B.wild = list; B.flyers = []; B.fish = [];
  }
  function update(B, dt) {
    if (!B.wild) init(B);
    const me = B.me;
    for (const w of B.wild) {
      w.t -= dt;
      const dxh = w.x - me.x, dyh = w.y - me.y, near = dxh * dxh + dyh * dyh < 70 * 70;
      if (near && w.flee <= 0) {
        // too close: it bolts away from you
        w.flee = 1.4; w.state = 'walk'; w.tx = w.x + Math.sign(dxh || 1) * 90; w.ty = clamp(w.y + Math.sign(dyh || 1) * 20, HORIZON + 22, BOARD_H - 36);
        if (Math.random() < 0.5) Emotes.show({ x: w.x, get top() { return w.y - 40 * w.s; } }, '!', 0.6);
      }
      if (w.flee > 0) w.flee -= dt;
      if (w.state === 'graze' && w.t <= 0) {
        // amble somewhere nearby that is not the road or the river
        for (let k = 0; k < 6; k++) { const nx = w.x + (Math.random() - 0.5) * 140, ny = clamp(w.y + (Math.random() - 0.5) * 50, HORIZON + 22, BOARD_H - 36); if (clear(B, nx, ny)) { w.tx = nx; w.ty = ny; break; } }
        w.state = 'walk'; w.t = 4;
      }
      if (w.state === 'walk') {
        const dx = w.tx - w.x, dy = w.ty - w.y, d = Math.hypot(dx, dy), sp = w.spd * (w.flee > 0 ? 3.2 : 1);
        if (d < 2 || w.t <= 0) { w.state = 'graze'; w.t = 2 + Math.random() * 5; }
        else { w.x += dx / d * sp * dt; w.y += dy / d * sp * dt; if (Math.abs(dx) > 1) w.face = dx > 0 ? 1 : -1; }
      }
    }
    // a ptero now and then, and its shadow
    if (Math.random() < dt * 0.12 && B.flyers.length < 2) {
      const dir = Math.random() < 0.5 ? 1 : -1, cx = B.cam.x;
      B.flyers.push({ x: cx - dir * 340, y: 60 + Math.random() * 60, v: dir * (70 + Math.random() * 30), gy: 180 + Math.random() * 160, t: 0 });
    }
    for (const f of B.flyers) { f.x += f.v * dt; f.t += dt; }
    B.flyers = B.flyers.filter(f => f.t < 14);
    // fish in whatever river is in view
    if (Math.random() < dt * 0.8) {
      const rivers = (B.board.feats || []).filter(f => f.type === 'river' && f.cx);
      if (rivers.length) {
        const f = rivers[(Math.random() * rivers.length) | 0], y = 120 + Math.random() * 230, x = f.cx(y);
        if (Math.abs(x - B.cam.x) < 260) B.fish.push({ x, y, t: 0, dir: Math.random() < 0.5 ? 1 : -1 });
      }
    }
    for (const f of B.fish) f.t += dt;
    B.fish = B.fish.filter(f => f.t < 0.9);
  }
  // push the herds into the scene's y-sorted list
  function collect(B, list, L, R) {
    for (const w of B.wild || []) {
      if (w.x < L - 60 || w.x > R + 60) continue;
      list.push({ y: w.y, f: () => {
        const walking = w.state === 'walk', spr = walking && SPRITES[w.id + '_walk'] ? w.id + '_walk' : w.id + '_idle';
        const graze = !walking ? Math.max(0, Math.sin(Time.t * 0.8 + w.ph)) * 0.08 : 0;
        // a walk with weight in it: a lift each footfall, a rock of the body, a breath standing still
        const fl = w.flee > 0 ? 1.8 : 1, st = Time.t * (walking ? 8 * fl : 0) + w.ph * 3;
        const lift = walking ? Math.abs(Math.sin(st * Math.PI / 2)) * 2.2 * fl : 0, roll = walking ? Math.sin(st * Math.PI / 2) * 0.035 : 0;
        const br = walking ? 0 : Math.sin(Time.t * 2 + w.ph) * 0.015;
        Gfx.shadow(w.x, w.y, Gfx.spr(spr).w * w.s * 0.5 * (1 - lift * 0.03), 0.22);
        Gfx.sprite(spr, w.x, w.y - lift, { anchor: 'bc', scale: w.s, frame: Math.floor(Time.t * (walking ? 8 * fl : 3) + w.ph), flip: w.face < 0, rot: graze * w.face + roll + (walking ? w.face * 0.04 * fl : 0), sx: 1 - br * 0.5 + (walking ? -lift * 0.004 : 0), sy: 1 + br + lift * 0.006 });
      } });
    }
  }
  function drawOver(B) {
    for (const f of B.fish) {
      const k = f.t / 0.9, x = f.x + f.dir * k * 18, y = f.y - Math.sin(k * Math.PI) * 22;
      Gfx.rect(Math.round(x) - 3, Math.round(y) - 1, 6, 3, '#a8d8ff'); Gfx.rect(Math.round(x) - 3 - f.dir * 3, Math.round(y) - 2, 2, 5, '#6aa9ee');
      if (f.t < 0.05 || (k > 0.95)) Particles.spawn(f.x, f.y, { n: 3, color: ['#a8d8ff', '#ffffff'], speed: 50, angle: -Math.PI / 2, spread: 0.8, gravity: 300, life: 0.4, size: 2 });
    }
    for (const f of B.flyers) {
      Gfx.shadow(f.x + 30, f.gy, 40, 0.16);
      Gfx.sprite('ptero_fly', f.x, f.y, { anchor: 'c', scale: 0.55, frame: Math.floor(f.t * 6), flip: f.v < 0 });
    }
  }
  return { init, update, collect, drawOver };
})();
