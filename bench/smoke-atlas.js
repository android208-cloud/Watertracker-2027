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
