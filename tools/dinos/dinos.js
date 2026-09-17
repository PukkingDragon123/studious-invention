'use strict';
const { Cv, ik, footPath, eyeBall, clamp } = require('./lib.js');

// ---------------------------------------------------------------- ramps
const R = {
  compy: 'tuvwx',          // olive/green
  compyDark: 'ttuvw',
  gold: 'YZ89',
  dodo: 'HI345',           // grey-blue
  beak: 'YZ89',
  foot: 'zAB8',
  boar: 'fghim',
  bone: '!@#$',
  rapt: 'tuvwx',           // green
  raptTeal: 'MNOOP',       // teal stripe markings
  crest: 'zABC',
  memb: 'fghim',           // wing membrane: dark leather, reads against the tan body
  ptero: 'klmn',           // ptero body: light tan
  red: 'DEFG',
  tric: 'jklm',            // hide
  frill: 'klmn',           // frill: lighter than the hide
  lava: 'yzABC',
  lavaDark: 'yyzAB',
  tar: '0011Q234',
  stego: 'Q2345',
  stegoM: 'QR345',         // mottling with more purple
  plate: 'klmn',
};
const KNEE = -1;           // digitigrade legs bend forward

// toes helper: n little claws on the ground
function toes(c, x, y, n, ramp, dark, sp = 2) {
  for (let i = 0; i < n; i++) {
    c.cap(x, y, x + 1.6 + i * sp, y, 1.3, 1.0, ramp, { dark });
    c.pix(x + 2.6 + i * sp, y, i % 2 ? '@' : '#');
  }
}

// =================================================================== COMPY
// 42x30 tiny pack raptor, olive green, yellow throat, big dumb eye
function compyLeg(c, hx, hy, ft, dark) {
  const ax = ft.x - 3.2, ay = ft.y - 5.4;
  const k = ik(hx, hy, ax, ay, 7, 6, KNEE);
  c.begin();
  c.cap(hx, hy, k.x, k.y, 4.2, 2.3, R.compy, { dark });
  c.cap(k.x, k.y, k.fx, k.fy, 2.1, 1.4, R.compy, { dark });
  c.cap(k.fx, k.fy, ft.x - 1, ft.y, 1.5, 1.2, R.compy, { dark });
  c.cap(ft.x - 1.5, ft.y, ft.x + 2, ft.y, 1.2, 1.0, R.compy, { dark });
  c.pix(ft.x + 3, ft.y, '@'); c.pix(ft.x + 3, ft.y - 1, '!');
  c.pix(ft.x - 2.5, ft.y, '!');
  c.sep(0.2, 0.06);
}
function compy(c, f) {
  const B = f.bob || 0;
  const hipX = 17, hipY = 18 + B;
  // far leg
  c.dk = 0.26; compyLeg(c, hipX - 2, hipY, f.far, 0); c.dk = 0;
  // tail, level and tapering
  const t1 = f.tail || 0;
  c.cap(14, 16.5 + B, 6, 13.5 + B + t1, 4.8, 2.4, R.compy);
  c.cap(6, 13.5 + B + t1, 1, 10.5 + B + t1 * 1.9, 2.4, 0.8, R.compy);
  // body
  c.ell(17, 16 + B, 7.8, 6.0, R.compy);
  c.ell(22.5, 14 + B, 5.6, 4.9, R.compy, { bias: 0.04 });
  // neck + head
  const H = (f.head || 0) + B;
  c.begin();
  c.cap(22, 14.5 + B, 27.5, 9 + H, 3.4, 3.0, R.compy);
  c.ell(31, 7.5 + H, 5.3, 4.5, R.compy);
  c.cap(31, 8.6 + H, 38.6, 9.7 + H, 3.2, 1.8, R.compy);          // snout
  c.sep(0.18, 0.05);
  // jaw
  const jaw = f.mouth ? 1.6 : 0;
  c.cap(30, 10.6 + H + jaw, 37.6, 11.4 + H + jaw * 1.2, 2.2, 1.1, R.compy);
  if (jaw) c.rect(31, 10 + H, 37, 10 + H + jaw - 0.6, 'y00', { base: 0.12 });
  for (let i = 0; i < 4; i++) c.pix(31.5 + i * 2, 10.2 + H, '$');
  for (let i = 0; i < 3; i++) c.pix(32.5 + i * 2, 10.4 + H + jaw, '#');
  // yellow throat (under the jaw only)
  c.swap((x, y) => y > 10.6 + H && x < 30 && Math.hypot((x - 25.5) / 5.4, (y - (13.2 + H)) / 3.4) < 1, R.compy, R.gold);
  c.swap((x, y) => y > 11.4 + H && y < 13.6 + H && x > 28 && x < 33, R.compy, R.gold);
  // near leg
  compyLeg(c, hipX, hipY, f.near, 0);
  // stripes over the back + tail
  c.adj((x, y) => ((x * 1.1 + y * 0.55) % 9) < 3 && y < 19 + B, -0.26, R.compy);
  // pale belly, lit back, flank spots
  c.adj((x, y) => Math.hypot((x - 17) / 8.4, (y - (19.8 + B)) / 3.2) < 1, 0.18, R.compy);
  c.adj((x, y) => Math.hypot((x - 17) / 9, (y - (11.5 + B)) / 4.5) < 1, 0.1, R.compy);
  for (const [sx, sy, sr] of [[13, 14, 2.6], [21, 12, 2.2], [9, 17, 2]])
    c.adj((x, y) => Math.hypot(x - sx, (y - (sy + B)) * 1.2) < sr, -0.12, R.compy);
  // big dumb eye + brow
  eyeBall(c, 31.5, 6.4 + H, 3.0, 2.9, 1, 0, { pw: 3, ph: 3 });
  c.lineCh(28, 2.8 + H, 34, 2.6 + H, 't');
  c.pix(35, 3.6 + H, 't'); c.pix(27, 3.8 + H, 't');
  c.pix(36.5, 8.4 + H, '0');   // nostril
  c.finish();
}

// =================================================================== DODO
// 46x44 fat grey-blue dodo, enormous yellow beak, three tail feathers
function dodoLeg(c, hx, hy, ft, dark) {
  const k = ik(hx, hy, ft.x, ft.y - 1, 4.5, 4.5, KNEE);
  c.begin();
  c.cap(hx, hy, k.x, k.y, 2.6, 2.0, R.foot, { dark });
  c.cap(k.x, k.y, k.fx, k.fy, 1.9, 1.4, R.foot, { dark });
  const fy = Math.round(ft.y);
  for (let i = 0; i < 3; i++) {
    c.cap(ft.x - 1, fy, ft.x + 1.5 + i * 1.6, fy - (i === 1 ? 0.2 : 0), 1.25, 0.9, R.foot, { dark });
    c.pix(ft.x + 2.6 + i * 1.6, fy, '!');
  }
  c.cap(ft.x - 1, fy, ft.x - 3.4, fy, 1.1, 0.8, R.foot, { dark });
  c.pix(ft.x - 4.4, fy, '!');
  c.pix(ft.x + 0.4, fy - 1, 'z'); c.pix(ft.x + 2.4, fy - 1, 'z');
  c.sep(0.2);
}
function dodo(c, f) {
  const B = f.bob || 0, L = f.lean || 0, TF = f.tf || 0;
  // three tail feathers, each a different value so they read apart
  const fan = [[3, 9.5, 0.3], [0, 16.5, 0.14], [2.5, 24, 0]];
  for (let i = 0; i < 3; i++) {
    const [tx, ty, dk] = fan[i];
    const yy = ty + B + TF * (1 - i * 0.5);
    c.dk = dk;
    c.begin();
    c.cap(14, 23 + B + i * 1.6, tx, yy, 3.8, 1.3, R.dodo);
    c.pix(tx - 0.8, yy - 0.4, '6'); c.pix(tx + 0.4, yy - 1, '5');
    c.sep(0.3);
  }
  c.dk = 0;
  // far leg
  c.dk = 0.26; dodoLeg(c, 19 + L, 35 + B, f.far, 0); c.dk = 0;
  // fat body
  c.ell(21 + L * 0.4, 26 + B, 13.5, 12.5, R.dodo);
  c.ell(26 + L * 0.5, 22 + B, 8.5, 8, R.dodo, { bias: 0.05 });
  // neck + head
  const HX = 30 + L, HY = 12 + B + (f.head || 0);
  c.begin();
  c.cap(26 + L, 20 + B, HX - 0.5, HY + 3, 5.2, 5.6, R.dodo);
  c.ell(HX, HY, 7, 6.3, R.dodo);
  c.sep(0.16, 0.05);
  // enormous beak
  c.begin();
  c.poly([[HX + 2.5, HY - 5], [HX + 15, HY + 1.5], [HX + 14, HY + 5], [HX + 8, HY + 7.5], [HX + 2, HY + 5]], R.beak, { gain: 0.44 });
  c.poly([[HX + 5, HY + 5.5], [HX + 14.5, HY + 4.4], [HX + 12.5, HY + 8], [HX + 7, HY + 8.5]], R.beak, { bias: -0.26, gain: 0.3 });
  c.sep(0.22);
  c.lineCh(HX + 6, HY + 5.4, HX + 13.5, HY + 3.8, 'Y');
  c.pix(HX + 14, HY + 6.6, 'Y'); c.pix(HX + 13, HY + 7.6, 'Y');
  c.pix(HX + 5, HY - 2, 'Y'); c.pix(HX + 6, HY - 1.4, 'Z');   // nostril
  c.lineCh(HX + 3, HY - 4.4, HX + 12, HY + 0.6, '9');          // beak highlight
  // little wing with feather tips
  c.begin();
  c.ell(24 + L * 0.4, 28 + B, 5.4, 6.6, R.dodo, { bias: 0.12 });
  c.sep(0.18, 0.08);
  for (let i = 0; i < 3; i++) c.adj((x, y) => Math.abs(x - (20.5 + L * 0.4 + i * 3)) < 1.2 && y > 31 + B && y < 35 + B, -0.16, R.dodo);
  // near leg
  dodoLeg(c, 24 + L, 35 + B, f.near, 0);
  // plumage texture, pale belly, dark underside
  c.adj((x, y) => ((x * 0.6 + y * 1.35) % 8) < 1.7, -0.09, R.dodo);
  c.adj((x, y) => Math.hypot((x - (18 + L)) / 9, (y - (31 + B)) / 7) < 1, 0.16, R.dodo);
  c.adj((x, y) => y > 33 + B && Math.hypot((x - (20 + L)) / 12.5, (y - (28 + B)) / 11.5) < 1.02, -0.14, R.dodo);
  c.adj((x, y) => Math.hypot((x - (17 + L)) / 8, (y - (18 + B)) / 6) < 1, 0.08, R.dodo);
  // permanently startled eye
  eyeBall(c, HX + 1.5, HY - 2, 3.6, 3.4, 1, 0, { pw: 2, ph: 2 });
  c.lineCh(HX - 2.5, HY - 6.6, HX + 4, HY - 6.3, 'H');
  c.pix(HX + 5, HY - 5.6, 'H'); c.pix(HX - 3.4, HY - 5.7, 'H');
  c.finish();
}

// =================================================================== BOAR
// 66x42 bristly cave boar, upward tusks, small red eye, spine ridge
function boarLeg(c, hx, hy, ft, dark, front) {
  const k = ik(hx, hy, ft.x, ft.y - 3, 6.5, 6, front ? -1 : 1);
  c.begin();
  c.cap(hx, hy, k.x, k.y, 3.8, 2.4, R.boar, { dark });
  c.cap(k.x, k.y, k.fx, k.fy, 2.0, 1.4, R.boar, { dark });
  c.cap(k.fx, k.fy, ft.x, ft.y - 1.4, 1.5, 1.7, R.boar, { dark });
  c.rect(ft.x - 1.7, ft.y - 1, ft.x + 1.7, ft.y, '0012', { base: 0.6, dark });   // hoof
  c.pix(ft.x, ft.y - 1, '2');
  c.sep(0.22, 0.05);
}
function boar(c, f) {
  const B = f.bob || 0;
  // far legs
  c.dk = 0.3;
  boarLeg(c, 20, 27 + B, f.far1, 0, false);
  boarLeg(c, 42, 27 + B, f.far2, 0, true);
  c.dk = 0;
  // curly tail
  c.begin();
  c.cap(12, 20 + B, 7, 17 + B + (f.tail || 0), 2.2, 1.1, R.boar);
  c.cap(7, 17 + B + (f.tail || 0), 5, 21 + B + (f.tail || 0), 1.2, 1.0, R.boar);
  c.pix(4, 22 + B + (f.tail || 0), 'f'); c.pix(5, 23 + B + (f.tail || 0), 'g');
  c.sep(0.2);
  // barrel body, shoulder hump, rump
  c.ell(27, 20 + B, 16.5, 9.2, R.boar);
  c.ell(38, 15.5 + B, 10, 8.5, R.boar, { bias: 0.06 });
  c.ell(17, 21 + B, 10, 8.2, R.boar, { bias: -0.02 });
  // ears (far then near)
  const HX = 48, HY = 24 + B + (f.head || 0);
  c.dk = 0.26;
  c.tri([HX - 8, HY - 8], [HX - 6, HY - 16], [HX - 1, HY - 7], R.boar);
  c.dk = 0;
  // head wedge
  c.begin();
  c.ell(HX, HY, 9.5, 8.5, R.boar);
  c.cap(HX + 1, HY + 2, HX + 13, HY + 4.5, 6.0, 4.2, R.boar);
  c.ell(HX + 13.5, HY + 4.6, 3.6, 3.4, R.boar, { bias: 0.1 });   // snout disc
  c.sep(0.26, 0.07);
  c.pix(HX + 13, HY + 3.4, '1'); c.pix(HX + 14.4, HY + 5, '1');   // nostrils
  c.lineCh(HX + 6, HY + 8, HX + 12.5, HY + 7.4, 'f');             // mouth
  c.pix(HX + 13.6, HY + 6.8, 'f');
  // near ear
  c.begin();
  c.tri([HX - 4, HY - 7], [HX + 0.5, HY - 17], [HX + 5, HY - 6], R.boar, { bias: 0.04 });
  c.sep(0.2, 0.08);
  c.tri([HX - 2, HY - 7], [HX + 0.5, HY - 14], [HX + 3, HY - 7], R.boar, { bias: -0.22 });
  // tusks
  c.dk = 0.34;
  c.cap(HX + 6.5, HY + 7.5, HX + 8.5, HY + 1.5, 1.7, 0.9, R.bone, { base: 0.58 });
  c.pix(HX + 9, HY, '#');
  c.dk = 0;
  c.begin();
  c.cap(HX + 12, HY + 6.5, HX + 15, HY - 2, 2.0, 1.1, R.bone, { base: 0.66 });
  c.pix(HX + 15.4, HY - 3.6, '$'); c.pix(HX + 14.8, HY - 3, '#');
  c.sep(0.2);
  // near legs
  boarLeg(c, 25, 27 + B, f.near1, 0, false);
  boarLeg(c, 46, 27 + B, f.near2, 0, true);
  // neck crease
  c.adj((x, y) => Math.abs(x - (41 + (y - 18 - B) * 0.18)) < 1.2 && y > 10 + B && y < 31 + B, -0.16, R.boar);
  // bristle mane along the spine
  for (let i = 0; i < 15; i++) {
    const x = 14 + i * 2.1;
    const t = (x - 14) / 30;
    const base = 21 + B - Math.sqrt(Math.max(0, 1 - Math.pow((x - 29) / 19, 2))) * 10.5 - (x > 33 ? (x - 33) * 0.45 : 0);
    const hgt = 3.4 + Math.sin(t * 3.4) * 2.6 + (f.bristle || 0) * (i % 2 ? 1.2 : -0.5);
    c.cap(x, base + 2, x + 1.4 - t * 2.4, base - hgt, 1.2, 0.5, 'fgh', { base: 0.4 });
  }
  // coarse hair, dark belly, lit back
  c.adj((x, y) => ((x * 1.5 + y * 0.85) % 5) < 1.1, -0.11, R.boar);
  c.adj((x, y) => ((x * 0.45 - y * 1.6) % 11) < 1.6, 0.1, R.boar);
  c.adj((x, y) => y > 24 + B && y < 31 + B && x < 58, -0.17, R.boar);
  c.adj((x, y) => Math.hypot((x - 28) / 15, (y - (13 + B)) / 6) < 1, 0.1, R.boar);
  // small mean red eye + brow
  c.pix(HX + 3, HY - 3, 'E'); c.pix(HX + 4, HY - 3, 'F');
  c.pix(HX + 3, HY - 2, 'F'); c.pix(HX + 4, HY - 2, 'G');
  c.pix(HX + 4, HY - 3, '0'); c.pix(HX + 3, HY - 2, '0');
  c.pix(HX + 5, HY - 3, '7');
  c.lineCh(HX + 1, HY - 4.6, HX + 6, HY - 4, 'f');
  c.pix(HX + 7, HY - 3.4, 'f');
  c.finish();
}

// =================================================================== RAPTOR
// 72x56 green with teal stripes, feathered crest/forearms, sickle claw
function raptorLeg(c, hx, hy, ft, dark, claw) {
  const ax = ft.x - 5, ay = ft.y - 9;
  const k = ik(hx, hy, ax, ay, 12, 11, KNEE);
  c.begin();
  c.cap(hx, hy, k.x, k.y, 6.4, 3.2, R.rapt, { dark });          // thigh
  c.cap(k.x, k.y, k.fx, k.fy, 2.8, 1.9, R.rapt, { dark });      // shin
  c.cap(k.fx, k.fy, ft.x, ft.y, 2.2, 1.6, R.rapt, { dark });    // metatarsus
  c.cap(ft.x - 1.5, ft.y, ft.x + 4.5, ft.y, 1.7, 1.2, R.rapt, { dark });
  c.pix(ft.x + 5.6, ft.y, '@'); c.pix(ft.x + 5.6, ft.y - 1, '!');
  c.pix(ft.x - 2.6, ft.y, '!');
  if (claw) {  // raised sickle claw
    c.cap(ft.x - 1, ft.y - 2, ft.x + 2.5, ft.y - 5, 1.7, 1.1, R.bone, { base: 0.68, dark });
    c.pix(ft.x + 3.6, ft.y - 6.2, '$'); c.pix(ft.x + 3, ft.y - 5.2, '#');
    c.pix(ft.x + 4.2, ft.y - 7.2, '@');
  } else {
    c.pix(ft.x + 5, ft.y - 2, '#'); c.pix(ft.x + 5.6, ft.y - 1.2, '@');
  }
  c.sep(0.22, 0.06);
}
function raptor(c, f) {
  const B = f.bob || 0;
  // tail, held level
  const tw = f.tail || 0;
  c.cap(23, 30 + B, 12, 27.5 + B + tw, 7.2, 4.2, R.rapt);
  c.cap(12, 27.5 + B + tw, 2, 24 + B + tw * 2.2, 4.2, 1.2, R.rapt);
  // far leg
  c.dk = 0.26; raptorLeg(c, 28, 32 + B, f.far, 0, f.farClaw); c.dk = 0;
  // body
  c.ell(29, 30 + B, 13.5, 9.5, R.rapt);
  c.ell(38, 26 + B, 9.5, 8, R.rapt, { bias: 0.05 });
  // far arm
  c.dk = 0.32;
  c.begin();
  c.cap(40, 28 + B, 44, 33 + B, 2.6, 1.8, R.rapt);
  c.cap(44, 33 + B, 49, 31 + B, 1.8, 1.3, R.rapt);
  c.sep(0.18);
  c.dk = 0;
  // neck + head
  const HX = 55, HY = 11 + B + (f.head || 0);
  c.begin();
  c.cap(40, 25 + B, 50, HY + 3, 5.6, 4.6, R.rapt);
  c.ell(HX, HY, 6.6, 5.2, R.rapt);
  c.cap(HX - 1, HY + 1, HX + 11.5, HY + 3.2, 4.4, 2.6, R.rapt);            // upper jaw
  c.sep(0.18, 0.05);
  const jaw = f.jaw || 0;
  c.cap(HX - 1, HY + 4.6 + jaw, HX + 10, HY + 5.6 + jaw * 1.6, 2.6, 1.3, R.rapt);  // lower jaw
  if (jaw > 0.6) c.rect(HX + 1, HY + 4.2, HX + 9, HY + 4.2 + jaw - 0.5, 'y00', { base: 0.12 });
  for (let i = 0; i < 5; i++) { c.pix(HX + 1 + i * 2.4, HY + 4 + i * 0.16, '$'); c.pix(HX + 1 + i * 2.4, HY + 4.9 + i * 0.16, '#'); }
  for (let i = 0; i < 4; i++) c.pix(HX + 2 + i * 2.4, HY + 3.6 + jaw + i * 0.15, '#');
  c.pix(HX + 9.6, HY + 1.4, '0'); c.pix(HX + 10.4, HY + 1.9, 't');           // nostril
  // rust crest: individual quills off the back of the skull
  const fw = f.feather || 0;
  c.begin();
  for (let i = 0; i < 5; i++) {      // short quills hugging the back of the skull
    const x0 = HX - 3 - i * 1.5, y0 = HY - 4.2 + i * 1.7;
    const len = 7 - i * 0.6;
    const x1 = x0 - len * 0.8 - 1, y1 = y0 - len * 0.75 + (i % 2 ? fw : -fw * 0.6);
    c.cap(x0, y0, x1, y1, 1.3, 0.5, R.crest, { base: 0.5 + (i % 2) * 0.12 });
    c.pix(x1 - 0.5, y1 - 0.4, i % 2 ? 'C' : 'B');
  }
  for (let i = 0; i < 3; i++) {      // a couple of quills down the nape
    const t = i / 2, x0 = 45 - t * 5, y0 = 20 + B + t * 5.5;
    c.cap(x0, y0, x0 - 3.6 - t, y0 - 3 + (i % 2 ? fw * 0.6 : 0), 1.0, 0.45, R.crest, { base: 0.36 + (i % 2) * 0.12 });
  }
  c.sep(0.18, 0.05);
  // near arm + forearm feathers
  const el = [46.5, 34.5 + B + (f.arm || 0)], hand = [53, 32 + B + (f.arm || 0) * 1.4];
  for (let i = 0; i < 4; i++) {      // forearm feathers: thin strokes with gaps
    const bx = el[0] + i * 1.9, by = el[1] + 0.4;
    c.cap(bx, by, bx - 1.6, by + 5 - i * 0.6 + (i % 2 ? fw : 0), 0.9, 0.42, R.crest, { base: 0.46 + (i % 2) * 0.14 });
  }
  c.begin();
  c.cap(41, 28 + B, el[0], el[1], 3.2, 2.1, R.rapt);
  c.cap(el[0], el[1], hand[0], hand[1], 2.1, 1.4, R.rapt);
  c.sep(0.2, 0.06);
  c.cap(hand[0], hand[1], hand[0] + 4, hand[1] - 1.8, 1.2, 0.6, R.bone, { base: 0.64 });
  c.cap(hand[0], hand[1] + 1, hand[0] + 3.6, hand[1] + 1.4, 1.1, 0.55, R.bone, { base: 0.56 });
  // near leg
  raptorLeg(c, 31, 33 + B, f.near, 0, f.nearClaw);
  // teal stripe markings over the body + tail
  c.swap((x, y) => ((x * 1.0 + y * 0.72) % 12) < 3.4 && x < 52, R.rapt, R.raptTeal);
  c.adj((x, y) => ((x * 1.0 + y * 0.72) % 12) < 3.4, -0.08, R.raptTeal);
  // pale belly + throat
  c.adj((x, y) => Math.hypot((x - 30) / 12, (y - (37 + B)) / 5) < 1, 0.2, R.rapt);
  c.adj((x, y) => Math.hypot((x - 46) / 7, (y - (20 + B)) / 6.5) < 1, 0.16, R.rapt);
  c.adj((x, y) => Math.hypot((x - 30) / 13, (y - (24 + B)) / 6) < 1, 0.07, R.rapt);
  // eye + heavy brow
  eyeBall(c, HX + 2, HY - 0.6, 3.0, 2.7, 1, 0, { pw: 3, ph: 3 });
  c.lineCh(HX - 2, HY - 3.8, HX + 5.5, HY - 3.4, 't');
  c.pix(HX + 6.4, HY - 2.6, 't'); c.pix(HX - 3, HY - 3, 't');
  c.pix(HX + 5, HY - 2.6, 't');
  c.finish();
}

// =================================================================== PTERO
// 84x46 leathery tan wings, long red crest, full flap cycle
function pteroWing(c, W, dark) {
  const S = W.s, E = W.e, T = W.t, c1 = W.c1, c2 = W.c2, hip = W.h;
  const pts = [S, E, T, c1, c2, hip];
  c.dk = dark;
  c.begin();
  c.poly(pts, R.memb, { base: 0.46, gain: 0.34 });
  // scalloped bite out of the trailing edge
  {
    const cx = (c1[0] + c2[0]) / 2, cy = (c1[1] + c2[1]) / 2;
    const gx = (S[0] + E[0] + T[0] + c1[0] + c2[0]) / 5, gy = (S[1] + E[1] + T[1] + c1[1] + c2[1]) / 5;
    const dx = cx - gx, dy = cy - gy, dl = Math.hypot(dx, dy) || 1, r = 3.2;
    const qx = cx + dx / dl * r * 0.8, qy = cy + dy / dl * r * 0.8;
    for (let y = Math.floor(qy - r); y <= Math.ceil(qy + r); y++)
      for (let x = Math.floor(qx - r); x <= Math.ceil(qx + r); x++)
        if (Math.hypot(x - qx, y - qy) <= r && c.rampAt(x, y) === R.memb) c.clearPix(x, y);
  }
  // finger bones fanning from the wrist into the membrane
  for (let i = 1; i <= 3; i++) {
    const t = i / 4;
    const px = E[0] + (T[0] - E[0]) * t, py = E[1] + (T[1] - E[1]) * t;
    const u = 0.75 - t * 0.55;
    const qx = c1[0] + (c2[0] - c1[0]) * u, qy = c1[1] + (c2[1] - c1[1]) * u;
    c.cap(px, py, px + (qx - px) * 0.85, py + (qy - py) * 0.85, 0.6, 0.6, R.memb, { base: 0.74, onlyOver: R.memb });
  }
  // leading edge: arm bones, much lighter than the membrane
  c.cap(S[0], S[1], E[0], E[1], 3.2, 2.3, R.ptero, { base: 0.66 });
  c.cap(E[0], E[1], T[0], T[1], 2.3, 0.7, R.ptero, { base: 0.76 });
  c.ell(E[0], E[1], 2.8, 2.8, R.ptero, { base: 0.7 });
  c.sep(0.24);
  c.dk = 0;
}
const off = (w, B) => ({ s: [w.s[0], w.s[1] + B], e: [w.e[0], w.e[1] + B], t: [w.t[0], w.t[1] + B], c1: [w.c1[0], w.c1[1] + B], c2: [w.c2[0], w.c2[1] + B], h: [w.h[0], w.h[1] + B] });
function ptero(c, f) {
  const B = f.bob || 0;
  // far wing
  pteroWing(c, off(f.farWing, B), 0.22);
  // tail + vane
  c.cap(40, 28 + B, 30, 31 + B, 2.4, 1.0, R.ptero, { base: 0.5 });
  c.begin();
  c.poly([[31, 31 + B], [26, 27.5 + B], [22, 32 + B], [28, 34 + B]], R.red, { base: 0.5, gain: 0.32 });
  c.sep(0.2);
  // near wing (behind the body so the body stays readable)
  pteroWing(c, off(f.wing, B), 0);
  // legs
  c.dk = 0.3;
  c.cap(43, 29 + B, 37, 33 + B, 2.3, 1.4, R.memb, { base: 0.5 });
  c.cap(37, 33 + B, 34, 35 + B, 1.4, 1.0, R.memb, { base: 0.5 });
  c.dk = 0;
  c.begin();
  c.cap(45, 30 + B, 40, 35 + B, 2.5, 1.5, R.ptero, { base: 0.5 });
  c.cap(40, 35 + B, 37, 37.5 + B, 1.5, 1.1, R.ptero, { base: 0.5 });
  c.pix(36, 38 + B, '@'); c.pix(35, 37 + B, '!'); c.pix(36, 39 + B, '!');
  c.sep(0.2);
  // body
  c.begin();
  c.ell(46, 26 + B, 8.5, 6.2, R.ptero, { bias: 0.08 });
  c.ell(51, 23.5 + B, 6, 4.8, R.ptero, { bias: 0.12 });
  c.sep(0.26, 0.08);
  // neck + head
  const HX = 62, HY = 17 + B + (f.head || 0);
  c.begin();
  c.cap(53, 22 + B, HX - 2, HY + 1.5, 3.8, 3.6, R.ptero, { bias: 0.08 });
  c.ell(HX, HY, 5.2, 4.6, R.ptero, { bias: 0.08 });
  c.sep(0.2, 0.06);
  // long pointed beak
  c.poly([[HX + 1, HY - 3.2], [HX + 18, HY + 1.6], [HX + 17, HY + 3], [HX + 1, HY + 3]], R.ptero, { base: 0.64, gain: 0.3 });
  c.poly([[HX + 2, HY + 3], [HX + 16.5, HY + 3.2], [HX + 13, HY + 5.6], [HX + 2, HY + 5.2]], R.ptero, { base: 0.4, gain: 0.26 });
  c.lineCh(HX + 3, HY + 3.1, HX + 15, HY + 2.9, 'j');
  c.lineCh(HX + 3, HY - 2, HX + 15, HY + 1.4, 'n');
  c.pix(HX + 5, HY - 1.6, 'j');
  // long swept crest
  c.begin();
  c.poly([[HX - 1, HY - 4], [HX - 14, HY - 13], [HX - 16, HY - 9], [HX - 4, HY - 0.5], [HX + 3, HY - 2.6]], R.red, { base: 0.54, gain: 0.34 });
  c.sep(0.2);
  c.lineCh(HX - 3, HY - 5.4, HX - 13, HY - 11.4, 'G');
  // leathery texture, pale belly, fuzzy body
  c.adj((x, y) => ((x * 0.8 + y * 1.25) % 9) < 1.5, -0.08, R.memb);
  c.adj((x, y) => Math.hypot((x - 46) / 8, (y - (30 + B)) / 3.4) < 1, 0.16, R.ptero);
  c.adj((x, y) => ((x * 1.7 - y * 0.85) % 6) < 1.2 && Math.hypot((x - 47) / 10, (y - (25 + B)) / 7) < 1, 0.1, R.ptero);
  // eye + brow
  eyeBall(c, HX + 1.5, HY - 1, 2.8, 2.5, 1, 0, { pw: 3, ph: 3 });
  c.lineCh(HX - 1.8, HY - 3.8, HX + 4, HY - 3.4, 'f');
  c.pix(HX + 4.8, HY - 2.8, 'f');
  c.finish();
}

// =================================================================== TRICERA
// 104x66 heavy tan-brown, scalloped frill, three ivory horns, beak
function tricLeg(c, hx, hy, ft, dark, front) {
  const k = ik(hx, hy, ft.x, ft.y - 5, 10, 9.5, front ? -1 : 1);
  c.begin();
  c.cap(hx, hy, k.x, k.y, front ? 6.6 : 7.6, 4.6, R.tric, { dark });
  c.cap(k.x, k.y, k.fx, k.fy, 4.2, 3.4, R.tric, { dark });
  c.cap(k.fx, k.fy, ft.x, ft.y - 1.5, 3.4, 4.6, R.tric, { dark });
  for (let i = 0; i < 3; i++) { c.cap(ft.x - 1, ft.y, ft.x + 1 + i * 2.2, ft.y, 1.6, 1.2, R.tric, { dark }); c.pix(ft.x + 2.4 + i * 2.2, ft.y, i % 2 ? '@' : '#'); }
  c.pix(ft.x - 3.4, ft.y, '!');
  c.sep(0.24, 0.06);
}
function tricera(c, f) {
  const B = f.bob || 0, HD = (f.head || 0);
  // far legs
  c.dk = 0.28;
  tricLeg(c, 18, 47 + B, f.far1, 0, false);
  tricLeg(c, 46, 47 + B, f.far2, 0, true);
  c.dk = 0;
  // tail
  c.cap(16, 36 + B, 7, 32 + B + (f.tail || 0), 7.5, 3.6, R.tric);
  c.cap(7, 32 + B + (f.tail || 0), 2, 29 + B + (f.tail || 0) * 1.8, 3.6, 1.3, R.tric);
  // barrel body
  c.ell(34, 38 + B, 21, 14, R.tric);
  c.ell(46, 36 + B, 12, 13, R.tric, { bias: 0.05 });
  c.ell(20, 39 + B, 12, 12, R.tric, { bias: -0.05 });
  // ---- frill: a tall scalloped shield standing up behind the skull
  const FY = B + HD, FCX = 66, FCY = 23 + FY;
  const frill = [[54, 44 + FY], [51, 28 + FY], [55, 12 + FY], [64, 4 + FY], [76, 6 + FY],
  [83, 18 + FY], [82, 32 + FY], [73, 44 + FY]];
  c.begin();
  for (let i = 0; i < 8; i++) {         // scallops bulging off the rim
    const a = -2.55 + i * 0.39;
    c.ell(FCX + Math.cos(a) * 15.5, FCY + Math.sin(a) * 19, 3.8, 3.8, R.frill, { base: 0.66, bias: -0.02 });
  }
  c.poly(frill, R.frill, { base: 0.68, gain: 0.34, round: 3 });
  c.sep(0.34, 0.12);
  for (let i = 0; i < 8; i++) {         // ivory knobs on the scallops
    const a = -2.55 + i * 0.39;
    c.pix(FCX + Math.cos(a) * 18.8, FCY + Math.sin(a) * 22.4, '@', { onlyFilled: true });
    c.pix(FCX + Math.cos(a) * 17.8, FCY + Math.sin(a) * 21.2, '#', { onlyFilled: true });
  }
  // frill plate: darker fenestrae, radiating struts
  for (const [ox, oy, orr] of [[-5, -6, 5.4], [5, -8, 4.8], [-4, 6, 5.4], [6, 3, 4.6]])
    c.adj((x, y) => Math.hypot((x - (FCX + ox)) / orr, (y - (FCY + oy)) / (orr * 1.15)) < 1, -0.15, R.frill);
  for (let i = 0; i < 6; i++) {
    const a = -2.35 + i * 0.44;
    c.cap(FCX + Math.cos(a) * 5, FCY + Math.sin(a) * 5, FCX + Math.cos(a) * 14, FCY + Math.sin(a) * 17,
      0.7, 0.7, R.frill, { base: 0.88, onlyOver: R.frill });
  }
  // ---- skull, jutting forward out of the frill
  const HX = 84, HY = 40 + B + HD;
  c.begin();
  c.ell(HX, HY, 11, 10, R.tric);
  c.cap(HX + 2, HY + 1.5, HX + 12, HY + 3.2, 7.5, 5.2, R.tric);
  c.sep(0.3, 0.1);
  // beak: small, hooked, pointing down-forward
  c.begin();
  c.poly([[HX + 10, HY + 1], [HX + 17.5, HY + 4], [HX + 15, HY + 9], [HX + 9, HY + 7.5]], R.bone, { base: 0.22, gain: 0.3 });
  c.poly([[HX + 9, HY + 7.5], [HX + 15, HY + 8], [HX + 12.5, HY + 11], [HX + 7, HY + 10]], R.bone, { base: 0.1, gain: 0.26 });
  c.sep(0.22);
  c.lineCh(HX + 8, HY + 7.8, HX + 14.5, HY + 7.4, '!');
  c.pix(HX + 12, HY + 2.4, '!');
  // nose horn
  c.begin();
  c.poly([[HX + 8, HY], [HX + 13.5, HY - 11], [HX + 16, HY + 1.5]], R.bone, { base: 0.72, gain: 0.3 });
  c.sep(0.3);
  c.pix(HX + 14, HY - 11.6, '$');
  // brow horns, sweeping forward and up over the beak: far then near
  c.dk = 0.3;
  c.cap(HX - 5, HY - 6, HX + 8, HY - 21, 3.6, 1.3, R.bone, { base: 0.56 });
  c.pix(HX + 9, HY - 22.4, '@');
  c.dk = 0;
  c.begin();
  c.cap(HX, HY - 6, HX + 16, HY - 20, 4.4, 1.5, R.bone, { base: 0.66 });
  c.pix(HX + 17.2, HY - 21.2, '$'); c.pix(HX + 16.4, HY - 20.6, '#');
  c.pix(HX + 18, HY - 22.2, '@');
  c.sep(0.26, 0.08);
  // near legs
  tricLeg(c, 24, 47 + B, f.near1, 0, false);
  tricLeg(c, 52, 47 + B, f.near2, 0, true);
  // hide: subtle texture, dark belly, lit back, big flank spots
  c.adj((x, y) => ((x * 1.3 + y * 0.72) % 6) < 1.2, -0.05, R.tric);
  c.adj((x, y) => ((x * 0.35 - y * 1.55) % 12) < 2.4, 0.07, R.tric);
  c.adj((x, y) => y > 46 + B && y < 57 + B && x < 64, -0.26, R.tric);
  c.adj((x, y) => Math.hypot((x - 32) / 21, (y - (26 + B)) / 9) < 1, 0.12, R.tric);
  for (const [sx, sy, sr] of [[26, 33, 5], [40, 31, 4.4], [32, 43, 4.6], [45, 42, 4], [20, 42, 3.6], [48, 47, 3.4]])
    c.adj((x, y) => Math.hypot(x - sx, (y - (sy + B)) * 1.2) < sr, -0.14, R.tric);
  c.swap((x, y) => Math.hypot((x - 34) / 18, (y - (50 + B)) / 5) < 1 && y > 44 + B, R.tric, R.frill);
  c.adj((x, y) => true, -0.12, R.frill);
  // eye + heavy brow
  eyeBall(c, HX + 3, HY - 1, 3.3, 3.0, 1, 0, { pw: 3, ph: 3 });
  c.lineCh(HX - 1.5, HY - 4.8, HX + 7, HY - 4.4, 'j');
  c.pix(HX + 8, HY - 3.6, 'j'); c.pix(HX - 2.4, HY - 3.8, 'j');
  c.finish();
}

// =================================================================== LAVA LIZARD
// 58x38 orange-red scales, glowing cracks, spiky ridge, forked tongue
function lizLeg(c, hx, hy, ft, dark) {
  const k = ik(hx, hy, ft.x + 1, ft.y - 2, 6.5, 6, 1);
  c.begin();
  c.cap(hx, hy, k.x, k.y, 3.4, 2.2, R.lava, { dark });
  c.cap(k.x, k.y, k.fx, k.fy, 2.1, 1.5, R.lava, { dark });
  for (let i = -1; i <= 1; i++) c.cap(ft.x, ft.y, ft.x + 2.6 - Math.abs(i) * 0.7, ft.y + i * 1.5 - 0.5, 1.3, 0.8, R.lava, { dark });
  c.pix(ft.x + 3.6, ft.y - 2, '#'); c.pix(ft.x + 3.8, ft.y - 0.4, '@'); c.pix(ft.x + 3.2, ft.y + 1, '#');
  c.sep(0.24, 0.06);
}
function lizard(c, f) {
  const B = f.bob || 0;
  // far legs
  c.dk = 0.3;
  lizLeg(c, 16, 25 + B, f.far1, 0);
  lizLeg(c, 33, 25 + B, f.far2, 0);
  c.dk = 0;
  // tail
  const tw = f.tail || 0;
  c.cap(14, 21 + B, 7, 19 + B + tw, 6, 3, R.lava);
  c.cap(7, 19 + B + tw, 1.5, 14.5 + B + tw * 1.7, 3, 1, R.lava);
  // body
  c.ell(24, 21 + B, 14, 8, R.lava);
  c.ell(33, 22 + B, 9, 6.6, R.lava, { bias: 0.03 });
  // head
  const HX = 43, HY = 22 + B + (f.head || 0);
  c.begin();
  c.ell(HX, HY, 7.2, 5.6, R.lava);
  c.cap(HX, HY - 0.6, HX + 8.5, HY + 0.8, 4.6, 2.6, R.lava);
  c.sep(0.2, 0.06);
  const jaw = f.jaw || 0;
  c.cap(HX, HY + 3.4 + jaw, HX + 7.5, HY + 3.8 + jaw * 1.6, 2.4, 1.2, R.lava);
  if (jaw > 0.4) c.rect(HX + 1, HY + 2.4, HX + 7, HY + 2.4 + jaw - 0.3, 'y00', { base: 0.1 });
  // forked tongue
  const tg = f.tongue || 0;
  if (tg > 0) {
    c.cap(HX + 5, HY + 2.8, HX + 9 + tg * 3, HY + 2.2 + jaw * 0.5, 1.1, 0.7, R.red, { base: 0.66 });
    c.pix(HX + 10 + tg * 3, HY + 0.8, 'F'); c.pix(HX + 11 + tg * 3, HY, 'G');
    c.pix(HX + 10 + tg * 3, HY + 3.2, 'F'); c.pix(HX + 11 + tg * 3, HY + 4, 'G');
  }
  for (let i = 0; i < 4; i++) c.pix(HX + 2 + i * 1.9, HY + 2.3, '$');
  c.pix(HX + 8.6, HY - 1.6, 'y');
  // near legs
  lizLeg(c, 18, 25 + B, f.near1, 0);
  lizLeg(c, 35, 25 + B, f.near2, 0);
  // chunky crocodile ridge
  c.begin();
  for (let i = 0; i < 10; i++) {
    const x = 8 + i * 3.4, prog = i / 9;
    const top = 21 + B - Math.sqrt(Math.max(0, 1 - Math.pow((x - 26) / 21, 2))) * 8.8 + (i < 2 ? (2 - i) * 1.6 : 0);
    const hgt = 3.6 + Math.sin(prog * 3.1) * 4.2 + (f.spike || 0) * (i % 2 ? 0.8 : 0);
    c.tri([x - 2.4, top + 2.2], [x + 0.4, top - hgt], [x + 2.6, top + 2.4], R.lavaDark, { base: 0.5, gain: 0.34 });
    c.pix(x + 0.4, top - hgt, '9');
  }
  c.sep(0.18, 0.08);
  // scale dither, dark belly, lit back
  c.adj((x, y) => ((x + (y % 2) * 2) % 4 === 0) && ((y % 2) === 0), -0.13, R.lava);
  c.adj((x, y) => Math.hypot((x - 24) / 15, (y - (27 + B)) / 4.5) < 1, -0.22, R.lava);
  c.adj((x, y) => Math.hypot((x - 26) / 16, (y - (16 + B)) / 5) < 1, 0.12, R.lava);
  // glowing crack network: dark fissure with a hot core
  const cracks = [[13, 20, 19, 17], [19, 17, 25, 19], [25, 19, 31, 16],
  [19, 17, 21, 22], [25, 19, 26, 24], [31, 16, 36, 18]];
  for (const [x0, y0, x1, y1] of cracks) {
    c.lineCh(x0, y0 + B + 1, x1, y1 + B + 1, 'y', { onlyFilled: true });
    c.lineCh(x0 + 1, y0 + B + 1, x1 + 1, y1 + B + 1, 'z', { onlyFilled: true });
    c.lineCh(x0, y0 + B, x1, y1 + B, '9', { onlyFilled: true });
    c.lineCh(x0 + 1, y0 + B, x1 + 1, y1 + B, 'C', { onlyFilled: true });
    c.lineCh(x0, y0 + B - 1, x1, y1 + B - 1, 'B', { onlyFilled: true });
  }
  // molten eye with a slit pupil
  eyeBall(c, HX + 2, HY - 2, 3.0, 2.7, 0, 0, { dot: false, white: '9', shade: '8', pw: 1, ph: 4, glint: false });
  c.pix(HX + 1, HY - 3, '7');
  c.lineCh(HX - 2, HY - 5.2, HX + 5, HY - 4.8, 'y');
  c.pix(HX + 5.8, HY - 4, 'y');
  c.finish();
}

// =================================================================== TAR BLOB
// 54x46 near-black glossy ooze, two white eyes, wobble + drips
function tarblob(c, f) {
  const G = 45;
  // --- masses
  c.ell(f.bx, G - f.bh * 0.5, f.bw, f.bh, R.tar);
  c.rect(f.bx - f.bw, G - 1, f.bx + f.bw, G, R.tar);
  c.ell(f.mx, f.my, f.mw, f.mh, R.tar);
  c.ell(f.tx, f.ty, f.tw, f.th, R.tar);
  for (const L of f.lumps) c.ell(L[0], L[1], L[2], L[3], R.tar);
  for (const D of f.drips) {           // stretched strand + fat bead on the end
    c.cap(D[0], D[1], D[0] + (D[3] || 0), D[2], 2.2, 0.8, R.tar);
    c.ell(D[0] + (D[3] || 0), D[2] + 1.8, 2.6, 3.0, R.tar);
  }
  if (f.drop) c.ell(f.drop[0], f.drop[1], 2.4, 3.2, R.tar);
  // --- one coherent light over the whole ooze
  const bb = c.bbox();
  c.relight((bb.minx + bb.maxx) / 2, (bb.miny + bb.maxy) / 2 + 2,
    (bb.maxx - bb.minx) / 2 + 2, (bb.maxy - bb.miny) / 2 + 2, 0.3, 0.62, R.tar);
  c.adj((x, y) => y > G - 9, -0.1, R.tar);
  c.adj((x, y) => y > G - 3, -0.08, R.tar);
  // --- gloss: hard specular blot on the upper left + a highlight on every drip
  for (const [gx, gy, gl] of f.gloss) {
    c.ell(gx, gy, gl * 0.62, gl * 0.5, '3345', { base: 0.9, gain: 0.3, onlyOver: R.tar });
    c.pix(gx - 1, gy - 1, '5', { onlyFilled: true });
  }
  for (const [gx, gy] of f.spark) { c.pix(gx, gy, '4', { onlyFilled: true }); c.pix(gx + 1, gy + 1, '2', { onlyFilled: true }); }
  for (const D of f.drips) {           // wet highlight down the strand + on the bead
    const dx = (D[3] || 0), n = Math.max(2, Math.round(D[2] - D[1]));
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = D[0] + dx * t - 1.2, y = D[1] + (D[2] - D[1]) * t;
      c.pix(x, y, i % 3 === 2 ? '2' : '3', { onlyFilled: true });
    }
    c.pix(D[0] + dx - 1.6, D[2] + 1.2, '4', { onlyFilled: true });
    c.pix(D[0] + dx - 2, D[2] + 2.2, '3', { onlyFilled: true });
  }
  if (f.drop) { c.pix(f.drop[0] - 1, f.drop[1] - 1, '4'); c.pix(f.drop[0] - 1, f.drop[1], '2'); }
  // --- two big white eyes floating in the goo
  for (const E of f.eyes) eyeBall(c, E[0], E[1], E[2], E[3], E[4], E[5], { dot: false, pw: E[6] ?? 3, ph: E[7] ?? 3, shade: '5' });
  c.finish({ rimDark: 0.08, rimLight: 0.26 });
}

// =================================================================== STEGO
// 106x62 purple-grey, two rows of tan plates, spiked tail, tiny head
function stegoLeg(c, hx, hy, ft, dark, front) {
  const k = ik(hx, hy, ft.x, ft.y - 4, front ? 8 : 9.5, front ? 7.5 : 9, front ? -1 : 1);
  c.begin();
  c.cap(hx, hy, k.x, k.y, front ? 5.4 : 7.2, 4.0, R.stego, { dark });
  c.cap(k.x, k.y, k.fx, k.fy, 3.6, 3.0, R.stego, { dark });
  c.cap(k.fx, k.fy, ft.x, ft.y - 1.4, 3.2, 4.2, R.stego, { dark });
  for (let i = 0; i < 3; i++) { c.cap(ft.x - 1, ft.y, ft.x + 0.8 + i * 2, ft.y, 1.5, 1.1, R.stego, { dark }); c.pix(ft.x + 2.2 + i * 2, ft.y, i % 2 ? '@' : '#'); }
  c.pix(ft.x - 3.2, ft.y, '!');
  c.sep(0.24, 0.06);
}
// leaf-shaped back plate
function plate(c, x, y, w, h, dark, lean) {
  c.begin();
  c.poly([[x - w, y + h * 0.5], [x - w * 0.8 + lean * 0.4, y - h * 0.3], [x - w * 0.25 + lean, y - h],
  [x + w * 0.35 + lean, y - h * 0.92], [x + w * 0.85 + lean * 0.4, y - h * 0.2], [x + w, y + h * 0.5]],
    R.plate, { base: 0.56, gain: 0.4, dark });
  c.sep(0.26, 0.1);
  // rim + central vein
  c.cap(x - w * 0.15 + lean * 0.5, y + h * 0.4, x + lean * 0.8, y - h * 0.6, 0.6, 0.6, R.plate, { base: 0.3, dark, onlyOver: R.plate });
  c.cap(x - w * 0.62, y - h * 0.15, x - w * 0.3 + lean, y - h * 0.8, 0.55, 0.55, R.plate, { base: 0.66, dark, onlyOver: R.plate });
}
function stego(c, f) {
  const B = f.bob || 0;
  const backY = (x) => 30 + B - Math.sqrt(Math.max(0, 1 - Math.pow((x - 50) / 36, 2))) * 14;
  // far plate row (behind, darker, offset)
  for (const [px, ph] of f.platesFar) plate(c, px, backY(px) + 5.5, ph * 0.45, ph, 0.3, -1.5 + (f.plateLean || 0));
  // far legs
  c.dk = 0.28;
  stegoLeg(c, 32, 43 + B, f.far1, 0, false);
  stegoLeg(c, 72, 43 + B, f.far2, 0, true);
  c.dk = 0;
  // tail + thagomizer
  const tw = f.tail || 0;
  c.cap(30, 36 + B, 17, 30 + B + tw, 10, 5, R.stego);
  c.cap(17, 30 + B + tw, 5, 24 + B + tw * 2, 5, 2.2, R.stego);
  const sy = 25.5 + B + tw * 2;
  // thagomizer: two spikes up, two down, spread along the last of the tail
  const spikes = [[6, sy - 2, -1, sy - 12, 1], [11.5, sy - 2.5, 8, sy - 13, 0],
  [6, sy + 2, 0, sy + 9, 1], [11.5, sy + 2.5, 9.5, sy + 10, 0]];
  for (const [bx, by, tx, ty, far] of spikes) {
    c.begin();
    c.cap(bx, by, tx, ty, 3.2, 0.9, R.bone, { base: 0.64, dark: far ? 0.24 : 0 });
    c.pix(tx + (tx - bx) * 0.12, ty + (ty - by) * 0.12, far ? '#' : '$');
    c.sep(0.24, 0.08);
  }
  // body: arched back
  c.ell(50, 36 + B, 29, 15, R.stego);
  c.ell(44, 30 + B, 20, 12, R.stego, { bias: 0.04 });
  c.ell(72, 36 + B, 13, 11, R.stego, { bias: -0.02 });
  // neck + tiny head
  const HX = 95, HY = 43 + B + (f.head || 0);
  c.begin();
  c.cap(76, 33 + B, HX - 5, HY - 1.5, 9.5, 4.2, R.stego);
  c.ell(HX, HY, 5.2, 4.2, R.stego);
  c.cap(HX, HY + 0.8, HX + 5.5, HY + 1.8, 3.2, 2.2, R.stego);
  c.sep(0.2, 0.06);
  c.poly([[HX + 4, HY - 0.4], [HX + 8.6, HY + 1.6], [HX + 7, HY + 4], [HX + 3, HY + 3.4]], R.bone, { base: 0.52, gain: 0.32 });  // beak
  c.lineCh(HX + 3, HY + 2.6, HX + 7.6, HY + 2.6, '!');
  // near legs
  stegoLeg(c, 38, 44 + B, f.near1, 0, false);
  stegoLeg(c, 78, 44 + B, f.near2, 0, true);
  // near plate row
  for (const [px, ph] of f.platesNear) plate(c, px, backY(px) + 7.5, ph * 0.48, ph, 0, (f.plateLean || 0));
  // hide: dark belly, lit back, purple mottling
  c.adj((x, y) => ((x * 1.25 + y * 0.8) % 7) < 1.4, -0.09, R.stego);
  c.adj((x, y) => y > 43 + B && x > 22 && x < 88, -0.16, R.stego);
  c.adj((x, y) => Math.hypot((x - 48) / 28, (y - (24 + B)) / 9) < 1, 0.1, R.stego);
  for (const [mx, my, mr] of [[40, 33, 5.5], [56, 31, 4.6], [64, 39, 4.2], [32, 39, 3.8], [50, 41, 3.6], [72, 33, 3.6]])
    c.swap((x, y) => Math.hypot(x - mx, (y - (my + B)) * 1.15) < mr, R.stego, R.stegoM);
  c.adj((x, y) => true, -0.03, R.stegoM);
  // eye
  eyeBall(c, HX + 1, HY - 1, 2.4, 2.2, 1, 0, { pw: 2, ph: 2 });
  c.lineCh(HX - 2, HY - 3.4, HX + 3.5, HY - 3, 'Q');
  c.pix(HX + 4.4, HY - 2.4, 'Q');
  c.finish();
}

// ---------------------------------------------------------------- frame params
const G = {};

// --- compy ---------------------------------------------------------------
const compyIdle = [
  { bob: 0, head: 0, tail: 0, mouth: 0, near: { x: 22, y: 29 }, far: { x: 15, y: 29 } },
  { bob: 1, head: -1, tail: -1.8, mouth: 1, near: { x: 22, y: 29 }, far: { x: 15, y: 29 } },
];
const compyWalk = [0, 0.25, 0.5, 0.75].map((ph, i) => ({
  bob: [0, -1, 0, -1][i], head: [0, -1, -1, 0][i], tail: [1.6, 0, -1.6, 0][i], mouth: i === 1 ? 1 : 0,
  near: footPath(ph, 25, 12, 29, 5), far: footPath(ph + 0.5, 24, 11, 29, 5),
}));
G.compy_idle = compyIdle.map(f => (c) => compy(c, f));
G.compy_walk = compyWalk.map(f => (c) => compy(c, f));

// --- dodo ----------------------------------------------------------------
const dodoIdle = [
  { bob: 0, head: 0, lean: 0, tf: 0, near: { x: 24, y: 43 }, far: { x: 17, y: 43 } },
  { bob: 1, head: -1, lean: 0, tf: 1.6, near: { x: 24, y: 43 }, far: { x: 17, y: 43 } },
];
const dodoWalk = [0, 0.25, 0.5, 0.75].map((ph, i) => ({
  bob: [0, -1, 0, -1][i], head: [0, -1, 1, -1][i], lean: [1.5, 0, -1.5, 0][i], tf: [0, 1.4, 0, -1.4][i],
  near: footPath(ph, 28, 18, 43, 4), far: footPath(ph + 0.5, 24, 14, 43, 4),
}));
G.dodo_idle = dodoIdle.map(f => (c) => dodo(c, f));
G.dodo_walk = dodoWalk.map(f => (c) => dodo(c, f));

// --- boar ----------------------------------------------------------------
const boarStand = (i) => ({
  bob: i, head: i ? -1 : 0, tail: i ? -1.5 : 0, bristle: i ? 1 : 0,
  near1: { x: 24, y: 41 }, near2: { x: 47, y: 41 }, far1: { x: 18, y: 41 }, far2: { x: 41, y: 41 },
});
const boarIdle = [boarStand(0), boarStand(1)];
const boarWalk = [0, 0.25, 0.5, 0.75].map((ph, i) => ({
  bob: [0, -1, 0, -1][i], head: [0, -1, 0, 1][i], tail: [1, 0, -1, 0][i], bristle: [0, 1, 0, -0.6][i],
  near1: footPath(ph, 30, 18, 41, 5), near2: footPath(ph + 0.55, 53, 41, 41, 5),
  far1: footPath(ph + 0.5, 26, 14, 41, 5), far2: footPath(ph + 0.05, 48, 36, 41, 5),
}));
G.boar_idle = boarIdle.map(f => (c) => boar(c, f));
G.boar_walk = boarWalk.map(f => (c) => boar(c, f));

// --- raptor --------------------------------------------------------------
const raptorIdle = [
  { bob: 0, head: 0, tail: 0, arm: 0, jaw: 0.2, feather: 0, near: { x: 33, y: 55 }, far: { x: 26, y: 55 }, nearClaw: true },
  { bob: 1, head: -1, tail: -2, arm: 1, jaw: 1.8, feather: 1, near: { x: 33, y: 55 }, far: { x: 26, y: 55 }, nearClaw: true },
];
const raptorWalk = [0, 0.25, 0.5, 0.75].map((ph, i) => ({
  bob: [0, -2, 0, -2][i], head: [0, -1, 0, -1][i], tail: [2, 0, -2, 0][i], arm: [0, 1, 0, -1][i],
  jaw: [0, 0.6, 1.8, 0.6][i], feather: [0, 1, 0, -1][i],
  near: footPath(ph, 44, 20, 55, 9), far: footPath(ph + 0.5, 40, 16, 55, 9),
  nearClaw: true, farClaw: false,
}));
G.raptor_idle = raptorIdle.map(f => (c) => raptor(c, f));
G.raptor_walk = raptorWalk.map(f => (c) => raptor(c, f));

// --- ptero ---------------------------------------------------------------
// 0 wings up, 1 mid coming down, 2 full down, 3 mid coming up
const flap = [
  // elbow bends away from the hip: above the chord on the upstroke, below it on the downstroke
  { bob: 2, head: 0,  wing: { s: [46, 23], e: [30, 5], t: [4, 2], c1: [11, 14], c2: [26, 22], h: [41, 30] },
    farWing: { s: [44, 22], e: [33, 11], t: [12, 8], c1: [18, 18], c2: [30, 24], h: [39, 29] } },
  { bob: 0, head: 0,  wing: { s: [46, 23], e: [28, 13], t: [3, 12], c1: [11, 23], c2: [26, 28], h: [41, 30] },
    farWing: { s: [44, 22], e: [32, 18], t: [11, 17], c1: [17, 25], c2: [29, 28], h: [39, 29] } },
  { bob: -2, head: 1, wing: { s: [46, 23], e: [31, 37], t: [5, 42], c1: [13, 34], c2: [29, 30], h: [43, 26] },
    farWing: { s: [44, 22], e: [34, 31], t: [12, 35], c1: [18, 29], c2: [32, 26], h: [41, 24] } },
  { bob: 1, head: 0,  wing: { s: [46, 23], e: [28, 19], t: [3, 22], c1: [11, 32], c2: [27, 31], h: [42, 29] },
    farWing: { s: [44, 22], e: [31, 24], t: [10, 28], c1: [17, 34], c2: [29, 30], h: [40, 28] } },
];
G.ptero_fly = flap.map(f => (c) => ptero(c, f));

// --- tricera -------------------------------------------------------------
const tricStand = (i) => ({
  bob: i, head: i ? -1 : 0, tail: i ? -1.5 : 0,
  near1: { x: 24, y: 65 }, near2: { x: 54, y: 65 }, far1: { x: 16, y: 65 }, far2: { x: 46, y: 65 },
});
G.tricera_idle = [tricStand(0), tricStand(1)].map(f => (c) => tricera(c, f));
const tricWalk = [0, 0.25, 0.5, 0.75].map((ph, i) => ({
  bob: [0, -1, 0, -1][i], head: [0, 1, 0, -1][i], tail: [1.5, 0, -1.5, 0][i],
  near1: footPath(ph, 32, 16, 65, 5), near2: footPath(ph + 0.55, 62, 46, 65, 5),
  far1: footPath(ph + 0.5, 25, 9, 65, 5), far2: footPath(ph + 0.05, 55, 39, 65, 5),
}));
G.tricera_walk = tricWalk.map(f => (c) => tricera(c, f));

// --- lizard --------------------------------------------------------------
const lizIdle = [
  { bob: 0, head: 0, tail: 0, jaw: 0.8, tongue: 1, spike: 0, near1: { x: 20, y: 37 }, near2: { x: 38, y: 37 }, far1: { x: 13, y: 37 }, far2: { x: 31, y: 37 } },
  { bob: 1, head: 0, tail: -2, jaw: 0, tongue: 0, spike: 1, near1: { x: 20, y: 37 }, near2: { x: 38, y: 37 }, far1: { x: 13, y: 37 }, far2: { x: 31, y: 37 } },
];
const lizWalk = [0, 0.25, 0.5, 0.75].map((ph, i) => ({
  bob: [0, -1, 0, -1][i], head: [0, -1, 0, 1][i], tail: [2, 0, -2, 0][i], spike: [0, 1, 0, 1][i],
  jaw: [0.9, 0, 0.9, 0][i], tongue: [1, 0, 1, 0][i],
  near1: footPath(ph, 25, 13, 37, 4), near2: footPath(ph + 0.55, 43, 31, 37, 4),
  far1: footPath(ph + 0.5, 21, 9, 37, 4), far2: footPath(ph + 0.05, 39, 27, 37, 4),
}));
G.lizard_idle = lizIdle.map(f => (c) => lizard(c, f));
G.lizard_walk = lizWalk.map(f => (c) => lizard(c, f));

// --- tarblob -------------------------------------------------------------
const blobFrames = [
  { // 0: tall cone, a fat drip running down the right flank
    bx: 24, bw: 14, bh: 6.5, mx: 25, my: 26, mw: 16, mh: 13, tx: 22, ty: 14, tw: 6.5, th: 6,
    lumps: [[37, 29, 6.5, 6.5]], drips: [[40, 33, 43, 3]], drop: null,
    gloss: [[16, 19, 5], [21, 14, 3.4]], spark: [[33, 22], [12, 31], [29, 37]],
    eyes: [[21, 25, 4.4, 4.8, 1, -1], [31, 26, 3.8, 4.2, 1, -1]],
  },
  { // 1: squashed puddle, sagging left, eyes low and wide
    bx: 27, bw: 22, bh: 7, mx: 27, my: 32, mw: 19.5, mh: 10.5, tx: 31, ty: 23, tw: 8, th: 6.5,
    lumps: [[13, 32, 8, 7.5], [43, 34, 6, 6]], drips: [[8, 27, 34, -2]], drop: null,
    gloss: [[15, 26, 5.5], [24, 23, 3.4]], spark: [[37, 28], [9, 36], [26, 40]],
    eyes: [[24, 31, 4.8, 4.2, 0, 1], [35, 32, 4, 3.6, 0, 1]],
  },
  { // 2: rearing up and leaning right, long drip off the right shoulder
    bx: 28, bw: 11, bh: 6, mx: 29, my: 25, mw: 15, mh: 12.5, tx: 34, ty: 13, tw: 7.5, th: 7,
    lumps: [[20, 30, 8.5, 8]], drips: [[18, 31, 43, -3], [42, 29, 44, 2]], drop: null,
    gloss: [[22, 20, 5], [28, 14, 3.4]], spark: [[40, 26], [15, 32], [33, 39]],
    eyes: [[28, 24, 4.2, 4.6, 1, 0], [38, 26, 3.6, 4, 1, 0]],
  },
  { // 3: lumpy, spitting a droplet into the air, drip off the left
    bx: 25, bw: 20, bh: 7, mx: 24, my: 29, mw: 16, mh: 12, tx: 18, ty: 17, tw: 7.5, th: 7,
    lumps: [[37, 27, 7.5, 8], [11, 28, 6.5, 6.5]], drips: [[7, 32, 43, -2]], drop: [45, 12],
    gloss: [[13, 23, 5], [17, 13, 3.4]], spark: [[36, 22], [10, 34], [27, 38]],
    eyes: [[20, 27, 4.6, 4.2, -1, 0], [31, 25, 3.8, 4.4, -1, 0]],
  },
];
G.tarblob_idle = blobFrames.map(f => (c) => tarblob(c, f));

// --- stego ---------------------------------------------------------------
const platesN = [[27, 9], [40, 15], [53, 17], [65, 13.5], [76, 8.5]];
const platesF = [[21, 7], [34, 13], [47, 16.5], [59, 14.5], [70, 10.5]];
const stegoStand = (i) => ({
  bob: i, head: i ? -1 : 0, tail: i ? -1.5 : 0, plateLean: i ? 1 : 0,
  platesNear: platesN, platesFar: platesF,
  near1: { x: 38, y: 61 }, near2: { x: 80, y: 61 }, far1: { x: 30, y: 61 }, far2: { x: 72, y: 61 },
});
G.stego_idle = [stegoStand(0), stegoStand(1)].map(f => (c) => stego(c, f));
const stegoWalk = [0, 0.25, 0.5, 0.75].map((ph, i) => ({
  bob: [0, -1, 0, -1][i], head: [0, 1, 0, -1][i], tail: [1.5, 0, -1.5, 0][i], plateLean: [1.2, 0, -1.2, 0][i],
  platesNear: platesN, platesFar: platesF,
  near1: footPath(ph, 46, 30, 61, 4), near2: footPath(ph + 0.55, 88, 74, 61, 4),
  far1: footPath(ph + 0.5, 40, 24, 61, 4), far2: footPath(ph + 0.05, 80, 66, 61, 4),
}));
G.stego_walk = stegoWalk.map(f => (c) => stego(c, f));

module.exports = { G };
