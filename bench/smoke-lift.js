/* Подъём жидкости в круге (поясный режим): тело воды обязано оставаться
   приклеенным ко дну на всём подъёме — сдвиг слоя + высота пояса = 100%.
   Регрессия 07.11: водитель лифта не правил высоту .cat-belt (донор
   applyWaterVis правит каждый кадр) — объём уезжал вверх, снизу росла
   пустота и рывком закрашивалась чужой перерисовкой.
   node bench/smoke-lift.js */
const { chromium } = require('/home/user/pw/node_modules/playwright');
let pass = 0, fail = 0;
const ok = (n, c, x) => { console.log((c ? '  PASS  ' : '  FAIL  ') + n + (x ? '  ' + x : '')); c ? pass++ : fail++; };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 } });
  const seed = {
    goalMl: 1947, useRecommended: false, gender: 'male', weightKg: 59, units: 'metric',
    dayStart: '02:00', theme: 'dark', animation: true, onboarded: 1, historyDismissed: 1,
    alertPermAsked: 1, profile: { drinkId: 'water', volume: 800 },
    drinks: [
      { id: 'water', name: 'Вода', icon: 'drop', color: '#4db2ff', hydration: 100 },
      { id: 'tea', name: 'Чай', icon: 'tea', color: '#f5a623', hydration: 90 },
      { id: 'coffee', name: 'Кофе', icon: 'coffee', color: '#8a5a33', hydration: 80 }
    ],
    entries: [], weights: [], dayGoals: {}, tombstones: { e: {}, w: {} },
    notifications: { enabled: false, everyMin: 120, days: [] }
  };
  await ctx.addInitScript(v => { try { localStorage.setItem('cup-tracker-v1', JSON.stringify(v)); } catch (e) {} }, seed);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await p.goto('http://127.0.0.1:8085/wt2/index.html');
  await p.waitForFunction(() => window.__waterApp && window.__waterApp.state, null, { timeout: 20000 });
  const setProfile = (d, v) => p.evaluate(([dd, vv]) => {
    const A = window.__waterApp; A.state.profile.drinkId = dd; A.state.profile.volume = vv; A.render();
  }, [d, v]);
  const sum = () => p.evaluate(() => {
    const lift = document.querySelector('.wt-orb .cat-waterlift');
    const belt = document.querySelector('.wt-orb .cat-belt');
    if (!lift || !belt) return null;
    const tf = /translateY\(([-\d.]+)%\)/.exec(lift.style.transform || '');
    return { tf: tf ? parseFloat(tf[1]) : null, beltH: parseFloat(belt.style.height) };
  });
  await p.waitForTimeout(600);
  await p.click('.wt-orb'); await p.waitForTimeout(3900);
  await setProfile('tea', 500);
  await p.click('.wt-orb'); await p.waitForTimeout(3900);
  await setProfile('coffee', 500);
  await p.click('.wt-orb'); await p.waitForTimeout(3900);
  await setProfile('water', 200);

  const rest = await sum();
  ok('L1 покой: сдвиг + высота пояса = 100%', !!rest && Math.abs(rest.tf + rest.beltH - 100) < 0.35,
    rest ? rest.tf + ' + ' + rest.beltH : 'нет слоёв');

  await p.click('.wt-orb');
  let worst = 0, samples = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 3400) {
    const s = await sum();
    if (s && s.tf != null) { worst = Math.max(worst, Math.abs(s.tf + s.beltH - 100)); samples++; }
    await p.waitForTimeout(120);
  }
  ok('L2 весь подъём: тело приклеено ко дну (худшее отклонение < 0.35%)', samples > 10 && worst < 0.35,
    'образцов: ' + samples + ', худшее: ' + worst.toFixed(3) + '%');
  await p.waitForTimeout(600);
  const fin = await sum();
  ok('L3 финиш: уровень полный, сумма = 100%', !!fin && Math.abs(fin.tf + fin.beltH - 100) < 0.35 && fin.tf < 2.2,
    fin ? fin.tf + ' + ' + fin.beltH : '');
  ok('L4 без ошибок страницы', errs.length === 0, errs[0] || '');
  await b.close();
  console.log('\nИТОГ: ' + pass + ' PASS / ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('СБОЙ БЕНЧА:', e); process.exit(2); });
