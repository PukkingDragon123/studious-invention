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
  MAMMOTH: { fill: '#fff6e6', name: '#85562f', portrait: 'mammoth_trader' },
  '': { fill: '#fffaea', name: '#3b3048' },
};

const Dialogue = {
  active: null, queue: [],
  // core generator: shows one bubble and waits for the player to advance it
  *say(speaker, text, o = {}) {
    const st = SPEAKER_STYLE[speaker] || SPEAKER_STYLE[''];
    const b = {
      speaker, text, o, st, chars: 0, done: false, t: 0,
      at: o.at || null, x: o.x, y: o.y, choices: o.choices || null, choice: -1, hover: -1,
      portrait: o.portrait === false ? null : (o.portrait || st.portrait),
      shake: o.shake || 0, speed: o.speed || 48, auto: o.auto,
    };
    this.active = b;
    let waited = 0;
    while (true) {
      yield 0;
      b.t += Time.dt; waited += Time.dt;
      b.chars = Math.min(text.length, b.chars + Time.dt * b.speed * (Input.down ? 3 : 1));
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
  layout(b) {
    const scale = b.o.scale || 1;
    const maxW = b.o.width || 420;
    const lines = Gfx.wrap(b.text, maxW - 24 - (b.portrait ? 54 : 0), scale);
    const lh = Gfx.lineHeight(scale);
    const textW = Math.max(160, Math.min(maxW, Math.max(...lines.map(l => Gfx.measure(l.replace(/\{[^}]*\}/g, ''), scale))) + 24 + (b.portrait ? 54 : 0)));
    let h = lines.length * lh + 22;
    const choiceH = 26;
    if (b.choices) h += b.choices.length * (choiceH + 4) + 6;
    // anchor: above the speaker if we have one, else bottom centre
    let tx, ty, x, y;
    if (b.at) {
      const p = Game.worldToScreen ? Game.worldToScreen(b.at.x, b.at.top ?? b.at.y) : { x: b.at.x, y: b.at.y };
      tx = clamp(p.x, 40, W - 40); ty = clamp(p.y - 6, 60, H - 20);
      x = clamp(tx - textW / 2, 12, W - textW - 12);
      y = clamp(ty - h - 22, 8, H - h - 60);
    } else {
      x = b.x ?? (W - textW) / 2; y = b.y ?? (H - h - 74);
      tx = x + textW / 2; ty = y + h + 18;
    }
    const choiceRects = [];
    if (b.choices) {
      let cy = y + lines.length * lh + 16;
      for (let i = 0; i < b.choices.length; i++) { choiceRects.push({ x: x + 12, y: cy, w: textW - 24, h: choiceH }); cy += choiceH + 4; }
    }
    return { x, y, w: textW, h, tx, ty, lines, lh, scale, choiceRects };
  },
  draw() {
    const b = this.active; if (!b) return;
    const L = this.layout(b);
    const st = b.st;
    const sh = b.shake ? rnd(-b.shake, b.shake) : 0;
    Gfx.bubble(L.x + sh, L.y, L.w, L.h, L.tx, L.ty, { fill: st.fill, border: '#120c16' });
    let tx = L.x + 12 + sh;
    if (b.portrait) {
      const pw = 46, ph = L.h - 16;
      Gfx.round(L.x + 8 + sh, L.y + 8, pw, Math.min(ph, 52), 4, '#241c2e');
      const sp = Gfx.spr(b.portrait);
      const sc = Math.max(1, Math.min(2, Math.floor(44 / sp.h)));
      Gfx.ctx.save(); Gfx.ctx.beginPath(); Gfx.ctx.rect(L.x + 8 + sh, L.y + 8, pw, Math.min(ph, 52)); Gfx.ctx.clip();
      Gfx.sprite(b.portrait, L.x + 8 + pw / 2 + sh, L.y + 8 + Math.min(ph, 52) + 2, { anchor: 'bc', scale: sc, frame: Math.floor(Time.t * 3) });
      Gfx.ctx.restore();
      Gfx.outlineRound(L.x + 8 + sh, L.y + 8, pw, Math.min(ph, 52), 4, '#120c16');
      tx += 54;
    }
    if (b.speaker) {
      const nw = Gfx.measure(b.speaker, 1) + 14;
      Gfx.round(L.x + 10 + sh, L.y - 11, nw, 18, 4, '#120c16');
      Gfx.text(b.speaker, L.x + 17 + sh, L.y - 7, { color: st.name, scale: 1 });
    }
    const shown = b.text.slice(0, Math.floor(b.chars));
    const lines = Gfx.wrap(shown, L.w - 24 - (b.portrait ? 54 : 0), L.scale);
    for (let i = 0; i < lines.length; i++) Gfx.rich(lines[i], tx, L.y + 12 + i * L.lh, { color: st.text || '#241c2e', scale: L.scale });
    if (b.choices && b.chars >= b.text.length) {
      for (let i = 0; i < b.choices.length; i++) {
        const r = L.choiceRects[i], hov = b.hover === i && UI.hovered(r.x, r.y, r.w, r.h);
        Gfx.round(r.x, r.y, r.w, r.h, 4, hov ? '#85562f' : '#241c2e');
        Gfx.outlineRound(r.x, r.y, r.w, r.h, 4, hov ? '#ffe98a' : '#8a7f68');
        Gfx.rich(`{y}${i + 1}.{/} ` + b.choices[i], r.x + 10, r.y + 7, { color: '#fffaea' });
      }
      b.hover = -1;
    } else if (b.chars >= b.text.length && !b.auto) {
      Gfx.sprite('icon_check', L.x + L.w - 22 + sh, L.y + L.h - 16 + Math.sin(Time.t * 7) * 2, { anchor: 'c', scale: 1, tint: '#3b3048', tintAmount: 0.5 });
    }
  },
  clear() { this.active = null; this.queue.length = 0; }
};

// small non-blocking speech, drawn in world space above an actor
const Floaters = {
  list: [],
  add(actor, text, life = 2.6) { this.list.push({ actor, text, t: 0, life, w: Gfx.measure(text, 1) + 18 }); },
  update(dt) { for (let i = this.list.length - 1; i >= 0; i--) { const f = this.list[i]; f.t += dt; if (f.t >= f.life) this.list.splice(i, 1); } },
  draw() {
    for (const f of this.list) {
      const k = f.t / f.life;
      const a = k < 0.12 ? k / 0.12 : k > 0.85 ? (1 - k) / 0.15 : 1;
      const pop = k < 0.12 ? Ease.outBack(k / 0.12) : 1;
      const x = f.actor.x, y = (f.actor.top ?? f.actor.y) - 14;
      Gfx.ctx.globalAlpha = clamp(a, 0, 1);
      const w = f.w * pop, h = 20 * pop;
      Gfx.bubble(x - w / 2, y - h, w, h, x, y + 8, { fill: '#fffaea' });
      if (pop > 0.9) Gfx.text(f.text, x, y - h + 6, { color: '#241c2e', align: 'center' });
      Gfx.ctx.globalAlpha = 1;
    }
  },
  clear() { this.list.length = 0; }
};
