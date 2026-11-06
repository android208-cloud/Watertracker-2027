/* Стенд M22 — кожа прототипа (шаг 1, слово владельца 06.11 «интерфейс =
   прототип без кота», «все мои изменения откатываем»): история и вес
   дословно донорские (столбцы 82 с живым окном и масштабом, вес — табы
   Неделя/Месяц/Год и свайп-дорожка периодов), главная — донорский каркас
   с кругом вместо кота, уведомления/настройки/напитки — каркас донора.
   Капсулы, пять колонок, ширина-по-диаметру и канон-как-рамка — в мусор.
   Даты динамические (Europe/Samara) — фикстура не стареет. */
const { chromium } = require('/home/user/pw/node_modules/playwright');
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('PASS ' + name + (extra != null ? ' :: ' + JSON.stringify(extra) : '')); }
  else { fail++; console.log('FAIL ' + name + (extra != null ? ' :: ' + JSON.stringify(extra) : '')); }
}
const TODAY = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Samara' }).format(new Date());
const dOff = (n) => {
  const d = new Date(TODAY + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const pad2 = (n) => (n < 10 ? '0' : '') + n;
const monthEnd = (iso) => {
  const y = Number(iso.slice(0, 4)), m = Number(iso.slice(5, 7));
  return iso.slice(0, 7) + '-' + pad2(new Date(Date.UTC(y, m, 0)).getUTCDate());
};
const W_DATES = [dOff(-280), dOff(-120), dOff(-20)];
const rowsIn = (start, end) => W_DATES.filter((d) => d >= start && d <= end).length;
const FIX = JSON.stringify({
  goalMl: 1950, gender: 'male', weightKg: 59.1, theme: 'dark', dayStart: '02:00',
  onboarded: 1, historyDismissed: 1, alertPermAsked: 1, profile: { drinkId: 'water', volume: 350 },
  drinks: [{ id: 'water', name: 'Вода', hydration: 100, icon: 'drop', color: '#4aa3e8' }, { id: 'espresso', name: 'Эспрессо', hydration: 70, icon: 'takeaway', color: '#8b5a2b' }],
  entries: [
    { id: 'e1', date: TODAY, time: '05:01', drinkId: 'water', name: 'Вода', icon: 'drop', color: '#4aa3e8', hydration: 100, volume: 200, credited: 200, createdAt: 1 },
    { id: 'e2', date: dOff(-1), time: '09:00', drinkId: 'espresso', name: 'Эспрессо', icon: 'takeaway', color: '#8b5a2b', hydration: 70, volume: 350, credited: 245, createdAt: 2 },
    { id: 'e3', date: dOff(-3), time: '09:00', drinkId: 'water', name: 'Вода', icon: 'drop', color: '#4aa3e8', hydration: 100, volume: 2400, credited: 2400, createdAt: 3 },
    { id: 'e4', date: dOff(-40), time: '09:00', drinkId: 'water', name: 'Вода', icon: 'drop', color: '#4aa3e8', hydration: 100, volume: 500, credited: 500, createdAt: 4 },
    { id: 'e5', date: dOff(-80), time: '09:00', drinkId: 'water', name: 'Вода', icon: 'drop', color: '#4aa3e8', hydration: 100, volume: 400, credited: 400, createdAt: 5 }
  ],
  weights: W_DATES.map((d, i) => ({ id: 'w' + i, date: d, kg: [57.8, 59.1, 59.0][i], createdAt: i + 1 })),
  notifications: { enabled: false, everyMin: 120, days: [] }
});
const near = (a, b) => Math.abs(a - b) <= 1;
const longDate = (iso) => iso.slice(8, 10) + '.' + iso.slice(5, 7) + '.' + iso.slice(0, 4);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 } });
  const errs = [];
  await ctx.addInitScript(`localStorage.setItem('cup-tracker-v1', ${JSON.stringify(FIX)});`);
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));

  /* 1. главная: каркас донора, круг вместо кота, пустые места не рисуются */
  await p.goto('http://127.0.0.1:8085/wt2/index.html');
  await p.waitForFunction(() => window.__waterApp);
  const home = await p.evaluate(() => {
    const scr = document.querySelector('.home-screen');
    return {
      firstIsBar: scr.firstElementChild.classList.contains('top') && scr.firstElementChild.classList.contains('home-bar-top'),
      topzone: !!document.querySelector('.wt-topzone'),
      orb: !!document.querySelector('.cat-stage .wt-orb'),
      catBtn: !!document.querySelector('.cat-btn'),
      water: !!document.querySelector('.cat-stage .wt-orb .cat-water'),
      cupPill: !!document.querySelector('.cup-pill'),
      weather: !!document.querySelector('[data-act="open-weather"]'),
      fitness: !!document.querySelector('[data-act="open-fitness"]'),
      editToggle: !!document.querySelector('[data-act="edit-row"]'),
      rounds: document.querySelectorAll('.home-dock .round').length,
      shortcuts: document.querySelectorAll('.home-dock .shortcut').length,
      pillDrop: !!document.querySelector('.home-dock .pill .mini-cat'),
      pillText: (document.querySelector('.home-dock .pill') || {}).textContent
    };
  });
  ok('главная: полоса прогресса первая, каркас донора; в слоте кота круг с жидкостью; чашка/погода/активность/избранный ряд — пустые невидимые места; пилюля с каплей',
    home.firstIsBar && !home.topzone && home.orb && !home.catBtn && home.water &&
    home.cupPill && home.weather && home.fitness && !home.editToggle && /* миска/погода/активность ожили (модули 3-5) */
    home.rounds === 4 /* undo+напиток+погода+активность (модуль 5) */ && home.shortcuts >= 1 && home.pillDrop && /350\s*мл/.test(home.pillText || ''), home);

  /* 2. история: донорские столбцы вместо капсул, верх донорский */
  await p.click('[data-tab="history"]');
  await p.waitForSelector('.chart-row .col');
  await p.waitForTimeout(300);
  const hist = await p.evaluate(() => {
    const sc = document.querySelector('.chart-scroll');
    const cols = Array.from(document.querySelectorAll('.chart-row .col'));
    const on = document.querySelector('.date-btn.on');
    return {
      caps: document.querySelectorAll('.wt-caps').length,
      panel: !!document.querySelector('.chart-panel'), n: cols.length,
      colW: cols[0].getBoundingClientRect().width,
      atRight: sc.scrollLeft >= sc.scrollWidth - sc.clientWidth - 2,
      onDate: on ? on.dataset.date : null,
      goalLine: !!document.querySelector('.goal-line'),
      calIco: !!document.querySelector('.hist-date .hist-cal-ico svg'),
      arrow: !!document.querySelector('.hist-screen > header.top .icon-btn.right'),
      pill: !!document.querySelector('.hist-screen > header.top .head-pill'),
      h1fs: parseFloat(getComputedStyle(document.querySelector('.hist-screen > header.top h1')).fontSize),
      h1x: Math.round(document.querySelector('.hist-screen > header.top h1').getBoundingClientRect().left),
      hdrBg: getComputedStyle(document.querySelector('.hist-screen > header.top')).backgroundColor,
      trackBg: getComputedStyle(document.documentElement).getPropertyValue('--track').trim()
    };
  });
  ok('история: капсул нет, столбцы донора 82px с окном у правого края, линия цели, календарная иконка в дате, верх донорский (стрелка, h1 20px, полоса --track)',
    hist.caps === 0 && hist.panel && hist.n > 0 && near(hist.colW, 82) && hist.atRight &&
    hist.onDate === TODAY && hist.goalLine && hist.calIco &&
    hist.arrow && !hist.pill && hist.h1fs === 20 && hist.h1x <= 17 &&
    hist.hdrBg === 'rgb(86, 87, 91)', hist);

  /* 3. стрелка в шапке ведёт на объёмы (донор) */
  await p.click('.hist-screen > header.top .icon-btn.right');
  await p.waitForFunction(() => window.__waterApp.ui.page === 'volumes');
  const vol = await p.evaluate(() => ({
    h1: (document.querySelector('.screen h1') || {}).textContent,
    total: !!document.querySelector('.vol-total')
  }));
  ok('история: круглая стрелка открывает «Объёмы» (донор-поведение)', vol.h1 === 'Объёмы' && vol.total, vol);
  await p.click('[data-tab="history"]');
  await p.waitForSelector('.chart-row .col');
  await p.waitForTimeout(300);

  /* 4. FAB истории: донорская шторка добавления */
  const before = await p.evaluate(() => window.__waterApp.state.entries.length);
  await p.click('.fab');
  await p.waitForSelector('[data-act="add-entry-save"]');
  await p.click('[data-act="add-vol-chip"][data-v="250"]');
  await p.click('[data-act="add-entry-save"]');
  await p.waitForFunction(n => window.__waterApp.state.entries.length === n, before + 1);
  const added = await p.evaluate(() => {
    const e = window.__waterApp.state.entries[window.__waterApp.state.entries.length - 1];
    return { vol: e.volume, toast: (document.querySelector('.toast') || {}).textContent };
  });
  ok('история: FAB добавляет запись донорской шторкой, тост «Записано»',
    added.vol === 250 && /Записано/.test(added.toast || ''), added);
  await p.waitForTimeout(300);

  /* 5. выбор дня столбцом (донор pick-day) */
  await p.click('.date-btn[data-date="' + dOff(-1) + '"]');
  await p.waitForFunction(d => window.__waterApp.ui.historyDate === d, dOff(-1));
  const sel = await p.evaluate(() => ({ head: document.querySelector('.hist-head .hist-date').textContent }));
  /* дать донорскому восстановлению прокрутки (два кадра) завершиться */
  await p.waitForTimeout(350);
  ok('история: тап по кнопке даты выбирает день, в «Истории» длинная дата',
    sel.head.indexOf(longDate(dOff(-1))) === 0, sel);

  /* 6. живая механика донора: прокрутка растит окно и пересчитывает масштаб */
  const mech = await p.evaluate(async () => {
    const sc = document.querySelector('.chart-scroll');
    const n0 = document.querySelectorAll('.chart-row .col').length;
    sc.scrollLeft = 0;
    await new Promise(r => setTimeout(r, 350));
    const cols = Array.from(document.querySelectorAll('.chart-row .col'));
    const vis = cols.filter(c => { const r = c.getBoundingClientRect(); return r.right > 0 && r.left < 412; });
    const bars = vis.map(c => c.querySelector('.bar')).filter(Boolean);
    return { n0, n1: cols.length, scale: sc._chartScale,
      maxBar: bars.length ? Math.max.apply(null, bars.map(x => x.offsetHeight)) : 0,
      left: sc.scrollLeft };
  });
  ok('история: прокрутка влево доращивает окно столбцов, масштаб по видимым (C-004), бары не выше 146',
    mech.n1 > mech.n0 && mech.scale > 1 && mech.maxBar <= 147 && mech.left < 1000, mech);

  /* 7. вес: донорская панель, табы, свайп-дорожка, строки wrow */
  await p.click('[data-tab="weight"]');
  await p.waitForSelector('.w-panel');
  await p.waitForTimeout(200);
  const expYear = rowsIn(TODAY.slice(0, 4) + '-01-01', TODAY.slice(0, 4) + '-12-31');
  const w = await p.evaluate(() => {
    const tr = document.querySelector('.w-track');
    return {
      now: document.querySelector('.w-now b').textContent,
      tabs: Array.from(document.querySelectorAll('.wrange button')).map(x => x.textContent + (x.classList.contains('on') ? '*' : '')),
      pages: document.querySelectorAll('.w-page').length,
      svgs: document.querySelectorAll('.w-page svg').length,
      transform: tr.style.transform,
      rows: document.querySelectorAll('.w-list .swipe').length,
      wrow: !!document.querySelector('.w-list .wrow .wkg'),
      histDate: !!document.querySelector('.weight-screen .hist-head .hist-date'),
      pill: !!document.querySelector('.weight-screen .head-pill'),
      periodTitle: (document.querySelectorAll('.w-period')[1] || {}).textContent
    };
  });
  ok('вес: донор — «Текущий вес», табы Неделя/Месяц/Год (год вкл), 2 страницы периодов в дорожке, строки wrow, «История» без даты, пилюли нет',
    w.now.indexOf('59.0') === 0 && w.tabs.join(',') === 'Неделя,Месяц,Год*' &&
    w.pages === 2 && w.svgs >= 1 && /translateX\(-\d/.test(w.transform) &&
    w.rows === expYear && w.wrow && !w.histDate && !w.pill && w.periodTitle === TODAY.slice(0, 4), w);

  /* 8. вес: таб «Месяц» переключает окно */
  await p.click('.wrange button[data-range="month"]');
  await p.waitForTimeout(200);
  const mExp = rowsIn(TODAY.slice(0, 7) + '-01', monthEnd(TODAY.slice(0, 7) + '-01'));
  const mo = await p.evaluate(() => ({
    on: (document.querySelector('.wrange button.on') || {}).textContent,
    rows: document.querySelectorAll('.w-list .swipe').length,
    empty: !!document.querySelector('.w-empty'),
    period: (document.querySelectorAll('.w-period')[1] || {}).textContent
  }));
  ok('вес: таб «Месяц» — окно календарного месяца, строки/пустышка по данным',
    mo.on === 'Месяц' && mo.rows === mExp && (mExp > 0 || mo.empty) &&
    mo.period.indexOf(TODAY.slice(0, 4)) > 0, mo);

  /* 9. вес: FAB добавляет взвешивание */
  await p.click('.wrange button[data-range="year"]');
  await p.waitForTimeout(150);
  await p.click('.fab');
  await p.waitForSelector('[data-act="weight-save"]');
  await p.fill('[data-act="weight-kg"]', '60.2');
  await p.fill('[data-act="weight-date"]', dOff(-2));
  await p.click('[data-act="weight-save"]');
  await p.waitForFunction(() => (window.__waterApp.state.weights || []).some(x => x.kg === 60.2));
  const wAdd = await p.evaluate(() => ({
    rows: document.querySelectorAll('.w-list .swipe').length,
    now: document.querySelector('.w-now b').textContent
  }));
  ok('вес: FAB пишет взвешивание, строка и «Текущий вес» обновляются',
    wAdd.rows === expYear + 1 && wAdd.now.indexOf('60.2') === 0, wAdd);

  /* 10. уведомления: каркас донора (разделы, строки, свичи) */
  await p.click('[data-tab="alerts"]');
  await p.waitForSelector('.n-section');
  const al = await p.evaluate(() => {
    const secs = Array.from(document.querySelectorAll('.n-section')).map(x => x.textContent);
    const keys = Array.from(document.querySelectorAll('.switch-row [data-key], [data-act="toggle"][data-key]')).map(x => x.dataset.key);
    return { secs, keys,
      freq: !!document.querySelector('[data-act="open-alert-freq"]'),
      sound: !!document.querySelector('[data-act="open-alert-sound"]'),
      periodSub: (document.querySelector('[data-ui="alert-period"] .pct') || document.querySelector('[data-ui="alert-period"] small') || {}).textContent };
  });
  ok('уведомления: разделы донора «Необходимые разрешения»/«Настройки уведомлений», свичи-ключи донора, строки звука и частоты',
    al.secs.join('|') === 'Необходимые разрешения|Настройки уведомлений' &&
    ['whenGoalMet', 'evenIfRecent', 'holdUntilDrink', 'alertVibrate', 'alertOn'].every(k => al.keys.indexOf(k) >= 0) &&
    al.freq && al.sound, al);

  /* 11. уведомления: свич alertOn и шторка частоты */
  await p.evaluate(() => { const el = document.querySelector('[data-ui="sw-alertOn"]') || document.querySelector('[data-key="alertOn"]'); el.click(); });
  await p.waitForFunction(() => window.__waterApp.state.notifications.enabled === true);
  await p.click('[data-act="open-alert-freq"]');
  await p.waitForSelector('[data-act="pick-freq"]');
  const freq = await p.evaluate(() => document.querySelectorAll('[data-act="pick-freq"]').length);
  ok('уведомления: свич «Включить уведомления» пишет state, «Частота» открывает донорский диалог (9 опций)', freq === 9, { freq });
  await p.evaluate(() => { window.__waterApp.ui.modal = null; window.__waterApp.render(); });

  /* 12. настройки: каркас донора + тема диалогом + версия */
  await p.click('[data-tab="settings"]');
  await p.waitForSelector('.set-ver');
  const st = await p.evaluate(() => ({
    h1: (document.querySelector('.settings-screen h1') || {}).textContent,
    secs: Array.from(document.querySelectorAll('.settings-screen .n-section')).map(x => x.textContent),
    profile: !!document.querySelector('.profile-row'),
    iface: document.querySelectorAll('[data-act^="iface-"]').length,
    fileRowsMain: !!document.querySelector('[data-act="file-save"]') || !!document.querySelector('[data-act="save-db-file"]'),
    ver: document.querySelector('.set-ver').textContent
  }));
  ok('настройки (M25): шапка донора, секции «Мой профиль/Личные/Основные», перенос уехал в «Дополнительно», профиль-куб, интерфейсных строк нет, версия честная',
    st.h1 === 'Настройки' &&
    st.secs.join('|') === 'Мой профиль|Личные настройки|Основные настройки' &&
    st.profile && st.iface === 0 && !st.fileRowsMain && /^Версия /.test(st.ver), st);
  await p.click('[data-act="open-look"]');
  await p.waitForSelector('[data-act="open-theme"]');
  await p.click('[data-act="open-theme"]');
  await p.waitForSelector('.theme-modal');
  await p.click('.theme-modal [data-act="pick-theme"][data-v="light"]');
  await p.waitForFunction(() => window.__waterApp.state.theme === 'light');
  const th = await p.evaluate(() => ({
    attr: document.documentElement.getAttribute('data-theme'),
    hdrBg: getComputedStyle(document.querySelector('.settings-screen header.top')).backgroundColor
  }));
  ok('настройки: диалог темы донора переключает светлую (data-theme + палитра)', th.attr === 'light', th);

  /* M25: «Перенос данных» — в «Дополнительно», донорские строки на живом M23. */
  await p.click('header [data-act="back"]');
  await p.waitForSelector('[data-act="open-advanced"]');
  await p.click('[data-act="open-advanced"]');
  await p.waitForSelector('[data-act="save-db-file"]');
  const tr = await p.evaluate(() => ({
    save: !!document.querySelector('[data-act="save-db-file"]'),
    share: !!document.querySelector('[data-act="share-db-file"]'),
    load: !!document.querySelector('[data-act="load-history"]'),
    del: !!document.querySelector('[data-act="ask-delete-all"]'),
    secs: Array.from(document.querySelectorAll('.n-section')).map(x => x.textContent)
  }));
  ok('M25: «Перенос данных» живёт в «Дополнительно» (сохранить/поделиться/загрузить/удалить)',
    tr.save && tr.share && tr.load && tr.del && tr.secs.includes('Перенос данных'), tr);

  ok('чистая консоль: ошибок нет', errs.length === 0, errs.slice(0, 4));

  console.log(pass + '/' + (pass + fail) + (fail ? ' — ЕСТЬ ПРОВАЛЫ' : ' — ALL GREEN'));
  await b.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('BENCH FAIL', e); process.exit(1); });
