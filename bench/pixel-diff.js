/* Пиксельный харнесс шага 1 (слово владельца 04.11 «будь внимательнее»,
   05.11 «сначала показывай картину результата»): каждый экран next рядом с
   донором на ОДИНАКОВОМ сиде — живая база владельца
   (uploads/vodomer-baza-owner.json, watercat-24) превращается в состояние
   приложения и кладётся в localStorage обеих сторон одним и тем же.

   На каждый вид четыре файла в bench/shots/pixel/ (вне коммитов):
     <вид>-donor.png   донор как есть
     <вид>-next.png    следующая версия
     <вид>-diff.png    расхождения (pixelmatch, розовое)
     <вид>-panel.png   склейка «донор | next | diff» — картина для глаза
   Отчёт: bench/reports/pixel.json + таблица в консоли.

   Объявленные исключения кожи (финальное слово 06.11) — diff по ним
   ожидаем и читается глазами, а не чинится:
     - в слоте cat-stage круг с жидкостью (M06) вместо кота;
     - капля вместо мини-кота в пилюле (класс .mini-cat сохранён, C-007);
     - чашка/погода/активность/избранный ряд дока — пустые невидимые места;
     - честная версия из моста (в браузере фолбэк «2.0-next (200)»);
     - строки настроек неприехавших модулей — пустые невидимые места.
   Анимации на снимках заморожены (animation/transition none) — детерминизм. */
const { chromium } = require('/home/user/pw/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const { PNG } = require('/home/user/pw/node_modules/pngjs');
const pixelmatch = require('/home/user/pw/node_modules/pixelmatch').default;

const OWNER = JSON.parse(fs.readFileSync('/home/user/uploads/vodomer-baza-owner.json', 'utf8'));
const OUT = path.join(__dirname, 'shots', 'pixel');
const REP = path.join(__dirname, 'reports');
const LAST_DAY = '2026-11-05'; /* последний день базы владельца (exportedAt) */

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

const VIEWS = [
  { id: 'home',           theme: 'dark',  nav: [['tab', 'home']] },
  { id: 'history',        theme: 'dark',  nav: [['tab', 'history'], ['wait', '.chart-row .col']] },
  { id: 'history-day',    theme: 'dark',  nav: [['tab', 'history'], ['wait', '.chart-row .col'], ['click', '.date-btn[data-date="' + LAST_DAY + '"]'], ['ms', 500]] },
  { id: 'volumes',        theme: 'dark',  nav: [['tab', 'history'], ['wait', '.chart-row .col'], ['click', '.hist-screen > header.top .icon-btn.right'], ['waitf', "() => { const h = document.querySelector('.screen h1'); return h && h.textContent === 'Объёмы'; }"]] },
  { id: 'weight-year',    theme: 'dark',  nav: [['tab', 'weight'], ['wait', '.w-panel'], ['ms', 300]] },
  { id: 'weight-month',   theme: 'dark',  nav: [['tab', 'weight'], ['wait', '.w-panel'], ['click', '.wrange button[data-range="month"]'], ['ms', 300]] },
  { id: 'weight-week',    theme: 'dark',  nav: [['tab', 'weight'], ['wait', '.w-panel'], ['click', '.wrange button[data-range="week"]'], ['ms', 300]] },
  { id: 'drinks',         theme: 'dark',  nav: [['tab', 'home'], ['click', '.drink-now'], ['waitf', "() => { const h = document.querySelector('.screen h1'); return h && h.textContent === 'Выбор напитка'; }"]] },
  { id: 'alerts',         theme: 'dark',  nav: [['tab', 'alerts']], waitExtra: '.n-section' },
  { id: 'settings',       theme: 'dark',  nav: [['tab', 'settings']], waitExtra: '.set-ver' },
  { id: 'home-light',     theme: 'light', nav: [['tab', 'home']] },
  { id: 'history-light',  theme: 'light', nav: [['tab', 'history'], ['wait', '.chart-row .col']] },
  { id: 'settings-light', theme: 'light', nav: [['tab', 'settings']], waitExtra: '.set-ver' }
];

async function runNav(page, view) {
  for (const step of view.nav) {
    if (step[0] === 'tab') await page.click('[data-tab="' + step[1] + '"]');
    else if (step[0] === 'click') await page.click(step[1]);
    else if (step[0] === 'wait') await page.waitForSelector(step[1]);
    else if (step[0] === 'waitf') await page.waitForFunction(step[1]);
    else if (step[0] === 'ms') await page.waitForTimeout(step[1]);
  }
  if (view.waitExtra) await page.waitForSelector(view.waitExtra);
  await page.waitForTimeout(700); /* донорское восстановление прокрутки — два кадра */
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(REP, { recursive: true });
  const b = await chromium.launch();
  const report = [];
  const W = 412, H = 892;

  for (const theme of ['dark', 'light']) {
    const seed = JSON.stringify(seedState(theme));
    const ctx = await b.newContext({ viewport: { width: W, height: H } });
    await ctx.addInitScript(`localStorage.setItem('cup-tracker-v1', ${JSON.stringify(seed)});`);
    const donor = await ctx.newPage();
    const next = await ctx.newPage();
    const errs = [];
    donor.on('pageerror', e => errs.push('donor: ' + e.message));
    next.on('pageerror', e => errs.push('next: ' + e.message));
    await donor.goto('http://127.0.0.1:8085/water-tracker/index.html');
    await next.goto('http://127.0.0.1:8085/wt2/index.html');
    await donor.waitForFunction(() => document.querySelector('.progress .label'));
    await next.waitForFunction(() => window.__waterApp && document.querySelector('.progress .label'));
    const freeze = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
    await donor.addStyleTag({ content: freeze });
    await next.addStyleTag({ content: freeze });

    for (const view of VIEWS.filter(v => v.theme === theme)) {
      await runNav(donor, view);
      await runNav(next, view);
      const dBuf = await donor.screenshot();
      const nBuf = await next.screenshot();
      const dPng = PNG.sync.read(dBuf), nPng = PNG.sync.read(nBuf);
      const diff = new PNG({ width: W, height: H });
      const diffPx = pixelmatch(dPng.data, nPng.data, diff.data, W, H,
        { threshold: 0.15, includeAA: false, alpha: 0.25, diffColor: [255, 32, 96] });

      /* панель «донор | next | diff» */
      const sep = 6, PW = W * 3 + sep * 2;
      const panel = new PNG({ width: PW, height: H });
      panel.data.fill(255);
      const blit = (png, x0) => {
        for (let y = 0; y < H; y++) {
          const src = y * png.width * 4, dst = (y * PW + x0) * 4;
          png.data.copy(panel.data, dst, src, src + W * 4);
        }
      };
      blit(dPng, 0); blit(nPng, W + sep); blit(diff, (W + sep) * 2);

      fs.writeFileSync(path.join(OUT, view.id + '-donor.png'), dBuf);
      fs.writeFileSync(path.join(OUT, view.id + '-next.png'), nBuf);
      fs.writeFileSync(path.join(OUT, view.id + '-diff.png'), PNG.sync.write(diff));
      fs.writeFileSync(path.join(OUT, view.id + '-panel.png'), PNG.sync.write(panel));

      const pct = (diffPx / (W * H)) * 100;
      const verdict = pct < 0.5 ? '≈байт-в-байт' : pct < 3 ? 'мелкие отличия' : 'крупные (исключения/глаз)';
      report.push({ id: view.id, theme: theme, diffPx: diffPx, diffPct: +pct.toFixed(2), verdict: verdict });
      console.log(view.id.padEnd(16) + String(diffPx).padStart(7) + ' px  ' + pct.toFixed(2).padStart(6) + '%  ' + verdict);
    }
    if (errs.length) console.log('ОШИБКИ СТРАНИЦ (' + theme + '):', errs.slice(0, 4));
    await ctx.close();
  }

  fs.writeFileSync(path.join(REP, 'pixel.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    seed: 'uploads/vodomer-baza-owner.json (живая база владельца, watercat-24, 8870 записей)',
    viewport: W + 'x' + H, views: report
  }, null, 2));
  await b.close();
  console.log('\nОтчёт: bench/reports/pixel.json');
  console.log('Картинки: bench/shots/pixel/<вид>-panel.png — склейка «донор | next | diff»');
})();
