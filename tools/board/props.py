"""Two props for the opening: the roast on the table, and the privy in the yard.

h_rexhead   a whole T-Rex head, roasted: the valley tyrannosaur's own head,
            glazed brown, eye shut, a fruit in its mouth and greens round it,
            on a board. Rexford. Somebody's grandson.
h_outhouse  split logs, a thatched lid, a moon cut in the door. Frame 0 the
            door is shut; frame 1 it hangs open on a bench with a hole in it.
"""
import sys, os, math, random
D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(D, '..', 'beasts'))
from pxlib import *
from blaze import rot_xf, dilate
from trex import rex_head

WOOD = ['j', 'k', 'l', 'm', 'n']
BARK = ['f', 'g', 'h', 'i']
THATCH = ['Y', 'Z', 'm', 'n']
LEAF = ['t', 'u', 'v', 'w', 'x']
BONE = ['!', '@', '#', '$']
ROAST = {'t': 'y', 'u': 'z', 'v': 'k', 'w': 'l', 'x': 'A', '1': 'y', '0': 'f'}


def rexhead():
    cv = Cv(78, 50)
    rng = random.Random(9)
    # the board it sits on
    board = ell(39, 44, 37, 5.2)
    shade(cv, board, WOOD, bias=0.1, band=2)
    for x in range(4, 75, 9): cv.set(x, 44, 'j')
    # greens under it
    for (x, y, r) in [(10, 39, 5), (20, 41, 4), (60, 41, 5), (70, 39, 4), (35, 42, 4)]:
        shade(cv, disc(x, y, r), LEAF, bias=0.2, band=1)
    # the head: lying on its jaw, facing right, mouth ajar round a fruit
    T0 = lambda x, y: (x - 64, y + 3)
    HX = rot_xf(T0, 0.05, 92.0, 30.0, 1.36, 1.08)
    sub = Cv(78, 50)
    rex_head(sub, 1.0, HX, 0.34, rng, scar=False, paint=False, eye=False)
    for y in range(50):
        for x in range(78):
            c = sub.px[y][x]
            if c == '.': continue
            cv.set(x, y, ROAST.get(c, c))
    # glaze: hot highlights where the fat caught
    for y in range(50):
        for x in range(78):
            if sub.px[y][x] in 'wx' and rng.random() < 0.35: cv.set(x, y, 'B')
    for (x, y) in [(40, 11), (41, 11), (47, 10), (48, 10), (34, 16), (55, 13)]: cv.set(x, y, 'C')
    # the eye, shut for good
    ex, ey = HX(106.4, 19.4)
    for dx in range(-3, 4): cv.set(ex + dx, ey + (0 if abs(dx) < 2 else -1), 'f')
    # a fruit in its mouth
    fx, fy = HX(116, 34)
    fr = disc(fx + 2, fy, 4.4)
    shade(cv, fr, ['E', 'F', 'G', 'X'], bias=0.3, band=1)
    cv.set(fx + 1, fy - 2, '7')
    shade(cv, ell(fx + 2, fy - 5, 2, 1), LEAF, band=1)
    # the neck, cut, with the bone in it, at the back
    cx0, cy0 = HX(88.5, 26)
    cut = ell(cx0, cy0, 3.6, 8)
    shade(cv, cut, ['E', 'F', 'G'], bias=0.2, band=1)
    shade(cv, ell(cx0, cy0, 1.6, 2.8), BONE, band=1)
    return cv


def outhouse(open_):
    W, H = 58, 96
    cv = Cv(W, H)
    rng = random.Random(4)
    gy = H - 1
    # the step
    step = poly([(6, gy - 3), (52, gy - 3), (54, gy), (4, gy)])
    shade(cv, step, ['o', 'p', 'q', 'r'], band=1)
    # the box of split logs
    box = poly([(8, 26), (50, 26), (50, gy - 3), (8, gy - 3)])
    shade(cv, box, WOOD, bias=-0.2, band=2)
    for x in range(8, 51, 7):                                        # the logs, and the bark between them
        for y in range(26, gy - 3):
            cv.set(x, y, 'j')
            if rng.random() < 0.08: cv.set(x + 1, y, 'f')
    for x in range(8, 51):
        for yy in (30, 60):
            if rng.random() < 0.7: cv.set(x, yy, 'k')
    # the door, set in, with a moon cut out of it
    door = poly([(15, 34), (43, 34), (43, gy - 4), (15, gy - 4)])
    if not open_:
        shade(cv, door, ['k', 'l', 'm', 'n'], bias=0.1, band=1)
        for x in range(15, 44, 5):
            for y in range(34, gy - 4): cv.set(x, y, 'k')
        moon = disc(29, 44, 4.4) - disc(31, 42.5, 3.8)
        flat(cv, moon, '0')
        cv.set(28, 47, 'y')
        # the latch, a peg on a string
        cv.set(39, 62, 'Y'); cv.set(40, 62, '8'); cv.set(39, 63, 'Y')
        for (x, y) in [(40, 63), (41, 64), (41, 65)]: cv.set(x, y, 'k')
    else:
        flat(cv, door, '1')
        inside = poly([(16, 35), (42, 35), (42, gy - 5), (16, gy - 5)])
        shade(cv, inside, ['0', '1', '2'], bias=-0.4, band=1)
        bench = poly([(16, 68), (42, 68), (42, 74), (16, 74)])
        shade(cv, bench, WOOD, bias=0.2, band=1)
        hole = ell(29, 70, 5, 1.6)
        flat(cv, hole, '0')
        # a roll of big soft leaves on a hook
        roll = disc(38, 56, 3)
        shade(cv, roll, LEAF, band=1)
        # the door itself, swung out to the right and seen edge-on
        slab = poly([(43, 34), (54, 38), (54, gy - 1), (43, gy - 4)])
        shade(cv, slab, ['k', 'l', 'm', 'n'], bias=0.2, band=1)
        for (x, y) in [(47, 50), (48, 49), (49, 50), (48, 51)]: cv.set(x, y, '0')
    # the roof: thatch over a lid of branches
    roof = poly([(2, 30), (29, 6), (56, 30), (52, 33), (6, 33)])
    shade(cv, roof, THATCH, bias=0.3, band=2)
    for i in range(24):                                               # straws
        x = 4 + i * 2.2
        top = 30 - (26 - abs(x - 29)) * 0.92 if abs(x - 29) < 27 else 30
        for y in range(int(top) + 2, 33, 3): cv.set(x, y, 'Y')
    ridge = limb([(4, 31, 1.6), (29, 7, 1.8), (54, 31, 1.6)], n=8)
    shade(cv, ridge, BARK, band=1)
    # a crow's-foot of bones on the top, for luck
    bone = limb([(29, 2, 1), (29, 7, 1)], n=3) | disc(29, 1.5, 1.4)
    shade(cv, bone, BONE, band=1)
    return cv


def crumble():
    """What Grandma brings on Sundays: a clay dish of berry crumble, the jam
    boiling up through the top and down the sides, a spoon stood in it."""
    W, H = 44, 26
    cv = Cv(W, H)
    rng = random.Random(21)
    STONE = ['o', 'p', 'q', 'r', 's']
    CRUST = ['i', 'm', 'n', '8', '9']
    JAM = ['Q', 'R', 'S', 'T']
    # the spoon first, so the crumble swallows the end of it
    spoon = limb([(36, 0.5, 1.0), (31, 9, 1.2)], n=5)
    shade(cv, spoon, ['k', 'l', 'm', 'n'], bias=0.3, band=1)
    # the dish: a shallow bowl pecked out of a river stone, lipped at the rim
    bowl = poly([(3, 13), (41, 13), (37, 24), (7, 24)]) | ell(22, 13, 19.5, 2.4)
    shade(cv, bowl, STONE, bias=0.0, band=1)
    for x in range(7, 38):
        if x % 4 == 0: cv.set(x, 18, 'p'); cv.set(x + 1, 19, 'o')
    for _ in range(14):
        x = rng.randint(6, 38); y = rng.randint(15, 23)
        if (x, y) in bowl: cv.set(x, y, rng.choice(['p', 'r']))
    for x in range(8, 37): cv.set(x, 24, 'o')
    # the crumble, heaped up over the rim, lumpy
    top = set(p for p in ell(22, 12, 17.5, 8) if p[1] <= 12) | ell(22, 12.5, 17.5, 1.8)
    for (x, y, r) in [(9, 8, 2.4), (16, 5.5, 2.6), (29, 5, 2.6), (35, 8, 2.2)]:
        top |= disc(x, y, r)
    shade(cv, top, CRUST, bias=0.1, band=1)
    for _ in range(46):
        x = rng.randint(6, 38); y = rng.randint(3, 13)
        if (x, y) in top and (x + 1, y) in top:
            c = rng.choice(['n', '8', '9', 'i', 'm'])
            cv.set(x, y, c)
            if c in 'n89': cv.set(x + 1, y + 1, 'i')
    # jam boiling up through it, and running over the lip
    for (x, y, r) in [(12, 10, 2.4), (25, 8, 2.0), (33, 11, 1.8)]:
        pool = disc(x, y, r) & top
        shade(cv, pool, JAM, bias=0.1, band=1)
        rim(cv, pool, 'Q', d=(0, 1))
    for (x, y0, L) in [(8, 13, 4), (15, 14, 3), (29, 14, 5), (35, 13, 3)]:
        for k in range(L): cv.set(x, y0 + k, 'R' if k < L - 1 else 'Q')
        cv.set(x + 1, y0, 'S')
    # berries sat on top, and a sprig of leaves
    for (x, y, r) in [(18.5, 3.8, 2.5), (23.5, 4.2, 2.3), (14, 6.5, 2.1)]:
        b = disc(x, y, r)
        shade(cv, b, JAM, bias=0.35, band=1)
        rim(cv, b, 'Q', d=(1, 1))
        cv.set(x - 1, y - 1, '7'); cv.set(x, y - 1, 'T')
    shade(cv, ell(27, 2.4, 2.8, 1.3), ['u', 'v', 'w'], band=1)
    shade(cv, ell(22, 1.2, 1.8, 1), ['u', 'v', 'w'], band=1)
    return cv


def build():
    return {
        'h_crumble': [crumble().rows()],
        'h_rexhead': [rexhead().rows()],
        'h_outhouse': [outhouse(False).rows(), outhouse(True).rows()],
    }
