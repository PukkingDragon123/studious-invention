"""Writes js2/art_dream.js - the two things that only exist inside Bronk's head.

A MEGALODON that flies, and a SPINOSAURUS that has somehow acquired two guns.
Neither of them is real, which is why neither of them obeys anything. Built on
the same rules as the rest of the art: light from the upper left, one shadow
tone that follows the silhouette, no outline (the engine grows that).

    python3 tools/dream.py
"""
import math, os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ras import Grid

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SHARK = ['H', 'I', 'J', 'K', 'L']          # deep blue .. pale blue
BELLY = ['5', '6', '7']
TEETH = ['@', '#', '$']
GUM   = ['D', 'E', 'F']
SAIL  = ['y', 'z', 'A', 'B', 'C']          # ember orange
HIDE  = ['M', 'N', 'O', 'P']               # teal
GUN   = ['1', '2', '3', '4', '5']
BONE  = ['!', '@', '#', '$']
FIRE  = ['z', 'A', 'B', 'C', '9']

def shade_by_row(g, fam, ramp, frac=0.32):
    """two-tone shading that follows the silhouette, per row - no vertical seam"""
    H, W = g.h, g.w
    src = [r[:] for r in g.g]
    for y in range(H):
        x = 0
        while x < W:
            if src[y][x] not in fam: x += 1; continue
            x0 = x
            while x < W and src[y][x] in fam: x += 1
            x1 = x - 1
            n = x1 - x0 + 1
            cut = x1 - int(n * frac)
            for xx in range(max(x0, cut), x1 + 1):
                if src[y][xx] == ramp[2]: g.px(xx, y, ramp[1])
            if n > 3 and src[y][x1] in (ramp[2], ramp[1]): g.px(x1, y, ramp[0])
            if n > 4 and src[y][x0] == ramp[2]: g.px(x0, y, ramp[3])

def fin(g, x0, y0, x1, y1, x2, y2, ramp):
    """a swept triangular fin, lit along the leading edge"""
    n = 90
    for i in range(n + 1):
        t = i / n
        ax, ay = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        bx, by = x0 + (x2 - x0) * t, y0 + (y2 - y0) * t
        g.line(ax, ay, bx, by, ramp[2])
    g.line(x0, y0, x1, y1, ramp[3], 2)
    g.line(x0, y0, x2, y2, ramp[1], 2)
    g.line(x1, y1, x2, y2, ramp[0])

def teethrow(g, pts, up, ramp, size=3.2):
    for i in range(len(pts) - 1):
        (ax, ay), (bx, by) = pts[i], pts[i + 1]
        mx, my = (ax + bx) / 2, (ay + by) / 2
        h = size * (0.7 + 0.3 * math.sin(i * 1.3))
        g.line(ax, ay, mx, my + (h if up else -h), ramp[2], 2)
        g.line(bx, by, mx, my + (h if up else -h), ramp[1], 1)

# ------------------------------------------------------------------ MEGALODON
def megalodon(g, f):
    W, H = g.w, g.h
    sw = math.sin(f * math.pi / 2)                     # the whole animation clock
    cy = H * 0.52 + sw * 1.5
    # --- body: a torpedo, thickest a third of the way back
    for x in range(10, W - 22):
        t = (x - 10) / (W - 32)
        r = 17 * math.sin(min(1, max(0.02, t)) ** 0.55 * math.pi) ** 0.8
        r = max(2.2, r)
        yy = cy + math.sin(t * 2.2 + sw * 0.6) * 2.5
        for k in range(int(-r), int(r) + 1):
            g.px(x, yy + k, SHARK[2])
    # --- tail: a big crescent that sweeps with the frame
    tx = W - 24
    ty = cy + math.sin(2.2 + sw * 0.6) * 2.5
    fin(g, tx, ty, W - 2, ty - 26 + sw * 7, W - 8, ty - 3, SHARK)
    fin(g, tx, ty, W - 4, ty + 20 + sw * 7, W - 9, ty + 2, SHARK)
    # --- dorsal + pectoral fins, swept like wings
    fin(g, 52, cy - 12, 40, cy - 34 - sw * 3, 66, cy - 12, SHARK)
    fin(g, 46, cy + 10, 30, cy + 27 + sw * 3, 62, cy + 12, SHARK)
    fin(g, 62, cy + 11, 74, cy + 22 + sw * 2, 78, cy + 10, SHARK)
    # --- the belly, pale
    for x in range(14, W - 26):
        t = (x - 10) / (W - 32)
        r = max(2.2, 17 * math.sin(min(1, max(0.02, t)) ** 0.55 * math.pi) ** 0.8)
        yy = cy + math.sin(t * 2.2 + sw * 0.6) * 2.5
        for k in range(int(r * 0.30), int(r) + 1):
            if g.get(x, int(yy + k)) in SHARK: g.px(x, yy + k, BELLY[1] if k < r * 0.7 else BELLY[0])
    shade_by_row(g, set(SHARK), SHARK)
    # --- the head and the jaws, open
    gape = 8 + f % 2 * 5
    g.ellipse(24, cy - 4, 16, 11, SHARK[2])                    # the snout
    shade_by_row(g, set(SHARK), SHARK)
    # upper jaw
    up = [(6, cy - 9 - gape * 0.55), (14, cy - 11 - gape * 0.5), (24, cy - 9 - gape * 0.4), (34, cy - 6 - gape * 0.2)]
    lo = [(8, cy + 6 + gape * 0.5), (16, cy + 9 + gape * 0.45), (26, cy + 9 + gape * 0.35), (34, cy + 6 + gape * 0.15)]
    for i in range(len(up) - 1):                               # the mouth cavity
        for k in range(20):
            t = k / 19
            g.line(up[i][0] + (up[i+1][0]-up[i][0])*t, up[i][1] + (up[i+1][1]-up[i][1])*t,
                   lo[i][0] + (lo[i+1][0]-lo[i][0])*t, lo[i][1] + (lo[i+1][1]-lo[i][1])*t, '0')
    for i in range(len(up) - 1):
        g.line(*up[i], *up[i + 1], GUM[1], 4)
        g.line(*lo[i], *lo[i + 1], GUM[1], 4)
    teethrow(g, up, True, TEETH, 4.2)
    teethrow(g, lo, False, TEETH, 3.6)
    # --- gills and eye
    for i in range(5):
        gx = 40 + i * 5
        g.line(gx, cy - 9, gx - 2, cy + 3, SHARK[0], 1)
    g.disc(30, cy - 9, 3.4, '0')
    g.px(29, cy - 10, '7')
    # --- it is flying, so it gets speed lines
    for i in range(4):
        y = cy - 22 + i * 14
        g.line(0, y, 6 + (i % 2) * 5, y, SHARK[4])

# ---------------------------------------------------------------- SPINOSAURUS
def spino(g, f):
    W, H = g.w, g.h
    GYb = H - 2
    rec = (2.0 if f in (1, 2) else 0)                  # the guns kick
    bob = -1 if f % 2 else 0
    hipx, hipy = W * 0.66 + rec, GYb - 44 + bob

    def leg(off, ramp, toe):
        kx = hipx + off
        g.line(kx, hipy + 6, kx + 8, GYb - 22, ramp, 10)
        g.line(kx + 8, GYb - 22, kx + 3, GYb - 4, ramp, 8)
        g.ellipse(kx + 1, GYb - 3, 10, 4, ramp)
        for c in range(3): g.px(kx - 5 + c * 3, GYb - 4, toe)

    leg(-14, HIDE[1], BONE[2])                          # far leg, one tone back
    # --- tail
    for i in range(32):
        t = i / 31
        g.disc(hipx + 10 + t * 40, hipy + 6 + math.sin(t * 2 + bob) * 10, 8 - t * 6.4, HIDE[2])
    # --- the sail: seven spines on a webbed fan
    for i in range(7):
        t = i / 6
        sx = hipx - 24 + t * 50
        sh = 36 * math.sin(t * math.pi) ** 0.6 + 9
        g.line(sx, hipy - 12, sx + 3, hipy - 12 - sh, SAIL[1], 5)
        g.line(sx, hipy - 12, sx + 3, hipy - 12 - sh, SAIL[3], 2)
    for i in range(6):
        t0, t1 = i / 6, (i + 1) / 6
        for k in range(15):
            u = k / 14
            x0 = hipx - 24 + t0 * 50 + 3 * u
            x1 = hipx - 24 + t1 * 50 + 3 * u
            h0 = (36 * math.sin(t0 * math.pi) ** 0.6 + 9) * u
            h1 = (36 * math.sin(t1 * math.pi) ** 0.6 + 9) * u
            g.line(x0, hipy - 12 - h0, x1, hipy - 12 - h1, SAIL[2] if k % 2 else SAIL[1])
    # --- body and neck
    g.ellipse(hipx - 4, hipy + 2, 26, 18, HIDE[2])
    for i in range(22):
        t = i / 21
        g.disc(hipx - 24 - t * 20, hipy - 6 - t * 20, 10 - t * 3.5, HIDE[2])
    # --- head: a long crocodile snout, held low and forward
    hx, hy = hipx - 46, hipy - 28
    g.ellipse(hx, hy, 13, 9, HIDE[2])
    for i in range(18):
        t = i / 17
        g.disc(hx - 7 - t * 20, hy + 2 + t * 4, 7 - t * 2.6, HIDE[2])
    leg(4, HIDE[2], BONE[3])                            # near leg, full tone
    shade_by_row(g, set(HIDE), HIDE)
    # jaws, slightly open, full of teeth
    g.line(hx - 27, hy + 5, hx + 5, hy + 2, '0', 3)
    for i in range(10):
        tx = hx - 25 + i * 3.2
        g.line(tx, hy + 2, tx, hy - 1.6, TEETH[2], 1)
        g.line(tx + 1.6, hy + 5, tx + 1.6, hy + 7.4, TEETH[1], 1)
    g.disc(hx + 4, hy - 5, 3.4, '0')                    # the eye
    g.px(hx + 3, hy - 6, '7')
    g.line(hx + 8, hy - 10, hx - 2, hy - 9, '0', 3)     # the brow ridge
    for i in range(6):                                  # a crest of spines down the neck
        g.line(hipx - 26 - i * 3.6, hipy - 8 - i * 3.4, hipx - 28 - i * 3.6, hipy - 13 - i * 3.4, SAIL[2], 2)

    # --- two arms, each holding a gun. Drawn last and hand-shaded, because the
    #     silhouette pass has already run over the body behind them.
    for side, ay, gy in ((0, -10, 0), (1, 2, 7)):
        sx, sy = hipx - 22, hipy - 10 + ay
        ex, ey = sx - 20 - rec * 2, sy + 8 + gy
        ramp = HIDE[1 + side]
        g.line(sx, sy, ex, ey, ramp, 8)
        g.line(sx, sy - 2, ex, ey - 2, HIDE[3], 2)
        g.disc(ex, ey, 5, ramp)
        # the gun: a bundle of bone barrels on a stone body
        bx, by = ex - 4, ey - 1
        g.rect(bx - 24, by - 6, bx + 2, by + 6, GUN[2])
        g.rect(bx - 24, by - 6, bx + 2, by - 5, GUN[4])
        g.rect(bx - 24, by + 5, bx + 2, by + 6, GUN[0])
        for k in range(3):
            g.rect(bx - 38, by - 5 + k * 4, bx - 22, by - 3 + k * 4, BONE[1])
            g.rect(bx - 38, by - 5 + k * 4, bx - 22, by - 5 + k * 4, BONE[3])
            g.rect(bx - 38, by - 3 + k * 4, bx - 22, by - 3 + k * 4, BONE[0])
        g.rect(bx - 2, by + 5, bx + 4, by + 13, GUN[1])   # the grip
        g.rect(bx - 2, by + 5, bx - 1, by + 13, GUN[3])
        g.disc(bx - 10, by - 10, 5, GUN[3])               # a drum magazine
        g.disc(bx - 10, by - 10, 2.4, GUN[1])
        g.disc(bx - 11, by - 11, 1.2, GUN[4])
        if f in (1, 2):                                   # muzzle flash
            mx = bx - 40
            for k in range(3):
                g.ellipse(mx - k * 4, by, 10 - k * 2.4, 8 - k * 2, FIRE[4 - k])
            for k in range(7):
                a = -1.35 + k * 0.45
                g.line(mx, by, mx + math.cos(a) * 15, by + math.sin(a) * 15, FIRE[3 - (k % 2)])
            g.ellipse(mx - 1, by, 4, 3.4, '7')

SHEET = [
    ('megalodon_fly', 148, 70, megalodon, 4, 'a megalodon flying: torpedo body, swept wing-fins, crescent tail, jaws open on rows of teeth. Dream only.'),
    ('spino_gun',     156, 122, spino,    4, 'a spinosaurus standing on two legs with a gun in each hand, sail lit like an ember. Frames 1-2 fire.'),
]

out = ["""'use strict';
// art_dream.js - the two things that only exist inside Bronk's head: a
// megalodon that flies and a spinosaurus that has acquired two guns.
// Generated by tools/dream.py.

"""]
man = json.load(open(os.path.join(ROOT, 'js2/manifest.json')))
for name, w, h, fn, nf, note in SHEET:
    frames = []
    for f in range(nf):
        g = Grid(w, h)
        fn(g, f)
        frames.append([''.join(r) for r in g.g])
    body = ',\n'.join('[\n' + '\n'.join("'%s'," % r for r in fr) + '\n]' for fr in frames)
    out.append('SPRITES.%s = { outline: true, frames: [%s]};\n\n' % (name, body))
    man[name] = dict(w=w, h=h, frames=nf, note=note, file='art_dream')
open(os.path.join(ROOT, 'js2/art_dream.js'), 'w').write(''.join(out))
json.dump(man, open(os.path.join(ROOT, 'js2/manifest.json'), 'w'), indent=1)
print('wrote %d dream sprites' % len(SHEET))
