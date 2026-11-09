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
  await p2.waitForTimeout(2600); /* пояса оседают (lerp долей), иначе сэмпл ловит стык в пути */
  await p2.evaluate(PX);
  const pxBelt = await p2.evaluate(() => {
    /* холст: top -3%..103%; жидкость 900/1950~46% высоты круга; нижний пояс — эспрессо */
    return { low: window.__px(0.5, 0.44), mid: window.__px(0.5, 0.30) };
  });
  ok('пояса: canvas в режиме поясов, 2 пояса из данных', belt.mode === 'belts' && belt.belts === 2 && belt.layers === 3, belt);
  ok('пиксели поясов: внизу тёмный эспрессо, выше вода',
    pxBelt.low[0] > pxBelt.low[2] && pxBelt.mid[2] > pxBelt.mid[0], pxBelt);
  const seamPx = await p2.evaluate(() => {
    const cv = document.querySelector('.wt-orb canvas.wt-wave-c');
    const st = window.WT2V.canvasState();
    const fy = 0.03 + 0.667 * (st.span / 100) * (100 / 106);
    return { fy: Math.round(fy * 1000) / 1000, px: window.__px(0.5, fy) };
  });
  /* малый пояс не растворяется: розовые 100 мл поверх 1300 мл видны чистым ядром */
  const c2b = await b.newContext({ viewport: { width: 412, height: 892 } });
  await c2b.addInitScript(`localStorage.setItem('cup-liquid-color-v1', '${LC3}');localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([E('e1', '09', '00', 'water', 800, '#4aa3e8'), E('e2', '11', '00', 'espresso', 500, '#f39c2d')])}));`);
  const p2b = await c2b.newPage();
  p2b.on('pageerror', e => errs.push(e.message));
  await p2b.goto('http://127.0.0.1:8085/wt2/index.html');
  await p2b.waitForFunction(() => window.__waterApp && document.querySelector('.wt-orb canvas.wt-wave-c') && window.WT2V.canvasState().frame > 5);
  await p2b.evaluate((TD) => {
    const st = window.__waterApp.state;
    st.drinks.push({ id: 'mors', name: 'Морс', hydration: 90, icon: 'cup', color: '#e2607a' });
    st.entries.push({ id: 'e9', date: TD, time: '13:00', drinkId: 'mors', name: 'Морс', icon: 'cup', color: '#e2607a', hydration: 90, volume: 100, credited: 90, createdAt: 9 });
    window.__waterApp.render();
  }, TODAY);
  await p2b.waitForTimeout(150);
  const grow0 = await p2b.evaluate(() => window.WT2V.canvasState().beltFrom);
  ok('добавление без рывка: новый пояс растёт плавно (граница ещё едет к доле)',
    grow0 && grow0.length === 3 && grow0[2] > 0.95, grow0);
  await p2b.waitForTimeout(600);
  const pink = await p2b.evaluate(() => {
    const cv = document.querySelector('.wt-orb canvas.wt-wave-c');
    const c = cv.getContext('2d');
    const st = window.WT2V.canvasState();
    /* ядро последнего пояса: f=0.98 пролёта от верха слоя подъёма */
    const fy = 0.03 + 0.98 * (st.span / 100) * (100 / 106);
    const d = c.getImageData(Math.round(cv.width / 2), Math.round(cv.height * fy), 1, 1).data;
    return { belts: st.belts, fy: Math.round(fy * 100) / 100, px: [d[0], d[1], d[2]] };
  });
  ok('малый розовый пояс виден чистым ядром (не растворён градиентом)',
    pink.belts === 3 && pink.px[0] > 150 && pink.px[2] > 70 && pink.px[2] < 170 && pink.px[0] > pink.px[1] + 40, pink);
  await c2b.close();

  await p2.evaluate(() => window.LiquidColor.act('lc-wblend', null));
  await p2.waitForTimeout(500);
  const hardPx = await p2.evaluate(() => {
    const st = window.WT2V.canvasState();
    const fy = 0.03 + (0.667 + 0.03) * (st.span / 100) * (100 / 106);
    return { blend: window.LiquidColor.waveParams().blend, px: window.__px(0.5, fy) };
  });
  ok('тумблер «Мягкие переходы» выключен: под швом чистый цвет нижнего пояса',
    hardPx.blend === false && hardPx.px[0] > 110 && hardPx.px[2] < 85, hardPx);
  await p2.evaluate(() => window.LiquidColor.act('lc-wblend', null));

  ok('стык поясов мягкий: пиксель на шве — смесь цветов соседних поясов',
    seamPx.px[0] > 80 && seamPx.px[0] < 135 && seamPx.px[2] > 60 && seamPx.px[2] < 200, seamPx);
  await c2.close();

  /* однотон не серый: тело сплошное, пиксель близок к цвету напитка */
  const c2c = await b.newContext({ viewport: { width: 412, height: 892 } });
  await c2c.addInitScript(`localStorage.setItem('cup-liquid-color-v1', JSON.stringify({ wave: true, waveN: 1, waveOP1: 45, waveINT1: 75, waveGD1: 60 }));localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([E('e1', '09', '00', 'water', 1100, '#c08e69')])}));`);
  const p2c = await c2c.newPage();
  p2c.on('pageerror', e => errs.push(e.message));
  await p2c.goto('http://127.0.0.1:8085/wt2/index.html');
  await p2c.waitForFunction(() => window.__waterApp && document.querySelector('.wt-orb canvas.wt-wave-c') && window.WT2V.canvasState().frame > 5);
  await p2c.waitForTimeout(1200);
  const teaPx = await p2c.evaluate(() => {
    const cv = document.querySelector('.wt-orb canvas.wt-wave-c');
    const c = cv.getContext('2d');
    const d = c.getImageData(Math.round(cv.width / 2), Math.round(cv.height * 0.85), 1, 1).data;
    return [d[0], d[1], d[2]];
  });
  ok('однотон: тело сплошное, цвет напитка не вымыт прозрачностью волны',
    Math.abs(teaPx[0] - 192) <= 48 && Math.abs(teaPx[1] - 142) <= 48 && Math.abs(teaPx[2] - 105) <= 55, teaPx);
  await c2c.close();

  /* режим поясов LiquidColor: цвет сегмента = его собственный цвет из data-belts,
     а не соседний из чужого водителя (порядки поясов у систем разные) */
  const c2d = await b.newContext({ viewport: { width: 412, height: 892 } });
  await c2d.addInitScript(`localStorage.setItem('cup-liquid-color-v1', JSON.stringify({ mode: 'belt' }));localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([E('e1', '09', '00', 'water', 800, '#c08e69'), E('e2', '11', '00', 'espresso', 500, '#8b5a2b'), E('e3', '12', '00', 'water', 100, '#e2607a')])}));`);
  const p2d = await c2d.newPage();
  p2d.on('pageerror', e => errs.push(e.message));
  await p2d.goto('http://127.0.0.1:8085/wt2/index.html');
  await p2d.waitForFunction(() => window.__waterApp && document.querySelector('.wt-orb canvas.wt-wave-c') && window.WT2V.canvasState().frame > 5);
  await p2d.waitForTimeout(1500);
  const seg = await p2d.evaluate(() => {
    const cv = document.querySelector('.wt-orb canvas.wt-wave-c');
    const c = cv.getContext('2d');
    const st = window.WT2V.canvasState();
    const belts = JSON.parse(cv.getAttribute('data-belts'));
    const last = belts[belts.length - 1];
    const fy = 0.03 + 0.97 * (st.span / 100) * (100 / 106);
    const d = c.getImageData(Math.round(cv.width / 2), Math.round(cv.height * fy), 1, 1).data;
    const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(last.c);
    const want = m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
    return { belts: st.belts, want, px: [d[0], d[1], d[2]] };
  });
  ok('пояса LiquidColor: нижний сегмент крашен своим цветом (без сдвига на соседа)',
    seg.belts >= 2 && seg.want && Math.abs(seg.px[0] - seg.want[0]) <= 45 && Math.abs(seg.px[1] - seg.want[1]) <= 45 && Math.abs(seg.px[2] - seg.want[2]) <= 50, seg);
  await c2d.close();

  /* мастер выключен + пояса: кромка плоская, холст статичен */
  const c4b = await b.newContext({ viewport: { width: 412, height: 892 } });
  await c4b.addInitScript(`localStorage.setItem('cup-liquid-color-v1', JSON.stringify({ wave: false }));localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([E('e1', '09', '00', 'water', 600, '#4aa3e8'), E('e2', '11', '00', 'espresso', 300, '#8b5a2b')])}));`);
  const p4b = await c4b.newPage();
  p4b.on('pageerror', e => errs.push(e.message));
  await p4b.goto('http://127.0.0.1:8085/wt2/index.html');
  await p4b.waitForFunction(() => window.__waterApp && document.querySelector('.wt-orb canvas.wt-wave-c') && window.WT2V.canvasState().frame > 5);
  await p4b.waitForTimeout(2600); /* геометрия и цвета поясов осели после загрузки */
  const diff = await p4b.evaluate(() => new Promise(done => {
    const cv = document.querySelector('.wt-orb canvas.wt-wave-c');
    const c = cv.getContext('2d');
    const a = c.getImageData(0, 0, cv.width, cv.height).data;
    setTimeout(() => {
      const b = c.getImageData(0, 0, cv.width, cv.height).data;
      let changed = 0, maxD = 0;
      for (let i = 0; i < a.length; i += 4) {
        const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
        if (d > 2) changed++;
        if (d > maxD) maxD = d;
      }
      done({ changedPct: Math.round(changed / (a.length / 4) * 10000) / 100, maxD });
    }, 800);
  }));
  const offB = await p4b.evaluate(s => eval(s), STATE);
  ok('мастер выключен, пояса: волна не появляется, холст статичен',
    offB.mode === 'belts' && offB.flat && diff.changedPct < 0.1 && diff.maxD <= 2, { offB, diff });
  await c4b.close();

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
    return { n: q.n, layers: s.layers, a: q.a, w: q.w, g: q.g, w1: q.waves[0] };
  });
  ok('дефолт папки = настройки владельца 08.11: 1 волна 12/300/238, 180%, градиент 60, прозрачность 45, интенсивность 75',
    fresh.n === 1 && fresh.layers === 1 && fresh.a === 12 && fresh.w === 300 && fresh.g === 238 &&
    fresh.w1.s === 180 && fresh.w1.d === 0 && fresh.w1.gd === 60 && fresh.w1.op === 45 && fresh.w1.intensity === 75, fresh);
  const el5 = await p5.$('.wt-orb canvas.wt-wave-c');
  const f1 = await el5.screenshot();
  await p5.waitForTimeout(800);
  const f2 = await el5.screenshot();
  ok('одна вода, настройки владельца: волна зримо движется (кадры холста разные)',
    Buffer.compare(f1, f2) !== 0);
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

  /* движок «Волны прототипа» (слово владельца 09.11): слоёные гребни
     вместо холста, дрейф жив, мастер по-прежнему гасит всё */
  const c7 = await b.newContext({ viewport: { width: 412, height: 892 } });
  await c7.addInitScript(`localStorage.setItem('cup-liquid-color-v1', JSON.stringify({ waveEngine: 'proto', waveN: 3 }));localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([E('e1', '09', '00', 'water', 1100, '#4aa3e8')])}));`);
  const p7 = await c7.newPage();
  p7.on('pageerror', e => errs.push(e.message));
  await p7.goto('http://127.0.0.1:8085/wt2/index.html');
  await p7.waitForFunction(() => window.__waterApp && window.WT2V && window.WT2V.protoState().layers >= 3);
  await p7.waitForTimeout(2600);
  const proto1 = await p7.evaluate(() => {
    const s = window.WT2V.protoState();
    const el = document.querySelector('.wt-orb .cat-wave');
    return { s, tr: el ? getComputedStyle(el).transform : null };
  });
  await p7.waitForTimeout(700);
  const proto2 = await p7.evaluate(() => {
    const el = document.querySelector('.wt-orb .cat-wave');
    return el ? getComputedStyle(el).transform : null;
  });
  ok('движок прототипа: холста нет, три слоя гребней, дрейф движется',
    proto1.s.engine === 'proto' && proto1.s.canvas === 0 && proto1.s.layers >= 3 &&
    /^wt-wd-/.test(proto1.s.anim || '') && proto1.tr !== proto2, { proto1, proto2 });
  await c7.close();

  const c8 = await b.newContext({ viewport: { width: 412, height: 892 } });
  await c8.addInitScript(`localStorage.setItem('cup-liquid-color-v1', JSON.stringify({ waveEngine: 'proto', wave: false }));localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([E('e1', '09', '00', 'water', 1100, '#4aa3e8')])}));`);
  const p8 = await c8.newPage();
  p8.on('pageerror', e => errs.push(e.message));
  await p8.goto('http://127.0.0.1:8085/wt2/index.html');
  await p8.waitForFunction(() => window.__waterApp && window.WT2V);
  await p8.waitForTimeout(600);
  const protoOff = await p8.evaluate(() => window.WT2V.protoState());
  ok('движок прототипа + мастер выключен: слоёв нет, вода плоская',
    protoOff.layers === 0 && protoOff.canvas === 0, protoOff);
  await c8.close();

  const c9 = await b.newContext({ viewport: { width: 412, height: 892 } });
  await c9.addInitScript(`localStorage.setItem('cup-liquid-color-v1', JSON.stringify({ waveEngine: 'proto' }));localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([E('e1', '09', '00', 'water', 600, '#4aa3e8'), E('e2', '11', '00', 'espresso', 300, '#8b5a2b')])}));`);
  const p9 = await c9.newPage();
  p9.on('pageerror', e => errs.push(e.message));
  await p9.goto('http://127.0.0.1:8085/wt2/index.html');
  await p9.waitForFunction(() => window.__waterApp && window.WT2V);
  await p9.waitForTimeout(2600);
  const protoB = await p9.evaluate(() => ({
    stack: !!document.querySelector('.wt-orb .cat-beltstack'),
    seams: document.querySelectorAll('.wt-orb .cat-wave [data-bi]').length,
    layers: document.querySelectorAll('.wt-orb .cat-wave').length
  }));
  ok('движок прототипа + пояса: стек поясов и волнистые стыки на месте',
    protoB.stack && protoB.seams >= 1 && protoB.layers >= 2, protoB);
  await c9.close();

  /* движок WebGL (третий вариант, слово владельца 09.11): шейдер стенда
     wavelab на данных приложения */
  const c10 = await b.newContext({ viewport: { width: 412, height: 892 } });
  await c10.addInitScript(`localStorage.setItem('cup-liquid-color-v1', JSON.stringify({ waveEngine: 'webgl' }));localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([E('e1', '09', '00', 'water', 1100, '#4aa3e8')])}));`);
  const p10 = await c10.newPage();
  p10.on('pageerror', e => errs.push(e.message));
  await p10.goto('http://127.0.0.1:8085/wt2/index.html');
  await p10.waitForFunction(() => window.__waterApp && window.WT2V && window.WT2V.glState().frame > 10);
  await p10.waitForTimeout(2600);
  const gl1 = await p10.evaluate(() => window.WT2V.glState());
  const el10 = await p10.$('.wt-orb canvas.wt-wave-gl');
  const g1 = await el10.screenshot();
  await p10.waitForTimeout(700);
  const g2 = await el10.screenshot();
  ok('движок WebGL: шейдерный холст на месте, холста 2D нет, волна движется',
    !!el10 && gl1.ok && gl1.mode === 'mono' && gl1.layers >= 1 && !gl1.flat &&
    (await p10.evaluate(() => document.querySelectorAll('.wt-orb canvas.wt-wave-c').length)) === 0 &&
    Buffer.compare(g1, g2) !== 0, gl1);
  await c10.close();

  const c11 = await b.newContext({ viewport: { width: 412, height: 892 } });
  await c11.addInitScript(`localStorage.setItem('cup-liquid-color-v1', JSON.stringify({ waveEngine: 'webgl' }));localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([E('e1', '09', '00', 'water', 600, '#4aa3e8'), E('e2', '11', '00', 'espresso', 300, '#8b5a2b')])}));`);
  const p11 = await c11.newPage();
  p11.on('pageerror', e => errs.push(e.message));
  await p11.goto('http://127.0.0.1:8085/wt2/index.html');
  await p11.waitForFunction(() => window.__waterApp && window.WT2V && window.WT2V.glState().frame > 10);
  await p11.waitForTimeout(2600);
  const glB = await p11.evaluate(() => window.WT2V.glState());
  ok('движок WebGL + пояса: режим поясов, поясов не меньше двух',
    glB.mode === 'belts' && glB.belts >= 2, glB);
  await c11.close();

  const c12 = await b.newContext({ viewport: { width: 412, height: 892 } });
  await c12.addInitScript(`localStorage.setItem('cup-liquid-color-v1', JSON.stringify({ waveEngine: 'webgl', wave: false }));localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([E('e1', '09', '00', 'water', 1100, '#4aa3e8')])}));`);
  const p12 = await c12.newPage();
  p12.on('pageerror', e => errs.push(e.message));
  await p12.goto('http://127.0.0.1:8085/wt2/index.html');
  await p12.waitForFunction(() => window.__waterApp && window.WT2V && window.WT2V.glState().frame > 10);
  await p12.waitForTimeout(600);
  const glOff = await p12.evaluate(() => window.WT2V.glState());
  const el12 = await p12.$('.wt-orb canvas.wt-wave-gl');
  const o1 = await el12.screenshot();
  await p12.waitForTimeout(700);
  const o2 = await el12.screenshot();
  ok('движок WebGL + мастер выключен: плоская статичная вода',
    glOff.flat && glOff.layers === 0 && Buffer.compare(o1, o2) === 0, glOff);
  await c12.close();

  /* расширенные диапазоны папки (слово владельца 09.11: точное
     соответствие прототипу в движке прототипа): значения за старыми
     потолками 24/300/300 не срезаются */
  const c13 = await b.newContext({ viewport: { width: 412, height: 892 } });
  await c13.addInitScript(`localStorage.setItem('cup-liquid-color-v1', JSON.stringify({ waveEngine: 'proto', waveA: 40, waveW: 970, waveG: 1100 }));localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([E('e1', '09', '00', 'water', 1100, '#4aa3e8')])}));`);
  const p13 = await c13.newPage();
  p13.on('pageerror', e => errs.push(e.message));
  await p13.goto('http://127.0.0.1:8085/wt2/index.html');
  await p13.waitForFunction(() => window.__waterApp && window.LiquidColor);
  const wide = await p13.evaluate(() => {
    const q = window.LiquidColor.waveParams();
    return { a: q.a, w: q.w, g: q.g };
  });
  ok('диапазоны волны расширены: высота 40, ширина 970, расстояние 1100 проходят без среза',
    wide.a === 40 && wide.w === 970 && wide.g === 1100, wide);
  await c13.close();

  ok('без pageerror', errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log('BENCH M07: ' + (fail ? 'FAILS=' + fail : 'ALL GREEN') + ' (' + pass + '/' + (pass + fail) + ')');
  process.exit(fail ? 1 : 0);
})();
