const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const OUT = '/tmp/claude-0/-home-user-studious-invention/b07c031c-846e-582c-baca-98b85064c1db/scratchpad/intro';
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().split('\n')[0]); });
  await page.goto('http://127.0.0.1:8765/index.html'); await page.waitForTimeout(600);
  await page.mouse.click(480, 270); await page.waitForTimeout(600);
  await page.evaluate(() => { Game.newRun(); Game.go(new CutsceneScene(introScript, {})); });
  // hammer inputs so every mini-game resolves, and log the beat we are on
  await page.evaluate(() => {
    window.__log = [];
    window.__t = setInterval(() => {
      const s = Game.scene;
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      Input.clicks.push({ x: 700, y: 300, button: 0, at: 0 });
      Input.held['KeyD'] = true; Input.held['Space'] = true;
      const k = (s && s.set) + '/' + (Game.mini ? Game.mini.constructor.name : 'scene');
      if (window.__log[window.__log.length - 1] !== k) window.__log.push(k);
    }, 30);
  });
  for (let i = 0; i < 34; i++) {
    await page.waitForTimeout(5000);
    const st = await page.evaluate(() => ({ scene: Game.scene && Game.scene.constructor.name, set: Game.scene && Game.scene.set, mini: Game.mini && Game.mini.constructor.name }));
    await page.screenshot({ path: `${OUT}/${String(i).padStart(2, '0')}_${st.mini || st.set || st.scene}.png` });
    console.log(i * 5 + 's', JSON.stringify(st));
    if (st.scene === 'VillageScene') { console.log('reached the village'); break; }
  }
  console.log('beats:', JSON.stringify(await page.evaluate(() => window.__log)));
  console.log('ERRORS (' + errs.length + '):\n' + [...new Set(errs)].slice(0, 14).join('\n'));
  await b.close();
})();
