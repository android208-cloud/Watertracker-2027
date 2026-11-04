/* M03 journal — журнал порций и весов: CRUD, дубли, могилы, слияние.
   Контракты: C-001 (водные сутки и ночной порядок), C-020 (схема записи),
   C-024 (дубли законны), C-002 (keep-правило литра — формулировка ждёт
   подтверждения владельца, механика донора перенесена как есть).
   Перенос с донора v158 (app.js 270–339, 1365–1379, 4994–5046, 8063–8066,
   9962–9973) как спеки. Связи: вниз — M01 (state), M19 (creditedMl, waterDay);
   вверх — M10/M11/M14 читают dayEntries и mergeGuard. Карточка: optional:false.
   Память: «Удалённое не возвращается» — копия с Диска приносит и удалённое на
   другом телефоне; каждое удаление помнится меткой времени; запись с той же
   подписью (дата|время|напиток|объём), созданная ДО удаления, обратно не
   принимается; заново добавили — прежнее удаление не в счёт (markAlive). */
(function (W) {
  "use strict";
  var L = W.WT2L;

  /* v83: отравленные метки веса — несколько ключей с одной меткой времени,
     не поддержанной меткой порции в пределах 5 с (инцидент 25.10). */
  function purgePoisonedWeightTombs(tombs) {
    if (!tombs || typeof tombs !== "object") return 0;
    var w = tombs.w;
    var e = tombs.e || {};
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

  /* Смена начала суток с историей (донор 343–355, C-001): значение дня
     фиксируется в dayStartHistory, повторная смена того же дня заменяет
     запись, мусор по from выметается. */
  function todayStrLocal() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function setDayStart(state, value, today) {
    if (!/^\d{1,2}:\d{2}$/.test(String(value || ""))) return false;
    var t = today || todayStrLocal();
    var before = dayStartOn(state, t);
    var hist = Array.isArray(state.dayStartHistory) ? state.dayStartHistory.slice() : [];
    if (!hist.length && before) hist.push({ from: "", value: before });
    if (before !== value) {
      state.dayStartHistory = hist.filter(function (h) { return h && h.from !== t; });
      state.dayStartHistory.push({ from: t, value: value });
      state.dayStartHistory.sort(function (a, b) { return String(a.from || "").localeCompare(String(b.from || "")); });
    }
    state.dayStart = value;
    if (W.WT2R) W.WT2R.emit("journal:daystart", { value: value, from: t });
    return true;
  }

  function uid() {
    return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  }
  /* Начало суток, действовавшее на дату: история смен (C-001). */
  function dayStartOn(state, date) {
    var current = state.dayStart || "02:00";
    var hist = state.dayStartHistory;
    if (!date || !Array.isArray(hist) || !hist.length) return current;
    var value = null;
    for (var i = 0; i < hist.length; i++) {
      var h = hist[i];
      if (!h || !/^\d{1,2}:\d{2}$/.test(String(h.value || ""))) continue;
      if (!h.from || String(h.from) <= String(date)) value = h.value;
    }
    return value || current;
  }
  function entryDay(state, e) {
    return L.waterDay(e.date, e.time, dayStartOn(state, e.date));
  }
  /* Ночные часы 00:00—01:59 — конец водного дня: порядок внутри дня считаем
     минутами от начала суток (донор 1369–1371). */
  function dayMinOf(state, time) {
    var t = String(time || "0:0").split(":");
    var d = String(state.dayStart || "02:00").split(":");
    return (((+t[0] || 0) * 60 + (+t[1] || 0)) - ((+d[0] || 0) * 60 + (+d[1] || 0)) + 2880) % 1440;
  }
  function dayEntries(state, date) {
    return state.entries.filter(function (e) { return entryDay(state, e) === date; })
      .sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return (dayMinOf(state, a.time) - dayMinOf(state, b.time)) || (a.createdAt || 0) - (b.createdAt || 0);
      });
  }

  /* ---------- Могилы: удалённое не возвращается ---------- */
  function entryKey(e) {
    return [e.date, e.time, e.drinkId || e.name || "", Number(e.volume) || 0].join("|");
  }
  function weightKey(w) {
    return [w.date, Math.round((Number(w.kg) || 0) * 10)].join("|");
  }
  function entryTouch(e) { return Number(e && (e.updatedAt || e.createdAt)) || 0; }
  function tombMap(state, kind) {
    if (!state.tombstones || typeof state.tombstones !== "object") state.tombstones = { e: {}, w: {} };
    if (!state.tombstones[kind]) state.tombstones[kind] = {};
    return state.tombstones[kind];
  }
  function markDeleted(state, list, kind) {
    var map = tombMap(state, kind || "e");
    var now = Date.now();
    (list || []).forEach(function (x) {
      if (!x) return;
      map[kind === "w" ? weightKey(x) : entryKey(x)] = now;
    });
    if (W.WT2C) W.WT2C.pruneTombstones(state);
    return now;
  }
  function markAlive(state, x, kind) {
    if (!x) return;
    var map = tombMap(state, kind || "e");
    var k = kind === "w" ? weightKey(x) : entryKey(x);
    if (map[k]) delete map[k];
  }
  function tombBlocks(map, key, touch) {
    var t = map && map[key];
    return !!(t && touch <= t);
  }
  /* Фильтр слияния чужой копии (донор 9962–9973): блокируются только записи,
     созданные ДО удаления; свежие дубли проходят (C-024). */
  function mergeGuard(state, entries, weights) {
    var tE = tombMap(state, "e"), tW = tombMap(state, "w");
    return {
      entries: (entries || []).filter(function (e) { return !tombBlocks(tE, entryKey(e), entryTouch(e)); }),
      weights: (weights || []).filter(function (w) { return !tombBlocks(tW, weightKey(w), entryTouch(w)); })
    };
  }

  /* ---------- CRUD ---------- */
  function addEntry(state, f, now) {
    var drink = f.drink || {};
    var e = {
      id: f.id || uid(),
      date: f.date, time: f.time,
      drinkId: drink.id, name: drink.name, icon: drink.icon, color: drink.color,
      hydration: drink.hydration,
      volume: Number(f.volume) || 0,
      credited: L.creditedMl(f.volume, drink.hydration),
      createdAt: now || Date.now()
    };
    markAlive(state, e, "e");           /* заново добавили — прежнее удаление не в счёт */
    state.entries.push(e);
    if (W.WT2R) W.WT2R.emit("journal:add", { id: e.id, date: e.date, volume: e.volume });
    return e;
  }
  function editEntry(state, id, patch, now) {
    var e = null;
    for (var i = 0; i < state.entries.length; i++) if (state.entries[i].id === id) { e = state.entries[i]; break; }
    if (!e) return null;
    Object.keys(patch || {}).forEach(function (k) { if (k !== "id" && k !== "createdAt") e[k] = patch[k]; });
    if (patch && (patch.volume != null || patch.hydration != null)) {
      e.credited = L.creditedMl(e.volume, e.hydration);
    }
    e.updatedAt = now || Date.now();    /* при встрече версий побеждает свежайшая */
    if (W.WT2R) W.WT2R.emit("journal:edit", { id: e.id });
    return e;
  }
  function deleteEntries(state, list) {
    var ids = {};
    (list || []).forEach(function (e) { ids[e.id] = true; });
    state.entries = state.entries.filter(function (e) { return !ids[e.id]; });
    var ts = markDeleted(state, list, "e");
    if (W.WT2R) W.WT2R.emit("journal:delete", { n: (list || []).length, ts: ts });
    return ts;
  }
  function addWeight(state, f, now) {
    var w = { date: f.date, kg: Number(f.kg) || 0, createdAt: now || Date.now() };
    markAlive(state, w, "w");
    state.weights.push(w);
    return w;
  }
  function deleteWeights(state, list) {
    var ks = {};
    (list || []).forEach(function (w) { ks[w.date + "|" + w.kg] = true; });
    state.weights = state.weights.filter(function (w) { return !ks[w.date + "|" + w.kg]; });
    return markDeleted(state, list, "w");
  }

  if (W.WT2R) W.WT2R.register({
    id: "M03", file: "m03-journal.js", layer: 1, optional: false,
    contracts: ["C-001", "C-002", "C-020", "C-024"],
    events: ["journal:add", "journal:edit", "journal:delete"], status: "ported"
  });
  W.WT2J = {
    uid: uid, dayStartOn: dayStartOn, setDayStart: setDayStart, purgePoisonedWeightTombs: purgePoisonedWeightTombs, entryDay: entryDay, dayMinOf: dayMinOf, dayEntries: dayEntries,
    entryKey: entryKey, weightKey: weightKey, entryTouch: entryTouch,
    tombMap: tombMap, markDeleted: markDeleted, markAlive: markAlive, tombBlocks: tombBlocks,
    mergeGuard: mergeGuard, addEntry: addEntry, editEntry: editEntry, deleteEntries: deleteEntries,
    addWeight: addWeight, deleteWeights: deleteWeights
  };
})(window);
