/* Стенд M06 — вода: уровень, лифт, однотон (контракт C-026).
   Прогон: headless Chromium, фикстура через addInitScript, живой rAF-лифт. */
const { chromium } = require('/home/user/pw/node_modules/playwright');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('PASS ' + name + (extra != null ? ' :: ' + JSON.stringify(extra) : '')); }
  else { fail++; console.log('FAIL ' + name + (extra != null ? ' :: ' + JSON.stringify(extra) : '')); }
}

const TODAY = '2026-11-05';
const store = (entries, goal) => JSON.stringify({
  goalMl: goal || 1950, gender: 'male', weightKg: 59.1, theme: 'dark', dayStart: '02:00',
  onboarded: 1, historyDismissed: 1, alertPermAsked: 1,
  profile: { drinkId: 'water', volume: 350 },
  drinks: [
    { id: 'water', name: 'Вода', hydration: 100, icon: 'drop', color: '#4aa3e8' },
    { id: 'espresso', name: 'Эспрессо', hydration: 70, icon: 'takeaway', color: '#8b5a2b' }
  ],
  entries,
  notifications: { enabled: false, everyMin: 120, evenIfRecent: true, afterWakeMin: 60, beforeSleepMin: 60, holdUntilDrink: true, sound: 'standart_sound.mp3', days: [{ wake: '05:00', sleep: '23:00' }, { wake: '05:00', sleep: '23:00' }, { wake: '05:00', sleep: '23:00' }, { wake: '05:00', sleep: '23:00' }, { wake: '05:00', sleep: '23:00' }, { wake: '07:00', sleep: '23:00' }, { wake: '08:00', sleep: '23:00' }] }
});
const E = (id, h, m, drink, vol, cred) => ({ id, date: TODAY, time: h + ':' + m, drinkId: drink, name: drink === 'water' ? 'Вода' : 'Эспрессо', icon: drink === 'water' ? 'drop' : 'takeaway', color: drink === 'water' ? '#4aa3e8' : '#8b5a2b', hydration: drink === 'water' ? 100 : 70, volume: vol, credited: cred, createdAt: Date.now() });

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 } });
  const errs = [];
  await ctx.addInitScript(`localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([E('e1', '09', '00', 'water', 500, 500), E('e2', '11', '00', 'water', 600, 600)], 1950)}));`);
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8085/wt2/index.html');
  await p.waitForFunction(() => window.__waterApp && window.WT2W && document.querySelector('.cat-water-box'));

  /* 1. уровень: ватерлиния чаши честна по доле дня */
  const lvl = await p.evaluate(() => {
    const st = window.__waterApp.state;
    const goal = window.WT2S.dayStats(st, window.WT2N.waterToday(st)).goal;
    const vol = window.WT2S.dayStats(st, window.WT2N.waterToday(st)).volume;
    const frac = vol / goal;
    const tr = getComputedStyle(document.querySelector('.cat-waterlift')).transform;
    return { frac, want: window.WT2W.liftPct(frac), tr };
  });
  const trPct = (() => { const m = /matrix\(1, 0, 0, 1, 0, (-?[\d.]+)\)/.exec(lvl.tr); if (!m) return null;
    /* translateY в % даёт matrix в px от высоты бокса; считаем через offsetHeight */ return null; })();
  const lvl2 = await p.evaluate(() => {
    const box = document.querySelector('.cat-water-box').getBoundingClientRect();
    const lift = document.querySelector('.cat-waterlift');
    const st = window.__waterApp.state;
    const ds = window.WT2S.dayStats(st, window.WT2N.waterToday(st));
    const frac = ds.volume / ds.goal;
    const wantPx = window.WT2W.liftPct(frac) / 100 * box.height;
    const mtx = new DOMMatrixReadOnly(getComputedStyle(lift).transform);
    return { wantPx: +wantPx.toFixed(1), gotPx: +mtx.m42.toFixed(1), boxH: +box.height.toFixed(1) };
  });
  ok('уровень: ватерлиния круга = доля дня, лифт в px совпадает', Math.abs(lvl2.wantPx - lvl2.gotPx) <= 1, { ...lvl2, frac: +lvl.frac.toFixed(4) });

  /* 2. ватерлиния внутри чаши на всём диапазоне долей */
  const range = await p.evaluate(() => {
    const out = [];
    [0, 0.25, 0.5, 0.75, 1].forEach(q => {
      const y = window.WT2W.liftPct(q);
      out.push(y >= 0 && y <= 100);
    });
    return out.every(Boolean);
  });
  ok('уровень: ватерлиния круга живёт в 0–100% на всех долях', range);

  /* 2б. круг: отступ до краёв экрана равен А–Б, центр на линии И */
  const orb = await p.evaluate(() => {
    const o = document.querySelector('.wt-orb').getBoundingClientRect();
    const st = document.querySelector('.cat-stage').getBoundingClientRect();
    const u = document.querySelector('[data-act="undo"]').getBoundingClientRect();
    const d = document.querySelector('.drink-now').getBoundingClientRect();
    const f = ((d.left + d.width / 2) - (u.left + u.width / 2)) / 5;
    return { left: +o.left.toFixed(1), right: +(window.innerWidth - o.right).toFixed(1), f: +f.toFixed(1),
      cy: +(o.top + o.height / 2).toFixed(1), sceneCy: +(st.top + st.height / 2).toFixed(1), sq: +o.width.toFixed(1) === +o.height.toFixed(1) };
  });
  ok('круг: отступ до краёв = А–Б (--f), центр на линии И, форма круг',
    Math.abs(orb.left - orb.f) <= 1 && Math.abs(orb.right - orb.f) <= 1 && Math.abs(orb.cy - orb.sceneCy) <= 2 && orb.sq, orb);

  /* 3. однотон: одна краска = взвешенная смесь цветов дня */
  const col = await p.evaluate(() => {
    const st = window.__waterApp.state;
    const want = window.WT2W.liquidColor(st);
    const got = getComputedStyle(document.querySelector('.cat-flat')).backgroundColor;
    const rgbOf = h => { const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h); return 'rgb(' + parseInt(m[1], 16) + ', ' + parseInt(m[2], 16) + ', ' + parseInt(m[3], 16) + ')'; };
    return { want, got, match: got === rgbOf(want) };
  });
  ok('однотон: заливка воды = смесь цветов дня (фикстура: чистая вода)', col.match, col);

  /* 4. вектор: в сцене нет растра */
  const vec = await p.evaluate(() => document.querySelectorAll('.cat-art img').length);
  ok('вектор: в сцене ноль <img>', vec === 0, { imgs: vec });

  /* 5. маска-трафарет чаши — data-URI SVG на коробке */
  const mask = await p.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('.cat-water-box'));
    return (cs.maskImage || cs.webkitMaskImage || '');
  });
  ok('маска: трафарет чаши приходит data-URI SVG', mask.indexOf('data:image/svg') >= 0);

  /* 6. лифт: после порции вода скользит синусом, без телепорта */
  const before = await p.evaluate(() => window.WT2W.visible());
  await p.click('.wt-orb');
  await p.waitForTimeout(700);
  const mid1 = await p.evaluate(() => window.WT2W.visible());
  await p.waitForTimeout(1000);
  const mid2 = await p.evaluate(() => window.WT2W.visible());
  await p.waitForFunction(() => {
    const st = window.__waterApp.state;
    const ds = window.WT2S.dayStats(st, window.WT2N.waterToday(st));
    return Math.abs(window.WT2W.visible() - window.WT2W.liftPct(ds.volume / ds.goal)) < 0.01;
  }, { timeout: 6000 });
  const after = await p.evaluate(() => {
    const st = window.__waterApp.state;
    const ds = window.WT2S.dayStats(st, window.WT2N.waterToday(st));
    return { vis: window.WT2W.visible(), target: window.WT2W.liftPct(ds.volume / ds.goal), vol: ds.volume };
  });
  ok('лифт: вода скользит к новой цели (промежутки строго между, финал точен)',
    mid1 < before && mid2 < mid1 && Math.abs(after.vis - after.target) < 0.01 && after.vol === 1450,
    { before: +before.toFixed(2), mid1: +mid1.toFixed(2), mid2: +mid2.toFixed(2), after: +after.vis.toFixed(2), target: +after.target.toFixed(2) });

  /* 7. ноль дня: вода скрыта, стакан стоит */
  const p2 = await ctx.newPage();
  p2.on('pageerror', e => errs.push(e.message));
  await p2.addInitScript(`localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([], 1950)}));`);
  await p2.goto('http://127.0.0.1:8085/wt2/index.html');
  await p2.waitForFunction(() => window.__waterApp && document.querySelector('.cat-orb-ring'));
  const zero = await p2.evaluate(() => ({
    hidden: !!document.querySelector('.cat-water[hidden]'),
    ring: !!document.querySelector('.cat-orb-ring')
  }));
  ok('ноль дня: вода скрыта, кольцо круга стоит', zero.hidden && zero.ring, zero);
  await p2.close();

  /* 8. светлая тема: стакан читается на голубом */
  const p3 = await ctx.newPage();
  p3.on('pageerror', e => errs.push(e.message));
  await p3.addInitScript(`localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([E('e1', '09', '00', 'water', 500, 500)], 1950).replace('"theme":"dark"', '"theme":"light"')}));`);
  await p3.goto('http://127.0.0.1:8085/wt2/index.html');
  await p3.waitForFunction(() => window.__waterApp && document.querySelector('.cat-water-box'));
  await p3.screenshot({ path: '/home/user/wt2/bench/shots/m06-water-light.png', clip: { x: 0, y: 100, width: 412, height: 520 } });
  await p3.close();
  await p.screenshot({ path: '/home/user/wt2/bench/shots/m06-water-dark.png', clip: { x: 0, y: 100, width: 412, height: 520 } });

  ok('без pageerror', errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log('BENCH M06: ' + (fail ? 'FAILS=' + fail : 'ALL GREEN') + ' (' + pass + '/' + (pass + fail) + ')');
  process.exit(fail ? 1 : 0);
})();
