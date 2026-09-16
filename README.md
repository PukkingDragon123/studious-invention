# ONGA BONGA — A Stone Age Rock Saga

A 2D pixel-art game where a flaming raptor steals your family and you get them
back with music. Walk a ruined valley, dodge or fight the beasts patrolling it,
and settle every fight by playing riffs in a Friday-Night-Funkin' style note
field. No build step, no dependencies: open `index.html` in a browser.

**Play it:** open `index.html` (or the published Artifact link at the bottom).
Turn your sound on. Landscape on a phone.

## The story

BLAZE, a fire-breathing raptor, spent six years chained in Bronk's kitchen as
the family stove. One Tuesday he snapped the chain and took Bronk's wife and
children with him. Bronk is not fast and he is not fit, but he is extremely
loud. The opening plays out as a cinematic with four mini-games: work the
bellows to light the stove, eat breakfast before the children do, run the
mammoth shower, and drive the stone car to work until a T-Rex changes your mind.

## How it plays

- **The valley is a tile map, not a node map.** Four-way movement with weight
  and slide, a stamina bar that empties because Bronk is built the way he is,
  and a belly that keeps its own rhythm. Beasts patrol with vision cones: stay
  out of them, hide in a bush, outrun them, or take the fight. Campfires restore
  health and stamina. Black fog marked with a question mark is a mystery
  encounter. The shop is a mammoth loaded with other people's belongings that
  wanders the zone on its own route.
- **Fights are a deck of riffs.** Three energy a turn, five cards, Block,
  statuses, enemy intents. Cards marked with a note cut to a close-up: the
  camera pushes in, the letterbox closes, and the note field takes over.
- **The note field is FNF-shaped.** Four arrow lanes rise to receptors, hit with
  the arrow keys, D F J K, a click, or the four pads on a touch screen. SICK,
  GOOD, BAD and AWFUL timing windows, sustains you hold, a combo counter, and a
  crowd meter that tugs between you and the beast. Duel cards are call and
  answer: the beast plays a phrase on the left field, you play it back on the
  right.
- **Hype and Encore.** Landed notes fill the Hype column. At full, ENCORE is a
  free epic solo that hits every beast once per note you land.
- **Three acts.** Each ends with BLAZE, angrier each time, and each rescue adds
  a bandmate who fights beside you and brings a signature riff.

Controls: WASD or arrows to walk, SHIFT to run, E to interact, M for the map,
1-9 to play a card, SPACE for Encore, E to end a turn, ESC for the menu.
On touch: a virtual stick, an ACT button, tap-to-read then tap-to-play cards,
and four fret pads during a riff.

## What's in it

- 38 riff cards, 16 relics, 13 beasts and a three-phase boss
- A cinematic opening with four bespoke mini-games
- Three tile zones generated from a seed, each with campfires, patrols, fog
  encounters, a wandering shop and a boss
- 20 original songs synthesized in Web Audio, plus about 60 sound effects
- 177 hand-authored sprites at roughly four times the pixel density of the first
  cut, with automatic outlines and a shared 50-colour palette

## Tech

Vanilla JavaScript on a 960x540 canvas scaled with pixel-perfect rendering.
Art is authored as text in `js2/art_*.js` and compiled to canvases at load.
Music is written as 16th-note step patterns in `js2/songs.js` and played by the
synth sequencer in `js2/audio.js`, which also feeds the rhythm charts, so the
notes you hit are the melody of the song that is playing.

```
js2/core.js       math, seeded RNG, coroutines, tweens, camera, juice, particles
js2/font.js       two bitmap fonts
js2/gfx.js        palette, sprite compiler, drawing, input, immediate-mode UI
js2/anim.js       animated actors, effects, emotes
js2/audio.js      synth voices, sequencer, sound effects
js2/songs.js      every song
js2/dialogue.js   speech bubbles with tails and typewriter text
js2/rhythm.js     the note field
js2/cards.js      riff cards and their renderer
js2/relics.js     relics
js2/enemies.js    beasts, intents, encounter tables
js2/minigames.js  bellows, breakfast, shower, drive
js2/cutscene.js   sets, staging and the opening script
js2/combat.js     the performance
js2/village.js    the tile overworld
js2/events.js     the mammoth market, fog encounters, rewards
js2/scenes.js     title, act transitions, ending, overlays
js2/main.js       run state, routing, save/load, the frame loop
js2/ART_SPEC.md   the art specification the sprites were authored against
```

The first cut of the game is still playable at `index-classic.html` with its
sources under `js/`.

Dev tools in `tools/` (Node + Playwright): `check-art.js` validates every
sprite against the palette and the manifest, `sheet.js` renders a contact sheet,
`check-songs.js` validates the music, `boot2.js` / `intro2.js` / `feat2.js` /
`riffshot.js` drive the game headlessly, and `audiocheck.js` measures loudness.
Serve the folder (`python3 -m http.server 8765`) before running them.
