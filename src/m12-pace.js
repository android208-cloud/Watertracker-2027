/* M12 pace-predictor — фасад темпа: политика шага и тексты по случаям.
   Контракты: C-005 (тексты уведомлений по случаям; интервалы 60–90 мин;
   последний напомин ~за 90 мин до сна; анализатор простой без ML; без
   усреднений кроме выходных; самоадаптивный период; темп к концу
   бодрствования), C-006 (предиктор — не отдельная сущность, часть дневного
   экрана: объяснение шага живёт в подписях и статусах, своего экрана нет).
   Механика — байт-порты донора: m12-habit-schedule.js (анализатор привычки,
   v128–v148) и m12-pace-curve.js (кривая ритма, фаза 2 путь А). Фасад портит
   из app.js v158: 3304–3315 (freqLabel), 3372–3401 (isPace, SAFE_MAX_MIN,
   paceEveryMin), 3406–3425 (notifyTextsRender), 3498–3508 (якорь статуса
   темпа). Конструктор: фасад чист — всё живое (выпито, цель, окно, сейчас)
   приходит контекстом ctx; состояние и DOM не трогает.
   Связи: вниз — M03 (записи), M19; вверх — M13 reminders (payload), M15
   (подписи настроек). */
(function (W) {
  "use strict";
  var SAFE_MAX_MIN = 120;   /* v135: практика гидратации 60–120 мин бодрствования */

  function isPace(n) { return Number(n.everyMin) === -1; }

  function freqLabel(min) {
    var map = {
      0: "Не напоминать",
      10: "Каждые 10 минут",
      30: "Каждые 30 минут",
      60: "Каждый час",
      90: "Каждые 1.5 часа",
      120: "Каждые 2 часа",
      150: "Каждые 2.5 часа",
      180: "Каждые 3 часа",
      "-1": "По темпу к концу бодрствования"
    };
    return map[Number(min)] || "Каждые 2 часа";
  }

  /* Шаг темпа донора (3377–3401): остаток цели на остаток окна; норма закрыта
     и тумблер «после нормы» — поддерживающий ритм SAFE_MAX; кривая ритма
     уточняет шаг, мало данных — темп фазы 1.
     ctx = { entries, n, today, drunk, goal, winFrom, winTo, nowMs, endMs,
             periodOpts, portion? }. */
  function paceEveryMin(ctx) {
    var n = ctx.n;
    var remaining = ctx.goal - ctx.drunk;
    if (remaining <= 0 && !n.whenGoalMet) return 0;
    if (!(ctx.endMs > ctx.nowMs)) return 0;
    if (remaining <= 0) return SAFE_MAX_MIN;
    var HS = W.HabitSchedule;
    var portion = ctx.portion != null ? ctx.portion
      : (HS ? HS.medianPortion(ctx.entries, ctx.today, 7) : 250);
    var PC = W.PaceCurve;
    if (PC && PC.explain && ctx.periodOpts) {
      var ex = PC.explain(ctx.entries, ctx.periodOpts, ctx.nowMs, ctx.drunk, portion);
      if (ex) return ex.stepMin;
    }
    return HS ? HS.paceStepMin(ctx.nowMs, ctx.endMs, remaining, portion, 45, SAFE_MAX_MIN) : 0;
  }

  /* Тексты по случаям донора (3406–3425): свои строки из n.texts, плейс-
     холдеры {drunk}/{goal}/{left}, пустое поле — дефолтная фраза, длины
     65/240. */
  function notifyTextsRender(ctx, casName) {
    var tx = ctx.n.texts && typeof ctx.n.texts === "object" ? ctx.n.texts : {};
    var cas = tx[casName] || {};
    var left = Math.max(0, ctx.goal - ctx.drunk);
    function tpl(t, def) {
      t = String(t == null ? "" : t).trim();
      if (!t) t = def;
      return String(t).split("{drunk}").join(ctx.drunk).split("{goal}").join(ctx.goal).split("{left}").join(left);
    }
    return {
      title: tpl(cas.t, casName === "met" ? "Можно выпить хотя бы немного воды" : "Пора выпить воды").slice(0, 65),
      text: tpl(cas.b, "Выпито " + ctx.drunk + " из " + ctx.goal + " мл").slice(0, 240)
    };
  }

  /* Якорь статуса темпа донора (3498–3508): четыре случая словами. */
  function paceAnchor(ctx) {
    var n = ctx.n;
    if (isPace(n)) {
      if (ctx.goal > 0 && ctx.drunk >= ctx.goal && n.whenGoalMet) {
        return "Темп: норма выпита — поддерживающие напоминания каждые " + freqLabel(SAFE_MAX_MIN);
      }
      if (ctx.period) {
        return "Темп: период «" + ctx.period.label + "», цель " + ctx.period.ml + " мл выше нормы — промежутки рассчитываются, чтобы цель была выпита к концу бодрствования";
      }
      return "Темп: промежутки рассчитываются, чтобы норма была выпита к концу бодрствования";
    }
    return n.evenIfRecent
      ? "Слоты каждые " + freqLabel(n.everyMin) + " от начала периода активности"
      : "Слоты каждые " + freqLabel(n.everyMin) + " после последнего приёма";
  }

  if (W.WT2R) W.WT2R.register({
    id: "M12", file: "m12-pace.js (+m12-habit-schedule.js, m12-pace-curve.js)", layer: 4, optional: false,
    contracts: ["C-005", "C-006"],
    events: [],
    status: "ported"
  });
  W.WT2P = {
    SAFE_MAX_MIN: SAFE_MAX_MIN, isPace: isPace, freqLabel: freqLabel,
    paceEveryMin: paceEveryMin, notifyTextsRender: notifyTextsRender,
    paceAnchor: paceAnchor
  };
})(window);
