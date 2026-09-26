// Plays the opening start to finish, clicking through the talking, and
// screenshots it every couple of seconds. Usage: node tools/intro3.js [hero]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const OUT = process.env.OUT || '/tmp/claude-0/-home-user-studious-invention/b07c031c-846e-582c-baca-98b85064c1db/scratchpad/intro';
const HERO = process.argv[2] || 'bronk';
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [], missing = new Set();
  page.on('console', m => { const t = m.text().split('\n')[0]; if (t.startsWith('missing sprite')) { missing.add(t.slice(15)); return; } if (m.type() === 'error') errs.push(t); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + ' | ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  await page.goto('http://127.0.0.1:8765/index.html');
  await page.waitForFunction(() => typeof Game !== 'undefined' && Game.scene);
  await page.mouse.click(480, 270); await page.waitForTimeout(300);
  await page.evaluate(h => Game.newRun(h), HERO);
  const t0 = Date.now(); let n = 0, lastShot = 0;
  while (Date.now() - t0 < 170000) {
    await page.waitForTimeout(250);
    const st = await page.evaluate(() => {
      const s = Game.scene;
      if (Dialogue.active) { const b = Dialogue.active; if (b.t > 0.9) { b.chars = 9999; Input.clicks.push({ x: 1, y: 1, button: 0 }); } }
      return s.constructor.name;
    });
    if (Date.now() - lastShot > 2200) { lastShot = Date.now(); await page.screenshot({ path: `${OUT}/${HERO}_${String(n++).padStart(2, '0')}.png` }); }
    if (st !== 'CutsceneScene') { console.log('left the opening for', st, 'after', Math.round((Date.now() - t0) / 1000) + 's'); break; }
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${HERO}_zz_end.png` });
  console.log('errors:', errs.length ? errs.slice(0, 10).join('\n  ') : 'none');
  if (missing.size) console.log('missing sprites:', [...missing].join(' '));
  await browser.close();
})();
