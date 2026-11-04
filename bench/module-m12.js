/* Стенд M12: темп и предиктор. Гейт donor==next на одних входах + чек-лист
   текстов по случаям (C-005) и(policy) темпа (C-006). */
const { chromium } = require('/home/user/pw/node_modules/playwright');
let fails = 0;
const ok = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage();
  await p.goto('http://127.0.0.1:8085/wt2/bench/harness8.html');
  await p.waitForFunction(() => window.__harnessReady === 1);
  const r = await p.evaluate(() => {
    const HS = window.HabitSchedule, PC = window.PaceCurve, P = window.WT2P, out = {};
    const dHS = window.__donorHS, dPC = window.__donorPC;
    const T = '2026-11-04';
    const addD = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
    const wd = iso => { const d = new Date(iso + 'T12:00:00Z').getUTCDay(); return d === 0 ? 6 : d - 1; };
    // фикстура: 8 недель, будни чередуют ранний/поздний режим неделей (цикл P=2),
    // выходные отдельно, немного ночных порций 03:30
    const entries = [];
    let id = 1;
    for (let i = 1; i <= 56; i++) {
      const iso = addD(T, -i);
      const week = Math.floor(i / 7);
      const first = wd(iso) >= 5 ? '10:00' : (week % 2 === 0 ? '06:30' : '09:30');
      const slots = [first, '12:00', '15:00', '18:00'];
      slots.forEach((tm, k) => entries.push({ id: 'e' + (id++), date: iso, time: tm, volume: 200 + (k % 3) * 50, drinkId: 'water', name: 'Вода', credited: 200 + (k % 3) * 50, createdAt: i * 1000 + k }));
      if (i % 9 === 0) entries.push({ id: 'e' + (id++), date: iso, time: '03:30', volume: 150, drinkId: 'water', name: 'Вода', credited: 150, createdAt: i * 1000 + 9 });
    }
    const opts = { dayStart: '02:00', afterWakeMin: 60, beforeSleepMin: 90, todayIso: T };
    const nowMs = Date.UTC(2026, 10, 4, 14, 30);
    // 1..5 donor == next
    out.prof = [JSON.stringify(dHS.computeProfile(entries, opts)) === JSON.stringify(HS.computeProfile(entries, opts)), HS.computeProfile(entries, opts).status];
    out.pers = JSON.stringify(dHS.periods(entries, opts)) === JSON.stringify(HS.periods(entries, opts));
    out.keys = ['2026-11-04', '2026-11-02', '2026-10-31', '2026-10-27'].map(d => dHS.periodKeyForDate(entries, opts, d) === HS.periodKeyForDate(entries, opts, d));
    out.curve = JSON.stringify(dPC.explain(entries, opts, nowMs, 1200, 250)) === JSON.stringify(PC.explain(entries, opts, nowMs, 1200, 250));
    out.ex = PC.explain(entries, opts, nowMs, 1200, 250);
    out.steps = JSON.stringify([dHS.paceStepMin(nowMs, nowMs + 3600000, 900, 250, 45, 120), dHS.medianPortion(entries, T, 7)]) ===
                JSON.stringify([HS.paceStepMin(nowMs, nowMs + 3600000, 900, 250, 45, 120), HS.medianPortion(entries, T, 7)]);
    // 6 тексты: дефолты, плейсхолдеры, длины
    const ctx = { n: { everyMin: -1, texts: { normal: { t: 'Пей, {left} осталось', b: '' } } }, drunk: 800, goal: 1900 };
    out.texts = [P.notifyTextsRender(ctx, 'normal'), P.notifyTextsRender({ n: { texts: {} }, drunk: 1900, goal: 1900 }, 'met')];
    // 7 policy темпа
    const base = { entries, n: { everyMin: -1, whenGoalMet: false }, today: T, drunk: 500, goal: 1900, nowMs, endMs: nowMs + 3600000, periodOpts: opts };
    out.policy = [P.paceEveryMin(Object.assign({}, base, { goal: 500 })), P.paceEveryMin(Object.assign({}, base, { goal: 500, n: { everyMin: -1, whenGoalMet: true } })), P.paceEveryMin(Object.assign({}, base, { endMs: nowMs })), P.paceEveryMin(base)];
    // 8 якоря статусов
    out.anchors = [P.paceAnchor({ n: { everyMin: -1, whenGoalMet: true }, drunk: 2000, goal: 1900, period: null }),
      P.paceAnchor({ n: { everyMin: -1 }, drunk: 100, goal: 1900, period: { label: 'Будни раннего режима', ml: 2100 } }),
      P.paceAnchor({ n: { everyMin: -1 }, drunk: 100, goal: 1900, period: null }),
      P.paceAnchor({ n: { everyMin: 90, evenIfRecent: true }, drunk: 0, goal: 1900 }),
      P.paceAnchor({ n: { everyMin: 90 }, drunk: 0, goal: 1900 })];
    out.freq = [P.freqLabel(-1), P.freqLabel(60), P.freqLabel(77)];
    return out;
  });
  ok('donor==next: профиль привычки', r.prof[0] === true && r.prof[1] === 'ok', r.prof);
  ok('donor==next: периоды', r.pers === true);
  ok('donor==next: ключи периода дат', r.keys.every(Boolean), r.keys);
  ok('donor==next: кривая и шаг', r.curve === true && !!r.ex && r.ex.stepMin >= 45 && r.ex.stepMin <= 120, r.ex);
  ok('donor==next: шаг фазы 1 и медиана порции', r.steps === true);
  ok('тексты: плейсхолдеры и дефолты', r.texts[0].title === 'Пей, 1100 осталось' && r.texts[0].text === 'Выпито 800 из 1900 мл' && r.texts[1].title === 'Можно выпить хотя бы немного воды', r.texts);
  ok('policy: норма закрыта молчит/поддерживает/окно кончилось/шаг в клампах', r.policy[0] === 0 && r.policy[1] === 120 && r.policy[2] === 0 && r.policy[3] >= 45 && r.policy[3] <= 120, r.policy);
  ok('якоря: четыре случая темпа и слоты', r.anchors[0].indexOf('поддерживающие напоминания каждые Каждые 2 часа') > 0 && r.anchors[1].indexOf('Будни раннего режима') > 0 && r.anchors[2].indexOf('норма была выпита к концу бодрствования') > 0 && r.anchors[3] === 'Слоты каждые Каждые 1.5 часа от начала периода активности' && r.anchors[4] === 'Слоты каждые Каждые 1.5 часа после последнего приёма', r.anchors);
  ok('freqLabel: темп/час/неизвестное', r.freq[0] === 'По темпу к концу бодрствования' && r.freq[1] === 'Каждый час' && r.freq[2] === 'Каждые 2 часа', r.freq);
  await b.close();
  console.log(fails ? 'BENCH M12: FAILS=' + fails : 'BENCH M12: ALL GREEN');
  process.exit(fails ? 1 : 0);
})();
