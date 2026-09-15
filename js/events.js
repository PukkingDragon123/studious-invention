// ---------------------------------------------------------------------------
// events.js - mystery events, rest sites, shop, treasure, rewards
// ---------------------------------------------------------------------------
'use strict';

const EVENTS = {
  ooga_tribe: { title: 'The Ooga Tribe', acts: [1, 2, 3], sprite: 'folk', scale: 4,
    text: 'The Ooga Tribe cowers inside their huts. "Dinosaurs everywhere!" an elder whispers. "Nobody dares to sing anymore."',
    choices: [
      { label: 'Play a song of courage', desc: '{y}Riff challenge{/}. Rally the tribe for permanent starting Hype.',
        action: s => s.challenge({ bars: 1, density: 1, title: 'RALLY SONG' }, r => { if (r.mult >= 1.0) { Game.run.startHype += 10; Game.run.gold += 20; return 'The tribe pours out of their huts, cheering and clapping! {p}+10 starting Hype{/} in every combat, and they press {y}20 gold{/} into your hands.'; } Game.run.startHype += 5; return 'A few brave souls clap along. {p}+5 starting Hype{/} in every combat.'; }) },
      { label: 'Share your food', desc: 'Lose {y}15 gold{/}. Gain {g}5 Max HP{/}.', cond: () => Game.run.gold >= 15,
        action: s => { Game.run.gold -= 15; Game.run.maxHp += 5; Game.run.hp += 5; AudioSys.sfx('heal'); return 'You share roasted roots around the fire. The tribe shares stories of the old songs. You feel stronger. {g}+5 Max HP{/}.'; } },
      { label: 'Leave', desc: 'Nothing gained, nothing lost.', action: () => 'You move on. The huts stay silent.' },
    ] },
  egg_nest: { title: 'The Nest', acts: [1, 2], sprite: 'lm_egg_big', scale: 3,
    text: 'A nest of warm, speckled eggs lies unguarded in a sunny clearing. For now.',
    choices: [
      { label: 'Take an egg', desc: 'Gain the {y}Dino Egg{/} relic (or gold). Mama might notice...',
        action: s => { let msg; if (!Relics.has('dino_egg')) { Relics.give('dino_egg'); msg = 'You tuck a warm egg under your arm. It hums softly. {y}Dino Egg{/} acquired!'; } else { Game.run.gold += 40; msg = 'You already have an egg... but this one is filled with amber! {y}+40 gold{/}.'; }
          if (s.rng.chance(0.5)) { s.pendingCombat = ['raptor', 'raptor']; msg += ' Then a SCREECH echoes from the trees. {r}Two raptors are coming!{/}'; } return msg; } },
      { label: 'Leave quietly', desc: 'Some things are better left alone.', action: () => 'You tiptoe away. Somewhere, a mother raptor sighs in relief.' },
    ] },
  tar_stranger: { title: 'Stuck in the Tar', acts: [1, 2], sprite: 'grug', scale: 3, flip: true,
    text: 'A caveman flails in a tar pit, sinking slowly. "Help! I have gold! Lots of it! Probably!"',
    choices: [
      { label: 'Pull him out', desc: 'Lose {r}7 HP{/}. Gain {y}45 gold{/} and a relic.',
        action: s => { Game.run.hp = Math.max(1, Game.run.hp - 7); Game.run.gold += 45; const r = Relics.randomReward(s.rng, ['common', 'common', 'uncommon']); if (r) Relics.give(r); return `The tar fights you every inch, but he comes free with a POP. "My hero!" He hands you {y}45 gold{/}${r ? ` and his lucky {y}${RELICS[r].name}{/}` : ''}.`; } },
      { label: 'Fish for his gold with a stick', desc: 'Gain {y}20 gold{/}. He will remember this.',
        action: () => { Game.run.gold += 20; return 'You hook his coin pouch with a branch. {y}+20 gold{/}. He glares at you as you leave. He is, at least, sinking very slowly.'; } },
      { label: 'Leave', desc: 'Not your problem.', action: () => 'You walk on. The tar burbles behind you.' },
    ] },
  cave_painting: { title: 'The Cave of Riffs', acts: [1, 2, 3], sprite: 'lm_cave', scale: 2,
    text: 'Ancient paintings cover the cave wall: hunters, mammoths... and rows of ochre notes. Riffs, written by musicians long gone.',
    choices: [
      { label: 'Study the paintings', desc: '{g}Upgrade{/} a card.', action: s => { s.pickCard('UPGRADE A RIFF', c => !c.up, c => { c.up = true; Cards.refresh(c); AudioSys.sfx('unlock'); s.result = `You study the old notation for hours. {g}${c.name}{/} feels sharper now.`; }); return null; } },
      { label: 'Paint over a riff', desc: '{r}Remove{/} a card from your deck.', action: s => { s.pickCard('REMOVE A CARD', () => true, c => { const i = Game.run.deck.indexOf(c); if (i >= 0) Game.run.deck.splice(i, 1); AudioSys.sfx('whoosh'); s.result = `You paint a very handsome dinosaur over {r}${c.def.name}{/}. You will not miss it.`; }); return null; } },
      { label: 'Take the ochre', desc: 'Gain a random card.', action: s => { const cards = Cards.randomReward(s.rng, 1); Game.run.deck.push(cards[0]); return `You scrape ochre into a pouch. A tune stuck in the pigment follows you out: {y}${cards[0].name}{/} added to your deck.`; } },
    ] },
  meteor_crater: { title: 'The Crater', acts: [1, 2, 3], sprite: 'lm_crater', scale: 3,
    text: 'A smoking crater cuts through the rocks. At the bottom, something glitters with a blue light and hums a steady beat.',
    choices: [
      { label: 'Grab it', desc: 'Lose {r}8 HP{/}. Gain a {y}rare{/} relic.',
        action: s => { Game.run.hp = Math.max(1, Game.run.hp - 8); const id = !Relics.has('meteor_shard') ? 'meteor_shard' : Relics.randomReward(s.rng, ['rare', 'uncommon']); Relics.give(id); return `The rock burns your palms as you scramble out. Worth it. {y}${RELICS[id].name}{/} acquired!`; } },
      { label: 'Leave', desc: 'Hot rocks are hot.', action: () => 'You leave the sky-stone to cool for a few centuries.' },
    ] },
  sleeping_bronto: { title: 'The Sleeping Giant', acts: [1, 2], sprite: 'bronto', scale: 3,
    text: 'A Brontosaurus snores in the meadow, blocking the whole path. Its back is covered in moss, flowers, and... shiny things?',
    choices: [
      { label: 'Climb it quietly', desc: '70% chance: {y}50 gold{/}. Or it wakes up.',
        action: s => { Game.run.gold += 50; if (s.rng.chance(0.7)) return 'You tiptoe up the tail and fill your pockets. {y}+50 gold{/}. It never even stops snoring.'; Game.run.hp = Math.max(1, Game.run.hp - 10); return 'Halfway up, it stands. You fall a very long way. {r}-10 HP{/}... but you kept the gold! {y}+50 gold{/}.'; } },
      { label: 'Serenade it', desc: '{y}Riff challenge{/}. A happy bronto gives rides.',
        action: s => s.challenge({ bars: 1, density: 0, title: 'LULLABY' }, r => { if (r.mult >= 1.0) { Game.run.hp = Math.min(Game.run.maxHp, Game.run.hp + 15); Game.run.gold += 25; return 'It hums along, then lowers its neck: a ride! You nap on its back the whole way. {g}+15 HP{/}, and you find {y}25 gold{/} in the moss.'; } Game.run.hp = Math.max(1, Game.run.hp - 12); return 'It does NOT like your song. It rolls over. You were under it. {r}-12 HP{/}.'; }) },
      { label: 'Go around', desc: 'The long way.', action: () => 'You take the long way around. It takes a while. Brontos are big.' },
    ] },
  rock_concert: { title: 'The Standing Stones', acts: [1, 2, 3], sprite: 'lm_stage', scale: 2,
    text: 'A ring of standing stones forms a natural stage. Compys, dodos and a very old turtle gather, clearly expecting a show.',
    choices: [
      { label: 'Perform!', desc: '{y}Hard riff challenge{/}. Earn gold by the note.',
        action: s => s.challenge({ bars: 2, density: 2, title: 'ROCK CONCERT' }, r => { const gold = 15 + r.perfects * 3 + r.goods; Game.run.gold += gold; let msg = `The crowd goes wild! They shower you with shiny pebbles: {y}+${gold} gold{/}.`; if (r.grade === 'S' && !Relics.has('war_drum')) { Relics.give('war_drum'); msg += ' The old turtle gives you its {y}War Drum{/}!'; } return msg; }) },
      { label: 'Leave', desc: 'Stage fright.', action: () => 'The turtle looks disappointed. Turtles are patient, though.' },
    ] },
  shaman_visit: { title: 'The Shaman', acts: [1, 2, 3], sprite: 'shaman', scale: 3, flip: true,
    text: 'An old shaman in a skull mask sits by a fire of blue flames. "Music is bone magic, young one. Shall we trade?"',
    choices: [
      { label: 'Transform a card', desc: 'Remove a card and gain a random one.',
        action: s => { s.pickCard('TRANSFORM A CARD', () => true, c => { const i = Game.run.deck.indexOf(c); if (i >= 0) Game.run.deck.splice(i, 1); const n = Cards.randomReward(s.rng, 1)[0]; Game.run.deck.push(n); AudioSys.sfx('relic'); s.result = `The shaman hums over {r}${c.def.name}{/}. When the smoke clears it has become {y}${n.name}{/}.`; }); return null; } },
      { label: 'Ask for a blessing', desc: 'Lose {y}30 gold{/}. Heal {g}20 HP{/}.', cond: () => Game.run.gold >= 30,
        action: () => { Game.run.gold -= 30; Game.run.hp = Math.min(Game.run.maxHp, Game.run.hp + 20); AudioSys.sfx('heal'); return 'The shaman paints your face with glowing ochre. Your wounds close. {g}+20 HP{/}.'; } },
      { label: 'Leave', desc: 'Bone magic is spooky.', action: () => '"Suit yourself," says the shaman, and vanishes in a puff of drum-smoke.' },
    ] },
  lost_folk: { title: 'Scattered Tribe', acts: [2, 3], sprite: 'folk', scale: 4,
    text: 'Members of your own tribe hide in the reeds, scattered by Rex\'s horde. They recognize the Rock-Axe immediately.',
    choices: [
      { label: 'Rally them!', desc: '{y}Easy riff challenge{/}. Followers grant starting Hype.',
        action: s => s.challenge({ bars: 1, density: 0, title: 'RALLY CRY' }, r => { const h = r.mult >= 1.0 ? 15 : 8; Game.run.startHype += h; Game.run.hp = Math.min(Game.run.maxHp, Game.run.hp + 5); return `They fall in behind you, banging sticks together in time. {p}+${h} starting Hype{/} in every combat, and their herbs heal you {g}+5 HP{/}.`; }) },
      { label: 'Send them home', desc: 'They insist on paying you. {y}+15 gold{/}.', action: () => { Game.run.gold += 15; return 'You point them back toward Bedrock Valley. They give you their spare pebbles. {y}+15 gold{/}.'; } },
    ] },
  petra_ribbon: { title: 'A Pink Ribbon', acts: [3], sprite: 'relic_petra_ribbon', scale: 5,
    text: 'Snagged on a thorn bush beside the lava trail: a pink ribbon, singed at the edges. It\'s Petra\'s. She came this way.',
    choices: [
      { label: 'Take it', desc: "Gain {y}Petra's Ribbon{/} (+12 Max HP).", action: () => { Relics.give('petra_ribbon'); return "You tie the ribbon around the neck of the Rock-Axe. Hold on, Petra. We're coming."; } },
    ] },
};

// ------------------------------------------------------------------------- Event scene
class EventScene {
  constructor(evId) { this.ev = EVENTS[evId]; this.id = evId; this.t = 0; this.result = null; this.rng = new RNG(Game.run.seed + Game.run.floor * 131); this.riff = null; this.pendingCombat = null; this.picker = null; }
  enter() { AudioSys.play('event', { fade: 0.6 }); }
  exit() { }
  challenge(opts, onDone) {
    this.riff = new Riff(Object.assign({ act: Game.run.act, windowMult: Relics.mult('windowMult'), onDone: r => { const msg = onDone(r); this.riff = null; this.result = `${r.grade} RANK! ` + msg; } }, opts));
    return null;
  }
  pickCard(title, filter, onPick) {
    Game.overlay = new DeckOverlay(Game.run.deck.filter(filter), title, { onPick: c => { onPick(c); Game.overlay = null; }, allowClose: true, onClose: () => { this.result = 'You change your mind.'; } });
  }
  update(dt) { this.t += dt; if (this.riff) this.riff.update(dt); for (const k of Input.keys) if (k.code === 'Escape') Game.pause(); }
  click() { }
  draw() {
    Backgrounds.draw(Game.run.act, this.t);
    Gfx.rectA(0, 0, W, H, '#16101c', 0.35);
    const ev = this.ev;
    Gfx.sprite(ev.sprite, 150, GROUND_Y + 4, { anchor: 'bc', scale: ev.scale || 3, flip: ev.flip, frame: Math.floor(this.t * 2) % 2 });
    Gfx.sprite('onga', 60, GROUND_Y + 2, { anchor: 'bc', scale: 3, frame: Math.floor(this.t * 2) % 2 });
    if (this.riff) { this.riff.draw(); Game.drawRunBar(this); return; }
    Gfx.panel(250, 40, 380, 300, { title: ev.title.toUpperCase(), fill: '#221a2a' });
    if (!this.result) {
      const lines = Gfx.textWrap(ev.text, 262, 56, 356, { color: '#ece6dc', lineHeight: 10 });
      let y = 60 + lines * 10 + 8;
      for (const ch of ev.choices) {
        const ok = !ch.cond || ch.cond();
        const hov = UI.button(262, y, 356, 30, '', () => { if (!ok) return; AudioSys.sfx('select'); const r = ch.action(this); if (r) this.result = r; }, { disabled: !ok });
        Gfx.text(ch.label, 270, y + 5, { color: ok ? '#f6d743' : '#8f8f9a' });
        Gfx.richText(ch.desc, 270, y + 16, { color: ok ? '#ece6dc' : '#8f8f9a' });
        y += 36;
      }
    } else {
      Gfx.textWrap(this.result, 262, 60, 356, { color: '#ece6dc', lineHeight: 10 });
      UI.button(400, 300, 100, 24, this.pendingCombat ? 'FIGHT!' : 'CONTINUE', () => { if (this.pendingCombat) Game.go(new Combat(this.pendingCombat, { kind: 'normal' })); else Game.afterNode(); });
    }
    Game.drawRunBar(this);
  }
}

// ------------------------------------------------------------------------- Rest
class RestScene {
  constructor() { this.t = 0; this.done = false; this.msg = null; }
  enter() { AudioSys.play('rest', { fade: 0.8 }); }
  exit() { }
  update(dt) { this.t += dt; for (const k of Input.keys) if (k.code === 'Escape') Game.pause(); }
  click() { }
  draw() {
    Backgrounds.draw(Game.run.act, this.t);
    Gfx.rectA(0, 0, W, H, '#0b0720', 0.55);
    const fl = 0.7 + Math.sin(this.t * 9) * 0.1 + Math.sin(this.t * 23) * 0.05;
    Gfx.ctx.globalAlpha = fl * 0.35; Gfx.circle(180, GROUND_Y - 20, 110, '#f28c28'); Gfx.ctx.globalAlpha = 1;
    Gfx.sprite('lm_campfire', 180, GROUND_Y + 4, { anchor: 'bc', scale: 3, frame: Math.floor(this.t * 6) % 2 });
    Gfx.sprite('onga', 120, GROUND_Y + 2, { anchor: 'bc', scale: 3, frame: Math.floor(this.t) % 2 });
    const band = Game.run.band; let bx = 240;
    for (const id of band) { Gfx.sprite(id, bx, GROUND_Y + 2, { anchor: 'bc', scale: 3, flip: true, frame: Math.floor(this.t + bx) % 2 }); bx += 44; }
    Particles.spawn(180 + rnd(-6, 6), GROUND_Y - 30, { n: 1, color: ['#f28c28', '#f6d743', '#55555f'], speed: 20, gravity: -60, life: 1.2, size: 2 });
    Gfx.panel(330, 50, 290, 240, { title: 'REST SITE', fill: '#221a2a' });
    if (!this.done) {
      Gfx.textWrap('The fire crackles. The band tunes up. For a moment, the valley is quiet.', 342, 66, 266, { lineHeight: 10 });
      const heal = Math.round(Game.run.maxHp * 0.3);
      UI.button(342, 100, 266, 30, '', () => { Game.run.hp = Math.min(Game.run.maxHp, Game.run.hp + heal); AudioSys.sfx('heal'); this.done = true; this.msg = `You sleep like a rock. {g}+${heal} HP{/}.`; });
      Gfx.text('REST', 350, 105, { color: '#f6d743' }); Gfx.richText(`Heal {g}${heal} HP{/} (30% of Max HP).`, 350, 116);
      UI.button(342, 138, 266, 30, '', () => { Game.overlay = new DeckOverlay(Game.run.deck.filter(c => !c.up), 'PRACTICE: UPGRADE A RIFF', { onPick: c => { c.up = true; Cards.refresh(c); AudioSys.sfx('unlock'); Game.overlay = null; this.done = true; this.msg = `You practice until your fingers bleed. {g}${c.name}{/} is now stronger.`; }, allowClose: true }); });
      Gfx.text('PRACTICE', 350, 143, { color: '#f6d743' }); Gfx.richText('{g}Upgrade{/} a card in your deck.', 350, 154);
      UI.button(342, 176, 266, 30, '', () => { Game.run.maxHp += 4; Game.run.hp += 4; AudioSys.sfx('buff'); this.done = true; this.msg = 'You jam by the fire until dawn. The band is tighter than ever. {g}+4 Max HP{/}.'; });
      Gfx.text('JAM SESSION', 350, 181, { color: '#f6d743' }); Gfx.richText('Gain {g}4 Max HP{/}.', 350, 192);
    } else {
      Gfx.textWrap(this.msg, 342, 70, 266, { lineHeight: 10 });
      UI.button(420, 250, 110, 24, 'CONTINUE', () => Game.afterNode());
    }
    Game.drawRunBar(this);
  }
}

// ------------------------------------------------------------------------- Shop
class ShopScene {
  constructor() {
    this.t = 0; const rng = new RNG(Game.run.seed + Game.run.floor * 613);
    const ex = [];
    this.cards = [];
    for (const rar of ['common', 'common', 'uncommon', 'uncommon', 'rare']) {
      const pool = Cards.pool(rar).filter(id => !ex.includes(id)); const id = rng.pick(pool); ex.push(id);
      this.cards.push({ card: Cards.make(id), price: Math.round(({ common: 55, uncommon: 85, rare: 140 }[rar]) * rng.float(0.9, 1.15)), sold: false });
    }
    this.relics = [];
    const r1 = Relics.randomReward(rng, ['common', 'uncommon']); if (r1) this.relics.push({ id: r1, price: Math.round(130 * rng.float(0.9, 1.1)), sold: false });
    const r2 = !Relics.has('golden_banana') && rng.chance(0.5) ? 'golden_banana' : Relics.randomReward(rng, ['uncommon', 'rare'], r1 ? [r1] : []);
    if (r2) this.relics.push({ id: r2, price: Math.round(170 * rng.float(0.9, 1.1)), sold: false });
    this.removePrice = 75; this.removed = false; this.msg = 'Ooga! Welcome to Ooga-Mart. Shiny pebbles for shiny riffs!';
  }
  enter() { AudioSys.play('shop', { fade: 0.6 }); }
  exit() { }
  update(dt) { this.t += dt; for (const k of Input.keys) if (k.code === 'Escape') Game.pause(); }
  click() { }
  buy(price) { if (Game.run.gold < price) { AudioSys.sfx('error'); this.msg = 'No pebbles, no riffs! Come back richer.'; return false; } Game.run.gold -= price; AudioSys.sfx('gold'); return true; }
  draw() {
    Backgrounds.draw(Game.run.act, this.t);
    Gfx.rectA(0, 0, W, H, '#16101c', 0.4);
    Gfx.sprite('lm_hut', 90, GROUND_Y + 4, { anchor: 'bc', scale: 3 });
    Gfx.sprite('trader', 150, GROUND_Y + 2, { anchor: 'bc', scale: 3, flip: true });
    Gfx.panel(20, 30, 200, 40, { fill: '#221a2a' }); Gfx.textWrap(this.msg, 28, 38, 186, { lineHeight: 9 });
    Gfx.panel(225, 26, 410, 320, { title: 'OOGA-MART', fill: '#221a2a' });
    // cards
    let x = 236; let zoom = null;
    for (const it of this.cards) {
      const y = 44;
      if (it.sold) { Gfx.rectA(x, y, CARD_W, CARD_H, '#000', 0.4); Gfx.text('SOLD', x + CARD_W / 2, y + 40, { color: '#8f8f9a', align: 'center' }); }
      else {
        const hov = UI.hovered(x, y, CARD_W, CARD_H + 14);
        Cards.draw(it.card, x, y, { hover: hov });
        if (hov) zoom = { c: it.card, x: x + CARD_W / 2, y: y + CARD_H / 2 + 60 };
        UI.hit(x, y, CARD_W, CARD_H + 14, () => { if (this.buy(it.price)) { it.sold = true; Game.run.deck.push(it.card); this.msg = `${it.card.name}! Good choice. Ooga approves.`; } });
        Gfx.sprite('coin', x + 20, y + CARD_H + 3, { scale: 1 }); Gfx.text(String(it.price), x + 31, y + CARD_H + 3, { color: Game.run.gold >= it.price ? '#f6d743' : '#ff6b6b' });
      }
      x += 78;
    }
    // relics
    let rx = 250; const ry = 186;
    Gfx.text('RELICS', 240, 174, { color: '#a89aa8' });
    for (const it of this.relics) {
      const r = RELICS[it.id];
      Gfx.panel(rx, ry, 170, 44, { fill: it.sold ? '#1a1620' : '#2a2030', shadow: false });
      if (it.sold) Gfx.text('SOLD', rx + 85, ry + 18, { color: '#8f8f9a', align: 'center' });
      else {
        Gfx.sprite(r.sprite, rx + 8, ry + 10, { scale: 2 });
        Gfx.text(r.name, rx + 34, ry + 8, { color: '#f6d743' });
        Gfx.sprite('coin', rx + 34, ry + 22, { scale: 1 }); Gfx.text(String(it.price), rx + 45, ry + 22, { color: Game.run.gold >= it.price ? '#f6d743' : '#ff6b6b' });
        if (UI.hit(rx, ry, 170, 44, () => { if (this.buy(it.price)) { it.sold = true; Relics.give(it.id); this.msg = `The ${r.name}? Ooga's grandmother found that one. Treat it well.`; } })) UI.tooltip(rx, ry + 46, [r.name, r.desc], { width: 170 });
      }
      rx += 180;
    }
    // remove card
    const ok = !this.removed;
    UI.button(250, 240, 350, 30, '', () => { if (!ok) return; if (Game.run.gold < this.removePrice) { AudioSys.sfx('error'); this.msg = 'No pebbles, no service!'; return; } Game.overlay = new DeckOverlay(Game.run.deck.slice(), 'REMOVE A CARD', { onPick: c => { Game.run.gold -= this.removePrice; const i = Game.run.deck.indexOf(c); if (i >= 0) Game.run.deck.splice(i, 1); this.removed = true; AudioSys.sfx('whoosh'); Game.overlay = null; this.msg = `Ooga eats ${c.def.name}. Tastes like parchment.`; }, allowClose: true }); }, { disabled: !ok });
    Gfx.text(ok ? 'CARD REMOVAL SERVICE' : 'CARD REMOVAL (USED)', 260, 245, { color: ok ? '#f6d743' : '#8f8f9a' });
    Gfx.sprite('coin', 260, 257, { scale: 1 }); Gfx.text(`${this.removePrice}  Ooga eats one card from your deck.`, 271, 257, { color: ok ? '#ece6dc' : '#8f8f9a' });
    UI.button(500, 300, 110, 26, 'LEAVE', () => Game.afterNode());
    if (zoom) Cards.zoom(zoom.c, zoom.x, zoom.y);
    Game.drawRunBar(this);
  }
}

// ------------------------------------------------------------------------- Treasure
class TreasureScene {
  constructor() { this.t = 0; const rng = new RNG(Game.run.seed + Game.run.floor * 277); this.opened = false; this.choices = []; const a = Relics.randomReward(rng, ['common', 'uncommon', 'uncommon', 'rare']); if (a) this.choices.push(a); const b = Relics.randomReward(rng, ['uncommon', 'rare', 'rare'], a ? [a] : []); if (b) this.choices.push(b); this.taken = null; }
  enter() { AudioSys.play('event', { fade: 0.6 }); }
  exit() { }
  update(dt) { this.t += dt; for (const k of Input.keys) if (k.code === 'Escape') Game.pause(); }
  click() { }
  draw() {
    Backgrounds.draw(Game.run.act, this.t);
    Gfx.rectA(0, 0, W, H, '#16101c', 0.4);
    Gfx.sprite('lm_cave', 320, GROUND_Y + 4, { anchor: 'bc', scale: 3 });
    Gfx.sprite('node_treasure', 320, GROUND_Y - 10 - (this.opened ? 6 : 0), { anchor: 'bc', scale: 4 });
    if (this.opened) { for (let i = 0; i < 2; i++) Particles.spawn(320 + rnd(-20, 20), GROUND_Y - 40, { n: 1, color: ['#f6d743', '#ffffff'], speed: 40, gravity: -80, life: 1, size: 2 }); }
    Gfx.sprite('onga', 220, GROUND_Y + 2, { anchor: 'bc', scale: 3, frame: Math.floor(this.t * 2) % 2 });
    if (!this.opened) {
      Gfx.text('A hidden cache! Bones, feathers... and treasure.', 320, 40, { color: '#ece6dc', align: 'center', outline: true });
      UI.button(270, 60, 100, 26, 'OPEN IT', () => { this.opened = true; AudioSys.sfx('relic'); });
    } else if (!this.taken) {
      Gfx.text('CHOOSE ONE RELIC', 320, 34, { color: '#f6d743', align: 'center', scale: 2, outline: true });
      let x = 320 - (this.choices.length * 190 - 10) / 2;
      for (const id of this.choices) {
        const r = RELICS[id];
        const hov = UI.hovered(x, 60, 180, 70);
        Gfx.panel(x, 60, 180, 70, { fill: hov ? '#3a2c3f' : '#221a2a', border: hov ? '#f6d743' : '#a89aa8' });
        Gfx.sprite(r.sprite, x + 10, 72, { scale: 3 });
        Gfx.text(r.name, x + 48, 68, { color: '#f6d743' });
        Gfx.textWrap(r.desc, x + 48, 80, 124, { lineHeight: 9 });
        UI.hit(x, 60, 180, 70, () => { Relics.give(id); this.taken = id; });
        x += 190;
      }
    } else {
      Gfx.text(`${RELICS[this.taken].name} acquired!`, 320, 50, { color: '#f6d743', align: 'center', scale: 2, outline: true });
      UI.button(270, 80, 100, 26, 'CONTINUE', () => Game.afterNode());
    }
    Game.drawRunBar(this);
  }
}

// ------------------------------------------------------------------------- Reward
class RewardScene {
  constructor(o) { this.o = o; this.t = 0; this.goldTaken = false; this.cardTaken = o.cards.length === 0; this.relicTaken = !o.relics || !o.relics.length; this.hover = -1; }
  enter() { AudioSys.play('map', { fade: 1 }); Game.run.gold += this.o.gold; AudioSys.sfx('gold'); }
  exit() { }
  update(dt) { this.t += dt; for (const k of Input.keys) if (k.code === 'Escape') Game.pause(); }
  click() { }
  draw() {
    Backgrounds.draw(Game.run.act, this.t);
    Gfx.rectA(0, 0, W, H, '#16101c', 0.5);
    Gfx.text(this.o.kind === 'boss' ? 'BOSS DEFEATED!' : 'VICTORY!', 320, 28, { color: '#f6d743', align: 'center', scale: 3, outline: true });
    Gfx.sprite('coin', 286, 56, { scale: 1 }); Gfx.text(`+${this.o.gold} gold`, 298, 56, { color: '#f6d743' });
    // relics
    let y = 72;
    if (this.o.relics && this.o.relics.length) {
      if (!this.relicTaken) {
        Gfx.text(this.o.relics.length > 1 ? 'CHOOSE A RELIC' : 'RELIC FOUND', 320, y, { color: '#a89aa8', align: 'center' });
        let x = 320 - (this.o.relics.length * 190 - 10) / 2;
        for (const id of this.o.relics) {
          const r = RELICS[id]; const hov = UI.hovered(x, y + 10, 180, 54);
          Gfx.panel(x, y + 10, 180, 54, { fill: hov ? '#3a2c3f' : '#221a2a', border: hov ? '#f6d743' : '#a89aa8' });
          Gfx.sprite(r.sprite, x + 8, y + 18, { scale: 2 }); Gfx.text(r.name, x + 34, y + 16, { color: '#f6d743' });
          Gfx.textWrap(r.desc, x + 34, y + 27, 140, { lineHeight: 9 });
          UI.hit(x, y + 10, 180, 54, () => { Relics.give(id); this.relicTaken = true; });
          x += 190;
        }
      } else Gfx.text('Relic acquired!', 320, y + 10, { color: '#a3e04a', align: 'center' });
      y += 74;
    }
    // cards
    if (!this.cardTaken) {
      Gfx.text('ADD A RIFF TO YOUR DECK', 320, y, { color: '#a89aa8', align: 'center' });
      const n = this.o.cards.length; const sp = 94; let x = 320 - (n * sp - (sp - CARD_W)) / 2; let zoom = null;
      for (let i = 0; i < n; i++) {
        const c = this.o.cards[i]; const hov = UI.hovered(x, y + 12, CARD_W, CARD_H);
        Cards.draw(c, x, y + 12, { hover: hov, scale: 1 });
        if (hov) zoom = { c, x: x + CARD_W / 2 + (x < 320 ? 100 : -100), y: y + 12 + CARD_H / 2 };
        UI.hit(x, y + 12, CARD_W, CARD_H, () => { Game.run.deck.push(c); this.cardTaken = true; AudioSys.sfx('unlock'); });
        x += sp;
      }
      UI.button(285, y + 12 + CARD_H + 6, 70, 20, 'SKIP', () => { this.cardTaken = true; });
      if (zoom) Cards.zoom(zoom.c, zoom.x, zoom.y);
    } else if (this.o.cards.length) Gfx.text('Riff learned!', 320, y + 20, { color: '#a3e04a', align: 'center' });
    if (this.cardTaken) UI.button(270, H - 40, 100, 26, 'CONTINUE', () => Game.afterReward(this.o));
    Game.drawRunBar(this);
  }
}
