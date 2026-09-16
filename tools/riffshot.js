// Captures the note field mid-riff at a few moments.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const OUT = '/tmp/claude-0/-home-user-studious-invention/b07c031c-846e-582c-baca-98b85064c1db/scratchpad/v2';
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://127.0.0.1:8765/index.html'); await page.waitForTimeout(500);
  await page.mouse.click(640, 360); await page.waitForTimeout(500);
  await page.evaluate(() => { Game.newRun(); Game.run.act = 2; Game.enterFight(['raptor', 'lizard'], 'normal'); });
  await page.waitForTimeout(3200);
  // a duel card exercises the call-and-response field
  await page.evaluate(() => {
    const s = Game.scene; const c = Cards.make('duel_riff'); s.hand.push(c); s.energy = 9;
    window.__auto = setInterval(() => {
      const r = Game.scene.riff; if (!r || r.done) return;
      const now = Riff.now();
      for (const n of r.mine) if (!n.judged && now >= n.time - 0.006 && Math.random() < 0.9) window.dispatchEvent(new KeyboardEvent('keydown', { code: LANE_KEYS[n.lane][0] }));
    }, 4);
    s.play(c, s.alive()[0]);
  });
  for (let i = 0; i < 7; i++) { await page.waitForTimeout(900); await page.screenshot({ path: `${OUT}/riff_${i}.png` }); }
  console.log('riff result:', await page.evaluate(() => { const s = Game.scene; return JSON.stringify(s.riff ? { active: true, combo: s.riff.combo, notes: s.riff.total } : { done: true, hp: s.enemies.map(e => e.hp) }); }));
  console.log('errors:', errs.slice(0, 5));
  await browser.close();
})();
