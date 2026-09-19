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
// A small 2D side-scrolling stage. Used three times in the opening: the dash
// to the pancakes, the chill drive to the quarry, and the chase home. The
// caller supplies a painter that draws the world for a given camera x, so the
// same movement code carries a kitchen, a road and a canyon.
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
    if (moving && !this.o.vehicle) { this.puff -= dt; if (this.puff <= 0) { this.puff = 0.07; Particles.dust(this.sx(this.x - this.hero.facing * 18), this.sy(this.ground), 1); AudioSys.sfx('step_grass', { vol: 0.35 }); } }
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
      if (p.x > this.x - 46) { this.caught += dt; this.bump = 1; Juice.shake(5, 0.12); if (chance(dt * 4)) AudioSys.sfx('chomp'); }
      else this.caught = Math.max(0, this.caught - dt * 0.5);
    }
    if (this.ahead) { const a = this.ahead; a.t += dt; a.x += a.speed * dt; }
    // --- pickups
    for (const k of this.pickups) {
      if (k.got || Math.abs(k.x - this.x) > 34) continue;
      k.got = true; this.got++;
      AudioSys.sfx('pickup'); Particles.sparkle(this.sx(k.x), this.sy(this.ground - 30), 10);
      Popups.add(this.sx(k.x), this.sy(this.ground - 60), k.label || '+1', '#ffe98a', { world: false, scale: 1.2 });
    }
    this.bump = Math.max(0, this.bump - dt * 2);
    if (this.caught > (this.o.catchTime ?? 2.2)) this.finish({ win: false, caught: true, got: this.got, x: this.x });
    else if (this.x >= this.goal) this.finish({ win: true, got: this.got, x: this.x });
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
      for (const pr of this.props) list.push({ y: pr.y ?? this.ground, f: () => Gfx.sprite(pr.spr, pr.x, pr.y ?? this.ground, { anchor: 'bc', scale: pr.scale || 1, flip: pr.flip, frame: Math.floor(this.t * 6 + (pr.x | 0)) }) });
      for (const k of this.pickups) if (!k.got) list.push({ y: this.ground - 1, f: () => Gfx.sprite(k.spr || 'icon_coin', k.x, this.ground - 34 + Math.sin(this.t * 6 + k.t) * 5, { anchor: 'c', scale: k.scale || 1 }) });
      if (this.ahead) list.push({ y: this.ground, f: () => {
        const a = this.ahead, bob = Math.abs(Math.sin(a.t * 12)) * 4;
        Gfx.shadow(a.x, this.ground, 34 * a.scale, 0.3);
        Gfx.sprite(a.spr, a.x, this.ground - bob, { anchor: 'bc', scale: a.scale, frame: Math.floor(a.t * 12), flip: a.flip });
        if (a.carry) Gfx.sprite(a.carry, a.x + 8 * (a.flip ? -1 : 1), this.ground - 34 * a.scale - bob, { anchor: 'c', scale: 0.7, frame: Math.floor(a.t * 6) });
      } });
      if (this.pursuer) list.push({ y: this.ground + 1, f: () => {
        const p = this.pursuer, bob = Math.abs(Math.sin(p.t * 9)) * 5;
        Gfx.shadow(p.x, this.ground, 44 * p.scale, 0.34);
        Gfx.sprite(p.spr, p.x, this.ground - bob, { anchor: 'bc', scale: p.scale, frame: Math.floor(p.t * 10), flip: p.flip });
      } });
      list.push({ y: this.ground + 2, f: () => {
        if (this.o.vehicle) {
          const bounce = Math.sin(this.t * 11 + this.x * 0.03) * 3 * clamp(Math.abs(this.vx) / 160, 0.25, 1);
          const sc = this.o.vehicleScale || 1;
          Gfx.shadow(this.x, this.ground + 2, 88 * sc, 0.32);
          Gfx.sprite(this.o.vehicle, this.x, this.ground + bounce * 0.4,
            { anchor: 'bc', scale: sc, frame: Math.floor(Math.abs(this.x) / 18), flip: this.hero.facing < 0 });
          Gfx.sprite('bronk_drive', this.x - 6 * sc * (this.hero.facing < 0 ? -1 : 1), this.ground - 22 * sc + bounce,
            { anchor: 'bc', scale: sc * 0.78, frame: Math.abs(this.vx) > 180 ? 1 : 0, flip: this.hero.facing < 0 });
          if (Math.abs(this.vx) > 60 && chance(Time.dt * 26)) Particles.dust(this.sx(this.x - 40 * sc * (this.hero.facing || 1)), this.sy(this.ground), 1);
        } else {
          this.hero.x = this.x; this.hero.y = this.ground; this.hero.draw();
        }
      } });
      list.sort((a, b) => a.y - b.y);
      for (const it of list) it.f();
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
        Gfx.rectA(0, 0, W, H, '#c2333c', danger * 0.18 * (0.7 + Math.sin(Time.t * 14) * 0.3));
        Gfx.text('RUN!', W / 2, 78, { color: '#ef6a5e', align: 'center', scale: 2 + danger, outline: true, outlineWidth: 2 });
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
