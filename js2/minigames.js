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
    this.camY = this.ground - VH * (o.camYFrac ?? 0.74);
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
      ? 'STICK TO WALK  -  GO TO RUN ON  -  JUMP TO JUMP'
      : 'A / D TO WALK  -  SPACE TO JUMP  -  HOLD IT TO JUMP HIGHER');
  }
  step(dt) {
    // ----------------------------------------------------------- the input
    let dir = 0, jumpPress = false;
    if (Input.isDown('KeyD', 'ArrowRight')) dir = 1;
    if (Input.isDown('KeyA', 'ArrowLeft')) dir = -1;
    if (Input.pressed('Space', 'KeyW', 'ArrowUp')) jumpPress = true;
    let jumpHeld = Input.isDown('Space', 'KeyW', 'ArrowUp');
    // the thumb pad, drawn in drawHud and read here: a stick to walk with and
    // a jump button, so a phone plays the same game a keyboard does
    const pad = this.pad;
    if (pad) {
      if (pad.run) dir = 1;                        // the big button is 'forward'
      if (Math.abs(pad.x) > 0.18) dir = pad.x > 0 ? 1 : -1;
      if (pad.jump || pad.act) jumpPress = true;
      if (pad.jumpHeld || pad.actHeld) jumpHeld = true;
    } else if (!Input.touch && Input.down && Input.my > 120 && Input.my < H - 150) dir = Input.mx > W * 0.5 ? 1 : -1;
    if (jumpPress && Input.touch) this.touchHold = 0.17;      // a tap still gets a full jump
    this.touchHold = Math.max(0, this.touchHold - dt);
    jumpHeld = jumpHeld || this.touchHold > 0;

    // --------------------------------------------------------- left / right
    const cap = this.runSpeed * (pad && Math.abs(pad.x) > 0.18 ? clamp(Math.abs(pad.x) * 1.35, 0.4, 1) : 1);
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
        Particles.debris(this.sx(this.x), this.sy(this.ground - floor), 4);
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
      Particles.debris(this.sx(b.x), this.sy(this.ground), 12);
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
    this.camY = damp(this.camY, this.ground - VH * (this.o.camYFrac ?? 0.74) - Math.abs(this.vx) * 0.02, 4, dt);
    // --- someone chasing, someone running away
    if (this.pursuer) {
      const p = this.pursuer; p.t += dt;
      p.x += (p.speed + (this.o.pursuerRamp || 0) * (this.x / this.goal)) * dt;
      // every footfall lands. you feel it before you see it.
      p.step = (p.step || 0) + dt;
      const period = 0.42 - this.lunge * 0.1;
      if (p.step > period) {
        p.step = 0;
        const fx = this.sx(p.x - 10), fy = this.sy(this.ground);
        if (fx > -120 && fx < W + 120) {
          Particles.stomp(fx, fy, 1.1 + this.lunge);
          Juice.shake(3 + this.lunge * 5, 0.12);
          AudioSys.sfx('thud', { vol: 0.35 + this.lunge * 0.4 });
        }
      }
      // and it goes through whatever you went round
      for (const b of this.obstacles) {
        if (b.smashed || b.x > p.x + 30) continue;
        b.smashed = true;
        const bx = this.sx(b.x), by = this.sy(this.ground - 20);
        if (bx > -140 && bx < W + 140) {
          Particles.debris(bx, by, 16, ['#5c3a20', '#3a2415', '#574a66', '#85562f']);
          Juice.pow(bx, by, { r: 52, spikes: 10, col: '#9391a6', word: pick(['CRACK', 'SNAP', 'CRUNCH']) });
          AudioSys.sfx('bighit', { vol: 0.6 });
          Juice.shake(7, 0.16);
        }
      }
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
        // spit, and the grit its feet are throwing forward past your ears
        if (chance(dt * 26)) Particles.spawn(this.sx(p.x + 40), this.sy(this.ground - 60) + rnd(-20, 20),
          { n: 1, color: ['#e8dfc6', '#d6cfe0'], speed: 90, gravity: 220, life: 0.7, size: 3, sizeEnd: 0 });
        if (chance(dt * 14)) Particles.spawn(this.sx(p.x + 60), this.sy(this.ground) - rnd(0, 40),
          { n: 1, color: ['#574a66', '#3b3048'], speed: 340, angle: 0, spread: 0.5, gravity: 500, life: 0.6, size: 4, sizeEnd: 0 });
      }
      p.rage = damp(p.rage || 0, this.lunge, 6, dt);
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
  // which set this stage is painted with, so it can be lit like one
  get lightSet() { return this.o.lightSet || (this.o.paint && this.o.paint.set) || null; }
  get lightOpt() { return this.o.lightOpt || (this.o.paint && this.o.paint.opt) || {}; }
  // A ledge: a slab of rock with a lit top edge and a little scrub on it, so
  // it reads as something you can stand on from across the screen.
  ledge(p) {
    if (p.spr) {                                        // a drawn shelf, top edge at exactly p.h
      Gfx.shadow(p.x + p.w / 2, this.ground + 2, p.w * 0.8, 0.26);
      Gfx.sprite(p.spr, p.x + p.w / 2, this.ground - 1, { anchor: 'bc' });
      return;
    }
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
      Gfx.sprite(i % 2 ? 'v_fern' : 'v_mushroom', p.x + 14 + i * (p.w - 28) / 2, y + 2, { anchor: 'bc', scale: 0.55 });
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
        // when it is close enough to bite it stops running and starts roaring
        const raging = snap > 0.4 && p.roarSpr;
        Gfx.sprite(raging ? p.roarSpr : p.spr, p.x + snap * 28, this.ground - bob, {
          anchor: 'bc', scale: p.scale * (1 + snap * 0.08), frame: Math.floor(p.t * (raging ? 8 : 10)), flip: p.flip,
        });
        if (raging) {                                     // breath, and the light off its teeth
          Gfx.glow(p.x + 54 * (p.flip ? -1 : 1), this.ground - 92, 70, '#ef6a5e', 0.22 * snap);
          if (chance(Time.dt * 30)) Particles.spawn(this.sx(p.x + 56), this.sy(this.ground - 92),
            { n: 1, color: ['#d6cfe0', '#9391a6'], speed: 140, angle: 0, spread: 0.5, gravity: -30, life: 0.5, size: 4, sizeEnd: 0, world: false });
        }
      } });
      list.push({ y: this.ground + 2, f: () => {
        if (this.o.vehicle) {
          const bounce = Math.sin(this.t * 11 + this.x * 0.03) * 3 * clamp(Math.abs(this.vx) / 160, 0.25, 1) - this.z;
          const sc = this.o.vehicleScale || 1;
          Gfx.shadow(this.x, this.ground + 2, 88 * sc * clamp(1 - this.z / 200, 0.5, 1), 0.32);
          World.cart(this.x, this.ground + bounce * 0.4, { scale: sc, frame: Math.floor(Math.abs(this.x) / 18), flip: this.hero.facing < 0 },
            () => Gfx.sprite('bronk_drive', this.x - 6 * sc * (this.hero.facing < 0 ? -1 : 1), this.ground - 22 * sc + bounce,
              { anchor: 'bc', scale: sc * 0.78, frame: Math.abs(this.vx) > 180 ? 1 : 0, flip: this.hero.facing < 0 }));
          if (Math.abs(this.vx) > 60 && chance(Time.dt * 26)) Particles.dust(this.sx(this.x - 40 * sc * (this.hero.facing || 1)), this.sy(this.ground), 1);
        } else {
          this.hero.x = this.x; this.hero.y = this.ground; this.hero.z = this.z; this.hero.draw();
        }
      } });
      list.sort((a, b) => a.y - b.y);
      for (const it of list) it.f();
      if (this.o.paint && this.o.paint.front) this.o.paint.front(this.camX, this.t);
      for (const b of this.obstacles) {
        if (b.smashed || b.x < this.camX - 60 || b.x > this.camX + VW + 60) continue;
        Gfx.shadow(b.x, this.ground + 2, (b.w || 34) + 14, 0.3);
        Gfx.sprite(b.spr || 'v_rock', b.x, this.ground + 2, { anchor: 'bc', scale: b.scale || 1, alpha: b.hit ? 0.5 : 1 });
        if (!b.hit) {
          const k = 0.5 + Math.sin(Time.t * 7 + b.x) * 0.5;
          Gfx.rectA(b.x - 12, this.ground - (b.h || 38) - 16, 24, 4, '#ffe98a', 0.25 + k * 0.35);
        }
      }
      if (this.o.goalSpr) Gfx.sprite(this.o.goalSpr, this.goal, this.ground, { anchor: 'bc', scale: this.o.goalScale || 1 });
      if (this.lightSet && Settings.lighting !== false) SetLight.run(this.lightSet, this.t, this.lightOpt, this.camX);
    });
    if (this.lightSet && Settings.lighting !== false) SetLight.post(this.lightSet, this.lightOpt);
    this.drawHud();
  }
  drawHud() {
    this.pad = Input.touch ? Pad.legs({
      jumpLabel: this.o.vehicle ? 'HOP' : 'JUMP',
      mainLabel: this.o.vehicle ? 'GO' : 'RUN',
      act: false,
    }) : null;
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
// The commute, as a loading screen, and nothing more than that: black, one
// small car going past, and a line telling you where he is going. It has two
// moods. On the way out he is whistling. On the way home he is not.
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
    if (this.scared && chance(dt * 6)) Juice.shake(2, 0.08);
    if (this.t > this.dur) this.finish({ win: true });
  }
  draw() {
    const t = this.t, sc = this.scared;
    Gfx.clear('#000000');
    const road = H * 0.56, speed = sc ? 460 : 190;
    // the one line of ground he is driving on
    Gfx.rect(0, road, W, 2, sc ? '#7d1d2b' : '#3a2415');
    for (let i = 0; i < 16; i++) {
      const span = W + 120;
      const x = ((i * span / 16 - t * speed) % span + span) % span - 60;
      Gfx.rect(x, road + 6, 26 + (i % 3) * 14, 2, sc ? '#3f0e18' : '#241109');
    }
    // something following, a long way back and not getting further away
    if (sc) {
      const bx = W * 0.13 + Math.sin(t * 1.6) * 14;
      Gfx.sprite('trex_walk', bx, road + 2, { anchor: 'bc', scale: 1.1, frame: Math.floor(t * 9),
        tint: '#3f0e18', tintAmount: 1, alpha: 0.85 });
    }
    // the car
    const cx = W * 0.5, bounce = Math.abs(Math.sin(this.hop)) * (sc ? 7 : 4);
    for (let i = 0; i < (sc ? 3 : 1); i++) if (chance(0.6))
      Particles.spawn(cx - 60 + rnd(-10, 10), road, { n: 1, color: sc ? ['#7d1d2b', '#3a2415'] : ['#5c3a20', '#3a2415'],
        speed: 60, angle: Math.PI, spread: 1.2, gravity: -20, life: 0.8, size: 3, sizeEnd: 0, world: false });
    World.cart(cx, road + 2 - bounce * 0.4, { frame: Math.floor(t * 18), rot: sc ? -0.05 : 0 },
      () => Gfx.sprite(sc ? 'bronk_shock' : 'bronk_drive', cx - 8, road - 20 - bounce,
        { anchor: 'bc', scale: 0.85, frame: Math.floor(t * (sc ? 12 : 6)) }));
    if (!sc && chance(0.05))
      Popups.add(cx + 26, road - 76, '~', '#ffe98a', { world: false, scale: 1.8, life: 1.4, vy: -34, vx: 26 });
    if (sc) {
      Gfx.ctx.globalAlpha = 0.35;
      for (let i = 0; i < 5; i++) {
        const y = road - 90 + ((i * 61 + t * 700) % 180);
        Gfx.rect(((i * 211 - t * 1100) % (W + 260) + W + 260) % (W + 260) - 130, y, 90, 2, '#7d1d2b');
      }
      Gfx.ctx.globalAlpha = 1;
    }
    Particles.draw(Gfx.ctx, false);
    // the caption, and how far along he is
    const k = clamp(this.t / this.dur, 0, 1);
    const dots = '.'.repeat(1 + (Math.floor(t * 3) % 3));
    Gfx.text(this.label + dots, W / 2, road + 70, {
      color: sc ? '#c2333c' : '#c4b89a', align: 'center', scale: 2.0,
    });
    Gfx.text(this.sub, W / 2, road + 100, { color: sc ? '#5c1607' : '#5c3a20', align: 'center', scale: 1.1 });
    Gfx.rect(W / 2 - 160, road + 126, 320, 3, '#241c2e');
    Gfx.rect(W / 2 - 160, road + 126, 320 * k, 3, sc ? '#c2333c' : '#c4b89a');
  }
}

// ---------------------------------------------------------------- DRIVEGAME -
// The commute, driven. Same legs as every other stage in the game, except the
// legs are a car: you hold a direction, you dodge what is in the road, and the
// valley goes past in seven layers. Two moods, and they are not the same road.
//   morning - shells on the verge, traffic waving, nobody in a hurry
//   evening - the sky on fire, everyone going the other way, something behind
class DriveGame extends SideScroll {
  constructor(o = {}) {
    const ev = !!o.scared;
    const goal = o.goal ?? (ev ? 2300 : 2000);
    // the things in the road. morning: a rock, a crossing dodo, a dropped pot.
    // evening: the wreckage of everybody who left before you did.
    const obs = [];
    const n = ev ? 7 : 5;
    for (let i = 0; i < n; i++) obs.push({
      x: 360 + i * ((goal - 500) / n) + (i % 2) * 70,
      spr: ev ? ['v_rock', 'v_basket', 'v_bones'][i % 3] : ['v_rock', 'v_pot', 'v_basket'][i % 3],
      scale: ev ? 1.2 : 1, w: 40, h: 34,
    });
    const shells = [];
    if (!ev) for (let i = 0; i < 4; i++) shells.push({ x: 520 + i * 380, y: GY - 40, spr: 'relic_shell', scale: 0.9, label: '+1' });
    super(Object.assign({
      base: 'bronk', vehicle: true, vehicleScale: 1.05, jump: true, camYFrac: 0.80,
      ground: GY + 6, goal,
      speed: ev ? 430 : 300, auto: ev ? 250 : 95, accelMul: ev ? 1.5 : 1,
      obstacles: obs, pickups: shells,
      catchTime: 3.2, leash: 980,
      pursuer: ev ? { spr: 'trex_walk', x: -520, scale: 1.25, speed: 250 } : null,
      pursuerRamp: ev ? 120 : 0,
      title: ev ? 'DRIVING HOME' : 'DRIVING TO WORK',
      sub: ev ? 'faster. faster. faster.' : 'same as every day',
      hint: Input.touch ? 'HOLD GO TO DRIVE  -  HOP OVER THE ROCKS' : 'D TO DRIVE  -  SPACE TO HOP THE ROCKS',
      paint: (camX, t) => World.road(t, { scared: ev }, camX),
      lightSet: 'road', lightOpt: { scared: ev },
    }, o));
    this.ev = ev;
    this.horn = 0; this.debris = 0;
    this.maxT = o.maxT ?? 30;                      // it is a commute, not a career
  }
  step(dt) {
    super.step(dt);
    if (this.t > this.maxT && !this.done) this.finish({ win: true, got: this.got, x: this.x });
    // grit off the wheels, and a lot more of it when he is not being careful
    const fast = Math.abs(this.vx) > 140;
    this.debris -= dt;
    if (fast && this.debris <= 0) {
      this.debris = this.ev ? 0.03 : 0.07;
      Particles.spawn(this.sx(this.x - 42), this.sy(this.ground) - 2, {
        n: 1, color: this.ev ? ['#7d1d2b', '#3a2415', '#e06a1b'] : ['#d8a86b', '#85562f', '#5c3a20'],
        speed: 140, angle: Math.PI, spread: 0.9, gravity: 260, life: 0.6, size: 3, sizeEnd: 0,
      });
    }
    if (this.ev) {
      if (chance(dt * 2.4)) Juice.shake(2, 0.1);
      // ash coming past the windscreen the wrong way
      if (chance(dt * 26)) Particles.spawn(rnd(W * 0.6, W), rnd(0, H * 0.7), {
        n: 1, color: ['#e06a1b', '#ffa832', '#574a66'], speed: 320, angle: Math.PI, spread: 0.3,
        gravity: 40, life: 1.0, size: 3, sizeEnd: 1, world: false,
      });
    } else {
      this.horn -= dt;
      if (this.horn <= 0 && chance(dt * 0.6)) {
        this.horn = 2.4;
        AudioSys.sfx('honk', { vol: 0.4 });
        Popups.add(this.sx(this.x), this.sy(this.ground - 90), pick(['BEEP', '~', 'MORNIN']), '#ffe98a',
          { world: false, scale: 1.2, life: 1.2 });
      }
    }
  }
}
// ----------------------------------------------------------------- MINEGAME -
// The shift, walked. The quarry is half a mile long and you are somewhere in
// it: walk the haul road past the crew, find each of the three faces, swing
// for the crystal, carry it to the box at the far end. Hitting rock is still
// a timing problem - a marker sweeps the swing bar and the middle of it is
// where the pick bites - but getting to the rock is now your problem too.
class MineGame extends SideScroll {
  constructor(o = {}) {
    super(Object.assign({
      base: 'bronk', startX: QUARRY.boss + 80, ground: GY,
      goal: QUARRY.end + 600,                 // never reached: the box ends this
      speed: 215, camYFrac: 0.82, jump: true,
      title: o.title || 'THE SHIFT',
      hint: Input.touch ? 'WALK TO A FACE  -  TAP TO SWING' : 'A / D TO WALK  -  SPACE TO SWING AT A FACE',
      paint: (camX, t) => World.quarry(t, { mined: this.boxed }, camX),
      lightSet: 'quarry',
    }, o));
    this.need = o.need ?? 3;
    this.mined = 0;                       // crystals out of the rock
    this.boxed = 0;                       // crystals in the box
    this.carry = 0;                       // crystals in your arms
    this.crack = 0;                       // how far into the current face, 0..1
    this.swing = -1; this.struck = false;
    this.mark = 0; this.markDir = 1;
    this.flyers = [];
    this.cleared = [false, false, false];
    this.said = new Set(); this.bark = null; this.barkT = 0;
    this.prompt = null;
    this.idle = 0;                        // how long since you last did anything
  }
  // which face you are standing at, or -1
  get atFace() {
    for (let i = 0; i < QUARRY.gems.length; i++)
      if (!this.cleared[i] && Math.abs(this.x - (QUARRY.gems[i].x - 60)) < 72) return i;
    return -1;
  }
  get atBox() { return this.carry > 0 && Math.abs(this.x - (QUARRY.box - 70)) < 74; }
  get band() { return 0.30 - this.boxed * 0.05; }      // the green gets meaner
  // where the shift wants you to be next: the nearest uncut face, or the box
  get aimX() {
    const next = this.cleared.findIndex(c => !c);
    return next < 0 ? QUARRY.box - 70 : QUARRY.gems[next].x - 60;
  }
  step(dt) {
    const face = this.atFace;
    // if you put the stick down, he gets on with it himself. a quarry shift
    // does not stop because the man operating it has wandered off.
    const busy = Input.isDown('KeyD', 'KeyA', 'ArrowRight', 'ArrowLeft', 'Space', 'KeyW', 'ArrowUp')
      || Input.clicks.length > 0 || (Input.touch && Input.touches.size > 0);
    this.idle = busy ? 0 : this.idle + dt;
    const autop = this.idle > 6;
    // ------------------------------------------------------- swinging a pick
    if (this.swing >= 0) {
      this.swing += dt * 4.4;
      if (this.swing > 0.44 && !this.struck) { this.struck = true; this.strike(face < 0 ? this.lastFace : face); }
      if (this.swing >= 1) { this.swing = -1; this.struck = false; }
      this.vx = 0;
      this.hero.update(dt); this.hero.x = this.x; this.hero.y = this.ground;
      this.camX = damp(this.camX, this.x - VW * 0.34, 5, dt);
      this.camY = damp(this.camY, this.ground - VH * 0.82, 4, dt);
    } else {
      super.step(dt);
      // the marker only sweeps while you are stood at a face
      if (face >= 0) {
        this.mark += this.markDir * dt * (1.25 + this.boxed * 0.28);
        if (this.mark > 1) { this.mark = 1; this.markDir = -1; }
        if (this.mark < 0) { this.mark = 0; this.markDir = 1; }
      }
    }
    // ----------------------------------------------------------- the prompt
    this.prompt = face >= 0 ? `SWING AT FACE ${face + 1}` : this.atBox ? `PUT ${this.carry} IN THE BOX` : null;
    if (autop && this.swing < 0) {                     // the autopilot
      const d = this.aimX - this.x;
      if (Math.abs(d) > 8) { this.x += Math.sign(d) * Math.min(Math.abs(d), 170 * dt); this.hero.facing = Math.sign(d); this.hero.play('walk', { fps: 10 }); }
      if (face >= 0 && Math.abs(this.mark - 0.5) < this.band / 2) { this.swing = 0; this.struck = false; this.lastFace = face; AudioSys.sfx('whoosh', { vol: 0.4 }); }
      else if (this.atBox) this.deposit();
    }
    // ------------------------------------------------------------- the input
    const act = Input.pressed('Space', 'Enter', 'KeyE')
      || (this.pad ? this.pad.act : Input.clicks.length > 0);
    if (act && this.swing < 0) {
      if (face >= 0) { this.swing = 0; this.struck = false; this.lastFace = face; AudioSys.sfx('whoosh', { vol: 0.4 }); }
      else if (this.atBox) this.deposit();
    }
    // -------------------------------------------------------- what people say
    for (const f of World.FOLK) {
      if (this.said.has(f.name) || Math.abs(this.x - f.x) > 70) continue;
      this.said.add(f.name);
      this.bark = f; this.barkT = 3.4;
      AudioSys.sfx('select', { vol: 0.3 });
    }
    this.barkT = Math.max(0, this.barkT - dt);
    for (const fl of this.flyers) fl.t += dt * 1.6;
    this.flyers = this.flyers.filter(fl => fl.t < 1);
    if (this.boxed >= this.need && !this.done) this.finish({ win: true, mined: this.boxed });
  }
  strike(i) {
    if (i == null || i < 0) return;
    const good = Math.abs(this.mark - 0.5) < this.band / 2;
    const g = QUARRY.gems[i];
    this.crack += good ? 0.42 : 0.17;
    Juice.shake(good ? 9 : 4, 0.16);
    AudioSys.sfx(good ? 'bighit' : 'thud', { vol: good ? 0.9 : 0.5 });
    const sx = this.sx(g.x), sy = this.sy(g.y);
    Particles.spawn(sx, sy, { n: good ? 16 : 7, color: ['#bdbccd', '#7a6d8a', '#574a66'], speed: 230, spread: 6.28, life: 0.7, size: 4, sizeEnd: 0, gravity: 420, world: false });
    if (good) {
      Juice.pow(sx, sy, { r: 46, spikes: 9, col: '#ffe98a' });
      Popups.add(sx, sy - 40, 'CRACK!', '#ffe98a', { world: false, scale: 1.6, life: 0.9 });
    } else Popups.add(sx, sy - 34, 'chip', '#9391a6', { world: false, scale: 1.1, life: 0.8 });
    if (this.crack >= 1) {
      this.crack = 0;
      this.cleared[i] = true;
      this.mined++; this.carry++;
      AudioSys.sfx('pickup'); AudioSys.sfx('gold');
      Juice.flash('#ffe98a', 0.3, 3);
      Particles.sparkle(sx, sy, 24, ['#ffe98a', '#ffffff']);
      Popups.add(W / 2, 150, `CRYSTAL  ${this.mined} / ${this.need}`, '#a8e878', { world: false, scale: 2.2, life: 1.4 });
      Popups.add(sx, sy - 70, this.carry < this.need ? 'FIND THE NEXT FACE' : 'GET IT TO THE BOX', '#ffe98a', { world: false, scale: 1.2, life: 2.2 });
    }
  }
  deposit() {
    for (let k = 0; k < this.carry; k++)
      this.flyers.push({ t: -k * 0.18, from: { x: this.x, y: this.ground - 60 }, kind: [2, 1, 0][(this.boxed + k) % 3] });
    this.boxed += this.carry; this.carry = 0;
    AudioSys.sfx('gold'); Juice.punch(0.05); Juice.shake(5, 0.2);
    Popups.add(this.sx(QUARRY.box), this.sy(GY - 130), `${this.boxed} / ${this.need}`, '#ffe98a', { world: false, scale: 2.0, life: 1.4 });
  }
  draw() {
    Gfx.clear('#120c16');
    this.stage(this.camX, this.camY, () => {
      if (this.o.paint) this.o.paint(this.camX, this.t, this);
      // the man, and the tool
      this.hero.x = this.x; this.hero.y = this.ground; this.hero.z = this.z; this.hero.draw();
      const sw = this.swing < 0 ? 0 : this.swing;
      const rot = this.swing < 0
        ? -1.05 + Math.sin(this.t * 2) * 0.06
        : (sw < 0.44 ? lerp(-2.5, 0.95, Ease.inQuad(sw / 0.44)) : lerp(0.95, -1.05, (sw - 0.44) / 0.56));
      World.pickaxe(this.x + 16 * this.hero.facing, this.ground - 50 - this.z, rot, 0.62);
      // what he is carrying
      for (let k = 0; k < this.carry; k++)
        World.oreLump(this.x + 17 * this.hero.facing, this.ground - 40 - this.z - k * 12, 1.0, [2, 1, 0][k % 3]);
      // a crystal on its way into the box
      for (const f of this.flyers) {
        if (f.t < 0) continue;
        const k = Ease.outQuad(f.t);
        const fx = lerp(f.from.x, QUARRY.box, k);
        const fy = lerp(f.from.y, GY - 62, k) - Math.sin(k * Math.PI) * 90;
        World.oreLump(fx, fy, 1.5, f.kind);
        Gfx.glow(fx, fy - 6, 40, '#ffe98a', 0.4 * (1 - f.t));
      }
      if (Settings.lighting !== false) SetLight.run('quarry', this.t, { mined: this.mined }, this.camX);
      // an arrow on the ground pointing at whatever you should do next
      const aim = this.aimX;
      if (Math.abs(aim - this.x) > 120) {
        const d = Math.sign(aim - this.x), ax = this.x + d * 74, ay = GY - 8 + Math.sin(this.t * 5) * 3;
        for (let k = 0; k < 3; k++) Gfx.rectA(ax + d * k * 9, ay - k * 2, 7, 4 + k * 3, '#ffe98a', 0.5 - k * 0.12);
      }
    });
    if (Settings.lighting !== false) SetLight.post('quarry', {});
    this.pad = Input.touch ? Pad.legs({ jumpLabel: 'JUMP', mainLabel: 'GO', actLabel: 'SWING',
      actOff: this.atFace < 0 && !this.atBox }) : null;
    if (this.barkT > 0 && this.bark) this.drawBark();
    if (this.atFace >= 0) this.drawBar();
    else if (this.prompt) this.drawPrompt();
    this.drawFrame(this.o.title || 'THE SHIFT', `${this.boxed} / ${this.need} IN THE BOX`, this.boxed / this.need);
  }
  // somebody talking at you as you go past, in their own slab
  drawBark() {
    const f = this.bark, k = clamp(this.barkT / 0.3, 0, 1);
    const w = 420, x = W / 2 - w / 2, y = 74;
    Gfx.ctx.globalAlpha = k;
    UI.slab(x, y, w, 62, { r: 5 });
    Gfx.text(f.name, x + 16, y + 12, { color: SKIN.red, align: 'left', scale: 1.2 });
    Gfx.text(f.line, x + 16, y + 34, { color: SKIN.text, align: 'left', scale: 1.0 });
    Gfx.ctx.globalAlpha = 1;
  }
  drawPrompt() {
    const w = 300, x = W / 2 - w / 2, y = Input.touch ? H - 196 : H - 104;
    UI.slab(x, y, w, 44, { r: 5 });
    Gfx.text(this.prompt, W / 2, y + 14, { color: SKIN.text, align: 'center', scale: 1.4 });
    Gfx.text(Input.touch ? 'TAP' : 'SPACE', W / 2, y + 32, { color: SKIN.faceDark, align: 'center', scale: 0.9 });
  }
  // the swing bar: a green window, a sweeping marker, and how cracked the
  // face is underneath it
  drawBar() {
    const w = Input.touch ? 320 : 420, x = W / 2 - w / 2, y = Input.touch ? H - 196 : H - 104;
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
    Gfx.text(Input.touch ? 'TAP IN THE GREEN' : 'SPACE IN THE GREEN', W / 2, y + 56, { color: '#9391a6', align: 'center', scale: 1 });
  }
}
