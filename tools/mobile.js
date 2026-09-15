// Touch-device test: emulates a phone, plays a riff with taps on the fret pads.
const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const OUT = '/tmp/claude-0/-home-user-studious-invention/b07c031c-846e-582c-baca-98b85064c1db/scratchpad/mobile';
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') { errors.push(m.text().split('\n')[0]); console.log('[console]', m.text().split('\n')[0]); } });
  page.on('pageerror', e => { errors.push(e.message); console.log('[pageerror]', e.message); });
  await page.goto('http://127.0.0.1:8765/index.html'); await page.waitForTimeout(500);
  // canvas -> screen mapping
  const map = async () => page.evaluate(() => { const r = document.getElementById('game').getBoundingClientRect(); return { x: r.x, y: r.y, sx: r.width / 640, sy: r.height / 360 }; });
  let m = await map();
  const tap = async (cx, cy) => { await page.touchscreen.tap(m.x + cx * m.sx, m.y + cy * m.sy); };
  await tap(320, 180); await page.waitForTimeout(700);
  console.log('touch detected:', await page.evaluate(() => Input.touch), '| scene:', await page.evaluate(() => Game.scene.constructor.name));
  await page.screenshot({ path: `${OUT}/01_title.png` });
  await tap(150, 162); await page.waitForTimeout(600); // START
  for (let i = 0; i < 10; i++) { await tap(320, 300); await page.waitForTimeout(120); await tap(320, 300); await page.waitForTimeout(150); }
  await page.waitForTimeout(800);
  console.log('scene:', await page.evaluate(() => Game.scene.constructor.name));
  await page.screenshot({ path: `${OUT}/02_map.png` });
  // drag to scroll the map
  const before = await page.evaluate(() => Game.scene.target);
  await page.touchscreen.tap(m.x + 500 * m.sx, m.y + 100 * m.sy).catch(() => {});
  await page.evaluate(() => { /* noop */ });
  const box = { x: m.x + 500 * m.sx, y: m.y + 200 * m.sy };
  await page.evaluate(() => window.__dragTest = true);
  // use raw touch events for a drag
  await page.dispatchEvent('canvas', 'touchstart', { touches: [{ identifier: 9, clientX: box.x, clientY: box.y }], changedTouches: [{ identifier: 9, clientX: box.x, clientY: box.y }] }).catch(e => console.log('drag start skipped'));
  await page.waitForTimeout(1500);
  // travel to first node
  const nodes = await page.evaluate(() => MapGen.available(Game.run.map).map(n => ({ x: n.x, y: Game.scene.screenY(n.my), t: n.type })));
  console.log('nodes:', JSON.stringify(nodes.slice(0, 3)));
  await tap(nodes[0].x, nodes[0].y); await page.waitForTimeout(2500);
  console.log('scene:', await page.evaluate(() => Game.scene.constructor.name));
  await page.screenshot({ path: `${OUT}/03_combat.png` });
  // tap a card once (preview) then again (play)
  const cardPos = await page.evaluate(() => { const s = Game.scene; const i = s.hand.findIndex(c => c.def.type === 'attack'); const n = s.hand.length; const spacing = Math.min(CARD_W + 4, 440 / Math.max(1, n)); const total = spacing * (n - 1) + CARD_W; const x0 = 320 - total / 2; return { i, x: x0 + i * spacing + 20, y: 252 + 40 }; });
  await tap(cardPos.x, cardPos.y); await page.waitForTimeout(400);
  console.log('preview card:', await page.evaluate(() => Game.scene.previewCard && Game.scene.previewCard.name));
  await page.screenshot({ path: `${OUT}/04_card_preview.png` });
  await tap(cardPos.x, cardPos.y); await page.waitForTimeout(500);
  const st = await page.evaluate(() => ({ riff: !!Game.scene.riff, selected: !!Game.scene.selected, alive: Game.scene.alive().length }));
  console.log('after 2nd tap:', JSON.stringify(st));
  if (st.selected) { const e = await page.evaluate(() => { const r = Game.scene.enemyRect(Game.scene.alive()[0]); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }); await page.screenshot({ path: `${OUT}/05_targeting.png` }); await tap(e.x, e.y); await page.waitForTimeout(500); }
  console.log('riff active:', await page.evaluate(() => !!Game.scene.riff));
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/06_riff_frets.png` });
  // autoplay the riff by tapping fret pads at the right time
  await page.evaluate(() => {
    window.__taps = 0;
    window.__auto = setInterval(() => {
      const s = Game.scene; if (!s || !s.riff || s.riff.done) return; const r = s.riff; const now = Riff.heardNow();
      for (const n of r.notes) if (!n.judged && !n.tapped && now >= n.time - 0.004) {
        n.tapped = true; window.__taps++;
        const rect = r.fretRect(n.lane); const cv = document.getElementById('game'); const b = cv.getBoundingClientRect();
        const cx = b.x + (rect.x + rect.w / 2) * b.width / 640, cy = b.y + (rect.y + rect.h / 2) * b.height / 360;
        const T = { identifier: 100 + n.lane, clientX: cx, clientY: cy, target: cv };
        cv.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [new Touch(T)], touches: [new Touch(T)], bubbles: true, cancelable: true }));
        cv.dispatchEvent(new TouchEvent('touchend', { changedTouches: [new Touch(T)], touches: [], bubbles: true, cancelable: true }));
      }
    }, 4);
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/07_riff_playing.png` });
  await page.waitForTimeout(4000);
  console.log('riff result:', await page.evaluate(() => { const r = Game.scene.lastRiff; return r ? JSON.stringify({ taps: window.__taps, perfects: r.perfects, goods: r.goods, misses: r.misses, grade: r.result && r.result.grade, history: r.history.slice(0, 4) }) : 'none'; }));
  await page.screenshot({ path: `${OUT}/08_after.png` });
  // portrait rotate hint
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/09_portrait.png` });
  console.log('errors:', errors.length);
  await browser.close();
})();
