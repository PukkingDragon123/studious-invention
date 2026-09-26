// ---------------------------------------------------------------------------
// board.js - the journey, as a board game.
//
// Roll the bone. Every tile you could reach in exactly that many steps, on
// or back, lights up; pick one and walk there. Forks split the road, side
// trails climb to caves and dead ends, and the ground you cross this round
// is remembered, because half your cards and artifacts care whether your
// feet are wet. Then the beasts that roam the road take their turn.
//
// The scene owns a small API that the tiles and events in tiles.js call:
// heal, hurt, gems, charms, card and relic offers, panels, fights, movement.
// Everything that has to survive a fight lives in Game.run.board.
// ---------------------------------------------------------------------------
'use strict';

const TILE_PAINT = {
  reward: { ring: '#3fa0c8', fill: '#18506a', lit: '#9ae4ff' },
  danger: { ring: '#e0404a', fill: '#5c1420', lit: '#ffb0a8' },
  fight: { ring: '#ff7a2a', fill: '#6a2410', lit: '#ffd08a' },
  mystery: { ring: '#b177e6', fill: '#3a1a5c', lit: '#e8c8ff' },
  service: { ring: '#e0b93a', fill: '#5c4210', lit: '#ffe98a' },
  move: { ring: '#6cc95c', fill: '#1d4a26', lit: '#c8f8a8' },
  boss: { ring: '#ff3a4a', fill: '#3f0e18', lit: '#ffe98a' },
  home: { ring: '#d8a86b', fill: '#3a2415', lit: '#ffe0b0' },
};
const KIND_PAINT = {
  berries: 'reward', meat: 'reward', gem: 'reward', card: 'reward', charm: 'reward', totem: 'reward',
  trap: 'danger', rocks: 'danger', tar: 'danger',
  battle: 'fight', dino: 'fight',
  event: 'mystery', npc: 'mystery', choice: 'mystery', cave: 'mystery', secret: 'mystery',
  camp: 'service', trader: 'service', altar: 'service',
  vine: 'move', geyser: 'move', boss: 'boss', start: 'home',
};

// The board is seen close, at the same pixel size as the home: the sky and
// the far country across the top, the road through the middle, and the near
// edge of the world going by in front.
const BZ = 2, BCAM_Y = 234;

class BoardScene {
  constructor(o = {}) {
    this.run = Game.run; this.bd = this.run.board;
    this.hero = Heroes.get(this.run.hero);
    this.board = Board.generate(this.run.seed, this.bd.biome);
    this.B = this.board.B;
    this.T = this.board.tiles;
    BoardBake.setup(this.board);
    this.rng = new RNG((this.run.seed ^ (this.bd.round * 7919 + this.bd.biome * 104729 + (this.run.fights || 0) * 131)) >>> 0);
    if (this.bd.pos == null) this.bd.pos = this.board.start;
    this.bd.used = this.bd.used || {}; this.bd.revealed = this.bd.revealed || {}; this.bd.wet = this.bd.wet || {};
    this.bd.touched = this.bd.touched || {}; this.bd.charms = this.bd.charms || [];
    if (!this.bd.dinos) this.bd.dinos = this.board.roam.map(d => ({ kind: d.kind, tile: d.tile, n: d.n, alive: true, sleep: 0 }));
    const p = this.T[this.bd.pos];
    this.me = new Actor({ base: this.hero.base, x: p.x, y: p.y + 2, scale: 1, facing: 1 });
    this.band = (this.run.band || []).map((id, i) => ({ id, a: new Actor({ base: Heroes.get(id).base, x: p.x - 30 - i * 24, y: p.y + 6, scale: 1 }) }));
    this.dinoActors = this.bd.dinos.map(d => {
      const t = this.T[d.tile], def = ENEMIES[d.kind];
      return { d, a: new Actor({ base: def ? def.base : 'raptor', x: t.x + 4, y: t.y + 2, scale: 1, facing: -1 }) };
    });
    this.cam = new Camera(); this.cam.zoom = this.cam.tzoom = BZ; this.cam.rate = 4.5;
    this.cam.setBounds(0, 0, this.board.w, BOARD_H);
    this.cam.lookAt(p.x + 110, BCAM_Y, true);
    this.die = new Dice3D.Die(0, 0, 25); this.die2 = null;
    this.dieShow = 0;
    this.phase = 'idle'; this.moves = 0; this.reach = new Map(); this.hoverT = null; this.dir = 1;
    this.panel = null; this.riff = null; this.t = 0; this.pan = 0; this.leaving = false;
    this.pending = null;      // a 'before' charm armed for the next roll
    this.adjusted = false;    // the hero's one tweak to this roll
    this.banner = null; this.toasts = [];
    this.o = o;
  }
  // ---------------------------------------------------------------- scene
  enter() {
    AudioSys.play(this.B.music, { fade: 0.9 });
    Game.worldToScreen = (x, y) => this.cam.toScreen(x, y);
    const L = this.cam.x - W / (2 * BZ) - 60, R = this.cam.x + W / (2 * BZ) + 60;
    BoardBake.now(L, R);
    const bd = this.bd;
    if (!bd.arrived) {
      bd.arrived = true;
      this.co = Co.run(this.arrive(), this);
    } else if (bd.resume === 'world') {
      this.co = Co.run(this.afterFight(), this);
    } else {
      bd.resume = null;
      this.settle();
    }
  }
  exit() { Game.worldToScreen = null; Dialogue.clear(); }
  settle() { this.phase = 'idle'; this.panel = null; Game.save(); this.coachMaybe(); }
  // the first sight of a land: its name, and a look down the road at the lair
  *arrive() {
    this.phase = 'busy';
    const boss = this.T[this.board.boss];
    this.banner = { title: this.B.name, sub: this.B.sub, t: 0, life: 3.6 };
    AudioSys.sfx('unlock');
    yield 1.1;
    this.cam.rate = 1.3; this.cam.lookAt(boss.x - 60, BCAM_Y);
    yield 2.2;
    this.toast(`${this.B.boss.name} WAITS AT THE END`, '#ff7a6a');
    yield 1.1;
    this.cam.rate = 3; this.cam.lookAt(this.me.x + 90, BCAM_Y);
    yield 1.2;
    this.cam.rate = 4.5;
    if (this.bd.biome === 1 && !this.run.tips.board) yield* this.say(this.hero.name, pick([
      "Hang on, everybody. I'm coming.",
      'Right. Grandma Rex went THAT way.',
      'Big footprints. Very big footprints. This way.',
    ]), { auto: 2.2 });
    this.settle();
  }
  // back from a fight or the trader: the beasts still get their turn
  *afterFight() {
    this.phase = 'busy';
    yield 0.5;
    yield* this.world();
    if (this.leaving) return;
    this.settle();
  }
  coachMaybe() {
    const tips = this.run.tips || (this.run.tips = {});
    if (tips.board) return;
    tips.board = true;
    Game.overlay = new Coach([
      { title: 'ROLL THE BONE', rect: () => this.rollRect(), text: 'Press ROLL (or SPACE). You move exactly that many tiles, forward or back. Every tile you could land on lights up: click one to walk there.' },
      { title: 'THE TILES', rect: () => { const p = this.cam.toScreen(this.me.x + 150, this.me.y); return { x: p.x - 130, y: p.y - 40, w: 260, h: 70 }; }, text: 'Blue tiles help, red ones hurt, orange ones are fights, purple ones are mysteries and gold ones are camps and shops. Point at any tile to read it.' },
      { title: 'THIS ROUND', rect: () => ({ x: W - 232, y: H - 64, w: 220, h: 52 }), text: 'The ground you walk over each round is counted here. Lots of cards and artifacts care: Wet Feet makes your lightning stronger if you splashed through water on the way to the fight.' },
      { title: 'CHARMS', rect: () => ({ x: 12, y: H - 64, w: 150, h: 52 }), text: 'Charms are one-use tricks, mostly for bending the dice. Pick them up on the road. Click one to use it.' },
      { title: 'THE BEASTS', rect: null, text: 'Beasts roam the road. After you move, they move. If one catches you, it gets the first hit. Land on one yourself and YOU get the jump on it. Beasts cannot see you in long grass.' },
    ], () => Game.save());
  }
  // ------------------------------------------------------------- helpers
  tile(id) { return this.T[id]; }
  get pos() { return this.T[this.bd.pos]; }
  used(t) { return !!this.bd.used[t.id]; }
  kindOf(t) {
    if (t.kind === 'secret' && !this.bd.revealed[t.id] && !this.used(t)) return 'path';
    if (t.kind === 'boss' && this.bd.bossDown) return 'path';
    const K = TILE_KINDS[t.kind];
    if (this.used(t) && !(K && K.perm)) return 'path';
    return t.kind;
  }
  terrainOf(t) { return this.bd.wet[t.id] && t.terrain !== 'hot' ? 'wet' : t.terrain; }
  isStop(id) {
    const t = this.T[id], k = this.kindOf(t);
    if (k === 'tar' && this.hasRelic('tar_crown')) return false;
    return !!(TILE_KINDS[k] && TILE_KINDS[k].stop);
  }
  routesFor(n, dir) {
    const T = this.T, out = [], self = this;
    const walk = (at, left, path) => {
      if (left === 0) { out.push(path); return; }
      const nx = dir > 0 ? T[at].next : T[at].prev;
      if (!nx.length) { if (path.length > 1) out.push(path); return; }
      for (const k of nx) {
        const p2 = path.concat(k);
        if (self.isStop(k)) { out.push(p2); continue; }
        walk(k, left - 1, p2);
      }
    };
    walk(this.bd.pos, n, [this.bd.pos]);
    return out;
  }
  computeRoutes() {
    this.reach.clear();
    for (const dir of [1, -1]) for (const r of this.routesFor(this.moves, dir)) {
      const end = r[r.length - 1];
      if (end === this.bd.pos) continue;
      if (!this.reach.has(end)) this.reach.set(end, { route: r, dir, short: r.length - 1 < this.moves });
    }
  }
  dinoAt(id) { return this.dinoActors.find(D => D.d.alive && D.d.tile === id); }
  hasRelic(id) { return this.run.relics.includes(id); }
  get heroName() { return this.hero.name; }
  // -------------------------------------------------------- the tile API
  *say(speaker, text, o = {}) {
    const at = o.at || { x: this.me.x, top: this.me.top - 4 };
    yield* Dialogue.say(speaker, text, Object.assign({ at, portrait: speaker === this.hero.name ? Heroes.spr(this.run.hero) : undefined }, o));
  }
  heal(n) {
    const r = this.run, b = r.hp; r.hp = Math.min(r.maxHp, r.hp + Math.round(n)); const h = r.hp - b;
    if (h > 0) { if (!this.stage) { Popups.add(this.me.x, this.me.top - 10, `+${h}`, '#a8e878', { scale: 1.6 }); Particles.sparkle(this.me.x, this.me.cy, 10, ['#a8e878', '#6cc95c']); } AudioSys.sfx('heal'); }
    return h;
  }
  hurt(n) {
    const r = this.run; n = Math.round(n);
    r.hp = Math.max(0, r.hp - n); r.stats.taken += n;
    if (!this.stage) {
      Popups.add(this.me.x, this.me.top - 10, `-${n}`, '#ef6a5e', { scale: 1.8, shake: 1.2 });
      Particles.blood(this.me.x, this.me.cy, ['#c2333c', '#ef6a5e'], 10);
      this.me.flash('#ffffff', 0.14); this.me.squash(0.2);
    } else Particles.blood(this.stage.hero.x, this.stage.hero.cy, ['#c2333c', '#ef6a5e'], 10);
    AudioSys.sfx('hurt'); Juice.flash('#c2333c', 0.25, 4);
    if (r.hp <= 0) { this.leaving = true; this.phase = 'busy'; Co.run(this.fall(), this); }
  }
  *fall() { yield 0.8; Game.goWith('fade', () => new GameOverScene(), 0.4); }
  foodHeal(n) { let k = n; if (this.run.hero === 'bronk') k *= 2; return k; }
  addGems(n) {
    this.run.gems = (this.run.gems || 0) + n;
    if (!this.stage) Popups.add(this.me.x, this.me.top - 18, `+${n} GEM${n > 1 ? 'S' : ''}`, '#c28cff', { scale: 1.5 });
    this.gemFly = { n, t: 0 };
    AudioSys.sfx('gem');
  }
  burst(col) { if (this.stage) return; Particles.spawn(this.me.x, this.me.cy, { n: 18, color: [col, '#ffffff'], speed: 160, life: 0.7, size: 3, sizeEnd: 0, gravity: 120 }); }
  popup(word, col = '#ffe98a') { if (this.stage) { Toon.word(this.stage.hero.x, this.stage.hero.top - 12, word, { size: 1.6, col }); return; } Popups.add(this.me.x, this.me.top - 16, word, col, { scale: 1.5, life: 1.3 }); }
  toast(text, col = '#ffe98a') { this.toasts.push({ text, col, t: 0, life: 2.4 }); }
  giveRelic(id) {
    if (!id || this.hasRelic(id)) return;
    Relics.give(id);
    this.toast(`NEW ARTIFACT: ${RELICS[id].name.toUpperCase()}`, '#ffe98a');
    if (!this.stage) Particles.sparkle(this.me.x, this.me.cy, 20);
  }
  randomRelic(tiers) { return Relics.randomReward(this.rng, tiers); }
  addCharm(id) {
    if (this.bd.charms.length >= 3) return false;
    this.bd.charms.push(id); AudioSys.sfx('pickup');
    this.toast(`CHARM: ${CHARMS[id].name.toUpperCase()}`, '#86e8d2');
    return true;
  }
  *findCharm(silent) {
    const id = this.rng.pick(CHARM_KEYS);
    if (this.addCharm(id)) { if (!silent) { this.burst('#86e8d2'); yield 0.3; } return id; }
    // the pouch is full: swap, or leave it lying there
    const choices = this.bd.charms.map((c, i) => ({ label: `Swap for your ${CHARMS[c].name}`, desc: CHARMS[c].desc, i }));
    choices.push({ label: 'Leave it', desc: 'Your pouch is full enough.', i: -1 });
    const k = yield* this.panelChoose({ title: 'A CHARM', icon: CHARMS[id].icon, text: `${CHARMS[id].name}: ${CHARMS[id].desc} Your pouch holds three.`, choices });
    const ch = choices[k];
    if (ch.i >= 0) { this.bd.charms[ch.i] = id; AudioSys.sfx('pickup'); }
    this.panel = null;
    return id;
  }
  *offerCards(n, o = {}) {
    const cards = Cards.randomReward(this.rng, n, [], this.run.hero, o.rare ? 0.35 : 0);
    let done = false;
    Game.overlay = new CardOfferOverlay(cards, o.title || 'LEARN A CARD', c => { if (c) this.addCard(c); done = true; });
    yield () => done;
  }
  *pickCard(title, filter) {
    const list = this.run.deck.filter(filter);
    if (!list.length) return null;
    let picked = null, done = false;
    Game.overlay = new DeckOverlay(list, title, { onPick: c => { picked = c; Game.overlay = null; done = true; AudioSys.sfx('unlock'); }, onClose: () => { done = true; } });
    yield () => done || !Game.overlay;
    return picked;
  }
  addCard(c) { this.run.deck.push(c); AudioSys.sfx('unlock'); this.toast(`NEW CARD: ${c.name.toUpperCase()}`, '#ffe98a'); }
  removeCard(c) { const i = this.run.deck.indexOf(c); if (i >= 0) this.run.deck.splice(i, 1); AudioSys.sfx('slurp'); }
  touch(terr, n = 1) { this.bd.touched[terr] = (this.bd.touched[terr] || 0) + n; }
  soakAround(r) {
    const seen = new Set([this.bd.pos]); let ring = [this.bd.pos];
    for (let k = 0; k < r; k++) { const nx = []; for (const id of ring) for (const j of this.T[id].next.concat(this.T[id].prev)) if (!seen.has(j)) { seen.add(j); nx.push(j); } ring = nx; }
    for (const id of seen) { if (this.T[id].terrain === 'hot') continue; this.bd.wet[id] = 1; const t = this.T[id]; Particles.splash(t.x, t.y, 6); }
    AudioSys.sfx('splash');
  }
  revealAhead(n) {
    let ring = [this.bd.pos]; const seen = new Set(ring);
    for (let k = 0; k < n; k++) { const nx = []; for (const id of ring) for (const j of this.T[id].next.concat(this.T[id].prev)) if (!seen.has(j)) { seen.add(j); nx.push(j); } ring = nx; }
    for (const id of seen) { const t = this.T[id]; if (t.kind === 'secret' && !this.bd.revealed[id]) { this.bd.revealed[id] = 1; Particles.sparkle(t.x, t.y - 6, 12); } if (t.ev) this.bd.revealed[id] = 1; }
    AudioSys.sfx('relic');
  }
  encounter(kind) {
    const r = this.run; r.seenFights = r.seenFights || [];
    const ids = Enemies.encounter(this.bd.biome, kind, this.rng, r.seenFights);
    r.seenFights.push(ids.join(',')); if (r.seenFights.length > 5) r.seenFights.shift();
    return ids.slice();
  }
  // a quick roll: the die tumbles in the open panel, or over your head
  *quickRoll() {
    const v = this.rollValue();
    const d = this.stage ? (this.stage.die = new Dice3D.Die(STAGE.W / 2, STAGE.GY - 84, 24)) : this.panel ? (this.panel.die = new Dice3D.Die(0, 0, 20)) : this.die;
    if (!this.panel && !this.stage) { this.dieShow = 1; this.placeDie(); }
    d.roll(v, 1.0); AudioSys.sfx('dice_roll');
    yield () => !d.busy;
    AudioSys.sfx('dice_land');
    yield 0.45;
    return v;
  }
  *riffChallenge(cfg) {
    let res = null, done = false;
    const was = this.panel; this.panel = null;
    if (!AudioSys.song) AudioSys.play('event', { fade: 0.3 });
    this.riff = new Riff({ bars: cfg.bars, density: cfg.density, title: cfg.title, act: this.bd.biome, windowMult: 1 + Relics.mod('window'), onDone: r => { res = r; done = true; } });
    const who = this.stage ? this.stage.hero : this.me;
    who.play(Heroes.has(this.run.hero, 'play') ? 'play' : 'idle');
    yield () => done;
    this.riff = null; who.play('idle');
    this.run.riffsPlayed = (this.run.riffsPlayed || 0) + 1;
    Popups.add(W / 2, 200, `${res.grade}  ${Math.round(res.acc * 100)}%`, res.grade[0] === 'S' ? '#ffe98a' : '#ffffff', { world: false, scale: 2.4, life: 1.2 });
    yield 0.8;
    this.panel = was;
    return res;
  }
  // ---------------------------------------------------------------- panels
  // An event is a tablet on the right of the screen: a picture, some words,
  // and two or three things to do. panelChoose waits for a choice.
  *panelChoose(ev) {
    if (this.stage) return yield* this.stage.choose(ev);
    const P = this.panel = { ev, title: ev.title, text: ev.text, spr: ev.spr, icon: ev.icon, scale: ev.scale || 1, choices: ev.choices, pick: -1, t: 0, mode: 'choose' };
    AudioSys.sfx('card_deal');
    yield () => P.pick >= 0;
    AudioSys.sfx('select');
    P.mode = 'busy';
    return P.pick;
  }
  *panelResult(text, button = 'CARRY ON') {
    if (this.stage) { yield* this.stage.result(text, button); return; }
    const P = this.panel || (this.panel = { title: '', text: '', choices: [], t: 0 });
    P.mode = 'result'; P.result = text; P.button = button; P.done = false; P.t = Math.max(P.t, 0.3);
    yield () => P.done;
    this.panel = null;
  }
  pickEvent(pool, t) {
    const list = BOARD_EVENTS[pool];
    return (t && t.ev && list.find(e => e.id === t.ev)) || this.rng.pick(list);
  }
  // Cut from the road to a close-up film of whatever is happening, run the
  // body inside it, and cut back.
  *cinema(ev, body, o = {}) {
    if (this.stage || this.leaving) { yield* body(); return; }
    const was = this.phase; this.phase = 'busy';
    Juice.letterbox(true); AudioSys.sfx('zoom_in', { vol: 0.5 });
    this.cam.zoomRate = 7; this.cam.tzoom = BZ * 1.7;
    yield 0.32;
    const St = this.stage = new EventStage(this, ev, o);
    Game.worldToScreen = (x, y) => St.cam.toScreen(x, y);
    this.cam.zoom = this.cam.tzoom = BZ;
    St.flash = 0.9; Juice.punch(0.04);
    yield* St.enter();
    yield* body(St);
    if (this.leaving || this.stage !== St) return;
    yield* St.leave();
    St.flash = 1;
    yield 0.05;
    this.stage = null; Toon.clear(); Dialogue.clear();
    Game.worldToScreen = (x, y) => this.cam.toScreen(x, y);
    Juice.letterbox(false);
    this.phase = was;
  }
  *runEvent(ev, pool) {
    if (!ev) return;
    const r = this.run; r.seenEvents = r.seenEvents || []; r.seenEvents.push(ev.id);
    yield* this.cinema(ev, function* () {
      const S = { result: null, fight: null, after: null, bonusGems: 0, relicWin: null };
      const pickable = ev.choices.map(c => Object.assign({}, c, { ok: !c.cond || c.cond(this) }));
      const k = yield* this.panelChoose(Object.assign({}, ev, { choices: pickable }));
      const ch = ev.choices[k];
      yield* ch.act(this, S);
      if (this.leaving) return;
      if (S.fight && this.stage) { yield* this.stage.react(); yield* this.stage.squareUp(S.fight); }
      yield* this.panelResult(S.result || '...', S.fight ? 'FIGHT!' : 'CARRY ON');
      if (S.after) this.pendingAfter = S.after;
      if (S.fight) yield* this.fight(S.fight, { kind: S.relicWin ? 'elite' : 'normal', relicWin: S.relicWin, bonusGems: S.bonusGems });
    }.bind(this), { pool });
    // moves happen back on the road, where you can see them
    if (this.pendingAfter && !this.leaving) { const a = this.pendingAfter; this.pendingAfter = null; yield* a(); }
  }
  // ------------------------------------------------------------- fights
  *startFight(t, kind) {
    if (this.bd.smoke && kind !== 'boss') {
      this.bd.smoke = false;
      Particles.spawn(this.me.x, this.me.cy, { n: 30, color: ['#a79bb4', '#d6cfe0', '#7a6d8a'], speed: 90, life: 1.1, size: 8, sizeEnd: 0, gravity: -40 });
      AudioSys.sfx('whoosh'); this.popup('SLIPPED AWAY!', '#d6cfe0');
      yield 0.8; return;
    }
    const ids = this.encounter(kind);
    this.toast(ids.length > 1 ? 'BEASTS!' : `A ${ENEMIES[ids[0]].name.toUpperCase()}!`, '#ff9a5a');
    AudioSys.sfx('roar', (ENEMIES[ids[0]] || {}).roar || {});
    Juice.shake(6, 0.3); Emotes.show(this.me, '!', 0.9);
    yield 0.7;
    yield* this.fight(ids, { kind });
  }
  *fight(ids, o = {}) {
    const bd = this.bd;
    if (this.stage) Juice.letterbox(false);
    bd.resume = o.resume || 'world';
    bd.win = { relicWin: o.relicWin || null, bonusGems: o.bonusGems || 0, roam: o.roam ?? null, boss: o.kind === 'boss', dino: o.dino ?? null };
    this.leaving = true; this.phase = 'busy';
    Game.save();
    Game.enterFight(ids, o.kind || 'normal', { advantage: o.advantage, terrain: this.terrainOf(this.pos), touched: Object.assign({}, bd.touched) });
    yield 0;
  }
  *dinoTile(t) {
    const D0 = DINO_TILES[this.bd.biome][t.dino || 0];
    yield* this.cinema({ title: D0.name, spr: D0.spr }, () => this.dinoFilm(t), { sleeping: true, pool: 'dino', ids: D0.ids });
  }
  *dinoFilm(t) {
    const D = DINO_TILES[this.bd.biome][t.dino || 0];
    const ev = {
      title: D.name, spr: D.spr, scale: 0.9,
      text: 'It is lying across the road, half asleep, and it is enormous. Beat it and whatever it has been guarding is yours.',
      choices: [
        { label: 'Fight it', desc: 'A {r}hard fight{/}. Win a {y}rare artifact{/}.', ok: true },
        { label: 'Sneak past', desc: 'Roll: {y}4 or more{/} and you are by, with {v}2 gems{/} from its bed. Less, and it wakes up angry.', ok: true },
        { label: 'Throw it some honey', desc: 'Spend your {y}Honey Lump{/}: it eats, and lets you through.', ok: this.bd.charms.includes('honey') },
      ],
    };
    const k = yield* this.panelChoose(ev);
    if (k === 0) { if (this.stage) yield* this.stage.squareUp(D.ids); yield* this.panelResult('You square up to it. It stands. And stands. And keeps standing.', 'FIGHT!'); yield* this.fight(D.ids.slice(), { kind: 'elite', relicWin: ['rare', 'uncommon'], dino: t.id }); return; }
    if (k === 1) {
      const v = yield* this.quickRoll();
      if (v >= 4) { this.addGems(2); yield* this.panelResult(`A ${v}. You tiptoe past on the very tips of your toes. {v}+2 gems{/} from its nest.`); return; }
      if (this.stage) yield* this.stage.squareUp(D.ids);
      yield* this.panelResult(`A ${v}. You tread on its tail.`, 'RUN? NO. FIGHT!');
      yield* this.fight(D.ids.slice(), { kind: 'elite', relicWin: ['uncommon'], advantage: 'ambushed', dino: t.id });
      return;
    }
    this.bd.charms.splice(this.bd.charms.indexOf('honey'), 1);
    yield* this.panelResult('It sniffs the honey, eats the honey, and rolls over for a nap. You step over it. It purrs. Dinosaurs can purr, it turns out. {v}+1 gem{/}.');
    this.addGems(1);
  }
  *bossTile(t) {
    const bossT = this.B.boss;
    this.phase = 'busy';
    AudioSys.stop(0.8);
    this.cam.lookAt(t.x + 60, BCAM_Y);
    yield 0.8;
    Juice.shake(10, 0.6); AudioSys.sfx('roar', { pitch: 60, vol: 1, len: 1.3 });
    const lines = BOSS_TALK[this.bd.biome](this);
    for (const [who, text] of lines) yield* this.say(who, text, who === this.hero.name ? {} : { at: { x: t.x + 110, top: t.y - 110 } });
    yield* this.fight(bossT.ids.slice(), { kind: 'boss', resume: 'idle' });
  }
  *secretTile(t) {
    this.bd.revealed[t.id] = 1;
    Particles.sparkle(t.x, t.y - 8, 30);
    yield* this.cinema({ title: 'A SECRET', spr: 'ti_secret', scale: 3 }, () => this.secretFilm(t), { secret: true });
  }
  *secretFilm(t) {
    const r = this.rng.int(0, 2);
    if (r === 0) {
      const id = this.randomRelic(['rare', 'uncommon']);
      this.giveRelic(id);
      yield* this.panelResult(`Behind a rock nobody has moved in a thousand years: {y}${id ? RELICS[id].name : 'nothing'}{/}.`);
    } else if (r === 1) {
      this.addGems(6);
      yield* this.panelResult('A crack in the rock, packed with gems like seeds in a fruit. {v}+6 gems{/}.');
    } else {
      yield* this.findCharm(true); yield* this.findCharm(true);
      yield* this.panelResult('Somebody\'s stash: two charm pouches, still tied up with grass.');
    }
  }
  *campTile(t) {
    yield* this.cinema({ title: 'CAMPFIRE' }, () => this.campFilm(t), { camp: true });
  }
  *campFilm(t) {
    const heal = Math.round(this.run.maxHp * 0.3);
    const k = yield* this.panelChoose({ title: 'CAMPFIRE', spr: 'v_campfire', scale: 2, text: 'Warm stones, a spit, and the stars. Nothing is chasing you, for now.',
      choices: [
        { label: 'Rest', desc: `Heal {g}${heal}{/} HP.`, ok: this.run.hp < this.run.maxHp },
        { label: 'Practise', desc: '{g}Upgrade{/} a card.', ok: this.run.deck.some(c => !c.up) },
        { label: 'Carve a charm', desc: 'Whittle a {y}charm{/} out of something.', ok: this.bd.charms.length < 3 },
      ] });
    if (k === 0) { this.heal(heal); AudioSys.sfx('rest_sfx'); yield* this.panelResult('You sleep like a rock. Several actual rocks sleep next to you.'); }
    else if (k === 1) { this.panel = null; const c = yield* this.pickCard('UPGRADE A CARD', c => !c.up); if (c) { c.up = true; Cards.refresh(c); this.toast(`${c.name.toUpperCase()}`, '#a8e878'); } }
    else { this.panel = null; yield* this.findCharm(); }
  }
  *openShop() {
    let done = false;
    Game.overlay = new TraderOverlay(this, () => { done = true; });
    yield () => done;
  }
  *openAltar() {
    Game.overlay = new EnchantOverlay();
    yield () => !Game.overlay;
  }
  // ------------------------------------------------------------ movement
  // swing, blow or walk along the road without rolling
  *slide(n, how) {
    let at = this.bd.pos; const route = [at];
    for (let i = 0; i < n; i++) {
      const nx = this.T[at].next; if (!nx.length) break;
      at = nx[0]; route.push(at);
      if (this.isStop(at)) break;
    }
    if (route.length < 2) return;
    yield* this.walk(route, how);
    yield* this.land();
  }
  hopTo(a, b, dur, arc) {
    return Co.over(dur, k => {
      this.me.x = lerp(a.x, b.x, k); this.me.y = lerp(a.y, b.y, k) + 2;
      this.me.z = Math.sin(k * Math.PI) * arc;
    });
  }
  *walk(route, how) {
    this.phase = 'move';
    this.me.play('walk');
    for (let i = 1; i < route.length; i++) {
      const a = this.T[route[i - 1]], b = this.T[route[i]];
      this.me.facing = b.x >= a.x ? 1 : -1;
      const fly = how === 'vine' || how === 'geyser';
      yield* this.hopTo(a, b, fly ? 0.22 : 0.26, how === 'geyser' ? 90 : how === 'vine' ? 30 : 9);
      this.me.z = 0;
      const terr = this.terrainOf(b);
      this.touch(terr, 1);
      if (terr === 'grass' && this.hasRelic('moss_boots')) this.heal(1);
      this.stepFx(b, terr);
      if (i < route.length - 1) yield 0.03;
    }
    this.bd.pos = route[route.length - 1];
    // ice: you do not so much stop as fail to keep going
    let guard = 0;
    while (this.terrainOf(this.pos) === 'ice' && !this.hasRelic('ice_skates') && guard++ < 4) {
      const dir = route.length > 1 && this.T[route[route.length - 1]].x < this.T[route[route.length - 2]].x ? -1 : 1;
      const nx = dir > 0 ? this.pos.next : this.pos.prev;
      if (!nx.length || this.isStop(nx[0])) break;
      const b = this.T[nx[0]];
      this.popup('WHEEE!', '#bfe6ff'); AudioSys.sfx('squeak');
      yield* Co.over(0.2, k => { this.me.x = lerp(this.pos.x, b.x, k); this.me.y = lerp(this.pos.y, b.y, k) + 2; });
      this.bd.pos = b.id; this.touch(this.terrainOf(b), 1); this.stepFx(b, this.terrainOf(b));
      if (this.terrainOf(b) !== 'ice') break;
    }
    this.me.play('idle');
  }
  stepFx(t, terr) {
    const T = TERRAIN[terr] || TERRAIN.stone;
    AudioSys.sfx(T.step || 'step');
    this.me.squash(0.14);
    if (terr === 'wet') Particles.splash(t.x, t.y, 10);
    else if (terr === 'hot') Particles.embers(t.x, t.y - 4, 5);
    else if (terr === 'ice') Particles.sparkle(t.x, t.y, 5, ['#ffffff', '#bfe6ff']);
    else if (terr === 'sand') Particles.spawn(t.x, t.y, { n: 6, color: ['#e2b86e', '#c89a58'], speed: 60, angle: -Math.PI / 2, spread: 1.4, gravity: 160, life: 0.5, size: 2 });
    else Particles.dust(t.x, t.y, 5);
  }
  // you have arrived; now the tile has its say
  *land() {
    const t = this.pos, terr = this.terrainOf(t);
    this.phase = 'tile';
    if (terr === 'hot' && !this.hasRelic('coal_sandals')) { this.hurt(2); this.popup('HOT HOT HOT!', '#ffa832'); yield 0.3; if (this.leaving) return; }
    const D = this.dinoAt(t.id);
    if (D) { yield* this.roamFight(D, 'ambush'); return; }
    const kind = this.kindOf(t);
    const K = TILE_KINDS[kind];
    if (!K || kind === 'path' || kind === 'junction') { yield 0.1; return; }
    if (!K.perm) this.bd.used[t.id] = 1;
    this.cam.lookAt(t.x + 50, BCAM_Y);
    yield* K.land(this, t);
    yield* Relics.boardTrigger('onLand', this, t);
  }
  // --------------------------------------------------------- the beasts
  *world() {
    this.phase = 'world';
    const hid = this.terrainOf(this.pos) === 'grass' || (this.hasRelic('leaf_cloak') && this.terrainOf(this.pos) === 'sand');
    for (const D of this.dinoActors) {
      const d = D.d; if (!d.alive) continue;
      if (d.sleep > 0) { d.sleep--; continue; }
      const dist = Board.distance(this.board, d.tile, this.bd.pos, 8);
      let steps = 0;
      const scared = this.hasRelic('horace_horn');
      if (!hid && !scared && dist <= 5) {
        steps = Math.min(dist, this.hasRelic('leaf_cloak') ? 1 : 2);
        if (!d.hunting) { d.hunting = true; Emotes.show(D.a, '!', 1); AudioSys.sfx('detect'); yield 0.35; }
        for (let i = 0; i < steps; i++) {
          const nx = Board.stepToward(this.board, d.tile, this.bd.pos);
          yield* this.dinoHop(D, nx);
        }
      } else {
        d.hunting = false;
        if (this.rng.chance(0.5)) {
          const T = this.T[d.tile], opts = T.next.concat(T.prev).filter(k => { const kk = this.kindOf(this.T[k]); return (kk === 'path' || kk === 'junction') && k !== this.bd.pos && !this.dinoAt(k); });
          if (opts.length) yield* this.dinoHop(D, this.rng.pick(opts));
        }
      }
      if (d.tile === this.bd.pos) {
        if (this.bd.honey) {
          this.bd.honey = false; d.sleep = 3; d.hunting = false;
          this.popup('IT EATS THE HONEY', '#ffe98a');
          yield* this.say(this.hero.name, 'Good dinosaur. GOOD dinosaur. Stay.', { auto: 1.6 });
          continue;
        }
        Juice.shake(10, 0.4); AudioSys.sfx('roar', (ENEMIES[d.kind] || {}).roar || {});
        this.toast(`A ${(ENEMIES[d.kind] || { name: 'beast' }).name.toUpperCase()} CAUGHT YOU!`, '#ef6a5e');
        yield 0.8;
        yield* this.roamFight(D, 'ambushed');
        return;
      }
    }
  }
  *dinoHop(D, id) {
    const a = this.T[D.d.tile], b = this.T[id];
    D.a.facing = b.x >= a.x ? 1 : -1; D.a.play('walk');
    yield* Co.over(0.24, k => { D.a.x = lerp(a.x, b.x, k) + 4; D.a.y = lerp(a.y, b.y, k) + 2; D.a.z = Math.sin(k * Math.PI) * 7; });
    D.a.z = 0; D.d.tile = id; D.a.play('idle');
    Particles.dust(b.x, b.y, 4); AudioSys.sfx('step');
  }
  *roamFight(D, adv) {
    const ids = [D.d.kind];
    if (this.bd.biome >= 2 && this.rng.chance(0.4)) ids.push(this.rng.pick(['compy', 'raptor', 'lizard'].filter(k => ENEMIES[k])));
    yield* this.fight(ids, { kind: 'normal', advantage: adv, roam: D.d.n, resume: adv === 'ambush' ? 'world' : 'idle' });
  }
  // ------------------------------------------------------------- the roll
  rollValue(o = {}) {
    let v;
    if (o.lo) v = this.rng.int(o.lo, o.hi);
    else v = this.rng.int(1, 6);
    if (v === 1 && this.hasRelic('lucky_dodo')) v = this.rng.int(2, 6);
    return v;
  }
  placeDie() {
    // the bone floats at the hero's shoulder, clear of the bars along the top
    const y = Math.max(this.me.top - 18, this.cam.y - H / (2 * BZ) + 58);
    this.die.x = this.me.x + 40; this.die.y = y;
    if (this.die2) { this.die2.x = this.me.x - 40; this.die2.y = y; }
  }
  roll() {
    if (this.phase !== 'idle' || this.leaving || this.panel) return;
    this.co = Co.run(this.turn(), this);
  }
  *turn() {
    const bd = this.bd;
    this.phase = 'roll'; this.adjusted = false; this.dieChoice = null;
    bd.touched = {}; bd.round = (bd.round || 0) + 1;
    if (this.run.stats) this.run.stats.rolls = (this.run.stats.rolls || 0) + 1;
    if (bd.abilityCd > 0) bd.abilityCd--;
    // what is going to come up, before anything is thrown
    const armed = this.pending; this.pending = null;
    const two = armed === 'twin' || this.run.hero === 'pebble';
    const range = armed === 'feather' ? { lo: 4, hi: 6 } : armed === 'pebble' ? { lo: 1, hi: 3 } : {};
    let v;
    this.dieShow = 1; this.placeDie();
    if (bd.forceNext) { v = bd.forceNext; bd.forceNext = 0; this.die.roll(v, 0.9); AudioSys.sfx('dice_roll'); yield () => !this.die.busy; }
    else if (armed === 'knuckle') {
      v = yield* this.pickNumber();
      this.die.roll(v, 0.7); AudioSys.sfx('dice_roll'); yield () => !this.die.busy;
    } else if (two) {
      const a = this.rollValue(range), b = this.rollValue(range);
      this.die2 = new Dice3D.Die(0, 0, 25); this.placeDie();
      this.die.roll(a, 1.1); this.die2.roll(b, 1.25); AudioSys.sfx('dice_roll');
      yield () => !this.die.busy && !this.die2.busy;
      AudioSys.sfx('dice_land');
      if (a === b && this.run.hero === 'pebble') { bd.extraTurn = true; this.popup('DOUBLES! GO AGAIN AFTER', '#a8e878'); }
      this.dieChoice = { a, b, pick: -1 };
      this.phase = 'pickdie';
      yield () => this.dieChoice.pick >= 0;
      v = this.dieChoice.pick === 0 ? a : b;
      if (this.dieChoice.pick === 1) { const t = this.die; this.die = this.die2; this.die2 = t; }
      this.die2 = null; this.dieChoice = null;
    } else {
      v = this.rollValue(range);
      this.die.roll(v, 1.2); AudioSys.sfx('dice_roll');
      yield () => !this.die.busy;
    }
    AudioSys.sfx('dice_land');
    // what the road does to it
    if (bd.tarred) { v = Math.max(1, v - bd.tarred); bd.tarred = 0; this.popup('STILL STICKY  -2', '#ef6a5e'); }
    if (bd.bonusNext) { v += bd.bonusNext; this.popup(`+${bd.bonusNext}`, '#ffe98a'); bd.bonusNext = 0; }
    if (bd.doubleNext) { v *= 2; bd.doubleNext = false; this.popup('DOUBLED!', '#ffe98a'); }
    this.moves = v; this.rolled = v;
    this.computeRoutes();
    this.phase = 'choose';
    this.chosen = null;
    yield () => this.chosen || this.leaving;
    if (this.leaving) return;
    const pick = this.chosen; this.chosen = null;
    this.dieShow = 0;
    this.reach.clear();
    yield* this.walk(pick.route);
    yield* this.land();
    if (this.leaving) return;
    yield* this.world();
    if (this.leaving) return;
    if (bd.extraTurn) {
      bd.extraTurn = false;
      this.toast('SUGAR RUSH! ANOTHER GO', '#a8e878');
      yield 0.6;
      this.phase = 'idle'; Game.save();
      this.roll();
      return;
    }
    this.settle();
  }
  *pickNumber() {
    this.numberPick = -1; this.phase = 'number';
    yield () => this.numberPick > 0;
    const n = this.numberPick; this.numberPick = -1;
    return n;
  }
  // after the roll: the charms and the hero's own tweak
  adjust(d) {
    if (this.phase !== 'choose') return;
    const n = this.moves + d;
    if (n < 1) return;
    this.moves = n; this.die.set(clamp(n, 1, 6)); this.computeRoutes(); AudioSys.sfx('select');
  }
  useCharm(i) {
    const id = this.bd.charms[i]; if (!id) return;
    const C = CHARMS[id];
    const ok = C.when === 'before' ? this.phase === 'idle' : C.when === 'after' ? this.phase === 'choose' : (this.phase === 'idle' || this.phase === 'choose');
    if (!ok) { AudioSys.sfx('error'); this.toast(C.when === 'before' ? 'USE IT BEFORE YOU ROLL' : C.when === 'after' ? 'USE IT AFTER YOU ROLL' : 'NOT NOW', '#ef6a5e'); return; }
    if (C.when === 'before') { if (this.pending) { AudioSys.sfx('error'); return; } this.pending = id; this.bd.charms.splice(i, 1); AudioSys.sfx('relic'); this.toast(`${C.name.toUpperCase()} READY`, '#86e8d2'); return; }
    this.bd.charms.splice(i, 1);
    AudioSys.sfx('relic');
    if (id === 'nudge') { this.nudging = true; return; }
    if (id === 'rattle') { Co.run(this.reroll(), this); return; }
    if (id === 'smoke') { this.bd.smoke = true; this.toast('SMOKE POUCH READY', '#d6cfe0'); }
    if (id === 'moss') this.heal(15);
    if (id === 'map') this.revealAhead(10);
    if (id === 'honey') { this.bd.honey = true; this.toast('HONEY READY: THE NEXT BEAST STOPS TO EAT', '#ffe98a'); }
    Game.save();
  }
  *reroll() {
    this.phase = 'roll'; this.reach.clear();
    const v = this.rollValue(); this.die.roll(v, 1); AudioSys.sfx('dice_roll');
    yield () => !this.die.busy;
    this.moves = v; this.computeRoutes(); this.phase = 'choose';
  }
  ability() {
    const A = this.hero.ability, bd = this.bd;
    if (A.id === 'rain') {
      if (!(this.phase === 'idle' || this.phase === 'choose') || bd.abilityCd > 0) { AudioSys.sfx('error'); return; }
      bd.abilityCd = 3;
      this.soakAround(2);
      this.me.play(Heroes.has('roxy', 'play') ? 'play' : 'idle');
      Particles.notes(this.me.x, this.me.top, 6);
      this.toast('RAIN DANCE', '#6aa9ee');
      this.rain = 3;
      Game.save();
    }
  }
  // ------------------------------------------------------------------ update
  update(dt) {
    this.t += dt;
    if (this.riff) { this.riff.update(dt); this.me.update(dt); return; }
    Dialogue.update();
    this.me.update(dt);
    for (const b of this.band) b.a.update(dt);
    for (const D of this.dinoActors) D.a.update(dt);
    this.die.update(dt); if (this.die2) this.die2.update(dt);
    if (this.panel && this.panel.die) this.panel.die.update(dt);
    if (this.stage && this.stage.die) this.stage.die.update(dt);
    if (this.panel) this.panel.t += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.life) this.banner = null; }
    for (const o of this.toasts) o.t += dt;
    this.toasts = this.toasts.filter(o => o.t < o.life);
    if (this.rain > 0) this.rain -= dt;
    // the band follows a few steps behind, in a line
    let lx = this.me.x, ly = this.me.y;
    for (let i = 0; i < this.band.length; i++) {
      const a = this.band[i].a, tx = lx - this.me.facing * 26, ty = ly + 4;
      const d = Math.hypot(tx - a.x, ty - a.y);
      a.x = damp(a.x, tx, 6, dt); a.y = damp(a.y, ty, 6, dt);
      a.play(d > 3 ? 'walk' : 'idle'); a.facing = this.me.facing;
      lx = a.x; ly = a.y;
    }
    // the camera: ahead of you, or over the road while you choose
    const VWb = W / BZ;
    let tx = this.me.x + 90 * (this.me.facing || 1);
    if (this.phase === 'choose' && this.reach.size) {
      let mn = 1e9, mx = -1e9;
      for (const id of this.reach.keys()) { mn = Math.min(mn, this.T[id].x); mx = Math.max(mx, this.T[id].x); }
      mn = Math.min(mn, this.me.x); mx = Math.max(mx, this.me.x);
      tx = mx - mn < VWb - 90 ? (mn + mx) / 2 : this.me.x + 110;
    }
    if (this.phase === 'move' || this.phase === 'world') tx = this.me.x + 70 * this.me.facing;
    if (Input.down && !this.panel && !Game.overlay && Math.abs(Input.dragDX) > 0) this.pan -= Input.dragDX / BZ;
    this.pan += Input.wheel * 24;
    if (Input.isDown('ArrowRight', 'KeyD')) this.pan += dt * 300;
    if (Input.isDown('ArrowLeft', 'KeyA')) this.pan -= dt * 300;
    if (this.phase === 'move' || this.phase === 'world' || this.phase === 'tile') this.pan = damp(this.pan, 0, 4, dt);
    this.pan = clamp(this.pan, -this.board.w, this.board.w);
    if (this.phase !== 'tile' && this.phase !== 'busy') this.cam.lookAt(tx + this.pan, BCAM_Y);
    this.cam.update(dt);
    if (this.phase === 'choose' || this.phase === 'idle') this.placeDie();
    // bake the ground ahead of the camera while nothing much is happening
    BoardBake.step(this.cam.x - VWb / 2 - 300, this.cam.x + VWb / 2 + 300, this.phase === 'idle' ? 5 : 2);
    this.weather(dt);
    // keys
    if (!this.panel && !Game.overlay && !Dialogue.active) {
      if (Input.pressed('Space', 'Enter') && this.phase === 'idle') this.roll();
      if (Input.pressed('KeyQ')) this.ability();
      for (const k of Input.keys) if (/^Digit[1-3]$/.test(k.code)) this.useCharm(+k.code.slice(5) - 1);
      if (Input.pressed('Escape')) Game.pause();
      if (Input.pressed('KeyC')) this.pan = 0;
    } else if (this.panel && this.panel.mode === 'choose') {
      for (const k of Input.keys) if (/^Digit[1-4]$/.test(k.code)) { const i = +k.code.slice(5) - 1; const c = this.panel.choices[i]; if (c && c.ok !== false) this.panel.pick = i; }
    } else if (this.panel && this.panel.mode === 'result' && Input.pressed('Space', 'Enter') && this.panel.t > 0.4) this.panel.done = true;
    // hover: what tile is under the pointer
    this.hoverT = !this.panel && !Game.overlay && !this.stage ? this.tileAt(Input.mx, Input.my) : null;
    if (this.stage) this.stage.update(dt);
  }
  tileAt(sx, sy) {
    const w = this.cam.toWorld(sx, sy);
    let best = null, bd = 1e9;
    for (const t of this.T) {
      const dx = t.x - w.x, dy = (t.y - w.y) * 1.9, d = dx * dx + dy * dy;
      if (d < (t.big ? 36 * 36 : 28 * 28) && d < bd) { bd = d; best = t; }
    }
    return best;
  }
  click(x, y, button) {
    if (this.riff || this.panel) return;
    if (button === 2) { this.pan = 0; return; }
    // where the click landed, not where the pointer was last seen: a quick
    // tap lifts the finger before the next frame looks for it
    const t = this.tileAt(x, y);
    if (this.phase === 'choose' && t && this.reach.has(t.id)) {
      this.chosen = this.reach.get(t.id);
      AudioSys.sfx('select');
    }
  }
  weather(dt) {
    const w = this.B.weather, L = this.cam.x - W / (2 * BZ), top = this.cam.y - H / (2 * BZ);
    if (w === 'rain' || this.rain > 0) for (let i = 0; i < 3; i++) Particles.spawn(rnd(0, W), -10, { n: 1, color: ['#a8d8ff', '#6aa9ee'], speed: 30, vx: -60, vy: 620, gravity: 0, life: 0.9, size: 2, shape: 'drop', world: false, fade: false });
    else if (w === 'snow' && chance(0.7)) Particles.spawn(rnd(0, W + 100), -10, { n: 1, color: ['#ffffff', '#e8f0ff'], speed: 10, vx: -30, vy: 50, gravity: 0, life: 7, size: 2, drag: 1, world: false });
    else if (w === 'ash' && chance(0.6)) Particles.spawn(rnd(0, W), -10, { n: 1, color: ['#574a66', '#3b3048', '#7a6d8a'], speed: 10, vx: rnd(-20, 10), vy: 40, gravity: 0, life: 8, size: 2, drag: 1, world: false });
    else if (w === 'ash' && chance(0.12)) Particles.spawn(rnd(0, W), H + 10, { n: 1, color: ['#e06a1b', '#ffa832'], speed: 10, vx: rnd(-10, 10), vy: -60, gravity: 0, life: 6, size: 2, drag: 1, world: false });
    else if (w === 'pollen' && chance(0.15)) Particles.spawn(L + rnd(0, W / BZ), top + rnd(60, H / BZ), { n: 1, color: ['#fffaea', '#ffe98a'], speed: 8, vx: 16, gravity: -4, life: 5, size: 1, drag: 1 });
    else if (w === 'heat' && chance(0.06)) Particles.spawn(L + rnd(0, W / BZ), top + rnd(80, H / BZ), { n: 1, color: ['#e2b86e', '#c89a58'], speed: 40, vx: 90, gravity: -10, life: 2, size: 2, drag: 0.99 });
  }
  // -------------------------------------------------------------------- draw
  draw() {
    const ctx = Gfx.ctx, cam = this.cam;
    if (this.stage) {
      this.stage.draw();
      Post.ui();
      Toon.draw(true);
      Particles.draw(Gfx.ctx, false);
      if (this.riff) { this.riff.draw(); Popups.draw(false); return; }
      this.stage.drawUI();
      if (this.dieChoice) this.drawDiePick();
      this.drawToasts();
      Popups.draw(false);
      Dialogue.draw();
      return;
    }
    Gfx.clear(this.B.sky[0]);
    cam.apply(ctx);
    const L = cam.x - W / (2 * BZ) - 40, R = cam.x + W / (2 * BZ) + 40, camL = cam.x - W / (2 * BZ);
    BoardSky.draw(this, L, R, camL);
    BoardBake.draw(L, R);
    BoardSky.liquids(this, L, R);
    // tiles, back to front
    const vis = this.T.filter(t => t.x > L - 60 && t.x < R + 60);
    vis.sort((a, b) => a.y - b.y);
    // the chosen route, in footprints, before the tiles go over it
    const hovR = this.phase === 'choose' && this.hoverT && this.reach.get(this.hoverT.id);
    if (hovR) this.drawRoute(hovR.route);
    for (const t of vis) this.drawTile(t);
    // everything standing up, sorted by its feet
    const list = [];
    for (const p of this.board.props) if (p.x > L - 100 && p.x < R + 100) list.push({ y: p.y, f: () => this.drawProp(p) });
    for (const t of vis) { const f = this.landmark(t); if (f) list.push({ y: t.y - 6, f }); }
    for (const D of this.dinoActors) if (D.d.alive) list.push({ y: D.a.y, f: () => this.drawDino(D) });
    for (const b of this.band) list.push({ y: b.a.y, f: () => b.a.draw() });
    list.push({ y: this.me.y + 0.5, f: () => this.drawHero() });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) it.f();
    Particles.draw(ctx, true); FX.draw(true);
    if (this.dieShow && !this.riff) { this.die.draw(); if (this.die2) this.die2.draw(); }
    Floaters.draw(); Emotes.draw();
    Popups.draw(true);
    BoardSky.lights(this, L, R);
    cam.restore(ctx);
    this.drawForeground();
    BoardSky.grade(this);
    Post.ui();
    Particles.draw(Gfx.ctx, false);
    if (this.riff) { this.riff.draw(); Popups.draw(false); return; }
    this.drawHud();
    if (this.phase === 'choose') this.drawReachMarkers();
    if (this.hoverT && !this.panel && !Game.overlay) this.drawTileTip(this.hoverT);
    if (this.panel) this.drawPanel();
    if (this.dieChoice) this.drawDiePick();
    if (this.phase === 'number') this.drawNumberPick();
    if (this.nudging) this.drawNudge();
    this.drawToasts();
    if (this.banner) this.drawBanner();
    Popups.draw(false);
    Dialogue.draw();
  }
  // The near edge of the world, sliding past faster than the road: big dark
  // plants, rocks and bones along the bottom, and in the jungle vines hanging
  // in from the top. Bigger pixels than the board, because they are nearer.
  drawForeground() {
    const b = this.bd.biome, camL = this.cam.x - W / (2 * BZ), T = this.t;
    const FG = {
      1: ['v_fern', 'v_bush', 'v_fern', 'v_bush_berry', 'v_flowers', 'v_fern'],
      2: ['v_bush_jungle', 'v_fern', 'v_bush_jungle', 'v_fern', 'v_mushroom'],
      3: ['v_rock_bare', 'v_bones', 'v_skull', 'v_rock_bare', 'v_bones'],
      4: ['v_rock_bare', 'v_pine', 'v_rock_bare', 'v_stump', 'v_rock'],
      5: ['v_rock_bare', 'v_bones', 'v_rock_bare', 'v_skull', 'v_deadtree'],
    }[b];
    const shade = { 1: '#0e2414', 2: '#06140e', 3: '#3a1a0e', 4: '#1a2438', 5: '#0a060a' }[b];
    const period = 1500, k = 1.45;
    for (let i = 0; i < 14; i++) {
      const spr = FG[i % FG.length], sp = Gfx.spr(spr);
      const sc = 3 + (i % 3 === 0 ? 1 : 0);
      const base = (i * 107.3 * 1.1 + (i % 2) * 40);
      const x = ((base - camL * BZ * k) % period + period) % period - 200;
      if (x < -sp.w * sc || x > W + sp.w * sc) continue;
      const y = H + 14 + (i % 4) * 8 + (sp.h * sc > 140 ? sp.h * sc * 0.45 : 0);
      const sway = /fern|bush|tree|pine/.test(spr) ? Math.sin(T * 1.1 + i) * 0.03 : 0;
      Gfx.sprite(spr, x, y, { anchor: 'bc', scale: sc, flip: i % 2 === 0, tint: shade, tintAmount: 0.55, rot: sway });
    }
    if (b === 2) {
      // vines, and a fringe of leaves along the top
      const ctx = Gfx.ctx;
      for (let i = 0; i < 9; i++) {
        const x = ((i * 173 - camL * BZ * 1.3) % 1400 + 1400) % 1400 - 120, len = 70 + (i * 37) % 90;
        const sw = Math.sin(T * 0.9 + i) * 6;
        for (let y = 0; y < len; y += 3) {
          const vx = x + sw * (y / len) ** 1.5;
          Gfx.rect(Math.round(vx) - 2, y, 4, 3, '#06140e');
          Gfx.rect(Math.round(vx) - 1, y, 2, 3, '#14331e');
          if (y % 18 === 9) { Gfx.round(Math.round(vx) + 1, y, 12, 6, 3, '#0a1e12'); Gfx.round(Math.round(vx) + 2, y + 1, 9, 3, 2, '#27632f'); Gfx.round(Math.round(vx) - 13, y + 6, 12, 6, 3, '#0a1e12'); Gfx.round(Math.round(vx) - 11, y + 7, 9, 3, 2, '#1d4a26'); }
        }
      }
      void ctx;
    }
    if (b === 4) {
      // a snowy branch reaching in from each top corner
      for (const side of [-1, 1]) {
        const x0 = side < 0 ? -30 : W + 30;
        Gfx.sprite('v_pine', x0, 150 + Math.sin(T * 0.7) * 2, { anchor: 'bc', scale: 4, rot: side * 2.4, tint: '#1a2438', tintAmount: 0.5 });
      }
    }
  }
  drawRoute(route) {
    for (let i = 1; i < route.length; i++) {
      const a = this.T[route[i - 1]], b = this.T[route[i]];
      const n = 4;
      for (let k = 1; k < n; k++) {
        const u = k / n, x = lerp(a.x, b.x, u), y = lerp(a.y, b.y, u) + 3;
        const on = ((k + i * n) - Math.floor(this.t * 10)) % 3 === 0;
        Gfx.rect(x - 2, y - 1, 4, 3, on ? '#fffaea' : '#ffe98a');
        Gfx.rect(x - 2, y + 2, 4, 1, '#120c16');
      }
    }
  }
  drawTile(t) {
    const kind = this.kindOf(t), terr = this.terrainOf(t);
    const slab = BoardArt.slab(terr, t.big);
    const reach = this.phase === 'choose' && this.reach.get(t.id);
    const hov = this.hoverT === t;
    const lift = reach ? Math.round(2 + Math.sin(this.t * 5 + t.x * 0.05) * 1.5) + (hov ? 2 : 0) : 0;
    const x = t.x - slab.cx, y = t.y - slab.cy - lift;
    const ctx = Gfx.ctx;
    // a soft shadow where it sits in the ground
    ctx.globalAlpha = 0.28; ctx.fillStyle = '#07050a';
    ctx.fillRect(Math.round(t.x - slab.RX + 3), Math.round(t.y + slab.RY - 1), slab.RX * 2 - 6, 3);
    ctx.globalAlpha = 1;
    ctx.drawImage(slab, Math.round(x), Math.round(y));
    const used = this.used(t) && !(TILE_KINDS[t.kind] && TILE_KINDS[t.kind].perm);
    if (used) { ctx.globalAlpha = 0.3; ctx.drawImage(BoardArt.slab('stone', t.big), Math.round(x), Math.round(y)); ctx.globalAlpha = 1; }
    // the tile's mark, painted on in ochre and berry juice
    const paint = TILE_PAINT[KIND_PAINT[kind]];
    const K = TILE_KINDS[kind];
    if (paint && K && K.icon) {
      const cy = t.y - lift - 1, rx = t.big ? 17 : 12, ry = t.big ? 8 : 6;
      BoardArt.pad(Math.round(t.x), Math.round(cy), rx, ry, paint);
      Gfx.sprite(K.icon, Math.round(t.x), Math.round(cy - 5 - (t.big ? 3 : 0)), { anchor: 'c' });
    } else if (kind === 'secret' || (t.kind === 'secret' && !used && this.hasRelic('grandmas_glasses'))) {
      if (Math.sin(this.t * 3 + t.x) > 0.8) Gfx.rect(t.x - 1, t.y - 8, 2, 2, '#ffe98a');
    }
    if (this.bd.wet[t.id] && t.terrain !== 'wet') {
      ctx.globalAlpha = 0.55; Gfx.round(t.x - 10, t.y - lift - 3, 20, 7, 3, '#3570c0'); Gfx.rect(t.x - 6, t.y - lift - 2, 5, 1, '#a8d8ff'); ctx.globalAlpha = 1;
    }
    if (reach) {
      const k = 0.5 + Math.sin(this.t * 6) * 0.5;
      BoardArt.ring(Math.round(t.x), Math.round(t.y - lift), slab.RX + 3, slab.RY + 3, hov ? '#ffffff' : k > 0.5 ? '#ffe98a' : '#e0b93a');
      if (reach.dir < 0) this.arrow(t.x - slab.RX - 9, t.y - lift, -1, 5, '#ffe98a');
    } else if (hov) BoardArt.ring(Math.round(t.x), Math.round(t.y), slab.RX + 2, slab.RY + 2, 'rgba(255,250,234,0.55)');
  }
  // Where a landmark can stand beside its tile without hiding any other
  // tile: tried right, left, behind and in front, nearest first.
  spot(t, w, h, pref = 1) {
    const key = t.id + ':' + w;
    this._spots = this._spots || {};
    if (this._spots[key]) return this._spots[key];
    const cands = [[pref * (w / 2 + 26), -2], [-pref * (w / 2 + 26), -2], [pref * (w / 2 + 20), -26], [-pref * (w / 2 + 20), -26], [0, -34], [pref * (w / 2 + 30), 24], [pref * (w / 2 + 50), -10]];
    let best = null;
    for (const [dx, dy] of cands) {
      const x = t.x + dx, y = t.y + dy;
      const hit = this.T.some(u => u !== t && Math.abs(u.x - x) < w / 2 + 22 && u.y < y + 14 && u.y > y - h - 10);
      if (!hit) { best = { x, y, dx }; break; }
    }
    if (!best) best = { x: t.x + cands[0][0], y: t.y - 2, dx: cands[0][0] };
    return (this._spots[key] = best);
  }
  // the things that stand next to special tiles, so the board reads from afar
  landmark(t) {
    const kind = this.kindOf(t), used = this.used(t), T = this.t;
    switch (t.kind) {
      case 'start': return () => { Gfx.sprite('v_cave', t.x - 8, t.y - 16, { anchor: 'bc', scale: 1 }); };
      case 'trader': {
        const P = this.spot(t, 150, 90);
        return () => {
          Gfx.shadow(P.x, P.y, 110, 0.3);
          Gfx.sprite('mammoth_idle', P.x, P.y, { anchor: 'bc', frame: Math.floor(T * 1.6) % 2, flip: P.dx > 0 });
          Gfx.sprite('v_basket', P.x - 46, P.y - 4, { anchor: 'bc' }); Gfx.sprite('v_pot', P.x + 44, P.y, { anchor: 'bc' });
        };
      }
      case 'camp': {
        const P = this.spot(t, 40, 40);
        return () => {
          Gfx.sprite(used ? 'v_campfire_out' : 'v_campfire', P.x, P.y, { anchor: 'bc', frame: Math.floor(T * 10) });
          if (!used && chance(0.25)) Particles.embers(P.x, P.y - 18, 1);
        };
      }
      case 'altar': { const P = this.spot(t, 56, 50); return () => BoardSky.altar(P.x, P.y, T); }
      case 'cave': return () => { Gfx.sprite('v_cave', t.x + 8, t.y - 14, { anchor: 'bc', scale: 0.8, alpha: used ? 0.7 : 1 }); };
      case 'totem': { if (used) return null; const P = this.spot(t, 24, 50); return () => Gfx.sprite('v_totem', P.x, P.y, { anchor: 'bc', scale: 0.7 }); }
      case 'choice': { if (used) return null; const P = this.spot(t, 30, 40); return () => Gfx.sprite('v_signpost', P.x, P.y, { anchor: 'bc' }); }
      case 'npc': {
        if (used) return null;
        const ev = BOARD_EVENTS.npc.find(e => e.id === t.ev); if (!ev) return null;
        const s = Gfx.spr(ev.spr), P = this.spot(t, s.w * 0.7, s.h);
        return () => { Gfx.shadow(P.x, P.y, 30, 0.3); Gfx.sprite(ev.spr, P.x, P.y, { anchor: 'bc', frame: Math.floor(T * 2 + t.x) % 2, flip: P.dx > 0 }); };
      }
      case 'dino': {
        if (used) return null;
        const D = DINO_TILES[this.bd.biome][t.dino || 0];
        const s = Gfx.spr(D.spr), P = this.spot(t, s.w, s.h);
        return () => {
          Gfx.shadow(P.x, P.y, s.w * 0.7, 0.3);
          Gfx.sprite(D.spr, P.x, P.y, { anchor: 'bc', frame: Math.floor(T * 1.4) % s.frames.length, flip: P.dx > 0 });
          if (Math.sin(T * 1.3 + t.x) > 0.3) Gfx.text('z', P.x + s.w * 0.3, P.y - s.h - 6 - (T * 12 % 14), { color: '#fffaea', outline: true });
        };
      }
      case 'boss': {
        if (this.bd.bossDown) return null;
        const bs = this.B.boss;
        return () => {
          const s = Gfx.spr(bs.spr);
          Gfx.sprite('v_cave', t.x + 96, t.y - 20, { anchor: 'bc', scale: 1.6, tint: '#120c16', tintAmount: 0.3 });
          Gfx.shadow(t.x + 84, t.y - 2, s.w * 0.7, 0.35);
          Gfx.sprite(bs.spr, t.x + 84, t.y - 2, { anchor: 'bc', frame: Math.floor(T * 3) % s.frames.length, flip: true });
          if (chance(0.2) && this.bd.biome === 1) Particles.fire(t.x + 84 + rnd(-30, 30), t.y - s.h * 0.6, 1);
        };
      }
      case 'geyser': return () => { if (!used && (T * 0.7 + t.x * 0.01) % 3 < 0.5) Particles.spawn(t.x, t.y - 6, { n: 2, color: ['#fffaea', '#d8f0ff'], speed: 140, angle: -Math.PI / 2, spread: 0.3, gravity: 60, life: 0.9, size: 5, sizeEnd: 0 }); };
      case 'tar': return () => { if (chance(0.05)) Particles.spawn(t.x + rnd(-14, 14), t.y + 2, { n: 1, color: ['#302638', '#40344a'], speed: 12, angle: -Math.PI / 2, gravity: 20, life: 0.8, size: 3, sizeEnd: 0 }); };
    }
    return null;
  }
  drawProp(p) {
    const tint = this.B.tint && !/rock|bones|skull/.test(p.spr) ? this.B.tint : null;
    Gfx.sprite(p.spr, Math.round(p.x), Math.round(p.y), Object.assign({ anchor: 'bc', flip: p.flip, frame: /tree/.test(p.spr) ? Math.floor(this.t * 1.5 + p.x) % 2 : 0 }, tint || {}));
  }
  drawDino(D) {
    const a = D.a;
    if (D.d.sleep > 0 && Math.sin(this.t * 1.5 + a.x) > 0) Gfx.text('z', a.x + 12, a.top - 8 - (this.t * 10 % 12), { color: '#fffaea', outline: true });
    a.draw();
    if (D.d.hunting) { const k = Math.sin(this.t * 8) > 0; Gfx.sprite('icon_skull', a.x, a.top - 10, { anchor: 'c', alpha: k ? 1 : 0.6 }); }
  }
  drawHero() {
    const a = this.me;
    // a ring of the hero's colour under their feet, so you always know which one is you
    const c = this.hero.color;
    Gfx.ctx.globalAlpha = 0.6; BoardArt.ring(Math.round(a.x), Math.round(a.y), 13, 5, c); Gfx.ctx.globalAlpha = 1;
    a.draw();
  }
  // ------------------------------------------------------------------ HUD
  rollRect() { return { x: W / 2 - 96, y: H - 70, w: 192, h: 56 }; }
  drawHud() {
    const E = HUD.EDGE, C = HUD.C, r = this.run;
    // ---- you
    {
      const x = E, y = E, w = 268, h = 52;
      HUD.plate(x, y, w, h, { accent: this.hero.color });
      HUD.portrait(x + 27, y + 26, 20, Heroes.spr(r.hero), { ring: this.hero.color, frame: Math.floor(this.t * 2) % 2 });
      HUD.text(this.hero.name, x + 54, y + 8, { color: this.hero.color, scale: 1.1 });
      const bx = x + 54, bw = w - 66;
      this.hpGhost = damp(this.hpGhost ?? r.hp / r.maxHp, r.hp / r.maxHp, 3, Time.dt);
      HUD.bar(bx, y + 26, bw, 14, r.hp / r.maxHp, C.life, C.lifeDark, { ghost: this.hpGhost });
      HUD.text(`${r.hp}/${r.maxHp}`, bx + 5, y + 28, { scale: 1 });
      let rx = x; const ry = y + h + 8;
      for (const id of r.relics) {
        if (!RELICS[id]) continue;
        HUD.plate(rx, ry, 30, 30, { gold: false });
        Gfx.sprite(RELICS[id].spr, rx + 4, ry + 4, { anchor: 'tl' });
        if (UI.hovered(rx, ry, 30, 30)) UI.tooltip(rx, ry + 36, [`{y}${RELICS[id].name}{/}`, RELICS[id].desc], { width: 240 });
        rx += 34; if (rx > 420) break;
      }
      // the family you have got back, in little frames
      let fx = x + w + 8;
      for (const id of r.band || []) { HUD.portrait(fx + 16, y + 26, 14, Heroes.spr(id), { ring: Heroes.get(id).color, face: 20 }); fx += 34; }
    }
    // ---- the journey: this land, and how far you are through it
    {
      const w = 330, x = W / 2 - w / 2, y = E;
      HUD.plate(x, y, w, 44, { gold: false });
      HUD.text(this.B.name, W / 2, y + 7, { color: C.shell, align: 'center', scale: 1.2 });
      const bx = x + 16, bw = w - 44, by = y + 28;
      const k = clamp(this.pos.x / this.T[this.board.boss].x, 0, 1);
      Gfx.rect(bx, by, bw, 4, C.ink); Gfx.rect(bx + 1, by + 1, bw - 2, 2, '#3b3048');
      Gfx.rect(bx + 1, by + 1, Math.round((bw - 2) * k), 2, this.hero.color);
      for (const t of this.T) {
        const kk = this.kindOf(t);
        if (kk === 'camp' || kk === 'trader' || kk === 'altar') Gfx.rect(bx + Math.round(bw * clamp(t.x / this.T[this.board.boss].x, 0, 1)) - 1, by - 2, 3, 3, '#e0b93a');
      }
      Gfx.sprite('icon_skull', bx + bw + 12, by + 2, { anchor: 'c', scale: 0.8 });
      Gfx.rect(bx + Math.round(bw * k) - 2, by - 3, 5, 10, '#fffaea');
      // five lands, five dots
      for (let i = 1; i <= BIOME_COUNT; i++) {
        const dx = W / 2 - (BIOME_COUNT - 1) * 7 + (i - 1) * 14;
        Gfx.rect(dx - 3, y + 46, 6, 6, C.ink);
        Gfx.rect(dx - 2, y + 47, 4, 4, i < this.bd.biome ? '#a8e878' : i === this.bd.biome ? '#ffe98a' : '#3b3048');
      }
      if (UI.hovered(x, y, w, 56)) UI.tooltip(x, y + 60, [`{y}${this.B.name}{/}  -  land ${this.bd.biome} of ${BIOME_COUNT}`, `${this.B.boss.name} waits at the end of this road. Grandma Rex's lair is at the end of the last one.`], { width: 300 });
    }
    // ---- gems, deck, menu
    UI.iconButton(W - E - 36, E, 36, 30, 'icon_menu', () => Game.pause(), { scale: 1.1 });
    HUD.chip(W - E - 36 - 8 - 72, E, 72, (x, y) => HUD.gem(x, y), r.gems || 0, C.gem);
    HUD.chip(W - E - 36 - 8 - 72 - 8 - 72, E, 72, (x, y) => Gfx.sprite('icon_bag', x, y, { anchor: 'c' }), r.deck.length, C.text,
      { hit: () => { Game.overlay = new DeckOverlay(r.deck, 'YOUR DECK'); } });
    // ---- charms
    {
      const x = E, y = H - E - 48;
      HUD.plate(x, y, 146, 48, { gold: false });
      for (let i = 0; i < 3; i++) {
        const sx = x + 6 + i * 46, id = this.bd.charms[i];
        Gfx.rect(sx, y + 6, 40, 36, '#120c16'); Gfx.rect(sx + 1, y + 7, 38, 34, '#241c2e');
        if (id) {
          const hov = UI.hovered(sx, y + 6, 40, 36);
          if (hov) Gfx.rect(sx + 1, y + 7, 38, 34, '#3b3048');
          Gfx.sprite(CHARMS[id].icon, sx + 20, y + 24, { anchor: 'c' });
          if (!Input.touch) Gfx.text(String(i + 1), sx + 3, y + 8, { color: HUD.C.faint, scale: 0.8 });
          UI.hit(sx, y + 6, 40, 36, () => this.useCharm(i));
          if (hov) UI.tooltip(sx, y - 64, [`{c}${CHARMS[id].name}{/}`, CHARMS[id].desc, CHARMS[id].when === 'before' ? '{d}use before rolling{/}' : CHARMS[id].when === 'after' ? '{d}use after rolling{/}' : '{d}use any time{/}'], { width: 220 });
        }
      }
      if (this.pending) HUD.text(`${CHARMS[this.pending].name.toUpperCase()} READY`, x + 4, y - 14, { color: '#86e8d2', scale: 0.9 });
    }
    // ---- what you have walked on this round
    {
      const keys = Object.keys(this.bd.touched).filter(k => this.bd.touched[k] > 0);
      const w = Math.max(132, 36 + keys.length * 44), x = W - E - w, y = H - E - 48;
      HUD.plate(x, y, w, 48, { gold: false });
      HUD.text('THIS ROUND', x + 8, y + 5, { color: C.faint, scale: 0.8 });
      if (!keys.length) HUD.text('nothing yet', x + 8, y + 24, { color: C.faint, scale: 0.9 });
      keys.forEach((k, i) => {
        const T = TERRAIN[k], cx = x + 10 + i * 44;
        Gfx.rect(cx, y + 20, 38, 20, HUD.C.ink); Gfx.rect(cx + 1, y + 21, 36, 18, T.dark); Gfx.rect(cx + 1, y + 21, 36, 5, T.col);
        HUD.text(`${T.name}`, cx + 19, y + 24, { color: '#fffaea', align: 'center', scale: 0.7 });
        HUD.text(`x${this.bd.touched[k]}`, cx + 19, y + 31, { color: '#fffaea', align: 'center', scale: 0.8 });
        if (UI.hovered(cx, y + 20, 38, 20)) UI.tooltip(cx - 100, y - 50, [`{y}${T.name}{/}: touched ${this.bd.touched[k]} this round`, T.desc], { width: 220 });
      });
    }
    // ---- the roll, and whatever you can do to it
    const R = this.rollRect();
    const A = this.hero.ability;
    if (this.phase === 'idle' && !this.panel) {
      HUD.button(R.x, R.y, R.w, R.h, 'ROLL', () => this.roll(), { keyHint: 'SPACE', hot: true, scale: 1.6 });
      if (A.id === 'rain') {
        const cd = this.bd.abilityCd || 0;
        HUD.button(R.x + R.w + 10, R.y + 8, 132, 40, cd > 0 ? `RAIN (${cd})` : 'RAIN DANCE', () => this.ability(), { disabled: cd > 0, keyHint: 'Q', accent: '#6aa9ee' });
      }
    } else if (this.phase === 'choose') {
      HUD.plate(R.x - 60, R.y - 4, R.w + 120, R.h + 8, { gold: false });
      HUD.text(`${this.moves}  ${this.moves === 1 ? 'STEP' : 'STEPS'}`, W / 2, R.y + 6, { color: C.shell, align: 'center', scale: 1.6 });
      HUD.text(Input.touch ? 'tap a glowing tile' : 'click a glowing tile', W / 2, R.y + 32, { color: C.dim, align: 'center', scale: 1 });
      if (!this.adjusted && A.id === 'steady') {
        HUD.button(R.x - 52, R.y + 8, 44, 40, '-1', () => { this.adjusted = true; this.adjust(-1); }, { accent: this.hero.color });
        HUD.button(R.x + R.w + 8, R.y + 8, 44, 40, '+1', () => { this.adjusted = true; this.adjust(1); }, { accent: this.hero.color });
        HUD.text('STEADY HAND', W / 2, R.y - 18, { color: this.hero.color, align: 'center', scale: 0.9, outline: true });
      }
      if (!this.adjusted && A.id === 'heavy' && this.moves > 1) {
        HUD.button(R.x + R.w + 8, R.y + 8, 112, 40, 'HEAVY -1', () => { this.adjusted = true; this.adjust(-1); }, { accent: this.hero.color });
      }
      if (A.id === 'rain') {
        const cd = this.bd.abilityCd || 0;
        HUD.button(R.x + R.w + 8, R.y + 8, 120, 40, cd > 0 ? `RAIN (${cd})` : 'RAIN DANCE', () => this.ability(), { disabled: cd > 0, keyHint: 'Q', accent: '#6aa9ee' });
      }
      if (!this.reach.size) { HUD.button(W / 2 - 70, R.y - 52, 140, 36, 'STAY PUT', () => { this.chosen = { route: [this.bd.pos], dir: 1 }; }); }
    }
  }
  // arrows at the screen edge for reachable tiles off the screen
  drawReachMarkers() {
    for (const [id, r] of this.reach) {
      const t = this.T[id], p = this.cam.toScreen(t.x, t.y);
      if (p.x > 20 && p.x < W - 20) continue;
      const left = p.x < 20, x = left ? 22 : W - 22, y = clamp(p.y, 120, H - 120);
      const hov = UI.hovered(x - 18, y - 18, 36, 36);
      Gfx.circle(x, y, 16, '#120c16'); Gfx.circle(x, y, 14, hov ? '#ffe98a' : '#e0b93a');
      this.arrow(x + (left ? -1 : 1), y, left ? -1 : 1, 7, '#120c16');
      UI.hit(x - 18, y - 18, 36, 36, () => { this.pan += (t.x - this.cam.x) * 0.8; });
    }
  }
  arrow(x, y, dir, r, col) {
    const ctx = Gfx.ctx;
    ctx.fillStyle = '#120c16'; ctx.beginPath(); ctx.moveTo(x + dir * (r + 2), y); ctx.lineTo(x - dir * (r - 1), y - r - 2); ctx.lineTo(x - dir * (r - 1), y + r + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x + dir * r, y); ctx.lineTo(x - dir * (r - 2), y - r); ctx.lineTo(x - dir * (r - 2), y + r); ctx.closePath(); ctx.fill();
  }
  drawTileTip(t) {
    const kind = this.kindOf(t), K = TILE_KINDS[kind] || TILE_KINDS.path, T = TERRAIN[this.terrainOf(t)];
    const p = this.cam.toScreen(t.x, t.y);
    const lines = [`{y}${K.name}{/}  {d}on ${T.name.toLowerCase()}{/}`, K.desc];
    const seeAll = this.hasRelic('map_stone') || this.hasRelic('grandmas_glasses') || this.run.hero === 'vela';
    if (t.ev && (this.bd.revealed[t.id] || (seeAll && Board.distance(this.board, t.id, this.bd.pos, 6) <= 5))) {
      const ev = (BOARD_EVENTS[t.kind] || []).find(e => e.id === t.ev);
      if (ev) lines.push(`{p}${ev.title}{/}`);
    }
    if (t.kind === 'dino' && !this.used(t)) lines.push(`{r}${DINO_TILES[this.bd.biome][t.dino || 0].name}{/}`);
    const D = this.dinoAt(t.id); if (D) lines.push(`{r}A ${(ENEMIES[D.d.kind] || { name: 'beast' }).name.toUpperCase()} is standing here{/}${D.d.sleep ? ' (asleep)' : ''}`);
    const r = this.reach.get(t.id);
    if (r) lines.push(`{g}${r.route.length - 1} step${r.route.length > 2 ? 's' : ''} ${r.dir > 0 ? 'on' : 'back'}${r.short ? ' - the road stops you here' : ''}{/}`);
    UI.tooltip(clamp(p.x + 24, 8, W - 250), clamp(p.y - 90, 60, H - 150), lines, { width: 240 });
  }
  drawPanel() {
    const P = this.panel, ctx = Gfx.ctx;
    const k = Ease.outBack(clamp(P.t * 4, 0, 1));
    const w = 420, h = 360, x = W - w - 24 + (1 - k) * 80, y = 78;
    ctx.globalAlpha = clamp(P.t * 5, 0, 1);
    const r = UI.window(x, y, w, h, P.title || '');
    // the picture, in a recess
    const px = r.x + 8, py = r.y + 6, pw = 120, ph = 110;
    Gfx.rect(px - 1, py - 1, pw + 2, ph + 2, SKIN.ink);
    Gfx.rect(px, py, pw, ph, '#2a2034');
    Gfx.rect(px, py + ph - 26, pw, 26, '#3a2c28');
    ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
    if (P.die) { P.die.x = px + pw / 2; P.die.y = py + ph / 2 - 6; P.die.draw(); }
    else if (P.spr) { const s = Gfx.spr(P.spr); const sc = Math.min(P.scale || 1, (pw - 10) / s.w, (ph - 8) / s.h) || 1; Gfx.sprite(P.spr, px + pw / 2, py + ph - 8, { anchor: 'bc', scale: sc >= 1 ? Math.floor(sc) : sc, frame: Math.floor(P.t * 4) }); }
    else if (P.icon) Gfx.sprite(P.icon, px + pw / 2, py + ph / 2, { anchor: 'c', scale: 3 });
    ctx.restore();
    const tx = px + pw + 12, tw = r.w - pw - 30;
    if (P.mode === 'result') {
      Gfx.textWrap(P.result, tx, r.y + 8, tw, { color: SKIN.text, scale: 1.1, lineHeight: 15, onLight: true });
      const bw = 190;
      UI.wbutton(r.x + r.w / 2 - bw / 2, r.y + r.h - 54, bw, 44, P.button || 'CARRY ON', () => { if (P.t > 0.35) P.done = true; }, { scale: 1.3 });
    } else {
      Gfx.textWrap(P.text || '', tx, r.y + 8, tw, { color: SKIN.text, scale: 1.05, lineHeight: 14, onLight: true });
      let cy = r.y + 128;
      (P.choices || []).forEach((ch, i) => {
        const ok = ch.ok !== false && P.mode === 'choose';
        const bh = 50, bx = r.x + 8, bw = r.w - 16;
        const hov = ok && UI.hovered(bx, cy, bw, bh);
        UI.slab(bx, cy, bw, bh, { face: hov ? SKIN.btn : ok ? SKIN.faceMid : '#8a7f68', lit: hov ? SKIN.btnLit : SKIN.face, mid: SKIN.btnDark, dark: SKIN.ink, r: 3, shadow: false, rough: false, len: 7 });
        if (!Input.touch) Gfx.text(`${i + 1}`, bx + 12, cy + 8, { color: ok ? SKIN.goldLit : SKIN.faceDark, scale: 1.2 });
        Gfx.text(ch.label, bx + 30, cy + 8, { color: ok ? SKIN.textLit : SKIN.faceDark, scale: 1.2 });
        Gfx.rich(ch.desc || '', bx + 30, cy + 28, { color: ok ? '#fffaea' : '#5c3a20', scale: 0.95 });
        if (ok) UI.hit(bx, cy, bw, bh, () => { if (P.t > 0.3 && P.pick < 0) P.pick = i; });
        cy += bh + 6;
      });
    }
    ctx.globalAlpha = 1;
  }
  drawDiePick() {
    const D = this.dieChoice;
    const w = 300, x = W / 2 - w / 2, y = H - 150;
    HUD.plate(x, y, w, 60, { gold: false });
    HUD.text('PICK A DIE', W / 2, y + 6, { color: HUD.C.shell, align: 'center', scale: 1.2 });
    for (const [i, v] of [[0, D.a], [1, D.b]]) {
      HUD.button(x + 20 + i * 140, y + 22, 120, 32, `TAKE ${v}`, () => { D.pick = i; AudioSys.sfx('select'); }, { hot: true });
    }
    // or click the die itself
    for (const [i, die] of [[0, this.die], [1, this.die2]]) {
      if (!die) continue;
      const p = this.cam.toScreen(die.x, die.y);
      UI.hit(p.x - 26, p.y - 26, 52, 52, () => { D.pick = i; AudioSys.sfx('select'); });
    }
  }
  drawNumberPick() {
    const w = 360, x = W / 2 - w / 2, y = H - 150;
    HUD.plate(x, y, w, 64, { gold: false });
    HUD.text('KNUCKLEBONE: CHOOSE YOUR ROLL', W / 2, y + 6, { color: '#86e8d2', align: 'center', scale: 1 });
    for (let n = 1; n <= 6; n++) HUD.button(x + 12 + (n - 1) * 57, y + 24, 50, 34, String(n), () => { this.numberPick = n; }, { hot: true, scale: 1.4 });
  }
  drawNudge() {
    if (this.phase !== 'choose') { this.nudging = false; return; }
    const w = 240, x = W / 2 - w / 2, y = H - 150;
    HUD.plate(x, y, w, 60, { gold: false });
    HUD.text('NUDGE STICK', W / 2, y + 6, { color: '#86e8d2', align: 'center', scale: 1 });
    HUD.button(x + 16, y + 22, 96, 32, '-1', () => { this.nudging = false; this.adjust(-1); }, { disabled: this.moves <= 1 });
    HUD.button(x + w - 112, y + 22, 96, 32, '+1', () => { this.nudging = false; this.adjust(1); });
  }
  drawToasts() {
    let y = 118;
    for (const o of this.toasts) {
      const k = o.t / o.life, a = k < 0.1 ? k / 0.1 : k > 0.8 ? (1 - k) / 0.2 : 1;
      Gfx.ctx.globalAlpha = clamp(a, 0, 1);
      const w = Gfx.measure(o.text, 1.3) + 28;
      HUD.plate(W / 2 - w / 2, y, w, 28, { gold: false, accent: o.col });
      HUD.text(o.text, W / 2, y + 8, { color: o.col, align: 'center', scale: 1.3 });
      Gfx.ctx.globalAlpha = 1;
      y += 34;
    }
  }
  drawBanner() {
    const b = this.banner, k = b.t / b.life;
    HUD.banner(b.title, b.sub, k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1);
  }
}

// ------------------------------------------------------------ boss chatter
const BOSS_TALK = {
  1: B => [
    ['BLAZE', "Well, well. Grandma said you'd come. She said you'd be slow. She was right."],
    [B.heroName, "Blaze?! You were our COOK! You lived in our KITCHEN!"],
    ['BLAZE', "I was your STOVE. Six years of flipping your mammoth steaks. Grandma offered me a better job."],
    ['BLAZE', `She left ${Heroes.get(Heroes.captives(B.run.hero)[0]).name} with me. Come and take them. If you can stand the heat.`],
  ],
  2: B => [
    ['HORACE', "Hrrrm. You're the one that ate Rexford."],
    [B.heroName, "We didn't know he had a MUM! Or a gran! Or friends!"],
    ['HORACE', "Everybody has a gran. I've got this one of yours. Grandma Rex asked me to sit on them. So I am."],
  ],
  3: B => [
    ['TAR KING', "Bloop. BLOOP. Nobody crosses the badlands without paying the Tar King."],
    [B.heroName, "Pay you with what?"],
    ['TAR KING', "Grandma Rex paid me in knitting. You'll pay me in YOU. Bloooop."],
  ],
  4: B => [
    ['REXMOND', "So. You're the family that ate my brother."],
    [B.heroName, "Oh no. There's MORE of you."],
    ['REXMOND', "Gran is at the top of the mountain, crying into her tea. I'm going to cheer her up. With you."],
  ],
  5: B => [
    ['GRANDMA REX', "Oh, it's you, dear. Come in. Wipe your feet. Mind the bones."],
    [B.heroName, "Give me back my family."],
    ['GRANDMA REX', "You ate my Rexford. With GRAVY. So I'm afraid, sweetheart, that it's my turn for dinner."],
  ],
};
