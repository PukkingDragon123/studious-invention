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

// the family: every one of them can walk, play, eat, flinch and sleep
for (const b of ['bronk', 'vela', 'kid_a', 'kid_b']) defClips(b, {
  idle: { fps: 2.4 }, walk: { fps: 10 }, run: { spr: b + '_walk', fps: 16 }, dash: { spr: b + '_walk', fps: 18 },
  play: { fps: 8 }, sing: { spr: b + '_play', fps: 6 }, eat: { fps: 7 }, shock: { fps: 6 },
  sleep: { fps: 1.2 }, hurt: { fps: 1, loop: false }, kick: { spr: b + '_walk', fps: 12 },
});
defClips('elder', { idle: { fps: 1.4 } });
defClips('villager2', { idle: { fps: 2 }, walk: { fps: 9 } });
defClips('brute', { idle: { fps: 2 }, walk: { fps: 8 } });
defClips('kid_npc', { idle: { fps: 2.6 } });
defClips('blaze', { idle: { fps: 7 }, walk: { fps: 10 }, roar: { fps: 7 }, boss: { fps: 6 } });
defClips('trex', { idle: { fps: 1.8 }, walk: { fps: 7 }, roar: { fps: 5 } });
defClips('grandma', { idle: { fps: 1.8 }, walk: { fps: 6 }, cry: { fps: 4 }, roar: { fps: 5 }, boss: { spr: 'grandma_idle', fps: 1.8 } });
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
    // the life in them: a breath, a lean into the walk, a squash on turning
    this.seed = Math.random() * 10; this._lx = this.x; this.vx = 0; this.lean = 0; this._face = this.facing; this.fidgetT = 3 + Math.random() * 5;
    // a fighter's stance, the groove when it plays, a knock when it is hit
    this.stance = !!o.stance; this.groove = 0; this.tilt = 0; this.tiltV = 0;
    this.alive = o.alive !== false;
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
  knock(dir = -1, a = 1) { this.tiltV += dir * 7 * a * this.facing; this.squash(0.16 * a); }
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
    // the knock: a sprung tilt that wobbles back upright
    this.tiltV += (-this.tilt * 160 - this.tiltV * 11) * dt; this.tilt += this.tiltV * dt;
    this.groove = damp(this.groove, this.clipName === 'play' || this.clipName === 'sing' ? 1 : 0, 6, dt);
    // how fast it is going, from how far it went
    if (dt > 0) { const v = (this.x - this._lx) / dt; this.vx = damp(this.vx, clamp(v, -600, 600), 10, dt); }
    this._lx = this.x;
    this.lean = damp(this.lean, clamp(this.vx / 900, -0.1, 0.1), 8, dt);
    if (this.facing !== this._face) { this._face = this.facing; this.sx = 0.72; this.sy = 1.08; }   // a turn is a squash
    const idle = !this.clipName || this.clipName === 'idle' || this.clipName === 'sit';
    if (idle && this.alive && Math.abs(this.vx) < 5 && this.z === 0) {
      this.fidgetT -= dt;
      if (this.fidgetT <= 0) { this.fidgetT = 4 + Math.random() * 6; if (Math.random() < 0.5) this.squash(0.06); else this.stretch(0.05); }
    }
  }
  draw(o = {}) {
    if (!this.visible) return;
    const spr = this.sprite;
    const s = Gfx.spr(spr), w = s.w * this.scale;
    if (this.shadow) {
      const sw = (this.shadowW || w * 0.6) * clamp(1 - this.z / 260, 0.45, 1);
      Gfx.shadow(this.x, this.y + 1, sw, 0.32 * clamp(1 - this.z / 300, 0.3, 1));
    }
    // breathing when it is standing about, leaning when it moves
    const moving = Math.abs(this.vx) > 8, idle = !moving && this.z === 0 && this.alive;
    const breath = idle ? Math.sin(Time.t * 2.3 + this.seed) * 0.016 : 0;
    const sway = moving ? Math.sin(Time.t * 12 + this.seed) * 0.025 : 0;
    let dx = 0, dy = 0, qx = 1, qy = 1, tr = 0;
    // fighting stance: up on the toes, bouncing, the weight rocking foot to foot
    if (this.stance && idle && this.clipName === 'idle') {
      const b = Math.abs(Math.sin(Time.t * 5.2 + this.seed));
      dy -= b * 3 * this.scale; qy += (b - 0.5) * 0.05; qx -= (b - 0.5) * 0.04;
      dx += Math.sin(Time.t * 2.6 + this.seed) * 2 * this.scale; tr += Math.sin(Time.t * 2.6 + this.seed) * 0.035 * this.facing;
    }
    // the groove: a headbang on every beat of the song, harder on the one
    if (this.groove > 0.02 && typeof AudioSys !== 'undefined' && AudioSys.songStart) {
      const beat = (AudioSys.now() - AudioSys.songStart) / AudioSys.beatDur(), p = ((beat % 1) + 1) % 1;
      const hit = Math.pow(1 - p, 3) * this.groove * (Math.floor(beat) % 4 === 0 ? 1.4 : 1);
      tr += hit * 0.12 * this.facing; qy -= hit * 0.07; qx += hit * 0.05; dy += hit * 2;
      dx += Math.sin(beat * Math.PI) * 2.5 * this.groove;
    }
    Gfx.sprite(spr, this.x + dx, this.y - this.z + this.bob + dy, {
      scale: this.scale, frame: this.frame, flip: this.facing < 0,
      sx: this.sx * (1 - breath * 0.5) * qx, sy: this.sy * (1 + breath) * qy, rot: this.rot + this.lean + sway + tr + this.tilt, alpha: this.alpha * (o.alpha ?? 1),
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
  ring() { },                                   // no more ring bursts
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

// -------------------------------------------------------------- toon marks
// The drawn-on effects a cartoon uses instead of acting: surprise lines round
// a head, a tummy that rumbles in rings, stars, steam out of the ears, sweat
// flying off, hearts, and sound words with a burst behind them. All of them
// hang off an actor (or a point) in world space and clear themselves.
// pixel art for the cartoon bits: a steam puff, a rain cloud
const ToonArt = {
  puff: f => Pix.make('toon_puff' + f, 14, 12, P => {
    const R = ['#8a7f68', '#c4b89a', '#e8dfc6', '#f2ead4', '#fffaea'];
    P.ball(5 + f, 7, 4.2, R, 3.6); P.ball(9 - f * 0.5, 5, 3.6, R); P.ball(8, 8, 3, R);
  }, { ink: '#3b3048' }),
  cloud: () => Pix.make('toon_cloud', 40, 22, P => {
    const R = ['#3b3048', '#574a66', '#7a6d8a', '#a79bb4', '#c8c0d8'];
    P.ball(11, 13, 7, R, 6); P.ball(20, 9, 9, R, 8); P.ball(29, 13, 7, R, 6); P.ball(20, 15, 8, R, 5);
  }, { ink: '#120c16' }),
};

const Toon = {
  list: [],
  add(kind, at, o = {}) { const e = Object.assign({ kind, at, t: 0, life: o.life || 1, seed: Math.random() * 99 }, o); this.list.push(e); return e; },
  // a jolt: the pixel '!' pops over their head (the old radiating strokes are gone)
  shock(a, life = 0.7) { if (a && typeof Emotes !== 'undefined') Emotes.show(a, '!', life); return null; },
  rumble(a, life = 1.4) { if (a) a.squash && a.squash(0.12); return null; },
  stars(a, life = 2) { return this.add('stars', a, { life }); },
  steam(a, life = 1.6) { return this.add('steam', a, { life }); },
  sweat(a, life = 1.2) { return this.add('sweat', a, { life }); },
  hearts(a, life = 1.8) { return this.add('hearts', a, { life }); },
  focus() { return null; },
  word(x, y, text, o = {}) { return this.add('word', null, Object.assign({ x, y, text, life: 1.1, col: '#ffe98a', size: 2 }, o)); },
  head(a) { return { x: a.x + (a.facing || 1) * 2, y: a.top + 14 }; },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i]; e.t += dt;
      if (e.kind === 'sweat' && e.at && chance(dt * 14)) {
        const h = this.head(e.at), s = chance(0.5) ? -1 : 1;
        Particles.spawn(h.x + s * 8, h.y - 6, { n: 1, color: ['#a8d8ff', '#6aa9ee'], speed: 70, angle: -Math.PI / 2 + s * 0.9, spread: 0.3, gravity: 300, life: 0.6, size: 3, shape: 'drop' });
      }
      if (e.t >= e.life) this.list.splice(i, 1);
    }
  },
  draw(screen = false) {
    const ctx = Gfx.ctx;
    for (const e of this.list) {
      if ((e.kind === 'word') !== screen) continue;
      const k = e.t / e.life, fade = clamp(k < 0.15 ? k / 0.15 : (1 - k) / 0.3, 0, 1);
      const a = e.at, h = a ? this.head(a) : null;
      ctx.save(); ctx.globalAlpha = fade;
      if (e.kind === 'stars') {
        for (let j = 0; j < 4; j++) {
          const an = e.t * 4 + j * Math.PI / 2, sx = h.x + Math.cos(an) * 18, sy = h.y - 16 + Math.sin(an) * 5;
          const c = Math.sin(an) > 0 ? '#ffe98a' : '#e0b93a';
          Gfx.rect(sx - 1, sy - 4, 3, 9, '#120c16'); Gfx.rect(sx - 4, sy - 1, 9, 3, '#120c16');
          Gfx.rect(sx, sy - 3, 1, 7, c); Gfx.rect(sx - 3, sy, 7, 1, c); Gfx.rect(sx - 1, sy - 1, 3, 3, c);
        }
      } else if (e.kind === 'steam') {
        // puffs of pixel steam off an angry head
        for (let j = 0; j < 6; j++) {
          const q = ((e.t * 1.6) + j / 6) % 1, sd = j % 2 ? 1 : -1;
          const px = h.x + sd * (14 + q * 10), py = h.y - 4 - q * 22;
          ctx.globalAlpha = fade * (1 - q) * 0.95;
          Pix.draw(ToonArt.puff((j + (q * 3 | 0)) % 3), px, py, { scale: 0.5 + q * 0.6 });
        }
      } else if (e.kind === 'hearts') {
        for (let j = 0; j < 4; j++) {
          const q = ((e.t * 0.9) + j / 4) % 1;
          ctx.globalAlpha = fade * (1 - q);
          Gfx.sprite('icon_heart', h.x + Math.sin(e.t * 3 + j * 2) * 12 + (j - 1.5) * 6, h.y - 18 - q * 40, { anchor: 'c', scale: 0.6 + q * 0.4 });
        }
      } else if (e.kind === 'zzz') {
        // a sleeper's Zs, drifting up and growing
        ctx.globalAlpha = 1;
        const top = a.top + (a.y - a.top) * 0.3;
        for (let j = 0; j < 3; j++) {
          const q = ((e.t * 0.45) + j / 3) % 1, al = Math.sin(q * Math.PI);
          ctx.globalAlpha = al;
          Gfx.text('Z', a.x + (a.facing || 1) * -18 - q * 20 + Math.sin(q * 6) * 3, top - q * 34, { color: '#fffaea', scale: 1 + q * 1.4, outline: true });
        }
      } else if (e.kind === 'rain') {
        // a little grey pixel cloud of its own, raining on one sad head
        const cx = h.x, cy = h.y - 34 + Math.sin(e.t * 2) * 1.5;
        Pix.draw(ToonArt.cloud(), cx, cy, { scale: 0.5 });
        for (let j = 0; j < 5; j++) { const q = ((e.t * 2.2) + j / 5) % 1; Gfx.rect(Math.round(cx - 10 + j * 5), Math.round(cy + 9 + q * 16), 1, 3, '#6aa9ee'); }
      } else if (e.kind === 'word') {
        // a sound word in a white pixel burst with a black ink line: it slams
        // in oversized, squashes, wobbles, and pops away. The same size on
        // screen however close the camera has come.
        const sc0 = Game.scene && (Game.scene.stage ? Game.scene.stage.cam : Game.scene.cam);
        const P = sc0 && sc0.toScreen ? sc0.toScreen(e.x, e.y) : { x: e.x, y: e.y };
        const inK = clamp(k * 5, 0, 1), g = inK < 1 ? Ease.outBack(inK) * 1.15 : 1 + Math.max(0, 0.15 - (k - 0.2) * 0.6);
        const out = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
        const ts = Math.max(1.5, Math.round(e.size * 1.2 * 2) / 2);
        const tw = Gfx.measure(e.text, ts, 'rock'), th = Gfx.lineHeight(ts, 'rock');
        const bw = Math.round(tw + 30), bh = Math.round(th + 18);
        const wob = Math.sin(e.seed + e.t * 11) * 0.05;
        ctx.save();
        ctx.translate(P.x, P.y - k * 14);
        ctx.rotate((e.tilt ?? -0.08) + wob);
        ctx.scale(g * out * (1 + Math.sin(e.t * 22) * 0.03 * (1 - k)), g * out * (1 - Math.sin(e.t * 22) * 0.03 * (1 - k)));
        Bubble.draw('pow', -bw / 2, -bh / 2, bw, bh, null, e.t);
        // black letters with a colour kick under them, like a comic sound word
        Gfx.text(e.text, 2, -th / 2 + 3, { color: e.col && e.col !== '#fffaea' && e.col !== '#e8dfc6' ? e.col : '#c2333c', scale: ts, align: 'center', font: 'rock' });
        Gfx.text(e.text, 0, -th / 2 + 1, { color: '#08060c', scale: ts, align: 'center', font: 'rock' });
        ctx.restore();
      }
      ctx.restore();
    }
  },
  drop(a) { this.list = this.list.filter(e => e.at !== a); },
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
