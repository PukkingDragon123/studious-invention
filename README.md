# ONGA BONGA - A Stone Age Rock Saga

A 2D pixel-art roguelike deck-builder where every attack is a Guitar Hero style riff.
King Rex crashed the tribe's festival, kidnapped Princess Petra and scattered your band.
Climb three acts of a branching map, fight dinosaurs with music, rally the tribes,
reassemble the band and save the princess.

**Play it:** open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).
No build step, no dependencies, works offline. Turn your sound on.
It is also published as a playable Artifact at https://claude.ai/artifact/MYXyLPKGDvBpSymnj7V2Dh
(`artifact/page.html` is the wrapper page for that; the Artifact host supplies its
doctype and head, so it is not a standalone file).

## How it plays

- **Map (Slay the Spire style):** pick a node each floor: combat, elite, mystery event,
  rest site, shop, treasure, boss. Three acts: Bedrock Valley, Tar Pit Jungle, Volcano Peak.
- **Combat:** 3 energy per turn, draw 5. Cards are riffs (attacks), moves (block/utility),
  rallies (Hype) and powers. Enemies telegraph their intent.
- **Riffs:** attack cards marked with a note start a rhythm solo synced to the music.
  Notes fall down four lanes; hit them with **D F J K** (or arrow keys, or click/tap the lane).
  PERFECT = 1.5x damage, GOOD = 1x, MISS = 0. Riffs are cut from the melody of the
  song that's playing, and your guitar only sounds when you hit the notes.
- **Hype and Encore:** notes and rally cards build Hype. At 100, press **Space** for an
  ENCORE: a free epic solo that hits every enemy for each note you land.
- **Win to unlock:** every victory offers new riffs for your deck; elites and bosses drop relics
  (T-Rex Head, Mammoth Tusk, The Wheel, Echo Drum...). Each boss frees a bandmate
  (Bonga on drums, Ugg on bass, Zog on bone flute) who fights beside you and adds a signature card.
- **Rally your folks:** mystery events let you play for scared tribes; rallied folk give you
  permanent starting Hype.

Controls: mouse for everything, `E` end turn, `1-9` pick cards, `Space` encore, `Esc` menu.
On a phone or tablet: four thumb-sized fret pads appear under the fretboard during a
riff (two fingers at once play chords), cards are tap-to-read then tap-to-play with a
tap-a-dinosaur targeting step, and the map scrolls by dragging.
Settings include music/SFX volume, note travel speed, timing offset and hit-window difficulty.
Runs auto-save; continue from the title screen.

## Content

- 45 cards, 24 relics, 25 enemies including 3 bosses (Thunder Tricera, the Swamp Queen, King Rex)
- 14 original procedurally synthesized songs (Web Audio: distorted guitar, sub bass, tribal drums,
  bone flute, formant chant), tempo-synced delay and reverb
- 10 mystery events, shop, rest sites, treasure caves, story cutscenes and an ending concert

## Tech

Vanilla JavaScript on a 640x360 canvas scaled with pixel-perfect rendering. All art is
hand-authored pixel sprites in `js/sprites.js`; the 5x7 bitmap font is in `js/font.js`.
Music is written as 16th-note step patterns in `js/songs.js` and played by the synth
sequencer in `js/audio.js`, which also feeds the rhythm charts.

```
js/util.js     helpers, seeded RNG, coroutines, particles
js/gfx.js      palette, sprite compiler, drawing, input, immediate-mode UI
js/audio.js    synth voices, sequencer, SFX
js/songs.js    all music
js/cards.js    card definitions + renderer
js/relics.js   relics
js/enemies.js  enemies, AI, encounters
js/rhythm.js   riff mini-game
js/combat.js   combat scene
js/map.js      map generation + map scene
js/events.js   events, rest, shop, treasure, rewards
js/scenes.js   title, story, ending, overlays
js/main.js     game state, routing, save/load, loop
```

Dev tools in `tools/` (Node + Playwright): `check-sprites.js`, `check-songs.js`,
`spritesheet.html`, `play.js` (smoke test), `tour.js` (screenshots every screen),
`autorun.js` (bot that plays a full run), `audiocheck.js` (loudness check).
Serve the folder (`python3 -m http.server 8765`) before running the Playwright tools.
