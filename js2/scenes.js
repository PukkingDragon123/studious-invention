// ---------------------------------------------------------------------------
// scenes.js - boot, title, act transitions, ending, game over and overlays
// ---------------------------------------------------------------------------
'use strict';

// the dawn-over-the-ruins painting behind both the boot prompt and the title
function drawTitleWorld(t) {
  Gfx.bands(0, 0, W, 360, ['#281040', '#4b2070', '#a03a68', '#e06a1b', '#ffa832', '#ffe08a']);
  Gfx.circle(760, 150, 46, '#ffe98a');
  Gfx.glow(760, 150, 220, '#ffa832', 0.35);
  const ctx = Gfx.ctx;
  ctx.fillStyle = '#5c1607';
  ctx.beginPath(); ctx.moveTo(0, 320);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, 236 + Math.sin(x * 0.0055) * 52 + Math.sin(x * 0.014) * 16);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
  ctx.fillStyle = '#1a0c14';
  ctx.beginPath(); ctx.moveTo(0, 340);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, 292 + Math.sin(x * 0.009 + 2) * 26);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
  Gfx.rect(0, 392, W, H - 392, '#241c2e');
  Gfx.rect(0, 392, W, 4, '#3b3048');
  for (let i = 0; i < 7; i++) Gfx.sprite(i % 2 ? 'prop_hut_ruin' : 'prop_hut', 80 + i * 150, 396, { anchor: 'bc', tint: '#120c16', tintAmount: 0.55 });
  for (let i = 0; i < 9; i++) Gfx.sprite('prop_deadtree', 40 + i * 120, 398, { anchor: 'bc', tint: '#120c16', tintAmount: 0.7, alpha: 0.8 });
  const beat = AudioSys.song ? (AudioSys.now() - AudioSys.songStart) / AudioSys.beatDur() : t * 2;
  const bob = Math.abs(Math.sin(beat * Math.PI));
  Gfx.sprite('bronk_play', 640, 500 - bob * 6, { anchor: 'bc', frame: Math.floor(beat * 2) % 4, scale: 2 });
  Gfx.sprite('blaze_idle', 840, 504, { anchor: 'bc', frame: Math.floor(t * 6) % 2, scale: 1.5 });
  for (let i = 0; i < 2; i++) if (chance(0.45)) Particles.fire(840 + rnd(-30, 30), 420, 1);
  for (let i = 0; i < 6; i++) Gfx.sprite(i % 2 ? 'villager_idle' : 'villager2_idle', 120 + i * 78, 512 - Math.abs(Math.sin((beat + i * 0.4) * Math.PI)) * 5, { anchor: 'bc', tint: '#120c16', tintAmount: 0.7, frame: Math.floor(beat + i) });
  if (chance(0.35)) Particles.spawn(rnd(0, W), H, { n: 1, color: ['#ffa832', '#e06a1b', '#574a66'], speed: 16, gravity: -22, life: 4, size: 3, sizeEnd: 0, world: false });
  Particles.draw(Gfx.ctx, false);
  Gfx.vignette(0.55);
}

class BootScene {
  constructor() { this.t = 0; }
  enter() { } exit() { }
  update(dt) { this.t += dt; if (Input.anyPress) { AudioSys.init(); Game.go(new TitleScene()); } }
  draw() {
    drawTitleWorld(this.t);
    Gfx.rectA(0, 0, W, H, '#120c16', 0.32);
    Gfx.text('ONGA', 300, 74, { color: '#ffe98a', align: 'center', scale: 6.4, outline: true, outlineWidth: 3 });
    Gfx.text('BONGA', 300, 154, { color: '#e06a1b', align: 'center', scale: 6.4, outline: true, outlineWidth: 3 });
    Gfx.text('a stone age rock saga', 300, 226, { color: '#ffffff', align: 'center', scale: 1.4, outline: true });
    Gfx.ctx.globalAlpha = 0.55 + 0.45 * Math.sin(this.t * 4);
    Gfx.text(Input.touch ? 'TAP TO BEGIN' : 'PRESS ANY KEY', 300, 300, { color: '#ffffff', align: 'center', scale: 1.8, outline: true, outlineWidth: 2 });
    Gfx.ctx.globalAlpha = 1;
    Gfx.text('headphones recommended ♪', 300, 340, { color: '#d6cfe0', align: 'center', outline: true });
  }
  click() { }
}

class TitleScene {
  constructor() { this.t = 0; }
  enter() { AudioSys.play('home', { fade: 0.6 }); }
  exit() { }
  update(dt) {
    this.t += dt;
    if (Input.pressed('Enter')) { Game.hasSave() ? Game.continueRun() : Game.newRun(); }
  }
  draw() {
    drawTitleWorld(this.t);
    const beat = AudioSys.song ? (AudioSys.now() - AudioSys.songStart) / AudioSys.beatDur() : this.t * 2;
    const pulse = 1 + Math.abs(Math.sin(beat * Math.PI)) * 0.04;
    Gfx.text('ONGA', 300, 70, { color: '#ffe98a', align: 'center', scale: 6.4 * pulse, outline: true, outlineWidth: 3 });
    Gfx.text('BONGA', 300, 150, { color: '#e06a1b', align: 'center', scale: 6.4 * pulse, outline: true, outlineWidth: 3 });
    Gfx.text('a stone age rock saga', 300, 222, { color: '#ffffff', align: 'center', scale: 1.4, outline: true });
    let y = 280;
    if (Game.hasSave()) { UI.button(190, y, 220, 44, 'CONTINUE', () => Game.continueRun(), { scale: 1.3, color: '#a8e878' }); y += 54; }
    UI.button(190, y, 220, 44, Game.hasSave() ? 'NEW STORY' : 'START', () => Game.newRun(), { scale: 1.3 }); y += 54;
    UI.button(190, y, 220, 44, 'HOW TO PLAY', () => Game.overlay = new HowToOverlay(), { scale: 1.3 }); y += 54;
    UI.button(190, y, 220, 44, 'SETTINGS', () => Game.overlay = new PauseOverlay(true), { scale: 1.3 });
    Gfx.text(Input.touch ? 'tap the frets, save the family' : 'arrows or D F J K  -  save the family', W / 2, H - 24, { color: '#7a6d8a', align: 'center' });
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
    Gfx.bands(0, 0, W, 360, ['#281040', '#4b2070', '#7d1d2b', '#9c3510', '#e06a1b']);
    Gfx.rect(0, 340, W, H - 340, '#2e2b38');
    for (let i = 0; i < 6; i++) Gfx.sprite('prop_deadtree', 60 + i * 180, 350, { anchor: 'bc', tint: '#120c16', tintAmount: 0.6 });
    const sprs = { pebble: 'kid_a_idle', roxy: 'kid_b_idle' };
    Gfx.sprite('bronk_idle', 250, 440, { anchor: 'bc', scale: 1.4, frame: Math.floor(this.t * 2) % 2 });
    Gfx.sprite(sprs[this.data.rescued], 340, 440, { anchor: 'bc', scale: 1.4, frame: Math.floor(this.t * 3) % 2 });
    Gfx.sprite('blaze_idle', 760, 444, { anchor: 'bc', scale: 1.3, frame: Math.floor(this.t * 6) % 2, flip: true });
    for (let i = 0; i < 2; i++) if (chance(0.4)) Particles.fire(760 + rnd(-30, 30), 390, 1);
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
      y += 30;
      Gfx.textWrap('Notes landing late? Lower the offset. Early? Raise it.', x + 2, y, w - 210, { color: SKIN.textDim, lineHeight: 14 });
      UI.wbutton(W / 2 - 90, 56 + PH - 56, 180, 44, 'BACK', () => { if (this.settingsOnly) Game.overlay = null; else this.mode = 'menu'; });
    }
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
        '{y}THE VALLEY{/}', 'Walk the ruins with the arrows or WASD. SHIFT runs, and running burns the stamina you do not have. Rest at campfires. Hide in bushes. Beasts patrol with a cone of vision: stay out of it, or answer for it.'],
      ['{y}A FIGHT{/}', 'Three energy a turn, five cards. {b}Block{/} soaks damage until your next turn. Beasts show what they are about to do above their heads.', '',
        '{y}A RIFF{/}', 'Cards marked ♪ cut to a close-up and hand you the note field. Arrows rise to the receptors: hit them with the {p}LEFT{/} {c}DOWN{/} {g}UP{/} {r}RIGHT{/} arrow keys, D F J K, or the four pads on a touch screen.', '',
        '{c}SICK{/} timing hits hardest, GOOD is fine, a MISS costs you the crowd. The bar at the top is the crowd: lose it and your riff lands soft.'],
      ['{y}CALL AND ANSWER{/}', 'Some riffs are duels. The beast plays a phrase on the left, then you answer it on the right. Watch its lane, then play it back.', '',
        '{y}HYPE{/}', 'Landed notes and rally cards fill the Hype column. At full, {p}ENCORE{/} unleashes a free solo that hits every beast on the field for every note you land.', '',
        '{y}THE MAMMOTH{/}', 'The shop walks. A mammoth loaded with other people\'s belongings wanders every zone. Find it, trade shells, move on.'],
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
