/* Страница «Выбор цвета»: сетка палитры, цветовой круг (мышь и палец),
   свайп между панелями. Регрессия 07.11: colorGesture не доехал при
   переносе — круг умирал с ReferenceError на первом касании.
   node bench/smoke-colors.js */
const { chromium } = require('/home/user/pw/node_modules/playwright');
const fs = require('fs');
const OWNER = JSON.parse(fs.readFileSync('/home/user/uploads/vodomer-baza-owner.json', 'utf8'));
function seedState() {
  const s = OWNER.settings || {}, pr = OWNER.profile || {};
  return { goalMl: 1900, useRecommended: !!pr.useRecommended, gender: 'male', weightKg: 59,
    units: 'metric', dayStart: '02:00', theme: 'dark', animation: false,
    onboarded: 1, historyDismissed: 1, alertPermAsked: 1,
    profile: { drinkId: 'water', volume: 250 }, drinks: OWNER.drinks || [],
    entries: (OWNER.entries || []).slice(0, 100), weights: [], dayGoals: {},
    tombstones: { e: {}, w: {} }, notifications: { enabled: false, everyMin: 120, days: [] } };
}
let pass = 0, fail = 0;
const ok = (n, c, x) => { console.log((c ? '  PASS  ' : '  FAIL  ') + n + (x ? '  ' + x : '')); c ? pass++ : fail++; };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 }, hasTouch: true });
  await ctx.addInitScript(v => { try { localStorage.setItem('cup-tracker-v1', JSON.stringify(v)); } catch (e) {} }, seedState());
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await p.goto('http://127.0.0.1:8085/wt2/index.html');
  await p.waitForFunction(() => window.__waterApp && window.__waterApp.state, null, { timeout: 20000 });
  const pick = () => p.evaluate(() => window.__waterApp.ui.colorPick);
  const page = () => p.evaluate(() => window.__waterApp.ui.colorPage);

  await p.evaluate(() => { const A = window.__waterApp; A.ui.page = 'colors'; A.ui.colorPage = 0; A.ui.colorPick = '#61c2f9'; A.render(); });
  await p.waitForTimeout(600);
  ok('C1 сетка палитры на месте (40 ячеек)', (await p.locator('.palette button').count()) === 40);
  await p.click('.palette button:nth-child(5)');
  await p.waitForTimeout(400);
  ok('C2 клик по сетке выбирает цвет', (await pick()) === '#018ad8', await pick());

  /* свайп влево -> круг */
  await p.mouse.move(330, 420); await p.mouse.down();
  await p.mouse.move(120, 420, { steps: 8 }); await p.mouse.up();
  await p.waitForTimeout(600);
  ok('C3 свайп влево открывает круг', (await page()) === 1, 'страница: ' + (await page()));

  const box = await (await p.$('.hue-wheel')).boundingBox();
  await p.evaluate(() => { window.__waterApp.ui.colorPick = '#61c2f9'; });
  await p.mouse.click(box.x + box.width * 0.78, box.y + box.height * 0.5);
  await p.waitForTimeout(400);
  ok('C4 круг: клик мышью выбирает цвет', (await pick()) !== '#61c2f9', await pick());

  await p.evaluate(() => { window.__waterApp.ui.colorPick = '#61c2f9'; });
  await p.touchscreen.tap(box.x + box.width * 0.5, box.y + box.height * 0.24);
  await p.waitForTimeout(400);
  ok('C5 круг: тап пальцем выбирает цвет', (await pick()) !== '#61c2f9', await pick());

  /* тащим по кругу: цвет едет за пальцем */
  await p.evaluate(() => { window.__waterApp.ui.colorPick = '#000000'; });
  await p.touchscreen.tap(box.x + box.width * 0.24, box.y + box.height * 0.5);
  await p.waitForTimeout(300);
  const dragged = await pick();
  ok('C6 круг: другая точка — другой цвет', dragged !== '#000000' && dragged !== '#61c2f9', dragged);

  /* свайп вправо -> обратно на сетку */
  await p.mouse.move(120, 420); await p.mouse.down();
  await p.mouse.move(330, 420, { steps: 8 }); await p.mouse.up();
  await p.waitForTimeout(600);
  ok('C7 свайп вправо возвращает сетку', (await page()) === 0, 'страница: ' + (await page()));

  ok('C8 ни одной ошибки страницы', errs.length === 0, errs[0] || '');
  await b.close();
  console.log('\nИТОГ: ' + pass + ' PASS / ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('СБОЙ БЕНЧА:', e); process.exit(2); });
