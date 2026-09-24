// ---------------------------------------------------------------------------
// anim.js - animated actors, one-shot effects, emotes
// ---------------------------------------------------------------------------
'use strict';

// How much every clip bounces. A little, and no more: a walk should read as
// weight moving over the feet, not as a man on a pogo stick. The idle only
// breathes; the walk lifts a pixel or two per footfall; running is where the
// body finally leaves the ground a bit.
// bob is pixels of vertical travel; squish is how much the bounce squashes.
const BOB = {
  idle: 0.4, walk: 1.1, run: 1.8, dash: 2.2, eat: 1.0, play: 1.6, sing: 1.4,
  cook: 0.8, cry: 1.2, shock: 1.2, hurt: 0, sleep: 0.25, drive: 0.8,
  roar: 1.2, boss: 1.4, trader: 0.6, shower: 0.8, fly: 2.6, kick: 2.0,
};
const SQUISH = {
  idle: 0.008, walk: 0.012, run: 0.02, dash: 0.03, play: 0.02, sing: 0.018,
  eat: 0.014, cry: 0.016, shock: 0.016, roar: 0.02, fly: 0.03, kick: 0.025,
};

// Per-character clip table: logical name -> { spr, fps, loop, hold }
const CLIPS = {};
function defClips(base, table) {
  CLIPS[base] = {};
  for (const [name, def] of Object.entries(table)) {
    CLIPS[base][name] = Object.assign({ spr: base + '_' + name, fps: 8, loop: true, bob: BOB[name] ?? 0.8, squish: SQUISH[name] ?? 0 }, typeof def === 'object' ? def : { spr: base + '_' + def });
  }
}

defClips('bronk', {
  idle: { fps: 2.4 }, walk: { fps: 10 }, run: { spr: 'bronk_walk', fps: 16 },
  eat: { fps: 7 }, play: { fps: 8 }, shock: { fps: 6 }, drive: { fps: 8 },
  sing: { spr: 'bronk_sing', fps: 5 }, sleep: { spr: 'bronk_sleep', fps: 1.2 },
  dash: { spr: 'bronk_dash', fps: 15 }, kick: { spr: 'bronk_dash', fps: 12 },
  hurt: { spr: 'bronk_hurt', fps: 1, loop: false },
});
defClips('vela', { idle: { fps: 2.2 }, walk: { fps: 10 }, cook: { fps: 6 }, cry: { fps: 5 } });
defClips('kid_a', { idle: { fps: 2.6 }, walk: { fps: 11 }, eat: { fps: 8 } });
defClips('kid_b', { idle: { fps: 2.6 }, walk: { fps: 11 }, eat: { fps: 8 } });
defClips('villager', { idle: { fps: 2 }, walk: { fps: 9 } });
defClips('villager2', { idle: { fps: 2 }, walk: { fps: 9 } });
defClips('elder', { idle: { fps: 1.4 } });
defClips('brute', { idle: { fps: 2 }, walk: { fps: 8 } });
defClips('blaze', { idle: { fps: 7 }, walk: { fps: 10 }, roar: { fps: 7 }, boss: { fps: 6 } });
defClips('trex', { idle: { fps: 1.8 }, walk: { fps: 7 }, roar: { fps: 5 } });
// dream only
defClips('mammoth', { idle: { fps: 1.6 }, walk: { fps: 6 }, trader: { fps: 1.6 }, shower: { fps: 5 } });
for (const b of ['compy', 'dodo', 'boar', 'raptor', 'tricera', 'lizard', 'stego']) defClips(b, { idle: { fps: 2.4 }, walk: { fps: 9 } });
defClips('ptero', { idle: { spr: 'ptero_fly', fps: 8 }, walk: { spr: 'ptero_fly', fps: 10 }, fly: { fps: 8 } });
defClips('tarblob', { idle: { fps: 5 }, walk: { spr: 'tarblob_idle', fps: 7 } });

class Actor {
  constructor(o = {}) {
    this.base = o.base || 'bronk';
    this.x = o.x || 0; this.y = o.y || 0; this.z = 0;      // z = hop height
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.scale = o.scale || 1; this.facing = o.facing || 1;
    this.clip = null; this.clipName = ''; this.t = 0; this.frame = 0; this.loops = 0;
    this.sx = 1; this.sy = 1;                                // squash / stretch
    this.bob = 0; this.bobAmp = o.bobAmp ?? 0; this.bobRate = o.bobRate ?? 6;
    this.tint = null; this.tintT = 0; this.alpha = 1; this.rot = 0; this.rotVel = 0;
    this.shadow = o.shadow !== false; this.shadowW = o.shadowW || 0;
    this.visible = true; this.speed = o.speed || 120; this.onFrame = null;
    this.play(o.clip || 'idle');
  }
  get sprite() { return this.clip ? this.clip.spr : this.base + '_idle'; }
  play(name, o = {}) {
    const table = CLIPS[this.base] || {};
    const c = table[name] || table.idle;
    if (!c) return;
    if (this.clipName === name && !o.restart) return;
    this.clipName = name; this.clip = c; this.t = 0; this.frame = 0; this.loops = 0;
    this.fpsMul = o.fps ? o.fps / c.fps : 1;
  }
  squash(a = 0.25) { this.sx = 1 + a; this.sy = 1 - a; }
  stretch(a = 0.25) { this.sx = 1 - a; this.sy = 1 + a; }
  hop(v = 220) { this.vz = v; }
  flash(color = '#ffffff', t = 0.12) { this.tint = color; this.tintT = t; }
  moveTo(x, y, dt, speed) {
    const sp = speed ?? this.speed, dx = x - this.x, dy = y - this.y, d = Math.hypot(dx, dy);
    if (d < 2) { this.x = x; this.y = y; return true; }
    const s = Math.min(d, sp * dt);
    this.x += dx / d * s; this.y += dy / d * s;
    if (Math.abs(dx) > 2) this.facing = dx > 0 ? 1 : -1;
    return false;
  }
  update(dt) {
    if (this.clip) {
      const fps = this.clip.fps * (this.fpsMul || 1);
      this.t += dt * fps;
      const n = Gfx.frames(this.clip.spr);
      if (this.clip.loop === false) { this.frame = Math.min(n - 1, Math.floor(this.t)); }
      else {
        const f = Math.floor(this.t) % n;
        if (f < this.frame) this.loops++;
        this.frame = f;
      }
      if (this.onFrame) this.onFrame(this.frame);
    }
    this.sx = damp(this.sx, 1, 14, dt); this.sy = damp(this.sy, 1, 14, dt);
    if (this.vz !== 0 || this.z > 0) { this.vz -= 900 * dt; this.z += this.vz * dt; if (this.z <= 0) { this.z = 0; if (this.vz < -120) this.squash(Math.min(0.3, -this.vz / 1400)); this.vz = 0; } }
    // the bounce: driven by the clip's own frame clock so it lands with the art
    const c = this.clip;
    if (c && (c.bob || c.squish)) {
      // two humps per cycle - one per footfall - however many frames it has
      const n = Math.max(1, Gfx.frames(c.spr));
      const ph = c.loop === false ? clamp(this.t / n, 0, 1) * Math.PI : this.t * Math.PI * 2 / n;
      const lift = Math.abs(Math.sin(ph));
      this.bob = -lift * (c.bob || 0) * (this.bounce ?? 1);
      if (c.squish) {
        const q = Math.cos(ph * 2) * c.squish * (this.bounce ?? 1);
        this.sx = damp(this.sx, 1 - q, 14, dt); this.sy = damp(this.sy, 1 + q, 14, dt);
      }
    } else if (this.bobAmp) this.bob = Math.sin(Time.t * this.bobRate) * this.bobAmp;
    if (this.tintT > 0) { this.tintT -= dt; if (this.tintT <= 0) this.tint = null; }
    this.rot += this.rotVel * dt;
  }
  draw(o = {}) {
    if (!this.visible) return;
    const spr = this.sprite;
    const s = Gfx.spr(spr), w = s.w * this.scale;
    if (this.shadow) {
      const sw = (this.shadowW || w * 0.6) * clamp(1 - this.z / 260, 0.45, 1);
      Gfx.shadow(this.x, this.y + 1, sw, 0.32 * clamp(1 - this.z / 300, 0.3, 1));
    }
    Gfx.sprite(spr, this.x, this.y - this.z + this.bob, {
      scale: this.scale, frame: this.frame, flip: this.facing < 0,
      sx: this.sx, sy: this.sy, rot: this.rot, alpha: this.alpha * (o.alpha ?? 1),
      tint: this.tint, anchor: 'bc',
    });
  }
  get top() { return this.y - this.z - Gfx.spr(this.sprite).h * this.scale; }
  get height() { return Gfx.spr(this.sprite).h * this.scale; }
  get cx() { return this.x; }
  get cy() { return this.y - this.z - Gfx.spr(this.sprite).h * this.scale / 2; }
}

// ------------------------------------------------------------------- effects
const FX = {
  list: [],
  play(spr, x, y, o = {}) {
    this.list.push({
      spr, x, y, t: 0, fps: o.fps || 18, scale: o.scale || 1, rot: o.rot || 0, flip: o.flip,
      alpha: o.alpha ?? 1, world: o.world !== false, additive: o.additive, follow: o.follow,
      dx: o.dx || 0, dy: o.dy || 0, tint: o.tint,
    });
  },
  burst(x, y, o) { this.play('fx_burst', x, y, Object.assign({ scale: 1.2 }, o)); },
  ring(x, y, o) { this.play('fx_ring', x, y, Object.assign({ fps: 16 }, o)); },
  slash(x, y, o) { this.play('fx_slash', x, y, Object.assign({ fps: 20 }, o)); },
  smoke(x, y, o) { this.play('fx_smoke', x, y, Object.assign({ fps: 12 }, o)); },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i]; f.t += dt * f.fps;
      if (f.follow) { f.x = f.follow.x + f.dx; f.y = f.follow.y - (f.follow.z || 0) + f.dy; }
      if (f.t >= Gfx.frames(f.spr)) this.list.splice(i, 1);
    }
  },
  draw(world) {
    for (const f of this.list) {
      if (!!f.world !== !!world) continue;
      Gfx.sprite(f.spr, f.x, f.y, { anchor: 'c', frame: Math.floor(f.t), scale: f.scale, rot: f.rot, flip: f.flip, alpha: f.alpha, additive: f.additive, tint: f.tint });
    }
  },
  clear() { this.list.length = 0; }
};

// ------------------------------------------------------------------- emotes
const Emotes = {
  list: [],
  show(actor, kind, t = 1.1) { this.list.push({ actor, kind, t, life: t, pop: 0 }); },
  update(dt) { for (let i = this.list.length - 1; i >= 0; i--) { const e = this.list[i]; e.t -= dt; e.pop = Math.min(1, e.pop + dt * 8); if (e.t <= 0) this.list.splice(i, 1); } },
  draw() {
    for (const e of this.list) {
      const a = e.actor; if (!a) continue;
      const spr = e.kind === '!' ? 'fx_exclaim' : e.kind === '?' ? 'fx_question' : e.kind === 'anger' ? 'fx_anger' : 'fx_sweat';
      const k = Ease.outBack(e.pop);
      const y = a.top - 12 - Math.sin(Time.t * 8) * 2;
      Gfx.sprite(spr, a.x, y, { anchor: 'c', scale: k * 1.1, frame: Math.floor(Time.t * 8) });
    }
  },
  clear() { this.list.length = 0; }
};
