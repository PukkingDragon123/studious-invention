// ---------------------------------------------------------------------------
// valley.js - the parts of a zone that make it a run of problems instead of
// a field. Two palisade walls split every zone into three sections, and each
// wall has one gate in it:
//
//   the first is held by a GUARD. It stands in the gateway, it is awake, and
//   it will not be crept past. You fight it or you go home.
//
//   the second is a PLATE gate. Two stone plates in a clearing nearby, two
//   boulders, and a gate that lifts when both plates are sat on. Push a
//   boulder into a corner and the reset stone puts them back.
//
// And between them, the reason to look around: gem outcrops to dig, and the
// altar that presses those gems into your cards.
// ---------------------------------------------------------------------------
'use strict';

// Bronk has something to say about most things. Never twice in a row.
const QUIPS = {
  gem: ['SHINY.', 'Pretty rock!', 'Mine now.', 'Ooga. OOGA.', 'Rock with feelings.', 'Vela will want this.'],
  push: ['hnnnngh', 'MOVE, rock.', 'rock... heavy...', 'why is it ROUND', 'I lift. I lift things.'],
  gate: ['Rocks. I know rocks.', 'Nailed it.', 'Easy.', 'Told you. Rocks.'],
  guard: ['Who is next?', 'Door. Open. Good.', 'That is how you knock.'],
  tired: ['need... sit...', 'one... more... step...', 'belly... too... big...', 'is this... cardio'],
  reset: ['Again. From the top.', 'Nobody saw that.'],
};
function quip(actor, kind, chanceOf = 1) {
  if (!actor || Math.random() > chanceOf) return;
  const list = QUIPS[kind]; if (!list) return;
  let q; do { q = list[(Math.random() * list.length) | 0]; } while (list.length > 1 && q === quip.last);
  quip.last = q;
  Dialogue.float(actor, q, 2.2);
}

// ------------------------------------------------------------ zone building
Zone.prototype.sectionOf = function (tx) {
  if (!this.walls) return 0;
  let s = 0;
  for (const w of this.walls) if (tx > w.x + 1) s++;
  return s;
};

Zone.prototype.buildPuzzles = function () {
  const r = new RNG(this.rng.int(1, 1e9));
  const run = Game.run || {};
  const solved = (run.solved = run.solved || {});
  const key = k => `a${this.act}:${k}`;
  const d = this.def;
  this.walls = [];
  const cols = [Math.round(this.w * 0.37), Math.round(this.w * 0.67)];
  for (let wi = 0; wi < cols.length; wi++) {
    const wx = cols[wi];
    // where the road crosses this column: the middle of the run of road tiles
    const ys = [];
    for (let y = 4; y < this.h - 4; y++) if (this.tiles[this.idx(wx, y)] === d.path) ys.push(y);
    const gy = clamp(ys.length ? ys[Math.floor(ys.length / 2)] : Math.floor(this.h / 2), 6, this.h - 7);
    // a clear apron either side of the gate, so it is a place and not a crack
    for (let dx = -5; dx <= 6; dx++) for (let dy = -2; dy <= 2; dy++) {
      const x = wx + dx, y = gy + dy;
      if (!this.inside(x, y)) continue;
      this.tiles[this.idx(x, y)] = Math.abs(dy) <= 1 ? d.path : this.tiles[this.idx(x, y)];
      this.solid[this.idx(x, y)] = 0;
    }
    // the wall itself, two tiles thick, top of the zone to the bottom
    for (let y = 2; y < this.h - 2; y++) for (const x of [wx, wx + 1]) {
      if (Math.abs(y - gy) <= 1) continue;
      this.setSolid(x, y, 1);
    }
    // nothing grows through a palisade
    this.objects = this.objects.filter(o => Math.abs(o.x - (wx + 1) * TILE) > 50);
    for (let y = 2; y < this.h - 2; y++) {
      if (Math.abs(y - gy) <= 1) continue;
      this.objects.push({ x: (wx + 1) * TILE, y: y * TILE + TILE, stake: true, seed: (y * 7 + wx * 13) % 17, draw: drawStakes });
    }
    const gate = new Gate((wx + 1) * TILE, gy * TILE + 16, wx, gy, wi === 0 ? 'guard' : 'plates', key('gate' + wi), this);
    this.walls.push({ x: wx, gy, gate });
    this.entities.push(gate);
  }
  // everything that patrols stays on its own side of the walls
  for (const e of this.entities) {
    if (!(e instanceof Prowler) || !e.route) continue;
    const s = this.sectionOf(Math.floor(e.x / TILE));
    // never on the spot you arrive at: you get to look around first
    const mine = this.pois.filter((p, i) => i > 0 && this.sectionOf(p.x) === s && Math.hypot(p.x - this.start.x, p.y - this.start.y) > 14);
    if (mine.length) {
      const a = r.pick(mine), b = r.pick(mine);
      e.x = e.actor.x = a.x * TILE + 16; e.y = e.actor.y = a.y * TILE + 16;
      e.route = [{ x: a.x * TILE + 16, y: a.y * TILE + 16 }, { x: b.x * TILE + 16 + r.int(-80, 80), y: b.y * TILE + 16 + r.int(-60, 60) }];
    }
  }
  // ---- the guard in the first gate
  {
    const w = this.walls[0], gate = w.gate;
    if (solved[gate.id]) gate.open(true);
    else {
      const kind = this.act === 1 ? 'boar' : r.pick(d.enemies.filter(k => k !== 'dodo'));
      const g = new Guard((w.x - 2) * TILE + 16, w.gy * TILE + 16, kind, this.act, gate);
      gate.guard = g;
      this.entities.push(g);
    }
  }
  // ---- the plate puzzle for the second gate, in a clearing off the road
  {
    const w1 = this.walls[0], w2 = this.walls[1], gate = w2.gate;
    const cx = Math.round((w1.x + w2.x) / 2) + 1;
    let roadY = null;
    for (let y = 4; y < this.h - 4; y++) if (this.tiles[this.idx(cx, y)] === d.path) { roadY = y; break; }
    if (roadY == null) roadY = Math.floor(this.h / 2);
    const up = roadY > this.h / 2;                          // the room goes where there is space
    const RW = 11, RH = 8;
    const ax = cx - 5, ay = up ? roadY - RH - 3 : roadY + 4;
    const tile = this.act === 3 ? 'tile_rubble' : 'tile_stone';
    for (let y = ay - 1; y <= ay + RH; y++) for (let x = ax - 1; x <= ax + RW; x++) {
      if (!this.inside(x, y)) continue;
      const edge = x === ax - 1 || x === ax + RW || y === ay - 1 || y === ay + RH;
      this.tiles[this.idx(x, y)] = edge ? d.rough : tile;
      this.solid[this.idx(x, y)] = 0;
    }
    this.objects = this.objects.filter(o => !(o.x > (ax - 2) * TILE && o.x < (ax + RW + 1) * TILE && o.y > (ay - 1) * TILE && o.y < (ay + RH + 2) * TILE));
    // a ring of standing stones round it, with a way in facing the road
    const door = cx;
    for (let x = ax - 1; x <= ax + RW; x += 2) for (const y of [ay - 1, ay + RH]) {
      const facingRoad = up ? y === ay + RH : y === ay - 1;
      if (facingRoad && Math.abs(x - door) <= 1) continue;
      this.addProp(x * TILE + 16, y * TILE + 28, 'v_rock', { solid: true, footW: 1, footH: 1 });
    }
    for (let y = ay + 1; y < ay + RH; y += 2) for (const x of [ax - 1, ax + RW])
      this.addProp(x * TILE + 16, y * TILE + 28, 'v_rock', { solid: true, footW: 1, footH: 1 });
    this.carvePath({ x: door, y: up ? ay + RH : ay - 1 }, { x: door, y: roadY });
    // the layout: two plates, two stones, each a short honest push away
    const plates = [new Plate(ax + 8, ay + 2), new Plate(ax + 7, ay + 6)];
    const stones = [new Boulder(ax + 3, ay + 2), new Boulder(ax + 2, ay + 4)];
    for (const p of plates) this.entities.push(p);
    for (const b of stones) { this.entities.push(b); b.home = { tx: b.tx, ty: b.ty }; }
    const reset = new ResetStone((ax + 1) * TILE + 16, (ay + 6) * TILE + 20, stones);
    this.entities.push(reset);
    const sign = new PuzzleSign((door + 2) * TILE + 16, (up ? ay + RH + 1 : ay - 2) * TILE + 20);
    this.entities.push(sign);
    gate.plates = plates; gate.stones = stones;
    this.puzzle = { ax, ay, RW, RH, plates, stones };
    if (solved[gate.id]) {                                    // already solved: sit them on their plates
      stones.forEach((b, i) => b.place(plates[i].tx, plates[i].ty, this));
      gate.open(true);
    } else for (const b of stones) b.place(b.tx, b.ty, this);
  }
  // ---- gems: two outcrops a section, in the quiet corners
  const spots = [];
  for (let s = 0; s < 3; s++) {
    let placed = 0, guard = 0;
    while (placed < 2 && guard++ < 400) {
      const x = r.int(4, this.w - 5), y = r.int(4, this.h - 5);
      if (this.sectionOf(x) !== s || this.solid[this.idx(x, y)]) continue;
      if (this.tiles[this.idx(x, y)] === d.path) continue;
      if (this.puzzle && x >= this.puzzle.ax - 2 && x <= this.puzzle.ax + this.puzzle.RW + 1 && y >= this.puzzle.ay - 2 && y <= this.puzzle.ay + this.puzzle.RH + 1) continue;
      if (spots.some(p => Math.abs(p.x - x) + Math.abs(p.y - y) < 12)) continue;
      if (this.walls.some(w => Math.abs(x - w.x) < 4)) continue;
      spots.push({ x, y });
      const id = key(`gem${s}_${placed}`);
      const g = new GemNode(x * TILE + 16, y * TILE + 22, (s + placed) % 3, id);
      if (solved[id]) g.left = 0;
      this.entities.push(g);
      this.setSolid(x, y, 1);
      placed++;
    }
  }
  // ---- the altar, by the fire in the village square, where you will see it
  {
    const sq = this.pois[1];
    let ax2 = sq.x + 4, ay2 = sq.y - 3;
    for (let k = 0; k < 20 && (this.solid[this.idx(ax2, ay2)] || this.sectionOf(ax2) !== 0); k++) { ax2 = sq.x + r.int(-5, 5); ay2 = sq.y + r.int(-4, 4); }
    this.objects = this.objects.filter(o => dist(o.x, o.y, ax2 * TILE + 16, ay2 * TILE + 24) > 40);
    this.entities.push(new Altar(ax2 * TILE + 16, ay2 * TILE + 24));
    this.setSolid(ax2, ay2, 1);
  }
};

// the stakes of a palisade, one tile row of them, drawn as scenery so they
// y-sort with everything walking past
function drawStakes(o, t) {
  const x = o.x, y = o.y;
  Gfx.shadow(x, y - 2, 64, 0.24);
  for (let k = 0; k < 4; k++) {
    const sx = x - 29 + k * 15 + ((o.seed + k * 3) % 4) - 2;
    const h = 44 + ((o.seed * 7 + k * 5) % 14);
    const top = y - h;
    Gfx.rect(sx - 1, top + 5, 13, h - 4, '#241109');                 // the ink round it
    Gfx.rect(sx, top + 6, 11, h - 6, '#5c3a20');
    Gfx.rect(sx, top + 6, 3, h - 6, '#85562f');                      // lit side
    Gfx.rect(sx + 9, top + 6, 2, h - 6, '#3a2415');
    for (let j = 0; j < 6; j++) {                                    // the sharpened point
      const ww = Math.max(1, 11 - j * 2);
      Gfx.rect(sx + (11 - ww) / 2, top + 5 - j, ww, 1, j < 2 ? '#5c3a20' : '#85562f');
    }
    Gfx.rect(sx + 4, top - 1, 3, 2, '#241109');
    for (let g = 0; g < 3; g++) Gfx.rect(sx + 4 + (g % 2) * 2, top + 14 + g * 11, 1, 5, '#3a2415');   // grain
  }
  for (const ly of [y - 34, y - 16]) {                               // two lashings across the lot
    Gfx.rect(x - 31, ly, 62, 4, '#241109');
    Gfx.rect(x - 30, ly + 1, 60, 2, '#a3663a');
  }
}

// ------------------------------------------------------------------- gates
class Gate extends Entity {
  constructor(x, y, tx, ty, kind, id, zone) {
    super(x, y);
    this.tx = tx; this.ty = ty; this.kind = kind; this.id = id; this.zone = zone;
    this.opened = false; this.lift = 0; this.t = 0; this.r = 48;
    this.prompt = null; this.guard = null; this.plates = null;
    for (let dy = -1; dy <= 1; dy++) for (const x2 of [tx, tx + 1]) zone.setSolid(x2, ty + dy, 1);
  }
  open(quiet) {
    if (this.opened) return;
    this.opened = true;
    for (let dy = -1; dy <= 1; dy++) for (const x2 of [this.tx, this.tx + 1]) this.zone.setSolid(x2, this.ty + dy, 0);
    if (Game.run) (Game.run.solved = Game.run.solved || {})[this.id] = true;
    if (quiet) { this.lift = 1; return; }
    AudioSys.sfx('unlock'); AudioSys.sfx('thud', { vol: 0.8 });
    Juice.shake(9, 0.5);
    Particles.debris(this.x, this.y + 20, 20, ['#5c3a20', '#85562f', '#3a2415']);
    Particles.dust(this.x, this.y + 20, 24);
    Popups.add(this.x, this.y - 110, this.kind === 'guard' ? 'THE WAY IS OPEN' : 'THE STONES HOLD', '#a8e878', { scale: 1.6, life: 2.2 });
    if (Game.scene && Game.scene.player) quip(Game.scene.player, this.kind === 'guard' ? 'guard' : 'gate');
    Popups.add(this.x, this.y - 88, 'gate lifted', '#e8dfc6', { scale: 1.0, life: 2.2 });
  }
  update(dt, V) {
    this.t += dt;
    if (!this.opened) {
      if (this.kind === 'guard' && this.guard && this.guard.dead) this.open();
      if (this.kind === 'plates' && this.plates && this.plates.every(p => p.pressed)) this.open();
    }
    this.lift = damp(this.lift, this.opened ? 1 : 0, 3, dt);
    // stand at a closed gate and it tells you what it wants
    const near = V && dist(V.player.x, V.player.y, this.x, this.y) < 110;
    this.prompt = !this.opened && near ? 'LOOK' : null;
  }
  *interact(V) {
    const say = this.kind === 'guard'
      ? 'Lashed shut from the far side. Whatever is standing in front of it is the key.'
      : 'Two stone plates are carved over the lintel, with two round stones sitting on them. There is a clearing off the road.';
    yield* Dialogue.say('', say, { at: { x: this.x, top: this.y - 120 } });
  }
  draw() {
    const x = this.x, y = this.y, L = this.lift;
    // two posts, the heaviest timber in the valley
    for (const side of [-1, 1]) {
      const py = y + side * 44;
      Gfx.shadow(x, py + 20, 70, 0.3);
      Gfx.rect(x - 22, py - 60, 44, 80, '#241109');
      Gfx.rect(x - 20, py - 58, 40, 76, '#5c3a20');
      Gfx.rect(x - 20, py - 58, 9, 76, '#85562f');
      Gfx.rect(x + 13, py - 58, 7, 76, '#3a2415');
      Gfx.sprite('v_skull', x, py - 58, { anchor: 'bc', scale: 0.55 });
      if (this.kind === 'guard' || this.opened) {                     // a torch on each
        World.flame(x + side * 2, py - 64, 18 + Math.abs(Math.sin(this.t * 6 + side)) * 8, 6,
          Math.sin(this.t * 4 + side) * 2, ['#e06a1b', '#ffa832', '#ffe98a', '#9c3510'], side * 3);
      }
    }
    // the door: three logs lashed across the gap, hauled up out of the way when open
    const dy = -L * 70;
    for (let k = 0; k < 3; k++) {
      const ly = y - 30 + k * 22 + dy;
      Gfx.ctx.globalAlpha = 1 - L * 0.55;
      Gfx.rect(x - 34, ly, 68, 14, '#241109');
      Gfx.rect(x - 33, ly + 1, 66, 12, '#5c3a20');
      Gfx.rect(x - 33, ly + 1, 66, 3, '#85562f');
      Gfx.rect(x - 34, ly + 4, 4, 6, '#a3663a');
      Gfx.rect(x + 30, ly + 4, 4, 6, '#a3663a');
      Gfx.ctx.globalAlpha = 1;
    }
    // what it wants, carved on a tablet hung from it
    if (!this.opened) {
      const k = 0.6 + Math.sin(this.t * 3) * 0.4;
      UI.slab(x - 26, y - 116, 52, 34, { r: 4, shadow: true, rough: false, len: 6 });
      if (this.kind === 'guard') {
        Gfx.sprite('icon_skull', x, y - 99, { anchor: 'c', scale: 1.2 });
        Gfx.text('FIGHT', x, y - 78, { color: SKIN.red, align: 'center', scale: 1, outline: true });
      } else {
        const on = this.plates ? this.plates.filter(p => p.pressed).length : 0;
        for (let i = 0; i < 2; i++) {
          Gfx.round(x - 18 + i * 22, y - 106, 14, 14, 3, SKIN.ink);
          Gfx.round(x - 16 + i * 22, y - 104, 10, 10, 2, i < on ? '#a8e878' : SKIN.faceMid);
        }
        Gfx.text(`${on}/2`, x, y - 78, { color: on >= 2 ? '#a8e878' : SKIN.gold, align: 'center', scale: 1, outline: true });
      }
      Gfx.glow(x, y - 100, 50, this.kind === 'guard' ? '#ef6a5e' : '#ffe98a', 0.10 + k * 0.06);
    }
  }
}

// The thing in the first gate. It does not patrol, it does not doze, it faces
// the road you are coming up and it will not be walked round.
class Guard extends Prowler {
  constructor(x, y, kind, act, gate) {
    super(x, y, kind, act, false);
    this.gate = gate; this.post = { x, y }; this.route = null; this.guard = true;
    this.threat = this.b.threat + 1;
    this.dir = { x: -1, y: 0 }; this.state = 'wary'; this.suspicion = 0.4;
    this.speed *= 0.9;
  }
  ambushable() { return false; }
  update(dt, V) {
    const p = V.player, dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy);
    const home = dist(this.x, this.y, this.post.x, this.post.y);
    const near = d < 250 && p.x < this.gate.x - 10;
    if (near) {
      if (this.state !== 'chase') { this.state = 'chase'; Emotes.show(this.actor, '!'); AudioSys.sfx('detect'); }
      if (home < 190) {
        const n = 1 / (d || 1);
        this.dir = { x: dx * n, y: dy * n };
        this.tryMove(this.dir.x * this.speed * 1.35 * dt, this.dir.y * this.speed * 1.35 * dt, V);
        this.actor.play('walk', { fps: 12 });
      } else this.actor.play('idle');
      if (d < 32 && !V.locked) V.startBattle(this, 'even');
    } else {
      this.state = 'wary';
      if (home > 6) {
        const hx = this.post.x - this.x, hy = this.post.y - this.y, n = 1 / (home || 1);
        this.tryMove(hx * n * this.speed * dt, hy * n * this.speed * dt, V);
        this.dir = { x: hx * n, y: hy * n };
        this.actor.play('walk');
      } else { this.dir = { x: -1, y: 0 }; this.actor.play('idle'); }
    }
    this.actor.facing = this.dir.x >= 0 ? 1 : -1;
    this.actor.x = this.x; this.actor.y = this.y;
    this.actor.update(dt);
  }
  draw() {
    super.draw();
    Gfx.text('GATE GUARD', this.x, this.actor.top - 40, { color: '#ef6a5e', align: 'center', outline: true });
  }
}

// ----------------------------------------------------------------- boulders
class Boulder extends Entity {
  constructor(tx, ty) {
    super(tx * TILE + 16, ty * TILE + 20);
    this.tx = tx; this.ty = ty; this.moveT = 1; this.from = null; this.r = 18;
    this.seed = (tx * 7 + ty * 3) % 5;
  }
  place(tx, ty, zone) {
    if (this.zone && this.zone.inside(this.tx, this.ty)) this.zone.setSolid(this.tx, this.ty, 0);
    this.zone = zone; this.tx = tx; this.ty = ty;
    zone.setSolid(tx, ty, 1);
    this.x = tx * TILE + 16; this.y = ty * TILE + 20;
  }
  // try to be shoved one tile. Only onto open ground that nothing else is on.
  push(dx, dy, V) {
    if (this.seated) return false;                    // it has dropped into its socket
    const nx = this.tx + dx, ny = this.ty + dy, z = V.zone;
    if (!z.inside(nx, ny) || z.solid[z.idx(nx, ny)]) { AudioSys.sfx('thud', { vol: 0.25 }); return false; }
    if (z.puzzle) {                                   // stones stay in their clearing
      const P = z.puzzle;
      if (nx < P.ax || nx >= P.ax + P.RW || ny < P.ay || ny >= P.ay + P.RH) { AudioSys.sfx('thud', { vol: 0.25 }); return false; }
    }
    this.from = { x: this.x, y: this.y };
    this.place(nx, ny, z);
    this.moveT = 0;
    quip(V.player, 'push', 0.3);
    AudioSys.sfx('thud', { vol: 0.6 }); Juice.shake(3, 0.12);
    Particles.dust(this.x - dx * 16, this.y, 8);
    Particles.debris(this.x - dx * 12, this.y - 4, 3, ['#574a66', '#7a6d8a']);
    return true;
  }
  update(dt) {
    this.moveT = Math.min(1, this.moveT + dt * 6);
  }
  draw() {
    let x = this.x, y = this.y;
    if (this.from && this.moveT < 1) { const k = Ease.outQuad(this.moveT); x = lerp(this.from.x, this.x, k); y = lerp(this.from.y, this.y, k); }
    const roll = this.moveT < 1 ? (1 - this.moveT) * 2 : 0;
    Gfx.shadow(x, y + 6, 40, 0.34);
    Gfx.circle(x, y - 12, 19, '#120c16');
    Gfx.circle(x, y - 12, 17, '#574a66');
    Gfx.circle(x - 3, y - 15, 13, '#7a6d8a');
    Gfx.circle(x - 6, y - 19, 6, '#9391a6');
    Gfx.rect(x - 8, y - 22, 3, 2, '#bdbccd');
    for (let i = 0; i < 4; i++) {                        // pits, rolling with it
      const a = i * 1.7 + this.seed + roll;
      Gfx.rect(x + Math.cos(a) * 9, y - 12 + Math.sin(a) * 8, 3, 2, '#3b3048');
    }
    Gfx.round(x - 10, y - 4, 20, 5, 2, '#27632f');       // moss, round the bottom
    Gfx.rect(x - 7, y - 4, 4, 2, '#3f9a45');
  }
}

class Plate extends Entity {
  constructor(tx, ty) { super(tx * TILE + 16, ty * TILE + 16); this.tx = tx; this.ty = ty; this.pressed = false; this.t = 0; this.r = 10; }
  update(dt, V) {
    this.t += dt;
    const was = this.pressed;
    this.pressed = V.zone.entities.some(e => e instanceof Boulder && e.tx === this.tx && e.ty === this.ty && e.moveT >= 1);
    if (this.pressed && !was) {
      // the stone drops into the socket and stays there: no pushing it off by accident
      for (const e of V.zone.entities) if (e instanceof Boulder && e.tx === this.tx && e.ty === this.ty) e.seated = true;
      AudioSys.sfx('select'); AudioSys.sfx('thud', { vol: 0.5 });
      Particles.sparkle(this.x, this.y - 6, 14, ['#a8e878', '#ffffff']);
      Popups.add(this.x, this.y - 44, 'CLICK', '#a8e878', { scale: 1.3 });
    }
  }
  draw() {
    const x = this.x, y = this.y, on = this.pressed, k = 0.5 + Math.sin(this.t * 3) * 0.5;
    if (!on) Gfx.glow(x, y, 40, '#ffe98a', 0.16 + k * 0.10);
    Gfx.round(x - 19, y - 13, 38, 28, 5, '#120c16');
    Gfx.round(x - 17, y - 11, 34, 24, 4, on ? '#27632f' : '#3b3048');
    Gfx.round(x - 15, y - 9 + (on ? 2 : 0), 30, 19, 3, on ? '#3f9a45' : '#6e6b80');
    Gfx.round(x - 15, y - 9 + (on ? 2 : 0), 30, 4, 2, on ? '#a8e878' : '#9391a6');
    // the glyph: a round stone, the thing that goes here
    Gfx.ring(x, y + 1 + (on ? 2 : 0), 6, on ? '#e8ffd0' : (k > 0.5 ? '#ffe98a' : '#c4b89a'), 2);
    for (const [cx2, cy2] of [[-12, -7], [12, -7], [-12, 10], [12, 10]]) Gfx.rect(x + cx2 - 1, y + cy2 - 1, 2, 2, on ? '#a8e878' : '#ffe98a');
  }
}

class ResetStone extends Entity {
  constructor(x, y, stones) { super(x, y); this.stones = stones; this.prompt = 'RESET STONES'; this.r = 22; this.t = 0; }
  update(dt) { this.t += dt; }
  *interact(V) {
    const gate = V.zone.walls[1].gate;
    if (gate.opened) { yield* Dialogue.say('', 'The gate is up. The stones can stay where they are.', { at: { x: this.x, top: this.y - 50 } }); return; }
    AudioSys.sfx('horn', { vol: 0.5 });
    for (const b of this.stones) { b.seated = false; b.from = { x: b.x, y: b.y }; b.place(b.home.tx, b.home.ty, V.zone); b.moveT = 0; Particles.dust(b.x, b.y, 10); }
    Popups.add(this.x, this.y - 44, 'STONES RESET', '#ffe98a', { scale: 1.2 });
    quip(V.player, 'reset');
    yield 0.3;
  }
  draw() {
    const x = this.x, y = this.y;
    Gfx.shadow(x, y + 2, 30, 0.3);
    Gfx.round(x - 10, y - 34, 20, 36, 5, '#241c2e');
    Gfx.round(x - 8, y - 32, 16, 32, 4, '#574a66');
    Gfx.round(x - 8, y - 32, 5, 32, 3, '#7a6d8a');
    // a circling arrow chipped into it
    Gfx.ring(x, y - 16, 5, '#ffe98a', 2);
    Gfx.rect(x + 3, y - 22, 3, 3, '#ffe98a');
    Gfx.glow(x, y - 16, 26, '#ffe98a', 0.10 + Math.sin(this.t * 2.4) * 0.05);
  }
}

class PuzzleSign extends Entity {
  constructor(x, y) { super(x, y); this.prompt = 'READ'; this.r = 20; }
  *interact() {
    yield* Dialogue.say('', 'Scratched on the post: TWO STONES, TWO PLATES. PUSH, DO NOT PULL. The rock with the circle on it puts them back.', { at: { x: this.x, top: this.y - 60 } });
  }
  draw() {
    Gfx.sprite('v_signpost', this.x, this.y + 4, { anchor: 'bc', scale: 1 });
  }
}

// --------------------------------------------------------------------- gems
// A knot of crystal pushing out of the ground. Three hits and it gives up
// what it has. Some of the valley's best are behind a gate.
const GEM_COLS = [['#7c3eb2', '#b177e6', '#281040'], ['#18706a', '#2cb3a2', '#0f3838'], ['#e06a1b', '#ffa832', '#5c1607']];
class GemNode extends Entity {
  constructor(x, y, kind, id) {
    super(x, y);
    this.kind = kind; this.id = id; this.left = 3; this.hits = 0; this.t = rnd(0, 6); this.r = 26;
    this.prompt = 'MINE'; this.shake = 0;
  }
  update(dt) {
    this.t += dt; this.shake = Math.max(0, this.shake - dt * 4);
    this.prompt = this.left > 0 ? 'MINE' : null;
    if (this.left > 0 && chance(dt * 1.5)) Particles.sparkle(this.x + rnd(-12, 12), this.y - rnd(10, 36), 1, [GEM_COLS[this.kind][1], '#ffffff']);
  }
  *interact(V) {
    if (this.left <= 0) return;
    const p = V.player;
    p.facing = this.x > p.x ? 1 : -1;
    for (let i = 0; i < 3; i++) {
      V.swing = { t: 0, x: this.x, y: this.y };
      AudioSys.sfx('whoosh', { vol: 0.4 });
      yield 0.16;
      this.shake = 1; this.hits++;
      AudioSys.sfx(i === 2 ? 'bighit' : 'hit', { vol: 0.7 });
      Juice.shake(i === 2 ? 6 : 3, 0.12);
      Particles.spawn(this.x, this.y - 18, { n: 8, color: GEM_COLS[this.kind], speed: 180, spread: 6.28, life: 0.6, size: 3, sizeEnd: 0, gravity: 380 });
      Particles.debris(this.x, this.y - 6, 4, ['#574a66', '#3b3048']);
      yield 0.22;
    }
    V.swing = null;
    const n = this.left;
    this.left = 0;
    Game.run.gems = (Game.run.gems || 0) + n;
    if (Game.run) (Game.run.solved = Game.run.solved || {})[this.id] = true;
    AudioSys.sfx('gold'); AudioSys.sfx('pickup');
    Particles.sparkle(this.x, this.y - 24, 26, [GEM_COLS[this.kind][1], '#ffffff', '#ffe98a']);
    Popups.add(this.x, this.y - 58, `+${n} GEMS`, GEM_COLS[this.kind][1], { scale: 1.6, life: 1.8 });
    quip(p, 'gem');
    if (!Game.run.tips || !Game.run.tips.gems) {
      (Game.run.tips = Game.run.tips || {}).gems = true;
      yield* Dialogue.say('', 'Gems. The altar in the village square will set them into your riffs - three gems, one enchantment, and it lasts the whole run.', { at: p });
    }
  }
  draw() {
    const x = this.x + (this.shake > 0 ? Math.sin(Time.t * 60) * 2 * this.shake : 0), y = this.y, c = GEM_COLS[this.kind];
    Gfx.shadow(x, y + 2, 44, 0.32);
    // the rock it grows out of
    Gfx.round(x - 20, y - 14, 40, 18, 6, '#241c2e');
    Gfx.round(x - 18, y - 13, 36, 14, 5, '#574a66');
    Gfx.round(x - 18, y - 13, 36, 4, 3, '#7a6d8a');
    if (this.left <= 0) {                               // spent: a broken stub and some chips
      for (let k = 0; k < 3; k++) Gfx.rect(x - 10 + k * 8, y - 17, 5, 4, c[2]);
      return;
    }
    const shards = [[-10, -30, 7], [2, -44, 9], [12, -28, 6], [-3, -24, 6]];
    for (const [sx, sy, sw] of shards) {
      const ctx = Gfx.ctx;
      ctx.fillStyle = '#120c16';
      ctx.beginPath(); ctx.moveTo(x + sx - sw / 2 - 1, y - 10); ctx.lineTo(x + sx, y + sy - 2); ctx.lineTo(x + sx + sw / 2 + 1, y - 10); ctx.fill();
      ctx.fillStyle = c[0];
      ctx.beginPath(); ctx.moveTo(x + sx - sw / 2, y - 11); ctx.lineTo(x + sx, y + sy); ctx.lineTo(x + sx + sw / 2, y - 11); ctx.fill();
      ctx.fillStyle = c[1];
      ctx.beginPath(); ctx.moveTo(x + sx - sw / 2 + 1, y - 11); ctx.lineTo(x + sx, y + sy + 2); ctx.lineTo(x + sx, y - 11); ctx.fill();
    }
    Gfx.glow(x, y - 26, 46, c[1], 0.22 + Math.sin(this.t * 2.2) * 0.07);
  }
}

// ------------------------------------------------------------------- altar
class Altar extends Entity {
  constructor(x, y) { super(x, y); this.prompt = 'ENCHANT'; this.r = 30; this.t = rnd(0, 6); }
  update(dt) { this.t += dt; if (chance(dt * 2)) Particles.sparkle(this.x + rnd(-14, 14), this.y - rnd(30, 50), 1, ['#b177e6', '#ffe98a']); }
  *interact(V) {
    if (!Game.run.tips || !Game.run.tips.altar) {
      (Game.run.tips = Game.run.tips || {}).altar = true;
      yield* Dialogue.say('ALTAR', `Press a gem into a riff and it keeps it. ${ENCHANT_COST} gems for one enchantment: FLINT hits harder, GRANITE blocks more, FEATHER costs less, AMBER draws you a card. One gem to a card.`, { at: { x: this.x, top: this.y - 70 } });
    }
    Game.overlay = new EnchantOverlay();
    yield () => !Game.overlay;
  }
  draw() {
    const x = this.x, y = this.y, t = this.t;
    Gfx.shadow(x, y + 2, 70, 0.32);
    Gfx.round(x - 30, y - 28, 60, 30, 5, '#241c2e');                 // the block
    Gfx.round(x - 28, y - 26, 56, 26, 4, '#574a66');
    Gfx.round(x - 28, y - 26, 56, 6, 3, '#7a6d8a');
    for (let i = 0; i < 4; i++) Gfx.rect(x - 22 + i * 13, y - 16, 7, 2, '#b177e6');    // runes
    Gfx.round(x - 36, y - 34, 72, 10, 4, '#241c2e');                 // the slab on top
    Gfx.round(x - 34, y - 33, 68, 7, 3, '#9391a6');
    for (const s of [-1, 1]) {                                        // two candles of fat
      Gfx.rect(x + s * 28 - 3, y - 46, 6, 12, '#e8dfc6');
      Gfx.rect(x + s * 28 - 3, y - 46, 2, 12, '#fffaea');
      World.flame(x + s * 28, y - 46, 10 + Math.abs(Math.sin(t * 7 + s)) * 4, 3, Math.sin(t * 3 + s), ['#e06a1b', '#ffa832', '#ffe98a', '#9c3510'], s);
    }
    // the socket, and the gem that hovers over it
    const hy = y - 58 + Math.sin(t * 2) * 3;
    Gfx.glow(x, hy, 56, '#b177e6', 0.28 + Math.sin(t * 3) * 0.08);
    const ctx = Gfx.ctx;
    ctx.fillStyle = '#120c16'; ctx.beginPath(); ctx.moveTo(x, hy - 12); ctx.lineTo(x + 9, hy); ctx.lineTo(x, hy + 12); ctx.lineTo(x - 9, hy); ctx.fill();
    ctx.fillStyle = '#7c3eb2'; ctx.beginPath(); ctx.moveTo(x, hy - 10); ctx.lineTo(x + 7, hy); ctx.lineTo(x, hy + 10); ctx.lineTo(x - 7, hy); ctx.fill();
    ctx.fillStyle = '#b177e6'; ctx.beginPath(); ctx.moveTo(x, hy - 10); ctx.lineTo(x - 7, hy); ctx.lineTo(x, hy); ctx.fill();
  }
}

// the gem, as an icon: the same purple cut stone everywhere it is counted
function drawGemIcon(gx, gy, t = Time.t) {
  const ctx = Gfx.ctx;
  Gfx.glow(gx, gy, 18, '#b177e6', 0.3 + Math.sin(t * 3) * 0.1);
  ctx.fillStyle = '#120c16'; ctx.beginPath(); ctx.moveTo(gx, gy - 11); ctx.lineTo(gx + 8, gy); ctx.lineTo(gx, gy + 11); ctx.lineTo(gx - 8, gy); ctx.fill();
  ctx.fillStyle = '#7c3eb2'; ctx.beginPath(); ctx.moveTo(gx, gy - 9); ctx.lineTo(gx + 6, gy); ctx.lineTo(gx, gy + 9); ctx.lineTo(gx - 6, gy); ctx.fill();
  ctx.fillStyle = '#b177e6'; ctx.beginPath(); ctx.moveTo(gx, gy - 9); ctx.lineTo(gx - 6, gy); ctx.lineTo(gx, gy); ctx.fill();
}

// --------------------------------------------------------- enchant overlay
class EnchantOverlay {
  constructor() { this.card = null; this.scroll = 0; this.t = 0; }
  update(dt) {
    this.t += dt;
    if (!this.card) {
      const rows = Math.ceil(Game.run.deck.length / 6);
      this.scroll = clamp(this.scroll + Input.wheel * 50 - Input.dragDY, 0, Math.max(0, rows * (CARD_H + 18) - 310));
    }
    if (Input.pressed('Escape')) { if (this.card) this.card = null; else Game.overlay = null; }
  }
  draw() {
    const run = Game.run;
    Gfx.rectA(0, 0, W, H, '#120c16', 0.82);
    const r = UI.window(24, 20, W - 48, H - 40, 'THE ALTAR', { onClose: () => { Game.overlay = null; } });
    // the gems you have
    const gx = r.x + r.w - 150;
    drawGemIcon(gx + 10, r.y + 10, this.t);
    Gfx.text(`${run.gems || 0} GEMS`, gx + 30, r.y + 4, { color: SKIN.text, scale: 1.4 });
    if (!this.card) {
      Gfx.text(`Pick a riff to enchant  -  ${ENCHANT_COST} gems`, r.x + 8, r.y + 4, { color: SKIN.textDim, scale: 1.2 });
      const TOP = r.y + 28, BOT = r.y + r.h - 54;
      const ctx = Gfx.ctx; ctx.save(); ctx.beginPath(); ctx.rect(r.x, TOP, r.w, BOT - TOP); ctx.clip();
      const list = run.deck.slice().sort((a, b) => (a.ench ? 1 : 0) - (b.ench ? 1 : 0) || a.cost - b.cost || a.name.localeCompare(b.name));
      let zoom = null;
      list.forEach((c, i) => {
        const x = r.x + 18 + (i % 6) * (CARD_W + 24), y = TOP + 6 + Math.floor(i / 6) * (CARD_H + 18) - this.scroll;
        if (y > BOT || y + CARD_H < TOP) return;
        const can = !c.ench && Object.keys(ENCHANTS).some(id => Cards.canEnchant(c, id));
        const hov = UI.hovered(x, Math.max(TOP, y), CARD_W, Math.min(CARD_H, BOT - y));
        Cards.draw(c, x, y, { hover: hov && can, alpha: can ? 1 : 0.45 });
        if (hov) zoom = { c, x: x + CARD_W / 2 + (x < W / 2 ? 190 : -190), y: clamp(y + CARD_H / 2, 150, 380) };
        if (can) UI.hit(x, y, CARD_W, CARD_H, () => { this.card = c; AudioSys.sfx('select'); });
      });
      ctx.restore();
      if (zoom) Cards.zoom(zoom.c, zoom.x, zoom.y);
      UI.wbutton(W / 2 - 90, r.y + r.h - 48, 180, 44, 'LEAVE', () => { Game.overlay = null; });
      return;
    }
    // the card, and the four gems it could take
    const c = this.card;
    Cards.draw(c, r.x + 40, r.y + 60, { scale: 1.5 });
    Gfx.text(c.name, r.x + 40 + CARD_W * 0.75, r.y + 36, { color: SKIN.text, align: 'center', scale: 1.4 });
    let y = r.y + 40;
    const x = r.x + 260, bw = r.w - 290;
    for (const [id, E] of Object.entries(ENCHANTS)) {
      const ok = Cards.canEnchant(c, id), afford = (run.gems || 0) >= ENCHANT_COST;
      UI.slab(x, y, bw, 70, { r: 4, shadow: true });
      Gfx.glow(x + 36, y + 35, 34, E.col, ok ? 0.35 : 0.1);
      Gfx.circle(x + 36, y + 35, 17, SKIN.ink);
      Gfx.circle(x + 36, y + 35, 14, ok ? E.col : SKIN.faceMid);
      Gfx.circle(x + 31, y + 30, 5, ok ? E.lit : SKIN.face);
      Gfx.text(E.name.toUpperCase(), x + 66, y + 14, { color: ok ? SKIN.text : SKIN.faceDark, scale: 1.5 });
      Gfx.text(ok ? E.text : 'does not fit this riff', x + 66, y + 38, { color: ok ? SKIN.textDim : SKIN.faceDark, scale: 1.1 });
      UI.wbutton(x + bw - 150, y + 14, 136, 42, afford ? `${ENCHANT_COST} GEMS` : 'NEED GEMS', () => {
        run.gems -= ENCHANT_COST;
        Cards.enchant(c, id);
        AudioSys.sfx('unlock'); AudioSys.sfx('relic');
        Juice.flash(E.col, 0.35, 3);
        Particles.sparkle(r.x + 40 + CARD_W * 0.75, r.y + 60 + CARD_H * 0.75, 40, [E.col, E.lit, '#ffffff']);
        Popups.add(r.x + 40 + CARD_W * 0.75, r.y + 50, `${E.name.toUpperCase()}!`, E.col, { world: false, scale: 2, life: 1.6 });
        Game.save();
        this.card = null;
      }, { disabled: !ok || !afford, scale: 1.2 });
      y += 80;
    }
    UI.wbutton(W / 2 - 90, r.y + r.h - 48, 180, 44, 'BACK', () => { this.card = null; });
  }
}
