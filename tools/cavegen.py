"""Reference-style caveman generator: flat colour, chunky rounded shapes,
big hair, heavy brows, fur with a zigzag hem. Everything is built from
capsules and ellipses so the silhouette stays smooth at this size."""
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
    cx, hy, hr = m['cx'], m['headY'], m['headR']
    eyeY = hy + hr * 0.12
    dx = hr * 0.42
    look = pose.get('look', 0)
    shut = pose.get('eyes') == 'shut'
    wide = pose.get('eyes') == 'wide'
    # heavy angular brows - the single most reference-ish feature
    bc = spec.get('brow', '0')
    for side in (-1, 1):
        ex = cx + side * dx
        by = eyeY - hr * 0.42 - (0.6 if pose.get('angry') else 0)
        for i in range(4):
            x = ex - 1.5 + i
            y = by + (i * 0.5 * side if pose.get('angry') else 0)
            g.px(x, y, bc); g.px(x, y + 1, bc)
    if shut:
        for side in (-1, 1):
            ex = cx + side * dx
            for i in range(4): g.px(ex - 1.5 + i, eyeY + 1, SKIN['line'])
    else:
        r = 2.4 if wide else 1.9
        for side in (-1, 1):
            ex = cx + side * dx
            g.ellipse(ex, eyeY + 0.6, r, r * 1.15, '7')
            g.ellipse(ex + look, eyeY + 0.9, r * 0.52, r * 0.72, '0')
    # nose: a proper wedge with a shadow under it, not a speck
    nx, ny = cx, eyeY + hr * 0.36
    for k in range(3):
        wdt = 2 + k
        for i in range(wdt):
            g.px(nx - 1 + i, ny + k, SKIN['base'] if i < wdt - 1 else SKIN['mid'])
    g.px(nx - 1, ny, SKIN['hi'])
    for i in range(4): g.px(nx - 1 + i, ny + 3, SKIN['dark'])
    # mouth
    mo = pose.get('mouth', 'flat')
    my = hy + hr * 0.62
    if mo == 'open' or mo == 'shout':
        w = 3 if mo == 'open' else 4
        g.ellipse(cx, my + 1, w, 2.6 if mo == 'open' else 3.4, '0')
        g.ellipse(cx, my + 2, w * 0.7, 1.2, 'E')
        if mo == 'shout':
            for i in range(int(w * 1.4)): g.px(cx - w + 1 + i, my - 1, '$')
    elif mo == 'grin':
        for i in range(8): g.px(cx - 4 + i, my + 1 + (1 if 1 < i < 6 else 0), SKIN['line'])
        for i in range(6): g.px(cx - 3 + i, my + 2 + (1 if 1 < i < 4 else 0), '$')
    else:
        for i in range(6): g.px(cx - 3 + i, my + 1, SKIN['line'])
        for i in range(4): g.px(cx - 2 + i, my + 2, SKIN['hi'])
    if spec.get('beard'):
        bc2 = spec.get('beardCol', '6')
        g.ellipse(cx, my + 5, hr * 0.74, hr * 0.50, bc2)      # sits below the mouth
        g.ellipse(cx, my + 5, hr * 0.58, hr * 0.34, '7')
        for i in range(5): g.px(cx - 2 + i, my + 1, '5')      # the moustache line
        g.px(cx - 1, my + 2, '0'); g.px(cx, my + 2, '0'); g.px(cx + 1, my + 2, '0')
    if spec.get('stubble'):
        for i in range(14):
            g.px(cx - hr * 0.6 + (i * 5) % (hr * 1.2), my + 2 + (i % 3), SKIN['dark'])

# --- hair --------------------------------------------------------------------
def hair(g, m, spec, pose):
    cx, hy, hr = m['cx'], m['headY'], m['headR']
    c, c2 = spec['hair'], spec.get('hair2', spec['hair'])
    style = spec.get('hairStyle', 'mop')
    top = hy - hr * 0.62
    if style == 'mop':
        g.ellipse(cx, top, hr * 1.06, hr * 0.72, c)
        for i, (ox, oy, r) in enumerate(((-0.9, 0.1, 0.44), (-0.45, -0.34, 0.5), (0.1, -0.44, 0.5),
                                         (0.6, -0.3, 0.46), (1.0, 0.05, 0.4))):
            g.disc(cx + ox * hr, top + oy * hr, hr * r, c)
        g.ellipse(cx - hr * 0.2, top - hr * 0.16, hr * 0.56, hr * 0.3, c2)
    elif style == 'spike':
        g.ellipse(cx, top + 1, hr * 1.02, hr * 0.6, c)
        for i in range(7):
            t = i / 6
            sx = cx + (t - 0.5) * hr * 2.0
            sh = hr * (0.5 + 0.45 * math.sin(t * 3.1))
            for k in range(int(sh)):
                wdt = max(1, int((1 - k / sh) * 3))
                for w in range(wdt): g.px(sx - wdt / 2 + w, top - k, c if k < sh * 0.6 else c2)
    elif style == 'curls':
        g.ellipse(cx, top + 1, hr * 1.16, hr * 0.8, c)
        for i, (ox, oy, r) in enumerate(((-1.15, 0.2, 0.5), (-0.8, -0.4, 0.55), (-0.2, -0.6, 0.58),
                                         (0.45, -0.52, 0.55), (1.0, -0.15, 0.52), (1.2, 0.35, 0.45),
                                         (-1.25, 0.75, 0.42), (1.3, 0.8, 0.4))):
            g.disc(cx + ox * hr, top + oy * hr, hr * r, c)
        for ox, oy in ((-0.7, -0.35), (0.2, -0.5), (0.9, -0.2)):
            g.disc(cx + ox * hr, top + oy * hr - 1, hr * 0.26, c2)
    elif style == 'bun':
        g.ellipse(cx, top + 2, hr * 0.98, hr * 0.62, c)
        g.disc(cx + hr * 0.1, top - hr * 0.56, hr * 0.52, c)
        g.disc(cx + hr * 0.0, top - hr * 0.62, hr * 0.26, c2)
    elif style == 'bald':
        g.ellipse(cx - hr * 0.1, top + 3, hr * 0.96, hr * 0.4, c)
    if spec.get('hairBone'):
        by = top - hr * 0.3
        for i in range(int(hr * 1.3)): g.px(cx - hr * 0.65 + i, by, BONE['base'])
        g.disc(cx - hr * 0.7, by, 1.7, BONE['hi']); g.disc(cx + hr * 0.66, by, 1.7, BONE['hi'])

# --- fur ---------------------------------------------------------------------
def fur(g, m, spec, pose):
    cx, waistY, hipW, shoW = m['cx'], m['waistY'], m['hipW'], m['shoW']
    top = waistY - spec.get('furRise', 2)
    bot = top + spec['furLen']
    w = hipW * 0.62 + 2
    for y in range(int(top), int(bot) + 1):
        t = (y - top) / max(1, bot - top)
        ww = w * (0.94 + t * 0.26)
        g.ellipse(cx, y, ww, 1.2, FUR['base'])
    # a zigzag hem, which is what makes it read as fur and not a skirt
    for i in range(int(w * 2.4)):
        x = cx - w * 1.2 + i
        d = 2 + ((i * 5) % 3) + (2 if i % 4 == 0 else 0)
        for k in range(d):
            g.px(x, bot + k, FUR['base'] if k < d - 1 else FUR['mid'])
    # short strokes through it
    for i in range(int(w * 2.0)):
        x = cx - w * 1.0 + i * 1.0
        if (i * 7) % 5: continue
        for k in range(3): g.px(x, top + 2 + ((i * 3) % int(max(2, bot - top - 3))) + k, FUR['mid'])
    if spec.get('strap'):     # over one shoulder, like the reference
        sx = cx - shoW * 0.42
        for i in range(int(m['shoY']), int(top) + 1):
            t = (i - m['shoY']) / max(1, top - m['shoY'])
            capsule(g, sx + t * shoW * 0.55, i, sx + t * shoW * 0.55, i, 2.4, FUR['base'])
    sil_shade(g, FUR, m['cx'], edge_dark=False)
    rim(g, FUR, m['cx'])

def necklace(g, m, spec):
    cx, hy, hr, shoY = m['cx'], m['headY'], m['headR'], m['shoY']
    y0 = shoY + 1
    n = 7
    for i in range(n):
        t = i / (n - 1)
        x = cx + (t - 0.5) * m['shoW'] * 0.62
        y = y0 + math.sin(t * math.pi) * 2.6
        g.px(x, y, BONE['hi'] if i % 2 == 0 else BONE['base'])
    g.px(cx, y0 + 4, BONE['mid']); g.px(cx, y0 + 5, BONE['hi'])

# --- cast --------------------------------------------------------------------
ADULT = dict(w=46, h=68, headR=10, headY=14, waistY=42, shoW=26, hipW=18,
             armR=3.4, legR=4.0, furLen=9, brow='0')
CAST = {
  'bronk':     dict(ADULT, build='fat', shoW=28, hipW=22, headR=10.5, waistY=44, furLen=10,
                    hair='f', hair2='g', hairStyle='mop', stubble=True, neck=True),
  'vela':      dict(ADULT, build='slim', female=True, w=44, shoW=21, hipW=17, headR=9.5,
                    hair='A', hair2='B', hairStyle='curls', hairBone=True, furLen=13, strap=True, neck=True),
  'elder':     dict(ADULT, build='slim', shoW=23, hipW=17, headR=9.5, hair='6', hair2='7',
                    hairStyle='bald', beard=True, beardCol='6', furLen=15, brow='5'),
  'brute':     dict(ADULT, w=50, h=70, build='strong', shoW=34, hipW=21, headR=10, headY=15,
                    waistY=44, armR=5.0, legR=5.0, hair='z', hair2='A', hairStyle='spike', furLen=10, neck=True),
  'villager':  dict(ADULT, build='strong', shoW=25, hipW=18, hair='g', hair2='h',
                    hairStyle='mop', furLen=9, neck=True),
  'villager2': dict(ADULT, build='slim', female=True, shoW=21, hipW=17, hair='h', hair2='i',
                    hairStyle='bun', furLen=12, strap=True, neck=True),
  'kid_a':     dict(w=30, h=44, build='kid', headR=8, headY=11, waistY=27, shoW=15, hipW=12,
                    armR=2.4, legR=2.8, furLen=6, brow='0', hair='z', hair2='A', hairStyle='spike'),
  'kid_b':     dict(w=30, h=44, build='kid', headR=8, headY=11, waistY=27, shoW=14, hipW=12,
                    armR=2.4, legR=2.8, furLen=7, brow='0', hair='g', hair2='h', hairStyle='bun',
                    female=True, hairBone=True),
}

def build(name, pose):
    spec = CAST[name]
    g, m = figure(spec, pose)
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
