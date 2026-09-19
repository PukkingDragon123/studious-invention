"""Writes js2/art_house.js - the furniture and fittings of the Rockbottom house.

Everything in the house is built from the same four materials, and each one has
its own texture pass, so no two surfaces read the same: cut stone speckles,
logs carry grain rings, hide is woven in a visible weft, and fur is drawn as
overlapping clumps with a ragged edge. Light comes from the upper left in every
sprite, which is where the smoke hole is.

    python3 tools/house.py
"""
import math, os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ras import Grid

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# --- material ramps (dark -> light), keyed to the game palette -----------------
STONE = ['1', '2', '3', '4', '5', '6']          # #241c2e .. #d6cfe0
ROCK  = ['o', 'p', 'q', 'r', 's']               # cool grey stone
WOOD  = ['f', 'j', 'k', 'l', 'm', 'n']          # dark brown .. tan
HIDE  = ['j', 'k', 'l', 'm', 'n']
FUR   = ['j', 'k', 'l', 'm', 'n']
BONE  = ['!', '@', '#', '$']
CLAY  = ['y', 'z', 'A', 'l', 'n']               # fired terracotta, kept earthy
GREEN = ['t', 'u', 'v', 'w', 'x']
INK   = '0'

def slab(g, x0, y0, x1, y1, ramp, chip=3, r=2):
    """a block of cut stone: lit top, dark underside, chipped corners, speckle"""
    for y in range(int(y0), int(y1) + 1):
        for x in range(int(x0), int(x1) + 1):
            # rounded corners
            cx = min(x - x0, x1 - x) ; cy = min(y - y0, y1 - y)
            if cx < r and cy < r and (r - cx) ** 2 + (r - cy) ** 2 > r * r + 0.5: continue
            g.px(x, y, ramp[2])
    g.rect(x0 + 1, y0, x1 - 1, y0 + 1, ramp[4])                 # lit top
    g.rect(x0 + 1, y1 - 1, x1 - 1, y1, ramp[0])                 # shadow under
    g.rect(x0, y0 + 2, x0, y1 - 2, ramp[3])                     # lit near edge
    g.rect(x1, y0 + 2, x1, y1 - 2, ramp[1])
    w, h = int(x1 - x0), int(y1 - y0)
    for i in range(max(2, (w * h) // 26)):                      # speckle
        px = x0 + 2 + (i * 7 + (i * i) % 5) % max(1, w - 3)
        py = y0 + 2 + (i * 5 + (i * 3) % 4) % max(1, h - 3)
        g.px(px, py, ramp[1] if i % 3 else ramp[4])
    for i in range(chip):                                        # chips off the edge
        g.px(x0 + 3 + (i * 11) % max(1, w - 5), y0 + 1, ramp[1])
        g.px(x1 - 3 - (i * 9) % max(1, w - 5), y1 - 2, ramp[3])

def logbeam(g, x0, y0, x1, y1, ramp, rings=True, horiz=True):
    """a log: barrel shading across the short axis, grain along the long one"""
    if horiz:
        h = y1 - y0
        for y in range(int(y0), int(y1) + 1):
            t = (y - y0) / max(1, h)
            c = ramp[min(len(ramp) - 1, int(1 + (1 - abs(t - 0.32) * 2.4) * (len(ramp) - 2)))]
            g.rect(x0, y, x1, y, c)
        for i in range(int(x1 - x0) // 7):                       # grain
            gx = x0 + 3 + i * 7
            g.rect(gx, y0 + 2, gx, y1 - 2, ramp[1])
            g.px(gx + 1, y0 + 3 + (i % 3), ramp[4])
        if rings:
            for e, xx in ((0, x0), (1, x1)):
                g.rect(xx, y0, xx, y1, ramp[1])
                g.px(xx, (y0 + y1) // 2, ramp[3])
    else:
        w = x1 - x0
        for x in range(int(x0), int(x1) + 1):
            t = (x - x0) / max(1, w)
            c = ramp[min(len(ramp) - 1, int(1 + (1 - abs(t - 0.32) * 2.4) * (len(ramp) - 2)))]
            g.rect(x, y0, x, y1, c)
        for i in range(int(y1 - y0) // 7):
            gy = y0 + 3 + i * 7
            g.rect(x0 + 1, gy, x1 - 1, gy, ramp[1])

def weave(g, x0, y0, x1, y1, ramp, step=3):
    """woven hide or basketwork: a visible over-under weft"""
    for y in range(int(y0), int(y1) + 1):
        for x in range(int(x0), int(x1) + 1):
            over = ((x // step) + (y // step)) % 2 == 0
            g.px(x, y, ramp[3] if over else ramp[1])
    for y in range(int(y0), int(y1) + 1, step):
        g.rect(x0, y, x1, y, ramp[0])
    for x in range(int(x0), int(x1) + 1, step):
        g.rect(x, y0, x, y1, ramp[0])
    g.rect(x0, y0, x1, y0, ramp[4])

def furpile(g, cx, cy, rx, ry, ramp, clumps=9, seed=0):
    """a heap of fur: overlapping lobes with a shaggy fringe"""
    g.ellipse(cx, cy, rx, ry, ramp[2])
    for i in range(clumps):
        t = (i + 0.5) / clumps
        ox = cx + (t - 0.5) * rx * 1.9
        oy = cy - ry * 0.35 + math.sin(t * math.pi) * -ry * 0.35
        g.ellipse(ox, oy, rx * 0.34, ry * 0.5, ramp[3] if i % 2 else ramp[2])
        g.ellipse(ox - rx * 0.06, oy - ry * 0.16, rx * 0.2, ry * 0.26, ramp[4])
    for i in range(int(rx * 2)):                                   # shaggy hem
        x = cx - rx + i
        d = 1 + ((i * 7 + seed) % 3)
        for k in range(d): g.px(x, cy + ry - 1 + k, ramp[1] if k else ramp[2])

def claypot(g, cx, by, w, h, ramp, band=True):
    rx = w / 2
    for y in range(int(by - h), int(by) + 1):
        t = (by - y) / h
        wid = rx * (0.55 + math.sin(min(1, t) * math.pi * 0.92) * 0.62)
        for x in range(int(cx - wid), int(cx + wid) + 1):
            s = (x - (cx - wid)) / max(1, wid * 2)
            g.px(x, y, ramp[3] if s < 0.42 else (ramp[2] if s < 0.8 else ramp[1]))
    g.ellipse(cx - rx * 0.3, by - h * 0.74, rx * 0.26, h * 0.16, ramp[4])   # highlight
    rim = int(by - h)
    g.rect(cx - rx * 0.62, rim, cx + rx * 0.62, rim + 1, ramp[1])
    g.rect(cx - rx * 0.58, rim, cx + rx * 0.1, rim, ramp[4])
    if band:
        for x in range(int(cx - rx), int(cx + rx) + 1):
            for k in (0, 1):
                if g.get(x, int(by - h * 0.52) + k) != '.':
                    g.px(x, int(by - h * 0.52) + k, '6' if (x // 3) % 2 else '1')

def outline_dark(g):
    """kept for sprites that need their own contact shadow, not the engine edge"""
    pass

# --- the pieces ---------------------------------------------------------------
SPRITES = {}
def S(name, w, h, fn, note):
    g = Grid(w, h)
    fn(g)
    SPRITES[name] = dict(w=w, h=h, rows=[''.join(r) for r in g.g], note=note)

# bed: a stone ledge with a carved bone headboard and a heap of furs
def bed(g):
    W, H = g.w, g.h
    slab(g, 4, H - 22, W - 5, H - 4, ROCK)                       # the ledge
    for i in range(5):                                            # carved legs
        pass
    logbeam(g, 6, H - 6, W - 7, H - 2, WOOD)                     # base beam
    # headboard: three bone uprights and a crossbar
    for i, x in enumerate((8, 17, 26)):
        g.rect(x, 8 + (i % 2) * 2, x + 3, H - 24, BONE[1])
        g.rect(x, 8 + (i % 2) * 2, x, H - 24, BONE[3])
        g.rect(x + 3, 9 + (i % 2) * 2, x + 3, H - 24, BONE[0])
        g.disc(x + 1.5, 8 + (i % 2) * 2, 2.6, BONE[2])
        g.disc(x + 0.7, 7.4 + (i % 2) * 2, 1.4, BONE[3])
    g.rect(6, 12, 31, 15, BONE[1]); g.rect(6, 12, 31, 12, BONE[3]); g.rect(6, 15, 31, 15, BONE[0])
    # the bedding: separate furs thrown on top of each other, not one loaf
    LUMPS = ((0.36, 8, 6.5), (0.47, 10, 8), (0.58, 9, 7), (0.69, 11, 8.5), (0.80, 8, 6))
    for i, (t, rx, ry) in enumerate(LUMPS):                       # the shadowed under-layer
        g.ellipse(W * t, H - 24, rx + 2, ry * 0.7, FUR[1])
    for i, (t, rx, ry) in enumerate(LUMPS):
        ox, oy = W * t, H - 27 - (i % 2) * 2
        g.ellipse(ox, oy, rx, ry, FUR[2])
        g.ellipse(ox - rx * 0.2, oy - ry * 0.22, rx * 0.72, ry * 0.62, FUR[3])
        g.ellipse(ox - rx * 0.36, oy - ry * 0.42, rx * 0.34, ry * 0.26, FUR[4])
        for k in range(int(rx)):                                  # tufts round the lobe
            a = math.pi + k * (math.pi / max(1, rx - 1))
            g.px(ox + math.cos(a) * rx, oy + math.sin(a) * ry - 1, FUR[4] if k % 2 else FUR[3])
        for k in range(int(rx * 1.4)):                            # shaggy hem
            g.px(ox - rx + k * 1.4, oy + ry - 1 + (k % 2), FUR[1])
    furpile(g, W * 0.26, H - 29, W * 0.10, 5.5, FUR, 5, 7)       # the pillow
    g.ellipse(W * 0.26, H - 31, W * 0.06, 2.2, 'n')
    for i in range(5):                                            # folded blanket at the foot
        g.rect(W - 28, H - 32 + i * 2, W - 7, H - 31 + i * 2, HIDE[3] if i % 2 else HIDE[1])
    g.rect(W - 28, H - 32, W - 7, H - 32, HIDE[4])
    for i in range(11): g.px(W - 27 + i * 2, H - 22, HIDE[0])     # its hanging hem

# table: a thick slab on two carved log trestles
def table(g):
    W, H = g.w, g.h
    for x in (12, W - 20):
        logbeam(g, x, 16, x + 8, H - 3, WOOD, horiz=False)
        g.rect(x - 3, H - 5, x + 11, H - 3, WOOD[1])
    logbeam(g, 18, H - 16, W - 19, H - 12, WOOD)                 # stretcher
    slab(g, 2, 8, W - 3, 17, ROCK)                               # the top
    for i in range(3):                                            # a bowl and two shells laid out
        pass
    g.rect(2, 8, W - 3, 9, ROCK[4])

def stool(g):
    W, H = g.w, g.h
    for x in (5, W - 10):
        logbeam(g, x, 12, x + 5, H - 2, WOOD, horiz=False)
    slab(g, 1, 5, W - 2, 12, ROCK)
    furpile(g, W / 2, 6, W * 0.36, 3, FUR, 5, 2)

def shelf(g):
    W, H = g.w, g.h
    for y in (10, H - 14):                                        # two planks
        logbeam(g, 2, y, W - 3, y + 5, WOOD)
    for x in (7, W // 2, W - 12):                                 # bracket pegs
        g.rect(x, 14, x + 3, H - 14, WOOD[1])
        g.rect(x, 14, x, H - 14, WOOD[3])
    claypot(g, 16, 10, 14, 13, CLAY)
    claypot(g, W - 20, 10, 11, 10, CLAY, band=False)
    g.rect(W // 2 - 8, 2, W // 2 + 8, 9, BONE[1])                 # a stack of stone tablets
    g.rect(W // 2 - 8, 2, W // 2 + 8, 2, BONE[3])
    g.rect(W // 2 - 8, 9, W // 2 + 8, 9, BONE[0])
    for i in range(4): g.rect(W // 2 - 6 + i * 4, 3, W // 2 - 6 + i * 4, 8, BONE[0])
    # the lower shelf earns its keep: a skull, a coil of cord and two shells
    g.ellipse(18, H - 19, 7, 6, BONE[2]); g.ellipse(18, H - 17, 5.4, 4, BONE[3])
    g.disc(15.6, H - 19, 1.5, '0'); g.disc(20.4, H - 19, 1.5, '0')
    g.rect(15, H - 15, 21, H - 14, BONE[1])
    for i in range(4): g.px(16 + i * 2, H - 15, BONE[0])
    for i in range(4):                                            # a coil of cord
        g.arc(W // 2, H - 17, 7 - i * 1.4, 4 - i * 0.8, 0, 360, HIDE[2] if i % 2 else HIDE[3], 1)
    for i, x in enumerate((W - 26, W - 16)):                      # shells
        g.ellipse(x, H - 17, 5, 4, BONE[3])
        for k in range(5): g.line(x, H - 20, x - 4 + k * 2, H - 14, BONE[1])

def basket(g):
    W, H = g.w, g.h
    weave(g, 3, 10, W - 4, H - 3, HIDE)
    g.rect(1, 6, W - 2, 10, HIDE[4])                              # rim
    g.rect(1, 6, W - 2, 6, HIDE[3])
    g.rect(1, 10, W - 2, 10, HIDE[0])
    for i in range(4): g.rect(4 + i * ((W - 8) // 3), 11, 4 + i * ((W - 8) // 3), H - 4, HIDE[0])
    g.ellipse(W / 2, 6, W * 0.42, 4, HIDE[2])                     # the lid
    g.ellipse(W / 2, 5, W * 0.30, 2.4, HIDE[4])
    g.disc(W / 2, 3, 2.4, BONE[2])

def lamp(g):
    W, H = g.w, g.h
    g.rect(W // 2 - 1, 0, W // 2, 9, WOOD[1])                     # the cord
    g.rect(W // 2 - 1, 0, W // 2 - 1, 9, WOOD[3])
    for i in range(3):                                            # three bone chains to the rim
        g.line(W / 2, 9, 3 + i * ((W - 6) // 2), 18, BONE[1])
        g.disc(3 + i * ((W - 6) // 2), 18, 1.6, BONE[3])
    g.ellipse(W / 2, H - 8, W * 0.44, 7, ROCK[1])                 # the stone bowl
    g.ellipse(W / 2, H - 9, W * 0.40, 5.6, ROCK[3])
    g.ellipse(W / 2 - 2, H - 11, W * 0.20, 2.2, ROCK[4])
    g.rect(2, H - 15, W - 3, H - 13, ROCK[2])                     # the rim
    g.rect(2, H - 15, W - 3, H - 15, ROCK[4])
    g.ellipse(W / 2, H - 20, 5, 8, CLAY[4])                       # the flame, above the oil
    g.ellipse(W / 2, H - 19, 3.2, 5.6, CLAY[3])
    g.ellipse(W / 2, H - 18, 1.7, 3.2, '9')
    g.px(W // 2, H - 26, CLAY[4])

def potrack(g):
    W, H = g.w, g.h
    g.rect(0, 4, W - 1, 7, BONE[1])                               # the bone rail
    g.rect(0, 4, W - 1, 4, BONE[3])
    g.rect(0, 7, W - 1, 7, BONE[0])
    g.disc(2, 5.5, 3, BONE[2]); g.disc(W - 3, 5.5, 3, BONE[2])
    for i, (x, w2, h2) in enumerate(((16, 16, 15), (40, 20, 19), (66, 13, 12))):
        g.rect(x - 1, 8, x, 12, WOOD[1])
        claypot(g, x, 12 + h2, w2, h2, CLAY, band=(i != 2))

def hiderack(g):
    W, H = g.w, g.h
    for x in (2, W - 5):                                          # the frame
        logbeam(g, x, 2, x + 3, H - 2, WOOD, horiz=False)
    logbeam(g, 2, 2, W - 3, 5, WOOD)
    logbeam(g, 2, H - 5, W - 3, H - 2, WOOD)
    weave(g, 8, 9, W - 9, H - 9, HIDE, 4)                         # the stretched hide
    for i in range(6):                                            # lacing
        y = 10 + i * ((H - 22) // 5)
        g.line(6, y, 9, y + 1, BONE[2]); g.line(W - 7, y, W - 10, y + 1, BONE[2])

def drum(g):
    W, H = g.w, g.h
    for x in (5, W - 8):
        logbeam(g, x, H - 12, x + 3, H - 2, WOOD, horiz=False)
    g.ellipse(W / 2, H - 20, W * 0.42, 14, WOOD[1])               # the body
    g.ellipse(W / 2, H - 21, W * 0.38, 12, WOOD[3])
    g.ellipse(W / 2, H - 26, W * 0.42, 6, HIDE[4])                # the skin
    g.ellipse(W / 2, H - 26, W * 0.36, 4.4, HIDE[3])
    g.ellipse(W / 2 - 3, H - 27, W * 0.16, 2, '$')
    for i in range(8):                                            # lacing round the shell
        a = math.pi * (0.1 + i / 9)
        g.line(W / 2 - math.cos(a) * W * 0.40, H - 24,
               W / 2 - math.cos(a) * W * 0.34, H - 13, BONE[1])

def wallart(g):
    W, H = g.w, g.h
    for x in (0, W - 3):                                          # bone frame
        g.rect(x, 0, x + 2, H - 1, BONE[1]); g.rect(x, 0, x, H - 1, BONE[3])
    g.rect(0, 0, W - 1, 2, BONE[1]); g.rect(0, 0, W - 1, 0, BONE[3])
    g.rect(0, H - 3, W - 1, H - 1, BONE[1]); g.rect(0, H - 1, W - 1, H - 1, BONE[0])
    for y in range(3, H - 3):                                     # the plastered panel
        for x in range(3, W - 3):
            g.px(x, y, '@' if ((x * 3 + y * 5) % 11) else '#')
    # a hunt, painted in ochre: three figures and a very large animal
    for i, (px, s) in enumerate(((9, 1.0), (17, 0.85), (24, 0.8))):
        g.disc(px, 16, 2.4 * s, 'z')
        g.rect(px - 1, 18, px, 18 + 8 * s, 'z')
        g.line(px - 4 * s, 20, px + 4 * s, 20, 'z')
        g.line(px - 3 * s, 26 + 8 * (s - 1), px, 18 + 8 * s, 'z')
        g.line(px + 3 * s, 26 + 8 * (s - 1), px, 18 + 8 * s, 'z')
        g.line(px + 4 * s, 14, px + 9 * s, 22, 'y')               # spears
    g.ellipse(W - 22, 22, 13, 7, 'y')
    g.ellipse(W - 30, 19, 5, 4, 'y')
    for x in (W - 30, W - 24, W - 17, W - 13):
        g.rect(x, 26, x + 1, 33, 'y')
    g.line(W - 34, 17, W - 38, 21, 'y')

def fossil(g):
    """an ammonite: a fat spiral of chambers, not a galaxy of dots"""
    W, H = g.w, g.h
    slab(g, 0, 0, W - 1, H - 1, STONE, chip=6, r=6)
    cx, cy = W / 2 + 2, H / 2
    RMAX = W * 0.40
    # the whorl, drawn outward so each turn overlaps the one inside it
    steps = 620
    for i in range(steps):
        a = i * 0.045
        r = 2.2 * math.exp(a * 0.104)
        if r > RMAX: break
        th = 1.4 + r * 0.30                                       # the tube gets fatter
        shade = BONE[1] if math.sin(a * 6.0) > 0.1 else BONE[2]
        g.disc(cx + math.cos(a) * r, cy + math.sin(a) * r, th, shade)
    # chamber walls across the tube
    a = 0.0
    while True:
        r = 2.2 * math.exp(a * 0.104)
        if r > RMAX: break
        th = 1.4 + r * 0.30
        nx, ny = math.cos(a), math.sin(a)
        g.line(cx + nx * (r - th), cy + ny * (r - th),
               cx + nx * (r + th), cy + ny * (r + th), BONE[0])
        a += 0.42
    # a lit edge down the upper-left of the shell
    a = 0.0
    while True:
        r = 2.2 * math.exp(a * 0.104)
        if r > RMAX: break
        th = 1.4 + r * 0.30
        if math.cos(a + 0.9) < 0:
            g.disc(cx + math.cos(a) * (r - th * 0.55), cy + math.sin(a) * (r - th * 0.55), 1.1, BONE[3])
        a += 0.05
    for i in range(22):                                           # cracks in the stone
        a2 = i * 1.7
        g.line(cx + math.cos(a2) * W * 0.44, cy + math.sin(a2) * H * 0.44,
               cx + math.cos(a2) * W * 0.5, cy + math.sin(a2) * H * 0.5, STONE[0])

def hearth(g):
    """a fire pit seen slightly from above: an oval of rounded stones, ash in
    the middle, and a bone spit on two forked uprights"""
    W, H = g.w, g.h
    cx, cy = W / 2, H - 13
    RX, RY = W * 0.44, 10.0
    # the pit itself: sunk earth, ash, and the last of the embers
    g.ellipse(cx, cy, RX - 2, RY - 1, '1')
    g.ellipse(cx, cy + 1, RX - 5, RY - 3, 'f')
    for i in range(70):                                           # ash, embers and live coals
        a, r = i * 2.4, (i % 7) / 7
        g.px(cx + math.cos(a) * (RX - 7) * r, cy + 1 + math.sin(a) * (RY - 4) * r,
             ['1', '2', 'y', 'z', 'A', 'y'][i % 6])
    for i in range(9):
        a = i * 0.72
        g.disc(cx + math.cos(a) * (RX - 12) * 0.7, cy + 1 + math.sin(a) * (RY - 6) * 0.7, 1.7, 'A')
        g.px(cx + math.cos(a) * (RX - 12) * 0.7, cy + math.sin(a) * (RY - 6) * 0.7, 'C')
    for i in range(7):                                            # charred logs
        a = 0.5 + i * 0.8
        g.line(cx + math.cos(a) * 3, cy + 1 + math.sin(a) * 2,
               cx + math.cos(a) * (RX - 9), cy + 1 + math.sin(a) * (RY - 5), '1', 3)
        g.line(cx + math.cos(a) * 3, cy + math.sin(a) * 2,
               cx + math.cos(a) * (RX - 10), cy + math.sin(a) * (RY - 6), 'f', 1)
    # the ring of blackened stones, back row first so the front overlaps it
    for back in (True, False):
        n = 13
        for i in range(n):
            a = math.pi + i * (math.pi / (n - 1))                  # pi..2pi = the back
            if not back: a += math.pi
            sx = cx + math.cos(a) * RX
            sy = cy + math.sin(a) * RY
            rr = 6.2 + ((i * 5) % 3)
            g.ellipse(sx, sy, rr, rr * 0.78, '1')                 # every stone is fire-blackened
            g.ellipse(sx, sy - 1, rr - 1.4, rr * 0.62, ROCK[0])
            g.ellipse(sx - rr * 0.24, sy - rr * 0.36, rr * 0.48, rr * 0.26, ROCK[2])
            g.px(sx - rr * 0.4, sy - rr * 0.5, ROCK[4])
            for k in range(4):                                    # soot streaks up the inner face
                g.px(sx - 3 + k * 2, sy + (k % 2), '0')
            if not back:                                          # firelight on the near stones
                for k in range(3): g.px(sx - 2 + k * 2, sy - rr * 0.1, 'y')
    # the spit: two forked uprights and a bone bar
    for x in (5, W - 9):
        g.rect(x, 8, x + 3, H - 14, WOOD[1]); g.rect(x, 8, x, H - 14, WOOD[3])
        g.line(x + 1, 9, x - 3, 2, WOOD[2]); g.line(x + 1, 9, x + 5, 2, WOOD[2])
        g.line(x + 1, 9, x - 3, 2, WOOD[4])
    g.rect(3, 4, W - 4, 7, BONE[1]); g.rect(3, 4, W - 4, 4, BONE[3]); g.rect(3, 7, W - 4, 7, BONE[0])
    g.disc(3, 5.5, 3.0, BONE[2]); g.disc(W - 4, 5.5, 3.0, BONE[2])
    g.disc(2.4, 4.8, 1.4, BONE[3]); g.disc(W - 4.6, 4.8, 1.4, BONE[3])

def waterjar(g):
    W, H = g.w, g.h
    claypot(g, W / 2, H - 2, W - 4, H - 8, CLAY)
    g.ellipse(W / 2, 6, W * 0.30, 3.4, CLAY[1])                   # the neck
    g.ellipse(W / 2, 5, W * 0.24, 2.2, '1')
    for side in (-1, 1):                                          # handles
        g.arc(W / 2 + side * W * 0.30, 13, 5, 6, 270 if side < 0 else 90,
              450 if side < 0 else 270, CLAY[1], 2)

def broom(g):
    W, H = g.w, g.h
    g.rect(W // 2 - 1, 0, W // 2, H - 20, WOOD[2])                # the handle
    g.rect(W // 2 - 1, 0, W // 2 - 1, H - 20, WOOD[4])
    g.rect(W // 2 - 1, H - 21, W // 2, H - 20, WOOD[1])
    for i in range(W - 2):                                        # a splayed bundle of reeds
        x = 1 + i
        t = (i - (W - 2) / 2) / ((W - 2) / 2)
        top = H - 20 + abs(t) * 3
        bot = H - 2 - abs(t) * 4
        c = [GREEN[1], GREEN[2], GREEN[3], WOOD[3]][i % 4]
        g.rect(x, top, x, bot, c)
        g.px(x, bot, GREEN[0])
    for k in (H - 19, H - 15):                                    # two hide bindings
        g.rect(2, k, W - 3, k + 2, HIDE[1])
        g.rect(2, k, W - 3, k, HIDE[3])

def curtain(g):
    W, H = g.w, g.h
    g.rect(0, 0, W - 1, 3, WOOD[1]); g.rect(0, 0, W - 1, 0, WOOD[3])
    for i in range(W):                                            # hanging hide strips
        sway = math.sin(i * 0.6) * 1.4
        c = HIDE[3] if (i // 5) % 2 else HIDE[2]
        for y in range(4, H - 2 + int(sway)):
            g.px(i, y, c if (y // 4) % 2 else HIDE[1])
        g.px(i, H - 2 + int(sway), HIDE[0])
    for i in range(0, W, 5): g.rect(i, 4, i, H - 4, HIDE[0])
    for i in range(0, W, 10): g.disc(i + 2, 6, 1.6, BONE[2])      # bone rings

SHEET = [
    ('house_bed',      120, 62, bed,      'carved stone bed ledge with a bone headboard and a heap of furs'),
    ('house_table',    132, 54, table,    'thick stone slab table on carved log trestles'),
    ('house_stool',     34,  30, stool,   'log-legged stone stool with a fur pad'),
    ('house_shelf',    110,  48, shelf,   'two plank shelves on bracket pegs, with pots and stone tablets'),
    ('house_basket',    56,  46, basket,  'woven storage basket with a hide lid'),
    ('house_lamp',      26,  32, lamp,    'hanging stone oil lamp with a live flame'),
    ('house_potrack',   86,  36, potrack, 'three clay pots hung off a bone rail'),
    ('house_hiderack',  76,  84, hiderack,'drying frame with a hide laced into it'),
    ('house_drum',      52,  48, drum,    'hide drum on log legs'),
    ('house_wallart',   96,  44, wallart, 'framed cave painting: three hunters and one very large animal'),
    ('house_fossil',    92,  92, fossil,  'ammonite fossil cut into a stone plaque'),
    ('house_hearth',   132,  46, hearth,  'ring of blackened hearth stones with a bone spit over it'),
    ('house_waterjar',  34,  44, waterjar,'tall clay water jar with looped handles'),
    ('house_broom',     18,  46, broom,   'bundle-of-reeds broom'),
    ('house_curtain',   70,  86, curtain, 'hide door curtain hung on a rail'),
]

for name, w, h, fn, note in SHEET:
    S(name, w, h, fn, note)

out = ["""'use strict';
// art_house.js - the furniture and fittings of the Rockbottom house, generated
// by tools/house.py. Four materials, each with its own texture pass: cut stone
// speckles, logs carry grain, hide is woven, fur is clumped with a ragged hem.
// Light from the upper left in every one, which is where the smoke hole is.

"""]
for name, w, h, fn, note in SHEET:
    d = SPRITES[name]
    out.append('SPRITES.%s = { outline: true, frames: [[\n%s\n]]};\n\n' %
               (name, '\n'.join("'%s'," % r for r in d['rows'])))
open(os.path.join(ROOT, 'js2/art_house.js'), 'w').write(''.join(out))

# keep the manifest honest
man = json.load(open(os.path.join(ROOT, 'js2/manifest.json')))
for name, w, h, fn, note in SHEET:
    man[name] = dict(w=w, h=h, frames=1, note=note, file='art_house')
json.dump(man, open(os.path.join(ROOT, 'js2/manifest.json'), 'w'), indent=1)
print('wrote %d house sprites' % len(SHEET))
