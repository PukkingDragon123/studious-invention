// ---------------------------------------------------------------------------
// cards.js - riff cards and their renderer
// ---------------------------------------------------------------------------
'use strict';

const CARD_W = 116, CARD_H = 158;
const TYPES = {
  attack: { name: 'RIFF', frame: '#7d1d2b', deep: '#3f0e18', light: '#ef6a5e', art: ['#5c1622', '#3a0f18', '#240a10'] },
  skill: { name: 'MOVE', frame: '#1d3d72', deep: '#101f3d', light: '#6aa9ee', art: ['#17305a', '#101f3d', '#0a1428'] },
  rally: { name: 'RALLY', frame: '#a03a68', deep: '#58203c', light: '#ffb0cf', art: ['#6e2748', '#44182d', '#2a0f1c'] },
  power: { name: 'POWER', frame: '#4b2070', deep: '#281040', light: '#b177e6', art: ['#3a1758', '#281040', '#180828'] },
  special: { name: 'SOLO', frame: '#9c3510', deep: '#5c1607', light: '#ffa832', art: ['#7a2a0e', '#4c1608', '#2c0d05'] },
};
const RARITY_GLOW = { common: null, uncommon: '#6aa9ee', rare: '#ffe98a', band: '#ffb0cf', starter: null, special: '#ffa832' };

// rhythm presets -> Riff options
const RIFF = {
  easy: { bars: 1, density: 0 },
  med: { bars: 1, density: 1 },
  hard: { bars: 1, density: 2 },
  long: { bars: 2, density: 1 },
  duel: { bars: 1, density: 1, callResponse: true },
  epic: { bars: 2, density: 2 },
};

const CARDS = {
  // ---------------------------------------------------------------- starters
  power_chord: { name: 'Power Chord', type: 'attack', cost: 1, rarity: 'starter', art: 'art_strum', target: 'enemy', riff: RIFF.easy,
    v: { dmg: 7 }, up: v => { v.dmg = 10; },
    desc: (v, c) => `Riff. Deal {y}${Cards.dmg(v.dmg, c)}{/} damage.`,
    effect: function* (c, card, t, r) { yield* c.dealDamage(t, c.riffDamage(card, r)); } },
  stone_wall: { name: 'Stone Wall', type: 'skill', cost: 1, rarity: 'starter', art: 'art_shield', target: 'self',
    v: { block: 6 }, up: v => { v.block = 9; },
    desc: v => `Gain {b}${v.block}{/} Block.`,
    effect: function* (c, card) { c.gainBlock(card.v.block); yield 0.12; } },
  crowd_surf: { name: 'Crowd Surf', type: 'rally', cost: 1, rarity: 'starter', art: 'art_crowd', target: 'self',
    v: { hype: 25, draw: 1 }, up: v => { v.hype = 35; },
    desc: v => `Gain {p}${v.hype}{/} Hype. Draw ${v.draw} card.`,
    effect: function* (c, card) { c.addHype(card.v.hype); c.drawCards(card.v.draw); yield 0.15; } },
  // ----------------------------------------------------------------- attacks
  riff_slam: { name: 'Riff Slam', type: 'attack', cost: 2, rarity: 'common', art: 'art_club', target: 'enemy', riff: RIFF.med,
    v: { dmg: 14 }, up: v => { v.dmg = 19; },
    desc: (v, c) => `Riff. Deal {y}${Cards.dmg(v.dmg, c)}{/} damage.`,
    effect: function* (c, card, t, r) { yield* c.dealDamage(t, c.riffDamage(card, r), { heavy: true }); } },
  double_strum: { name: 'Double Strum', type: 'attack', cost: 1, rarity: 'common', art: 'art_strum', target: 'enemy', riff: RIFF.med,
    v: { dmg: 5, hits: 2 }, up: v => { v.dmg = 7; },
    desc: (v, c) => `Riff. Deal {y}${Cards.dmg(v.dmg, c)}{/} damage ${v.hits} times.`,
    effect: function* (c, card, t, r) { for (let i = 0; i < card.v.hits; i++) { yield* c.dealDamage(t, c.riffDamage(card, r), { quick: true }); if (!t.alive) break; } } },
  rock_drop: { name: 'Rock Drop', type: 'attack', cost: 1, rarity: 'common', art: 'art_boulder', target: 'enemy', riff: RIFF.easy,
    v: { dmg: 8, vuln: 2 }, up: v => { v.dmg = 11; v.vuln = 3; },
    desc: (v, c) => `Riff. Deal {y}${Cards.dmg(v.dmg, c)}{/} damage. Apply {o}${v.vuln}{/} Vulnerable.`,
    effect: function* (c, card, t, r) { yield* c.dealDamage(t, c.riffDamage(card, r)); if (t.alive) c.applyEnemy(t, 'vuln', card.v.vuln); } },
  bone_crunch: { name: 'Bone Crunch', type: 'attack', cost: 1, rarity: 'common', art: 'art_skull', target: 'enemy', riff: RIFF.easy,
    v: { dmg: 6, block: 5 }, up: v => { v.dmg = 8; v.block = 7; },
    desc: (v, c) => `Riff. Deal {y}${Cards.dmg(v.dmg, c)}{/} damage. Gain {b}${v.block}{/} Block.`,
    effect: function* (c, card, t, r) { yield* c.dealDamage(t, c.riffDamage(card, r)); c.gainBlock(Math.round(card.v.block * (r ? Math.min(1.4, r.mult) : 1))); } },
  mosh_pit: { name: 'Mosh Pit', type: 'attack', cost: 1, rarity: 'common', art: 'art_crowd', target: 'all', riff: RIFF.med,
    v: { dmg: 6 }, up: v => { v.dmg = 9; },
    desc: (v, c) => `Riff. Deal {y}${Cards.dmg(v.dmg, c)}{/} damage to ALL.`,
    effect: function* (c, card, t, r) { yield* c.dealAll(c.riffDamage(card, r)); } },
  headbang: { name: 'Headbang', type: 'attack', cost: 1, rarity: 'common', art: 'art_bolt', target: 'enemy', riff: RIFF.easy,
    v: { dmg: 9, weak: 1 }, up: v => { v.dmg = 12; },
    desc: (v, c) => `Riff. Deal {y}${Cards.dmg(v.dmg, c)}{/} damage. Apply {o}${v.weak}{/} Weak.`,
    effect: function* (c, card, t, r) { yield* c.dealDamage(t, c.riffDamage(card, r)); if (t.alive) c.applyEnemy(t, 'weak', card.v.weak); } },
  stone_throw: { name: 'Stone Throw', type: 'attack', cost: 1, rarity: 'common', art: 'art_boulder', target: 'enemy',
    v: { dmg: 10 }, up: v => { v.dmg = 14; },
    desc: (v, c) => `Deal {y}${Cards.dmg(v.dmg, c)}{/} damage. No riff.`,
    effect: function* (c, card, t) { yield* c.dealDamage(t, card.v.dmg, { projectile: true }); } },
  feedback: { name: 'Feedback', type: 'attack', cost: 0, rarity: 'common', art: 'art_wave', target: 'enemy', exhaust: true,
    v: { dmg: 5 }, up: v => { v.dmg = 8; },
    desc: (v, c) => `Deal {y}${Cards.dmg(v.dmg, c)}{/} damage. Exhaust.`,
    effect: function* (c, card, t) { yield* c.dealDamage(t, card.v.dmg, { projectile: true }); } },
  wild_solo: { name: 'Wild Solo', type: 'attack', cost: 1, rarity: 'uncommon', art: 'art_note', target: 'enemy', riff: RIFF.hard,
    v: { min: 4, max: 16 }, up: v => { v.min = 8; v.max = 20; },
    desc: v => `Hard riff. Deal {y}${v.min}-${v.max}{/} damage.`,
    effect: function* (c, card, t, r) { yield* c.dealDamage(t, c.riffDamage(card, r, rndInt(card.v.min, card.v.max)), { heavy: true }); } },
  shred: { name: 'Shred', type: 'attack', cost: 1, rarity: 'uncommon', art: 'art_bolt', target: 'enemy', riff: RIFF.med,
    v: { dmg: 5, sickBonus: 2 }, up: v => { v.dmg = 7; v.sickBonus = 3; },
    desc: (v, c) => `Riff. Deal {y}${Cards.dmg(v.dmg, c)}{/} damage, +${v.sickBonus} per {c}SICK{/} note.`,
    effect: function* (c, card, t, r) { yield* c.dealDamage(t, c.riffDamage(card, r)); } },
  crescendo: { name: 'Crescendo', type: 'attack', cost: 1, rarity: 'uncommon', art: 'art_note', target: 'enemy', riff: RIFF.med,
    v: { dmg: 6, per: 4 }, up: v => { v.per = 6; },
    desc: (v, c) => `Riff. Deal {y}${Cards.dmg(v.dmg, c)}{/} damage, +${v.per} per card played before it this turn.`,
    effect: function* (c, card, t, r) { yield* c.dealDamage(t, c.riffDamage(card, r, card.v.dmg + card.v.per * (c.played - 1)), { heavy: true }); } },
  war_horn: { name: 'War Horn', type: 'attack', cost: 2, rarity: 'uncommon', art: 'art_horn', target: 'all', riff: RIFF.med,
    v: { dmg: 11, weak: 1 }, up: v => { v.dmg = 15; },
    desc: (v, c) => `Riff. Deal {y}${Cards.dmg(v.dmg, c)}{/} to ALL. Apply {o}${v.weak}{/} Weak to all.`,
    effect: function* (c, card, t, r) { yield* c.dealAll(c.riffDamage(card, r)); for (const e of c.alive()) c.applyEnemy(e, 'weak', card.v.weak); } },
  fire_riff: { name: 'Fire Riff', type: 'attack', cost: 2, rarity: 'uncommon', art: 'art_fire', target: 'enemy', riff: RIFF.med,
    v: { dmg: 13, burn: 4 }, up: v => { v.dmg = 17; v.burn = 5; },
    desc: (v, c) => `Riff. Deal {y}${Cards.dmg(v.dmg, c)}{/} damage. Apply {o}${v.burn}{/} Burn.`,
    effect: function* (c, card, t, r) { yield* c.dealDamage(t, c.riffDamage(card, r), { fire: true }); if (t.alive) c.applyEnemy(t, 'burn', card.v.burn); } },
  hype_burst: { name: 'Hype Burst', type: 'attack', cost: 1, rarity: 'uncommon', art: 'art_star', target: 'enemy',
    v: { per: 3 }, up: v => { v.per = 2; },
    desc: (v, c) => `Spend all Hype. Deal {y}1{/} damage per ${v.per} Hype (now {y}${Cards.dmg(Math.max(4, Math.floor((c ? c.hype : 0) / v.per)), c)}{/}).`,
    effect: function* (c, card, t) { const d = Math.max(4, Math.floor(c.hype / card.v.per)); c.hype = 0; yield* c.dealDamage(t, d, { heavy: true }); } },
  earthquake: { name: 'Earthquake', type: 'attack', cost: 2, rarity: 'uncommon', art: 'art_foot', target: 'all', riff: RIFF.long,
    v: { dmg: 13, vuln: 1 }, up: v => { v.dmg = 18; },
    desc: (v, c) => `Long riff. Deal {y}${Cards.dmg(v.dmg, c)}{/} to ALL and apply {o}${v.vuln}{/} Vulnerable.`,
    effect: function* (c, card, t, r) { Juice.shake(10, 0.6); yield* c.dealAll(c.riffDamage(card, r)); for (const e of c.alive()) c.applyEnemy(e, 'vuln', card.v.vuln); } },
  duel_riff: { name: 'Riff Duel', type: 'attack', cost: 2, rarity: 'uncommon', art: 'art_note', target: 'enemy', riff: RIFF.duel,
    v: { dmg: 20 }, up: v => { v.dmg = 26; },
    desc: (v, c) => `{p}Call and answer{/}: the beast plays first, you answer. Deal {y}${Cards.dmg(v.dmg, c)}{/} damage.`,
    effect: function* (c, card, t, r) { yield* c.dealDamage(t, c.riffDamage(card, r), { heavy: true }); } },
  thunder_solo: { name: 'Thunder Solo', type: 'attack', cost: 3, rarity: 'rare', art: 'art_bolt', target: 'enemy', riff: RIFF.epic,
    v: { dmg: 30 }, up: v => { v.dmg = 40; },
    desc: (v, c) => `Epic riff. Deal {y}${Cards.dmg(v.dmg, c)}{/} damage.`,
    effect: function* (c, card, t, r) { Juice.flash('#ffffff', 0.55, 4); AudioSys.sfx('thunder'); yield* c.dealDamage(t, c.riffDamage(card, r), { heavy: true }); } },
  meteor: { name: 'Meteor', type: 'attack', cost: 3, rarity: 'rare', art: 'art_fire', target: 'all', riff: RIFF.epic, exhaust: true,
    v: { dmg: 34 }, up: v => { v.dmg = 44; },
    desc: (v, c) => `Epic riff. Deal {y}${Cards.dmg(v.dmg, c)}{/} to ALL. Exhaust.`,
    effect: function* (c, card, t, r) { Juice.flash('#ffa832', 0.6, 3); Juice.shake(14, 0.7); AudioSys.sfx('thunder'); yield* c.dealAll(c.riffDamage(card, r), { fire: true }); } },
  final_chorus: { name: 'Final Chorus', type: 'attack', cost: 2, rarity: 'rare', art: 'art_crowd', target: 'enemy', riff: RIFF.long,
    v: { dmg: 6 }, up: v => { v.dmg = 8; },
    desc: (v, c) => `Long riff. Deal {y}${Cards.dmg(v.dmg, c)}{/} damage once for you and once per bandmate (${c ? 1 + c.band.length : '1+'} hits).`,
    effect: function* (c, card, t, r) { const n = 1 + c.band.length; for (let i = 0; i < n; i++) { yield* c.dealDamage(t, c.riffDamage(card, r), { quick: true }); if (!t.alive) break; } } },
  // -------------------------------------------------------------- band cards
  drum_solo: { name: 'Drum Solo', type: 'attack', cost: 2, rarity: 'band', art: 'art_drum', target: 'enemy', riff: RIFF.long,
    v: { dmg: 7, hits: 3 }, up: v => { v.dmg = 9; },
    desc: (v, c) => `Long riff. Deal {y}${Cards.dmg(v.dmg, c)}{/} damage ${v.hits} times.`,
    effect: function* (c, card, t, r) { for (let i = 0; i < card.v.hits; i++) { yield* c.dealDamage(t, c.riffDamage(card, r), { quick: true }); if (!t.alive) break; } } },
  bass_drop: { name: 'Bass Drop', type: 'attack', cost: 2, rarity: 'band', art: 'art_bass', target: 'all', riff: RIFF.med,
    v: { dmg: 11, block: 6 }, up: v => { v.dmg = 15; v.block = 9; },
    desc: (v, c) => `Riff. Deal {y}${Cards.dmg(v.dmg, c)}{/} to ALL. Gain {b}${v.block}{/} Block.`,
    effect: function* (c, card, t, r) { Juice.shake(9, 0.5); yield* c.dealAll(c.riffDamage(card, r)); c.gainBlock(card.v.block); } },
  flute_lullaby: { name: 'Flute Lullaby', type: 'skill', cost: 1, rarity: 'band', art: 'art_flute', target: 'enemy', exhaust: true,
    v: { stun: 1 }, up: v => { v.noExhaust = true; },
    desc: v => `{c}Stun{/} a beast: it loses its next turn.${v.noExhaust ? '' : ' Exhaust.'}`,
    effect: function* (c, card, t) { c.stun(t, card.v.stun); AudioSys.sfx('stun'); yield 0.3; } },
  // ------------------------------------------------------------------ skills
  dodge_roll: { name: 'Dodge Roll', type: 'skill', cost: 1, rarity: 'common', art: 'art_foot', target: 'self',
    v: { block: 5, draw: 1 }, up: v => { v.block = 7; },
    desc: v => `Gain {b}${v.block}{/} Block. Draw ${v.draw} card.`,
    effect: function* (c, card) { c.gainBlock(card.v.block); c.drawCards(card.v.draw); yield 0.12; } },
  drum_wall: { name: 'Drum Wall', type: 'skill', cost: 1, rarity: 'common', art: 'art_drum', target: 'self', riff: RIFF.easy,
    v: { block: 10 }, up: v => { v.block = 14; },
    desc: v => `Riff. Gain {b}${v.block}{/} Block, more for a clean run.`,
    effect: function* (c, card, t, r) { c.gainBlock(Math.round(card.v.block * (r ? r.mult : 1))); yield 0.12; } },
  war_paint: { name: 'War Paint', type: 'skill', cost: 1, rarity: 'common', art: 'art_fire', target: 'self',
    v: { str: 2 }, up: v => { v.str = 3; },
    desc: v => `Gain {r}${v.str}{/} Strength.`,
    effect: function* (c, card) { c.applyPlayer('str', card.v.str); yield 0.18; } },
  tribal_dance: { name: 'Tribal Dance', type: 'skill', cost: 1, rarity: 'common', art: 'art_foot', target: 'self',
    v: { hype: 18, block: 4 }, up: v => { v.hype = 26; v.block = 6; },
    desc: v => `Gain {p}${v.hype}{/} Hype and {b}${v.block}{/} Block.`,
    effect: function* (c, card) { c.addHype(card.v.hype); c.gainBlock(card.v.block); yield 0.12; } },
  campfire_song: { name: 'Campfire Song', type: 'skill', cost: 1, rarity: 'common', art: 'art_heart', target: 'self', exhaust: true,
    v: { heal: 5 }, up: v => { v.heal = 8; },
    desc: v => `Heal {g}${v.heal}{/} HP. Exhaust.`,
    effect: function* (c, card) { c.heal(card.v.heal); yield 0.2; } },
  second_wind: { name: 'Second Wind', type: 'skill', cost: 1, rarity: 'common', art: 'art_wave', target: 'self',
    v: { draw: 2 }, up: v => { v.draw = 3; },
    desc: v => `Draw ${v.draw} cards.`,
    effect: function* (c, card) { c.drawCards(card.v.draw); yield 0.12; } },
  rock_solid: { name: 'Rock Solid', type: 'skill', cost: 1, rarity: 'common', art: 'art_shield', target: 'self',
    v: { block: 7, per: 3 }, up: v => { v.block = 9; v.per = 4; },
    desc: (v, c) => `Gain {b}${v.block}{/} Block, +${v.per} per bandmate${c ? ` ({b}${v.block + v.per * c.band.length}{/})` : ''}.`,
    effect: function* (c, card) { c.gainBlock(card.v.block + card.v.per * c.band.length); yield 0.12; } },
  battle_cry: { name: 'Battle Cry', type: 'skill', cost: 0, rarity: 'uncommon', art: 'art_horn', target: 'self', exhaust: true,
    v: { energy: 1, draw: 0 }, up: v => { v.draw = 1; },
    desc: v => `Gain {c}${v.energy}{/} Energy.${v.draw ? ` Draw ${v.draw} card.` : ''} Exhaust.`,
    effect: function* (c, card) { c.gainEnergy(card.v.energy); if (card.v.draw) c.drawCards(card.v.draw); yield 0.12; } },
  stone_skin: { name: 'Stone Skin', type: 'skill', cost: 2, rarity: 'uncommon', art: 'art_shield', target: 'self',
    v: { block: 16 }, up: v => { v.block = 21; },
    desc: v => `Gain {b}${v.block}{/} Block.`,
    effect: function* (c, card) { c.gainBlock(card.v.block); yield 0.12; } },
  intimidate: { name: 'Intimidate', type: 'skill', cost: 0, rarity: 'uncommon', art: 'art_skull', target: 'all', exhaust: true,
    v: { weak: 1 }, up: v => { v.weak = 2; },
    desc: v => `Apply {o}${v.weak}{/} Weak to ALL. Exhaust.`,
    effect: function* (c, card) { for (const e of c.alive()) c.applyEnemy(e, 'weak', card.v.weak); AudioSys.sfx('roar', { pitch: 130, vol: 0.4, len: 0.5 }); yield 0.28; } },
  tuning: { name: 'Tuning', type: 'skill', cost: 1, rarity: 'uncommon', art: 'art_note', target: 'self',
    v: { hype: 10 }, up: v => { v.cost = 0; },
    desc: v => `Your next riff this turn gets far wider timing windows. Gain {p}${v.hype}{/} Hype.`,
    effect: function* (c, card) { c.flags.tuned = true; c.addHype(card.v.hype); AudioSys.sfx('select'); yield 0.12; } },
  // ------------------------------------------------------------------ rally
  chant: { name: 'Chant', type: 'rally', cost: 1, rarity: 'common', art: 'art_crowd', target: 'self',
    v: { hype: 32 }, up: v => { v.hype = 44; },
    desc: v => `The valley chants. Gain {p}${v.hype}{/} Hype.`,
    effect: function* (c, card) { c.addHype(card.v.hype); AudioSys.sfx('cheer'); yield 0.2; } },
  stage_dive: { name: 'Stage Dive', type: 'rally', cost: 1, rarity: 'common', art: 'art_star', target: 'self',
    v: { hype: 20, dmg: 5 }, up: v => { v.hype = 26; v.dmg = 8; },
    desc: (v, c) => `Gain {p}${v.hype}{/} Hype. Deal {y}${Cards.dmg(v.dmg, c)}{/} to a random beast.`,
    effect: function* (c, card) { c.addHype(card.v.hype); const e = c.randomEnemy(); if (e) yield* c.dealDamage(e, card.v.dmg); } },
  // ------------------------------------------------------------------ powers
  anthem: { name: 'Anthem', type: 'power', cost: 2, rarity: 'uncommon', art: 'art_note', target: 'self',
    v: { hype: 12 }, up: v => { v.hype = 18; },
    desc: v => `Start of turn: gain {p}${v.hype}{/} Hype.`,
    effect: function* (c, card) { c.addPower('anthem', card.v.hype); yield 0.2; } },
  groove: { name: 'Groove', type: 'power', cost: 2, rarity: 'rare', art: 'art_spiral', target: 'self',
    v: {}, up: v => { v.cost = 1; },
    desc: () => `Start of turn: gain {c}1{/} Energy.`,
    effect: function* (c, card) { c.addPower('groove', 1); yield 0.2; } },
  rhythm_master: { name: 'Rhythm Master', type: 'power', cost: 1, rarity: 'uncommon', art: 'art_star', target: 'self',
    v: { bonus: 2 }, up: v => { v.bonus = 3; },
    desc: v => `{c}SICK{/} notes deal {y}+${v.bonus}{/} damage each.`,
    effect: function* (c, card) { c.addPower('sick', card.v.bonus); yield 0.2; } },
  thick_hide: { name: 'Thick Hide', type: 'power', cost: 1, rarity: 'uncommon', art: 'art_shield', target: 'self',
    v: { block: 4 }, up: v => { v.block = 6; },
    desc: v => `End of turn: gain {b}${v.block}{/} Block.`,
    effect: function* (c, card) { c.addPower('hide', card.v.block); yield 0.2; } },
  amplifier: { name: 'Amplifier', type: 'power', cost: 2, rarity: 'uncommon', art: 'art_bolt', target: 'self',
    v: { pct: 25 }, up: v => { v.pct = 40; },
    desc: v => `Riffs deal {y}${v.pct}%{/} more damage.`,
    effect: function* (c, card) { c.addPower('amp', card.v.pct / 100); yield 0.2; } },
  spikes: { name: 'Bone Spikes', type: 'power', cost: 1, rarity: 'uncommon', art: 'art_skull', target: 'self',
    v: { thorns: 4 }, up: v => { v.thorns = 6; },
    desc: v => `Attackers take {y}${v.thorns}{/} damage.`,
    effect: function* (c, card) { c.applyPlayer('thorns', card.v.thorns); yield 0.2; } },
  regrowth: { name: 'Moss Blanket', type: 'power', cost: 2, rarity: 'uncommon', art: 'art_heart', target: 'self',
    v: { heal: 3 }, up: v => { v.heal = 4; },
    desc: v => `End of turn: heal {g}${v.heal}{/} HP.`,
    effect: function* (c, card) { c.applyPlayer('regen', card.v.heal); yield 0.2; } },
  // ----------------------------------------------------------------- special
  encore: { name: 'ENCORE!', type: 'special', cost: 0, rarity: 'special', art: 'art_star', target: 'all', riff: RIFF.epic, exhaust: true,
    v: { per: 3 }, up: v => { },
    desc: v => `The whole valley joins in. Epic riff: deal {y}${v.per}{/} damage to ALL per note landed.`,
    effect: function* (c, card, t, r) { const d = card.v.per * (r ? r.hits : 6); Juice.flash('#ffb0cf', 0.6, 3); Juice.shake(12, 0.6); AudioSys.sfx('encore'); yield* c.dealAll(d, { heavy: true }); } },
};

const Cards = {
  uid: 1,
  make(id, up = false) { const def = CARDS[id]; if (!def) throw new Error('no card ' + id); const c = { uid: this.uid++, id, up, def }; this.refresh(c); return c; },
  refresh(c) {
    const def = c.def || CARDS[c.id]; c.def = def;
    const v = Object.assign({ cost: def.cost }, deepClone(def.v || {}));
    if (c.up && def.up) def.up(v);
    c.v = v; c.cost = v.cost; c.name = def.name + (c.up ? '+' : '');
    return c;
  },
  fromSave(s) { return this.make(s.id, s.up); },
  toSave(c) { return { id: c.id, up: !!c.up }; },
  dmg(base, c) { return c ? String(c.previewDamage(base)) : String(base); },
  desc(c, combat) { return c.def.desc(c.v, combat || null); },
  pool(rarity) { return Object.keys(CARDS).filter(k => CARDS[k].rarity === rarity); },
  randomReward(rng, n = 3, exclude = []) {
    const out = []; let guard = 0;
    while (out.length < n && guard++ < 120) {
      const r = rng.next(); const rar = r < 0.08 ? 'rare' : r < 0.42 ? 'uncommon' : 'common';
      const id = rng.pick(this.pool(rar));
      if (out.includes(id) || exclude.includes(id)) continue;
      out.push(id);
    }
    return out.map(id => this.make(id));
  },
  // -------------------------------------------------------------------- draw
  draw(c, x, y, o = {}) {
    const s = o.scale || 1, w = Math.round(CARD_W * s), h = Math.round(CARD_H * s);
    const T = TYPES[c.def.type] || TYPES.skill;
    const ctx = Gfx.ctx;
    x = Math.round(x); y = Math.round(y);
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    const glow = RARITY_GLOW[c.def.rarity];
    if (glow && !o.flat) { ctx.globalAlpha = (o.alpha ?? 1) * (0.25 + Math.sin(Time.t * 3 + c.uid) * 0.08); Gfx.round(x - 4, y - 4, w + 8, h + 8, 8, glow); ctx.globalAlpha = o.alpha ?? 1; }
    Gfx.rectA(x + 3, y + 6, w, h, '#000', 0.45);
    Gfx.round(x, y, w, h, 6, '#120c16');
    Gfx.round(x + 2, y + 2, w - 4, h - 4, 5, o.playable === false ? '#2a2431' : T.frame);
    Gfx.round(x + 5, y + 5, w - 10, h - 10, 4, T.deep);
    // art window
    const ax = x + 9, ay = y + 26, aw = w - 18, ah = Math.round(58 * s);
    Gfx.round(ax, ay, aw, ah, 3, '#120c16');
    Gfx.bands(ax + 2, ay + 2, aw - 4, ah - 4, T.art);
    for (let i = 0; i < 3; i++) Gfx.rectA(ax + 2, ay + 2 + i * 7, aw - 4, 1, '#ffffff', 0.05);
    Gfx.sprite(c.def.art || 'art_note', ax + aw / 2, ay + ah / 2 + 2, { anchor: 'c', scale: Math.max(1, Math.round(s * 1.2)) });
    Gfx.outlineRound(ax, ay, aw, ah, 3, T.light);
    // cost gem
    Gfx.circle(x + 13, y + 14, 12, '#120c16');
    Gfx.sprite(c.cost <= (o.energy ?? 99) ? 'icon_energy' : 'icon_energy', x + 13, y + 14, { anchor: 'c', frame: c.cost <= (o.energy ?? 99) ? 1 : 0, alpha: c.cost <= (o.energy ?? 99) ? 1 : 0.45 });
    Gfx.text(String(c.cost), x + 13, y + 9, { color: '#ffffff', align: 'center', scale: 1.1, outline: true });
    // type flag
    Gfx.text(T.name + (c.def.riff ? ' ♪' : ''), x + w - 8, y + 9, { color: T.light, align: 'right', scale: 1 });
    // name plate
    Gfx.round(x + 5, y + ah + 28, w - 10, 16, 3, '#120c16');
    let nm = c.name; while (Gfx.measure(nm, 1) > w - 16 && nm.length > 4) nm = nm.slice(0, -1);
    Gfx.text(nm, x + w / 2, y + ah + 32, { color: c.up ? '#a8e878' : '#fffaea', align: 'center' });
    // rules text
    const ty = y + ah + 50;
    ctx.save(); ctx.beginPath(); ctx.rect(x + 5, ty - 2, w - 10, h - (ty - y) - 8); ctx.clip();
    Gfx.textWrap(this.desc(c, o.combat), x + 9, ty, w - 18, { color: '#d6cfe0', lineHeight: 11 });
    ctx.restore();
    if (c.def.exhaust && !c.v.noExhaust) Gfx.sprite('icon_fire', x + w - 16, y + h - 20, { anchor: 'c', scale: 0.8, tint: '#ffa832', tintAmount: 0.5 });
    if (o.hover || o.selected) Gfx.outlineRound(x, y, w, h, 6, o.selected ? '#ffe98a' : '#ffffff');
    else if (o.playable) Gfx.outlineRound(x, y, w, h, 6, '#a8e878');
    if (o.alpha !== undefined) ctx.globalAlpha = 1;
    return { x, y, w, h };
  },
  zoom(c, cx, cy, o = {}) {
    const s = 1.5, w = CARD_W * s, h = CARD_H * s;
    return this.draw(c, clamp(cx - w / 2, 6, W - w - 6), clamp(cy - h / 2, 6, H - h - 6), Object.assign({ scale: s, hover: true }, o));
  },
  back(x, y, s = 1) {
    const w = Math.round(CARD_W * s), h = Math.round(CARD_H * s);
    Gfx.round(x, y, w, h, 5, '#120c16');
    Gfx.round(x + 3, y + 3, w - 6, h - 6, 4, '#5c3a20');
    Gfx.round(x + 7, y + 7, w - 14, h - 14, 3, '#85562f');
    Gfx.sprite('art_note', x + w / 2, y + h / 2, { anchor: 'c', scale: Math.max(1, s) });
  }
};
