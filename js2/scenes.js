// ---------------------------------------------------------------------------
// scenes.js - boot, title, act transitions, ending, game over and overlays
// ---------------------------------------------------------------------------
'use strict';

// The menu sits at the campfire. Bronk is eating, the fire is going, and the
// thing in the bush behind him has been there for some time.
function drawTitleWorld(t) {
  const ctx = Gfx.ctx;
  const camX = 150, camY = GY - VH * 0.76;
  Gfx.clear('#07060f');
  ctx.save();
  ctx.scale(VIEW, VIEW);
  ctx.translate(-Math.round(camX), -Math.round(camY));
  World.camp(t, { fireX: CAMP.fire, watchers: 0 }, camX);

  // ---- the log, and the man on it
  const BX = CAMP.bronk;
  Gfx.round(BX - 64, GY - 18, 112, 22, 10, '#241109');
  Gfx.round(BX - 60, GY - 17, 104, 5, 2, '#5c3a20');
  for (let i = 0; i < 5; i++) Gfx.rectA(BX - 52 + i * 21, GY - 12, 13, 2, '#0b0a18', 0.5);
  Gfx.rectA(BX - 60, GY - 6, 104, 7, '#e06a1b', 0.24 + Math.sin(t * 9) * 0.05);
  Gfx.round(BX + 40, GY - 19, 15, 24, 7, '#3a2415');
  Gfx.round(BX + 43, GY - 15, 9, 15, 4, '#5c3a20');

  // ---- something enormous in the bush, and it is not blinking much
  const RX = BX - 96, RY = GY + 26;
  Gfx.sprite('trex_idle', RX, RY, { anchor: 'bc', scale: 1.2, frame: Math.floor(t * 2) % 2, tint: '#0d0a1c', tintAmount: 0.84 });
  const hx = RX + 49, hy = RY - 116;   // the eye, on a head that faces the fire
  if (Math.sin(t * 0.7) > -0.93) {                       // it blinks, about as often as it needs to
    for (const [ex, ey, sc] of [[hx, hy, 1], [hx - 13, hy - 4, 0.6]]) {
      Gfx.glow(ex, ey, 40 * sc, '#ffa832', 0.32 * sc);
      Gfx.rectA(ex - 3, ey - 2, 7, 4, '#ffe98a', 0.95);
      Gfx.rectA(ex - 1, ey - 1, 2, 2, '#ef6a5e', 0.9);
    }
  }
  for (let i = 0; i < 3; i++) {                          // and it is drooling on the bush
    const dx = hx - 16 + i * 13;
    const len = 9 + Math.abs(Math.sin(t * (0.9 + i * 0.4) + i * 2.2)) * 24;
    for (let k = 0; k < len; k += 3)
      Gfx.rectA(dx + Math.sin(t * 2 + k * 0.1 + i) * 1.2, hy + 24 + k, k > len - 7 ? 3 : 2, 3, '#6aa9ee', 0.26 + 0.44 * (k / len));
  }
  if (chance(0.25)) Particles.spawn((hx - 16 + rnd(0, 30) - camX) * VIEW, (hy + 54 - camY) * VIEW,
    { n: 1, color: ['#a8d8ff', '#6aa9ee'], speed: 6, gravity: 240, life: 1.1, size: 2, sizeEnd: 1, world: false });
  for (const [bx, sc] of [[RX - 34, 2.4], [RX + 20, 2.8], [RX + 72, 2.3]])
    Gfx.sprite('prop_bush', bx, GY + 6, { anchor: 'bc', scale: sc, tint: '#0b0a18', tintAmount: 0.92 });

  // ---- dinner. it does not want to come off the bone, and he is not giving up.
  const chew = Math.sin(t * 1.5);
  const pull = clamp(chew, 0, 1);                        // 0 chewing, 1 hauling on it
  const lean = pull * 7;
  Gfx.sprite('bronk_eat', BX - lean, GY + 12, { anchor: 'bc', scale: 1, frame: Math.floor(t * 5) % 4 });
  const mx = BX + 30 + pull * 34, my = GY - 40 - pull * 6;
  // the strand between his teeth and the meat, which stretches and will not part
  for (let k = 0; k <= 12; k++) {
    const q = k / 12;
    const sx2 = lerp(BX + 4 - lean, mx - 8, q);
    const sy2 = lerp(GY - 44, my + 2, q) + Math.sin(q * Math.PI) * (5 + pull * 9);
    const th = (5 - Math.sin(q * Math.PI) * 3.2) * (1 - pull * 0.45);
    Gfx.round(sx2 - th, sy2 - th / 2, th * 2, th, th / 2, '#c4b89a');
    Gfx.round(sx2 - th, sy2 - th / 2, th * 1.4, th * 0.5, th / 3, '#e8dfc6');
  }
  Gfx.sprite('meat_leg', mx, my, { anchor: 'c', scale: 2.2 + pull * 0.2, rot: -0.5 + pull * 0.5 });
  if (pull > 0.9 && chance(0.4)) Particles.spawn((mx - camX) * VIEW, (my - camY) * VIEW,
    { n: 1, color: ['#ef6a5e', '#c4b89a'], speed: 90, spread: 6.28, life: 0.6, size: 3, sizeEnd: 0, gravity: 300, world: false });
  Particles.draw(Gfx.ctx, true);        // the fire's own sparks live in world space
  ctx.restore();
  Particles.draw(Gfx.ctx, false);
  Gfx.vignette(0.42);
}

// A standing stone with the name of the game cut into it and the menu set into
// the face, planted in the clearing with a torch either side. Everything the
// player touches before the game starts is the same slab of rock.
const STELE = { x: 44, y: 28, w: 400, h: 474 };

function titleStone(t) {
  const { x, y, w, h } = STELE;
  const ctx = Gfx.ctx;
  // ---- torches, behind the stone, so their light spills round it
  for (const tx of [x - 26, x + w + 26]) {
    const sw = Math.sin(t * 2.1 + tx) * 1.5;
    Gfx.rect(tx - 6, y + 168, 12, 330, '#3a2415');
    Gfx.rect(tx - 4, y + 168, 4, 330, '#5c3a20');
    for (let i = 0; i < 4; i++) Gfx.rect(tx - 8, y + 200 + i * 78, 16, 6, '#241109');
    Gfx.round(tx - 15, y + 150, 30, 24, 8, '#241c2e');
    Gfx.round(tx - 12, y + 152, 24, 8, 4, '#574a66');
    for (const i of [0, 2, 1])
      World.flame(tx + sw + (i - 1) * 5, y + 156, (i === 1 ? 46 : 30) + Math.abs(Math.sin(t * 6 + i)) * 18,
        i === 1 ? 13 : 8, Math.sin(t * 4.3 + i * 2) * 4,
        ['#e06a1b', '#ffa832', '#ffe98a', '#9c3510'], i * 2.3 + tx);
    Gfx.glow(tx, y + 130, 190, '#ffa832', 0.26 + Math.sin(t * 8 + tx) * 0.05);
    if (chance(0.4)) Particles.fire(tx + rnd(-8, 8), y + 140, 1);
  }
  // ---- the stone: a slab with a broken crown and a heap of rubble at its foot
  UI.slab(x, y + 26, w, h - 26, { r: 6 });
  for (let i = 0; i < 6; i++) {                           // broad weathering on the face
    const px = x + 16 + ((i * 97) % (w - 110)), py = y + 46 + ((i * 131) % (h - 150));
    ctx.globalAlpha = 0.14;
    Gfx.round(px, py, 64 + (i % 3) * 44, 30 + (i % 2) * 28, 13, i % 2 ? SKIN.faceLit : SKIN.faceMid);
    ctx.globalAlpha = 1;
  }
  { let px = x + 2;                                       // the crown, broken off
    for (let i = 0; px < x + w - 14; i++) {
      const k = (px - x) / w;
      const bw = 16 + ((i * 53) % 26);
      const hgt = Math.round(9 + ((i * 37) % 19) - Math.abs(k - 0.5) * 20);
      if (hgt > 3) {
        Gfx.round(px - 2, y + 26 - hgt, bw + 4, hgt + 10, 3, SKIN.ink);
        Gfx.round(px, y + 28 - hgt, bw, hgt + 8, 2, SKIN.faceMid);
        Gfx.round(px + 1, y + 28 - hgt, bw - 2, 4, 2, SKIN.faceLit);
        Gfx.rectA(px + 3, y + 34 - hgt, bw - 6, 2, SKIN.faceDark, 0.4);
      }
      px += bw + (i % 3 ? 0 : 7);
    }
  }
  for (let i = 0; i < 10; i++) {                          // rubble round the base
    const rx = x + 10 + ((i * 71) % (w - 30));
    Gfx.round(rx, y + h - 12 + (i % 3) * 4, 16 + (i % 4) * 7, 11, 4, i % 2 ? '#574a66' : '#3b3048');
    Gfx.round(rx + 2, y + h - 12 + (i % 3) * 4, 10 + (i % 4) * 4, 3, 2, '#7a6d8a');
  }
  // ---- the name, cut in and then painted with ochre
  const cx = x + w / 2;
  const carve = (txt, ty, sc, col) => {
    Gfx.text(txt, cx, ty + 3, { color: SKIN.faceHi, align: 'center', scale: sc });
    Gfx.text(txt, cx + 1, ty + 1, { color: '#3a2415', align: 'center', scale: sc });
    Gfx.text(txt, cx, ty, { color: col, align: 'center', scale: sc });
  };
  carve('ONGA', y + 48, 5.6, '#9c3510');
  carve('BONGA', y + 116, 5.6, '#5c1607');
  Gfx.rect(x + 40, y + 188, w - 80, 3, '#3a2415');
  Gfx.rect(x + 40, y + 191, w - 80, 2, SKIN.faceHi);
  carve('A STONE AGE ROCK SAGA', y + 200, 1.3, '#3a2415');
  // ---- hand prints, the way you sign a wall
  for (const [hx, hy, fl] of [[x + 34, y + 96, false], [x + w - 46, y + 128, true]]) {
    ctx.globalAlpha = 0.5;
    Gfx.round(hx, hy, 14, 17, 5, '#5c1607');
    for (let i = 0; i < 4; i++) Gfx.round(hx + 1 + i * 4, hy - 7 + (i === 0 || i === 3 ? 2 : 0), 3, 9, 1, '#5c1607');
    Gfx.round(hx + (fl ? 13 : -4), hy + 3, 6, 4, 2, '#5c1607');
    ctx.globalAlpha = 1;
  }
  return { x, y, w, h, cx };
}

class BootScene {
  constructor() { this.t = 0; }
  enter() { } exit() { }
  update(dt) { this.t += dt; if (Input.anyPress) { AudioSys.init(); Game.go(new TitleScene()); } }
  draw() {
    drawTitleWorld(this.t);
    const st = titleStone(this.t);
    Gfx.ctx.globalAlpha = 0.6 + 0.4 * Math.sin(this.t * 4);
    Gfx.text(Input.touch ? 'TAP TO BEGIN' : 'PRESS ANY KEY', st.cx, st.y + 300,
      { color: SKIN.ink, align: 'center', scale: 1.9 });
    Gfx.text(Input.touch ? 'TAP TO BEGIN' : 'PRESS ANY KEY', st.cx, st.y + 299,
      { color: '#9c3510', align: 'center', scale: 1.9 });
    Gfx.ctx.globalAlpha = 1;
    Gfx.text('headphones recommended', st.cx, st.y + 340, { color: SKIN.textDim, align: 'center', scale: 1.1 });
  }
  click() { }
}

class TitleScene {
  constructor() { this.t = 0; }
  enter() { AudioSys.play('rest', { fade: 0.9 }); }
  exit() { }
  update(dt) {
    this.t += dt;
    if (Input.pressed('Enter')) { Game.hasSave() ? Game.continueRun() : Game.newRun(); }
  }
  draw() {
    drawTitleWorld(this.t);
    const st = titleStone(this.t);
    // the menu, sized to fit whatever it holds: five entries with a save,
    // four without, and never off the bottom of the stone
    const items = [];
    if (Game.hasSave()) items.push(['CONTINUE', () => Game.continueRun()]);
    items.push([Game.hasSave() ? 'NEW STORY' : 'START', () => Game.newRun()]);
    items.push(['HOW TO PLAY', () => Game.overlay = new HowToOverlay()]);
    items.push(['SETTINGS', () => Game.overlay = new PauseOverlay(true)]);
    items.push(['CREDITS', () => Game.overlay = new CreditsOverlay()]);
    const bw = 260, bx = st.cx - bw / 2;
    const bh = items.length > 4 ? 40 : 46, gap = bh + 8;
    let y = Math.max(st.y + 236, st.y + st.h - 26 - items.length * gap + 8);
    for (const [label, cb] of items) { UI.wbutton(bx, y, bw, bh, label, cb, { scale: 1.4 }); y += gap; }
    Gfx.text(Input.touch ? 'tap the frets, save the family' : 'arrows or D F J K  -  save the family',
      W / 2, H - 22, { color: '#c4b89a', align: 'center', outline: true });
  }
  click() { }
}

// --------------------------------------------------------- act transitions
const ACT_STORY = {
  2: { rescued: 'pebble', who: 'PEBBLE', gift: 'drum_solo',
    lines: [
      ['BLAZE', "Enough. Keep the loud one. I only need the rest of you."],
      ['PEBBLE', "DAD! Dad, I hit the rocks in time, like you said! It got confused!"],
      ['BRONK', "You kept the beat while a burning raptor ran off with you. That's my boy."],
      ['', "PEBBLE joins the band. Every turn he drums a random beast. New riff: {y}DRUM SOLO{/}."],
    ] },
  3: { rescued: 'roxy', who: 'ROXY', gift: 'flute_lullaby',
    lines: [
      ['BLAZE', "You are still following. Why are you still following?"],
      ['ROXY', "Because you took his family, you enormous match."],
      ['BRONK', "Roxy. Sweetheart. Give me the flute."],
      ['', "ROXY joins the band. Riff windows are wider and you heal after every fight. New riff: {y}FLUTE LULLABY{/}."],
    ] },
};

class ActStory {
  constructor(act, onDone) { this.act = act; this.onDone = onDone; this.i = 0; this.t = 0; this.chars = 0; this.data = ACT_STORY[act]; }
  enter() { AudioSys.play('village', { fade: 0.8 }); }
  exit() { }
  update(dt) {
    this.t += dt;
    const line = this.data.lines[this.i];
    this.chars = Math.min(line[1].length, this.chars + dt * 46 * (Input.down ? 3 : 1));
    if (Input.clicks.length || Input.pressed('Space', 'Enter', 'KeyE')) {
      if (this.chars < line[1].length) this.chars = line[1].length;
      else { this.i++; this.chars = 0; if (this.i >= this.data.lines.length) this.onDone(); }
    }
  }
  draw() {
    // the camp again, at night: the rescued one by the fire, the raptor at
    // the edge of the light where it always is
    if (!this.cam) { this.cam = new Camera(); this.cam.zoom = this.cam.tzoom = VIEW; this.cam.lookAt(CAMP.fire + 20, 394, true); }
    this.cam.ox = Math.sin(this.t * 0.37) * 1.4; this.cam.oy = Math.sin(this.t * 0.29 + 2) * 1;
    Gfx.clear('#05040c');
    this.cam.apply(Gfx.ctx);
    const camX = this.cam.x - W / (2 * this.cam.zoom);
    World.camp(this.t, {}, camX);
    const sprs = { pebble: 'kid_a_idle', roxy: 'kid_b_idle' };
    Gfx.shadow(CAMP.fire - 120, GY + 2, 40, 0.3);
    Gfx.sprite('bronk_idle', CAMP.fire - 120, GY + 2, { anchor: 'bc', frame: Math.floor(this.t * 2) % 2 });
    Gfx.shadow(CAMP.fire - 76, GY + 2, 28, 0.3);
    Gfx.sprite(sprs[this.data.rescued], CAMP.fire - 76, GY + 2, { anchor: 'bc', frame: Math.floor(this.t * 3) % 2 });
    Gfx.sprite('blaze_idle', CAMP.fire + 190, GY + 4, { anchor: 'bc', frame: Math.floor(this.t * 6) % 2, flip: true });
    if (chance(0.4)) Particles.fire(CAMP.fire + 190 + rnd(-20, 20), GY - 50, 1);
    Particles.draw(Gfx.ctx, true);
    if (Settings.lighting !== false) {
      SetLight.run('camp', this.t, {}, camX);
      Light.begin(0); Light.point(CAMP.fire + 190, GY - 40, 160, { color: '#e06a1b', glow: 0.16, flicker: 0.1 }); Light.end();
    }
    this.cam.restore(Gfx.ctx);
    if (Settings.lighting !== false) { SetLight.post('camp', {}); Film.grain(); }
    Particles.draw(Gfx.ctx, false);
    const line = this.data.lines[this.i];
    Gfx.panel(60, H - 150, W - 120, 120, { fill: '#1a1424' });
    if (line[0]) { const nw = Gfx.measure(line[0], 1.2) + 18; Gfx.round(80, H - 162, nw, 22, 4, '#120c16'); Gfx.text(line[0], 89, H - 157, { color: '#ffe98a', scale: 1.2 }); }
    Gfx.textWrap(line[1].slice(0, Math.floor(this.chars)), 84, H - 128, W - 170, { color: '#e8dfc6', scale: 1.1, lineHeight: 15 });
    if (this.chars >= line[1].length) Gfx.text('▶', W - 90, H - 56 + Math.sin(this.t * 6) * 2, { color: '#ffe98a', scale: 1.4 });
    Gfx.text(`${this.i + 1}/${this.data.lines.length}`, W - 80, H - 168, { color: '#7a6d8a', align: 'right' });
  }
  click() { }
}

class EndingScene {
  constructor() { this.t = 0; this.stage = 0; this.chars = 0; this.lines = [
    ['VELA', "You came all the way up a volcano. On foot. With that belly."],
    ['BRONK', "I had help. Pebble kept time. Roxy kept everyone calm."],
    ['BLAZE', "...you could have finished me. You had it. Why the collar?"],
    ['BRONK', "Because six years is a long time to be a kitchen appliance. Go on. It's open."],
    ['BLAZE', "...I do know a little percussion."],
    ['', "And so the valley held its festival again, and the loudest band in the stone age had a new pyrotechnics section."],
  ]; }
  enter() { AudioSys.play('victory', { fade: 0.5 }); Game.clearSave(); }
  exit() { }
  update(dt) {
    this.t += dt;
    if (this.stage < this.lines.length) {
      const l = this.lines[this.stage];
      this.chars = Math.min(l[1].length, this.chars + dt * 44 * (Input.down ? 3 : 1));
      if (Input.clicks.length || Input.pressed('Space', 'Enter')) {
        if (this.chars < l[1].length) this.chars = l[1].length;
        else { this.stage++; this.chars = 0; if (this.stage === this.lines.length) AudioSys.play('ending', { fade: 0.4 }); }
      }
    }
    if (this.stage >= this.lines.length && chance(dt * 30)) Particles.confetti(rnd(0, W), -10, 1);
  }
  draw() {
    Gfx.bands(0, 0, W, 340, ['#120c16', '#281040', '#4b2070', '#a03a68', '#e06a9b']);
    for (let i = 0; i < 50; i++) { const x = (i * 137) % W, y = (i * 61) % 260; Gfx.rectA(x, y, 2, 2, '#ffffff', 0.4 + 0.4 * Math.sin(this.t * 2 + i)); }
    Gfx.circle(820, 80, 40, '#fffaea');
    Gfx.rect(0, 330, W, H - 330, '#241c2e');
    Gfx.sprite('prop_stage', W / 2, 430, { anchor: 'bc', scale: 1.4 });
    const beat = AudioSys.song ? (AudioSys.now() - AudioSys.songStart) / AudioSys.beatDur() : this.t * 2;
    const bob = i => Math.abs(Math.sin((beat + i * 0.25) * Math.PI)) * 6;
    Gfx.sprite('bronk_play', W / 2 - 30, 392 - bob(0), { anchor: 'bc', frame: Math.floor(beat * 2) % 4, scale: 1.2 });
    Gfx.sprite('vela_idle', W / 2 + 60, 392 - bob(1), { anchor: 'bc', frame: Math.floor(beat) % 2, scale: 1.2 });
    Gfx.sprite('kid_a_idle', W / 2 - 110, 394 - bob(2), { anchor: 'bc', frame: Math.floor(beat) % 2, scale: 1.2 });
    Gfx.sprite('kid_b_idle', W / 2 + 140, 394 - bob(3), { anchor: 'bc', frame: Math.floor(beat) % 2, scale: 1.2 });
    Gfx.sprite('blaze_idle', W / 2 + 240, 430 - bob(4), { anchor: 'bc', frame: Math.floor(this.t * 6) % 2, scale: 1.1 });
    for (let i = 0; i < 2; i++) if (chance(0.5)) Particles.fire(W / 2 + 240 + rnd(-24, 24), 380, 1);
    for (let i = 0; i < 12; i++) Gfx.sprite(i % 2 ? 'villager_idle' : 'villager2_idle', 40 + i * 78, 500 - Math.abs(Math.sin((beat + i * 0.4) * Math.PI)) * 6, { anchor: 'bc', tint: '#120c16', tintAmount: 0.6, frame: Math.floor(beat + i) });
    Particles.draw(Gfx.ctx, false);
    if (this.stage < this.lines.length) {
      const l = this.lines[this.stage];
      Gfx.panel(60, H - 140, W - 120, 112, { fill: '#1a1424' });
      if (l[0]) { const nw = Gfx.measure(l[0], 1.2) + 18; Gfx.round(80, H - 152, nw, 22, 4, '#120c16'); Gfx.text(l[0], 89, H - 147, { color: '#ffe98a', scale: 1.2 }); }
      Gfx.textWrap(l[1].slice(0, Math.floor(this.chars)), 84, H - 120, W - 170, { color: '#e8dfc6', scale: 1.1, lineHeight: 15 });
    } else {
      Gfx.text('THE FAMILY IS HOME', W / 2, 40, { color: '#ffe98a', align: 'center', scale: 3.4, outline: true, outlineWidth: 2 });
      const s = Game.run.stats;
      Gfx.text(`beasts out-played ${s.kills}    notes landed ${s.sick}/${s.notes}    damage taken ${s.taken}`, W / 2, 96, { color: '#d6cfe0', align: 'center', scale: 1.1 });
      UI.button(W / 2 - 110, H - 70, 220, 44, 'BACK TO THE TITLE', () => Game.go(new TitleScene()), { scale: 1.2 });
    }
  }
  click() { }
}

class GameOverScene {
  constructor() { this.t = 0; this.stats = Game.run ? Game.run.stats : null; this.act = Game.run ? Game.run.act : 1; }
  enter() { AudioSys.play('gameover', { fade: 1 }); Game.clearSave(); }
  exit() { }
  update(dt) { this.t += dt; }
  draw() {
    Gfx.bands(0, 0, W, H, ['#120c16', '#241c2e', '#3f0e18', '#241c2e', '#120c16']);
    Gfx.sprite('bronk_hurt', W / 2, 330, { anchor: 'bc', scale: 2, alpha: 0.9 });
    Gfx.vignette(0.8);
    Gfx.text('THE MUSIC STOPS', W / 2, 70, { color: '#ef6a5e', align: 'center', scale: 3.4, outline: true, outlineWidth: 2 });
    Gfx.text(`Bronk falls in ${['', 'the village', 'the jungle', 'the ash'][this.act] || 'the ash'}. Somewhere ahead, a chain rattles.`, W / 2, 370, { color: '#d6cfe0', align: 'center', scale: 1.2 });
    if (this.stats) Gfx.text(`beasts out-played ${this.stats.kills}   notes landed ${this.stats.sick}/${this.stats.notes}   damage taken ${this.stats.taken}`, W / 2, 400, { color: '#7a6d8a', align: 'center' });
    UI.button(W / 2 - 230, 450, 210, 46, 'TRY AGAIN', () => Game.newRun(), { scale: 1.2 });
    UI.button(W / 2 + 20, 450, 210, 46, 'TITLE', () => Game.go(new TitleScene()), { scale: 1.2 });
  }
  click() { }
}

// ------------------------------------------------------------------ overlays
class PauseOverlay {
  constructor(settingsOnly) { this.settingsOnly = settingsOnly; this.mode = settingsOnly ? 'settings' : 'menu'; this.confirm = false; }
  update() { if (Input.pressed('Escape')) { if (this.mode === 'settings' && !this.settingsOnly) this.mode = 'menu'; else Game.overlay = null; } }
  // a labelled row of blocks with an arrow at each end, off the reference sheet
  slider(x, y, w, label, val, min, max, step, fmt, onChange, o = {}) {
    Gfx.text(label, x + 2, y + 1, { color: SKIN.faceDark, scale: 1.4 });
    Gfx.text(label, x + 2, y, { color: SKIN.text, scale: 1.4 });
    Gfx.text(fmt(val), x + w, y, { color: SKIN.barDark, align: 'right', scale: 1.4 });
    const sy = y + 22, ah = 22;
    const step1 = d => onChange(+clamp(Math.round((val + d * step) / step) * step, min, max).toFixed(3));
    UI.arrow(x, sy - 2, ah, 'left', () => step1(-1), { disabled: val <= min + 1e-6 });
    UI.arrow(x + w - ah, sy - 2, ah, 'right', () => step1(1), { disabled: val >= max - 1e-6 });
    const bx = x + ah + 10, bw = w - ah * 2 - 20;
    UI.segbar(bx, sy + 3, bw, 14, (val - min) / (max - min), { segments: o.segments || 14, col: o.col, colLit: o.colLit });
    UI.hit(bx - 4, sy - 4, bw + 8, 28, () => {
      const v = min + clamp((Input.mx - bx) / bw, 0, 1) * (max - min);
      onChange(+(Math.round(v / step) * step).toFixed(3));
    });
    return sy + 34;
  }
  draw() {
    Gfx.rectA(0, 0, W, H, '#120c16', 0.7);
    if (this.mode === 'menu') {
      const PW = 340, PH = 356;
      const r = UI.window(W / 2 - PW / 2, 56, PW, PH, 'PAUSED', { onClose: () => Game.overlay = null });
      let y = r.y + 8;
      const B = (label, cb, o) => { UI.wbutton(r.x + 14, y, r.w - 28, 46, label, cb, o); y += 58; };
      B('RESUME', () => Game.overlay = null);
      B('SETTINGS', () => this.mode = 'settings');
      B('HOW TO PLAY', () => Game.overlay = new HowToOverlay(() => Game.overlay = new PauseOverlay()));
      if (Game.run) B('YOUR DECK', () => Game.overlay = new DeckOverlay(Game.run.deck, 'YOUR DECK', { onClose: () => Game.overlay = new PauseOverlay() }));
      if (!this.confirm) B('ABANDON', () => this.confirm = true, { danger: true });
      else {
        Gfx.text('Give up on them?', W / 2, y - 16, { color: SKIN.redDark, align: 'center', scale: 1.3 });
        UI.wbutton(r.x + 14, y, (r.w - 36) / 2, 46, 'YES', () => { Game.clearSave(); Game.run = null; Game.overlay = null; Game.go(new TitleScene()); }, { danger: true });
        UI.wbutton(r.x + 22 + (r.w - 36) / 2, y, (r.w - 36) / 2, 46, 'NO', () => this.confirm = false);
      }
    } else {
      const PW = 520, PH = 456;
      const r = UI.window(W / 2 - PW / 2, 56, PW, PH, 'SETTINGS',
        { onClose: () => { if (this.settingsOnly) Game.overlay = null; else this.mode = 'menu'; } });
      let y = r.y + 6; const x = r.x + 14, w = r.w - 28;
      y = this.slider(x, y, w, 'MUSIC', Settings.music, 0, 1, 0.05, v => Math.round(v * 100) + '%',
        v => { Settings.music = v; AudioSys.setMusicVolume(v); Game.saveSettings(); }, { segments: 16 });
      y = this.slider(x, y, w, 'SOUND', Settings.sfx, 0, 1, 0.05, v => Math.round(v * 100) + '%',
        v => { Settings.sfx = v; AudioSys.setSfxVolume(v); Game.saveSettings(); AudioSys.sfx('sick'); }, { segments: 16 });
      y = this.slider(x, y, w, 'NOTE SPEED', Settings.noteSpeed, 0.7, 2.2, 0.05, v => v.toFixed(2) + 's',
        v => { Settings.noteSpeed = v; Game.saveSettings(); }, { col: '#a03a68', colLit: '#e06a9b', segments: 12 });
      y = this.slider(x, y, w, 'TIMING OFFSET', Settings.offset, -0.15, 0.15, 0.005, v => Math.round(v * 1000) + 'ms',
        v => { Settings.offset = v; Game.saveSettings(); }, { col: '#3570c0', colLit: '#6aa9ee', segments: 12 });
      y += 4;
      Gfx.text('TIMING WINDOWS', x + 2, y, { color: SKIN.text, scale: 1.4 }); y += 22;
      ['easy', 'normal', 'hard'].forEach((d, i) => {
        const bw = (w - 16) / 3;
        const on = Settings.difficulty === d;
        UI.wbutton(x + i * (bw + 8), y, bw, 40, d.toUpperCase(),
          () => { Settings.difficulty = d; Game.saveSettings(); }, { scale: 1.3, key: 'diff' + d });
        if (on) Gfx.outlineRound(x + i * (bw + 8) - 2, y - 2, bw + 4, 44, 4, SKIN.goldLit);
      });
      y += 52;
      UI.checkbox(x + 2, y, 22, Settings.shake !== false, () => { Settings.shake = Settings.shake === false; Game.saveSettings(); }, { label: 'SCREEN SHAKE' });
      UI.checkbox(x + 222, y, 22, Settings.lighting !== false, () => { Settings.lighting = Settings.lighting === false; Game.saveSettings(); }, { label: 'LIGHTING' });
      y += 30;
      Gfx.textWrap('Notes landing late? Lower the offset. Early? Raise it.', x + 2, y, w - 210, { color: SKIN.textDim, lineHeight: 14 });
      UI.wbutton(W / 2 - 90, 56 + PH - 56, 180, 44, 'BACK', () => { if (this.settingsOnly) Game.overlay = null; else this.mode = 'menu'; });
    }
  }
}

// ------------------------------------------------------------------ CREDITS
// The names, carved and scrolling, over the fire. It reads itself if you
// leave it alone, and you can drag it with the wheel or a finger.
class CreditsOverlay {
  constructor(onClose) {
    this.onClose = onClose; this.y = 150; this.t = 0; this.drag = null;
    this.lines = [
      { t: 'ONGA BONGA', s: 2.6, c: SKIN.red, gap: 10 },
      { t: 'a stone age rock opera', s: 1.2, c: SKIN.textDim, gap: 30 },

      { t: 'THE BAND', s: 1.6, c: SKIN.red, gap: 8 },
      { t: 'BRONK ROCKBOTTOM . . . . . . . rhythm, mostly', s: 1.1 },
      { t: 'PEBBLE . . . . . . . . . . . . . . . . . . drums', s: 1.1 },
      { t: 'ROXY . . . . . . . . . . . . . . . . . . . flute', s: 1.1 },
      { t: 'VELA . . . . . . . . . . . . . . . . management', s: 1.1 },
      { t: 'BLAZE . . . . . . . . . . . . . . . . percussion', s: 1.1, gap: 30 },

      { t: 'SUPPORTING', s: 1.6, c: SKIN.red, gap: 8 },
      { t: 'TRUNKS . . . . . . . . . . . . . . . . plumbing', s: 1.1 },
      { t: 'THE FOREMAN . . . . . . . . . . . . . . . slate', s: 1.1 },
      { t: 'THE CHAMELEON ON THE POLE . . . . . . . traffic', s: 1.1 },
      { t: 'SUSAN . . . . . . . . . . . . . . . triceratops', s: 1.1 },
      { t: 'A DODO . . . . . . . . . . . . . . . . flattened', s: 1.1, gap: 30 },

      { t: 'MADE OF', s: 1.6, c: SKIN.red, gap: 8 },
      { t: 'one canvas, 960 by 540', s: 1.1 },
      { t: 'no engine, no libraries, no build step', s: 1.1 },
      { t: 'every sprite placed a pixel at a time', s: 1.1 },
      { t: 'every note synthesised in your browser', s: 1.1, gap: 30 },

      { t: 'BUILT WITH CLAUDE CODE', s: 1.4, c: SKIN.goldDark, gap: 34 },

      { t: 'and nobody found a rock shaped like a face.', s: 1.1, c: SKIN.textDim, gap: 40 },
      { t: 'THANK YOU FOR PLAYING', s: 1.8, c: SKIN.red, gap: 60 },
    ];
  }
  close() { if (this.onClose) this.onClose(); else Game.overlay = null; }
  update(dt) {
    this.t += dt;
    if (Input.pressed('Escape')) this.close();
    if (this.t > 0.6 && !this.drag) this.y += dt * 40;
    if (Input.wheel) this.y += Input.wheel * 26;            // it reads itself
    // a finger anywhere in the panel scrolls it
    if (Input.down) {
      if (this.drag === null) this.drag = { y: Input.my, at: this.y };
      this.y = this.drag.at - (Input.my - this.drag.y);
    } else this.drag = null;
    const total = this.height();
    if (this.y > total + 120) this.y = -180;                      // it loops
    if (this.y < -220) this.y = -220;
  }
  height() { return this.lines.reduce((a, l) => a + Math.round(18 * (l.s || 1.1)) + (l.gap || 6), 0); }
  draw() {
    Gfx.rectA(0, 0, W, H, '#120c16', 0.78);
    const PW = 560, PH = 452, PX = W / 2 - PW / 2, PY = 44;
    const r = UI.window(PX, PY, PW, PH, 'CREDITS', { onClose: () => this.close() });
    const ctx = Gfx.ctx;
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h - 54); ctx.clip();
    let y = r.y + r.h - 54 - this.y;
    for (const l of this.lines) {
      const h = Math.round(18 * (l.s || 1.1));
      if (y > r.y - h && y < r.y + r.h) {
        Gfx.text(l.t, PX + PW / 2, y + 1, { color: SKIN.faceHi, align: 'center', scale: l.s || 1.1 });
        Gfx.text(l.t, PX + PW / 2, y, { color: l.c || SKIN.text, align: 'center', scale: l.s || 1.1 });
      }
      y += h + (l.gap || 6);
    }
    ctx.restore();
    // the fade at each end, so the text arrives out of the stone
    for (let i = 0; i < 10; i++) {
      Gfx.rectA(r.x, r.y + i * 2, r.w, 2, SKIN.face, 0.85 - i * 0.085);
      Gfx.rectA(r.x, r.y + r.h - 56 - i * 2, r.w, 2, SKIN.face, 0.85 - i * 0.085);
    }
    UI.wbutton(W / 2 - 90, PY + PH - 58, 180, 44, 'BACK', () => this.close());
  }
}

// ------------------------------------------------------------------- COACH
// A coach mark: the screen goes dim except for one spot, an arrow points at
// it and a slab says what it is. It is an overlay, so whatever is behind it
// is frozen until you have read it. Steps: { rect | rect(), title, text }.
class Coach {
  constructor(steps, onDone) { this.steps = steps.filter(Boolean); this.i = 0; this.t = 0; this.onDone = onDone; }
  update(dt) {
    this.t += dt;
    if (Input.pressed('Space', 'Enter', 'KeyE', 'ArrowRight')) this.next();
    if (Input.pressed('Escape')) this.finish();
  }
  next() {
    AudioSys.sfx('select');
    this.i++; this.t = 0;
    if (this.i >= this.steps.length) this.finish();
  }
  finish() { Game.overlay = null; AudioSys.sfx('unlock'); if (this.onDone) this.onDone(); }
  draw() {
    const s = this.steps[this.i]; if (!s) return;
    let r = typeof s.rect === 'function' ? s.rect() : s.rect;
    // nothing to point at (or it is off the screen): a centred slab, no hole
    if (r && (r.x + r.w < 0 || r.x > W || r.y + r.h < 0 || r.y > H)) r = null;
    if (!r) r = { x: W / 2 - 1, y: H / 2 + 120, w: 2, h: 2, none: true };
    const pad = 8, k = Ease.outCubic(clamp(this.t * 4, 0, 1));
    const rx = r.x - pad, ry = r.y - pad, rw = r.w + pad * 2, rh = r.h + pad * 2;
    const ctx = Gfx.ctx;
    // the dim, with a hole where the thing is
    ctx.save();
    ctx.fillStyle = `rgba(10,6,14,${0.72 * k})`;
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.moveTo(rx + 6, ry); ctx.lineTo(rx + rw - 6, ry); ctx.lineTo(rx + rw, ry + 6); ctx.lineTo(rx + rw, ry + rh - 6);
    ctx.lineTo(rx + rw - 6, ry + rh); ctx.lineTo(rx + 6, ry + rh); ctx.lineTo(rx, ry + rh - 6); ctx.lineTo(rx, ry + 6); ctx.closePath();
    ctx.fill('evenodd');
    ctx.restore();
    // a gold frame round it, breathing
    const pulse = 0.5 + Math.sin(this.t * 5) * 0.5;
    if (!r.none) {
      Gfx.outlineRound(rx - 2, ry - 2, rw + 4, rh + 4, 6, SKIN.ink);
      Gfx.outlineRound(rx, ry, rw, rh, 5, pulse > 0.5 ? SKIN.goldLit : SKIN.gold);
    }
    // the slab: on the side of the screen the thing is not on
    const bw = 380, bh = 146;
    const cy = ry + rh / 2, cx = rx + rw / 2;
    let bx = clamp(cx - bw / 2, 16, W - bw - 16);
    let by = cy > H * 0.52 ? ry - bh - 34 : ry + rh + 34;
    by = clamp(by, 16, H - bh - 16);
    if (by < ry + rh && by + bh > ry) {                        // it would cover the thing: go sideways
      by = clamp(cy - bh / 2, 16, H - bh - 16);
      bx = cx > W / 2 ? rx - bw - 30 : rx + rw + 30;
      bx = clamp(bx, 16, W - bw - 16);
    }
    by += (1 - k) * 16;
    // an arrow from the slab to the thing
    const ax = clamp(cx, bx + 24, bx + bw - 24), ay = by < ry ? by + bh : by;
    const tx = clamp(ax, rx, rx + rw), ty = by < ry ? ry - 4 : ry + rh + 4;
    if (!r.none && Math.abs(ty - ay) > 8) {
      const n = Math.max(2, Math.floor(Math.abs(ty - ay) / 8));
      for (let j = 0; j < n; j++) {
        const u = j / n, px = lerp(ax, tx, u), py = lerp(ay, ty, u);
        if ((j + Math.floor(this.t * 8)) % 2) Gfx.rect(px - 2, py - 2, 4, 4, SKIN.goldLit);
      }
      const dir = ty > ay ? 1 : -1;
      for (let j = 0; j < 6; j++) Gfx.rect(tx - 6 + j, ty - dir * (6 - j), 12 - j * 2, 2, SKIN.goldLit);
    }
    UI.slab(bx, by, bw, bh, { r: 5, shadow: true });
    Gfx.text(s.title, bx + 18, by + 16, { color: SKIN.faceHi, scale: 1.7 });
    Gfx.text(s.title, bx + 18, by + 15, { color: SKIN.red, scale: 1.7 });
    Gfx.textWrap(s.text, bx + 18, by + 44, bw - 36, { color: SKIN.text, scale: 1.1, lineHeight: 15, onLight: true });
    Gfx.text(`${this.i + 1} / ${this.steps.length}`, bx + 18, by + bh - 26, { color: SKIN.textDim, scale: 1.1 });
    UI.wbutton(bx + bw - 124, by + bh - 44, 108, 34, this.i === this.steps.length - 1 ? 'GOT IT' : 'NEXT', () => this.next(), { scale: 1.2 });
    UI.button(bx + bw - 210, by + bh - 40, 76, 28, 'SKIP', () => this.finish(), { fill: SKIN.faceMid, scale: 1 });
  }
}

class HowToOverlay {
  constructor(onClose) { this.page = 0; this.onClose = onClose; }
  update() { if (Input.pressed('Escape')) this.close(); }
  close() { Game.overlay = null; if (this.onClose) this.onClose(); }
  draw() {
    Gfx.rectA(0, 0, W, H, '#120c16', 0.8);
    const r = UI.window(60, 30, W - 120, H - 60, 'HOW TO PLAY', { onClose: () => this.close() });
    const pages = [
      ['{y}THE STORY{/}', 'A flaming raptor named BLAZE spent six years chained in your kitchen as the family stove. This morning he snapped the chain and took your wife and children. You are not fast. You are not fit. You are, however, extremely loud.', '',
        '{y}THE VALLEY{/}', 'Walk with WASD, the arrows or the stick. SHIFT runs, and running burns stamina. Rest at campfires to heal. Hide in bushes. Every zone is split by two walls, and each wall has one gate in it.'],
      ['{y}THE GATES{/}', 'The first gate is held by a {r}GATE GUARD{/}. It stands in the gateway, it is awake, and it cannot be crept past - you have to fight it.', '',
        'The second is a {y}STONE GATE{/}: two plates in a ringed clearing off the road, and two boulders. Walk into a boulder to push it one tile. You can only push, never pull. A stone that reaches its plate drops in and stays. Cornered one? The stone with the circle on it resets them.', '',
        'Past both walls: put down three beasts to make {r}RAPTOR BAIT{/}, then take the last gate.'],
      ['{y}BEASTS{/}', 'Every beast wears a slate: skulls for how dangerous it is, {y}?{/} when it half-sees you, {r}!{/} when it has. Its cone shows where it is looking. Each kind behaves differently: dodos bolt, boars charge, compies call their friends, and a pterodactyl can see you in a bush.', '',
        '{y}SNEAK ATTACK{/}', 'Get behind one without being seen and press ACT: you start the fight with an extra energy and every beast {o}Vulnerable{/}. Get caught, and they start it on you.'],
      ['{y}A FIGHT{/}', 'You get {b}3 energy{/} a turn and draw five cards. Each card costs the number in its corner. When you are done, END TURN and the beasts act.', '',
        '{y}INTENT{/}', 'The icon over a beast is what it will do next: a fang and a number is an attack for that much. Read it before you spend your energy.', '',
        '{y}BLOCK{/}', 'Cards like Stone Wall give {b}Block{/}. Block soaks damage until the start of your next turn, then it crumbles.'],
      ['{y}RIFF CARDS{/}', 'Cards marked ♪ are riffs. Play one and it cuts to the note field: hit each arrow as it reaches the line with the {p}LEFT{/} {c}DOWN{/} {g}UP{/} {r}RIGHT{/} arrows, D F J K, or the four pads on a phone.', '',
        '{c}SICK{/} timing hits hardest, GOOD is fine, a MISS costs the crowd. Some riffs are duels: the beast plays a phrase, then you play it back.', '',
        '{y}HYPE{/}', 'Landed notes fill the Hype column. At full, {p}ENCORE{/} plays a free solo that hits every beast for every note you land.'],
      ['{y}RELICS{/}', 'Relics are charms that work for the whole run without being played - more energy, a heal after fights, wider timing windows. They sit in the gold slots at the top. Point at one to read it. You start with the Bone Pick; elites and bosses drop more.', '',
        '{y}UPGRADES{/}', 'Rest at a campfire and you can {g}practice{/} instead: one riff gets permanently better, shown with a +.'],
      ['{y}GEMS AND THE ALTAR{/}', 'Crystal outcrops grow all over the valley - two in every section. Walk up and press ACT to dig one out.', '',
        'Take the gems to the {p}ALTAR{/} in the village square. Three gems press one enchantment into a card for the rest of the run:', '',
        '{r}FLINT{/}  +3 damage      {b}GRANITE{/}  +4 block', '{g}FEATHER{/}  costs 1 less      {y}AMBER{/}  draws a card when played', '',
        'One gem to a card. The gem shows in the bottom of the stone.'],
      ['{y}THE MAMMOTH{/}', 'The shop walks. A mammoth loaded with other people\'s belongings wanders every zone, turning up and packing up on its own schedule. Find it, trade shells for riffs and relics, or pay it to eat a card you do not want.', '',
        '{y}FOG{/}', 'Purple fog marks something strange: a choice, a trade, a fight or a gift. You never know which until you walk in.'],
    ];
    let y = r.y + 10;
    for (const line of pages[this.page]) {
      if (!line) { y += 10; continue; }
      y += Gfx.textWrap(line, r.x + 16, y, r.w - 32, { scale: 1.25, lineHeight: 18, color: SKIN.text, onLight: true }) + 5;
    }
    const by = r.y + r.h - 46;
    UI.arrow(r.x + 16, by, 40, 'left', () => this.page = Math.max(0, this.page - 1), { disabled: this.page === 0 });
    UI.arrow(r.x + r.w - 56, by, 40, 'right', () => this.page = Math.min(pages.length - 1, this.page + 1), { disabled: this.page === pages.length - 1 });
    UI.wbutton(W / 2 - 80, by - 2, 160, 42, 'CLOSE', () => this.close());
    Gfx.text(`${this.page + 1} / ${pages.length}`, W / 2, by - 24, { color: SKIN.textDim, align: 'center', scale: 1.2 });
  }
}

class DeckOverlay {
  constructor(cards, title, o = {}) { this.cards = cards.slice(); this.title = title; this.o = o; this.scroll = 0; }
  update(dt) {
    const rows = Math.ceil(this.cards.length / 6);
    this.scroll = clamp(this.scroll + Input.wheel * 50 - Input.dragDY, 0, Math.max(0, rows * (CARD_H + 18) - 330));
    if (Input.pressed('Escape')) this.close();
  }
  close() { Game.overlay = null; if (this.o.onClose) this.o.onClose(); }
  draw() {
    Gfx.rectA(0, 0, W, H, '#120c16', 0.8);
    const r = UI.window(24, 20, W - 48, H - 40, this.title, { onClose: () => this.close() });
    Gfx.text(`${this.cards.length} riffs${this.o.onPick ? '  -  pick one' : ''}`, W / 2, r.y + 2, { color: SKIN.textDim, align: 'center', scale: 1.2 });
    const TOP = r.y + 22, BOT = r.y + r.h - 54;
    const ctx = Gfx.ctx; ctx.save(); ctx.beginPath(); ctx.rect(r.x, TOP, r.w, BOT - TOP); ctx.clip();
    const sorted = this.cards.slice().sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
    let zoom = null;
    for (let i = 0; i < sorted.length; i++) {
      const c = sorted[i];
      const x = r.x + 18 + (i % 6) * (CARD_W + 24), y = TOP + 6 + Math.floor(i / 6) * (CARD_H + 18) - this.scroll;
      if (y > BOT || y + CARD_H < TOP) continue;
      const hov = UI.hovered(x, Math.max(TOP, y), CARD_W, Math.min(CARD_H, BOT - y));
      Cards.draw(c, x, y, { hover: hov && !!this.o.onPick });
      if (hov) zoom = { c, x: x + CARD_W / 2 + (x < W / 2 ? 190 : -190), y: clamp(y + CARD_H / 2, 150, 380) };
      if (this.o.onPick) UI.hit(x, y, CARD_W, CARD_H, () => this.o.onPick(c));
    }
    ctx.restore();
    if (zoom) Cards.zoom(zoom.c, zoom.x, zoom.y);
    UI.wbutton(W / 2 - 90, r.y + r.h - 48, 180, 44, 'CLOSE', () => this.close());
  }
}
