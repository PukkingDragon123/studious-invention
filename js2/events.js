// ---------------------------------------------------------------------------
// events.js - what you get for winning a fight
//
// The reward is taken where the fight was: the same clearing, the beasts
// lying where they fell and the blood still on the ground, the hero playing
// a victory tune. The cards you might learn are dealt off a deck one at a
// time: they fly out, flip over, and paint themselves in, top to bottom.
// ---------------------------------------------------------------------------
'use strict';

class RewardScene {
  constructor(o) {
    this.o = o; this.t = 0; this.cardTaken = !o.cards.length; this.relicTaken = !o.relics.length;
    this.cam = new Camera(); this.cam.zoom = 1; this.cam.lookAt(W / 2, 288 + CAM_DY, true);
    this.picked = null; this.pickT = 0;
    this.deal = o.cards.map((c, i) => ({ c, t0: 0.7 + i * 0.42, dealt: false, flipped: false, done: false }));
  }
  enter() {
    AudioSys.play('mammoth', { fade: 0.9 });
    Game.run.gems = (Game.run.gems || 0) + this.o.gems;
    if (this.o.gems) AudioSys.sfx('gem');
    if (Game.run.gems >= 30) Profile.unlock('hoarder');
  }
  exit() { }
  update(dt) {
    this.t += dt; Gore.update(dt);
    if (Input.pressed('Escape')) Game.pause();
    for (const d of this.deal) {
      const k = this.t - d.t0;
      if (k > 0 && !d.dealt) { d.dealt = true; AudioSys.sfx('card_deal'); }
      if (k > 0.42 && !d.flipped) { d.flipped = true; AudioSys.sfx('draw'); }
      if (k > 1.0 && !d.done) {
        d.done = true;
        if (d.c.def.rarity === 'rare' || d.c.def.rarity === 'band') { AudioSys.sfx('relic'); Juice.shake(3, 0.2); }
      }
    }
    if (this.picked) this.pickT += dt;
  }
  // where each card sits once it is dealt
  slot(i) { const n = this.deal.length, sp = CARD_W + 44; return { x: W / 2 - (n * sp - 44) / 2 + i * sp, y: 206 }; }
  drawField() {
    const F = this.o.field, b = (F && F.act) || (Game.run.board && Game.run.board.biome) || 1;
    this.cam.apply(Gfx.ctx);
    Backdrops.draw(b, this.t, this.cam);
    Gore.drawGround();
    if (F) for (const d of F.dead) {
      if (d.gibbed || !SPRITES[d.spr]) continue;
      const h = Gfx.spr(d.spr).h * d.scale;
      if (d.ko) Gfx.sprite(d.spr, d.x, d.y, { anchor: 'bc', scale: d.scale, flip: true, sy: 0.78, sx: 1.08, rot: -0.12 });
      else Gfx.sprite(d.spr, d.x + 16, d.y - h / 2 + 6, { anchor: 'c', scale: d.scale, flip: true, rot: Math.PI * 0.94, tint: d.charred ? '#120c16' : '#3f0e18', tintAmount: d.charred ? 0.9 : 0.35 });
      // flies
      for (let i = 0; i < 3; i++) { const q = this.t * (3 + i) + i * 2 + d.x; Gfx.rect(Math.round(d.x + 16 + Math.cos(q) * (14 + i * 5)), Math.round(d.y - h * 0.8 + Math.sin(q * 1.7) * 8), 2, 2, '#120c16'); }
    }
    Gore.drawChunks();
    const play = Heroes.has(Game.run.hero, 'play') ? Heroes.spr(Game.run.hero, 'play') : Heroes.spr(Game.run.hero);
    const mx = (F && F.meX) || 230;
    Gfx.shadow(mx, STAGE_Y, 70, 0.3);
    Gfx.sprite(play, mx, STAGE_Y + Math.abs(Math.sin(this.t * 4)) * -3, { anchor: 'bc', frame: Math.floor(this.t * 6), scale: ACTOR_SCALE });
    Backdrops.front(b, this.t, this.cam);
    Particles.draw(Gfx.ctx, true);
    this.cam.restore(Gfx.ctx);
    Post.grade(b);
    Post.ui();
  }
  // one card, somewhere between the deck and its slot
  drawDealt(d, i, hovered) {
    const k = this.t - d.t0; if (k < 0) return;
    const S = this.slot(i), deck = { x: W / 2 - CARD_W / 2, y: H - 40 };
    const m = Ease.outCubic(clamp(k / 0.42, 0, 1));
    let x = lerp(deck.x, S.x, m), y = lerp(deck.y, S.y, m) - Math.sin(m * Math.PI) * 60;
    const rot = (1 - m) * (i - 1) * 0.5, flip = clamp((k - 0.3) / 0.25, 0, 1);
    const sx = Math.abs(Math.cos(flip * Math.PI)), showFace = flip >= 0.5;
    const reveal = clamp((k - 0.55) / 0.45, 0, 1);
    if (this.picked) {
      const pk = clamp(this.pickT / 0.5, 0, 1);
      if (this.picked === d) { x = lerp(x, 150, Ease.inCubic(pk)); y = lerp(y, 330, Ease.inCubic(pk)); }
      else y += Ease.inCubic(pk) * 400;
      if (pk >= 1) return;
    }
    const ctx = Gfx.ctx;
    ctx.save();
    ctx.translate(x + CARD_W / 2, y + CARD_H / 2); ctx.rotate(rot); ctx.scale(Math.max(0.02, sx) * (this.picked === d ? 1 - clamp(this.pickT / 0.5, 0, 1) * 0.6 : 1), 1);
    ctx.translate(-CARD_W / 2, -CARD_H / 2);
    if (!showFace) Cards.back(0, 0, 1);
    else {
      // the face paints itself in from the top; below the line it is still the back
      Cards.back(0, 0, 1);
      ctx.save(); ctx.beginPath(); ctx.rect(-4, -4, CARD_W + 8, (CARD_H + 8) * reveal); ctx.clip();
      Cards.draw(d.c, 0, 0, { hover: hovered, flat: reveal < 1 });
      ctx.restore();
      if (reveal < 1) {
        const ly = Math.round(CARD_H * reveal);
        for (let j = 0; j < 8; j++) Gfx.rect(Math.round(4 + ((j * 37 + this.t * 300) % (CARD_W - 8))), ly - 1, 3, 3, j % 2 ? '#ffe98a' : '#fffaea');
      }
    }
    ctx.restore();
    // the rare ones glitter as they land
    if (reveal >= 1 && (d.c.def.rarity === 'rare' || d.c.def.rarity === 'band') && chance(0.3)) Particles.sparkle(x + rnd(0, CARD_W), y + rnd(0, CARD_H), 1, ['#ffe98a', '#ffffff']);
  }
  draw() {
    this.drawField();
    Gfx.rectA(0, 0, W, H, '#120c16', 0.32);
    Particles.draw(Gfx.ctx, false);
    const title = this.o.boss ? `${this.o.boss} IS BEATEN` : 'VICTORY', tw = Gfx.measure(title, 3, 'rock') + 50;
    PixUI.panel('stone', W / 2 - tw / 2, 14, tw, 52, { seed: 3 });
    Gfx.text(title, W / 2, 26, { color: '#9c3510', align: 'center', scale: 3, font: 'rock' });
    if (this.o.gems) {
      PixUI.panel('obsidian', W / 2 - 60, 72, 120, 30, { seed: 4 });
      HUD.gem(W / 2 - 34, 87, 1);
      Gfx.text(`+${this.o.gems}`, W / 2 + 6, 80, { color: HUD.C.gem, scale: 1.4, font: 'rock' });
    }
    let y = 110;
    if (this.o.relics.length && !this.relicTaken) {
      let x = W / 2 - (this.o.relics.length * 300 - 20) / 2;
      for (const id of this.o.relics) {
        const r = RELICS[id], hov = UI.hovered(x, y, 280, 62);
        PixUI.panel(hov ? 'woodhot' : 'wood', x, y, 280, 62, { seed: 2, hot: hov });
        Gfx.sprite(r.spr, x + 14, y + 18, { anchor: 'tl' });
        Gfx.text(r.name, x + 46, y + 9, { color: '#ffe98a' });
        Gfx.textWrap(r.desc, x + 46, y + 24, 224, { color: '#e8dfc6', lineHeight: 11 });
        UI.hit(x, y, 280, 62, () => { Relics.give(id); this.relicTaken = true; });
        x += 300;
      }
    }
    if (!this.cardTaken || this.picked) {
      // the deck they come off
      if (!this.picked) { for (let i = 0; i < 3; i++) Cards.back(W / 2 - CARD_W / 2 + i * 2, H - 40 - i * 3, 1); }
      let zoom = null;
      this.deal.forEach((d, i) => {
        const S = this.slot(i), ready = d.done && !this.picked, hov = ready && UI.hovered(S.x, S.y, CARD_W, CARD_H);
        this.drawDealt(d, i, hov);
        if (hov) zoom = { c: d.c, x: S.x + CARD_W / 2 + (S.x < W / 2 ? 170 : -170), y: S.y + CARD_H / 2 };
        if (ready) UI.hit(S.x, S.y, CARD_W, CARD_H, () => { if (this.picked) return; Game.run.deck.push(d.c); this.picked = d; this.pickT = 0; AudioSys.sfx('unlock'); setTimeout(() => { this.cardTaken = true; this.picked = null; }, 520); });
      });
      if (this.deal.every(d => d.done) && !this.picked) HUD.button(W / 2 - 50, 206 + CARD_H + 16, 100, 30, 'SKIP', () => { this.cardTaken = true; });
      if (zoom) Cards.zoom(zoom.c, zoom.x, zoom.y);
    } else HUD.button(W / 2 - 100, H - 62, 200, 46, this.o.kind === 'boss' ? 'ONWARD' : 'BACK TO THE ROAD', () => Game.afterReward(this.o), { scale: 1.2, hot: true });
  }
  click() { }
}
