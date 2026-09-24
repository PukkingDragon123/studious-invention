"""The valley's scenery, remade at the size the people need: a hut is twice
the height of the man who lives in it, a tree is three times. Built on the
same pxlib as the beasts, so the light is the same everywhere - up and to
the left - and every edge gets the engine's ink outline."""
import sys, os, math, random
D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(D, '..', 'beasts'))
from pxlib import *

LEAF = ['t', 'u', 'v', 'w', 'x']
LEAF_J = ['M', 'N', 'u', 'v', 'w']            # jungle: bluer, wetter
BARK = ['f', 'g', 'h', 'i']
WOOD = ['j', 'k', 'l', 'm', 'n']
STONE = ['o', 'p', 'q', 'r', 's']
THATCH = ['j', 'k', 'l', 'm', 'n']
ASHW = ['1', '2', '3', '4', '5']

def canopy(cv, blobs, ramp, rng, dens=0.10):
    s = set()
    for (x, y, r) in blobs: s |= disc(x, y, r)
    shade(cv, s, ramp, bias=0.2, band=3)
    # each blob gets its own lit cap and shadowed belly, so the crown reads
    # as a heap of leaf clusters and not one green ball
    for (x, y, r) in sorted(blobs, key=lambda b: b[1]):
        cap = disc(x - r * 0.25, y - r * 0.3, r * 0.55) & s
        for p in cap:
            if rng.random() < 0.55: cv.set(p[0], p[1], ramp[-2])
        for p in disc(x - r * 0.35, y - r * 0.45, r * 0.22) & s:
            if rng.random() < 0.7: cv.set(p[0], p[1], ramp[-1])
        belly = set(p for p in disc(x, y, r) if p[1] > y + r * 0.45) & s
        for p in belly: cv.set(p[0], p[1], ramp[1])
    # leaf texture: little dark notches through the whole crown
    for p in sorted(s):
        if rng.random() < dens and (p[0], p[1] + 1) in s: cv.set(p[0], p[1], ramp[0])
    return s

def trunk(cv, x0, y0, x1, y1, w0, w1, ramp):
    pts = [(x0 - w0 / 2, y0), (x0 + w0 / 2, y0), (x1 + w1 / 2, y1), (x1 - w1 / 2, y1)]
    s = poly(pts)
    shade(cv, s, ramp, bias=0.1, band=2)
    return s

# --------------------------------------------------------------------- trees
def tree(cv, o):
    rng = random.Random(o.get('seed', 1))
    W, H = cv.w, cv.h
    cx = W / 2
    ramp = o.get('ramp', LEAF)
    t = trunk(cv, cx + 1, H - 3, cx + 2, H * 0.46, 15, 9, BARK)
    for (dx, ln) in ((-9, 6), (8, 5)):                           # root flare
        shade(cv, limb([(cx + dx * 0.4, H - 6, 3), (cx + dx, H - 2, 2)]), BARK)
    for k in range(4):                                           # bark lines
        x = cx - 3 + k * 2
        for y in range(int(H * 0.55), H - 5, 3): cv.setif(x, y, 'f', 'ghi')
    sway = o.get('sway', 0)
    blobs = [(cx + sway, 38, 25), (cx - 20 + sway, 50, 17), (cx + 21 + sway, 50, 17),
             (cx - 11 + sway, 24, 15), (cx + 12 + sway, 25, 15), (cx + sway, 62, 16),
             (cx - 27 + sway, 38, 11), (cx + 28 + sway, 38, 11)]
    canopy(cv, blobs, ramp, rng)
    # a few fruit
    if o.get('fruit'):
        for _ in range(5):
            x, y = cx + rng.uniform(-20, 20), rng.uniform(40, 62)
            if cv.get(x, y) != '.': cv.set(x, y, 'F'); cv.set(x + 1, y, 'G')

def pine(cv, o):
    rng = random.Random(o.get('seed', 2))
    W, H = cv.w, cv.h
    cx = W / 2
    ramp = o.get('ramp', ['t', 'u', 'N', 'v', 'w'])
    trunk(cv, cx, H - 3, cx, H - 26, 9, 7, BARK)
    tiers = [(H - 22, 30), (H - 44, 26), (H - 64, 21), (H - 82, 15), (H - 96, 9)]
    for (by, hw) in tiers:
        top = by - hw * 1.25
        pts = [(cx, top)]
        n = 7
        for i in range(n + 1):                                   # a ragged hem
            x = cx + hw - i * (hw * 2) / n
            pts.append((x, by + (3 if i % 2 else 0)))
        s = poly(pts)
        shade(cv, s, ramp, bias=0.1, band=2)
        for p in s:
            if p[1] > by - 3 and rng.random() < 0.6: cv.set(p[0], p[1], ramp[0])
        for p in s:
            if p[0] < cx - 2 and p[1] < by - hw * 0.4 and rng.random() < 0.25: cv.set(p[0], p[1], ramp[-1])

def palm(cv, o):
    rng = random.Random(o.get('seed', 3))
    W, H = cv.w, cv.h
    bx, by = W * 0.42, H - 3
    nodes = [(bx, by, 5), (bx + 4, by - 26, 4.4), (bx + 10, by - 52, 3.8), (bx + 17, H * 0.28, 3.4)]
    s = limb(nodes, 10)
    shade(cv, s, ['g', 'h', 'i', 'n'], band=1)
    for i in range(1, 12):                                        # rings on the trunk
        t = i / 12
        x = bx + 17 * t * t; y = by - (by - H * 0.28) * t
        for dx in range(-3, 4): cv.setif(x + dx, y, 'g', 'hin')
    hx, hy = bx + 17, H * 0.28
    for k, (ang, ln) in enumerate([(-2.8, 30), (-2.2, 34), (-1.5, 30), (-0.8, 34), (-0.2, 30), (0.5, 26), (2.6, 26)]):
        pts = []
        for j in range(8):
            t = j / 7
            pts.append((hx + math.cos(ang) * ln * t, hy + math.sin(ang) * ln * t + (t * t) * 16))
        fr = set()
        for j in range(len(pts) - 1):
            (ax, ay), (cx2, cy2) = pts[j], pts[j + 1]
            r = 3.6 * (1 - j / 8) + 1
            fr |= limb([(ax, ay, r), (cx2, cy2, r * 0.9)], 4, sq=0.55)
        shade(cv, fr, LEAF, band=1)
        for j, (px, py) in enumerate(pts):                        # the rib down the middle
            cv.set(px, py, 'u')
    for (dx, dy) in ((-3, 4), (2, 5), (0, 2)):                    # coconuts
        flat(cv, disc(hx + dx, hy + dy, 2.6), 'h'); cv.set(hx + dx - 1, hy + dy - 1, 'i')

def deadtree(cv, o):
    W, H = cv.w, cv.h
    cx = W / 2
    trunk(cv, cx, H - 3, cx + 1, H * 0.42, 14, 7, ASHW[:4])
    for (a, ln, y0) in ((-2.4, 26, 0.5), (-0.7, 28, 0.55), (-1.9, 18, 0.38), (-1.1, 20, 0.3), (-2.8, 14, 0.66), (-0.3, 16, 0.7)):
        x0 = cx + 1; yy = H * y0
        pts = [(x0, yy, 3.4), (x0 + math.cos(a) * ln * 0.6, yy + math.sin(a) * ln * 0.6, 2.2),
               (x0 + math.cos(a) * ln, yy + math.sin(a) * ln - 4, 1.2)]
        shade(cv, limb(pts, 8), ASHW[:4], band=1)

# ------------------------------------------------------------- undergrowth
def bush(cv, o):
    rng = random.Random(o.get('seed', 4))
    W, H = cv.w, cv.h
    blobs = [(W * 0.5, H * 0.52, H * 0.42), (W * 0.28, H * 0.66, H * 0.30), (W * 0.72, H * 0.64, H * 0.32),
             (W * 0.40, H * 0.36, H * 0.26), (W * 0.62, H * 0.38, H * 0.24)]
    canopy(cv, blobs, o.get('ramp', LEAF), rng, dens=0.14)
    if o.get('berries'):
        for _ in range(6):
            x, y = rng.uniform(W * 0.2, W * 0.8), rng.uniform(H * 0.3, H * 0.8)
            if cv.get(x, y) != '.': cv.set(x, y, 'F'); cv.set(x, y - 1, 'G')

def fern(cv, o):
    W, H = cv.w, cv.h
    bx, by = W / 2, H - 2
    for (ang, ln) in ((-2.6, 15), (-2.1, 17), (-1.57, 15), (-1.0, 17), (-0.5, 15)):
        pts = [(bx + math.cos(ang) * ln * t, by + math.sin(ang) * ln * t + t * t * 5) for t in [i / 6 for i in range(7)]]
        fr = set()
        for j in range(len(pts) - 1):
            fr |= limb([(pts[j][0], pts[j][1], 2.4 - j * 0.3), (pts[j + 1][0], pts[j + 1][1], 2.1 - j * 0.3)], 3, sq=0.6)
        shade(cv, fr, LEAF, band=1)
        for (px, py) in pts: cv.set(px, py, 'u')

def rock(cv, o):
    rng = random.Random(o.get('seed', 5))
    W, H = cv.w, cv.h
    pts = [(3, H - 3), (5, H * 0.45), (W * 0.28, H * 0.18), (W * 0.6, H * 0.12), (W * 0.86, H * 0.32), (W - 3, H * 0.62), (W - 5, H - 3)]
    s = poly(pts)
    shade(cv, s, STONE, bias=0.3, band=3)
    # facets: a lit plane and a shadowed one
    for p in s:
        if p[0] < W * 0.45 and p[1] < H * 0.5 and rng.random() < 0.7: cv.set(p[0], p[1], 'r')
        if p[0] > W * 0.7 and p[1] > H * 0.5: cv.set(p[0], p[1], 'p')
    for x in range(int(W * 0.3), int(W * 0.62)): cv.setif(x, H * 0.5 + (x % 3 == 0), 'o', 'pqrs')   # a crack
    if o.get('moss', True):
        for p in s:
            if p[1] < H * 0.32 and rng.random() < 0.55: cv.set(p[0], p[1], rng.choice(['u', 'v', 'v', 'w']))

def stump(cv, o):
    W, H = cv.w, cv.h
    s = ell(W / 2, H * 0.62, W * 0.42, H * 0.34) | poly([(W * 0.08, H * 0.36), (W * 0.92, H * 0.36), (W * 0.92, H * 0.62), (W * 0.08, H * 0.62)])
    shade(cv, s, BARK, band=2)
    top = ell(W / 2, H * 0.36, W * 0.42, H * 0.2)
    flat(cv, top, 'n')
    for r in (0.3, 0.2, 0.1):
        for p in edge_of(ell(W / 2, H * 0.36, W * r, H * r * 0.48), (1, 1)): cv.set(p[0], p[1], 'l')
    rim(cv, top, 'm', (-1, -1))

def flowers(cv, o):
    rng = random.Random(o.get('seed', 6))
    W, H = cv.w, cv.h
    for i in range(5):
        x, y = 3 + i * (W - 6) / 4 + rng.uniform(-1, 1), H - 3 - rng.uniform(0, H * 0.45)
        for yy in range(int(y), H - 1): cv.set(x, yy, 'u')
        col = o.get('col', rng.choice(['C', 'X', 'T', '6']))
        for (dx, dy) in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)): cv.set(x + dx, y + dy, col)
        cv.set(x, y, 'B')

# -------------------------------------------------------------------- huts
def hut(cv, o):
    rng = random.Random(o.get('seed', 7))
    W, H = cv.w, cv.h
    cx = W / 2
    ruin = o.get('ruin', False)
    base_y = H - 3
    wall_top = H * 0.60
    # the stone wall: a band of fat stones laid in courses round the front
    wall = poly([(12, base_y), (12, wall_top), (W - 12, wall_top), (W - 12, base_y)])
    flat(cv, wall, 'p')
    for row, yy in enumerate(range(int(wall_top) + 1, base_y, 9)):
        off = 0 if row % 2 else 9
        for xx in range(12 - off, W - 12, 18):
            st = ell(xx + 9, yy + 4, 8.4, 4.4) & wall
            shade(cv, st, STONE, bias=0.2 + rng.uniform(-0.4, 0.4), band=2)
    # the door, a dark arch with a lashed frame
    door = ell(cx, base_y - 16, 12, 18) | poly([(cx - 12, base_y - 16), (cx + 12, base_y - 16), (cx + 12, base_y), (cx - 12, base_y)])
    flat(cv, door, '0')
    for p in edge_of(door, (0, -1)): cv.set(p[0], p[1], 'k')
    for y in range(int(base_y - 30), base_y): cv.set(cx - 13, y, 'k'); cv.set(cx + 13, y, 'k'); cv.set(cx - 14, y, 'j'); cv.set(cx + 14, y, 'j')
    flat(cv, disc(cx - 3, base_y - 20, 1.2), '1')                  # something looking out
    flat(cv, disc(cx + 3, base_y - 20, 1.2), '1')
    # the roof: a fat thatched cone that overhangs the wall
    apex = (cx, 6)
    roof = poly([apex, (W - 2, H * 0.62), (2, H * 0.62)]) | ell(cx, H * 0.60, W * 0.49, H * 0.08)
    hole = set()
    if ruin:                                   # a hole burned through, not a slice off
        for (hx, hy, hr) in ((cx + 22, H * 0.36, 13), (cx + 12, H * 0.28, 9), (cx + 32, H * 0.46, 8)):
            hole |= ell(hx, hy, hr, hr * 0.8)
    shade(cv, roof, THATCH, bias=0.3, band=3)
    # courses of straw, each with a ragged hem and strands down it
    for k, yy in enumerate(range(20, int(H * 0.62), 11)):
        for x in range(0, W):
            if (x, yy) in roof:
                cv.set(x, yy, 'j')
                if (x + k) % 3 == 0 and (x, yy + 1) in roof: cv.set(x, yy + 1, 'k')
                if (x * 7 + k) % 5 == 0 and (x, yy - 1) in roof: cv.set(x, yy - 1, 'n')
    for p in roof:
        if (p[0] * 3 + p[1]) % 13 == 0: cv.set(p[0], p[1], 'm')
    # the hem hangs in points over the wall
    for x in range(4, W - 4, 4):
        d = 3 + (x * 7 % 4)
        for yy in range(int(H * 0.62) + 1, int(H * 0.62) + d):
            if ruin and x > cx + 6: break
            cv.set(x, yy, 'k' if yy < H * 0.62 + d - 1 else 'j')
    # a bone and a tie at the top
    flat(cv, disc(apex[0], apex[1] + 4, 3.2), '#'); cv.set(apex[0] - 1, apex[1] + 3, '$')
    for x in range(int(cx - 5), int(cx + 6)): cv.set(x, apex[1] + 9, 'E')
    if ruin:
        hole &= roof
        for p in hole: cv.set(p[0], p[1], '0')                      # the dark inside
        for p in outline_set(hole):                                 # charred edges, and the rafters
            cv.set(p[0], p[1], rng.choice(['1', '2', 'y']))
        for k in range(3):
            x0 = cx + 10 + k * 9
            for t in range(18): cv.setif(x0 + t * 0.4, H * 0.24 + t, 'j', '0')
        for p in roof:
            if p not in hole and p[0] > cx - 4 and rng.random() < 0.12: cv.set(p[0], p[1], rng.choice(['k', 'j', '2']))

def totem(cv, o):
    W, H = cv.w, cv.h
    cx = W / 2
    pole = poly([(cx - 9, H - 2), (cx - 8, 10), (cx + 8, 10), (cx + 9, H - 2)])
    shade(cv, pole, WOOD, band=2)
    for fy, col in ((20, 'F'), (46, 'J'), (72, 'A')):              # three faces, three paints
        flat(cv, poly([(cx - 8, fy - 8), (cx + 8, fy - 8), (cx + 8, fy + 10), (cx - 8, fy + 10)]), 'k')
        for (ex) in (-4, 4):
            flat(cv, disc(cx + ex, fy - 2, 2.4), '$'); cv.set(cx + ex, fy - 2, '0')
        for x in range(int(cx - 5), int(cx + 6)): cv.set(x, fy + 5, '0')
        for x in range(int(cx - 4), int(cx + 5), 2): cv.set(x, fy + 6, '$')
        for y in range(fy - 8, fy + 10): cv.set(cx - 8, y, col); cv.set(cx + 8, y, col)
    wing = poly([(cx - 8, 8), (cx - 17, 2), (cx - 16, 12)]) | poly([(cx + 8, 8), (cx + 17, 2), (cx + 16, 12)])
    shade(cv, wing, WOOD, band=1)
    flat(cv, disc(cx, 6, 5), 'A'); flat(cv, disc(cx - 1, 5, 2), 'C')

# ------------------------------------------------------------ the rest
# Everything else the old art set drew, remade in the same hand, at the same
# size as the sprite it replaces so it drops straight in.
BONE = ['!', '@', '#', '$']
CLAY = ['y', 'z', 'A', 'B']
REED = ['j', 'k', 'l', 'm', 'n']

def line(cv, x0, y0, x1, y1, ch, want=None):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(n + 1):
        t = i / n
        x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        if want is None: cv.set(round(x), round(y), ch)
        else: cv.setif(round(x), round(y), ch, want)

def bones(cv, o):
    W, H = cv.w, cv.h
    flat(cv, ell(W / 2, H - 4, W / 2 - 2, 3.5), 'k')                    # the dirt they are in
    shade(cv, ell(W / 2, H - 5, W / 2 - 4, 2.5), ['j', 'k', 'l', 'm'], bias=0.2, band=1)
    # a ribcage, half under
    for k in range(6):
        x0 = 10 + k * 5.2
        shade(cv, limb([(x0, H - 5, 1.6), (x0 + 3, H - 14 - (k in (2, 3)) * 3, 1.5), (x0 + 8, H - 12, 1.2)], 6), BONE, band=1)
    shade(cv, limb([(7, H - 11, 2), (40, H - 13, 2)], 8), BONE, band=1)      # the spine
    # a leg bone lying across, knuckle ends
    shade(cv, limb([(30, H - 5, 1.8), (48, H - 8, 1.8)], 6), BONE, band=1)
    for (x, y) in ((29, H - 5), (49, H - 8)):
        shade(cv, disc(x, y - 1, 2.2) | disc(x, y + 1, 2.2), BONE, band=1)

def skull(cv, o):
    W, H = cv.w, cv.h
    head = ell(W * 0.42, H * 0.48, W * 0.36, H * 0.36) | poly([(W * 0.5, H * 0.3), (W - 3, H * 0.5), (W - 4, H * 0.72), (W * 0.52, H * 0.82)])
    shade(cv, head, BONE, bias=0.25, band=2)
    jaw = poly([(W * 0.3, H * 0.78), (W - 6, H * 0.74), (W - 8, H - 3), (W * 0.34, H - 3)])
    shade(cv, jaw, BONE, bias=-0.1, band=1)
    flat(cv, ell(W * 0.36, H * 0.42, 5.5, 5), '0')                          # the eye socket
    flat(cv, ell(W * 0.36, H * 0.44, 3, 2.6), '1')
    flat(cv, ell(W * 0.62, H * 0.46, 3.4, 2.4), '0')                        # the nose hole
    for k in range(7):                                                     # teeth, big ones
        x = W * 0.42 + k * 3.6
        for t in range(4 + (k % 2) * 2): cv.set(x, H * 0.72 + t, '$' if t < 3 else '#')
        cv.set(x + 1, H * 0.72, '@')
    shade(cv, limb([(W * 0.22, H * 0.28, 2.6), (W * 0.1, H * 0.1, 1.6), (W * 0.14, 2, 0.8)], 6), BONE, band=1)   # a horn
    for p in sorted(head):                                                 # cracks
        if (p[0] * 7 + p[1] * 3) % 41 == 0: cv.set(p[0], p[1], '!')

def basket(cv, o):
    W, H = cv.w, cv.h
    cx = W / 2
    body = set()
    for y in range(8, H - 1):
        t = (y - 8) / (H - 9)
        hw = W / 2 - 2 - abs(t - 0.45) * 5
        for x in range(int(cx - hw), int(cx + hw) + 1): body.add((x, y))
    shade(cv, body, REED, bias=0.2, band=2)
    for (x, y) in sorted(body):                                            # the weave
        if (x + (y // 3) * 2) % 4 == 0: cv.set(x, y, 'k' if cv.get(x, y) in 'lmn' else 'j')
        if y % 3 == 0 and (x + y) % 2: cv.set(x, y, 'j')
    lid = ell(cx, 7, W / 2 - 3, 4)
    shade(cv, lid, ['k', 'l', 'm', 'n'], bias=0.4, band=1)
    for x in range(int(cx - 5), int(cx + 6)): cv.set(x, 3 + (x % 2), 'E')   # a tie
    flat(cv, disc(cx, 3, 1.6), 'F')

def pot(cv, o):
    W, H = cv.w, cv.h
    cx = W / 2
    body = set()
    for y in range(5, H - 1):
        t = (y - 5) / (H - 6)
        hw = (W / 2 - 1) * (0.5 + math.sin(min(1, t) * math.pi * 0.95) * 0.52)
        for x in range(int(cx - hw), int(cx + hw) + 1): body.add((x, y))
    shade(cv, body, CLAY, bias=0.2, band=2)
    for y in (H * 0.48, H * 0.48 + 3):
        for x in range(W): cv.setif(x, y, '0', 'yzAB')
    for x in range(W):                                                     # the painted band: zigzag
        u = x % 6; cv.setif(x, H * 0.48 + 1 + (u if u < 3 else 5 - u) * 0.6, '$', 'yzAB')
    for x in range(int(cx - W * 0.26), int(cx + W * 0.26) + 1): cv.set(x, 4, 'z'); cv.set(x, 5, 'A')
    flat(cv, ell(cx, 4, W * 0.22, 1.2), '0')

def mushroom(cv, o):
    rng = random.Random(o.get('seed', 3))
    W, H = cv.w, cv.h
    for (cx, cy, r, sh) in ((W * 0.36, H * 0.34, 15, H - 2), (W * 0.76, H * 0.62, 8, H - 2)):
        stem = poly([(cx - 4, cy + r * 0.3), (cx + 4, cy + r * 0.3), (cx + 5, sh), (cx - 6, sh)])
        shade(cv, stem, ['@', '#', '$', '7'], bias=0.2, band=1)
        cap = set(p for p in ell(cx, cy, r, r * 0.72) if p[1] <= cy + r * 0.22)
        shade(cv, cap, ['E', 'F', 'G', 'X'], bias=0.3, band=2)
        for p in edge_of(cap, (0, 1)): cv.set(p[0], p[1], 'D')
        for k in range(int(r * 0.6)):                                      # the spots
            a = rng.uniform(math.pi * 1.05, math.pi * 1.95); d = rng.uniform(0.3, 0.8) * r
            x, y = cx + math.cos(a) * d, cy + math.sin(a) * d * 0.7
            flat(cv, ell(x, y, 1.6 + r * 0.05, 1.2), '$')

def egg(cv, o):
    W, H = cv.w, cv.h
    nest = ell(W / 2, H - 5, W / 2 - 1, 4.5)
    shade(cv, nest, ['k', 'l', 'm', 'n'], bias=0.1, band=1)
    for x in range(1, W - 1, 2): line(cv, x, H - 7, x + 3, H - 2, 'j' if x % 4 else 'n', 'klmn')
    e = ell(W / 2, H * 0.5, W * 0.34, H * 0.42)
    shade(cv, e, ['4', '5', '6', '7'], bias=0.3, band=2)
    for (x, y, r) in ((11, 10, 1.6), (18, 15, 2), (12, 20, 1.4), (20, 9, 1.2), (16, 24, 1.6), (9, 16, 1)):
        flat(cv, disc(x, y, r), 'O'); cv.set(x, y, 'N')
    for p in ell(W / 2, H - 5, W / 2 - 2, 3):
        if p[1] > H - 6: cv.set(p[0], p[1], cv.get(p[0], p[1]) if cv.get(p[0], p[1]) in 'klmn' else 'l')

def signpost(cv, o):
    W, H = cv.w, cv.h
    post = poly([(W / 2 - 2.5, 8), (W / 2 + 2.5, 8), (W / 2 + 2, H - 2), (W / 2 - 3, H - 2)])
    shade(cv, post, ['f', 'g', 'h', 'i'], band=1)
    board = poly([(2, 7), (W - 8, 6), (W - 1, 12), (W - 8, 19), (2, 18)])
    shade(cv, board, REED, bias=0.3, band=1)
    for y in (10, 14): line(cv, 3, y, W - 9, y - 0.5, 'k', 'lmn')
    # a bone for an arrow
    shade(cv, limb([(6, 12.5, 1.3), (W - 8, 12.5, 1.3)], 6), BONE, band=1)
    for (x) in (5, W - 7): shade(cv, disc(x, 11.3, 1.6) | disc(x, 13.7, 1.6), BONE, band=1)
    for y in (22, 24): line(cv, W / 2 - 4, y, W / 2 + 4, y + 1, 'E')       # a rag tied on

def campfire(cv, o):
    rng = random.Random(8 + o.get('frame', 0) * 3)
    W, H = cv.w, cv.h
    ph = o.get('frame', 0) * 1.6
    # logs, crossed
    for (x0, y0, x1, y1) in ((6, H - 7, W - 10, H - 11), (10, H - 11, W - 6, H - 6)):
        shade(cv, limb([(x0, y0, 3), (x1, y1, 3)], 6), ['f', 'g', 'h', 'i'], band=1)
    flat(cv, disc(W - 8, H - 11, 2.6), 'n'); flat(cv, disc(W - 5, H - 6, 2.4), 'n')
    # the flames
    if not o.get('out'):
        fire = {}
        for (bx, h, hw) in ((W / 2 - 7, 18, 5), (W / 2 + 6, 20, 5), (W / 2, 28, 7)):
            merge_fire(fire, flame_px(bx + rng.uniform(-1, 1), H - 11, h + rng.uniform(-3, 3), hw,
                                      sway=math.sin(ph + bx) * 2.5, wob=rng.uniform(-1.2, 1.2), phase=ph + bx * 0.1))
        paint_fire(cv, fire)
    # the ring of stones in front
    for k in range(6):
        x = 4 + k * (W - 8) / 5
        shade(cv, ell(x, H - 4 + (k in (0, 5)) * -1, 5, 3.6), ['o', 'p', 'q', 'r', 's'], bias=0.1, band=1)

def cave(cv, o):
    rng = random.Random(9)
    W, H = cv.w, cv.h
    face = poly([(0, H - 1), (4, H * 0.4), (W * 0.18, H * 0.12), (W * 0.42, 2), (W * 0.7, 5), (W * 0.9, H * 0.22), (W - 2, H * 0.55), (W - 1, H - 1)])
    shade(cv, face, ['o', 'p', 'q', 'r', 's'], bias=0.1, band=3)
    for k in range(40):                                                    # boulders in the face
        x, y = rng.uniform(4, W - 4), rng.uniform(H * 0.1, H - 4)
        s = ell(x, y, rng.uniform(4, 9), rng.uniform(3, 6)) & face
        shade(cv, s, ['o', 'p', 'q', 'r', 's'], bias=rng.uniform(-0.4, 0.3), band=1)
    mouth = ell(W / 2, H - 2, W * 0.26, H * 0.6)
    mouth = set(p for p in mouth if p[1] < H - 1)
    for p in mouth:                                                        # dark, going darker inside
        d = (p[1] - (H - 2 - H * 0.6)) / (H * 0.6)
        cv.set(p[0], p[1], '0' if d > 0.35 else '1')
    for p in outline_set(mouth): cv.set(p[0], p[1], '2')
    for k in range(7):                                                     # teeth over the mouth
        x = W / 2 - W * 0.2 + k * W * 0.066
        top = H - 2 - H * 0.6 * math.sqrt(max(0, 1 - ((x - W / 2) / (W * 0.26)) ** 2))
        for t in range(3 + (k % 3) * 2): cv.set(x, top + t, 'q'); cv.set(x + 1, top + t, 'p')
    for p in sorted(face):                                                 # moss on the top
        if p[1] < H * 0.3 and rng.random() < 0.3: cv.set(p[0], p[1], rng.choice('uvw'))

def stage(cv, o):
    rng = random.Random(10)
    W, H = cv.w, cv.h
    for lx in (16, W / 2, W - 16):                                         # stone pillars
        for k, yy in enumerate((H - 6, H - 15, H - 23)):
            shade(cv, ell(lx + (k % 2) * 2 - 1, yy, 10, 5), ['o', 'p', 'q', 'r', 's'], bias=-0.2, band=1)
    top = poly([(2, 8), (W - 2, 7), (W - 1, 17), (1, 18)])
    shade(cv, top, ['o', 'p', 'q', 'r', 's'], bias=0.3, band=2)
    for x in range(3, W - 2): cv.set(x, 8, 's')
    # the hide banner hung off the front
    ban = poly([(24, 16), (W - 24, 16), (W - 26, 32), (W - 34, 29), (W / 2, 33), (34, 29), (26, 32)])
    shade(cv, ban, ['E', 'F', 'G', 'X'], bias=0.2, band=1)
    for x in range(30, W - 30, 8):                                         # painted notes on it
        flat(cv, ell(x, 25, 2, 1.6), '$'); line(cv, x + 2, 25, x + 2, 20, '$')
    for x in range(4, W - 4, 3): cv.set(x, 6 + (x % 2), rng.choice('mn9'))   # straw on top

def fog(cv, o):
    rng = random.Random(11)
    W, H = cv.w, cv.h
    ph = o.get('frame', 0) * math.pi / 2
    blobs = []
    for k in range(9):
        a = k / 9 * math.tau + ph * (0.4 + (k % 3) * 0.2)
        r = 9 + (k % 4) * 2
        blobs.append((W / 2 + math.cos(a) * 12, H / 2 + math.sin(a) * 10 + 4, r))
    s = set()
    for (x, y, r) in blobs: s |= disc(x, y, r)
    shade(cv, s, ['Q', 'R', '1', '2', 'S'], bias=-0.2, band=3)
    for (x, y, r) in blobs:
        for p in disc(x - r * 0.3, y - r * 0.3, r * 0.4) & s: cv.set(p[0], p[1], 'R')
    # two eyes in it, which is the worst part
    for ex in (-6, 6):
        flat(cv, ell(W / 2 + ex, H / 2 + 2, 2.4, 1.6 + (0.6 if o.get('frame', 0) % 2 else 0)), 'T')
        cv.set(W / 2 + ex, H / 2 + 2, '7')
    for k in range(14):                                                    # wisps
        a = rng.uniform(0, math.tau) + ph
        cv.set(W / 2 + math.cos(a) * 26, H / 2 + math.sin(a) * 22, 'S')

def meat(cv, o):
    W, H = cv.w, cv.h
    shade(cv, limb([(6, H - 8, 2.4), (16, H - 16, 2.4)], 6), BONE, band=1)   # the bone
    shade(cv, disc(5, H - 9, 2.6) | disc(8, H - 5, 2.6), BONE, band=1)
    m = ell(W * 0.6, H * 0.42, W * 0.36, H * 0.34)
    shade(cv, m, ['y', 'z', 'A', 'h', 'i'], bias=0.1, band=2)
    for p in sorted(m):                                                    # char marks and fat
        if (p[0] + p[1] * 2) % 9 == 0: cv.set(p[0], p[1], 'y')
    for p in ell(W * 0.52, H * 0.3, 5, 2.4): cv.setif(p[0], p[1], 'B', 'yzAhi')
    for p in ell(W * 0.5, H * 0.28, 2, 1): cv.setif(p[0], p[1], 'C', 'yzABhi')

def jar(cv, o):
    W, H = cv.w, cv.h
    cx = W / 2
    body = set()
    for y in range(8, H - 1):
        t = (y - 8) / (H - 9)
        hw = (W / 2 - 4) * (0.42 + math.sin(min(1, t) * math.pi * 0.9) * 0.62)
        for x in range(int(cx - hw), int(cx + hw) + 1): body.add((x, y))
    shade(cv, body, CLAY, bias=0.1, band=2)
    for (hx, d) in ((cx - W * 0.36, -1), (cx + W * 0.36, 1)):              # looped handles
        for p in ell(hx, 14, 3.5, 5) - ell(hx, 14, 1.6, 3): cv.set(p[0], p[1], 'z')
    for y in (18, 30): 
        for x in range(W): cv.setif(x, y, '0', 'yzAB')
    for x in range(int(cx - 6), int(cx + 7)): cv.set(x, 7, 'A'); cv.set(x, 8, 'z')
    flat(cv, ell(cx, 7, 5, 1.2), 'J')                                     # water in it

def build():
    OUT = {}
    def add(name, w, h, drawer, frames=None):
        frames = frames or [{}]
        rows = []
        for o in frames:
            cv = Cv(w, h); drawer(cv, dict(o)); rows.append(cv.rows())
        OUT[name] = rows
    add('v_tree', 88, 120, tree, [dict(seed=1, sway=0), dict(seed=1, sway=1)])
    add('v_tree_big', 88, 120, tree, [dict(seed=21, sway=0), dict(seed=21, sway=1)])
    add('v_tree_fruit', 88, 120, tree, [dict(seed=8, fruit=True), dict(seed=8, fruit=True, sway=1)])
    add('v_tree_jungle', 88, 120, tree, [dict(seed=9, ramp=LEAF_J), dict(seed=9, ramp=LEAF_J, sway=1)])
    add('v_pine', 72, 124, pine, [dict(seed=2)])
    add('v_palm', 84, 112, palm, [dict(seed=3)])
    add('v_deadtree', 76, 108, deadtree, [dict()])
    add('v_bush', 48, 34, bush, [dict(seed=4)])
    add('v_bush_berry', 48, 34, bush, [dict(seed=12, berries=True)])
    add('v_bush_jungle', 48, 34, bush, [dict(seed=14, ramp=LEAF_J)])
    add('v_fern', 36, 26, fern, [dict()])
    add('v_rock', 44, 32, rock, [dict(seed=5)])
    add('v_rock_bare', 44, 32, rock, [dict(seed=15, moss=False)])
    add('v_stump', 30, 24, stump, [dict()])
    add('v_flowers', 22, 14, flowers, [dict(seed=6)])
    add('v_hut', 144, 124, hut, [dict(seed=7)])
    add('v_hut_ruin', 144, 124, hut, [dict(seed=17, ruin=True)])
    add('v_totem', 40, 96, totem, [dict()])
    add('v_bones', 52, 26, bones)
    add('v_skull', 48, 38, skull)
    add('v_basket', 30, 34, basket)
    add('v_pot', 30, 30, pot)
    add('v_mushroom', 38, 44, mushroom)
    add('v_egg', 30, 34, egg)
    add('v_signpost', 30, 44, signpost)
    add('v_campfire', 44, 40, campfire, [dict(frame=i) for i in range(4)])
    add('v_campfire_out', 44, 40, campfire, [dict(frame=0, out=True)])
    add('v_cave', 104, 80, cave)
    add('v_stage', 132, 52, stage)
    add('v_fog', 64, 64, fog, [dict(frame=i) for i in range(4)])
    add('v_meat', 40, 36, meat)
    add('v_jar', 34, 44, jar)
    return OUT

if __name__ == '__main__':
    for k, v in build().items(): print(k, len(v), len(v[0][0]), len(v[0]))
