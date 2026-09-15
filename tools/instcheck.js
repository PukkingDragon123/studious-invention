// Measures peak/RMS for one note of each instrument so the mix can be balanced.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto('http://127.0.0.1:8765/index.html'); await page.waitForTimeout(300);
  await page.mouse.click(640, 360); await page.waitForTimeout(300);
  await page.evaluate(() => { AudioSys.stop(0.01); const c = AudioSys.ctx; const an = c.createAnalyser(); an.fftSize = 2048; AudioSys.musicBus.connect(an); window.__an = an; window.__meter = () => { const buf = new Float32Array(an.fftSize); an.getFloatTimeDomainData(buf); let sum = 0, peak = 0; for (const v of buf) { sum += v * v; peak = Math.max(peak, Math.abs(v)); } return { rms: Math.sqrt(sum / buf.length), peak }; }; });
  await page.waitForTimeout(600);
  const tests = { kick: 'kick(t,1,d)', snare: 'snare(t,1,d)', hat: 'hat(t,1,false,d)', tom: 'tom(t,120,1,d)', shaker: 'shaker(t,1,d)', clap: 'clap(t,1,d)', stomp: 'stomp(t,1,d)', bass: 'bass(t,40,0.5,1,d)', lead: 'lead(t,64,0.5,1,d)', chord: 'chord(t,[52,59,64],0.5,1,d)', flute: 'flute(t,77,0.6,1,d)', marimba: 'marimba(t,74,0.3,1,d)', pad: 'pad(t,[50],0.8,1,d)', chant: 'chant(t,52,0.8,1,d,"ah")', bell: 'bell(t,81,0.5,1,d)', horn: 'horn(t,50,0.8,1,d)' };
  for (const [name, call] of Object.entries(tests)) {
    await page.evaluate(call => { const t = AudioSys.now() + 0.05, d = AudioSys.musicBus; new Function('t', 'd', 'AudioSys.' + call)(t, d); }, call);
    let peak = 0, rmsMax = 0; for (let i = 0; i < 25; i++) { await page.waitForTimeout(30); const m = await page.evaluate(() => window.__meter()); peak = Math.max(peak, m.peak); rmsMax = Math.max(rmsMax, m.rms); }
    console.log(name.padEnd(8), 'peak', peak.toFixed(3), 'rmsMax', rmsMax.toFixed(3));
    await page.waitForTimeout(700);
  }
  await browser.close();
})();
