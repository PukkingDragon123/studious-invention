# pixel-art helper library for ONGA BONGA art_beasts
import math, random

def ci(v, a, b): return a if v < a else (b if v > b else v)

class Cv:
    def __init__(self, w, h):
        self.w = w; self.h = h
        self.px = [['.'] * w for _ in range(h)]
    def set(self, x, y, c):
        x = int(x); y = int(y)
        if c is not None and c != '.' and 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = c
    def setif(self, x, y, c, want):
        # only paint if current pixel is in `want` (a string of chars)
        x = int(x); y = int(y)
        if 0 <= x < self.w and 0 <= y < self.h and self.px[y][x] in want:
            self.px[y][x] = c
    def get(self, x, y):
        x = int(x); y = int(y)
        if 0 <= x < self.w and 0 <= y < self.h: return self.px[y][x]
        return '.'
    def rows(self): return [''.join(r) for r in self.px]
    def filled(self):
        return set((x, y) for y in range(self.h) for x in range(self.w) if self.px[y][x] != '.')

# ------------------------------------------------------------------ shapes
def ell(cx, cy, rx, ry):
    s = set()
    if rx <= 0 or ry <= 0: return s
    for y in range(int(math.floor(cy - ry)), int(math.ceil(cy + ry)) + 1):
        for x in range(int(math.floor(cx - rx)), int(math.ceil(cx + rx)) + 1):
            dx = (x - cx) / rx; dy = (y - cy) / ry
            if dx * dx + dy * dy <= 1.02: s.add((x, y))
    return s

def disc(cx, cy, r): return ell(cx, cy, r, r)

def _cr(P, n):
    """catmull-rom over a list of equal-length tuples"""
    if len(P) < 2: return list(P)
    dim = len(P[0])
    Q = [P[0]] + list(P) + [P[-1]]
    out = []
    for i in range(len(Q) - 3):
        p0, p1, p2, p3 = Q[i], Q[i + 1], Q[i + 2], Q[i + 3]
        for j in range(n):
            t = j / n; t2 = t * t; t3 = t2 * t
            v = []
            for d in range(dim):
                v.append(0.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * t +
                        (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 +
                        (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3))
            out.append(tuple(v))
    out.append(tuple(P[-1]))
    return out

def limb(nodes, n=10, sq=1.0):
    """nodes: [(x,y,r),...] -> filled set. sq squashes vertically."""
    s = set()
    for (x, y, r) in _cr(nodes, n):
        if r > 0: s |= ell(x, y, r, max(0.6, r * sq))
    return s

def poly(points):
    s = set()
    ys = [p[1] for p in points]
    y0 = int(math.floor(min(ys))); y1 = int(math.ceil(max(ys)))
    n = len(points)
    for y in range(y0, y1 + 1):
        yc = y + 0.0
        xs = []
        for i in range(n):
            ax, ay = points[i]; bx, by = points[(i + 1) % n]
            if (ay <= yc < by) or (by <= yc < ay):
                t = (yc - ay) / (by - ay)
                xs.append(ax + t * (bx - ax))
        xs.sort()
        for i in range(0, len(xs) - 1, 2):
            for x in range(int(round(xs[i])), int(round(xs[i + 1])) + 1):
                s.add((x, y))
    return s

def polyline(pts, r=1.0, n=10):
    return limb([(p[0], p[1], r) for p in pts], n)

def bbox(s):
    xs = [p[0] for p in s]; ys = [p[1] for p in s]
    return min(xs), min(ys), max(xs), max(ys)

def crop(s, w, h):
    return set(p for p in s if 0 <= p[0] < w and 0 <= p[1] < h)

# ------------------------------------------------------------------ shading
def _ray(s, p, d, cap=16):
    x, y = p; dx, dy = d; k = 0
    while k < cap and (x + dx * (k + 1), y + dy * (k + 1)) in s: k += 1
    return k

BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

def shade(cv, s, ramp, bias=0, grad=True, lit=(-1, -1), band=2, gw=0.0, dither=0.55):
    """paint set s with ramp (dark->light), light from upper-left, Bayer-dithered
       so the tone bands do not read as hard diagonal stripes."""
    n = len(ramp); mid = (n - 1) / 2.0 + bias
    dd = (-lit[0], -lit[1])
    if not s: return
    us = [p[0] + p[1] for p in s]
    umin = min(us); umax = max(us); ur = max(1, umax - umin)
    for p in s:
        a = _ray(s, p, lit); b = _ray(s, p, dd)
        lv = mid
        if a <= 0: lv += 1.7
        elif a <= band: lv += 0.85
        if b <= 0: lv -= 1.7
        elif b <= band: lv -= 0.85
        if grad: lv += (0.5 - (p[0] + p[1] - umin) / ur) * 1.7
        if gw: lv += gw * (0.5 - (p[0] + p[1] - umin) / ur) * 2
        d = (BAYER[(p[1] % 4) * 4 + (p[0] % 4)] + 0.5) / 16.0 - 0.5
        cv.set(p[0], p[1], ramp[ci(int(math.floor(lv + d * dither + 0.5)), 0, n - 1)])

def flat(cv, s, ch):
    for p in s: cv.set(p[0], p[1], ch)

def under(cv, s, ch, depth=2, cols=None):
    """darken the bottom `depth` pixels of each column of s (belly shadow)"""
    by = {}
    for (x, y) in s: by.setdefault(x, []).append(y)
    for x, ys in by.items():
        if cols is not None and x not in cols: continue
        ys.sort()
        for y in ys[-depth:]:
            cv.set(x, y, ch)

def rim(cv, s, ch, d=(-1, -1)):
    """paint the 1px edge of s facing direction d"""
    for p in s:
        if (p[0] + d[0], p[1] + d[1]) not in s: cv.set(p[0], p[1], ch)

def edge_of(s, d=(1, 1)):
    return set(p for p in s if (p[0] + d[0], p[1] + d[1]) not in s)

def outline_set(s):
    o = set()
    for (x, y) in s:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                if (x + dx, y + dy) not in s: o.add((x, y)); break
    return o

def stamp(cv, x0, y0, lines):
    for j, ln in enumerate(lines):
        for i, ch in enumerate(ln):
            if ch != '.' and ch != ' ': cv.set(x0 + i, y0 + j, ch)

def stamp_on(cv, x0, y0, lines, want):
    for j, ln in enumerate(lines):
        for i, ch in enumerate(ln):
            if ch != '.' and ch != ' ': cv.setif(x0 + i, y0 + j, ch, want)

def speck(cv, s, ch, dens, rng, want=None):
    for p in sorted(s):
        if rng.random() < dens:
            if want is None: cv.set(p[0], p[1], ch)
            else: cv.setif(p[0], p[1], ch, want)

# ------------------------------------------------------------------ fire
FIRE = ['y', 'z', 'A', 'B', 'C']
PROF = [(0.00, 0.80), (0.12, 1.00), (0.28, 0.95), (0.45, 0.78), (0.60, 0.60),
        (0.75, 0.42), (0.88, 0.24), (1.00, 0.02)]

def _prof(t):
    for i in range(len(PROF) - 1):
        a, b = PROF[i], PROF[i + 1]
        if a[0] <= t <= b[0]:
            u = (t - a[0]) / (b[0] - a[0])
            return a[1] + (b[1] - a[1]) * u
    return 0.0

def flame_jet(x0, y0, ang, length, r0, r1, rng, phase=0.0, wob=1.0):
    """a cone of flame shooting from (x0,y0) at angle ang (radians, 0=+x, -=up)"""
    out = {}
    dx = math.cos(ang); dy = math.sin(ang)
    nx, ny = -dy, dx
    steps = max(6, int(length * 2.4))
    for i in range(steps + 1):
        t = i / steps
        r = r0 + (r1 - r0) * t
        wig = math.sin(t * 4.2 + phase) * wob * t * r * 0.5
        cx = x0 + dx * length * t + nx * wig
        cy = y0 + dy * length * t + ny * wig
        rr = int(math.ceil(r)) + 1
        for ox in range(-rr, rr + 1):
            for oy in range(-rr, rr + 1):
                d = math.hypot(ox, oy)
                if d > r: continue
                core = (1.0 - t * 0.55) * (1.0 - (d / max(0.7, r)) * 0.9)
                k = (int(round(cx)) + ox, int(round(cy)) + oy)
                if out.get(k, -1) < core: out[k] = core
    # licking tongues off the far end
    for j in range(5):
        t = rng.uniform(0.45, 1.0)
        cx = x0 + dx * length * t; cy = y0 + dy * length * t
        h = rng.uniform(0.5, 1.4) * (r1 + 2)
        merge_fire(out, flame_px(cx + rng.uniform(-r1, r1), cy + rng.uniform(-r1 * 0.5, r1 * 0.6),
                                 h, rng.uniform(0.7, 1.3) * (r0 + 1),
                                 sway=rng.uniform(-2, 2), wob=rng.uniform(-1.5, 1.5),
                                 phase=phase + j))
    return out

def flame_px(bx, by, h, hw, sway=0.0, wob=0.0, phase=0.0, lean=0.0):
    """returns dict (x,y)->coreness 0..1 for a flame tongue rising from (bx,by)."""
    out = {}
    steps = max(3, int(h * 2.2))
    for i in range(steps + 1):
        t = i / steps
        y = by - h * t
        ax = bx + sway * t * t + wob * math.sin(t * 5.0 + phase) * t + lean * t
        r = hw * _prof(t)
        x0 = int(math.floor(ax - r)); x1 = int(math.ceil(ax + r))
        for x in range(x0, x1 + 1):
            if abs(x - ax) > r + 0.35: continue
            o = abs(x - ax) / max(0.6, r)
            core = (1.0 - t * 0.92) * (1.0 - o * 0.85)
            yy = int(round(y))
            if out.get((x, yy), -1) < core: out[(x, yy)] = core
    return out

def paint_fire(cv, pix, boost=0.0, over=None):
    """pix: dict (x,y)->coreness. over: string of chars we're allowed to overwrite
       (None = anything)."""
    for (x, y), c in pix.items():
        c = c + boost
        if c > 0.68: ch = 'C'
        elif c > 0.47: ch = 'B'
        elif c > 0.26: ch = 'A'
        elif c > 0.11: ch = 'z'
        else: ch = 'y'
        if over is None: cv.set(x, y, ch)
        else: cv.setif(x, y, ch, over)

def merge_fire(a, b):
    for k, v in b.items():
        if a.get(k, -1) < v: a[k] = v
    return a

def fire_ridge(pts, rng, hmin, hmax, hw, step=3.0, sway=-2.0, phase=0.0, base=1.2):
    """flames along a path. pts: [(x,y)] path (the ridge). returns pix dict."""
    path = _cr([(p[0], p[1]) for p in pts], 8)
    out = {}
    # hot base along the ridge
    for (x, y) in path:
        for dy in range(0, int(base) + 1):
            k = (int(round(x)), int(round(y)) - dy)
            if out.get(k, -1) < 0.56: out[k] = 0.56
    d = 0.0; last = path[0]; acc = 0.0
    for (x, y) in path:
        acc += math.hypot(x - last[0], y - last[1]); last = (x, y)
        if acc >= step:
            acc = 0.0
            h = rng.uniform(hmin, hmax)
            merge_fire(out, flame_px(x, y, h, hw * rng.uniform(0.8, 1.25),
                                     sway=sway * rng.uniform(0.5, 1.5),
                                     wob=rng.uniform(-1.2, 1.2),
                                     phase=phase + rng.uniform(0, 6.28)))
    return out

# ------------------------------------------------------------------ output
def emit(name, frames, outline=True, fh=None):
    parts = []
    for rows in frames:
        parts.append('[\n' + ',\n'.join("'" + r + "'" for r in rows) + ']')
    body = ',\n'.join(parts)
    if outline:
        return "SPRITES.%s = { outline: true, frames: [\n%s]};\n" % (name, body)
    return "SPRITES.%s = { frames: [\n%s]};\n" % (name, body)
