// ---------------------------------------------------------------------------
// village.js - tile-based overworld: four-way movement, stamina, patrolling
// enemies with vision cones, hiding, campfires, fog encounters, wandering
// traders and NPCs with speech bubbles.
// ---------------------------------------------------------------------------
'use strict';

const ZONES = {
  1: {
    name: 'BEDROCK VILLAGE', sub: 'what the fire left behind', music: 'village',
    goal: 'THE VILLAGE GATE', w: 92, h: 66, base: ['tile_grass', 'tile_grass', 'tile_grass2'], rough: 'tile_dirt', path: 'tile_path',
    scatter: ['prop_bush', 'prop_fern', 'prop_rock', 'prop_tree', 'prop_bones'],
    trees: ['prop_tree', 'prop_palm'], hide: ['prop_bush'],
    enemies: ['compy', 'dodo', 'boar'], elite: 'raptor', encounters: 1,
    sky: '#7fb0c8',
  },
  2: {
    name: 'TAR JUNGLE', sub: 'sticky, steaming, full of teeth', music: 'village',
    goal: 'THE TAR GATE', w: 96, h: 70, base: ['tile_moss', 'tile_grass', 'tile_moss'], rough: 'tile_dirt2', path: 'tile_dirt',
    scatter: ['prop_fern', 'prop_mushroom', 'prop_bush', 'prop_palm', 'prop_skull'],
    trees: ['prop_palm', 'prop_tree'], hide: ['prop_bush', 'prop_fern'],
    enemies: ['raptor', 'ptero', 'tarblob', 'lizard'], elite: 'tricera', encounters: 2,
    sky: '#2f5a38',
  },
  3: {
    name: 'VOLCANO SLOPE', sub: "the raptor's road home", music: 'village',
    goal: 'THE ASH GATE', w: 94, h: 70, base: ['tile_ash', 'tile_stone', 'tile_ash'], rough: 'tile_rubble', path: 'tile_stone',
    scatter: ['prop_rock', 'prop_deadtree', 'prop_bones', 'prop_skull'],
    trees: ['prop_deadtree'], hide: ['prop_rock'],
    enemies: ['lizard', 'brute', 'stego', 'raptor'], elite: 'trex', encounters: 3,
    sky: '#5a2018',
  },
};

const SOLID_TILES = new Set(['tile_water', 'tile_lava']);

class Zone {
  constructor(act, seed) {
    this.act = act; this.def = ZONES[act] || ZONES[1];
    this.rng = new RNG(seed + act * 7919);
    this.w = this.def.w; this.h = this.def.h;
    this.tiles = new Array(this.w * this.h);
    this.solid = new Uint8Array(this.w * this.h);
    this.objects = [];   // static scenery, y-sorted with entities
    this.entities = [];
    this.generate();
  }
  idx(x, y) { return y * this.w + x; }
  inside(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  tileAt(wx, wy) { const x = Math.floor(wx / TILE), y = Math.floor(wy / TILE); return this.inside(x, y) ? this.tiles[this.idx(x, y)] : null; }
  isSolid(wx, wy) {
    const x = Math.floor(wx / TILE), y = Math.floor(wy / TILE);
    if (!this.inside(x, y)) return true;
    return !!this.solid[this.idx(x, y)];
  }
  setSolid(x, y, v = 1) { if (this.inside(x, y)) this.solid[this.idx(x, y)] = v; }
  // ------------------------------------------------------------- generation
  generate() {
    const r = this.rng, d = this.def;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const n = Math.sin(x * 0.31 + y * 0.17) + Math.sin(x * 0.11 - y * 0.27) * 0.8;
      this.tiles[this.idx(x, y)] = n > 0.9 ? d.rough : r.pick(d.base);
    }
    // border of impassable scenery
    for (let x = 0; x < this.w; x++) { this.setSolid(x, 0); this.setSolid(x, 1); this.setSolid(x, this.h - 1); this.setSolid(x, this.h - 2); }
    for (let y = 0; y < this.h; y++) { this.setSolid(0, y); this.setSolid(1, y); this.setSolid(this.w - 1, y); this.setSolid(this.w - 2, y); }

    // points of interest, spread left to right so the zone reads as a journey
    const pois = [];
    const lane = (fx, fy) => ({ x: Math.floor(4 + fx * (this.w - 10)), y: Math.floor(4 + fy * (this.h - 10)) });
    this.start = lane(0.06, 0.5);
    pois.push(this.start);
    const midCount = 8;
    for (let i = 0; i < midCount; i++) pois.push(lane(0.12 + i * 0.095, r.float(0.14, 0.86)));
    this.bossSpot = lane(0.93, 0.5);
    pois.push(this.bossSpot);
    // carve paths between consecutive points of interest
    for (let i = 0; i < pois.length - 1; i++) this.carvePath(pois[i], pois[i + 1]);
    for (let i = 0; i < 3; i++) { const a = r.pick(pois), b = r.pick(pois); if (a !== b) this.carvePath(a, b); }
    this.pois = pois;

    // the village square: huts around the second point of interest
    const sq = pois[1];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      const hx = sq.x + Math.round(Math.cos(a) * 5), hy = sq.y + Math.round(Math.sin(a) * 4);
      this.addProp(hx * TILE + 16, hy * TILE + 16, this.act === 1 && i > 1 ? 'prop_hut_ruin' : (this.act === 1 ? 'prop_hut' : 'prop_hut_ruin'), { footW: 3, footH: 2 });
    }
    this.addProp(sq.x * TILE + 16, (sq.y + 3) * TILE, 'prop_totem', { footW: 1, footH: 1 });

    // scenery: dense woods at the rim, open ground along the paths and squares
    const tries = Math.floor(this.w * this.h * 0.14);   // sparse: the ruin should feel abandoned, not overgrown
    const openness = (x, y) => {
      let d2 = 1e9;
      for (const p of pois) d2 = Math.min(d2, (p.x - x) ** 2 + (p.y - y) ** 2);
      return clamp(Math.sqrt(d2) / 15, 0, 1);      // 0 at a landmark, 1 far away
    };
    for (let i = 0; i < tries; i++) {
      const x = r.int(2, this.w - 3), y = r.int(2, this.h - 3);
      if (this.tiles[this.idx(x, y)] === d.path || this.solid[this.idx(x, y)]) continue;
      let near = false;
      for (let oy = -1; oy <= 1 && !near; oy++) for (let ox = -1; ox <= 1; ox++) if (this.inside(x + ox, y + oy) && this.tiles[this.idx(x + ox, y + oy)] === d.path) { near = true; break; }
      if (near) continue;
      const open = openness(x, y);
      if (open < 0.45 && r.chance(0.86)) continue;   // keep the squares and roads clear
      const roll = r.next();
      if (roll < 0.22 * open + 0.04) this.addProp(x * TILE + 16, y * TILE + 26, r.pick(d.trees), { footW: 1, footH: 1 });
      else if (roll < 0.55) this.addProp(x * TILE + 16, y * TILE + 26, r.pick(d.scatter), { footW: 1, footH: 1, solid: roll > 0.44 });
      else if (roll < 0.70) this.addProp(x * TILE + 16, y * TILE + 26, r.pick(d.hide), { hide: true });
    }
    // a dense treeline around the rim so the zone feels bounded
    for (let i = 0; i < this.w * 2; i++) {
      const x = r.int(1, this.w - 2), y = r.chance(0.5) ? r.int(0, 2) : r.int(this.h - 3, this.h - 1);
      this.addProp(x * TILE + 16, y * TILE + 26, r.pick(d.trees), { footW: 1, footH: 1 });
    }
    for (let i = 0; i < this.h * 2; i++) {
      const y = r.int(1, this.h - 2), x = r.chance(0.5) ? r.int(0, 2) : r.int(this.w - 3, this.w - 1);
      this.addProp(x * TILE + 16, y * TILE + 26, r.pick(d.trees), { footW: 1, footH: 1 });
    }
    // a few pots and baskets for looting near the square
    for (let i = 0; i < 6; i++) {
      const x = sq.x + r.int(-6, 6), y = sq.y + r.int(-5, 5);
      if (!this.inside(x, y) || this.solid[this.idx(x, y)]) continue;
      this.addProp(x * TILE + 16, y * TILE + 24, r.chance(0.5) ? 'prop_pot' : 'prop_barrel', { loot: true });
    }
    this.buildEntities();
  }
  carvePath(a, b) {
    let x = a.x, y = a.y; const d = this.def; let guard = 0;
    while ((x !== b.x || y !== b.y) && guard++ < 500) {
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        if (Math.abs(ox) + Math.abs(oy) > 1) continue;
        if (this.inside(x + ox, y + oy)) { this.tiles[this.idx(x + ox, y + oy)] = d.path; this.solid[this.idx(x + ox, y + oy)] = 0; }
      }
      if (x !== b.x && (y === b.y || this.rng.chance(0.62))) x += sign(b.x - x); else y += sign(b.y - y);
    }
  }
  addProp(px, py, spr, o = {}) {
    const s = Gfx.spr(spr);
    const obj = { x: px, y: py, spr, hide: o.hide, loot: o.loot, taken: false, frame: this.rng.int(0, 3), sway: this.rng.float(0, 6.28) };
    this.objects.push(obj);
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    const solid = o.solid !== undefined ? o.solid : (!o.hide && !o.loot && s.h > 40);
    if (solid) {
      const fw = o.footW || 1, fh = o.footH || 1;
      for (let dy = 0; dy < fh; dy++) for (let dx = -(fw >> 1); dx <= (fw >> 1); dx++) this.setSolid(tx + dx, ty - dy, 1);
    }
    return obj;
  }
  buildEntities() {
    const r = this.rng, d = this.def, P = this.pois;
    // campfires at every other point of interest
    for (let i = 1; i < P.length - 1; i += 2) {
      this.entities.push(new Campfire(P[i].x * TILE + 16, P[i].y * TILE + 16));
    }
    // villagers near the square
    const sq = P[1];
    const lines = [
      ['ELDER', "The burning one came at dawn. It took your family east, Bronk.", 'elder'],
      ['', "My hut! My beautiful rock hut!", 'villager'],
      ['', "I saw it. Fire on its back. It did not even roar.", 'villager2'],
      ['', "Take my last gourd. You will need it more than me.", 'villager2'],
    ];
    for (let i = 0; i < lines.length; i++) {
      const a = (i / lines.length) * Math.PI * 2;
      const x = sq.x * TILE + 16 + Math.cos(a) * 92, y = sq.y * TILE + 16 + Math.sin(a) * 70;
      this.entities.push(new Npc(x, y, lines[i][2], lines[i][0], lines[i][1]));
    }
    // villagers wandering the wider ruin, with things to say
    const chatter = [
      ['', "Everything I own is under that roof. The roof is under the floor."],
      ['', "Do not go east. Please do not go east."],
      ['', "I heard it singing. The fire one. Singing."],
      ['', "My gourds! Six seasons of gourds!"],
      ['', "Bronk. Bronk! Tell me you have a plan."],
      ['', "Mammoth came through with the packs. Charged me double."],
      ['', "The tar is rising in the low field again."],
      ['', "You were always the loud one. Be loud."],
    ];
    for (let i = 0; i < 6; i++) {
      const p = P[r.int(1, P.length - 2)];
      const line = r.pick(chatter);
      this.entities.push(new Npc(p.x * TILE + r.int(-110, 110), p.y * TILE + r.int(-80, 80), r.chance(0.5) ? 'villager' : 'villager2', line[0], line[1]));
    }
    // harmless critters that scatter when you get close
    for (let i = 0; i < 7; i++) {
      let x, y, guard = 0;
      do { x = r.int(3, this.w - 4); y = r.int(3, this.h - 4); guard++; } while (guard < 40 && this.solid[this.idx(x, y)]);
      this.entities.push(new Critter(x * TILE + 16, y * TILE + 16, r.pick(['compy', 'dodo'])));
    }
    // patrolling enemies between the points of interest
    const count = 5 + this.act * 2;
    for (let i = 0; i < count; i++) {
      const a = P[r.int(1, P.length - 2)], b = P[r.int(1, P.length - 2)];
      const kind = r.pick(d.enemies);
      const e = new Prowler(a.x * TILE + 16, a.y * TILE + 16, kind, this.act);
      e.route = [{ x: a.x * TILE + 16, y: a.y * TILE + 16 }, { x: b.x * TILE + 16, y: b.y * TILE + 16 }];
      this.entities.push(e);
    }
    // one elite guarding the way to the boss
    const g = P[P.length - 2];
    const elite = new Prowler(g.x * TILE + 16, g.y * TILE + 16, d.elite, this.act, true);
    elite.route = [{ x: g.x * TILE + 16, y: g.y * TILE + 16 }, { x: g.x * TILE + 16 + 140, y: g.y * TILE + 16 }];
    this.entities.push(elite);
    // mystery fog in the quiet corners
    for (let i = 0; i < 3 + this.act; i++) {
      let x, y, guard = 0;
      do { x = r.int(3, this.w - 4); y = r.int(3, this.h - 4); guard++; } while (guard < 60 && this.solid[this.idx(x, y)]);
      this.entities.push(new FogNode(x * TILE + 16, y * TILE + 16));
    }
    // the wandering mammoth trader walks its own circuit
    this.trader = new Trader(P[2].x * TILE + 16, P[2].y * TILE + 60);
    this.trader.spots = P.slice(1, P.length - 1).map(p => ({ x: p.x * TILE + 16, y: p.y * TILE + 40 }));
    this.entities.push(this.trader);
    // the way out of the valley
    this.entities.push(new ZoneGoal(this.bossSpot.x * TILE + 16, this.bossSpot.y * TILE + 16, this.act, this.def.goal));
  }
}

// --------------------------------------------------------------- entities
class Entity {
  constructor(x, y) { this.x = x; this.y = y; this.dead = false; this.r = 16; }
  update() { } draw() { } interact() { }
}

class Npc extends Entity {
  constructor(x, y, base, name, line) {
    super(x, y);
    this.actor = new Actor({ base, x, y, scale: 1 });
    this.name = name; this.line = line; this.prompt = 'TALK';
    this.t = rnd(0, 6); this.home = { x, y }; this.wander = rnd(2, 6);
  }
  update(dt, V) {
    this.t += dt;
    if (this.t > this.wander) {
      this.t = 0; this.wander = rnd(3, 7);
      this.target = { x: this.home.x + rnd(-40, 40), y: this.home.y + rnd(-30, 30) };
    }
    if (this.target) { if (this.actor.moveTo(this.target.x, this.target.y, dt, 26)) this.target = null; this.actor.play('walk'); }
    else this.actor.play('idle');
    this.x = this.actor.x; this.y = this.actor.y;
    this.actor.update(dt);
    if (chance(dt * 0.06) && this.line) Dialogue.float(this.actor, this.line.length > 34 ? this.line.slice(0, 32) + '...' : this.line);
  }
  draw() { this.actor.draw(); }
  *interact(V) { yield* Dialogue.say(this.name || 'VILLAGER', this.line, { at: this.actor }); }
}

class Campfire extends Entity {
  constructor(x, y) { super(x, y); this.prompt = 'REST'; this.used = false; this.t = rnd(0, 4); }
  update(dt) { this.t += dt; if (chance(dt * 6)) Particles.fire(this.x + rnd(-5, 5), this.y - 18, 1); }
  draw() {
    if (!this.used) { Gfx.ctx.globalAlpha = 0.25 + Math.sin(this.t * 7) * 0.05; Gfx.circle(this.x, this.y - 8, 54, '#e06a1b'); Gfx.ctx.globalAlpha = 1; }
    Gfx.sprite('prop_campfire', this.x, this.y + 8, { anchor: 'bc', frame: this.used ? 3 : Math.floor(this.t * 9), alpha: this.used ? 0.5 : 1, tint: this.used ? '#3b3048' : null, tintAmount: this.used ? 0.7 : 0 });
  }
  *interact(V) {
    if (this.used) { yield* Dialogue.say('', 'Cold ashes. This fire has given all it had.', { at: { x: this.x, top: this.y - 40 } }); return; }
    const run = Game.run;
    const heal = Math.round(run.maxHp * 0.35);
    const pick = yield* Dialogue.choose('CAMPFIRE', 'The embers are still warm. You could catch your breath here.',
      [`Rest  ({g}+${heal} HP{/}, full stamina)`, 'Practice  ({g}upgrade a riff{/})', 'Leave it burning'], { at: { x: this.x, top: this.y - 46 } });
    if (pick === 0) {
      run.hp = Math.min(run.maxHp, run.hp + heal); run.stamina = run.maxStamina; this.used = true;
      AudioSys.sfx('rest_sfx'); Popups.add(this.x, this.y - 40, `+${heal} HP`, '#a8e878', { scale: 1.6 });
      Particles.sparkle(this.x, this.y - 30, 18);
    } else if (pick === 1) {
      const up = run.deck.filter(c => !c.up);
      if (!up.length) { yield* Dialogue.say('', 'Every riff you know is already sharp.', { at: { x: this.x, top: this.y - 40 } }); return; }
      Game.overlay = new DeckOverlay(up, 'PRACTICE: UPGRADE A RIFF', { onPick: c => { c.up = true; Cards.refresh(c); AudioSys.sfx('unlock'); Game.overlay = null; this.used = true; run.stamina = run.maxStamina; } });
      yield () => !Game.overlay;
    }
  }
}

class FogNode extends Entity {
  constructor(x, y) { super(x, y); this.prompt = 'ENTER'; this.t = rnd(0, 6); }
  update(dt) { this.t += dt; if (chance(dt * 3)) Particles.spawn(this.x + rnd(-24, 24), this.y + rnd(-14, 6), { n: 1, color: ['#4b2070', '#281040', '#7c3eb2'], speed: 14, gravity: -14, life: 1.5, size: 6, sizeEnd: 0 }); }
  draw() {
    Gfx.sprite('prop_fog', this.x, this.y + 16, { anchor: 'bc', frame: Math.floor(this.t * 6), scale: 1.15 });
    Gfx.text('?', this.x, this.y - 34 + Math.sin(this.t * 3) * 3, { color: '#b177e6', align: 'center', scale: 2.2, outline: true, outlineWidth: 2 });
  }
  *interact(V) { this.dead = true; Game.enterEvent(); }
}

class Trader extends Entity {
  constructor(x, y) {
    super(x, y);
    this.actor = new Actor({ base: 'mammoth', x, y, scale: 1, clip: 'trader' });
    this.prompt = 'TRADE'; this.leg = 0; this.wait = 0; this.r = 46;
    this.here = 1; this.stay = rnd(16, 26); this.gone = 0; this.spots = null;
  }
  // he does not walk a route. he is simply somewhere, and then he is not.
  arrive(V) {
    const near = this.spots && this.spots.length
      ? this.spots.filter(p => dist(p.x, p.y, V.player.x, V.player.y) > 300 && dist(p.x, p.y, V.player.x, V.player.y) < 1100)
      : [];
    const p = near.length ? pick(near) : (this.spots ? pick(this.spots) : { x: this.x, y: this.y });
    this.actor.x = this.x = p.x; this.actor.y = this.y = p.y;
    this.here = 0; this.stay = rnd(18, 30); this.gone = 0;
    AudioSys.sfx('horn', { vol: 0.5 });
    Particles.dust(this.x, this.y, 18);
  }
  update(dt, V) {
    this.actor.play('trader');
    this.actor.update(dt);
    if (this.gone > 0) {
      this.here = damp(this.here, 0, 5, dt);
      this.gone -= dt;
      if (this.gone <= 0 && V) this.arrive(V);
      return;
    }
    this.here = damp(this.here, 1, 4, dt);
    this.stay -= dt;
    const far = V ? dist(this.x, this.y, V.player.x, V.player.y) > 260 : true;
    if (this.stay <= 0 && far) {                      // packs up, but never in front of you
      this.gone = rnd(9, 16);
      Particles.dust(this.x, this.y, 14);
      AudioSys.sfx('whoosh', { vol: 0.4 });
    }
    if (chance(dt * 0.14)) Dialogue.float(this.actor, pick(['Bell says: bargains!', 'Trunk-picked goods!', 'Ooo-ga! Best prices!', 'Two shells. No haggling.', 'Fresh off the tusk!']));
  }
  // the outfit: a trade awning, a loaded pack, beads, hoops and a headdress
  draw() {
    const a = clamp(this.here, 0, 1);
    if (a < 0.02) return;
    const ctx = Gfx.ctx, x = this.x, y = this.y, t = Time.t;
    ctx.globalAlpha = a;
    this.actor.draw({ alpha: a });
    const top = y - 66;
    // striped awning on four bone poles, swaying
    const sway = Math.sin(t * 1.6) * 2;
    for (const px of [-40, 34]) { Gfx.rect(x + px, top - 4, 4, 30, '#8a7f68'); Gfx.rect(x + px, top - 4, 2, 30, '#e8dfc6'); }
    Gfx.round(x - 50, top - 20, 96, 12, 4, '#3a2415');
    for (let i = 0; i < 6; i++) Gfx.rect(x - 48 + i * 16 + sway * 0.3, top - 18, 8, 9, i % 2 ? '#c2333c' : '#e8dfc6');
    for (let i = 0; i < 5; i++) { const fx = x - 44 + i * 19 + sway; Gfx.round(fx, top - 9, 9, 7, 3, i % 2 ? '#2cb3a2' : '#ffa832'); }
    // pack of wares strapped across the back
    Gfx.round(x - 26, y - 62, 46, 24, 6, '#5c3a20');
    Gfx.round(x - 24, y - 60, 42, 9, 4, '#85562f');
    Gfx.sprite('prop_pot', x - 14, y - 60, { anchor: 'bc', scale: 0.5 });
    Gfx.sprite('icon_coin', x + 4, y - 66, { anchor: 'c', scale: 0.8 });
    Gfx.sprite('art_club', x + 18, y - 62, { anchor: 'bc', scale: 0.7, rot: 0.5 });
    // shell beads round the neck, gold hoops on the tusks, feathers up top
    for (let i = 0; i < 7; i++) {
      const bx = x + 22 + i * 4, by = y - 44 + Math.abs(i - 3) * 2.2;
      Gfx.circle(bx, by, 2.6, i % 2 ? '#ffe98a' : '#86e8d2');
    }
    Gfx.ring(x + 46, y - 22, 6, '#e0b93a', 2);
    Gfx.ring(x + 52, y - 14, 5, '#e0b93a', 2);
    for (let i = 0; i < 3; i++) {
      const fa = -0.5 + i * 0.42 + Math.sin(t * 2 + i) * 0.06;
      const bx = x + 28, by = y - 74;
      Gfx.line(bx, by, bx + Math.cos(fa - 1.6) * 16, by + Math.sin(fa - 1.6) * 16, ['#c2333c', '#2cb3a2', '#ffa832'][i], 3);
    }
    Gfx.round(x + 20, y - 80, 18, 8, 3, '#7c3eb2');
    // a lantern, so you can spot him across the ruin
    Gfx.glow(x - 46, y - 34, 40, '#ffe98a', 0.26 * a);
    Gfx.circle(x - 46, y - 34, 5, '#ffe98a');
    if (a > 0.9 && chance(0.06)) Particles.sparkle(x + rnd(-40, 40), y - 50, 1, ['#ffe98a']);
    ctx.globalAlpha = 1;
  }
  *interact(V) { if (this.here > 0.6) Game.openShop(); yield 0; }
}

class ZoneGoal extends Entity {
  constructor(x, y, act, label) {
    super(x, y);
    this.act = act; this.label = label || 'THE GATE';
    this.prompt = 'GO THROUGH'; this.t = 0; this.r = 42;
  }
  update(dt) { this.t += dt; if (chance(dt * 3)) Particles.fire(this.x + rnd(-44, 44), this.y - 6, 1); }
  draw() {
    const x = this.x, y = this.y + 10, t = this.t;
    // two standing stones and a lintel, lashed with rope and hung with skulls
    Gfx.shadow(x, y + 2, 150, 0.3);
    for (const sx of [-54, 54]) {
      Gfx.round(x + sx - 17, y - 104, 34, 106, 6, '#2e2b38');
      Gfx.round(x + sx - 14, y - 101, 28, 100, 5, '#4d4a5c');
      Gfx.round(x + sx - 14, y - 101, 11, 98, 5, '#6e6b80');
      for (let i = 0; i < 3; i++) Gfx.rectA(x + sx - 10, y - 88 + i * 30, 20, 3, '#2e2b38', 0.6);
    }
    Gfx.round(x - 74, y - 128, 148, 30, 7, '#2e2b38');
    Gfx.round(x - 70, y - 125, 140, 24, 6, '#6e6b80');
    Gfx.round(x - 70, y - 125, 140, 9, 6, '#9391a6');
    // rope binding and trophy skulls
    for (const sx of [-54, 54]) for (let i = 0; i < 4; i++) Gfx.rectA(x + sx - 16, y - 100 + i * 5, 32, 3, '#85562f', 0.8);
    Gfx.sprite('prop_skull', x, y - 126, { anchor: 'bc', scale: 0.62 });
    Gfx.sprite('icon_skull', x - 40, y - 108, { anchor: 'c', scale: 1 });
    Gfx.sprite('icon_skull', x + 40, y - 108, { anchor: 'c', scale: 1 });
    // whatever is beyond it, glowing
    const k = 0.55 + Math.sin(t * 2.2) * 0.45;
    Gfx.glow(x, y - 54, 70, '#e06a1b', 0.16 + k * 0.14);
    Gfx.ctx.globalAlpha = 0.30 + k * 0.16;
    Gfx.round(x - 40, y - 100, 80, 100, 8, '#e06a1b');
    Gfx.ctx.globalAlpha = 1;
    Gfx.text(this.label, x, y - 156, { color: k > 0.6 ? '#ffa832' : '#ffe08a', align: 'center', outline: true, outlineWidth: 2, scale: 1.3 });
    const r = Game.run, ready = r.bait >= r.baitNeed;
    Gfx.text(ready ? 'the bait is laid  -  go' : `bait  ${r.bait} / ${r.baitNeed}`, x, y - 138,
      { color: ready ? '#a8e878' : '#a79bb4', align: 'center', scale: 1 });
  }
  *interact(V) {
    const r = Game.run;
    if (r.bait < r.baitNeed) {
      AudioSys.sfx('error');
      const n = r.baitNeed - r.bait;
      yield* Dialogue.say('', `The road past the gate is empty. A raptor that has eaten will not come back for a smell - you need ${n} more kill${n === 1 ? '' : 's'} to lay a trail it cannot walk past.`, { at: { x: this.x, top: this.y - 170 } });
      return;
    }
    Game.enterBoss();
    yield 0;
  }
}

// small animals that mind their own business and bolt if you crowd them
class Critter extends Entity {
  constructor(x, y, kind) {
    super(x, y);
    this.actor = new Actor({ base: kind, x, y, scale: 0.8 });
    this.home = { x, y }; this.t = rnd(0, 4); this.flee = 0; this.r = 14;
  }
  update(dt, V) {
    this.t -= dt;
    const d = dist(this.x, this.y, V.player.x, V.player.y);
    if (d < 96) { this.flee = 1.4; }
    if (this.flee > 0) {
      this.flee -= dt;
      const a = Math.atan2(this.y - V.player.y, this.x - V.player.x);
      const nx = this.x + Math.cos(a) * 128 * dt, ny = this.y + Math.sin(a) * 128 * dt;
      if (!V.zone.isSolid(nx, this.y)) this.x = nx;
      if (!V.zone.isSolid(this.x, ny)) this.y = ny;
      this.actor.play('walk', { fps: 15 });
      if (this.flee > 1.3 && chance(0.4)) AudioSys.sfx('roar', { pitch: rnd(320, 520), vol: 0.2, len: 0.25 });
    } else if (this.t <= 0) {
      this.t = rnd(1.4, 4);
      this.target = { x: this.home.x + rnd(-70, 70), y: this.home.y + rnd(-50, 50) };
    }
    if (this.target && this.flee <= 0) { if (this.actor.moveTo(this.target.x, this.target.y, dt, 30)) this.target = null; this.actor.play('walk'); }
    else if (this.flee <= 0) this.actor.play('idle');
    this.actor.x = this.x; this.actor.y = this.y;
    if (this.flee > 0) this.actor.facing = this.x > V.player.x ? 1 : -1;
    this.actor.update(dt);
  }
  draw() { this.actor.draw(); }
}

class Prowler extends Entity {
  constructor(x, y, kind, act, elite) {
    super(x, y);
    this.kind = kind; this.elite = !!elite; this.act = act;
    this.actor = new Actor({ base: kind, x, y, scale: elite ? 1.15 : 1 });
    this.state = 'patrol'; this.leg = 0; this.wait = 0; this.alert = 0; this.lost = 0;
    this.dir = { x: 1, y: 0 }; this.speed = elite ? 62 : 52; this.r = 20;
    this.sight = elite ? 210 : 170; this.prompt = null;
  }
  update(dt, V) {
    const p = V.player;
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy);
    const facing = Math.atan2(this.dir.y, this.dir.x);
    const toP = Math.atan2(dy, dx);
    const inCone = Math.abs(wrapAngle(toP - facing)) < 0.62 && d < this.sight;
    const heard = d < (p.sprinting ? 128 : 58);
    const canSee = (inCone || heard) && !(V.hidden && d > 42);
    if (this.state !== 'chase' && canSee) {
      this.state = 'chase'; this.alert = 1; this.lost = 0;
      Emotes.show(this.actor, '!'); AudioSys.sfx('detect');
    }
    if (this.state === 'chase') {
      if (!canSee) { this.lost += dt; if (this.lost > 2.6) { this.state = 'patrol'; Emotes.show(this.actor, '?'); AudioSys.sfx('hide'); } }
      else this.lost = 0;
      const sp = this.speed * 1.5;
      const nx = dx / (d || 1), ny = dy / (d || 1);
      this.dir = { x: nx, y: ny };
      this.tryMove(nx * sp * dt, ny * sp * dt, V);
      this.actor.play('walk', { fps: 14 });
      if (d < 30 && !V.locked) V.startBattle(this);
    } else {
      if (this.wait > 0) { this.wait -= dt; this.actor.play('idle'); }
      else if (this.route) {
        const t = this.route[this.leg % this.route.length];
        const ddx = t.x - this.x, ddy = t.y - this.y, dd = Math.hypot(ddx, ddy);
        if (dd < 12) { this.leg++; this.wait = rnd(1.2, 3.5); }
        else {
          this.dir = { x: ddx / dd, y: ddy / dd };
          this.tryMove(this.dir.x * this.speed * dt, this.dir.y * this.speed * dt, V);
          this.actor.play('walk');
        }
      }
    }
    this.actor.facing = this.dir.x >= 0 ? 1 : -1;
    this.actor.x = this.x; this.actor.y = this.y;
    this.actor.update(dt);
    this.alert = Math.max(0, this.alert - dt * 0.5);
  }
  tryMove(dx, dy, V) {
    const z = V.zone;
    let moved = false;
    if (!z.isSolid(this.x + dx, this.y)) { this.x += dx; moved = moved || Math.abs(dx) > 0.01; } else if (this.state !== 'chase') this.dir.x *= -1;
    if (!z.isSolid(this.x, this.y + dy)) { this.y += dy; moved = moved || Math.abs(dy) > 0.01; } else if (this.state !== 'chase') this.dir.y *= -1;
    // boxed in while chasing: slide along the wall instead of grinding into it
    if (!moved && this.state === 'chase') {
      this.stuck = (this.stuck || 0) + 1;
      const s = Math.hypot(dx, dy) || 1;
      const side = (this.stuck >> 3) % 2 ? 1 : -1;
      const px = -dy / s * s * side, py = dx / s * s * side;
      if (!z.isSolid(this.x + px, this.y)) this.x += px;
      if (!z.isSolid(this.x, this.y + py)) this.y += py;
    } else this.stuck = 0;
    this.x = clamp(this.x, TILE * 2, z.w * TILE - TILE * 2);
    this.y = clamp(this.y, TILE * 2, z.h * TILE - TILE * 2);
  }
  drawCone() {
    const ctx = Gfx.ctx;
    const a = Math.atan2(this.dir.y, this.dir.x);
    ctx.save();
    ctx.globalAlpha = this.state === 'chase' ? 0.20 : 0.10;
    ctx.fillStyle = this.state === 'chase' ? '#ef6a5e' : '#ffe98a';
    ctx.beginPath(); ctx.moveTo(this.x, this.y - 10);
    ctx.arc(this.x, this.y - 10, this.sight, a - 0.62, a + 0.62); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  draw() {
    this.actor.draw();
    if (this.elite) Gfx.text('ELITE', this.x, this.actor.top - 14, { color: '#ffa832', align: 'center', outline: true });
    if (this.state === 'chase') Gfx.text('!', this.x, this.actor.top - 26, { color: '#ef6a5e', align: 'center', scale: 2, outline: true });
  }
}

// --------------------------------------------------------------- the scene
class VillageScene {
  constructor(act) {
    this.act = act || Game.run.act;
    this.zone = Game.run.zone && Game.run.zone.act === this.act ? Game.run.zone : new Zone(this.act, Game.run.seed);
    Game.run.zone = this.zone;
    this.cam = new Camera();
    this.cam.setBounds(0, 0, this.zone.w * TILE, this.zone.h * TILE);
    this.t = 0; this.locked = false; this.hidden = false; this.co = null;
    this.prompt = null; this.intro = 2.2;
    const s = Game.run.pos && Game.run.pos.act === this.act ? Game.run.pos : { x: this.zone.start.x * TILE + 16, y: this.zone.start.y * TILE + 16 };
    this.player = new Actor({ base: 'bronk', x: s.x, y: s.y, scale: 1, speed: 138 });
    this.player.sprinting = false;
    this.cam.follow = this.player; this.cam.lookAt(this.player.x, this.player.y, true);
    this.footT = 0; this.puffT = 0; this.bellyPhase = 0;
    this.dodgeT = 0; this.dodgeCool = 0; this.dodgeDir = { x: 1, y: 0 };
    this.birds = []; this.ambientT = 3; this.showMap = false;
  }
  enter() {
    AudioSys.play(this.zone.def.music, { fade: 0.8 });
    Game.worldToScreen = (x, y) => this.cam.toScreen(x, y);
    Game.save();
  }
  exit() { Game.run.pos = { act: this.act, x: this.player.x, y: this.player.y }; Game.worldToScreen = null; }
  // ------------------------------------------------------------------ update
  update(dt) {
    this.t += dt;
    this.intro = Math.max(0, this.intro - dt);
    Dialogue.update();
    if (Dialogue.active || Game.overlay) { this.cam.update(dt); return; }
    const run = Game.run;
    const p = this.player;
    let ix = 0, iy = 0;
    if (!this.locked) {
      if (Input.isDown('ArrowLeft', 'KeyA')) ix -= 1;
      if (Input.isDown('ArrowRight', 'KeyD')) ix += 1;
      if (Input.isDown('ArrowUp', 'KeyW')) iy -= 1;
      if (Input.isDown('ArrowDown', 'KeyS')) iy += 1;
      if (Input.touch) { const s = this.stickInput(); ix += s.x; iy += s.y; }
    }
    const mag = Math.hypot(ix, iy);
    if (mag > 1) { ix /= mag; iy /= mag; }
    // ---- the dodge roll: a short shove in the last direction you leaned,
    // during which nothing can get a good look at you
    this.dodgeT = Math.max(0, this.dodgeT - dt);
    this.dodgeCool = Math.max(0, this.dodgeCool - dt);
    const wantDodge = !this.locked && (Input.pressed('Space') || this.dodgeTap);
    this.dodgeTap = false;
    if (wantDodge && this.dodgeT <= 0 && this.dodgeCool <= 0 && run.stamina > 12) {
      this.dodgeT = 0.34; this.dodgeCool = 0.62;
      run.stamina = clamp(run.stamina - 12, 0, run.maxStamina);
      this.dodgeDir = mag > 0.1 ? { x: ix, y: iy } : { x: p.facing, y: 0 };
      p.vx = this.dodgeDir.x * 430; p.vy = this.dodgeDir.y * 430;
      p.squash(0.3);
      AudioSys.sfx('whoosh', { vol: 0.6 });
      Particles.dust(p.x, p.y, 12);
      Juice.shake(2.5, 0.1);
    }
    const rolling = this.dodgeT > 0;
    const wantSprint = (Input.isDown('ShiftLeft', 'ShiftRight') || this.sprintHeld) && run.stamina > 1;
    p.sprinting = wantSprint && mag > 0.1;
    const tired = run.stamina <= 0.5;
    const maxSpeed = (p.sprinting ? 216 : 138) * (tired ? 0.52 : 1);
    // deliberately loose control: heavy acceleration and a little slide
    const accel = mag > 0.1 ? 900 : 620;
    if (rolling) {
      p.vx = damp(p.vx, this.dodgeDir.x * 150, 3, dt);
      p.vy = damp(p.vy, this.dodgeDir.y * 150, 3, dt);
      p.rot = (p.rot || 0) + dt * 13 * (this.dodgeDir.x >= 0 ? 1 : -1);
      if (chance(dt * 40)) Particles.dust(p.x, p.y, 1);
    } else {
      p.rot = 0;
      p.vx = damp(p.vx, ix * maxSpeed, accel / 90, dt);
      p.vy = damp(p.vy, iy * maxSpeed, accel / 90, dt);
    }
    const spd = Math.hypot(p.vx, p.vy);
    // collide on each axis so walls slide instead of sticking
    const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
    if (!this.zone.isSolid(nx + sign(p.vx) * 9, p.y - 4) && !this.zone.isSolid(nx + sign(p.vx) * 9, p.y - 22)) p.x = nx; else p.vx *= -0.2;
    if (!this.zone.isSolid(p.x, ny - (p.vy > 0 ? 0 : 26)) && !this.zone.isSolid(p.x + 7, ny - (p.vy > 0 ? 0 : 26))) p.y = ny; else p.vy *= -0.2;
    p.x = clamp(p.x, TILE * 2, this.zone.w * TILE - TILE * 2);
    p.y = clamp(p.y, TILE * 2 + 10, this.zone.h * TILE - TILE * 2);
    if (Math.abs(p.vx) > 12) p.facing = p.vx > 0 ? 1 : -1;
    // stamina: moving costs, standing still slowly recovers
    if (spd > 20) run.stamina = clamp(run.stamina - dt * (p.sprinting ? 17 : 4.2), 0, run.maxStamina);
    else run.stamina = clamp(run.stamina + dt * 7.5, 0, run.maxStamina);
    if (tired && chance(dt * 1.4)) { Emotes.show(p, 'sweat', 0.9); if (chance(0.3)) AudioSys.sfx('stamina_low'); }
    // animation: the belly leads, the body follows
    p.play(rolling ? 'dash' : spd > 20 ? (p.sprinting ? 'run' : 'walk') : 'idle');
    this.bellyPhase += dt * (4 + spd * 0.045);
    const wob = Math.sin(this.bellyPhase);
    p.sx = 1 + wob * (0.035 + spd * 0.00035) + (tired ? 0.02 : 0);
    p.sy = 1 - wob * (0.035 + spd * 0.00035);
    p.update(dt);
    // footfalls kick up dust
    if (spd > 20) {
      this.footT -= dt * (p.sprinting ? 7 : 4.6);
      if (this.footT <= 0) {
        this.footT = 1;
        Particles.dust(p.x - p.facing * 6, p.y, 3);
        AudioSys.sfx(this.zone.def.base[0].includes('grass') ? 'step_grass' : 'step');
        Juice.shake(p.sprinting ? 1.1 : 0.5, 0.06);
      }
    }
    // hiding
    this.hidden = rolling;
    for (const o of this.zone.objects) if (o.hide && dist2(o.x, o.y, p.x, p.y) < 26 * 26) this.hidden = true;
    // entities
    for (const e of this.zone.entities) e.update(dt, this);
    this.zone.entities = this.zone.entities.filter(e => !e.dead);
    // interaction target
    this.prompt = null;
    let best = null, bestD = 60 * 60;
    for (const e of this.zone.entities) {
      if (!e.prompt) continue;
      const d = dist2(e.x, e.y, p.x, p.y);
      if (d < bestD + (e.r || 16) * (e.r || 16)) { bestD = d; best = e; }
    }
    for (const o of this.zone.objects) {
      if (!o.loot || o.taken) continue;
      const d = dist2(o.x, o.y, p.x, p.y);
      if (d < 44 * 44 && d < bestD) { bestD = d; best = { loot: o, prompt: 'SEARCH', x: o.x, y: o.y, interact: this.lootGen(o) }; }
    }
    this.prompt = best;
    if (best && (Input.pressed('KeyE', 'Space', 'Enter') || this.interactTapped)) {
      this.interactTapped = false;
      this.locked = true;
      this.co = Co.run(function* (V) { yield* best.interact(V); V.locked = false; }(this), this);
    }
    this.interactTapped = false;
    this.updateAmbience(dt);
    // camera: look a little ahead of the player, and pull back when sprinting
    this.cam.lead = 0.18;
    this.cam.zoomTo(p.sprinting ? 1.04 : 1.14);
    this.cam.update(dt);
    if (Input.pressed('Escape')) Game.pause();
    if (Input.pressed('KeyM')) this.showMap = !this.showMap;
  }
  updateAmbience(dt) {
    const p = this.player;
    // motes of pollen or ash drifting through the shot
    if (chance(dt * 9)) {
      const x = p.x + rnd(-W / 2, W / 2), y = p.y + rnd(-H / 2, H / 2);
      const col = this.act === 3 ? ['#ffa832', '#9c3510', '#574a66'] : this.act === 2 ? ['#a8e878', '#6cc95c', '#ffe98a'] : ['#ffe98a', '#fffaea', '#a8e878'];
      Particles.spawn(x, y, { n: 1, color: col, speed: 6, vx: 14, vy: -3, gravity: -2, life: 4.5, size: 2, sizeEnd: 0 });
    }
    // something crosses the sky now and then
    this.ambientT -= dt;
    if (this.ambientT <= 0) {
      this.ambientT = rnd(7, 16);
      const dir = chance(0.5) ? 1 : -1;
      this.birds.push({ x: p.x - dir * (W / 2 + 80), y: p.y - rnd(120, 240), dir, t: 0, sp: rnd(90, 150), n: rndInt(1, 3) });
      if (chance(0.34)) AudioSys.sfx('roar', { pitch: rnd(160, 420), vol: 0.22, len: 0.5 });
    }
    for (const b of this.birds) { b.t += dt; b.x += b.dir * b.sp * dt; b.y += Math.sin(b.t * 2) * 12 * dt; }
    this.birds = this.birds.filter(b => Math.abs(b.x - p.x) < W);
  }
  drawMinimap() {
    const z = this.zone, s = 2.6;
    const mw = Math.round(z.w * s), mh = Math.round(z.h * s);
    const x = W - mw - 18, y = 48;
    Gfx.panel(x - 6, y - 6, mw + 12, mh + 12, { fill: '#120c16', radius: 3 });
    for (let ty = 0; ty < z.h; ty += 1) for (let tx = 0; tx < z.w; tx += 1) {
      const t = z.tiles[z.idx(tx, ty)];
      const solid = z.solid[z.idx(tx, ty)];
      Gfx.rect(x + tx * s, y + ty * s, s, s, solid ? '#241c2e' : t === z.def.path ? '#85562f' : '#27632f');
    }
    for (const e of z.entities) {
      const col = e instanceof Campfire ? '#ffa832' : e instanceof Trader ? '#ffe98a' : e instanceof FogNode ? '#b177e6' : e instanceof ZoneGoal ? '#ef6a5e' : e instanceof Prowler ? '#c2333c' : '#6aa9ee';
      Gfx.rect(x + (e.x / TILE) * s - 1, y + (e.y / TILE) * s - 1, 3, 3, col);
    }
    Gfx.rect(x + (this.player.x / TILE) * s - 2, y + (this.player.y / TILE) * s - 2, 5, 5, '#ffffff');
    Gfx.text('M to close', x + mw / 2, y + mh + 10, { color: '#7a6d8a', align: 'center' });
  }
  stickInput() {
    // left-hand virtual stick: drag anywhere in the lower-left quadrant
    const base = { x: 110, y: H - 110 };
    let out = { x: 0, y: 0 };
    for (const [, t] of Input.touches) {
      if (t.x < W * 0.45 && t.y > H * 0.35) {
        const dx = t.x - base.x, dy = t.y - base.y, d = Math.hypot(dx, dy);
        if (d > 6) { const m = Math.min(1, d / 62); out = { x: dx / d * m, y: dy / d * m }; }
        this.stickPos = { x: clamp(t.x, base.x - 62, base.x + 62), y: clamp(t.y, base.y - 62, base.y + 62) };
        return out;
      }
    }
    this.stickPos = null;
    return out;
  }
  startBattle(prowler) {
    if (this.locked) return;
    this.locked = true;
    AudioSys.sfx('roar', { pitch: 90, vol: 0.8, len: 0.7 });
    Game.enterBattle(prowler, this.act);
  }
  *lootGen(o) {
    o.taken = true;
    const r = new RNG(Math.floor(o.x * 13 + o.y * 7));
    const roll = r.next();
    if (roll < 0.55) { const g = r.int(8, 26); Game.run.gold += g; AudioSys.sfx('gold'); Popups.add(o.x, o.y - 20, `+${g} SHELLS`, '#ffe98a', { scale: 1.3 }); }
    else if (roll < 0.8) { const h = r.int(4, 10); Game.run.hp = Math.min(Game.run.maxHp, Game.run.hp + h); AudioSys.sfx('heal'); Popups.add(o.x, o.y - 20, `+${h} HP`, '#a8e878', { scale: 1.3 }); }
    else { Game.run.stamina = Game.run.maxStamina; AudioSys.sfx('pickup'); Popups.add(o.x, o.y - 20, 'STAMINA FULL', '#6cc95c', { scale: 1.2 }); }
    Particles.sparkle(o.x, o.y - 14, 10);
    yield 0.1;
  }
  // -------------------------------------------------------------------- draw
  draw() {
    Gfx.clear(this.zone.def.sky);
    this.cam.apply(Gfx.ctx);
    const z = this.zone;
    // tiles
    const x0 = Math.max(0, Math.floor((this.cam.x - W / 2 / this.cam.zoom) / TILE) - 1);
    const x1 = Math.min(z.w - 1, Math.ceil((this.cam.x + W / 2 / this.cam.zoom) / TILE) + 1);
    const y0 = Math.max(0, Math.floor((this.cam.y - H / 2 / this.cam.zoom) / TILE) - 1);
    const y1 = Math.min(z.h - 1, Math.ceil((this.cam.y + H / 2 / this.cam.zoom) / TILE) + 1);
    const anim = Math.floor(this.t * 6);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const t = z.tiles[z.idx(x, y)];
      Gfx.sprite(t, x * TILE, y * TILE, { anchor: 'tl', frame: anim });
    }
    // vision cones under everything
    for (const e of z.entities) if (e instanceof Prowler) e.drawCone();
    // y-sorted scenery + entities + player
    const drawables = [];
    for (const o of z.objects) { if (this.cam.visible(o.x, o.y, 120)) drawables.push({ y: o.y, o }); }
    for (const e of z.entities) { if (this.cam.visible(e.x, e.y, 200)) drawables.push({ y: e.y, e }); }
    drawables.push({ y: this.player.y, p: true });
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) {
      if (d.p) {
        if (this.hidden) Gfx.ctx.globalAlpha = 0.55;
        this.player.draw();
        Gfx.ctx.globalAlpha = 1;
      } else if (d.e) d.e.draw();
      else {
        const o = d.o;
        const sway = Math.sin(this.t * 1.4 + o.sway) * (Gfx.spr(o.spr).h > 50 ? 0.012 : 0);
        Gfx.sprite(o.spr, o.x, o.y, { anchor: 'bc', frame: o.frame + Math.floor(this.t * 5), rot: sway, alpha: o.taken ? 0.45 : 1 });
        if (o.loot && !o.taken) Gfx.sprite('icon_bag', o.x, o.y - Gfx.spr(o.spr).h - 8 + Math.sin(this.t * 4) * 2, { anchor: 'c', scale: 0.7, alpha: 0.85 });
      }
    }
    // birds pass in front of the scenery but behind the interface
    for (const b of this.birds) for (let i = 0; i < b.n; i++)
      Gfx.sprite('ptero_fly', b.x + i * 34, b.y + i * 16, { anchor: 'c', scale: 0.6, frame: Math.floor(b.t * 7 + i), flip: b.dir < 0, tint: '#120c16', tintAmount: 0.45, alpha: 0.75 });
    Particles.draw(Gfx.ctx, true);
    FX.draw(true);
    Popups.draw(true);
    Floaters.draw();
    Emotes.draw();
    // interaction prompt
    if (this.prompt) {
      const p = this.prompt;
      const y = (p.actor ? p.actor.top : p.y - 40) - 16;
      const label = Input.touch ? p.prompt : `[E] ${p.prompt}`;
      const w = Gfx.measure(label, 1) + 16;
      Gfx.round(p.x - w / 2, y - 6, w, 20, 4, '#120c16');
      Gfx.outlineRound(p.x - w / 2, y - 6, w, 20, 4, '#ffe98a');
      Gfx.text(label, p.x, y, { color: '#ffe98a', align: 'center' });
    }
    this.cam.restore(Gfx.ctx);
    Gfx.vignette(0.55);
    this.drawHud();
    Dialogue.draw();
  }
  drawHud() {
    const run = Game.run;
    // health + stamina, bottom left, out of the way of the action
    const x = 14, y = H - 62;
    Gfx.sprite('icon_heart', x, y, { anchor: 'tl', frame: Math.floor(this.t * 3) % 2 });
    Gfx.bar(x + 24, y + 2, 180, 12, run.hp / run.maxHp, '#c2333c', { bg: '#3f0e18' });
    Gfx.text(`${run.hp}/${run.maxHp}`, x + 114, y + 3, { color: '#fffaea', align: 'center', outline: true });
    Gfx.sprite('icon_stamina', x + 2, y + 22, { anchor: 'tl' });
    const st = run.stamina / run.maxStamina;
    Gfx.bar(x + 24, y + 24, 180, 10, st, st > 0.3 ? '#6cc95c' : '#ffa832', { bg: '#14331e' });
    if (st <= 0.02) Gfx.text('WINDED!', x + 114, y + 24, { color: '#ef6a5e', align: 'center', outline: true });
    // shells
    Gfx.sprite('icon_coin', W - 108, 14, { anchor: 'tl' });
    Gfx.text(String(run.gold), W - 86, 16, { color: '#ffe98a', scale: 1.2 });
    // relics
    let rx = 14;
    for (const id of run.relics) { Relics.drawIcon(id, rx, 12); rx += 26; }
    // objective compass
    const goal = this.zone.entities.find(e => e instanceof ZoneGoal);
    if (goal) {
      const dx = goal.x - this.player.x, dy = goal.y - this.player.y;
      const a = Math.atan2(dy, dx), d = Math.hypot(dx, dy);
      const cx = W - 52, cy = H - 52;
      Gfx.circle(cx, cy, 27, '#120c16'); Gfx.circle(cx, cy, 24, '#241c2e');
      Gfx.ring(cx, cy, 24, '#4d4a5c', 1);
      const ctx = Gfx.ctx;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
      ctx.fillStyle = '#ffa832';
      ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(1, -8); ctx.lineTo(4, 0); ctx.lineTo(1, 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7a6d8a';
      ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-1, -6); ctx.lineTo(-4, 0); ctx.lineTo(-1, 6); ctx.closePath(); ctx.fill();
      ctx.restore();
      Gfx.text(`${Math.round(d / 32)}`, cx, cy + 30, { color: '#a79bb4', align: 'center' });
    }
    // the objective: three kills makes a trail the raptor will follow
    {
      const r = Game.run, ready = r.bait >= r.baitNeed, bx = 20, by = 44;
      Gfx.rectA(bx - 8, by - 6, 208, 44, '#120c16', 0.66);
      Gfx.rectA(bx - 8, by - 6, 3, 44, ready ? '#6cc95c' : '#ffa832', 1);
      Gfx.text(ready ? 'BAIT LAID' : 'MAKE RAPTOR BAIT', bx + 2, by - 2,
        { color: ready ? '#a8e878' : '#ffe98a', scale: 1.1 });
      for (let i = 0; i < r.baitNeed; i++) {
        const gx = bx + 4 + i * 26, got = i < r.bait;
        Gfx.sprite('icon_skull', gx + 9, by + 24, { anchor: 'c', scale: 1.1, alpha: got ? 1 : 0.22 });
        if (got) Gfx.sprite('icon_check', gx + 15, by + 28, { anchor: 'c', scale: 0.8 });
      }
      Gfx.text(ready ? 'head for the gate' : `${r.bait} / ${r.baitNeed} beasts down`,
        bx + 88, by + 18, { color: '#a79bb4', scale: 1 });
    }
    if (this.hidden) Gfx.text('HIDDEN', W / 2, 62, { color: '#86e8d2', align: 'center', scale: 1.2, outline: true });
    // zone banner on arrival
    if (this.intro > 0) {
      const k = clamp(this.intro / 2.2, 0, 1);
      const a = this.intro > 1.9 ? (2.2 - this.intro) / 0.3 : k < 0.2 ? k / 0.2 : 1;
      Gfx.ctx.globalAlpha = a;
      Gfx.rectA(0, 150, W, 84, '#120c16', 0.72);
      Gfx.text(this.zone.def.name, W / 2, 166, { color: '#ffe98a', align: 'center', scale: 3, outline: true, outlineWidth: 2 });
      Gfx.text(this.zone.def.sub, W / 2, 204, { color: '#d6cfe0', align: 'center', scale: 1.2 });
      Gfx.ctx.globalAlpha = 1;
    }
    if (this.showMap) this.drawMinimap();
    if (Input.touch) this.drawTouchControls();
    else Gfx.text('WASD to move  -  SHIFT to run  -  SPACE to dodge  -  E to interact  -  M for the map', W / 2, H - 22, { color: '#7a6d8a', align: 'center' });
    UI.iconButton(W - 40, 12, 28, 26, 'icon_menu', () => Game.pause(), { tip: 'Menu (Esc)' });
  }
  drawTouchControls() {
    const base = { x: 110, y: H - 110 };
    Gfx.ctx.globalAlpha = 0.34; Gfx.circle(base.x, base.y, 62, '#120c16'); Gfx.ctx.globalAlpha = 0.55;
    Gfx.ring(base.x, base.y, 62, '#a79bb4', 2);
    const k = this.stickPos || base;
    Gfx.ctx.globalAlpha = 0.8; Gfx.circle(k.x, k.y, 26, '#5c3a20'); Gfx.ring(k.x, k.y, 26, '#ffe98a', 2);
    Gfx.ctx.globalAlpha = 1;
    UI.button(W - 130, H - 150, 112, 46, this.prompt ? this.prompt.prompt : 'ACT', () => { this.interactTapped = true; }, { disabled: !this.prompt, scale: 1.2 });
    UI.button(W - 130, H - 94, 112, 46, 'RUN', () => { }, { fill: this.sprintHeld ? '#85562f' : '#3b3048', scale: 1.2 });
    if (Input.down && UI.hovered(W - 130, H - 94, 112, 46)) this.sprintHeld = true;
    if (!Input.down) this.sprintHeld = false;
    UI.button(W - 130, H - 38, 112, 32, 'DODGE', () => { this.dodgeTap = true; },
      { fill: this.dodgeCool > 0 ? '#3b3048' : '#4b2070', disabled: this.dodgeCool > 0, scale: 1.1 });
  }
  click() { }
}
