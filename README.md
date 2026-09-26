# ONGA BONGA — A Stone Age Board Game Saga

A pixel-art roguelike played on a board. Grandma Rex has carried off your
family, and you go after her across five prehistoric lands: roll a carved bone
die, walk a huge branching road one tile at a time, and settle every fight
with a deck of cards and a guitar made of ribs.
No build step, no dependencies: open `index.html` in a browser.

**Play it:** open `index.html`, or the published Artifact at
https://claude.ai/artifact/MYXyLPKGDvBpSymnj7V2Dh
Turn your sound on. Landscape on a phone.

## The story

You wake up in the Rockbottoms' cave and come to the table. Tonight is a
special occasion: a whole roast T-Rex head. Then somebody knocks. It is a very
large old lady in a wig, glasses and a shawl, lost in the rain and hoping for a
bite. What big teeth she has. What big eyes. Then she sees what is on the
table: that is Rexford, her grandson.

Grandma Rex cries, then roars, then grabs the other three members of your
family and runs off into the night, with the stove raptor breaking his chain to
follow her. You would chase her at once, but your stomach has other ideas, and
first there is a very urgent trip to the wooden privy in the yard.

The ending is the same table a week later: no T-Rex on it this time. Grandma
brings a berry crumble.

## Four heroes

Your first story is always Bronk's: he wakes up and goes to dinner. Bring the
family home and the next of them (Vela, then Pebble, then Roxy) gets a seat
at the table; once there is a choice, you pick who you are by clicking their
chair at dinner, and the story starts from there. The other three are the ones
Grandma takes, and you win them back one land at a time. Each hero has their own instrument, board
ability, fight mechanic, starting artifact and cards, and plays differently.

| Hero | Instrument | On the board | In a fight |
| --- | --- | --- | --- |
| **Bronk**, the dad | the Rib-Axe | *Heavy Step*: walk one tile fewer than you rolled; food heals him double | *Rage*: every hit he takes adds 1 to his attacks, and some cards spend all of it |
| **Vela**, the mum | the Tusk Horn | *Steady Hand*: after every roll, make it one more or one less; nearby mystery tiles show what they are | *Echo*: horn cards come back next turn as free half-strength copies |
| **Pebble**, the son | the Skull Bongos | *Sugar Rush*: rolls two dice and picks one; a double gives him another go | *Beat*: lots of cheap cards, and most get stronger the more he has played this turn |
| **Roxy**, the daughter | the Bone Flute | *Rain Dance*: soak the ground around her (recharges after 3 rolls) | *Elements*: water Soaks, lightning does double to a Soaked beast, fire burns |

Every rescued family member stays with you and helps in every fight: Bronk
hugs you for Block, Vela glares a beast Weak, Pebble drums on one, and Roxy
heals you after the fight.

## How it plays

- **Roll, then choose.** Press ROLL and the die tumbles in 3D. You move exactly
  that many tiles, forward or back. Every tile you could land on lights up and
  you pick one. The road forks, and the two lanes of a fork are always
  different lengths, so no two paths ever end on the same tile.
- **Tiles do things.** Berries and roast legs heal you. Gem seams, cave
  paintings (new cards) and charm pouches are rewards. Spike pits, rockfalls
  and tar pits hurt or slow you. There are fights, big roaming dinosaurs,
  strangers, crossroads choices, mystery tiles, caves, hidden secrets, camps,
  a mammoth trader, a gem altar for enchanting cards, luck totems, vines that
  swing you on and geysers that throw you. Each land ends in a lair you cannot
  walk past.
- **The ground counts.** Every tile has terrain: grass, wet, hot, stone, bone,
  ice, sand or cave. Every step you take in a round is tallied by terrain, and
  cards and artifacts read the tally. *Wet Feet*: if you touched a wet tile
  this round, your next lightning attack does double damage. *Stomp* hits
  harder if you walked over stone, *Hide and Seek* draws a card if you came
  through grass, and ice slides you on past where you landed.
- **Bend the luck.** Charms are one-use tricks, mostly for the die: choose
  your roll, roll two and pick one, roll high, roll low, nudge it by one or
  throw again. Others heal, reveal secrets, or make you slip away from a fight.
  Artifacts are permanent: a die that never rolls a 1, tar that cannot stop
  you, glasses that show every tile on the board.
- **Events are little films.** Landing on a stranger, a mystery, a
  crossroads, a cave, a big dino, a secret or a campfire cuts to a close-up
  set in that land: the family walks on, the stranger walks on from the far
  side or the dino snores, they talk in bubbles, you choose from big carved
  buttons, and whatever happens is acted out (the bite, the heal, gems flying
  across, a relic held up, beasts running on to square up).
- **Fights are a deck of cards.** Three energy a turn, Block, statuses and
  enemy intents you can read ahead of time. Cards marked RIFF cut to the
  Rock-Axe: rune-stones slide down four strings into a bone strum bar, you
  strike them on the beat with A S D F, and how well you play sets the damage.
  Between phrases you call the chant by clicking circles as their rings close.

Controls: SPACE rolls, click or tap a glowing tile, 1-3 use charms, Q is
Roxy's Rain Dance, and A/D or the arrow keys look along the road. In fights: 1-9 plays
a card, E ends the turn, A S D F strums during a riff, ESC opens the menu.
On touch: tap ROLL, tap a tile, and tap a card once to read it and again to play it.

## The lands

1. **Fern Valley** — home, and the road out of it. Boss: Blaze, the stove raptor.
2. **Drizzle Jungle** — it has been raining since the ice melted. Boss: Horace, a triceratops who has had enough.
3. **Bonebake Badlands** — where the big ones came to die. Boss: the Tar King.
4. **Frostfang Peaks** — the cold road over the top of the world. Boss: Rexmond, Grandma's other grandson.
5. **Smoke Mountain** — Grandma Rex lives at the top.

Each land has its own sky, horizon, ground, weather, props, beasts and music.
After each boss the family sits round the fire with whoever has just been
freed, and the beast you beat sits on the other side of it.

## The look

The art is authored as code. Python generators under `tools/` draw every
sprite a pixel at a time, with shaded forms, dithered tones and automatic
outlines, and write them into `js2/art_*.js` as rows of palette characters.
All four heroes and the neighbours come from one figure builder
(`tools/chars/family.py`), each with their own body shape, outfit and
instrument. The nine combat beasts come from `tools/dinos/zoo.py`, with walk
cycles that plant every foot; the T-Rex, Blaze, Grandma Rex, the board tiles,
charms, artifacts and props each have their own generator.

The board's ground is baked per pixel from tiling noise with Bayer dithering, a
chunk at a time just ahead of the camera. Light and colour are done in a WebGL
pass: the world is lit in stepped, dithered bands at the art's own pixel size,
not with soft round glows, then graded per land, vignetted and given a little
grain. Without WebGL, or with LIGHTING switched off, it falls back to plain 2D.

## What's in it

- 4 playable heroes, 111 cards (46 shared, the rest split between the heroes)
  and 35 artifacts
- 5 lands, 17 beasts including 5 bosses, 10 charms and 25 kinds of tile
- An opening and an ending staged as cutscenes in the cave home
- 20 original songs synthesized in Web Audio, plus about 80 sound effects
- 274 sprites on a shared 50-colour palette

## Tech

Vanilla JavaScript on a 960x540 canvas scaled with pixel-perfect rendering.
Art is text in `js2/art_*.js`, compiled to canvases at load. Music is written as
16th-note step patterns in `js2/songs.js` and played by the synth sequencer in
`js2/audio.js`, which also feeds the rhythm charts, so the notes you hit are the
melody of the song that is playing.

```
js2/core.js       math, seeded RNG, coroutines, tweens, camera, juice, particles
js2/font.js       two bitmap fonts
js2/gfx.js        palette, sprite compiler, drawing, input, immediate-mode UI
js2/post.js       the WebGL light and colour pass
js2/light.js      where the light comes from, scene by scene
js2/anim.js       animated actors, effects, emotes
js2/audio.js      synth voices, sequencer, sound effects
js2/songs.js      every song
js2/dialogue.js   speech bubbles with tails and typewriter text
js2/rhythm.js     the Rock-Axe: strings, strum bar and the chant
js2/cards.js      cards, enchantments and the card renderer
js2/relics.js     artifacts
js2/heroes.js     the four heroes, their cards and their artifacts
js2/enemies.js    beasts, bosses, intents, encounter tables
js2/tiles.js      terrain, tile kinds, charms, board events
js2/boardgen.js   the five lands, the board generator, the ground bake
js2/dice.js       the bone die, rolled in 3D
js2/board.js      the board game itself
js2/stage.js      events on the road, played as close-up films
js2/boardui.js    the sky, hero select and the board's panels
js2/hud.js        the in-play interface
js2/world.js      the cave home and the yard
js2/cave.js       the hill the cave is cut into
js2/vista.js      the far country behind every scene
js2/cutscene.js   the opening and the ending
js2/combat.js     the fights
js2/events.js     rewards after a fight
js2/scenes.js     title, hero picks, campfire stories, game over, overlays
js2/main.js       run state, routing, save/load, the frame loop
js2/ART_SPEC.md   the art specification the sprites were authored against
```

The first cut of the game is still playable at `index-classic.html` with its
sources under `js/`.

Dev tools in `tools/` (Node + Playwright): `check-art.js` validates every
sprite against the palette and the manifest, `sheet.js` renders a contact
sheet, and `check-songs.js` validates the music. `boot2.js`, `intro3.js`,
`board2.js`, `journey.js` and `touch.js` drive the game headlessly: the menus
and every hero, the opening, the board, all five lands to the ending, and a
phone. `audiocheck.js` measures loudness. Serve the folder
(`python3 -m http.server 8765`) before running them.
