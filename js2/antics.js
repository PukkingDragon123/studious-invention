// ---------------------------------------------------------------------------
// antics.js - the family has opinions about the die, and about the ground.
//
// Everybody throws the bone die their own way:
//   Bronk   tosses it high, winds up, and PUNCHES it across the board
//   Vela    blows it a kiss for luck and flicks it off one finger
//   Pebble  shakes it in both hands until he vibrates, then hurls it
//   Roxy    lifts it on a little gust of her own wind and drops it
// Then they react to what came up (a one gets a rain cloud, a six a victory
// dance), and to whatever tile they land on.
// ---------------------------------------------------------------------------
'use strict';

const Antics = (() => {
  const has = (B, clip) => !!SPRITES[B.hero.base + '_' + clip];
  const pose = (B, clip) => B.me.play(has(B, clip) ? clip : 'idle');
  const LINES = {
    bronk: { 1: 'UGH.', 2: 'HMPH.', 6: 'ROCK ON!', hi: 'GOOD HIT!' },
    vela: { 1: 'REALLY?', 2: 'FINE.', 6: 'OBVIOUSLY.', hi: 'NICE.' },
    pebble: { 1: 'NOOO!', 2: 'AWW.', 6: 'WHEEE!', hi: 'YES YES!' },
    roxy: { 1: 'WHATEVER.', 2: 'MEH.', 6: 'TOLD YOU.', hi: 'COOL.' },
  };
  const hop = function* (B, h, dur) { yield* Co.over(dur, k => { B.me.z = Math.sin(k * Math.PI) * h; }); B.me.z = 0; };
  const shoulder = B => ({ x: B.me.x + 40, y: Math.max(B.me.top - 18, B.cam.y - H / (2 * BZ) + 58) });

  // ---------------------------------------------------------------- throws
  function* throwDie(B, v) {
    const D = B.die, me = B.me, id = B.run.hero, rest = shoulder(B), hand = { x: me.x + me.facing * 10, y: me.top + 18 };
    if (id === 'bronk') {
      // up it goes...
      D.x = hand.x; D.y = hand.y; D.roll(v, 1.35); AudioSys.sfx('whoosh');
      me.stretch(0.25);
      yield* Co.over(0.42, k => { D.y = hand.y - Math.sin(k * Math.PI * 0.5) * 70; });
      // ...he winds up while it hangs there...
      me.squash(0.3); Emotes.show(me, 'anger', 0.6);
      yield* Co.over(0.3, k => { D.y = hand.y - 70 + k * k * 44; me.x -= me.facing * 0.6; });
      // ...and PUNCHES it
      yield* Co.over(0.06, k => { me.x += me.facing * 3; });
      AudioSys.sfx('bighit'); Juice.shake(8, 0.2); Juice.stop(0.08);
      Toon.word(D.x, D.y - 10, 'POW!', { size: 1.6, col: '#ffa832', tilt: -0.2, life: 0.8 });
      Particles.spawn(D.x, D.y, { n: 12, color: ['#fffaea', '#ffe98a'], speed: 200, life: 0.3, size: 3, sizeEnd: 0 });
      const x0 = D.x, y0 = D.y;
      yield* Co.over(0.35, k => { D.x = lerp(x0, rest.x + 30, k); D.y = lerp(y0, rest.y, k) - Math.sin(k * Math.PI) * 24; });
      yield* Co.over(0.2, k => { me.x -= me.facing * 1.5; D.x = lerp(rest.x + 30, rest.x, k); });
    } else if (id === 'vela') {
      D.x = hand.x; D.y = hand.y - 6; D.set(D.value || 1);
      // a kiss for luck
      Toon.hearts(me, 0.9); AudioSys.sfx('squeak', { vol: 0.5 });
      yield 0.45;
      D.roll(v, 1.0); AudioSys.sfx('click');
      me.stretch(0.15);
      yield* Co.over(0.7, k => { D.x = lerp(hand.x, rest.x, k); D.y = lerp(hand.y - 6, rest.y, k) - Math.sin(k * Math.PI) * 50; });
      Emotes.show(me, '!', 0.5);
    } else if (id === 'pebble') {
      // shake, shake, shake
      D.x = hand.x; D.y = hand.y; D.roll(v, 1.5); AudioSys.sfx('dice_roll');
      yield* Co.over(0.6, k => { const j = 3 + k * 4; me.x += rnd(-1, 1) * 0.8; D.x = hand.x + rnd(-j, j); D.y = hand.y + rnd(-j, j); me.sy = 1 + Math.sin(k * 60) * 0.06; });
      me.sy = 1; me.stretch(0.3); AudioSys.sfx('whoosh');
      // and hurl it: it bounces twice before it settles
      const x0 = D.x, y0 = D.y, floor = me.y - 6;
      yield* Co.over(0.3, k => { D.x = lerp(x0, rest.x + 50, k); D.y = lerp(y0, floor, k) - Math.sin(k * Math.PI) * 60; });
      AudioSys.sfx('dice_hit'); Particles.dust(D.x, floor + 8, 5); Toon.word(D.x, floor - 20, 'BOING', { size: 1.1, col: '#86e8d2', life: 0.6 });
      yield* Co.over(0.3, k => { D.x = lerp(rest.x + 50, rest.x, k); D.y = lerp(floor, rest.y, k) - Math.sin(k * Math.PI) * 30; });
      yield* hop(B, 10, 0.25);
    } else {
      // roxy: the wind does it for her
      D.x = hand.x; D.y = hand.y; D.roll(v, 1.4);
      AudioSys.sfx('whistle', { vol: 0.5 });
      yield* Co.over(0.85, k => {
        D.x = lerp(hand.x, rest.x, k) + Math.sin(k * 9) * 8 * (1 - k); D.y = lerp(hand.y, rest.y, k) - Math.sin(k * Math.PI) * 36;
        if (chance(0.5)) Particles.spawn(D.x + rnd(-14, 14), D.y + 12, { n: 1, color: ['#86e8d2', '#a8e878', '#fffaea'], speed: 30, angle: -Math.PI / 2, spread: 1.2, gravity: -20, life: 0.6, size: 3, sizeEnd: 0 });
      });
    }
    D.x = rest.x; D.y = rest.y;
    yield () => !D.busy;
  }

  // ------------------------------------------------------------ reactions
  function* react(B, v) {
    const me = B.me, L = LINES[B.run.hero] || LINES.bronk, hx = me.x, ty = me.top - 30;
    if (v <= 1) {
      pose(B, 'shock'); Toon.add('rain', me, { life: 1.6 }); AudioSys.sfx('sob', { vol: 0.5 });
      Toon.word(hx - 30, ty, L[1], { size: 1.2, col: '#6aa9ee', tilt: 0.1, life: 1.1 });
      yield* Co.over(0.5, k => { me.sy = 1 - Math.sin(k * Math.PI) * 0.12; });
      me.sy = 1; pose(B, 'idle');
    } else if (v <= 3) {
      Emotes.show(me, '?', 0.8); Toon.word(hx - 30, ty, L[2], { size: 1, col: '#a79bb4', life: 0.8 });
      me.squash(0.1); yield 0.35;
    } else if (v <= 5) {
      Toon.word(hx - 30, ty, L.hi, { size: 1.1, col: '#a8e878', life: 0.8 });
      yield* hop(B, 8, 0.25);
    } else {
      // a six: a proper little dance
      AudioSys.sfx('cheer', { vol: 0.6 }); Toon.hearts(me, 1.2);
      Toon.word(hx - 30, ty - 6, L[6], { size: 1.5, col: '#ffe98a', tilt: -0.12, life: 1.2 });
      for (let i = 0; i < 10; i++) Particles.confetti(hx + rnd(-30, 30), me.top - 10, 1);
      for (let i = 0; i < 2; i++) { me.facing *= -1; yield* hop(B, 16, 0.26); }
      pose(B, has(B, 'play') ? 'play' : 'idle'); yield 0.3; pose(B, 'idle');
    }
  }

  // ------------------------------------------------ what the tile does to you
  function* tile(B, kind) {
    const me = B.me, cat = KIND_PAINT[kind];
    if (!cat) return;
    if (cat === 'reward') { yield* hop(B, 10, 0.25); Particles.sparkle(me.x, me.top, 8, ['#ffe98a', '#ffffff']); if (kind === 'berries' || kind === 'meat') Toon.word(me.x + 24, me.top - 16, 'YUM!', { size: 1.1, col: '#ef6a5e', life: 0.7 }); }
    else if (cat === 'danger') { Toon.stars(me, 1.2); Toon.sweat(me, 1); me.squash(0.25); Toon.word(me.x + 24, me.top - 16, kind === 'tar' ? 'SQUELCH' : 'OUCH!', { size: 1.1, col: '#ef6a5e', tilt: 0.14, life: 0.7 }); yield 0.2; }
    else if (cat === 'fight') { Toon.steam(me, 1.1); Emotes.show(me, 'anger', 0.8); me.stretch(0.2); AudioSys.sfx('growl', { vol: 0.4 }); Toon.word(me.x + 24, me.top - 16, 'BRING IT!', { size: 1.2, col: '#ffa832', tilt: -0.1, life: 0.8 }); yield 0.45; }
    else if (cat === 'mystery') { Emotes.show(me, '?', 0.9); Toon.sweat(me, 0.8); yield 0.35; }
    else if (cat === 'service') { yield* hop(B, 6, 0.2); Toon.hearts(me, 0.8); }
    else if (cat === 'move') { Toon.shock(me, 0.5); Toon.word(me.x + 24, me.top - 16, 'WHOA!', { size: 1.1, col: '#86e8d2', life: 0.6 }); yield 0.2; }
    else if (cat === 'boss') { Toon.shock(me, 0.8); Toon.sweat(me, 1.4); AudioSys.sfx('gulp'); yield 0.4; }
  }
  return { throwDie, react, tile };
})();
