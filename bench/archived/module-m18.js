/* Стенд M18: журнал шины «*», паспорт, живая волна-диагностика (C-019),
   рубильники optional (П2), вход пятью тапами по «Версия …», пакет партнёру. */
const { chromium } = require('/home/user/pw/node_modules/playwright');
let fails = 0;
const ok = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 412, height: 892 } })).newPage();
  await p.goto('http://127.0.0.1:8085/wt2/bench/harness12.html');
  await p.waitForFunction(() => window.__harnessReady === 1);
  const r = await p.evaluate(async () => {
    const U = window.WT2U, G = window.WT2G, R = window.WT2R, out = {};
    const shell = U.shellState();
    let renders = 0;
    const env = { shell: shell, render: () => renders++, closeSheet: () => {}, closeSwipes: () => {}, getState: () => ({ goal: 1947, dayStart: '02:00' }) };
    G.startJournal();
    // 1 журнал: события и потолок
    R.emit('bench:one', { a: 1 });
    R.emit('bench:two', { b: [1, 2] });
    const mid = G.getJournal().map(m => m.ev);
    for (let i = 0; i < 500; i++) R.emit('bench:flood', { i: i });
    out.journal = { mid: mid.slice(-2), cap: G.getJournal().length, capConst: G.JOURNAL_CAP, last: G.getJournal().slice(-1)[0].ev };
    // 2 паспорт
    const pass = G.passport(env);
    out.passport = [pass.includes(navigator.userAgent), pass.includes('МОДУЛИ:'), /M18 сл\.5 \[C-019,C-021\] optional:вкл/.test(pass), pass.includes('ХРАНЫ:'), pass.includes('ВОЛНА (C-019):'), pass.includes('настройки воды: null'), pass.includes('ЖУРНАЛ ШИНЫ')];
    // 3 живая волна: узел в DOM меряется
    const w = document.createElement('div');
    w.className = 'cat-wave w1';
    const st = document.createElement('style');
    st.textContent = '@keyframes wtbench{from{transform:translateX(0)}to{transform:translateX(-40px)}} .cat-wave.w1{animation:wtbench 3s linear infinite}';
    document.head.appendChild(st); document.body.appendChild(w);
    const wave = G.waveRows();
    out.wave = [wave.count, wave.rows.includes('wtbench'), wave.rows.includes('3s'), wave.rows.includes('running'), wave.rows.includes('живых: 1')];
    w.remove(); st.remove();
    // 4 экран и рубильники
    shell.tab = 'settings';
    const ov = G.open(env);
    const cb = ov.querySelector('input[data-module="M18"]');
    const onBefore = R.isOn('M18');
    cb.checked = false; cb.dispatchEvent(new Event('change'));
    const onAfter = R.isOn('M18');
    const dbgStored = JSON.parse(localStorage.getItem(R.DBG_KEY) || '{}');
    cb.checked = true; cb.dispatchEvent(new Event('change'));
    const onBack = R.isOn('M18');
    // клик по рубильникам не закрывает, клик по паспорту закрывает
    ov.querySelector('div[style*="border-top"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const alive = !!document.getElementById('wt-diag');
    ov.querySelector('pre').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    out.toggles = [onBefore, onAfter === false, dbgStored.M18 === true, onBack, alive, !document.getElementById('wt-diag'), renders >= 2, JSON.parse(localStorage.getItem(R.DBG_KEY) || '{}').M18 === undefined || JSON.parse(localStorage.getItem(R.DBG_KEY) || '{}').M18 === false];
    // 5 вход пятью тапами по «Версия …»
    G.bind(env);
    shell.tab = 'settings'; shell.page = null;
    const ver = document.createElement('div'); ver.className = 'set-ver'; ver.textContent = 'Версия 2.0';
    document.getElementById('app').appendChild(ver);
    for (let i = 0; i < 2; i++) ver.click();
    await new Promise(res => setTimeout(res, 10));
    for (let i = 0; i < 3; i++) ver.click();
    await new Promise(res => setTimeout(res, 600));
    out.entry = [!!document.getElementById('wt-diag'), shell.tab];
    const ov2 = document.getElementById('wt-diag'); if (ov2) ov2.remove();
    // медленные тапы счёт сбрасывают
    ver.click(); await new Promise(res => setTimeout(res, 10)); ver.click();
    await new Promise(res => setTimeout(res, 2600));
    ver.click(); ver.click(); ver.click();
    await new Promise(res => setTimeout(res, 500));
    out.slow = !document.getElementById('wt-diag');
    ver.remove();
    // 6 пакет партнёру
    const pk = G.pack(env);
    out.pack = [pk.app === 'watertracker-next', !!pk.builtAt, pk.passport.includes('Отладчик'), pk.journal.length > 0, pk.state && pk.state.goal === 1947, Array.isArray(pk.storages), 'dbg' in pk];
    return out;
  });
  ok('журнал шины «*»: события пишутся, потолок 400', r.journal.mid[0] === 'bench:one' && r.journal.mid[1] === 'bench:two' && r.journal.cap === r.journal.capConst && r.journal.last === 'bench:flood', r.journal);
  ok('паспорт: UA, модули с optional-статусом, храны, волна, вода, журнал', r.passport.every(Boolean), r.passport);
  ok('C-019 волна живьём: слой меряется из DOM (анимация/длительность/статус/живые)', r.wave.every(Boolean), r.wave);
  ok('П2 рубильники: выкл/вкл через чекбокс, ключ wt2-debug-v1, клик не закрывает, фон закрывает', r.toggles.every(Boolean), r.toggles);
  ok('вход: пять тапов по «Версия …» → выход на главный + экран через 400 мс', r.entry[0] === true && r.entry[1] === 'home', r.entry);
  ok('окно 2500 мс: медленные тапы счёт сбрасывают', r.slow === true);
  ok('пакет партнёру: паспорт+журнал+стейт+храны+dbg одним JSON', r.pack.every(Boolean), r.pack);
  await b.close();
  console.log(fails ? 'BENCH M18: FAILS=' + fails : 'BENCH M18: ALL GREEN');
  process.exit(fails ? 1 : 0);
})();
