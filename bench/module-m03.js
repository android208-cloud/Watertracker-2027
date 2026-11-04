/* Стенд M03: семантика журнала против чек-листа, вычитанного из донора v158. */
const { chromium } = require('/home/user/pw/node_modules/playwright');
let fails = 0;
const ok = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:8085/wt2/bench/harness3.html');
  await p.waitForFunction(() => window.__harnessReady === 1);
  const r = await p.evaluate(() => {
    const J = window.WT2J, out = {};
    const st = () => ({ dayStart: '02:00', dayStartHistory: [{ from: '', value: '02:00' }, { from: '2026-10-01', value: '03:00' }], entries: [], weights: [], tombstones: { e: {}, w: {} } });
    // 1 dayStartOn из истории
    const s = st();
    out.dso = [J.dayStartOn(s, '2026-09-30'), J.dayStartOn(s, '2026-10-01'), J.dayStartOn(s, '2026-11-04')];
    // 2 entryDay через водные сутки
    out.ed = [J.entryDay(s, { date: '2026-11-04', time: '02:59' }), J.entryDay(s, { date: '2026-11-04', time: '03:00' })];
    // 3 ночной порядок внутри дня
    const s2 = st(); s2.dayStartHistory = [{ from: '', value: '02:00' }];
    const D = '2026-11-04';
    const e0 = J.addEntry(s2, { date: D, time: '23:00', volume: 100, drink: { id: 'water', name: 'Вода', hydration: 100 } }, 0);
    const e1 = J.addEntry(s2, { date: D, time: '00:30', volume: 100, drink: { id: 'water', name: 'Вода', hydration: 100 } }, 1);
    const e2 = J.addEntry(s2, { date: D, time: '03:00', volume: 100, drink: { id: 'water', name: 'Вода', hydration: 100 } }, 2);
    const e3 = J.addEntry(s2, { date: '2026-11-05', time: '01:00', volume: 100, drink: { id: 'water', name: 'Вода', hydration: 100 } }, 3);
    out.order = J.dayEntries(s2, D).map(e => e.time);
    out.orderPrev = J.dayEntries(s2, '2026-11-03').map(e => e.time);
    out.dayOfLate = J.entryDay(s2, { date: '2026-11-05', time: '01:00' });
    // 4 addEntry: credited, markAlive снимает могилу
    const s3 = st(); s3.dayStartHistory = [{ from: '', value: '02:00' }];
    const w = { id: 'x', date: D, time: '10:00', drinkId: 'water', name: 'Вода', volume: 350, createdAt: 100 };
    J.markDeleted(s3, [w], 'e');
    out.tombBefore = !!s3.tombstones.e[J.entryKey(w)];
    const added = J.addEntry(s3, { date: D, time: '10:00', volume: 350, drink: { id: 'water', name: 'Вода', hydration: 90 } }, 500);
    out.credited = added.credited;
    out.tombAfter = !!s3.tombstones.e[J.entryKey(w)];
    // 5 mergeGuard: старое удалённое не возвращается, свежий дубль проходит
    const s4 = st(); s4.dayStartHistory = [{ from: '', value: '02:00' }];
    const old = { id: 'o', date: D, time: '09:00', drinkId: 'tea', name: 'Чай', volume: 200, createdAt: 1000 };
    const ts = J.markDeleted(s4, [old], 'e');
    const g1 = J.mergeGuard(s4, [Object.assign({}, old)], []);
    const fresh = Object.assign({}, old, { createdAt: ts + 1 });
    const g2 = J.mergeGuard(s4, [fresh], []);
    out.blocked = [g1.entries.length, g2.entries.length];
    // 6 веса: ключ с округлением, блокировка
    const s5 = st();
    const wg = { date: D, kg: 82.34, createdAt: 10 };
    J.markDeleted(s5, [wg], 'w');
    out.wkey = J.weightKey(wg);
    out.wblocked = J.mergeGuard(s5, [], [Object.assign({}, wg)]).weights.length;
    out.wfresh = J.mergeGuard(s5, [], [Object.assign({}, wg, { createdAt: Date.now() + 5 })]).weights.length;
    // 7 editEntry: updatedAt + пересчёт credited
    const s6 = st(); s6.dayStartHistory = [{ from: '', value: '02:00' }];
    const ee = J.addEntry(s6, { date: D, time: '12:00', volume: 200, drink: { id: 'water', name: 'Вода', hydration: 100 } }, 7);
    J.editEntry(s6, ee.id, { volume: 400 }, 9);
    out.edit = [s6.entries[0].credited, s6.entries[0].updatedAt];
    // 8 prune: старше 180 дней долой
    const s7 = st();
    s7.tombstones.e['a|1|x|1'] = Date.now() - 200 * 86400000;
    s7.tombstones.e['b|1|x|1'] = Date.now() - 1000;
    window.WT2C.pruneTombstones(s7);
    out.prune = [!!s7.tombstones.e['a|1|x|1'], !!s7.tombstones.e['b|1|x|1']];
    // 9 события шины
    const seen = [];
    window.WT2R.on('journal:add', d => seen.push('add:' + d.volume));
    window.WT2R.on('*', ev => seen.push('star:' + ev.ev));
    const s8 = st(); s8.dayStartHistory = [{ from: '', value: '02:00' }];
    J.addEntry(s8, { date: D, time: '13:00', volume: 250, drink: { id: 'water', name: 'Вода', hydration: 100 } }, 11);
    out.bus = seen;
    // 14 setDayStart (C-001): история смен, замена того же дня, мусор отклонён
    const s14 = window.WT2C.initialState();
    window.WT2J.setDayStart(s14, '05:00', '2026-11-04');
    out.ds = [s14.dayStartHistory.map(h => (h.from || '*') + '@' + h.value), window.WT2J.setDayStart(s14, 'xx', '2026-11-04'), s14.dayStart];
    return out;
  });
  ok('dayStartOn history', JSON.stringify(r.dso) === JSON.stringify(['02:00', '03:00', '03:00']), r.dso);
  ok('entryDay 02:59→prev, 03:00→same', JSON.stringify(r.ed) === JSON.stringify(['2026-11-03', '2026-11-04']), r.ed);
  ok('night order 03:00,23:00,+1d01:00', JSON.stringify(r.order) === JSON.stringify(['03:00', '23:00', '01:00']), r.order);
  ok('00:30 of D lands in D-1', JSON.stringify(r.orderPrev) === JSON.stringify(['00:30']), r.orderPrev);
  ok('late night belongs prev day', r.dayOfLate === '2026-11-04', r.dayOfLate);
  ok('tomb set then markAlive clears', r.tombBefore === true && r.tombAfter === false);
  ok('credited 350*90%=315', r.credited === 315, r.credited);
  ok('mergeGuard blocks old, passes fresh', JSON.stringify(r.blocked) === JSON.stringify([0, 1]), r.blocked);
  ok('weight key 82.34→823', r.wkey === '2026-11-04|823', r.wkey);
  ok('weight merge old blocked, fresh ok', r.wblocked === 0 && r.wfresh === 1);
  ok('edit recomputes credited+updatedAt', JSON.stringify(r.edit) === JSON.stringify([400, 9]), r.edit);
  ok('prune 180d', JSON.stringify(r.prune) === JSON.stringify([false, true]), r.prune);
  ok('bus emits add + star', JSON.stringify(r.bus) === JSON.stringify(['add:250', 'star:journal:add']), r.bus);
  ok('setDayStart: история/замена/мусор', JSON.stringify(r.ds[0]) === JSON.stringify(['*@02:00', '2026-11-04@05:00']) && r.ds[1] === false && r.ds[2] === '05:00', r.ds);
  await b.close();
  console.log(fails ? 'BENCH M03: FAILS=' + fails : 'BENCH M03: ALL GREEN');
  process.exit(fails ? 1 : 0);
})();
