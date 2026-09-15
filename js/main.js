// ---------------------------------------------------------------------------
// main.js - game state, run management, node routing, save/load, main loop
// ---------------------------------------------------------------------------
'use strict';

const Settings = { music: 0.8, sfx: 0.9, noteSpeed: 1.3, difficulty: 'normal', offset: 0 };
const SAVE_KEY = 'ongabonga_save_v1', SETTINGS_KEY = 'ongabonga_settings_v1';

const Game = {
  scene: null, overlay: null, run: null, last: 0, t: 0,
  init() {
    Gfx.init(); Input.init(Gfx.canvas);
    this.loadSettings();
    this.go(new BootScene());
    requestAnimationFrame(ts => this.loop(ts));
  },
  go(scene) { if (this.scene && this.scene.exit) this.scene.exit(); UI.locked = false; this.overlay = null; this.scene = scene; if (scene.enter) scene.enter(); },
  pause() { if (!this.overlay) this.overlay = new PauseOverlay(); },
  // ------------------------------------------------------------- settings
  loadSettings() { try { const s = JSON.parse(localStorage.getItem(SETTINGS_KEY)); if (s) Object.assign(Settings, s); } catch (e) { } AudioSys.settings.music = Settings.music; AudioSys.settings.sfx = Settings.sfx; },
  saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(Settings)); } catch (e) { } },
  // ------------------------------------------------------------- run
  newRun() {
    const seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
    const deck = ['power_chord', 'power_chord', 'power_chord', 'power_chord', 'power_chord', 'stone_wall', 'stone_wall', 'stone_wall', 'stone_wall', 'crowd_surf'].map(id => Cards.make(id));
    this.run = { seed, hp: 70, maxHp: 70, gold: 50, deck, relics: ['bone_pick'], band: [], act: 1, floor: 0, startHype: 0, map: MapGen.generate(1, seed), stats: { kills: 0, notes: 0, perfects: 0, damageTaken: 0 }, seenEvents: [], seenEncounters: [] };
    this.go(new StoryScene(STORY.intro, () => this.go(new MapScene()), { music: 'title', skippable: true }));
  },
  hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },
  save() {
    if (!this.run) return;
    const r = this.run; const data = Object.assign({}, r, { deck: r.deck.map(c => Cards.toSave(c)) });
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { }
  },
  continueRun() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY)); if (!d) return this.newRun();
      d.deck = d.deck.map(s => Cards.fromSave(s)); this.run = d;
      this.go(new MapScene());
    } catch (e) { console.error(e); this.newRun(); }
  },
  clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } },
  // ------------------------------------------------------------- nodes
  enterNode(node) {
    const run = this.run; const map = run.map;
    node.visited = true; map.current = node.id; run.floor++;
    const rng = new RNG(run.seed + run.floor * 7 + run.act * 101);
    switch (node.type) {
      case 'combat': { const kind = node.row <= 1 ? 'easy' : 'normal'; const enc = Enemies.encounter(run.act, kind, rng, run.seenEncounters); run.seenEncounters.push(enc.join(',')); if (run.seenEncounters.length > 4) run.seenEncounters.shift(); this.go(new Combat(enc, { kind: 'normal' })); break; }
      case 'elite': { const enc = Enemies.encounter(run.act, 'elite', rng); this.go(new Combat(enc, { kind: 'elite' })); break; }
      case 'boss': { const enc = Enemies.encounter(run.act, 'boss', rng); this.go(new Combat(enc, { kind: 'boss' })); break; }
      case 'event': {
        const pool = Object.keys(EVENTS).filter(id => EVENTS[id].acts.includes(run.act) && !run.seenEvents.includes(id));
        const id = pool.length ? rng.pick(pool) : rng.pick(Object.keys(EVENTS).filter(k => EVENTS[k].acts.includes(run.act)));
        run.seenEvents.push(id); this.go(new EventScene(id)); break; }
      case 'rest': this.go(new RestScene()); break;
      case 'shop': this.go(new ShopScene()); break;
      case 'treasure': this.go(new TreasureScene()); break;
    }
    this.save();
  },
  afterNode() { this.save(); this.go(new MapScene()); },
  combatWon(c) {
    const run = this.run; const rng = new RNG(run.seed + run.floor * 991);
    const gold = c.goldEarned || 0;
    const n = 3 + Relics.mod('rewardChoices');
    const cards = Cards.randomReward(rng, n);
    let relics = [];
    if (c.kind === 'elite') { const r = Relics.randomReward(rng, ['common', 'uncommon', 'uncommon', 'rare']); if (r) relics = [r]; }
    if (c.kind === 'boss') { const ex = []; for (let i = 0; i < 3; i++) { const r = Relics.randomReward(rng, ['boss', 'boss', 'rare'], ex); if (r) { relics.push(r); ex.push(r); } } }
    this.go(new RewardScene({ gold, cards, relics, kind: c.kind }));
  },
  afterReward(o) {
    const run = this.run;
    if (o.kind !== 'boss') { this.afterNode(); return; }
    // act transition
    run.hp = Math.min(run.maxHp, run.hp + Math.round(run.maxHp * 0.25));
    if (run.act === 1) {
      run.band.push('bonga'); run.deck.push(Cards.make('drum_solo'));
      this.go(new StoryScene(STORY.act1_clear, () => this.startAct(2), { music: 'victory' }));
    } else if (run.act === 2) {
      run.band.push('ugg'); run.deck.push(Cards.make('bass_drop'));
      this.go(new StoryScene(STORY.act2_clear, () => this.startAct(3), { music: 'victory' }));
    } else {
      this.go(new StoryScene(STORY.ending, () => this.go(new EndingScene()), { music: 'victory' }));
    }
  },
  startAct(act) {
    const run = this.run; run.act = act; run.map = MapGen.generate(act, run.seed); run.seenEncounters = [];
    if (act === 3) { run.band.push('zog'); run.deck.push(Cards.make('flute_lullaby')); this.save(); this.go(new StoryScene(STORY.act3_start, () => this.go(new MapScene()), { music: 'map' })); return; }
    this.save(); this.go(new MapScene());
  },
  // ------------------------------------------------------------- shared HUD
  drawRunBar(scene) {
    const run = this.run; if (!run) return;
    Gfx.rectA(0, 0, W, 22, '#16101c', 0.8);
    Gfx.sprite('heart', 6, 6, { scale: 1 }); Gfx.bar(16, 6, 90, 9, run.hp / run.maxHp, '#d83a3a');
    Gfx.text(`${run.hp}/${run.maxHp}`, 61, 7, { color: '#fff', align: 'center', outline: true });
    Gfx.sprite('coin', 116, 6, { scale: 1 }); Gfx.text(String(run.gold), 127, 7, { color: '#f6d743' });
    let rx = 170; for (const id of run.relics) { Relics.drawIcon(id, rx, 5, 1); rx += 15; }
    if (run.startHype) { Gfx.sprite('st_hype', 500, 6, { scale: 1 }); Gfx.text(`+${run.startHype}`, 510, 7, { color: '#f5a3c7' }); if (UI.hovered(498, 4, 30, 14)) UI.tooltip(440, 24, ['Rallied Folk', `You start every combat with ${run.startHype} Hype.`]); }
    UI.button(540, 3, 44, 16, 'DECK', () => this.overlay = new DeckOverlay(run.deck, 'YOUR DECK', { allowClose: true }));
    Gfx.text(`F${run.floor}`, 600, 7, { color: '#a89aa8' });
    UI.iconButton(618, 3, 18, 16, 'intent_unknown', () => this.pause(), { tip: 'Menu (Esc)' });
  },
  // ------------------------------------------------------------- loop
  loop(ts) {
    requestAnimationFrame(t => this.loop(t));
    let dt = (ts - this.last) / 1000; this.last = ts; if (dt > 0.1) dt = 0.1; if (dt < 0) dt = 0;
    this.t += dt;
    try {
      // update
      if (this.overlay) { this.overlay.update(dt); }
      else { Co.update(dt); Particles.update(dt); Popups.update(dt); Shake.update(dt); Flash.update(dt); this.scene.update(dt); }
      // draw
      const ctx = Gfx.ctx; UI.begin();
      ctx.save(); ctx.translate(Math.round(Shake.x), Math.round(Shake.y));
      Gfx.clear();
      UI.locked = !!this.overlay;
      this.scene.draw();
      Particles.draw(ctx); Popups.draw(); Flash.draw(ctx);
      ctx.restore();
      if (this.overlay) { UI.locked = false; this.overlay.draw(); }
      UI.drawTips();
      Gfx.canvas.style.cursor = UI.hoverAny ? 'pointer' : 'default';
      // clicks (after draw so UI items are current)
      for (const c of Input.clicks) {
        if (!UI.click(c.x, c.y, c.button)) { if (!this.overlay && this.scene.click) this.scene.click(c.x, c.y, c.button); }
        else if (c.button !== 2) AudioSys.sfx('click');
      }
    } catch (e) { console.error(e); }
    Input.flush();
  }
};

window.addEventListener('load', () => Game.init());
