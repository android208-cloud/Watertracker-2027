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
  var PERIODS = [30, 45, 60, 90, 120, 180, 240];
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
  function glyph(name) {
    var file = DRINK_ICONS[name];
    if (!file && name && name.slice(-4) === ".svg") file = name;
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
    return H().rowHtml(bars, w, scale, selected, bands);
  }
  function chartPanel(selected) {
    return '<div class="chart-panel"><div class="chart-scroll"><div class="chart-row">' +
      buildChart(selected) + "</div></div></div>";
  }

  /* ---- экраны ---- */
  function pageHome() {
    var drink = currentDrink();
    var today = N().waterToday(state);
    var st = S().dayStats(state, today);
    var goal = st.goal, drunk = st.volume;
    var level = goal > 0 ? drunk / goal : 0;
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
    var n = N().ensureAlerts(state);
    var pct = Math.round((goal > 0 ? drunk / goal : 0) * 100);
    var nextLine = n.enabled ? "Ближайший напомин: " + N().nextSlot(state) : "Напоминания выключены";
    var stats = '<div class="home-stats">' +
      '<div class="row"><span>Выпито</span><b>' + drunk + " из " + goal + " мл (" + pct + "%)</b></div>" +
      '<div class="row"><span>Зачтено</span><b>' + st.credited + " мл</b></div>" +
      '<div class="row muted"><span>' + esc(nextLine) + "</span></div>" +
      "</div>";
    return "" +
      /* v141: полоса прогресса — самая верхняя на главном экране (слово 02.11). */
      '<div class="top home-bar-top"><div class="progress' + (mr.soft ? " soft" : "") + '"><div class="fill" style="width:' + fill + '%"></div><div class="label">' + drunk + "/" + goal + "</div></div></div>" +
      K().header({ ui: "home", title: esc(drink ? drink.name : "") }) +
      '<div class="home-body">' +
      '<div class="cat-stage"><button type="button" class="cat-btn" data-act="add-profile" aria-label="Записать ' + esc(drink ? drink.name : "") + " " + state.profile.volume + ' мл">' +
      '<span class="stage-note">' + uiIcon("drop") + "<span>Кот приедет следующим рейсом — тап уже пишет порцию</span></span>" +
      "</button></div>" +
      '<div class="home-dock">' +
      '<button type="button" class="round" style="--c:0;--r:0" data-act="undo" aria-label="Отменить последнюю запись">' + uiIcon("undo") + "</button>" +
      '<button type="button" class="round drink-now" style="--c:5;--r:0;background:' + (drink ? drink.color : "#2ea0ea") + '" data-act="open-drinks" aria-label="Выбор напитка: ' + esc(drink ? drink.name : "") + '">' + (drink ? glyph(drink.icon) : "") + "</button>" +
      slots +
      U().pillHtml({ slot: { c: 0, r: 2 }, act: "open-volume", icon: uiIcon("drop"), label: state.profile.volume + " мл" }) +
      "</div></div>" + stats + chartPanel(today);
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
      K().header({ ui: "history", cls: "top plain", title: "История и статистика",
        right: U().roundBtn({ ui: "volumes-open", role: "head", side: "right", act: "open-volumes", aria: "Объёмы напитков", icon: uiIcon("chevron") }) }) +
      chartPanel(selected) +
      '<div class="hist-head"><span class="hist-ico" aria-hidden="true">' + uiIcon("restore") + '</span><span>История</span><span class="grow"></span>' +
      '<button type="button" class="hist-date" data-act="open-cal-hist" aria-label="Открыть календарь и перейти к дню">' + fmtLong(selected) + "</button></div>" +
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

  function pageDrinks() {
    var list = (state.drinks || []).map(function (d) {
      return K().row({ ui: "drink", baseCls: "drow", act: "pick-drink", data: { id: d.id },
        lead: bubble(d), title: esc(d.name), sub: "гидратация " + d.hydration + "%",
        check: d.id === (state.profile && state.profile.drinkId), tick: uiIcon("tick") });
    }).join("");
    return K().header({ ui: "drinks", cls: "top plain sub", back: uiIcon("back"), title: "Напиток" }) +
      '<div class="drinks-list">' + list + "</div>";
  }

  function pageAlerts() {
    var n = N().ensureAlerts(state);
    var per = P().isPace(n) ? "Темп (самоадаптивный)" : "каждые " + P().freqLabel(n.everyMin);
    var win = N().dayWindow(state, N().weekdayIndex(N().wallToday()));
    return K().header({ ui: "alerts", cls: "top plain", title: "Уведомления" }) +
      '<div class="set-list">' +
      K().row({ ui: "alerts-on", cls: "switch-row", kind: "switch", key: "alerts-enabled", on: n.enabled,
        title: "Напоминания", sub: n.enabled ? "включены" : "выключены" }) +
      K().row({ ui: "alerts-period", act: "alert-period", title: "Интервал", right: '<span class="pct">' + esc(per) + "</span>" }) +
      K().row({ ui: "alerts-window", title: "Окно сегодня", right: '<span class="pct">' + esc(win) + "</span>" }) +
      '<div class="set-sec">До сна</div>' +
      '<div class="presets xscroll">' + B_SLEEP.map(function (m) {
        return '<button type="button" class="preset' + (Number(m) === Number(n.beforeSleepMin) ? " on" : "") +
          '" data-act="pick-bsleep" data-v="' + m + '">' + m + " мин</button>";
      }).join("") + "</div>" +
      K().row({ ui: "alerts-hold", cls: "switch-row", kind: "switch", key: "hold-until", on: !!n.holdUntilDrink,
        title: "Только если давно не пил", sub: "последняя порция держит напомин" }) +
      '<div class="set-sec">Звук</div>' +
      K().row({ ui: "alerts-sound", act: "alert-sound", title: "Звук напоминания",
        right: '<span class="pct">' + esc(N().alertSoundTitle(n.sound)) + "</span>" }) +
      '<p class="hint">' + esc(N().reminderText(state)) + "</p>" +
      '<p class="hint">Подъём и сон по дням недели приедут с настройками (M15).</p>' +
      "</div>";
  }

  function pageSettings() {
    var themeRow = function (v, label) {
      return K().row({ ui: "theme", act: "pick-theme", data: { v: v }, title: label,
        check: state.theme === v, tick: uiIcon("tick") });
    };
    var cloudStatus = cloud.signedIn
      ? "Google: вход выполнен" + (cloud.lastBackup ? ", копия " + esc(String(cloud.lastBackup)) : "")
      : "Google: не подключён";
    return K().header({ ui: "settings", cls: "top plain", title: "Настройки" }) +
      '<div class="set-list">' +
      '<div class="set-sec">Тема</div>' +
      themeRow("light", "Светлая тема") + themeRow("dark", "Тёмная тема") + themeRow("system", "По умолчанию") +
      '<div class="set-sec">Облако</div>' +
      K().row({ ui: "cloud-status", title: cloudStatus }) +
      K().row({ ui: "cloud-sign", act: "cloud-sign", title: cloud.signedIn ? "Выйти из Google" : "Войти через Google" }) +
      K().row({ ui: "cloud-sync", act: "cloud-sync", title: "Синхронизировать сейчас" }) +
      K().row({ ui: "cloud-save", act: "cloud-save", title: "Сохранить копию" }) +
      '<div class="set-sec">О приложении</div>' +
      '<div class="n-row set-ver"><span class="ttl">Версия …</span><span class="pct">' + APP_VERSION + " (" + VERSION_CODE + ")</span></div>" +
      "</div>";
  }

  function pageWeightSoon() {
    return K().header({ ui: "weight", cls: "top plain", title: "Вес" }) +
      '<div class="empty">Экран веса приедет следующим рейсом</div>';
  }

  function onbScreen() {
    if (!ui.onb) ui.onb = O().draft(ui, state, N().wallToday());
    return '<div class="screen onb-screen">' + O().screenHtml(ui.onb, { catArt: CAT_PLACEHOLDER }) + "</div>";
  }

  /* ---- оверлеи ---- */
  function overlayHtml() {
    var out = "";
    if (ui.sheet === "volume") {
      var items = (state.drinks || []).slice(0, 8).map(function (d) {
        return { id: d.id, on: d.id === ui.volumeDrinkId, color: d.color,
          name: esc(d.name), bubble: bubble(d) };
      });
      out += U().sheet({ ui: "volume", cls: "volume", title: "Объём",
        body: K().drinkPickRow({ ui: "volsheet", items: items, act: "pick-volume-drink" }) +
          U().chipRow({ baseCls: "presets xscroll vol-pick", values: VOLS, selected: ui.volumeDraft, act: "vol-chip" }),
        tail: '<button type="button" class="check center" data-act="commit-volume" aria-label="Готово">' + uiIcon("check") + "</button>" });
    } else if (ui.sheet === "alert-period") {
      var n = N().ensureAlerts(state);
      var opts = PERIODS.map(function (m) {
        return { value: m, label: "каждые " + P().freqLabel(m), on: n.everyMin === m };
      });
      opts.push({ value: -1, label: "Темп (самоадаптивный)", on: P().isPace(n) });
      out += U().sheet({ ui: "period", cls: "period", title: "Интервал напоминаний",
        body: U().optionList({ ui: "period", act: "pick-period", items: opts }) });
    } else if (ui.sheet === "alert-sound") {
      var nn = N().ensureAlerts(state);
      var sopts = N().ALERT_SOUNDS.map(function (s) {
        return { value: s.file, label: s.title, on: nn.sound === s.file };
      });
      out += U().sheet({ ui: "sound", cls: "sound", title: "Звук напоминания",
        body: U().optionList({ ui: "sound", act: "pick-sound", attr: "file", items: sopts }) });
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
    if (ui.modal === "dialog" && ui.dialogSpec) {
      var d = ui.dialogSpec;
      out += U().dialog({ ui: d.kind || "dialog", cls: "modal", scrimAct: "dialog-cancel",
        title: esc(d.title || ""), body: "<p>" + esc(d.text || "") + "</p>",
        actions: [{ act: "dialog-cancel", label: "Отмена" }, { act: d.okAct || "dialog-ok", label: d.ok || "Готово" }] });
    }
    return out;
  }

  /* ---- рендер (донор 4520, сокращённый) ---- */
  function render() {
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
    else if (ui.tab === "history") { main = pageHistory(); screenClass = "screen hist-screen"; }
    else if (ui.tab === "weight") { main = pageWeightSoon(); screenClass = "screen weight-screen"; }
    else if (ui.tab === "settings") { main = pageSettings(); screenClass = "screen settings-screen"; }
    else if (ui.tab === "alerts") { main = pageAlerts(); screenClass = "screen alerts-screen"; }
    else { main = pageHome(); screenClass = "screen home-screen"; }
    root.innerHTML = '<div class="' + screenClass + '">' + main + "</div>" +
      U().navHtml(ui) + overlayHtml() + U().toastHtml(ui);
    afterRender();
  }
  function afterRender() {
    U().fitPhone();
    U().bindPhone();
    initSwipes();
    initSwipeTaps();
    var sc = document.querySelector(".chart-scroll");
    if (sc) {
      sc.scrollLeft = ui.chartLeft == null ? sc.scrollWidth : ui.chartLeft;
      if (!sc._bound) {
        sc._bound = true;
        sc.addEventListener("scroll", function () { ui.chartLeft = sc.scrollLeft; });
      }
    }
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
      ui.tab = ds.tab; ui.page = null; ui.sheet = null; ui.modal = null;
      closeOpenSwipes(); render(); return;
    }
    if (act === "back") {
      if (ui.sheet) { ui.sheet = null; render(); return; }
      if (ui.page === "drinks") { ui.page = null; ui.tab = ui.drinkReturn || "home"; render(); return; }
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
    if (act === "open-cal-hist") { toast("Календарь приедет с настройками (M15)"); return; }
    if (act === "open-volumes") { ui.page = "volumes"; render(); return; }
    if (act === "toggle") {
      var n = N().ensureAlerts(state);
      if (ds.key === "alerts-enabled") n.enabled = !n.enabled;
      else if (ds.key === "hold-until") n.holdUntilDrink = !n.holdUntilDrink;
      save(); alertsSync(); render(); return;
    }
    if (act === "alert-period") { ui.sheet = "alert-period"; render(); return; }
    if (act === "pick-period") {
      var np = N().ensureAlerts(state);
      np.everyMin = Number(ds.v);
      save(); alertsSync(); ui.sheet = null; render(); return;
    }
    if (act === "pick-bsleep") {
      var nb = N().ensureAlerts(state);
      nb.beforeSleepMin = Number(ds.v);
      save(); alertsSync(); render(); return;
    }
    if (act === "alert-sound") { ui.sheet = "alert-sound"; render(); return; }
    if (act === "pick-sound") {
      var ns = N().ensureAlerts(state);
      ns.sound = ds.file;
      save(); alertsSync(); ui.sheet = null; render(); return;
    }
    if (act === "pick-theme") {
      state.theme = ds.v === "light" || ds.v === "dark" || ds.v === "oneplus" ? ds.v : "system";
      save(); applyTheme(); render(); return;
    }
    if (act === "cloud-sign") {
      if (!(window.WaterGoogle)) { toast("Вход через Google доступен в приложении Android"); return; }
      if (cloud.signedIn) window.WaterGoogle.signOut(); else window.WaterGoogle.signIn();
      return;
    }
    if (act === "cloud-save") { cloudUpload("manual"); return; }
    if (act === "cloud-sync") {
      if (!(window.WaterGoogle && typeof window.WaterGoogle.restore === "function")) {
        toast("Синхронизация доступна в приложении Android"); return;
      }
      cloud.pending = "sync"; cloud.busy = true;
      window.WaterGoogle.restore();
      return;
    }
    if (act === "set-ver") { /* вход M18 слушает документ сам */ return; }
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
    if (W.WT2G) W.WT2G.bind(env);
    render();
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
