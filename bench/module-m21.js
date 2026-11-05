/* Стенд M21: композитор против живого донора (v159-фикс) на одной фикстуре +
   потоки нового дома (выпил/отмена/ярлык/лента/правка/удаление/напоминания/
   тема/вход M18/онбординг). Снимки — bench/shots/m21-*.png (глаз владельца). */
const { chromium } = require('/home/user/pw/node_modules/playwright');
const fs = require('fs');
let fails = 0;
const ok = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); if (!c) fails++; };
const pad2 = n => (n < 10 ? '0' : '') + n;
const d = new Date();
const TODAY = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const Y1 = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(Math.max(1, d.getDate() - 1));
const Y2 = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(Math.max(1, d.getDate() - 2));

function fixture() {
  return {
    goalMl: 1947, gender: 'male', weightKg: 59.1, animation: false, theme: 'dark',
    dayStart: '02:00', onboarded: 1, historyDismissed: 1, alertPermAsked: 1,
    profile: { drinkId: 'water', volume: 250 },
    drinks: [
      { id: 'water', name: 'Вода', hydration: 100, icon: 'drop', color: '#4aa3e8' },
      { id: 'black-tea', name: 'Чёрный чай', hydration: 90, icon: 'cup', color: '#c08e69' },
      { id: 'espresso', name: 'Эспрессо', hydration: 70, icon: 'takeaway', color: '#8b5a2b' }
    ],
    entries: [
      { id: 'e1', date: Y2, time: '08:00', drinkId: 'water', name: 'Вода', icon: 'drop', color: '#4aa3e8', hydration: 100, volume: 200, credited: 200, createdAt: 1 },
      { id: 'e2', date: Y1, time: '09:10', drinkId: 'water', name: 'Вода', icon: 'drop', color: '#4aa3e8', hydration: 100, volume: 250, credited: 250, createdAt: 2 },
      { id: 'e3', date: Y1, time: '12:30', drinkId: 'black-tea', name: 'Чёрный чай', icon: 'cup', color: '#c08e69', hydration: 90, volume: 300, credited: 270, createdAt: 3 },
      { id: 'e4', date: TODAY, time: '09:00', drinkId: 'water', name: 'Вода', icon: 'drop', color: '#4aa3e8', hydration: 100, volume: 250, credited: 250, createdAt: 4 },
      { id: 'e5', date: TODAY, time: '11:00', drinkId: 'water', name: 'Вода', icon: 'drop', color: '#4aa3e8', hydration: 100, volume: 250, credited: 250, createdAt: 5 },
      { id: 'e6', date: TODAY, time: '11:00', drinkId: 'water', name: 'Вода', icon: 'drop', color: '#4aa3e8', hydration: 100, volume: 250, credited: 250, createdAt: 6 },
      { id: 'e7', date: TODAY, time: '13:20', drinkId: 'espresso', name: 'Эспрессо', icon: 'takeaway', color: '#8b5a2b', hydration: 70, volume: 350, credited: 245, createdAt: 7 }
    ],
    notifications: { enabled: true, from: '06:00', to: '22:00', everyMin: 120, whenGoalMet: false, evenIfRecent: true, afterWakeMin: 60, beforeSleepMin: 60, holdUntilDrink: true, sound: 'standart_sound.mp3', days: [
      { wake: '05:00', sleep: '23:00' }, { wake: '05:00', sleep: '23:00' }, { wake: '05:00', sleep: '23:00' },
      { wake: '05:00', sleep: '23:00' }, { wake: '05:00', sleep: '23:00' }, { wake: '07:00', sleep: '23:00' }, { wake: '08:00', sleep: '23:00' }
    ] }
  };
}
const STORE = JSON.stringify(fixture());
const seed = `localStorage.setItem('cup-tracker-v1', ${JSON.stringify(STORE)});`;

const homeNums = () => {
  const lbl = document.querySelector('.progress .label');
  const fill = document.querySelector('.progress .fill');
  const cuts = Array.from(document.querySelectorAll('.home-dock .shortcut')).map(b => b.dataset.id + ':' + b.dataset.volume);
  return { label: lbl ? lbl.textContent : null, fill: fill ? fill.style.width : null, cuts: cuts };
};
const histNums = () => {
  const rows = Array.from(document.querySelectorAll('.hist-list .swipe')).map(r => {
    const t = r.querySelector('.htime'), n = r.querySelector('.hname'), v = r.querySelector('.hvol'), c = r.querySelector('.hcred span');
    return [t && t.textContent, n && n.textContent, v && v.textContent, c && c.textContent, !!r.querySelector('.dupe-tag')].join('|');
  });
  const date = document.querySelector('.hist-date');
  return { rows: rows, date: date ? date.textContent.trim() : null, cols: document.querySelectorAll('.chart-row .col').length };
};

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 } });
  await ctx.addInitScript(seed);
  fs.mkdirSync(__dirname + '/shots', { recursive: true });

  /* --- донор --- */
  const pd = await ctx.newPage();
  await pd.goto('http://127.0.0.1:8085/water-tracker/index.html');
  await pd.waitForFunction(() => document.querySelector('.progress .label'));
  const donorHome = await pd.evaluate(homeNums);
  await pd.click('[data-tab="history"]');
  await pd.waitForSelector('.hist-list');
  const donorHist = await pd.evaluate(histNums);
  await pd.close();

  /* --- следующий --- */
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:8085/wt2/index.html');
  await p.waitForFunction(() => window.__waterApp && document.querySelector('.progress .label'));
  const nextHome = await p.evaluate(homeNums);
  await p.screenshot({ path: __dirname + '/shots/m21-home.png' });
  await p.click('[data-tab="history"]');
  await p.waitForSelector('.hist-list');
  const nextHist = await p.evaluate(histNums);
  await p.screenshot({ path: __dirname + '/shots/m21-history.png' });

  ok('гейт донор==следующий: полоса и ярлыки главной', JSON.stringify(donorHome) === JSON.stringify(nextHome), { donorHome, nextHome });
  ok('гейт донор==следующий: лента истории (строки, дубли, дата, столбцы)', JSON.stringify(donorHist) === JSON.stringify(nextHist), { donorHist, nextHist });

  /* --- посадочные места дока: центры узлов и высота сцены донор==следующий --- */
  const seatProbe = () => {
    const c = sel => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; };
    const st = document.querySelector('.cat-stage').getBoundingClientRect();
    return {
      undo: c('[data-act="undo"]'), drink: c('.drink-now'),
      pill: c('.pill-slot .pill'), stage: [Math.round(st.height), Math.round(st.top)],
      stats: !!document.querySelector('.home-stats'), chart: !!document.querySelector('.home-screen .chart-panel'),
      hint: (document.querySelector('.dock-hint') || {}).textContent || null
    };
  };
  const pn = await ctx.newPage();
  await pn.goto('http://127.0.0.1:8085/wt2/index.html');
  await pn.waitForFunction(() => window.__waterApp && document.querySelector('.progress .label'));
  const nextSeats = await pn.evaluate(seatProbe);
  await pn.close();
  const pdd = await ctx.newPage();
  await pdd.goto('http://127.0.0.1:8085/water-tracker/index.html');
  await pdd.waitForFunction(() => document.querySelector('.progress .label'));
  const donorSeats = await pdd.evaluate(seatProbe);
  await pdd.close();
  ok('места дока: центры узлов и сцена донор==следующий, статистики/графика на главной нет',
    JSON.stringify(donorSeats.undo) === JSON.stringify(nextSeats.undo) &&
    JSON.stringify(donorSeats.drink) === JSON.stringify(nextSeats.drink) &&
    JSON.stringify(donorSeats.pill) === JSON.stringify(nextSeats.pill) &&
    JSON.stringify(donorSeats.stage) === JSON.stringify(nextSeats.stage) &&
    nextSeats.stats === false && nextSeats.chart === false && donorSeats.hint === nextSeats.hint,
    { donorSeats, nextSeats });

  /* --- правило пилюли: значок в центре левой окружности (слово 05.11) --- */
  await p.click('[data-tab="home"]');
  await p.waitForSelector('.home-dock .pill');
  const pillRule = await p.evaluate(() => {
    const pill = document.querySelector('.home-dock .pill');
    const ico = pill.querySelector('.ui-mask');
    const pr = pill.getBoundingClientRect(), ir = ico.getBoundingClientRect();
    const cs = getComputedStyle(ico);
    return { circle: [Math.round(pr.x + pr.height / 2), Math.round(pr.y + pr.height / 2)],
      ico: [Math.round(ir.x + ir.width / 2), Math.round(ir.y + ir.height / 2)],
      face: [Math.round(ir.width), Math.round(ir.height)], pos: cs.position };
  });
  ok('правило пилюли: значок 28px абсолютно в центре левой окружности',
    Math.abs(pillRule.circle[0] - pillRule.ico[0]) <= 1 && Math.abs(pillRule.circle[1] - pillRule.ico[1]) <= 1 &&
    pillRule.face[0] === 28 && pillRule.pos === 'absolute', pillRule);
  const pillLight = await p.evaluate(() => {
    document.querySelector('[data-tab="settings"]').click();
    document.querySelector('[data-act="pick-theme"][data-v="light"]').click();
    document.querySelector('[data-tab="home"]').click();
    const ico = document.querySelector('.home-dock .pill .ui-mask');
    return getComputedStyle(ico).filter;
  });
  ok('правило пилюли: светлая тема отбеливает лицо на голубой пилюле (C-007)', pillLight.indexOf('brightness(0)') === 0, pillLight);
  await p.click('[data-tab="settings"]');
  await p.click('[data-act="pick-theme"][data-v="dark"]');

  /* --- поток «выпил» --- */
  await p.click('[data-tab="home"]');
  const before = await p.evaluate(() => window.__waterApp.state.entries.length);
  await p.click('.cat-btn');
  await p.waitForFunction(n => window.__waterApp.state.entries.length === n, before + 1);
  const drank = await p.evaluate(() => {
    const st = window.__waterApp.state;
    const e = st.entries[st.entries.length - 1];
    const toast = document.querySelector('.toast');
    return { vol: e.volume, credited: e.credited, name: e.name, toast: toast ? toast.textContent : '', label: document.querySelector('.progress .label').textContent };
  });
  ok('поток «выпил»: порция 250 мл, credited один раз, тост донорский, полоса выросла',
    drank.vol === 250 && drank.credited === 250 && drank.toast.indexOf('Записано: Вода 250 мл') === 0 && drank.label === '1350/1950', drank);

  /* --- отмена --- */
  await p.click('[data-act="undo"]');
  await p.waitForFunction(n => window.__waterApp.state.entries.length === n, before);
  const undo = await p.evaluate(() => {
    const st = window.__waterApp.state;
    const tombs = window.WT2J.tombMap(st, 'e');
    const toast = document.querySelector('.toast');
    return { n: st.entries.length, tombs: Object.keys(tombs).length, toast: toast ? toast.textContent : '' };
  });
  ok('отмена: запись ушла, надгробие встало (C-002), тост донорский', undo.n === before && undo.tombs >= 1 && undo.toast.indexOf('Отменено: Вода 250 мл') === 0, undo);

  /* --- ярлык: выбор без записи --- */
  const sc = await p.evaluate(() => {
    const btn = document.querySelector('.home-dock .shortcut');
    if (!btn) return null;
    btn.click();
    const st = window.__waterApp.state;
    const toast = document.querySelector('.toast');
    return { id: st.profile.drinkId, vol: st.profile.volume, n: st.entries.length, toast: toast ? toast.textContent : '' };
  });
  ok('ярлык: пара выбрана, кот ещё не записал', sc && sc.toast.indexOf('Кот ещё не записал') > 0 && sc.n === before, sc);

  /* --- лента: правка и удаление --- */
  await p.click('[data-tab="history"]');
  await p.waitForSelector('.hist-list .swipe');
  const edit = await p.evaluate(() => {
    const app = window.__waterApp;
    const id = app.state.entries[app.state.entries.length - 1].id;
    document.querySelector('[data-sid="e-' + id + '"] .swipe-actions button[data-act="edit-entry"]').click();
    const sheetOpen = app.ui.sheet === 'entry-edit';
    document.querySelector('[data-act="edit-vol-chip"][data-v="300"]').click();
    document.querySelector('[data-act="commit-edit"]').click();
    const e = app.state.entries.filter(x => x.id === id)[0];
    return { sheetOpen: sheetOpen, vol: e ? e.volume : null, credited: e ? e.credited : null, touched: !!(e && e.updatedAt) };
  });
  ok('правка записи: шторка, чип 300 мл, credited пересчитан, updatedAt', edit.sheetOpen && edit.vol === 300 && edit.credited === 210 && edit.touched, edit);
  const del = await p.evaluate(() => {
    const app = window.__waterApp;
    const n0 = app.state.entries.length;
    document.querySelector('.swipe-actions button[data-act="del-entry"]').click();
    const tombs = Object.keys(window.WT2J.tombMap(app.state, 'e')).length;
    const toast = document.querySelector('.toast');
    return { gone: app.state.entries.length === n0 - 1, tombs: tombs, toast: toast ? toast.textContent : '' };
  });
  ok('удаление: только через могилу (C-002), тост «Запись удалена»', del.gone && del.tombs >= 2 && del.toast.indexOf('Запись удалена') === 0, del);

  /* --- напоминания --- */
  await p.click('[data-tab="alerts"]');
  await p.waitForSelector('.alerts-screen');
  await p.screenshot({ path: __dirname + '/shots/m21-alerts.png' });
  const alerts = await p.evaluate(() => {
    const app = window.__waterApp;
    document.querySelector('[data-key="alerts-enabled"]').click();
    const off = app.state.notifications.enabled;
    document.querySelector('[data-key="alerts-enabled"]').click();
    const on = app.state.notifications.enabled;
    document.querySelector('[data-act="alert-period"]').click();
    const sheet = app.ui.sheet;
    document.querySelector('[data-act="pick-period"][data-v="90"]').click();
    const every = app.state.notifications.everyMin;
    document.querySelector('[data-act="alert-sound"]').click();
    document.querySelector('[data-act="pick-sound"][data-file="water_sound.mp3"]').click();
    return { off: off, on: on, sheet: sheet, every: every, sound: app.state.notifications.sound, sheetClosed: app.ui.sheet === null };
  });
  ok('напоминания: тумблер, интервал 90, звук — всё в state, шторки закрываются', alerts.off === false && alerts.on === true && alerts.sheet === 'alert-period' && alerts.every === 90 && alerts.sound === 'water_sound.mp3' && alerts.sheetClosed, alerts);

  /* --- настройки: тема и вход M18 --- */
  await p.click('[data-tab="settings"]');
  await p.waitForSelector('.settings-screen');
  await p.screenshot({ path: __dirname + '/shots/m21-settings.png' });
  const theme = await p.evaluate(() => {
    const app = window.__waterApp;
    document.querySelector('[data-act="pick-theme"][data-v="light"]').click();
    const light = [app.state.theme, document.documentElement.getAttribute('data-theme')];
    document.querySelector('[data-act="pick-theme"][data-v="dark"]').click();
    return { light: light, dark: [app.state.theme, document.documentElement.getAttribute('data-theme')] };
  });
  ok('тема: light/dark переключают data-theme и state', theme.light[0] === 'light' && theme.light[1] === 'light' && theme.dark[1] === 'dark', theme);
  const ver = await p.evaluate(async () => {
    const el = document.querySelector('.set-ver');
    if (!el) return null;
    for (let i = 0; i < 5; i++) el.click();
    await new Promise(r => setTimeout(r, 600));
    const ov = document.getElementById('wt-diag');
    return { text: el.textContent, overlay: !!ov, head: ov ? ov.textContent.slice(0, 30) : '' };
  });
  ok('версия + пять тапов: отладчик M18 открылся из настоящих настроек', ver && ver.text.indexOf('2.0-next (200)') >= 0 && ver.overlay && ver.head.indexOf('Отладчик') === 0, ver);
  await p.evaluate(() => { const o = document.getElementById('wt-diag'); if (o) o.remove(); });

  /* --- онбординг: свежий старт (C-014) --- */
  const ctx2 = await b.newContext({ viewport: { width: 412, height: 892 } });
  const p2 = await ctx2.newPage();
  await p2.goto('http://127.0.0.1:8085/wt2/index.html');
  await p2.waitForFunction(() => window.__waterApp);
  await p2.screenshot({ path: __dirname + '/shots/m21-onboarding.png' });
  const onb = await p2.evaluate(() => {
    const app = window.__waterApp;
    const screen = !!document.querySelector('.onb');
    document.querySelector('[data-act="onb-gender"][data-v="female"]').click();
    document.querySelector('[data-act="onb-weight"]').click();
    document.querySelector('[data-act="onb-kg"][data-v="65"]').click();
    document.querySelector('[data-act="onb-done"]').click();
    const st = app.state;
    return { screen: screen, onboarded: !!st.onboarded, gender: st.gender, kg: st.weightKg, goal: st.goalMl, base: window.WT2L.genderBase({ gender: 'female', weightKg: 65 }), home: !!document.querySelector('.home-screen') };
  });
  ok('онбординг: экран, пол/вес, «Начать» → норма по полу и весу, главная', onb.screen && onb.onboarded && onb.gender === 'female' && onb.kg === 65 && onb.goal === onb.base && onb.home, onb);

  ok('без pageerror', errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log(fails ? 'BENCH M21: FAILS=' + fails : 'BENCH M21: ALL GREEN');
  process.exit(fails ? 1 : 0);
})();
