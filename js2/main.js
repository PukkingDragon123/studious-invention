// ---------------------------------------------------------------------------
// main.js - run state, routing between the board and everything else,
//           save/load, and the frame loop
// ---------------------------------------------------------------------------
'use strict';

const Settings = { music: 0.8, sfx: 0.9, noteSpeed: 1.15, difficulty: 'normal', offset: 0, shake: true, lighting: true };
const SAVE_KEY = 'ongabonga_v3_save', SET_KEY = 'ongabonga_v2_settings';

const Game = {
  scene: null, overlay: null, run: null, last: 0, t: 0, worldToScreen: null,
  init() {
    Gfx.init(); Input.init(Gfx.canvas);
    this.loadSettings();
    if (Settings.lighting !== false) Post.enable();
    this.go(new BootScene());
    requestAnimationFrame(ts => this.loop(ts));
  },
  // swap scenes behind a wipe
  goWith(kind, factory, hold) { Transition.start(kind, () => this.go(factory()), hold); },
  go(scene) {
    if (this.scene && this.scene.exit) this.scene.exit();
    UI.locked = false; this.overlay = null;
    Co.clear(); Tweens.clear(); Particles.clear(); Popups.clear(); FX.clear(); Emotes.clear(); Floaters.clear();
    Juice.reset(); Dialogue.clear();
    this.scene = scene;
    if (scene.enter) scene.enter();
  },
  pause() { if (!this.overlay) { this.overlay = new PauseOverlay(); AudioSys.sfx('pause'); } },
  loadSettings() { try { const s = JSON.parse(localStorage.getItem(SET_KEY)); if (s) Object.assign(Settings, s); } catch (e) { } AudioSys.settings.music = Settings.music; AudioSys.settings.sfx = Settings.sfx; },
  saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(Settings)); } catch (e) { } },
  // --------------------------------------------------------------------- run
  // A new story starts at the hero select; picking one starts the run.
  newRun(hero) {
    if (!hero) { this.goWith('iris', () => new HeroSelectScene()); return; }
    const H = Heroes.get(hero);
    const seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
    this.run = {
      seed, hero, hp: H.hp, maxHp: H.hp, gems: 2,
      deck: H.deck.map(id => Cards.make(id)), relics: [H.relic], band: [],
      fights: 0, riffsPlayed: 0, seenEvents: [], seenFights: [], tips: {},
      stats: { kills: 0, notes: 0, sick: 0, taken: 0, rolls: 0 },
      board: this.freshBoard(1),
    };
    this.go(new CutsceneScene(introScript, { onSkip: () => this.startBoard() }));
  },
  freshBoard(b, carry = {}) { return { biome: b, pos: null, used: {}, revealed: {}, wet: {}, touched: {}, charms: carry.charms || [], round: 0 }; },
  startBoard() { this.save(); this.goWith('iris', () => new BoardScene()); },
  toBoard(kind = 'slats') { this.save(); this.goWith(kind, () => new BoardScene()); },
  hasSave() { try { const d = JSON.parse(localStorage.getItem(SAVE_KEY)); return !!(d && d.hero && d.board); } catch (e) { return false; } },
  save() {
    const r = this.run; if (!r) return;
    const data = Object.assign({}, r, { deck: r.deck.map(c => Cards.toSave(c)) });
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { }
  },
  continueRun() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!d || !d.hero || !d.board) return this.newRun();
      d.deck = d.deck.map(s => Cards.fromSave(s));
      d.tips = d.tips || {}; d.band = d.band || []; d.seenFights = d.seenFights || [];
      this.run = d;
      this.go(new BoardScene());
    } catch (e) { console.error(e); this.newRun(); }
  },
  clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } },
  // ------------------------------------------------------------------ routing
  enterFight(ids, kind, o = {}) {
    this.run.fights++;
    this.goWith('claw', () => new Combat(ids, Object.assign({ kind: kind || 'normal', act: this.run.board.biome }, o)), 0.18);
  },
  combatWon(c) {
    const r = this.run, bd = r.board, win = bd.win || {};
    const rng = new RNG(r.seed + r.fights * 991);
    const cards = Cards.randomReward(rng, 3, [], r.hero, c.kind === 'elite' ? 0.12 : c.kind === 'boss' ? 0.3 : 0);
    let relics = [];
    if (c.kind === 'boss') { const ex = []; for (let i = 0; i < 2; i++) { const x = Relics.randomReward(rng, i ? ['rare'] : ['boss'], ex); if (x) { relics.push(x); ex.push(x); } } }
    else if (c.kind === 'elite' || win.relicWin) { const x = Relics.randomReward(rng, win.relicWin || ['common', 'uncommon', 'uncommon', 'rare']); if (x) relics = [x]; }
    if (win.roam != null) { const d = (bd.dinos || []).find(d => d.n === win.roam); if (d) d.alive = false; }
    if (win.dino != null) bd.used[win.dino] = 1;
    if (win.boss) bd.bossDown = true;
    const gems = (c.gemsEarned || 0) + (win.bonusGems || 0) + (c.kind === 'normal' ? 1 : 0);
    bd.win = null;
    this.save();
    this.goWith('slats', () => new RewardScene({ gems, cards, relics, kind: c.kind, boss: c.kind === 'boss' ? BIOMES[bd.biome].boss.name : null }));
  },
  afterReward(o) {
    const r = this.run;
    if (o.kind !== 'boss') { this.toBoard(); return; }
    // a land is won: whoever the boss was holding comes home
    const b = r.board.biome, B = BIOMES[b];
    r.hp = Math.min(r.maxHp, r.hp + Math.round(r.maxHp * 0.3));
    const caps = Heroes.captives(r.hero);
    let freed = null;
    if (B.boss.final) { for (const id of caps) if (!r.band.includes(id)) r.band.push(id); this.save(); this.go(new EndingScene()); return; }
    if (B.boss.rescue) { freed = caps.find(id => !r.band.includes(id)) || null; if (freed) r.band.push(freed); }
    this.save();
    this.go(new ActStory(b, freed, () => this.nextBiome(b + 1)));
  },
  nextBiome(b) {
    const r = this.run;
    r.board = this.freshBoard(b, { charms: r.board.charms });
    r.seenFights = [];
    this.save();
    this.goWith('iris', () => new BoardScene());
  },
  // -------------------------------------------------------------------- loop
  loop(ts) {
    requestAnimationFrame(t => this.loop(t));
    let dt = (ts - this.last) / 1000; this.last = ts;
    if (!(dt > 0)) dt = 0.016;
    dt = Math.min(dt, 0.05);
    Time.dt = dt; Time.t += dt; Time.frame++;
    this.t += dt;
    try {
      // hit-stop freezes the world but not the interface
      const frozen = Juice.hitstop > 0;
      if (frozen) Juice.hitstop -= dt;
      const sdt = frozen ? 0 : dt;
      Juice.update(dt);
      Transition.update(dt);
      if (this.overlay) { this.overlay.update(dt); }
      else if (Transition.phase === 'out' || Transition.phase === 'hold') { this.scene.update(0); }
      else {
        Time.dt = sdt;
        Co.update(sdt); Tweens.update(sdt);
        Particles.update(sdt); Popups.update(sdt); FX.update(sdt); Emotes.update(sdt); Floaters.update(sdt);
        this.scene.update(sdt);
        Time.dt = dt;
      }
      // the world goes to the game canvas; everything after the scene says it
      // is done with the world goes on the interface layer, over the lighting
      Post.begin();
      const ctx = Gfx.ctx;
      UI.begin();
      UI.locked = !!this.overlay;
      ctx.save();
      ctx.translate(Math.round(Juice.shakeX), Math.round(Juice.shakeY));
      Gfx.clear();
      this.scene.draw();
      ctx.restore();
      Post.ui();
      Juice.drawOverlay(Gfx.ctx);
      Transition.draw(Gfx.ctx);
      if (this.overlay) { UI.locked = false; this.overlay.draw(); }
      UI.drawTips();
      Post.end();
      Gfx.canvas.style.cursor = Input.touch ? 'none' : (UI.hoverAny ? 'pointer' : 'default');
      if (Input.clicks.length) AudioSys.resume();
      for (const c of Input.clicks) {
        if (!UI.click(c.x, c.y, c.button)) { if (!this.overlay && this.scene.click) this.scene.click(c.x, c.y, c.button); }
        else if (c.button !== 2) AudioSys.sfx('click');
      }
    } catch (e) {
      if (!this._errored) { console.error(e); this._errored = true; }
      else if (this.t - (this._lastErr || 0) > 2) { console.error(e); this._lastErr = this.t; }
    }
    Input.flush();
  }
};

window.addEventListener('load', () => Game.init());
