/* M12 pace-predictor: анализатор привычки (донор habit-schedule.js, байт-порт v158). Регистр M12, контракты C-005/C-006. */
/* Расписание по привычке (v128, релиз А) — простой анализатор времени
   приёмов: ищет закономерности за последние 8 недель и предлагает
   подъём/сон/привычные часы питья отдельно для будней и выходных.

   Принцип безопасности: анализатор только ПРЕДЛАГАЕТ. Ничто не меняется,
   пока владелец не нажмёт «Применить к периоду уведомлений» (act
   habit-apply в app.js). Ручной «Период уведомлений» остаётся источником
   истины; предложение лишь заполняет n.days[7].

   Чистая часть (computeProfile и помощники) не трогает DOM и state —
   тестируется без браузера: node tools/habit-schedule-test.js

   Модель дня — та же, что в приложении: сутки начинаются в dayStart
   (обычно 02:00), ночные приёмы принадлежат предыдущему дню; минуты
   считаем от начала водного дня (аналог dayMinOf из app.js). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.HabitSchedule = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var WINDOW_DAYS = 56;   /* 8 недель истории */
  var MIN_TOTAL = 10;     /* меньше — «данных пока мало», предложений нет */
  var MIN_GROUP_OK = 10;  /* дней в группе для уверенной оценки */
  var MIN_GROUP = 5;      /* меньше — группа не показывается */
  var SLOT_SHARE = 0.25;  /* пик гистограммы не слабее 25% от главного */
  var MAX_SLOTS = 5;

  function minutesOf(hm) {
    var p = String(hm || "0:00").split(":");
    return ((+p[0] || 0) * 60 + (+p[1] || 0) + 1440) % 1440;
  }

  function hm(min) {
    var m = ((Math.round(min) % 1440) + 1440) % 1440;
    return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  }

  function addDaysIso(iso, n) {
    var p = String(iso).split("-").map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
    return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
  }

  /* Пн=0 … Вс=6 — как weekdayIndex в app.js. */
  function weekdayIndexOf(iso) {
    var p = String(iso).split("-").map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
    return d === 0 ? 6 : d - 1;
  }

  /* Водный день приёма: приём раньше dayStart принадлежит предыдущему дню. */
  function waterDayOf(e, dayStartMin) {
    var m = minutesOf(e.time);
    return m < dayStartMin ? addDaysIso(e.date, -1) : e.date;
  }

  /* Минуты от начала водного дня (аналог dayMinOf). */
  function dayMinOf(time, dayStartMin) {
    return (minutesOf(time) - dayStartMin + 2880) % 1440;
  }

  function median(list) {
    if (!list.length) return 0;
    var s = list.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
  }

  /* Привычные часы питья: часовая гистограмма (бакеты от dayStart),
     вес пика = сумма по трём соседям; кандидаты — непустые бакеты не
     слабее доли главного, подавление соседей (±1 час), топ по весу,
     хронологический вывод. Возвращает минуты реального времени. */
  function habitSlots(allDayMins, dayStartMin) {
    var h = new Array(24).fill(0);
    allDayMins.forEach(function (m) { h[Math.floor(m / 60) % 24] += 1; });
    var s = h.map(function (_, b) {
      return (h[b - 1] || 0) + h[b] + (h[b + 1] || 0);
    });
    var maxS = 0;
    h.forEach(function (v, b) { if (v > 0 && s[b] > maxS) maxS = s[b]; });
    if (maxS <= 0) return [];
    var cand = [];
    for (var b = 0; b < 24; b++) {
      if (h[b] > 0 && s[b] >= SLOT_SHARE * maxS) cand.push(b);
    }
    cand.sort(function (x, y) { return (s[y] - s[x]) || (x - y); });
    var taken = [];
    cand.forEach(function (b) {
      if (taken.some(function (t) { return Math.abs(t - b) <= 1; })) return;
      taken.push(b);
    });
    return taken.slice(0, MAX_SLOTS)
      .sort(function (x, y) { return x - y; })
      .map(function (b) { return (dayStartMin + b * 60) % 1440; });
  }

  function groupProfile(dayList, opts, volList) {
    /* dayList: [{first, last, mins:[…], minsSlot:[…]}] — дни с анализ-первой
       порцией; volList (v144) — дни для медианы объёма, включая ночные. */
    if (dayList.length < MIN_GROUP) return null;
    var firsts = dayList.map(function (d) { return d.first; });
    var lasts = dayList.map(function (d) { return d.last; });
    var all = [];
    dayList.forEach(function (d) { all = all.concat(d.minsSlot || d.mins); });
    /* first/last — минуты от начала водного дня; возвращаем реальное
       время суток (как у слотов): плюс dayStart. */
    /* v148 «ноль»: подъём периода = медиана его первых порций, без смещения. */
    var wakeMin = (opts.dayStartMin + median(firsts) + 2880) % 1440;
    var sleepMin = (opts.dayStartMin + median(lasts) + opts.beforeSleepMin) % 1440;
    var volSrc = volList || dayList;
    var vols = volSrc.map(function (d) { return Number(d.vol) || 0; });
    return {
      days: dayList.length,
      conf: dayList.length >= MIN_GROUP_OK ? "ok" : "rough",
      wakeMin: wakeMin,
      sleepMin: sleepMin,
      slots: habitSlots(all, opts.dayStartMin),
      volMed: vols.length ? median(vols) : 0
    };
  }

  /* ── v132: режимы будней и предиктор первой порции ───────────────────
     Усреднения между режимами нет: будни живут режимами «ранний»
     (первая порция до 07:00) и «поздний» (с 09:00); промежуточные
     07:00–09:00 относятся к ближнему. Завтрашний режим угадывается:
     со вторника по воскресенье — по прошедшим дням той же недели,
     в понедельник (и в начале любой недели) — по циклу недель:
     ищем наименьший период P из {2,4,8}, который повторился подряд
     не менее двух раз (неделя через неделю — P=2), и продолжаем его;
     нет чистого цикла — берём режим последней недели. Цена адаптации
     после смены длины цикла — один новый цикл наблюдения. */
  var EARLY_BEFORE = 7 * 60, LATE_FROM = 9 * 60, MID_SPLIT = 8 * 60;
  var MODE_MIN = 3;  /* дней в режиме, чтобы показывать его отдельно */

  /* v144: ночная граница — производная по данным (слово владельца 03.11,
     мини-спека docs/night-filter-spec.md, вариант в). Ищем самый большой
     разрыв между соседними первыми порциями утрами; кластер ниже разрыва —
     меньшинство (<=40% дней) и отстоит >=90 мин — это ночи, а не образ жизни:
     граница = середина разрыва. Нет отдельного ночного кластера — фильтр
     выключен (null): искренне ранняя жизнь остаётся честной. */
  var NIGHT_GAP_MIN = 90, NIGHT_MAX_SHARE = 0.4;
  function nightBoundary(recs, dayStartMin) {
    var vals = [];
    recs.forEach(function (r) {
      var f = (dayStartMin + r.first) % 1440;
      if (f < 720) vals.push(f);
    });
    if (vals.length < MIN_GROUP + 1) return null;
    vals.sort(function (a, b) { return a - b; });
    var best = -1, bs = 0, be = 0;
    for (var i = 1; i < vals.length; i++) {
      var g = vals[i] - vals[i - 1];
      if (g > best) { best = g; bs = vals[i - 1]; be = vals[i]; }
    }
    if (best < NIGHT_GAP_MIN) return null;
    /* v144: нижний кластер целиком до 05:30 — иначе это не ночи, а законный
       ранний режим (например, 06:00 против 10:00): его не фильтруем. */
    if (bs > 5 * 60 + 30) return null;
    var lower = vals.filter(function (v) { return v <= bs; }).length;
    if (lower < 1 || lower > vals.length * NIGHT_MAX_SHARE) return null;
    var mid = Math.round((bs + be) / 2 / 5) * 5;
    return Math.max(dayStartMin + 60, Math.min(7 * 60, mid));
  }

  function dayMode(firstRealMin) {
    if (firstRealMin < EARLY_BEFORE) return "E";
    if (firstRealMin >= LATE_FROM) return "L";
    return firstRealMin < MID_SPLIT ? "E" : "L";
  }

  /* Неделя с понедельника: индекс недели от эпохи. */
  function weekKey(iso) {
    var p = String(iso).split("-").map(Number);
    return Math.floor((Date.UTC(p[0], p[1] - 1, p[2]) / 86400000 + 3) / 7);
  }

  function weekModesSeq(weekRecs, dayStartMin) {
    var wk = {};
    weekRecs.forEach(function (r) {
      /* v144: день только с ночными порциями режим недели не голосует */
      if (r.first == null) return;
      var w = weekKey(r.iso);
      if (!wk[w]) wk[w] = { E: 0, L: 0, days: 0 };
      wk[w][dayMode((dayStartMin + r.first) % 1440)] += 1;
      wk[w].days += 1;
    });
    return Object.keys(wk).map(Number).sort(function (a, b) { return a - b; }).map(function (w) {
      var x = wk[w];
      /* неделя с кашей из режимов не участвует в цикле */
      var mixed = x.days >= 4 && Math.abs(x.E - x.L) <= 1;
      return { w: w, mode: mixed ? "X" : (x.E >= x.L ? "E" : "L"), E: x.E, L: x.L, days: x.days };
    });
  }

  function findCycle(seq) {
    var Ps = [2, 4, 8];
    for (var i = 0; i < Ps.length; i++) {
      var P = Ps[i];
      if (seq.length < 2 * P) continue;
      var tail = seq.slice(-2 * P).map(function (x) { return x.mode; });
      if (tail.indexOf("X") >= 0) continue;
      var ok = true;
      for (var k = 0; k < P; k++) if (tail[k] !== tail[k + P]) { ok = false; break; }
      if (ok) return P;
    }
    return 0;
  }

  /* Режим дня targetIso: контекст недели → цикл недель → последняя неделя. */
  function predictMode(targetIso, weekRecs, dayStartMin) {
    var wt = weekKey(targetIso);
    var same = weekRecs.filter(function (r) { return weekKey(r.iso) === wt && r.iso < targetIso; });
    if (same.length) {
      same = same.filter(function (r) { return r.first != null; });
      var e = same.filter(function (r) { return dayMode((dayStartMin + r.first) % 1440) === "E"; }).length;
      return { mode: e >= same.length - e ? "E" : "L", rule: "week" };
    }
    var seq = weekModesSeq(weekRecs.filter(function (r) { return weekKey(r.iso) < wt; }), dayStartMin);
    var clean = seq.filter(function (x) { return x.mode !== "X"; });
    if (!clean.length) return { mode: null, rule: "none" };
    var P = findCycle(seq);
    if (P) return { mode: seq[seq.length - P].mode, rule: "cycle", P: P };
    return { mode: clean[clean.length - 1].mode, rule: "lastweek" };
  }

  /* Главный вход анализатора.
     entries — [{date:"YYYY-MM-DD", time:"HH:MM"}], opts —
     {dayStart:"02:00", afterWakeMin:60, beforeSleepMin:60, todayIso}.
     Результат: {status:"little"|"ok", totalDays, weekday, weekend} —
     группы null, если дней меньше MIN_GROUP. weekday в v132 считается
     по дням угаданного на завтра режима и несёт modes/rule/cycleP. */
  function computeProfile(entries, opts) {
    opts = opts || {};
    var dayStartMin = minutesOf(opts.dayStart || "02:00");
    var afterWakeMin = Number(opts.afterWakeMin) || 0;
    var beforeSleepMin = Number(opts.beforeSleepMin) || 0;
    var todayIso = opts.todayIso;
    var fromIso = todayIso ? addDaysIso(todayIso, -WINDOW_DAYS) : null;

    var byDay = {};
    (entries || []).forEach(function (e) {
      if (!e || !e.date || !e.time) return;
      var wd = waterDayOf(e, dayStartMin);
      if (fromIso && wd < fromIso) return;
      if (todayIso && wd > todayIso) return;
      var m = dayMinOf(e.time, dayStartMin);
      /* v135: день несёт и сумму объёмов — медиана суточных объёмов
         даёт «привычный объём» группы (будни/выходные). */
      if (!byDay[wd]) byDay[wd] = { mins: [], vol: 0 };
      byDay[wd].mins.push(m);
      byDay[wd].vol += Math.max(0, Number(e.volume) || 0);
    });

    var weekDays = [], endDays = [];
    Object.keys(byDay).forEach(function (iso) {
      var mins = byDay[iso].mins.slice().sort(function (a, b) { return a - b; });
      var rec = { iso: iso, first: mins[0], last: mins[mins.length - 1], mins: mins, vol: byDay[iso].vol };
      (weekdayIndexOf(iso) < 5 ? weekDays : endDays).push(rec);
    });
    weekDays.sort(function (a, b) { return a.iso < b.iso ? -1 : 1; });

    /* v144: ночной фильтр: первая порция дня для анализа подъёма/режимов/
       слотов — первая не раньше производной границы; день только с ночными
       порциями в подъёме не участвует, в объёмах остаётся. */
    /* v144: ранние дни, сложенные в целые недели (две и более чистых ранних
       недели), — это образ жизни, а не ночи: фильтр выключен. Ночные всплески
       рассеяны по неделям и недель не образуют. */
    var cleanEarlyWeeks = weekModesSeq(weekDays, dayStartMin)
      .filter(function (x) { return x.mode === "E" && x.E >= 4; }).length;
    var nb = cleanEarlyWeeks >= 2 ? null : nightBoundary(weekDays.concat(endDays), dayStartMin);
    var nightCount = 0;
    weekDays.concat(endDays).forEach(function (r) {
      r.firstRaw = r.first;
      if (nb == null) { r.minsSlot = r.mins; return; }
      var t = nb - dayStartMin, af = null, cnt = 0;
      for (var i = 0; i < r.mins.length; i++) {
        if (r.mins[i] < t) cnt++;
        else if (af == null) af = r.mins[i];
      }
      nightCount += cnt;
      r.first = af;
      r.minsSlot = r.mins.filter(function (m) { return m >= t; });
    });

    var totalDays = weekDays.length + endDays.length;
    var o = { dayStartMin: dayStartMin, afterWakeMin: afterWakeMin, beforeSleepMin: beforeSleepMin };
    var weekend = groupProfile(endDays.filter(function (d) { return d.first != null; }), o, endDays);

    /* v132: будни — по угаданному на завтра режиму, без усреднения между.
       v144: дни только с ночными порциями режим не голосуют. */
    var modes = { E: [], L: [] };
    weekDays.forEach(function (r) {
      if (r.first == null) return;
      modes[dayMode((dayStartMin + r.first) % 1440)].push(r);
    });
    var target = todayIso ? addDaysIso(todayIso, 1) : null;
    var pred = target ? predictMode(target, weekDays, dayStartMin) : { mode: null, rule: "none" };
    var wdF = weekDays.filter(function (d) { return d.first != null; });
    var predDays = pred.mode ? modes[pred.mode] : wdF;
    var weekday = groupProfile(predDays.length ? predDays : wdF, o, weekDays);
    if (weekday) {
      weekday.mode = pred.mode;
      weekday.rule = pred.rule;
      weekday.cycleP = pred.P || 0;
      weekday.twoModes = modes.E.length >= MODE_MIN && modes.L.length >= MODE_MIN;
      weekday.modes = {};
      ["E", "L"].forEach(function (m) {
        var g = modes[m].length >= MODE_MIN ? groupProfile(modes[m], o, modes[m]) : null;
        weekday.modes[m] = g ? { days: g.days, wakeMin: g.wakeMin, sleepMin: g.sleepMin, slots: g.slots, conf: g.conf, volMed: g.volMed } : null;
      });
    }
    return {
      nightBound: nb, nightCount: nightCount, dsMin: dayStartMin,
      status: totalDays < MIN_TOTAL ? "little" : "ok",
      totalDays: totalDays,
      weekday: weekday,
      weekend: weekend,
      dayStartMin: dayStartMin,
      _weekRecs: weekDays
    };
  }

  /* ── v133: динамический темп напоминаний ─────────────────────────────
     Промежуток такой, чтобы оставшийся объём, разлитый по типичным
     порциям, уместился до конца бодрствования: slots = ceil(остаток /
     порция), step = остаток_минут / slots, но не чаще минимальной паузы
     (отставание честно добирается минимумом, а не чудом). 0 — распределять
     нечего: норма выпита или бодрствование кончилось. Чистая функция —
     тестируется без браузера. */
  function paceStepMin(nowMs, endMs, remainingMl, portionMl, minStepMin, maxStepMin) {
    if (!(remainingMl > 0) || !(endMs > nowMs)) return 0;
    var portion = portionMl > 0 ? portionMl : 250;
    var remainMin = (endMs - nowMs) / 60000;
    var slots = Math.ceil(remainingMl / portion);
    if (slots < 1) slots = 1;
    var step = Math.floor(remainMin / slots);
    var min = minStepMin > 0 ? minStepMin : 45;
    if (step < min) step = Math.min(min, Math.floor(remainMin));
    if (step < 1) step = 1;
    /* v135: безопасный потолок — при опережении графика интервал не
       растягивается «до бесконечности» (без параметра поведения нет). */
    if (maxStepMin > 0 && step > maxStepMin) step = maxStepMin;
    return step;
  }

  /* Типичная порция: медиана фактических объёмов за последние days дней
     (настенные даты); нет данных — 250 мл. */
  function medianPortion(entries, todayIso, days) {
    days = days || 7;
    var from = addDaysIso(todayIso, -(days - 1));
    var vols = [];
    (entries || []).forEach(function (e) {
      if (!e || !e.date || e.date < from || e.date > todayIso) return;
      var v = Number(e.volume) || 0;
      if (v > 0) vols.push(v);
    });
    if (!vols.length) return 250;
    return median(vols);
  }

  /* Окна на ближайшие 7 дней для авторежима: будни — окно угаданного
     режима своего дня, выходные — медиана выходных. Индекс = Пн0…Вс6. */
  function autoWindows(entries, opts) {
    opts = opts || {};
    var prof = computeProfile(entries, opts);
    if (prof.status !== "ok" || !prof.weekday || !prof.weekend || !opts.todayIso) return { ok: false, prof: prof };
    var dayStartMin = prof.dayStartMin;
    var days7 = [];
    for (var d = 0; d < 7; d++) {
      var iso = addDaysIso(opts.todayIso, d);
      var wi = weekdayIndexOf(iso);
      if (wi >= 5) {
        days7[wi] = { wake: hm(prof.weekend.wakeMin), sleep: hm(prof.weekend.sleepMin) };
        continue;
      }
      var pr = predictMode(iso, prof._weekRecs, dayStartMin);
      var g = pr.mode && prof.weekday.modes[pr.mode];
      var src = g || prof.weekday;
      days7[wi] = { wake: hm(src.wakeMin), sleep: hm(src.sleepMin), mode: pr.mode, rule: pr.rule };
    }
    return { ok: true, days7: days7, rule: prof.weekday.rule, cycleP: prof.weekday.cycleP, prof: prof };
  }

  /* Что изменится при применении: сравнение предложения с текущими
     n.days по группам Пн–Пт (0–4) и Сб–Вс (5–6). */
  function applyPreview(prof, days) {
    var out = [];
    var groups = [
      { label: "Пн–Пт", idx: [0, 1, 2, 3, 4], g: prof.weekday },
      { label: "Сб–Вс", idx: [5, 6], g: prof.weekend }
    ];
    groups.forEach(function (gr) {
      if (!gr.g) return;
      var want = { wake: hm(gr.g.wakeMin), sleep: hm(gr.g.sleepMin) };
      var changed = gr.idx.some(function (i) {
        var d = days && days[i];
        return !d || d.wake !== want.wake || d.sleep !== want.sleep;
      });
      var cur = (days && days[gr.idx[0]]) || { wake: "—", sleep: "—" };
      out.push({
        label: gr.label, changed: changed,
        wakeFrom: cur.wake, wakeTo: want.wake,
        sleepFrom: cur.sleep, sleepTo: want.sleep,
        wakeMin: gr.g.wakeMin, sleepMin: gr.g.sleepMin
      });
    });
    return out;
  }

  /* v135: привычный объём — медиана суточных объёмов группы ЗAВТРАШНЕГО
     дня (будни уже сужены до угаданного режима). Округление до 50 мл;
     границы ручной нормы: <500 не предлагаем, >5000 клампим. Только
     предложение: применяет владелец кнопкой (принцип модуля). */
  function volumeSuggestion(entries, opts) {
    opts = opts || {};
    if (!opts.todayIso) return null;
    var prof = computeProfile(entries, opts);
    if (prof.status !== "ok") return null;
    var isEnd = weekdayIndexOf(addDaysIso(opts.todayIso, 1)) >= 5;
    var g = isEnd ? prof.weekend : prof.weekday;
    if (!g || !(g.volMed > 0) || g.days < MIN_GROUP) return null;
    var ml = Math.round(g.volMed / 50) * 50;
    if (ml < 500) return null;
    if (ml > 5000) ml = 5000;
    return { ml: ml, days: g.days, group: isEnd ? "end" : "week", volMed: g.volMed };
  }

  /* v137 (фаза 1): периоды жизни и их объёмы. Период = группа дней, которую
     анализатор уже различает: будни раннего режима, будни позднего режима
     (когда оба накопили), иначе будни целиком; выходные отдельно. Объём
     периода = медиана суточных объёмов его дней (как volumeSuggestion).
     Норму эти числа НЕ меняют: они становятся целью напоминаний только
     кнопкой владельца (state.paceGoals в app.js). */
  function periodMl(g) {
    if (!g || !(g.volMed > 0) || g.days < MIN_GROUP) return null;
    var ml = Math.round(g.volMed / 50) * 50;
    if (ml < 500) return null;
    return Math.min(5000, ml);
  }
  function periods(entries, opts) {
    opts = opts || {};
    if (!opts.todayIso) return [];
    var prof = computeProfile(entries, opts);
    if (prof.status !== "ok") return [];
    var raw = [];
    var w = prof.weekday;
    if (w && w.twoModes && w.modes.E && w.modes.L) {
      raw.push({ key: "week-E", label: "Будни раннего режима", g: w.modes.E });
      raw.push({ key: "week-L", label: "Будни позднего режима", g: w.modes.L });
    } else if (w) {
      raw.push({ key: "week", label: "Будни", g: w });
    }
    if (prof.weekend) raw.push({ key: "end", label: "Выходные", g: prof.weekend });
    return raw.map(function (p) {
      return { key: p.key, label: p.label, days: p.g.days, volMed: p.g.volMed, ml: periodMl(p.g) };
    });
  }
  /* Ключ периода для даты: выходные — «end»; будни — по фактическому режиму
     дня (первая порция), а пока порций нет — по предиктору режима. Если
     будни не разделились на два режима — ключ «week» любому режиму. */
  function periodKeyForDate(entries, opts, dateIso) {
    opts = opts || {};
    if (!opts.todayIso || !dateIso) return null;
    if (weekdayIndexOf(dateIso) >= 5) return "end";
    var prof = computeProfile(entries, opts);
    if (!prof.weekday) return null;
    if (!prof.weekday.twoModes) return "week";
    var ds = prof.dayStartMin;
    var rec = (prof._weekRecs || []).filter(function (r) { return r.iso === dateIso; })[0];
    var mode = rec && rec.first != null ? dayMode((ds + rec.first) % 1440) : null;
    if (!mode) mode = (predictMode(dateIso, prof._weekRecs || [], ds) || {}).mode || null;
    return mode ? "week-" + mode : null;
  }

  /* Живая подпись строки в каталоге настроек. */
  function subLabel(prof, esc) {
    esc = esc || function (s) { return s; };
    if (!prof || prof.status === "little") return esc("Данных пока мало");
    var bits = [];
    if (prof.weekday) bits.push("будни " + hm(prof.weekday.wakeMin) + "–" + hm(prof.weekday.sleepMin));
    if (prof.weekend) bits.push("выходные " + hm(prof.weekend.wakeMin) + "–" + hm(prof.weekend.sleepMin));
    if (!bits.length) return esc("Данных пока мало");
    return esc(bits.join(" · ") + " · по " + prof.totalDays + " дням");
  }

  function slotWords(g) {
    if (!g || !g.slots.length) return "";
    return "обычно пьёте около " + g.slots.map(function (m) { return hm(m); }).join(", ");
  }

  /* Экран «Расписание по привычке» (ui alert-habit, возврат в folder-alerts). */
  function page(env) {
    var state = env.state, esc = env.esc, uiIcon = env.uiIcon, UiKit = env.UiKit,
      ensureAlerts = env.ensureAlerts, todayStr = env.todayStr;
    var n = ensureAlerts();
    var prof = computeProfile(state.entries, {
      dayStart: state.dayStart || "02:00",
      afterWakeMin: n.afterWakeMin, beforeSleepMin: n.beforeSleepMin,
      todayIso: todayStr()
    });
    var html = UiKit.header({ ui: "alert-habit", cls: "top plain sub", back: uiIcon("back"), title: "Расписание по привычке" });

    if (prof.status === "little") {
      html += '<p class="hint">Данных пока мало: чтобы найти закономерность, нужно хотя бы две недели истории (сейчас ' + prof.totalDays + " " + dayWord(prof.totalDays) + '). Приложение смотрит на время приёмов и предлагает подъём, сон и привычные часы питья — отдельно для будней и выходных.</p>';
      return html;
    }

    [["Будни", prof.weekday], ["Выходные", prof.weekend]].forEach(function (pair) {
      var title = pair[0], g = pair[1];
      html += '<div class="n-section">' + title + "</div>";
      if (!g) {
        html += '<p class="hint">По этой группе дней пока мало — оценка появится, когда наберётся хотя бы ' + MIN_GROUP + " дней.</p>";
        return;
      }
      var lines = "";
      if (title === "Будни" && g.twoModes && g.modes.E && g.modes.L) {
        /* v132: два режима вместо усреднения — показываем оба и прогноз. */
        var firstOf = function (m) { return hm((g.modes[m].wakeMin + n.afterWakeMin) % 1440); };
        lines += "На буднях два режима. Ранний (" + g.modes.E.days + " " + dayWord(g.modes.E.days) + "): первая порция около " + firstOf("E") + ", сон около " + hm(g.modes.E.sleepMin) + ". Поздний (" + g.modes.L.days + " " + dayWord(g.modes.L.days) + "): первая порция около " + firstOf("L") + ", сон около " + hm(g.modes.L.sleepMin) + ". ";
        var ruleWords = g.rule === "week" ? "по прошедшим дням этой недели"
          : g.rule === "cycle" ? "недели в истории чередуются с периодом " + g.cycleP + " — продолжаю чередование"
          : g.rule === "lastweek" ? "чистого цикла не видно — беру режим последней недели"
          : "режим не угадан — беру все будни";
        lines += "Завтра жду " + (g.mode === "E" ? "ранний" : g.mode === "L" ? "поздний" : "смешанный") + " режим: " + ruleWords + ". ";
      }
      lines += "Подъём около " + hm(g.wakeMin) + ", сон около " + hm(g.sleepMin) + ".";
      if (g.volMed > 0) lines += " Привычный объём — около " + (Math.round(g.volMed / 50) * 50) + " мл в сутки.";
      var sw = slotWords(g);
      if (sw) lines += " В эти дни " + sw + ".";
      lines += g.conf === "rough"
        ? " Дней маловато (" + g.days + ") — оценка примерная."
        : title === "Будни" && g.twoModes
          ? " Окно завтрашнего дня — по дням угаданного режима."
          : " По " + g.days + " дням за последние 8 недель.";
      html += '<p class="hint">' + esc(lines) + "</p>";
    });

    /* v144: прозрачность производной ночной границы */
    if (prof.nightBound != null && prof.nightCount > 0) {
      html += '<p class="hint">' + esc("Ночные порции (" + hm(prof.dsMin) + "–" + hm(prof.nightBound) +
        ") не учтены в подъёме и привычных часах: " + prof.nightCount + ". Границу модуль вывел сам по щели между ночными и дневными первыми порциями.") + '</p>';
    }
    if (state.habitAuto) {
      html += '<p class="hint">Авторежим будней включён: окно Пн–Пт обновляется само каждый день по угаданному режиму; выходные стоят применёнными.</p>';
      html += UiKit.row({ ui: "habit-auto-off", title: "Выключить авторежим будней", sub: "окна снова правятся только вручную", act: "habit-auto-off" });
    }

    var preview = applyPreview(prof, n.days);
    var changes = preview.filter(function (r) { return r.changed; });
    if (changes.length) {
      html += '<div class="n-section">Что изменится</div>';
      preview.forEach(function (r) {
        var txt = r.changed
          ? r.label + ": подъём " + r.wakeFrom + " → " + r.wakeTo + ", сон " + r.sleepFrom + " → " + r.sleepTo
          : r.label + ": без изменений (" + r.wakeTo + "–" + r.sleepTo + ")";
        html += '<p class="hint">' + esc(txt) + "</p>";
      });
      html += UiKit.row({ ui: "habit-apply", title: "Применить к периоду уведомлений", sub: "Обновит подъём и сон по дням недели", act: "habit-apply" });
    } else {
      html += '<p class="hint">Текущий период уведомлений уже совпадает с привычкой — менять нечего.</p>';
    }
    /* v137 (фаза 1): объёмы периодов → цели напоминаний. Норма дня
       неприкосновенна; принятый объём меняет только напоминания своих дней
       и только вверх (max в app.js). Применяет исключительно владелец. */
    var pers = periods(state.entries, {
      dayStart: state.dayStart || "02:00",
      afterWakeMin: n.afterWakeMin, beforeSleepMin: n.beforeSleepMin,
      todayIso: todayStr()
    }).filter(function (pp) { return pp.ml; });
    var pgoals = state.paceGoals && typeof state.paceGoals === "object" ? state.paceGoals : {};
    if (pers.length) {
      html += '<div class="n-section">Объём по периодам</div>';
      html += '<p class="hint">' + esc("Норма дня не меняется (от веса или ручная). Принятый объём периода ведёт напоминания своих дней, если он выше нормы; ниже нормы — всё как сегодня.") + '</p>';
      var adoptedAny = 0;
      pers.forEach(function (pp) {
        var ad = Number(pgoals[pp.key]) > 0 ? Number(pgoals[pp.key]) : 0;
        if (ad) adoptedAny++;
        var sub = "около " + pp.ml + " мл в сутки, " + pp.days + " " + dayWord(pp.days) +
          (ad
            ? (ad === pp.ml ? " · напоминания ведут к " + ad
               : " · напоминания ведут к " + ad + ", статистика сейчас " + pp.ml)
            : " · напоминания пока ведут к норме дня");
        html += UiKit.row({ ui: "habit-period-" + pp.key, title: pp.label + ": считать для напоминаний периода", sub: sub, act: "habit-period-apply", data: { v: pp.key } });
      });
      html += UiKit.row({ ui: "habit-periods-all", title: "Принять все периоды разом", sub: pers.map(function (pp) { return pp.label.toLowerCase() + " " + pp.ml; }).join(", "), act: "habit-periods-apply-all" });
      if (adoptedAny) {
        html += UiKit.row({ ui: "habit-periods-reset", title: "Сбросить все периоды к норме", sub: "напоминания снова ведут к норме дня", act: "habit-periods-reset" });
      }
    }
    html += '<p class="hint">Предложение ничего не меняет само: нажмите «Применить» или поправьте дни вручную в «Периоде уведомлений».</p>';
    return html;
  }

  function dayWord(n) {
    var a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return "дней";
    if (b > 1 && b < 5) return "дня";
    if (b === 1) return "день";
    return "дней";
  }

  return {
    computeProfile: computeProfile,
    autoWindows: autoWindows,
    paceStepMin: paceStepMin,
    medianPortion: medianPortion,
    predictMode: predictMode,
    dayMode: dayMode,
    weekKey: weekKey,
    findCycle: findCycle,
    applyPreview: applyPreview,
    volumeSuggestion: volumeSuggestion,
    periods: periods,
    periodKeyForDate: periodKeyForDate,
    subLabel: subLabel,
    page: page,
    hm: hm,
    minutesOf: minutesOf,
    waterDayOf: waterDayOf,
    dayMinOf: dayMinOf,
    weekdayIndexOf: weekdayIndexOf,
    median: median,
    WINDOW_DAYS: WINDOW_DAYS,
    MIN_TOTAL: MIN_TOTAL,
    MIN_GROUP: MIN_GROUP
  };
});
