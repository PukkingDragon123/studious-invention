// Paints one World set at a chosen camera position and shoots it.
// usage: node tools/setshot.js <set> <camX> <camY> <zoomMul> <out.png> [optJSON]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const [, , set, cx, cy, zm, out, optJSON] = process.argv;
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().split('\n')[0]); });
  await page.goto('http://127.0.0.1:8765/index.html'); await page.waitForTimeout(700);
  await page.evaluate(([set, cx, cy, zm, optJSON]) => {
    const cam = new Camera();
    cam.zoom = cam.tzoom = VIEW * zm;
    cam.lookAt(cx, cy, true);
    const opt = optJSON ? JSON.parse(optJSON) : {};
    Game.scene = {
      enter() { }, exit() { }, update(dt) { cam.update(dt); },
      draw() {
        Gfx.clear('#120c16');
        cam.apply(Gfx.ctx);
        (World[set])(Time.t, opt, cam.x - W / (2 * cam.zoom));
        Particles.draw(Gfx.ctx, true);
        cam.restore(Gfx.ctx);
      }, click() { },
    };
  }, [set, +cx, +cy, +zm, optJSON || '']);
  await page.waitForTimeout(1400);
  await page.screenshot({ path: out });
  console.log('ERRORS (' + errs.length + '):\n' + [...new Set(errs)].slice(0, 8).join('\n'));
  await b.close();
})();
