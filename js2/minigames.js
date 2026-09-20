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
  // Draw a World painter at the one true pixel scale, with the camera on
  // (camX, camY). Every stage in the game goes through this or through a
  // Camera at zoom VIEW, so a cut never changes how big a pixel is.
  stage(camX, camY, fn) {
    const ctx = Gfx.ctx;
    ctx.save();
    ctx.scale(VIEW, VIEW);
    ctx.translate(-Math.round(camX), -Math.round(camY));
    fn(camX, camY);
    ctx.restore();
  }
  beat() { return AudioSys.song ? (AudioSys.now() - AudioSys.songStart) / AudioSys.beatDur() : this.t * 2; }
  onBeat(tol = 0.18) { const b = this.beat(); return Math.abs(b - Math.round(b)) < tol; }
}

// --------------------------------------------------------------- SIDESCROLL -
// How the man moves. One set of numbers for every walking stage in the game,
// so the dash to breakfast and the run from a tyrannosaur feel like the same
// pair of legs. Rising gravity is lighter than falling gravity and letting go
// of the button cuts the jump: that is the whole trick to a jump feeling good.
const PLAT = {
  accel: 2000, airAccel: 1100, friction: 2600, airDrag: 320,
  jump: 490, gravUp: 1400, gravDown: 2350, cut: 0.34, termVel: 940,   // apex ~86px held
  coyote: 0.11,          // still jumpable this long after walking off an edge
  buffer: 0.14,          // a press this far before landing still counts
};

// A small 2D platformer stage. The caller supplies a painter that draws the
// world for a given camera x, plus whatever ledges, obstacles, pickups and
// pursuers belong in it, so the same legs carry a cave, a quarry and a canyon.
class SideScroll extends MiniGame {
  constructor(o) {
    super(o);
    this.x = o.startX || 0; this.vx = 0;
    this.goal = o.goal ?? 1700;
    this.ground = o.ground ?? GY;
    this.camX = this.x - VW * 0.34;
    this.camY = this.ground - VH * 0.74;
    this.runSpeed = o.speed ?? 250;
    this.auto = o.auto ?? 0;                       // constant forward push
    this.hero = new Actor({ base: o.base || 'bronk', x: 0, y: this.ground, scale: o.scale || 1 });
    this.moveClip = o.moveClip || 'walk'; this.idleClip = o.idleClip || 'idle';
    this.pursuer = o.pursuer ? Object.assign({ x: this.x - 420, t: 0, scale: 1, speed: 215, clip: 'walk' }, o.pursuer) : null;
    this.ahead = o.ahead ? Object.assign({ x: this.x + 700, t: 0, scale: 1, speed: 235, clip: 'walk' }, o.ahead) : null;
    this.pickups = (o.pickups || []).map(p => Object.assign({ got: false, t: rnd(0, 6) }, p));
    this.props = o.props || [];
    this.caught = 0; this.got = 0; this.bump = 0; this.puff = 0;
    // jumping, standing on things, and the things you trip over
    this.canJump = o.jump !== false;
    this.z = 0; this.vz = 0; this.airT = 0; this.stumble = 0;
    this.onGround = true; this.floorZ = 0; this.coyote = PLAT.coyote; this.buffer = 0;
    this.touchHold = 0;
    this.platforms = (o.platforms || []).map(p => Object.assign({ h: 60, w: 120 }, p));
    this.obstacles = (o.obstacles || []).map(b => Object.assign({ hit: false }, b));
    this.lunge = 0;                                // how hard the pursuer is snapping
    this.intro = o.intro ?? 1.2;
    this.o.hint = o.hint || (Input.touch
      ? 'HOLD LOW TO WALK  -  TAP HIGH TO JUMP'
      : 'A / D TO WALK  -  SPACE TO JUMP  -  HOLD IT TO JUMP HIGHER');
  }
  step(dt) {
    // ----------------------------------------------------------- the input
    let dir = 0, jumpPress = false;
    if (Input.isDown('KeyD', 'ArrowRight')) dir = 1;
    if (Input.isDown('KeyA', 'ArrowLeft')) dir = -1;
    if (Input.pressed('Space', 'KeyW', 'ArrowUp')) jumpPress = true;
    let jumpHeld = Input.isDown('Space', 'KeyW', 'ArrowUp');
    if (Input.touch) {
      // the bottom of the screen steers, the top of it jumps. no overlap.
      for (const p of Input.touches.values()) if (p.y > H * 0.42) dir = p.x > W * 0.5 ? 1 : -1;
      for (const c of Input.clicks) if (c.y <= H * 0.42) jumpPress = true;
    } else if (Input.down && Input.my > 120) dir = Input.mx > W * 0.5 ? 1 : -1;
    if (jumpPress && Input.touch) this.touchHold = 0.17;      // a tap still gets a full jump
    this.touchHold = Math.max(0, this.touchHold - dt);
    jumpHeld = jumpHeld || this.touchHold > 0;

    // --------------------------------------------------------- left / right
    const cap = this.runSpeed;
    const accel = (this.onGround ? PLAT.accel : PLAT.airAccel) * (this.o.accelMul || 1);
    if (dir) this.vx = clamp(this.vx + dir * accel * dt, -cap, cap);
    else {
      const f = (this.onGround ? PLAT.friction : PLAT.airDrag) * dt;
      this.vx -= Math.sign(this.vx) * Math.min(Math.abs(this.vx), f);
    }
    if (this.stumble > 0) { this.stumble -= dt; this.vx *= 0.35; }
    this.x += (this.vx + this.auto) * dt;
    if (this.x < 0) { this.x = 0; this.vx = 0; }

    // ------------------------------------------------- gravity and the floor
    const prevZ = this.z;
    this.vz -= (this.vz > 0 && jumpHeld ? PLAT.gravUp : PLAT.gravDown) * dt;
    this.vz = Math.max(this.vz, -PLAT.termVel);
    this.z += this.vz * dt;
    let floor = 0;
    if (this.vz <= 0) for (const p of this.platforms) {          // ledges are one-way
      if (this.x < p.x - 5 || this.x > p.x + p.w + 5) continue;
      if (prevZ >= p.h - 2 && this.z <= p.h && p.h > floor) floor = p.h;
    }
    if (this.z <= floor) {
      if (!this.onGround && this.vz < -220) {
        Juice.shake(4, 0.12); AudioSys.sfx('thud', { vol: 0.4 });
        Particles.dust(this.sx(this.x), this.sy(this.ground - floor), 5);
        this.hero.squash(Math.min(0.28, -this.vz / 1900));
      }
      this.z = floor; this.vz = 0; this.onGround = true; this.coyote = PLAT.coyote;
    } else { this.onGround = false; this.coyote = Math.max(0, this.coyote - dt); }
    this.floorZ = floor;
    this.airT = this.onGround ? 0 : this.airT + dt;

    // ------------------------------------------------------------- the jump
    this.buffer = jumpPress ? PLAT.buffer : Math.max(0, this.buffer - dt);
    if (this.canJump && this.buffer > 0 && this.coyote > 0) {
      this.buffer = 0; this.coyote = 0; this.onGround = false;
      this.vz = PLAT.jump;
      this.hero.stretch(0.22);
      AudioSys.sfx('whoosh', { vol: 0.5 });
      Particles.dust(this.sx(this.x), this.sy(this.ground - this.floorZ), 4);
    }
    // letting go mid-rise cuts it short, which is where the control comes from
    if (!jumpHeld && this.vz > PLAT.jump * PLAT.cut) this.vz = PLAT.jump * PLAT.cut;

    // ------------------------------------------------------ things in the way
    for (const b of this.obstacles) {
      if (b.hit || Math.abs(b.x - this.x) > (b.w || 34) * 0.5 + 12) continue;
      if (this.z > (b.h || 38) * 0.6) continue;
      b.hit = true; this.stumble = 0.55; this.bump = 1;
      Juice.stop(0.08); Juice.shake(10, 0.3); Juice.flash('#ef6a5e', 0.22, 5);
      Juice.pow(this.sx(b.x), this.sy(this.ground - 20), { r: 44, spikes: 9, col: '#ef6a5e' });
      AudioSys.sfx('hurt');
    }
    // --- animation and dust
    const moving = Math.abs(this.vx) > 24;
    if (!this.onGround) {
      // no jump sprite, so the pose is made out of squash: long going up,
      // gathered coming down, and the legs stop cycling either way
      this.hero.play(this.idleClip);
      this.hero.sx = damp(this.hero.sx, this.vz > 0 ? 0.86 : 1.1, 9, dt);
      this.hero.sy = damp(this.hero.sy, this.vz > 0 ? 1.16 : 0.92, 9, dt);
    } else this.hero.play(moving ? this.moveClip : this.idleClip, { fps: moving ? 8 + Math.abs(this.vx) / 26 : undefined });
    this.hero.facing = this.vx < -14 ? -1 : 1;
    if (moving && this.onGround && !this.o.vehicle) { this.puff -= dt; if (this.puff <= 0) { this.puff = 0.07; Particles.dust(this.sx(this.x - this.hero.facing * 18), this.sy(this.ground), 1); AudioSys.sfx('step_grass', { vol: 0.35 }); } }
    else if (moving && this.o.vehicle) { this.puff -= dt; if (this.puff <= 0) { this.puff = 0.22; AudioSys.sfx('car_roll', { vol: 0.5, len: 0.3 }); } }
    this.hero.update(dt);
    // --- the camera leads a little in the direction of travel
    Juice.lines((Math.abs(this.vx) - 90) / 240);
    this.camX = damp(this.camX, this.x - VW * 0.34 + clamp(this.vx, -140, 140) * 0.45, 5, dt);
    this.camY = damp(this.camY, this.ground - VH * 0.74 - Math.abs(this.vx) * 0.02, 4, dt);
    // --- someone chasing, someone running away
    if (this.pursuer) {
      const p = this.pursuer; p.t += dt;
      p.x += (p.speed + (this.o.pursuerRamp || 0) * (this.x / this.goal)) * dt;
      p.x = Math.max(p.x, this.x - (this.o.leash ?? 900));
      // how close it is to having you, 0..1 - everything scary keys off this
      this.lunge = clamp(1 - (this.x - p.x) / 300, 0, 1);
      if (p.x > this.x - 46) {
        this.caught += dt; this.bump = 1;
        Juice.shake(7, 0.14);
        if (chance(dt * 4)) { AudioSys.sfx('chomp'); Juice.flash('#7d1d2b', 0.3, 5); }
      } else this.caught = Math.max(0, this.caught - dt * 0.5);
      if (this.lunge > 0.55) {
        Juice.shake(this.lunge * 5, 0.1);
        if (chance(dt * 1.3)) AudioSys.sfx('roar', { pitch: 44, vol: 0.9, len: 1.1 });
        if (chance(dt * 22)) Particles.spawn(this.sx(p.x + 40), this.sy(this.ground - 60) + rnd(-20, 20),
          { n: 1, color: ['#e8dfc6', '#d6cfe0'], speed: 60, gravity: 200, life: 0.7, size: 3, sizeEnd: 0 });
      }
    }
    if (this.ahead) { const a = this.ahead; a.t += dt; a.x += a.speed * dt; }
    // --- pickups
    for (const k of this.pickups) {
      const ky = k.y ?? this.ground - 34;                  // some of them are up on a ledge
      if (k.got || Math.abs(k.x - this.x) > 34) continue;
      if (Math.abs((this.ground - this.z - 34) - ky) > 44) continue;
      k.got = true; this.got++;
      AudioSys.sfx('pickup'); Particles.sparkle(this.sx(k.x), this.sy(ky), 10);
      Popups.add(this.sx(k.x), this.sy(ky - 30), k.label || '+1', '#ffe98a', { world: false, scale: 1.2 });
    }
    this.bump = Math.max(0, this.bump - dt * 2);
    if (this.caught > (this.o.catchTime ?? 2.2)) this.finish({ win: false, caught: true, got: this.got, x: this.x });
    else if (this.x >= this.goal) this.finish({ win: true, got: this.got, x: this.x });
  }
  // A ledge: a slab of rock with a lit top edge and a little scrub on it, so
  // it reads as something you can stand on from across the screen.
  ledge(p) {
    const y = this.ground - p.h;
    Gfx.shadow(p.x + p.w / 2, this.ground + 2, p.w * 0.8, 0.26);
    Gfx.round(p.x, y, p.w, 26, 7, '#3b3048');
    Gfx.round(p.x + 2, y + 2, p.w - 4, 20, 6, p.warm ? '#5c3a20' : '#574a66');
    Gfx.round(p.x + 3, y + 2, p.w - 6, 6, 3, p.warm ? '#85562f' : '#7a6d8a');
    Gfx.round(p.x + 5, y + 1, p.w * 0.4, 3, 2, p.warm ? '#b07a45' : '#9391a6');
    for (let i = 0; i < Math.max(1, (p.w / 26) | 0); i++)                     // the underside
      Gfx.rectA(p.x + 8 + i * 26, y + 20, 12, 4, '#120c16', 0.35);
    // a couple of legs holding it up, so it is not floating
    for (const lx of [p.x + p.w * 0.22, p.x + p.w * 0.74]) {
      Gfx.round(lx - 7, y + 22, 14, p.h - 20, 4, '#3b3048');
      Gfx.round(lx - 5, y + 22, 5, p.h - 22, 2, '#574a66');
    }
    if (!p.bare) for (let i = 0; i < 3; i++)
      Gfx.sprite(i % 2 ? 'prop_fern' : 'prop_mushroom', p.x + 14 + i * (p.w - 28) / 2, y + 2, { anchor: 'bc', scale: 0.55 });
  }

  // world -> screen, for the handful of things (particles, popups) that live
  // in screen space because the scene draws them outside this stage
  sx(wx) { return (wx - this.camX) * VIEW; }
  sy(wy) { return (wy - this.camY) * VIEW; }
  draw() {
    Gfx.clear('#120c16');
    this.stage(this.camX, this.camY, () => {
      if (this.o.paint) this.o.paint(this.camX, this.t, this);
      const list = [];
      for (const p of this.platforms) list.push({ y: this.ground - p.h - 2, f: () => this.ledge(p) });
      for (const pr of this.props) list.push({ y: pr.y ?? this.ground, f: () => Gfx.sprite(pr.spr, pr.x, pr.y ?? this.ground, { anchor: 'bc', scale: pr.scale || 1, flip: pr.flip, frame: Math.floor(this.t * 6 + (pr.x | 0)) }) });
      for (const k of this.pickups) if (!k.got) list.push({ y: this.ground - 1, f: () => {
        const ky = (k.y ?? this.ground - 34) + Math.sin(this.t * 6 + k.t) * 5;
        Gfx.glow(k.x, ky, 34, '#ffe98a', 0.22 + Math.sin(this.t * 4 + k.t) * 0.06);
        Gfx.sprite(k.spr || 'icon_coin', k.x, ky, { anchor: 'c', scale: k.scale || 1 });
      } });
      if (this.ahead) list.push({ y: this.ground, f: () => {
        const a = this.ahead, bob = Math.abs(Math.sin(a.t * 12)) * 4;
        Gfx.shadow(a.x, this.ground, 34 * a.scale, 0.3);
        Gfx.sprite(a.spr, a.x, this.ground - bob, { anchor: 'bc', scale: a.scale, frame: Math.floor(a.t * 12), flip: a.flip });
        if (a.carry) Gfx.sprite(a.carry, a.x + 8 * (a.flip ? -1 : 1), this.ground - 34 * a.scale - bob, { anchor: 'c', scale: 0.7, frame: Math.floor(a.t * 6) });
      } });
      if (this.pursuer) list.push({ y: this.ground + 1, f: () => {
        const p = this.pursuer, bob = Math.abs(Math.sin(p.t * 9)) * 5;
        const snap = this.lunge > 0.5 ? Math.max(0, Math.sin(p.t * 11)) * this.lunge : 0;
        Gfx.shadow(p.x, this.ground, 44 * p.scale, 0.34);
        if (this.lunge > 0.3) Gfx.glow(p.x + 30, this.ground - 60, 90 * this.lunge, '#c2333c', 0.3 * this.lunge);
        Gfx.sprite(p.spr, p.x + snap * 26, this.ground - bob, {
          anchor: 'bc', scale: p.scale * (1 + snap * 0.06), frame: Math.floor(p.t * 10), flip: p.flip,
        });
        if (snap > 0.4 && p.roarSpr) Gfx.sprite(p.roarSpr, p.x + snap * 30, this.ground - bob,
          { anchor: 'bc', scale: p.scale * (1 + snap * 0.08), frame: Math.floor(p.t * 8), flip: p.flip });
      } });
      list.push({ y: this.ground + 2, f: () => {
        if (this.o.vehicle) {
          const bounce = Math.sin(this.t * 11 + this.x * 0.03) * 3 * clamp(Math.abs(this.vx) / 160, 0.25, 1) - this.z;
          const sc = this.o.vehicleScale || 1;
          Gfx.shadow(this.x, this.ground + 2, 88 * sc * clamp(1 - this.z / 200, 0.5, 1), 0.32);
          Gfx.sprite(this.o.vehicle, this.x, this.ground + bounce * 0.4,
            { anchor: 'bc', scale: sc, frame: Math.floor(Math.abs(this.x) / 18), flip: this.hero.facing < 0 });
          Gfx.sprite('bronk_drive', this.x - 6 * sc * (this.hero.facing < 0 ? -1 : 1), this.ground - 22 * sc + bounce,
            { anchor: 'bc', scale: sc * 0.78, frame: Math.abs(this.vx) > 180 ? 1 : 0, flip: this.hero.facing < 0 });
          if (Math.abs(this.vx) > 60 && chance(Time.dt * 26)) Particles.dust(this.sx(this.x - 40 * sc * (this.hero.facing || 1)), this.sy(this.ground), 1);
        } else {
          this.hero.x = this.x; this.hero.y = this.ground; this.hero.z = this.z; this.hero.draw();
        }
      } });
      list.sort((a, b) => a.y - b.y);
      for (const it of list) it.f();
      for (const b of this.obstacles) {
        if (b.x < this.camX - 60 || b.x > this.camX + VW + 60) continue;
        Gfx.shadow(b.x, this.ground + 2, (b.w || 34) + 14, 0.3);
        Gfx.sprite(b.spr || 'prop_rock', b.x, this.ground + 2, { anchor: 'bc', scale: b.scale || 1, alpha: b.hit ? 0.5 : 1 });
        if (!b.hit) {
          const k = 0.5 + Math.sin(Time.t * 7 + b.x) * 0.5;
          Gfx.rectA(b.x - 12, this.ground - (b.h || 38) - 16, 24, 4, '#ffe98a', 0.25 + k * 0.35);
        }
      }
      if (this.o.goalSpr) Gfx.sprite(this.o.goalSpr, this.goal, this.ground, { anchor: 'bc', scale: this.o.goalScale || 1 });
    });
    this.drawHud();
  }
  drawHud() {
    if (this.o.bare) { if (this.intro > 0) this.drawFrame('', '', undefined); return; }
    if (this.pursuer) {
      const px = this.sx(this.pursuer.x);
      const danger = clamp(1 - (this.pursuer.x - (this.x - 46)) / 340, 0, 1);
      if (danger > 0.02) {
        // a closing vignette rather than a flat red wash: it feels like teeth
        const ctx = Gfx.ctx;
        const g = ctx.createRadialGradient(W / 2, H / 2, H * (0.62 - danger * 0.34), W / 2, H / 2, H * 0.95);
        g.addColorStop(0, 'rgba(194,51,60,0)');
        g.addColorStop(1, `rgba(124,20,28,${(0.45 + Math.sin(Time.t * 14) * 0.1) * danger})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        Juice.lines(danger * 0.8);
        const wob = Math.sin(Time.t * 21) * danger * 4;
        Gfx.text('RUN!', W / 2 + wob, 84, { color: '#ef6a5e', align: 'center', scale: 2.4 + danger * 1.6, outline: true, outlineWidth: 2 });
        for (let i = 0; i < 5; i++) {                    // claw marks raking the frame
          const a = 0.18 + i * 0.03;
          Gfx.rectA(W - 70 + i * 13, 0, 5, H * (0.3 + (i % 2) * 0.2), '#7d1d2b', danger * a);
        }
      }
      // when it is behind the camera, say so - an unseen threat is just confusing
      if (px < 40) {
        const k = 0.6 + Math.sin(Time.t * 9) * 0.4;
        Gfx.rectA(0, H * 0.42, 52, 150, '#c2333c', 0.18 + danger * 0.2);
        Gfx.text('<', 22, H * 0.55, { color: k > 0.7 ? '#ffffff' : '#ef6a5e', align: 'center', scale: 3.4, outline: true, outlineWidth: 2 });
        Gfx.text(`${Math.round((this.x - this.pursuer.x) / 10)}m`, 22, H * 0.66, { color: '#ef6a5e', align: 'center', scale: 1.1, outline: true });
      }
    }
    this.drawFrame(this.o.title || '', this.o.sub || '', clamp(this.x / this.goal, 0, 1));
  }
}

// ---------------------------------------------------------------- DRIVECARD -
// The commute, as a loading screen. Nobody wanted to play the drive to work,
// so it is a little card instead: the car trundles along a looping road while
// the dots fill, and then you are there. It has two moods. On the way out the
// sky is blue and he is whistling. On the way home it is not.
class DriveCard extends MiniGame {
  constructor(o = {}) {
    super(o);
    this.dur = o.dur ?? 4.2;
    this.scared = !!o.scared;
    this.intro = 0;                                    // no hint card: it is not a game
    this.label = o.label || (this.scared ? 'DRIVING HOME' : 'DRIVING TO WORK');
    this.sub = o.sub || (this.scared ? 'faster. faster. faster.' : 'same as every day');
    this.hop = 0;
  }
  step(dt) {
    this.hop += dt * (this.scared ? 15 : 9);
    if (this.scared) {
      Juice.shake(2.2, 0.1);
      if (chance(dt * 9)) Juice.lines(0.5);
    }
    if (this.t > this.dur) this.finish({ win: true });
  }
  draw() {
    const t = this.t, sc = this.scared;
    const ctx = Gfx.ctx;
    const speed = sc ? 460 : 190;
    const road = H * 0.72;
    // ---------------------------------------------------------------- sky
    Gfx.bands(0, 0, W, road + 4, sc
      ? ['#3f0e18', '#7d1d2b', '#a03a68', '#e06a1b', '#ffa832']
      : ['#1d3d72', '#3570c0', '#6aa9ee', '#a8d8ff', '#ffe08a']);
    // sun, or whatever that is today
    const sunX = W * 0.76, sunY = H * 0.20;
    Gfx.glow(sunX, sunY, 260, sc ? '#e06a1b' : '#ffe98a', sc ? 0.4 : 0.3);
    Gfx.circle(sunX, sunY, 28, sc ? '#ffa832' : '#ffe98a');
    // clouds, drifting the other way
    for (let i = 0; i < 5; i++) {
      const cx = ((i * 260 - t * (sc ? 150 : 42)) % (W + 320) + W + 320) % (W + 320) - 160;
      const cy = 46 + (i % 3) * 44;
      const s2 = 0.7 + (i % 2) * 0.4;
      Gfx.ctx.globalAlpha = sc ? 0.35 : 0.8;
      for (const [ox, oy, rx, ry] of [[0, 0, 54, 18], [36, -12, 42, 19], [-34, -5, 35, 15]])
        Gfx.round(cx + ox * s2 - rx * s2, cy + oy * s2 - ry * s2, rx * 2 * s2, ry * 2 * s2, ry * s2, sc ? '#a03a68' : '#ffffff');
      Gfx.ctx.globalAlpha = 1;
    }
    // ------------------------------------------------------------- the hills
    const ridge = (depth, base, amp, col, edge) => {
      const off = t * speed * depth;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, road + 6);
      for (let x = 0; x <= W; x += 10) {
        const k = (x + off) * 0.0042;
        ctx.lineTo(x, base + Math.sin(k) * amp + Math.sin(k * 2.7 + 1) * amp * 0.45);
      }
      ctx.lineTo(W, road + 6); ctx.fill();
      for (let x = 0; x < W; x += 6) {
        const k = (x + off) * 0.0042;
        Gfx.rect(x, base + Math.sin(k) * amp + Math.sin(k * 2.7 + 1) * amp * 0.45, 6, 5, edge);
      }
    };
    ridge(0.18, road - 132, 34, sc ? '#5c1f3d' : '#7a6d8a', sc ? '#a03a68' : '#9391a6');
    ridge(0.42, road - 74, 22, sc ? '#3f0e18' : '#27632f', sc ? '#7d1d2b' : '#3f9a45');
    // trees whipping past
    for (let i = 0; i < 9; i++) {
      const span = W + 300;
      const x = ((i * span / 9 - t * speed * 0.72) % span + span) % span - 150;
      Gfx.sprite(i % 3 ? 'prop_tree' : 'prop_palm', x, road - 4,
        { anchor: 'bc', scale: 0.8, tint: sc ? '#3f0e18' : null, tintAmount: sc ? 0.45 : 0 });
    }
    // ------------------------------------------------------------- the road
    Gfx.rect(0, road, W, H - road, sc ? '#241109' : '#5c3a20');
    Gfx.rect(0, road, W, 5, sc ? '#5c1f3d' : '#85562f');
    for (let i = 0; i < 26; i++) {                       // ruts, rolling past
      const span = W + 120;
      const x = ((i * span / 26 - t * speed) % span + span) % span - 60;
      const y = road + 18 + (i % 5) * 22;
      Gfx.rectA(x, y, 40 + (i % 3) * 22, 4, sc ? '#3f0e18' : '#3a2415', 0.6);
      if (i % 4 === 0) Gfx.rectA(x + 10, y + 7, 10, 3, sc ? '#7d1d2b' : '#b07a45', 0.5);
    }
    // ---------------------------------------------------------- what is behind
    if (sc) {
      // it is not chasing. it is just there, every time he looks back.
      const bx = W * 0.14 + Math.sin(t * 1.6) * 16;
      Gfx.sprite('trex_walk', bx, road + 10, { anchor: 'bc', scale: 1.5, frame: Math.floor(t * 9),
        tint: '#3f0e18', tintAmount: 0.82, alpha: 0.75 });
      for (let i = 0; i < 3; i++) Particles.dust(bx + rnd(-30, 30), road + 8, 1);
    }
    // ------------------------------------------------------------- the car
    const carX = W * 0.52, bounce = Math.abs(Math.sin(this.hop)) * (sc ? 9 : 5);
    Gfx.shadow(carX, road + 12, 130, 0.3);
    for (let i = 0; i < (sc ? 4 : 1); i++)
      if (chance(0.7)) Particles.dust(carX - 74 + rnd(-14, 14), road + 8, 1);
    Gfx.sprite('car', carX, road + 10 - bounce * 0.4, { anchor: 'bc', frame: Math.floor(t * 18), rot: sc ? -0.05 : 0 });
    Gfx.sprite(sc ? 'bronk_shock' : 'bronk_drive', carX - 8, road - 12 - bounce,
      { anchor: 'bc', scale: 0.85, frame: Math.floor(t * (sc ? 12 : 6)) });
    if (!sc && chance(0.06))                              // a whistled note, now and then
      Popups.add(carX + 26, road - 76, '~', '#ffe98a', { world: false, scale: 1.8, life: 1.4, vy: -34, vx: 26 });
    if (sc) {
      Gfx.ctx.globalAlpha = 0.5;
      for (let i = 0; i < 7; i++) {                       // speed lines
        const y = 80 + ((i * 97 + t * 900) % (H - 160));
        Gfx.rect(((i * 211 - t * 1100) % (W + 260) + W + 260) % (W + 260) - 130, y, 120, 3, '#ffe98a');
      }
      Gfx.ctx.globalAlpha = 1;
    }
    // ------------------------------------------------------------ the caption
    const k = clamp(this.t / this.dur, 0, 1);
    Gfx.rectA(0, H - 86, W, 86, '#120c16', 0.72);
    Gfx.rect(0, H - 88, W, 3, sc ? '#ef6a5e' : '#ffe98a');
    const dots = '.'.repeat(1 + (Math.floor(t * 3) % 3));
    Gfx.text(this.label + dots, W / 2, H - 72, {
      color: sc ? '#ef6a5e' : '#ffe98a', align: 'center', scale: 2.2, outline: true, outlineWidth: 2,
    });
    Gfx.text(this.sub, W / 2, H - 42, { color: '#d6cfe0', align: 'center', scale: 1.1 });
    Gfx.bar(W / 2 - 200, H - 22, 400, 8, k, sc ? '#ef6a5e' : '#6cc95c');
  }
}

// ----------------------------------------------------------------- MINEGAME -
// The shift. Three crystals out of the face and into the box, and the foreman
// gives you one shell for the lot. Hitting rock is a timing problem: a marker
// sweeps the swing bar, and the middle of it is where the pick bites.
class MineGame extends MiniGame {
  constructor(o = {}) {
    super(o);
    this.need = o.need ?? 3;
    this.mined = 0;
    this.crack = 0;                       // how far into the current crystal, 0..1
    this.swing = -1;                      // -1 idle, otherwise 0..1 through the swing
    this.mark = 0; this.markDir = 1;
    this.shake = 0; this.flyers = [];
    this.camX = QUARRY.face - 250; this.camY = GY - VH * 0.82;
    this.hero = new Actor({ base: 'bronk', x: 0, y: GY, scale: 1 });
    this.heroX = QUARRY.gems[0].x - 80;
    this.o.hint = o.hint || (Input.touch ? 'TAP WHEN THE MARKER IS IN THE GREEN' : 'SPACE WHEN THE MARKER IS IN THE GREEN');
  }
  get gem() { return QUARRY.gems[Math.min(this.mined, QUARRY.gems.length - 1)]; }
  get band() { return 0.30 - this.mined * 0.05; }      // the green gets meaner
  step(dt) {
    // the marker sweeps, faster with every crystal
    if (this.swing < 0) {
      this.mark += this.markDir * dt * (1.25 + this.mined * 0.28);
      if (this.mark > 1) { this.mark = 1; this.markDir = -1; }
      if (this.mark < 0) { this.mark = 0; this.markDir = 1; }
    }
    // walk to the crystal you are working on
    this.heroX = damp(this.heroX, this.gem.x - 78, 4, dt);
    this.hero.x = this.heroX; this.hero.y = GY;
    this.hero.play(this.swing >= 0 ? 'idle' : 'idle');
    this.hero.update(dt);
    this.shake = Math.max(0, this.shake - dt * 3);
    for (const f of this.flyers) { f.t += dt * 1.5; }
    this.flyers = this.flyers.filter(f => f.t < 1);

    let hit = Input.pressed('Space', 'Enter', 'KeyE') || Input.clicks.length > 0;
    if (this.swing >= 0) {
      this.swing += dt * 4.4;
      if (this.swing > 0.44 && !this.struck) { this.struck = true; this.strike(); }
      if (this.swing >= 1) { this.swing = -1; this.struck = false; }
      hit = false;
    }
    if (hit) { this.swing = 0; this.struck = false; AudioSys.sfx('whoosh', { vol: 0.4 }); }
    if (this.mined >= this.need && !this.done) this.finish({ win: true, mined: this.mined });
  }
  strike() {
    const good = Math.abs(this.mark - 0.5) < this.band / 2;
    const g = this.gem;
    this.crack += good ? 0.42 : 0.17;
    this.shake = good ? 1 : 0.5;
    Juice.shake(good ? 9 : 4, 0.16);
    AudioSys.sfx(good ? 'bighit' : 'thud', { vol: good ? 0.9 : 0.5 });
    const sx = (g.x - this.camX) * VIEW, sy = (g.y - this.camY) * VIEW;
    Particles.spawn(sx, sy, { n: good ? 14 : 6, color: ['#bdbccd', '#7a6d8a', '#574a66'], speed: 210, spread: 6.28, life: 0.7, size: 4, sizeEnd: 0, gravity: 420, world: false });
    if (good) {
      Juice.pow(sx, sy, { r: 46, spikes: 9, col: '#ffe98a' });
      Popups.add(sx, sy - 40, 'CRACK!', '#ffe98a', { world: false, scale: 1.6, life: 0.9 });
    } else Popups.add(sx, sy - 34, 'chip', '#9391a6', { world: false, scale: 1.1, life: 0.8 });
    if (this.crack >= 1) {
      this.crack = 0;
      this.flyers.push({ t: 0, from: { x: g.x, y: g.y }, kind: [2, 1, 0][this.mined % 3] });
      this.mined++;
      AudioSys.sfx('pickup'); AudioSys.sfx('gold');
      Juice.flash('#ffe98a', 0.3, 3);
      Particles.sparkle(sx, sy, 22, ['#ffe98a', '#ffffff']);
      Popups.add(W / 2, 150, `${this.mined} / ${this.need}`, '#a8e878', { world: false, scale: 2.4, life: 1.4 });
    }
  }
  draw() {
    Gfx.clear('#120c16');
    const sh = Math.sin(Time.t * 40) * this.shake * 2;
    this.stage(this.camX + sh, this.camY, (cx) => {
      World.quarry(this.t, { mined: this.mined }, cx);
      // the man, and the tool
      this.hero.draw();
      const sw = this.swing < 0 ? 0 : this.swing;
      const rot = this.swing < 0
        ? -1.05 + Math.sin(this.t * 2) * 0.06
        : (sw < 0.44 ? lerp(-2.5, 0.95, Ease.inQuad(sw / 0.44)) : lerp(0.95, -1.05, (sw - 0.44) / 0.56));
      World.pickaxe(this.hero.x + 16, GY - 50, rot, 0.62);
      // a crystal on its way to the box
      for (const f of this.flyers) {
        const k = Ease.outQuad(f.t);
        const fx = lerp(f.from.x, QUARRY.box, k);
        const fy = lerp(f.from.y, GY - 62, k) - Math.sin(k * Math.PI) * 90;
        World.oreLump(fx, fy, 1.5, f.kind);
        Gfx.glow(fx, fy - 6, 40, '#ffe98a', 0.4 * (1 - f.t));
      }
    });
    this.drawBar();
    this.drawFrame(this.o.title || 'THE SHIFT', `${this.mined} / ${this.need} CRYSTAL`, this.mined / this.need);
  }
  // the swing bar: a green window, a sweeping marker, and how cracked the
  // crystal is underneath it
  drawBar() {
    const w = 420, x = W / 2 - w / 2, y = H - 104;
    Gfx.rectA(x - 14, y - 12, w + 28, 84, '#120c16', 0.72);
    Gfx.rect(x - 14, y - 14, w + 28, 3, '#ffe98a');
    Gfx.round(x, y, w, 30, 6, '#241c2e');
    Gfx.round(x + 2, y + 2, w - 4, 26, 5, '#3b3048');
    const bw = w * this.band;
    Gfx.round(x + w / 2 - bw / 2, y + 2, bw, 26, 5, '#27632f');
    Gfx.round(x + w / 2 - bw / 2, y + 2, bw, 8, 3, '#6cc95c');
    for (let i = 1; i < 8; i++) Gfx.rectA(x + i * w / 8, y + 4, 2, 22, '#241c2e', 0.5);
    const mx = x + this.mark * w;
    Gfx.rect(mx - 4, y - 6, 8, 42, '#120c16');
    Gfx.rect(mx - 2, y - 4, 4, 38, this.swing >= 0 ? '#ffe98a' : '#ef6a5e');
    Gfx.text('CRACK', x, y + 40, { color: '#d6cfe0', align: 'left', scale: 1 });
    Gfx.bar(x + 58, y + 40, w - 58, 8, this.crack, '#b177e6');
    Gfx.text(this.o.hint || '', W / 2, y + 56, { color: '#9391a6', align: 'center', scale: 1 });
  }
}
