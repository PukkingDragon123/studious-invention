import math, random
from pxlib import *
from pxlib import _cr
from blaze import mkW, rot_xf, LN, PL, ring, dilate

FUR = ['f', 'g', 'h', 'i', 'n']          # red-brown, dark -> light
FURB = ['f', 'f', 'g', 'h', 'i']         # far side
SKIN = ['f', 'g', 'h', 'i']
BONE = ['!', '@', '#', '$']
WOOD = ['j', 'k', 'l', 'm', 'n']
CLAY = ['y', 'z', 'A', 'B']
STONE = ['o', 'p', 'q', 'r', 's']

# ------------------------------------------------------------------ fur
def fringe(s, rng, step=5, lo=3, hi=7, side='bottom'):
    """ragged tufts of hair hanging off an edge of the silhouette"""
    add = set()
    if side == 'bottom':
        cols = {}
        for (x, y) in s: cols[x] = max(cols.get(x, -999), y)
        xs = sorted(cols)
        i = rng.randrange(0, step)
        while i < len(xs) - 1:
            x = xs[i]; y = cols[x]
            L = rng.randint(lo, hi); w = rng.randint(2, 4)
            add |= poly([(x - w, y - 1), (x + w, y - 1), (x + rng.randint(-2, 2), y + L)])
            i += step + rng.randint(-1, 1)
    else:
        rows = {}
        for (x, y) in s: rows[y] = min(rows.get(y, 9999), x)
        ys = sorted(rows)
        i = rng.randrange(0, step)
        while i < len(ys) - 1:
            y = ys[i]; x = rows[y]
            L = rng.randint(lo, hi); w = rng.randint(2, 4)
            add |= poly([(x + 1, y - w), (x + 1, y + w), (x - L, y + rng.randint(-2, 2))])
            i += step + rng.randint(-1, 1)
    return add

def shag(cv, region, rng, ramp, rowh=8, tw=12, depth=6, dk=2, lt=2, lp=0.5):
    """layered locks of hair. Each lock darkens/lightens RELATIVE to the tone that
       is already there, so the fur texture never flattens the body's form."""
    if not region: return
    idx = {}
    for i, c in enumerate(ramp): idx.setdefault(c, i)
    x0, y0, x1, y1 = bbox(region)
    y = y0 + 2
    while y < y1 + 2:
        x = x0 - rng.randrange(0, tw)
        while x < x1 + tw:
            w = max(5, tw + rng.randint(-3, 3))
            d = max(3, depth + rng.randint(-2, 2))
            for p in polyline([(x, y - 1), (x + w * 0.45, y + d), (x + w, y - 1)], 0.6, 6):
                if p in region:
                    c = cv.get(p[0], p[1])
                    if c in idx: cv.set(p[0], p[1], ramp[max(0, idx[c] - dk)])
            for p in polyline([(x + 1.4, y - 2.2), (x + w * 0.42, y + d - 2.6)], 0.55, 5):
                if p in region and rng.random() < lp:
                    c = cv.get(p[0], p[1])
                    if c in idx: cv.set(p[0], p[1], ramp[min(len(ramp) - 1, idx[c] + lt)])
            x += w - 2
        y += rowh + rng.randint(-2, 2)

def mam_foot(cv, W, s, fx, gy_row, ramp, w=8.0, lift=0.0):
    g = gy_row - lift * s
    x = W(fx, 0)[0]
    f = set(p for p in poly([(x - w * s, g - 5 * s), (x + w * s, g - 5 * s),
                             (x + (w + 0.8) * s, g - 1.2 * s), (x + (w + 0.8) * s, g + 0.4 * s),
                             (x - (w + 0.8) * s, g + 0.4 * s), (x - (w + 0.8) * s, g - 1.2 * s)])
            if p[1] <= gy_row)
    shade(cv, f, ramp, grad=False)
    for i in range(3):
        nx = x + (i - 1) * w * 0.72 * s
        n = set(p for p in ell(nx, g - 0.4 * s, w * 0.28 * s, 1.7 * s) if p[1] <= gy_row)
        for p in dilate(n, 1) - n: cv.setif(p[0], p[1], ramp[0], ''.join(ramp))
        shade(cv, n, BONE, grad=False)
    return f

def draw_mammoth(cv, s, ox, oy, o):
    rng = random.Random(o.get('seed', 3))
    W = mkW(s, ox, oy)
    gy = cv.h - 1
    bob = o.get('bob', 0.0)
    def B(x, y): return W(x, y + bob)
    LG = o.get('legs', [(34, 0.0), (74, 0.0), (29, 0.0), (80, 0.0)])

    # ---- far pair of legs
    for (lx, lift) in LG[:2]:
        lg = limb(LN(B, [(lx + 2, 56, 7.4), (lx + 1, 66, 6.6), (lx, 76 - lift, 6.0),
                         (lx, 82 - lift, 5.8)], s), 8)
        lg |= fringe(lg, rng, step=4, lo=2, hi=4, side='bottom')
        shade(cv, lg, FURB, bias=-1.2, grad=False)
        shag(cv, lg, rng, FURB, rowh=7, tw=9, depth=4, lp=0.4)
        mam_foot(cv, B, s, lx, gy, FURB, w=6.6, lift=lift)

    # ---- tail
    tl = limb(LN(B, [(22, 42, 3.2), (15, 50, 2.4), (11, 60 + o.get('tail', 0.0), 1.8)], s), 8)
    tl |= disc(*B(10.6, 63 + o.get('tail', 0.0)), 3.4 * s)
    shade(cv, tl, FUR, bias=-1, grad=False)

    # ---- body: barrel + shoulder hump, with a shaggy fringe
    body = ell(*B(52, 44), 32 * s, 22 * s)
    body |= ell(*B(66, 32), 18 * s, 14 * s)
    body |= ell(*B(34, 44), 20 * s, 19 * s)
    body |= fringe(body, rng, step=5, lo=4, hi=9, side='bottom')
    body |= fringe(body, rng, step=6, lo=3, hi=8, side='left')
    shade(cv, body, FUR, bias=-0.2, grad=True, gw=0.5)
    under(cv, body, 'f', depth=max(1, int(round(1.4 * s))))
    shag(cv, body, rng, FUR, rowh=9, tw=14, depth=7, lp=0.45)
    # cape of longer hair over the shoulders
    cape = ell(*B(62, 34), 20 * s, 15 * s) & body
    shade(cv, cape, FUR, bias=0.5, grad=True)
    shag(cv, cape, rng, FUR, rowh=8, tw=11, depth=8, lp=0.5)
    for p in edge_of(cape, (1, 1)): cv.setif(p[0], p[1], 'f', 'ghin')

    # ---- near pair of legs
    for (lx, lift) in LG[2:]:
        lg = limb(LN(B, [(lx, 56, 9.0), (lx - 1, 66, 8.2), (lx - 1, 78 - lift, 7.4),
                         (lx - 1, 84 - lift, 7.2)], s), 8)
        lg |= fringe(lg, rng, step=4, lo=2, hi=5, side='bottom')
        for p in dilate(lg, 1) - lg: cv.setif(p[0], p[1], 'f', 'ghin')
        shade(cv, lg, FUR, bias=0, grad=True)
        shag(cv, lg, rng, FUR, rowh=8, tw=10, depth=5, lp=0.45)
        mam_foot(cv, B, s, lx - 1, gy, FUR, w=8.0, lift=lift)

    cargo = o.get('cargo')
    if cargo: cargo(cv, s, B, body, rng)
    # ---- head + domed crown
    hdx = o.get('head_dx', 0.0); hdy = o.get('head_dy', 0.0)
    def H(x, y): return B(x + hdx, y + hdy)
    head = ell(*H(93, 42), 15 * s, 15 * s)
    head |= ell(*H(94, 28), 11.5 * s, 10.5 * s)
    head |= ell(*H(98, 50), 10 * s, 9 * s)
    head |= fringe(head, rng, step=5, lo=3, hi=6, side='bottom')
    for p in dilate(head, 1) - head: cv.setif(p[0], p[1], 'f', 'ghin')
    shade(cv, head, FUR, bias=0.2, grad=True)
    shag(cv, head, rng, FUR, rowh=7, tw=9, depth=5, lp=0.45)
    # crown topknot
    tk = ell(*H(94, 20), 8.5 * s, 5.5 * s)
    tk |= fringe(tk, rng, step=3, lo=2, hi=5, side='bottom')
    shade(cv, tk, FUR, bias=1, grad=False)
    shag(cv, tk, rng, FUR, rowh=5, tw=7, depth=4, lp=0.5)
    for q in polyline(PL(H, [(82, 22), (84, 30), (83, 38)]), 1.2 * s, 8):
        cv.setif(q[0], q[1], 'f', 'ghin')
    # ear flap
    ear = ell(*H(85, 41), 5.5 * s, 7.2 * s)
    ear |= poly([H(85, 34), H(90, 37), H(85, 48)])
    for p in dilate(ear, 1) - ear: cv.setif(p[0], p[1], 'f', 'ghin')
    shade(cv, ear, SKIN, bias=-0.5, grad=True)
    for p in edge_of(ear, (1, 1)): cv.setif(p[0], p[1], 'f', 'ghi')
    # eye: a black dot with a shaggy brow over it
    ey = ell(*H(99, 40), 2.2 * s, 2.2 * s)
    flat(cv, dilate(ey, max(1.0, 1.0 * s)) - ey, 'f')
    flat(cv, ey, '0')
    br = ell(*H(98.6, 36.4), 3.6 * s, 1.3 * s)
    flat(cv, br, '0')

    # ---- far tusk (behind the trunk)
    ft = limb(LN(H, [(96, 53, 2.4), (103, 60, 2.4), (110, 58, 2.0), (113, 51, 1.5),
                     (111.5, 46, 0.8)], s), 10)
    for p in dilate(ft, 1) - ft: cv.setif(p[0], p[1], 'f', 'ghin!@#$')
    shade(cv, ft, ['!', '!', '@', '#'], grad=False)

    # ---- trunk (drawn in front of the tusks when it is raised)
    tn = o.get('trunk', TRUNK_IDLE)
    def draw_trunk():
        tr = limb(LN(H, tn, s), 12)
        for p in dilate(tr, 1) - tr: cv.setif(p[0], p[1], 'f', 'ghin!@#$KLJPO')
        shade(cv, tr, SKIN, bias=0.2, grad=True)
        for p in edge_of(tr, (1, 1)): cv.setif(p[0], p[1], 'f', 'ghi')
        for p in edge_of(tr, (-1, -1)): cv.setif(p[0], p[1], 'i', 'fgh')
        pts = _cr([(n[0], n[1], n[2]) for n in tn], 6)
        for i in range(2, len(pts) - 2, 2):
            x, y, r = pts[i]
            px, py, _ = pts[i + 1]
            dx = px - x; dy = py - y; L = max(0.01, math.hypot(dx, dy))
            nx, ny = -dy / L, dx / L
            band = polyline([H(x - nx * r, y - ny * r), H(x + nx * r, y + ny * r)],
                            max(0.5, 0.5 * s), 6)
            for p in band & tr: cv.setif(p[0], p[1], 'f', 'ghin')
            for p in band & tr:
                q = (p[0] - 1, p[1] - 1)
                if q in tr: cv.setif(q[0], q[1], 'i', 'gh')
        return tr
    front = o.get('trunk_front', False)
    tr = None
    if not front: tr = draw_trunk()
    # ---- near tusk
    nt = o.get('tusk', [(99, 56, 3.2), (107, 65, 3.2), (115, 64, 2.7), (119, 55, 2.0), (117, 47, 1.1)])
    tk2 = limb(LN(H, nt, s), 12)
    for p in dilate(tk2, 1) - tk2: cv.setif(p[0], p[1], 'f', 'ghin!@#$')
    shade(cv, tk2, BONE, bias=0.3, grad=True)
    for p in edge_of(tk2, (-1, -1)): cv.setif(p[0], p[1], '$', '!@#')
    for p in edge_of(tk2, (1, 1)): cv.setif(p[0], p[1], '!', '@#$')
    if front: tr = draw_trunk()
    cb = o.get('after')
    if cb: cb(cv, s, B, H, dict(body=body, head=head, trunk=tr, tn=tn))
    return dict(body=body, head=head, trunk=tr, W=B, H=H)

TRUNK_IDLE = [(96, 51, 6.4), (97.5, 61, 5.4), (99, 70, 4.4),
              (101, 78, 3.5), (106, 81, 2.7), (110, 77, 1.9)]
def trunk_swing(k):
    return [(x + k * (i / 5.0) * 2.4, y - abs(k) * (i / 5.0) * 1.2, r)
            for i, (x, y, r) in enumerate(TRUNK_IDLE)]

def add_mammoth(add):
    def mam(cv, o): draw_mammoth(cv, 1.0, o.pop('_ox', 0.0), o.pop('_oy', 0.0), o)
    add('mammoth_idle', 120, 88, [
        dict(seed=3, bob=0.0, trunk=TRUNK_IDLE),
        dict(seed=4, bob=-1.0, trunk=trunk_swing(0.6), head_dy=-0.8, tail=1.2,
             legs=[(34, 0.0), (74, 0.0), (29, 0.0), (80, 0.0)]),
    ], mam)
    def lp(base, ph):
        ph = ph % 1.0
        x = base + 5.0 * math.cos(2 * math.pi * ph)
        lift = 7.0 * math.sin(math.pi * (ph - 0.5) / 0.5) if ph > 0.5 else 0.0
        return (x, lift)
    # lateral-sequence plod: near-hind, near-fore, far-hind, far-fore
    LC = [[lp(34, i / 4 + 0.5), lp(74, i / 4 + 0.75), lp(29, i / 4), lp(80, i / 4 + 0.25)]
          for i in range(4)]
    BOB = [0.2, -1.4, 0.2, -1.4]
    SW = [1.0, 0.2, -1.0, -0.2]
    add('mammoth_walk', 120, 88, [
        dict(seed=13 + i, bob=BOB[i], legs=LC[i], trunk=trunk_swing(SW[i]),
             head_dy=BOB[i] * 0.5, head_dx=SW[i] * 0.6, tail=-SW[i] * 1.4)
        for i in range(4)
    ], mam)

# ------------------------------------------------------------------ the shop
RUGC = ['D', 'E', 'F', 'G']
GOURD = ['t', 'u', 'v', 'w']

def bone_charm(cv, B, s, x, y, ln, rng):
    sh = limb(LN(B, [(x, y, 1.1), (x + ln * 0.25, y + ln, 1.1)], s), 8)
    sh |= disc(*B(x, y), 1.9 * s) | disc(*B(x + ln * 0.25, y + ln), 1.9 * s)
    for p in dilate(sh, 1) - sh: cv.setif(p[0], p[1], 'j', 'jklmn!@#$DEFGtuvwyzAB89')
    shade(cv, sh, BONE, bias=0.2, grad=True)

def pot(cv, B, s, x, y, rx, ry, ramp, handles=True):
    body = ell(*B(x, y), rx * s, ry * s)
    neck = limb(LN(B, [(x, y - ry + 0.5, rx * 0.45), (x, y - ry - 2.2, rx * 0.42)], s), 6)
    rim = limb(LN(B, [(x - rx * 0.62, y - ry - 2.6, 1.2), (x + rx * 0.62, y - ry - 2.6, 1.2)], s), 6)
    whole = body | neck | rim
    if handles:
        for k in (-1, 1):
            whole |= limb(LN(B, [(x + k * rx * 0.5, y - ry - 1.4, 1.0),
                                 (x + k * (rx + 1.4), y - ry + 2.2, 1.0),
                                 (x + k * rx * 0.8, y - ry + 5.0, 1.0)], s), 8)
    for p in dilate(whole, 1) - whole: cv.setif(p[0], p[1], 'j', 'jklmn!@#$DEFGtuvwyzAB89fghin')
    shade(cv, whole, ramp, bias=-0.2, grad=True)
    for i in range(2):
        bd = ell(*B(x, y - ry * 0.25 + i * ry * 0.75), rx * s, 0.8 * s) & body
        shade(cv, bd, ramp, bias=-1.6, grad=False)
    return whole

def sack(cv, B, s, x, y, rx, ry, rng, ramp=None):
    ramp = ramp or WOOD
    bd = ell(*B(x, y), rx * s, ry * s)
    bd |= poly([B(x - rx * 0.4, y - ry + 1), B(x + rx * 0.4, y - ry + 1),
                B(x + rx * 0.2, y - ry - 3.2), B(x - rx * 0.3, y - ry - 3.0)])
    for p in dilate(bd, 1) - bd: cv.setif(p[0], p[1], 'j', 'jklmn!@#$DEFGtuvwyzAB89fghin')
    shade(cv, bd, ramp, bias=-0.2, grad=True)
    tie = limb(LN(B, [(x - rx * 0.5, y - ry - 0.4, 1.0), (x + rx * 0.5, y - ry - 0.6, 1.0)], s), 6) & bd
    shade(cv, tie, ['D', 'E', 'F'], grad=False)
    for i in range(3):
        cr = polyline(PL(B, [(x - rx * 0.6 + i * rx * 0.6, y - ry + 2),
                             (x - rx * 0.4 + i * rx * 0.6, y + ry - 1)]), max(0.5, 0.5 * s), 6) & bd
        shade(cv, cr, ramp, bias=-1.6, grad=False)
    return bd

def trader_cargo(cv, s, B, body, rng, jig=0.0):
    # ---- woven rug saddle
    rug = poly(PL(B, [(27, 48), (27, 26), (36, 19), (52, 14), (68, 12), (79, 19),
                      (83, 32), (81, 48)])) & body
    cols = {}
    for (x, y) in rug: cols.setdefault(x, []).append(y)
    PAT = ['8', '8', 'E', 'E', 'E', 'F', 'E', '9', '9', 'D', 'D', 'D', 'F', 'D',
           '8', '8', 'E', 'E', 'F', 'E', 'E', 'D', 'D', '9', 'D', 'D', 'E', 'E', 'E', 'E']
    for x, ys in cols.items():
        ys.sort()
        for k, y in enumerate(ys):
            c = PAT[min(k, len(PAT) - 1)]
            if c == 'F' and (x // 3) % 2: c = 'E'
            if c == '9' and (x // 4) % 2: c = '8'
            cv.set(x, y, c)
    for p in edge_of(rug, (1, 1)): cv.setif(p[0], p[1], 'D', 'EFG89')
    for p in edge_of(rug, (-1, -1)): cv.setif(p[0], p[1], 'G', 'EF')
    for p in edge_of(rug, (-1, -1)): cv.setif(p[0], p[1], '9', '8')
    # tassels along the lower edge
    low = {}
    for (x, y) in rug: low[x] = max(low.get(x, -999), y)
    for x in sorted(low):
        if x % 3: continue
        for k in range(1, rng.randint(2, 4)):
            cv.setif(x, low[x] + k, '@' if k < 2 else '!', '.fghin')
    # ---- wooden frame
    for px, py in ((41, 27), (70, 21)):
        post = limb(LN(B, [(px, py, 2.4), (px - 1, py - 14, 2.1), (px - 2, -4, 1.9)], s), 8)
        for p in dilate(post, 1) - post: cv.setif(p[0], p[1], 'j', 'jklmnDEFG89!@#$')
        shade(cv, post, WOOD, bias=-0.3, grad=True)
    bar = limb(LN(B, [(36, -3.5, 2.1), (54, -4.6, 2.1), (72, -3.5, 2.1)], s), 8)
    for p in dilate(bar, 1) - bar: cv.setif(p[0], p[1], 'j', 'jklmnDEFG89!@#$')
    shade(cv, bar, WOOD, bias=0.1, grad=True)
    brace = limb(LN(B, [(43, -1, 1.5), (62, 12, 1.5)], s), 8)
    for p in dilate(brace, 1) - brace: cv.setif(p[0], p[1], 'j', 'jklmnDEFG89!@#$')
    shade(cv, brace, WOOD, bias=-0.6, grad=False)
    # ---- things hanging off the crossbar
    for (hx, hy, kind) in ((38.5, -1, 'bone'), (47, -1, 'gourd'), (57, -2, 'gourd'),
                           (66, -1, 'bone'), (74, 0, 'pouch')):
        hx += jig * 0.6
        for p in polyline(PL(B, [(hx, hy - 2.5), (hx, hy + 2)]), max(0.5, 0.5 * s), 5):
            cv.setif(p[0], p[1], 'k', '.fghin')
        if kind == 'gourd':
            g = ell(*B(hx + 0.4, hy + 7), 4.2 * s, 5.4 * s) | ell(*B(hx, hy + 2.6), 2.4 * s, 3.0 * s)
            for p in dilate(g, 1) - g: cv.setif(p[0], p[1], 'j', 'jklmn!@#$DEFG89tuvwfghin')
            shade(cv, g, GOURD, bias=-0.2, grad=True)
            for i in range(3):
                st = polyline(PL(B, [(hx - 3 + i * 3, hy + 3), (hx - 2.4 + i * 3, hy + 11)]),
                              max(0.5, 0.5 * s), 6) & g
                shade(cv, st, GOURD, bias=-1.6, grad=False)
        elif kind == 'bone':
            bone_charm(cv, B, s, hx, hy + 3, 8.0, rng)
        else:
            sack(cv, B, s, hx, hy + 7, 4.0, 5.0, rng, ['j', 'k', 'l', 'm'])
    # ---- goods piled on the rug
    sack(cv, B, s, 47 + jig * 0.3, 14, 9.5, 8.5, rng, ['k', 'm', 'n', '@'])
    pot(cv, B, s, 65 + jig * 0.3, 16, 6.4, 7.0, CLAY)
    pot(cv, B, s, 33 + jig * 0.2, 20, 4.6, 5.4, ['o', 'p', 'q', 'r'], handles=False)
    sack(cv, B, s, 57 + jig * 0.25, 22, 5.0, 4.6, rng, ['E', 'F', 'G', 'X'])
    # rolled mat lashed behind
    mat = ell(*B(26, 32), 5.0 * s, 8.4 * s)
    for p in dilate(mat, 1) - mat: cv.setif(p[0], p[1], 'j', 'jklmnDEFG89!@#$fghin')
    shade(cv, mat, ['k', 'l', 'm', 'n'], bias=-0.2, grad=True)
    for i in range(3):
        sp = ell(*B(26, 32), (5.0 - i * 1.5) * s, (8.4 - i * 2.5) * s)
        for p in edge_of(sp, (1, 0)): cv.setif(p[0], p[1], 'j', 'klmn')
    for (hx, hy, kind) in ((30, 46, 'bone'), (24, 41, 'pouch'), (82, 40, 'gourd')):
        hx += jig * 0.4
        for p in polyline(PL(B, [(hx, hy - 4), (hx, hy + 1)]), max(0.5, 0.5 * s), 5):
            cv.setif(p[0], p[1], 'k', '.fghinDEFG89')
        if kind == 'bone': bone_charm(cv, B, s, hx, hy + 2, 7.0, rng)
        elif kind == 'pouch': sack(cv, B, s, hx, hy + 5, 3.6, 4.4, rng, ['j', 'k', 'l', 'm'])
        else:
            g = ell(*B(hx, hy + 5), 3.6 * s, 4.6 * s)
            for p in dilate(g, 1) - g: cv.setif(p[0], p[1], 'j', 'jklmn!@#$DEFG89tuvwfghin')
            shade(cv, g, GOURD, bias=-0.2, grad=True)
    # ---- leather straps round the belly
    for sx in (38, 72):
        st = limb(LN(B, [(sx, 24, 1.8), (sx - 2, 44, 1.8), (sx - 1, 60, 1.8)], s), 8)
        st &= dilate(body, 1)
        shade(cv, st, ['j', 'k', 'l', 'm'], bias=-0.3, grad=False)
        for p in edge_of(st, (1, 1)): cv.setif(p[0], p[1], 'j', 'klm')

def bone_bell(cv, s, B, x, y, sw=0.0):
    x += sw
    for p in polyline(PL(B, [(x - sw * 0.6, y - 5), (x, y - 1)]), max(0.5, 0.5 * s), 5):
        cv.setif(p[0], p[1], 'k', '.fghin')
    bl = poly(PL(B, [(x - 1.6, y - 1.8), (x + 1.6, y - 1.8), (x + 4.2, y + 5.0),
                     (x - 4.2, y + 5.0)]))
    bl |= disc(*B(x, y - 2.6), 2.0 * s)
    for p in dilate(bl, 1) - bl: cv.setif(p[0], p[1], 'f', '.fghin!@#$')
    shade(cv, bl, BONE, bias=0.1, grad=True)
    for p in polyline(PL(B, [(x - 4.0, y + 4.8), (x + 4.0, y + 4.8)]), max(0.5, 0.5 * s), 5):
        cv.setif(p[0], p[1], '!', '@#$')
    shade(cv, disc(*B(x + sw * 0.4, y + 6.4), max(1.2, 1.3 * s)), ['!', '@', '#', '$'], grad=False)

def water(cv, s, B, rng, x0, y0, vx, vy, g, T, r0, r1, splash=None):
    n = max(8, int(T * 9))
    for i in range(n + 1):
        t = T * i / n
        x, y = x0 + vx * t, y0 + vy * t + 0.5 * g * t * t
        r = (r0 + (r1 - r0) * (i / n)) * s
        rr = int(math.ceil(r)) + 1
        for dx in range(-rr, rr + 1):
            for dy in range(-rr, rr + 1):
                d = math.hypot(dx, dy)
                if d > r: continue
                c = 1.0 - d / max(0.7, r)
                ch = 'L' if c > 0.62 else ('K' if c > 0.28 else 'J')
                if ch == 'L' and rng.random() < 0.3: ch = 'P'
                if ch == 'K' and rng.random() < 0.18: ch = 'O'
                cv.set(x + dx, y + dy, ch)
    # flying droplets around the stream
    for k in range(int(26 * s)):
        t = T * rng.uniform(0.25, 1.06)
        x = x0 + vx * t + rng.uniform(-4, 4) * s
        y = y0 + vy * t + 0.5 * g * t * t + rng.uniform(-3.5, 4.5) * s
        dr = disc(x, y, rng.choice([0.6, 0.9, 1.3]) * s)
        for p in dr: cv.set(p[0], p[1], rng.choice('KKLJP'))
    if splash:
        for (sx, sy) in splash:
            for k in range(int(12 * s)):
                a = rng.uniform(-3.0, -0.2); L = rng.uniform(1, 9) * s
                x = sx + math.cos(a) * L * rng.choice([-1, 1])
                y = sy + math.sin(a) * L * 0.55
                for p in disc(x, y, rng.choice([0.6, 1.0]) * s):
                    cv.set(p[0], p[1], rng.choice('KLJP'))

TRUNK_UP = {
    1: [(96, 51, 6.4), (100, 60, 5.4), (106, 62, 4.4), (112, 58, 3.5), (115, 51, 2.7), (114, 45, 1.9)],
    2: [(96, 51, 6.4), (101, 57, 5.4), (108, 55, 4.4), (114, 48, 3.5), (116, 38, 2.7), (111, 31, 1.9)],
    3: [(96, 51, 6.4), (100, 58, 5.4), (107, 58, 4.4), (113, 52, 3.5), (116, 44, 2.7), (113, 37, 1.9)],
}

def add_mammoth2(add):
    def trader(cv, o):
        jig = o.pop('_jig', 0.0)
        bsw = o.pop('_bell', 0.0)
        o['cargo'] = lambda c, s, B, body, rng: trader_cargo(c, s, B, body, rng, jig)
        o['after'] = lambda c, s, B, H, parts: bone_bell(c, s, H, 102, 76, bsw)
        draw_mammoth(cv, 1.0, 4.0, 8.0, o)
    add('mammoth_trader', 128, 96, [
        dict(seed=31, bob=0.0, _jig=0.0, _bell=0.0, trunk=TRUNK_IDLE),
        dict(seed=32, bob=-1.0, _jig=0.9, _bell=1.6, head_dy=-0.7, tail=1.2,
             trunk=trunk_swing(0.5), legs=[(35, 0.0), (73, 0.0), (28, 0.0), (81, 0.0)]),
    ], trader)

    def shower(cv, o):
        spray = o.pop('_spray', 0)
        o['after'] = lambda c, s, B, H, parts: do_spray(c, s, H, spray, o.get('seed', 1))
        draw_mammoth(cv, 1.0, 0.0, 4.0, o)
    def do_spray(cv, s, H, mode, seed):
        rng = random.Random(seed + 77)
        if mode == 0: return
        if mode == 1:
            tip = H(114, 43)
            water(cv, s, None, rng, tip[0], tip[1], -1.2, -2.6, 1.1, 4.4, 1.6, 2.4)
        elif mode == 2:
            tip = H(110, 29)
            water(cv, s, None, rng, tip[0], tip[1], -3.5, -2.9, 0.50, 13.5,
                  2.6, 4.8, splash=[H(72, 22), H(54, 21)])
        else:
            tip = H(112, 34)
            water(cv, s, None, rng, tip[0], tip[1], -2.4, -1.5, 0.95, 7.0, 1.3, 1.9,
                  splash=[H(92, 32)])
            for p in disc(*H(112.5, 35), 2.0 * s): cv.set(p[0], p[1], 'K')
            for p in disc(*H(112.0, 34), 1.1 * s): cv.set(p[0], p[1], 'L')
    add('mammoth_shower', 120, 92, [
        dict(seed=41, bob=0.0, trunk=TRUNK_IDLE, _spray=0),
        dict(seed=42, bob=-0.5, trunk=TRUNK_UP[1], _spray=1, head_dy=-0.4, trunk_front=True),
        dict(seed=43, bob=-1.4, trunk=TRUNK_UP[2], _spray=2, head_dy=-1.0, tail=1.5, trunk_front=True),
        dict(seed=44, bob=-0.6, trunk=TRUNK_UP[3], _spray=3, head_dy=-0.5, tail=0.6, trunk_front=True),
    ], shower)
