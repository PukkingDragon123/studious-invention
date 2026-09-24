"""The Rockbottoms' furniture, remade on the same pxlib as the beasts and the
valley, so the light is the same everywhere - up and to the left - and every
edge gets the engine's ink outline.

Each piece is drawn at the size the family needs: the bed takes Bronk lying
down with his head on the pillow, the perch puts the dodo's feet exactly
where the script stands it, the table top is at plate height, and the car
seats the driver sprite where the drive scenes put him."""
import sys, os, math, random
D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(D, '..', 'beasts'))
from pxlib import *

STONE = ['o', 'p', 'q', 'r', 's']
SLATE = ['1', '2', '3', '4', '5']
WOOD = ['j', 'k', 'l', 'm', 'n']
BARK = ['f', 'g', 'h', 'i']
BONE = ['!', '@', '#', '$']
FUR_O = ['y', 'z', 'A', 'B', 'C']
FUR_B = ['f', 'g', 'h', 'i', 'm']
HIDE = ['k', 'l', 'm', 'n']
HIDE_L = ['l', 'm', 'n', '$']
STRAW = ['k', 'l', 'm', 'n', '9']
CLAY = ['y', 'z', 'A', 'B']
LEAF = ['t', 'u', 'v', 'w', 'x']

def line(cv, x0, y0, x1, y1, ch, want=None):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(n + 1):
        t = i / n
        x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        if want is None: cv.set(round(x), round(y), ch)
        else: cv.setif(round(x), round(y), ch, want)

def cut_stone(cv, s, rng, ramp=STONE, bias=0.2, marks=0.02):
    """a block of worked stone: shaded, with chisel pits and a lit top edge"""
    shade(cv, s, ramp, bias=bias, band=2)
    for p in sorted(s):
        if (p[0], p[1] - 1) not in s: cv.set(p[0], p[1], ramp[-1])
        elif rng.random() < marks: cv.set(p[0], p[1], ramp[1])

# ------------------------------------------------------------------- the bed
def bed(cv, o):
    rng = random.Random(11)
    W, H = cv.w, cv.h
    for fx in (30, 124):                                          # two squat boulders for feet
        shade(cv, ell(fx, H - 6, 16, 6), STONE, bias=-0.3, band=2)
    slab = poly([(10, 50), (W - 14, 50), (W - 10, 61), (8, 61)])
    cut_stone(cv, slab, rng)
    for x in range(11, W - 14): cv.set(x, 51, 'r')
    for k in range(9):                                            # chisel marks down the front
        x = 18 + k * 14 + rng.randint(-2, 2)
        cv.set(x, 55, 'p'); cv.set(x + 1, 56, 'p'); cv.set(x, 54, 'r')
    # straw under everything, spilling over the edge of the slab
    straw = ell(W / 2 + 2, 47, W / 2 - 18, 5)
    shade(cv, straw, STRAW, band=1)
    for k in range(46):
        x, y = rng.uniform(14, W - 16), rng.uniform(44, 53)
        a = rng.uniform(-0.5, 0.5) + (math.pi if rng.random() < 0.5 else 0)
        for t in range(rng.randint(3, 7)):
            cv.set(x + math.cos(a) * t, y + math.sin(a) * t * 0.5, rng.choice('lmn9'))
    # the pillow: a stuffed hide sack, lumpy, sewn up the middle
    pil = ell(54, 41, 20, 8) | ell(40, 44, 12, 7) | ell(66, 41, 10, 6)
    shade(cv, pil, HIDE_L, bias=0.2, band=2)
    for x in range(38, 72, 3): cv.set(x, 45 + (x % 2), 'k')
    # the pelt over the foot of the bed: a sabre-tooth, stripes and all
    top = [(74, 41), (92, 38), (112, 37), (132, 38), (144, 41)]
    hem = []
    for x in range(146, 70, -4): hem.append((x, 57 + (2 if (x // 4) % 2 else 0)))
    pelt = poly(top + hem)
    shade(cv, pelt, FUR_O, bias=0.2, band=2)
    for k in range(6):                                            # the stripes
        sx = 84 + k * 10
        for t in range(21):
            x = sx + math.sin(t * 0.28 + k) * 2.4
            cv.setif(x, 38 + t, 'z', 'yzABC'); cv.setif(x + 1, 38 + t, 'y', 'yzABC')
    for (x, y) in hem:                                            # the fringe
        for t in range(rng.randint(1, 3)): cv.set(x + rng.randint(-1, 1), y + t, 'z')
    # its head, flopped over the end of the bed, still looking pleased
    hx, hy = W - 14, 48
    for ex in (-8, 7):
        shade(cv, ell(hx + ex, hy - 8, 3.5, 3.5), FUR_O, bias=0.1, band=1)
        cv.set(hx + ex, hy - 8, 'V')
    shade(cv, ell(hx, hy, 11, 9), FUR_O, bias=0.35, band=2)
    shade(cv, ell(hx, hy + 5, 6.5, 4), ['A', 'B', 'C', '$'], bias=0.4, band=1)
    for (ex, ey) in ((-5, -2), (4, -2)):                          # eyes shut: very dead, very relaxed
        for d in (-1, 0, 1): cv.set(hx + ex + d, hy + ey + (0 if d else 1), '0')
    cv.set(hx - 1, hy + 3, '0'); cv.set(hx, hy + 3, '0')
    for t in range(7):                                            # and the fangs
        w = 1 if t < 5 else 0
        for d in range(w + 1):
            cv.set(hx - 4 + d, hy + 7 + t, '$' if d == 0 else '#'); cv.set(hx + 3 + d, hy + 7 + t, '$' if d == 0 else '#')
    for x in range(int(hx - 8), int(hx - 2), 2): cv.set(x, hy - 2 - 5, 'y')
    # two mammoth tusks for a headboard, lashed together
    for (bx, bend) in ((9, 1.0), (21, 0.8)):
        pts = [(bx, H - 6, 3.4), (bx - 2, H - 26, 3.3), (bx + 2 * bend, H - 44, 2.8), (bx + 9 * bend, H - 57, 2.0), (bx + 17 * bend, H - 62, 1.0)]
        shade(cv, limb(pts, 10), BONE, band=1)
    for y in (28, 30, 32, 34):
        for x in range(5, 27): cv.setif(x, y + (x % 3 == 0), 'k' if y % 4 else 'l', '!@#$')

# ------------------------------------------------------------------ the drum
def drum(cv, o):
    rng = random.Random(12)
    W, H = cv.w, cv.h
    cx = W / 2
    body = set()
    for y in range(12, H - 2):
        t = (y - 12) / (H - 14)
        hw = 21 - math.sin(t * math.pi) * 2.6
        for x in range(int(cx - hw), int(cx + hw) + 1): body.add((x, y))
    shade(cv, body, WOOD, bias=0.1, band=3)
    for k in range(7):                                            # grain
        for y in range(17, H - 4):
            if rng.random() < 0.65: cv.setif(cx - 16 + k * 5.4 + math.sin(y * 0.3 + k), y, 'k', 'lmn')
    for y in range(27, 35):                                       # a band of paint
        for x in range(W):
            cv.setif(x, y, 'E' if y in (27, 34) else 'F', 'jklmn')
    for x in range(W):
        u = x % 6
        cv.setif(x, 30 + (u if u < 3 else 5 - u) - 1, '9', 'F')
    head = ell(cx, 12, 22, 6)
    shade(cv, head, HIDE_L, bias=0.5, band=2)
    for p in edge_of(head, (0, 1)): cv.set(p[0], p[1], 'k')
    for p in ell(cx - 5, 11, 7, 2): cv.setif(p[0], p[1], '$', 'lmn$')
    for k in range(9):                                            # the lacing
        x0 = cx - 20 + k * 5
        line(cv, x0, 16, x0 + 2.5, 26, 'j', 'jklmn')
        line(cv, x0 + 2.5, 36, x0, H - 6, 'j', 'jklmn')
    for y in (H - 6, H - 5):
        for x in range(W): cv.setif(x, y, 'k', 'lmn')

# ------------------------------------------------------------------- the rug
def rug(cv, o):
    rng = random.Random(13)
    W, H = cv.w, cv.h
    body = set()
    for x in range(6, W - 6):
        t0 = 2 + (1 if math.sin(x * 0.19) > 0.6 else 0)
        b0 = H - 3 - (1 if math.sin(x * 0.23 + 1) > 0.7 else 0)
        for y in range(t0, b0 + 1): body.add((x, y))
    COLS = ['E', 'F', '8', 'F', 'E', '$', 'z']
    for (x, y) in body:
        band = ((x - 6) // 9)
        c = COLS[band % len(COLS)]
        # a zigzag through every band
        u = (x - 6) % 9
        zz = 5 + (u if u < 5 else 9 - u) - 2
        if y == zz or y == zz + 1: c = '0' if band % 2 else '$'
        cv.set(x, y, c)
    for (x, y) in body:                                           # weft lines, and the far edge in shade
        if y == min(yy for (xx, yy) in body if xx == x): cv.set(x, y, 'y')
        elif (x + y) % 4 == 0 and cv.get(x, y) not in '0$': cv.set(x, y, 'D' if cv.get(x, y) in 'EF' else 'Z')
    for x in list(range(0, 6)) + list(range(W - 6, W)):        # tassels
        for y in range(3, H - 2, 2): cv.set(x, y + (x % 2), 'm' if x % 2 else 'l')

# ----------------------------------------------------------- the dodo's perch
def perch(cv, o):
    rng = random.Random(14)
    W, H = cv.w, cv.h
    cx = W / 2
    stump = poly([(cx - 17, 12), (cx + 17, 12), (cx + 19, H - 8), (cx + 26, H - 2), (cx - 26, H - 2), (cx - 19, H - 8)])
    shade(cv, stump, BARK, bias=0.2, band=2)
    for k in range(6):                                            # bark grooves
        x0 = cx - 14 + k * 5.6
        for y in range(16, H - 4):
            if rng.random() < 0.8: cv.setif(x0 + math.sin(y * 0.21 + k) * 1.2, y, 'f', 'ghi')
    top = ell(cx, 12, 17, 4)
    flat(cv, top, 'n')
    for r in (0.66, 0.36):
        for p in edge_of(ell(cx, 12, 17 * r, 4 * r), (1, 1)): cv.set(p[0], p[1], 'l')
    rim(cv, top, 'm', (-1, -1))
    # the nest: a messy ring of straw on top, with a feather in it
    for k in range(120):
        a = rng.uniform(0, math.tau); r = rng.uniform(12, 22)
        x, y = cx + math.cos(a) * r, 8 + math.sin(a) * 3.2
        ln = rng.randint(3, 7); d = rng.uniform(-0.6, 0.6)
        for t in range(ln):
            cv.set(x + t * math.cos(d) * (1 if rng.random() < 0.5 else -1), y + t * math.sin(d) * 0.4, rng.choice('klmn9'))
    for t in range(8):
        cv.set(cx + 14 + t * 0.6, 4 - t * 0.5, '4'); cv.set(cx + 15 + t * 0.6, 4 - t * 0.5, '5')

# ----------------------------------------------------------------- the table
def table(cv, o):
    rng = random.Random(15)
    W, H = cv.w, cv.h
    for lx in (30, W - 30):                                        # stacked-stone legs
        for k, (yy, rx) in enumerate(((H - 8, 16), (H - 20, 14), (H - 31, 15))):
            shade(cv, ell(lx + (k % 2) * 2 - 1, yy, rx, 6.5), STONE, bias=-0.2 + k * 0.15, band=2)
    top = poly([(4, 10), (W - 4, 9), (W - 2, 20), (W - 5, 24), (5, 24), (2, 20)])
    cut_stone(cv, top, rng, bias=0.3)
    for x in range(5, W - 5): cv.set(x, 10, 's'); cv.set(x, 11, 'r')
    for x in range(6, W - 6): cv.setif(x, 23, 'o', 'pqrs')
    for k in range(6):                                            # chips out of the front edge
        x = 14 + k * 22 + rng.randint(-3, 3)
        cv.set(x, 12, 'p'); cv.set(x + 1, 12, 'q')
    # a hide runner down the middle, hanging over the front
    run = poly([(W / 2 - 22, 11), (W / 2 + 22, 11), (W / 2 + 21, 33), (W / 2 - 21, 33)])
    shade(cv, run, HIDE_L, bias=0.3, band=1)
    for x in range(int(W / 2 - 21), int(W / 2 + 22)):
        cv.set(x, 27, 'E'); cv.set(x, 28, 'F' if x % 4 < 2 else '8')
        for t in range(1 + (x % 3 == 0)): cv.set(x, 34 + t, 'l')

def stool(cv, o):
    rng = random.Random(16 + o.get('seed', 0))
    W, H = cv.w, cv.h
    cx = W / 2
    stump = poly([(cx - 10, 9), (cx + 10, 9), (cx + 11, H - 5), (cx + 15, H - 1), (cx - 15, H - 1), (cx - 11, H - 5)])
    shade(cv, stump, ['g', 'h', 'i', 'l'], bias=0.3, band=2)
    for k in range(4):
        for y in range(12, H - 3):
            if rng.random() < 0.8: cv.setif(cx - 7 + k * 5 + math.sin(y * 0.3 + k), y, 'f', 'ghi')
    top = ell(cx, 9, 10, 3)
    flat(cv, top, 'n')
    for p in edge_of(ell(cx, 9, 6, 1.8), (1, 1)): cv.set(p[0], p[1], 'l')
    rim(cv, top, 'm', (-1, -1))
    # worn smooth on top where people sit, and an axe mark in the side
    for p in ell(cx - 3, 8.6, 5, 1.4): cv.set(p[0], p[1], '$')
    for t in range(4): cv.set(cx + 4 + t, 16 + t, 'f'); cv.set(cx + 4 + t, 17 + t, 'n')

# --------------------------------------------------------- the raptor's pit
def hearth(cv, o):
    rng = random.Random(17)
    W, H = cv.w, cv.h
    # the back of the ring, seen over the front: charcoal and hot stones
    back = ell(W / 2, 26, W / 2 - 10, 7)
    shade(cv, back, ['0', '1', '2', 'y', 'z'], bias=-0.4, band=2)
    for k in range(30):
        x, y = rng.uniform(20, W - 20), rng.uniform(22, 31)
        flat(cv, ell(x, y, rng.uniform(1.5, 3), 1.4), rng.choice('yzA0'))
    for k in range(9):                                             # the far rim of stones
        x = 14 + k * (W - 28) / 8
        shade(cv, ell(x, 20 + math.sin(k * 1.3) * 1.5, 8, 4.5), STONE, bias=-0.3, band=1)
    stake(cv, o)
    if o.get('back'): return
    hearth_front(cv, o)

def hearth_front(cv, o):
    rng = random.Random(27)
    W, H = cv.w, cv.h
    # the front wall: fat stones, stacked two high
    for row, (yy, rx, ry) in enumerate(((H - 7, 11, 6.5), (H - 17, 10, 5.5))):
        off = 0 if row == 0 else 9
        for x in range(8 + off, W - 4, 20 if row == 0 else 19):
            s = ell(x + rng.uniform(-1, 1), yy + rng.uniform(-1, 1), rx + rng.uniform(-1, 1.5), ry)
            shade(cv, s, STONE, bias=0.1 + rng.uniform(-0.4, 0.3), band=2)
            for p in s:                                            # soot up the inside faces
                if p[1] < yy - ry * 0.3 and rng.random() < 0.3: cv.set(p[0], p[1], rng.choice('op'))

def stake(cv, o):
    W, H = cv.w, cv.h
    # the stake he is chained to
    stake = poly([(5, 2), (10, 2), (10, H - 4), (5, H - 4)])
    shade(cv, stake, WOOD, band=1)
    for p in ell(7.5, 1, 3, 2): cv.set(p[0], p[1], 'k')
    for k in range(3):
        flat(cv, ell(13 + k * 4, 12 + k, 2.2, 1.6), '4'); flat(cv, ell(13 + k * 4, 12 + k, 1, 0.6), '1')

def woodpile(cv, o):
    W, H = cv.w, cv.h
    ends = [(9, H - 7), (22, H - 7), (35, H - 7), (15, H - 18), (28, H - 18), (21, H - 29)]
    for (x, y) in ends:
        s = disc(x, y, 6.5)
        flat(cv, s, 'h')
        for p in outline_set(s): cv.set(p[0], p[1], 'f')
        for p in edge_of(disc(x, y, 6.5), (-1, -1)): cv.set(p[0], p[1], 'g')
        flat(cv, disc(x - 0.5, y - 0.5, 4.2), 'n')
        for p in edge_of(disc(x, y, 2.6), (1, 1)): cv.set(p[0], p[1], 'l')
        cv.set(x, y, 'l')
        for p in edge_of(disc(x, y, 4.2), (1, 1)): cv.set(p[0], p[1], 'm')

def club(cv, o):
    W, H = cv.w, cv.h
    shade(cv, limb([(4, H - 3, 2.2), (W * 0.45, H * 0.5, 3.2), (W - 7, 8, 6.5), (W - 6, 5, 5)], 8), WOOD, bias=0.1, band=2)
    for (x, y) in ((W - 10, 6), (W - 4, 10), (W - 8, 13), (W - 3, 4)):        # knots
        cv.set(x, y, 'j'); cv.set(x + 1, y, 'n')
    for t in range(5): cv.set(8 + t, H - 8 - t, 'j')                         # a grip, bound in hide

def pot(cv, o):
    W, H = cv.w, cv.h
    cx = W / 2
    body = set()
    for y in range(4, H - 1):
        t = (y - 4) / (H - 5)
        hw = (W / 2 - 1) * (0.55 + math.sin(min(1, t) * math.pi * 0.92) * 0.48)
        for x in range(int(cx - hw), int(cx + hw) + 1): body.add((x, y))
    shade(cv, body, CLAY, bias=0.2, band=2)
    for y in range(int(H * 0.46), int(H * 0.46) + 2):
        for x in range(W): cv.setif(x, y, '$' if (x // 2) % 2 else '0', 'yzAB')
    for x in range(int(cx - W * 0.28), int(cx + W * 0.28) + 1): cv.set(x, 3, 'z'); cv.set(x, 4, 'y')
    flat(cv, ell(cx, 3, W * 0.26, 1.2), '0')

def skull(cv, o):
    W, H = cv.w, cv.h
    shade(cv, ell(W / 2, H * 0.45, W * 0.44, H * 0.4) | ell(W * 0.62, H * 0.72, W * 0.3, H * 0.24), BONE, bias=0.3, band=1)
    flat(cv, ell(W * 0.38, H * 0.45, 1.8, 2), '0'); flat(cv, ell(W * 0.66, H * 0.45, 1.8, 2), '0')
    for x in range(int(W * 0.44), int(W * 0.86), 2): cv.set(x, H - 3, '0')

# ------------------------------------------------------- the lights, unlit
def lamp(cv, o):
    W, H = cv.w, cv.h
    cx = W / 2
    for (x0, x1) in ((cx - 9, cx), (cx + 9, cx), (cx - 2, cx)):   # the hangers
        line(cv, x0, 13, x1, 0, 'k')
    bowl = set(p for p in ell(cx, 14, 11, 9) if p[1] >= 13)
    shade(cv, bowl, ['V', 'W', 'X', '$'], bias=0.3, band=2)
    for k in range(-8, 9, 3):                                      # the ribs of the shell
        for t in range(9): cv.setif(cx + k * (1 - t / 12), 14 + t, 'V', 'WX$')
    for x in range(int(cx - 10), int(cx + 11)): cv.set(x, 13, 'U'); cv.set(x, 14, 'X')
    flat(cv, ell(cx, 12, 7, 1.5), 'Y')                             # the oil
    cv.set(cx, 10, '0'); cv.set(cx, 11, '0')                       # the wick

def torch(cv, o):
    W, H = cv.w, cv.h
    cx = W / 2
    stick = poly([(cx - 2.5, 12), (cx + 2.5, 12), (cx + 2, H - 2), (cx - 2, H - 2)])
    shade(cv, stick, WOOD, band=1)
    head = ell(cx, 9, 5, 6)
    shade(cv, head, ['0', 'f', 'g', 'y'], bias=-0.2, band=1)
    for y in (11, 13, 15): 
        for x in range(int(cx - 5), int(cx + 6)): cv.setif(x, y, 'l', 'fgyhijklm0')
    # the bracket: a wedge of stone jammed in the wall, and a lashing
    br = poly([(cx - 7, 30), (cx + 7, 30), (cx + 4, 38), (cx - 4, 38)])
    shade(cv, br, STONE, band=1)
    for y in (31, 33, 35): cv.set(cx - 3, y, 'k'); cv.set(cx + 3, y, 'k')

def candle(cv, o):
    W, H = cv.w, cv.h
    cx = W / 2
    wax = poly([(cx - 2.5, 5), (cx + 2.5, 4), (cx + 3, H - 3), (cx - 3, H - 3)])
    shade(cv, wax, ['@', '#', '$', '7'], bias=0.4, band=1)
    for (x, y) in ((cx + 2, 7), (cx + 2, 8), (cx - 2, 10), (cx - 2, 11), (cx - 2, 12)): cv.set(x, y, '#')
    flat(cv, ell(cx, H - 2, 6, 2), 'p'); rim(cv, ell(cx, H - 2, 6, 2), 'r', (0, -1))
    cv.set(cx, 3, '0'); cv.set(cx, 2, '0')

# ------------------------------------------------------- employee of the week
def plaque(cv, o):
    W, H = cv.w, cv.h
    frame = poly([(2, 10), (W - 3, 10), (W - 3, H - 3), (2, H - 3)])
    shade(cv, frame, WOOD, bias=0.1, band=2)
    for (x, y) in ((4, 12), (W - 6, 12), (4, H - 6), (W - 6, H - 6)):   # lashed corners
        for d in range(-2, 3): cv.set(x + d, y + d, 'j'); cv.set(x + d, y - d, 'j')
    panel = poly([(8, 16), (W - 9, 16), (W - 9, H - 9), (8, H - 9)])
    shade(cv, panel, ['3', '4', '5', '6', '6'], bias=0.6, band=1, dither=0.3)
    for p in edge_of(panel, (-1, -1)): cv.set(p[0], p[1], '2')
    for p in edge_of(panel, (1, 1)): cv.set(p[0], p[1], '6')
    line(cv, W / 2 - 16, 10, W / 2, 1, 'k'); line(cv, W / 2 + 16, 10, W / 2, 1, 'k')   # the cord
    flat(cv, disc(W / 2, 1, 2), 'p')
    # a gold star, because he earned it
    sx, sy = W - 16, H - 20
    for a in range(10):
        r = 7 if a % 2 == 0 else 3
        ang = -math.pi / 2 + a * math.pi / 5
    pts = [(sx + math.cos(-math.pi / 2 + a * math.pi / 5) * (7 if a % 2 == 0 else 3), sy + math.sin(-math.pi / 2 + a * math.pi / 5) * (7 if a % 2 == 0 else 3)) for a in range(10)]
    shade(cv, poly(pts), ['Y', 'Z', '8', '9'], bias=0.4, band=1)

# ------------------------------------------------------------ the shower
def shower(cv, o):
    rng = random.Random(18)
    W, H = cv.w, cv.h
    for px in (10, W - 12):                                        # two posts
        post = poly([(px - 3.5, 14), (px + 3.5, 14), (px + 4, H - 6), (px - 4, H - 6)])
        shade(cv, post, BARK, band=1)
        for y in range(18, H - 8, 5): cv.setif(px - 1 + (y % 2), y, 'f', 'ghi')
    beam = poly([(2, 12), (W - 2, 11), (W - 2, 19), (2, 20)])
    shade(cv, beam, BARK, bias=0.2, band=1)
    for (px) in (10, W - 12):                                      # lashings
        for y in (12, 14, 16, 18):
            for x in range(px - 5, px + 6): cv.setif(x, y + (x % 2), 'l', 'fghi')
    # a leaf curtain on the left, hung off the beam
    for k in range(9):
        x0 = 15 + k * 4.2
        ln = rng.randint(56, 74)
        leaf = limb([(x0, 20, 2.4), (x0 + 1, 20 + ln * 0.5, 3.0), (x0 - 1, 20 + ln, 1.4)], 8)
        shade(cv, leaf, LEAF, bias=0.1 + (k % 2) * 0.3, band=1)
        for t in range(0, ln, 3): cv.setif(x0 + 1 - t / ln * 2, 22 + t, 'u', 'vwx')
    # the towel, a hide over the beam at the right
    tw = poly([(W - 38, 18), (W - 18, 18), (W - 17, 52), (W - 22, 49), (W - 27, 53), (W - 32, 49), (W - 37, 52)])
    shade(cv, tw, HIDE_L, bias=0.3, band=1)
    # the stone the bather stands on, and the bucket of nuts Trunks is paid in
    base = ell(W / 2, H - 5, W / 2 - 8, 4)
    cut_stone(cv, base, rng)
    bk = poly([(W - 30, H - 22), (W - 12, H - 22), (W - 14, H - 7), (W - 28, H - 7)])
    shade(cv, bk, WOOD, bias=0.2, band=1)
    for y in (H - 18, H - 11): 
        for x in range(W - 30, W - 11): cv.setif(x, y, 'j', 'klmn')
    for k in range(9): flat(cv, disc(W - 27 + (k % 4) * 4.5, H - 24 - (k // 4) * 3, 2), rng.choice('hig'))

# --------------------------------------------------------------- the car
# In two halves, so whoever drives it sits down inside the log: the back half
# (canopy, poles, the seat back, the luggage) goes under the driver and the
# front half (the log's near side, the wheels, the skull) goes over.
def cart_back(cv, o):
    rng = random.Random(19)
    W, H = cv.w, cv.h
    # the far side of the hollow log
    back = poly([(8, 44), (W - 16, 43), (W - 13, 50), (8, 50)])
    shade(cv, back, ['f', 'g', 'h', 'k'], bias=-0.3, band=1)
    for x in range(10, W - 16): cv.set(x, 44, 'l'); cv.set(x, 45, 'k')
    # the seat back, lashed to the log, with a fur over it
    sb = poly([(16, 22), (28, 20), (30, 48), (17, 48)])
    shade(cv, sb, BARK, bias=0.1, band=1)
    fur = poly([(14, 20), (30, 18), (31, 30), (27, 34), (23, 31), (18, 34), (14, 30)])
    shade(cv, fur, ['@', '#', '$', '7'], bias=0.3, band=1)
    for (x, y) in ((18, 24), (25, 22), (21, 29), (27, 28)): flat(cv, ell(x, y, 1.6, 1), 'h')
    # the luggage: a sack and the club, strapped on behind
    sack = ell(8, 38, 8, 8) | ell(6, 31, 4, 3)
    shade(cv, sack, HIDE, bias=0.2, band=1)
    for t in range(6): cv.set(3 + t, 30 + (t % 2), 'j')
    shade(cv, limb([(4, 48, 1.6), (10, 30, 2.2), (14, 20, 3.6)], 6), WOOD, band=1)
    # the canopy: a striped hide on two poles, well above the driver's head
    for px in (18, 82):
        line(cv, px, 46, px + 1, 5, 'g'); line(cv, px + 1, 46, px + 2, 5, 'h')
    can = poly([(10, 1), (88, 0), (90, 5), (84, 8), (76, 5), (68, 8), (60, 5), (52, 8), (44, 5), (36, 8), (28, 5), (20, 8), (10, 6)])
    shade(cv, can, ['E', 'F', 'G', 'X'], bias=0.2, band=1)
    for x in range(12, 88, 6):
        for y in range(1, 6): cv.setif(x, y, '$', 'EFG')

def cart_front(cv, o):
    rng = random.Random(29)
    W, H = cv.w, cv.h
    turn = o.get('frame', 0)
    # the near side of the log, up to the driver's middle
    log = poly([(6, 47), (W - 15, 46), (W - 11, 52), (W - 15, 60), (6, 61), (3, 54)])
    shade(cv, log, WOOD, bias=0.1, band=2)
    for x in range(8, W - 15): cv.set(x, 47, 'n')
    for k in range(10):
        x = 10 + k * 8.5
        for y in range(50, 60): cv.setif(x + math.sin(y) * 0.8, y, 'k', 'lmn')
    flat(cv, ell(5, 54, 3, 6.5), 'n')                                 # the sawn end, with rings
    for p in edge_of(ell(5, 54, 1.8, 4), (1, 1)): cv.set(p[0], p[1], 'l')
    for k in range(3):                                                # lashings round the log
        x = 30 + k * 22
        for y in range(47, 61): cv.setif(x + (y % 2), y, 'j', 'klmn')
    # a bone for a steering stick, where the driver's hands are
    line(cv, 62, 49, 67, 36, '#'); line(cv, 63, 49, 68, 36, '@')
    flat(cv, ell(68, 35, 4, 1.6), '$')
    # the skull on the front, horns and all
    sk = ell(W - 10, 46, 9, 8)
    shade(cv, sk, BONE, bias=0.3, band=2)
    flat(cv, ell(W - 12, 45, 2.2, 2.4), '0'); flat(cv, ell(W - 6, 45, 2, 2.2), '0')
    for x in range(W - 15, W - 4, 2): cv.set(x, 51, '0'); cv.set(x + 1, 52, '$')
    for (x, y) in ((W - 17, 38), (W - 3, 38)):
        shade(cv, limb([(x, y + 3, 1.8), (x + (x > W - 10) * 2 - 1, y - 3, 0.8)], 4), BONE, band=1)
    # stone wheels, turning: the notches and the chips go round
    for wx in (25, W - 26):
        cy = H - 15
        s = disc(wx, cy, 14)
        shade(cv, s, STONE, bias=0.1, band=2)
        for p in outline_set(s): cv.set(p[0], p[1], 'o')
        flat(cv, disc(wx, cy, 4.5), 'p'); flat(cv, disc(wx - 1, cy - 1, 2.6), 'r')
        flat(cv, disc(wx, cy, 1.4), '0')
        for k in range(3):
            a = turn * math.pi / 6 + k * math.tau / 3
            for r in range(7, 13): cv.set(wx + math.cos(a) * r, cy + math.sin(a) * r, 'p')
            cv.set(wx + math.cos(a + 0.25) * 10, cy + math.sin(a + 0.25) * 10, 's')

# ------------------------------------------------------ the rock shelves
def ledge(cv, o):
    rng = random.Random(20 + o.get('seed', 0))
    W, H = cv.w, cv.h
    # the column holding it up: two stacks of boulders
    for sx in (W * 0.26, W * 0.72):
        y = H - 3
        k = 0
        while y > 16:
            rx = rng.uniform(10, 14); ry = rng.uniform(5, 8)
            shade(cv, ell(sx + rng.uniform(-2, 2), y - ry, rx, ry), STONE, bias=-0.35 + rng.uniform(-0.2, 0.2), band=2)
            y -= ry * 1.6; k += 1
    # the shelf: a thick slab, a lit top, a ragged underside
    pts = [(2, 5), (W * 0.3, 3), (W * 0.7, 3), (W - 3, 5), (W - 1, 12)]
    for x in range(int(W - 4), 3, -6): pts.append((x, 17 + rng.uniform(0, 5)))
    pts.append((1, 13))
    s = poly(pts)
    cut_stone(cv, s, rng, bias=0.35, marks=0.03)
    for p in s:
        if p[1] in (3, 4, 5) and (p[0], p[1] - 1) not in s: cv.set(p[0], p[1] + 1, 'r')
    # straw on it, and a bit of moss
    for k in range(int(W / 5)):
        x = rng.uniform(4, W - 4)
        for t in range(rng.randint(2, 5)): cv.set(x + t, 3 + (t % 2) - (1 if rng.random() < 0.3 else 0), rng.choice('mn9'))

def build():
    OUT = {}
    def add(name, w, h, drawer, frames=None):
        rows = []
        for o in frames or [{}]:
            cv = Cv(w, h); drawer(cv, dict(o)); rows.append(cv.rows())
        OUT[name] = rows
    add('h_bed', 156, 66, bed)
    add('h_drum', 54, 50, drum)
    add('h_rug', 160, 14, rug)
    add('h_perch', 60, 66, perch)
    add('h_table', 146, 62, table)
    add('h_stool', 34, 30, stool)
    add('h_stool2', 34, 30, stool, [dict(seed=5)])
    add('h_hearth', 132, 50, hearth, [dict(back=True)])
    add('h_hearth_front', 132, 50, hearth_front)
    add('h_club', 22, 40, club)
    add('h_pot', 18, 18, pot)
    add('h_skull', 14, 11, skull)
    add('h_woodpile', 44, 36, woodpile)
    add('h_lamp', 24, 26, lamp)
    add('h_torch', 16, 50, torch)
    add('h_candle', 14, 20, candle)
    add('h_plaque', 110, 94, plaque)
    add('h_shower', 112, 120, shower)
    add('h_cart', 104, 80, cart_back)
    add('h_cart_front', 104, 80, cart_front, [dict(frame=i) for i in range(4)])
    add('h_ledge_a', 118, 52, ledge, [dict(seed=1)])
    add('h_ledge_b', 132, 72, ledge, [dict(seed=2)])
    add('h_ledge_c', 122, 56, ledge, [dict(seed=3)])
    return OUT

if __name__ == '__main__':
    for k, v in build().items(): print(k, len(v), len(v[0][0]), len(v[0]))
