/* Стенд M19: новый calc-core ПРОТИВ донора WaterLogic на одних входах.
   Равенство выходов = зелёный; любое расхождение = FAIL с именами кейсов. */
const { chromium } = require('/home/user/pw/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:8085/wt2/bench/harness2.html');
  await p.waitForFunction(() => window.__harnessReady === 1);
  const res = await p.evaluate(() => {
    const D = window.WaterLogic, N = window.WT2L;
    const fails = [];
    const eq = (name, a, b2) => {
      const ja = JSON.stringify(a), jb = JSON.stringify(b2);
      if (ja !== jb) fails.push({ name, donor: ja, next: jb });
    };
    const st = () => ({ goalMl: 1947, useRecommended: false, gender: 'male', weightKg: 82,
      weatherSave: true, weatherDefault: 'warm', weatherToday: 'hot', activity: 'training',
      activitySave: false, activityToday: 'heavy', dayStart: '02:00', warnExceed: true,
      notifications: { enabled: true, everyMin: 120, days: [
        { wake: '05:00', sleep: '23:00' }, { wake: '05:00', sleep: '23:00' }, { wake: '05:00', sleep: '23:00' },
        { wake: '05:00', sleep: '23:00' }, { wake: '05:00', sleep: '23:00' }, { wake: '07:00', sleep: '23:00' },
        { wake: '08:00', sleep: '23:00' } ] },
      entries: [] });
    // константы
    ['WEATHER_RATE','ACTIVITY_RATE','PRESETS','COLORS','SHORTCUT_DAYS','SHORTCUT_LIMIT','MOOD','COFFEE_SYNONYMS'].forEach(k => eq('const ' + k, D[k], N[k]));
    // сутки/время
    eq('minutesOf bad', [D.minutesOf('25:70'), D.minutesOf(null)], [N.minutesOf('25:70'), N.minutesOf(null)]);
    eq('waterDay 01:59@02:00', D.waterDay('2026-11-04', '01:59', '02:00'), N.waterDay('2026-11-04', '01:59', '02:00'));
    eq('waterDay 02:00@02:00', D.waterDay('2026-11-04', '02:00', '02:00'), N.waterDay('2026-11-04', '02:00', '02:00'));
    eq('addDays month/year', [D.addDays('2026-01-01', -1), D.addDays('2026-12-31', 1)], [N.addDays('2026-01-01', -1), N.addDays('2026-12-31', 1)]);
    eq('creditedMl', [D.creditedMl(350, 90), D.creditedMl(250.4, 99)], [N.creditedMl(350, 90), N.creditedMl(250.4, 99)]);
    // нормы
    const s1 = st();
    eq('goalOn custom+weather', D.goalOn(s1, '2026-11-04', '2026-11-04'), N.goalOn(JSON.parse(JSON.stringify(s1)), '2026-11-04', '2026-11-04'));
    const s2 = st(); s2.useRecommended = true;
    eq('goalOn recommended', D.goalOn(s2, '2026-11-04', '2026-11-04'), N.goalOn(JSON.parse(JSON.stringify(s2)), '2026-11-04', '2026-11-04'));
    const s3 = st(); s3.weatherSave = false;
    eq('levelOn today/not', [D.levelOn(s3, '2026-11-04', '2026-11-04'), D.levelOn(s3, '2026-11-03', '2026-11-04')], [N.levelOn(JSON.parse(JSON.stringify(s3)), '2026-11-04', '2026-11-04'), N.levelOn(JSON.parse(JSON.stringify(s3)), '2026-11-03', '2026-11-04')]);
    const s4 = st(); D.setWeather(s4, 'hot'); const s4n = st(); N.setWeather(s4n, 'hot');
    eq('setWeather save-mode', s4, s4n);
    const s5 = st(); D.setWeatherSave(s5, false); D.setWeather(s5, 'cold'); const s5n = st(); N.setWeatherSave(s5n, false); N.setWeather(s5n, 'cold');
    eq('setWeatherSave flip', s5, s5n);
    // ярлыки и объёмы
    const ents = [
      { date: '2026-11-04', time: '08:00', drinkId: 'water', volume: 250, createdAt: 5 },
      { date: '2026-11-04', time: '09:00', drinkId: 'water', volume: 250, createdAt: 9 },
      { date: '2026-11-03', time: '10:00', drinkId: 'coffee', volume: 300, createdAt: 3 },
      { date: '2026-10-01', time: '10:00', drinkId: 'coffee', volume: 300, createdAt: 1 }
    ];
    const drinks = [{ id: 'water', name: 'Вода' }, { id: 'coffee', name: 'Кофе' }, { id: 'espresso', name: 'Эспрессо' }];
    eq('recentVolumes', D.recentVolumes(ents, '2026-11-04', 200), N.recentVolumes(JSON.parse(JSON.stringify(ents)), '2026-11-04', 200));
    eq('shortcutsOf', D.shortcutsOf(ents, drinks, '2026-11-04'), N.shortcutsOf(JSON.parse(JSON.stringify(ents)), drinks, '2026-11-04'));
    // бухгалтерия с кофейным семейством и ё
    const ents2 = ents.concat([
      { date: '2026-11-04', time: '11:00', drinkId: 'espresso', name: 'Эспрессо', volume: 100 },
      { date: '2026-11-04', time: '12:00', name: 'Лимонёд', volume: 50 },
      { date: '2026-11-04', time: '13:00', name: 'лимонед', volume: 70 }
    ]);
    const drinks2 = drinks.concat([{ id: 'lem', name: 'Лимонёд' }]);
    eq('ledgerRows coffee+ё', D.ledgerRows(ents2, drinks2), N.ledgerRows(JSON.parse(JSON.stringify(ents2)), JSON.parse(JSON.stringify(drinks2))));
    eq('normName/coffeeName', [D.normName('  Флэт Уайт ё '), D.coffeeName('Раф'), D.coffeeName('Вода')], [N.normName('  Флэт Уайт ё '), N.coffeeName('Раф'), N.coffeeName('Вода')]);
    // котик: таймлайн
    const day = '2026-11-04';
    const base = Date.UTC(2026, 10, 4) + 2 * 3600000; // старт суток 02:00
    const mk = (list) => { const s = st(); s.entries = list; return s; };
    const casesM = [
      ['start', [], base + 1000],
      ['ladder 2 шага', [{ date: day, time: '09:00', volume: 200, hydration: 100 }, { date: day, time: '10:00', volume: 200, hydration: 100 }], base + 11 * 3600000],
      ['pace gate', [{ date: day, time: '09:00', volume: 300, hydration: 100 }, { date: day, time: '10:00', volume: 300, hydration: 100 }, { date: day, time: '11:00', volume: 300, hydration: 100 }], base + 12 * 3600000],
      ['triumph', [{ date: day, time: '09:00', volume: 1000, hydration: 100 }, { date: day, time: '12:00', volume: 1000, hydration: 100 }], base + 14 * 3600000],
      ['hard 2x', [{ date: day, time: '09:00', volume: 2000, hydration: 100 }, { date: day, time: '10:00', volume: 2000, hydration: 100 }], base + 12 * 3600000],
      ['acute 1л/час', [{ date: day, time: '09:00', volume: 500, hydration: 100 }, { date: day, time: '09:40', volume: 500, hydration: 100 }], base + 10.5 * 3600000],
      ['neglect', [{ date: day, time: '09:00', volume: 600, hydration: 100 }], base + 16 * 3600000],
      ['night hold', [{ date: day, time: '09:00', volume: 600, hydration: 100 }], base + 1 * 3600000],
      ['warnExceed off', [{ date: day, time: '09:00', volume: 2000, hydration: 100 }, { date: day, time: '10:00', volume: 2000, hydration: 100 }], base + 12 * 3600000, false]
    ];
    casesM.forEach(([nm, list, t, we]) => {
      const sd = mk(JSON.parse(JSON.stringify(list))); if (we === false) sd.warnExceed = false;
      const sn = mk(JSON.parse(JSON.stringify(list))); if (we === false) sn.warnExceed = false;
      eq('catMood ' + nm, D.catMood(sd, day, t), N.catMood(sn, day, t));
    });
    eq('moodStep/schedule', [D.moodStep(1947), D.moodSchedule(st(), '2026-11-07')], [N.moodStep(1947), N.moodSchedule(st(), '2026-11-07')]);
    // чернила
    eq('inkOn set', ['#4aa3e8', '#f0c14b', '#8fd14f', '#d7b899', '#abc', '#zzz', null, '  #FFF  '].map(c => D.inkOn(c)),
      ['#4aa3e8', '#f0c14b', '#8fd14f', '#d7b899', '#abc', '#zzz', null, '  #FFF  '].map(c => N.inkOn(c)));
    // реестр: M19 зарегистрирован, не опционален
    eq('registry M19', [!!window.WT2R.cards().M19, window.WT2R.cards().M19.optional, window.WT2R.isOn('M19'), window.WT2R.setOn('M19', false)], [true, false, true, false]);
    return { fails: fails, count: casesM.length };
  });
  await b.close();
  if (res.fails.length) { console.log('FAILS:'); res.fails.forEach(f => console.log(JSON.stringify(f))); process.exit(1); }
  console.log('BENCH M19: ALL GREEN (donor == next)');
})();
