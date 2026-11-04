/* M17 shell: мост системных баров, «Назад» и нативных пикеров (донор android-bridge.js, байт-порт v158). Регистр M17, контракты C-010…C-012. */
/*
  Мост к системным диалогам Android. Страница его не рисует:
  оболочка WebView добавляет объект WaterBridge и сама показывает
  NumberPicker, DatePickerDialog или TimePickerDialog.

  Kotlin:
    webView.addJavascriptInterface(bridge, "WaterBridge")

    @JavascriptInterface fun pickNumber(id: String, json: String)
    @JavascriptInterface fun pickDate(id: String, json: String)
    @JavascriptInterface fun pickTime(id: String, json: String)

  json числа: { title, value, min, max, step, decimals, unit }
  NumberPicker целочисленный, поэтому значение для него —
  round(value / step), диапазон round(min / step)..round(max / step).
  В done вернуть обычное число строкой, например "59.1" или "250".

  json даты: { title, value, max } — даты YYYY-MM-DD, max не включать будущие.
  В done вернуть "YYYY-MM-DD".

  json времени: { title, value, is24Hour } — value "HH:MM", часы 0–23.
  В done вернуть "HH:MM". Это TimePickerDialog, не барабан длительности.

  Отмена — WaterNative.done(id, "").
  Успех — WaterNative.done(id, "значение").
  Вызов из UI-потока: webView.evaluateJavascript(...).
*/
(function (root) {
  var pending = {};
  var seq = 1;

  function host() {
    return root.WaterBridge || null;
  }

  function has(method) {
    var bridge = host();
    return !!(bridge && typeof bridge[method] === "function");
  }

  function ask(method, payload) {
    return new Promise(function (resolve) {
      var bridge = host();
      if (!bridge || typeof bridge[method] !== "function") {
        resolve(null);
        return;
      }
      var id = "p" + (seq++);
      pending[id] = resolve;
      try {
        bridge[method](id, JSON.stringify(payload || {}));
      } catch (e) {
        delete pending[id];
        resolve(null);
      }
    });
  }

  /* Системные бары должны совпадать с панелями приложения в обеих темах.
     Цвета не берём из переменных: в светлой теме нижняя панель синяя
     (#78ceff), хотя --nav белый, а верхняя полоса (#d6f0ff) тоже не равна
     --bg. Поэтому измеряем то, что реально нарисовано: у верхнего края окна
     и у нижнего, и берём цвет первого непрозрачного слоя (полупрозрачные
     наложения складываем). Так бары совпадают с экраном при любой теме,
     при открытых меню и на любом экране. */

  function parseColor(value) {
    var m = /rgba?\(([^)]+)\)/.exec(String(value || ""));
    if (!m) return null;
    var p = m[1].split(",");
    var rgb = [parseFloat(p[0]) || 0, parseFloat(p[1]) || 0, parseFloat(p[2]) || 0];
    var a = p.length > 3 ? parseFloat(p[3]) : 1;
    if (isNaN(a)) a = 1;
    return [rgb[0], rgb[1], rgb[2], a];
  }

  function layersColor(el) {
    var stack = [];
    while (el && el.nodeType === 1) {
      var c = parseColor(root.getComputedStyle(el).backgroundColor);
      if (c) {
        stack.push(c);
        if (c[3] >= 0.999) break;
      }
      el = el.parentElement;
    }
    if (!stack.length) return null;
    var top = stack[stack.length - 1];
    var out = top[3] >= 0.999 ? [top[0], top[1], top[2]] : [255, 255, 255];
    for (var i = stack.length - (top[3] >= 0.999 ? 2 : 1); i >= 0; i--) {
      var a = stack[i][3];
      out = [out[0] * (1 - a) + stack[i][0] * a,
             out[1] * (1 - a) + stack[i][1] * a,
             out[2] * (1 - a) + stack[i][2] * a];
    }
    return [Math.round(out[0]), Math.round(out[1]), Math.round(out[2])];
  }

  function colorAt(x, y) {
    var el = null;
    try { el = document.elementFromPoint(x, y); } catch (e) { el = null; }
    if (!el) el = document.querySelector(".app") || document.body;
    return layersColor(el);
  }

  function hex(rgb) {
    if (!rgb) return "";
    var s = "#";
    for (var i = 0; i < 3; i++) {
      var v = Math.max(0, Math.min(255, Math.round(rgb[i]))).toString(16);
      s += v.length === 1 ? "0" + v : v;
    }
    return s;
  }

  /* Яркость: по ней понимаем, какими должны быть значки системной панели. */
  function luminance(rgb) {
    if (!rgb) return 0;
    var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
  }

  function iconColorIn(el) {
    /* Цвет значков самой панели приложения: у системной панели значки должны
       быть такими же (в светлой теме это белые значки на синей панели). */
    if (!el) return null;
    var btn = el.querySelector("button:not(.on)") || el.querySelector("button");
    if (!btn) return null;
    return parseColor(root.getComputedStyle(btn).color);
  }

  var lastBars = "";
  var barsTimer = 0;

  function syncBars() {
    var shell = root.WaterShell;
    if (!shell) return;
    var vw = root.innerWidth || 360;
    var vh = root.innerHeight || 640;
    /* Статус-бар — цвет шапки текущего экрана (.top). Берём именно шапку, а не
       первый слой у верхнего края: при открытом меню экран затемнён плёнкой,
       и статус-бар не должен вслед за ней уходить в серый. */
    var header = document.querySelector(".app .screen > .top");
    var status = layersColor(header) || colorAt(Math.round(vw / 2), 1);
    var navEl = document.querySelector(".nav");
    var nav = colorAt(Math.round(vw / 2), Math.max(0, vh - 1));
    if (navEl) {
      var byNav = layersColor(navEl);
      if (byNav) nav = byNav;
    }
    var navIcons = iconColorIn(navEl) || (luminance(nav) > 0.55 ? [34, 34, 34, 1] : [255, 255, 255, 1]);
    var statusDark = luminance(status) > 0.55;
    var navDark = luminance(navIcons) < 0.45;
    var key = hex(status) + "/" + statusDark + "/" + hex(nav) + "/" + navDark;
    if (key === lastBars) return;
    lastBars = key;
    try {
      /* v149: флаги — настоящие булевы. Числа 1/0 в Java-boolean на части
         WebView приходят как false: светлая тема получала белые значки. */
      if (typeof shell.bars === "function") shell.bars(hex(status), !!statusDark, hex(nav), !!navDark);
      else if (typeof shell.navBar === "function") shell.navBar(hex(nav), navDark);
    } catch (e) {}
  }

  function queueBars() {
    if (barsTimer) return;
    barsTimer = setTimeout(function () { barsTimer = 0; syncBars(); }, 80);
  }

  root.WaterBars = {
    sync: syncBars,
    /* v149: сигнал оболочки «страница нарисована» — для нативного сторожа. */
    painted: function () {
      /* v154: оболочка могла внедриться позже старта модуля — перечитываем её. */
      var sh = root.WaterBridge || shell;
      try { if (sh && typeof sh.painted === "function") sh.painted(); } catch (e) {}
    },
    measure: function () {
      return { status: hex(colorAt(Math.round((root.innerWidth || 0) / 2), 1)),
               nav: hex(layersColor(document.querySelector(".nav"))) };
    }
  };

  if (root.document) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", syncBars);
    else setTimeout(syncBars, 0);
    root.addEventListener("load", syncBars);
    root.addEventListener("resize", queueBars);
    try {
      new MutationObserver(queueBars).observe(document.documentElement, {
        attributes: true, attributeFilter: ["data-theme", "class"]
      });
      var app = document.querySelector(".app");
      if (app) new MutationObserver(queueBars).observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    } catch (e) {}
  }

  /* Системная кнопка «Назад»: оболочка спрашивает страницу, есть ли шаг назад
     (WaterShell.canGoBack) и зовёт WaterBack.back(). Если страница шаг
     выполнила, выходить не предлагаем. */
  root.WaterBack = {
    back: function () {
      if (typeof root.__backStep === "function") {
        try { return !!root.__backStep(); } catch (e) { return false; }
      }
      return false;
    },
    /* v160: оболочка больше не хранит признак «есть ли шаг» — он мог устареть
       или потеряться. На каждый «Назад» страница сама решает: шагнуть или
       попросить оболочку предложить выход; подтверждение backDone снимает
       автоповтор оболочки. */
    backOrExit: function () {
      var sh = root.WaterShell;
      if (root.WaterBack.canBack()) {
        var done = root.WaterBack.back();
        try { if (done && sh && sh.backDone) sh.backDone(); } catch (e) {}
        return done;
      }
      try { if (sh && sh.requestExit) sh.requestExit(); } catch (e) {}
      return true;
    },
    canBack: function () {
      if (typeof root.__backAvailable === "function") {
        try { return !!root.__backAvailable(); } catch (e) { return false; }
      }
      return false;
    }
  };

  root.WaterNative = {
    hasNumber: function () { return has("pickNumber"); },
    hasDate: function () { return has("pickDate"); },
    hasTime: function () { return has("pickTime"); },
    pickNumber: function (payload) { return ask("pickNumber", payload); },
    pickDate: function (payload) { return ask("pickDate", payload); },
    pickTime: function (payload) { return ask("pickTime", payload); },
    done: function (id, value) {
      var fn = pending[String(id)];
      if (!fn) return;
      delete pending[String(id)];
      if (value == null || value === "") fn(null);
      else fn(String(value));
    }
  };
})(typeof window !== "undefined" ? window : this);
