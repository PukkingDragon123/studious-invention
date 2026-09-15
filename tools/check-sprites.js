// Validates sprite data: equal row widths, known palette chars, prints sizes.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const gfxSrc = fs.readFileSync(path.join(root, 'js/gfx.js'), 'utf8');
const palMatch = gfxSrc.match(/const PAL = (\{[\s\S]*?\n\});/);
const PAL = new Function('return ' + palMatch[1])();
const sprSrc = fs.readFileSync(path.join(root, 'js/sprites.js'), 'utf8');
const SPRITES = new Function(sprSrc + '\nreturn SPRITES;')();
let bad = 0;
for (const [name, def] of Object.entries(SPRITES)) {
  const frames = Array.isArray(def) ? [def] : def.frames;
  const pal = Object.assign({}, PAL, def.pal || {});
  const w = frames[0][0].length, h = frames[0].length;
  frames.forEach((rows, fi) => {
    if (rows.length !== h) { console.log(`${name} frame ${fi}: height ${rows.length} != ${h}`); bad++; }
    rows.forEach((r, ri) => {
      if (r.length !== w) { console.log(`${name} frame ${fi} row ${ri}: width ${r.length} != ${w}`); bad++; }
      for (const ch of r) if (!(ch in pal)) { console.log(`${name} frame ${fi} row ${ri}: unknown char '${ch}'`); bad++; }
    });
  });
}
console.log(Object.keys(SPRITES).length, 'sprites checked,', bad, 'problems');
process.exit(bad ? 1 : 0);
