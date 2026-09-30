// ---------------------------------------------------------------------------
// gore.js - it is a fight. Things bleed.
//
//   spray   drops of blood that arc out of a hit and splat where they land,
//           leaving stains on the ground that stay for the rest of the fight
//   pool    a slick that spreads out under a body
//   lens    blood on the camera itself, for the big ones, running down
//   cut     a beast cut into pieces: every piece is a real piece of its
//           sprite with a raw red edge where it was cut, and they fly, spin,
//           bounce and lie where they fall
//
// And the fatalities: each hero finishes the last beast their own way.
// ---------------------------------------------------------------------------
'use strict';

const Gore = (() => {
  const RED = ['#6e0f18', '#9c1a24', '#c2333c', '#ef6a5e'];
  const BLOOD = {
    tarblob: ['#120c16', '#241c2e', '#3b3048', '#574a66'],
    lizard: ['#9c3510', '#e06a1b', '#ffa832', '#ffe98a'],
  };
  let drops = [], decals = [], chunks = [], lens = [], ground = 430;
  const colOf = e => (e && e.def && (BLOOD[e.def.base] || BLOOD[e.def.id])) || RED;
  // stains, painted once per shape and colour
  const splat = (i, col) => Pix.make('splat' + i + col[1], 22, 10, P => {
    const R = [col[0], col[0], col[1], col[1], col[2]];
    for (let k = 0; k < 5 + i; k++) {
      const x = 11 + (P.hash(k, i, 3) - 0.5) * 14, y = 5 + (P.hash(k, i, 7) - 0.5) * 4, r = 1.2 + P.hash(k, i, 9) * 2.6;
      P.ball(x, y, r * 1.4, R, r * 0.6);
    }
  }, { ink: false });
  const pool = (w, col) => Pix.make('pool' + w + col[1], w, Math.max(6, (w / 4) | 0), P => {
    const h = P.h, R = [col[0], col[0], col[0], col[1], col[2]];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const nx = (x + 0.5 - w / 2) / (w / 2), ny = (y + 0.5 - h / 2) / (h / 2);
      const edge = 1 + Math.sin(x * 0.7) * 0.08 + Math.sin(x * 0.23 + 1) * 0.1;
      if (nx * nx + ny * ny > edge) continue;
      P.put(x, y, R[clamp(Math.floor((0.4 - ny * 0.35 + (nx < -0.2 && ny < 0 ? 0.3 : 0)) * 5 + P.dith(x, y)), 0, 4)]);
    }
  }, { ink: false });

  function clear() { drops = []; decals = []; chunks = []; lens = []; }
  function setGround(y) { ground = y; }
  // an arc of drops out of a wound; dir is the angle they fly, power scales it
  function spray(x, y, o = {}) {
    const col = o.col || RED, n = o.n || 12, dir = o.dir ?? -Math.PI / 2, spread = o.spread ?? 0.9;
    for (let i = 0; i < n; i++) {
      const a = dir + rnd(-spread, spread), sp = rnd(0.35, 1) * (o.speed || 260);
      drops.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, c: col[(Math.random() * 3) | 0 + 0], s: chance(0.3) ? 3 : 2, g: o.ground ?? ground + rnd(-6, 14), col });
    }
  }
  function stain(x, y, col, big) { decals.push({ x, y, spr: splat((Math.random() * 4) | 0, col), s: big ? 1.4 : rnd(0.6, 1.1), flip: chance(0.5), a: 1 }); if (decals.length > 160) decals.shift(); }
  function spreadPool(x, y, col, w = 60) { decals.push({ x, y, pool: true, w, col, t: 0, a: 1 }); }
  function splash(n = 5, col = RED) {
    for (let i = 0; i < n; i++) lens.push({ x: rnd(40, W - 40), y: rnd(30, H - 120), r: rnd(6, 20), t: 0, life: rnd(1.4, 2.4), col, drips: [0, 0, 0].map(() => ({ dx: rnd(-0.6, 0.6), len: 0, v: rnd(8, 30) })) });
    if (lens.length > 24) lens.splice(0, lens.length - 24);
  }
  // one frame of a sprite, facing the way it is drawn, as a canvas we can cut
  function frameCanvas(name, frame, flip) {
    const s = Gfx.spr(name), src = s.frames[Math.floor(frame || 0) % s.frames.length];
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const g = c.getContext('2d');
    if (flip) { g.translate(c.width, 0); g.scale(-1, 1); }
    g.drawImage(src, 0, 0);
    return c;
  }
  // cut a piece out of a frame, and paint the raw edge along the cut sides
  function piece(src, sx, sy, sw, sh, cutL, cutR, cutT, cutB, col) {
    const c = document.createElement('canvas'); c.width = sw; c.height = sh;
    const g = c.getContext('2d'); g.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);
    const d = g.getImageData(0, 0, sw, sh), px = d.data;
    const raw = [[col[1], 2], [col[2], 1], ['#ffb0a8', 0]].map(([h]) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
    const edge = (x, y) => (cutL && x < 2) || (cutR && x >= sw - 2) || (cutT && y < 2) || (cutB && y >= sh - 2);
    let solid = 0;
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4; if (px[i + 3] < 20) continue; solid++;
      if (edge(x, y)) { const r = raw[(x + y) % 5 === 0 ? 2 : (x + y) % 2]; px[i] = r[0]; px[i + 1] = r[1]; px[i + 2] = r[2]; px[i + 3] = 255; }
    }
    g.putImageData(d, 0, 0);
    return solid > 6 ? c : null;
  }
  // throw a cut piece into the world: it flies, spins, bounces, bleeds, rests
  function fling(cv, x, y, scale, vx, vy, vr, col, o = {}) {
    chunks.push({ cv, x, y, s: scale, vx, vy, rot: o.rot || 0, vr, col, g: o.ground ?? ground + rnd(-4, 10), rest: false, bleed: o.bleed ?? 1.2, hold: o.hold || 0 });
  }
  // cut a whole beast into a grid of pieces and blow them apart from (cx, cy)
  function gib(name, frame, scale, flip, x, footY, col, cols = 4, rows = 3, power = 1) {
    const src = frameCanvas(name, frame, flip), w = src.width, h = src.height;
    const cw = Math.ceil(w / cols), ch = Math.ceil(h / rows), left = x - w * scale / 2, top = footY - h * scale;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const sw = Math.min(cw, w - c * cw), sh = Math.min(ch, h - r * ch); if (sw <= 0 || sh <= 0) continue;
      const cv = piece(src, c * cw, r * ch, sw, sh, c > 0, c < cols - 1, r > 0, r < rows - 1, col); if (!cv) continue;
      const px = left + (c * cw + sw / 2) * scale, py = top + (r * ch + sh / 2) * scale;
      const a = Math.atan2(py - (footY - h * scale * 0.5), px - x) + rnd(-0.3, 0.3), sp = rnd(160, 340) * power;
      fling(cv, px, py, scale, Math.cos(a) * sp, Math.sin(a) * sp - rnd(120, 260) * power, rnd(-9, 9), col);
    }
    spray(x, footY - h * scale * 0.5, { n: 40, col, speed: 380 * power, spread: Math.PI });
  }
  // two halves, down the middle, that fall away from each other
  function halve(name, frame, scale, flip, x, footY, col) {
    const src = frameCanvas(name, frame, flip), w = src.width, h = src.height, half = Math.floor(w / 2);
    const L = piece(src, 0, 0, half, h, false, true, false, false, col), R = piece(src, half, 0, w - half, h, true, false, false, false, col);
    const cy = footY - h * scale / 2;
    if (L) fling(L, x - half * scale / 2, cy, scale, -70, -40, -1.4, col, { hold: 0.35, bleed: 2.5 });
    if (R) fling(R, x + (w - half) * scale / 2, cy, scale, 70, -40, 1.4, col, { hold: 0.35, bleed: 2.5 });
  }
  // the head off, and what is left standing
  function behead(name, frame, scale, flip, x, footY, col) {
    const src = frameCanvas(name, frame, flip), w = src.width, h = src.height, cut = Math.floor(h * 0.38);
    const head = piece(src, 0, 0, w, cut, false, false, false, true, col), body = piece(src, 0, cut, w, h - cut, false, false, true, false, col);
    if (head) fling(head, x, footY - h * scale + cut * scale / 2, scale, rnd(-60, 60), -560, rnd(-12, 12), col, { bleed: 3 });
    if (body) fling(body, x, footY - (h - cut) * scale / 2, scale, 0, 0, 0, col, { hold: 1.4, bleed: 0, stand: true });
    return { neckX: x, neckY: footY - (h - cut) * scale };
  }
  function update(dt) {
    for (const d of drops) {
      d.vy += 900 * dt; d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.y >= d.g) { d.dead = true; if (chance(0.45)) stain(d.x, d.g, d.col); }
    }
    drops = drops.filter(d => !d.dead);
    if (drops.length > 600) drops.splice(0, drops.length - 600);
    for (const c of chunks) {
      if (c.hold > 0) { c.hold -= dt; if (c.bleed > 0 && chance(dt * 20)) spray(c.x, c.y - 4, { n: 2, col: c.col, speed: 120, dir: -Math.PI / 2, spread: 0.6 }); continue; }
      if (c.rest) continue;
      c.vy += 900 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt;
      if (c.bleed > 0 && chance(dt * 30)) drops.push({ x: c.x, y: c.y, vx: rnd(-20, 20), vy: 0, c: c.col[1], s: 2, g: c.g, col: c.col });
      if (c.y >= c.g) {
        if (Math.abs(c.vy) > 160) { c.y = c.g; c.vy *= -0.32; c.vx *= 0.6; c.vr *= 0.5; stain(c.x, c.g, c.col, true); AudioSys.sfx('squeak', { vol: 0.15 }); }
        else { c.y = c.g; c.rest = true; c.rot = Math.round(c.rot / (Math.PI / 2)) * (Math.PI / 2) * 0.2 + c.rot * 0.8; spreadPool(c.x, c.g + 2, c.col, 22 + (c.cv.width * c.s * 0.4 | 0)); }
      }
    }
    for (const p of decals) if (p.pool && p.t < 1) p.t = Math.min(1, p.t + dt * 0.5);
    for (const L of lens) { L.t += dt; for (const d of L.drips) { d.len += d.v * dt; } }
    lens = lens.filter(L => L.t < L.life);
  }
  // under everyone: the stains and the pools
  function drawGround() {
    for (const p of decals) {
      if (p.pool) { const w = Math.round(p.w * (0.3 + 0.7 * Ease.outCubic(p.t)) / 2) * 2; if (w >= 6) Pix.draw(pool(w, p.col), p.x, p.y, { scale: 0.5, ay: 0.5 }); }
      else Pix.draw(p.spr, p.x, p.y, { scale: p.s * 0.5, sx: p.flip ? -1 : 1 });
    }
  }
  // the pieces, and the drops in the air
  function drawChunks() {
    const ctx = Gfx.ctx, sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    for (const c of chunks) {
      ctx.save(); ctx.translate(Math.round(c.x), Math.round(c.y)); ctx.rotate(c.rot);
      const w = c.cv.width * c.s, h = c.cv.height * c.s;
      ctx.drawImage(c.cv, Math.round(-w / 2), Math.round(c.rest ? -h : -h / 2), w, h);
      ctx.restore();
    }
    ctx.imageSmoothingEnabled = sm;
    for (const d of drops) Gfx.rect(Math.round(d.x), Math.round(d.y), d.s, d.s + 1, d.c);
  }
  // on the lens: splats that run
  function drawLens() {
    const ctx = Gfx.ctx;
    for (const L of lens) {
      const a = clamp(1 - (L.t - L.life * 0.6) / (L.life * 0.4), 0, 1) * 0.85;
      ctx.globalAlpha = a;
      Pix.draw(splat(((L.r * 7) | 0) % 4, L.col), L.x, L.y, { scale: L.r / 9 });
      for (const d of L.drips) Gfx.rect(Math.round(L.x + d.dx * L.r), Math.round(L.y), 3, Math.round(d.len), L.col[1]);
      ctx.globalAlpha = 1;
    }
  }
  return { clear, setGround, spray, stain, pool: spreadPool, splash, gib, halve, behead, frameCanvas, update, drawGround, drawChunks, drawLens, colOf, RED };
})();

// ---------------------------------------------------------------------------
// The fatality: the last beast standing, dazed, and each hero's own finish.
// ---------------------------------------------------------------------------
const Fatality = {
  *run(S, e) {
    const a = e.actor, me = S.me, col = Gore.colOf(e), id = (S.heroDef && S.heroDef.id) || 'bronk';
    const spr = a.sprite, frame = a.frame, sc = a.scale, fy = a.y;
    Toon.drop(a);
    S.fatal = { dark: 0, word: null, t: 0 };
    AudioSys.stop(0.4);
    Juice.letterbox(true);
    S.cam.lookAt(lerp(me.x, a.x, 0.55), fy - 60); S.cam.zoomTo(1.45);
    // FINISH IT
    AudioSys.sfx('roar', { pitch: 38, len: 1.2, vol: 0.8 });
    yield* Co.over(0.5, k => { S.fatal.dark = k * 0.72; });
    S.fatal.word = { text: 'FINISH IT!', t: 0, col: '#ef6a5e' };
    yield 0.9;
    S.fatal.word = null;
    // walk up to it
    const home = me.x, to = a.x - Gfx.spr(spr).w * sc * 0.45 - 40;
    me.play(Heroes.has(id, 'walk') ? 'walk' : 'idle');
    yield* Co.over(0.45, k => { me.x = lerp(home, to, Ease.inOutQuad(k)); });
    me.play('idle');
    const neck = { x: a.x, y: fy - Gfx.spr(spr).h * sc * 0.62 };
    if (id === 'bronk') {
      // up, and down, with the whole Rib-Axe
      me.stretch(0.4); AudioSys.sfx('whoosh');
      yield* Co.over(0.35, k => { me.z = Math.sin(k * Math.PI * 0.5) * 90; });
      Juice.stop(0.12);
      yield* Co.over(0.1, k => { me.z = 90 * (1 - k); me.x = lerp(to, a.x - 30, k); });
      me.z = 0; me.squash(0.4);
      AudioSys.sfx('bighit'); AudioSys.sfx('crunch'); Juice.shake(18, 0.5); Juice.flash('#ffffff', 0.5, 5); Juice.stop(0.25);
      e.gibbed = true;
      Gore.halve(spr, frame, sc, true, a.x, fy, col);
      Gore.spray(a.x, fy - Gfx.spr(spr).h * sc * 0.5, { n: 60, col, speed: 420, spread: Math.PI });
      Gore.splash(8, col);
      yield 1.2;
    } else if (id === 'vela') {
      // one note on the Tusk Horn, held until something gives
      me.play(Heroes.has(id, 'play') ? 'play' : 'idle'); AudioSys.sfx('horn', { vol: 1 });
      yield* Co.over(1.1, k => { a.sx = 1 + k * 0.5 + Math.sin(k * 60) * 0.04 * k; a.sy = 1 + k * 0.45; e.hitT = k > 0.6 ? 0.1 : 0; Juice.shake(2 + k * 6, 0.1); });
      a.sx = a.sy = 1;
      AudioSys.sfx('bighit'); AudioSys.sfx('splash'); Juice.shake(20, 0.6); Juice.flash('#ef6a5e', 0.5, 4); Juice.stop(0.2);
      e.gibbed = true;
      Gore.gib(spr, frame, sc, true, a.x, fy, col, 4, 4, 1.3);
      Gore.splash(12, col);
      yield 1.3;
    } else if (id === 'pebble') {
      // a drum solo on its skull
      for (let i = 0; i < 6; i++) {
        me.squash(0.15); AudioSys.sfx('hit', { vol: 0.8 }); Juice.shake(4, 0.08); e.hitT = 0.08; a.sy = 0.9;
        Gore.spray(neck.x, neck.y - 20, { n: 5, col, speed: 180, dir: -Math.PI / 2 - 0.6 });
        yield 0.12; a.sy = 1;
      }
      AudioSys.sfx('bighit'); Juice.shake(16, 0.5); Juice.stop(0.2); Juice.flash('#ffffff', 0.4, 5);
      e.gibbed = true;
      Profile.add('beheads');
      const n2 = Gore.behead(spr, frame, sc, true, a.x, fy, col);
      for (let i = 0; i < 24; i++) { Gore.spray(n2.neckX, n2.neckY, { n: 6, col, speed: 420, dir: -Math.PI / 2, spread: 0.35 }); yield 0.05; }
      Gore.splash(6, col);
      yield 0.6;
    } else {
      // roxy: the sky answers the flute
      me.play(Heroes.has(id, 'play') ? 'play' : 'idle'); AudioSys.sfx('whistle');
      yield 0.5;
      S.fatal.bolt = { x: a.x, t: 0 };
      AudioSys.sfx('thunder'); AudioSys.sfx('zap'); Juice.flash('#e8f4ff', 0.8, 3); Juice.shake(18, 0.6);
      e.charred = 1;
      for (let i = 0; i < 20; i++) { Particles.spawn(a.x + rnd(-30, 30), fy - rnd(10, 80), { n: 1, color: ['#3b3048', '#574a66', '#ffa832'], speed: 40, angle: -Math.PI / 2, spread: 0.6, gravity: -30, life: 1.4, size: 6, sizeEnd: 14 }); }
      yield 0.8;
      S.fatal.bolt = null;
      AudioSys.sfx('crunch');
      e.gibbed = true;
      Gore.gib(spr, frame, sc, true, a.x, fy, ['#120c16', '#241c2e', '#3b3048', '#574a66'], 3, 3, 0.5);
      Gore.spray(a.x, fy - 30, { n: 30, col, speed: 200, spread: Math.PI });
      yield 1.1;
    }
    me.play('idle');
    // FATALITY
    AudioSys.sfx('roar', { pitch: 32, len: 1.6, vol: 0.9 });
    S.fatal.word = { text: 'FATALITY', t: 0, col: '#c2333c', big: true };
    if (S.run && S.run.stats) S.run.stats.fatalities = (S.run.stats.fatalities || 0) + 1;
    if (typeof Profile !== 'undefined') Profile.add('fatalities', 1);
    yield 1.8;
    S.fatal.word = null;
    yield* Co.over(0.4, k => { S.fatal.dark = 0.72 * (1 - k); });
    S.fatal = null;
    yield* Co.over(0.3, k => { me.x = lerp(me.x, home, k); });
    me.x = home;
  },
  // the big red words, and the darkness round the stage, over the scene
  draw(S) {
    const F = S.fatal; if (!F) return;
    if (F.bolt) {
      F.bolt.t += Time.dt;
      const p = S.cam.toScreen(F.bolt.x, 0); let x = p.x, y = 0;
      while (y < H - 140) { const nx = x + rnd(-26, 26), ny = y + rnd(20, 40); for (let k = 0; k < 8; k++) Gfx.rect(Math.round(lerp(x, nx, k / 8)) - 3, Math.round(lerp(y, ny, k / 8)), 6, 6, k % 2 ? '#ffffff' : '#a8d8ff'); x = nx; y = ny; }
    }
    if (F.word) {
      F.word.t += Time.dt;
      const w = F.word, k = Ease.outBack(clamp(w.t * 3, 0, 1)), sc = w.big ? 6 : 4;
      const ctx = Gfx.ctx;
      ctx.save(); ctx.translate(W / 2, H / 2 - 40); ctx.scale(k, k);
      const th = Gfx.lineHeight(sc, 'rock');
      Gfx.text(w.text, 4, -th / 2 + 5, { color: '#120c16', align: 'center', scale: sc, font: 'rock' });
      Gfx.text(w.text, 0, -th / 2, { color: w.col, align: 'center', scale: sc, font: 'rock' });
      // it drips
      const tw = Gfx.measure(w.text, sc, 'rock');
      for (let i = 0; i < 9; i++) { const dx = -tw / 2 + (i + 0.5) * tw / 9 + Math.sin(i * 7.1) * 8, len = Math.min(60, w.t * (20 + (i * 13) % 30)); Gfx.rect(Math.round(dx), Math.round(th / 2 - 8), 4, Math.round(len), w.col); Gfx.rect(Math.round(dx) - 1, Math.round(th / 2 - 8 + len), 6, 5, w.col); }
      ctx.restore();
    }
  },
};
