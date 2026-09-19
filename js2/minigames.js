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
    // jumping, and the things you jump over
    this.canJump = !!o.jump;
    this.z = 0; this.vz = 0; this.airT = 0; this.stumble = 0;
    this.obstacles = (o.obstacles || []).map(b => Object.assign({ hit: false }, b));
    this.lunge = 0;                                // how hard the pursuer is snapping
    this.intro = o.intro ?? 1.2;
    this.o.hint = o.hint || (this.canJump
      ? (Input.touch ? 'HOLD RIGHT TO RUN  -  TAP LEFT TO JUMP' : 'HOLD  D  TO RUN  -  SPACE TO JUMP')
      : (Input.touch ? 'HOLD THE RIGHT OF THE SCREEN TO RUN' : 'HOLD  D  OR  →  TO RUN'));
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
    if (this.stumble > 0) { this.stumble -= dt; this.vx *= 0.35; }
    this.x += this.vx * dt;
    if (this.x < 0) { this.x = 0; this.vx = 0; }
    // --- the jump
    if (this.canJump) {
      let jump = Input.pressed('Space', 'KeyW', 'ArrowUp');
      if (Input.touch) for (const c of Input.clicks) if (c.x < W * 0.5) jump = true;
      if (jump && this.z <= 0.5) { this.vz = 470; AudioSys.sfx('whoosh', { vol: 0.5 }); Particles.dust(this.sx(this.x), this.sy(this.ground), 4); }
      if (this.z > 0 || this.vz !== 0) {
        this.vz -= 1500 * dt; this.z += this.vz * dt;
        if (this.z <= 0) {
          if (this.vz < -180) { Juice.shake(4, 0.12); Particles.dust(this.sx(this.x), this.sy(this.ground), 5); AudioSys.sfx('thud', { vol: 0.4 }); }
          this.z = 0; this.vz = 0;
        }
      }
      this.airT = this.z > 2 ? this.airT + dt : 0;
      // things in the road
      for (const b of this.obstacles) {
        if (b.hit || Math.abs(b.x - this.x) > (b.w || 34) * 0.5 + 12) continue;
        if (this.z > (b.h || 38) * 0.6) continue;
        b.hit = true; this.stumble = 0.55; this.bump = 1;
        Juice.stop(0.08); Juice.shake(10, 0.3); Juice.flash('#ef6a5e', 0.22, 5);
        Juice.pow(this.sx(b.x), this.sy(this.ground - 20), { r: 44, spikes: 9, col: '#ef6a5e' });
        AudioSys.sfx('hurt');
      }
    }
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
