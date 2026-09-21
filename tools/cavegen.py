"""Caveman generator - every human in the game comes out of here.

90s Saturday-morning cartoon: chunky rounded limbs built from capsules, flat
colour with one shadow tone that follows the silhouette, a rim light down the
near edge, and the far arm and leg a tone back so limbs never merge into the
torso.

The detail passes are what make it a cartoon rather than a shape: plain black
dot eyes under thick black dash brows; ears; a small wedge nose; an enormous
mouth that drops the jaw off the bottom of the head; collarbones, pecs or a belly
fold, a navel, abs, knees, elbows, finger lines and toes; hair as a mass plus
loose strands plus a highlight streak; fur with a belt, folds, stroke texture
and a torn hem; necklaces of carved teeth.

    from cavegen import build, CLIPS
    rows = build('bronk', CLIPS['idle'][0])     # list of row strings

Poses are plain dicts (lean, bob, armL/armR, armLr/armRr, legL/legR, mouth,
eyes, angry, look), so a new clip is a list of dicts - see CLIPS.
"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ras import Grid

# --- palette roles -----------------------------------------------------------
SKIN = dict(hi='e', base='d', mid='c', dark='b', line='a')
FUR  = dict(hi='n', base='m', mid='l', dark='k', line='j')
BONE = dict(hi='$', base='#', mid='@', dark='!')

def capsule(g, x0, y0, x1, y1, r, c):
    """a limb: a thick line with round ends"""
    n = int(max(abs(x1 - x0), abs(y1 - y0)) * 3) + 2
    for i in range(n + 1):
        t = i / n
        g.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, c)

def sil_shade(g, colours, cx, edge_dark=True, frac=0.34):
    """flat two-tone shading that follows the silhouette: in every row, the
    right part of each solid run steps down a tone and the last pixel steps
    down again. No vertical seam, no gradient."""
    base, mid, dark = colours['base'], colours['mid'], colours['dark']
    fam = {base, mid, dark, colours['hi']}
    H, W = len(g.g), len(g.g[0])
    src = [row[:] for row in g.g]
    for y in range(H):
        x = 0
        while x < W:
            if src[y][x] not in fam: x += 1; continue
            x0 = x
            while x < W and src[y][x] in fam: x += 1
            x1 = x - 1
            n = x1 - x0 + 1
            cut = x1 - int(n * frac)
            for xx in range(max(x0, cut), x1 + 1):
                if src[y][xx] == base: g.px(xx, y, mid)
            if edge_dark and n > 3:
                if src[y][x1] in (base, mid): g.px(x1, y, dark)

def rim(g, colours, cx):
    """one lit pixel down the near edge of each run"""
    base, hi = colours['base'], colours['hi']
    H, W = len(g.g), len(g.g[0])
    src = [row[:] for row in g.g]
    for y in range(H):
        x = 0
        while x < W:
            if src[y][x] == '.': x += 1; continue
            x0 = x
            while x < W and src[y][x] != '.': x += 1
            if src[y][x0] == base and (x - x0) > 3: g.px(x0, y, hi)

def edge_of(g, colours, mark):
    """draw a dark contact line where a limb meets the body behind it"""
    base, mid, dark = colours['base'], colours['mid'], colours['dark']
    H, W = len(g.g), len(g.g[0])
    src = [row[:] for row in g.g]
    for (x, y) in mark:
        for dx, dy in ((-1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1)):
            xx, yy = int(x + dx), int(y + dy)
            if 0 <= xx < W and 0 <= yy < H and src[yy][xx] in (base, mid):
                g.px(xx, yy, dark)

def limb(g, x0, y0, x1, y1, r, c, joint=None):
    capsule(g, x0, y0, x1, y1, r, c)
    if joint: g.disc(x1, y1, r * 1.04, joint)

# --- the figure --------------------------------------------------------------
def figure(spec, pose):
    W, H = spec['w'], spec['h']
    g = Grid(W, H)
    cx = W / 2 + pose.get('lean', 0)
    build = spec.get('build', 'strong')
    fat = build == 'fat'
    female = spec.get('female', False)
    headR = spec['headR']
    headY = spec['headY'] + pose.get('bob', 0)
    shoY  = headY + headR + 3
    waistY = spec['waistY'] + pose.get('bob', 0) * 0.5
    hipY  = waistY + 2
    footY = H - 2
    shoW, hipW = spec['shoW'], spec['hipW']
    armR, legR = spec['armR'], spec['legR']
    MID, BASE = SKIN['mid'], SKIN['base']

    def leg(side, ang, col):
        hx = cx + side * hipW * 0.36
        kneeY = (hipY + footY) / 2 + 1
        kx = hx + math.sin(ang) * 5
        fx = hx + math.sin(ang) * 9
        limb(g, hx, hipY, kx, kneeY, legR, col)
        limb(g, kx, kneeY, fx, footY - 2, legR * 0.86, col)
        g.ellipse(fx + side * 0.8, footY - 1, legR * 1.6, 2.4, col)

    def arm(side, ang, raise_, col, mark=None):
        sx = cx + side * (shoW * 0.5 - armR * 0.3)
        sy = shoY + 2
        ex = sx + side * (armR * 1.5 + math.sin(ang) * 5)
        ey = sy + (waistY - shoY) * 0.58 - raise_ * 13
        hx = ex + side * (armR * 0.9 + math.sin(ang) * 6)
        hy = ey + (waistY - shoY) * 0.50 - raise_ * 17
        limb(g, sx, sy, ex, ey, armR, col)
        limb(g, ex, ey, hx, hy, armR * 0.88, col)
        g.disc(hx, hy + 1, armR * 1.10, col)
        if mark is not None:
            n = 26
            for i in range(n + 1):
                t = i / n
                mark.append((sx + (ex - sx) * t, sy + (ey - sy) * t))

    # --- far side first, one tone down: instant depth, limbs never merge
    leg(-1, pose.get('legL', 0), MID)
    arm(-1, pose.get('armL', 0.18), pose.get('armLr', 0), MID)

    # --- torso
    if fat:
        g.ellipse(cx, shoY + 4, shoW * 0.46, 6.0, BASE)                  # chest
        g.ellipse(cx + 0.5, waistY - 5, hipW * 0.74, (waistY - shoY) * 0.50, BASE)  # the belly
        g.ellipse(cx, waistY - 1, hipW * 0.58, 4.0, BASE)
    else:
        n = int(waistY - shoY) + 1
        for i in range(n):
            t = i / max(1, n - 1)
            wd = shoW * (1 - t ** 0.7) + hipW * (t ** 0.7) - math.sin(t * math.pi) * shoW * 0.10
            if female: wd = shoW * 0.92 * (1 - t) + hipW * 1.12 * t + math.sin(t * math.pi) * -1.6
            g.ellipse(cx, shoY + i, wd * 0.5, 1.15, BASE)
        g.ellipse(cx, shoY + 2, shoW * 0.5, 3.6, BASE)                   # deltoids
    # --- head and neck
    limb(g, cx, headY + headR * 0.8, cx, shoY, headR * 0.40, BASE)
    g.ellipse(cx, headY, headR, headR * 1.04, BASE)
    g.ellipse(cx, headY + headR * 0.5, headR * 0.84, headR * 0.56, BASE)

    # --- near side, full tone, in front of everything
    leg(1, pose.get('legR', 0), BASE)
    contact = []
    arm(1, pose.get('armR', -0.18), pose.get('armRr', 0), BASE, contact)

    sil_shade(g, SKIN, cx)
    rim(g, SKIN, cx)
    edge_of(g, SKIN, contact)
    # chin shadow, and the crease the chest sits in
    for i in range(int(headR * 1.1)):
        g.px(cx - headR * 0.55 + i, headY + headR * 0.98, SKIN['mid'])
    if not fat:
        for i in range(5): g.px(cx, shoY + 4 + i, SKIN['mid'])
    else:
        for i in range(int(hipW * 0.5)):
            g.px(cx - hipW * 0.25 + i, waistY - 9, SKIN['mid'])
    return g, dict(cx=cx, headY=headY, headR=headR, shoY=shoY, waistY=waistY,
                   hipY=hipY, footY=footY, shoW=shoW, hipW=hipW)

# --- face --------------------------------------------------------------------
def face(g, m, spec, pose):
    """Two faces come out of here.

    The men and the children get the caveman one: a heavy jutting lower jaw
    with two bottom tusks riding up over the top lip, a bulb nose and thick
    charcoal brows. The women get the doll one: a small soft jaw, lashes, thin
    arched brows and painted lips. Both have the same eyes - a black dot, and
    a small one."""
    cx, hy, hr = m['cx'], m['headY'], m['headR']
    doll = bool(spec.get('doll'))
    eyeY = hy - hr * 0.02
    dx = hr * (0.42 if doll else 0.44)
    shut = pose.get('eyes') == 'shut'
    wide = pose.get('eyes') == 'wide'
    angry = pose.get('angry')
    bc = spec.get('brow', '0')
    INK = '0'

    # --- ear on the near side, with an inner fold
    ex0 = cx - hr * 0.97
    g.ellipse(ex0, hy + hr * 0.10, hr * (0.19 if doll else 0.24), hr * (0.26 if doll else 0.32), SKIN['base'])
    g.ellipse(ex0 + 0.6, hy + hr * 0.10, hr * 0.10, hr * 0.15, SKIN['mid'])

    # --- eyes: a black dot, and nothing else in it
    look = pose.get('look', 0)
    for side in (-1, 1):
        X = cx + side * dx
        if shut:
            for i in range(6):
                g.px(X - 2.5 + i, eyeY + 1 + (0.5 if 0 < i < 5 else 0), INK)
                g.px(X - 2.5 + i, eyeY + 2 + (0.5 if 0 < i < 5 else 0), INK)
        else:
            r = (1.9 if wide else 1.4) if doll else (2.2 if wide else 1.7)
            g.ellipse(X + look, eyeY + 0.5, r, r * 1.16, INK)
        if doll:                                       # lashes, out and up
            for k in range(3):
                lx = X + side * (2.4 + k * 1.1)
                g.px(lx, eyeY - 0.6 - k * 0.7, INK)
                g.px(lx + side * 0.6, eyeY - 1.4 - k * 0.7, INK)

    # --- brows
    for side in (-1, 1):
        X = cx + side * dx
        by = eyeY - hr * (0.40 if doll else 0.46) - (1.0 if wide else 0)
        if doll:                                       # thin, arched, plucked
            n = int(hr * 0.40) + 1
            for i in range(n):
                t = i / max(1, n - 1)
                x = X - (n - 1) / 2 + i
                arc = -math.sin(t * math.pi) * 1.0
                tilt = (i - n / 2) * (0.26 * side if angry else 0)
                g.px(x, by + arc + tilt, bc)
        else:                                          # a charcoal slab
            n = int(hr * 0.50) + 2
            for i in range(n):
                x = X - (n - 1) / 2 + i
                tilt = (i - n / 2) * (0.34 * side if angry else (-0.18 * side if wide else 0))
                for k in range(3 if not wide else 2): g.px(x, by + tilt + k, bc)

    # --- nose
    ny = eyeY + hr * (0.22 if doll else 0.24)
    if doll:
        g.ellipse(cx + hr * 0.03, ny, hr * 0.15, hr * 0.13, SKIN['base'])
        g.ellipse(cx - hr * 0.04, ny - hr * 0.04, hr * 0.07, hr * 0.06, SKIN['hi'])
        g.px(cx + hr * 0.13, ny + hr * 0.08, SKIN['mid'])
    else:
        g.ellipse(cx + hr * 0.04, ny, hr * 0.28, hr * 0.24, SKIN['base'])
        g.ellipse(cx + hr * 0.15, ny + hr * 0.07, hr * 0.17, hr * 0.14, SKIN['mid'])
        g.ellipse(cx - hr * 0.06, ny - hr * 0.07, hr * 0.11, hr * 0.09, SKIN['hi'])
        for i in range(int(hr * 0.44)):
            g.px(cx - hr * 0.17 + i, ny + hr * 0.24, SKIN['dark'])       # underside
        g.px(cx + hr * 0.21, ny + hr * 0.15, SKIN['line'])               # nostril

    # --- mouth
    mo = pose.get('mouth', 'flat')
    my = hy + hr * (0.72 if doll else 0.78)

    # The caveman jaw: a mass of chin pushed forward under the mouth, with the
    # bottom two teeth riding up over the top lip. This is the whole species.
    def tusks(w, top):
        base = max(2, int(round(hr * 0.22)))
        hgt = max(2, int(round(hr * 0.24)))
        for side in (-1, 1):
            tx = cx + side * w * 0.80
            for k in range(hgt):
                wdt = max(1, base - int(k * base / hgt))
                for i in range(wdt):
                    g.px(tx - wdt / 2 + i, top - k, '$' if k < hgt - 1 else '@')
            for i in range(base): g.px(tx - base / 2 + i, top + 1, SKIN['line'])

    if not doll:
        jx, jy0 = cx + hr * 0.12, my + hr * 0.20
        g.ellipse(jx, jy0, hr * 0.52, hr * 0.30, SKIN['base'])
        g.ellipse(jx + hr * 0.20, jy0 + hr * 0.07, hr * 0.34, hr * 0.22, SKIN['mid'])
        g.ellipse(jx + hr * 0.34, jy0 + hr * 0.08, hr * 0.19, hr * 0.15, SKIN['dark'])
        g.ellipse(jx - hr * 0.20, jy0 - hr * 0.13, hr * 0.24, hr * 0.10, SKIN['hi'])

    def maw(w, h, drop):
        """a dropped jaw with a cavern in it: skin first, then the hole"""
        jy = my + drop
        g.ellipse(cx, jy, w + 2.4, h + 2.6, SKIN['base'])
        g.ellipse(cx + w * 0.42, jy + h * 0.30, w * 0.70, h * 0.90, SKIN['mid'])
        g.ellipse(cx + w * 0.78, jy + h * 0.34, w * 0.42, h * 0.62, SKIN['dark'])
        g.ellipse(cx - w * 0.30, jy - h * 0.55, w * 0.60, h * 0.34, SKIN['hi'])
        g.ellipse(cx, jy, w + 0.9, h + 0.9, SKIN['line'])
        g.ellipse(cx, jy, w, h, INK)
        for i in range(int(w * 1.7)):                                    # top teeth
            tx = cx - w * 0.85 + i
            g.px(tx, jy - h * 0.62, '$')
            g.px(tx, jy - h * 0.62 + 1, '$' if i % 3 else '@')
        if doll:
            for i in range(int(w * 1.1)):
                g.px(cx - w * 0.55 + i, jy + h * 0.80, '@')
        else:                                                            # the tusks
            for i in range(int(w * 1.5)):
                g.px(cx - w * 0.75 + i, jy + h * 0.74, '@')
            tusks(w, jy - h * 0.10)
        g.ellipse(cx, jy + h * 0.52, w * 0.60, h * 0.34, 'E')            # tongue
        g.ellipse(cx, jy + h * 0.44, w * 0.34, h * 0.16, 'F')
        return jy

    LIP = spec.get('lip', 'W')
    if mo in ('shout', 'open'):
        w, h, drop = (hr * 0.60, hr * 0.54, hr * 0.20) if mo == 'shout' else (hr * 0.44, hr * 0.36, hr * 0.10)
        if doll: w, h = w * 0.72, h * 0.80
        jy = maw(w, h, drop)
        if doll:                                                         # painted lips round it
            for i in range(int(w * 2.2)):
                g.px(cx - w * 1.1 + i, jy - h - 1, LIP)
                g.px(cx - w * 1.1 + i, jy + h + 1, LIP)
    elif mo == 'grin':
        w, h = hr * (0.52 if doll else 0.70), hr * (0.22 if doll else 0.28)
        g.ellipse(cx, my, w + 0.9, h + 0.9, LIP if doll else SKIN['line'])
        g.ellipse(cx, my, w, h, INK)
        for i in range(int(w * 1.9)):
            g.px(cx - w * 0.95 + i, my - h * 0.34, '$')
            g.px(cx - w * 0.95 + i, my - h * 0.34 + 1, '$')
        for i in range(0, int(w * 1.9), 3):
            g.px(cx - w * 0.95 + i, my - h * 0.34, '@')
            g.px(cx - w * 0.95 + i, my - h * 0.34 + 1, '@')
        g.ellipse(cx, my + h * 0.55, w * 0.58, h * 0.40, 'E')
        if not doll: tusks(w, my - h * 0.2)
    elif doll:
        # a small painted mouth: two lobes on top, one soft curve under
        w = hr * 0.30
        for i in range(int(w * 2) + 1):
            t = i / max(1, int(w * 2))
            x = cx - w + i
            g.px(x, my + math.sin(t * math.pi) * 1.5, LIP)
            g.px(x, my + math.sin(t * math.pi) * 1.5 + 1, LIP)
        for side in (-1, 1):
            g.px(cx + side * w * 0.45, my - 1, LIP)
            g.px(cx + side * w * 0.45, my - 2, spec.get('lipHi', 'X'))
        g.px(cx - w * 0.3, my + 1, spec.get('lipHi', 'X'))
    else:
        # shut, but the jaw still juts: a heavy line with two teeth over it
        w = hr * 0.52
        n = int(w * 2)
        for i in range(n + 1):
            t = i / n
            x = cx - w + i
            dip = -math.sin(t * math.pi) * 0.9
            g.px(x, my + dip, INK)
            g.px(x, my + dip + 1, INK)
            g.px(x, my + dip + 2, SKIN['dark'])
        for k, dy in enumerate((0, -1.2, -2.2)):
            g.px(cx - w - k, my + dy, INK); g.px(cx + w + k, my + dy, INK)
        tusks(w, my - 1)
    # cheek, and a doll gets blush on it
    g.px(cx - hr * 0.72, my - 2, SKIN['mid']); g.px(cx - hr * 0.72, my - 1, SKIN['mid'])
    if doll:
        for side in (-1, 1):
            for k in range(3):
                g.px(cx + side * hr * 0.66 - k * side * 0.9, eyeY + hr * 0.30 + (k % 2), spec.get('blush', 'X'))

    if spec.get('beard'):
        bc2 = spec.get('beardCol', '6')
        g.ellipse(cx, my + 5.4, hr * 0.50, hr * 0.40, SKIN['dark'])
        g.ellipse(cx, my + 5.0, hr * 0.46, hr * 0.36, bc2)
        g.ellipse(cx - 1, my + 4.6, hr * 0.30, hr * 0.22, '7')
        for side in (-1, 1):                                          # sideburns down the jaw
            g.ellipse(cx + side * hr * 0.72, my + 1, hr * 0.20, hr * 0.34, bc2)
        for i in range(9):                                            # strands
            bx = cx - hr * 0.46 + i * (hr * 0.12)
            for k in range(1 + (i % 3)): g.px(bx, my + 5.4 + hr * 0.36 + k, bc2)
        for i in range(9): g.px(cx - 4.5 + i, my - 3.4, '5')           # moustache, above the mouth
        for i in range(7): g.px(cx - 3.5 + i, my - 4.4, '7')
    if spec.get('stubble'):
        for i in range(10):
            g.px(cx - hr * 0.60 + (i * 7) % int(hr * 1.2), my + 5.4 + (i % 2), SKIN['dark'])

def anatomy(g, m, spec, pose):
    """cel-animation muscle and detail lines: collarbone, pecs, belly, navel,
    knees, elbows, fingers and toes"""
    cx, shoY, waistY, hipW, shoW = m['cx'], m['shoY'], m['waistY'], m['hipW'], m['shoW']
    footY, hipY = m['footY'], m['hipY']
    fat = spec.get('build') == 'fat'
    L = SKIN['dark']
    # collarbone
    for i in range(int(shoW * 0.5)):
        x = cx - shoW * 0.25 + i
        g.px(x, shoY + 3 + abs(i - shoW * 0.25) * 0.14, L)
    if fat:
        # a big belly with a fold above it and a navel
        for i in range(int(hipW * 0.7)):
            x = cx - hipW * 0.35 + i
            g.px(x, waistY - 13 + math.sin(i / max(1, hipW * 0.7) * math.pi) * -1.6, L)
        g.px(cx + 1, waistY - 6, L); g.px(cx + 1, waistY - 5, L); g.px(cx + 2, waistY - 5.5, L)
        g.px(cx, waistY - 5.5, SKIN['mid'])
    else:
        # pecs and a sternum
        for side in (-1, 1):
            for i in range(6):
                a = i / 5 * math.pi
                g.px(cx + side * (1.2 + math.sin(a) * shoW * 0.22), shoY + 5 + i * 0.9, L)
        for k in range(4): g.px(cx, shoY + 5 + k, L)
        if spec.get('abs'):
            for r in range(2):
                for side in (-1, 1):
                    for i in range(3): g.px(cx + side * 2.5, shoY + 12 + r * 4 + i, L)
            for i in range(7): g.px(cx - 3 + i, shoY + 15, L)
        g.px(cx + 1, waistY - 4, L); g.px(cx + 1, waistY - 3, L)       # navel
    # knees
    kneeY = (hipY + footY) / 2 + 1
    for side in (-1, 1):
        kx = cx + side * hipW * 0.36 + math.sin(pose.get('legL' if side < 0 else 'legR', 0)) * 5
        for i in range(3): g.px(kx - 1 + i, kneeY + 1, L)
    # toes
    legR = spec['legR']
    for side in (-1, 1):
        fx = cx + side * hipW * 0.36 + math.sin(pose.get('legL' if side < 0 else 'legR', 0)) * 9 + side * 0.8
        for i in range(3):
            g.px(fx - legR * 0.9 + i * (legR * 0.8), footY - 2, L)

def hands(g, m, spec, pose):
    """finger lines on the near fist"""
    cx, shoY, waistY, shoW = m['cx'], m['shoY'], m['waistY'], m['shoW']
    armR = spec['armR']
    for side, ang, raise_ in ((-1, pose.get('armL', 0.18), pose.get('armLr', 0)),
                              (1, pose.get('armR', -0.18), pose.get('armRr', 0))):
        sx = cx + side * (shoW * 0.5 - armR * 0.3)
        ex = sx + side * (armR * 1.5 + math.sin(ang) * 5)
        ey = shoY + 2 + (waistY - shoY) * 0.58 - raise_ * 13
        hx = ex + side * (armR * 0.9 + math.sin(ang) * 6)
        hy = ey + (waistY - shoY) * 0.50 - raise_ * 17
        col = SKIN['dark'] if side > 0 else SKIN['mid']
        for i in range(3):
            g.px(hx - armR * 0.7 + i * (armR * 0.7), hy + 1 + armR * 0.5, col)
        g.px(hx + side * armR * 0.8, hy, col)                       # thumb
        for k in range(2): g.px(ex - side * armR * 0.2, ey + k, col)  # elbow

# --- hair --------------------------------------------------------------------
def hair(g, m, spec, pose):
    cx, hy, hr = m['cx'], m['headY'], m['headR']
    c, c2 = spec['hair'], spec.get('hair2', spec['hair'])
    dark = spec.get('hair3', c)
    style = spec.get('hairStyle', 'mop')
    top = hy - hr * 0.98
    if style == 'mop':
        g.ellipse(cx, top + 1, hr * 1.04, hr * 0.56, c)
        for ox, oy, r in ((-0.92, 0.14, 0.38), (-0.48, -0.26, 0.46), (0.08, -0.36, 0.46),
                          (0.60, -0.22, 0.42), (0.98, 0.14, 0.38)):
            g.disc(cx + ox * hr, top + oy * hr, hr * r, c)
        for i in range(5):                                            # a parted fringe
            if i == 2: continue                                       # the part itself
            fx = cx - hr * 0.9 + i * (hr * 0.45)
            for k in range(2 + (i % 2)): g.px(fx, top + hr * 0.40 + k, c)
    elif style == 'spike':
        g.ellipse(cx, top + 1, hr * 1.04, hr * 0.64, c)
        for i in range(8):
            t = i / 7
            sx = cx + (t - 0.5) * hr * 2.05
            sh = hr * (0.52 + 0.5 * math.sin(t * 3.1))
            for k in range(int(sh)):
                wdt = max(1, int((1 - k / sh) * 3.4))
                for w in range(wdt): g.px(sx - wdt / 2 + w, top - k, c if k < sh * 0.55 else c2)
    elif style == 'curls':
        g.ellipse(cx, top + 1, hr * 1.18, hr * 0.72, c)
        for ox, oy, r in ((-1.18, 0.22, 0.5), (-0.82, -0.42, 0.56), (-0.2, -0.62, 0.6),
                          (0.46, -0.54, 0.56), (1.02, -0.16, 0.54), (1.22, 0.36, 0.46),
                          (-1.28, 0.78, 0.44), (1.32, 0.82, 0.42)):
            g.disc(cx + ox * hr, top + oy * hr, hr * r, c)
        for ox, oy in ((-0.8, 0.5), (0.0, 0.2), (0.9, 0.55)):          # inner curl shadows
            g.disc(cx + ox * hr, top + oy * hr, hr * 0.2, dark)
    elif style == 'bun':
        g.ellipse(cx, top + 2, hr * 1.0, hr * 0.66, c)
        g.disc(cx + hr * 0.1, top - hr * 0.58, hr * 0.54, c)
        for i in range(5): g.px(cx - hr * 0.2 + i * 2, top - hr * 0.58 + (i % 2), dark)
    elif style == 'bald':
        g.ellipse(cx - hr * 0.1, top + 3.5, hr * 0.98, hr * 0.42, c)
        for i in range(6): g.px(cx - hr * 0.8 + i * (hr * 0.3), top + 2.4, c2)
    # a highlight streak, which is what sells hair as cartoon hair
    for i in range(int(hr * 1.1)):
        t = i / max(1, hr * 1.1)
        g.px(cx - hr * 0.75 + i, top - hr * 0.18 + math.sin(t * math.pi) * -1.8, c2)
    if spec.get('hairBone'):
        by = top - hr * 0.34
        for i in range(int(hr * 1.4)): g.px(cx - hr * 0.7 + i, by, BONE['base'])
        for i in range(int(hr * 1.4)): g.px(cx - hr * 0.7 + i, by - 1, BONE['hi'])
        g.disc(cx - hr * 0.74, by, 1.9, BONE['hi']); g.disc(cx + hr * 0.7, by, 1.9, BONE['hi'])
        g.px(cx - hr * 0.74, by - 1, '7'); g.px(cx + hr * 0.7, by - 1, '7')

# --- fur ---------------------------------------------------------------------
def fur(g, m, spec, pose):
    cx, waistY, hipW, shoW = m['cx'], m['waistY'], m['hipW'], m['shoW']
    top = waistY - spec.get('furRise', 2)
    bot = top + spec['furLen']
    w = hipW * 0.62 + 2
    for y in range(int(top), int(bot) + 1):
        t = (y - top) / max(1, bot - top)
        g.ellipse(cx, y, w * (0.94 + t * 0.28), 1.2, FUR['base'])
    # a torn, tufted hem rather than a straight edge
    for i in range(int(w * 2.5)):
        x = cx - w * 1.25 + i
        d = 3 + ((i * 5) % 4) + (3 if i % 5 == 0 else 0)
        for k in range(d):
            g.px(x, bot + k, FUR['base'] if k < d - 2 else (FUR['mid'] if k < d - 1 else FUR['dark']))
    # cloth folds and fur strokes
    for i in range(6):
        fx = cx - w * 0.9 + i * (w * 0.36)
        for k in range(int((bot - top) * 0.8)):
            g.px(fx + k * 0.12, top + 2 + k, FUR['mid'])
    for i in range(int(w * 2.2)):
        x = cx - w * 1.1 + i
        if (i * 7) % 4: continue
        for k in range(2): g.px(x, top + 1 + ((i * 5) % max(2, int(bot - top - 3))) + k, FUR['dark'])
    # lit strands, so the hide has a grain and not just a stain
    for i in range(int(w * 2.0)):
        x = cx - w * 1.0 + i
        if (i * 3) % 7: continue
        for k in range(2, int(bot - top) - 1, 2): g.px(x, top + k, FUR['hi'])
    # the hem, in ink, so the kilt ends instead of fading
    for i in range(int(w * 2.5)):
        x = cx - w * 1.25 + i
        d = 3 + ((i * 5) % 4) + (3 if i % 5 == 0 else 0)
        g.px(x, bot + d, FUR['line'])
    # a belt of cord at the waist, stitched, with a bone toggle on it
    for i in range(int(w * 1.9)):
        x = cx - w * 0.95 + i
        g.px(x, top - 1, FUR['line'])
        g.px(x, top, FUR['dark'])
        g.px(x, top + 1, FUR['mid'] if i % 4 else FUR['line'])
        g.px(x, top + 2, FUR['line'] if i % 4 == 2 else FUR['dark'])
    g.ellipse(cx + w * 0.1, top + 0.5, 3.0, 2.4, BONE['mid'])
    g.ellipse(cx + w * 0.1, top + 0.3, 2.2, 1.6, BONE['base'])
    g.px(cx + w * 0.1 - 1, top - 0.7, BONE['hi'])
    if spec.get('strap'):
        sx = cx - shoW * 0.42
        for i in range(int(m['shoY']), int(top) + 1):
            t = (i - m['shoY']) / max(1, top - m['shoY'])
            capsule(g, sx + t * shoW * 0.55, i, sx + t * shoW * 0.55, i, 2.6, FUR['base'])
        for i in range(int(m['shoY']) + 1, int(top), 3):
            t = (i - m['shoY']) / max(1, top - m['shoY'])
            g.px(sx + t * shoW * 0.55 + 1.6, i, FUR['dark'])
    sil_shade(g, FUR, m['cx'], edge_dark=False)
    rim(g, FUR, m['cx'])

def necklace(g, m, spec):
    """A cord with three teeth on it, not a handful of freckles. The cord is a
    solid dark arc so it reads as one object, and the teeth hang off the
    bottom of it big enough to be teeth at 1x."""
    cx, shoY, shoW = m['cx'], m['shoY'], m['shoW']
    y0 = shoY + 2
    span = shoW * 0.40
    # the cord, two pixels thick where it is nearest the camera
    for i in range(int(span * 2) + 1):
        t = i / max(1, int(span * 2))
        x = cx + (t - 0.5) * span * 2
        y = y0 + math.sin(t * math.pi) * 3.2
        g.px(x, y, SKIN['line'])
        if 0.18 < t < 0.82: g.px(x, y + 1, SKIN['dark'])
    # three teeth, the middle one longest
    for (t, ln) in ((0.28, 3), (0.5, 5), (0.72, 3)):
        x = cx + (t - 0.5) * span * 2
        y = y0 + math.sin(t * math.pi) * 3.2 + 2
        for k in range(ln):
            wdt = 2 if k < ln - 1 else 1
            for w in range(wdt):
                g.px(x - wdt / 2 + w + 0.5, y + k, BONE['base'] if k else BONE['hi'])
        g.px(x - 1, y, BONE['hi'])
        g.px(x + 1, y + ln - 1, BONE['mid'])


# --- cast --------------------------------------------------------------------
ADULT = dict(w=52, h=76, headR=13, headY=19, waistY=50, shoW=29, hipW=20,
             armR=3.9, legR=4.5, furLen=11, brow='0', iris='j')
CAST = {
  'bronk':     dict(ADULT, build='fat', shoW=32, hipW=25, headR=13.5, waistY=52, furLen=12,
                    hair='f', hair2='g', hair3='0', hairStyle='mop', stubble=True, neck=True),
  'vela':      dict(ADULT, build='slim', female=True, doll=True, lip='W', lipHi='X', blush='X', brow='g', w=50, shoW=23, hipW=19, headR=12.4,
                    hair='A', hair2='B', hair3='z', hairStyle='curls', hairBone=True,
                    furLen=15, strap=True, neck=True, iris='u'),
  'elder':     dict(ADULT, build='slim', shoW=25, hipW=19, headR=12.4, hair='6', hair2='7',
                    hair3='5', hairStyle='bald', beard=True, beardCol='6', furLen=17,
                    brow='5', iris='k'),
  'brute':     dict(ADULT, w=58, h=80, build='strong', shoW=38, hipW=23, headR=13, headY=20,
                    waistY=52, armR=5.2, legR=5.2, hair='z', hair2='A', hair3='y',
                    hairStyle='spike', furLen=11, neck=True, abs=True, iris='y'),
  'villager':  dict(ADULT, build='strong', shoW=28, hipW=20, hair='g', hair2='h', hair3='f',
                    hairStyle='mop', furLen=10, neck=True),
  'villager2': dict(ADULT, build='slim', female=True, doll=True, lip='V', lipHi='W', blush='X', brow='g', shoW=23, hipW=19, hair='h', hair2='i',
                    hair3='g', hairStyle='bun', furLen=14, strap=True, neck=True),
  'kid_a':     dict(w=34, h=50, build='kid', headR=10.4, headY=14, waistY=32, shoW=17, hipW=13,
                    armR=2.7, legR=3.1, furLen=7, brow='0', iris='j',
                    hair='z', hair2='A', hair3='y', hairStyle='spike'),
  'kid_b':     dict(w=34, h=50, build='kid', headR=10.4, headY=14, waistY=32, shoW=16, hipW=13,
                    armR=2.7, legR=3.1, furLen=8, brow='g', iris='g',
                    hair='g', hair2='h', hair3='f', hairStyle='bun', female=True, doll=True,
                    lip='W', lipHi='X', blush='X', hairBone=True),
}

def detail(g, m, spec, pose):
    """The pass that makes a figure look drawn rather than assembled. The light
    is up and to the left and it never moves: a lit band down the near-left of
    every form, solid shadow under the pecs, the belly and the jaw, a hard ink
    crease where two forms meet, and the dirt of somebody who works in a hole
    in the ground. Everything here has to read at 1x, which is the only test
    that matters."""
    cx, shoY, waistY = m['cx'], m['shoY'], m['waistY']
    hipW, shoW, footY, hipY = m['hipW'], m['shoW'], m['footY'], m['hipY']
    headY, headR = m['headY'], m['headR']
    INK, DK, MID, HI = SKIN['line'], SKIN['dark'], SKIN['mid'], SKIN['hi']
    fat = spec.get('build') == 'fat'
    female = spec.get('female', False)
    H, W = len(g.g), len(g.g[0])
    fam = {SKIN['base'], SKIN['mid'], SKIN['dark'], SKIN['hi'], SKIN['line']}

    def skin_at(x, y):
        x, y = int(x), int(y)
        return 0 <= x < W and 0 <= y < H and g.g[y][x] in fam

    def put(x, y, c):
        if skin_at(x, y): g.px(int(x), int(y), c)

    # --- the light: one lit pixel inside the left edge of every run of skin,
    # which is what turns a silhouette into a body
    for y in range(max(0, int(headY - headR)), min(H, int(footY) + 1)):
        run = None
        for x in range(W + 1):
            solid = x < W and g.g[y][x] in fam
            if solid and run is None: run = x
            elif not solid and run is not None:
                if x - run >= 4 and g.g[y][run] == SKIN['base']:
                    g.px(run, y, HI)
                    if x - run >= 9 and y % 3: g.px(run + 1, y, HI)
                run = None

    # --- solid shadow, not a line. Under each pec, under the belly, under
    # the jaw, and in the hollow of the collarbone.
    if fat:
        for i in range(int(hipW * 0.78)):                       # the shelf of the belly
            x = cx - hipW * 0.39 + i
            d = math.sin(i / max(1, hipW * 0.78) * math.pi)
            for k in range(1 + int(d * 2)):
                put(x, waistY - 11 + k, MID)
            put(x, waistY - 12, INK)
    elif not female:
        for side in (-1, 1):
            for i in range(7):
                a = i / 6 * math.pi
                bx = cx + side * (1.4 + math.sin(a) * shoW * 0.21)
                by = shoY + 9 + i * 0.45
                put(bx, by, INK)
                for k in range(1, 3): put(bx, by - k, MID)
    for i in range(int(headR * 1.3)):                           # under the jaw
        put(cx - headR * 0.65 + i, headY + headR * 1.02, INK)
        put(cx - headR * 0.65 + i, headY + headR * 1.02 + 1, MID)
    for side in (-1, 1):                                        # the armpit
        for k in range(3): put(cx + side * (shoW * 0.42), shoY + 5 + k, INK)
    for k in range(4): put(cx, hipY + k, INK)                   # where the legs part

    # --- lit caps on everything pointing at the sky
    for side in (-1, 1):
        for i in range(4): put(cx + side * (shoW * 0.24 + i * 0.7), shoY + 1 + i * 0.3, HI)
    kneeY = (hipY + footY) / 2 + 1
    for side in (-1, 1):
        kx = cx + side * hipW * 0.36 + math.sin(pose.get('legL' if side < 0 else 'legR', 0)) * 5
        for i in range(3): put(kx - 2 + i * 0.7, kneeY - 2, HI if side > 0 else MID)
        for i in range(3): put(kx - 1 + i, kneeY + 2, INK)                    # the kneecap line
    for i in range(3): put(cx - headR * 0.2 + i, headY - headR * 0.62, HI)    # the brow ridge

    # --- the dirt of the job, on the legs where it lands
    if spec.get('grime', True):
        seed = int(spec.get('headR', 12) * 7)
        for i in range(8):
            gx = cx + ((i * 37 + seed) % 21) - 10
            gy = kneeY + ((i * 53 + seed) % max(3, int(footY - kneeY - 1)))
            put(gx, gy, DK)

    # --- war paint, for the ones who bother
    for (px2, py2, wd, col) in spec.get('paint', []):
        for i in range(wd):
            put(cx + px2 + i, shoY + py2, col)
            put(cx + px2 + i, shoY + py2 + 1, col)


def build(name, pose):
    spec = CAST[name]
    g, m = figure(spec, pose)
    anatomy(g, m, spec, pose)
    detail(g, m, spec, pose)
    hands(g, m, spec, pose)
    fur(g, m, spec, pose)
    hair(g, m, spec, pose)
    face(g, m, spec, pose)
    if spec.get('neck'): necklace(g, m, spec)
    return [''.join(r) for r in g.g]

# --- poses -------------------------------------------------------------------
def walk_pose(i):
    a = i * math.pi / 2
    return dict(legL=math.sin(a) * 0.55, legR=-math.sin(a) * 0.55,
                armL=-math.sin(a) * 0.5, armR=math.sin(a) * 0.5,
                bob=-abs(math.cos(a)) * 1.2, mouth='flat')

CLIPS = {
  'idle': [dict(mouth='flat'), dict(bob=-1, mouth='flat')],
  'walk': [walk_pose(i) for i in range(4)],
  'eat':  [dict(armLr=0.55, armRr=0.2, mouth='shout', bob=-1),
           dict(armLr=0.75, armRr=0.25, mouth='open'),
           dict(armLr=0.55, armRr=0.2, mouth='shout', bob=-1),
           dict(armLr=0.35, armRr=0.15, mouth='grin')],
  'play': [dict(armLr=0.35, armRr=0.5, mouth='shout', bob=-1, angry=True),
           dict(armLr=0.45, armRr=0.35, mouth='open'),
           dict(armLr=0.3, armRr=0.55, mouth='shout', bob=-1),
           dict(armLr=0.5, armRr=0.4, mouth='open')],
  'shock': [dict(armLr=0.85, armRr=0.85, eyes='wide', mouth='shout', bob=-2),
            dict(armLr=0.7, armRr=0.95, eyes='wide', mouth='shout', bob=-1)],
  'hurt': [dict(armLr=0.5, armRr=0.5, eyes='shut', mouth='shout', lean=-2, bob=1)],
  'cry':  [dict(armLr=0.8, armRr=0.8, eyes='shut', mouth='shout', bob=-1),
           dict(armLr=0.7, armRr=0.9, eyes='shut', mouth='shout')],
  'cook': [dict(armLr=0.5, armRr=0.1, mouth='flat'), dict(armLr=0.35, armRr=0.15, mouth='flat'),
           dict(armLr=0.5, armRr=0.1, mouth='grin'), dict(armLr=0.6, armRr=0.05, mouth='flat')],
}


# --- special poses -----------------------------------------------------------
def crop_rows(rows, top, bot):
    return [r for i, r in enumerate(rows) if top <= i <= bot]

def rotate_ccw(rows):
    """turn a standing figure on its back - head to the left, feet right"""
    h, w = len(rows), len(rows[0])
    return [''.join(rows[y][x] for y in range(h - 1, -1, -1)) for x in range(w)]

def trim(rows):
    while rows and set(rows[0]) == {'.'}: rows = rows[1:]
    while rows and set(rows[-1]) == {'.'}: rows = rows[:-1]
    cols = [x for x in range(len(rows[0])) if any(r[x] != '.' for r in rows)]
    a, b = min(cols), max(cols)
    return [r[a:b + 1] for r in rows]

CLIPS['dash'] = [dict(lean=2, legL=0.9, legR=-0.75, armL=-0.8, armR=0.8, bob=-2, mouth='shout', eyes='wide'),
                 dict(lean=2, legL=0.3, legR=-0.2, armL=-0.3, armR=0.3, bob=0, mouth='open'),
                 dict(lean=2, legL=-0.75, legR=0.9, armL=0.8, armR=-0.8, bob=-2, mouth='shout', eyes='wide'),
                 dict(lean=2, legL=-0.2, legR=0.3, armL=0.3, armR=-0.3, bob=0, mouth='open')]
CLIPS['sing'] = [dict(armLr=0.25, armRr=0.62, mouth='shout', bob=-1, eyes='shut'),
                 dict(armLr=0.3, armRr=0.55, mouth='shout', eyes='shut'),
                 dict(armLr=0.22, armRr=0.66, mouth='shout', bob=-1, eyes='shut'),
                 dict(armLr=0.34, armRr=0.5, mouth='open', eyes='shut')]

def drive_frames(name):
    """seated at the wheel: the figure cropped at the waist, arms forward"""
    out = []
    for p in (dict(armLr=0.5, armRr=0.5, mouth='flat', lean=1),
              dict(armLr=0.6, armRr=0.6, mouth='open', lean=2, bob=-1)):
        rows = build(name, p)
        out.append(trim(crop_rows(rows, 0, int(CAST[name]['waistY']) + 2)))
    w = max(len(r[0]) for r in out); h = max(len(r) for r in out)
    return [[(r + '.' * w)[:w] for r in (['.' * w] * (h - len(f)) + f)] for f in out]

def sleep_frames(name):
    """On his side with his back to the room, which is what a man looks like
    when he does not want the morning to start. Four frames of one slow
    breath: the ribs lift, the shoulder rolls with them, the hide over his
    hip rises, and a foot twitches at the top of the cycle. No face - that is
    the point of the pose - so the whole read is the curve of the back, the
    shoulder blade, the nape and the hair."""
    spec = CAST[name]
    out = []
    BREATH = (0.0, 1.3, 2.2, 1.0)
    for f, lift in enumerate(BREATH):
        twitch = 1 if f == 2 else 0
        W, H = 80, 36
        g = Grid(W, H)
        GY2 = H - 3
        hr = spec['headR']
        hx, hy = 14, GY2 - hr - 3
        # --- the far arm, out in front of him where we can only just see it
        capsule(g, 20, GY2 - 5, 31, GY2 - 2, 2.4, SKIN['dark'])
        g.disc(32, GY2 - 2, 3.0, SKIN['dark'])
        # --- the legs, drawn up: thigh, knee, shin, foot, all behind the back
        g.ellipse(54, GY2 - 7, 10, 7, SKIN['dark'])                            # far thigh
        g.ellipse(64, GY2 - 5 - twitch, 7, 5, SKIN['dark'])                    # far shin
        # --- the back itself: shoulder, the long of the back, the hip. The
        # top edge is the silhouette everything else hangs off.
        g.ellipse(26, GY2 - 11 - lift * 0.7, 10, 9 + lift * 0.5, SKIN['base'])  # shoulder / ribs
        g.ellipse(38, GY2 - 10 - lift * 0.5, 12, 8 + lift * 0.4, SKIN['base'])  # the small of the back
        g.ellipse(51, GY2 - 9, 11, 8, SKIN['base'])                             # hip, the widest point
        g.ellipse(61, GY2 - 8 - twitch, 8, 7.0, SKIN['base'])                   # near thigh
        g.ellipse(70, GY2 - 5 - twitch, 6, 4.5, SKIN['base'])                   # near shin
        g.ellipse(75, GY2 - 5 - twitch * 2, 3.4, 4.6, SKIN['base'])             # foot
        if twitch:
            g.px(77, GY2 - 10, SKIN['hi']); g.px(78, GY2 - 9, SKIN['hi'])
        for k in range(5):                                                     # the crease behind the knee
            g.px(67, GY2 - 3 - k - twitch, SKIN['dark'])
        # --- the nape and the back of the head
        capsule(g, hx + hr * 0.75, hy + hr * 0.45, 22, GY2 - 14, hr * 0.44, SKIN['base'])
        g.ellipse(hx, hy, hr, hr * 1.02, SKIN['base'])
        sil_shade(g, SKIN, 999, edge_dark=True)
        rim(g, SKIN, 999)
        # --- the shoulder blade and the spine, which is what says 'back'
        for i in range(7):
            g.px(24 + i, GY2 - 16 - int(lift * 0.6) + (i > 3), SKIN['mid'])
        for i in range(5):
            g.px(23 + i, GY2 - 13 - int(lift * 0.5), SKIN['mid'])
        for i in range(16):                                                    # the spine, in shadow
            x = 28 + i
            y = GY2 - 13 - int(lift * 0.5) + int(math.sin(i / 15 * math.pi) * 2)
            g.px(x, y, SKIN['dark'])
            if i % 3 == 0: g.px(x, y + 1, SKIN['dark'])
        # --- the hide, pulled up over the hip and the small of the back
        gf = Grid(W, H)
        X0, X1 = 33, 60
        def hide_h(x):
            t = (x - X0) / (X1 - X0)
            return 11 + math.sin(t * math.pi) * 6 + lift
        for x in range(X0, X1):
            for k in range(int(hide_h(x))):
                gf.px(x, GY2 - k, FUR['base'])
        for x in range(X0, X1):
            base = int(hide_h(x))
            for k in range(1 + ((x * 5) % 3)): gf.px(x, GY2 - base - k, FUR['mid'])
        sil_shade(gf, FUR, 999, edge_dark=False)
        for y in range(H):
            for x in range(W):
                if gf.get(x, y) != '.': g.px(x, y, gf.get(x, y))
        for x in range(X0, X1):                                # tufts along the top edge
            top = GY2 - int(hide_h(x)) - (1 + ((x * 5) % 3))
            g.px(x, top - 1, FUR['dark'])
            if x % 4 == 0:
                for k in range(1 + (x % 2)): g.px(x, top - 2 - k, FUR['mid'])
        for k in range(int(12 + lift)):                        # it hangs off both ends
            g.px(X0 - 1, GY2 - k, FUR['dark'])
            g.px(X1, GY2 - k, FUR['dark'])
        for x in range(X0 + 1, X1 - 1, 4):                     # the nap of it
            b2 = int(hide_h(x))
            for k in range(2, b2 - 1, 3): g.px(x + (k % 2), GY2 - k, FUR['dark'])
        # --- the top arm, lying along his side and over the hide
        ga = Grid(W, H)
        capsule(ga, 27, GY2 - 15 - int(lift * 0.6), 40, GY2 - 12 - int(lift * 0.4), 3.4, SKIN['base'])
        capsule(ga, 40, GY2 - 12 - int(lift * 0.4), 47, GY2 - 14, 3.0, SKIN['base'])
        ga.disc(48, GY2 - 14, 3.4, SKIN['base'])
        sil_shade(ga, SKIN, 999, edge_dark=True)
        for y in range(H):
            for x in range(W):
                if ga.get(x, y) != '.':
                    if y > 0 and ga.get(x, y - 1) == '.': g.px(x, y - 1, '0')
                    g.px(x, y, ga.get(x, y))
        for y in range(H):
            for x in range(W):
                if ga.get(x, y) != '.' and ga.get(x, y + 1) == '.': g.px(x, y + 1, '0')
        for (px2, py2) in ((30, GY2 - 18), (36, GY2 - 16), (42, GY2 - 14)):    # the line of it
            g.px(px2, py2 - int(lift * 0.4), SKIN['line'])
        # --- the ear, only just, and the hair over the crown and down the nape
        hcol = spec.get('hair', 'f'); hlit = spec.get('hair2', 'g'); hdark = spec.get('hair3', '0')
        g.ellipse(hx + hr * 0.74, hy + hr * 0.12, hr * 0.20, hr * 0.28, SKIN['mid'])   # the ear, only just
        gh = Grid(W, H)
        HAIR = dict(hi=hlit, base=hcol, mid=hdark, dark=hdark, line='0')
        # one mass, not a bag of circles: a cap over the crown that runs down
        # the nape and thins out where it meets the shoulder
        gh.ellipse(hx - hr * 0.10, hy - hr * 0.34, hr * 1.06, hr * 0.94, hcol)
        gh.ellipse(hx - hr * 0.62, hy + hr * 0.16, hr * 0.62, hr * 0.74, hcol)
        gh.ellipse(hx - hr * 0.50, hy + hr * 0.62, hr * 0.46, hr * 0.44, hcol)
        gh.ellipse(hx + hr * 0.34, hy - hr * 0.62, hr * 0.54, hr * 0.44, hcol)
        sil_shade(gh, HAIR, 999, edge_dark=True)
        for y in range(H):
            for x in range(W):
                if gh.get(x, y) != '.': g.px(x, y, gh.get(x, y))
        for i in range(9):                                     # strands, so it is not a helmet
            ang = -2.5 + i * 0.30
            r0 = hr * 0.5
            x0 = hx + math.cos(ang) * r0 - hr * 0.1
            y0 = hy + math.sin(ang) * r0 - hr * 0.3
            for k in range(3):
                g.px(int(x0 + math.cos(ang) * k * 1.4), int(y0 + math.sin(ang) * k * 1.4),
                     hlit if i % 3 == 0 else hdark)
        # the necklace is under him, where a necklace goes when you lie down
        out.append([''.join(r) for r in g.g])
    return out
