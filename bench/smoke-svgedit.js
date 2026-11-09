/* Стенд редактора SVG (оживлён 09.11): кнопка ✎, панель, выбор значка,
   перетаскивание в svgLayout, переживание перезагрузки, откат, покраска. */
const { chromium } = require('/home/user/pw/node_modules/playwright');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('PASS ' + name + (extra != null ? ' :: ' + JSON.stringify(extra) : '')); }
  else { fail++; console.log('FAIL ' + name + (extra != null ? ' :: ' + JSON.stringify(extra) : '')); }
}

const TODAY = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Samara' }).format(new Date());
const store = extra => JSON.stringify(Object.assign({
  goalMl: 1950, gender: 'male', weightKg: 59.1, theme: 'dark', dayStart: '02:00',
  onboarded: 1, historyDismissed: 1, alertPermAsked: 1, profile: { drinkId: 'water', volume: 350 },
  drinks: [{ id: 'water', name: 'Вода', hydration: 100, icon: 'drop', color: '#4aa3e8' }],
  entries: [{ id: 'e1', date: TODAY, time: '10:00', drinkId: 'water', name: 'Вода', icon: 'drop', color: '#4aa3e8', hydration: 100, volume: 500, credited: 500, createdAt: 1 }],
  notifications: { enabled: false, everyMin: 120, days: [] }
}, extra || {}));

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 } });
  await ctx.addInitScript(`if (!localStorage.getItem('cup-tracker-v1')) localStorage.setItem('cup-tracker-v1', JSON.stringify(${store({ svgEditor: true })}));`);
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8085/wt2/index.html');
  await p.waitForFunction(() => window.__waterApp);
  await p.waitForTimeout(800);

  ok('кнопка ✎ видна при включённом редакторе', await p.evaluate(() => !!document.querySelector('.svg-edit-fab')));
  await p.click('.svg-edit-fab');
  await p.waitForTimeout(400);
  const on = await p.evaluate(() => ({
    panel: !!document.querySelector('.svg-panel'),
    hot: document.querySelectorAll('.svg-hot').length,
    cls: document.getElementById('app').classList.contains('svg-editing')
  }));
  ok('режим включён: панель есть, значки в рамках, класс svg-editing', on.panel && on.hot > 5 && on.cls, on);

  /* выбор и перетаскивание значка отмены в доке */
  const target = await p.evaluate(() => {
    const el = document.querySelector('.home-dock [data-act="undo"] svg, .home-dock [data-act="undo"] .ui-mask, .home-dock [data-act="undo"] img');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { key: el.dataset.svgKey, x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  ok('у значка дока есть ключ редактора', !!(target && target.key), target);
  await p.mouse.move(target.x, target.y);
  await p.mouse.down();
  await p.mouse.move(target.x + 30, target.y + 12, { steps: 6 });
  await p.mouse.up();
  await p.waitForTimeout(300);
  const laid = await p.evaluate(k => {
    const st = window.__waterApp.state;
    return { box: st.svgLayout && st.svgLayout[k], picked: document.querySelector('.svg-picked') ? document.querySelector('.svg-picked').dataset.svgKey : null };
  }, target.key);
  ok('перетаскивание записало сдвиг в svgLayout и выбрало значок',
    !!laid.box && Math.abs(laid.box.dx - 30) <= 3 && Math.abs(laid.box.dy - 12) <= 3 && laid.picked === target.key, laid);

  /* откат (стек живёт в UI-памяти, как у донора) */
  await p.click('[data-act="svg-undo"]');
  await p.waitForTimeout(300);
  const undone = await p.evaluate(k => {
    const st = window.__waterApp.state;
    return st.svgLayout && st.svgLayout[k];
  }, target.key);
  ok('откат убрал правку', !undone, undone);

  /* снова сдвигаем и проверяем перезагрузку: правка применена из состояния */
  await p.mouse.move(target.x, target.y);
  await p.mouse.down();
  await p.mouse.move(target.x + 30, target.y + 12, { steps: 6 });
  await p.mouse.up();
  await p.waitForTimeout(300);
  await p.reload();
  await p.waitForFunction(() => window.__waterApp);
  await p.waitForTimeout(800);
  const after = await p.evaluate(k => {
    const el = document.querySelector('[data-svg-key="' + k + '"]');
    return el ? el.style.transform : null;
  }, target.key);
  ok('после перезагрузки сдвиг на месте (transform из svgLayout)', !!after && /translate\(30px, 12px\)/.test(after), after);
  await p.click('.svg-edit-fab');
  await p.waitForTimeout(300);

  /* вкладка «Цвет»: тап по нижней панели ведёт на страницу цвета */
  await p.click('[data-act="svg-mode"][data-v="paint"]');
  await p.waitForTimeout(300);
  const paintPanel = await p.evaluate(() => {
    const n = document.querySelector('.svg-panel-name');
    return n ? n.textContent : '';
  });
  await p.mouse.click(200, 850);
  await p.waitForTimeout(500);
  const colorPage = await p.evaluate(() => !!document.querySelector('.pager, [data-act="save-color"], .color-page, .wheel'));
  ok('режим цвета: панель покраски и тап открывает выбор цвета', paintPanel === 'Цвет элемента' && colorPage, { paintPanel, colorPage });

  /* без флага редактора кнопки нет */
  const ctx2 = await b.newContext({ viewport: { width: 412, height: 892 } });
  await ctx2.addInitScript(`localStorage.setItem('cup-tracker-v1', JSON.stringify(${store()}));`);
  const p2 = await ctx2.newPage();
  p2.on('pageerror', e => errs.push(e.message));
  await p2.goto('http://127.0.0.1:8085/wt2/index.html');
  await p2.waitForFunction(() => window.__waterApp);
  await p2.waitForTimeout(500);
  ok('без тумблера кнопки ✎ нет', await p2.evaluate(() => !document.querySelector('.svg-edit-fab')));

  ok('без pageerror', errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log('ИТОГ svgedit: ' + pass + ' PASS, ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
})();
