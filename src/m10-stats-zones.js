/* M10 stats-zones — статистика дня и столбцы графика (числовое ядро).
   Контракты: C-004 (порядок поясов как на графике — сегменты дня sort'ятся
   тем же сравнением, что пояса котика; потолок нормы 120 — ЖДЁТ СЛОВА
   ВЛАДЕЛЬЦА о месте применения), C-009 (зоны — ЖДУТ СЛОВА И ОБРАЗЦА
   ВЛАДЕЛЬЦА; кода зон нет до решения), C-020/C-024 (схема записей, сироты
   живут своим цветом).
   Перенос с донора v158 как спеки: app.js 1381–1386 (goalFor: дневной
   оверрайд + формула истории), 2574–2643 (труба данных графика: byDate,
   старт от первой записи или today-9, не больше 1600 дней, группы по
   напиткам, цвет воды #61c2f9 вместо дефолта, сироты #5cb4e6 и порядок 999,
   объём порции как в оригинале (не credited), порядок сегментов поясной).
   Конструктор: сравнение поясов приезжает из M08 (WT2B.beltCompare); пока
   M08 нет — порядок каталога, как в доноре без модуля цвета. Зоны и потолок
   приедут отдельным шагом по слову владельца.
   Связи: вниз — M01, M03 (dayEntries), M19 (goalOn, addDays); вверх — M11
   (окно столбцов, разметка), M12/M13 (темпы по статистике). */
(function (W) {
  "use strict";
  var L = function () { return W.WT2L; };
  var J = function () { return W.WT2J; };

  /* Норма дня донора (1381–1386): дневной оверрайд для прошлых дней, иначе
     формула истории (вес/пол на дату). */
  function goalFor(state, date, today) {
    var t = today || todayStr();
    var cur = waterToday(state, t);
    if (date && date !== t && date !== cur && state.dayGoals && state.dayGoals[date] != null) {
      return Number(state.dayGoals[date]);
    }
    return L().goalOn(state, date, t);
  }
  /* Водное «сегодня» донора: настенная дата, сведённая началом суток. */
  function waterToday(state, t) {
    var d = new Date();
    var hm = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    return L().waterDay(t, hm, J() ? J().dayStartOn(state, t) : (state.dayStart || "02:00"));
  }
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /* Итог дня: объём (как мерит оригинал и график) и зачёт (ledger, C-002). */
  function dayStats(state, date) {
    var list = J() ? J().dayEntries(state, date) : [];
    var volume = 0, credited = 0;
    list.forEach(function (e) { volume += Number(e.volume) || 0; credited += Number(e.credited) || 0; });
    var goal = goalFor(state, date);
    return { date: date, volume: volume, credited: credited, goal: goal,
      pct: goal > 0 ? volume / goal : 0 };
  }

  /* Цвет столбца донора (2604): вода с дефолтным цветом становится светлее,
     сирота без цвета — запасным голубым. */
  function barColor(e) {
    var id = e.drinkId || e.name;
    return id === "water" && (!e.color || e.color === "#4aa3e8") ? "#61c2f9" : (e.color || "#5cb4e6");
  }

  /* Труба данных графика (2588–2643): дни от первой записи (или today-9),
     не больше 1600, сегменты по напиткам, порядок поясной. */
  function bars(state, today) {
    var t = today || todayStr();
    var byDate = {};
    var start = "";
    state.entries.forEach(function (e) {
      var d = J() ? J().entryDay(state, e) : e.date;
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(e);
      if (!start || d < start) start = d;
    });
    if (!start) start = L().addDays(t, -9);
    var days = [];
    for (var d = start; d <= t && days.length < 1600; d = L().addDays(d, 1)) days.push(d);
    var drinkOrder = {};
    (state.drinks || []).forEach(function (dr, i) { drinkOrder[dr.id] = i; });
    var cmp = (W.WT2B && W.WT2B.beltCompare)
      ? function (a, b) { return W.WT2B.beltCompare(a.color, a.order, b.color, b.order); }
      : function (a, b) { return a.order - b.order; };
    return days.map(function (date) {
      var list = byDate[date] || [];
      var groups = {};
      list.forEach(function (e) {
        var id = e.drinkId || e.name;
        var color = barColor(e);
        /* Оригинал суммирует объём напитка, поэтому и здесь берём объём:
           иначе дневные суммы не сходятся с ним на морсах и соках. */
        var amount = Number(e.volume) || 0;
        if (!groups[id]) groups[id] = { color: color, raw: 0, order: drinkOrder[id] == null ? 999 : drinkOrder[id] };
        groups[id].raw += amount;
        groups[id].color = color;
      });
      var segs = Object.keys(groups).map(function (k) { return groups[k]; }).sort(cmp);
      var raw = segs.reduce(function (s, g) { return s + g.raw; }, 0);
      return { date: date, segs: segs, raw: raw, goal: goalFor(state, date, t) };
    });
  }

  if (W.WT2R) W.WT2R.register({
    id: "M10", file: "m10-stats-zones.js", layer: 4, optional: false,
    contracts: ["C-004", "C-009", "C-020", "C-024"],
    events: [],
    status: "ported-core (zones pending owner word)"
  });
  W.WT2S = { goalFor: goalFor, dayStats: dayStats, barColor: barColor, bars: bars };
})(window);
