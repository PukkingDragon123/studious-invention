// ---------------------------------------------------------------------------
// cardart.js - every card is a painting, edge to edge.
//
// Each card gets a whole scene: a painted sky or cave wall for its type (a
// red dusk for a riff, a blue cave for a move, a purple night for a power, a
// pink campfire dusk for a rally, gold for a solo), and in front of it the
// game's own characters doing the thing on the card - the hero playing, a
// raptor reeling from a club, a boulder coming down on a compy, lightning,
// fire, a stomp, a feast. The scene is drawn by pointing the game's own
// drawing calls at an offscreen canvas, and cached per card and hero.
// ---------------------------------------------------------------------------
'use strict';

const CardArt = (() => {
  const cache = new Map();
  const CW = CARD_W, CH = CARD_H, GY = 90;          // the ground line, just under where the rules start
  const hash = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const SKIES = {
    dusk: ['#1a0508', '#3f0e18', '#7d1d2b', '#c2333c', '#e06a1b', '#ffa832'],
    cave: ['#060a14', '#08101e', '#101f3d', '#1d3d72', '#2a5090', '#3a66aa'],
    night: ['#07050a', '#120c16', '#1c1030', '#281040', '#3b1c5c', '#4b2070'],
    camp: ['#1a0a14', '#3a1428', '#58203c', '#a03a68', '#e06a9b', '#ffb0cf'],
    gold: ['#3f0e18', '#7d3a10', '#c2701c', '#e0b93a', '#ffe08a', '#fffaea'],
  };
  const SKY_OF = { attack: 'dusk', skill: 'cave', power: 'night', rally: 'camp', special: 'gold' };

  // the backdrop, painted a pixel pair at a time (two screen pixels a dot)
  function backdrop(g, kind, seed) {
    const w = CW / 2, h = CH / 2, img = g.createImageData(w, h), px = new Uint32Array(img.data.buffer);
    const R = SKIES[kind].map(hex), put = (x, y, c) => { if (x >= 0 && y >= 0 && x < w && y < h) px[y * w + x] = ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0; };
    const sunX = 10 + hash(seed, 1) * 32, sunY = 16 + hash(seed, 2) * 12;
    const hill = (x, k, a, f) => k - Math.abs(Math.sin(x * f + seed)) * a - Math.sin(x * f * 2.3 + seed * 2) * a * 0.3;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const d = (BAY[((y & 3) << 2) | (x & 3)] + 0.5) / 16 - 0.5;
      let l;
      if (kind === 'cave') {
        // a rock wall with a torch somewhere off to one side
        const n = Math.sin(x * 0.7 + seed) * 0.3 + Math.sin(y * 0.9 - x * 0.3) * 0.25 + hash(x >> 1, y >> 1) * 0.3;
        const glow = Math.max(0, 1 - Math.hypot(x - sunX, y - sunY) / 30);
        l = 1.2 + n + glow * 3;
      } else if (kind === 'gold') {
        l = 5 - Math.hypot(x - w / 2, y - 28) / 7;
      } else {
        l = 5 - y / (h * 0.62) * 5;                                     // a sky that darkens upwards
        const sd = Math.hypot(x - sunX, (y - sunY) * 1.1);
        if (kind === 'dusk' && sd < 9) l = 5.6 - sd / 9;                // the sun going down
        if (kind === 'night' && sd < 6) l = 5.2;                        // the moon
        if (kind === 'night' && sd < 6 && Math.hypot(x - sunX - 2, y - sunY + 1) < 5) l = 2;
        if (kind === 'camp' && y > h * 0.55) l += 1.5;
      }
      let c = R[clamp(Math.floor(l + d * 1.1), 0, R.length - 1)];
      if (kind !== 'cave' && kind !== 'gold') {
        if (kind === 'night' && hash(x, y + seed) > 0.985) c = [255, 250, 234];     // stars
        if (y > hill(x, 34, 8, 0.12)) c = hex(kind === 'dusk' ? '#3a0e14' : kind === 'night' ? '#1a1024' : '#3a1428');
        if (y > hill(x + 30, 41, 5, 0.2)) c = hex(kind === 'dusk' ? '#241109' : kind === 'night' ? '#0e0814' : '#241018');
      }
      if (y >= GY / 2) c = hex(kind === 'cave' ? '#08101e' : '#1a0e0a');   // the floor
      put(x, y, c);
    }
    // cave paintings on the wall, in ochre
    if (kind === 'cave') for (let k = 0; k < 3; k++) {
      const hx = 6 + ((hash(seed, k + 5) * 40) | 0), hy = 6 + ((hash(seed, k + 9) * 22) | 0), O = hex('#7d3a10');
      for (let i = 0; i < 4; i++) put(hx + i, hy, O); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) put(hx + i, hy + 1 + j, O);
    }
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').putImageData(img, 0, 0);
    g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, CW, CH);
  }
  // draw into the card with the game's own calls
  function on(g, fn) { const old = Gfx.ctx; Gfx.ctx = g; try { fn(); } finally { Gfx.ctx = old; } }
  const note = (x, y, col = '#ffe98a') => { Gfx.rect(x, y, 5, 4, '#120c16'); Gfx.rect(x + 1, y + 1, 3, 2, col); Gfx.rect(x + 4, y - 8, 2, 9, '#120c16'); Gfx.rect(x + 4, y - 8, 5, 2, '#120c16'); };
  const drop = (x, y, s = 2) => Gfx.rect(x, y, s, s + 1, '#c2333c');
  const spark = (x, y, c = '#fffaea') => { Gfx.rect(x - 1, y - 4, 2, 8, c); Gfx.rect(x - 4, y - 1, 8, 2, c); };
  const heroBase = h => Heroes.get(h).base;
  const has = s => !!SPRITES[s];
  // a figure standing on the ground line, scaled down until its head clears
  // the name band at the top of the card
  const fig = (spr, x, y, o = {}) => { const S = Gfx.spr(spr), room = y - 30; Gfx.sprite(spr, x, y, Object.assign({}, o, { scale: Math.min(o.scale || 1, room / S.h) })); };
  // the scenes, by the old picture on the card
  const SCENES = {
    music(hero) { const b = heroBase(hero); fig(has(b + '_play') ? b + '_play' : b + '_idle', 50, GY + 6, { anchor: 'bc' }); note(14, 30); note(78, 20, '#86e8d2'); note(86, 48, '#ffb0cf'); note(20, 58, '#a8e878'); },
    club(hero) { fig('raptor_idle', 92, GY + 4, { anchor: 'bc', flip: true, rot: -0.18 }); fig(heroBase(hero) + '_idle', 22, GY + 10, { anchor: 'bc' }); for (let i = 0; i < 9; i++) drop(60 + hash(i, 3) * 30, 20 + hash(i, 4) * 40); spark(64, 34); },
    boulder() { fig('compy_idle', 52, GY + 2, { anchor: 'bc', flip: true }); Gfx.sprite('v_rock', 50, 30, { anchor: 'c', scale: 1.5, rot: 0.4 }); for (let i = 0; i < 5; i++) Gfx.rect(30 + i * 9, 4 + (i % 2) * 6, 3, 10, '#c4b89a'); },
    bolt() { let x = 40, y = 0; while (y < GY - 20) { const nx = x + (hash(y, 7) - 0.5) * 22, ny = y + 10; for (let k = 0; k < 5; k++) Gfx.rect(Math.round(x + (nx - x) * k / 5) - 2, y + k * 2, 5, 3, k % 2 ? '#ffffff' : '#a8d8ff'); x = nx; y = ny; } fig('raptor_idle', 60, GY + 4, { anchor: 'bc', flip: true, tint: '#ffffff', tintAmount: 0.5 }); },
    fire() { fig('lizard_idle', 52, GY + 2, { anchor: 'bc', flip: true }); for (let i = 0; i < 5; i++) World.flame(14 + i * 19, GY - 4, 28 + hash(i, 2) * 26, 8, 0, ['#9c3510', '#e06a1b', '#ffa832', '#ffe08a'], i); },
    crowd(hero) { const L = ['compy_idle', 'dodo_idle', 'raptor_idle', 'dodo_idle', 'compy_idle']; L.forEach((s, i) => fig(s, 8 + i * 22, GY + 8 - (i % 2) * 4, { anchor: 'bc', scale: 0.5 + (i % 2) * 0.1, tint: '#120c16', tintAmount: 0.75, flip: i % 2 === 0 })); fig(heroBase(hero) + '_idle', 52, GY + 8, { anchor: 'bc', scale: 0.5 }); for (let i = 0; i < 4; i++) note(12 + i * 26, 20 + (i % 2) * 10); },
    foot() { fig('stego_idle', 58, GY + 4, { anchor: 'bc', rot: -0.06 }); for (let i = 0; i < 4; i++) Pix.draw(ToonArt.puff(i % 3), 14 + i * 24, GY - 2, { scale: 0.9 }); },
    feast() { fig('v_meat', 52, GY - 2, { anchor: 'bc', scale: 1.2 }); for (let i = 0; i < 4; i++) fig('ti_berries', 16 + i * 24, GY + 2 - (i % 2) * 4, { anchor: 'bc' }); spark(20, 26); spark(84, 34, '#ffe98a'); },
    wall(hero) { fig(heroBase(hero) + '_idle', 52, GY - 4, { anchor: 'bc' }); PixUI.panel('stone', 4, GY - 34, CW - 8, 40, { seed: 4 }); },
    skull() { fig('v_bones', 30, GY + 2, { anchor: 'bc' }); fig('v_bones', 78, GY + 4, { anchor: 'bc', flip: true }); fig('v_skull', 52, GY - 4, { anchor: 'bc', scale: 1.3 }); for (let i = 0; i < 2; i++) Gfx.rect(44 + i * 12, GY - 30, 4, 4, '#ef6a5e'); },
    moon() { fig('v_cave', 52, GY + 6, { anchor: 'bc' }); Gfx.rect(46, GY - 22, 3, 3, '#ffe98a'); Gfx.rect(56, GY - 22, 3, 3, '#ffe98a'); },
    spiral() { Pix.draw(Ammonite.paint(30, 'ammonite30'), 52, 46, { scale: 1.1 }); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; Gfx.rect(Math.round(52 + Math.cos(a) * 40), Math.round(46 + Math.sin(a) * 34), 3, 3, '#ffb0cf'); } },
    star(hero) { for (let k = 0; k < 3; k++) for (let i = 0; i < 6; i++) Gfx.rect(20 + k * 30 + i * 5, 8 + k * 10 + i * 3, 4 - (i >> 1), 3, i ? '#ffe98a' : '#ffffff'); fig(heroBase(hero) + '_idle', 52, GY + 20, { anchor: 'bc', scale: 0.7 }); },
    wave() { for (let x = 0; x < CW; x += 4) { const hgt = 30 + Math.sin(x * 0.09) * 14; Gfx.rect(x, GY - hgt, 4, hgt, x % 8 ? '#1d3d72' : '#2a5090'); Gfx.rect(x, GY - hgt, 4, 3, '#a8d8ff'); } Gfx.sprite('dodo_idle', 54, GY - 30, { anchor: 'c', rot: 1.4 }); },
    heart(hero) { fig(heroBase(hero) + '_idle', 52, GY + 6, { anchor: 'bc' }); for (let i = 0; i < 4; i++) Gfx.sprite('icon_heart', 16 + i * 24, 20 + (i % 2) * 12, { anchor: 'c', scale: 1.2 }); },
  };
  const BY_ART = {
    art_strum: 'music', art_note: 'music', art_bass: 'music', art_drum: 'music', art_horn: 'music', art_flute: 'music',
    art_club: 'club', art_boulder: 'boulder', art_bolt: 'bolt', art_fire: 'fire', art_crowd: 'crowd', art_foot: 'foot',
    art_meat: 'feast', art_shield: 'wall', art_skull: 'skull', art_moon: 'moon', art_spiral: 'spiral', art_star: 'star',
    art_wave: 'wave', art_heart: 'heart',
  };
  function get(c) {
    const hero = c.def.hero || (typeof Game !== 'undefined' && Game.run && Game.run.hero) || 'bronk';
    const key = c.id + '|' + hero;
    let cv = cache.get(key); if (cv) return cv;
    cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    const seed = [...c.id].reduce((a, ch) => a + ch.charCodeAt(0), 0);
    backdrop(g, SKY_OF[c.def.type] || 'cave', seed);
    const scene = SCENES[BY_ART[c.def.art]];
    on(g, () => {
      if (scene) scene(hero);
      else Gfx.sprite(c.def.art || 'art_note', CW / 2, 44, { anchor: 'c', scale: 2 });
      // a little of the card's old cave painting, in the corner, like a signature
      Gfx.sprite(c.def.art || 'art_note', CW - 16, 28, { anchor: 'c', scale: 0.6, alpha: 0.75 });
    });
    if (cache.size > 400) { let n = 80; for (const k of cache.keys()) { cache.delete(k); if (--n <= 0) break; } }
    cache.set(key, cv);
    return cv;
  }
  // the frame, by type and rarity, painted once per size
  const RIM = { starter: ['#3a2415', '#5c3a20', '#85562f', '#b07a45'], common: ['#241c2e', '#3b3048', '#574a66', '#7a6d8a'], uncommon: ['#101f3d', '#1d3d72', '#6aa9ee', '#a8d8ff'], rare: ['#5c3a20', '#a3663a', '#e0b93a', '#ffe98a'], band: ['#58203c', '#a03a68', '#e06a9b', '#ffb0cf'], special: ['#3f0e18', '#9c3510', '#ffa832', '#ffe98a'] };
  function frame(rarity, w, h) {
    const R = RIM[rarity] || RIM.common;
    return Pix.make('cframe' + rarity + w + 'x' + h, w, h, P => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const e = Math.min(x, y, w - 1 - x, h - 1 - y);
        if (e > 2) continue;
        if ((x < 2 || x > w - 3) && (y < 2 || y > h - 3)) continue;          // cut corners
        P.put(x, y, e === 0 ? R[0] : e === 1 ? ((x + y) % 5 === 0 ? R[3] : R[2]) : R[1]);
      }
      for (const [cx, cy] of [[3, 3], [w - 4, 3], [3, h - 4], [w - 4, h - 4]]) P.ball(cx, cy, 2.2, [R[0], R[1], R[2], R[3], '#fffaea']);
    }, { ink: '#08060c' });
  }
  // the cost stone, coloured by type
  const GEM = { attack: '#c2333c', skill: '#2a5090', power: '#7c3eb2', rally: '#e06a9b', special: '#e0b93a', dead: '#3b3048' };
  const gem = t => Pix.make('cgem' + t, 14, 14, P => P.ball(7, 7, 6.2, Pix.ramp(GEM[t] || GEM.skill)), { ink: '#08060c' });
  const back = () => Pix.make('cardback', Math.round(CW / 2), Math.round(CH / 2), P => {
    const R = ['#241109', '#3a2415', '#5c3a20', '#75401f', '#85562f'];
    const w = P.w, h = P.h;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const l = 0.45 + (P.hash(x >> 1, y >> 1, 4) - 0.5) * 0.4 + Math.sin(x * 0.4 + y * 0.2) * 0.06;
      P.put(x, y, R[clamp(Math.floor(l * 5 + P.dith(x, y)), 0, 4)]);
    }
    // stitches round the edge and the mark in the middle
    for (let x = 5; x < w - 5; x += 2) { P.put(x, 5, '#e8dfc6'); P.put(x, h - 6, '#e8dfc6'); }
    for (let y = 5; y < h - 5; y += 2) { P.put(5, y, '#e8dfc6'); P.put(w - 6, y, '#e8dfc6'); }
    const cx = w / 2, cy = h / 2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy); if (r > 13) continue;
      const t = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2), f = (r / 3.2 - t) % 1;
      if ((f + 1) % 1 < 0.35) P.put(x, y, '#120c16'); else if (r > 12) P.put(x, y, '#241109');
    }
  }, { ink: false });
  return { get, frame, gem, back, clear: () => cache.clear() };
})();
