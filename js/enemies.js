// ---------------------------------------------------------------------------
// enemies.js - enemy definitions, AI patterns and encounter tables
// Move fields: dmg, hits, block, str (self), weakP/vulnP/burnP (to player),
// heal (allies), summon (enemy id), summonN, stunP. intent icon is derived.
// ---------------------------------------------------------------------------
'use strict';

// Palette-swapped sprite variants
SPRITES.tricera_king = { frames: SPRITES.tricera.frames, pal: { 'b': '#5a3a6b', 't': '#8a6a9a', 'T': '#4a3a5a', 'n': '#f6d743' } };
SPRITES.raptor_alpha = { frames: SPRITES.raptor.frames, pal: { 'd': '#8a3a3a', 'l': '#d0a080', 'D': '#5a2020', 'o': '#f6d743' } };
SPRITES.compy_red = { frames: SPRITES.compy.frames, pal: { 'd': '#c25a1c', 'l': '#f6d743', 'D': '#8e1f2b' } };

const ENEMIES = {
  // ============================ ACT 1 =======================================
  compy: { name: 'Compy', sprite: 'compy', scale: 3, hp: [12, 15], gold: [4, 7], roar: { pitch: 260, len: 0.3, vol: 0.4 },
    moves: { peck: { name: 'Peck', dmg: 4 }, nibble: { name: 'Nibble', dmg: 2, hits: 2 }, scurry: { name: 'Scurry', block: 4 } },
    ai: (e, c, r) => r.weighted([{ w: 5, v: 'peck' }, { w: 3, v: 'nibble' }, { w: 2, v: 'scurry' }]) },
  raptor: { name: 'Raptor', sprite: 'raptor', scale: 3, hp: [26, 30], gold: [10, 15], roar: { pitch: 180, len: 0.5, vol: 0.6 },
    moves: { slash: { name: 'Slash', dmg: 7 }, pounce: { name: 'Pounce', dmg: 11 }, screech: { name: 'Screech', str: 2 } },
    pattern: ['slash', 'pounce', 'slash', 'screech'] },
  dodo: { name: 'Dodo', sprite: 'dodo', scale: 3, hp: [18, 22], gold: [8, 12], roar: { pitch: 400, len: 0.3, vol: 0.4 },
    moves: { peck: { name: 'Peck', dmg: 5 }, squawk: { name: 'Squawk', weakP: 1 }, flap: { name: 'Flap', block: 6 } },
    ai: (e, c, r) => r.weighted([{ w: 5, v: 'peck' }, { w: 2, v: 'squawk' }, { w: 3, v: 'flap' }]), noRepeat: true },
  boar: { name: 'Cave Boar', sprite: 'boar', scale: 3, hp: [34, 38], gold: [12, 16], roar: { pitch: 120, len: 0.5, vol: 0.6 },
    moves: { snort: { name: 'Snort', block: 5, str: 1 }, charge: { name: 'Charge', dmg: 12 }, gore: { name: 'Gore', dmg: 7 } },
    pattern: ['snort', 'charge', 'gore'] },
  grug: { name: 'Grug the Rival', sprite: 'grug', scale: 3, hp: [30, 34], gold: [14, 20], roar: { pitch: 150, len: 0.4, vol: 0.5 },
    moves: { club: { name: 'Club Smash', dmg: 8 }, rock: { name: 'Rock Throw', dmg: 5, vulnP: 1 }, thump: { name: 'Chest Thump', str: 2 } },
    pattern: ['club', 'rock', 'thump', 'club'] },
  sabertooth: { name: 'Sabertooth', sprite: 'sabertooth', scale: 3, hp: [62, 62], gold: [28, 36], elite: true, roar: { pitch: 140, len: 0.7, vol: 0.8 },
    moves: { slash: { name: 'Slash', dmg: 9 }, double: { name: 'Double Slash', dmg: 5, hits: 2 }, roar: { name: 'Roar', str: 3 }, pounce: { name: 'Pounce', dmg: 14 } },
    pattern: ['slash', 'double', 'roar', 'pounce'] },
  tricera: { name: 'Triceratops', sprite: 'tricera', scale: 3, hp: [78, 78], gold: [30, 38], elite: true, roar: { pitch: 90, len: 0.8, vol: 0.8 },
    moves: { horn: { name: 'Horn Charge', dmg: 12 }, guard: { name: 'Guard', block: 12 }, stomp: { name: 'Stomp', dmg: 8, weakP: 1 } },
    pattern: ['horn', 'guard', 'stomp'] },
  tricera_king: { name: 'Thunder Tricera', sprite: 'tricera_king', scale: 4, hp: [140, 140], gold: [70, 80], boss: true, roar: { pitch: 70, len: 1.2, vol: 1 },
    moves: { horn_toss: { name: 'Horn Toss', dmg: 11 }, bellow: { name: 'Bellow', block: 12, str: 2 }, trample: { name: 'Trample', dmg: 18 }, rally: { name: 'Rally Herd', summon: 'compy', summonN: 1, block: 6 } },
    ai: (e, c, r) => { const seq = ['horn_toss', 'bellow', 'trample', 'rally', 'horn_toss', 'trample']; let k = seq[e.turnCount % seq.length]; if (k === 'rally' && c.alive().length >= 3) k = 'bellow'; return k; } },
  // ============================ ACT 2 =======================================
  dilo: { name: 'Dilophosaurus', sprite: 'dilo', scale: 3, hp: [32, 36], gold: [12, 17], roar: { pitch: 220, len: 0.5, vol: 0.6 },
    moves: { spit: { name: 'Venom Spit', dmg: 6, weakP: 2 }, bite: { name: 'Bite', dmg: 8 }, frill: { name: 'Frill Display', block: 8 } },
    ai: (e, c, r) => r.weighted([{ w: 4, v: 'spit' }, { w: 4, v: 'bite' }, { w: 2, v: 'frill' }]), noRepeat: true },
  ptero: { name: 'Pterodactyl', sprite: 'ptero', scale: 3, hp: [28, 30], gold: [12, 16], flying: true, roar: { pitch: 500, len: 0.4, vol: 0.5 },
    moves: { swoop: { name: 'Swoop', dmg: 9 }, screech: { name: 'Screech', vulnP: 1 }, glide: { name: 'Glide', block: 7 } },
    pattern: ['swoop', 'screech', 'swoop', 'glide'] },
  anky: { name: 'Ankylosaurus', sprite: 'anky', scale: 3, hp: [50, 54], gold: [15, 20], roar: { pitch: 100, len: 0.6, vol: 0.6 },
    moves: { tail: { name: 'Tail Club', dmg: 12 }, curl: { name: 'Curl Up', block: 15 }, charge: { name: 'Slow Charge', dmg: 8 } },
    pattern: ['curl', 'tail', 'charge', 'tail'] },
  tarblob: { name: 'Tar Blob', sprite: 'tarblob', scale: 3, hp: [40, 44], gold: [12, 18], roar: { pitch: 60, len: 0.6, vol: 0.5 },
    moves: { engulf: { name: 'Engulf', dmg: 7, weakP: 1 }, ooze: { name: 'Ooze', dmg: 4, hits: 2 }, harden: { name: 'Harden', block: 6 } },
    ai: (e, c, r) => r.weighted([{ w: 4, v: 'engulf' }, { w: 3, v: 'ooze' }, { w: 2, v: 'harden' }]) },
  dragonfly: { name: 'Giant Dragonfly', sprite: 'dragonfly', scale: 3, hp: [20, 24], gold: [6, 10], flying: true, roar: { pitch: 600, len: 0.3, vol: 0.3 },
    moves: { sting: { name: 'Sting', dmg: 6 }, buzz: { name: 'Buzz', weakP: 1 }, dart: { name: 'Dart', dmg: 3, hits: 2 } },
    ai: (e, c, r) => r.weighted([{ w: 4, v: 'sting' }, { w: 2, v: 'buzz' }, { w: 3, v: 'dart' }]) },
  allo: { name: 'Allosaurus', sprite: 'allo', scale: 3, hp: [92, 92], gold: [32, 40], elite: true, roar: { pitch: 80, len: 0.9, vol: 0.9 },
    moves: { bite: { name: 'Bite', dmg: 14 }, tail: { name: 'Tail Swipe', dmg: 9, vulnP: 1 }, roar: { name: 'Roar', str: 3 } },
    pattern: ['bite', 'tail', 'roar', 'bite', 'bite'] },
  mammoth: { name: 'Mammoth', sprite: 'mammoth', scale: 3, hp: [105, 105], gold: [34, 42], elite: true, roar: { pitch: 110, len: 1, vol: 0.9 },
    moves: { tusk: { name: 'Tusk Sweep', dmg: 15 }, stomp: { name: 'Stomp', dmg: 10, weakP: 1 }, trumpet: { name: 'Trumpet', block: 12, str: 1 } },
    pattern: ['trumpet', 'tusk', 'stomp', 'tusk'] },
  spino: { name: 'Swamp Queen', sprite: 'spino', scale: 4, hp: [190, 190], gold: [80, 95], boss: true, roar: { pitch: 65, len: 1.3, vol: 1 },
    moves: { chomp: { name: 'Chomp', dmg: 18 }, sail: { name: 'Sail Slash', dmg: 11, hits: 2 }, deluge: { name: 'Deluge', block: 20, weakP: 2 }, summon: { name: 'Call the Swarm', summon: 'dragonfly', summonN: 2 }, frenzy: { name: 'FRENZY', dmg: 26 } },
    ai: (e, c) => { const seq = ['chomp', 'sail', 'deluge', 'summon', 'chomp', 'frenzy']; let k = seq[e.turnCount % seq.length]; if (k === 'summon' && c.alive().length >= 3) k = 'sail'; return k; } },
  // ============================ ACT 3 =======================================
  lizard: { name: 'Lava Lizard', sprite: 'lizard', scale: 3, hp: [40, 44], gold: [14, 19], roar: { pitch: 300, len: 0.4, vol: 0.5 },
    moves: { spit: { name: 'Fire Spit', dmg: 9, burnP: 2 }, molten: { name: 'Molten Skin', block: 8, str: 1 }, bite: { name: 'Bite', dmg: 6 } },
    ai: (e, c, r) => r.weighted([{ w: 4, v: 'spit' }, { w: 2, v: 'molten' }, { w: 3, v: 'bite' }]), noRepeat: true },
  pachy: { name: 'Pachycephalo', sprite: 'pachy', scale: 3, hp: [48, 52], gold: [15, 20], roar: { pitch: 160, len: 0.5, vol: 0.6 },
    moves: { headbutt: { name: 'Headbutt', dmg: 13 }, chargeup: { name: 'Charge Up', str: 3 }, bash: { name: 'Bash', dmg: 7, hits: 2 } },
    pattern: ['bash', 'chargeup', 'headbutt'] },
  shaman: { name: 'Ooga Shaman', sprite: 'shaman', scale: 3, hp: [45, 45], gold: [18, 24], roar: { pitch: 200, len: 0.5, vol: 0.4 },
    moves: { curse: { name: 'Curse', weakP: 2, vulnP: 1 }, bolt: { name: 'Fire Bolt', dmg: 10 }, heal: { name: 'Mend Allies', heal: 10 } },
    ai: (e, c, r) => { const others = c.alive().filter(x => x !== e && x.hp < x.maxHp); if (others.length && r.chance(0.5)) return 'heal'; return r.weighted([{ w: 3, v: 'curse' }, { w: 5, v: 'bolt' }]); }, noRepeat: true },
  carno: { name: 'Carnotaurus', sprite: 'carno', scale: 3, hp: [70, 76], gold: [20, 26], roar: { pitch: 90, len: 0.8, vol: 0.8 },
    moves: { bite: { name: 'Bite', dmg: 16 }, rush: { name: 'Rush', dmg: 12, vulnP: 1 }, roar: { name: 'Roar', str: 2, block: 6 } },
    pattern: ['rush', 'bite', 'roar', 'bite'] },
  giga: { name: 'Giganotosaurus', sprite: 'giga', scale: 3, hp: [145, 145], gold: [40, 50], elite: true, roar: { pitch: 60, len: 1.2, vol: 1 },
    moves: { mega: { name: 'Mega Bite', dmg: 22 }, tail: { name: 'Tail Sweep', dmg: 14 }, stomp: { name: 'Stomp', dmg: 10, vulnP: 2 }, roar: { name: 'Roar', str: 4 } },
    pattern: ['tail', 'stomp', 'mega', 'roar', 'tail', 'mega'] },
  raptor_alpha: { name: 'Alpha Raptor', sprite: 'raptor_alpha', scale: 3, hp: [56, 56], gold: [20, 25], elite: true, roar: { pitch: 170, len: 0.6, vol: 0.7 },
    moves: { slash: { name: 'Slash', dmg: 10 }, screech: { name: 'Screech', str: 2 }, pounce: { name: 'Pounce', dmg: 14 } },
    pattern: ['slash', 'screech', 'pounce'] },
  trex: { name: 'KING REX', sprite: 'trex', scale: 4, hp: [260, 260], gold: [150, 150], boss: true, final: true, roar: { pitch: 50, len: 1.6, vol: 1 },
    moves: {
      bite: { name: 'Bite', dmg: 20 }, tail: { name: 'Tail Whip', dmg: 14, weakP: 1 }, roar: { name: 'Royal Roar', block: 15, str: 2 }, stomp: { name: 'Stomp', dmg: 12, vulnP: 1 },
      quake: { name: 'EARTHQUAKE', dmg: 26 }, rampage: { name: 'Rampage', dmg: 8, hits: 3 }, summon: { name: 'Summon Court', summon: 'compy_red', summonN: 2 }
    },
    ai: (e, c) => {
      if (!e.phase2) { const seq = ['roar', 'bite', 'stomp', 'tail', 'bite']; return seq[e.turnCount % seq.length]; }
      const seq = ['quake', 'rampage', 'summon', 'bite', 'rampage', 'quake']; let k = seq[e.turnCount % seq.length];
      if (k === 'summon' && c.alive().length >= 3) k = 'tail'; return k;
    },
    onHurt: (e, c) => { if (!e.phase2 && e.hp <= e.maxHp / 2) { e.phase2 = true; e.st.str += 3; e.turnCount = 0; c.bossPhase(e, 'KING REX IS ENRAGED!'); } } },
  compy_red: { name: 'Royal Compy', sprite: 'compy_red', scale: 3, hp: [18, 18], gold: [5, 5], roar: { pitch: 280, len: 0.3, vol: 0.4 },
    moves: { peck: { name: 'Peck', dmg: 6 }, nibble: { name: 'Nibble', dmg: 3, hits: 2 } },
    ai: (e, c, r) => r.pick(['peck', 'nibble']) },
};

// Encounter pools: arrays of enemy id lists
const ENCOUNTERS = {
  1: {
    easy: [['compy', 'compy'], ['compy', 'compy', 'compy'], ['dodo'], ['raptor'], ['compy', 'dodo']],
    normal: [['raptor', 'compy'], ['boar'], ['grug'], ['dodo', 'dodo'], ['raptor', 'raptor'], ['boar', 'compy'], ['grug', 'compy']],
    elite: [['sabertooth'], ['tricera']],
    boss: [['tricera_king']],
  },
  2: {
    easy: [['dragonfly', 'dragonfly'], ['dilo'], ['ptero'], ['tarblob'], ['dragonfly', 'dilo']],
    normal: [['dilo', 'dragonfly'], ['anky'], ['ptero', 'ptero'], ['tarblob', 'tarblob'], ['dilo', 'dilo'], ['anky', 'dragonfly'], ['tarblob', 'ptero']],
    elite: [['allo'], ['mammoth']],
    boss: [['spino']],
  },
  3: {
    easy: [['lizard', 'lizard'], ['pachy'], ['shaman'], ['lizard', 'lizard', 'lizard']],
    normal: [['carno'], ['pachy', 'lizard'], ['shaman', 'pachy'], ['shaman', 'lizard', 'lizard'], ['carno', 'lizard'], ['pachy', 'pachy']],
    elite: [['giga'], ['raptor_alpha', 'raptor_alpha']],
    boss: [['trex']],
  }
};

const Enemies = {
  def(id) { return ENEMIES[id]; },
  // Create an enemy instance
  make(id, rng) {
    const d = ENEMIES[id];
    const hp = rng.int(d.hp[0], d.hp[1]);
    return { id, def: d, name: d.name, hp, maxHp: hp, block: 0, st: { str: 0, weak: 0, vuln: 0, burn: 0, stun: 0 }, alive: true,
      turnCount: 0, lastMove: null, intent: null, x: 0, y: 0, scale: d.scale, anim: { t: rnd(0, 3), hit: 0, lunge: 0, dieT: 0 }, phase2: false };
  },
  pickMove(e, c, rng) {
    const d = e.def; let key;
    if (d.ai) key = d.ai(e, c, rng);
    else if (d.pattern) key = d.pattern[(e.turnCount + (e.patternOffset || 0)) % d.pattern.length];
    else key = rng.pick(Object.keys(d.moves));
    if (d.noRepeat && key === e.lastMove && Object.keys(d.moves).length > 1) {
      const keys = Object.keys(d.moves).filter(k => k !== key); key = rng.pick(keys);
    }
    return Object.assign({ key }, d.moves[key]);
  },
  // Describe intent for UI
  intentInfo(e, c) {
    const m = e.intent; if (!m) return null;
    const out = { icons: [], text: m.name };
    if (m.dmg) { const dmg = c.previewEnemyDamage(e, m.dmg); out.dmg = dmg; out.hits = m.hits || 1; out.icons.push('intent_attack'); }
    if (m.block) out.icons.push('intent_defend');
    if (m.str) out.icons.push('intent_buff');
    if (m.weakP || m.vulnP || m.burnP) out.icons.push('intent_debuff');
    if (m.summon) out.icons.push('intent_summon');
    if (m.heal) out.icons.push('intent_heal');
    if (!out.icons.length) out.icons.push('intent_unknown');
    return out;
  },
  encounter(act, kind, rng, exclude = []) {
    const pool = (ENCOUNTERS[act] || ENCOUNTERS[3])[kind];
    const choices = pool.filter(p => !exclude.includes(p.join(',')));
    return rng.pick(choices.length ? choices : pool);
  }
};
