// ---------------------------------------------------------------------------
// cutscene.js - the opening: one morning at the Rockbottoms', staged across
// the World strips, with the interactive beats handed off to mini-games.
// ---------------------------------------------------------------------------
'use strict';

class CutsceneScene {
  constructor(script, o = {}) {
    this.scriptFn = script; this.o = o;
    this.cam = new Camera(); this.cam.zoom = 1.6;
    this.actors = {}; this.set = 'home'; this.setOpt = {};
    this.t = 0; this.fade = 1; this.fadeTarget = 0; this.title = null; this.skipT = 0;
    this.done = false; this.hud = null; this.overlay = null;
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
  show(...keys) { for (const k of keys) if (this.actors[k]) this.actors[k].visible = true; }
  hide(...keys) { for (const k of keys) if (this.actors[k]) this.actors[k].visible = false; }
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
  // A mini-game draws over the whole screen, so the scene fade has to be down
  // while it runs or the stage is simply black behind it.
  *mini(game) {
    const f = this.fade, ft = this.fadeTarget;
    this.fade = 0; this.fadeTarget = 0;
    const r = yield* game.run();
    this.fade = f; this.fadeTarget = ft;
    return r;
  }
  *walk(key, x, y, speed) {
    const a = this.actors[key]; a.play('walk');
    while (!a.moveTo(x, y ?? a.y, Time.dt, speed || a.speed)) yield 0;
    a.play('idle');
  }
  *pan(x, y, zoom, hold = 0) { this.cam.lookAt(x, y); if (zoom) this.cam.zoomTo(zoom); if (hold) yield hold; else yield 0; }
  camX() { return this.cam.x - W / (2 * this.cam.zoom); }
  // --------------------------------------------------------------- lifecycle
  update(dt) {
    this.t += dt;
    this.fade = damp(this.fade, this.fadeTarget, 6, dt);
    this.cam.update(dt);
    for (const k in this.actors) this.actors[k].update(dt);
    Dialogue.update();
    if (this.title) this.title.t += dt;
    if (Input.isDown('Escape') || (Input.touch && UI.hovered(W - 130, 12, 116, 34) && Input.down)) {
      this.skipT += dt;
      if (this.skipT > 0.9 && this.o.onSkip) { this.skipT = -99; this.o.onSkip(); }
    } else this.skipT = Math.max(0, this.skipT - dt * 2);
  }
  draw() {
    Gfx.clear('#120c16');
    this.cam.apply(Gfx.ctx);
    (World[this.set] || World.home)(this.t, this.setOpt, this.camX());
    const list = Object.values(this.actors).filter(a => a.visible).map(a => ({ y: a.y, a }));
    list.sort((p, q) => p.y - q.y);
    for (const it of list) it.a.draw();
    Particles.draw(Gfx.ctx, true);
    FX.draw(true);
    Popups.draw(true);
    Emotes.draw();
    Floaters.draw();
    if (this.overlay) this.overlay(true);
    this.cam.restore(Gfx.ctx);
    Particles.draw(Gfx.ctx, false);
    FX.draw(false);
    Popups.draw(false);
    if (Game.mini) Game.mini.draw();
    if (this.overlay) this.overlay(false);
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
  const setOpt = o => { S.setOpt = Object.assign({}, S.setOpt, o); };

  // ====================================================== 1. THE ALARM DODO
  S.set = 'home'; S.setOpt = { night: true, fire: 0 };
  S.cam.zoom = 2.1; S.cam.lookAt(HOME.bed + 60, 320, true);
  AudioSys.play('home', { fade: 1.4 });
  yield* S.fadeIn(1.4);
  const bronk = S.add('bronk', { base: 'bronk', x: HOME.bed + 10, y: GY, scale: 1, facing: 1 });
  bronk.play('sleep');
  const dodo = S.add('dodo', { base: 'dodo', x: HOME.perch, y: GY - 50, scale: 0.9, facing: -1 });
  yield 1.0;
  // snoring z's
  Co.run(function* () {
    for (let i = 0; i < 160; i++) {
      if (bronk.clipName !== 'sleep') return;
      Popups.add(bronk.x + 22, bronk.y - 44, 'Z', '#a79bb4', { scale: 1.4, life: 1.6, vy: -26 });
      yield 0.85;
    }
  }());
  yield* S.titleCard('ROCK BOTTOM', '10,000 BC. a tuesday.', 2.6);
  yield 0.4;
  // the dodo goes off
  S.cam.lookAt(HOME.perch - 10, 316); S.cam.zoomTo(2.4);
  dodo.play('walk');
  AudioSys.sfx('roar', { pitch: 560, vol: 0.7, len: 0.4 });
  Emotes.show(dodo, '!', 1.2);
  Juice.shake(5, 0.3);
  yield 0.7;
  yield* S.say('', 'The dodo has gone off every morning for four years. It has never once been thanked.', { at: dodo, portrait: 'dodo_idle' });
  // --- mini-game: swat it
  S.cam.zoomTo(1.0); S.cam.lookAt(HOME.perch, 300);
  const CX = HOME.perch - W / 2;
  const smack = yield* S.mini(new SmackGame({
    rounds: 2, groundY: GY, bedX: HOME.bed - CX, perchX: HOME.perch - CX,
    paint: () => { Gfx.clear('#120c16'); const ctx = Gfx.ctx; ctx.save(); ctx.translate(-CX, 0); World.home(S.t, S.setOpt, CX); ctx.restore(); Gfx.rectA(0, 0, W, H, '#120c16', 0.3); },
  }));
  dodo.visible = false;
  S.cam.zoomTo(2.2); S.cam.lookAt(HOME.bed + 40, 320);
  bronk.play('sleep'); bronk.squash(0.2);
  AudioSys.sfx('thud');
  yield 0.6;
  yield* S.say('BRONK', 'mmnnh. five more... centuries...', { at: bronk });
  yield 0.6;

  // ==================================================== 2. VELA, AND PANCAKES
  const vela = S.add('vela', { base: 'vela', x: HOME.rug + 60, y: GY, scale: 1, facing: -1 });
  vela.play('walk');
  S.cam.zoomTo(1.7); S.cam.lookAt(HOME.bed + 130, 318);
  while (!vela.moveTo(HOME.bed + 96, GY, Time.dt, 90)) yield 0;
  vela.play('idle'); vela.facing = -1;
  yield 0.3;
  yield* S.say('VELA', 'Bronk. Up.', { at: vela });
  yield* S.say('BRONK', '...', { at: bronk });
  yield* S.say('VELA', 'BRONK.', { at: vela });
  yield* S.say('BRONK', 'I am listening with my eyes closed. It is a skill.', { at: bronk });
  yield 0.3;
  yield* S.say('VELA', "Fine. I'll just let the pancakes go cold.", { at: vela });
  // the nose knows
  S.cam.zoomTo(3.0); S.cam.lookAt(bronk.x + 6, bronk.y - 44);
  AudioSys.sfx('gasp');
  yield 0.5;
  bronk.play('shock'); bronk.stretch(0.35);
  Juice.flash('#ffe98a', 0.3, 3); Juice.punch(0.06);
  AudioSys.sfx('detect');
  Particles.sparkle(bronk.x, bronk.y - 50, 16, ['#ffe98a', '#ffffff']);
  yield 0.5;
  yield* S.say('BRONK', 'PANCAKES.', { at: bronk });
  yield 0.2;
  vela.visible = false;
  // --- side-scroll: the dash
  S.cam.zoomTo(1.0);
  const dash = yield* S.mini(new SideScroll({
    base: 'bronk', moveClip: 'dash', idleClip: 'idle', scale: 1.7,
    startX: HOME.bed + 10, goal: HOME.table - 40, speed: 330, grip: 9,
    paint: Scroll('home', { night: true, fire: 0 }),
    title: 'PANCAKES', sub: 'this way',
    props: [{ spr: 'vela_idle', x: HOME.table + 60, scale: 1.7, flip: true }],
  }));
  run.gold += 10;

  // ==================================================== 3. THE ORDER
  setOpt({ night: true, fire: 0 });
  S.cam.zoom = 1.6; S.cam.lookAt(HOME.table + 30, 316, true);
  bronk.x = HOME.table - 50; bronk.y = GY; bronk.play('idle'); bronk.facing = 1;
  vela.visible = true; vela.x = HOME.table + 70; vela.facing = -1; vela.play('idle');
  const blaze = S.add('blaze', { base: 'blaze', x: HOME.stove + 6, y: GY - 8, scale: 1, facing: -1 });
  yield 0.5;
  yield* S.say('BRONK', 'Where are they. I can smell them. I can smell them in my TEETH.', { at: bronk });
  yield* S.say('VELA', "There are no pancakes, Bronk.", { at: vela });
  yield* S.say('BRONK', '...', { at: bronk });
  yield* S.say('VELA', 'There is, however, a dodo nest forty paces from this door. Go and get me an egg and there will be.', { at: vela });
  Emotes.show(bronk, 'sweat', 1.2);
  yield* S.say('BRONK', 'That bird and I have history.', { at: bronk });
  yield* S.say('VELA', 'I know. You started it.', { at: vela });
  yield 0.4;

  // ==================================================== 4. THE EGG
  yield* S.fadeOut(0.45);
  setOpt({ night: false, fire: 0 });
  S.cam.zoom = 1.8; S.cam.lookAt(HOME.nest - 20, 330, true);
  bronk.x = HOME.nest - 70; bronk.facing = 1; bronk.play('idle');
  vela.visible = false; blaze.visible = false;
  yield 0.5;
  yield* S.say('BRONK', 'Morning. Lovely nest. Just going to borrow one of these.', { at: bronk });
  yield 0.4;
  Emotes.show(bronk, '!', 0.8);
  AudioSys.sfx('roar', { pitch: 520, vol: 0.8, len: 0.5 });
  Juice.shake(9, 0.4);
  yield 0.7;
  // --- mini-game: the wrestle. no words, just clicking.
  const egg = yield* S.mini(new EggGame({ paint: () => { Gfx.clear('#120c16'); const c = HOME.nest - W / 2; const ctx = Gfx.ctx; ctx.save(); ctx.translate(-c, 0); World.home(S.t, { fire: 0 }, c); ctx.restore(); Gfx.rectA(0, 0, W, H, '#120c16', 0.25); } }));
  setOpt({ eggGone: true });
  Popups.add(W / 2, 200, 'ONE (1) EGG', '#ffe98a', { world: false, scale: 2, life: 1.6 });
  AudioSys.sfx('unlock');
  yield 1.2;
  yield* S.say('BRONK', 'Worth it.', { at: bronk });
  yield 0.3;

  // ==================================================== 5. COOKING BY RAPTOR
  yield* S.fadeOut(0.5);
  setOpt({ night: false, fire: 0.2 });
  S.cam.zoom = 1.7; S.cam.lookAt(HOME.stove - 20, 322, true);
  bronk.x = HOME.stove - 90; bronk.facing = 1;
  blaze.visible = true; blaze.play('idle');
  vela.visible = true; vela.x = HOME.table - 20; vela.facing = 1;
  yield* S.fadeIn(0.6);
  yield 0.4;
  yield* S.say('', 'BLAZE the cook-fire raptor has been chained to this pit for six years. He has views.', { at: blaze, portrait: 'blaze_idle' });
  Emotes.show(blaze, 'anger', 1.6); AudioSys.sfx('detect');
  yield* S.say('BRONK', "Don't give me that. You get fed. You get a roof. You get to sit down all day.", { at: bronk });
  S.cam.zoomTo(1.0);
  const cook = yield* S.mini(new KickGame({ paint: () => { Gfx.clear('#120c16'); const c = HOME.stove - W / 2; const ctx = Gfx.ctx; ctx.save(); ctx.translate(-c, 0); World.home(S.t, { fire: 0.8 }, c); ctx.restore(); Gfx.rectA(0, 0, W, H, '#120c16', 0.3); } }));
  setOpt({ fire: 1 });
  Juice.flash('#ffa832', 0.4, 3); AudioSys.sfx('fire_whoosh');
  Particles.fire(HOME.stove, GY - 40, 24);
  S.cam.zoom = 1.7; S.cam.lookAt(HOME.stove - 40, 322, true);
  if (cook && cook.win) { run.hp = Math.min(run.maxHp, run.hp + 8); yield* S.say('VELA', "Perfect. See? He responds to encouragement.", { at: vela }); }
  else yield* S.say('VELA', "It's black, Bronk. You have cooked a stone.", { at: vela });
  Emotes.show(blaze, 'anger', 2);
  yield 0.5;

  // ==================================================== 6. THE MAMMOTH SHOWER
  yield* S.fadeOut(0.5);
  setOpt({ night: false, fire: 1, showerOn: true });
  S.cam.zoom = 1.5; S.cam.lookAt(HOME.shower + 20, 300, true);
  bronk.x = HOME.shower - 16; bronk.y = GY; bronk.facing = 1; bronk.play('idle');
  vela.visible = false; blaze.visible = false;
  const mam = S.add('mam', { base: 'mammoth', x: HOME.shower + 150, y: GY, scale: 1, facing: -1, clip: 'shower' });
  yield* S.fadeIn(0.6);
  yield 0.4;
  yield* S.say('BRONK', 'Morning, Trunks. Warm one today, eh?', { at: bronk });
  yield* S.say('', 'Trunks charges one bucket of nuts a week and has never once got the temperature right.', { at: mam, portrait: 'mammoth_idle' });
  setOpt({ showerOn: true });
  for (let i = 0; i < 3; i++) { Particles.splash(HOME.shower, GY - 110, 12); AudioSys.sfx('spray'); yield 0.5; }
  AudioSys.sfx('gasp'); Juice.shake(5, 0.3); Emotes.show(bronk, '!', 1.0);
  yield* S.say('BRONK', 'COLD. COLD. THAT IS COLD, TRUNKS.', { at: bronk });
  run.hp = Math.min(run.maxHp, run.hp + 6);
  Popups.add(bronk.x, bronk.top, 'CLEAN ENOUGH  +6 HP', '#86e8d2', { scale: 1.2, life: 1.8 });
  yield 0.9;

  // ==================================================== 7. OFF TO WORK
  const kidA = S.add('kida', { base: 'kid_a', x: HOME.door + 90, y: GY, scale: 0.9 });
  const kidB = S.add('kidb', { base: 'kid_b', x: HOME.door + 130, y: GY, scale: 0.9, facing: -1 });
  vela.visible = true; vela.x = HOME.door + 60; vela.y = GY; vela.facing = 1; vela.play('idle');
  S.cam.lookAt(HOME.door + 120, 310); S.cam.zoomTo(1.6);
  yield 0.5;
  yield* S.say('VELA', 'Quarry. Rocks. Home by dark. Try not to be eaten.', { at: vela });
  yield* S.say('PEBBLE', 'Bring back a rock shaped like a face!', { at: kidA });
  yield* S.say('BRONK', 'Every rock is shaped like a face if you work at the quarry long enough.', { at: bronk });
  yield 0.3;
  setOpt({ showerOn: false });
  // past the shower, down the yard, to the car
  S.cam.zoomTo(1.5);
  bronk.x = HOME.shower - 40; bronk.y = GY; bronk.facing = 1;
  S.cam.follow = bronk;
  yield* S.walk('bronk', HOME.car - 52, GY, 130);
  S.cam.follow = null; S.cam.lookAt(HOME.car, 320);
  S.hide('vela', 'kida', 'kidb', 'mam');
  yield 0.5;
  yield* S.say('BRONK', 'Right. Rocks.', { at: bronk });
  AudioSys.sfx('car_start');
  bronk.visible = false;
  yield 0.8;

  // ==================================================== 8. THE CHILL DRIVE
  AudioSys.play('drive', { fade: 0.4 });
  const drive = yield* S.mini(new SideScroll({
    vehicle: 'car', vehicleScale: 1.6, scale: 1.7,
    startX: 0, goal: 3000, speed: 130, auto: 150, grip: 3,
    paint: Scroll('road'),
    title: 'THE COMMUTE', sub: 'no rush',
    pickups: Array.from({ length: 9 }, (_, i) => ({ x: 340 + i * 290, spr: 'icon_coin', label: '+1 shell' })),
  }));
  run.gold += (drive ? drive.got : 0) * 5;

  // ==================================================== 9. THE QUARRY
  yield* S.cut('quarry', {});
  S.cam.zoom = 1.5; S.cam.lookAt(500, 300, true);
  bronk.visible = true; bronk.x = 380; bronk.y = GY; bronk.facing = 1; bronk.play('idle');
  AudioSys.play('drive', { fade: 0.6 });
  yield* S.fadeIn(0.7);
  yield 0.6;
  yield* S.say('BRONK', 'Another beautiful day of hitting a big rock until it is small rocks.', { at: bronk });
  yield 0.3;
  // something comes out of the mine
  const trex = S.add('trex', { base: 'trex', x: 820, y: GY, scale: 1.1, facing: -1 });
  trex.play('roar');
  const vic = S.add('vic', { base: 'villager', x: 700, y: GY, scale: 0.9, facing: -1 });
  const vic2 = S.add('vic2', { base: 'villager2', x: 660, y: GY, scale: 0.9, facing: -1 });
  S.cam.lookAt(760, 280); S.cam.zoomTo(1.9);
  AudioSys.play('chase', { fade: 0.4, intensity: 2 });
  AudioSys.sfx('rumble', { vol: 0.9, len: 1.4 });
  Juice.shake(10, 0.9);
  yield 0.9;
  AudioSys.sfx('roar', { pitch: 46, vol: 1, len: 1.8 });
  Juice.shake(16, 1.2); Juice.flash('#ffffff', 0.35, 4);
  Emotes.show(vic, '!', 1.2); Emotes.show(vic2, '!', 1.2);
  yield 0.8;
  // the workforce leaves. one of them leaves vertically.
  vic.play('walk'); vic2.play('walk');
  Co.run(function* () {
    for (let i = 0; i < 300; i++) { vic.x -= Time.dt * 210; vic2.x -= Time.dt * 190; yield 0; }
  }());
  yield 0.5;
  const vic3 = S.add('vic3', { base: 'villager', x: 900, y: GY, scale: 0.9 });
  AudioSys.sfx('chomp');
  Juice.shake(8, 0.3);
  Popups.add(900, GY - 120, 'NOM', '#ef6a5e', { scale: 2.4, life: 1.4, vy: -30 });
  vic3.visible = false;
  Particles.spawn(900, GY - 60, { n: 14, color: ['#d8a86b', '#b07a45'], speed: 200, spread: 6.28, life: 0.9, size: 5, sizeEnd: 0, gravity: 300 });
  yield 0.7;
  yield* S.say('', 'That is Gary. Gary is fine. Gary is mostly fine.', { at: trex, portrait: 'trex_idle' });
  yield* S.say('BRONK', "Right. RIGHT. I am the Employee of the Week. This is an Employee of the Week problem.", { at: bronk });
  yield 0.4;
  // --- he gives chase. it does not go far.
  bronk.visible = true; bronk.play('run', { fps: 18 }); bronk.facing = 1;
  trex.play('walk');
  S.cam.zoomTo(1.5); S.cam.lookAt(bronk.x + 200, 300);
  Co.run(function* () {
    for (let i = 0; i < 260; i++) {
      bronk.x += Time.dt * 210; trex.x += Time.dt * 320;
      Particles.dust(bronk.x - 22, GY, 1);
      S.cam.lookAt(bronk.x + 150, 300);
      yield 0;
    }
  }());
  yield 2.2;
  bronk.play('idle');
  yield* S.say('BRONK', '...it went towards the village. It went towards MY village.', { at: bronk });
  yield* S.fadeOut(0.7);

  // ==================================================== 10. HOME, AT DUSK
  yield* S.cut('home', { dusk: true, fire: 0, eggGone: true, carGone: true });
  S.cam.zoom = 1.6; S.cam.lookAt(HOME.door + 40, 310, true);
  bronk.x = HOME.door - 60; bronk.play('idle'); bronk.facing = 1;
  AudioSys.stop(0.5);
  yield* S.fadeIn(1.0);
  yield 1.0;
  yield* S.say('BRONK', '...Vela? PEBBLE? ROXY?', { at: bronk });
  yield 0.5;
  blaze.visible = true; blaze.x = HOME.shower + 120; blaze.y = GY; blaze.facing = 1; blaze.play('walk', { fps: 14 });
  vela.visible = true; vela.x = HOME.shower + 176; vela.y = GY - 30; vela.scale = 0.8; vela.play('cry');
  S.show('kida', 'kidb');
  kidA.x = HOME.shower + 206; kidA.y = GY - 26; kidA.scale = 0.7;
  kidB.x = HOME.shower + 230; kidB.y = GY - 26; kidB.scale = 0.7;
  S.cam.lookAt(HOME.shower + 180, 290); S.cam.zoomTo(1.9);
  AudioSys.play('chase', { fade: 0.2, intensity: 2 });
  yield 0.7;
  Emotes.show(blaze, 'anger', 1.6);
  yield* S.say('BLAZE', 'SIX YEARS of your breakfasts. Six. Years. Now you can chase ME for a while.', { at: blaze });
  yield* S.say('VELA', "BRONK! He unchained himself! He had HANDS the whole time!", { at: vela });
  yield* S.say('BRONK', 'HE HAD WHAT', { at: bronk });
  yield 0.3;
  // and the thing from the quarry followed him home
  AudioSys.sfx('roar', { pitch: 44, vol: 1, len: 1.8 });
  Juice.shake(16, 1.1);
  S.cam.lookAt(HOME.door - 160, 290);
  trex.visible = true; trex.x = HOME.door - 300; trex.y = GY; trex.facing = 1; trex.play('walk');
  yield 1.0;
  yield* S.say('BRONK', 'Oh, come ON.', { at: bronk });
  yield 0.3;
  S.cam.zoomTo(1.0);
  // --- the big one: chase the raptor, with the tyrant on your heels
  const chase = yield* S.mini(new SideScroll({
    vehicle: 'car', vehicleScale: 1.6, scale: 1.7, startX: 0, goal: 2600, speed: 330, grip: 5,
    paint: Scroll('canyon', { embers: true }),
    ahead: { spr: 'blaze_walk', gap: 560, speed: 268, scale: 1.4, carry: 'vela_cry' },
    pursuer: { spr: 'trex_walk', gap: 520, speed: 252, scale: 1.7 },
    pursuerRamp: 34, leash: 760, catchTime: 3.0,
    title: 'ONE IN FRONT, ONE BEHIND', sub: 'a normal tuesday',
  }));

  // ==================================================== 11. THE BREAKDOWN
  yield* S.fadeOut(0.5);
  yield* S.cut('canyon', { embers: true });
  S.cam.zoom = 1.7; S.cam.lookAt(420, 300, true);
  bronk.x = 380; bronk.y = GY; bronk.facing = 1; bronk.play('hurt');
  S.hide('vela', 'kida', 'kidb', 'blaze');
  trex.visible = true; trex.x = 720; trex.y = GY; trex.facing = -1; trex.play('walk');
  S.overlay = world => { if (!world) return; Gfx.sprite('car', 330, GY + 2, { anchor: 'bc', frame: 0, rot: 0.12 }); };
  yield* S.fadeIn(0.8);
  AudioSys.sfx('thud'); Juice.shake(10, 0.5);
  for (let i = 0; i < 16; i++) Particles.spawn(330, GY - 40, { n: 1, color: ['#3b3048', '#574a66'], speed: 60, gravity: -40, life: 2.2, size: 6, sizeEnd: 0 });
  yield 1.0;
  yield* S.say('BRONK', 'No. No no no. Not the wheel. NOT THE WHEEL.', { at: bronk });
  trex.play('roar');
  S.cam.lookAt(620, 270); S.cam.zoomTo(2.3);
  AudioSys.sfx('roar', { pitch: 40, vol: 1, len: 2 });
  Juice.shake(18, 1.4);
  Co.run(function* () { for (let i = 0; i < 300; i++) { if (trex.x > 470) trex.x -= Time.dt * 52; yield 0; } }());
  yield 1.6;
  bronk.play('shock');
  yield* S.say('BRONK', "...alright. Alright. It's been a good run. Tell the kids I said the rock looked like a face.", { at: bronk });
  yield 0.6;

  // ==================================================== 12. THE BEAM
  AudioSys.stop(0.2);
  yield 0.5;
  const beamX = trex.x;
  let beam = 0;
  S.overlay = world => {
    if (!world) return;
    Gfx.sprite('car', 330, GY + 2, { anchor: 'bc', frame: 0, rot: 0.12 });
    if (beam <= 0) return;
    const ctx = Gfx.ctx, w = 26 + beam * 66;
    ctx.globalAlpha = clamp(beam, 0, 1) * 0.9;
    const g = ctx.createLinearGradient(0, -400, 0, GY);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,233,138,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0.95)');
    ctx.fillStyle = g; ctx.fillRect(beamX - w / 2, -420, w, GY + 420);
    ctx.globalAlpha = 1;
    Gfx.glow(beamX, GY - 60, 200 * beam, '#ffe98a', 0.5 * beam);
  };
  AudioSys.sfx('thunder');
  Co.run(function* () { for (let i = 0; i < 60; i++) { beam = Math.min(1.6, beam + Time.dt * 5); yield 0; } }());
  Juice.flash('#ffffff', 0.7, 6); Juice.shake(20, 0.9); Juice.punch(0.12);
  S.cam.zoomTo(1.5); S.cam.lookAt(520, 280);
  yield 0.9;
  trex.play('roar'); trex.flash('#ffffff', 0.5);
  AudioSys.sfx('roar', { pitch: 300, vol: 0.9, len: 1.2 });
  Co.run(function* () { for (let i = 0; i < 400; i++) { trex.x += Time.dt * 420; Particles.dust(trex.x - 40, GY, 1); yield 0; } }());
  yield 1.2;
  trex.visible = false;
  Co.run(function* () { for (let i = 0; i < 80; i++) { beam = Math.max(0, beam - Time.dt * 2.2); yield 0; } }());
  yield 0.8;

  // ==================================================== 13. THE ROCKSTAR ELDER
  AudioSys.play('village', { fade: 1.4 });
  const elder = S.add('elder', { base: 'elder', x: beamX, y: GY, scale: 1, facing: -1 });
  elder.alpha = 0;
  Co.run(function* () { for (let i = 0; i < 60; i++) { elder.alpha = Math.min(1, elder.alpha + Time.dt * 2); yield 0; } }());
  S.cam.zoomTo(1.8); S.cam.lookAt((bronk.x + elder.x) / 2, 300);
  yield 1.0;
  yield* S.say('ELDER', 'Legs will not catch that raptor, Bronk. It runs on spite. You will need something louder.', { at: elder });
  yield* S.say('BRONK', 'Louder than a raptor.', { at: bronk });
  yield* S.say('ELDER', 'Louder than the sky.', { at: elder });
  // the handoff
  S.cam.zoomTo(2.4); S.cam.lookAt(bronk.x + 40, 300);
  AudioSys.sfx('unlock');
  Particles.sparkle(bronk.x + 20, GY - 70, 26, ['#ffe98a', '#ffffff']);
  FX.burst(bronk.x + 20, GY - 70, { scale: 1.6 });
  yield 0.5;
  S.overlay = world => {
    if (!world) return;
    Gfx.sprite('car', 330, GY + 2, { anchor: 'bc', frame: 0, rot: 0.12 });
    Gfx.glow(bronk.x + 22, GY - 74, 80, '#ffe98a', 0.35 + Math.sin(Time.t * 6) * 0.08);
    Gfx.sprite('art_bass', bronk.x + 22, GY - 74, { anchor: 'c', scale: 1.8, rot: -0.3 });
  };
  Popups.add(bronk.x + 20, GY - 130, 'THE ROCK-AXE', '#ffe98a', { scale: 2.2, life: 2.2 });
  bronk.play('idle');
  yield 1.6;
  yield* S.say('ELDER', 'Rally what is left of this valley. Then go and get them back.', { at: elder });
  yield* S.say('BRONK', "I don't know how to play this.", { at: bronk });
  yield* S.say('ELDER', 'Neither did I.', { at: elder });
  // and he is gone
  AudioSys.sfx('ghost');
  Particles.sparkle(elder.x, GY - 60, 24, ['#ffe98a', '#b177e6']);
  Co.run(function* () { for (let i = 0; i < 60; i++) { elder.alpha = Math.max(0, elder.alpha - Time.dt * 2.4); yield 0; } }());
  yield 1.0;
  elder.visible = false;
  yield* S.say('BRONK', 'Cool. Cool cool cool.', { at: bronk });
  yield 0.4;
  bronk.play('play');
  S.cam.zoomTo(2.0);
  AudioSys.sfx('encore');
  Juice.flash('#ffe98a', 0.4, 3);
  yield 1.6;
  yield* S.titleCard('ONGA BONGA', 'go and get them back', 3.0);
  yield* S.fadeOut(0.9);
  S.overlay = null;
  Game.startVillage();
}
