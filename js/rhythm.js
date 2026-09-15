// ---------------------------------------------------------------------------
// rhythm.js - Guitar Hero style riff mini-game, synced to the song clock
// ---------------------------------------------------------------------------
'use strict';

const LANE_KEYS = [
  ['KeyD', 'ArrowLeft', 'Digit1', 'Numpad1'],
  ['KeyF', 'ArrowDown', 'Digit2', 'Numpad2'],
  ['KeyJ', 'ArrowUp', 'Digit3', 'Numpad3'],
  ['KeyK', 'ArrowRight', 'Digit4', 'Numpad4'],
];
const LANE_LABELS = ['D', 'F', 'J', 'K'];
const LANE_GEMS = ['gem_g', 'gem_r', 'gem_y', 'gem_b'];
const LANE_COLORS = ['#5cb84a', '#d83a3a', '#f6d743', '#3b82f6'];

class Riff {
  // opts: {bars, density, title, windowMult, act, encore, onNote(j, note), onDone(result)}
  constructor(opts) {
    this.o = opts;
    this.notes = []; this.done = false; this.started = false;
    this.perfects = 0; this.goods = 0; this.misses = 0; this.combo = 0; this.maxCombo = 0;
    this.effects = []; this.judgeText = null; this.lanePress = [0, 0, 0, 0]; this.history = [];
    this.travel = (typeof Settings !== 'undefined' ? Settings.noteSpeed : 1.3);
    const diff = (typeof Settings !== 'undefined' ? Settings.difficulty : 'normal');
    const dm = diff === 'easy' ? 1.45 : diff === 'hard' ? 0.75 : 1;
    this.wPerfect = 0.065 * dm * (opts.windowMult || 1);
    this.wGood = 0.14 * dm * (opts.windowMult || 1);
    this.slide = 0; // 0..1 board slide-in
    this.build();
  }
  static heardNow() {
    const c = AudioSys.ctx; if (!c) return 0;
    const lat = (c.outputLatency || 0) + (typeof Settings !== 'undefined' ? Settings.offset : 0);
    return c.currentTime - lat;
  }
  build() {
    const o = this.o;
    const now = AudioSys.now();
    const bars = o.bars || 1;
    if (!AudioSys.song) { // no music: synthesize a fallback chart on a 120bpm grid
      AudioSys.songStart = now; AudioSys.stepDur = 0.125;
    }
    const nb = AudioSys.nextBar(now + this.travel + 0.35);
    this.startTime = nb.time; this.startBar = nb.bar;
    this.endTime = this.startTime + bars * AudioSys.barDur();
    let evs;
    if (o.encore) {
      const steps = parsePattern(ENCORE_RIFFS[o.act] || ENCORE_RIFFS[1]);
      evs = [];
      for (let i = 0; i < steps.length && i < bars * 16; i++) { const st = steps[i]; if (!st || !st.notes.length) continue; evs.push({ time: AudioSys.stepTime(this.startBar * 16 + i), step: this.startBar * 16 + i, notes: st.notes.slice(), midi: st.notes[0], len: st.len, dur: st.len * AudioSys.stepDur * 0.9, vel: st.vel, sub: i % 4 }); }
    } else {
      evs = AudioSys.leadEvents(this.startBar, bars);
    }
    if (!evs.length) { // fallback grid
      for (let i = 0; i < bars * 16; i += 4) evs.push({ time: AudioSys.stepTime(this.startBar * 16 + i), step: this.startBar * 16 + i, notes: [64], midi: 64, len: 2, dur: 0.2, vel: 1, sub: 0 });
    }
    // density filtering
    const density = o.density === undefined ? 1 : o.density;
    if (density === 0) {
      const kept = []; let lastStep = -99;
      for (const e of evs) { const rel = e.step - this.startBar * 16; if (rel % 2 !== 0) continue; if (e.step - lastStep < 2) continue; kept.push(e); lastStep = e.step; }
      // thin to ~6 per bar
      while (kept.length > 6 * bars) { let idx = -1; for (let i = 1; i < kept.length; i += 2) { if ((kept[i].step - this.startBar * 16) % 4 !== 0) { idx = i; break; } } if (idx < 0) idx = kept.length - 2; kept.splice(idx, 1); }
      evs = kept;
    }
    // ensure minimum notes
    if (evs.length < 3 * bars) {
      const have = new Set(evs.map(e => e.step));
      for (let i = 0; i < bars * 16; i += 4) { const gs = this.startBar * 16 + i; if (!have.has(gs)) { const near = evs.length ? evs.reduce((a, b) => Math.abs(b.step - gs) < Math.abs(a.step - gs) ? b : a) : null; evs.push({ time: AudioSys.stepTime(gs), step: gs, notes: near ? near.notes : [64], midi: near ? near.midi : 64, len: 2, dur: 0.2, vel: 1, sub: 0 }); } }
      evs.sort((a, b) => a.step - b.step);
    }
    // lane assignment by pitch rank
    const pitches = [...new Set(evs.map(e => e.midi))].sort((a, b) => a - b);
    const laneOf = m => {
      const r = pitches.indexOf(m);
      if (pitches.length <= 4) return clamp(r + (pitches.length < 4 ? Math.floor((4 - pitches.length) / 2) : 0), 0, 3);
      return clamp(Math.floor(r * 4 / pitches.length), 0, 3);
    };
    this.notes = [];
    for (const e of evs) {
      const lane = laneOf(e.midi);
      this.notes.push({ time: e.time, lane, midi: e.midi, dur: e.dur, vel: e.vel, hit: false, judged: false, j: null, step: e.step });
      if (density === 2 && (e.step - this.startBar * 16) % 8 === 0 && e.notes) {
        // chord: extra lane on accents
        const lane2 = lane <= 1 ? lane + 2 : lane - 2;
        this.notes.push({ time: e.time, lane: lane2, midi: e.midi + (lane2 > lane ? 7 : -5), dur: e.dur, vel: e.vel, hit: false, judged: false, j: null, step: e.step, chord: true });
      }
    }
    this.notes.sort((a, b) => a.time - b.time || a.lane - b.lane);
    this.total = this.notes.length;
    // mute auto lead during chart
    AudioSys.muteLead(this.startTime - 0.02, this.endTime + 0.05);
    this.lastNoteTime = this.notes.length ? this.notes[this.notes.length - 1].time : this.endTime;
    this.finishTime = Math.max(this.lastNoteTime + 0.45, this.startTime + 0.5);
  }
  // Input processing ---------------------------------------------------------
  laneFromKey(code) { for (let i = 0; i < 4; i++) if (LANE_KEYS[i].includes(code)) return i; return -1; }
  laneFromPoint(x, y) {
    const g = this.geom(); if (y < g.top - 10 || y > g.bottom + 30) return -1;
    const p = clamp((y - g.top) / (g.bottom - g.top), 0, 1);
    const half = lerp(g.topW, g.botW, p) / 2;
    const rel = (x - g.cx + half) / (half * 2);
    if (rel < 0 || rel >= 1) return -1;
    return Math.floor(rel * 4);
  }
  press(lane, at) {
    if (lane < 0 || this.done) return;
    this.lanePress[lane] = 0.12;
    // find nearest unjudged note in lane within good window
    let best = null, bestD = 1e9;
    for (const n of this.notes) { if (n.judged || n.lane !== lane) continue; const d = Math.abs(n.time - at); if (d < bestD) { bestD = d; best = n; } if (n.time > at + this.wGood) break; }
    if (best && bestD <= this.wGood) {
      const j = bestD <= this.wPerfect ? 'perfect' : 'good';
      this.judge(best, j, at - best.time);
    } else {
      // stray strum: plays a muted note, no penalty except combo break
      this.history.push({ lane, j: 'stray', d: best ? +(at - best.time).toFixed(3) : null });
      AudioSys.sfx('miss'); if (this.combo > 0) { this.combo = 0; this.judgeText = { t: 'OOPS', c: '#a89aa8', life: 0.4 }; }
    }
  }
  judge(n, j, diff) {
    n.judged = true; n.j = j; n.hit = j !== 'miss'; n.hitAt = Riff.heardNow(); this.history.push({ lane: n.lane, j, d: +diff.toFixed(3) });
    if (j === 'miss') { this.misses++; this.combo = 0; this.judgeText = { t: 'MISS', c: '#ff6b6b', life: 0.5 }; AudioSys.sfx('miss'); }
    else {
      if (j === 'perfect') this.perfects++; else this.goods++;
      this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
      AudioSys.playLeadNote(n.midi, Math.max(0.12, n.dur), j === 'perfect' ? 1.05 : 0.85);
      if (j === 'perfect') AudioSys.sfx('perfect'); else AudioSys.sfx('good');
      const early = diff < -0.02 ? ' (early)' : diff > 0.02 ? ' (late)' : '';
      this.judgeText = { t: j === 'perfect' ? 'PERFECT!' : 'GOOD' + early, c: j === 'perfect' ? '#f6d743' : '#a3e04a', life: 0.5 };
      const g = this.geom(); const x = this.laneX(n.lane, 1);
      Particles.spawn(x, g.bottom, { n: j === 'perfect' ? 14 : 7, color: [LANE_COLORS[n.lane], '#ffffff', '#f6d743'], speed: 140, life: 0.5, gravity: 200, size: 3 });
      this.effects.push({ x, y: g.bottom, t: 0, lane: n.lane, perfect: j === 'perfect' });
      if (this.combo > 0 && this.combo % 10 === 0) { AudioSys.sfx('combo'); Popups.add(g.cx + 130, g.top + 40, `${this.combo} COMBO!`, '#f5a3c7', { scale: 1 }); }
    }
    if (this.o.onNote) this.o.onNote(j, n, this);
  }
  update(dt) {
    if (this.done) return;
    this.slide = Math.min(1, this.slide + dt * 4);
    const now = Riff.heardNow();
    // keys
    for (const k of Input.keys) { const lane = this.laneFromKey(k.code); if (lane >= 0) { const at = k.at ? k.at - ((AudioSys.ctx.outputLatency || 0) + (typeof Settings !== 'undefined' ? Settings.offset : 0)) : now; this.press(lane, at); } }
    for (const c of Input.clicks) { const lane = this.laneFromPoint(c.x, c.y); if (lane >= 0) this.press(lane, now); }
    // auto-miss
    for (const n of this.notes) { if (!n.judged && now > n.time + this.wGood) this.judge(n, 'miss', 0); }
    for (let i = 0; i < 4; i++) this.lanePress[i] = Math.max(0, this.lanePress[i] - dt);
    for (let i = this.effects.length - 1; i >= 0; i--) { this.effects[i].t += dt; if (this.effects[i].t > 0.35) this.effects.splice(i, 1); }
    if (this.judgeText) { this.judgeText.life -= dt; if (this.judgeText.life <= 0) this.judgeText = null; }
    if (now >= this.finishTime && this.notes.every(n => n.judged)) this.finish();
  }
  finish() {
    if (this.done) return; this.done = true;
    const total = this.total || 1;
    const score = this.perfects * 1.5 + this.goods;
    const res = { perfects: this.perfects, goods: this.goods, misses: this.misses, notes: total, maxCombo: this.maxCombo, mult: score / total, acc: (this.perfects + this.goods) / total, score };
    res.grade = res.mult >= 1.45 ? 'S' : res.mult >= 1.25 ? 'A' : res.mult >= 1.0 ? 'B' : res.mult >= 0.7 ? 'C' : res.mult >= 0.4 ? 'D' : 'F';
    this.result = res;
    if (this.o.onDone) this.o.onDone(res);
  }
  // Geometry -----------------------------------------------------------------
  geom() { return { cx: 320, top: 92, bottom: 306, topW: 96, botW: 228 }; }
  laneX(lane, p) { const g = this.geom(); const w = lerp(g.topW, g.botW, p); return g.cx - w / 2 + (lane + 0.5) * (w / 4); }
  // Drawing -------------------------------------------------------------------
  draw() {
    const g = this.geom(); const ctx = Gfx.ctx; const now = Riff.heardNow();
    const sl = easeOut(this.slide); const yOff = (1 - sl) * 260;
    ctx.save(); ctx.translate(0, yOff);
    // board polygon
    ctx.globalAlpha = 0.86;
    ctx.fillStyle = '#12101a'; ctx.beginPath(); ctx.moveTo(g.cx - g.topW / 2 - 6, g.top - 22); ctx.lineTo(g.cx + g.topW / 2 + 6, g.top - 22); ctx.lineTo(g.cx + g.botW / 2 + 10, g.bottom + 30); ctx.lineTo(g.cx - g.botW / 2 - 10, g.bottom + 30); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    // lanes
    for (let i = 0; i < 4; i++) {
      const x0t = this.laneX(i, 0) - g.topW / 8, x1t = this.laneX(i, 0) + g.topW / 8;
      const x0b = this.laneX(i, 1) - g.botW / 8, x1b = this.laneX(i, 1) + g.botW / 8;
      ctx.fillStyle = i % 2 ? '#1a1626' : '#1e1a2c';
      if (this.lanePress[i] > 0) ctx.fillStyle = '#3a3050';
      ctx.beginPath(); ctx.moveTo(x0t, g.top); ctx.lineTo(x1t, g.top); ctx.lineTo(x1b, g.bottom + 14); ctx.lineTo(x0b, g.bottom + 14); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#3a2c3f'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0t, g.top); ctx.lineTo(x0b, g.bottom + 14); ctx.stroke();
    }
    ctx.strokeStyle = '#3a2c3f'; ctx.beginPath(); ctx.moveTo(this.laneX(3, 0) + g.topW / 8, g.top); ctx.lineTo(this.laneX(3, 1) + g.botW / 8, g.bottom + 14); ctx.stroke();
    // beat lines
    const bd = AudioSys.beatDur();
    for (let t = Math.ceil((now) / bd) * bd; t < now + this.travel; t += bd) {
      const p = 1 - (t - now) / this.travel; if (p < 0 || p > 1) continue;
      const y = lerp(g.top, g.bottom, p); const w = lerp(g.topW, g.botW, p);
      const isBar = Math.abs(((t - AudioSys.songStart) / bd) % 4) < 0.01;
      Gfx.rectA(g.cx - w / 2, y, w, 1, isBar ? '#a89aa8' : '#55555f', isBar ? 0.6 : 0.4);
    }
    // hit line (bone bar)
    Gfx.rect(g.cx - g.botW / 2 - 8, g.bottom - 3, g.botW + 16, 7, '#c9bc90'); Gfx.rect(g.cx - g.botW / 2 - 8, g.bottom - 3, g.botW + 16, 2, '#f5eed3');
    Gfx.rect(g.cx - g.botW / 2 - 12, g.bottom - 6, 6, 12, '#f5eed3'); Gfx.rect(g.cx + g.botW / 2 + 6, g.bottom - 6, 6, 12, '#f5eed3');
    // lane targets + labels
    for (let i = 0; i < 4; i++) {
      const x = this.laneX(i, 1);
      const pressed = this.lanePress[i] > 0;
      Gfx.sprite(LANE_GEMS[i], x, g.bottom, { anchor: 'c', scale: pressed ? 1.6 : 1.3, alpha: pressed ? 1 : 0.45 });
      Gfx.text(LANE_LABELS[i], x, g.bottom + 17, { color: LANE_COLORS[i], align: 'center', outline: true });
    }
    // notes
    for (const n of this.notes) {
      if (n.judged && n.hit) continue;
      const p = 1 - (n.time - now) / this.travel;
      if (p < -0.05 || p > 1.25) continue;
      const x = this.laneX(n.lane, clamp(p, 0, 1)); const y = lerp(g.top, g.bottom, p);
      const sc = lerp(0.7, 1.5, clamp(p, 0, 1));
      if (n.judged && !n.hit) { Gfx.sprite(LANE_GEMS[n.lane], x, y, { anchor: 'c', scale: sc, alpha: 0.3, tint: '#000' }); continue; }
      // sustain tail
      if (n.dur > 0.3) { const p2 = 1 - (n.time + n.dur - now) / this.travel; const y2 = lerp(g.top, g.bottom, clamp(p2, 0, 1)); if (y2 < y) Gfx.rectA(x - 2, y2, 4, y - y2, LANE_COLORS[n.lane], 0.5); }
      Gfx.sprite(LANE_GEMS[n.lane], x, y, { anchor: 'c', scale: sc });
      if (n.chord) Gfx.outline(x - 6 * sc, y - 6 * sc, 12 * sc, 12 * sc, '#fff');
    }
    // hit effects
    for (const e of this.effects) { const k = e.t / 0.35; const r = 8 + k * 22; ctx.globalAlpha = 1 - k; ctx.strokeStyle = e.perfect ? '#f6d743' : LANE_COLORS[e.lane]; ctx.lineWidth = 3 - 2 * k; ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
    // header
    Gfx.panel(g.cx - 70, g.top - 40, 140, 16, { fill: '#2a2030', border: '#f6d743', shadow: false });
    Gfx.text((this.o.title || 'RIFF') + ' ♪', g.cx, g.top - 36, { color: '#f6d743', align: 'center' });
    // progress
    const judged = this.notes.filter(n => n.judged).length;
    Gfx.bar(g.cx - 60, g.top - 21, 120, 5, judged / Math.max(1, this.total), '#f5a3c7', '#16101c');
    // judgement text
    if (this.judgeText) { const k = 1 - this.judgeText.life / 0.5; Gfx.text(this.judgeText.t, g.cx, g.bottom - 60 - k * 10, { color: this.judgeText.c, align: 'center', scale: 2, outline: true }); }
    // combo
    if (this.combo >= 2) { Gfx.text(`${this.combo}`, g.cx + g.botW / 2 + 30, g.bottom - 70, { color: '#f5a3c7', align: 'center', scale: 3, outline: true }); Gfx.text('COMBO', g.cx + g.botW / 2 + 30, g.bottom - 46, { color: '#f5a3c7', align: 'center', outline: true }); }
    // get ready
    if (now < this.notes[0].time - this.travel * 0.55 && !this.notes.some(n => n.judged)) {
      const beats = Math.ceil((this.startTime - now) / bd);
      Gfx.text(beats > 4 ? 'GET READY...' : beats > 0 ? String(beats) : 'GO!', g.cx, g.top + 60, { color: '#ffffff', align: 'center', scale: 2, outline: true });
    }
    // stats
    Gfx.text(`P ${this.perfects}  G ${this.goods}  M ${this.misses}`, g.cx - g.botW / 2 - 30, g.top + 10, { color: '#a89aa8', align: 'right' });
    ctx.restore();
  }
}
