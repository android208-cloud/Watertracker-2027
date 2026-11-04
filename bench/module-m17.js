/* Стенд M17: системные бары по измеренным цветам (C-010), «Назад» системой,
   нативные пикеры, спека иконки/старта (C-011/C-012). */
const { chromium } = require('/home/user/pw/node_modules/playwright');
let fails = 0;
const ok = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 412, height: 892 } })).newPage();
  await p.goto('http://127.0.0.1:8085/wt2/bench/harness11.html');
  await p.waitForFunction(() => window.__harnessReady === 1);
  const r = await p.evaluate(async () => {
    const U = window.WT2U, X = window.WT2X, out = {};
    U.ICON_BASE_SET('../assets/icons/');
    const shell = U.shellState();
    const calls = { backDone: 0, requestExit: 0, bars: [] };
    window.WaterShell = {
      backDone: () => calls.backDone++,
      requestExit: () => calls.requestExit++,
      bars: (s, sd, n, nd) => calls.bars.push([s, sd, n, nd])
    };
    X.bind({ shell: shell, render: () => {}, closeSheet: () => {}, closeSwipes: () => {} });
    // разметка: шапка + навигация
    document.getElementById('app').innerHTML = '<div class="screen home-screen"><div class="top plain"><h1>Тест</h1></div></div>' + U.navHtml(shell);
    // 1 системная «Назад»: шаг есть —.step, нет — requestExit
    shell.tab = 'history';
    const can1 = window.WaterBack.canBack();
    const done1 = window.WaterBack.backOrExit();
    const tabAfter = shell.tab;
    shell.tab = 'home';
    const can2 = window.WaterBack.canBack();
    const done2 = window.WaterBack.backOrExit();
    out.back = [can1, done1, tabAfter, can2, done2, calls.backDone, calls.requestExit];
    // 2 бары: темы
    const grab = () => new Promise(res => setTimeout(() => res(calls.bars[calls.bars.length - 1]), 150));
    document.documentElement.setAttribute('data-theme', 'dark');
    window.WaterBars.sync();
    const dark = await grab();
    document.documentElement.setAttribute('data-theme', 'light');
    window.WaterBars.sync();
    const light = await grab();
    out.bars = { dark: dark, light: light };
    // 3 пикеры без оболочки и roundtrip done
    const noBridge = await window.WaterNative.pickNumber({ title: 't', value: 1 });
    window.WaterBridge = { pickNumber: (id, json) => { window.__pid = id; window.__pjson = json; } };
    const pr = window.WaterNative.pickNumber({ title: 'Вес', value: 59.1 });
    window.WaterNative.done(window.__pid, '42');
    const got = await pr;
    window.WaterBridge = null;
    out.native = [noBridge, got, JSON.parse(window.__pjson).value];
    // 4 goHome
    shell.tab = 'alerts'; shell.page = 'x';
    window.__waterGoHome();
    out.goHome = [shell.tab, shell.page];
    out.spec = [X.ICON_SPEC.legacy.face, X.ICON_SPEC.legacy.bg, X.ICON_SPEC.adaptive, X.SPLASH_SPEC];
    return out;
  });
  ok('назад системой: шаг цепи, затем выход', r.back[0] === true && r.back[1] === true && r.back[2] === 'home' && r.back[3] === false && r.back[5] === 1 && r.back[6] === 1, r.back);
  ok('C-010 бары: тёмные значки на светлой полосе, булевы флаги (v149)', r.bars.dark[1] === false && r.bars.light[1] === true && typeof r.bars.dark[1] === 'boolean' && typeof r.bars.light[3] === 'boolean' && r.bars.dark[0] !== r.bars.light[0], r.bars);
  ok('нав-бар: белые значки на синем в обеих темах', r.bars.dark[3] === false && r.bars.light[3] === false, r.bars);
  ok('пикеры: без оболочки null, done разрывает ожидание', r.native[0] === null && r.native[1] === '42' && r.native[2] === 59.1, r.native);
  ok('goHome: тап по уведомлению на главный', r.goHome[0] === 'home' && r.goHome[1] === null, r.goHome);
  ok('C-011/C-012 спека: лицо/фон/adaptive/старт с мордочкой', JSON.stringify(r.spec[0]) === JSON.stringify([0.5104, 0.5, 0.6146]) && r.spec[1] === '#2EA0EA' && r.spec[2].faceShare === 0.34 && r.spec[2].faceCy === 0.5746 && r.spec[3].withFace === true, r.spec);
  await b.close();
  console.log(fails ? 'BENCH M17: FAILS=' + fails : 'BENCH M17: ALL GREEN');
  process.exit(fails ? 1 : 0);
})();
