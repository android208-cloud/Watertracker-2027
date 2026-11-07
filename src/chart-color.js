/* Модуль цвета ежедневного графика («История и статистика»).
   Самостоятельный, по образцу liquid-color.js: своё хранилище, своя секция
   настроек, свои действия. Вычисление цвета дня НЕ дублирует: берёт чистую
   функцию window.LiquidColor.colorWith (решение владельца 24.10.2026:
   секция и режимы графика отдельны от котика, но математика цвета одна).
   Удаление без вреда основному коду:
   1) убрать этот файл; 2) убрать тег <script src="chart-color.js"> в index.html;
   3) убрать три охраняемых упоминания window.ChartColor в app.js
      (performAction, colHtml, страница «Дополнительно»).
   Основной код без модуля рисует столбцы прежней стопкой сегментов
   по цветам напитков. */
(function () {
  "use strict";
  var KEY = "cup-chart-color-v1";

  /* v136 (чистка владельца): из «Цвета графика» убраны «Доминирующий с
     гистерезисом», «Последняя порция», «Пояс графика» и «Разбавлять при
     малом заполнении»; старые значения молча переезжают в «Сосуд».
     «Пояс графика» живёт в цвете жидкости кота (полосатая вода). */
  var ALLOWED = ["vessel", "dominant", "base"];
  function defs() { return { on: false, mode: "vessel", dilute: false, anchor: null }; }
  function load() {
    var d;
    try { d = Object.assign(defs(), JSON.parse(localStorage.getItem(KEY) || "{}")); }
    catch (e) { d = defs(); }
    var dirty = false;
    if (ALLOWED.indexOf(d.mode) < 0) { d.mode = "vessel"; d.anchor = null; dirty = true; }
    if (d.dilute) { d.dilute = false; dirty = true; }
    if (dirty) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
    return d;
  }
  var store = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }

  var FALLBACK_MODES = [
    { id: "vessel", label: "Сосуд", sub: "Порции смешиваются по порядку, след напитка вымывается водой" },
    { id: "dominant", label: "Доминирующий напиток", sub: "Цвет напитка с наибольшим объёмом за сутки" },
    { id: "domhyst", label: "Доминирующий с гистерезисом", sub: "Переключение при перевесе больше 10 п.п." },
    { id: "last", label: "Последняя порция", sub: "Цвет самого свежего напитка" },
    { id: "belt", label: "Пояс графика", sub: "Сейчас как «последняя порция»; резерв под синхронизацию с поясами" },
    { id: "base", label: "Вода-база с тонировкой", sub: "cyan тонируется долей неводного объёма" }
  ];
  function modes() {
    var all = (window.LiquidColor && window.LiquidColor.MODES_DETAIL) || FALLBACK_MODES;
    return all.filter(function (m) { return ALLOWED.indexOf(m.id) >= 0; });
  }

  function on() { return !!store.on; }
  /* Цвет дня для столбца; null — модуль выключен, рисуйте стопку сегментов. */
  function color(state, date, fill) {
    if (!store.on) return null;
    if (!window.LiquidColor) return null;
    var a0 = store.anchor;
    var c = window.LiquidColor.colorWith(store.mode, false, state, date, fill, store);
    if (store.anchor !== a0) save();
    return c;
  }

  /* --- секция настроек (там же, где «Цвет жидкости»: «Дополнительно») --- */
  var TICK = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4Z" fill="currentColor"/></svg>';
  function row(title, sub, act, onv, val) {
    return '<div class="n-row switch-row" role="switch" aria-checked="' + (onv ? "true" : "false") +
      '" tabindex="0" data-act="' + act + '"' + (val ? ' data-v="' + val + '"' : "") + ">" +
      '<span class="ttl">' + title + (sub ? "<small>" + sub + "</small>" : "") + "</span>" +
      '<span class="checksq' + (onv ? " on" : "") + '" aria-hidden="true">' + (onv ? TICK : "") + "</span></div>";
  }
  /* v127: заголовок «Цвет графика» даёт раздел модели (chartBlock), тут только строки. */
  function colorHtml() {
    var out = "";
    out += row("Ежедневный график тем же цветом",
      "Выкл — столбцы прежней стопкой по напиткам", "chart-on", !!store.on);
    modes().forEach(function (m) {
      out += row(m.label, m.sub, "chart-mode", store.mode === m.id, m.id);
    });
    return out;
  }

  function act(a, t) {
    if (a === "chart-on") { store.on = !store.on; save(); return true; }
    if (a === "chart-mode") {
      var v = t && t.dataset ? t.dataset.v : "";
      if (modes().some(function (m) { return m.id === v; })) { store.mode = v; store.anchor = null; save(); }
      return true;
    }
    return false;
  }

  window.ChartColor = {
    on: on,
    color: color,
    act: act,
    colorHtml: colorHtml,
    store: function () { return store; }
  };
}());
