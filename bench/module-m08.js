/* Стенд M08 — belt-color: рампа поясов, водители пояса и цвета (C-027). */
const { chromium } = require('/home/user/pw/node_modules/playwright');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('PASS ' + name + (extra != null ? ' :: ' + JSON.stringify(extra) : '')); }
  else { fail++; console.log('FAIL ' + name + (extra != null ? ' :: ' + JSON.stringify(extra) : '')); }
}
/* день «сегодня» в поясе приложения, чтобы стенд не падал назавтра */
const TODAY = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Samara' }).format(new Date());
const store = (entries, drinks) => JSON.stringify({
  goalMl: 1950, gender: 'male', weightKg: 59.1, theme: 'dark', dayStart: '02:00',
  onboarded: 1, historyDismissed: 1, alertPermAsked: 1,
  profile: { drinkId: 'water', volume: 350 },
  drinks: drinks || [
    { id: 'water', name: 'Вода', hydration: 100, icon: 'drop', color: '#4aa3e8' },
    { id: 'espresso', name: 'Эспрессо', hydration: 70, icon: 'takeaway', color: '#8b5a2b' }
  ],
  entries,
  notifications: { enabled: false, everyMin: 120, evenIfRecent: true, afterWakeMin: 60, beforeSleepMin: 60, holdUntilDrink: true, sound: 'standart_sound.mp3', days: [{ wake: '05:00', sleep: '23:00' }, { wake: '05:00', sleep: '23:00' }, { wake: '05:00', sleep: '23:00' }, { wake: '05:00', sleep: '23:00' }, { wake: '05:00', sleep: '23:00' }, { wake: '07:00', sleep: '23:00' }, { wake: '08:00', sleep: '23:00' }] }
});
const E = (id, h, m, drink, vol, color) => ({ id, date: TODAY, time: h + ':' + m, drinkId: drink, name: drink, icon: drink === 'water' ? 'drop' : 'takeaway', color, hydration: 100, volume: vol, credited: vol, createdAt: 1 });

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 } });
  const errs = [];
  /* день из двух напитков разных цветов: вода 600 + эспрессо 300 */
  await ctx.addInitScript(`localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([
    E('e1', '09', '00', 'water', 600, '#4aa3e8'), E('e2', '11', '00', 'espresso', 300, '#8b5a2b')
  ])}));`);
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8085/wt2/index.html');
  await p.waitForFunction(() => window.__waterApp && window.WT2B && document.querySelector('.wt-orb canvas.wt-wave-c'));

  /* 1. рампа: 48 точек, поясa два, граница смешана, доли = объёмы */
  const r1 = await p.evaluate(() => {
    const st = window.__waterApp.state;
    const r = window.WT2B.ramp(st, window.WT2N.waterToday(st));
    return { n: r.colors.length, flat: r.flat, top: r.top, belts: r.belts.map(x => [x.id, x.v, Math.round(x.from * 1000) / 1000, Math.round(x.to * 1000) / 1000]) };
  });
  ok('рампа: 48 точек, два пояса, доли = объёмы дня (600/300)',
    r1.n === 48 && !r1.flat && r1.top === '#4aa3e8' &&
    JSON.stringify(r1.belts) === JSON.stringify([['water', 600, 0, 0.667], ['espresso', 300, 0.667, 1]]), r1);

  /* 2. пояса в круге: canvas, два пояса своих цветов, пролёт = ватерлиния–дно */
  await p.waitForFunction(() => window.WT2V.canvasState().frame > 5 && window.WT2V.canvasState().mode === 'belts');
  const r2 = await p.evaluate(() => {
    const st = window.WT2V.canvasState();
    const cv = document.querySelector('.wt-orb canvas.wt-wave-c');
    const c = cv.getContext('2d');
    const lift = document.querySelector('.wt-orb .cat-waterlift');
    const box = document.querySelector('.wt-orb .cat-water-box').getBoundingClientRect();
    const mtx = new DOMMatrixReadOnly(getComputedStyle(lift).transform);
    const wantSpan = window.WT2B.beltSpanPct(mtx.m42 / box.height * 100);
    const px = fy => { const d = c.getImageData(Math.round(cv.width / 2), Math.round(cv.height * fy), 1, 1).data; return [d[0], d[1], d[2]]; };
    /* пояса на холсте живут в пролёте от верха слоя подъёма: вода выше, эспрессо ниже */
    return { belts: st.belts, span: st.span, wantSpan: +wantSpan.toFixed(2), top: px(0.15), low: px(0.40) };
  });
  ok('пояса: canvas 2 пояса своих цветов, пролёт стека = ватерлиния–дно круга',
    r2.belts === 2 && Math.abs(r2.span - r2.wantSpan) <= 0.5 &&
    r2.top[2] > r2.top[0] && r2.low[0] > r2.low[2], r2);

  /* 3. порядок поясов = каталог (зоны отложены): перестановка каталога меняет пояс */
  const r3 = await p.evaluate(() => {
    const st = window.__waterApp.state;
    const a = window.WT2B.ramp(st, window.WT2N.waterToday(st)).top;
    st.drinks.reverse();
    const c = window.WT2B.ramp(st, window.WT2N.waterToday(st)).top;
    st.drinks.reverse();
    return { a, c };
  });
  ok('порядок поясов до слова о зонах = каталог (C-004 ныне так)', r3.a === '#4aa3e8' && r3.c === '#8b5a2b', r3);

  /* 4. водитель рампы: порция третьего цвета перекрашивает пояса плавно */
  const bandsCount = () => p.evaluate(() => window.WT2V.canvasState().belts);
  const before = await bandsCount();
  await p.evaluate((TD) => {
    const st = window.__waterApp.state;
    st.entries.push({ id: 'e9', date: TD, time: '13:00', drinkId: 'tea', name: 'Чай', icon: 'cup', color: '#c08e69', hydration: 90, volume: 400, credited: 360, createdAt: 9 });
    window.__waterApp.render();
  }, TODAY);
  await p.waitForTimeout(500);
  const mid = await bandsCount();
  await p.waitForTimeout(1400);
  const after = await p.evaluate(() => ({
    bands: window.WT2V.canvasState().belts,
    belts: window.WT2B.ramp(window.__waterApp.state, window.WT2N.waterToday(window.__waterApp.state)).belts.map(x => x.id)
  }));
  ok('водитель поясов: третий напиток входит плавно, пояс встаёт в порядок',
    before === 2 && mid === 3 && after.bands === 3 && after.belts.length === 3, { before, mid, after });

  /* 5. пролёт пояса следует за лифтом во время твина */
  await p.evaluate((TD) => {
    const st = window.__waterApp.state;
    st.entries.push({ id: 'e10', date: TD, time: '14:00', drinkId: 'water', name: 'Вода', icon: 'drop', color: '#4aa3e8', hydration: 100, volume: 300, credited: 300, createdAt: 10 });
    window.__waterApp.render();
  }, TODAY);
  await p.waitForTimeout(600);
  const midLift = await p.evaluate(() => {
    const st = window.WT2V.canvasState();
    return { h: st.span, want: +window.WT2B.beltSpanPct(window.WT2W.visible()).toFixed(2), frame: st.frame };
  });
  ok('пролёт пояса следует за видимой ватерлинией во время лифта', Math.abs(midLift.h - midLift.want) <= 0.5, midLift);

  /* 6. однотонный день: пояса нет, краска байт-в-байт M06 */
  const p2 = await ctx.newPage();
  p2.on('pageerror', e => errs.push(e.message));
  await p2.addInitScript(`localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([E('e1', '09', '00', 'water', 500, '#4aa3e8')])}));`);
  await p2.goto('http://127.0.0.1:8085/wt2/index.html');
  await p2.waitForFunction(() => window.__waterApp && document.querySelector('.wt-orb'));
  await p2.waitForFunction(() => window.WT2V.canvasState().frame > 5);
  const r6 = await p2.evaluate(() => {
    const st = window.WT2V.canvasState();
    const cv = document.querySelector('.wt-orb canvas.wt-wave-c');
    const c = cv.getContext('2d');
    const d = c.getImageData(Math.round(cv.width / 2), Math.round(cv.height * 0.8), 1, 1).data;
    return { mode: st.mode, belts: st.belts, px: [d[0], d[1], d[2]] };
  });
  ok('однотонный день: пояса нет, краска M06 на месте', r6.mode === 'mono' && r6.belts === 0 && r6.px[2] > r6.px[0] + 30, r6);
  await p2.close();

  await p.screenshot({ path: '/home/user/wt2/bench/shots/m08-belt-dark.png', clip: { x: 0, y: 100, width: 412, height: 520 } });
  ok('без pageerror', errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log('BENCH M08: ' + (fail ? 'FAILS=' + fail : 'ALL GREEN') + ' (' + pass + '/' + (pass + fail) + ')');
  process.exit(fail ? 1 : 0);
})();
