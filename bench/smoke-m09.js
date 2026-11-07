/* Смоук M09 (облако): подставной транспорт WaterGoogle поверх localStorage.
   Гейты: заглушка без моста, вход/состояние, сохранение копии и подпись,
   диалог «настройки из копии» на облачной и файловой дорогах, «только
   история» не трогает тему, «историю и настройки» применяет тему и lc,
   тишина C-015 при пустом автообмене, консоль чиста. */
const { chromium } = require('/home/user/pw/node_modules/playwright');
const fs = require('fs');

const OWNER = JSON.parse(fs.readFileSync('/home/user/uploads/vodomer-baza-owner.json', 'utf8'));

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
    drinks: OWNER.drinks || [], entries: (OWNER.entries || []).slice(0, 400),
    weights: OWNER.weights || [], dayGoals: OWNER.dayGoals || {},
    tombstones: OWNER.tombstones || { e: {}, w: {} },
    notifications: s.notifications || { enabled: false, everyMin: 120, days: [] },
    cupLabel: s.cupLabel, rowCustom: s.rowCustom, habitAuto: s.habitAuto,
    paceGoals: s.paceGoals, lc: s.lc
  };
}

const FAKE = `
(function () {
  var K = 'm09-fake-wg';
  function load() { try { return JSON.parse(localStorage.getItem(K) || '{"signedIn":false}'); } catch (e) { return { signedIn: false }; } }
  function save(s) { localStorage.setItem(K, JSON.stringify(s)); }
  var st = load();
  window.WaterGoogle = {
    state: function () { return JSON.stringify(st); },
    signIn: function () { st.signedIn = true; st.name = 'Владелец'; st.email = 'owner@example.com'; save(st); window.__googleState(JSON.stringify(st)); },
    signOut: function () { st.signedIn = false; save(st); window.__googleState(JSON.stringify(st)); },
    refreshProfile: function () { window.__googleState(JSON.stringify(st)); },
    fetchPicture: function () {},
    check: function () {},
    backup: function (text) {
      localStorage.setItem(K + '-pack', text);
      st.lastBackup = new Date().toISOString(); save(st);
      window.__googleState(JSON.stringify(st));
      window.__googleCloud(JSON.stringify({ ok: true, action: 'backup', at: st.lastBackup }));
    },
    restore: function () {
      var t = localStorage.getItem(K + '-pack');
      if (!t) { window.__googleCloud(JSON.stringify({ empty: true })); return; }
      window.__googleChunk(0, 1, t);
      window.__googleRestoreDone();
    }
  };
})();
`;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name); }
}

(async () => {
  const b = await chromium.launch();
  const errs = [];

  async function newCtx(theme, withFake) {
    const ctx = await b.newContext({ viewport: { width: 412, height: 892 } });
    await ctx.addInitScript(`localStorage.setItem('cup-tracker-v1', ${JSON.stringify(JSON.stringify(seedState(theme)))});`);
    if (withFake) await ctx.addInitScript(FAKE);
    return ctx;
  }
  async function newPageIn(ctx) {
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && String((m.location() || {}).url || '').indexOf('ui-skin.json') < 0) errs.push('console: ' + m.text()); });
    await p.goto('http://127.0.0.1:8085/wt2/index.html');
    await p.waitForFunction(() => window.__waterApp && window.__waterApp.state, null, { timeout: 15000 });
    return p;
  }
  const act = (p, a) => p.evaluate(x => window.__waterApp.performAction({ dataset: { act: x } }, x), a);
  const toastText = p => p.evaluate(() => {
    const t = document.querySelector('.toast');
    return t ? t.textContent : '';
  });

  /* C1: без моста вход вежливо отклоняется */
  const p0 = await newPageIn(await newCtx('dark', false));
  await act(p0, 'google-signin');
  await p0.waitForTimeout(250);
  ok((await toastText(p0)).indexOf('приложении для Android') >= 0, 'C1 без моста: вход вежливо отклонён');
  await p0.close();

  /* C2-C3: вход и сохранение копии через подставной транспорт */
  const ctxCloud = await newCtx('dark', true);
  const p1 = await newPageIn(ctxCloud);
  await act(p1, 'google-signin');
  await p1.waitForTimeout(400);
  ok(await p1.evaluate(() => !!(window.__waterApp.cloud && window.__waterApp.cloud.signedIn)), 'C2 вход: состояние подписано');
  await p1.click('[data-tab="settings"]');
  await p1.waitForTimeout(300);
  ok(await p1.evaluate(() => !!document.querySelector('[data-act="cloud-sync"]')), 'C2 строка «Синхронизация» видна после входа');
  const lbl0 = await p1.evaluate(() => (document.querySelector('.sync-when') || {}).textContent || '');
  ok(lbl0.indexOf('копии пока нет') >= 0, 'C2 подпись состояния: копии пока нет (' + lbl0 + ')');
  /* переключаем режим цвета, чтобы пак увёз lc */
  await p1.evaluate(() => window.LiquidColor.act('liq-mode', { dataset: { v: 'dominant' } }));
  await p1.waitForTimeout(200);
  await act(p1, 'cloud-save');
  await p1.waitForTimeout(600);
  const saved = await p1.evaluate(() => !!localStorage.getItem('m09-fake-wg-pack'));
  ok(saved, 'C3 копия записана в транспорт');
  const lbl1 = await p1.evaluate(() => (document.querySelector('.sync-when') || {}).textContent || '');
  ok(lbl1.indexOf('сохранено') >= 0, 'C3 подпись: сохранено (' + lbl1 + ')');

  /* C4: второе окно (светлая тема, свой контекст) восстанавливает копию:
     диалог выбора, «только история» тему не трогает */
  const packForP2 = await p1.evaluate(() => localStorage.getItem('m09-fake-wg-pack'));
  const ctx2 = await newCtx('light', true);
  await ctx2.addInitScript(`localStorage.setItem('m09-fake-wg-pack', ${JSON.stringify(packForP2)});
    localStorage.setItem('m09-fake-wg', JSON.stringify({ signedIn: false }));`);
  const p2 = await newPageIn(ctx2);
  await act(p2, 'google-signin');
  await p2.waitForTimeout(300);
  await act(p2, 'cloud-restore');
  await p2.waitForTimeout(700);
  ok(await p2.evaluate(() => !!document.querySelector('[data-act="settings-choice-both"]')), 'C4 диалог выбора настроек показан');
  const dlgTxt = await p2.evaluate(() => (document.querySelector('.modal.n-modal') || document.body).textContent);
  ok(dlgTxt.indexOf('оформление жидкости') >= 0, 'C4 диалог перечисляет состав настроек');
  const boxes = await p2.evaluate(() => {
    const bs = Array.prototype.slice.call(document.querySelectorAll('[data-ui="dialog.settings-choice"] .modal-actions button'));
    return bs.map(function (b) { const r = b.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right, h: r.height }; });
  });
  ok(boxes.length === 2 && boxes[1].t >= boxes[0].b - 1, 'C4 кнопки выбора в две строки, без наслоения');
  await act(p2, 'settings-choice-hist');
  await p2.waitForTimeout(600);
  const themeAfterHist = await p2.evaluate(() => window.__waterApp.state.theme);
  const added = await p2.evaluate(() => (window.__waterApp.state.entries || []).length);
  ok(themeAfterHist === 'light', 'C4 «только историю»: тема не тронута (' + themeAfterHist + ')');
  ok(added > 300, 'C4 история слилась (' + added + ' записей)');

  /* C5: «историю и настройки» применяет тему и lc */
  await act(p2, 'cloud-restore');
  await p2.waitForTimeout(700);
  await act(p2, 'settings-choice-both');
  await p2.waitForTimeout(600);
  const themeAfterBoth = await p2.evaluate(() => window.__waterApp.state.theme);
  const lcMode = await p2.evaluate(() => window.LiquidColor.store().mode);
  ok(themeAfterBoth === 'dark', 'C5 «историю и настройки»: тема применена (' + themeAfterBoth + ')');
  ok(lcMode === 'dominant', 'C5 оформление жидкости приехало (' + lcMode + ')');

  /* C6: тишина C-015 — автообмен без нового не даёт тоста (cloudSay auto->null),
     ручная синхронизация говорит словами «всё совпадает» */
  const sayAuto = await p2.evaluate(() => window.WT2Y.cloudSay('auto', 0, 1234));
  ok(sayAuto === null || sayAuto === '', 'C6 cloudSay auto без нового молчит (' + JSON.stringify(sayAuto) + ')');
  await act(p2, 'cloud-sync');
  await p2.waitForTimeout(900);
  const syncTxt = await toastText(p2);
  ok(syncTxt.indexOf('всё совпадает') >= 0 || syncTxt.indexOf('Синхронизировано') >= 0, 'C6 ручной обмен: слова «всё совпадает» (' + syncTxt + ')');

  /* C7: файловая дорога: пак с настройками спрашивает ДО применения */
  const p3 = await newPageIn(await newCtx('light', false));
  const packText = await p1.evaluate(() => localStorage.getItem('m09-fake-wg-pack'));
  await p3.evaluate(t => window.__wtFileHook(t, null), packText);
  await p3.waitForTimeout(500);
  const dlg3 = await p3.evaluate(() => !!document.querySelector('[data-act="settings-choice-both"]'));
  const seedEntries = await p3.evaluate(() => (window.__waterApp.state.entries || []).length);
  const themeWait = await p3.evaluate(() => window.__waterApp.state.theme);
  ok(dlg3, 'C7 файл с настройками: диалог до применения');
  ok(themeWait === 'light', 'C7 до выбора настройки не применены (тема ' + themeWait + ', записей ' + seedEntries + ')');
  await act(p3, 'settings-choice-both');
  await p3.waitForTimeout(600);
  const entriesAfter = await p3.evaluate(() => (window.__waterApp.state.entries || []).length);
  const theme3 = await p3.evaluate(() => window.__waterApp.state.theme);
  ok(entriesAfter >= seedEntries && theme3 === 'dark', 'C7 выбор «оба»: записи и настройки применены (' + entriesAfter + ', ' + theme3 + ')');

  ok(errs.length === 0, 'C8 консоль чиста' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));

  console.log('ИТОГ m09: ' + pass + ' PASS, ' + fail + ' FAIL');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
