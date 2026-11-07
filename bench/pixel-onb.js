/* Пиксель онбординга: донор рядом с next, свежая база (onboarded: 0).
   Виды: главный экран, диалог веса, диалог начала суток.
   Объявленное исключение: в шапке донора кот, у next круг с жидкостью
   (слово владельца 06.11). Картинки: bench/shots/pixel-onb/. */
const { chromium } = require('/home/user/pw/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const { PNG } = require('/home/user/pw/node_modules/pngjs');
const pixelmatch = require('/home/user/pw/node_modules/pixelmatch').default;

const OUT = path.join(__dirname, 'shots', 'pixel-onb');

function seedFresh() {
  return {
    goalMl: 1900, gender: 'male', weightKg: 59.1, units: 'metric', dayStart: '02:00', onboarded: 0,
    theme: 'dark', animation: false,
    drinks: [], entries: [], weights: [], dayGoals: {}, tombstones: { e: {}, w: {} },
    notifications: { enabled: false, everyMin: 120, days: [] }
  };
}

const VIEWS = [
  { id: 'onb-main', open: null },
  { id: 'onb-weight', open: '[data-act="onb-weight"]' },
  { id: 'onb-day', open: '[data-act="onb-time"]' }
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const report = [];
  for (const v of VIEWS) {
    const ctx = await b.newContext({ viewport: { width: 412, height: 892 } });
    await ctx.addInitScript(`window.__singleFile = true; localStorage.setItem('cup-tracker-v1', ${JSON.stringify(JSON.stringify(seedFresh()))});`);
    const donor = await ctx.newPage();
    const next = await ctx.newPage();
    await donor.goto('http://127.0.0.1:8085/water-tracker/index.html');
    await next.goto('http://127.0.0.1:8085/wt2/index.html');
    await donor.waitForSelector('.onb');
    await next.waitForSelector('.onb');
    if (v.open) {
      await donor.click(v.open);
      await next.click(v.open);
      await donor.waitForSelector('.kg-pick');
      await next.waitForSelector('.kg-pick');
    }
    await donor.waitForTimeout(500);
    await next.waitForTimeout(500);
    const freeze = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
    await donor.addStyleTag({ content: freeze });
    await next.addStyleTag({ content: freeze });
    await donor.waitForTimeout(250);
    await next.waitForTimeout(250);
    const dShot = await donor.screenshot();
    const nShot = await next.screenshot();
    fs.writeFileSync(path.join(OUT, v.id + '-donor.png'), dShot);
    fs.writeFileSync(path.join(OUT, v.id + '-next.png'), nShot);
    const dPng = PNG.sync.read(dShot), nPng = PNG.sync.read(nShot);
    const W = Math.min(dPng.width, nPng.width), H = Math.min(dPng.height, nPng.height);
    const diff = new PNG({ width: W, height: H });
    const px = pixelmatch(dPng.data, nPng.data, diff.data, W, H, { threshold: 0.1 });
    fs.writeFileSync(path.join(OUT, v.id + '-diff.png'), PNG.sync.write(diff));
    const panel = new PNG({ width: W * 3, height: H });
    const compose = (src, ox) => {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const si = (y * src.width + x) << 2, di = (y * panel.width + x + ox) << 2;
        panel.data[di] = src.data[si]; panel.data[di + 1] = src.data[si + 1];
        panel.data[di + 2] = src.data[si + 2]; panel.data[di + 3] = 255;
      }
    };
    compose(dPng, 0); compose(nPng, W); compose(diff, W * 2);
    fs.writeFileSync(path.join(OUT, v.id + '-panel.png'), PNG.sync.write(panel));
    const pct = (100 * px / (W * H)).toFixed(2);
    report.push(v.id + '  ' + px + ' px  ' + pct + '%');
    await ctx.close();
  }
  console.log(report.join('\n'));
  await b.close();
})();
