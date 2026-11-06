/* Стенд M22 — история v2 (лента капсул: пять в кадре А–Е, прокрутка с упором
   в первый столбец; канон второстепенных экранов) и экран
   веса тем же скелетом (макеты hist-layout v2 / weight-layout v1, слово 05.11). */
const { chromium } = require('/home/user/pw/node_modules/playwright');
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('PASS ' + name + (extra != null ? ' :: ' + JSON.stringify(extra) : '')); }
  else { fail++; console.log('FAIL ' + name + (extra != null ? ' :: ' + JSON.stringify(extra) : '')); }
}
const TODAY = '2026-11-05';
const FIX = JSON.stringify({
  goalMl: 1950, gender: 'male', weightKg: 59.1, theme: 'dark', dayStart: '02:00',
  onboarded: 1, historyDismissed: 1, alertPermAsked: 1, profile: { drinkId: 'water', volume: 350 },
  drinks: [{ id: 'water', name: 'Вода', hydration: 100, icon: 'drop', color: '#4aa3e8' }, { id: 'espresso', name: 'Эспрессо', hydration: 70, icon: 'takeaway', color: '#8b5a2b' }],
  entries: [
    { id: 'e0', date: '2026-10-27', time: '09:00', drinkId: 'water', name: 'Вода', icon: 'drop', color: '#4aa3e8', hydration: 100, volume: 300, credited: 300, createdAt: 0 },
    { id: 'e1', date: '2026-11-05', time: '05:01', drinkId: 'water', name: 'Вода', icon: 'drop', color: '#4aa3e8', hydration: 100, volume: 200, credited: 200, createdAt: 1 },
    { id: 'e2', date: '2026-11-04', time: '09:00', drinkId: 'espresso', name: 'Эспрессо', icon: 'takeaway', color: '#8b5a2b', hydration: 70, volume: 350, credited: 245, createdAt: 2 },
    { id: 'e3', date: '2026-11-03', time: '09:00', drinkId: 'water', name: 'Вода', icon: 'drop', color: '#4aa3e8', hydration: 100, volume: 2400, credited: 2400, createdAt: 3 }
  ],
  weights: [
    { id: 'w1', date: '2026-03-01', kg: 57.8, createdAt: 1 },
    { id: 'w2', date: '2026-07-01', kg: 59.1, createdAt: 2 },
    { id: 'w3', date: '2026-10-01', kg: 59.0, createdAt: 3 }
  ],
  notifications: { enabled: false, everyMin: 120, days: [] }
});
const near = (a, b) => Math.abs(a - b) <= 1;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 } });
  const errs = [];
  await ctx.addInitScript(`localStorage.setItem('cup-tracker-v1', JSON.stringify(${FIX}));`);
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8085/wt2/index.html');
  await p.waitForFunction(() => window.__waterApp);

  /* 1. история: канон линий и капсулы */
  await p.click('[data-tab="history"]');
  await p.waitForSelector('.wt-caps .wt-cap-col');
  const hist = await p.evaluate(() => {
    const q = s => document.querySelector(s).getBoundingClientRect();
    const head = q('.hist-screen > header');
    const sub = q('.hist-head');
    const row = q('.hist-list .swipe');
    const fab = q('.fab');
    const box = document.querySelector('.wt-caps');
    const cols = Array.from(document.querySelectorAll('.wt-caps .wt-cap-col'));
    const lastCap = cols[cols.length - 1].querySelector('.wt-cap');
    const pill = { height: 0 };  /* пилюлю истории заменила стрелка (слово 06.11) */
    const ico = cols[0].getBoundingClientRect().width;  /* --ico отдаёт calc() сырьём */
    const boxR = box.getBoundingClientRect();
    const vis = cols.filter(c => { const r = c.getBoundingClientRect(); return r.left >= boxR.left - 1 && r.right <= boxR.right + 1; });
    return { headAxis: head.top + head.height / 2, subTop: sub.top, rowTop: row.top, rowH: row.height,
      fabC: fab.top + fab.height / 2, n: cols.length, visN: vis.length,
      capW: lastCap.getBoundingClientRect().width, capR: getComputedStyle(lastCap).borderRadius,
      colW: cols[0].getBoundingClientRect().width,
      centers: vis.map(c => { const r = c.getBoundingClientRect(); return Math.round(r.left + r.width / 2); }),
      scrollable: box.scrollWidth > box.clientWidth, atRight: box.scrollLeft >= box.scrollWidth - box.clientWidth - 1,
      ico: ico, expCenters: [0, 1, 2, 3, 4].map(i => Math.round((412 - 5 * ico) / 2 + ico * (i + 0.5))),
      arrow: !!document.querySelector('.hist-screen > header.top .icon-btn.right'),
      pill: !!document.querySelector('.hist-screen > header.top .head-pill'),
      h1fs: parseFloat(getComputedStyle(document.querySelector('.hist-screen > header.top h1')).fontSize),
      h1x: Math.round(document.querySelector('.hist-screen > header.top h1').getBoundingClientRect().left),
      hdrBg: getComputedStyle(document.querySelector('.hist-screen > header.top')).backgroundColor,
      trackBg: getComputedStyle(document.querySelector('.hist-screen')).backgroundColor || '',
      pillH: pill.height, on: cols[cols.length - 1].className.indexOf('on') >= 0 };
  });
  ok('история: канон линий (Ж 44, И1 314, И 362, строка 48, FAB на М) + пять колонок шириной с круглую кнопку главного (--ico), центрированы в кадре, капсула 44 R22, лента длиннее кадра и стоит у правого края',
    near(hist.headAxis, 44) && near(hist.subTop, 314) && near(hist.rowTop, 362) && near(hist.rowH, 48) && near(hist.fabC, 784.6) &&
    hist.visN === 5 && hist.centers.join(',') === hist.expCenters.join(',') && near(hist.colW, hist.ico) &&
    near(hist.capW, 44) && String(hist.capR).startsWith('22px') && hist.scrollable && hist.atRight && hist.on &&
    hist.arrow && !hist.pill && hist.h1fs === 20 && hist.h1x <= 17, hist);

  /* 1b. прокрутка ленты: упор влево — первый столбец, не далее */
  const scr = await p.evaluate(async () => {
    const box = document.querySelector('.wt-caps');
    const ico2 = document.querySelector('.wt-caps .wt-cap-col').getBoundingClientRect().width;
    const firstExp = Math.round((412 - 5 * ico2) / 2 + ico2 / 2);  /* центр первой колонки окна */
    const firstC = () => { const r = document.querySelector('.wt-caps .wt-cap-col').getBoundingClientRect(); return Math.round(r.left + r.width / 2); };
    box.scrollLeft = 0; await new Promise(r => setTimeout(r, 60));
    const c0 = firstC();
    box.scrollLeft = -300; await new Promise(r => setTimeout(r, 60));
    const clamped = box.scrollLeft === 0 && firstC() === firstExp;
    box.scrollLeft = box.scrollWidth; await new Promise(r => setTimeout(r, 60));
    return { c0, clamped, firstExp, backRight: box.scrollLeft >= box.scrollWidth - box.clientWidth - 1 };
  });
  ok('прокрутка: влево упор в первый столбец, отрицательный скролл не проходит, возврат к правому краю',
    scr.c0 === scr.firstExp && scr.clamped && scr.backRight, scr);

  /* 2. стрелка в шапке истории ведёт на экран объёмов (слово 06.11) */
  await p.click('.hist-screen > header.top .icon-btn.right');
  await p.waitForFunction(() => window.__waterApp.ui.page === 'volumes');
  ok('история: пилюля «Объёмы» открывает экран объёмов', true);
  await p.click('[data-tab="history"]');

  /* 3. FAB истории: шторка добавления, запись встаёт в ленту */
  const before = await p.evaluate(() => window.__waterApp.state.entries.length);
  await p.click('.fab');
  await p.waitForSelector('[data-act="add-entry-save"]');
  await p.click('[data-act="add-vol-chip"][data-v="250"]');
  await p.click('[data-act="add-entry-save"]');
  await p.waitForFunction(n => window.__waterApp.state.entries.length === n, before + 1);
  const added = await p.evaluate(() => {
    const e = window.__waterApp.state.entries[window.__waterApp.state.entries.length - 1];
    return { vol: e.volume, drink: e.drinkId, toast: (document.querySelector('.toast') || {}).textContent };
  });
  ok('история: FAB на М добавляет запись через шторку (напиток+объём), тост донорский',
    added.vol === 250 && added.drink === 'water' && /Записано/.test(added.toast || ''), added);

  /* 4. колонка-капсула выбирает день ленты */
  await p.click('.wt-caps .wt-cap-col[data-v="2026-11-03"]');
  await p.waitForTimeout(200);
  const sel = await p.evaluate(() => ({ date: window.__waterApp.ui.historyDate, head: document.querySelector('.hist-head .hist-date').textContent }));
  ok('история: тап по капсуле выбирает день ленты', sel.date === '2026-11-03' && sel.head === '03.11.2026', sel);

  /* 5. вес: канон линий, строки, текущий вес, график */
  await p.click('[data-tab="weight"]');
  await p.waitForSelector('.wt-wgraph svg');
  const w = await p.evaluate(() => {
    const q = s => document.querySelector(s).getBoundingClientRect();
    const head = q('.weight-screen > header');
    const sub = q('.weight-screen .hist-head');
    const row = q('.weight-screen .hist-list .swipe');
    const fab = q('.fab');
    return { headAxis: head.top + head.height / 2, subTop: sub.top, rowTop: row.top, rowH: row.height, fabC: fab.top + fab.height / 2,
      cur: document.querySelector('.wt-wcur b').textContent, rows: document.querySelectorAll('.weight-screen .hist-list .swipe').length,
      pts: document.querySelectorAll('.wt-wgraph circle').length, pill: document.querySelector('.weight-screen .head-pill').textContent };
  });
  ok('вес: тот же канон линий (Ж 44, И1 314, И 362, строка 48, FAB на М)',
    near(w.headAxis, 44) && near(w.subTop, 314) && near(w.rowTop, 362) && near(w.rowH, 48) && near(w.fabC, 784.6), w);
  ok('вес: текущий вес, три строки, пилюля МЕСЯЦ; в месячном окне точек нет (записи вне окна)',
    w.cur.indexOf('59.0') === 0 && w.rows === 3 && w.pts === 0 && w.pill === 'МЕСЯЦ', w);

  /* 6. вес: FAB добавляет взвешивание, строка и точка растут */
  await p.click('.fab');
  await p.waitForSelector('[data-act="weight-save"]');
  await p.fill('[data-act="weight-kg"]', '60.2');
  await p.fill('[data-act="weight-date"]', '2026-11-05');
  await p.click('[data-act="weight-save"]');
  await p.waitForFunction(() => (window.__waterApp.state.weights || []).length === 4);
  const w2 = await p.evaluate(() => ({
    rows: document.querySelectorAll('.weight-screen .hist-list .swipe').length,
    cur: document.querySelector('.wt-wcur b').textContent,
    toast: (document.querySelector('.toast') || {}).textContent
  }));
  ok('вес: FAB добавляет взвешивание (кг+дата), текущий вес пересчитан, тост',
    w2.rows === 4 && w2.cur.indexOf('60.2') === 0 && /Вес записан/.test(w2.toast || ''), w2);

  /* 7. вес: правка и удаление через свайп-кубики, могила w держит */
  await p.evaluate(() => document.querySelector('.weight-screen [data-sid="w-w3"] [data-act="edit-weight"]').click());
  await p.waitForSelector('[data-act="weight-save"]');
  await p.fill('[data-act="weight-kg"]', '58.4');
  await p.click('[data-act="weight-save"]');
  await p.waitForTimeout(200);
  const edited = await p.evaluate(() => (window.__waterApp.state.weights || []).filter(x => x.id === 'w3')[0].kg);
  await p.evaluate(() => document.querySelector('.weight-screen [data-sid="w-w2"] [data-act="del-weight"]').click());
  await p.waitForTimeout(200);
  const del = await p.evaluate(() => ({
    tomb: Object.keys(window.__waterApp.state.tombstones.w).length === 1,
    rows: document.querySelectorAll('.weight-screen .hist-list .swipe').length,
    toast: (document.querySelector('.toast') || {}).textContent
  }));
  ok('вес: правка меняет кг, удаление идёт могилой w (C-002) с тостом',
    edited === 58.4 && del.tomb && del.rows === 3 && /удалена/.test(del.toast || ''), { edited, ...del });

  /* 8. период графика: шторка трёх периодов, Неделя перестраивает */
  await p.click('.weight-screen .head-pill');
  await p.waitForSelector('[data-act="weight-range-pick"]');
  await p.click('[data-act="weight-range-pick"][data-v="year"]');
  await p.waitForTimeout(200);
  const yr = await p.evaluate(() => document.querySelectorAll('.wt-wgraph circle').length);
  ok('вес: годовой период показывает все живые точки (после удаления три)', yr === 3, { yr });
  await p.click('.weight-screen .head-pill');
  await p.waitForSelector('[data-act="weight-range-pick"]');
  await p.click('[data-act="weight-range-pick"][data-v="week"]');
  await p.waitForTimeout(200);
  const rng = await p.evaluate(() => ({
    range: window.__waterApp.ui.weightRange,
    pill: document.querySelector('.weight-screen .head-pill').textContent,
    pts: document.querySelectorAll('.wt-wgraph circle').length
  }));
  ok('вес: пилюля периода открывает шторку, Год показывает все точки, Неделя — одну в окне',
    rng.range === 'week' && rng.pill === 'НЕДЕЛЯ' && rng.pts === 1, rng);

  ok('без pageerror', errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log('BENCH M22: ' + (fail ? 'FAILS=' + fail : 'ALL GREEN') + ' (' + pass + '/' + (pass + fail) + ')');
  process.exit(fail ? 1 : 0);
})();
