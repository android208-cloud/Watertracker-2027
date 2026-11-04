/* Стенд M11: графики против чек-листа донора v158 (2636–2747, 2814–3110). */
const { chromium } = require('/home/user/pw/node_modules/playwright');
let fails = 0;
const ok = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 412, height: 892 } })).newPage();
  await p.goto('http://127.0.0.1:8085/wt2/bench/harness7.html');
  await p.waitForFunction(() => window.__harnessReady === 1);
  const r = await p.evaluate(() => {
    const H = window.WT2H, S = window.WT2S, C = window.WT2C, J = window.WT2J, out = {};
    const bar = (date, raw, goal, segs) => ({ date, raw, goal, segs: segs || [] });
    // 1 масштаб: только последние пять
    const bars1 = [bar('d1', 5000, 1900), bar('d2', 10, 1900), bar('d3', 20, 1900), bar('d4', 30, 1900), bar('d5', 40, 1900), bar('d6', 50, 1900)];
    out.scale = H.scaleOf(bars1);
    // 2 остатки сегментов: три равных на 100 px
    const col = H.colHtml(bar('2026-11-04', 100, 200, [{ raw: 100, color: '#111111' }, { raw: 100, color: '#222222' }, { raw: 100, color: '#333333' }]), 146, '2026-11-04');
    out.segs = (col.match(/top:(\d+)px;height:(\d+)px/g) || []);
    // 3 подписи: above и on-line
    const cAbove = H.colHtml(bar('2026-11-04', 2000, 1900, [{ raw: 2000, color: '#111111' }]), 2000, '');
    const cOn = H.colHtml(bar('2026-11-04', 900, 1900, [{ raw: 900, color: '#111111' }]), 2000, '');
    out.labels = [/bar-label above" style="bottom:164px/.test(cAbove), /bar-label on-line" style="bottom:139px/.test(cOn)];
    // 4 полосы цели: два пробега
    const bars4 = [bar('a', 100, 1900), bar('b', 100, 1900), bar('c', 100, 2000)];
    const bands = H.bandsHtml(bars4);
    out.bands = [(bands.match(/chart-below/g) || []).length, /left:0;/.test(bands), /data-goal="2000"/.test(bands)];
    // 5 окно вокруг выбранного дня
    const bars5 = []; for (let i = 0; i < 40; i++) bars5.push(bar('2026-0' + (i % 9 + 1) + '-0' + (i % 8 + 1), 0, 1900));
    bars5[10].date = '2026-10-10';
    out.win = H.windowInit(bars5, '2026-10-10', null);
    // 6 дорастание окна
    out.grow = [H.growWindow({ from: 10, to: 40 }, 100, 20 * 82, 412), H.growWindow({ from: 10, to: 40 }, 100, 82 * 50, 412)];
    // 7 недели и периоды
    out.week = [H.weekStart('2026-11-04'), H.weekStart('2026-11-01'), H.shiftPeriod('month', '2026-12-01', 1, '2026-12-01'), H.shiftPeriod('year', '2026-06-01', -1, '2026-06-01')];
    // 8 шкала веса: шаг и кратность
    out.wscale = [H.weightScale([{ date: '2026-11-02', kg: 82.4 }, { date: '2026-11-03', kg: 84.9 }], [{ start: '2026-11-02', end: '2026-11-08' }], '2026-11-04', 60),
                  H.weightScale([{ date: '2026-11-02', kg: 70 }, { date: '2026-11-03', kg: 84 }], [{ start: '2026-11-02', end: '2026-11-08' }], '2026-11-04', 60)];
    // 9 svg недели: линия, точки, пилюля сегодня
    const all9 = [{ date: '2026-11-02', kg: 82 }, { date: '2026-11-03', kg: 82.5 }];
    const win9 = H.weightWindow('week', '2026-11-04', '2026-11-04');
    const svg9 = H.weightSvg(all9, '2026-11-04', win9, null, 60);
    out.svg = [(svg9.match(/<circle/g) || []).length, /<path d="M/.test(svg9), /fill="var\(--blue-fill\)"/.test(svg9), (svg9.match(/<line/g) || []).length, win9.ticks.filter(t => t.on).map(t => t.label)];
    // 10 плоский шов при пустой истории
    const svg10 = H.weightSvg([], '2026-11-04', win9, null, 60);
    out.flat = /<path d="M54 /.test(svg10) && (svg10.match(/<circle/g) || []).length === 0;
    return out;
  });
  ok('масштаб: последние пять, сырое и норма', r.scale === 1900, r.scale);
  ok('остатки: 35/34/33 с перекрытием 1', JSON.stringify(r.segs) === JSON.stringify(['top:0px;height:35px', 'top:34px;height:34px', 'top:67px;height:33px']), r.segs);
  ok('подписи: above px+18, on-line по цели', r.labels[0] === true && r.labels[1] === true, r.labels);
  ok('полосы цели: прогоны и левый ноль', r.bands[0] === 2 && r.bands[1] === true && r.bands[2] === true, r.bands);
  ok('окно: вокруг выбранного', r.win.from === 10 && r.win.to === 40, r.win);
  ok('дорастание: в окне null, вне — расширяется', r.grow[0] === null && r.grow[1] && r.grow[1].to > 40, r.grow);
  ok('недели/периоды: понедельник, граница года', JSON.stringify(r.week) === JSON.stringify(['2026-11-02', '2026-10-26', '2027-01-01', '2025-01-01']), r.week);
  ok('шкала веса: шаг 1 и шаг 5, кратность', r.wscale[0].yMin === 81 && r.wscale[0].yMax === 86 && r.wscale[0].step === 1 && r.wscale[1].yMin === 65 && r.wscale[1].yMax === 85 && r.wscale[1].step === 5, r.wscale);
  ok('svg недели: 2 точки, линия, пилюля СР, сетка 7+6', r.svg[0] === 2 && r.svg[1] === true && r.svg[2] === true && r.svg[3] === 4 + 7 && r.svg[4][0] === 'СР', r.svg);
  ok('плоский шов при пустой истории', r.flat === true);

  // снимки: график истории + график веса, обе темы
  await p.evaluate(() => {
    const H = window.WT2H, S = window.WT2S, C = window.WT2C, J = window.WT2J;
    window.WT2U.fitPhone();
    const st = C.initialState();
    st.drinks = [{ id: 'water', name: 'Вода', hydration: 100, icon: 'drop', color: '#4aa3e8' },
                 { id: 'mors', name: 'Морс', hydration: 99, icon: 'cup', color: '#f0a04b' }];
    [['2026-11-01', 900], ['2026-11-02', 2100], ['2026-11-03', 1500], ['2026-11-04', 1950]].forEach(function (d, i) {
      J.addEntry(st, { date: d[0], time: '10:00', volume: d[1], drink: st.drinks[0] }, i * 2 + 1);
      J.addEntry(st, { date: d[0], time: '12:00', volume: 300, drink: st.drinks[1] }, i * 2 + 2);
    });
    st.weights = [{ id: 'w1', date: '2026-11-02', kg: 82.1, createdAt: 1 }, { id: 'w2', date: '2026-11-03', kg: 81.6, createdAt: 2 }];
    const bars = S.bars(st, '2026-11-04');
    const scale = H.scaleOf(bars);
    bars.forEach(b => { b.goalPx = H.goalPxOf(b, scale); });
    const w = H.windowInit(bars, '2026-11-04', null);
    const chart = '<div class="chart-panel"><div class="chart-scroll"><div class="chart-row">' +
      H.rowHtml(bars, w, scale, '2026-11-04', H.bandsHtml(bars)) + '</div></div></div>';
    const win = H.weightWindow('week', '2026-11-04', '2026-11-04');
    const wsvg = '<div class="w-panel"><div class="w-center"><div class="w-now"><span>Текущий вес</span><b>' + H.fmtKg(81.6) + '</b></div></div>' +
      H.weightSvg(st.weights, '2026-11-04', win, null, 81.6) + '</div>';
    document.getElementById('app').innerHTML = '<div class="screen hist-screen">' + chart + wsvg + '</div>';
    document.querySelector('.chart-scroll').scrollLeft = 0;
  });
  for (const theme of ['dark', 'light']) {
    await p.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    await p.waitForTimeout(120);
    await p.screenshot({ path: 'bench/shots/m11-' + theme + '.png' });
  }
  await b.close();
  console.log(fails ? 'BENCH M11: FAILS=' + fails : 'BENCH M11: ALL GREEN');
  process.exit(fails ? 1 : 0);
})();
