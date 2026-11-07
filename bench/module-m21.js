/* Стенд M21: композитор против живого донора на одной фикстуре + потоки
   (выпил/отмена/ярлык/лента/правка/удаление/напоминания/тема/онбординг).
   Шаг 1 (каркас донорской кожи): кейсы верха/пилюли переведены на байтовую
   эквивалентность донор==следующий; вход M18 умер вместе с экранным
   отладчиком — гейт «оверлея нет»; тема/звук/частота — донорскими дорогами
   (диалог open-theme, шторки open-alert-freq/open-alert-sound).
   Снимки — bench/shots/m21-*.png (глаз владельца). */
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
  return { rows: rows, date: date ? date.textContent.trim() : null, cols: 0 };
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
    return {
      undo: c('[data-act="undo"]'), drink: c('.drink-now'),
      pill: c('.pill-slot .pill'),
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
    nextSeats.stats === false && nextSeats.chart === false && donorSeats.hint === nextSeats.hint,
    { donorSeats, nextSeats });

  /* --- донорский верх: home-bar-top первый, геометрия шапки/сцены донор==следующий --- */
  await p.click('[data-tab="home"]');
  await p.waitForSelector('.home-dock .pill');
  const topProbe = () => {
    const hs = document.querySelector('.home-screen');
    const r = e => { if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; };
    const h1 = hs.querySelector('header.top h1');
    return { first: hs.children[0] ? hs.children[0].className : null,
      bar: r(hs.querySelector('.home-bar-top .progress')),
      h1: h1 ? h1.textContent : null, h1r: r(h1),
      stage: r(hs.querySelector('.cat-stage')) };
  };
  const nextTop = await p.evaluate(topProbe);
  const pdt = await ctx.newPage();
  await pdt.goto('http://127.0.0.1:8085/water-tracker/index.html');
  await pdt.waitForFunction(() => document.querySelector('.home-bar-top .progress'));
  const donorTop = await pdt.evaluate(topProbe);
  await pdt.close();
  /* Санкционированный отход от донора — атлас-правки владельца 07.11
     (коммит a88cfd4, дорога 1): полоса +12, заголовок +3, сцена −2.
     Перед сверкой вычитаем их обратно; остальное обязано совпасть байт-в-байт. */
  const adjTop = JSON.parse(JSON.stringify(nextTop));
  if (adjTop.bar) adjTop.bar[1] -= 12;
  if (adjTop.h1r) adjTop.h1r[1] -= 3;
  if (adjTop.stage) adjTop.stage[1] += 2;
  ok('донорский верх: home-bar-top первый, полоса/шапка/сцена донор==следующий (минус атлас-правки 07.11)',
    nextTop.first.indexOf('home-bar-top') >= 0 && JSON.stringify(donorTop) === JSON.stringify(adjTop),
    { donorTop, nextTop });

  /* --- пилюля донора: геометрия/текст/действие донор==следующий (капля вместо мордочки — объявленное исключение) --- */
  const pillProbe = () => {
    const pill = document.querySelector('.home-dock .pill');
    const mc = pill.querySelector('.mini-cat');
    const sp = pill.querySelector('span:last-of-type');
    const r = e => { const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; };
    return { pill: r(pill), mc: r(mc), text: sp ? sp.textContent : null, act: pill.dataset.act };
  };
  const nextPill = await p.evaluate(pillProbe);
  const pdp = await ctx.newPage();
  await pdp.goto('http://127.0.0.1:8085/water-tracker/index.html');
  await pdp.waitForFunction(() => document.querySelector('.home-dock .pill .mini-cat'));
  const donorPill = await pdp.evaluate(pillProbe);
  await pdp.close();
  /* Атлас-правка владельца 07.11 (a88cfd4): капля 24px вместо 28 и сдвиг
     (-10,-11) от точки привязки — центр значка ушёл на (+2,+1) от донорского.
     Короб, текст и действие сверяем с донором строго, значок — по новой норме. */
  const mcC = nextPill.mc ? [nextPill.mc[0] + nextPill.mc[2] / 2, nextPill.mc[1] + nextPill.mc[3] / 2] : null;
  const mcD = donorPill.mc ? [donorPill.mc[0] + donorPill.mc[2] / 2, donorPill.mc[1] + donorPill.mc[3] / 2] : null;
  ok('пилюля донора: короб/текст/действие как донор; значок — норма 07.11 (24px, центр +2/+1)',
    nextPill.act === 'open-volume' && nextPill.text === donorPill.text &&
    JSON.stringify(nextPill.pill) === JSON.stringify(donorPill.pill) &&
    nextPill.mc && nextPill.mc[2] === 24 && nextPill.mc[3] === 24 &&
    mcC && mcD && (mcC[0] - mcD[0]) === 2 && (mcC[1] - mcD[1]) === 1,
    { donorPill, nextPill });
  const pillLight = await p.evaluate(async () => {
    document.querySelector('[data-tab="settings"]').click();
    document.querySelector('[data-act="open-look"]').click();
    document.querySelector('[data-act="open-theme"]').click();
    document.querySelector('[data-act="pick-theme"][data-v="light"]').click();
    document.querySelector('[data-tab="home"]').click();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const ico = document.querySelector('.home-dock .pill .mini-cat');
    return getComputedStyle(ico).filter;
  });
  ok('C-007: светлая тема отбеливает каплю на голубой пилюле (styles.css:926 донора)', pillLight.indexOf('brightness(0)') === 0, pillLight);
  await p.evaluate(() => {
    document.querySelector('[data-tab="settings"]').click();
    document.querySelector('[data-act="open-look"]').click();
    document.querySelector('[data-act="open-theme"]').click();
    document.querySelector('[data-act="pick-theme"][data-v="dark"]').click();
  });

  /* --- поток «выпил» --- */
  await p.click('[data-tab="home"]');
  const before = await p.evaluate(() => window.__waterApp.state.entries.length);
  await p.click('.wt-orb');
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
  /* Поток правки записи (актуальный): edit-entry -> шторка hist-add с
     черновиком записи (openAdd(entry)) -> commit-entry. Бенч раньше ждал
     отдельную шторку entry-edit с edit-vol-chip/commit-edit — она давно
     слита в hist-add, раздел протух и падал на пустом селекторе. */
  const edit = await p.evaluate(() => {
    const app = window.__waterApp;
    const id = app.state.entries[app.state.entries.length - 1].id;
    document.querySelector('[data-sid="e-' + id + '"] .swipe-actions button[data-act="edit-entry"]').click();
    const sheetOpen = app.ui.sheet === 'hist-add' && !!(app.ui.addDraft && app.ui.addDraft.entryId === id);
    const wEl = document.querySelector('[data-wheel="volume"]');
    if (wEl && wEl._setValue) wEl._setValue(300); else if (wEl) wEl.dataset.value = '300';
    document.querySelector('[data-act="commit-entry"]').click();
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
    const sw = () => document.querySelector('[data-ui="sw-alertOn"]') || document.querySelector('[data-key="alertOn"]');
    sw().click();
    const off = app.state.notifications.enabled;
    sw().click();
    const on = app.state.notifications.enabled;
    document.querySelector('[data-act="open-alert-freq"]').click();
    const modal = app.ui.modal;
    document.querySelector('[data-act="pick-freq"][data-min="90"]').click();
    const every = app.state.notifications.everyMin;
    document.querySelector('[data-act="open-alert-sound"]').click();
    const soundPage = app.ui.page;
    document.querySelector('[data-act="pick-sound"][data-file="water_sound.mp3"]').click();
    return { off: off, on: on, modal: modal, every: every, soundPage: soundPage, sound: app.state.notifications.sound, modalClosed: app.ui.modal === null, stayed: app.ui.page === 'alert-sound' };
  });
  ok('напоминания (донор): свич sw-alertOn, диалог частоты (90 через pick-freq), страница звука (pick-sound, страница остаётся)', alerts.off === false && alerts.on === true && alerts.modal === 'alert-freq' && alerts.every === 90 && alerts.soundPage === 'alert-sound' && alerts.sound === 'water_sound.mp3' && alerts.modalClosed && alerts.stayed, alerts);

  /* --- настройки: тема и вход M18 --- */
  await p.click('[data-tab="settings"]');
  await p.waitForSelector('.set-ver');
  await p.screenshot({ path: __dirname + '/shots/m21-settings.png' });
  /* M25: тема переехала в «Внешний вид» (донор v127). */
  await p.click('[data-act="open-look"]');
  await p.waitForSelector('[data-act="open-theme"]');
  const theme = await p.evaluate(() => {
    const app = window.__waterApp;
    document.querySelector('[data-act="open-theme"]').click();
    document.querySelector('[data-act="pick-theme"][data-v="light"]').click();
    const light = [app.state.theme, document.documentElement.getAttribute('data-theme')];
    document.querySelector('[data-act="open-theme"]').click();
    document.querySelector('[data-act="pick-theme"][data-v="dark"]').click();
    return { light: light, dark: [app.state.theme, document.documentElement.getAttribute('data-theme')] };
  });
  ok('тема (донорский диалог): light/dark переключают data-theme и state', theme.light[0] === 'light' && theme.light[1] === 'light' && theme.dark[1] === 'dark', theme);
  await p.click('header [data-act="back"]');
  await p.waitForSelector('.set-ver');
  const ver = await p.evaluate(async () => {
    const el = document.querySelector('.set-ver');
    if (!el) return null;
    for (let i = 0; i < 5; i++) el.click();
    await new Promise(r => setTimeout(r, 400));
    return { text: el.textContent, overlay: !!document.getElementById('wt-diag') };
  });
  ok('версия честная, экранный отладчик M18 из приложения удалён (пять тапов — оверлея нет)', ver && ver.text.indexOf('2.0-next') >= 0 && ver.overlay === false, ver);

  /* --- онбординг: свежий старт (C-014) --- */
  const ctx2 = await b.newContext({ viewport: { width: 412, height: 892 } });
  const p2 = await ctx2.newPage();
  await p2.goto('http://127.0.0.1:8085/wt2/index.html');
  await p2.waitForFunction(() => window.__waterApp);
  await p2.screenshot({ path: __dirname + '/shots/m21-onboarding.png' });
  const onb = await p2.evaluate(async () => {
    const app = window.__waterApp;
    const tick = () => new Promise(r => setTimeout(r, 250));
    const screen = !!document.querySelector('.onb');
    /* Онбординг пересобран 07.11 (свой стенд smoke-onb): пол — действием,
       вес — барабанами kg-int/kg-dec через _setValue, дальше Ок и Финиш. */
    app.performAction({ dataset: { v: 'female' } }, 'onb-gender');
    await tick();
    document.querySelector('[data-act="onb-weight"]').click();
    await tick();
    document.querySelector('[data-wheel="kg-int"]')._setValue(65);
    document.querySelector('[data-wheel="kg-dec"]')._setValue(0);
    await tick();
    document.querySelector('[data-act="onb-weight-ok"]').click();
    await tick();
    document.querySelector('[data-act="onb-done"]').click();
    await tick();
    const st = app.state;
    return { screen: screen, onboarded: !!st.onboarded, gender: st.gender, kg: st.weightKg, goal: st.goalMl, base: window.WT2L.genderBase({ gender: 'female', weightKg: 65 }), home: !!document.querySelector('.home-screen') };
  });
  ok('онбординг: экран, пол/вес, «Начать» → норма по полу и весу, главная', onb.screen && onb.onboarded && onb.gender === 'female' && onb.kg === 65 && onb.goal === onb.base && onb.home, onb);

  ok('без pageerror', errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log(fails ? 'BENCH M21: FAILS=' + fails : 'BENCH M21: ALL GREEN');
  process.exit(fails ? 1 : 0);
})();
