// Headless smoke test: boots the game, walks title -> story -> map -> combat, auto-plays a riff.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const OUT = process.argv[2] || '/tmp/claude-0/-home-user-studious-invention/b07c031c-846e-582c-baca-98b85064c1db/scratchpad';
const S = 2; // canvas scale in a 1280x720 viewport
const cc = (x, y) => ({ x: x * S, y: y * S });
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') { console.log('[console]', m.type(), m.text()); } });
  page.on('pageerror', e => { errors.push(e.message); console.log('[pageerror]', e.message); });
  await page.goto('http://127.0.0.1:8765/index.html');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/01_boot.png` });
  let p = cc(320, 180); await page.mouse.click(p.x, p.y); await page.waitForTimeout(800);
  console.log('audio state:', await page.evaluate(() => AudioSys.ctx && AudioSys.ctx.state + ' t=' + AudioSys.ctx.currentTime.toFixed(2) + ' song=' + AudioSys.songId));
  await page.screenshot({ path: `${OUT}/02_title.png` });
  // START
  p = cc(150, 162); await page.mouse.click(p.x, p.y); await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/03_story.png` });
  // advance story pages
  for (let i = 0; i < 9; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(80); await page.keyboard.press('Space'); await page.waitForTimeout(120); }
  await page.waitForTimeout(600);
  console.log('scene:', await page.evaluate(() => Game.scene.constructor.name));
  await page.screenshot({ path: `${OUT}/04_map.png` });
  // click first available node
  await page.waitForTimeout(1300);
  const nodes = await page.evaluate(() => MapGen.available(Game.run.map).map(n => ({ x: n.x, y: Game.scene.screenY(n.my), type: n.type })));
  console.log('available nodes:', JSON.stringify(nodes));
  p = cc(nodes[0].x, nodes[0].y); await page.mouse.click(p.x, p.y); await page.waitForTimeout(1500);
  console.log('scene:', await page.evaluate(() => Game.scene.constructor.name + ' enemies=' + (Game.scene.enemies || []).map(e => e.name).join(',')));
  await page.screenshot({ path: `${OUT}/05_combat_intro.png` });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/06_combat_hand.png` });
  // hover a card
  p = cc(320, 300); await page.mouse.move(p.x, p.y); await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/07_combat_hover.png` });
  // install autoplayer
  await page.evaluate(() => {
    window.__auto = setInterval(() => {
      const s = Game.scene; if (!s || !s.riff || s.riff.done) return;
      const now = Riff.heardNow();
      for (const n of s.riff.notes) if (!n.judged && !n.pressed && now >= n.time - 0.004) { n.pressed = true; window.dispatchEvent(new KeyboardEvent('keydown', { code: LANE_KEYS[n.lane][0], key: LANE_LABELS[n.lane].toLowerCase() })); }
    }, 3);
  });
  // play an attack card
  const played = await page.evaluate(() => { const s = Game.scene; const c = s.hand.find(c => c.def.type === 'attack'); if (!c) return null; s.tryPlay(c, s.alive()[0]); return c.name; });
  console.log('played', played);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${OUT}/08_riff.png` });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/09_riff2.png` });
  await page.waitForTimeout(3000);
  console.log('after riff:', await page.evaluate(() => { const s = Game.scene; return JSON.stringify({ phase: s.phase, busy: s.busy, energy: s.energy, hype: s.hype, enemies: s.enemies.map(e => e.name + ':' + e.hp + '/' + e.maxHp), stats: Game.run.stats }); }));
  console.log('riff history:', await page.evaluate(() => JSON.stringify(Game.scene.lastRiff ? Game.scene.lastRiff.history : null)));
  await page.screenshot({ path: `${OUT}/10_after_riff.png` });
  // play remaining cards & end turn
  await page.evaluate(() => { const s = Game.scene; const c = s.hand.find(c => c.def.type === 'skill'); if (c) s.selectCard(c); });
  await page.waitForTimeout(600);
  await page.keyboard.press('KeyE'); await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/11_enemy_turn.png` });
  await page.waitForTimeout(2500);
  console.log('turn 2:', await page.evaluate(() => { const s = Game.scene; return JSON.stringify({ phase: s.phase, turn: s.turn, hp: Game.run.hp, block: s.player.block, hand: s.hand.map(c => c.name), enemies: s.enemies.map(e => e.name + ':' + e.hp + ' intent=' + (e.intent && e.intent.name)) }); }));
  await page.screenshot({ path: `${OUT}/12_turn2.png` });
  // mouse targeting: select an attack card via keyboard digit, then click an enemy
  const tinfo = await page.evaluate(() => { const s = Game.scene; const i = s.hand.findIndex(c => c.def.type === 'attack'); if (i < 0) return null; window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit' + (i + 1) })); return { i }; });
  await page.waitForTimeout(300);
  const sel = await page.evaluate(() => { const s = Game.scene; const e = s.alive()[0]; const r = s.enemyRect(e); return { selected: !!s.selected, single: s.alive().length === 1, ex: r.x + r.w / 2, ey: r.y + r.h / 2, name: e.name }; });
  console.log('targeting state:', JSON.stringify(sel));
  if (sel.selected) { await page.screenshot({ path: `${OUT}/13_targeting.png` }); p = cc(sel.ex, sel.ey); await page.mouse.click(p.x, p.y); await page.waitForTimeout(400); console.log('after target click: riff active =', await page.evaluate(() => !!Game.scene.riff)); await page.waitForTimeout(6000); }
  else await page.waitForTimeout(6000);
  console.log('post:', await page.evaluate(() => JSON.stringify({ phase: Game.scene.phase, enemies: Game.scene.enemies.map(e => e.name + ':' + e.hp) })));
  // save / continue
  await page.evaluate(() => { Game.run.gold = 999; Game.save(); });
  await page.reload(); await page.waitForTimeout(500); await page.mouse.click(640, 360); await page.waitForTimeout(600);
  const hasSave = await page.evaluate(() => Game.hasSave()); console.log('hasSave after reload:', hasSave);
  p = cc(150, 162); await page.mouse.click(p.x, p.y); await page.waitForTimeout(800);
  console.log('continued:', await page.evaluate(() => Game.scene.constructor.name + ' gold=' + (Game.run && Game.run.gold) + ' deck=' + (Game.run && Game.run.deck.length) + ' floor=' + (Game.run && Game.run.floor)));
  await page.screenshot({ path: `${OUT}/14_continued.png` });
  await page.evaluate(() => Game.clearSave());
  console.log('errors:', errors.length);
  await browser.close();
})();
