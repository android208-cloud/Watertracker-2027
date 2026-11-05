/* Стенд M24 — iface: интерфейсный пак (экраны, метки oid, применение,
   sanitize, персист, диспетчер kind, секция настроек «Интерфейс»). */
const { chromium } = require('/home/user/pw/node_modules/playwright');
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('PASS ' + name + (extra != null ? ' :: ' + JSON.stringify(extra) : '')); }
  else { fail++; console.log('FAIL ' + name + (extra != null ? ' :: ' + JSON.stringify(extra) : '')); }
}
const TODAY = '2026-11-05';
const store = entries => JSON.stringify({
  goalMl: 1950, gender: 'male', weightKg: 59.1, theme: 'dark', dayStart: '02:00',
  onboarded: 1, historyDismissed: 1, alertPermAsked: 1, profile: { drinkId: 'water', volume: 350 },
  drinks: [{ id: 'water', name: 'Вода', hydration: 100, icon: 'drop', color: '#4aa3e8' }],
  entries, weights: [{ id: 'w1', date: '2026-10-01', kg: 59.0, createdAt: 1 }],
  notifications: { enabled: false, everyMin: 120, days: [] }
});
const E = (id, h, m, vol) => ({ id, date: TODAY, time: h + ':' + m, drinkId: 'water', name: 'Вода', icon: 'drop', color: '#4aa3e8', hydration: 100, volume: vol, credited: vol, createdAt: Number(id.slice(1)) });
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 } });
  const errs = [];
  await ctx.addInitScript(`localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([E('e1', '09', '00', 250)])}));`);
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8085/wt2/index.html');
  await p.waitForFunction(() => window.__waterApp && window.WT2I && window.WT2F);

  /* 1. экраны: автообнаружение из настоящей навигации + реестр страниц */
  const sc = await p.evaluate(() => window.WT2I.screens());
  ok('экраны: 5 табов из NAV + 2 страницы, новые появятся автоматически',
    sc.length === 7 && sc.map(s => s.id).join(',') === 'home,history,weight,settings,alerts,page-drinks,page-volumes',
    sc.map(s => s.id));

  /* 2. метки oid: стоят после отрисовки, детерминированы, вне svg */
  const l1 = await p.evaluate(() => {
    const set1 = [...document.querySelectorAll('[data-oid]')].map(e => e.getAttribute('data-oid')).sort();
    return { n: set1.length, head: set1[0], inSvg: [...document.querySelectorAll('svg [data-oid]')].length, set1 };
  });
  const l2 = await p.evaluate(() => [...document.querySelectorAll('[data-oid]')].map(e => e.getAttribute('data-oid')).sort());
  ok('метки oid: каждый элемент дома помечен, внутри svg меток нет, набор детерминирован',
    l1.n > 20 && l1.head.startsWith('home|') && l1.inSvg === 0 && JSON.stringify(l1.set1) === JSON.stringify(l2),
    { n: l1.n, head: l1.head.slice(0, 40) });

  /* 3. screenIdOf: страница важнее таба */
  const sid = await p.evaluate(() => [
    window.WT2I.screenIdOf({ tab: 'home', page: null }),
    window.WT2I.screenIdOf({ tab: 'history', page: 'drinks' })
  ]);
  ok('screenIdOf: home / page-drinks', sid[0] === 'home' && sid[1] === 'page-drinks', sid);

  /* 4. применение пака: css объекта живьём + grid в :root + идемпотентно */
  const ap = await p.evaluate(() => {
    const el = document.querySelector('.progress .label');
    const oid = el.getAttribute('data-oid');
    const pack = { kind: 'watercat-iface', v: 1, grid: { '--pitch': '90px' },
      screens: { home: { objects: { [oid]: { css: { opacity: '0.25', 'font-size': '17px' } } } } } };
    window.WT2I.packApply(pack);
    const cs = getComputedStyle(el);
    const css1 = document.getElementById('wt2-iface-style').textContent;
    window.WT2I.packApply(pack);
    const css2 = document.getElementById('wt2-iface-style').textContent;
    return { opacity: cs.opacity, fs: cs.fontSize, rootPitch: getComputedStyle(document.documentElement).getPropertyValue('--pitch').trim(), idem: css1 === css2, hasRule: css1.includes('[data-oid=') };
  });
  ok('пак применяется: opacity 0.25, font-size 17px, --pitch 90px в :root, идемпотентно',
    ap.opacity === '0.25' && ap.fs === '17px' && ap.rootPitch === '90px' && ap.idem && ap.hasRule, ap);

  /* 5. sanitize: запрещённые свойства и значения не проникают */
  const san = await p.evaluate(() => {
    const css = window.WT2I.buildCss({ kind: 'watercat-iface', v: 1,
      grid: { '--pitch': '90px', 'bad name': '1', '--x': 'url(evil)' },
      screens: { home: { objects: {
        'a|b': { css: { width: '50px', display: 'none', transform: 'rotate(9deg)', color: 'red;behavior:x', background: 'url(javascript:x)' } } } } } });
    return { css, okP: window.WT2I.okProp('width'), badP: window.WT2I.okProp('display'), okV: window.WT2I.okValue('#4aa3e8'), badV: window.WT2I.okValue('a{b') };
  });
  ok('sanitize: display/transform/инъекции отброшены, width и цвет прошли',
    san.css.includes('width:50px') && !san.css.includes('display') && !san.css.includes('transform') &&
    !san.css.includes('behavior') && !san.css.includes('url(') && !san.css.includes('bad name') &&
    san.okP && !san.badP && san.okV && !san.badV, san.css.slice(0, 90));

  /* 6. персист: save → reload → bootApply сам возвращает пак */
  await p.evaluate(() => {
    window.WT2I.save({ kind: 'watercat-iface', v: 1, screens: { home: { objects: { 'x|y': { css: { opacity: '0.5' } } } } } });
  });
  await p.reload();
  await p.waitForFunction(() => window.__waterApp && window.WT2I);
  const boot = await p.evaluate(() => ({
    st: !!document.getElementById('wt2-iface-style') && document.getElementById('wt2-iface-style').textContent.includes('x|y'),
    loaded: !!(window.WT2I.load() && window.WT2I.load().kind === 'watercat-iface')
  }));
  ok('персист: после перезагрузки пак применён сам (bootApply)', boot.st && boot.loaded, boot);

  /* 7. диспетчер kind: интерфейсный пак не трогает записи, база идёт в M23 */
  const disp = await p.evaluate(() => {
    const before = window.__waterApp.state.entries.length;
    window.__wtFileHook(JSON.stringify({ kind: 'watercat-iface', v: 1, screens: { home: { objects: { 'q|w': { css: { opacity: '0.9' } } } } } }), null);
    const toast1 = (document.querySelector('.toast') || {}).textContent || '';
    const afterIface = window.__waterApp.state.entries.length;
    const baseText = window.WT2F.packText(window.__waterApp.state);
    window.WT2I.reset();
    window.__wtFileHook(baseText, null);
    const toast2 = (document.querySelector('.toast') || {}).textContent || '';
    return { before, afterIface, toast1, toast2, entriesBack: window.__waterApp.state.entries.length >= before };
  });
  ok('диспетчер kind: iface-пак → тост интерфейса и записи целы; watercat-24 → дорога M23',
    disp.before === disp.afterIface && disp.toast1.includes('Интерфейс из файла применён') &&
    disp.toast2.includes('Из файла'), disp);

  /* 8. сброс: стиль пуст, LS чист */
  const rs = await p.evaluate(() => {
    window.WT2I.save({ kind: 'watercat-iface', v: 1, screens: { home: { objects: { 'm|n': { css: { opacity: '0.1' } } } } } });
    window.WT2I.packApply(window.WT2I.load());
    window.WT2I.reset();
    return { ls: window.WT2I.load(), css: (document.getElementById('wt2-iface-style') || {}).textContent };
  });
  ok('сброс: пак удалён из хранилища, стиль пуст', rs.ls === null && rs.css === '', rs);

  /* 9. секция настроек «Интерфейс»: три строки на месте */
  await p.evaluate(() => { document.querySelector('[data-act="goto"][data-tab="settings"]').click(); });
  const set = await p.evaluate(() => ({
    sec: [...document.querySelectorAll('.set-sec')].map(e => e.textContent),
    rows: ['iface-open', 'iface-save', 'iface-reset'].map(a => !!document.querySelector('[data-act="' + a + '"]'))
  }));
  ok('настройки: секция «Интерфейс» и три строки (загрузить/сохранить/сбросить)',
    set.sec.includes('Интерфейс') && set.rows.every(Boolean), set);

  ok('без pageerror', errs.length === 0, errs);
  await b.close();
  console.log('BENCH M24: ' + (fail ? 'FAIL' : 'ALL GREEN') + ' (' + pass + '/' + (pass + fail) + ')');
  process.exit(fail ? 1 : 0);
})();
