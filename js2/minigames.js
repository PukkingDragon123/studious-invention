// ---------------------------------------------------------------------------
// minigames.js - little tests of skill that some choices on the road hand you.
//
//   swing   a club swings back and forth over a stone; strike (SPACE or a
//           click) while it is over the sweet spot. Three swings.
//   tug     tug of war over a tar pit: mash SPACE or click to haul the rope
//           your way before the beast drags you in.
//   catch   fruit and rocks fall from a shaken tree; move the basket (mouse
//           or A/D, arrows) to catch the fruit and dodge the rocks.
//
// Each one ends on its own clock, so nothing ever waits for ever, and hands
// back { score 0..1, win, n }.
// ---------------------------------------------------------------------------
'use strict';

class MiniGame {
  constructor(kind, o = {}, onDone) {
    this.kind = kind; this.o = o; this.onDone = onDone; this.t = 0; this.done = false; this.flash = 0;
    this.title = o.title || { swing: 'WHACK IT!', tug: 'PULL!', catch: 'CATCH!' }[kind];
    if (kind === 'swing') { this.swings = 0; this.hits = 0; this.ph = 0; this.speed = o.speed || 2.6; this.zone = o.zone || 0.16; this.marks = []; this.cool = 0; }
    if (kind === 'tug') { this.rope = 0; this.time = o.time || 5; this.pull = o.pull || 0.24; }
    if (kind === 'catch') { this.time = o.time || 8; this.bx = W / 2; this.items = []; this.spawnT = 0; this.got = 0; this.bonk = 0; this.total = 0; }
    AudioSys.sfx('zoom_in');
  }
  pressed() {
    let n = 0;
    for (const k of Input.keys) if (['Space', 'Enter', 'KeyA', 'KeyS', 'KeyD', 'KeyF'].includes(k.code)) n++;
    n += Input.clicks.length;
    return n;
  }
  finish(score, win, n) {
    if (this.done) return; this.done = true;
    this.result = { score: clamp(score, 0, 1), win, n };
    AudioSys.sfx(win ? 'victory' : 'defeat', { vol: 0.6 });
    this.endT = 0;
  }
  update(dt) {
    this.t += dt; this.flash = Math.max(0, this.flash - dt * 3);
    if (this.done) { this.endT += dt; if (this.endT > 0.9 && this.onDone) { const f = this.onDone; this.onDone = null; f(this.result); } return; }
    if (this.t < 0.7) return;                                           // a beat to read it
    if (this.kind === 'swing') {
      this.ph += dt * this.speed; this.cool -= dt;
      const pos = Math.sin(this.ph);                                   // -1..1 across the bar
      if (this.pressed() && this.cool <= 0) {
        this.cool = 0.35; this.swings++;
        const hit = Math.abs(pos) < this.zone;
        if (hit) { this.hits++; this.flash = 1; AudioSys.sfx('bighit'); Juice.shake(8, 0.2); Toon.word(W / 2, 250, 'CRACK!', { size: 1.8, col: '#ffa832', life: 0.7 }); }
        else { AudioSys.sfx('miss'); Juice.shake(3, 0.1); }
        this.marks.push({ pos, hit, t: 0 });
      }
      // a swing you let go by counts as a miss, after a while
      if (this.ph > Math.PI * 2 * (this.swings + 2.2)) { this.swings++; this.marks.push({ pos: 2, hit: false, t: 0 }); AudioSys.sfx('miss', { vol: 0.4 }); }
      for (const m of this.marks) m.t += dt;
      if (this.swings >= 3) this.finish(this.hits / 3, this.hits >= 2, this.hits);
    } else if (this.kind === 'tug') {
      this.time -= dt;
      const p = this.pressed();
      if (p) { this.rope -= 0.07 * p; AudioSys.sfx('click', { vol: 0.4 }); Juice.shake(2, 0.05); }
      this.rope += dt * this.pull * (1 + (5 - this.time) * 0.08);   // it pulls harder as it gets tired of you
      if (this.rope <= -1) this.finish(1, true, 1);
      else if (this.rope >= 1) this.finish(0, false, 0);
      else if (this.time <= 0) this.finish(0.5 - this.rope / 2, this.rope < 0, this.rope < 0 ? 1 : 0);
    } else if (this.kind === 'catch') {
      this.time -= dt;
      if (Input.isDown('KeyA', 'ArrowLeft')) this.bx -= dt * 420;
      if (Input.isDown('KeyD', 'ArrowRight')) this.bx += dt * 420;
      if (Input.mx !== this._mx) { this._mx = Input.mx; if (Input.mx > 0) this.bx = Input.mx; }
      this.bx = clamp(this.bx, 160, W - 160);
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.time > 0.8) {
        this.spawnT = rnd(0.28, 0.5);
        const rock = chance(0.3);
        if (!rock) this.total++;
        this.items.push({ x: rnd(180, W - 180), y: 110, vy: rnd(60, 110), rock, rot: rnd(0, 6) });
      }
      for (const it of this.items) {
        it.vy += 520 * dt; it.y += it.vy * dt; it.rot += dt * 5;
        if (!it.gone && it.y > 400 && it.y < 430 && Math.abs(it.x - this.bx) < 46) {
          it.gone = true;
          if (it.rock) { this.bonk++; AudioSys.sfx('hurt'); Juice.shake(6, 0.15); Toon.word(this.bx, 360, 'BONK', { size: 1.2, col: '#ef6a5e', life: 0.6 }); }
          else { this.got++; AudioSys.sfx('pickup'); Particles.sparkle(this.bx, 400, 6, ['#ffe98a', '#ef6a5e']); }
        }
      }
      this.items = this.items.filter(it => !it.gone && it.y < H + 40);
      if (this.time <= 0) { const s = this.total ? this.got / this.total : 0; this.finish(s, s >= 0.5 && this.bonk < 3, this.got); }
    }
  }
  draw() {
    const ctx = Gfx.ctx;
    Gfx.rectA(0, 0, W, H, '#120c16', 0.72);
    PixUI.panel('stone', W / 2 - 170, 30, 340, 56, { seed: 11 });
    Gfx.text(this.title, W / 2, 44, { color: '#9c3510', align: 'center', scale: 3, font: 'rock' });
    const hint = { swing: Input.touch ? 'TAP' : 'SPACE', tug: Input.touch ? 'TAP TAP TAP' : 'MASH SPACE', catch: Input.touch ? 'DRAG' : 'MOUSE  /  A D' }[this.kind];
    PixUI.panel('obsidian', W / 2 - 80, 94, 160, 24, { seed: 3 });
    Gfx.text(hint, W / 2, 100, { color: '#ffe98a', align: 'center', font: 'rock' });
    if (this.kind === 'swing') this.drawSwing(ctx);
    if (this.kind === 'tug') this.drawTug(ctx);
    if (this.kind === 'catch') this.drawCatch(ctx);
    if (this.done) {
      const k = Ease.outBack(clamp(this.endT * 3, 0, 1));
      ctx.save(); ctx.translate(W / 2, 250); ctx.scale(k, k);
      PixUI.panel(this.result.win ? 'wood' : 'red', -130, -34, 260, 68, { seed: 8, hot: this.result.win });
      Gfx.text(this.result.win ? 'NAILED IT!' : 'NOPE!', 0, -16, { color: '#fffaea', align: 'center', scale: 3, font: 'rock' });
      ctx.restore();
    }
  }
  drawSwing(ctx) {
    const cx = W / 2, cy = 310, bw = 520, pos = Math.sin(this.ph);
    // the stone bar with its sweet spot
    PixUI.panel('stone', cx - bw / 2 - 12, cy + 50, bw + 24, 44, { seed: 5 });
    Gfx.rect(cx - bw / 2, cy + 64, bw, 16, '#3a2415');
    Gfx.rect(cx - bw / 2 * this.zone, cy + 64, bw * this.zone, 16, this.flash > 0 ? '#ffe98a' : '#6cc95c');
    Gfx.rect(cx - 2, cy + 60, 4, 24, '#fffaea');
    for (const m of this.marks) if (m.pos <= 1) Gfx.rect(cx + m.pos * bw / 2 - 2, cy + 58, 4, 28, m.hit ? '#ffe98a' : '#ef6a5e');
    // the club itself, pendulum-swinging from a branch
    const ang = pos * 0.9, len = 150, hx = cx + Math.sin(ang) * len, hy = cy - 130 + Math.cos(ang) * len;
    Gfx.rect(cx - 160, cy - 140, 320, 10, '#5c3a20');
    ctx.save(); ctx.translate(cx, cy - 132); ctx.rotate(-ang);
    Gfx.rect(-4, 0, 8, len - 20, '#85562f'); Gfx.rect(-4, 0, 3, len - 20, '#b07a45');
    Gfx.round(-18, len - 34, 36, 40, 10, '#3a2415'); Gfx.round(-15, len - 31, 30, 34, 8, '#75401f'); Gfx.rect(-10, len - 26, 8, 6, '#b07a45');
    ctx.restore();
    void hx; void hy;
    // three stones for three swings
    for (let i = 0; i < 3; i++) {
      const m = this.marks[i];
      PixUI.panel(m ? (m.hit ? 'woodhot' : 'red') : 'obsidian', cx - 60 + i * 44, cy + 104, 32, 28, { seed: i, hot: m && m.hit });
    }
  }
  drawTug(ctx) {
    const cx = W / 2, y = 330, off = this.rope * 180;
    // the tar pit in the middle
    Gfx.round(cx - 110, y + 10, 220, 40, 18, '#120c16'); Gfx.round(cx - 100, y + 14, 200, 30, 14, '#241c2e');
    for (let i = 0; i < 4; i++) { const q = (this.t * 0.8 + i * 0.25) % 1; Gfx.circle(cx - 70 + i * 46, y + 28 - q * 6, 4 * (1 - q) + 1, '#3b3048'); }
    // the rope, and the knot in the middle that has to reach your side
    Gfx.rect(80, y - 4, W - 160, 6, '#b07a45'); Gfx.rect(80, y - 4, W - 160, 2, '#d8a86b');
    Gfx.rect(cx + off - 5, y - 12, 10, 22, '#c2333c');
    Gfx.rect(cx - 180 - 2, y - 20, 4, 36, '#6cc95c'); Gfx.rect(cx + 180 - 2, y - 20, 4, 36, '#ef6a5e');
    // you, and it
    const me = Game.run ? Heroes.get(Game.run.hero).base + '_idle' : 'bronk_idle';
    Gfx.sprite(me, 150 + off * 0.3 + Math.sin(this.t * 30) * (this.pressed() ? 3 : 0), y + 30, { anchor: 'bc', scale: 1.4 });
    Gfx.sprite(this.o.foe || 'raptor_idle', W - 150 + off * 0.3, y + 30, { anchor: 'bc', scale: 1.2, flip: true, frame: Math.floor(this.t * 6) });
    PixUI.panel('obsidian', cx - 40, y + 70, 80, 26, { seed: 2 });
    Gfx.text(String(Math.max(0, Math.ceil(this.time))), cx, y + 76, { color: '#ffe98a', align: 'center', scale: 1.5, font: 'rock' });
  }
  drawCatch(ctx) {
    // the tree, shaking
    const sh = Math.sin(this.t * 40) * 3;
    Gfx.round(W / 2 - 300 + sh, 100, 600, 50, 24, '#27632f'); Gfx.round(W / 2 - 290 + sh, 104, 580, 30, 18, '#3f9a45');
    for (const it of this.items) {
      if (it.rock) { Gfx.circle(it.x, it.y, 13, '#120c16'); Gfx.circle(it.x, it.y, 11, '#7a6d8a'); Gfx.circle(it.x - 3, it.y - 3, 4, '#a79bb4'); }
      else Gfx.sprite('ti_berries', it.x, it.y, { anchor: 'c', scale: 1.4, rot: Math.sin(it.rot) * 0.3 });
    }
    // the basket
    const bx = this.bx, by = 420;
    Gfx.round(bx - 50, by - 10, 100, 34, 10, '#3a2415'); Gfx.round(bx - 46, by - 8, 92, 28, 8, '#b07a45');
    for (let i = 0; i < 5; i++) Gfx.rect(bx - 40 + i * 20, by - 8, 3, 28, '#85562f');
    Gfx.rect(bx - 48, by - 12, 96, 5, '#d8a86b');
    PixUI.panel('wood', 20, 150, 110, 40, { seed: 4 });
    Gfx.sprite('ti_berries', 44, 170, { anchor: 'c', scale: 1 });
    Gfx.text(String(this.got), 90, 162, { color: '#fffaea', align: 'center', scale: 2, font: 'rock' });
    PixUI.panel('obsidian', W - 110, 150, 90, 40, { seed: 1 });
    Gfx.text(String(Math.max(0, Math.ceil(this.time))), W - 65, 162, { color: '#ffe98a', align: 'center', scale: 2, font: 'rock' });
  }
}
