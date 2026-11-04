/* Стенд M01+M02: миграции и save новой базы против чек-листа донора v158. */
const { chromium } = require('/home/user/pw/node_modules/playwright');
const URL_H = 'http://127.0.0.1:8085/wt2/bench/harness.html';
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra) : '')); if (!cond) fails++; };

(async () => {
  const b = await chromium.launch();
  const run = async (seed, fn) => {
    const ctx = await b.newContext();
    await ctx.addInitScript((s) => { if (s) localStorage.setItem('cup-tracker-v1', s); }, seed);
    const p = await ctx.newPage();
    await p.goto(URL_H);
    await p.waitForFunction(() => window.__harnessReady === 1);
    const r = await p.evaluate(fn);
    await ctx.close();
    return r;
  };

  // A: легаси-храна без новых полей
  const legacy = JSON.stringify({
    drinks: [{ id: "latte", name: "Латте", icon: "mug", color: "#111111", hydration: 90 }],
    entries: [{ id: 1, date: "2026-11-01", time: "10:00", drinkId: "latte", name: "Латте", icon: "mug", color: "#111111", hydration: 90, volume: 200, credited: 200 }],
    theme: "oneplus",
    svgLayout: { "a/nav/x": { dx: 1, dy: 2, w: 3, h: 4, rot: 720, mx: -1 }, "ok": { dx: 5 } },
    tombstones: { e: { k1: 1000000 }, w: { w1: 2000000, w2: 2000000, w3: 3000000 } },
    notifications: { enabled: false },
    weatherDefault: "cold"
  });
  const a = await run(legacy, () => {
    const s = window.WT2C.boot();
    window.WT2C.flushSave();
    return { s: s, raw: localStorage.getItem('cup-tracker-v1') };
  });
  const s = a.s;
  ok('A theme oneplus→system', s.theme === 'system', s.theme);
  ok('A dayStart 02:00 (C-001)', s.dayStart === '02:00', s.dayStart);
  ok('A dayStartHistory seeded', Array.isArray(s.dayStartHistory) && s.dayStartHistory.length === 1 && s.dayStartHistory[0].value === '02:00');
  ok('A onboarded=1', s.onboarded === 1);
  ok('A icon latte mug→takeaway', s.drinks[0].icon === 'takeaway' && s.entries[0].icon === 'takeaway', s.drinks[0].icon);
  ok('A poisoned tombs purged (w1,w2)', !s.tombstones.w.w1 && !s.tombstones.w.w2 && !!s.tombstones.w.w3 && s._wTombPurged === 1);
  ok('A nav-svgLayout keys deleted', !s.svgLayout['a/nav/x'] && !!s.svgLayout.ok);
  ok('A rot 720→360 then kept? (ok box rot0 del)', s.svgLayout.ok.rot === undefined && s.svgLayout.ok.dx === 5);
  ok('A animation parked off', s.animation === false && s._animOff === true);
  ok('A cold→everyday', s.weatherDefault === 'everyday' && s._sunRestored === true);
  ok('A notifications merged (enabled false, from 06:00)', s.notifications.enabled === false && s.notifications.from === '06:00' && s.notifications.days.length === 7);
  ok('A save roundtrip', JSON.parse(a.raw).goalMl === s.goalMl && JSON.parse(a.raw).theme === 'system');

  // B: текущая храна владельца — значения неприкосновенны
  const his = JSON.stringify({ goalMl: 1947, theme: "dark", dayStart: "02:00", onboarded: 1, historyDismissed: 1,
    drinks: [{ id: "water", name: "Вода", icon: "water", color: "#5aade8", hydration: 100 }],
    entries: [{ id: 1, date: "2026-11-04", time: "08:00", drinkId: "water", name: "Вода", icon: "water", color: "#5aade8", hydration: 100, volume: 600, credited: 600 }],
    weights: [], profile: { gender: "male", volume: 350 }, dayStartHistory: [{ from: "", value: "02:00" }] });
  const bb = await run(his, () => { const st = window.WT2C.boot(); return { g: st.goalMl, t: st.theme, e: st.entries.length, p: st.profile.volume }; });
  ok('B goalMl 1947 kept', bb.g === 1947, bb.g);
  ok('B theme dark kept', bb.t === 'dark', bb.t);
  ok('B entries kept', bb.e === 1);
  ok('B profile volume 350 kept', bb.p === 350);

  // C: девственно пусто — дефолты
  const c = await run(null, () => { const st = window.WT2C.boot(); return { d: st.drinks.length, ds: st.dayStart, nd: st.notifications.days.length, g: st.goalMl }; });
  ok('C drinks 8 builtin', c.d === 8, c.d);
  ok('C dayStart 02:00', c.ds === '02:00');
  ok('C notif days 7', c.nd === 7);
  ok('C goalMl 1950', c.g === 1950);

  await b.close();
  console.log(fails ? 'BENCH M01: FAILS=' + fails : 'BENCH M01: ALL GREEN');
  process.exit(fails ? 1 : 0);
})();
