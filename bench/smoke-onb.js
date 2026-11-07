/* Смоук онбординга по донору: шапка с заголовком и кругом, подсказки,
   барабаны веса и времени диалогами, системные часы скрытым пикером,
   пересчёт нормы, «Начать» доводит до главного экрана. */
const { chromium } = require('/home/user/pw/node_modules/playwright');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name); }
}

function seedFresh() {
  return {
    goalMl: 1900, gender: 'male', weightKg: 59.1, units: 'metric', dayStart: '02:00', onboarded: 0,
    theme: 'dark', animation: false,
    drinks: [], entries: [], weights: [], dayGoals: {}, tombstones: { e: {}, w: {} },
    notifications: { enabled: false, everyMin: 120, days: [] }
  };
}

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 } });
  await ctx.addInitScript(`localStorage.setItem('cup-tracker-v1', ${JSON.stringify(JSON.stringify(seedFresh()))});`);
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && String((m.location() || {}).url || '').indexOf('ui-skin.json') < 0) errs.push('console: ' + m.text()); });
  await p.goto('http://127.0.0.1:8085/wt2/index.html');
  await p.waitForFunction(() => window.__waterApp && window.__waterApp.state, null, { timeout: 15000 });
  const act = a => p.evaluate(x => window.__waterApp.performAction({ dataset: { act: x } }, x), a);
  const txt = () => p.evaluate(() => document.body.textContent);

  /* O1: шапка донора: заголовок, подзаголовок, круг с жидкостью вместо кота */
  const t0 = await txt();
  ok(t0.indexOf('Привет! Я Водомер') >= 0, 'O1 шапка: «Привет! Я Водомер»');
  ok(t0.indexOf('Три вопроса') >= 0, 'O1 шапка: подзаголовок');
  ok(await p.evaluate(() => !!document.querySelector('.onb-orb .wt-orb-water')), 'O1 в шапке круг с жидкостью');
  ok(t0.indexOf('барабаны веса') >= 0 && t0.indexOf('барабаны часов') >= 0, 'O1 подсказки карточек на месте');
  ok(t0.indexOf('поменять позже в настройках') >= 0, 'O1 подпись под «Начать»');
  ok(await p.evaluate(() => !!document.querySelector('.onb-clock')), 'O1 круглая кнопка системных часов внутри строки');

  /* O2: пол меняет норму */
  const goal0 = await p.evaluate(() => document.querySelector('.onb-goal').textContent);
  await p.evaluate(() => window.__waterApp.performAction({ dataset: { act: 'onb-gender', v: 'female' } }, 'onb-gender'));
  await p.waitForTimeout(250);
  const goal1 = await p.evaluate(() => document.querySelector('.onb-goal').textContent);
  ok(goal0 !== goal1, 'O2 норма пересчитывается от пола (' + goal0 + ' -> ' + goal1 + ')');
  await p.evaluate(() => window.__waterApp.performAction({ dataset: { act: 'onb-gender', v: 'male' } }, 'onb-gender'));
  await p.waitForTimeout(200);

  /* O3: вес — диалог с барабанами, Ок применяет */
  await act('onb-weight');
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => !!document.querySelector('[data-wheel="kg-int"]')), 'O3 диалог веса: барабан целых');
  ok(await p.evaluate(() => !!document.querySelector('[data-wheel="kg-dec"]')), 'O3 диалог веса: барабан десятых');
  ok(!(await p.evaluate(() => !!document.querySelector('.onb-kg-grid'))), 'O3 чип-шторки веса больше нет');
  await p.evaluate(() => { document.querySelector('[data-wheel="kg-int"]')._setValue(80); });
  await p.waitForTimeout(250);
  await p.evaluate(() => { document.querySelector('[data-wheel="kg-dec"]')._setValue(0); });
  await p.waitForTimeout(300);
  await act('onb-weight-ok');
  await p.waitForTimeout(300);
  const wt = await txt();
  ok(wt.indexOf('80') >= 0 && (await p.evaluate(() => window.__waterApp.ui.onb.kg)) === 80, 'O3 Ок применил вес 80');

  /* O4: начало суток — диалог с барабанами часов */
  await act('onb-time');
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => !!document.querySelector('[data-wheel="day-h"]') && !!document.querySelector('[data-wheel="day-m"]')), 'O4 диалог времени: два барабана');
  await p.evaluate(() => { document.querySelector('[data-wheel="day-h"]')._setValue(5); });
  await p.waitForTimeout(250);
  await p.evaluate(() => { document.querySelector('[data-wheel="day-m"]')._setValue(30); });
  await p.waitForTimeout(250);
  await act('onb-day-ok');
  await p.waitForTimeout(300);
  ok(await p.evaluate(() => window.__waterApp.ui.onb.dayStart) === '05:30', 'O4 Ок применил 05:30');

  /* O5: системные часы — скрытый пикер создан (веб-ветка донора) */
  await act('onb-time-sys');
  await p.waitForTimeout(300);
  const hasInp = await p.evaluate(() => !!document.querySelector('input[type="time"]'));
  ok(hasInp, 'O5 системные часы: скрытый пикер времени создан');
  await p.evaluate(() => { const i = document.querySelector('input[type="time"]'); if (i) i.remove(); });

  /* O6: «Начать» доводит до главного с черновиком */
  await act('onb-done');
  await p.waitForTimeout(600);
  const st = await p.evaluate(() => JSON.parse(JSON.stringify(window.__waterApp.state)));
  ok(st.onboarded === 1, 'O6 онбординг завершён');
  ok(st.weightKg === 80 && st.dayStart === '05:30', 'O6 черновик стал состоянием (80 кг, 05:30)');
  ok(await p.evaluate(() => !!document.querySelector('.wt-orb')), 'O6 главный экран с кругом');

  ok(errs.length === 0, 'O7 консоль чиста' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));

  console.log('ИТОГ onb: ' + pass + ' PASS, ' + fail + ' FAIL');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
