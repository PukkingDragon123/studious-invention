// ---------------------------------------------------------------------------
// cutscene.js - the cinematic opening: sets, staged actors, camera work and
// the four mini-games, all driven by one coroutine script.
// ---------------------------------------------------------------------------
'use strict';

// A "set" is a painted backdrop in world coordinates the camera moves around.
const Sets = {
  house_ext(t, o = {}) {
    const dawn = o.dusk
      ? ['#2a1430', '#5c1f3d', '#a03a68', '#e06a1b', '#ffa832']
      : ['#1d3d72', '#3570c0', '#6aa9ee', '#ffb0cf', '#ffe08a'];
    Gfx.bands(-200, -420, 1800, 560, dawn);
    if (!o.dusk) { Gfx.circle(520, 30, 26, '#ffe98a'); Gfx.circle(512, 22, 8, '#fffaea'); }
    else { Gfx.circle(1120, 10, 30, '#ef6a5e'); }
    // hills
    const ctx = Gfx.ctx;
    ctx.fillStyle = o.dusk ? '#3f0e18' : '#27632f';
    ctx.beginPath(); ctx.moveTo(-200, 140);
    for (let x = -200; x <= 1600; x += 40) ctx.lineTo(x, 80 + Math.sin(x * 0.006) * 46 + Math.sin(x * 0.017) * 18);
    ctx.lineTo(1600, 300); ctx.lineTo(-200, 300); ctx.fill();
    ctx.fillStyle = o.dusk ? '#58203c' : '#3f9a45';
    ctx.beginPath(); ctx.moveTo(-200, 170);
    for (let x = -200; x <= 1600; x += 40) ctx.lineTo(x, 132 + Math.sin(x * 0.01 + 2) * 26);
    ctx.lineTo(1600, 320); ctx.lineTo(-200, 320); ctx.fill();
    Gfx.rect(-200, 176, 1800, 220, o.dusk ? '#3a2415' : '#5c3a20');
    Gfx.rect(-200, 176, 1800, 5, o.dusk ? '#5c3a20' : '#85562f');
    for (let x = -160; x < 1600; x += 64) Gfx.sprite(((x / 64) | 0) % 3 === 0 ? 'prop_bush' : 'prop_fern', x, 186, { anchor: 'bc', alpha: 0.9 });
    Gfx.sprite('prop_palm', 80, 182, { anchor: 'bc' });
    Gfx.sprite('prop_tree', 760, 184, { anchor: 'bc' });
    Gfx.sprite(o.wreck ? 'prop_hut_ruin' : 'prop_hut', 420, 190, { anchor: 'bc', scale: 2 });
    Gfx.sprite('prop_totem', 250, 188, { anchor: 'bc' });
    if (!o.wreck) for (let i = 0; i < 2; i++) if (chance(0.3)) Particles.spawn(420 + rnd(-6, 6), 20, { n: 1, color: ['#9391a6', '#7a6d8a'], speed: 10, gravity: -18, life: 2.4, size: 4, sizeEnd: 0 });
    if (o.wreck) {
      for (let i = 0; i < 3; i++) if (chance(0.5)) Particles.fire(420 + rnd(-70, 70), 180 + rnd(-30, 10), 1);
      for (let i = 0; i < 2; i++) if (chance(0.4)) Particles.spawn(420 + rnd(-80, 80), 120, { n: 1, color: ['#3b3048', '#574a66'], speed: 12, gravity: -20, life: 3, size: 7, sizeEnd: 0 });
    }
  },
  house_int(t, o = {}) {
    // wall above, floor below, a clear skirting line between them
    Gfx.rect(-200, -300, 1400, 500, '#241c2e');
    for (let y = -160; y < 190; y += 40) for (let x = -200; x < 1200; x += 32) Gfx.sprite('house_wall', x, y, { anchor: 'tl' });
    Gfx.rectA(-200, -300, 1400, 500, '#120c16', 0.42);       // walls sit in shadow
    for (let y = 190; y < 460; y += 32) for (let x = -200; x < 1200; x += 32) Gfx.sprite('house_floor', x, y, { anchor: 'tl' });
    Gfx.rect(-200, 182, 1400, 8, '#120c16');
    Gfx.rectA(-200, 190, 1400, 10, '#000000', 0.3);
    Gfx.rectA(-200, 190, 1400, 260, '#e06a1b', 0.05);
    Gfx.sprite('house_shelf', 150, 176, { anchor: 'bc' });
    Gfx.sprite('house_bed', 930, 268, { anchor: 'bc' });
    Gfx.sprite('house_table', 470, 272, { anchor: 'bc' });
    Gfx.sprite('stove_pit', 720, 250, { anchor: 'bc' });
    Gfx.sprite('prop_pot', 215, 252, { anchor: 'bc' });
    Gfx.sprite('prop_barrel', 60, 254, { anchor: 'bc' });
    if (o.fire > 0) {
      for (let i = 0; i < 3; i++) if (chance(o.fire)) Particles.fire(720 + rnd(-26, 26), 228, 1);
      Gfx.glow(720, 210, 240, '#ff9a20', 0.22 * o.fire * (0.85 + Math.sin(t * 9) * 0.15));
    }
  },
  shower(t) {
    Gfx.bands(-200, -300, 1600, 480, ['#1d3d72', '#3570c0', '#6aa9ee', '#a8d8ff']);
    Gfx.rect(-200, 176, 1600, 300, '#5c3a20');
    Gfx.rect(-200, 176, 1600, 5, '#85562f');
    for (let x = -160; x < 1300; x += 96) Gfx.sprite('prop_fern', x, 188, { anchor: 'bc', alpha: 0.9 });
    Gfx.sprite('shower_frame', 470, 196, { anchor: 'bc' });
    Gfx.sprite('prop_palm', 220, 186, { anchor: 'bc' });
    Gfx.sprite('prop_palm', 760, 190, { anchor: 'bc', flip: true });
  },
};

class CutsceneScene {
  constructor(script, o = {}) {
    this.scriptFn = script; this.o = o;
    this.cam = new Camera(); this.cam.zoom = 1.6;
    this.actors = {}; this.set = 'house_ext'; this.setOpt = {};
    this.t = 0; this.fade = 1; this.fadeTarget = 0; this.title = null; this.skipT = 0;
    this.done = false; this.hud = null;
  }
  enter() {
    Game.worldToScreen = (x, y) => this.cam.toScreen(x, y);
    Juice.letterbox(true);
    this.co = Co.run(this.scriptFn.call(this, this), this);
  }
  exit() { Game.worldToScreen = null; Juice.letterbox(false); Dialogue.clear(); }
  // ---------------------------------------------------------------- helpers
  add(key, o) { const a = new Actor(o); this.actors[key] = a; return a; }
  get(key) { return this.actors[key]; }
  *say(who, text, o = {}) {
    const at = o.at === undefined ? this.actors[who.toLowerCase()] : o.at;
    yield* Dialogue.say(who, text, Object.assign({ at }, o));
  }
  *titleCard(text, sub, dur = 2.6) {
    this.title = { text, sub, t: 0, life: dur };
    yield dur;
    this.title = null;
  }
  *fadeOut(d = 0.6) { this.fadeTarget = 1; yield d; }
  *fadeIn(d = 0.6) { this.fadeTarget = 0; yield d; }
  *cut(set, opt = {}) { this.set = set; this.setOpt = opt; yield 0; }
  *walk(key, x, y, speed) {
    const a = this.actors[key]; a.play('walk');
    while (!a.moveTo(x, y ?? a.y, Time.dt, speed || a.speed)) yield 0;
    a.play('idle');
  }
  // --------------------------------------------------------------- lifecycle
  update(dt) {
    this.t += dt;
    this.fade = damp(this.fade, this.fadeTarget, 6, dt);
    this.cam.update(dt);
    for (const k in this.actors) this.actors[k].update(dt);
    Dialogue.update();
    if (this.title) this.title.t += dt;
    if (Game.mini) Game.mini.step && null;
    // skip: hold to fast-forward the whole opening
    if (Input.isDown('Escape') || (Input.touch && UI.hovered(W - 130, 12, 116, 34) && Input.down)) {
      this.skipT += dt;
      if (this.skipT > 0.9 && this.o.onSkip) { this.skipT = -99; this.o.onSkip(); }
    } else this.skipT = Math.max(0, this.skipT - dt * 2);
  }
  draw() {
    Gfx.clear('#120c16');
    this.cam.apply(Gfx.ctx);
    (Sets[this.set] || Sets.house_ext)(this.t, this.setOpt);
    const list = Object.values(this.actors).filter(a => a.visible).map(a => ({ y: a.y, a }));
    list.sort((p, q) => p.y - q.y);
    for (const it of list) it.a.draw();
    Particles.draw(Gfx.ctx, true);
    FX.draw(true);
    Popups.draw(true);
    Emotes.draw();
    Floaters.draw();
    this.cam.restore(Gfx.ctx);
    Particles.draw(Gfx.ctx, false);
    FX.draw(false);
    Popups.draw(false);
    if (Game.mini) Game.mini.draw();
    if (this.hud) this.hud();
    Dialogue.draw();
    if (this.title) {
      const k = this.title.t / this.title.life;
      const a = k < 0.12 ? k / 0.12 : k > 0.82 ? (1 - k) / 0.18 : 1;
      Gfx.ctx.globalAlpha = clamp(a, 0, 1);
      Gfx.rectA(0, H / 2 - 70, W, 140, '#120c16', 0.8);
      const slide = Ease.outCubic(clamp(k * 5, 0, 1));
      Gfx.text(this.title.text, W / 2 - (1 - slide) * 30, H / 2 - 34, { color: '#ffe98a', align: 'center', scale: 3.4, outline: true, outlineWidth: 2 });
      if (this.title.sub) Gfx.text(this.title.sub, W / 2 + (1 - slide) * 30, H / 2 + 14, { color: '#d6cfe0', align: 'center', scale: 1.4 });
      Gfx.ctx.globalAlpha = 1;
    }
    if (this.fade > 0.01) Gfx.rectA(0, 0, W, H, '#120c16', clamp(this.fade, 0, 1));
    if (this.o.onSkip) {
      const holding = this.skipT > 0;
      UI.button(W - 130, 12, 116, 34, holding ? 'SKIPPING' : 'HOLD ESC', () => { }, { fill: '#241c2e', scale: 1 });
      if (holding) Gfx.bar(W - 126, 42, 108, 5, clamp(this.skipT / 0.9, 0, 1), '#ffe98a');
    }
  }
  click() { }
}

// ---------------------------------------------------------------------------
// THE OPENING
// ---------------------------------------------------------------------------
function* introScript(S) {
  const run = Game.run;
  // ------------------------------------------------------------ 1. dawn
  S.set = 'house_ext'; S.setOpt = {};
  S.cam.zoom = 2.2; S.cam.lookAt(420, 120, true);
  AudioSys.play('home', { fade: 1.2 });
  yield* S.fadeIn(1.2);
  yield 0.6;
  yield* S.titleCard('ROCK BOTTOM', '10,000 BC. a tuesday.', 2.8);
  S.cam.zoomTo(1.5); S.cam.lookAt(420, 110);
  const pt = S.add('ptero', { base: 'ptero', x: -60, y: -30, scale: 1, shadow: false });
  pt.clipName = ''; pt.play('fly');
  Co.run(function* () { for (let i = 0; i < 300; i++) { pt.x += Time.dt * 260; pt.y = -40 + Math.sin(Time.t * 3) * 14; yield 0; } }());
  yield 0.5; AudioSys.sfx('roar', { pitch: 420, vol: 0.5, len: 0.5 });
  yield 1.6;
  pt.visible = false;
  yield* S.fadeOut(0.5);

  // ------------------------------------------------------------ 2. kitchen
  yield* S.cut('house_int', { fire: 0 });
  S.cam.zoom = 1.45; S.cam.lookAt(470, 250, true);
  const bronk = S.add('bronk', { base: 'bronk', x: 300, y: 300, scale: 1 });
  const vela = S.add('vela', { base: 'vela', x: 520, y: 300, scale: 1, facing: 1 });
  const blaze = S.add('blaze', { base: 'blaze', x: 726, y: 298, scale: 1, facing: -1 });
  blaze.play('idle');
  yield* S.fadeIn(0.6);
  yield 0.5;
  yield* S.say('VELA', "Bronk. The stove's gone out. Again.", { at: vela });
  bronk.play('idle'); bronk.facing = 1;
  yield* S.say('BRONK', "That stove is the laziest animal in this valley.", { at: bronk });
  S.cam.lookAt(690, 250); S.cam.zoomTo(1.9);
  yield 0.7;
  Emotes.show(blaze, 'anger', 1.6); AudioSys.sfx('detect');
  yield* S.say('', "BLAZE the cook-fire raptor has been chained to this pit for six years. He has opinions about it.", { at: blaze, portrait: 'blaze_idle' });
  S.cam.zoomTo(1.5); S.cam.lookAt(540, 250);
  yield 0.3;
  // --- minigame 1
  const bell = yield* new BellowsGame({}).run();
  S.setOpt = { fire: bell && bell.win ? 1 : 0.4 };
  blaze.flash('#ffa832', 0.3);
  Juice.flash('#ffa832', 0.45, 3);
  AudioSys.sfx('fire_whoosh');
  Particles.fire(720, 228, 26);
  if (bell && bell.win) yield* S.say('VELA', "There he goes. Breakfast in two shakes.", { at: vela });
  else yield* S.say('VELA', "Half a flame. Half a breakfast. Well done.", { at: vela });
  Emotes.show(blaze, 'anger', 2);
  yield 0.4;

  // ------------------------------------------------------------ 3. breakfast
  S.cam.lookAt(470, 250); S.cam.zoomTo(1.7);
  const kidA = S.add('kida', { base: 'kid_a', x: 382, y: 302, scale: 1 });
  const kidB = S.add('kidb', { base: 'kid_b', x: 560, y: 304, scale: 1, facing: -1 });
  yield* S.say('VELA', "BREAKFAST! Sit down before these two eat the bone as well.", { at: vela });
  bronk.x = 470; bronk.y = 306; vela.x = 620; vela.facing = -1; bronk.play('eat'); kidA.play('eat'); kidB.play('eat');
  const feast = yield* new FeastGame({}).run();
  bronk.play('idle'); kidA.play('idle'); kidB.play('idle');
  AudioSys.sfx('burp'); Juice.shake(6, 0.4);
  Popups.add(bronk.x, bronk.top - 10, 'BUUURP', '#a8e878', { scale: 2, life: 1.4 });
  yield 0.9;
  yield* S.say('VELA', "Charming. The children are watching.", { at: vela });
  yield* S.say('PEBBLE', "Do it again, dad!", { at: kidA });
  run.gold += Math.round((feast ? feast.eaten : 0.5) * 30);
  yield 0.3;

  // ------------------------------------------------------------ 4. shower
  yield* S.fadeOut(0.5);
  yield* S.cut('shower', {});
  for (const k of ['vela', 'kida', 'kidb', 'blaze']) S.get(k).visible = false;
  bronk.x = 452; bronk.y = 194; bronk.play('idle'); bronk.facing = 1;
  const mam = S.add('mam', { base: 'mammoth', x: 660, y: 196, scale: 1, facing: -1, clip: 'shower' });
  S.cam.zoom = 1.45; S.cam.lookAt(540, 118, true);
  yield* S.fadeIn(0.6);
  yield* S.say('BRONK', "Morning, Trunks. Warm one today, eh?", { at: bronk });
  const show = yield* new ShowerGame({}).run();
  Particles.splash(470, 240, 30);
  AudioSys.sfx('spray');
  yield 0.5;
  if (show && show.win) { run.hp = Math.min(run.maxHp, run.hp + 6); Popups.add(bronk.x, bronk.top, 'SQUEAKY CLEAN +6 HP', '#86e8d2', { scale: 1.2, life: 1.6 }); }
  yield 0.8;

  // ------------------------------------------------------------ 5. the drive
  yield* S.fadeOut(0.5);
  yield* S.cut('house_ext', {});
  mam.visible = false;
  for (const k of ['vela', 'kida', 'kidb']) { S.get(k).visible = true; }
  vela.x = 500; vela.y = 200; vela.facing = 1;
  kidA.x = 545; kidA.y = 202; kidB.x = 575; kidB.y = 200;
  bronk.x = 360; bronk.y = 200; bronk.facing = -1;
  S.cam.zoom = 1.7; S.cam.lookAt(460, 130, true);
  yield* S.fadeIn(0.6);
  yield* S.say('VELA', "Quarry. Rocks. Home by dark. Try not to be eaten.", { at: vela });
  yield* S.say('BRONK', "Love you too.", { at: bronk });
  bronk.facing = 1;
  AudioSys.sfx('car_start');
  yield 0.6;
  yield* S.fadeOut(0.45);
  AudioSys.play('drive', { fade: 0.3 });
  S.fade = 0; S.fadeTarget = 0;
  const drive = yield* new DriveGame({ goal: 2000 }).run();
  S.fade = 1; S.fadeTarget = 1;
  run.gold += (drive ? drive.shells : 0) * 4;
  // --- the T-rex
  S.set = 'house_ext'; S.setOpt = {};
  S.cam.zoom = 1.4; S.cam.lookAt(470, 110, true);
  bronk.visible = true; bronk.x = 300; bronk.y = 200; bronk.play('drive'); bronk.facing = 1;
  for (const k of ['vela', 'kida', 'kidb']) S.get(k).visible = false;
  const trex = S.add('trex', { base: 'trex', x: 980, y: 210, scale: 1, facing: -1 });
  trex.play('roar');
  yield* S.fadeIn(0.5);
  yield 0.3;
  AudioSys.sfx('roar', { pitch: 48, vol: 1, len: 1.7 });
  Juice.shake(14, 1.1); Juice.flash('#ffffff', 0.35, 4);
  S.cam.zoomTo(2.1); S.cam.lookAt(860, 130);
  yield 1.5;
  bronk.play('shock');
  S.cam.lookAt(360, 120); S.cam.zoomTo(2.4);
  yield* S.say('BRONK', "NOPE. NOPE. NOPE.", { at: bronk });
  bronk.facing = -1; bronk.play('drive');
  AudioSys.play('chase', { fade: 0.2 });
  Co.run(function* () { for (let i = 0; i < 240; i++) { bronk.x -= Time.dt * 420; trex.x += Time.dt * 60; Particles.dust(bronk.x + 30, bronk.y, 1); yield 0; } }());
  S.cam.zoomTo(1.5); S.cam.lookAt(200, 120);
  yield 1.4;
  yield* S.fadeOut(0.7);
  trex.visible = false;

  // ------------------------------------------------------------ 6. the wreck
  yield* S.cut('house_ext', { dusk: true, wreck: true });
  bronk.visible = true; bronk.x = 180; bronk.y = 200; bronk.play('shock'); bronk.facing = 1;
  S.cam.zoom = 1.5; S.cam.lookAt(420, 120, true);
  AudioSys.stop(0.4);
  yield* S.fadeIn(1.0);
  AudioSys.sfx('rumble', { vol: 0.7, len: 1.4 });
  yield 1.2;
  yield* S.say('BRONK', "...Vela? PEBBLE? ROXY?", { at: bronk });
  // Blaze flees along the ridge with the family
  blaze.visible = true; blaze.x = 700; blaze.y = 196; blaze.facing = 1; blaze.play('walk', { fps: 14 });
  vela.visible = true; vela.x = 760; vela.y = 190; vela.play('cry'); vela.scale = 0.8;
  kidA.visible = true; kidA.x = 790; kidA.y = 188; kidA.scale = 0.8;
  kidB.visible = true; kidB.x = 812; kidB.y = 188; kidB.scale = 0.8;
  S.cam.lookAt(760, 110); S.cam.zoomTo(1.9);
  AudioSys.play('chase', { fade: 0.2, intensity: 2 });
  yield 0.6;
  yield* S.say('VELA', "BRONK! It came for the CHAIN, Bronk! It came for the CHAIN!", { at: vela });
  Emotes.show(blaze, 'anger', 1.4);
  yield* S.say('BLAZE', "Six years of your breakfasts. Six years. Now you can chase ME for a while.", { at: blaze });
  // --- the futile chase: the bar drains no matter how hard you mash
  bronk.play('walk', { fps: 16 });
  let stam = 1, mash = 0;
  S.hud = () => {
    Gfx.rectA(W / 2 - 200, H - 120, 400, 56, '#120c16', 0.8);
    Gfx.text('MASH TO RUN', W / 2, H - 114, { color: '#ffe98a', align: 'center', scale: 1.3 });
    Gfx.bar(W / 2 - 180, H - 88, 360, 16, stam, stam > 0.35 ? '#6cc95c' : '#ef6a5e', { bg: '#14331e' });
    Gfx.text('STAMINA', W / 2, H - 66, { color: '#7a6d8a', align: 'center' });
  };
  S.cam.zoomTo(1.6);
  const chaseCo = Co.run(function* () {
    let t = 0;
    while (t < 6.2) {
      yield 0; t += Time.dt;
      const pressed = Input.pressed('Space', 'KeyE', 'Enter') || Input.clicks.length;
      if (pressed) { mash++; stam = Math.max(0, stam - 0.012); bronk.x += 16; Particles.dust(bronk.x - 14, bronk.y, 2); AudioSys.sfx('step'); }
      stam = Math.max(0, stam - Time.dt * 0.17);
      blaze.x += Time.dt * 96; vela.x += Time.dt * 96; kidA.x += Time.dt * 96; kidB.x += Time.dt * 96;
      bronk.x += Time.dt * (40 + stam * 70);
      S.cam.lookAt(bronk.x + 120, 120);
      if (chance(Time.dt * 3)) Emotes.show(bronk, 'sweat', 0.7);
      if (stam <= 0) break;
    }
  }());
  yield () => chaseCo.done;
  S.hud = null;
  bronk.play('hurt'); bronk.squash(0.3);
  AudioSys.sfx('thud'); Juice.shake(8, 0.4);
  Particles.dust(bronk.x, bronk.y, 14);
  S.cam.zoomTo(2.4); S.cam.lookAt(bronk.x, bronk.y - 40);
  yield 1.0;
  blaze.visible = vela.visible = kidA.visible = kidB.visible = false;
  AudioSys.stop(0.8);
  yield* S.say('BRONK', "...too...much...breakfast...", { at: bronk });
  yield 0.6;

  // ------------------------------------------------------------ 7. the hook
  const elder = S.add('elder', { base: 'elder', x: bronk.x - 90, y: 202, scale: 1, facing: 1 });
  AudioSys.play('village', { fade: 1.2 });
  yield 0.8;
  yield* S.say('ELDER', "Legs will not catch that thing, Bronk. It runs on anger. You will need something louder.", { at: elder });
  yield* S.say('BRONK', "Louder than a raptor?", { at: bronk });
  yield* S.say('ELDER', "Louder than a raptor. Get up. Take the Rock-Axe. Rally what is left of this valley and go and get your family back.", { at: elder });
  bronk.play('idle');
  AudioSys.sfx('unlock');
  Particles.sparkle(bronk.x, bronk.top, 22, ['#ffe98a', '#ffffff']);
  Popups.add(bronk.x, bronk.top - 20, 'THE ROCK-AXE', '#ffe98a', { scale: 2, life: 2 });
  yield 1.4;
  bronk.play('play');
  S.cam.zoomTo(2.0);
  yield 1.6;
  yield* S.titleCard('ONGA BONGA', 'go and get them back', 3.0);
  yield* S.fadeOut(0.9);
  Game.startVillage();
}
