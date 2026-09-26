// ---------------------------------------------------------------------------
// tiles.js - what the board is made of.
//
//   TERRAIN     the ground under a tile. Every step you take this round is
//               counted by terrain, and cards and artifacts read the count:
//               "if you touched a wet tile this round..."
//   TILE_KINDS  what happens when you land on a tile (and sometimes when you
//               only pass over it)
//   CHARMS      one-use pouches you carry, mostly for bending the dice
//   BOARD_EVENTS the ? tiles, the strangers, the crossroads and the caves
//
// Landing handlers are generators run by the BoardScene: they get the scene
// (B) and the tile, and use B's small API - heal, hurt, gems, charms, card
// and relic offers, event panels, fights, extra movement.
// ---------------------------------------------------------------------------
'use strict';

const TERRAIN = {
  grass: { name: 'Grass', col: '#4fae4a', dark: '#27632f', step: 'step_grass', desc: 'Soft ground. Good for sneaking.' },
  wet:   { name: 'Wet',   col: '#4a8fe0', dark: '#1d3d72', step: 'splash', desc: 'Stepping stones and puddles. You get wet feet.' },
  hot:   { name: 'Hot',   col: '#ff7a2a', dark: '#7d1d2b', step: 'sizzle', desc: 'Warm rock over fire. Landing here stings.' },
  stone: { name: 'Stone', col: '#a79bb4', dark: '#4d4a5c', step: 'step', desc: 'Hard ground.' },
  bone:  { name: 'Bone',  col: '#e8dfc6', dark: '#8a7f68', step: 'crunch', desc: 'Old bones, and a lot of them.' },
  ice:   { name: 'Ice',   col: '#bfe6ff', dark: '#3570c0', step: 'squeak', desc: 'Slippery. Land here and you slide on.' },
  sand:  { name: 'Sand',  col: '#e2b86e', dark: '#85562f', step: 'step', desc: 'Loose and warm.' },
  dark:  { name: 'Cave',  col: '#8c6cc4', dark: '#281040', step: 'step', desc: 'Underground. Everything echoes.' },
};
const TERRAIN_KEYS = Object.keys(TERRAIN);

// ------------------------------------------------------------------ charms
// One-use, three slots. Most of them are about the dice: that is where the
// luck is, so that is where the skill is too.
const CHARMS = {
  knuckle: { name: 'Knucklebone', icon: 'ch_knuckle', when: 'before', desc: 'Choose your next roll: any number from 1 to 6.' },
  twin:    { name: 'Twin Bones', icon: 'ch_twin', when: 'before', desc: 'Roll two dice this time and pick the one you like.' },
  feather: { name: 'Pterry Feather', icon: 'ch_feather', when: 'before', desc: 'Your next roll will be high: 4, 5 or 6.' },
  pebble:  { name: 'Heavy Pebble', icon: 'ch_pebble', when: 'before', desc: 'Your next roll will be low: 1, 2 or 3.' },
  nudge:   { name: 'Nudge Stick', icon: 'ch_nudge', when: 'after', desc: 'After rolling: add or take away 1.' },
  rattle:  { name: 'Rattle Gourd', icon: 'ch_rattle', when: 'after', desc: 'After rolling: roll again.' },
  smoke:   { name: 'Smoke Pouch', icon: 'ch_smoke', when: 'any', desc: 'The next fight you land on, you slip away from instead.' },
  moss:    { name: 'Healing Moss', icon: 'ch_moss', when: 'any', desc: 'Heal 15 HP.' },
  map:     { name: 'Map Scrap', icon: 'ch_map', when: 'any', desc: 'Reveal every secret and mystery within 10 tiles.' },
  honey:   { name: 'Honey Lump', icon: 'ch_honey', when: 'any', desc: 'The next beast that comes for you stops to eat it instead.' },
};
const CHARM_KEYS = Object.keys(CHARMS);

// helpers shared by the kinds below
const K = {
  heal: (B, n) => B.heal(n),
  gems: (B, n) => B.addGems(n),
  bump: (B, t, word, col) => B.popup(word, col),
};

// ------------------------------------------------------------ tile kinds
const TILE_KINDS = {
  start:   { name: 'Home', icon: 'ti_home', desc: 'The cave. Everyone who matters has been taken from it.', perm: true, land: function* (B) { yield* B.say('', 'Home. Empty. The table is still laid for four.'); } },
  path:    { name: 'Path', icon: null, desc: 'Just ground.', land: function* () { } },
  junction:{ name: 'Crossing', icon: 'ti_sign', desc: 'The path splits here.', land: function* () { } },
  berries: { name: 'Berry Bush', icon: 'ti_berries', desc: 'Heal {g}8{/} HP.',
    land: function* (B) { const n = B.foodHeal(8); B.heal(n); B.burst('#c2333c'); AudioSys.sfx('eat'); yield 0.3; } },
  meat:    { name: 'Roast Leg', icon: 'ti_meat', desc: 'Heal {g}14{/} HP.',
    land: function* (B) { const n = B.foodHeal(14); B.heal(n); B.burst('#e06a1b'); AudioSys.sfx('eat'); yield 0.3; } },
  gem:     { name: 'Gem Seam', icon: 'ti_gem', desc: 'Dig out {v}2{/} gems.',
    land: function* (B) { B.addGems(2); B.burst('#c28cff'); AudioSys.sfx('gem'); yield 0.3; } },
  card:    { name: 'Cave Painting', icon: 'ti_card', desc: 'Learn a new card: choose one of three.',
    land: function* (B) { yield* B.offerCards(3); } },
  charm:   { name: 'Charm Pouch', icon: 'ti_charm', desc: 'Find a charm.',
    land: function* (B) { yield* B.findCharm(); } },
  trap:    { name: 'Spike Pit', icon: 'ti_trap', desc: 'Lose {r}7{/} HP.',
    land: function* (B, t) {
      if (B.hasRelic('moss_boots') && t.terrain === 'grass') { B.popup('MOSS BOOTS!', '#a8e878'); yield 0.3; return; }
      AudioSys.sfx('spikes'); Juice.shake(6, 0.25); B.hurt(7); yield 0.4;
    } },
  rocks:   { name: 'Rockfall', icon: 'ti_rocks', desc: 'Roll the die: 1-3, lose {r}10{/} HP. 4-6, dodge it.',
    land: function* (B) {
      yield* B.say('', 'The cliff above you groans. Roll to dodge!');
      const v = yield* B.quickRoll();
      if (v <= 3) { AudioSys.sfx('bighit'); Juice.shake(10, 0.4); B.hurt(10); } else { B.popup('DODGED!', '#a8e878'); AudioSys.sfx('whoosh'); }
      yield 0.3;
    } },
  tar:     { name: 'Tar Pit', icon: 'ti_tar', desc: 'Stops you dead when you walk into it. Your next roll is {r}2 less{/}.', stop: true,
    land: function* (B) { B.run.board.tarred = 2; AudioSys.sfx('slurp'); B.popup('STUCK! -2 NEXT ROLL', '#ef6a5e'); yield 0.4; } },
  battle:  { name: 'Beasts', icon: 'ti_battle', desc: 'A fight with whatever lives here.',
    land: function* (B, t) { yield* B.startFight(t, 'normal'); } },
  dino:    { name: 'Big Dino', icon: 'ti_dino', desc: 'Something huge. Fight it for a trophy, or try your luck.',
    land: function* (B, t) { yield* B.dinoTile(t); } },
  npc:     { name: 'Stranger', icon: 'ti_npc', desc: 'Someone on the road. They might help. They might want something.',
    land: function* (B, t) { yield* B.runEvent(B.pickEvent('npc', t)); } },
  choice:  { name: 'Crossroads', icon: 'ti_choice', desc: 'A decision, and no good way to know which is right.',
    land: function* (B, t) { yield* B.runEvent(B.pickEvent('choice', t)); } },
  event:   { name: 'Mystery', icon: 'ti_event', desc: 'Anything could be here.',
    land: function* (B, t) { yield* B.runEvent(B.pickEvent('event', t)); } },
  cave:    { name: 'Cave', icon: 'ti_cave', desc: 'Go in, if you dare. Treasure, and whatever keeps it.',
    land: function* (B, t) { yield* B.runEvent(B.pickEvent('cave', t)); } },
  secret:  { name: 'Secret', icon: 'ti_secret', desc: 'Nobody has been here in a long time.', hidden: true,
    land: function* (B, t) { yield* B.secretTile(t); } },
  camp:    { name: 'Campfire', icon: 'ti_camp', desc: 'Rest ({g}heal 30%{/}) or practise ({g}upgrade a card{/}).',
    land: function* (B, t) { yield* B.campTile(t); } },
  trader:  { name: 'Mammoth Trader', icon: 'ti_trader', desc: 'Trunks the mammoth trades cards, artifacts and charms for gems.', perm: true,
    land: function* (B) { yield* B.openShop(); } },
  altar:   { name: 'Gem Altar', icon: 'ti_altar', desc: 'Press gems into your cards, for good.', perm: true,
    land: function* (B) { yield* B.openAltar(); } },
  vine:    { name: 'Vine Swing', icon: 'ti_vine', desc: 'Grab the vine and swing {y}3 tiles{/} further on.',
    land: function* (B) { AudioSys.sfx('whoosh'); yield* B.say(B.heroName, 'AAAAA-EEE-AAAA!', { auto: 0.9 }); yield* B.slide(3, 'vine'); } },
  geyser:  { name: 'Geyser', icon: 'ti_geyser', desc: 'It blows you somewhere. Forward, mostly.',
    land: function* (B) { AudioSys.sfx('geyser'); Juice.shake(8, 0.4); const n = rndInt(2, 5); yield* B.slide(n, 'geyser'); } },
  totem:   { name: 'Luck Totem', icon: 'ti_totem', desc: 'Touch it: your next roll is doubled.',
    land: function* (B) { B.run.board.doubleNext = true; AudioSys.sfx('relic'); B.popup('NEXT ROLL x2', '#ffe98a'); yield 0.4; } },
  boss:    { name: 'Lair', icon: 'ti_boss', desc: 'The guardian of this land waits here. You cannot walk past it.', stop: true,
    land: function* (B, t) { yield* B.bossTile(t); } },
};

// ------------------------------------------------------------ the events
// Each event is a little panel: a picture, some words, two or three choices.
// `act(B, S)` runs a choice and may set S.result (the text shown after),
// S.fight (a fight to start when the panel closes) or yield for more.
// {g}green{/} good, {r}red{/} bad, {y}yellow{/} things, {v}violet{/} gems.
const BOARD_EVENTS = {
  // ------------------------------------------------------------ mysteries
  event: [
    { id: 'nest', title: 'A NEST', spr: 'v_egg', scale: 2,
      text: 'Three warm eggs in a ring of stones. Something big made this nest, and it will be back.',
      choices: [
        { label: 'Take an egg', desc: 'Gain {y}Warm Egg{/}. It might hatch trouble.', act: function* (B, S) {
          if (!B.hasRelic('egg')) { B.giveRelic('egg'); S.result = 'You tuck the egg under your arm. It hums.'; } else { B.addGems(3); S.result = 'This one is full of amber. {v}+3 gems{/}.'; }
          if (chance(0.45)) { S.fight = ['raptor', 'raptor']; S.result += ' Then the ferns start moving. {r}Two raptors!{/}'; } } },
        { label: 'Leave it', desc: 'Some things are not yours. {g}+6 HP{/}.', act: function* (B, S) { B.heal(6); S.result = 'You back away. Somewhere in the ferns, something relaxes.'; } },
      ] },
    { id: 'stuck', title: 'STUCK', spr: 'brute_idle', scale: 1.2,
      text: 'A raider is sunk to the chest in mud, club still in hand, going down slowly and complaining the whole way.',
      choices: [
        { label: 'Pull him out', desc: 'Lose {r}8 HP{/}. He pays you back.', act: function* (B, S) { B.hurt(8); B.addGems(4); const r = B.randomRelic(['common', 'uncommon']); if (r) B.giveRelic(r); S.result = `He comes free with a noise like a burp. {v}+4 gems{/}${r ? ` and his ${RELICS[r].name}` : ''}.`; } },
        { label: 'Take his lunch', desc: '{g}+10 HP{/}. He will remember.', act: function* (B, S) { B.heal(10); S.result = 'You hook his lunch with a stick. He calls you a word nobody has invented yet.'; } },
        { label: 'Walk on', desc: 'Not your mud.', act: function* (B, S) { S.result = 'The mud burps behind you.'; } },
      ] },
    { id: 'wall', title: 'THE PAINTED WALL', spr: 'v_cave', scale: 1.2,
      text: 'Hunters and mammoths, and under them rows of marks in fours. Somebody wrote music on this rock a long time ago.',
      choices: [
        { label: 'Study the marks', desc: '{g}Upgrade{/} a card.', act: function* (B, S) { const c = yield* B.pickCard('UPGRADE A CARD', c => !c.up); if (c) { c.up = true; Cards.refresh(c); S.result = `You copy the old marks until your hands ache. {g}${c.name}{/} is sharper.`; } else S.result = 'Nothing to learn here.'; } },
        { label: 'Paint over one', desc: '{r}Remove{/} a card from your deck.', act: function* (B, S) { const c = yield* B.pickCard('PAINT OVER A CARD', () => true); if (c) { B.removeCard(c); S.result = `You paint a handsome dinosaur over {r}${c.def.name}{/}. No regrets.`; } else S.result = 'You leave the wall alone.'; } },
      ] },
    { id: 'shiny', title: 'SOMETHING SHINY', spr: 'ti_gem', scale: 3,
      text: 'A glint at the bottom of a crack in the ground. Your arm might fit. Might.',
      choices: [
        { label: 'Reach in', desc: 'Roll the die. 3 or more: {v}4 gems{/}. Less: {r}bitten{/}.', act: function* (B, S) { const v = yield* B.quickRoll(); if (v >= 3) { B.addGems(4); S.result = `A ${v}! Your fingers close on something cold. {v}+4 gems{/}.`; } else { B.hurt(6); S.result = `A ${v}. Something in there closes on YOUR fingers. {r}-6 HP{/}.`; } } },
        { label: 'Poke it with a stick', desc: 'Safer. {v}+1 gem{/}.', act: function* (B, S) { B.addGems(1); S.result = 'The stick comes back with one small gem stuck to it, and teeth marks.'; } },
      ] },
    { id: 'storm', title: 'THE SKY RUMBLES', spr: 'art_bolt', scale: 3,
      text: 'Black clouds, all at once. The rain comes in sideways, and the ground around you turns to puddles.',
      choices: [
        { label: 'Dance in it', desc: 'The tiles around you become {b}wet{/}. Gain a {y}charm{/}.', act: function* (B, S) { B.soakAround(3); yield* B.findCharm(true); S.result = 'You stomp in the puddles like nobody is watching. Nobody is.'; } },
        { label: 'Shelter under a rock', desc: '{g}+8 HP{/}.', act: function* (B, S) { B.heal(8); S.result = 'You wait it out, dry and warm, and eat the snack you were saving.'; } },
      ] },
    { id: 'drum', title: 'A HOLLOW LOG', spr: 'h_drum', scale: 1.6,
      text: 'A log, hollowed out and stretched with hide. Someone left their drum in the middle of nowhere.',
      choices: [
        { label: 'Play it', desc: 'A {y}riff challenge{/}. Nail it for a relic.', act: function* (B, S) { const r = yield* B.riffChallenge({ bars: 1, density: 1, title: 'THE LOG DRUM' }); if (r && r.acc > 0.66) { const id = B.randomRelic(['uncommon', 'rare']); if (id) { B.giveRelic(id); S.result = `The whole valley hears it. {y}${RELICS[id].name}{/} rolls out of the log.`; } } else { B.addGems(1); S.result = 'It sounds like a log. You find {v}1 gem{/} inside anyway.'; } } },
        { label: 'Leave it', desc: 'Not your drum.', act: function* (B, S) { S.result = 'You walk on. Behind you, something thumps it once.'; } },
      ] },
    { id: 'shortcut', title: 'A HIDDEN TRAIL', spr: 'v_signpost', scale: 1.6,
      text: 'Between two rocks, a trail you did not see before. It points ahead. Far ahead.',
      choices: [
        { label: 'Take it', desc: 'Move {y}4 tiles{/} forward right now.', act: function* (B, S) { S.after = function* () { yield* B.slide(4, 'trail'); }; S.result = 'You squeeze between the rocks.'; } },
        { label: 'Mark it for later', desc: 'Your next roll is {y}+2{/}.', act: function* (B, S) { B.run.board.bonusNext = (B.run.board.bonusNext || 0) + 2; S.result = 'You remember the way. {y}+2 to your next roll{/}.'; } },
      ] },
    { id: 'bones', title: 'A PILE OF BONES', spr: 'v_bones', scale: 2,
      text: 'A whole skeleton, picked clean. Whatever did this was not in a hurry.',
      choices: [
        { label: 'Search it', desc: 'Gain a random {y}card{/}. Might wake something.', act: function* (B, S) { const c = Cards.randomReward(B.rng, 1, [], B.run.hero)[0]; B.addCard(c); S.result = `Tucked in the ribs: {y}${c.name}{/}.`; if (chance(0.35)) { S.fight = B.encounter('easy'); S.result += ' {r}Something wants its bones back!{/}'; } } },
        { label: 'Say a few words', desc: '{g}+4 Max HP{/}.', act: function* (B, S) { B.run.maxHp += 4; B.heal(4); S.result = 'You say something nice about the skeleton. You feel sturdier for it.'; } },
      ] },
  ],
  // --------------------------------------------------------------- people
  npc: [
    { id: 'ug', title: 'OLD UG THE HERMIT', spr: 'elder_idle', scale: 1.4,
      text: '"Two things I know," says Ug. "Rocks, and cards. You want to trade? I want your blood. Just a bit."',
      choices: [
        { label: 'Trade blood for a card', desc: 'Lose {r}6 HP{/}. Choose a {y}rare-ish card{/}.', act: function* (B, S) { B.hurt(6); yield* B.offerCards(3, { rare: true }); S.result = 'Ug licks his thumb and waves you off.'; } },
        { label: 'Just chat', desc: 'He tells you about the next land. {g}Reveal{/} the tiles ahead.', act: function* (B, S) { B.revealAhead(14); S.result = '"Stay off the red ones," says Ug. "Unless you like being red."'; } },
      ] },
    { id: 'nana', title: 'NANA GRUK', spr: 'villager2_idle', scale: 1.4,
      text: 'A tiny old woman with a huge pot. "You look thin. Everyone looks thin. EAT."',
      choices: [
        { label: 'Eat', desc: '{g}Heal 20 HP{/}.', act: function* (B, S) { B.heal(20); S.result = 'You eat until you cannot see straight. She fills the bowl again anyway.'; } },
        { label: 'Take some for the road', desc: 'Gain {y}Healing Moss{/} and a {y}Honey Lump{/}.', act: function* (B, S) { B.addCharm('moss'); B.addCharm('honey'); S.result = 'She wraps it in leaves and tells you to wear a hat.'; } },
      ] },
    { id: 'shaman', title: 'MOONWHISKER THE SHAMAN', spr: 'elder_idle', scale: 1.4,
      text: 'He has bones in his hair and bees in his beard. "I can make your deck lighter," he says. "For a price."',
      choices: [
        { label: 'Remove a card', desc: 'Costs {v}2 gems{/}.', cond: B => B.run.gems >= 2, act: function* (B, S) { const c = yield* B.pickCard('REMOVE A CARD', () => true); if (c) { B.run.gems -= 2; B.removeCard(c); S.result = `He eats ${c.def.name}. You try not to watch.`; } else S.result = 'You keep your cards.'; } },
        { label: 'Ask for a blessing', desc: 'Gain a random {y}charm{/}.', act: function* (B, S) { yield* B.findCharm(true); S.result = 'He blows smoke in your face. You feel lucky, and slightly dizzy.'; } },
        { label: 'Leave', desc: 'The bees are looking at you.', act: function* (B, S) { S.result = 'The bees watch you go.'; } },
      ] },
    { id: 'kid', title: 'A LOST KID', spr: 'kid_npc_idle', scale: 1.4,
      text: 'A small kid with a big stick. "Have you seen my mum? She is tall and she yells a lot."',
      choices: [
        { label: 'Help look', desc: 'Your next roll is {r}1{/}. Gain {y}a relic{/}.', act: function* (B, S) { B.run.board.forceNext = 1; const id = B.randomRelic(['common', 'uncommon']); if (id) B.giveRelic(id); S.result = `You find her mum behind the next rock. She gives you {y}${id ? RELICS[id].name : 'a hug'}{/} and yells at the kid.`; } },
        { label: 'Point the way', desc: '{v}+1 gem{/} from the kid, for some reason.', act: function* (B, S) { B.addGems(1); S.result = 'The kid pays you with a shiny pebble. It is a gem.'; } },
      ] },
    { id: 'rival', title: 'GRONK THE RIVAL', spr: 'brute_idle', scale: 1.3,
      text: '"You call that an instrument?" Gronk has a bigger one. Of course he does. "Play-off. Winner takes a gem pouch."',
      choices: [
        { label: 'Play-off', desc: 'A {y}hard riff{/}. Win {v}5 gems{/}, lose {r}5 HP{/}.', act: function* (B, S) { const r = yield* B.riffChallenge({ bars: 1, density: 2, title: 'PLAY-OFF' }); if (r && r.acc > 0.6) { B.addGems(5); S.result = 'Gronk cries a little. {v}+5 gems{/}.'; } else { B.hurt(5); S.result = 'Gronk wins, and hits you with his instrument. {r}-5 HP{/}.'; } } },
        { label: 'Just punch him', desc: 'A {r}fight{/}.', act: function* (B, S) { S.fight = ['brute']; S.result = 'Gronk raises his club. Fine.'; } },
      ] },
    { id: 'bird', title: 'A TALKING BIRD', spr: 'dodo_idle', scale: 1.8,
      text: 'A dodo on a rock. "I have seen a big lady go by," it says. "Big teeth. Glasses. Carrying people. For a gem I will tell you a shortcut."',
      choices: [
        { label: 'Pay the bird', desc: '{v}1 gem{/}: your next roll is {y}doubled{/}.', cond: B => B.run.gems >= 1, act: function* (B, S) { B.run.gems -= 1; B.run.board.doubleNext = true; S.result = '"Left at the bone, right at the other bone." It is somehow useful.'; } },
        { label: 'Eat the bird', desc: '{g}+12 HP{/}. Ethically dubious.', act: function* (B, S) { B.heal(12); S.result = 'It was a very small bird. You feel a bit bad. A bit.'; } },
      ] },
  ],
  // -------------------------------------------------------------- choices
  choice: [
    { id: 'river', title: 'THE RIVER', spr: 'tile_water', scale: 3,
      text: 'The river is fast and cold. There is a log bridge downstream, and it looks rotten.',
      choices: [
        { label: 'Wade across', desc: 'You get {b}wet feet{/}. Find {v}2 gems{/} in the shallows.', act: function* (B, S) { B.touch('wet', 2); B.addGems(2); S.result = 'Cold. Very cold. But the riverbed is full of pretty stones.'; } },
        { label: 'Risk the bridge', desc: 'Roll: 3+ you cross, less: {r}-8 HP{/}.', act: function* (B, S) { const v = yield* B.quickRoll(); if (v >= 3) S.result = 'The bridge holds. Just.'; else { B.hurt(8); B.touch('wet', 1); S.result = 'The bridge does not hold. Neither do you. {r}-8 HP{/}.'; } } },
      ] },
    { id: 'mammoth', title: 'A SLEEPING MAMMOTH', spr: 'mammoth_idle', scale: 1.1,
      text: 'A mammoth is asleep across the path, snoring like a landslide. Its lunch is right there.',
      choices: [
        { label: 'Steal the lunch', desc: '{g}+15 HP{/}. 1 in 3 it wakes up.', act: function* (B, S) { B.heal(15); if (chance(0.34)) { S.fight = ['mammothw']; S.result = 'Delicious. Then one huge eye opens. {r}Uh oh.{/}'; } else S.result = 'You eat its lunch. It dreams about you.'; } },
        { label: 'Tiptoe round', desc: 'Nothing gained, nothing trampled.', act: function* (B, S) { S.result = 'You tiptoe past. It farts, but that is all.'; } },
      ] },
    { id: 'fork_luck', title: 'TWO CAVES', spr: 'v_cave', scale: 1.2,
      text: 'Two cave mouths side by side. One smells of flowers. One smells of lunch. Neither smells safe.',
      choices: [
        { label: 'The flowery one', desc: '{g}Heal 12{/}, or {r}a fight{/}. Half and half.', act: function* (B, S) { if (chance(0.5)) { B.heal(12); S.result = 'A little meadow, inside a mountain. You lie down for a bit.'; } else { S.fight = B.encounter('normal'); S.result = 'The flowers have teeth. {r}Fight!{/}'; } } },
        { label: 'The lunchy one', desc: '{v}+3 gems{/}, or {r}-10 HP{/}. Half and half.', act: function* (B, S) { if (chance(0.5)) { B.addGems(3); S.result = 'Somebody\'s larder, and somebody\'s gems. {v}+3{/}.'; } else { B.hurt(10); S.result = 'The lunch was a bear. {r}-10 HP{/}.'; } } },
      ] },
    { id: 'toll', title: 'THE BONE TOLL', spr: 'v_skull', scale: 2,
      text: 'A skull on a pole, and a sign: PAY OR PLAY. Under it, a raider picking his teeth.',
      choices: [
        { label: 'Pay', desc: 'Lose {v}2 gems{/}. Gain a {y}charm{/}.', cond: B => B.run.gems >= 2, act: function* (B, S) { B.run.gems -= 2; yield* B.findCharm(true); S.result = 'He hands you a pouch "for your trouble". It is the nicest thing a raider has ever done.'; } },
        { label: 'Play', desc: 'A {r}fight{/}, and his whole toll pot if you win.', act: function* (B, S) { S.fight = ['brute']; S.bonusGems = 4; S.result = 'He cracks his knuckles.'; } },
      ] },
    { id: 'berries', title: 'STRANGE BERRIES', spr: 'ti_berries', scale: 3,
      text: 'Fat purple berries. They smell amazing. They are also glowing slightly.',
      choices: [
        { label: 'Eat them all', desc: '{g}+6 Max HP{/} or {r}-10 HP{/}. Roll: 4+ is good.', act: function* (B, S) { const v = yield* B.quickRoll(); if (v >= 4) { B.run.maxHp += 6; B.heal(6); S.result = 'You feel INCREDIBLE. {g}+6 Max HP{/}.'; } else { B.hurt(10); S.result = 'You feel terrible, and purple. {r}-10 HP{/}.'; } } },
        { label: 'Just one', desc: '{g}+5 HP{/}.', act: function* (B, S) { B.heal(5); S.result = 'One berry. Very nice. You are very sensible.'; } },
      ] },
  ],
  // ---------------------------------------------------------------- caves
  cave: [
    { id: 'deep', title: 'THE DEEP CAVE', spr: 'v_cave', scale: 1.3,
      text: 'The cave goes down and down. You can hear water, and something breathing, and your own heart.',
      choices: [
        { label: 'Go deep', desc: 'A {r}hard fight{/} guarding a {y}rare relic{/}.', act: function* (B, S) { S.fight = B.encounter('elite'); S.relicWin = ['rare', 'uncommon']; S.result = 'The breathing stops. Something stands up in the dark.'; } },
        { label: 'Poke around the entrance', desc: '{v}+2 gems{/}. You get {p}cave dust{/} on you.', act: function* (B, S) { B.addGems(2); B.touch('dark', 1); S.result = 'Two gems in the gravel, and a lot of bat droppings.'; } },
      ] },
    { id: 'echo', title: 'THE ECHO CAVE', spr: 'v_cave', scale: 1.3,
      text: 'Every sound comes back three times. Somebody painted a big smiling face on the back wall.',
      choices: [
        { label: 'Shout into it', desc: 'Roll: even, a {y}card{/}. Odd, {r}a bat swarm{/} (-6 HP).', act: function* (B, S) { const v = yield* B.quickRoll(); if (v % 2 === 0) { yield* B.offerCards(3); S.result = 'The echo sings back a tune you did not know.'; } else { B.hurt(6); S.result = 'The echo sings back a thousand bats. {r}-6 HP{/}.'; } } },
        { label: 'Play into it', desc: 'A {y}riff{/}. Good: {y}upgrade two cards{/}.', act: function* (B, S) { const r = yield* B.riffChallenge({ bars: 1, density: 1, title: 'ECHO' }); if (r && r.acc > 0.6) { for (let i = 0; i < 2; i++) { const c = yield* B.pickCard('UPGRADE A CARD', c => !c.up); if (c) { c.up = true; Cards.refresh(c); } } S.result = 'The cave plays it back better than you did. You steal its version.'; } else S.result = 'The cave plays it back worse. Rude.'; } },
      ] },
    { id: 'hoard', title: 'A RAIDER HOARD', spr: 'v_basket', scale: 2,
      text: 'Baskets and pots and bones piled to the roof. The raiders who own it are asleep. Mostly.',
      choices: [
        { label: 'Fill your arms', desc: '{v}+5 gems{/} and a {y}charm{/}, then a {r}fight{/}.', act: function* (B, S) { B.addGems(5); yield* B.findCharm(true); S.fight = ['brute', 'brute']; S.result = 'You drop a pot. Everyone wakes up.'; } },
        { label: 'Take one thing', desc: 'A random {y}artifact{/}.', act: function* (B, S) { const id = B.randomRelic(['common', 'uncommon']); if (id) B.giveRelic(id); S.result = `You slip out with {y}${id ? RELICS[id].name : 'nothing'}{/}.`; } },
      ] },
  ],
};

// what the big dino on a dino tile is, biome by biome
const DINO_TILES = {
  1: [{ ids: ['tricera'], name: 'A GRUMPY TRICERATOPS', spr: 'tricera_idle' }, { ids: ['boar', 'boar'], name: 'TWO CAVE BOARS', spr: 'boar_idle' }],
  2: [{ ids: ['stego'], name: 'A STEGOSAURUS', spr: 'stego_idle' }, { ids: ['raptor', 'raptor', 'raptor'], name: 'A RAPTOR PACK', spr: 'raptor_idle' }],
  3: [{ ids: ['tarblob', 'tarblob'], name: 'TWO TAR BLOBS', spr: 'tarblob_idle' }, { ids: ['tricera'], name: 'AN OLD TRICERATOPS', spr: 'tricera_idle' }],
  4: [{ ids: ['mammothw'], name: 'A WILD MAMMOTH', spr: 'mammoth_idle' }, { ids: ['ptero', 'ptero'], name: 'PTERODACTYLS', spr: 'ptero_fly' }],
  5: [{ ids: ['trex'], name: 'A T-REX', spr: 'trex_idle' }, { ids: ['lizard', 'lizard', 'raptor'], name: 'A LAVA PACK', spr: 'lizard_idle' }],
};
