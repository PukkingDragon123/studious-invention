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

// ------------------------------------------------------------------- BONK ---
// The dodo alarm. It screams, you sit up, you swing once, and it goes out of
// the window as a sheet of paper. That is the whole game.
class SmackGame extends MiniGame {
  constructor(o) {
    super(o);
    this.state = 'wake';                 // wake -> squawk -> rise -> struck -> paper -> gone
    this.t = 0; this.stateT = 0; this.swing = 0; this.hit = 0; this.bonked = 0;
    this.gy = o.groundY ?? GY;
    this.bedX = o.bedX ?? 0;
    this.perchX = o.perchX ?? 120;
    this.cx = o.camX ?? (this.bedX - VW * 0.3);
    this.cy = o.camY ?? (this.gy - VH * 0.74);
    this.dodo = { x: this.perchX, y: this.gy - 54, vx: 0, vy: 0, spin: 0, squash: 1, flat: 0, wave: 0 };
    this.eyes = 0;                       // how open Bronk's eyes are
    this.rise = 0;                       // 0 flat on his back, 1 upright
    this.intro = 0.4; this.o.hint = '';
  }
  bonk() {
    if (this.state !== 'squawk') return;
    this.state = 'rise'; this.stateT = 0;
    AudioSys.sfx('gasp');
  }
  strike() {
    this.state = 'struck'; this.stateT = 0; this.swing = 1; this.hit = 1; this.bonked++;
    Juice.stop(0.16);
    Juice.shake(18, 0.4);
    Juice.flash('#ffffff', 0.34, 6);
    Juice.punch(0.10);
    AudioSys.sfx('thud'); AudioSys.sfx('crunch', { vol: 0.8 });
    const [px, py] = [this.sx(this.dodo.x), this.sy(this.dodo.y)];
    Particles.spawn(px, py, {
      n: 34, color: ['#fffaea', '#e8dfc6', '#d6cfe0', '#c4b89a'],
      speed: 300, spread: 6.28, life: 1.6, size: 5, sizeEnd: 0, gravity: 90,
    });
    FX.burst(px, py, { world: false, scale: 2.2 });
    Juice.pow(px, py, { r: 86, spikes: 13, word: 'BONK!' });
    Popups.add(px, py - 80, '', '#ffe98a', { world: false, scale: 3.4, life: 1.2, vy: -40 });
  }
  sx(wx) { return (wx - this.cx) * VIEW; }
  sy(wy) { return (wy - this.cy) * VIEW; }
  step(dt) {
    this.stateT += dt;
    const pressed = Input.clicks.length || Input.keys.length;
    const d = this.dodo;
    if (this.state === 'wake') {
      this.eyes = Math.min(1, this.eyes + dt * 1.8);
      if (this.stateT > 0.6) { this.state = 'squawk'; this.stateT = 0; AudioSys.sfx('roar', { pitch: 600, vol: 0.8, len: 0.45 }); }
    } else if (this.state === 'squawk') {
      if (pressed || this.stateT > 3.2) this.bonk();
    } else if (this.state === 'rise') {
      this.rise = Ease.outBack(clamp(this.stateT / 0.34, 0, 1));
      if (this.stateT > 0.34) this.strike();
    } else if (this.state === 'struck') {
      this.rise = 1;
      if (this.stateT > 0.26) {
        this.state = 'paper'; this.stateT = 0;
        d.vx = 150; d.vy = -60; d.spin = 3.2;
        AudioSys.sfx('whoosh', { vol: 0.8 });
      }
    } else if (this.state === 'paper') {
      this.rise = 1;
      d.flat = Math.min(1, d.flat + dt * 7);
      d.wave += dt * 7;
      d.x += d.vx * dt;
      d.y += (d.vy + Math.sin(d.wave) * 130) * dt;      // paper does not fall, it flutters
      d.vx += dt * 40; d.vy = damp(d.vy, -22, 1.4, dt);
      if (chance(dt * 16)) Particles.spawn(this.sx(d.x), this.sy(d.y), { n: 1, color: ['#fffaea'], speed: 30, life: 1.4, size: 4, sizeEnd: 0, gravity: 30 });
      if (this.stateT > 2.3) { this.state = 'gone'; this.stateT = 0; }
    } else if (this.stateT > 0.5) this.finish({ win: true, bonked: this.bonked });
    this.swing = Math.max(0, this.swing - dt * 3.4);
    this.hit = Math.max(0, this.hit - dt * 2.4);
  }
  draw() {
    Gfx.clear('#120c16');
    const d = this.dodo, bx = this.bedX, by = this.gy;
    this.stage(this.cx, this.cy, () => {
      if (this.o.paint) this.o.paint(this.t, this);
      // --- the dodo, mid-squawk, mid-flight, or mid-air as a sheet of paper
      if (this.state !== 'gone') {
        if (this.state === 'squawk') {
          Gfx.glow(d.x, d.y, 44, '#ffe98a', 0.2 + Math.sin(this.t * 14) * 0.08);
          for (let i = 0; i < 3; i++) {
            const a = -1.1 + i * 0.85, r = 26 + Math.sin(this.t * 20 + i) * 5;
            Gfx.text('~', d.x + Math.cos(a) * r, d.y + Math.sin(a) * r - 14,
              { color: '#ffe98a', align: 'center', scale: 1.4, outline: true, outlineWidth: 1 });
          }
        }
        const wob = this.state === 'squawk' ? Math.sin(this.t * 26) * 0.14 : 0;
        const flat = d.flat;
        Gfx.sprite('dodo_walk', d.x, d.y, {
          anchor: 'c', scale: 1.1 * (1 + wob),
          frame: Math.floor(this.t * 14) % 4,
          rot: this.state === 'paper' ? Math.sin(d.wave * 0.5) * 0.9 : (this.state === 'struck' ? this.t * 12 : 0),
          sx: 1 + flat * 0.7, sy: Math.max(0.08, 1 - flat * 0.92) * (2 - d.squash),
        });
      }
      // --- Bronk: flat out, then bolt upright with the club already moving
      const r = this.rise;
      if (r < 0.05) {
        Gfx.sprite('bronk_sleep', bx, by, { anchor: 'bc', scale: 1, frame: this.eyes > 0.5 ? 1 : 0 });
      } else {
        const lean = (1 - r) * 0.9;
        Gfx.sprite(this.state === 'squawk' || this.state === 'rise' ? 'bronk_shock' : 'bronk_idle',
          bx + 6, by, { anchor: 'bc', scale: 1, rot: lean, frame: this.hit > 0.4 ? 1 : 0 });
        const sw = Ease.outCubic(1 - this.swing);
        Gfx.sprite('art_club', bx + 22 + sw * 34, by - 62 - (1 - sw) * 22, {
          anchor: 'c', scale: 1.1, rot: -2.2 + sw * 2.6,
        });
      }
      if (this.hit > 0.1) Gfx.sprite('fx_anger', d.x + 20, d.y - 20, { anchor: 'c', scale: 1, frame: Math.floor(this.t * 14) % 2 });
    });
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
    this.gy = o.groundY ?? GY;
    this.cx = o.camX ?? 0; this.cy = o.camY ?? (this.gy - VH * 0.74);
    this.heroX = o.heroX ?? (this.cx + VW * 0.34);
    this.foeX = o.foeX ?? (this.cx + VW * 0.64);
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
    Gfx.clear('#120c16');
    this.stage(this.cx, this.cy, () => {
      if (this.o.paint) this.o.paint(this.t, this);
      const gy = this.gy, sh = Math.sin(Time.t * 40) * this.shake * 0.5;
      const lean = (this.pull - 0.5) * 17;
      const bX = this.heroX + lean * 0.5 + sh;
      const dX = this.foeX + lean * 0.5 - sh;
      const eggX = this.heroX + 16 + this.pull * (this.foeX - this.heroX - 32);
      Gfx.shadow(bX, gy + 2, 46, 0.3);
      Gfx.shadow(dX, gy + 2, 42, 0.3);
      Gfx.sprite('bronk_eat', bX, gy + 2, { anchor: 'bc', scale: 1, frame: this.tug > 0.4 ? 1 : 0 });
      Gfx.sprite('dodo_walk', dX, gy + 2, { anchor: 'bc', scale: 1.15, flip: true, frame: Math.floor(this.t * 12) % 4 });
      const ctx = Gfx.ctx;
      ctx.strokeStyle = `rgba(255,255,255,${0.10 + this.tug * 0.35})`; ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(bX + 24, gy - 40 + i * 5 + sh);
        ctx.lineTo(dX - 24, gy - 40 + i * 5 - sh);
        ctx.stroke();
      }
      const pop = 1 + this.tug * 0.24;
      Gfx.glow(eggX, gy - 40, 26, '#fffaea', 0.12 + this.tug * 0.16);
      Gfx.sprite('prop_egg', eggX + sh, gy - 40, { anchor: 'c', scale: 1.15 * pop, rot: Math.sin(this.t * 7) * 0.12 });
      if (this.feather > 0.02) for (let i = 0; i < 2; i++)
        Particles.spawn((eggX - this.cx) * VIEW + rnd(-40, 40), (gy - 40 - this.cy) * VIEW + rnd(-30, 30), { n: 1, color: ['#fffaea', '#d6cfe0'], speed: 40, life: 1.4, size: 4, sizeEnd: 0, gravity: -14 });
    });
    // the only readout is the egg's own progress, drawn as a bone bar
    Gfx.rectA(W * 0.28, H - 74, W * 0.44, 16, '#120c16', 0.7);
    Gfx.rect(W * 0.28 + 3, H - 71, (W * 0.44 - 6) * this.pull, 10, this.pull > 0.66 ? '#a8e878' : this.pull > 0.33 ? '#ffe08a' : '#ef6a5e');
    if (this.intro > 0 || this.t < 2.4) {
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
    this.gy = o.groundY ?? GY;
    this.cx = o.camX ?? 0; this.cy = o.camY ?? (this.gy - VH * 0.74);
    this.foeX = o.foeX ?? (this.cx + VW * 0.62);
    this.heroX = o.heroX ?? (this.cx + VW * 0.34);
    this.panX = o.panX ?? (this.cx + VW * 0.49);
    this.o.hint = Input.touch ? 'TAP TO BOOT THE RAPTOR - KEEP THE HEAT IN THE GREEN' : 'SPACE TO BOOT THE RAPTOR - KEEP THE HEAT IN THE GREEN';
  }
  kick() {
    const good = this.onBeat(0.22);
    this.heat = clamp(this.heat + (good ? 0.20 : 0.12), 0, 1);
    this.kickT = 0.28; this.angry = 1;
    AudioSys.sfx(good ? 'fire_whoosh' : 'thud');
    Juice.shake(good ? 6 : 3, 0.14);
    if (good) Juice.pow(W * 0.56, H * 0.62, { r: 48, spikes: 9, col: '#ffa832' });
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
    Gfx.clear('#120c16');
    this.stage(this.cx, this.cy, () => {
      if (this.o.paint) this.o.paint(this.t, this);
      const gy = this.gy;
      const bzX = this.foeX, bkX = this.heroX, panX = this.panX;
      Gfx.shadow(bzX, gy + 2, 60, 0.3);
      Gfx.sprite('blaze_idle', bzX, gy + 2, { anchor: 'bc', scale: 1, frame: Math.floor(this.t * 8) % 4, flip: true });
      if (this.angry > 0.3) Gfx.sprite('fx_anger', bzX + 22, gy - 62, { anchor: 'c', scale: 0.9, frame: Math.floor(this.t * 12) % 2 });
      if (this.heat > 0.2) Gfx.glow(bzX - 30, gy - 20, 90 * this.heat, '#ff9a20', 0.3 * this.heat);
      const boot = this.kickT > 0 ? 11 : 0;
      Gfx.shadow(bkX, gy + 2, 46, 0.3);
      Gfx.sprite(this.kickT > 0 ? 'bronk_walk' : 'bronk_idle', bkX + boot, gy + 2 - (this.kickT > 0 ? 3 : 0),
        { anchor: 'bc', scale: 1, frame: this.kickT > 0 ? 2 : 0 });
      Gfx.sprite('prop_pot', panX, gy - 16, { anchor: 'bc', scale: 0.8 });
      Gfx.sprite('prop_egg', panX, gy - 30, { anchor: 'c', scale: 0.6, tint: this.burn > 0.4 ? '#3a2415' : this.cook > 0.5 ? '#d8a86b' : null });
    });
    if (this.heat > 0.2) for (let i = 0; i < 2; i++) if (chance(this.heat)) Particles.fire(W * 0.56 + rnd(-30, 30), H * 0.72, 1);
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
