"""The combat roster, redrawn: nine comedy beasts, every one facing right.

  COMPY     a pocket raptor. Lime with bottle-green stripes, a lemon throat,
            a crest of orange quills, one enormous eye and a grin with far too
            many teeth in it.
  DODO      a feather pillow with legs. Slate blue, a banana of a beak, stub
            wings, a white curl of tail and a look of total incomprehension.
  BOAR      a barrel of bristles on four short legs, a black mohawk, a pink
            snout, a tiny furious eye and two big hooked tusks.
  RAPTOR    the one that means it. Leaf green with teal tiger stripes, an
            orange crest, feathered arms, a sickle claw on every foot, and a
            brow down over a mean yellow eye.
  PTERO     all wing. A tan body, leather wings on long finger bones, a red
            blade of a crest and a beak like a pickaxe.
  LIZARD    a lava lizard: low and long, black rock armour cracked open over
            glowing orange, a flicking tongue.
  TARBLOB   a heap of tar with two googly eyes, glossy and dripping, blowing
            bubbles.
  STEGO     a hill with a head the size of a melon: lilac hide, tall ochre
            plates, a spiked tail and a look of mild confusion.
  TRICERA   a grump: tan hide with big spots, a painted frill, three bone horns,
            a parrot beak and a scowl.

Built from shaded parts with a seam wherever a part lies over another, like
the family; the engine grows the outer ink. Walk cycles are phase-driven, so
every foot plants and lifts properly, and idles breathe.
"""
import sys, os, math, random
D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(D, '..', 'beasts'))
from pxlib import *
from blaze import dilate

TAU = math.pi * 2
lerp = lambda a, b, t: a + (b - a) * t
BONE = ['!', '@', '#', '$']
INK = '0'


class Fig:
    def __init__(s, w, h):
        s.w, s.h = w, h
        s.cv = Cv(w, h)
        s.solid = set()

    def clip(s, pts):
        return set(p for p in pts if 0 <= p[0] < s.w and 0 <= p[1] < s.h)

    def put(s, pts, ramp, bias=0.0, band=2, grad=True, seam=True, line=None):
        pts = s.clip(pts)
        if not pts: return pts
        shade(s.cv, pts, ramp, bias=bias, band=band, grad=grad)
        if seam:
            ln = line or ramp[0]
            for (x, y) in pts:
                for (dx, dy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    q = (x + dx, y + dy)
                    if q in s.solid and q not in pts:
                        s.cv.set(x, y, ln); break
        s.solid |= pts
        return pts

    def flat(s, pts, ch, solid=True):
        pts = s.clip(pts)
        for p in pts: s.cv.set(p[0], p[1], ch)
        if solid: s.solid |= pts
        return pts

    def dot(s, x, y, ch):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < s.w and 0 <= y < s.h: s.cv.set(x, y, ch)

    def over(s, x, y, ch):
        x, y = int(round(x)), int(round(y))
        if (x, y) in s.solid: s.cv.set(x, y, ch)

    def rows(s): return s.cv.rows()


def cap(a, b, ra, rb):
    n = max(6, int(math.ceil(math.hypot(b[0] - a[0], b[1] - a[1]) / max(0.8, min(ra, rb)))))
    return limb([(a[0], a[1], ra), (b[0], b[1], rb)], n=n)


def chain(pts):
    n = 10
    return limb([(p[0], p[1], p[2]) for p in pts], n=n)


def eye(f, x, y, r, look=(1, 0), lid=0.0, brow=None, iris=None, ry=None):
    """a cartoon eye: a white, an iris, a pupil and a catchlight; lid closes
    from the top (0..1); brow is (angle, colour) for a line over it"""
    ry = ry or r
    white = ell(x, y, r, ry)
    f.flat(white, '$')
    for p in edge_of(white, (1, 1)): f.cv.set(p[0], p[1], '6')
    px, py = x + look[0] * r * 0.38, y + look[1] * ry * 0.3
    if iris:
        f.flat(ell(px, py, r * 0.62, ry * 0.7) & white, iris)
    f.flat(ell(px, py, max(1, r * 0.4), max(1, ry * 0.5)) & white, INK)
    f.dot(px - r * 0.25, py - ry * 0.3, '7')
    if lid > 0:
        cut = y - ry + lid * ry * 2
        for p in white:
            if p[1] < cut: f.cv.set(p[0], p[1], f.lidc if hasattr(f, 'lidc') else '3')
        for p in white:
            if abs(p[1] - int(cut)) < 1: f.cv.set(p[0], p[1], INK)
    if brow:
        ang, col = brow
        for i in range(-int(r) - 1, int(r) + 2):
            bx = x + i
            by = y - ry - 1.5 + i * ang
            f.dot(bx, by, col); f.dot(bx, by - 1, col)


def claws(f, x, y, n=3, dx=2.2, ln=2, up=0):
    for i in range(n):
        cx = x + i * dx
        for k in range(ln + 1): f.dot(cx + k * 0.7, y - k * 0.4 + up, '#' if k < ln else '$')


def walk_foot(p, off, stride, lift):
    a = (p + off) * TAU
    return math.cos(a) * stride, max(0.0, math.sin(a)) * lift


def speck(f, pts, ch, dens, rng):
    for p in sorted(pts):
        if rng.random() < dens: f.cv.set(p[0], p[1], ch)


# ================================================================ RAPTOR
RAP = ['t', 'u', 'v', 'w', 'x']
RAPB = ['t', 't', 'u', 'v', 'w']
TEAL = ['M', 'N', 'O']
CREST = ['z', 'A', 'B', 'C']
BELLY_Y = ['Y', 'Z', '8', '9']


def raptor(p=0.0, walk=False, breath=0.0):
    W, H = 96, 72
    f = Fig(W, H)
    gy = H - 2
    bob = (abs(math.sin(p * TAU)) * 2.2 if walk else breath * 1.2)
    hipx, hipy = 38, 33 - bob
    painted = set()

    def leg(off, ramp, near):
        if walk: dx, lift = walk_foot(p, off, 12, 7)
        else: dx, lift = (-4, 0) if not near else (5, 0)
        hx, hy = hipx + (3 if near else 0), hipy + 3
        ball = (hx + 4 + dx, gy - 2 - lift)
        ank = (ball[0] - 5, gy - 11 - lift)
        knee = (hx + 8 + dx * 0.35, hy + 10 - lift * 0.4)
        f.put(cap((hx, hy), knee, 7.4, 4.6), ramp, bias=0.4)
        f.put(cap(knee, ank, 3.8, 2.6), ramp, bias=0.0)
        f.put(cap(ank, ball, 2.5, 2.0), ramp, bias=-0.2, band=1)
        f.put(cap(ball, (ball[0] + 6, gy - lift), 1.9, 1.2), ramp, band=1)
        # the sickle claw, cocked up off the ground
        for k, (sx, sy) in enumerate([(0, -1), (0, -2), (-1, -3), (-1, -4), (0, -5)]):
            f.dot(ball[0] + 1 + sx, gy - lift + sy, '$' if k == 4 else '#')
        claws(f, ball[0] + 5, gy - lift, 2, 2.2, 1)
    leg(0.5, RAPB, False)
    sw = math.sin(p * TAU + 1) * 3 if walk else math.sin(breath * TAU) * 1.2
    tail = f.put(chain([(hipx - 3, hipy - 3, 8), (hipx - 17, hipy - 7 + sw * 0.4, 5.6), (hipx - 30, hipy - 11 + sw, 3.4), (hipx - 38, hipy - 14 + sw * 1.5, 1.2)]), RAP, bias=0.25)
    body = f.put(ell(hipx + 7, hipy - 4, 16, 11) | ell(hipx + 18, hipy - 10, 10, 9), RAP, bias=0.35)
    painted |= tail | body
    # a pale belly along the underside
    bel = set(q for q in (tail | body) if q[1] > hipy - 1 - (hipx - q[0]) * 0.28 + 2)
    shade(f.cv, bel, ['v', 'w', 'x', '9'], bias=0.4, band=1)
    # neck, head
    hx, hy = hipx + 32, hipy - 23 - bob * 0.5
    neck = f.put(cap((hipx + 21, hipy - 12), (hx - 3, hy + 3), 7, 5.2), RAP, bias=0.35)
    painted |= neck
    head = f.put(ell(hx + 2, hy, 8.5, 7) | ell(hx + 11, hy + 2.5, 8.5, 4.6), RAP, bias=0.55)
    # heavy brow ridge, darker, over the eye
    br = ell(hx + 3, hy - 4.5, 6, 2.2)
    shade(f.cv, br & head, ['u', 'v', 'w'], bias=0.2, band=1)
    jaw = f.put(ell(hx + 10, hy + 7, 8.5, 2.6), RAPB, bias=0.1, band=1)
    for x in range(int(hx + 3), int(hx + 20)):
        f.dot(x, hy + 5, 'D')
        if x % 2 == 0: f.dot(x, hy + 4, '$'); f.dot(x, hy + 6, '#')
    f.dot(hx + 18, hy + 0.5, '0'); f.dot(hx + 19, hy + 0.5, 'u')
    for i, (qx, qy, ln) in enumerate([(hx - 3, hy - 5, 8), (hx, hy - 7, 9), (hx + 3, hy - 7, 6), (hx - 6, hy - 2, 7)]):
        f.put(cap((qx, qy), (qx - ln * 0.75, qy - ln * 0.75 + (i % 2)), 1.7, 0.7), CREST, bias=0.35, band=1)
    eye(f, hx + 4, hy - 1, 2.9, look=(1, 0.2), iris='9', brow=(0.4, 't'))
    # teal tiger stripes, over the back and down the tail, drawn last
    for i in range(8):
        x0 = hipx - 30 + i * 7.2
        for k in range(10):
            for w in (0, 1):
                q = (int(round(x0 + k * 0.5)) + w, int(round(hipy - 17 + k + (hipx - x0) * 0.3)))
                if q in painted and q not in bel: f.cv.set(q[0], q[1], ('M' if k > 5 else 't') if w else ('N' if k < 6 else 'M'))
    # the arms: feathered, claws out
    sh = (hipx + 21, hipy - 7)
    el = (sh[0] + 5, sh[1] + 6 - (math.sin(p * TAU) * 1.5 if walk else 0))
    wr = (el[0] + 6, el[1] - 1)
    f.put(cap(sh, el, 3.0, 2.3), RAPB, bias=0.3)
    f.put(cap(el, wr, 2.1, 1.7), RAPB, bias=0.2, band=1)
    for k in range(4): f.dot(el[0] - 1 - k * 0.8, el[1] + 2 + k, CREST[1 + k % 2])
    claws(f, wr[0] + 1, wr[1] + 1, 3, 1.4, 1)
    leg(0.0, RAP, True)
    return f


# ================================================================= COMPY
def compy(p=0.0, walk=False, breath=0.0):
    W, H = 58, 42
    f = Fig(W, H)
    gy = H - 2
    bob = abs(math.sin(p * TAU)) * 1.6 if walk else breath
    hipx, hipy = 24, 25 - bob

    def leg(off, ramp, near):
        dx, lift = walk_foot(p, off, 6, 4) if walk else ((-2, 0) if not near else (2, 0))
        hx, hy = hipx + (0 if near else 2), hipy + 1
        ank = (hx + 1 + dx, gy - 5 - lift)
        knee = (hx + 6 + dx * 0.4, hy + 6 - lift * 0.3)
        f.put(cap((hx, hy), knee, 4.2, 2.8), ramp, bias=0.3)
        f.put(cap(knee, ank, 2.2, 1.4), ramp, bias=-0.1)
        f.put(cap(ank, (ank[0] + 4, gy - lift), 1.4, 1.1), ramp, band=1)
        claws(f, ank[0] + 3, gy - lift, 2, 1.8, 1)
    leg(0.5, RAPB, False)
    sw = math.sin(p * TAU) * 2 if walk else math.sin(breath * TAU)
    f.put(chain([(hipx - 1, hipy - 1, 4.6), (hipx - 10, hipy - 3 + sw * 0.5, 3.2), (hipx - 19, hipy - 6 + sw, 1.8), (hipx - 23, hipy - 8 + sw * 1.3, 0.9)]), RAP, bias=0.25)
    b = f.put(ell(hipx + 4, hipy - 3, 9.5, 7), RAP, bias=0.4)
    shade(f.cv, set(q for q in ell(hipx + 7, hipy + 0.5, 7.5, 3.8) if q in b), BELLY_Y, bias=0.3, band=1)
    for i in range(4):
        for k in range(5):
            q = (int(hipx - 4 + i * 4 + k * 0.4), int(hipy - 9 + k))
            if q in b: f.cv.set(q[0], q[1], 'u')
    hx, hy = hipx + 17, hipy - 13 - bob * 0.4
    f.put(cap((hipx + 10, hipy - 6), (hx - 3, hy + 2), 4.2, 3.4), RAP, bias=0.3)
    f.put(ell(hx + 2, hy, 6.8, 5.8) | ell(hx + 8, hy + 2, 5.2, 3.4), RAP, bias=0.5)
    # the grin
    for x in range(int(hx + 1), int(hx + 13)):
        f.dot(x, hy + 3 + (1 if x > hx + 9 else 0), '0')
        if x % 2: f.dot(x, hy + 4 + (1 if x > hx + 9 else 0), '$')
    f.dot(hx + 12, hy, '0')
    for i, (qx, qy, ln) in enumerate([(hx - 2, hy - 5, 5), (hx + 1, hy - 5.5, 6), (hx - 4, hy - 3, 4)]):
        f.put(cap((qx, qy), (qx - ln * 0.6, qy - ln * 0.8), 1.2, 0.6), CREST, bias=0.3, band=1)
    # one enormous eye
    eye(f, hx + 2.5, hy - 1.5, 3.2, look=(0.8, 0.1))
    sh = (hipx + 10, hipy - 3)
    f.put(cap(sh, (sh[0] + 4, sh[1] + 3), 1.5, 1.1), RAPB, band=1)
    claws(f, sh[0] + 4, sh[1] + 4, 2, 1.3, 1)
    leg(0.0, RAP, True)
    return f


# ================================================================== DODO
DODO = ['H', 'I', '3', '4', '5']
DODOB = ['H', 'H', 'I', '3', '4']
BEAK = ['Z', '8', '9']
BEAKT = ['z', 'A', 'B']
LEGO = ['z', 'A', 'B']


def dodo(p=0.0, walk=False, breath=0.0):
    W, H = 56, 54
    f = Fig(W, H)
    gy = H - 2
    bob = abs(math.sin(p * TAU)) * 2 if walk else breath * 1.3
    cx, cy = 26, 31 - bob

    def leg(off, near):
        dx, lift = walk_foot(p, off, 5, 4) if walk else ((-2, 0) if not near else (2, 0))
        hx = cx + (4 if near else -1)
        top = (hx, cy + 10)
        ank = (hx + dx, gy - 3 - lift)
        f.put(cap(top, ank, 2.0, 1.6), LEGO if near else ['y', 'z', 'A'], bias=0.2, band=1)
        toes = cap((ank[0] - 3, gy - lift), (ank[0] + 5, gy - lift), 1.2, 1.2)
        f.put(toes, LEGO if near else ['y', 'z', 'A'], band=1)
    leg(0.5, False)
    # the tail curl
    for i, a in enumerate([2.3, 2.7, 3.1]):
        q = cap((cx - 13, cy - 2), (cx - 13 + math.cos(a) * 8, cy - 2 - math.sin(a) * 8 - i), 2.2, 1.2)
        f.put(q, ['5', '6', '7'], bias=0.4, band=1)
    body = ell(cx, cy, 16, 13.5)
    b = f.put(body, DODO, bias=0.3)
    # feather scallops on the chest and back
    for y in range(int(cy - 8), int(cy + 12), 4):
        for x in range(int(cx - 12), int(cx + 14), 5):
            ox = 2 if (y // 4) % 2 else 0
            for k in range(3):
                q = (x + ox + k, y + (1 if k == 1 else 0))
                if q in b: f.cv.set(q[0], q[1], 'I' if y > cy else '3')
    # the stub wing
    w = f.put(ell(cx - 2, cy - 1 + (math.sin(p * TAU * 2) * 1 if walk else 0), 8, 6), DODOB, bias=0.4)
    for i in range(3): f.dot(cx - 7 + i * 3, cy + 4, 'H')
    # the head and neck
    hx, hy = cx + 10, cy - 16 - bob * 0.3
    f.put(ell(hx - 1, hy + 6, 6, 7), DODO, bias=0.4)
    f.put(ell(hx, hy, 7.5, 7), DODO, bias=0.6)
    # the banana beak, hooked at the end
    beak = ell(hx + 9, hy + 2, 7, 4.2) | ell(hx + 14, hy + 4, 3, 3.2)
    bk = f.put(beak, BEAK, bias=0.4)
    for q in bk:
        if q[1] >= hy + 4 and q[0] < hx + 13: f.cv.set(q[0], q[1], BEAKT[1])
    for x in range(int(hx + 3), int(hx + 15)): f.dot(x, hy + 3.5, 'z')
    f.dot(hx + 10, hy, 'Y')
    # a dopey half-lidded eye, looking nowhere in particular
    f.lidc = '3'
    eye(f, hx + 1, hy - 1, 3, look=(-0.2, 0.3), lid=0.45 + (0.5 if breath > 0.9 else 0))
    leg(0.0, True)
    return f


# ================================================================== BOAR
BOAR = ['f', 'g', 'h', 'i', 'm']
BOARB = ['f', 'f', 'g', 'h', 'i']
BRIS = ['0', 'f', 'g']
SNOUT = ['V', 'W', 'X']


def boar(p=0.0, walk=False, breath=0.0):
    W, H = 84, 56
    f = Fig(W, H)
    rng = random.Random(3)
    gy = H - 2
    bob = abs(math.sin(p * TAU * 2)) * 1.2 if walk else breath
    cx, cy = 38, 30 - bob

    def leg(x, off, ramp):
        dx, lift = walk_foot(p, off, 5, 4) if walk else (0, 0)
        top = (x, cy + 6)
        hoof = (x + dx, gy - 2 - lift)
        f.put(cap(top, hoof, 4.6, 3.0), ramp, bias=0.2)
        f.flat(ell(hoof[0] + 1, gy - 1 - lift, 3.2, 1.6), '0')
    leg(cx - 16, 0.5, BOARB); leg(cx + 12, 0.0, BOARB)
    # the tail, a corkscrew
    for k in range(6): f.dot(cx - 25 - k * 0.6, cy - 6 + math.sin(k * 1.4) * 1.5, 'g')
    body = ell(cx, cy, 25, 15) | ell(cx + 14, cy + 1, 14, 13)
    b = f.put(body, BOAR, bias=0.1)
    # bristles all over, and a black mohawk down the spine
    for q in sorted(b):
        if rng.random() < 0.18: f.cv.set(q[0], q[1], rng.choice(['f', 'g', 'i']))
    for i in range(22):
        x = cx - 22 + i * 2.1
        top = cy - 15 + (abs(x - cx - 2) / 25) ** 2 * 6
        ln = 4 + (i % 3)
        for k in range(ln): f.dot(x - k * 0.35, top - k + 1, '0' if k > 1 else 'f')
    # the head: low and heavy, with a pink snout
    hx, hy = cx + 28, cy + 3
    f.put(ell(hx - 2, hy, 11, 10), BOAR, bias=0.3)
    sn = f.put(ell(hx + 8, hy + 3, 5, 5.5), SNOUT, bias=0.3, band=1)
    f.dot(hx + 9, hy + 2, 'U'); f.dot(hx + 9, hy + 5, 'U')
    # the ear, and the tiny furious eye
    f.put(cap((hx - 6, hy - 8), (hx - 10, hy - 14), 3.0, 1.2), BOARB, bias=0.4, band=1)
    eye(f, hx + 1, hy - 3, 2.4, look=(1, 0), iris='F', brow=(0.6, '0'))
    leg(cx - 11, 0.0, BOAR); leg(cx + 17, 0.5, BOAR)
    # the tusks, hooked up past the snout, over everything
    for side in (0, 1):
        t = chain([(hx + 3 + side * 3, hy + 8, 2.2), (hx + 10 + side * 3, hy + 7, 1.8), (hx + 13 + side * 3, hy + 1, 1.2), (hx + 12 + side * 3, hy - 3, 0.6)])
        f.put(t, BONE if side else ['!', '@', '#'], bias=0.6, band=1)
    return f


# ================================================================= PTERO
PT = ['i', 'l', 'm', 'n']
PTB = ['h', 'i', 'l', 'm']
MEMB = ['E', 'F', 'G']
MEMBD = ['D', 'E', 'F']


def ptero(k=0):
    """k: 0 wings up, 1 level, 2 down"""
    W, H = 104, 62
    f = Fig(W, H)
    cx, cy = 50, 32 + [2, 0, -2][k]
    lift = [-20, -4, 14][k]
    # far wing
    def wing(dy, ramp, sx=1.0):
        sh = (cx - 2, cy - 3)
        el = (cx - 20 * sx, cy - 8 + dy * 0.6)
        tip = (cx - 44 * sx, cy - 4 + dy)
        mem = poly([sh, el, tip, (cx - 30 * sx, cy + 6 + dy * 0.4), (cx - 10, cy + 6)])
        m = f.put(mem, ramp, bias=0.1, band=1)
        for (a, bb) in ((sh, el), (el, tip)): f.put(cap(a, bb, 1.8, 1.2), PTB, bias=0.4, band=1)
        for i in range(3):                     # the finger bones through the leather
            q = (lerp(el[0], tip[0], 0.3 + i * 0.25), lerp(el[1], tip[1], 0.3 + i * 0.25))
            for j in range(6): f.over(q[0] + j * 0.5, q[1] + j, MEMB[0])
    wing(lift - 6, MEMBD, 0.85)
    # body
    b = f.put(ell(cx + 2, cy + 2, 12, 6.5), PT, bias=0.4)
    f.put(cap((cx - 9, cy + 4), (cx - 15, cy + 6), 2.2, 1.0), PT, band=1)          # tail stub
    # legs tucked
    f.put(cap((cx - 2, cy + 7), (cx - 8, cy + 11), 1.6, 1.2), PTB, band=1)
    claws(f, cx - 9, cy + 12, 2, 1.5, 1)
    # neck, head, crest, beak
    hx, hy = cx + 18, cy - 7
    f.put(cap((cx + 10, cy - 1), (hx - 2, hy + 2), 4.0, 3.0), PT, bias=0.4)
    f.put(ell(hx + 1, hy, 6, 5), PT, bias=0.6)
    f.put(poly([(hx - 3, hy - 3), (hx - 19, hy - 12), (hx - 17, hy - 9), (hx + 2, hy - 1)]), ['E', 'F', 'G'], bias=0.4, band=1)
    beak = poly([(hx + 4, hy - 2), (hx + 25, hy + 2), (hx + 25, hy + 3), (hx + 4, hy + 4)])
    f.put(beak, BEAK, bias=0.4, band=1)
    for x in range(int(hx + 5), int(hx + 24)): f.dot(x, hy + 2, 'z')
    eye(f, hx + 1, hy - 1, 2.2, look=(1, 0), brow=(0.25, 'h'))
    wing(lift, MEMB, 1.0)
    return f


# ================================================================ LIZARD
ROCK = ['0', '1', '2', '3']
LAVA = ['z', 'A', 'B', 'C']


def lizard(p=0.0, walk=False, breath=0.0, tongue=False):
    W, H = 78, 48
    f = Fig(W, H)
    rng = random.Random(11)
    gy = H - 2
    cx, cy = 36, 30 - (abs(math.sin(p * TAU * 2)) * 0.8 if walk else breath * 0.6)

    def leg(x, off, ramp, near):
        dx, lift = walk_foot(p, off, 5, 3) if walk else (0, 0)
        top = (x, cy + 3)
        el = (x + (3 if near else 1) + dx * 0.3, cy + 7 - lift * 0.2)
        ft = (x + 2 + dx, gy - 1 - lift)
        f.put(cap(top, el, 3.4, 2.6), ramp, bias=0.2)
        f.put(cap(el, ft, 2.4, 1.8), ramp, bias=0.1, band=1)
        claws(f, ft[0], gy - lift, 3, 1.8, 1)
    leg(cx - 14, 0.5, ['0', '0', '1', '2'], False); leg(cx + 12, 0.0, ['0', '0', '1', '2'], False)
    sw = math.sin(p * TAU) * 2 if walk else 0
    f.put(chain([(cx - 16, cy, 5), (cx - 28, cy + 2 + sw * 0.5, 3.4), (cx - 38, cy + 5 + sw, 1.6)]), LAVA, bias=0)
    b = f.put(ell(cx, cy, 20, 7.5), LAVA, bias=0.1)
    # black rock armour, cracked, with the glow showing through
    for i in range(7):
        x = cx - 16 + i * 5.3
        plate = ell(x, cy - 3 - (1 if i % 2 else 0), 3.2, 2.8)
        f.put(plate & b | set(q for q in plate if q[1] < cy - 2), ROCK, bias=0.4, band=1)
        for k in range(3): f.dot(x - 1 + k, cy - 7 - (i % 2) - k * 0.4, '2')
    for q in sorted(b):
        if q[1] > cy - 1 and rng.random() < 0.08: f.cv.set(q[0], q[1], 'C')
    # head, low and flat
    hx, hy = cx + 23, cy - 1
    f.put(ell(hx, hy, 8, 5.5) | ell(hx + 6, hy + 1, 5, 3.6), LAVA, bias=0.4)
    f.put(ell(hx - 1, hy - 3, 5, 2.4), ROCK, bias=0.5, band=1)
    for x in range(int(hx + 1), int(hx + 11)): f.dot(x, hy + 2.5, 'y')
    if tongue:
        for k in range(7): f.dot(hx + 11 + k, hy + 3 + (k > 4) * (k - 4) * 0.8, 'F' if k < 5 else 'G')
        f.dot(hx + 17, hy + 2, 'F')
    eye(f, hx + 1, hy - 1, 2, look=(1, 0), iris='9', brow=(0.3, '0'))
    leg(cx - 9, 0.0, ['1', '2', '3', '4'], True); leg(cx + 17, 0.5, ['1', '2', '3', '4'], True)
    return f


# =============================================================== TARBLOB
TAR = ['0', '1', 'Q', '2', 'R']


def tarblob(k=0):
    W, H = 60, 52
    f = Fig(W, H)
    gy = H - 2
    sq = [0.0, 0.12, 0.0, -0.1][k]
    cx = 29
    h = 21 * (1 - sq); w = 21 * (1 + sq * 0.8)
    cy = gy - h + 1
    body = ell(cx, cy, w, h) | ell(cx - 8, gy - 6, 12 * (1 + sq), 6) | ell(cx + 9, gy - 5, 11 * (1 + sq), 5.5)
    body = set(q for q in body if q[1] <= gy)
    b = f.put(body, TAR, bias=0.2)
    # the gloss: a hard highlight arc, like wet paint
    for a in range(0, 40):
        t = math.radians(200 + a * 1.6)
        f.over(cx + math.cos(t) * w * 0.72, cy + math.sin(t) * h * 0.72, 'S' if a % 7 else 'T')
    f.over(cx - 8, cy - 11, '7'); f.over(cx - 7, cy - 11, 'T'); f.over(cx - 9, cy - 10, 'T')
    # drips off the chin
    for (dx, ln) in ((6, 4 + k % 2), (12, 3), (-10, 2 + (k == 2))):
        for j in range(ln): f.dot(cx + dx, cy + h * 0.2 + j + 6, '1')
    # googly eyes, one a bit bigger, both looking the same wrong way
    look = [(0.8, 0), (0.6, 0.4), (0.8, -0.2), (1, 0.2)][k]
    eye(f, cx + 5, cy - 3, 5.2, look=look)
    eye(f, cx + 16, cy - 1, 4.2, look=look)
    # a bubble on top
    if k in (1, 2):
        r = 2 + k
        bb = disc(cx - 6, cy - h + 1 - r, r)
        f.flat(bb, '1'); f.dot(cx - 7, cy - h - r, 'T')
    # a wide wobbly mouth
    for x in range(int(cx + 4), int(cx + 18)): f.dot(x, cy + 6 + math.sin(x * 0.9 + k) * 0.8, 'R')
    return f


# ================================================================= STEGO
STG = ['Q', 'R', '3', '4', '5']
STGB = ['Q', 'Q', 'R', '3', '4']
PLATE = ['k', 'l', 'm', 'n', '9']


def quad_leg(f, p, walk, x, cy, gy, off, ramp, r0, r1, foot, toe='#', front=False):
    """a thick elephant leg with a bend in it and a broad foot"""
    dx, lift = walk_foot(p, off, 6, 5) if walk else (0, 0)
    top = (x, cy)
    knee = (x + (2 if front else -2) + dx * 0.5, cy + (gy - cy) * 0.5 - lift * 0.4)
    ft = (x + dx, gy - 3 - lift)
    f.put(cap(top, knee, r0, (r0 + r1) / 2), ramp, bias=0.3)
    f.put(cap(knee, ft, (r0 + r1) / 2, r1), ramp, bias=0.1)
    f.put(ell(ft[0] + 1, gy - 2 - lift, r1 + 1.4, 2.4), foot, bias=0.2, band=1)
    for i in range(3): f.dot(ft[0] - r1 + 1 + i * r1 * 0.8, gy - 1 - lift, toe)


def stego(p=0.0, walk=False, breath=0.0):
    W, H = 130, 76
    f = Fig(W, H)
    rng = random.Random(5)
    gy = H - 2
    bob = abs(math.sin(p * TAU * 2)) * 1.2 if walk else breath
    cx, cy = 62, 48 - bob
    quad_leg(f, p, walk, cx - 22, cy, gy, 0.5, STGB, 8.6, 6.4, STGB)
    quad_leg(f, p, walk, cx + 17, cy + 2, gy, 0.0, STGB, 6.8, 5.2, STGB, front=True)
    sw = math.sin(p * TAU) * 2 if walk else math.sin(breath * TAU) * 1
    f.put(chain([(cx - 24, cy - 6, 12), (cx - 40, cy - 9 + sw * 0.5, 7.5), (cx - 55, cy - 14 + sw, 4)]), STG, bias=0.2)
    tx, ty = cx - 55, cy - 14 + sw
    for (ax, ay) in ((-7, -10), (-10, -3), (-2, -12), (-6, 6)):
        f.put(cap((tx + 1, ty), (tx + ax, ty + ay), 2.4, 0.8), BONE, bias=0.5, band=1)
    for i, (dx, hgt) in enumerate(((-26, 11), (-15, 17), (-3, 22), (9, 19), (19, 14), (27, 9))):
        px = cx + dx
        base_y = cy - 18 + (abs(dx + 2) / 30) ** 2 * 6
        pl = poly([(px - 6, base_y + 5), (px - 1, base_y - hgt), (px + 5, base_y - hgt + 3), (px + 7, base_y + 5)])
        pp = f.put(pl, PLATE, bias=0.35)
        for q in sorted(pp):                               # veins in the plates
            if (q[0] - px) * 2 + (q[1] - base_y) * 0 == 0 or ((q[1] - int(base_y)) % 5 == 0 and abs(q[0] - px) < 2): f.cv.set(q[0], q[1], 'l')
    body = ell(cx, cy - 6, 32, 17) | ell(cx + 14, cy - 3, 18, 13)
    b = f.put(body, STG, bias=0.25)
    for q in sorted(b):
        if rng.random() < 0.06: f.cv.set(q[0], q[1], rng.choice(['R', '3']))
    under(f.cv, b, 'Q', depth=2)
    shade(f.cv, set(q for q in ell(cx + 4, cy + 5, 26, 6) if q in b), ['3', '4', '5', '6'], bias=0.2, band=1)
    hx, hy = cx + 42, cy + 2
    f.put(cap((cx + 26, cy - 5), (hx - 5, hy), 8.4, 6), STG, bias=0.3)
    f.put(ell(hx + 2, hy, 8.5, 6.5) | ell(hx + 9, hy + 2.5, 5.5, 4.4), STG, bias=0.5)
    for x in range(int(hx + 3), int(hx + 14)): f.dot(x, hy + 4 + (x > hx + 11), 'Q')
    f.dot(hx + 12, hy, 'Q')
    shade(f.cv, ell(hx + 6, hy + 2, 2, 1.4), ['V', 'W'], band=1)       # a pink cheek
    f.lidc = '3'
    eye(f, hx + 2, hy - 2, 2.8, look=(0.3, -0.4), lid=0.2 + (0.6 if breath > 0.9 else 0))
    quad_leg(f, p, walk, cx - 15, cy + 1, gy, 0.0, STG, 8.6, 6.4, STGB)
    quad_leg(f, p, walk, cx + 24, cy + 3, gy, 0.5, STG, 6.8, 5.2, STGB, front=True)
    return f


# ================================================================ TRICERA
TRI = ['h', 'i', 'l', 'm', 'n']
TRIB = ['g', 'h', 'i', 'l', 'm']
FRILL = ['z', 'A', 'l', 'm', 'n']


def tricera(p=0.0, walk=False, breath=0.0):
    W, H = 128, 78
    f = Fig(W, H)
    gy = H - 2
    bob = abs(math.sin(p * TAU * 2)) * 1.4 if walk else breath
    cx, cy = 52, 49 - bob
    quad_leg(f, p, walk, cx - 20, cy, gy, 0.5, TRIB, 8.8, 6.6, TRIB)
    quad_leg(f, p, walk, cx + 18, cy + 2, gy, 0.0, TRIB, 8, 6, TRIB, front=True)
    sw = math.sin(p * TAU) * 1.6 if walk else 0
    f.put(chain([(cx - 26, cy - 5, 10), (cx - 40, cy - 3 + sw, 5.4), (cx - 50, cy - 1 + sw * 1.5, 2)]), TRI, bias=0.2)
    body = ell(cx, cy - 5, 31, 17) | ell(cx + 16, cy - 3, 16, 14)
    b = f.put(body, TRI, bias=0.25)
    for (sx, sy, r) in ((-15, -10, 5), (1, -13, 4.2), (12, -7, 3.4), (-4, -3, 3), (-23, -3, 3.2), (-8, -14, 2.4)):
        shade(f.cv, set(q for q in ell(cx + sx, cy + sy, r, r * 0.75) if q in b), ['g', 'h', 'i'], bias=0.2, band=1)
    under(f.cv, b, 'g', depth=2)
    shade(f.cv, set(q for q in ell(cx + 4, cy + 6, 26, 6) if q in b), ['l', 'm', 'n'], bias=0.2, band=1)
    fx, fy = cx + 31, cy - 19
    fr = ell(fx, fy, 15.5, 17)
    f.put(fr, FRILL, bias=0.3)
    inner = ell(fx, fy, 12.5, 14)
    for q in sorted(fr - inner):
        if (q[0] + q[1]) % 3 == 0: f.cv.set(q[0], q[1], '#')
    for a0 in range(0, 360, 30):                           # knobs round the rim
        t = math.radians(a0)
        f.dot(fx + math.cos(t) * 16, fy + math.sin(t) * 17.5, '$')
    shade(f.cv, ell(fx + 1, fy - 2, 5.5, 6.5), ['E', 'F', 'G'], bias=0.3, band=1)
    shade(f.cv, ell(fx + 1.5, fy - 2, 2.2, 3), ['Y', '8', '9'], band=1)
    f.dot(fx + 1.5, fy - 2, '0')
    hx, hy = cx + 41, cy - 4
    f.put(ell(hx, hy, 12, 10) | ell(hx + 10, hy + 3, 7.5, 6.5), TRI, bias=0.45)
    f.put(poly([(hx + 13, hy - 1), (hx + 23, hy + 3), (hx + 18, hy + 10), (hx + 12, hy + 7)]), ['2', '3', '4', '5'], bias=0.4, band=1)
    for x in range(int(hx + 4), int(hx + 15)): f.dot(x, hy + 6.5, 'g')
    for (bx, by, ex, ey, r) in ((hx + 1, hy - 7, hx + 21, hy - 21, 2.8), (hx + 6, hy - 6, hx + 26, hy - 16, 2.5), (hx + 15, hy - 1, hx + 19, hy - 8, 2)):
        f.put(cap((bx, by), (ex, ey), r, 0.7), BONE, bias=0.5, band=1)
    eye(f, hx + 3, hy - 2, 3, look=(1, 0.2), iris='B', brow=(0.5, 'g'))
    quad_leg(f, p, walk, cx - 13, cy + 1, gy, 0.0, TRI, 8.8, 6.6, TRIB)
    quad_leg(f, p, walk, cx + 25, cy + 3, gy, 0.5, TRI, 8, 6, TRIB, front=True)
    return f


# ================================================================== build
def frames(fn, n, walk, **kw):
    out = []
    for i in range(n):
        if walk: out.append(fn(p=i / n, walk=True, **kw).rows())
        else: out.append(fn(breath=(0.0 if i == 0 else 1.0) if n == 2 else i / n, **kw).rows())
    return out


def build():
    return {
        'compy_idle': frames(compy, 2, False), 'compy_walk': frames(compy, 6, True),
        'dodo_idle': frames(dodo, 2, False), 'dodo_walk': frames(dodo, 6, True),
        'boar_idle': frames(boar, 2, False), 'boar_walk': frames(boar, 6, True),
        'raptor_idle': frames(raptor, 2, False), 'raptor_walk': frames(raptor, 6, True),
        'ptero_fly': [ptero(k).rows() for k in (0, 1, 2, 1)],
        'lizard_idle': [lizard().rows(), lizard(breath=1, tongue=True).rows()], 'lizard_walk': frames(lizard, 6, True),
        'tarblob_idle': [tarblob(k).rows() for k in range(4)],
        'stego_idle': frames(stego, 2, False), 'stego_walk': frames(stego, 6, True),
        'tricera_idle': frames(tricera, 2, False), 'tricera_walk': frames(tricera, 6, True),
    }


NOTES = {
    'compy': 'pocket raptor: lime with stripes, orange quills, one huge eye, too many teeth',
    'dodo': 'slate-blue feather pillow, banana beak, white tail curl, half-lidded eye',
    'boar': 'bristly barrel, black mohawk, pink snout, furious little eye, hooked tusks',
    'raptor': 'leaf green, teal stripes, orange crest, feathered arms, sickle claws, mean brow',
    'ptero': 'tan body, red leather wings on finger bones, red crest, pickaxe beak',
    'lizard': 'lava lizard: black rock plates cracked over glowing orange, flicking tongue',
    'tarblob': 'glossy heap of tar, two googly eyes, drips and bubbles',
    'stego': 'lilac hill, tall ochre plates, spiked tail, melon head, mild confusion',
    'tricera': 'tan with spots, painted frill, three bone horns, parrot beak, scowl',
}


if __name__ == '__main__':
    import json
    ROOT = os.path.abspath(os.path.join(D, '..', '..'))
    parts = build()
    out = ["'use strict';\n// art_dinos.js - GENERATED by tools/dinos/zoo.py - edit the generator, not this\n// file. Nine comedy beasts, all facing right; the engine grows the outline.\n\n"]
    for k, v in parts.items():
        body = ',\n'.join('[\n' + ',\n'.join("'%s'" % r for r in fr) + ']' for fr in v)
        out.append("SPRITES.%s = { outline: true, frames: [\n%s]};\n" % (k, body))
    open(os.path.join(ROOT, 'js2/art_dinos.js'), 'w').write('\n'.join(out))
    man = json.load(open(os.path.join(ROOT, 'js2/manifest.json')))
    for k, v in parts.items():
        man[k] = dict(w=len(v[0][0]), h=len(v[0]), frames=len(v), file='art_dinos', note=NOTES[k.split('_')[0]])
    json.dump(man, open(os.path.join(ROOT, 'js2/manifest.json'), 'w'), indent=1)
    print('wrote %d sprites' % len(parts))
