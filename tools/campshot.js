// Walks the campfire cutscene and shoots every beat of it.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const OUT = process.env.OUT || '/tmp/claude-0/-home-user-studious-invention/b07c031c-846e-582c-baca-98b85064c1db/scratchpad/camp';
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().split('\n')[0]); });
  await page.goto('http://127.0.0.1:8765/index.html'); await page.waitForTimeout(600);
  await page.mouse.click(480, 270); await page.waitForTimeout(600);
  await page.evaluate(() => { Game.newRun(); Game.go(new CutsceneScene(campfireScript, { heal: 26 })); });
  // advance the dialogue, but leave a gap so each beat gets a frame
  await page.evaluate(() => {
    window.__t = setInterval(() => { if (Dialogue.active) Input.clicks.push({ x: 480, y: 480, button: 0, at: 0 }); }, 900);
  });
  for (let i = 0; i < 26; i++) {
    await page.waitForTimeout(1800);
    const st = await page.evaluate(() => ({ scene: Game.scene && Game.scene.constructor.name }));
    await page.screenshot({ path: `${OUT}/${String(i).padStart(2, '0')}.png` });
    if (st.scene !== 'CutsceneScene') { console.log('left the scene at', i, '->', st.scene); break; }
  }
  console.log('ERRORS (' + errs.length + '):\n' + [...new Set(errs)].slice(0, 12).join('\n'));
  await b.close();
})();
