"""Writes js2/art_cave.js - the card symbols, repainted as cave art.

The shapes were already right; what was wrong was the finish. Every art_*
symbol is read out of art_ui.js, flattened from its shaded game-icon palette
down to four earth tones by luminance, then dry-brushed: pigment breaks up
where the brush ran out, the edge picks up charcoal, and a little spatter
lands around it. The result reads as ochre daubed on rock.

    python3 tools/cavepaint.py
"""
import json, math, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# --- the game palette, straight out of gfx.js so the two can never drift -----
gfx = open(os.path.join(ROOT, 'js2/gfx.js')).read()
body = re.search(r'const PAL = \{(.*?)\n\};', gfx, re.S).group(1)
PAL = {}
for k, v in re.findall(r"'(.)':\s*'?(#[0-9a-fA-F]{6}|null)'?", body):
    if v != 'null': PAL[k] = v

def lum(ch):
    c = PAL.get(ch)
    if not c: return None
    r, g, b = int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255

# charcoal, burnt umber, red ochre, yellow ochre, chalk
EARTH = ['1', 'y', 'z', 'Z', '#']

def rnd(x, y, salt=0):
    return ((math.sin((x * 12.9898 + y * 78.233 + salt * 37.719)) * 43758.5453) % 1 + 1) % 1

def repaint(rows):
    h, w = len(rows), len(rows[0])
    g = [list(r) for r in rows]
    # --- 1. flatten to four earth tones by luminance
    for y in range(h):
        for x in range(w):
            c = g[y][x]
            if c == '.': continue
            L = lum(c)
            if L is None: L = 0.5
            i = 0 if L < 0.18 else 1 if L < 0.38 else 2 if L < 0.62 else 3 if L < 0.86 else 4
            g[y][x] = EARTH[i]
    # --- 2. dry brush: the pigment skips, mostly along diagonal strokes
    for y in range(h):
        for x in range(w):
            if g[y][x] == '.': continue
            stroke = math.sin((x + y * 0.6) * 0.9) * 0.5 + 0.5
            if rnd(x, y, 1) < 0.045 + stroke * 0.055: g[y][x] = '.'
    # --- 3. charcoal where the brush met the rock: darken the outer ring
    src = [r[:] for r in g]
    for y in range(h):
        for x in range(w):
            if src[y][x] == '.': continue
            edge = False
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if not (0 <= nx < w and 0 <= ny < h) or src[ny][nx] == '.': edge = True; break
            if edge and rnd(x, y, 2) < 0.7:
                g[y][x] = '1' if src[y][x] in ('1', 'y') else 'y'
    # --- 4. a lick of chalk on the upper-left of the brightest areas
    for y in range(h):
        for x in range(w):
            if g[y][x] == 'Z' and rnd(x, y, 3) < 0.14: g[y][x] = '#'
    # --- 5. spatter: a few stray flecks off the edge of the shape
    for y in range(h):
        for x in range(w):
            if g[y][x] != '.': continue
            near = any(0 <= x + dx < w and 0 <= y + dy < h and g[y + dy][x + dx] not in ('.', )
                       for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2))
            if near and rnd(x, y, 4) < 0.035: g[y][x] = 'y' if rnd(x, y, 5) < 0.6 else '1'
    return [''.join(r) for r in g]

# --- pull the symbols out of art_ui.js --------------------------------------
ui_path = os.path.join(ROOT, 'js2/art_ui.js')
ui = open(ui_path).read()
starts = [(m.group(1), m.start()) for m in re.finditer(r'(?m)^SPRITES\.([A-Za-z0-9_]+) = ', ui)]
blocks, keep = {}, ui
for i, (name, pos) in enumerate(starts):
    if not name.startswith('art_'): continue
    end = starts[i + 1][1] if i + 1 < len(starts) else len(ui)
    blocks[name] = ui[pos:end]

SPR = {}
for name, block in blocks.items():
    frames = re.findall(r"\[\s*((?:'[^']*',\s*)+)\]", block)
    fr = []
    for f in frames:
        fr.append(re.findall(r"'([^']*)'", f))
    fr = [f for f in fr if f and len(f[0]) > 1]
    SPR[name] = fr

out = ["""'use strict';
// art_cave.js - the card symbols, painted the way this valley paints. Flat
// earth pigment, charcoal at the edge where the brush met the rock, and gaps
// where it ran dry. Generated from the shapes in art_ui.js by
// tools/cavepaint.py - the drawing is the same, the finish is not.

"""]
man = json.load(open(os.path.join(ROOT, 'js2/manifest.json')))
n = 0
for name in sorted(SPR):
    fr = SPR[name]
    if not fr: continue
    painted = [repaint(f) for f in fr]
    body2 = ',\n'.join('[\n' + '\n'.join("'%s'," % r for r in f) + '\n]' for f in painted)
    out.append('SPRITES.%s = { outline: true, frames: [%s]};\n\n' % (name, body2))
    if name in man: man[name]['file'] = 'art_cave'
    n += 1
open(os.path.join(ROOT, 'js2/art_cave.js'), 'w').write(''.join(out))

# strip them out of art_ui.js so nothing is defined twice
drop = sorted(blocks.items(), key=lambda kv: -ui.index(kv[1]))
for name, block in drop:
    keep = keep.replace(block, '')
open(ui_path, 'w').write(keep)
json.dump(man, open(os.path.join(ROOT, 'js2/manifest.json'), 'w'), indent=1)
print('repainted %d symbols' % n)
