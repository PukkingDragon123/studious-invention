// ---------------------------------------------------------------------------
// light.js - where the light comes from, scene by scene. The lighting itself
// is done by the post pass (post.js); this is the older, friendlier way of
// asking for it: an ambient dark, some points of light, a box of daylight,
// a grade. Lights are given in WORLD coordinates while the world transform is
// on the context, so any stage can light itself without knowing the camera.
// ---------------------------------------------------------------------------
'use strict';

const Light = {
  // how dark the unlit parts are, and what colour the dark is
  begin(ambient = 0.5, dark = '#0b0718') {
    const d = [parseInt(dark.slice(1, 3), 16) / 255, parseInt(dark.slice(3, 5), 16) / 255, parseInt(dark.slice(5, 7), 16) / 255];
    Post.set({ amb: d.map(v => clamp((1 - ambient) + ambient * v * 3, 0, 1)) });
  },
  // a light source: reach r in world pixels, `power` how much of the dark it
  // clears, `glow` how much colour it adds
  point(x, y, r, o = {}) {
    Post.light(x, y, r, o.color || '#ffa832', clamp((o.power ?? 1) * 0.5 + (o.glow ?? 0.18) * 1.6, 0.05, 1.3), o.flicker || 0);
  },
  // shafts of light were airbrushed wedges; they are gone
  ray() { },
  // open daylight: a box of world where the dark does not reach
  box(x0, y0, x1, y1, o = {}) { Post.box(x0, y0, x1, y1, o.power ?? 1, o.feather ?? 60); },
  end() { },
  grade(color, a = 0.12) { Post.set({ tint: color, ta: clamp(a * 1.6, 0, 0.5) }); },
  vignette(a = 0.45) { Post.set({ vig: a * 0.85 }); },
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

  // ---- the camp: one fire, and the dark it makes
  camp(t, o) {
    Light.begin(0.42, '#05040c');
    const FX2 = o.fireX ?? CAMP.fire;
    const lick = 0.8 + Math.sin(t * 9.3) * 0.13 + Math.sin(t * 22.7) * 0.07;
    Light.point(FX2, GY - 40, 380 * lick, { color: '#ffa832', flicker: 0.05, glow: 0.22, core: 0.16 });
    Light.point(300 - 0 * 0.03, -168, 240, { color: '#b177e6', power: 0.4, glow: 0.06 });
  },
};

// The fight: a stage, so it is lit like one. A pool on each performer, the
// set darker around them, and the act's colour over the lot.
function lightCombat(C) {
  Post.grade(C.act, true);
  Light.point(C.me.x, C.me.y - 60, 240, { color: '#ffe08a', power: 0.5, glow: 0.1 });
  for (const e of C.enemies) if (e.alive) Light.point(e.actor.x, e.actor.y - 50, 210, { color: '#ffd6a0', power: 0.4, glow: 0.06 });
  for (const tx of Backdrops.TORCHES) Light.point(tx, 250, 210, { color: '#ffa832', flicker: 0.1, power: 0.6, glow: 0.2 });
}
function gradeCombat(C) { }

// Film: the last touches that make a cutscene a shot and not a screenshot.
const Film = {
  grain(a = 0.05) { Post.set({ grain: a * 0.7 }); },
};
