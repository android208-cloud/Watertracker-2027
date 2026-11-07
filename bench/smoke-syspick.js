/* smoke-syspick — страж системных календаря и часов (07.11).
   Оболочки Android на стенде нет, поэтому мост WaterBridge подделываем:
   он отвечает как MainActivity (done со значением). Проверяем всю
   веб-цепочку: флаги → useSystem* → askNative* → применённое значение,
   и откат на наши виджеты при выключенных тумблерах. Повод: при порте
   потерялась askNativeDate — дата падала с ReferenceError молча. */
const { chromium } = require('/home/user/pw/node_modules/playwright');
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { if (cond) { pass++; console.log('  PASS  ' + name); } else { fail++; console.log('  FAIL  ' + name + (extra ? '  ' + extra : '')); } };
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 412, height: 892 } })).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e.message || e).slice(0, 160)));
  await p.goto('http://127.0.0.1:8085/wt2/atlas.html');
  await p.waitForTimeout(2500);
  const F = () => p.frames().find(f => f.url().indexOf('index.html') >= 0);
  const ev = (fn, arg) => F().evaluate(fn, arg);
  await ev(() => {
    window.__calls = [];
    window.WaterBridge = {
      pickDate: (id, json) => { window.__calls.push(['date', json]);
        setTimeout(() => window.WaterNative.done(id, '2026-11-02'), 30); },
      pickTime: (id, json) => { window.__calls.push(['time', json]);
        setTimeout(() => window.WaterNative.done(id, '07:30'), 30); },
      pickNumber: (id, json) => { window.__calls.push(['num', json]);
        setTimeout(() => window.WaterNative.done(id, ''), 30); }
    };
  });
  const fl = await ev(() => ({ cal: window.__waterApp.state.systemCalendar,
    clock: window.__waterApp.state.systemClock, hasDate: window.WaterNative.hasDate() }));
  ok('S1 флаги системных пикеров включены, мост виден', fl.cal === true && fl.clock === true && fl.hasDate === true, JSON.stringify(fl));

  /* дата веса через мост */
  await p.click('[data-atlas="weight"]'); await p.waitForTimeout(500);
  await ev(() => document.querySelector('[data-act="open-weight"]').click());
  await p.waitForTimeout(350);
  await ev(() => document.querySelector('[data-act="open-weight-cal"]').click());
  await p.waitForTimeout(450);
  const w = await ev(() => ({ calls: window.__calls.map(c => c[0]),
    wd: window.__waterApp.ui.weightDraft && window.__waterApp.ui.weightDraft.date,
    calPanel: !!document.querySelector('.cal-panel') }));
  ok('S2 дата веса: мост вызван, дата применена, нашего календаря нет',
    w.calls.join() === 'date' && w.wd === '2026-11-02' && !w.calPanel, JSON.stringify(w));

  /* дата истории через мост */
  await ev(() => { window.__calls = []; });
  await p.click('[data-atlas="history"]'); await p.waitForTimeout(500);
  await ev(() => document.querySelector('[data-act="open-cal-hist"]').click());
  await p.waitForTimeout(450);
  const h = await ev(() => ({ calls: window.__calls.map(c => c[0]),
    hd: window.__waterApp.ui.historyDate, calPanel: !!document.querySelector('.cal-panel') }));
  ok('S3 дата истории: мост вызван, день применён, нашего календаря нет',
    h.calls.join() === 'date' && h.hd === '2026-11-02' && !h.calPanel, JSON.stringify(h));

  /* время записи через мост */
  await ev(() => { window.__calls = []; const A = window.__waterApp;
    A.ui.sheet = null; A.render(); });
  await p.click('[data-atlas="sheet:hist-add"]'); await p.waitForTimeout(500);
  await ev(() => document.querySelector('[data-act="open-time"]').click());
  await p.waitForTimeout(450);
  const t = await ev(() => ({ calls: window.__calls.map(c => c[0]),
    time: window.__waterApp.ui.addDraft && window.__waterApp.ui.addDraft.time,
    modal: window.__waterApp.ui.modal }));
  ok('S4 время записи: мост вызван, время применено, нашего циферблата нет',
    t.calls.join() === 'time' && t.time === '07:30' && t.modal !== 'time', JSON.stringify(t));

  /* тумблеры выкл — наши виджеты возвращаются */
  await ev(() => { const A = window.__waterApp;
    A.state.systemCalendar = false; A.state.systemClock = false;
    A.ui.sheet = null; A.ui.modal = null; A.ui.tab = 'weight'; A.render(); });
  await p.waitForTimeout(300);
  await ev(() => document.querySelector('[data-act="open-weight"]').click());
  await p.waitForTimeout(350);
  await ev(() => document.querySelector('[data-act="open-weight-cal"]').click());
  await p.waitForTimeout(400);
  const off = await ev(() => ({ calPanel: !!document.querySelector('.cal-panel'),
    modal: window.__waterApp.ui.modal }));
  ok('S5 тумблеры выключены: наш календарь снова открывается',
    off.calPanel && off.modal === 'calendar', JSON.stringify(off));

  ok('S6 ошибок страницы нет (askNativeDate на месте)', errs.length === 0, errs.slice(0, 2).join(' | '));
  console.log('\nИТОГ: ' + pass + ' PASS / ' + fail + ' FAIL');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
