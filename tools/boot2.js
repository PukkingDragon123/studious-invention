// Boots the rebuilt game and reports errors + the first frames.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const OUT = '/tmp/claude-0/-home-user-studious-invention/b07c031c-846e-582c-baca-98b85064c1db/scratchpad/v2';
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [], warns = new Set();
  page.on('console', m => { const t = m.text().split('\n')[0]; if (m.type() === 'error') errs.push(t); else if (m.type() === 'warning') warns.add(t); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + ' | ' + (e.stack || '').split('\n')[1]));
  await page.goto('http://127.0.0.1:8765/index2.html');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/01_boot.png` });
  await page.mouse.click(640, 360); await page.waitForTimeout(900);
  console.log('scene:', await page.evaluate(() => Game.scene.constructor.name), '| audio:', await page.evaluate(() => AudioSys.ctx && AudioSys.ctx.state));
  await page.screenshot({ path: `${OUT}/02_title.png` });
  // straight into the village, skipping the cutscene, to exercise the overworld
  await page.evaluate(() => { Game.newRun(); Game.startVillage(); });
  await page.waitForTimeout(1200);
  console.log('scene:', await page.evaluate(() => Game.scene.constructor.name));
  await page.screenshot({ path: `${OUT}/03_village.png` });
  // walk around
  for (const k of ['ArrowRight', 'ArrowRight', 'ArrowDown']) { await page.keyboard.down(k); await page.waitForTimeout(700); await page.keyboard.up(k); }
  await page.screenshot({ path: `${OUT}/04_walk.png` });
  console.log('player:', await page.evaluate(() => { const s = Game.scene; return JSON.stringify({ x: Math.round(s.player.x), y: Math.round(s.player.y), stam: Math.round(Game.run.stamina), ents: s.zone.entities.length, objs: s.zone.objects.length }); }));
  // a fight
  await page.evaluate(() => { Game.run.act = 1; Game.enterFight(['compy', 'dodo'], 'normal'); });
  await page.waitForTimeout(2600);
  console.log('scene:', await page.evaluate(() => Game.scene.constructor.name + ' phase=' + Game.scene.phase));
  await page.screenshot({ path: `${OUT}/05_combat.png` });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/06_combat_hand.png` });
  // play an attack card and auto-play the riff perfectly
  await page.evaluate(() => {
    window.__auto = setInterval(() => {
      const s = Game.scene; if (!s || !s.riff || s.riff.done) return;
      const r = s.riff, now = Riff.now();
      for (const n of r.mine) if (!n.judged && now >= n.time - 0.004) { window.dispatchEvent(new KeyboardEvent('keydown', { code: LANE_KEYS[n.lane][0] })); }
    }, 4);
  });
  const played = await page.evaluate(() => { const s = Game.scene; const c = s.hand.find(c => c.def.riff); if (!c) return null; s.play(c, s.alive()[0]); return c.name; });
  console.log('played:', played);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/07_riff.png` });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/08_riff2.png` });
  await page.waitForTimeout(3000);
  console.log('after riff:', await page.evaluate(() => { const s = Game.scene; return s.constructor.name === 'Combat' ? JSON.stringify({ phase: s.phase, energy: s.energy, hype: Math.round(s.hype), enemies: s.enemies.map(e => e.name + ':' + e.hp), last: s.riff ? 'riffing' : 'done' }) : s.constructor.name; }));
  await page.screenshot({ path: `${OUT}/09_after.png` });
  console.log('\nERRORS (' + errs.length + '):'); console.log([...new Set(errs)].slice(0, 12).join('\n'));
  console.log('missing sprites:', [...warns].filter(w => w.includes('missing sprite')).length);
  await browser.close();
})();
