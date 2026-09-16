// Drives the opening cutscene and its mini-games.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const OUT = '/tmp/claude-0/-home-user-studious-invention/b07c031c-846e-582c-baca-98b85064c1db/scratchpad/v2';
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().split('\n')[0]); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + ' | ' + (e.stack || '').split('\n')[1]));
  await page.goto('http://127.0.0.1:8765/index2.html');
  await page.waitForTimeout(500);
  await page.mouse.click(640, 360); await page.waitForTimeout(600);
  await page.evaluate(() => Game.newRun());
  // auto-advance dialogue and auto-play every mini-game
  await page.evaluate(() => {
    window.__shots = [];
    window.__auto = setInterval(() => {
      if (Dialogue.active && Dialogue.active.chars >= Dialogue.active.text.length && !Dialogue.active.choices) {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      }
      const m = Game.mini;
      if (m && m.intro <= 0 && !m.done) {
        const n = m.constructor.name;
        if (n === 'BellowsGame') { if (Math.random() < 0.5) m.press(m.side); }
        else if (n === 'FeastGame') m.bite();
        else if (n === 'ShowerGame') { Input.held['Space'] = m.temp < m.target; }
        else if (n === 'DriveGame') { if (Math.random() < 0.25) m.pedalNow(true); const o = m.obstacles.find(o => o.x > 200 && o.x < 460 && o.lane === m.lane); if (o) m.lane = (m.lane + 1) % 3; }
      }
      const s = Game.scene;
      if (s && s.constructor.name === 'CutsceneScene') window.__beat = s.set + '/' + Math.round(s.t);
    }, 40);
  });
  const shots = ['kitchen', 'bellows', 'feast', 'shower', 'drive', 'trex', 'wreck', 'chase', 'elder'];
  for (let i = 0; i < 26; i++) {
    await page.waitForTimeout(2600);
    const st = await page.evaluate(() => { const s = Game.scene; return { n: s.constructor.name, set: s.set, mini: Game.mini && Game.mini.constructor.name, t: Math.round(s.t || 0) }; });
    if (i % 3 === 0 || st.mini) await page.screenshot({ path: `${OUT}/intro_${String(i).padStart(2, '0')}_${st.mini || st.set || st.n}.png` });
    console.log(i, JSON.stringify(st));
    if (st.n !== 'CutsceneScene') break;
  }
  console.log('final scene:', await page.evaluate(() => Game.scene.constructor.name));
  console.log('ERRORS:', [...new Set(errs)].slice(0, 10).join('\n') || 'none');
  await browser.close();
})();
