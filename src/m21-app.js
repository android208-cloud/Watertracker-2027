/* M21 app-composer — тело приложения: экраны и поток действий, собранные
   из зелёных модулей (мини-спека утверждена словом владельца 04.11: первый
   APK «пьёт, считает и синхронизирует без котика»).
   Перенос с донора v158/v159 как спеки: render-оркестрация (4520), pageHome
   (2503: полоса C-008 самая верхняя, шапка с названием напитка, док — undo,
   drink-now, ярлыки, пилюля объёма), writeProfile (порция: credited один раз,
   C-002), undo (8325), apply-shortcut («Кот ещё не записал»), pageHistory +
   historyShell (график-окно, лента swipe-строк с дубль-меткой C-024, del-entry
   «Запись удалена»), pageVolumes (ledgerRows), свайп-механика (initSwipes/
   initSwipeTaps/closeOpenSwipes/SWIPE_W=120, подавление догоняющего клика),
   тема (resolvedTheme/applyTheme/meta theme-color), облако-транспорт
   (__googleCloud/__googleChunk/__googleRestoreDone/__googleToast, тишина
   C-015), alertsSync (дебаунс 350 мс → WaterAlerts.apply), вход онбординга
   (C-014). Отсутствует сознательно (приедет следующими модулями): кот и вода
   (M05–M09, сцена-заглушка), темы/папки настроек (M15), календарь, экран веса,
   погода/активность/чашка-тамогочи, избранные ярлыки-пины, барабаны (заменены
   чипами), chart-color (в доноре по умолчанию выключен — столбцы стопкой).
   Связи: вниз — все модули WT2*; вверх — никого (композитор последний). */
(function (W) {
  "use strict";
  var APP_VERSION = "2.0-next";
  var VERSION_CODE = 200;
  var SWIPE_W = 120;
  var VOLS = [50, 100, 150, 200, 250, 300, 330, 350, 400, 500, 700, 1000];
  var B_SLEEP = [30, 60, 90, 120];
  var KG_VALS = [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 110, 120, 130];
  var DAY_STARTS = ["00:00", "02:00", "03:00", "04:00", "05:00", "06:00"];
  var CAT_PLACEHOLDER = '<svg viewBox="0 0 8 8" width="40" height="40" aria-hidden="true"><circle cx="4" cy="4" r="3" fill="#888"/></svg>';

  /* Иконки напитков — донорская карта (173) дословно. */
  var DRINK_ICONS = {
    drop: "drop.svg", cup: "tea.svg", glass: "fruit_drink.svg", juice: "orange_juice.svg",
    takeaway: "coffee_cup.svg", mug: "coffee_mug.svg", bottle: "bottle.svg", milk: "milk.svg",
    sport: "shaker.svg", lemonade: "lemonade.svg", pill: "energy_drink.svg", cocktail: "cocktail.svg",
    wine: "wine.svg", beer: "beer.svg", energy: "energy_drink.svg", thermos: "water_bottle.svg",
    smoothie: "smoothie.svg", bubble: "soda.svg", teapot: "coffee_mug.svg", tea: "tea.svg",
    coffee_cup: "coffee_cup.svg", coffee_mug: "coffee_mug.svg", fruit_drink: "fruit_drink.svg",
    orange_juice: "orange_juice.svg", apple_juice: "apple_juice.svg", soda: "soda.svg",
    ice_tea: "ice_tea.svg", punch: "punch.svg", milk_carton: "milk_carton.svg",
    apple_juice_carton: "apple_juice_carton.svg", champagne: "champagne.svg", shaker: "shaker.svg",
    water_bottle: "water_bottle.svg", alcohol: "alcohol.svg", beer_barrels: "beer_barrels.svg",
    beer_bottles: "beer_bottles.svg", brandy: "brandy.svg", fiero_martini: "fiero_martini.svg",
    pineapple_cocktail: "pineapple_cocktail.svg", extra_dry_martini: "extra_dry_martini.svg",
    port_wine: "port_wine.svg", sake: "sake.svg", lemon_juice: "lemon_juice.svg",
    vodka: "vodka.svg", whiskey: "whiskey.svg"
  };

  var state = null;
  var ui = null;
  var suppressClick = false, suppressClickTimer = 0, swallowClickEl = null;
  var animToken = 0;
  var alertsTimer = 0;
  var cloud = { signedIn: false, ready: false, busy: false, pending: "", dirty: false,
    chunks: null, lastBackup: "", firstCopy: false, pendingSig: "", lastMergeAdded: 0 };

  /* ---- помощники (донорские спеки) ---- */
  function R() { return W.WT2R; }
  function C() { return W.WT2C; }
  function J() { return W.WT2J; }
  function D() { return W.WT2D; }
  function L() { return W.WT2L; }
  function S() { return W.WT2S; }
  function H() { return W.WT2H; }
  function P() { return W.WT2P; }
  function N() { return W.WT2N; }
  function Y() { return W.WT2Y; }
  function O() { return W.WT2O; }
  function U() { return W.WT2U; }
  function Wd() { return W.WT2W; }
  function Bc() { return W.WT2B; }
  function F() { return W.WT2F; }
  function K() { return W.UiKit; }
  function esc(s) { return U().esc(s); }
  function uiIcon(n) { return U().uiIcon(n); }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }
  function nowHM() { var d = new Date(); return pad2(d.getHours()) + ":" + pad2(d.getMinutes()); }
  function fmtShort(iso) { return iso.slice(8, 10) + "." + iso.slice(5, 7); }
  function fmtLong(iso) { return iso.slice(8, 10) + "." + iso.slice(5, 7) + "." + iso.slice(0, 4); }
  function fmtVol(ml) {
    if (ml < 1000) return ml + " мл";
    var l = ml / 1000;
    var txt = l >= 100 ? String(Math.round(l)) : String(Math.round(l * 10) / 10).replace(".", ",");
    return txt + " л";
  }
  /* Донор app.js:220 — имена рисунков пикера: напиток может хранить такое
     имя напрямую (например energy_drink), не входя в DRINK_ICONS. */
  var PICKER_ICONS = [
    "drop", "alcohol", "apple_juice", "beer_barrels", "beer",
    "beer_bottles", "brandy", "can", "champagne", "fiero_martini",
    "cocktail", "coffee_mug", "coffee_cup", "bottle", "energy_drink",
    "apple_juice_carton", "pineapple_cocktail", "lemonade", "extra_dry_martini", "milk_carton",
    "milk", "port_wine", "orange_juice", "punch", "shaker",
    "fruit_drink", "soda", "sake", "tea", "lemon_juice",
    "ice_tea", "wine", "vodka", "water_bottle", "whiskey"
  ];
  function glyph(name) {
    var file = DRINK_ICONS[name];
    if (!file && name && name.slice(-4) === ".svg") file = name;
    if (!file && name && DRINK_ICONS[name] == null && PICKER_ICONS.indexOf(name) >= 0) file = name + ".svg";
    if (!file) file = "drop.svg";
    return '<img class="drink-ico" src="assets/icons/' + file + '" data-svg-file="' + file + '" alt="">';
  }
  function bubble(d, size) {
    var dim = (size == null || size === 52) ? "var(--bubble, 52px)" : size + "px";
    var box = size === "fill" ? "" : "width:" + dim + ";height:" + dim + ";";
    return '<span class="bubble" style="background:' + d.color + ";" + box + '">' + glyph(d.icon) + "</span>";
  }
  function toast(text) { U().toast(ui, text, render); }
  function save() { C().save(); }
  function currentDrink() { return D().defaultDrink(state); }
  function latestEntryToday() {
    var today = N().waterToday(state);
    var best = null;
    (state.entries || []).forEach(function (e) {
      if (J().entryDay(state, e) !== today) return;
      if (!best || (e.createdAt || 0) >= (best.createdAt || 0)) best = e;
    });
    return best;
  }
  function shortcutViews() {
    var today = N().waterToday(state);
    var mapped = (state.entries || []).map(function (e) {
      var c = {}; Object.keys(e).forEach(function (k) { c[k] = e[k]; });
      c.date = J().entryDay(state, e);
      return c;
    });
    return L().shortcutsOf(mapped, state.drinks, today).map(function (s) {
      return { drink: D().drinkById(state, s.drinkId), volume: s.volume };
    }).filter(function (s) { return s.drink; });
  }
  function dupDayKeys(selected) {
    var counts = {};
    J().dayEntries(state, selected).forEach(function (e) {
      var k = J().entryKey(e); counts[k] = (counts[k] || 0) + 1;
    });
    var out = {};
    Object.keys(counts).forEach(function (k) { if (counts[k] > 1) out[k] = true; });
    return out;
  }

  /* ---- тема (донор 1810–1830) ---- */
  function resolvedTheme() {
    if (state.theme === "light" || state.theme === "dark" || state.theme === "oneplus") return state.theme;
    var dark = true;
    try { dark = !(window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches); } catch (e) {}
    return dark ? "dark" : "light";
  }
  function applyTheme() {
    var mode = resolvedTheme();
    document.documentElement.setAttribute("data-theme", mode);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", mode === "light" ? "#f1f2f4" : mode === "oneplus" ? "#000000" : "#2c2d32");
    if (W.WT2X) W.WT2X.syncBars();
  }

  /* ---- напоминания в оболочку (донор 3461: дебаунс 350 мс) ---- */
  function alertsSync() {
    if (alertsTimer) return;
    alertsTimer = setTimeout(function () {
      alertsTimer = 0;
      var bridge = window.WaterAlerts;
      if (!bridge || typeof bridge.apply !== "function") return;
      try { bridge.apply(JSON.stringify(N().alertsPayload(state))); } catch (e) {}
    }, 350);
  }

  /* ---- облако-транспорт (донор 1233+, тишина C-015) ---- */
  function cloudFrom(s) {
    cloud.signedIn = !!(s && s.signedIn);
    cloud.lastBackup = (s && (s.at || s.lastBackup)) || "";
  }
  function cloudRead() {
    if (!(window.WaterGoogle && typeof window.WaterGoogle.state === "function")) return;
    try { cloudFrom(JSON.parse(window.WaterGoogle.state() || "{}")); } catch (e) {}
  }
  function cloudUpload(mode) {
    if (!(window.WaterGoogle && typeof window.WaterGoogle.backup === "function")) {
      toast("Облако: вход через Google доступен в приложении Android");
      return;
    }
    var pack = Y().exportPack(state);
    cloud.pendingSig = Y().cloudPackSign(pack);
    cloud.pending = mode;
    cloud.busy = true;
    window.WaterGoogle.backup(JSON.stringify(pack));
  }
  function cloudApply() {
    var text = (cloud.chunks || []).join("");
    cloud.chunks = null;
    var pack = null;
    try { pack = JSON.parse(text); } catch (e) { pack = null; }
    var mode = cloud.pending || "auto";
    cloud.pending = "";
    if (!pack) { if (mode !== "auto" && mode !== "quiet") toast("Облако: копия не прочиталась"); render(); return; }
    var res = Y().applyPack(state, pack, mode === "sync" ? "merge" : "auto", {});
    if (res && res.ok) {
      state.cloudSig = Y().cloudPackSign(pack);
      cloud.lastMergeAdded = res.added || 0;
      save();
      if (mode === "sync") { cloudUpload("sync"); return; }
      var txt = Y().cloudSay("auto", res.added || 0, (state.entries || []).length);
      if (txt) toast(txt);
    } else if (mode === "sync") toast("Облако: копия не подошла");
    render();
  }
  W.__googleCloud = function (json) {
    cloud.busy = false;
    var o = json || {};
    if (typeof o === "string") { try { o = JSON.parse(o); } catch (e) { o = {}; } }
    var mode = cloud.pending || "";
    cloud.pending = "";
    if (o.empty) {
      cloud.ready = true;
      if (mode !== "restore" && state.entries && state.entries.length) {
        cloud.firstCopy = true;
        cloudUpload(mode || "manual");
        return;
      }
      toast("В облаке ещё нет копии истории");
      render();
      return;
    }
    if (o.ok && o.action === "backup") {
      cloud.ready = true;
      cloud.dirty = false;
      if (cloud.pendingSig) { state.cloudSig = cloud.pendingSig; cloud.pendingSig = ""; }
      if (o.at) state.cloudStamp = o.at;
      var added = cloud.lastMergeAdded || 0;
      cloud.lastMergeAdded = 0;
      save();
      if (cloud.firstCopy) {
        cloud.firstCopy = false;
        toast("Копия сохранена в Google Диск: " + state.entries.length + " записей");
        render();
        return;
      }
      if (mode !== "quiet") {
        var txt = Y().cloudSay(mode, added, (state.entries || []).length);
        if (txt) toast(txt);
      }
      render();
      return;
    }
    if (!o.ok) {
      var soft = !!o.quiet || !mode || mode === "quiet" || mode === "auto" || o.action === "check";
      if (!soft) toast("Облако: " + (o.error || "не получилось"));
    }
    render();
  };
  W.__googleChunk = function (i, parts, text) {
    if (!cloud.chunks) cloud.chunks = [];
    cloud.chunks[i] = text || "";
  };
  W.__googleRestoreDone = function () { cloudApply(); };
  W.__googleToast = function (text) { if (text) toast(String(text)); };

  /* ---- свайп-механика ленты (донор 7650–7745 дословно) ---- */
  function suppressNextClick(ms) {
    suppressClick = true;
    if (suppressClickTimer) clearTimeout(suppressClickTimer);
    suppressClickTimer = setTimeout(function () { suppressClick = false; suppressClickTimer = 0; },
      Number(ms) > 0 ? Number(ms) : 300);
  }
  function closeOpenSwipes(except) {
    document.querySelectorAll(".swipe.open").forEach(function (sw) {
      if (except && sw.contains(except)) return;
      sw.classList.remove("open");
      var front = sw.querySelector(".swipe-front");
      if (front) front.style.transform = "";
      if (ui.openSwipe === sw.dataset.sid) ui.openSwipe = null;
    });
  }
  function initSwipeTaps() {
    document.querySelectorAll(".swipe-actions button[data-act]").forEach(function (btn) {
      if (btn.dataset.tapBound) return;
      btn.dataset.tapBound = "1";
      var sx = 0, sy = 0, moved = false;
      btn.addEventListener("pointerdown", function (e) { sx = e.clientX; sy = e.clientY; moved = false; });
      btn.addEventListener("pointermove", function (e) {
        if (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10) moved = true;
      });
      btn.addEventListener("pointerup", function (e) {
        if (moved) return;
        if (e.button != null && e.button !== 0) return;
        var act = btn.dataset.act;
        if (!act) return;
        swallowClickEl = btn;
        suppressNextClick(400);
        performAction(btn, act);
      });
    });
  }
  function initSwipes() {
    document.querySelectorAll(".swipe").forEach(function (sw) {
      var row = sw.querySelector(".swipe-front");
      if (!row) return;
      var startX = null, startY = null, base = 0, dx = 0, lock = null;
      row.addEventListener("pointerdown", function (e) {
        if (e.target.closest(".swipe-actions")) return;
        startX = e.clientX; startY = e.clientY;
        base = sw.classList.contains("open") ? -SWIPE_W : 0;
        dx = 0; lock = null;
      });
      row.addEventListener("pointermove", function (e) {
        if (startX == null) return;
        var mx = e.clientX - startX, my = e.clientY - startY;
        if (!lock) {
          if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
          lock = Math.abs(mx) > Math.abs(my) ? "x" : "y";
          if (lock === "y") { startX = null; return; }
        }
        if (lock !== "x") return;
        dx = Math.max(-SWIPE_W, Math.min(0, base + mx));
        row.style.transform = "translateX(" + dx + "px)";
      });
      function finishSwipe() {
        if (lock === "x") {
          var open = dx < -56;
          sw.classList.toggle("open", open);
          row.style.transform = open ? "translateX(-" + SWIPE_W + "px)" : "";
          ui.openSwipe = open ? sw.dataset.sid : null;
          document.querySelectorAll(".swipe").forEach(function (other) {
            if (other !== sw) {
              other.classList.remove("open");
              var f = other.querySelector(".swipe-front");
              if (f) f.style.transform = "";
            }
          });
          if (Math.abs(dx - base) > 8) { suppressNextClick(300); swallowClickEl = row; }
        }
        startX = null; lock = null;
      }
      row.addEventListener("pointerup", finishSwipe);
      row.addEventListener("pointercancel", finishSwipe);
    });
  }

  /* ---- график (донор 2589–2690: окно столбцов, полосы цели) ---- */
  function buildChart(selected) {
    var today = N().waterToday(state);
    var bars = S().bars(state, today);
    var scale = H().scaleOf(bars);
    bars.forEach(function (b) { b.goalPx = H().goalPxOf(b, scale); });
    var w = H().windowInit(bars, selected, ui.chartLeft);
    var bands = H().bandsHtml(bars);
    /* Кэш окна — механика донора: прокрутка растит окно и пересчитывает
       масштаб по видимым столбцам без пересборки экрана (C-004). */
    ui.histBars = bars; ui.histWin = w; ui.histBands = bands;
    return H().rowHtml(bars, w, scale, selected, bands);
  }
  /* ---- живой график и свайпы донора (байт-порт app.js: calendarIcon 3997,
     layoutHistoryBar 4664, fitHistoryChart 4696, onHistoryChartScroll 4747,
     growHistoryChart 2730, viewScale 9822, initXScroll 9832, initWeightSwipe
     9736; адаптации: H()/N() модули, today вместо todayStr) ---- */
  function calendarIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.2" y="4.6" width="17.6" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3.2 9.2h17.6M8 3v3.4M16 3v3.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  }

  function viewScale() {
    var app = document.getElementById("app");
    if (!app) return 1;
    var tr = getComputedStyle(app).transform;
    if (!tr || tr === "none") return 1;
    var m = tr.match(/matrix\(([^,]+)/);
    var s = m ? parseFloat(m[1]) : 1;
    return s > 0 ? s : 1;
  }

  function layoutHistoryBar(bar, px) {
    bar.style.height = px + "px";
    var parts = bar.querySelectorAll("i");
    if (!parts.length || px <= 0) return;
    var raws = [];
    var sum = 0;
    for (var i = 0; i < parts.length; i++) {
      var r = Number(parts[i].getAttribute("data-raw")) || 0;
      raws.push(r);
      sum += r;
    }
    if (!sum) return;
    var hs = raws.map(function (r) { return Math.floor(r / sum * px); });
    var used = 0;
    hs.forEach(function (h) { used += h; });
    var rest = px - used;
    var order = raws.map(function (_, i) { return i; }).sort(function (a, b) { return raws[b] - raws[a]; });
    for (var ri = 0; rest > 0; ri++) { hs[order[ri % order.length]] += 1; rest--; }
    var top = 0;
    for (var si = 0; si < parts.length; si++) {
      if (hs[si] <= 0) {
        parts[si].style.display = "none";
        continue;
      }
      parts[si].style.display = "block";
      var extra = si < parts.length - 1 ? 1 : 0;
      parts[si].style.top = top + "px";
      parts[si].style.height = (hs[si] + extra) + "px";
      top += hs[si];
    }
  }

  function fitHistoryChart() {
    var sc = document.querySelector(".chart-scroll");
    if (!sc || !sc.clientWidth) return;
    var cols = sc.querySelectorAll(".col");
    if (!cols.length) return;
    var colW = 82;
    var plotH = 146;
    var dateArea = 36;
    var n = cols.length;
    var row = sc.querySelector(".chart-row");
    var rowW = row ? row.scrollWidth : n * colW;
    var ls = row ? row.querySelector(".chart-spacer.l") : null;
    var packLeft = ls ? ls.offsetWidth : Math.max(0, rowW - n * colW);
    var viewLeft = sc.scrollLeft;
    var viewRight = viewLeft + sc.clientWidth;
    var maxVal = 0;
    var any = false;
    for (var i = 0; i < n; i++) {
      var left = packLeft + i * colW;
      var overlap = Math.min(left + colW, viewRight) - Math.max(left, viewLeft);
      if (overlap < 8) continue;
      any = true;
      var raw = Number(cols[i].getAttribute("data-raw")) || 0;
      var goal = Number(cols[i].getAttribute("data-goal")) || 0;
      if (raw > maxVal) maxVal = raw;
      if (goal > maxVal) maxVal = goal;
    }
    if (!any) return;
    var scale = Math.max(maxVal, 1);
    if (sc._chartScale === scale) return;
    sc._chartScale = scale;
    for (var c = 0; c < n; c++) {
      var col = cols[c];
      var colRaw = Number(col.getAttribute("data-raw")) || 0;
      var colGoal = Number(col.getAttribute("data-goal")) || 0;
      var goalPx = Math.round(colGoal / scale * plotH);
      var px = colRaw > 0 ? Math.max(2, Math.round(colRaw / scale * plotH)) : 0;
      var bar = col.querySelector(".bar");
      if (bar) layoutHistoryBar(bar, px);
      var label = col.querySelector(".bar-label");
      if (label) label.style.bottom = (label.classList.contains("on-line") ? goalPx : px + 18) + "px";
    }
    var marks = sc.querySelectorAll(".chart-below, .goal-line");
    for (var m = 0; m < marks.length; m++) {
      var el = marks[m];
      var g = Number(el.getAttribute("data-goal")) || 0;
      var h = dateArea + Math.round(g / scale * plotH);
      if (el.classList.contains("chart-below")) el.style.height = h + "px";
      else el.style.bottom = h + "px";
    }
  }

  var chartFitRaf = 0;
  function onHistoryChartScroll() {
    var sc0 = document.querySelector(".chart-scroll");
    if (sc0 && sc0._restoreGuard) return;
    if (chartFitRaf) return;
    chartFitRaf = requestAnimationFrame(function () {
      chartFitRaf = 0;
      growHistoryChart();
      fitHistoryChart();
    });
  }

  function growHistoryChart() {
    var sc = document.querySelector(".chart-scroll");
    if (!sc || !sc.clientWidth || !ui.histWin || !ui.histBars) return;
    var bars = ui.histBars;
    var n = bars.length;
    var w = ui.histWin;
    var v0 = Math.max(0, Math.floor(sc.scrollLeft / 82) - 8);
    var v1 = Math.min(n, Math.ceil((sc.scrollLeft + sc.clientWidth) / 82) + 8);
    if (v0 >= w.from && v1 <= w.to) return;
    w.from = Math.min(w.from, v0);
    w.to = Math.max(w.to, v1);
    var row = sc.querySelector(".chart-row");
    if (!row) return;
    var cols = "";
    for (var i = w.from; i < w.to; i++) cols += H().colHtml(bars[i], 1, ui.historyDate);
    var leftW = w.from * 82;
    var rightW = (n - w.to) * 82;
    row.innerHTML = ui.histBands +
      (leftW ? '<div class="chart-spacer l" style="width:' + leftW + 'px"></div>' : "") + cols +
      (rightW ? '<div class="chart-spacer r" style="width:' + rightW + 'px"></div>' : "");
    sc._chartScale = 0;
  }

  function initXScroll() {
    document.querySelectorAll(".xscroll, .chart-scroll").forEach(function (el) {
      var startX = null;
      var startLeft = 0;
      var moved = false;
      el.addEventListener("pointerdown", function (e) {
        if (e.pointerType === "touch") return;
        startX = e.clientX;
        startLeft = el.scrollLeft;
        moved = false;
      });
      el.addEventListener("pointermove", function (e) {
        if (startX == null || e.pointerType === "touch") return;
        var dx = e.clientX - startX;
        if (Math.abs(dx) > 5) {
          moved = true;
          el.scrollLeft = startLeft - dx;
          e.preventDefault();
        }
      });
      el.addEventListener("pointerup", function () {
        if (moved) {
          suppressNextClick(120);
        }
        startX = null;
      });
      el.addEventListener("pointercancel", function () { startX = null; });
      el.addEventListener("wheel", function (e) {
        if (el.scrollWidth <= el.clientWidth + 2) return;
        if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
          el.scrollLeft += e.deltaY / viewScale();
          e.preventDefault();
        }
      }, { passive: false });
    });
  }

  function initWeightSwipe() {
    var view = document.querySelector(".w-swipe");
    var track = document.querySelector(".w-track");
    if (!view || !track) return;
    function width() { return view.clientWidth || 412; }
    track.style.transform = "translateX(" + (-width()) + "px)";
    var active = false;
    var x = 0;
    var y = 0;
    var dx = 0;
    var dy = 0;
    var pid = null;
    var mode = "";
    function onDown(e) {
      if (e.button != null && e.button !== 0) return;
      active = true;
      x = e.clientX;
      y = e.clientY;
      dx = 0;
      dy = 0;
      mode = "";
      pid = e.pointerId;
      track.style.transition = "none";
      track.style.transform = "translateX(" + (-width()) + "px)";
      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    }
    function onMove(e) {
      if (!active || e.pointerId !== pid) return;
      dx = e.clientX - x;
      dy = e.clientY - y;
      if (!mode && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) mode = Math.abs(dx) > Math.abs(dy) * 1.15 ? "x" : "y";
      if (mode !== "x") return;
      if (e.cancelable) e.preventDefault();
      track.style.transform = "translateX(" + (-width() + dx / viewScale()) + "px)";
    }
    function onUp(e) {
      if (!active || (e && e.pointerId != null && e.pointerId !== pid)) return;
      active = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      var w = width();
      if (mode === "x" && Math.abs(dx) > 48) {
        suppressNextClick(300);
        var dir = dx < 0 ? 1 : -1;
        var today = N().wallToday();
        var nextAnchor = H().shiftPeriod(ui.weightRange || "year", ui.weightAnchor || today, dir, today);
        var bounce = function () {
          track.style.transition = "transform .2s ease";
          track.style.transform = "translateX(" + (-w) + "px)";
        };
        if (nextAnchor > today) {
          /* Будущее закрыто (v83): дорожка возвращается на место. */
          bounce();
          return;
        }
        if (dir === -1) {
          /* v84 (владелец 25.10): прошлое ограничено периодом, в котором есть
             первый замер. Замеров нет — назад не листается вовсе. */
          var oldest = "";
          (state.weights || []).forEach(function (x) {
            if (x && x.date && (!oldest || x.date < oldest)) oldest = x.date;
          });
          if (!oldest) { bounce(); return; }
          var winBack = H().weightWindow(ui.weightRange || "year", nextAnchor, today);
          if (winBack.end < oldest) { bounce(); return; }
        }
        track.style.transition = "transform .24s ease";
        track.style.transform = "translateX(" + (-w - dir * w) + "px)";
        ui.weightAnchor = nextAnchor;
        var token = animToken;
        setTimeout(function () {
          if (animToken !== token) return;
          render();
        }, 250);
        return;
      }
      track.style.transition = "transform .2s ease";
      track.style.transform = "translateX(" + (-w) + "px)";
    }
    view.addEventListener("pointerdown", onDown);
  }


  /* ---- экраны ---- */
  function pageHome() {
    var drink = currentDrink();
    var today = N().waterToday(state);
    var st = S().dayStats(state, today);
    var goal = st.goal, drunk = st.volume;
    var level = goal > 0 ? drunk / goal : 0;
    var rampB = W.WT2B ? W.WT2B.ramp(state, today) : { flat: true, top: null, colors: null };
    var fill = Math.max(0, Math.min(1, level)) * 100;
    var mr = L().catMood(state, today, N().wallMsNow());
    if (mr.soft && state._softDay !== today) {
      state._softDay = today;
      save();
      toast("Цель перевыполнена — отличный результат!");
    }
    var cuts = shortcutViews();
    var slots = "";
    for (var j = 0; j < L().SHORTCUT_LIMIT; j++) {
      var s = cuts[j];
      if (!s) continue;
      var cutOn = s.drink.id === drink.id && s.volume === state.profile.volume;
      slots += '<button type="button" class="shortcut' + (cutOn ? " on" : "") + '" style="--c:' + j + ';--r:1;--ring:' + s.drink.color + '" data-act="apply-shortcut" data-id="' + s.drink.id + '" data-volume="' + s.volume + '">' +
        bubble(s.drink, "fill") + '<span class="vol">' + s.volume + "</span></button>";
    }
    var hint = "";
    if (!cuts.length) hint = '<p class="hint dock-hint">Ярлыки появятся из истории. Пример — в настройках.</p>';
    /* Кожа шага 1 (слово владельца 06.11 «интерфейс = прототип без кота»):
       разметка главной — дословно донор app.js 2503–2573. Исключения: в слоте
       кота — круг с жидкостью (M06/M08, тап пишет порцию, как тап кота);
       значок пилюли — капля вместо miniCat (класс mini-cat сохранён: им
       светлая тема отбеливает лицо на голубой пилюле, C-007). Места чашки,
       погоды, активности и избранного ряда пусты и невидимы до своих модулей
       (правило 05.11), геометрию дока держит донорская сетка --c/--r. */
    return "" +
      /* v141: строка с полосой прогресса — самая верхняя на главном экране. */
      '<div class="top home-bar-top"><div class="progress' + (mr.soft ? " soft" : "") + '"><div class="fill" style="width:' + fill + '%"></div><div class="label">' + drunk + "/" + goal + "</div></div></div>" +
      K().header({ ui: "home", title: esc(drink ? drink.name : "") }) +
      '<div class="home-body">' +
      '<div class="cat-stage"><button type="button" class="wt-orb" data-act="add-profile" aria-label="Записать ' + esc(drink ? drink.name : "") + " " + state.profile.volume + ' мл">' +
      Wd().waterHtml({ frac: level, color: Bc().visibleColor() || (rampB.flat ? Wd().liquidColor(state) : rampB.top),
        rampColors: rampB.flat ? null : (Bc().visibleRamp() || rampB.colors),
        belts: rampB.flat ? null : (rampB.belts.map(function (bl, i) {
          var vc = Bc().visibleBelts();
          return { c: (vc && vc[i]) || bl.c, from: bl.from, to: bl.to };
        })),
        spanPct: Bc().beltSpanPct(Wd().visible() == null ? Wd().liftPct(level) : Wd().visible()),
        liftPct: Wd().visible() }) +
      Wd().orbRing + "</button></div>" +
      '<div class="home-dock">' +
      hint +
      '<button type="button" class="round" style="--c:0;--r:0" data-act="undo" aria-label="Отменить последнюю запись">' + uiIcon("undo") + "</button>" +
      '<button type="button" class="round drink-now" style="--c:5;--r:0;background:' + (drink ? drink.color : "#2ea0ea") + '" data-act="open-drinks" aria-label="Выбор напитка: ' + esc(drink ? drink.name : "") + '">' + (drink ? glyph(drink.icon) : "") + "</button>" +
      slots +
      /* Правило пилюли (слово владельца 05.11): значок — в центре левой
         окружности; слот лица дока dona принимает классы mini-cat/mini-cup,
         ими же светлая тема отбеливает лицо на голубой пилюле (C-007). */
      U().pillHtml({ slot: { c: 0, r: 2 }, act: "open-volume", icon: uiIcon("drop").replace('class="ui-mask"', 'class="ui-mask mini-cat"'), label: state.profile.volume + " мл" }) +
      "</div></div>";
  }

  function pageHistory() {
    var today = N().waterToday(state);
    if (!ui.historyDate) {
      var last = "";
      (state.entries || []).forEach(function (e) {
        var d = J().entryDay(state, e);
        if (d <= today && d > last) last = d;
      });
      ui.historyDate = last || today;
    }
    var selected = ui.historyDate;
    var dkeys = dupDayKeys(selected);
    var rows = J().dayEntries(state, selected).map(function (e) {
      return K().swipeRow({
        ui: "entry", sid: "e-" + e.id,
        actions: [
          { act: "edit-entry", id: e.id, aria: "Изменить", icon: uiIcon("pencilMask") },
          { act: "del-entry", id: e.id, cls: "danger", aria: "Удалить", icon: uiIcon("trash") }
        ],
        front: '<div class="swipe-front entry"><span class="who"><span class="htime">' + esc(e.time) + '</span><span class="hname">' + esc(e.name) +
          (dkeys[J().entryKey(e)] ? '<span class="dupe-tag">Дубль</span>' : "") +
          '</span></span><span class="hvol">' + e.volume + ' мл</span><span class="hcred">(' + uiIcon("drop") + "<span>" + e.credited + " мл</span>)</span></div>"
      });
    }).join("");
    if (!rows) rows = '<div class="empty">Нет записей</div>';
    return "" +
      /* Верх истории — как на образце владельца 06.11 (донор-спека): заголовок
         влево на серой полосе, справа круглая стрелка-шевроон в «Объёмы». */
      K().header({ ui: "history", cls: "top plain", title: "История и статистика",
        right: U().roundBtn({ ui: "volumes-open", role: "head", side: "right", act: "open-volumes", aria: "Объёмы напитков", icon: uiIcon("chevron") }) }) +
      '<div class="chart-panel"><div class="chart-scroll"><div class="chart-row">' + buildChart(selected) + "</div></div></div>" +
      '<div class="hist-head"><span class="hist-ico" aria-hidden="true">' + uiIcon("restore") + '</span><span>История</span><span class="grow"></span>' +
      '<button type="button" class="hist-date" data-act="open-cal-hist" aria-label="Открыть календарь и перейти к дню">' + fmtLong(selected) + '<span class="hist-cal-ico" aria-hidden="true">' + calendarIcon() + "</span></button></div>" +
      '<div class="hist-list">' + rows + "</div>";
  }

  function pageVolumes() {
    var rows = L().ledgerRows(state.entries, state.drinks);
    var total = 0;
    rows.forEach(function (r) { total += r.volume; });
    var list = rows.map(function (r) {
      return K().row({ ui: "volume", baseCls: "drow", cls: "vol-row", nameClass: "name",
        lead: bubble({ color: r.color, icon: r.icon }), title: esc(r.name),
        right: '<span class="pct">' + fmtVol(r.volume) + "</span>" });
    }).join("");
    if (!list) list = '<div class="empty">Нет записей</div>';
    return K().header({ ui: "volumes", cls: "top plain sub", back: uiIcon("back"), title: "Объёмы" }) +
      '<div class="vol-list"><div class="vol-total">Всего ' + fmtVol(total) + ".</div>" + list + "</div>";
  }

  /* Напитки — кожа донора (app.js 3688–3723): шапка без «plain», ряд
     недавних объёмов (recentVolumeRow), строки drow с процентом справа.
     Сортировка, свайп-правки и «Добавить напиток» — пустые невидимые места
     до модуля создания напитка (правило 05.11). */
  function pageDrinks() {
    var selectedVol = ui.drinkReturn === "history" && ui.addDraft ? ui.addDraft.volume : state.profile.volume;
    /* withWaterDay донора (380): сутки от dayStart — дата записи через entryDay. */
    var ents = (state.entries || []).map(function (e) {
      var dd = J().entryDay(state, e);
      return dd === e.date ? e : Object.assign({}, e, { date: dd });
    });
    var vols = L().recentVolumes(ents, N().waterToday(state), selectedVol, 8);
    var volRow = K().chipRow({ cls: "vol-pick", values: vols, selected: selectedVol, act: "pick-recent-volume", ui: "recent" });
    var rows = (state.drinks || []).map(function (d) {
      return K().row({ ui: "drink", baseCls: "drow", act: "pick-drink", data: { id: d.id }, nameClass: "name",
        lead: bubble(d), title: esc(d.name), right: '<span class="pct">' + d.hydration + "%</span>" });
    }).join("");
    return K().header({ ui: "drinks", back: uiIcon("back"), title: "Выбор напитка" }) + volRow + rows;
  }

  var alertAudio = null;
  function playAlertSound(file) {
    /* Донор app.js: мост WaterAlerts.preview, иначе Web Audio из assets/sounds. */
    var bridge = window.WaterAlerts;
    if (bridge && typeof bridge.preview === "function") {
      try { bridge.preview(file); return; } catch (e) {}
    }
    try {
      if (alertAudio) { alertAudio.pause(); alertAudio = null; }
      var a = new Audio("assets/sounds/" + file);
      alertAudio = a;
      a.volume = 0.9;
      var p = a.play();
      if (p && p.catch) p.catch(function () { toast("Звук не проигрался — проверьте громкость"); });
    } catch (e) {}
  }

  function pageAlertSound() {
    /* Донор settings-ui.js 866-879: строки мелодий с прослушиванием. */
    var n = N().ensureAlerts(state);
    var play = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.6v12.8L18.4 12z" fill="currentColor"/></svg>';
    var rows = N().ALERT_SOUNDS.map(function (snd) {
      var on = n.sound === snd.file;
      return K().row({ ui: "sound",
        tag: "div", cls: "sound-row" + (on ? " on" : ""), act: "pick-sound", data: { file: snd.file },
        title: esc(snd.title), sub: on ? "выбран" : "нажмите, чтобы выбрать",
        right: '<button type="button" class="sound-play" data-act="play-sound" data-file="' + snd.file + '" aria-label="Прослушать">' + play + "</button>",
        check: true, on: on, tick: uiIcon("tick")
      });
    }).join("");
    return K().header({ ui: "alert-sound", cls: "top plain sub", back: uiIcon("back"), title: "Звук уведомления" }) +
      rows +
      '<p class="wake-note">Мелодия звучит в напоминаниях, когда приложение закрыто. В приложении Android звук можно поменять и в системных настройках уведомлений.</p>';
  }

  /* Уведомления — каркас кожи донора (settings-ui.js alertsBody, ветка
     «без модели раскладки»: фиксированный порядок, разделы ALR_SECTIONS,
     строки-кубы донора, подсказки-абзацы при своих строках). Пустые места до
     модуля папок уведомлений: тексты, проверка, страницы периода и привычки;
     «Период уведомлений» читальный, правка частоты — в строке «Частота». */
  function pageAlerts() {
    var n = N().ensureAlerts(state);
    var win = N().dayWindow(state, N().weekdayIndex(N().wallToday()));
    var per = P().isPace(n) ? "Темп (самоадаптивный)" : "каждые " + P().freqLabel(n.everyMin);
    var hab = null;
    try {
      if (W.HabitSchedule && W.HabitSchedule.computeProfile) {
        hab = W.HabitSchedule.computeProfile(state.entries || [], {
          dayStart: state.dayStart || "02:00", afterWakeMin: n.afterWakeMin,
          beforeSleepMin: n.beforeSleepMin, todayIso: N().wallToday()
        });
      }
    } catch (e) {}
    function sSwitch(title, key, on) {
      return K().row({ ui: "sw-" + key, kind: "switch", cls: "switch-row", title: title, key: key, on: !!on, tick: uiIcon("tick") });
    }
    return K().header({ ui: "folder-alerts", cls: "top plain sub", back: uiIcon("back"), title: "Уведомления" }) +
      '<div class="n-section">Необходимые разрешения</div>' +
      sSwitch("Присылать напоминания, когда норма уже выпита", "whenGoalMet", n.whenGoalMet) +
      sSwitch("Присылать напоминания, даже если недавно пили воду", "evenIfRecent", n.evenIfRecent) +
      '<p class="hint">Включено — слоты каждые N от начала периода активности. Выключено — каждые N после последнего приёма.</p>' +
      sSwitch("Не гасить напоминание, пока не добавлена порция", "holdUntilDrink", n.holdUntilDrink !== false) +
      '<p class="hint">Уведомление переживёт вход в приложение и уйдёт из шторки, когда запишете порцию.</p>' +
      '<div class="n-section">Настройки уведомлений</div>' +
      K().row({ ui: "alert-sound", title: "Звук уведомления", sub: esc(N().alertSoundTitle(n.sound)), act: "open-alert-sound" }) +
      sSwitch("Вибрация", "alertVibrate", n.vibrate !== false) +
      K().row({ ui: "sys-note", title: "Системные настройки", sub: "Звук, вибрация и приоритет в Android" }) +
      K().row({ ui: "alert-period", title: "Период уведомлений", sub: esc(win) }) +
      (hab && W.HabitSchedule.subLabel ? K().row({ ui: "alert-habit", title: "Расписание по привычке", sub: W.HabitSchedule.subLabel(hab, esc) }) : "") +
      K().row({ ui: "alert-freq", title: "Частота", sub: esc(per), act: "open-alert-freq" }) +
      sSwitch("Включить уведомления", "alertOn", n.enabled);
  }

  /* Настройки — каркас кожи донора (settings-ui.js pageSettings: шапка
     «top plain», секции n-section дефолтной раскладки settings-model.js —
     «Мой профиль», «Личные настройки», «Основные настройки», версия прибита
     внизу). Пустые невидимые места до своих модулей: раскладка строк,
     «Внешний вид», «Дополнительно», единицы, пол, начало суток, активность,
     норма воды. Заявленные временные placements (переедут в свои модули):
     строка темы — в доноре внутри «Внешнего вида»; секция «Перенос данных» —
     в доноре внутри «Дополнительно». Профиль — куб донора profile-row. */
  function pageSettings() {
    var n = N().ensureAlerts(state);
    var THEME_NAMES = { light: "Светлая тема", dark: "Тёмная тема", system: "По умолчанию" };
    /* Кубы донора (settings-ui.js customRows): гостевой аватар и стрелки синка. */
    var guest = '<span class="guest-ava" aria-hidden="true"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#8b9198"/><path d="M24 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M12.5 36.5c1.8-6 6-8.6 11.5-8.6s9.7 2.6 11.5 8.6" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg></span>';
    var syncIco = '<span class="set-sync' + (cloud.busy ? " spinning" : "") + '" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 0 1-13.5 5.8L4 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4 12a8 8 0 0 1 13.5-5.8L20 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M20 4v4h-4M4 20v-4h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
    function nLine(title, sub, extra, act, cls) {
      var tag = act ? "button" : "div";
      return "<" + tag + ' class="n-row' + (cls ? " " + cls : "") + '"' +
        (act ? ' type="button" data-act="' + act + '"' : "") + '><span class="ttl">' +
        title + (sub ? "<small>" + sub + "</small>" : "") + "</span>" + (extra || "") + "</" + tag + ">";
    }
    var profileRow = cloud.signedIn
      ? K().row({ ui: "profile", cls: "profile-row", act: "cloud-sign", lead: guest, title: "Google: вход выполнен", sub: "нажмите, чтобы выйти" })
      : K().row({ ui: "profile", cls: "profile-row", act: "cloud-needapp", lead: guest, title: "Войти через Google", sub: "доступно в приложении для Android" });
    var syncRow = cloud.signedIn
      ? nLine("Синхронизация", cloud.lastBackup ? '<span class="sync-when">копия ' + esc(String(cloud.lastBackup)) + "</span>" : "", syncIco, "cloud-sync")
      : "";
    /* Донор settings-ui.js:242 — ярлык двери без префикса «каждые». */
    var alertsDoorSub = n.enabled ? esc(P().freqLabel(n.everyMin)) : "выключены";
    var wSorted = (state.weights || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    var curKg = wSorted.length ? wSorted[wSorted.length - 1].kg : state.weightKg;
    return '<header class="top plain"><h1>Настройки</h1></header>' +
      '<div class="n-section">Мой профиль</div>' +
      profileRow + syncRow +
      (cloud.signedIn ? K().row({ ui: "cloud-save", title: "Сохранить копию", sub: "отправить текущие данные на Диск", act: "cloud-save" }) : "") +
      K().row({ ui: "set-open-folder-alerts", title: "Уведомления", sub: alertsDoorSub, act: "open-folder-alerts" }) +
      '<div class="n-section">Личные настройки</div>' +
      K().row({ ui: "set-open-set-weight", title: "Вес", sub: esc(H().fmtKg(curKg)), act: "open-set-weight" }) +
      '<div class="n-section">Основные настройки</div>' +
      K().row({ ui: "set-open-theme", title: "Выбор темы", sub: esc(THEME_NAMES[state.theme] || "Системная"), act: "open-theme" }) +
      '<div class="n-section">Перенос данных</div>' +
      K().row({ ui: "set-save-db-file", title: "Сохранить базу файлом", sub: "JSON с записями и настройками", act: "file-save" }) +
      K().row({ ui: "set-load-history", title: "Восстановить из файла", sub: "записи и, с согласия, настройки", act: "file-open" }) +
      '<p class="set-ver">Версия ' + versionLabel() + "</p>";
  }

  /* Экран веса — дословно донор (app.js 2944–2985): панель «Текущий вес» +
     табы Неделя/Месяц/Год (дефолт — год), две страницы периодов в свайп-
     дорожке (весы weightWindow/weightSvg — M11), «История» без даты, строки
     wrow. Поведение next сохранено: могилы (M03) фильтруют список. */
  function pageWeight() {
    var today = N().wallToday();
    var range = ui.weightRange || "year";
    var anchor = ui.weightAnchor || today;
    /* v83 (донор): будущей страницы нет — только прошлый период и текущий. */
    var windows = [-1, 0].map(function (delta) {
      return H().weightWindow(range, H().shiftPeriod(range, anchor, delta, today), today);
    });
    var tombs = J().tombMap(state, "w");
    var all = (state.weights || []).filter(function (w) {
      return !J().tombBlocks(tombs, J().weightKey(w), J().entryTouch(w));
    }).slice().sort(function (a, b) {
      return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.createdAt || 0) - (b.createdAt || 0);
    });
    var shown = windows[1];
    var current = all.length ? all[all.length - 1].kg : state.weightKg;
    var scale = H().weightScale(all, windows, today, state.weightKg);
    var pages = windows.map(function (item) {
      return '<div class="w-page"><div class="w-period' + (item.under ? " under" : "") + '">' + esc(item.title) + "</div>" + H().weightSvg(all, today, item, scale) + "</div>";
    }).join("");
    var list = all.filter(function (w) { return w.date >= shown.start && w.date <= shown.end; }).map(function (w) {
      return K().swipeRow({ ui: "weight", sid: "w-" + w.id,
        actions: [
          { act: "edit-weight", id: w.id, aria: "Изменить", icon: uiIcon("pencilMask") },
          { act: "del-weight", id: w.id, cls: "danger", aria: "Удалить", icon: uiIcon("trash") }
        ],
        front: '<div class="swipe-front wrow"><span>' + (range === "year" ? w.date.slice(5, 7) + "." + w.date.slice(0, 4) : w.date.slice(8, 10) + "." + w.date.slice(5, 7) + "." + w.date.slice(0, 4)) + '</span><span class="wkg">' + H().fmtKg(w.kg) + "</span></div>" });
    }).join("");
    if (!list) list = '<div class="empty w-empty">Нет данных</div>';
    var tabs = [["week", "Неделя"], ["month", "Месяц"], ["year", "Год"]].map(function (it) {
      return '<button type="button" class="' + (range === it[0] ? "on" : "") + '" data-act="weight-range" data-range="' + it[0] + '">' + it[1] + "</button>";
    }).join("");
    return "" +
      K().header({ ui: "weight", cls: "top plain", title: "История веса" }) +
      '<div class="w-panel">' +
      '<div class="w-center"><div class="w-now"><span>Текущий вес</span><b>' + H().fmtKg(current) + "</b></div>" +
      '<div class="wrange">' + tabs + "</div></div>" +
      '<div class="w-swipe"><div class="w-track">' + pages + "</div></div></div>" +
      '<div class="hist-head"><span class="hist-ico" aria-hidden="true">' + uiIcon("restore") + '</span><span>История</span></div>' +
      '<div class="hist-list w-list">' + list + "</div>";
  }

  function onbScreen() {
    if (!ui.onb) ui.onb = O().draft(ui, state, N().wallToday());
    return '<div class="screen onb-screen">' + O().screenHtml(ui.onb, { catArt: CAT_PLACEHOLDER }) + "</div>";
  }

  /* ---- оверлеи ---- */
  function overlayHtml() {
    var out = "";
    /* M22: FAB центром на линии М: история — добавить запись, вес — взвешивание. */
    if (!ui.sheet && !ui.modal && !ui.page && ui.tab === "history") {
      out += U().roundBtn({ ui: "add", role: "fab", act: "open-add", aria: "Добавить запись", icon: uiIcon("plus") });
    }
    if (!ui.sheet && !ui.modal && !ui.page && ui.tab === "weight") {
      out += U().roundBtn({ ui: "add-weight", role: "fab", act: "open-weight-add", aria: "Добавить взвешивание", icon: uiIcon("plus") });
    }
    if (ui.sheet === "volume") {
      var items = (state.drinks || []).slice(0, 8).map(function (d) {
        return { id: d.id, on: d.id === ui.volumeDrinkId, color: d.color,
          name: esc(d.name), bubble: bubble(d) };
      });
      out += U().sheet({ ui: "volume", cls: "volume", title: "Объём",
        body: K().drinkPickRow({ ui: "volsheet", items: items, act: "pick-volume-drink" }) +
          U().chipRow({ baseCls: "presets xscroll vol-pick", values: VOLS, selected: ui.volumeDraft, act: "vol-chip" }),
        tail: '<button type="button" class="check center" data-act="commit-volume" aria-label="Готово">' + uiIcon("check") + "</button>" });
    } else if (ui.sheet === "add-entry") {
      var ad = ui.addDraft || { drinkId: state.profile.drinkId, volume: state.profile.volume };
      var aitems = (state.drinks || []).slice(0, 8).map(function (d) {
        return { id: d.id, on: d.id === ad.drinkId, color: d.color, name: esc(d.name), bubble: bubble(d) };
      });
      out += U().sheet({ ui: "addentry", cls: "volume", title: "Добавить запись",
        body: K().drinkPickRow({ ui: "addsheet", items: aitems, act: "add-drink" }) +
          U().chipRow({ baseCls: "presets xscroll vol-pick", values: VOLS, selected: ad.volume, act: "add-vol-chip" }),
        tail: '<button type="button" class="check center" data-act="add-entry-save" aria-label="Записать">' + uiIcon("check") + "</button>" });
    } else if (ui.sheet === "weight-add" || ui.sheet === "weight-edit") {
      var wd = ui.weightDraft || { kg: "", date: N().wallToday() };
      out += U().sheet({ ui: "weightadd", title: ui.sheet === "weight-edit" ? "Изменить взвешивание" : "Новое взвешивание",
        body: '<div class="field"><label>Вес, кг</label><input type="number" step="0.1" min="1" max="400" data-act="weight-kg" value="' + esc(String(wd.kg)) + '"></div>' +
          '<div class="field"><label>Дата</label><input type="date" data-act="weight-date" value="' + esc(wd.date) + '"></div>',
        tail: '<button type="button" class="check center" data-act="weight-save" aria-label="Сохранить">' + uiIcon("check") + "</button>" });

    } else if (ui.sheet === "entry-edit") {
      out += U().sheet({ ui: "entryedit", cls: "goal", title: "Объём записи",
        body: U().chipRow({ baseCls: "presets xscroll vol-pick", values: VOLS, selected: ui.editDraft ? ui.editDraft.volume : 0, act: "edit-vol-chip" }),
        tail: '<button type="button" class="check center" data-act="commit-edit" aria-label="Сохранить">' + uiIcon("check") + "</button>" });
    } else if (ui.sheet === "onb-weight") {
      var kg = ui.onb ? ui.onb.kg : 60;
      var grid = KG_VALS.map(function (v) {
        return '<button type="button" class="' + (Number(v) === Number(kg) ? "on" : "") + '" data-act="onb-kg" data-v="' + v + '">' + v + "</button>";
      }).join("");
      out += U().sheet({ ui: "onbkg", cls: "goal", title: "Вес, кг", body: '<div class="onb-kg-grid">' + grid + "</div>" });
    } else if (ui.sheet === "onb-time") {
      var ds = ui.onb ? ui.onb.dayStart : "02:00";
      var dgrid = DAY_STARTS.map(function (v) {
        return '<button type="button" class="' + (v === ds ? "on" : "") + '" data-act="onb-daystart" data-v="' + v + '">' + v + "</button>";
      }).join("");
      out += U().sheet({ ui: "onbtime", cls: "goal", title: "Начало суток",
        body: '<div class="onb-kg-grid">' + dgrid + "</div>" +
          '<button type="button" class="time-btn" data-act="onb-time-sys">' + uiIcon("clock") + "<span>Системные часы</span></button>" });
    }
    if (ui.modal === "alert-freq") {
      /* Донор settings-ui.js 1148-1163: диалог частоты, опции байт-в-байт. */
      var nf = N().ensureAlerts(state);
      out += U().dialog({ ui: "freq",
        scrimAct: "freq-cancel",
        cls: "modal n-modal freq-modal",
        title: "Частота",
        body: U().optionList({ ui: "freq",
          act: "pick-freq", attr: "min",
          items: [10, 30, 60, 90, 120, 150, 180, -1, 0].map(function (min) {
            return { value: min, label: P().freqLabel(min), on: Number(nf.everyMin) === min };
          }) }),
        actions: [{ act: "freq-cancel", label: "Отмена" }] });
    }
    if (ui.modal === "theme") {
      /* Диалог темы донора (settings-ui.js 405–424); тема «Oneplus 7» —
         пустое место до модуля «Внешний вид». */
      out += U().dialog({ ui: "theme", scrimAct: "theme-cancel", cls: "modal n-modal theme-modal", title: "Выбор темы",
        body: U().optionList({ ui: "theme", act: "pick-theme", attr: "v",
          items: [["system", "По умолчанию"], ["light", "Светлая тема"], ["dark", "Тёмная тема"]].map(function (o) {
            return { value: o[0], label: o[1], on: state.theme === o[0] };
          }) }),
        actions: [{ act: "theme-cancel", label: "Отмена" }] });
    }
    if (ui.modal === "dialog" && ui.dialogSpec) {
      var d = ui.dialogSpec;
      out += U().dialog({ ui: d.kind || "dialog", cls: "modal", scrimAct: d.scrimAct || "dialog-cancel",
        title: esc(d.title || ""), body: d.body || "<p>" + esc(d.text || "") + "</p>",
        actions: d.actions || [{ act: "dialog-cancel", label: "Отмена" }, { act: d.okAct || "dialog-ok", label: d.ok || "Готово" }] });
    }
    return out;
  }

  /* ---- рендер (донор 4520, сокращённый) ---- */
  function render() {
    animToken++;
    try {
      W.__waterRenders = (W.__waterRenders || 0) + 1;
      W.__hb = Date.now();
      if (!ui._hbTimer) ui._hbTimer = setInterval(function () { W.__hb = Date.now(); }, 1000);
    } catch (e) {}
    var root = document.getElementById("app");
    if (!root) return;
    root.className = "app" + (ui.modal ? " modal-open" : "");
    if (!state.onboarded) {
      root.innerHTML = onbScreen() + overlayHtml();
      afterRender();
      return;
    }
    var main, screenClass = "screen";
    if (ui.page === "drinks") { main = pageDrinks(); screenClass = "screen drinks-screen"; }
    else if (ui.page === "volumes") { main = pageVolumes(); screenClass = "screen hist-screen volumes-screen"; }
    else if (ui.page === "folder-alerts") { main = pageAlerts(); screenClass = "screen alerts-screen"; }
    else if (ui.page === "alert-sound") { main = pageAlertSound(); screenClass = "screen alerts-screen"; }
    else if (ui.tab === "history") { main = pageHistory(); screenClass = "screen hist-screen"; }
    else if (ui.tab === "weight") { main = pageWeight(); screenClass = "screen weight-screen"; }
    else if (ui.tab === "settings") { main = pageSettings(); screenClass = "screen settings-screen"; }
    else if (ui.tab === "alerts") { main = pageAlerts(); screenClass = "screen alerts-screen"; }
    else { main = pageHome(); screenClass = "screen home-screen"; }
    root.innerHTML = '<div class="' + screenClass + '">' + main + "</div>" +
      U().navHtml(ui) + overlayHtml() + U().toastHtml(ui);
    afterRender();
  }
  /* Слово владельца 06.11: версия в программе = реальная версия сборки.
     Правда приходит из Java-моста (BuildConfig), константы — запас веб-режима. */
  function versionLabel() {
    try {
      if (window.WaterBridge && typeof window.WaterBridge.wtVersion === "function") {
        var v = window.WaterBridge.wtVersion();
        if (v) return String(v);
      }
    } catch (e) {}
    return APP_VERSION + " (" + VERSION_CODE + ")";
  }
  /* ---------- Раскладка значков: данные проекта data/svg-layout.json --------
     Внешность донора (app.js): вшитые правки значков (26px шеврон/FAB,
     спина — зеркальный arrow_forward) приезжают файлом проекта и
     применяются до первого рендера. Студия внутри приложения умерла
     (слово владельца 06.11): остаются штамп ключей и применение боксов.
     Функции перенесены байт-в-байт. */
  function fetchT(url, ms) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { reject(new Error("fetch timeout " + url)); }, ms);
      fetch(url).then(function (r) { clearTimeout(timer); resolve(r); },
                      function (e) { clearTimeout(timer); reject(e); });
    });
  }

  function svgArtNode(el) {
    if (!el) return null;
    if (el.tagName === "IMG" || el.classList.contains("ui-mask") || el.tagName === "svg") return el;
    return el.querySelector("img, .ui-mask, svg") || el;
  }

  function svgDetectFile(el) {
    var node = svgArtNode(el);
    if (!node) return "";
    if (node._svgFile) return node._svgFile;
    if (node.dataset && node.dataset.svgFile) return node.dataset.svgFile;
    if (node.tagName === "IMG") {
      var url = node.getAttribute("src") || "";
      return url.slice(-4).toLowerCase() === ".svg" ? url.split("/").pop() : "";
    }
    var style = (node.getAttribute("style") || "") + " " + (node.style.webkitMaskImage || "") + " " + (node.style.maskImage || "");
    var m = style.match(/icons\/([A-Za-z0-9_.-]+\.svg)/);
    return m ? m[1] : "";
  }

  function svgEditTargets() {
    var app = document.getElementById("app");
    if (!app) return [];
    var list = [];
    app.querySelectorAll("svg, .ui-mask, img, .nav-ico").forEach(function (el) {
      if (el.closest("[data-svg-editor], [data-svg-lock], defs")) return;
      if (el.tagName === "IMG") {
        var src = (el.getAttribute("src") || "").toLowerCase();
        var known = el.dataset.svgFile || el._svgFile || "";
        if (src.slice(-4) !== ".svg" && src.indexOf("data:image/svg") !== 0 && !known) return;
      }
      var r = el.getBoundingClientRect();
      if (r.width < 2 && r.height < 2) return;
      list.push(el);
    });
    return list;
  }

  function svgEditKey(el) {
    var app = document.getElementById("app");
    var parts = [];
    var page = el.closest(".w-page");
    if (page && page.parentElement) parts.push("wp" + Array.prototype.indexOf.call(page.parentElement.children, page));
    var n = el;
    while (n && n !== app) {
      var bit = "";
      if (n.dataset) {
        if (n.dataset.act) bit += n.dataset.act;
        if (n.dataset.id) bit += "#" + n.dataset.id;
        if (n.dataset.tab) bit += "@" + n.dataset.tab;
        if (n.dataset.slot) bit += ":" + n.dataset.slot;
        if (n.dataset.level) bit += "=" + n.dataset.level;
        if (n.dataset.field) bit += "." + n.dataset.field;
      }
      if (!bit && n.classList && n.classList.length) bit = n.classList[0];
      if (bit) parts.push(bit);
      n = n.parentElement;
    }
    var parent = el.parentElement;
    var same = parent ? Array.prototype.filter.call(parent.children, function (c) {
      return c.tagName === el.tagName;
    }) : [el];
    var src = el.getAttribute("src") || "";
    var name = "";
    // Only pictures carry the file name in the key: masks and inline svg keep
    // the key they always had, so saved layouts stay valid.
    if (el.tagName === "IMG") {
      name = el.dataset.svgFile || el._svgFile || "";
      if (!name && src.slice(-4).toLowerCase() === ".svg") name = src.split("/").pop();
    }
    parts.push(el.tagName.toLowerCase() + Array.prototype.indexOf.call(same, el) + (name ? "/" + name : ""));
    return parts.reverse().join("/");
  }

  function applySvgBox(el, box) {
    if (!box) return;
    if (box.w > 0) {
      el.style.width = box.w + "px";
      el.style.height = box.h + "px";
      el.style.maxWidth = "none";
      el.style.maxHeight = "none";
      el.style.flex = "none";
    }
    el.style.transform = "translate(" + (box.dx || 0) + "px," + (box.dy || 0) + "px)" +
      (box.rot ? " rotate(" + box.rot + "deg)" : "") +
      (box.mx === -1 || box.my === -1 ? " scale(" + (box.mx === -1 ? -1 : 1) + "," + (box.my === -1 ? -1 : 1) + ")" : "");
    el.style.position = "relative";
    el.style.zIndex = "7";
    var app = document.getElementById("app");
    var n = el.parentElement;
    while (n && n !== app) {
      if (!n.classList.contains("screen") && !n.classList.contains("chart-scroll") && !n.classList.contains("xscroll")) n.style.overflow = "visible";
      n = n.parentElement;
    }
  }

  function applySvgFile(el, file) {
    if (!el || !file || !/^[A-Za-z0-9_.-]+\.svg$/.test(file)) return;
    var node = svgArtNode(el);
    if (!node) return;
    var url = "assets/icons/" + file;
    node._svgFile = file;
    if (node.tagName === "IMG") {
      node.setAttribute("src", url);
      return;
    }
    if (node.classList.contains("ui-mask") || node.style.webkitMaskImage || node.style.maskImage || (node.getAttribute("style") || "").indexOf("mask-image") >= 0) {
      node.style.webkitMaskImage = "url(" + url + ")";
      node.style.maskImage = "url(" + url + ")";
      return;
    }
    if (node.tagName !== "svg") return;
    fetch(url).then(function (r) { return r.text(); }).then(function (text) {
      if (!node.isConnected || node._svgFile !== file) return;
      var doc = new DOMParser().parseFromString(text, "image/svg+xml");
      var svg = doc.querySelector("svg");
      if (!svg || doc.querySelector("parsererror")) return;
      svg.querySelectorAll("script").forEach(function (s) { s.remove(); });
      if (svg.getAttribute("viewBox")) node.setAttribute("viewBox", svg.getAttribute("viewBox"));
      node.innerHTML = svg.innerHTML;
    }).catch(function () {});
  }

  function sameSvgBox(a, b) {
    if (!a || !b) return false;
    return Math.round(Number(a.dx) || 0) === Math.round(Number(b.dx) || 0) &&
      Math.round(Number(a.dy) || 0) === Math.round(Number(b.dy) || 0) &&
      Math.round(Number(a.w) || 0) === Math.round(Number(b.w) || 0) &&
      Math.round(Number(a.h) || 0) === Math.round(Number(b.h) || 0) &&
      String(a.file || "") === String(b.file || "");
  }

  function cleanSvgLayout(raw) {
    var out = {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
    Object.keys(raw).forEach(function (k) {
      if (k.indexOf("__") === 0) return; /* служебные поля файла проекта */
      var box = raw[k];
      if (!box || typeof box !== "object" || Array.isArray(box)) return;
      out[k] = {
        dx: Math.round(Number(box.dx) || 0),
        dy: Math.round(Number(box.dy) || 0),
        w: Math.round(Number(box.w) || 0),
        h: Math.round(Number(box.h) || 0)
      };
      /* Зеркало и поворот входят в снимки и в очистку (контракт 23.10.2026). */
      var rot = Math.round(Number(box.rot) || 0);
      if (rot) out[k].rot = rot;
      if (Number(box.mx) === -1) out[k].mx = -1;
      if (Number(box.my) === -1) out[k].my = -1;
      if (typeof box.file === "string" && /^[A-Za-z0-9_.-]+\.svg$/.test(box.file)) out[k].file = box.file;
    });
    return out;
  }

  function cloneSvgLayout(layout) {
    var out = {};
    Object.keys(layout || {}).forEach(function (k) {
      var box = layout[k];
      if (!box || typeof box !== "object") return;
      out[k] = {
        dx: Math.round(Number(box.dx) || 0),
        dy: Math.round(Number(box.dy) || 0),
        w: Math.round(Number(box.w) || 0),
        h: Math.round(Number(box.h) || 0)
      };
      /* Зеркало и поворот входят в снимки и в очистку (контракт 23.10.2026). */
      var rot = Math.round(Number(box.rot) || 0);
      if (rot) out[k].rot = rot;
      if (Number(box.mx) === -1) out[k].mx = -1;
      if (Number(box.my) === -1) out[k].my = -1;
      if (typeof box.file === "string" && /^[A-Za-z0-9_.-]+\.svg$/.test(box.file)) out[k].file = box.file;
    });
    return out;
  }

  function adoptProjectLayout(done) {
    var hasLocal = state.svgLayout && Object.keys(state.svgLayout).length;
    fetchT("data/svg-layout.json?t=" + Date.now(), 3000).then(function (r) {
      if (!r.ok) throw 0;
      return r.json();
    }).then(function (data) {
      var clean = cleanSvgLayout(data);
      var rev = data && typeof data.__rev === "string" ? data.__rev : "";
      // Ревизия проекта один раз перекрывает правки браузера: так присланная
      // раскладка применяется при каждом запуске, а поздние правки не теряются.
      var fresh = !!(rev && rev !== String(state.svgLayoutRev || ""));
      if (!fresh && hasLocal) return;
      var keys = Object.keys(clean);
      var dropped = data && Array.isArray(data.__removed) ? data.__removed : [];
      if (!keys.length && !dropped.length) return;
      if (fresh) {
        var merged = {};
        var adopted = state.svgLayoutAdopted && typeof state.svgLayoutAdopted === "object" ? state.svgLayoutAdopted : {};
        Object.keys(state.svgLayout || {}).forEach(function (k) {
          var box = state.svgLayout[k];
          // Автор проекта убрал правку, а в браузере она осталась: снимаем её,
          // если с прошлого применения проекта её тут не трогали.
          if (!clean[k] && adopted[k] && sameSvgBox(box, adopted[k])) return;
          merged[k] = box;
        });
        // Список снятых правок проекта: они убираются у всех, даже если формат
        // состояния старый и снимка принятых правок ещё нет.
        dropped.forEach(function (k) { delete merged[k]; if (state.svgLayout) delete state.svgLayout[k]; });
        keys.forEach(function (k) { merged[k] = clean[k]; });
        state.svgLayout = merged;
      } else {
        state.svgLayout = clean;
      }
      if (dropped.length && !fresh) dropped.forEach(function (k) { delete state.svgLayout[k]; });
      state.svgLayoutAdopted = cloneSvgLayout(clean);
      if (rev) state.svgLayoutRev = rev;
      save();
    }).catch(function () {}).then(function () { if (done) done(); });
  }

  function initSvgEdit() {
    var app = document.getElementById("app");
    if (!app) return;
    if (!state.svgLayout) state.svgLayout = {};
    var seen = {};
    svgEditTargets().forEach(function (el) {
      var key = svgEditKey(el);
      if (seen[key]) {
        seen[key] += 1;
        key += "~" + seen[key];
      } else seen[key] = 1;
      el.dataset.svgKey = key;
      el.dataset.svgOrigin = svgDetectFile(el);
      if (state.svgLayout[key]) {
        var savedBox = state.svgLayout[key];
        if (savedBox.w > 0 || savedBox.dx || savedBox.dy || savedBox.rot || savedBox.mx === -1 || savedBox.my === -1) applySvgBox(el, savedBox);
        if (savedBox.file) applySvgFile(el, savedBox.file);
      }
          });
  }

  function afterRender() {
    /* M23: колбэк файлового моста живёт один раз на приложение. */
    if (W.WT2F && !W.__wtFileHook) {
      W.__wtFileHook = function (text, err) {
        F().fileResult(state, text, err, {
          toast: toast,
          save: function () { C().save(state); },
          render: render,
          /* Осторожность владельца 05.11: настройки из файла — только явным
             выбором в диалоге после восстановления записей. */
          askSettings: function (st) {
            ui.pendingSettings = st;
            ui.modal = "dialog";
            ui.dialogSpec = {
              title: "Файл содержит настройки",
              body: "<p>Записи восстановлены. Применить также настройки из файла: тему, цель, напоминания?</p>",
              actions: [
                { act: "file-skip-settings", label: "Только записи" },
                { act: "file-apply-settings", label: "Применить и настройки" }
              ],
              scrimAct: "file-skip-settings"
            };
            render();
          }
        });
      };
    }
    /* M06: цель лифта — текущий уровень; водитель скользит синусом (C-026). */
    if (W.WT2W && document.querySelector(".cat-stage")) {
      var stH = S().dayStats(state, N().waterToday(state));
      var fr = stH.goal > 0 ? stH.volume / stH.goal : 0;
      W.WT2W.syncTarget(fr);
      /* M08: водители цвета и рампы, плавно (донор smooth && !animation). */
      if (W.WT2B) {
        var rB = W.WT2B.ramp(state, N().waterToday(state));
        W.WT2B.syncColorTarget(rB.flat ? W.WT2W.liquidColor(state) : rB.top, !state.animation);
        W.WT2B.syncBeltTarget(rB.flat ? null : rB.colors, !state.animation, rB.flat ? null : rB.belts.map(function (x) { return x.c; }));
      }
    }
    U().fitPhone();
    U().bindPhone();
    initSwipes();
    initSwipeTaps();
    /* Донор app.js 7306-7315: ряд чипов довёрнут к выбранному. */
    var pickedVol = document.querySelector(".vol-pick .preset.on");
    if (pickedVol && pickedVol.parentElement) {
      var row = pickedVol.parentElement;
      row.scrollLeft = Math.max(0, pickedVol.offsetLeft - (row.clientWidth - pickedVol.offsetWidth) / 2);
    }
    var pickedMenuDrink = document.querySelector(".vol-drink.on");
    if (pickedMenuDrink && pickedMenuDrink.parentElement) {
      var drinkRow = pickedMenuDrink.parentElement;
      drinkRow.scrollLeft = Math.max(0, pickedMenuDrink.offsetLeft - 8);
    }
    /* Механика графика донора (bindAll 7315–7334): позиция после раскладки,
       два кадра, guard от ложного нуля WebView; затем окно и масштаб. */
    var sc = document.querySelector(".chart-scroll");
    if (sc) {
      sc.addEventListener("scroll", onHistoryChartScroll);
      sc.addEventListener("scroll", function () { if (!sc._restoreGuard) ui.chartLeft = sc.scrollLeft; });
      sc._restoreGuard = true;
      var wantLeft = function () { return ui.chartLeft == null ? sc.scrollWidth : ui.chartLeft; };
      requestAnimationFrame(function () {
        sc.scrollLeft = wantLeft();
        requestAnimationFrame(function () {
          sc.scrollLeft = wantLeft();
          sc._restoreGuard = false;
          growHistoryChart();
          fitHistoryChart();
        });
      });
    }
    initXScroll();
    initWeightSwipe();
    initSvgEdit(); /* донор app.js:7345 — штамп и боксы после каждого рендера */
    if (W.WT2X) W.WT2X.syncBars();
    if (R()) R().emit("ui:render", { tab: ui.tab, page: ui.page });
  }
  function closeSheet() { ui.sheet = null; render(); }

  /* ---- поток «выпил» (донор writeProfile) ---- */
  function writeProfile() {
    var drink = currentDrink();
    if (!drink) return;
    var volume = Number(state.profile.volume) || 0;
    J().addEntry(state, { date: todayStr(), time: nowHM(), drink: drink, volume: volume });
    save();
    alertsSync();
    var cred = L().creditedMl(volume, drink.hydration);
    toast("Записано: " + drink.name + " " + volume + " мл" +
      (cred !== volume ? " — водный эквивалент " + cred + " мл" : ""));
  }

  /* ---- действия ---- */
  function performAction(t, act) {
    var ds = t.dataset || {};
    if (act === "goto") {
      /* v125 донора (app.js 8314-8317): колокольчик — ярлык: вкладка настроек
         и раскрытая подпапка уведомлений (до отдельной замены колокольчика). */
      if (ds.tab === "alerts") { ui.tab = "settings"; ui.page = "folder-alerts"; }
      else { ui.tab = ds.tab; ui.page = null; }
      ui.sheet = null; ui.modal = null;
      closeOpenSwipes(); render(); return;
    }
    if (act === "back") {
      if (ui.sheet) { ui.sheet = null; render(); return; }
      if (ui.page === "drinks") { ui.page = null; ui.tab = ui.drinkReturn || "home"; render(); return; }
      if (ui.page === "alert-sound") { ui.page = "folder-alerts"; render(); return; }
      if (ui.page) { ui.page = null; render(); return; }
      render(); return;
    }
    if (act === "close-sheet") { ui.sheet = null; render(); return; }
    if (act === "dialog-cancel") { ui.modal = null; ui.dialogSpec = null; render(); return; }
    if (!state.onboarded) { onbAction(act, ds); return; }
    if (act === "add-profile") { writeProfile(); render(); return; }
    if (act === "undo") {
      var last = latestEntryToday();
      if (!last) {
        toast((state.entries || []).length ? "Отмена действует только на текущие сутки" : "Нечего отменять");
        return;
      }
      J().markDeleted(state, [last], "e");
      state.entries = state.entries.filter(function (en) { return en.id !== last.id; });
      save();
      toast("Отменено: " + last.name + " " + last.volume + " мл");
      render(); return;
    }
    if (act === "apply-shortcut") {
      state.profile = { drinkId: ds.id, volume: Number(ds.volume) };
      save();
      var d = D().drinkById(state, ds.id);
      toast("Выбрано: " + (d ? d.name : "") + " " + ds.volume + " мл. Кот ещё не записал.");
      render(); return;
    }
    if (act === "open-drinks") {
      ui.page = "drinks"; ui.drinkReturn = "home"; ui.sheet = null; ui.modal = null; render(); return;
    }
    if (act === "pick-drink") {
      if (!D().drinkById(state, ds.id)) return;
      state.profile.drinkId = ds.id;
      save();
      ui.page = null; ui.tab = ui.drinkReturn || "home"; render(); return;
    }
    if (act === "open-volume") {
      ui.volumeDraft = state.profile.volume;
      ui.volumeDrinkId = state.profile.drinkId;
      ui.sheet = "volume"; render(); return;
    }
    if (act === "pick-volume-drink") {
      if (!D().drinkById(state, ds.id)) return;
      ui.volumeDrinkId = ds.id; render(); return;
    }
    if (act === "vol-chip") { ui.volumeDraft = Number(ds.v); render(); return; }
    if (act === "commit-volume") {
      if (ui.volumeDrinkId && D().drinkById(state, ui.volumeDrinkId)) state.profile.drinkId = ui.volumeDrinkId;
      state.profile.volume = Number(ui.volumeDraft) || state.profile.volume;
      ui.volumeDrinkId = null;
      save();
      ui.sheet = null;
      var picked = currentDrink();
      toast((picked ? picked.name + ", " : "") + state.profile.volume + " мл");
      render(); return;
    }
    if (act === "edit-entry") {
      var entry = (state.entries || []).filter(function (en) { return en.id === ds.id; })[0];
      ui.openSwipe = null;
      if (entry) { ui.editId = entry.id; ui.editDraft = { volume: entry.volume }; ui.sheet = "entry-edit"; render(); }
      return;
    }
    if (act === "edit-vol-chip") { if (ui.editDraft) ui.editDraft.volume = Number(ds.v); render(); return; }
    if (act === "commit-edit") {
      if (ui.editId && ui.editDraft) {
        J().editEntry(state, ui.editId, { volume: Number(ui.editDraft.volume) || 0 });
        save();
        toast("Запись изменена");
      }
      ui.editId = null; ui.editDraft = null; ui.sheet = null; render(); return;
    }
    if (act === "del-entry") {
      var victim = (state.entries || []).filter(function (en) { return en.id === ds.id; });
      J().deleteEntries(state, victim);
      ui.openSwipe = null;
      save();
      toast("Запись удалена");
      render(); return;
    }
    if (act === "pick-day") { ui.historyDate = ds.date; ui.chartLeft = null; render(); return; }
    if (act === "open-cal-hist") { toast("Календарь приедет со своим модулем"); return; }
    if (act === "open-volumes") { ui.page = "volumes"; render(); return; }
    if (act === "open-theme") { ui.modal = "theme"; render(); return; }
    if (act === "theme-cancel") { ui.modal = null; render(); return; }
    if (act === "open-set-weight") {
      ui.weightDraft = { kg: "", date: N().wallToday() };
      ui.sheet = "weight-add"; render(); return;
    }
    if (act === "open-folder-alerts") { ui.tab = "alerts"; ui.page = null; render(); return; }
    if (act === "open-alert-freq") { ui.modal = "alert-freq"; render(); return; }
    if (act === "open-alert-sound") { ui.page = "alert-sound"; render(); return; }
    if (act === "pick-recent-volume") {
      state.profile.volume = Number(ds.v) || state.profile.volume;
      save(); render(); return;
    }
    if (act === "toggle") {
      /* Ключи донора (alertsBody) и прежние ключи next — одни поля M13. */
      var n = N().ensureAlerts(state);
      if (ds.key === "alerts-enabled" || ds.key === "alertOn") n.enabled = !n.enabled;
      else if (ds.key === "hold-until" || ds.key === "holdUntilDrink") n.holdUntilDrink = !n.holdUntilDrink;
      else if (ds.key === "alertVibrate") n.vibrate = n.vibrate === false;
      else if (ds.key === "whenGoalMet") n.whenGoalMet = !n.whenGoalMet;
      else if (ds.key === "evenIfRecent") n.evenIfRecent = !n.evenIfRecent;
      save(); alertsSync(); render(); return;
    }
    if (act === "pick-freq") {
      /* Донор app.js: pick-freq — мин из data-min, диалог закрывается. */
      var np = N().ensureAlerts(state);
      np.everyMin = Number(ds.min);
      save(); alertsSync(); ui.modal = null; render(); return;
    }
    if (act === "freq-cancel") { ui.modal = null; render(); return; }
    if (act === "pick-bsleep") {
      var nb = N().ensureAlerts(state);
      nb.beforeSleepMin = Number(ds.v);
      save(); alertsSync(); render(); return;
    }
    if (act === "alert-sound") { ui.sheet = "alert-sound"; render(); return; }
    if (act === "pick-sound") {
      /* Донор: страница звука остаётся открытой. */
      var ns = N().ensureAlerts(state);
      ns.sound = ds.file;
      save(); alertsSync(); render(); return;
    }
    if (act === "play-sound") { playAlertSound(ds.file || N().ensureAlerts(state).sound); return; }
    if (act === "pick-theme") {
      state.theme = ds.v === "light" || ds.v === "dark" ? ds.v : "system";
      ui.modal = null;
      save(); applyTheme(); render(); return;
    }
    /* Донор app.js:9132 — гостевая строка в вебе/без моста. */
    if (act === "cloud-needapp") { toast("Вход через Google работает в приложении для Android"); return; }
    if (act === "cloud-sign") {
      if (!(window.WaterGoogle)) { toast("Вход через Google доступен в приложении Android"); return; }
      if (cloud.signedIn) window.WaterGoogle.signOut(); else window.WaterGoogle.signIn();
      return;
    }
    if (act === "cloud-save") { cloudUpload("manual"); return; }
    if (act === "open-add") {
      ui.addDraft = { drinkId: state.profile.drinkId, volume: state.profile.volume };
      ui.sheet = "add-entry"; render(); return;
    }
    if (act === "add-drink") { ui.addDraft = ui.addDraft || {}; ui.addDraft.drinkId = t.dataset.v; render(); return; }
    if (act === "add-vol-chip") { ui.addDraft = ui.addDraft || {}; ui.addDraft.volume = Number(t.dataset.v); render(); return; }
    if (act === "add-entry-save") {
      var ad = ui.addDraft || { drinkId: state.profile.drinkId, volume: state.profile.volume };
      var dObj = (state.drinks || []).filter(function (d) { return d.id === ad.drinkId; })[0];
      if (!dObj) return;
      var now = new Date();
      J().addEntry(state, { date: N().wallToday(), time: ("0" + now.getHours()).slice(-2) + ":" + ("0" + now.getMinutes()).slice(-2),
        drink: dObj, volume: Number(ad.volume) || state.profile.volume });
      C().save(state); ui.sheet = null; render();
      toast("Записано: " + dObj.name + " " + (Number(ad.volume) || state.profile.volume) + " мл");
      return;
    }
    if (act === "open-weight-add") {
      ui.weightDraft = { kg: "", date: N().wallToday() };
      ui.sheet = "weight-add"; render(); return;
    }
    if (act === "weight-range") {
      /* Табы донора (9710): диапазон сразу, якорь — сегодня. */
      ui.weightRange = ds.range; ui.weightAnchor = N().wallToday();
      render(); return;
    }
    if (act === "edit-weight") {
      var wE = (state.weights || []).filter(function (w) { return w.id === t.dataset.id; })[0];
      if (!wE) return;
      ui.weightDraft = { kg: wE.kg, date: wE.date, id: wE.id };
      ui.sheet = "weight-edit"; render(); return;
    }
    if (act === "del-weight") {
      var wD = (state.weights || []).filter(function (w) { return w.id === t.dataset.id; })[0];
      if (!wD) return;
      J().markDeleted(state, [wD], "w");
      C().save(state); render(); toast("Запись удалена"); return;
    }
    if (act === "weight-save") {
      var wd = ui.weightDraft || {};
      var kg = Number(wd.kg);
      if (!kg || kg <= 0 || kg > 400) { toast("Введите вес в кг"); return; }
      if (wd.id) {
        var wX = (state.weights || []).filter(function (w) { return w.id === wd.id; })[0];
        if (wX) { wX.kg = kg; wX.date = wd.date || wX.date; }
        C().save(state); ui.sheet = null; ui.weightDraft = null; render(); toast("Запись изменена");
      } else {
        state.weights = state.weights || [];
        state.weights.push({ id: J().uid(), date: wd.date || N().wallToday(), kg: kg, createdAt: Date.now() });
        C().save(state); ui.sheet = null; ui.weightDraft = null; render(); toast("Вес записан");
      }
      return;
    }
    if (act === "file-apply-settings") {
      W.WT2Y.applySettings(state, ui.pendingSettings || {}, {});
      C().save(state);
      ui.pendingSettings = null; ui.modal = null; ui.dialogSpec = null;
      render(); toast("Настройки применены"); return;
    }
    if (act === "file-skip-settings") {
      ui.pendingSettings = null; ui.modal = null; ui.dialogSpec = null;
      render(); toast("Настройки не применялись"); return;
    }
    if (act === "file-save") { F().save(state, ui, toast); return; }
    if (act === "file-open") { F().request(ui, toast); return; }
    if (act === "cloud-sync") {
      if (!(window.WaterGoogle && typeof window.WaterGoogle.restore === "function")) {
        toast("Синхронизация доступна в приложении Android"); return;
      }
      cloud.pending = "sync"; cloud.busy = true;
      window.WaterGoogle.restore();
      return;
    }
  }

  function onbAction(act, ds) {
    if (!ui.onb) ui.onb = O().draft(ui, state, N().wallToday());
    if (act === "onb-gender") { O().setGender(ui.onb, ds.v); render(); return; }
    if (act === "onb-weight") { ui.sheet = "onb-weight"; render(); return; }
    if (act === "onb-kg") { O().setKg(ui.onb, Number(ds.v)); ui.sheet = null; render(); return; }
    if (act === "onb-time") { ui.sheet = "onb-time"; render(); return; }
    if (act === "onb-daystart") { O().setDayStart(ui.onb, ds.v); ui.sheet = null; render(); return; }
    if (act === "onb-time-sys") {
      if (W.WaterNative && W.WaterNative.has && W.WaterNative.has("time")) {
        W.WaterNative.pickTime({ value: ui.onb.dayStart }).then(function (raw) {
          if (raw) { O().setDayStart(ui.onb, String(raw).slice(0, 5)); ui.sheet = null; render(); }
        });
      } else toast("Системные часы доступны в приложении Android");
      return;
    }
    if (act === "onb-done") {
      O().done(state, ui.onb, { noBuiltinBase: true }, ui);
      save();
      applyTheme();
      ui.onb = null;
      render();
      return;
    }
    if (act === "close-sheet") { ui.sheet = null; render(); return; }
  }

  /* ---- клик-делегация (донор: подавление догоняющего клика) ---- */
  function bindEvents() {
    document.addEventListener("change", function (e) {
      var el = e.target;
      if (!el || !el.dataset) return;
      if (el.dataset.act === "weight-kg") { ui.weightDraft = ui.weightDraft || {}; ui.weightDraft.kg = el.value; }
      if (el.dataset.act === "weight-date") { ui.weightDraft = ui.weightDraft || {}; ui.weightDraft.date = el.value; }
    });
    document.addEventListener("click", function (e) {
      if (suppressClick) { suppressClick = false; return; }
      if (swallowClickEl && (swallowClickEl === e.target || swallowClickEl.contains(e.target))) {
        swallowClickEl = null; return;
      }
      var t = e.target && e.target.closest ? e.target.closest("[data-act]") : null;
      if (!t) return;
      performAction(t, t.dataset.act);
    });
  }

  /* ---- старт ---- */
  function boot() {
    state = C().boot();
    ui = U().shellState();
    ui.historyDate = null; ui.chartLeft = null; ui.drinkReturn = "home";
    ui.volumeDraft = null; ui.volumeDrinkId = null; ui.editId = null; ui.editDraft = null;
    ui.onb = null; ui.dialogSpec = null;
    U().ICON_BASE_SET("assets/icons/");
    N().ensureAlerts(state);
    applyTheme();
    bindEvents();
    var env = {
      shell: ui, render: render, closeSheet: closeSheet,
      closeSwipes: function () { closeOpenSwipes(); },
      getState: function () { return state; },
      has: function (sel) { return !!document.querySelector(sel); }
    };
    if (W.WT2X) W.WT2X.bind(env);
    /* Донор app.js:10194: раскладка значков проекта применяется до первого рендера. */
    adoptProjectLayout(function () { render(); });
    /* Загрузочные шаги донора: разрешение на уведомления, облако, сверка слотов. */
    var n = N().ensureAlerts(state);
    if (n.enabled && !state.alertPermAsked) {
      state.alertPermAsked = true;
      save();
      if (window.WaterAlerts && typeof window.WaterAlerts.requestPermission === "function") {
        try { window.WaterAlerts.requestPermission(); } catch (e) {}
      }
    }
    cloudRead();
    if (cloud.signedIn && window.WaterGoogle) {
      setTimeout(function () { try { window.WaterGoogle.check(); } catch (e) {} }, 4000);
    }
    alertsSync();
    W.__waterApp = {
      get state() { return state; }, get ui() { return ui; },
      render: render, performAction: performAction, cloud: cloud,
      writeProfile: writeProfile, alertsSync: alertsSync
    };
  }

  if (W.WT2R) W.WT2R.register({
    id: "M21", file: "m21-app.js (+m21-uikit.js)", layer: 6, optional: false,
    contracts: ["C-007", "C-008", "C-013", "C-014", "C-015", "C-022", "C-024"],
    events: ["ui:render"],
    status: "ported"
  });
  W.WT2A = { APP_VERSION: APP_VERSION, VERSION_CODE: VERSION_CODE, boot: boot,
    render: function () { render(); }, VOLS: VOLS };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
