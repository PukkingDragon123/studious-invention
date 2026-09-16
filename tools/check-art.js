// Validates all js2/art_*.js sprite data against the palette and the manifest.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const gfx = fs.readFileSync(path.join(root, 'js2/gfx.js'), 'utf8');
const PAL = new Function('return ' + gfx.match(/const PAL = (\{[\s\S]*?\n\});/)[1])();
const files = process.argv.slice(2).length ? process.argv.slice(2).map(f => f.endsWith('.js') ? f : `js2/art_${f}.js`)
  : fs.readdirSync(path.join(root, 'js2')).filter(f => /^art_.*\.js$/.test(f)).map(f => 'js2/' + f);
let manifest = {};
try { manifest = JSON.parse(fs.readFileSync(path.join(root, 'js2/manifest.json'), 'utf8')); } catch (e) { }
// when specific files are given, only hold them to their own slice of the manifest
if (process.argv.slice(2).length) {
  const want = new Set(files.map(f => path.basename(f, '.js')));
  manifest = Object.fromEntries(Object.entries(manifest).filter(([, v]) => want.has(v.file)));
}
let bad = 0, total = 0;
const seen = {};
for (const rel of files) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) { console.log('MISSING FILE', rel); bad++; continue; }
  const SPRITES = {};
  try { new Function('SPRITES', fs.readFileSync(p, 'utf8'))(SPRITES); }
  catch (e) { console.log(rel, 'FAILED TO PARSE:', e.message); bad++; continue; }
  for (const [name, def] of Object.entries(SPRITES)) {
    total++;
    if (seen[name]) { console.log(`${name}: duplicated (also in ${seen[name]})`); bad++; }
    seen[name] = rel;
    const frames = Array.isArray(def) ? [def] : def.frames;
    if (!frames || !frames.length) { console.log(`${name}: no frames`); bad++; continue; }
    const pal = def.pal ? Object.assign({}, PAL, def.pal) : PAL;
    const w = frames[0][0].length, h = frames[0].length;
    frames.forEach((rows, fi) => {
      if (rows.length !== h) { console.log(`${name} f${fi}: height ${rows.length} != ${h}`); bad++; }
      rows.forEach((r, ri) => {
        if (r.length !== w) { console.log(`${name} f${fi} row ${ri}: width ${r.length} != ${w}`); bad++; }
        for (const ch of r) if (!(ch in pal)) { console.log(`${name} f${fi} row ${ri}: bad colour '${ch}'`); bad++; }
      });
    });
    const m = manifest[name];
    if (m) {
      if (m.w !== w || m.h !== h) { console.log(`${name}: size ${w}x${h}, manifest says ${m.w}x${m.h}`); bad++; }
      if (m.frames && m.frames !== frames.length) { console.log(`${name}: ${frames.length} frames, manifest says ${m.frames}`); bad++; }
    }
  }
}
for (const name of Object.keys(manifest)) if (!seen[name]) { console.log(`MISSING SPRITE: ${name} (${manifest[name].w}x${manifest[name].h}, ${manifest[name].frames || 1} frames) - ${manifest[name].note || ''}`); bad++; }
console.log(`${total} sprites checked, ${bad} problems`);
process.exit(bad ? 1 : 0);
