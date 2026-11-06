/* M01 core-state — состояние, дефолты, миграции, save.
   Контракты: C-001 (начало суток 02:00 — дефолт dayStart), C-002 (keep-правило
   литра живёт в данных, миграции его не трогают), C-020 (схема и ключи),
   C-021 (процесс). Перенос с донора v158 (app.js loadState/save) как спеки:
   миграции байт-в-байт по смыслу, ничего не выдумано.
   Связи: вниз — M02 (ключи); вверх — крюки onSaved для M13/M14 (облако, алерты).
   Отложено в другие модули: sLayout (M15), tombstone-операции журнала (M03). */
(function (W) {
  "use strict";
  var K = W.WT2K;

  /* Дефолты донора (logic.js initialState): BUILTIN байт-в-байт, включая
     7 дней напоминаний. Кофейные вариации ушли 23.10: один «Кофе». */
  var BUILTIN = [
    { id: "water", name: "Вода", hydration: 100, icon: "drop", color: "#4aa3e8" },
    { id: "black-tea", name: "Черный чай", hydration: 100, icon: "cup", color: "#f0a04b" },
    { id: "green-tea", name: "Зеленый чай", hydration: 100, icon: "cup", color: "#67b86a" },
    { id: "coffee", name: "Кофе", hydration: 99, icon: "takeaway", color: "#6d4c41" },
    { id: "juice", name: "Сок", hydration: 89, icon: "juice", color: "#f5c542" },
    { id: "mors", name: "Морс/компот", hydration: 99, icon: "glass", color: "#e36b8a" },
    { id: "mineral", name: "Минеральная вода", hydration: 100, icon: "water_bottle", color: "#5ec8c5" },
    { id: "milk", name: "Цельное молоко", hydration: 88, icon: "milk", color: "#6ec4d4" }
  ];
  function builtinDrinks() {
    return BUILTIN.map(function (d) { return Object.assign({}, d); });
  }
  function initialState() {
    return {
      goalMl: 1950, gender: "male", weightKg: 59.1, animation: false, theme: "system",
      dayStart: "02:00", systemDrums: false, devMode: false, systemCalendar: false,
      systemClock: false, warnExceed: true, weatherSave: true, weatherDefault: "everyday",
      weatherToday: "everyday", activity: "none",
      notifications: {
        enabled: true, from: "06:00", to: "22:00", everyMin: 120, whenGoalMet: false,
        evenIfRecent: true, afterWakeMin: 60, beforeSleepMin: 60,
        days: [
          { wake: "05:00", sleep: "23:00" }, { wake: "05:00", sleep: "23:00" },
          { wake: "05:00", sleep: "23:00" }, { wake: "05:00", sleep: "23:00" },
          { wake: "05:00", sleep: "23:00" }, { wake: "07:00", sleep: "23:00" },
          { wake: "08:00", sleep: "23:00" }
        ]
      },
      drinks: builtinDrinks(), entries: [], weights: [],
      profile: { drinkId: "water", volume: 200 }
    };
  }

  /* v-память донора: переименования встроенных иконок. */
  var BUILTIN_ICON = {
    cappuccino: ["mug", "takeaway"], latte: ["mug", "takeaway"],
    cola: ["can", "soda"], "diet-cola": ["can", "soda"],
    sport: ["sport", "shaker"], lemonade: ["lemonade", "lemon_juice"],
    mineral: ["bottle", "water_bottle"], headache: ["pill", "energy_drink"]
  };
  function patchBuiltinIcons(data) {
    var changed = false;
    (data.drinks || []).forEach(function (d) {
      var fix = BUILTIN_ICON[d.id];
      if (fix && d.icon === fix[0]) { d.icon = fix[1]; changed = true; }
    });
    (data.entries || []).forEach(function (e) {
      var fix = BUILTIN_ICON[e.drinkId];
      if (fix && e.icon === fix[0]) { e.icon = fix[1]; changed = true; }
    });
    return changed;
  }
  /* Отравленные могилы весов: дубли ts без пары в entries удаляются. */
  function purgePoisonedWeightTombs(tombs) {
    if (!tombs || typeof tombs !== "object") return 0;
    var w = tombs.w, e = tombs.e || {};
    if (!w || typeof w !== "object") return 0;
    var byTs = {};
    Object.keys(w).forEach(function (k) {
      var t = Number(w[k]) || 0;
      if (!t) return;
      (byTs[t] = byTs[t] || []).push(k);
    });
    var eTs = Object.keys(e).map(function (k) { return Number(e[k]) || 0; }).filter(Boolean);
    var removed = 0;
    Object.keys(byTs).forEach(function (ts) {
      if (byTs[ts].length < 2) return;
      var t = Number(ts);
      for (var i = 0; i < eTs.length; i++) if (Math.abs(eTs[i] - t) <= 5000) return;
      byTs[ts].forEach(function (k) { delete w[k]; removed++; });
    });
    return removed;
  }
  /* Могилы старше 180 дней и сверх 2000 штук — долой (донор 5068). */
  function pruneTombstones(state) {
    var limit = Date.now() - 180 * 24 * 3600 * 1000;
    ["e", "w"].forEach(function (kind) {
      var map = state.tombstones && state.tombstones[kind];
      if (!map) return;
      Object.keys(map).forEach(function (k) { if (Number(map[k]) < limit) delete map[k]; });
      var keys = Object.keys(map);
      if (keys.length > 2000) {
        keys.sort(function (x, y) { return Number(map[x]) - Number(map[y]); });
        keys.slice(0, keys.length - 2000).forEach(function (k) { delete map[k]; });
      }
    });
  }

  /* Загрузка с миграциями донора (app.js loadState, v125–v158). */
  function load() {
    var base = initialState();
    /* M25 (донор v125, app.js 539-542): раскладка настроек sLayout.
       Миграция с v124 живёт в модели: коллапс «Волна» становится подпапкой,
       вибро-строка и дверь «Уведомления» встают в «Основные». */
    if (W.SettingsModel) {
      base.sLayout = W.SettingsModel.migrateLayout(null);
    }
    try {
      var raw = K.get(K.KEY);
      if (!raw) return base;
      var data = JSON.parse(raw);
      if (!data || !Array.isArray(data.drinks) || !Array.isArray(data.entries)) return base;
      data.notifications = Object.assign(base.notifications, data.notifications || {});
      if (!data.profile) data.profile = base.profile;
      if (!data.weights) data.weights = [];
      if (patchBuiltinIcons(data)) data._iconsPatched = true;
      if (!data.dayStart) data.dayStart = base.dayStart || "02:00";
      if (!Array.isArray(data.dayStartHistory) || !data.dayStartHistory.length) {
        data.dayStartHistory = [{ from: "", value: data.dayStart }];
      }
      if (!Array.isArray(data.customShortcuts)) data.customShortcuts = [];
      if (!data.tombstones || typeof data.tombstones !== "object") data.tombstones = { e: {}, w: {} };
      if (purgePoisonedWeightTombs(data.tombstones)) data._wTombPurged = (Number(data._wTombPurged) || 0) + 1;
      if (data.rowCustom == null) data.rowCustom = false;
      if (!data.paint || typeof data.paint !== "object") data.paint = {};
      if (data.systemDrums == null) data.systemDrums = false;
      if (data.devMode == null) data.devMode = false;
      if (data.systemCalendar == null) data.systemCalendar = false;
      if (data.onboarded == null) data.onboarded = 1;
      if (data.systemClock == null) data.systemClock = false;
      if (data.svgEditor == null) data.svgEditor = false;
      if (data.theme !== "light" && data.theme !== "dark" && data.theme !== "system") data.theme = "system";
      if (!data._animOff) { data.animation = false; data._animOff = true; }
      if (!data.svgLayout || typeof data.svgLayout !== "object" || Array.isArray(data.svgLayout)) data.svgLayout = {};
      if (data._navRow !== 3) {
        Object.keys(data.svgLayout).forEach(function (k) {
          if (k.indexOf("/nav/") >= 0) delete data.svgLayout[k];
        });
        data._navRow = 3;
        data._navRowJust = true;
      }
      Object.keys(data.svgLayout).forEach(function (k) {
        var box = data.svgLayout[k];
        if (!box || typeof box !== "object") { delete data.svgLayout[k]; return; }
        box.dx = Math.round(Number(box.dx) || 0);
        box.dy = Math.round(Number(box.dy) || 0);
        box.w = Math.round(Number(box.w) || 0);
        box.h = Math.round(Number(box.h) || 0);
        box.rot = Math.round(Number(box.rot) || 0);
        if (box.rot > 360) box.rot = 360;
        if (box.rot < -360) box.rot = -360;
        box.mx = Number(box.mx) === -1 ? -1 : 1;
        box.my = Number(box.my) === -1 ? -1 : 1;
        if (!box.rot) delete box.rot;
        if (box.mx === 1) delete box.mx;
        if (box.my === 1) delete box.my;
        if (box.file && !/^[A-Za-z0-9_.-]+\.svg$/.test(box.file)) delete box.file;
      });
      if (!data._sunRestored) {
        if (data.weatherDefault === "cold") data.weatherDefault = "everyday";
        if (data.weatherToday === "cold") data.weatherToday = "everyday";
        data._sunRestored = true;
        data._sunJustRestored = true;
      }
      if (W.SettingsModel) {
        data.sLayout = W.SettingsModel.migrateLayout(data.sLayout,
          W.SettingsModel.fullCatalog({ flags: {}, labels: {} }));
      }
      return data;
    } catch (e) {
      return base;
    }
  }

  var state = null;
  var saveT = 0;
  var savedHooks = [];
  function onSaved(fn) { savedHooks.push(fn); }
  function saveNow() {
    saveT = 0;
    var ok = K.set(K.KEY, JSON.stringify(state));
    if (ok) savedHooks.forEach(function (fn) { try { fn(state); } catch (e) {} });
    return ok;
  }
  function save() {           /* дебаунс донора 240 ms */
    clearTimeout(saveT);
    saveT = setTimeout(saveNow, 240);
    return true;
  }
  function flushSave() { if (saveT) { clearTimeout(saveT); saveNow(); } }
  W.addEventListener("pagehide", flushSave);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") flushSave();
  });

  W.WT2C = {
    initialState: initialState, load: load, pruneTombstones: pruneTombstones,
    get state() { return state; },
    boot: function () { state = load(); return state; },
    save: save, flushSave: saveNow, onSaved: onSaved
  };
})(window);
