// Touch test for the rebuild: stick, interact, card taps, fret pads.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const OUT = '/tmp/claude-0/-home-user-studious-invention/b07c031c-846e-582c-baca-98b85064c1db/scratchpad/v2';
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 420 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('404')) errs.push(m.text().split('\n')[0]); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await page.goto('http://127.0.0.1:8765/index.html'); await page.waitForTimeout(500);
  const map = async () => page.evaluate(() => { const r = document.getElementById('game').getBoundingClientRect(); return { x: r.x, y: r.y, sx: r.width / 960, sy: r.height / 540 }; });
  const m = await map();
  const tap = async (cx, cy) => page.touchscreen.tap(m.x + cx * m.sx, m.y + cy * m.sy);
  await tap(480, 270); await page.waitForTimeout(600);
  console.log('touch detected:', await page.evaluate(() => Input.touch));
  await page.evaluate(() => { Game.newRun(); Game.startVillage(); });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/m_village.png` });
  // drag the virtual stick and check the player actually moves
  const before = await page.evaluate(() => ({ x: Game.scene.player.x, y: Game.scene.player.y }));
  const sx = m.x + 110 * m.sx, sy = m.y + (540 - 110) * m.sy;
  await page.touchscreen.tap(sx, sy);
  await page.evaluate(({ sx, sy }) => {
    const cv = document.getElementById('game');
    const t = id => new Touch({ identifier: id, target: cv, clientX: sx + 50, clientY: sy });
    cv.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [new Touch({ identifier: 7, target: cv, clientX: sx, clientY: sy })], touches: [new Touch({ identifier: 7, target: cv, clientX: sx, clientY: sy })], bubbles: true, cancelable: true }));
    window.__hold = setInterval(() => cv.dispatchEvent(new TouchEvent('touchmove', { changedTouches: [t(7)], touches: [t(7)], bubbles: true, cancelable: true })), 30);
  }, { sx, sy });
  await page.waitForTimeout(1400);
  await page.evaluate(() => { clearInterval(window.__hold); const cv = document.getElementById('game'); cv.dispatchEvent(new TouchEvent('touchend', { changedTouches: [new Touch({ identifier: 7, target: cv, clientX: 0, clientY: 0 })], touches: [], bubbles: true, cancelable: true })); });
  const after = await page.evaluate(() => ({ x: Game.scene.player.x, y: Game.scene.player.y }));
  console.log('stick moved the player:', Math.abs(after.x - before.x) > 25, `${Math.round(before.x)} -> ${Math.round(after.x)}`);
  await page.screenshot({ path: `${OUT}/m_village_stick.png` });
  // combat: tap a card twice, then tap a beast
  await page.evaluate(() => Game.enterFight(['compy', 'dodo'], 'normal'));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/m_combat.png` });
  const cp = await page.evaluate(() => {
    const s = Game.scene, n = s.hand.length;
    const i = s.hand.findIndex(c => c.def.riff);
    const spacing = Math.min(CARD_W + 8, 620 / Math.max(1, n));
    const x0 = W / 2 - (spacing * (n - 1) + CARD_W) / 2;
    return { i, x: x0 + i * spacing + CARD_W / 2, y: H - 70 };
  });
  await tap(cp.x, cp.y); await page.waitForTimeout(500);
  console.log('first tap previews:', await page.evaluate(() => !!Game.scene.preview));
  await page.screenshot({ path: `${OUT}/m_card_preview.png` });
  const hz = await page.evaluate(() => { const s = Game.scene; const sc = 1.35; return { x: W / 2, y: H - CARD_H * sc / 2 - 10 }; });
  await tap(hz.x, hz.y); await page.waitForTimeout(500);
  let st = await page.evaluate(() => ({ riff: !!Game.scene.riff, sel: !!Game.scene.selected }));
  console.log('second tap plays or targets:', JSON.stringify(st));
  if (st.sel) {
    const e = await page.evaluate(() => { const s = Game.scene, a = s.alive()[0]; const p = s.cam.toScreen(a.actor.x, a.actor.cy); return p; });
    await tap(e.x, e.y); await page.waitForTimeout(600);
    st = await page.evaluate(() => ({ riff: !!Game.scene.riff }));
  }
  console.log('riff started:', st.riff);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/m_riff_pads.png` });
  // hit every note by tapping its pad
  await page.evaluate(() => {
    window.__taps = 0;
    window.__auto = setInterval(() => {
      const s = Game.scene, r = s.riff; if (!r || r.done) return;
      const now = Riff.now();
      for (const n of r.mine) if (!n.judged && !n.tapped && now >= n.time - 0.004) {
        n.tapped = true; window.__taps++;
        const rect = r.fretRect(n.lane), cv = document.getElementById('game'), b = cv.getBoundingClientRect();
        const cx = b.x + (rect.x + rect.w / 2) * b.width / 960, cy = b.y + (rect.y + rect.h / 2) * b.height / 540;
        const T = { identifier: 200 + n.lane, clientX: cx, clientY: cy, target: cv };
        cv.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [new Touch(T)], touches: [new Touch(T)], bubbles: true, cancelable: true }));
        cv.dispatchEvent(new TouchEvent('touchend', { changedTouches: [new Touch(T)], touches: [], bubbles: true, cancelable: true }));
      }
    }, 4);
  });
  await page.waitForTimeout(5000);
  console.log('riff result:', await page.evaluate(() => { const r = Game.scene.lastRiff || (Game.scene.riff && Game.scene.riff.result); return JSON.stringify({ taps: window.__taps, hist: (Game.scene.riff ? Game.scene.riff.history : []).slice(0, 5) }); }));
  await page.screenshot({ path: `${OUT}/m_after.png` });
  console.log('errors:', errs.length, errs.slice(0, 4));
  await browser.close();
})();
