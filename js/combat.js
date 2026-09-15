// ---------------------------------------------------------------------------
// combat.js - Slay-the-Spire style combat with riff (rhythm) attacks
// ---------------------------------------------------------------------------
'use strict';

const GROUND_Y = 212;
const HAND_Y = 252;

// Per-act battle/scene backgrounds -------------------------------------------
const Backgrounds = {
  draw(act, t, o = {}) {
    const ctx = Gfx.ctx;
    if (act === 1) {
      Gfx.bands(0, 0, W, 150, ['#5ee0f0', '#7fd8ee', '#a0d8e8', '#c8e0d8', '#e8dcc0']);
      Gfx.circle(520, 42, 18, '#fff6c0'); Gfx.circle(514, 40, 14, '#fffde0');
      this.clouds(t, ['#ffffff']);
      // hills
      ctx.fillStyle = '#7a8f3a'; ctx.beginPath(); ctx.moveTo(0, 150); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 130 + Math.sin(x * 0.02 + 1) * 12 + Math.sin(x * 0.05) * 5); ctx.lineTo(W, 200); ctx.lineTo(0, 200); ctx.fill();
      ctx.fillStyle = '#5cb84a'; ctx.beginPath(); ctx.moveTo(0, 175); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 160 + Math.sin(x * 0.03 + 2) * 10); ctx.lineTo(W, 230); ctx.lineTo(0, 230); ctx.fill();
      Gfx.sprite('lm_volcano', 380, 168, { anchor: 'bl', scale: 2, alpha: 0.5 });
      Gfx.sprite('lm_palm', 560, 190, { anchor: 'bl', scale: 2 }); Gfx.sprite('lm_tree', 20, 186, { anchor: 'bl', scale: 2 });
      Gfx.sprite('lm_ribs', 250, 186, { anchor: 'bl', scale: 2 }); Gfx.sprite('lm_rock', 300, 200, { anchor: 'bl', scale: 2 });
      Gfx.rect(0, GROUND_Y - 6, W, H - GROUND_Y + 6, '#a06a3a'); Gfx.rect(0, GROUND_Y - 6, W, 4, '#c9a15a'); Gfx.rect(0, GROUND_Y + 10, W, 2, '#8a5a2b');
      for (let i = 0; i < 12; i++) Gfx.sprite('lm_grass', (i * 61 + 13) % W, GROUND_Y - 6, { anchor: 'bl', scale: 2 });
    } else if (act === 2) {
      Gfx.bands(0, 0, W, 150, ['#2f7a30', '#3a8a48', '#5a9a5a', '#7aaa6a', '#8ab070']);
      this.clouds(t, ['#c8d8c0'], 0.5);
      ctx.fillStyle = '#1e5a2a'; ctx.beginPath(); ctx.moveTo(0, 150); for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 120 + Math.sin(x * 0.04) * 14); ctx.lineTo(W, 200); ctx.lineTo(0, 200); ctx.fill();
      for (let i = 0; i < 9; i++) Gfx.sprite(i % 2 ? 'lm_palm' : 'lm_tree', (i * 78 + 10) % W, 176 + (i % 3) * 4, { anchor: 'bl', scale: 2, alpha: 0.85 });
      Gfx.rect(0, GROUND_Y - 6, W, H - GROUND_Y + 6, '#4a5c22'); Gfx.rect(0, GROUND_Y - 6, W, 4, '#7a8f3a');
      Gfx.sprite('lm_tarpit', 200, GROUND_Y + 4, { anchor: 'bl', scale: 2 }); Gfx.sprite('lm_mushroom', 330, GROUND_Y - 2, { anchor: 'bl', scale: 2 });
      Gfx.sprite('lm_fern', 280, GROUND_Y - 4, { anchor: 'bl', scale: 2 }); Gfx.sprite('lm_fern', 600, GROUND_Y - 4, { anchor: 'bl', scale: 2 });
      // fireflies
      for (let i = 0; i < 10; i++) { const fx = (i * 97 + t * 8 * (i % 3 + 1)) % W, fy = 60 + ((i * 53) % 120) + Math.sin(t * 2 + i) * 6; Gfx.rectA(fx, fy, 2, 2, '#a3e04a', 0.5 + 0.5 * Math.sin(t * 3 + i)); }
    } else {
      Gfx.bands(0, 0, W, 150, ['#3a1020', '#6a1a20', '#8e2a20', '#b04a20', '#c86a20']);
      Gfx.sprite('lm_volcano', 300, 176, { anchor: 'bc', scale: 4, frame: Math.floor(t * 2) % 2 });
      for (let i = 0; i < 6; i++) { const k = (t * 0.15 + i * 0.17) % 1; Gfx.rectA(340 + Math.sin(k * 6 + i) * 20, 60 - k * 60, 6 + k * 14, 6 + k * 14, '#55555f', 0.5 * (1 - k)); }
      ctx.fillStyle = '#2a1a1a'; ctx.beginPath(); ctx.moveTo(0, 150); for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 140 + Math.sin(x * 0.05) * 10); ctx.lineTo(W, 200); ctx.lineTo(0, 200); ctx.fill();
      Gfx.rect(0, GROUND_Y - 6, W, H - GROUND_Y + 6, '#3a2c3f'); Gfx.rect(0, GROUND_Y - 6, W, 4, '#55555f');
      Gfx.sprite('lm_lavapool', 220, GROUND_Y + 8, { anchor: 'bl', scale: 2, frame: Math.floor(t * 3) % 2 }); Gfx.sprite('lm_lavapool', 470, GROUND_Y + 12, { anchor: 'bl', scale: 2, frame: Math.floor(t * 3 + 1) % 2 });
      Gfx.sprite('lm_dskull', 60, GROUND_Y - 4, { anchor: 'bl', scale: 2 }); Gfx.sprite('lm_pillar', 600, GROUND_Y - 2, { anchor: 'bl', scale: 2 });
      for (let i = 0; i < 14; i++) { const k = (t * 0.3 + i * 0.071) % 1; Gfx.rectA((i * 47) % W, GROUND_Y - k * 200, 2, 2, '#ff5c00', 0.8 * (1 - k)); }
    }
  },
  clouds(t, colors, alpha = 0.9) {
    for (let i = 0; i < 4; i++) { const x = ((i * 190 + t * (6 + i * 2)) % (W + 120)) - 60; Gfx.sprite('lm_cloud', x, 20 + i * 22, { scale: 2, alpha }); }
  }
};

class Combat {
  constructor(encounter, opts = {}) {
    this.encounterIds = encounter; this.kind = opts.kind || 'normal'; this.act = opts.act || (Game.run ? Game.run.act : 1);
    this.run = Game.run; this.rng = new RNG((Game.run ? Game.run.seed : 1) + (Game.run ? Game.run.floor * 977 : 0) + 31);
    this.enemies = []; this.hand = []; this.drawPile = []; this.discardPile = []; this.exhaustPile = [];
    this.energy = 3; this.maxEnergy = 3; this.turn = 0; this.hype = 0; this.encoreReady = false;
    this.phase = 'intro'; this.busy = true; this.selected = null; this.hoverCard = -1; this.riff = null;
    this.cardsPlayedThisTurn = 0; this.powers = {}; this.flags = {}; this.t = 0; this.relicFlash = {};
    this.px = 135; this.py = GROUND_Y; this.pAnim = { lunge: 0, hurt: 0, strum: 0 };
    this.band = (this.run ? this.run.band : []).slice();
    this.player = { st: { str: 0, weak: 0, vuln: 0, thorns: 0, regen: 0 }, block: 0 };
    this.log = []; this.deathQueue = []; this.bandCheer = 0; this.encoreCard = null; this.handSlide = 0; this.won = false; this.previewCard = null;
  }
  get hp() { return this.run.hp; } set hp(v) { this.run.hp = v; }
  get maxHp() { return this.run.maxHp; }
  enter() {
    // build deck
    this.drawPile = this.rng.shuffle(this.run.deck.map(c => Cards.refresh(c)));
    // enemies
    for (const id of this.encounterIds) this.spawn(id, true);
    this.layoutEnemies();
    for (let i = 0; i < this.enemies.length; i++) this.enemies[i].patternOffset = i;
    this.hype = this.run.startHype || 0;
    const boss = this.enemies.some(e => e.def.boss);
    AudioSys.play(boss ? `boss${this.act}` : `battle${this.act}`, { intensity: this.kind === 'elite' ? 2 : 1, fade: 0.4 });
    this.co = Co.run(this.startCo(), this);
  }
  exit() { Co.stop(this.co); }
  spawn(id, initial = false) {
    const e = Enemies.make(id, this.rng); e.anim.spawn = initial ? 0 : 1; e.y = GROUND_Y + (e.def.flying ? -40 : 0);
    this.enemies.push(e); if (!initial) this.layoutEnemies();
    return e;
  }
  layoutEnemies() {
    const alive = this.enemies.filter(e => e.alive);
    let right = 632; const widths = alive.map(e => Gfx.spriteSize(e.def.sprite).w * e.scale);
    const total = widths.reduce((a, b) => a + b, 0) + (alive.length - 1) * 14;
    const avail = 632 - 350; const gap = total > avail ? Math.max(-30, (avail - widths.reduce((a, b) => a + b, 0)) / Math.max(1, alive.length - 1)) : 14;
    for (let i = alive.length - 1; i >= 0; i--) { const e = alive[i]; e.tx = right - widths[i] / 2; right -= widths[i] + gap; if (e.x === 0) e.x = e.tx + 60; }
  }
  alive() { return this.enemies.filter(e => e.alive); }
  randomEnemy() { const a = this.alive(); return a.length ? this.rng.pick(a) : null; }
  // ------------------------------------------------------------- flow
  *startCo() {
    this.phase = 'intro'; this.busy = true;
    yield 0.3;
    const big = this.enemies.reduce((a, e) => Math.max(a, e.def.boss ? 3 : e.def.elite ? 2 : 1), 1);
    const lead = this.enemies[0];
    AudioSys.sfx('roar', lead.def.roar || {}); Shake.add(big * 1.5, 0.4);
    if (lead.def.boss) { this.banner = { text: lead.name, sub: lead.def.final ? 'THE KING WHO STOLE THE PRINCESS' : 'BOSS', t: 0, life: 2.4 }; yield 1.6; }
    else if (this.kind === 'elite') { this.banner = { text: lead.name, sub: 'ELITE', t: 0, life: 1.8 }; yield 1.0; }
    else yield 0.5;
    yield* Relics.trigger('onCombatStart', this);
    yield* this.startTurnCo();
  }
  *startTurnCo() {
    this.turn++; this.phase = 'player'; this.cardsPlayedThisTurn = 0; this.flags = {};
    if (this.turn > 1) this.player.block = 0;
    this.energy = this.maxEnergy + Relics.mod('extraEnergy') + (this.powers.groove || 0);
    if (this.powers.anthem) this.addHype(this.powers.anthem);
    for (const e of this.alive()) { e.intent = Enemies.pickMove(e, this, this.rng); }
    this.drawCards(5 + Relics.mod('extraDraw'));
    yield 0.2;
    // band effects
    if (this.band.includes('ugg')) { this.gainBlock(3); Popups.add(90, GROUND_Y - 80, 'UGG: +3 BLOCK', '#7fb0ff'); }
    if (this.band.includes('bonga')) { const e = this.randomEnemy(); if (e) { this.bandCheer = 0.5; yield 0.15; AudioSys.sfx('hit'); this.damageEnemy(e, 3 + this.act, { source: 'band' }); Popups.add(60, GROUND_Y - 80, 'BONGA DRUMS!', '#f6d743'); yield 0.25; } }
    yield* Relics.trigger('onTurnStart', this);
    this.checkDeaths();
    if (!this.alive().length) { yield* this.victoryCo(); return; }
    this.busy = false;
  }
  endTurn() { if (this.busy || this.phase !== 'player') return; this.selected = null; this.previewCard = null; Co.run(this.endTurnCo(), this); }
  *endTurnCo() {
    this.busy = true; this.phase = 'enemy'; AudioSys.sfx('whoosh');
    if (this.powers.thickHide) this.gainBlock(this.powers.thickHide);
    if (this.player.st.regen) this.heal(this.player.st.regen);
    yield* Relics.trigger('onTurnEnd', this);
    // discard hand
    while (this.hand.length) { const c = this.hand.pop(); this.discardPile.push(c); }
    yield 0.35;
    for (const e of this.enemies.slice()) {
      if (!e.alive) continue;
      // burn
      if (e.st.burn > 0) { AudioSys.sfx('fire'); this.damageEnemy(e, e.st.burn, { source: 'burn', fire: true, pierce: true }); e.st.burn = Math.max(0, e.st.burn - 1); yield 0.35; if (!e.alive) continue; }
      if (e.st.stun > 0) { e.st.stun--; Popups.add(e.x, e.y - 60, 'STUNNED', '#f6d743'); AudioSys.sfx('stun'); yield 0.5; e.turnCount++; continue; }
      e.block = 0;
      yield* this.enemyActCo(e);
      e.turnCount++; e.lastMove = e.intent ? e.intent.key : null;
      if (e.st.weak > 0) e.st.weak--; if (e.st.vuln > 0) e.st.vuln--;
      if (this.hp <= 0) { yield* this.defeatCo(); return; }
      yield 0.3;
    }
    // player debuffs tick
    if (this.player.st.weak > 0) this.player.st.weak--; if (this.player.st.vuln > 0) this.player.st.vuln--;
    this.checkDeaths();
    if (!this.alive().length) { yield* this.victoryCo(); return; }
    yield* this.startTurnCo();
  }
  *enemyActCo(e) {
    const m = e.intent; if (!m) return;
    Popups.add(e.x, e.y - Gfx.spriteSize(e.def.sprite).h * e.scale - 26, m.name, '#ece6dc', { vy: -10, life: 0.9 });
    if (m.block) { e.block += m.block; AudioSys.sfx('block'); Popups.add(e.x, e.y - 40, `+${m.block} BLOCK`, '#7fb0ff'); yield 0.3; }
    if (m.str) { e.st.str += m.str; AudioSys.sfx('buff'); Popups.add(e.x, e.y - 50, `+${m.str} STR`, '#ff6b6b'); yield 0.3; }
    if (m.dmg) {
      const hits = m.hits || 1;
      for (let i = 0; i < hits; i++) {
        e.anim.lunge = 1; yield 0.16;
        const dmg = this.previewEnemyDamage(e, m.dmg);
        this.damagePlayer(dmg, { from: e });
        if (this.player.st.thorns > 0 && e.alive) { this.damageEnemy(e, this.player.st.thorns, { source: 'thorns' }); }
        yield hits > 1 ? 0.28 : 0.4;
        if (this.hp <= 0) return;
      }
    }
    if (m.weakP) { this.applyToPlayer('weak', m.weakP); yield 0.25; }
    if (m.vulnP) { this.applyToPlayer('vuln', m.vulnP); yield 0.25; }
    if (m.burnP) { this.damagePlayer(m.burnP * 2, { from: e, fire: true }); Popups.add(this.px, this.py - 90, 'BURNED!', '#f28c28'); yield 0.25; }
    if (m.heal) { for (const o of this.alive()) if (o !== e && o.hp < o.maxHp) { o.hp = Math.min(o.maxHp, o.hp + m.heal); Popups.add(o.x, o.y - 50, `+${m.heal}`, '#a3e04a'); } AudioSys.sfx('heal'); yield 0.4; }
    if (m.summon) { const n = m.summonN || 1; for (let i = 0; i < n; i++) { if (this.alive().length >= 4) break; const s = this.spawn(m.summon); s.intent = null; AudioSys.sfx('summon'); yield 0.3; } this.layoutEnemies(); yield 0.4; }
  }
  *victoryCo() {
    if (this.won) return; this.won = true;
    this.phase = 'won'; this.busy = true; this.selected = null;
    AudioSys.stop(0.8); AudioSys.sfx('victory'); this.bandCheer = 3;
    yield 0.4;
    yield* Relics.trigger('onCombatEnd', this);
    if (this.band.includes('zog')) { this.heal(4, true); Popups.add(30, GROUND_Y - 80, 'ZOG: +4 HP', '#a3e04a'); }
    this.banner = { text: 'VICTORY!', sub: this.kind === 'boss' ? 'THE WAY IS CLEAR' : 'THE CROWD GOES WILD', t: 0, life: 1.6 };
    yield 1.7;
    Game.combatWon(this);
  }
  *defeatCo() {
    this.phase = 'lost'; this.busy = true; AudioSys.stop(1); AudioSys.sfx('defeat');
    this.banner = { text: 'DEFEATED', sub: 'THE MUSIC FADES...', t: 0, life: 2.5 };
    yield 2.4;
    Game.go(new GameOverScene());
  }
  // ------------------------------------------------------------- card play
  canPlay(card) { return !this.busy && this.phase === 'player' && card.cost <= this.energy; }
  tryPlay(card, target) {
    if (!this.canPlay(card)) { if (card.cost > this.energy) { AudioSys.sfx('error'); Popups.add(320, 250, 'NOT ENOUGH ENERGY', '#ff6b6b'); } return; }
    if (card.def.target === 'enemy' && !target) return;
    this.selected = null;
    Co.run(this.playCardCo(card, target), this);
  }
  *playCardCo(card, target) {
    this.busy = true; this.previewCard = null; this.energy -= card.cost; this.cardsPlayedThisTurn++;
    const hi = this.hand.indexOf(card); if (hi >= 0) this.hand.splice(hi, 1);
    AudioSys.sfx('card');
    this.playing = card;
    let riff = null;
    if (card.def.riff) riff = yield* this.riffCo(card);
    yield* card.def.effect(this, card, target, riff);
    if (card.def.type !== 'special') yield* Relics.trigger('onCardPlayed', this, card);
    this.playing = null;
    if (card.def.type === 'power' || card.def.type === 'special') { /* consumed */ }
    else if (card.def.exhaust && !card.v.noExhaust) this.exhaustPile.push(card);
    else this.discardPile.push(card);
    this.checkDeaths();
    yield 0.1;
    if (!this.alive().length) { yield* this.victoryCo(); return; }
    if (this.hp <= 0) { yield* this.defeatCo(); return; }
    this.busy = false;
  }
  *riffCo(card) {
    this.phase = 'riff';
    let windowMult = Relics.mult('windowMult') * (this.band.includes('zog') ? 1.15 : 1) * (this.flags.tuned ? 1.7 : 1);
    this.flags.tuned = false;
    let done = false, result = null;
    this.riff = new Riff({ bars: card.def.riff.bars, density: card.def.riff.density, title: card.name.toUpperCase(), windowMult, act: this.act, encore: card.id === 'encore',
      onNote: (j, n) => {
        if (j === 'miss') { this.pAnim.strum = 0; return; }
        this.pAnim.strum = 0.15; this.bandCheer = 0.3;
        this.addHype(j === 'perfect' ? 3 : 1);
        if (this.riff.combo > 0) Co.run(Relics.trigger('onCombo', this, this.riff.combo), this);
      },
      onDone: r => { result = r; done = true; }
    });
    yield () => done;
    const r = result;
    // show grade
    const g = this.riff.geom();
    Popups.add(g.cx, g.top + 70, `${r.grade} RANK  x${r.mult.toFixed(2)}`, r.grade === 'S' ? '#f6d743' : r.grade === 'A' ? '#a3e04a' : r.grade === 'F' ? '#ff6b6b' : '#ffffff', { scale: 2, life: 1.2, vy: -20 });
    if (r.grade === 'S') { AudioSys.sfx('cheer'); this.bandCheer = 1.5; }
    yield 0.45;
    this.lastRiff = this.riff; this.riff = null; this.phase = 'player';
    this.run.stats.notes += r.notes; this.run.stats.perfects += r.perfects;
    return r;
  }
  playEncore() {
    if (this.busy || this.phase !== 'player' || !this.encoreReady) return;
    this.encoreReady = false; this.hype = 0; this.selected = null;
    const card = Cards.make('encore');
    Co.run(this.playCardCo(card, null), this);
  }
  // ------------------------------------------------------------- API for cards
  riffDamage(card, riff, base) {
    if (base === undefined) base = card.v.dmg;
    if (!riff) return base;
    let d = Math.round(base * riff.mult);
    d += (card.v.perfectBonus || 0) * riff.perfects + (this.powers.rhythmMaster || 0) * riff.perfects;
    return d;
  }
  previewDamage(base) { let d = base + this.player.st.str; if (this.player.st.weak > 0) d *= 0.75; if (this.powers.amplifier) d *= 1 + this.powers.amplifier; return Math.max(0, Math.floor(d)); }
  calcPlayerDamage(base, target) { let d = base + this.player.st.str; if (this.player.st.weak > 0) d *= 0.75; if (this.powers.amplifier) d *= 1 + this.powers.amplifier; if (target && target.st.vuln > 0) d *= 1.5; return Math.max(0, Math.floor(d)); }
  previewEnemyDamage(e, base) { let d = base + e.st.str; if (e.st.weak > 0) d *= 0.75; if (this.player.st.vuln > 0) d *= 1.5; d -= Relics.mod('dmgReduce'); return Math.max(0, Math.floor(d)); }
  *dealDamage(target, amount, o = {}) {
    if (!target || !target.alive) { target = this.randomEnemy(); if (!target) return 0; }
    if (!o.projectile) { this.pAnim.lunge = 1; yield o.quick ? 0.08 : 0.12; }
    else { Particles.spawn(this.px + 30, this.py - 60, { n: 6, color: ['#8f8f9a', '#a89aa8'], angle: 0, spread: 0.3, speed: 300, gravity: 60, life: 0.25 }); yield 0.15; }
    const dmg = this.calcPlayerDamage(amount, target);
    this.damageEnemy(target, dmg, o);
    if (Relics.mod('burnOnHit') && target.alive) this.applyToEnemy(target, 'burn', Relics.mod('burnOnHit'), true);
    AudioSys.sfx(o.heavy ? 'bighit' : 'hit'); if (o.heavy) Shake.add(4, 0.25);
    yield o.quick ? 0.16 : 0.3;
    return dmg;
  }
  *dealDamageAll(amount, o = {}) {
    this.pAnim.lunge = 1; yield 0.12;
    for (const e of this.alive()) { this.damageEnemy(e, this.calcPlayerDamage(amount, e), o); if (Relics.mod('burnOnHit') && e.alive) this.applyToEnemy(e, 'burn', Relics.mod('burnOnHit'), true); }
    AudioSys.sfx('bighit'); Shake.add(4, 0.3);
    yield 0.35;
  }
  damageEnemy(e, amount, o = {}) {
    if (!e.alive) return 0;
    let dmg = Math.max(0, Math.round(amount));
    if (!o.pierce && e.block > 0) { const b = Math.min(e.block, dmg); e.block -= b; dmg -= b; if (b > 0) { AudioSys.sfx('block'); Popups.add(e.x + 10, e.y - 50, `BLOCKED ${b}`, '#7fb0ff', { scale: 1 }); } }
    e.hp -= dmg; e.anim.hit = 0.18;
    const size = Gfx.spriteSize(e.def.sprite);
    Popups.add(e.x + rnd(-8, 8), e.y - size.h * e.scale * 0.6, String(dmg), dmg === 0 ? '#a89aa8' : o.fire ? '#f28c28' : '#ffffff', { scale: dmg >= 15 ? 3 : 2 });
    Particles.spawn(e.x, e.y - size.h * e.scale * 0.5, { n: Math.min(20, 4 + dmg), color: o.fire ? ['#ff5c00', '#f6d743', '#f28c28'] : ['#d83a3a', '#ff6b6b', '#ffffff'], speed: 120, life: 0.5, size: 2 });
    if (e.def.onHurt && e.alive) e.def.onHurt(e, this);
    if (e.hp <= 0) { e.hp = 0; this.killEnemy(e); }
    return dmg;
  }
  killEnemy(e) {
    if (!e.alive) return; e.alive = false; e.anim.dieT = 0.01; e.intent = null;
    AudioSys.sfx('die'); Particles.spawn(e.x, e.y - 30, { n: 24, color: ['#ffffff', '#f6d743', '#a89aa8'], speed: 160, life: 0.7, size: 3 });
    const g = Math.round(this.rng.int(e.def.gold[0], e.def.gold[1]) * Relics.mult('goldMult'));
    this.goldEarned = (this.goldEarned || 0) + g;
    this.run.stats.kills++;
    Co.run(Relics.trigger('onKill', this, e), this);
    this.addHype(5);
    setTimeout(() => this.layoutEnemies(), 500);
  }
  checkDeaths() { for (const e of this.enemies) if (e.alive && e.hp <= 0) this.killEnemy(e); }
  damagePlayer(amount, o = {}) {
    let dmg = Math.max(0, Math.round(amount));
    if (this.player.block > 0) { const b = Math.min(this.player.block, dmg); this.player.block -= b; dmg -= b; if (b > 0) { AudioSys.sfx('block'); Popups.add(this.px + 24, this.py - 70, `BLOCKED ${b}`, '#7fb0ff'); } }
    if (dmg > 0) {
      this.hp = Math.max(0, this.hp - dmg); this.pAnim.hurt = 0.4; AudioSys.sfx('hurt'); Shake.add(Math.min(8, 2 + dmg / 3), 0.3); Flash.add('#d83a3a', 0.25, 3);
      Popups.add(this.px, this.py - 90, `-${dmg}`, '#ff6b6b', { scale: 2 });
      Particles.spawn(this.px, this.py - 40, { n: 10, color: ['#d83a3a', '#ff6b6b'], speed: 100, life: 0.5 });
      this.run.stats.damageTaken += dmg;
    } else { Popups.add(this.px, this.py - 90, '0', '#a89aa8'); }
  }
  gainBlock(n) { if (n <= 0) return; this.player.block += Math.round(n); AudioSys.sfx('block'); Popups.add(this.px + 20, this.py - 80, `+${Math.round(n)} BLOCK`, '#7fb0ff'); }
  heal(n, quiet = false) { const before = this.hp; this.hp = Math.min(this.maxHp, this.hp + n); const h = this.hp - before; if (h > 0) { if (!quiet) AudioSys.sfx('heal'); Popups.add(this.px, this.py - 95, `+${h} HP`, '#a3e04a'); Particles.spawn(this.px, this.py - 40, { n: 8, color: ['#a3e04a', '#5cb84a'], speed: 50, life: 0.7, gravity: -60 }); } }
  gainEnergy(n) { this.energy += n; AudioSys.sfx('buff'); Popups.add(40, 250, `+${n} ENERGY`, '#5ee0f0'); }
  drawCards(n) {
    for (let i = 0; i < n; i++) {
      if (this.hand.length >= 10) { Popups.add(320, 250, 'HAND FULL', '#a89aa8'); break; }
      if (!this.drawPile.length) { if (!this.discardPile.length) break; this.drawPile = this.rng.shuffle(this.discardPile); this.discardPile = []; AudioSys.sfx('whoosh'); }
      const c = this.drawPile.pop(); c.drawT = 0.3 + i * 0.05; this.hand.push(c);
    }
    AudioSys.sfx('draw');
  }
  addHype(n, raw = false) {
    if (this.phase === 'won' || this.phase === 'lost') return;
    const v = raw ? n : n * Relics.mult('hypeMult');
    this.hype = clamp(this.hype + v, 0, 100);
    const thr = 100 + Relics.mod('encoreThreshold');
    if (this.hype >= thr && !this.encoreReady) { this.encoreReady = true; AudioSys.sfx('cheer'); Popups.add(110, 236, 'ENCORE READY!', '#f5a3c7', { scale: 2, life: 1.4 }); this.bandCheer = 1.5; }
  }
  applyToEnemy(e, key, n, quiet = false) {
    if (!e.alive) return; e.st[key] = (e.st[key] || 0) + n;
    if (!quiet) { AudioSys.sfx('debuff'); Popups.add(e.x, e.y - 45, `${key.toUpperCase()} ${n}`, key === 'burn' ? '#f28c28' : '#c4b8f0'); }
  }
  applyToPlayer(key, n, quiet = false) {
    this.player.st[key] = (this.player.st[key] || 0) + n;
    const good = key === 'str' || key === 'thorns' || key === 'regen';
    if (!quiet) { AudioSys.sfx(good ? 'buff' : 'debuff'); Popups.add(this.px, this.py - 100, `${good ? '+' : ''}${n} ${key.toUpperCase()}`, good ? '#ff6b6b' : '#c4b8f0'); }
  }
  stunEnemy(e, turns) { if (!e || !e.alive) return; e.st.stun += turns; e.intent = null; Popups.add(e.x, e.y - 50, 'STUNNED', '#f6d743', { scale: 2 }); Particles.spawn(e.x, e.y - 60, { n: 8, color: ['#f6d743'], speed: 40, gravity: -40, life: 0.8, shape: 'note' }); }
  addPower(key, n) { this.powers[key] = (this.powers[key] || 0) + n; AudioSys.sfx('buff'); Popups.add(this.px, this.py - 100, 'POWER!', '#c4b8f0'); }
  flashRelic(r) { this.relicFlash[r.name] = 0.6; }
  bossPhase(e, text) { this.banner = { text, sub: '', t: 0, life: 1.8 }; AudioSys.sfx('roar', { pitch: 45, vol: 1, len: 1.5 }); Shake.add(8, 0.6); Flash.add('#d83a3a', 0.5, 2); AudioSys.play(`boss${this.act}`, { restart: true, intensity: 2, fade: 0.2 }); }
  // ------------------------------------------------------------- update
  update(dt) {
    this.t += dt;
    if (this.riff) { this.riff.update(dt); }
    // animations
    this.pAnim.lunge = Math.max(0, this.pAnim.lunge - dt * 5); this.pAnim.hurt = Math.max(0, this.pAnim.hurt - dt); this.pAnim.strum = Math.max(0, this.pAnim.strum - dt);
    this.bandCheer = Math.max(0, this.bandCheer - dt);
    for (const e of this.enemies) {
      e.anim.t += dt; e.anim.hit = Math.max(0, e.anim.hit - dt); e.anim.lunge = Math.max(0, e.anim.lunge - dt * 4);
      if (e.anim.spawn > 0) e.anim.spawn = Math.max(0, e.anim.spawn - dt * 2);
      if (!e.alive) e.anim.dieT += dt;
      if (e.tx !== undefined) e.x = lerp(e.x, e.tx, Math.min(1, dt * 6));
    }
    for (const c of this.hand) if (c.drawT > 0) c.drawT -= dt;
    for (const k in this.relicFlash) this.relicFlash[k] -= dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.life) this.banner = null; }
    this.handSlide = lerp(this.handSlide, (this.riff || this.phase === 'won' || this.phase === 'lost') ? 1 : 0, Math.min(1, dt * 8));
    // keyboard shortcuts
    if (!this.riff) for (const k of Input.keys) {
      if (k.code === 'KeyE' || k.code === 'Enter') this.endTurn();
      else if (k.code === 'Space') this.playEncore();
      else if (k.code === 'Escape') { if (this.selected) this.selected = null; else Game.pause(); }
      else if (/^Digit[1-9]$/.test(k.code) && this.phase === 'player' && !this.busy) { const i = +k.code.slice(5) - 1; const c = this.hand[i]; if (c) this.selectCard(c); }
    }
  }
  // Touch: tap once to read the card, tap again to play it. Mouse: play immediately.
  tapCard(c) {
    if (!Input.touch) return this.selectCard(c);
    if (this.previewCard !== c) { this.previewCard = c; AudioSys.sfx('hover'); return; }
    this.previewCard = null;
    this.selectCard(c);
  }
  selectCard(c) {
    if (!this.canPlay(c)) { if (c.cost > this.energy) { AudioSys.sfx('error'); Popups.add(320, 250, 'NOT ENOUGH ENERGY', '#ff6b6b'); } return; }
    if (c.def.target === 'enemy') {
      const a = this.alive();
      if (a.length === 1) { this.tryPlay(c, a[0]); return; }
      this.selected = this.selected === c ? null : c; AudioSys.sfx('select');
    } else this.tryPlay(c, null);
  }
  click(x, y, button) {
    if (this.riff) return;
    if (button === 2) { this.selected = null; return; }
    if (this.selected) {
      const e = this.enemyAt(x, y);
      if (e) { this.tryPlay(this.selected, e); return; }
      if (y < HAND_Y - 10) { this.selected = null; return; }
    }
  }
  enemyAt(x, y) {
    for (const e of this.alive()) { const r = this.enemyRect(e); if (inRect(x, y, r.x - 6, r.y - 6, r.w + 12, r.h + 12)) return e; }
    return null;
  }
  enemyRect(e) { const s = Gfx.spriteSize(e.def.sprite); const w = s.w * e.scale, h = s.h * e.scale; const fly = e.def.flying ? -40 + Math.sin(e.anim.t * 3) * 6 : 0; return { x: e.x - w / 2, y: e.y - h + fly + GROUND_Y - e.y, w, h }; }
  // ------------------------------------------------------------- draw
  draw() {
    Backgrounds.draw(this.act, this.t);
    this.drawBand(); this.drawPlayer();
    for (const e of this.enemies) this.drawEnemy(e);
    if (this.riff) this.riff.draw();
    this.drawTopBar(); this.drawHype();
    this.drawHand();
    if (this.selected) this.drawTargeting();
    if (this.banner) this.drawBanner();
  }
  beat() { return AudioSys.song ? ((AudioSys.now() - AudioSys.songStart) / AudioSys.beatDur()) : this.t * 2; }
  drawPlayer() {
    const b = this.beat(); const bob = Math.abs(Math.sin(b * Math.PI)) * 2;
    const x = this.px + this.pAnim.lunge * 40, y = this.py - bob;
    const frame = this.pAnim.hurt > 0 ? 3 : this.pAnim.strum > 0 ? 2 : (Math.floor(b) % 2);
    Gfx.rectA(x - 22, y - 3, 44, 6, '#000', 0.25);
    const tint = this.pAnim.hurt > 0.25 ? '#ffffff' : undefined;
    Gfx.sprite('onga', x, y, { anchor: 'bc', scale: 3, frame, tint });
    // guitar
    const ang = this.pAnim.strum > 0 ? -0.35 : -0.25 + Math.sin(b * Math.PI) * 0.05;
    Gfx.sprite('rockaxe', x + 8, y - 36, { anchor: 'c', scale: 3, rot: ang });
    // block shield & statuses
    if (this.player.block > 0) { Gfx.sprite('shield', x - 34, y - 60, { scale: 2 }); Gfx.text(String(this.player.block), x - 24, y - 54, { color: '#fff', align: 'center', outline: true, scale: 1 }); }
    this.drawStatuses(this.player.st, x - 40, y + 6, true);
    // HP bar under player
    Gfx.bar(x - 30, y + 14, 60, 6, this.hp / this.maxHp, '#d83a3a', '#16101c');
    Gfx.text(`${this.hp}/${this.maxHp}`, x, y + 21, { color: '#ece6dc', align: 'center', outline: true });
  }
  drawBand() {
    const b = this.beat(); const cheer = this.bandCheer > 0;
    const members = { ugg: { x: 96, y: GROUND_Y - 12, s: 'ugg' }, bonga: { x: 62, y: GROUND_Y, s: 'bonga' }, zog: { x: 30, y: GROUND_Y - 6, s: 'zog' } };
    for (const id of ['ugg', 'bonga', 'zog']) {
      if (!this.band.includes(id)) continue;
      const m = members[id]; const bob = cheer ? Math.abs(Math.sin(b * Math.PI * 2)) * 5 : Math.abs(Math.sin(b * Math.PI + 1)) * 2;
      Gfx.rectA(m.x - 18, m.y - 2, 36, 5, '#000', 0.2);
      Gfx.sprite(m.s, m.x, m.y - bob, { anchor: 'bc', scale: 3, frame: Math.floor(b * (cheer ? 2 : 1)) % 2 });
      if (cheer) Particles.spawn(m.x + rnd(-10, 10), m.y - 70, { n: 1, color: ['#f6d743', '#f5a3c7'], speed: 30, gravity: -50, life: 0.8, shape: 'note' });
    }
  }
  drawEnemy(e) {
    const s = Gfx.spriteSize(e.def.sprite); const w = s.w * e.scale, h = s.h * e.scale;
    const fly = e.def.flying ? -40 + Math.sin(e.anim.t * 3) * 6 : 0;
    const bob = e.alive ? Math.abs(Math.sin(this.beat() * Math.PI + (e.x * 0.01))) * 2 : 0;
    let x = e.x - e.anim.lunge * 50, y = GROUND_Y + fly - bob;
    if (e.anim.spawn > 0) y -= e.anim.spawn * 60;
    if (!e.alive) {
      const k = Math.min(1, e.anim.dieT / 0.6); if (k >= 1) return;
      Gfx.sprite(e.def.sprite, x, y, { anchor: 'bc', scale: e.scale, alpha: 1 - k, sy: 1 - k * 0.8, tint: '#ffffff' });
      return;
    }
    if (!e.def.flying) Gfx.rectA(x - w / 2 + 6, y - 3, w - 12, 6, '#000', 0.25);
    const frame = Math.floor(e.anim.t * 2) % 2;
    const hov = !this.riff && this.selected && this.enemyAt(Input.mx, Input.my) === e;
    if (hov) Gfx.sprite(e.def.sprite, x, y, { anchor: 'bc', scale: e.scale, frame, tint: '#f6d743', sx: 1.04, sy: 1.04, alpha: 0.6 });
    Gfx.sprite(e.def.sprite, x, y, { anchor: 'bc', scale: e.scale, frame, tint: e.anim.hit > 0 ? '#ffffff' : undefined });
    // HP bar
    const bw = Math.max(50, Math.min(w, 110)); const bx = e.x - bw / 2, by = GROUND_Y + 6;
    Gfx.bar(bx, by, bw, 6, e.hp / e.maxHp, e.def.boss ? '#c95c93' : '#d83a3a');
    Gfx.text(`${e.hp}/${e.maxHp}`, e.x, by + 7, { color: '#ece6dc', align: 'center', outline: true });
    Gfx.text(e.name, e.x, by + 25, { color: e.def.boss ? '#f6d743' : e.def.elite ? '#f28c28' : '#a89aa8', align: 'center', outline: true });
    if (e.block > 0) { Gfx.sprite('shield', bx - 14, by - 4, { scale: 1.5 }); Gfx.text(String(e.block), bx - 7, by - 1, { color: '#fff', align: 'center', outline: true }); }
    this.drawStatuses(e.st, bx, by + 15, false);
    // intent
    const info = Enemies.intentInfo(e, this);
    const iy = y - h - 18 - (e.def.flying ? 0 : 0);
    if (info) {
      let ix = e.x - (info.icons.length * 12 + (info.dmg ? 24 : 0)) / 2;
      for (const ic of info.icons) { Gfx.sprite(ic, ix, iy, { scale: 1 }); ix += 12; }
      if (info.dmg !== undefined) { Gfx.text(info.hits > 1 ? `${info.dmg}x${info.hits}` : String(info.dmg), ix + 2, iy + 2, { color: '#ffffff', outline: true }); }
      if (!this.riff && UI.hovered(e.x - 30, iy - 4, 60, 16)) UI.tooltip(e.x - 60, iy - 30, [info.text, info.dmg !== undefined ? `Attacks for {y}${info.dmg}{/}${info.hits > 1 ? ` x${info.hits}` : ''}.` : e.intent.block ? 'Gains Block.' : e.intent.str ? 'Powers up.' : e.intent.heal ? 'Heals its allies.' : e.intent.summon ? 'Calls for help.' : 'Debuffs you.'], { width: 130 });
    } else if (e.st.stun > 0) { Gfx.sprite('st_stun', e.x - 4, iy, { scale: 1 }); }
    if (hov) Gfx.sprite('marker', e.x, iy - 16 + Math.sin(this.t * 8) * 3, { anchor: 'c', scale: 2, rot: Math.PI });
    // tooltip on hover (not while riffing)
    if (!this.riff && !this.selected) { const r = this.enemyRect(e); if (UI.hovered(r.x, r.y, r.w, r.h)) UI.tooltip(Input.mx + 10, Input.my - 10, [e.name, e.def.boss ? 'BOSS' : e.def.elite ? 'ELITE' : `HP ${e.hp}/${e.maxHp}`, e.st.str ? `Strength ${e.st.str}: deals +${e.st.str} damage.` : '', e.st.weak ? `Weak ${e.st.weak}: deals 25% less.` : '', e.st.vuln ? `Vulnerable ${e.st.vuln}: takes 50% more.` : '', e.st.burn ? `Burn ${e.st.burn}: takes damage each turn.` : ''].filter(Boolean), { width: 140 }); }
  }
  drawStatuses(st, x, y, isPlayer) {
    const list = [['str', 'st_str', '#ff6b6b'], ['weak', 'st_weak', '#a89aa8'], ['vuln', 'st_vuln', '#c4b8f0'], ['burn', 'st_burn', '#f28c28'], ['stun', 'st_stun', '#f6d743'], ['thorns', 'st_thorns', '#f5eed3'], ['regen', 'st_regen', '#a3e04a']];
    let cx = x;
    for (const [k, spr, col] of list) {
      if (!st[k]) continue;
      Gfx.sprite(spr, cx, y, { scale: 1 }); Gfx.text(String(st[k]), cx + 9, y + 1, { color: col, outline: true });
      if (UI.hovered(cx, y, 16, 9)) UI.tooltip(cx, y + 12, [k.toUpperCase(), { str: 'Deals extra damage per stack.', weak: 'Deals 25% less damage. Ticks down each turn.', vuln: 'Takes 50% more damage. Ticks down each turn.', burn: 'Takes damage at the start of its turn, then decreases.', stun: 'Skips its next turn.', thorns: 'Attackers take damage back.', regen: 'Heals at the end of your turn.' }[k]]);
      cx += 18;
    }
    if (isPlayer && this.powers && Object.keys(this.powers).length) {
      for (const [k, v] of Object.entries(this.powers)) { Gfx.sprite('art_spiral', cx, y - 2, { scale: 1 }); Gfx.text(String(v), cx + 11, y + 1, { color: '#c4b8f0', outline: true }); if (UI.hovered(cx, y, 18, 10)) UI.tooltip(cx, y + 12, [k.toUpperCase(), { anthem: 'Gain Hype each turn.', groove: 'Extra energy each turn.', rhythmMaster: 'Perfect notes deal more damage.', thickHide: 'Gain Block at end of turn.', amplifier: 'Riffs deal more damage.' }[k] || '']); cx += 20; }
    }
  }
  drawTopBar() {
    Gfx.rectA(0, 0, W, 22, '#16101c', 0.75);
    Gfx.sprite('heart', 6, 6, { scale: 1 }); Gfx.bar(16, 6, 90, 9, this.hp / this.maxHp, '#d83a3a');
    Gfx.text(`${this.hp}/${this.maxHp}`, 61, 7, { color: '#fff', align: 'center', outline: true });
    Gfx.sprite('coin', 116, 6, { scale: 1 }); Gfx.text(String(this.run.gold), 127, 7, { color: '#f6d743' });
    // relics
    let rx = 170;
    for (const id of this.run.relics) { const r = RELICS[id]; if (this.relicFlash[r.name] > 0) Gfx.rectA(rx - 2, 3, 14, 14, '#f6d743', 0.6); Relics.drawIcon(id, rx, 5, 1); rx += 15; }
    Gfx.text(`ACT ${roman(this.act)}  FLOOR ${this.run.floor}  TURN ${this.turn}`, 520, 7, { color: '#a89aa8', align: 'center' });
    if (!this.riff) UI.iconButton(618, 3, 18, 16, 'intent_unknown', () => Game.pause(), { tip: 'Menu (Esc)' });
    // piles
    if (!this.riff) {
      const dp = UI.hit(6, 312, 30, 44, () => Game.overlay = new DeckOverlay(this.drawPile, 'DRAW PILE'));
      Cards.drawBack(8, 314, 0.36); Gfx.text(String(this.drawPile.length), 23, 336, { color: dp ? '#f6d743' : '#ece6dc', align: 'center', outline: true });
      Gfx.text('DRAW', 23, 353, { color: '#a89aa8', align: 'center' });
      const dc = UI.hit(602, 312, 34, 44, () => Game.overlay = new DeckOverlay(this.discardPile, 'DISCARD PILE'));
      Cards.drawBack(606, 314, 0.36); Gfx.text(String(this.discardPile.length), 621, 336, { color: dc ? '#f6d743' : '#ece6dc', align: 'center', outline: true });
      Gfx.text('DISC', 621, 353, { color: '#a89aa8', align: 'center' });
      if (this.exhaustPile.length) { Gfx.sprite('exhaust_icon', 580, 344, { scale: 1 }); Gfx.text(String(this.exhaustPile.length), 590, 345, { color: '#f28c28', outline: true }); }
    }
  }
  drawHype() {
    const x = 8, y = 118, w = 12, h = 112;
    const thr = 100 + Relics.mod('encoreThreshold');
    Gfx.text('HYPE', x - 2, y - 10, { color: '#f5a3c7' });
    Gfx.rect(x, y, w, h, '#16101c');
    const fh = Math.round((h - 2) * clamp(this.hype / 100, 0, 1));
    const col = this.encoreReady ? (Math.floor(this.t * 6) % 2 ? '#ffffff' : '#f5a3c7') : '#c95c93';
    if (fh > 0) { Gfx.rect(x + 1, y + h - 1 - fh, w - 2, fh, col); Gfx.rectA(x + 1, y + h - 1 - fh, 2, fh, '#fff', 0.3); }
    Gfx.rect(x, y + h - 1 - Math.round((h - 2) * thr / 100), w, 1, '#f6d743');
    Gfx.text(`${Math.floor(this.hype)}`, x + w / 2, y + h + 3, { color: '#f5a3c7', align: 'center' });
    if (UI.hovered(x - 4, y - 10, w + 8, h + 20)) UI.tooltip(x + 16, y + 20, ['Hype', `Hitting notes and rally cards build Hype. At ${thr} you can unleash an {p}ENCORE{/}: a free epic riff that hits ALL enemies.`], { width: 150 });
    if (this.riff) return; // the fret pads own the bottom of the screen while a riff plays
    if (this.encoreReady && this.phase === 'player' && !this.busy) {
      UI.button(2, Input.touch ? 238 : 244, Input.touch ? 78 : 66, Input.touch ? 20 : 14, 'ENCORE!', () => this.playEncore(), { fill: '#c95c93', hover: '#f5a3c7', border: '#ffffff', color: '#fff' });
    }
    // energy orb
    const ex = 36, ey = 282;
    Gfx.circle(ex, ey, 17, '#16101c'); Gfx.circle(ex, ey, 15, this.energy > 0 ? '#1e3a8a' : '#3a2c3f'); Gfx.circle(ex - 4, ey - 5, 5, this.energy > 0 ? '#5ee0f0' : '#55555f');
    Gfx.text(`${this.energy}/${this.maxEnergy + Relics.mod('extraEnergy') + (this.powers.groove || 0)}`, ex, ey - 3, { color: '#fff', align: 'center', scale: 1, outline: true });
    Gfx.text('ENERGY', ex, ey + 20, { color: '#5ee0f0', align: 'center' });
    // end turn
    UI.button(556, 266, 80, 26, Input.touch ? 'END TURN' : 'END TURN (E)', () => this.endTurn(), { disabled: this.busy || this.phase !== 'player' });
  }
  drawHand() {
    if (this.handSlide > 0.98) return;
    const n = this.hand.length; if (!n) return;
    const spacing = Math.min(CARD_W + 4, 440 / Math.max(1, n));
    const total = spacing * (n - 1) + CARD_W; const x0 = 320 - total / 2;
    const slideY = this.handSlide * 130;
    let hovIdx = -1;
    if (Input.touch) hovIdx = this.previewCard ? this.hand.indexOf(this.previewCard) : -1;
    else {
      if (!this.busy && !this.riff) for (let i = n - 1; i >= 0; i--) { const cx = x0 + i * spacing; if (inRect(Input.mx, Input.my, cx, HAND_Y - 20, i === n - 1 ? CARD_W : spacing, CARD_H + 20)) { hovIdx = i; break; } }
      if (hovIdx < 0 && !this.busy && !this.riff) for (let i = n - 1; i >= 0; i--) { const cx = x0 + i * spacing; if (inRect(Input.mx, Input.my, cx, HAND_Y, CARD_W, CARD_H)) { hovIdx = i; break; } }
    }
    this.hoverCard = hovIdx;
    for (let i = 0; i < n; i++) {
      if (i === hovIdx) continue;
      const c = this.hand[i]; const cx = x0 + i * spacing; let cy = HAND_Y + slideY + (c === this.selected ? -14 : 0);
      if (c.drawT > 0) cy += c.drawT * 200;
      const wob = Math.sin(this.t * 2 + i) * 1.5;
      Cards.draw(c, cx, cy + wob, { playable: this.canPlay(c) && !this.busy, energy: this.energy, combat: this, selected: c === this.selected });
      UI.hit(cx, cy, i === n - 1 ? CARD_W : spacing, CARD_H, () => this.tapCard(c), { noCursor: true });
    }
    if (hovIdx >= 0) {
      const c = this.hand[hovIdx]; const cx = x0 + hovIdx * spacing;
      const s = 1.45; const hx = clamp(cx - (CARD_W * s - CARD_W) / 2, 4, W - CARD_W * s - 4), hy = H - CARD_H * s - 4;
      Cards.draw(c, hx, hy, { scale: s, hover: true, playable: this.canPlay(c), energy: this.energy, combat: this, selected: c === this.selected });
      if (Input.touch && this.previewCard === c) {
        const hint = this.canPlay(c) ? (c.def.target === 'enemy' && this.alive().length > 1 ? 'TAP AGAIN, THEN PICK A TARGET' : 'TAP AGAIN TO PLAY') : 'NOT ENOUGH ENERGY';
        const hw = Gfx.measure(hint, 1) + 10;
        Gfx.rectA(hx + CARD_W * s / 2 - hw / 2, hy - 13, hw, 11, '#16101c', 0.9);
        Gfx.text(hint, hx + CARD_W * s / 2, hy - 11, { color: this.canPlay(c) ? '#f6d743' : '#ff6b6b', align: 'center' });
      }
      UI.hit(hx, hy, CARD_W * s, CARD_H * s, () => this.tapCard(c));
    }
  }
  drawTargeting() {
    const c = this.selected; const ctx = Gfx.ctx;
    if (!Input.touch) {
      const from = { x: 320, y: HAND_Y - 10 }; const to = { x: Input.mx, y: Input.my };
      ctx.strokeStyle = '#f6d743'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.lineDashOffset = -this.t * 30;
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.quadraticCurveTo(from.x, to.y - 40, to.x, to.y); ctx.stroke(); ctx.setLineDash([]);
    } else {
      // pulsing rings mark every valid target
      for (const e of this.alive()) { const r = this.enemyRect(e); const k = 0.5 + 0.5 * Math.sin(this.t * 6); Gfx.outline(r.x - 4, r.y - 4, r.w + 8, r.h + 8, k > 0.5 ? '#f6d743' : '#ffffff'); }
      UI.button(560, 236, 74, 20, 'CANCEL', () => { this.selected = null; AudioSys.sfx('back'); });
    }
    Gfx.text(`${c.name}: tap a dinosaur${Input.touch ? '' : '  (right-click to cancel)'}`, 320, 236, { color: '#f6d743', align: 'center', outline: true });
  }
  drawBanner() {
    const b = this.banner; const k = b.t / b.life; const a = k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1;
    Gfx.ctx.globalAlpha = a; Gfx.rectA(0, 120, W, 60, '#16101c', 0.8);
    Gfx.text(b.text, 320, 132, { color: '#f6d743', align: 'center', scale: 3, outline: true });
    if (b.sub) Gfx.text(b.sub, 320, 162, { color: '#ece6dc', align: 'center', scale: 1 });
    Gfx.ctx.globalAlpha = 1;
  }
}
