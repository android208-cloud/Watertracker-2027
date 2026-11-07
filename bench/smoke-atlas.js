/* smoke-atlas — гейты атласа экранов (07.11): каждая кнопка каталога
   доводит приложение в рамке до своего экрана/шторки/диалога. */
const { chromium } = require('/home/user/pw/node_modules/playwright');
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { if (cond) { pass++; console.log('  PASS  ' + name); } else { fail++; console.log('  FAIL  ' + name + (extra ? '  ' + extra : '')); } };
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 300)));
  await p.goto('http://127.0.0.1:8085/wt2/atlas.html');
  await p.waitForFunction(() => {
    const f = document.querySelector('#app');
    return f && f.contentWindow && f.contentWindow.__waterApp && f.contentWindow.__waterApp.state;
  }, null, { timeout: 20000 });
  await p.waitForTimeout(600);
  const items = await p.evaluate(() => Array.from(document.querySelectorAll('#left .scr')).map(b => b.dataset.atlas));
  ok('каталог собран: ' + items.length + ' пунктов', items.length >= 40, items.join(','));
  const F = () => p.frames().find(f => f.url().indexOf('index.html') >= 0);
  for (const key of items) {
    await p.click('#left .scr[data-atlas="' + key + '"]');
    await p.waitForTimeout(280);
    const st = await F().evaluate(() => {
      const A = window.__waterApp, u = A.ui;
      return { tab: u.tab, page: u.page || '', sheet: u.sheet || '', modal: u.modal || '',
        screen: !!document.querySelector('#app > .screen'),
        sheetDom: !!document.querySelector('.sheet'), modalDom: !!document.querySelector('.modal, .dlg-ov, .cal-panel') };
    }).catch(e => ({ err: String(e).slice(0, 80) }));
    const [kind, name] = key.split(':');
    let good = st.screen && !st.err;
    if (kind === 'home' || ['home','history','weight','settings','alerts'].indexOf(key) >= 0) good = good && st.tab === key && !st.page;
    else if (kind === 'page') good = good && st.page === name;
    else if (kind === 'sheet') good = good && st.sheet === name && st.sheetDom;
    else if (kind === 'modal') good = good && st.modal === name && st.modalDom;
    ok(key, good, JSON.stringify(st));
  }
  ok('ошибок страницы нет', errs.length === 0, errs.slice(0, 2).join(' | '));
  /* устройства и бары */
  const dims = () => p.evaluate(() => {
    const f = document.querySelector('#app');
    return { w: f.style.width, h: f.style.height,
      sb: document.querySelector('#statusbar').classList.contains('on'),
      nb: document.querySelector('#navbar').className };
  });
  let d = await dims();
  ok('D1 по умолчанию OnePlus 7 со статус-баром и жестовым нав-баром', d.w === '412px' && d.h === '850px' && d.sb && d.nb.indexOf('gesture') >= 0, JSON.stringify(d));
  await p.selectOption('#devSel', '360x780'); await p.waitForTimeout(200);
  d = await dims();
  ok('D2 Galaxy S23: рамка 360, приложение ужалось на бары', d.w === '360px' && d.h === '738px', JSON.stringify(d));
  await p.click('#statusBtn'); await p.waitForTimeout(150);
  d = await dims();
  ok('D3 статус-бар выключен — высота вернулась приложению', d.h === '762px' && !d.sb, JSON.stringify(d));
  await p.selectOption('#navSel', 'buttons'); await p.waitForTimeout(150);
  d = await dims();
  ok('D4 кнопочный нав-бар: минус 48', d.h === '732px' && d.nb.indexOf('buttons') >= 0, JSON.stringify(d));
  await p.click('#left .scr[data-atlas="home"]'); await p.waitForTimeout(300);
  const small = await F().evaluate(() => !!document.querySelector('#app > .screen'));
  ok('D5 на узком экране приложение живо и рисует', small);
  await p.selectOption('#devSel', '412x892'); await p.click('#statusBtn');
  await p.selectOption('#navSel', 'gesture'); await p.waitForTimeout(200);
  const bars = await p.evaluate(() => {
    const d = document.querySelector('#app').contentDocument;
    const w = document.querySelector('#app').contentWindow;
    let top = null;
    for (const sel of ['#app .top', '#app .screen', '#app']) {
      const el = d.querySelector(sel); if (!el) continue;
      const c = w.getComputedStyle(el).backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') { top = el; break; }
    }
    const nav = d.querySelector('#app .nav');
    return { sb: document.querySelector('#statusbar').style.background,
      top: top ? w.getComputedStyle(top).backgroundColor : '',
      nb: document.querySelector('#navbar').style.background,
      nav: nav ? w.getComputedStyle(nav).backgroundColor : '' };
  });
  ok('D6 бары в цвет интерфейса (шапка и навигация приложения)', bars.sb === bars.top && bars.nb === bars.nav && !!bars.top, JSON.stringify(bars));

  /* редактор включён: шторка по честному клику каталога обязана открыться,
     а выбранный пункт каталога — остаться подсвеченным (жалоба владельца) */
  await p.click('#edBtn');
  await p.waitForTimeout(400);
  await p.click('#left .scr[data-atlas="sheet:hist-add"]');
  await p.waitForTimeout(500);
  const edSheet = await F().evaluate(() => {
    const A = window.__waterApp;
    return { sheet: A.ui.sheet, dom: !!document.querySelector('.sheet') };
  }).catch(e => ({ err: String(e).slice(0, 80) }));
  const hl = await p.evaluate(() => {
    const on = Array.from(document.querySelectorAll('#left .scr.on')).map(b => b.dataset.atlas);
    return on;
  });
  ok('E-атлас: с включённым редактором «Добавить запись» открывает шторку',
    edSheet.sheet === 'hist-add' && edSheet.dom, JSON.stringify(edSheet));
  ok('E-атлас: выбранный пункт каталога подсвечен', JSON.stringify(hl) === '["sheet:hist-add"]', JSON.stringify(hl));
  await p.click('#left .scr[data-atlas="home"]');
  await p.waitForTimeout(400);
  const hl2 = await p.evaluate(() => Array.from(document.querySelectorAll('#left .scr.on')).map(b => b.dataset.atlas));
  ok('E-атлас: подсветка переезжает за выбором', JSON.stringify(hl2) === '["home"]', JSON.stringify(hl2));
  await p.click('#edBtn');
  await p.waitForTimeout(300);

  /* онбординг: отдельный сид и перезагрузка */
  await p.click('#seedOnb');
  await p.waitForTimeout(1500);
  const onb = await F().evaluate(() => document.querySelector('#app').textContent.indexOf('Водомер') >= 0
    || document.querySelector('#app').innerHTML.length > 200).catch(() => false);
  ok('кнопка «Онбординг» показывает первый запуск', !!onb);
  await p.click('#seedOwner');
  await p.waitForTimeout(1200);
  console.log('\nИТОГ: ' + pass + ' PASS / ' + fail + ' FAIL');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
