// ---------------------------------------------------------------------------
// instruments.js - seven instruments, seven ways to play.
//
// The Riff keeps the song, the timing and the score; the instrument decides
// what you see, what you do and what you hear. Every one is painted a pixel
// at a time (shaded, dithered, outlined) and cached:
//
//   RIB-AXE     (Bronk)  runes slide down four strings. POWER CHORDS: two
//                        strings struck at once. Held notes bend the string.
//   TUSK HORN   (Vela)   puffs of breath roll into a mammoth tusk. Every note
//                        is a BLOW you hold, and your lungs run out.
//   SKULL BONGOS (Pebble) pebbles hop down onto four skull drums, landing on
//                        the beat. Long notes become ROLLS.
//   BONE FLUTE  (Roxy)   leaves ride the wind into the holes of a crane-bone
//                        flute. Long notes become TRILLS between two holes.
//   MAMMOTH MARIMBA      mallet stones hop along four rib-bone keys, and runs
//                        sweep up the bones in a GLISS.
//   STALACTITE CHIMES    water drips from the cave roof and FALLS, faster and
//                        faster, onto four singing crystals.
//   BOOM-LOG             two ends of one hollow trunk. Boulders roll in, and
//                        on the downbeat both ends BOOM together.
// ---------------------------------------------------------------------------
'use strict';

const Pix = (() => {
  const cache = new Map(), rgb = new Map();
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const toInt = h => {
    let v = rgb.get(h); if (v !== undefined) return v;
    const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
    v = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0; rgb.set(h, v); return v;
  };
  const mix = (a, b, k) => {
    const A = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), B = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
  };
  // five tones from one colour: shadow to highlight
  const ramp = h => [mix(h, '#120c16', 0.62), mix(h, '#120c16', 0.34), h, mix(h, '#fffaea', 0.35), mix(h, '#fffaea', 0.7)];
  const dith = (x, y) => (BAY[((y & 3) << 2) | (x & 3)] + 0.5) / 16 - 0.5;
  const pickR = (R, l, x, y) => R[clamp(Math.floor(l * R.length + dith(x, y) * 0.9), 0, R.length - 1)];
  // make(key, w, h, paint): paint(P) with P.put / P.ball / P.tube / ...; an ink
  // line is traced round whatever was painted
  function make(key, w, h, paint, o = {}) {
    let c = cache.get(key); if (c) return c;
    c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'), img = g.createImageData(w, h), px = new Uint32Array(img.data.buffer);
    const put = (x, y, col) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= w || y >= h || !col) return; px[y * w + x] = toInt(col); };
    const get = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 0 : px[y * w + x];
    const P = {
      w, h, put, get, ramp, mix, dith,
      rect(x, y, rw, rh, col) { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) put(x + i, y + j, col); },
      // a lit sphere, light from the upper left
      ball(cx, cy, r, R, ry) {
        ry = ry || r;
        for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
          const nx = (x + 0.5 - cx) / r, ny = (y + 0.5 - cy) / ry, d = nx * nx + ny * ny; if (d > 1) continue;
          const nz = Math.sqrt(1 - d), l = clamp(-0.45 * nx - 0.55 * ny + 0.7 * nz, 0, 1);
          put(x, y, pickR(R, l, x, y));
        }
      },
      // a lit cylinder from (x0,y0) to (x1,y1), radius r0 to r1
      tube(x0, y0, x1, y1, r0, r1, R) {
        const len = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / len, uy = (y1 - y0) / len;
        const mnx = Math.floor(Math.min(x0, x1) - Math.max(r0, r1)), mxx = Math.ceil(Math.max(x0, x1) + Math.max(r0, r1));
        const mny = Math.floor(Math.min(y0, y1) - Math.max(r0, r1)), mxy = Math.ceil(Math.max(y0, y1) + Math.max(r0, r1));
        for (let y = mny; y <= mxy; y++) for (let x = mnx; x <= mxx; x++) {
          const dx = x + 0.5 - x0, dy = y + 0.5 - y0, t = dx * ux + dy * uy; if (t < 0 || t > len) continue;
          const s = -dx * uy + dy * ux, r = r0 + (r1 - r0) * t / len; if (Math.abs(s) > r) continue;
          const n = s / r, side = (-uy * -0.45 + ux * -0.55) >= 0 ? 1 : -1;
          const l = clamp(0.55 - n * 0.5 * side + Math.sqrt(1 - n * n) * 0.25, 0, 1);
          put(x, y, pickR(R, l, x, y));
        }
      },
      line(x0, y0, x1, y1, col) {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0;
        for (let i = 0; i <= n; i++) put(Math.round(x0 + (x1 - x0) * i / (n || 1)), Math.round(y0 + (y1 - y0) * i / (n || 1)), col);
      },
      hash(x, y, s = 0) { let v = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0; v = Math.imul(v ^ (v >>> 13), 1274126177); v ^= v >>> 16; return (v >>> 0) / 4294967296; },
    };
    paint(P);
    if (o.ink !== false) {
      const ink = toInt(o.ink || '#140a05'), add = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (px[y * w + x]) continue;
        if (get(x - 1, y) || get(x + 1, y) || get(x, y - 1) || get(x, y + 1)) add.push(y * w + x);
      }
      for (const i of add) px[i] = ink;
    }
    g.putImageData(img, 0, 0);
    if (cache.size > 600) { let n = 120; for (const k of cache.keys()) { cache.delete(k); if (--n <= 0) break; } }
    cache.set(key, c);
    return c;
  }
  // draw a painted canvas centred on (x, y) at the world's pixel size
  function draw(c, x, y, o = {}) {
    const ctx = Gfx.ctx, s = (o.scale || 1) * 2, sx = s * (o.sx || 1), sy = s * (o.sy || 1);
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    const a = ctx.globalAlpha; if (o.alpha !== undefined) ctx.globalAlpha = a * o.alpha;
    const ax = o.ax ?? 0.5, ay = o.ay ?? 0.5;
    ctx.drawImage(c, Math.round(x - c.width * sx * ax), Math.round(y - c.height * sy * ay), Math.round(c.width * sx), Math.round(c.height * sy));
    ctx.globalAlpha = a; ctx.imageSmoothingEnabled = sm;
  }
  return { make, draw, ramp, mix };
})();

const Instruments = (() => {
  const COL_X = [300, 420, 540, 660], HIT_Y = 490, COL_TOP = 322;
  const BED_Y = () => NECK_TOP - 26;
  const LOG_Y = { 1: 426, 2: 490 };
  const BONE = ['#5c503c', '#8a7f68', '#c4b89a', '#e8dfc6', '#fffaea'];
  const WOOD = ['#241109', '#3a2415', '#5c3a20', '#85562f', '#b07a45'];
  const STONE = ['#241c2e', '#3b3048', '#574a66', '#7a6d8a', '#a79bb4'];
  const LEAF = ['#6cc95c', '#e0b93a', '#ef6a5e', '#86e8d2'];
  const CRYS = ['#86e8d2', '#b177e6', '#6aa9ee', '#ffe98a'];

  // ---------------------------------------------------------------- charts
  const stepDur = () => AudioSys.stepDur || 0.125;
  const clone = (n, o) => Object.assign({}, n, { judged: false, hit: false, holdT: 0, held: false, brokeHold: false, pop: 0 }, o);
  const chords = (R, notes) => {
    if (R.lesson) return notes;
    const out = [...notes];
    for (const n of notes) {
      const rel = n.step - R.startBar * 16;
      if (rel % 8 !== 0 || n.sustain > 0) continue;
      const lane = n.lane === 3 ? 2 : n.lane + 1;
      out.push(clone(n, { lane, midi: n.midi + 7, chord: true }));
      n.chord = true;
    }
    return out;
  };
  const blows = (R, notes) => {
    const out = []; let last = -9;
    for (const n of notes) { if (n.step - last < 3) continue; out.push(n); last = n.step; }
    for (let i = 0; i < out.length; i++) {
      const nx = out[i + 1], gap = nx ? nx.time - out[i].time : 0.8;
      out[i].sustain = clamp(gap - 0.16, 0.24, R.lesson ? 0.5 : 0.95);
    }
    return out;
  };
  const rolls = (R, notes) => {
    const out = [];
    for (const n of notes) {
      if (n.sustain > 0.05 && !R.lesson) {
        const k = clamp(Math.round(n.sustain / stepDur()), 2, 4);
        for (let i = 0; i < k; i++) out.push(clone(n, { time: n.time + i * stepDur(), step: n.step + i, sustain: 0, roll: i + 1 }));
      } else { n.sustain = 0; out.push(n); }
    }
    return out;
  };
  const trills = (R, notes) => {
    const out = [];
    for (const n of notes) {
      if (n.sustain > 0.05 && !R.lesson) {
        const k = clamp(Math.round(n.sustain / stepDur()), 2, 4), other = n.lane === 0 ? 1 : n.lane - 1;
        for (let i = 0; i < k; i++) out.push(clone(n, { time: n.time + i * stepDur(), step: n.step + i, sustain: 0, lane: i % 2 ? other : n.lane, midi: n.midi + (i % 2 ? 2 : 0), trill: i + 1 }));
      } else out.push(n);
    }
    return out;
  };
  const gliss = (R, notes) => {
    for (const n of notes) n.sustain = 0;
    if (R.lesson || (R.o.density ?? 1) < 1) return notes;
    const out = [...notes]; let id = 0;
    for (let i = 1; i < notes.length; i++) {
      const a = notes[i - 1], b = notes[i];
      if (a.mine !== b.mine || b.step - a.step < 5) continue;
      id++;
      for (let k = 3; k >= 1; k--) out.push(clone(b, { time: b.time - k * stepDur(), step: b.step - k, lane: 3 - k, midi: b.midi - k * 2, gliss: id }));
      b.gliss = id; b.lane = 3;
    }
    return out;
  };
  const dry = (R, notes) => { for (const n of notes) n.sustain = 0; return notes; };
  const booms = (R, notes) => {
    const out = []; let last = -9;
    for (const n of notes) {
      if (n.step - last < 2) continue; last = n.step;
      n.sustain = 0; n.lane = n.lane < 2 ? 1 : 2; out.push(n);
      if (!R.lesson && (n.step - R.startBar * 16) % 16 === 0) { n.boom = true; out.push(clone(n, { lane: n.lane === 1 ? 2 : 1, boom: true })); }
    }
    return out;
  };

  // --------------------------------------------------------------- sprites
  const RUNES = ['\\', '/', 'X', 'O'];
  const runeStone = lane => Pix.make('rune' + lane, 20, 20, P => {
    P.ball(10, 10, 8.6, Pix.ramp(STR_COL[lane]));
    const dk = Pix.mix(STR_COL[lane], '#120c16', 0.75), hi = Pix.mix(STR_COL[lane], '#fffaea', 0.6);
    const g = RUNES[lane];
    const px = (x, y) => { P.put(x, y, dk); P.put(x + 1, y + 1, hi); };
    for (let i = -4; i <= 4; i++) {
      if (g === '\\' || g === 'X') px(10 + i, 10 + i);
      if (g === '/' || g === 'X') px(10 - i, 10 + i);
    }
    if (g === 'O') for (let a = 0; a < 24; a++) px(Math.round(10 + Math.cos(a / 24 * 6.283) * 4), Math.round(10 + Math.sin(a / 24 * 6.283) * 4));
  });
  const puff = (lane, f) => Pix.make('puff' + lane + '_' + f, 26, 20, P => {
    const R = Pix.ramp(Pix.mix('#e8dfc6', STR_COL[lane], 0.35));
    const w = Math.sin(f * 1.57) * 1.2;
    P.ball(9, 11 + w, 6, R); P.ball(15, 8 - w, 6.5, R); P.ball(18, 13, 5, R); P.ball(12, 14, 5, R);
  });
  const pebble = lane => Pix.make('peb' + lane, 16, 14, P => {
    P.ball(8, 7, 6, Pix.ramp(Pix.mix('#a89c80', STR_COL[lane], 0.45)), 5);
    P.put(6, 5, '#fffaea');
  });
  const leaf = (lane, f) => Pix.make('leaf' + lane + '_' + f, 22, 22, P => {
    const a = f / 8 * Math.PI, ca = Math.cos(a), sa = Math.sin(a), R = Pix.ramp(LEAF[lane]);
    for (let y = 0; y < 22; y++) for (let x = 0; x < 22; x++) {
      const dx = x + 0.5 - 11, dy = y + 0.5 - 11, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
      const k = u / 9; if (Math.abs(k) > 1) continue;
      const half = 4.2 * (1 - k * k) * (k < 0 ? 1 : 0.85); if (Math.abs(v) > half) continue;
      let l = 0.55 - v / half * 0.35 + (k < 0 ? 0.1 : -0.05);
      if (Math.abs(v) < 0.55) l = 0.08;                              // the vein
      P.put(x, y, R[clamp(Math.floor(l * 5 + P.dith(x, y)), 0, 4)]);
    }
    for (let i = 0; i < 3; i++) P.put(Math.round(11 - ca * (9 + i)), Math.round(11 - sa * (9 + i)), '#5c3a20');   // the stalk
  });
  const mallet = lane => Pix.make('mal' + lane, 18, 18, P => {
    P.ball(9, 9, 7, Pix.ramp(Pix.mix('#b07a45', STR_COL[lane], 0.5)));
    P.rect(6, 5, 2, 1, '#fffaea');
  });
  const drop = lane => Pix.make('drop' + lane, 14, 20, P => {
    const R = Pix.ramp(CRYS[lane]);
    for (let y = 0; y < 20; y++) for (let x = 0; x < 14; x++) {
      const dx = x + 0.5 - 7, cy = 13, r = 5;
      let inside = false, l = 0;
      if (y >= cy - 1) { const d = (dx * dx + (y + 0.5 - cy) ** 2) / (r * r); inside = d <= 1; l = 0.9 - d * 0.6 - dx * 0.06; }
      else { const k = (cy - (y + 0.5)) / 11; inside = Math.abs(dx) <= r * (1 - k) * 0.95 && y >= 1; l = 0.55 - dx * 0.1; }
      if (!inside) continue;
      P.put(x, y, R[clamp(Math.floor(l * 5 + P.dith(x, y)), 0, 4)]);
    }
    P.put(5, 11, '#ffffff'); P.put(5, 12, '#ffffff');
  });
  const boulder = f => Pix.make('boul' + f, 26, 26, P => {
    P.ball(13, 13, 11, Pix.ramp('#8a7f68'));
    const a = f / 8 * Math.PI * 2;
    for (let i = -7; i <= 7; i++) {                                   // a crack that turns as it rolls
      const x = 13 + Math.cos(a) * i + Math.sin(i * 0.9) * 1.2, y = 13 + Math.sin(a) * i;
      P.put(x, y, '#3a2415');
    }
    for (let i = 0; i < 6; i++) { const b = a + i * 1.05, r = 6 + (i % 2) * 2; P.put(13 + Math.cos(b) * r, 13 + Math.sin(b) * r, '#5c503c'); }
  });

  // ------------------------------------------------------------ the beds
  // The body of each instrument, painted once at half size and cached.
  const bedRib = () => Pix.make('bed_rib', 480, 94, P => {
    for (let y = 13; y < 90; y++) for (let x = 0; x < 480; x++) {
      const grain = Math.sin(y * 1.1 + Math.sin(x * 0.05) * 2.4);
      let l = 0.42 + (grain > 0.85 ? -0.2 : grain < -0.9 ? 0.12 : 0) - (y > 84 ? 0.25 : 0) + (y < 16 ? 0.3 : 0);
      if (P.hash(x >> 3, y >> 2, 11) > 0.985) l -= 0.25;
      P.put(x, y, WOOD[clamp(Math.floor(l * 5 + P.dith(x, y)), 0, 4)]);
    }
    // ribs for frets: curved bones across the neck
    for (let fx = STRUM_X / 2 + 44; fx < 480; fx += 52) {
      for (let y = 15; y < 86; y++) {
        const x = fx + Math.sin((y - 15) / 71 * Math.PI) * 5;
        for (let w = -1; w <= 1; w++) P.put(x + w, y, BONE[clamp(2 + (w < 0 ? 1 : w > 0 ? -1 : 0) + (y % 7 === 0 ? -1 : 0), 0, 4)]);
      }
    }
  });
  const bedHorn = () => Pix.make('bed_horn', 480, 94, P => {
    // four carved stone channels for the breath to roll along
    for (let y = 13; y < 90; y++) for (let x = 0; x < 480; x++) {
      const sy = y * 2 + BED_Y(); let chan = -1;
      for (let i = 0; i < 4; i++) if (Math.abs(sy - STR_Y[i]) < 12) chan = i;
      let l = chan >= 0 ? 0.2 + (Math.abs(sy - STR_Y[chan]) > 9 ? 0.3 : 0) : 0.5 + Math.sin(x * 0.2 + y * 0.3) * 0.08;
      if (P.hash(x, y, 4) > 0.97) l -= 0.2;
      P.put(x, y, STONE[clamp(Math.floor(l * 5 + P.dith(x, y)), 0, 4)]);
    }
  });
  const tusk = () => Pix.make('tusk', 140, 96, P => {
    // the tusk curls in from the bottom left and opens into a bell
    const IV = ['#8a7f68', '#c4b89a', '#dcd2b6', '#f2ead4', '#fffaea'];
    for (let i = 0; i <= 60; i++) {
      const k = i / 60, x = 8 + k * 112, y = 84 - Math.sin(k * Math.PI * 0.55) * 42, r = 4 + k * k * 12;
      P.ball(x, y, r, IV);
      if (i % 12 === 6 && i < 55) for (let a = -r; a <= r; a++) P.put(x + (a > 0 ? 1 : 0), y + a, '#75401f');   // lashings
    }
    // the bell mouth, dark and deep
    for (let y = 8; y < 90; y++) for (let x = 112; x < 136; x++) {
      const nx = (x - 124) / 11, ny = (y - 49) / 40; const d = nx * nx + ny * ny; if (d > 1) continue;
      P.put(x, y, d > 0.72 ? IV[3 - (ny > 0 ? 1 : 0)] : d > 0.55 ? '#5c503c' : '#120c16');
    }
  });
  // dusk over a reed bed: the wind has somewhere to blow
  const bedFlute = () => Pix.make('bed_flute', 480, 94, P => {
    const SKY = ['#120c16', '#1a1320', '#241c2e', '#18706a', '#3f9a8a'];
    for (let y = 13; y < 94; y++) for (let x = 0; x < 480; x++) {
      let l = 0.7 - (y - 13) / 80 * 0.75;
      P.put(x, y, SKY[clamp(Math.floor(l * 5 + P.dith(x, y) * 1.4), 0, 4)]);
    }
    for (let i = 0; i < 90; i++) {                         // reeds along the bottom
      const x = (i * 53) % 480 + P.hash(i, 1) * 5, hgt = 8 + P.hash(i, 2) * 16, lean = (P.hash(i, 3) - 0.5) * 6;
      for (let k = 0; k < hgt; k++) P.put(x + lean * k / hgt, 93 - k, k > hgt - 4 ? '#5c3a20' : P.hash(i, 4) > 0.5 ? '#27632f' : '#1d4a2a');
    }
  }, { ink: false });
  const fluteBone = () => Pix.make('flute', 20, 86, P => {
    P.tube(10, 5, 10, 81, 5.2, 5.2, BONE);
    P.ball(10, 5, 7, BONE, 4); P.ball(10, 81, 7.5, BONE, 4.5);
    for (let i = 0; i < 4; i++) {
      const y = (STR_Y[i] - (NECK_TOP - 36)) / 2;
      P.ball(10, y, 3.2, ['#120c16', '#241c2e', '#3b3048', '#3b3048', '#574a66']);
      if (i < 3) for (let x = 5; x <= 15; x++) { P.put(x, y + 8, '#75401f'); P.put(x, y + 9, '#5c3a20'); }
    }
  });
  const strumBone = () => Pix.make('strumbone', 18, 86, P => {
    P.tube(9, 6, 9, 80, 4, 4, BONE);
    P.ball(6, 5, 4.5, BONE); P.ball(12, 6, 4.5, BONE); P.ball(6, 81, 4.5, BONE); P.ball(12, 80, 4.5, BONE);
  });
  const skullDrum = lane => Pix.make('skull' + lane, 50, 46, P => {
    const SK = ['#8a7f68', '#a89c80', '#c4b89a', '#e8dfc6', '#fffaea'];
    // the skull
    P.ball(25, 28, 18, SK, 15);
    for (const ex of [17, 33]) P.ball(ex, 28, 5, ['#120c16', '#120c16', '#241c2e', '#241c2e', '#3b3048'], 5.5);
    P.put(25, 33, '#241c2e'); P.put(24, 34, '#241c2e'); P.put(26, 34, '#241c2e');
    for (let x = 16; x <= 34; x += 3) { P.rect(x, 39, 2, 3, '#fffaea'); P.put(x + 2, 39, '#5c503c'); P.put(x + 2, 40, '#5c503c'); }
    // the hide stretched over the top of it, tied round with sinew
    const HD = Pix.ramp(Pix.mix('#b07a45', STR_COL[lane], 0.25));
    for (let y = 2; y < 16; y++) for (let x = 4; x < 46; x++) {
      const nx = (x - 25) / 20, ny = (y - 9) / 6.5, d = nx * nx + ny * ny; if (d > 1) continue;
      P.put(x, y, HD[clamp(Math.floor((0.75 - ny * 0.3 - d * 0.25) * 5 + P.dith(x, y)), 0, 4)]);
    }
    for (let x = 6; x < 45; x += 4) { P.put(x, 14, '#3a2415'); P.put(x + 1, 15, '#e8dfc6'); }
  });
  const bedDrum = () => Pix.make('bed_drum', 480, 110, P => {
    const HD = ['#241109', '#3a2415', '#5c3a20', '#75401f', '#85562f'];
    for (let y = 0; y < 110; y++) for (let x = 0; x < 480; x++) {
      let l = 0.35 + (P.hash(x >> 1, y >> 1, 3) - 0.5) * 0.3 + Math.sin(x * 0.04 + y * 0.02) * 0.08;
      for (const cx of COL_X) if (Math.abs(x * 2 - cx) < 3 && y < 80 && (y >> 2) % 2) l += 0.35;   // the path each pebble drops down
      P.put(x, y, HD[clamp(Math.floor(l * 5 + P.dith(x, y)), 0, 4)]);
    }
  }, { ink: false });
  const bedMarimba = () => Pix.make('bed_mar', 480, 94, P => {
    // two log rails under four rib-bone keys that get shorter as they go up
    for (let y = 13; y < 90; y++) for (let x = 0; x < 480; x++) P.put(x, y, STONE[clamp(Math.floor(1 + P.dith(x, y) + (P.hash(x >> 2, y >> 2, 2) > 0.9 ? -1 : 0)), 0, 4)]);
    for (const lx of [STRUM_X / 2 - 16, 452]) P.tube(lx, 14, lx, 90, 7, 7, WOOD);
    for (let i = 0; i < 4; i++) {
      const y = (STR_Y[i] - BED_Y()) / 2, x1 = 470 - i * 14;
      P.tube(STRUM_X / 2 - 22, y, x1, y + Math.sin(i) * 1.5, 5.5 - i * 0.4, 4.6 - i * 0.4, BONE);
    }
  });
  const bedChimes = () => Pix.make('bed_chime', 480, 110, P => {
    // a cave roof with a stalactite over each column, crystals below
    for (let y = 0; y < 110; y++) for (let x = 0; x < 480; x++) {
      const l = 0.18 + (P.hash(x >> 2, y >> 2, 9) - 0.5) * 0.25 + (y < 8 ? 0.2 : 0);
      P.put(x, y, STONE[clamp(Math.floor(l * 5 + P.dith(x, y)), 0, 4)]);
    }
    for (let i = 0; i < 4; i++) {
      const cx = COL_X[i] / 2;
      for (let y = 0; y < 18; y++) { const r = 7 * (1 - y / 18) + 0.6; P.tube(cx, 0, cx, y + 1, r, r, STONE); }
    }
  }, { ink: false });
  const crystal = lane => Pix.make('crys' + lane, 40, 36, P => {
    const R = Pix.ramp(CRYS[lane]);
    const prism = (cx, base, hgt, hw) => {
      for (let y = base - hgt; y <= base; y++) for (let x = cx - hw; x <= cx + hw; x++) {
        const tip = base - hgt + Math.abs(x - cx) * 1.3; if (y < tip) continue;
        const l = x < cx ? 0.8 : x === cx ? 0.55 : 0.3;
        P.put(x, y, R[clamp(Math.floor(l * 5 + P.dith(x, y) * 0.6), 0, 4)]);
      }
    };
    prism(12, 32, 16, 5); prism(28, 32, 18, 5); prism(20, 33, 26, 6);
    P.rect(4, 32, 32, 3, '#3b3048');
  });
  const bedLog = () => Pix.make('bed_log', 480, 94, P => {
    const BK = ['#241109', '#3a2415', '#5c3a20', '#75401f', '#85562f'];
    for (let y = 13; y < 90; y++) for (let x = 0; x < 480; x++) {
      const sy = y * 2 + BED_Y(); let groove = 0;
      for (const ly of [LOG_Y[1], LOG_Y[2]]) if (Math.abs(sy - ly) < 18) groove = Math.abs(sy - ly) < 14 ? 2 : 1;
      const cyl = Math.sin((y - 13) / 77 * Math.PI);
      let l = 0.15 + cyl * 0.55 + (Math.sin(x * 0.35 + Math.sin(y * 0.3) * 2) > 0.8 ? -0.2 : 0);
      if (groove === 2) l = 0.08 + cyl * 0.12; else if (groove === 1) l += 0.25;
      P.put(x, y, BK[clamp(Math.floor(l * 5 + P.dith(x, y)), 0, 4)]);
    }
    // the cut end of the trunk, rings and all
    for (let y = 13; y < 90; y++) for (let x = 0; x < 34; x++) {
      const nx = (x - 16) / 16, ny = (y - 51) / 38, d = Math.sqrt(nx * nx + ny * ny); if (d > 1) continue;
      const ring = Math.floor(d * 7) % 2;
      P.put(x, y, d > 0.9 ? '#3a2415' : d < 0.25 ? '#120c16' : ring ? '#d8a86b' : '#b07a45');
    }
  });

  // ------------------------------------------------------------ geometry
  const rowAt = (R, lane, dt, y) => ({ x: STRUM_X + dt / R.travel * (W + 80 - STRUM_X), y: y ?? STR_Y[lane] });
  const colAt = (R, lane, dt, accel) => {
    const k = dt / R.travel, d = accel ? Math.sign(k) * k * k : k;
    return { x: COL_X[lane], y: HIT_Y - d * (HIT_Y - COL_TOP) };
  };
  const rowRect = (R, lane, y) => ({ x: STRUM_X - 56, y: (y ?? STR_Y[lane]) - 18, w: W - (STRUM_X - 56), h: 36 });
  const colRect = lane => ({ x: COL_X[lane] - 60, y: CH_BOT + 22, w: 120, h: H - CH_BOT - 22 });
  const hops = (R, dt, h) => { const b = AudioSys.beatDur(); return dt > 0 ? -Math.abs(Math.sin(dt / b * Math.PI)) * h : 0; };
  // a bent string: pinned at the strum bar, whipping mid-span
  const drawStrings = (R, ctx, bop, lanes, ys, bend) => {
    for (const i of lanes) {
      const y = ys(i) - bop, vib = R.strVib[i], thick = 1 + (4 - i) * 0.7;
      ctx.strokeStyle = R.strPress[i] > 0 ? '#ffffff' : '#a79bb4'; ctx.lineWidth = thick;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 6) {
        const d = Math.abs(x - STRUM_X), env = Math.max(0, 1 - d / 420) * Math.min(1, d / 26);
        const yy = y + Math.sin(x * 0.055 - R.strPhase[i]) * vib * env - (bend && R.held.has(i) ? Math.sin(Time.t * 9) * 4 * env : 0);
        x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();
      if (vib > 1) { ctx.globalAlpha = clamp(vib / 16, 0, 0.5); ctx.strokeStyle = STR_COL[i]; ctx.lineWidth = thick + 3; ctx.stroke(); ctx.globalAlpha = 1; }
    }
  };
  const tail = (R, n, now, w, col, a) => {
    const I = R.inst;
    const p0 = I.at(R, n.lane, Math.max(0, n.time - now)), p1 = I.at(R, n.lane, n.time + n.sustain - now);
    const x = Math.min(p0.x, p1.x), y = Math.min(p0.y, p1.y), ww = Math.abs(p1.x - p0.x), hh = Math.abs(p1.y - p0.y);
    if (I.layout === 'col') Gfx.rectA(x - w / 2, y, w, hh, col, a); else Gfx.rectA(x, y - w / 2, ww, w, col, a);
  };

  const ROW4 = [0, 1, 2, 3];
  const DEF = {
    // ================================================================ RIB-AXE
    ribaxe: {
      name: 'RIB-AXE', voice: 'lead', sfx: 'strum', layout: 'row', lanes: ROW4, icon: 'icon_note',
      tip: ['A  S  D  F', 'TAP THE STRING'], twist: 'POWER CHORD',
      chart: chords,
      at: (R, lane, dt) => rowAt(R, lane, dt),
      rect: (R, lane) => rowRect(R, lane),
      hitPt: (R, lane) => ({ x: STRUM_X, y: STR_Y[lane] }),
      bed(R, ctx, now, bop) { Pix.draw(bedRib(), 0, BED_Y() - bop, { ax: 0, ay: 0 }); drawStrings(R, ctx, bop, ROW4, i => STR_Y[i], true); },
      front(R, ctx, now, bop) {
        Pix.draw(strumBone(), STRUM_X, (NECK_TOP + NECK_BOT) / 2 - bop - 6);
        for (let i = 0; i < 4; i++) if (R.strPress[i] > 0) { const k = R.strPress[i] / 0.16; Gfx.ring(STRUM_X, STR_Y[i] - bop, 10 + (1 - k) * 18, STR_COL[i], 3); }
      },
      note(R, n, x, y) {
        Pix.draw(runeStone(n.lane), x, y);
        if (n.chord && !n.judged) { const o = R.mine.find(m => m !== n && m.chord && m.time === n.time && !m.judged); if (o && o.lane > n.lane) { Gfx.rect(x - 2, STR_Y[n.lane] + 12 - R.bopT * 3, 4, STR_Y[o.lane] - STR_Y[n.lane] - 24, '#ffe98a'); } }
      },
      onHit(R, n, i) { if (n.chord && i === 0) Juice.shake(3, 0.08); },
    },
    // ============================================================= TUSK HORN
    horn: {
      name: 'TUSK HORN', voice: 'horn', sfx: null, layout: 'row', lanes: ROW4, icon: 'icon_note',
      tip: ['HOLD  A S D F', 'HOLD THE CHANNEL'], twist: 'BLOW',
      chart: blows,
      at: (R, lane, dt) => { const p = rowAt(R, lane, dt); p.y += Math.sin(dt * 7 + lane) * Math.min(1, dt) * 4; return p; },
      rect: (R, lane) => rowRect(R, lane),
      hitPt: (R, lane) => ({ x: STRUM_X, y: STR_Y[lane] }),
      bed(R, ctx, now, bop) { Pix.draw(bedHorn(), 0, BED_Y() - bop, { ax: 0, ay: 0 }); },
      tailDraw(R, n, now) {
        const a = n.brokeHold ? 0.15 : n.mine ? 0.55 : 0.2;
        const p0 = R.inst.at(R, n.lane, Math.max(0, n.time - now)), p1 = R.inst.at(R, n.lane, n.time + n.sustain - now);
        for (let x = Math.max(STRUM_X, p0.x); x < p1.x; x += 8) {
          const w = 10 + Math.sin(x * 0.12 + Time.t * 6) * 3;
          Gfx.rectA(Math.round(x), Math.round(STR_Y[n.lane] - w / 2 - R.bopT * 3), 6, Math.round(w), Pix.mix('#e8dfc6', STR_COL[n.lane], 0.4), a * (0.6 + ((x >> 3) & 1) * 0.4));
        }
      },
      front(R, ctx, now, bop) {
        const sw = 1 + R.flare * 0.04;
        Pix.draw(tusk(), STRUM_X - 124, NECK_BOT - 30 - bop, { ax: 0.5, ay: 0.93, sx: sw, sy: sw });
        for (let i = 0; i < 4; i++) if (R.held.has(i) || R.strPress[i] > 0) Gfx.rectA(STRUM_X - 4, STR_Y[i] - 8 - bop, 8, 16, STR_COL[i], 0.7);
        // lungs: how much breath is left
        const b = R.breath ?? 1, x = 26, y = NECK_TOP - 6 - bop;
        PixUI.panel('hide', x - 8, y - 6, 116, 26, { seed: 3 });
        Gfx.rect(x, y + 2, 100, 10, '#241109');
        Gfx.rect(x, y + 2, Math.round(100 * b), 10, b > 0.3 ? '#86e8d2' : '#ef6a5e');
        for (let k = 0; k < 100 * b; k += 6) Gfx.rect(x + k, y + 2, 2, 3, '#e8fff8');
      },
      note(R, n, x, y) { Pix.draw(puff(n.lane, (Time.t * 6 | 0) % 4), x, y); },
      update(R, dt) {
        R.breath = R.breath ?? 1;
        const blowing = R.held.size > 0;
        R.breath = clamp(R.breath + (blowing ? -dt * 0.42 : dt * 0.75), 0, 1);
        if (blowing) for (const lane of R.held.keys()) if (chance(dt * 30)) Particles.spawn(STRUM_X + 8, STR_Y[lane], { n: 1, color: ['#e8dfc6', STR_COL[lane]], speed: 90, spread: 1.2, angle: Math.PI, life: 0.5, size: 5, sizeEnd: 0, gravity: -30 });
        if (R.breath <= 0 && blowing) { for (const [lane, n] of R.held) { n.held = false; n.brokeHold = true; } R.held.clear(); R.setJudge('OUT OF BREATH', '#ef6a5e'); }
      },
      onHoldEnd(R, n) { if (n.sustain > 0.6 && !n.brokeHold) { Juice.shake(5, 0.2); R.setJudge('BIG BLAST', '#ffe98a'); } },
    },
    // =========================================================== SKULL BONGOS
    bongos: {
      name: 'SKULL BONGOS', voice: 'bongo', sfx: null, layout: 'col', lanes: ROW4, icon: 'icon_note',
      tip: ['A  S  D  F', 'TAP THE DRUM'], twist: 'ROLL',
      chart: rolls,
      at: (R, lane, dt) => { const p = colAt(R, lane, dt); p.y += hops(R, dt, 14); return p; },
      rect: (R, lane) => colRect(lane),
      hitPt: (R, lane) => ({ x: COL_X[lane], y: HIT_Y }),
      bed(R, ctx, now, bop) { Pix.draw(bedDrum(), 0, COL_TOP + 4 - bop, { ax: 0, ay: 0 }); },
      front(R, ctx, now, bop) {
        for (let i = 0; i < 4; i++) {
          const k = R.kick[i];
          Pix.draw(skullDrum(i), COL_X[i], HIT_Y + 30 - bop, { ay: 1, sx: 1 + k * 0.12, sy: 1 - k * 0.14 });
          if (k > 0.05) Gfx.ring(COL_X[i], HIT_Y + 4 - bop, 20 + (1 - k) * 30, STR_COL[i], 3);
        }
      },
      note(R, n, x, y) {
        Pix.draw(pebble(n.lane), x, y);
        if (n.roll === 1) Gfx.text('x' + R.mine.filter(m => m.roll && m.lane === n.lane && Math.abs(m.time - n.time) < 0.6).length, x + 14, y - 6, { color: '#ffe98a', scale: 1, font: 'rock' });
      },
    },
    // ============================================================= BONE FLUTE
    flute: {
      name: 'BONE FLUTE', voice: 'flute', sfx: null, layout: 'row', lanes: ROW4, icon: 'icon_note',
      tip: ['A  S  D  F', 'TAP THE HOLE'], twist: 'TRILL',
      chart: trills,
      at: (R, lane, dt) => { const p = rowAt(R, lane, dt); p.y += Math.sin(dt * 5 + lane * 1.7) * clamp(dt, 0, 1) * 16; return p; },
      rect: (R, lane) => rowRect(R, lane),
      hitPt: (R, lane) => ({ x: STRUM_X, y: STR_Y[lane] }),
      bed(R, ctx, now, bop) {
        Pix.draw(bedFlute(), 0, BED_Y() - bop, { ax: 0, ay: 0 });
        // the wind itself, blowing in from the right
        for (let i = 0; i < 26; i++) {
          const y = BED_Y() + 30 + (i * 37) % 150, x = W - ((Time.t * (120 + (i % 5) * 30) + i * 97) % (W + 60));
          Gfx.rectA(Math.round(x / 2) * 2, Math.round(y / 2) * 2 - bop, 18 + (i % 3) * 10, 2, '#86e8d2', 0.18);
        }
      },
      front(R, ctx, now, bop) {
        Pix.draw(fluteBone(), STRUM_X, NECK_TOP - 36 - bop, { ay: 0 });
        for (let i = 0; i < 4; i++) if (R.strPress[i] > 0 || R.kick[i] > 0.05) Gfx.ring(STRUM_X, STR_Y[i] - bop, 8 + (1 - R.kick[i]) * 18, STR_COL[i], 2);
      },
      note(R, n, x, y) { Pix.draw(leaf(n.lane, ((Time.t * 8 + n.time * 3) | 0) % 8), x, y, { scale: 1.3 }); },
    },
    // ======================================================== MAMMOTH MARIMBA
    marimba: {
      name: 'MAMMOTH MARIMBA', voice: 'marimba', sfx: null, layout: 'row', lanes: ROW4, icon: 'icon_note',
      tip: ['A  S  D  F', 'TAP THE BONE'], twist: 'GLISS',
      chart: gliss,
      at: (R, lane, dt) => { const p = rowAt(R, lane, dt); p.y += hops(R, dt, 12); return p; },
      rect: (R, lane) => rowRect(R, lane),
      hitPt: (R, lane) => ({ x: STRUM_X, y: STR_Y[lane] }),
      bed(R, ctx, now, bop) {
        Pix.draw(bedMarimba(), 0, BED_Y() - bop, { ax: 0, ay: 0 });
        for (let i = 0; i < 4; i++) if (R.kick[i] > 0.05) Gfx.rectA(STRUM_X - 40, STR_Y[i] - 5 - bop + Math.sin(Time.t * 60) * R.kick[i] * 2, W - STRUM_X, 10, STR_COL[i], R.kick[i] * 0.35);
      },
      front(R, ctx, now, bop) {
        // a mallet over each key, which comes down when you strike it
        for (let i = 0; i < 4; i++) {
          const k = R.kick[i], y = STR_Y[i] - 16 + k * 10 - bop;
          Gfx.rect(STRUM_X - 26, y - 1, 22, 3, '#85562f');
          Pix.draw(mallet(i), STRUM_X - 2, y);
        }
        // the chains that tie a gliss together
        for (const n of R.mine) if (n.gliss && !n.judged) {
          const m = R.mine.find(o => o.gliss === n.gliss && o.lane === n.lane + 1); if (!m || m.judged) continue;
          const a = R.inst.at(R, n.lane, n.time - now), b = R.inst.at(R, m.lane, m.time - now);
          if (a.x > W + 40) continue;
          for (let k = 0; k <= 1; k += 0.1) Gfx.rect(Math.round(a.x + (b.x - a.x) * k) - 1, Math.round(a.y + (b.y - a.y) * k) - 1 - bop, 3, 3, '#ffe98a');
        }
      },
      note(R, n, x, y) { Pix.draw(mallet(n.lane), x, y); },
    },
    // ====================================================== STALACTITE CHIMES
    chimes: {
      name: 'STALACTITE CHIMES', voice: 'chime', sfx: 'plop', layout: 'col', lanes: ROW4, icon: 'icon_note',
      tip: ['A  S  D  F', 'TAP THE CRYSTAL'], twist: 'DRIP',
      chart: dry,
      at: (R, lane, dt) => colAt(R, lane, dt, true),
      rect: (R, lane) => colRect(lane),
      hitPt: (R, lane) => ({ x: COL_X[lane], y: HIT_Y }),
      bed(R, ctx, now, bop) {
        Pix.draw(bedChimes(), 0, COL_TOP - bop, { ax: 0, ay: 0 });
        // the roof keeps dripping on its own, and the pools shiver
        for (let i = 0; i < 4; i++) {
          const k = ((Time.t * 0.7 + i * 0.37) % 1), y = COL_TOP + 36 + k * k * 120;
          if (k < 0.8) Gfx.rectA(COL_X[i] + 14, Math.round(y / 2) * 2 - bop, 2, 4, CRYS[i], 0.45);
          Gfx.rectA(COL_X[i] - 30, HIT_Y + 38 - bop, 60, 2, CRYS[i], 0.12 + R.kick[i] * 0.4);
        }
      },
      front(R, ctx, now, bop) {
        for (let i = 0; i < 4; i++) {
          const k = R.kick[i];
          if (k > 0.02) Gfx.rectA(COL_X[i] - 26, HIT_Y - 30 - bop, 52, 60, CRYS[i], k * 0.25);
          Pix.draw(crystal(i), COL_X[i], HIT_Y + 36 - bop, { ay: 1, sy: 1 + k * 0.06 });
          if (k > 0.05) for (let r = 0; r < 2; r++) Gfx.ring(COL_X[i], HIT_Y - bop, 12 + (1 - k) * (26 + r * 18), CRYS[i], 2);
        }
      },
      note(R, n, x, y) { const k = clamp((n.time - Riff.now()) / R.travel, 0, 1); Pix.draw(drop(n.lane), x, y, { sy: 1 + (1 - k) * 0.35, sx: 1 - (1 - k) * 0.12 }); },
    },
    // ================================================================ BOOM-LOG
    boomlog: {
      name: 'BOOM-LOG', voice: 'logdrum', sfx: 'thud', layout: 'row', lanes: [1, 2], icon: 'icon_note',
      tip: ['A S   |   D F', 'TAP AN END'], twist: 'BOOM',
      chart: booms,
      keyLane: code => { for (let i = 0; i < 4; i++) if (LANE_KEYS[i].includes(code)) return i < 2 ? 1 : 2; return -1; },
      at: (R, lane, dt) => rowAt(R, lane, dt, LOG_Y[lane]),
      rect: (R, lane) => ({ x: 0, y: lane === 1 ? NECK_TOP - 20 : (LOG_Y[1] + LOG_Y[2]) / 2, w: W, h: lane === 1 ? (LOG_Y[1] + LOG_Y[2]) / 2 - NECK_TOP + 20 : H - (LOG_Y[1] + LOG_Y[2]) / 2 }),
      hitPt: (R, lane) => ({ x: STRUM_X, y: LOG_Y[lane] }),
      bed(R, ctx, now, bop) {
        const k = Math.max(R.kick[1], R.kick[2]);
        Pix.draw(bedLog(), 0, BED_Y() - bop + k * 3, { ax: 0, ay: 0 });
      },
      front(R, ctx, now, bop) {
        for (const l of [1, 2]) {
          const k = R.kick[l], y = LOG_Y[l] - bop;
          Gfx.ring(STRUM_X, y, 22 + k * 8, k > 0.05 ? '#ffe98a' : '#b07a45', 3);
          Gfx.ring(STRUM_X, y, 15, '#5c3a20', 2);
        }
      },
      note(R, n, x, y) {
        Pix.draw(boulder(((-x / 12) | 0) & 7), x, y);
        if (n.boom && !n.judged && n.lane === 1) Gfx.text('BOOM', x, y - 44, { color: '#ffa832', align: 'center', scale: 1.4, font: 'rock', outline: true });
      },
      onHit(R, n, i) {
        Juice.shake(n.boom ? 8 : 4, n.boom ? 0.22 : 0.1);
        Particles.spawn(STRUM_X, LOG_Y[n.lane] + 14, { n: 8, color: ['#85562f', '#b07a45', '#c4b89a'], speed: 140, spread: 2.4, angle: -Math.PI / 2, life: 0.5, size: 4, sizeEnd: 0, gravity: 500 });
      },
    },
  };
  for (const [id, d] of Object.entries(DEF)) d.id = id;
  const HERO_INST = { bronk: 'ribaxe', vela: 'horn', pebble: 'bongos', roxy: 'flute' };
  return {
    DEF, HERO_INST, COL_X, HIT_Y, tail,
    get(id) {
      if (id && DEF[id]) return DEF[id];
      const h = typeof Game !== 'undefined' && Game.run && Game.run.hero;
      return DEF[HERO_INST[h]] || DEF.ribaxe;
    },
  };
})();
