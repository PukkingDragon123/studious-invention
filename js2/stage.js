// ---------------------------------------------------------------------------
// stage.js - something on the road, played as a little film.
//
// Landing on a stranger, a mystery, a crossroads, a cave, a big dino, a
// secret or a campfire cuts from the board to a close-up set in that land's
// own country. Bars come in, the hero walks on with the family behind, the
// other party walks on from the far side (or the thing is just there), they
// talk in bubbles, the choice comes up as big carved buttons, and whatever
// happens is acted out: the heal, the bite, the gems flying across, a relic
// held up to the light, beasts running in to square up. Then back to the road.
//
// The board keeps running the event exactly as before; while a stage is up,
// its panelChoose / panelResult / quickRoll calls land here instead.
// ---------------------------------------------------------------------------
'use strict';

const STAGE = { W: 648, GY: 236, HZ: 198, HX: 226, OX: 424, CY: 186, CY_PICK: 212, Z: 3 };

class EventStage {
  constructor(B, ev, o = {}) {
    this.B = B; this.ev = ev || {}; this.o = o; this.t = 0; this.pool = o.pool || '';
    this.b = B.bd.biome; this.BI = BIOMES[this.b];
    this.cam = new Camera(); this.cam.zoom = this.cam.tzoom = STAGE.Z; this.cam.rate = 3;
    this.cam.lookAt(STAGE.W / 2, STAGE.CY, true);
    this.hero = new Actor({ base: B.hero.base, x: -30, y: STAGE.GY, scale: 1, facing: 1 });
    this.band = (B.run.band || []).map((id, i) => new Actor({ base: Heroes.get(id).base, x: -90 - i * 40, y: STAGE.GY - 6 - (i % 2) * 5, scale: 1, facing: 1 }));
    this.others = []; this.other = null; this.thing = null; this.extras = [];
    this.fx = []; this.die = null; this.flash = 0; this.choices = null; this.pick = -1; this.choiceT = 0;
    this.title = { text: this.ev.title || '', t: 0 };
    this.cast();
    this.snap();
  }
  // ------------------------------------------------------------ who is here
  cast() {
    const ev = this.ev, spr = ev.spr || '';
    const base = spr.replace(/_(idle|fly)$/, '');
    const person = base !== spr && SPRITES[base + '_idle'];
    const id = ev.id || '';
    if (person) {
      const sleeper = this.o.sleeping;
      const a = new Actor({ base, x: sleeper ? STAGE.OX + 10 : STAGE.W + 70, y: STAGE.GY, scale: 1, facing: -1 });
      a.walkIn = !sleeper; a.sleeping = sleeper;
      if (id === 'stuck') { a.x = STAGE.OX; a.walkIn = false; a.sunk = 30; }
      if (id === 'mammoth') { a.x = STAGE.OX + 20; a.walkIn = false; a.sleeping = true; }
      this.other = a; this.others.push(a);
    } else if (spr && !/^tile_/.test(spr)) {
      const s = Gfx.spr(spr);
      let sc = Math.min(ev.scale || 1, (/v_cave/.test(spr) ? 96 : 64) / s.h, 150 / s.w);
      sc = sc >= 1 ? Math.floor(sc) : sc;
      this.thing = { spr, x: STAGE.OX, y: STAGE.GY + (/v_cave/.test(spr) ? 4 : 0), sc, pop: 0 };
    }
    // a pack sleeps in a heap
    if (this.o.ids && this.o.ids.length > 1 && this.other) {
      this.o.ids.slice(1, 3).forEach((id, i) => {
        const def = ENEMIES[id]; if (!def) return;
        const a = new Actor({ base: def.base, x: this.other.x + 46 + i * 40, y: STAGE.GY + 4 + (i % 2) * 5, facing: -1 });
        a.sleeping = true; a.t = i * 0.7; this.others.push(a);
      });
    }
    // the toll has its keeper, the fork has two caves
    if (id === 'toll') this.others.push(this.other = Object.assign(new Actor({ base: 'brute', x: STAGE.W + 70, y: STAGE.GY, facing: -1 }), { walkIn: true }));
    if (id === 'fork_luck') this.extras.push({ spr: 'v_cave', x: STAGE.OX + 96, y: STAGE.GY + 4, sc: 1 });
  }
  speaker() { return this.pool === 'npc' && this.other ? this.ev.title : this.other && this.ev.id === 'toll' ? 'RAIDER' : ''; }
  // what the run looked like the last time we checked, so the stage can act
  // out whatever changed
  snap() {
    const r = this.B.run;
    this.was = { hp: r.hp, max: r.maxHp, gems: r.gems || 0, relics: r.relics.slice(), charms: (this.B.bd.charms || []).slice(), deck: r.deck.length };
  }
  // -------------------------------------------------------------- the beats
  *enter() {
    AudioSys.sfx('whoosh', { vol: 0.6 });
    this.hero.play('walk'); for (const a of this.band) a.play('walk');
    for (const a of this.others) if (a.walkIn) a.play('walk');
    let t = 0;
    while (t < 3) {
      t += Time.dt;
      let done = this.hero.moveTo(STAGE.HX, STAGE.GY, Time.dt, 150);
      this.band.forEach((a, i) => { a.moveTo(STAGE.HX - 46 - i * 34, a.y, Time.dt, 150); });
      this.others.forEach((a, i) => { if (a.walkIn && !a.moveTo(STAGE.OX + i * 44, STAGE.GY, Time.dt, 130)) done = false; });
      if (done) break;
      yield 0;
    }
    this.hero.play('idle'); this.hero.facing = 1;
    for (const a of this.band) { a.play('idle'); a.facing = 1; }
    for (const a of this.others) { a.play('idle'); a.facing = -1; }
    const lead = this.other;
    if (lead && !lead.sleeping) { lead.squash(0.2); Emotes.show(lead, '!', 0.9); }
    for (const a of this.others) if (a.sleeping) Toon.add('zzz', a, { life: 99 });
    Emotes.show(this.hero, this.pool === 'npc' ? '!' : '?', 1);
    yield 0.4;
  }
  *leave() {
    this.choices = null; this.die = null;
    this.hero.play('walk'); this.hero.facing = 1;
    for (const a of this.band) { a.play('walk'); a.facing = 1; }
    let t = 0;
    while (t < 0.7) { t += Time.dt; this.hero.x += Time.dt * 170; for (const a of this.band) a.x += Time.dt * 170; yield 0; }
  }
  *speak(text) {
    const who = this.speaker();
    const at = who ? this.other : null;
    if (at) { at.squash(0.08); }
    yield* Dialogue.say(who, text, { at });
  }
  *choose(ev) {
    this.die = null;
    this.snap();
    if (ev.text && ev.text !== this.said) { this.said = ev.text; yield* this.speak(ev.text); }
    this.cam.lookAt(STAGE.W / 2, STAGE.CY_PICK);
    this.choices = ev.choices; this.pick = -1; this.choiceT = 0;
    Emotes.show(this.hero, '?', 1.4);
    yield () => this.pick >= 0;
    const k = this.pick;
    AudioSys.sfx('select');
    this.choices = null;
    this.cam.lookAt(STAGE.W / 2, STAGE.CY);
    this.hero.stretch(0.18);
    yield 0.25;
    return k;
  }
  *result(text) {
    yield* this.react();
    this.die = null;
    if (text) yield* Dialogue.say('', text, { at: null });
  }
  // Act out whatever changed since the last look: hurt, healed, richer,
  // poorer, holding something new.
  *react() {
    const r = this.B.run, w = this.was, H0 = this.hero;
    const src = this.other || this.thing || { x: STAGE.OX, top: STAGE.GY - 40, y: STAGE.GY };
    const dh = r.hp - w.hp, dm = r.maxHp - w.max, dg = (r.gems || 0) - w.gems;
    if (dh < 0) {
      if (SPRITES[H0.base + '_hurt']) H0.play('hurt');
      H0.flash('#ffffff', 0.15); H0.squash(0.3); Juice.shake(8, 0.35);
      Toon.stars(H0, 1.6); Toon.word(H0.x - 10, H0.top - 10, 'OUCH!', { size: 2, col: '#fffaea', burst: '#c2333c', tilt: -0.12 });
      Toon.word(H0.x + 34, H0.top + 18, String(dh), { size: 1.6, col: '#ef6a5e', burst: '#120c16', life: 1.2 });
      yield 0.9; H0.play('idle');
    }
    if (dh > 0 || dm > 0) {
      Toon.hearts(H0, 1.6); Particles.sparkle(H0.x, H0.cy, 16, ['#a8e878', '#6cc95c', '#ffffff']);
      H0.squash(0.15);
      Toon.word(H0.x + 30, H0.top - 4, dm > 0 ? `+${dm} MAX` : `+${dh}`, { size: 1.8, col: '#a8e878', burst: '#14331e', life: 1.2 });
      yield 0.8;
    }
    if (dg > 0) {
      for (let i = 0; i < Math.min(12, dg * 2); i++) this.fx.push({ kind: 'gem', t: -i * 0.06, life: 0.7, x0: src.x, y0: (src.top ?? src.y - 40) + 10, x1: H0.x, y1: H0.cy, arc: 40 + (i % 3) * 16 });
      Toon.word(H0.x - 40, H0.top - 16, `+${dg} GEM${dg > 1 ? 'S' : ''}`, { size: 1.6, col: '#c28cff', burst: '#281040', life: 1.4 });
      yield 1;
    } else if (dg < 0) {
      for (let i = 0; i < Math.min(8, -dg * 2); i++) this.fx.push({ kind: 'gem', t: -i * 0.06, life: 0.6, x0: H0.x, y0: H0.cy, x1: src.x, y1: (src.top ?? src.y - 40) + 20, arc: 30 });
      yield 0.8;
    }
    for (const id of r.relics.filter(x => !w.relics.includes(x))) {
      this.fx.push({ kind: 'hold', spr: RELICS[id].spr, t: 0, life: 2.1, a: H0 });
      if (SPRITES[H0.base + '_play']) H0.play('play');
      AudioSys.sfx('relic');
      Toon.word(H0.x, H0.top - 58, RELICS[id].name.toUpperCase(), { size: 1.3, col: '#ffe98a', burst: '#3a2415', life: 2, tilt: 0 });
      yield 1.6; H0.play('idle');
    }
    const nc = (this.B.bd.charms || []).filter((c, i) => w.charms[i] !== c);
    for (const id of nc) { this.fx.push({ kind: 'hold', spr: CHARMS[id].icon, t: 0, life: 1.4, a: H0 }); yield 0.9; }
    if (r.deck.length > w.deck) { this.fx.push({ kind: 'card', t: 0, life: 1.4, a: H0 }); AudioSys.sfx('card_deal'); yield 0.9; }
    this.snap();
  }
  // beasts run on to square up; a sleeping giant gets up
  *squareUp(ids) {
    const lead = this.other;
    if (lead && lead.sleeping) {
      for (const a of this.others) { a.sleeping = false; Toon.shock(a, 0.8); a.stretch(0.3); }
      Toon.list = Toon.list.filter(e => e.kind !== 'zzz');
      AudioSys.sfx('roar', (ENEMIES[ids[0]] || {}).roar || {});
    } else {
      (ids || []).slice(0, 3).forEach((id, i) => {
        const def = ENEMIES[id]; if (!def) return;
        const a = new Actor({ base: def.base, x: STAGE.W + 80 + i * 60, y: STAGE.GY + (i % 2) * 6, facing: -1 });
        a.play('walk'); a.run = STAGE.OX + 40 + i * 48 - (this.other ? 0 : 60);
        this.others.push(a);
      });
      let t = 0;
      while (t < 1.4) {
        t += Time.dt; let all = true;
        for (const a of this.others) if (a.run !== undefined && !a.moveTo(a.run, a.y, Time.dt, 260)) all = false;
        if (all) break;
        yield 0;
      }
      for (const a of this.others) if (a.run !== undefined) { a.play('idle'); a.facing = -1; a.squash(0.2); }
      const first = this.others.find(a => a.run !== undefined) || lead;
      if (ids && ids[0]) AudioSys.sfx('roar', (ENEMIES[ids[0]] || {}).roar || {});
      if (first) Toon.steam(first, 1.6);
    }
    const f = this.others.find(a => a.run !== undefined) || lead || this.hero;
    Toon.focus(f, 1); Juice.shake(10, 0.5); Juice.flash('#ffffff', 0.3, 4);
    Toon.word(STAGE.W / 2, STAGE.GY - 120, 'FIGHT!', { size: 3, col: '#ef6a5e', burst: '#fffaea', life: 1.4 });
    Toon.shock(this.hero, 0.8);
    if (SPRITES[this.hero.base + '_play']) this.hero.play('play');
    yield 1.1;
  }
  // ---------------------------------------------------------------- update
  update(dt) {
    this.t += dt; this.title.t += dt; this.choiceT += dt;
    this.flash = Math.max(0, this.flash - dt * 3);
    this.cam.update(dt);
    this.hero.update(dt); for (const a of this.band) a.update(dt); for (const a of this.others) a.update(dt);
    if (this.thing) this.thing.pop = Math.min(1, this.thing.pop + dt * 3);
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i]; const was = f.t; f.t += dt;
      if (f.kind === 'gem' && was < f.life && f.t >= f.life) { Particles.sparkle(f.x1, f.y1, 5, ['#c28cff', '#ffffff']); AudioSys.sfx('gem', { vol: 0.35 }); }
      if (f.t > f.life + 0.1) this.fx.splice(i, 1);
    }
    if (this.choices) for (const k of Input.keys) if (/^Digit[1-4]$/.test(k.code)) { const i = +k.code.slice(5) - 1; const c = this.choices[i]; if (c && c.ok !== false && this.choiceT > 0.3) this.pick = i; }
  }
  // ------------------------------------------------------------------ draw
  draw() {
    const ctx = Gfx.ctx, cam = this.cam;
    Gfx.clear(this.BI.sky[0]);
    cam.apply(ctx);
    const camL = cam.x - W / (2 * cam.zoom), L = camL - 60, R = camL + W / cam.zoom + 60;
    // the far country, the same as over the board, let down to this horizon
    ctx.save(); ctx.translate(0, STAGE.HZ - HORIZON);
    BoardSky.draw(this.B, L, R, camL);
    ctx.restore();
    if (this.ev.id === 'storm') { ctx.globalAlpha = 0.55; Gfx.rect(L, -100, R - L, STAGE.HZ + 120, '#1a1424'); ctx.globalAlpha = 1; if (Math.sin(this.t * 1.7) > 0.985) { Juice.flash('#ffffff', 0.5, 6); AudioSys.sfx('thunder', { vol: 0.5 }); } }
    this.ground(L, R);
    this.dress(L, R);
    // everybody, by their feet
    const list = [];
    if (this.thing) list.push({ y: this.thing.y, f: () => this.drawThing() });
    for (const e of this.extras) list.push({ y: e.y, f: () => Gfx.sprite(e.spr, e.x, e.y, { anchor: 'bc', scale: e.sc }) });
    for (const a of this.band) list.push({ y: a.y, f: () => a.draw() });
    for (const a of this.others) list.push({ y: a.y, f: () => this.drawOther(a) });
    list.push({ y: this.hero.y + 0.5, f: () => this.hero.draw() });
    list.sort((p, q) => p.y - q.y);
    for (const it of list) it.f();
    if (this.die) this.die.draw();
    for (const f of this.fx) this.drawFx(f);
    Particles.draw(ctx, true); FX.draw(true);
    Emotes.draw(); Floaters.draw(); Popups.draw(true);
    Toon.draw(false);
    this.lights();
    cam.restore(ctx);
    this.foreground();
    Post.grade(this.b);
  }
  ground(L, R) {
    const G = GROUND[this.BI.ground], ctx = Gfx.ctx;
    if (!EventStage.grounds) EventStage.grounds = {};
    let cv = EventStage.grounds[this.b];
    if (!cv) {
      // a strip of this land's ground, darker and hazier towards the horizon
      const w = 512, h = 130; cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const g = cv.getContext('2d'), img = g.createImageData(w, h), px = new Uint32Array(img.data.buffer);
      const RR = G.ramp.map(c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]);
      const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      const hz = G.haze;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const n = Math.sin(x * 0.11 + y * 0.37) * 0.5 + Math.sin(x * 0.043 - y * 0.21 + 2) * 0.6 + Math.sin(x * 0.29 + y * 0.9) * 0.25;
        let lv = 3.2 - (1 - y / h) * 1.4 + n * 0.7;
        const i = clamp(Math.floor(lv + ((BAY[((y & 3) << 2) | (x & 3)] + 0.5) / 16 - 0.5) + 0.5), 0, RR.length - 1);
        let c = RR[i];
        const k = clamp(1 - y / 36, 0, 1) * (G.hazeK || 0.5);
        c = [c[0] + (hz[0] - c[0]) * k, c[1] + (hz[1] - c[1]) * k, c[2] + (hz[2] - c[2]) * k].map(v => v | 0);
        px[y * w + x] = ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;
      }
      g.putImageData(img, 0, 0);
      // specks and tufts
      for (let i = 0; i < 260; i++) {
        const x = (i * 97) % w, y = 20 + (i * 53) % (h - 22);
        g.fillStyle = i % 5 ? G.tuft[i % G.tuft.length] : G.specks[i % G.specks.length];
        g.fillRect(x, y, i % 5 ? 1 : 2, i % 5 ? 2 : 1);
        if (i % 5) g.fillRect(x + 1, y - 1, 1, 2);
      }
      EventStage.grounds[this.b] = cv;
    }
    const y0 = STAGE.HZ - 4;
    for (let x = Math.floor(L / 512) * 512; x < R; x += 512) ctx.drawImage(cv, x, y0);
    // a worn patch where everyone stands
    ctx.globalAlpha = 0.35; Gfx.round(STAGE.HX - 120, STAGE.GY - 6, 420, 14, 7, G.worn); ctx.globalAlpha = 1;
  }
  // a few of the land's own things round the edges, and the special sets
  dress(L, R) {
    const P = this.BI.props, id = this.ev.id;
    const back = [[70, STAGE.HZ + 6, P.back[0]], [590, STAGE.HZ + 8, P.back[1 % P.back.length]], [520, STAGE.HZ + 4, P.mid[2 % P.mid.length]]];
    for (const [x, y, s] of back) Gfx.sprite(s, x, y, Object.assign({ anchor: 'bc' }, this.BI.tint || {}));
    const mid = [[96, STAGE.GY + 2, P.mid[0]], [590, STAGE.GY + 4, P.mid[1 % P.mid.length]]];
    for (const [x, y, s] of mid) Gfx.sprite(s, x, y, Object.assign({ anchor: 'bc' }, this.BI.tint || {}));
    const ctx = Gfx.ctx;
    if (id === 'river') {
      for (let y = STAGE.HZ + 8; y < STAGE.HZ + 30; y++) {
        const k = (y - STAGE.HZ - 8) / 22;
        Gfx.rect(L, y, R - L, 1, k < 0.15 || k > 0.9 ? '#1d3d72' : '#3570c0');
        if (((y * 7 + Math.floor(this.t * 14)) % 9) === 0) for (let x = Math.floor(L / 40) * 40; x < R; x += 40) Gfx.rect(x + ((y * 13) % 40), y, 8, 1, '#a8d8ff');
      }
      Gfx.rect(470, STAGE.HZ + 14, 90, 5, '#3a2415'); Gfx.rect(470, STAGE.HZ + 13, 90, 2, '#85562f');
    }
    if (id === 'stuck') { Gfx.round(STAGE.OX - 44, STAGE.GY - 12, 88, 22, 11, '#3a2415'); Gfx.round(STAGE.OX - 38, STAGE.GY - 12, 76, 8, 4, '#5c3a20'); }
    if (id === 'nest') { Gfx.round(STAGE.OX - 34, STAGE.GY - 12, 68, 16, 8, '#4a2512'); for (let i = 0; i < 14; i++) Gfx.rect(STAGE.OX - 32 + i * 5, STAGE.GY - 12 + (i % 3) * 3, 7, 1, i % 2 ? '#a3663a' : '#75401f'); }
    if (id === 'toll') { Gfx.rect(STAGE.OX + 56, STAGE.GY - 70, 4, 70, '#3a2415'); Gfx.sprite('v_skull', STAGE.OX + 58, STAGE.GY - 66, { anchor: 'bc' }); }
    if (this.o.camp) {
      Gfx.sprite('v_campfire', STAGE.W / 2 + 10, STAGE.GY + 6, { anchor: 'bc', frame: Math.floor(this.t * 10), scale: 1 });
      if (chance(0.3)) Particles.embers(STAGE.W / 2 + 10, STAGE.GY - 16, 1);
    }
    if (this.o.secret) {
      for (let i = 0; i < 2; i++) if (chance(0.3)) Particles.sparkle(STAGE.OX + rnd(-30, 30), STAGE.GY - rnd(10, 60), 1, ['#ffe98a', '#ffffff']);
    }
    void ctx;
  }
  drawThing() {
    const T = this.thing, k = Ease.outBack(T.pop);
    const bob = /v_cave|v_signpost|v_skull|v_basket|h_drum|v_bones/.test(T.spr) ? 0 : Math.sin(this.t * 2.4) * 2;
    Gfx.shadow(T.x, T.y, Gfx.spr(T.spr).w * T.sc * 0.5, 0.3);
    Gfx.sprite(T.spr, T.x, T.y - bob, { anchor: 'bc', scale: T.sc * k, frame: Math.floor(this.t * 4) });
    if (/ti_gem|ti_berries|art_bolt/.test(T.spr) && chance(0.08)) Particles.sparkle(T.x + rnd(-14, 14), T.y - rnd(20, 50), 1, ['#ffe98a', '#ffffff']);
  }
  drawOther(a) {
    if (a.sunk) {
      const ctx = Gfx.ctx; ctx.save(); ctx.beginPath(); ctx.rect(a.x - 100, a.y - 300, 200, 300 - a.sunk + 4); ctx.clip();
      const y = a.y; a.y += a.sunk; a.draw(); a.y = y; ctx.restore(); return;
    }
    a.draw();
  }
  drawFx(f) {
    if (f.t < 0) return;
    const k = clamp(f.t / f.life, 0, 1);
    if (f.kind === 'gem') {
      const x = lerp(f.x0, f.x1, k), y = lerp(f.y0, f.y1, k) - Math.sin(k * Math.PI) * f.arc;
      if (k < 1) Gfx.sprite('ti_gem', x, y, { anchor: 'c', scale: 0.6, rot: f.t * 8 });
    } else if (f.kind === 'hold') {
      // held up over the head, in a burst of light
      const a = f.a, rise = Ease.outBack(clamp(f.t / 0.4, 0, 1)), x = a.x, y = a.top - 20 - rise * 16;
      const fade = clamp((f.life - f.t) / 0.3, 0, 1), ctx = Gfx.ctx;
      ctx.save(); ctx.globalAlpha = fade * 0.6; ctx.translate(x, y); ctx.rotate(f.t * 0.8);
      ctx.fillStyle = '#ffe98a';
      for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-3, -26); ctx.lineTo(3, -26); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      ctx.globalAlpha = fade;
      Gfx.sprite(f.spr, x, y, { anchor: 'c', scale: 1.4 * rise });
      ctx.globalAlpha = 1;
    } else if (f.kind === 'card') {
      const a = f.a, x = a.x, y = a.top - 30 - Ease.outBack(clamp(f.t / 0.4, 0, 1)) * 10, ctx = Gfx.ctx;
      ctx.save(); ctx.globalAlpha = clamp((f.life - f.t) / 0.3, 0, 1); ctx.translate(x, y); ctx.scale(Math.cos(f.t * 6) * 0.35, 0.35);
      Cards.back(-CARD_W / 2, -CARD_H / 2, 1);
      ctx.restore();
    }
  }
  lights() {
    if (!window.Post) return;
    if (this.o.camp) Post.light(STAGE.W / 2 + 10, STAGE.GY - 20, 150, '#ffa832', 0.8 + Math.sin(this.t * 9) * 0.08);
    if (/v_cave/.test(this.ev.spr || '')) Post.light(STAGE.OX, STAGE.GY - 30, 90, '#b177e6', 0.3);
    for (const f of this.fx) if (f.kind === 'hold' && f.t < f.life) Post.light(f.a.x, f.a.top - 30, 90, '#ffe98a', 0.6);
  }
  // big, dark, out-of-focus things in the corners, like the board's near edge
  foreground() {
    const FG = { 1: ['v_fern', 'v_bush'], 2: ['v_bush_jungle', 'v_fern'], 3: ['v_rock_bare', 'v_bones'], 4: ['v_rock_bare', 'v_pine'], 5: ['v_rock_bare', 'v_skull'] }[this.b];
    const shade = { 1: '#0e2414', 2: '#06140e', 3: '#3a1a0e', 4: '#1a2438', 5: '#0a060a' }[this.b];
    const sw = Math.sin(this.t * 1.1) * 0.03;
    Gfx.sprite(FG[0], 40, H + 30, { anchor: 'bc', scale: 4, tint: shade, tintAmount: 0.6, rot: sw });
    Gfx.sprite(FG[1], W - 50, H + 24, { anchor: 'bc', scale: 4, flip: true, tint: shade, tintAmount: 0.6, rot: -sw });
    if (this.b === 2) for (let i = 0; i < 5; i++) { const x = 60 + i * 210, len = 60 + (i * 41) % 70; for (let y = 0; y < len; y += 3) Gfx.rect(x + Math.sin(this.t + i) * 4 * (y / len), y, 3, 3, '#06140e'); }
  }
  // the interface over the film: the title, the purse, the choices
  drawUI() {
    const T = this.title;
    if (T.text && T.t < 2.4) {
      const k = T.t < 0.3 ? Ease.outBack(T.t / 0.3) : T.t > 2 ? 1 - (T.t - 2) / 0.4 : 1;
      const tw = Math.max(300, Gfx.measure(T.text, 2.4) + 60), th = 54, tx = W / 2 - tw / 2, ty = 70;
      Gfx.ctx.save(); Gfx.ctx.globalAlpha = clamp(k, 0, 1); Gfx.ctx.translate(W / 2, ty + th / 2); Gfx.ctx.scale(k, k); Gfx.ctx.translate(-W / 2, -(ty + th / 2));
      UI.slab(tx, ty, tw, th, { r: 5, shadow: true });
      Gfx.text(T.text, W / 2, ty + 17, { color: SKIN.faceHi, align: 'center', scale: 2.4 });
      Gfx.text(T.text, W / 2, ty + 15, { color: '#9c3510', align: 'center', scale: 2.4 });
      Gfx.ctx.restore();
    } else if (T.text) {
      const tw = Gfx.measure(T.text, 1) + 16;
      Gfx.round(W - tw - 14, 62, tw, 18, 4, 'rgba(18,12,22,0.8)');
      Gfx.text(T.text, W - 14 - tw / 2, 66, { color: '#ffe98a', align: 'center' });
    }
    // the hero's life and purse, so you can see what the choice cost
    const r = this.B.run, C = HUD.C;
    HUD.plate(12, 62, 190, 30, { gold: false });
    HUD.bar(20, 70, 110, 14, r.hp / r.maxHp, C.life, C.lifeDark);
    HUD.text(`${r.hp}/${r.maxHp}`, 24, 72, { scale: 1 });
    HUD.gem(146, 77, 1); HUD.text(String(r.gems || 0), 158, 72, { color: C.gem, scale: 1 });
    if (this.choices) this.drawChoices();
    if (this.flash > 0.01) Gfx.rectA(0, 0, W, H, '#ffffff', clamp(this.flash, 0, 1) * 0.9);
  }
  drawChoices() {
    const n = this.choices.length, bw = 600, bh = 46, gap = 6;
    const x = W / 2 - bw / 2, y0 = H - 60 - n * (bh + gap);
    this.choices.forEach((ch, i) => {
      const k = Ease.outBack(clamp(this.choiceT * 5 - i * 0.35, 0, 1));
      if (k <= 0) return;
      const ok = ch.ok !== false, y = y0 + i * (bh + gap) + (1 - k) * 40;
      const hov = ok && UI.hovered(x, y, bw, bh);
      Gfx.ctx.save(); Gfx.ctx.globalAlpha = clamp(k, 0, 1);
      UI.slab(x, y - (hov ? 2 : 0), bw, bh, { face: hov ? SKIN.btn : ok ? SKIN.face : '#8a7f68', lit: hov ? SKIN.btnLit : SKIN.faceLit, mid: SKIN.btnDark, dark: SKIN.ink, r: 5, shadow: true, rough: false, len: 7 });
      Gfx.circle(x + 24, y + bh / 2 - (hov ? 2 : 0), 13, SKIN.ink);
      Gfx.circle(x + 24, y + bh / 2 - (hov ? 2 : 0), 11, ok ? '#e0b93a' : '#574a66');
      Gfx.text(String(i + 1), x + 24, y + bh / 2 - 6 - (hov ? 2 : 0), { color: '#241c2e', align: 'center', scale: 1.2 });
      Gfx.text(ch.label, x + 46, y + 7 - (hov ? 2 : 0), { color: ok ? (hov ? '#fffaea' : '#3a2415') : '#5c3a20', scale: 1.6 });
      Gfx.rich(ch.desc || '', x + 46, y + 29 - (hov ? 2 : 0), { color: ok ? (hov ? '#fffaea' : '#241c2e') : '#5c3a20', onLight: !hov && ok, scale: 1 });
      Gfx.ctx.restore();
      if (ok) UI.hit(x, y, bw, bh, () => { if (this.choiceT > 0.35 && this.pick < 0) this.pick = i; });
    });
  }
}
