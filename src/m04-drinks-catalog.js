/* M04 drinks-catalog — каталог напитков: CRUD, порядок, защита профиля.
   Контракты: C-002 (правка напитка НЕ пересчитывает старые записи — память
   донора: «Напиток обновлён. Старые записи не пересчитаны»), C-020 (схема),
   C-024 (записи без напитка живут по имени/цвету из себя).
   Перенос с донора v158 (app.js 8440–8460, 8516–8560, 8755–8768) как спеки.
   Связи: вниз — M01 (state); вверх — M20 (черновики/палитры), M10 (ledger
   через M19). Карточка: optional:false. */
(function (W) {
  "use strict";
  function drinkById(state, id) {
    for (var i = 0; i < state.drinks.length; i++) if (state.drinks[i].id === id) return state.drinks[i];
    return null;
  }
  /* Лицо дня по умолчанию: напиток профиля, иначе первый (донор 1353). */
  function defaultDrink(state) {
    return drinkById(state, state.profile && state.profile.drinkId) || state.drinks[0] || null;
  }
  function normNameField(s) {
    return String(s == null ? "" : s).trim().slice(0, 100);
  }
  function addDrink(state, draft, now) {
    var d = {
      id: draft.id || ("c" + (W.WT2J ? W.WT2J.uid() : Math.random().toString(36).slice(2, 10))),
      name: normNameField(draft.name),
      hydration: Number(draft.hydration),
      icon: draft.icon || "drop",
      color: draft.color || "#4aa3e8"
    };
    state.drinks.push(d);
    if (W.WT2R) W.WT2R.emit("catalog:add", { id: d.id, name: d.name });
    return d;
  }
  /* Правка не трогает записи: их hydration/credited заморожены в момент порции
     (C-002). */
  function editDrink(state, id, patch) {
    var t = drinkById(state, id);
    if (!t) return null;
    if (patch.name != null) t.name = normNameField(patch.name);
    if (patch.hydration != null) t.hydration = Number(patch.hydration);
    if (patch.icon != null) t.icon = patch.icon;
    if (patch.color != null) t.color = patch.color;
    if (W.WT2R) W.WT2R.emit("catalog:edit", { id: id });
    return t;
  }
  /* Удаление: последний напиток неприкосновенен; записи истории сохраняются;
     профиль падает на воду или первого (донор 8755–8763). */
  function deleteDrink(state, id) {
    if (state.drinks.length <= 1) return false;
    var victim = drinkById(state, id);
    if (!victim) return false;
    state.drinks = state.drinks.filter(function (d) { return d.id !== id; });
    if (state.profile && state.profile.drinkId === id) {
      var water = drinkById(state, "water") || state.drinks[0];
      state.profile = { drinkId: water.id, volume: 200 };
    }
    if (W.WT2R) W.WT2R.emit("catalog:delete", { id: id, name: victim.name });
    return true;
  }
  function reorderDrinks(state, order) {
    var map = {};
    state.drinks.forEach(function (d) { map[d.id] = d; });
    var next = (order || []).map(function (id) { return map[id]; }).filter(Boolean);
    if (!next.length) return false;
    state.drinks = next;
    if (W.WT2R) W.WT2R.emit("catalog:reorder", {});
    return true;
  }
  /* Черновик нового напитка: значения по умолчанию донора (8510); цвет и
     палитры живьём задаёт M20, здесь честный null-нейтралитет. */
  function defaultDraft() {
    return { name: "", hydration: 100, icon: "drop", color: null, editing: false };
  }

  if (W.WT2R) W.WT2R.register({
    id: "M04", file: "m04-drinks-catalog.js", layer: 1, optional: false,
    contracts: ["C-002", "C-020", "C-024"],
    events: ["catalog:add", "catalog:edit", "catalog:delete", "catalog:reorder"],
    status: "ported"
  });
  W.WT2D = {
    drinkById: drinkById, defaultDrink: defaultDrink, addDrink: addDrink,
    editDrink: editDrink, deleteDrink: deleteDrink, reorderDrinks: reorderDrinks,
    defaultDraft: defaultDraft, normNameField: normNameField
  };
})(window);
