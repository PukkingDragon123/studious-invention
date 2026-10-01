// ---------------------------------------------------------------------------
// rhythm.js - "THE ROCK-AXE": the performance game.
//
// Not a four-arrow scroller. The guitar lies across the bottom of the screen
// like it is in your hands: rune-stones slide RIGHT to LEFT down four strings
// into a bone strum bar, and you strike whichever string they land on. The
// struck string then whips and rings.
//
// Between phrases the song hands you a VOCAL LINE. Rune circles light up over
// the stage in the order you have to call them, each with a ring closing in on
// it; you click or tap each one as its ring lands, and the synth sings that
// note back. Strums carry the damage; the chant carries the crowd.
// ---------------------------------------------------------------------------
'use strict';

// four strings, thickest (lowest) at the bottom
const STRINGS = 4;
// kept under the old name so the headless auto-players keep working
const LANE_KEYS = [
  ['KeyA', 'Digit1', 'ArrowUp'],
  ['KeyS', 'Digit2', 'ArrowLeft'],
  ['KeyD', 'Digit3', 'ArrowDown'],
  ['KeyF', 'Digit4', 'ArrowRight'],
];
const STRING_KEYS = LANE_KEYS;
const CHANT_KEYS = ['Space', 'KeyL', 'Enter'];
const STR_COL = ['#ffe08a', '#86e8d2', '#ef6a5e', '#b177e6'];
const STR_DIM = ['#a8801f', '#18706a', '#7d1d2b', '#4b2070'];
const STR_RUNE = ['\\', '/', 'X', 'O'];

// geometry: the neck sits low so the performers stay visible above it
const STRUM_X = 244;
const NECK_TOP = 380, NECK_BOT = 532;
const STR_Y = [404, 436, 468, 500];
const NOTE_R = 17;
// the chant circles live in the band above the neck while a phrase is running
const CH_TOP = 66, CH_BOT = 320;
const CH_L = 92, CH_R = W - 92;
const CH_R0 = 30;                        // the hit circle's radius
const CH_APPROACH = 1.05;                // how long the ring takes to close
const CH_WIN = [0.10, 0.18, 0.28];       // perfect / good / late, in seconds

const RATINGS = [
  { name: 'SICK!', win: 0.075, mult: 1.0, col: '#86e8d2', heal: 0.030, score: 350 },
  { name: 'GOOD', win: 0.14, mult: 0.75, col: '#a8e878', heal: 0.022, score: 200 },
  { name: 'BAD', win: 0.19, mult: 0.48, col: '#ffa832', heal: 0.006, score: 100 },
  { name: 'AWFUL', win: 0.24, mult: 0.22, col: '#ef6a5e', heal: -0.006, score: 50 },
];

class Riff {
  /* opts: bars, density (0..2), title, windowMult, callResponse, act,
           onNote(rating, note), onDone(result), speedMul, encore  */
  constructor(o) {
    this.o = o;
    this.notes = []; this.phrases = []; this.done = false; this.result = null;
    this.hits = [0, 0, 0, 0]; this.misses = 0; this.combo = 0; this.maxCombo = 0; this.score = 0;
    this.health = 0.5; this.judge = null;
    this.strPress = [0, 0, 0, 0]; this.strVib = [0, 0, 0, 0]; this.strPhase = [0, 0, 0, 0];
    this.held = new Map();                 // sustains being held, by string
    this.bopT = 0; this.flare = 0; this.ghostSing = -1;
    // chant state
    this.chanting = false; this.chantVis = 0;
    this.chantGood = 0; this.chantTotal = 0; this.chantHeat = 0; this.curPhrase = null;
    this.chantPops = []; this.chantJudge = null;
    const diff = (typeof Settings !== 'undefined' ? Settings.difficulty : 'normal');
    const dm = diff === 'easy' ? 1.5 : diff === 'hard' ? 0.76 : 1;
    // TRAINING WHEELS. The first riffs of a run are deliberately very easy:
    // enormous timing windows, stones that drift in slowly, half the notes and
    // no vocal line at all until you have got the hang of strumming.
    const played = (typeof Game !== 'undefined' && Game.run && Game.run.riffsPlayed) || 0;
    this.played = played;
    this.lesson = played < 4 ? 2 : played < 10 ? 1 : 0;
    const ew = [1, 1.15, 1.35][this.lesson], et = [1.12, 1.22, 1.35][this.lesson];
    // THE TEACHER. The band plays your phrase first - every note of it, on
    // the same strings, with the same sounds - and then it is your turn. It
    // does this for the first riffs of a run, the first time you play any
    // card, and whenever the riff has something in it you have never met.
    const run = typeof Game !== 'undefined' && Game.run;
    this.seenFx = run ? (run.fxSeen = run.fxSeen || {}) : {};
    const seen = run ? (run.riffSeen = run.riffSeen || {}) : {}, key = (o.key || 'riff') + '|' + (o.style || 'strike');
    this.teach = !o.encore && (o.teach ?? (played < 6 || !seen[key]));
    if (run) seen[key] = 1;
    this.windowMul = dm * (o.windowMult || 1) * ew;
    this.travel = (typeof Settings !== 'undefined' ? Settings.noteSpeed : 1.15) / (o.speedMul || 1) * et;
    // which instrument is in your hands decides how the notes come at you
    this.inst = Instruments.get(o.inst);
    if (this.inst.layout === 'col') this.travel *= 0.85;
    this.kick = [0, 0, 0, 0]; this.breath = 1;
    this.build();
  }
  // ------------------------------------------------------------- the styles
  // STRIKE  the riff as written, with a chord, a bomb or two and a drum roll
  // SMASH   only the big beats, every one a two-string chord
  // GUARD   long holds to brace behind, and bombs you must not touch
  // HYPE    drum rolls: mash for the crowd
  // ECHO    the beast plays a line, you play it back - and yours fade out
  //         before they land, so you have to remember them
  static style(R, style, notes) {
    const p = R.played || 0, step = AudioSys.stepDur || 0.125, L = R.inst.lanes;
    // the progression: chords first, then drum rolls, then bombs, then ghosts
    const F = { chord: p >= 3, roll: p >= 5, bomb: p >= 8, ghost: p >= 11 }, hard = p >= 14;
    const fresh = (n, o) => Object.assign({}, n, { judged: false, hit: false, holdT: 0, held: false, brokeHold: false, pop: 0, chord: false, rollHits: 0 }, o);
    const other = lane => { const i = L.indexOf(lane); return L[(i + 1 + Math.floor(Math.random() * (L.length - 1))) % L.length]; };
    const bombs = (list, k) => {
      const out = [];
      for (let i = 0; i < k && list.length > 2; i++) {
        const a = list[1 + Math.floor(Math.random() * (list.length - 2))];
        out.push(fresh(a, { time: a.time + step * 2, step: a.step + 2, lane: other(a.lane), bomb: true, sustain: 0, partner: true }));
      }
      return out;
    };
    if (style === 'smash') {
      const keep = notes.filter(n => ((n.step - R.startBar * 16) % 4) === 0);
      const base = keep.length >= 2 ? keep : notes.slice(0, 3);
      const out = [];
      const ch = F.chord && L.length > 1;
      for (const n of base) { n.sustain = 0; out.push(n); if (ch) out.push(fresh(n, { lane: other(n.lane), midi: n.midi + 7, chord: true, partner: true })); n.chord = ch; }
      return out;
    }
    if (style === 'guard') {
      const out = [];
      let last = -99;
      for (const n of notes) { if (n.step - last < 4) continue; last = n.step; n.sustain = Math.max(n.sustain, step * 3); out.push(n); }
      return out.concat(F.bomb ? bombs(out, hard ? 3 : 2) : []);
    }
    if (style === 'hype') {
      const out = notes.filter((n, i) => i % 2 === 0);
      // two drum rolls, where the gaps are
      for (let k = 0; k < (F.roll ? 2 : 0) && out.length > 1; k++) {
        const a = out[Math.floor(out.length * (k + 0.5) / 2)];
        a.sustain = 0; a.rollDur = step * 5; a.rollNeed = hard ? 6 : 4;
      }
      return out;
    }
    if (style === 'echo') { for (const n of notes) { n.ghost = F.ghost; n.sustain = 0; } return notes; }
    // strike: the song as it is, dressed up
    const out = notes.slice();
    const plain = out.filter(n => !n.chord && !n.sustain);
    if (F.chord && plain.length > 3 && L.length > 1) { const a = plain[Math.floor(plain.length * 0.66)]; a.chord = true; out.push(fresh(a, { lane: other(a.lane), midi: a.midi + 5, chord: true, partner: true })); }
    const tail = out.filter(n => !n.chord && !n.partner).sort((x, y) => y.time - x.time)[0]; if (F.roll && tail) { tail.sustain = 0; tail.rollDur = step * 4; tail.rollNeed = hard ? 5 : 4; }
    if (F.bomb) out.push(...bombs(out, hard && R.o.density >= 2 ? 2 : 1));
    return out;
  }
  static latency() { const c = AudioSys.ctx; return c ? (c.outputLatency || 0) + (typeof Settings !== 'undefined' ? Settings.offset : 0) : 0; }
  static now() { const c = AudioSys.ctx; return c ? c.currentTime - Riff.latency() : 0; }
  static heardNow() { return Riff.now(); }
  static eventTime(ev, fb) { return ev && ev.at ? ev.at - Riff.latency() : fb; }

  // ------------------------------------------------------------- chart build
  build() {
    const o = this.o, now = AudioSys.now();
    if (!AudioSys.song) { AudioSys.songStart = now; AudioSys.stepDur = 0.125; }
    const bars = o.bars || 1;
    const call = !!o.callResponse || this.teach;
    const total = call ? bars * 2 : bars;
    const nb = AudioSys.nextBar(now + this.travel + 0.4);
    this.startTime = nb.time; this.startBar = nb.bar;
    this.endTime = this.startTime + total * AudioSys.barDur();
    let evs = o.encore ? this.encoreEvents(bars) : AudioSys.leadEvents(this.startBar, bars);
    if (!evs.length) { for (let i = 0; i < bars * 16; i += 4) evs.push({ time: AudioSys.stepTime(this.startBar * 16 + i), step: this.startBar * 16 + i, midi: 64, len: 2, dur: 0.22, vel: 1 }); }
    // density: thin the phrase out for the easy cards
    let density = o.density ?? 1;
    if (this.lesson) density = 0;
    {
      // room to breathe: a quarter note apart on the easy cards, an eighth on
      // the rest, and only seasoned hands get the fast runs
      const gap = density === 0 ? 4 : density >= 2 && this.played >= 12 ? 1 : 2;
      const keep = []; let last = -99;
      for (const e of evs) { const rel = e.step - this.startBar * 16; if (gap > 1 && rel % 2) continue; if (e.step - last < gap) continue; keep.push(e); last = e.step; }
      evs = keep.length >= 3 ? keep : evs;
    }
    // a proper workout once you know how: a note on every beat at least, and
    // on the off-beats too for the hard ones
    const want = density >= 2 ? 5 : density >= 1 ? 4 : 3;
    if (!this.lesson && evs.length < want * bars) {
      const have = new Set(evs.map(e => e.step)), stride = density >= 2 && this.played >= 10 ? 2 : 4;
      for (let i = 0; i < bars * 16; i += stride) {
        const gs = this.startBar * 16 + i;
        if (!have.has(gs)) { const near = evs.length ? evs.reduce((a, b) => Math.abs(b.step - gs) < Math.abs(a.step - gs) ? b : a) : null; evs.push({ time: AudioSys.stepTime(gs), step: gs, midi: near ? near.midi : 64, len: 2, dur: 0.22, vel: 1 }); }
      }
      evs.sort((a, b) => a.step - b.step);
    }
    // a guitar maps pitch to string: low notes on the fat bottom string
    const pitches = [...new Set(evs.map(e => e.midi))].sort((a, b) => a - b);
    this.loMidi = pitches[0] ?? 60; this.hiMidi = pitches[pitches.length - 1] ?? 72;
    if (this.hiMidi - this.loMidi < 7) { this.loMidi -= 4; this.hiMidi += 4; }
    const strOf = m => { const r = pitches.indexOf(m); return pitches.length <= 4 ? clamp(STRINGS - 1 - r, 0, 3) : clamp(STRINGS - 1 - Math.floor(r * STRINGS / pitches.length), 0, 3); };
    const barDur = AudioSys.barDur();
    let prev = -1;
    const mk = (e, mine, offset) => {
      let s = strOf(e.midi);
      if (s === prev && chance(0.5)) s = (s + 1 + Math.floor(rnd(0, 2))) % STRINGS;
      prev = s;
      const sustain = e.len >= 4 ? e.len * AudioSys.stepDur * 0.8 : 0;
      return { time: e.time + offset, step: e.step, lane: s, midi: e.midi, dur: e.dur, sustain, mine, judged: false, hit: false, holdT: 0, held: false, brokeHold: false, pop: 0 };
    };
    for (const e of evs) {
      if (call) { this.notes.push(mk(e, false, 0)); prev = -1; }
      this.notes.push(mk(e, true, call ? bars * barDur : 0));
    }
    // the instrument reshapes the chart: chords, blows, rolls, trills, runs
    const byT = (a, b) => a.time - b.time;
    this.notes = this.inst.chart(this, this.notes.filter(n => !n.mine).sort(byT))
      .concat(this.inst.chart(this, this.notes.filter(n => n.mine).sort(byT)));
    this.notes.sort(byT);
    // and the card reshapes it again: how this card wants to be played
    if (!this.lesson || this.lesson < 2) {
      const mine = this.notes.filter(n => n.mine), theirs = this.notes.filter(n => !n.mine);
      this.notes = theirs.concat(Riff.style(this, o.style || 'strike', mine)).sort(byT);
    }
    // inside one riff, it builds: the opening third is plain single notes,
    // and the chords, bombs and ghosts only come once you are in the groove
    {
      const mine = this.notes.filter(n => n.mine);
      if (mine.length > 3) {
        const t0 = mine[0].time, t1 = mine[mine.length - 1].time, cut = t0 + (t1 - t0) * 0.34;
        this.notes = this.notes.filter(n => !(n.mine && n.partner && n.time < cut));
        for (const n of this.notes) if (n.mine && n.time < cut) { n.ghost = false; if (!n.partner) n.chord = false; }
      }
    }
    // the teacher's phrase is yours exactly, a phrase earlier, bombs left out
    if (call) {
      const off = bars * barDur;
      const demo = this.notes.filter(n => n.mine && !n.bomb).map(n => Object.assign({}, n, { time: n.time - off, mine: false, judged: false, hit: false, ghost: false, pop: 0, demo: true }));
      this.notes = demo.concat(this.notes.filter(n => n.mine)).sort(byT);
      this.yourTurn = this.startTime + off;
    }
    // anything you have never seen gets named, the first time
    const has = { chord: this.notes.some(n => n.mine && n.partner && !n.bomb), roll: this.notes.some(n => n.mine && n.rollDur), bomb: this.notes.some(n => n.bomb), ghost: this.notes.some(n => n.mine && n.ghost), hold: this.notes.some(n => n.mine && n.sustain > 0.2) };
    this.newFx = ['bomb', 'roll', 'chord', 'ghost', 'hold'].find(k => has[k] && !this.seenFx[k]) || null;
    if (this.newFx) this.seenFx[this.newFx] = 1;
    this.mine = this.notes.filter(n => n.mine);
    this.total = this.mine.filter(n => !n.bomb).length;
    if (this.lesson < 2 && !this.teach) this.buildChant();
    AudioSys.muteLead(this.startTime - 0.02, this.endTime + 0.06);
    this.lastTime = Math.max(...this.notes.map(n => n.time + n.sustain));
    this.finishTime = Math.max(this.lastTime + 0.5, this.startTime + 0.6, ...this.phrases.map(p => p.to + 0.6));
  }
  encoreEvents(bars) {
    const steps = parsePattern(ENCORE_RIFFS[this.o.act] || ENCORE_RIFFS[1]);
    const out = [];
    for (let i = 0; i < steps.length && i < bars * 16; i++) {
      const st = steps[i]; if (!st || !st.notes.length) continue;
      const gs = this.startBar * 16 + i;
      out.push({ time: AudioSys.stepTime(gs), step: gs, midi: st.notes[0], len: st.len, dur: st.len * AudioSys.stepDur * 0.9, vel: st.vel });
    }
    return out;
  }
  // Vocal phrases live in the holes the strum chart leaves behind, so the two
  // mechanics never ask for your hands at the same moment.
  buildChant() {
    const beat = AudioSys.beatDur(), mine = this.mine;
    const gaps = [];
    for (let i = 0; i < mine.length - 1; i++) {
      const a = mine[i], b = mine[i + 1];
      const from = a.time + a.sustain + 0.16, to = b.time - 0.22;
      if (to - from >= beat * 1.25) gaps.push({ from, to, m0: a.midi, m1: b.midi });
    }
    // always give the player at least one line to sing: the outro
    if (!gaps.length && mine.length) {
      const last = mine[mine.length - 1];
      gaps.push({ from: last.time + last.sustain + 0.2, to: last.time + last.sustain + 0.2 + beat * 2, m0: last.midi, m1: last.midi + 3 });
    }
    gaps.sort((a, b) => (b.to - b.from) - (a.to - a.from));
    const want = clamp(Math.round((this.o.bars || 1) * 0.8), 1, 3);
    let index = 0;
    for (const g of gaps.slice(0, want)) {
      const span = g.to - g.from;
      const n = clamp(Math.round(span / (beat * 0.5)), 2, 6);
      const dots = [];
      // a readable path: circles walk across the band on a gentle wave, never
      // landing on top of each other and never under the guitar neck
      const dir = index % 2 ? -1 : 1;
      for (let i = 0; i < n; i++) {
        const k = n === 1 ? 0.5 : i / (n - 1);
        const kk = dir > 0 ? k : 1 - k;
        const x = CH_L + kk * (CH_R - CH_L);
        const y = CH_TOP + 40 + Math.sin(k * Math.PI * 1.2 + index) * (CH_BOT - CH_TOP - 110) * 0.5
          + (CH_BOT - CH_TOP - 110) * 0.35;
        dots.push({
          t: g.from + (span * 0.94) * k + 0.06, x, y, n: i + 1,
          midi: g.m0 + (g.m1 - g.m0) * k + Math.sin(k * Math.PI) * 4,
          judged: 0, pop: 0,
        });
      }
      this.phrases.push({ from: dots[0].t, to: dots[dots.length - 1].t, dots, hit: 0, total: n, live: false, done: false });
      index++;
    }
    this.phrases.sort((a, b) => a.from - b.from);
    this.chantTotal = this.phrases.reduce((a, p) => a + p.total, 0);
  }
  // --------------------------------------------------------------- geometry
  noteX(t, now) { return STRUM_X + (t - now) / this.travel * (W + 80 - STRUM_X); }
  pitchY(midi) {
    const k = clamp((midi - this.loMidi) / Math.max(1, this.hiMidi - this.loMidi), 0, 1);
    return CH_BOT - 34 - k * (CH_BOT - CH_TOP - 68);
  }
  yPitch(y) {
    const k = clamp((CH_BOT - 34 - y) / (CH_BOT - CH_TOP - 68), 0, 1);
    return this.loMidi + k * (this.hiMidi - this.loMidi);
  }
  phraseMidi(p, t) {
    const pts = p.pts;
    if (t <= pts[0].t) return pts[0].midi;
    for (let i = 0; i < pts.length - 1; i++) {
      if (t <= pts[i + 1].t) {
        const k = (t - pts[i].t) / Math.max(1e-4, pts[i + 1].t - pts[i].t);
        return pts[i].midi + (pts[i + 1].midi - pts[i].midi) * (k * k * (3 - 2 * k));
      }
    }
    return pts[pts.length - 1].midi;
  }
  // touch: the whole right side of a string's band strums it
  stringRect(i) { return this.inst.rect(this, i); }
  chantRect() { return { x: 0, y: CH_TOP - 34, w: W, h: (CH_BOT - CH_TOP) + 54 }; }
  laneFromPoint(x, y) {
    const L = this.inst.lanes;
    for (const i of L) { const r = this.stringRect(i); if (inRect(x, y, r.x, r.y, r.w, r.h)) return i; }
    if (y > NECK_TOP) {
      let best = L[0], bd = 1e9;
      for (const i of L) { const p = this.inst.hitPt(this, i), d = Math.hypot(x - p.x, y - p.y) * (this.inst.layout === 'col' ? 1 : 0) + Math.abs(y - p.y); if (d < bd) { bd = d; best = i; } }
      return best;
    }
    return -1;
  }
  laneFromKey(code) {
    if (this.inst.keyLane) return this.inst.keyLane(code);
    for (let i = 0; i < STRINGS; i++) if (LANE_KEYS[i].includes(code)) return i; return -1;
  }
  // ------------------------------------------------------------------ input
  press(lane, at) {
    if (lane < 0 || this.done) return;
    this.strPress[lane] = 0.16;
    // a drum roll takes every press you give it while it lasts
    const widest0 = RATINGS[RATINGS.length - 1].win * this.windowMul;
    for (const n of this.mine) {
      if (n.rollDur && !n.judged && n.lane === lane && at >= n.time - widest0 && at <= n.time + n.rollDur) {
        n.rollHits = (n.rollHits || 0) + 1; n.pop = 0.6; this.kick[lane] = 1; this.strVib[lane] = 8;
        AudioSys.playInst(this.inst.voice, n.midi + (n.rollHits % 2 ? 0 : 12), 0.1, 0.7);
        this.score += 40; this.setJudge(`${n.rollHits}/${n.rollNeed}`, n.rollHits >= n.rollNeed ? '#86e8d2' : '#ffe98a');
        return;
      }
    }
    // a bomb: hit it and it goes off in your hands
    for (const n of this.mine) {
      if (!n.bomb || n.judged || n.lane !== lane || Math.abs(at - n.time) > RATINGS[1].win * this.windowMul) continue;
      const real = this.mine.some(m => !m.bomb && !m.judged && m.lane === lane && Math.abs(at - m.time) < Math.abs(at - n.time));
      if (real) break;
      n.judged = true; n.hit = false; n.pop = 1; n.blew = true;
      this.misses++; this.combo = 0; this.health = clamp(this.health - 0.09, 0, 1);
      this.setJudge('BOOM!', '#ef6a5e'); AudioSys.sfx('bighit'); Juice.shake(9, 0.25); Juice.flash('#ef6a5e', 0.25, 5);
      const hp = this.inst.hitPt(this, lane);
      Particles.spawn(hp.x, hp.y, { n: 18, color: ['#ef6a5e', '#ffa832', '#120c16'], speed: 260, life: 0.5, size: 5, sizeEnd: 0, gravity: 300 });
      if (this.o.onNote) this.o.onNote(null, n);
      return;
    }
    let best = null, bestD = 1e9;
    for (const n of this.mine) {
      if (n.judged || n.lane !== lane || n.bomb || n.rollDur) continue;
      const d = Math.abs(at - n.time);
      if (d < bestD) { bestD = d; best = n; }
    }
    const widest = RATINGS[RATINGS.length - 1].win * this.windowMul;
    if (!best || bestD > widest) { this.strVib[lane] = Math.max(this.strVib[lane], 3); AudioSys.sfx('error', { vol: 0.35 }); return; }
    const r = RATINGS.find(R => bestD <= R.win * this.windowMul) || RATINGS[RATINGS.length - 1];
    this.hit(best, r, bestD);
  }
  hit(n, r, diff) {
    n.judged = true; n.hit = true; n.pop = 1;
    const i = RATINGS.indexOf(r);
    this.hits[i]++; this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.score += r.score + Math.min(this.combo, 40) * 4;
    this.health = clamp(this.health + r.heal, 0, 1);
    this.setJudge(r.name, r.col);
    this.strVib[n.lane] = 9 - i * 1.4;
    this.strPhase[n.lane] = 0;
    this.flare = Math.max(this.flare, i === 0 ? 1 : 0.6);
    AudioSys.playInst(this.inst.voice, n.midi, Math.max(0.16, n.sustain || n.dur), 0.95);
    if (this.inst.sfx) AudioSys.sfx(this.inst.sfx, { vol: i === 0 ? 0.85 : 0.6 });
    if (n.sustain > 0.05) { n.held = true; this.held.set(n.lane, n); }
    this.kick[n.lane] = 1;
    if (this.inst.onHit) this.inst.onHit(this, n, i);
    const hp = this.inst.hitPt(this, n.lane);
    Particles.spawn(hp.x, hp.y, {
      n: i === 0 ? 12 : 6, color: [STR_COL[n.lane], '#ffffff', '#ffe98a'],
      speed: 150, spread: Math.PI * 2, life: 0.4, size: 4, sizeEnd: 0, gravity: 220,
    });
    if (this.o.onNote) this.o.onNote(r, n);
  }
  miss(n) {
    n.judged = true; this.misses++; this.combo = 0;
    this.health = clamp(this.health - 0.055, 0, 1);
    this.setJudge('MISS', '#ef6a5e');
    AudioSys.sfx('miss', { vol: 0.5 });
    if (this.o.onNote) this.o.onNote(null, n);
  }
  setJudge(text, col) { this.judge = { text, col, t: 0, life: 0.55 }; }
  // ----------------------------------------------------------------- update
  update(dt) {
    const now = Riff.now();
    // ---- keyboard and touch strums, judged on the event's own timestamp
    for (const k of Input.keys) {
      const s = this.laneFromKey(k.code);
      if (s >= 0) this.press(s, Riff.eventTime(k, now));
    }
    for (const c of Input.clicks) {
      const r = this.chantRect();
      if (inRect(c.x, c.y, r.x, r.y, r.w, r.h)) continue;      // that side is the voice
      const s = this.laneFromPoint(c.x, c.y);
      if (s >= 0) this.press(s, Riff.eventTime(c, now));
    }
    // ---- sustains: keep the string held down to keep the note ringing
    for (const [lane, n] of [...this.held]) {
      const down = Input.touch
        ? [...Input.touches.values()].some(p => { const r = this.stringRect(lane); return inRect(p.x, p.y, r.x, r.y, r.w, r.h); })
        : Input.isDown(...LANE_KEYS[lane]);
      const over = now > n.time + n.sustain;
      if (over) { this.held.delete(lane); n.held = false; if (this.inst.onHoldEnd) this.inst.onHoldEnd(this, n); continue; }
      if (!down) { this.held.delete(lane); n.held = false; n.brokeHold = true; this.combo = 0; this.health = clamp(this.health - 0.02, 0, 1); continue; }
      n.holdT += dt; this.health = clamp(this.health + dt * 0.03, 0, 1); this.score += dt * 70;
      this.strVib[lane] = Math.max(this.strVib[lane], 5);
      const hp = this.inst.hitPt(this, lane);
      if (chance(dt * 16)) Particles.spawn(hp.x, hp.y, { n: 1, color: [STR_COL[lane]], speed: 70, life: 0.3, size: 3, sizeEnd: 0, gravity: 120 });
    }
    // ---- missed notes fall off the left edge
    const late = RATINGS[RATINGS.length - 1].win * this.windowMul;
    for (const n of this.mine) {
      if (n.judged) continue;
      if (n.bomb) { if (now > n.time + late) { n.judged = true; n.hit = true; this.score += 60; } continue; }   // left alone: good
      if (n.rollDur) {
        if (now > n.time + n.rollDur + late) {
          const k = (n.rollHits || 0) / n.rollNeed;
          if (k >= 0.3) this.hit(n, RATINGS[k >= 1 ? 0 : k >= 0.7 ? 1 : k >= 0.5 ? 2 : 3], 0); else this.miss(n);
        }
        continue;
      }
      if (now > n.time + late) this.miss(n);
    }
    // ---- the opponent's call plays itself
    for (const n of this.notes) {
      if (n.mine || n.judged || now < n.time) continue;
      n.judged = true; n.pop = 1;
      if (n.demo) AudioSys.playInst(this.inst.voice, n.midi, Math.max(0.14, n.sustain || n.dur || 0.2), 0.7);
      this.strVib[n.lane] = Math.max(this.strVib[n.lane], 5);
      this.kick[n.lane] = Math.max(this.kick[n.lane], 0.5);
      this.ghostSing = 0.2;
      const gp = this.inst.hitPt(this, n.lane);
      Particles.spawn(gp.x, gp.y, { n: 4, color: ['#7a6d8a', '#a79bb4'], speed: 90, life: 0.3, size: 3, sizeEnd: 0, gravity: 180 });
    }
    this.updateChant(dt, now);
    if (this.inst.update) this.inst.update(this, dt);
    // ---- decay
    for (let i = 0; i < STRINGS; i++) {
      this.strPress[i] = Math.max(0, this.strPress[i] - dt);
      this.strVib[i] = Math.max(0, this.strVib[i] - dt * 20);
      this.strPhase[i] += dt * 46;
      this.kick[i] = Math.max(0, this.kick[i] - dt * 4);
    }
    for (const n of this.notes) if (n.pop > 0) n.pop = Math.max(0, n.pop - dt * 4);
    this.flare = Math.max(0, this.flare - dt * 2.2);
    this.ghostSing -= dt;
    if (this.judge) { this.judge.t += dt; if (this.judge.t > this.judge.life) this.judge = null; }
    const b = AudioSys.song ? (now - AudioSys.songStart) / AudioSys.beatDur() : 0;
    this.bopT = 1 - Math.min(1, (b - Math.floor(b)) * 2.2);
    if (!this.done && now > this.finishTime) this.finish();
  }
  // Which circle is next in line, if it is close enough to be hit at all.
  nextDot(now) {
    for (const p of this.phrases) {
      for (const d of p.dots) {
        if (d.judged) continue;
        if (now < d.t - CH_APPROACH) return null;
        return { p, d };
      }
    }
    return null;
  }
  hitDot(now, px, py) {
    const nx = this.nextDot(now);
    if (!nx) return false;
    const { p, d } = nx;
    const off = Math.abs(now - d.t);
    if (off > CH_WIN[2]) return false;
    if (px !== undefined && Math.hypot(px - d.x, py - d.y) > CH_R0 * 2.2) return false;
    const rank = off < CH_WIN[0] ? 0 : off < CH_WIN[1] ? 1 : 2;
    d.judged = rank + 1; d.pop = 1;
    p.hit += [1, 0.7, 0.35][rank];
    this.chantGood += [1, 0.7, 0.35][rank];
    this.chantHeat = Math.min(1, this.chantHeat + 0.5);
    this.health = clamp(this.health + 0.03, 0, 1);
    this.score += [320, 200, 90][rank];
    this.chantJudge = { t: 0, life: 0.5, rank, x: d.x, y: d.y };
    this.chantPops.push({ x: d.x, y: d.y, t: 0, col: ['#86e8d2', '#a8e878', '#ffa832'][rank] });
    AudioSys.singNow(d.midi, 0.34, rank === 0 ? 1 : 0.8, rank === 0 ? 'ah' : 'oh');
    AudioSys.sfx(rank === 0 ? 'perfect' : 'good');
    Particles.spawn(d.x, d.y, { n: rank === 0 ? 14 : 7, color: ['#ffe98a', '#ffffff', '#ffa832'], speed: 170, spread: 6.28, life: 0.6, size: 4, sizeEnd: 0 });
    return true;
  }
  updateChant(dt, now) {
    // which phrase, if any, owns this moment
    let p = null;
    for (const q of this.phrases) if (now >= q.from - CH_APPROACH - 0.3 && now <= q.to + 0.5) { p = q; break; }
    this.curPhrase = p;
    this.chantVis = damp(this.chantVis, p ? 1 : 0, 8, dt);
    this.chanting = !!p && now >= p.from - 0.2 && now <= p.to + 0.2;
    for (const q of this.chantPops) q.t += dt;
    this.chantPops = this.chantPops.filter(q => q.t < 0.45);
    if (this.chantJudge) { this.chantJudge.t += dt; if (this.chantJudge.t > this.chantJudge.life) this.chantJudge = null; }
    this.chantHeat = damp(this.chantHeat, 0, 2.2, dt);
    if (!p) return;
    // a click or a tap lands on the circle it is over; a key calls the next one
    for (const c of Input.clicks) if (c.y < CH_BOT + 20) this.hitDot(now, c.x, c.y);
    for (const k of Input.keys) if (CHANT_KEYS.includes(k.code)) this.hitDot(now);
    // anything left too long is gone
    for (const q of this.phrases) for (const d of q.dots) {
      if (!d.judged && now > d.t + CH_WIN[2]) {
        d.judged = 4;
        this.health = clamp(this.health - 0.035, 0, 1);
        this.chantJudge = { t: 0, life: 0.5, rank: 3, x: d.x, y: d.y };
      }
      if (d.pop > 0) d.pop = Math.max(0, d.pop - dt * 3);
    }
  }
  finish() {
    if (this.done) return; this.done = true;
    if (typeof Game !== 'undefined' && Game.run) Game.run.riffsPlayed = (Game.run.riffsPlayed || 0) + 1;
    const total = this.total || 1;
    const weighted = this.hits.reduce((a, c, i) => a + c * RATINGS[i].mult, 0);
    const strumAcc = weighted / total;
    const chantAcc = this.chantTotal > 0 ? clamp(this.chantGood / this.chantTotal, 0, 1) : 1;
    // the strings carry the song, the voice carries the room
    const acc = this.chantTotal > 0 ? strumAcc * 0.76 + chantAcc * 0.24 : strumAcc;
    const r = {
      sick: this.hits[0], good: this.hits[1], bad: this.hits[2], awful: this.hits[3],
      hits: this.hits.reduce((a, b) => a + b, 0), misses: this.misses, notes: total,
      maxCombo: this.maxCombo, score: Math.round(this.score), health: this.health,
      strumAcc, chantAcc, sang: this.chantTotal > 0,
      acc, mult: 0.35 + acc * 1.15,
    };
    r.grade = acc >= 0.97 ? 'S+' : acc >= 0.9 ? 'S' : acc >= 0.8 ? 'A' : acc >= 0.65 ? 'B' : acc >= 0.5 ? 'C' : acc >= 0.3 ? 'D' : 'F';
    r.fc = this.misses === 0 && r.hits === total;
    if (r.grade === 'S+') Profile.unlock('virtuoso');
    if (r.fc && total >= 4) Profile.unlock('no_mistakes');
    this.result = r;
    if (this.o.onDone) this.o.onDone(r);
  }
  // ------------------------------------------------------------------- draw
  draw() {
    const now = Riff.now(), ctx = Gfx.ctx, bop = this.bopT * 3;
    this.drawChant(now, ctx);
    Gfx.rectA(0, NECK_TOP - 30, W, H - NECK_TOP + 30, '#120c16', 0.55);
    this.inst.bed(this, ctx, now, bop);
    this.drawNotes(now, ctx);
    this.inst.front(this, ctx, now, bop);
    this.drawHud(ctx);
  }
  // --- the notes, wherever this instrument sends them -----------------------
  drawNotes(now, ctx) {
    const I = this.inst, bop = this.bopT * 3;
    // sustains first, so the notes sit on top of their tails
    for (const n of this.notes) {
      if (n.sustain <= 0.05 || (n.judged && n.hit === false && n.mine)) continue;
      if (n.time + n.sustain < now) continue;
      if (I.tailDraw) I.tailDraw(this, n, now);
      else Instruments.tail(this, n, now, 12, STR_COL[n.lane], n.mine ? (n.brokeHold ? 0.18 : 0.6) : 0.22);
      if (n.held) { const p = I.hitPt(this, n.lane); Gfx.spark(p.x, p.y - bop, 14 + Math.sin(Time.t * 30) * 3, '#ffffff', 2); }
    }
    let labelled = false;
    for (const n of this.notes) {
      if (n.judged && (n.hit || !n.mine || n.blew)) continue;
      const dt = n.time - now; if (dt / this.travel > 1.04) continue;
      const p = I.at(this, n.lane, dt);
      if (p.x < -40 || p.x > W + 70 || p.y > H + 30) continue;
      if (n.rollDur) {
        // a drum roll: a striped bar you mash down the length of
        const q = I.at(this, n.lane, dt + n.rollDur), col = I.layout === 'col';
        const x0 = Math.min(p.x, q.x), y0 = Math.min(p.y, q.y), len = col ? Math.abs(q.y - p.y) : Math.abs(q.x - p.x);
        for (let k = 0; k < len; k += 8) {
          const c2 = (k / 8) % 2 ? '#ffe98a' : '#e06a1b';
          if (col) Gfx.rect(Math.round(p.x - 8), Math.round(y0 + k - bop), 16, 6, c2); else Gfx.rect(Math.round(x0 + k), Math.round(p.y - 8 - bop), 6, 16, c2);
        }
        ctx.globalAlpha = n.mine ? 1 : n.demo ? 0.8 : 0.4; I.note(this, n, p.x, p.y - bop); ctx.globalAlpha = 1;
        Gfx.text(n.rollHits ? `${n.rollHits}/${n.rollNeed}` : 'MASH!', p.x + (col ? 14 : 0), p.y - bop - 30, { color: '#ffe98a', align: 'center', font: 'rock', outline: true });
        continue;
      }
      if (n.bomb) {
        // a skull stone: leave it alone
        const wob = Math.sin(Time.t * 20 + n.time) * 2;
        Gfx.sprite('icon_skull', p.x + wob, p.y - bop, { anchor: 'c', scale: 1.6, tint: '#ef6a5e', tintAmount: 0.5 });
        if (Math.floor(Time.t * 8) % 2) Gfx.rect(Math.round(p.x) - 2, Math.round(p.y - bop - 20), 4, 4, '#ffa832');
        continue;
      }
      // a ghost note fades out before it lands: you have to remember it
      const ghostA = n.ghost ? clamp((dt / this.travel - 0.35) / 0.25, 0, 1) : 1;
      ctx.globalAlpha = (n.mine ? 1 : n.demo ? 0.8 : 0.4) * ghostA;
      if (ghostA > 0.02) I.note(this, n, p.x, p.y - bop);
      ctx.globalAlpha = 1;
      // name the trick the first time one comes at you
      if (!labelled && n.mine && (n.chord || n.roll === 1 || n.trill === 1 || (n.gliss && n.lane === 0)) && dt > 0.1) {
        labelled = true;
        Gfx.text(I.twist, p.x, p.y - bop - 34, { color: '#ffe98a', align: 'center', scale: 1.2, font: 'rock', outline: true });
      }
    }
    // the pop when a note is struck
    for (const n of this.notes) {
      if (n.pop <= 0) continue;
      const k = 1 - n.pop, p = I.hitPt(this, n.lane);
      ctx.globalAlpha = n.pop;
      Gfx.spark(p.x, p.y - bop, 12 + k * 30, STR_COL[n.lane], 3);
      ctx.globalAlpha = 1;
    }
  }
  // --- the voice -----------------------------------------------------------
  drawChant(now, ctx) {
    const v = this.chantVis;
    if (v < 0.02) return;
    const p = this.curPhrase;
    Gfx.rectA(0, CH_TOP - 34, W, (CH_BOT - CH_TOP) + 54, '#120c16', 0.34 * v);
    Gfx.rectA(0, CH_TOP - 34, W, 2, '#ffa832', 0.45 * v);
    Gfx.rectA(0, CH_BOT + 18, W, 2, '#ffa832', 0.45 * v);
    Gfx.text('CHANT', 16, CH_BOT - 2, { color: '#ffe98a', scale: 1.3, outline: true });
    Gfx.text(Input.touch ? 'TAP EACH RUNE AS ITS RING LANDS' : 'CLICK EACH RUNE, OR SPACE',
      W - 56, CH_BOT - 2, { color: '#d6cfe0', scale: 1.1, align: 'right', outline: true });
    if (p) {
      // the path between the circles, so the order is never a guess
      const live = p.dots.filter(d => !d.judged);
      if (live.length > 1) {
        ctx.save();
        ctx.setLineDash([5, 7]); ctx.lineDashOffset = -Time.t * 26;
        ctx.strokeStyle = `rgba(255,168,50,${0.5 * v})`; ctx.lineWidth = 2;
        ctx.beginPath();
        live.forEach((d, i) => i ? ctx.lineTo(d.x, d.y) : ctx.moveTo(d.x, d.y));
        ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      }
      for (let i = p.dots.length - 1; i >= 0; i--) {
        const d = p.dots[i];
        const lead = d.t - now;
        if (lead > CH_APPROACH || d.judged === 4) continue;
        if (d.judged && d.pop <= 0) continue;
        const col = ['#ffe98a', '#86e8d2', '#a8e878', '#ffa832'][d.n % 4];
        if (d.judged) {                                   // the burst it leaves
          const k = 1 - d.pop;
          Gfx.spark(d.x, d.y, CH_R0 * (1 + k * 1.4), `rgba(255,233,138,${d.pop * 0.8})`, 3);
          continue;
        }
        const fade = clamp((CH_APPROACH - lead) / 0.22, 0, 1) * v;
        ctx.globalAlpha = fade;
        // the rune itself
        Gfx.circle(d.x, d.y, CH_R0 + 4, '#120c16');
        Gfx.circle(d.x, d.y, CH_R0, '#3b3048');
        Gfx.ring(d.x, d.y, CH_R0, col, 3);
        Gfx.circle(d.x - CH_R0 * 0.3, d.y - CH_R0 * 0.3, CH_R0 * 0.24, 'rgba(255,255,255,0.22)');
        Gfx.text(String(d.n), d.x, d.y - 11, { color: col, align: 'center', scale: 2.2, outline: true, outlineWidth: 2 });
        // the ring closing in on it
        const ar = CH_R0 + Math.max(0, lead / CH_APPROACH) * CH_R0 * 2.4;
        Gfx.ring(d.x, d.y, ar, `rgba(255,255,255,${0.85 * fade})`, 3);
        if (lead < CH_WIN[1]) Gfx.glow(d.x, d.y, CH_R0 * 2.4, col, 0.3 * fade);
        ctx.globalAlpha = 1;
      }
      if (now < p.from - 0.15) {
        Gfx.text('SING', W / 2, CH_TOP + 4, { color: '#ffe98a', align: 'center', scale: 1.8, outline: true, outlineWidth: 2 });
      }
    }
    for (const q of this.chantPops) {
      const k = q.t / 0.45;
      ctx.globalAlpha = clamp(1 - k, 0, 1) * 0.8;
      Gfx.spark(q.x, q.y, CH_R0 * (1 + k * 1.8), q.col, 2);
      ctx.globalAlpha = 1;
    }
    if (this.chantJudge) {
      const j = this.chantJudge, k = j.t / j.life;
      const txt = ['PERFECT', 'GREAT', 'LATE', 'MISS'][j.rank];
      const col = ['#86e8d2', '#a8e878', '#ffa832', '#ef6a5e'][j.rank];
      ctx.globalAlpha = clamp(1 - k, 0, 1);
      Gfx.text(txt, j.x, j.y - 36 - k * 16, { color: col, align: 'center', scale: 1.6, outline: true, outlineWidth: 2 });
      ctx.globalAlpha = 1;
    }
  }
  // --- chrome --------------------------------------------------------------
  drawHud(ctx) {
    // crowd meter: how hard the valley is going off
    const h = this.health, x = W - 28;
    Gfx.rectA(x - 6, 110, 22, 224, '#120c16', 0.65);
    Gfx.rect(x - 2, 114 + (1 - h) * 216, 14, h * 216, h > 0.66 ? '#6cc95c' : h > 0.33 ? '#ffa832' : '#ef6a5e');
    Gfx.outlineRect(x - 3, 113, 16, 218, '#3b3048', 1);
    Gfx.sprite('icon_fire', x + 5, 98, { anchor: 'c', scale: 1 });
    if (this.combo > 2) {
      const k = clamp(this.combo / 40, 0, 1);
      Gfx.text(String(this.combo), 76, 292, { color: k > 0.6 ? '#ffe98a' : '#ffffff', align: 'center', scale: 2.6 + k, outline: true, outlineWidth: 2 });
      Gfx.text('COMBO', 76, 330, { color: '#7a6d8a', align: 'center', scale: 1 });
    }
    if (this.judge) {
      const k = this.judge.t / this.judge.life;
      ctx.globalAlpha = clamp(1 - k * k, 0, 1);
      Gfx.text(this.judge.text, STRUM_X, NECK_TOP - 58 - k * 22, { color: this.judge.col, align: 'center', scale: 2.1, outline: true, outlineWidth: 2 });
      ctx.globalAlpha = 1;
    }
    if (this.o.title) Gfx.text(this.o.title, W / 2, 50, { color: '#ffe98a', align: 'center', scale: 2, font: 'rock', outline: true, outlineWidth: 2 });
    const now = Riff.now();
    // how this one is played, on a plank under the name
    const SN = { strike: ['STRIKE', 'PLAY IT'], smash: ['SMASH', 'HIT BOTH AT ONCE'], guard: ['GUARD', 'HOLD ON - NEVER TOUCH A SKULL'], hype: ['HYPE', 'MASH THE ROLLS'], echo: ['ECHO', 'LISTEN, THEN PLAY IT BACK'] }[this.o.style];
    if (SN && now < this.startTime + 1.6) {
      const tw = Gfx.measure(SN[1], 1, 'rock') + 110;
      PixUI.panel('wood', W / 2 - tw / 2, 78, tw, 26, { seed: 3 });
      Gfx.text(SN[0], W / 2 - tw / 2 + 12, 84, { color: '#ffe98a', font: 'rock' });
      Gfx.text(SN[1], W / 2 + 40, 84, { color: '#fffaea', align: 'center', font: 'rock' });
    }
    // the teacher: listen while the band plays it, then it is yours
    if (this.yourTurn && now < this.yourTurn + 1) {
      const listen = now < this.yourTurn - 0.03, k = listen ? 1 + Math.sin(now * 7) * 0.03 : 1 + Math.max(0, 1 - (now - this.yourTurn) * 3) * 0.35;
      const txt = listen ? 'LISTEN...' : 'YOUR TURN!', y = NECK_TOP - 128;
      ctx.globalAlpha = listen ? 1 : clamp((this.yourTurn + 1 - now) / 0.3, 0, 1);
      Gfx.text(txt, W / 2, y, { color: listen ? '#a8d8ff' : '#ffe98a', align: 'center', scale: 2.4 * k, font: 'rock', outline: true, outlineWidth: 2 });
      if (listen) {
        Gfx.text('the band shows you the phrase - watch the strings', W / 2, y + 40, { color: '#fffaea', align: 'center', font: 'rock', outline: true });
        const left = Math.ceil((this.yourTurn - now) / AudioSys.beatDur());
        if (left >= 1 && left <= 3) Gfx.text(String(left), W / 2 + Gfx.measure(txt, 2.4, 'rock') / 2 + 26, y, { color: '#ffffff', align: 'center', scale: 2.4, font: 'rock', outline: true, outlineWidth: 2 });
      }
      ctx.globalAlpha = 1;
    }
    // something new in this one, named the first time you meet it
    const NEW = { chord: 'CHORDS - HIT BOTH KEYS AT ONCE', roll: 'DRUM ROLL - MASH THE KEY', bomb: 'SKULLS - DO NOT HIT THEM', ghost: 'GHOST NOTES - THEY FADE, REMEMBER THEM', hold: 'HOLD NOTES - KEEP THE KEY DOWN' }[this.newFx];
    if (NEW && now < (this.yourTurn || this.startTime) + 2.5) {
      const tw = Gfx.measure(NEW, 1, 'rock') + 90, y = 110;
      PixUI.panel('red', W / 2 - tw / 2, y, tw, 26, { seed: 6 });
      Gfx.text('NEW!', W / 2 - tw / 2 + 12, y + 6, { color: '#ffe98a', font: 'rock' });
      Gfx.text(NEW, W / 2 + 30, y + 6, { color: '#fffaea', align: 'center', font: 'rock' });
    }
    // what is in your hands
    const nm = this.inst.name, nw = Gfx.measure(nm, 1, 'rock') + 22;
    PixUI.panel('obsidian', 10, NECK_TOP - 58, nw, 22, { seed: 9 });
    Gfx.text(nm, 10 + nw / 2, NECK_TOP - 52, { color: '#ffe98a', align: 'center', font: 'rock' });
    // what to press: a little stone key cap on every lane
    if (!Input.touch) {
      const ka = now < this.startTime + 1.2 ? 1 : 0.55;
      ctx.globalAlpha = ka;
      for (const i of this.inst.lanes) {
        const p = this.inst.hitPt(this, i), col = this.inst.layout === 'col';
        const x = col ? p.x : p.x - 44, y = col ? p.y - 44 : p.y;
        const lab = this.inst.keyLane ? (i === 1 ? 'AS' : 'DF') : LANE_KEYS[i][0].slice(3);
        const kw = lab.length > 1 ? 30 : 20;
        PixUI.panel(this.strPress[i] > 0 ? 'woodhot' : 'bone', x - kw / 2, y - 10 - this.bopT * 3, kw, 20, { seed: i, cut: 2, moss: false, hot: this.strPress[i] > 0 });
        Gfx.text(lab, x, y - 5 - this.bopT * 3, { color: '#241109', align: 'center', font: 'rock' });
      }
      ctx.globalAlpha = 1;
    }
    if (now < this.startTime + 0.9) {
      const a = clamp((this.startTime + 0.9 - now) / 0.6, 0, 1);
      ctx.globalAlpha = a;
      if (Input.touch) Gfx.text(this.inst.tip[1], W / 2, NECK_TOP - 34, { color: '#ffffff', align: 'center', scale: 1.2, font: 'rock', outline: true });
      if (this.lesson) Gfx.text(this.lesson > 1 ? 'take your time - the timing is wide open' : 'a little tighter now',
        W / 2, NECK_TOP - 12, { color: '#a8e878', align: 'center', scale: 1.1, outline: true });
      ctx.globalAlpha = 1;
    }
  }
  // the old pad renderer is gone: on touch the strings themselves are the pads
  drawPads() { }
}
