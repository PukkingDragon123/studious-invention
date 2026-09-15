// Usage: node tools/shot.js <url-or-file> <out.png> [width] [height] [fullPage]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const [,, target, out, w = '1280', h = '720', full = 'true'] = process.argv;
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: +w, height: +h } });
  page.on('console', m => console.log('[console]', m.type(), m.text()));
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto(target.startsWith('http') ? target : 'file://' + require('path').resolve(target));
  await page.waitForTimeout(500);
  await page.screenshot({ path: out, fullPage: full === 'true' });
  await browser.close();
  console.log('saved', out);
})();
