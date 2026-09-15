// ---------------------------------------------------------------------------
// scenes.js - boot, title, story, game over, ending, overlays
// ---------------------------------------------------------------------------
'use strict';

// Night village backdrop used by title/story/ending
function drawVillageNight(t, o = {}) {
  Gfx.bands(0, 0, W, 170, ['#0b0720', '#1a1240', '#2a1a58', '#4b2a8a', '#6a3a8a']);
  // stars
  for (let i = 0; i < 40; i++) { const x = (i * 97 + 13) % W, y = (i * 53) % 120; Gfx.rectA(x, y, 1 + (i % 3 === 0 ? 1 : 0), 1 + (i % 3 === 0 ? 1 : 0), '#ffffff', 0.5 + 0.5 * Math.sin(t * 2 + i)); }
  Gfx.circle(540, 50, 26, '#f5eed3'); Gfx.circle(530, 44, 6, '#c9bc90'); Gfx.circle(550, 60, 4, '#c9bc90');
  if (!o.noVolcano) Gfx.sprite('lm_volcano', 90, 176, { anchor: 'bc', scale: 3, alpha: 0.6, frame: Math.floor(t * 2) % 2 });
  const ctx = Gfx.ctx; ctx.fillStyle = '#2f3a2a'; ctx.beginPath(); ctx.moveTo(0, 170); for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 150 + Math.sin(x * 0.03) * 10); ctx.lineTo(W, 230); ctx.lineTo(0, 230); ctx.fill();
  Gfx.rect(0, GROUND_Y - 6, W, 60, '#4a3a2a'); Gfx.rect(0, GROUND_Y - 6, W, 3, '#6a5a3a');
  if (!o.noVillage) { Gfx.sprite('lm_hut', 470, GROUND_Y, { anchor: 'bc', scale: 3 }); Gfx.sprite('lm_hut', 590, GROUND_Y - 6, { anchor: 'bc', scale: 2 }); Gfx.sprite('lm_totem', 400, GROUND_Y, { anchor: 'bc', scale: 2 }); }
  Gfx.sprite('lm_palm', 30, GROUND_Y, { anchor: 'bc', scale: 2 });
  // pteros
  for (let i = 0; i < 2; i++) { const x = ((t * 25 + i * 300) % (W + 100)) - 50; Gfx.sprite('ptero', x, 40 + i * 30 + Math.sin(t * 3 + i) * 5, { anchor: 'c', scale: 1, tint: '#0b0720', frame: Math.floor(t * 4 + i) % 2 }); }
}

function drawStage(t, x, y, cheer = true) {
  Gfx.sprite('lm_stage', x, y, { anchor: 'bc', scale: 2 });
  const beat = AudioSys.song ? (AudioSys.now() - AudioSys.songStart) / AudioSys.beatDur() : t * 2;
  const bob = Math.abs(Math.sin(beat * Math.PI)) * 3;
  Gfx.sprite('ugg', x - 20, y - 16 - bob, { anchor: 'bc', scale: 3, frame: Math.floor(beat) % 2 });
  Gfx.sprite('bonga', x - 60, y - 14 - bob * 0.5, { anchor: 'bc', scale: 3, frame: Math.floor(beat * 2) % 2 });
  Gfx.sprite('onga', x + 20, y - 18 - bob, { anchor: 'bc', scale: 3, frame: Math.floor(beat) % 2 === 0 ? 2 : 0 });
  Gfx.sprite('rockaxe', x + 28, y - 54 - bob, { anchor: 'c', scale: 3, rot: -0.3 });
  Gfx.sprite('zog', x + 58, y - 14 - bob, { anchor: 'bc', scale: 3, frame: Math.floor(beat) % 2 });
  if (cheer) for (let i = 0; i < 9; i++) { const fx = 60 + i * 60 + (i % 2) * 10; Gfx.sprite('folk', fx, y + 20 + (i % 3) * 6 - Math.abs(Math.sin(beat * Math.PI + i)) * 4, { anchor: 'bc', scale: 2, frame: (Math.floor(beat) + i) % 2 }); }
}

// ---------------------------------------------------------------------- Boot
class BootScene {
  constructor() { this.t = 0; }
  enter() { } exit() { }
  update(dt) { this.t += dt; if (Input.clicks.length || Input.keys.length) { AudioSys.init(); Game.go(new TitleScene()); } }
  click() { }
  draw() { drawVillageNight(this.t, {}); Gfx.rectA(0, 0, W, H, '#0b0710', 0.5); Gfx.text('ONGA BONGA', 320, 120, { color: '#f6d743', align: 'center', scale: 5, outline: true }); Gfx.ctx.globalAlpha = 0.6 + 0.4 * Math.sin(this.t * 4); Gfx.text('CLICK OR PRESS ANY KEY TO START', 320, 220, { color: '#ffffff', align: 'center', scale: 1, outline: true }); Gfx.ctx.globalAlpha = 1; Gfx.text('turn your sound on!  ♪', 320, 240, { color: '#a89aa8', align: 'center' }); }
}

// ---------------------------------------------------------------------- Title
class TitleScene {
  constructor() { this.t = 0; }
  enter() { AudioSys.play('title', { fade: 0.5 }); }
  exit() { }
  update(dt) { this.t += dt; for (const k of Input.keys) { if (k.code === 'Enter' || k.code === 'Space') { if (Game.hasSave()) Game.continueRun(); else Game.newRun(); } } }
  click() { }
  draw() {
    drawVillageNight(this.t, { noVillage: true });
    drawStage(this.t, 440, GROUND_Y + 4, true);
    Gfx.rectA(0, GROUND_Y + 10, W, 200, '#0b0710', 0.3);
    const beat = AudioSys.song ? (AudioSys.now() - AudioSys.songStart) / AudioSys.beatDur() : this.t * 2;
    const pulse = 1 + Math.max(0, Math.sin(beat * Math.PI)) * 0.05;
    Gfx.text('ONGA', 150, 40 - (pulse - 1) * 40, { color: '#f6d743', align: 'center', scale: 5 * pulse, outline: true });
    Gfx.text('BONGA', 150, 82 - (pulse - 1) * 40, { color: '#f28c28', align: 'center', scale: 5 * pulse, outline: true });
    Gfx.text('A STONE AGE ROCK SAGA', 150, 128, { color: '#ece6dc', align: 'center', outline: true });
    for (let i = 0; i < 3; i++) { const k = (this.t * 0.4 + i / 3) % 1; Gfx.text('♪', 230 + Math.sin(k * 8) * 12, 120 - k * 90, { color: i % 2 ? '#f5a3c7' : '#5ee0f0', scale: 2, outline: true }); }
    let y = 150;
    if (Game.hasSave()) { UI.button(80, y, 140, 24, 'CONTINUE RUN', () => Game.continueRun(), { color: '#a3e04a' }); y += 30; }
    UI.button(80, y, 140, 24, Game.hasSave() ? 'NEW RUN' : 'START', () => Game.newRun()); y += 30;
    UI.button(80, y, 140, 24, 'HOW TO PLAY', () => Game.overlay = new HowToOverlay()); y += 30;
    UI.button(80, y, 140, 24, 'SETTINGS', () => Game.overlay = new PauseOverlay(true)); y += 30;
    Gfx.text('D F J K  or  arrow keys to play riffs', 320, H - 12, { color: '#a89aa8', align: 'center' });
  }
}

// ---------------------------------------------------------------------- Story
const STORY = {
  intro: [
    { bg: 'village', text: 'Long ago, in Bedrock Valley, the tribe gathered every full moon for the greatest festival of all: the ONGA BONGA.', stage: true },
    { bg: 'village', speaker: 'ONGA', portrait: 'onga', text: "Alright tribe! Bonga on the log drums, Ugg on bass, Zog on flute... ONE, TWO, THREE, ROCK!", stage: true },
    { bg: 'village', speaker: 'PRINCESS PETRA', portrait: 'petra', text: 'Play it loud, Onga! The whole valley is dancing tonight!', stage: true, petra: true },
    { bg: 3, text: 'But the music carried far... all the way to the volcano, where KING REX brooded on his throne of bones.', rex: true },
    { bg: 3, speaker: 'KING REX', portrait: 'trex', text: 'WHO DARES MAKE NOISE LOUDER THAN MY ROAR?! I will take your princess AND your band. Let us see you rock ALONE, little caveman!', rex: true, roar: true },
    { bg: 'village_dark', text: "Rex's horde tore through the festival. Bonga was dragged off to Thunder Tricera's plateau. Ugg sank into the Swamp Queen's tar. Zog fled into the ash clouds... and Princess Petra was carried away to Volcano Peak." },
    { bg: 'village_dark', speaker: 'ONGA', portrait: 'onga', text: "They took my band. They took Petra. But they can't take THE BEAT. Rock-Axe... it's time to rally the tribe and get everyone home.", onga: true },
    { bg: 'village_dark', speaker: 'HOW TO FIGHT', text: 'Play RIFF cards to attack. Each riff starts a rhythm solo: hit the falling notes with {y}D F J K{/} (or arrow keys) as they reach the bone. {y}PERFECT{/} notes deal bonus damage. Blocks and rallies resolve instantly. Fill the {p}HYPE{/} meter for an {p}ENCORE{/}!', onga: true },
  ],
  act1_clear: [
    { bg: 1, text: 'Thunder Tricera crashes down. Behind the dust, a bone cage rattles... and a familiar voice starts drumming on the bars.', cage: true },
    { bg: 1, speaker: 'BONGA', portrait: 'bonga', text: "ONGA! I knew you'd come! Wait 'til you hear what I've been working on with these bars. Two weeks of solid practice!", bonga: true },
    { bg: 1, speaker: 'ONGA', portrait: 'onga', text: 'Bonga! The band is getting back together. Next stop: the Tar Pit Jungle. Ugg is down there somewhere.', bonga: true, onga: true },
    { bg: 1, speaker: 'BONGA JOINED THE BAND!', text: 'Every turn, Bonga\'s drum strike hits a random enemy. New riff added to your deck: {y}DRUM SOLO{/}. You also recover 25% of your HP.', bonga: true, onga: true, jingle: true },
  ],
  act2_clear: [
    { bg: 2, text: 'The Swamp Queen sinks beneath the tar with a final gurgle. Bubbles rise... and a very tall, very sticky caveman climbs out.' },
    { bg: 2, speaker: 'UGG', portrait: 'ugg', text: 'Ugg... stuck... two weeks. Ugg VERY hungry. Ugg ready to DROP THE BASS.', ugg: true },
    { bg: 2, speaker: 'ONGA', portrait: 'onga', text: "Ugg! Now we're talking. Petra's up on that volcano with King Rex. Let's go shake the whole mountain.", ugg: true, onga: true },
    { bg: 2, speaker: 'UGG JOINED THE BAND!', text: 'You start every turn with {b}3 Block{/}. New riff added to your deck: {y}BASS DROP{/}. You also recover 25% of your HP.', ugg: true, onga: true, jingle: true },
  ],
  act3_start: [
    { bg: 3, text: 'Ash falls like grey snow on the slopes of Volcano Peak. Through the smoke drifts a thin, brave melody...' },
    { bg: 3, speaker: 'ZOG', portrait: 'zog', text: 'I followed your riffs across the whole valley, Onga. Every night I could hear them. My flute is yours. Let\'s bring Petra home.', zog: true },
    { bg: 3, speaker: 'ZOG JOINED THE BAND!', text: 'Riff hit windows are {y}15% wider{/} and you heal {g}4 HP{/} after every combat. New card: {y}FLUTE LULLABY{/} (stuns an enemy).', zog: true, onga: true, jingle: true },
  ],
  ending: [
    { bg: 3, text: 'KING REX crashes to the ground with a sound like a falling mountain. The volcano rumbles... and then, for the first time in weeks, falls silent.', rexDown: true },
    { bg: 3, speaker: 'PRINCESS PETRA', portrait: 'petra', text: 'Onga! You came all this way... with the WHOLE band? You absolute legends. I could hear you from the top of the peak!', petra: true, rexDown: true },
    { bg: 3, speaker: 'KING REX', portrait: 'trex', text: '...that last riff... it was... kind of catchy. Ugh. Fine. Take your princess. But teach me that solo.', petra: true, rexDown: true },
    { bg: 3, speaker: 'ONGA', portrait: 'onga', text: "Everyone's here. Everyone's safe. Which means there's only one thing left to do...", petra: true, rexDown: true, onga: true },
    { bg: 'village', text: 'And so the tribe gathered once more for the greatest festival of all. The moon was full, the fire was high, and the band was back together.', stage: true, petra: true, rexFan: true },
  ],
};

class StoryScene {
  constructor(pages, onDone, o = {}) { this.pages = pages; this.i = 0; this.t = 0; this.chars = 0; this.onDone = onDone; this.o = o; }
  enter() { if (this.o.music) AudioSys.play(this.o.music, { fade: 0.8 }); this.startPage(); }
  exit() { }
  startPage() { this.chars = 0; this.t = 0; const p = this.pages[this.i]; if (p.roar) { AudioSys.sfx('roar', { pitch: 50, vol: 1, len: 1.6 }); Shake.add(6, 0.6); } if (p.jingle) AudioSys.sfx('unlock'); }
  advance() { const p = this.pages[this.i]; if (this.chars < p.text.length) { this.chars = p.text.length; return; } this.i++; if (this.i >= this.pages.length) { this.onDone(); return; } this.startPage(); }
  update(dt) { this.t += dt; this.chars = Math.min(this.pages[this.i].text.length, this.chars + dt * 45); for (const k of Input.keys) if (['Space', 'Enter', 'KeyE'].includes(k.code)) this.advance(); for (const c of Input.clicks) this.advance(); }
  click() { }
  draw() {
    const p = this.pages[this.i];
    if (p.bg === 'village') drawVillageNight(this.t); else if (p.bg === 'village_dark') { drawVillageNight(this.t); Gfx.rectA(0, 0, W, H, '#3a0a10', 0.5); for (let i = 0; i < 6; i++) Particles.spawn(rnd(0, W), rnd(100, 200), { n: 1, color: ['#55555f', '#f28c28'], speed: 20, gravity: -30, life: 1 }); } else Backgrounds.draw(p.bg, this.t);
    if (p.stage) drawStage(this.t, 380, GROUND_Y + 4, true);
    if (p.petra && p.stage) Gfx.sprite('petra', 470, GROUND_Y - 16, { anchor: 'bc', scale: 3, frame: Math.floor(this.t * 2) % 2 });
    if (p.rexFan) Gfx.sprite('trex', 600, GROUND_Y + 30, { anchor: 'bc', scale: 2, frame: Math.floor(this.t * 2) % 2 });
    if (p.rex) Gfx.sprite('trex', 460, GROUND_Y + 4, { anchor: 'bc', scale: 4, frame: Math.floor(this.t * 2) % 2 });
    if (p.rexDown) Gfx.sprite('trex', 480, GROUND_Y + 4, { anchor: 'bc', scale: 4, sy: 0.5, alpha: 0.9 });
    if (p.cage) { Gfx.sprite('lm_cage', 470, GROUND_Y + 4, { anchor: 'bc', scale: 3 }); }
    if (p.bonga) Gfx.sprite('bonga', 470, GROUND_Y + 2, { anchor: 'bc', scale: 3, flip: true, frame: Math.floor(this.t * 3) % 2 });
    if (p.ugg) Gfx.sprite('ugg', 470, GROUND_Y + 2, { anchor: 'bc', scale: 3, flip: true, frame: Math.floor(this.t * 2) % 2 });
    if (p.zog) Gfx.sprite('zog', 470, GROUND_Y + 2, { anchor: 'bc', scale: 3, flip: true, frame: Math.floor(this.t * 2) % 2 });
    if (p.petra && !p.stage) Gfx.sprite('petra', 380, GROUND_Y + 2, { anchor: 'bc', scale: 3, flip: true, frame: Math.floor(this.t * 2) % 2 });
    if (p.onga) { Gfx.sprite('onga', 150, GROUND_Y + 2, { anchor: 'bc', scale: 3, frame: Math.floor(this.t * 2) % 2 }); Gfx.sprite('rockaxe', 158, GROUND_Y - 34, { anchor: 'c', scale: 3, rot: -0.25 }); }
    // dialog box
    Gfx.panel(30, 258, 580, 90, { fill: '#1d1626', border: p.speaker ? '#f6d743' : '#a89aa8' });
    let tx = 44;
    if (p.portrait) { Gfx.rect(40, 266, 54, 70, '#16101c'); Gfx.rect(42, 268, 50, 66, '#2a2030'); const s = Gfx.spriteSize(p.portrait); const sc = Math.min(2, Math.floor(60 / s.h) || 1); Gfx.sprite(p.portrait, 67, 333, { anchor: 'bc', scale: sc, flip: p.portrait === 'trex' }); tx = 104; }
    if (p.speaker) Gfx.text(p.speaker, tx, 266, { color: '#f6d743' });
    Gfx.textWrap(p.text.slice(0, Math.floor(this.chars)), tx, p.speaker ? 280 : 270, 600 - tx, { color: '#ece6dc', lineHeight: 10 });
    if (this.chars >= p.text.length) Gfx.text('▶', 596, 336 + Math.sin(this.t * 6) * 2, { color: '#f6d743' });
    Gfx.text(`${this.i + 1}/${this.pages.length}   click / space`, 600, 252, { color: '#a89aa8', align: 'right' });
    if (this.o.skippable) UI.button(560, 6, 70, 18, 'SKIP', () => this.onDone());
  }
}

// ---------------------------------------------------------------------- Game over / Ending
class GameOverScene {
  constructor() { this.t = 0; this.stats = Game.run ? Game.run.stats : null; this.act = Game.run ? Game.run.act : 1; this.floor = Game.run ? Game.run.floor : 0; }
  enter() { AudioSys.play('gameover', { fade: 1 }); Game.clearSave(); }
  exit() { }
  update(dt) { this.t += dt; }
  click() { }
  draw() {
    Backgrounds.draw(this.act, this.t); Gfx.rectA(0, 0, W, H, '#0b0710', 0.75);
    Gfx.sprite('onga', 320, 150, { anchor: 'bc', scale: 4, frame: 3, alpha: 0.8 });
    Gfx.text('THE MUSIC FADES', 320, 40, { color: '#ff6b6b', align: 'center', scale: 3, outline: true });
    Gfx.text(`Onga fell on floor ${this.floor} of Act ${roman(this.act)}. The tribe still waits for a hero.`, 320, 170, { color: '#ece6dc', align: 'center' });
    if (this.stats) { const s = this.stats; Gfx.text(`Dinos defeated: ${s.kills}   Notes hit: ${s.perfects}/${s.notes} perfect   Damage taken: ${s.damageTaken}`, 320, 190, { color: '#a89aa8', align: 'center' }); }
    UI.button(250, 230, 140, 26, 'TRY AGAIN', () => Game.newRun()); UI.button(250, 264, 140, 26, 'TITLE', () => Game.go(new TitleScene()));
  }
}

class EndingScene {
  constructor() { this.t = 0; this.stats = Game.run.stats; }
  enter() { AudioSys.play('ending', { fade: 0.5 }); Game.clearSave(); }
  exit() { }
  update(dt) { this.t += dt; if (this.t > 1) Particles.spawn(rnd(0, W), -5, { n: 1, color: ['#f5a3c7', '#f6d743', '#5ee0f0', '#a3e04a'], speed: 10, gravity: 40, life: 3, size: 2 }); }
  click() { }
  draw() {
    drawVillageNight(this.t, { noVillage: true });
    drawStage(this.t, 330, GROUND_Y + 4, true);
    const beat = AudioSys.song ? (AudioSys.now() - AudioSys.songStart) / AudioSys.beatDur() : this.t * 2;
    Gfx.sprite('petra', 420, GROUND_Y - 16 - Math.abs(Math.sin(beat * Math.PI)) * 4, { anchor: 'bc', scale: 3, frame: Math.floor(beat) % 2 });
    Gfx.sprite('trex', 590, GROUND_Y + 40, { anchor: 'bc', scale: 2, frame: Math.floor(beat) % 2 });
    Gfx.text('THE PRINCESS IS SAVED!', 320, 16, { color: '#f6d743', align: 'center', scale: 3, outline: true });
    Gfx.text('The ONGA BONGA festival rocks on forever.', 320, 44, { color: '#f5a3c7', align: 'center', outline: true });
    const s = this.stats;
    Gfx.rectA(0, 250, W, 110, '#0b0710', 0.7);
    Gfx.text('THANKS FOR PLAYING', 320, 258, { color: '#ffffff', align: 'center', scale: 2 });
    Gfx.text(`Floors: ${Game.run.floor}   Dinos defeated: ${s.kills}   Perfect notes: ${s.perfects}/${s.notes}   Damage taken: ${s.damageTaken}`, 320, 280, { color: '#a89aa8', align: 'center' });
    Gfx.text(`Band: Onga, ${Game.run.band.map(b => b[0].toUpperCase() + b.slice(1)).join(', ')} & Petra   Relics: ${Game.run.relics.length}`, 320, 292, { color: '#a89aa8', align: 'center' });
    UI.button(250, 312, 140, 26, 'BACK TO TITLE', () => Game.go(new TitleScene()));
  }
}

// ---------------------------------------------------------------------- Overlays
class PauseOverlay {
  constructor(settingsOnly = false) { this.settingsOnly = settingsOnly; this.mode = settingsOnly ? 'settings' : 'menu'; this.confirm = false; }
  update(dt) { for (const k of Input.keys) if (k.code === 'Escape') { if (this.mode === 'settings' && !this.settingsOnly) this.mode = 'menu'; else Game.overlay = null; } }
  slider(x, y, w, label, val, min, max, step, fmt, onChange) {
    Gfx.text(label, x, y, { color: '#ece6dc' }); Gfx.text(fmt(val), x + w, y, { color: '#f6d743', align: 'right' });
    const sy = y + 11; Gfx.rect(x, sy, w, 8, '#16101c'); Gfx.rect(x + 1, sy + 1, Math.round((w - 2) * (val - min) / (max - min)), 6, '#c95c93');
    UI.hit(x, sy - 4, w, 16, () => { const k = clamp((Input.mx - x) / w, 0, 1); let v = min + k * (max - min); v = Math.round(v / step) * step; onChange(+v.toFixed(3)); });
    return sy + 16;
  }
  draw() {
    Gfx.rectA(0, 0, W, H, '#0b0710', 0.7);
    if (this.mode === 'menu') {
      Gfx.panel(230, 70, 180, 220, { title: 'PAUSED', fill: '#221a2a' });
      let y = 90;
      UI.button(250, y, 140, 24, 'RESUME', () => Game.overlay = null); y += 30;
      UI.button(250, y, 140, 24, 'SETTINGS', () => this.mode = 'settings'); y += 30;
      UI.button(250, y, 140, 24, 'HOW TO PLAY', () => Game.overlay = new HowToOverlay(() => Game.overlay = new PauseOverlay())); y += 30;
      if (Game.run) { UI.button(250, y, 140, 24, 'VIEW DECK', () => Game.overlay = new DeckOverlay(Game.run.deck, 'YOUR DECK', { allowClose: true, onClose: () => Game.overlay = new PauseOverlay() })); y += 30; }
      if (!this.confirm) UI.button(250, y, 140, 24, 'ABANDON RUN', () => this.confirm = true, { color: '#ff6b6b' });
      else { Gfx.text('Really quit? Progress is lost.', 320, y - 10, { color: '#ff6b6b', align: 'center' }); UI.button(250, y + 2, 66, 22, 'YES', () => { Game.clearSave(); Game.run = null; Game.overlay = null; Game.go(new TitleScene()); }, { color: '#ff6b6b' }); UI.button(324, y + 2, 66, 22, 'NO', () => this.confirm = false); }
      y += 30;
      Gfx.text('Esc to resume', 320, y + 4, { color: '#a89aa8', align: 'center' });
    } else {
      Gfx.panel(180, 40, 280, 280, { title: 'SETTINGS', fill: '#221a2a' });
      let y = 60; const x = 200, w = 240;
      y = this.slider(x, y, w, 'Music volume', Settings.music, 0, 1, 0.05, v => Math.round(v * 100) + '%', v => { Settings.music = v; AudioSys.setMusicVolume(v); Game.saveSettings(); }) + 6;
      y = this.slider(x, y, w, 'SFX volume', Settings.sfx, 0, 1, 0.05, v => Math.round(v * 100) + '%', v => { Settings.sfx = v; AudioSys.setSfxVolume(v); Game.saveSettings(); AudioSys.sfx('perfect'); }) + 6;
      y = this.slider(x, y, w, 'Note speed (travel time)', Settings.noteSpeed, 0.8, 2.2, 0.1, v => v.toFixed(1) + 's', v => { Settings.noteSpeed = v; Game.saveSettings(); }) + 6;
      y = this.slider(x, y, w, 'Timing offset', Settings.offset, -0.15, 0.15, 0.005, v => Math.round(v * 1000) + 'ms', v => { Settings.offset = v; Game.saveSettings(); }) + 6;
      Gfx.text('Hit windows', x, y, { color: '#ece6dc' });
      for (const [i, d] of ['easy', 'normal', 'hard'].entries()) UI.button(x + i * 82, y + 10, 76, 20, d.toUpperCase(), () => { Settings.difficulty = d; Game.saveSettings(); }, { fill: Settings.difficulty === d ? '#c95c93' : undefined, border: Settings.difficulty === d ? '#fff' : undefined });
      y += 40;
      Gfx.textWrap('Notes feel late? Lower the offset. Early? Raise it. Wider windows make riffs forgiving.', x, y, w, { color: '#a89aa8', lineHeight: 9 });
      UI.button(260, 290, 120, 22, 'BACK', () => { if (this.settingsOnly) Game.overlay = null; else this.mode = 'menu'; });
    }
  }
}

class HowToOverlay {
  constructor(onClose) { this.page = 0; this.onClose = onClose; }
  update(dt) { for (const k of Input.keys) if (k.code === 'Escape') this.close(); }
  close() { Game.overlay = null; if (this.onClose) this.onClose(); }
  draw() {
    Gfx.rectA(0, 0, W, H, '#0b0710', 0.8);
    Gfx.panel(60, 30, 520, 300, { title: 'HOW TO PLAY', fill: '#221a2a' });
    const pages = [
      ['{y}THE QUEST{/}', 'King Rex kidnapped Princess Petra and scattered your band. Climb three acts of the map, defeat the bosses, free your bandmates and save the princess.', '',
        '{y}THE MAP{/}', 'Pick a path node by node like in Slay the Spire: {r}combat{/}, {o}elites{/} (relics!), {c}mystery events{/}, {g}rest sites{/}, {y}shops{/} and {y}treasure{/}. Each act ends in a boss fight.'],
      ['{y}COMBAT{/}', 'You have {c}3 Energy{/} each turn and draw 5 cards. Cards cost energy. {b}Block{/} absorbs damage until your next turn. Enemies show their intent above their head: claws mean an attack for the number shown.', '',
        '{y}RIFFS{/}', 'Attack cards marked ♪ start a rhythm solo. Notes fall down four lanes toward the bone bar. Press {g}D{/} {r}F{/} {y}J{/} {b}K{/} (or arrow keys, or click the lane) when a note reaches the bar. {y}PERFECT{/} = 1.5x damage, GOOD = 1x, MISS = nothing.'],
      ['{y}HYPE & ENCORE{/}', 'Every hit note and every rally card fills your {p}HYPE{/} meter. At 100 Hype, press {p}SPACE{/} or the ENCORE button for a free epic solo that hits ALL enemies for every note you land.', '',
        '{y}THE BAND{/}', 'Rescued bandmates fight beside you: Bonga drums on a random enemy each turn, Ugg grants Block, Zog widens your hit windows and heals you. Rallying tribes at events gives permanent starting Hype.', '',
        '{y}RELICS{/}', 'Passive treasures found at elites, bosses, shops and events, like the mighty T-Rex Head.'],
    ];
    let y = 48;
    for (const line of pages[this.page]) { if (!line) { y += 6; continue; } y += Gfx.textWrap(line, 76, y, 488, { lineHeight: 10 }) * 10; }
    UI.button(90, 300, 80, 22, 'PREV', () => this.page = Math.max(0, this.page - 1), { disabled: this.page === 0 });
    UI.button(470, 300, 80, 22, 'NEXT', () => this.page = Math.min(pages.length - 1, this.page + 1), { disabled: this.page === pages.length - 1 });
    UI.button(280, 300, 80, 22, 'CLOSE', () => this.close());
    Gfx.text(`${this.page + 1}/${pages.length}`, 320, 290, { color: '#a89aa8', align: 'center' });
  }
}

class DeckOverlay {
  constructor(cards, title, o = {}) { this.cards = cards; this.title = title; this.o = o; this.scroll = 0; }
  update(dt) { this.scroll = clamp(this.scroll + Input.wheel * 40, 0, Math.max(0, Math.ceil(this.cards.length / 6) * 118 - 270)); for (const k of Input.keys) if (k.code === 'Escape') this.close(); }
  close() { Game.overlay = null; if (this.o.onClose) this.o.onClose(); }
  draw() {
    Gfx.rectA(0, 0, W, H, '#0b0710', 0.85);
    Gfx.text(this.title, 320, 8, { color: '#f6d743', align: 'center', scale: 2 });
    Gfx.text(`${this.cards.length} cards${this.o.onPick ? '  -  click a card to choose' : ''}`, 320, 26, { color: '#a89aa8', align: 'center' });
    const ctx = Gfx.ctx; ctx.save(); ctx.beginPath(); ctx.rect(0, 40, W, 280); ctx.clip();
    const sorted = this.cards.slice().sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
    let zoom = null;
    for (let i = 0; i < sorted.length; i++) {
      const c = sorted[i]; const x = 50 + (i % 6) * 90, y = 44 + Math.floor(i / 6) * 118 - this.scroll;
      if (y > H || y + CARD_H < 40) continue;
      const hov = UI.hovered(x, Math.max(40, y), CARD_W, Math.min(CARD_H, 320 - y));
      Cards.draw(c, x, y, { hover: hov && !!this.o.onPick });
      if (hov) zoom = { c, x: x + CARD_W / 2, y: y + CARD_H / 2 };
      if (this.o.onPick) UI.hit(x, y, CARD_W, CARD_H, () => this.o.onPick(c));
    }
    ctx.restore();
    if (zoom) Cards.zoom(zoom.c, zoom.x + 80, zoom.y);
    if (this.o.allowClose !== false) UI.button(280, 326, 80, 22, 'CLOSE', () => this.close());
    if (this.cards.length > 12) Gfx.text('scroll with the wheel', 560, 330, { color: '#a89aa8', align: 'center' });
  }
}
