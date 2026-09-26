// A phone, held sideways: taps the whole way through a turn on the board and
// a card in a fight, with real touch events, and screenshots each step.
// Usage: node tools/touch.js [hero]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const OUT = process.env.OUT || '/tmp/claude-0/-home-user-studious-invention/b07c031c-846e-582c-baca-98b85064c1db/scratchpad/touch';
const HERO = process.argv[2] || 'roxy';
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { const t = m.text().split('\n')[0]; if (m.type() === 'error' && !t.includes('404') && !t.includes('GL Driver') && !t.includes('software WebGL')) errs.push(t); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  const fails = [];
  const ok = (n, c, info = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (info ? '  ' + info : '')); if (!c) fails.push(n); };
  const ev = (f, a) => page.evaluate(f, a);
  const until = async (fn, ms = 15000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(fn, arg)) return true; await page.waitForTimeout(150); } return false; };
  await page.goto('http://127.0.0.1:8765/index.html');
  await page.waitForFunction(() => typeof Game !== 'undefined' && Game.scene);
  // game pixels -> page pixels
  const box = await ev(() => { const r = document.getElementById('game').getBoundingClientRect(); return { x: r.x, y: r.y, k: r.width / W }; });
  const tap = (x, y) => page.touchscreen.tap(box.x + x * box.k, box.y + y * box.k);
  await tap(480, 270); await page.waitForTimeout(500);
  ok('touch is detected', await ev(() => Input.touch === true));
  await ev(h => { Game.newRun(h); Game.run.tips = { board: true, combat: true }; Game.startBoard(); }, HERO);
  ok('the board', await until(() => Game.scene.constructor.name === 'BoardScene' && Game.scene.phase === 'idle'));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${HERO}_1_board.png` });
  // ROLL, then the first lit tile
  const R = await ev(() => Game.scene.rollRect());
  await tap(R.x + R.w / 2, R.y + R.h / 2);
  ok('a tap on ROLL rolls', await until(() => Game.scene.phase === 'choose', 8000), await ev(() => 'phase ' + Game.scene.phase + ', moves ' + Game.scene.moves));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${HERO}_2_choose.png` });
  const from = await ev(() => Game.run.board.pos);
  const spot = await ev(() => { const s = Game.scene; const id = [...s.reach.keys()][0]; const t = s.T[id]; const p = s.cam.toScreen(t.x, t.y); return { id, x: p.x, y: p.y }; });
  await tap(spot.x, spot.y);
  ok('a tap on a lit tile walks there', await until(() => Game.scene.phase !== 'choose', 4000), `tile ${spot.id} at ${Math.round(spot.x)},${Math.round(spot.y)}`);
  await until(n => Game.run.board.pos === n || Game.scene.panel || Game.scene.constructor.name !== 'BoardScene', 12000, spot.id);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${HERO}_3_landed.png` });
  ok('moved along the road', await ev(a => Game.run.board.pos !== a || Game.scene.constructor.name !== 'BoardScene', from), await ev(() => 'pos ' + Game.run.board.pos));
  // a fight: tap a card to read it, tap again to play it
  await ev(() => { Game.overlay = null; Game.enterFight(['raptor'], 'normal'); });
  ok('a fight', await until(() => Game.scene.constructor.name === 'Combat' && Game.scene.phase === 'player' && !Game.scene.busy && Game.scene.hand.length > 0, 20000));
  await page.waitForTimeout(500);
  const pick = await ev(() => {
    const c = Game.scene, n = c.hand.length;
    const spacing = Math.min(CARD_W + 8, 560 / Math.max(1, n)), total = spacing * (n - 1) + CARD_W, x0 = W / 2 - total / 2, baseY = H - CARD_H - 20;
    let i = c.hand.findIndex(k => !k.def.riff && c.canPlay(k)); if (i < 0) i = 0;
    return { i, name: c.hand[i].def.name, x: x0 + i * spacing + Math.min(spacing, CARD_W) / 2, y: baseY + CARD_H / 2, energy: c.energy, n };
  });
  await tap(pick.x, pick.y); await page.waitForTimeout(350);
  ok('first tap reads the card', await ev(() => !!Game.scene.preview), pick.name);
  await page.screenshot({ path: `${OUT}/${HERO}_4_preview.png` });
  await tap(480, await ev(() => H - CARD_H * 1.35 / 2 - 10));      // the blown-up card sits centred
  const played = await until(p => Game.scene.energy < p.energy || Game.scene.hand.length < p.n, 5000, pick);
  ok('second tap plays it', played, await ev(() => 'energy ' + Game.scene.energy + ', hand ' + Game.scene.hand.length));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${HERO}_5_played.png` });
  ok('no page errors', errs.length === 0, errs.slice(0, 8).join('\n    '));
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
