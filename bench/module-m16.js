/* Стенд M16: онбординг и restore без онбординга (C-014) против донора v158. */
const { chromium } = require('/home/user/pw/node_modules/playwright');
let fails = 0;
const ok = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 412, height: 892 } })).newPage();
  await p.goto('http://127.0.0.1:8085/wt2/bench/harness5.html');
  await p.waitForFunction(() => window.__harnessReady === 1);

  const r = await p.evaluate(() => {
    const O = window.WT2O, C = window.WT2C, K = window.WT2K, L = window.WT2L, J = window.WT2J, U = window.WT2U;
    const out = {};
    // 1 миграция флага: старое сохранение без onboarded => уже живёт в приложении
    localStorage.setItem(K.KEY, JSON.stringify({ entries: [], drinks: [{ id: 'water', name: 'Вода', hydration: 100, icon: 'drop', color: '#4aa3e8' }] }));
    const st = C.load();
    out.legacy = [st.onboarded, O.need(st)];
    // 2 свежее состояние: онбординг нужен
    const fresh = C.initialState();
    delete fresh.onboarded;
    out.fresh = O.need(fresh);
    // 3 черновик по умолчанию
    const ui = {};
    const d = O.draft(ui, fresh, '2026-11-04');
    out.draft = [d.gender, d.kg, d.dayStart];
    // 4 разметка экрана
    const html = O.screenHtml(d, { catArt: '<svg viewBox="0 0 8 8" width="40" height="40"><circle cx="4" cy="4" r="3" fill="#888"/></svg>' });
    out.screen = [ /data-act="onb-gender" data-v="female"/.test(html),
      /class="on" data-act="onb-gender" data-v="male"/.test(html),
      /59,1<small>кг<\/small>/.test(html), />02:00<\/span>/.test(html),
      html.indexOf('Ваша норма: ' + L.genderBase({ gender: 'male', weightKg: 59.1 }) + ' мл') >= 0,
      /data-act="onb-done">Начать</.test(html), /onb-cat/.test(html) ];
    // 5 setDayStart (M03, C-001): смена, замена того же дня, мусор
    const s5 = C.initialState();
    J.setDayStart(s5, '03:30', '2026-11-04');
    const h1 = s5.dayStartHistory.map(h => h.from + '@' + h.value);
    J.setDayStart(s5, '04:00', '2026-11-04');
    const h2 = s5.dayStartHistory.map(h => h.from + '@' + h.value);
    const bad = J.setDayStart(s5, 'абв', '2026-11-04');
    out.daystart = [h1, h2, bad, J.dayStartOn(s5, '2026-11-05')];
    // 6 «Начать»: состояние из черновика, importHint по пустой базе
    const s6 = C.initialState(); delete s6.onboarded;
    const ui6 = { onb: { gender: 'female', kg: 62.4, dayStart: '03:00' } };
    const res6 = O.done(s6, ui6.onb, { noBuiltinBase: true }, ui6);
    out.done = [s6.gender, s6.weightKg, s6.onboarded, s6.goalMl === L.genderBase(s6), ui6.onb, res6.importHint];
    const s7 = C.initialState(); delete s7.onboarded;
    s7.entries = [{ id: 'e1', date: '2026-11-04', time: '10:00', volume: 200 }];
    const res7 = O.done(s7, O.draft({}, s7, '2026-11-04'), { noBuiltinBase: true }, {});
    out.hintWithEntries = res7.importHint;
    // 7 C-014 restore: приветствие и подсказка не показываются
    const s8 = C.initialState(); delete s8.onboarded;
    O.markRestored(s8);
    out.restore = [s8.onboarded, s8.historyDismissed, O.need(s8)];
    // 8 цепь «Назад»: колёса онбординга закрываются на экран приветствия
    const sh = U.shellState(); sh.modal = 'onb-weight';
    const step = U.backStep(sh, { has: sel => sel === '.modal', render: () => {} });
    out.back = [step, sh.modal];
    return out;
  });
  ok('миграция: старое сохранение уже onboarded', r.legacy[0] === 1 && r.legacy[1] === false, r.legacy);
  ok('свежее состояние: онбординг нужен', r.fresh === true);
  ok('черновик: male/59.1/02:00', JSON.stringify(r.draft) === JSON.stringify(['male', 59.1, '02:00']), r.draft);
  ok('разметка экрана: seg/вес/сутки/норма/CTA/кот', r.screen.every(Boolean), r.screen);
  ok('setDayStart: смена и замена дня, мусор отклонён', JSON.stringify(r.daystart[0]) === JSON.stringify(['@02:00', '2026-11-04@03:30']) && JSON.stringify(r.daystart[1]) === JSON.stringify(['@02:00', '2026-11-04@04:00']) && r.daystart[2] === false && r.daystart[3] === '04:00', r.daystart);
  ok('«Начать»: поля, флаг, норма, черновик чист, hint', JSON.stringify(r.done) === JSON.stringify(['female', 62.4, 1, true, null, true]), r.done);
  ok('hint не кричит при живой истории', r.hintWithEntries === false);
  ok('C-014 restore: без онбординга и подсказки', JSON.stringify(r.restore) === JSON.stringify([1, 1, false]), r.restore);
  ok('назад: колесо закрылось на приветствие', r.back[0] === true && r.back[1] === null, r.back);

  // снимки экрана приветствия, обе темы
  await p.evaluate(() => {
    const O = window.WT2O, C = window.WT2C, U = window.WT2U;
    U.fitPhone();
    const st = C.initialState(); delete st.onboarded;
    const ui = {};
    document.getElementById('app').innerHTML =
      '<div class="screen home-screen">' + O.screenHtml(O.draft(ui, st, '2026-11-04'), {
        catArt: '<svg viewBox="0 0 40 40" width="120" height="120"><circle cx="20" cy="22" r="14" fill="#9aa0a6"/><circle cx="14" cy="12" r="5" fill="#9aa0a6"/><circle cx="26" cy="12" r="5" fill="#9aa0a6"/></svg>'
      }) + '</div>';
  });
  for (const theme of ['dark', 'light']) {
    await p.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    await p.waitForTimeout(120);
    await p.screenshot({ path: 'bench/shots/m16-' + theme + '.png' });
  }
  await b.close();
  console.log(fails ? 'BENCH M16: FAILS=' + fails : 'BENCH M16: ALL GREEN');
  process.exit(fails ? 1 : 0);
})();
