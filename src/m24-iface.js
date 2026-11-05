/* M24 — iface: интерфейсный пак (слово владельца 05.11: редактор интерфейса
   на html по принципу студии настроек; все экраны сразу, новые экраны
   попадают в редактор автоматически; цвета в панели; приложение само умеет
   читать файл кнопкой «Интерфейс из файла»).
   Формат пака: { kind: "watercat-iface", v: 1, exportedAt,
     grid: { "--переменная": "значение" },        // overrides CSS-переменных сетки
     gridLines: { "И": 370, "Б": 120 },           // справочно: положения линий канона
                                                  // (встройка линий — руками разработчика)
     screens: { "<screenId>": { objects: { "<oid>": { css: { "свойство": "значение" } } } } } }
   screenId: имя таба (home/history/weight/settings/alerts) или "page-<страница>"
   (page-drinks, page-volumes). Список экранов собирается из НАСТОЯЩЕЙ навигации
   WT2U.NAV + реестра страниц PAGES — новый экран появляется в редакторе сам.
   oid объекта: screenId + "|" + путь по DOM (тег[data-ui].класс:индекс…) —
   метки ставит labelOids() после каждой отрисовки, поэтому пак переживает
   перерисовки и попадает ровно в свой объект.
   Безопасность: свойства и значения проходят белый список (sanitize) —
   из файла в разметку не проникают ни скрипты, ни url(), ни поведение.
   Граница из донорской спеки студии: визуальное редактируемо, поведение и
   структура — нет. */
(function (W) {
  "use strict";
  var LS_KEY = "wt2-iface";
  var STYLE_ID = "wt2-iface-style";
  /* Реестр второстепенных страниц (ui.page). Новая страница — одна строка здесь. */
  var PAGES = [["drinks", "Напитки"], ["volumes", "Объёмы"]];

  /* Белый список CSS-свойств объекта: геометрия, шрифт, цвета, прозрачность.
     НЕТ transform/display/поведения — они принадлежат коду и анимациям. */
  var ALLOWED_PROPS = ("left top position width height min-width min-height max-width max-height " +
    "border-radius border-top-left-radius border-top-right-radius border-bottom-left-radius " +
    "border-bottom-right-radius font-size font-weight letter-spacing line-height text-align " +
    "color background background-color border border-width border-color border-style opacity " +
    "padding padding-top padding-right padding-bottom padding-left margin margin-top margin-right " +
    "margin-bottom margin-left z-index overflow").split(" ");
  var ALLOWED_SET = {};
  for (var ai = 0; ai < ALLOWED_PROPS.length; ai++) ALLOWED_SET[ALLOWED_PROPS[ai]] = 1;

  function okProp(p) { return typeof p === "string" && ALLOWED_SET[p.trim()] === 1; }
  /* Значение: запрещаем всё, чем можно инъектировать (кавычки, скобки css,
     точка с запятой, углы, url, expression). Числа/цвета/px/%/rem — проходят. */
  function okValue(v) {
    if (typeof v !== "string" || !v.length || v.length > 200) return false;
    if (/[;{}<>"'`\\]/.test(v)) return false;
    if (/url\s*\(|expression|javascript/i.test(v)) return false;
    return true;
  }
  function okVar(p) { return typeof p === "string" && /^--[a-zA-Z0-9-]+$/.test(p); }

  /* ---- экраны (автообнаружение для редактора) ---- */
  function screens() {
    var out = [];
    var nav = (W.WT2U && W.WT2U.NAV) || [];
    for (var i = 0; i < nav.length; i++) out.push({ id: nav[i][0], label: nav[i][2], tab: nav[i][0], page: null });
    for (var j = 0; j < PAGES.length; j++) out.push({ id: "page-" + PAGES[j][0], label: PAGES[j][1], tab: null, page: PAGES[j][0] });
    return out;
  }
  function screenIdOf(ui) {
    if (!ui) return "home";
    return ui.page ? "page-" + ui.page : (ui.tab || "home");
  }

  /* ---- метки объектов (oid) ---- */
  function oidPath(el, stop) {
    var parts = [];
    while (el && el !== stop) {
      var t = el.tagName ? el.tagName.toLowerCase() : "?";
      var du = el.getAttribute ? el.getAttribute("data-ui") : null;
      var cls = el.classList && el.classList.length ? "." + el.classList[0] : "";
      var idx = 1, sib = el;
      while ((sib = sib.previousElementSibling) != null) idx++;
      parts.unshift(t + (du ? "[" + du + "]" : "") + cls + ":" + idx);
      el = el.parentElement;
    }
    return parts.join("/");
  }
  function labelOids(root, screenId) {
    if (!root || !root.querySelectorAll) return 0;
    var els = root.querySelectorAll("*");
    var n = 0;
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var t = el.tagName ? el.tagName.toLowerCase() : "";
      /* внутренности svg не метим: иконки — атомарные объекты */
      if (t !== "svg" && el.closest && el.closest("svg")) continue;
      if (t === "svg") continue;
      el.setAttribute("data-oid", screenId + "|" + oidPath(el, root));
      n++;
    }
    return n;
  }

  /* ---- пак: хранение и применение ---- */
  function load() {
    var raw = W.WT2K ? W.WT2K.get(LS_KEY) : null;
    if (!raw) return null;
    try {
      var p = JSON.parse(raw);
      return p && p.kind === "watercat-iface" ? p : null;
    } catch (e) { return null; }
  }
  function save(pack) {
    if (!pack || pack.kind !== "watercat-iface") return false;
    return W.WT2K ? W.WT2K.set(LS_KEY, JSON.stringify(pack)) : false;
  }
  function buildCss(pack) {
    var css = "";
    if (pack.grid) {
      var g = "";
      for (var vp in pack.grid) {
        if (!Object.prototype.hasOwnProperty.call(pack.grid, vp)) continue;
        if (okVar(vp) && okValue(String(pack.grid[vp]))) g += vp + ":" + pack.grid[vp] + " !important;";
      }
      if (g) css += ":root{" + g + "}\n";
    }
    var sc = pack.screens || {};
    for (var sid in sc) {
      if (!Object.prototype.hasOwnProperty.call(sc, sid)) continue;
      var objs = (sc[sid] && sc[sid].objects) || {};
      for (var oid in objs) {
        if (!Object.prototype.hasOwnProperty.call(objs, oid)) continue;
        var m = objs[oid] && objs[oid].css;
        if (!m) continue;
        var decls = "";
        for (var p in m) {
          if (!Object.prototype.hasOwnProperty.call(m, p)) continue;
          if (!okProp(p) || !okValue(String(m[p]))) continue;
          /* !important: интерфейсный пак — слой overrides, он обязан побеждать
             донорскую специфичность (.a .b .c), иначе правка не видна. */
          decls += p + ":" + m[p] + " !important;";
        }
        if (decls) css += '[data-oid="' + oid.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"]{' + decls + "}\n";
      }
    }
    return css;
  }
  function injectCss(css) {
    if (typeof document === "undefined") return;
    var st = document.getElementById(STYLE_ID);
    if (!st) {
      st = document.createElement("style");
      st.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(st);
    }
    st.textContent = css;
  }
  function packApply(pack) {
    if (!pack || pack.kind !== "watercat-iface") return false;
    injectCss(buildCss(pack));
    return true;
  }
  function bootApply() {
    var p = load();
    if (p) packApply(p);
    return !!p;
  }
  function reset() {
    if (W.WT2K) W.WT2K.remove(LS_KEY);
    injectCss("");
  }
  function current() {
    return load() || { kind: "watercat-iface", v: 1, screens: {} };
  }
  function packText(pack) {
    return JSON.stringify(pack || current());
  }
  function countObjects(pack) {
    var n = 0, sc = (pack && pack.screens) || {};
    for (var sid in sc) {
      if (!Object.prototype.hasOwnProperty.call(sc, sid)) continue;
      var o = (sc[sid] && sc[sid].objects) || {};
      for (var oid in o) if (Object.prototype.hasOwnProperty.call(o, oid)) n++;
    }
    return n;
  }

  /* ---- файловая дорога (транспорт M23, диспетчер по kind в M21) ---- */
  function todayName() {
    var d = new Date();
    return "vodomer-iface-" + d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2) + ".json";
  }
  function request(ui, toast) {
    if (!(window.WaterBridge && typeof window.WaterBridge.wtRequestFile === "function")) {
      if (toast) toast("Чтение файла доступно в приложении");
      return false;
    }
    window.WaterBridge.wtRequestFile();
    if (toast) toast("Выберите файл интерфейса");
    return true;
  }
  function saveToBridge(toast) {
    if (!(window.WaterBridge && typeof window.WaterBridge.wtSaveFile === "function")) {
      if (toast) toast("Сохранение в файл доступно в приложении");
      return false;
    }
    window.WaterBridge.wtSaveFile(todayName(), packText());
    if (toast) toast("Выберите, куда сохранить интерфейс");
    return true;
  }
  function fileResult(text, err, hooks) {
    hooks = hooks || {};
    if (err || text == null) {
      if (hooks.toast) hooks.toast(err ? "Файл не прочитан: " + err : "Файл не выбран");
      return { ok: false };
    }
    var pack;
    try { pack = JSON.parse(text); } catch (e) {
      if (hooks.toast) hooks.toast("Файл не похож на интерфейсный пак");
      return { ok: false };
    }
    if (!pack || pack.kind !== "watercat-iface") {
      if (hooks.toast) hooks.toast("Файл не похож на интерфейсный пак");
      return { ok: false };
    }
    pack.v = pack.v || 1;
    save(pack);
    packApply(pack);
    if (hooks.toast) hooks.toast("Интерфейс из файла применён: объектов " + countObjects(pack));
    if (hooks.render) hooks.render();
    return { ok: true, objects: countObjects(pack) };
  }

  W.WT2I = {
    LS_KEY: LS_KEY, STYLE_ID: STYLE_ID, PAGES: PAGES,
    ALLOWED_PROPS: ALLOWED_PROPS, okProp: okProp, okValue: okValue, okVar: okVar,
    screens: screens, screenIdOf: screenIdOf,
    oidPath: oidPath, labelOids: labelOids,
    load: load, save: save, buildCss: buildCss, packApply: packApply,
    bootApply: bootApply, reset: reset, current: current, packText: packText,
    countObjects: countObjects, todayName: todayName,
    request: request, saveToBridge: saveToBridge, fileResult: fileResult
  };
})(window);
