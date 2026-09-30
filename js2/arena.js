// ---------------------------------------------------------------------------
// arena.js - the fighting ground is alive, and it takes sides.
//
// Every land puts on a show behind the fight: a waterfall and pteros crossing
// in Fern Valley, lightning that lights up a brachiosaurus far off in the
// jungle, a giant's ribcage and circling vultures in the badlands, the aurora
// over the peaks, and a volcano that erupts on Smoke Mountain. Rock and leaf
// frame the top corners, in front of everything, for depth.
//
// And every fight leaves a couple of PROPS lying about: a boulder on the bank,
// a beehive on a branch, icicles, a tar pit, a lava vent, a geyser. Click one
// on your turn (1 energy) to use it on them. But the beasts can use them too:
// when one of them EYES a prop (a red line and a "!"), it will grab it on its
// turn and use it on you, unless you get there first.
// ---------------------------------------------------------------------------
'use strict';

const Arena = (() => {
  const BONE = ['#5c503c', '#8a7f68', '#c4b89a', '#e8dfc6', '#fffaea'];
  const STONE = ['#241c2e', '#3b3048', '#574a66', '#7a6d8a', '#a79bb4'];
  const ROCKS = {
    1: ['#241c2e', '#3b3048', '#574a66', '#7a6d8a', '#a79bb4'], 2: ['#10201c', '#1e2a2a', '#2e4040', '#445a58', '#6a8480'],
    3: ['#3a2415', '#5c3a20', '#85562f', '#a4663a', '#c48a56'], 4: ['#2e3448', '#4a5670', '#6a7896', '#8c9ab8', '#c0cce0'],
    5: ['#120c16', '#1a1016', '#2a1c24', '#3c2a34', '#5a4250'],
  };
  const SIL = '#1a1320';

  // ---------------------------------------------------------------- sprites
  const boulder = f => Pix.make('ar_boul' + f, 26, 26, P => {
    P.ball(13, 13, 11.5, Pix.ramp('#8a7f68'));
    const a = f / 8 * Math.PI * 2;
    for (let i = -7; i <= 7; i++) P.put(13 + Math.cos(a) * i + Math.sin(i) * 1.2, 13 + Math.sin(a) * i, '#3a2415');
    for (let i = 0; i < 7; i++) { const b = a + i * 0.9, r = 5 + (i % 3) * 2; P.put(13 + Math.cos(b) * r, 13 + Math.sin(b) * r, '#5c503c'); }
    for (let i = 0; i < 5; i++) P.put(6 + i, 22 - (i % 2), '#3f9a45');           // a bit of moss underneath
  });
  const ledge = b => Pix.make('ar_ledge' + b, 44, 20, P => {
    const R = ROCKS[b];
    P.ball(12, 13, 11, R, 7); P.ball(30, 12, 13, R, 8); P.ball(22, 16, 14, R, 5);
  });
  const hive = () => Pix.make('ar_hive', 20, 28, P => {
    const R = ['#5c3a20', '#a3663a', '#d8a86b', '#e0b93a', '#ffe98a'];
    for (let y = 2; y < 27; y++) for (let x = 0; x < 20; x++) {
      const k = (y - 2) / 25, half = 9 * Math.sin(Math.min(1, k * 1.15) * Math.PI) * (k < 0.3 ? 0.8 : 1);
      const dx = x + 0.5 - 10; if (Math.abs(dx) > half) continue;
      let l = 0.6 - dx / (half + 0.1) * 0.35 - k * 0.2;
      if ((y % 5) === 0) l -= 0.3;                                               // the bands of the comb
      P.put(x, y, R[clamp(Math.floor(l * 5 + P.dith(x, y)), 0, 4)]);
    }
    P.ball(10, 20, 2.2, ['#120c16', '#120c16', '#241109', '#241109', '#3a2415']);   // the door
    P.rect(9, 0, 2, 3, '#3a2415');
  });
  const icicles = (side, b) => Pix.make('ar_ice' + side, 120, 28, P => {
    const R = ['#6aa9ee', '#a8d8ff', '#dcecff', '#f4faff', '#ffffff'];
    for (let i = 0; i < 17; i++) {
      const x = 4 + i * 6.8 + P.hash(i, side) * 3, len = 8 + P.hash(i, 9 + side) * 16, w = 2.2 + P.hash(i, 5) * 1.4;
      for (let y = 0; y < len; y++) { const r = w * (1 - y / len); for (let dx = -r; dx <= r; dx++) P.put(x + dx, y, R[clamp(Math.floor((0.7 - dx / (r + 0.1) * 0.35) * 5 + P.dith(x + dx | 0, y)), 0, 4)]); }
    }
    for (let x = 0; x < 120; x++) { const d = Math.min(x, 119 - x), th = Math.min(5, 1 + d * 0.4) + P.hash(x >> 2, 3) * 2; for (let y = 0; y < th; y++) P.put(x, y, ROCKS[b][clamp(y === 0 ? 4 : y < 2 ? 3 : 2, 0, 4)]); }
  });
  const spike = () => Pix.make('ar_spike', 10, 30, P => {
    const R = ['#6aa9ee', '#a8d8ff', '#dcecff', '#f4faff', '#ffffff'];
    for (let y = 0; y < 29; y++) { const r = 4 * (1 - y / 29); for (let dx = -r; dx <= r; dx++) P.put(5 + dx, y, R[clamp(Math.floor((0.7 - dx / (r + 0.1) * 0.35) * 5 + P.dith(5 + dx | 0, y)), 0, 4)]); }
  });
  const pit = (kind, f) => Pix.make('ar_pit' + kind + f, 64, 20, P => {
    const tar = kind === 'tar', lava = kind === 'lava', geyser = kind === 'geyser';
    const RIM = tar ? ['#241109', '#3a2415', '#5c3a20', '#75401f', '#85562f'] : STONE;
    for (let y = 0; y < 20; y++) for (let x = 0; x < 64; x++) {
      const nx = (x + 0.5 - 32) / 31, ny = (y + 0.5 - 10) / 9, d = nx * nx + ny * ny; if (d > 1) continue;
      if (d > (geyser ? 0.35 : 0.62)) { P.put(x, y, RIM[clamp(Math.floor((0.6 - ny * 0.4) * 5 + P.dith(x, y)), 0, 4)]); continue; }
      if (tar) P.put(x, y, (x + y * 3 + f * 5) % 23 === 0 ? '#574a66' : ny < -0.2 && nx < 0 ? '#241c2e' : '#120c16');
      else if (lava) { const g = Math.sin(x * 0.4 + f * 1.3 + Math.sin(y * 0.7)) * 0.5 + 0.5; P.put(x, y, g > 0.75 ? '#ffe98a' : g > 0.4 ? '#ffa832' : '#e06a1b'); }
      else P.put(x, y, d < 0.12 ? '#120c16' : '#3b3048');
    }
    if (tar) { P.tube(12, 6, 20, 2, 1.4, 1, BONE); P.ball(48, 8, 3, BONE); }                  // a bone sticking out
    if (tar && f % 3 === 0) P.ball(26 + f * 3, 9, 2.4, ['#241c2e', '#3b3048', '#574a66', '#7a6d8a', '#a79bb4']); // a bubble
  });
  const brachio = () => Pix.make('ar_brachio', 150, 90, P => {
    const s = (x0, y0, x1, y1, r0, r1) => P.tube(x0, y0, x1, y1, r0, r1, [SIL, SIL, SIL, SIL, SIL]);
    P.ball(60, 58, 30, [SIL, SIL, SIL, SIL, SIL], 16);
    s(80, 50, 118, 12, 7, 4); s(118, 12, 132, 8, 4, 4); P.ball(134, 9, 6, [SIL, SIL, SIL, SIL, SIL], 4);
    s(34, 60, 4, 76, 8, 2);
    for (const lx of [42, 56, 70, 82]) s(lx, 66, lx + 1, 89, 5, 5);
  }, { ink: false });
  const ribcage = () => Pix.make('ar_ribs', 170, 80, P => {
    const R = ['#5c503c', '#8a7f68', '#a89c80', '#c4b89a', '#dcd2b6'];
    for (let i = 0; i <= 40; i++) { const k = i / 40; P.ball(10 + k * 150, 14 + Math.sin(k * Math.PI) * -8 + 8, 3.5, R); }
    for (let r = 0; r < 8; r++) {
      const x0 = 30 + r * 16;
      for (let i = 0; i <= 30; i++) { const k = i / 30; P.ball(x0 + Math.sin(k * 2.2) * 14 - k * 8, 16 + k * 60, 2.4 - k * 0.8, R); }
    }
    P.ball(6, 22, 9, R, 7); P.ball(3, 23, 3, ['#120c16', '#120c16', '#241c2e', '#241c2e', '#241c2e']);
  });
  const volcano = () => Pix.make('ar_volc', 220, 100, P => {
    const R = ['#120c16', '#1a1016', '#2a1c24', '#3c2a34', '#5a4250'];
    for (let y = 0; y < 100; y++) for (let x = 0; x < 220; x++) {
      const half = 16 + y * 1.0; if (Math.abs(x - 110) > half || y < 6) continue;
      const l = 0.55 - (x - 110) / half * 0.3 - (P.hash(x >> 2, y >> 2, 1) - 0.5) * 0.3;
      let c = R[clamp(Math.floor(l * 5 + P.dith(x, y)), 0, 4)];
      // lava runnels down the flanks
      if (Math.abs(x - 110 - Math.sin(y * 0.18) * 8 - y * 0.25) < 1.2 && y < 70) c = y < 30 ? '#ffa832' : '#e06a1b';
      if (Math.abs(x - 110 + Math.sin(y * 0.2) * 6 + y * 0.45) < 1 && y < 50) c = '#e06a1b';
      P.put(x, y, c);
    }
    for (let x = 96; x < 125; x++) P.put(x, 6, '#ffe98a');
  }, { ink: false });
  const ptero = f => Pix.make('ar_ptero' + f, 30, 14, P => {
    const up = f % 2 === 0;
    for (let i = 0; i < 14; i++) { const y = up ? 7 - i * 0.45 : 7 + i * 0.2; P.put(15 - i, y, SIL); P.put(15 + i, y, SIL); P.put(15 - i, y + 1, SIL); P.put(15 + i, y + 1, SIL); }
    P.rect(13, 6, 5, 4, SIL); P.rect(18, 5, 6, 2, SIL); P.rect(10, 5, 3, 1, SIL);
  }, { ink: false });
  // the top corners: rock, leaves or ice, standing in front of the fight
  const corner = b => Pix.make('ar_corner' + b, 150, 80, P => {
    const R = ROCKS[b];
    // a lip of rock that sags in knobbly lumps, lit along its underside
    for (let y = 0; y < 80; y++) for (let x = 0; x < 150; x++) {
      const edge = 46 * Math.pow(Math.max(0, 1 - x / 118), 1.4) + Math.abs(Math.sin(x * 0.16)) * 7 * (1 - x / 150) + P.hash(x >> 2, 7, b) * 3;
      if (y > edge) continue;
      const nearEdge = edge - y;
      const l = 0.3 + (nearEdge < 3 ? 0.35 : nearEdge < 6 ? 0.15 : 0) + Math.sin(x * 0.3 + y * 0.5) * 0.06 + (P.hash(x >> 1, y >> 1, b) - 0.5) * 0.25;
      P.put(x, y, R[clamp(Math.floor(l * 5 + P.dith(x, y)), 0, 4)]);
    }
    if (b === 1 || b === 2) {                     // ferns and vines hanging off the lip
      const G = b === 1 ? ['#1d4a2a', '#27632f', '#3f9a45', '#6cc95c', '#a8e878'] : ['#0e2a1a', '#1d4a2a', '#27632f', '#3f9a45', '#6cc95c'];
      for (let v = 0; v < 9; v++) {
        const x0 = 6 + v * 12, y0 = 44 * Math.pow(Math.max(0, 1 - x0 / 118), 1.4) - 2, len = 14 + P.hash(v, 4) * (b === 2 ? 40 : 18);
        for (let y = 0; y < len; y++) {
          const x = x0 + Math.sin(y * 0.25 + v) * 2;
          P.put(x, y0 + y, G[2]);
          if (y % 3 === 0) { P.put(x - 1 - (y % 2), y0 + y + 1, G[3]); P.put(x + 1 + (y % 2), y0 + y + 1, G[1]); P.put(x - 2, y0 + y + 2, G[4]); }
        }
      }
    }
    const lip = x => 46 * Math.pow(Math.max(0, 1 - x / 118), 1.4) + Math.abs(Math.sin(x * 0.16)) * 7 * (1 - x / 150);
    if (b === 5) for (let i = 0; i < 40; i++) { const x = P.hash(i, 1, 5) * 100, y = lip(x) - 2 - P.hash(i, 2, 5) * 20; if (y > 0) { P.put(x, y, '#e06a1b'); P.put(x + 1, y, '#ffa832'); } }
    if (b === 4) for (let x = 0; x < 116; x++) { const y = lip(x); for (let k = 1; k < 4; k++) P.put(x, y - k, '#f4faff'); }
    if (b === 3) for (let i = 0; i < 6; i++) { const x = 10 + i * 17; P.tube(x, lip(x) - 4, x + 2, lip(x) + 6, 1.6, 0.8, BONE); }
  });

  // ---------------------------------------------------------------- props
  const KINDS = {
    boulder: { verb: 'DROP', x: 470, y: 318, w: 60, h: 60, spr: () => boulder(0) },
    hive: { verb: 'SWAT', x: 548, y: 262, w: 44, h: 60, front: true },
    icicles: { verb: 'SHOUT', x: 800, y: 226, w: 240, h: 54, front: true },
    tar: { verb: 'FLING', x: 440, y: 452, w: 128, h: 40 },
    lava: { verb: 'ERUPT', x: 440, y: 452, w: 128, h: 40 },
    geyser: { verb: 'STEAM', x: 440, y: 452, w: 128, h: 40 },
  };
  const BY_BIOME = { 1: ['boulder', 'hive'], 2: ['hive', 'geyser'], 3: ['tar', 'boulder'], 4: ['icicles', 'geyser'], 5: ['lava', 'boulder'] };
  function setup(S) {
    const b = clamp(S.act, 1, BIOME_COUNT), list = BY_BIOME[b].slice();
    // a boss fight or an elite always gets both; a small one sometimes just one
    const n = S.kind === 'normal' && S.rng.chance(0.35) ? 1 : 2;
    S.props = list.slice(0, n).map(k => Object.assign({ kind: k, used: false, eyed: null, t: 0, rot: 0, dx: 0, dy: 0, hide: false }, KINDS[k]));
    S.bees = [];
    S.sky = { flash: 0, next: 4 + Math.random() * 4, bolt: null, erupt: 0, nextErupt: 3, pteros: [], meteor: null };
  }
  const front = S => S.alive().slice().sort((a, b) => a.actor.x - b.actor.x)[0];
  const rect = (S, p) => { const a = S.cam.toScreen(p.x - p.w / 2, p.y - p.h), z = S.cam.zoom; return { x: a.x, y: a.y, w: p.w * z, h: p.h * z }; };
  const usable = S => S.phase === 'player' && !S.busy && !S.riff && !S.selected && S.energy >= 1;
  function hover(S) {
    if (!usable(S)) return null;
    for (const p of S.props || []) { if (p.used) continue; const r = rect(S, p); if (inRect(Input.mx, Input.my, r.x, r.y, r.w, r.h)) return p; }
    return null;
  }
  function click(S, x, y) {
    if (!usable(S) || !S.props) return false;
    for (const p of S.props) {
      if (p.used) continue; const r = rect(S, p);
      if (inRect(x, y, r.x, r.y, r.w, r.h)) { S.energy -= 1; AudioSys.sfx('select'); S.co2 = Co.run(use(S, p, false), S); return true; }
    }
    return false;
  }
  // the enemy side: somebody eyes a prop at the start of your turn
  function eye(S) {
    if (!S.props) return;
    if (S.props.some(p => p.eyed && !p.used)) return;
    const free = S.props.filter(p => !p.used);
    if (!free.length || !S.rng.chance(S.turn <= 1 ? 0.3 : 0.45)) return;
    const who = S.alive().filter(e => !(e.st.stun > 0)); if (!who.length) return;
    const p = S.rng.pick(free), e = S.rng.pick(who);
    p.eyed = e; p.eyeT = 0;
    AudioSys.sfx('detect');
    Emotes.show(e.actor, '!', 1.4);
  }
  function* enemyTurn(S) {
    for (const p of S.props || []) {
      if (p.used || !p.eyed) continue;
      const e = p.eyed;
      if (!e.alive || e.st.stun > 0) { p.eyed = null; continue; }
      yield* use(S, p, true);
      if (S.hp <= 0) return;
    }
  }
  // ---------------------------------------------------------------- the show
  function* use(S, p, enemy) {
    const wasBusy = S.busy; S.busy = true; p.used = true; const who = p.eyed; p.eyed = null;
    if (!enemy) Profile.unlock('prop_comic');
    const act = S.act, fx = p.x, fy = p.y - p.h / 2;
    Juice.letterbox(true);
    // frame the prop and whoever it is about to land on
    const aim = enemy ? S.me : (front(S) || S.me).actor || S.me;
    S.cam.lookAt((fx + aim.x) / 2, Math.min(STAGE_Y - 60, (fy + STAGE_Y - 80) / 2) + CAM_DY * 0.6); S.cam.zoomTo(1.18);
    if (enemy && who) {
      // the beast goes for it
      Popups.add(who.actor.x, who.actor.top - 24, KINDS[p.kind].verb + '!', '#ef6a5e', { scale: 1.6 });
      AudioSys.sfx('roar', who.def.roar || {}); who.actor.stretch(0.25); Juice.shake(5, 0.2);
      yield 0.45;
    } else {
      S.me.stretch(0.2); S.me.play('play');
      yield 0.25;
    }
    const targetsE = S.alive(), foe = enemy ? null : front(S);
    const land = (x, y) => { Juice.shake(12, 0.3); Juice.stop(0.08); Particles.dust(x, y, 16); AudioSys.sfx('thud'); };
    if (p.kind === 'boulder') {
      const tx = enemy ? S.me.x + 20 : foe.actor.x, ty = STAGE_Y - 24, x0 = p.x, y0 = p.y - 24;
      AudioSys.sfx('rumble');
      yield* Co.over(0.6, k => {
        p.dx = (tx - x0) * k; p.dy = (ty - y0) * k - Math.abs(Math.sin(k * Math.PI * 2)) * 50 * (1 - k); p.rot = k * 14 * (enemy ? -1 : 1);
        if (Math.random() < 0.4) Particles.dust(x0 + p.dx, y0 + p.dy + 24, 2);
      });
      land(tx, STAGE_Y);
      if (enemy) S.damagePlayer(8 + 2 * act, { from: who });
      else if (foe) { S.damageEnemy(foe, 10 + 2 * act, { src: 'prop' }); S.stun(foe, 1); }
      Particles.spawn(tx, ty, { n: 24, color: ['#8a7f68', '#a89c80', '#5c503c'], speed: 260, life: 0.7, size: 5, sizeEnd: 0, gravity: 600 });
      p.hide = true;
    } else if (p.kind === 'hive') {
      const tx = enemy ? S.me.x : lerp(p.x, foe ? foe.actor.x : p.x, 0.5);
      yield* Co.over(0.35, k => { p.dy = (STAGE_Y - p.y) * Ease.inQuad(k); p.dx = (tx - p.x) * k; p.rot = k * 3; });
      AudioSys.sfx('crunch'); Juice.shake(6, 0.2); p.hide = true;
      Particles.spawn(p.x + p.dx, STAGE_Y - 10, { n: 18, color: ['#d8a86b', '#e0b93a', '#5c3a20'], speed: 200, life: 0.5, size: 4, sizeEnd: 0, gravity: 500 });
      const tg = enemy ? [{ x: S.me.x, y: S.me.cy }] : targetsE.map(e => ({ x: e.actor.x, y: e.actor.cy, e }));
      for (let i = 0; i < 46; i++) { const T = tg[i % tg.length]; S.bees.push({ x: p.x + p.dx + rnd(-10, 10), y: STAGE_Y - 10, tx: T.x, ty: T.y, t: 0, ph: rnd(0, 6) }); }
      AudioSys.sfx('debuff');
      yield 0.7;
      if (enemy) { S.damagePlayer(4 + act, { from: who }); S.applyPlayer('weak', 2); }
      else for (const e of targetsE) { S.damageEnemy(e, 3 + act, { src: 'prop' }); S.applyEnemy(e, 'weak', 2, true); }
      yield 0.5;
    } else if (p.kind === 'icicles') {
      // the left cluster hangs over you, the right one over them
      p.side = enemy ? 'L' : 'R';
      const tg = enemy ? [{ x: S.me.x }] : targetsE.map(e => ({ x: e.actor.x, e }));
      AudioSys.sfx(enemy ? 'roar' : 'cheer');
      Juice.shake(8, 0.5);
      p.falls = tg.map((T, i) => ({ x: T.x + rnd(-10, 10), y: 190, v: 0, delay: i * 0.12, e: T.e, done: false }));
      yield* Co.over(0.9, k => {
        for (const f of p.falls) {
          if (f.done) continue;
          const tt = k * 0.9 - f.delay; if (tt < 0) continue;
          f.y = 190 + 0.5 * 2200 * tt * tt;
          if (f.y >= STAGE_Y - 40) {
            f.done = true; AudioSys.sfx('spikes');
            Particles.spawn(f.x, f.y, { n: 16, color: ['#dcecff', '#a8d8ff', '#ffffff'], speed: 240, life: 0.5, size: 3, sizeEnd: 0, gravity: 500 });
            if (enemy) S.damagePlayer(7 + act, { from: who }); else if (f.e) { S.damageEnemy(f.e, 6 + act, { src: 'prop' }); S.applyEnemy(f.e, 'vuln', 1, true); }
          }
        }
      });
      p.hide = true;
    } else if (p.kind === 'tar') {
      const tgt = enemy ? { x: S.me.x, y: S.me.cy } : { x: foe.actor.x, y: foe.actor.cy };
      AudioSys.sfx('slurp');
      const blob = { x: p.x, y: p.y - 20 };
      yield* Co.over(0.5, k => {
        blob.x = lerp(p.x, tgt.x, k); blob.y = lerp(p.y - 20, tgt.y, k) - Math.sin(k * Math.PI) * 110;
        Particles.spawn(blob.x, blob.y, { n: 2, color: ['#120c16', '#241c2e'], speed: 20, life: 0.4, size: 7, sizeEnd: 2, gravity: 200 });
      });
      AudioSys.sfx('splash'); Juice.shake(7, 0.2);
      Particles.spawn(tgt.x, tgt.y, { n: 26, color: ['#120c16', '#241c2e', '#3b3048'], speed: 200, life: 0.7, size: 5, sizeEnd: 1, gravity: 600 });
      if (enemy) { S.damagePlayer(4, { from: who }); S.applyPlayer('weak', 2); }
      else { S.applyEnemy(foe, 'weak', 2); S.applyEnemy(foe, 'vuln', 2); }
      yield 0.3;
    } else if (p.kind === 'lava') {
      AudioSys.sfx('fire_whoosh'); Juice.shake(14, 0.8); Juice.flash('#ffa832', 0.35, 3);
      const tg = enemy ? [{ x: S.me.x, y: S.me.cy }] : targetsE.map(e => ({ x: e.actor.x, y: e.actor.cy, e }));
      for (let i = 0; i < 40; i++) Particles.spawn(p.x + rnd(-20, 20), p.y - 10, { n: 1, color: ['#ffe98a', '#ffa832', '#e06a1b'], speed: rnd(200, 420), angle: -Math.PI / 2, spread: 0.5, life: 0.9, size: 5, sizeEnd: 0, gravity: 700 });
      yield 0.35;
      for (const T of tg) {
        const bomb = { x: p.x, y: p.y - 20 };
        yield* Co.over(0.32, k => { bomb.x = lerp(p.x, T.x, k); bomb.y = lerp(p.y - 20, T.y, k) - Math.sin(k * Math.PI) * 140; Particles.fire(bomb.x, bomb.y, 2); });
        FX.burst(T.x, T.y, { scale: 1.3 }); AudioSys.sfx('fire');
        if (enemy) S.damagePlayer(9 + act, { from: who, fire: true }); else { S.damageEnemy(T.e, 4, { src: 'prop', fire: true }); S.applyEnemy(T.e, 'burn', 3, true); }
      }
      yield 0.2;
    } else if (p.kind === 'geyser') {
      AudioSys.sfx('geyser'); Juice.shake(9, 0.6);
      p.blast = 1;
      for (let i = 0; i < 50; i++) Particles.spawn(p.x + rnd(-14, 14), p.y - 10, { n: 1, color: ['#e8f4ff', '#ffffff', '#a8d8ff'], speed: rnd(260, 520), angle: -Math.PI / 2, spread: 0.18, life: 1.2, size: 7, sizeEnd: 14, gravity: 60, drag: 0.93 });
      yield 0.5;
      if (enemy && who) { who.block += 12 + act * 2; Popups.add(who.actor.x, who.actor.cy - 40, `+${12 + act * 2}`, '#6aa9ee'); AudioSys.sfx('block'); }
      else { S.gainBlock(12 + act * 2); S.heal(4); }
      yield 0.4;
    }
    S.checkDeaths();
    S.cam.lookAt(W / 2, 288 + CAM_DY); S.cam.zoomTo(1);
    Juice.letterbox(false);
    S.me.play('idle');
    yield 0.2;
    if (!enemy) {
      if (!S.alive().length) { yield* S.victory(); return; }
      S.busy = wasBusy;
    }
  }
  // --------------------------------------------------------------- per frame
  function update(S, dt) {
    if (!S.props) return;
    for (const p of S.props) { p.t += dt; if (p.eyed) p.eyeT = (p.eyeT || 0) + dt; if (p.blast) p.blast = Math.max(0, p.blast - dt * 0.8); }
    for (const b of S.bees) { b.t += dt; }
    S.bees = S.bees.filter(b => b.t < 1.6);
    const sk = S.sky, b = clamp(S.act, 1, BIOME_COUNT);
    sk.flash = Math.max(0, sk.flash - dt * 2.4);
    if (b === 2 || b === 5 || b === 4) {
      sk.next -= dt;
      if (sk.next <= 0) {
        sk.next = 7 + Math.random() * 6;
        if (b === 2) { sk.flash = 1; sk.bolt = { x: 200 + Math.random() * 560, t: 0 }; setTimeout(() => AudioSys.sfx('thunder', { vol: 0.5 }), 180); }
        if (b === 5) { sk.erupt = 1; AudioSys.sfx('rumble', { vol: 0.6 }); Juice.shake(4, 0.6); }
        if (b === 4) sk.gust = 1;
      }
    }
    if (sk.bolt) { sk.bolt.t += dt; if (sk.bolt.t > 0.3) sk.bolt = null; }
    sk.erupt = Math.max(0, (sk.erupt || 0) - dt * 0.5);
    sk.gust = Math.max(0, (sk.gust || 0) - dt * 0.4);
    // a flock now and then, in the lands where things fly
    if ((b === 1 || b === 3) && sk.pteros.length === 0 && Math.random() < dt * 0.08) {
      const n = b === 1 ? 4 : 3, dir = Math.random() < 0.5 ? 1 : -1;
      for (let i = 0; i < n; i++) sk.pteros.push({ x: dir > 0 ? -80 - i * 40 : W + 80 + i * 40, y: 60 + i * 14 + Math.random() * 20, v: dir * (70 + Math.random() * 20), ph: i, circle: b === 3 });
    }
    for (const p of sk.pteros) p.x += p.v * dt;
    sk.pteros = sk.pteros.filter(p => p.x > -300 && p.x < W + 300);
    if (b === 5 && !sk.meteor && Math.random() < dt * 0.1) sk.meteor = { x: Math.random() * W, y: -30, t: 0 };
    if (sk.meteor) { sk.meteor.t += dt; sk.meteor.x -= dt * 260; sk.meteor.y += dt * 200; if (sk.meteor.t > 1.4) sk.meteor = null; }
  }
  // far away: behind the hills' front band, in world space with parallax
  function drawFar(S, b, t, px) {
    const sk = S.sky || {};
    if (b === 1) {
      // a waterfall down the far cliffs
      const x = 70 - px * 0.2;
      Gfx.rectA(x - 22, 150, 44, 150, '#3b3048', 0.5);
      for (let i = 0; i < 9; i++) { const yy = 150 + ((t * 120 + i * 17) % 150); Gfx.rectA(x - 14 + (i % 4) * 7, yy, 5, 18, '#dcecff', 0.55); }
      for (let i = 0; i < 6; i++) Gfx.rectA(x - 30 + i * 11 + Math.sin(t * 2 + i) * 3, 292 + Math.sin(t * 3 + i) * 2, 10, 6, '#ffffff', 0.25);
    }
    if (b === 2 && sk.flash > 0.02) Pix.draw(brachio(), 720 - px * 0.15, 300, { ay: 1, alpha: Math.min(1, sk.flash * 1.4) });
    if (b === 3) Pix.draw(ribcage(), 640 - px * 0.2, 296, { ay: 1, alpha: 0.9 });
    if (b === 4) {
      // the aurora
      for (let x = -40; x < W + 40; x += 6) {
        for (let k = 0; k < 5; k++) {
          const y = 40 + Math.sin(x * 0.008 + t * 0.35 + k * 0.3) * 26 + Math.sin(x * 0.021 - t * 0.5) * 10 + k * 7;
          Gfx.rectA(x - px * 0.1, Math.round(y / 2) * 2, 6, 6, k < 2 ? '#86e8d2' : '#6cc95c', 0.1 - k * 0.012 + (((x / 6) | 0) % 3 === 0 ? 0.04 : 0));
        }
      }
    }
    if (b === 5) {
      const vx = 690 - px * 0.2;
      Pix.draw(volcano(), vx, 300, { ay: 1 });
      const e = sk.erupt || 0;
      if (window.Post) Post.light(vx, 110, 120 + e * 160, '#ffa832', 0.35 + e * 0.6);
      if (e > 0.2 && Math.random() < 0.6) Particles.spawn(vx + rnd(-12, 12), 104, { n: 1, color: ['#ffe98a', '#ffa832', '#e06a1b'], speed: rnd(120, 300) * e, angle: -Math.PI / 2, spread: 0.6, life: 1.4, size: 4, sizeEnd: 0, gravity: 260 });
      if (Math.random() < 0.3) Particles.spawn(vx + rnd(-10, 10), 100, { n: 1, color: ['#3c2a34', '#5a4250'], speed: 20, angle: -Math.PI / 2, spread: 0.3, life: 4, size: 8, sizeEnd: 22, gravity: -8 });
      if (sk.meteor) { const m = sk.meteor; for (let i = 0; i < 10; i++) Gfx.rectA(m.x + i * 8, m.y - i * 6, 6 - i * 0.4, 6 - i * 0.4, i < 2 ? '#ffe98a' : '#ffa832', 0.9 - i * 0.08); }
    }
    for (const p of sk.pteros || []) {
      const y = p.circle ? p.y + Math.sin(t + p.ph) * 12 : p.y + Math.sin(t * 2 + p.ph) * 4;
      Pix.draw(ptero(((t * 5 + p.ph) | 0) % 2), p.x - px * 0.3, y, { sx: p.v < 0 ? -1 : 1, alpha: 0.8 });
    }
  }
  function drawSky(S) {
    const sk = S.sky; if (!sk) return;
    if (sk.flash > 0.02) Gfx.rectA(-600, -400, 2400, 1200, '#e8f4ff', sk.flash * 0.28);
    if (sk.bolt) {
      const ctx = Gfx.ctx; let x = sk.bolt.x, y = 110;
      ctx.globalAlpha = 1 - sk.bolt.t / 0.3;
      while (y < 290) { const nx = x + rnd(-18, 18), ny = y + rnd(14, 26); Gfx.line(x, y, nx, ny, '#ffffff', 3); Gfx.line(x + 1, y, nx + 1, ny, '#a8d8ff', 1); x = nx; y = ny; }
      ctx.globalAlpha = 1;
    }
  }
  // the props, in the world
  function drawProps(S, frontLayer) {
    if (!S.props) return;
    const t = S.t, b = clamp(S.act, 1, BIOME_COUNT), hov = hover(S);
    for (const p of S.props) {
      if (!!p.front !== frontLayer || p.hide) continue;
      const hot = hov === p, glint = !p.used && usable(S) ? 0.5 + Math.sin(t * 4) * 0.5 : 0;
      if (p.kind === 'boulder') {
        Pix.draw(ledge(b), p.x - 6, p.y + 6, { ay: 1 });
        const f = ((Math.round(p.rot) % 8) + 8) % 8;
        Pix.draw(boulder(f), p.x + p.dx, p.y - 20 + p.dy + (p.used ? 0 : Math.sin(t * 3) * 0.6), { ay: 0.5 });
      } else if (p.kind === 'hive') {
        if (!p.used) Gfx.line(p.x, p.y - 60, p.x, p.y - 56, '#3a2415', 2);
        Gfx.line(p.x - 120, p.y - 64, p.x + 130, p.y - 54, '#3a2415', 5); Gfx.line(p.x - 120, p.y - 66, p.x + 130, p.y - 56, '#5c3a20', 2);
        for (let i = 0; i < 6; i++) Gfx.sprite('v_fern', p.x - 110 + i * 46, p.y - 50, { anchor: 'tc', scale: 0.6, flip: i % 2 === 1, tint: '#120c16', tintAmount: 0.2 });
        const sw = p.used ? p.rot : Math.sin(t * 1.6) * 0.08;
        Gfx.ctx.save(); Gfx.ctx.translate(p.x + p.dx, p.y - 56 + p.dy); Gfx.ctx.rotate(sw);
        Pix.draw(hive(), 0, 0, { ay: 0 });
        Gfx.ctx.restore();
        if (!p.used) for (let i = 0; i < 5; i++) { const a = t * (2 + i * 0.3) + i * 1.3; Gfx.rect(p.x + Math.cos(a) * (16 + i * 3), p.y - 30 + Math.sin(a * 1.3) * 12, 3, 2, i % 2 ? '#120c16' : '#ffe98a'); }
      } else if (p.kind === 'icicles') {
        const drop = s => p.used && p.side === s;
        if (!drop('L')) Pix.draw(icicles(0, b), 230, 172, { ay: 0 });
        if (!drop('R')) Pix.draw(icicles(1, b), 800, 172, { ay: 0 });
        for (const f of p.falls || []) if (!f.done) Pix.draw(spike(), f.x, f.y, { ay: 1 });
      } else {
        const f = ((t * 6) | 0) % 8;
        Pix.draw(pit(p.kind, p.kind === 'geyser' ? 0 : f), p.x, p.y - 10);
        if (p.kind === 'lava') { if (window.Post) Post.light(p.x, p.y - 14, 90, '#ffa832', 0.6 + Math.sin(t * 5) * 0.1); if (Math.random() < 0.15) Particles.fire(p.x + rnd(-30, 30), p.y - 14, 1); }
        if (p.kind === 'geyser' && !p.used && Math.random() < 0.3) Particles.spawn(p.x + rnd(-8, 8), p.y - 14, { n: 1, color: ['#e8f4ff', '#ffffff'], speed: 40, angle: -Math.PI / 2, spread: 0.3, life: 1.1, size: 5, sizeEnd: 12, gravity: -20 });
        if (p.kind === 'tar' && Math.random() < 0.02) AudioSys.sfx('plop', { vol: 0.15 });
      }
      if (!p.used && (hot || glint > 0.9)) {
        const r = { x: p.x - p.w / 2, y: p.y - p.h, w: p.w, h: p.h };
        Gfx.ctx.globalAlpha = hot ? 0.9 : 0.35;
        for (let k = 0; k < 6; k++) { const a = t * 3 + k * 1.047; Gfx.rect(r.x + r.w / 2 + Math.cos(a) * r.w * 0.55, r.y + r.h / 2 + Math.sin(a) * r.h * 0.55, 4, 4, '#ffe98a'); }
        Gfx.ctx.globalAlpha = 1;
      }
      // who has an eye on it
      if (p.eyed && p.eyed.alive && !p.used) {
        const e = p.eyed, a = { x: e.actor.x, y: e.actor.top + 20 }, c = { x: p.x, y: p.y - p.h / 2 };
        const n = 14, pulse = 0.6 + Math.sin(t * 8) * 0.4;
        for (let i = 1; i < n; i++) { const k = i / n; if (((i + (t * 10 | 0)) % 2)) Gfx.rectA(lerp(a.x, c.x, k) - 2, lerp(a.y, c.y, k) - Math.sin(k * Math.PI) * 40 - 2, 4, 4, '#ef6a5e', pulse); }
      }
    }
    // the swarm
    for (const s of S.bees || []) {
      const k = clamp(s.t / 0.7, 0, 1);
      const x = lerp(s.x, s.tx, Ease.inOutQuad(k)) + Math.sin(s.t * 20 + s.ph) * 10, y = lerp(s.y, s.ty, k) - Math.sin(k * Math.PI) * 60 + Math.cos(s.t * 17 + s.ph) * 8;
      Gfx.rect(x, y, 3, 2, '#120c16'); Gfx.rect(x + 1, y, 1, 2, '#ffe98a');
    }
  }
  // in front of everything: the corners of the land, framing the fight
  function drawFront(S) {
    const b = clamp(S.act, 1, BIOME_COUNT), c = corner(b), z = S.cam.zoom;
    const L = S.cam.toWorld(0, 0), R = S.cam.toWorld(W, 0);
    Pix.draw(c, L.x - 12, L.y - 4, { ax: 0, ay: 0, scale: 1 / z });
    Pix.draw(c, R.x + 12, L.y - 4, { ax: 0, ay: 0, sx: -1, scale: 1 / z });
  }
  // on the screen: what a prop costs and does, and whose eye is on it
  function drawUI(S) {
    if (!S.props) return;
    const hov = hover(S);
    for (const p of S.props) {
      if (p.used) continue;
      const r = rect(S, p), cx = r.x + r.w / 2;
      if (p.eyed && p.eyed.alive) {
        const pulse = Math.sin(S.t * 8) > 0, ex = r.x + r.w - 6, ey = r.y + 4;
        PixUI.panel('red', ex - 14, ey - 13 + (pulse ? -2 : 0), 28, 26, { seed: 4, hot: pulse });
        Gfx.text('!', ex, ey - 7 + (pulse ? -2 : 0), { color: '#fffaea', align: 'center', scale: 2, font: 'rock' });
      }
      if (!usable(S)) continue;
      const w = hov === p ? 96 : 40, y = p.front ? r.y + r.h + 4 : r.y - 28;
      PixUI.panel(hov === p ? 'woodhot' : 'wood', cx - w / 2, y, w, 24, { seed: 6, hot: hov === p });
      Gfx.sprite('icon_energy', cx - w / 2 + 14, y + 12, { anchor: 'c', scale: 0.9 });
      Gfx.text('1', cx - w / 2 + 28, y + 7, { color: '#fffaea', font: 'rock' });
      if (hov === p) Gfx.text(p.verb, cx + 14, y + 7, { color: '#fffaea', align: 'center', font: 'rock' });
    }
  }
  return { setup, update, click, eye, enemyTurn, drawFar, drawSky, drawProps, drawFront, drawUI, hover, KINDS, BY_BIOME };
})();
