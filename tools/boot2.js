// Boots the game the way a player does - title, hero select, the opening -
// then drops into a fight from the board with each hero and wins it, and
// reports every error on the way. Usage: node tools/boot2.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const OUT = process.env.OUT || '/tmp/claude-0/-home-user-studious-invention/b07c031c-846e-582c-baca-98b85064c1db/scratchpad/v3';
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [], missing = new Set();
  page.on('console', m => { const t = m.text().split('\n')[0]; if (t.startsWith('missing sprite')) { missing.add(t.slice(15)); return; } if (m.type() === 'error' && !t.includes('404')) errs.push(t); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + ' | ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  const fails = [];
  const ok = (n, c, info = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (info ? '  ' + info : '')); if (!c) fails.push(n); };
  const ev = (f, a) => page.evaluate(f, a);
  const scene = () => ev(() => Game.scene.constructor.name);
  await page.goto('http://127.0.0.1:8765/index.html');
  await page.waitForFunction(() => typeof Game !== 'undefined' && Game.scene);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/01_boot.png` });
  await page.mouse.click(480, 270); await page.waitForTimeout(900);
  ok('title after a press', await scene() === 'TitleScene');
  ok('post pass', true, await ev(() => Post.on ? 'webgl on' : 'off (' + (Post.failed ? 'unavailable' : 'disabled') + ')'));
  await page.screenshot({ path: `${OUT}/02_title.png` });
  await page.keyboard.press('Enter'); await page.waitForTimeout(1200);
  ok('hero select from START', await scene() === 'HeroSelectScene');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/03_heroes.png` });
  await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
  ok('the opening starts with the chosen hero', await scene() === 'CutsceneScene' && await ev(() => Game.run.hero) === 'pebble');
  await page.screenshot({ path: `${OUT}/04_opening.png` });
  await ev(() => { Game.run.tips = { board: true, combat: true }; Game.startBoard(); });
  await page.waitForTimeout(1600);
  ok('the board', await scene() === 'BoardScene');
  // a fight with every hero
  for (const hero of ['bronk', 'vela', 'pebble', 'roxy']) {
    await ev(h => { const H = Heroes.get(h); const r = Game.run; r.hero = h; r.hp = r.maxHp = H.hp; r.deck = H.deck.map(id => Cards.make(id)); r.relics = [H.relic]; r.board.touched = { wet: 2, stone: 1 }; Game.enterFight(['raptor', 'compy'], 'normal', { terrain: 'wet', touched: { wet: 2, stone: 1 } }); }, hero);
    await page.waitForTimeout(3600);
    const st = await ev(() => { const c = Game.scene; return { n: c.constructor.name, hand: c.hand && c.hand.length, e: c.energy, sp: c.me && c.me.sprite, touched: c.touched && JSON.stringify(c.touched) }; });
    ok(`${hero} fights`, st.n === 'Combat' && st.hand >= 5, JSON.stringify(st));
    await page.screenshot({ path: `${OUT}/05_fight_${hero}.png` });
    // play every card we can afford, riffs skipped, then win
    for (let i = 0; i < 6; i++) {
      await ev(() => { const c = Game.scene; if (c.riff) { c.riff.done = true; return; } if (c.busy || c.phase !== 'player') return; const card = c.hand.find(k => c.canPlay(k)); if (card) c.play(card, c.alive()[0]); });
      await page.waitForTimeout(700);
      await ev(() => { const c = Game.scene; if (c.riff) { c.riff.o.onDone({ grade: 'A', acc: 0.9, hits: 8, notes: 8, sick: 4, fc: false, mult: 1.2 }); c.riff = null; } });
    }
    await ev(() => { const c = Game.scene; if (c.constructor.name !== 'Combat') return; for (const e of c.alive()) c.damageEnemy(e, 9999); c.checkDeaths(); if (!c.won) Co.run(c.victory(), c); });
    await page.waitForTimeout(3600);
    ok(`${hero} wins to the reward`, await scene() === 'RewardScene', await ev(() => JSON.stringify({ gems: Game.run.gems })));
    await ev(() => { const s = Game.scene; if (s.o) { s.cardTaken = s.relicTaken = true; Game.afterReward(s.o); } });
    await page.waitForTimeout(1500);
    ok(`${hero} back on the board`, await scene() === 'BoardScene');
  }
  // save and continue
  await ev(() => Game.save());
  await ev(() => Game.go(new TitleScene()));
  await page.waitForTimeout(300);
  await ev(() => Game.continueRun()); await page.waitForTimeout(1200);
  ok('continue puts you back on the board', await scene() === 'BoardScene');
  ok('no page errors', errs.length === 0, errs.slice(0, 10).join('\n    '));
  if (missing.size) console.log('missing sprites: ' + [...missing].join(' '));
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
