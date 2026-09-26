// ---------------------------------------------------------------------------
// boardui.js - everything round the board that is not the board itself:
//
//   BoardSky          the sky, the far country and the lair on the horizon,
//                     the water and lava moving, the lights, the grade
//   CardOfferOverlay  pick one of three cards, or none
//   TraderOverlay     Trunks the mammoth, who only takes gems
//   EnchantOverlay    the gem altar: press a gem into a card, for good
//   HeroSelectScene   the family, before dinner: pick who you are
// ---------------------------------------------------------------------------
'use strict';

const BoardSky = (() => {
  const layers = {};
  // the far country, three bands deep, built from the same painters as the
  // view from the cave door
  function bands(b) {
    if (layers[b]) return layers[b];
    const B = BIOMES[b];
    const mk = (key, spec, kind, f, h) => ({
      key: `bd${b}${key}`, depth: 1 - f, h,
      make: () => kind === 'dunes' ? dunes(Object.assign({ h }, spec)) : kind === 'woods' ? Vista.gen.woods(Object.assign({ h }, spec)) : Vista.gen.mountains(Object.assign({ h }, spec)),
    });
    layers[b] = [
      Object.assign(mk('far', B.far, 'm', 0.05, 200), { y: HORIZON - 200 + 38 }),
      Object.assign(mk('mid', B.mid, 'm', 0.11, 190), { y: HORIZON - 190 + 26 }),
      Object.assign(mk('near', B.near, B.near.kind, 0.22, 110), { y: HORIZON - 110 + 16 }),
    ];
    return layers[b];
  }
  // soft sand or ash hills, lit along their crests
  function dunes(o) {
    const LW = 1024, h = o.h, cv = document.createElement('canvas'); cv.width = LW; cv.height = h;
    const g = cv.getContext('2d'), img = g.createImageData(LW, h), px = new Uint32Array(img.data.buffer);
    const R = o.ramp.map(c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]);
    const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const top = x => h * o.base - o.amp * (0.6 * (0.5 + 0.5 * Math.sin(x / LW * Math.PI * 2 * 3 + o.seed)) + 0.4 * (0.5 + 0.5 * Math.sin(x / LW * Math.PI * 2 * 7 + o.seed * 2)));
    for (let x = 0; x < LW; x++) {
      const st = Math.round(top(x)), sl = top(x + 2) - top(x - 2);
      for (let y = Math.max(0, st); y < h; y++) {
        const d = y - st;
        let lv = 2.4 + (sl < 0 ? 1.1 : -0.9) * Math.min(1, Math.abs(sl) * 0.8 + 0.2) - d * 0.03 + (d < 2 ? 1.4 : 0);
        lv += Math.sin(x * 0.07 + y * 0.9) * 0.25;
        const i = clamp(Math.floor(lv + ((BAY[((y & 3) << 2) | (x & 3)] + 0.5) / 16 - 0.5) * 0.9 + 0.5), 0, R.length - 1);
        const c = R[i];
        px[y * LW + x] = ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;
      }
    }
    g.putImageData(img, 0, 0);
    return cv;
  }
  // puffy clouds in the land's own colours
  const clouds = {};
  function cloud(d, b) {
    const key = b + ':' + d; if (clouds[key]) return clouds[key];
    const col = { 1: ['#a8cff2', '#ffffff', '#ffffff'], 2: ['#5c7a7a', '#8aa8a4', '#b0ccc4'], 3: ['#d68a5a', '#f4c8a0', '#fff0dc'], 4: ['#8a9cc4', '#d8e2f2', '#ffffff'], 5: ['#1a0e14', '#3a2226', '#5c3430'] }[b];
    const s2 = 0.6 + d * 0.22, c = document.createElement('canvas');
    c.width = Math.ceil(260 * s2); c.height = Math.ceil(96 * s2);
    const real = Gfx.ctx; Gfx.ctx = c.getContext('2d');
    const cx = c.width / 2 - 6 * s2, cy = c.height * 0.58;
    for (const [ox, oy, rx, ry] of World.LOBES) Gfx.round(cx + ox * s2 - rx * s2, cy + oy * s2 - ry * s2 + 5, rx * 2 * s2, ry * 2 * s2, ry * s2, col[0]);
    for (const [ox, oy, rx, ry] of World.LOBES) Gfx.round(cx + ox * s2 - rx * s2, cy + oy * s2 - ry * s2, rx * 2 * s2, ry * 2 * s2, ry * s2, col[1]);
    for (const [ox, oy, rx, ry] of World.LOBES) Gfx.round(cx + ox * s2 - rx * s2 * 0.8, cy + oy * s2 - ry * s2, rx * 1.6 * s2, ry * 0.7 * s2, ry * 0.4 * s2, col[2]);
    Gfx.ctx = real; c.ox = cx; c.oy = cy;
    return (clouds[key] = c);
  }
  // the sun, as pixels: a disc, a ring of dithered light round it, no blur
  function sun(x, y, r, col, halo) {
    const ctx = Gfx.ctx;
    for (let k = 3; k >= 1; k--) {
      ctx.globalAlpha = 0.1 + (3 - k) * 0.05;
      Gfx.circle(x, y, r + k * 7, halo);
    }
    ctx.globalAlpha = 1;
    Gfx.circle(x, y, r, col);
    Gfx.circle(x - r * 0.3, y - r * 0.3, r * 0.45, '#ffffff');
  }
  function volcanoSmoke(sc, Lr, spec, camL) {
    const off = camL * Lr.depth, t = sc.t;
    for (let k = Math.floor((camL - 1200 - off) / 1024); k <= Math.floor((camL + 1200 - off) / 1024); k++) {
      const vx = spec.volcano.x + off + k * 1024, vy = Lr.y + Lr.h * spec.base - spec.volcano.h + 2;
      const ctx = Gfx.ctx, big = spec.volcano.w / 100;
      for (let i = 0; i < 9; i++) {
        const u = ((t * 0.035 + i / 9) % 1);
        const px = Math.round(vx + Math.sin(u * 5 + i) * 6 * big + u * 80 * big), py = Math.round(vy - u * 140 * big);
        const r = (5 + u * 24) * big;
        ctx.globalAlpha = Math.sin(Math.min(1, u * 5) * Math.PI / 2) * (1 - u) * 0.55;
        ctx.fillStyle = sc.bd.biome >= 5 ? '#2a1a22' : '#8a8090';
        Gfx.round(px - r, py - r * 0.7, r * 2, r * 1.4, r * 0.7, ctx.fillStyle);
        ctx.fillStyle = sc.bd.biome >= 5 ? '#4a2a2a' : '#b8b0bc';
        Gfx.round(px - r * 0.8, py - r * 0.8, r * 1.1, r * 0.8, r * 0.4, ctx.fillStyle);
      }
      ctx.globalAlpha = 1;
      // the lip of it, glowing
      Gfx.rect(vx - 6 * big, vy - 1, 12 * big, 2, '#ff9a30');
      Gfx.rect(vx - 3 * big, vy - 2, 6 * big, 1, '#ffe08a');
      if (window.Post) Post.light(vx, vy, 40 * big, '#ff6a2a', 0.5);
    }
  }
  return {
    bands,
    draw(sc, L, R, camL) {
      const b = sc.bd.biome, B = sc.B, t = sc.t;
      World.skyRamp(L, R, -40, HORIZON + 30, B.sky);
      const sx = camL + W * 0.72 - camL * 0.02, sy = b === 5 ? 70 : b === 3 ? 96 : 64;
      if (b === 1) sun(sx, sy, 18, '#fff4c2', '#ffe98a');
      else if (b === 2) sun(sx, sy, 16, '#d8f0e0', '#a8d0c0');
      else if (b === 3) sun(sx, sy, 26, '#ffe0a0', '#ffa860');
      else if (b === 4) sun(sx, sy, 14, '#ffffff', '#d8e8ff');
      else sun(sx, sy, 22, '#ff8a5a', '#c2333c');
      // clouds, at three depths
      for (let d = 0; d < 3; d++) {
        const depth = 0.03 + d * 0.035, span = 1100 + d * 260, n = 4, spr = cloud(d, b);
        for (let i = 0; i < n; i++) {
          const cx = ((i * span / n + d * 190 - camL * depth + t * (3 + d * 2)) % span + span) % span + L - 220;
          const cy = 24 + d * 34 + (i % 3) * 14;
          Gfx.ctx.globalAlpha = 0.5 + d * 0.15;
          Gfx.ctx.drawImage(spr, Math.round(cx - spr.ox), Math.round(cy - spr.oy));
        }
      }
      Gfx.ctx.globalAlpha = 1;
      if (b !== 5) World.flock(t, camL, L, R, false, 60);
      const Ls = bands(b);
      Ls.forEach((Lr, i) => {
        Vista.drawAt(Lr, null, camL, L, R, Lr.y, 1);
        if (i === 1 && B.mid.volcano) volcanoSmoke(sc, Lr, B.mid, camL);
      });
      // the air over the far fields
      const hz = { 1: '#c0d8ee', 2: '#7aa89a', 3: '#f0c890', 4: '#dce6f4', 5: '#6e2a24' }[b];
      for (let i = 0; i < 4; i++) Gfx.rectA(L, HORIZON - 30 + i * 8, R - L, 8, hz, 0.06 + i * 0.03);
    },
    // water and lava do not hold still
    liquids(sc, L, R) {
      const t = sc.t, ctx = Gfx.ctx;
      for (const f of sc.board.feats) {
        if (f.type !== 'river' && f.type !== 'lava') continue;
        if (Math.abs(f.x - (L + R) / 2) > (R - L) / 2 + 200) continue;
        for (let y = HORIZON + 4; y < BOARD_H; y += 5) {
          const cx = f.cx(y), hw = f.hw(y);
          const u = Math.sin(y * 0.37 + t * (f.type === 'river' ? 3.1 : 1.3));
          const x = Math.round(cx + u * hw * 0.55);
          if (f.type === 'river') {
            ctx.globalAlpha = 0.45 + u * 0.2;
            Gfx.rect(x - 3, y, 6, 1, '#d8f0ff');
            if (((y + Math.floor(t * 12)) % 25) === 0) Gfx.rect(x + 4, y + 2, 3, 1, '#ffffff');
          } else {
            ctx.globalAlpha = 0.55 + u * 0.3;
            Gfx.rect(x - 2, y, 5, 2, u > 0.5 ? '#ffe08a' : '#ffa832');
            if (chance(0.004)) Particles.embers(cx + rnd(-hw, hw), y, 1);
          }
        }
        ctx.globalAlpha = 1;
      }
    },
    // every hot thing gives light to the post pass
    lights(sc, L, R) {
      if (!window.Post) return;
      for (const f of sc.board.feats) {
        if (f.type === 'lava' && Math.abs(f.x - (L + R) / 2) < (R - L) / 2 + 200) for (let y = HORIZON + 20; y < BOARD_H; y += 70) Post.light(f.cx(y), y, 90, '#ff6a2a', 0.55 + Math.sin(sc.t * 2 + y) * 0.1);
        if (f.type === 'cave' && Math.abs(f.x - (L + R) / 2) < (R - L) / 2 + 200) Post.light(f.x, LANE_CY, 120, '#b177e6', 0.25);
      }
      for (const t of sc.T) {
        if (t.x < L - 100 || t.x > R + 100) continue;
        if (t.kind === 'camp' && !sc.used(t)) Post.light(t.x + 44, t.y - 16, 110, '#ffa832', 0.7 + Math.sin(sc.t * 9 + t.x) * 0.08);
        else if (t.kind === 'altar') Post.light(t.x + 46, t.y - 40, 70, '#b177e6', 0.6);
        else if (t.kind === 'boss' && sc.bd.biome === 1 && !sc.bd.bossDown) Post.light(t.x + 84, t.y - 50, 140, '#ff7a2a', 0.6);
        else if (sc.terrainOf(t) === 'hot') Post.light(t.x, t.y, 40, '#ff6a2a', 0.35);
      }
      if (sc.phase === 'choose') for (const id of sc.reach.keys()) { const t = sc.T[id]; Post.light(t.x, t.y - 4, 44, '#ffe98a', 0.35); }
    },
    grade(sc) {
      if (window.Post && Post.on) { Post.grade(sc.bd.biome); return; }
      const tint = { 1: null, 2: ['#0c3a36', 0.1], 3: ['#6a2a10', 0.08], 4: ['#3a4a8a', 0.08], 5: ['#3f0e18', 0.16] }[sc.bd.biome];
      if (tint) Gfx.rectA(0, 0, W, H, tint[0], tint[1]);
    },
    // a stone altar with a gem floating over it
    altar(x, y, t) {
      Gfx.shadow(x, y + 2, 56, 0.32);
      Gfx.round(x - 22, y - 22, 44, 24, 4, '#241c2e');
      Gfx.round(x - 20, y - 20, 40, 20, 3, '#574a66');
      Gfx.round(x - 20, y - 20, 40, 5, 2, '#7a6d8a');
      for (let i = 0; i < 3; i++) Gfx.rect(x - 14 + i * 11, y - 12, 6, 2, '#b177e6');
      Gfx.round(x - 27, y - 27, 54, 8, 3, '#241c2e');
      Gfx.round(x - 25, y - 26, 50, 5, 2, '#9391a6');
      for (const s of [-1, 1]) {
        Gfx.rect(x + s * 21 - 2, y - 36, 5, 9, '#e8dfc6'); Gfx.rect(x + s * 21 - 2, y - 36, 2, 9, '#fffaea');
        World.flame(x + s * 21, y - 36, 8 + Math.abs(Math.sin(t * 7 + s)) * 3, 3, Math.sin(t * 3 + s), ['#e06a1b', '#ffa832', '#ffe98a', '#9c3510'], s);
      }
      const hy = y - 48 + Math.sin(t * 2) * 3;
      HUD.gem(x, hy, 1);
      if (((t * 0.8) % 1) < 0.08) Gfx.rect(x + 2, hy - 6, 2, 2, '#ffffff');
    },
  };
})();

// --------------------------------------------------------- card offers
class CardOfferOverlay {
  constructor(cards, title, cb) { this.cards = cards; this.title = title; this.cb = cb; this.t = 0; }
  update(dt) { this.t += dt; if (Input.pressed('Escape')) this.close(null); }
  close(c) { Game.overlay = null; this.cb(c); }
  draw() {
    Gfx.rectA(0, 0, W, H, '#120c16', 0.72);
    const n = this.cards.length, sp = CARD_W * 1.25 + 34, w = Math.max(420, n * sp + 40), h = 330;
    const r = UI.window(W / 2 - w / 2, 70, w, h, this.title);
    let x = W / 2 - (n * sp - 34) / 2, zoom = null;
    for (const c of this.cards) {
      const y = r.y + 12 + Math.sin(this.t * 2 + x) * 2;
      const hov = UI.hovered(x, y, CARD_W * 1.25, CARD_H * 1.25);
      Cards.draw(c, x, y, { scale: 1.25, hover: hov });
      if (hov) zoom = c;
      UI.hit(x, y, CARD_W * 1.25, CARD_H * 1.25, () => this.close(c));
      x += sp;
    }
    UI.wbutton(W / 2 - 70, r.y + r.h - 50, 140, 42, 'SKIP', () => this.close(null), { scale: 1.3 });
  }
}

// ------------------------------------------------------------- the trader
// Trunks's stock is fixed for the land, so walking away and coming back
// does not reshuffle it; what you bought stays bought.
class TraderOverlay {
  constructor(scene, onClose) {
    this.s = scene; this.onClose = onClose; this.t = 0;
    const run = Game.run, bd = run.board;
    const rng = new RNG((run.seed ^ (bd.biome * 99991)) >>> 0);
    bd.shop = bd.shop || { sold: {} };
    this.stock = [];
    const cards = Cards.randomReward(rng, 4, [], run.hero, 0.1);
    cards.forEach((c, i) => this.stock.push({ kind: 'card', card: c, price: { common: 2, uncommon: 3, rare: 5 }[c.def.rarity] || 3, key: 'c' + i }));
    const ex = [];
    for (let i = 0; i < 2; i++) { const id = Relics.randomReward(rng, i ? ['uncommon', 'rare'] : ['common', 'uncommon'], ex); if (id) { ex.push(id); this.stock.push({ kind: 'relic', id, price: RELICS[id].tier === 'rare' ? 8 : RELICS[id].tier === 'uncommon' ? 6 : 5, key: 'r' + i }); } }
    for (let i = 0; i < 2; i++) this.stock.push({ kind: 'charm', id: rng.pick(CHARM_KEYS), price: 2, key: 'h' + i });
    this.stock.push({ kind: 'heal', price: 2, key: 'heal', label: 'A gourd of something warm', desc: 'Heal {g}20{/} HP.' });
    this.stock.push({ kind: 'remove', price: 3, key: 'rm', label: 'Trunks eats a card', desc: 'Remove a card from your deck.' });
    this.msg = pick(['Ooo-ga. Trunk picked. Very fresh.', 'Gems only. Trunks has no use for pebbles.', 'Everything must go. Trunks is tired of carrying it.']);
  }
  sold(it) { return !!Game.run.board.shop.sold[it.key]; }
  buy(it) {
    const run = Game.run;
    if ((run.gems || 0) < it.price) { AudioSys.sfx('error'); this.msg = 'No gems, no shopping. Trunks is firm.'; return false; }
    run.gems -= it.price; AudioSys.sfx('gem');
    if (it.kind !== 'heal' && it.kind !== 'remove') run.board.shop.sold[it.key] = 1;
    Particles.spawn(Input.mx, Input.my, { n: 14, color: ['#c28cff', '#ffffff'], speed: 90, gravity: -30, life: 0.7, size: 3, shape: 'star', sizeEnd: 0, world: false });
    return true;
  }
  update(dt) { this.t += dt; if (Input.pressed('Escape')) this.close(); }
  close() { Game.overlay = null; Game.save(); this.onClose(); }
  draw() {
    const run = Game.run;
    Gfx.rectA(0, 0, W, H, '#120c16', 0.7);
    const r = UI.window(24, 22, W - 48, H - 44, 'TRUNKS THE TRADER');
    // Trunks, and what he thinks
    Gfx.sprite('mammoth_trader', r.x + 88, r.y + r.h - 8, { anchor: 'bc', frame: Math.floor(this.t * 1.6) % 2 });
    Gfx.bubble(r.x + 8, r.y + 4, 200, 58, r.x + 110, r.y + 90, { fill: '#fff6e6' });
    Gfx.textWrap(this.msg, r.x + 20, r.y + 14, 176, { color: '#241c2e', lineHeight: 12 });
    let x = r.x + 220, zoom = null;
    const cy = r.y + 10;
    for (const it of this.stock.filter(s => s.kind === 'card')) {
      const hov = !this.sold(it) && UI.hovered(x, cy, CARD_W, CARD_H + 24);
      if (this.sold(it)) { Gfx.rectA(x, cy, CARD_W, CARD_H, '#000', 0.4); Gfx.text('SOLD', x + CARD_W / 2, cy + 60, { color: SKIN.textDim, align: 'center', scale: 1.4 }); }
      else {
        Cards.draw(it.card, x, cy, { hover: hov });
        if (hov) zoom = it.card;
        HUD.gem(x + 30, cy + CARD_H + 12, 0.9);
        Gfx.text(String(it.price), x + 44, cy + CARD_H + 6, { color: (run.gems || 0) >= it.price ? '#7c3eb2' : SKIN.red, scale: 1.3 });
        UI.hit(x, cy, CARD_W, CARD_H + 24, () => { if (this.buy(it)) { run.deck.push(it.card); this.msg = `${it.card.name}. Good ear.`; } });
      }
      x += CARD_W + 14;
    }
    let ry = cy + CARD_H + 36, rx = r.x + 220;
    const bw = (r.w - 230) / 2 - 8;
    let col = 0;
    for (const it of this.stock.filter(s => s.kind !== 'card')) {
      const bx = rx + col * (bw + 12), sold = this.sold(it);
      const hov = !sold && UI.hovered(bx, ry, bw, 52);
      UI.slab(bx, ry, bw, 52, { face: sold ? '#8a7f68' : hov ? SKIN.btn : SKIN.faceMid, lit: hov ? SKIN.btnLit : SKIN.face, r: 3, shadow: false, rough: false, len: 7 });
      if (sold) Gfx.text('SOLD', bx + bw / 2, ry + 18, { color: SKIN.faceDark, align: 'center', scale: 1.3 });
      else {
        const icon = it.kind === 'relic' ? RELICS[it.id].spr : it.kind === 'charm' ? CHARMS[it.id].icon : it.kind === 'heal' ? 'icon_heart' : 'icon_fire';
        Gfx.sprite(icon, bx + 22, ry + 26, { anchor: 'c' });
        const name = it.kind === 'relic' ? RELICS[it.id].name : it.kind === 'charm' ? CHARMS[it.id].name : it.label;
        const desc = it.kind === 'relic' ? RELICS[it.id].desc : it.kind === 'charm' ? CHARMS[it.id].desc : it.desc;
        Gfx.text(name, bx + 42, ry + 7, { color: SKIN.textLit, scale: 1 });
        Gfx.ctx.save(); Gfx.ctx.beginPath(); Gfx.ctx.rect(bx + 40, ry + 18, bw - 90, 32); Gfx.ctx.clip();
        Gfx.textWrap(desc, bx + 42, ry + 20, bw - 92, { color: '#fffaea', lineHeight: 10, scale: 0.85 });
        Gfx.ctx.restore();
        HUD.gem(bx + bw - 34, ry + 26, 0.9);
        Gfx.text(String(it.price), bx + bw - 22, ry + 20, { color: (run.gems || 0) >= it.price ? '#ffe98a' : '#ef6a5e', scale: 1.3 });
        if (hov) UI.tooltip(bx, ry + 56, [name, desc], { width: 260 });
        UI.hit(bx, ry, bw, 52, () => {
          if (it.kind === 'relic') { if (this.buy(it)) { Relics.give(it.id); this.msg = `The ${RELICS[it.id].name}. Trunks found it. Trunks shares.`; } }
          else if (it.kind === 'charm') { if (Game.run.board.charms.length >= 3) { AudioSys.sfx('error'); this.msg = 'Your pouch is full. Trunks cannot make it bigger.'; return; } if (this.buy(it)) { Game.run.board.charms.push(it.id); this.msg = 'Lucky. Probably.'; } }
          else if (it.kind === 'heal') { if (run.hp >= run.maxHp) { this.msg = 'You look fine. Trunks is a trader, not a doctor.'; return; } if (this.buy(it)) { run.hp = Math.min(run.maxHp, run.hp + 20); AudioSys.sfx('heal'); this.msg = 'Drink. Do not ask what is in it.'; } }
          else {
            if ((run.gems || 0) < it.price) { AudioSys.sfx('error'); this.msg = 'No gems, no shopping.'; return; }
            const back = this;
            Game.overlay = new DeckOverlay(run.deck.slice(), 'FEED A CARD TO TRUNKS', { onPick: c => {
              run.gems -= it.price; const i = run.deck.indexOf(c); if (i >= 0) run.deck.splice(i, 1);
              AudioSys.sfx('slurp'); back.msg = `${c.def.name}. Tastes like chalk.`; Game.overlay = back;
            }, onClose: () => { Game.overlay = back; } });
          }
        });
      }
      col++; if (col > 1) { col = 0; ry += 60; }
    }
    // your gems
    HUD.plate(r.x + r.w - 150, r.y + r.h - 50, 140, 40, { gold: false, accent: HUD.C.gem });
    HUD.gem(r.x + r.w - 126, r.y + r.h - 30, 1.2);
    HUD.text(`${run.gems || 0} GEMS`, r.x + r.w - 104, r.y + r.h - 38, { color: HUD.C.gem, scale: 1.4 });
    UI.wbutton(r.x + r.w - 350, r.y + r.h - 52, 190, 44, 'BACK TO THE ROAD', () => this.close(), { scale: 1.1 });
    if (zoom) Cards.zoom(zoom, W / 2, H / 2 + 40);
  }
}

// --------------------------------------------------------- the gem altar
class EnchantOverlay {
  constructor() { this.card = null; this.scroll = 0; this.t = 0; }
  update(dt) {
    this.t += dt;
    if (!this.card) {
      const rows = Math.ceil(Game.run.deck.length / 6);
      this.scroll = clamp(this.scroll + Input.wheel * 50 - Input.dragDY, 0, Math.max(0, rows * (CARD_H + 18) - 310));
    }
    if (Input.pressed('Escape')) { if (this.card) this.card = null; else Game.overlay = null; }
  }
  draw() {
    const run = Game.run;
    Gfx.rectA(0, 0, W, H, '#120c16', 0.82);
    const r = UI.window(24, 20, W - 48, H - 40, 'THE GEM ALTAR', { onClose: () => { Game.overlay = null; } });
    const gx = r.x + r.w - 150;
    HUD.gem(gx + 10, r.y + 10, 1.1);
    Gfx.text(`${run.gems || 0} GEMS`, gx + 30, r.y + 4, { color: SKIN.text, scale: 1.4 });
    if (!this.card) {
      Gfx.text(`Pick a card to enchant  -  ${ENCHANT_COST} gems`, r.x + 8, r.y + 4, { color: SKIN.textDim, scale: 1.2 });
      const TOP = r.y + 28, BOT = r.y + r.h - 54;
      const ctx = Gfx.ctx; ctx.save(); ctx.beginPath(); ctx.rect(r.x, TOP, r.w, BOT - TOP); ctx.clip();
      const list = run.deck.slice().sort((a, b) => (a.ench ? 1 : 0) - (b.ench ? 1 : 0) || a.cost - b.cost || a.name.localeCompare(b.name));
      let zoom = null;
      list.forEach((c, i) => {
        const x = r.x + 18 + (i % 6) * (CARD_W + 24), y = TOP + 6 + Math.floor(i / 6) * (CARD_H + 18) - this.scroll;
        if (y > BOT || y + CARD_H < TOP) return;
        const can = !c.ench && Object.keys(ENCHANTS).some(id => Cards.canEnchant(c, id));
        const hov = UI.hovered(x, Math.max(TOP, y), CARD_W, Math.min(CARD_H, BOT - y));
        Cards.draw(c, x, y, { hover: hov && can, alpha: can ? 1 : 0.45 });
        if (hov) zoom = { c, x: x + CARD_W / 2 + (x < W / 2 ? 190 : -190), y: clamp(y + CARD_H / 2, 150, 380) };
        if (can) UI.hit(x, y, CARD_W, CARD_H, () => { this.card = c; AudioSys.sfx('select'); });
      });
      ctx.restore();
      if (zoom) Cards.zoom(zoom.c, zoom.x, zoom.y);
      UI.wbutton(W / 2 - 90, r.y + r.h - 48, 180, 44, 'LEAVE', () => { Game.overlay = null; });
      return;
    }
    const c = this.card;
    Cards.draw(c, r.x + 40, r.y + 60, { scale: 1.5 });
    Gfx.text(c.name, r.x + 40 + CARD_W * 0.75, r.y + 36, { color: SKIN.text, align: 'center', scale: 1.4 });
    let y = r.y + 40;
    const x = r.x + 260, bw = r.w - 290;
    for (const [id, E] of Object.entries(ENCHANTS)) {
      const ok = Cards.canEnchant(c, id), afford = (run.gems || 0) >= ENCHANT_COST;
      UI.slab(x, y, bw, 70, { r: 4, shadow: true });
      Gfx.circle(x + 36, y + 35, 17, SKIN.ink);
      Gfx.circle(x + 36, y + 35, 14, ok ? E.col : SKIN.faceMid);
      Gfx.circle(x + 31, y + 30, 5, ok ? E.lit : SKIN.face);
      Gfx.text(E.name.toUpperCase(), x + 66, y + 14, { color: ok ? SKIN.text : SKIN.faceDark, scale: 1.5 });
      Gfx.text(ok ? E.text : 'does not fit this card', x + 66, y + 38, { color: ok ? SKIN.textDim : SKIN.faceDark, scale: 1.1 });
      UI.wbutton(x + bw - 150, y + 14, 136, 42, afford ? `${ENCHANT_COST} GEMS` : 'NEED GEMS', () => {
        run.gems -= ENCHANT_COST;
        Cards.enchant(c, id);
        AudioSys.sfx('unlock'); AudioSys.sfx('relic');
        Juice.flash(E.col, 0.35, 3);
        Particles.sparkle(r.x + 40 + CARD_W * 0.75, r.y + 60 + CARD_H * 0.75, 40, [E.col, E.lit, '#ffffff']);
        Popups.add(r.x + 40 + CARD_W * 0.75, r.y + 50, `${E.name.toUpperCase()}!`, E.col, { world: false, scale: 2, life: 1.6 });
        Game.save();
        this.card = null;
      }, { disabled: !ok || !afford, scale: 1.2 });
      y += 80;
    }
    UI.wbutton(W / 2 - 90, r.y + r.h - 48, 180, 44, 'BACK', () => { this.card = null; });
  }
}
