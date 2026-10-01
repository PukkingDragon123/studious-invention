// ---------------------------------------------------------------------------
// combat.js - the performance: a card battle where every riff cuts to a
// close-up of Bronk playing and hands control to the note field.
// ---------------------------------------------------------------------------
'use strict';

const STAGE_Y = 430;
const CAM_DY = 96;            // the camera sits lower, so the fighters stand clear of the hand
const ACTOR_SCALE = 2;

const Backdrops = {
  // Not a stage any more: a clearing in the land itself. The far country
  // behind, then two rows of the land's own trees swaying, the animals of the
  // place wandering along between them, the trail you are fighting on, the
  // undergrowth round its edge, and big leaves in front of the camera.
  WANDER: {
    1: ['stego', 'compy', 'dodo', 'compy', 'tricera'], 2: ['dodo', 'compy', 'boar', 'compy'], 3: ['stego', 'lizard', 'compy'],
    4: ['mammoth', 'boar', 'compy'], 5: ['lizard', 'compy', 'raptor'],
  },
  hash: (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); },
  treeRow(b, t, px, depth, y, sc, tint, amt, seed, gap) {
    const P = BIOMES[b].props, list = P.back, off = px * depth;
    for (let i = -8; i < 30; i++) {
      const x = i * gap + Backdrops.hash(i, seed) * gap * 0.6 - off;
      if (x < -200 + px * 0 - 400 || x > 1500) continue;
      const spr = list[Math.floor(Backdrops.hash(i, seed + 1) * list.length)];
      const k = 0.85 + Backdrops.hash(i, seed + 2) * 0.35;
      Gfx.sprite(spr, x, y + Backdrops.hash(i, seed + 3) * 6, { anchor: 'bc', scale: sc * k, flip: Backdrops.hash(i, seed + 4) > 0.5, rot: Math.sin(t * 0.7 + i) * 0.012, tint, tintAmount: amt });
    }
  },
  wanderers(b, t, px) {
    if (!Backdrops._w || Backdrops._wb !== b) {
      Backdrops._wb = b;
      Backdrops._w = Backdrops.WANDER[b].map((id, i) => ({ id, x: -200 + i * 330 + Math.random() * 120, v: (Math.random() < 0.5 ? -1 : 1) * (14 + Math.random() * 16), s: 0.55 + Math.random() * 0.25 }));
    }
    for (const w of Backdrops._w) {
      w.x += w.v * Time.dt;
      if (w.x > 1350) w.v = -Math.abs(w.v); if (w.x < -350) w.v = Math.abs(w.v);
      const walk = SPRITES[w.id + '_walk'] ? w.id + '_walk' : w.id + '_idle';
      const big = w.id === 'stego' || w.id === 'tricera' || w.id === 'mammoth';
      Gfx.sprite(walk, w.x - px * 0.7, 318, { anchor: 'bc', scale: big ? w.s : w.s * 1.3, frame: Math.floor(t * 6 + w.x), flip: w.v < 0, tint: BIOMES[b].far.haze, tintAmount: 0.2 });
    }
  },
  draw(act, t, cam) {
    const px = (cam ? cam.x - W / 2 : 0), b = clamp(act, 1, BIOME_COUNT), B = BIOMES[b];
    World.skyRamp(-600, 1800, -400, 360, B.sky);
    const Ls = BoardSky.bands(b);
    Vista.drawAt(Ls[0], null, px, -600, 1800, 12, 2);
    Vista.drawAt(Ls[1], null, px, -600, 1800, 84, 2);
    if (Backdrops.scene) Arena.drawSky(Backdrops.scene);
    if (Backdrops.scene) Arena.drawFar(Backdrops.scene, b, t, px);
    Vista.drawAt(Ls[2], null, px, -600, 1800, 200, 2);
    const hz = { 1: '#c0d8ee', 2: '#7aa89a', 3: '#f0c890', 4: '#dce6f4', 5: '#6e2a24' }[b];
    Gfx.rectA(-600, 230, 2400, 70, hz, 0.04);
    // the wood: a far row in the haze, the animals of the place, a near row
    Backdrops.treeRow(b, t, px, 0.45, 300, 1.4, B.far.haze, 0.24, 7, 70);
    Backdrops.wanderers(b, t, px);
    Backdrops.treeRow(b, t, px, 0.7, 326, 2, '#120c16', 0.22, 19, 110);
    // the trail through the clearing
    Vista.pit(b, -600, 1800, 322, 2);
    Gfx.rect(-600, 322, 2400, 3, { 1: '#85562f', 2: '#27632f', 3: '#a4663a', 4: '#c0d0e8', 5: '#4d4a5c' }[b]);
    Gfx.rectA(-600, 325, 2400, 8, '#000000', 0.25);
    // the undergrowth round the back of it
    const mid = B.props.mid;
    for (let i = 0; i < 16; i++) {
      const x = -300 + i * 104 + Backdrops.hash(i, 3) * 60 - px * 0.9;
      Gfx.sprite(mid[i % mid.length], x, 344 + Backdrops.hash(i, 5) * 10, { anchor: 'bc', scale: 1.5, flip: i % 2 === 1, tint: '#120c16', tintAmount: 0.15 });
    }
    const cx = () => cam ? cam.x + rnd(-W / 2, W / 2) : rnd(0, W);
    if (b === 5) for (let i = 0; i < 3; i++) if (chance(0.35)) Particles.spawn(cx(), 460, { n: 1, color: ['#e06a1b', '#ffa832', '#574a66'], speed: 24, gravity: -36, life: 3.4, size: 3, sizeEnd: 0 });
    if (b === 2) for (let i = 0; i < 2; i++) if (chance(0.5)) Particles.spawn(cx(), 100, { n: 1, color: ['#a8d8ff', '#6aa9ee'], speed: 20, vx: -40, vy: 520, gravity: 0, life: 0.9, size: 2, shape: 'drop' });
    if (b === 4) if (chance(0.5)) Particles.spawn(cx(), 100, { n: 1, color: ['#ffffff', '#e8f0ff'], speed: 10, vx: -30, vy: 60, gravity: 0, life: 6, size: 3, drag: 1 });
    if (b === 1) if (chance(0.2)) Particles.spawn(cx(), rnd(120, 300), { n: 1, color: ['#fffaea', '#ffe98a'], speed: 8, vx: 12, gravity: -4, life: 4, size: 2 });
    if (b === 3) if (chance(0.15)) Particles.spawn(cx(), rnd(300, 400), { n: 1, color: ['#e2b86e', '#c89a58'], speed: 40, vx: 120, gravity: -10, life: 2, size: 3 });
  },
  // leaves and rocks right in front of the camera, at the bottom corners
  front(act, t, cam) {
    const b = clamp(act, 1, BIOME_COUNT), P = BIOMES[b].props.front, px = cam ? cam.x - W / 2 : 0;
    for (let i = 0; i < 5; i++) {
      const x = [-70, 70, 890, 1030, 1160][i] - px * 0.3, y = 610 + (i % 2) * 14;
      Gfx.sprite(P[i % P.length], x, y, { anchor: 'bc', scale: 3.2, flip: i > 1, rot: Math.sin(t * 0.9 + i) * 0.02, tint: '#08060c', tintAmount: 0.62 });
    }
  },
};

class Combat {
  constructor(ids, o = {}) {
    this.ids = ids; this.opts = o; this.kind = o.kind || 'normal'; this.act = o.act || (Game.run ? Game.run.act : 1);
    this.advantage = o.advantage || 'even';       // how the fight opened, out in the valley
    this.run = Game.run;
    this.rng = new RNG((this.run ? this.run.seed : 1) + (this.run ? this.run.fights * 977 : 0) + 31);
    this.enemies = []; this.hand = []; this.drawPile = []; this.discard = []; this.exhaust = [];
    this.energy = 3; this.maxEnergy = 3; this.turn = 0; this.hype = 0; this.encoreReady = false;
    this.phase = 'intro'; this.busy = true; this.selected = null; this.preview = null; this.riff = null;
    this.played = 0; this.powers = {}; this.flags = {}; this.t = 0; this.relicFlash = {};
    this.band = (this.run ? this.run.band : []).slice();
    this.heroDef = Heroes.get(this.run && this.run.hero);
    this.maxEnergy = this.heroDef.energy || 3; this.energy = this.maxEnergy; this.handSize = this.heroDef.hand || 5;
    // the ground you crossed on the way here, and the ground you are standing on
    const bd = this.run && this.run.board;
    this.touched = Object.assign({}, o.touched || (bd && bd.touched) || {});
    this.terrain = o.terrain || null;
    this.rage = 0; this.echoNext = []; this.wetFeet = this.touchedAny('wet');
    this.player = { st: { str: 0, weak: 0, vuln: 0, thorns: 0, regen: 0 }, block: 0 };
    this.cam = new Camera(); this.cam.zoom = 1; this.cam.lookAt(W / 2, 288 + CAM_DY, true);
    // with the whole family behind you the stage needs a step more room
    this.me = new Actor({ base: this.heroDef.base, x: 210 + 26 * Math.max(0, Math.min(3, this.band.length) - 1), y: STAGE_Y, scale: ACTOR_SCALE, facing: 1, stance: true });
    this.banner = null; this.won = false; this.gemsEarned = 0; this.handSlide = 0; this.zoomed = 0;
    this.hitStop = 0; this.beatPulse = 0;
  }
  get hp() { return this.run.hp; } set hp(v) { this.run.hp = v; }
  get maxHp() { return this.run.maxHp; }
  enter() {
    this.drawPile = this.rng.shuffle(this.run.deck.map(c => Cards.refresh(c)));
    for (const id of this.ids) this.spawn(id, true);
    this.layout();
    for (const e of this.enemies) Profile.seen(e.id);
    Arena.setup(this);
    Gore.clear(); Gore.setGround(STAGE_Y + 4);
    this.hype = this.run.startHype || 0;
    const boss = this.enemies.some(e => e.def.boss);
    // a fight that has not started yet: you come upon them in the wild first
    this.encounterOn = !boss && this.advantage === 'even' && this.opts.encounter !== false && !Game.skipEncounters;
    this.applyAdvantage();
    AudioSys.play(boss ? (['blaze', 'boss1', 'boss2', 'boss3', 'boss3'][this.act - 1] || 'blaze') : this.kind === 'elite' ? 'battle3' : `battle${Math.min(3, Math.ceil(this.act * 0.6))}`, { intensity: this.kind === 'normal' ? 1 : 2, fade: 0.35 });
    Game.worldToScreen = (x, y) => this.cam.toScreen(x, y);
    this.co = Co.run(this.intro(), this);
  }
  // who got the jump on whom, out in the grass, decides how turn one goes
  applyAdvantage() {
    if (this.advantage === 'ambush') {
      for (const e of this.enemies) e.st.vuln = (e.st.vuln || 0) + 2;
      this.energyBonus = (this.energyBonus || 0) + 1;
      this.hype += 15;
      this.flags.ambush = true;
    } else if (this.advantage === 'ambushed') {
      this.player.st.weak = (this.player.st.weak || 0) + 1;
      for (const e of this.enemies) e.st.str = (e.st.str || 0) + 1;
      this.flags.ambushed = true;
    }
  }
  // ------------------------------------------------------------- encounter
  // You walk into a clearing and there they are, and they have not seen you.
  // What you do now decides how the fight opens.
  *encounter() {
    this.phase = 'encounter'; this.busy = true;
    const me = this.me, home = me.x, foes = this.alive(), lead = foes[0];
    for (const e of foes) { e.lookAway = true; e.hold = true; e.actor.x = e.tx; }
    Juice.letterbox(true);
    this.cam.zoom = 1.12; this.cam.lookAt(W / 2 - 20, 300 + CAM_DY * 0.6, true);
    me.x = -90; me.play(Heroes.has(this.heroDef.id, 'walk') ? 'walk' : 'idle');
    yield* Co.over(1.2, k => { me.x = lerp(-90, 120, k); if (chance(0.2)) Particles.dust(me.x - 6, me.y, 1); });
    me.play('idle');
    Emotes.show(me, '!', 0.9); AudioSys.sfx('detect');
    yield 0.4;
    // you start out knowing only how to walk up and say hello; the tricks
    // come with experience - fights won, over every run you have ever had
    const won = (Profile.data.fights || 0);
    const ALL = [
      { id: 'walk', label: 'WALK UP', icon: 'art_foot', desc: 'Just walk over. They see you coming: a {y}fair fight{/}.' },
      { id: 'hello', label: 'SAY HELLO', icon: 'art_heart', desc: 'Wave! Maybe they are {g}charmed{/}... maybe they {r}jump you{/}.' },
      { id: 'charge', label: 'CHARGE', icon: 'art_club', need: 2, desc: 'Straight in swinging: a {y}free hit{/}, then a fair fight.' },
      { id: 'hide', label: 'HIDE', icon: 'v_bush', need: 4, desc: 'Into the bushes. If they walk past, you jump them: {g}ambush{/}.' },
      { id: 'throw', label: 'THROW A ROCK', icon: 'v_rock', need: 7, desc: 'Aim for the head: {y}big damage{/}, and it might {c}stun{/}.' },
      { id: 'sneak', label: 'SNEAK UP', icon: 'art_foot', need: 10, desc: 'Creep closer while they look away. Get there and it is an {g}ambush{/}.' },
    ];
    const open = ALL.filter(o => !o.need || won >= o.need), next = ALL.find(o => o.need && won < o.need);
    if (next) open.push(Object.assign({}, next, { locked: true, desc: `{r}LOCKED{/} - win ${next.need - won} more fight${next.need - won > 1 ? 's' : ''} to learn it.` }));
    this.enc = { choice: -1, t: 0, opts: open };
    yield () => this.enc.choice >= 0 || this.enc.t > 14;
    const pick = this.enc.choice >= 0 ? this.enc.opts[this.enc.choice].id : 'walk';
    this.enc = null; AudioSys.sfx('select');
    const res = yield* this['enc_' + pick](lead, foes);
    if (res === 'ambush') Profile.unlock('ambusher');
    this.advantage = res; this.applyAdvantage();
    for (const e of foes) { e.lookAway = false; e.hold = false; }
    me.play(Heroes.has(this.heroDef.id, 'walk') ? 'walk' : 'idle');
    const from = me.x;
    yield* Co.over(0.45, k => { me.x = lerp(from, home, Ease.inOutQuad(k)); });
    me.play('idle'); me.z = 0; me.sy = 1;
    this.sneak = null; this.bush = null; this.encRock = null;
  }
  *enc_sneak(lead, foes) {
    const me = this.me, x0 = me.x, x1 = lead.actor.x - Gfx.spr(lead.actor.sprite).w * lead.actor.scale * 0.5 - 50;
    const S = this.sneak = { dist: 0, look: 0, warn: 0, calm: rnd(1, 1.8), seen: 0, t: 0 };
    let result = null;
    while (!result) {
      yield 0;
      const dt = Time.dt; S.t += dt;
      if (S.look > 0) { S.look -= dt; if (S.look <= 0) { S.calm = rnd(0.8, 1.9); for (const e of foes) e.lookAway = true; } }
      else if (S.warn > 0) { S.warn -= dt; if (S.warn <= 0) { S.look = rnd(0.7, 1.3); lead.lookAway = false; AudioSys.sfx('detect', { vol: 0.5 }); } }
      else { S.calm -= dt; if (S.calm <= 0) { S.warn = 0.55; Emotes.show(lead.actor, '?', 0.5); lead.actor.stretch(0.1); } }
      const moving = Input.isDown('Space', 'KeyD', 'ArrowRight') || Input.down;
      if (moving) {
        S.dist = Math.min(1, S.dist + dt * 0.3);
        me.x = lerp(x0, x1, S.dist);
        if (me.clipName !== 'walk' && Heroes.has(this.heroDef.id, 'walk')) me.play('walk');
        me.sy = 0.82; if (chance(dt * 6)) Particles.dust(me.x - 6, me.y, 1);
        if (S.look > 0) S.seen += dt; else S.seen = Math.max(0, S.seen - dt * 0.5);
      } else { if (me.clipName === 'walk') me.play('idle'); me.sy = 0.82; }
      if (S.seen > 0.18 || S.t > 14) result = 'ambushed';
      else if (S.dist >= 1) result = 'ambush';
    }
    me.sy = 1;
    if (result === 'ambush') {
      // over the last rock and onto its back
      AudioSys.sfx('whoosh'); me.stretch(0.3);
      const from = me.x;
      yield* Co.over(0.3, k => { me.x = lerp(from, lead.actor.x - 40, k); me.z = Math.sin(k * Math.PI) * 60; });
      me.z = 0;
      Toon.word(lead.actor.x, lead.actor.top - 10, 'SURPRISE!', { size: 1.6, col: '#a8e878', life: 1 });
      yield* this.dealDamage(lead, 6 + this.act * 2, { heavy: true });
    } else yield* this.spotted(foes);
    return result;
  }
  *enc_hide(lead, foes) {
    const me = this.me;
    this.bush = { x: me.x + 16, shake: 0 };
    AudioSys.sfx('whoosh'); me.squash(0.3);
    yield* Co.over(0.25, k => { me.sy = 1 - k * 0.45; });
    // they come looking
    const p = 0.5 + (this.touchedAny('grass') ? 0.15 : 0) + (this.touchedAny('dark') ? 0.1 : 0);
    const ok = this.rng.chance(p);
    for (const e of foes) { e.lookAway = false; Emotes.show(e.actor, '?', 1.4); }
    const starts = foes.map(e => e.actor.x);
    yield* Co.over(1.5, k => { foes.forEach((e, i) => { e.actor.x = starts[i] - 120 * Ease.inOutQuad(k) + Math.sin(k * 20 + i) * 3; }); if (chance(0.06)) AudioSys.sfx('squeak', { vol: 0.3 }); this.bush.shake = Math.sin(k * 30) * (k > 0.7 ? 1 : 0.2); });
    yield 0.4;
    let result;
    if (ok) {
      // they give up and turn away, and you come out of the leaves at them
      for (const e of foes) e.lookAway = true;
      yield 0.5;
      me.sy = 1; me.stretch(0.4); AudioSys.sfx('bighit');
      Toon.word(me.x + 40, me.top - 20, 'BOO!', { size: 1.8, col: '#a8e878', life: 1 });
      this.bush = null;
      yield* this.dealDamage(lead, 5 + this.act * 2, { heavy: true });
      result = 'ambush';
    } else {
      // a snout comes through the leaves
      AudioSys.sfx('roar', lead.def.roar || {}); Emotes.show(lead.actor, '!', 1);
      this.bush.shake = 3; yield 0.3;
      this.bush = null; me.sy = 1;
      yield* Co.over(0.4, k => { me.z = Math.sin(k * Math.PI) * 50; me.x -= 1.2; });
      me.z = 0; Toon.stars(me, 1.4);
      this.damagePlayer(3 + this.act, { from: lead });
      result = 'ambushed';
    }
    const now = foes.map(e => e.actor.x);
    yield* Co.over(0.5, k => foes.forEach((e, i) => { e.actor.x = lerp(now[i], e.tx, k); }));
    return result;
  }
  *enc_walk(lead, foes) {
    const me = this.me, from = me.x;
    me.play(Heroes.has(this.heroDef.id, 'walk') ? 'walk' : 'idle');
    yield* Co.over(0.6, k => { me.x = from + 50 * k; });
    me.play('idle');
    for (const e of foes) { e.lookAway = false; Emotes.show(e.actor, '!', 0.8); }
    AudioSys.sfx('detect');
    yield 0.4;
    return 'even';
  }
  *enc_hello(lead, foes) {
    const me = this.me;
    Toon.word(me.x + 20, me.top - 20, 'HELLO!', { size: 1.8, col: '#ffb0cf', life: 1 });
    AudioSys.sfx('buff');
    for (let i = 0; i < 3; i++) { me.hop(160); me.stretch(0.12); yield 0.22; }
    for (const e of foes) { e.lookAway = false; Emotes.show(e.actor, '?', 1); }
    yield 0.6;
    if (this.rng.chance(0.35)) {
      // ...and they do not know what to make of it
      for (const e of foes) { Toon.hearts(e.actor, 1.4); if (e.alive) this.applyEnemy(e, 'weak', 1, true); }
      Toon.word(lead.actor.x, lead.actor.top - 10, 'CHARMED?', { size: 1.6, col: '#a8e878', life: 1.1 });
      AudioSys.sfx('cheer', { vol: 0.5 });
      yield 0.8;
      return 'even';
    }
    // ...they do
    yield* this.spotted(foes);
    this.damagePlayer(2 + this.act, { from: lead });
    yield 0.3;
    return 'ambushed';
  }
  *enc_charge(lead, foes) {
    const me = this.me;
    AudioSys.sfx('growl'); me.stretch(0.3);
    Toon.word(me.x + 20, me.top - 20, 'RAAAAH!', { size: 1.8, col: '#ffa832', life: 0.9 });
    for (const e of foes) { e.lookAway = false; Emotes.show(e.actor, '!', 0.8); }
    yield 0.3;
    if (this.heroDef.id === 'bronk') this.gainRage(2);
    yield* this.dealDamage(lead, 4 + this.act, { heavy: true });
    return 'even';
  }
  *enc_throw(lead, foes) {
    const me = this.me;
    me.squash(0.3); AudioSys.sfx('pickup');
    yield 0.25;
    me.stretch(0.3); AudioSys.sfx('whoosh');
    const x0 = me.x + 20, y0 = me.top + 10, x1 = lead.actor.x, y1 = lead.actor.top + 20;
    this.encRock = { x: x0, y: y0, r: 0 };
    yield* Co.over(0.5, k => { this.encRock.x = lerp(x0, x1, k); this.encRock.y = lerp(y0, y1, k) - Math.sin(k * Math.PI) * 90; this.encRock.r = k * 12; });
    this.encRock = null;
    const head = this.rng.chance(0.35);
    AudioSys.sfx('bighit'); Juice.shake(10, 0.25); Juice.stop(0.08);
    this.damageEnemy(lead, this.calcDamage(7 + this.act * 2 + (head ? 4 : 0), lead, {}));
    if (head) Profile.unlock('sniper');
    if (head && lead.alive) { this.stun(lead, 1); Toon.word(x1, y1 - 30, 'HEADSHOT!', { size: 1.6, col: '#ffe98a', life: 1 }); }
    for (const e of foes) { e.lookAway = false; if (e !== lead) Emotes.show(e.actor, '!', 0.8); }
    yield 0.5;
    return 'even';
  }
  *spotted(foes) {
    for (const e of foes) { e.lookAway = false; Emotes.show(e.actor, '!', 1); e.actor.stretch(0.2); }
    AudioSys.sfx('roar', foes[0].def.roar || {}); Juice.shake(6, 0.4);
    Toon.word(this.me.x + 20, this.me.top - 16, 'UH OH', { size: 1.4, col: '#ef6a5e', life: 0.9 });
    yield 0.7;
  }
  drawEncounter() {
    const E = this.enc;
    if (E) {
      // four choices, carved on planks
      const n = E.opts.length, gap = 10, bw = Math.min(214, Math.floor((W - 30 - (n - 1) * gap) / n)), x0 = W / 2 - (n * bw + (n - 1) * gap) / 2, y = H - 186;
      E.opts.forEach((o, i) => {
        const x = x0 + i * (bw + gap), k = Ease.outBack(clamp(E.t * 4 - i * 0.3, 0, 1)); if (k <= 0) return;
        const yy = y + (1 - k) * 60, hov = !o.locked && UI.hovered(x, yy, bw, 112);
        if (o.locked) {
          PixUI.panel('obsidian', x, yy, bw, 112, { seed: i + 3 });
          Gfx.sprite(o.icon, x + 44, yy + 34, { anchor: 'c', scale: o.icon.startsWith('art_') ? 1.5 : 1.2, tint: '#08060c', tintAmount: 0.85 });
          Gfx.text(o.label, x + 76, yy + 24, { color: '#7a6d8a', scale: o.label.length > 9 && bw < 200 ? 1 : 1.4 });
          Gfx.wrap(o.desc, bw - 24, 1).forEach((L, j) => Gfx.rich(L, x + 12, yy + 62 + j * 13, { color: '#a79bb4' }));
          return;
        }
        PixUI.panel(hov ? 'woodhot' : 'wood', x, yy - (hov ? 4 : 0), bw, 112, { seed: i + 3, hot: hov });
        Gfx.sprite(o.icon, x + 44, yy + 34 - (hov ? 4 : 0), { anchor: 'c', scale: o.icon.startsWith('art_') ? 1.5 : 1.2 });
        PixUI.panel('stone', x + 8, yy + 8 - (hov ? 4 : 0), 22, 22, { seed: i, cut: 2, moss: false });
        Gfx.text(String(i + 1), x + 19, yy + 12 - (hov ? 4 : 0), { color: '#5c3a20', align: 'center', font: 'rock' });
        Gfx.text(o.label, x + 76, yy + 24 - (hov ? 4 : 0), { color: '#ffe0a8', scale: o.label.length > 9 && bw < 200 ? 1 : 1.4 });
        Gfx.wrap(o.desc, bw - 24, 1).forEach((L, j) => Gfx.rich(L, x + 12, yy + 62 + j * 13 - (hov ? 4 : 0), { color: '#e8dfc6' }));
        UI.hit(x, yy, bw, 112, () => { if (E.choice < 0 && E.t > 0.4 && !o.locked) E.choice = i; });
      });
      PixUI.panel('obsidian', W / 2 - 110, 70, 220, 30, { seed: 5 });
      Gfx.text("THEY HAVEN'T SEEN YOU", W / 2, 78, { color: '#ffe98a', align: 'center', font: 'rock' });
    }
    if (this.sneak) {
      const S = this.sneak, lead = this.alive()[0];
      if (lead) {
        // the eye over the one that might turn round
        const p = this.cam.toScreen(lead.actor.x, lead.actor.top - 30), open = S.look > 0 ? 1 : S.warn > 0 ? 0.5 : 0;
        PixUI.panel(open === 1 ? 'red' : 'obsidian', p.x - 26, p.y - 16, 52, 32, { seed: 2 });
        if (open === 0) Gfx.rect(p.x - 14, p.y - 1, 28, 3, '#a79bb4');
        else { Gfx.rect(p.x - 14, p.y - 6 * open, 28, 12 * open, '#fffaea'); Gfx.rect(p.x - 4, p.y - 5 * open, 8, 10 * open, open === 1 ? '#c2333c' : '#120c16'); }
      }
      PixUI.panel('obsidian', W / 2 - 150, H - 110, 300, 44, { seed: 7 });
      Gfx.text(Input.touch ? 'HOLD TO CREEP' : 'HOLD SPACE TO CREEP', W / 2, H - 104, { color: '#ffe98a', align: 'center', font: 'rock' });
      Gfx.rect(W / 2 - 130, H - 84, 260, 8, '#241109'); Gfx.rect(W / 2 - 130, H - 84, Math.round(260 * S.dist), 8, '#a8e878');
      if (S.seen > 0) Gfx.rect(W / 2 - 130, H - 76, Math.round(260 * clamp(S.seen / 0.18, 0, 1)), 4, '#ef6a5e');
    }
  }
  exit() { Co.stop(this.co); Game.worldToScreen = null; Juice.letterbox(false); Backdrops.scene = null; }
  spawn(id, initial) {
    const e = Enemies.make(id, this.rng, this.act);
    // a little tougher than they were
    e.maxHp = Math.round(e.maxHp * 1.2); e.hp = e.maxHp;
    e.actor.y = STAGE_Y; e.spawnT = initial ? 0 : 1;
    // as big as it is meant to be, unless that would push its head (and what
    // it is about to do) up under the top bar
    const room = this.cam.toScreen(0, STAGE_Y).y - 84;
    e.actor.scale = Math.min(e.def.bossScale || (e.def.boss ? 1.5 : ACTOR_SCALE), room / Gfx.spr(e.actor.sprite).h);
    this.enemies.push(e); if (!initial) this.layout();
    return e;
  }
  layout() {
    const alive = this.enemies.filter(e => e.alive);
    const widths = alive.map(e => Gfx.spr(e.actor.sprite).w * e.actor.scale);
    const sum = widths.reduce((a, b) => a + b, 0);
    const room = W - 530;                       // right-hand half of the stage
    const gap = alive.length > 1 ? clamp((room - sum) / (alive.length - 1), -34, 30) : 0;
    let x = W - 66;
    for (let i = alive.length - 1; i >= 0; i--) {
      const e = alive[i];
      e.tx = x - widths[i] / 2;
      e.actor.y = STAGE_Y + (i % 2 ? 10 : 0);   // slight stagger so rows read
      x -= widths[i] + gap;
      if (!e.actor.x) e.actor.x = e.tx + 180;
      e.actor.facing = -1;
    }
    for (let i = 0; i < alive.length; i++) alive[i].offset = i;
  }
  alive() { return this.enemies.filter(e => e.alive); }
  randomEnemy() { const a = this.alive(); return a.length ? this.rng.pick(a) : null; }
  // -------------------------------------------------------------------- flow
  *intro() {
    this.busy = true;
    if (this.encounterOn) { yield* this.encounter(); this.phase = 'intro'; }
    Juice.letterbox(true);
    this.cam.zoom = 1.7; this.cam.lookAt(W - 240, 350 + CAM_DY * 0.5, true);
    yield 0.35;
    const lead = this.enemies[0];
    AudioSys.sfx('roar', lead.def.roar || {});
    Juice.shake(lead.def.boss ? 14 : 7, 0.5);
    lead.actor.squash(0.2);
    const sub = this.advantage === 'ambush' ? 'YOU GOT THE JUMP ON IT'
      : this.advantage === 'ambushed' ? 'IT SAW YOU COMING'
        : lead.def.boss ? (lead.def.title || 'BOSS') : lead.def.elite ? 'ELITE'
          : `${this.enemies.length} BEAST${this.enemies.length > 1 ? 'S' : ''}`;
    this.banner = { text: lead.name, sub, t: 0, life: lead.def.boss ? 2.4 : 1.5 };
    if (this.advantage === 'ambush') {
      Popups.add(W / 2, 168, '+1 ENERGY   ENEMIES VULNERABLE', '#a8e878', { world: false, scale: 1.4, life: 2.4 });
      Juice.flash('#ffe98a', 0.3, 3);
    } else if (this.advantage === 'ambushed') {
      Popups.add(W / 2, 168, 'YOU ARE WEAKENED   IT IS STRONGER', '#ef6a5e', { world: false, scale: 1.4, life: 2.4 });
    }
    this.cam.zoomTo(1.35);
    yield lead.def.boss ? 1.5 : 0.85;
    this.cam.zoomTo(1); this.cam.lookAt(W / 2, 288 + CAM_DY);
    Juice.letterbox(false);
    yield 0.4;
    // the ground you came in on
    if (this.wetFeet && Relics.has('wet_feet')) Popups.add(W / 2, 200, 'WET FEET: NEXT LIGHTNING x2', '#6aa9ee', { world: false, scale: 1.4, life: 2.2 });
    if (this.band.includes('bronk') && this.heroDef.id !== 'bronk') { this.gainBlock(8); Popups.add(this.me.x - 120, this.me.top - 20, 'BIG HUG', '#ff8a3a'); }
    yield* Relics.trigger('onCombatStart', this);
    yield* this.startTurn();
  }
  *startTurn() {
    this.turn++; this.phase = 'player'; this.played = 0; this.flags = {};
    if (this.turn > 1) this.player.block = 0;
    this.energy = this.maxEnergy + Relics.mod('energy') + (this.powers.groove || 0) + (this.turn === 1 ? (this.energyBonus || 0) : 0);
    if (this.powers.anthem) this.addHype(this.powers.anthem);
    for (const e of this.alive()) e.intent = Enemies.pickMove(e, this, this.rng);
    Arena.eye(this);
    this.drawCards(this.handSize + Relics.mod('draw') + (this.turn === 1 ? (this.drawBonus || 0) : 0));
    // last turn's horn blasts come back round the cave
    for (const s of this.echoNext) {
      if (this.hand.length >= 10) break;
      const e = Cards.make(s.id, s.up); e.echoCopy = true; e.cost = 0;
      if (!this.powers.fullEcho) for (const k of ['dmg', 'block', 'weak', 'vuln', 'draw', 'soak']) if (typeof e.v[k] === 'number' && e.v[k] > 1) e.v[k] = Math.ceil(e.v[k] / 2);
      e.name = e.def.name + ' (echo)'; e.dealT = 0.4;
      this.hand.push(e);
    }
    if (this.echoNext.length) { AudioSys.sfx('stun'); Popups.add(W / 2, H - 200, 'ECHO!', '#86e8d2', { world: false, scale: 1.6 }); }
    this.echoNext = [];
    yield 0.18;
    if (this.powers.mother) this.gainBlock(this.powers.mother);
    if (this.powers.rain) for (const e of this.alive()) this.applyEnemy(e, 'soak', this.powers.rain, true);
    if (this.powers.bug) { const e = this.randomEnemy(); if (e) { this.damageEnemy(e, this.powers.bug, { src: 'band' }); AudioSys.sfx('hit'); yield 0.15; } }
    if (this.band.includes('vela') && this.heroDef.id !== 'vela') { const e = this.randomEnemy(); if (e) this.applyEnemy(e, 'weak', 1); }
    if (this.band.includes('pebble') && this.heroDef.id !== 'pebble') { const e = this.randomEnemy(); if (e) { yield 0.12; this.damageEnemy(e, 2 + this.act, { src: 'band' }); AudioSys.sfx('hit'); yield 0.2; } }
    yield* Relics.trigger('onTurnStart', this);
    this.checkDeaths();
    if (!this.alive().length) { yield* this.victory(); return; }
    this.busy = false;
  }
  endTurn() { if (this.busy || this.phase !== 'player') return; this.selected = null; this.preview = null; Co.run(this.enemyTurn(), this); }
  *enemyTurn() {
    this.busy = true; this.phase = 'enemy'; AudioSys.sfx('whoosh');
    if (this.powers.hide) this.gainBlock(this.powers.hide);
    if (this.player.st.regen) this.heal(this.player.st.regen);
    yield* Relics.trigger('onTurnEnd', this);
    while (this.hand.length) this.discard.push(this.hand.pop());
    yield 0.3;
    // a beast that had its eye on a prop grabs it first
    yield* Arena.enemyTurn(this);
    if (this.hp <= 0) { yield* this.defeat(); return; }
    this.checkDeaths();
    if (!this.alive().length) { yield* this.victory(); return; }
    for (const e of this.enemies.slice()) {
      if (!e.alive) continue;
      if (e.st.burn > 0) { AudioSys.sfx('fire_whoosh'); this.damageEnemy(e, e.st.burn, { src: 'burn', fire: true, pierce: true }); e.st.burn--; yield 0.3; if (!e.alive) continue; }
      if (e.st.stun > 0) { e.st.stun--; Popups.add(e.actor.x, e.actor.top - 20, 'STUNNED', '#ffe98a', { scale: 1.4 }); AudioSys.sfx('stun'); yield 0.45; e.turnCount++; continue; }
      e.block = 0;
      yield* this.enemyAct(e);
      e.turnCount++; e.lastMove = e.intent ? e.intent.key : null;
      if (e.st.weak > 0) e.st.weak--; if (e.st.vuln > 0) e.st.vuln--;
      if (e.st.soak > 0 && !this.powers.rain) e.st.soak = Math.max(0, e.st.soak - 1);
      if (this.hp <= 0) { yield* this.defeat(); return; }
      yield 0.22;
    }
    if (this.player.st.weak > 0) this.player.st.weak--;
    if (this.player.st.vuln > 0) this.player.st.vuln--;
    this.checkDeaths();
    if (!this.alive().length) { yield* this.victory(); return; }
    yield* this.startTurn();
  }
  *enemyAct(e) {
    const m = e.intent; if (!m) return;
    this.cam.lookAt(lerp(W / 2, e.actor.x, 0.5), 300 + CAM_DY); this.cam.zoomTo(1.1);
    Popups.add(e.actor.x, e.actor.top - 26, m.name, '#fffaea', { vy: -18, life: 1 });
    yield 0.25;
    if (m.block) { e.block += m.block; AudioSys.sfx('block'); Popups.add(e.actor.x, e.actor.y - 50, `+${m.block}`, '#6aa9ee'); e.actor.squash(0.12); yield 0.25; }
    if (m.str) { e.st.str += m.str; AudioSys.sfx('buff'); Popups.add(e.actor.x, e.actor.y - 60, `+${m.str} STR`, '#ef6a5e'); e.actor.stretch(0.16); yield 0.25; }
    if (m.heal) { const h = Math.min(m.heal, e.maxHp - e.hp); e.hp += h; AudioSys.sfx('heal'); Popups.add(e.actor.x, e.actor.y - 70, `+${h}`, '#a8e878', { scale: 1.6 }); yield 0.3; }
    if (m.dmg) {
      const hits = m.hits || 1;
      for (let i = 0; i < hits; i++) {
        const home = e.actor.x;
        // it rears back before it comes at you
        e.actor.squash(0.14); yield* Co.over(i ? 0.06 : 0.12, k => { e.actor.x = home + 14 * Ease.outQuad(k); }, null);
        e.actor.stretch(0.12);
        yield* Co.over(0.16, k => { e.actor.x = lerp(home + 14, home - 90, Ease.inCubic(k)); }, null);
        FX.slash(this.me.x + 30, this.me.cy, { flip: true, scale: 1.2 });
        this.damagePlayer(this.previewEnemyDamage(e, m.dmg), { from: e });
        if (this.player.st.thorns > 0 && e.alive) this.damageEnemy(e, this.player.st.thorns, { src: 'thorns' });
        yield* Co.over(0.22, k => { e.actor.x = lerp(home - 90, home, Ease.outCubic(k)); }, null);
        e.actor.x = home;
        if (this.hp <= 0) return;
        if (hits > 1) yield 0.08;
      }
    }
    if (m.weakP) { this.applyPlayer('weak', m.weakP); yield 0.2; }
    if (m.vulnP) { this.applyPlayer('vuln', m.vulnP); yield 0.2; }
    if (m.burnP) { this.damagePlayer(m.burnP * 3, { from: e, fire: true }); yield 0.2; }
    if (m.summon) {
      for (let i = 0; i < (m.summonN || 1); i++) { if (this.alive().length >= 4) break; const s = this.spawn(m.summon); s.intent = null; AudioSys.sfx('summon'); FX.burst(s.actor.x, s.actor.cy, { scale: 1.4 }); yield 0.25; }
      this.layout(); yield 0.3;
    }
    this.cam.lookAt(W / 2, 288 + CAM_DY); this.cam.zoomTo(1);
  }
  *victory() {
    if (this.won) return; this.won = true;
    this.phase = 'won'; this.busy = true; this.selected = null;
    // the final blow, in slow motion: push in on it, flash, K.O.
    const last = this.lastKill;
    if (last && last.fatalPending) {
      yield* Fatality.run(this, last);
      last.fatalPending = false;
    } else if (last) {
      Juice.letterbox(true);
      this.cam.lookAt(last.actor.x, last.actor.cy); this.cam.zoomTo(1.9);
      Juice.flash('#ffffff', 0.6, 2.2); Juice.stop(0.3); AudioSys.sfx('bighit');
      Toon.word(last.actor.x, last.actor.top - 10, 'K.O.!', { size: 3, col: '#ffe98a', burst: '#c2333c', life: 1.1 });
      yield 0.75;
    }
    AudioSys.stop(0.7); AudioSys.sfx('victory');
    this.me.play('play');
    Juice.letterbox(true);
    this.cam.lookAt(this.me.x + 40, 300 + CAM_DY * 0.5); this.cam.zoomTo(1.6);
    for (let i = 0; i < 40; i++) { Particles.confetti(rnd(0, W), -10, 2); }
    yield 0.4;
    Profile.add('fights');
    yield* Relics.trigger('onCombatEnd', this);
    if (this.band.includes('roxy') && this.heroDef.id !== 'roxy') this.heal(5, true);
    if (this.powers.hungry) this.heal(this.powers.hungry, true);
    this.banner = { text: 'ENCORE!', sub: 'the valley is still standing', t: 0, life: 1.6 };
    yield 1.5;
    Game.combatWon(this);
  }
  *defeat() {
    this.phase = 'lost'; this.busy = true; AudioSys.stop(0.8); AudioSys.sfx('defeat');
    this.me.play('hurt');
    Juice.letterbox(true); this.cam.zoomTo(1.6); this.cam.lookAt(this.me.x, 340);
    this.banner = { text: 'DOWN', sub: 'the music stops', t: 0, life: 2.4 };
    yield 2.3;
    Game.go(new GameOverScene());
  }
  // --------------------------------------------------------------- card play
  canPlay(c) { return !this.busy && this.phase === 'player' && c.cost <= this.energy && !this.flags.crashed; }
  tapCard(c) {
    if (Input.touch && this.preview !== c) { this.preview = c; AudioSys.sfx('card_deal'); return; }
    this.preview = null;
    this.selectCard(c);
  }
  selectCard(c) {
    if (!this.canPlay(c)) { if (c.cost > this.energy) { AudioSys.sfx('error'); Popups.add(W / 2, H - 200, 'NOT ENOUGH ENERGY', '#ef6a5e', { world: false, scale: 1.3 }); } return; }
    if (c.def.target === 'enemy') {
      const a = this.alive();
      if (a.length === 1) return this.play(c, a[0]);
      this.selected = this.selected === c ? null : c; AudioSys.sfx('select');
    } else this.play(c, null);
  }
  play(card, target) {
    if (!this.canPlay(card)) return;
    this.selected = null; this.preview = null;
    Co.run(this.playCo(card, target), this);
  }
  *playCo(card, target) {
    this.busy = true; this.energy -= card.cost; this.played++;
    const i = this.hand.indexOf(card); if (i >= 0) this.hand.splice(i, 1);
    AudioSys.sfx('card');
    this.playing = card;
    let r = null;
    // only the big moves go to the instrument; the rest are just done
    if (card.def.riff) r = yield* this.riffCo(card, target);
    else yield* this.moveCo(card, target);
    yield* card.def.effect(this, card, target, r);
    this.moveStyle = null;
    if (card.def.echo && !card.echoCopy) this.echoNext.push({ id: card.id, up: card.up });
    if (this.powers.rkid) this.gainBlock(this.powers.rkid);
    if (Relics.has('skull_bongos') && this.played % 3 === 0) { const e = this.randomEnemy(); if (e) { this.flashRelic(RELICS.skull_bongos); this.damageEnemy(e, 4, { src: 'relic' }); AudioSys.sfx('hit'); } }
    if (card.def.type !== 'special') yield* Relics.trigger('onCardPlayed', this, card);
    this.playing = null;
    if (card.def.type === 'power' || card.def.type === 'special') { }
    else if (card.echoCopy) { }
    else if (card.def.exhaust && !card.v.noExhaust) this.exhaust.push(card);
    else this.discard.push(card);
    this.checkDeaths();
    yield 0.08;
    if (!this.alive().length) { yield* this.victory(); return; }
    if (this.hp <= 0) { yield* this.defeat(); return; }
    this.busy = false;
  }
  // the cinematic: cut in, play, cut out
  *riffCo(card, target) {
    this.phase = 'riff';
    AudioSys.sfx('zoom_in');
    Juice.letterbox(true);
    this.me.play('play');
    const foe = target || this.alive()[0];
    // push in on Bronk, then settle so both performers are on screen
    this.cam.zoomTo(1.55); this.cam.lookAt(this.me.x + 40, 330);
    Juice.punch(0.05);
    yield 0.34;
    Juice.letterbox(false);
    this.cam.zoomTo(1.06); this.cam.lookAt(W / 2, 372);
    const windowMul = 1 + Relics.mod('window') + (this.band.includes('roxy') ? 0.12 : 0) + (this.flags.tuned ? 0.75 : 0);
    this.me.play(this.heroDef && SPRITES[this.heroDef.base + '_play'] ? 'play' : 'idle');
    this.flags.tuned = false;
    let done = false, result = null;
    // how this card wants to be played
    const STY = { attack: 'smash', skill: 'guard', power: 'echo', rally: 'hype', special: 'strike' };
    const style = card.def.riffStyle || (card.def.riff ? (card.def.riff.callResponse ? 'echo' : 'strike') : STY[card.def.type] || 'guard');
    const cfg = card.def.riff || { bars: 1, density: card.def.type === 'attack' ? 1 : 0, callResponse: style === 'echo' };
    this.riff = new Riff({
      bars: cfg.bars, density: cfg.density, callResponse: cfg.callResponse, style,
      title: card.name.toUpperCase(), windowMult: windowMul, act: this.act, encore: card.id === 'encore', inst: card.def.inst, key: card.id,
      onNote: (rating, n) => {
        if (!rating) { this.me.flash('#ef6a5e', 0.1); Juice.shake(3, 0.1); return; }
        this.me.squash(0.12);
        this.addHype(rating === RATINGS[0] ? 4 : 2);
        if (this.riff) Co.run(Relics.trigger('onCombo', this, this.riff.combo), this);
      },
      onDone: r => { result = r; done = true; },
    });
    yield () => done;
    const r = result;
    const g = r.grade;
    Popups.add(W / 2, 250, `${g}  ${Math.round(r.acc * 100)}%`, g[0] === 'S' ? '#ffe98a' : g === 'A' ? '#a8e878' : g === 'F' ? '#ef6a5e' : '#ffffff', { world: false, scale: 2.6, life: 1.3, vy: -30 });
    if (r.fc) Popups.add(W / 2, 300, 'FULL COMBO!', '#86e8d2', { world: false, scale: 1.6, life: 1.3, vy: -20 });
    if (g[0] === 'S') { AudioSys.sfx('cheer'); for (let i = 0; i < 24; i++) Particles.confetti(rnd(W * 0.3, W * 0.7), 80, 1); }
    yield 0.45;
    this.riff = null; this.phase = 'player';
    Juice.letterbox(false);
    this.cam.zoomTo(1); this.cam.lookAt(W / 2, 288 + CAM_DY);
    this.me.play('idle');
    this.run.stats.notes += r.notes; this.run.stats.sick += r.sick;
    return r;
  }
  playEncore() {
    if (this.busy || this.phase !== 'player' || !this.encoreReady) return;
    this.encoreReady = false; this.hype = 0; this.selected = null;
    Co.run(this.playCo(Cards.make('encore'), null), this);
  }
  // -------------------------------------------------------------- card hooks
  riffDamage(card, r, base) {
    if (base === undefined) base = card.v.dmg;
    if (!r) return base;
    let d = Math.round(base * r.mult);
    d += (card.v.sickBonus || 0) * r.sick + (this.powers.sick || 0) * r.sick;
    return d;
  }
  previewDamage(base) { let d = base + this.player.st.str + (this.rage || 0); if (this.player.st.weak > 0) d *= 0.75; if (this.powers.amp) d *= 1 + this.powers.amp; return Math.max(0, Math.floor(d)); }
  calcDamage(base, t, o = {}) {
    let d = this.previewDamage(base);
    if (o.noRage) d -= this.rage || 0;
    if (t && t.st.vuln > 0) d = Math.floor(d * 1.5);
    if (o.el === 'lightning') {
      if (this.powers.storm) d = Math.floor(d * (1 + this.powers.storm));
      if (t && t.st.soak > 0) { d *= 2; t.st.soak--; Popups.add(t.actor.x, t.actor.top - 30, 'SOAKED x2', '#6aa9ee', { scale: 1.4 }); }
      if (this.wetFeet && Relics.has('wet_feet')) { d *= 2; this.wetFeet = false; this.flashRelic(RELICS.wet_feet); Popups.add(this.me.x, this.me.top - 40, 'WET FEET x2', '#6aa9ee', { scale: 1.6 }); }
    }
    return Math.max(0, d);
  }
  // what the board did to you, for the cards that care
  touchedAny(k) { return (this.touched[k] || 0) > 0 || this.terrain === k; }
  gainRage(n, quiet) {
    if (this.heroDef.id !== 'bronk' || n <= 0) return;
    const was = this.rage; this.rage = Math.min(12, this.rage + n);
    if (this.rage > was) {
      if (!quiet) { Popups.add(this.me.x + 30, this.me.top - 10, `+${this.rage - was} RAGE`, '#ff6a4a', { scale: 1.5 }); AudioSys.sfx('buff'); }
      this.me.flash('#ff6a4a', 0.12);
      if (this.powers.unstop) this.gainBlock(this.powers.unstop * (this.rage - was));
    }
  }
  selfHarm(n) { this.hp = Math.max(1, this.hp - n); Popups.add(this.me.x, this.me.cy - 20, `-${n}`, '#ef6a5e', { scale: 1.6 }); this.gainRage(n > 0 ? 1 : 0); }
  previewEnemyDamage(e, base) { let d = Math.round(base * 1.2) + e.st.str; if (e.st.weak > 0) d *= 0.75; if (this.player.st.vuln > 0) d *= 1.5; d -= Relics.mod('reduce'); return Math.max(0, Math.floor(d)); }
  // A card that is not a riff is simply done - but done with a show. Its
  // name slams up like a fighting game, and the hero moves the way the card
  // reads: a headbutt rears back and snaps forward, a belly flop goes up and
  // comes down on them, a club swing spins, a guard plants and braces, a
  // rally whips the crowd up. dealDamage reads moveStyle for the attack.
  *moveCo(card, target) {
    const d = card.def, art = d.art || '', me = this.me;
    const ms = d.moveStyle || (d.type === 'attack' ? (/skull|bolt/.test(art) ? 'butt' : /foot/.test(art) ? 'flop' : /club|boulder/.test(art) ? 'swing' : 'rush') : d.type === 'skill' ? 'brace' : 'cheer');
    this.moveStyle = ms;
    if (Game.testFast) return;
    const col = { attack: '#ffa832', skill: '#6aa9ee', rally: '#ffb0cf', power: '#b177e6' }[d.type] || '#ffe98a';
    Toon.word(W / 2, 190, card.name.toUpperCase() + '!', { size: 2.2, col, life: 0.95 });
    AudioSys.sfx(d.type === 'attack' ? 'whoosh' : 'buff', { vol: 0.7 });
    if (ms === 'brace') {
      // feet planted, chest out, the stone rising in front
      me.squash(0.22); yield 0.08; me.stretch(0.12);
      Particles.dust(me.x + 20, STAGE_Y, 10); Juice.shake(4, 0.12);
      for (let i = 0; i < 10; i++) Particles.spawn(me.x + 30, me.y - 20 - i * 6, { n: 1, color: ['#6aa9ee', '#a8d8ff', '#ffffff'], speed: 60, angle: 0, spread: 0.6, life: 0.4, size: 3, sizeEnd: 0, gravity: 0 });
      yield 0.12;
    } else if (ms === 'cheer') {
      // a jump, both fists up, and the valley roars
      me.hop(320); me.stretch(0.2);
      for (let i = 0; i < 14; i++) Particles.confetti(me.x + rnd(-40, 40), me.top - 10, 1);
      AudioSys.sfx('cheer', { vol: 0.5 });
      yield 0.3;
    } else yield 0.06;
  }
  *dealDamage(t, amount, o = {}) {
    if (!t || !t.alive) { t = this.randomEnemy(); if (!t) return 0; }
    const home = this.me.x, heavy = o.heavy || amount >= 12;
    // the camera goes in with you: a push for a jab, a close-up for a beating
    const cine = !o.quick && !this.riff;
    if (cine) { this.cam.lookAt(lerp(home, t.actor.x, 0.62), t.actor.cy + 30); this.cam.zoomTo(heavy ? 1.5 : 1.22); }
    if (!o.projectile) {
      // the wind-up: rock back, crouch, then go - each move its own way
      const me = this.me, ms = o.quick ? null : this.moveStyle, f = me.facing;
      if (!o.quick) {
        me.squash(heavy || ms === 'flop' ? 0.24 : 0.12);
        yield* Co.over(heavy || ms ? 0.13 : 0.07, k => { me.x = home - (heavy || ms ? 18 : 9) * Ease.outQuad(k); if (ms === 'butt') me.rot = -0.4 * f * Ease.outQuad(k); if (ms === 'swing') me.rot = -0.5 * f * k; });
      }
      const from = me.x, tx = t.actor.x - 90;
      me.stretch(0.16);
      if (ms === 'flop') {
        // up, over, and down belly-first on top of it
        AudioSys.sfx('whoosh');
        yield* Co.over(0.36, k => { me.x = lerp(from, tx + 30, k); me.z = Math.sin(k * Math.PI) * 95; me.rot = f * Ease.inQuad(k) * 1.45; me.sy = 1 + Math.cos(k * Math.PI) * 0.12; });
        me.z = 0; me.squash(0.4); Juice.shake(12, 0.25);
        Particles.dust(t.actor.x - 20, STAGE_Y, 14); Particles.dust(t.actor.x + 30, STAGE_Y, 10);
      } else if (ms === 'butt') {
        // the head comes forward like a rock off a cliff
        yield* Co.over(0.12, k => { me.x = lerp(from, tx + 12, Ease.inQuad(k)); me.rot = lerp(-0.4, 0.55, Ease.inQuad(k)) * f; });
        if (typeof Toon !== 'undefined') Toon.stars(t.actor, 1.6);
      } else if (ms === 'swing') {
        // a full spin into it
        yield* Co.over(0.2, k => { me.x = lerp(from, tx, Ease.inQuad(k)); me.rot = (-0.5 + k * (Math.PI * 2 + 0.5)) * f; });
        me.rot = 0;
      } else yield* Co.over(o.quick ? 0.09 : 0.13, k => { me.x = lerp(from, tx, Ease.inQuad(k)); });
      if (heavy && !o.quick) {
        // two quick ones first, then the real one
        for (let i = 0; i < 2; i++) {
          this.me.x += 8; this.me.squash(0.12); t.hitT = 0.06; t.shake = 4;
          AudioSys.sfx('hit', { vol: 0.6 }); Juice.stop(0.04); Juice.shake(4, 0.08);
          Gore.spray(t.actor.x - 10, t.actor.cy - 10 + i * 12, { n: 8, col: Gore.colOf(t), dir: -0.6 + i * 0.5, speed: 200 });
          yield 0.09; this.me.x -= 8;
        }
      }
    } else {
      Particles.spawn(this.me.x + 30, this.me.cy, { n: 8, color: ['#9391a6', '#bdbccd'], angle: 0, spread: 0.25, speed: 520, gravity: 90, life: 0.25 });
      yield 0.13;
    }
    const dmg = this.calcDamage(amount, t, o);
    this.damageEnemy(t, dmg, o);
    if (o.el === 'lightning') { Juice.flash('#e8f4ff', 0.25, 6); AudioSys.sfx('zap'); }
    FX.slash(t.actor.x - 20, t.actor.cy, { scale: o.heavy ? 1.6 : 1.1, rot: rnd(-0.3, 0.3) });
    AudioSys.sfx(o.heavy ? 'bighit' : 'hit');
    Juice.stop(o.heavy ? 0.09 : 0.045);
    Juice.shake(o.heavy ? 11 : 6, 0.22);
    Juice.punch(o.heavy ? 0.05 : 0.025);
    if (t.alive || t.fatalPending) t.actor.x += heavy ? 34 : 14;          // knocked back; it slides home
    if (!o.projectile) { const rx = this.me.x, r0 = this.me.rot; yield* Co.over(this.moveStyle === 'flop' ? 0.3 : 0.2, k => { this.me.x = lerp(rx, home, Ease.outBack(k)); this.me.rot = r0 * (1 - k); this.me.z = this.moveStyle === 'flop' ? Math.sin(k * Math.PI) * 30 : 0; }); }
    this.me.x = home; this.me.rot = 0; this.me.z = 0;
    if (cine) { this.cam.zoomTo(1); this.cam.lookAt(W / 2, 288 + CAM_DY); }
    yield o.quick ? 0.06 : 0.14;
    return dmg;
  }
  *dealAll(amount, o = {}) {
    const me = this.me, home = me.x, foes = this.alive();
    if (this.moveStyle === 'flop' && foes.length && !Game.testFast) {
      // up over the lot of them, and down in the middle, belly first
      const mid = foes.reduce((a, e) => a + e.actor.x, 0) / foes.length - 40, f = me.facing;
      me.squash(0.25); yield 0.1; AudioSys.sfx('whoosh');
      yield* Co.over(0.42, k => { me.x = lerp(home, mid, k); me.z = Math.sin(k * Math.PI) * 120; me.rot = f * Ease.inQuad(k) * 1.5; });
      me.z = 0; me.squash(0.45); Juice.shake(14, 0.35); Juice.stop(0.08); AudioSys.sfx('bighit');
      for (const e of foes) Particles.dust(e.actor.x, STAGE_Y, 12);
      Particles.dust(mid, STAGE_Y, 20);
      for (const e of this.alive()) { this.damageEnemy(e, this.calcDamage(amount, e, o), o); e.actor.hop && e.actor.hop(180); }
      yield 0.25;
      const rx = me.x;
      yield* Co.over(0.35, k => { me.x = lerp(rx, home, Ease.outQuad(k)); me.z = Math.sin(k * Math.PI) * 40; me.rot = f * 1.5 * (1 - k); });
      me.x = home; me.z = 0; me.rot = 0;
      yield 0.1;
      return;
    }
    this.me.stretch(0.2);
    FX.ring(W / 2, 300, { scale: 3, fps: 14 });
    yield 0.12;
    for (const e of this.alive()) { this.damageEnemy(e, this.calcDamage(amount, e, o), o); FX.burst(e.actor.x, e.actor.cy, { scale: 1.3 }); }
    AudioSys.sfx('bighit'); Juice.shake(12, 0.4); Juice.stop(0.08); Juice.punch(0.06);
    yield 0.3;
  }
  damageEnemy(e, amount, o = {}) {
    if (!e.alive) return 0;
    let dmg = Math.max(0, Math.round(amount));
    if (!o.pierce && e.block > 0) {
      const b = Math.min(e.block, dmg); e.block -= b; dmg -= b;
      if (b > 0) { AudioSys.sfx('block'); Popups.add(e.actor.x + 18, e.actor.cy, `-${b}`, '#6aa9ee'); }
    }
    e.hp -= dmg; e.hitT = 0.16; e.actor.flash('#ffffff', 0.12); e.actor.squash(0.2); e.actor.tiltV = (e.actor.tiltV || 0) + clamp(3 + dmg / 3, 3, 9); e.shake = 6;
    if (dmg >= 12) {                                      // a big one gets a cartoon star
      const p2 = this.cam.toScreen(e.actor.x, e.actor.cy);
      Juice.pow(p2.x, p2.y, { r: 40 + Math.min(40, dmg), spikes: 11, col: '#ffe98a' });
    }
    Popups.add(e.actor.x + rnd(-10, 10), e.actor.cy - 10, String(dmg), dmg === 0 ? '#7a6d8a' : o.fire ? '#ffa832' : '#ffffff', { scale: dmg >= 18 ? 2.6 : 1.8, shake: dmg >= 18 ? 1.5 : 0 });
    if (dmg > 0) {
      const col = o.fire ? ['#9c3510', '#e06a1b', '#ffa832', '#ffe08a'] : Gore.colOf(e);
      Gore.spray(e.actor.x + rnd(-10, 10), e.actor.cy, { n: Math.min(46, 8 + dmg * 1.6), col, dir: -0.55, spread: 0.9, speed: 220 + Math.min(260, dmg * 9) });
      if (dmg >= 15) Gore.splash(2 + (dmg >= 25 ? 3 : 0), col);
    }
    if (e.def.onHurt && e.alive) e.def.onHurt(e, this);
    if (e.hp <= 0) { e.hp = 0; this.kill(e); }
    return dmg;
  }
  kill(e) {
    if (!e.alive) return;
    e.alive = false; e.dieT = 0.01; e.intent = null; this.lastKill = e;
    for (const p of this.props || []) if (p.eyed === e) p.eyed = null;
    AudioSys.sfx('die'); Juice.stop(0.1); Juice.shake(8, 0.3);
    if (!e.def.boss) Profile.kill(e.id);
    const a = e.actor, col = Gore.colOf(e);
    const bossFight = this.enemies.some(x => x.def.boss);
    if (e.def.boss) {
      // bosses are knocked out, not killed: they sit by the fire later
      e.ko = true; Toon.stars(a, 99);
    } else if (!this.alive().length && !bossFight) {
      // the last one stands there, swaying: it is waiting for its fatality
      e.fatalPending = true; Toon.stars(a, 99);
    } else if (this.rng.chance(0.4)) {
      // a brutality: it just comes apart
      e.gibbed = true;
      if (this.rng.chance(0.5)) Gore.gib(a.sprite, a.frame, a.scale, true, a.x, a.y, col, 3, 3, 0.9);
      else { Profile.add('beheads'); const n = Gore.behead(a.sprite, a.frame, a.scale, true, a.x, a.y, col); Gore.spray(n.neckX, n.neckY, { n: 40, col, speed: 380, dir: -Math.PI / 2, spread: 0.3 }); }
      Gore.splash(3, col); AudioSys.sfx('crunch');
    } else {
      Gore.spray(a.x, a.cy, { n: 30, col, speed: 300, spread: Math.PI });
      Gore.pool(a.x + 10, a.y + 2, col, Math.round(Gfx.spr(a.sprite).w * a.scale * 0.8));
    }
    this.gemsEarned += e.def.boss ? 6 : e.def.elite ? 3 : this.rng.chance(0.55) ? 1 : 0;
    this.run.stats.kills++;
    Co.run(Relics.trigger('onKill', this, e), this);
    this.addHype(6);
    setTimeout(() => this.layout(), 420);
  }
  checkDeaths() { for (const e of this.enemies) if (e.alive && e.hp <= 0) this.kill(e); }
  damagePlayer(amount, o = {}) {
    let dmg = Math.max(0, Math.round(amount));
    if (this.player.block > 0) {
      const b = Math.min(this.player.block, dmg); this.player.block -= b; dmg -= b;
      if (b > 0) { AudioSys.sfx('block'); Popups.add(this.me.x + 26, this.me.cy, `BLOCK ${b}`, '#6aa9ee'); FX.ring(this.me.x, this.me.cy, { scale: 1.1 }); }
    }
    if (dmg > 0) {
      this.hp = Math.max(0, this.hp - dmg);
      if (this.hp > 0) this.gainRage(1);
      if (SPRITES[this.heroDef.base + '_hurt']) this.me.play('hurt');
      this.me.flash('#ffffff', 0.14); this.me.squash(0.22); this.me.knock(-1, clamp(dmg / 10, 0.5, 1.4));
      setTimeout(() => { if (this.phase !== 'lost') this.me.play('idle'); }, 380);
      AudioSys.sfx('hurt'); Juice.shake(Math.min(16, 5 + dmg / 2), 0.32); Juice.flash('#c2333c', 0.3, 4); Juice.stop(0.06);
      Popups.add(this.me.x, this.me.cy - 20, `-${dmg}`, '#ef6a5e', { scale: 2.2, shake: 1.5 });
      Gore.spray(this.me.x, this.me.cy, { n: Math.min(40, 8 + dmg * 1.5), dir: -Math.PI + 0.55, spread: 0.8, speed: 240 + dmg * 6 });
      if (dmg >= 12) Gore.splash(2 + (dmg >= 20 ? 2 : 0));
      this.run.stats.taken += dmg;
    } else Popups.add(this.me.x, this.me.cy - 20, '0', '#7a6d8a');
  }
  gainBlock(n) { if (n <= 0) return; this.player.block += Math.round(n); AudioSys.sfx('block'); Popups.add(this.me.x + 20, this.me.cy - 30, `+${Math.round(n)}`, '#6aa9ee'); FX.ring(this.me.x, this.me.cy, { scale: 0.9 }); }
  heal(n, quiet) { const b = this.hp; this.hp = Math.min(this.maxHp, this.hp + n); const h = this.hp - b; if (h > 0) { if (!quiet) AudioSys.sfx('heal'); Popups.add(this.me.x, this.me.cy - 40, `+${h}`, '#a8e878'); Particles.sparkle(this.me.x, this.me.cy, 10, ['#a8e878', '#6cc95c']); } }
  gainEnergy(n) { this.energy += n; AudioSys.sfx('buff'); Popups.add(64, H - 120, `+${n} ENERGY`, '#86e8d2', { world: false }); }
  drawCards(n) {
    for (let i = 0; i < n; i++) {
      if (this.hand.length >= 10) break;
      if (!this.drawPile.length) { if (!this.discard.length) break; this.drawPile = this.rng.shuffle(this.discard); this.discard = []; }
      const c = this.drawPile.pop(); c.dealT = 0.26 + i * 0.06; this.hand.push(c);
    }
    AudioSys.sfx('card_deal');
  }
  addHype(n, raw) {
    if (this.phase === 'won' || this.phase === 'lost') return;
    this.hype = clamp(this.hype + (raw ? n : n * (1 + Relics.mod('hype'))), 0, 100);
    if (this.hype >= 100 && !this.encoreReady) {
      this.encoreReady = true; AudioSys.sfx('cheer');
      Popups.add(W / 2, 200, 'ENCORE READY!', '#ffb0cf', { world: false, scale: 2.4, life: 1.6 });
      for (let i = 0; i < 20; i++) Particles.confetti(rnd(0, W), 40, 1);
    }
  }
  applyEnemy(e, key, n, quiet) {
    if (!e.alive) return; e.st[key] = (e.st[key] || 0) + n;
    if ((key === 'weak' || key === 'vuln') && Relics.has('sabre_pendant')) { this.player.block += 2; this.flashRelic(RELICS.sabre_pendant); }
    if (!quiet) { AudioSys.sfx(key === 'soak' ? 'splash' : 'debuff'); Popups.add(e.actor.x, e.actor.y - 46, `${key.toUpperCase()} +${n}`, key === 'burn' ? '#ffa832' : key === 'soak' ? '#6aa9ee' : '#b177e6'); }
  }
  applyPlayer(key, n, quiet) {
    this.player.st[key] = (this.player.st[key] || 0) + n;
    const good = ['str', 'thorns', 'regen'].includes(key);
    if (!quiet) { AudioSys.sfx(good ? 'buff' : 'debuff'); Popups.add(this.me.x, this.me.cy - 50, `${good ? '+' : ''}${n} ${key.toUpperCase()}`, good ? '#ef6a5e' : '#b177e6'); }
  }
  stun(e, turns) { if (!e || !e.alive) return; e.st.stun += turns; e.intent = null; Popups.add(e.actor.x, e.actor.cy, 'STUNNED', '#ffe98a', { scale: 1.8 }); Particles.sparkle(e.actor.x, e.actor.top, 12, ['#ffe98a']); }
  addPower(k, n) { this.powers[k] = (this.powers[k] || 0) + n; AudioSys.sfx('buff'); Popups.add(this.me.x, this.me.cy - 60, 'POWER!', '#b177e6', { scale: 1.6 }); FX.ring(this.me.x, this.me.cy, { scale: 1.4 }); }
  flashRelic(r) { this.relicFlash[r.name] = 0.7; }
  bossPhase(e, text) {
    this.banner = { text, sub: '', t: 0, life: 1.8 };
    AudioSys.sfx('roar', { pitch: 45, vol: 1, len: 1.5 });
    Juice.shake(16, 0.7); Juice.flash('#ffa832', 0.5, 2.4);
    e.actor.flash('#ffe08a', 0.4); e.actor.stretch(0.3);
    AudioSys.play('blaze', { restart: true, intensity: 2, fade: 0.2 });
  }
  // ------------------------------------------------------------------ update
  // where card i of the hand sits on screen, for the coach to point at
  handRect(i) {
    const n = this.hand.length; if (!n) return null;
    const spacing = Math.min(CARD_W + 8, 560 / Math.max(1, n)), total = spacing * (n - 1) + CARD_W;
    const x0 = W / 2 - total / 2, y = H - CARD_H - 20;
    if (i === undefined) return { x: x0, y, w: total, h: CARD_H };
    return { x: x0 + i * spacing, y, w: i === n - 1 ? CARD_W : spacing, h: CARD_H };
  }
  // The first fight of a run stops and shows you what everything is.
  coachSteps() {
    const riffI = this.hand.findIndex(c => c.def.riff);
    const wallI = this.hand.findIndex(c => c.v.block != null && c.def.type === 'skill');
    const e = this.alive()[0];
    const intentRect = () => {
      if (!e) return null;
      const a = e.actor, top = a.y - Gfx.spr(a.sprite).h * a.scale - 30;
      const p = this.cam.toScreen(a.x, top);
      return { x: p.x - 44, y: p.y - 4, w: 88, h: 34 };
    };
    return [
      { title: 'YOUR HAND', rect: () => this.handRect(), text: 'Every turn you draw five riffs. Click one to play it. On a phone, tap once to look at it and again to play it.' },
      { title: 'ENERGY', rect: { x: 20, y: H - 146, w: 76, h: 76 }, text: 'Every card costs energy - the number in its top corner. You get 3 a turn, and what you do not spend is gone.' },
      riffI >= 0 && { title: 'RIFF CARDS', rect: () => this.handRect(riffI), text: 'The ♪ cards are riffs. Play one and it cuts to the note field: hit each arrow as it reaches the line. Better timing, bigger hit.' },
      e && { title: 'INTENT', rect: intentRect, text: 'Every beast shows what it will do on its turn. A fang and a number is an attack for that much. Plan around it.' },
      wallI >= 0 && { title: 'BLOCK', rect: () => this.handRect(wallI), text: 'Stone Wall gives BLOCK. Block soaks damage until your next turn, then it crumbles. Block up when a big hit is coming.' },
      { title: 'HYPE', rect: { x: 8, y: 128, w: 26, h: 234 }, text: 'Landed notes fill the Hype column. At full, ENCORE plays a free solo that hits every beast for every note you land.' },
      this.run.relics.length && { title: 'RELICS', rect: { x: 12, y: 70, w: this.run.relics.length * 34 - 4, h: 30 }, text: 'Relics are charms that work all run without being played. Point at one to read it. More drop from elites and bosses.' },
      { title: 'END TURN', rect: { x: W - 180, y: H - 60, w: 168, h: 48 }, text: 'Out of energy? End the turn and the beasts act. Beat all of them to win the fight, and shells and a new card are yours.' },
    ];
  }
  update(dt) {
    this.t += dt;
    if (!this.coached && this.t > 2.2 && !this.banner && this.phase === 'player' && !this.busy && this.handSlide < 0.03 && this.hand.length && this.hand.every(c => !(c.dealT > 0)) && Game.run && !(Game.run.tips || {}).combat) {
      this.coached = true;
      Game.overlay = new Coach(this.coachSteps(), () => { (Game.run.tips = Game.run.tips || {}).combat = true; Game.save(); });
    }
    if (this.riff) { this.riff.update(dt); this.me.play(this.riff.chanting ? 'sing' : 'play'); }
    this.me.update(dt);
    Arena.update(this, dt);
    Gore.update(dt);
    for (const e of this.enemies) {
      e.actor.update(dt);
      e.hitT = Math.max(0, e.hitT - dt); e.shake = Math.max(0, e.shake - dt * 24);
      if (e.spawnT > 0) e.spawnT = Math.max(0, e.spawnT - dt * 2.2);
      if (!e.alive) e.dieT += dt;
      if (e.tx !== undefined && e.alive && !e.hold) e.actor.x = damp(e.actor.x, e.tx, 7, dt);
      e.actor.play(e.def.boss ? 'boss' : 'idle');
    }
    for (const c of this.hand) if (c.dealT > 0) c.dealT -= dt;
    for (const k in this.relicFlash) this.relicFlash[k] -= dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.life) this.banner = null; }
    if (this.fatal && (this.fatal.t += dt) > 0.8 && (Input.clicks.length || Input.pressed('Space', 'Enter', 'Escape'))) this.fatal.skip = true;
    if (this.enc) {
      this.enc.t += dt;
      for (const k of Input.keys) if (/^Digit[1-6]$/.test(k.code) && this.enc.t > 0.4 && this.enc.choice < 0) { const i = +k.code.slice(5) - 1, o = this.enc.opts[i]; if (o && !o.locked) this.enc.choice = i; }
    }
    this.handSlide = damp(this.handSlide, (this.riff || this.phase === 'won' || this.phase === 'lost') ? 1 : 0, 9, dt);
    // beat-synced camera bop
    const beat = AudioSys.song ? (AudioSys.now() - AudioSys.songStart) / AudioSys.beatDur() : this.t * 2;
    const nb = Math.floor(beat);
    if (nb !== this._beat) { this._beat = nb; this.beatPulse = 1; }
    this.beatPulse = Math.max(0, this.beatPulse - dt * 4.5);
    this.cam.zoom += this.beatPulse * 0.004;
    this.cam.update(dt);
    if (!this.riff) {
      if (Input.pressed('KeyE', 'Enter')) this.endTurn();
      if (Input.pressed('KeyR', 'Space')) this.playEncore();   // R, since SPACE is the chant during a riff
      if (Input.pressed('Escape')) { if (this.selected) this.selected = null; else Game.pause(); }
      for (const k of Input.keys) if (/^Digit[1-9]$/.test(k.code) && this.phase === 'player' && !this.busy) { const c = this.hand[+k.code.slice(5) - 1]; if (c) this.tapCard(c); }
    }
  }
  enemyAt(x, y) {
    for (const e of this.alive()) {
      const p = this.cam.toScreen(e.actor.x, e.actor.cy);
      const s = Gfx.spr(e.actor.sprite);
      const w = s.w * e.actor.scale * this.cam.zoom, h = s.h * e.actor.scale * this.cam.zoom;
      if (inRect(x, y, p.x - w / 2 - 10, p.y - h / 2 - 10, w + 20, h + 20)) return e;
    }
    return null;
  }
  click(x, y, button) {
    if (this.riff) return;
    if (button === 2) { this.selected = null; this.preview = null; return; }
    if (!this.selected && Arena.click(this, x, y)) return;
    if (this.selected) { const e = this.enemyAt(x, y); if (e) this.play(this.selected, e); else if (y < H - 190) this.selected = null; }
  }
  // -------------------------------------------------------------------- draw
  draw() {
    Gfx.clear('#120c16');
    this.cam.apply(Gfx.ctx);
    Backdrops.scene = this;
    Backdrops.draw(this.act, this.t, this.cam);
    Arena.drawProps(this, false);
    Gore.drawGround();
    if (this.fatal) Gfx.rectA(-800, -600, 2800, 1600, '#1a0508', this.fatal.dark);
    // actors, sorted so the player never hides behind a beast
    const list = [];
    for (const e of this.enemies) {
      if (e.gibbed) continue;
      list.push({ y: e.actor.y - (e.alive || e.fatalPending ? 0 : 30), f: () => this.drawEnemy(e) });
    }
    list.push({ y: this.me.y + 1, f: () => this.drawHeroActor() });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) it.f();
    // the bush you are hiding in, and the rock in the air
    if (this.bush) Gfx.sprite('v_bush', this.bush.x + (this.bush.shake ? rnd(-this.bush.shake, this.bush.shake) : 0), STAGE_Y + 8, { anchor: 'bc', scale: 2.6 });
    if (this.encRock) Gfx.sprite('v_rock', this.encRock.x, this.encRock.y, { anchor: 'c', scale: 0.7, rot: this.encRock.r });
    Gore.drawChunks();
    Arena.drawProps(this, true);
    Particles.draw(Gfx.ctx, true);
    Emotes.draw(); Toon.draw();
    Backdrops.front(this.act, this.t, this.cam);
    Arena.drawFront(this);
    FX.draw(true);
    if (Settings.lighting !== false) lightCombat(this);
    Popups.draw(true);
    this.cam.restore(Gfx.ctx);
    if (Settings.lighting !== false) gradeCombat(this);
    Post.ui();
    Gore.drawLens();
    Particles.draw(Gfx.ctx, false);
    FX.draw(false);
    Fatality.draw(this);
    if (this.riff) this.riff.draw();
    if (this.phase === 'encounter') this.drawEncounter();
    else {
      this.drawHud();
      if (!this.riff) Arena.drawUI(this);
      if (!this.riff) this.drawHand();
    }
    if (this.selected) this.drawTargeting();
    Popups.draw(false);
    Toon.draw(true);
    if (this.banner) this.drawBanner();
  }
  drawHeroActor() {
    this.drawBand();
    this.me.draw();
    const b = this.player.block;
    if (b > 0) {
      Gfx.sprite('icon_shield', this.me.x - 34, this.me.y - 46, { anchor: 'c', scale: 1.2 });
      Gfx.text(String(b), this.me.x - 34, this.me.y - 52, { color: '#ffffff', align: 'center', outline: true });
    }
    this.drawStatus(this.player.st, this.me.x - 40, this.me.y + 6);
  }
  // The family backing you up: one at your shoulder, the broadest a step
  // further back, the last at the edge of the light - so all three fit.
  bandSlots() {
    if (this._slots) return this._slots;
    const S = [[-104, 8, 0.8], [-152, -26, 0.66], [-198, 6, 0.74]];
    const m = this.band.slice(0, 3);
    if (m.length > 1) {
      const w = id => Gfx.spr(Heroes.get(id).base + '_idle').w;
      let bi = 0; m.forEach((id, i) => { if (w(id) > w(m[bi])) bi = i; });
      m.splice(1, 0, m.splice(bi, 1)[0]);
    }
    return this._slots = m.map((id, i) => ({ id, dx: S[i][0], dy: S[i][1], s: S[i][2], ph: i * 0.37 }))
      .sort((a, b) => a.dy - b.dy);
  }
  drawBand() {
    const beat = AudioSys.song ? (AudioSys.now() - AudioSys.songStart) / AudioSys.beatDur() : this.t * 2;
    for (const m of this.bandSlots()) {
      const x = this.me.x + m.dx, y = this.me.y + m.dy - 6;
      const hop = Math.abs(Math.sin((beat + m.ph) * Math.PI)) * 7 * m.s;
      Gfx.shadow(x, y, 46 * m.s, 0.25);
      Gfx.sprite(Heroes.get(m.id).base + '_idle', x, y - hop, { anchor: 'bc', frame: Math.floor(beat + m.ph), scale: ACTOR_SCALE * m.s });
    }
  }
  drawEnemy(e) {
    const a = e.actor;
    if (!e.alive) {
      const h = Gfx.spr(a.sprite).h * a.scale;
      if (e.fatalPending) {
        // dazed, swaying, waiting
        Gfx.shadow(a.x, a.y, Gfx.spr(a.sprite).w * a.scale * 0.55, 0.3);
        Gfx.sprite(a.sprite, a.x, a.y, { anchor: 'bc', scale: a.scale, frame: a.frame, flip: true, rot: Math.sin(this.t * 2.4) * 0.07, sx: a.sx, sy: a.sy * (0.96 + Math.sin(this.t * 3) * 0.02), tint: e.hitT > 0 ? '#ffffff' : e.charred ? '#120c16' : '#3f0e18', tintAmount: e.hitT > 0 ? 1 : e.charred ? 0.9 : 0.15 });
        return;
      }
      if (e.ko) {
        // a boss, sat down hard and seeing stars
        const k = Math.min(1, e.dieT / 0.4);
        Gfx.sprite(a.sprite, a.x, a.y, { anchor: 'bc', scale: a.scale, frame: 0, flip: true, sy: 1 - k * 0.22, sx: 1 + k * 0.08, rot: k * -0.12 });
        return;
      }
      // tipped over onto its back, legs in the air, where it fell
      const k = Math.min(1, e.dieT / 0.45), rot = Ease.outBack(k) * Math.PI * 0.94;
      Gfx.sprite(a.sprite, a.x + k * 16, a.y - h / 2 - Math.sin(k * Math.PI) * 26 + k * 6, { anchor: 'c', scale: a.scale, frame: 0, flip: true, rot, tint: '#3f0e18', tintAmount: k * 0.35 });
      // the flies find it
      if (e.dieT > 1.5) for (let i = 0; i < 3; i++) { const q = this.t * (3 + i) + i * 2; Gfx.rect(Math.round(a.x + 16 + Math.cos(q) * (14 + i * 5)), Math.round(a.y - h * 0.8 + Math.sin(q * 1.7) * 8), 2, 2, '#120c16'); }
      return;
    }
    const sx = e.shake ? rnd(-e.shake, e.shake) : 0;
    const y = a.y - (e.spawnT > 0 ? e.spawnT * 80 : 0) + (e.def.flying ? -56 + Math.sin(this.t * 2.6 + a.x) * 8 : 0);
    Gfx.shadow(a.x, a.y, Gfx.spr(a.sprite).w * a.scale * 0.55, 0.3);
    const hov = this.selected && !this.riff && this.enemyAt(Input.mx, Input.my) === e;
    if (hov) Gfx.sprite(a.sprite, a.x + sx, y, { anchor: 'bc', scale: a.scale, frame: a.frame, flip: !e.lookAway, tint: '#ffe98a', tintAmount: 1, sx: 1.06, sy: 1.06, alpha: 0.55 });
    const br = Math.sin(this.t * 2.1 + a.x * 0.1) * 0.02;              // it breathes, it is alive
    Gfx.sprite(a.sprite, a.x + sx, y, { anchor: 'bc', scale: a.scale, frame: a.frame, flip: !e.lookAway, tint: e.hitT > 0 ? '#ffffff' : null, sx: a.sx * (1 - br * 0.5), sy: a.sy * (1 + br), rot: (a.x - (e.tx ?? a.x)) * -0.0015 + (a.tilt || 0) });
    if (this.phase === 'encounter') return;          // no bars or intents while they do not know you are there
    // name, bar, intent
    const top = y - Gfx.spr(a.sprite).h * a.scale;
    const bw = clamp(Gfx.spr(a.sprite).w * a.scale * 0.62, 78, 180);
    Gfx.bar(a.x - bw / 2, a.y + 10, bw, 9, e.hp / e.maxHp, e.def.boss ? '#a03a68' : '#c2333c', { bg: '#3f0e18' });
    Gfx.text(`${e.hp}`, a.x, a.y + 11, { color: '#fffaea', align: 'center', outline: true });
    Gfx.text(e.name, a.x, a.y + 24, { color: e.def.boss ? '#ffa832' : e.def.elite ? '#ffe98a' : '#bdbccd', align: 'center', outline: true });
    if (e.block > 0) { Gfx.sprite('icon_shield', a.x - bw / 2 - 12, a.y + 14, { anchor: 'c' }); Gfx.text(String(e.block), a.x - bw / 2 - 12, a.y + 9, { color: '#fff', align: 'center', outline: true }); }
    this.drawStatus(e.st, a.x - bw / 2, a.y + 32);
    const info = Enemies.intentInfo(e, this);
    if (info && !this.riff) {
      const iy = top - 32;
      const label = info.dmg !== undefined ? (info.hits > 1 ? `${info.dmg}x${info.hits}` : String(info.dmg)) : '';
      const pw = info.icons.length * 24 + (label ? Gfx.measure(label, 1.3) + 10 : 0) + 12;
      let ix = a.x - pw / 2 + 6;
      HUD.plate(a.x - pw / 2, iy - 4, pw, 28, { gold: false, accent: info.dmg !== undefined ? '#ef6a5e' : '#6aa9ee', shadow: false });
      for (const ic of info.icons) { Gfx.sprite(ic, ix, iy, { anchor: 'tl', scale: 1 }); ix += 24; }
      if (label) Gfx.text(label, ix + 2, iy + 3, { color: info.dmg !== undefined ? '#ffb0a8' : '#ffffff', scale: 1.3 });
      const p = this.cam.toScreen(a.x, iy);
      if (UI.hovered(p.x - 40, p.y - 14, 80, 28)) UI.tooltip(p.x - 80, p.y + 20, [info.text, info.dmg !== undefined ? `Attacks for {y}${info.dmg}{/}${info.hits > 1 ? ` x${info.hits}` : ''}.` : e.intent.block ? 'Braces.' : e.intent.str ? 'Powers up.' : e.intent.summon ? 'Calls for help.' : 'Curses you.'], { width: 200 });
    } else if (e.st.stun > 0) Gfx.sprite('st_stun', a.x, top - 24, { anchor: 'c', frame: Math.floor(this.t * 8) });
  }
  drawStatus(st, x, y) {
    const list = [['str', 'st_str', '#ef6a5e'], ['weak', 'st_weak', '#a79bb4'], ['vuln', 'st_vuln', '#b177e6'], ['burn', 'st_burn', '#ffa832'], ['soak', 'st_soak', '#6aa9ee'], ['stun', 'st_stun', '#ffe98a'], ['thorns', 'st_thorns', '#e8dfc6'], ['regen', 'st_regen', '#a8e878']];
    let cx = x;
    for (const [k, spr, col] of list) {
      if (!st[k]) continue;
      Gfx.sprite(spr, cx, y, { anchor: 'tl' });
      Gfx.text(String(st[k]), cx + 17, y + 3, { color: col, outline: true });
      cx += 28;
    }
  }
  drawHud() {
    const E = HUD.EDGE, C = HUD.C;
    // ---- top left: you. Portrait, life, block, and your relics under it
    {
      const x = E, y = E, w = 262, h = 50;
      HUD.plate(x, y, w, h);
      HUD.portrait(x + 25, y + 25, 19, this.heroDef.base + '_idle', { ring: this.heroDef.color, frame: Math.floor(this.t * 2) % 2 });
      const bx = x + 52, bw = w - 64;
      this.hpGhost = damp(this.hpGhost ?? this.hp / this.maxHp, this.hp / this.maxHp, 3, Time.dt);
      HUD.bar(bx, y + 12, bw, 14, this.hp / this.maxHp, C.life, C.lifeDark, { ghost: this.hpGhost });
      HUD.text(`${this.hp}/${this.maxHp}`, bx + 5, y + 14, { scale: 1 });
      if (this.player.block > 0) {
        Gfx.sprite('icon_shield', bx + 8, y + 38, { anchor: 'c', scale: 1 });
        HUD.text(`${this.player.block} BLOCK`, bx + 20, y + 33, { color: '#8ec8ff', scale: 1 });
      }
      // the hero's own number: Bronk's temper, Pebble's beat
      const own = this.heroDef.id === 'bronk' ? ['RAGE', this.rage, '#ff6a4a'] : this.heroDef.id === 'pebble' ? ['BEAT', this.played, '#a8e878'] : null;
      if (own) {
        HUD.plate(x + w + 8, y, 74, 50, { gold: false, accent: own[2] });
        HUD.text(own[0], x + w + 45, y + 7, { color: own[2], align: 'center', scale: 0.9 });
        HUD.text(String(own[1]), x + w + 45, y + 22, { color: '#fffaea', align: 'center', scale: 2 });
        if (UI.hovered(x + w + 8, y, 74, 50)) UI.tooltip(x + w + 8, y + 56, [this.heroDef.mechanic.name, this.heroDef.mechanic.desc], { width: 240 });
      }
      // relics: small, in a row, readable on hover
      let rx = x;
      const ry = y + h + 8;
      for (const id of this.run.relics) {
        const flash = this.relicFlash[RELICS[id].name] > 0;
        HUD.plate(rx, ry, 30, 30, { gold: flash, hot: flash, fill: flash ? 'rgba(96,72,20,0.9)' : undefined });
        Relics.drawIcon(id, rx + 7, ry + 7);
        if (UI.hovered(rx, ry, 30, 30)) UI.tooltip(rx, ry + 36, [`{y}${RELICS[id].name}{/}`, RELICS[id].desc], { width: 230 });
        rx += 34;
      }
    }
    // ---- top middle: the turn
    HUD.plate(W / 2 - 50, E, 100, 30, { gold: false });
    HUD.text(`TURN ${this.turn}`, W / 2, E + 9, { color: C.dim, align: 'center', scale: 1.2 });
    // ---- top right: gems, what you walked through, the menu
    if (!this.riff) UI.iconButton(W - E - 36, E, 36, 30, 'icon_menu', () => Game.pause(), { scale: 1.1 });
    HUD.chip(W - E - 36 - 8 - 72, E, 72, (x, y) => HUD.gem(x, y), this.run.gems || 0, C.gem);
    // what you walked through to get here
    { let tx = W - E - 36 - 8 - 72 - 8; for (const k of Object.keys(this.touched).reverse()) { const T = TERRAIN[k]; if (!T || !this.touched[k]) continue; tx -= 44; HUD.plate(tx, E, 40, 30, { gold: false }); Gfx.rect(tx + 4, E + 5, 32, 20, HUD.C.ink); Gfx.rect(tx + 5, E + 6, 30, 18, T.dark); Gfx.rect(tx + 5, E + 6, 30, 5, T.col); HUD.text(`${T.name.slice(0, 5)}`, tx + 20, E + 7, { color: '#fffaea', align: 'center', scale: 0.62 }); HUD.text(`x${this.touched[k]}`, tx + 20, E + 14, { color: '#fffaea', align: 'center', scale: 0.9 }); if (UI.hovered(tx, E, 40, 30)) UI.tooltip(tx - 100, E + 36, [`${T.name}: touched ${this.touched[k]} this round`, T.desc], { width: 220 }); tx -= 4; } }
    if (this.riff) return;
    // ---- bottom left: energy, and the two piles
    const ex = 58, ey = H - 108;
    Gfx.circle(ex, ey, 38, C.ink);
    Gfx.circle(ex, ey, 36, this.energy > 0 ? '#16305e' : '#241c2e');
    Gfx.ring(ex, ey, 35, this.energy > 0 ? C.gold : C.goldDim, 2);
    if (this.energy > 0) Gfx.glow(ex, ey, 60, C.energy, 0.18 + Math.sin(this.t * 3) * 0.06);
    const maxE = this.maxEnergy + Relics.mod('energy') + (this.powers.groove || 0);
    for (let i = 0; i < maxE; i++) {                      // one pip per point of energy
      const a = -Math.PI / 2 + (i - (maxE - 1) / 2) * 0.42;
      Gfx.circle(ex + Math.cos(a) * 28, ey + Math.sin(a) * 28, 4, i < this.energy ? '#8ec8ff' : '#3b3048');
    }
    HUD.text(`${this.energy}`, ex, ey - 12, { color: C.text, align: 'center', scale: 2.6, outline: true, outlineWidth: 2 });
    HUD.text('ENERGY', ex, ey + 14, { color: '#8ec8ff', align: 'center', scale: 0.9 });
    const pile = (x, label, n, list, title) => {
      HUD.plate(x, H - 52, 56, 40, { gold: false });
      HUD.text(String(n), x + 28, H - 46, { color: C.text, align: 'center', scale: 1.4 });
      HUD.text(label, x + 28, H - 26, { color: C.dim, align: 'center', scale: 0.8 });
      UI.hit(x, H - 52, 56, 40, () => Game.overlay = new DeckOverlay(list, title));
    };
    pile(E, 'DRAW', this.drawPile.length, this.drawPile, 'DRAW PILE');
    pile(E + 62, 'DISCARD', this.discard.length, this.discard, 'DISCARD');
    // ---- hype: a slim column up the left edge
    {
      const hx = E + 2, hy = 150, hh = 190, hw = 14;
      HUD.plate(hx - 6, hy - 22, hw + 12, hh + 44, { gold: false });
      HUD.text('HYPE', hx + hw / 2, hy - 16, { color: C.hype, align: 'center', scale: 0.8 });
      Gfx.rect(hx - 1, hy - 1, hw + 2, hh + 2, C.ink);
      Gfx.rect(hx, hy, hw, hh, '#2a1020');
      const fh = Math.round(hh * clamp(this.hype / 100, 0, 1));
      Gfx.rect(hx, hy + hh - fh, hw, fh, this.encoreReady ? (Math.floor(this.t * 6) % 2 ? '#ffffff' : C.hype) : '#c2407e');
      Gfx.rectA(hx, hy + hh - fh, hw, 3, '#ffffff', 0.5);
      for (let i = 1; i < 4; i++) Gfx.rectA(hx, hy + hh * i / 4, hw, 1, C.ink, 0.7);
      HUD.text(String(Math.floor(this.hype)), hx + hw / 2, hy + hh + 6, { color: C.hype, align: 'center', scale: 0.9 });
      if (this.encoreReady && this.phase === 'player' && !this.busy)
        HUD.button(hx + hw + 12, hy + hh - 40, 120, 40, 'ENCORE!', () => this.playEncore(), { danger: true, hot: true });
    }
    // ---- bottom right: the one button you press every turn
    const canEnd = !this.busy && this.phase === 'player';
    HUD.button(W - E - 168, H - E - 48, 168, 48, 'END TURN', () => this.endTurn(),
      { disabled: !canEnd, keyHint: 'E', hot: canEnd && this.energy === 0, scale: 1.3 });
  }
  drawHand() {
    if (this.handSlide > 0.97) return;
    const n = this.hand.length; if (!n) return;
    const spacing = Math.min(CARD_W + 8, 560 / Math.max(1, n));
    const total = spacing * (n - 1) + CARD_W;
    const x0 = W / 2 - total / 2;
    const baseY = H - CARD_H - 20 + this.handSlide * 240;
    let hov = -1;
    if (Input.touch) hov = this.preview ? this.hand.indexOf(this.preview) : -1;
    else if (!this.busy) for (let i = n - 1; i >= 0; i--) { if (inRect(Input.mx, Input.my, x0 + i * spacing, baseY - 24, i === n - 1 ? CARD_W : spacing, CARD_H)) { hov = i; break; } }
    for (let i = 0; i < n; i++) {
      if (i === hov) continue;
      const c = this.hand[i];
      const fan = (i - (n - 1) / 2) * 0.035;
      let y = baseY + Math.abs(i - (n - 1) / 2) * 5 + (c === this.selected ? -22 : 0);
      if (c.dealT > 0) y += c.dealT * 520;
      const wob = Math.sin(this.t * 2 + i * 0.7) * 2;
      Gfx.ctx.save();
      Gfx.ctx.translate(x0 + i * spacing + CARD_W / 2, y + CARD_H / 2 + wob);
      Gfx.ctx.rotate(fan);
      Cards.draw(c, -CARD_W / 2, -CARD_H / 2, { playable: this.canPlay(c), energy: this.energy, combat: this, selected: c === this.selected });
      Gfx.ctx.restore();
      UI.hit(x0 + i * spacing, y, i === n - 1 ? CARD_W : spacing, CARD_H, () => this.tapCard(c), { noCursor: true });
    }
    if (hov >= 0) {
      const c = this.hand[hov];
      const s = 1.35, w = CARD_W * s;
      // on touch the blown-up card is always centred, so the second tap lands
      // exactly where the first one did something
      const hx = Input.touch ? Math.round(W / 2 - w / 2) : clamp(x0 + hov * spacing - (w - CARD_W) / 2, 6, W - w - 6);
      const hy = H - CARD_H * s - 10;
      Cards.draw(c, hx, hy, { scale: s, hover: true, playable: this.canPlay(c), energy: this.energy, combat: this, selected: c === this.selected });
      UI.hit(hx, hy, w, CARD_H * s, () => this.tapCard(c));
      if (Input.touch && this.preview === c) {
        const hint = this.canPlay(c) ? (c.def.target === 'enemy' && this.alive().length > 1 ? 'TAP AGAIN, THEN PICK A BEAST' : 'TAP AGAIN TO PLAY') : 'NOT ENOUGH ENERGY';
        const hw = Gfx.measure(hint, 1) + 16;
        Gfx.round(hx + w / 2 - hw / 2, hy - 20, hw, 18, 4, '#120c16');
        Gfx.text(hint, hx + w / 2, hy - 16, { color: this.canPlay(c) ? '#ffe98a' : '#ef6a5e', align: 'center' });
      }
    }
  }
  drawTargeting() {
    const ctx = Gfx.ctx;
    for (const e of this.alive()) {
      const p = this.cam.toScreen(e.actor.x, e.actor.cy);
      const s = Gfx.spr(e.actor.sprite);
      const w = s.w * e.actor.scale * this.cam.zoom, h = s.h * e.actor.scale * this.cam.zoom;
      const k = 0.5 + Math.sin(this.t * 7) * 0.5;
      Gfx.outlineRound(p.x - w / 2 - 7, p.y - h / 2 - 7, w + 14, h + 14, 4, k > 0.5 ? '#ffe98a' : '#ffffff');
    }
    if (!Input.touch) {
      ctx.strokeStyle = '#ffe98a'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -this.t * 40;
      ctx.beginPath(); ctx.moveTo(W / 2, H - 70); ctx.quadraticCurveTo(W / 2, Input.my - 60, Input.mx, Input.my); ctx.stroke(); ctx.setLineDash([]);
    } else UI.button(W - 150, H - 230, 130, 40, 'CANCEL', () => { this.selected = null; AudioSys.sfx('back'); });
    Gfx.text(`${this.selected.name}: pick a beast`, W / 2, H - 216, { color: '#ffe98a', align: 'center', scale: 1.3, outline: true });
  }
  drawBanner() {
    const b = this.banner, k = b.t / b.life;
    const a = k < 0.12 ? k / 0.12 : k > 0.82 ? (1 - k) / 0.18 : 1;
    const slide = Ease.outBack(clamp(k * 4, 0, 1));
    Gfx.ctx.globalAlpha = a;
    Gfx.rectA(0, 176, W, 96, '#120c16', 0.8);
    Gfx.rectA(0, 176, W, 3, '#ffe98a', 1);
    Gfx.rectA(0, 269, W, 3, '#ffe98a', 1);
    Gfx.text(b.text, W / 2 + (1 - slide) * 60, 196, { color: '#ffe98a', align: 'center', scale: 3.6, outline: true, outlineWidth: 2 });
    if (b.sub) Gfx.text(b.sub, W / 2 - (1 - slide) * 60, 240, { color: '#d6cfe0', align: 'center', scale: 1.3 });
    Gfx.ctx.globalAlpha = 1;
  }
}
