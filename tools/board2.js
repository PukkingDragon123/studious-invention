// Board game smoke test: boots, picks a hero, skips the opening, and plays
// the board for a while through the live objects - rolling, choosing routes,
// answering panels, closing overlays, winning fights - screenshotting as it
// goes. Usage: node tools/board2.js [hero] [rolls]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const OUT = process.env.OUT || '/tmp/claude-0/-home-user-studious-invention/b07c031c-846e-582c-baca-98b85064c1db/scratchpad/board';
const HERO = process.argv[2] || 'bronk', ROLLS = +(process.argv[3] || 14);
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  const missing = new Set();
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') { const t = m.text().split('\n')[0]; if (t.startsWith('missing sprite')) { missing.add(t.slice(15)); return; } if (!t.includes('404') && !t.includes('GL Driver')) errs.push(m.type() + ': ' + t); } });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + ' | ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  await page.goto('http://127.0.0.1:8765/index.html');
  await page.waitForFunction(() => typeof Game !== 'undefined' && Game.scene);
  await page.mouse.click(480, 270); await page.waitForTimeout(300);
  const ev = fn => page.evaluate(fn);
  const shot = n => page.screenshot({ path: `${OUT}/${HERO}_${n}.png` });
  const fails = [];
  const ok = (n, cond, info = '') => { console.log((cond ? 'PASS ' : 'FAIL ') + n + (info ? '  ' + info : '')); if (!cond) fails.push(n); };

  await page.evaluate(h => Game.newRun(h), HERO);
  await page.waitForTimeout(1200);
  ok('opening starts', await ev(() => Game.scene.constructor.name) === 'CutsceneScene');
  await shot('00_intro');
  await ev(() => { Game.run.tips = { board: true, combat: true }; Game.startBoard(); });
  await page.waitForTimeout(1500);
  let r = await ev(() => { const s = Game.scene; return { n: s.constructor.name, tiles: s.T && s.T.length, forks: s.board && s.board.forks.length, spurs: s.board && s.board.spurs.length, w: s.board && s.board.w }; });
  ok('board builds', r.n === 'BoardScene' && r.tiles > 30, JSON.stringify(r));
  // the arrival pan runs first; let it finish
  for (let i = 0; i < 40 && await ev(() => Game.scene.phase) !== 'idle'; i++) await page.waitForTimeout(250);
  await shot('01_board');
  let fights = 0, panels = 0, moved = 0;
  for (let roll = 0; roll < ROLLS; roll++) {
    const sc = await ev(() => Game.scene.constructor.name);
    if (sc !== 'BoardScene') { ok('still on the board at roll ' + roll, false, sc); break; }
    await ev(() => { if (Game.overlay) Game.overlay = null; Game.scene.roll(); });
    // wait for the choice (or a die pick for two-dice heroes)
    let ph = '';
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(150);
      ph = await ev(() => Game.scene.phase);
      if (ph === 'pickdie') await ev(() => { Game.scene.dieChoice.pick = 0; });
      if (ph === 'number') await ev(() => { Game.scene.numberPick = 4; });
      if (ph === 'choose') break;
    }
    if (roll === 0) await shot('02_choose');
    const pick = await ev(() => {
      const s = Game.scene;
      const keys = [...s.reach.keys()];
      if (!keys.length) { s.chosen = { route: [s.bd.pos], dir: 1 }; return 'none'; }
      // go forward if we can, the long way round sometimes
      let best = keys.filter(k => s.reach.get(k).dir > 0);
      if (!best.length) best = keys;
      const k = best[Math.floor(Math.random() * best.length)];
      s.chosen = s.reach.get(k);
      return s.T[k].kind + '/' + s.terrainOf(s.T[k]);
    });
    moved++;
    // play out whatever happens: panels, overlays, fights, rewards
    for (let i = 0; i < 120; i++) {
      await page.waitForTimeout(200);
      const st = await ev(() => {
        const s = Game.scene, n = s.constructor.name;
        if (Game.overlay) {
          const o = Game.overlay, on = o.constructor.name;
          if (on === 'CardOfferOverlay') o.close(o.cards[0]);
          else if (on === 'DeckOverlay') { if (o.o.onPick) o.o.onPick(o.cards[0]); else o.close(); }
          else if (on === 'TraderOverlay') o.close();
          else if (on === 'EnchantOverlay') Game.overlay = null;
          else Game.overlay = null;
          return 'overlay:' + on;
        }
        if (Dialogue.active) { Dialogue.active.chars = 999; Input.clicks.push({ x: 1, y: 1, button: 0 }); return 'dialogue'; }
        if (n === 'Combat') {
          if (s.riff) { s.riff.done = true; return 'riff'; }
          if (!s.busy && s.phase === 'player') { for (const e of s.alive()) s.damageEnemy(e, 9999); s.checkDeaths(); Co.run(s.victory(), s); }
          return 'combat';
        }
        if (n === 'RewardScene') { s.cardTaken = true; s.relicTaken = true; Game.afterReward(s.o); return 'reward'; }
        if (n === 'ActStory') { s.onDone(); return 'story'; }
        if (n !== 'BoardScene') return n;
        if (s.riff) { s.riff.o.onDone({ grade: 'A', acc: 0.8, hits: 10, notes: 10, sick: 5, fc: false, mult: 1 }); s.riff = null; return 'riff'; }
        if (s.panel) {
          const P = s.panel;
          if (P.mode === 'choose') { const i = (P.choices || []).findIndex(c => c.ok !== false); P.pick = Math.max(0, i); return 'panel'; }
          if (P.mode === 'result') { P.t = 1; P.done = true; return 'panel-result'; }
          return 'panel-busy';
        }
        return s.phase;
      });
      if (process.env.TRACE) console.log('    ' + st);
      if (st === 'combat') fights++;
      if (st.startsWith('panel')) panels++;
      if (st === 'idle') break;
      if (st === 'GameOverScene' || st === 'EndingScene') break;
      if (i === 60) await shot(`stuck_${roll}`);
    }
    const now = await ev(() => { const s = Game.scene; return { n: s.constructor.name, pos: s.bd && s.bd.pos, hp: Game.run.hp, gems: Game.run.gems, deck: Game.run.deck.length, touched: s.bd && JSON.stringify(s.bd.touched), phase: s.phase }; });
    console.log(`  roll ${roll}: -> ${pick}  ${JSON.stringify(now)}`);
    if (roll % 4 === 3) await shot(`03_roll${roll}`);
    if (now.n !== 'BoardScene') { if (now.n === 'GameOverScene') { console.log('  (game over)'); break; } }
  }
  ok('moved around the board', moved >= Math.min(ROLLS, 4), `moved ${moved}, panels ${panels}, fight frames ${fights}`);
  ok('no page errors', errs.length === 0, errs.slice(0, 12).join('\n    '));
  if (missing.size) console.log('missing sprites: ' + [...missing].join(' '));
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
