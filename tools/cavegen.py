"""Caveman generator - every human in the game comes out of here.

90s Saturday-morning cartoon: chunky rounded limbs built from capsules, flat
colour with one shadow tone that follows the silhouette, a rim light down the
near edge, and the far arm and leg a tone back so limbs never merge into the
torso.

The detail passes are what make it a cartoon rather than a shape: eyes with an
iris, a pupil and a catchlight under a heavy angular brow; ears; a wedge nose
with a nostril; mouths with teeth and a tongue; collarbones, pecs or a belly
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
    """A 90s cartoon face: big eyes with a highlight, a heavy angular brow,
    a real nose with a nostril, and a mouth with teeth in it."""
    cx, hy, hr = m['cx'], m['headY'], m['headR']
    eyeY = hy + hr * 0.10
    dx = hr * 0.46
    shut = pose.get('eyes') == 'shut'
    wide = pose.get('eyes') == 'wide'
    angry = pose.get('angry')
    bc = spec.get('brow', '0')

    # --- ear on the near side, with an inner fold
    ex0 = cx - hr * 0.96
    g.ellipse(ex0, hy + hr * 0.18, hr * 0.22, hr * 0.30, SKIN['base'])
    g.ellipse(ex0 + 0.6, hy + hr * 0.18, hr * 0.11, hr * 0.17, SKIN['mid'])

    # --- eyes
    if shut:
        for side in (-1, 1):
            X = cx + side * dx
            for i in range(6): g.px(X - 2.5 + i, eyeY + 1 + (0.5 if 0 < i < 5 else 0), SKIN['line'])
            for i in range(4): g.px(X - 1.5 + i, eyeY + 2.4, SKIN['mid'])
    else:
        rw = (2.9 if wide else 2.4)
        rh = rw * (1.25 if wide else 1.1)
        for side in (-1, 1):
            X = cx + side * dx
            g.ellipse(X, eyeY + 0.6, rw, rh, '7')                  # white
            g.ellipse(X, eyeY + 0.6, rw * 0.92, rh * 0.92, '6')    # soft edge
            g.ellipse(X, eyeY + 0.6, rw * 0.80, rh * 0.86, '7')
            ix = X + pose.get('look', 0)
            g.ellipse(ix, eyeY + 0.9, rw * 0.50, rh * 0.62, spec.get('iris', 'j'))   # iris
            g.ellipse(ix, eyeY + 1.0, rw * 0.28, rh * 0.38, '0')                      # pupil
            g.px(ix - rw * 0.32, eyeY - rh * 0.16, '7')                               # catchlight
            g.px(ix - rw * 0.32 + 1, eyeY - rh * 0.16, '7')
            for i in range(int(rw * 2)):                                              # lash line
                g.px(X - rw + i, eyeY - rh + 0.4, SKIN['dark'])
    # --- brows: thick, angular, and the single loudest thing on the face
    for side in (-1, 1):
        X = cx + side * dx
        by = eyeY - hr * 0.46
        n = 7
        for i in range(n):
            x = X - 3 + i
            tilt = (i - n / 2) * 0.30 * (side if angry else 0)
            for k in range(2): g.px(x, by + tilt + k, bc)
        if angry:
            for k in range(2): g.px(X + side * 3.4, by + 1.4 * side + k, bc)

    # --- nose: a wedge with a nostril and a shadow under it
    ny = eyeY + hr * 0.30
    for k in range(3):
        wdt = 2 + k
        for i in range(wdt):
            g.px(cx - 1 + i, ny + k, SKIN['base'] if i < wdt - 1 else SKIN['mid'])
    g.px(cx - 1, ny, SKIN['hi'])
    g.px(cx + 2, ny + 2, SKIN['line'])                                  # nostril
    for i in range(4): g.px(cx - 1 + i, ny + 3, SKIN['dark'])

    # --- mouth
    mo = pose.get('mouth', 'flat')
    my = hy + hr * 0.74
    if mo in ('open', 'shout'):
        w = 3.4 if mo == 'open' else 4.6
        h2 = 2.8 if mo == 'open' else 4.0
        g.ellipse(cx, my + 1.5, w + 0.8, h2 + 0.8, SKIN['line'])
        g.ellipse(cx, my + 1.5, w, h2, '0')
        for i in range(int(w * 1.7)): g.px(cx - w * 0.85 + i, my - h2 * 0.35 + 1.5, '$')   # top teeth
        g.ellipse(cx, my + h2 * 0.7 + 1.5, w * 0.62, h2 * 0.34, 'E')                        # tongue
    elif mo == 'grin':
        for i in range(10): g.px(cx - 5 + i, my + 1 + (1 if 1 < i < 8 else 0), SKIN['line'])
        for i in range(8): g.px(cx - 4 + i, my + 2 + (1 if 1 < i < 6 else 0), '$')
        for i in range(0, 8, 2): g.px(cx - 4 + i, my + 2 + (1 if 1 < i < 6 else 0), '6')    # tooth gaps
    else:
        for i in range(7): g.px(cx - 3.5 + i, my + 1, SKIN['line'])
        for i in range(5): g.px(cx - 2.5 + i, my + 2, SKIN['hi'])
    # cheek
    g.px(cx - hr * 0.66, my - 1, SKIN['mid']); g.px(cx - hr * 0.66, my, SKIN['mid'])

    if spec.get('beard'):
        bc2 = spec.get('beardCol', '6')
        # sits below the mouth and to the sides of it, never over it
        g.ellipse(cx, my + 7, hr * 0.74, hr * 0.44, SKIN['dark'])
        g.ellipse(cx, my + 6.6, hr * 0.70, hr * 0.40, bc2)
        g.ellipse(cx - 1, my + 6.2, hr * 0.48, hr * 0.24, '7')
        for side in (-1, 1):                                          # sideburns down the jaw
            g.ellipse(cx + side * hr * 0.62, my + 1, hr * 0.20, hr * 0.34, bc2)
        for i in range(9):                                            # strands
            bx = cx - hr * 0.56 + i * (hr * 0.14)
            for k in range(1 + (i % 3)): g.px(bx, my + 7 + hr * 0.40 + k, bc2)
        for i in range(7): g.px(cx - 3.5 + i, my - 1, '5')             # moustache, above the mouth
        for i in range(5): g.px(cx - 2.5 + i, my - 2, '7')
    if spec.get('stubble'):
        for i in range(14):
            g.px(cx - hr * 0.58 + (i * 7) % int(hr * 1.2), my + 4 + (i % 2), SKIN['dark'])

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
    top = hy - hr * 0.82
    if style == 'mop':
        g.ellipse(cx, top + 1, hr * 1.04, hr * 0.62, c)
        for ox, oy, r in ((-0.92, 0.20, 0.40), (-0.48, -0.26, 0.46), (0.08, -0.36, 0.46),
                          (0.60, -0.22, 0.42), (0.98, 0.14, 0.38)):
            g.disc(cx + ox * hr, top + oy * hr, hr * r, c)
        for i in range(5):                                            # a parted fringe
            if i == 2: continue                                       # the part itself
            fx = cx - hr * 0.9 + i * (hr * 0.45)
            for k in range(2 + (i % 2)): g.px(fx, top + hr * 0.46 + k, c)
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
        g.ellipse(cx, top + 1, hr * 1.18, hr * 0.84, c)
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
    # a belt at the waist
    for i in range(int(w * 1.9)):
        g.px(cx - w * 0.95 + i, top, FUR['dark'])
        g.px(cx - w * 0.95 + i, top + 1, FUR['mid'])
    g.ellipse(cx + w * 0.1, top + 0.5, 2.6, 2.0, BONE['base'])
    g.px(cx + w * 0.1 - 1, top - 0.5, BONE['hi'])
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
    """a cord of teeth, not a row of dots"""
    cx, shoY = m['cx'], m['shoY']
    y0 = shoY + 2
    n = 9
    for i in range(n):
        t = i / (n - 1)
        x = cx + (t - 0.5) * m['shoW'] * 0.66
        y = y0 + math.sin(t * math.pi) * 3.0
        g.px(x, y - 1, SKIN['dark'])
        if i % 2 == 0:
            for k in range(3):                                    # a tooth, tapering
                wdt = 2 - (k > 1)
                for w in range(wdt): g.px(x - wdt / 2 + w, y + k, BONE['hi'] if k == 0 else BONE['base'])
        else:
            g.px(x, y, BONE['mid'])
    g.ellipse(cx, y0 + 6, 1.8, 2.6, BONE['base'])
    g.px(cx - 1, y0 + 5, BONE['hi'])

# --- cast --------------------------------------------------------------------
ADULT = dict(w=52, h=76, headR=11.5, headY=17, waistY=48, shoW=29, hipW=20,
             armR=3.9, legR=4.5, furLen=11, brow='0', iris='j')
CAST = {
  'bronk':     dict(ADULT, build='fat', shoW=32, hipW=25, headR=12, waistY=50, furLen=12,
                    hair='f', hair2='g', hair3='0', hairStyle='mop', stubble=True, neck=True),
  'vela':      dict(ADULT, build='slim', female=True, w=50, shoW=23, hipW=19, headR=11,
                    hair='A', hair2='B', hair3='z', hairStyle='curls', hairBone=True,
                    furLen=15, strap=True, neck=True, iris='u'),
  'elder':     dict(ADULT, build='slim', shoW=25, hipW=19, headR=11, hair='6', hair2='7',
                    hair3='5', hairStyle='bald', beard=True, beardCol='6', furLen=17,
                    brow='5', iris='k'),
  'brute':     dict(ADULT, w=58, h=80, build='strong', shoW=38, hipW=23, headR=11.5, headY=18,
                    waistY=52, armR=5.2, legR=5.2, hair='z', hair2='A', hair3='y',
                    hairStyle='spike', furLen=11, neck=True, abs=True, iris='y'),
  'villager':  dict(ADULT, build='strong', shoW=28, hipW=20, hair='g', hair2='h', hair3='f',
                    hairStyle='mop', furLen=10, neck=True),
  'villager2': dict(ADULT, build='slim', female=True, shoW=23, hipW=19, hair='h', hair2='i',
                    hair3='g', hairStyle='bun', furLen=14, strap=True, neck=True),
  'kid_a':     dict(w=34, h=50, build='kid', headR=9, headY=12.5, waistY=31, shoW=17, hipW=13,
                    armR=2.7, legR=3.1, furLen=7, brow='0', iris='j',
                    hair='z', hair2='A', hair3='y', hairStyle='spike'),
  'kid_b':     dict(w=34, h=50, build='kid', headR=9, headY=12.5, waistY=31, shoW=16, hipW=13,
                    armR=2.7, legR=3.1, furLen=8, brow='0', iris='g',
                    hair='g', hair2='h', hair3='f', hairStyle='bun', female=True, hairBone=True),
}

def build(name, pose):
    spec = CAST[name]
    g, m = figure(spec, pose)
    anatomy(g, m, spec, pose)
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
    """flat on his back: head left, belly up, feet right - built from the same
    primitives as the standing figure so the style matches"""
    spec = CAST[name]
    out = []
    for lift in (0, 1):
        W, H = 72, 34
        g = Grid(W, H)
        GY2 = H - 3
        hr = spec['headR']
        hx, hy = 13, GY2 - hr - 1
        # --- body: chest, belly, thighs, feet, laid along the ground
        g.ellipse(34, GY2 - 8 - lift, 15, 9 + lift, SKIN['base'])          # the belly
        g.ellipse(22, GY2 - 6, 8, 6, SKIN['base'])                          # chest
        g.ellipse(50, GY2 - 5, 9, 5, SKIN['base'])                          # thighs
        g.ellipse(60, GY2 - 4, 6, 4, SKIN['base'])                          # shins
        g.ellipse(66, GY2 - 5, 3.4, 4.6, SKIN['base'])                      # feet, toes up
        capsule(g, 24, GY2 - 12, 34, GY2 - 14 - lift, 3.0, SKIN['base'])    # arm across
        g.disc(36, GY2 - 14 - lift, 3.4, SKIN['base'])                      # hand on the belly
        # --- head
        g.ellipse(hx, hy, hr, hr * 1.02, SKIN['base'])
        g.ellipse(hx + 1, hy + hr * 0.45, hr * 0.8, hr * 0.5, SKIN['base'])
        capsule(g, hx + hr * 0.7, hy + hr * 0.5, 18, GY2 - 9, hr * 0.42, SKIN['base'])
        sil_shade(g, SKIN, 999, edge_dark=True)          # shade by row, light from above-left
        rim(g, SKIN, 999)
        # --- fur pulled over the middle
        gf = Grid(W, H)
        for x in range(24, 50):
            t = (x - 24) / 26
            h2 = 11 + math.sin(t * math.pi) * 4 + lift
            for k in range(int(h2)):
                gf.px(x, GY2 - k, FUR['base'])
        for x in range(24, 50):
            d = 1 + ((x * 5) % 3)
            for k in range(d): gf.px(x, GY2 - int(11 + math.sin((x - 24) / 26 * math.pi) * 4 + lift) - k, FUR['base'])
        sil_shade(gf, FUR, 999, edge_dark=False)
        for y in range(H):
            for x in range(W):
                if gf.get(x, y) != '.': g.px(x, y, gf.get(x, y))
        # --- face, eyes shut, mouth open
        for i in range(5): g.px(hx - 5 + i, hy - 1, SKIN['line'])            # brow
        for i in range(5): g.px(hx - 5 + i, hy + 2, SKIN['line'])            # shut eye
        g.px(hx - 8, hy + 3, SKIN['hi']); g.px(hx - 9, hy + 4, SKIN['base']); g.px(hx - 8, hy + 5, SKIN['mid'])
        mw = 3 + lift
        g.ellipse(hx - 2, hy + hr * 0.66, mw, 2.2 + lift * 0.6, '0')
        g.ellipse(hx - 2, hy + hr * 0.66 + 1, mw * 0.6, 1, 'E')
        # --- hair, shoved back by the pillow
        hair(g, dict(cx=hx + 2, headY=hy - 1, headR=hr, shoY=0, waistY=0, hipY=0, footY=0, shoW=0, hipW=0),
             dict(spec, hairStyle=spec.get('hairStyle', 'mop')), {})
        # --- necklace
        for i in range(5): g.px(20 + i, GY2 - 12 + abs(i - 2), BONE['hi'] if i % 2 else BONE['base'])
        out.append([''.join(r) for r in g.g])
    return out
