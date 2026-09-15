// ---------------------------------------------------------------------------
// cards.js - card ("riff") definitions and rendering
// Card effect signature: function*(c, card, target, riff) where c = Combat,
// card = card instance, target = enemy or null, riff = rhythm result or null
// ---------------------------------------------------------------------------
'use strict';

const CARD_W = 84, CARD_H = 108;
const TYPE_COLORS = {
  attack: { frame: '#8e1f2b', fill: '#3a1a22', light: '#d83a3a', name: 'Riff' },
  skill: { frame: '#1e3a8a', fill: '#1a2238', light: '#3b82f6', name: 'Move' },
  rally: { frame: '#c95c93', fill: '#33182c', light: '#f5a3c7', name: 'Rally' },
  power: { frame: '#4b2a8a', fill: '#241a38', light: '#8b5cf6', name: 'Power' },
  special: { frame: '#c25a1c', fill: '#3a2210', light: '#f28c28', name: 'Special' },
};

// Riff (rhythm) difficulty presets: bars and density (0 easy, 1 medium, 2 hard)
const RIFF = { easy: { bars: 1, density: 0 }, med: { bars: 1, density: 1 }, hard: { bars: 1, density: 2 }, long: { bars: 2, density: 1 }, epic: { bars: 2, density: 2 } };

const CARDS = {
  // ---------- starter -------------------------------------------------------
  power_chord: { name: 'Power Chord', type: 'attack', cost: 1, rarity: 'starter', art: 'art_strum', target: 'enemy', riff: RIFF.easy,
    v: { dmg: 6 }, up: v => { v.dmg = 9; },
    desc: (v, c) => `Riff. Deal {y}${Cards.dmgText(v.dmg, c)}{/} damage.`,
    effect: function* (c, card, t, riff) { yield* c.dealDamage(t, c.riffDamage(card, riff)); } },
  stone_wall: { name: 'Stone Wall', type: 'skill', cost: 1, rarity: 'starter', art: 'art_shield', target: 'self',
    v: { block: 5 }, up: v => { v.block = 8; },
    desc: v => `Gain {b}${v.block}{/} Block.`,
    effect: function* (c, card) { c.gainBlock(card.v.block); yield 0.15; } },
  crowd_surf: { name: 'Crowd Surf', type: 'rally', cost: 1, rarity: 'starter', art: 'art_crowd', target: 'self',
    v: { hype: 25, draw: 1 }, up: v => { v.hype = 35; },
    desc: v => `Gain {p}${v.hype}{/} Hype. Draw ${v.draw} card.`,
    effect: function* (c, card) { c.addHype(card.v.hype); c.drawCards(card.v.draw); yield 0.2; } },
  // ---------- common attacks -------------------------------------------------
  riff_slam: { name: 'Riff Slam', type: 'attack', cost: 2, rarity: 'common', art: 'art_club', target: 'enemy', riff: RIFF.med,
    v: { dmg: 12 }, up: v => { v.dmg = 16; },
    desc: (v, c) => `Riff. Deal {y}${Cards.dmgText(v.dmg, c)}{/} damage.`,
    effect: function* (c, card, t, riff) { yield* c.dealDamage(t, c.riffDamage(card, riff), { heavy: true }); } },
  double_strum: { name: 'Double Strum', type: 'attack', cost: 1, rarity: 'common', art: 'art_strum', target: 'enemy', riff: RIFF.med,
    v: { dmg: 4, hits: 2 }, up: v => { v.dmg = 6; },
    desc: (v, c) => `Riff. Deal {y}${Cards.dmgText(v.dmg, c)}{/} damage ${v.hits} times.`,
    effect: function* (c, card, t, riff) { for (let i = 0; i < card.v.hits; i++) { yield* c.dealDamage(t, c.riffDamage(card, riff), { quick: true }); if (!t.alive) break; } } },
  rock_drop: { name: 'Rock Drop', type: 'attack', cost: 1, rarity: 'common', art: 'art_boulder', target: 'enemy', riff: RIFF.easy,
    v: { dmg: 7, vuln: 2 }, up: v => { v.dmg = 9; v.vuln = 3; },
    desc: (v, c) => `Riff. Deal {y}${Cards.dmgText(v.dmg, c)}{/} damage. Apply {o}${v.vuln}{/} Vulnerable.`,
    effect: function* (c, card, t, riff) { yield* c.dealDamage(t, c.riffDamage(card, riff)); if (t.alive) c.applyToEnemy(t, 'vuln', card.v.vuln); } },
  bone_crunch: { name: 'Bone Crunch', type: 'attack', cost: 1, rarity: 'common', art: 'art_club', target: 'enemy', riff: RIFF.easy,
    v: { dmg: 5, block: 4 }, up: v => { v.dmg = 7; v.block = 6; },
    desc: (v, c) => `Riff. Deal {y}${Cards.dmgText(v.dmg, c)}{/} damage. Gain {b}${v.block}{/} Block.`,
    effect: function* (c, card, t, riff) { yield* c.dealDamage(t, c.riffDamage(card, riff)); c.gainBlock(Math.round(card.v.block * (riff ? Math.min(1.5, riff.mult) : 1))); } },
  mosh_pit: { name: 'Mosh Pit', type: 'attack', cost: 1, rarity: 'common', art: 'art_crowd', target: 'all', riff: RIFF.med,
    v: { dmg: 5 }, up: v => { v.dmg = 8; },
    desc: (v, c) => `Riff. Deal {y}${Cards.dmgText(v.dmg, c)}{/} damage to ALL enemies.`,
    effect: function* (c, card, t, riff) { yield* c.dealDamageAll(c.riffDamage(card, riff)); } },
  headbang: { name: 'Headbang', type: 'attack', cost: 1, rarity: 'common', art: 'art_skull', target: 'enemy', riff: RIFF.easy,
    v: { dmg: 8, weak: 1 }, up: v => { v.dmg = 11; },
    desc: (v, c) => `Riff. Deal {y}${Cards.dmgText(v.dmg, c)}{/} damage. Apply {o}${v.weak}{/} Weak.`,
    effect: function* (c, card, t, riff) { yield* c.dealDamage(t, c.riffDamage(card, riff)); if (t.alive) c.applyToEnemy(t, 'weak', card.v.weak); } },
  stone_throw: { name: 'Stone Throw', type: 'attack', cost: 1, rarity: 'common', art: 'art_boulder', target: 'enemy',
    v: { dmg: 9 }, up: v => { v.dmg = 12; },
    desc: (v, c) => `Deal {y}${Cards.dmgText(v.dmg, c)}{/} damage. No riff needed.`,
    effect: function* (c, card, t) { yield* c.dealDamage(t, card.v.dmg, { projectile: true }); } },
  feedback: { name: 'Feedback', type: 'attack', cost: 0, rarity: 'common', art: 'art_bolt', target: 'enemy', exhaust: true,
    v: { dmg: 4 }, up: v => { v.dmg = 7; },
    desc: (v, c) => `Deal {y}${Cards.dmgText(v.dmg, c)}{/} damage. Exhaust.`,
    effect: function* (c, card, t) { yield* c.dealDamage(t, card.v.dmg, { projectile: true }); } },
  // ---------- uncommon attacks -----------------------------------------------
  wild_solo: { name: 'Wild Solo', type: 'attack', cost: 1, rarity: 'uncommon', art: 'art_note', target: 'enemy', riff: RIFF.hard,
    v: { min: 3, max: 13 }, up: v => { v.min = 6; v.max = 16; },
    desc: v => `Hard riff. Deal {y}${v.min}-${v.max}{/} damage (random).`,
    effect: function* (c, card, t, riff) { const base = rndInt(card.v.min, card.v.max); yield* c.dealDamage(t, c.riffDamage(card, riff, base), { heavy: true }); } },
  shred: { name: 'Shred', type: 'attack', cost: 1, rarity: 'uncommon', art: 'art_bolt', target: 'enemy', riff: RIFF.med,
    v: { dmg: 4, perfectBonus: 1 }, up: v => { v.dmg = 6; v.perfectBonus = 2; },
    desc: (v, c) => `Riff. Deal {y}${Cards.dmgText(v.dmg, c)}{/} damage, +${v.perfectBonus} per PERFECT note.`,
    effect: function* (c, card, t, riff) { yield* c.dealDamage(t, c.riffDamage(card, riff)); } },
  crescendo: { name: 'Crescendo', type: 'attack', cost: 1, rarity: 'uncommon', art: 'art_note', target: 'enemy', riff: RIFF.med,
    v: { dmg: 5, per: 3 }, up: v => { v.per = 4; },
    desc: (v, c) => `Riff. Deal {y}${Cards.dmgText(v.dmg, c)}{/} damage, +${v.per} per card played before it this turn.`,
    effect: function* (c, card, t, riff) { const base = card.v.dmg + card.v.per * (c.cardsPlayedThisTurn - 1); yield* c.dealDamage(t, c.riffDamage(card, riff, base), { heavy: true }); } },
  war_horn: { name: 'War Horn', type: 'attack', cost: 2, rarity: 'uncommon', art: 'art_horn', target: 'all', riff: RIFF.med,
    v: { dmg: 10, weak: 1 }, up: v => { v.dmg = 13; },
    desc: (v, c) => `Riff. Deal {y}${Cards.dmgText(v.dmg, c)}{/} damage to ALL enemies. Apply {o}${v.weak}{/} Weak to all.`,
    effect: function* (c, card, t, riff) { yield* c.dealDamageAll(c.riffDamage(card, riff)); for (const e of c.alive()) c.applyToEnemy(e, 'weak', card.v.weak); } },
  fire_riff: { name: 'Fire Riff', type: 'attack', cost: 2, rarity: 'uncommon', art: 'art_fire', target: 'enemy', riff: RIFF.med,
    v: { dmg: 12, burn: 3 }, up: v => { v.dmg = 15; v.burn = 4; },
    desc: (v, c) => `Riff. Deal {y}${Cards.dmgText(v.dmg, c)}{/} damage. Apply {o}${v.burn}{/} Burn.`,
    effect: function* (c, card, t, riff) { yield* c.dealDamage(t, c.riffDamage(card, riff), { fire: true }); if (t.alive) c.applyToEnemy(t, 'burn', card.v.burn); } },
  hype_burst: { name: 'Hype Burst', type: 'attack', cost: 1, rarity: 'uncommon', art: 'art_star', target: 'enemy',
    v: { per: 3 }, up: v => { v.per = 2; },
    desc: (v, c) => `Lose all Hype. Deal {y}1{/} damage per ${v.per} Hype lost (now {y}${Cards.dmgText(Math.max(3, Math.floor((c ? c.hype : 0) / v.per)), c)}{/}).`,
    effect: function* (c, card, t) { const dmg = Math.max(3, Math.floor(c.hype / card.v.per)); c.hype = 0; yield* c.dealDamage(t, dmg, { heavy: true }); } },
  earthquake: { name: 'Earthquake', type: 'attack', cost: 2, rarity: 'uncommon', art: 'art_foot', target: 'all', riff: RIFF.long,
    v: { dmg: 12, vuln: 1 }, up: v => { v.dmg = 16; },
    desc: (v, c) => `Long riff. Deal {y}${Cards.dmgText(v.dmg, c)}{/} damage to ALL enemies. Apply {o}${v.vuln}{/} Vulnerable to all.`,
    effect: function* (c, card, t, riff) { Shake.add(6, 0.5); yield* c.dealDamageAll(c.riffDamage(card, riff)); for (const e of c.alive()) c.applyToEnemy(e, 'vuln', card.v.vuln); } },
  // ---------- rare attacks -----------------------------------------------------
  thunder_solo: { name: 'Thunder Solo', type: 'attack', cost: 3, rarity: 'rare', art: 'art_bolt', target: 'enemy', riff: RIFF.epic,
    v: { dmg: 26 }, up: v => { v.dmg = 34; },
    desc: (v, c) => `Epic riff. Deal {y}${Cards.dmgText(v.dmg, c)}{/} damage.`,
    effect: function* (c, card, t, riff) { Flash.add('#ffffff', 0.5, 4); AudioSys.sfx('thunder'); yield* c.dealDamage(t, c.riffDamage(card, riff), { heavy: true }); } },
  meteor: { name: 'Meteor', type: 'attack', cost: 3, rarity: 'rare', art: 'art_fire', target: 'all', riff: RIFF.epic, exhaust: true,
    v: { dmg: 30 }, up: v => { v.dmg = 38; },
    desc: (v, c) => `Epic riff. Deal {y}${Cards.dmgText(v.dmg, c)}{/} damage to ALL enemies. Exhaust.`,
    effect: function* (c, card, t, riff) { Flash.add('#ff9040', 0.6, 3); Shake.add(8, 0.6); AudioSys.sfx('thunder'); yield* c.dealDamageAll(c.riffDamage(card, riff), { fire: true }); } },
  final_chorus: { name: 'Final Chorus', type: 'attack', cost: 2, rarity: 'rare', art: 'art_crowd', target: 'enemy', riff: RIFF.long,
    v: { dmg: 5 }, up: v => { v.dmg = 7; },
    desc: (v, c) => `Long riff. Deal {y}${Cards.dmgText(v.dmg, c)}{/} damage once for you and once per band member (${c ? 1 + c.band.length : '1+'} hits).`,
    effect: function* (c, card, t, riff) { const n = 1 + c.band.length; for (let i = 0; i < n; i++) { yield* c.dealDamage(t, c.riffDamage(card, riff), { quick: true }); if (!t.alive) break; } } },
  // ---------- band cards ---------------------------------------------------------
  drum_solo: { name: 'Drum Solo', type: 'attack', cost: 2, rarity: 'band', art: 'art_drum', target: 'enemy', riff: RIFF.long,
    v: { dmg: 6, hits: 3 }, up: v => { v.dmg = 8; },
    desc: (v, c) => `Bonga joins in! Long riff. Deal {y}${Cards.dmgText(v.dmg, c)}{/} damage ${v.hits} times.`,
    effect: function* (c, card, t, riff) { for (let i = 0; i < card.v.hits; i++) { yield* c.dealDamage(t, c.riffDamage(card, riff), { quick: true }); if (!t.alive) break; } } },
  bass_drop: { name: 'Bass Drop', type: 'attack', cost: 2, rarity: 'band', art: 'art_bass', target: 'all', riff: RIFF.med,
    v: { dmg: 10, block: 5 }, up: v => { v.dmg = 14; v.block = 8; },
    desc: (v, c) => `Ugg drops the bass! Riff. Deal {y}${Cards.dmgText(v.dmg, c)}{/} damage to ALL enemies. Gain {b}${v.block}{/} Block.`,
    effect: function* (c, card, t, riff) { Shake.add(5, 0.4); yield* c.dealDamageAll(c.riffDamage(card, riff)); c.gainBlock(card.v.block); } },
  flute_lullaby: { name: 'Flute Lullaby', type: 'skill', cost: 1, rarity: 'band', art: 'art_flute', target: 'enemy', exhaust: true,
    v: { stun: 1 }, up: v => { v.noExhaust = true; },
    desc: v => `Zog's lullaby. {c}Stun{/} an enemy: it skips its next turn.${v.noExhaust ? '' : ' Exhaust.'}`,
    effect: function* (c, card, t) { c.stunEnemy(t, card.v.stun); AudioSys.sfx('stun'); yield 0.3; } },
  // ---------- skills -----------------------------------------------------------
  dodge_roll: { name: 'Dodge Roll', type: 'skill', cost: 1, rarity: 'common', art: 'art_shield', target: 'self',
    v: { block: 4, draw: 1 }, up: v => { v.block = 6; },
    desc: v => `Gain {b}${v.block}{/} Block. Draw ${v.draw} card.`,
    effect: function* (c, card) { c.gainBlock(card.v.block); c.drawCards(card.v.draw); yield 0.15; } },
  drum_wall: { name: 'Drum Wall', type: 'skill', cost: 1, rarity: 'common', art: 'art_drum', target: 'self', riff: RIFF.easy,
    v: { block: 9 }, up: v => { v.block = 12; },
    desc: v => `Riff. Gain {b}${v.block}{/} Block (more on PERFECT).`,
    effect: function* (c, card, t, riff) { c.gainBlock(Math.round(card.v.block * (riff ? riff.mult : 1))); yield 0.15; } },
  war_paint: { name: 'War Paint', type: 'skill', cost: 1, rarity: 'common', art: 'art_fire', target: 'self',
    v: { str: 2 }, up: v => { v.str = 3; },
    desc: v => `Gain {r}${v.str}{/} Strength.`,
    effect: function* (c, card) { c.applyToPlayer('str', card.v.str); AudioSys.sfx('buff'); yield 0.2; } },
  tribal_dance: { name: 'Tribal Dance', type: 'skill', cost: 1, rarity: 'common', art: 'art_foot', target: 'self',
    v: { hype: 15, block: 3 }, up: v => { v.hype = 25; v.block = 5; },
    desc: v => `Gain {p}${v.hype}{/} Hype and {b}${v.block}{/} Block.`,
    effect: function* (c, card) { c.addHype(card.v.hype); c.gainBlock(card.v.block); yield 0.15; } },
  campfire_song: { name: 'Campfire Song', type: 'skill', cost: 1, rarity: 'common', art: 'art_heart', target: 'self', exhaust: true,
    v: { heal: 4 }, up: v => { v.heal = 7; },
    desc: v => `Heal {g}${v.heal}{/} HP. Exhaust.`,
    effect: function* (c, card) { c.heal(card.v.heal); yield 0.2; } },
  second_wind: { name: 'Second Wind', type: 'skill', cost: 1, rarity: 'common', art: 'art_wave', target: 'self',
    v: { draw: 2 }, up: v => { v.draw = 3; },
    desc: v => `Draw ${v.draw} cards.`,
    effect: function* (c, card) { c.drawCards(card.v.draw); yield 0.15; } },
  rock_solid: { name: 'Rock Solid', type: 'skill', cost: 1, rarity: 'common', art: 'art_boulder', target: 'self',
    v: { block: 6, per: 2 }, up: v => { v.block = 8; v.per = 3; },
    desc: (v, c) => `Gain {b}${v.block}{/} Block, +${v.per} per band member${c ? ` ({b}${v.block + v.per * c.band.length}{/})` : ''}.`,
    effect: function* (c, card) { c.gainBlock(card.v.block + card.v.per * c.band.length); yield 0.15; } },
  battle_cry: { name: 'Battle Cry', type: 'skill', cost: 0, rarity: 'uncommon', art: 'art_horn', target: 'self', exhaust: true,
    v: { energy: 1, draw: 0 }, up: v => { v.draw = 1; },
    desc: v => `Gain {c}${v.energy}{/} Energy.${v.draw ? ` Draw ${v.draw} card.` : ''} Exhaust.`,
    effect: function* (c, card) { c.gainEnergy(card.v.energy); if (card.v.draw) c.drawCards(card.v.draw); yield 0.15; } },
  stone_skin: { name: 'Stone Skin', type: 'skill', cost: 2, rarity: 'uncommon', art: 'art_shield', target: 'self',
    v: { block: 14 }, up: v => { v.block = 18; },
    desc: v => `Gain {b}${v.block}{/} Block.`,
    effect: function* (c, card) { c.gainBlock(card.v.block); yield 0.15; } },
  intimidate: { name: 'Intimidate', type: 'skill', cost: 0, rarity: 'uncommon', art: 'art_skull', target: 'all', exhaust: true,
    v: { weak: 1 }, up: v => { v.weak = 2; },
    desc: v => `Apply {o}${v.weak}{/} Weak to ALL enemies. Exhaust.`,
    effect: function* (c, card) { for (const e of c.alive()) c.applyToEnemy(e, 'weak', card.v.weak); AudioSys.sfx('roar', { pitch: 120, vol: 0.4, len: 0.5 }); yield 0.3; } },
  tuning: { name: 'Tuning', type: 'skill', cost: 1, rarity: 'uncommon', art: 'art_note', target: 'self',
    v: { hype: 10, cost: 1 }, up: v => { v.cost = 0; },
    desc: v => `Your next riff this turn has much wider hit windows. Gain {p}${v.hype}{/} Hype.`,
    effect: function* (c, card) { c.flags.tuned = true; c.addHype(card.v.hype); AudioSys.sfx('select'); yield 0.15; } },
  // ---------- rally ------------------------------------------------------------
  chant: { name: 'Chant', type: 'rally', cost: 1, rarity: 'common', art: 'art_crowd', target: 'self',
    v: { hype: 30 }, up: v => { v.hype = 40; },
    desc: v => `The tribe chants! Gain {p}${v.hype}{/} Hype.`,
    effect: function* (c, card) { c.addHype(card.v.hype); AudioSys.sfx('cheer'); yield 0.2; } },
  stage_dive: { name: 'Stage Dive', type: 'rally', cost: 1, rarity: 'common', art: 'art_star', target: 'self',
    v: { hype: 20, dmg: 4 }, up: v => { v.hype = 25; v.dmg = 7; },
    desc: (v, c) => `Gain {p}${v.hype}{/} Hype. Deal {y}${Cards.dmgText(v.dmg, c)}{/} damage to a random enemy.`,
    effect: function* (c, card) { c.addHype(card.v.hype); const e = c.randomEnemy(); if (e) yield* c.dealDamage(e, card.v.dmg); } },
  // ---------- powers -----------------------------------------------------------
  anthem: { name: 'Anthem', type: 'power', cost: 2, rarity: 'uncommon', art: 'art_note', target: 'self',
    v: { hype: 10 }, up: v => { v.hype = 15; },
    desc: v => `At the start of your turn, gain {p}${v.hype}{/} Hype.`,
    effect: function* (c, card) { c.addPower('anthem', card.v.hype); yield 0.2; } },
  groove: { name: 'Groove', type: 'power', cost: 2, rarity: 'rare', art: 'art_spiral', target: 'self',
    v: { cost: 2 }, up: v => { v.cost = 1; },
    desc: () => `At the start of your turn, gain {c}1{/} Energy.`,
    effect: function* (c, card) { c.addPower('groove', 1); yield 0.2; } },
  rhythm_master: { name: 'Rhythm Master', type: 'power', cost: 1, rarity: 'uncommon', art: 'art_star', target: 'self',
    v: { bonus: 1 }, up: v => { v.bonus = 2; },
    desc: v => `PERFECT notes deal {y}+${v.bonus}{/} damage each.`,
    effect: function* (c, card) { c.addPower('rhythmMaster', card.v.bonus); yield 0.2; } },
  thick_hide: { name: 'Thick Hide', type: 'power', cost: 1, rarity: 'uncommon', art: 'art_shield', target: 'self',
    v: { block: 3 }, up: v => { v.block = 5; },
    desc: v => `At the end of your turn, gain {b}${v.block}{/} Block.`,
    effect: function* (c, card) { c.addPower('thickHide', card.v.block); yield 0.2; } },
  amplifier: { name: 'Amplifier', type: 'power', cost: 2, rarity: 'uncommon', art: 'art_bolt', target: 'self',
    v: { pct: 25 }, up: v => { v.pct = 40; },
    desc: v => `Riffs deal {y}${v.pct}%{/} more damage.`,
    effect: function* (c, card) { c.addPower('amplifier', card.v.pct / 100); yield 0.2; } },
  spikes: { name: 'Bone Spikes', type: 'power', cost: 1, rarity: 'uncommon', art: 'art_skull', target: 'self',
    v: { thorns: 3 }, up: v => { v.thorns = 5; },
    desc: v => `When an enemy attacks you, deal {y}${v.thorns}{/} damage back.`,
    effect: function* (c, card) { c.applyToPlayer('thorns', card.v.thorns); yield 0.2; } },
  regrowth: { name: 'Moss Blanket', type: 'power', cost: 2, rarity: 'uncommon', art: 'art_heart', target: 'self',
    v: { heal: 2 }, up: v => { v.heal = 3; },
    desc: v => `At the end of your turn, heal {g}${v.heal}{/} HP.`,
    effect: function* (c, card) { c.applyToPlayer('regen', card.v.heal); yield 0.2; } },
  // ---------- special: Encore (not in deck) -------------------------------------
  encore: { name: 'ENCORE!', type: 'special', cost: 0, rarity: 'special', art: 'art_star', target: 'all', riff: RIFF.epic, exhaust: true,
    v: { per: 3 }, up: v => { },
    desc: v => `The crowd goes wild! Epic riff. Deal {y}${v.per}{/} damage to ALL enemies per note hit.`,
    effect: function* (c, card, t, riff) { const dmg = card.v.per * (riff ? riff.perfects + riff.goods : 4); Flash.add('#f5a3c7', 0.6, 3); Shake.add(6, 0.5); AudioSys.sfx('encore'); yield* c.dealDamageAll(dmg, { heavy: true }); } },
};

const Cards = {
  uid: 1,
  make(id, up = false) {
    const def = CARDS[id]; if (!def) throw new Error('no card ' + id);
    const inst = { uid: this.uid++, id, up, def };
    this.refresh(inst);
    return inst;
  },
  refresh(inst) {
    const def = inst.def || CARDS[inst.id]; inst.def = def;
    const v = Object.assign({ cost: def.cost }, deepClone(def.v || {}));
    if (inst.up && def.up) def.up(v);
    inst.v = v; inst.cost = v.cost;
    inst.name = def.name + (inst.up ? '+' : '');
    return inst;
  },
  fromSave(s) { return this.make(s.id, s.up); },
  toSave(inst) { return { id: inst.id, up: !!inst.up }; },
  dmgText(base, c) {
    if (!c) return String(base);
    const d = c.previewDamage(base);
    return d === base ? String(base) : (d > base ? `${d}` : `${d}`);
  },
  desc(inst, c) { return inst.def.desc(inst.v, c || null); },
  pool(rarity) { return Object.keys(CARDS).filter(k => CARDS[k].rarity === rarity); },
  randomReward(rng, n = 3, exclude = []) {
    const out = [];
    let guard = 0;
    while (out.length < n && guard++ < 100) {
      const r = rng.next(); const rar = r < 0.07 ? 'rare' : r < 0.40 ? 'uncommon' : 'common';
      const id = rng.pick(this.pool(rar));
      if (out.includes(id) || exclude.includes(id)) continue;
      out.push(id);
    }
    return out.map(id => this.make(id, false));
  },
  // ------------------------------------------------------------------ render
  draw(inst, x, y, o = {}) {
    const s = o.scale || 1, w = Math.round(CARD_W * s), h = Math.round(CARD_H * s);
    const def = inst.def, col = TYPE_COLORS[def.type] || TYPE_COLORS.skill;
    x = Math.round(x); y = Math.round(y);
    const ctx = Gfx.ctx;
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    Gfx.rectA(x + 2, y + 3, w, h, '#000', 0.4);
    Gfx.rect(x, y, w, h, '#16101c');
    Gfx.rect(x + 1, y + 1, w - 2, h - 2, o.playable === false ? '#2a2430' : col.frame);
    Gfx.rect(x + 3, y + 3, w - 6, h - 6, col.fill);
    if (o.hover || o.selected) Gfx.outline(x, y, w, h, o.selected ? '#f6d743' : '#ffffff');
    if (o.playable && !o.hover) Gfx.outline(x, y, w, h, '#a3e04a');
    // top row: cost orb + type label
    const hasEnergy = inst.cost <= (o.energy === undefined ? 99 : o.energy);
    Gfx.sprite(hasEnergy ? 'energy' : 'energy_empty', x + 3, y + 3, { scale: 1 });
    Gfx.text(String(inst.cost), x + 9, y + 5, { color: '#fff', align: 'center', outline: true });
    Gfx.text(col.name.toUpperCase() + (def.riff ? ' ♪' : ''), x + w - 5, y + 5, { color: col.light, align: 'right' });
    // art box
    const artH = Math.round(24 * s);
    const ax = x + 6, ay = y + 16, aw = w - 12;
    Gfx.rect(ax, ay, aw, artH, '#16101c');
    const bands = def.type === 'attack' ? ['#5a2030', '#3a1a22', '#2a1218'] : def.type === 'power' ? ['#3a2a60', '#2a1e48', '#1a1430'] : def.type === 'rally' ? ['#5a2a48', '#3a1c30', '#2a1420'] : def.type === 'special' ? ['#6a3a10', '#4a2810', '#2a1808'] : ['#2a3a60', '#1e2a48', '#141e30'];
    Gfx.bands(ax + 1, ay + 1, aw - 2, artH - 2, bands);
    Gfx.sprite(def.art || 'art_note', ax + aw / 2, ay + artH / 2, { anchor: 'c', scale: s >= 1.3 ? 3 : 2 });
    if (def.exhaust && !inst.v.noExhaust) Gfx.sprite('exhaust_icon', ax + aw - 9, ay + 1, { scale: 1 });
    // description (clipped)
    const dy = ay + artH + 4, dh = y + h - 13 - dy;
    ctx.save(); ctx.beginPath(); ctx.rect(x + 3, dy - 1, w - 6, dh + 1); ctx.clip();
    const desc = this.desc(inst, o.combat);
    const lines = Gfx.textWrap(desc, x + 5, dy, w - 10, { color: '#ece6dc', lineHeight: 9 });
    ctx.restore();
    if (lines * 9 > dh + 2 && !o.hover) Gfx.text('...', x + w - 8, y + h - 20, { color: '#a89aa8', align: 'right' });
    // name banner
    Gfx.rect(x + 3, y + h - 12, w - 6, 9, col.frame);
    let nm = inst.name; while (Font.width(nm, 1) > w - 8 && nm.length > 3) nm = nm.slice(0, -1);
    Gfx.text(nm, x + w / 2, y + h - 11, { color: inst.up ? '#a3e04a' : '#ffffff', align: 'center' });
    if (o.alpha !== undefined) ctx.globalAlpha = 1;
    return { x, y, w, h };
  },
  // enlarged card drawn near (cx, cy) and clamped on screen - for hover previews
  zoom(inst, cx, cy, o = {}) {
    const s = 1.45, w = Math.round(CARD_W * s), h = Math.round(CARD_H * s);
    const x = clamp(cx - w / 2, 4, W - w - 4), y = clamp(cy - h / 2, 4, H - h - 4);
    return this.draw(inst, x, y, Object.assign({ scale: s, hover: true }, o));
  },
  // draw a mini card back (for piles)
  drawBack(x, y, s = 1) {
    const w = Math.round(CARD_W * s), h = Math.round(CARD_H * s);
    Gfx.rect(x, y, w, h, '#16101c'); Gfx.rect(x + 1, y + 1, w - 2, h - 2, '#5a3a1b');
    Gfx.rect(x + 3, y + 3, w - 6, h - 6, '#8a5a2b');
    Gfx.sprite('art_note', x + w / 2, y + h / 2, { anchor: 'c', scale: 1 });
  }
};
