// ---------------------------------------------------------------------------
// shell.js - the money: ammonite shells.
//
// A fossil ammonite, painted a pixel at a time: a coiled shell whose whorls
// get smaller towards the middle, ribbed, lit from the upper left, with a
// little mother-of-pearl sheen. It takes the place of the old gem sprite
// everywhere (the tile, the counter, the ones that fly across a scene).
// ---------------------------------------------------------------------------
'use strict';

const Ammonite = (() => {
  const RAMP = ['#3a2415', '#75401f', '#b07a45', '#d8a86b', '#f2d6a0', '#fffaea'];
  function paint(size, key) {
    return Pix.make(key, size + 2, size + 2, P => {
      const c = (size + 2) / 2, R = size / 2 - 0.2;
      for (let y = 0; y < size + 2; y++) for (let x = 0; x < size + 2; x++) {
        const dx = x + 0.5 - c, dy = y + 0.5 - c, r = Math.hypot(dx, dy);
        if (r > R) continue;
        const th = Math.atan2(dy, dx), t = (th + Math.PI) / (Math.PI * 2);
        // a coil: one whorl every D pixels outwards, so the spiral line runs
        // from the rim to the middle two and a half times round
        const D = size / 5.2, u = r / D - t, f = u - Math.floor(u), outer = r > R - D;
        let l = 0.42 + Math.sin(f * Math.PI) * 0.4 - (dx + dy) / (2 * R) * 0.32;
        if (f < 0.24 && !(outer && f > 0.1)) l = 0.0;                  // the groove the coil turns in
        else if (outer && Math.sin(th * 11) > 0.55) l -= 0.22;           // ribs on the last whorl
        if (r < 1.2) l = 0.0;
        const col = RAMP[clamp(Math.floor(l * RAMP.length + P.dith(x, y) * 0.7), 0, RAMP.length - 1)];
        P.put(x, y, col);
      }
    }, { ink: '#140a05' });
  }
  // register it under the old gem sprite's name, so every use of it changes
  function install() {
    const cv = paint(18, 'ammonite18');
    Gfx.spriteCache.set('ti_gem', { w: cv.width, h: cv.height, frames: [cv], def: {}, anchorX: cv.width / 2, anchorY: cv.height });
    Gfx.spriteCache.set('ti_shell', Gfx.spriteCache.get('ti_gem'));
  }
  return { paint, install };
})();
Ammonite.install();
