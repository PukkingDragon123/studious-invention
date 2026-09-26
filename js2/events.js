// ---------------------------------------------------------------------------
// events.js - what you get for winning a fight
// ---------------------------------------------------------------------------
'use strict';

class RewardScene {
  constructor(o) { this.o = o; this.t = 0; this.cardTaken = !o.cards.length; this.relicTaken = !o.relics.length; }
  enter() {
    AudioSys.play('mammoth', { fade: 0.9 });
    Game.run.gems = (Game.run.gems || 0) + this.o.gems;
    if (this.o.gems) AudioSys.sfx('gem');
    for (let i = 0; i < 26; i++) Particles.confetti(rnd(0, W), -10, 1);
  }
  exit() { }
  update(dt) { this.t += dt; if (Input.pressed('Escape')) Game.pause(); }
  draw() {
    const b = (Game.run.board && Game.run.board.biome) || 1, B = BIOMES[b], H0 = Heroes.cur();
    World.skyRamp(0, W, 0, 400, B.sky);
    Gfx.rect(0, 400, W, 140, GROUND[B.ground].ramp[2]);
    Gfx.rect(0, 400, W, 4, GROUND[B.ground].ramp[4]);
    const play = Heroes.has(Game.run.hero, 'play') ? Heroes.spr(Game.run.hero, 'play') : Heroes.spr(Game.run.hero);
    Gfx.shadow(120, 422, 80, 0.3);
    Gfx.sprite(play, 120, 424, { anchor: 'bc', frame: Math.floor(this.t * 6), scale: 2 });
    Post.grade(b);
    Post.ui();
    Particles.draw(Gfx.ctx, false);
    Gfx.text(this.o.boss ? `${this.o.boss} IS BEATEN` : 'THE BEASTS SCATTER', W / 2, 22, { color: '#ffe98a', align: 'center', scale: 3, outline: true, outlineWidth: 2 });
    if (this.o.gems) {
      HUD.plate(W / 2 - 70, 64, 140, 32, { gold: false, accent: HUD.C.gem });
      HUD.gem(W / 2 - 44, 80, 1);
      HUD.text(`+${this.o.gems} GEM${this.o.gems > 1 ? 'S' : ''}`, W / 2 - 28, 74, { color: HUD.C.gem, scale: 1.3 });
    }
    let y = 112;
    if (this.o.relics.length && !this.relicTaken) {
      Gfx.text(this.o.relics.length > 1 ? 'TAKE ONE TROPHY' : 'TROPHY', W / 2, y, { color: '#fffaea', align: 'center', outline: true });
      let x = W / 2 - (this.o.relics.length * 300 - 20) / 2;
      for (const id of this.o.relics) {
        const r = RELICS[id], hov = UI.hovered(x, y + 18, 280, 62);
        HUD.plate(x, y + 18, 280, 62, { hot: hov });
        Gfx.sprite(r.spr, x + 10, y + 36, { anchor: 'tl' });
        Gfx.text(r.name, x + 40, y + 26, { color: '#ffe98a' });
        Gfx.textWrap(r.desc, x + 40, y + 40, 230, { color: '#d6cfe0', lineHeight: 11 });
        UI.hit(x, y + 18, 280, 62, () => { Relics.give(id); this.relicTaken = true; });
        x += 300;
      }
      y += 92;
    }
    if (!this.cardTaken) {
      Gfx.text('LEARN A CARD', W / 2, y, { color: '#fffaea', align: 'center', outline: true });
      const n = this.o.cards.length, sp = CARD_W + 30;
      let x = W / 2 - (n * sp - 30) / 2, zoom = null;
      for (const c of this.o.cards) {
        const hov = UI.hovered(x, y + 20, CARD_W, CARD_H);
        Cards.draw(c, x, y + 20, { hover: hov });
        if (hov) zoom = { c, x: x + CARD_W / 2 + (x < W / 2 ? 170 : -170), y: y + 20 + CARD_H / 2 };
        UI.hit(x, y + 20, CARD_W, CARD_H, () => { Game.run.deck.push(c); this.cardTaken = true; AudioSys.sfx('unlock'); });
        x += sp;
      }
      HUD.button(W / 2 - 50, y + 26 + CARD_H, 100, 30, 'SKIP', () => { this.cardTaken = true; });
      if (zoom) Cards.zoom(zoom.c, zoom.x, zoom.y);
    } else HUD.button(W / 2 - 100, H - 62, 200, 46, this.o.kind === 'boss' ? 'ONWARD' : 'BACK TO THE ROAD', () => Game.afterReward(this.o), { scale: 1.2, hot: true });
    void H0;
  }
  click() { }
}
