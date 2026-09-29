// Plays the board and its fights on its own for a few minutes and reports
// what grows: caches, lists, coroutines, heap, frame time. A healthy game
// stays flat. Usage: node tools/soak.js [minutes]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const MIN = +(process.argv[2] || 4);
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  // count sound sources that are playing, so a voice leak shows up
  await page.addInitScript(() => {
    window.__live = 0; window.__made = 0;
    for (const C of [window.AudioBufferSourceNode, window.OscillatorNode]) {
      const st = C.prototype.start;
      C.prototype.start = function (...a) { window.__live++; window.__made++; this.addEventListener('ended', () => window.__live--); return st.apply(this, a); };
    }
  });
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://127.0.0.1:8765/index.html');
  await page.waitForFunction(() => typeof Game !== 'undefined' && Game.scene);
  await page.mouse.click(480, 270); await page.waitForTimeout(300);
  await page.evaluate(() => {
    Game.newRun('roxy'); Game.run.tips = { board: true, combat: true }; Game.run.hp = Game.run.maxHp = 9999; Game.startBoard();
    // frame timing
    window.__ft = []; let last = performance.now();
    (function tick(t) { window.__ft.push(t - last); last = t; if (window.__ft.length > 300) window.__ft.shift(); requestAnimationFrame(tick); })(last);
  });
  const sample = () => page.evaluate(() => {
    const ft = window.__ft.slice().sort((a, b) => a - b);
    return {
      scene: Game.scene.constructor.name, co: Co.list.length, part: Particles.list.length, pop: Popups.list.length, fx: FX.list.length,
      toon: Toon.list.length, emo: Emotes.list.length, tint: Gfx.tintCache.size, outl: Gfx.outlineCache.size, spr: Gfx.spriteCache.size,
      heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : -1,
      ms50: ft[ft.length >> 1] | 0, ms95: ft[Math.floor(ft.length * 0.95)] | 0,
      audio: window.__live, made: window.__made, actx: AudioSys.ctx ? AudioSys.ctx.state : '-', fights: Game.run ? Game.run.fights : 0,
    };
  });
  const t0 = Date.now(); let next = 0;
  while (Date.now() - t0 < MIN * 60000) {
    await page.waitForTimeout(250);
    await page.evaluate(() => {
      const s = Game.scene, n = s.constructor.name;
      if (Game.overlay) { const o = Game.overlay, on = o.constructor.name; if (on === 'CardOfferOverlay') o.close(o.cards[0]); else if (on === 'DeckOverlay') { if (o.o.onPick) o.o.onPick(o.cards[0]); else o.close(); } else if (on === 'TraderOverlay') o.close(); else Game.overlay = null; return; }
      if (Dialogue.active) { Dialogue.active.chars = 999; Input.clicks.push({ x: 1, y: 1, button: 0 }); return; }
      if (n === 'Combat') {
        if (s.riff) { s.riff.done = true; return; }
        // play cards for real for a while, then finish it
        if (!s.busy && s.phase === 'player') { const c = s.hand.find(c => s.canPlay(c) && !c.def.riff); if (c && s.turn < 3) { s.selectCard(c); if (s.selected) s.play(c, s.alive()[0]); } else if (s.turn < 3) s.endTurn(); else { for (const e of s.alive()) s.damageEnemy(e, 9999); s.checkDeaths(); Co.run(s.victory(), s); } }
        return;
      }
      if (n === 'RewardScene') { s.cardTaken = s.relicTaken = true; Game.afterReward(s.o); return; }
      if (n === 'ActStory') { s.onDone(); return; }
      if (n === 'GameOverScene' || n === 'EndingScene' || n === 'CutsceneScene') { Game.newRun('roxy'); Game.run.tips = { board: true, combat: true }; Game.run.hp = Game.run.maxHp = 9999; Game.startBoard(); return; }
      if (n !== 'BoardScene') return;
      if (s.riff) { s.riff.o.onDone({ grade: 'A', acc: 0.8, hits: 10, notes: 10, sick: 5, fc: false, mult: 1 }); s.riff = null; return; }
      if (s.stage && s.stage.choices) { if (s.stage.choiceT > 0.4) { const i = s.stage.choices.findIndex(c => c.ok !== false); s.stage.pick = Math.max(0, i); } return; }
      if (s.panel) { const P = s.panel; if (P.mode === 'choose') { const i = (P.choices || []).findIndex(c => c.ok !== false); P.pick = Math.max(0, i); } else if (P.mode === 'result') { P.t = 1; P.done = true; } return; }
      if (s.dieChoice) { s.dieChoice.pick = 0; return; }
      if (s.phase === 'idle') s.roll();
      else if (s.phase === 'choose' && s.reach.size) s.chosen = [...s.reach.values()][Math.floor(Math.random() * s.reach.size)];
      else if (s.phase === 'number') s.numberPick = 3;
    });
    if (Date.now() - t0 >= next) { next += 30000; console.log(Math.round((Date.now() - t0) / 1000) + 's', JSON.stringify(await sample())); }
  }
  console.log('errors:', errs.length ? errs.slice(0, 5).join(' | ') : 'none');
  await browser.close();
})();
