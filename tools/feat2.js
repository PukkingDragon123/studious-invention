// Feature tests for the rebuilt game, driven through the live objects.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const OUT = '/tmp/claude-0/-home-user-studious-invention/b07c031c-846e-582c-baca-98b85064c1db/scratchpad/v2';
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') { const t = m.text().split('\n')[0]; if (!t.includes('404')) errs.push(t); } });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + ' | ' + (e.stack || '').split('\n')[1]));
  await page.goto('http://127.0.0.1:8765/index2.html'); await page.waitForTimeout(500);
  await page.mouse.click(640, 360); await page.waitForTimeout(500);
  const fails = [];
  const ok = (n, cond, info = '') => { console.log((cond ? 'PASS ' : 'FAIL ') + n + (info ? '  ' + info : '')); if (!cond) fails.push(n); };
  const ev = fn => page.evaluate(fn);
  const shot = n => page.screenshot({ path: `${OUT}/feat_${n}.png` });

  await ev(() => { Game.newRun(); Game.startVillage(); });
  await page.waitForTimeout(900);
  let r = await ev(() => { const s = Game.scene; return { n: s.constructor.name, ents: s.zone.entities.map(e => e.constructor.name), tiles: s.zone.tiles.length }; });
  ok('village builds with a full cast', r.n === 'VillageScene' && r.ents.includes('Campfire') && r.ents.includes('Prowler') && r.ents.includes('FogNode') && r.ents.includes('Trader') && r.ents.includes('Npc') && r.ents.includes('ZoneGoal'), JSON.stringify([...new Set(r.ents)]));

  // stamina drains when you run and recovers when you stop
  await ev(() => { Game.run.stamina = 100; Input.held['ArrowRight'] = true; Input.held['ShiftLeft'] = true; });
  await page.waitForTimeout(1800);
  const drained = await ev(() => Game.run.stamina);
  await ev(() => { Input.held['ArrowRight'] = false; Input.held['ShiftLeft'] = false; });
  await page.waitForTimeout(1600);
  const recovered = await ev(() => Game.run.stamina);
  ok('stamina drains when sprinting and recovers at rest', drained < 92 && recovered > drained + 4, `drained ${Math.round(drained)} -> ${Math.round(recovered)}`);

  // a prowler notices you and gives chase
  r = await ev(() => {
    const s = Game.scene, p = s.zone.entities.find(e => e.constructor.name === 'Prowler');
    p.x = s.player.x + 70; p.y = s.player.y; p.dir = { x: -1, y: 0 }; p.state = 'patrol';
    return p.state;
  });
  await page.waitForTimeout(500);
  r = await ev(() => { const p = Game.scene.zone.entities.find(e => e.constructor.name === 'Prowler'); return p ? p.state : 'gone'; });
  ok('a prowler spots you and chases', r === 'chase' || Game.scene === undefined, 'state=' + r);
  await shot('village_chase');
  await page.waitForTimeout(1600);
  r = await ev(() => Game.scene.constructor.name);
  ok('touching a prowler starts a fight', r === 'Combat', r);
  await shot('village_fight');

  // hiding breaks line of sight
  await ev(() => { Game.startVillage(); });
  await page.waitForTimeout(700);
  r = await ev(() => {
    const s = Game.scene;
    const bush = s.zone.objects.find(o => o.hide);
    if (!bush) return 'no bush';
    s.player.x = bush.x; s.player.y = bush.y;
    return 'placed';
  });
  await page.waitForTimeout(400);
  r = await ev(() => Game.scene.hidden);
  ok('standing in a bush counts as hidden', r === true, String(r));

  // campfire
  r = await ev(() => {
    const s = Game.scene, c = s.zone.entities.find(e => e.constructor.name === 'Campfire');
    Game.run.hp = 20; Game.run.stamina = 5;
    s.locked = true; Co.run(function* () { yield* c.interact(s); s.locked = false; }());
    return !!c;
  });
  await page.waitForTimeout(700);
  await shot('village_campfire');
  await ev(() => { if (Dialogue.active && Dialogue.active.choices) Dialogue.active.choice = 0; });
  await page.waitForTimeout(900);
  r = await ev(() => ({ hp: Game.run.hp, stam: Math.round(Game.run.stamina) }));
  ok('resting at a campfire heals and refills stamina', r.hp > 20 && r.stam > 90, JSON.stringify(r));

  // fog encounter
  await ev(() => Game.enterEvent()); await page.waitForTimeout(600);
  r = await ev(() => ({ n: Game.scene.constructor.name, title: Game.scene.ev && Game.scene.ev.title }));
  ok('fog opens a mystery encounter', r.n === 'FogEvent', JSON.stringify(r));
  await shot('fog_event');
  await ev(() => { const s = Game.scene; s.ev.choices[0].act(s); });
  await page.waitForTimeout(500);
  r = await ev(() => { const s = Game.scene; return { result: !!s.result, riff: !!s.riff || !!s.riffObj, picker: !!s.picker || !!Game.overlay }; });
  ok('an encounter choice resolves', r.result || r.riff || r.picker, JSON.stringify(r));

  // the walking shop
  await ev(() => { Game.run.gold = 400; Game.openShop(); }); await page.waitForTimeout(700);
  r = await ev(() => ({ n: Game.scene.constructor.name, stock: Game.scene.stock.length }));
  ok('the wandering mammoth opens a market', r.n === 'MammothShop' && r.stock >= 7, JSON.stringify(r));
  await shot('shop');
  r = await ev(() => { const s = Game.scene, it = s.stock.find(i => i.kind === 'card'); const before = Game.run.deck.length; if (s.buy(it)) { it.sold = true; Game.run.deck.push(it.card); } return Game.run.deck.length > before; });
  ok('you can buy from the mammoth', r);

  // boss, phases and act progression
  await ev(() => { Game.run.act = 1; Game.enterBoss(); }); await page.waitForTimeout(2600);
  r = await ev(() => ({ n: Game.scene.constructor.name, foe: Game.scene.enemies && Game.scene.enemies[0].name, hp: Game.scene.enemies && Game.scene.enemies[0].maxHp }));
  ok('the boss fight starts against BLAZE', r.n === 'Combat' && r.foe === 'BLAZE', JSON.stringify(r));
  await shot('boss');
  await ev(() => { const s = Game.scene; s.damageEnemy(s.enemies[0], Math.ceil(s.enemies[0].maxHp * 0.6), { pierce: true }); });
  await page.waitForTimeout(500);
  r = await ev(() => ({ p2: Game.scene.enemies[0].phase2, str: Game.scene.enemies[0].st.str }));
  ok('BLAZE enrages at half health', r.p2 === true && r.str >= 3, JSON.stringify(r));
  await ev(() => { const s = Game.scene; s.enemies[0].hp = 1; const c = Cards.make('stone_throw'); s.hand.push(c); s.energy = 9; s.play(c, s.enemies[0]); });
  await page.waitForTimeout(3600);
  r = await ev(() => Game.scene.constructor.name);
  ok('beating the boss goes to rewards', r === 'RewardScene', r);
  await shot('reward');
  await ev(() => { const s = Game.scene; s.relicTaken = true; s.cardTaken = true; Game.afterReward(s.o); });
  await page.waitForTimeout(600);
  r = await ev(() => ({ n: Game.scene.constructor.name, band: Game.run.band, deck: Game.run.deck.filter(c => c.id === 'drum_solo').length }));
  ok('act one ends with Pebble joining the band', r.n === 'ActStory' && r.band.includes('pebble') && r.deck === 1, JSON.stringify(r));
  await shot('act_story');
  await ev(() => Game.scene.onDone()); await page.waitForTimeout(700);
  r = await ev(() => ({ n: Game.scene.constructor.name, act: Game.run.act }));
  ok('act two generates a new zone', r.n === 'VillageScene' && r.act === 2, JSON.stringify(r));
  await shot('act2_village');

  // save and continue
  await ev(() => { Game.run.gold = 777; Game.save(); });
  await page.reload(); await page.waitForTimeout(600);
  await page.mouse.click(640, 360); await page.waitForTimeout(500);
  await ev(() => Game.continueRun()); await page.waitForTimeout(900);
  r = await ev(() => ({ n: Game.scene.constructor.name, gold: Game.run.gold, act: Game.run.act, band: Game.run.band.length }));
  ok('a run survives a reload', r.n === 'VillageScene' && r.gold === 777 && r.act === 2 && r.band === 1, JSON.stringify(r));
  await ev(() => Game.clearSave());

  console.log('\nerrors:', errs.length, [...new Set(errs)].slice(0, 6));
  console.log('fails:', fails.length, fails);
  await browser.close();
  process.exit(fails.length || errs.length ? 1 : 0);
})();
