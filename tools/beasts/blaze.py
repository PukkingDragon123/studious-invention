import math, random
from pxlib import *
from pxlib import _cr

# charcoal hide with a dark-green cast, dark -> light
HIDE = ['0', '1', 't', 'u', 'v']
HIDE_BACK = ['0', '0', '1', 't', 'u']
BELLY = ['1', '2', '3', '4']
STONE = ['o', 'p', 'q', 'r', 's']
BONE = ['!', '@', '#', '$']
IRON = ['0', '1', '2', '3', '4', '5']
WARM = {'u': 'A', 'v': 'B', '2': 'z', 't': 'z', '1': 'y', '0': 'y',
        '3': 'A', '4': 'B', 'x': 'B'}
HIDEC = '01t2uvx'

def mkW(s, ox, oy):
    def W(x, y): return (ox + x * s, oy + y * s)
    return W

def rot_xf(W, rot, px, py, sx=1.0, sy=1.0):
    c = math.cos(rot); sn = math.sin(rot)
    def f(x, y):
        dx = (x - px) * sx; dy = (y - py) * sy
        return W(px + dx * c - dy * sn, py + dx * sn + dy * c)
    return f

def LN(T, nodes, s):
    return [(T(n[0], n[1])[0], T(n[0], n[1])[1], n[2] * s) for n in nodes]

def PL(T, pts): return [T(p[0], p[1]) for p in pts]

def ring(cx, cy, r, t): return disc(cx, cy, r) - disc(cx, cy, r - t)

def dilate(s, r=1):
    o = set(); rr = int(math.ceil(r))
    for (x, y) in s:
        for dx in range(-rr, rr + 1):
            for dy in range(-rr, rr + 1):
                if dx * dx + dy * dy <= r * r + 0.2: o.add((x + dx, y + dy))
    return o

def warm_glow(cv, ridge_pts, body, rng, depth=4, str_=1.0):
    """heat-tint the hide just under a burning ridge"""
    prob = [0.95, 0.7, 0.42, 0.2, 0.08]
    for (x, y) in _cr([(p[0], p[1]) for p in ridge_pts], 8):
        xi = int(round(x)); yi = int(round(y))
        for d in range(0, depth + 1):
            if rng.random() > prob[min(d, 4)] * str_: continue
            p = (xi, yi + d)
            if p not in body: continue
            c = cv.get(*p)
            if c in WARM: cv.set(p[0], p[1], WARM[c])

# ---------------------------------------------------------------- raptor foot
def raptor_foot(cv, W, s, ax, ay, tx, gy_row, ramp, back=4.5, lift=0.0, claw=True):
    a = W(ax, ay)
    g = gy_row - lift * s
    fx0 = W(tx - back, 0)[0]; fx1 = W(tx, 0)[0]
    pts = [(a[0] - 1.7 * s, a[1]), (a[0] + 1.7 * s, a[1]),
           (fx1 - 0.5 * s, g - 2.6 * s), (fx1 + 1.1 * s, g - 0.5 * s),
           (fx1 + 1.1 * s, g + 0.4 * s), (fx0 - 1.3 * s, g + 0.4 * s),
           (fx0 - 1.9 * s, g - 1.5 * s)]
    f = set(p for p in poly(pts) if p[1] <= gy_row)
    shade(cv, f, ramp, grad=False)
    for i in (1, 2):
        x = fx0 + (fx1 - fx0) * (i / 3.0) + 1.0 * s
        for k in range(int(round(2.2 * s))):
            cv.setif(x + k * 0.25, g - k, ramp[0], ''.join(ramp))
    if claw:
        for pts2 in ([(fx1 + 0.6 * s, g - 2.0 * s), (fx1 + 3.0 * s, g - 0.3 * s), (fx1 + 0.8 * s, g + 0.4 * s)],
                     [(fx0 - 1.4 * s, g - 1.7 * s), (fx0 - 3.4 * s, g - 0.2 * s), (fx0 - 1.0 * s, g + 0.4 * s)]):
            cl = set(p for p in poly(pts2) if p[1] <= gy_row)
            shade(cv, cl, BONE, grad=False)
    return f

# ---------------------------------------------------------------- head
def blaze_head(cv, W, s, o, HX, rng):
    jaw = o.get('jaw', 0.0)
    skull_pts = [(52, 22.0), (51.6, 17), (53.6, 13.6), (57.5, 12.2), (61.2, 12.2),
                 (64.4, 13.8), (65.8, 16.4), (69, 17.4), (72.6, 19.4), (74.2, 21.6),
                 (73.6, 23.8), (69, 24.4), (63, 24.6), (57, 24.6), (52.6, 24.2)]
    sk = poly(PL(HX, skull_pts))
    shade(cv, sk, HIDE, bias=-1, grad=True)
    for p in edge_of(sk, (-1, -1)): cv.setif(p[0], p[1], 'u', '01t')
    for p in edge_of(sk, (-1, 0)): cv.setif(p[0], p[1], 'u', '01t')
    ch = poly(PL(HX, [(52.2, 18.6), (57.5, 19.2), (58.5, 24.0), (52.2, 24.0)]))
    shade(cv, ch & sk, HIDE, bias=-2, grad=False)
    # heavy scowling brow
    br = poly(PL(HX, [(54.6, 14.6), (61.6, 13.6), (65.0, 15.2), (64.6, 17.6),
                      (60.6, 16.2), (54.8, 17.2)]))
    shade(cv, br & sk, HIDE, bias=1, grad=False)
    for p in edge_of(br & sk, (0, 1)): cv.set(p[0], p[1], '0')
    for p in edge_of(br & sk, (-1, -1)): cv.setif(p[0], p[1], 'u', '01t2u')
    # ---- lower jaw
    JX = rot_xf(HX, -jaw * 0.80, 52.8, 24.0)
    jaw_pts = [(52.2, 23.0), (58, 24.6), (64, 25.0), (70.8, 24.0), (71.8, 25.8),
               (67, 27.6), (61, 28.8), (55.5, 28.6), (51.8, 26.6)]
    jw = poly(PL(JX, jaw_pts))
    if jaw > 0.02:
        cav = poly([HX(53, 21.6), HX(73, 23.2), HX(73.6, 24.6),
                    JX(70.8, 24.2), JX(53.4, 25.4)])
        cav |= poly([HX(53, 22.6), HX(60, 24.0), JX(60, 25.0), JX(53, 25.4)])
        shade(cv, cav, ['D', 'D', 'E', 'y'], grad=False)
        # throat
        tr = ell(*HX(55.5, 24.0), 3.0 * s, 2.2 * s)
        flat(cv, tr & cav, 'D')
        tg = limb(LN(JX, [(55, 25.4, 1.9), (61, 24.8, 1.8), (66.5, 24.6, 1.2)], s), 6)
        shade(cv, tg & dilate(cav, 1), ['U', 'V', 'W', 'X'], grad=False)
    shade(cv, jw, HIDE, bias=-2, grad=True)
    for p in edge_of(jw, (-1, -1)): cv.setif(p[0], p[1], 't', '01')
    for p in edge_of(jw, (0, 1)): cv.setif(p[0], p[1], 'y', '01tuv')
    # ---- teeth (dark gum gaps so they read as teeth, not a white bar)
    TT = ((56.8, 2.1), (59.8, 3.0), (62.8, 2.5), (65.8, 3.0), (68.8, 2.2), (71.2, 1.6))
    for q in polyline(PL(HX, [(53.5, 22.5), (73.0, 22.5)]), max(0.5, 0.5 * s), 4):
        cv.setif(q[0], q[1], '0', '01tuv')
    for tx, th in TT:
        t = poly(PL(HX, [(tx - 1.05, 22.7), (tx + 1.05, 22.7), (tx, 22.7 + th)]))
        shade(cv, t, BONE, bias=1, grad=False)
    for i in range(len(TT) - 1):
        mx = (TT[i][0] + TT[i + 1][0]) / 2
        for dy in (0.0, 0.8, 1.7, 2.5):
            cv.setif(*HX(mx, 22.7 + dy), '0', '!@#$')
    if jaw > 0.02:
        LT = ((56.4, 2.0), (59.6, 2.6), (63.0, 2.2), (66.4, 2.6), (69.4, 1.8))
        for tx, th in LT:
            t = poly([JX(tx - 1.0, 25.1), JX(tx + 1.0, 25.1), JX(tx, 25.1 - th)])
            shade(cv, t, BONE, bias=1, grad=False)
        for i in range(len(LT) - 1):
            mx = (LT[i][0] + LT[i + 1][0]) / 2
            for dy in (0.0, 0.9, 1.8):
                cv.setif(*JX(mx, 25.1 - dy), '0', '!@#$')
    # ---- nostril
    shade(cv, poly(PL(HX, [(70.4, 19.4), (72.6, 20.2), (71.6, 21.6), (70.0, 20.8)])),
          ['0', '0', '1', 'y'], grad=False)
    # ---- old scar first, then the burning eye painted on top of it
    sc = polyline(PL(HX, [(55.6, 12.4), (57.0, 15.8), (59.4, 20.8), (61.8, 24.2)]),
                  max(0.6, 0.55 * s), 8)
    for q in dilate(sc, 1) - sc: cv.setif(q[0], q[1], '1', '01tuv')
    for q in sc: cv.setif(q[0], q[1], '4', '01tuv')
    for (sx, sy) in ((56.2, 14.0), (58.2, 18.6), (60.6, 22.4)):
        for k in (-1.4, 1.4):
            cv.setif(*HX(sx + k, sy - k * 0.42), '3', '01tuv')
    ey = ell(*HX(59.9, 18.0), 3.4 * s, 2.6 * s)
    flat(cv, dilate(ey, max(1.4, 1.4 * s)) - ey, '0')
    shade(cv, ey, ['z', 'A', 'B', 'C'], grad=False)
    flat(cv, ell(*HX(60.5, 18.0), max(0.5, 0.52 * s), 2.2 * s), '0')
    cv.set(*HX(58.5, 16.9), 'C')
    cv.set(*HX(58.5, 17.9), 'C')
    return sk | jw

# ---------------------------------------------------------------- full blaze
def draw_blaze(cv, s, ox, oy, o):
    rng = random.Random(o.get('seed', 1))
    W = mkW(s, ox + o.get('dx', 0.0), oy)
    gy = cv.h - 1
    bob = o.get('bob', 0.0)
    boss = o.get('boss', False)
    fsc = o.get('fire', 1.0)
    def B(x, y): return W(x, y + bob)

    # ---------------- far leg
    kx, ky, ax, ay, tx, lift = o.get('farleg', (40.0, 40.5, 31.5, 49.5, 35.0, 0.0))
    far = limb(LN(B, [(29.5, 33, 5.8), (kx, ky, 4.5), ((kx + ax) / 2 - 0.6, (ky + ay) / 2, 3.4),
                      (ax, ay, 2.7), (ax + (tx - ax) * 0.55, ay + 4.2, 2.3)], s), 8)
    shade(cv, far, HIDE_BACK, bias=-1, grad=False)
    raptor_foot(cv, B, s, ax + (tx - ax) * 0.6, ay + 5.0, tx, gy, HIDE_BACK, back=4.0, lift=lift)

    # ---------------- tail
    tdy = o.get('tail_dy', 0.0); tc = o.get('tail_curl', 0.0); tdx = o.get('tail_dx', 0.0)
    tail_nodes = [(21, 31, 9.0), (15.5, 30.0 + tc * 0.4, 7.2), (10.6 + tdx * 0.3, 27.6 + tc * 0.9, 5.4),
                  (7.0 + tdx * 0.6, 24.0 + tc * 1.3 + tdy * 0.5, 4.0),
                  (5.0 + tdx * 0.85, 19.6 + tdy * 0.8 + tc * 1.2, 2.8),
                  (4.4 + tdx, 15.0 + tdy * 1.2 + tc * 1.5, 1.6)]
    tail = limb(LN(B, tail_nodes, s), 10)
    shade(cv, tail, HIDE, bias=-1, grad=True)
    for p in edge_of(tail, (-1, -1)): cv.setif(p[0], p[1], 'u', '01t')
    for i in range(int(4 + 3 * s)):
        t = 0.12 + i * 0.75 / (3 + 3 * s)
        j = t * (len(tail_nodes) - 1); k = int(j); u = j - k
        n0 = tail_nodes[k]; n1 = tail_nodes[min(k + 1, len(tail_nodes) - 1)]
        px = n0[0] + (n1[0] - n0[0]) * u; py = n0[1] + (n1[1] - n0[1]) * u
        pr = (n0[2] + (n1[2] - n0[2]) * u)
        band = limb(LN(B, [(px, py - pr, 0.8), (px + 0.8, py + pr, 0.8)], s), 6) & tail
        shade(cv, band, HIDE, bias=-3, grad=False)

    # ---------------- body
    body = ell(*B(32, 31), 14.2 * s, 10.6 * s)
    body |= ell(*B(26.5, 32.5), 10.5 * s, 9.4 * s)
    body |= ell(*B(41.5, 30), 8.6 * s, 9.0 * s)
    body |= limb(LN(B, [(40, 24.5, 7.2), (45, 26, 6.8)], s), 6)
    shade(cv, body, HIDE, bias=-1, grad=True)
    for p in edge_of(body, (-1, -1)): cv.setif(p[0], p[1], 'u', '01t')
    for p in edge_of(body, (-1, 0)): cv.setif(p[0], p[1], 'u', '01t')
    bel = ell(*B(35, 36.5), 11.5 * s, 4.6 * s) & body
    shade(cv, bel, BELLY, bias=-1, grad=False)
    bx0, by0, bx1, by1 = bbox(bel)
    for x in range(bx0 + 1, bx1, max(2, int(round(2.6 * s)))):
        col = [p[1] for p in bel if p[0] == x]
        if not col: continue
        for y in range(min(col), max(col) + 1): cv.setif(x, y, '1', '234')
    under(cv, body, HIDE[0], depth=max(1, int(round(1.4 * s))))
    for p in edge_of(body, (1, 1)): cv.set(p[0], p[1], HIDE[0])
    # ribs / muscle striations
    for i in range(int(3 + 2 * s)):
        rx = 36 - i * 3.4
        rb = limb(LN(B, [(rx, 23.5 + i * 0.5, 0.75), (rx - 2.2, 30 + i * 0.4, 0.75)], s), 6) & body
        shade(cv, rb, HIDE, bias=-3, grad=False)
    # armour plates along the flank so the dark mass keeps its structure
    for i in range(int(round(5 + 3 * s))):
        t = i / (4 + 3 * s)
        px = 22 + t * 22; py = 26 + math.sin(t * 3.1) * 2.5
        pa = ell(*B(px, py), 3.0 * s, 2.1 * s) & body
        shade(cv, pa, HIDE, bias=0, grad=False)
        for q in edge_of(pa, (1, 1)): cv.setif(q[0], q[1], '0', '1tuv')
        for q in edge_of(pa, (-1, -1)): cv.setif(q[0], q[1], 'u', '01t')
    # scaly speckle
    speck(cv, body | tail, '0', 0.05, rng, want='tuv')
    speck(cv, body | tail, 'u', 0.05, rng, want='1t')

    # ---------------- soot patches + glowing cracks
    for i in range(int(7 + 9 * (s - 1))):
        px = rng.uniform(19, 46); py = rng.uniform(23, 37)
        bl = ell(*B(px, py), rng.uniform(1.8, 3.8) * s, rng.uniform(1.3, 2.8) * s) & (body | tail)
        for p in bl: cv.setif(p[0], p[1], '1', 'tuv')
        for p in bl: cv.setif(p[0], p[1], '0', '1')
        for p in (bl - dilate(edge_of(bl, (1, 1)) | edge_of(bl, (-1, -1)), 1)):
            cv.setif(p[0], p[1], '0', '1')
    crk = [[(24, 28), (27, 30), (26, 33), (29, 35)],
           [(34, 26), (37, 29), (35, 32)],
           [(41, 27), (44, 30), (42, 33)],
           [(18, 31), (21, 33), (19, 36)]]
    if boss: crk += [[(29, 23.5), (32, 27), (30, 30), (33, 32)], [(45, 33), (47, 36)],
                     [(13, 29), (16, 31), (14, 33)], [(36, 35), (39, 37)], [(9, 27), (11, 29)]]
    for c in crk:
        ln = polyline(PL(B, c), max(0.5, 0.45 * s), 6)
        for p in dilate(ln, 1) - ln:
            if p in body or p in tail: cv.setif(p[0], p[1], 'y', '01tuvx')
        for p in ln:
            if p in body or p in tail: cv.set(p[0], p[1], 'A' if rng.random() < 0.5 else 'z')
        p = B(*c[0]); cv.setif(p[0], p[1], 'B', 'zAy')

    # ---------------- near leg
    kx, ky, ax, ay, tx, lift = o.get('nearleg', (47.5, 41.5, 40.0, 51.0, 46.0, 0.0))
    near = limb(LN(B, [(38.5, 32.5, 7.2), (kx, ky, 5.2), ((kx + ax) / 2 + 0.6, (ky + ay) / 2, 3.9),
                       (ax, ay, 3.0), (ax + (tx - ax) * 0.55, ay + 4.4, 2.5)], s), 8)
    for p in dilate(near, 1) - near: cv.setif(p[0], p[1], '0', '01tuvx34')
    shade(cv, near, HIDE, bias=-1, grad=True)
    for p in edge_of(near, (-1, -1)): cv.setif(p[0], p[1], 'u', '01t')
    th = ell(*B(40.5, 34.5), 4.6 * s, 5.6 * s) & near
    shade(cv, th, HIDE, bias=0, grad=False)
    sh = limb(LN(B, [((kx + ax) / 2 + 0.6, (ky + ay) / 2, 2.0), (ax + 0.4, ay - 0.6, 1.6)], s), 8) & near
    shade(cv, sh, HIDE, bias=1, grad=False)
    for p in edge_of(th, (1, 1)): cv.setif(p[0], p[1], '1', 'tuv')
    speck(cv, near, '0', 0.05, rng, want='tuv')
    raptor_foot(cv, B, s, ax + (tx - ax) * 0.6, ay + 5.2, tx, gy, HIDE, back=4.5, lift=lift)

    # ---------------- neck
    HR = o.get('head_rot', 0.0); hdy = o.get('head_dy', 0.0)
    neck = limb(LN(B, [(42, 27.5, 6.6), (46, 25.0 + hdy * 0.3, 6.0),
                       (49.5, 23.0 + hdy * 0.7, 5.4), (53, 21.6 + hdy, 5.0)], s), 8)
    shade(cv, neck, HIDE, bias=-1, grad=True)
    for p in edge_of(neck, (1, 1)): cv.setif(p[0], p[1], HIDE[0], '01tuvx')
    for i in range(int(round(3 + 2 * s))):
        t = i / max(1.0, (2 + 2 * s))
        pl = ell(*B(43.5 + t * 9, 30.0 - t * 5.2 + hdy * t), 1.8 * s, 1.1 * s) & neck
        shade(cv, pl, HIDE, bias=-3, grad=False)

    # ---------------- head
    HX = rot_xf(lambda x, y: B(x, y + hdy), HR, 52.8, 22.0, 1.05, 1.16)
    head = blaze_head(cv, W, s, o, HX, rng)

    # ---------------- stone collar + snapped chain
    nx, ny = 48.2, 23.8 + hdy * 0.6
    axp, ayp = 0.50, 0.87
    col = limb(LN(B, [(nx - axp * 7.2, ny - ayp * 7.2, 1.7), (nx - axp * 2, ny - ayp * 2, 2.4),
                      (nx + axp * 3, ny + ayp * 3, 2.5), (nx + axp * 7.6, ny + ayp * 7.6, 1.8)], s), 8)
    col &= dilate(neck | head, max(1, int(1.2 * s)))
    shade(cv, col, ['o', 'p', 'q', 'r', 's'], grad=False)
    for p in edge_of(col, (1, 1)): cv.setif(p[0], p[1], '0', 'opqrs')
    for p in edge_of(col, (-1, -1)): cv.setif(p[0], p[1], 's', 'opqr')
    # studs
    for t in (0.22, 0.5, 0.78):
        sx = nx - axp * 7.0 + axp * 14.4 * t; sy = ny - ayp * 7.0 + ayp * 14.4 * t
        shade(cv, disc(*B(sx, sy), max(0.9, 0.95 * s)) & col, ['p', 'q', 'r', 's'], grad=False)
    for c in ([(46.6, 18.6), (47.8, 20.6), (46.8, 22.2)], [(50.4, 27.0), (51.6, 28.6)],
              [(48.8, 23.8), (49.8, 25.2)]):
        for p in polyline(PL(B, c), max(0.45, 0.4 * s), 6): cv.setif(p[0], p[1], 'o', 'opqrs')
    # ---------------- arm (chunky little raptor arm, drawn over the chain)
    aa = o.get('arm', 0.0)
    ar = limb(LN(B, [(43.2, 29.0, 4.0), (47.4 + aa, 33.4 + aa * 0.4, 3.0),
                     (50.2 + aa * 1.7, 37.0 - aa * 0.7, 2.4)], s), 8)
    hand = disc(*B(50.8 + aa * 1.8, 37.4 - aa * 0.8), 2.5 * s)
    ar |= hand
    for p in dilate(ar, 1) - ar: cv.setif(p[0], p[1], '0', '01tuvx345opqrs')
    shade(cv, ar, HIDE, bias=1, grad=False)
    for p in edge_of(ar, (-1, -1)): cv.setif(p[0], p[1], 'v', '01tu')
    for p in edge_of(ar, (1, 1)): cv.setif(p[0], p[1], '0', '1tuv')
    # elbow shadow so the arm separates from the chest
    shade(cv, ell(*B(47.4 + aa, 33.4 + aa * 0.4), 1.6 * s, 2.0 * s) & ar, HIDE, bias=-2, grad=False)
    for i, dy in enumerate((-1.7, 0.1, 1.8)):
        cw = polyline(PL(B, [(51.0 + aa * 1.8, 37.1 + dy - aa * 0.8),
                             (53.9 + aa * 2.0, 36.8 + dy * 1.6 - aa * 1.1)]), max(0.6, 0.62 * s), 6)
        for p in dilate(cw, 1) - cw: cv.setif(p[0], p[1], '0', '01tuvx')
        shade(cv, cw, BONE, grad=False)

    sw = o.get('chain', 0.0)
    links = [(50.6, 30.6), (49.2 + sw * 0.9, 34.2), (50.4 + sw * 1.9, 37.8),
             (49.0 + sw * 2.7, 41.4)]
    if boss: links += [(50.2 + sw * 3.4, 45.0), (48.8 + sw * 4.1, 48.4)]
    for i, (lx, ly) in enumerate(links):
        rr = ring(*B(lx, ly), 2.0 * s, max(1.0, 0.95 * s))
        if i == len(links) - 1:
            rr = set(p for p in rr if p[1] < B(lx, ly)[1] + 0.6 * s)
        for p in dilate(rr, 1) - rr: cv.setif(p[0], p[1], '0', '01tuv345opqrsx')
        shade(cv, rr, ['1', '2', '3', '4', '5'], bias=1, grad=False)

    # ---------------- FIRE
    ph = o.get('phase', 0.0)
    crest_p = PL(HX, [(52.8, 15.4), (55.6, 13.0), (59, 11.8), (62.2, 12.2), (64.8, 14.2)])
    nape_p = PL(B, [(45.5, 21.2), (48.5, 19.2), (51.2, 17.4 + hdy * 0.8)])
    spine_p = PL(B, [(19.5, 27.5), (24, 24.2), (29, 22), (34, 21), (39, 21.4), (43, 23.2)])
    tn = tail_nodes
    tail_p = PL(B, [(tn[-3][0] - 0.6, tn[-3][1] + 0.6), (tn[-2][0] - 0.5, tn[-2][1] - 0.2),
                    (tn[-1][0] - 0.2, tn[-1][1] - 0.6)])
    allbody = body | tail | neck | head | near
    for rp, st, dp in ((crest_p, 0.55, 2), (nape_p, 0.6, 2), (spine_p, 0.85, 3), (tail_p, 0.8, 3)):
        warm_glow(cv, rp, allbody, rng, depth=dp, str_=st)

    hs = 1.30 if boss else 1.0
    crest = fire_ridge(crest_p, rng, 7.5 * s * fsc * hs, 12.4 * s * fsc * hs, 2.4 * s,
                       step=2.5 * s, sway=-2.6 * s, phase=ph, base=1.5 * s)
    nape = fire_ridge(nape_p, rng, 4.0 * s * fsc, 7.5 * s * fsc, 2.0 * s,
                      step=2.7 * s, sway=-2.8 * s, phase=ph + 1.1, base=1.1 * s)
    spine = fire_ridge(spine_p, rng, (5.5 if not boss else 8) * s * fsc,
                       (11 if not boss else 15.5) * s * fsc, 2.2 * s,
                       step=3.0 * s, sway=-3.0 * s, phase=ph + 2.2, base=1.2 * s)
    tf = fire_ridge(tail_p, rng, 5 * s * fsc, 10.5 * s * fsc, 1.9 * s,
                    step=2.3 * s, sway=-1.3 * s, phase=ph + 3.3, base=1.0 * s)
    fire = {}
    for f in (spine, nape, crest, tf): merge_fire(fire, f)
    if o.get('gout', 0):
        g = o['gout']
        mx, my = HX(70.5, 23.4)
        ang = HR - 0.16
        merge_fire(fire, flame_jet(mx, my, ang, (7.4 + 1.3 * g) * s, 2.6 * s, (4.0 + 0.9 * g) * s,
                                   rng, phase=ph, wob=1.3))
        for k in range(5):
            t = rng.uniform(0.2, 1.0)
            merge_fire(fire, flame_px(mx + math.cos(ang) * 7 * s * t + rng.uniform(-2, 1.4) * s,
                                      my + math.sin(ang) * 7 * s * t + rng.uniform(0, 3) * s,
                                      rng.uniform(5, 9.0) * s, rng.uniform(1.6, 2.4) * s,
                                      sway=rng.uniform(-2, 2) * s, wob=rng.uniform(-1.5, 1.5),
                                      phase=ph + k * 1.7))
    paint_fire(cv, fire)
    return cv
