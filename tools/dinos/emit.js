'use strict';
const fs = require('fs'), path = require('path');
const { Cv } = require('./lib.js');
const { G } = require('./dinos.js');
const ROOT = '/home/user/studious-invention';
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'js2/manifest.json'), 'utf8'));
const want = Object.entries(man).filter(([, v]) => v.file === 'art_dinos');

const ORDER = ['compy_idle', 'compy_walk', 'dodo_idle', 'dodo_walk', 'boar_idle', 'boar_walk',
  'raptor_idle', 'raptor_walk', 'ptero_fly', 'tricera_idle', 'tricera_walk',
  'lizard_idle', 'lizard_walk', 'tarblob_idle', 'stego_idle', 'stego_walk'];

let out = `'use strict';
// art_dinos.js - the combat roster: sixteen comedy dinosaurs, all facing right.
// Every creature uses outline:true - the engine grows the dark border, so the art
// here carries only shading: light from the upper left, darkest tone on the
// lower-right edge and under the belly.

`;
const report = [];
for (const name of ORDER) {
  const m = man[name];
  if (!m) { console.log('NOT IN MANIFEST', name); continue; }
  const fns = G[name];
  if (!fns) { console.log('NO DRAW FN', name); continue; }
  if (fns.length !== m.frames) console.log(`!! ${name}: ${fns.length} frames, manifest wants ${m.frames}`);
  const frames = [];
  for (const fn of fns) {
    const c = new Cv(m.w, m.h);
    fn(c);
    const rows = c.rows();
    const bb = c.bbox();
    frames.push({ rows, bb });
  }
  // centre the whole animation horizontally (same shift for every frame)
  {
    const lo = Math.min(...frames.map(f => f.bb.minx)), hi = Math.max(...frames.map(f => f.bb.maxx));
    let dx = Math.round(((m.w - 1 - hi) - lo) / 2);
    if (dx > 0) dx = Math.min(dx, m.w - 1 - hi); else if (dx < 0) dx = Math.max(dx, -lo);
    if (dx !== 0) for (const fr of frames) {
      fr.rows = fr.rows.map(r => dx > 0 ? '.'.repeat(dx) + r.slice(0, m.w - dx) : r.slice(-dx) + '.'.repeat(-dx));
      fr.bb.minx += dx; fr.bb.maxx += dx;
    }
  }
  const bottomOK = frames.every(f => f.bb.maxy === m.h - 1);
  const minx = Math.min(...frames.map(f => f.bb.minx)), maxx = Math.max(...frames.map(f => f.bb.maxx));
  const miny = Math.min(...frames.map(f => f.bb.miny)), maxy = Math.max(...frames.map(f => f.bb.maxy));
  report.push(`${name.padEnd(14)} ${m.w}x${m.h} x:${minx}..${maxx} (L${minx} R${m.w - 1 - maxx})  y:${miny}..${maxy} (T${miny} B${m.h - 1 - maxy})` +
    (bottomOK ? '' : '  <-- FLOATS'));
  // frame difference check
  for (let i = 1; i < frames.length; i++) {
    let diff = 0;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (frames[i].rows[y][x] !== frames[i - 1].rows[y][x]) diff++;
    report.push(`    f${i - 1}->f${i}: ${diff} px changed`);
  }
  out += `SPRITES.${name} = { outline: true, frames: [\n`;
  out += frames.map(f => '[\n' + f.rows.map(r => `'${r}',`).join('\n') + '\n]').join(',\n');
  out += `]};\n\n`;
}
fs.writeFileSync(path.join(ROOT, 'js2/art_dinos.js'), out);
console.log(report.join('\n'));
console.log('\nwrote js2/art_dinos.js', (out.length / 1024).toFixed(1) + 'KB');
