// ---------------------------------------------------------------------------
// main.js - run state, routing between the village and everything else,
//           save/load, and the frame loop
// ---------------------------------------------------------------------------
'use strict';

const Settings = { music: 0.8, sfx: 0.9, noteSpeed: 1.15, difficulty: 'normal', offset: 0, shake: true };
const SAVE_KEY = 'ongabonga_v2_save', SET_KEY = 'ongabonga_v2_settings';

const Game = {
  scene: null, overlay: null, run: null, last: 0, t: 0, mini: null, worldToScreen: null,
  init() {
    Gfx.init(); Input.init(Gfx.canvas);
    this.loadSettings();
    this.go(new BootScene());
    requestAnimationFrame(ts => this.loop(ts));
  },
  // swap scenes behind a wipe
  goWith(kind, factory, hold) { Transition.start(kind, () => this.go(factory()), hold); },
  go(scene) {
    if (this.scene && this.scene.exit) this.scene.exit();
    UI.locked = false; this.overlay = null; this.mini = null;
    Co.clear(); Tweens.clear(); Particles.clear(); Popups.clear(); FX.clear(); Emotes.clear(); Floaters.clear();
    Juice.reset(); Dialogue.clear();
    this.scene = scene;
    if (scene.enter) scene.enter();
  },
  pause() { if (!this.overlay) { this.overlay = new PauseOverlay(); AudioSys.sfx('pause'); } },
  loadSettings() { try { const s = JSON.parse(localStorage.getItem(SET_KEY)); if (s) Object.assign(Settings, s); } catch (e) { } AudioSys.settings.music = Settings.music; AudioSys.settings.sfx = Settings.sfx; },
  saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(Settings)); } catch (e) { } },
  // --------------------------------------------------------------------- run
  newRun() {
    const seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
    const deck = ['power_chord', 'power_chord', 'power_chord', 'power_chord', 'power_chord',
      'stone_wall', 'stone_wall', 'stone_wall', 'stone_wall', 'crowd_surf'].map(id => Cards.make(id));
    this.run = {
      seed, hp: 76, maxHp: 76, stamina: 100, maxStamina: 100, gold: 40,
      deck, relics: ['bone_pick'], band: [], act: 1, fights: 0, startHype: 0,
      zone: null, pos: null, seenEvents: [], seenFights: [],
      bait: 0, baitNeed: 3, riffsPlayed: 0,
      stats: { kills: 0, notes: 0, sick: 0, taken: 0 },
    };
    this.go(new CutsceneScene(introScript, { onSkip: () => this.startVillage() }));
  },
  startVillage() { this.run.zone = null; this.run.pos = null; this.goWith('iris', () => new VillageScene(this.run.act)); },
  hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },
  save() {
    const r = this.run; if (!r) return;
    const data = {
      seed: r.seed, hp: r.hp, maxHp: r.maxHp, stamina: r.stamina, maxStamina: r.maxStamina,
      gold: r.gold, relics: r.relics, band: r.band, act: r.act, fights: r.fights,
      startHype: r.startHype, seenEvents: r.seenEvents, stats: r.stats, pos: r.pos,
      bait: r.bait, baitNeed: r.baitNeed, riffsPlayed: r.riffsPlayed,
      deck: r.deck.map(c => Cards.toSave(c)),
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { }
  },
  continueRun() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY)); if (!d) return this.newRun();
      d.deck = d.deck.map(s => Cards.fromSave(s));
      d.zone = null;
      this.run = d;
      this.go(new VillageScene(d.act));
    } catch (e) { console.error(e); this.newRun(); }
  },
  clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } },
  // ------------------------------------------------------------------ routing
  enterBattle(prowler, act) {
    const r = this.run; r.fights++;
    const rng = new RNG(r.seed + r.fights * 7 + act * 101);
    const kind = prowler.elite ? 'elite' : (prowler.kind === 'compy' || prowler.kind === 'dodo') ? 'easy' : 'normal';
    let ids;
    if (prowler.elite) ids = Enemies.encounter(act, 'elite', rng);
    else {
      ids = Enemies.encounter(act, kind, rng, r.seenFights);
      if (!ids.includes(prowler.kind)) ids = [prowler.kind].concat(ids.slice(0, 1));
      r.seenFights.push(ids.join(',')); if (r.seenFights.length > 4) r.seenFights.shift();
    }
    this.pendingProwler = prowler;
    this.save();
    this.goWith('claw', () => new Combat(ids, { kind: prowler.elite ? 'elite' : 'normal', act }), 0.18);
  },
  enterFight(ids, kind) { this.run.fights++; this.goWith('claw', () => new Combat(ids, { kind: kind || 'normal', act: this.run.act }), 0.18); },
  enterBoss() { this.run.fights++; this.pendingProwler = null; this.bossFight = true; this.save(); this.goWith('claw', () => new Combat(['blaze'], { kind: 'boss', act: this.run.act }), 0.3); },
  enterEvent() { this.goWith('iris', () => new FogEvent()); },
  leaveEvent() { this.goWith('iris', () => new VillageScene(this.run.act)); },
  openShop() { this.goWith('slats', () => new MammothShop()); },
  leaveShop() { this.goWith('slats', () => new VillageScene(this.run.act)); },
  combatWon(c) {
    const r = this.run;
    const rng = new RNG(r.seed + r.fights * 991);
    const cards = Cards.randomReward(rng, 3);
    let relics = [];
    if (c.kind === 'elite') { const x = Relics.randomReward(rng, ['common', 'uncommon', 'uncommon', 'rare']); if (x) relics = [x]; }
    if (c.kind === 'boss') { const ex = []; for (let i = 0; i < 2; i++) { const x = Relics.randomReward(rng, ['rare', 'boss', 'uncommon'], ex); if (x) { relics.push(x); ex.push(x); } } }
    // the beast that chased you in the village is gone for good, and its
    // carcass is one of the three you need to draw the raptor out
    if (this.pendingProwler) {
      this.pendingProwler.dead = true; this.pendingProwler = null;
      if (r.bait < r.baitNeed) r.bait++;
    }
    this.goWith('slats', () => new RewardScene({ gold: c.goldEarned, cards, relics, kind: c.kind }));
  },
  afterReward(o) {
    const r = this.run;
    if (o.kind !== 'boss') { this.save(); this.goWith('slats', () => new VillageScene(r.act)); return; }
    r.hp = Math.min(r.maxHp, r.hp + Math.round(r.maxHp * 0.3));
    r.stamina = r.maxStamina;
    if (r.act === 1) { r.band.push('pebble'); r.deck.push(Cards.make('drum_solo')); this.go(new ActStory(2, () => this.nextAct(2))); }
    else if (r.act === 2) { r.band.push('roxy'); r.deck.push(Cards.make('flute_lullaby')); this.go(new ActStory(3, () => this.nextAct(3))); }
    else { r.band.push('vela'); this.go(new EndingScene()); }
  },
  nextAct(act) {
    const r = this.run;
    r.act = act; r.zone = null; r.pos = null; r.seenFights = [];
    this.save();
    this.goWith('iris', () => new VillageScene(act));
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
      const ctx = Gfx.ctx;
      UI.begin();
      UI.locked = !!this.overlay;
      ctx.save();
      ctx.translate(Math.round(Juice.shakeX), Math.round(Juice.shakeY));
      Gfx.clear();
      this.scene.draw();
      ctx.restore();
      Juice.drawOverlay(ctx);
      Transition.draw(ctx);
      if (this.overlay) { UI.locked = false; this.overlay.draw(); }
      UI.drawTips();
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
