/* Стенд M14: пак watercat-24, слияние, тишина (C-015/C-014/C-002/C-024).
   Живая фикстура — база владельца vodomer-baza-…-8762.json (только чтение). */
const { chromium } = require('/home/user/pw/node_modules/playwright');
let fails = 0;
const ok = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage();
  await p.goto('http://127.0.0.1:8085/wt2/bench/harness9.html');
  await p.waitForFunction(() => window.__harnessReady === 1);
  const r = await p.evaluate(async () => {
    const Y = window.WT2Y, C = window.WT2C, J = window.WT2J, out = {};
    const mk = () => {
      const st = C.initialState();
      st.drinks = [{ id: 'water', name: 'Вода', hydration: 100, icon: 'drop', color: '#4aa3e8' }];
      return st;
    };
    // 1 форма пака
    const a = mk();
    J.addEntry(a, { date: '2026-11-03', time: '10:00', volume: 250, drink: a.drinks[0] }, 1);
    J.addEntry(a, { date: '2026-11-01', time: '09:00', volume: 200, drink: a.drinks[0] }, 2);
    a.theme = 'light'; a.dayStart = '03:00'; a.dayStartHistory = [{ from: '', value: '02:00' }, { from: '2026-10-01', value: '03:00' }];
    const pack = Y.exportPack(a, { nowIso: '2026-11-04T00:00:00.000Z' });
    out.pack = [pack.source, pack.version, pack.entries.map(e => e.date), pack.settings.theme, pack.profile.dayStart, pack.counts.entries, !!pack.tombstones];
    // 2 round-trip restore
    const bSt = mk(); delete bSt.onboarded;
    const rr = Y.applyPack(bSt, JSON.parse(JSON.stringify(pack)), 'restore', {});
    out.rt = [rr.ok, bSt.entries.length, bSt.entries[0].date, bSt.dayStart, JSON.stringify(bSt.dayStartHistory), bSt.onboarded];
    // 3 merge: дубль заменяется, новое добавляется
    const cSt = mk();
    J.addEntry(cSt, { date: '2026-11-01', time: '09:00', volume: 200, drink: cSt.drinks[0] }, 5);
    const pack3 = JSON.parse(JSON.stringify(pack));
    const m = Y.applyPack(cSt, pack3, 'merge', {});
    out.merge = [m.added, cSt.entries.length, cSt.entries.filter(e => e.date === '2026-11-01').length];
    // 4 могилы: удалённое не возвращается, свежая метка побеждает
    const dSt = mk();
    J.addEntry(dSt, { date: '2026-11-03', time: '10:00', volume: 250, drink: dSt.drinks[0] }, 7);
    J.deleteEntries(dSt, [dSt.entries[0]]);
    dSt.tombstones.w = { 'k1|1': 500, 'k2|2': 500 };
    const pack4 = JSON.parse(JSON.stringify(pack));
    pack4.tombstones.e = Object.assign({}, pack4.tombstones.e, { 'somekey': 1234567890123 });
    pack4.tombstones.w = { 'wkey': 777 };
    const ap4 = Y.applyPack(dSt, pack4, 'merge', {});
    out.tombs = [ap4.dropped, dSt.entries.filter(e => e.date === '2026-11-03' && e.time === '10:00').length, dSt.tombstones.w.wkey, Object.keys(dSt.tombstones.w).length];
    // 5 настройки: знакомое принято, мусор отклонён, lc колбэком
    const eSt = mk();
    let lcGot = null;
    Y.applySettings(eSt, { theme: 'oneplus', cupLabel: 'nope', rowCustom: true, habitAuto: 1, paceGoals: { week: 2100 }, notifications: { everyMin: 90, days: [1] }, lc: { x: 1 } }, { importLc: v => { lcGot = v; } });
    out.settings = [eSt.theme, eSt.cupLabel, eSt.rowCustom, eSt.habitAuto, eSt.paceGoals.week, eSt.notifications.days, lcGot];
    // 6 решение слать и слова итога
    out.up = [Y.shouldUpload('restore', 'a', 'b', {}, {}), Y.shouldUpload('sync', 'a', 'a', { e: {} }, Y.tombSig({ e: {} })), Y.shouldUpload('sync', 'a', 'b', { e: {} }, Y.tombSig({ e: {} }))];
    out.say = [Y.cloudSay('auto', 0, 42), Y.cloudSay('auto', 3, 42), Y.cloudSay('sync', 0, 42)];
    // 7 живая база владельца
    const resp = await fetch('/vodomer-baza-2026-10-26-restore-1308-8762.json');
    const live = await resp.json();
    const fSt = mk(); delete fSt.onboarded;
    const lv = Y.applyPack(fSt, live, 'merge', {});
    out.live = [lv.ok, fSt.entries.length > 0, fSt.onboarded, fSt.historySource, fSt.entries.length, lv.added >= 0];
    return out;
  });
  ok('пак: source/v2/сортировка/настройки/профиль/счётчики/могилы', JSON.stringify(r.pack) === JSON.stringify(['watercat-24', 2, ['2026-11-01', '2026-11-03'], 'light', '03:00', 2, true]), r.pack);
  ok('round-trip: записи, начало суток, C-014', r.rt[0] === true && r.rt[1] === 2 && r.rt[2] === '2026-11-01' && r.rt[3] === '03:00' && r.rt[5] === 1, r.rt);
  ok('merge: дубль заменён, новое добавлено', r.merge[0] === 1 && r.merge[1] === 2 && r.merge[2] === 1, r.merge);
  ok('могилы: удалённое не вернулось, свежая метка принята, purge съел пару', r.tombs[0] === 1 && r.tombs[1] === 0 && r.tombs[2] === 777 && r.tombs[3] === 1, r.tombs);
  ok('настройки: знакомое принято, мусор отклонён, lc колбэком', r.settings[0] === 'oneplus' && r.settings[1] == null && r.settings[2] === true && r.settings[3] === 1 && r.settings[4] === 2100 && Array.isArray(r.settings[5]) && r.settings[5].length === 7 && JSON.stringify(r.settings[6]) === JSON.stringify({ x: 1 }), r.settings);
  ok('решение слать: restore молчит, равенство молчит, разница шлёт', JSON.stringify(r.up) === JSON.stringify([false, false, true]), r.up);
  ok('C-015 тишина: auto без нового молчит', r.say[0] === null && r.say[1].indexOf('3') === 29 && r.say[2] === 'Синхронизировано: всего 42 записей — всё совпадает', r.say);
  ok('живая база владельца: принята merge, C-014', r.live[0] === true && r.live[1] === true && r.live[2] === 1 && r.live[3] === 'watercat-24' && r.live[4] > 100 && r.live[5] === true, r.live);
  await b.close();
  console.log(fails ? 'BENCH M14: FAILS=' + fails : 'BENCH M14: ALL GREEN');
  process.exit(fails ? 1 : 0);
})();
