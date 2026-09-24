// ---------------------------------------------------------------------------
// combat.js - the performance: a card battle where every riff cuts to a
// close-up of Bronk playing and hands control to the note field.
// ---------------------------------------------------------------------------
'use strict';

const STAGE_Y = 430;
const CAM_DY = 96;            // the camera sits lower, so the fighters stand clear of the hand
const ACTOR_SCALE = 2;

const Backdrops = {
  TORCHES: [84, 880],
  // three parallax layers plus haze, so the stage has depth behind the fight
  draw(act, t, cam) {
    const px = (cam ? cam.x - W / 2 : 0);
    const sky = act === 1 ? ['#1d3d72', '#3570c0', '#6aa9ee', '#a8d8ff', '#ffdcb8', '#ffb0cf']
      : act === 2 ? ['#101f3d', '#0f3838', '#18706a', '#1d4a26', '#27632f', '#3f9a45']
        : ['#1a0a1e', '#281040', '#5c1607', '#9c3510', '#e06a1b', '#ffa832'];
    Gfx.bands(-600, -400, 2400, 760, sky);
    const ctx = Gfx.ctx;
    if (act === 1) { Gfx.circle(700 - px * 0.05, 30, 40, '#ffe98a'); Gfx.glow(700 - px * 0.05, 30, 150, '#ffe98a', 0.3); }
    if (act === 3) { Gfx.glow(500 - px * 0.05, 120, 460, '#e06a1b', 0.28); }
    // far ridge
    const ridge = (yBase, amp, col, par) => {
      ctx.fillStyle = col; ctx.beginPath();
      const off = -px * par;
      ctx.moveTo(-600, 460);
      for (let x = -600; x <= 1800; x += 40) ctx.lineTo(x, yBase + Math.sin((x + off) * 0.0042) * amp + Math.sin((x + off) * 0.011) * amp * 0.4);
      ctx.lineTo(1800, 460); ctx.closePath(); ctx.fill();
    };
    ridge(150, 54, act === 3 ? '#3f0e18' : act === 2 ? '#0f3838' : '#2a4a72', 0.12);
    ridge(210, 34, act === 3 ? '#281040' : act === 2 ? '#14331e' : '#1f4a2a', 0.22);
    Gfx.rectA(-600, 150, 2400, 130, act === 3 ? '#e06a1b' : '#ffffff', 0.05);   // haze
    // treeline
    for (let i = 0; i < 12; i++) {
      const x = -400 + i * 190 - px * 0.34;
      const spr = act === 3 ? 'v_deadtree' : act === 2 ? (i % 2 ? 'v_palm' : 'v_tree_jungle') : (i % 3 ? 'v_tree' : 'v_palm');
      Gfx.sprite(spr, x, 302, { anchor: 'bc', scale: 0.78, alpha: 0.55, tint: '#120c16', tintAmount: 0.35 });
    }
    // the crowd on a bank
    const beat = AudioSys.song ? (AudioSys.now() - AudioSys.songStart) / AudioSys.beatDur() : t * 2;
    Gfx.rect(-600, 296, 2400, 30, act === 3 ? '#241c2e' : act === 2 ? '#102a16' : '#2f4a1e');
    for (let i = 0; i < 18; i++) {
      const x = -300 + i * 84 + (i % 3) * 16 - px * 0.5;
      const b = Math.abs(Math.sin((beat + i * 0.31) * Math.PI)) * 6;
      Gfx.sprite(i % 2 ? 'villager_idle' : 'villager2_idle', x, 322 - b, { anchor: 'bc', tint: '#120c16', tintAmount: 0.82, alpha: 0.8, frame: Math.floor(beat + i) });
    }
    // the pit floor
    Gfx.rect(-600, 322, 2400, 400, act === 3 ? '#2e2b38' : act === 2 ? '#1d3a20' : '#5c3a20');
    Gfx.rect(-600, 322, 2400, 7, act === 3 ? '#4d4a5c' : act === 2 ? '#27632f' : '#85562f');
    Gfx.rectA(-600, 329, 2400, 6, '#000000', 0.3);
    for (let i = 0; i < 120; i++) {
      const x = -600 + ((i * 137) % 2400), y = 344 + ((i * 53) % 190);
      Gfx.rectA(x, y, 6 + (i % 4) * 4, 2, i % 3 ? '#000000' : '#ffffff', 0.055);
    }
    for (let i = 0; i < 14; i++) Gfx.sprite(act === 3 ? 'v_rock_bare' : 'v_bush', -500 + i * 160 - px * 0.7, 350, { anchor: 'bc', scale: act === 3 ? 0.8 : 0.85, alpha: 0.5, tint: '#120c16', tintAmount: 0.3 });
    // two torches marking the edge of the fighting ground: this is a stage
    for (const tx of Backdrops.TORCHES) {
      Gfx.shadow(tx, 344, 30, 0.3);
      Gfx.rect(tx - 5, 262, 10, 84, '#241109');
      Gfx.rect(tx - 4, 262, 8, 84, '#5c3a20');
      Gfx.rect(tx - 4, 262, 3, 84, '#85562f');
      for (let k = 0; k < 3; k++) Gfx.rect(tx - 6, 280 + k * 20, 12, 3, '#3a2415');
      Gfx.round(tx - 11, 250, 22, 16, 5, '#241c2e');
      Gfx.round(tx - 9, 251, 18, 5, 2, '#574a66');
      for (const i of [0, 2, 1])
        World.flame(tx + (i - 1) * 4, 254, (i === 1 ? 30 : 20) + Math.abs(Math.sin(t * 6.3 + i + tx)) * 12, i === 1 ? 10 : 6,
          Math.sin(t * 4.1 + i * 2) * 3, ['#e06a1b', '#ffa832', '#ffe98a', '#9c3510'], i + tx);
      if (chance(0.3)) Particles.fire(tx + rnd(-4, 4), 236, 1);
    }
    if (act === 3) for (let i = 0; i < 3; i++) if (chance(0.35)) Particles.spawn(cam ? cam.x + rnd(-W / 2, W / 2) : rnd(0, W), 460, { n: 1, color: ['#e06a1b', '#ffa832', '#574a66'], speed: 24, gravity: -36, life: 3.4, size: 3, sizeEnd: 0 });
    if (act === 2) for (let i = 0; i < 2; i++) if (chance(0.25)) Particles.spawn(cam ? cam.x + rnd(-W / 2, W / 2) : rnd(0, W), rnd(100, 300), { n: 1, color: ['#a8e878', '#6cc95c'], speed: 8, vx: 12, gravity: -4, life: 4, size: 2 });
  }
};

class Combat {
  constructor(ids, o = {}) {
    this.ids = ids; this.kind = o.kind || 'normal'; this.act = o.act || (Game.run ? Game.run.act : 1);
    this.advantage = o.advantage || 'even';       // how the fight opened, out in the valley
    this.run = Game.run;
    this.rng = new RNG((this.run ? this.run.seed : 1) + (this.run ? this.run.fights * 977 : 0) + 31);
    this.enemies = []; this.hand = []; this.drawPile = []; this.discard = []; this.exhaust = [];
    this.energy = 3; this.maxEnergy = 3; this.turn = 0; this.hype = 0; this.encoreReady = false;
    this.phase = 'intro'; this.busy = true; this.selected = null; this.preview = null; this.riff = null;
    this.played = 0; this.powers = {}; this.flags = {}; this.t = 0; this.relicFlash = {};
    this.band = (this.run ? this.run.band : []).slice();
    this.player = { st: { str: 0, weak: 0, vuln: 0, thorns: 0, regen: 0 }, block: 0 };
    this.cam = new Camera(); this.cam.zoom = 1; this.cam.lookAt(W / 2, 288 + CAM_DY, true);
    this.bronk = new Actor({ base: 'bronk', x: 210, y: STAGE_Y, scale: ACTOR_SCALE, facing: 1 });
    this.banner = null; this.won = false; this.goldEarned = 0; this.handSlide = 0; this.zoomed = 0;
    this.hitStop = 0; this.beatPulse = 0;
  }
  get hp() { return this.run.hp; } set hp(v) { this.run.hp = v; }
  get maxHp() { return this.run.maxHp; }
  enter() {
    this.drawPile = this.rng.shuffle(this.run.deck.map(c => Cards.refresh(c)));
    for (const id of this.ids) this.spawn(id, true);
    this.layout();
    this.hype = this.run.startHype || 0;
    // who got the jump on whom, out in the grass, decides how turn one goes
    if (this.advantage === 'ambush') {
      for (const e of this.enemies) e.st.vuln = (e.st.vuln || 0) + 2;
      this.energy = this.maxEnergy + 1;
      this.hype += 15;
      this.flags.ambush = true;
    } else if (this.advantage === 'ambushed') {
      this.player.st.weak = (this.player.st.weak || 0) + 1;
      for (const e of this.enemies) e.st.str = (e.st.str || 0) + 1;
      this.flags.ambushed = true;
    }
    const boss = this.enemies.some(e => e.def.boss);
    AudioSys.play(boss ? 'blaze' : this.kind === 'elite' ? 'battle3' : `battle${Math.min(3, this.act)}`, { intensity: this.kind === 'normal' ? 1 : 2, fade: 0.35 });
    Game.worldToScreen = (x, y) => this.cam.toScreen(x, y);
    this.co = Co.run(this.intro(), this);
  }
  exit() { Co.stop(this.co); Game.worldToScreen = null; Juice.letterbox(false); }
  spawn(id, initial) {
    const e = Enemies.make(id, this.rng, this.act);
    e.actor.y = STAGE_Y; e.actor.scale = e.def.boss ? 1.5 : ACTOR_SCALE; e.spawnT = initial ? 0 : 1;
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
    Juice.letterbox(true);
    this.cam.zoom = 1.7; this.cam.lookAt(W - 240, 350 + CAM_DY * 0.5, true);
    yield 0.35;
    const lead = this.enemies[0];
    AudioSys.sfx('roar', lead.def.roar || {});
    Juice.shake(lead.def.boss ? 14 : 7, 0.5);
    lead.actor.squash(0.2);
    const sub = this.advantage === 'ambush' ? 'YOU GOT THE JUMP ON IT'
      : this.advantage === 'ambushed' ? 'IT SAW YOU COMING'
        : lead.def.boss ? 'THE BURNING ONE' : lead.def.elite ? 'ELITE'
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
    yield* Relics.trigger('onCombatStart', this);
    yield* this.startTurn();
  }
  *startTurn() {
    this.turn++; this.phase = 'player'; this.played = 0; this.flags = {};
    if (this.turn > 1) this.player.block = 0;
    this.energy = this.maxEnergy + Relics.mod('energy') + (this.powers.groove || 0);
    if (this.powers.anthem) this.addHype(this.powers.anthem);
    for (const e of this.alive()) e.intent = Enemies.pickMove(e, this, this.rng);
    this.drawCards(5 + Relics.mod('draw'));
    yield 0.18;
    if (this.band.includes('vela')) { this.gainBlock(4); }
    if (this.band.includes('pebble')) { const e = this.randomEnemy(); if (e) { yield 0.12; this.damageEnemy(e, 4 + this.act * 2, { src: 'band' }); AudioSys.sfx('hit'); yield 0.2; } }
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
    for (const e of this.enemies.slice()) {
      if (!e.alive) continue;
      if (e.st.burn > 0) { AudioSys.sfx('fire_whoosh'); this.damageEnemy(e, e.st.burn, { src: 'burn', fire: true, pierce: true }); e.st.burn--; yield 0.3; if (!e.alive) continue; }
      if (e.st.stun > 0) { e.st.stun--; Popups.add(e.actor.x, e.actor.top - 20, 'STUNNED', '#ffe98a', { scale: 1.4 }); AudioSys.sfx('stun'); yield 0.45; e.turnCount++; continue; }
      e.block = 0;
      yield* this.enemyAct(e);
      e.turnCount++; e.lastMove = e.intent ? e.intent.key : null;
      if (e.st.weak > 0) e.st.weak--; if (e.st.vuln > 0) e.st.vuln--;
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
    if (m.dmg) {
      const hits = m.hits || 1;
      for (let i = 0; i < hits; i++) {
        const home = e.actor.x;
        yield* Co.over(0.16, k => { e.actor.x = lerp(home, home - 90, Ease.inCubic(k)); }, null);
        FX.slash(this.bronk.x + 30, this.bronk.cy, { flip: true, scale: 1.2 });
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
    AudioSys.stop(0.7); AudioSys.sfx('victory');
    this.bronk.play('play');
    Juice.letterbox(true);
    this.cam.lookAt(this.bronk.x + 40, 300 + CAM_DY * 0.5); this.cam.zoomTo(1.6);
    for (let i = 0; i < 40; i++) { Particles.confetti(rnd(0, W), -10, 2); }
    yield 0.4;
    yield* Relics.trigger('onCombatEnd', this);
    if (this.band.includes('roxy')) this.heal(5, true);
    this.banner = { text: 'ENCORE!', sub: 'the valley is still standing', t: 0, life: 1.6 };
    yield 1.5;
    Game.combatWon(this);
  }
  *defeat() {
    this.phase = 'lost'; this.busy = true; AudioSys.stop(0.8); AudioSys.sfx('defeat');
    this.bronk.play('hurt');
    Juice.letterbox(true); this.cam.zoomTo(1.6); this.cam.lookAt(this.bronk.x, 340);
    this.banner = { text: 'DOWN', sub: 'the music stops', t: 0, life: 2.4 };
    yield 2.3;
    Game.go(new GameOverScene());
  }
  // --------------------------------------------------------------- card play
  canPlay(c) { return !this.busy && this.phase === 'player' && c.cost <= this.energy; }
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
    if (card.def.riff) r = yield* this.riffCo(card, target);
    yield* card.def.effect(this, card, target, r);
    if (card.v.enchDraw) this.drawCards(card.v.enchDraw);           // the amber in it
    if (card.def.type !== 'special') yield* Relics.trigger('onCardPlayed', this, card);
    this.playing = null;
    if (card.def.type === 'power' || card.def.type === 'special') { }
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
    this.bronk.play('play');
    const foe = target || this.alive()[0];
    // push in on Bronk, then settle so both performers are on screen
    this.cam.zoomTo(1.55); this.cam.lookAt(this.bronk.x + 40, 330);
    Juice.punch(0.05);
    yield 0.34;
    Juice.letterbox(false);
    this.cam.zoomTo(1.06); this.cam.lookAt(W / 2, 372);
    const windowMul = 1 + Relics.mod('window') + (this.band.includes('roxy') ? 0.12 : 0) + (this.flags.tuned ? 0.75 : 0);
    this.flags.tuned = false;
    let done = false, result = null;
    this.riff = new Riff({
      bars: card.def.riff.bars, density: card.def.riff.density, callResponse: card.def.riff.callResponse,
      title: card.name.toUpperCase(), windowMult: windowMul, act: this.act, encore: card.id === 'encore',
      onNote: (rating, n) => {
        if (!rating) { this.bronk.flash('#ef6a5e', 0.1); Juice.shake(3, 0.1); return; }
        this.bronk.squash(0.12);
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
    this.bronk.play('idle');
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
  previewDamage(base) { let d = base + this.player.st.str; if (this.player.st.weak > 0) d *= 0.75; if (this.powers.amp) d *= 1 + this.powers.amp; return Math.max(0, Math.floor(d)); }
  calcDamage(base, t) { let d = this.previewDamage(base); if (t && t.st.vuln > 0) d = Math.floor(d * 1.5); return d; }
  previewEnemyDamage(e, base) { let d = base + e.st.str; if (e.st.weak > 0) d *= 0.75; if (this.player.st.vuln > 0) d *= 1.5; d -= Relics.mod('reduce'); return Math.max(0, Math.floor(d)); }
  *dealDamage(t, amount, o = {}) {
    if (!t || !t.alive) { t = this.randomEnemy(); if (!t) return 0; }
    const home = this.bronk.x;
    if (!o.projectile) {
      yield* Co.over(o.quick ? 0.09 : 0.13, k => { this.bronk.x = lerp(home, t.actor.x - 90, Ease.inQuad(k)); });
    } else {
      Particles.spawn(this.bronk.x + 30, this.bronk.cy, { n: 8, color: ['#9391a6', '#bdbccd'], angle: 0, spread: 0.25, speed: 520, gravity: 90, life: 0.25 });
      yield 0.13;
    }
    const dmg = this.calcDamage(amount, t);
    this.damageEnemy(t, dmg, o);
    FX.slash(t.actor.x - 20, t.actor.cy, { scale: o.heavy ? 1.6 : 1.1, rot: rnd(-0.3, 0.3) });
    AudioSys.sfx(o.heavy ? 'bighit' : 'hit');
    Juice.stop(o.heavy ? 0.09 : 0.045);
    Juice.shake(o.heavy ? 11 : 6, 0.22);
    Juice.punch(o.heavy ? 0.05 : 0.025);
    if (!o.projectile) yield* Co.over(0.2, k => { this.bronk.x = lerp(t.actor.x - 90, home, Ease.outBack(k)); });
    this.bronk.x = home;
    yield o.quick ? 0.06 : 0.14;
    return dmg;
  }
  *dealAll(amount, o = {}) {
    this.bronk.stretch(0.2);
    FX.ring(W / 2, 300, { scale: 3, fps: 14 });
    yield 0.12;
    for (const e of this.alive()) { this.damageEnemy(e, this.calcDamage(amount, e), o); FX.burst(e.actor.x, e.actor.cy, { scale: 1.3 }); }
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
    e.hp -= dmg; e.hitT = 0.16; e.actor.flash('#ffffff', 0.12); e.actor.squash(0.2); e.shake = 6;
    if (dmg >= 12) {                                      // a big one gets a cartoon star
      const p2 = this.cam.toScreen(e.actor.x, e.actor.cy);
      Juice.pow(p2.x, p2.y, { r: 40 + Math.min(40, dmg), spikes: 11, col: '#ffe98a' });
    }
    Popups.add(e.actor.x + rnd(-10, 10), e.actor.cy - 10, String(dmg), dmg === 0 ? '#7a6d8a' : o.fire ? '#ffa832' : '#ffffff', { scale: dmg >= 18 ? 2.6 : 1.8, shake: dmg >= 18 ? 1.5 : 0 });
    Particles.spawn(e.actor.x, e.actor.cy, { n: Math.min(22, 6 + dmg), color: o.fire ? ['#ffa832', '#e06a1b', '#ffe08a'] : ['#c2333c', '#ef6a5e', '#ffffff'], speed: 260, life: 0.45, size: 4, sizeEnd: 0 });
    if (e.def.onHurt && e.alive) e.def.onHurt(e, this);
    if (e.hp <= 0) { e.hp = 0; this.kill(e); }
    return dmg;
  }
  kill(e) {
    if (!e.alive) return;
    e.alive = false; e.dieT = 0.01; e.intent = null;
    AudioSys.sfx('die'); Juice.stop(0.1); Juice.shake(8, 0.3);
    FX.burst(e.actor.x, e.actor.cy, { scale: 2 });
    Particles.spawn(e.actor.x, e.actor.cy, { n: 30, color: ['#ffffff', '#ffe98a', '#a79bb4'], speed: 320, life: 0.7, size: 4 });
    this.goldEarned += this.rng.int(e.def.gold[0], e.def.gold[1]);
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
      if (b > 0) { AudioSys.sfx('block'); Popups.add(this.bronk.x + 26, this.bronk.cy, `BLOCK ${b}`, '#6aa9ee'); FX.ring(this.bronk.x, this.bronk.cy, { scale: 1.1 }); }
    }
    if (dmg > 0) {
      this.hp = Math.max(0, this.hp - dmg);
      this.bronk.play('hurt'); this.bronk.flash('#ffffff', 0.14); this.bronk.squash(0.22);
      setTimeout(() => { if (this.phase !== 'lost') this.bronk.play('idle'); }, 380);
      AudioSys.sfx('hurt'); Juice.shake(Math.min(16, 5 + dmg / 2), 0.32); Juice.flash('#c2333c', 0.3, 4); Juice.stop(0.06);
      Popups.add(this.bronk.x, this.bronk.cy - 20, `-${dmg}`, '#ef6a5e', { scale: 2.2, shake: 1.5 });
      Particles.blood(this.bronk.x, this.bronk.cy, ['#c2333c', '#ef6a5e'], 12);
      this.run.stats.taken += dmg;
    } else Popups.add(this.bronk.x, this.bronk.cy - 20, '0', '#7a6d8a');
  }
  gainBlock(n) { if (n <= 0) return; this.player.block += Math.round(n); AudioSys.sfx('block'); Popups.add(this.bronk.x + 20, this.bronk.cy - 30, `+${Math.round(n)}`, '#6aa9ee'); FX.ring(this.bronk.x, this.bronk.cy, { scale: 0.9 }); }
  heal(n, quiet) { const b = this.hp; this.hp = Math.min(this.maxHp, this.hp + n); const h = this.hp - b; if (h > 0) { if (!quiet) AudioSys.sfx('heal'); Popups.add(this.bronk.x, this.bronk.cy - 40, `+${h}`, '#a8e878'); Particles.sparkle(this.bronk.x, this.bronk.cy, 10, ['#a8e878', '#6cc95c']); } }
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
    if (!quiet) { AudioSys.sfx('debuff'); Popups.add(e.actor.x, e.actor.y - 46, `${key.toUpperCase()} +${n}`, key === 'burn' ? '#ffa832' : '#b177e6'); }
  }
  applyPlayer(key, n, quiet) {
    this.player.st[key] = (this.player.st[key] || 0) + n;
    const good = ['str', 'thorns', 'regen'].includes(key);
    if (!quiet) { AudioSys.sfx(good ? 'buff' : 'debuff'); Popups.add(this.bronk.x, this.bronk.cy - 50, `${good ? '+' : ''}${n} ${key.toUpperCase()}`, good ? '#ef6a5e' : '#b177e6'); }
  }
  stun(e, turns) { if (!e || !e.alive) return; e.st.stun += turns; e.intent = null; Popups.add(e.actor.x, e.actor.cy, 'STUNNED', '#ffe98a', { scale: 1.8 }); Particles.sparkle(e.actor.x, e.actor.top, 12, ['#ffe98a']); }
  addPower(k, n) { this.powers[k] = (this.powers[k] || 0) + n; AudioSys.sfx('buff'); Popups.add(this.bronk.x, this.bronk.cy - 60, 'POWER!', '#b177e6', { scale: 1.6 }); FX.ring(this.bronk.x, this.bronk.cy, { scale: 1.4 }); }
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
      { title: 'END TURN', rect: { x: W - 180, y: H - 60, w: 168, h: 48 }, text: 'Out of energy? End the turn and the beasts act. Beat all of them to win the fight - and every beast you put down is raptor bait.' },
    ];
  }
  update(dt) {
    this.t += dt;
    if (!this.coached && this.t > 2.2 && !this.banner && this.phase === 'player' && !this.busy && this.handSlide < 0.03 && this.hand.length && this.hand.every(c => !(c.dealT > 0)) && Game.run && !(Game.run.tips || {}).combat) {
      this.coached = true;
      Game.overlay = new Coach(this.coachSteps(), () => { (Game.run.tips = Game.run.tips || {}).combat = true; Game.save(); });
    }
    if (this.riff) { this.riff.update(dt); this.bronk.play(this.riff.chanting ? 'sing' : 'play'); }
    this.bronk.update(dt);
    for (const e of this.enemies) {
      e.actor.update(dt);
      e.hitT = Math.max(0, e.hitT - dt); e.shake = Math.max(0, e.shake - dt * 24);
      if (e.spawnT > 0) e.spawnT = Math.max(0, e.spawnT - dt * 2.2);
      if (!e.alive) e.dieT += dt;
      if (e.tx !== undefined && e.alive) e.actor.x = damp(e.actor.x, e.tx, 7, dt);
      e.actor.play(e.def.boss ? 'boss' : 'idle');
    }
    for (const c of this.hand) if (c.dealT > 0) c.dealT -= dt;
    for (const k in this.relicFlash) this.relicFlash[k] -= dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.life) this.banner = null; }
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
    if (this.selected) { const e = this.enemyAt(x, y); if (e) this.play(this.selected, e); else if (y < H - 190) this.selected = null; }
  }
  // -------------------------------------------------------------------- draw
  draw() {
    Gfx.clear('#120c16');
    this.cam.apply(Gfx.ctx);
    Backdrops.draw(this.act, this.t, this.cam);
    // actors, sorted so the player never hides behind a beast
    const list = [];
    for (const e of this.enemies) {
      if (!e.alive && e.dieT > 0.75) continue;
      list.push({ y: e.actor.y, f: () => this.drawEnemy(e) });
    }
    list.push({ y: this.bronk.y + 1, f: () => this.drawBronk() });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) it.f();
    Particles.draw(Gfx.ctx, true);
    FX.draw(true);
    if (Settings.lighting !== false) lightCombat(this);
    Popups.draw(true);
    this.cam.restore(Gfx.ctx);
    if (Settings.lighting !== false) gradeCombat(this);
    Particles.draw(Gfx.ctx, false);
    FX.draw(false);
    if (this.riff) this.riff.draw();
    this.drawHud();
    if (!this.riff) this.drawHand();
    if (this.selected) this.drawTargeting();
    Popups.draw(false);
    if (this.banner) this.drawBanner();
  }
  drawBronk() {
    this.bronk.draw();
    const b = this.player.block;
    if (b > 0) {
      Gfx.sprite('icon_shield', this.bronk.x - 34, this.bronk.y - 46, { anchor: 'c', scale: 1.2 });
      Gfx.text(String(b), this.bronk.x - 34, this.bronk.y - 52, { color: '#ffffff', align: 'center', outline: true });
    }
    this.drawStatus(this.player.st, this.bronk.x - 40, this.bronk.y + 6);
    // band members backing you up
    let bx = this.bronk.x - 120;
    const beat = AudioSys.song ? (AudioSys.now() - AudioSys.songStart) / AudioSys.beatDur() : this.t * 2;
    for (const m of this.band) {
      const spr = m === 'vela' ? 'vela' : m === 'pebble' ? 'kid_a' : 'kid_b';
      const b = Math.abs(Math.sin(beat * Math.PI)) * 7;
      Gfx.shadow(bx, this.bronk.y - 6, 40, 0.25);
      Gfx.sprite(spr + '_idle', bx, this.bronk.y - 6 - b, { anchor: 'bc', frame: Math.floor(beat), scale: ACTOR_SCALE * 0.82 });
      bx -= 74;
    }
  }
  drawEnemy(e) {
    const a = e.actor;
    if (!e.alive) {
      const k = Math.min(1, e.dieT / 0.7);
      Gfx.sprite(a.sprite, a.x, a.y, { anchor: 'bc', scale: a.scale, frame: a.frame, flip: true, alpha: 1 - k, sy: 1 - k * 0.7, sx: 1 + k * 0.3, tint: '#ffffff', tintAmount: k });
      return;
    }
    const sx = e.shake ? rnd(-e.shake, e.shake) : 0;
    const y = a.y - (e.spawnT > 0 ? e.spawnT * 80 : 0) + (e.def.flying ? -56 + Math.sin(this.t * 2.6 + a.x) * 8 : 0);
    Gfx.shadow(a.x, a.y, Gfx.spr(a.sprite).w * a.scale * 0.55, 0.3);
    const hov = this.selected && !this.riff && this.enemyAt(Input.mx, Input.my) === e;
    if (hov) Gfx.sprite(a.sprite, a.x + sx, y, { anchor: 'bc', scale: a.scale, frame: a.frame, flip: true, tint: '#ffe98a', tintAmount: 1, sx: 1.06, sy: 1.06, alpha: 0.55 });
    Gfx.sprite(a.sprite, a.x + sx, y, { anchor: 'bc', scale: a.scale, frame: a.frame, flip: true, tint: e.hitT > 0 ? '#ffffff' : null, sx: a.sx, sy: a.sy });
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
    const list = [['str', 'st_str', '#ef6a5e'], ['weak', 'st_weak', '#a79bb4'], ['vuln', 'st_vuln', '#b177e6'], ['burn', 'st_burn', '#ffa832'], ['stun', 'st_stun', '#ffe98a'], ['thorns', 'st_thorns', '#e8dfc6'], ['regen', 'st_regen', '#a8e878']];
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
      HUD.portrait(x + 25, y + 25, 19, 'bronk_idle', { scale: 0.8, frame: Math.floor(this.t * 2) % 2 });
      const bx = x + 52, bw = w - 64;
      this.hpGhost = damp(this.hpGhost ?? this.hp / this.maxHp, this.hp / this.maxHp, 3, Time.dt);
      HUD.bar(bx, y + 12, bw, 14, this.hp / this.maxHp, C.life, C.lifeDark, { ghost: this.hpGhost });
      HUD.text(`${this.hp}`, bx + 5, y + 14, { scale: 1 });
      HUD.text(`/${this.maxHp}`, bx + bw - 4, y + 14, { scale: 0.9, color: C.dim, align: 'right' });
      if (this.player.block > 0) {
        Gfx.sprite('icon_shield', bx + 8, y + 38, { anchor: 'c', scale: 1 });
        HUD.text(`${this.player.block} BLOCK`, bx + 20, y + 33, { color: '#8ec8ff', scale: 1 });
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
    // ---- top right: shells, gems, menu
    if (!this.riff) UI.iconButton(W - E - 36, E, 36, 30, 'icon_menu', () => Game.pause(), { scale: 1.1 });
    HUD.chip(W - E - 36 - 8 - 84, E, 84, (x, y) => HUD.shell(x, y), this.run.gold, C.shell);
    HUD.chip(W - E - 36 - 8 - 84 - 8 - 72, E, 72, (x, y) => HUD.gem(x, y), this.run.gems || 0, C.gem);
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
