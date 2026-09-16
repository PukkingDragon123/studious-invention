// ---------------------------------------------------------------------------
// events.js - the wandering mammoth's market, fog encounters and fight rewards
// ---------------------------------------------------------------------------
'use strict';

// --------------------------------------------------------------- the market
class MammothShop {
  constructor() {
    const rng = new RNG(Game.run.seed + Game.run.fights * 613 + Game.run.act * 71);
    this.rng = rng; this.t = 0; this.sel = 0;
    this.msg = pick(['Ooo-ga. Trunk picked. Very fresh.', 'Bell rang, so you came. Good.', 'Everything must go. Mammoth is tired of carrying it.']);
    this.stock = [];
    for (const rar of ['common', 'common', 'uncommon', 'uncommon', 'rare']) {
      const pool = Cards.pool(rar).filter(id => !this.stock.some(s => s.card && s.card.id === id));
      const id = rng.pick(pool);
      this.stock.push({ kind: 'card', card: Cards.make(id), price: Math.round(({ common: 52, uncommon: 84, rare: 136 }[rar]) * rng.float(0.9, 1.15)) });
    }
    const r1 = Relics.randomReward(rng, ['common', 'uncommon']);
    if (r1) this.stock.push({ kind: 'relic', id: r1, price: Math.round(128 * rng.float(0.9, 1.1)) });
    const r2 = Relics.randomReward(rng, ['uncommon', 'rare'], r1 ? [r1] : []);
    if (r2) this.stock.push({ kind: 'relic', id: r2, price: Math.round(168 * rng.float(0.9, 1.1)) });
    this.stock.push({ kind: 'heal', price: 40, label: 'A gourd of something warm', desc: 'Heal {g}25{/} HP.' });
    this.stock.push({ kind: 'remove', price: 72, label: 'Mammoth eats a riff', desc: 'Remove a card from your deck.' });
    this.mam = new Actor({ base: 'mammoth', x: 740, y: 530, scale: 1.25, clip: 'trader', facing: -1 });
    this.bronk = new Actor({ base: 'bronk', x: 110, y: 524, scale: 1.3, facing: 1 });
  }
  enter() { AudioSys.play('mammoth', { fade: 0.5 }); }
  exit() { Dialogue.clear(); }
  update(dt) {
    this.t += dt; this.mam.update(dt); this.bronk.update(dt);
    Dialogue.update();
    if (Input.pressed('Escape')) Game.pause();
  }
  buy(it) {
    if (Game.run.gold < it.price) { AudioSys.sfx('error'); this.msg = 'No shells, no shopping. Mammoth is firm.'; return false; }
    Game.run.gold -= it.price; AudioSys.sfx('gold');
    Particles.sparkle(W / 2, H / 2, 14);
    return true;
  }
  draw() {
    // a clearing at dusk
    Gfx.bands(0, 0, W, 340, ['#1d3d72', '#3570c0', '#6aa9ee', '#ffb0cf', '#ffe08a']);
    Gfx.rect(0, 356, W, H - 356, '#5c3a20');
    Gfx.rect(0, 356, W, 6, '#85562f');
    for (let x = -20; x < W; x += 110) Gfx.sprite('prop_bush', x, 372, { anchor: 'bc', alpha: 0.85 });
    Gfx.sprite('prop_palm', 380, 366, { anchor: 'bc', alpha: 0.9 });
    this.mam.draw(); this.bronk.draw();
    Particles.draw(Gfx.ctx, false);
    // speech
    const bw = 340, bx = 470, by = 24;
    Gfx.bubble(bx, by, bw, 52, clamp(this.mam.x - 30, bx + 20, bx + bw - 20), this.mam.top + 14, { fill: '#fff6e6' });
    Gfx.textWrap(this.msg, bx + 14, by + 12, bw - 28, { color: '#241c2e' });
    Gfx.text('THE WANDERING MAMMOTH', this.mam.x, this.mam.y + 4, { color: '#ffe98a', align: 'center', outline: true });
    // wares laid out on the rug
    Gfx.panel(16, 92, W - 32, 244, { title: 'TRUNK-PICKED GOODS', fill: '#241c2e' });
    let x = 34, zoom = null;
    for (const it of this.stock) {
      if (it.kind === 'card') {
        const hov = UI.hovered(x, 118, CARD_W, CARD_H + 22);
        if (it.sold) { Gfx.rectA(x, 118, CARD_W, CARD_H, '#000', 0.55); Gfx.text('SOLD', x + CARD_W / 2, 180, { color: '#7a6d8a', align: 'center', scale: 1.4 }); }
        else {
          Cards.draw(it.card, x, 118, { hover: hov });
          if (hov) zoom = { c: it.card, x: x + CARD_W / 2, y: 300 };
          UI.hit(x, 118, CARD_W, CARD_H + 22, () => { if (this.buy(it)) { it.sold = true; Game.run.deck.push(it.card); this.msg = `${it.card.name}. Good ear.`; } });
          Gfx.sprite('icon_coin', x + 18, 118 + CARD_H + 4, { anchor: 'tl' });
          Gfx.text(String(it.price), x + 42, 118 + CARD_H + 6, { color: Game.run.gold >= it.price ? '#ffe98a' : '#ef6a5e' });
        }
        x += CARD_W + 10;
      }
    }
    // relics and services in a column on the right
    let ry = 118;
    for (const it of this.stock) {
      if (it.kind === 'card') continue;
      const rx = 34 + 5 * (CARD_W + 10);
      const wdt = W - rx - 36;
      const hov = UI.hovered(rx, ry, wdt, 52) && !it.sold;
      Gfx.round(rx, ry, wdt, 52, 4, it.sold ? '#1a1520' : hov ? '#3b3048' : '#241c2e');
      Gfx.outlineRound(rx, ry, wdt, 52, 4, it.sold ? '#3b3048' : hov ? '#ffe98a' : '#8a7f68');
      if (it.sold) Gfx.text('SOLD', rx + wdt / 2, ry + 20, { color: '#7a6d8a', align: 'center', scale: 1.3 });
      else {
        const icon = it.kind === 'relic' ? RELICS[it.id].spr : it.kind === 'heal' ? 'icon_heart' : 'icon_fire';
        Gfx.sprite(icon, rx + 8, ry + 14, { anchor: 'tl', scale: 1 });
        const label = it.kind === 'relic' ? RELICS[it.id].name : it.label;
        Gfx.text(label, rx + 38, ry + 8, { color: '#ffe98a' });
        Gfx.textWrap(it.kind === 'relic' ? RELICS[it.id].desc : it.desc, rx + 38, ry + 22, wdt - 90, { color: '#bdbccd', lineHeight: 11 });
        Gfx.sprite('icon_coin', rx + wdt - 52, ry + 16, { anchor: 'tl' });
        Gfx.text(String(it.price), rx + wdt - 28, ry + 18, { color: Game.run.gold >= it.price ? '#ffe98a' : '#ef6a5e' });
        UI.hit(rx, ry, wdt, 52, () => {
          if (it.kind === 'relic') { if (this.buy(it)) { it.sold = true; Relics.give(it.id); this.msg = `The ${RELICS[it.id].name}. Mammoth found it. Mammoth shares.`; } }
          else if (it.kind === 'heal') { if (this.buy(it)) { it.sold = true; Game.run.hp = Math.min(Game.run.maxHp, Game.run.hp + 25); AudioSys.sfx('heal'); this.msg = 'Drink. Do not ask what is in it.'; } }
          else {
            if (Game.run.gold < it.price) { AudioSys.sfx('error'); this.msg = 'No shells, no shopping.'; return; }
            Game.overlay = new DeckOverlay(Game.run.deck.slice(), 'FEED A RIFF TO THE MAMMOTH', { onPick: c => {
              Game.run.gold -= it.price; const i = Game.run.deck.indexOf(c); if (i >= 0) Game.run.deck.splice(i, 1);
              it.sold = true; AudioSys.sfx('slurp'); Game.overlay = null; this.msg = `${c.def.name}. Tastes like chalk.`;
            } });
          }
        });
      }
      ry += 58;
    }
    Gfx.sprite('icon_coin', 24, 350, { anchor: 'tl' });
    Gfx.text(String(Game.run.gold), 48, 352, { color: '#ffe98a', scale: 1.5 });
    UI.button(W - 200, H - 58, 180, 44, 'BACK TO THE ROAD', () => Game.leaveShop(), { scale: 1.1 });
    if (zoom) Cards.zoom(zoom.c, zoom.x, zoom.y);
    Dialogue.draw();
  }
  click() { }
}

// ------------------------------------------------------------- fog encounters
const FOG_EVENTS = [
  { id: 'nest', title: 'A NEST IN THE ASH', spr: 'prop_egg', scale: 2,
    text: 'Three warm eggs sit in a ring of stones. Something big made this nest, and something big will come back to it.',
    choices: [
      { label: 'Take an egg', desc: 'A relic, and possibly a very angry parent.', act: s => { if (!Relics.has('egg')) { Relics.give('egg'); s.result = 'You tuck the egg under your arm. It hums. {y}Warm Egg{/} acquired.'; } else { Game.run.gold += 45; s.result = 'This one is full of amber, not raptor. {y}+45 shells{/}.'; } if (chance(0.45)) { s.fight = ['raptor', 'raptor']; s.result += ' Then the reeds start moving. {r}Two raptors.{/}'; } } },
      { label: 'Leave it', desc: 'Some things are not yours.', act: s => { Game.run.hp = Math.min(Game.run.maxHp, Game.run.hp + 6); s.result = 'You back away. Somewhere in the reeds, something relaxes. You breathe easier. {g}+6 HP{/}.'; } },
    ] },
  { id: 'tar', title: 'STUCK', spr: 'brute_idle', scale: 1.4,
    text: 'A raider is sunk to the chest in tar, club still in hand, going down slowly and swearing the whole way.',
    choices: [
      { label: 'Pull him out', desc: 'Costs {r}8 HP{/}. He pays in shells and a relic.', act: s => { Game.run.hp = Math.max(1, Game.run.hp - 8); Game.run.gold += 50; const r = Relics.randomReward(new RNG(Game.run.fights * 31), ['common', 'uncommon']); if (r) Relics.give(r); s.result = `He comes free with a sound you will hear in your sleep. {y}+50 shells{/}${r ? ` and his ${RELICS[r].name}` : ''}.`; } },
      { label: 'Fish out his pouch', desc: '{y}+25 shells{/}. He will remember.', act: s => { Game.run.gold += 25; s.result = 'You hook the pouch with a branch. He calls you a word the valley has not invented yet. {y}+25 shells{/}.'; } },
      { label: 'Walk on', desc: 'Not your tar.', act: s => { s.result = 'You walk on. The tar burps once behind you.'; } },
    ] },
  { id: 'painting', title: 'THE PAINTED WALL', spr: 'prop_cave', scale: 1.2,
    text: 'Hunters, mammoths, and beneath them a row of ochre marks in fours. Someone wrote music on this wall, long before you.',
    choices: [
      { label: 'Study the marks', desc: '{g}Upgrade{/} a riff.', act: s => { s.picker = { title: 'UPGRADE A RIFF', filter: c => !c.up, use: c => { c.up = true; Cards.refresh(c); s.result = `You copy the old notation until your hands ache. {g}${c.name}{/} is sharper.`; } }; } },
      { label: 'Paint over one', desc: '{r}Remove{/} a card from your deck.', act: s => { s.picker = { title: 'PAINT OVER A RIFF', filter: () => true, use: c => { const i = Game.run.deck.indexOf(c); if (i >= 0) Game.run.deck.splice(i, 1); s.result = `You paint a handsome dinosaur over {r}${c.def.name}{/}. No regrets.`; } }; } },
      { label: 'Scrape the ochre', desc: 'Gain a random riff.', act: s => { const c = Cards.randomReward(new RNG(Game.run.fights * 17), 1)[0]; Game.run.deck.push(c); s.result = `A tune comes away in the pigment: {y}${c.name}{/} joins your deck.`; } },
    ] },
  { id: 'tribe', title: 'WHAT IS LEFT OF A TRIBE', spr: 'villager_idle', scale: 1.4,
    text: 'A handful of villagers crouch under a rock shelf, too scared to light a fire. They know your face. They know the Rock-Axe.',
    choices: [
      { label: 'Play for them', desc: '{y}Riff challenge{/}. Rally them for permanent Hype.', act: s => { s.riff = { bars: 1, density: 1, title: 'RALLY SONG', reward: r => { const h = r.acc > 0.7 ? 14 : 7; Game.run.startHype += h; Game.run.gold += 20; return `They stand up. They clap. Badly, but they clap. {p}+${h} starting Hype{/} and {y}20 shells{/}.`; } }; } },
      { label: 'Share your food', desc: 'Lose {y}20 shells{/}, gain {g}6 Max HP{/}.', cond: () => Game.run.gold >= 20, act: s => { Game.run.gold -= 20; Game.run.maxHp += 6; Game.run.hp += 6; s.result = 'You hand over the gourd. An old woman presses herbs into your palm. {g}+6 Max HP{/}.'; } },
      { label: 'Move on', desc: 'Time is family.', act: s => { s.result = 'You move on. Behind you, a very small fire is lit anyway.'; } },
    ] },
  { id: 'stone', title: 'THE SINGING STONE', spr: 'prop_totem', scale: 1.3,
    text: 'A standing stone hums when the wind crosses it. Put your ear to it and it is almost a chord.',
    choices: [
      { label: 'Tune yourself to it', desc: '{y}Hard riff{/}. A relic if you match it.', act: s => { s.riff = { bars: 1, density: 2, title: 'THE STONE', reward: r => { if (r.acc > 0.6) { if (!Relics.has('totem')) { Relics.give('totem'); return 'The hum settles into your chest. {y}Pocket Totem{/} acquired.'; } Game.run.gold += 60; return 'The stone approves. Shells rattle out of a crack. {y}+60{/}.'; } Game.run.hp = Math.max(1, Game.run.hp - 6); return 'You are flat. The stone is not. Your teeth ring. {r}-6 HP{/}.'; } }; } },
      { label: 'Leave it humming', desc: 'Nothing ventured.', act: s => { s.result = 'You leave it to the wind.'; } },
    ] },
  { id: 'chain', title: 'A LENGTH OF CHAIN', spr: 'relic_ribbon', scale: 2,
    text: 'Stone links, snapped clean, half-buried in ash. One end is scorched black. It is the chain from your kitchen.',
    choices: [
      { label: 'Take it with you', desc: "Gain {y}Vela's Ribbon{/} tied to the links.", act: s => { Relics.give('ribbon'); s.result = 'A scrap of pink is knotted through the last link. She left it on purpose. She is telling you which way.'; } },
    ] },
];

class FogEvent {
  constructor(id) {
    const rng = new RNG(Game.run.seed + Game.run.fights * 131 + Game.run.act * 17);
    const pool = FOG_EVENTS.filter(e => !Game.run.seenEvents.includes(e.id));
    this.ev = id ? FOG_EVENTS.find(e => e.id === id) : (pool.length ? rng.pick(pool) : rng.pick(FOG_EVENTS));
    Game.run.seenEvents.push(this.ev.id);
    this.t = 0; this.result = null; this.fight = null; this.riff = null; this.picker = null; this.riffObj = null;
  }
  enter() { AudioSys.play('event', { fade: 0.6 }); }
  exit() { }
  update(dt) {
    this.t += dt;
    if (this.riffObj) { this.riffObj.update(dt); return; }
    if (this.picker) {
      if (!Game.overlay) {
        const p = this.picker; this.picker = null;
        Game.overlay = new DeckOverlay(Game.run.deck.filter(p.filter), p.title, { onPick: c => { p.use(c); Game.overlay = null; AudioSys.sfx('unlock'); } });
      }
      return;
    }
    if (this.riff && !this.riffObj) {
      const cfg = this.riff;
      this.riffObj = new Riff({ bars: cfg.bars, density: cfg.density, title: cfg.title, act: Game.run.act, windowMult: 1 + Relics.mod('window'), onDone: r => { this.result = `${r.grade} RANK. ` + cfg.reward(r); this.riffObj = null; this.riff = null; } });
    }
    if (Input.pressed('Escape')) Game.pause();
  }
  draw() {
    Gfx.bands(0, 0, W, H, ['#281040', '#3b3048', '#4b2070', '#241c2e', '#120c16']);
    for (let i = 0; i < 2; i++) if (chance(0.4)) Particles.spawn(rnd(0, W), H, { n: 1, color: ['#4b2070', '#281040'], speed: 20, gravity: -22, life: 3.4, size: 10, sizeEnd: 0, world: false });
    Particles.draw(Gfx.ctx, false);
    Gfx.sprite(this.ev.spr, W / 2, 300, { anchor: 'bc', scale: this.ev.scale || 1, frame: Math.floor(this.t * 4) });
    Gfx.sprite('bronk_idle', 140, 340, { anchor: 'bc', frame: Math.floor(this.t * 2) % 2 });
    if (this.riffObj) { this.riffObj.draw(); return; }
    Gfx.panel(W / 2 - 300, 330, 600, 190, { title: this.ev.title, fill: '#1a1424' });
    if (!this.result) {
      const used = Gfx.textWrap(this.ev.text, W / 2 - 284, 346, 568, { color: '#d6cfe0' });
      let y = 346 + used + 6;
      for (const ch of this.ev.choices) {
        const ok = !ch.cond || ch.cond();
        const hov = UI.hovered(W / 2 - 284, y, 568, 36) && ok;
        Gfx.round(W / 2 - 284, y, 568, 36, 4, hov ? '#3b3048' : '#241c2e');
        Gfx.outlineRound(W / 2 - 284, y, 568, 36, 4, ok ? (hov ? '#ffe98a' : '#8a7f68') : '#3b3048');
        Gfx.text(ch.label, W / 2 - 272, y + 5, { color: ok ? '#ffe98a' : '#574a66' });
        Gfx.rich(ch.desc, W / 2 - 272, y + 19, { color: ok ? '#bdbccd' : '#4d4a5c' });
        UI.hit(W / 2 - 284, y, 568, 36, () => { if (ok) { AudioSys.sfx('select'); ch.act(this); } });
        y += 40;
      }
    } else {
      Gfx.textWrap(this.result, W / 2 - 284, 350, 568, { color: '#e8dfc6' });
      UI.button(W / 2 - 80, 470, 160, 40, this.fight ? 'THEY FOUND YOU' : 'CARRY ON', () => {
        if (this.fight) Game.enterFight(this.fight, 'normal');
        else Game.leaveEvent();
      }, { scale: 1.1 });
    }
  }
  click() { }
}

// ------------------------------------------------------------------- rewards
class RewardScene {
  constructor(o) { this.o = o; this.t = 0; this.cardTaken = !o.cards.length; this.relicTaken = !o.relics.length; }
  enter() { AudioSys.play('mammoth', { fade: 0.9 }); Game.run.gold += this.o.gold; AudioSys.sfx('gold'); for (let i = 0; i < 26; i++) Particles.confetti(rnd(0, W), -10, 1); }
  exit() { }
  update(dt) { this.t += dt; if (Input.pressed('Escape')) Game.pause(); }
  draw() {
    Gfx.bands(0, 0, W, H, ['#1d3d72', '#3570c0', '#6aa9ee', '#ffb0cf', '#ffe08a']);
    Gfx.rect(0, 400, W, 140, '#5c3a20');
    Gfx.sprite('bronk_play', 120, 420, { anchor: 'bc', frame: Math.floor(this.t * 6) });
    Particles.draw(Gfx.ctx, false);
    Gfx.text(this.o.kind === 'boss' ? 'BLAZE RETREATS' : 'THE BEASTS SCATTER', W / 2, 26, { color: '#ffe98a', align: 'center', scale: 3, outline: true, outlineWidth: 2 });
    Gfx.sprite('icon_coin', W / 2 - 60, 74, { anchor: 'tl' });
    Gfx.text(`+${this.o.gold} shells`, W / 2 - 34, 76, { color: '#ffe98a', scale: 1.3 });
    let y = 112;
    if (this.o.relics.length && !this.relicTaken) {
      Gfx.text(this.o.relics.length > 1 ? 'TAKE ONE TROPHY' : 'TROPHY', W / 2, y, { color: '#bdbccd', align: 'center' });
      let x = W / 2 - (this.o.relics.length * 300 - 20) / 2;
      for (const id of this.o.relics) {
        const r = RELICS[id], hov = UI.hovered(x, y + 18, 280, 62);
        Gfx.round(x, y + 18, 280, 62, 5, hov ? '#3b3048' : '#241c2e');
        Gfx.outlineRound(x, y + 18, 280, 62, 5, hov ? '#ffe98a' : '#8a7f68');
        Gfx.sprite(r.spr, x + 10, y + 30, { anchor: 'tl' });
        Gfx.text(r.name, x + 40, y + 26, { color: '#ffe98a' });
        Gfx.textWrap(r.desc, x + 40, y + 40, 230, { color: '#bdbccd', lineHeight: 11 });
        UI.hit(x, y + 18, 280, 62, () => { Relics.give(id); this.relicTaken = true; });
        x += 300;
      }
      y += 92;
    }
    if (!this.cardTaken) {
      Gfx.text('LEARN A RIFF', W / 2, y, { color: '#bdbccd', align: 'center' });
      const n = this.o.cards.length, sp = CARD_W + 30;
      let x = W / 2 - (n * sp - 30) / 2, zoom = null;
      for (const c of this.o.cards) {
        const hov = UI.hovered(x, y + 20, CARD_W, CARD_H);
        Cards.draw(c, x, y + 20, { hover: hov });
        if (hov) zoom = { c, x: x + CARD_W / 2 + (x < W / 2 ? 170 : -170), y: y + 20 + CARD_H / 2 };
        UI.hit(x, y + 20, CARD_W, CARD_H, () => { Game.run.deck.push(c); this.cardTaken = true; AudioSys.sfx('unlock'); });
        x += sp;
      }
      UI.button(W / 2 - 50, y + 26 + CARD_H, 100, 30, 'SKIP', () => { this.cardTaken = true; });
      if (zoom) Cards.zoom(zoom.c, zoom.x, zoom.y);
    } else UI.button(W / 2 - 90, H - 62, 180, 44, 'BACK TO THE HUNT', () => Game.afterReward(this.o), { scale: 1.2 });
  }
  click() { }
}
