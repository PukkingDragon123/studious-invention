// ---------------------------------------------------------------------------
// dialogue.js - speech bubbles with tails, typewriter text, portraits, choices
// Usage:  yield* Dialogue.say('VELA', 'Breakfast!', { at: velaActor })
//         const i = yield* Dialogue.choose('Well?', ['Fight', 'Run'])
// ---------------------------------------------------------------------------
'use strict';

const SPEAKER_STYLE = {
  BRONK: { fill: '#fffaea', name: '#a05a30', portrait: 'bronk_idle' },
  VELA: { fill: '#fff0f4', name: '#a03a68', portrait: 'vela_idle' },
  PEBBLE: { fill: '#f2fff0', name: '#27632f', portrait: 'kid_a_idle' },
  ROXY: { fill: '#f0fbff', name: '#18706a', portrait: 'kid_b_idle' },
  BLAZE: { fill: '#2a1410', name: '#ffa832', text: '#ffe08a', portrait: 'blaze_idle' },
  ELDER: { fill: '#f6f0ff', name: '#4b2070', portrait: 'elder_idle' },
  MAMMOTH: { fill: '#fff6e6', name: '#85562f', portrait: 'mammoth_trader', portraitDX: -52 },
  'GRANDMA REX': { fill: '#f6f0ff', name: '#7c3eb2', portrait: 'grandma_idle' },
  HORACE: { fill: '#f0fff0', name: '#27632f', portrait: 'tricera_idle' },
  'TAR KING': { fill: '#1a1420', name: '#b177e6', text: '#e8dfc6', portrait: 'tarblob_idle' },
  'THE TAR KING': { fill: '#1a1420', name: '#b177e6', text: '#e8dfc6', portrait: 'tarblob_idle' },
  REXMOND: { fill: '#fff0e8', name: '#9c3510', portrait: 'trex_idle' },
  '': { fill: '#fffaea', name: '#3b3048' },
};

const Dialogue = {
  active: null, queue: [],
  // core generator: shows one bubble and waits for the player to advance it
  *say(speaker, text, o = {}) {
    const st = SPEAKER_STYLE[speaker] || SPEAKER_STYLE[''];
    const b = {
      speaker, text, o, st, chars: 0, done: false, t: 0,
      at: o.at || null, x: o.x, y: o.y, choices: o.choices || null, choice: -1, hover: -1, pop: 0,
      portrait: o.portrait === false ? null : (o.portrait || st.portrait),
      portraitDX: o.portraitDX ?? st.portraitDX ?? 0,
      shake: o.shake || 0, speed: o.speed || 48, auto: o.auto,
    };
    this.active = b;
    let waited = 0;
    const pitch = { BRONK: -120, VELA: 120, PEBBLE: 260, ROXY: 300, BLAZE: -200, ELDER: -80, MAMMOTH: -170, 'GRANDMA REX': -260, HORACE: -230, 'TAR KING': -300, 'THE TAR KING': -300, REXMOND: -250 }[speaker] || 0;
    while (true) {
      yield 0;
      b.t += Time.dt; waited += Time.dt;
      b.pop = Math.min(1, (b.pop || 0) + Time.dt * 7);
      const was = Math.floor(b.chars);
      b.chars = Math.min(text.length, b.chars + Time.dt * b.speed * (Input.down ? 3 : 1));
      b.rev = b.rev || [];
      for (let i = was; i < Math.floor(b.chars); i++) b.rev[i] = b.t;
      // one blip every few letters, skipping spaces, so speech has a voice
      if (Math.floor(b.chars) > was && Math.floor(b.chars) % 3 === 0 && text[Math.floor(b.chars) - 1] !== ' ')
        AudioSys.sfx('talk', { pitch: pitch + (text.charCodeAt(Math.floor(b.chars) - 1) % 40) });
      const full = b.chars >= text.length;
      if (b.choices) { if (b.choice >= 0) break; continue; }
      if (b.auto && full && waited > b.auto) break;
      if ((Input.clicks.length || Input.pressed('Space', 'Enter', 'KeyE', 'KeyZ')) && waited > 0.12) {
        if (!full) { b.chars = text.length; waited = 0; }
        else break;
      }
    }
    const chosen = b.choice;
    this.ghost = { b, t: 0 };
    this.active = null;
    AudioSys.sfx('talk_end');
    return chosen;
  },
  *choose(speaker, text, choices, o = {}) {
    return yield* this.say(speaker, text, Object.assign({}, o, { choices }));
  },
  // a floating one-liner that does not block: use for ambient village chatter
  float(actor, text, life = 2.6) { Floaters.add(actor, text, life); },
  update() {
    const b = this.active; if (!b) return;
    if (b.choices) {
      const L = this.layout(b);
      for (let i = 0; i < b.choices.length; i++) {
        const r = L.choiceRects[i];
        if (UI.hit(r.x, r.y, r.w, r.h, () => { b.choice = i; AudioSys.sfx('select'); })) b.hover = i;
      }
      if (Input.pressed('Digit1')) b.choice = 0;
      if (Input.pressed('Digit2') && b.choices.length > 1) b.choice = 1;
      if (Input.pressed('Digit3') && b.choices.length > 2) b.choice = 2;
    }
  },
  // Big, plain bubbles: white, a thick ink line, the name in its colour on
  // top, and the words at twice the size of the interface text. Shouting gets
  // a spiky bubble, and any word in capitals wobbles.
  shouting(b) {
    if (b.o.shout !== undefined) return b.o.shout;
    const L = b.text.replace(/\{[^}]*\}/g, '').replace(/[^A-Za-z]/g, '');
    return L.length > 3 && L.replace(/[^A-Z]/g, '').length / L.length > 0.7;
  },
  layout(b) {
    const scale = b.o.scale || 2, narr = !b.at;
    const maxW = b.o.width || (narr ? 760 : 470), pad = 16;
    const lines = Gfx.wrap(b.text, maxW - pad * 2, scale);
    const lh = Gfx.lineHeight(scale) - 2 * scale + 2;
    const widest = Math.max(...lines.map(l => Gfx.measure(l.replace(/\{[^}]*\}/g, ''), scale)));
    const nameH = b.speaker ? 16 : 0;
    const textW = Math.max(narr ? 300 : 150, Math.min(maxW, widest + pad * 2, maxW), b.speaker ? Gfx.measure(b.speaker, 1) + pad * 2 : 0);
    let h = nameH + lines.length * lh + pad * 2 + 4;
    const choiceH = 36;
    if (b.choices) h += b.choices.length * (choiceH + 6) + 4;
    let tx, ty, x, y;
    if (b.at) {
      const p = Game.worldToScreen ? Game.worldToScreen(b.at.x, b.at.top ?? b.at.y) : { x: b.at.x, y: b.at.y };
      tx = clamp(p.x, 40, W - 40); ty = clamp(p.y - 8, 70, H - 20);
      x = clamp(tx - textW / 2, 12, W - textW - 12);
      y = clamp(ty - h - 26, 10, H - h - 70);
      if (ty < y + h + 8) ty = y + h + 14;         // a speaker under the top edge still gets a tail
    } else {
      x = b.x ?? (W - textW) / 2; y = b.y ?? (H - h - 66);
      tx = null; ty = null;
    }
    const choiceRects = [];
    if (b.choices) {
      let cy = y + pad + nameH + lines.length * lh;
      for (let i = 0; i < b.choices.length; i++) { choiceRects.push({ x: x + 12, y: cy, w: textW - 24, h: choiceH }); cy += choiceH + 6; }
    }
    return { x, y, w: textW, h, tx, ty, lines, lh, scale, choiceRects, pad, nameH, narr };
  },
  // one line of speech; words in capitals bounce
  line(str, x, y, scale, o, b, ci, kind) {
    let cx = x;
    const t = b.t, rev = b.rev || [];
    for (const seg of Gfx.richSegs(str, o)) {
      for (const word of seg.t.split(/(\s+)/)) {
        if (!word) continue;
        const loud = kind === 'shout' || kind === 'angry' || (/[A-Z]{2}/.test(word) && word === word.toUpperCase());
        for (const ch of word) {
          const age = t - (rev[ci] ?? -9), k = clamp(age / 0.12, 0, 1);
          let dy = -(1 - Ease.outBack(k)) * 6 * (1 - k);
          if (loud) dy += Math.round(Math.sin(t * 13 + ci * 0.9) * 1.6);
          if (kind === 'scared') dy += Math.round(Math.sin(t * 31 + ci * 2.3) * 0.8);
          if (kind === 'sad') dy += Math.round(Math.sin(t * 2 + ci * 0.4) * 1);
          if (ch !== ' ') Gfx.text(ch, cx, y + dy, { color: seg.c, scale });
          cx += Gfx.measure(ch, scale); ci++;
        }
      }
    }
    return ci;
  },
  spiky(x, y, w, h, fill, edge) {
    const ctx = Gfx.ctx, cx = x + w / 2, cy = y + h / 2, n = 22;
    const path = (grow) => {
      ctx.beginPath();
      for (let i = 0; i <= n * 2; i++) {
        const a = (i / (n * 2)) * Math.PI * 2, out = i % 2 ? 1 : 1.13 + ((i * 7) % 3) * 0.04;
        const px = cx + Math.cos(a) * (w / 2 + 10 + grow) * out, py = cy + Math.sin(a) * (h / 2 + 10 + grow) * out;
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.closePath();
    };
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.save(); ctx.translate(3, 5); path(0); ctx.fill(); ctx.restore();
    ctx.fillStyle = edge; path(3); ctx.fill();
    ctx.fillStyle = fill; path(0); ctx.fill();
  },
  mood(b, L) {
    if (L.narr) return 'scroll';
    const m = Bubble.moodOf(b.text, b.o);
    return m === 'talk' && b.st.text ? 'dark' : m;
  },
  draw() {
    if (this.ghost) this.drawGhost();
    const b = this.active; if (!b) return;
    const L = this.layout(b);
    const st = b.st, kind = this.mood(b, L);
    const shake = b.shake || (kind === 'shout' ? 1.4 : kind === 'angry' ? 0.9 : kind === 'scared' ? 0.5 : 0);
    const sh = shake ? rnd(-shake, shake) : 0, sv = shake ? rnd(-shake, shake) * 0.6 : 0;
    // pop in with a squash, then breathe; the happy ones bounce
    const k = clamp(b.pop || 0, 0, 1), po = Ease.outBack(k);
    const sx = lerp(0.3, 1, po) * (1 + Math.sin(b.t * 3) * 0.008), sy = lerp(0.1, 1, Ease.outBack(clamp(k * 1.3, 0, 1))) * (1 - Math.sin(b.t * 3) * 0.008);
    const hop = kind === 'happy' ? -Math.abs(Math.sin(b.t * 5)) * 2 : kind === 'sad' ? Math.sin(b.t * 1.5) * 1 : 0;
    const ctx = Gfx.ctx;
    ctx.save();
    const ox = L.tx ?? L.x + L.w / 2, oy = L.ty ?? L.y + L.h;
    ctx.translate(ox, oy); ctx.scale(sx, sy); ctx.translate(-ox, -oy);
    ctx.translate(sh, sv + hop);
    Bubble.draw(kind, L.x, L.y, L.w, L.h, L.tx != null ? { x: L.tx, y: L.ty } : null, b.t);
    const dark = kind === 'dark', light = !(dark || kind === 'scroll' && false);
    const x0 = L.x + L.pad;
    if (b.speaker) {
      const nc = dark ? st.name : kind === 'scroll' ? '#5c3a20' : (st.name || '#3b3048');
      Gfx.text(b.speaker, x0, L.y + L.pad - 6, { color: nc, scale: 1, font: 'rock' });
    }
    const shown = b.text.slice(0, Math.floor(b.chars));
    const lines = Gfx.wrap(shown, L.w - L.pad * 2, L.scale);
    const tcol = dark ? st.text : kind === 'scroll' ? '#3a2415' : kind === 'angry' ? '#5c1607' : kind === 'sad' ? '#1d3d72' : '#241c2e';
    let ci = 0;
    for (let i = 0; i < lines.length; i++) ci = this.line(lines[i], x0, L.y + L.pad - 4 + L.nameH + i * L.lh, L.scale, { color: tcol, onLight: light && !dark }, b, ci, kind);
    if (b.choices && b.chars >= b.text.length) {
      for (let i = 0; i < b.choices.length; i++) {
        const r = L.choiceRects[i], hov = b.hover === i && UI.hovered(r.x, r.y, r.w, r.h);
        UI.stoneButton(r.x, r.y, r.w, r.h, hov, true);
        Gfx.rich(`${i + 1}.  ` + b.choices[i], r.x + 12, r.y + 11 + (hov ? 1 : 0), { color: hov ? '#241c2e' : '#fffaea', scale: 1.4, onLight: hov });
      }
      b.hover = -1;
    } else if (b.chars >= b.text.length && !b.auto) {
      // a little pixel arrow, bobbing, to say there is more
      const ax = L.x + L.w - 16, ay = L.y + L.h - 13 + Math.abs(Math.sin(Time.t * 6)) * -2;
      const c = dark ? '#ffa832' : kind === 'scroll' ? '#9c3510' : '#c2333c';
      for (let r = 0; r < 4; r++) Gfx.rect(ax - 3 + r, ay + r * 2, 7 - r * 2, 2, c);
    }
    ctx.restore();
  },
  // the bubble you just clicked away shrinks and pops
  drawGhost() {
    const G = this.ghost; G.t += Time.dt;
    if (G.t > 0.16) { this.ghost = null; return; }
    const b = G.b, L = this.layout(b), kind = this.mood(b, L), k = 1 - G.t / 0.16;
    if (!G.burst) {
      G.burst = true;
      for (let i = 0; i < 10; i++) Particles.spawn(L.x + Math.random() * L.w, L.y + Math.random() * L.h, { n: 1, color: ['#fffaea', '#d6cfe0'], speed: 120, life: 0.35, size: 4, sizeEnd: 0, gravity: 100, world: false });
    }
    const ctx = Gfx.ctx, ox = L.x + L.w / 2, oy = L.y + L.h / 2;
    ctx.save(); ctx.globalAlpha = k; ctx.translate(ox, oy); ctx.scale(1 + (1 - k) * 0.25, k); ctx.translate(-ox, -oy);
    Bubble.draw(kind, L.x, L.y, L.w, L.h, null, b.t);
    ctx.restore();
  },
  clear() { this.active = null; this.queue.length = 0; }
};

// small non-blocking speech, drawn in world space above an actor
const Floaters = {
  list: [],
  add(actor, text, life = 2.6) { this.list.push({ actor, text, t: 0, life, w: Gfx.measure(text, 1.5) + 22 }); },
  update(dt) { for (let i = this.list.length - 1; i >= 0; i--) { const f = this.list[i]; f.t += dt; if (f.t >= f.life) this.list.splice(i, 1); } },
  draw() {
    for (const f of this.list) {
      const k = f.t / f.life;
      const a = k < 0.12 ? k / 0.12 : k > 0.85 ? (1 - k) / 0.15 : 1;
      const pop = k < 0.12 ? Ease.outBack(k / 0.12) : 1;
      const x = f.actor.x, y = (f.actor.top ?? f.actor.y) - 14;
      Gfx.ctx.globalAlpha = clamp(a, 0, 1);
      const w = Math.round(f.w), h = 26, ctx = Gfx.ctx;
      ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop); ctx.translate(-x, -y);
      Bubble.draw(Bubble.moodOf(f.text), Math.round(x - w / 2), Math.round(y - h - 8), w, h, { x, y: y + 4 }, f.t);
      Gfx.text(f.text, x, y - h - 1, { color: '#241c2e', align: 'center', scale: 1.5 });
      ctx.restore();
      Gfx.ctx.globalAlpha = 1;
    }
  },
  clear() { this.list.length = 0; }
};
