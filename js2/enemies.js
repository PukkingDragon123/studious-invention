// ---------------------------------------------------------------------------
// enemies.js - beasts, their intents and the encounter tables
// ---------------------------------------------------------------------------
'use strict';

const ENEMIES = {
  compy: { name: 'Compy', base: 'compy', hp: [16, 20], gold: [5, 9], scale: 1, roar: { pitch: 280, len: 0.3, vol: 0.4 },
    moves: { peck: { name: 'Peck', dmg: 5 }, nibble: { name: 'Nibble', dmg: 3, hits: 2 }, scurry: { name: 'Scurry', block: 5 } },
    ai: (e, c, r) => r.weighted([{ w: 5, v: 'peck' }, { w: 3, v: 'nibble' }, { w: 2, v: 'scurry' }]) },
  dodo: { name: 'Dodo', base: 'dodo', hp: [22, 26], gold: [8, 13], scale: 1, roar: { pitch: 420, len: 0.3, vol: 0.4 },
    moves: { peck: { name: 'Peck', dmg: 6 }, squawk: { name: 'Squawk', weakP: 1 }, flap: { name: 'Flap', block: 7 } },
    ai: (e, c, r) => r.weighted([{ w: 5, v: 'peck' }, { w: 2, v: 'squawk' }, { w: 3, v: 'flap' }]), noRepeat: true },
  boar: { name: 'Cave Boar', base: 'boar', hp: [38, 44], gold: [12, 17], scale: 1, roar: { pitch: 120, len: 0.5, vol: 0.6 },
    moves: { snort: { name: 'Snort', block: 6, str: 1 }, charge: { name: 'Charge', dmg: 14 }, gore: { name: 'Gore', dmg: 8 } },
    pattern: ['snort', 'charge', 'gore'] },
  raptor: { name: 'Raptor', base: 'raptor', hp: [34, 40], gold: [11, 16], scale: 1, roar: { pitch: 180, len: 0.5, vol: 0.6 },
    moves: { slash: { name: 'Slash', dmg: 8 }, pounce: { name: 'Pounce', dmg: 13 }, screech: { name: 'Screech', str: 2 } },
    pattern: ['slash', 'pounce', 'slash', 'screech'] },
  ptero: { name: 'Pterodactyl', base: 'ptero', hp: [30, 34], gold: [12, 16], scale: 1, flying: true, roar: { pitch: 500, len: 0.4, vol: 0.5 },
    moves: { swoop: { name: 'Swoop', dmg: 10 }, screech: { name: 'Screech', vulnP: 1 }, glide: { name: 'Glide', block: 8 } },
    pattern: ['swoop', 'screech', 'swoop', 'glide'] },
  lizard: { name: 'Lava Lizard', base: 'lizard', hp: [40, 46], gold: [14, 19], scale: 1, roar: { pitch: 300, len: 0.4, vol: 0.5 },
    moves: { spit: { name: 'Fire Spit', dmg: 10, burnP: 2 }, molten: { name: 'Molten Skin', block: 9, str: 1 }, bite: { name: 'Bite', dmg: 7 } },
    ai: (e, c, r) => r.weighted([{ w: 4, v: 'spit' }, { w: 2, v: 'molten' }, { w: 3, v: 'bite' }]), noRepeat: true },
  tarblob: { name: 'Tar Blob', base: 'tarblob', hp: [44, 50], gold: [12, 18], scale: 1, roar: { pitch: 60, len: 0.6, vol: 0.5 },
    moves: { engulf: { name: 'Engulf', dmg: 8, weakP: 1 }, ooze: { name: 'Ooze', dmg: 5, hits: 2 }, harden: { name: 'Harden', block: 8 } },
    ai: (e, c, r) => r.weighted([{ w: 4, v: 'engulf' }, { w: 3, v: 'ooze' }, { w: 2, v: 'harden' }]) },
  brute: { name: 'Ash Raider', base: 'brute', hp: [46, 52], gold: [15, 22], scale: 1, roar: { pitch: 150, len: 0.4, vol: 0.5 },
    moves: { club: { name: 'Club Smash', dmg: 12 }, rock: { name: 'Rock Throw', dmg: 7, vulnP: 1 }, thump: { name: 'Chest Thump', str: 2, block: 5 } },
    pattern: ['club', 'rock', 'thump', 'club'] },
  stego: { name: 'Stegosaurus', base: 'stego', hp: [66, 74], gold: [18, 25], scale: 1, roar: { pitch: 100, len: 0.7, vol: 0.7 },
    moves: { tail: { name: 'Tail Spikes', dmg: 14 }, plates: { name: 'Raise Plates', block: 16 }, stomp: { name: 'Stomp', dmg: 9, weakP: 1 } },
    pattern: ['plates', 'tail', 'stomp', 'tail'] },
  tricera: { name: 'Triceratops', base: 'tricera', hp: [96, 96], gold: [30, 40], scale: 1, elite: true, roar: { pitch: 90, len: 0.8, vol: 0.85 },
    moves: { horn: { name: 'Horn Charge', dmg: 16 }, guard: { name: 'Guard', block: 15 }, stomp: { name: 'Stomp', dmg: 10, weakP: 1 } },
    pattern: ['horn', 'guard', 'stomp'] },
  trex: { name: 'T-REX', base: 'trex', hp: [150, 150], gold: [60, 70], scale: 1, elite: true, roar: { pitch: 50, len: 1.4, vol: 1 },
    moves: { bite: { name: 'Bite', dmg: 22 }, tail: { name: 'Tail Whip', dmg: 15, weakP: 1 }, roar: { name: 'Roar', block: 14, str: 3 }, stomp: { name: 'Stomp', dmg: 12, vulnP: 1 } },
    pattern: ['roar', 'bite', 'stomp', 'tail', 'bite'] },
  // ---- BLAZE, one boss fought three times, angrier each act
  blaze: { name: 'BLAZE', base: 'blaze', hp: [140, 140], gold: [90, 90], scale: 1, boss: true, roar: { pitch: 150, len: 1.2, vol: 1 },
    moves: {
      rake: { name: 'Fire Rake', dmg: 15, burnP: 2 }, tail: { name: 'Burning Tail', dmg: 11, hits: 2 },
      flare: { name: 'Flare Up', block: 16, str: 3 }, inferno: { name: 'INFERNO', dmg: 26, burnP: 3 },
      call: { name: 'Call the Pack', summon: 'compy', summonN: 2 },
    },
    ai: (e, c) => {
      const seq = e.phase2 ? ['inferno', 'tail', 'rake', 'call', 'inferno', 'tail'] : ['rake', 'tail', 'flare', 'rake', 'call'];
      let k = seq[e.turnCount % seq.length];
      if (k === 'call' && c.alive().length >= 3) k = 'rake';
      return k;
    },
    onHurt: (e, c) => { if (!e.phase2 && e.hp <= e.maxHp * 0.45) { e.phase2 = true; e.st.str += 3; e.turnCount = 0; c.bossPhase(e, 'BLAZE IS BURNING WHITE'); } } },
};

const ENCOUNTERS = {
  1: { easy: [['compy', 'compy'], ['dodo'], ['compy', 'compy', 'compy'], ['compy', 'dodo']],
    normal: [['boar'], ['dodo', 'dodo'], ['raptor', 'compy'], ['boar', 'compy']],
    elite: [['tricera']], boss: [['blaze']] },
  2: { easy: [['raptor'], ['ptero'], ['tarblob'], ['compy', 'raptor']],
    normal: [['raptor', 'raptor'], ['tarblob', 'ptero'], ['lizard', 'raptor'], ['stego']],
    elite: [['tricera'], ['stego', 'raptor']], boss: [['blaze']] },
  3: { easy: [['lizard', 'lizard'], ['brute'], ['stego']],
    normal: [['brute', 'lizard'], ['stego', 'lizard'], ['brute', 'brute'], ['raptor', 'raptor', 'lizard']],
    elite: [['trex']], boss: [['blaze']] },
};

const Enemies = {
  def(id) { return ENEMIES[id]; },
  make(id, rng, act = 1) {
    const d = ENEMIES[id] || ENEMIES.compy;
    const scale = 1 + (act - 1) * 0.22;
    const hp = Math.round(rng.int(d.hp[0], d.hp[1]) * (d.boss ? 1 + (act - 1) * 0.42 : scale));
    return {
      id, def: d, name: d.name, hp, maxHp: hp, block: 0, alive: true, act,
      st: { str: d.boss ? (act - 1) * 2 : 0, weak: 0, vuln: 0, burn: 0, stun: 0 },
      turnCount: 0, lastMove: null, intent: null, phase2: false,
      actor: new Actor({ base: d.base, x: 0, y: 0, scale: 1, facing: -1, clip: d.boss ? 'boss' : 'idle' }),
      hitT: 0, dieT: 0, spawnT: 0, shake: 0,
    };
  },
  pickMove(e, c, rng) {
    const d = e.def; let key;
    if (d.ai) key = d.ai(e, c, rng);
    else if (d.pattern) key = d.pattern[(e.turnCount + (e.offset || 0)) % d.pattern.length];
    else key = rng.pick(Object.keys(d.moves));
    if (d.noRepeat && key === e.lastMove && Object.keys(d.moves).length > 1) key = rng.pick(Object.keys(d.moves).filter(k => k !== key));
    return Object.assign({ key }, d.moves[key]);
  },
  intentInfo(e, c) {
    const m = e.intent; if (!m) return null;
    const out = { icons: [], text: m.name };
    if (m.dmg) { out.dmg = c.previewEnemyDamage(e, m.dmg); out.hits = m.hits || 1; out.icons.push('intent_attack'); }
    if (m.block) out.icons.push('intent_defend');
    if (m.str) out.icons.push('intent_buff');
    if (m.weakP || m.vulnP || m.burnP) out.icons.push('intent_debuff');
    if (m.summon) out.icons.push('intent_summon');
    if (m.heal) out.icons.push('intent_heal');
    if (!out.icons.length) out.icons.push('intent_unknown');
    return out;
  },
  encounter(act, kind, rng, exclude = []) {
    const pool = (ENCOUNTERS[act] || ENCOUNTERS[3])[kind] || ENCOUNTERS[1].easy;
    const ok = pool.filter(p => !exclude.includes(p.join(',')));
    return rng.pick(ok.length ? ok : pool);
  },
};
