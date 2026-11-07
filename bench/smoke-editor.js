/* Атлас-редактор: сетка, выбор, перетаскивание с прилипанием, размер,
   шрифт/радиус/текст, закрепление тоста, журнал и отчёт.
   node bench/smoke-editor.js */
const { chromium } = require('/home/user/pw/node_modules/playwright');
const BASE = 'http://127.0.0.1:8085/wt2/atlas.html';
let pass = 0, fail = 0;
const ok = (n, c, x) => { console.log((c ? '  PASS  ' : '  FAIL  ') + n + (x ? '  ' + x : '')); c ? pass++ : fail++; };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('  [pageerror]', String(e).slice(0, 160)));
  await p.goto(BASE);
  await p.waitForFunction(() => {
    const f = document.querySelector('#app');
    return f && f.contentWindow && f.contentWindow.__waterApp && f.contentWindow.__waterApp.state;
  }, null, { timeout: 20000 });
  const fr = p.frameLocator('#app');

  await p.click('#edBtn');
  await p.waitForTimeout(300);
  ok('E1 панель редактора открылась', await p.isVisible('#edPanel'));
  const grid = await fr.locator('#edGrid').evaluate(el => ({
    d: getComputedStyle(el).display, bg: getComputedStyle(el).backgroundSize }));
  ok('E2 сетка видна, шаг 8px', grid.d === 'block' && grid.bg.startsWith('8px'), JSON.stringify(grid));

  /* выбор кликом: нижняя навигация приложения */
  const nav = fr.locator('#app .nav');
  await nav.click({ position: { x: 200, y: 20 } });
  await p.waitForTimeout(200);
  const path = await p.textContent('#edPath');
  ok('E3 клик выбрал элемент, путь записан', !!path && path !== 'ничего не выбрано', (path || '').slice(0, 60));
  const box = await fr.locator('#edBox').evaluate(el => getComputedStyle(el).display);
  ok('E4 рамка выбора с ручками видна', box === 'block');
  const handles = await fr.locator('#edBox .ed-h').count();
  ok('E5 ручек изменения размера — 8', handles === 8, String(handles));

  /* размер ручкой se (до драга: ручка гарантированно внутри кадра) */
  const sel = body => p.evaluate(b => {
    const el = document.querySelector('#app').contentWindow.__edSelected;
    return el ? new Function('el', b)(el) : null;
  }, body);
  const frameBox = await (await p.$('#app')).boundingBox();
  const scale = frameBox.width / await p.evaluate(() => document.querySelector('#app').contentWindow.innerWidth);
  const se = await fr.locator('#edBox .ed-h[data-h="se"]').evaluate(el => {
    const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const beforeW = await sel('return el.getBoundingClientRect().width;');
  await p.mouse.move(frameBox.x + se.x * scale, frameBox.y + se.y * scale); await p.mouse.down();
  await p.mouse.move(frameBox.x + se.x * scale + 30, frameBox.y + se.y * scale, { steps: 5 }); await p.mouse.up();
  await p.waitForTimeout(200);
  const afterW = await sel('return el.style.width;');
  ok('E8 ручка изменила ширину', !!afterW && parseFloat(afterW) >= 12, 'width=' + afterW + ' (было ' + Math.round(beforeW) + ')');


  /* перетаскивание с прилипанием: сдвиг должен лечь на сетку 8px */
  const navBox = await sel('const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width };');
  const sx = frameBox.x + (navBox.x + Math.min(30, navBox.w / 2)) * scale, sy = frameBox.y + (navBox.y + 6) * scale;
  await p.mouse.move(sx, sy); await p.mouse.down();
  await p.mouse.move(sx + 37, sy + 21, { steps: 6 }); await p.mouse.up();
  await p.waitForTimeout(200);
  const tx = await sel('return { t: el.style.transform, tx: el.dataset.edTx, ty: el.dataset.edTy, left: el.getBoundingClientRect().left };');
  ok('E6 перетаскивание применило transform', /translate/.test(tx.t), tx.t);
  const toGrid = Math.abs(tx.left / 8 - Math.round(tx.left / 8)) * 8;
  ok('E7 прилипание: левый край на сетке 8px', toGrid < 0.35, 'left=' + tx.left + ', до сетки ' + toGrid.toFixed(3));

  /* панель свойств: радиус и шрифт через выбранный элемент */
  await p.fill('#edRadiusN', '24'); await p.dispatchEvent('#edRadiusN', 'change');
  const rad = await sel('return el.style.borderRadius;');
  ok('E9 скругление применено с панели', rad === '24px', rad);
  await p.fill('#edFontSizeN', '19'); await p.dispatchEvent('#edFontSizeN', 'change');
  const fs = await sel('return el.style.fontSize;');
  ok('E10 размер шрифта применён', fs === '19px', fs);
  await p.selectOption('#edFontWeight', '700');
  const fw = await sel('return el.style.fontWeight;');
  ok('E11 вес шрифта применён', fw === '700', fw);

  /* тост: вызов настоящим механизмом + закрепление */
  await p.click('#edToastShow');
  await p.waitForTimeout(700);
  const pinned = await fr.locator('.toast.ed-pinned').count();
  ok('E12 тост закреплён копией в рамке', pinned === 1, 'закреплено: ' + pinned);
  await p.waitForTimeout(3200); /* таймер оригинала: перерисовка приложения */
  const alive = await fr.locator('.toast.ed-pinned').count();
  ok('E13b копия тоста пережила перерисовку приложения', alive === 1, 'жива: ' + alive);
  const toastText = await fr.locator('.toast.ed-pinned').textContent();
  ok('E13 текст тоста на месте', /Так будет выглядеть тост/.test(toastText || ''), (toastText || '').slice(0, 40));
  const editedToast = await fr.locator('.toast.ed-pinned').evaluate(el => el.style.fontSize = '17px', undefined).catch(() => null);
  void editedToast;

  /* журнал и отчёт */
  const logN = parseInt(await p.textContent('#edLogN'), 10);
  ok('E14 журнал правок не пуст', logN >= 4, 'записей: ' + logN);
  await p.click('#edExport');
  await p.waitForTimeout(150);
  const report = await p.inputValue('#edReport');
  ok('E15 отчёт содержит элементы и свойства', /transform/.test(report) && /borderRadius|fontSize/.test(report),
    report.split('\n').slice(0, 2).join(' | ').slice(0, 90));

  /* переприменение после перерисовки экрана */
  await p.click('#left .scr[data-atlas="home"]');
  await p.waitForTimeout(600);
  await p.click('#edReapply');
  await p.waitForTimeout(200);
  const status = await p.textContent('#edStatus');
  ok('E16 правки переприменились после перерисовки', /применено [1-9]/.test(status || ''), status || '');

  /* --- линии, цифры, скрытие тоста --- */
  await p.click('#edToastHide');
  await p.waitForTimeout(200);
  ok('E17 кнопка «Скрыть тост» убрала закреплённый тост', (await fr.locator('.toast.ed-pinned').count()) === 0);

  await p.click('#edGuideV');
  await p.waitForTimeout(300);
  const gLeft = await fr.locator('.ed-guide-v').first().evaluate(el => el.style.left).catch(() => '');
  ok('E18 вертикальная линия добавлена по центру (206px)', gLeft === '206px', gLeft);
  await p.uncheck('#edGuidesOn');
  await p.waitForTimeout(200);
  const gDisp = await fr.locator('#edGuides').evaluate(el => getComputedStyle(el).display);
  ok('E19 линии прячутся тумблером', gDisp === 'none', gDisp);
  await p.check('#edGuidesOn');
  await p.waitForTimeout(200);

  /* перетаскивание самой линии: +21px -> с прилипанием на 224 */
  const gb = await (await p.$('#app')).boundingBox();
  const gs = gb.width / await p.evaluate(() => document.querySelector('#app').contentWindow.innerWidth);
  await p.mouse.move(gb.x + 206 * gs, gb.y + 400 * gs); await p.mouse.down();
  await p.mouse.move(gb.x + 227 * gs, gb.y + 400 * gs, { steps: 4 }); await p.mouse.up();
  await p.waitForTimeout(250);
  const gLeft2 = await fr.locator('.ed-guide-v').first().evaluate(el => el.style.left).catch(() => '');
  ok('E20 линия таскается и липнет к сетке', gLeft2 === '224px', gLeft2);

  /* ручные цифры: выбрать элемент заново и задать ширину/сдвиг */
  await fr.locator('#app .nav').click({ position: { x: 200, y: 20 } });
  await p.waitForTimeout(250);
  await p.fill('#edW', '300'); await p.dispatchEvent('#edW', 'change');
  await p.fill('#edX', '15'); await p.dispatchEvent('#edX', 'change');
  await p.waitForTimeout(150);
  const manual = await sel('return JSON.stringify({ w: el.style.width, t: el.style.transform })');
  ok('E21 ширина и сдвиг задаются цифрами', /"w":"300px"/.test(manual || '') && /translate\(15px/.test(manual || ''), manual || '');

  await p.click('#edGuideEl');
  await p.waitForTimeout(250);
  const gCount = await fr.locator('.ed-guide').count();
  ok('E22 линии по краям элемента (+4)', gCount === 5, 'линий: ' + gCount);
  await p.click('#edGuideList [data-gd="0"]');
  await p.waitForTimeout(250);
  const gCount2 = await fr.locator('.ed-guide').count();
  ok('E23 линия удаляется из списка', gCount2 === 4, 'линий: ' + gCount2);
  await p.click('#edGuideClear');
  await p.waitForTimeout(250);
  ok('E24 «Убрать все» чистит линии', (await fr.locator('.ed-guide').count()) === 0);

  /* --- наша сетка со скрина владельца --- */
  await p.check('#edOurOn');
  await p.waitForTimeout(400);
  const our = await p.evaluate(() => {
    const d = document.querySelector('#app').contentDocument;
    const vs = d.querySelectorAll('.ed-our-v');
    return { n: vs.length, first: vs.length ? vs[0].style.left : '',
      disp: getComputedStyle(d.getElementById('edOur')).display };
  });
  ok('E25 наша сетка: 6 вертикалей, первая на 41px', our.n === 6 && our.first === '41px' && our.disp === 'block', JSON.stringify(our));
  await p.check('#edOurNum');
  await p.waitForTimeout(400);
  const labs = await fr.locator('.ed-our-lab').count();
  ok('E26 нумерация нашей сетки включается', labs >= 6, 'подписей: ' + labs);
  await p.uncheck('#edOurOn');
  await p.waitForTimeout(300);
  const ourOff = await p.evaluate(() => {
    const d = document.querySelector('#app').contentDocument;
    return getComputedStyle(d.getElementById('edOur')).display;
  });
  ok('E27 наша сетка прячется', ourOff === 'none', ourOff);

  await b.close();
  console.log('\nИТОГ: ' + pass + ' PASS / ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('СБОЙ БЕНЧА:', e); process.exit(2); });
