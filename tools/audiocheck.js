// Plays every song for a few seconds and reports RMS/peak of the master bus, plus per-instrument sanity.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto('http://127.0.0.1:8765/index.html'); await page.waitForTimeout(300);
  await page.mouse.click(640, 360); await page.waitForTimeout(300);
  await page.evaluate(() => {
    const c = AudioSys.ctx; const an = c.createAnalyser(); an.fftSize = 2048; AudioSys.limiter.connect(an); window.__an = an;
    window.__meter = () => { const buf = new Float32Array(an.fftSize); an.getFloatTimeDomainData(buf); let sum = 0, peak = 0; for (const v of buf) { sum += v * v; peak = Math.max(peak, Math.abs(v)); } return { rms: Math.sqrt(sum / buf.length), peak }; };
  });
  const songs = await page.evaluate(() => Object.keys(SONGS));
  for (const id of songs) {
    await page.evaluate(id => AudioSys.play(id, { restart: true, fade: 0.05, intensity: 2 }), id);
    await page.waitForTimeout(700);
    const samples = [];
    for (let i = 0; i < 40; i++) { samples.push(await page.evaluate(() => window.__meter())); await page.waitForTimeout(100); }
    const rms = samples.map(s => s.rms), peak = Math.max(...samples.map(s => s.peak));
    const avg = rms.reduce((a, b) => a + b, 0) / rms.length, mn = Math.min(...rms), mx = Math.max(...rms);
    const bpm = await page.evaluate(id => SONGS[id].bpm, id);
    console.log(`${id.padEnd(9)} bpm ${String(bpm).padEnd(4)} rms avg ${avg.toFixed(3)} min ${mn.toFixed(3)} max ${mx.toFixed(3)} peak ${peak.toFixed(2)} ${peak > 0.99 ? 'CLIP?' : ''} ${avg < 0.01 ? 'QUIET!' : ''}`);
  }
  // sfx sanity: each sfx should produce sound
  const names = ['perfect', 'good', 'miss', 'card', 'block', 'hurt', 'hit', 'bighit', 'die', 'click', 'gold', 'heal', 'relic', 'buff', 'debuff', 'roar', 'cheer', 'encore', 'unlock', 'whoosh', 'combo', 'select', 'stun', 'fire', 'summon', 'thunder', 'victory', 'defeat', 'chomp', 'cage'];
  await page.evaluate(() => AudioSys.stop(0.05)); await page.waitForTimeout(400);
  const quiet = [];
  for (const n of names) {
    await page.evaluate(n => AudioSys.sfx(n), n);
    let peak = 0; for (let i = 0; i < 6; i++) { await page.waitForTimeout(40); const m = await page.evaluate(() => window.__meter()); peak = Math.max(peak, m.peak); }
    if (peak < 0.02) quiet.push(n);
    await page.waitForTimeout(500);
  }
  console.log('quiet sfx:', quiet.length ? quiet.join(',') : 'none');
  await browser.close();
})();
