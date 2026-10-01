// ---------------------------------------------------------------------------
// cards.js - riff cards and their renderer
// ---------------------------------------------------------------------------
'use strict';

const CARD_W = 104, CARD_H = 142;
// Every card is a slab of rock with the move chipped into it. The type only
// changes the pigment rubbed into the carving, never the shape - a tablet is a
// tablet. stone/lit/dark are the rock itself, pig/glow are the paint.
const TYPES = {
  attack: { name: 'RIFF', pig: '#9c3510', glow: '#ffa832', wash: '#5c1607' },
  skill: { name: 'MOVE', pig: '#1d3d72', glow: '#6aa9ee', wash: '#101f3d' },
  rally: { name: 'RALLY', pig: '#a03a68', glow: '#ffb0cf', wash: '#58203c' },
  power: { name: 'POWER', pig: '#4b2070', glow: '#b177e6', wash: '#281040' },
  special: { name: 'SOLO', pig: '#5c1607', glow: '#ffe98a', wash: '#3f0e18' },
};
const STONE = { face: '#7a6d8a', lit: '#bdbccd', mid: '#574a66', dark: '#3b3048', ink: '#241c2e' };
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
  // ------------------------------------------- found instruments, each played its own way
  rib_marimba: { name: 'Rib Marimba', type: 'attack', cost: 1, rarity: 'uncommon', art: 'art_note', target: 'enemy', riff: RIFF.med, inst: 'marimba',
    v: { dmg: 9, draw: 1 }, up: v => { v.dmg = 12; },
    desc: (v, c) => `Play the {y}Marimba{/}. Deal {y}${Cards.dmg(v.dmg, c)}{/} damage. Draw ${v.draw}.`,
    effect: function* (c, card, t, r) { yield* c.dealDamage(t, c.riffDamage(card, r)); c.drawCards(card.v.draw); } },
  cave_chimes: { name: 'Cave Chimes', type: 'skill', cost: 1, rarity: 'uncommon', art: 'art_moon', target: 'self', riff: RIFF.med, inst: 'chimes',
    v: { block: 7, weak: 1 }, up: v => { v.block = 10; v.weak = 2; },
    desc: v => `Play the {c}Chimes{/}. Gain {b}${v.block}{/} Block. {o}${v.weak}{/} Weak to ALL.`,
    effect: function* (c, card, t, r) { c.gainBlock(Math.round(card.v.block * (r ? Math.min(1.4, r.mult) : 1))); for (const e of c.alive()) c.applyEnemy(e, 'weak', card.v.weak); yield 0.12; } },
  boom_log: { name: 'Boom-Log', type: 'attack', cost: 2, rarity: 'rare', art: 'art_boulder', target: 'all', riff: RIFF.med, inst: 'boomlog',
    v: { dmg: 11 }, up: v => { v.dmg = 15; },
    desc: (v, c) => `Play the {o}Boom-Log{/}. Deal {y}${Cards.dmg(v.dmg, c)}{/} to ALL. Grade A: {c}Stun{/} one.`,
    effect: function* (c, card, t, r) { Juice.shake(12, 0.5); yield* c.dealAll(c.riffDamage(card, r)); const f = c.alive()[0]; if (f && r && (r.grade[0] === 'S' || r.grade === 'A')) c.stun(f, 1); } },
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
  // the cards a hero can be dealt: the family's shared ones and their own
  pool(rarity, hero) { return Object.keys(CARDS).filter(k => CARDS[k].rarity === rarity && (!CARDS[k].hero || CARDS[k].hero === hero)); },
  randomReward(rng, n = 3, exclude = [], hero, boost = 0) {
    hero = hero || (Game.run && Game.run.hero) || 'bronk';
    const out = []; let guard = 0;
    while (out.length < n && guard++ < 200) {
      const r = rng.next(); const rar = r < 0.08 + boost ? 'rare' : r < 0.42 + boost ? 'uncommon' : 'common';
      let pool = this.pool(rar, hero);
      // two offers in three are the hero's own
      const own = pool.filter(k => CARDS[k].hero === hero);
      if (own.length && rng.chance(0.62)) pool = own;
      if (!pool.length) continue;
      const id = rng.pick(pool);
      if (out.includes(id) || exclude.includes(id)) continue;
      out.push(id);
    }
    return out.map(id => this.make(id));
  },
  // -------------------------------------------------------------------- draw
  // --------------------------------------------------------------- the slab
  // A hand-chipped stone tablet: the outline is notched, the face is speckled
  // and cracked, every recess is cut with a lit top edge and a shadowed
  // bottom one, and the writing is carved rather than printed.
  slab(x, y, w, h, o = {}) {
    const ctx = Gfx.ctx;
    const seed = o.seed || 0;
    const jit = i => ((Math.sin((i + seed) * 12.9898) * 43758.5453) % 1 + 1) % 1;
    // the silhouette, walked as a ragged polygon
    ctx.beginPath();
    const pts = [];
    const side = (x0, y0, x1, y1, n, i0) => {
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const nx = x0 + (x1 - x0) * t, ny = y0 + (y1 - y0) * t;
        const j = (jit(i0 + i) - 0.5) * 3.4;
        pts.push([nx + (y0 === y1 ? 0 : j), ny + (x0 === x1 ? 0 : j)]);
      }
    };
    side(x + 4, y, x + w - 4, y, 7, 1);
    side(x + w, y + 5, x + w, y + h - 5, 9, 20);
    side(x + w - 4, y + h, x + 4, y + h, 7, 40);
    side(x, y + h - 5, x, y + 5, 9, 60);
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts) ctx.lineTo(p[0], p[1]);
    ctx.closePath();
    return ctx;
  },
  // a recess cut into the face: dark inside, lit along its top and left
  carve(x, y, w, h, fill) {
    Gfx.round(x, y, w, h, 2, STONE.ink);
    Gfx.round(x + 1, y + 1, w - 2, h - 2, 2, fill);
    Gfx.rectA(x + 1, y + h - 2, w - 2, 1, STONE.lit, 0.35);
    Gfx.rectA(x + 1, y + 1, w - 2, 1, '#120c16', 0.45);
  },
  draw(c, x, y, o = {}) {
    const s = o.scale || 1, w = Math.round(CARD_W * s), h = Math.round(CARD_H * s);
    const T = TYPES[c.def.type] || TYPES.skill;
    const ctx = Gfx.ctx;
    x = Math.round(x); y = Math.round(y);
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    const glow = RARITY_GLOW[c.def.rarity];
    if (glow && !o.flat) {
      ctx.globalAlpha = (o.alpha ?? 1) * (0.22 + Math.sin(Time.t * 3 + c.uid) * 0.08);
      Gfx.round(x - 5, y - 5, w + 10, h + 10, 6, glow);
      ctx.globalAlpha = o.alpha ?? 1;
    }
    const dead = o.playable === false;
    const L = this.layout(c, s, o.combat);
    // ---- the painting, edge to edge
    Gfx.rectA(x + 3, y + 6, w, h, '#000000', 0.45);
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(CardArt.get(c), x, y, w, h);
    ctx.imageSmoothingEnabled = sm;
    if (dead) Gfx.rectA(x, y, w, h, '#120c16', 0.5);
    // ---- the name, on a dark band across the top
    const nb = 19;
    Gfx.rectA(x + 5, y + 5, w - 10, nb, '#0c0810', 0.78);
    Gfx.rect(x + 5, y + 5 + nb, w - 10, 1, T.glow);
    let nm = c.name, nf = Gfx.measure(nm, 1) > w - 32 ? 'classic' : 'main';
    while (Gfx.measure(nm, 1, nf) > w - 32 && nm.length > 4) nm = nm.slice(0, -1);
    Gfx.text(nm, x + w / 2 + 10, y + 10, { color: '#120c16', align: 'center', font: nf });
    Gfx.text(nm, x + w / 2 + 9, y + 9, { color: c.up ? '#a8e878' : '#fffaea', align: 'center', font: nf });
    // ---- the rules, on a dark panel along the bottom that grows to fit them
    const pt = y + h - L.ph;
    Gfx.rectA(x + 4, pt, w - 8, L.ph - 4, '#0c0810', 0.84);
    Gfx.rect(x + 4, pt, w - 8, 1, T.glow);
    // its type, on a tag at the top of the panel
    const tag = T.name + (c.def.riff ? ' ♪' : ''), tw2 = Gfx.measure(tag, 1) + 12;
    Gfx.rect(x + w / 2 - tw2 / 2, pt - 6, tw2, 13, '#08060c'); Gfx.rect(x + w / 2 - tw2 / 2 + 1, pt - 5, tw2 - 2, 11, T.pig);
    Gfx.text(tag, x + w / 2, pt - 4, { color: T.glow, align: 'center', font: 'classic' });
    const ty = pt + 10;
    L.lines.forEach((ln, i) => {
      Gfx.rich(ln, x + 10, ty + 1 + i * L.lh, { color: '#08060c', onLight: true, font: L.font });
      Gfx.rich(ln, x + 9, ty + i * L.lh, { color: '#fffaea', font: L.font, tags: { s: '#ffdcb0' } });
    });
    // ---- the frame, by rarity
    Pix.draw(CardArt.frame(c.def.rarity || 'common', Math.round(CARD_W / 2), Math.round(CARD_H / 2)), x, y, { ax: 0, ay: 0, scale: s });
    // ---- the cost: a stone in the top corner
    Pix.draw(CardArt.gem(dead ? 'dead' : c.def.type), x + 13 * s, y + 14 * s, { scale: s });
    Gfx.text(String(c.cost), x + 13 * s, y + 14 * s - 6, { color: dead ? '#7a6d8a' : '#ffffff', align: 'center', scale: 1.1, outline: true });
    // tucked into the corners: the flame for a card that burns up, the
    // swatch of ground it cares about
    if (c.def.exhaust && !c.v.noExhaust) Gfx.sprite('icon_fire', x + w - 12, y + nb + 12, { anchor: 'c', scale: 0.8, tint: '#ffa832', tintAmount: 0.5 });
    if (c.def.terrain && TERRAIN[c.def.terrain]) Pix.draw(BoardIcons.ground(c.def.terrain), x + 16, pt - 14);
    if (c.echoCopy) Gfx.rectA(x, y, w, h, '#86e8d2', 0.24);
    if (o.hover || o.selected || o.playable) {
      const col = o.selected ? '#ffe98a' : o.hover ? '#ffffff' : '#a8e878';
      ctx.globalAlpha = (o.alpha ?? 1) * (o.hover || o.selected ? 1 : 0.8);
      Gfx.rect(x - 2, y - 2, w + 4, 2, col); Gfx.rect(x - 2, y + h, w + 4, 2, col); Gfx.rect(x - 2, y, 2, h, col); Gfx.rect(x + w, y, 2, h, col);
      ctx.globalAlpha = o.alpha ?? 1;
    }
    if (o.alpha !== undefined) ctx.globalAlpha = 1;
    return { x, y, w, h };
  },
  // How tall the picture can be and which letters the rules are cut in: the
  // big letters and the full picture if they fit, then a shorter picture,
  // then the small letters.
  layout(c, s = 1, combat) {
    const w = Math.round(CARD_W * s), h = Math.round(CARD_H * s), desc = this.desc(c, combat), tw = w - 20;
    const most = Math.round(h * 0.56);
    let lines = Gfx.wrap(desc, tw, 1), lh = 12, font;
    if (lines.length * lh + 16 > most) { lines = Gfx.wrap(desc, tw, 1, 'classic'); lh = 10; font = 'classic'; }
    if (lines.length * lh + 16 > most) { lines = Gfx.wrap(desc, tw, 1, 'small'); lh = 9; font = 'small'; }
    const ph = Math.max(Math.round(48 * s), lines.length * lh + 18);
    return { ph, lines, lh, font, fits: ph <= most + 4, ah: h - ph };
  },
  zoom(c, cx, cy, o = {}) {
    const s = 1.5, w = CARD_W * s, h = CARD_H * s;
    return this.draw(c, clamp(cx - w / 2, 6, W - w - 6), clamp(cy - h / 2, 6, H - h - 6), Object.assign({ scale: s, hover: true }, o));
  },
  back(x, y, s = 1) {
    // the back of every card: tanned hide, a burnt ammonite, the frame
    Gfx.rectA(x + 3, y + 5, Math.round(CARD_W * s), Math.round(CARD_H * s), '#000000', 0.4);
    Pix.draw(CardArt.back(), x, y, { ax: 0, ay: 0, scale: s });
    Pix.draw(CardArt.frame('starter', Math.round(CARD_W / 2), Math.round(CARD_H / 2)), x, y, { ax: 0, ay: 0, scale: s });
  },
};
