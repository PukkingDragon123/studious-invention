// ---------------------------------------------------------------------------
// relics.js - passive trophies
// ---------------------------------------------------------------------------
'use strict';

const RELICS = {
  bone_pick: { name: 'Bone Pick', tier: 'starter', spr: 'relic_bone_pick', desc: "Bronk's lucky pick. Draw {y}1{/} extra card at the start of every fight.",
    onCombatStart: c => c.drawCards(1) },
  trex_tooth: { name: 'T-Rex Tooth', tier: 'rare', spr: 'relic_trex_tooth', desc: 'A tooth the size of your forearm. Start of combat: {r}ROAR{/}, all beasts take {y}7{/} damage and gain {o}1{/} Weak.',
    onCombatStart: function* (c) { AudioSys.sfx('roar', { pitch: 60, vol: 1, len: 1.1 }); Juice.shake(9, 0.5); yield 0.35; for (const e of c.alive()) { c.damageEnemy(e, 7, { src: 'relic' }); c.applyEnemy(e, 'weak', 1, true); } yield 0.35; } },
  tusk: { name: 'Mammoth Tusk', tier: 'boss', spr: 'relic_tusk', desc: 'Gain {c}1{/} extra Energy every turn.', mods: { energy: 1 } },
  claw: { name: 'Raptor Claw', tier: 'common', spr: 'relic_claw', desc: 'Whenever you finish a beast, heal {g}4{/} HP.', onKill: c => c.heal(4) },
  fire_stone: { name: 'Fire Stone', tier: 'common', spr: 'relic_fire_stone', desc: 'Start of combat: deal {y}5{/} damage to ALL beasts.',
    onCombatStart: function* (c) { AudioSys.sfx('fire_whoosh'); yield 0.2; for (const e of c.alive()) c.damageEnemy(e, 5, { src: 'relic', fire: true }); yield 0.3; } },
  egg: { name: 'Warm Egg', tier: 'uncommon', spr: 'relic_egg', desc: 'Heal {g}7{/} HP after every fight.', onCombatEnd: c => c.heal(7, true) },
  meteor: { name: 'Sky Shard', tier: 'uncommon', spr: 'relic_meteor', desc: 'Gain {p}50%{/} more Hype.', mods: { hype: 0.5 } },
  wheel: { name: 'The Wheel', tier: 'rare', spr: 'relic_wheel', desc: 'A revolutionary idea. Draw {y}1{/} extra card each turn.', mods: { draw: 1 } },
  shell: { name: 'Lucky Shell', tier: 'common', spr: 'relic_shell', desc: 'Gain {g}10{/} Max HP.', onPickup: run => { run.maxHp += 10; run.hp += 10; } },
  ash_jar: { name: 'Jar of Embers', tier: 'uncommon', spr: 'relic_ash_jar', desc: 'Beasts begin every fight with {o}1{/} Weak.',
    onCombatStart: c => { for (const e of c.alive()) c.applyEnemy(e, 'weak', 1, true); } },
  amber: { name: 'Amber Charm', tier: 'common', spr: 'relic_amber', desc: 'Start of turn with no Block: gain {b}4{/} Block.',
    onTurnStart: c => { if (c.player.block <= 0) c.gainBlock(4); } },
  drum: { name: 'Echo Drum', tier: 'rare', spr: 'relic_drum', desc: 'Every {y}12{/} note combo in a riff gives {c}1{/} Energy.',
    onCombo: (c, n) => { if (n > 0 && n % 12 === 0) { c.gainEnergy(1); } } },
  mask: { name: 'Tribal Mask', tier: 'uncommon', spr: 'relic_mask', desc: 'A face that gives beasts pause. Their attacks deal {b}2{/} less.', mods: { reduce: 2 } },
  horn: { name: 'War Horn', tier: 'event', spr: 'relic_horn', desc: 'Start every fight with {p}30{/} Hype.', onCombatStart: c => c.addHype(30, true) },
  totem: { name: 'Pocket Totem', tier: 'event', spr: 'relic_totem', desc: 'Timing windows are {y}30%{/} wider.', mods: { window: 0.3 } },
  ribbon: { name: "Vela's Ribbon", tier: 'event', spr: 'relic_ribbon', desc: 'A promise, knotted. Gain {g}14{/} Max HP.', onPickup: run => { run.maxHp += 14; run.hp += 14; } },
};

const Relics = {
  get(id) { return RELICS[id]; },
  owned() { return (Game.run ? Game.run.relics : []).map(id => RELICS[id]).filter(Boolean); },
  has(id) { return !!(Game.run && Game.run.relics.includes(id)); },
  mod(name, def = 0) { let v = def; for (const r of this.owned()) if (r.mods && r.mods[name] !== undefined) v += r.mods[name]; return v; },
  *trigger(hook, c, ...args) {
    for (const r of this.owned()) {
      const fn = r[hook]; if (!fn) continue;
      const res = fn(c, ...args);
      if (res && typeof res.next === 'function') { if (c && c.flashRelic) c.flashRelic(r); yield* res; }
      else if (c && c.flashRelic && hook !== 'onCombo') c.flashRelic(r);
    }
  },
  pool(tier, ex = []) { return Object.keys(RELICS).filter(k => RELICS[k].tier === tier && !ex.includes(k)); },
  randomReward(rng, tiers = ['common', 'common', 'uncommon', 'rare'], exclude = []) {
    const ex = exclude.concat(Game.run ? Game.run.relics : []);
    for (let i = 0; i < 24; i++) { const p = this.pool(rng.pick(tiers), ex); if (p.length) return rng.pick(p); }
    const any = Object.keys(RELICS).filter(k => !ex.includes(k) && RELICS[k].tier !== 'starter');
    return any.length ? rng.pick(any) : null;
  },
  give(id) {
    const run = Game.run; if (!run || !id || run.relics.includes(id)) return;
    run.relics.push(id);
    const r = RELICS[id]; if (r.onPickup) r.onPickup(run);
    AudioSys.sfx('relic');
  },
  drawIcon(id, x, y, o = {}) {
    const r = RELICS[id]; if (!r) return;
    const hov = UI.hovered(x - 2, y - 2, 26, 26);
    if (hov) { Gfx.circle(x + 11, y + 11, 15, '#ffe98a'); Gfx.ctx.globalAlpha = 1; }
    Gfx.sprite(r.spr, x, y, { anchor: 'tl', scale: 1 });
    if (hov) UI.tooltip(x, y + 28, [r.name, r.desc], { width: 250 });
  }
};
