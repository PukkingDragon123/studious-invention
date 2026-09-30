// ---------------------------------------------------------------------------
// profile.js - what the game remembers about you between stories.
//
// Runs, wins, kills, fatalities, every beast you have met and how many of
// each you have put down, and a wall of trophies. The trophies pop up in the
// corner the moment you earn them. The Bestiary and the Trophy wall open from
// the title stone.
// ---------------------------------------------------------------------------
'use strict';

const TROPHIES = [
  { id: 'first_blood', name: 'FIRST BLOOD', desc: 'Win a fight.', icon: 'art_club' },
  { id: 'fatality', name: 'FATALITY', desc: 'Finish the last beast with a fatality.', icon: 'art_skull' },
  { id: 'butcher', name: 'BUTCHER', desc: 'Twenty-five fatalities.', icon: 'art_skull' },
  { id: 'headhunter', name: 'HEADHUNTER', desc: 'Take a head clean off.', icon: 'v_skull' },
  { id: 'ambusher', name: 'AMBUSHER', desc: 'Get the jump on a pack in the wild.', icon: 'art_foot' },
  { id: 'sniper', name: 'SNIPER', desc: 'A headshot with a thrown rock.', icon: 'v_rock' },
  { id: 'prop_comic', name: 'PROP COMIC', desc: 'Use the ground against them.', icon: 'art_boulder' },
  { id: 'virtuoso', name: 'VIRTUOSO', desc: 'Play a riff at S+.', icon: 'art_note' },
  { id: 'no_mistakes', name: 'NO MISTAKES', desc: 'A full combo on a riff.', icon: 'art_strum' },
  { id: 'over_hill', name: 'OVER THE HILL', desc: 'Reach the Bonebake Badlands.', icon: 'art_moon' },
  { id: 'sunday_dinner', name: 'SUNDAY DINNER', desc: 'Bring the whole family home.', icon: 'art_heart' },
  { id: 'full_band', name: 'THE FULL BAND', desc: 'Unlock all four of them.', icon: 'art_crowd' },
  { id: 'hoarder', name: 'SHELL HOARDER', desc: 'Hold thirty shells at once.', icon: 'ti_gem' },
  { id: 'beastmaster', name: 'BEASTMASTER', desc: 'Meet every beast in the lands.', icon: 'art_spiral' },
];

const Profile = (() => {
  const KEY = 'ongabonga.profile.v1';
  let P = null, toasts = [];
  const blank = () => ({ runs: 0, wins: 0, kills: 0, fatalities: 0, beheads: 0, fights: 0, beasts: {}, seen: {}, trophies: {} });
  function load() { if (P) return P; try { P = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { P = blank(); } return P; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { } }
  function add(k, n = 1) {
    load(); P[k] = (P[k] || 0) + n;
    if (k === 'fatalities') { unlock('fatality'); if (P.fatalities >= 25) unlock('butcher'); }
    if (k === 'beheads') unlock('headhunter');
    if (k === 'fights') unlock('first_blood');
    if (k === 'wins') unlock('sunday_dinner');
    save();
  }
  function seen(id) {
    load(); if (P.seen[id]) return; P.seen[id] = 1; save();
    if (Object.keys(ENEMIES).every(k => P.seen[k])) unlock('beastmaster');
  }
  function kill(id) { load(); P.beasts[id] = (P.beasts[id] || 0) + 1; P.kills++; save(); }
  function unlock(id) {
    load(); if (P.trophies[id]) return false;
    P.trophies[id] = Date.now(); save();
    const T = TROPHIES.find(t => t.id === id);
    if (T) { toasts.push({ T, t: 0 }); if (typeof AudioSys !== 'undefined') AudioSys.sfx('unlock'); }
    return true;
  }
  const has = id => !!load().trophies[id];
  // the toast in the corner: a plank with the trophy on it, sliding in
  function drawToast() {
    if (!toasts.length) return;
    const q = toasts[0]; q.t += Time.dt;
    const k = q.t < 0.35 ? Ease.outBack(q.t / 0.35) : q.t > 3 ? 1 - (q.t - 3) / 0.35 : 1;
    if (q.t > 3.35) { toasts.shift(); return; }
    const w = 270, x = W - (w + 14) * clamp(k, 0, 1.05), y = 60;
    PixUI.panel('woodhot', x, y, w, 58, { seed: 5, hot: true });
    PixUI.panel('stone', x + 8, y + 8, 42, 42, { seed: 2, moss: false });
    Gfx.sprite(q.T.icon, x + 29, y + 29, { anchor: 'c', scale: q.T.icon.startsWith('art_') ? 1 : 0.7 });
    Gfx.text('TROPHY!', x + 60, y + 10, { color: '#ffe98a', font: 'rock' });
    Gfx.text(q.T.name, x + 60, y + 28, { color: '#fffaea', scale: 1.2 });
  }
  return { load, save, add, seen, kill, unlock, has, drawToast, get data() { return load(); } };
})();

// ---------------------------------------------------------------- bestiary
class BestiaryOverlay {
  constructor(onClose) { this.onClose = onClose; this.t = 0; this.sel = null; }
  update(dt) { this.t += dt; if (Input.pressed('Escape')) this.close(); }
  close() { Game.overlay = null; if (this.onClose) this.onClose(); }
  draw() {
    const P = Profile.data;
    Gfx.rectA(0, 0, W, H, '#120c16', 0.82);
    PixUI.panel('stone', 40, 20, W - 80, H - 40, { seed: 8 });
    Gfx.text('BESTIARY', W / 2, 36, { color: '#9c3510', align: 'center', scale: 3, font: 'rock' });
    const ids = Object.keys(ENEMIES), cols = 6, cw = 136, ch = 104, x0 = W / 2 - cols * cw / 2;
    const met = ids.filter(id => P.seen[id]).length;
    Gfx.text(`${met} / ${ids.length} MET`, W / 2, 80, { color: '#3a2415', align: 'center', font: 'rock' });
    let hover = null;
    ids.forEach((id, i) => {
      const E = ENEMIES[id], x = x0 + (i % cols) * cw + 4, y = 100 + Math.floor(i / cols) * ch, seenIt = !!P.seen[id];
      const hov = UI.hovered(x, y, cw - 8, ch - 8); if (hov) hover = id;
      PixUI.panel(E.boss ? 'red' : hov ? 'woodhot' : 'obsidian', x, y, cw - 8, ch - 8, { seed: i, hot: hov });
      const spr = SPRITES[E.base + '_idle'] ? E.base + '_idle' : E.base + '_fly', S = SPRITES[spr] ? Gfx.spr(spr) : null;
      if (S) {
        const sc = Math.min(1, 60 / S.h, 110 / S.w) < 0.75 ? 0.5 : 1;
        Gfx.sprite(spr, x + (cw - 8) / 2, y + 70, { anchor: 'bc', scale: sc, flip: true, frame: Math.floor(this.t * 4 + i), tint: seenIt ? null : '#08060c', tintAmount: seenIt ? 0 : 1 });
      }
      Gfx.text(seenIt ? E.name : '???', x + (cw - 8) / 2, y + 74, { color: seenIt ? '#ffe98a' : '#7a6d8a', align: 'center', font: Gfx.measure(E.name, 1) > cw - 16 ? 'classic' : 'main' });
      if (seenIt && P.beasts[id]) Gfx.text(`x${P.beasts[id]}`, x + cw - 16, y + 6, { color: '#ef6a5e', align: 'right', font: 'rock' });
      UI.hit(x, y, cw - 8, ch - 8, () => { });
    });
    if (hover && P.seen[hover]) {
      const E = ENEMIES[hover], moves = Object.values(E.moves || {}).map(m => m.name).join(', ');
      UI.tooltip(Input.mx + 16, Input.my - 10, [`{y}${E.name}{/}${E.title ? ' - ' + E.title.toLowerCase() : ''}`, `HP ${E.hp[0]}${E.hp[1] !== E.hp[0] ? '-' + E.hp[1] : ''}`, moves, `{r}killed: ${P.beasts[hover] || 0}{/}`], { width: 240 });
    }
    HUD.button(W / 2 - 60, H - 64, 120, 34, 'BACK', () => this.close());
  }
}

// ---------------------------------------------------------------- trophies
class TrophiesOverlay {
  constructor(onClose) { this.onClose = onClose; this.t = 0; }
  update(dt) { this.t += dt; if (Input.pressed('Escape')) this.close(); }
  close() { Game.overlay = null; if (this.onClose) this.onClose(); }
  draw() {
    const P = Profile.data;
    Gfx.rectA(0, 0, W, H, '#120c16', 0.82);
    PixUI.panel('stone', 40, 20, W - 80, H - 40, { seed: 9 });
    Gfx.text('TROPHIES', W / 2, 36, { color: '#9c3510', align: 'center', scale: 3, font: 'rock' });
    // the tally, cut into the top of the wall
    const stats = [['RUNS', P.runs], ['HOMECOMINGS', P.wins], ['FIGHTS WON', P.fights], ['KILLS', P.kills], ['FATALITIES', P.fatalities]];
    stats.forEach(([k, v], i) => {
      const x = 90 + i * 160;
      PixUI.panel('obsidian', x, 80, 146, 40, { seed: i });
      Gfx.text(String(v || 0), x + 73, 84, { color: '#ffe98a', align: 'center', scale: 1.6, font: 'rock' });
      Gfx.text(k, x + 73, 106, { color: '#a79bb4', align: 'center', font: 'classic' });
    });
    const cols = 7, cw = 118, ch = 150, x0 = W / 2 - cols * cw / 2;
    let hover = null;
    TROPHIES.forEach((T, i) => {
      const x = x0 + (i % cols) * cw + 4, y = 134 + Math.floor(i / cols) * ch, got = !!P.trophies[T.id];
      const hov = UI.hovered(x, y, cw - 8, ch - 10); if (hov) hover = T;
      PixUI.panel(got ? (hov ? 'woodhot' : 'wood') : 'obsidian', x, y, cw - 8, ch - 10, { seed: i + 3, hot: got && hov });
      PixUI.panel(got ? 'stone' : 'obsidian', x + (cw - 8) / 2 - 30, y + 10, 60, 60, { seed: i, moss: false });
      Gfx.sprite(T.icon, x + (cw - 8) / 2, y + 40, { anchor: 'c', scale: T.icon.startsWith('art_') ? 1.4 : 0.9, tint: got ? null : '#08060c', tintAmount: got ? 0 : 0.85 });
      if (got && Math.sin(this.t * 3 + i) > 0.9) Particles.sparkle(x + rnd(10, cw - 18), y + rnd(10, 70), 1, ['#ffe98a', '#ffffff']);
      Gfx.wrap(T.name, cw - 20, 1, 'classic').forEach((L, j) => Gfx.text(L, x + (cw - 8) / 2, y + 80 + j * 11, { color: got ? '#ffe98a' : '#7a6d8a', align: 'center', font: 'classic' }));
      Gfx.wrap(T.desc, cw - 20, 1, 'small').forEach((L, j) => Gfx.text(L, x + (cw - 8) / 2, y + 104 + j * 9, { color: got ? '#e8dfc6' : '#574a66', align: 'center', font: 'small' }));
      UI.hit(x, y, cw - 8, ch - 10, () => { });
    });
    Particles.draw(Gfx.ctx, false);
    const n = TROPHIES.filter(T => P.trophies[T.id]).length;
    Gfx.text(`${n} / ${TROPHIES.length}`, W - 70, 36, { color: '#3a2415', align: 'right', font: 'rock', scale: 1.4 });
    void hover;
    HUD.button(W / 2 - 60, H - 64, 120, 34, 'BACK', () => this.close());
  }
}
