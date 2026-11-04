/* M19 calc-core — «физика» приложения: расчёт гидратации, суток, норм,
   котика-настроения, бухгалтерии объёмов и чернил поверх цвета.
   Контракты: C-001 (граница суток), C-003 (стопка/спад через частоту F),
   C-005 (норма/погода/активность/темп), C-006 (предиктор — часть дня),
   C-017 (кот: просыпается за час, грустный к порции), C-024 (кофейное
   семейство в бухгалтерии). Перенос с донора v158 (logic.js, WaterLogic)
   как спеки: формулы и допуски байт-в-байт, комментарии памяти сохранены.
   Связи: вниз — нет (чистые функции); вверх — M03/M10/M12/M13/M05 вызывают;
   события не излучает (чистота), наблюдатель смотрит вызывающих.
   Карточка: optional:false. */
(function (W) {
  "use strict";
  var WEATHER_RATE = { hot: 0.2, warm: 0.1, everyday: 0, cold: 0.05 };
  var ACTIVITY_RATE = { none: 0, everyday: 0.1, training: 0.2, heavy: 0.3 };
  var PRESETS = [100, 200, 250, 300, 350, 400, 500];
  var SHORTCUT_DAYS = 30;
  var SHORTCUT_LIMIT = 5;
  var COLORS = [
    "#4aa3e8", "#e07a3d", "#f0c14b", "#8fd14f", "#67b86a", "#5ec8c5",
    "#3d7edb", "#7e57c2", "#e36b8a", "#e57373", "#8d6b4a", "#d7b899",
    "#c4a484", "#6d4c41", "#90a4ae"
  ];

  function addDays(iso, n) {
    var p = iso.split("-").map(Number);
    var dt = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    dt.setUTCDate(dt.getUTCDate() + n);
    var mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    var dd = String(dt.getUTCDate()).padStart(2, "0");
    return dt.getUTCFullYear() + "-" + mm + "-" + dd;
  }
  function minutesOf(hm) {
    var p = String(hm || "0:0").split(":");
    var h = Number(p[0]);
    var m = Number(p[1]);
    if (!(h >= 0 && h <= 23)) h = 0;
    if (!(m >= 0 && m <= 59)) m = 0;
    return h * 60 + m;
  }
  /* Порция до начала водных суток принадлежит предыдущему дню (C-001). */
  function waterDay(date, time, dayStart) {
    if (!date) return date;
    if (minutesOf(time) < minutesOf(dayStart || "00:00")) return addDays(date, -1);
    return date;
  }
  function creditedMl(volume, hydration) {
    return Math.round(Number(volume) * Number(hydration) / 100);
  }
  function weatherBonus(goalMl, level) {
    return Math.round(Number(goalMl) * (WEATHER_RATE[level] || 0));
  }
  function activityBonus(base, level) {
    return Math.round(Number(base) * (ACTIVITY_RATE[level] || 0));
  }
  function genderBase(state) {
    var kg = Number(state && state.weightKg);
    if (!(kg > 0)) kg = 59.1;
    var factor = state && state.gender === "female" ? 1 : 1.1;
    return Math.round(kg * 30 * factor);
  }
  function levelOn(state, date, today) {
    if (state.weatherSave) return state.weatherDefault || "everyday";
    if (date === today) return state.weatherToday || "everyday";
    return "everyday";
  }
  function activityOn(state, date, today) {
    if (!state) return "none";
    if (state.activitySave) return state.activityDefault || state.activity || "none";
    if (date === today) {
      if (state.activityToday) return state.activityToday;
      return state.activity || "none";
    }
    return "none";
  }
  function recommendedOn(state, date, today) {
    var base = genderBase(state);
    return base + weatherBonus(base, levelOn(state, date, today)) + activityBonus(base, activityOn(state, date, today));
  }
  function goalOn(state, date, today) {
    if (state && state.useRecommended === false) {
      var custom = Number(state.goalMl) || 0;
      return custom + weatherBonus(custom, levelOn(state, date, today)) + activityBonus(custom, activityOn(state, date, today));
    }
    return recommendedOn(state, date, today);
  }
  function setWeather(state, level) {
    if (state.weatherSave) state.weatherDefault = level;
    else state.weatherToday = level;
    return state;
  }
  function setActivity(state, level) {
    state.activity = level || "none";
    if (state.activitySave) state.activityDefault = state.activity;
    else state.activityToday = state.activity;
    return state;
  }
  function setActivitySave(state, on) {
    var current = state.activitySave
      ? (state.activityDefault || state.activity || "none")
      : (state.activityToday || state.activity || "none");
    state.activitySave = !!on;
    state.activity = current;
    if (on) state.activityDefault = current;
    else state.activityToday = current;
    return state;
  }
  function setWeatherSave(state, on) {
    var current = state.weatherSave
      ? (state.weatherDefault || "everyday")
      : (state.weatherToday || "everyday");
    state.weatherSave = !!on;
    if (on) state.weatherDefault = current;
    else state.weatherToday = current;
    return state;
  }
  function recentVolumes(entries, today, current, limit) {
    var cap = limit || 8;
    var from = today ? addDays(today, -(SHORTCUT_DAYS - 1)) : null;
    function collect(onlyRecent) {
      var seen = {};
      var list = [];
      entries.slice().sort(function (a, b) {
        return (b.createdAt || 0) - (a.createdAt || 0);
      }).forEach(function (e) {
        if (onlyRecent && from && (e.date < from || e.date > today)) return;
        var v = Number(e.volume);
        if (!(v > 0) || seen[v]) return;
        seen[v] = true;
        list.push(v);
      });
      return list;
    }
    var list = collect(true);
    if (!list.length) list = collect(false);
    var cur = Number(current);
    if (cur > 0 && list.indexOf(cur) < 0) list.unshift(cur);
    if (!list.length) list = PRESETS.slice();
    return list.slice(0, cap).sort(function (a, b) { return a - b; });
  }
  function shortcutsOf(entries, drinks, today, days) {
    var windowDays = days || SHORTCUT_DAYS;
    var from = addDays(today, -(windowDays - 1));
    var ids = {};
    drinks.forEach(function (d) { ids[d.id] = true; });
    var map = {};
    entries.forEach(function (e) {
      if (e.date < from || e.date > today) return;
      if (!ids[e.drinkId]) return;
      var key = e.drinkId + "|" + e.volume;
      if (!map[key]) map[key] = { drinkId: e.drinkId, volume: e.volume, count: 0, last: 0 };
      map[key].count += 1;
      if ((e.createdAt || 0) > map[key].last) map[key].last = e.createdAt || 0;
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return b.count - a.count || b.last - a.last; })
      .slice(0, SHORTCUT_LIMIT);
  }

  /* ============ Модель поведения котика (C-017, донор: память комментариев) ============
     1 плохо, 2 грустный, 3 ждёт, 4 довольный, 5 радостный, 6 триумф, 7 перепоили.
     Спад: 1 уровень за F (частота напоминаний); шаг поведения = норма / 20,
     округлённый до 10 мл; темп (5) с gate шагов; триумф (6) от нормы до конца
     суток; 7 — с 2×N до конца суток или острый перелив ≥1 л/час на 2 часа. */
  var MOOD = {
    stepDiv: 20, stepRound: 10, startMood: 3, neglectMin: 10,
    paceActiveShare: 0.8, paceGateSteps: 3, softCap: 1.5, hardCap: 2,
    acuteMl: 1000, acuteWindowMin: 60, acuteHours: 2
  };
  function freqMin(state) {
    var n = state.notifications || {};
    var f = Number(n.everyMin);
    return f > 0 ? f : 120;
  }
  function moodStep(goal) {
    var s = Math.round(Number(goal) / MOOD.stepDiv / MOOD.stepRound) * MOOD.stepRound;
    return Math.max(MOOD.stepRound, s || 0);
  }
  function moodWeekday(iso) {
    var p = iso.split("-").map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
    return d === 0 ? 6 : d - 1;
  }
  function moodSchedule(state, iso) {
    var sc = { dayStart: state.dayStart || "02:00", wake: "08:00", sleep: "23:00" };
    var n = state.notifications;
    var day = n && n.days && n.days[moodWeekday(iso)];
    if (day) { sc.wake = day.wake || sc.wake; sc.sleep = day.sleep || sc.sleep; }
    return sc;
  }
  function moodSegments(state, iso, negStart) {
    var sc = moodSchedule(state, iso);
    var ds = minutesOf(sc.dayStart);
    var rel = function (hm) { return (((minutesOf(hm) - ds) % 1440) + 1440) % 1440 * 60000; };
    var w = rel(sc.wake);
    var sl = rel(sc.sleep);
    var end = 24 * 3600000;
    if (!(w > 0 && w < end)) w = 8 * 3600000;
    if (!(sl > w && sl < end)) sl = 23 * 3600000;
    var rate = 60 / freqMin(state);
    var eve;
    if (isFinite(negStart) && negStart < end) {
      eve = negStart > sl ? [{ to: negStart, rate: 0 }, { to: end, rate: rate }]
                          : [{ to: end, rate: rate }];
    } else {
      eve = [{ to: end, rate: 0 }];
    }
    return [{ to: w, rate: 0 }, { to: sl, rate: rate }].concat(eve);
  }
  function moodDecay(state, iso, m, t0, t1, negStart) {
    if (t1 <= t0 || m <= 1) return Math.max(1, m);
    var segs = moodSegments(state, iso, negStart);
    for (var i = 0; i < segs.length && t0 < t1; i++) {
      var a = i === 0 ? 0 : segs[i - 1].to;
      if (t1 <= a) continue;
      var from = Math.max(t0, a);
      var to = Math.min(t1, segs[i].to);
      if (to <= from) continue;
      m -= segs[i].rate * (to - from) / 3600000;
      if (m <= 1) return 1;
      t0 = to;
    }
    return Math.max(1, m);
  }
  function paceE(state, iso, t, goal) {
    var segs = moodSegments(state, iso);
    var w = segs[0].to, sl = segs[1].to, end = segs[2].to;
    var sh = MOOD.paceActiveShare;
    if (t <= w) return 0;
    if (t <= sl) return sh * goal * (t - w) / (sl - w);
    if (t >= end) return goal;
    return sh * goal + (1 - sh) * goal * (t - sl) / (end - sl);
  }
  function paceCross(state, iso, H, goal) {
    if (H <= 0) return 0;
    if (H >= goal) return Infinity;
    var segs = moodSegments(state, iso);
    var w = segs[0].to, sl = segs[1].to, end = segs[2].to;
    var mid = MOOD.paceActiveShare * goal;
    if (H <= mid) return w + (H / mid) * (sl - w);
    return sl + ((H - mid) / (goal - mid)) * (end - sl);
  }
  function moodEntries(state, iso) {
    var ds = state.dayStart || "02:00";
    var out = [];
    (state.entries || []).forEach(function (e) {
      if (waterDay(e.date, e.time, ds) !== iso) return;
      out.push({
        t: (((minutesOf(e.time || "00:00") - minutesOf(ds)) % 1440) + 1440) % 1440 * 60000,
        ml: creditedMl(e.volume, e.hydration == null ? 100 : e.hydration)
      });
    });
    out.sort(function (x, y) { return x.t - y.t; });
    return out;
  }
  function catMood(state, iso, nowMs) {
    var goal = goalOn(state, iso, iso);
    var step = moodStep(goal);
    var gate = step * MOOD.paceGateSteps;
    var p = iso.split("-").map(Number);
    var sc = moodSchedule(state, iso);
    var dayStartMs = Date.UTC(p[0], p[1] - 1, p[2]) + minutesOf(sc.dayStart) * 60000;
    var nowT = Math.max(0, nowMs - dayStartMs);
    var list = moodEntries(state, iso);
    var H = 0, m = MOOD.startMood, anchorT = 0;
    var paceOn = false, paceEnd = 0, lock6 = false, acuteUntil = -1, hard = false, lastT = -1;
    function negFrom(t) {
      return t >= 0 ? t + (freqMin(state) + MOOD.neglectMin) * 60000 : Infinity;
    }
    function advance(toT) {
      if (lock6) { anchorT = toT; return; }
      if (paceOn) {
        if (toT <= paceEnd) { m = 5; anchorT = toT; return; }
        m = 5;
        anchorT = paceEnd;
        paceOn = false;
      }
      m = moodDecay(state, iso, m, anchorT, toT, negFrom(lastT));
      anchorT = toT;
    }
    for (var i = 0; i < list.length; i++) {
      var te = Math.max(0, list[i].t);
      if (te > nowT) break;
      advance(te);
      H += list[i].ml;
      lastT = te;
      var win = 0;
      for (var k = i; k >= 0 && te - list[k].t <= MOOD.acuteWindowMin * 60000; k--) win += list[k].ml;
      if (win >= MOOD.acuteMl) acuteUntil = te + MOOD.acuteHours * 3600000;
      if (H >= MOOD.hardCap * goal) hard = true;
      if (H >= goal) { lock6 = true; paceOn = false; m = 6; anchorT = te; continue; }
      var mv = Math.min(4, 1 + Math.floor(H / step));
      if (mv > m) m = mv;
      if (H >= gate) {
        var pc = paceCross(state, iso, H, goal);
        if (pc > te) { paceOn = true; paceEnd = pc; m = 5; anchorT = te; }
        else paceOn = false;
      } else paceOn = false;
    }
    advance(nowT);
    if (lastT >= 0 && !lock6 && m > 3 &&
        nowT - lastT > (freqMin(state) + MOOD.neglectMin) * 60000) m = 3;
    var allow7 = state.warnExceed !== false;
    var res = {
      mood: 0, h: H, goal: goal, step: step, gate: gate,
      soft: H >= MOOD.softCap * goal && H < MOOD.hardCap * goal,
      e: Math.round(paceE(state, iso, nowT, goal)),
      acute: allow7 && acuteUntil > nowT
    };
    if (allow7 && hard) res.mood = 7;
    else if (allow7 && acuteUntil > nowT) res.mood = 7;
    else if (H >= goal) res.mood = 6;
    else res.mood = Math.max(1, Math.min(5, Math.round(m)));
    return res;
  }

  /* Кофейное семейство (C-024): синонимы сливаются в учёте, не в выборе. */
  var COFFEE_SYNONYMS = ["кофе", "эспрессо", "американо", "капучино", "латте",
    "макиато", "маккиато", "раф", "флэт уайт", "растворимый кофе"];
  function normName(s) {
    return String(s == null ? "" : s).toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
  }
  function coffeeName(name) {
    return COFFEE_SYNONYMS.indexOf(normName(name)) >= 0;
  }
  function ledgerRows(entries, drinks) {
    drinks = drinks || [];
    function keyOf(d) { return coffeeName(d.name) ? "coffee" : d.id; }
    var byId = {};
    drinks.forEach(function (d) { byId[d.id] = d; });
    var face = {};
    drinks.forEach(function (d) {
      var k = keyOf(d);
      if (!face[k] || (k === "coffee" && normName(d.name) === "кофе" && normName(face[k].name) !== "кофе")) face[k] = d;
    });
    if (!face.coffee) {
      var hasCoffeeEntry = (entries || []).some(function (e) {
        return coffeeName(e.name) || (e.drinkId && byId[e.drinkId] && coffeeName(byId[e.drinkId].name));
      });
      if (hasCoffeeEntry) face.coffee = { id: "coffee", name: "Кофе", icon: "takeaway", color: "#6d4c41" };
    }
    var vol = {};
    Object.keys(face).forEach(function (k) { vol[k] = 0; });
    (entries || []).forEach(function (e) {
      var d = e.drinkId ? byId[e.drinkId] : null;
      if (!d) {
        var nn = normName(e.name);
        for (var i = 0; i < drinks.length; i++) {
          if (normName(drinks[i].name) === nn) { d = drinks[i]; break; }
        }
        if (!d && coffeeName(e.name)) d = face.coffee;
      }
      if (!d) return;
      var k = keyOf(d);
      if (vol[k] == null) vol[k] = 0;
      vol[k] += Number(e.volume) || 0;
    });
    var rows = Object.keys(vol).map(function (k) {
      var f = face[k];
      return { key: k, id: f.id, name: f.name, icon: f.icon, color: f.color, volume: vol[k] };
    }).filter(function (r) { return r.volume > 0; });
    rows.sort(function (a, b) { return b.volume - a.volume; });
    return rows;
  }

  /* Чернила поверх цвета (WCAG-яркость, граница L=0.45 — память донора v97). */
  function inkOn(color) {
    if (typeof color !== "string") return null;
    var m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(color.trim());
    if (!m) return null;
    var hex = m[1];
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    function lin(v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    var lum = 0.2126 * lin(parseInt(hex.slice(0, 2), 16) / 255) +
              0.7152 * lin(parseInt(hex.slice(2, 4), 16) / 255) +
              0.0722 * lin(parseInt(hex.slice(4, 6), 16) / 255);
    return lum < 0.45
      ? { fg: "#ffffff", fgDim: "rgba(255,255,255,.72)" }
      : { fg: "#202225", fgDim: "rgba(32,34,37,.66)" };
  }

  if (W.WT2R) W.WT2R.register({
    id: "M19", file: "m19-calc-core.js", layer: 1, optional: false,
    contracts: ["C-001", "C-003", "C-005", "C-006", "C-017", "C-024"],
    events: [], status: "ported"
  });
  W.WT2L = {
    WEATHER_RATE: WEATHER_RATE, ACTIVITY_RATE: ACTIVITY_RATE, PRESETS: PRESETS,
    COLORS: COLORS, SHORTCUT_DAYS: SHORTCUT_DAYS, SHORTCUT_LIMIT: SHORTCUT_LIMIT,
    MOOD: MOOD, COFFEE_SYNONYMS: COFFEE_SYNONYMS,
    addDays: addDays, minutesOf: minutesOf, waterDay: waterDay, creditedMl: creditedMl,
    weatherBonus: weatherBonus, activityBonus: activityBonus, genderBase: genderBase,
    levelOn: levelOn, activityOn: activityOn, recommendedOn: recommendedOn, goalOn: goalOn,
    setWeather: setWeather, setActivity: setActivity, setActivitySave: setActivitySave,
    setWeatherSave: setWeatherSave, recentVolumes: recentVolumes, shortcutsOf: shortcutsOf,
    moodStep: moodStep, moodSchedule: moodSchedule, catMood: catMood,
    normName: normName, coffeeName: coffeeName, ledgerRows: ledgerRows, inkOn: inkOn
  };
})(window);
