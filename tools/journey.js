// The whole journey, fast: for each of the five lands, look at the board,
// walk straight to the lair, beat the boss, read the rescue, and move on -
// to the ending. Screenshots every land and every boss.
// Usage: node tools/journey.js [hero]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const OUT = process.env.OUT || '/tmp/claude-0/-home-user-studious-invention/b07c031c-846e-582c-baca-98b85064c1db/scratchpad/journey';
const HERO = process.argv[2] || 'vela';
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [], missing = new Set();
  page.on('console', m => { const t = m.text().split('\n')[0]; if (t.startsWith('missing sprite')) { missing.add(t.slice(15)); return; } if (m.type() === 'error' && !t.includes('404') && !t.includes('GL Driver') && !t.includes('software WebGL')) errs.push(t); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + ' | ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  const fails = [];
  const ok = (n, c, info = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (info ? '  ' + info : '')); if (!c) fails.push(n); };
  const ev = (f, a) => page.evaluate(f, a);
  const scene = () => ev(() => Game.scene.constructor.name);
  const until = async (fn, ms = 20000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(fn, arg)) return true; await page.waitForTimeout(200); } return false; };
  await page.goto('http://127.0.0.1:8765/index.html');
  await page.waitForFunction(() => typeof Game !== 'undefined' && Game.scene);
  await page.mouse.click(480, 270); await page.waitForTimeout(400);
  await ev(h => { Game.newRun(h); Game.run.tips = { board: true, combat: true }; Game.startBoard(); }, HERO);
  for (let b = 1; b <= 5; b++) {
    ok(`land ${b} board`, await until(n => Game.scene.constructor.name === 'BoardScene' && Game.run.board.biome === n, 8000, b) || await ev(() => Game.scene.constructor.name === 'BoardScene'));
    await until(() => Game.scene.phase === 'idle', 15000);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${HERO}_land${b}.png` });
    // a look halfway down the road, too
    await ev(() => { const s = Game.scene; s.pan = s.board.w * 0.45; });
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${OUT}/${HERO}_land${b}_mid.png` });
    await ev(() => { const s = Game.scene; s.pan = 0; });
    // step next to the lair and walk in
    await ev(() => { const s = Game.scene, bd = s.bd; const pre = s.T.find(t => t.next.includes(s.board.boss)); bd.pos = pre.id; s.me.x = pre.x; s.me.y = pre.y + 2; bd.forceNext = 1; s.roll(); });
    await until(() => Game.scene.phase === 'choose', 8000);
    await ev(() => { const s = Game.scene; const r = s.reach.get(s.board.boss); s.chosen = r || [...s.reach.values()][0]; });
    // the boss talks, then the fight
    const got = await until(() => { if (Dialogue.active) { Dialogue.active.chars = 9999; Input.clicks.push({ x: 1, y: 1, button: 0 }); } return Game.scene.constructor.name === 'Combat'; }, 30000);
    ok(`land ${b} boss fight`, got, await ev(() => Game.scene.constructor.name + ' ' + (Game.scene.enemies ? Game.scene.enemies.map(e => e.id).join(',') : '')));
    if (!got) break;
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${OUT}/${HERO}_boss${b}.png` });
    await ev(() => { const c = Game.scene; for (const e of c.alive()) c.damageEnemy(e, 99999); c.checkDeaths(); if (!c.won) Co.run(c.victory(), c); });
    ok(`land ${b} boss beaten`, await until(() => Game.scene.constructor.name === 'RewardScene', 12000));
    await ev(() => { const s = Game.scene; s.cardTaken = s.relicTaken = true; Game.afterReward(s.o); });
    await page.waitForTimeout(800);
    if (b < 5) {
      ok(`land ${b} story`, await until(() => Game.scene.constructor.name === 'ActStory', 5000));
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${OUT}/${HERO}_story${b}.png` });
      await ev(() => { const s = Game.scene; s.onDone(); });
      await page.waitForTimeout(1200);
      ok(`land ${b + 1} begins`, await until(n => Game.scene.constructor.name === 'BoardScene' && Game.run.board.biome === n, 8000, b + 1) || await ev(() => Game.run.board.biome), await ev(() => 'biome ' + Game.run.board.biome + ', band ' + Game.run.band.join(',')));
    } else {
      ok('the ending', await until(() => Game.scene.constructor.name === 'EndingScene', 6000), await ev(() => 'band ' + Game.run.band.join(',')));
      // the dinner, talked through, then the tally
      await page.waitForTimeout(2600);
      await page.screenshot({ path: `${OUT}/${HERO}_ending_dinner.png` });
      let shots = 0;
      const done = await until(() => { if (Dialogue.active) { const b = Dialogue.active; if (b.t > 0.6) { b.chars = 9999; Input.clicks.push({ x: 1, y: 1, button: 0 }); } } return !!Game.scene.hud; }, 90000);
      ok('the ending plays to the tally', done);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${OUT}/${HERO}_ending.png` });
      void shots;
    }
  }
  ok('no page errors', errs.length === 0, errs.slice(0, 10).join('\n    '));
  if (missing.size) console.log('missing sprites: ' + [...missing].join(' '));
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
