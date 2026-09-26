"""The Rockbottoms, redrawn - and everybody else with two legs.

Four bodies that could not be mistaken for each other at thumbnail size:

  BRONK   a barrel on legs. Enormous chest, a pot belly he is proud of, short
          thick legs in mammoth-fur boots, a black beard and one continuous
          eyebrow. One-shoulder leopard tunic, a rope belt with a bone buckle,
          a necklace of teeth. The Rib-Axe rides on his back.
  VELA    tall and straight as a spear. A tower of orange hair speared with a
          bone, bone hoop earrings, lashes and red lips. A cheetah-print
          dress with a jagged hem, a sabre-tooth pendant, sandals laced to
          the knee. Hand on hip. The Tusk Horn hangs at her side.
  PEBBLE  nine years old and nearly spherical. A bowl cut, a gap-toothed grin,
          freckles, a mammoth-fur vest three sizes too big, grubby bare feet.
          The Skull Bongos are strapped round his middle, always.
  ROXY    fifteen and all elbows. Two long braids with feathers woven in,
          blue stripes painted on her cheeks, a fur crop top and a skirt of
          leaves, a bandaged knee. Arms folded. The Bone Flute is in her belt.

Every figure is built from shaded parts - pxlib's light-from-the-upper-left
shading - with a dark seam wherever a part lies over another, so arms read
against bodies and legs against legs. The engine adds the outer ink.

Poses are dicts; clips are lists of poses. Faces face the viewer, turned a
touch to the right; the engine flips for left.
"""
import sys, os, math, random
D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(D, '..', 'beasts'))
from pxlib import *
from blaze import dilate

# ------------------------------------------------------------------ ramps
TAN = ['a', 'b', 'c', 'd']          # Bronk: outdoors all day
SKIN = ['b', 'c', 'd', 'e']         # everybody else
PALE = ['c', 'd', 'e', '$']
HAIRK = ['0', '0', 'f', 'g']        # black, with a brown sheen
HAIRO = ['z', 'A', 'B', 'C']        # Vela's orange
HAIRB = ['f', 'g', 'h', 'i']        # brown
HAIRW = ['4', '5', '6', '7']        # white
FUR = ['j', 'k', 'l', 'm', 'n']
FURD = ['f', 'j', 'k', 'l', 'm']
LEO = ['z', 'A', 'B', 'C']          # leopard ground
CHEE = ['Y', 'Z', '8', '9']         # cheetah gold
LEAF = ['t', 'u', 'v', 'w', 'x']
BONE = ['!', '@', '#', '$']
ROPE = ['k', 'l', 'm']
STONE = ['o', 'p', 'q', 'r', 's']
BLUEP = ['I', 'J', 'K', 'L']
RED = ['E', 'F', 'G']


class Fig:
    """a canvas that remembers what has been painted, so every new part can
    draw a seam where it lies over an old one"""
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
        """paint only over something already there"""
        x, y = int(round(x)), int(round(y))
        if (x, y) in s.solid: s.cv.set(x, y, ch)

    def rows(s): return s.cv.rows()


def cap(a, b, ra, rb):
    return limb([(a[0], a[1], ra), (b[0], b[1], rb)], n=6)


def chain(pts):
    return limb([(p[0], p[1], p[2]) for p in pts], n=7)


def ang_pt(o, length, deg):
    """a point `length` from o, at `deg` degrees clockwise from straight down"""
    r = math.radians(deg)
    return (o[0] - math.sin(r) * length, o[1] + math.cos(r) * length)


def spots(f, region, ch, rng, dens=0.08, size=1):
    """leopard spots: little broken rings"""
    pts = sorted(region)
    for p in pts:
        if rng.random() < dens:
            for (dx, dy) in ((0, 0), (1, 0), (0, 1)) if size else ((0, 0),):
                q = (p[0] + dx, p[1] + dy)
                if q in region: f.cv.set(q[0], q[1], ch)


def fringe(f, xs, y, ramp, rng, depth=4):
    """a torn hem of fur or hide, hanging off a straight edge"""
    out = set()
    for x in xs:
        d = rng.randint(1, depth)
        for k in range(d): out.add((x, y + k))
    return out


# ================================================================ faces
def eyes(f, lx, rx, y, style='open', lash=False, look=0):
    lx += look; rx += look
    if style in ('closed', 'shut'):
        for x0 in (lx, rx):
            f.dot(x0 - 1, y, '0'); f.dot(x0, y + 1, '0'); f.dot(x0 + 1, y, '0')
        return
    if style == 'squeeze':
        for x0, d in ((lx, 1), (rx, -1)):
            f.dot(x0 - d, y - 1, '0'); f.dot(x0, y, '0'); f.dot(x0 - d, y + 1, '0')
        return
    if style == 'half':
        for x0 in (lx, rx):
            f.dot(x0, y, '0'); f.dot(x0 + 1, y, '0')
            f.dot(x0 - 1, y - 1, '1'); f.dot(x0, y - 1, '1'); f.dot(x0 + 1, y - 1, '1')
        return
    big = style == 'wide'
    for x0 in (lx, rx):
        if big:
            for (dx, dy) in ((0, -1), (1, -1), (-1, 0), (2, 0), (-1, 1), (2, 1), (0, 2), (1, 2)): f.dot(x0 + dx, y + dy, '7')
            f.dot(x0, y, '0'); f.dot(x0 + 1, y, '0'); f.dot(x0, y + 1, '0'); f.dot(x0 + 1, y + 1, '0')
        else:
            f.dot(x0, y, '0'); f.dot(x0, y + 1, '0'); f.dot(x0 + 1, y, '0'); f.dot(x0 + 1, y + 1, '0')
            f.dot(x0, y, '7')
        if lash:
            f.dot(x0 - 1, y - 1, '0'); f.dot(x0 + 2, y - 1, '0'); f.dot(x0 + 2, y - 2, '0')


def mouth(f, cx, y, style, w=8, teeth=True, lips=None, skin_d='a'):
    """caveman mouths: a wide line with an overbite, or wide open"""
    x0, x1 = int(round(cx - w / 2)), int(round(cx + w / 2))
    if style in ('smile', 'grin', 'smirk', 'gap'):
        for x in range(x0, x1 + 1):
            curve = 1 if x in (x0, x1) else 0
            f.dot(x, y - curve, '0')
        if style in ('grin', 'gap'):
            for x in range(x0 + 1, x1):
                f.dot(x, y + 1, '0')
            for x in range(x0 + 1, x1):
                f.dot(x, y, '7')
            if style == 'gap': f.dot(cx, y, '0')
            f.dot(x0 + 1, y + 2, skin_d); f.dot(x1 - 1, y + 2, skin_d)
        elif teeth:
            # the overbite: two square teeth over the lower lip
            t = int(round(cx)) - 1
            for (dx, dy) in ((0, 1), (1, 1), (2, 1), (0, 2), (2, 2)):
                f.dot(t + dx - 1 + (dx > 1) * 1, y + dy, '7' if dy == 1 or dx != 1 else '0')
        if style == 'smirk': f.dot(x1 + 1, y - 2, '0')
    elif style in ('open', 'shout', 'o', 'chew', 'sing'):
        rx = {'open': w / 2 - 1, 'shout': w / 2, 'o': 2, 'chew': w / 2 - 1, 'sing': w / 2 - 1.5}[style]
        ry = {'open': 2.4, 'shout': 3.6, 'o': 2.2, 'chew': 1.2, 'sing': 3}[style]
        m = ell(cx, y + ry - 1, rx, ry)
        f.flat(m, '0', solid=False)
        for p in m:
            if p[1] > y + ry * 0.9 and style != 'chew': f.cv.set(p[0], p[1], 'F')
        if style in ('open', 'shout') and teeth:
            for x in range(int(cx - rx) + 1, int(cx + rx)):
                if (x, y - 1 + 1) in m: f.cv.set(x, y, '7')
        if lips:
            for p in dilate(m, 1) - m: f.over(p[0], p[1], lips)
    elif style == 'flat':
        for x in range(x0 + 1, x1): f.dot(x, y, '0')
    elif style == 'frown':
        for x in range(x0 + 1, x1): f.dot(x, y + (1 if x in (x0 + 1, x1 - 1) else 0), '0')
    if lips and style in ('smile', 'smirk', 'flat', 'frown'):
        for x in range(x0 + 1, x1): f.over(x, y + 1, lips)
        f.over(cx, y + 2, lips)


# ================================================================ BRONK
def bronk(p):
    f = Fig(66, 88)
    rng = random.Random(p.get('seed', 1))
    gy = f.h - 1
    bob = p.get('bob', 0)
    hx0 = 34 + p.get('lean', 0)
    lift = p.get('lift', (0, 0))
    # -------- instrument on the back, behind everything
    inst = p.get('inst', 'back')
    # -------- legs: short and thick, fur boots
    hipL, hipR = (hx0 - 8, 62 + bob), (hx0 + 8, 62 + bob)
    for side, hip, lf in ((-1, hipL, lift[0]), (1, hipR, lift[1])):
        knee = (hip[0] + side * 1, 71 + bob - lf * 0.5)
        ank = (hip[0] + side * 1.5, gy - 6 - lf)
        leg = cap(hip, knee, 6.8, 6) | cap(knee, ank, 6, 5.2)
        f.put(leg, TAN, bias=-0.2 if side > 0 else 0.2)
        # the boot: shaggy, wider than the leg, with a toe
        boot = ell(ank[0] + side * 0.5, ank[1] + 1, 7.2, 5.4) | ell(ank[0] + 3, gy - 1.6 - lf, 6.6, 2.6)
        bt = f.put(boot, FURD, band=1)
        for x in range(int(ank[0] - 7), int(ank[0] + 8)):
            if rng.random() < 0.6: f.over(x, ank[1] - 4 + rng.randint(0, 1), 'm')
        for q in edge_of(bt, (0, 1)):
            f.cv.set(q[0], q[1], 'f')
    # -------- the belly, and the chest on top of it
    belly = ell(hx0, 51 + bob, 17.5, 14.5)
    f.put(belly, TAN, bias=0.3, band=3)
    for x in range(int(hx0 - 2), int(hx0 + 3)):                   # the navel
        pass
    f.dot(hx0 + 1, 53 + bob, 'a'); f.dot(hx0 + 1, 54 + bob, 'b')
    for (dx, dy) in ((-6, 44), (6, 44), (-9, 50), (9, 50), (-3, 47), (4, 49)):   # chest hair
        for k in range(3): f.over(hx0 + dx + rng.randint(-1, 1), dy + bob + k * 0.7, 'a')
    chest = ell(hx0, 38 + bob, 19.5, 10.5)
    f.put(chest, TAN, bias=0.4, band=2)
    # -------- the tunic: over one shoulder, round the hips, spotted
    tun = poly([(hx0 - 20, 30 + bob), (hx0 - 12, 26 + bob), (hx0 + 18, 60 + bob), (hx0 + 18, 66 + bob), (hx0 - 18, 66 + bob), (hx0 - 18, 52 + bob)])
    tun &= dilate(belly | chest, 1) | poly([(hx0 - 20, 58 + bob), (hx0 + 20, 58 + bob), (hx0 + 20, 70 + bob), (hx0 - 20, 70 + bob)])
    hem = set()
    for x in range(int(hx0 - 19), int(hx0 + 20)):
        d = 1 + int(2.5 * abs(math.sin(x * 1.3)))
        for k in range(d): hem.add((x, 67 + bob + k))
    t = f.put(tun | hem, LEO, bias=0.2, band=2)
    spots(f, t, 'g', rng, dens=0.07)
    spots(f, t, 'y', rng, dens=0.03, size=0)
    # the rope belt, and the bone for a buckle
    belt = set((x, y) for x in range(int(hx0 - 18), int(hx0 + 19)) for y in (int(58 + bob), int(59 + bob)))
    f.put(belt & dilate(t, 1), ROPE, band=1, grad=False)
    buck = cap((hx0 - 4, 58.5 + bob), (hx0 + 4, 58.5 + bob), 1.2, 1.2) | disc(hx0 - 5, 58.5 + bob, 1.6) | disc(hx0 + 5, 58.5 + bob, 1.6)
    f.put(buck, BONE, band=1)
    # -------- arms
    arms = p.get('arms', 'hang')
    shL, shR = (hx0 - 19, 32 + bob), (hx0 + 19, 32 + bob)
    handL, handR = arm_targets(arms, shL, shR, bob, p)
    for side, sh, hand in ((-1, shL, handL), (1, shR, handR)):
        el = elbow(sh, hand, side, 13)
        a = cap(sh, el, 6.4, 5.4) | cap(el, hand, 5.4, 4.6)
        f.put(a, TAN, bias=0.1 if side < 0 else -0.2)
        # a cuff of bone beads on the wrist
        wr = (el[0] + (hand[0] - el[0]) * 0.72, el[1] + (hand[1] - el[1]) * 0.72)
        cuff = disc(wr[0], wr[1], 4.4) & a
        f.put(cuff, BONE, band=1, grad=False)
        fist = disc(hand[0], hand[1], 4.2)
        f.put(fist, TAN, bias=0.3, band=1)
        f.over(hand[0] - 1, hand[1] - 1, 'a'); f.over(hand[0] + 1, hand[1] - 1, 'a')
    held(f, p, handL, handR, rng)
    if inst == 'hands':
        rib_axe(f, hx0, bob, p.get('strum', 0))
        # the strumming hand goes back over the strings
        fist = disc(handL[0], handL[1], 4.2)
        f.put(fist, TAN, bias=0.3, band=1)
    # -------- the head: square, bearded, one eyebrow
    hy = 17 + bob + p.get('hdy', 0)
    hx = hx0 + p.get('hdx', 0)
    neck = ell(hx, 28 + bob, 8, 4)
    f.put(neck, TAN, bias=-0.6)
    head = ell(hx, hy, 11.6, 11.2) | poly([(hx - 11, hy), (hx + 11, hy), (hx + 10, hy + 10), (hx - 10, hy + 10)])
    f.put(head, TAN, bias=0.5, band=2)
    for ex in (hx - 12, hx + 12):                                     # ears
        ear = ell(ex, hy + 2, 2.4, 3.2)
        f.put(ear, TAN, bias=-0.2, band=1)
    # hair: a black mop with one bit that will not lie down
    hair = set(q for q in ell(hx, hy - 6, 12.6, 7.6) if q[1] <= hy - 4 + abs(q[0] - hx) * 0.18)
    hair |= poly([(hx - 3, hy - 13), (hx + 1, hy - 19), (hx + 3, hy - 12)])
    f.put(hair, HAIRK, bias=0.4, band=1)
    for k in range(5):
        x = hx - 10 + k * 5
        for d in range(2): f.over(x + d, hy - 4 + d, 'f')
    # the beard, curly, down over the chest
    beard = set(q for q in ell(hx, hy + 9, 12.2, 9) if q[1] >= hy + 3)
    for (bx, by) in ((-9, 16), (-4, 18), (1, 19), (6, 18), (10, 15)):
        beard |= disc(hx + bx, hy + by, 3)
    mo = p.get('mouth', 'smile')
    b = f.put(beard, HAIRK, bias=0.2, band=1)
    for q in sorted(b):
        if rng.random() < 0.14: f.cv.set(q[0], q[1], 'g')
    # the mouth, cut into the beard
    my = hy + 7
    mouth_bronk(f, hx + 1, my, mo)
    # the nose: a potato
    nose = disc(hx + 2, hy + 2, 2.6)
    f.put(nose, TAN, bias=0.2, band=1)
    f.dot(hx + 1, hy + 4, 'a'); f.dot(hx + 4, hy + 4, 'a')
    # the eyebrow: one of it
    ey = hy - 2
    br = p.get('brow', 'flat')
    for x in range(int(hx - 8), int(hx + 10)):
        yy = ey - 2 + ({'up': -1 if abs(x - hx - 1) > 3 else 0, 'angry': (1 if abs(x - hx - 1) < 3 else 0), 'flat': 0, 'sad': (1 if abs(x - hx - 1) > 5 else 0)}[br])
        f.dot(x, yy, '0'); f.dot(x, yy - 1, 'f')
    eyes(f, hx - 4, hx + 5, ey, p.get('eyes', 'open'))
    # the necklace of teeth
    for k in range(9):
        t_ = k / 8.0
        x = hx - 10 + t_ * 20; y = 30 + bob + math.sin(t_ * math.pi) * 4
        f.over(x, y, 'k')
        if k % 2 == 0:
            f.over(x, y + 1, '$'); f.over(x, y + 2, '#')
    roast(f, 1.25)
    return f


def rib_axe(f, hx0, bob, strum):
    """the Rib-Axe, held across the belly: a mammoth ribcage for a body, a
    thighbone for a neck, gut strings, and a skull on the end for tuning pegs"""
    body = ell(hx0 - 4, 52 + bob, 12, 9)
    b = f.put(body, BONE, bias=0.3, band=2)
    for i in range(-3, 4):                                            # the ribs
        x = hx0 - 4 + i * 3.2
        for y in range(int(52 + bob - 8), int(52 + bob + 9)):
            if (int(x), y) in b and abs(y - 52 - bob) > 1: f.cv.set(int(x), y, '!')
    hole = disc(hx0 - 4, 52 + bob, 3)
    f.flat(hole, '1')
    neck = cap((hx0 + 5, 47 + bob), (hx0 + 26, 22 + bob), 2, 1.6)
    f.put(neck, FURD, band=1)
    peg = disc(hx0 + 27, 20 + bob, 3.4)
    f.put(peg, BONE, band=1)
    f.dot(hx0 + 26, 20 + bob, '0'); f.dot(hx0 + 28, 20 + bob, '0')
    for k in range(3):                                               # the strings
        a, c = (hx0 - 12, 52 + bob + (k - 1) * 2), (hx0 + 25, 22 + bob + (k - 1))
        for t in range(0, 41):
            u = t / 40.0
            x, y = a[0] + (c[0] - a[0]) * u, a[1] + (c[1] - a[1]) * u + (math.sin(u * math.pi) * (strum * 0.25) if u < 0.4 else 0)
            f.dot(x, y, '9' if (t + k) % 3 else '8')


def mouth_bronk(f, cx, y, mo):
    """a hole in the beard with a mouth in it"""
    if mo in ('open', 'shout', 'o', 'chew', 'sing'):
        rx = {'open': 4, 'shout': 5, 'o': 2.2, 'chew': 4, 'sing': 3.5}[mo]
        ry = {'open': 2.6, 'shout': 4, 'o': 2.4, 'chew': 1.2, 'sing': 3.2}[mo]
        m = ell(cx, y + ry - 1, rx, ry)
        f.flat(m, '0', solid=False)
        for q in m:
            if q[1] > y + ry * 0.8 and mo != 'chew': f.cv.set(q[0], q[1], 'F')
        if mo in ('open', 'shout'):
            for x in range(int(cx - rx + 1), int(cx + rx)): f.dot(x, y, '7')
        for q in dilate(m, 1) - m: f.over(q[0], q[1], 'c')
    else:
        # a wide grin through the beard, overbite and all
        w = 6 if mo != 'flat' else 4
        for x in range(int(cx - w), int(cx + w + 1)):
            f.dot(x, y + 1, 'c')
            curve = 0 if abs(x - cx) < w - 1 else -1
            f.dot(x, y + curve, '0')
        if mo in ('smile', 'grin'):
            for (dx, dy) in ((-2, 1), (-1, 1), (1, 1), (2, 1), (-2, 2), (2, 2)):
                f.dot(cx + dx, y + dy, '7' if dy == 1 else '#')
            if mo == 'grin':
                for x in range(int(cx - w + 1), int(cx + w)): f.dot(x, y + 1, '7')


# ------------------------------------------------------------ arm helpers
def elbow(sh, hand, side, reach):
    """put the elbow out to the side, the way a bent arm goes"""
    mx, my = (sh[0] + hand[0]) / 2, (sh[1] + hand[1]) / 2
    dx, dy = hand[0] - sh[0], hand[1] - sh[1]
    L = math.hypot(dx, dy) or 1
    bend = max(0.0, reach - L / 2) * 0.9
    nx, ny = -dy / L, dx / L
    if (nx * side) < 0: nx, ny = -nx, -ny
    return (mx + nx * bend, my + ny * bend)


def arm_targets(arms, shL, shR, bob, p):
    """where the hands are, for each named arm pose"""
    sw = p.get('swing', 0)
    if arms == 'hang':
        return (shL[0] - 3 + sw, shL[1] + 24), (shR[0] + 3 - sw, shR[1] + 24)
    if arms == 'hip':                     # one on the hip, one hanging
        return (shL[0] + 3, shL[1] + 20), (shR[0] + 5, shR[1] + 20)
    if arms == 'hips':
        return (shL[0] + 4, shL[1] + 19), (shR[0] - 4, shR[1] + 19)
    if arms == 'up':                      # the shock
        return (shL[0] - 6, shL[1] - 16), (shR[0] + 6, shR[1] - 16)
    if arms == 'fold':                    # arms folded, teenager
        return (shR[0] - 4, shR[1] + 10), (shL[0] + 4, shL[1] + 11)
    if arms == 'eat':                     # a leg of something to the mouth
        return (shL[0] - 2 + sw * 0.3, shL[1] + 23), (shR[0] - 5, shR[1] - 4 + p.get('chew', 0))
    if arms == 'hurt':
        return (shL[0] - 5, shL[1] + 16), (shR[0] + 7, shR[1] + 12)
    if arms == 'axe':                     # strumming the Rib-Axe
        s = p.get('strum', 0)
        return (shL[0] + 11, shL[1] + 17 + s), (shR[0] + 6, shR[1] + 1)
    if arms == 'horn':
        return (shL[0] + 12, shL[1] + 2), (shR[0] - 2, shR[1] - 8)
    if arms == 'drum':
        a = p.get('beat', 0)
        return (shL[0] + 8, shL[1] + 18 - a * 5), (shR[0] - 8, shR[1] + 18 - (1 - a) * 5)
    if arms == 'flute':
        return (shL[0] + 12, shL[1] + 3), (shR[0] + 4, shR[1] + 1)
    if arms == 'sleep':
        return (shL[0] - 1, shL[1] + 24), (shR[0] + 1, shR[1] + 24)
    return (shL[0], shL[1] + 20), (shR[0], shR[1] + 20)


def held(f, p, handL, handR, rng):
    """things in hands; the roast leg waits for the face (see roast())"""
    f.roast_at = handR if p.get('arms') == 'eat' else None


def roast(f, big=1.0):
    """a leg of something, held up to the mouth, drawn over the face"""
    at = getattr(f, 'roast_at', None)
    if not at: return
    x, y = at
    meat = ell(x + 2 * big, y - 5 * big, 5.6 * big, 4.6 * big)
    f.put(meat, ['y', 'z', 'k', 'l', 'A', 'B'], bias=0.4, band=2)
    for (dx, dy) in ((-1, -6), (1, -4), (3, -7)): f.over(x + dx * big, y + dy * big, 'y')
    f.over(x, y - 8 * big, 'C'); f.over(x + 1, y - 8 * big, 'C')
    bone = cap((x - 1, y), (x - 4 * big, y + 5 * big), 1.4, 1.2)
    f.put(bone, BONE, band=1)
    knob = disc(x - 5 * big, y + 5.5 * big, 1.8) | disc(x - 3.5 * big, y + 7 * big, 1.6)
    f.put(knob, BONE, band=1)
    fist = disc(x - 2.4 * big, y + 2.5 * big, 3 * big)
    f.put(fist, SKIN, bias=0.3, band=1)


# ================================================================= VELA
def vela(p):
    f = Fig(54, 96)
    rng = random.Random(p.get('seed', 2))
    gy = f.h - 1
    bob = p.get('bob', 0)
    hx0 = 26 + p.get('lean', 0)
    lift = p.get('lift', (0, 0))
    # -------- the horn hangs at her side, behind the arm
    inst = p.get('inst', 'side')
    # -------- legs: long, laced sandals
    for side, lf in ((-1, lift[0]), (1, lift[1])):
        hip = (hx0 + side * 5, 62 + bob)
        knee = (hx0 + side * 5.5, 76 + bob - lf * 0.4)
        ank = (hx0 + side * 5.5, gy - 3 - lf)
        leg = cap(hip, knee, 4.6, 3.6) | cap(knee, ank, 3.6, 2.4)
        lg = f.put(leg, SKIN, bias=0.1 if side < 0 else -0.2)
        for y in range(int(knee[1]) + 2, int(ank[1]), 3):        # the laces, criss-cross
            f.over(ank[0] - 1, y, 'k'); f.over(ank[0] + 1, y + 1, 'k'); f.over(ank[0], y + 2, 'l')
        foot = ell(ank[0] + 2, gy - 1 - lf, 4, 1.8)
        f.put(foot, SKIN, band=1)
        sole = set((x, int(gy - lf)) for x in range(int(ank[0] - 2), int(ank[0] + 7)))
        f.put(sole, ['j', 'k'], band=1, grad=False)
    # -------- the dress: cheetah, fitted, jagged at the knee
    dress = poly([(hx0 - 8, 34 + bob), (hx0 + 8, 34 + bob), (hx0 + 9, 48 + bob), (hx0 + 11, 60 + bob), (hx0 + 13, 70 + bob), (hx0 - 13, 70 + bob), (hx0 - 11, 60 + bob), (hx0 - 9, 48 + bob)])
    dress |= ell(hx0, 40 + bob, 9, 6)                              # bust
    hem = set()
    for x in range(int(hx0 - 13), int(hx0 + 14)):
        d = 1 + int(3 * abs(math.sin(x * 0.9 + 1)))
        for k in range(d): hem.add((x, 70 + bob + k))
    d = f.put(dress | hem, CHEE, bias=0.2, band=2)
    spots(f, d, 'k', rng, dens=0.09)
    # a waist cinched with a hide cord
    for x in range(int(hx0 - 9), int(hx0 + 10)): f.over(x, 50 + bob, 'k')
    f.over(hx0 + 7, 51 + bob, 'k'); f.over(hx0 + 7, 52 + bob, 'k'); f.over(hx0 + 6, 53 + bob, 'j')
    # the strap over one shoulder
    strap = cap((hx0 - 6, 34 + bob), (hx0 - 8, 29 + bob), 1.2, 1.2)
    f.put(strap, CHEE, band=1)
    # -------- arms: long, one on the hip
    arms = p.get('arms', 'hip')
    shL, shR = (hx0 - 9, 31 + bob), (hx0 + 9, 31 + bob)
    handL, handR = arm_targets(arms, shL, shR, bob, p)
    if arms == 'hip': handR = (shR[0] + 2, shR[1] + 19)
    for side, sh, hand in ((-1, shL, handL), (1, shR, handR)):
        el = elbow(sh, hand, side, 15)
        a = cap(sh, el, 3.2, 2.8) | cap(el, hand, 2.8, 2.4)
        f.put(a, SKIN, bias=0.1 if side < 0 else -0.2)
        f.put(disc(hand[0], hand[1], 2.6), SKIN, bias=0.3, band=1)
        # a bangle
        f.over(el[0] + (hand[0] - el[0]) * 0.7, el[1] + (hand[1] - el[1]) * 0.7, '8')
    if inst == 'side' and arms not in ('horn',):
        horn = chain([(handL[0] - 2, handL[1] - 2, 1.4), (handL[0] - 4, handL[1] + 5, 2.2), (handL[0] - 2, handL[1] + 12, 3.2)])
        f.put(horn, BONE, bias=0.3, band=1)
        for k in (4, 8): f.over(handL[0] - 3, handL[1] + k, 'Y')
    if arms == 'horn':
        # the Tusk Horn, up at her lips and curling away up and right
        mx, my = hx0 + 5, 20 + bob
        horn = chain([(mx, my, 1.2), (mx + 6, my - 1, 2), (mx + 12, my - 5 - p.get('wob', 0), 3), (mx + 16, my - 12 - p.get('wob', 0), 4.2)])
        f.put(horn, BONE, bias=0.3, band=1)
        bell = disc(mx + 16, my - 13 - p.get('wob', 0), 3.6)
        f.flat(bell & horn, '!')
        for k in (0.35, 0.6): f.over(mx + 16 * k, my - 5 * k, 'Y')
    held(f, p, handL, handR, rng)
    # -------- head: an oval, lashes and lipstick
    hy = 20 + bob + p.get('hdy', 0)
    hx = hx0 + p.get('hdx', 0)
    neck = cap((hx, 26 + bob), (hx, 31 + bob), 2.6, 3.2)
    f.put(neck, SKIN, bias=-0.4)
    # the pendant
    f.put(poly([(hx - 1, 33 + bob), (hx + 1, 33 + bob), (hx, 37 + bob)]), BONE, band=1)
    for x in range(int(hx - 4), int(hx + 5)): f.over(x, 32 + bob - (1 if abs(x - hx) > 2 else 0), 'k')
    head = ell(hx, hy, 7.4, 8.6)
    f.put(head, SKIN, bias=0.5, band=2)
    # the hair: a tower, a bone through it, two strands loose
    hive = set()
    for (dy, rx) in ((0, 9.4), (-5, 9.8), (-10, 9.4), (-15, 8.2), (-20, 6.2), (-24, 3.6)):
        hive |= ell(hx - 0.5, hy - 7 + dy, rx, 4.2)
    hair = hive | ell(hx - 7, hy - 1, 2.8, 5.6)
    hair -= set(q for q in ell(hx + 1, hy + 1, 7, 7) if q[1] > hy - 5)
    hr = f.put(hair, HAIRO, bias=0.3, band=2)
    for k, (x0, ph) in enumerate(((hx - 6, 0.0), (hx - 2, 1.4), (hx + 3, 2.6))):   # the swirl of it
        for t in range(22):
            y = hy - 30 + t
            x = x0 + math.sin(t * 0.34 + ph) * 2.2
            f.over(x, y, 'z' if t % 2 else 'A')
    pin = cap((hx - 12, hy - 18), (hx + 11, hy - 12), 1, 1) | disc(hx - 12.5, hy - 18.5, 1.5) | disc(hx + 11.5, hy - 11.5, 1.5)
    f.put(pin, BONE, band=1)
    strand = cap((hx + 6, hy - 6), (hx + 8, hy + 6), 0.8, 0.6)
    f.put(strand, HAIRO, band=1)
    # earrings: bone hoops
    for ex in (hx - 7.5, hx + 7.5):
        for (dx, dy) in ((0, 0), (-1, 1), (1, 1), (0, 2)): f.dot(ex + dx, hy + 4 + dy, '#')
    ey = hy - 1
    eyes(f, hx - 3, hx + 3, ey, p.get('eyes', 'open'), lash=True)
    for x0 in (hx - 3, hx + 3):                                     # eyeshadow
        if p.get('eyes', 'open') not in ('closed', 'shut', 'squeeze'):
            f.over(x0, ey - 1, 'T'); f.over(x0 + 1, ey - 1, 'T')
    br = p.get('brow', 'arch')
    for x0, sgn in ((hx - 4, -1), (hx + 3, 1)):
        yb = ey - 3 + (1 if br == 'angry' and sgn < 0 else 0) - (1 if br == 'up' else 0)
        f.dot(x0, yb, 'z'); f.dot(x0 + 1, yb - (1 if br == 'arch' and sgn > 0 else 0), 'z'); f.dot(x0 + 2, yb, 'z')
    f.dot(hx + 1, hy + 2, 'b'); f.dot(hx + 1, hy + 3, 'c')           # the nose
    for (x0) in (hx - 5, hx + 5): f.over(x0, hy + 3, 'W')           # blush
    mouth(f, hx + 1, hy + 5, p.get('mouth', 'smile'), w=5, teeth=False, lips='F')
    roast(f, 0.9)
    return f


# ================================================================ PEBBLE
def pebble(p):
    f = Fig(46, 62)
    rng = random.Random(p.get('seed', 3))
    gy = f.h - 1
    bob = p.get('bob', 0)
    hx0 = 22 + p.get('lean', 0)
    lift = p.get('lift', (0, 0))
    # legs: stubs with grubby feet
    for side, lf in ((-1, lift[0]), (1, lift[1])):
        hip = (hx0 + side * 5, 45 + bob)
        ank = (hx0 + side * 5.5, gy - 3 - lf)
        leg = cap(hip, ank, 4, 3.4)
        f.put(leg, SKIN, bias=0.1 if side < 0 else -0.2)
        foot = ell(ank[0] + side * 0.5 + 1, gy - 1.4 - lf, 4, 2.2)
        ft = f.put(foot, SKIN, band=1)
        for q in ft:
            if q[1] >= gy - 1 - lf and rng.random() < 0.5: f.cv.set(q[0], q[1], 'l')   # dirt
        for k in range(3): f.dot(ank[0] + 2 + k * 1.5, gy - 3 - lf, 'b')
    # the round middle
    body = ell(hx0, 38 + bob, 11.5, 10)
    f.put(body, SKIN, bias=0.3, band=2)
    f.dot(hx0 + 1, 42 + bob, 'b')
    # loincloth
    lc = poly([(hx0 - 10, 42 + bob), (hx0 + 10, 42 + bob), (hx0 + 9, 49 + bob), (hx0 - 9, 49 + bob)])
    f.put(lc, FUR, bias=0.1, band=1)
    # the vest: far too big, shaggy, open at the front
    vest = poly([(hx0 - 12, 29 + bob), (hx0 - 4, 28 + bob), (hx0 - 3, 44 + bob), (hx0 - 13, 45 + bob)]) | poly([(hx0 + 4, 28 + bob), (hx0 + 12, 29 + bob), (hx0 + 13, 45 + bob), (hx0 + 3, 44 + bob)])
    for x in range(int(hx0 - 13), int(hx0 + 14)):
        if abs(x - hx0) > 3:
            for k in range(rng.randint(1, 3)): vest.add((x, 45 + bob + k))
    v = f.put(vest, FURD, bias=0.2, band=2)
    for q in sorted(v):
        if rng.random() < 0.18: f.cv.set(q[0], q[1], 'l' if rng.random() < 0.5 else 'f')
    # the skull bongos, strapped on
    strap = polyline([(hx0 - 11, 30 + bob), (hx0 + 9, 44 + bob)], r=0.7)
    f.put(strap, ['j', 'k'], band=1, grad=False)
    beat = p.get('beat', None)
    for i, (bx, by, r) in enumerate(((hx0 - 5, 46 + bob, 4.4), (hx0 + 5, 46.5 + bob, 4))):
        sk = disc(bx, by, r)
        f.put(sk, BONE, bias=0.3, band=1)
        f.dot(bx - 1.5, by + 0.5, '0'); f.dot(bx + 1.5, by + 0.5, '0'); f.dot(bx, by + 2, '1')
        top = ell(bx, by - r + 1.2, r - 0.4, 1.4)
        f.put(top, ['k', 'l', 'm'], band=1, grad=False)
        if beat is not None and ((beat > 0.5) == (i == 0)): f.flat(set([(int(bx) - 1, int(by - r)), (int(bx) + 1, int(by - r))]), '7', solid=False)
    # arms: short and busy
    arms = p.get('arms', 'hang')
    shL, shR = (hx0 - 10, 30 + bob), (hx0 + 10, 30 + bob)
    handL, handR = arm_targets(arms, shL, shR, bob, p)
    if arms == 'hang': handL, handR = (shL[0] - 2 + p.get('swing', 0), shL[1] + 13), (shR[0] + 2 - p.get('swing', 0), shR[1] + 13)
    if arms == 'drum':
        a = p.get('beat', 0)
        handL, handR = (hx0 - 6, 41 + bob - a * 5), (hx0 + 6, 41 + bob - (1 - a) * 5)
    if arms == 'up': handL, handR = (shL[0] - 4, shL[1] - 11), (shR[0] + 4, shR[1] - 11)
    if arms == 'eat': handL, handR = (shL[0] - 1, shL[1] + 13), (hx0 + 9, 25 + bob + p.get('chew', 0))
    for side, sh, hand in ((-1, shL, handL), (1, shR, handR)):
        el = elbow(sh, hand, side, 8)
        a = cap(sh, el, 3.2, 3) | cap(el, hand, 3, 2.6)
        f.put(a, SKIN, bias=0.1 if side < 0 else -0.2)
        f.put(disc(hand[0], hand[1], 2.8), SKIN, bias=0.3, band=1)
    held(f, p, handL, handR, rng)
    # the head: big and round
    hy = 16 + bob + p.get('hdy', 0)
    hx = hx0 + p.get('hdx', 0)
    head = ell(hx, hy, 11, 10.4)
    f.put(head, SKIN, bias=0.5, band=2)
    for ex in (hx - 11, hx + 11): f.put(ell(ex, hy + 1, 2, 2.8), SKIN, bias=-0.2, band=1)
    # the bowl cut
    hair = set(q for q in ell(hx, hy - 4, 12, 9) if q[1] <= hy - 3 + (2 if abs(q[0] - hx) > 9 else 0))
    hr = f.put(hair, HAIRB, bias=0.3, band=1)
    for x in range(int(hx - 11), int(hx + 12), 2): f.over(x, hy - 3, 'f')
    tuft = poly([(hx + 1, hy - 12), (hx + 4, hy - 16), (hx + 5, hy - 11)])
    f.put(tuft, HAIRB, band=1)
    ey = hy + 1
    eyes(f, hx - 4, hx + 4, ey, p.get('eyes', 'open'))
    br = p.get('brow', 'up')
    for x0 in (hx - 5, hx + 3):
        yb = ey - 3 - (1 if br == 'up' else 0) + (1 if br == 'angry' else 0)
        f.dot(x0, yb, 'g'); f.dot(x0 + 1, yb, 'g'); f.dot(x0 + 2, yb, 'g')
    for (x0, y0) in ((hx - 6, hy + 3), (hx - 5, hy + 4), (hx + 6, hy + 3), (hx + 7, hy + 4)): f.over(x0, y0, 'b')   # freckles
    for x0 in (hx - 7, hx + 7): f.over(x0, hy + 4, 'W')
    f.dot(hx + 1, hy + 3, 'b')
    mouth(f, hx + 1, hy + 6, p.get('mouth', 'gap'), w=7, teeth=True)
    roast(f, 0.85)
    return f


# ================================================================== ROXY
def roxy(p):
    f = Fig(48, 82)
    rng = random.Random(p.get('seed', 4))
    gy = f.h - 1
    bob = p.get('bob', 0)
    hx0 = 23 + p.get('lean', 0)
    lift = p.get('lift', (0, 0))
    # braids first: they hang behind the shoulders
    hy = 16 + bob + p.get('hdy', 0)
    hx = hx0 + p.get('hdx', 0)
    sw = p.get('braid', 0)
    for side in (-1, 1):
        br = chain([(hx + side * 7, hy + 2, 2.6), (hx + side * 9 + sw, hy + 14, 2.4), (hx + side * 9.5 + sw * 1.5, hy + 26, 2)])
        b = f.put(br, HAIRB, bias=0.1, band=1)
        for y in range(int(hy + 4), int(hy + 27), 3): f.over(hx + side * 9 + sw * (y - hy) / 26, y, 'f')
        # feathers tied in at the ends
        fx, fy = hx + side * 9.5 + sw * 1.5, hy + 28
        fe = chain([(fx, fy, 1), (fx + side * 1.5, fy + 5, 1.8), (fx + side * 2, fy + 9, 0.8)])
        f.put(fe, ['M', 'N', 'O', 'P'] if side < 0 else ['U', 'V', 'W', 'X'], band=1)
    # legs: long and thin, one knee bandaged
    for side, lf in ((-1, lift[0]), (1, lift[1])):
        hip = (hx0 + side * 4, 52 + bob)
        knee = (hx0 + side * 4.5, 65 + bob - lf * 0.4)
        ank = (hx0 + side * 4.5, gy - 3 - lf)
        leg = cap(hip, knee, 3.4, 2.8) | cap(knee, ank, 2.8, 2.2)
        f.put(leg, SKIN, bias=0.1 if side < 0 else -0.2)
        if side < 0:
            for dy in (-1, 0, 1):
                for dx in (-2, -1, 0, 1, 2): f.over(knee[0] + dx, knee[1] + dy, '#' if dy else '$')
        # leg wraps
        for y in range(int(ank[1]) - 5, int(ank[1]) + 1, 2):
            for dx in (-2, -1, 0, 1, 2): f.over(ank[0] + dx, y, 'l')
        foot = ell(ank[0] + 1.5, gy - 1 - lf, 3.4, 1.8)
        f.put(foot, ['j', 'k', 'l'], band=1)
    # the skirt of leaves
    sk = set()
    for i in range(9):
        x = hx0 - 9 + i * 2.3
        lf_ = ell(x, 54 + bob + (i % 2), 2.4, 6)
        sk |= lf_
    s_ = f.put(sk, LEAF, bias=0.1, band=1)
    for i in range(9):
        f.over(hx0 - 9 + i * 2.3, 52 + bob + (i % 2), 't')
    # the body: slim, a fur crop top
    torso = poly([(hx0 - 6, 30 + bob), (hx0 + 6, 30 + bob), (hx0 + 5, 49 + bob), (hx0 - 5, 49 + bob)])
    f.put(torso, SKIN, bias=0.2, band=2)
    f.dot(hx0 + 1, 45 + bob, 'b')
    top = poly([(hx0 - 7, 30 + bob), (hx0 + 7, 30 + bob), (hx0 + 7, 38 + bob), (hx0 - 7, 38 + bob)])
    fringe_ = set()
    for x in range(int(hx0 - 7), int(hx0 + 8)):
        for k in range(rng.randint(0, 2)): fringe_.add((x, 38 + bob + k))
    t = f.put(top | fringe_, FUR, bias=0.2, band=1)
    for q in sorted(t):
        if rng.random() < 0.12: f.cv.set(q[0], q[1], 'k')
    # beads
    for k in range(7):
        t_ = k / 6.0
        f.over(hx0 - 5 + t_ * 10, 29 + bob + math.sin(t_ * math.pi) * 2.5, ['F', 'K', '9'][k % 3])
    # the flute in her belt
    arms = p.get('arms', 'fold')
    if arms != 'flute':
        fl = cap((hx0 + 3, 44 + bob), (hx0 + 12, 58 + bob), 1.2, 1.2)
        f.put(fl, BONE, band=1)
    # arms: thin, folded across, or playing
    shL, shR = (hx0 - 7, 31 + bob), (hx0 + 7, 31 + bob)
    handL, handR = arm_targets(arms, shL, shR, bob, p)
    if arms == 'hang': handL, handR = (shL[0] - 2 + p.get('swing', 0), shL[1] + 18), (shR[0] + 2 - p.get('swing', 0), shR[1] + 18)
    if arms == 'flute': handL, handR = (hx0 + 3, 22 + bob + p.get('fing', 0)), (hx0 + 10, 21 + bob - p.get('fing', 0))
    if arms == 'up': handL, handR = (shL[0] - 4, shL[1] - 14), (shR[0] + 4, shR[1] - 14)
    order = ((1, shR, handR), (-1, shL, handL)) if arms == 'fold' else ((-1, shL, handL), (1, shR, handR))
    for side, sh, hand in order:
        el = elbow(sh, hand, side, 11)
        a = cap(sh, el, 2.4, 2.1) | cap(el, hand, 2.1, 1.9)
        f.put(a, SKIN, bias=0.1 if side < 0 else -0.2)
        f.put(disc(hand[0], hand[1], 2.1), SKIN, bias=0.3, band=1)
    if arms == 'flute':
        fl = cap((hx0 + 1, 21 + bob), (hx0 + 18, 19 + bob), 1.3, 1.3)
        f.put(fl, BONE, band=1)
        for k in range(3): f.over(hx0 + 8 + k * 3, 19 + bob, '!')
    held(f, p, handL, handR, rng)
    # the head
    neck = cap((hx, 24 + bob), (hx, 30 + bob), 2, 2.4)
    f.put(neck, SKIN, bias=-0.4)
    head = ell(hx, hy, 7.2, 8)
    f.put(head, SKIN, bias=0.5, band=2)
    hair = set(q for q in ell(hx, hy - 4, 8.6, 6.8) if q[1] <= hy - 2 + (5 if abs(q[0] - hx) > 6 else 0))
    f.put(hair, HAIRB, bias=0.3, band=1)
    for x in range(int(hx - 7), int(hx + 8), 3): f.over(x, hy - 3, 'f')
    # headband with a feather
    for x in range(int(hx - 8), int(hx + 9)): f.over(x, hy - 5, 'F')
    fe = chain([(hx + 6, hy - 6, 0.8), (hx + 9, hy - 12, 1.6), (hx + 10, hy - 17, 0.8)])
    f.put(fe, ['M', 'N', 'O', 'P'], band=1)
    ey = hy
    eyes(f, hx - 3, hx + 3, ey, p.get('eyes', 'half'), lash=True)
    br = p.get('brow', 'flat')
    for x0 in (hx - 4, hx + 2):
        yb = ey - 2 - (1 if br == 'up' else 0) + (1 if br == 'angry' and x0 > hx else 0)
        f.dot(x0, yb, 'g'); f.dot(x0 + 1, yb, 'g'); f.dot(x0 + 2, yb - (1 if br == 'angry' and x0 < hx else 0), 'g')
    for x0 in (hx - 5, hx + 4):                                      # war paint
        f.over(x0, hy + 2, 'J'); f.over(x0 + 1, hy + 2, 'J'); f.over(x0, hy + 3, 'K'); f.over(x0 + 1, hy + 3, 'K')
    f.dot(hx + 1, hy + 2, 'b')
    for (x0, y0) in ((hx - 2, hy + 3), (hx + 3, hy + 3)): f.over(x0, y0, 'b')
    mouth(f, hx + 1, hy + 5, p.get('mouth', 'flat'), w=4, teeth=False, lips='G')
    roast(f, 0.8)
    return f


# ======================================================= the neighbours
def elder(p):
    """old Ug and the shaman: bent over a stick, a beard to the knees"""
    f = Fig(52, 80)
    rng = random.Random(p.get('seed', 5))
    gy = f.h - 1
    bob = p.get('bob', 0)
    hx0 = 24 + p.get('lean', 0)
    lift = p.get('lift', (0, 0))
    stick = cap((hx0 + 16, 30 + bob), (hx0 + 18, gy), 1.4, 1.4) | disc(hx0 + 16, 28 + bob, 2.4)
    f.put(stick, FURD, band=1)
    for side, lf in ((-1, lift[0]), (1, lift[1])):
        hip = (hx0 + side * 5, 58 + bob)
        ank = (hx0 + side * 5, gy - 3 - lf)
        f.put(cap(hip, ank, 3.6, 3), SKIN, bias=-0.1 * side)
        f.put(ell(ank[0] + 2, gy - 1.5 - lf, 4, 2), SKIN, band=1)
    robe = poly([(hx0 - 11, 30 + bob), (hx0 + 11, 30 + bob), (hx0 + 14, 66 + bob), (hx0 - 14, 66 + bob)])
    hem = set((x, 66 + bob + k) for x in range(int(hx0 - 14), int(hx0 + 15)) for k in range(1 + int(2 * abs(math.sin(x)))))
    r = f.put(robe | hem, ['Q', 'R', 'S', 'T'], bias=0.1, band=2)
    for q in sorted(r):
        if (q[0] * 3 + q[1]) % 11 == 0: f.cv.set(q[0], q[1], '9')
    shL, shR = (hx0 - 10, 32 + bob), (hx0 + 10, 32 + bob)
    handR = (hx0 + 16, 34 + bob)
    handL = (shL[0] - 2, shL[1] + 18)
    for side, sh, hand in ((-1, shL, handL), (1, shR, handR)):
        el = elbow(sh, hand, side, 10)
        f.put(cap(sh, el, 3.6, 3) | cap(el, hand, 3, 2.6), ['Q', 'R', 'S', 'T'], bias=0.1)
        f.put(disc(hand[0], hand[1], 2.6), SKIN, band=1)
    hy = 18 + bob; hx = hx0 + 1
    head = ell(hx, hy, 8.4, 9)
    f.put(head, SKIN, bias=0.4, band=2)
    beard = set(q for q in ell(hx, hy + 13, 8, 15) if q[1] >= hy + 3)
    b = f.put(beard, HAIRW, bias=0.3, band=1)
    for q in sorted(b):
        if rng.random() < 0.12: f.cv.set(q[0], q[1], '4')
    brows = set()
    for x0 in (hx - 7, hx + 1):
        for k in range(6): brows.add((x0 + k, hy - 3 + (k in (0, 5))))
    f.put(brows, HAIRW, band=1)
    eyes(f, hx - 3, hx + 3, hy, 'closed' if p.get('eyes') == 'closed' else 'half')
    nose = disc(hx + 1, hy + 3, 2.2)
    f.put(nose, SKIN, bias=0.1, band=1)
    mouth(f, hx + 1, hy + 7, 'flat', w=4)
    # a headdress of bones and feathers
    for i, a in enumerate((-40, -15, 10, 35)):
        tip = ang_pt((hx, hy - 7), 9, 180 + a)
        f.put(cap((hx + a * 0.1, hy - 7), tip, 1, 0.8), BONE if i % 2 else ['M', 'N', 'O', 'P'], band=1)
    band_ = set((x, int(hy - 7)) for x in range(int(hx - 8), int(hx + 9)))
    f.put(band_, ['E', 'F'], band=1, grad=False)
    return f


def nana(p):
    """Nana Gruk: tiny, round, a bun like a boulder, a stirring stick"""
    f = Fig(46, 64)
    rng = random.Random(p.get('seed', 6))
    gy = f.h - 1
    bob = p.get('bob', 0)
    hx0 = 22 + p.get('lean', 0)
    lift = p.get('lift', (0, 0))
    for side, lf in ((-1, lift[0]), (1, lift[1])):
        f.put(ell(hx0 + side * 5, gy - 2 - lf, 4, 2.4), ['j', 'k', 'l'], band=1)
    dress = ell(hx0, 44 + bob, 14, 15)
    d = f.put(dress, ['U', 'V', 'W', 'X'], bias=0.1, band=2)
    for q in sorted(d):
        if (q[0] + q[1] * 2) % 7 == 0: f.cv.set(q[0], q[1], '7')
    apron = poly([(hx0 - 7, 40 + bob), (hx0 + 7, 40 + bob), (hx0 + 8, 56 + bob), (hx0 - 8, 56 + bob)])
    f.put(apron, BONE, bias=0.2, band=1)
    shawl = ell(hx0, 32 + bob, 13, 6)
    f.put(shawl, FUR, bias=0.2, band=1)
    handL, handR = (hx0 - 12, 44 + bob), (hx0 + 12, 40 + bob)
    for hand in (handL, handR): f.put(disc(hand[0], hand[1], 2.6), SKIN, band=1)
    spoon = cap((hx0 + 12, 42 + bob), (hx0 + 18, 22 + bob), 1.2, 1.2) | ell(hx0 + 18, 20 + bob, 2.6, 3.4)
    f.put(spoon, FURD, band=1)
    hy = 20 + bob; hx = hx0
    f.put(ell(hx, hy, 8.4, 8), SKIN, bias=0.4, band=2)
    bun = disc(hx - 1, hy - 11, 6.6) | set(q for q in ell(hx, hy - 4, 9, 6) if q[1] <= hy - 3)
    f.put(bun, HAIRW, bias=0.3, band=1)
    f.put(cap((hx - 8, hy - 13), (hx + 6, hy - 9), 0.8, 0.8), BONE, band=1)
    eyes(f, hx - 3, hx + 3, hy, 'closed')
    f.dot(hx, hy + 3, 'b')
    for x0 in (hx - 5, hx + 5): f.over(x0, hy + 3, 'W')
    mouth(f, hx + 1, hy + 5, 'smile', w=5, teeth=False)
    return f


def brute(p):
    """Gronk, rival and raider: all shoulders, spiky red hair, war paint, a club"""
    f = Fig(62, 84)
    rng = random.Random(p.get('seed', 7))
    gy = f.h - 1
    bob = p.get('bob', 0)
    hx0 = 29 + p.get('lean', 0)
    lift = p.get('lift', (0, 0))
    club = chain([(hx0 + 20, 58 + bob, 2), (hx0 + 23, 40 + bob, 3), (hx0 + 25, 24 + bob, 5.4)])
    f.put(club, FURD, band=1)
    for (cx_, cy_) in ((hx0 + 23, 26 + bob), (hx0 + 27, 32 + bob), (hx0 + 22, 34 + bob)):
        f.put(poly([(cx_, cy_), (cx_ + 3, cy_ - 1), (cx_ + 1, cy_ + 2)]), BONE, band=1)
    for side, lf in ((-1, lift[0]), (1, lift[1])):
        hip = (hx0 + side * 7, 58 + bob)
        knee = (hx0 + side * 8, 68 + bob - lf * 0.4)
        ank = (hx0 + side * 8, gy - 4 - lf)
        f.put(cap(hip, knee, 5.2, 4.4) | cap(knee, ank, 4.4, 3.6), TAN, bias=-0.1 * side)
        f.put(ell(ank[0] + 1, gy - 2 - lf, 5.4, 2.8), FURD, band=1)
    torso = poly([(hx0 - 16, 28 + bob), (hx0 + 16, 28 + bob), (hx0 + 9, 58 + bob), (hx0 - 9, 58 + bob)])
    f.put(torso, TAN, bias=0.3, band=2)
    for (dx, dy) in ((-5, 38), (5, 38), (-3, 46), (3, 46), (-3, 51), (3, 51)):   # abs, pecs
        f.over(hx0 + dx, dy + bob, 'a'); f.over(hx0 + dx + (1 if dx < 0 else -1), dy + bob, 'b')
    for (dx, dy) in ((-10, 34), (-8, 38), (-6, 42)):
        for k in range(3): f.over(hx0 + dx + k, dy + bob + k, 'J')        # war paint
    skirt = poly([(hx0 - 11, 54 + bob), (hx0 + 11, 54 + bob), (hx0 + 13, 66 + bob), (hx0 - 13, 66 + bob)])
    hem = set((x, 66 + bob + k) for x in range(int(hx0 - 13), int(hx0 + 14)) for k in range(1 + int(2 * abs(math.sin(x * 1.7)))))
    s_ = f.put(skirt | hem, FURD, bias=0.1, band=1)
    for q in sorted(s_):
        if rng.random() < 0.15: f.cv.set(q[0], q[1], 'm')
    shL, shR = (hx0 - 16, 30 + bob), (hx0 + 16, 30 + bob)
    handL, handR = (shL[0] - 4 + p.get('swing', 0), shL[1] + 24), (hx0 + 21, 56 + bob)
    for side, sh, hand in ((-1, shL, handL), (1, shR, handR)):
        el = elbow(sh, hand, side, 14)
        f.put(cap(sh, el, 5.8, 5) | cap(el, hand, 5, 4.2), TAN, bias=0.1 if side < 0 else -0.2)
        f.put(disc(hand[0], hand[1], 3.8), TAN, bias=0.3, band=1)
    hy = 16 + bob; hx = hx0 + 1
    f.put(ell(hx, 26 + bob, 7, 4), TAN, bias=-0.5)
    head = ell(hx, hy, 9.4, 9.4) | poly([(hx - 9, hy), (hx + 9, hy), (hx + 8, hy + 9), (hx - 8, hy + 9)])
    f.put(head, TAN, bias=0.4, band=2)
    hair = set()
    for i in range(7):
        x = hx - 9 + i * 3
        hair |= poly([(x - 2, hy - 5), (x + 2, hy - 5), (x + (i - 3) * 0.6, hy - 14 - (i % 2) * 3)])
    hair |= set(q for q in ell(hx, hy - 5, 10, 4) if q[1] <= hy - 3)
    f.put(hair, RED + ['G'], bias=0.2, band=1)
    ey = hy
    eyes(f, hx - 4, hx + 4, ey, 'open')
    for x in range(int(hx - 7), int(hx + 8)):
        f.dot(x, ey - 2 + (1 if abs(x - hx) < 3 else 0), '0')
    f.put(disc(hx + 1, hy + 3, 2.4), TAN, bias=0.2, band=1)
    mouth(f, hx + 1, hy + 7, p.get('mouth', 'smirk'), w=8, teeth=True)
    return f


def kid(p):
    """a lost kid with pigtails and a very big stick"""
    f = Fig(38, 52)
    rng = random.Random(p.get('seed', 8))
    gy = f.h - 1
    bob = p.get('bob', 0)
    hx0 = 16
    stick = cap((hx0 + 12, 12 + bob), (hx0 + 13, gy), 1.2, 1.2)
    f.put(stick, FURD, band=1)
    for side in (-1, 1):
        f.put(cap((hx0 + side * 4, 38 + bob), (hx0 + side * 4, gy - 2), 2.6, 2.2), SKIN)
        f.put(ell(hx0 + side * 4 + 1, gy - 1, 3, 1.6), SKIN, band=1)
    dress = poly([(hx0 - 7, 24 + bob), (hx0 + 7, 24 + bob), (hx0 + 10, 42 + bob), (hx0 - 10, 42 + bob)])
    d = f.put(dress, LEAF, bias=0.2, band=1)
    for side, hand in ((-1, (hx0 - 9, 36 + bob)), (1, (hx0 + 12, 30 + bob))):
        sh = (hx0 + side * 6, 26 + bob)
        f.put(cap(sh, hand, 2.2, 2), SKIN)
        f.put(disc(hand[0], hand[1], 2.2), SKIN, band=1)
    hy = 14 + bob; hx = hx0
    for side in (-1, 1): f.put(disc(hx + side * 9, hy - 2, 3.4), HAIRK, bias=0.2, band=1)
    f.put(ell(hx, hy, 8, 8), SKIN, bias=0.5, band=2)
    f.put(set(q for q in ell(hx, hy - 4, 8.6, 5.6) if q[1] <= hy - 3), HAIRK, bias=0.3, band=1)
    eyes(f, hx - 3, hx + 3, hy, 'wide' if p.get('eyes') == 'wide' else 'open')
    for x0 in (hx - 5, hx + 5): f.over(x0, hy + 3, 'W')
    mouth(f, hx + 1, hy + 5, p.get('mouth', 'o'), w=4, teeth=False)
    return f


# ================================================================= clips
def walk(i, **k):
    lifts = [(3, 0), (0, 0), (0, 3), (0, 0)]
    bobs = [0, 1, 0, 1]
    swing = [2, 0, -2, 0]
    d = dict(lift=lifts[i], bob=bobs[i], swing=swing[i], braid=[1, 0, -1, 0][i])
    d.update(k)
    return d


def clips_for(who):
    if who == 'bronk':
        base = dict(arms='hang', mouth='smile', brow='flat')
        return {
            'idle': [dict(base, seed=1), dict(base, seed=1, bob=1, mouth='smile', eyes='open')],
            'walk': [walk(i, arms='hang', mouth='smile', seed=1) for i in range(4)],
            'play': [dict(arms='axe', inst='hands', strum=s, bob=b, mouth=m, brow='up', eyes=e, seed=1)
                     for (s, b, m, e) in ((0, 0, 'grin', 'open'), (4, 1, 'shout', 'closed'), (0, 0, 'grin', 'open'), (4, 1, 'open', 'closed'))],
            'eat': [dict(arms='eat', mouth=m, chew=c, bob=b, seed=1, eyes=e) for (m, c, b, e) in (('open', 0, 0, 'open'), ('chew', 2, 1, 'closed'), ('open', 0, 0, 'open'), ('chew', 2, 1, 'closed'))],
            'shock': [dict(arms='up', mouth='shout', eyes='wide', brow='up', seed=1), dict(arms='up', mouth='shout', eyes='wide', brow='up', bob=-1, seed=1)],
            'hurt': [dict(arms='hurt', mouth='open', eyes='squeeze', brow='angry', lean=-2, seed=1)],
            'sleep': [dict(arms='sleep', mouth='o', eyes='closed', seed=1), dict(arms='sleep', mouth='open', eyes='closed', seed=1, bob=1)],
        }
    if who == 'vela':
        base = dict(arms='hip', mouth='smile', brow='arch', eyes='open')
        return {
            'idle': [dict(base, seed=2), dict(base, seed=2, bob=1)],
            'walk': [walk(i, arms='hang', mouth='smile', seed=2) for i in range(4)],
            'play': [dict(arms='horn', inst='hands', wob=w, bob=b, mouth='o', eyes=e, brow='up', seed=2)
                     for (w, b, e) in ((0, 0, 'closed'), (2, 1, 'closed'), (0, 0, 'open'), (2, 1, 'closed'))],
            'eat': [dict(arms='eat', mouth=m, chew=c, bob=b, seed=2, eyes='open') for (m, c, b) in (('open', 0, 0), ('chew', 2, 1), ('smile', 0, 0), ('chew', 2, 1))],
            'shock': [dict(arms='up', mouth='o', eyes='wide', brow='up', seed=2), dict(arms='up', mouth='o', eyes='wide', brow='up', bob=-1, seed=2)],
            'hurt': [dict(arms='hurt', mouth='open', eyes='squeeze', brow='angry', lean=-2, seed=2)],
            'sleep': [dict(arms='sleep', mouth='flat', eyes='closed', seed=2), dict(arms='sleep', mouth='flat', eyes='closed', seed=2, bob=1)],
        }
    if who == 'pebble':
        base = dict(arms='hang', mouth='gap', brow='up')
        return {
            'idle': [dict(base, seed=3), dict(base, seed=3, bob=1, mouth='grin')],
            'walk': [walk(i, arms='hang', mouth='gap', seed=3) for i in range(4)],
            'play': [dict(arms='drum', beat=a, bob=b, mouth=m, eyes=e, seed=3) for (a, b, m, e) in ((0, 0, 'grin', 'open'), (1, 1, 'shout', 'closed'), (0, 0, 'grin', 'open'), (1, 1, 'shout', 'closed'))],
            'eat': [dict(arms='eat', mouth=m, chew=c, bob=b, seed=3) for (m, c, b) in (('open', 0, 0), ('chew', 2, 1), ('open', 0, 0), ('chew', 2, 1))],
            'shock': [dict(arms='up', mouth='shout', eyes='wide', seed=3), dict(arms='up', mouth='shout', eyes='wide', bob=-1, seed=3)],
            'hurt': [dict(arms='hang', mouth='open', eyes='squeeze', brow='angry', seed=3)],
            'sleep': [dict(arms='hang', mouth='o', eyes='closed', seed=3), dict(arms='hang', mouth='open', eyes='closed', seed=3, bob=1)],
        }
    if who == 'roxy':
        base = dict(arms='fold', mouth='flat', eyes='half', brow='flat')
        return {
            'idle': [dict(base, seed=4), dict(base, seed=4, bob=1, braid=1)],
            'walk': [walk(i, arms='hang', mouth='flat', eyes='half', seed=4) for i in range(4)],
            'play': [dict(arms='flute', fing=fg, bob=b, mouth='flat', eyes='closed', braid=br, seed=4) for (fg, b, br) in ((0, 0, 0), (1, 1, 1), (0, 0, 0), (1, 1, -1))],
            'eat': [dict(arms='eat', mouth=m, chew=c, bob=b, eyes='half', seed=4) for (m, c, b) in (('open', 0, 0), ('chew', 2, 1), ('flat', 0, 0), ('chew', 2, 1))],
            'shock': [dict(arms='up', mouth='o', eyes='wide', brow='up', seed=4), dict(arms='up', mouth='o', eyes='wide', brow='up', bob=-1, seed=4)],
            'hurt': [dict(arms='hang', mouth='open', eyes='squeeze', brow='angry', seed=4)],
            'sleep': [dict(arms='hang', mouth='flat', eyes='closed', seed=4), dict(arms='hang', mouth='flat', eyes='closed', seed=4, bob=1)],
        }
    raise KeyError(who)


DRAW = {'bronk': bronk, 'vela': vela, 'pebble': pebble, 'roxy': roxy}
BASE = {'bronk': 'bronk', 'vela': 'vela', 'pebble': 'kid_a', 'roxy': 'kid_b'}


def rot_ccw(rows):
    h, w = len(rows), len(rows[0])
    return [''.join(rows[y][w - 1 - x] for y in range(h)) for x in range(w)]


def trim_rows(rows):
    ys = [y for y, r in enumerate(rows) if r.strip('.')]
    if not ys: return rows
    rows = rows[ys[0]:ys[-1] + 1]
    xs = [x for x in range(len(rows[0])) if any(r[x] != '.' for r in rows)]
    return [r[xs[0]:xs[-1] + 1] for r in rows]


def pad_to(frames, w, h):
    out = []
    for rows in frames:
        rows = trim_rows(rows)
        rh, rw = len(rows), len(rows[0])
        x0 = (w - rw) // 2
        out.append(['.' * w] * (h - rh) + ['.' * x0 + r + '.' * (w - rw - x0) for r in rows])
    return out


def build():
    S = {}
    for who, fn in DRAW.items():
        cl = clips_for(who)
        for name, poses in cl.items():
            frames = [fn(p).rows() for p in poses]
            if name == 'sleep':
                frames = [rot_ccw(trim_rows(fr)) for fr in frames]
                w = max(len(f[0]) for f in frames); h = max(len(f) for f in frames)
                frames = pad_to(frames, w, h)
            S[BASE[who] + '_' + name] = frames
    # the neighbours
    S['elder_idle'] = [elder(dict(seed=5)).rows(), elder(dict(seed=5, bob=1)).rows()]
    S['villager2_idle'] = [nana(dict(seed=6)).rows(), nana(dict(seed=6, bob=1)).rows()]
    S['villager2_walk'] = [nana(walk(i, seed=6)).rows() for i in range(4)]
    S['brute_idle'] = [brute(dict(seed=7)).rows(), brute(dict(seed=7, bob=1)).rows()]
    S['brute_walk'] = [brute(walk(i, seed=7)).rows() for i in range(4)]
    S['kid_npc_idle'] = [kid(dict(seed=8)).rows(), kid(dict(seed=8, bob=1, mouth='open')).rows()]
    return S
