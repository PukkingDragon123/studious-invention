"""The valley's ground, remade. Every tile is 32x32 and seamless: all the
noise here is built from sines whose periods divide 32, so a tile's right
edge is its left edge and nothing lines up into a grid.

The rule for ground is calm: big soft clusters of two or three tones, a
Bayer dither only where two tones meet, and a very little detail on top.
The props and the people are the busy part of the picture; the ground is
where the eye rests."""
import math, random

N = 32
TAU = math.pi * 2
BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

def pnoise(x, y, seed, terms=((1, 0), (0, 1), (1, 1), (2, -1), (1, 2), (3, 1))):
    """tileable value in roughly -1..1: a sum of sines with integer periods"""
    r = random.Random(seed)
    v = 0.0
    for (a, b) in terms:
        ph = r.uniform(0, TAU)
        amp = 1.0 / (1 + (abs(a) + abs(b)) * 0.55)
        v += math.sin(TAU * (a * x + b * y) / N + ph) * amp
    return v / 2.2

def bands(x, y, v, cuts, chars, dither=0.12):
    """pick a char from `chars` by where v falls among `cuts`, dithering near cuts"""
    d = (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16.0 - 0.5
    v = v + d * dither * 2
    for i, c in enumerate(cuts):
        if v < c: return chars[i]
    return chars[-1]

def blank():
    return [['.'] * N for _ in range(N)]

def put(g, x, y, c):
    g[y % N][x % N] = c

def rows(g): return [''.join(r) for r in g]

# ----------------------------------------------------------------- grasses
def grass(seed, base='v', dark='u', light='w', deep='t', hi='x', flowers=0, blades=7):
    g = blank(); r = random.Random(seed)
    for y in range(N):
        for x in range(N):
            # low-frequency patches only: the ground should be calm
            # each variant gets its own set of waves, so no two share a motif
            T = [((1, 0), (0, 1), (1, 1)), ((1, -1), (0, 1), (2, 1)), ((1, 0), (1, 2), (0, 1)), ((2, 1), (1, -1), (1, 0))][seed % 4]
            v = pnoise(x, y, seed, terms=T)
            g[y][x] = bands(x, y, v, (-0.95, 0.62), (dark, base, light), dither=0.05)
    for _ in range(blades):                              # a few short blades, not a carpet
        x, y = r.randrange(N), r.randrange(N)
        put(g, x, y, dark); put(g, x, y - 1, light)
        if r.random() < 0.5: put(g, x + 1, y, dark); put(g, x + 1, y - 1, base)
    for _ in range(flowers):
        x, y = r.randrange(N), r.randrange(N)
        col = r.choice(['C', '6', 'X', 'T'])
        put(g, x, y + 1, dark)
        put(g, x, y, 'B' if col != 'B' else 'C')
        put(g, x - 1, y, col); put(g, x + 1, y, col); put(g, x, y - 1, col)
    return rows(g)

# ---------------------------------------------------------------- the road
def road(seed, base='l', dark='k', light='m', deep='j', pebbles=6):
    """packed earth, worn into two faint ruts, with stones in it"""
    g = blank(); r = random.Random(seed)
    for y in range(N):
        for x in range(N):
            v = pnoise(x, y, seed, terms=((1, 0), (0, 1), (1, 1))) * 0.8
            g[y][x] = bands(x, y, v, (-0.62, 0.58), (dark, base, light), dither=0.05)
    for _ in range(pebbles):
        x, y = r.randrange(N), r.randrange(N)
        w = r.randint(2, 3)
        for i in range(w): put(g, x + i, y, 'q'); put(g, x + i, y + 1, 'o')
        put(g, x, y, 'r')
    for _ in range(10):                                  # grit
        put(g, r.randrange(N), r.randrange(N), deep)
    return rows(g)

def dirt(seed):
    g = blank(); r = random.Random(seed)
    for y in range(N):
        for x in range(N):
            v = pnoise(x, y, seed)
            g[y][x] = bands(x, y, v, (-0.35, 0.3), ('j', 'k', 'l'))
    for _ in range(8):
        x, y = r.randrange(N), r.randrange(N)
        put(g, x, y, 'm'); put(g, x + 1, y, 'l'); put(g, x, y + 1, 'j')
    return rows(g)

# ------------------------------------------------------------- flagstones
def flags(seed):
    """a cobbled plaza: fat rounded stones of a few sizes packed in grit, each
    lit on its upper left and shadowed on its lower right"""
    g = blank(); r = random.Random(seed)
    for y in range(N):
        for x in range(N):
            g[y][x] = bands(x, y, pnoise(x, y, seed) * 0.5, (-0.5, 0.6), ('o', 'p', 'p'), 0.05)
    pts = []
    for _ in range(400):
        if len(pts) > 22: break
        x, y, rr = r.uniform(0, N), r.uniform(0, N), r.uniform(3.2, 5.2)
        ok = True
        for (px, py, pr) in pts:
            dx = min(abs(px - x), N - abs(px - x)); dy = min(abs(py - y), N - abs(py - y))
            if math.hypot(dx, dy) < pr + rr + 0.8: ok = False; break
        if ok: pts.append((x, y, rr))
    for (sx, sy, rr) in pts:
        tone = r.choice(['q', 'q', 'r'])
        for yy in range(int(sy - rr) - 1, int(sy + rr) + 2):
            for xx in range(int(sx - rr) - 1, int(sx + rr) + 2):
                d = math.hypot(xx - sx, (yy - sy) * 1.15)
                if d > rr: continue
                u = (xx - sx) + (yy - sy)
                c = 's' if u < -rr * 0.9 and d > rr * 0.4 else ('p' if u > rr * 0.8 else tone)
                put(g, xx, yy, c)
    return rows(g)

def rubble(seed):
    g = blank(); r = random.Random(seed)
    for y in range(N):
        for x in range(N):
            g[y][x] = bands(x, y, pnoise(x, y, seed), (-0.3, 0.35), ('o', 'p', 'q'))
    for _ in range(7):
        x, y, w = r.randrange(N), r.randrange(N), r.randint(3, 5)
        for i in range(w):
            for j in range(2):
                put(g, x + i, y + j, 'q' if j == 0 else 'p')
            put(g, x + i, y + 2, 'o')
        put(g, x, y, 'r'); put(g, x + 1, y, 's')
    return rows(g)

def sand(seed):
    g = blank(); r = random.Random(seed)
    for y in range(N):
        for x in range(N):
            v = math.sin(TAU * (x + y * 2) / N * 2 + pnoise(x, y, seed) * 2)
            g[y][x] = bands(x, y, v * 0.6 + pnoise(x, y, seed + 1) * 0.3, (-0.45, 0.45), ('m', 'n', 'n'))
    for _ in range(8): put(g, r.randrange(N), r.randrange(N), 'l')
    return rows(g)

def ash(seed):
    g = blank(); r = random.Random(seed)
    for y in range(N):
        for x in range(N):
            g[y][x] = bands(x, y, pnoise(x, y, seed), (-0.38, 0.4), ('o', 'p', 'q'))
    for _ in range(9):
        x, y = r.randrange(N), r.randrange(N)
        put(g, x, y, r.choice(['z', 'y', '2']))
    return rows(g)

# ----------------------------------------------------------- water, lava
def water(seed, frame):
    g = blank(); r = random.Random(seed)
    sh = frame * 4
    for y in range(N):
        for x in range(N):
            v = pnoise(x + sh, y, seed) * 0.6 + math.sin(TAU * (y + sh) / 16) * 0.25
            g[y][x] = bands(x, y, v, (-0.35, 0.3), ('I', 'J', 'K'))
    for k in range(5):                                    # glints that drift
        x = (k * 7 + frame * 3) % N; y = (k * 11 + 5) % N
        put(g, x, y, 'L'); put(g, x + 1, y, 'L'); put(g, x + 2, y, 'K')
    return rows(g)

def lava(seed, frame):
    g = blank()
    sh = frame * 3
    for y in range(N):
        for x in range(N):
            v = pnoise(x, y + sh, seed) * 0.8
            g[y][x] = bands(x, y, v, (-0.3, 0.1, 0.45), ('y', 'z', 'A', 'B'))
    r = random.Random(seed + frame)
    for _ in range(6):
        x, y = r.randrange(N), r.randrange(N)
        put(g, x, y, 'C'); put(g, x + 1, y, 'B')
    return rows(g)

def build():
    T = {}
    T['tile_grass'] = [grass(11, flowers=0)]
    T['tile_grass2'] = [grass(23, flowers=2)]
    T['tile_grass3'] = [grass(31, flowers=0, blades=4)]
    T['tile_grass4'] = [grass(47, flowers=1, blades=9)]
    T['tile_moss'] = [grass(37, base='u', dark='t', light='v', deep='t', hi='w', flowers=0, blades=6)]
    T['tile_moss2'] = [grass(59, base='u', dark='t', light='v', deep='t', hi='w', flowers=0, blades=3)]
    T['tile_path'] = [road(41)]
    T['tile_dirt'] = [dirt(53)]
    T['tile_dirt2'] = [dirt(67)]
    T['tile_stone'] = [flags(71)]
    T['tile_rubble'] = [rubble(83)]
    T['tile_sand'] = [sand(97)]
    T['tile_ash'] = [ash(101)]
    T['tile_water'] = [water(113, f) for f in range(4)]
    T['tile_lava'] = [lava(127, f) for f in range(4)]
    return T

if __name__ == '__main__':
    for k, v in build().items(): print(k, len(v), len(v[0]), len(v[0][0]))
