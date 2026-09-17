// ---------------------------------------------------------------------------
// cutscene.js - the opening: one morning at the Rockbottoms', staged across
// the World strips, with the interactive beats handed off to mini-games.
//
// Two rules hold for the whole thing. The camera never changes zoom - every
// scene in this game draws at VIEW, so a cut never changes how big a pixel is.
// And it never fades to black: cuts are hard, or they flash white. Sitting in
// the dark waiting for a picture is not entertainment.
// ---------------------------------------------------------------------------
'use strict';

class CutsceneScene {
  constructor(script, o = {}) {
    this.scriptFn = script; this.o = o;
    this.cam = new Camera(); this.cam.zoom = this.cam.tzoom = VIEW;
    this.actors = {}; this.set = 'home'; this.setOpt = {};
    this.t = 0; this.fade = 0; this.fadeTarget = 0; this.title = null; this.skipT = 0;
    this.flash = 0; this.riffGame = null;
    this.done = false; this.hud = null; this.overlay = null;
  }
  enter() {
    Game.worldToScreen = (x, y) => this.cam.toScreen(x, y);
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
  // A cut. White, never black - one frame of glare and you are somewhere else.
  *cut(set, opt = {}, at = null, punch = 0.5) {
    if (punch) { this.flash = punch; Juice.punch(0.05); AudioSys.sfx('zoom_in', { vol: 0.5 }); }
    this.set = set; this.setOpt = opt;
    if (at) this.cam.lookAt(at[0], at[1], true);
    yield 0;
  }
  // Move the camera without changing how big anything is.
  *pan(x, y, hold = 0) { this.cam.lookAt(x, y); if (hold) yield hold; else yield 0; }
  *snap(x, y) { this.cam.lookAt(x, y, true); yield 0; }
  *walk(key, x, y, speed) {
    const a = this.actors[key]; a.play('walk');
    while (!a.moveTo(x, y ?? a.y, Time.dt, speed || a.speed)) yield 0;
    a.play('idle');
  }
  camX() { return this.cam.x - VW / 2; }
  camY() { return this.cam.y - VH / 2; }
  // A mini-game draws over the whole screen, so the scene fade has to be down
  // while it runs or the stage is simply black behind it.
  *mini(game) {
    const f = this.fade, ft = this.fadeTarget;
    this.fade = 0; this.fadeTarget = 0;
    const r = yield* game.run();
    this.fade = f; this.fadeTarget = ft;
    return r;
  }
  // The real performance game, run straight out of a cutscene. The dream is
  // the tutorial: same strings, same stones, same sung ribbon.
  *riff(o = {}) {
    let done = false, result = null;
    this.riffGame = new Riff(Object.assign({
      bars: 2, density: 0.5, title: 'DREAM', windowMult: 2.2, speedMul: 0.8,
      onNote: (rating) => { if (rating) { Juice.punch(0.03); this.flash = Math.max(this.flash, 0.22); } },
      onDone: r => { result = r; done = true; },
    }, o));
    yield () => done;
    this.riffGame = null;
    return result;
  }
  // --------------------------------------------------------------- lifecycle
  update(dt) {
    this.t += dt;
    this.fade = damp(this.fade, this.fadeTarget, 6, dt);
    this.flash = Math.max(0, this.flash - dt * 2.6);
    this.cam.zoom = this.cam.tzoom = VIEW;              // one scale, always
    this.cam.update(dt);
    for (const k in this.actors) this.actors[k].update(dt);
    if (this.riffGame) this.riffGame.update(dt);
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
    if (this.riffGame) this.riffGame.draw();
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
    if (this.flash > 0.01) Gfx.rectA(0, 0, W, H, '#ffffff', clamp(this.flash, 0, 1) * 0.85);
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
  const SX = 580;                               // the dream stage, in world x

  // ================================================== 0. THE DREAM
  // You are already playing. No logo, no black, no waiting.
  S.set = 'concert'; S.setOpt = { beat: 0 };
  S.cam.lookAt(SX + 10, 296, true);
  AudioSys.play('boss3', { fade: 0.8, intensity: 2 });
  const rex = S.add('rex', { base: 'trex', x: SX + 28, y: GY - 46, scale: 1, facing: -1 });
  rex.play('roar');
  const star = S.add('star', { base: 'bronk', x: SX + 6, y: GY - 108, scale: 1, facing: 1 });
  star.play('play');
  S.overlay = world => {
    if (!world) return;
    Gfx.glow(star.x + 14, star.y + star.bob - 42, 80, '#ffe98a', 0.4 + Math.sin(Time.t * 8) * 0.1);
    Gfx.sprite('art_bass', star.x + 16, star.y + star.bob - 42, { anchor: 'c', scale: 1.1, rot: -0.45 + Math.sin(Time.t * 7) * 0.08 });
  };
  // the crowd keeps time with the song
  Co.run(function* () {
    for (let i = 0; i < 4000; i++) {
      const b = AudioSys.song ? (AudioSys.now() - AudioSys.songStart) / AudioSys.beatDur() : Time.t * 2;
      setOpt({ beat: Math.max(0, 1 - (b - Math.floor(b)) * 3) });
      if (S.set !== 'concert') return;
      yield 0;
    }
  }());
  Juice.shake(6, 0.5);
  AudioSys.sfx('roar', { pitch: 48, vol: 0.9, len: 1.4 });
  yield 0.8;
  yield* S.titleCard('ONGA BONGA', 'a dream, obviously', 2.2);
  Popups.add(W / 2, 112, 'STRIKE THE STRINGS', '#ffe98a', { world: false, scale: 1.8, life: 2.4, vy: -10 });
  yield 0.4;
  yield* S.riff({ bars: 3, density: 0.4, title: 'DREAM', windowMult: 2.6, speedMul: 0.75 });
  AudioSys.sfx('cheer');
  for (let i = 0; i < 30; i++) Particles.confetti(rnd(W * 0.2, W * 0.8), 60, 1);
  Juice.flash('#ffe98a', 0.4, 4);
  yield 0.5;
  yield* S.say('CROWD', 'BON-GA! BON-GA! BON-GA!', { at: null, portrait: 'icon_fire' });

  // ================================================== 1. THE ALARM DODO
  // The scream cuts through the dream and you are awake, mid-note.
  AudioSys.sfx('roar', { pitch: 620, vol: 0.9, len: 0.5 });
  Juice.shake(12, 0.4);
  S.flash = 1;
  AudioSys.stop(0.15);
  yield 0.18;
  S.overlay = null;
  S.hide('rex', 'star');
  yield* S.cut('home', { night: true, fire: 0 }, [HOME.bed + 40, 330], 0.9);
  AudioSys.play('home', { fade: 1.0 });
  const bronk = S.add('bronk', { base: 'bronk', x: HOME.bed + 6, y: GY, scale: 1, facing: 1 });
  bronk.play('sleep');
  const dodo = S.add('dodo', { base: 'dodo', x: HOME.perch, y: GY - 52, scale: 0.8, facing: -1 });
  yield 0.6;
  yield* S.say('BRONK', '...thank you. thank you. I love you all...', { at: bronk });
  yield 0.3;
  yield* S.say('', 'This dodo has gone off every morning for four years. It has never once been thanked.', { at: dodo, portrait: 'dodo_idle' });
  // --- ONE swing. It leaves as paper.
  dodo.visible = false;
  const CX = HOME.perch - VW * 0.62, CY = GY - VH * 0.74;
  yield* S.mini(new SmackGame({
    groundY: GY, bedX: HOME.bed + 6, perchX: HOME.perch, camX: CX, camY: CY,
    paint: () => World.home(S.t, S.setOpt, CX),
  }));
  S.cam.lookAt(HOME.bed + 60, 326, true);
  bronk.visible = true; bronk.play('idle'); bronk.x = HOME.bed + 22; bronk.squash(0.25);
  AudioSys.sfx('thud');
  yield 0.5;
  yield* S.say('BRONK', 'Every morning. Every single morning.', { at: bronk });
  yield 0.4;

  // ================================================ 2. VELA, AND PANCAKES
  const vela = S.add('vela', { base: 'vela', x: HOME.rug + 90, y: GY, scale: 1, facing: -1 });
  vela.play('walk');
  yield* S.pan(HOME.bed + 96, 324);
  while (!vela.moveTo(HOME.bed + 78, GY, Time.dt, 90)) yield 0;
  vela.play('idle'); vela.facing = -1;
  yield 0.3;
  yield* S.say('VELA', 'Up. Now.', { at: vela });
  yield* S.say('BRONK', 'I was headlining. There were thousands of them.', { at: bronk });
  yield* S.say('VELA', "There are four of us and one of you is still in bed.", { at: vela });
  yield 0.3;
  yield* S.say('VELA', "Fine. I'll just let the pancakes go cold.", { at: vela });
  // the nose knows
  yield* S.pan(bronk.x + 20, 312);
  AudioSys.sfx('gasp');
  yield 0.4;
  bronk.play('shock'); bronk.stretch(0.4);
  Juice.flash('#ffe98a', 0.3, 3); Juice.punch(0.07);
  AudioSys.sfx('detect');
  Particles.sparkle(bronk.x, bronk.y - 50, 16, ['#ffe98a', '#ffffff']);
  yield 0.45;
  yield* S.say('BRONK', 'PANCAKES.', { at: bronk });
  yield 0.2;
  vela.visible = false; bronk.visible = false;
  // --- side-scroll: out of the bedroom, through the passage, to the table
  const dash = yield* S.mini(new SideScroll({
    base: 'bronk', moveClip: 'dash', idleClip: 'idle',
    startX: HOME.bed + 6, goal: HOME.table - 40, speed: 300, grip: 9,
    paint: Scroll('home', { night: true, fire: 0 }),
    title: 'PANCAKES', sub: 'this way',
    props: [{ spr: 'vela_idle', x: HOME.table + 54, flip: true }],
  }));
  run.gold += 10;

  // ==================================================== 3. THE ORDER
  setOpt({ night: true, fire: 0 });
  yield* S.snap(HOME.table + 10, 322);
  bronk.visible = true; bronk.x = HOME.table - 46; bronk.y = GY; bronk.play('idle'); bronk.facing = 1;
  vela.visible = true; vela.x = HOME.table + 62; vela.facing = -1; vela.play('idle');
  const blaze = S.add('blaze', { base: 'blaze', x: HOME.stove + 4, y: GY - 6, scale: 0.9, facing: -1 });
  yield 0.4;
  yield* S.say('BRONK', 'Where are they. I can smell them. I can smell them in my TEETH.', { at: bronk });
  yield* S.say('VELA', "There are no pancakes, Bronk.", { at: vela });
  yield* S.say('BRONK', '...', { at: bronk });
  yield* S.say('VELA', 'There is a dodo nest forty paces from that door. Bring me an egg and there will be.', { at: vela });
  Emotes.show(bronk, 'sweat', 1.2);
  yield* S.say('BRONK', 'That bird and I have history.', { at: bronk });
  yield* S.say('VELA', 'I know. You started it.', { at: vela });
  yield 0.3;

  // ==================================================== 4. THE EGG
  yield* S.cut('home', { night: false, fire: 0 }, [HOME.nest - 10, 330], 0.6);
  setOpt({ night: false, fire: 0 });
  bronk.x = HOME.nest - 62; bronk.facing = 1; bronk.play('idle');
  vela.visible = false; blaze.visible = false;
  yield 0.4;
  yield* S.say('BRONK', 'Morning. Lovely nest. Just borrowing one of these.', { at: bronk });
  yield 0.3;
  Emotes.show(bronk, '!', 0.8);
  AudioSys.sfx('roar', { pitch: 520, vol: 0.8, len: 0.5 });
  Juice.shake(9, 0.4);
  yield 0.6;
  // --- the wrestle. no words, just clicking.
  bronk.visible = false;
  const nCX = HOME.nest - VW * 0.52, nCY = GY - VH * 0.74;
  yield* S.mini(new EggGame({
    groundY: GY, camX: nCX, camY: nCY,
    heroX: HOME.nest - 76, foeX: HOME.nest + 68,
    paint: () => World.home(S.t, { fire: 0, eggGone: true }, nCX),
  }));
  bronk.visible = true;
  setOpt({ eggGone: true });
  Popups.add(W / 2, 200, 'ONE (1) EGG', '#ffe98a', { world: false, scale: 2, life: 1.6 });
  AudioSys.sfx('unlock');
  yield 1.0;
  yield* S.say('BRONK', 'Worth it.', { at: bronk });
  yield 0.3;

  // ============================================= 5. COOKING BY RAPTOR
  yield* S.cut('home', { night: false, fire: 0.2, eggGone: true }, [HOME.stove - 30, 326], 0.6);
  bronk.x = HOME.stove - 80; bronk.facing = 1;
  blaze.visible = true; blaze.play('idle');
  vela.visible = true; vela.x = HOME.table + 10; vela.facing = 1;
  yield 0.4;
  yield* S.say('', 'BLAZE the cook-fire raptor has been chained to this pit for six years. He has views.', { at: blaze, portrait: 'blaze_idle' });
  Emotes.show(blaze, 'anger', 1.6); AudioSys.sfx('detect');
  yield* S.say('BRONK', "Don't give me that. You get fed. You get a roof. You get to sit down all day.", { at: bronk });
  bronk.visible = false; blaze.visible = false; vela.visible = false;
  const kCX = HOME.stove - VW * 0.52, kCY = GY - VH * 0.74;
  const cook = yield* S.mini(new KickGame({
    groundY: GY, camX: kCX, camY: kCY,
    heroX: HOME.stove - 74, foeX: HOME.stove + 10, panX: HOME.stove - 30,
    paint: () => World.home(S.t, { fire: 0.8, eggGone: true }, kCX),
  }));
  bronk.visible = true; blaze.visible = true; vela.visible = true;
  setOpt({ fire: 1 });
  Juice.flash('#ffa832', 0.4, 3); AudioSys.sfx('fire_whoosh');
  Particles.fire(HOME.stove, GY - 40, 24);
  yield* S.snap(HOME.stove - 40, 326);
  if (cook && cook.win) { run.hp = Math.min(run.maxHp, run.hp + 8); yield* S.say('VELA', "Perfect. See? He responds to encouragement.", { at: vela }); }
  else yield* S.say('VELA', "It's black, Bronk. You have cooked a stone.", { at: vela });
  Emotes.show(blaze, 'anger', 2);
  yield 0.4;

  // ============================================= 6. THE MAMMOTH SHOWER
  yield* S.cut('home', { night: false, fire: 1, eggGone: true, showerOn: true }, [HOME.shower + 20, 318], 0.6);
  bronk.x = HOME.shower - 14; bronk.y = GY; bronk.facing = 1; bronk.play('idle');
  vela.visible = false; blaze.visible = false;
  const mam = S.add('mam', { base: 'mammoth', x: HOME.shower + 130, y: GY, scale: 0.9, facing: -1, clip: 'shower' });
  yield 0.4;
  yield* S.say('BRONK', 'Morning, Trunks. Warm one today, eh?', { at: bronk });
  yield* S.say('', 'Trunks charges one bucket of nuts a week and has never once got the temperature right.', { at: mam, portrait: 'mammoth_idle' });
  for (let i = 0; i < 3; i++) { Particles.splash(HOME.shower, GY - 110, 12); AudioSys.sfx('spray'); yield 0.45; }
  AudioSys.sfx('gasp'); Juice.shake(5, 0.3); Emotes.show(bronk, '!', 1.0);
  yield* S.say('BRONK', 'COLD. COLD. THAT IS COLD, TRUNKS.', { at: bronk });
  run.hp = Math.min(run.maxHp, run.hp + 6);
  Popups.add(bronk.x, bronk.top, 'CLEAN ENOUGH  +6 HP', '#86e8d2', { scale: 1.2, life: 1.8 });
  yield 0.8;

  // ==================================================== 7. OFF TO WORK
  const kidA = S.add('kida', { base: 'kid_a', x: HOME.door + 70, y: GY, scale: 0.9 });
  const kidB = S.add('kidb', { base: 'kid_b', x: HOME.door + 104, y: GY, scale: 0.9, facing: -1 });
  vela.visible = true; vela.x = HOME.door + 44; vela.y = GY; vela.facing = 1; vela.play('idle');
  yield* S.pan(HOME.door + 86, 318, 0.5);
  yield* S.say('VELA', 'Quarry. Rocks. Home by dark. Try not to be eaten.', { at: vela });
  yield* S.say('PEBBLE', 'Bring back a rock shaped like a face!', { at: kidA });
  yield* S.say('BRONK', 'Every rock is shaped like a face if you work at the quarry long enough.', { at: bronk });
  yield 0.3;
  setOpt({ showerOn: false });
  // past the shower, down the yard, to the car
  bronk.x = HOME.shower - 30; bronk.y = GY; bronk.facing = 1;
  S.cam.follow = bronk;
  yield* S.walk('bronk', HOME.car - 46, GY, 130);
  S.cam.follow = null; S.cam.lookAt(HOME.car - 10, 322);
  S.hide('vela', 'kida', 'kidb', 'mam');
  yield 0.4;
  yield* S.say('BRONK', 'Right. Rocks.', { at: bronk });
  AudioSys.sfx('car_start');
  bronk.visible = false;
  yield 0.6;

  // ==================================================== 8. THE CHILL DRIVE
  AudioSys.play('drive', { fade: 0.4 });
  const drive = yield* S.mini(new SideScroll({
    vehicle: 'car', vehicleScale: 1, startX: 0, goal: 2400, speed: 130, auto: 140, grip: 3,
    paint: Scroll('road'),
    title: 'THE COMMUTE', sub: 'no rush',
    pickups: Array.from({ length: 8 }, (_, i) => ({ x: 300 + i * 260, spr: 'icon_coin', label: '+1 shell' })),
  }));
  run.gold += (drive ? drive.got : 0) * 5;

  // ==================================================== 9. THE QUARRY
  yield* S.cut('quarry', {}, [440, 318], 0.7);
  bronk.visible = true; bronk.x = 380; bronk.y = GY; bronk.facing = 1; bronk.play('idle');
  AudioSys.play('drive', { fade: 0.6 });
  yield 0.5;
  yield* S.say('BRONK', 'Another beautiful day of hitting a big rock until it is small rocks.', { at: bronk });
  yield 0.3;
  // something comes out of the mine
  const trex = S.add('trex', { base: 'trex', x: 700, y: GY, scale: 1, facing: -1 });
  trex.play('roar');
  const vic = S.add('vic', { base: 'villager', x: 600, y: GY, scale: 0.9, facing: -1 });
  const vic2 = S.add('vic2', { base: 'villager2', x: 566, y: GY, scale: 0.9, facing: -1 });
  yield* S.pan(600, 314);
  AudioSys.play('chase', { fade: 0.4, intensity: 2 });
  AudioSys.sfx('rumble', { vol: 0.9, len: 1.4 });
  Juice.shake(10, 0.9);
  yield 0.8;
  AudioSys.sfx('roar', { pitch: 46, vol: 1, len: 1.8 });
  Juice.shake(16, 1.2); Juice.flash('#ffffff', 0.35, 4);
  Emotes.show(vic, '!', 1.2); Emotes.show(vic2, '!', 1.2);
  yield 0.7;
  // the workforce leaves. one of them leaves vertically.
  vic.play('walk'); vic2.play('walk');
  Co.run(function* () {
    for (let i = 0; i < 300; i++) { vic.x -= Time.dt * 210; vic2.x -= Time.dt * 190; yield 0; }
  }());
  yield 0.5;
  const vic3 = S.add('vic3', { base: 'villager', x: 760, y: GY, scale: 0.9 });
  AudioSys.sfx('chomp');
  Juice.shake(8, 0.3);
  Popups.add(760, GY - 110, 'NOM', '#ef6a5e', { scale: 2.4, life: 1.4, vy: -30 });
  vic3.visible = false;
  Particles.spawn(760, GY - 60, { n: 14, color: ['#d8a86b', '#b07a45'], speed: 200, spread: 6.28, life: 0.9, size: 5, sizeEnd: 0, gravity: 300 });
  yield 0.6;
  yield* S.say('', 'That is Gary. Gary is fine. Gary is mostly fine.', { at: trex, portrait: 'trex_idle' });
  yield* S.say('BRONK', "Right. RIGHT. I am the Employee of the Week. This is an Employee of the Week problem.", { at: bronk });
  yield 0.3;
  // --- he gives chase. it does not go far.
  bronk.play('run', { fps: 18 }); bronk.facing = 1;
  trex.play('walk');
  Co.run(function* () {
    for (let i = 0; i < 260; i++) {
      bronk.x += Time.dt * 200; trex.x += Time.dt * 300;
      Particles.dust(bronk.x - 22, GY, 1);
      S.cam.lookAt(bronk.x + 90, 316);
      yield 0;
    }
  }());
  yield 2.0;
  bronk.play('idle');
  yield* S.say('BRONK', '...it went towards the village. It went towards MY village.', { at: bronk });
  yield 0.3;

  // =============================================== 10. HOME, AT DUSK
  yield* S.cut('home', { dusk: true, fire: 0, eggGone: true, carGone: true }, [HOME.door + 20, 318], 0.8);
  bronk.x = HOME.door - 40; bronk.play('idle'); bronk.facing = 1;
  AudioSys.stop(0.5);
  yield 0.8;
  yield* S.say('BRONK', '...Vela? PEBBLE? ROXY?', { at: bronk });
  yield 0.4;
  blaze.visible = true; blaze.x = HOME.shower + 90; blaze.y = GY; blaze.facing = 1; blaze.play('walk', { fps: 14 });
  vela.visible = true; vela.x = HOME.shower + 132; vela.y = GY - 26; vela.scale = 0.8; vela.play('cry');
  S.show('kida', 'kidb');
  kidA.x = HOME.shower + 158; kidA.y = GY - 22; kidA.scale = 0.7;
  kidB.x = HOME.shower + 178; kidB.y = GY - 22; kidB.scale = 0.7;
  yield* S.pan(HOME.shower + 130, 306);
  AudioSys.play('chase', { fade: 0.2, intensity: 2 });
  yield 0.6;
  Emotes.show(blaze, 'anger', 1.6);
  yield* S.say('BLAZE', 'SIX YEARS of your breakfasts. Six. Years. Now you can chase ME for a while.', { at: blaze });
  yield* S.say('VELA', "BRONK! He unchained himself! He had HANDS the whole time!", { at: vela });
  yield* S.say('BRONK', 'HE HAD WHAT', { at: bronk });
  yield 0.3;
  // and the thing from the quarry followed him home
  AudioSys.sfx('roar', { pitch: 44, vol: 1, len: 1.8 });
  Juice.shake(16, 1.1);
  yield* S.pan(HOME.door - 90, 306);
  trex.visible = true; trex.x = HOME.door - 210; trex.y = GY; trex.facing = 1; trex.play('walk');
  yield 0.9;
  yield* S.say('BRONK', 'Oh, come ON.', { at: bronk });
  yield 0.3;
  // --- the big one: chase the raptor, with the tyrant on your heels
  const chase = yield* S.mini(new SideScroll({
    vehicle: 'car', vehicleScale: 1, startX: 0, goal: 2200, speed: 320, grip: 5,
    paint: Scroll('canyon', { embers: true }),
    ahead: { spr: 'blaze_walk', gap: 420, speed: 258, scale: 1, carry: 'vela_cry' },
    pursuer: { spr: 'trex_walk', gap: 400, speed: 244, scale: 1.1 },
    pursuerRamp: 30, leash: 560, catchTime: 3.0,
    title: 'ONE IN FRONT, ONE BEHIND', sub: 'a normal tuesday',
  }));

  // =============================================== 11. THE BREAKDOWN
  yield* S.cut('canyon', { embers: true }, [400, 318], 0.7);
  bronk.x = 380; bronk.y = GY; bronk.facing = 1; bronk.play('hurt');
  S.hide('vela', 'kida', 'kidb', 'blaze');
  trex.visible = true; trex.x = 620; trex.y = GY; trex.facing = -1; trex.play('walk');
  S.overlay = world => { if (!world) return; Gfx.sprite('car', 336, GY + 2, { anchor: 'bc', frame: 0, rot: 0.12 }); };
  AudioSys.sfx('thud'); Juice.shake(10, 0.5);
  for (let i = 0; i < 16; i++) Particles.spawn(336, GY - 40, { n: 1, color: ['#3b3048', '#574a66'], speed: 60, gravity: -40, life: 2.2, size: 6, sizeEnd: 0 });
  yield 0.9;
  yield* S.say('BRONK', 'No. No no no. Not the wheel. NOT THE WHEEL.', { at: bronk });
  trex.play('roar');
  yield* S.pan(500, 306);
  AudioSys.sfx('roar', { pitch: 40, vol: 1, len: 2 });
  Juice.shake(18, 1.4);
  Co.run(function* () { for (let i = 0; i < 300; i++) { if (trex.x > 452) trex.x -= Time.dt * 48; yield 0; } }());
  yield 1.4;
  bronk.play('shock');
  yield* S.say('BRONK', "...alright. Alright. It's been a good run. Tell the kids I said the rock looked like a face.", { at: bronk });
  yield 0.5;

  // ==================================================== 12. THE BEAM
  AudioSys.stop(0.2);
  yield 0.4;
  const beamX = trex.x;
  let beam = 0;
  S.overlay = world => {
    if (!world) return;
    Gfx.sprite('car', 336, GY + 2, { anchor: 'bc', frame: 0, rot: 0.12 });
    if (beam <= 0) return;
    const ctx = Gfx.ctx, w = 18 + beam * 46;
    ctx.globalAlpha = clamp(beam, 0, 1) * 0.9;
    const g = ctx.createLinearGradient(0, -300, 0, GY);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,233,138,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0.95)');
    ctx.fillStyle = g; ctx.fillRect(beamX - w / 2, -320, w, GY + 320);
    ctx.globalAlpha = 1;
    Gfx.glow(beamX, GY - 60, 140 * beam, '#ffe98a', 0.5 * beam);
  };
  AudioSys.sfx('thunder');
  Co.run(function* () { for (let i = 0; i < 60; i++) { beam = Math.min(1.6, beam + Time.dt * 5); yield 0; } }());
  Juice.flash('#ffffff', 0.7, 6); Juice.shake(20, 0.9); Juice.punch(0.12);
  yield* S.pan(470, 310);
  yield 0.8;
  trex.play('roar'); trex.flash('#ffffff', 0.5);
  AudioSys.sfx('roar', { pitch: 300, vol: 0.9, len: 1.2 });
  Co.run(function* () { for (let i = 0; i < 400; i++) { trex.x += Time.dt * 400; Particles.dust(trex.x - 40, GY, 1); yield 0; } }());
  yield 1.1;
  trex.visible = false;
  Co.run(function* () { for (let i = 0; i < 80; i++) { beam = Math.max(0, beam - Time.dt * 2.2); yield 0; } }());
  yield 0.7;

  // ============================================ 13. THE ROCKSTAR ELDER
  AudioSys.play('village', { fade: 1.4 });
  const elder = S.add('elder', { base: 'elder', x: beamX, y: GY, scale: 1, facing: -1 });
  elder.alpha = 0;
  Co.run(function* () { for (let i = 0; i < 60; i++) { elder.alpha = Math.min(1, elder.alpha + Time.dt * 2); yield 0; } }());
  yield* S.pan((bronk.x + elder.x) / 2, 312);
  yield 0.9;
  yield* S.say('ELDER', 'Legs will not catch that raptor, Bronk. It runs on spite. You will need something louder.', { at: elder });
  yield* S.say('BRONK', 'Louder than a raptor.', { at: bronk });
  yield* S.say('ELDER', 'Louder than the sky.', { at: elder });
  // the handoff
  yield* S.pan(bronk.x + 30, 310);
  AudioSys.sfx('unlock');
  Particles.sparkle(bronk.x + 20, GY - 70, 26, ['#ffe98a', '#ffffff']);
  FX.burst(bronk.x + 20, GY - 70, { scale: 1.6 });
  yield 0.4;
  S.overlay = world => {
    if (!world) return;
    Gfx.sprite('car', 336, GY + 2, { anchor: 'bc', frame: 0, rot: 0.12 });
    Gfx.glow(bronk.x + 18, GY - 66, 60, '#ffe98a', 0.35 + Math.sin(Time.t * 6) * 0.08);
    Gfx.sprite('art_bass', bronk.x + 18, GY - 66, { anchor: 'c', scale: 1.1, rot: -0.3 });
  };
  Popups.add(bronk.x + 20, GY - 120, 'THE ROCK-AXE', '#ffe98a', { scale: 2.2, life: 2.2 });
  bronk.play('idle');
  yield 1.4;
  yield* S.say('ELDER', 'Rally what is left of this valley. Then go and get them back.', { at: elder });
  yield* S.say('BRONK', "I don't know how to play this.", { at: bronk });
  yield* S.say('ELDER', 'You did in your sleep.', { at: elder });
  // and he is gone
  AudioSys.sfx('ghost');
  Particles.sparkle(elder.x, GY - 60, 24, ['#ffe98a', '#b177e6']);
  Co.run(function* () { for (let i = 0; i < 60; i++) { elder.alpha = Math.max(0, elder.alpha - Time.dt * 2.4); yield 0; } }());
  yield 0.9;
  elder.visible = false;
  yield* S.say('BRONK', 'Cool. Cool cool cool.', { at: bronk });
  yield 0.3;
  bronk.play('play');
  AudioSys.sfx('encore');
  Juice.flash('#ffe98a', 0.4, 3);
  yield 1.4;
  yield* S.titleCard('ONGA BONGA', 'go and get them back', 2.6);
  S.flash = 1;
  yield 0.3;
  S.overlay = null;
  Game.startVillage();
}
