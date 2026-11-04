/* Стенд M20: оболочка против чек-листа донора v158 + контракты C-007/C-013/C-015.
   Снимки глазам: bench/shots/m20-dark.png, m20-light.png (в git не входят). */
const { chromium } = require('/home/user/pw/node_modules/playwright');
let fails = 0;
const ok = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 412, height: 892 } })).newPage();
  await p.goto('http://127.0.0.1:8085/wt2/bench/harness4.html');
  await p.waitForFunction(() => window.__harnessReady === 1);

  const r = await p.evaluate(() => {
    const U = window.WT2U, out = {};
    // 1 nav
    const sh = U.shellState();
    const nav = U.navHtml(sh);
    out.nav = [ (nav.match(/data-tab="(\w+)"/g) || []).map(s => s.slice(10, -1)),
      /class="on" data-act="goto" data-tab="home"/.test(nav), (nav.match(/data-svg-lock/g) || []).length,
      (nav.match(/aria-label="([^"]+)"/g) || []).map(s => s.slice(12, -1)) ];
    // 2 цепь «Назад»: порядок модал > диалог > шторка > leaving > свайп > страница > таб
    const calls = [];
    const env = { render: () => calls.push('render'), closeSheet: () => { calls.push('sheet'); s2.sheet = null; }, closeSwipes: () => { calls.push('swipes'); s2.openSwipe = null; } };
    const s2 = U.shellState();
    s2.modal = 'calendar'; s2.dialog = { title: 'x' }; s2.sheet = 'weight'; s2.openSwipe = 'e1'; s2.page = 'drinks'; s2.tab = 'settings';
    const seq = [];
    seq.push(U.backStep(s2, env)); // modal (+dialog forgotten)
    seq.push([s2.modal, s2.dialog]);
    s2.dialog = { title: 'y' };
    seq.push(U.backStep(s2, env)); seq.push(s2.dialog); // dialog
    seq.push(U.backStep(s2, env)); // sheet
    s2.sheetLeaving = true; seq.push(U.backStep(s2, env)); seq.push(s2.sheetLeaving); // leaving consumed
    s2.sheetLeaving = false; seq.push(U.backStep(s2, env)); // swipe
    seq.push(U.backStep(s2, env)); seq.push(s2.page); // page -> null (no hooks yet on this page)
    seq.push(U.backStep(s2, env)); seq.push(s2.tab); // tab -> home
    seq.push(U.backStep(s2, env)); // home: nothing
    out.chain = seq;
    // 3 фантом v161: шторка-призрак не сжигает нажатие
    const s3 = U.shellState();
    s3.sheet = 'ghost'; s3.tab = 'history';
    const env3 = { has: sel => false, render: () => {}, closeSheet: () => {}, closeSwipes: () => {} };
    const one = U.backStep(s3, env3);
    out.phantom = [one, s3.tab, U.backStep(s3, env3)];
    // 4 делегат страниц: свой каскад модуля
    U.registerBackPage(s => { if (s.page === 'create') { s.page = 'drinks'; return true; } return false; });
    const s4 = U.shellState(); s4.page = 'create';
    U.backStep(s4, { render: () => {} }); const mid = s4.page;
    U.backStep(s4, { render: () => {} });
    out.pageHook = [mid, s4.page];
    // 5 goHome
    const s5 = U.shellState();
    s5.modal = 'a'; s5.dialog = {}; s5.sheet = 'w'; s5.page = 'x'; s5.tab = 'alerts';
    U.goHome(s5, { render: () => {}, closeSwipes: () => {} });
    out.goHome = [s5.tab, s5.page, s5.modal, s5.dialog, s5.sheet];
    // 6 разметка кубиков
    out.markup = [
      /class="modal-scrim"/.test(U.dialog({ cls: 'modal', title: 't', actions: [{ act: 'a', label: 'A' }] })),
      /class="scrim\s+heavy"/.test(U.sheet({ scrimCls: ' heavy', cls: 'weight' })),
      /class="icon-btn left"/.test(U.roundBtn({ role: 'head', side: 'left', act: 'a' })),
      /class="fab"/.test(U.roundBtn({ role: 'fab', act: 'a' })),
      /class="check center"/.test(U.roundBtn({ role: 'check', pos: 'center', act: 'a' })),
      /class="time-btn/.test(U.roundBtn({ role: 'time', act: 'a' })),
      /class="preset on" data-act="v" data-v="350"/.test(U.chipRow({ act: 'v', values: [200, 350], selected: 350 })),
      /<span class="radio"><\/span>/.test(U.optionList({ act: 'o', items: [{ value: 1, label: 'x', on: true }] })),
      U.pillHtml({ slot: { c: 0, r: 2 }, act: 'open-volume', label: '350 мл', icon: '<span class="mini-cat"></span>' }),
      U.pillHtml({ slot: { c: 2, r: 2 }, cls: 'cup-pill', aria: 'Чашка котика: 3', label: 'Чашка 3', icon: '<span class="mini-cat"></span>' })
    ];
    return out;
  });

  ok('nav: порядок/активный/lock×5/aria', JSON.stringify(r.nav[0]) === JSON.stringify(['home','history','weight','settings','alerts']) && r.nav[1] === true && r.nav[2] === 5 && JSON.stringify(r.nav[3]) === JSON.stringify(['Главная','История','Вес','Настройки','Уведомления']), r.nav);
  ok('цепь назад: порядок донора', JSON.stringify(r.chain) === JSON.stringify([true,[null,null],true,null,true,true,true,true,true,null,true,'home',false]), r.chain);
  ok('фантом v161: одно нажатие — домой', r.phantom[0] === true && r.phantom[1] === 'home' && r.phantom[2] === false, r.phantom);
  ok('делегат страниц: create->drinks->null', r.pageHook[0] === 'drinks' && r.pageHook[1] === null, r.pageHook);
  ok('goHome: всё сброшено, tab=home', JSON.stringify(r.goHome) === JSON.stringify(['home',null,null,null,null]), r.goHome);
  ok('разметка кубиков', r.markup.slice(0,8).every(Boolean) && /--c:0;--r:2/.test(r.markup[8]) && /data-act="open-volume"/.test(r.markup[8]) && /class="pill cup-pill" role="img"/.test(r.markup[9]), r.markup.slice(0,8));

  // C-007 пилюли: геометрия/цвета из computed styles, обе темы + снимки
  await p.evaluate(() => {
    const U = window.WT2U;
    const dock = '<div class="home-dock">' +
      U.pillHtml({ slot: { c: 0, r: 2 }, act: 'open-volume', label: '350 мл', icon: '<span class="mini-cat"></span>' }) +
      U.pillHtml({ slot: { c: 2, r: 2 }, cls: 'cup-pill', aria: 'Чашка котика: 3', label: 'Чашка 3', icon: '<span class="mini-cat"></span>' }) +
      '</div>' + U.navHtml(U.shellState());
    document.getElementById('app').innerHTML = dock;
  });
  for (const theme of ['dark','light']) {
    await p.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    await p.waitForTimeout(120);
    const c = await p.evaluate(() => {
      const pill = document.querySelector('.pill');
      const span = pill.querySelector('span:last-child');
      const cat = pill.querySelector('.mini-cat');
      const cs = getComputedStyle(pill), ss = getComputedStyle(span), fs = getComputedStyle(cat);
      return { bg: cs.backgroundColor, color: ss.color, filter: fs.filter, radius: cs.borderRadius, h: pill.getBoundingClientRect().height };
    });
    if (theme === 'dark') {
      ok('C-007 тёмная: подпись #5aade8, иконка БЕЗ invert', c.color === 'rgb(90, 173, 232)' && c.filter === 'none', c);
    } else {
      ok('C-007 светлая: пилюля #78ceff, подпись #fff, мордочка белая', c.bg === 'rgb(120, 206, 255)' && c.color === 'rgb(255, 255, 255)' && /invert\(1\)/.test(c.filter), c);
    }
    await p.screenshot({ path: 'bench/shots/m20-' + theme + '.png' });
  }

  // C-015 тост: появился и сам ушёл за 2400 мс
  const t0 = await p.evaluate(() => {
    const sh = window.WT2U.shellState();
    window.__tsh = sh;
    window.WT2U.toast(sh, 'Порядок сохранён', () => {
      document.getElementById('app').insertAdjacentHTML('beforeend', window.WT2U.toastHtml(sh));
    });
    document.getElementById('app').insertAdjacentHTML('beforeend', window.WT2U.toastHtml(sh));
    return !!document.querySelector('.toast');
  });
  await p.waitForTimeout(2600);
  const t1 = await p.evaluate(() => { document.querySelectorAll('.toast').forEach(e => e.remove()); return window.__tsh.toast; });
  ok('C-015 тост: жил и умер сам (2400 мс)', t0 === true && t1 === null, [t0, t1]);

  await b.close();
  console.log(fails ? 'BENCH M20: FAILS=' + fails : 'BENCH M20: ALL GREEN');
  process.exit(fails ? 1 : 0);
})();
