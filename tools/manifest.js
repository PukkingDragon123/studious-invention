// node tools/manifest.js art_chars   -> prints the sprites that file must define
const m = require('../js2/manifest.json');
const want = process.argv[2];
let n = 0;
for (const [name, v] of Object.entries(m)) {
  if (want && v.file !== want) continue;
  n++;
  console.log(`${name}  ${v.w}x${v.h}  ${v.frames} frame${v.frames > 1 ? 's' : ''}\n    ${v.note}`);
}
console.log(`\n${n} sprites for ${want || 'all files'}`);
