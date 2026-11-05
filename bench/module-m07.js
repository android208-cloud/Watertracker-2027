/* Стенд M07 — wave: гребни ватерлинии и волнистые стыки поясов (C-028).
   Слово владельца 05.11: волниться должны и промежуточные слои. */
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
  drinks: [{ id: 'water', name: 'Вода', hydration: 100, icon: 'drop', color: '#4aa3e8' }, { id: 'espresso', name: 'Эспрессо', hydration: 70, icon: 'takeaway', color: '#8b5a2b' }],
  entries, notifications: { enabled: false, everyMin: 120, days: [] }
});
const E = (id, h, m, drink, vol, color) => ({ id, date: TODAY, time: h + ':' + m, drinkId: drink, name: drink, icon: drink === 'water' ? 'drop' : 'takeaway', color, hydration: 100, volume: vol, credited: vol, createdAt: 1 });

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 } });
  const errs = [];

  /* однотон: три гребня ватерлинии, средний полупрозрачный */
  const c1 = await b.newContext({ viewport: { width: 412, height: 892 } });
  await c1.addInitScript(`localStorage.setItem('wt2-waves','1');localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([E('e1', '09', '00', 'water', 1100, '#4aa3e8')])}));`);
  const p1 = await c1.newPage();
  p1.on('pageerror', e => errs.push(e.message));
  await p1.goto('http://127.0.0.1:8085/wt2/index.html');
  await p1.waitForFunction(() => window.__waterApp && document.querySelector('.wt-orb .cat-wave'));
  const mono = await p1.evaluate(() => {
    const ws = Array.from(document.querySelectorAll('.wt-orb .cat-wave'));
    return {
      n: ws.length,
      anims: ws.map(w => getComputedStyle(w).animationName + '|' + getComputedStyle(w).animationDuration + '|' + getComputedStyle(w).animationDelay),
      opac: ws.map(w => getComputedStyle(w).opacity),
      playing: document.getAnimations().filter(a => a.playState === 'running').length
    };
  });
  ok('однотон: три гребня ватерлинии, дрейф идёт, средний полупрозрачный',
    mono.n === 3 && mono.playing >= 3 && mono.opac.includes('0.45') &&
    new Set(mono.anims.map(a => a.split('|')[0])).size === 3 && new Set(mono.anims.map(a => a.split('|')[1])).size === 3, mono);
  await c1.close();

  /* пояса: бэнды + волнистые стыки цвета нижнего пояса */
  const c2 = await b.newContext({ viewport: { width: 412, height: 892 } });
  await c2.addInitScript(`localStorage.setItem('wt2-waves','1');localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([E('e1', '09', '00', 'water', 600, '#4aa3e8'), E('e2', '11', '00', 'espresso', 300, '#8b5a2b')])}));`);
  const p2 = await c2.newPage();
  p2.on('pageerror', e => errs.push(e.message));
  await p2.goto('http://127.0.0.1:8085/wt2/index.html');
  await p2.waitForFunction(() => window.__waterApp && document.querySelector('.wt-orb .cat-beltband'));
  const belt = await p2.evaluate(() => {
    const bands = Array.from(document.querySelectorAll('.wt-orb .cat-beltband'));
    const borders = Array.from(document.querySelectorAll('.wt-orb path[data-bi]'));
    const wl = Array.from(document.querySelectorAll('.wt-orb path[data-wl]:not([data-bi])'));
    const d = borders[0] ? borders[0].getAttribute('d') : '';
    var pairs = d.match(/-?\d+(\.\d+)?/g) || [];
    var ys = [];
    for (var pi = 1; pi < pairs.length; pi += 2) ys.push(Number(pairs[pi]));
    const HEAD = window.WT2V.DEF.HEAD, A = window.WT2V.DEF.A_EDGE;
    const crestTop = Math.min.apply(null, ys);
    return {
      bands: bands.length, borders: borders.length, wl: wl.length,
      borderFill: borders[0] && borders[0].getAttribute('fill'),
      wavy: d.indexOf('Q') >= 0, amp: Math.round(HEAD - crestTop),
      wlClosed: wl.every(pth => { const vb = pth.ownerSVGElement.viewBox.baseVal; return vb.height < 100; })
    };
  });
  ok('пояса: бэнды по цветам, стык волнистый амплитудой 60%, ватерлиния замкнута полосой',
    belt.bands === 2 && belt.borders === 1 && belt.wl === 3 &&
    belt.wavy && belt.amp === 8 && belt.wlClosed && /8b5a2b|139,\s*90,\s*43/i.test(belt.borderFill || ''), belt);

  /* промежуточные слои волнуются: свои фазы и скорости у стыка и гребней */
  const phases = await p2.evaluate(() => {
    const ws = Array.from(document.querySelectorAll('.wt-orb .cat-wave'));
    return ws.map(w => {
      const cs = getComputedStyle(w);
      return cs.animationName + '|' + cs.animationDuration + '|' + cs.animationDelay;
    });
  });
  ok('промежуточные слои волнуются: у каждого свои кейфреймы/фаза/скорость',
    phases.length === 4 && new Set(phases.map(x => x.split('|')[0])).size === 4 && new Set(phases.map(x => x.split('|')[1])).size === 4, phases);

  /* дрейф живой: transform гребня меняется со временем без перекрасок */
  const t1 = await p2.evaluate(() => Array.from(document.querySelectorAll('.wt-orb .cat-wave')).map(w => getComputedStyle(w).transform));
  await p2.waitForTimeout(700);
  const t2 = await p2.evaluate(() => Array.from(document.querySelectorAll('.wt-orb .cat-wave')).map(w => getComputedStyle(w).transform));
  ok('дрейф: трансформы гребней плывут (композитор)', JSON.stringify(t1) !== JSON.stringify(t2));

  ok('без pageerror', errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log('BENCH M07: ' + (fail ? 'FAILS=' + fail : 'ALL GREEN') + ' (' + pass + '/' + (pass + fail) + ')');
  process.exit(fail ? 1 : 0);
})();
