/* Стенд M10: числовое ядро статистики против чек-листа донора v158 (2574–2643). */
const { chromium } = require('/home/user/pw/node_modules/playwright');
let fails = 0;
const ok = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage();
  await p.goto('http://127.0.0.1:8085/wt2/bench/harness6.html');
  await p.waitForFunction(() => window.__harnessReady === 1);
  const r = await p.evaluate(() => {
    const S = window.WT2S, C = window.WT2C, J = window.WT2J, L = window.WT2L, out = {};
    const base = () => {
      const st = C.initialState();
      st.drinks = [{ id: 'water', name: 'Вода', hydration: 100, icon: 'drop', color: '#4aa3e8' },
                   { id: 'mors', name: 'Морс', hydration: 99, icon: 'cup', color: '#f0a04b' }];
      return st;
    };
    // 1 goalFor: оверрайд прошлого дня, сегодня — формула
    const s1 = base(); s1.dayGoals = { '2026-10-01': 2500 };
    out.goal = [S.goalFor(s1, '2026-10-01', '2026-11-04'), S.goalFor(s1, '2026-11-04', '2026-11-04') === L.goalOn(s1, '2026-11-04', '2026-11-04')];
    // 2 dayStats: объём против зачёта (морс 99%)
    const s2 = base();
    J.addEntry(s2, { date: '2026-11-04', time: '10:00', volume: 200, drink: s2.drinks[0] }, 1);
    J.addEntry(s2, { date: '2026-11-04', time: '11:00', volume: 100, drink: s2.drinks[1] }, 2);
    const ds = S.dayStats(s2, '2026-11-04');
    out.stats = [ds.volume, ds.credited, ds.pct > 0];
    // 3 цвета столбцов
    out.colors = [S.barColor({ drinkId: 'water', color: '#4aa3e8' }), S.barColor({ drinkId: 'water', color: '#123456' }), S.barColor({ name: 'Призрак' })];
    // 4 труба: старт от первой записи, порядок каталога, сирота последняя
    const s4 = base();
    J.addEntry(s4, { date: '2026-11-01', time: '10:00', volume: 250, drink: s4.drinks[0] }, 1);
    J.addEntry(s4, { date: '2026-11-03', time: '10:00', volume: 100, drink: s4.drinks[1] }, 2);
    J.addEntry(s4, { date: '2026-11-03', time: '12:00', volume: 300, drink: { id: 'ghost', name: 'Призрак', color: null } }, 3);
    J.addEntry(s4, { date: '2026-11-03', time: '13:00', volume: 50, drink: s4.drinks[1] }, 4);
    const br = S.bars(s4, '2026-11-04');
    out.bars = [br[0].date, br.length, br[br.length - 2].segs.map(g => g.color + ':' + g.raw), br[br.length - 2].raw];
    // 5 ночь: 00:30 уходит в предыдущий водный день
    const s5 = base();
    J.addEntry(s5, { date: '2026-11-04', time: '00:30', volume: 200, drink: s5.drinks[0] }, 5);
    const br5 = S.bars(s5, '2026-11-04');
    out.night = br5.filter(x => x.raw > 0).map(x => x.date + ':' + x.raw);
    // 6 пустая база: окно today-9
    const br6 = S.bars(base(), '2026-11-04');
    out.empty = [br6[0].date, br6.length, br6.every(x => x.raw === 0)];
    return out;
  });
  ok('goalFor: оверрайд и формула', r.goal[0] === 2500 && r.goal[1] === true, r.goal);
  ok('dayStats: объём 300, зачёт 299', r.stats[0] === 300 && r.stats[1] === 299 && r.stats[2] === true, r.stats);
  ok('цвета: вода светлее, своя вода своя, сирота запасная', JSON.stringify(r.colors) === JSON.stringify(['#61c2f9', '#123456', '#5cb4e6']), r.colors);
  ok('труба: старт 01.11, сегменты каталогом, сирота в конце', r.bars[0] === '2026-11-01' && r.bars[1] === 4 && JSON.stringify(r.bars[2]) === JSON.stringify(['#f0a04b:150', '#5cb4e6:300']) && r.bars[3] === 450, r.bars);
  ok('ночь: 00:30 в предыдущем дне', JSON.stringify(r.night) === JSON.stringify(['2026-11-03:200']), r.night);
  ok('пусто: окно 10 дней', r.empty[0] === '2026-10-26' && r.empty[1] === 10 && r.empty[2] === true, r.empty);
  await b.close();
  console.log(fails ? 'BENCH M10: FAILS=' + fails : 'BENCH M10: ALL GREEN');
  process.exit(fails ? 1 : 0);
})();
