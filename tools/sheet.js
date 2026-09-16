// node tools/sheet.js <artfile[,artfile]> [outname] [scale] [onlySubstring]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const [, , files = 'art_chars', out, scale = '2', only = ''] = process.argv;
  const dest = out || `/tmp/claude-0/-home-user-studious-invention/b07c031c-846e-582c-baca-98b85064c1db/scratchpad/sheet_${files.split(',')[0]}.png`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const msgs = [];
  page.on('console', m => msgs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', e => msgs.push('pageerror: ' + e.message));
  await page.goto('file://' + path.join(__dirname, 'sheet.html') + `?f=${files}&s=${scale}&only=${only}`);
  await page.waitForTimeout(700);
  console.log('title:', await page.title());
  const el = await page.$('#game');
  await el.screenshot({ path: dest });
  if (msgs.length) console.log(msgs.slice(0, 20).join('\n'));
  console.log('saved', dest);
  await browser.close();
})();
