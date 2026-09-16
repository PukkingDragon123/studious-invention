// ---------------------------------------------------------------------------
// rhythm.js - Friday-Night-Funkin' style note field: two sides, call and
// response, arrows scrolling up to receptors, SICK/GOOD/BAD ratings, a
// tug-of-war crowd meter and a camera that bops on the beat.
// ---------------------------------------------------------------------------
'use strict';

const LANES = ['left', 'down', 'up', 'right'];
const LANE_KEYS = [
  ['ArrowLeft', 'KeyD', 'KeyA', 'Digit1'],
  ['ArrowDown', 'KeyF', 'KeyS', 'Digit2'],
  ['ArrowUp', 'KeyJ', 'KeyK', 'Digit3'],
  ['ArrowRight', 'KeyK', 'KeyL', 'Digit4'],
];
const LANE_COL = ['#e06a9b', '#2cb3a2', '#6cc95c', '#c2333c'];
const LANE_GLOW = ['#ffb0cf', '#86e8d2', '#a8e878', '#ef6a5e'];
const NOTE_W = 44, LANE_GAP = 54;

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
    this.notes = []; this.done = false; this.result = null;
    this.hits = [0, 0, 0, 0]; this.misses = 0; this.combo = 0; this.maxCombo = 0; this.score = 0;
    this.health = 0.5; this.judge = null; this.lanePress = [0, 0, 0, 0]; this.laneGlow = [0, 0, 0, 0];
    this.heldLanes = new Map(); this.history = []; this.slide = 0; this.oppSing = -1; this.selfSing = -1;
    this.bopT = 0; this.sectionMine = true;
    const diff = (typeof Settings !== 'undefined' ? Settings.difficulty : 'normal');
    const dm = diff === 'easy' ? 1.5 : diff === 'hard' ? 0.76 : 1;
    this.windowMul = dm * (o.windowMult || 1);
    this.travel = (typeof Settings !== 'undefined' ? Settings.noteSpeed : 1.15) / (o.speedMul || 1);
    this.build();
  }
  static latency() { const c = AudioSys.ctx; return c ? (c.outputLatency || 0) + (typeof Settings !== 'undefined' ? Settings.offset : 0) : 0; }
  static now() { const c = AudioSys.ctx; return c ? c.currentTime - Riff.latency() : 0; }
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
    // density: thin or thicken the phrase
    const density = o.density ?? 1;
    if (density === 0) {
      const keep = []; let last = -9;
      for (const e of evs) { const rel = e.step - this.startBar * 16; if (rel % 2) continue; if (e.step - last < 2) continue; keep.push(e); last = e.step; }
      evs = keep.length >= 3 ? keep : evs;
    }
    if (evs.length < 3 * bars) {
      const have = new Set(evs.map(e => e.step));
      for (let i = 0; i < bars * 16; i += 4) {
        const gs = this.startBar * 16 + i;
        if (!have.has(gs)) { const near = evs.length ? evs.reduce((a, b) => Math.abs(b.step - gs) < Math.abs(a.step - gs) ? b : a) : null; evs.push({ time: AudioSys.stepTime(gs), step: gs, midi: near ? near.midi : 64, len: 2, dur: 0.22, vel: 1 }); }
      }
      evs.sort((a, b) => a.step - b.step);
    }
    // lane assignment from pitch rank, with a no-repeat nudge so it plays well
    const pitches = [...new Set(evs.map(e => e.midi))].sort((a, b) => a - b);
    const laneOf = m => { const r = pitches.indexOf(m); return pitches.length <= 4 ? clamp(r, 0, 3) : clamp(Math.floor(r * 4 / pitches.length), 0, 3); };
    const barDur = AudioSys.barDur();
    let prev = -1;
    const mk = (e, mine, offset) => {
      let lane = laneOf(e.midi);
      if (lane === prev && chance(0.5)) lane = (lane + 1 + Math.floor(rnd(0, 2))) % 4;
      prev = lane;
      const sustain = e.len >= 4 ? e.len * AudioSys.stepDur * 0.8 : 0;
      return { time: e.time + offset, lane, midi: e.midi, dur: e.dur, sustain, mine, judged: false, hit: false, holdT: 0, held: false, brokeHold: false };
    };
    for (const e of evs) {
      if (call) { this.notes.push(mk(e, false, 0)); prev = -1; }
      this.notes.push(mk(e, true, call ? bars * barDur : 0));
    }
    this.notes.sort((a, b) => a.time - b.time);
    this.mine = this.notes.filter(n => n.mine);
    this.total = this.mine.length;
    AudioSys.muteLead(this.startTime - 0.02, this.endTime + 0.06);
    this.lastTime = Math.max(...this.notes.map(n => n.time + n.sustain));
    this.finishTime = Math.max(this.lastTime + 0.5, this.startTime + 0.6);
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
  // ------------------------------------------------------------------ layout
  fieldX(mine) {
    // both fields sit side by side, the player's on the right (FNF convention)
    const w = LANE_GAP * 4;
    return mine ? W / 2 + 44 : W / 2 - 44 - w;
  }
  laneX(lane, mine) { return this.fieldX(mine) + lane * LANE_GAP + LANE_GAP / 2; }
  get targetY() { return 96; }
  noteY(t, now) { return this.targetY + (t - now) / this.travel * (H - this.targetY - 40); }
  fretRect(lane) { const pad = 6, w = (W - pad * 5) / 4; return { x: pad + lane * (w + pad), y: H - 92, w, h: 86 }; }
  laneFromPoint(x, y) {
    if (Input.touch) { const f = this.fretRect(0); if (y >= f.y - 10) { for (let i = 0; i < 4; i++) { const r = this.fretRect(i); if (x >= r.x - 3 && x < r.x + r.w + 3) return i; } return -1; } }
    // clicking anywhere in a player lane column also counts
    const fx = this.fieldX(true);
    if (x >= fx && x < fx + LANE_GAP * 4) return clamp(Math.floor((x - fx) / LANE_GAP), 0, 3);
    return -1;
  }
  // ------------------------------------------------------------------- input
  laneFromKey(code) { for (let i = 0; i < 4; i++) if (LANE_KEYS[i].includes(code)) return i; return -1; }
  press(lane, at) {
    if (lane < 0 || this.done) return;
    this.lanePress[lane] = 0.14;
    let best = null, bestD = 1e9;
    for (const n of this.mine) {
      if (n.judged || n.lane !== lane) continue;
      const d = Math.abs(n.time - at);
      if (d < bestD) { bestD = d; best = n; }
      if (n.time > at + 0.2) break;
    }
    const maxWin = RATINGS[RATINGS.length - 1].win * this.windowMul;
    if (best && bestD <= maxWin) {
      let r = RATINGS[RATINGS.length - 1];
      for (const cand of RATINGS) if (bestD <= cand.win * this.windowMul) { r = cand; break; }
      this.hit(best, r, at - best.time);
    } else {
      this.history.push({ lane, j: 'ghost' });
      AudioSys.sfx('ghost');
      if (this.combo > 4) { this.combo = 0; this.setJudge('OOPS', '#7a6d8a'); }
    }
  }
  hit(n, r, diff) {
    n.judged = true; n.hit = true; n.rating = r; n.held = n.sustain > 0;
    const idx = RATINGS.indexOf(r);
    this.hits[idx]++; this.score += r.score; this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.health = clamp(this.health + r.heal, 0, 1);
    this.history.push({ lane: n.lane, j: r.name, d: +diff.toFixed(3) });
    this.setJudge(r.name + (idx === 0 ? '' : diff < -0.02 ? ' (early)' : diff > 0.02 ? ' (late)' : ''), r.col);
    this.laneGlow[n.lane] = 1;
    this.selfSing = 0.22;
    AudioSys.playLeadNote(n.midi, Math.max(0.14, n.dur), idx === 0 ? 1.05 : 0.85);
    AudioSys.sfx(idx === 0 ? 'sick' : 'good');
    const x = this.laneX(n.lane, true), y = this.targetY;
    Particles.spawn(x, y, { n: idx === 0 ? 14 : 7, color: [LANE_COL[n.lane], LANE_GLOW[n.lane], '#ffffff'], speed: 260, life: 0.4, size: 4, sizeEnd: 0, gravity: 120, world: false, shape: 'streak' });
    FX.play('fx_ring', x, y, { world: false, scale: 0.9, fps: 22 });
    if (idx === 0) Juice.punch(0.02);
    if (this.combo > 0 && this.combo % 10 === 0) { AudioSys.sfx('combo'); Popups.add(this.laneX(1.5, true), this.targetY + 90, `${this.combo} COMBO`, '#ffb0cf', { world: false, scale: 1.4, life: 0.8 }); }
    if (this.o.onNote) this.o.onNote(r, n, this);
  }
  miss(n) {
    n.judged = true; n.hit = false;
    this.misses++; this.combo = 0;
    this.health = clamp(this.health - 0.055, 0, 1);
    this.history.push({ lane: n.lane, j: 'MISS' });
    this.setJudge('MISS', '#ef6a5e');
    AudioSys.sfx('miss');
    Juice.shake(4, 0.16);
    if (this.o.onNote) this.o.onNote(null, n, this);
  }
  setJudge(text, col) { this.judge = { text, col, t: 0, life: 0.55 }; }
  // ------------------------------------------------------------------ update
  update(dt) {
    if (this.done) return;
    this.slide = Math.min(1, this.slide + dt * 4.5);
    const now = Riff.now();
    for (const k of Input.keys) { const l = this.laneFromKey(k.code); if (l >= 0) this.press(l, Riff.eventTime(k, now)); }
    for (const c of Input.clicks) { const l = this.laneFromPoint(c.x, c.y); if (l >= 0) { this.press(l, Riff.eventTime(c, now)); if (c.touch) this.heldLanes.set(c.id, l); } }
    for (const id of Input.releases) this.heldLanes.delete(id);
    const holding = l => Input.isDown(...LANE_KEYS[l]) || [...this.heldLanes.values()].includes(l) || (Input.down && this.laneFromPoint(Input.mx, Input.my) === l);
    const maxWin = RATINGS[RATINGS.length - 1].win * this.windowMul;
    for (const n of this.notes) {
      if (n.mine) {
        if (!n.judged && now > n.time + maxWin) this.miss(n);
        if (n.judged && n.hit && n.sustain > 0 && !n.brokeHold) {
          const endT = n.time + n.sustain;
          if (now < endT) {
            if (holding(n.lane)) {
              n.holdT += dt; this.laneGlow[n.lane] = 1; this.selfSing = 0.2;
              this.health = clamp(this.health + dt * 0.02, 0, 1);
              if (chance(dt * 30)) Particles.spawn(this.laneX(n.lane, true), this.targetY, { n: 1, color: [LANE_GLOW[n.lane]], speed: 90, life: 0.35, size: 3, world: false, gravity: 40 });
            } else { n.brokeHold = true; this.combo = 0; this.setJudge('DROPPED', '#ffa832'); AudioSys.sfx('miss'); }
          }
        }
      } else if (!n.judged && now >= n.time) {
        // the opponent sings their half automatically
        n.judged = true; n.hit = true;
        this.oppSing = 0.25; this.laneGlow[n.lane] = 0.6;
        AudioSys.playLeadNote(n.midi, Math.max(0.14, n.dur), 0.9);
        Particles.spawn(this.laneX(n.lane, false), this.targetY, { n: 5, color: ['#b177e6', '#ffffff'], speed: 150, life: 0.3, size: 3, world: false });
      }
    }
    for (let i = 0; i < 4; i++) { this.lanePress[i] = Math.max(0, this.lanePress[i] - dt); this.laneGlow[i] = Math.max(0, this.laneGlow[i] - dt * 4); }
    for (const l of this.heldLanes.values()) this.lanePress[l] = Math.max(this.lanePress[l], 0.06);
    if (this.judge) { this.judge.t += dt; if (this.judge.t > this.judge.life) this.judge = null; }
    this.oppSing -= dt; this.selfSing -= dt;
    // beat bop
    const beat = (now - AudioSys.songStart) / AudioSys.beatDur();
    const nb = Math.floor(beat);
    if (nb !== this._lastBeat) { this._lastBeat = nb; this.bopT = 1; }
    this.bopT = Math.max(0, this.bopT - dt * 5);
    if (now >= this.finishTime && this.notes.every(n => n.judged)) this.finish();
  }
  finish() {
    if (this.done) return; this.done = true;
    const total = this.total || 1;
    const weighted = this.hits.reduce((a, c, i) => a + c * RATINGS[i].mult, 0);
    const acc = weighted / total;
    const r = {
      sick: this.hits[0], good: this.hits[1], bad: this.hits[2], awful: this.hits[3],
      hits: this.hits.reduce((a, b) => a + b, 0), misses: this.misses, notes: total,
      maxCombo: this.maxCombo, score: this.score, health: this.health,
      acc, mult: 0.35 + acc * 1.15,
    };
    r.grade = acc >= 0.97 ? 'S+' : acc >= 0.9 ? 'S' : acc >= 0.8 ? 'A' : acc >= 0.65 ? 'B' : acc >= 0.5 ? 'C' : acc >= 0.3 ? 'D' : 'F';
    r.fc = this.misses === 0 && r.hits === total;
    this.result = r;
    if (this.o.onDone) this.o.onDone(r);
  }
  // -------------------------------------------------------------------- draw
  draw() {
    const now = Riff.now(), ctx = Gfx.ctx;
    const sl = Ease.outCubic(this.slide);
    ctx.save(); ctx.globalAlpha = sl;
    ctx.translate(0, (1 - sl) * -60);
    const bop = Ease.outCubic(this.bopT);
    // ---- receptors
    for (const mine of [false, true]) {
      if (!mine && !this.o.callResponse) continue;
      for (let i = 0; i < 4; i++) {
        const x = this.laneX(i, mine), y = this.targetY;
        const lit = mine ? (this.lanePress[i] > 0 || this.laneGlow[i] > 0.1) : this.laneGlow[i] > 0.1;
        const s = 1 + (lit ? 0.16 : 0) + bop * 0.05;
        if (lit) { ctx.globalAlpha = sl * 0.5 * (mine ? this.laneGlow[i] : 0.6); Gfx.sprite('target_' + LANES[i], x, y, { anchor: 'c', scale: s * 1.5, frame: 1, additive: true }); ctx.globalAlpha = sl; }
        Gfx.sprite('target_' + LANES[i], x, y, { anchor: 'c', scale: s, frame: lit ? 1 : 0, alpha: mine ? 1 : 0.75 });
      }
    }
    // ---- sustains then heads, player field on top
    for (const pass of [0, 1]) {
      for (const n of this.notes) {
        if (!n.mine && !this.o.callResponse) continue;
        if ((pass === 0) !== (n.sustain > 0)) continue;
        const y = this.noteY(n.time, now);
        if (y < -80 || y > H + 80) continue;
        const x = this.laneX(n.lane, n.mine);
        if (n.sustain > 0) {
          const y2 = this.noteY(n.time + n.sustain, now);
          const top = Math.min(y, y2), bot = Math.max(y, y2);
          const cut = n.hit && !n.brokeHold ? Math.max(top, this.targetY) : top;
          ctx.globalAlpha = sl * (n.judged && !n.hit ? 0.25 : n.brokeHold ? 0.3 : 0.85);
          Gfx.rect(x - 8, cut, 16, Math.max(0, bot - cut), n.mine ? LANE_COL[n.lane] : '#4d4a5c');
          Gfx.rectA(x - 8, cut, 4, Math.max(0, bot - cut), '#ffffff', 0.25);
          ctx.globalAlpha = sl;
        }
        if (n.judged && n.hit) continue;
        const a = n.judged ? 0.3 : 1;
        Gfx.sprite('note_' + LANES[n.lane], x, y, { anchor: 'c', alpha: a * (n.mine ? 1 : 0.8), scale: n.mine ? 1 : 0.86, tint: n.judged ? '#120c16' : null, tintAmount: 0.6 });
      }
    }
    // ---- judgement + combo
    if (this.judge) {
      const k = this.judge.t / this.judge.life;
      const s = 1.6 * (k < 0.16 ? Ease.outBack(k / 0.16) : 1);
      ctx.globalAlpha = sl * (k > 0.7 ? (1 - k) / 0.3 : 1);
      Gfx.text(this.judge.text, this.laneX(1.5, true), this.targetY + 150, { color: this.judge.col, align: 'center', scale: s, outline: true, outlineWidth: 2 });
    }
    ctx.globalAlpha = sl;
    if (this.combo >= 3) {
      const cx = this.laneX(1.5, true);
      Gfx.text(String(this.combo), cx, this.targetY + 196, { color: '#ffb0cf', align: 'center', scale: 2.4 + bop * 0.3, outline: true, outlineWidth: 2 });
      Gfx.text('COMBO', cx, this.targetY + 226, { color: '#e06a9b', align: 'center', scale: 1, outline: true });
    }
    // ---- crowd meter (tug of war)
    const mw = 420, mx = (W - mw) / 2, my = this.targetY - 46;
    Gfx.rect(mx - 3, my - 3, mw + 6, 20, '#120c16');
    Gfx.rect(mx, my, mw, 14, '#7c3eb2');
    Gfx.rect(mx, my, Math.round(mw * (1 - this.health)), 14, '#3b3048');
    const hx = mx + mw * (1 - this.health);
    Gfx.rect(hx - 2, my - 4, 4, 22, '#fffaea');
    Gfx.sprite('icon_skull', mx + 8, my + 7, { anchor: 'c', scale: 0.8 });
    Gfx.sprite('icon_star', mx + mw - 10, my + 7, { anchor: 'c', scale: 0.8 });
    Gfx.text('CROWD', W / 2, my - 16, { color: '#b177e6', align: 'center', scale: 1, outline: true });
    // ---- title + progress
    const prog = clamp((now - this.startTime) / (this.endTime - this.startTime), 0, 1);
    Gfx.text(this.o.title || 'RIFF', W / 2, 18, { color: '#ffe98a', align: 'center', scale: 1.6, outline: true, outlineWidth: 2 });
    Gfx.bar(W / 2 - 120, 44, 240, 6, prog, '#ffe98a', { bg: '#241c2e' });
    // ---- count in
    if (now < this.mine[0]?.time - this.travel * 0.5) {
      const beats = Math.ceil((this.startTime - now) / AudioSys.beatDur());
      if (beats > 0 && beats <= 4) Gfx.text(String(beats), W / 2, H / 2 - 40, { color: '#ffffff', align: 'center', scale: 5, outline: true, outlineWidth: 2 });
      else if (beats <= 0) Gfx.text('GO!', W / 2, H / 2 - 40, { color: '#a8e878', align: 'center', scale: 5, outline: true, outlineWidth: 2 });
    }
    ctx.restore();
    if (Input.touch) this.drawPads();
  }
  drawPads() {
    Gfx.rectA(0, H - 100, W, 100, '#120c16', 0.9);
    for (let i = 0; i < 4; i++) {
      const r = this.fretRect(i), p = this.lanePress[i] > 0;
      Gfx.round(r.x, r.y, r.w, r.h, 6, '#120c16');
      Gfx.round(r.x + 3, r.y + 3, r.w - 6, r.h - 6, 5, p ? LANE_COL[i] : '#241c2e');
      Gfx.outlineRound(r.x + 1, r.y + 1, r.w - 2, r.h - 2, 5, p ? '#ffffff' : LANE_COL[i]);
      Gfx.sprite('note_' + LANES[i], r.x + r.w / 2, r.y + r.h / 2, { anchor: 'c', scale: p ? 1.25 : 1.05, alpha: p ? 1 : 0.9 });
    }
  }
}
