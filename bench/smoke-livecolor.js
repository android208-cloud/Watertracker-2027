/* Смоук живых цветов (модули liquid-color/chart-color перенесены из донора).
   Гейты: строки блоков видны (liqBlock/bubBlock/chartBlock), папка «Волна»
   подключена, акт liq-mode меняет цвет орба, chart-on красит
   столбцы одним цветом, экспорт настроек на месте, консоль чиста. */
const { chromium } = require('/home/user/pw/node_modules/playwright');
const fs = require('fs');

const OWNER = JSON.parse(fs.readFileSync('/home/user/uploads/vodomer-baza-owner.json', 'utf8'));

function seedState() {
  const s = OWNER.settings || {};
  const pr = OWNER.profile || {};
  return {
    goalMl: pr.consumptionRate || 1900, useRecommended: !!pr.useRecommended,
    gender: pr.gender || 'male', weightKg: pr.weightKg || 59,
    units: pr.units || 'metric', dayStart: pr.dayStart || '02:00',
    theme: 'dark', animation: false,
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
  const b = await chromium.launch();
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 } });
  await ctx.addInitScript(`localStorage.setItem('cup-tracker-v1', ${JSON.stringify(JSON.stringify(seedState()))});`);
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && String((m.location() || {}).url || '').indexOf('ui-skin.json') < 0) errs.push('console: ' + m.text()); });
  await p.goto('http://127.0.0.1:8085/wt2/index.html');
  await p.waitForFunction(() => window.__waterApp && window.__waterApp.state, null, { timeout: 15000 });
  const S = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__waterApp.state)));
  const UI = () => p.evaluate(() => window.__waterApp.ui);
  const act = a => p.evaluate(x => window.__waterApp.performAction(null, x), a);

  /* L1: модули на борту */
  ok(await p.evaluate(() => !!(window.LiquidColor && window.LiquidColor.act && window.LiquidColor.color)), 'L1 LiquidColor на борту');
  ok(await p.evaluate(() => !!(window.ChartColor && window.ChartColor.act && window.ChartColor.color)), 'L1 ChartColor на борту');

  /* L2: настройки «Внешний вид»: блоки цвета видны, папка «Волна» живая */
  await p.click('[data-tab="settings"]');
  await p.waitForTimeout(300);
  await p.click('[data-act="open-look"]');
  await p.waitForTimeout(400);
  const lookHtml = await p.content();
  ok(lookHtml.indexOf('data-act="liq-mode"') >= 0, 'L2 строки режима цвета видны');
  ok(lookHtml.indexOf('data-act="liq-bubcol"') >= 0, 'L2 строка «пузырьки в цвет» видна');
  ok(lookHtml.indexOf('data-act="chart-on"') >= 0, 'L2 строка «график тем же цветом» видна');
  ok(lookHtml.indexOf('data-act="lc-export"') < 0, 'L2 экспорт настроек живёт внутри папки «Волна»');
  ok(lookHtml.indexOf('data-act="open-folder-wave"') >= 0, 'L2 дверь «Волна» рисуется (папка подключена)');
  await p.click('[data-act="open-folder-wave"]');
  await p.waitForTimeout(400);
  const waveHtml = await p.content();
  ok(waveHtml.indexOf('data-act="liq-wave"') >= 0, 'L2 внутри папки — мастер-тумблер волны');
  ok(waveHtml.indexOf('data-liq-p="waveN"') >= 0, 'L2 внутри папки — «Число волн»');
  ok(waveHtml.indexOf('data-act="lc-export"') >= 0, 'L2 внутри папки — экспорт настроек');

  /* L3: смена режима перекрашивает орб */
  const orbColor = async () => {
    await p.click('[data-tab="home"]');
    await p.waitForTimeout(450);
    return p.evaluate(() => {
      const cv = document.querySelector('.wt-orb canvas.wt-wave-c');
      return cv ? cv.getAttribute('data-color') : (window.WT2B.visibleColor() || 'none');
    });
  };
  const c1 = await orbColor();
  await p.evaluate(() => window.__waterApp.performAction({ dataset: { act: 'liq-dilute' } }, 'liq-dilute'));
  await p.waitForTimeout(400);
  const c2 = await orbColor();
  await p.evaluate(() => window.__waterApp.performAction({ dataset: { act: 'liq-dilute' } }, 'liq-dilute'));
  await p.waitForTimeout(400);
  const c3 = await orbColor();
  ok(c1 && c2 && c1 !== c2, 'L3 «разбавлять при малом заполнении» осветляет орб (' + c1 + ' -> ' + c2 + ')');
  ok(c3 === c1, 'L3 выключенное разбавление возвращает цвет (' + c3 + ')');
  const modes = await p.evaluate(() => {
    const st = JSON.parse(JSON.stringify(window.__waterApp.state));
    const key = '2026-11-07';
    st.entries.push({ date: key, time: '08:00', id: 'water', icon: 'water', volume: 400, credited: 400 });
    st.entries.push({ date: key, time: '23:59', id: 'lc-test-tea', color: '#67b86a', volume: 260, credited: 260 });
    window.LiquidColor.act('liq-mode', { dataset: { v: 'last' } });
    const v = window.LiquidColor.color(st, key, 0.4);
    window.LiquidColor.act('liq-mode', { dataset: { v: 'base' } });
    const d = window.LiquidColor.color(st, key, 0.4);
    window.LiquidColor.act('liq-mode', { dataset: { v: 'vessel' } });
    return v + '|' + d;
  });
  const mv = modes.split('|')[0], md = modes.split('|')[1];
  ok(mv && md && mv !== md, 'L3 режимы last/base дают разные цвета на смешанном дне (' + mv + ' vs ' + md + ')');

  /* L4: chart-on — столбцы одним цветом */
  const ccOn = await p.evaluate(() => window.ChartColor.store().on);
  await p.evaluate(() => window.__waterApp.performAction({ dataset: { act: 'chart-on' } }, 'chart-on'));
  const ccOn2 = await p.evaluate(() => window.ChartColor.store().on);
  ok(ccOn2 === !ccOn, 'L4 акт chart-on переключает модуль (' + ccOn + ' -> ' + ccOn2 + ')');
  await p.click('[data-tab="history"]');
  await p.waitForTimeout(700);
  const segs = await p.evaluate(() => {
    const cols = Array.prototype.slice.call(document.querySelectorAll('.col')).filter(function (c) {
      return Number(c.getAttribute('data-raw')) > 0;
    });
    if (!cols.length) return 'no-cols';
    return cols.slice(0, 5).map(function (c) { return c.querySelectorAll('i').length; }).join(',');
  });
  ok(ccOn2 ? segs === '1,1,1,1,1' || segs === 'no-cols' : segs !== '1,1,1,1,1', 'L4 столбцы одним сегментом при включённом модуле (' + segs + ')');
  await p.evaluate(() => window.__waterApp.performAction({ dataset: { act: 'chart-on' } }, 'chart-on'));
  await p.waitForTimeout(300);
  const ccOff = await p.evaluate(() => window.ChartColor.store().on);
  ok(ccOff === ccOn, 'L4 обратный акт возвращает модуль (' + ccOff + ')');

  /* L6: пак владельца привозит оформление жидкости (importLc-мост) */
  const lcBefore = await p.evaluate(() => window.LiquidColor.store().mode);
  await p.evaluate((packText) => {
    /* путь настроек из пака — withSettings (облачная линия, слово за M09);
       здесь проверяем, что мост importLc готов и работает */
    window.WT2Y.applyPack(window.__waterApp.state, JSON.parse(packText), 'merge', {
      withSettings: true,
      importLc: function (lc) { if (window.LiquidColor && LiquidColor.importState) LiquidColor.importState(lc); }
    });
  }, JSON.stringify(OWNER));
  await p.waitForTimeout(400);
  const lcAfter = await p.evaluate(() => window.LiquidColor.store().mode);
  ok(lcAfter === 'belt' && lcBefore !== 'belt', 'L6 пак владельца включает режим «пояс графика» (' + lcBefore + ' -> ' + lcAfter + ')');
  await p.click('[data-tab="home"]');
  await p.waitForTimeout(600);
  /* две порции разных напитков сегодняшним днём: пояс из двух стыков */
  /* чайный пин (slot 2) и водный (slot 0): два напитка за сутки -> пояс */
  await p.evaluate(() => {
    const btns = document.querySelectorAll('[data-act="apply-shortcut"]');
    if (btns[2]) btns[2].click();
  });
  await p.waitForTimeout(300);
  await p.click('.wt-orb');
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    const btns = document.querySelectorAll('[data-act="apply-shortcut"]');
    if (btns[0]) btns[0].click();
  });
  await p.waitForTimeout(300);
  await p.click('.wt-orb');
  await p.waitForTimeout(700);
  const beltOn = await p.evaluate(() => {
    const st = window.WT2V.canvasState();
    return st.mode === 'belts' ? st.belts : 0;
  });
  ok(beltOn >= 2, 'L6 орб красится поясами после пака (слоёв: ' + beltOn + ')');

  /* L5: консоль чиста */
  ok(errs.length === 0, 'L5 нет ошибок консоли' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));

  console.log('ИТОГ livecolor: ' + pass + ' PASS, ' + fail + ' FAIL');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
