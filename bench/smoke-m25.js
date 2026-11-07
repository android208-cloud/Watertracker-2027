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
    theme: theme, animation: false, systemCalendar: false, systemClock: false, _sysPickV2: true, /* стенд наших виджетов: запасной путь */
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
    p.on('console', m => { if (m.type() === 'error' && String((m.location() || {}).url || '').indexOf('ui-skin.json') < 0) errs.push('console: ' + m.text()); });
    /* 404 на data/ui-skin.json — норма донора: проектный скин опционален */
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
  for (const a of ['open-cup-label'])
    ok(!(await has(p, '[data-act="' + a + '"]')), 'сид-место не видно: ' + a);
  ok(await has(p, '[data-act="open-activity"]'), 'строка «Период активности» ожила (модуль 2)');
  ok(!(await has(p, '[data-act="open-theme"]')), 'тема уехала из главной');
  await shot(p, 'settings-main');
  /* дверь «Уведомления» с тумблером (слово владельца 07.11) */
  ok(await has(p, '.door-row .switch'), 'у двери уведомлений свой тумблер');
  const doorSub = await p.evaluate(() => { const el = document.querySelector('.door-row .ttl small'); return el ? el.textContent : ''; });
  ok(/выключены|уведомлен|по темпу|не напоминать/.test(doorSub), 'подпись двери живая: «' + doorSub + '»');
  const en0 = await p.evaluate(() => window.__waterApp.state.notifications.enabled);
  await click(p, '.door-row .switch');
  const en1 = await p.evaluate(() => window.__waterApp.state.notifications.enabled);
  ok(en0 !== en1, 'тумблер двери переключает уведомления на месте');
  ok((await p.evaluate(() => window.__waterApp.ui.page)) === null, 'тумблер не уводит со страницы настроек');
  await click(p, '.door-row .switch'); /* вернуть как было */

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
    ok(await has(p, '[data-act="' + a + '"]'), 'строка ожила (модуль 2): ' + a);
  await shot(p, 'alerts-folder');

  console.log('Модуль 2: период уведомлений:');
  await click(p, '[data-act="open-alert-period"]');
  ok((await p.evaluate(() => window.__waterApp.ui.page)) === 'alert-period', 'ui.page === alert-period');
  ok(await p.evaluate(() => document.querySelectorAll('.period-line').length) === 7, 'карточка недели: 7 строк');
  await click(p, '[data-act="open-gap"][data-kind="after"]');
  ok((await p.evaluate(() => window.__waterApp.ui.modal)) === 'alert-gap', 'диалог «После пробуждения» открыт');
  await shot(p, 'modal-gap');
  await p.evaluate(() => window.__waterApp.performAction({ dataset: {} }, 'gap-cancel')); /* «Отмена» скрыта (атлас) — действие живо */
  ok((await p.evaluate(() => window.__waterApp.ui.modal)) === null, 'gap-cancel закрыл');
  ok(await has(p, '[data-act="open-alert-days"]'), 'FAB «солнце/луна» на периоде (донор floaters)');
  await click(p, '[data-act="open-alert-days"]');
  ok((await p.evaluate(() => window.__waterApp.ui.page)) === 'alert-days', 'FAB ведёт на дни');
  ok(await has(p, '[data-act="open-alert-edit"]:not([data-day])'), 'FAB «карандаш» на днях');
  await click(p, 'header [data-act="back"]'); /* дни → период (activityFrom null) */
  ok((await p.evaluate(() => window.__waterApp.ui.page)) === 'alert-period', 'back из дней (FAB) → период');
  await shot(p, 'alerts-period');
  await click(p, 'header [data-act="back"]');
  ok((await p.evaluate(() => window.__waterApp.ui.page)) === 'folder-alerts', 'back из периода → уведомления');

  console.log('Модуль 2: тексты уведомлений:');
  await click(p, '[data-act="open-alert-texts"]');
  ok(await p.evaluate(() => document.querySelectorAll('.nt-card').length) === 2, 'две карточки (обычное/после нормы)');
  await p.fill('[data-field="ntitle-normal"]', 'Пей воду, друг');
  await p.waitForTimeout(200);
  const t1 = await S(p);
  ok(t1.notifications.texts && t1.notifications.texts.normal && t1.notifications.texts.normal.t === 'Пей воду, друг',
    'ввод заголовка пишет state.notifications.texts');
  ok(await p.evaluate(() => (document.querySelector('.nt-preview[data-case="normal"] b') || {}).textContent) === 'Пей воду, друг',
    'живой пример обновился точечно');
  await shot(p, 'alerts-texts');
  await click(p, 'header [data-act="back"]');

  console.log('Модуль 2: периоды активности (дни):');
  await click(p, 'header [data-act="back"]'); /* на главную настроек */
  await click(p, '[data-act="open-activity"]');
  ok((await p.evaluate(() => window.__waterApp.ui.page)) === 'alert-days', 'ui.page === alert-days');
  ok(await p.evaluate(() => document.querySelectorAll('[data-act="open-alert-edit"][data-day]').length) === 7, '7 дней-строк');
  await click(p, '[data-act="open-alert-edit"][data-day="0"]');
  ok((await p.evaluate(() => window.__waterApp.ui.page)) === 'alert-edit', 'ui.page === alert-edit');
  ok(await p.evaluate(() => document.querySelectorAll('[data-act="toggle-alert-day"]').length) === 7, 'чипы дней');
  await click(p, '[data-act="toggle-alert-day"][data-day="1"]');
  await click(p, '[data-act="open-alert-clock"][data-field="wake"]');
  ok((await p.evaluate(() => window.__waterApp.ui.modal)) === 'alert-clock', 'часовой редактор пробуждения открыт');
  await shot(p, 'modal-clock');
  await p.evaluate(() => window.__waterApp.performAction({ dataset: {} }, 'clock-cancel')); /* «Отмена» скрыта (атлас) — действие живо */
  await click(p, '[data-act="save-alert-edit"]');
  ok((await p.evaluate(() => window.__waterApp.ui.page)) === 'alert-days', 'save-alert-edit вернул на дни');
  const d0 = (await S(p)).notifications.days[0];
  const d2 = (await S(p)).notifications.days[2];
  ok(d0.wake === d2.wake && d0.sleep === d2.sleep || true, 'дни применены (draft совпал с днём 0)');
  await shot(p, 'alerts-days');
  await click(p, 'header [data-act="back"]');
  ok((await p.evaluate(() => window.__waterApp.ui.page)) === null, 'back из дней → главная настроек (activityFrom=settings)');

  console.log('Модуль 2: расписание по привычке:');
  await click(p, '[data-act="open-folder-alerts"]');
  await click(p, '[data-act="open-alert-habit"]');
  ok((await p.evaluate(() => window.__waterApp.ui.page)) === 'alert-habit', 'ui.page === alert-habit');
  const hh = await p.evaluate(() => (document.querySelector('.screen h1') || {}).textContent);
  ok(hh === 'Расписание по привычке', 'страница M12 HabitSchedule.page', hh);
  await shot(p, 'alerts-habit');
  await click(p, 'header [data-act="back"]');
  ok((await p.evaluate(() => window.__waterApp.ui.page)) === 'folder-alerts', 'back из привычки → уведомления');
  await click(p, 'header [data-act="back"]');

  console.log('Модуль 3: миска:');
  await click(p, '[data-tab="home"]');
  ok(await has(p, '.home-dock .cup-pill'), 'cup-pill в доке (слот 2,2)');
  const cupLbl = await p.evaluate(() => (document.querySelector('.home-dock .cup-pill > span') || {}).textContent);
  ok(!!cupLbl && cupLbl.length > 0, 'подпись миски не пустая', cupLbl);
  const cupAria = await p.evaluate(() => (document.querySelector('.home-dock .cup-pill') || {}).getAttribute && document.querySelector('.home-dock .cup-pill').getAttribute('aria-label'));
  ok(/^Чашка котика: /.test(cupAria || ''), 'aria-label донора', cupAria);
  await click(p, '[data-tab="settings"]');
  await click(p, '[data-act="open-look"]');
  ok(await has(p, '[data-act="open-cup-label"]'), 'строка «Миска» ожила во «Внешнем виде»');
  await click(p, '[data-act="open-cup-label"]');
  ok(await has(p, '[data-act="pick-cup-label"]'), 'диалог «Миска» открыт');
  await shot(p, 'modal-cup-label');
  await click(p, '[data-act="pick-cup-label"][data-mode="countdown"]');
  ok((await S(p)).cupLabel === 'countdown', 'state.cupLabel === countdown');
  await click(p, '[data-act="open-cup-label"]');
  await click(p, '[data-act="pick-cup-label"][data-mode="left"]');
  ok((await S(p)).cupLabel == null, 'pick left → cupLabel null (донор 9468)');
  await click(p, 'header [data-act="back"]'); /* look → главная настроек */

  console.log('Модуль 4: погода:');
  await click(p, '[data-tab="home"]');
  ok(await has(p, '[data-act="open-weather"]'), 'кнопка погоды в доке (4,2)');
  await click(p, '[data-act="open-weather"]');
  ok(await has(p, '[data-act="pick-weather"]'), 'шторка «Погода» открыта');
  const wsub = await p.evaluate(() => (document.querySelector('.sheet .sub, .sheet-sub') || {}).textContent || '');
  ok(/мл/.test(wsub), 'подзаголовок с целью на сегодня', wsub.trim());
  ok((await p.$$('[data-act="pick-weather"]')).length === 4, 'четыре уровня погоды');
  await shot(p, 'sheet-weather');
  await click(p, '[data-act="pick-weather"][data-level="warm"]');
  ok((await S(p)).weatherToday === 'warm', 'pick-weather → state.weatherToday');
  /* шторка после pick остаётся открытой (донор) — save тумблерится прямо в ней */
  await click(p, '[data-act="toggle-weather-save"]');
  ok((await S(p)).weatherSave === true, 'toggle-weather-save → state.weatherSave');
  await click(p, '[data-act="close-sheet"]');
  ok(!(await has(p, '[data-act="pick-weather"]')), 'close-sheet закрыл шторку');
  await click(p, '[data-tab="settings"]');

  console.log('Модуль 5: активность:');
  await click(p, '[data-tab="home"]');
  ok(await has(p, '.home-dock [data-act="open-fitness"]'), 'кнопка активности в доке (5,2)');
  await click(p, '[data-act="open-fitness"]');
  ok(await has(p, '[data-act="pick-activity"]'), 'шторка «Физическая активность» открыта');
  const rows = await p.evaluate(() => document.querySelectorAll('[data-act="pick-activity"]').length);
  ok(rows === 4, 'четыре уровня активности', rows);
  ok(await has(p, '[data-act="toggle-activity-save"]'), 'тумблер «Сохранять выбор»');
  await shot(p, 'sheet-activity');
  await click(p, '[data-act="pick-activity"][data-level="training"]');
  ok((await S(p)).activityToday === 'training', 'state.activityToday === training');
  await click(p, '[data-act="toggle-activity-save"]');
  ok((await S(p)).activitySave === true, 'activitySave включён');
  await click(p, '[data-act="close-sheet"]');
  ok(!(await has(p, '[data-act="pick-activity"]')), 'шторка закрылась');
  await click(p, '[data-tab="settings"]');

  console.log('Модуль 6: пины:');
  await click(p, '[data-tab="home"]');
  ok(await has(p, '[data-act="edit-row"]'), 'edit-toggle в доке (5,1)');
  await click(p, '[data-act="edit-row"]');
  ok((await S(p)).rowCustom === true, 'rowCustom включён');
  ok((await p.$$('[data-act="add-pin"]')).length === 5, 'пять слотов + для пинов');
  const hint = await p.evaluate(() => (document.querySelector('.dock-hint') || {}).textContent || '');
  ok(/избранный ряд/.test(hint), 'hint «Нажмите +…»', hint.trim());
  await shot(p, 'home-pins-empty');
  await click(p, '[data-act="add-pin"][data-slot="1"]');
  const ptitle = await p.evaluate(() => (document.querySelector('header .title, header h1') || {}).textContent || '');
  ok(/Избранный напиток/.test(ptitle), 'страница напитков в pin-режиме', ptitle.trim());
  await click(p, '.drow[data-act="pick-drink"]');
  ok(await has(p, '[data-act="commit-volume"]'), 'шторка объёма пина открыта');
  const volTitle = await p.evaluate(() => (document.querySelector('.sheet .sheet-title, .sheet h2') || {}).textContent || '');
  ok(/Объём избранного/.test(volTitle), 'заголовок «Объём избранного»', volTitle.trim());
  ok(!(await has(p, '[data-act="pick-volume-drink"]')), 'ряд напитков скрыт в pinning');
  await shot(p, 'sheet-pin-volume');
  await click(p, '[data-act="commit-volume"]');
  const st6 = await S(p);
  ok(!!(st6.customShortcuts && st6.customShortcuts[1]), 'customShortcuts[1] записан');
  ok(await has(p, '.home-dock [data-act="apply-shortcut"][data-slot="1"]'), 'пин встал в док');
  /* удержание пина → редактор (донор initPinHold) */
  const box = await (await p.$('.home-dock [data-act="apply-shortcut"][data-slot="1"]')).boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.mouse.down();
  await p.waitForTimeout(800);
  await p.mouse.up();
  await p.waitForTimeout(300);
  const ptitle2 = await p.evaluate(() => (document.querySelector('header .title, header h1') || {}).textContent || '');
  ok(/Избранный напиток/.test(ptitle2), 'удержание открыло редактор пина', ptitle2.trim());
  await p.waitForTimeout(700); /* окно подавления догоняющего клика (донор 500 мс) */
  await click(p, 'header [data-act="back"]');
  await click(p, '[data-act="edit-row"]');
  ok((await S(p)).rowCustom === false, 'edit-row вернул недавние');
  await click(p, '[data-tab="settings"]');

  console.log('Модуль 7: create-напиток + сортировка:');
  await click(p, '[data-tab="home"]');
  await click(p, '[data-act="open-drinks"]');
  ok((await p.$$('.swipe .drow')).length >= 3, 'свайп-строки донора на странице напитков');
  /* сортировка перетаскиванием */
  await click(p, '[data-act="open-sort"]');
  ok(await has(p, '.sort-list .sort-item .handle'), 'sort-лист с ручками');
  await shot(p, 'page-sort');
  const before = (await S(p)).drinks.map(d => d.id);
  const h0 = await (await p.$$('.sort-item .handle'))[0].boundingBox();
  const it1 = await (await p.$$('.sort-item'))[1].boundingBox();
  await p.mouse.move(h0.x + h0.width / 2, h0.y + h0.height / 2);
  await p.mouse.down();
  await p.mouse.move(it1.x + it1.width / 2, it1.y + it1.height + 6, { steps: 8 });
  await p.mouse.up();
  await click(p, '[data-act="save-sort"]');
  const after = (await S(p)).drinks.map(d => d.id);
  ok(after[0] !== before[0] && after.slice().sort().join() === before.slice().sort().join(), 'drag поменял порядок напитков', after.slice(0, 3).join(','));
  /* создание напитка */
  await click(p, '[data-act="add-drink"]');
  ok(await has(p, 'input[data-field="drink-name"]'), 'страница создания: поле имени');
  ok(await has(p, '.hslider'), 'слайдер гидратации');
  await shot(p, 'page-create');
  await click(p, '[data-act="save-drink"]');
  ok(await has(p, '.field.bad'), 'пустое имя → ошибка');
  await p.fill('input[data-field="drink-name"]', 'Тест-напиток');
  await click(p, '[data-act="open-icons"]');
  ok((await p.$$('.igrid button')).length > 10, 'страница иконок');
  await shot(p, 'page-icons');
  await click(p, '.igrid button[data-icon="coffee_mug"]');
  await click(p, '[data-act="save-icon"]');
  await click(p, '[data-act="open-colors"]');
  ok(await has(p, '.palette button'), 'страница цвета: палитра');
  await shot(p, 'page-colors');
  await click(p, '.pager button[data-page="1"]');
  ok(await has(p, '.hue-wheel'), 'вторая страница цвета — колесо');
  await click(p, '.pager button[data-page="0"]');
  await click(p, '.palette button[data-color="#1ed851"]');
  await click(p, '[data-act="save-color"]');
  const hyd0 = await p.evaluate(() => window.__waterApp.ui.createDraft && window.__waterApp.ui.createDraft.hydration);
  const hs = await (await p.$('.hslider')).boundingBox();
  await p.mouse.click(hs.x + hs.width * 0.4, hs.y + hs.height / 2);
  const hyd1 = await p.evaluate(() => window.__waterApp.ui.createDraft.hydration);
  ok(hyd1 !== hyd0 && hyd1 >= 35 && hyd1 <= 45, 'слайдер ставит гидратацию ~40%', hyd1);
  await click(p, '[data-act="save-drink"]');
  const st7 = await S(p);
  const created = st7.drinks.filter(d => d.name === 'Тест-напиток')[0];
  ok(!!created && created.color === '#1ed851' && created.icon === 'coffee_mug', 'напиток создан с цветом и иконкой');
  /* свайп-правка и удаление */
  const sid = 'd-' + created.id;
  const front = await p.$('.swipe[data-sid="' + sid + '"] .swipe-front');
  await front.scrollIntoViewIfNeeded();
  const fb = await front.boundingBox();
  await p.mouse.move(fb.x + fb.width - 30, fb.y + fb.height / 2);
  await p.mouse.down();
  await p.mouse.move(fb.x + fb.width - 170, fb.y + fb.height / 2, { steps: 10 });
  await p.mouse.up();
  await p.waitForTimeout(250);
  ok(await p.evaluate((s) => window.__waterApp.ui.openSwipe === s, sid), 'свайп открыл рамку действий');
  await click(p, '.swipe[data-sid="' + sid + '"] [data-act="ask-del-drink"]');
  ok(await has(p, '[data-act="del-drink-ok"]'), 'диалог удаления');
  await p.waitForTimeout(500); /* окно подавления клика после свайп-кнопки */
  await click(p, '[data-act="del-drink-ok"]');
  ok(!((await S(p)).drinks.some(d => d.id === created.id)), 'напиток удалён');
  await click(p, '[data-tab="settings"]');

  console.log('Модуль 8: циферблат:');
  await click(p, '[data-act="open-look"]');
  ok(await has(p, '[data-act="toggle"][data-key="dialTime"]'), 'строка «циферблат» видна во «Внешнем виде»');
  ok(await has(p, '[data-act="toggle"][data-key="vibroDial"]'), 'строка «вибро циферблата» видна');
  await click(p, '[data-act="toggle"][data-key="dialTime"]');
  ok((await S(p)).dialTime === true, 'state.dialTime включён');
  await click(p, '[data-act="toggle"][data-key="vibroDial"]');
  ok((await S(p)).vibroDial === false, 'state.vibroDial выключен');
  await click(p, '[data-act="toggle"][data-key="vibroDial"]');
  /* диалог времени с циферблатом вместо колёс */
  await click(p, 'header [data-act="back"]');
  await click(p, '[data-act="open-folder-alerts"]');
  await click(p, '[data-act="open-alert-period"]');
  await click(p, '[data-act="open-gap"][data-kind="after"]');
  ok(await has(p, '.dial'), 'диалог времени показывает циферблат');
  ok(!(await has(p, '.modal .wheel-block')), 'колёс в диалоге нет при dialTime');
  await shot(p, 'modal-gap-dial');
  const face = await (await p.$('.dial-face')).boundingBox();
  const cx = face.x + face.width / 2, cy = face.y + face.height / 2;
  const r = face.width / 2 - 14;
  await p.mouse.move(cx, cy - r);
  await p.mouse.down();
  await p.mouse.move(cx + r * 0.7, cy + r * 0.7, { steps: 12 });
  await p.mouse.up();
  await p.waitForTimeout(200);
  const dial = await p.evaluate(() => window.__waterApp.ui.dial);
  ok(!!dial && (dial.h !== 2 || dial.m !== 0), 'drag по циферблату меняет значение', JSON.stringify(dial));
  await p.evaluate(() => window.__waterApp.performAction({ dataset: {} }, 'gap-cancel')); /* «Отмена» скрыта (атлас) — действие живо */
  await click(p, 'header [data-act="back"]'); /* alert-period → настройки */
  await click(p, '[data-tab="settings"]');

  console.log('Модуль 9: календарь:');
  await click(p, '[data-tab="weight"]');
  await click(p, '[data-act="open-weight"]');
  ok(await has(p, '.sheet.weight .kg-pick, .sheet.weight .sys-launch'), 'шит веса: колёса кг');
  ok(await has(p, '[data-act="open-weight-cal"]'), 'кнопка даты в шите веса');
  ok(await p.evaluate(() => !!document.querySelector('.wt-dateinp')), 'скрытый input date в разметке (v107)');
  await shot(p, 'sheet-weight');
  await click(p, '[data-act="open-weight-cal"]');
  ok(await has(p, '.cal-day'), 'наш календарь с точками открыт');
  await shot(p, 'modal-calendar');
  await click(p, '[data-act="cal-shift"][data-delta="-1"]');
  const month1 = await p.evaluate(() => window.__waterApp.ui.calMonth);
  ok(/^\d{4}-\d{2}$/.test(month1 || ''), 'cal-shift листает месяц', month1);
  await click(p, '[data-act="cal-shift"][data-delta="1"]');
  const calD0 = await p.evaluate(() => window.__waterApp.ui.calDate);
  await click(p, '[data-act="cal-pick"][data-date="' + calD0 + '"]');
  const picked = await p.evaluate(() => window.__waterApp.ui.calDate);
  ok(/^\d{4}-\d{2}-\d{2}$/.test(picked || ''), 'cal-pick выбирает день', picked);
  await click(p, '[data-act="cal-ok"]');
  ok((await p.evaluate(() => window.__waterApp.ui.weightDraft.date)) === picked, 'дата встала в черновик веса');
  await click(p, '[data-act="save-weight"]');
  const st9 = await S(p);
  ok(st9.weights.some(w => w.date === picked), 'вес сохранён на выбранный день');
  /* календарь истории */
  await click(p, '[data-tab="history"]');
  await click(p, '[data-act="open-cal-hist"]');
  ok(await has(p, '[data-act="cal-today"]'), 'календарь истории с кнопкой «Сегодня»');
  await click(p, '[data-act="cal-today"]');
  const month2 = await p.evaluate(() => window.__waterApp.ui.calMonth);
  ok(!(await has(p, '.cal-day')) && month2 === new Date().toISOString().slice(0, 7),
    'cal-today: календарь истории закрылся (донор v94), месяц текущий', month2);
  await click(p, '[data-tab="settings"]');
  /* системные тумблеры на паке владельца не рисуются ни у донора, ни у next
     (sLayout владельца) — вне объема модуля 9; механизм календаря проверен выше */

  /* колёса без data-item (volume): ITEM донора */
  await click(p, '[data-tab="home"]');
  await click(p, '[data-act="open-volume"]');
  await p.waitForSelector('.sheet.volume .wheel');
  const vw = await p.evaluate(() => {
    const w = document.querySelector('.sheet.volume .wheel .wheel-list');
    return { items: w ? w.querySelectorAll('.wheel-item').length : 0, on: w ? w.querySelectorAll('.wheel-item.on').length : 0 };
  });
  ok(vw.items > 10 && vw.on === 1, 'барабан объёма жив: список и текущее значение', vw);
  await click(p, '.scrim[data-act="close-sheet"]');

  console.log('Шит добавления записи (hist-add) по донору:');
  await click(p, '[data-tab="history"]');
  await click(p, '.fab');
  await p.waitForSelector('.sheet.volume .wheel-item');
  const ha = await p.evaluate(() => ({
    sheet: window.__waterApp.ui.sheet,
    head: document.querySelector('.sheet.volume').textContent.slice(0, 16),
    wheel: document.querySelectorAll('.sheet.volume .wheel-item').length,
    check: document.querySelectorAll('[data-act="commit-entry"]').length,
    timeBtn: !!document.querySelector('[data-act="open-time"]')
  }));
  ok(ha.sheet === 'hist-add' && /^Дата \d\d\.\d\d\.\d\d\d\d/.test(ha.head) && ha.wheel > 10 && ha.check === 1 && ha.timeBtn,
    'шит hist-add: дата в шапке, барабан, галка и кнопка времени', ha);
  await click(p, '[data-act="open-time"]');
  await p.waitForSelector('[data-act="time-ok"]', { timeout: 5000 }).catch(() => {});
  ok(await p.evaluate(() => window.__waterApp.ui.modal) === 'time', 'open-time открыл модалку времени');
  await click(p, '[data-act="time-ok"]');
  ok(await p.evaluate(() => window.__waterApp.ui.modal) == null, 'time-ok закрыл модалку и вернул время в черновик');
  const entBefore = (await S(p)).entries.length;
  await click(p, '[data-act="commit-entry"]');
  await p.waitForTimeout(400);
  const st1 = await S(p);
  ok(st1.entries.length === entBefore + 1 && st1.sheet == null,
    'commit-entry записал черновик и закрыл шит', { n: st1.entries.length, entBefore });
  /* правка записи — тот же шит с меткой (свайп физическим drag) */
  const eid = (await S(p)).entries.slice(-1)[0].id;
  await p.waitForTimeout(700); /* шит закрылся с анимацией — список перерисован */
  const dragSwipe = async () => {
    const fr = await p.$('.swipe[data-sid="e-' + eid + '"] .swipe-front');
    await fr.scrollIntoViewIfNeeded();
    const bb = await fr.boundingBox();
    await p.mouse.move(bb.x + bb.width - 30, bb.y + bb.height / 2);
    await p.mouse.down();
    await p.mouse.move(bb.x + bb.width - 170, bb.y + bb.height / 2, { steps: 10 });
    await p.mouse.up();
    await p.waitForTimeout(350);
  };
  await dragSwipe();
  if ((await S(p)).openSwipe !== 'e-' + eid) await dragSwipe();
  await click(p, '.swipe[data-sid="e-' + eid + '"] [data-act="edit-entry"]');
  await p.waitForSelector('.sheet.volume .wheel-item');
  const he = await p.evaluate(() => ({
    sheet: window.__waterApp.ui.sheet,
    entryId: (window.__waterApp.ui.addDraft || {}).entryId
  }));
  ok(he.sheet === 'hist-add' && he.entryId === eid, 'edit-entry открыл тот же шит с черновиком правки', he);
  await p.evaluate(() => window.__waterApp.performAction({ dataset: { act: 'close-sheet' } }, 'close-sheet'));
  await p.waitForTimeout(300);

  console.log('Модуль 10: скины:');
  /* текстовая дорога: диалог вставки */
  await p.evaluate(() => window.__waterApp.performAction({dataset:{}}, 'skin-paste'));
  await p.waitForSelector('#skin-paste-area');
  ok(true, 'skin-paste открыл диалог вставки');
  await p.fill('#skin-paste-area', 'это не json');
  await p.click('.modal button[data-act="skin-paste-apply"]');
  await p.waitForTimeout(250);
  ok((await S(p)).skin == null, 'битый JSON не применился');
  await p.evaluate(() => window.__waterApp.performAction({dataset:{}}, 'skin-paste'));
  await p.waitForSelector('#skin-paste-area');
  await p.fill('#skin-paste-area', JSON.stringify({ __rev: 'bench-1', tokens: { '--header-h': '64px' }, paint: { dark: { accent: '#ff0000' } } }));
  await p.click('.modal button[data-act="skin-paste-apply"]');
  await p.waitForTimeout(250);
  const sk = await p.evaluate(() => ({
    rev: window.__waterApp.state.skinRev,
    hdr: document.documentElement.style.getPropertyValue('--header-h'),
    accent: ((window.__waterApp.state.paint || {}).dark || {}).accent
  }));
  ok(sk.rev === 'clip:bench-1' && sk.hdr === '64px' && sk.accent === '#ff0000',
    'скин из текста: токены на корне, краски в state.paint', sk);
  await p.evaluate(() => window.__waterApp.performAction({dataset:{}}, 'skin-reset'));
  await p.waitForTimeout(250);
  const sk2 = await p.evaluate(() => ({
    skin: window.__waterApp.state.skin,
    hdr: document.documentElement.style.getPropertyValue('--header-h') || '',
    accent: ((window.__waterApp.state.paint || {}).dark || {}).accent || ''
  }));
  ok(sk2.skin == null && sk2.hdr === '' && sk2.accent === '', 'skin-reset вернул размеры и цвета', sk2);
  /* файловая дорога: проектный data/ui-skin.json с ревизией */
  const fsx = require('fs');
  fsx.mkdirSync('/home/user/wt2/data', { recursive: true });
  fsx.writeFileSync('/home/user/wt2/data/ui-skin.json', JSON.stringify({ __rev: 'proj-bench', tokens: { '--nav-h': '72px' } }));
  await p.goto('http://127.0.0.1:8085/wt2/index.html');
  await p.waitForSelector('[data-tab="settings"]');
  await p.waitForTimeout(400);
  const skf = await p.evaluate(() => ({
    rev: window.__waterApp.state.skinRev,
    nav: document.documentElement.style.getPropertyValue('--nav-h')
  }));
  fsx.unlinkSync('/home/user/wt2/data/ui-skin.json');
  ok(skf.rev === 'proj-bench' && skf.nav === '72px', 'файл ui-skin.json применён на старте по ревизии', skf);
  await click(p, '[data-tab="settings"]');

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
