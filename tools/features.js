// Focused feature tests run inside the live game via debug hooks.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') { const t = m.text().split('\n').slice(0, 2).join(' | '); errors.push(t); console.log('[console]', t); } });
  page.on('pageerror', e => { errors.push(e.message); console.log('[pageerror]', e.message); });
  await page.goto('http://127.0.0.1:8765/index.html'); await page.waitForTimeout(300);
  await page.mouse.click(640, 360); await page.waitForTimeout(300);
  const fails = [];
  const check = (name, ok, info = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : '')); if (!ok) fails.push(name); };
  await page.evaluate(() => {
    Game.newRun(); Game.go(new MapScene());
    // instant perfect riffs
    window.__auto = setInterval(() => { const s = Game.scene; if (!s || !s.riff || s.riff.done) return; const r = s.riff; for (const n of r.notes) if (!n.judged) { n.judged = true; n.hit = true; n.j = 'perfect'; r.perfects++; r.combo++; r.maxCombo = Math.max(r.maxCombo, r.combo); if (r.o.onNote) r.o.onNote('perfect', n, r); } r.finish(); }, 5);
  });
  const waitIdle = async (ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const st = await page.evaluate(() => { const s = Game.scene; return s.constructor.name !== 'Combat' ? 'left' : (!s.busy && s.phase === 'player') ? 'idle' : 'busy'; }); if (st !== 'busy') return st; await page.waitForTimeout(100); } return 'timeout'; };
  const startCombat = async (ids, opts) => { await page.evaluate(({ ids, opts }) => { Game.go(new Combat(ids, opts)); }, { ids, opts }); return waitIdle(); };

  // 1. Encore hits all enemies
  await startCombat(['compy', 'compy', 'dodo'], { kind: 'normal', act: 1 });
  await page.evaluate(() => { const s = Game.scene; s.addHype(100, true); });
  let r = await page.evaluate(() => ({ ready: Game.scene.encoreReady, hype: Game.scene.hype }));
  check('encore ready at 100 hype', r.ready, JSON.stringify(r));
  const before = await page.evaluate(() => Game.scene.enemies.map(e => e.hp));
  await page.evaluate(() => Game.scene.playEncore()); await waitIdle();
  const after = await page.evaluate(() => Game.scene.constructor.name === 'Combat' ? ({ hp: Game.scene.enemies.map(e => e.hp), hype: Game.scene.hype, scene: 'Combat' }) : ({ hp: [], scene: Game.scene.constructor.name }));
  check('encore damaged all enemies', after.scene !== 'Combat' || after.hp.every((h, i) => h < before[i]), JSON.stringify({ before, after }));

  // 2. Burn + stun + relic triggers + band effects
  await page.evaluate(() => { Game.run.relics = ['bone_pick', 'fire_stone', 'trex_head', 'ancient_shell', 'echo_drum', 'club_of_kings', 'tar_bucket', 'moon_flute']; Game.run.band = ['bonga', 'ugg', 'zog']; });
  await startCombat(['raptor', 'boar'], { kind: 'normal', act: 1 });
  r = await page.evaluate(() => { const s = Game.scene; return { block: s.player.block, str: s.player.st.str, hand: s.hand.length, weak: s.enemies.map(e => e.st.weak), stun: s.enemies.map(e => e.st.stun), hp: s.enemies.map(e => e.hp + '/' + e.maxHp), turn: s.turn }; });
  check('ancient shell + ugg block kept on turn 1', r.block >= 9, JSON.stringify(r));
  check('club of kings strength', r.str === 3);
  check('bone pick extra card', r.hand === 6, 'hand=' + r.hand);
  check('tar bucket + trex head weak', r.weak.every(w => w >= 2), JSON.stringify(r.weak));
  check('moon flute stunned biggest', r.stun.some(s => s > 0), JSON.stringify(r.stun));
  check('fire stone + roar + bonga damaged enemies', r.hp.every(h => +h.split('/')[0] < +h.split('/')[1]), JSON.stringify(r.hp));
  // fire riff burn
  await page.evaluate(() => { const s = Game.scene; const c = Cards.make('fire_riff'); s.hand.push(c); s.energy = 9; const t = s.alive().reduce((a, b) => b.hp > a.hp ? b : a); t.hp = 200; t.maxHp = 200; window.__t = t; s.tryPlay(c, t); }); await waitIdle();
  r = await page.evaluate(() => window.__t.st.burn);
  check('fire riff applied burn', r >= 3 || r === -1, 'burn=' + r);
  await page.evaluate(() => { const s = Game.scene; const c = Cards.make('flute_lullaby'); s.hand.push(c); s.energy = 9; s.tryPlay(c, s.alive()[0]); }); await waitIdle();
  r = await page.evaluate(() => Game.scene.alive()[0] ? Game.scene.alive()[0].st.stun : -1);
  check('flute lullaby stunned', r >= 1 || r === -1, 'stun=' + r);
  const hpBefore = await page.evaluate(() => Game.run.hp);
  await page.evaluate(() => Game.scene.endTurn()); await waitIdle(15000);
  r = await page.evaluate(() => ({ hp: Game.run.hp, turn: Game.scene.turn, exhaust: Game.scene.exhaustPile.length, enemies: Game.scene.enemies.map(e => e.name + ':' + e.hp + ' burn=' + e.st.burn) }));
  check('enemy turn resolved to turn 2', r.turn === 2, JSON.stringify(r));
  check('lullaby exhausted', r.exhaust >= 1);

  // 3. Hand full + reshuffle
  await page.evaluate(() => { const s = Game.scene; s.drawCards(12); });
  r = await page.evaluate(() => ({ hand: Game.scene.hand.length, draw: Game.scene.drawPile.length }));
  check('hand capped at 10', r.hand <= 10, JSON.stringify(r));

  // 4. Tricera king summons, spino summons, trex phase 2
  await page.evaluate(() => { Game.run.relics = ['bone_pick']; });
  await startCombat(['tricera_king'], { kind: 'boss', act: 1 });
  await page.evaluate(() => { const s = Game.scene; const e = s.enemies[0]; e.intent = Object.assign({ key: 'rally' }, e.def.moves.rally); s.endTurn(); }); await waitIdle(15000);
  r = await page.evaluate(() => Game.scene.enemies.map(e => e.name));
  check('tricera king summoned compy', r.includes('Compy'), JSON.stringify(r));
  await startCombat(['trex'], { kind: 'boss', act: 3 });
  await page.evaluate(() => { const s = Game.scene; const e = s.enemies[0]; s.damageEnemy(e, Math.ceil(e.maxHp * 0.55), { pierce: true }); });
  await page.waitForTimeout(500);
  r = await page.evaluate(() => ({ phase2: Game.scene.enemies[0].phase2, str: Game.scene.enemies[0].st.str, song: AudioSys.songId, intensity: AudioSys.intensity }));
  check('king rex phase 2 triggered', r.phase2 && r.str >= 3, JSON.stringify(r));
  await page.evaluate(() => { const s = Game.scene; const e = s.enemies[0]; e.intent = Object.assign({ key: 'summon' }, e.def.moves.summon); s.endTurn(); }); await waitIdle(15000);
  r = await page.evaluate(() => Game.scene.enemies.filter(e => e.alive).map(e => e.name));
  check('king rex summoned royal compys', r.filter(n => n === 'Royal Compy').length === 2, JSON.stringify(r));
  await page.screenshot({ path: '/tmp/claude-0/-home-user-studious-invention/b07c031c-846e-582c-baca-98b85064c1db/scratchpad/feat_rex_phase2.png' });

  // 5. Victory flow -> reward -> boss transition to act 2 story
  await page.evaluate(() => { Game.run.act = 1; Game.run.band = []; Game.run.deck = Game.run.deck.filter(c => !['drum_solo'].includes(c.id)); });
  await startCombat(['tricera_king'], { kind: 'boss', act: 1 });
  await page.evaluate(() => { const s = Game.scene; s.enemies[0].hp = 1; s.enemies[0].block = 0; const c = Cards.make('stone_throw'); s.hand.push(c); s.energy = 9; s.tryPlay(c, s.enemies[0]); });
  await page.waitForTimeout(4500);
  r = await page.evaluate(() => Game.scene.constructor.name);
  check('boss kill leads to RewardScene', r === 'RewardScene', r);
  await page.evaluate(() => { const s = Game.scene; s.relicTaken = true; s.cardTaken = true; Game.afterReward(s.o); });
  await page.waitForTimeout(300);
  r = await page.evaluate(() => ({ scene: Game.scene.constructor.name, band: Game.run.band, deck: Game.run.deck.map(c => c.id).filter(id => id === 'drum_solo').length, act: Game.run.act }));
  check('act 1 boss -> story + bonga joins + drum solo', r.scene === 'StoryScene' && r.band.includes('bonga') && r.deck === 1, JSON.stringify(r));
  await page.evaluate(() => Game.scene.onDone()); await page.waitForTimeout(300);
  r = await page.evaluate(() => ({ scene: Game.scene.constructor.name, act: Game.run.act, rows: Game.run.map.nodes.length }));
  check('act 2 map generated', r.scene === 'MapScene' && r.act === 2 && r.rows > 20, JSON.stringify(r));

  // 6. Defeat path
  await startCombat(['giga'], { kind: 'elite', act: 3 });
  await page.evaluate(() => { Game.run.hp = 1; const s = Game.scene; s.player.block = 0; s.endTurn(); });
  await page.waitForTimeout(6000);
  r = await page.evaluate(() => Game.scene.constructor.name);
  check('defeat leads to GameOverScene', r === 'GameOverScene', r);

  // 7. Map generation sanity across seeds
  r = await page.evaluate(() => { const out = []; for (let seed = 1; seed < 60; seed++) for (const act of [1, 2, 3]) { const m = MapGen.generate(act, seed); const types = {}; for (const n of m.nodes) types[n.type] = (types[n.type] || 0) + 1; const reach = new Set(); const q = m.nodes.filter(n => n.row === 0).map(n => n.id); while (q.length) { const id = q.pop(); if (reach.has(id)) continue; reach.add(id); for (const nx of m.nodes[id].next) q.push(nx); } const bossReach = m.nodes.filter(n => n.type === 'boss').every(n => reach.has(n.id)); const deadEnds = m.nodes.filter(n => n.type !== 'boss' && n.next.length === 0).length; if (!bossReach || deadEnds || !types.elite || !types.shop || !types.rest || !types.treasure) out.push({ seed, act, types, bossReach, deadEnds }); } return out; });
  check('maps valid for 59 seeds x 3 acts', r.length === 0, JSON.stringify(r.slice(0, 3)));

  console.log('\nerrors:', errors.length, 'fails:', fails.length, fails);
  await browser.close();
  process.exit(fails.length || errors.length ? 1 : 0);
})();
