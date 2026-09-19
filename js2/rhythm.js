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
  { name: 'SICK!', win: 0.048, mult: 1.0, col: '#86e8d2', heal: 0.030, score: 350 },
  { name: 'GOOD', win: 0.095, mult: 0.72, col: '#a8e878', heal: 0.020, score: 200 },
  { name: 'BAD', win: 0.135, mult: 0.42, col: '#ffa832', heal: 0.004, score: 100 },
  { name: 'AWFUL', win: 0.175, mult: 0.18, col: '#ef6a5e', heal: -0.010, score: 50 },
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
    this.lesson = played < 3 ? 2 : played < 7 ? 1 : 0;
    const ew = [1, 1.5, 2.6][this.lesson], et = [1, 1.22, 1.55][this.lesson];
    this.windowMul = dm * (o.windowMult || 1) * ew;
    this.travel = (typeof Settings !== 'undefined' ? Settings.noteSpeed : 1.15) / (o.speedMul || 1) * et;
    this.build();
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
    const call = !!o.callResponse;
    const total = call ? bars * 2 : bars;
    const nb = AudioSys.nextBar(now + this.travel + 0.4);
    this.startTime = nb.time; this.startBar = nb.bar;
    this.endTime = this.startTime + total * AudioSys.barDur();
    let evs = o.encore ? this.encoreEvents(bars) : AudioSys.leadEvents(this.startBar, bars);
    if (!evs.length) { for (let i = 0; i < bars * 16; i += 4) evs.push({ time: AudioSys.stepTime(this.startBar * 16 + i), step: this.startBar * 16 + i, midi: 64, len: 2, dur: 0.22, vel: 1 }); }
    // density: thin the phrase out for the easy cards
    let density = o.density ?? 1;
    if (this.lesson) density = 0;
    if (density === 0) {
      const keep = []; let last = -9;
      for (const e of evs) { const rel = e.step - this.startBar * 16; if (rel % 2) continue; if (e.step - last < 2) continue; keep.push(e); last = e.step; }
      evs = keep.length >= 3 ? keep : evs;
    }
    if (!this.lesson && evs.length < 3 * bars) {
      const have = new Set(evs.map(e => e.step));
      for (let i = 0; i < bars * 16; i += 4) {
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
      return { time: e.time + offset, lane: s, midi: e.midi, dur: e.dur, sustain, mine, judged: false, hit: false, holdT: 0, held: false, brokeHold: false, pop: 0 };
    };
    for (const e of evs) {
      if (call) { this.notes.push(mk(e, false, 0)); prev = -1; }
      this.notes.push(mk(e, true, call ? bars * barDur : 0));
    }
    this.notes.sort((a, b) => a.time - b.time);
    this.mine = this.notes.filter(n => n.mine);
    this.total = this.mine.length;
    if (this.lesson < 2) this.buildChant();
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
  stringRect(i) { return { x: STRUM_X - 56, y: STR_Y[i] - 18, w: W - (STRUM_X - 56), h: 36 }; }
  chantRect() { return { x: 0, y: CH_TOP - 34, w: W, h: (CH_BOT - CH_TOP) + 54 }; }
  laneFromPoint(x, y) {
    for (let i = 0; i < STRINGS; i++) { const r = this.stringRect(i); if (inRect(x, y, r.x, r.y, r.w, r.h)) return i; }
    if (y > NECK_TOP) { let best = 0; for (let i = 1; i < STRINGS; i++) if (Math.abs(y - STR_Y[i]) < Math.abs(y - STR_Y[best])) best = i; return best; }
    return -1;
  }
  laneFromKey(code) { for (let i = 0; i < STRINGS; i++) if (LANE_KEYS[i].includes(code)) return i; return -1; }
  // ------------------------------------------------------------------ input
  press(lane, at) {
    if (lane < 0 || this.done) return;
    this.strPress[lane] = 0.16;
    let best = null, bestD = 1e9;
    for (const n of this.mine) {
      if (n.judged || n.lane !== lane) continue;
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
    AudioSys.playLeadNote(n.midi, Math.max(0.16, n.dur), 0.95);
    AudioSys.sfx('strum', { vol: i === 0 ? 0.85 : 0.6 });
    if (n.sustain > 0.05) { n.held = true; this.held.set(n.lane, n); }
    Particles.spawn(STRUM_X, STR_Y[n.lane], {
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
      if (over) { this.held.delete(lane); n.held = false; continue; }
      if (!down) { this.held.delete(lane); n.held = false; n.brokeHold = true; this.combo = 0; this.health = clamp(this.health - 0.02, 0, 1); continue; }
      n.holdT += dt; this.health = clamp(this.health + dt * 0.03, 0, 1); this.score += dt * 70;
      this.strVib[lane] = Math.max(this.strVib[lane], 5);
      if (chance(dt * 16)) Particles.spawn(STRUM_X, STR_Y[lane], { n: 1, color: [STR_COL[lane]], speed: 70, life: 0.3, size: 3, sizeEnd: 0, gravity: 120 });
    }
    // ---- missed notes fall off the left edge
    const late = RATINGS[RATINGS.length - 1].win * this.windowMul;
    for (const n of this.mine) if (!n.judged && now > n.time + late) this.miss(n);
    // ---- the opponent's call plays itself
    for (const n of this.notes) {
      if (n.mine || n.judged || now < n.time) continue;
      n.judged = true; n.pop = 1;
      this.strVib[n.lane] = Math.max(this.strVib[n.lane], 5);
      this.ghostSing = 0.2;
      Particles.spawn(STRUM_X, STR_Y[n.lane], { n: 4, color: ['#7a6d8a', '#a79bb4'], speed: 90, life: 0.3, size: 3, sizeEnd: 0, gravity: 180 });
    }
    this.updateChant(dt, now);
    // ---- decay
    for (let i = 0; i < STRINGS; i++) {
      this.strPress[i] = Math.max(0, this.strPress[i] - dt);
      this.strVib[i] = Math.max(0, this.strVib[i] - dt * 20);
      this.strPhase[i] += dt * 46;
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
    this.result = r;
    if (this.o.onDone) this.o.onDone(r);
  }
  // ------------------------------------------------------------------- draw
  draw() {
    const now = Riff.now(), ctx = Gfx.ctx;
    this.drawChant(now, ctx);
    this.drawNeck(ctx);
    this.drawNotes(now, ctx);
    this.drawStrumBar(ctx);
    this.drawHud(ctx);
  }
  // --- the instrument ------------------------------------------------------
  drawNeck(ctx) {
    const bop = this.bopT * 3;
    // a slab of dark wood under a stone fretboard
    Gfx.rectA(0, NECK_TOP - 26, W, H - NECK_TOP + 26, '#120c16', 0.55);
    Gfx.rect(0, NECK_TOP - bop, W, NECK_BOT - NECK_TOP, '#3a2415');
    Gfx.rect(0, NECK_TOP - bop, W, 5, '#85562f');
    Gfx.rect(0, NECK_TOP + 5 - bop, W, 3, '#5c3a20');
    Gfx.rect(0, NECK_BOT - 8 - bop, W, 8, '#241109');
    // carved fret bars with bone inlay dots
    for (let x = STRUM_X + 92; x < W; x += 104) {
      Gfx.rectA(x, NECK_TOP + 8 - bop, 3, NECK_BOT - NECK_TOP - 18, '#c4b89a', 0.34);
      Gfx.rectA(x - 2, NECK_TOP + 8 - bop, 2, NECK_BOT - NECK_TOP - 18, '#241109', 0.5);
      Gfx.circle(x + 1, (STR_Y[1] + STR_Y[2]) / 2 - bop, 3, 'rgba(232,223,198,0.28)');
    }
    // the four strings, whipping where they were struck
    for (let i = 0; i < STRINGS; i++) {
      const y = STR_Y[i] - bop, vib = this.strVib[i], thick = 1 + (STRINGS - i) * 0.7;
      ctx.strokeStyle = this.strPress[i] > 0 ? '#ffffff' : '#a79bb4';
      ctx.lineWidth = thick;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 6) {
        // the whip is widest mid-span and pinned at the strum bar
        const d = Math.abs(x - STRUM_X), env = Math.max(0, 1 - d / 420) * Math.min(1, d / 26);
        const yy = y + Math.sin(x * 0.055 - this.strPhase[i]) * vib * env;
        x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();
      if (vib > 1) { ctx.globalAlpha = clamp(vib / 16, 0, 0.5); ctx.strokeStyle = STR_COL[i]; ctx.lineWidth = thick + 3; ctx.stroke(); ctx.globalAlpha = 1; }
    }
  }
  drawStrumBar(ctx) {
    const bop = this.bopT * 3, pulse = 0.5 + this.bopT * 0.5;
    Gfx.glow(STRUM_X, (NECK_TOP + NECK_BOT) / 2 - bop, 90 + this.flare * 70, '#ffe08a', 0.10 + this.flare * 0.22);
    Gfx.rect(STRUM_X - 7, NECK_TOP - 10 - bop, 14, NECK_BOT - NECK_TOP + 12, '#8a7f68');
    Gfx.rect(STRUM_X - 5, NECK_TOP - 10 - bop, 8, NECK_BOT - NECK_TOP + 12, '#e8dfc6');
    Gfx.rect(STRUM_X - 5, NECK_TOP - 10 - bop, 3, NECK_BOT - NECK_TOP + 12, '#fffaea');
    // bone caps
    Gfx.round(STRUM_X - 12, NECK_TOP - 22 - bop, 24, 16, 5, '#e8dfc6');
    Gfx.round(STRUM_X - 12, NECK_BOT - 2 - bop, 24, 16, 5, '#c4b89a');
    for (let i = 0; i < STRINGS; i++) {
      if (this.strPress[i] <= 0) continue;
      const k = this.strPress[i] / 0.16;
      Gfx.circle(STRUM_X, STR_Y[i] - bop, 10 + (1 - k) * 16, `rgba(255,255,255,${0.35 * k})`);
    }
    Gfx.rectA(STRUM_X - 2, NECK_TOP - 22 - bop, 4, NECK_BOT - NECK_TOP + 40, '#ffe98a', 0.25 * pulse);
  }
  drawNotes(now, ctx) {
    const bop = this.bopT * 3;
    // sustains first, so the stones sit on top of their tails
    for (const n of this.notes) {
      if (n.sustain <= 0.05 || (n.judged && n.hit === false && n.mine)) continue;
      const y = STR_Y[n.lane] - bop;
      const x0 = this.noteX(n.time, now), x1 = this.noteX(n.time + n.sustain, now);
      if (x1 < STRUM_X - 60 || x0 > W + 60) continue;
      const a = n.mine ? (n.brokeHold ? 0.18 : 0.6) : 0.22;
      const left = Math.max(x0, STRUM_X);
      Gfx.rectA(left, y - 7, Math.max(0, x1 - left), 14, STR_DIM[n.lane], a);
      Gfx.rectA(left, y - 3, Math.max(0, x1 - left), 6, STR_COL[n.lane], a * 0.9);
      if (n.held) { Gfx.circle(STRUM_X, y, 13 + Math.sin(Time.t * 30) * 3, `rgba(255,255,255,0.4)`); }
    }
    for (const n of this.notes) {
      if (n.judged && (n.hit || !n.mine)) continue;
      const x = this.noteX(n.time, now), y = STR_Y[n.lane] - bop;
      if (x < STRUM_X - 70 || x > W + 70) continue;
      this.drawRune(x, y, n.lane, n.mine ? 1 : 0.4, 1);
    }
    // the pop when a stone is struck
    for (const n of this.notes) {
      if (n.pop <= 0) continue;
      const k = 1 - n.pop, y = STR_Y[n.lane] - bop;
      ctx.globalAlpha = n.pop;
      Gfx.ring(STRUM_X, y, 12 + k * 30, STR_COL[n.lane], 3);
      ctx.globalAlpha = 1;
    }
  }
  drawRune(x, y, lane, alpha, scale) {
    const ctx = Gfx.ctx, r = NOTE_R * scale;
    ctx.globalAlpha = alpha;
    Gfx.round(x - r, y - r, r * 2, r * 2, 6, '#120c16');
    Gfx.round(x - r + 2, y - r + 2, r * 2 - 4, r * 2 - 4, 5, STR_DIM[lane]);
    Gfx.round(x - r + 2, y - r + 2, r * 2 - 4, r - 2, 5, STR_COL[lane]);
    Gfx.text(STR_RUNE[lane], x, y - 7, { color: '#120c16', align: 'center', scale: 1.3 });
    ctx.globalAlpha = 1;
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
          Gfx.ring(d.x, d.y, CH_R0 * (1 + k * 1.4), `rgba(255,233,138,${d.pop * 0.8})`, 3);
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
      Gfx.ring(q.x, q.y, CH_R0 * (1 + k * 1.8), q.col, 2);
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
    if (this.o.title) Gfx.text(this.o.title, W / 2, 18, { color: '#ffe98a', align: 'center', scale: 1.7, outline: true, outlineWidth: 2 });
    // what to press, once, while the first stones are still travelling
    const now = Riff.now();
    if (now < this.startTime + 0.9) {
      const a = clamp((this.startTime + 0.9 - now) / 0.6, 0, 1);
      ctx.globalAlpha = a;
      Gfx.text(Input.touch ? 'TAP THE STRING THE STONE LANDS ON' : 'A  S  D  F  -  ONE PER STRING',
        W / 2, NECK_TOP - 34, { color: '#ffffff', align: 'center', scale: 1.4, outline: true, outlineWidth: 2 });
      if (this.lesson) Gfx.text(this.lesson > 1 ? 'take your time - the timing is wide open' : 'a little tighter now',
        W / 2, NECK_TOP - 12, { color: '#a8e878', align: 'center', scale: 1.1, outline: true });
      ctx.globalAlpha = 1;
    }
  }
  // the old pad renderer is gone: on touch the strings themselves are the pads
  drawPads() { }
}
