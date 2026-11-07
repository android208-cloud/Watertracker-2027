/* Пиксель M09: диалог «Применить настройки из копии?» — донор рядом с next.
   Пак берём у донора (его exportPack на сиде владельца),_next получает тот
   же пак текстом через файловый хук. Цель: 0 px. */
const { chromium } = require('/home/user/pw/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const { PNG } = require('/home/user/pw/node_modules/pngjs');
const pixelmatch = require('/home/user/pw/node_modules/pixelmatch').default;

const OWNER = JSON.parse(fs.readFileSync('/home/user/uploads/vodomer-baza-owner.json', 'utf8'));
const OUT = path.join(__dirname, 'shots', 'pixel-m09');

function seedState(theme) {
  const s = OWNER.settings || {};
  const pr = OWNER.profile || {};
  return {
    goalMl: pr.consumptionRate || 1900, useRecommended: !!pr.useRecommended,
    gender: pr.gender || 'male', weightKg: pr.weightKg || 59,
    units: pr.units || 'metric', dayStart: pr.dayStart || '02:00',
    theme: theme, animation: false,
    onboarded: 1, historyDismissed: 1, alertPermAsked: 1,
    profile: { drinkId: pr.drinkId || 'water', volume: pr.volume || 250 },
    drinks: OWNER.drinks || [], entries: OWNER.entries || [],
    weights: OWNER.weights || [], dayGoals: OWNER.dayGoals || {},
    tombstones: OWNER.tombstones || { e: {}, w: {} },
    notifications: s.notifications || { enabled: false, everyMin: 120, days: [] },
    cupLabel: s.cupLabel, rowCustom: s.rowCustom, habitAuto: s.habitAuto,
    paceGoals: s.paceGoals, lc: s.lc
  };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 } });
  const seed = JSON.stringify(JSON.stringify(seedState('dark')));
  await ctx.addInitScript(`localStorage.setItem('cup-tracker-v1', ${seed});`);
  const donor = await ctx.newPage();
  const next = await ctx.newPage();
  await donor.goto('http://127.0.0.1:8085/water-tracker/index.html');
  await next.goto('http://127.0.0.1:8085/wt2/index.html');
  await donor.waitForFunction(() => window.__syncDebug && window.__syncDebug.exportPack);
  await next.waitForFunction(() => window.__waterApp && window.__waterApp.state);
  const pack = await donor.evaluate(() => window.__syncDebug.exportPack());
  const packText = JSON.stringify(pack);
  await donor.evaluate(p => window.__syncDebug.offerChoice(p), pack);
  await next.evaluate(t => window.__wtFileHook(t, null), packText);
  await donor.waitForTimeout(500);
  await next.waitForTimeout(500);
  const freeze = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
  await donor.addStyleTag({ content: freeze });
  await next.addStyleTag({ content: freeze });
  await donor.waitForTimeout(200);
  await next.waitForTimeout(200);
  const dShot = await donor.screenshot();
  const nShot = await next.screenshot();
  fs.writeFileSync(path.join(OUT, 'settings-choice-donor.png'), dShot);
  fs.writeFileSync(path.join(OUT, 'settings-choice-next.png'), nShot);
  const dPng = PNG.sync.read(dShot), nPng = PNG.sync.read(nShot);
  const W = Math.min(dPng.width, nPng.width), H = Math.min(dPng.height, nPng.height);
  const diff = new PNG({ width: W, height: H });
  const px = pixelmatch(dPng.data, nPng.data, diff.data, W, H, { threshold: 0.1 });
  fs.writeFileSync(path.join(OUT, 'settings-choice-diff.png'), PNG.sync.write(diff));
  /* панель: донор | next | diff */
  const panel = new PNG({ width: W * 3, height: H });
  PNG.sync.write(panel);
  const compose = (src, ox) => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const si = (y * src.width + x) << 2, di = (y * panel.width + x + ox) << 2;
      panel.data[di] = src.data[si]; panel.data[di + 1] = src.data[si + 1];
      panel.data[di + 2] = src.data[si + 2]; panel.data[di + 3] = 255;
    }
  };
  compose(dPng, 0); compose(nPng, W); compose(diff, W * 2);
  fs.writeFileSync(path.join(OUT, 'settings-choice-panel.png'), PNG.sync.write(panel));
  const total = W * H;
  console.log('settings-choice: ' + px + ' px (' + (100 * px / total).toFixed(2) + '%)');
  await b.close();
})();
