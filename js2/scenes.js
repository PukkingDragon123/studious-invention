// ---------------------------------------------------------------------------
// scenes.js - boot, title, act transitions, ending, game over and overlays
// ---------------------------------------------------------------------------
'use strict';

// The menu sits at a campfire at night, and the family is having a jam: the
// Rib-Axe, the Tusk Horn, the Skull Bongos and the Bone Flute. Whoever you
// have not unlocked yet is only a shadow by the fire. In the bushes behind
// them, a very large grandmother's glasses catch the light.
function drawTitleWorld(t) {
  const ctx = Gfx.ctx;
  const camX = 150, camY = GY - VH * 0.76, FX = 566;
  Gfx.clear('#07060f');
  ctx.save();
  ctx.scale(VIEW, VIEW);
  ctx.translate(-Math.round(camX), -Math.round(camY));
  World.camp(t, { fireX: FX, watchers: 0 }, camX);
  const beat = AudioSys.song ? (AudioSys.now() - AudioSys.songStart) / AudioSys.beatDur() : t * 2;
  // stars over the treeline, and fireflies
  for (let i = 0; i < 40; i++) {
    const sx = camX + 10 + ((i * 137) % 480), sy = camY + 6 + ((i * 53) % 70);
    ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 2 + i * 1.7);
    Gfx.rect(sx, sy, 1, 1, i % 5 ? '#fffaea' : '#ffe98a');
  }
  ctx.globalAlpha = 1;
  // ---- Grandma Rex, in the bushes, watching the fire
  const RX = 408, RY = GY + 20;
  Gfx.sprite('grandma_idle', RX, RY, { anchor: 'bc', scale: 1, frame: Math.floor(t * 1.5) % 2, tint: '#0d0a1c', tintAmount: 0.86 });
  const gx = RX + 28, gy = RY - 124;
  if (Math.sin(t * 0.6) > -0.9) for (const [ex, r] of [[gx, 5], [gx - 14, 4]]) {
    Gfx.ctx.strokeStyle = '#ffe98a'; Gfx.ctx.lineWidth = 1.2; Gfx.ctx.globalAlpha = 0.85;
    Gfx.ctx.beginPath(); Gfx.ctx.arc(ex, gy, r, 0, Math.PI * 2); Gfx.ctx.stroke();
    Gfx.rectA(ex - 2, gy - 2, 2, 2, '#fffaea', 0.9); Gfx.ctx.globalAlpha = 1;
    if (window.Post) Post.light(ex, gy, 16, '#ffa832', 0.3);
  }
  for (const [bx, sc] of [[RX - 40, 2.4], [RX + 12, 2.8], [RX + 60, 2.2]])
    Gfx.sprite('v_bush', bx, GY + 8, { anchor: 'bc', scale: sc * 0.85, tint: '#0b0a18', tintAmount: 0.92 });
  // ---- the band
  const open = Heroes.unlocked();
  const BAND = [['bronk', FX - 116, 1, 0], ['vela', FX - 74, 1, 0.25], ['pebble', FX - 40, 1, 0.5], ['roxy', FX + 36, -1, 0.75]];
  for (const [id, x, face, ph] of BAND) {
    const H0 = Heroes.get(id), on = open.includes(id);
    const hop = on ? Math.abs(Math.sin((beat + ph) * Math.PI)) * 3 : 0;
    const spr = on && SPRITES[H0.base + '_play'] ? H0.base + '_play' : H0.base + '_idle';
    Gfx.shadow(x, GY + 1, 30, 0.35);
    Gfx.sprite(spr, x, GY + 1 - hop, { anchor: 'bc', frame: Math.floor(beat * 2 + ph * 4), flip: face < 0, tint: on ? null : '#0d0a1c', tintAmount: on ? 0 : 0.9 });
    if (on && ((beat + ph) % 1) < 0.05 && chance(0.6)) Particles.notes((x - camX) * VIEW, (GY - 90 - camY) * VIEW, 1);
    if (!on) Gfx.text('?', x, GY - 60 + Math.sin(t * 2 + ph * 6) * 2, { color: '#7a6d8a', align: 'center', scale: 1.4, outline: true });
  }
  for (let i = 0; i < 6; i++) {
    const fx = camX + 250 + ((i * 71 + t * 9) % 230), fy = GY - 40 - ((i * 37) % 60) + Math.sin(t * 1.3 + i) * 8;
    Gfx.rectA(fx, fy, 1, 1, '#e8ff8a', 0.5 + 0.5 * Math.sin(t * 3 + i * 2));
  }
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
  // the name bounces to the music, a letter at a time
  const beat = AudioSys.song ? (AudioSys.now() - AudioSys.songStart) / AudioSys.beatDur() : t * 2;
  const bounce = (txt, ty, sc, col, ph) => {
    const wd = Gfx.measure(txt, sc); let lx = cx - wd / 2;
    [...txt].forEach((ch, i) => {
      const dy = -Math.abs(Math.sin((beat * 0.5 + ph + i * 0.12) * Math.PI)) * 4;
      Gfx.text(ch, lx, ty + 3 + dy, { color: SKIN.faceHi, scale: sc });
      Gfx.text(ch, lx + 1, ty + 1 + dy, { color: '#3a2415', scale: sc });
      Gfx.text(ch, lx, ty + dy, { color: col, scale: sc });
      lx += Gfx.measure(ch, sc);
    });
  };
  bounce('ONGA', y + 48, 5.6, '#9c3510', 0);
  bounce('BONGA', y + 116, 5.6, '#5c1607', 0.5);
  Gfx.rect(x + 40, y + 188, w - 80, 3, '#3a2415');
  Gfx.rect(x + 40, y + 191, w - 80, 2, SKIN.faceHi);
  carve('A STONE AGE BOARD GAME SAGA', y + 200, 1.3, '#3a2415');
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

// The cave and the country round it are painted a pixel at a time and take
// most of a second. While the menu is up nobody minds losing a few
// milliseconds a frame, so they get painted then, and the first scene of the
// game opens without a stall.
function bakeAhead() {
  if (bakeAhead.done) return;
  const t0 = performance.now();
  if (!CaveBake.step(5)) return;
  while (performance.now() - t0 < 6) if (Vista.step()) { bakeAhead.done = true; return; }
}

class BootScene {
  constructor() { this.t = 0; }
  enter() { } exit() { }
  update(dt) { this.t += dt; bakeAhead(); if (Input.anyPress) { AudioSys.init(); Game.go(new TitleScene()); } }
  draw() {
    drawTitleWorld(this.t);
    const st = titleStone(this.t);
    Post.ui();
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
  constructor() { this.t = 0; this.saved = Game.hasSave(); }
  enter() { AudioSys.play('rest', { fade: 0.9 }); }
  exit() { }
  update(dt) {
    this.t += dt;
    bakeAhead();
    if (Input.pressed('Enter')) { this.saved ? Game.continueRun() : Game.newRun(); }
  }
  draw() {
    drawTitleWorld(this.t);
    const st = titleStone(this.t);
    Post.ui();
    // the menu, sized to fit whatever it holds: five entries with a save,
    // four without, and never off the bottom of the stone
    const items = [];
    if (this.saved) items.push(['CONTINUE', () => Game.continueRun()]);
    items.push([this.saved ? 'NEW STORY' : 'START', () => Game.newRun()]);
    items.push(['HOW TO PLAY', () => Game.overlay = new HowToOverlay()]);
    items.push(['SETTINGS', () => Game.overlay = new PauseOverlay(true)]);
    items.push(['CREDITS', () => Game.overlay = new CreditsOverlay()]);
    const bw = 260, bx = st.cx - bw / 2;
    const bh = items.length > 4 ? 40 : 46, gap = bh + 8;
    let y = Math.max(st.y + 236, st.y + st.h - 26 - items.length * gap + 8);
    for (const [label, cb] of items) { UI.wbutton(bx, y, bw, bh, label, cb, { scale: 1.4 }); y += gap; }
    Gfx.text(Input.touch ? 'roll the bone, save the family' : 'roll the bone, save the family  -  SPACE rolls, A S D F strums',
      W / 2, H - 22, { color: '#c4b89a', align: 'center', outline: true });
  }
  click() { }
}

// --------------------------------------------------------- between the lands
// The night after a boss: whoever was rescued at the fire, and a look at the
// road ahead.
const ACT_STORY = {
  1: { boss: 'BLAZE', lines: (me, freed) => [
    ['BLAZE', "Fine. FINE. Take them. Grandma never paid me anyway."],
    freed && [Heroes.get(freed).name, Heroes.get(freed).rescued],
    [me.name, "Where did she take the others?"],
    ['BLAZE', "Through the jungle. Horace the triceratops owes her a favour. Bring an umbrella."],
  ] },
  2: { boss: 'HORACE', lines: (me, freed) => [
    ['HORACE', "Hrrrm. I'm too old for this. Go on, take them. Tell Grandma I tried."],
    freed && [Heroes.get(freed).name, Heroes.get(freed).rescued],
    [me.name, "One more to go. She's heading for the mountain."],
    ['HORACE', "Then you'll have to cross the badlands. Watch out for the tar. The tar watches back."],
  ] },
  3: { boss: 'THE TAR KING', lines: me => [
    ['THE TAR KING', "Bloop... you have... unclogged me... bloop..."],
    [me.name, "Right. Mountains next. Big cold ones."],
    ['', "Past the badlands, the road climbs into the snow. Somewhere at the top, a very big lady is knitting."],
  ] },
  4: { boss: 'REXMOND', lines: me => [
    ['REXMOND', "Gran's going to be so disappointed in me."],
    [me.name, "We're sorry about your brother. We really didn't know."],
    ['REXMOND', "...Smoke Mountain. Top floor. She'll have the kettle on. She always has the kettle on."],
  ] },
};

class ActStory {
  constructor(biome, freed, onDone) {
    this.biome = biome; this.freed = freed; this.onDone = onDone; this.i = 0; this.t = 0; this.chars = 0;
    const me = Heroes.cur();
    this.lines = ACT_STORY[biome].lines(me, freed).filter(Boolean);
    if (freed) this.lines.push(['', `${Heroes.get(freed).name} joins you on the road. ${Heroes.get(freed).band.name}: ${Heroes.get(freed).band.desc}`]);
    this.lines.push(['', `Next: {y}${BIOMES[biome + 1].name}{/}. ${BIOMES[biome + 1].sub}.`]);
  }
  enter() { AudioSys.play('rest', { fade: 0.8 }); }
  exit() { }
  update(dt) {
    this.t += dt;
    const line = this.lines[this.i];
    this.chars = Math.min(line[1].length, this.chars + dt * 46 * (Input.down ? 3 : 1));
    if (Input.clicks.length || Input.pressed('Space', 'Enter', 'KeyE')) {
      if (this.chars < line[1].length) this.chars = line[1].length;
      else { this.i++; this.chars = 0; if (this.i >= this.lines.length) { this.i = this.lines.length - 1; if (!this.done) { this.done = true; this.onDone(); } } }
    }
  }
  draw() {
    // the camp again, at night: the family by the fire
    if (!this.cam) { this.cam = new Camera(); this.cam.zoom = this.cam.tzoom = VIEW; this.cam.lookAt(CAMP.fire, 394, true); }
    this.cam.ox = Math.sin(this.t * 0.37) * 1.4; this.cam.oy = Math.sin(this.t * 0.29 + 2) * 1;
    Gfx.clear('#05040c');
    this.cam.apply(Gfx.ctx);
    const camX = this.cam.x - W / (2 * this.cam.zoom);
    World.camp(this.t, {}, camX);
    // the family on the near side of the fire, whoever was just freed at
    // your elbow and bouncing; the beast you beat across it, seeing stars
    const fam = [Game.run.hero].concat(Game.run.band.filter(id => id !== this.freed));
    if (this.freed) fam.splice(1, 0, this.freed);
    fam.forEach((id, i) => {
      const x = CAMP.fire - 92 - i * 42;
      const hop = id === this.freed ? Math.abs(Math.sin(this.t * 5)) * 4 : 0;
      Gfx.shadow(x, GY + 2, 34, 0.3);
      Gfx.sprite(Heroes.spr(id), x, GY + 2 - hop, { anchor: 'bc', frame: Math.floor(this.t * 2 + i) % 2 });
    });
    const B = BIOMES[this.biome].boss, bs = { tarblob_idle: 1.6, tricera_idle: 1.1 }[B.spr] || 1, sp = Gfx.spr(B.spr);
    const bx = CAMP.fire + 150, top = GY + 2 - sp.h * bs;
    Gfx.shadow(bx, GY + 2, sp.w * bs * 0.45, 0.3);
    Gfx.sprite(B.spr, bx, GY + 2, { anchor: 'bc', frame: Math.floor(this.t * 2) % 2, scale: bs, flip: true, sy: 1 - Math.abs(Math.sin(this.t * 1.3)) * 0.02 });
    for (let k = 0; k < 3; k++) {
      const a = this.t * 3 + k * 2.09, sx = bx - sp.w * bs * 0.18 + Math.cos(a) * 16, sy = top + 4 + Math.sin(a) * 4;
      const c = Math.sin(a) > 0 ? '#ffe98a' : '#e0b93a';
      Gfx.rect(sx - 1, sy - 3, 2, 6, c); Gfx.rect(sx - 3, sy - 1, 6, 2, c);
    }
    Particles.draw(Gfx.ctx, true);
    Light.begin(0.55, '#05040c'); Light.point(CAMP.fire, GY - 40, 260, { color: '#ffa832', flicker: 0.08, power: 0.8, glow: 0.3 });
    this.cam.restore(Gfx.ctx);
    Post.set({ tint: '#ff9a4a', ta: 0.16, vig: 0.4 });
    Post.ui();
    Particles.draw(Gfx.ctx, false);
    const line = this.lines[this.i];
    Gfx.panel(60, H - 150, W - 120, 120, { fill: '#1a1424' });
    if (line[0]) { const nw = Gfx.measure(line[0], 1.2) + 18; Gfx.round(80, H - 162, nw, 22, 4, '#120c16'); Gfx.text(line[0], 89, H - 157, { color: '#ffe98a', scale: 1.2 }); }
    Gfx.textWrap(line[1].slice(0, Math.floor(this.chars)), 84, H - 128, W - 170, { color: '#e8dfc6', scale: 1.1, lineHeight: 15 });
    if (this.chars >= line[1].length) Gfx.text('▶', W - 90, H - 56 + Math.sin(this.t * 6) * 2, { color: '#ffe98a', scale: 1.4 });
    Gfx.text(`${this.i + 1}/${this.lines.length}`, W - 80, H - 168, { color: '#7a6d8a', align: 'right' });
  }
  click() { }
}

class GameOverScene {
  constructor() { this.t = 0; this.stats = Game.run ? Game.run.stats : null; this.biome = Game.run && Game.run.board ? Game.run.board.biome : 1; this.hero = Heroes.cur(); }
  enter() { AudioSys.play('gameover', { fade: 1 }); Game.clearSave(); }
  exit() { }
  update(dt) { this.t += dt; }
  draw() {
    Gfx.bands(0, 0, W, H, ['#120c16', '#241c2e', '#3f0e18', '#241c2e', '#120c16']);
    Post.set({ amb: [0.8, 0.7, 0.75], tint: '#c2333c', ta: 0.2, vig: 0.5 });
    const hurt = SPRITES[this.hero.base + '_hurt'] ? this.hero.base + '_hurt' : this.hero.base + '_idle';
    Gfx.sprite(hurt, W / 2, 330, { anchor: 'bc', scale: 2, alpha: 0.9 });
    Gfx.text('THE MUSIC STOPS', W / 2, 70, { color: '#ef6a5e', align: 'center', scale: 3.4, outline: true, outlineWidth: 2 });
    Gfx.text(`${this.hero.name} falls in ${BIOMES[this.biome].name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}. Far up the mountain, a kettle whistles.`, W / 2, 370, { color: '#d6cfe0', align: 'center', scale: 1.2 });
    if (this.stats) Gfx.text(`beasts beaten ${this.stats.kills}   notes landed ${this.stats.sick}/${this.stats.notes}   damage taken ${this.stats.taken}`, W / 2, 400, { color: '#7a6d8a', align: 'center' });
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
      UI.checkbox(x + 222, y, 22, Settings.lighting !== false, () => { Settings.lighting = Settings.lighting === false; Game.saveSettings(); if (Settings.lighting) Post.enable(); else Post.disable(); }, { label: 'LIGHTING' });
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
      { t: 'BRONK ROCKBOTTOM . . . . . . . . rib-axe', s: 1.1 },
      { t: 'PEBBLE . . . . . . . . . . . . . skull bongos', s: 1.1 },
      { t: 'ROXY . . . . . . . . . . . . . . . . bone flute', s: 1.1 },
      { t: 'VELA . . . . . . . . . . . . . . . . . tusk horn', s: 1.1 },
      { t: 'GRANDMA REX . . . . . . . . . . . . . herself', s: 1.1, gap: 30 },

      { t: 'SUPPORTING', s: 1.6, c: SKIN.red, gap: 8 },
      { t: 'TRUNKS . . . . . . . . . . . . . . . . plumbing', s: 1.1 },
      { t: 'BLAZE . . . . . . . . . . . . . . . the stove', s: 1.1 },
      { t: 'HORACE . . . . . . . . . . . . . . . sitting', s: 1.1 },
      { t: 'THE TAR KING . . . . . . . . . . . . . bloop', s: 1.1 },
      { t: 'REXFORD . . . . . . . . . . . . . . . dinner', s: 1.1, gap: 30 },

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
      ['{y}THE STORY{/}', 'The Rockbottoms were halfway through dinner - a whole roast T-Rex head - when a very large old lady knocked at the cave. It was Grandma Rex. The head was her grandson. She took three of the family and ran for her mountain. You were in the toilet.', '',
        '{y}THE ROAD{/}', 'Five lands lie between the cave and her lair. Each is a board of stone tiles. Roll the bone die and move exactly that many tiles, forward OR back. Every tile you could land on glows: click one.'],
      ['{y}FORKS AND DEAD ENDS{/}', 'The road splits into two lanes and joins again: one lane is usually easier, the other richer. Side trails climb to caves and secrets and stop dead - walk back down them next turn.', '',
        '{y}THE TILES{/}', '{b}Blue{/} tiles help you: food, gems, cards, charms. {r}Red{/} ones hurt. {o}Orange{/} ones are fights. {p}Purple{/} ones are mysteries, strangers and crossroads. {y}Gold{/} ones are camps, the trader and the gem altar. Point at any tile to read it.'],
      ['{y}THE GROUND{/}', 'Every tile has ground: grass, water, hot rock, stone, bone, ice, sand or cave. The ground you walk over each round is counted in the corner, and lots of cards and artifacts care. {b}Wet Feet{/} doubles your next lightning if you splashed through water on the way to the fight.', '',
        'Hot ground stings when you stop on it. Ice makes you slide on. Tar pits stop you dead. Beasts cannot see you in grass.'],
      ['{y}CHARMS AND THE DICE{/}', 'Charms are one-use tricks you carry, three at most. Most bend the dice: pick your number, roll two and choose, roll high, roll low, nudge it one, roll again. Some keep you out of fights.', '',
        '{y}THE BEASTS{/}', 'Beasts roam the road between the tiles. After you move, they move. One that catches you gets the first hit; land on one yourself and you get the jump on it.'],
      ['{y}A FIGHT{/}', 'You get {b}3 energy{/} a turn and draw your hand. Each card costs the number in its corner. END TURN and the beasts act. The icon over a beast is what it will do next.', '',
        '{y}RIFF CARDS{/}', 'Cards marked ♪ are riffs: hit each note as it reaches the line with D F J K, the arrows, or the pads on a phone. Better timing, bigger hit. Landed notes fill Hype, and full Hype is a free ENCORE.'],
      ['{y}THE FAMILY{/}', '{r}BRONK{/} gets angrier when hurt, and Rage adds to every hit. {p}VELA{/} plays horn cards that echo back next turn, and controls the fight. {g}PEBBLE{/} plays lots of cheap cards fast. {c}ROXY{/} soaks beasts with water and zaps them with lightning.', '',
        'Every boss you beat hands back one of the family, and they fight beside you after that.'],
      ['{y}GEMS{/}', 'Gems are the only money. Dig them out of gem tiles, win them in fights, find them in caves. Spend them with {y}Trunks the trader{/}, or press them into your cards at a {p}gem altar{/}: flint hits harder, granite blocks more, feather costs less, amber draws a card.'],
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
