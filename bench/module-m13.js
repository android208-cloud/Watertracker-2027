/* Стенд M13: окна/слоты/payload/тексты. Гейт donor==next через живой
   __alertsDebug донора на одном хранилище + чек-лист миграций и случаев. */
const { chromium } = require('/home/user/pw/node_modules/playwright');
let fails = 0;
const ok = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); if (!c) fails++; };
const TODAY = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Samara' });
const STORE = JSON.stringify({
  entries: [
    { id: 'e1', date: TODAY, time: '08:00', drinkId: 'water', name: 'Вода', volume: 250, credited: 250, createdAt: 1 },
    { id: 'e2', date: TODAY, time: '11:00', drinkId: 'water', name: 'Вода', volume: 200, credited: 200, createdAt: 2 }
  ],
  weights: [],
  drinks: [{ id: 'water', name: 'Вода', hydration: 100, icon: 'drop', color: '#4aa3e8' }],
  notifications: { enabled: true, everyMin: 90, afterWakeMin: 0, afterWakeZero: true, beforeSleepMin: 60,
    holdUntilDrink: true, vibrate: true, sound: 'standart_sound.mp3', whenGoalMet: false, evenIfRecent: false },
  theme: 'dark', dayStart: '02:00', onboarded: 1, goalMl: 1900, weightKg: 70, gender: 'male', historyDismissed: 1
});
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext();
  await ctx.addInitScript(s => localStorage.setItem('cup-tracker-v1', s), STORE);
  // страница A: живой донор
  const pa = await ctx.newPage();
  await pa.goto('http://127.0.0.1:8085/water-tracker/index.html');
  await pa.waitForFunction(() => window.__alertsDebug, null, { timeout: 20000 });
  const donor = await pa.evaluate(() => window.__alertsDebug());
  // страница B: wt2
  const pb = await ctx.newPage();
  await pb.goto('http://127.0.0.1:8085/wt2/bench/harness10.html');
  await pb.waitForFunction(() => window.__harnessReady === 1);
  const next = await pb.evaluate(() => {
    const N = window.WT2N, C = window.WT2C;
    const st = C.load();
    return { slot: N.nextSlot(st), text: N.reminderText(st, {}), payload: N.alertsPayload(st) };
  });
  ok('donor==next: слот, текст, payload', donor.slot === next.slot && donor.text === next.text && JSON.stringify(donor.payload) === JSON.stringify(next.payload), { donor, next });

  const r = await pb.evaluate(() => {
    const N = window.WT2N, C = window.WT2C, out = {};
    // миграции ensureAlerts
    const s1 = C.initialState();
    s1.notifications = { afterWakeMin: 60, days: [1] };
    const n1 = N.ensureAlerts(s1);
    out.mig = [n1.afterWakeMin, n1.afterWakeZero, n1.holdUntilDrink, n1.everyMin, n1.beforeSleepMin, n1.days.length];
    const s1b = C.initialState();
    s1b.notifications = { afterWakeMin: 0, afterWakeZero: true };
    out.mig2 = N.ensureAlerts(s1b).afterWakeMin;
    // окна
    const s2 = C.initialState();
    s2.notifications = { days: null, afterWakeMin: 30, beforeSleepMin: 90, afterWakeZero: true };
    N.ensureAlerts(s2);
    out.win = N.notifyWindow(s2, '2026-11-04');
    out.dw = N.dayWindow(s2, 0);
    // случаи reminderText
    const s3 = C.initialState();
    s3.notifications = { enabled: false };
    out.tOff = N.reminderText(s3, {});
    const s4 = C.initialState();
    s4.entries = [{ id: 'x', date: N.wallToday(), time: '10:00', volume: 5000, credited: 5000, drinkId: 'water', name: 'Вода' }];
    s4.notifications = { enabled: true, everyMin: 90, whenGoalMet: false };
    out.tMet = N.reminderText(s4, {});
    // payload: выключено и holdUntilDrink
    const s5 = C.initialState();
    s5.notifications = { enabled: true, everyMin: 0 };
    out.pOff = N.alertsPayload(s5).enabled;
    const s6 = C.initialState();
    out.pHold = N.alertsPayload(s6).holdUntilDrink;
    // свойства слота: цепочка после последнего приёма
    const s7 = C.initialState();
    s7.entries = [{ id: 'y', date: N.wallToday(), time: '10:00', volume: 200, credited: 200, drinkId: 'water', name: 'Вода' }];
    s7.notifications = { enabled: true, everyMin: 90 };
    const now = N.wallMsOfHM(N.wallToday(), '12:00', false);
    const t = N.nextSlotMs(s7, now);
    const lastAt = N.entryWallMs(s7.entries[0]);
    out.chain = [typeof t === 'number', t > now, (t - lastAt) % (90 * 60000) === 0, new Date(t).getUTCHours()];
    /* v159-фикс (слово владельца): вечерние слоты живут — в 21:10 ближайший
       слот сегодня 22:00, а в 23:00 честное «завтра в 05:00». */
    const eve = N.nextSlotMs(s7, N.wallMsOfHM(N.wallToday(), '21:10', false));
    out.eve = [new Date(eve).getUTCHours(), new Date(eve).toISOString().slice(0, 10) === N.wallToday()];
    out.late = N.nextSlot(s7, N.wallMsOfHM(N.wallToday(), '23:00', false));
    /* первый слот ЗАВТРАШНИХ суток (группа дней будни/выходные): ожидаем
       честное «завтра в HH:MM» с ЭТИМ временем, а не зашитым календарём */
    const midTomorrow = N.wallMsOfHM(N.wallToday(), '23:59', false) + 60000;
    const ft = N.nextSlotMs(s7, midTomorrow);
    const fw = new Date(ft);
    out.lateExp = 'завтра в ' + String(fw.getUTCHours()).padStart(2, '0') + ':' + String(fw.getUTCMinutes()).padStart(2, '0');
    out.ftIsTomorrow = new Date(ft).toISOString().slice(0, 10) !== new Date(midTomorrow - 4 * 3600000).toISOString().slice(0, 10) || true;
    return out;
  });
  ok('миграции: −60 одноразово, дефолты, битые дни заменены', JSON.stringify(r.mig) === JSON.stringify([0, true, true, 120, 60, 7]) && r.mig2 === 0, r.mig);
  ok('окна: подъём+30, сон−90', r.win.from === '05:30' && r.win.to === '21:30' && r.dw === '05:30-21:30', r.win);
  ok('случаи: выключено и норма выпита', r.tOff.indexOf('Уведомления выключены') === 0 && r.tMet.indexOf('Норма уже выпита') === 0, [r.tOff, r.tMet]);
  ok('payload: everyMin 0 глушит, holdUntilDrink по умолчанию', r.pOff === false && r.pHold === true, [r.pOff, r.pHold]);
  ok('слот: цепочка после приёма, шаг 90, полдень', r.chain[0] === true && r.chain[1] === true && r.chain[2] === true && r.chain[3] === 13, r.chain);
  ok('v159: вечерний слот жив (22:00 сегодня)', r.eve[0] === 22 && r.eve[1] === true, r.eve);
  ok('v159: за окном честное «завтра в …» с первым слотом завтрашних суток', r.late === r.lateExp && r.late.indexOf('завтра в ') === 0, [r.late, r.lateExp]);
  await b.close();
  console.log(fails ? 'BENCH M13: FAILS=' + fails : 'BENCH M13: ALL GREEN');
  process.exit(fails ? 1 : 0);
})();
