// ---------------------------------------------------------------------------
// hud.js - the in-play interface. One look for everything you read while you
// are playing: dark glass plates with a hairline gold edge, numbers big and
// words small. The carved stone is kept for menus, where you stop and read;
// while you are playing the interface gets out of the way of the picture.
//
// Rules the whole kit follows:
//   - everything sits on an 8px grid, 12px in from the screen edge
//   - one plate per job, never stacked, never more than three corners used
//   - text on glass is always light; colour carries meaning (red life,
//     green breath, blue energy, purple gems, pink hype)
// ---------------------------------------------------------------------------
'use strict';

const HUD = {
  EDGE: 12,
  C: {
    glass: 'rgba(14,9,18,0.80)', glassHi: 'rgba(255,250,234,0.07)',
    ink: '#07050a', rim: '#3b3048', gold: '#e0b93a', goldDim: '#8a6a1c',
    text: '#fffaea', dim: '#a79bb4', faint: '#6e6b80',
    life: '#e0404a', lifeDark: '#5c1420', breath: '#58c85a', breathDark: '#14331e',
    energy: '#5aa2ff', hype: '#ff7ab8', shell: '#ffe98a', gem: '#c28cff',
  },
  // A plate of dark glass. Corners are cut, not rounded: it is still a stone
  // age, the glass is obsidian.
  plate(x, y, w, h, o = {}) {
    const c = Gfx.ctx, C = HUD.C, k = o.cut ?? 4;
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const path = (px, py, pw, ph, kk) => {
      c.beginPath();
      c.moveTo(px + kk, py); c.lineTo(px + pw - kk, py); c.lineTo(px + pw, py + kk);
      c.lineTo(px + pw, py + ph - kk); c.lineTo(px + pw - kk, py + ph); c.lineTo(px + kk, py + ph);
      c.lineTo(px, py + ph - kk); c.lineTo(px, py + kk); c.closePath();
    };
    if (o.shadow !== false) { c.fillStyle = 'rgba(0,0,0,0.35)'; path(x + 2, y + 3, w, h, k); c.fill(); }
    c.fillStyle = C.ink; path(x - 1, y - 1, w + 2, h + 2, k + 1); c.fill();
    c.fillStyle = o.fill || C.glass; path(x, y, w, h, k); c.fill();
    c.fillStyle = C.glassHi; c.fillRect(x + k, y + 1, w - k * 2, 1);          // the lit top edge
    if (o.accent) { c.fillStyle = o.accent; c.fillRect(x + 1, y + k, 2, h - k * 2); }
    if (o.gold !== false) {                                                  // gold on the cut corners
      c.fillStyle = o.hot ? C.gold : C.goldDim;
      for (const [cx, cy, dx, dy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
        for (let i = 0; i < k; i++) c.fillRect(cx + dx * i - (dx < 0 ? 1 : 0), cy + dy * (k - 1 - i) - (dy < 0 ? 1 : 0), 1, 1);
      }
    }
  },
  // A bar: ink trough, the fill, a lighter stripe along the top of the fill,
  // and tick marks so a long bar still reads as quantity.
  bar(x, y, w, h, frac, col, dark, o = {}) {
    const f = clamp(frac, 0, 1);
    Gfx.rect(x - 1, y - 1, w + 2, h + 2, HUD.C.ink);
    Gfx.rect(x, y, w, h, dark || '#1a1320');
    const fw = Math.round(w * f);
    if (o.ghost !== undefined && o.ghost > f) Gfx.rectA(x, y, Math.round(w * clamp(o.ghost, 0, 1)), h, '#ffffff', 0.35);
    Gfx.rect(x, y, fw, h, col);
    if (h >= 4) Gfx.rectA(x, y, fw, Math.max(1, Math.floor(h / 3)), '#ffffff', 0.28);
    if (o.ticks) for (let i = 1; i < o.ticks; i++) Gfx.rectA(x + Math.round(w * i / o.ticks), y, 1, h, HUD.C.ink, 0.5);
  },
  text(t, x, y, o = {}) { Gfx.text(t, x, y, Object.assign({ color: HUD.C.text, scale: 1 }, o)); },
  // A chip: one icon, one number. Money, gems, a count.
  chip(x, y, w, drawIcon, value, col, o = {}) {
    HUD.plate(x, y, w, 30, { gold: false, accent: col });
    drawIcon(x + 18, y + 15);
    HUD.text(String(value), x + 34, y + 9, { color: col, scale: 1.3 });
    if (o.hit) UI.hit(x, y, w, 30, o.hit);
  },
  // A key, drawn as a key: [E], [SPACE].
  key(label, x, y) {
    const w = Math.max(16, Gfx.measure(label, 0.9) + 8);
    Gfx.rect(x, y, w, 15, HUD.C.ink);
    Gfx.rect(x + 1, y + 1, w - 2, 12, '#e8dfc6');
    Gfx.rect(x + 1, y + 11, w - 2, 2, '#8a7f68');
    Gfx.text(label, x + w / 2, y + 3, { color: '#241109', align: 'center', scale: 0.9 });
    return w;
  },
  // A glass button with a single word on it. Hover lights the gold.
  button(x, y, w, h, label, cb, o = {}) {
    const hov = !o.disabled && UI.hovered(x, y, w, h) && !UI.locked;
    const press = hov && Input.down;
    HUD.plate(x, y + (press ? 1 : 0), w, h, {
      hot: hov || o.hot, fill: o.disabled ? 'rgba(14,9,18,0.55)' : o.danger ? 'rgba(92,20,32,0.9)' : o.fill || (hov ? 'rgba(40,28,48,0.92)' : HUD.C.glass),
      accent: o.accent,
    });
    const col = o.disabled ? HUD.C.faint : hov ? HUD.C.shell : HUD.C.text;
    let tx = x + w / 2;
    if (o.keyHint && !Input.touch) {
      const kw = Math.max(16, Gfx.measure(o.keyHint, 0.9) + 8), lw = Gfx.measure(label, o.scale || 1.2);
      const total = kw + 8 + lw;
      HUD.key(o.keyHint, x + w / 2 - total / 2, y + h / 2 - 7 + (press ? 1 : 0));
      tx = x + w / 2 - total / 2 + kw + 8 + lw / 2;
    }
    Gfx.text(label, tx, y + h / 2 - 5 * (o.scale || 1.2) + (press ? 1 : 0), { color: col, align: 'center', scale: o.scale || 1.2 });
    UI.hit(x, y, w, h, cb, { disabled: o.disabled });
    return hov;
  },
  // the gem, drawn by hand rather than from the sheet: the only money there is
  gem(x, y, s = 1) {
    const c = Gfx.ctx;
    c.fillStyle = HUD.C.ink; c.beginPath(); c.moveTo(x, y - 9 * s); c.lineTo(x + 7 * s, y); c.lineTo(x, y + 9 * s); c.lineTo(x - 7 * s, y); c.fill();
    c.fillStyle = '#7c3eb2'; c.beginPath(); c.moveTo(x, y - 7 * s); c.lineTo(x + 5 * s, y); c.lineTo(x, y + 7 * s); c.lineTo(x - 5 * s, y); c.fill();
    c.fillStyle = HUD.C.gem; c.beginPath(); c.moveTo(x, y - 7 * s); c.lineTo(x - 5 * s, y); c.lineTo(x, y); c.fill();
  },
  // A face in a round frame: whose status this is.
  portrait(cx, cy, r, spr, o = {}) {
    const c = Gfx.ctx;
    Gfx.circle(cx, cy, r + 2, HUD.C.ink);
    Gfx.circle(cx, cy, r + 1, o.ring || HUD.C.goldDim);
    Gfx.circle(cx, cy, r - 1, o.bg || '#2a2034');
    c.save(); c.beginPath(); c.arc(cx, cy, r - 1, 0, Math.PI * 2); c.clip();
    const s = Gfx.spr(spr);
    // frame the head: the top third of the sprite
    Gfx.sprite(spr, cx, cy + s.h * (o.scale || 1) * 0.36, { anchor: 'bc', scale: o.scale || 1, frame: o.frame || 0 });
    c.restore();
  },
  // A banner across the middle of the screen: the name of a place, a turn.
  banner(title, sub, k) {
    const a = clamp(k, 0, 1), c = Gfx.ctx;
    c.save(); c.globalAlpha = a;
    const g = c.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(14,9,18,0)'); g.addColorStop(0.25, 'rgba(14,9,18,0.82)');
    g.addColorStop(0.75, 'rgba(14,9,18,0.82)'); g.addColorStop(1, 'rgba(14,9,18,0)');
    c.fillStyle = g; c.fillRect(0, H * 0.3 - 40, W, 92);
    c.fillStyle = HUD.C.goldDim; c.fillRect(W * 0.25, H * 0.3 - 40, W * 0.5, 1); c.fillRect(W * 0.25, H * 0.3 + 51, W * 0.5, 1);
    Gfx.text(title, W / 2, H * 0.3 - 26, { color: HUD.C.shell, align: 'center', scale: 2.6, outline: true, outlineWidth: 2 });
    if (sub) Gfx.text(sub, W / 2, H * 0.3 + 18, { color: HUD.C.dim, align: 'center', scale: 1.2 });
    c.restore();
  },
};
