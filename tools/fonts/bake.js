// Bakes a pixel font (woff2) into the game's bitmap glyph format.
// It finds the size at which one design pixel lands on one screen pixel (the
// size where the rasterizer produces almost no half-covered pixels), then
// thresholds every glyph into '#'/'.' rows with its own advance width.
// Usage: node tools/fonts/bake.js <font.woff2> [size]  -> JSON on stdout
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:;!?\'"-+=/\\()[]<>%&*#@$_~^|x';
(async () => {
  const [, , file, want] = process.argv;
  const b64 = fs.readFileSync(file).toString('base64');
  const br = await chromium.launch(); const p = await br.newPage();
  const out = await p.evaluate(async ([b64, CHARS, want]) => {
    const ff = new FontFace('F', `url(data:font/woff2;base64,${b64})`); await ff.load(); document.fonts.add(ff);
    const cv = document.createElement('canvas'); cv.width = 200; cv.height = 200; const g = cv.getContext('2d', { willReadFrequently: true });
    const test = size => {
      g.font = `${size}px F`; let part = 0, full = 0;
      for (const ch of 'ABHMWagkx08') { g.clearRect(0, 0, 200, 200); g.fillText(ch, 20, 100); const d = g.getImageData(0, 0, 200, 200).data; for (let i = 3; i < d.length; i += 4) { if (d[i] > 40 && d[i] < 215) part++; else if (d[i] >= 215) full++; } }
      return part / Math.max(1, full);
    };
    let size = +want || 0;
    if (!size) { let best = 1e9; for (let s = 6; s <= 48; s++) { const r = test(s); if (r < best - 0.01) { best = r; size = s; } if (r < 0.02) { size = s; break; } } }
    g.font = `${size}px F`;
    const m = g.measureText('Hg'), asc = Math.ceil(m.fontBoundingBoxAscent), desc = Math.ceil(m.fontBoundingBoxDescent);
    const H = asc + desc, glyphs = {}, widths = {};
    let top = H, bot = 0;
    const raw = {};
    for (const ch of CHARS) {
      const w = Math.round(g.measureText(ch).width);
      g.clearRect(0, 0, 200, 200); g.fillText(ch, 4, 4 + asc);
      const d = g.getImageData(0, 0, 200, 200).data;
      const rows = [];
      for (let y = 0; y < H; y++) { let r = ''; for (let x = 0; x < w + 2; x++) { const on = d[((4 + y) * 200 + 4 + x) * 4 + 3] > 127; r += on ? '#' : '.'; if (on) { top = Math.min(top, y); bot = Math.max(bot, y); } } rows.push(r); }
      raw[ch] = rows; widths[ch] = w;
    }
    // trim the rows every glyph leaves empty
    for (const ch of CHARS) glyphs[ch] = raw[ch].slice(top, bot + 1).map(r => r.replace(/\.+$/, '')).join('|');
    return { size, h: bot - top + 1, base: asc - top, widths, glyphs, partial: test(size) };
  }, [b64, CHARS, want]);
  process.stdout.write(JSON.stringify(out));
  await br.close();
})();
