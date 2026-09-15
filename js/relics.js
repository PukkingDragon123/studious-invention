// ---------------------------------------------------------------------------
// relics.js - relic definitions. Hooks receive the Combat instance (c).
// mods are read via Relics.mod(name) (summed) / Relics.mult(name) (multiplied)
// ---------------------------------------------------------------------------
'use strict';

const RELICS = {
  bone_pick: { name: 'Bone Pick', tier: 'starter', sprite: 'relic_bone_pick', desc: "Onga's lucky pick. At the start of each combat, draw {y}1{/} extra card.",
    onCombatStart: c => { c.drawCards(1); } },
  trex_head: { name: 'T-Rex Head', tier: 'rare', sprite: 'relic_trex_head', desc: 'Wear the skull of a king. At the start of combat, {r}ROAR{/}: all enemies take {y}6{/} damage and gain {o}1{/} Weak.',
    onCombatStart: function* (c) { AudioSys.sfx('roar', { pitch: 60, vol: 1, len: 1.2 }); Shake.add(5, 0.5); yield 0.4; for (const e of c.alive()) { c.damageEnemy(e, 6, { source: 'relic' }); c.applyToEnemy(e, 'weak', 1); } yield 0.4; } },
  mammoth_tusk: { name: 'Mammoth Tusk', tier: 'boss', sprite: 'relic_mammoth_tusk', desc: 'Gain {c}1{/} extra Energy at the start of each turn.', mods: { extraEnergy: 1 } },
  saber_fang: { name: 'Sabertooth Fang', tier: 'common', sprite: 'relic_saber_fang', desc: 'Whenever you kill an enemy, heal {g}3{/} HP.',
    onKill: c => { c.heal(3); } },
  fire_stone: { name: 'Fire Stone', tier: 'common', sprite: 'relic_fire_stone', desc: 'At the start of combat, deal {y}4{/} damage to ALL enemies.',
    onCombatStart: function* (c) { AudioSys.sfx('fire'); yield 0.2; for (const e of c.alive()) c.damageEnemy(e, 4, { source: 'relic', fire: true }); yield 0.3; } },
  dino_egg: { name: 'Dino Egg', tier: 'uncommon', sprite: 'relic_dino_egg', desc: 'Warm and humming. Heal {g}6{/} HP after each combat.',
    onCombatEnd: c => { c.heal(6, true); } },
  meteor_shard: { name: 'Meteor Shard', tier: 'uncommon', sprite: 'relic_meteor_shard', desc: 'Star-metal that hums with the beat. Gain {p}50%{/} more Hype.', mods: { hypeMult: 1.5 } },
  wheel: { name: 'The Wheel', tier: 'rare', sprite: 'relic_wheel', desc: 'A revolutionary invention. Draw {y}1{/} extra card each turn.', mods: { extraDraw: 1 } },
  bone_necklace: { name: 'Bone Necklace', tier: 'common', sprite: 'relic_bone_necklace', desc: 'Gain {g}8{/} Max HP.',
    onPickup: run => { run.maxHp += 8; run.hp += 8; } },
  tar_bucket: { name: 'Tar Bucket', tier: 'uncommon', sprite: 'relic_tar_bucket', desc: 'Sticky! Enemies start combat with {o}1{/} Weak.',
    onCombatStart: c => { for (const e of c.alive()) c.applyToEnemy(e, 'weak', 1, true); } },
  ancient_shell: { name: 'Ancient Shell', tier: 'common', sprite: 'relic_ancient_shell', desc: 'Start each combat with {b}6{/} Block.',
    onCombatStart: c => { c.gainBlock(6); } },
  lucky_feather: { name: 'Lucky Feather', tier: 'uncommon', sprite: 'relic_lucky_feather', desc: 'Riff hit windows are {y}30%{/} wider.', mods: { windowMult: 1.3 } },
  echo_drum: { name: 'Echo Drum', tier: 'rare', sprite: 'relic_echo_drum', desc: 'Whenever you reach a {y}15{/} note combo, gain {c}1{/} Energy.',
    onCombo: (c, combo) => { if (combo === 15) { c.gainEnergy(1); Popups.add(c.px, c.py - 90, '+1 ENERGY', '#5ee0f0'); } } },
  cave_painting: { name: 'Cave Painting', tier: 'uncommon', sprite: 'relic_cave_painting', desc: 'Ancient wisdom. Card rewards offer {y}4{/} choices.', mods: { rewardChoices: 1 } },
  golden_banana: { name: 'Golden Banana', tier: 'shop', sprite: 'relic_golden_banana', desc: 'Enemies drop {y}50%{/} more gold.', mods: { goldMult: 1.5 } },
  war_drum: { name: 'War Drum', tier: 'event', sprite: 'relic_war_drum', desc: 'The tribes march with you. Start each combat with {p}30{/} Hype.',
    onCombatStart: c => { c.addHype(30, true); } },
  amber: { name: 'Amber Charm', tier: 'common', sprite: 'relic_amber', desc: 'At the start of your turn, if you have no Block, gain {b}3{/} Block.',
    onTurnStart: c => { if (c.player.block <= 0) c.gainBlock(3); } },
  club_of_kings: { name: 'Club of Kings', tier: 'boss', sprite: 'relic_club_of_kings', desc: 'Start each combat with {r}3{/} Strength.',
    onCombatStart: c => { c.applyToPlayer('str', 3, true); } },
  stone_tablet: { name: 'Stone Tablet', tier: 'rare', sprite: 'relic_stone_tablet', desc: 'The old rhythms. {p}ENCORE{/} is ready at {y}75{/} Hype instead of 100.', mods: { encoreThreshold: -25 } },
  moon_flute: { name: 'Moon Flute', tier: 'event', sprite: 'relic_moon_flute', desc: 'At the start of combat, {c}Stun{/} the enemy with the most HP for 1 turn.',
    onCombatStart: c => { const es = c.alive(); if (!es.length) return; const t = es.reduce((a, b) => b.hp > a.hp ? b : a); c.stunEnemy(t, 1); } },
  tribal_mask: { name: 'Tribal Mask', tier: 'uncommon', sprite: 'relic_tribal_mask', desc: 'Scary face. Enemy attacks deal {b}1{/} less damage.', mods: { dmgReduce: 1 } },
  volcano_heart: { name: 'Volcano Heart', tier: 'boss', sprite: 'relic_volcano_heart', desc: 'Burning passion. Your riffs apply {o}1{/} Burn.', mods: { burnOnHit: 1 } },
  thunder_egg: { name: 'Thunder Egg', tier: 'rare', sprite: 'relic_thunder_egg', desc: 'Every {y}3rd{/} card you play each turn zaps a random enemy for {y}8{/} damage.',
    onCardPlayed: c => { if (c.cardsPlayedThisTurn % 3 === 0) { const e = c.randomEnemy(); if (e) { AudioSys.sfx('thunder'); c.damageEnemy(e, 8, { source: 'relic' }); } } } },
  petra_ribbon: { name: "Petra's Ribbon", tier: 'event', sprite: 'relic_petra_ribbon', desc: 'A token of hope. Gain {g}12{/} Max HP.',
    onPickup: run => { run.maxHp += 12; run.hp += 12; } },
};

const Relics = {
  get(id) { return RELICS[id]; },
  owned() { return (Game.run ? Game.run.relics : []).map(id => RELICS[id]).filter(Boolean); },
  has(id) { return !!(Game.run && Game.run.relics.includes(id)); },
  mod(name, def = 0) { let v = def; for (const r of this.owned()) if (r.mods && r.mods[name] !== undefined) v += r.mods[name]; return v; },
  mult(name) { let v = 1; for (const r of this.owned()) if (r.mods && r.mods[name] !== undefined) v *= r.mods[name]; return v; },
  // trigger a hook on every owned relic; generator hooks are run as coroutines (returns a generator that waits for them)
  *trigger(hook, c, ...args) {
    for (const r of this.owned()) {
      const fn = r[hook]; if (!fn) continue;
      const res = fn(c, ...args);
      if (res && typeof res.next === 'function') { c.flashRelic(r); yield* res; }
      else if (fn.length && hook !== 'onCardPlayed') c.flashRelic(r);
    }
  },
  pool(tier, exclude = []) { return Object.keys(RELICS).filter(k => RELICS[k].tier === tier && !exclude.includes(k)); },
  randomReward(rng, tiers = ['common', 'common', 'uncommon', 'rare'], exclude = []) {
    const owned = Game.run ? Game.run.relics : [];
    const ex = exclude.concat(owned);
    for (let i = 0; i < 20; i++) {
      const tier = rng.pick(tiers); const p = this.pool(tier, ex);
      if (p.length) return rng.pick(p);
    }
    const any = Object.keys(RELICS).filter(k => !ex.includes(k) && !['starter', 'event', 'shop', 'boss'].includes(RELICS[k].tier));
    return any.length ? rng.pick(any) : null;
  },
  give(id) {
    const run = Game.run; if (!run || run.relics.includes(id)) return;
    run.relics.push(id);
    const r = RELICS[id]; if (r.onPickup) r.onPickup(run);
    AudioSys.sfx('relic');
  },
  drawIcon(id, x, y, scale = 1, tipBelow = true) {
    const r = RELICS[id]; if (!r) return;
    const hov = UI.hovered(x - 1, y - 1, 10 * scale + 2, 10 * scale + 2);
    Gfx.sprite(r.sprite, x, y, { scale });
    if (hov) { UI.hoverAny = false; UI.tooltip(x, tipBelow ? y + 12 * scale : y - 40, [r.name, r.desc], { width: 160 }); }
  }
};
