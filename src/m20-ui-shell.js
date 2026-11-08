/* M20 ui-shell — оболочка: навигация, щиты (модал/диалог/шторка), пилюли,
   тосты, «Назад» одним нажатием.
   Контракты: C-007 (пилюли-образец 22:26), C-008 (полоса — геометрию несёт
   M10/M17, здесь классы оболочки), C-013 («Назад» одним нажатием), C-015
   (тишина: тост живёт 2400 мс и исчезает сам).
   Перенос с донора v158 как спеки: app.js 238–268 (uiIcon), 2334–2342 (toast),
   3771–3783 (navHtml), 4287–4351 (pageBack/backAvailable/backStep v161 с
   самопочинкой фантомов), 4256 (toast-разметка); ui-kit.js 528–536 (uiAttr/esc),
   556–565 (sheet), 583–591 (dialog), 711–744 (chipRow/roundBtn), 594–604
   (optionList). CSS — побайтно в m20-ui-shell.css.
   Конструктор: каскад экранов pageBack донора был жёстко зашит; здесь M20
   владеет ЦЕПЬЮ (модал > диалог > шторка > свайп > страница > таб), а свои
   переходы страниц модули регистрируют через registerBackPage — порядок
   приоритета тот же, что в доноре. Арт пилюль (кот/чашка) приезжает готовым
   html из M05/M09 — оболочка его не рисует.
   Связи: вниз — M00 (шина); вверх — M10/M13/M15/M16/M17 (экраны). */
(function (W) {
  "use strict";
  var ICON_BASE = "assets/icons/";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function uiAttr(name, o) {
    return o && o.ui ? ' data-ui="' + name + "." + o.ui + '"' : "";
  }

  /* Иконки донора: [файл, маска]. Маска красится currentColor, img — цветная. */
  var ICONS = {
    back: ["arrow.svg", 1], undo: ["refresh.svg", 1], drop: ["white_drop.svg", 1],
    plus: ["add.svg", 0], check: ["check.svg", 0], sort: ["equalizer.svg", 1],
    pencil: ["pencil.svg", 0], pencilMask: ["pencil.svg", 1], clock: ["time.svg", 0],
    chevron: ["arrow_forward.svg", 0], chart: ["equalizer.svg", 1],
    bottle: ["kettlebell.svg", 1], gear: ["settings.svg", 1], bell: ["notifications.svg", 1],
    arrows: ["autorenew.svg", 1], restore: ["restore.svg", 1], tick: ["check.svg", 0],
    sun: ["sunEveryday.svg", 0], snow: ["sunrise.svg", 0]
  };
  function uiIcon(name) {
    var spec = ICONS[name];
    if (spec) {
      if (spec[1]) return '<span class="ui-mask" data-svg-file="' + spec[0] + '" style="-webkit-mask-image:url(' + ICON_BASE + spec[0] + ');mask-image:url(' + ICON_BASE + spec[0] + ')"></span>';
      return '<img class="ui-ico" src="' + ICON_BASE + spec[0] + '" data-svg-file="' + spec[0] + '" alt="">';
    }
    if (name === "trash") return '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M9.6 3h4.8a1 1 0 0 1 .9.55l.6 1.2H19a1 1 0 1 1 0 2H5a1 1 0 0 1 0-2h3.1l.6-1.2A1 1 0 0 1 9.6 3Z" fill="currentColor"/><path d="M6.4 8h11.2l-.9 11.1A2 2 0 0 1 14.7 21H9.3a2 2 0 0 1-2-1.9L6.4 8Z" fill="currentColor"/></svg>';
    if (name === "handle") return '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M5 8h14M5 12h14M5 16h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    return "";
  }

  /* Состояние оболочки: поля донора, только общие (экранное наполнение — модули). */
  function shellState() {
    return { tab: "home", page: null, modal: null, dialog: null, sheet: null,
      sheetLeaving: false, openSwipe: null, toast: null, toastTimer: null };
  }

  /* Навигация донора: пять табов, порядок закрепён (3771–3783). */
  var NAV = [["home", "drop", "Главная"], ["history", "chart", "История"],
    ["weight", "bottle", "Вес"], ["settings", "gear", "Настройки"],
    ["alerts", "bell", "Уведомления"]];
  function navHtml(shell) {
    return '<nav class="nav">' + NAV.map(function (it) {
      var on = shell.tab === it[0];
      return '<button type="button" class="' + (on ? "on" : "") + '" data-act="goto" data-tab="' + it[0] + '" aria-label="' + it[2] + '"><span class="nav-ico">' + uiIcon(it[1]).replace('class="ui-mask"', 'class="ui-mask" data-svg-lock="1"') + "</span></button>";
    }).join("") + "</nav>";
  }

  /* Тост донора: 2400 мс и тишина (2334–2342, C-015).
     Появление/исчезновение НЕ зовёт render(): полный рендер пересоздаёт
     экран и холст воды — анимация лифта дёргалась ровно на тосте
     (глаз владельца 08.11). Тост — отдельный узел поверх #app,
     обновляется точечно; состояние shell.toast по-прежнему источник
     правды для рендеров, случившихся по другим причинам. */
  function paintToast(shell) {
    if (typeof document === "undefined" || !document.querySelector) return;
    var app = document.getElementById("app");
    if (!app) return;
    var el = app.querySelector(".toast");
    if (!shell.toast) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      app.appendChild(el);
    }
    if (el.textContent !== shell.toast) el.textContent = shell.toast;
  }
  function toast(shell, text, render) {
    shell.toast = text;
    paintToast(shell);
    clearTimeout(shell.toastTimer);
    shell.toastTimer = setTimeout(function () {
      shell.toast = null;
      paintToast(shell);
    }, 2400);
    if (W.WT2R) W.WT2R.emit("ui:toast", { text: text });
  }
  function toastHtml(shell) {
    return shell.toast ? '<div class="toast">' + esc(shell.toast) + "</div>" : "";
  }

  /* «Назад» одним нажатием (C-013): цепь донора 4326–4351 + самопочинка
     фантомов v161. env = { has(sel), render(), closeSheet(), closeSwipes() }. */
  var backModalHooks = [];
  var backPageHooks = [];
  function registerBackModal(fn) { backModalHooks.push(fn); }
  function registerBackPage(fn) { backPageHooks.push(fn); }

  function backAvailable(shell) {
    return !!(shell.modal || shell.dialog || shell.sheet || shell.sheetLeaving ||
      shell.openSwipe || shell.page || (shell.tab && shell.tab !== "home"));
  }
  function backStep(shell, env) {
    /* v161: флаг без своего элемента в DOM — фантом; первый press не сгорает
       на уборку невидимого — сбрасываем и идём по цепи дальше. */
    if (env && env.has) {
      if (shell.sheet && !env.has(".sheet")) shell.sheet = null;
      if (shell.modal && !env.has(".modal")) { shell.modal = null; shell.dialog = null; }
      else if (shell.dialog && !env.has(".modal")) shell.dialog = null;
    }
    if (!backAvailable(shell)) return false;
    for (var i = 0; i < backModalHooks.length; i++) {
      if (backModalHooks[i](shell, env)) return true;
    }
    if (shell.modal) {
      shell.modal = null;
      if (shell.dialog) shell.dialog = null; /* вопрос закрыт без выбора — задание забываем */
      if (env && env.render) env.render();
      if (W.WT2R) W.WT2R.emit("ui:back", { what: "modal" });
      return true;
    }
    if (shell.dialog) { shell.dialog = null; if (env && env.render) env.render(); if (W.WT2R) W.WT2R.emit("ui:back", { what: "dialog" }); return true; }
    if (shell.sheet) { if (env && env.closeSheet) env.closeSheet(); if (W.WT2R) W.WT2R.emit("ui:back", { what: "sheet" }); return true; }
    if (shell.sheetLeaving) { if (W.WT2R) W.WT2R.emit("ui:back", { what: "sheetLeaving" }); return true; }
    if (shell.openSwipe) { if (env && env.closeSwipes) env.closeSwipes(); if (W.WT2R) W.WT2R.emit("ui:back", { what: "swipe" }); return true; }
    if (shell.page) {
      for (var j = 0; j < backPageHooks.length; j++) {
        if (backPageHooks[j](shell, env)) { if (W.WT2R) W.WT2R.emit("ui:back", { what: "page" }); return true; }
      }
      shell.page = null;
      if (env && env.render) env.render();
      if (W.WT2R) W.WT2R.emit("ui:back", { what: "page" });
      return true;
    }
    if (shell.tab && shell.tab !== "home") {
      shell.tab = "home"; shell.page = null;
      if (env && env.render) env.render();
      if (W.WT2R) W.WT2R.emit("ui:back", { what: "tab" });
      return true;
    }
    return false;
  }
  /* Тап по уведомлению: всегда главный экран, каким бы его ни оставили (4360). */
  function goHome(shell, env) {
    shell.dialog = null; shell.modal = null; shell.sheet = null;
    shell.sheetLeaving = false; shell.openSwipe = null; shell.page = null;
    shell.tab = "home";
    if (env && env.closeSwipes) env.closeSwipes();
    if (env && env.render) env.render();
  }

  /* --- Кубики разметки UiKit (порт 528–744) --- */
  function dialog(o) {
    var acts = (o.actions || []).map(function (a) {
      return '<button type="button" data-act="' + a.act + '">' + a.label + "</button>";
    }).join("");
    return '<div class="modal-scrim" data-act="' + o.scrimAct + '"></div>' +
      '<div class="' + o.cls + '" role="dialog"' + uiAttr("dialog", o) + "><h3>" + o.title + "</h3>" +
      (o.body || "") + '<div class="modal-actions">' + acts + "</div></div>";
  }
  function sheet(o) {
    return '<div class="scrim' + (o.scrimCls ? " " + o.scrimCls : "") +
      '" data-act="close-sheet"></div><div class="sheet ' + o.cls + '"' + uiAttr("sheet", o) + ">" +
      (o.title ? "<h2>" + esc(o.title) + "</h2>" : "") +
      (o.sub ? '<div class="sub">' + o.sub + "</div>" : "") +
      (o.body || "") + (o.tail || "") + "</div>";
  }
  function roundBtn(o) {
    var aria = o.aria ? ' aria-label="' + o.aria + '"' : "";
    if (o.role === "head") return '<button type="button" class="icon-btn ' + o.side + '" data-act="' + o.act + '"' + aria + uiAttr("roundbtn", o) + ">" + (o.icon || "") + "</button>";
    if (o.role === "fab") return '<button type="button" class="fab' + (o.cls ? " " + o.cls : "") + '" data-act="' + o.act + '"' + aria + uiAttr("roundbtn", o) + ">" + (o.icon || "") + "</button>";
    if (o.role === "check") return '<button type="button" class="check ' + o.pos + '" data-act="' + o.act + '"' + aria + uiAttr("roundbtn", o) + ">" + (o.icon || "") + "</button>";
    return '<button type="button" class="time-btn' + (o.cls ? " " + o.cls : "") + '" data-act="' + o.act + '"' + aria + uiAttr("roundbtn", o) + ">" + (o.icon || "") + (o.text ? "<span>" + o.text + "</span>" : "") + "</button>";
  }
  function chipRow(o) {
    var sel = Number(o.selected);
    return '<div class="' + (o.baseCls || "presets xscroll") + (o.cls ? " " + o.cls : "") + '"' +
      uiAttr("chips", o) + ">" + (o.values || []).map(function (v) {
        return '<button type="button" class="preset' + (Number(v) === sel ? " on" : "") +
          '" data-act="' + o.act + '" data-v="' + v + '">' + v + " мл</button>";
      }).join("") + "</div>";
  }
  function optionList(o) {
    var attr = o.attr || "v";
    return (o.items || []).map(function (it) {
      return '<button type="button" class="freq-opt' + (it.on ? " on" : "") +
        '" data-act="' + o.act + '" data-' + attr + '="' + it.value + '"' + uiAttr("opt", o) + ">" +
        '<span class="radio"></span><span>' + esc(it.label) + "</span></button>";
    }).join("");
  }
  /* Пилюля дока (донор 2567–2568): слот сетки --c/--r; кнопка (act) или
     картинка (aria). Арт (мини-кот/чашка) приходит готовым html — C-007
     исполняют CSS-темы: тёмная подпись #5aade8 и цветные мини-иконки,
     светлая — пилюля #78ceff, подпись #fff, мордочка белая. */
  function pillHtml(o) {
    var slot = '<div class="pill-slot"' + (o.slot ? ' style="--c:' + o.slot.c + ";--r:" + o.slot.r + '"' : "") + ">";
    if (o.act) {
      slot += '<button type="button" class="pill' + (o.cls ? " " + o.cls : "") + '" data-act="' + o.act + '"' + (o.color ? ' style="--pill:' + o.color + '"' : "") + ">" + (o.icon || "") + "<span>" + esc(o.label) + "</span></button>";
    } else {
      slot += '<div class="pill' + (o.cls ? " " + o.cls : "") + '" role="img" aria-label="' + esc(o.aria || o.label) + '"' + (o.color ? ' style="--pill:' + o.color + '"' : "") + ">" + (o.icon || "") + "<span>" + esc(o.label) + "</span></div>";
    }
    return slot + "</div>";
  }

  /* Кадр «от ширины» (донор 9886–9929): --w задаёт отступ, шаг F, иконки и
     кота; лишняя высота уходит в зону D. Клавиатура Android не перекраивает. */
  var DESIGN_W = 412, MAX_W = 480, MIN_W = 280, NAV_H = 56, NATURAL_K = 1.52;
  var lastVh = 0;
  function fitPhone() {
    var stage = document.getElementById("stage");
    var app = document.getElementById("app");
    if (!stage || !app) return;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    if (lastVh && vh < lastVh * 0.75) vh = lastVh; else lastVh = vh;
    var margin = (vw > MAX_W + 48 && vh > MAX_W * NATURAL_K + NAV_H + 48) ? 24 : 0;
    var availW = Math.max(1, vw - margin * 2);
    var availH = Math.max(1, vh - margin * 2);
    var w = Math.min(availW, MAX_W, (availH - NAV_H) / NATURAL_K);
    w = Math.max(Math.min(MIN_W, availW), w);
    w = Math.round(w);
    var h = (vw > MAX_W + 16) ? Math.min(availH, Math.round(w * 2340 / 1080)) : availH;
    stage.style.position = "relative";
    stage.style.overflow = "hidden";
    stage.style.width = w + "px";
    stage.style.height = h + "px";
    stage.style.maxWidth = "none";
    app.style.position = "absolute";
    app.style.left = "0";
    app.style.top = "0";
    app.style.width = w + "px";
    app.style.height = h + "px";
    app.style.maxWidth = "none";
    app.style.setProperty("--w", w + "px");
    app.style.transform = "none";
    app.style.transformOrigin = "top left";
    var framed = vw > w + 16 || vh > h + 16;
    app.style.borderRadius = framed ? "28px" : "0";
    app.style.boxShadow = framed ? "0 0 0 8px #1a1b1e, 0 18px 50px rgba(0,0,0,.45)" : "none";
    if (W.WT2R) W.WT2R.emit("ui:fit", { w: w, h: h });
  }
  function bindPhone() {
    fitPhone();
    window.addEventListener("resize", fitPhone);
  }

  if (W.WT2R) W.WT2R.register({
    id: "M20", file: "m20-ui-shell.js", layer: 2, optional: false,
    contracts: ["C-007", "C-008", "C-013", "C-015"],
    events: ["ui:toast", "ui:back"],
    status: "ported"
  });
  W.WT2U = {
    ICON_BASE_SET: function (b) { ICON_BASE = b; },
    esc: esc, uiAttr: uiAttr, uiIcon: uiIcon, ICONS: ICONS, NAV: NAV,
    shellState: shellState, navHtml: navHtml,
    toast: toast, toastHtml: toastHtml,
    backAvailable: backAvailable, backStep: backStep, goHome: goHome,
    registerBackModal: registerBackModal, registerBackPage: registerBackPage,
    dialog: dialog, sheet: sheet, roundBtn: roundBtn, chipRow: chipRow,
    optionList: optionList, pillHtml: pillHtml,
    fitPhone: fitPhone, bindPhone: bindPhone
  };
})(window);
