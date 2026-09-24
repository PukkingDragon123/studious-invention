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
    this.zoomMul = 1;                                  // a beat may pull the camera back
    this.actors = {}; this.set = 'home'; this.setOpt = {};
    this.t = 0; this.fade = 0; this.fadeTarget = 0; this.title = null; this.skipT = 0;
    this.flash = 0; this.riffGame = null;
    this.done = false; this.hud = null; this.overlay = null; this.backdrop = null;
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
  // A stone tablet, held up to the camera. Paperwork, in this valley, is
  // eleven kilos of slate and somebody has to carry it.
  *tabletCard(lines, dur = 3.0) {
    let t = 0;
    const prev = this.overlay;
    const W2 = 380, H2 = 44 + lines.length * 30;
    this.overlay = world => {
      if (prev) prev(world);
      if (world) return;
      const k = clamp(t / 0.35, 0, 1), out = clamp((dur - t) / 0.3, 0, 1);
      Gfx.rectA(0, 0, W, H, '#120c16', 0.78 * Math.min(k, out));
      const rise = (1 - Ease.outBack(k)) * 60;
      Gfx.ctx.globalAlpha = Math.min(1, out);
      World.tablet(W / 2 - W2 / 2, H / 2 - H2 / 2 + rise + Math.sin(t * 2) * 3, W2, H2, lines, { pad: 24, gap: 30 });
      Gfx.ctx.globalAlpha = 1;
    };
    AudioSys.sfx('card');
    while (t < dur) { t += Time.dt; yield 0; }
    this.overlay = prev;
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
  // A slow, eased camera move over a fixed time - the establishing shot, the
  // push down a corridor. pan() is for reframing; this is for moving.
  *glide(x, y, dur = 3, ease = Ease.inOutQuad) {
    const x0 = this.cam.x, y0 = this.cam.y;
    let t = 0;
    while (t < dur) {
      t += Time.dt;
      const k = ease(clamp(t / dur, 0, 1));
      this.cam.lookAt(lerp(x0, x, k), lerp(y0, y, k), true);
      yield 0;
    }
  }
  *snap(x, y) { this.cam.lookAt(x, y, true); yield 0; }
  *walk(key, x, y, speed) {
    const a = this.actors[key]; a.play('walk');
    while (!a.moveTo(x, y ?? a.y, Time.dt, speed || a.speed)) yield 0;
    a.play('idle');
  }
  camX() { return this.cam.x - W / (2 * this.cam.zoom); }
  camY() { return this.cam.y - H / (2 * this.cam.zoom); }
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
      bars: 2, density: 0.5, title: '', windowMult: 2.2, speedMul: 0.8,
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
    this.cam.zoom = this.cam.tzoom = VIEW * this.zoomMul;   // one scale, unless a beat says otherwise
    this.cam.update(dt);
    // the camera is held, not tripod-mounted: it breathes a pixel or two
    if (!(this.cam.shakeT > 0)) {
      this.cam.ox = Math.sin(this.t * 0.37) * 1.6 + Math.sin(this.t * 0.83 + 1) * 0.7;
      this.cam.oy = Math.sin(this.t * 0.29 + 2) * 1.1;
    }
    // bars top and bottom while it is a film; off while you are playing
    Juice.letterbox(!Game.mini && !this.riffGame && !this.o.noBars);
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
    if (this.backdrop) this.backdrop();
    // sortY lets an actor sit in front of something taller than it - the man
    // standing on the tyrannosaur is higher up the screen but nearer the camera
    const list = Object.values(this.actors).filter(a => a.visible).map(a => ({ y: a.sortY ?? a.y, a }));
    list.sort((p, q) => p.y - q.y);
    for (const it of list) it.a.draw();
    const front = World[this.set + 'Front'];
    if (front) front(this.t, this.setOpt, this.camX());
    Particles.draw(Gfx.ctx, true);
    FX.draw(true);
    Popups.draw(true);
    Emotes.draw();
    Floaters.draw();
    if (this.overlay) this.overlay(true);
    if (Settings.lighting !== false) SetLight.run(this.set, this.t, this.setOpt, this.camX(), this.lights);
    this.cam.restore(Gfx.ctx);
    if (Settings.lighting !== false) { SetLight.post(this.set, this.setOpt); Film.grain(); }
    Particles.draw(Gfx.ctx, false);
    FX.draw(false);
    Popups.draw(false);
    if (Game.mini) Game.mini.draw();
    if (this.riffGame) this.riffGame.draw();
    if (this.overlay) this.overlay(false);
    if (this.hud) this.hud();
    Dialogue.draw();
    if (this.title) {
      // the title, carved into a slab that rises into the shot and sinks out
      const k = this.title.t / this.title.life;
      const a = clamp(k < 0.14 ? k / 0.14 : k > 0.8 ? (1 - k) / 0.2 : 1, 0, 1);
      const rise = (1 - Ease.outBack(clamp(k / 0.2, 0, 1))) * 50;
      const tw = Math.max(420, Gfx.measure(this.title.text, 4.2) + 90), th = this.title.sub ? 132 : 104;
      const tx = W / 2 - tw / 2, ty = H / 2 - th / 2 - 30 + rise;
      Gfx.ctx.globalAlpha = a;
      Gfx.glow(W / 2, ty + th / 2, 300, '#ffa832', 0.14);
      UI.slab(tx, ty, tw, th, { r: 6, shadow: true });
      const carve = (txt, y, sc, col) => {
        Gfx.text(txt, W / 2, y + 3, { color: SKIN.faceHi, align: 'center', scale: sc });
        Gfx.text(txt, W / 2 + 1, y + 1, { color: '#3a2415', align: 'center', scale: sc });
        Gfx.text(txt, W / 2, y, { color: col, align: 'center', scale: sc });
      };
      carve(this.title.text, ty + 22, 4.2, '#9c3510');
      if (this.title.sub) carve(this.title.sub, ty + th - 36, 1.4, '#3a2415');
      // a glint crossing the carving
      const gx = tx + ((this.title.t * 0.6) % 1.4) * tw;
      Gfx.ctx.save();
      Gfx.ctx.beginPath(); Gfx.ctx.rect(tx + 6, ty + 6, tw - 12, th - 12); Gfx.ctx.clip();
      Gfx.ctx.globalAlpha = a * 0.3;
      Gfx.ctx.fillStyle = '#fffaea';
      Gfx.ctx.beginPath(); Gfx.ctx.moveTo(gx, ty + 8); Gfx.ctx.lineTo(gx + 16, ty + 8); Gfx.ctx.lineTo(gx - 14, ty + th - 8); Gfx.ctx.lineTo(gx - 30, ty + th - 8); Gfx.ctx.fill();
      Gfx.ctx.restore();
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

  // ============================================== 0. MORNING, SUCH AS IT IS
  // No logo, no dream, no waiting. A man on his back in a hole in a hill,
  // making a noise you could quarry against.
  S.set = 'home'; S.setOpt = { night: true, fire: 0 };
  S.zoomMul = 1;
  // it opens outside, under the stars, and drifts in through the door
  S.cam.lookAt(HOME.door + 260, 312, true);
  AudioSys.play('home', { fade: 1.6 });
  // up on the bed, on the pelt, with his head on the pillow
  const bronk = S.add('bronk', { base: 'bronk', x: HOME.bed + 6, y: GY - 14, scale: 1, facing: 1 });
  bronk.play('sleep');
  const dodo = S.add('dodo', { base: 'dodo', x: HOME.perch, y: GY - 58, scale: 0.8, facing: -1 });
  dodo.play('idle');
  // the snoring, drifting up off him and coming apart
  let snore = 1;
  S.overlay = world => {
    if (!world || snore < 0.01) return;
    const T = Time.t;
    for (let i = 0; i < 3; i++) {
      const k = ((T * 0.34 + i * 0.33) % 1);
      const a = Math.sin(k * Math.PI) * snore;
      if (a < 0.02) continue;
      Gfx.ctx.globalAlpha = a * 0.9;
      Gfx.text('Z', bronk.x - 26 + k * 46 + Math.sin(k * 7) * 5, GY - 48 - k * 66,
        { color: '#c4b89a', align: 'center', scale: 1.2 + k * 2.2, outline: true, outlineWidth: 2 });
      Gfx.ctx.globalAlpha = 1;
    }
  };
  yield 0.8;
  Co.run(S.glide(HOME.bed + 34, 330, 6.4), S);
  yield 0.6;
  yield* S.titleCard('ONGA BONGA', 'a stone age rock saga', 3.6);
  yield 2.4;
  AudioSys.sfx('rumble', { vol: 0.3, len: 1.2 });
  yield* S.say('BRONK', 'mnnghhh... hnnkkk... mnnn...', { at: bronk });
  yield 0.3;

  // ================================================== 1. VELA, THREE TIMES
  const vela = S.add('vela', { base: 'vela', x: HOME.rug + 150, y: GY, scale: 1, facing: -1 });
  vela.play('walk');
  yield* S.pan(HOME.bed + 104, 326);
  while (!vela.moveTo(HOME.bed + 86, GY, Time.dt, 104)) yield 0;
  vela.play('idle'); vela.facing = -1;
  yield 0.4;
  yield* S.say('VELA', 'Up.', { at: vela });
  yield 0.5;
  yield* S.say('BRONK', '...', { at: bronk });
  yield 0.3;
  // she tries the volume
  Emotes.show(vela, 'anger', 1.4);
  AudioSys.sfx('detect');
  Juice.shake(5, 0.25);
  yield* S.say('VELA', 'BRONK. UP.', { at: vela });
  bronk.squash(0.16);
  snore = 0.45;
  yield 0.4;
  yield* S.say('BRONK', 'mmnnh. five more... centuries...', { at: bronk });
  yield 0.4;
  // she tries the other lever
  yield* S.say('VELA', "Fine. I'll just let the pancakes go cold.", { at: vela });
  yield* S.pan(bronk.x + 24, 316, 0.3);
  AudioSys.sfx('gasp');
  snore = 0;
  yield 0.45;
  // and he is vertical
  bronk.play('shock'); bronk.stretch(0.42);
  Juice.flash('#ffe98a', 0.3, 3); Juice.punch(0.08); Juice.shake(7, 0.3);
  AudioSys.sfx('detect');
  Particles.sparkle(bronk.x, GY - 50, 18, ['#ffe98a', '#ffffff']);
  FX.burst(bronk.x, GY - 46, { scale: 1.2 });
  yield 0.45;
  yield* S.say('BRONK', 'PANCAKES.', { at: bronk });
  yield 0.2;
  S.overlay = null;
  vela.visible = false; bronk.visible = false;
  // --- side-scroll: out of the bedroom, through the passage, to the table
  const dash = yield* S.mini(new SideScroll({
    base: 'bronk', moveClip: 'dash', idleClip: 'idle',
    startX: HOME.bed + 6, goal: HOME.table - 40, speed: 300,
    paint: Scroll('home', { night: true, fire: 0 }),
    title: 'PANCAKES', sub: 'this way',
    // rock shelves along the cave wall, because a man in a hurry takes the
    // high road through his own kitchen
    platforms: [
      { x: HOME.drum + 40, w: 118, h: 50, spr: 'h_ledge_a' },
      { x: HOME.arch - 56, w: 132, h: 70, spr: 'h_ledge_b' },
      { x: HOME.fossil + 30, w: 122, h: 54, spr: 'h_ledge_c' },
    ],
    pickups: [
      { x: HOME.drum + 96, y: GY - 82, spr: 'icon_coin', label: '+1 shell' },
      { x: HOME.arch + 10, y: GY - 102, spr: 'icon_coin', label: '+1 shell' },
      { x: HOME.fossil + 88, y: GY - 86, spr: 'icon_coin', label: '+1 shell' },
    ],
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
  yield* S.say('VELA', 'There is an egg in that pot and a raptor under that pit. Work it out.', { at: vela });
  Emotes.show(bronk, 'sweat', 1.2);
  yield* S.say('BRONK', 'That raptor and I have history.', { at: bronk });
  yield* S.say('VELA', 'I know. You started it.', { at: vela });
  yield 0.3;

  // ============================================= 4. COOKING BY RAPTOR
  yield* S.cut('home', { night: false, fire: 0.2, eggGone: true }, [HOME.stove - 30, 326], 0.6);
  bronk.x = HOME.stove - 80; bronk.facing = 1;
  blaze.visible = true; blaze.play('idle');
  vela.visible = true; vela.x = HOME.table + 10; vela.facing = 1;
  yield 0.4;
  yield* S.say('', 'BLAZE the cook-fire raptor has been chained to this pit for six years. He has views.', { at: blaze, portrait: 'blaze_idle' });
  Emotes.show(blaze, 'anger', 1.6); AudioSys.sfx('detect');
  yield* S.say('BRONK', "Don't give me that. You get fed. You get a roof. You get to sit down all day.", { at: bronk });
  yield 0.3;
  // one boot, and breakfast is on
  bronk.play('dash', { fps: 16 });
  for (let i = 0; i < 3; i++) { bronk.x += 8; yield 0.06; }
  Juice.stop(0.12); Juice.shake(12, 0.4); Juice.flash('#ffa832', 0.45, 3);
  Juice.pow((W / 2) + 40, H * 0.58, { r: 64, spikes: 11, col: '#ffa832', word: 'BOOT!' });
  AudioSys.sfx('thud'); AudioSys.sfx('fire_whoosh');
  Emotes.show(blaze, 'anger', 2);
  Particles.fire(HOME.stove, GY - 30, 30);
  setOpt({ fire: 1 });
  yield 0.5;
  bronk.play('idle'); bronk.x = HOME.stove - 80;

  yield* S.say('BLAZE', 'ONE DAY, BRONK.', { at: blaze });
  run.hp = Math.min(run.maxHp, run.hp + 8);
  Popups.add(bronk.x, bronk.top, 'BREAKFAST  +8 HP', '#86e8d2', { scale: 1.2, life: 1.8 });
  yield* S.say('VELA', "Perfect. See? He responds to encouragement.", { at: vela });
  yield 0.4;

  // ============================================= 5. THE MAMMOTH SHOWER
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

  // ==================================================== 6. OFF TO WORK
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

  // ==================================================== 7. THE COMMUTE
  // A black card to get him out of the yard, and then the valley, driven.
  AudioSys.play('drive', { fade: 0.4 });
  yield* S.mini(new DriveCard({ dur: 1.7 }));
  yield* S.mini(new DriveGame());

  // ==================================================== 8. THE SHIFT
  S.hide('dodo', 'mam', 'blaze', 'vela', 'kida', 'kidb');    // none of them came to work
  yield* S.cut('quarry', {}, [QUARRY.boss + 40, 318], 0.7);
  bronk.visible = true; bronk.x = QUARRY.boss - 130; bronk.y = GY; bronk.facing = 1; bronk.play('walk');
  AudioSys.play('drive', { fade: 0.6 });
  const boss = S.add('boss', { base: 'brute', x: QUARRY.boss + 46, y: GY, scale: 1, facing: -1 });
  // the foreman never takes the hat off. it is the whole personality.
  S.overlay = world => {
    if (!world || !boss.visible) return;
    const hy = boss.y + boss.bob - 74;
    Gfx.round(boss.x - 15, hy - 5, 30, 13, 5, '#6b4a10');
    Gfx.round(boss.x - 12, hy - 4, 24, 6, 3, '#e0b93a');
    Gfx.round(boss.x - 20, hy + 6, 40, 5, 2, '#6b4a10');
    Gfx.round(boss.x - 4, hy - 10, 8, 7, 3, '#ffe98a');
  };
  yield* S.walk('bronk', QUARRY.boss - 62, GY, 120);
  yield 0.3;
  yield* S.say('FOREMAN', 'Rockbottom. You are four minutes late and I have written it down.', { at: boss });
  yield* S.say('BRONK', 'You write everything down.', { at: bronk });
  yield* S.say('FOREMAN', 'I write everything down.', { at: boss });
  yield 0.3;
  // the tablet: this is a job description, and it weighs eleven kilos
  AudioSys.sfx('thud'); Juice.shake(6, 0.3); Juice.punch(0.05);
  yield* S.say('FOREMAN', "Face three. Three crystal in the box and you get your shell. Same as yesterday.", { at: boss });
  Popups.add(bronk.x, GY - 120, 'YOUR JOB', '#ffe98a', { scale: 1.8, life: 1.6 });
  yield* S.tabletCard([
    { t: 'DAY SHIFT', s: 1.2, c: '#241c2e' },
    { t: 'BRONK ROCKBOTTOM', s: 1.8 },
    { t: 'FACE THREE', s: 1.3, c: '#241c2e' },
    { t: '3 CRYSTAL = 1 SHELL', s: 1.6, c: '#7d1d2b' },
  ], 3.0);
  yield* S.say('BRONK', 'Eleven kilos. My job description weighs eleven kilos.', { at: bronk });
  yield 0.3;
  // --- and then you do it
  AudioSys.play('blaze', { fade: 0.5 });
  const shift = yield* S.mini(new MineGame({ need: 3, title: 'FACE THREE' }));
  run.gold += 1;
  AudioSys.sfx('gold');
  S.setOpt = Object.assign({}, S.setOpt, { mined: 3 });
  yield* S.snap(QUARRY.box - 30, 318);
  bronk.x = QUARRY.box - 96; bronk.play('idle'); bronk.facing = 1;
  boss.visible = true; boss.x = QUARRY.box + 62; boss.facing = -1;
  Popups.add(bronk.x, GY - 130, '+1 SHELL', '#ffe98a', { scale: 2.2, life: 2.0 });
  Particles.sparkle(bronk.x, GY - 70, 20, ['#ffe98a', '#ffffff']);
  yield 1.1;
  yield* S.say('BRONK', 'One shell. For an entire mountain.', { at: bronk });
  yield* S.say('FOREMAN', 'Market rate.', { at: boss });
  yield 0.4;

  // ----------------------------------------- and then the day stops being one
  AudioSys.stop(0.2);
  yield 0.5;
  AudioSys.sfx('rumble', { vol: 1, len: 2.0 });
  Juice.shake(12, 1.1);
  Emotes.show(bronk, '?', 1.2);
  yield 0.9;
  AudioSys.play('chase', { fade: 0.3, intensity: 2 });
  AudioSys.sfx('roar', { pitch: 46, vol: 1, len: 2.0 });
  Juice.shake(20, 1.4); Juice.flash('#ffffff', 0.4, 4);
  const trex = S.add('trex', { base: 'trex', x: QUARRY.box - 380, y: GY, scale: 1.1, facing: 1 });
  trex.play('roar');
  S.lights = () => { if (trex.visible) Light.point(trex.x + 30, GY - 90, 300, { color: '#ef6a5e', flicker: 0.12, glow: 0.18, power: 0.8 }); };
  yield* S.pan(QUARRY.box - 280, 310, 0.6);
  Emotes.show(bronk, '!', 1.4);
  yield 0.8;
  yield* S.say('BRONK', 'THAT IS NOT ONE OF OURS.', { at: bronk });
  // it walks through the shift. the shift does not survive it.
  trex.play('walk');
  Co.run(function* () {
    let stepT = 0;
    for (let i = 0; i < 400; i++) {
      trex.x += Time.dt * 120;
      if (chance(Time.dt * 22)) Particles.spawn(trex.x + rnd(-80, 80), GY - rnd(0, 90),
        { n: 1, color: ['#7a6d8a', '#574a66', '#e06a1b'], speed: 190, spread: 6.28, life: 1.2, size: 5, sizeEnd: 0, gravity: 340 });
      // every footfall throws a piece of the quarry floor at the camera
      stepT += Time.dt;
      if (stepT > 0.44) {
        stepT = 0;
        Particles.stomp(trex.x - 16, GY + 2, 1.5);
        Particles.debris(trex.x + rnd(-60, 60), GY, 6);
        Juice.shake(9, 0.2); AudioSys.sfx('thud', { vol: 0.7 });
      }
      yield 0;
    }
  }());
  for (let i = 0; i < 3; i++) {
    Juice.pow(W / 2 + rnd(-200, 200), H * 0.5 + rnd(-60, 60), { r: 70, spikes: 11, col: '#ef6a5e', word: pick(['CRUNCH', 'WHAM', 'SMASH']) });
    AudioSys.sfx('bighit');
    yield 0.5;
  }
  yield* S.say('', 'Six derricks, four carts and a triceratops named Susan. All of it, in under a minute.', { at: trex, portrait: 'trex_idle' });
  yield 0.3;
  bronk.play('dash', { fps: 18 }); bronk.facing = -1;
  S.overlay = null;
  boss.visible = false;
  Co.run(function* () {
    for (let i = 0; i < 200; i++) { bronk.x -= Time.dt * 260; Particles.dust(bronk.x + 22, GY, 1); S.cam.lookAt(bronk.x - 70, 314); yield 0; }
  }());
  yield 1.2;
  yield* S.say('BRONK', 'car car car car car', { at: bronk });
  AudioSys.sfx('car_start');
  yield 0.6;
  bronk.visible = false; trex.visible = false;

  // ============================================ 8b. THE DRIVE HOME
  yield* S.mini(new DriveCard({ scared: true, dur: 1.5 }));
  yield* S.mini(new DriveGame({ scared: true }));

  // =============================================== 9. HOME, AT DUSK
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
    vehicle: true, vehicleScale: 1, startX: 0, goal: 2200, speed: 320, grip: 5,
    jump: true,
    obstacles: Array.from({ length: 15 }, (_, i) => ({
      x: 240 + i * 132 + (i % 3) * 38,
      spr: ['v_deadtree', 'v_rock', 'v_bones', 'v_basket'][i % 4],
      scale: i % 4 === 0 ? 0.62 : i % 4 === 1 ? 0.88 : 1.1, w: 40, h: i % 4 === 0 ? 54 : 36,
    })),
    paint: Scroll('flight', { embers: true }),
    ahead: { spr: 'blaze_walk', gap: 420, speed: 258, scale: 1, carry: 'vela_cry' },
    pursuer: { spr: 'trex_walk', roarSpr: 'trex_roar', gap: 400, speed: 244, scale: 1.15 },
    pursuerRamp: 46, leash: 520, catchTime: 3.0,
    title: 'ONE IN FRONT, ONE BEHIND', sub: 'jump, or be lunch',
  }));

  // =============================================== 10. THE BREAKDOWN
  yield* S.cut('flight', { embers: true }, [400, 318], 0.7);
  bronk.x = 380; bronk.y = GY; bronk.facing = 1; bronk.play('hurt');
  S.hide('vela', 'kida', 'kidb', 'blaze');
  trex.visible = true; trex.x = 620; trex.y = GY; trex.facing = -1; trex.play('walk');
  S.overlay = world => { if (!world) return; World.cart(336, GY + 2, { rot: 0.12 }); };
  AudioSys.sfx('thud'); Juice.shake(10, 0.5);
  for (let i = 0; i < 16; i++) Particles.spawn(336, GY - 40, { n: 1, color: ['#3b3048', '#574a66'], speed: 60, gravity: -40, life: 2.2, size: 6, sizeEnd: 0 });
  Particles.debris(336, GY, 18, ['#3b3048', '#574a66', '#5c3a20', '#85562f']);
  Particles.embers(336, GY - 30, 8);
  yield 0.9;
  yield* S.say('BRONK', 'No. No no no. Not the wheel. NOT THE WHEEL.', { at: bronk });
  trex.play('roar');
  yield* S.pan(500, 306);
  AudioSys.sfx('roar', { pitch: 40, vol: 1, len: 2 });
  Juice.shake(18, 1.4);
  Co.run(function* () {
    let st = 0;
    for (let i = 0; i < 300; i++) {
      if (trex.x > 452) trex.x -= Time.dt * 48;
      st += Time.dt;
      if (st > 0.62) {                                  // it is in no hurry, and it is very heavy
        st = 0;
        Particles.stomp(trex.x + 10, GY + 2, 1.7);
        Particles.debris(trex.x + rnd(-40, 40), GY, 7);
        Juice.shake(7, 0.22); AudioSys.sfx('thud', { vol: 0.8 });
      }
      if (chance(Time.dt * 8)) Particles.embers(rnd(280, 700), GY - rnd(0, 60), 1);
      yield 0;
    }
  }());
  yield 1.4;
  bronk.play('shock');
  yield* S.say('BRONK', "...alright. Alright. It's been a good run. Tell the kids I said the rock looked like a face.", { at: bronk });
  yield 0.5;

  // ==================================================== 11. THE BEAM
  AudioSys.stop(0.2);
  yield 0.4;
  const beamX = trex.x;
  let beam = 0;
  S.overlay = world => {
    if (!world) return;
    World.cart(336, GY + 2, { rot: 0.12 });
    if (beam <= 0) return;
    const ctx = Gfx.ctx, w = 18 + beam * 46;
    ctx.globalAlpha = clamp(beam, 0, 1) * 0.9;
    const g = ctx.createLinearGradient(0, -300, 0, GY);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,233,138,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0.95)');
    ctx.fillStyle = g; ctx.fillRect(beamX - w / 2, -320, w, GY + 320);
    ctx.globalAlpha = 1;
    Gfx.glow(beamX, GY - 60, 140 * beam, '#ffe98a', 0.5 * beam);
  };
  S.lights = () => {
    if (beam <= 0) return;
    Light.ray(beamX, -320, Math.PI / 2, GY + 330, 24 + beam * 40, 60 + beam * 70, { color: '#ffe98a', alpha: 0.22 * Math.min(1, beam), clear: 0.95 });
    Light.point(beamX, GY - 60, 260 * Math.min(1, beam), { color: '#ffe98a', glow: 0.28, core: 0.2 });
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

  // ============================================ 12. THE ROCKSTAR ELDER
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
    World.cart(336, GY + 2, { rot: 0.12 });
    Gfx.glow(bronk.x + 18, GY - 66, 60, '#ffe98a', 0.35 + Math.sin(Time.t * 6) * 0.08);
    Gfx.sprite('art_bass', bronk.x + 18, GY - 66, { anchor: 'c', scale: 1.1, rot: -0.3 });
  };
  Popups.add(bronk.x + 20, GY - 120, 'THE ROCK-AXE', '#ffe98a', { scale: 2.2, life: 2.2 });
  bronk.play('idle');
  yield 1.4;
  yield* S.say('ELDER', 'Rally what is left of this valley. Then go and get them back.', { at: elder });
  yield* S.say('BRONK', "I don't know how to play this.", { at: bronk });
  yield* S.say('ELDER', 'Nobody does. Hit it and find out.', { at: elder });
  // --- and this is where you learn what the whole game is: strike the strings
  bronk.play('play');
  AudioSys.play('title', { fade: 0.4, intensity: 1 });
  Popups.add(W / 2, 112, 'STRIKE THE STRINGS', '#ffe98a', { world: false, scale: 1.8, life: 2.4, vy: -10 });
  yield 0.4;
  yield* S.riff({ bars: 3, density: 0.35, title: 'FIRST RIFF', windowMult: 2.8, speedMul: 0.7 });
  AudioSys.sfx('cheer');
  for (let i = 0; i < 24; i++) Particles.confetti(rnd(W * 0.25, W * 0.75), 70, 1);
  Juice.flash('#ffe98a', 0.4, 4);
  AudioSys.stop(0.4);
  yield 0.5;
  yield* S.say('ELDER', 'There it is.', { at: elder });
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

// ---------------------------------------------------------------------------
// THE CAMPFIRE
// Played once an act, the first time he sits down at a fire. A man, a borrowed
// guitar, and whatever came to the edge of the light to listen. Nothing
// attacks. That is the whole point of it.
// ---------------------------------------------------------------------------
function* campfireScript(S) {
  const heal = S.o.heal || 0;
  S.set = 'camp'; S.setOpt = { fireX: CAMP.fire, watchers: 0 };
  S.zoomMul = 0.72;                          // stand back. the dark is half the picture.
  S.cam.lookAt(656, 306, true);
  AudioSys.play('rest', { fade: 1.4 });

  const bronk = S.add('bronk', { base: 'bronk', x: CAMP.bronk, y: GY + 12, scale: 1, facing: 1 });
  bronk.play('play'); bronk.shadow = false; bronk.sortY = GY - 40;
  // the actor exists for its animation clock only - it is painted by hand in
  // the overlay, because a flat silhouette is a blob and this needs to read as
  // a tyrannosaur: mostly swallowed by the dark, with one fire-lit edge.
  const rex = S.add('rex', { base: 'trex', x: CAMP.rex, y: GY + 8, scale: 1.3, facing: -1 });
  rex.play('idle'); rex.shadow = false; rex.visible = false;

  // it is standing there from the first frame. `lit` is only how much of it the
  // fire is picking out - at 0 it is the same black as the trees behind it.
  let lit = 0, eyes = 0, drool = 0;
  const hx = () => rex.x - 53, hy = () => rex.y - 114 + rex.bob;    // the eye
  const jx = () => rex.x - 50, jy = () => rex.y - 88 + rex.bob;     // the jaw line

  S.overlay = world => {
    if (!world) return;
    const T = Time.t;
    // the log he is sitting on, drawn over his legs so he is behind it
    Gfx.round(CAMP.bronk - 64, GY - 18, 112, 22, 10, '#241109');
    Gfx.round(CAMP.bronk - 60, GY - 17, 104, 5, 2, '#5c3a20');
    for (let i = 0; i < 5; i++) Gfx.rectA(CAMP.bronk - 52 + i * 21, GY - 12, 13, 2, '#0b0a18', 0.5);   // bark
    Gfx.rectA(CAMP.bronk - 60, GY - 6, 104, 7, '#e06a1b', 0.24 + Math.sin(T * 9) * 0.05);
    Gfx.round(CAMP.bronk + 40, GY - 19, 15, 24, 7, '#3a2415');      // the cut end, rings and all
    Gfx.round(CAMP.bronk + 43, GY - 15, 9, 15, 4, '#5c3a20');
    Gfx.round(CAMP.bronk + 46, GY - 11, 4, 7, 2, '#85562f');
    // the rock-axe, catching the fire on every downstroke
    Gfx.glow(bronk.x + 15, bronk.y + bronk.bob - 46, 70, '#ffa832', 0.26 + Math.sin(T * 5) * 0.07);
    Gfx.sprite('art_bass', bronk.x + 16, bronk.y + bronk.bob - 46,
      { anchor: 'c', scale: 1.05, rot: -0.34 + Math.sin(T * 4.2) * 0.06 });
    // the animal itself: a warm rim on the fire side, then the body over it.
    // it never fades out - it just stops being lit, which is worse.
    {
      const spr = rex.sprite, common = { anchor: 'bc', scale: rex.scale, frame: rex.frame, flip: true };
      if (lit > 0.02) Gfx.sprite(spr, rex.x - 4, rex.y + rex.bob,
        Object.assign({ tint: '#e06a1b', tintAmount: 1, alpha: 0.55 * lit }, common));
      Gfx.sprite(spr, rex.x, rex.y + rex.bob,
        Object.assign({ tint: '#07060f', tintAmount: 1 - 0.26 * lit }, common));
    }
    // two eyes, a long way back, at the height of a second-storey window
    if (eyes > 0.01) {
      const blink = Math.sin(T * 0.7) < -0.93 ? 0 : 1;
      const a = eyes * blink;
      const near = [hx(), hy()], far = [hx() + 12, hy() - 4];
      for (const [ex, ey, s] of [[near[0], near[1], 1], [far[0], far[1], 0.6]]) {
        Gfx.glow(ex, ey, 40 * s, '#ffa832', 0.34 * a * s);
        Gfx.rectA(ex - 3, ey - 2, 7, 4, '#ffe98a', 0.95 * a);
        Gfx.rectA(ex - 1, ey - 1, 2, 2, '#ef6a5e', 0.9 * a);        // the slit
      }
    }
    // and the drool: three strands off the jaw, and they do not stop
    if (drool > 0.01) {
      for (let i = 0; i < 3; i++) {
        const dx = jx() - 14 + i * 14;
        const len = (10 + Math.abs(Math.sin(T * (0.9 + i * 0.4) + i * 2.2)) * 26) * drool;
        for (let k = 0; k < len; k += 3)
          Gfx.rectA(dx + Math.sin(T * 2 + k * 0.1 + i) * 1.2, jy() + k, k > len - 7 ? 3 : 1, 3,
            '#6aa9ee', (0.16 + 0.34 * (k / len)) * drool);
      }
      if (chance(0.22)) Particles.spawn(jx() - 14 + rnd(0, 28), jy() + 24,
        { n: 1, color: ['#a8d8ff', '#6aa9ee'], speed: 6, gravity: 240, life: 1.1, size: 2, sizeEnd: 1 });
    }
  };

  // ------------------------------------------------------- 1. alone with it
  yield 0.9;
  yield* S.titleCard('CAMP', 'somewhere past the third ridge', 2.4);
  AudioSys.sfx('fire_whoosh', { vol: 0.35 });
  for (let i = 0; i < 10; i++) { Particles.fire(CAMP.fire + rnd(-16, 16), GY - 30, 1); yield 0.04; }
  yield 0.7;
  yield* S.say('BRONK', 'Just me, then.', { at: bronk });
  yield 0.5;

  // ------------------------------------------------- 2. something is out there
  AudioSys.sfx('thud', { vol: 0.4 });
  bronk.play('idle'); bronk.facing = 1;
  Emotes.show(bronk, '?', 1.1);
  yield* S.pan(742, 300, 0.9);
  AudioSys.sfx('roar', { pitch: 30, vol: 0.45, len: 1.9 });
  Juice.shake(3, 0.5);
  for (let i = 0; i < 46; i++) { lit = Math.min(1, lit + Time.dt * 1.2); eyes = Math.min(1, eyes + Time.dt * 1.1); yield 0; }
  yield 0.5;
  yield* S.say('BRONK', '...', { at: bronk });
  Emotes.show(bronk, 'sweat', 1.6);
  yield 0.4;
  for (let i = 0; i < 40; i++) { drool = Math.min(1, drool + Time.dt * 1.6); yield 0; }
  yield* S.say('BRONK', 'Nope. Nope. Absolutely not.', { at: bronk });
  yield 0.4;

  // ---------------------------------------------- 3. it does not come closer
  yield* S.pan(600, 310, 0.8);
  yield* S.say('', 'It does not come closer. It does not leave. It has picked a spot, and it is sitting in it.',
    { at: null, portrait: 'trex_idle' });
  yield 0.3;
  yield* S.say('BRONK', 'You want the fire? Take the fire. I have had a day.', { at: bronk });
  yield 0.5;
  yield* S.say('', 'The head tips. Very slightly. Toward the guitar.', { at: null, portrait: 'trex_idle' });
  yield 0.4;
  yield* S.say('BRONK', 'Oh.', { at: bronk });
  yield* S.say('BRONK', "You're not hungry. You're a fan.", { at: bronk });
  yield 0.4;

  // ------------------------------------------------------- 4. play it anyway
  bronk.play('play');
  AudioSys.sfx('strum', { vol: 0.7 });
  Juice.punch(0.03);
  yield* S.pan(640, 304, 0.4);
  Particles.sparkle(bronk.x + 16, GY - 60, 16, ['#ffe98a', '#ffa832']);
  yield 1.3;
  for (let i = 0; i < 3; i++) {
    Popups.add(bronk.x + rnd(-10, 40), GY - 80 - i * 6, '~', '#ffe98a', { scale: 2.2, life: 1.8, vy: -22 });
    AudioSys.sfx('strum', { vol: 0.5, pitch: 60 + i * 5 });
    yield 0.5;
  }
  yield 0.4;
  yield* S.say('BRONK', 'Tough crowd.', { at: bronk });
  yield 0.5;

  // ---------------------------------------------------------- 5. and it goes
  AudioSys.sfx('roar', { pitch: 26, vol: 0.3, len: 2.2 });
  Juice.shake(4, 0.6);
  for (let i = 0; i < 56; i++) {
    eyes = Math.max(0, eyes - Time.dt * 0.9);
    drool = Math.max(0, drool - Time.dt * 1.4);
    lit = Math.max(0, lit - Time.dt * 0.62);
    rex.x += Time.dt * 30;
    yield 0;
  }
  yield 0.5;
  yield* S.say('BRONK', 'Same time tomorrow, I guess.', { at: bronk });
  yield 0.6;
  if (heal) {
    Popups.add(bronk.x, GY - 110, `+${heal} HP`, '#a8e878', { scale: 2.2, life: 2.0 });
    Particles.sparkle(bronk.x, GY - 70, 20, ['#a8e878', '#ffe98a']);
    AudioSys.sfx('heal');
    yield 1.2;
  }
  S.fadeTarget = 1;
  yield 0.7;
  S.overlay = null;
  Game.leaveEvent();
}
