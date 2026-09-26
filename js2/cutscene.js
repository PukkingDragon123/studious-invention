// ---------------------------------------------------------------------------
// cutscene.js - the opening: dinner at the Rockbottoms', staged in the cave
// home and the yard outside it.
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
    Juice.letterbox(!this.riffGame && !this.o.noBars);
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
    const list = Object.values(this.actors).filter(a => a.visible && !a.manual).map(a => ({ y: a.sortY ?? a.y, a }));
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
    Post.ui();
    Particles.draw(Gfx.ctx, false);
    FX.draw(false);
    Popups.draw(false);
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
//
// Dinner at the Rockbottoms'. Whoever you picked wakes up, comes to the table
// and eats with the family - a whole roast T-Rex head, a proper occasion -
// until somebody knocks. It is a very large old lady, lost in the rain, and
// she would love a bite. Then she sees what is on the table.
// ---------------------------------------------------------------------------
function* introScript(S) {
  const run = Game.run, me = run.hero, H = Heroes.get(me);
  const others = Heroes.captives(me);
  const NAME = id => Heroes.get(id).name;
  const can = (a, clip) => !!SPRITES[a.base + '_' + clip];
  const pose = (a, clip, o) => a.play(can(a, clip) ? clip : 'idle', o);
  const kid = id => id === 'pebble' || id === 'roxy';
  const setOpt = o => { S.setOpt = Object.assign({}, S.setOpt, o); };
  S.set = 'home'; S.setOpt = { night: true, fire: 1 };
  S.zoomMul = 1;
  AudioSys.play('home', { fade: 1.4 });

  // the family, where dinner puts them: Dad at the head, Mum at the foot,
  // the kids on the stools in between
  const SEAT = { bronk: HOME.table - 94, pebble: HOME.table - 50, roxy: HOME.table + 52, vela: HOME.table + 96 };
  const A = {};
  for (const id of HERO_ORDER) {
    const a = S.add(id, { base: Heroes.get(id).base, x: SEAT[id], y: kid(id) ? GY - 24 : GY - 6, scale: 1, facing: SEAT[id] < HOME.table ? 1 : -1 });
    a.shadow = false; pose(a, 'eat'); a.t = Math.random() * 4;
    A[id] = a;
  }
  const hero = A[me];
  const blaze = S.add('blaze', { base: 'blaze', x: HOME.stove + 4, y: GY - 6, scale: 0.9, facing: -1 });
  const dodo = S.add('dodo', { base: 'dodo', x: HOME.perch, y: GY - 58, scale: 0.8, facing: -1 });
  // the hero starts in bed
  hero.x = HOME.bed + 6; hero.y = GY - 14; hero.facing = 1; pose(hero, 'sleep');
  if (!can(hero, 'sleep')) { hero.rot = -Math.PI / 2; hero.y = GY - 22; }

  // drawn over the people: the table and what is on it, so the family sits
  // behind it; the snores; the rain at the door; the tears
  let snore = 1, rain = 0, steam = 1, tears = 0, headGone = false, green = 0;
  const grabbed = [];
  let granny = null;
  S.overlay = world => {
    if (!world) {
      if (green > 0.01) Gfx.rectA(0, 0, W, H, '#6cc95c', green * 0.08);
      return;
    }
    const T = Time.t;
    // Grandma, drawn here so she stands over the pit and behind the table
    if (granny && granny.visible) {
      granny.manual = false; granny.draw(); granny.manual = true;
      grabbed.forEach((a, i) => {
        a.manual = false; a.visible = true;
        a.x = granny.x + granny.facing * (26 - i * 22) + Math.sin(T * 14 + i * 2) * 2;
        a.y = granny.y - 58 + i * 7 + Math.sin(T * 11 + i) * 2;
        a.rot = granny.facing * (1.25 - i * 0.2) + Math.sin(T * 9 + i) * 0.12;
        a.draw(); a.manual = true;
      });
    }
    // the table, again, in front of everyone sat at it
    Gfx.sprite('h_table', HOME.table, GY + 2, { anchor: 'bc' });
    for (let i = 0; i < 4; i++) {
      const sx = HOME.table - 54 + i * 36;
      Gfx.round(sx - 10, GY - 52, 20, 4, 2, '#8a7f68');
      Gfx.round(sx - 9, GY - 53, 18, 3, 1, '#e8dfc6');
    }
    if (!headGone) {
      Gfx.sprite('h_rexhead', HOME.table + 2, GY - 50, { anchor: 'bc' });
      if (steam > 0 && chance(0.2 * steam)) Particles.spawn(HOME.table + rnd(-18, 22), GY - 78, { n: 1, color: ['#fffaea', '#d6cfe0'], speed: 10, angle: -Math.PI / 2, spread: 0.3, gravity: -30, life: 1.4, size: 4, sizeEnd: 0 });
    }
    // snoring
    if (snore > 0.01) for (let i = 0; i < 3; i++) {
      const k = ((T * 0.34 + i * 0.33) % 1), a = Math.sin(k * Math.PI) * snore;
      if (a < 0.02) continue;
      Gfx.ctx.globalAlpha = a * 0.9;
      Gfx.text('Z', HOME.bed - 20 + k * 46 + Math.sin(k * 7) * 5, GY - 48 - k * 66, { color: '#c4b89a', align: 'center', scale: 1.2 + k * 2.2, outline: true, outlineWidth: 2 });
      Gfx.ctx.globalAlpha = 1;
    }
    // rain in the doorway, and beyond it
    if (rain > 0) for (let i = 0; i < 3; i++) if (chance(rain)) Particles.spawn(HOME.door + rnd(20, 420), GY - 200, { n: 1, color: ['#a8d8ff', '#6aa9ee'], speed: 10, vx: -40, vy: 420, gravity: 0, life: 0.5, size: 1, shape: 'drop' });
    if (tears > 0 && granny) for (let s2 = -1; s2 <= 1; s2 += 2) if (chance(tears * 0.5)) Particles.spawn(granny.x + granny.facing * 30 + s2 * 6, granny.top + 34, { n: 1, color: ['#6aa9ee', '#a8d8ff'], speed: 70, angle: -Math.PI / 2 + s2 * 0.6, spread: 0.3, gravity: 500, life: 0.8, size: 4, shape: 'drop' });
  };

  // ============================================== 0. WAKING UP
  S.cam.lookAt(HOME.bed + 70, 330, true);
  yield 0.6;
  yield* S.titleCard('ONGA BONGA', 'a stone age board game saga', 3.2);
  const caller = me === 'vela' ? 'bronk' : 'vela';
  yield* S.say(NAME(caller), me === 'vela' ? 'VELA! Dinner! I made gravy!' : `${NAME(me)}! DINNER!`, { at: { x: HOME.bed + 150, top: GY - 110 } });
  AudioSys.sfx('gasp'); snore = 0;
  hero.rot = 0; hero.y = GY; pose(hero, 'shock'); hero.stretch(0.4);
  Juice.punch(0.06); Particles.sparkle(hero.x, GY - 50, 14, ['#ffe98a', '#ffffff']);
  yield 0.5;
  yield* S.say(NAME(me), { bronk: 'Dinner. DINNER. Is it the thing? Tell me it is the thing.', vela: 'Gravy? Since when do YOU make gravy?', pebble: 'FOOD. FOOD FOOD FOOD.', roxy: 'Ugh. Fine. I am getting up.' }[me], { at: hero });
  Co.run(S.glide(HOME.table, 330, 3.4), S);
  pose(hero, 'walk');
  while (!hero.moveTo(SEAT[me], GY, Time.dt, 120)) yield 0;
  hero.y = kid(me) ? GY - 24 : GY - 6; hero.facing = SEAT[me] < HOME.table ? 1 : -1; pose(hero, 'eat');

  // ============================================== 1. DINNER
  yield 0.4;
  yield* S.say('', 'Tonight is a special occasion. Tonight the Rockbottoms are eating a whole roast T-Rex head.', { at: null });
  const L = (id, text) => S.say(NAME(id), text, { at: A[id] });
  yield* L('bronk', 'Three days I tracked this one. It sat on me twice.');
  yield* L('vela', 'Elbows OFF the table. We are not animals. Mostly.');
  yield* L('pebble', 'Can I have the eye? I want the eye.');
  yield* L('roxy', 'You are SO disgusting.');
  for (let i = 0; i < 3; i++) { AudioSys.sfx('chomp'); for (const id of HERO_ORDER) A[id].squash(0.08); yield 0.35; }
  yield* L('bronk', 'More gravy, anyone?');

  // ============================================== 2. THE KNOCK
  yield 0.3;
  for (let i = 0; i < 3; i++) { AudioSys.sfx('knock'); Juice.shake(4, 0.12); yield 0.3; }
  for (const id of HERO_ORDER) { pose(A[id], 'idle'); Emotes.show(A[id], '!', 1.2); }
  AudioSys.stop(0.6);
  yield 0.8;
  yield* L('vela', 'Who knocks on a CAVE?');
  rain = 0.6; S.setOpt.night = true;
  yield* S.pan(HOME.door + 30, 326, 0.6);
  AudioSys.sfx('thunder'); Juice.flash('#ffffff', 0.4, 5);
  yield* S.say('GRANDMA REX', 'Yoo-hoo! Hello, my dearies! Just a poor old granny, lost in the rain. Could you spare a bite for a hungry old lady?', { at: { x: HOME.door + 120, top: GY - 150 } });
  yield* S.pan(HOME.table + 20, 330, 0.3);
  yield* L('bronk', 'Course we can! Come in, come in! There is loads!');

  // ============================================== 3. GRANDMA REX
  AudioSys.play('event', { fade: 1 });
  granny = S.add('granny', { base: 'grandma', x: HOME.door + 160, y: GY, scale: 1, facing: -1 });
  granny.manual = true;
  pose(granny, 'walk');
  yield* S.pan(HOME.door - 20, 320, 0.4);
  // she has to duck
  while (!granny.moveTo(HOME.table + 6, GY - 10, Time.dt, 60)) {
    if (Math.floor(granny.t) !== granny._lt) { granny._lt = Math.floor(granny.t); if (granny._lt % 2 === 0) { AudioSys.sfx('stomp', { vol: 0.8 }); Juice.shake(5, 0.2); Particles.dust(granny.x, GY, 6); } }
    S.cam.lookAt(lerp(S.cam.x, granny.x - 60, 0.05), 320);
    yield 0;
  }
  pose(granny, 'idle'); granny.facing = -1;
  yield* S.pan(HOME.table + 60, 318, 0.3);
  AudioSys.sfx('crunch'); Juice.shake(6, 0.2); granny.squash(0.2);
  Popups.add(granny.x + 20, GY - 20, 'CRUNCH', '#ffe98a', { scale: 1.4 });
  yield* S.say('GRANDMA REX', 'Oh, don\'t mind me, dears. My legs aren\'t what they were. Neither are my eyes.', { at: granny });
  yield* L('pebble', 'Grandma... what big TEETH you have.');
  yield* S.say('GRANDMA REX', 'All the better to chew my supper with, my dear.', { at: granny });
  yield* L('roxy', 'Grandma, what big EYES you have.');
  yield* S.say('GRANDMA REX', 'All the better to see what is for... for...', { at: granny });
  AudioSys.stop(0.3);
  granny.stretch(0.12);
  yield 1.4;

  // ============================================== 4. REXFORD
  yield* S.say('GRANDMA REX', '...Rexford?', { at: granny, speed: 20 });
  pose(granny, 'cry'); tears = 1; AudioSys.sfx('sob');
  yield* S.say('GRANDMA REX', 'That is my Rexford. My little grandson. My baby boy. You... you COOKED him.', { at: granny });
  yield* L('bronk', 'He was YOURS? We thought he was just... dinner.');
  yield* L('vela', 'We didn\'t know he had a FAMILY!');
  tears = 0;
  pose(granny, 'roar');
  AudioSys.sfx('roar', { pitch: 48, vol: 1, len: 1.8 }); Juice.shake(16, 0.9); Juice.flash('#ffffff', 0.5, 3);
  for (const id of HERO_ORDER) { A[id].squash(0.3); Emotes.show(A[id], 'sweat', 1.6); }
  yield* S.say('GRANDMA REX', 'EVERYBODY HAS A FAMILY.', { at: granny, shake: 3 });
  yield* S.say('GRANDMA REX', 'You took mine. So I will take YOURS.', { at: granny });

  // ============================================== 5. THE GRAB
  for (const id of others) {
    const a = A[id];
    AudioSys.sfx('whoosh'); Juice.shake(6, 0.2);
    Particles.spawn(a.x, a.cy, { n: 16, color: ['#fffaea', '#c4b89a'], speed: 180, life: 0.4, size: 3 });
    pose(a, 'shock'); a.facing = 1; a.manual = true;
    grabbed.push(a);
    Floaters.add(a, 'HEEELP!', 1.6);
    yield 0.35;
  }
  // and the stove raptor, who has been waiting six years for exactly this
  AudioSys.sfx('fire_whoosh'); setOpt({ dusk: true });
  yield* S.say('BLAZE', 'Six years I have been chained to that pit. Wait for me, madam!', { at: blaze });
  pose(granny, 'walk'); granny.facing = 1;
  pose(blaze, 'walk'); blaze.facing = 1;
  let t0 = 0;
  while (granny.x < HOME.door + 460) {
    t0 += Time.dt;
    granny.x += Time.dt * 170; blaze.x += Time.dt * 190;
    if (Math.floor(t0 * 4) !== granny._st) { granny._st = Math.floor(t0 * 4); AudioSys.sfx('stomp', { vol: 0.6 }); Juice.shake(4, 0.15); }
    S.cam.lookAt(Math.min(HOME.door + 60, granny.x - 100), 320);
    yield 0;
  }
  for (const a of grabbed) { a.visible = false; a.manual = true; }
  granny.visible = false; blaze.visible = false; rain = 0.3; grabbed.length = 0;
  AudioSys.sfx('roar', { pitch: 40, vol: 0.4, len: 1.6 });
  yield 0.8;
  yield* S.pan(HOME.table - 10, 324, 0.6);
  pose(hero, 'idle');
  yield* S.say(NAME(me), '...They are gone.', { at: hero, speed: 24 });

  // ============================================== 6. THE TUMMY
  yield 0.5;
  AudioSys.sfx('growl'); hero.squash(0.2); Juice.shake(3, 0.3);
  Popups.add(hero.x, hero.top - 6, 'GRRRBLBLBL', '#a8e878', { scale: 1.6, life: 1.4 });
  yield 0.9;
  AudioSys.sfx('growl'); hero.squash(0.25); green = 0.6; hero.tint = '#8ac850'; hero.tintT = 3;
  Popups.add(hero.x, hero.top - 6, 'RUMBLE', '#a8e878', { scale: 2, life: 1.4 });
  yield* S.say(NAME(me), 'Oh no. Oh no no no. Not NOW.', { at: hero, shake: 2 });
  yield* S.say('', 'That was a LOT of roast T-Rex.', { at: null });
  // straight out of the door to the little wooden house in the yard
  pose(hero, SPRITES[hero.base + '_dash'] ? 'dash' : 'walk', { fps: 22 });
  hero.y = GY; hero.facing = 1;
  S.cam.follow = hero;
  Juice.lines(0.8);
  while (!hero.moveTo(HOME.shower - 6, GY, Time.dt, 330)) { if (chance(0.5)) Particles.dust(hero.x - 8, GY, 2); Juice.lines(0.6); yield 0; }
  S.cam.follow = null; S.cam.lookAt(HOME.shower, 318);
  hero.visible = false;
  AudioSys.sfx('door'); Juice.shake(6, 0.2);
  S.setOpt.loo = { shake: 0, open: false };
  yield 0.4;

  // ============================================== 7. THE LOO
  const loo = S.setOpt.loo;
  const words = ['RUMBLE!', 'PLOP!', 'KER-SPLOSH!', 'BRAAAP!', 'OH NO', 'PLOP!'];
  for (let i = 0; i < words.length; i++) {
    loo.shake = 1;
    AudioSys.sfx(i % 2 ? 'plop' : 'burp'); if (i === 3) AudioSys.sfx('rumble', { vol: 0.5, len: 0.8 });
    const p = S.cam.toScreen(HOME.shower + rnd(-30, 30), GY - 100 - rnd(0, 30));
    Juice.pow(p.x, p.y, { r: 44 + i * 4, spikes: 10, col: i % 2 ? '#a8e878' : '#ffe98a', word: words[i] });
    Juice.shake(3 + i, 0.25);
    yield 0.55;
  }
  loo.shake = 2;
  AudioSys.sfx('flush'); Juice.flash('#a8e878', 0.35, 3);
  yield 1.2;
  loo.shake = 0; loo.open = true;
  AudioSys.sfx('creak');
  hero.visible = true; hero.x = HOME.shower + 4; hero.y = GY; hero.tint = null; green = 0; pose(hero, 'idle');
  yield 0.4;
  yield* S.say(NAME(me), 'Aaaaah. Much better.', { at: hero });
  yield 0.6;
  Emotes.show(hero, '!', 1.2); AudioSys.sfx('detect');
  yield* S.say(NAME(me), '...GRANDMA REX!', { at: hero, shake: 2 });
  S.setOpt.prints = true;
  yield* S.pan(HOME.shower + 200, 318, 0.8);
  yield* S.say(NAME(me), { bronk: 'Nobody takes my family. NOBODY. Not even a granny.', vela: 'Right. That old lizard is going to learn some manners.', pebble: 'I am coming, everybody! I am SO fast!', roxy: 'She took my FAMILY. Nobody takes my family but me.' }[me], { at: hero });
  AudioSys.play('chase', { fade: 0.4 });
  pose(hero, 'walk', { fps: 18 }); hero.facing = 1;
  S.cam.follow = hero;
  t0 = 0;
  while (t0 < 1.6) { t0 += Time.dt; hero.x += Time.dt * 280; Juice.lines(0.5); if (chance(0.5)) Particles.dust(hero.x - 8, GY, 2); yield 0; }
  S.cam.follow = null;
  yield* S.titleCard('THE CHASE', 'five lands to Grandma Rex\'s lair', 2.6);
  Game.startBoard();
}
