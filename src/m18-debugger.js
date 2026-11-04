/* M18 debugger — отладчик-наблюдатель (решения П1/П2, слово владельца 04.11;
   C-019: диагностика волны — 5 тапов по «Версия …»; C-021: процесс).
   Наблюдатель, не участник: продуктовые модули НЕ импортируют M18; он
   подписывается на шину «*» и читает реестр M00. Рубильники optional-модулей
   живут ТОЛЬКО здесь, состояние — в debug-ключе wt2-debug-v1 (не в продуктовом
   стейте и не в облачном паке).
   Перенос с донора v167 как спеки: openWaveDiag (оверлей-паспорт: UA WebView,
   живые слои .cat-wave — анимация/длительность/статус/сдвиг за секунду,
   сырые настройки воды; тап по фону = закрыть) и вход пятью тапами по
   .set-ver с окном 2500 мс; перед открытием — выход на главный (стакан с
   волной живёт там), задержка 400 мс. Рост по П1: журнал шины, паспорт
   модулей и хранов, рубильники, «собрать пакет для партнёра». */
(function (W) {
  "use strict";
  var JOURNAL_CAP = 400;
  var journal = [];
  var unhook = null;

  /* Журнал шины: всё, что пролетело через emit, последними JOURNAL_CAP. */
  function startJournal() {
    if (unhook || !W.WT2R) return;
    unhook = W.WT2R.on("*", function (m) {
      journal.push({ t: Date.now(), ev: m.ev, data: jsonSafe(m.data) });
      if (journal.length > JOURNAL_CAP) journal.splice(0, journal.length - JOURNAL_CAP);
    });
  }
  function getJournal() { return journal.slice(); }
  function jsonSafe(v) {
    if (v === undefined) return null;
    try {
      var seen = [];
      return JSON.parse(JSON.stringify(v, function (k, x) {
        if (x && typeof x === "object") { if (seen.indexOf(x) >= 0) return "[cycle]"; seen.push(x); }
        return x;
      }));
    } catch (e) { return String(v); }
  }

  /* Живые слои волны — донорская v167-диагностика дословно (сейчас узлов
     нет: волна приедет M06; функция меряет DOM, а не память). */
  function waveRows() {
    var rows = "";
    var nodes = document.querySelectorAll(".cat-wave");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i], cs = getComputedStyle(el);
      rows += "\nслой " + (i + 1) + " (" + el.className.replace("cat-wave ", "") + "):" +
        "\n  аним: " + cs.animationName + " / " + cs.animationDuration + " / " + cs.animationPlayState +
        "\n  живых: " + el.getAnimations().length +
        "\n  сдвиг0: " + cs.transform;
    }
    return { count: nodes.length, rows: rows };
  }
  function waveShift1() {
    var d = "";
    var ns = document.querySelectorAll(".cat-wave");
    for (var j = 0; j < ns.length; j++) d += "\nслой " + (j + 1) + " сдвиг1: " + getComputedStyle(ns[j]).transform;
    return d;
  }

  /* Храны: все ключи localStorage с размерами; продуктовые и debug помечены. */
  function storages() {
    var out = [], known = {};
    if (W.WT2K) {
      ["KEY", "LIQUID_KEY", "AVATAR_KEY", "PROBE_KEY"].forEach(function (n) {
        if (W.WT2K[n]) known[W.WT2K[n]] = n;
      });
    }
    if (W.WT2R && W.WT2R.DBG_KEY) known[W.WT2R.DBG_KEY] = "DBG";
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      var v = ""; try { v = localStorage.getItem(k) || ""; } catch (e) {}
      out.push({ key: k, bytes: v.length, role: known[k] || "" });
    }
    out.sort(function (a, b) { return b.bytes - a.bytes; });
    return out;
  }

  /* Паспорт — текст экрана (донорский формат + рост П1). */
  function passport(env) {
    var wave = waveRows();
    var cards = W.WT2R ? W.WT2R.cards() : {};
    var mods = "";
    Object.keys(cards).sort().forEach(function (id) {
      var c = cards[id];
      mods += "\n" + id + " сл." + c.layer + " [" + (c.contracts || []).join(",") + "]" +
        (c.optional ? " optional:" + (W.WT2R.isOn(id) ? "вкл" : "ВЫКЛ") : "");
    });
    var st = storages().map(function (s) {
      return "\n" + s.key + (s.role ? " (" + s.role + ")" : "") + ": " + s.bytes + " б";
    }).join("");
    var tail = journal.slice(-20).map(function (m) {
      return "\n" + new Date(m.t).toISOString().slice(11, 23) + " " + m.ev;
    }).join("");
    return "Отладчик Watertracker-next (M18)\nUA: " + navigator.userAgent +
      "\nэкран: " + window.innerWidth + "x" + window.innerHeight + " dpr " + (window.devicePixelRatio || 1) +
      "\nтема: " + (document.documentElement.getAttribute("data-theme") || "-") +
      "\n\nМОДУЛИ:" + mods +
      "\n\nХРАНЫ:" + st +
      "\n\nВОЛНА (C-019):\nслоёв волны: " + wave.count + wave.rows +
      "\nнастройки воды: " + (localStorage.getItem((W.WT2K && W.WT2K.LIQUID_KEY) || "cup-liquid-color-v1") || "null") +
      "\n\nЖУРНАЛ ШИНЫ (последние 20):" + tail +
      "\n\n(секунду спустя снизу допишется сдвиг слоёв; тап по фону = закрыть)";
  }

  /* Экран-оверлей: паспорт + рубильники optional (П2). Вид — донорский
     cssText v167 дословно. */
  function open(env) {
    startJournal();
    var old = document.getElementById("wt-diag");
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var ov = document.createElement("div");
    ov.id = "wt-diag";
    ov.style.cssText = "position:fixed;left:0;top:0;right:0;bottom:0;z-index:9999;" +
      "background:rgba(4,10,16,.94);color:#dcefff;padding:14px;overflow:auto;" +
      "font:11px/1.55 monospace;white-space:pre-wrap;word-break:break-all";
    var pre = document.createElement("pre");
    pre.style.cssText = "margin:0;font:inherit;white-space:inherit;word-break:inherit";
    pre.textContent = passport(env);
    ov.appendChild(pre);
    /* Рубильники — только optional-карточки реестра. */
    var toggles = document.createElement("div");
    toggles.style.cssText = "margin-top:10px;border-top:1px solid #2c5670;padding-top:8px;font:13px/2 system-ui,sans-serif";
    toggles.addEventListener("click", function (e) { e.stopPropagation(); });
    var cards = W.WT2R ? W.WT2R.cards() : {};
    Object.keys(cards).sort().forEach(function (id) {
      if (!cards[id].optional) return;
      var lab = document.createElement("label");
      lab.style.cssText = "display:block;cursor:pointer";
      var cb = document.createElement("input");
      cb.type = "checkbox"; cb.checked = W.WT2R.isOn(id);
      cb.dataset.module = id;
      cb.addEventListener("change", function () {
        W.WT2R.setOn(id, cb.checked);
        pre.textContent = passport(env);
        if (env && env.render) env.render();
      });
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(" " + id + " — " + (cards[id].file || "")));
      toggles.appendChild(lab);
    });
    ov.appendChild(toggles);
    ov.addEventListener("click", function () {
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      if (W.WT2R) W.WT2R.emit("debug:close", {});
    });
    document.body.appendChild(ov);
    if (W.WT2R) W.WT2R.emit("debug:open", {});
    setTimeout(function () {
      if (!document.getElementById("wt-diag")) return;
      pre.textContent += waveShift1();
    }, 1000);
    return ov;
  }

  /* Вход: пять тапов по «Версия …» (.set-ver) с окном 2500 мс — донор v167.
     Перед открытием выходим на главный: стакан с волной живёт там. */
  var verTaps = 0, verTapsT = 0;
  function bind(env) {
    startJournal();
    document.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest(".set-ver") : null;
      if (!t) { verTaps = 0; return; }
      var nowMs = Date.now();
      verTaps = (nowMs - verTapsT < 2500) ? verTaps + 1 : 1;
      verTapsT = nowMs;
      if (verTaps >= 5) {
        verTaps = 0;
        var sh = env && (typeof env.shell === "function" ? env.shell() : env.shell);
        if (sh && W.WT2U) {
          W.WT2U.goHome(sh, { render: env.render, closeSwipes: env.closeSwipes });
        } else {
          var homeTab = document.querySelector('[data-tab="home"]');
          if (homeTab) homeTab.click();
        }
        setTimeout(function () { open(env); }, 400);
      }
    }, true);
  }

  /* «Собрать пакет для партнёра» (П1): всё одним JSON. */
  function pack(env) {
    startJournal();
    var state = null;
    try { state = env && env.getState ? jsonSafe(env.getState()) : null; } catch (e) {}
    return {
      app: "watertracker-next", builtAt: new Date().toISOString(),
      passport: passport(env), journal: getJournal(), state: state,
      storages: storages(),
      dbg: localStorage.getItem(W.WT2R ? W.WT2R.DBG_KEY : "wt2-debug-v1") || null
    };
  }

  if (W.WT2R) W.WT2R.register({
    id: "M18", file: "m18-debugger.js", layer: 5, optional: true,
    contracts: ["C-019", "C-021"],
    events: ["debug:open", "debug:close"],
    status: "ported"
  });
  W.WT2G = {
    JOURNAL_CAP: JOURNAL_CAP, startJournal: startJournal, getJournal: getJournal,
    waveRows: waveRows, storages: storages, passport: passport,
    open: open, bind: bind, pack: pack
  };
})(window);
