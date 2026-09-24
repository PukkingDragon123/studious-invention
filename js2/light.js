// ---------------------------------------------------------------------------
// light.js - the light pass. Every scene is painted fully lit, and then this
// takes the light away again everywhere except where something is shining.
//
// It works on a quarter-resolution light map: the ambient dark is laid over
// the whole frame, each light source rubs a hole in it, and the map is then
// stretched back over the scene with smoothing off. The quarter resolution is
// the look, not a shortcut - the falloff comes out in chunky 4px steps that
// sit with the pixel art instead of fighting it. After the dark comes the
// warmth: an additive glow for each light, god rays, a colour grade and a
// vignette, all in screen space.
//
// Lights are added in WORLD coordinates while the world transform is still on
// the main context, so any stage - a Camera, a MiniGame.stage, the overworld -
// can use it without knowing how the others place their cameras.
// ---------------------------------------------------------------------------
'use strict';

const Light = {
  Q: 4,                        // light map is W/Q x H/Q
  canvas: null, ctx: null,
  list: [], rays: [], on: false, ambient: 0, dark: '#0b0718',
  init() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.ceil(W / this.Q); this.canvas.height = Math.ceil(H / this.Q);
    this.ctx = this.canvas.getContext('2d');
  },
  // Start a lit frame. `ambient` is how dark the unlit parts get (0..1),
  // `dark` the colour the dark is. Call it with the world transform active.
  begin(ambient = 0.5, dark = '#0b0718') {
    if (!this.canvas) this.init();
    this.list.length = 0; this.rays.length = 0; this.boxes = [];
    this.ambient = ambient; this.dark = dark; this.on = true;
  },
  // world -> screen, through whatever transform the main context has now
  _xf(x, y, r) {
    const m = Gfx.ctx.getTransform();
    return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f, r: r * Math.hypot(m.a, m.b) };
  },
  // A point light. r is its reach in world pixels, `power` how completely it
  // clears the dark at its heart (0..1), `glow` how much colour it adds.
  point(x, y, r, o = {}) {
    if (!this.on) return;
    const p = this._xf(x, y, r);
    if (p.x < -p.r || p.x > W + p.r || p.y < -p.r || p.y > H + p.r) return;
    const flick = o.flicker ? 1 + Math.sin(Time.t * 17 + x * 0.1) * o.flicker * 0.5 + Math.sin(Time.t * 31 + y) * o.flicker * 0.5 : 1;
    this.list.push({ x: p.x, y: p.y, r: p.r * flick, power: o.power ?? 1, color: o.color || '#ffa832',
      glow: o.glow ?? 0.18, core: o.core ?? 0.3 });
  },
  // A shaft of light: from (x, y), pointing along `ang`, `len` long and
  // `spread` wide at the far end. Morning through a crack, sun through dust.
  ray(x, y, ang, len, w0, w1, o = {}) {
    if (!this.on) return;
    const a = this._xf(x, y, len);
    const s = Math.hypot(Gfx.ctx.getTransform().a, Gfx.ctx.getTransform().b);
    this.rays.push({ x: a.x, y: a.y, ang, len: len * s, w0: w0 * s, w1: w1 * s,
      color: o.color || '#ffe08a', a: o.alpha ?? 0.16, clear: o.clear ?? 0.5 });
  },
  // A region of open daylight: clears the dark inside a world-space box,
  // feathered at the left and right edges so a doorway is a soft transition.
  box(x0, y0, x1, y1, o = {}) {
    if (!this.on) return;
    const a = this._xf(x0, y0, 0), b = this._xf(x1, y1, 0);
    const f = (o.feather ?? 60) * Math.hypot(Gfx.ctx.getTransform().a, Gfx.ctx.getTransform().b);
    this.boxes = this.boxes || [];
    this.boxes.push({ x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y),
      power: o.power ?? 1, f });
  },
  // Composite the dark and the warmth over the frame. Screen space from here.
  end() {
    if (!this.on) return;
    this.on = false;
    const L = this.ctx, Q = this.Q, gw = this.canvas.width, gh = this.canvas.height;
    L.setTransform(1, 0, 0, 1, 0, 0);
    L.globalCompositeOperation = 'source-over';
    L.clearRect(0, 0, gw, gh);
    if (this.ambient > 0.001) {
      L.globalAlpha = this.ambient; L.fillStyle = this.dark; L.fillRect(0, 0, gw, gh);
      L.globalAlpha = 1;
      // each light rubs its hole out of the dark, in hard bands
      L.globalCompositeOperation = 'destination-out';
      for (const l of this.list) {
        const g = L.createRadialGradient(l.x / Q, l.y / Q, 0, l.x / Q, l.y / Q, l.r / Q);
        const P = l.power;
        g.addColorStop(0, `rgba(0,0,0,${P})`);
        g.addColorStop(0.34, `rgba(0,0,0,${P})`);
        g.addColorStop(0.35, `rgba(0,0,0,${P * 0.74})`);
        g.addColorStop(0.60, `rgba(0,0,0,${P * 0.74})`);
        g.addColorStop(0.61, `rgba(0,0,0,${P * 0.44})`);
        g.addColorStop(0.84, `rgba(0,0,0,${P * 0.44})`);
        g.addColorStop(0.85, `rgba(0,0,0,${P * 0.16})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        L.fillStyle = g;
        L.fillRect((l.x - l.r) / Q, (l.y - l.r) / Q, l.r * 2 / Q, l.r * 2 / Q);
      }
      for (const b of (this.boxes || [])) {            // daylight, where there is sky
        const x0 = b.x0 / Q, x1 = b.x1 / Q, f = Math.max(1, b.f / Q);
        const g = L.createLinearGradient(x0 - f, 0, x1 + f, 0);
        const w = (x1 - x0) + f * 2, fk = f / Math.max(1, w);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(Math.min(0.49, fk), `rgba(0,0,0,${b.power})`);
        g.addColorStop(Math.max(0.51, 1 - fk), `rgba(0,0,0,${b.power})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        L.fillStyle = g;
        L.fillRect(x0 - f, b.y0 / Q, w, (b.y1 - b.y0) / Q);
      }
      this.boxes = [];
      for (const r of this.rays) {                     // rays clear a path through the dark too
        L.save();
        L.translate(r.x / Q, r.y / Q); L.rotate(r.ang);
        L.globalAlpha = r.clear;
        const g = L.createLinearGradient(0, 0, r.len / Q, 0);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        L.fillStyle = g;
        L.beginPath();
        L.moveTo(0, -r.w0 / 2 / Q); L.lineTo(r.len / Q, -r.w1 / 2 / Q);
        L.lineTo(r.len / Q, r.w1 / 2 / Q); L.lineTo(0, r.w0 / 2 / Q); L.closePath(); L.fill();
        L.restore();
      }
      L.globalCompositeOperation = 'source-over';
    }
    const c = Gfx.ctx;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (this.ambient > 0.001) {
      c.imageSmoothingEnabled = false;
      c.drawImage(this.canvas, 0, 0, gw * Q, gh * Q);
    }
    // the warmth: additive, so it brightens what it lands on instead of fogging it
    c.globalCompositeOperation = 'lighter';
    for (const l of this.list) {
      if (l.glow <= 0) continue;
      const g = c.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.9);
      g.addColorStop(0, l.color); g.addColorStop(l.core, l.color); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalAlpha = l.glow; c.fillStyle = g;
      c.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
    for (const r of this.rays) {
      c.save();
      c.translate(r.x, r.y); c.rotate(r.ang);
      const g = c.createLinearGradient(0, 0, r.len, 0);
      g.addColorStop(0, r.color); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalAlpha = r.a; c.fillStyle = g;
      c.beginPath();
      c.moveTo(0, -r.w0 / 2); c.lineTo(r.len, -r.w1 / 2); c.lineTo(r.len, r.w1 / 2); c.lineTo(0, r.w0 / 2);
      c.closePath(); c.fill();
      // dust turning in the shaft
      for (let i = 0; i < 10; i++) {
        const k = ((Time.t * 0.05 + i * 0.137) % 1);
        const d = k * r.len, wob = Math.sin(Time.t * 0.7 + i * 2.3) * (r.w0 + (r.w1 - r.w0) * k) * 0.35;
        c.globalAlpha = r.a * 2.2 * (1 - k);
        c.fillStyle = '#fffaea';
        c.fillRect(Math.round(d), Math.round(wob), 2, 2);
      }
      c.restore();
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.restore();
  },
  // A colour grade over the whole frame - warm for firelight, blue for night,
  // red for the evening the valley burned. Screen space.
  grade(color, a = 0.12, mode = 'soft-light') {
    const c = Gfx.ctx;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = mode; c.globalAlpha = a;
    c.fillStyle = color; c.fillRect(0, 0, W, H);
    c.restore();
  },
  // The corners of the frame, pulled into the dark.
  vignette(a = 0.45, color = '6,3,10') {
    const c = Gfx.ctx;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.36, W / 2, H / 2, H * 0.98);
    g.addColorStop(0, `rgba(${color},0)`); g.addColorStop(1, `rgba(${color},${a})`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.restore();
  },
};

// ---------------------------------------------------------------------------
// Where the light comes from, set by set. Each entry registers its lights in
// world space; `post` is the screen-space grade that goes on after. Adding a
// set here is all it takes for every stage that paints it to be lit.
// ---------------------------------------------------------------------------
const SetLight = {
  run(set, t, o = {}, camX = 0, extra = null) {
    const f = SetLight[set];
    if (typeof f !== 'function' || set === 'run' || set === 'post') return;
    f(t, o, camX);
    if (extra) extra();                 // whatever the scene itself is shining
    Light.end();
  },
  post(set, o = {}) {
    const g = SetLight.GRADE[set];
    if (!g) return;
    const k = typeof g === 'function' ? g(o) : g;
    if (k.color) Light.grade(k.color, k.a ?? 0.1, k.mode || 'soft-light');
    Light.vignette(k.vig ?? 0.34);
  },
  GRADE: {
    home: o => o.night ? { color: '#3a4a9a', a: 0.22, vig: 0.5 } : o.dusk ? { color: '#ff7a3a', a: 0.16, vig: 0.42 } : { color: '#ffd6a0', a: 0.12, vig: 0.32 },
    quarry: { color: '#ff9a6a', a: 0.12, vig: 0.34 },
    road: o => o.scared ? { color: '#ff4a2a', a: 0.16, vig: 0.44 } : { color: '#ffe6b0', a: 0.10, vig: 0.24 },
    flight: { color: '#ff5a2a', a: 0.14, vig: 0.5 },
    camp: { color: '#ff9a3a', a: 0.10, vig: 0.46 },
  },

  // ---- the cave: dark inside, daylight in the yard, fire and lamps within
  home(t, o) {
    const night = !!o.night, dusk = !!o.dusk;
    Light.begin(night ? 0.66 : dusk ? 0.52 : 0.44, night ? '#060614' : '#0d0816');
    Light.box(HOME.door + 30, -600, HOME.end + 800, GY + 400, { power: night ? 0.3 : dusk ? 0.72 : 1, feather: 110 });
    for (const d of DOMES) {                               // the smoke hole in each dome
      Light.ray(d.x, GY - d.ry + 6, Math.PI / 2, d.ry, 40, 170,
        { color: night ? '#6aa9ee' : '#ffe08a', alpha: night ? 0.06 : 0.12, clear: night ? 0.3 : 0.62 });
      Light.point(d.x, GY - 6, 120, { color: night ? '#3570c0' : '#ffe08a', power: night ? 0.3 : 0.55, glow: 0.05 });
    }
    // moonlight, or morning, pooled on the bed so the sleeper reads
    Light.point(HOME.bed + 20, GY - 30, 130, { color: night ? '#6aa9ee' : '#a8d8ff', power: night ? 0.5 : 0.6, glow: 0.06 });
    // the fissure over the bed throws morning across the sleeping hollow
    Light.ray(HOME.bed + 44, 250, 0.95, 230, 18, 120,
      { color: night ? '#6aa9ee' : '#a8d8ff', alpha: night ? 0.06 : 0.12, clear: 0.5 });
    if (o.fire > 0)
      Light.point(HOME.stove, GY - 36, 300 * (0.6 + o.fire * 0.4), { color: '#ffa832', flicker: 0.1, glow: 0.22 * o.fire, core: 0.2 });
    for (const lx of HOME.lamps)                           // the lamps
      Light.point(lx, 282, 160, { color: '#ff9a20', flicker: 0.08, glow: 0.14 });
    for (const tx of [HOME.arch - 96, HOME.arch + 96])     // the torches by the arch
      Light.point(tx, 296, 150, { color: '#ffa832', flicker: 0.12, glow: 0.16 });
    Light.point(HOME.door - 20, GY - 60, 200, { color: night ? '#6aa9ee' : '#ffe98a', power: 0.7, glow: 0.08 });
  },

  // ---- the quarry at the end of the day: lamps, the mine mouths, the crystals
  quarry(t, o, camX) {
    Light.begin(0.30, '#140a14');
    Light.box(camX - 400, -600, camX + VW + 400, 240, { power: 1, feather: 1 });   // the sky stays sky
    for (let i = 0; i < 6; i++) {
      const mx = 260 + i * 520;
      Light.point(mx, 300, 190, { color: '#ff9a20', flicker: 0.08, glow: 0.18 });
    }
    for (const f of World.FOLK) if (f.job === 'lamp')
      Light.point(f.x + 29, GY - 76, 170, { color: '#ffa832', flicker: 0.1, glow: 0.2 });
    QUARRY.gems.forEach((g, i) => {
      if ((o.mined || 0) > i) return;
      const c = World.oreCols[[2, 1, 0][i]];
      Light.point(g.x, g.y, 120, { color: c[1], power: 0.8, glow: 0.24, flicker: 0.04 });
    });
    Light.point(QUARRY.box, GY - 60, 130, { color: '#ffe98a', power: 0.7, glow: 0.1 });
    Light.point(QUARRY.boss, GY - 80, 160, { color: '#ffa832', power: 0.7, glow: 0.08 });
  },

  // ---- the road: sun and dust in the morning; fire and a red sky in the evening
  road(t, o, camX) {
    const ev = !!o.scared;
    const sx = camX * 0.02 + 760, sy = ev ? 268 : 196;
    if (!ev) {
      Light.begin(0);
      for (let k = 0; k < 4; k++)
        Light.ray(sx, sy, 2.1 + k * 0.22, 520, 26, 150, { color: '#ffe08a', alpha: 0.07, clear: 0 });
      Light.point(sx, sy, 260, { color: '#ffe98a', glow: 0.16, core: 0.12 });
      return;
    }
    Light.begin(0.34, '#1a0610');
    Light.box(camX - 400, -600, camX + VW + 400, 330, { power: 0.9, feather: 1 });
    Light.point(sx, sy, 320, { color: '#ff7a2a', glow: 0.2, core: 0.1 });
    const BLOCK = 300, L = camX - 160, R = camX + VW + 160;
    for (let x = Math.floor(L / BLOCK) * BLOCK; x < R + BLOCK; x += BLOCK) {
      const i = Math.abs((x / BLOCK) | 0), hx = x + jitter(x, 60), kind = i % 5;
      if (kind === 0) Light.point(hx, GY - 36, 150, { color: '#ffa832', flicker: 0.1, glow: 0.16 });
      if (kind === 2) Light.point(hx - 8, GY - 72, 170, { color: '#ffa832', flicker: 0.05, glow: 0.14 });
    }
  },

  // ---- the flight: the whole valley on fire behind you
  flight(t, o, camX) {
    Light.begin(0.5, '#0a0612');
    // the sky is the brightest thing in this scene, so it is not darkened at all
    Light.box(camX - 400, -800, camX + VW + 400, 250, { power: 1, feather: 1 });
    Light.box(camX - 400, 250, camX + VW + 400, 330, { power: 0.55, feather: 1 });
    const bo = camX * 0.16, L = camX - 300, R = camX + VW + 300;
    for (let x = Math.floor((L + bo) / 128) * 128; x < R + bo; x += 128) {
      const i = Math.abs((x / 128) | 0);
      if (i % 3 === 1) continue;                               // the ones that are not burning
      Light.point(x - bo, 262, 170, { color: '#e06a1b', flicker: 0.14, glow: 0.08 });
    }
    Light.box(camX - 400, GY - 40, camX + VW + 400, GY + 400, { power: 0.34, feather: 1 });   // the road, lit by it all
  },

  // ---- the camp: one fire, and the dark it makes
  camp(t, o) {
    Light.begin(0.42, '#05040c');
    const FX2 = o.fireX ?? CAMP.fire;
    const lick = 0.8 + Math.sin(t * 9.3) * 0.13 + Math.sin(t * 22.7) * 0.07;
    Light.point(FX2, GY - 40, 380 * lick, { color: '#ffa832', flicker: 0.05, glow: 0.22, core: 0.16 });
    Light.point(300 - 0 * 0.03, -168, 240, { color: '#b177e6', power: 0.4, glow: 0.06 });
  },
};

// The valley overworld: daylight in the village, a green murk under the jungle
// canopy, and ash-dark on the volcano. The lights are the things in it -
// fires, gems, the altar, the gate torches, the trader's lamps - plus a little
// light of Bronk's own, so he is never lost in his own scene.
const VALLEY_LIGHT = {
  1: { ambient: 0.14, dark: '#10081a', grade: '#ffd9a8', a: 0.10, vig: 0.30 },
  2: { ambient: 0.40, dark: '#03120a', grade: '#6cc95c', a: 0.10, vig: 0.44 },
  3: { ambient: 0.48, dark: '#160604', grade: '#ff6a3a', a: 0.14, vig: 0.48 },
};
function lightValley(V) {
  const L = VALLEY_LIGHT[V.act] || VALLEY_LIGHT[1];
  Light.begin(L.ambient, L.dark);
  Light.point(V.player.x, V.player.y - 20, 150, { power: 0.55, glow: 0, color: '#ffe98a' });
  for (const e of V.zone.entities) {
    if (e instanceof Campfire) { if (!e.used) Light.point(e.x, e.y - 14, 220, { color: '#ffa832', flicker: 0.1, glow: 0.2, core: 0.18 }); }
    else if (e instanceof GemNode) { if (e.left > 0) Light.point(e.x, e.y - 24, 110, { color: GEM_COLS[e.kind][1], power: 0.8, glow: 0.22, flicker: 0.04 }); }
    else if (e instanceof Altar) Light.point(e.x, e.y - 50, 130, { color: '#b177e6', power: 0.85, glow: 0.2 });
    else if (e instanceof Gate) { for (const sd of [-1, 1]) Light.point(e.x, e.y + sd * 44 - 70, 120, { color: '#ffa832', flicker: 0.12, glow: 0.12 }); }
    else if (e instanceof Trader) { if (e.here > 0.5) Light.point(e.x, e.y - 110, 150, { color: '#ffe98a', flicker: 0.06, glow: 0.14 }); }
    else if (e instanceof FogNode) Light.point(e.x, e.y - 10, 90, { color: '#7c3eb2', power: 0.6, glow: 0.14 });
    else if (e instanceof ZoneGoal) Light.point(e.x, e.y - 50, 200, { color: '#e06a1b', flicker: 0.08, glow: 0.2 });
    else if (e instanceof Plate) { if (!e.pressed) Light.point(e.x, e.y, 60, { color: '#ffe98a', power: 0.6, glow: 0.08 }); }
  }
  Light.end();
}
function gradeValley(V) {
  const L = VALLEY_LIGHT[V.act] || VALLEY_LIGHT[1];
  Light.grade(L.grade, L.a);
  Light.vignette(L.vig);
}

// The fight: a stage, so it is lit like one. A pool on each performer, the
// set darker around them, and the act's colour over the lot.
function lightCombat(C) {
  const L = VALLEY_LIGHT[C.act] || VALLEY_LIGHT[1];
  Light.begin(Math.min(0.5, L.ambient + 0.16), L.dark);
  Light.point(C.bronk.x, C.bronk.y - 50, 230, { color: '#ffe08a', power: 0.9, glow: 0.10, core: 0.2 });
  for (const e of C.enemies) if (e.alive) Light.point(e.actor.x, e.actor.y - 50, 200, { color: '#ffd6a0', power: 0.85, glow: 0.05 });
  for (const tx of Backdrops.TORCHES) Light.point(tx, 250, 200, { color: '#ffa832', flicker: 0.1, glow: 0.18 });
  Light.box(-2000, -2000, 4000, 250, { power: 0.8, feather: 1 });
  Light.end();
}
function gradeCombat(C) {
  const L = VALLEY_LIGHT[C.act] || VALLEY_LIGHT[1];
  Light.grade(L.grade, L.a * 0.8);
  Light.vignette(L.vig * 0.9);
}

// Film: the last touches that make a cutscene a shot and not a screenshot.
const Film = {
  // a sparse, crawling grain - a few hundred specks, light and dark
  grain(a = 0.05) {
    const c = Gfx.ctx, seed = Math.floor(Time.t * 24);
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < 260; i++) {
      const h = Math.sin((i + seed * 131) * 12.9898) * 43758.5453, u = h - Math.floor(h);
      const h2 = Math.sin((i * 7 + seed * 17) * 78.233) * 12543.1234, v = h2 - Math.floor(h2);
      c.globalAlpha = a * (0.5 + (i % 3) * 0.3);
      c.fillStyle = i % 2 ? '#fffaea' : '#000000';
      c.fillRect(Math.floor(u * W), Math.floor(v * H), 2, 2);
    }
    c.restore();
  },
};
