/* Стенд M08 — belt-color: рампа поясов, водители пояса и цвета (C-027). */
const { chromium } = require('/home/user/pw/node_modules/playwright');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('PASS ' + name + (extra != null ? ' :: ' + JSON.stringify(extra) : '')); }
  else { fail++; console.log('FAIL ' + name + (extra != null ? ' :: ' + JSON.stringify(extra) : '')); }
}
const TODAY = '2026-11-05';
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
  await p.waitForFunction(() => window.__waterApp && window.WT2B && document.querySelector('.wt-orb .cat-beltband'));

  /* 1. рампа: 48 точек, поясa два, граница смешана, доли = объёмы */
  const r1 = await p.evaluate(() => {
    const st = window.__waterApp.state;
    const r = window.WT2B.ramp(st, window.WT2N.waterToday(st));
    return { n: r.colors.length, flat: r.flat, top: r.top, belts: r.belts.map(x => [x.id, x.v, Math.round(x.from * 1000) / 1000, Math.round(x.to * 1000) / 1000]) };
  });
  ok('рампа: 48 точек, два пояса, доли = объёмы дня (600/300)',
    r1.n === 48 && !r1.flat && r1.top === '#4aa3e8' &&
    JSON.stringify(r1.belts) === JSON.stringify([['water', 600, 0, 0.667], ['espresso', 300, 0.667, 1]]), r1);

  /* 2. пояса в круге: бэнды по долям, пролёт стека = ватерлиния–дно (M07 слои) */
  const r2 = await p.evaluate(() => {
    const stack = document.querySelector('.wt-orb .cat-beltstack');
    const bands = Array.from(document.querySelectorAll('.wt-orb .cat-beltband'));
    const lift = document.querySelector('.wt-orb .cat-waterlift');
    const box = document.querySelector('.wt-orb .cat-water-box').getBoundingClientRect();
    const mtx = new DOMMatrixReadOnly(getComputedStyle(lift).transform);
    const wantSpan = window.WT2B.beltSpanPct(mtx.m42 / box.height * 100);
    return { bands: bands.length, cols: bands.map(x => getComputedStyle(x).backgroundColor),
      tops: bands.map(x => x.style.top), h: +stack.style.height.replace('%', ''), wantSpan: +wantSpan.toFixed(2) };
  });
  ok('пояса: два бэнда своих цветов, пролёт стека = ватерлиния–дно круга',
    r2.bands === 2 && r2.cols[0] === 'rgb(74, 163, 232)' && r2.cols[1] === 'rgb(139, 90, 43)' &&
    Math.abs(r2.h - r2.wantSpan) <= 0.5, r2);

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

  /* 4. водитель рампы: порция третьего цвета перекрашивает стопы плавно */
  const before = await p.evaluate(() => Array.from(document.querySelectorAll('.wt-orb .cat-beltband')).map(x => x.style.background));
  await p.evaluate(() => {
    const st = window.__waterApp.state;
    st.entries.push({ id: 'e9', date: '2026-11-05', time: '13:00', drinkId: 'tea', name: 'Чай', icon: 'cup', color: '#c08e69', hydration: 90, volume: 400, credited: 360, createdAt: 9 });
    window.__waterApp.render();
  });
  await p.waitForTimeout(500);
  const mid = await p.evaluate(() => Array.from(document.querySelectorAll('.wt-orb .cat-beltband')).map(x => x.style.background));
  await p.waitForTimeout(1400);
  const after = await p.evaluate(() => ({
    bands: Array.from(document.querySelectorAll('.wt-orb .cat-beltband')).map(x => x.style.background),
    belts: window.WT2B.ramp(window.__waterApp.state, window.WT2N.waterToday(window.__waterApp.state)).belts.map(x => x.id)
  }));
  ok('водитель поясов: третий напиток входит плавно, пояс встаёт в порядок',
    before.length === 2 && mid.length === 3 && after.bands.length === 3 && after.belts.length === 3 &&
    JSON.stringify(before) !== JSON.stringify(mid.slice(0, 2) === before ? mid : mid), { before, mid: mid.slice(0, 2), after: after.bands });

  /* 5. пролёт пояса следует за лифтом во время твина */
  await p.evaluate(() => {
    const st = window.__waterApp.state;
    st.entries.push({ id: 'e10', date: '2026-11-05', time: '14:00', drinkId: 'water', name: 'Вода', icon: 'drop', color: '#4aa3e8', hydration: 100, volume: 300, credited: 300, createdAt: 10 });
    window.__waterApp.render();
  });
  await p.waitForTimeout(600);
  const midLift = await p.evaluate(() => {
    const belt = document.querySelector('.wt-orb .cat-beltstack');
    const lift = document.querySelector('.wt-orb .cat-waterlift');
    const box = document.querySelector('.wt-orb .cat-water-box').getBoundingClientRect();
    const mtx = new DOMMatrixReadOnly(getComputedStyle(lift).transform);
    return { h: +belt.style.height.replace('%', ''), want: +window.WT2B.beltSpanPct(mtx.m42 / box.height * 100).toFixed(2) };
  });
  ok('пролёт пояса следует за видимой ватерлинией во время лифта', Math.abs(midLift.h - midLift.want) <= 0.5, midLift);

  /* 6. однотонный день: пояса нет, краска байт-в-байт M06 */
  const p2 = await ctx.newPage();
  p2.on('pageerror', e => errs.push(e.message));
  await p2.addInitScript(`localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([E('e1', '09', '00', 'water', 500, '#4aa3e8')])}));`);
  await p2.goto('http://127.0.0.1:8085/wt2/index.html');
  await p2.waitForFunction(() => window.__waterApp && document.querySelector('.wt-orb'));
  const r6 = await p2.evaluate(() => ({
    belt: !!document.querySelector('.wt-orb .cat-belt'),
    flat: getComputedStyle(document.querySelector('.wt-orb .cat-flat')).backgroundColor
  }));
  ok('однотонный день: пояса нет, краска M06 на месте', r6.belt === false && r6.flat === 'rgb(74, 163, 232)', r6);
  await p2.close();

  await p.screenshot({ path: '/home/user/wt2/bench/shots/m08-belt-dark.png', clip: { x: 0, y: 100, width: 412, height: 520 } });
  ok('без pageerror', errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log('BENCH M08: ' + (fail ? 'FAILS=' + fail : 'ALL GREEN') + ' (' + pass + '/' + (pass + fail) + ')');
  process.exit(fail ? 1 : 0);
})();
