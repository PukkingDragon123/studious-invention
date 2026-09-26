// ---------------------------------------------------------------------------
// audio.js - Web Audio synth engine, sequencer, sound effects
// ---------------------------------------------------------------------------
'use strict';

const NOTE_IDX = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
function noteToMidi(tok) {
  const m = /^([a-g])([#b]?)(-?\d)$/.exec(tok);
  if (!m) return null;
  let n = NOTE_IDX[m[1]]; if (m[2] === '#') n++; else if (m[2] === 'b') n--;
  return 12 * (parseInt(m[3]) + 1) + n;
}
const midiToFreq = m => 440 * Math.pow(2, (m - 69) / 12);

// Parse a pattern string into steps. Returns array of steps; each step is
// null | {notes:[midi], vel, len} . Ties '-' extend previous note length.
function parsePattern(str) {
  const toks = str.trim().split(/\s+/);
  const steps = new Array(toks.length).fill(null);
  let last = null;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t === '.') { last = null; continue; }
    if (t === '-') { if (last) last.len++; continue; }
    let vel = 1, core = t;
    if (core.endsWith('!')) { vel = 1.25; core = core.slice(0, -1); }
    else if (core.endsWith('?')) { vel = 0.55; core = core.slice(0, -1); }
    // drums
    if (core === 'x') { steps[i] = { notes: [], vel: vel, len: 1, drum: 1 }; last = steps[i]; continue; }
    if (core === 'X') { steps[i] = { notes: [], vel: 1.3 * vel, len: 1, drum: 2 }; last = steps[i]; continue; }
    if (core === 'o') { steps[i] = { notes: [], vel: 0.5 * vel, len: 1, drum: 0 }; last = steps[i]; continue; }
    const notes = core.split('+').map(noteToMidi).filter(n => n !== null);
    if (!notes.length) { console.warn('bad token', t); continue; }
    steps[i] = { notes, vel, len: 1 };
    last = steps[i];
  }
  return steps;
}

const AudioSys = {
  ctx: null, ready: false, master: null, comp: null, musicBus: null, sfxBus: null,
  reverbIn: null, noiseBuf: null,
  settings: { music: 0.8, sfx: 0.9 },
  // song state
  song: null, songId: null, songGain: null, songStart: 0, stepDur: 0.125, step: 0, nextStepTime: 0,
  timer: null, leadMutes: [], leadDelay: null, parsed: null, songVoiceCount: 0,
  intensity: 1, songBars: 8,

  init() {
    if (this.ctx) { this.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC({ latencyHint: 'interactive' });
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = 0.62;
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -18; this.comp.knee.value = 10; this.comp.ratio.value = 3.5;
    this.comp.attack.value = 0.004; this.comp.release.value = 0.18;
    // brickwall-ish limiter after the glue compressor
    this.limiter = c.createDynamicsCompressor();
    this.limiter.threshold.value = -4; this.limiter.knee.value = 0; this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.001; this.limiter.release.value = 0.08;
    this.master.connect(this.comp).connect(this.limiter).connect(c.destination);
    this.musicBus = c.createGain(); this.musicBus.gain.value = this.settings.music; this.musicBus.connect(this.master);
    this.sfxBus = c.createGain(); this.sfxBus.gain.value = this.settings.sfx; this.sfxBus.connect(this.master);
    // noise buffer
    const len = c.sampleRate * 2; this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // reverb
    const conv = c.createConvolver();
    const rl = Math.floor(c.sampleRate * 1.9); const ir = c.createBuffer(2, rl, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const dd = ir.getChannelData(ch); for (let i = 0; i < rl; i++) { const k = i / rl; dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - k, 2.6) * (i < 400 ? i / 400 : 1); } }
    conv.buffer = ir;
    this.reverbIn = c.createGain(); this.reverbIn.gain.value = 1;
    const revLP = c.createBiquadFilter(); revLP.type = 'lowpass'; revLP.frequency.value = 4200;
    this.reverbIn.connect(conv).connect(revLP).connect(this.master);
    this.ready = true;
    this.timer = setInterval(() => this.tick(), 25);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { this.resume(); this.tick(); } });
    this.resume();
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  now() { return this.ctx ? this.ctx.currentTime : 0; },
  setMusicVolume(v) { this.settings.music = v; if (this.musicBus) this.musicBus.gain.setTargetAtTime(v, this.now(), 0.05); },
  setSfxVolume(v) { this.settings.sfx = v; if (this.sfxBus) this.sfxBus.gain.value = v; },

  // --- helpers -------------------------------------------------------------
  noise(t, dur, dest) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    s.loopStart = 0; s.loopEnd = 2; s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
    if (dest) s.connect(dest);
    return s;
  },
  env(t, a, d, s, r, dur, peak = 1, dest) {
    // ADSR gain node; total note length dur (sustain until t+dur then release)
    const g = this.ctx.createGain(); const p = g.gain;
    p.setValueAtTime(0.0001, t);
    p.linearRampToValueAtTime(peak, t + a);
    const susLevel = Math.max(0.0001, peak * s);
    p.setTargetAtTime(susLevel, t + a, Math.max(0.005, d / 3));
    const end = Math.max(t + a + 0.005, t + dur);
    p.setValueAtTime(susLevel, end);
    p.setTargetAtTime(0.0001, end, Math.max(0.005, r / 4));
    if (dest) g.connect(dest);
    g._end = end + r + 0.05;
    return g;
  },
  send(node, level) { if (level > 0 && this.reverbIn) { const g = this.ctx.createGain(); g.gain.value = level; node.connect(g).connect(this.reverbIn); } },
  shaper(k) {
    const n = 1024, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
    const ws = this.ctx.createWaveShaper(); ws.curve = curve; ws.oversample = '2x'; return ws;
  },
  osc(type, freq, t, end, detune = 0) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (detune) o.detune.value = detune; o.start(t); o.stop(end); return o; },

  // --- drums ---------------------------------------------------------------
  kick(t, vel = 1, dest) {
    const c = this.ctx; dest = dest || this.musicBus;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(165, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.09);
    const g = c.createGain(); g.gain.setValueAtTime(0.9 * vel, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    const ws = this.shaper(1.5);
    o.connect(ws).connect(g).connect(dest); o.start(t); o.stop(t + 0.4);
    const ng = c.createGain(); ng.gain.setValueAtTime(0.5 * vel, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500;
    this.noise(t, 0.03, hp); hp.connect(ng).connect(dest);
  },
  snare(t, vel = 1, dest) {
    const c = this.ctx; dest = dest || this.musicBus;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 0.7;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400;
    const g = c.createGain(); g.gain.setValueAtTime(0.75 * vel, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    this.noise(t, 0.25, bp); bp.connect(hp).connect(g).connect(dest);
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(230, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.05);
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.7 * vel, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g2).connect(dest); o.start(t); o.stop(t + 0.15);
    this.send(g, 0.25);
  },
  hat(t, vel = 1, open = false, dest) {
    const c = this.ctx; dest = dest || this.musicBus;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 10000; bp.Q.value = 0.8;
    const dur = open ? 0.28 : 0.045;
    const g = c.createGain(); g.gain.setValueAtTime(0.28 * vel, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    this.noise(t, dur, hp); hp.connect(bp).connect(g).connect(dest);
  },
  tom(t, freq = 120, vel = 1, dest) {
    const c = this.ctx; dest = dest || this.musicBus;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(freq * 1.35, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.04);
    const g = c.createGain(); g.gain.setValueAtTime(0.85 * vel, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
    const ws = this.shaper(0.8);
    o.connect(ws).connect(g).connect(dest); o.start(t); o.stop(t + 0.4);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 1;
    const ng = c.createGain(); ng.gain.setValueAtTime(0.25 * vel, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    this.noise(t, 0.06, bp); bp.connect(ng).connect(dest);
    this.send(g, 0.3);
  },
  shaker(t, vel = 1, dest) {
    const c = this.ctx; dest = dest || this.musicBus;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 5500; bp.Q.value = 1.5;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.22 * vel, t + 0.012); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    this.noise(t, 0.09, bp); bp.connect(g).connect(dest);
  },
  clap(t, vel = 1, dest) {
    const c = this.ctx; dest = dest || this.musicBus;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 1.2;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    for (let i = 0; i < 3; i++) { g.gain.setValueAtTime(0.5 * vel, t + i * 0.011); g.gain.exponentialRampToValueAtTime(0.05, t + i * 0.011 + 0.01); }
    g.gain.setValueAtTime(0.5 * vel, t + 0.033); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    this.noise(t, 0.25, bp); bp.connect(g).connect(dest); this.send(g, 0.3);
  },
  stomp(t, vel = 1, dest) {
    const c = this.ctx; dest = dest || this.sfxBus;
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.25);
    const g = c.createGain(); g.gain.setValueAtTime(1.2 * vel, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(g).connect(dest); o.start(t); o.stop(t + 0.55);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
    const ng = c.createGain(); ng.gain.setValueAtTime(0.7 * vel, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    this.noise(t, 0.2, lp); lp.connect(ng).connect(dest);
  },

  // --- melodic instruments -------------------------------------------------
  // A crash: a bright noise swell with four inharmonic metal partials ringing
  // through it. Long tail, heavy on the reverb send - this is what a bar of
  // eight starts with.
  crash(t, vel = 1, dest, big = false) {
    const c = this.ctx; dest = dest || this.musicBus;
    const len = big ? 2.4 : 1.6;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.34 * vel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2600;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(12000, t); lp.frequency.exponentialRampToValueAtTime(3200, t + len);
    this.noise(t, len, hp); hp.connect(lp).connect(g).connect(dest);
    for (let i = 0; i < 4; i++) {                       // the metal itself
      const f = 520 * [1, 1.51, 2.13, 2.78][i];
      const o = this.osc('square', f, t, t + len * 0.7);
      const og = c.createGain();
      og.gain.setValueAtTime(0.03 * vel / (i + 1), t);
      og.gain.exponentialRampToValueAtTime(0.0001, t + len * 0.7);
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 12;
      o.connect(bp).connect(og).connect(dest);
    }
    this.send(g, big ? 0.5 : 0.34);
  },
  // A bone rattle: six dry ticks inside a tenth of a second.
  rattle(t, vel = 1, dest) {
    const c = this.ctx; dest = dest || this.musicBus;
    for (let i = 0; i < 6; i++) {
      const tt = t + i * 0.013;
      const g = c.createGain();
      g.gain.setValueAtTime(0.10 * vel * (1 - i * 0.12), tt);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.035);
      const bp = c.createBiquadFilter(); bp.type = 'bandpass';
      bp.frequency.value = 3800 + i * 260; bp.Q.value = 6;
      this.noise(tt, 0.04, bp); bp.connect(g).connect(dest);
    }
  },
  bass(t, midi, dur, vel = 1, dest) {
    const c = this.ctx; dest = dest || this.musicBus; const f = midiToFreq(midi);
    const end = t + dur + 0.15;
    const g = this.env(t, 0.006, 0.12, 0.7, 0.06, dur, 0.55 * vel, dest);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3;
    lp.frequency.setValueAtTime(1400 + 600 * vel, t); lp.frequency.exponentialRampToValueAtTime(260, t + 0.22);
    const o1 = this.osc('sawtooth', f, t, end); const o2 = this.osc('square', f / 2, t, end);
    const sub = c.createGain(); sub.gain.value = 0.45;
    const ws = this.shaper(0.6);
    o1.connect(lp); o2.connect(sub).connect(lp); lp.connect(ws).connect(g);
  },
  lead(t, midi, dur, vel = 1, dest, opts = {}) {
    const c = this.ctx; dest = dest || this.musicBus; const f = midiToFreq(midi);
    const end = t + dur + 0.2;
    const g = this.env(t, 0.004, 0.18, 0.72, 0.08, dur, 0.34 * vel, dest);
    const pre = c.createGain(); pre.gain.value = 2.6 * (opts.drive || 1);
    const ws = this.shaper(4);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.9;
    const pk = c.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 900; pk.gain.value = 4; pk.Q.value = 0.8;
    const o1 = this.osc('sawtooth', f, t, end, -6); const o2 = this.osc('sawtooth', f, t, end, 6);
    const o3 = this.osc('square', f / 2, t, end); const sub = c.createGain(); sub.gain.value = 0.35;
    o1.connect(pre); o2.connect(pre); o3.connect(sub).connect(pre);
    pre.connect(ws).connect(lp).connect(pk).connect(g);
    // pick transient
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
    const ng = c.createGain(); ng.gain.setValueAtTime(0.25 * vel, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    this.noise(t, 0.03, hp); hp.connect(ng).connect(dest);
    this.send(g, 0.18);
    if (this.leadDelay && dest === this.songGain) { const dg = c.createGain(); dg.gain.value = 0.35; g.connect(dg).connect(this.leadDelay); }
    if (opts.slide) { o1.frequency.setValueAtTime(f * 0.94, t); o1.frequency.exponentialRampToValueAtTime(f, t + 0.06); o2.frequency.setValueAtTime(f * 0.94, t); o2.frequency.exponentialRampToValueAtTime(f, t + 0.06); }
  },
  chord(t, midis, dur, vel = 1, dest) {
    const c = this.ctx; dest = dest || this.musicBus;
    const end = t + dur + 0.25;
    const g = this.env(t, 0.005, 0.25, 0.6, 0.12, dur, 0.26 * vel, dest);
    const pre = c.createGain(); pre.gain.value = 1.6;
    const ws = this.shaper(3.5);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; lp.Q.value = 0.7;
    for (const m of midis) { const f = midiToFreq(m); this.osc('sawtooth', f, t, end, -5).connect(pre); this.osc('sawtooth', f, t, end, 5).connect(pre); }
    pre.connect(ws).connect(lp).connect(g);
    this.send(g, 0.2);
  },
  flute(t, midi, dur, vel = 1, dest) {
    const c = this.ctx; dest = dest || this.musicBus; const f = midiToFreq(midi);
    const end = t + dur + 0.3;
    const g = this.env(t, 0.06, 0.1, 0.85, 0.16, dur, 0.34 * vel, dest);
    const o = this.osc('sine', f, t, end); const o2 = this.osc('triangle', f, t, end); const g2 = c.createGain(); g2.gain.value = 0.25;
    const lfo = this.osc('sine', 5.3, t, end); const lg = c.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.006, t + 0.25);
    lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    o.connect(lp); o2.connect(g2).connect(lp); lp.connect(g);
    // breath
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 12;
    const ng = c.createGain(); ng.gain.setValueAtTime(0.0001, t); ng.gain.linearRampToValueAtTime(0.09 * vel, t + 0.05); ng.gain.setTargetAtTime(0.0001, t + dur, 0.05);
    this.noise(t, dur + 0.2, bp); bp.connect(ng).connect(dest);
    this.send(g, 0.45);
  },
  marimba(t, midi, dur, vel = 1, dest) {
    const c = this.ctx; dest = dest || this.musicBus; const f = midiToFreq(midi);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5 * vel, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    const o = this.osc('sine', f, t, t + 0.6);
    const o2 = this.osc('sine', f * 3.93, t, t + 0.2); const g2 = c.createGain(); g2.gain.setValueAtTime(0.25 * vel, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g); o2.connect(g2).connect(dest); g.connect(dest);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2500; bp.Q.value = 1;
    const ng = c.createGain(); ng.gain.setValueAtTime(0.12 * vel, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
    this.noise(t, 0.02, bp); bp.connect(ng).connect(dest);
    this.send(g, 0.4);
  },
  pad(t, midi, dur, vel = 1, dest) {
    const c = this.ctx; dest = dest || this.musicBus; const f = midiToFreq(midi);
    const end = t + dur + 0.7;
    const g = this.env(t, 0.35, 0.3, 0.9, 0.5, dur, 0.14 * vel, dest);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(1300, t + 0.6); lp.Q.value = 1;
    for (const d of [-9, 0, 9]) this.osc('sawtooth', f, t, end, d).connect(lp);
    lp.connect(g); this.send(g, 0.6);
  },
  chant(t, midi, dur, vel = 1, dest, vowel = 'oo') {
    const c = this.ctx; dest = dest || this.musicBus; const f = midiToFreq(midi);
    const end = t + dur + 0.4;
    const formants = { oo: [[330, 8], [870, 10], [2300, 12]], ah: [[720, 6], [1220, 8], [2600, 12]], oh: [[520, 7], [1000, 9], [2500, 12]], eh: [[560, 7], [1750, 9], [2600, 12]] }[vowel] || [[330, 8], [870, 10], [2300, 12]];
    const g = this.env(t, 0.09, 0.2, 0.85, 0.22, dur, 0.7 * vel, dest);
    const src = c.createGain();
    const o1 = this.osc('sawtooth', f, t, end, -4); const o2 = this.osc('sawtooth', f, t, end, 4);
    const lfo = this.osc('sine', 4.8, t, end); const lg = c.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.008, t + 0.3); lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    o1.connect(src); o2.connect(src);
    formants.forEach(([fr, q], i) => { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr; bp.Q.value = q; const fg = c.createGain(); fg.gain.value = i === 0 ? 1 : i === 1 ? 0.7 : 0.25; src.connect(bp).connect(fg).connect(g); });
    this.send(g, 0.55);
  },
  bell(t, midi, dur, vel = 1, dest) {
    const c = this.ctx; dest = dest || this.musicBus; const f = midiToFreq(midi);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.3 * vel, t + 0.005); g.gain.exponentialRampToValueAtTime(0.001, t + Math.max(0.3, dur));
    this.osc('sine', f, t, t + dur + 0.1).connect(g);
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.12 * vel, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    this.osc('sine', f * 2.76, t, t + 0.3).connect(g2).connect(dest);
    g.connect(dest); this.send(g, 0.5);
  },
  horn(t, midi, dur, vel = 1, dest) {
    const c = this.ctx; dest = dest || this.musicBus; const f = midiToFreq(midi);
    const end = t + dur + 0.3;
    const g = this.env(t, 0.12, 0.2, 0.8, 0.25, dur, 0.3 * vel, dest);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(600, t); lp.frequency.linearRampToValueAtTime(1800, t + 0.3); lp.Q.value = 2;
    this.osc('sawtooth', f, t, end, -3).connect(lp); this.osc('sawtooth', f, t, end, 3).connect(lp); this.osc('square', f / 2, t, end).connect(lp);
    lp.connect(this.shaper(1.2)).connect(g); this.send(g, 0.5);
  },

  // --- sequencer -----------------------------------------------------------
  prepare(song) {
    const parsed = {};
    for (const [name, tr] of Object.entries(song.tracks)) {
      const steps = parsePattern(tr.pat);
      parsed[name] = { inst: tr.inst || name, steps, len: steps.length, vol: tr.vol === undefined ? 1 : tr.vol, opts: tr, lead: !!tr.lead };
    }
    return parsed;
  },
  play(id, opts = {}) {
    if (!this.ready) return;
    if (this.songId === id && !opts.restart) return;
    const song = SONGS[id]; if (!song) { console.warn('no song', id); return; }
    this.stop(opts.fade === undefined ? 0.6 : opts.fade);
    const c = this.ctx;
    this.song = song; this.songId = id; this.parsed = this.prepare(song);
    this.songBars = song.bars || Math.max(...Object.values(this.parsed).map(p => p.len)) / 16;
    this.stepDur = 60 / song.bpm / 4;
    this.songGain = c.createGain(); this.songGain.gain.setValueAtTime(0.0001, c.currentTime); this.songGain.gain.linearRampToValueAtTime(1, c.currentTime + (opts.fadeIn || 0.3));
    this.songGain.connect(this.musicBus);
    // tempo synced delay for lead
    const dl = c.createDelay(2); dl.delayTime.value = this.stepDur * 6; // dotted eighth
    const fb = c.createGain(); fb.gain.value = 0.32; const dlp = c.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 1800;
    const dout = c.createGain(); dout.gain.value = 0.6;
    dl.connect(dlp).connect(fb).connect(dl); dl.connect(dout).connect(this.songGain);
    this.leadDelay = dl;
    this.songStart = c.currentTime + 0.1; this.step = 0; this.nextStepTime = this.songStart;
    this.leadMutes = []; this.intensity = opts.intensity || 1;
    this.tick();
  },
  stop(fade = 0.5) {
    if (this.songGain) { const g = this.songGain; const t = this.now(); g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0.0001, t + fade); setTimeout(() => { try { g.disconnect(); } catch (e) { } }, fade * 1000 + 100); }
    this.song = null; this.songId = null; this.songGain = null; this.leadDelay = null; this.parsed = null;
  },
  stepTime(globalStep) {
    const sw = this.song && this.song.swing ? this.song.swing : 0;
    if (!sw) return this.songStart + globalStep * this.stepDur;
    // 'shuffle' swings the 8th-note offbeats (steps 2,6,10,14); default swings odd 16ths
    const swung = this.song.swingMode === 'shuffle' ? (globalStep % 4 === 2) : (globalStep % 2 === 1);
    return this.songStart + globalStep * this.stepDur + (swung ? sw * this.stepDur : 0);
  },
  tick() {
    if (!this.song) return;
    // when the tab is hidden, timers throttle to ~1Hz, so schedule much further ahead
    const ahead = this.ctx.currentTime + (document.hidden ? 1.6 : 0.18);
    let guard = 0;
    while (this.stepTime(this.step) < ahead && guard++ < 256) {
      this.scheduleStep(this.step, this.stepTime(this.step));
      this.step++;
    }
  },
  isLeadMuted(t) { for (const m of this.leadMutes) if (t >= m.from - 0.001 && t < m.to) return true; return false; },
  muteLead(from, to) { this.leadMutes.push({ from, to }); this.leadMutes = this.leadMutes.filter(m => m.to > this.now() - 1); },
  scheduleStep(gs, t) {
    const dest = this.songGain; const song = this.song;
    const bar = Math.floor(gs / 16) % this.songBars;
    for (const [name, tr] of Object.entries(this.parsed)) {
      if (tr.opts.minIntensity && this.intensity < tr.opts.minIntensity) continue;
      if (tr.opts.onlyBars && !tr.opts.onlyBars.includes(bar)) continue;
      if (tr.opts.skipBars && tr.opts.skipBars.includes(bar)) continue;
      const st = tr.steps[gs % tr.len];
      if (!st) continue;
      if (tr.lead && this.isLeadMuted(t)) continue;
      const vel = st.vel * tr.vol;
      const dur = st.len * this.stepDur * (tr.opts.gate || 0.9);
      this.playInst(tr.inst, t, st, dur, vel, dest, tr.opts);
    }
    if (song.onStep) song.onStep(gs, t, this);
  },
  playInst(inst, t, st, dur, vel, dest, opts = {}) {
    switch (inst) {
      case 'kick': this.kick(t, vel, dest); break;
      case 'snare': this.snare(t, vel, dest); break;
      case 'hat': this.hat(t, vel, st.drum === 2, dest); break;
      case 'shaker': this.shaker(t, vel, dest); break;
      case 'clap': this.clap(t, vel, dest); break;
      case 'stomp': this.stomp(t, vel, dest); break;
      case 'crash': this.crash(t, vel, dest, st.drum === 2); break;
      case 'rattle': this.rattle(t, vel, dest); break;
      case 'tom': if (st.notes.length) for (const n of st.notes) this.tom(t, midiToFreq(n), vel, dest); else this.tom(t, opts.freq || 120, vel, dest); break;
      case 'bass': for (const n of st.notes) this.bass(t, n, dur, vel, dest); break;
      case 'lead': for (const n of st.notes) this.lead(t, n, dur, vel, dest, opts); break;
      case 'chord': this.chord(t, st.notes, dur, vel, dest); break;
      case 'flute': for (const n of st.notes) this.flute(t, n, dur, vel, dest); break;
      case 'marimba': for (const n of st.notes) this.marimba(t, n, dur, vel, dest); break;
      case 'pad': for (const n of st.notes) this.pad(t, n, dur, vel, dest); break;
      case 'chant': for (const n of st.notes) this.chant(t, n, dur, vel, dest, opts.vowel || 'oo'); break;
      case 'bell': for (const n of st.notes) this.bell(t, n, dur, vel, dest); break;
      case 'horn': for (const n of st.notes) this.horn(t, n, dur, vel, dest); break;
    }
  },
  // --- chart support -------------------------------------------------------
  barDur() { return this.stepDur * 16; },
  beatDur() { return this.stepDur * 4; },
  currentBar() { return Math.floor((this.now() - this.songStart) / this.barDur()); },
  // absolute time of first bar boundary >= minTime, and its global bar index
  nextBar(minTime) {
    const bd = this.barDur();
    const idx = Math.max(0, Math.ceil((minTime - this.songStart) / bd));
    return { time: this.songStart + idx * bd, bar: idx };
  },
  // lead events for global bars [fromBar, fromBar+nBars)
  leadEvents(fromBar, nBars) {
    const out = [];
    if (!this.parsed) return out;
    const tr = Object.values(this.parsed).find(p => p.lead) || Object.values(this.parsed).find(p => p.inst === 'lead');
    if (!tr) return out;
    for (let gs = fromBar * 16; gs < (fromBar + nBars) * 16; gs++) {
      const st = tr.steps[gs % tr.len]; if (!st || !st.notes.length) continue;
      out.push({ time: this.stepTime(gs), step: gs, notes: st.notes.slice(), midi: st.notes[0], len: st.len, dur: st.len * this.stepDur * 0.9, vel: st.vel, sub: gs % 4 });
    }
    return out;
  },
  playLeadNote(midi, dur, vel = 1) { if (this.ready) this.lead(this.now(), midi, dur, vel, this.songGain || this.musicBus); },
  // the player's own voice, pitched wherever they are actually holding the chant
  singNow(midi, dur = 0.3, vel = 1, vowel = 'ah') { if (this.ready) this.chant(this.now(), midi, dur, vel, this.songGain || this.musicBus, vowel); },
  playChordNow(midis, dur, vel = 1) { if (this.ready) this.chord(this.now(), midis, dur, vel, this.songGain || this.musicBus); },

  // --- SFX -----------------------------------------------------------------
  sfx(name, p = {}) {
    if (!this.ready) return;
    const c = this.ctx, t = c.currentTime, d = this.sfxBus;
    const tone = (type, f0, f1, dur, vol, delay = 0, dst = d) => {
      const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t + delay); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + delay + dur);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t + delay); g.gain.linearRampToValueAtTime(vol, t + delay + 0.005); g.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
      o.connect(g).connect(dst); o.start(t + delay); o.stop(t + delay + dur + 0.05); return g;
    };
    const nz = (type, f, q, dur, vol, delay = 0, f1) => {
      const flt = c.createBiquadFilter(); flt.type = type; flt.frequency.setValueAtTime(f, t + delay); if (f1) flt.frequency.exponentialRampToValueAtTime(f1, t + delay + dur); flt.Q.value = q;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t + delay); g.gain.linearRampToValueAtTime(vol, t + delay + 0.005); g.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
      this.noise(t + delay, dur, flt); flt.connect(g).connect(d); return g;
    };
    switch (name) {
      case 'perfect': tone('sine', 1760, 2200, 0.09, 0.12); tone('sine', 2637, 2637, 0.12, 0.06, 0.03); break;
      case 'good': tone('sine', 1320, 1320, 0.06, 0.08); break;
      case 'miss': nz('lowpass', 500, 1, 0.12, 0.5); tone('sine', 140, 60, 0.15, 0.4); break;
      case 'card': nz('bandpass', 600, 1.5, 0.16, 0.35, 0, 2400); break;
      case 'draw': nz('highpass', 3000, 1, 0.04, 0.15); break;
      case 'block': nz('bandpass', 2500, 4, 0.05, 0.5); tone('sine', 320, 200, 0.08, 0.35); tone('triangle', 900, 700, 0.04, 0.2); break;
      case 'hurt': nz('lowpass', 700, 1, 0.14, 0.6); tone('sine', 130, 55, 0.2, 0.6); break;
      case 'hit': tone('sine', 220, 50, 0.12, 0.7); nz('bandpass', 1100, 1, 0.09, 0.5); break;
      case 'bighit': tone('sine', 180, 40, 0.25, 0.9); nz('lowpass', 1500, 1, 0.2, 0.7); nz('bandpass', 3000, 2, 0.06, 0.4); break;
      case 'die': { const g = tone('sawtooth', 380, 55, 0.45, 0.35); nz('lowpass', 800, 1, 0.4, 0.4); break; }
      case 'click': tone('square', 900, 900, 0.03, 0.12); break;
      case 'hover': tone('sine', 1800, 1800, 0.015, 0.05); break;
      case 'gold': tone('sine', 1900, 1900, 0.08, 0.2); tone('sine', 2500, 2500, 0.1, 0.2, 0.07); break;
      case 'heal': [523, 659, 784].forEach((f, i) => tone('sine', f, f, 0.16, 0.2, i * 0.07)); break;
      case 'relic': [880, 1109, 1319, 1760].forEach((f, i) => tone('triangle', f, f, 0.25, 0.18, i * 0.06)); break;
      case 'buff': tone('sine', 300, 900, 0.18, 0.25); tone('triangle', 450, 1350, 0.18, 0.12, 0.02); break;
      case 'debuff': tone('sawtooth', 600, 180, 0.25, 0.18); break;
      case 'roar': { const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.6 * (p.vol || 1), t + 0.08); g.gain.setTargetAtTime(0.0001, t + 0.5 * (p.len || 1), 0.15);
        const ws = this.shaper(5); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, t); lp.frequency.linearRampToValueAtTime(1500, t + 0.3); lp.frequency.linearRampToValueAtTime(300, t + 0.8);
        const f = p.pitch || 70; const o = this.osc('sawtooth', f, t, t + 1.2); o.frequency.linearRampToValueAtTime(f * 1.3, t + 0.2); o.frequency.linearRampToValueAtTime(f * 0.8, t + 0.9);
        const o2 = this.osc('square', f * 1.5, t, t + 1.2); o2.frequency.linearRampToValueAtTime(f * 1.2, t + 0.9);
        o.connect(ws); o2.connect(ws); ws.connect(lp).connect(g).connect(d); nz('bandpass', 900, 0.5, 0.7, 0.3); this.send(g, 0.5); break; }
      case 'stomp': this.stomp(t, p.vol || 1, d); break;
      case 'cheer': { for (let i = 0; i < 3; i++) { const g = nz('bandpass', 700 + i * 250, 3, 1.0, 0.12, i * 0.04); this.send(g, 0.6); } tone('sine', 600, 900, 0.5, 0.05); break; }
      case 'encore': [440, 554, 659, 880].forEach((f, i) => tone('sawtooth', f, f, 0.35, 0.1, i * 0.05)); nz('bandpass', 900, 3, 1.2, 0.15); break;
      case 'unlock': [523, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.2, 0.1, i * 0.08)); break;
      case 'whoosh': nz('bandpass', 300, 1, 0.3, 0.3, 0, 3000); break;
      case 'combo': tone('sine', 1047, 1047, 0.08, 0.15); tone('sine', 1319, 1319, 0.1, 0.15, 0.06); break;
      case 'select': tone('square', 660, 660, 0.05, 0.1); tone('square', 990, 990, 0.08, 0.1, 0.05); break;
      case 'back': tone('square', 500, 300, 0.1, 0.1); break;
      case 'error': tone('square', 200, 150, 0.15, 0.15); break;
      case 'stun': [1200, 900, 1200, 900].forEach((f, i) => tone('sine', f, f, 0.06, 0.15, i * 0.07)); break;
      case 'fire': nz('lowpass', 1200, 1, 0.5, 0.4, 0, 300); tone('sawtooth', 200, 80, 0.4, 0.15); break;
      case 'summon': tone('sine', 400, 1600, 0.4, 0.15); nz('highpass', 2000, 1, 0.3, 0.1); break;
      case 'poison': tone('sine', 700, 350, 0.3, 0.12); tone('sine', 1050, 525, 0.3, 0.08, 0.05); break;
      case 'thunder': nz('lowpass', 400, 1, 0.9, 0.8, 0, 80); tone('sine', 80, 30, 0.7, 0.6); break;
      case 'victory': [523, 659, 784, 1047, 1319].forEach((f, i) => tone('triangle', f, f, 0.35, 0.16, i * 0.09)); break;
      case 'defeat': [400, 350, 300, 200].forEach((f, i) => tone('sawtooth', f, f * 0.9, 0.4, 0.12, i * 0.25)); break;
      case 'chomp': nz('lowpass', 900, 1, 0.08, 0.6); tone('sine', 200, 70, 0.1, 0.5); tone('sine', 250, 90, 0.08, 0.4, 0.09); nz('lowpass', 900, 1, 0.08, 0.6, 0.09); break;
      case 'coinflip': tone('sine', 2400, 2400, 0.05, 0.12); tone('sine', 3200, 3200, 0.08, 0.1, 0.05); break;
      case 'cage': nz('bandpass', 1800, 6, 0.3, 0.4); tone('triangle', 400, 380, 0.3, 0.15); tone('triangle', 800, 760, 0.2, 0.1, 0.05); break;
      // ---- rebuilt game: rhythm, dialogue and world sounds -----------------
      case 'strum': nz('bandpass', 2600, 1.2, 0.055, 0.14 * (p.vol ?? 1)); tone('triangle', 520, 300, 0.07, 0.05 * (p.vol ?? 1)); break;
      case 'miss': tone('sawtooth', 190, 92, 0.16, 0.10 * (p.vol ?? 1)); nz('lowpass', 500, 0.8, 0.12, 0.06 * (p.vol ?? 1)); break;
      case 'sick': tone('sine', 1760, 2637, 0.09, 0.13); tone('sine', 2637, 3136, 0.13, 0.07, 0.03); tone('triangle', 3520, 3520, 0.06, 0.04, 0.06); break;
      case 'good': tone('sine', 1320, 1568, 0.07, 0.09); break;
      case 'ghost': nz('bandpass', 420, 2, 0.07, 0.22); tone('sine', 150, 96, 0.08, 0.18); break;
      case 'talk': tone('square', 620 + (p.pitch || 0), 700 + (p.pitch || 0), 0.022, 0.035); break;
      case 'talk_end': tone('square', 520, 640, 0.05, 0.05); break;
      case 'step': nz('bandpass', 260 + Math.random() * 120, 1.4, 0.07, 0.16, 0, 120); break;
      case 'step_grass': nz('highpass', 2200, 0.9, 0.06, 0.1); break;
      case 'thud': tone('sine', 120, 42, 0.2, 0.7); nz('lowpass', 500, 1, 0.12, 0.4); break;
      case 'rumble': { const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.6 * (p.vol || 1), t + 0.25); g.gain.setTargetAtTime(0.0001, t + (p.len || 1.1), 0.3);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 130; this.noise(t, (p.len || 1.1) + 1, lp); lp.connect(g).connect(d);
        const o = this.osc('sine', 38, t, t + (p.len || 1.1) + 1.2); o.connect(g); break; }
      case 'spray': nz('bandpass', 2600, 0.7, 0.7, 0.3, 0, 900); nz('highpass', 4000, 1, 0.5, 0.15, 0.05); break;
      case 'slurp': tone('sawtooth', 220, 900, 0.3, 0.12); nz('bandpass', 1400, 2, 0.28, 0.18); break;
      case 'burp': { const o = this.osc('sawtooth', 90, t, t + 0.42); o.frequency.linearRampToValueAtTime(56, t + 0.4);
        const lfo = this.osc('square', 26, t, t + 0.42); const lg = c.createGain(); lg.gain.value = 26; lfo.connect(lg); lg.connect(o.frequency);
        const g = c.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
        o.connect(lp).connect(g).connect(d); break; }
      case 'crunch': nz('bandpass', 1500, 1.2, 0.11, 0.5, 0, 500); tone('sine', 190, 80, 0.1, 0.3); break;
      case 'fire_whoosh': nz('bandpass', 500, 0.8, 0.55, 0.42, 0, 2600); tone('sawtooth', 160, 60, 0.45, 0.12); break;
      case 'car_start': { for (let i = 0; i < 5; i++) tone('square', 90 + i * 8, 60, 0.09, 0.2, i * 0.1); nz('lowpass', 400, 1, 0.55, 0.25); break; }
      case 'car_roll': { const g = c.createGain(); g.gain.setValueAtTime(0.22 * (p.vol || 1), t); g.gain.setTargetAtTime(0.0001, t + (p.len || 0.5), 0.2);
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 260; bp.Q.value = 1.2; this.noise(t, (p.len || 0.5) + 0.6, bp); bp.connect(g).connect(d); break; }
      case 'honk': tone('sawtooth', 240, 240, 0.28, 0.2); tone('sawtooth', 300, 300, 0.28, 0.16, 0.02); break;
      case 'pickup': [880, 1320, 1760].forEach((f, i) => tone('triangle', f, f, 0.12, 0.16, i * 0.05)); break;
      case 'rest_sfx': [523, 659, 784, 1047].forEach((f, i) => tone('sine', f, f, 0.5, 0.11, i * 0.12)); break;
      case 'stamina_low': tone('sine', 300, 200, 0.18, 0.12); tone('sine', 220, 150, 0.2, 0.1, 0.16); break;
      case 'gasp': nz('highpass', 900, 0.8, 0.28, 0.2, 0, 2600); tone('sine', 500, 900, 0.22, 0.06); break;
      case 'detect': tone('square', 880, 1320, 0.07, 0.16); tone('square', 1320, 1760, 0.09, 0.14, 0.07); break;
      case 'hide': nz('lowpass', 700, 1, 0.24, 0.2, 0, 200); break;
      case 'door': nz('lowpass', 900, 1, 0.34, 0.3, 0, 200); tone('sine', 90, 60, 0.3, 0.3); break;
      case 'card_deal': nz('bandpass', 900, 1.4, 0.13, 0.28, 0, 2800); break;
      case 'zoom_in': tone('sine', 200, 1200, 0.42, 0.1); nz('highpass', 1200, 1, 0.38, 0.07); break;
      case 'pause': tone('square', 700, 500, 0.08, 0.1); tone('square', 500, 350, 0.1, 0.08, 0.07); break;
      // ---- the board: dice, ground, and the things that live on it --------
      case 'dice_roll': for (let i = 0; i < 6; i++) { nz('bandpass', 1800 + Math.random() * 900, 3, 0.03, 0.18, i * 0.07 + Math.random() * 0.03); tone('triangle', 700 + Math.random() * 300, 500, 0.02, 0.05, i * 0.07); } break;
      case 'dice_hit': nz('bandpass', 1500 + Math.random() * 600, 2.5, 0.04, 0.3 * (p.vol ?? 1)); tone('triangle', 420 + Math.random() * 120, 260, 0.05, 0.12 * (p.vol ?? 1)); break;
      case 'dice_land': nz('bandpass', 1200, 2, 0.06, 0.32); tone('sine', 220, 140, 0.1, 0.25); tone('triangle', 880, 880, 0.05, 0.05, 0.05); break;
      case 'gem': [1568, 2093, 2637].forEach((f, i) => tone('sine', f, f * 1.01, 0.12, 0.13, i * 0.05)); nz('highpass', 5000, 1, 0.08, 0.06, 0.05); break;
      case 'splash': nz('bandpass', 900, 0.8, 0.22, 0.34, 0, 2400); nz('highpass', 3000, 1, 0.16, 0.1, 0.04); tone('sine', 300, 120, 0.12, 0.1); break;
      case 'sizzle': nz('highpass', 4200, 0.7, 0.35, 0.18); nz('bandpass', 2400, 1.5, 0.25, 0.1, 0.05); break;
      case 'squeak': tone('sine', 1400, 2200, 0.12, 0.08); tone('sine', 2100, 1600, 0.1, 0.05, 0.08); break;
      case 'eat': nz('lowpass', 900, 1, 0.07, 0.5); tone('sine', 190, 80, 0.08, 0.4); nz('lowpass', 800, 1, 0.07, 0.45, 0.12); tone('sine', 170, 70, 0.08, 0.35, 0.12); break;
      case 'spikes': nz('bandpass', 2600, 4, 0.08, 0.45); tone('square', 900, 300, 0.1, 0.12); nz('lowpass', 500, 1, 0.2, 0.4, 0.05); break;
      case 'geyser': { nz('bandpass', 400, 0.6, 0.9, 0.5, 0, 2200); nz('highpass', 2000, 1, 0.8, 0.2, 0.1); tone('sine', 90, 40, 0.6, 0.4); break; }
      case 'zap': nz('highpass', 3000, 2, 0.1, 0.35); tone('sawtooth', 1800, 200, 0.14, 0.12); tone('square', 2400, 600, 0.08, 0.08, 0.03); break;
      // ---- the opening: the knock, the tummy, the toilet ------------------
      case 'knock': for (let i = 0; i < 3; i++) { tone('sine', 130, 60, 0.12, 0.8, i * 0.26); nz('lowpass', 700, 1, 0.08, 0.6, i * 0.26); } break;
      case 'growl': { const o = this.osc('sawtooth', 70, t, t + 1.1); o.frequency.linearRampToValueAtTime(95, t + 0.3); o.frequency.linearRampToValueAtTime(52, t + 1);
        const lfo = this.osc('sine', 9, t, t + 1.1); const lg = c.createGain(); lg.gain.value = 18; lfo.connect(lg); lg.connect(o.frequency);
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.1); g.gain.exponentialRampToValueAtTime(0.001, t + 1.05);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; o.connect(lp).connect(g).connect(d); break; }
      case 'plop': tone('sine', 900, 180, 0.12, 0.35); nz('bandpass', 700, 2, 0.08, 0.2, 0.02); break;
      case 'flush': nz('bandpass', 500, 0.5, 1.3, 0.45, 0, 1800); nz('lowpass', 300, 1, 1.1, 0.3, 0.2); tone('sine', 200, 60, 1, 0.1, 0.3); break;
      case 'creak': tone('sawtooth', 180, 260, 0.35, 0.08); tone('sawtooth', 240, 150, 0.3, 0.06, 0.2); break;
      case 'sob': for (let i = 0; i < 3; i++) tone('triangle', 420 - i * 30, 300 - i * 30, 0.22, 0.12, i * 0.28); break;
      case 'gulp': tone('sine', 400, 140, 0.16, 0.3); nz('lowpass', 600, 1, 0.1, 0.2, 0.05); break;
      case 'whistle': tone('sine', 1200, 2400, 0.35, 0.1); tone('sine', 2400, 1200, 0.35, 0.08, 0.35); break;
    }
  }
};
