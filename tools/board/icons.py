"""Icons for the board game: what is painted on each tile, the charms you
carry, the new artifacts and the soak status. Small, bold, lit from the
upper left like everything else, and outlined in ink by the engine."""
import sys, os, math, random
D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(D, '..', 'beasts'))
from pxlib import *

RED = ['D', 'E', 'F', 'G']
BERRY = ['D', 'E', 'F', 'G', 'X']
GREEN = ['t', 'u', 'v', 'w', 'x']
BONE = ['!', '@', '#', '$']
WOOD = ['j', 'k', 'l', 'm', 'n']
STONE = ['o', 'p', 'q', 'r', 's']
PURP = ['Q', 'R', 'S', 'T']
GOLD = ['Y', 'Z', '8', '9']
FIRE = ['y', 'z', 'A', 'B', 'C']
BLUE = ['H', 'I', 'J', 'K', 'L']
TEAL = ['M', 'N', 'O', 'P']
PINK = ['U', 'V', 'W', 'X']
SKIN = ['a', 'b', 'c', 'd', 'e']
HAIR = ['f', 'g', 'h', 'i']
GREY = ['1', '2', '3', '4', '5', '6']
ROAST = ['y', 'z', 'k', 'l', 'A', 'B']


def rot_pts(pts, cx, cy, a):
    c, s = math.cos(a), math.sin(a)
    return [(cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c) for (x, y) in pts]


def tell(cv, pts, ch):
    for p in pts: cv.set(p[0], p[1], ch)


# ================================================================ tile icons
def ti_berries():
    cv = Cv(18, 18)
    leaf1 = poly(rot_pts([(9, 1), (13, 3), (14, 6), (10, 5)], 11, 4, 0))
    leaf2 = poly([(8, 2), (4, 1), (2, 4), (6, 5)])
    shade(cv, leaf1 | leaf2, GREEN, band=1)
    tell(cv, [(9, 3), (10, 4), (7, 3), (6, 3)], 't')
    for (x, y, r) in [(5.5, 10.5, 3.6), (12, 11.5, 3.6), (8.5, 6.8, 3.2)]:
        s = disc(x, y, r)
        shade(cv, s, BERRY, bias=0.2, band=1)
        cv.set(int(x - r * 0.4), int(y - r * 0.45), '$')
    return cv


def ti_meat():
    cv = Cv(18, 18)
    bone = limb([(10.5, 10.5, 1.4), (15, 15, 1.4)], n=6)
    knob = disc(15.5, 14, 1.8) | disc(14, 15.8, 1.8)
    shade(cv, bone | knob, BONE, band=1)
    meat = set()
    for p in ell(7.5, 7.5, 6.2, 5.2):
        meat.add(p)
    meat = set(rot_pts_int(meat, 7.5, 7.5, -0.7))
    shade(cv, meat, ROAST, bias=0.3, band=2)
    # char marks and a shine
    for (x, y) in [(5, 6), (6, 5), (8, 9), (9, 8), (4, 9)]: cv.set(x, y, 'y')
    tell(cv, [(4, 4), (5, 3), (6, 3)], 'C')
    return cv


def rot_pts_int(s, cx, cy, a):
    out = set()
    c, sn = math.cos(a), math.sin(a)
    xs = [p[0] for p in s]; ys = [p[1] for p in s]
    for y in range(min(ys) - 4, max(ys) + 5):
        for x in range(min(xs) - 4, max(xs) + 5):
            ox = cx + (x - cx) * c + (y - cy) * sn
            oy = cy - (x - cx) * sn + (y - cy) * c
            if (int(round(ox)), int(round(oy))) in s: out.add((x, y))
    return out


def ti_gem():
    cv = Cv(18, 18)
    outer = poly([(9, 0), (15, 5), (12, 17), (6, 17), (2, 5)])
    left = poly([(9, 0), (6, 5), (6, 17), (2, 5)]) & outer
    mid = poly([(9, 0), (12, 5), (11, 17), (6, 17), (6, 5)]) & outer
    right = outer - left - mid
    flat(cv, right, 'R'); flat(cv, mid, 'S'); flat(cv, left, 'T')
    for p in poly([(6, 5), (12, 5), (11, 6), (7, 6)]): cv.set(p[0], p[1], 'T')
    tell(cv, [(4, 5), (5, 4), (6, 3), (7, 2)], '7')
    tell(cv, [(8, 9), (8, 10)], '7')
    return cv


def ti_card():
    cv = Cv(18, 18)
    slab = poly([(3, 2), (14, 1), (15, 16), (2, 17)])
    shade(cv, slab, STONE, bias=0.4, band=1)
    # a little mammoth, painted in ochre
    m = ell(8.5, 9, 4, 2.6) | disc(12, 8, 1.8)
    flat(cv, m, 'z')
    tell(cv, [(6, 11), (6, 12), (9, 11), (9, 12), (11, 11), (11, 12), (13, 9), (14, 10), (14, 11)], 'z')
    tell(cv, [(4, 3), (5, 3), (6, 3)], '6')
    return cv


def ti_charm():
    cv = Cv(18, 18)
    bag = disc(9, 11, 5.8) | poly([(6, 5), (12, 5), (13, 8), (5, 8)])
    shade(cv, bag, WOOD, bias=0.3, band=2)
    tell(cv, [(5, 6), (6, 6), (7, 6), (8, 6), (9, 6), (10, 6), (11, 6), (12, 6)], 'Y')
    tell(cv, [(8, 5), (9, 4), (10, 4), (11, 3)], '8')
    # a charm tooth dangling off the tie
    tooth = poly([(12, 7), (14, 7), (13, 11)])
    shade(cv, tooth, BONE, band=1)
    tell(cv, [(6, 10), (7, 9)], 'n')
    return cv


def ti_trap():
    cv = Cv(18, 18)
    pit = ell(9, 15, 8, 2.6)
    flat(cv, pit, '1')
    for (x, h) in [(3, 10), (7, 14), (11, 12), (15, 9)]:
        st = poly([(x - 1.8, 16), (x + 1.8, 16), (x, 16 - h)])
        shade(cv, st, WOOD, band=1)
        cv.set(x, 16 - h, 'G'); cv.set(x, 17 - h, 'F')
    return cv


def ti_rocks():
    cv = Cv(18, 18)
    for (x, y, r) in [(5, 12, 4), (12, 13, 3.5), (9, 6, 3.2)]:
        s = disc(x, y, r)
        shade(cv, s, STONE, bias=0.2, band=1)
    for (x, y) in [(3, 2), (3, 3), (14, 3), (14, 4), (15, 7)]: cv.set(x, y, '6')
    return cv


def ti_tar():
    cv = Cv(18, 18)
    blob = ell(9, 12, 8, 5) | disc(7, 8, 3.5) | disc(12, 9, 2.6)
    shade(cv, blob, ['0', '1', '2', '3'], bias=-0.3, band=1)
    for (x, y) in [(5, 7), (11, 8)]: cv.set(x, y, '5')
    ring = disc(13, 4, 2.2) - disc(13, 4, 1.1)
    flat(cv, ring, '3')
    return cv


def ti_battle():
    cv = Cv(18, 18)
    for sgn in (1, -1):
        x0, x1 = (3, 14) if sgn > 0 else (14, 3)
        club = limb([(x0, 16, 1.2), ((x0 + x1) / 2, 9, 1.6), (x1, 3, 2.8)], n=8)
        shade(cv, club, WOOD, band=1)
        k = disc(x1, 3, 2.6)
        shade(cv, k, STONE, band=1)
    return cv


def ti_dino():
    cv = Cv(18, 18)
    skull = ell(8, 8, 7, 5) | poly([(9, 8), (17, 7), (17, 12), (9, 13)])
    shade(cv, skull, BONE, bias=0.2, band=1)
    eye = disc(6, 7, 1.8)
    flat(cv, eye, '0'); cv.set(6, 7, 'F')
    for x in range(10, 17, 2): cv.set(x, 13, '$'); cv.set(x, 14, '#')
    tell(cv, [(11, 12), (12, 12), (13, 12), (14, 12), (15, 12), (16, 12)], '1')
    tell(cv, [(13, 9), (14, 9)], '!')
    return cv


def ti_npc():
    cv = Cv(18, 18)
    head = disc(7, 9, 5.2)
    shade(cv, head, SKIN, bias=0.3, band=2)
    hair = set(p for p in disc(7, 7.5, 5.8) if p[1] <= 6) | disc(3, 9, 1.6)
    shade(cv, hair, HAIR, band=1)
    cv.set(8, 9, '0'); cv.set(5, 9, '0')
    tell(cv, [(5, 12), (6, 12), (7, 12), (8, 12)], 'a')
    bub = ell(14, 5, 3.6, 3)
    flat(cv, bub, '7')
    tell(cv, [(13, 5), (15, 5)], '2'); cv.set(11, 8, '7')
    return cv


def ti_choice():
    cv = Cv(18, 18)
    pole = poly([(8, 3), (10, 3), (10, 17), (8, 17)])
    shade(cv, pole, WOOD, band=1)
    a = poly([(1, 5), (4, 2), (9, 2), (9, 8), (4, 8)])
    b = poly([(17, 10), (14, 7), (9, 7), (9, 13), (14, 13)])
    shade(cv, a, ['k', 'l', 'm', 'n'], band=1)
    shade(cv, b, ['k', 'l', 'm', 'n'], band=1)
    tell(cv, [(4, 5), (5, 5), (6, 5), (7, 5)], 'j')
    tell(cv, [(11, 10), (12, 10), (13, 10), (14, 10)], 'j')
    return cv


def ti_event():
    cv = Cv(18, 18)
    q = limb([(4.5, 6, 2.2), (6, 2.5, 2.2), (10, 1.5, 2.2), (13.5, 4, 2.2), (12.5, 8, 2.2), (9, 10, 2.0), (9, 12, 2.0)], n=8)
    dot = disc(9, 16, 2)
    shade(cv, q | dot, PURP, bias=0.6, band=1)
    tell(cv, [(5, 3), (6, 2), (7, 1)], '7')
    return cv


def ti_cave():
    cv = Cv(18, 18)
    rock = ell(9, 11, 8.6, 7.4) | poly([(0, 17), (18, 17), (17, 11), (1, 11)])
    shade(cv, rock, STONE, bias=0.1, band=1)
    mouth = set(p for p in ell(9, 12.5, 4.8, 5.8) if p[1] <= 17)
    flat(cv, mouth, '0')
    for p in mouth:
        if p[1] < 10: cv.set(p[0], p[1], '1')
    cv.set(8, 13, '9'); cv.set(10, 13, '9')
    return cv


def ti_secret():
    cv = Cv(18, 18)
    for (cx, cy, r) in [(9, 9, 7), (3, 3, 2.5), (15, 14, 2.5)]:
        star = set()
        for i in range(-int(r), int(r) + 1):
            star.add((cx + i, cy)); star.add((cx, cy + i))
        for i in range(-int(r * 0.5), int(r * 0.5) + 1):
            star.add((cx + i, cy + i)); star.add((cx + i, cy - i))
        flat(cv, star, '9')
        cv.set(cx, cy, '7')
    for p in disc(9, 9, 2): cv.set(p[0], p[1], '8')
    cv.set(9, 9, '7')
    return cv


def ti_camp():
    cv = Cv(18, 18)
    logs = limb([(2, 16, 1.6), (16, 12, 1.6)], n=6) | limb([(2, 12, 1.6), (16, 16, 1.6)], n=6)
    shade(cv, logs, WOOD, band=1)
    f = flame_px(9, 13.5, 12, 4.6, sway=0.8, wob=0.8, phase=1.3)
    paint_fire(cv, f, boost=0.12)
    return cv


def ti_trader():
    cv = Cv(18, 18)
    sack = disc(9, 11, 6.2) | poly([(5, 5), (13, 5), (14, 9), (4, 9)])
    shade(cv, sack, ['j', 'k', 'l', 'm', 'n'], bias=0.2, band=2)
    tell(cv, [(4, 7), (5, 7), (6, 7), (7, 7), (8, 7), (9, 7), (10, 7), (11, 7), (12, 7), (13, 7)], 'Y')
    g = poly([(9, 0), (12, 3), (9, 6), (6, 3)])
    flat(cv, g, 'S'); tell(cv, [(8, 2), (9, 1), (7, 3)], 'T')
    # a tusk tucked in the sack
    tusk = limb([(12, 9, 1.2), (15, 6, 1.0), (16, 3, 0.6)], n=6)
    shade(cv, tusk, BONE, band=1)
    return cv


def ti_altar():
    cv = Cv(18, 18)
    block = poly([(3, 11), (15, 11), (14, 17), (4, 17)])
    top = poly([(1, 9), (17, 9), (16, 11), (2, 11)])
    shade(cv, block, STONE, bias=-0.2, band=1)
    shade(cv, top, STONE, bias=0.4, band=1)
    for x in (6, 9, 12): cv.set(x, 14, 'S')
    g = poly([(9, 0), (12, 3.5), (9, 7), (6, 3.5)])
    flat(cv, g, 'S'); tell(cv, [(8, 2), (9, 1), (7, 3)], 'T'); cv.set(10, 4, 'R')
    return cv


def ti_vine():
    cv = Cv(18, 18)
    v = polyline([(3, 0), (5, 5), (4, 9), (7, 13), (12, 15), (16, 14)], r=1.1)
    shade(cv, v, ['t', 'u', 'v'], band=1)
    for (x, y, a) in [(6, 4, 0.5), (3, 9, -0.4), (9, 13, 0.3)]:
        lf = ell(x + 2, y, 2.4, 1.3)
        shade(cv, lf, GREEN[1:], band=1)
    arr = poly([(13, 11), (17, 14), (13, 17)])
    flat(cv, arr, '9')
    return cv


def ti_geyser():
    cv = Cv(18, 18)
    rock = ell(9, 15, 7, 3)
    shade(cv, rock, STONE, band=1)
    jet = poly([(7, 14), (11, 14), (12, 3), (6, 3)])
    shade(cv, jet, BLUE[2:] + ['7'], bias=0.6, band=1)
    for (x, y, r) in [(6, 3, 2.6), (12, 3, 2.6), (9, 1.5, 2.4)]:
        s = disc(x, y, r)
        shade(cv, s, ['5', '6', '7'], bias=0.5, band=1)
    return cv


def ti_totem():
    cv = Cv(18, 18)
    body = poly([(5, 3), (13, 3), (13, 17), (5, 17)])
    shade(cv, body, WOOD, band=1)
    for y in (7, 12): tell(cv, [(x, y) for x in range(5, 14)], 'j')
    for (x, y) in [(7, 5), (11, 5), (7, 9), (11, 9), (7, 14), (11, 14)]: cv.set(x, y, '0')
    tell(cv, [(8, 11), (9, 11), (10, 11)], 'F')
    wings = poly([(1, 4), (5, 3), (5, 6)]) | poly([(17, 4), (13, 3), (13, 6)])
    shade(cv, wings, GOLD, band=1)
    top = poly([(6, 3), (9, 0), (12, 3)])
    flat(cv, top, '9')
    return cv


def ti_boss():
    cv = Cv(18, 18)
    horns = limb([(4, 6, 1.6), (1.5, 3, 1.1), (1, 0, 0.6)], n=6) | limb([(14, 6, 1.6), (16.5, 3, 1.1), (17, 0, 0.6)], n=6)
    shade(cv, horns, BONE, band=1)
    skull = disc(9, 8, 6.2) | poly([(5, 11), (13, 11), (12, 17), (6, 17)])
    shade(cv, skull, BONE, bias=0.3, band=2)
    for cx in (6.5, 11.5):
        e = disc(cx, 8.5, 1.9)
        flat(cv, e, '0')
        cv.set(int(cx), 8, 'G')
    tell(cv, [(8, 11), (9, 12), (10, 11)], '1')
    for x in range(6, 13, 2): cv.set(x, 15, '1')
    return cv


def ti_home():
    cv = Cv(18, 18)
    dome = set(p for p in ell(9, 13, 8.4, 9) if p[1] <= 17)
    shade(cv, dome, STONE, bias=0.2, band=1)
    door = set(p for p in ell(9, 15, 3, 4.2) if p[1] <= 17)
    flat(cv, door, '0')
    for p in door:
        if p[1] >= 15: cv.set(p[0], p[1], 'A' if (p[0] + p[1]) % 2 else 'B')
    tell(cv, [(13, 2), (14, 1), (13, 0)], '5')
    return cv


def ti_sign():
    cv = Cv(18, 18)
    pole = poly([(8, 4), (10, 4), (10, 17), (8, 17)])
    shade(cv, pole, WOOD, band=1)
    b = poly([(2, 2), (15, 2), (17, 5), (15, 8), (2, 8)])
    shade(cv, b, ['k', 'l', 'm', 'n'], band=1)
    return cv


# ================================================================== charms
def ch_knuckle():
    cv = Cv(20, 20)
    s = limb([(4, 10, 3.2), (10, 9, 2.4), (16, 10, 3.2)], n=8) | disc(4, 7, 2.4) | disc(16, 13, 2.4)
    shade(cv, s, BONE, bias=0.3, band=2)
    tell(cv, [(9, 11), (10, 11), (11, 11)], '!')
    return cv


def die_face(cv, x0, y0, n, sz=8):
    s = poly([(x0, y0), (x0 + sz, y0), (x0 + sz, y0 + sz), (x0, y0 + sz)])
    shade(cv, s, BONE, bias=0.5, band=1)
    side = poly([(x0 + sz, y0), (x0 + sz + 2, y0 + 2), (x0 + sz + 2, y0 + sz + 2), (x0 + sz, y0 + sz)])
    flat(cv, side, '!')
    bot = poly([(x0, y0 + sz), (x0 + sz, y0 + sz), (x0 + sz + 2, y0 + sz + 2), (x0 + 2, y0 + sz + 2)])
    flat(cv, bot, '@')
    pips = {1: [(4, 4)], 2: [(2, 2), (6, 6)], 3: [(2, 2), (4, 4), (6, 6)], 5: [(2, 2), (6, 2), (4, 4), (2, 6), (6, 6)], 6: [(2, 2), (6, 2), (2, 4), (6, 4), (2, 6), (6, 6)]}[n]
    for (px, py) in pips: cv.set(x0 + px, y0 + py, '0')


def ch_twin():
    cv = Cv(20, 20)
    die_face(cv, 1, 2, 5)
    die_face(cv, 9, 8, 3)
    return cv


def ch_feather():
    cv = Cv(20, 20)
    vane = set()
    for i in range(18):
        t = i / 17.0
        cx, cy = 3 + t * 14, 17 - t * 15
        w = math.sin(t * math.pi) * 4.2 + 0.5
        for p in ell(cx, cy, w * 0.7, w * 0.7): vane.add(p)
    shade(cv, vane, TEAL + ['7'], bias=0.3, band=1)
    for i in range(3, 17, 3):
        cv.set(2 + i, 17 - i + 2, 'M')
    shaft = polyline([(2, 19), (17, 2)], r=0.5)
    flat(cv, shaft, '$')
    tell(cv, [(14, 3), (15, 4), (12, 5)], 'X')
    return cv


def ch_pebble():
    cv = Cv(20, 20)
    s = ell(10, 11, 8, 7)
    shade(cv, s, ['o', 'p', 'q', 'r', 's'], bias=0.0, band=2)
    band = set(p for p in s if abs(p[1] - (11 + (p[0] - 10) * 0.2)) < 1.1)
    flat(cv, band, 'Y')
    tell(cv, [(6, 6), (7, 5), (8, 5)], '6')
    return cv


def ch_nudge():
    cv = Cv(20, 20)
    stick = limb([(3, 17, 1.4), (12, 8, 1.2), (16, 4, 1.0)], n=8)
    shade(cv, stick, WOOD, band=1)
    fork = limb([(12, 8, 1.0), (13, 3, 0.8)], n=4)
    shade(cv, fork, WOOD, band=1)
    for (x, y, c) in [(4, 4, '9'), (3, 4, '9'), (5, 4, '9'), (4, 3, '9'), (4, 5, '9'), (15, 15, '9'), (14, 15, '9'), (16, 15, '9')]:
        cv.set(x, y, c)
    return cv


def ch_rattle():
    cv = Cv(20, 20)
    gourd = disc(11, 8, 6.4) | disc(8, 12, 4)
    shade(cv, gourd, ['z', 'A', 'B', 'C'], bias=0.2, band=2)
    handle = limb([(7, 13, 1.4), (3, 18, 1.2)], n=5)
    shade(cv, handle, WOOD, band=1)
    for (x, y) in [(10, 6), (13, 9), (11, 11), (14, 6)]: cv.set(x, y, 'y')
    tell(cv, [(16, 3), (17, 2), (18, 4)], '7')
    return cv


def ch_smoke():
    cv = Cv(20, 20)
    bag = disc(9, 14, 5) | poly([(6, 9), (12, 9), (13, 12), (5, 12)])
    shade(cv, bag, ['1', '2', '3', '4'], bias=0.2, band=1)
    tell(cv, [(6, 10), (7, 10), (8, 10), (9, 10), (10, 10), (11, 10), (12, 10)], 'k')
    puffs = disc(11, 5, 3) | disc(15, 3, 2.6) | disc(7, 3, 2.2)
    shade(cv, puffs, ['4', '5', '6', '7'], bias=0.5, band=1)
    return cv


def ch_moss():
    cv = Cv(20, 20)
    s = disc(10, 12, 7) | disc(6, 9, 4) | disc(14, 8, 4.4)
    shade(cv, s, GREEN, bias=0.2, band=2)
    rng = random.Random(3)
    for p in sorted(s):
        if rng.random() < 0.12: cv.set(p[0], p[1], 't')
    tell(cv, [(8, 5), (9, 4), (14, 4)], 'x')
    return cv


def ch_map():
    cv = Cv(20, 20)
    s = poly([(2, 4), (8, 2), (18, 5), (17, 16), (9, 18), (1, 15)])
    shade(cv, s, ['!', '@', '#', 'n'], bias=0.3, band=1)
    for (x, y) in [(4, 13), (6, 11), (8, 10), (10, 11), (12, 9), (13, 7)]: cv.set(x, y, 'F')
    for d in (-1, 0, 1):
        cv.set(15 + d, 6 + d, 'E'); cv.set(15 + d, 6 - d, 'E')
    return cv


def ch_honey():
    cv = Cv(20, 20)
    s = ell(10, 10, 7, 6.2) | limb([(12, 14, 1.6), (12, 18, 1.2)], n=4)
    shade(cv, s, ['z', 'A', 'B', 'C'], bias=0.2, band=2)
    tell(cv, [(6, 6), (7, 5), (8, 5), (6, 7)], '9')
    cv.set(7, 6, '7')
    return cv


# =============================================================== artifacts
def relic_rib_axe():
    cv = Cv(22, 22)
    neck = limb([(4, 19, 1.4), (15, 6, 1.2)], n=8)
    shade(cv, neck, WOOD, band=1)
    head = poly([(14, 2), (19, 1), (20, 5), (16, 7)])
    shade(cv, head, WOOD, band=1)
    body = ell(6, 16, 5.4, 4.6)
    shade(cv, body, BONE, bias=0.2, band=1)
    for i in range(-3, 4, 2):
        for y in range(12, 21):
            if (6 + i, y) in body: cv.set(6 + i, y, '!')
    tell(cv, [(3 + k, 19 - k) for k in range(0, 13, 2)], '9')
    return cv


def relic_sabre():
    cv = Cv(22, 22)
    cord = polyline([(2, 2), (6, 7), (11, 9), (16, 7), (20, 2)], r=0.6)
    flat(cv, cord, 'k')
    fang = poly([(8, 8), (14, 8), (12, 20), (11, 21)])
    shade(cv, fang, BONE, bias=0.4, band=1)
    for (x, y) in [(10, 9), (11, 9), (12, 9)]: cv.set(x, y, 'Y')
    return cv


def relic_bongos():
    cv = Cv(22, 22)
    for (x, y, r) in [(7, 12, 5.5), (15, 13, 5)]:
        sk = disc(x, y, r)
        shade(cv, sk, BONE, bias=0.2, band=1)
        top = ell(x, y - r + 2, r - 0.5, 2)
        shade(cv, top, ['k', 'l', 'm'], band=1)
        cv.set(int(x - 2), int(y + 1), '0'); cv.set(int(x + 2), int(y + 1), '0')
        cv.set(int(x), int(y + 3), '1')
    return cv


def relic_wet_feet():
    cv = Cv(22, 22)
    foot = ell(10, 14, 6, 4.6) | poly([(4, 12), (8, 4), (12, 4), (14, 12)])
    shade(cv, foot, SKIN, bias=0.2, band=2)
    for (x, y) in [(15, 11), (16, 13), (15.5, 15.5)]:
        t = disc(x, y, 1.3); flat(cv, t, 'c')
    for (x, y) in [(4, 3), (18, 5), (2, 9), (19, 17)]:
        d = poly([(x, y - 2), (x + 1.4, y + 1), (x - 1.4, y + 1)])
        flat(cv, d, 'K'); cv.set(x, y + 1, 'L')
    puddle = ell(10, 20, 9, 1.6)
    flat(cv, puddle, 'J')
    return cv


def relic_moss_boots():
    cv = Cv(22, 22)
    boot = poly([(6, 2), (13, 2), (13, 13), (19, 15), (19, 20), (4, 20), (5, 12)])
    shade(cv, boot, GREEN, bias=0.1, band=2)
    rng = random.Random(8)
    for p in sorted(boot):
        if rng.random() < 0.15: cv.set(p[0], p[1], 't')
    tell(cv, [(x, 20) for x in range(4, 20)], 'j')
    return cv


def relic_sandals():
    cv = Cv(22, 22)
    sole = ell(11, 16, 9, 3.4)
    shade(cv, sole, WOOD, band=1)
    strap = polyline([(5, 15), (9, 9), (13, 9), (17, 15)], r=1)
    flat(cv, strap, 'k')
    coal = disc(11, 16, 2.4)
    shade(cv, coal, ['y', 'z', 'A', 'B'], bias=0.5, band=1)
    f = flame_px(11, 13, 7, 2.2, sway=0.5)
    paint_fire(cv, f, boost=0.1)
    return cv


def relic_rattle():
    cv = Cv(22, 22)
    handle = limb([(4, 20, 1.2), (10, 12, 1.4)], n=5)
    shade(cv, handle, BONE, band=1)
    head = disc(13, 8, 6)
    shade(cv, head, BONE, bias=0.2, band=2)
    for (x, y) in [(11, 6), (15, 7), (13, 10), (12, 9)]: cv.set(x, y, '!')
    ring = set(p for p in disc(13, 8, 6) if 5 <= ((p[0] - 13) ** 2 + (p[1] - 8) ** 2) ** 0.5 <= 6)
    flat(cv, ring, 'l')
    return cv


def relic_crystal():
    cv = Cv(22, 22)
    for (x, h, w) in [(11, 18, 3), (6, 11, 2.4), (16, 13, 2.4)]:
        s = poly([(x - w, 20), (x + w, 20), (x + w, 20 - h + w), (x, 20 - h), (x - w, 20 - h + w)])
        shade(cv, s, PURP, bias=0.4, band=1)
        cv.set(int(x - w + 1), 20 - h + int(w) + 1, '7')
    return cv


def relic_skates():
    cv = Cv(22, 22)
    wrap = poly([(5, 4), (12, 4), (12, 11), (17, 12), (17, 15), (4, 15)])
    shade(cv, wrap, ['k', 'l', 'm', 'n'], bias=0.2, band=1)
    blade = limb([(3, 18, 1.1), (19, 18, 1.1)], n=4) | disc(19, 16.5, 1.5)
    shade(cv, blade, BONE, band=1)
    tell(cv, [(7, 15), (7, 16), (7, 17), (14, 15), (14, 16), (14, 17)], '!')
    for (x, y) in [(2, 3), (19, 5), (20, 8)]: cv.set(x, y, 'L')
    return cv


def relic_sand():
    cv = Cv(22, 22)
    bag = disc(11, 13, 7) | poly([(7, 5), (15, 5), (16, 9), (6, 9)])
    shade(cv, bag, ['l', 'm', 'n', '#'], bias=0.2, band=2)
    tell(cv, [(x, 7) for x in range(6, 17)], 'k')
    for (x, y) in [(3, 4), (4, 6), (19, 3), (18, 6), (20, 9)]: cv.set(x, y, 'B')
    return cv


def relic_dodo_foot():
    cv = Cv(22, 22)
    leg = limb([(11, 1, 1.6), (11, 12, 1.8)], n=5)
    shade(cv, leg, ['z', 'A', 'B'], band=1)
    for (x1, y1) in [(3, 19), (11, 21), (19, 19)]:
        toe = limb([(11, 12, 1.8), (x1, y1, 1.1)], n=5)
        shade(cv, toe, ['z', 'A', 'B'], band=1)
        cv.set(x1, y1, '1')
    return cv


def relic_map():
    cv = Cv(22, 22)
    s = poly([(3, 3), (19, 2), (20, 19), (2, 20)])
    shade(cv, s, STONE, bias=0.3, band=1)
    for (x, y) in [(5, 16), (7, 14), (9, 13), (11, 11), (13, 10), (15, 8)]: cv.set(x, y, 'A')
    for d in (-1, 0, 1):
        cv.set(16 + d, 6 + d, 'F'); cv.set(16 + d, 6 - d, 'F')
    tell(cv, [(4, 4), (5, 4), (6, 4)], '6')
    return cv


def relic_leaf():
    cv = Cv(22, 22)
    lf = ell(11, 11, 6.5, 9.5)
    lf = set(rot_pts_int(lf, 11, 11, 0.6))
    shade(cv, lf, GREEN, bias=0.2, band=2)
    vein = polyline([(5, 18), (16, 4)], r=0.5)
    for p in vein:
        if p in lf: cv.set(p[0], p[1], 't')
    return cv


def relic_thunder():
    cv = Cv(22, 22)
    egg = ell(11, 12, 7, 9)
    shade(cv, egg, ['H', 'I', 'J', 'K', 'L'], bias=0.3, band=2)
    bolt = polyline([(12, 3), (9, 10), (13, 11), (9, 20)], r=0.8)
    flat(cv, bolt, '9')
    for p in bolt: cv.set(p[0] + 1, p[1], 'C')
    return cv


def relic_glasses():
    cv = Cv(22, 22)
    for cx in (6, 16):
        ring = set(p for p in disc(cx, 11, 5) if ((p[0] - cx) ** 2 + (p[1] - 11) ** 2) ** 0.5 > 3.6)
        shade(cv, ring, GOLD, band=1)
        lens = disc(cx, 11, 3.5)
        flat(cv, lens, 'L')
        cv.set(cx - 1, 9, '7'); cv.set(cx - 2, 10, '7')
    tell(cv, [(10, 10), (11, 9), (12, 10)], 'Z')
    return cv


def relic_crown():
    cv = Cv(22, 22)
    s = poly([(2, 18), (20, 18), (20, 6), (16, 11), (11, 3), (6, 11), (2, 6)])
    shade(cv, s, ['0', '1', '2', '3'], bias=0.1, band=1)
    for (x, y) in [(11, 13), (6, 15), (16, 15)]:
        g = disc(x, y, 1.4); flat(cv, g, 'S'); cv.set(x, y - 1, 'T')
    for (x, l) in [(5, 3), (13, 4), (18, 2)]:
        for k in range(l): cv.set(x, 18 + k, '1')
    return cv


def relic_horace():
    cv = Cv(22, 22)
    horn = limb([(4, 20, 3.4), (9, 12, 2.6), (13, 6, 1.6), (18, 2, 0.6)], n=10)
    shade(cv, horn, BONE, bias=0.2, band=2)
    for (x, y) in [(6, 16), (8, 13), (10, 10)]: cv.set(x, y, '!')
    return cv


def relic_ember():
    cv = Cv(22, 22)
    rock = disc(11, 14, 6)
    shade(cv, rock, ['y', 'z', 'A', 'B', 'C'], bias=0.4, band=2)
    for (x, y) in [(8, 13), (12, 16), (14, 12)]: cv.set(x, y, 'y')
    f = flame_px(11, 11, 10, 3.2, sway=0.8, wob=0.6)
    paint_fire(cv, f, boost=0.15)
    return cv


def relic_frostfang():
    cv = Cv(22, 22)
    fang = poly([(6, 2), (16, 2), (12, 20), (11, 21)])
    shade(cv, fang, ['I', 'J', 'K', 'L', '7'], bias=0.4, band=1)
    for (x, y) in [(3, 5), (19, 8), (4, 14), (18, 16)]:
        cv.set(x, y, '7'); cv.set(x - 1, y, 'L'); cv.set(x + 1, y, 'L'); cv.set(x, y - 1, 'L'); cv.set(x, y + 1, 'L')
    return cv


def st_soak():
    cv = Cv(16, 16)
    d = poly([(8, 1), (12, 8), (4, 8)]) | disc(8, 10, 4.2)
    shade(cv, d, BLUE, bias=0.3, band=1)
    tell(cv, [(6, 8), (6, 9), (7, 7)], '7')
    return cv


BUILD = [ti_berries, ti_meat, ti_gem, ti_card, ti_charm, ti_trap, ti_rocks, ti_tar, ti_battle, ti_dino, ti_npc,
         ti_choice, ti_event, ti_cave, ti_secret, ti_camp, ti_trader, ti_altar, ti_vine, ti_geyser, ti_totem,
         ti_boss, ti_home, ti_sign,
         ch_knuckle, ch_twin, ch_feather, ch_pebble, ch_nudge, ch_rattle, ch_smoke, ch_moss, ch_map, ch_honey,
         relic_rib_axe, relic_sabre, relic_bongos, relic_wet_feet, relic_moss_boots, relic_sandals, relic_rattle,
         relic_crystal, relic_skates, relic_sand, relic_dodo_foot, relic_map, relic_leaf, relic_thunder,
         relic_glasses, relic_crown, relic_horace, relic_ember, relic_frostfang, st_soak]


def build():
    out = {}
    for f in BUILD:
        cv = f()
        out[f.__name__] = [cv.rows()]
    return out
