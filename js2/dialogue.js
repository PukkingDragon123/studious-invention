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
  line(str, x, y, scale, o, t) {
    let cx = x, k = 0;
    for (const seg of Gfx.richSegs(str, o)) {
      for (const word of seg.t.split(/(\s+)/)) {
        if (!word) continue;
        const loud = /[A-Z]{2}/.test(word) && word === word.toUpperCase();
        if (loud) {
          for (const ch of word) {
            Gfx.text(ch, cx, y + Math.round(Math.sin(t * 13 + k * 0.9) * 1.6), { color: seg.c, scale });
            cx += Gfx.measure(ch, scale); k++;
          }
        } else { Gfx.text(word, cx, y, { color: seg.c, scale }); cx += Gfx.measure(word, scale); k += word.length; }
      }
    }
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
  draw() {
    const b = this.active; if (!b) return;
    const L = this.layout(b);
    const st = b.st, loud = this.shouting(b);
    const shake = b.shake || (loud ? 1.2 : 0);
    const sh = shake ? rnd(-shake, shake) : 0, sv = shake ? rnd(-shake, shake) * 0.6 : 0;
    const pop = Ease.outBack(clamp(b.pop || 0, 0, 1));
    const ctx = Gfx.ctx;
    const dark = !!st.text, fill = L.narr ? '#1a1424' : dark ? st.fill : '#fffaea', ink = '#120c16';
    ctx.save();
    const ox = L.tx ?? L.x + L.w / 2, oy = L.ty ?? L.y + L.h;
    ctx.translate(ox, oy); ctx.scale(clamp(pop, 0.02, 1.2), clamp(pop, 0.02, 1.2)); ctx.translate(-ox, -oy);
    ctx.translate(sh, sv);
    if (loud && !L.narr) {
      this.spiky(L.x, L.y, L.w, L.h, fill, ink);
      if (L.tx != null) { ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(L.tx - 12, L.y + L.h); ctx.lineTo(L.tx + 12, L.y + L.h); ctx.lineTo(L.tx, L.ty); ctx.fill(); }
    } else if (L.narr) {
      Gfx.rectA(L.x + 3, L.y + 5, L.w, L.h, '#000', 0.35);
      Gfx.round(L.x, L.y, L.w, L.h, 6, '#e0b93a');
      Gfx.round(L.x + 3, L.y + 3, L.w - 6, L.h - 6, 4, fill);
    } else {
      // the tail, then a three-pixel ink line round a plain white body
      const cx = clamp(L.tx, L.x + 22, L.x + L.w - 22), cy = L.y + L.h;
      Gfx.rectA(L.x + 3, L.y + 5, L.w, L.h, '#000', 0.3);
      ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(cx - 15, cy - 4); ctx.lineTo(cx + 13, cy - 4); ctx.lineTo(L.tx, L.ty); ctx.closePath(); ctx.fill();
      Gfx.round(L.x, L.y, L.w, L.h, 10, ink);
      Gfx.round(L.x + 3, L.y + 3, L.w - 6, L.h - 6, 8, fill);
      ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(cx - 10, cy - 6); ctx.lineTo(cx + 8, cy - 6); ctx.lineTo(lerp(L.tx, cx, 0.3), lerp(L.ty, cy, 0.3)); ctx.closePath(); ctx.fill();
    }
    const x0 = L.x + L.pad;
    if (b.speaker) Gfx.text(b.speaker, x0, L.y + L.pad - 4, { color: dark || L.narr ? st.name : (st.name || '#3b3048'), scale: 1 });
    const shown = b.text.slice(0, Math.floor(b.chars));
    const lines = Gfx.wrap(shown, L.w - L.pad * 2, L.scale);
    const tcol = L.narr ? '#fffaea' : st.text || '#241c2e';
    for (let i = 0; i < lines.length; i++) this.line(lines[i], x0, L.y + L.pad - 4 + L.nameH + i * L.lh, L.scale, { color: tcol, onLight: !(L.narr || dark) }, b.t);
    if (b.choices && b.chars >= b.text.length) {
      for (let i = 0; i < b.choices.length; i++) {
        const r = L.choiceRects[i], hov = b.hover === i && UI.hovered(r.x, r.y, r.w, r.h);
        Gfx.round(r.x, r.y + 3, r.w, r.h, 6, '#120c16');
        Gfx.round(r.x, r.y + (hov ? 1 : 0), r.w, r.h, 6, hov ? '#e0b93a' : '#3b3048');
        Gfx.round(r.x + 2, r.y + 2 + (hov ? 1 : 0), r.w - 4, r.h - 5, 5, hov ? '#ffe98a' : '#574a66');
        Gfx.rich(`${i + 1}.  ` + b.choices[i], r.x + 12, r.y + 11 + (hov ? 1 : 0), { color: hov ? '#241c2e' : '#fffaea', scale: 1.4, onLight: hov });
      }
      b.hover = -1;
    } else if (b.chars >= b.text.length && !b.auto) {
      const ax = L.x + L.w - 16, ay = L.y + L.h - 13 + Math.abs(Math.sin(Time.t * 6)) * -2;
      ctx.fillStyle = L.narr ? '#ffe98a' : '#c2333c';
      ctx.beginPath(); ctx.moveTo(ax - 6, ay); ctx.lineTo(ax + 6, ay); ctx.lineTo(ax, ay + 7); ctx.closePath(); ctx.fill();
    }
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
      const w = f.w * pop, h = 26 * pop;
      Gfx.bubble(x - w / 2, y - h, w, h, x, y + 8, { fill: '#fffaea' });
      if (pop > 0.9) Gfx.text(f.text, x, y - h + 7, { color: '#241c2e', align: 'center', scale: 1.5 });
      Gfx.ctx.globalAlpha = 1;
    }
  },
  clear() { this.list.length = 0; }
};
