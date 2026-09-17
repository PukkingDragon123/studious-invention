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

// --------------------------------------------------------------- SIDESCROLL -
// A small 2D side-scrolling stage. Used three times in the opening: the dash
// to the pancakes, the chill drive to the quarry, and the chase home. The
// caller supplies a painter that draws the world for a given camera x, so the
// same movement code carries a kitchen, a road and a canyon.
class SideScroll extends MiniGame {
  constructor(o) {
    super(o);
    this.x = o.startX || 0; this.vx = 0;
    this.goal = o.goal ?? 1700;
    this.ground = o.ground ?? 428;
    this.camX = this.x - W * 0.34;
    this.runSpeed = o.speed ?? 250;
    this.auto = o.auto ?? 0;                       // constant forward push
    this.hero = new Actor({ base: o.base || 'bronk', x: 0, y: this.ground, scale: o.scale || 1.6 });
    this.moveClip = o.moveClip || 'walk'; this.idleClip = o.idleClip || 'idle';
    this.pursuer = o.pursuer ? Object.assign({ x: this.x - 420, t: 0, scale: 1.6, speed: 215, clip: 'walk' }, o.pursuer) : null;
    this.ahead = o.ahead ? Object.assign({ x: this.x + 700, t: 0, scale: 1.4, speed: 235, clip: 'walk' }, o.ahead) : null;
    this.pickups = (o.pickups || []).map(p => Object.assign({ got: false, t: rnd(0, 6) }, p));
    this.props = o.props || [];
    this.caught = 0; this.got = 0; this.bump = 0; this.puff = 0;
    this.intro = o.intro ?? 1.2;
    this.o.hint = o.hint || (Input.touch ? 'HOLD THE RIGHT OF THE SCREEN TO RUN' : 'HOLD  D  OR  →  TO RUN');
  }
  step(dt) {
    // --- input: hold to run right, and you can back up if you want to
    let dir = 0;
    if (Input.isDown('KeyD', 'ArrowRight')) dir = 1;
    if (Input.isDown('KeyA', 'ArrowLeft')) dir = -1;
    if (Input.touch) { for (const p of Input.touches.values()) dir = p.x > W * 0.5 ? 1 : -1; }
    else if (Input.down && Input.my > 120) dir = Input.mx > W * 0.5 ? 1 : -1;
    const want = dir * this.runSpeed + this.auto;
    this.vx = damp(this.vx, want, this.o.grip ?? 7, dt);
    this.x += this.vx * dt;
    if (this.x < 0) { this.x = 0; this.vx = 0; }
    // --- animation and dust
    const moving = Math.abs(this.vx) > 24;
    this.hero.play(moving ? this.moveClip : this.idleClip, { fps: moving ? 8 + Math.abs(this.vx) / 26 : undefined });
    this.hero.facing = this.vx < -14 ? -1 : 1;
    if (moving && !this.o.vehicle) { this.puff -= dt; if (this.puff <= 0) { this.puff = 0.07; Particles.dust(this.screenX(this.x) - this.hero.facing * 18, this.ground, 1); AudioSys.sfx('step_grass', { vol: 0.35 }); } }
    else if (moving && this.o.vehicle) { this.puff -= dt; if (this.puff <= 0) { this.puff = 0.22; AudioSys.sfx('car_roll', { vol: 0.5, len: 0.3 }); } }
    this.hero.update(dt);
    // --- the camera leads a little in the direction of travel
    this.camX = damp(this.camX, this.x - W * 0.34 + clamp(this.vx, -140, 140) * 0.45, 5, dt);
    // --- someone chasing, someone running away
    if (this.pursuer) {
      const p = this.pursuer; p.t += dt;
      p.x += (p.speed + (this.o.pursuerRamp || 0) * (this.x / this.goal)) * dt;
      p.x = Math.max(p.x, this.x - (this.o.leash ?? 900));
      if (p.x > this.x - 46) { this.caught += dt; this.bump = 1; Juice.shake(5, 0.12); if (chance(dt * 4)) AudioSys.sfx('chomp'); }
      else this.caught = Math.max(0, this.caught - dt * 0.5);
    }
    if (this.ahead) { const a = this.ahead; a.t += dt; a.x += a.speed * dt; }
    // --- pickups
    for (const k of this.pickups) {
      if (k.got || Math.abs(k.x - this.x) > 34) continue;
      k.got = true; this.got++;
      AudioSys.sfx('pickup'); Particles.sparkle(this.screenX(k.x), this.ground - 30, 10);
      Popups.add(this.screenX(k.x), this.ground - 60, k.label || '+1', '#ffe98a', { world: false, scale: 1.2 });
    }
    this.bump = Math.max(0, this.bump - dt * 2);
    if (this.caught > (this.o.catchTime ?? 2.2)) this.finish({ win: false, caught: true, got: this.got, x: this.x });
    else if (this.x >= this.goal) this.finish({ win: true, got: this.got, x: this.x });
  }
  screenX(worldX) { return worldX - this.camX; }
  draw() {
    if (this.o.paint) this.o.paint(this.camX, this.t, this);
    const list = [];
    for (const pr of this.props) list.push({ y: pr.y ?? this.ground, f: () => Gfx.sprite(pr.spr, this.screenX(pr.x), pr.y ?? this.ground, { anchor: 'bc', scale: pr.scale || 1, flip: pr.flip, frame: Math.floor(this.t * 6 + (pr.x | 0)) }) });
    for (const k of this.pickups) if (!k.got) list.push({ y: this.ground - 1, f: () => Gfx.sprite(k.spr || 'icon_coin', this.screenX(k.x), this.ground - 34 + Math.sin(this.t * 6 + k.t) * 5, { anchor: 'c', scale: k.scale || 1.3 }) });
    if (this.ahead) list.push({ y: this.ground, f: () => {
      const a = this.ahead;
      Gfx.shadow(this.screenX(a.x), this.ground, 40 * a.scale, 0.3);
      Gfx.sprite(a.spr, this.screenX(a.x), this.ground, { anchor: 'bc', scale: a.scale, frame: Math.floor(a.t * 12), flip: a.flip });
      if (a.carry) Gfx.sprite(a.carry, this.screenX(a.x) + 8 * (a.flip ? -1 : 1), this.ground - 34 * a.scale, { anchor: 'c', scale: 0.8, frame: Math.floor(a.t * 6) });
    } });
    if (this.pursuer) list.push({ y: this.ground + 1, f: () => {
      const p = this.pursuer;
      Gfx.shadow(this.screenX(p.x), this.ground, 54 * p.scale, 0.34);
      Gfx.sprite(p.spr, this.screenX(p.x), this.ground, { anchor: 'bc', scale: p.scale, frame: Math.floor(p.t * 10), flip: p.flip });
    } });
    list.push({ y: this.ground + 2, f: () => {
      const sx = this.screenX(this.x);
      if (this.o.vehicle) {
        const bounce = Math.sin(this.t * 9 + this.x * 0.02) * 2 * clamp(Math.abs(this.vx) / 200, 0, 1);
        const sc = this.o.vehicleScale || 1.5;
        Gfx.shadow(sx, this.ground + 2, 116 * sc * 0.7, 0.32);
        Gfx.sprite(this.o.vehicle, sx, this.ground + bounce * 0.4,
          { anchor: 'bc', scale: sc, frame: Math.floor(Math.abs(this.x) / 18), flip: this.hero.facing < 0 });
        Gfx.sprite('bronk_drive', sx - 6 * sc * (this.hero.facing < 0 ? -1 : 1), this.ground - 22 * sc + bounce,
          { anchor: 'bc', scale: sc * 0.78, frame: Math.abs(this.vx) > 180 ? 1 : 0, flip: this.hero.facing < 0 });
        if (Math.abs(this.vx) > 60 && chance(Time.dt * 26)) Particles.dust(sx - 40 * sc * (this.hero.facing || 1), this.ground, 1);
      } else {
        this.hero.x = sx; this.hero.draw();
      }
    } });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) it.f();
    // the finish line
    const gx = this.screenX(this.goal);
    if (gx < W + 60 && gx > -60 && this.o.goalSpr) Gfx.sprite(this.o.goalSpr, gx, this.ground, { anchor: 'bc', scale: this.o.goalScale || 1 });
    this.drawHud();
  }
  drawHud() {
    if (this.o.bare) { if (this.intro > 0) this.drawFrame('', '', undefined); return; }
    if (this.pursuer) {
      const px = this.screenX(this.pursuer.x);
      const danger = clamp(1 - (this.pursuer.x - (this.x - 46)) / 340, 0, 1);
      if (danger > 0.02) {
        Gfx.rectA(0, 0, W, H, '#c2333c', danger * 0.18 * (0.7 + Math.sin(Time.t * 14) * 0.3));
        Gfx.text('RUN!', W / 2, 78, { color: '#ef6a5e', align: 'center', scale: 2 + danger, outline: true, outlineWidth: 2 });
      }
      // when it is behind the camera, say so - an unseen threat is just confusing
      if (px < 40) {
        const k = 0.6 + Math.sin(Time.t * 9) * 0.4;
        Gfx.rectA(0, this.ground - 130, 52, 150, '#c2333c', 0.18 + danger * 0.2);
        Gfx.text('<', 22, this.ground - 76, { color: k > 0.7 ? '#ffffff' : '#ef6a5e', align: 'center', scale: 3.4, outline: true, outlineWidth: 2 });
        Gfx.text(`${Math.round((this.x - this.pursuer.x) / 10)}m`, 22, this.ground - 40, { color: '#ef6a5e', align: 'center', scale: 1.1, outline: true });
      }
    }
    this.drawFrame(this.o.title || '', this.o.sub || '', clamp(this.x / this.goal, 0, 1));
  }
}

// ------------------------------------------------------------------- BONK ---
// The dodo alarm. You wake up, it is screaming on its perch, you bonk it.
// It comes back once, louder, and gets bonked harder. That is the whole game.
class SmackGame extends MiniGame {
  constructor(o) {
    super(o);
    this.round = 0; this.rounds = o.rounds || 2;
    this.state = 'wake';                 // wake -> squawk -> struck -> gone
    this.t = 0; this.stateT = 0; this.swing = 0; this.hit = 0; this.bonked = 0;
    this.gy = o.groundY ?? H * 0.78;
    this.bedX = o.bedX ?? W * 0.32;
    this.perchX = o.perchX ?? W * 0.62;
    this.dodo = { x: this.perchX, y: this.gy - 62, vx: 0, vy: 0, spin: 0, squash: 1, gone: false };
    this.eyes = 0;                       // how open Bronk's eyes are
    this.intro = 0.5; this.o.hint = '';
  }
  bonk() {
    if (this.state !== 'squawk') return;
    this.state = 'struck'; this.stateT = 0; this.swing = 1; this.hit = 1; this.bonked++;
    const hard = this.round >= this.rounds - 1;
    Juice.stop(hard ? 0.14 : 0.08);
    Juice.shake(hard ? 16 : 10, 0.35);
    Juice.flash('#ffffff', 0.3, 5);
    AudioSys.sfx('thud'); AudioSys.sfx('crunch', { vol: 0.7 });
    Particles.spawn(this.dodo.x, this.dodo.y, {
      n: 26, color: ['#fffaea', '#e8dfc6', '#d6cfe0', '#c4b89a'],
      speed: 260, spread: 6.28, life: 1.4, size: 5, sizeEnd: 0, gravity: 120,
    });
    FX.burst(this.dodo.x, this.dodo.y, { world: false, scale: hard ? 2.0 : 1.5 });
    this.dodo.vx = hard ? 600 : 340; this.dodo.vy = hard ? -420 : -260;
    this.dodo.spin = hard ? 16 : 9; this.dodo.squash = 0.45;
    Popups.add(this.dodo.x, this.dodo.y - 40, hard ? 'BONK!!' : 'BONK!', '#ffe98a',
      { world: false, scale: hard ? 3.2 : 2.4, life: 1.1, vy: -40 });
  }
  step(dt) {
    this.stateT += dt;
    const pressed = Input.clicks.length || Input.keys.length;
    if (this.state === 'wake') {
      this.eyes = Math.min(1, this.eyes + dt * 1.6);
      if (this.stateT > 0.7) { this.state = 'squawk'; this.stateT = 0; AudioSys.sfx('roar', { pitch: 560, vol: 0.7, len: 0.4 }); }
    } else if (this.state === 'squawk') {
      if (pressed) this.bonk();
      else if (this.stateT > 2.4) this.bonk();          // it never gets away with it
    } else if (this.state === 'struck') {
      const d = this.dodo;
      d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 900 * dt;
      d.squash = damp(d.squash, 1, 6, dt);
      if (chance(dt * 30)) Particles.spawn(d.x, d.y, { n: 1, color: ['#fffaea'], speed: 40, life: 1.2, size: 4, sizeEnd: 0, gravity: 40 });
      if (this.stateT > 0.9) {
        this.round++;
        if (this.round >= this.rounds) { this.state = 'gone'; this.stateT = 0; }
        else {
          this.state = 'squawk'; this.stateT = -0.5;
          this.dodo = { x: this.perchX, y: this.gy - 62, vx: 0, vy: 0, spin: 0, squash: 1.3 };
          AudioSys.sfx('roar', { pitch: 700, vol: 0.85, len: 0.5 });
        }
      }
    } else if (this.stateT > 0.7) this.finish({ win: true, bonked: this.bonked });
    this.swing = Math.max(0, this.swing - dt * 3.4);
    this.hit = Math.max(0, this.hit - dt * 2.4);
  }
  draw() {
    if (this.o.paint) this.o.paint(this.t, this);
    const d = this.dodo;
    // the dodo, mid-squawk or mid-flight
    if (this.state !== 'gone') {
      const wob = this.state === 'squawk' ? Math.sin(this.t * 26) * 0.12 : 0;
      if (this.state === 'squawk') {
        Gfx.glow(d.x, d.y, 80, '#ffe98a', 0.16 + Math.sin(this.t * 14) * 0.06);
        for (let i = 0; i < 3; i++) {
          const a = -1.1 + i * 0.85, r = 48 + Math.sin(this.t * 20 + i) * 8;
          Gfx.text('~', d.x + Math.cos(a) * r, d.y + Math.sin(a) * r - 24,
            { color: '#ffe98a', align: 'center', scale: 2.2, outline: true, outlineWidth: 2 });
        }
      }
      Gfx.sprite('dodo_walk', d.x, d.y, {
        anchor: 'c', scale: 2.2 * (1 + wob), frame: Math.floor(this.t * 14) % 4,
        rot: this.state === 'struck' ? this.t * d.spin : 0,
        sx: d.squash, sy: 2 - d.squash,
      });
    }
    // Bronk in bed, one eye open, club ready
    const bx = this.bedX, by = this.gy;
    Gfx.sprite('bronk_sleep', bx, by, { anchor: 'bc', scale: 2.0, frame: this.eyes > 0.5 ? 1 : 0 });
    const sw = Ease.outCubic(1 - this.swing);
    Gfx.sprite('art_club', bx + 34 + sw * 52, by - 54 - (1 - sw) * 34, {
      anchor: 'c', scale: 1.8, rot: -2.2 + sw * 2.6,
    });
    if (this.hit > 0.1) Gfx.sprite('fx_anger', d.x + 34, d.y - 34, { anchor: 'c', scale: 1.8, frame: Math.floor(this.t * 14) % 2 });
    // the only instruction there is
    if (this.state === 'squawk') {
      const k = 0.7 + Math.sin(this.t * 9) * 0.3;
      Gfx.text(Input.touch ? 'TAP TO BONK IT' : 'ANY KEY TO BONK IT', W / 2, H - 92,
        { color: '#ffe98a', align: 'center', scale: 1.4 + k * 0.3, outline: true, outlineWidth: 2 });
    }
    this.drawFrame('', '', undefined);
  }
}

// -------------------------------------------------------------------- EGG ---
// Wrestling the egg off its mother. No words anywhere - the whole state of the
// fight is the egg's position and how hard everyone is leaning.
class EggGame extends MiniGame {
  constructor(o) {
    super(o);
    this.pull = 0.5;             // 0 = the dodo has it, 1 = you have it
    this.t = 0; this.tug = 0; this.shake = 0; this.feather = 0; this.dodoPull = 0.30;
    this.intro = 0.8; this.o.hint = '';
  }
  step(dt) {
    this.dodoPull = 0.26 + Math.max(0, this.pull - 0.5) * 0.5 + Math.sin(this.t * 1.7) * 0.06;
    this.pull = clamp(this.pull - this.dodoPull * dt, 0, 1);
    const yanks = Input.clicks.length + Input.keys.length;
    if (yanks) {
      this.pull = clamp(this.pull + 0.052 * yanks, 0, 1);
      this.tug = 1; this.shake = 6; this.feather = 1;
      AudioSys.sfx('crunch', { vol: 0.5 });
      Juice.shake(4, 0.1);
      Particles.spawn(W / 2, H / 2 - 10, { n: 5, color: ['#fffaea', '#e8dfc6', '#c4b89a'], speed: 150, spread: 6.28, life: 0.9, size: 5, sizeEnd: 0, gravity: 90 });
    }
    this.tug = Math.max(0, this.tug - dt * 3);
    this.shake = Math.max(0, this.shake - dt * 14);
    this.feather = Math.max(0, this.feather - dt * 2);
    if (this.pull >= 1) { AudioSys.sfx('victory'); this.finish({ win: true }); }
    else if (this.pull <= 0) { this.pull = 0.2; AudioSys.sfx('error'); Juice.flash('#ef6a5e', 0.3, 4); }
  }
  draw() {
    if (this.o.paint) this.o.paint(this.t, this);
    const cy = H / 2 + 20, sh = Math.sin(Time.t * 40) * this.shake;
    const eggX = W * 0.30 + this.pull * W * 0.40;
    // the two of them leaning against each other, the egg between
    const lean = (this.pull - 0.5) * 34;
    Gfx.shadow(W * 0.26 + lean * 0.4, cy + 44, 90, 0.3);
    Gfx.shadow(W * 0.74 + lean * 0.4, cy + 44, 80, 0.3);
    Gfx.sprite('bronk_eat', W * 0.26 + lean * 0.5 + sh, cy + 46, { anchor: 'bc', scale: 2.2, frame: this.tug > 0.4 ? 1 : 0 });
    Gfx.sprite('dodo_walk', W * 0.74 + lean * 0.5 - sh, cy + 46, { anchor: 'bc', scale: 2.4, flip: true, frame: Math.floor(this.t * 12) % 4 });
    // strain lines snapping between them
    const ctx = Gfx.ctx;
    ctx.strokeStyle = `rgba(255,255,255,${0.10 + this.tug * 0.35})`; ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(W * 0.26 + 46, cy + i * 9 + sh);
      ctx.lineTo(W * 0.74 - 46, cy + i * 9 - sh);
      ctx.stroke();
    }
    const pop = 1 + this.tug * 0.24;
    Gfx.glow(eggX, cy, 64, '#fffaea', 0.18 + this.tug * 0.25);
    Gfx.sprite('prop_egg', eggX + sh, cy, { anchor: 'c', scale: 2.3 * pop, rot: Math.sin(this.t * 7) * 0.12 });
    if (this.feather > 0.02) for (let i = 0; i < 2; i++)
      Particles.spawn(eggX + rnd(-40, 40), cy + rnd(-30, 30), { n: 1, color: ['#fffaea', '#d6cfe0'], speed: 40, life: 1.4, size: 4, sizeEnd: 0, gravity: -14 });
    // the only readout is the egg's own progress, drawn as a bone bar
    Gfx.rectA(W * 0.28, H - 74, W * 0.44, 16, '#120c16', 0.7);
    Gfx.rect(W * 0.28 + 3, H - 71, (W * 0.44 - 6) * this.pull, 10, this.pull > 0.66 ? '#a8e878' : this.pull > 0.33 ? '#ffe08a' : '#ef6a5e');
    if (this.intro > 0 || this.t < 2.4) {
      const a = this.t < 2.4 ? 1 : 0;
      Gfx.ctx.globalAlpha = 0.55 + Math.sin(Time.t * 8) * 0.35;
      Gfx.sprite('icon_note', W / 2, H - 120, { anchor: 'c', scale: 2 + Math.sin(Time.t * 8) * 0.3 });
      Gfx.ctx.globalAlpha = 1;
    }
  }
}

// ------------------------------------------------------------------- KICK ---
// Blaze is the stove. Boot him on the beat and he breathes; boot him too often
// and breakfast is charcoal.
class KickGame extends MiniGame {
  constructor(o) {
    super(o);
    this.heat = 0.1; this.cook = 0; this.burn = 0; this.time = 18; this.kickT = 0; this.angry = 0; this.flameT = 0;
    this.o.hint = Input.touch ? 'TAP TO BOOT THE RAPTOR - KEEP THE HEAT IN THE GREEN' : 'SPACE TO BOOT THE RAPTOR - KEEP THE HEAT IN THE GREEN';
  }
  kick() {
    const good = this.onBeat(0.22);
    this.heat = clamp(this.heat + (good ? 0.20 : 0.12), 0, 1);
    this.kickT = 0.28; this.angry = 1;
    AudioSys.sfx(good ? 'fire_whoosh' : 'thud');
    Juice.shake(good ? 6 : 3, 0.14);
    Particles.fire(W * 0.62, H * 0.56, good ? 14 : 6);
    if (good) Popups.add(W * 0.62, H * 0.40, 'FWOOMPH!', '#ffa832', { world: false, scale: 1.4 });
  }
  step(dt) {
    this.time -= dt;
    if (Input.pressed('Space', 'KeyE', 'Enter') || Input.clicks.length) this.kick();
    this.heat = clamp(this.heat - dt * 0.13, 0, 1);
    if (this.heat > 0.45 && this.heat < 0.82) { this.cook = clamp(this.cook + dt * 0.19, 0, 1); this.flameT += dt; }
    else if (this.heat >= 0.82) { this.burn = clamp(this.burn + dt * 0.22, 0, 1); if (chance(dt * 3)) Popups.add(W * 0.4, H * 0.3, 'BURNING!', '#ef6a5e', { world: false, scale: 1.3 }); }
    this.kickT = Math.max(0, this.kickT - dt);
    this.angry = Math.max(0, this.angry - dt * 1.4);
    if (this.cook >= 1 || this.time <= 0) this.finish({ win: this.cook >= 0.75 && this.burn < 0.6, cook: this.cook, burn: this.burn });
  }
  draw() {
    if (this.o.paint) this.o.paint(this.t, this);
    const gy = H * 0.62;
    // Blaze, chained under the pan, thoroughly done with this
    Gfx.shadow(W * 0.62, gy + 26, 120, 0.3);
    Gfx.sprite('blaze_idle', W * 0.62, gy + 26, { anchor: 'bc', scale: 2.2, frame: Math.floor(this.t * 8) % 4, flip: true });
    if (this.angry > 0.3) Gfx.sprite('fx_anger', W * 0.62 + 44, gy - 96, { anchor: 'c', scale: 1.5, frame: Math.floor(this.t * 12) % 2 });
    if (this.heat > 0.2) { for (let i = 0; i < 2; i++) if (chance(this.heat)) Particles.fire(W * 0.62 + rnd(-30, 30) - 60, gy - 6, 1); Gfx.glow(W * 0.56, gy - 20, 150 * this.heat, '#ff9a20', 0.25 * this.heat); }
    // Bronk, mid-boot
    Gfx.shadow(W * 0.36, gy + 26, 90, 0.3);
    Gfx.sprite(this.kickT > 0 ? 'bronk_walk' : 'bronk_idle', W * 0.36 + (this.kickT > 0 ? 22 : 0), gy + 26, { anchor: 'bc', scale: 2.2, frame: this.kickT > 0 ? 2 : 0 });
    // the pan and the egg, browning as it goes
    Gfx.sprite('prop_pot', W * 0.50, gy - 30, { anchor: 'bc', scale: 1.4 });
    Gfx.sprite('prop_egg', W * 0.50, gy - 54, { anchor: 'c', scale: 1.1, tint: this.burn > 0.4 ? '#3a2415' : this.cook > 0.5 ? '#d8a86b' : null });
    // heat gauge with the green band marked
    const bx = W / 2 - 200, by = H - 96;
    Gfx.rectA(bx - 6, by - 6, 412, 40, '#120c16', 0.7);
    Gfx.bands(bx, by, 400, 26, ['#3b3048']);
    Gfx.rectA(bx + 400 * 0.45, by, 400 * 0.37, 26, '#27632f', 0.85);
    Gfx.rect(bx, by, 400 * this.heat, 26, this.heat >= 0.82 ? '#ef6a5e' : this.heat > 0.45 ? '#6cc95c' : '#ffa832');
    Gfx.outlineRect(bx, by, 400, 26, '#a79bb4', 1);
    Gfx.text('HEAT', bx, by - 20, { color: '#ffe98a', scale: 1.1 });
    Gfx.text('COOKED', bx + 250, by - 20, { color: '#a8e878', scale: 1.1 });
    Gfx.bar(bx + 250, by - 4, 140, 12, this.cook, '#a8e878', { bg: '#14331e' });
    this.drawFrame('BREAKFAST', `${Math.ceil(this.time)}s`, 1 - this.time / 18);
  }
}
