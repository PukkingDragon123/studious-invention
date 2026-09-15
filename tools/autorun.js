// Autonomous full-run bot: plays the whole game with simple heuristics to find runtime errors and check balance.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fastAfter = +(process.argv[2] || 2); // combats to play with real timing before switching to instant riffs
const seedArg = process.argv[3];
const humanize = process.argv[4] === 'human';
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') { const t = m.text().split('\n').slice(0, 3).join(' | '); if (!errors.includes(t)) { errors.push(t); console.log('[console]', t); } } });
  page.on('pageerror', e => { errors.push(e.message); console.log('[pageerror]', e.message); });
  await page.goto('http://127.0.0.1:8765/index.html'); await page.waitForTimeout(300);
  await page.mouse.click(640, 360); await page.waitForTimeout(300);
  await page.evaluate(({ seed, humanize }) => {
    window.__humanize = humanize;
    Game.newRun(); if (seed) { Game.run.seed = +seed; Game.run.map = MapGen.generate(1, +seed); }
    Game.go(new MapScene());
    window.__combats = 0; window.__log = [];
    window.__auto = setInterval(() => {
      const s = Game.scene; if (!s || !s.riff || s.riff.done) return;
      const r = s.riff;
      if (window.__fast) { for (const n of r.notes) if (!n.judged) { const q = Math.random(); const j = window.__humanize ? (q < 0.6 ? 'perfect' : q < 0.9 ? 'good' : 'miss') : 'perfect'; n.judged = true; n.hit = j !== 'miss'; n.j = j; if (j === 'perfect') r.perfects++; else if (j === 'good') r.goods++; else r.misses++; if (j === 'miss') r.combo = 0; else { r.combo++; r.maxCombo = Math.max(r.maxCombo, r.combo); } if (r.o.onNote) r.o.onNote(j, n, r); } r.finish(); return; }
      const now = Riff.heardNow();
      for (const n of r.notes) if (!n.judged && !n.pressed && now >= n.time - 0.004) { n.pressed = true; window.dispatchEvent(new KeyboardEvent('keydown', { code: LANE_KEYS[n.lane][0] })); }
    }, 3);
  }, { seed: seedArg, humanize });
  const step = () => page.evaluate((fastAfter) => {
    const s = Game.scene, name = s.constructor.name, run = Game.run;
    const log = m => window.__log.push(m);
    if (Game.overlay) { if (Game.overlay.o && Game.overlay.o.onPick && Game.overlay.cards.length) { Game.overlay.o.onPick(Game.overlay.cards[0]); } else Game.overlay = null; return 'overlay'; }
    if (name === 'MapScene') { if (s.walk) return 'walking'; const av = MapGen.available(run.map); if (!av.length) return 'no nodes'; const pref = av.find(n => n.type === 'event') || av.find(n => n.type === 'rest' && run.hp < run.maxHp * 0.6) || av[Math.floor(Math.random() * av.length)]; s.travel(pref); return 'travel ' + pref.type; }
    if (name === 'Combat') {
      if (s.busy || s.phase !== 'player') return 'combat busy ' + s.phase;
      if (s.turn !== s.__lastTurn) { s.__lastTurn = s.turn; if (s.turn > 1) log(`  turn ${s.turn} hp ${run.hp} block ${s.player.block} enemies ${s.alive().map(e => e.name + ':' + e.hp).join(',')}`); }
      if (!s.__counted) { s.__counted = true; window.__combats++; window.__fast = window.__combats > fastAfter; log(`combat ${window.__combats} floor ${run.floor} act ${run.act}: ${s.enemies.map(e => e.name).join(',')} hp ${run.hp}`); }
      if (s.encoreReady) { s.playEncore(); return 'encore'; }
      const alive = s.alive(); if (!alive.length) return 'no enemies';
      const target = alive.reduce((a, b) => a.hp < b.hp ? a : b);
      const incoming = alive.reduce((a, e) => a + (e.intent && e.intent.dmg ? s.previewEnemyDamage(e, e.intent.dmg) * (e.intent.hits || 1) : 0), 0);
      const playable = s.hand.filter(c => s.canPlay(c));
      let pick = null;
      if (incoming > s.player.block) pick = playable.find(c => c.def.type === 'skill' && (c.v.block || 0) > 0);
      if (!pick) pick = playable.find(c => c.def.type === 'power') || playable.find(c => c.def.type === 'attack') || playable.find(c => c.def.type === 'rally') || playable[0];
      if (pick) { s.tryPlay(pick, pick.def.target === 'enemy' ? target : null); return 'play ' + pick.name; }
      s.endTurn(); return 'end turn';
    }
    if (name === 'RewardScene') { if (!s.relicTaken) { const id = s.o.relics[0]; Relics.give(id); s.relicTaken = true; log('relic ' + id); return 'relic'; } if (!s.cardTaken) { const c = s.o.cards[0]; run.deck.push(c); s.cardTaken = true; log('card ' + c.name); return 'card'; } Game.afterReward(s.o); return 'continue'; }
    if (name === 'EventScene') { if (s.riff) return 'event riff'; if (s.result) { if (s.pendingCombat) Game.go(new Combat(s.pendingCombat, { kind: 'normal' })); else Game.afterNode(); return 'event done'; } const ch = s.ev.choices.find(c => !c.cond || c.cond()); const r = ch.action(s); if (r) s.result = r; log('event ' + s.id + ': ' + ch.label); return 'event choice'; }
    if (name === 'RestScene') { if (!s.done) { run.hp = Math.min(run.maxHp, run.hp + Math.round(run.maxHp * 0.3)); s.done = true; s.msg = 'x'; return 'rest'; } Game.afterNode(); return 'rest done'; }
    if (name === 'ShopScene') { const it = s.cards.find(c => !c.sold && run.gold >= c.price); if (it) { run.gold -= it.price; it.sold = true; run.deck.push(it.card); log('bought ' + it.card.name); return 'buy'; } Game.afterNode(); return 'leave shop'; }
    if (name === 'TreasureScene') { if (!s.opened) { s.opened = true; return 'open'; } if (!s.taken) { Relics.give(s.choices[0]); s.taken = s.choices[0]; log('treasure ' + s.taken); return 'take'; } Game.afterNode(); return 'treasure done'; }
    if (name === 'StoryScene') { s.onDone(); return 'story skip'; }
    if (name === 'EndingScene') return 'ENDING';
    if (name === 'GameOverScene') return 'GAMEOVER';
    return 'unknown ' + name;
  }, fastAfter);
  const t0 = Date.now(); let last = '';
  while (Date.now() - t0 < 600000) {
    const r = await step();
    if (r !== last) { last = r; }
    if (r === 'ENDING' || r === 'GAMEOVER') { console.log('RESULT:', r); break; }
    await page.waitForTimeout(r.startsWith('combat busy') || r === 'walking' || r === 'event riff' ? 150 : 250);
  }
  const log = await page.evaluate(() => window.__log);
  console.log(log.join('\n'));
  console.log('final:', await page.evaluate(() => JSON.stringify({ act: Game.run && Game.run.act, floor: Game.run && Game.run.floor, hp: Game.run && Game.run.hp, maxHp: Game.run && Game.run.maxHp, gold: Game.run && Game.run.gold, relics: Game.run && Game.run.relics, deck: Game.run && Game.run.deck.length, stats: Game.run && Game.run.stats })));
  console.log('errors:', errors.length, errors.slice(0, 5));
  await page.screenshot({ path: '/tmp/claude-0/-home-user-studious-invention/b07c031c-846e-582c-baca-98b85064c1db/scratchpad/autorun_end.png' });
  await browser.close();
})();
