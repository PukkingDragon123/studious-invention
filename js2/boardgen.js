// ---------------------------------------------------------------------------
// boardgen.js - the road to the lair, laid out one land at a time.
//
// Five lands between the cave and Grandma Rex's mountain. Each is a board: a
// long path of stone tiles running left to right across painted country,
// forking into two lanes and joining again, with dead-end side trails that
// climb to caves and secrets. The same seed always lays the same board, so a
// saved run only has to remember what has happened on it, not what it is.
//
//   BIOMES        what each land is made of, what lives there, who rules it
//   Board         lays a land out: the tile graph, what every tile is, the
//                 rivers and lava and ice the path crosses, the scenery
//   BoardBake     paints the ground a pixel at a time, in chunks, as the
//                 camera gets to them
//   BoardArt      the stone tile slabs, baked once per ground
// ---------------------------------------------------------------------------
'use strict';

const BSTEP = 64;          // world px between tile centres along a lane
const BOARD_H = 430;       // how tall a board is, sky included
const HORIZON = 176;       // where the ground meets the far country
const LANE_CY = 264;       // the middle of the road, before it wanders

const BIOMES = {
  1: {
    key: 'fern', name: 'FERN VALLEY', sub: 'home, and the road out of it', len: 34,
    base: 'grass', ground: 'meadow', music: 'map', weather: 'pollen',
    features: [{ type: 'river', at: 0.2 }, { type: 'rocks', at: 0.46, w: 120 }, { type: 'river', at: 0.7 }, { type: 'bones', at: 0.88, w: 70 }],
    forks: [['stone', 'grass'], ['wet', 'grass'], ['grass', 'bone']],
    weights: { path: 13, berries: 7, meat: 2, gem: 9, card: 6, charm: 6, trap: 4, rocks: 2, battle: 10, event: 11, npc: 6, choice: 6, totem: 2, vine: 2 },
    dinos: ['boar', 'raptor'], nDinos: 2,
    boss: { ids: ['blaze'], name: 'BLAZE', sub: 'the family cook, gone feral', spr: 'blaze_boss', rescue: 1 },
    sky: ['#2b5aa6', '#3f74c0', '#5a92d6', '#7eb0e6', '#a8cff2', '#d4ecfa'],
    far: { seed: 111, base: 0.74, amp: 92, mid: 3.2, ramp: ['#3b4a7a', '#4a5c8c', '#5b6e9e', '#6d82b0', '#8298c2', '#9cb0d4'], snow: ['#a4b4d8', '#c8d4ec', '#e8eef9', '#ffffff'], snowLine: 0.42, haze: '#c0d4ee', hazeK: 0.85 },
    mid: { seed: 212, base: 0.66, amp: 64, mid: 2.8, ramp: ['#3a3a5c', '#48476a', '#57557a', '#686589', '#7a7699', '#8e89a9'], haze: '#a8bcdc', hazeK: 0.5, volcano: { x: 760, w: 70, h: 64 } },
    near: { kind: 'woods', seed: 313, base: 0.7, amp: 20, mid: 2.6, r0: 9, r1: 19, tall: 1, gap: 0.9, band: 12, ramp: ['#123a20', '#1a4c28', '#235f30', '#2f773a', '#3f9446', '#5aae52'] },
    props: {
      back: ['v_tree', 'v_tree_big', 'v_tree_fruit', 'v_tree', 'v_pine', 'v_bush', 'v_bush_berry'],
      mid: ['v_fern', 'v_flowers', 'v_rock', 'v_stump', 'v_mushroom', 'v_bush', 'v_flowers', 'v_fern'],
      front: ['v_bush', 'v_fern', 'v_bush_berry', 'v_rock', 'v_tree'],
    },
  },
  2: {
    key: 'jungle', name: 'DRIZZLE JUNGLE', sub: 'it has been raining here since the ice melted', len: 38,
    base: 'grass', ground: 'jungle', music: 'event', weather: 'rain',
    features: [{ type: 'river', at: 0.14, w: 1.3 }, { type: 'cave', at: 0.4, w: 90 }, { type: 'river', at: 0.56 }, { type: 'river', at: 0.84, w: 1.2 }],
    forks: [['wet', 'grass'], ['dark', 'wet'], ['grass', 'wet']],
    weights: { path: 12, berries: 8, meat: 2, gem: 9, card: 6, charm: 6, trap: 5, rocks: 1, battle: 11, event: 11, npc: 5, choice: 6, totem: 2, vine: 4, geyser: 2 },
    dinos: ['raptor', 'ptero', 'stego'], nDinos: 3,
    boss: { ids: ['horace'], name: 'HORACE', sub: 'a triceratops who has had enough', spr: 'tricera_idle', rescue: 2 },
    sky: ['#17333a', '#1f4648', '#2a5a58', '#3a716a', '#548a7e', '#76a494'],
    far: { seed: 121, base: 0.7, amp: 86, mid: 3, ramp: ['#1e3a44', '#264852', '#305660', '#3c666e', '#4a767c', '#5c888c'], snow: [], haze: '#7aa49a', hazeK: 0.95 },
    mid: { seed: 222, base: 0.62, amp: 70, mid: 2.8, ramp: ['#16302e', '#1c3c38', '#244a42', '#2e584c', '#3a6858', '#4a7a66'], haze: '#6a9a8a', hazeK: 0.6, volcano: { x: 640, w: 90, h: 80 } },
    near: { kind: 'woods', seed: 323, base: 0.74, amp: 26, mid: 2.4, r0: 14, r1: 28, tall: 1.2, gap: 0.8, band: 10, ramp: ['#08221a', '#0e3022', '#15402c', '#1e5236', '#296640', '#387c4a'] },
    props: {
      back: ['v_tree_jungle', 'v_palm', 'v_tree_jungle', 'v_bush_jungle', 'v_palm', 'v_tree_jungle'],
      mid: ['v_fern', 'v_bush_jungle', 'v_mushroom', 'v_fern', 'v_rock', 'v_flowers'],
      front: ['v_bush_jungle', 'v_fern', 'v_palm', 'v_bush_jungle'],
    },
  },
  3: {
    key: 'badlands', name: 'BONEBAKE BADLANDS', sub: 'where the big ones came to die', len: 40,
    base: 'sand', ground: 'sand', music: 'village', weather: 'heat',
    features: [{ type: 'bones', at: 0.16, w: 150 }, { type: 'tar', at: 0.34 }, { type: 'vents', at: 0.52, w: 100 }, { type: 'bones', at: 0.7, w: 160 }, { type: 'tar', at: 0.86 }],
    forks: [['bone', 'sand'], ['hot', 'stone'], ['sand', 'bone']],
    weights: { path: 12, berries: 4, meat: 3, gem: 10, card: 6, charm: 6, trap: 6, rocks: 3, battle: 11, event: 11, npc: 5, choice: 6, totem: 2, vine: 1, tar: 3 },
    dinos: ['lizard', 'tarblob', 'raptor'], nDinos: 3,
    boss: { ids: ['tarking'], name: 'THE TAR KING', sub: 'he rose out of the pit and never stopped', spr: 'tarblob_idle', rescue: 3 },
    sky: ['#5c2a2a', '#8a3a2a', '#b8582e', '#d67a3a', '#eaa052', '#f4c67a'],
    far: { seed: 131, base: 0.74, amp: 60, mid: 3, ramp: ['#6a3a3a', '#7c4640', '#8e5448', '#a06450', '#b2765a', '#c48a66'], snow: [], haze: '#e8a878', hazeK: 0.9 },
    mid: { seed: 232, base: 0.66, amp: 54, mid: 2.6, ramp: ['#4a2420', '#5c2e26', '#6e3a2c', '#824634', '#96543c', '#aa6446'], haze: '#d88c62', hazeK: 0.55, volcano: { x: 560, w: 120, h: 104 } },
    near: { kind: 'dunes', seed: 333, base: 0.62, amp: 30, ramp: ['#7a4428', '#92542e', '#aa6636', '#c07a40', '#d4904c', '#e6aa5e'] },
    props: {
      back: ['v_deadtree', 'v_rock_bare', 'v_deadtree', 'v_skull', 'v_rock_bare'],
      mid: ['v_bones', 'v_rock_bare', 'v_skull', 'v_pot', 'v_bones', 'v_stump'],
      front: ['v_rock_bare', 'v_bones', 'v_deadtree'],
    },
  },
  4: {
    key: 'peaks', name: 'FROSTFANG PEAKS', sub: 'the cold road over the top of the world', len: 40,
    base: 'stone', ground: 'snow', music: 'rest', weather: 'snow',
    features: [{ type: 'ice', at: 0.18 }, { type: 'river', at: 0.36, w: 0.8 }, { type: 'ice', at: 0.54 }, { type: 'cave', at: 0.7, w: 110 }, { type: 'ice', at: 0.88 }],
    forks: [['ice', 'stone'], ['dark', 'ice'], ['stone', 'ice']],
    weights: { path: 12, berries: 3, meat: 4, gem: 10, card: 6, charm: 7, trap: 5, rocks: 4, battle: 11, event: 11, npc: 5, choice: 6, totem: 2, vine: 1 },
    dinos: ['mammothw', 'ptero', 'raptor'], nDinos: 3,
    boss: { ids: ['rexmond'], name: 'REXMOND', sub: "Grandma's other grandson. He heard.", spr: 'trex_idle', rescue: 0 },
    sky: ['#4a5a8a', '#5c6e9e', '#7084b2', '#8a9cc4', '#a8b8d8', '#cad6ea'],
    far: { seed: 141, base: 0.8, amp: 130, mid: 3.4, ramp: ['#46507e', '#56628e', '#68749e', '#7c88ae', '#929ec0', '#aab4d2'], snow: ['#b8c4e0', '#d4dcee', '#eef2fa', '#ffffff'], snowLine: 0.7, haze: '#c8d4ea', hazeK: 0.7 },
    mid: { seed: 242, base: 0.7, amp: 100, mid: 3, ramp: ['#384068', '#444e78', '#525c88', '#626c98', '#747ea8', '#8892b8'], snow: ['#a8b4d4', '#c8d2e8', '#e4eaf6', '#ffffff'], snowLine: 0.55, haze: '#b0bcdc', hazeK: 0.45, volcano: { x: 480, w: 150, h: 130 } },
    near: { kind: 'woods', seed: 343, base: 0.74, amp: 22, mid: 2.6, r0: 7, r1: 14, tall: 1.9, gap: 0.8, band: 12, ramp: ['#1a2c38', '#223a46', '#2c4a54', '#385a64', '#9aaec8', '#e8f0fa'] },
    props: {
      back: ['v_pine', 'v_pine', 'v_rock_bare', 'v_pine', 'v_deadtree'],
      mid: ['v_rock_bare', 'v_stump', 'v_bones', 'v_rock', 'v_pine'],
      front: ['v_pine', 'v_rock_bare', 'v_rock'],
    },
    tint: { tint: '#e8f0ff', tintAmount: 0.28 },
  },
  5: {
    key: 'smoke', name: 'SMOKE MOUNTAIN', sub: 'Grandma Rex lives at the top', len: 42,
    base: 'stone', ground: 'ash', music: 'blaze', weather: 'ash',
    features: [{ type: 'lava', at: 0.14 }, { type: 'bones', at: 0.3, w: 90 }, { type: 'lava', at: 0.46 }, { type: 'cave', at: 0.62, w: 120 }, { type: 'lava', at: 0.8 }],
    forks: [['hot', 'dark'], ['bone', 'hot'], ['dark', 'stone']],
    weights: { path: 12, berries: 3, meat: 4, gem: 10, card: 6, charm: 6, trap: 6, rocks: 4, battle: 12, event: 10, npc: 4, choice: 6, totem: 2, geyser: 3, tar: 1 },
    dinos: ['trex', 'lizard', 'raptor'], nDinos: 3,
    boss: { ids: ['grandma'], name: 'GRANDMA REX', sub: 'she only wanted her boy back', spr: 'grandma_idle', rescue: 0, final: true },
    sky: ['#1a0a14', '#2e0e18', '#4a1418', '#6e1e18', '#94301a', '#b8481e'],
    far: { seed: 151, base: 0.76, amp: 80, mid: 3, ramp: ['#241420', '#301a28', '#3c2030', '#4a2838', '#583040', '#6a3a48'], snow: [], haze: '#8a3a2e', hazeK: 0.8 },
    mid: { seed: 252, base: 0.72, amp: 70, mid: 2.6, ramp: ['#1a1018', '#22141e', '#2c1a26', '#38202e', '#462838', '#563042'], haze: '#6e2a24', hazeK: 0.45, volcano: { x: 420, w: 230, h: 176 } },
    near: { kind: 'dunes', seed: 353, base: 0.62, amp: 24, ramp: ['#140e14', '#1e1520', '#281c2a', '#342434', '#402c40', '#4e3650'] },
    props: {
      back: ['v_rock_bare', 'v_deadtree', 'v_rock_bare', 'v_skull'],
      mid: ['v_rock_bare', 'v_bones', 'v_skull', 'v_stump'],
      front: ['v_rock_bare', 'v_deadtree', 'v_bones'],
    },
    tint: { tint: '#1a0e14', tintAmount: 0.45 },
  },
};
const BIOME_COUNT = 5;

// ground paints, one per land, and the special ground the features lay down
const GROUND = {
  meadow: { ramp: ['#1b3f20', '#245228', '#2f6830', '#3c7f38', '#4f9642', '#68ae4e'], path: ['#3f2716', '#553620', '#6c472a', '#835a36', '#9c7046'], worn: '#4a3a1c',
    specks: ['#ffb0cf', '#ffe98a', '#fffaea', '#c8a8f0'], tuft: ['#5aa84a', '#86c85e'], haze: [168, 200, 224], hazeK: 0.5 },
  jungle: { ramp: ['#0b2014', '#102c1a', '#173c22', '#1f4e2a', '#2a6232', '#387a3e'], path: ['#2a1c10', '#382616', '#4a331e', '#5e4228', '#735334'], worn: '#2c2412',
    specks: ['#ff7ab8', '#ffa832', '#86e8d2'], tuft: ['#3d8442', '#5aa84a'], haze: [100, 150, 140], hazeK: 0.62 },
  sand: { ramp: ['#704024', '#8a522e', '#a4663a', '#bc7c46', '#d49454', '#e8b068'], path: ['#5c3a20', '#6e4828', '#825832', '#98693e', '#ad7c4c'], worn: '#6a4428',
    specks: ['#fffaea', '#e8dfc6', '#c4b89a'], tuft: ['#9a9a4a', '#b8b25a'], haze: [240, 196, 140], hazeK: 0.55 },
  snow: { ramp: ['#7086b0', '#889ec4', '#a4b8d8', '#c0d0e8', '#d8e4f4', '#f0f6ff'], path: ['#4a4658', '#58546a', '#68647c', '#7a768e', '#8e8aa2'], worn: '#8a92aa',
    specks: ['#ffffff', '#a8d8ff'], tuft: ['#6a7a70', '#8a9a88'], haze: [216, 228, 244], hazeK: 0.45 },
  ash: { ramp: ['#150f16', '#1d1520', '#271c2a', '#312434', '#3d2c40', '#4b364e'], path: ['#2a1818', '#382020', '#482a28', '#583430', '#6a403a'], worn: '#3a1e18',
    specks: ['#e06a1b', '#ffa832', '#7d1d2b'], tuft: ['#4a3a4a', '#5c4a58'], haze: [120, 56, 50], hazeK: 0.5 },
};
const MATERIAL = {
  water: ['#10285e', '#16387a', '#1f4c98', '#2c64b6', '#4a86d2', '#7cb0ea'],
  foam: ['#a8d8ff', '#d8f0ff', '#ffffff'],
  bank: ['#2a2016', '#3a2c1c', '#4a3a24'],
  lava: ['#3f0e10', '#6e1a10', '#a82e10', '#dc5a18', '#ff9a30', '#ffe08a'],
  crust: ['#140a0e', '#221014', '#34161a'],
  ice: ['#3e66a0', '#5682bc', '#76a2d6', '#9ec2ea', '#c4e0f8', '#eaf6ff'],
  tar: ['#08060a', '#100c14', '#18121e', '#221a2a', '#302638', '#40344a'],
  rock: ['#2c2936', '#393646', '#4a4658', '#5e5a6e', '#747088', '#8e8aa2'],
  cave: ['#120a1a', '#1a1024', '#22162e', '#2c1c3a', '#382448', '#462e58'],
  crystal: ['#b177e6', '#86e8d2', '#ffb0cf'],
  bone: ['#8a7f68', '#c4b89a', '#e8dfc6', '#fffaea'],
};

// ------------------------------------------------------------------ layout
const Board = {
  // lay out biome `b` for this run's seed
  generate(seed, b) {
    const B = BIOMES[b];
    const R = new RNG(((seed >>> 0) ^ Math.imul(b, 0x9E3779B1)) >>> 0 || 7);
    const tiles = [];
    const add = (x, y, o = {}) => {
      const t = { id: tiles.length, x: Math.round(x), y: Math.round(y), next: [], prev: [], kind: 'path', terrain: B.base, lane: o.lane || 0, main: o.main !== false, spur: !!o.spur, idx: o.idx ?? -1 };
      tiles.push(t); return t;
    };
    const link = (a, c) => { a.next.push(c.id); c.prev.push(a.id); };
    const ph1 = R.float(0, 6.28), ph2 = R.float(0, 6.28);
    const wander = x => LANE_CY + 16 * Math.sin(x * 0.0041 + ph1) + 7 * Math.sin(x * 0.0109 + ph2);
    let x = 150, idx = 0;
    const start = add(x, wander(x), { idx: idx++ }); start.kind = 'start';
    let cur = start, left = B.len, last = 'plain';
    const forks = [], spurs = [];
    while (left > 0) {
      const room = left > 9 && idx > 3;
      if (room && last === 'plain' && R.chance(0.34)) {
        // two lanes, one tile apart in length, so no two rolls end on the same tile
        const k = R.int(3, 4), longUp = R.chance(0.5);
        const span = Math.round((k + 1) * BSTEP * 1.16);   // room for the longer lane's stones
        const lanes = [];
        for (const side of [-1, 1]) {
          const n = (side < 0) === longUp ? k + 1 : k;
          let prev = cur; const lane = [];
          for (let j = 1; j <= n; j++) {
            const u = j / (n + 1), lx = cur.x + span * u;
            const off = side * 40 * Math.sin(Math.PI * Math.min(1, u * 1.35 - 0.05)) + side * 5;
            const t = add(lx, wander(lx) + off, { lane: side, main: false });
            link(prev, t); prev = t; lane.push(t);
          }
          lanes.push({ side, tiles: lane, last: prev });
        }
        x = cur.x + span;
        const m = add(x, wander(x), { idx: idx++ });
        for (const L of lanes) link(L.last, m);
        forks.push({ at: cur, merge: m, lanes, flavour: R.pick(B.forks) });
        cur.kind = 'junction';
        cur = m; left -= 2; last = 'fork';
        continue;
      }
      x += BSTEP;
      const t = add(x, wander(x), { idx: idx++ });
      link(cur, t); cur = t; left--;
      if (idx > 3 && left > 3 && last !== 'spur' && R.chance(0.26)) {
        // a side trail up or down the slope to somewhere nobody walks
        const up = t.y > LANE_CY ? true : t.y < LANE_CY - 10 ? false : R.chance(0.5);
        const n = R.chance(0.35) ? 3 : 2;
        let prev = t; const trail = [];
        const free = (x, y) => !tiles.some(u => Math.abs(u.x - x) < 56 && Math.abs(u.y - y) < 30);
        for (let j = 1; j <= n; j++) {
          const sx = t.x + 22 + j * 26, sy = clamp(t.y + (up ? -1 : 1) * (34 + (j - 1) * 24), 208, 334);
          if (!free(sx, sy)) break;                       // no stone on top of another
          const s = add(sx, sy, { lane: up ? -2 : 2, main: false, spur: true });
          link(prev, s); prev = s; trail.push(s);
        }
        if (trail.length) { spurs.push({ from: t, tiles: trail }); last = 'spur'; } else last = 'plain';
      } else last = 'plain';
    }
    // the last stretch: a campfire, then the lair
    x += BSTEP * 1.3;
    const boss = add(x, wander(x) - 6, { idx: idx++ }); boss.kind = 'boss'; boss.big = true;
    link(cur, boss);
    const W = boss.x + 300;

    // --------------------------------------------------------- what's where
    const mainT = tiles.filter(t => t.main && t.kind === 'path' && t.idx > 0);
    const byIdx = f => { const want = Math.round(f * (idx - 1)); let best = null, bd = 1e9; for (const t of mainT) { if (t.kind !== 'path') continue; const d = Math.abs(t.idx - want); if (d < bd) { bd = d; best = t; } } return best; };
    const place = (f, kind) => { const t = byIdx(f); if (t) t.kind = kind; return t; };
    place(0.36 + R.float(-0.06, 0.06), 'trader');
    place(0.62 + R.float(-0.05, 0.05), 'altar');
    place(0.5 + R.float(-0.04, 0.04), 'camp');
    const pre = tiles.find(t => t.next.includes(boss.id)); if (pre && pre.kind === 'path') pre.kind = 'camp';
    // two big dinos, off in the lanes if there is a lane to put them in
    const dinoSpots = [0.32, 0.72].map(f => {
      const fk = forks.find(F => Math.abs(F.at.idx / idx - f) < 0.16 && !F.dino);
      if (fk) { fk.dino = true; const L = R.pick(fk.lanes).tiles; const t = L[Math.floor(L.length / 2)]; t.kind = 'dino'; return t; }
      return place(f + R.float(-0.04, 0.04), 'dino');
    });
    // spurs end somewhere worth the walk
    for (const s of spurs) {
      const end = s.tiles[s.tiles.length - 1];
      end.kind = R.chance(0.55) ? 'cave' : 'secret';
      if (end.kind === 'secret') end.hidden = true;
      for (const t of s.tiles.slice(0, -1)) t.kind = R.pick(['gem', 'charm', 'event', 'card', 'berries']);
    }
    // fork lanes: one is the hard way, one is the easy way
    for (const F of forks) {
      const [hard, easy] = R.chance(0.5) ? [F.lanes[0], F.lanes[1]] : [F.lanes[1], F.lanes[0]];
      for (const t of hard.tiles) if (t.kind === 'path') t.kind = R.weighted([{ w: 4, v: 'battle' }, { w: 3, v: 'gem' }, { w: 2, v: 'card' }, { w: 2, v: 'trap' }, { w: 2, v: 'rocks' }, { w: 1, v: 'charm' }]);
      for (const t of easy.tiles) if (t.kind === 'path') t.kind = R.weighted([{ w: 3, v: 'berries' }, { w: 3, v: 'path' }, { w: 2, v: 'npc' }, { w: 2, v: 'event' }, { w: 1, v: 'choice' }]);
      hard.hard = true;
      // the lanes wear their own ground
      const [ta, tb] = F.flavour;
      for (const t of hard.tiles) t.terrain = ta;
      for (const t of easy.tiles) t.terrain = tb;
    }
    // everything else, by weight, with a few manners
    const wts = Object.entries(B.weights).map(([v, w]) => ({ v, w }));
    const fightish = k => k === 'battle' || k === 'dino' || k === 'trap' || k === 'rocks' || k === 'tar';
    const ordered = tiles.filter(t => t.main).sort((a, c) => a.idx - c.idx);
    for (const t of ordered) {
      if (t.kind !== 'path' || t.idx <= 0) continue;
      if (t.idx <= 3) { t.kind = R.pick(['path', 'gem', 'berries', 'card']); continue; }
      let k, guard = 0;
      const prevT = tiles[t.prev[0]];
      do { k = R.weighted(wts); } while (guard++ < 12 && prevT && fightish(k) && fightish(prevT.kind));
      t.kind = k;
    }
    // at least a few fights, spread out, even on a lucky seed
    const fights = ordered.filter(t => t.kind === 'battle').length;
    for (let i = fights; i < 4 + b; i++) {
      const cand = ordered.filter(t => t.kind === 'path' && t.idx > 4);
      if (!cand.length) break;
      R.pick(cand).kind = 'battle';
    }

    // ------------------------------------------------------------ terrain
    const feats = [];
    for (const f of B.features) {
      const fx = 150 + (boss.x - 150) * f.at;
      if (f.type === 'river' || f.type === 'lava') {
        const F = { type: f.type, x: fx, w: (f.type === 'lava' ? 24 : 30) * (f.w || 1), amp: R.float(14, 30), freq: R.float(0.012, 0.02), ph: R.float(0, 6.28), slant: R.float(-0.25, 0.25) };
        F.cx = y => F.x + F.amp * Math.sin(y * F.freq + F.ph) + (y - LANE_CY) * F.slant;
        F.hw = y => F.w * (0.42 + 0.58 * clamp((y - HORIZON) / (BOARD_H - HORIZON), 0, 1));
        feats.push(F);
        for (const t of tiles) if (Math.abs(t.x - F.cx(t.y)) < F.hw(t.y) + 26 && !t.big) t.terrain = f.type === 'lava' ? 'hot' : 'wet';
      } else if (f.type === 'ice') {
        const F = { type: 'ice', x: fx, y: LANE_CY + R.float(-20, 20), rx: R.float(110, 160), ry: R.float(56, 76) };
        feats.push(F);
        for (const t of tiles) if (((t.x - F.x) / F.rx) ** 2 + ((t.y - F.y) / F.ry) ** 2 < 0.8 && !t.big) t.terrain = 'ice';
      } else if (f.type === 'tar') {
        const cand = tiles.filter(t => t.kind === 'path' || t.kind === 'battle' || t.kind === 'event');
        cand.sort((a, c) => Math.abs(a.x - fx) - Math.abs(c.x - fx));
        const t = cand[0];
        if (t) { t.kind = 'tar'; feats.push({ type: 'tar', x: t.x, y: t.y + 4, rx: 46, ry: 22 }); }
      } else {
        // bands: a bone field, a rocky rise, hot vents, a cave floor
        const F = { type: f.type, x: fx, w: f.w || 100 };
        feats.push(F);
        const terr = { bones: 'bone', rocks: 'stone', vents: 'hot', cave: 'dark' }[f.type];
        for (const t of tiles) if (Math.abs(t.x - fx) < F.w && !t.big && t.lane === 0) t.terrain = terr;
      }
    }
    for (const t of tiles) {
      if (t.kind === 'cave') t.terrain = 'dark';
      if (t.kind === 'tar') t.terrain = b === 5 ? 'hot' : 'sand';
      if (t.kind === 'start' || t.kind === 'boss') t.terrain = B.base;
      if (t.kind === 'camp' || t.kind === 'trader' || t.kind === 'altar') t.big = true;
    }
    // ------------------------------------------------------------ who's who
    // Strangers, crossroads and mysteries are dealt out now, from a shuffled
    // deck of this land's events, so the board can show who is standing
    // where and the same tile always holds the same thing.
    const decks = {};
    for (const pool of ['event', 'npc', 'choice', 'cave']) decks[pool] = R.shuffle(BOARD_EVENTS[pool].map(e => e.id));
    for (const t of tiles) {
      const pool = t.kind === 'secret' ? null : t.kind;
      if (decks[pool]) { if (!decks[pool].length) decks[pool] = R.shuffle(BOARD_EVENTS[pool].map(e => e.id)); t.ev = decks[pool].pop(); }
      if (t.kind === 'dino') t.dino = R.int(0, DINO_TILES[b].length - 1);
    }
    // the beasts that roam the road between the tiles
    const roam = [];
    const quiet = tiles.filter(t => t.kind === 'path' && t.idx > 6 && t.main);
    for (let i = 0; i < B.nDinos && quiet.length; i++) {
      const band = quiet.filter(t => t.idx / idx > 0.2 + i * 0.25 && t.idx / idx < 0.45 + i * 0.25);
      const t = band.length ? R.pick(band) : R.pick(quiet);
      quiet.splice(quiet.indexOf(t), 1);
      roam.push({ kind: B.dinos[i % B.dinos.length], tile: t.id, n: i });
    }
    // ------------------------------------------------------------- scenery
    const props = Board.scatter(R, B, tiles, W, feats);
    return { biome: b, B, seed, tiles, start: start.id, boss: boss.id, w: W, h: BOARD_H, feats, props, forks, spurs, roam, len: idx, key: seed + ':' + b };
  },
  // scatter scenery where it does not sit on the road
  scatter(R, B, tiles, W, feats) {
    const out = [];
    const clear = (x, y, r, spr) => {
      for (const t of tiles) { const dx = t.x - x, dy = (t.y - y) * 1.6; if (dx * dx + dy * dy < r * r) return false; }
      // anything standing below a tile must be short enough not to cover it
      if (spr) {
        const S = Gfx.spr(spr), hw = S.w / 2 + 26;
        for (const t of tiles) if (Math.abs(t.x - x) < hw && t.y < y + 6 && t.y > y - S.h - 16) return false;
      }
      for (const t of tiles) for (const n of t.next) {
        const u = tiles[n]; const vx = u.x - t.x, vy = u.y - t.y, L2 = vx * vx + vy * vy;
        const k = clamp(((x - t.x) * vx + (y - t.y) * vy) / (L2 || 1), 0, 1);
        const dx = t.x + vx * k - x, dy = (t.y + vy * k - y) * 1.6;
        if (dx * dx + dy * dy < (r * 0.7) ** 2) return false;
      }
      for (const f of feats) if ((f.type === 'river' || f.type === 'lava') && Math.abs(x - f.cx(y)) < f.hw(y) + 10) return false;
      for (const p of out) { const dx = p.x - x, dy = (p.y - y) * 1.5; if (dx * dx + dy * dy < (r * 0.55 + p.r * 0.55) ** 2) return false; }
      return true;
    };
    // the treeline along the back, thick, so the country has an edge
    for (let x = -40; x < W + 60; x += R.float(60, 150)) {
      const y = HORIZON + R.float(8, 24);
      const tall = B.props.back.filter(k => /tree|palm|pine/.test(k)), low = B.props.back.filter(k => !/tree|palm|pine/.test(k));
      const spr = (R.chance(0.28) || !low.length) && tall.length ? R.pick(tall) : low.length ? R.pick(low) : R.pick(B.props.back);
      if (clear(x, y, 40, spr)) out.push({ spr, x, y, r: 40, flip: R.chance(0.5), sc: 1, back: true });
    }
    // things in the fields
    for (let i = 0; i < W / 26; i++) {
      const x = R.float(0, W), y = R.float(HORIZON + 34, BOARD_H - 60);
      const spr = R.pick(B.props.mid);
      const big = /tree|palm|pine/.test(spr);
      if (clear(x, y, big ? 56 : 30, spr)) out.push({ spr, x, y, r: big ? 56 : 26, flip: R.chance(0.5), sc: 1 });
    }
    // boulders strewn over any stony rise
    for (const f of feats) if (f.type === 'rocks' || f.type === 'vents') for (let i = 0; i < f.w / 9; i++) {
      const x = f.x + R.float(-f.w, f.w), y = R.float(HORIZON + 30, BOARD_H - 50);
      if (clear(x, y, 26, 'v_rock')) out.push({ spr: R.chance(0.6) ? 'v_rock_bare' : 'v_rock', x, y, r: 24, flip: R.chance(0.5), sc: 1 });
    }
    // the near edge: bushes and rocks cut off by the bottom of the screen
    for (let x = -30; x < W + 60; x += R.float(50, 110)) {
      const y = BOARD_H - 36 - R.float(0, 14);
      const spr = R.pick(B.props.front);
      if (clear(x, y, 36, spr)) out.push({ spr, x, y, r: 36, flip: R.chance(0.5), sc: 1, front: true });
    }
    return out;
  },
  // ---------------------------------------------------------------- routes
  // Every way of walking exactly n steps from `id` in direction dir (+1 on,
  // -1 back). A dead end or a stop tile ends a route early. Returns routes
  // as arrays of tile ids, starting with `id`.
  routes(board, id, n, dir) {
    const T = board.tiles, out = [];
    const walk = (at, left, path) => {
      if (left === 0) { out.push(path); return; }
      const nx = dir > 0 ? T[at].next : T[at].prev;
      if (!nx.length) { if (path.length > 1) out.push(path); return; }
      for (const k of nx) {
        const p2 = path.concat(k);
        if (TILE_KINDS[T[k].kind] && TILE_KINDS[T[k].kind].stop && T[k].kind !== 'used') { out.push(p2); continue; }
        walk(k, left - 1, p2);
      }
    };
    walk(id, n, [id]);
    return out;
  },
  // steps along the board between two tiles, either way, or Infinity
  distance(board, a, b, cap = 12) {
    if (a === b) return 0;
    const T = board.tiles, seen = new Map([[a, 0]]), q = [a];
    while (q.length) {
      const c = q.shift(), d = seen.get(c);
      if (d >= cap) continue;
      for (const k of T[c].next.concat(T[c].prev)) {
        if (seen.has(k)) continue;
        seen.set(k, d + 1); if (k === b) return d + 1;
        q.push(k);
      }
    }
    return Infinity;
  },
  // the first step on the shortest way from a to b
  stepToward(board, a, b) {
    const T = board.tiles, from = new Map([[a, -1]]), q = [a];
    while (q.length) {
      const c = q.shift();
      if (c === b) break;
      for (const k of T[c].next.concat(T[c].prev)) if (!from.has(k)) { from.set(k, c); q.push(k); }
    }
    if (!from.has(b)) return a;
    let c = b; while (from.get(c) !== a && from.get(c) !== -1) c = from.get(c);
    return c;
  },
};

// ------------------------------------------------------------------ ground
// Painted a pixel at a time, in 256px chunks, as the camera reaches them.
// Everything that is part of the ground - the dirt road between the tiles,
// the rivers and lava the road crosses, bones and flowers and cracks - is
// in the paint, so drawing it costs one image per chunk.
const BoardBake = (() => {
  const CW = 256, TOP = HORIZON - 10, CH = BOARD_H - TOP;
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const pack = c => ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const dith = (x, y) => (BAY[((y & 3) << 2) | (x & 3)] + 0.5) / 16 - 0.5;
  const hash = (x, y, s) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  // a tileable 256x256 fbm table: every lookup after this is one read
  const NS = 256;
  let noise = null;
  function makeNoise(seed) {
    const N = new Float32Array(NS * NS);
    const oct = [[8, 0.5], [16, 0.27], [32, 0.15], [64, 0.08]];
    const lat = {};
    for (const [p] of oct) { const a = new Float32Array(p * p); for (let i = 0; i < p * p; i++) a[i] = hash(i % p, (i / p) | 0, seed + p); lat[p] = a; }
    for (let y = 0; y < NS; y++) for (let x = 0; x < NS; x++) {
      let v = 0;
      for (const [p, amp] of oct) {
        const fx = x / NS * p, fy = y / NS * p, ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy;
        const ux = tx * tx * (3 - 2 * tx), uy = ty * ty * (3 - 2 * ty), L = lat[p];
        const a = L[(iy % p) * p + ix % p], b = L[(iy % p) * p + (ix + 1) % p], c = L[((iy + 1) % p) * p + ix % p], d = L[((iy + 1) % p) * p + (ix + 1) % p];
        v += (a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy) * amp;
      }
      N[y * NS + x] = v;
    }
    return N;
  }
  const nz = (x, y) => noise[((y & 255) << 8) | (x & 255)];
  let key = null, board = null, chunks = [], P = null, M = null;
  function setup(bd) {
    if (key === bd.key) return;
    key = bd.key; board = bd; chunks = new Array(Math.ceil(bd.w / CW) + 1).fill(null);
    noise = makeNoise(bd.seed % 9973 + bd.biome * 31);
    const G = GROUND[bd.B.ground];
    P = { ramp: G.ramp.map(hex), path: G.path.map(hex), worn: hex(G.worn), specks: G.specks.map(hex), tuft: G.tuft.map(hex), haze: G.haze, hazeK: G.hazeK };
    M = {}; for (const k in MATERIAL) M[k] = MATERIAL[k].map(hex);
  }
  const lerpC = (a, b, k) => [a[0] + (b[0] - a[0]) * k | 0, a[1] + (b[1] - a[1]) * k | 0, a[2] + (b[2] - a[2]) * k | 0];
  const pickR = (ramp, lv) => ramp[lv < 0 ? 0 : lv >= ramp.length ? ramp.length - 1 : lv | 0];
  function bake(ci) {
    const x0 = ci * CW, cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
    const g = cv.getContext('2d'), img = g.createImageData(CW, CH), px = new Uint32Array(img.data.buffer);
    const T = board.tiles, b = board.biome;
    // the road: every edge that comes near this chunk, and every tile's worn patch
    const segs = [];
    for (const t of T) for (const n of t.next) {
      const u = T[n];
      if (Math.max(t.x, u.x) < x0 - 24 || Math.min(t.x, u.x) > x0 + CW + 24) continue;
      segs.push([t.x, t.y + 2, u.x, u.y + 2]);
    }
    const pads = T.filter(t => t.x > x0 - 50 && t.x < x0 + CW + 50);
    const feats = board.feats.filter(f => (f.type === 'river' || f.type === 'lava') ? Math.abs(f.x - (x0 + CW / 2)) < CW + 120
      : f.rx ? Math.abs(f.x - (x0 + CW / 2)) < CW / 2 + f.rx + 40 : Math.abs(f.x - (x0 + CW / 2)) < CW / 2 + f.w + 60);
    for (let y = 0; y < CH; y++) {
      const Y = TOP + y, depth = clamp((Y - HORIZON) / (BOARD_H - HORIZON), 0, 1);
      const hz = Math.pow(1 - depth, 2.2) * P.hazeK;
      // per-row feature spans, so the inner loop is cheap
      const rows = [];
      for (const f of feats) if (f.type === 'river' || f.type === 'lava') rows.push({ f, c: f.cx(Y), w: f.hw(Y) });
      for (let x = 0; x < CW; x++) {
        const X = x0 + x;
        const n1 = nz(X >> 2, Y >> 1), n2 = nz(X, Y * 2 + 71), n3 = nz((X >> 3) + 97, (Y >> 2) + 13);
        let c = null, lv = 2.5 + (n1 - 0.5) * 3.2 + (n2 - 0.5) * 1.1 + (n3 - 0.5) * 1.6, ramp = P.ramp;
        const d0 = dith(X, Y);
        // ---- bands and blobs under everything
        let mat = null;
        for (const f of feats) {
          if (f.rx) {
            const e = ((X - f.x) / f.rx) ** 2 + ((Y - f.y) / f.ry) ** 2 + (n1 - 0.5) * 0.7;
            if (e < 1) mat = f.type === 'ice' ? (e > 0.86 ? 'iceEdge' : 'ice') : f.type === 'tar' ? (e > 0.8 ? 'tarEdge' : 'tar') : mat;
          } else if (f.w && !f.cx) {
            const e = Math.abs(X - f.x) / (f.w + (n3 - 0.5) * 70);
            if (e < 1) mat = mat || f.type;
          }
        }
        if (mat === 'ice') { ramp = M.ice; lv = 3 + (n2 - 0.5) * 2 + (((X + Y * 3) % 23) < 1 ? 1.5 : 0); }
        else if (mat === 'iceEdge') { ramp = M.ice; lv = 1.2 + (n2 - 0.5); }
        else if (mat === 'tar') { ramp = M.tar; lv = 1.6 + (n2 - 0.5) * 1.4 + (hash(X >> 1, Y, 5) > 0.985 ? 2.5 : 0); }
        else if (mat === 'tarEdge') { ramp = M.tar; lv = 3.2; }
        else if (mat === 'cave') { ramp = M.cave; lv = 2.4 + (n1 - 0.5) * 3; if (hash(X, Y, 9) > 0.996) c = M.crystal[(X + Y) % 3]; }
        else if (mat === 'rocks') {
          // a stony rise: the boulders are scenery, the ground just gets gritty
          if (hash(X >> 1, Y >> 1, 23) > 0.94) { ramp = M.rock; lv = 2 + ((X ^ Y) & 1) * 2; }
          else lv -= 0.4;
        }
        else if (mat === 'vents') { if (n3 > 0.6) { ramp = M.crust; lv = 1.5 + (n2 - 0.5) * 2; if (Math.abs(n1 - 0.5) < 0.012) { ramp = M.lava; lv = 4; } } }
        else if (mat === 'bones') { if (hash(X >> 2, Y >> 1, 21) > 0.93) { ramp = M.bone; lv = 1 + ((X + Y) & 3); } }
        // ---- rivers and lava across the road
        for (const r of rows) {
          const dx = Math.abs(X - r.c) + (n2 - 0.5) * 5;
          if (dx < r.w) {
            if (r.f.type === 'river') {
              const edge = r.w - dx;
              ramp = M.water; lv = 1.4 + (1 - dx / r.w) * 2.4 + (n2 - 0.5) * 1.2;
              if (edge < 2.2) { c = M.foam[edge < 1 ? 1 : 0]; }
              else if (((Y + Math.round(n1 * 20)) % 9 === 0) && hash(X >> 3, Y, 3) > 0.55) c = M.foam[0];      // the current, in dashes
            } else {
              const edge = r.w - dx;
              ramp = M.lava; lv = 2.2 + (1 - dx / r.w) * 2.8 + (n2 - 0.5) * 1.6;
              if (edge < 2.5) { ramp = M.crust; lv = 1; }
              else if (n1 > 0.62 && n2 > 0.5) { ramp = M.crust; lv = 2; }                                   // crust floating on it
            }
            break;
          } else if (dx < r.w + 5) { ramp = r.f.type === 'river' ? M.bank : M.crust; lv = (dx - r.w) / 2.2; c = null; }
        }
        // ---- the dirt road
        if (!c && ramp !== M.water && ramp !== M.lava) {
          let dmin = 1e9;
          for (const s of segs) {
            const vx = s[2] - s[0], vy = s[3] - s[1], L2 = vx * vx + vy * vy;
            const k = clamp(((X - s[0]) * vx + (Y - s[1]) * vy) / (L2 || 1), 0, 1);
            const dx = s[0] + vx * k - X, dy = (s[1] + vy * k - Y) * 1.35;
            const d = dx * dx + dy * dy; if (d < dmin) dmin = d;
          }
          let dp = Math.sqrt(dmin) + (n2 - 0.5) * 6;
          for (const t of pads) { const dx = t.x - X, dy = (t.y + 4 - Y) * 1.75, d = Math.sqrt(dx * dx + dy * dy) - (t.big ? 46 : 30); if (d < dp) dp = d; }
          if (dp < 9) { ramp = P.path; lv = 2.4 + (n2 - 0.5) * 2 + (dp > 6 ? -1 : 0) + (hash(X >> 1, Y >> 1, 7) > 0.93 ? 1.3 : 0); c = null; if (hash(X, Y, 8) > 0.985) c = M.rock[4]; }
          else if (dp < 12) { lv -= 1.2; }                                                                   // trodden grass at its edge
        }
        if (!c) {
          // flowers, tufts and pebbles on open ground
          if (ramp === P.ramp) {
            const hs = hash(X >> 1, Y >> 1, 11);
            if (hs > 0.992) c = P.specks[(X * 7 + Y) % P.specks.length];
            else if (hs < 0.03 && (Y & 1)) c = P.tuft[(X & 1)];
            else if (hs > 0.97 && hs < 0.975) c = M.rock[3];
          }
          if (!c) c = pickR(ramp, Math.floor(lv + d0 * 0.9 + 0.5));
        }
        // the far field fades into the air
        if (hz > 0.02) c = lerpC(c, P.haze, Math.round((hz + d0 * 0.18) * 5) / 5);
        px[y * CW + x] = pack(c);
      }
    }
    g.putImageData(img, 0, 0);
    // the soft top edge where the country behind takes over
    return cv;
  }
  return {
    CW, TOP, CH,
    setup,
    ready(i) { return !!chunks[i]; },
    // paint whatever is missing near the camera; at most `ms` of work
    step(camL, camR, ms = 6) {
      if (!board) return true;
      const t0 = performance.now();
      const need = [];
      const a = Math.max(0, Math.floor(camL / CW)), z = Math.min(chunks.length - 1, Math.floor(camR / CW));
      for (let i = a; i <= z; i++) if (!chunks[i]) need.push(i);
      for (let d = 1; d < chunks.length; d++) { if (a - d >= 0 && !chunks[a - d]) need.push(a - d); if (z + d < chunks.length && !chunks[z + d]) need.push(z + d); }
      for (const i of need) { chunks[i] = bake(i); if (performance.now() - t0 > ms) break; }
      return !chunks.some(c => !c);
    },
    // bake everything the camera can see right now, however long it takes
    now(camL, camR) { const a = Math.max(0, Math.floor(camL / CW)), z = Math.min(chunks.length - 1, Math.floor(camR / CW)); for (let i = a; i <= z; i++) if (!chunks[i]) chunks[i] = bake(i); },
    draw(camL, camR) {
      const a = Math.max(0, Math.floor(camL / CW)), z = Math.min(chunks.length - 1, Math.floor(camR / CW));
      for (let i = a; i <= z; i++) {
        if (!chunks[i]) chunks[i] = bake(i);
        Gfx.ctx.drawImage(chunks[i], i * CW, TOP);
      }
    },
  };
})();

// ----------------------------------------------------------------- the slabs
// A tile is a slab of stone set into the road: an oval top with the ground's
// own texture worn into it, a lip of darker stone under it, an ink line round
// the lot. Baked once per terrain, big and small.
const BoardArt = (() => {
  const cache = {};
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const dith = (x, y) => (BAY[((y & 3) << 2) | (x & 3)] + 0.5) / 16 - 0.5;
  const hash = (x, y, s) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const FACE = {
    grass: { top: ['#4d4a5c', '#5e5a6e', '#747088', '#8e8aa2', '#a8a4bc'], moss: ['#27632f', '#3f9a45', '#6cc95c', '#a8e878'], side: ['#241c2e', '#2e2538', '#3b3048'] },
    wet:   { top: ['#3b3a50', '#4a4a62', '#5c5e78', '#727690', '#8c92ac'], pool: ['#1d3d72', '#3570c0', '#6aa9ee', '#d8f0ff'], side: ['#16203a', '#1d2a48', '#263658'] },
    hot:   { top: ['#1e1418', '#2a1c20', '#38262a', '#483236', '#5a3e40'], crack: ['#7d1d2b', '#e06a1b', '#ffa832', '#ffe08a'], side: ['#120a0e', '#1a1014', '#24161a'] },
    stone: { top: ['#4d4a5c', '#626074', '#7a7890', '#9492aa', '#b0aec4'], side: ['#241c2e', '#2e2538', '#3b3048'] },
    bone:  { top: ['#8a7f68', '#a89c80', '#c4b89a', '#dcd2b6', '#f0e8d2'], side: ['#4a4030', '#5c503c', '#6e6048'] },
    ice:   { top: ['#5a86c0', '#76a2d6', '#98c0e8', '#bcdcf6', '#e2f2ff'], side: ['#284c80', '#305a92', '#3a68a2'] },
    sand:  { top: ['#8a5a32', '#a46e3e', '#bc844c', '#d49c5e', '#e8b674'], side: ['#4a2e1a', '#5c3a20', '#6e4626'] },
    dark:  { top: ['#261a34', '#302240', '#3c2a4e', '#4a345e', '#5a4070'], gem: ['#b177e6', '#86e8d2'], side: ['#120a1a', '#1a1024', '#22162e'] },
  };
  function slab(terrain, big) {
    const k = terrain + (big ? 'B' : 's');
    if (cache[k]) return cache[k];
    const RX = big ? 34 : 25, RY = big ? 16 : 12, TH = big ? 7 : 6;
    const w = RX * 2 + 6, h = RY * 2 + TH + 6, cx = w / 2, cy = RY + 3;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d'), img = g.createImageData(w, h), px = new Uint32Array(img.data.buffer);
    const F = FACE[terrain] || FACE.stone;
    const T = F.top.map(hex), S = F.side.map(hex), INK = hex('#120c16');
    const put = (x, y, c) => { px[y * w + x] = ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0; };
    const seed = terrain.length * 13 + (big ? 7 : 0);
    const inTop = (x, y) => { const dx = (x + 0.5 - cx) / RX, dy = (y + 0.5 - cy) / RY; return dx * dx + dy * dy <= 1; };
    const inSide = (x, y) => { const dx = (x + 0.5 - cx) / RX; if (Math.abs(dx) > 1) return false; const bot = cy + RY * Math.sqrt(1 - dx * dx); return y + 0.5 >= cy && y + 0.5 <= bot + TH; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const top = inTop(x, y), side = !top && inSide(x, y);
      if (!top && !side) continue;
      let c;
      if (top) {
        const dx = (x + 0.5 - cx) / RX, dy = (y + 0.5 - cy) / RY, r = Math.sqrt(dx * dx + dy * dy);
        let lv = 2.3 - dx * 0.7 - dy * 1.1 + (hash(x >> 1, y, seed) - 0.5) * 1.4 + (r > 0.86 ? (dy < 0 ? 0.9 : -0.8) : 0);
        // cracks and chips in the stone
        if (Math.abs(Math.sin(x * 0.5 + y * 1.7 + seed) + Math.sin(x * 0.23 - y * 0.9)) < 0.07 && r < 0.8) lv -= 1.4;
        c = T[clamp(Math.floor(lv + dith(x, y) * 0.9 + 0.5), 0, T.length - 1)];
        if (terrain === 'grass' && r > 0.72 && hash(x, y >> 1, seed + 3) < 0.55 + (r - 0.72) * 2) c = hex(F.moss[clamp(Math.floor(1.5 - dy * 1.4 + dith(x, y)), 0, 3)]);
        if (terrain === 'wet') { const e = ((x - cx - RX * 0.12) / (RX * 0.62)) ** 2 + ((y - cy + 1) / (RY * 0.58)) ** 2; if (e < 1) c = hex(F.pool[e < 0.2 && dx < 0 ? 3 : e > 0.8 ? 0 : e < 0.45 ? 2 : 1]); }
        if (terrain === 'hot') { const q = Math.abs(Math.sin(x * 0.35 + Math.sin(y * 0.8) * 1.6) * Math.sin(y * 0.6 - x * 0.1)); if (q < 0.1 && r < 0.9) c = hex(F.crack[q < 0.03 ? 3 : q < 0.06 ? 2 : 1]); }
        if (terrain === 'ice') { if (((x + y * 2) % 13) === 0 && r < 0.8 && dx < 0.3) c = T[4]; }
        if (terrain === 'bone') { if (hash(x >> 2, y >> 1, seed + 9) > 0.86) c = T[r < 0.5 ? 4 : 0]; }
        if (terrain === 'sand') { if (((y * 3 + Math.round(Math.sin(x * 0.3) * 2)) % 5) === 0) c = T[1]; }
        if (terrain === 'dark') { if (hash(x, y, seed + 5) > 0.975) c = hex(F.gem[(x + y) & 1]); }
      } else {
        const dx = (x + 0.5 - cx) / RX, dd = (y - cy) / (RY + TH);
        let lv = 1.5 - dx * 0.8 - dd * 0.6 + (hash(x >> 1, y >> 1, seed + 1) - 0.5) * 0.9;
        c = S[clamp(Math.floor(lv + dith(x, y) * 0.8 + 0.5), 0, S.length - 1)];
      }
      put(x, y, c);
    }
    // ink round the outside
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && (px[y * w + x] >>> 24) !== 0;
    const ink = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) ink.push(y * w + x);
    for (const i of ink) px[i] = ((255 << 24) | (INK[2] << 16) | (INK[1] << 8) | INK[0]) >>> 0;
    // and a lit lip where the top meets the side
    g.putImageData(img, 0, 0);
    cv.cx = cx; cv.cy = cy; cv.RX = RX; cv.RY = RY;
    return (cache[k] = cv);
  }
  // an ink-and-paint mark under a tile's icon: a filled oval, a darker rim
  // and a highlight chipped along its top edge, all on whole pixels
  const pads = {};
  function pad(cx, cy, rx, ry, paint) {
    const k = rx + ':' + ry + ':' + paint.ring;
    let c = pads[k];
    if (!c) {
      const w = rx * 2 + 3, h = ry * 2 + 3;
      c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d');
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = (x + 0.5 - w / 2) / (rx + 0.5), dy = (y + 0.5 - h / 2) / (ry + 0.5), e = dx * dx + dy * dy;
        if (e > 1) continue;
        g.fillStyle = e > 0.62 ? '#120c16' : e > 0.4 ? paint.ring : (dy < -0.2 && dx < 0.2 && e > 0.16) ? paint.lit : paint.fill;
        if (e > 0.62 && e <= 0.8) g.fillStyle = paint.ring;
        g.fillRect(x, y, 1, 1);
      }
      pads[k] = c;
    }
    Gfx.ctx.drawImage(c, Math.round(cx - c.width / 2), Math.round(cy - c.height / 2));
  }
  // a pixel oval outline, two pixels thick
  const rings = {};
  function ring(cx, cy, rx, ry, col) {
    const k = rx + ':' + ry + ':' + col;
    let c = rings[k];
    if (!c) {
      const w = rx * 2 + 5, h = ry * 2 + 5;
      c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'); g.fillStyle = col;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = (x + 0.5 - w / 2), dy = (y + 0.5 - h / 2);
        const e = (dx / rx) ** 2 + (dy / ry) ** 2, e2 = (dx / (rx - 2)) ** 2 + (dy / (ry - 2)) ** 2;
        if (e <= 1 && e2 > 1) g.fillRect(x, y, 1, 1);
      }
      rings[k] = c;
    }
    Gfx.ctx.drawImage(c, Math.round(cx - c.width / 2), Math.round(cy - c.height / 2));
  }
  return { slab, pad, ring };
})();
