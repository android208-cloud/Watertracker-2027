/* Стенд M06 — вода: уровень, лифт, однотон (контракт C-026).
   Прогон: headless Chromium, фикстура через addInitScript, живой rAF-лифт. */
const { chromium } = require('/home/user/pw/node_modules/playwright');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('PASS ' + name + (extra != null ? ' :: ' + JSON.stringify(extra) : '')); }
  else { fail++; console.log('FAIL ' + name + (extra != null ? ' :: ' + JSON.stringify(extra) : '')); }
}

/* день «сегодня» в поясе приложения, чтобы стенд не падал назавтра */
const TODAY = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Samara' }).format(new Date());
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

  /* 3. однотон: одна краска = взвешенная смесь цветов дня.
     Водитель цвета идёт плавно (1,5 с) — сверяем финальную краску. */
  await p.waitForTimeout(1600);
  const col = await p.evaluate(() => {
    const st = window.__waterApp.state;
    const want = window.WT2W.liquidColor(st);
    const cv = document.querySelector('.wt-orb canvas.wt-wave-c');
    const c = cv.getContext('2d');
    const d = c.getImageData(Math.round(cv.width / 2), Math.round(cv.height * 0.8), 1, 1).data;
    const wrgb = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(want).slice(1).map(h => parseInt(h, 16));
    /* пиксель тела: краска дня, книзу затемнена глубиной (допуск на шейдинг) */
    const near = Math.abs(d[0] - wrgb[0]) <= 55 && Math.abs(d[1] - wrgb[1]) <= 55 && Math.abs(d[2] - wrgb[2]) <= 55;
    return { want, got: [d[0], d[1], d[2]], wrgb, match: near && d[2] >= d[0] };
  });
  ok('однотон: пиксель холста = смесь цветов дня (фикстура: чистая вода)', col.match, col);

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
  }, { timeout: 15000 });
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

  /* 9. тост главного экрана — в зазоре дока, как в прототипе (09.11):
     между кнопкой отмены и кнопкой напитка, той же высоты и оси;
     вне главного — верхняя капсула */
  await p.click('.wt-orb');
  await p.waitForFunction(() => document.querySelector('.toast'));
  const tg = await p.evaluate(() => {
    const R = e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, h: r.height, cy: (r.top + r.bottom) / 2, t: r.top }; };
    return { toast: R(document.querySelector('.toast')),
      undo: R(document.querySelector('.home-dock [data-act="undo"]')),
      drink: R(document.querySelector('.home-dock [data-act="open-drinks"]')) };
  });
  ok('тост на главном: в зазоре дока между отменой и напитком, высота и ось кнопок',
    tg.toast.l > tg.undo.r && tg.toast.r < tg.drink.l &&
    Math.abs(tg.toast.h - tg.undo.h) <= 2 && Math.abs(tg.toast.cy - tg.undo.cy) <= 2, tg);
  await p.click('[data-tab="history"]');
  await p.waitForTimeout(200);
  const tg2 = await p.evaluate(() => {
    const t = document.querySelector('.toast');
    return t ? { top: t.getBoundingClientRect().top } : null;
  });
  ok('тост вне главного: верхняя капсула', !!tg2 && tg2.top < 100, tg2);

  ok('без pageerror', errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log('BENCH M06: ' + (fail ? 'FAILS=' + fail : 'ALL GREEN') + ' (' + pass + '/' + (pass + fail) + ')');
  process.exit(fail ? 1 : 0);
})();
