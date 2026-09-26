"""GRANDMA REX. A tyrannosaur stood up on her back legs to fit a dress: a grey
perm with a bone through the bun, round spectacles, a knitted shawl, a
flowered dress with an apron over it, shell pearls, a handbag on one little
arm and fluffy slippers on the feet. The head is the same T-Rex head the
valley's tyrannosaur has, so she is unmistakably family.

Faces right; the engine flips her. 124 x 150, feet on the bottom row."""
import sys, os, math, random
D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(D, '..', 'beasts'))
from pxlib import *
from blaze import rot_xf, LN, PL, dilate
from trex import rex_head

REX = ['t', 'u', 'v', 'w', 'x']
REXD = ['1', 't', 'u', 'v', 'w']
BONE = ['!', '@', '#', '$']
DRESS = ['Q', 'R', 'S', 'T']
APRON = ['@', '#', '$', '7']
SHAWL = ['U', 'V', 'W', 'X']
WIG = ['2', '3', '4', '5', '6']
SLIP = ['V', 'W', 'X', '7']
BAG = ['j', 'k', 'l', 'm', 'n']
GOLD = ['Y', 'Z', '8', '9']
WW, HH = 124, 150


def claw_foot(cv, x, gy, lift, ramp_slip):
    """a big three-toed foot in a fluffy slipper"""
    y = gy - lift
    slip = ell(x + 3, y - 4, 11, 5) | ell(x + 10, y - 3, 6, 4)
    shade(cv, slip, ramp_slip, bias=0.2, band=1)
    rng = random.Random(int(x * 7 + lift))
    for p in sorted(slip):
        if p[1] <= y - 6 and rng.random() < 0.45: cv.set(p[0], p[1], '7')
    # claws poking out of the front
    for k in range(3):
        cl = poly([(x + 13 + k * 1.2, y - 6 + k * 2), (x + 17 + k * 1.2, y - 5 + k * 2), (x + 13 + k * 1.2, y - 4 + k * 2)])
        shade(cv, cl, BONE, band=1)
    return slip


def draw(cv, o):
    rng = random.Random(o.get('seed', 3))
    gy = HH - 1
    bob = o.get('bob', 0.0)
    shake = o.get('shake', 0.0)
    B = lambda x, y: (x + shake, y + bob)

    # ---------------------------------------------------------- the tail
    tw = o.get('tail', 0.0)
    tail = limb([(B(42, 108)[0], B(42, 108)[1], 12), (B(28, 116 + tw * 2)[0], B(28, 116 + tw * 2)[1], 9),
                 (B(15, 126 + tw * 3)[0], B(15, 126 + tw * 3)[1], 6), (B(6, 136 + tw * 3)[0], B(6, 136 + tw * 3)[1], 3.4),
                 (B(1.5, 143 + tw * 2)[0], B(1.5, 143 + tw * 2)[1], 1.4)], n=10)
    shade(cv, tail, REX, bias=-1.0, grad=True)
    for i in range(6):
        t = i / 5.0
        bx, by = B(38 - t * 32, 103 + t * 34 + tw * 2 * t)
        bp = ell(bx, by, 2.4 - t * 1.2, 1.8)
        shade(cv, bp & tail, REX, bias=1, grad=False)
    for p in edge_of(tail, (1, 1)): cv.setif(p[0], p[1], 't', 'uvwx')

    # ---------------------------------------------------------- the legs
    # stumpy shins under the hem, in the slippers
    lf, lb = o.get('legs', (0.0, 0.0))            # (front lift/stride, back lift/stride)
    fx, bx = 64 + o.get('stride', 0.0), 40 - o.get('stride', 0.0)
    back_leg = limb([(B(bx + 6, 124)[0], B(bx + 6, 124)[1], 8), (bx + 4 + shake, gy - 8 - lb, 6.4)], n=5)
    shade(cv, back_leg, REXD, bias=-0.6, band=1)
    claw_foot(cv, bx - 4 + shake, gy, lb, ['U', 'V', 'W', 'X'])
    front_leg = limb([(B(fx + 2, 124)[0], B(fx + 2, 124)[1], 9), (fx + shake, gy - 8 - lf, 7)], n=5)
    shade(cv, front_leg, REX, bias=-0.4, band=1)

    # ---------------------------------------------------------- the dress
    sw = o.get('sway', 0.0)
    dress = poly([B(42, 66), B(88, 66), B(96, 104), B(100 + sw, 130), B(26 + sw, 132), B(32, 100)])
    dress |= ell(*B(66, 70), 26, 12)                              # the bosom, as it were
    for i in range(7):                                            # a scalloped hem
        dress |= disc(*B(30 + sw + i * 11.2, 130), 5.2)
    shade(cv, dress, DRESS, bias=-0.1, band=3)
    # flowers on it, little and pink and yellow
    fl = random.Random(41)
    for i in range(26):
        px, py = fl.uniform(30, 98), fl.uniform(72, 130)
        p = B(px, py)
        if (int(p[0]), int(p[1])) not in dress: continue
        c = fl.choice(['X', '9', 'W'])
        for (dx, dy) in [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)]:
            cv.setif(p[0] + dx, p[1] + dy, c if (dx or dy) else '8', 'QRST')
    # folds
    for i, x0 in enumerate((44, 60, 78, 92)):
        ln = polyline([B(x0, 96), B(x0 - 3 + sw * 0.5, 130)], r=0.5)
        for p in ln: cv.setif(p[0], p[1], 'Q', 'RST89WX')
    # the apron, tied at the back
    apron = poly([B(62, 86), B(90, 84), B(95, 126), B(60, 128)])
    for i in range(4): apron |= disc(*B(63 + i * 10, 127), 4)
    shade(cv, apron, APRON, bias=0.1, band=2)
    pocket = poly([B(70, 104), B(84, 103), B(85, 113), B(71, 114)])
    for p in edge_of(pocket, (0, 1)) | edge_of(pocket, (1, 0)) | edge_of(pocket, (-1, 0)): cv.setif(p[0], p[1], '!', '@#$7')
    tie = polyline([B(62, 88), B(50, 90), B(44, 96)], r=0.8)
    flat(cv, tie, '#')
    # the front slipper, over the hem
    claw_foot(cv, fx - 6 + shake, gy, lf, SLIP)

    # ---------------------------------------------------------- neck
    HR = o.get('head_rot', 0.0); hdy = o.get('head_dy', 0.0); hdx = o.get('head_dx', 0.0)
    neck = limb([(B(64, 72)[0], B(64, 72)[1], 14), (B(67 + hdx * 0.4, 58 + hdy * 0.5)[0], B(67 + hdx * 0.4, 58 + hdy * 0.5)[1], 12.5),
                 (B(70 + hdx, 46 + hdy)[0], B(70 + hdx, 46 + hdy)[1], 12)], n=7)
    shade(cv, neck, REX, bias=-1.0, grad=True)
    thr = ell(*B(72 + hdx * 0.6, 62 + hdy * 0.6), 7, 9) & neck
    shade(cv, thr, ['u', 'v', 'w', 'x'], bias=0.2, grad=False, band=1)

    # ---------------------------------------------------------- the shawl
    sh = poly([B(40, 60), B(62, 52), B(84, 58), B(94, 72), B(90, 84), B(70, 80), B(50, 84), B(36, 76)])
    sh |= ell(*B(66, 70), 28, 11)
    shade(cv, sh, SHAWL, bias=0.1, band=2)
    for p in sorted(sh):                                            # knitted: a little rib in it
        if (p[0] + p[1] * 2) % 5 == 0: cv.set(p[0], p[1], 'V')
    for i in range(12):                                             # the fringe
        x = 38 + i * 4.6
        bot = 84 - abs(x - 64) * 0.18
        t0 = B(x, bot)
        for k in range(4 + (i % 2)): cv.set(t0[0] + (k % 2) * 0.4, t0[1] + k, 'W' if k < 3 else 'V')
    # the brooch
    br = disc(*B(84, 66), 2.4)
    shade(cv, br, GOLD, band=1)

    # ---------------------------------------------------------- the head
    # the valley tyrannosaur's own head, scaled up a little, looking right
    T0 = lambda x, y: B(x - 24 + hdx, y + 11 + hdy)
    HX = rot_xf(T0, HR, 92.0, 30.0, 1.48, 1.52)
    rex_head(cv, 1.0, HX, o.get('jaw', 0.0), rng, scar=False, paint=False, eye=not o.get('closed', False))
    ex, ey = HX(106.4, 19.4)
    if o.get('closed'):
        lid = polyline([(ex - 3, ey), (ex, ey + 1.6), (ex + 3, ey)], r=0.5)
        flat(cv, lid, '0')
    # pearls: shell beads round the neck
    for i in range(9):
        t = i / 8.0
        p = B(60 + t * 22 + hdx * 0.3, 70 - math.sin(t * math.pi) * -3 + t * -6 + hdy * 0.3)
        cv.set(p[0], p[1], '$'); cv.set(p[0] + 1, p[1], '#'); cv.set(p[0], p[1] + 1, '@')

    # ---------------------------------------------------------- the perm
    wu = o.get('wig_up', 0.0)
    wx, wy = HX(97, 10)
    wig = set()
    curls = [(-12, 2, 6.2), (-6, -4, 6.8), (2, -6, 6.8), (9, -3, 5.8), (-15, 10, 5.6), (-9, 9, 5.6), (13, 2, 4.6), (-17, 17, 4.6), (-12, 16, 4.4)]
    for (dx, dy, r) in curls: wig |= disc(wx + dx, wy + dy - wu, r)
    bun = disc(wx - 3, wy - 13 - wu * 1.5, 7)
    shade(cv, wig | bun, WIG, bias=0.2, band=2)
    for (dx, dy, r) in curls + [(-2, -11 - wu * 0.5, 6.2)]:          # every curl gets a lit crown
        for p in disc(wx + dx - r * 0.3, wy + dy - wu - r * 0.35, r * 0.4):
            if p in wig | bun and rng.random() < 0.8: cv.set(p[0], p[1], '6')
        cv.set(wx + dx - r * 0.4, wy + dy - wu - r * 0.5, '7')
    pin = polyline([(wx - 11, wy - 16 - wu * 1.5), (wx + 8, wy - 8 - wu * 1.5)], r=0.7)
    shade(cv, pin, BONE, band=1)

    # ---------------------------------------------------------- spectacles
    gl = o.get('glasses', 0.0)                       # 0 on the nose, 1 pushed up for a cry, -1 askew
    gx, gyy = ex + 1, ey + 1 - gl * 5
    ringg = set(p for p in disc(gx, gyy, 6.4) if ((p[0] - gx) ** 2 + (p[1] - gyy) ** 2) ** 0.5 > 4.9)
    shade(cv, ringg, GOLD, band=1)
    lens = disc(gx, gyy, 4.9)
    for p in lens:
        c = cv.get(p[0], p[1])
        if c in '01t': cv.set(p[0], p[1], 'I')
        elif c in 'uvwx' and rng.random() < 0.3: cv.set(p[0], p[1], 'L')
    cv.set(int(gx - 2), int(gyy - 2), '7'); cv.set(int(gx - 1), int(gyy - 3), '7')
    # the far lens, peeking over the snout, and the arm back to the ear
    far = set(p for p in disc(gx + 9, gyy - 1, 3.4) if ((p[0] - gx - 9) ** 2 + (p[1] - gyy + 1) ** 2) ** 0.5 > 2.4)
    flat(cv, far, 'Z')
    bridge = polyline([(gx + 4.5, gyy - 1), (gx + 6.5, gyy - 2)], r=0.5)
    flat(cv, bridge, '8')
    arm = polyline([(gx - 5, gyy), (gx - 17, gyy - 3)], r=0.5)
    flat(cv, arm, '8')

    # ---------------------------------------------------------- arms, bag
    aa = o.get('arm', 0.0); up = o.get('arms_up', 0.0)
    shoulder = B(86, 74)
    hand = (shoulder[0] + 8 + aa, shoulder[1] + 8 - up * 26 + aa * 0.5)
    if not up:
        # the handbag, hanging off the wrist
        bsw = o.get('bag', 0.0)
        bx0, by0 = hand[0] + 1 + bsw, hand[1] + 6
        strap = polyline([(hand[0], hand[1] + 1), (bx0 + 1, by0), (bx0 + 12, by0)], r=0.6)
        flat(cv, strap, 'k')
        bag = poly([(bx0 - 2, by0 + 2), (bx0 + 14, by0 + 2), (bx0 + 16, by0 + 15), (bx0 - 3, by0 + 15)])
        shade(cv, bag, BAG, bias=0.1, band=1)
        for yy in range(int(by0 + 4), int(by0 + 15), 3):
            for xx in range(int(bx0 - 2), int(bx0 + 16)):
                if (xx, yy) in bag and (xx + yy) % 2: cv.set(xx, yy, 'k')
        clasp = disc(bx0 + 6, by0 + 4, 1.6)
        shade(cv, clasp, GOLD, band=1)
    arm_s = limb([(shoulder[0], shoulder[1], 5.2), ((shoulder[0] + hand[0]) / 2 + 1, (shoulder[1] + hand[1]) / 2, 4), (hand[0], hand[1], 3.2)], n=7)
    shade(cv, arm_s, REX, bias=0.6, grad=False)
    for p in edge_of(arm_s, (1, 1)): cv.setif(p[0], p[1], 't', 'uvw')
    for dy in (-2, 1.5):
        cw = polyline([(hand[0] + 1, hand[1] + dy), (hand[0] + 5, hand[1] + dy * 1.5 + 1)], r=0.7)
        shade(cv, cw, BONE, band=1)
    # a cuff of the dress on the arm
    cuff = disc(shoulder[0] + 1, shoulder[1], 5.4) - disc(shoulder[0] + 3, shoulder[1] + 2, 3)
    shade(cv, cuff & dilate(arm_s, 1), SHAWL, band=1)
    return cv


def frames(name, opts):
    out = []
    for o in opts:
        cv = Cv(WW, HH)
        draw(cv, o)
        out.append(cv.rows())
    return out


def build():
    S = {}
    S['grandma_idle'] = frames('idle', [
        dict(seed=3, bob=0, tail=0, jaw=0.05, bag=0),
        dict(seed=4, bob=-1, tail=-0.6, jaw=0.08, bag=1, sway=0.6, head_dy=-0.6, arm=0.3),
    ])
    S['grandma_walk'] = frames('walk', [
        dict(seed=5, bob=0, stride=5, legs=(4, 0), tail=0.8, bag=2, sway=1.4, jaw=0.06),
        dict(seed=6, bob=-2, stride=1, legs=(0, 0), tail=0.2, bag=0, sway=0.4, head_dy=-1, jaw=0.08),
        dict(seed=7, bob=0, stride=-5, legs=(0, 4), tail=-0.8, bag=-2, sway=-1.4, jaw=0.06),
        dict(seed=8, bob=-2, stride=-1, legs=(0, 0), tail=-0.2, bag=0, sway=-0.4, head_dy=-1, jaw=0.08),
    ])
    S['grandma_cry'] = frames('cry', [
        dict(seed=9, bob=1, head_rot=0.16, head_dy=4, closed=True, glasses=1, arms_up=1, arm=4, jaw=0.2, shake=-1),
        dict(seed=10, bob=2, head_rot=0.2, head_dy=5, closed=True, glasses=1, arms_up=1, arm=5, jaw=0.3, shake=1, tail=0.5),
    ])
    S['grandma_roar'] = frames('roar', [
        dict(seed=11, bob=-2, head_rot=-0.18, head_dy=-3, jaw=0.95, wig_up=4, glasses=-0.4, arm=-3, tail=-1.2, sway=-1),
        dict(seed=12, bob=-3, head_rot=-0.24, head_dy=-4, jaw=1.12, wig_up=6, glasses=-0.6, arm=-4, tail=-1.6, sway=-1.5),
    ])
    return S
