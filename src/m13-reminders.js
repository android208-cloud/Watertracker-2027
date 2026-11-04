/* M13 reminders — окна, слоты, payload нативу и тексты по случаям.
   Контракты: C-005 (тексты уведомлений по случаям; интервалы 60–90 мин;
   последний напомин ~за 90 мин до сна — beforeSleepMin по умолчанию 60 и
   правится владельцем; анализатор простой без ML; темп к концу бодрствования
   живёт в M12), C-015 (тишина: payload и тексты без вертушек), C-006
   (предиктор — часть дневного экрана: reminderText цитирует темп словами).
   Перенос с донора v158 как спеки: app.js 5 (TZ), 284–293 (tzParts),
   306–309 (wallMsNow), 1461–1483 (entryWallMs/entryRealMs/latestByIntake),
   1485–1492 (wallMsOfHM), 3110–3128 (ALERT_SOUNDS/alertSoundTitle),
   3130–3152 (ensureAlerts с миграцией v148 «ноль»), 3154–3158 (weekdayIndex),
   3205–3228 (periodList/adoptedPeriod/effGoalFor/effPeriodFor),
   3346–3366 (shiftHM/notifyWindow), 3427–3460 (alertsPayload),
   3494–3516 (reminderText), 3517–3523 (dayWindow), 3535–3599 (nextSlotMs/
   nextSlot).
   Конструктор: модуль читает переданный state и настенное время; темп
   приезжает из M12 (WT2P), периоды — из M12 (HabitSchedule), норма и итог
   дня — из M10/M03. Нативный мост (WaterAlerts) не живёт здесь: env.hasNative
   выбирает хвост строки, payload уходит вызывающему (M17).
   Связи: вниз — M01, M03, M10, M12, M19; вверх — M17 shell-мосты, M05
   (чашка-тамагочи читает nextSlotMs). */
(function (W) {
  "use strict";
  var TZ = "Europe/Samara";   /* донор 5: пояс приложения */
  var L = function () { return W.WT2L; };
  var J = function () { return W.WT2J; };
  var S = function () { return W.WT2S; };
  var P = function () { return W.WT2P; };

  var ALERT_SOUNDS = [
    { file: "standart_sound.mp3", title: "Стандартный" },
    { file: "standart_sound_2.mp3", title: "Стандартный 2" },
    { file: "water_sound.mp3", title: "Вода" },
    { file: "sparkling_water_sound.mp3", title: "Газированная вода" },
    { file: "water_remind_notification.mp3", title: "Кошка — мяу" },
    { file: "cat_sound_meow_2.mp3", title: "Кошка — мяу 2" },
    { file: "cat_sound_meow_3.mp3", title: "Кошка — мяу 3" },
    { file: "cat_sound_purr.mp3", title: "Кошка — мурчание" }
  ];

  function alertSoundTitle(file) {
    for (var i = 0; i < ALERT_SOUNDS.length; i++) if (ALERT_SOUNDS[i].file === file) return ALERT_SOUNDS[i].title;
    return ALERT_SOUNDS[0].title;
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function tzParts(date) {
    var fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    });
    var map = {};
    fmt.formatToParts(date || new Date()).forEach(function (p) {
      if (p.type !== "literal") map[p.type] = p.value;
    });
    return map;
  }
  /* v159-фикс (слово владельца 04.11): свёрнутые настенные мс читаются
     UTC-частями напрямую. Поясной прогон tzParts сдвигал дату на +4 часа и
     после 20:00 настенного уводил слоты на завтра (вечерние напоминания
     терялись, v158). */
  function wallParts(ms) {
    var d = new Date(ms);
    return { year: String(d.getUTCFullYear()), month: pad(d.getUTCMonth() + 1), day: pad(d.getUTCDate()) };
  }
  function wallMsNow() {
    var p = tzParts();
    return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute));
  }
  function parseHM(s) {
    var p = String(s || "0:0").split(":");
    return Number(p[0]) * 60 + Number(p[1]);
  }
  function shiftHM(hm, delta) {
    var t = parseHM(hm) + delta;
    t = ((t % 1440) + 1440) % 1440;
    return pad(Math.floor(t / 60)) + ":" + pad(t % 60);
  }
  function weekdayIndex(iso) {
    var p = iso.split("-").map(Number);
    var day = new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
    return day === 0 ? 6 : day - 1;
  }
  function entryWallMs(e) {
    if (!e || !e.date || !e.time) return 0;
    var p = String(e.date).split("-").map(Number);
    var t = String(e.time).split(":").map(Number);
    if (p.length < 3) return 0;
    return Date.UTC(p[0], p[1] - 1, p[2], t[0] || 0, t[1] || 0);
  }
  function latestByIntake(state) {
    var best = null, bestMs = 0;
    (state.entries || []).forEach(function (e) {
      var ms = entryWallMs(e);
      if (ms && ms >= bestMs) { bestMs = ms; best = e; }
    });
    return best;
  }
  function wallMsOfHM(iso, hm, allowNextDay) {
    var p = String(iso).split("-").map(Number);
    var m = parseHM(hm);
    var d = allowNextDay ? 1 : 0;
    return Date.UTC(p[0], p[1] - 1, p[2] + d, Math.floor(m / 60), m % 60);
  }

  /* Модель уведомлений донора (3130–3152): миграция v148 «ноль» — старые
     сохранения сдвигаем на −60 одноразowo, живое окно не переезжает. */
  function ensureAlerts(state) {
    var base = W.WT2C.initialState().notifications;
    if (!state.notifications) state.notifications = base;
    var n = state.notifications;
    if (n.afterWakeMin == null) { n.afterWakeMin = 0; n.afterWakeZero = true; }
    else if (!n.afterWakeZero) { n.afterWakeMin = (Number(n.afterWakeMin) || 0) - 60; n.afterWakeZero = true; }
    if (n.holdUntilDrink == null) n.holdUntilDrink = true;
    if (n.beforeSleepMin == null) n.beforeSleepMin = 60;
    if (n.everyMin == null) n.everyMin = 120;
    if (typeof n.sound !== "string" || !n.sound) n.sound = ALERT_SOUNDS[0].file;
    if (n.vibrate == null) n.vibrate = true;
    if (!Array.isArray(n.days) || n.days.length !== 7) {
      n.days = base.days.map(function (d) { return { wake: d.wake, sleep: d.sleep }; });
    }
    return n;
  }

  function notifyWindow(state, iso) {
    var n = ensureAlerts(state);
    var today = iso || L().addDays(wallToday(), 0);
    var day = n.days[weekdayIndex(today)];
    return {
      from: shiftHM(day.wake, n.afterWakeMin || 0),
      to: shiftHM(day.sleep, -(n.beforeSleepMin || 0))
    };
  }
  function wallToday() {
    var p = tzParts();
    return p.year + "-" + p.month + "-" + p.day;
  }
  function dayWindow(state, index) {
    var n = ensureAlerts(state);
    var day = n.days[index] || { wake: "05:00", sleep: "23:00" };
    return shiftHM(day.wake, n.afterWakeMin || 0) + "-" + shiftHM(day.sleep, -(n.beforeSleepMin || 0));
  }

  /* Периоды и эффективная цель донора (3205–3228): принятый объём периода
     ведёт напоминания вверх, норма неприкосновенна. */
  function periodList(state) {
    return W.HabitSchedule && W.HabitSchedule.periods
      ? W.HabitSchedule.periods(state.entries, periodOpts(state)) : [];
  }
  function periodOpts(state) {
    var n = ensureAlerts(state);
    return { dayStart: state.dayStart || "02:00", afterWakeMin: n.afterWakeMin,
      beforeSleepMin: n.beforeSleepMin, todayIso: wallToday() };
  }
  function adoptedPeriod(state, key) {
    var ad = state.paceGoals && typeof state.paceGoals === "object" ? Number(state.paceGoals[key]) : 0;
    if (!(ad > 0)) return null;
    var hit = null;
    periodList(state).forEach(function (pp) { if (pp.key === key && pp.ml) hit = pp; });
    return hit ? { key: key, label: hit.label, ml: ad, stat: hit.ml } : null;
  }
  function effGoalFor(state, date) {
    var base = S().goalFor(state, date || wallToday(), wallToday());
    var ap = adoptedPeriod(state, W.HabitSchedule && W.HabitSchedule.periodKeyForDate
      ? W.HabitSchedule.periodKeyForDate(state.entries, periodOpts(state), date || waterToday(state)) : null);
    return ap ? Math.max(base, ap.ml) : base;
  }
  function effPeriodFor(state, date) {
    var key = W.HabitSchedule && W.HabitSchedule.periodKeyForDate
      ? W.HabitSchedule.periodKeyForDate(state.entries, periodOpts(state), date || waterToday(state)) : null;
    var ap = key ? adoptedPeriod(state, key) : null;
    if (!ap) return null;
    return ap.ml > S().goalFor(state, date || wallToday(), wallToday()) ? ap : null;
  }
  function waterToday(state) {
    var p = tzParts();
    var hm = p.hour + ":" + p.minute;
    return L().waterDay(wallToday(), hm, J().dayStartOn(state, wallToday()));
  }

  /* Шаг: темп из M12 или сетка everyMin. */
  function everyEffMin(state, nowMs) {
    var n = ensureAlerts(state);
    if (!P().isPace(n)) return Number(n.everyMin) || 0;
    var today = waterToday(state);
    var drunk = S().dayStats(state, today).volume;
    var goal = effGoalFor(state, today);
    var win = notifyWindow(state, today);
    var from = parseHM(win.from), to = parseHM(win.to);
    var endMs = wallMsOfHM(today, win.to, to <= from);
    return P().paceEveryMin({
      entries: state.entries, n: n, today: today, drunk: drunk, goal: goal,
      nowMs: nowMs == null ? wallMsNow() : nowMs, endMs: endMs,
      periodOpts: periodOpts(state)
    });
  }

  /* Ближайший слот донора (3535–3576): восемь суток вперёд, два якоря
     (сетка от начала периода / цепочка после последнего приёма). */
  function nextSlotMs(state, now) {
    var n = ensureAlerts(state);
    var every = everyEffMin(state, now);
    if (!every) return null;
    var step = every * 60000;
    var last = latestByIntake(state);
    var lastAt = last ? entryWallMs(last) : 0;
    for (var add = 0; add <= 8; add++) {
      var d = wallParts(now + add * 86400000);
      var iso = d.year + "-" + d.month + "-" + d.day;
      var win = notifyWindow(state, iso);
      var from = parseHM(win.from), to = parseHM(win.to);
      if (to <= from) return "период задан неверно";
      var base = Date.UTC(Number(d.year), Number(d.month) - 1, Number(d.day), Math.floor(from / 60), from % 60);
      var limit = Date.UTC(Number(d.year), Number(d.month) - 1, Number(d.day), Math.floor(to / 60), to % 60);
      if (to <= from) limit += 86400000;
      var t;
      if (n.evenIfRecent || !lastAt) {
        if (now <= base) t = base;
        else if (now < limit) t = base + (Math.floor((now - base) / step) + 1) * step;
        else continue;
      } else {
        t = lastAt + (Math.floor((now - lastAt) / step) + 1) * step;
        if (t < base) {
          if (now >= limit) continue;
          t = base;
        }
      }
      if (t > limit || t <= now) continue;
      return t;
    }
    var d0 = wallParts(now + 86400000);
    var w0 = notifyWindow(state, d0.year + "-" + d0.month + "-" + d0.day);
    var f0 = parseHM(w0.from);
    return Date.UTC(Number(d0.year), Number(d0.month) - 1, Number(d0.day), Math.floor(f0 / 60), f0 % 60);
  }
  function nextSlot(state, now) {
    var n = ensureAlerts(state);
    if (!n.everyMin) return "напоминания выключены";
    var nowMs = now == null ? wallMsNow() : now;
    var t = nextSlotMs(state, nowMs);
    if (t === null) return "напоминания выключены";
    if (typeof t === "string") return t;
    var wd = new Date(t);
    var a = wallParts(nowMs), b = wallParts(t);
    var same = a.year === b.year && a.month === b.month && a.day === b.day;
    return (same ? "" : "завтра в ") + pad(wd.getUTCHours()) + ":" + pad(wd.getUTCMinutes());
  }

  /* Payload нативу донора (3427–3460). */
  function alertsPayload(state, nowMs) {
    var n = ensureAlerts(state);
    var windows = [];
    for (var i = 0; i < 7; i++) windows.push(dayWindow(state, i));
    var today = waterToday(state);
    var drunk = S().dayStats(state, today).volume;
    var goal = effGoalFor(state, today);
    var last = latestByIntake(state);
    var everyMin = P().isPace(n) ? everyEffMin(state, nowMs) : (Number(n.everyMin) || 0);
    var goalMetNow = goal > 0 && drunk >= goal;
    var ntx = P().notifyTextsRender({ n: n, drunk: drunk, goal: goal }, goalMetNow && n.whenGoalMet ? "met" : "normal");
    return {
      title: ntx.title,
      text: ntx.text,
      enabled: !!n.enabled && everyMin > 0,
      everyMin: everyMin,
      pace: P().isPace(n),
      windows: windows,
      sound: n.sound,
      vibrate: n.vibrate !== false,
      whenGoalMet: !!n.whenGoalMet,
      evenIfRecent: !!n.evenIfRecent,
      holdUntilDrink: n.holdUntilDrink !== false,
      lastDrinkAt: last ? entryWallMs(last) : 0,
      goalMet: goal > 0 && drunk >= goal,
      status: drunk + " из " + goal + " мл"
    };
  }

  /* Подпись случая донора (3494–3516): темп словами из M12, хвост по мосту. */
  function reminderText(state, env) {
    env = env || {};
    var n = ensureAlerts(state);
    if (!n.enabled) return "Уведомления выключены. Системный пуш в веб-тесте не отправляется — ниже кнопка проверки.";
    var today = waterToday(state);
    var drunk = S().dayStats(state, today).volume;
    var goal = effGoalFor(state, today);
    if (!n.whenGoalMet && drunk >= goal) return "Норма уже выпита, поэтому напоминания молчат. Включите верхний пункт, если нужно иначе.";
    var per = effPeriodFor(state, today);
    var anchor = P().paceAnchor({ n: n, drunk: drunk, goal: goal, period: per });
    if (env.hasNative) {
      return anchor + ". Ближайший: " + nextSlot(state) + ". Уведомление придёт со звуком «" + alertSoundTitle(n.sound) + "».";
    }
    return anchor + ". Ближайший слот: " + nextSlot(state) + ". Уведомления приходят в приложении Android.";
  }

  if (W.WT2R) W.WT2R.register({
    id: "M13", file: "m13-reminders.js", layer: 5, optional: false,
    contracts: ["C-005", "C-006", "C-015"],
    events: [],
    status: "ported"
  });
  W.WT2N = {
    TZ: TZ, ALERT_SOUNDS: ALERT_SOUNDS, alertSoundTitle: alertSoundTitle,
    tzParts: tzParts, wallParts: wallParts, wallMsNow: wallMsNow, parseHM: parseHM, shiftHM: shiftHM,
    weekdayIndex: weekdayIndex, entryWallMs: entryWallMs, latestByIntake: latestByIntake,
    wallMsOfHM: wallMsOfHM, ensureAlerts: ensureAlerts, notifyWindow: notifyWindow,
    dayWindow: dayWindow, periodOpts: periodOpts, periodList: periodList,
    adoptedPeriod: adoptedPeriod, effGoalFor: effGoalFor, effPeriodFor: effPeriodFor,
    everyEffMin: everyEffMin, nextSlotMs: nextSlotMs, nextSlot: nextSlot,
    alertsPayload: alertsPayload, reminderText: reminderText, wallToday: wallToday, waterToday: waterToday
  };
})(window);
