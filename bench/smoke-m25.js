/* Смоук M25 (sLayout): донорская машина настроек в next.
   Проверяет словом и делом: страницы (главная/Внешний вид/Дополнительно/
   Уведомления/структура), сид-места (строки неприехавших модулей не видны,
   дверь «Волна» не рисуется), пикеры донора (пол/норма/тема), возвраты,
   «Удалить все данные». Снимки — bench/shots/m25/ (вне коммитов). */
const { chromium } = require('/home/user/pw/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const OWNER = JSON.parse(fs.readFileSync('/home/user/uploads/vodomer-baza-owner.json', 'utf8'));
const OUT = path.join(__dirname, 'shots', 'm25');

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

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name); }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const errs = [];

  async function newPage(theme) {
    const ctx = await b.newContext({ viewport: { width: 412, height: 892 } });
    await ctx.addInitScript(`localStorage.setItem('cup-tracker-v1', ${JSON.stringify(JSON.stringify(seedState(theme)))});`);
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await p.goto('http://127.0.0.1:8085/wt2/index.html');
    await p.waitForFunction(() => window.__waterApp && document.querySelector('.progress .label'));
    await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
    return p;
  }
  const S = p => p.evaluate(() => JSON.parse(JSON.stringify(window.__waterApp.state)));
  const has = (p, sel) => p.evaluate(s => !!document.querySelector(s), sel);
  const shot = (p, name) => p.screenshot({ path: path.join(OUT, name + '.png') });
  const click = async (p, sel) => { await p.click(sel); await p.waitForTimeout(250); };

  const p = await newPage('dark');

  console.log('Главная настроек:');
  await click(p, '[data-tab="settings"]');
  ok(await has(p, '.set-ver'), 'версия прибита внизу (.set-ver)');
  const txt = await p.evaluate(() => document.querySelector('.screen').textContent);
  for (const t of ['Мой профиль', 'Личные настройки', 'Основные настройки']) ok(txt.includes(t), 'секция «' + t + '»');
  for (const a of ['open-gender', 'open-units', 'open-norm', 'open-day-start', 'open-set-weight',
                   'open-look', 'open-advanced', 'open-folder-alerts'])
    ok(await has(p, '[data-act="' + a + '"]'), 'строка/дверь ' + a);
  for (const a of ['open-activity', 'open-alert-texts', 'open-alert-period', 'open-cup-label'])
    ok(!(await has(p, '[data-act="' + a + '"]')), 'сид-место не видно: ' + a);
  ok(!(await has(p, '[data-act="open-theme"]')), 'тема уехала из главной');
  await shot(p, 'settings-main');

  console.log('Внешний вид:');
  await click(p, '[data-act="open-look"]');
  ok((await p.evaluate(() => window.__waterApp.ui.page)) === 'look', 'ui.page === look');
  ok(await has(p, '[data-act="open-theme"]'), 'строка темы здесь');
  ok(!(await has(p, '[data-act="open-folder-wave"]')), 'дверь «Волна» не рисуется (0 живых строк)');
  ok(!(await has(p, '[data-key="animation"]')), 'анимация — сид-место');
  await shot(p, 'look');
  await click(p, 'header [data-act="back"]');
  ok((await p.evaluate(() => window.__waterApp.ui.page)) === null, 'back из look → главная');

  console.log('Дополнительно:');
  await click(p, '[data-act="open-advanced"]');
  const atxt = await p.evaluate(() => document.querySelector('.screen').textContent);
  ok(atxt.includes('Перенос данных'), 'секция «Перенос данных»');
  for (const a of ['load-history', 'save-db-file', 'share-db-file', 'open-history-export', 'ask-delete-all', 'open-struct'])
    ok(await has(p, '[data-act="' + a + '"]'), 'строка ' + a);
  ok(await has(p, '[data-key="devMode"]'), 'переключатель devMode виден (как в доноре)');
  ok(!(await has(p, '[data-key="svgEditor"]')), 'dev-разделы без devMode скрыты');
  ok(!(await has(p, '[data-act="skin-paste"]')), 'скины — сид-место');
  await shot(p, 'advanced');

  console.log('Структура интерфейса:');
  await click(p, '[data-act="open-struct"]');
  ok((await p.evaluate(() => window.__waterApp.ui.page)) === 'struct-export', 'ui.page === struct-export');
  ok(await has(p, '[data-act="struct-copy"]'), 'кнопка «Скопировать»');
  await shot(p, 'struct');
  await click(p, 'header [data-act="back"]');
  ok((await p.evaluate(() => window.__waterApp.ui.page)) === 'advanced', 'back из структуры → Дополнительно');
  await click(p, 'header [data-act="back"]');

  console.log('Уведомления (folder-alerts):');
  await click(p, '[data-act="open-folder-alerts"]');
  ok((await p.evaluate(() => window.__waterApp.ui.page)) === 'folder-alerts', 'ui.page === folder-alerts');
  for (const a of ['open-alert-sound', 'alert-test', 'sys-note', 'open-alert-freq'])
    ok(await has(p, '[data-act="' + a + '"]'), 'строка ' + a);
  ok(await has(p, '[data-key="alertOn"]'), 'тумблер «Включить уведомления»');
  for (const a of ['open-alert-texts', 'open-alert-period', 'open-alert-habit'])
    ok(!(await has(p, '[data-act="' + a + '"]')), 'сид-место не видно: ' + a);
  await shot(p, 'alerts-folder');
  await click(p, 'header [data-act="back"]');

  console.log('Пикеры донора:');
  await click(p, '[data-act="open-gender"]');
  ok(await has(p, '.gender-modal'), 'модалка пола открылась');
  await shot(p, 'modal-gender');
  await click(p, '.gender-modal [data-act="gender"][data-v="female"]');
  ok((await S(p)).gender === 'female', 'state.gender === female');
  ok(!(await has(p, '.gender-modal')), 'модалка закрылась');

  await click(p, '[data-act="open-norm"]');
  ok(await has(p, '.norm-modal'), 'модалка нормы (рекомендуемая/своя)');
  await click(p, '.norm-modal [data-act="pick-norm"][data-v="custom"]');
  ok((await p.evaluate(() => window.__waterApp.ui.sheet)) === 'goal', 'лист нормы (колесо+чипы)');
  await shot(p, 'sheet-goal');
  await click(p, '[data-act="goal-preset"][data-v="2000"]');
  await click(p, '[data-act="save-goal"]');
  const s2 = await S(p);
  ok(s2.goalMl === 2000, 'state.goalMl === 2000');

  await click(p, '[data-act="open-look"]');
  await click(p, '[data-act="open-theme"]');
  ok(await has(p, '.theme-modal'), 'модалка темы');
  await click(p, '.theme-modal [data-act="pick-theme"][data-v="light"]');
  ok((await S(p)).theme === 'light', 'state.theme === light');
  ok(await p.evaluate(() => document.documentElement.className.includes('light') || document.body.className.includes('light') || !!document.querySelector('.theme-light, html[data-theme="light"]')), 'светлая тема применена к DOM');
  await shot(p, 'look-light');
  await click(p, 'header [data-act="back"]');

  console.log('Удалить все данные (отдельный контекст):');
  const p2 = await newPage('dark');
  await click(p2, '[data-tab="settings"]');
  await click(p2, '[data-act="open-advanced"]');
  await click(p2, '[data-act="ask-delete-all"]');
  ok(await has(p2, '[data-act="do-delete-all"]'), 'диалог подтверждения с «Удалить»');
  await shot(p2, 'dialog-delete-all');
  await click(p2, '[data-act="do-delete-all"]');
  const s3 = await S(p2);
  ok(!s3.onboarded && !(s3.entries || []).length, 'resetAll: состояние чистое');

  console.log('\nОшибки страниц:', errs.length ? errs.slice(0, 6) : 'нет');
  if (errs.length) fail++;
  console.log('ИТОГ: ' + pass + ' PASS, ' + fail + ' FAIL');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
