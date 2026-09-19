// node tools/worldshot.js <stage> <out.png> [xs...]   - paint a World strip at several camera x
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const [, , stage = 'home', out = '/tmp/world.png', ...xs] = process.argv;
  const cams = xs.length ? xs.map(Number) : [0, 700, 1400, 2100];
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 960, height: 540 * cams.length } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://127.0.0.1:8765/index.html'); await page.waitForTimeout(700);
  await page.evaluate(([stage, cams]) => {
    const cv = document.getElementById('game');
    cv.height = 540 * cams.length;
    cv.style.height = (540 * cams.length) + 'px';
    Game.paused = true; if (Game.raf) cancelAnimationFrame(Game.raf);
    Game.go = () => {}; Game.loop = () => {};
    cams.forEach((cx, i) => {
      Gfx.ctx.save(); Gfx.ctx.translate(0, i * 540);
      Gfx.ctx.beginPath(); Gfx.ctx.rect(0, 0, 960, 540); Gfx.ctx.clip();
      Gfx.ctx.fillStyle = '#120c16'; Gfx.ctx.fillRect(0, 0, 960, 540);
      Gfx.ctx.scale(VIEW, VIEW);
      Gfx.ctx.translate(-cx, -(GY - (H / VIEW) * (stage === 'concert' ? 0.95 : 0.74)));
      World[stage](2.0, { fire: 1, beat: 0.5 }, cx);
      Gfx.ctx.restore();
      // landmark rulers so it is obvious what sits where
      if (typeof HOME !== 'undefined') for (const [k, v] of Object.entries(HOME)) {
        const sx = (v - cx) * VIEW; if (sx < 0 || sx > 960) continue;
        Gfx.rectA(sx, i * 540, 1, 540, '#ff00ff', 0.5);
        Gfx.text(k, sx + 3, i * 540 + 22, { color: '#ff88ff', scale: 1, font: 'small' });
      }
      Gfx.text('cam x ' + cx, 8, i * 540 + 8, { color: '#ffe98a', scale: 1.2, outline: true });
    });
  }, [stage, cams]);
  await page.waitForTimeout(150);
  await page.locator('#game').screenshot({ path: out });
  if (errs.length) console.log('ERRORS:', [...new Set(errs)].slice(0, 5).join(' | '));
  console.log('saved', out);
  await b.close();
})();
