import sys, math, random, os
D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, D)
from pxlib import *
from blaze import draw_blaze

OUT = []
def add(name, w, h, frames_opts, drawer, outline=True):
    frames = []
    for o in frames_opts:
        cv = Cv(w, h)
        drawer(cv, dict(o))
        frames.append(cv.rows())
    for fi, f in enumerate(frames):
        assert len(f) == h, (name, fi, len(f))
        assert all(len(r) == w for r in f), (name, fi)
        e = 0
        for r in reversed(f):
            if r.strip('.') == '': e += 1
            else: break
        if e: print('  !! %s f%d: %d empty bottom rows' % (name, fi, e))
        for side, rng_ in (('L', range(0, 1)), ('R', range(w - 1, w))):
            if any(f[y][x] != '.' for y in range(h) for x in rng_):
                pass
    OUT.append(emit(name, frames, outline))
    return frames

# ============================================================ BLAZE
S, OX, OY = 1.0, -1.2, -0.6
BS, BOX, BOY = 1.66, 2.9, 8.1

def blz(cv, o):
    if o.pop('_boss', False): draw_blaze(cv, BS, BOX, BOY, o)
    else: draw_blaze(cv, S, OX, OY, o)

IDLE_NEAR = (47.5, 41.5, 40.0, 51.0, 46.0, 0.0)
IDLE_FAR  = (40.0, 40.5, 31.5, 49.5, 35.0, 0.0)

add('blaze_idle', 76, 60, [
    dict(seed=11, phase=0.0, bob=0.0, nearleg=IDLE_NEAR, farleg=IDLE_FAR, arm=0.0),
    dict(seed=27, phase=2.6, bob=-0.8, nearleg=IDLE_NEAR, farleg=IDLE_FAR, tail_dy=-1.0,
         tail_curl=-0.5, arm=0.35, chain=0.25, head_dy=-0.5, head_rot=-0.04, fire=1.12),
], blz)

NEARC = [(51.0, 39.8, 45.0, 49.4, 51.5, 0.0),
         (48.0, 41.8, 40.5, 51.2, 45.5, 0.0),
         (43.5, 42.4, 34.0, 50.8, 38.5, 0.0),
         (51.5, 38.6, 46.5, 46.6, 52.0, 4.6)]
FARC  = [(36.5, 42.2, 27.5, 50.4, 30.5, 0.0),
         (44.0, 38.8, 38.5, 46.8, 43.0, 4.0),
         (43.5, 40.0, 36.5, 49.4, 41.5, 0.0),
         (39.5, 42.0, 31.0, 51.0, 35.5, 0.0)]
BOBW = [-0.5, 1.0, -0.5, 1.0]
CURL = [1.4, 0.3, -1.4, -0.3]
ARMW = [0.8, 0.1, -0.8, -0.1]
add('blaze_walk', 76, 60, [
    dict(seed=40 + i * 7, phase=i * 1.9, bob=BOBW[i], nearleg=NEARC[i], farleg=FARC[i],
         tail_curl=CURL[i], tail_dy=CURL[i] * 0.6, arm=ARMW[i], chain=CURL[i] * 0.4,
         head_dy=BOBW[i] * 0.6, head_rot=CURL[i] * 0.035, fire=1.0 + 0.09 * i)
    for i in range(4)
], blz)

ROARN = (49.5, 41.0, 42.0, 50.4, 48.0, 0.0)
ROARF = (38.5, 41.4, 29.5, 50.0, 33.0, 0.0)
add('blaze_roar', 76, 60, [
    dict(seed=71, phase=0.4, bob=-0.4, dx=-9.5, nearleg=ROARN, farleg=ROARF,
         jaw=1.0, head_rot=-0.45, head_dy=-1.2, arm=-0.9, chain=-0.5,
         tail_curl=-1.4, tail_dy=-1.4, tail_dx=8.5, fire=1.9, gout=1.0),
    dict(seed=93, phase=3.1, bob=-1.0, dx=-9.5, nearleg=ROARN, farleg=ROARF,
         jaw=1.14, head_rot=-0.53, head_dy=-1.8, arm=-1.1, chain=-0.1,
         tail_curl=-1.9, tail_dy=-2.1, tail_dx=9.2, fire=2.1, gout=1.4),
], blz)

add('blaze_boss', 132, 108, [
    dict(_boss=True, seed=131, phase=0.0, bob=0.0, nearleg=IDLE_NEAR, farleg=IDLE_FAR,
         boss=True, jaw=0.35, head_rot=-0.05, arm=-0.2, fire=1.0),
    dict(_boss=True, seed=157, phase=2.9, bob=-0.9, nearleg=(48.2, 41.2, 40.6, 50.8, 46.6, 0.0),
         farleg=(40.6, 40.2, 32.0, 49.2, 35.6, 0.0), boss=True, jaw=0.55, head_rot=-0.11,
         head_dy=-0.9, arm=0.4, chain=1.1, tail_curl=-0.7, tail_dy=-1.1, fire=1.14),
], blz)

# ============================================================ (more below)
try:
    from trex import add_trex
    add_trex(add)
except ImportError: pass
try:
    from mammoth import add_mammoth, add_mammoth2
    add_mammoth(add)
    add_mammoth2(add)
except ImportError: pass

with open('/home/user/studious-invention/js2/art_beasts.js', 'w') as f:
    f.write("'use strict';\n")
    f.write("// art_beasts.js - the big story creatures: BLAZE the flaming raptor (the villain),\n")
    f.write("// the T-Rex, and the woolly mammoths (wild, trader-shop and the shower gag).\n")
    f.write("// Light from the upper left; every hide uses a whole ramp, never a flat fill.\n\n")
    f.write('\n'.join(OUT))
print('wrote', len(OUT), 'sprites')
