// ---------------------------------------------------------------------------
// map.js - Slay-the-Spire style branching map with landmarks
// ---------------------------------------------------------------------------
'use strict';

const MAP_ROWS = 10, MAP_COLS = 7, ROW_H = 62;
const ACT_INFO = {
  1: { name: 'Bedrock Valley', sub: 'Where the tribe once sang', sky: ['#5ee0f0', '#8fd8e8', '#c8e0d8'], ground: '#5cb84a', ground2: '#7a8f3a', path: '#d9a066' },
  2: { name: 'Tar Pit Jungle', sub: 'Sticky, steamy, and full of teeth', sky: ['#2f7a30', '#4a8a48', '#7aaa6a'], ground: '#4a5c22', ground2: '#2f7a30', path: '#a06a3a' },
  3: { name: 'Volcano Peak', sub: "King Rex's burning throne", sky: ['#3a1020', '#8e2a20', '#c86a20'], ground: '#3a2c3f', ground2: '#55555f', path: '#8f8f9a' },
};

const MapGen = {
  generate(act, seed) {
    const rng = new RNG(seed + act * 7919);
    const grid = []; for (let r = 0; r < MAP_ROWS; r++) { grid.push(new Array(MAP_COLS).fill(null)); }
    const edges = new Set();
    // paths
    const starts = rng.shuffle([0, 1, 2, 3, 4, 5, 6]).slice(0, 5);
    if (!starts.includes(3)) starts.push(3);
    for (const sc of starts) {
      let col = sc;
      for (let r = 0; r < MAP_ROWS - 1; r++) {
        if (!grid[r][col]) grid[r][col] = { row: r, col };
        let nc = r === MAP_ROWS - 2 ? 3 : clamp(col + rng.int(-1, 1), 0, MAP_COLS - 1);
        if (r === MAP_ROWS - 3) nc = clamp(col + rng.int(-1, 1), 1, 5);
        edges.add(`${r},${col}>${r + 1},${nc}`);
        col = nc;
      }
      grid[MAP_ROWS - 1][3] = { row: MAP_ROWS - 1, col: 3 };
    }
    // build node list
    const nodes = []; const byKey = {};
    for (let r = 0; r < MAP_ROWS; r++) for (let c = 0; c < MAP_COLS; c++) if (grid[r][c]) {
      const n = grid[r][c]; n.id = nodes.length; n.next = []; n.visited = false;
      n.x = 70 + c * 83 + (r === MAP_ROWS - 1 ? 0 : rng.int(-9, 9)); n.my = r * ROW_H + (r === MAP_ROWS - 1 ? 30 : rng.int(-6, 6));
      nodes.push(n); byKey[`${r},${c}`] = n;
    }
    for (const e of edges) { const [a, b] = e.split('>'); const na = byKey[a], nb = byKey[b]; if (na && nb && !na.next.includes(nb.id)) na.next.push(nb.id); }
    // types
    for (const n of nodes) {
      if (n.row === 0) n.type = 'combat';
      else if (n.row === MAP_ROWS - 1) n.type = 'boss';
      else if (n.row === MAP_ROWS - 2) n.type = 'rest';
      else if (n.row === 4) n.type = 'treasure';
      else {
        const items = [{ w: 44, v: 'combat' }, { w: 22, v: 'event' }];
        if (n.row >= 3) items.push({ w: 12, v: 'elite' }, { w: 10, v: 'rest' });
        if (n.row >= 2 && n.row !== 7) items.push({ w: 9, v: 'shop' });
        n.type = rng.weighted(items);
      }
    }
    // avoid consecutive special nodes along edges
    for (const n of nodes) for (const id of n.next) { const m = nodes[id]; if (['elite', 'rest', 'shop'].includes(n.type) && m.type === n.type) m.type = 'combat'; }
    // guarantee at least one elite and one shop in the act
    if (!nodes.some(n => n.type === 'elite')) { const cands = nodes.filter(n => n.type === 'combat' && n.row >= 3 && n.row <= 7); if (cands.length) rng.pick(cands).type = 'elite'; }
    if (!nodes.some(n => n.type === 'shop')) { const cands = nodes.filter(n => n.type === 'combat' && n.row >= 2 && n.row <= 6); if (cands.length) rng.pick(cands).type = 'shop'; }
    if (nodes.filter(n => n.type === 'event').length < 2) { const cands = nodes.filter(n => n.type === 'combat' && n.row >= 1 && n.row <= 7); if (cands.length) rng.pick(cands).type = 'event'; }
    // decorations (seeded)
    const deco = [];
    const decoSets = { 1: ['lm_tree', 'lm_palm', 'lm_rock', 'lm_bush', 'lm_ribs', 'lm_mushroom', 'lm_fern', 'lm_grass', 'lm_dskull', 'lm_bones', 'lm_nest'], 2: ['lm_palm', 'lm_tree', 'lm_tarpit', 'lm_mushroom', 'lm_fern', 'lm_fern', 'lm_bush', 'lm_ribs', 'lm_geyser'], 3: ['lm_rock', 'lm_dskull', 'lm_pillar', 'lm_lavapool', 'lm_bones', 'lm_crater', 'lm_totem', 'lm_geyser'] };
    for (let i = 0; i < 46; i++) {
      const x = rng.int(6, W - 30), my = rng.int(-40, MAP_ROWS * ROW_H + 40);
      if (nodes.some(n => Math.abs(n.x - x) < 34 && Math.abs(n.my - my) < 30)) continue;
      deco.push({ s: rng.pick(decoSets[act] || decoSets[1]), x, my, f: rng.int(0, 1) });
    }
    return { act, nodes, deco, current: -1, seed };
  },
  available(map) {
    if (map.current < 0) return map.nodes.filter(n => n.row === 0);
    return map.nodes[map.current].next.map(id => map.nodes[id]);
  }
};

class MapScene {
  constructor() { this.map = Game.run.map; this.t = 0; this.scroll = 0; this.target = 0; this.dragging = false; this.intro = 1.2; }
  enter() {
    AudioSys.play('map', { fade: 0.8 });
    const cur = this.map.current >= 0 ? this.map.nodes[this.map.current] : null;
    this.target = cur ? cur.my - 40 : -30;
    this.scroll = this.target; this.walk = null;
    Game.save();
  }
  exit() { }
  screenY(my) { return H - 70 - (my - this.scroll); }
  update(dt) {
    this.t += dt; this.intro = Math.max(0, this.intro - dt);
    if (Input.wheel) { this.target += Input.wheel * 40; }
    const maxScroll = MAP_ROWS * ROW_H - 200; this.target = clamp(this.target, -60, maxScroll);
    this.scroll = lerp(this.scroll, this.target, Math.min(1, dt * 6));
    for (const k of Input.keys) { if (k.code === 'ArrowUp' || k.code === 'KeyW') this.target += 60; if (k.code === 'ArrowDown' || k.code === 'KeyS') this.target -= 60; if (k.code === 'Escape') Game.pause(); }
    if (this.walk) { this.walk.t += dt; if (this.walk.t >= 0.8) { const n = this.walk.to; this.walk = null; Game.enterNode(n); } }
  }
  click(x, y, button) { }
  nodeSprite(t) { return { combat: 'node_combat', elite: 'node_elite', event: 'node_event', rest: 'node_rest', shop: 'node_shop', treasure: 'node_treasure', boss: 'node_boss' }[t]; }
  nodeTip(t) { return { combat: ['Combat', 'Fight dinosaurs with your music.'], elite: ['Elite', 'A dangerous foe guards a relic.'], event: ['Mystery', 'Something is happening here...'], rest: ['Rest Site', 'Heal by the campfire or practice a riff.'], shop: ["Ooga-Mart", 'Trade gold for riffs and relics.'], treasure: ['Treasure', 'A hidden cache of relics.'], boss: ['BOSS', 'The lord of this land awaits.'] }[t]; }
  draw() {
    const act = this.map.act, info = ACT_INFO[act];
    // background in map space
    Gfx.bands(0, 0, W, H, info.sky.concat(info.sky.slice().reverse()).slice(0, 5));
    const ctx = Gfx.ctx;
    // terrain stripes
    for (let my = -80; my < MAP_ROWS * ROW_H + 120; my += 20) { const sy = this.screenY(my); if (sy < -30 || sy > H + 30) continue; const shade = ((my / 20) | 0) % 2 ? info.ground : info.ground2; Gfx.rectA(0, sy, W, 20, shade, 0.85); }
    // river / lava flow
    ctx.strokeStyle = act === 3 ? '#ff5c00' : act === 2 ? '#1a1220' : '#3b82f6'; ctx.lineWidth = act === 3 ? 6 : 10; ctx.globalAlpha = 0.7; ctx.beginPath();
    for (let my = -80; my < MAP_ROWS * ROW_H + 100; my += 12) { const x = 560 + Math.sin(my * 0.02) * 50 + Math.sin(my * 0.007) * 30; const sy = this.screenY(my); if (my === -80) ctx.moveTo(x, sy); else ctx.lineTo(x, sy); } ctx.stroke(); ctx.globalAlpha = 1;
    // decorations
    for (const d of this.map.deco) { const sy = this.screenY(d.my); if (sy < -60 || sy > H + 60) continue; Gfx.sprite(d.s, d.x, sy, { anchor: 'bc', scale: 1, frame: (d.f + Math.floor(this.t * 2)) % 2 }); }
    // big landmarks: start village & boss lair
    Gfx.sprite('lm_village', 300, this.screenY(-40), { anchor: 'bc', scale: 2 });
    const bossNode = this.map.nodes[this.map.nodes.length - 1];
    if (act === 1) { Gfx.sprite('lm_arch', bossNode.x, this.screenY(bossNode.my + 26), { anchor: 'bc', scale: 2 }); Gfx.sprite('lm_cage', bossNode.x + 60, this.screenY(bossNode.my + 10), { anchor: 'bc', scale: 1 }); }
    else if (act === 2) { Gfx.sprite('lm_stage', bossNode.x, this.screenY(bossNode.my + 26), { anchor: 'bc', scale: 2 }); Gfx.sprite('lm_cage', bossNode.x + 70, this.screenY(bossNode.my + 10), { anchor: 'bc', scale: 1 }); }
    else { Gfx.sprite('lm_volcano', bossNode.x, this.screenY(bossNode.my + 26), { anchor: 'bc', scale: 3, frame: Math.floor(this.t * 2) % 2 }); }
    // edges
    for (const n of this.map.nodes) for (const id of n.next) {
      const m = this.map.nodes[id]; const x1 = n.x, y1 = this.screenY(n.my), x2 = m.x, y2 = this.screenY(m.my);
      const steps = 6; const done = n.visited && m.visited;
      for (let i = 1; i < steps; i++) { const k = i / steps; const px = lerp(x1, x2, k) + (i % 2 ? 3 : -3), py = lerp(y1, y2, k); Gfx.rectA(px - 1, py - 1, 3, 3, done ? '#f6d743' : info.path, done ? 1 : 0.8); }
    }
    // nodes
    const avail = MapGen.available(this.map); const canMove = !this.walk && this.intro <= 0;
    for (const n of this.map.nodes) {
      const sy = this.screenY(n.my); if (sy < -30 || sy > H + 30) continue;
      const isAvail = avail.includes(n); const isCur = n.id === this.map.current;
      const s = n.type === 'boss' ? 2 : 1.5; const pulse = isAvail ? 1 + Math.sin(this.t * 5) * 0.12 : 1;
      const hov = canMove && isAvail && UI.hovered(n.x - 14, sy - 14, 28, 28);
      Gfx.circle(n.x, sy + 2, 12 * s * 0.6 + 2, '#16101c');
      Gfx.circle(n.x, sy, 12 * s * 0.6 + 1, isCur ? '#f6d743' : isAvail ? (hov ? '#ffffff' : '#a3e04a') : n.visited ? '#8f8f9a' : '#3a2c3f');
      Gfx.circle(n.x, sy, 12 * s * 0.6 - 1, n.visited && !isCur ? '#55555f' : '#2a2030');
      Gfx.sprite(this.nodeSprite(n.type), n.x, sy, { anchor: 'c', scale: s * pulse * (n.type === 'boss' ? 0.9 : 0.8), alpha: n.visited && !isCur ? 0.5 : 1 });
      if (isAvail && canMove) UI.hit(n.x - 14, sy - 14, 28, 28, () => this.travel(n));
      if (UI.hovered(n.x - 12, sy - 12, 24, 24)) UI.tooltip(n.x + 14, sy - 10, this.nodeTip(n.type), { width: 120 });
    }
    // walker
    const cur = this.map.current >= 0 ? this.map.nodes[this.map.current] : null;
    let wx = cur ? cur.x : 300, wy = cur ? this.screenY(cur.my) : this.screenY(-40) - 10;
    if (this.walk) { const k = easeInOut(Math.min(1, this.walk.t / 0.8)); wx = lerp(wx, this.walk.to.x, k); wy = lerp(wy, this.screenY(this.walk.to.my), k) - Math.abs(Math.sin(k * Math.PI * 4)) * 6; }
    Gfx.sprite('onga', wx, wy - 8, { anchor: 'bc', scale: 1.5, frame: Math.floor(this.t * 4) % 2 });
    // header
    Game.drawRunBar(this);
    Gfx.rectA(150, 24, 340, 28, '#16101c', 0.7);
    Gfx.text(`ACT ${roman(act)}: ${info.name.toUpperCase()}`, 320, 27, { color: '#f6d743', align: 'center', scale: 2 });
    Gfx.text(info.sub, 320, 43, { color: '#a89aa8', align: 'center' });
    if (this.intro > 0) { Gfx.ctx.globalAlpha = Math.min(1, this.intro); Gfx.text('CHOOSE YOUR PATH', 320, 180, { color: '#ffffff', align: 'center', scale: 2, outline: true }); Gfx.ctx.globalAlpha = 1; }
    Gfx.text('scroll: wheel / arrows', 320, H - 10, { color: '#a89aa8', align: 'center' });
  }
  travel(n) {
    if (this.walk) return;
    AudioSys.sfx('select');
    this.walk = { to: n, t: 0 };
  }
}
