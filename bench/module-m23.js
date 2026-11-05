/* Стенд M23 — file-sync: пак в файл и обратно (C-015 формат, могилы C-002). */
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
  await ctx.addInitScript(`localStorage.setItem('cup-tracker-v1', JSON.stringify(${store([E('e1', '09', '00', 250), E('e2', '11', '00', 300)])}));`);
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8085/wt2/index.html');
  await p.waitForFunction(() => window.__waterApp && window.WT2F);

  /* 1. пак: формат watercat-24, записи и веса на месте, подпись есть */
  const pack = await p.evaluate(() => JSON.parse(window.WT2F.packText(window.__waterApp.state)));
  const fname = await p.evaluate(() => window.WT2F.todayName());
  ok('пак: source watercat-24, записи и веса внутри, имя файла по дефолту',
    pack.source === 'watercat-24' && pack.entries.length === 2 && pack.weights.length === 1 &&
    /^vodomer-next-\d{4}-\d{2}-\d{2}\.json$/.test(fname),
    { source: pack.source, e: pack.entries.length, w: pack.weights.length, name: fname });

  /* 2. применение пака в пустое состояние: записи и могилы совпадают */
  const applied = await p.evaluate(() => {
    const text = window.WT2F.packText(window.__waterApp.state);
    const fresh = JSON.parse(JSON.stringify(window.__waterApp.state));
    fresh.entries = []; fresh.weights = []; fresh.tombstones = { e: {}, w: {} };
    const res = window.WT2Y.applyPack(fresh, JSON.parse(text), 'merge', {});
    return { ok: res.ok, added: res.added, e: fresh.entries.length, w: fresh.weights.length };
  });
  ok('применение: пустое состояние принимает пак целиком', applied.ok && applied.e === 2 && applied.w === 1, applied);

  /* 3. повторное применение идемпотентно (могилы C-002 держат) */
  const twice = await p.evaluate(() => {
    const text = window.WT2F.packText(window.__waterApp.state);
    const st = window.__waterApp.state;
    const r1 = window.WT2Y.applyPack(st, JSON.parse(text), 'merge', {});
    const n = st.entries.length;
    return { added: r1.added, n };
  });
  ok('повторное применение не плодит записи', twice.added === 0, twice);

  /* 4. битый текст: честный отказ, состояние цело */
  const bad = await p.evaluate(() => {
    const before = window.__waterApp.state.entries.length;
    const res = window.WT2F.fileResult(window.__waterApp.state, '{not json', null, {});
    return { ok: res.ok, after: window.__waterApp.state.entries.length, before };
  });
  ok('битый файл: отказ без вреда', bad.ok === false && bad.after === bad.before, bad);

  /* 5. настройки: секция «Файл» с двумя строками; в веб без моста — честный тост */
  await p.click('[data-tab="settings"]');
  await p.waitForSelector('[data-act="file-save"]');
  await p.click('[data-act="file-save"]');
  await p.waitForFunction(() => document.querySelector('.toast') && /приложении/.test(document.querySelector('.toast').textContent));
  const rows = await p.evaluate(() => ({
    save: !!document.querySelector('[data-act="file-save"]'),
    open: !!document.querySelector('[data-act="file-open"]'),
    toast: document.querySelector('.toast').textContent
  }));
  ok('настройки: строки файла на месте, веб честен тостом', rows.save && rows.open && /приложении/.test(rows.toast), rows);

  /* 6. колбэк моста: wtFileResult применяет пак и перерисовывает */
  const cb = await p.evaluate(() => {
    const text = window.WT2F.packText(window.__waterApp.state);
    const fresh = JSON.parse(JSON.stringify(window.__waterApp.state));
    fresh.entries = [];
    let saved = 0, rendered = 0, toasted = '';
    window.__wtFileHook = null;
    const res = window.WT2F.fileResult(fresh, text, null, {
      toast: t => { toasted = t; }, save: () => { saved++; }, render: () => { rendered++; }
    });
    return { ok: res.ok, e: fresh.entries.length, saved, rendered, toasted };
  });
  ok('колбэк моста: пак применён, save и render позваны, тост результата', cb.ok && cb.e === 2 && cb.saved === 1 && cb.rendered === 1 && /добавлено/.test(cb.toasted), cb);

  /* 7. пак с настройками: записи едут сразу, настройки — явным выбором (слово 05.11) */
  const setSync = await p.evaluate(() => {
    const pack = JSON.parse(window.WT2F.packText(window.__waterApp.state));
    pack.settings = { theme: 'light', cupLabel: 'left', rowCustom: false, habitAuto: 1, paceGoals: {}, notifications: { enabled: true, everyMin: 90 } };
    const fresh = JSON.parse(JSON.stringify(window.__waterApp.state));
    fresh.theme = 'dark';
    fresh.entries = [];
    let toasted = '';
    const res = window.WT2F.fileResult(fresh, JSON.stringify(pack), null, {
      toast: t => { toasted = t; },
      askSettings: () => { fresh._asked = true; }
    });
    return { ok: res.ok, has: res.hasSettings, asked: !!fresh._asked, theme: fresh.theme, toasted };
  });
  ok('файл: записи сразу, настройки ждут явного выбора (осторожность 05.11)',
    setSync.ok && setSync.has && setSync.asked && setSync.theme === 'dark' && /выбором в диалоге/.test(setSync.toasted), setSync);

  /* 8. chunks: крупный пак приходит кусками и собирается без потерь */
  const chunks = await p.evaluate(() => {
    const text = window.WT2F.packText(window.__waterApp.state);
    const CH = 7;
    for (let i = 0; i * CH < text.length; i++) window.wtFileChunk(i, text.slice(i * CH, (i + 1) * CH));
    const fresh = JSON.parse(JSON.stringify(window.__waterApp.state));
    fresh.entries = [];
    let done = null;
    window.__wtFileHook = (t, e) => { done = { len: t.length, same: t === text }; };
    window.wtFileDone();
    return done;
  });
  ok('куски: пак из chunk-ов собирается байт-в-байт', chunks && chunks.same, chunks);

  ok('без pageerror', errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log('BENCH M23: ' + (fail ? 'FAILS=' + fail : 'ALL GREEN') + ' (' + pass + '/' + (pass + fail) + ')');
  process.exit(fail ? 1 : 0);
})();
