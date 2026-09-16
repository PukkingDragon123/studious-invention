// ---------------------------------------------------------------------------
// minigames.js - the interactive beats of the opening: bellows, breakfast,
// the mammoth shower and the drive to work. Each is a small coroutine-driven
// game with its own scoring, run with:  const r = yield* new MashGame(o).run();
// ---------------------------------------------------------------------------
'use strict';

class MiniGame {
  constructor(o = {}) { this.o = o; this.t = 0; this.done = false; this.score = 0; this.result = null; this.intro = 1.4; }
  *run() {
    Game.mini = this;
    const bars = Juice.barsTarget;
    Juice.letterbox(false);
    while (!this.done) { yield 0; this.t += Time.dt; if (this.intro > 0) this.intro -= Time.dt; else this.step(Time.dt); }
    yield 0.7;
    Juice.barsTarget = bars;
    Game.mini = null;
    return this.result;
  }
  finish(result) { if (this.done) return; this.done = true; this.result = result; AudioSys.sfx(result.win ? 'victory' : 'defeat'); }
  step() { }
  draw() { }
  // shared chrome: title, timer bar and a goal readout
  drawFrame(title, sub, prog) {
    const y = 16;
    Gfx.rectA(0, y - 6, W, 46, '#120c16', 0.62);
    Gfx.text(title, W / 2, y, { color: '#ffe98a', align: 'center', scale: 1.8, outline: true, outlineWidth: 2 });
    if (sub) Gfx.text(sub, W / 2, y + 24, { color: '#d6cfe0', align: 'center' });
    if (prog !== undefined) Gfx.bar(W / 2 - 180, y + 40, 360, 8, prog, '#ffa832');
    if (this.intro > 0) {
      const k = clamp(this.intro / 1.4, 0, 1);
      Gfx.ctx.globalAlpha = k < 0.25 ? k / 0.25 : 1;
      Gfx.text(this.o.hint || '', W / 2, H / 2 + 120, { color: '#ffffff', align: 'center', scale: 1.6, outline: true, outlineWidth: 2 });
      Gfx.ctx.globalAlpha = 1;
    }
  }
  beat() { return AudioSys.song ? (AudioSys.now() - AudioSys.songStart) / AudioSys.beatDur() : this.t * 2; }
  onBeat(tol = 0.18) { const b = this.beat(); return Math.abs(b - Math.round(b)) < tol; }
}

// ---------------------------------------------------------------- BELLOWS ---
// Alternate the two pump keys in time with the music to work the fire up.
class BellowsGame extends MiniGame {
  constructor(o) {
    super(o);
    this.fire = 0; this.need = 1; this.side = 0; this.time = 17; this.pumps = 0; this.perfect = 0;
    this.pop = 0; this.shake = 0; this.angry = 0;
    this.o.hint = Input.touch ? 'TAP THE GLOWING PEDAL, ALTERNATING, ON THE BEAT' : 'HAMMER  A  AND  D  IN TURN, ON THE BEAT';
  }
  press(side) {
    if (side !== this.side) { this.angry = 1; AudioSys.sfx('error'); Juice.shake(3, 0.1); return; }
    const good = this.onBeat(0.2);
    this.side = 1 - this.side; this.pumps++;
    const gain = good ? 0.085 : 0.042;
    if (good) { this.perfect++; Popups.add(W / 2, H / 2 - 40, 'FWOOSH!', '#ffa832', { world: false, scale: 1.4 }); }
    this.fire = clamp(this.fire + gain, 0, 1);
    this.pop = 1; this.shake = good ? 5 : 2;
    AudioSys.sfx(good ? 'fire_whoosh' : 'spray');
    Particles.fire(W / 2 + rnd(-40, 40), H / 2 + 60, good ? 10 : 4);
    Juice.shake(this.shake, 0.12);
    if (this.fire >= 1) this.finish({ win: true, perfect: this.perfect, pumps: this.pumps });
  }
  step(dt) {
    this.time -= dt;
    this.fire = Math.max(0, this.fire - dt * 0.055);
    this.pop = Math.max(0, this.pop - dt * 4);
    this.angry = Math.max(0, this.angry - dt * 2);
    if (Input.pressed('KeyA', 'ArrowLeft')) this.press(0);
    if (Input.pressed('KeyD', 'ArrowRight')) this.press(1);
    for (const c of Input.clicks) this.press(c.x < W / 2 ? 0 : 1);
    if (this.time <= 0) this.finish({ win: this.fire > 0.4, perfect: this.perfect, pumps: this.pumps });
  }
  draw() {
    const cy = H / 2 + 40;
    // two stone pedals, the live one lit
    for (let i = 0; i < 2; i++) {
      const x = i === 0 ? W / 2 - 200 : W / 2 + 200;
      const live = this.side === i;
      const k = live ? 1 + Math.sin(this.t * 10) * 0.06 : 1;
      Gfx.round(x - 70, cy - 26, 140, 56, 8, '#120c16');
      Gfx.round(x - 66, cy - 22 - (live ? 3 : 0), 132, 48, 7, live ? '#85562f' : '#3b3048');
      Gfx.outlineRound(x - 66, cy - 22 - (live ? 3 : 0), 132, 48, 7, live ? '#ffe98a' : '#574a66');
      Gfx.text(Input.touch ? (i ? 'RIGHT' : 'LEFT') : (i ? 'D' : 'A'), x, cy - 10 - (live ? 3 : 0), { color: live ? '#fffaea' : '#7a6d8a', align: 'center', scale: 1.8 * k });
    }
    // fire meter
    Gfx.text('FIRE', W / 2, cy + 54, { color: '#ffa832', align: 'center' });
    Gfx.bar(W / 2 - 150, cy + 72, 300, 18, this.fire, this.fire > 0.7 ? '#ffe08a' : '#e06a1b', { bg: '#3f0e18' });
    this.drawFrame('LIGHT THE STOVE', `${Math.ceil(this.time)}s  -  the stove is not a morning raptor`, 1 - this.time / 17);
  }
}

// -------------------------------------------------------------- BREAKFAST ---
// Mash to chew. Chew on the beat for big bites. The kids steal what you leave.
class FeastGame extends MiniGame {
  constructor(o) {
    super(o);
    this.meat = 1; this.eaten = 0; this.stolen = 0; this.time = 15; this.chew = 0; this.combo = 0;
    this.kidT = 2.6; this.messy = 0;
    this.o.hint = Input.touch ? 'TAP ANYWHERE, FAST, ON THE BEAT' : 'MASH  SPACE  ON THE BEAT';
  }
  bite() {
    if (this.meat <= 0) return;
    const good = this.onBeat(0.2);
    const amount = good ? 0.09 : 0.045;
    this.meat = clamp(this.meat - amount, 0, 1);
    this.eaten += amount; this.chew = 1; this.messy = Math.min(1, this.messy + 0.06);
    if (good) { this.combo++; Popups.add(W / 2 + rnd(-40, 40), H / 2 - 60, pick(['CHOMP!', 'NOM!', 'GULP!']), '#ffe08a', { world: false, scale: 1.3 }); }
    else this.combo = 0;
    AudioSys.sfx(good ? 'crunch' : 'chomp');
    Particles.spawn(W / 2, H / 2 - 20, { n: good ? 10 : 5, color: ['#c2333c', '#7d1d2b', '#d8a86b'], speed: 260, life: 0.7, size: 4, gravity: 700, world: false });
    Juice.shake(good ? 3.5 : 1.6, 0.1);
    if (this.meat <= 0) { AudioSys.sfx('burp'); this.finish({ win: true, eaten: this.eaten, stolen: this.stolen, combo: this.combo }); }
  }
  step(dt) {
    this.time -= dt; this.chew = Math.max(0, this.chew - dt * 5);
    if (Input.pressed('Space', 'KeyE', 'Enter')) this.bite();
    for (const c of Input.clicks) this.bite();
    this.kidT -= dt;
    if (this.kidT <= 0) {
      this.kidT = rnd(2.2, 3.6);
      if (this.meat > 0.05) {
        const s = 0.07; this.meat = Math.max(0, this.meat - s); this.stolen += s;
        AudioSys.sfx('slurp');
        Popups.add(W / 2 + 120, H / 2 - 40, 'THE KIDS!', '#a8e878', { world: false, scale: 1.2 });
        Particles.spawn(W / 2 + 90, H / 2 - 10, { n: 8, color: ['#c2333c', '#d8a86b'], speed: 200, life: 0.6, size: 3, gravity: 600, world: false });
      }
    }
    if (this.time <= 0) this.finish({ win: this.eaten > 0.5, eaten: this.eaten, stolen: this.stolen, combo: this.combo });
  }
  draw() {
    const cy = H - 130;
    Gfx.rectA(0, cy - 8, W, 96, '#120c16', 0.6);
    Gfx.text('YOUR SHARE', W / 2 - 170, cy, { color: '#ffe08a', align: 'center' });
    Gfx.bar(W / 2 - 250, cy + 18, 160, 18, this.eaten, '#a8e878', { bg: '#14331e' });
    Gfx.text('LEFT ON THE BONE', W / 2 + 170, cy, { color: '#d6cfe0', align: 'center' });
    Gfx.bar(W / 2 + 90, cy + 18, 160, 18, this.meat, '#c2333c', { bg: '#3f0e18' });
    if (this.combo > 2) Gfx.text(`${this.combo} CHOMP COMBO`, W / 2, cy + 44, { color: '#ffb0cf', align: 'center', scale: 1.2, outline: true });
    this.drawFrame('BREAKFAST', `${Math.ceil(this.time)}s  -  eat it before they do`, 1 - this.time / 15);
  }
}

// ----------------------------------------------------------------- SHOWER ---
// Keep the trunk's water in the warm band by holding and releasing.
class ShowerGame extends MiniGame {
  constructor(o) {
    super(o);
    this.temp = 0.5; this.target = 0.62; this.clean = 0; this.time = 14; this.drift = 0; this.squeak = 0;
    this.o.hint = Input.touch ? 'HOLD TO SQUEEZE THE TRUNK, LET GO TO COOL OFF' : 'HOLD  SPACE  TO SQUEEZE, RELEASE TO COOL';
  }
  step(dt) {
    this.time -= dt;
    const holding = Input.isDown('Space', 'KeyE') || Input.down;
    this.temp = clamp(this.temp + (holding ? dt * 0.42 : -dt * 0.34), 0, 1);
    this.drift += dt;
    this.target = 0.55 + Math.sin(this.drift * 0.7) * 0.22;
    const off = Math.abs(this.temp - this.target);
    if (off < 0.11) {
      this.clean = clamp(this.clean + dt * 0.3, 0, 1);
      if (chance(dt * 22)) Particles.splash(W / 2 + rnd(-60, 60), H / 2 + rnd(-40, 40), 1);
      this.squeak += dt;
      if (this.squeak > 0.7) { this.squeak = 0; AudioSys.sfx('spray'); Popups.add(W / 2 + rnd(-70, 70), H / 2 - 50, 'SQUEAKY', '#86e8d2', { world: false, scale: 1.1 }); }
    } else if (off > 0.3) {
      if (chance(dt * 2)) { AudioSys.sfx(this.temp > this.target ? 'fire_whoosh' : 'gasp'); Popups.add(W / 2, H / 2 - 70, this.temp > this.target ? 'TOO HOT!' : 'TOO COLD!', '#ef6a5e', { world: false, scale: 1.3 }); Juice.shake(3, 0.12); }
    }
    if (this.clean >= 1) this.finish({ win: true, clean: this.clean });
    else if (this.time <= 0) this.finish({ win: this.clean > 0.5, clean: this.clean });
  }
  draw() {
    const x = W / 2 + 260, y0 = 140, hgt = 240;
    // temperature column
    Gfx.rect(x - 22, y0 - 4, 44, hgt + 8, '#120c16');
    Gfx.bands(x - 18, y0, 36, hgt, ['#ef6a5e', '#e06a1b', '#ffa832', '#6cc95c', '#2cb3a2', '#3570c0', '#1d3d72']);
    const ty = y0 + (1 - this.target) * hgt;
    Gfx.rectA(x - 30, ty - 14, 60, 28, '#ffffff', 0.18);
    Gfx.outlineRect(x - 30, ty - 14, 60, 28, '#fffaea', 2);
    const py = y0 + (1 - this.temp) * hgt;
    Gfx.rect(x - 34, py - 3, 68, 6, '#120c16');
    Gfx.rect(x - 32, py - 2, 64, 4, '#ffe98a');
    Gfx.text('WARM', x + 44, ty - 6, { color: '#fffaea' });
    Gfx.text('CLEAN', W / 2 - 170, H - 118, { color: '#86e8d2' });
    Gfx.bar(W / 2 - 170, H - 100, 340, 18, this.clean, '#2cb3a2', { bg: '#0f3838' });
    this.drawFrame('MAMMOTH SHOWER', `${Math.ceil(this.time)}s  -  keep it in the warm band`, 1 - this.time / 14);
  }
}

// ------------------------------------------------------------------ DRIVE ---
// Three-lane dodge: pedal to the beat for speed, steer around the traffic.
class DriveGame extends MiniGame {
  constructor(o) {
    super(o);
    this.lane = 1; this.laneY = [H / 2 - 20, H / 2 + 50, H / 2 + 120];
    this.y = this.laneY[1]; this.speed = 240; this.dist = 0; this.goal = o.goal || 2100;
    this.obstacles = []; this.shells = []; this.spawnT = 0; this.shellT = 0.6;
    this.hits = 0; this.picked = 0; this.pedal = 0; this.bob = 0; this.rex = null;
    this.o.hint = Input.touch ? 'SWIPE OR TAP UP/DOWN TO STEER, TAP THE PEDAL TO GO FASTER' : 'W / S TO STEER  -  TAP SPACE ON THE BEAT TO PEDAL';
  }
  step(dt) {
    // steering
    if (Input.pressed('ArrowUp', 'KeyW')) this.lane = Math.max(0, this.lane - 1);
    if (Input.pressed('ArrowDown', 'KeyS')) this.lane = Math.min(2, this.lane + 1);
    for (const c of Input.clicks) {
      if (c.x > W * 0.62) { if (this.onBeat(0.22)) this.pedalNow(true); else this.pedalNow(false); }
      else this.lane = clamp(c.y < this.y - 30 ? this.lane - 1 : c.y > this.y + 30 ? this.lane + 1 : this.lane, 0, 2);
    }
    if (Input.pressed('Space')) this.pedalNow(this.onBeat(0.22));
    this.y = damp(this.y, this.laneY[this.lane], 16, dt);
    this.speed = damp(this.speed, 230, 1.6, dt);
    this.dist += this.speed * dt;
    this.pedal = Math.max(0, this.pedal - dt * 3);
    this.bob += dt * (6 + this.speed * 0.02);
    // spawn traffic
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = clamp(1.15 - this.dist / this.goal * 0.55, 0.42, 1.2);
      const lane = rndInt(0, 2);
      this.obstacles.push({ x: W + 80, lane, spr: pick(['prop_rock', 'prop_bones', 'compy_walk', 'prop_barrel']), t: rnd(0, 6) });
    }
    this.shellT -= dt;
    if (this.shellT <= 0) { this.shellT = rnd(0.7, 1.6); this.shells.push({ x: W + 60, lane: rndInt(0, 2), got: false }); }
    const move = (this.speed + 120) * dt;
    for (const o of this.obstacles) o.x -= move;
    for (const s of this.shells) s.x -= move;
    // collisions
    for (const o of this.obstacles) {
      if (o.hit) continue;
      if (Math.abs(o.x - 180) < 44 && o.lane === this.lane) {
        o.hit = true; this.hits++; this.speed = 120;
        AudioSys.sfx('thud'); Juice.shake(9, 0.3); Juice.flash('#c2333c', 0.3, 5);
        Particles.impact(200, this.y, ['#d8a86b', '#9391a6'], 18);
        Popups.add(220, this.y - 50, 'CRUNCH!', '#ef6a5e', { world: false, scale: 1.6 });
      }
    }
    for (const s of this.shells) {
      if (s.got) continue;
      if (Math.abs(s.x - 180) < 40 && s.lane === this.lane) {
        s.got = true; this.picked++; AudioSys.sfx('gold');
        Popups.add(s.x, this.y - 40, '+1', '#ffe98a', { world: false });
        Particles.sparkle(s.x, this.y - 20, 8);
      }
    }
    this.obstacles = this.obstacles.filter(o => o.x > -120);
    this.shells = this.shells.filter(s => s.x > -60 && !s.got);
    if (this.dist >= this.goal) this.finish({ win: true, hits: this.hits, shells: this.picked });
  }
  pedalNow(good) {
    this.pedal = 1;
    this.speed = Math.min(430, this.speed + (good ? 62 : 24));
    AudioSys.sfx('car_roll', { vol: good ? 0.9 : 0.5, len: 0.3 });
    if (good) { Particles.dust(150, this.y + 26, 6); Popups.add(150, this.y - 56, 'PEDAL!', '#a8e878', { world: false, scale: 1.1 }); }
  }
  draw() {
    // road bands
    Gfx.bands(0, 0, W, H, ['#7fb0c8', '#9ec4d4', '#c9b98d', '#b9a173', '#8d7a52']);
    for (let i = 0; i < 3; i++) {
      const y = this.laneY[i] + 30;
      for (let x = -((this.dist * 1.2) % 120); x < W; x += 120) Gfx.rectA(x, y, 60, 4, '#fffaea', 0.25);
    }
    // parallax scenery
    for (let i = 0; i < 8; i++) {
      const x = W - ((this.dist * 0.35 + i * 240) % (W + 260));
      Gfx.sprite(i % 2 ? 'prop_palm' : 'prop_deadtree', x, 150, { anchor: 'bc', alpha: 0.85 });
    }
    const drawables = [];
    for (const o of this.obstacles) drawables.push({ y: this.laneY[o.lane], f: () => Gfx.sprite(o.spr, o.x, this.laneY[o.lane] + 26, { anchor: 'bc', frame: Math.floor(this.t * 8 + o.t), alpha: o.hit ? 0.4 : 1 }) });
    for (const s of this.shells) drawables.push({ y: this.laneY[s.lane], f: () => Gfx.sprite('icon_coin', s.x, this.laneY[s.lane] + 10 + Math.sin(this.t * 8 + s.x) * 4, { anchor: 'c', scale: 1.4 }) });
    const py = this.y + Math.sin(this.bob) * 3;
    drawables.push({ y: this.y + 1, f: () => {
      Gfx.shadow(190, py + 30, 90, 0.3);
      Gfx.sprite('car', 190, py + 30, { anchor: 'bc', frame: Math.floor(this.dist / 22) });
      Gfx.sprite('bronk_drive', 196, py + 8, { anchor: 'bc', frame: this.pedal > 0.4 ? 1 : 0 });
    } });
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.f();
    if (this.pedal > 0.1) for (let i = 0; i < 2; i++) Particles.dust(140, py + 28, 1);
    Gfx.rectA(8, H - 56, 168, 48, '#120c16', 0.6);
    Gfx.text(`SHELLS ${this.picked}`, 18, H - 50, { color: '#ffe98a', scale: 1.2 });
    Gfx.text(`BUMPS ${this.hits}`, 18, H - 28, { color: this.hits ? '#ef6a5e' : '#7a6d8a', scale: 1.2 });
    this.drawFrame('THE COMMUTE', `${Math.max(0, Math.round((this.goal - this.dist) / 100))}00 paces to the quarry`, this.dist / this.goal);
  }
}
