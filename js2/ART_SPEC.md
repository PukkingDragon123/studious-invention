# ONGA BONGA — pixel art specification (v2, high resolution)

All art is authored as arrays of row strings, one character per pixel, and lives
in `js2/art_*.js`. The engine compiles them at runtime. Canvas is **960x540** and
art is drawn at **scale 1** in the world, **scale 2** for cutscene close-ups, so
authored pixels are real pixels: draw with detail.

## File format

```js
// characters get an automatic 1px dark outline from the engine: DO NOT draw one
SPRITES.bronk_idle = { outline: true, frames: [
[
'....ffff....',   // frame 0, every row the same length
'...fdddf...',
],
[
'....ffff....',   // frame 1
'...fdddf...',
]]};

// props/tiles usually want no outline:
SPRITES.tile_grass = ['....', '....'];           // single frame, plain array
SPRITES.torch = { frames: [[...], [...]] };      // multi frame, no outline
```

Rules that the validator enforces (`node tools/check-art.js`):
* every row in a sprite is the same length, and every frame has the same height
* every character appears in the palette below (`.` is transparent)
* the declared size in the manifest is matched exactly

## Palette — one character per colour

Ramps run dark → light. **Use whole ramps for shading**, never a single flat colour.

| chars | ramp | hexes |
|---|---|---|
| `0 1 2 3 4 5 6 7` | neutral / shadow → white | `#120c16 #241c2e #3b3048 #574a66 #7a6d8a #a79bb4 #d6cfe0 #ffffff` |
| `a b c d e` | skin | `#6b3520 #a05a30 #d2874f #f0b985 #ffdcb8` |
| `f g h i` | hair / dark brown | `#241109 #4a2512 #75401f #a3663a` |
| `j k l m n` | wood, leather, hide | `#3a2415 #5c3a20 #85562f #b07a45 #d8a86b` |
| `o p q r s` | stone | `#2e2b38 #4d4a5c #6e6b80 #9391a6 #bdbccd` |
| `t u v w x` | green | `#14331e #27632f #3f9a45 #6cc95c #a8e878` |
| `y z A B C` | fire / orange | `#5c1607 #9c3510 #e06a1b #ffa832 #ffe08a` |
| `D E F G` | red | `#3f0e18 #7d1d2b #c2333c #ef6a5e` |
| `H I J K L` | blue | `#101f3d #1d3d72 #3570c0 #6aa9ee #a8d8ff` |
| `M N O P` | teal / water | `#0f3838 #18706a #2cb3a2 #86e8d2` |
| `Q R S T` | purple | `#281040 #4b2070 #7c3eb2 #b177e6` |
| `U V W X` | pink | `#58203c #a03a68 #e06a9b #ffb0cf` |
| `Y Z 8 9` | gold | `#6b4a10 #a8801f #e0b93a #ffe98a` |
| `! @ # $` | bone / ivory | `#8a7f68 #c4b89a #e8dfc6 #fffaea` |

## Style rules

1. **Light comes from the upper left.** Lightest shade on upper-left facing
   surfaces, mid tone across the body, darkest shade on the lower-right edge and
   under overhangs (chin, belly, arms).
2. **Three shades minimum per material.** A flat fill with no shading is a bug.
3. **No hand-drawn outline on anything with `outline: true`** — the engine grows
   one. For props without outline, use the darkest ramp step as an edge where it
   helps the shape read.
4. **Silhouette first.** Each character must be identifiable as a black shape:
   distinct hair, body width, props.
5. **Faces**: eyes are a `7` white with a `0` pupil where there is room; a single
   `0` pixel otherwise. Give everyone a brow line — it carries expression.
6. **Characters stand on the last row of the sprite** (no empty rows at the
   bottom) and are horizontally centred, facing RIGHT. Enemies also face right;
   the engine flips them.
7. **Animate with real frame changes**: a walk cycle moves legs, arms, hair and
   body height. Two-frame cycles must differ by more than one pixel.
8. Cartoon proportions: big heads, chunky hands and feet, exaggerated poses.
   This is a loud Flintstones-style comedy, not a realistic game.

## Checking your work

```
node tools/check-art.js                 # geometry + palette + manifest check
node tools/sheet.js art_chars           # renders a contact sheet PNG, then Read it
```
Run both. Look at the PNG and fix anything that reads as a blob, is off-centre,
is missing shading, or does not match its neighbours in style.
