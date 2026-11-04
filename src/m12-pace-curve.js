/* M12 pace-predictor: кривая ритма (донор pace-curve.js, байт-порт v158). Регистр M12, контракты C-005/C-006. */
/* Фаза 2 (путь А, веб только): внутридневная кривая ритма для темпа.
   Кривая = медиана накопленного выпитого по 5-минутным корзинам суток среди
   одноимённых дней периода фазы 1 (week-E/week-L/week/end) за 6 недель,
   при нехватке дней (< 4) окно растёт до 8 недель. Шаг темпа = время до
   пересечения кривой с «выпито + порция», клампы 45–120 мин; опережение
   ритма = поддерживающий шаг 120. Кривая не меняет норму и цели периодов,
   в состояние не пишется. Спека: docs/phase2-spec.md. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PaceCurve = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var BIN = 5, BINS = 1440 / BIN;      /* корзины по 5 минут водных суток */
  var MIN_DAYS = 4;                    /* вес уверенности: минимум дней */
  var WIN6 = 42, WIN8 = 56;            /* окно 6 недель, расширение до 8 */
  var STEP_MIN = 45, STEP_MAX = 120;   /* клампы шага, SAFE_MAX из v135 */

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function hmOf(min) { min = ((min % 1440) + 1440) % 1440; return pad(Math.floor(min / 60)) + ":" + pad(min % 60); }
  function parseHM(s) { var p = String(s || "0:0").split(":"); return (Number(p[0]) || 0) * 60 + (Number(p[1]) || 0); }
  function median(list) {
    var s = list.slice().sort(function (a, b) { return a - b; });
    if (!s.length) return 0;
    var m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function isoOf(d) { return d.toISOString().slice(0, 10); }
  function addDaysIso(iso, n) {
    var d = new Date(iso + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return isoOf(d);
  }
  /* Водные сутки записи: день начинается в dayStartMin. */
  function waterDayOf(e, dayStartMin) {
    var t = String(e.time || "");
    var m = parseHM(t);
    var d = String(e.date || "");
    if (m < dayStartMin) d = addDaysIso(d, 1);
    return d;
  }
  function dayMinOf(time, dayStartMin) {
    return ((parseHM(time) - dayStartMin) % 1440 + 1440) % 1440;
  }

  /* Накопленная ступенька выпитого одного дня по корзинам. */
  function cumOfDay(list, dayStartMin) {
    var c = new Array(BINS).fill(0);
    list.slice().sort(function (a, b) { return dayMinOf(a.time, dayStartMin) - dayMinOf(b.time, dayStartMin); })
      .forEach(function (e) {
        var b = Math.min(BINS - 1, Math.floor(dayMinOf(e.time, dayStartMin) / BIN));
        for (var i = b; i < BINS; i++) c[i] += Number(e.volume) || 0;
      });
    return c;
  }

  /* Кривая периода текущего дня: { bins, days, key, label } или null. */
  function curveFor(entries, opts) {
    opts = opts || {};
    if (!window.HabitSchedule || !HabitSchedule.periodKeyForDate || !opts.todayIso) return null;
    var ds = parseHM(opts.dayStart || "02:00");
    var k0 = HabitSchedule.periodKeyForDate(entries, opts, opts.todayIso);
    if (!k0) return null;
    var byDay = {};
    (entries || []).forEach(function (e) {
      if (!(Number(e.volume) > 0)) return;
      var d = waterDayOf(e, ds);
      (byDay[d] = byDay[d] || []).push(e);
    });
    function collect(win) {
      var days = [];
      for (var i = 1; i <= win; i++) {
        var iso = addDaysIso(opts.todayIso, -i);
        if (HabitSchedule.periodKeyForDate(entries, opts, iso) !== k0) continue;
        var list = byDay[iso];
        if (!list || !list.length) continue;
        days.push(cumOfDay(list, ds));
      }
      return days;
    }
    var days = collect(WIN6);
    if (days.length < MIN_DAYS) days = collect(WIN8);
    if (days.length < MIN_DAYS) return null;
    var bins = new Array(BINS);
    for (var b = 0; b < BINS; b++) {
      var col = [];
      for (var d = 0; d < days.length; d++) col.push(days[d][b]);
      bins[b] = median(col);
    }
    /* сглаживание ±1 корзина и монотонность: кривая не падает */
    var sm = bins.map(function (_, i) { return median(bins.slice(Math.max(0, i - 1), i + 2)); });
    for (var j = 1; j < BINS; j++) if (sm[j] < sm[j - 1]) sm[j] = sm[j - 1];
    var label = "";
    if (HabitSchedule.periods) {
      (HabitSchedule.periods(entries, opts) || []).forEach(function (p) { if (p.key === k0) label = p.label; });
    }
    /* данных на список периодов ещё не хватает, а кривая уже работает —
       называем период словами по ключу, прозрачность не пустеет */
    if (!label) label = ({ "week": "будни", "week-E": "будни раннего режима", "week-L": "будни позднего режима", "end": "выходные" })[k0] || k0;
    return { bins: sm, days: days.length, key: k0, label: label };
  }

  /* Пересечение кривой с «выпито + порция» от текущей минуты суток.
     Возвращает { stepMin, ahead, wallHM, usualMl, periodLabel, days } или null. */
  function explain(entries, opts, nowMs, drunk, portion) {
    var cv = curveFor(entries, opts);
    if (!cv) return null;
    var ds = parseHM(opts.dayStart || "02:00");
    var nowMin = ((Math.floor(nowMs / 60000) % 1440) - ds % 1440 + 1440 * 2) % 1440;
    var nowBin = Math.min(BINS - 1, Math.floor(nowMin / BIN));
    var target = (Number(drunk) || 0) + (Number(portion) || 0);
    if (target <= cv.bins[BINS - 1]) {
      for (var b = nowBin + 1; b < BINS; b++) {
        if (cv.bins[b] >= target) {
          var step = b * BIN - nowMin;
          if (step < 1) step = 1;
          return {
            stepMin: Math.max(STEP_MIN, Math.min(STEP_MAX, step)),
            ahead: false,
            wallHM: hmOf(ds + b * BIN),
            usualMl: Math.round(cv.bins[b]),
            periodLabel: cv.label, days: cv.days
          };
        }
      }
    }
    /* пересечения впереди нет: выпито уже у конца кривой или ритм дня кончился —
       опережение, поддерживающий шаг по слову владельца 01.11 */
    return { stepMin: STEP_MAX, ahead: true, wallHM: null, usualMl: Math.round(cv.bins[BINS - 1]), periodLabel: cv.label, days: cv.days };
  }

  return {
    curveFor: curveFor,
    explain: explain,
    MIN_DAYS: MIN_DAYS, WIN6: WIN6, WIN8: WIN8, STEP_MIN: STEP_MIN, STEP_MAX: STEP_MAX
  };
});
