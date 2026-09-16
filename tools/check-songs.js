const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const audio = fs.readFileSync(path.join(root, 'js2/audio.js'), 'utf8');
const songs = fs.readFileSync(path.join(root, 'js2/songs.js'), 'utf8');
// evaluate parsePattern + noteToMidi from audio.js, and SONGS
const ctx = new Function('window', 'document', audio.replace(/const AudioSys = \{[\s\S]*$/, '') + '\n' + songs + '\nreturn {parsePattern, SONGS};')({}, {});
let bad = 0;
for (const [id, s] of Object.entries(ctx.SONGS)) {
  for (const [tn, tr] of Object.entries(s.tracks)) {
    const origWarn = console.warn; let warned = [];
    console.warn = (...a) => warned.push(a.join(' '));
    const steps = ctx.parsePattern(tr.pat);
    console.warn = origWarn;
    if (steps.length % 16 !== 0) { console.log(`${id}.${tn}: ${steps.length} steps (not multiple of 16)`); bad++; }
    if (warned.length) { console.log(`${id}.${tn}:`, warned.join('; ')); bad++; }
    if (s.bars && steps.length / 16 !== s.bars && (s.bars % (steps.length / 16)) !== 0) { console.log(`${id}.${tn}: ${steps.length / 16} bars vs song ${s.bars}`); bad++; }
  }
}
console.log(Object.keys(ctx.SONGS).length, 'songs checked,', bad, 'problems');
