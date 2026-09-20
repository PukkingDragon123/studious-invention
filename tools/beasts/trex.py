import math, random
from pxlib import *
from pxlib import _cr
from blaze import mkW, rot_xf, LN, PL, ring, dilate

REX = ['t', 'u', 'v', 'w', 'x']          # olive green, dark -> light
REXB = ['t', 't', 'u', 'v', 'w']         # far-side limbs
BELLY = ['u', 'v', 'w', 'x']
BONE = ['!', '@', '#', '$']
GUM = ['D', 'E', 'F', 'G']

def rex_foot(cv, W, s, ax, ay, tx, gy_row, ramp, back=12.0, lift=0.0):
    a = W(ax, ay); g = gy_row - lift * s
    fx0 = W(tx - back, 0)[0]; fx1 = W(tx, 0)[0]
    f = set(p for p in poly([(a[0] - 3.4 * s, a[1]), (a[0] + 3.4 * s, a[1]),
                             (fx1 - 1.0 * s, g - 7.0 * s), (fx1 + 2.6 * s, g - 1.4 * s),
                             (fx1 + 2.6 * s, g + 0.4 * s), (fx0 - 3.0 * s, g + 0.4 * s),
                             (fx0 - 4.4 * s, g - 4.2 * s)]) if p[1] <= gy_row)
    shade(cv, f, ramp, grad=False)
    for i in (1, 2):
        x = fx0 + (fx1 - fx0) * (i / 3.0) + 1.5 * s
        for k in range(int(round(4.5 * s))):
            cv.setif(x + k * 0.3, g - k, ramp[0], ''.join(ramp) + '0')
    for pts in ([(fx1 + 1.0 * s, g - 3.6 * s), (fx1 + 5.2 * s, g - 0.4 * s), (fx1 + 1.2 * s, g + 0.4 * s)],
                [(fx0 - 2.6 * s, g - 3.0 * s), (fx0 - 6.0 * s, g - 0.2 * s), (fx0 - 2.0 * s, g + 0.4 * s)]):
        cl = set(p for p in poly(pts) if p[1] <= gy_row)
        for p in dilate(cl, 1) - cl: cv.setif(p[0], p[1], 't', 'uvwx$')
        shade(cv, cl, BONE, grad=False)
    return f

def rex_head(cv, s, HX, jaw, rng, scar=True):
    JX = rot_xf(HX, -jaw * 0.80, 92.0, 33.5)
    skull = [(88, 33), (88.5, 23), (91, 15.6), (96, 10.4), (102.5, 7.8), (109, 8.4),
             (113.6, 11.6), (115.0, 15.8), (118.4, 16.6), (122.2, 19.4), (124.6, 23.4),
             (124.4, 28.4), (121.6, 31.4), (116, 32.6), (107, 33.4), (98, 33.8), (91, 34.0)]
    sk = poly(PL(HX, skull))
    shade(cv, sk, REX, bias=-1.1, grad=True)
    # cheek mass
    shade(cv, poly(PL(HX, [(89.5, 22), (99, 23.5), (101, 32), (89.5, 32)])) & sk, REX, bias=-2, grad=False)
    # brow ridge
    br = poly(PL(HX, [(99.6, 13.6), (110, 11.6), (114.4, 14.0), (114.0, 18.0),
                      (108.5, 15.4), (99.8, 16.8)]))
    shade(cv, br & sk, REX, bias=1, grad=False)
    for p in edge_of(br & sk, (0, 1)): cv.set(p[0], p[1], 't')
    for p in edge_of(br & sk, (-1, -1)): cv.setif(p[0], p[1], 'x', 'tuvw')
    # nasal ridge
    nr = poly(PL(HX, [(115.4, 17.8), (121.4, 20.0), (125.2, 23.6), (124.4, 25.6),
                      (120.4, 22.4), (115.4, 20.4)]))
    shade(cv, nr & sk, REX, bias=1, grad=False)
    # ---- lower jaw
    jw = poly([JX(*p) for p in [(89.4, 31.8), (99, 34.6), (109, 35.6), (118.4, 34.8),
                                (123.6, 32.0), (124.6, 36.4), (119, 40.4), (109, 42.4),
                                (98, 42.0), (90.4, 38.4)]])
    if jaw > 0.03:
        cav = poly([HX(90, 29), HX(124, 29.8), HX(125.6, 31.6),
                    JX(124.6, 32.4), JX(92, 35.6)])
        cav |= poly([HX(90, 30), HX(102, 32.5), JX(102, 35.0), JX(90, 35.5)])
        shade(cv, cav, ['D', 'D', 'E', 'y'], grad=False)
        thr = ell(*HX(95.5, 32.2), 6.0 * s, 4.4 * s) & cav
        shade(cv, thr, ['D', 'D', 'E', 'F'], grad=False)
        tg = limb([(JX(97, 35.4)[0], JX(97, 35.4)[1], 3.6 * s),
                   (JX(107, 34.6)[0], JX(107, 34.6)[1], 3.2 * s),
                   (JX(116, 34.2)[0], JX(116, 34.2)[1], 2.2 * s),
                   (JX(121, 34.0)[0], JX(121, 34.0)[1], 1.2 * s)], 8)
        shade(cv, tg & dilate(cav, 2), ['U', 'V', 'W', 'X'], grad=False)
    shade(cv, jw, REX, bias=-2, grad=True)
    for p in edge_of(jw, (0, 1)): cv.setif(p[0], p[1], 't', 'uvwx')
    # gums + teeth (visible even closed)
    for p in polyline(PL(HX, [(93, 31.6), (122, 30.6)]), 0.6 * s, 6): cv.setif(p[0], p[1], 'D', 'tuvwx')
    UT = ((96, 1.8), (100.5, 2.4), (105, 2.8), (109.5, 2.6), (114, 2.8), (118.5, 2.2), (122, 1.6))
    for tx, th in UT:
        t = poly(PL(HX, [(tx - 1.9, 30.6), (tx + 1.9, 30.6), (tx + 0.2, 30.6 + th)]))
        shade(cv, t, BONE, bias=1, grad=False)
    for i in range(len(UT) - 1):
        mx = (UT[i][0] + UT[i + 1][0]) / 2
        for dy in (0.0, 1.0, 2.0, 3.0, 4.0): cv.setif(*HX(mx, 30.8 + dy), '!', '@#$')
        for dy in (0.0, 1.0, 2.0, 3.0): cv.setif(*HX(mx, 30.8 + dy), 'D', '!')
    LT = ((97, 1.4), (102, 1.9), (107, 2.2), (112, 2.0), (117, 1.8), (121, 1.4))
    for tx, th in LT:
        t = poly([JX(tx - 1.7, 33.6), JX(tx + 1.7, 33.6), JX(tx + 0.2, 33.6 - th)])
        if jaw > 0.03 or tx > 112: shade(cv, t, BONE, bias=1, grad=False)
    if jaw > 0.03:
        for i in range(len(LT) - 1):
            mx = (LT[i][0] + LT[i + 1][0]) / 2
            for dy in (0.0, 1.0, 2.0, 3.0): cv.setif(*JX(mx, 33.4 - dy), 'D', '!@#$')
    # nostril
    shade(cv, poly(PL(HX, [(121.4, 21.6), (124.4, 23.0), (123.4, 25.4), (120.6, 24.0)])),
          ['t', 't', '1', '0'], grad=False)
    # eye: one black dot, and a brow ridge you could shelter under
    ey = ell(*HX(106.4, 19.4), 3.4 * s, 3.2 * s)
    flat(cv, dilate(ey, max(1.0, 1.0 * s)) - ey, 't')
    flat(cv, ey, '0')
    flat(cv, ell(*HX(105.4, 18.4), 1.2 * s, 1.1 * s), '7')          # a catchlight
    flat(cv, ell(*HX(107.6, 20.6), 0.7 * s, 0.6 * s), '6')
    br = ell(*HX(106.0, 13.6), 3.8 * s, 1.1 * s)   # a shelf, not a scowl
    flat(cv, dilate(br, max(1.0, 1.0 * s)) - br, 't')
    flat(cv, br, 't')
    # scars across the snout
    if scar:
        for c in ([(112.5, 19.0), (116.5, 23.0), (118.0, 27.0)],
                  [(119.5, 20.6), (122.0, 24.4)],
                  [(99.0, 25.0), (103.0, 28.5)]):
            ln = polyline(PL(HX, c), max(0.6, 0.6 * s), 6)
            for p in dilate(ln, 1) - ln: cv.setif(p[0], p[1], 't', 'uvwx')
            for p in ln: cv.setif(p[0], p[1], 'x', 'tuvw')
        for (sx, sy) in ((114.5, 21.0), (117.3, 25.0)):
            for k in (-1.5, 1.5): cv.setif(*HX(sx + k, sy - k * 0.5), 'w', 'tuv')
    return sk | jw

def draw_trex(cv, s, ox, oy, o):
    rng = random.Random(o.get('seed', 5))
    W = mkW(s, ox + o.get('dx', 0.0), oy)
    gy = cv.h - 1
    bob = o.get('bob', 0.0)
    def B(x, y): return W(x, y + bob)

    # -------- far leg
    kx, ky, ax, ay, tx, lift = o.get('farleg', (64.0, 74.0, 50.0, 88.0, 74.0, 0.0))
    far = limb(LN(B, [(47, 50, 15.6), (kx, ky, 9.6), ((kx + ax) / 2 - 1.5, (ky + ay) / 2, 6.8),
                      (ax, ay, 5.0), (ax + (tx - ax) * 0.5, ay + 7.0, 4.4)], s), 9)
    shade(cv, far, REXB, bias=-1.3, grad=False)
    rex_foot(cv, B, s, ax + (tx - ax) * 0.55, ay + 8.0, tx, gy, REXB, back=11.0, lift=lift)

    # -------- tail
    tdy = o.get('tail_dy', 0.0); tc = o.get('tail_curl', 0.0)
    tn = [(31, 49, 18.5), (22, 45 + tc * 0.4, 13.0), (15, 41 + tc * 1.0 + tdy * 0.3, 8.4),
          (9, 38 + tc * 1.6 + tdy * 0.7, 4.6), (4.2, 35.5 + tc * 2.1 + tdy * 1.1, 2.4),
          (1.0, 33.5 + tc * 2.5 + tdy * 1.4, 1.0)]
    tail = limb(LN(B, tn, s), 10)
    shade(cv, tail, REX, bias=-1.2, grad=True)

    # -------- body
    body = ell(*B(55, 47), 32 * s, 21.5 * s)
    body |= ell(*B(41, 49), 22 * s, 19 * s)
    body |= ell(*B(62, 56), 25 * s, 16 * s)                         # the gut, hanging
    body |= ell(*B(75, 44), 18 * s, 17 * s)
    body |= limb(LN(B, [(69, 31, 14.5), (79, 33, 14.5)], s), 6)
    shade(cv, body, REX, bias=-1.2, grad=True)
    # lighter belly
    bel = set(p for p in (ell(*B(57, 60), 29 * s, 14 * s) & body) if p[1] > B(0, 47)[1])
    shade(cv, bel, BELLY, bias=-0.5, grad=False, band=1)
    for i in range(9):
        x0 = B(36 + i * 5.2, 0)[0]
        col = [q[1] for q in bel if abs(q[0] - x0) < 0.6]
        if col:
            for yy in range(min(col), max(col) + 1): cv.setif(x0, yy, 'u', 'vwx')
    under(cv, body, 't', depth=max(2, int(round(2.4 * s))))
    for p in edge_of(body, (1, 1)): cv.set(p[0], p[1], 't')
    for p in edge_of(body, (1, 1)):
        if rng.random() < 0.6: cv.set(p[0], p[1], '1')
    # dorsal ridge bumps
    for i in range(9):
        t = i / 8.0
        bx = 28 + t * 50; by = 40 - math.sin(t * 3.14159) * 12 - 1
        bp = ell(*B(bx, by), 2.6 * s, 2.0 * s)
        shade(cv, bp, REX, bias=1, grad=False)
    # flank stripes + speckle
    for i in range(7):
        sx = 32 + i * 7.5
        st = limb(LN(B, [(sx, 30 + abs(i - 3) * 1.4, 1.9), (sx - 5, 43 + abs(i - 3), 1.5)], s), 8) & body
        shade(cv, st, REX, bias=-3, grad=False)
    speck(cv, body | tail, 'u', 0.018, rng, want='w')

    for q in polyline(PL(B, [(33, 34), (30, 46), (33, 58)]), 1.0 * s, 8):
        cv.setif(q[0], q[1], 't', 'uvwx')
    # -------- near leg
    kx, ky, ax, ay, tx, lift = o.get('nearleg', (78.0, 76.0, 62.0, 90.0, 90.0, 0.0))
    near = limb(LN(B, [(58, 52, 18.5), (kx, ky, 11.8), ((kx + ax) / 2 + 1.5, (ky + ay) / 2, 8.0),
                       (ax, ay, 5.8), (ax + (tx - ax) * 0.5, ay + 7.4, 5.0)], s), 9)
    for p in dilate(near, 1) - near: cv.setif(p[0], p[1], 't', 'uvwx$1')
    shade(cv, near, REX, bias=-1.2, grad=True)
    thg = ell(*B(62, 55), 12.0 * s, 14.5 * s) & near
    shade(cv, thg, REX, bias=0, grad=False)
    for p in edge_of(thg, (1, 1)): cv.setif(p[0], p[1], 't', 'uvw')
    speck(cv, near, 'u', 0.018, rng, want='w')
    rex_foot(cv, B, s, ax + (tx - ax) * 0.55, ay + 8.4, tx, gy, REX, back=13.0, lift=lift)

    # -------- tiny arm
    aa = o.get('arm', 0.0)
    ar = limb(LN(B, [(79, 42, 6.4), (85 + aa, 48 + aa * 0.4, 4.6), (88.5 + aa * 1.6, 53.5 - aa * 0.6, 3.4)], s), 8)
    ar |= disc(*B(89 + aa * 1.7, 54 - aa * 0.7), 3.6 * s)
    for p in dilate(ar, 1) - ar: cv.setif(p[0], p[1], 't', 'uvwx$')
    shade(cv, ar, REX, bias=1, grad=False)
    for p in edge_of(ar, (1, 1)): cv.setif(p[0], p[1], 't', 'uvw')
    for dy in (-2.4, 1.8):
        cw = polyline(PL(B, [(89.4 + aa * 1.7, 53.8 + dy - aa * 0.7),
                             (94.4 + aa * 1.9, 53.2 + dy * 1.7 - aa * 1.0)]), max(0.7, 0.8 * s), 6)
        for p in dilate(cw, 1) - cw: cv.setif(p[0], p[1], 't', 'uvwx')
        shade(cv, cw, BONE, grad=False)

    # -------- neck + head
    HR = o.get('head_rot', 0.0); hdy = o.get('head_dy', 0.0); hdx = o.get('head_dx', 0.0)
    neck = limb(LN(B, [(73, 39, 16.6), (80, 35 + hdy * 0.25, 15.2),
                       (86 + hdx * 0.4, 31 + hdy * 0.6, 13.8),
                       (92 + hdx * 0.8, 29 + hdy, 12.4)], s), 8)
    shade(cv, neck, REX, bias=-1.2, grad=True)
    for p in edge_of(neck, (1, 1)): cv.setif(p[0], p[1], 't', 'uvwx')
    for i in range(4):
        t = i / 3.0
        pl = ell(*B(77 + t * 14 + hdx * t * 0.8, 42 - t * 10 + hdy * t), 3.6 * s, 2.3 * s) & neck
        shade(cv, pl, REX, bias=-3, grad=False)
    HX = rot_xf(lambda x, y: B(x + hdx, y + hdy), HR, 92.0, 30.0, 1.22, 1.30)
    rex_head(cv, s, HX, o.get('jaw', 0.0), rng, scar=False)
    return cv

def add_trex(add):
    S, OX, OY = 1.0, 0.0, 0.0
    def rex(cv, o): draw_trex(cv, S, OX, OY, o)
    IN = (76.0, 72.0, 61.0, 89.0, 90.0, 0.0)
    IF = (58.0, 71.0, 44.0, 87.0, 70.0, 0.0)
    add('trex_idle', 128, 104, [
        dict(seed=5, bob=0.0, nearleg=IN, farleg=IF, arm=0.0, jaw=0.06),
        dict(seed=6, bob=-1.4, nearleg=IN, farleg=IF, arm=0.8, jaw=0.16, head_dy=-1.2,
             head_rot=-0.03, tail_dy=-1.2, tail_curl=-0.5),
    ], rex)
    NC = [(80.0, 70.0, 67.0, 87.0, 97.0, 0.0),
          (74.0, 73.0, 58.0, 90.0, 87.0, 0.0),
          (66.0, 75.0, 48.0, 89.0, 76.0, 0.0),
          (82.0, 66.0, 71.0, 82.0, 99.0, 10.0)]
    FC = [(54.0, 74.0, 39.0, 88.0, 63.0, 0.0),
          (64.0, 66.0, 53.0, 81.0, 78.0, 9.0),
          (62.0, 70.0, 48.0, 87.0, 74.0, 0.0),
          (57.0, 73.0, 42.0, 88.0, 66.0, 0.0)]
    BOB = [1.2, -1.4, 1.2, -1.4]
    TC = [1.8, 0.4, -1.8, -0.4]
    add('trex_walk', 128, 104, [
        dict(seed=10 + i * 3, bob=BOB[i], nearleg=NC[i], farleg=FC[i], arm=[0.9, 0.2, -0.9, -0.2][i],
             tail_curl=TC[i], tail_dy=TC[i] * 0.5, head_dy=BOB[i] * 0.7, head_rot=TC[i] * 0.02,
             jaw=0.10 + 0.06 * (i % 2))
        for i in range(4)
    ], rex)
    add('trex_roar', 128, 104, [
        dict(seed=21, bob=-0.8, nearleg=(78.0, 71.0, 63.0, 88.0, 94.0, 0.0),
             farleg=(58.0, 73.0, 43.0, 88.0, 68.0, 0.0), jaw=1.0, head_rot=0.20,
             head_dy=3.0, head_dx=-2.0, arm=-1.4, tail_curl=-2.0, tail_dy=-1.4),
        dict(seed=22, bob=-1.8, nearleg=(78.0, 71.0, 63.0, 88.0, 94.0, 0.0),
             farleg=(58.0, 73.0, 43.0, 88.0, 68.0, 0.0), jaw=1.16, head_rot=0.26,
             head_dy=4.4, head_dx=-3.2, arm=-1.8, tail_curl=-2.8, tail_dy=-2.2),
    ], rex)
