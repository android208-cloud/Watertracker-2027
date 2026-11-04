/* M14 cloud-sync — пак watercat-24 v2 (с блоком настроек), слияние с облаком,
   тишина обмена. Контракты: C-015 (тишина облака: без лишних тостов и вертушек —
   автообмен молчит, когда ничего нового), C-014 (принятая история гасит
   онбординг), C-002 (удалённое не возвращается: могилы решают до строк),
   C-020 (схема пака), C-024 (дубли законны: merge сверяет по содержимому,
   вторых копий не появляется).
   Перенос с донора v158 как спеки: app.js 893–913 (cloudSign/cloudPackSign/
   tombSig), 916–934 (cloudClear-пак), 1042 (applySettingsBlock в импорте),
   1060–1075 (решение needUpload + cloudSay), 5957–5976 (applySettingsBlock),
   5977–6032 (historyExportPack v2), 9936–10076 (applyHistoryPack: могилы
   раньше строк, merge по содержимому, профиль/настройки/ид), 5083–5089
   (packEntryId/packWeightId).
   Конструктор: транспорт (WaterGoogle) и state не живут здесь — модуль чист:
   пак строится из переданного state, применение мутирует переданный state,
   настройки применяются колбэком env.applySettings, lc — колбэками
   env.lcStore/env.importLc (M06/M08 приедут — подключатся). Решение «слать ли»
   и слова итога возвращаются значениями — тостит вызывающий (M17/M18).
   Связи: вниз — M01, M03 (могилы/ключи/purge), M16 (onboarded), M19;
   вверх — M17 shell-мосты, M18 отладчик (trace обмена). */
(function (W) {
  "use strict";
  var J = function () { return W.WT2J; };
  var L = function () { return W.WT2L; };

  /* Отпечатки донора (893–913): содержимое без времени выгрузки. */
  function cloudSign(text) {
    var h = 0;
    for (var i = 0; i < text.length; i += 7) h = (h * 31 + text.charCodeAt(i)) >>> 0;
    return text.length + ":" + h;
  }
  function cloudPackSign(pack) {
    return cloudSign(JSON.stringify({
      e: pack.entries || [], w: pack.weights || [], g: pack.dayGoals || {}
    }));
  }
  function tombSig(t) {
    var o = t || {};
    function part(m) {
      return Object.keys(m || {}).sort().map(function (k) { return k + ":" + (Number(m[k]) || 0); }).join(",");
    }
    return part(o.e) + "|" + part(o.w);
  }
  function packEntryId(e, index) {
    return "f-" + [e.date, e.time, e.drinkId || e.name || "", Number(e.volume) || 0, index].join("|");
  }
  function packWeightId(w, index) {
    return "fw-" + [w.date, Number(w.kg) || 0, index].join("|");
  }

  /* Пак донора (5977–6032): v2 несёт настройки; сортировки и счётчики — байт в
     байт. env = { lcStore?, nowIso? }. */
  function exportPack(state, env) {
    env = env || {};
    var entries = (state.entries || []).slice().sort(function (x, y) {
      return (x.date + x.time).localeCompare(y.date + y.time) || (x.createdAt || 0) - (y.createdAt || 0);
    });
    var weights = (state.weights || []).slice().sort(function (x, y) { return String(x.date).localeCompare(String(y.date)); });
    var first = entries.length ? entries[0].date : "";
    var last = entries.length ? entries[entries.length - 1].date : "";
    return {
      source: "watercat-24",
      version: 2,
      exportedAt: env.nowIso || new Date().toISOString(),
      settings: {
        theme: state.theme || "system",
        cupLabel: state.cupLabel === "countdown" ? "countdown" : "left",
        rowCustom: !!state.rowCustom,
        habitAuto: state.habitAuto ? 1 : 0,
        paceGoals: state.paceGoals && typeof state.paceGoals === "object" ? state.paceGoals : {},
        notifications: state.notifications || null,
        lc: env.lcStore ? env.lcStore() : null
      },
      profile: {
        gender: state.gender === "female" ? "female" : "male",
        weightKg: Number(state.weightKg) || 0,
        consumptionRate: Number(state.customGoalMl) || 0,
        useRecommended: state.useRecommended !== false,
        volume: Number(state.profile && state.profile.volume) || 0,
        drinkId: (state.profile && state.profile.drinkId) || "water",
        units: state.units === "imperial" ? "imperial" : "metric",
        weatherSave: state.weatherSave !== false,
        weatherDefault: state.weatherDefault || "everyday",
        activity: state.activity || "none",
        activitySave: !!state.activitySave,
        dayStart: state.dayStart,
        dayStartHistory: state.dayStartHistory || []
      },
      counts: {
        entries: entries.length,
        days: (function () { var set = {}; entries.forEach(function (e) { set[e.date] = 1; }); return Object.keys(set).length; })(),
        drinks: (state.drinks || []).length,
        goals: Object.keys(state.dayGoals || {}).length,
        weights: weights.length,
        creditedMl: entries.reduce(function (s, e) { return s + (Number(e.credited) || 0); }, 0),
        from: first,
        to: last
      },
      drinks: state.drinks || [],
      entries: entries,
      weights: weights,
      dayGoals: state.dayGoals || {},
      tombstones: {
        e: Object.assign({}, (state.tombstones && state.tombstones.e) || {}),
        w: Object.assign({}, (state.tombstones && state.tombstones.w) || {})
      }
    };
  }

  /* Блок настроек донора (5957–5976): только знакомые значения; дни уведом-
     лений чужие и битые не принимаются; lc — колбэком. */
  function applySettings(state, st, env) {
    if (!st || typeof st !== "object") return false;
    if (st.theme === "light" || st.theme === "dark" || st.theme === "oneplus" || st.theme === "system") state.theme = st.theme;
    if (st.cupLabel === "countdown" || st.cupLabel === "left") state.cupLabel = st.cupLabel;
    state.rowCustom = !!st.rowCustom;
    state.habitAuto = st.habitAuto ? 1 : 0;
    if (st.paceGoals && typeof st.paceGoals === "object") state.paceGoals = Object.assign({}, st.paceGoals);
    if (st.notifications && typeof st.notifications === "object") {
      var base = state.notifications || (state.notifications = {});
      var days = base.days;
      Object.assign(base, st.notifications);
      if (!Array.isArray(base.days) || base.days.length !== 7) base.days = days;
    }
    if (st.lc && env && env.importLc) env.importLc(st.lc);
    return true;
  }

  /* Применение пака донора (9936–10076): могилы раньше строк, удалённое не
     возвращается, merge по содержимому без вторых копий, профиль и начало
     суток из файла, C-014 в начале. Возвращает { ok, added, dropped } —
     донорские lastPackAdd/lastPackDropped как значение (конструктор). */
  function applyPack(state, pack, mode, env) {
    env = env || {};
    if (!pack || pack.source !== "watercat-24" || !Array.isArray(pack.entries) || !pack.entries.length) return { ok: false, added: 0, dropped: 0 };
    var mergeAdd = 0, dropped = 0;
    var fromPack = pack.tombstones || {};
    ["e", "w"].forEach(function (kind) {
      if (!state.tombstones) state.tombstones = { e: {}, w: {} };
      var mine = state.tombstones[kind] || (state.tombstones[kind] = {});
      var theirs = fromPack[kind];
      if (!theirs || typeof theirs !== "object") return;
      Object.keys(theirs).forEach(function (k) {
        var t = Number(theirs[k]) || 0;
        if (t > (Number(mine[k]) || 0)) mine[k] = t;
      });
    });
    state.onboarded = 1;          /* C-014 */
    state.historyDismissed = 1;
    J().purgePoisonedWeightTombs(state.tombstones);
    var tombE = state.tombstones.e || {}, tombW = state.tombstones.w || {};
    var tb = J().tombBlocks, ek = J().entryKey, wk = J().weightKey, et = J().entryTouch;
    pack.entries = pack.entries.filter(function (e) {
      if (!tb(tombE, ek(e), et(e))) return true;
      dropped++;
      return false;
    });
    if (Array.isArray(pack.weights)) {
      pack.weights = pack.weights.filter(function (w) { return !tb(tombW, wk(w), et(w)); });
    }
    state.entries = (state.entries || []).filter(function (e) { return !tb(tombE, ek(e), et(e)); });
    state.weights = (state.weights || []).filter(function (w) { return !tb(tombW, wk(w), et(w)); });
    if (mode === "merge") {
      var pools = {};
      var merged = state.entries.slice();
      state.entries.forEach(function (e) {
        var k = ek(e);
        (pools[k] = pools[k] || []).push(e);
      });
      pack.entries.forEach(function (e, i) {
        var k = ek(e);
        var pool = pools[k];
        if (pool && pool.length) {
          var old = pool.shift();
          if (!e.id) e.id = old.id || packEntryId(e, i);
          var at = merged.indexOf(old);
          if (at >= 0) merged[at] = e; else merged.push(e);
          return;
        }
        if (!e.id) e.id = packEntryId(e, i);
        merged.push(e);
        mergeAdd++;
      });
      merged.sort(function (a, b) {
        return String(a.date + a.time).localeCompare(String(b.date + b.time)) || (a.createdAt || 0) - (b.createdAt || 0);
      });
      pack.entries = merged;
      if (Array.isArray(pack.weights)) {
        var wpools = {};
        var wMerged = state.weights.slice();
        state.weights.forEach(function (w) {
          var k = wk(w);
          (wpools[k] = wpools[k] || []).push(w);
        });
        pack.weights.forEach(function (w, i) {
          var k = wk(w);
          var pool = wpools[k];
          if (pool && pool.length) {
            var old = pool.shift();
            if (!w.id) w.id = old.id || packWeightId(w, i);
            var at = wMerged.indexOf(old);
            if (at >= 0) wMerged[at] = w; else wMerged.push(w);
            return;
          }
          if (!w.id) w.id = packWeightId(w, i);
          wMerged.push(w);
        });
        wMerged.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
        pack.weights = wMerged;
      }
      pack.dayGoals = Object.assign({}, state.dayGoals || {}, pack.dayGoals || {});
    }
    var p = pack.profile || {};
    if (Array.isArray(pack.drinks) && pack.drinks.length) state.drinks = pack.drinks;
    state.entries = pack.entries;
    state.weights = pack.weights || [];
    state.entries.forEach(function (e, i) { if (!e.id) e.id = packEntryId(e, i); });
    state.weights.forEach(function (w, i) { if (!w.id) w.id = packWeightId(w, i); });
    state.dayGoals = pack.dayGoals || {};
    state.gender = p.gender === "female" ? "female" : "male";
    if (p.weightKg) state.weightKg = Number(p.weightKg);
    state.useRecommended = p.useRecommended !== false;
    state.customGoalMl = Number(p.consumptionRate) || state.customGoalMl || 1900;
    if (state.useRecommended !== false) state.goalMl = L().genderBase(state);
    state.units = p.units === "imperial" ? "imperial" : "metric";
    state.weatherSave = p.weatherSave !== false;
    state.weatherDefault = p.weatherDefault || "everyday";
    state.weatherToday = state.weatherDefault;
    state.activity = p.activity || "none";
    state.activitySave = !!p.activitySave;
    state.activityDefault = state.activity;
    state.activityToday = state.activity;
    state.profile = { drinkId: p.drinkId || "water", volume: Number(p.volume) || 250 };
    if (p.dayStart && /^\d{1,2}:\d{2}$/.test(String(p.dayStart))) {
      state.dayStart = p.dayStart;
      if (Array.isArray(p.dayStartHistory) && p.dayStartHistory.length) state.dayStartHistory = p.dayStartHistory;
      else state.dayStartHistory = [{ from: "", value: p.dayStart }];
    }
    if (!state.dayStart) state.dayStart = "02:00";
    state.historySource = pack.source;
    var first = state.entries[0] || { date: "" };
    var last = state.entries[state.entries.length - 1] || { date: "" };
    state.historyCounts = mode === "merge"
      ? { entries: state.entries.length, from: first.date, to: last.date }
      : (pack.counts || { entries: state.entries.length, from: first.date, to: last.date });
    delete state.historyDismissed;
    if (env.ui) { env.ui.historyDate = null; env.ui.chartLeft = null; }
    if (env.withSettings && pack.settings) applySettings(state, pack.settings, env);
    return { ok: true, added: mergeAdd, dropped: dropped };
  }

  /* Решение «слать ли» донора (1060–1066): restore не шлёт; равенство отпечат-
     ков и могил — не шлёт. */
  function shouldUpload(mode, mergedSig, remoteSig, tombMine, tombRemote) {
    return mode !== "restore" &&
      (mergedSig !== remoteSig || tombSig(tombMine) !== tombRemote);
  }

  /* Слова итога донора (1078–1092): автообмен молчит, когда нового нет
     (C-015). Возвращает текст или null — тостит вызывающий. */
  function cloudSay(mode, added, total) {
    if (mode === "sync") {
      return added > 0 ? "Синхронизировано: с Диска добавлено " + added + ", всего " + total
                       : "Синхронизировано: всего " + total + " записей — всё совпадает";
    }
    if (mode === "save") return "Копия сохранена в Google Диск" + (added > 0 ? ", с Диска добавлено " + added : "");
    if (mode === "clear") return "Облачная копия очищена — следующая синхронизация выложит историю этого устройства";
    if (mode === "auto") return added > 0 ? "Из облака добавлено записей: " + added + ", всего " + total : null;
    return added > 0 ? "Из облака добавлено записей: " + added + ", всего " + total
                     : "В облаке ничего нового: " + total + " записей";
  }

  if (W.WT2R) W.WT2R.register({
    id: "M14", file: "m14-cloud-sync.js", layer: 5, optional: false,
    contracts: ["C-002", "C-014", "C-015", "C-020", "C-024"],
    events: [],
    status: "ported"
  });
  W.WT2Y = {
    cloudSign: cloudSign, cloudPackSign: cloudPackSign, tombSig: tombSig,
    packEntryId: packEntryId, packWeightId: packWeightId,
    exportPack: exportPack, applyPack: applyPack, applySettings: applySettings,
    shouldUpload: shouldUpload, cloudSay: cloudSay
  };
})(window);
