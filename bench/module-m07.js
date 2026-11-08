/* Стенд M07 — wave: Canvas 2D тело воды (слово владельца 08.11: начинаем
   с Canvas, WebGL — стендовый эталон). Страж меряет состояние рисовальщика
   WT2V.canvasState() и живые пиксели холста, а не SVG-узлы. */
const { chromium } = require('/home/user/pw/node_modules/playwright');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('PASS ' + name + (extra != null ? ' :: ' + JSON.stringify(extra) : '')); }
  else { fail++; console.log('FAIL ' + name + (extra != null ? ' :: ' + JSON.stringify(extra) : '')); }
}
const TODAY = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Samara' }).format(new Date());
const store = entries => JSON.stringify({
  goalMl: 1950, gender: 'male', weightKg: 59.1, theme: 'dark', dayStart: '02:00',
  onboarded: 1, historyDismissed: 1, alertPermAsked: 1, profile: { drinkId: 'water', volume: 350 },
  drinks: [{ id: 'water', name: 'Вода', hydration: 100, icon: 'drop', color: '#4aa3e8' }, { id: 'espresso', name: 'Эспрессо', hydration: 70, icon: 'takeaway', color: '#8b5a2b' }],
  entries, notifications: { enabled: false, everyMin: 120, days: [] }
});
const E = (id, h, m, drink, vol, color) => ({ id, date: TODAY, time: h + ':' + m, drinkId: drink, name: drink, icon: drink === 'water' ? 'drop' : 'takeaway', color, hydration: 100, volume: vol, credited: vol, createdAt: 1 });
/* волна включена папкой: три слоя, геометрия прежнего выпуска M07 */
const LC3 = JSON.stringify({ wave: true, waveN: 3, waveA: 14, waveW: 150, waveG: 150,
  waveS1: 100, waveS2: 100, waveS3: 100, waveD1: 0, waveD2: 1, waveD3: 0,
  waveOP1: 100, waveOP2: 80, waveOP3: 45, waveGD1: 0, waveGD2: 0, waveGD3: 0 });

const WAIT = `window.__waterApp && document.querySelector('.wt-orb canvas.wt-wave-c') && window.WT2V.canvasState().frame > 5`;
const STATE = `window.WT2V.canvasState()`;
const PX = `(() => { const cv = document.querySelector('.wt-orb canvas.wt-wave-c'); const c = cv.getContext('2d');
  window.__px = (fx, fy) => { const d = c.getImageData(Math.round(cv.width * fx), Math.round(cv.height * fy), 1, 1).data; return [d[0], d[1], d[2]]; }; })()`;

(async () => {
  const b = await chromium.launch();
  const errs = [];

  /* однотон: canvas, три слоя, поверхность живая (не плоская и не статичная) */
  const c1 = await b.newContext({ viewport: { width: 412, height: 892 } });
  await c1.addInitScript(`localStorage.setItem('cup-liquid-color-v1', '${LC3}');localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([E('e1', '09', '00', 'water', 1100, '#4aa3e8')])}));`);
  const p1 = await c1.newPage();
  p1.on('pageerror', e => errs.push(e.message));
  await p1.goto('http://127.0.0.1:8085/wt2/index.html');
  await p1.waitForFunction(() => window.__waterApp && document.querySelector('.wt-orb canvas.wt-wave-c') && window.WT2V.canvasState().frame > 5);
  const mono = await p1.evaluate(s => eval(s), STATE);
  ok('однотон: canvas рисует 3 слоя, поверхность волнистая', mono.mode === 'mono' && mono.layers === 3 && !mono.flat && mono.topVar > 0.3, mono);
  const el1 = await p1.$('.wt-orb canvas.wt-wave-c');
  const shot1 = await el1.screenshot();
  await p1.waitForTimeout(700);
  const shot2 = await el1.screenshot();
  ok('поверхность движется: кадры холста различаются', Buffer.compare(shot1, shot2) !== 0);
  await p1.evaluate(PX);
  const deep = await p1.evaluate(() => window.__px(0.5, 0.92));
  ok('тело воды на холсте — цвет напитка (синяя доминанта)', deep[2] > deep[0] + 30 && deep[1] > deep[0], deep);
  await c1.close();

  /* пояса: canvas, бэнды из данных, стыки внутри пролёта */
  const c2 = await b.newContext({ viewport: { width: 412, height: 892 } });
  await c2.addInitScript(`localStorage.setItem('cup-liquid-color-v1', '${LC3}');localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([E('e1', '09', '00', 'water', 600, '#4aa3e8'), E('e2', '11', '00', 'espresso', 300, '#8b5a2b')])}));`);
  const p2 = await c2.newPage();
  p2.on('pageerror', e => errs.push(e.message));
  await p2.goto('http://127.0.0.1:8085/wt2/index.html');
  await p2.waitForFunction(() => window.__waterApp && document.querySelector('.wt-orb canvas.wt-wave-c') && window.WT2V.canvasState().frame > 5);
  const belt = await p2.evaluate(s => eval(s), STATE);
  await p2.evaluate(PX);
  const pxBelt = await p2.evaluate(() => {
    /* холст: top -3%..103%; жидкость 900/1950~46% высоты круга; нижний пояс — эспрессо */
    return { low: window.__px(0.5, 0.44), mid: window.__px(0.5, 0.30) };
  });
  ok('пояса: canvas в режиме поясов, 2 пояса из данных', belt.mode === 'belts' && belt.belts === 2 && belt.layers === 3, belt);
  ok('пиксели поясов: внизу тёмный эспрессо, выше вода',
    pxBelt.low[0] > pxBelt.low[2] && pxBelt.mid[2] > pxBelt.mid[0], pxBelt);
  await c2.close();

  /* папка правит волну: один слой по карточке */
  const c3 = await b.newContext({ viewport: { width: 412, height: 892 } });
  await c3.addInitScript(`localStorage.setItem('cup-liquid-color-v1', JSON.stringify({ wave: true, waveN: 1, waveA: 24, waveW: 90, waveG: 90, waveS1: 50, waveD1: 1, waveO1: 5, waveOP1: 25, waveGD1: 50, waveINT1: 50 }));localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([E('e1', '09', '00', 'water', 1100, '#4aa3e8')])}));`);
  const p3 = await c3.newPage();
  p3.on('pageerror', e => errs.push(e.message));
  await p3.goto('http://127.0.0.1:8085/wt2/index.html');
  await p3.waitForFunction(() => window.__waterApp && document.querySelector('.wt-orb canvas.wt-wave-c') && window.WT2V.canvasState().frame > 5);
  const tuned = await p3.evaluate(s => eval(s), STATE);
  ok('папка «Волна»: canvas рисует один слой по карточке, гребень жив', tuned.layers === 1 && tuned.topVar > 0.3, tuned);
  await c3.close();

  /* мастер-тумблер папки гасит волну: плоская вода на том же canvas */
  const c4 = await b.newContext({ viewport: { width: 412, height: 892 } });
  await c4.addInitScript(`localStorage.setItem('cup-liquid-color-v1', JSON.stringify({ wave: false }));localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([E('e1', '09', '00', 'water', 1100, '#4aa3e8')])}));`);
  const p4 = await c4.newPage();
  p4.on('pageerror', e => errs.push(e.message));
  await p4.goto('http://127.0.0.1:8085/wt2/index.html');
  await p4.waitForFunction(() => window.__waterApp && document.querySelector('.wt-orb canvas.wt-wave-c') && window.WT2V.canvasState().frame > 5);
  const off = await p4.evaluate(s => eval(s), STATE);
  ok('папка «Волна»: мастер выключен — canvas плоский, слоёв нет', off.flat && off.layers === 0 && off.topVar === 0, off);
  await c4.close();

  /* свежий профиль папки = одобренная картина */
  const c5 = await b.newContext({ viewport: { width: 412, height: 892 } });
  await c5.addInitScript(`localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([E('e1', '09', '00', 'water', 1100, '#4aa3e8')])}));`);
  const p5 = await c5.newPage();
  p5.on('pageerror', e => errs.push(e.message));
  await p5.goto('http://127.0.0.1:8085/wt2/index.html');
  await p5.waitForFunction(() => window.__waterApp && document.querySelector('.wt-orb canvas.wt-wave-c') && window.WT2V.canvasState().frame > 5);
  const fresh = await p5.evaluate(() => {
    const q = window.LiquidColor.waveParams(), s = window.WT2V.canvasState();
    return { n: q.n, layers: s.layers, gd: q.waves.map(w => w.gd), op: q.waves.map(w => w.op) };
  });
  ok('дефолт папки: три гребня 100/80/45, градиент 0',
    fresh.n === 3 && fresh.layers === 3 && fresh.gd.every(x => x === 0) &&
    JSON.stringify(fresh.op) === JSON.stringify([100, 80, 45]), fresh);
  await c5.close();

  /* градиент карточки: фейд не глубже кромки (<= 2a), гребень не съеден */
  const c6 = await b.newContext({ viewport: { width: 412, height: 892 } });
  await c6.addInitScript(`localStorage.setItem('cup-liquid-color-v1', JSON.stringify({ waveGD1: 100 }));localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([E('e1', '09', '00', 'water', 1100, '#4aa3e8')])}));`);
  const p6 = await c6.newPage();
  p6.on('pageerror', e => errs.push(e.message));
  await p6.goto('http://127.0.0.1:8085/wt2/index.html');
  await p6.waitForFunction(() => window.__waterApp && document.querySelector('.wt-orb canvas.wt-wave-c') && window.WT2V.canvasState().frame > 5);
  const gd = await p6.evaluate(s => eval(s), STATE);
  ok('градиент 100: фейд внутри кромки (глубина <= 2a), поверхность живая', gd.gdDepth > 0 && gd.gdDepth <= 2 && gd.topVar > 0.1, gd);
  await c6.close();

  ok('без pageerror', errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log('BENCH M07: ' + (fail ? 'FAILS=' + fail : 'ALL GREEN') + ' (' + pass + '/' + (pass + fail) + ')');
  process.exit(fail ? 1 : 0);
})();
