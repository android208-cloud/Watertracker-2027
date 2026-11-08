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
  /* Слово владельца 06.11: кота нет — в шапке онбординга круг с жидкостью,
     статичное заполнение 60% (донорский hero держал кота). */
  function onbOrbArt() {
    return '<div class="wt-orb onb-orb">' +
      Wd().waterHtml({ frac: 0.6, color: Wd().liquidColor(state) }) +
      Wd().orbRing + "</div>";
  }

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
  /* v-live: окружение пака: оформление жидкости едет с базой и возвращается
     (донор 5977 importState / 6005 store), включая настройки волны. */
  function lcEnv() {
    return {
      lcStore: function () { return window.LiquidColor && LiquidColor.store ? LiquidColor.store() : null; },
      importLc: function (lc) { if (window.LiquidColor && LiquidColor.importState) LiquidColor.importState(lc); }
    };
  }

  function nowHM() { /* донор: часы в поясе TZ (Europe/Samara), не локаль машины */
    var p = tzParts();
    return p.hour + ":" + p.minute;
  }
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
    /* Донор 640-652 целиком; next-вариант был обрезан и терял имя и почту —
       строка профиля не могла подписаться. Оставлен запас s.at. */
    s = s || {};
    cloud.available = s.available !== false;
    cloud.signedIn = !!s.signedIn;
    cloud.clientIdSet = !!s.clientIdSet;
    cloud.name = s.name || "";
    cloud.email = s.email || "";
    cloud.picture = s.picture || "";
    cloud.lastBackup = s.at || s.lastBackup || "";
    cloud.pkg = s.pkg || "";
    cloud.sha1 = s.sha1 || "";
    cloud.clientHead = s.clientHead || "";
    cloud.accountId = s.accountId || "";
  }
  function cloudRead() {
    if (!(window.WaterGoogle && typeof window.WaterGoogle.state === "function")) return;
    try { cloudFrom(JSON.parse(window.WaterGoogle.state() || "{}")); } catch (e) {}
  }
  /* ---------- Портрет: только на время этого запуска ------------------------
     Нужно так: вошёл в аккаунт при интернете — в круге фото; нет интернета
     или приложение перезапущено без сети — иконка по умолчанию. Поэтому фото
     держим ТОЛЬКО в памяти текущего запуска и никогда не кладём в память
     телефона: из кэша оно больше не всплывёт.
     Портрет приводим к квадрату сами (это самая простая операция, которая
     одинаково работает везде), а круг рисует оформление страницы. */
  var AVATAR_KEY = "cup-tracker-avatar";
  var AVATAR_PX = 256;
  /* Что показываем прямо сейчас: пусто — иконка по умолчанию. */
  var avatarLive = "";
  var avatarTried = "";
  var avatarTrying = false;

  /* Копии фото от прошлых сборок в телефоне больше не нужны. */
  function avatarPurge() {
    try {
      if (localStorage.getItem(AVATAR_KEY) != null) localStorage.removeItem(AVATAR_KEY);
    } catch (e) { /* не критично */ }
  }

  function avatarSrc() {
    return avatarLive || "assets/images/profile.png";
  }

  /* Центральный квадрат картинки, уменьшенный до 256 px. */
  function avatarSquare(src) {
    return new Promise(function (resolve, reject) {
      var im = new Image();
      im.onload = function () {
        try {
          var w = im.naturalWidth || 0;
          var h = im.naturalHeight || 0;
          var side = Math.min(w, h);
          if (!side) throw new Error("пустая картинка");
          var c = document.createElement("canvas");
          c.width = AVATAR_PX;
          c.height = AVATAR_PX;
          var g = c.getContext("2d");
          g.drawImage(im, (w - side) / 2, (h - side) / 2, side, side, 0, 0, AVATAR_PX, AVATAR_PX);
          resolve(c.toDataURL("image/png"));
        } catch (e) { reject(e); }
      };
      im.onerror = function () { reject(new Error("фото не открылось")); };
      im.src = src;
    });
  }

  /* Google умеет сам отдать квадратный портрет нужного размера. */
  function avatarBigUrl(url) {
    if (!/^https:\/\//.test(url)) return "";
    return url.replace(/=s\d+(-c)?$/, "") + "=s" + AVATAR_PX + "-c";
  }

  function avatarBlobUrl(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result || "")); };
      fr.onerror = function () { reject(new Error("фото не прочиталось")); };
      fr.readAsDataURL(blob);
    });
  }

  /* Скачали — показываем в этом запуске. Ошибки тихие: останется иконка. */
  function avatarFetch() {
    var pic = /^https:\/\//.test(cloud.picture || "") ? cloud.picture : "";
    /* Фикс 07.11 (уедет со следующим релизом): оболочка после входа шлёт
       повторное состояние с мгновенно пустой ссылкой на фото, и портрет
       сносило через секунду — а обратно он уже не скачивался (ссылка
       помечена попробованной). Пустая ссылка при живом входе портрет
       не трогает; сброс — только при выходе из аккаунта. */
    if (!pic) { if (!cloud.signedIn) avatarLive = ""; return; }
    if (avatarLive || avatarTrying || avatarTried === pic) return;
    avatarTrying = true;
    var big = avatarBigUrl(pic) || pic;
    fetch(big, { mode: "cors", cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("фото " + r.status);
      return r.blob();
    }).then(avatarBlobUrl).then(avatarSquare).then(function (data) {
      avatarLive = data;
      avatarTrying = false;
      avatarTried = pic;
      render();
    }).catch(function (e) {
      /* Своими силами не вышло — просим оболочку (ей сеть доступнее). */
      avatarTrying = false;
      avatarTried = pic;
      avatarViaShell(pic);
    });
  }

  /* Запасной путь: картинку скачивает оболочка, страница приводит её к квадрату. */
  var avatarAsked = "";
  function avatarViaShell(url) {
    if (!url || avatarAsked === url) return;
    if (!(window.WaterGoogle && typeof window.WaterGoogle.fetchPicture === "function")) return;
    avatarAsked = url;
    try { window.WaterGoogle.fetchPicture(); } catch (e) { /* ничего не ломаем */ }
  }

  window.__avatarInfo = function () {
    var img = document.querySelector(".ava-round img");
    var src = img ? (img.getAttribute("src") || "") : "";
    return {
      src: src.slice(0, 24),
      иконка: src.indexOf("assets/images/profile.png") >= 0,
      вПамяти: !!avatarLive,
      копияВТелефоне: localStorage.getItem(AVATAR_KEY) != null,
      ссылка: cloud.picture || ""
    };
  };

  /* После отрисовки: показать картинку только когда она правда загрузилась. */
  function markAvatars() {
    var list = document.querySelectorAll(".ava-round img");
    Array.prototype.forEach.call(list, function (img) {
      var box = img.parentNode;
      if (!box || !box.classList) return;
      if (img.complete && img.naturalWidth > 0) { box.classList.add("loaded"); return; }
      /* Усиление 07.11: донор дожидается ближайшей перерисовки — на медленном
         WebView портрет мог оставаться невидимым; проявляем по факту загрузки. */
      if (!img.complete) img.addEventListener("load", function () {
        if (img.naturalWidth > 0) box.classList.add("loaded");
      }, { once: true });
    });
  }
  /* Любой обмен с Диском начинается с чтения облачной копии и слияния её
     с телефоном — и только потом телефон отправляет объединённую историю
     (донор 866-882). v85: владелец сам нажал обмен — сброс-удержание снято. */
  function cloudSyncNow(mode) {
    if (!cloudBridge() || !cloud.signedIn) { toast("Сначала войдите в Google-аккаунт"); return; }
    if (cloud.busy) { toast("Обмен с Диском уже идёт"); return; }
    if (!(window.WaterGoogle && typeof window.WaterGoogle.restore === "function")) {
      toast("Синхронизация доступна в приложении Android"); return;
    }
    if (state.resetHold) { delete state.resetHold; save(); }
    cloud.busy = true;
    cloud.pending = mode || "sync";
    cloud.chunks = [];
    render();
    window.WaterGoogle.restore();
  }

  /* v85 у донора: ремонт облака — выкинуть копию вместе с накопившимися
     метками удалений. Никакого предварительного чтения: смысл именно в том,
     чтобы перезаписать отравленный файл, не впуская его содержимое на
     устройство. Данные телефона не трогаются; следующая «Синхронизация»
     выложит их заново. Дорога — скрытая, за портретом (слово владельца 07.11). */
  function cloudClear() {
    if (!cloudBridge() || !cloud.signedIn) { toast("Сначала войдите в Google-аккаунт"); return; }
    if (cloud.busy) { toast("Обмен с Диском уже идёт"); return; }
    cloud.busy = true;
    cloud.pending = "clear";
    cloud.chunks = [];
    render();
    window.WaterGoogle.backup(JSON.stringify({
      source: "watercat-24", version: 1, exportedAt: new Date().toISOString(),
      entries: [], weights: [], dayGoals: {}, tombstones: { e: {}, w: {} }
    }));
  }

  /* Параметры входа Google (донор 838-864): сверка сборки с консолью.
     Пакет-запас — настоящий пакет этой ветки; на устройстве мост присылает
     живые значения. */
  function cloudDiag() {
    var vals = [
      ["Пакет", cloud.pkg || "ru.watermeter.tracker.next"],
      ["Отпечаток SHA-1", cloud.sha1 || "не прочитался"],
      ["Сервисы Google Play", cloud.available ? "доступны" : "не найдены"],
      ["Режим входа", "по пакету и подписи (ключ не нужен)"]
    ];
    var lines = ["Приложению нужен Android-клиент в Google Cloud с этими значениями:"];
    vals.forEach(function (kv) {
      lines.push("<b>" + kv[0] + ":</b> <span class=\"wrapval\">" + esc(kv[1]) + "</span>");
    });
    lines.push("В том же проекте на странице «Доступ к данным» должна быть область drive.appdata, " +
      "а ваша почта — в «Тестовых пользователях». Правки доезжают за несколько минут.");
    ui.dialogSpec = {
      kind: "google-diag",
      title: "Параметры входа Google",
      body: "<p>" + lines.join("<br>") + "</p>",
      copyText: "Параметры входа Google\n" + vals.map(function (kv) { return kv[0] + ": " + kv[1]; }).join("\n"),
      actions: [{ act: "google-diag-copy", label: "Скопировать" }, { act: "dialog-cancel", label: "Закрыть" }]
    };
    ui.modal = "dialog";
    render();
  }

  function cloudUpload(mode) {
    if (!(window.WaterGoogle && typeof window.WaterGoogle.backup === "function")) {
      toast("Облако: вход через Google доступен в приложении Android");
      return;
    }
    var pack = Y().exportPack(state, lcEnv());
    cloud.pendingSig = Y().cloudPackSign(pack);
    cloud.pending = mode;
    cloud.busy = true;
    window.WaterGoogle.backup(JSON.stringify(pack));
  }
  function cloudApply(withSettings) {
    var text = (cloud.chunks || []).join("");
    var mode = cloud.pending || "restore";
    var packPre = null;
    try { packPre = JSON.parse(text); } catch (e) { packPre = null; }
    /* v145: восстановление с настройками — только явным выбором: диалог
       «история + настройки / только история» (по умолчанию — только история). */
    if (!withSettings && mode === "restore" && packPre && packPre.settings && !ui.settingsChoice) {
      ui.settingsChoice = { src: "cloud", text: text, mode: mode };
      cloud.busy = false;
      render();
      return;
    }
    cloud.chunks = null;
    cloud.busy = false;
    cloud.pending = "";
    var pack = packPre;
    var hasEntries = !!(pack && Array.isArray(pack.entries) && pack.entries.length);
    if (!hasEntries) {
      /* В облаке пусто, а в телефоне есть записи: это первая копия, отправляем её. */
      if (mode !== "restore" && state.entries && state.entries.length) {
        cloud.pending = mode;
        cloud.firstCopy = true;
        cloud.busy = true;
        cloudUpload(mode);
        return;
      }
      if (mode !== "auto" && mode !== "quiet") toast("В облаке ещё нет копии истории");
      render();
      return;
    }
    var env = lcEnv();
    if (withSettings) env.withSettings = true;
    var res = Y().applyPack(state, pack, mode === "sync" ? "merge" : "auto", env);
    if (!res || !res.ok) {
      toast("Копия не разобралась");
      render();
      return;
    }
    state.cloudSig = Y().cloudPackSign(pack);
    state.historySource = "google-drive";
    var sorted = state.entries;
    state.historyCounts = {
      entries: sorted.length,
      from: sorted.length ? sorted[0].date : "",
      to: sorted.length ? sorted[sorted.length - 1].date : ""
    };
    save();
    cloud.applied = true; /* донор 1053: состояние донесёт настоящее время копии */
    cloud.lastMergeAdded = res.added || 0;
    if (mode === "sync") { cloudUpload("sync"); return; }
    var txt = Y().cloudSay(mode === "restore" ? "restore" : "auto", res.added || 0, (state.entries || []).length);
    if (txt) toast(txt);
    render();
  }

  W.__googleState = function (json) {
    try {
      cloudFrom(typeof json === "string" ? JSON.parse(json) : (json || {}));
      /* Вошли в аккаунт — сразу берём фото (только при живом интернете, донор 1100). */
      avatarFetch();
      /* Только что применили копию — запоминаем её настоящее время (донор 1213). */
      if (cloud.applied && cloud.lastBackup) {
        cloud.applied = false;
        state.cloudStamp = cloud.lastBackup;
        save();
      }
      render();
    } catch (e) { /* ничего не ломаем */ }
  };
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
  /* Старая оболочка может прислать портрет — он больше не нужен (донор 1308). */
  /* Портрет пришёл из оболочки: приводим к квадрату и держим в памяти запуска. */
  W.__googlePicture = function (json) {
    var o = json || {};
    if (typeof o === "string") { try { o = JSON.parse(o); } catch (e) { o = {}; } }
    if (!o.url || !o.data) return;
    if (cloud.picture && o.url !== cloud.picture) return;
    avatarSquare(o.data).then(function (data) {
      avatarLive = data;
      render();
    }).catch(function () { /* останется иконка по умолчанию */ });
  };
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
    var cal = todayStr(); /* донор 2505: настенный календарный день */
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
    var cup = cupModel(wallMsNow()); /* донор 2513 */
    ui._cupLv = cup.level; /* донор 2514-2515: сигнатура миски для cupSecTick */
    ui._cupKind = cup.kind;
    var pins = state.customShortcuts || []; /* донор 2519 */
    var slots = "";
    var pinCount = 0;
    if (state.rowCustom) {
      for (var i = 0; i < LC.SHORTCUT_LIMIT; i++) {
        var pin = pins[i];
        var pinned = pin && drinkById(pin.drinkId);
        if (pinned) {
          pinCount++;
          /* Выбранная сейчас пара «напиток + объём» подсвечена той же рамкой,
             что быстрый ряд и ряд объёмов: цвет берём от подложки значка. */
          var pinOn = pinned.id === drink.id && pin.volume === state.profile.volume;
          slots += '<button type="button" class="shortcut' + (pinOn ? " on" : "") + '" style="--c:' + i + ";--r:1;--ring:" + pinned.color + '" data-act="apply-shortcut" data-slot="' + i + '" data-id="' + pinned.id + '" data-volume="' + pin.volume + '" aria-label="' + esc(pinned.name) + " " + pin.volume + ' мл. Удерживайте, чтобы изменить">' +
            bubble(pinned, "fill") + '<span class="vol">' + pin.volume + "</span></button>";
        } else {
          slots += '<button type="button" class="pin-add" style="--c:' + i + ';--r:1" data-act="add-pin" data-slot="' + i + '" aria-label="Добавить избранный напиток">' + uiIcon("plus") + "</button>";
        }
      }
    } else {
      for (var j = 0; j < LC.SHORTCUT_LIMIT; j++) {
        var s = cuts[j];
        if (!s) continue;
        /* Текущая пара «напиток + объём» подсвечена той же рамкой, что в
           избранном ряду, в ряду объёмов и у быстрых напитков. */
        var cutOn = s.drink.id === drink.id && s.volume === state.profile.volume;
        slots += '<button type="button" class="shortcut' + (cutOn ? " on" : "") + '" style="--c:' + j + ";--r:1;--ring:" + s.drink.color + '" data-act="apply-shortcut" data-id="' + s.drink.id + '" data-volume="' + s.volume + '">' +
          bubble(s.drink, "fill") + '<span class="vol">' + s.volume + "</span></button>";
      }
    }
    var dim = (ui.sheet === "volume" && ui.pinning) ? " dim" : "";
    var hint = "";
    if (state.rowCustom && !pinCount) hint = '<p class="hint dock-hint">Нажмите +, чтобы собрать избранный ряд.</p>';
    else if (!state.rowCustom && !cuts.length) hint = '<p class="hint dock-hint">Ярлыки появятся из истории. Пример — в настройках.</p>';
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
      '<div class="home-body' + dim + '">' +
      '<div class="cat-stage"><button type="button" class="wt-orb" data-act="add-profile" aria-label="Записать ' + esc(drink ? drink.name : "") + " " + state.profile.volume + ' мл">' +
      Wd().waterHtml({ frac: level, color: (function () {
          if (window.LiquidColor) {
            var liqL = LiquidColor.color(state, waterToday(), level);
            if (LiquidColor.ramp && LiquidColor.mode && LiquidColor.mode() === "belt") {
              var rrL = LiquidColor.ramp(state, waterToday(), level);
              if (rrL && !rrL.flat) return rrL.top;
            }
            return liqL;
          }
          return Bc().visibleColor() || (rampB.flat ? Wd().liquidColor(state) : rampB.top);
        })(),
        rampColors: (window.LiquidColor && LiquidColor.ramp && LiquidColor.mode && LiquidColor.mode() === "belt")
          ? (function () { var rrL = LiquidColor.ramp(state, waterToday(), level); return rrL && !rrL.flat ? rrL.colors : null; })()
          : (rampB.flat ? null : (Bc().visibleRamp() || rampB.colors)),
        /* пояса донорской рампы: стыки {c, from, to} — вода красится полосами,
           как в доноре (1551-1552): пояса едят и волновой, и плоский режим */
        belts: (window.LiquidColor && LiquidColor.ramp && LiquidColor.mode && LiquidColor.mode() === "belt")
          ? (function () {
              var rrL = LiquidColor.ramp(state, waterToday(), level);
              return rrL && !rrL.flat && rrL.belts
                ? rrL.belts.map(function (s) { return { c: s.c, from: s.from, to: s.to }; })
                : null;
            })()
          : (rampB.flat ? null : (rampB.belts.map(function (bl, i) {
              var vc = Bc().visibleBelts();
              return { c: (vc && vc[i]) || bl.c, from: bl.from, to: bl.to };
            }))),
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
      '<button type="button" class="edit-toggle' + (state.rowCustom ? " on" : "") + '" style="--c:5;--r:1" data-act="edit-row" aria-label="' + (state.rowCustom ? "Показать недавние" : "Показать избранные") + '">' + uiIcon("arrows") + "</button>" +
      U().pillHtml({ slot: { c: 0, r: 2 }, act: "open-volume", icon: uiIcon("drop").replace('class="ui-mask"', 'class="ui-mask mini-cat"'), label: state.profile.volume + " мл" }) +
      /* M25 модуль 3 (донор 2568): миска-тамагочи в слоте (2,2) — модель из
         истории, кот не участвует. */
      '<div class="pill-slot" style="--c:2;--r:2"><div class="pill cup-pill" role="img" aria-label="Чашка котика: ' + esc(cup.label) + '">' + K().miniCup(cup.level, cup.color) + "<span>" + esc(cupLabelFor(cup, state.cupLabel)) + "</span></div></div>" +
      /* M25 модуль 4 (донор 2569): кнопка погоды в слоте (4,2). */
      '<button type="button" class="round dark" style="--c:4;--r:2" data-act="open-weather" aria-label="Погода">' + weatherIcon(LC.levelOn(state, cal, cal)) + "</button>" +
      /* M25 модуль 5 (донор 2570): кнопка активности в слоте (5,2). */
      '<button type="button" class="round dark" style="--c:5;--r:2" data-act="open-fitness" aria-label="Физическая активность: ' + esc(activityRow(LC.activityOn(state, cal, cal))[1]) + '">' + activityIcon(LC.activityOn(state, cal, cal)) + "</button>" +
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
    var rows;
    if (ui.sorting) {
      var order = ui.sortOrder || state.drinks.map(function (d) { return d.id; });
      rows = '<div class="sort-list">' + order.map(function (id) {
        var d = drinkById(id);
        if (!d) return "";
        return K().row({ ui: "sort", baseCls: "sort-item drow", tag: "div", data: { id: d.id }, nameClass: "name",
          lead: bubble(d), title: esc(d.name),
          right: '<span class="pct">' + d.hydration + '%</span><span class="handle" title="Перетащить">' + uiIcon("handle") + "</span>" });
      }).join("") + "</div>";
    } else {
      rows = state.drinks.map(function (d) {
        var current = ui.drinkReturn === "pin" && ui.pinDrinkId === d.id;
        if (!window.UiKit) return "";
        return K().swipeRow({ ui: "drink",
          sid: "d-" + d.id,
          actions: [
            { act: "edit-drink", id: d.id, icon: uiIcon("pencilMask") },
            { act: "ask-del-drink", id: d.id, cls: "danger", icon: uiIcon("trash") }
          ],
          front: K().row({ ui: "drink", baseCls: "swipe-front drow", cls: current ? "pin-current" : "", act: "pick-drink",
            data: { id: d.id }, nameClass: "name", lead: bubble(d), title: esc(d.name),
            right: '<span class="pct">' + d.hydration + "%</span>" })
        });
      }).join("") +
        K().row({ ui: "add-drink", baseCls: "drow", act: "add-drink", nameClass: "name",
          lead: '<span class="bubble" style="background:#2ea0ea">' + uiIcon("plus") + "</span>", title: "Добавить напиток" });
    }
    var right = ui.sorting ? "" : K().roundBtn({ ui: "sort-open", role: "head", side: "right", act: "open-sort", aria: "Сортировка", icon: uiIcon("sort") });
    var selectedVol = ui.drinkReturn === "history" && ui.addDraft ? ui.addDraft.volume : (ui.drinkReturn === "pin" ? ui.volumeDraft : state.profile.volume);
    var volRow = ui.sorting ? "" : recentVolumeRow(selectedVol);
    var title = ui.drinkReturn === "pin" ? "Избранный напиток" : "Выбор напитка";
    return K().header({ ui: "drinks", back: uiIcon("back"), title: title, right: right }) + volRow + rows;
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
        radio: true, on: on
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
  /* M25: уведомления и настройки — донорский рендерер (m25-settings-ui.js). */
  function pageAlerts() {
    return SU().pageFolderAlerts(settingsEnv());
  }

  function pageSettings() {
    return SU().pageSettings(settingsEnv());
  }


  /* ================= M25 (sLayout): обвязка донорской машины настроек ======
     Донорские файлы байт-в-байт: m25-settings-model.js (раскладка/каталоги/
     compose/операции) и m25-settings-ui.js (страницы/модалки/ctx/labels).
     Здесь: settingsEnv() донора (app.js 4497) c шимами к модулям next,
     хелперы и хендлеры донора (grab байтами), обёртка сид-мест, колесо. */

  /* M25: заглушки неприехавших модулей (видимые пустоты по спеке). */
  var LC = W.WT2L;
  var TZ = N().TZ; /* пояс донора (m13) для wallMsNowSec */
  var ALERT_SOUNDS = N().ALERT_SOUNDS;
  var THEME_NAMES = { light: "Светлая тема", dark: "Тёмная тема", system: "По умолчанию", oneplus: "Oneplus 7" };
  var noBuiltinBase = false; /* в next встроенной history.json нет */
  var catRiveFailed = false; /* кот убран (06.11) */

  function periodOpts() { return N().periodOpts(state); }
  function nextSlotMs(now) { return N().nextSlotMs(state, now); }
  function dialHtml(h, m, view, uiKey) {
    if (!window.UiKit) return "";
    var o = { h: h, m: m, view: view, ui: uiKey || null };
    /* v97: только шторка времени ЗАПИСИ получает циферблат в цвет напитка;
       напоминания, начало суток и пауза остаются синими (нет напитка).
       LC.inkOn сам отбракует невалидный цвет — тогда дефолтный синий. */
    if (uiKey === "time" && ui.timeDrinkColor) {
      var ink = LC.inkOn(ui.timeDrinkColor);
      if (ink) { o.accent = ui.timeDrinkColor; o.ink = ink; }
    }
    return K().clockDial(o);
  }


  function dialActive() { return resolvedTheme() === "oneplus" || !!state.dialTime; }


  function vibroTick() {
    if (state.vibroDial === false) return;
    try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {}
  }

  /* Стрелка и шапка обновляются на месте, без перерисовки экрана: во время
     драга DOM заменять нельзя — потеряется pointer-capture. */
  function paintDialInPlace() {
    var root = document.querySelector(".dial");
    if (!root || !ui.dial) return;
    var face = root.querySelector(".dial-face");
    if (!face) return;
    var h = ui.dial.h, m = ui.dial.m, view = ui.dial.view;
    var ang = view === "h" ? (h % 12) * 30 : m * 6;
    var ring = view === "h" && !(h >= 1 && h <= 12) ? 26 : 40;
    var a = ang * Math.PI / 180;
    var sx = 50 + ring * Math.sin(a), sy = 50 - ring * Math.cos(a);
    var sel = face.querySelector(".dial-sel");
    if (sel) { sel.style.left = sx.toFixed(2) + "%"; sel.style.top = sy.toFixed(2) + "%"; }
    var hand = face.querySelector(".dial-hand");
    if (hand) { hand.style.height = ring + "%"; hand.style.transform = "rotate(" + ang + "deg)"; }
    var dps = root.querySelectorAll(".dial-head .dp");
    if (dps[0]) dps[0].textContent = (h < 10 ? "0" : "") + h;
    if (dps[1]) dps[1].textContent = (m < 10 ? "0" : "") + m;
  }

  /* v95 (слово владельца 26.10.2026: «выбор должен засчитываться при
     отпускании пальца»): отпускание пальца и тап по шапке «ЧЧ:ММ» обменивают
     ТОЛЬКО блок .dial на месте, а не перерисовывают всё приложение. Прежний
     render() на живом устройстве стоил сотен миллисекунд — следующий палец
     попадал в пустоту, и циферблат «работал не очень хорошо». Прием тот же,
     что у панели календаря (v94). Страховка: блока нет — полный render(). */
  function renderDialBlock() {
    var root = document.querySelector(".dial");
    if (!root || !root.parentNode || !ui.dial) { render(); return; }
    var tmp = document.createElement("div");
    tmp.innerHTML = dialHtml(ui.dial.h, ui.dial.m, ui.dial.view, ui.dialKey);
    var fresh = tmp.querySelector(".dial");
    if (!fresh) { render(); return; }
    root.parentNode.replaceChild(fresh, root);
    var dface = fresh.querySelector("[data-dial-face]");
    if (dface) setupDialFace(dface);
  }


  function setupDialFace(el) {
    if (el._dialBound) return;
    el._dialBound = 1;
    var dragging = false;
    var activeId = null; /* v96: жест принадлежит одному пальцу */
    function valueAt(cx, cy) {
      var r = el.getBoundingClientRect();
      var dx = cx - (r.left + r.width / 2);
      var dy = cy - (r.top + r.height / 2);
      var rad = Math.sqrt(dx * dx + dy * dy) / (r.width / 2);
      var ang = Math.atan2(dx, -dy) * 180 / Math.PI;
      if (ang < 0) ang += 360;
      if (ui.dial.view === "h") {
        var idx = Math.round(ang / 30) % 12;
        return rad > 0.66 ? (idx === 0 ? 12 : idx) : (idx === 0 ? 0 : idx + 12);
      }
      return Math.round(ang / 6) % 60;
    }
    function applyVal(v) {
      if (ui.dial.view === "h") {
        if (ui.dial.h === v) return false;
        ui.dial.h = v;
      } else {
        if (ui.dial.m === v) return false;
        ui.dial.m = v;
      }
      vibroTick();
      return true;
    }
    el.addEventListener("pointerdown", function (e) {
      if (!ui.dial) return;
      if (!e.isPrimary) return; /* v96: второй палец жест не перехватывает */
      dragging = true;
      activeId = e.pointerId;
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      if (applyVal(valueAt(e.clientX, e.clientY))) paintDialInPlace();
      e.preventDefault();
    });
    el.addEventListener("pointermove", function (e) {
      if (!dragging || !ui.dial) return;
      if (activeId != null && e.pointerId !== activeId) return;
      if (applyVal(valueAt(e.clientX, e.clientY))) paintDialInPlace();
    });
    /* v96: отмена — НЕ отпускание. Раньше pointercancel (браузер забирал
       жест из-за touch-action: manipulation) засчитывался как отпускание и
       переключал часы на минуты прямо под пальцем. Теперь по отмене жест
       просто останавливается: значение остаётся, куда палец успел указать,
       экран не переключается. Засчитывает выбор только настоящее
       отпускание (pointerup) — как владелец и просил 26.10. */
    function finish(e) {
      if (!dragging) return;
      if (e && activeId != null && e.pointerId != null && e.pointerId !== activeId) return;
      dragging = false;
      activeId = null;
      if (e && e.type === "pointercancel") return;
      if (ui.dial && ui.dial.view === "h") { ui.dial.view = "m"; vibroTick(); }
      renderDialBlock(); /* v95: отпускание засчитывает выбор и мгновенно меняет экран */
    }
    el.addEventListener("pointerup", finish);
    el.addEventListener("pointercancel", finish);
  }


  function initFields() {
    document.querySelectorAll("[data-field]").forEach(function (el) {
      el.addEventListener("change", onField);
      if (el.dataset.field === "drink-name" || el.dataset.field === "hydration" ||
          el.dataset.field.indexOf("ntitle-") === 0 || el.dataset.field.indexOf("ntext-") === 0) {
        el.addEventListener("input", onField);
      }
    });
  }


  function onField(e) {
    var el = e.currentTarget;
    var key = el.dataset.field;
    /* v135: тексты уведомлений — пишем на каждый ввод, без полного рендера
       (иначе каретка прыгает); живой пример обновляем точечно. */
    if (key.indexOf("ntitle-") === 0 || key.indexOf("ntext-") === 0) {
      var np = key.split("-");
      var cas = np[1] === "met" ? "met" : "normal";
      var fld = np[0] === "ntitle" ? "t" : "b";
      var n = ensureAlerts();
      if (!n.texts || typeof n.texts !== "object") n.texts = {};
      if (!n.texts[cas] || typeof n.texts[cas] !== "object") n.texts[cas] = {};
      n.texts[cas][fld] = String(el.value).slice(0, fld === "t" ? 65 : 240);
      save();
      alertsSync();
      var pv = document.querySelector('.nt-preview[data-case="' + cas + '"]');
      if (pv) {
        var rr = notifyTextsRender(cas);
        pv.innerHTML = "<b>" + esc(rr.title) + "</b><span>" + esc(rr.text) + "</span>";
      }
      return;
    }
    if (key === "goal") {
      var n = Number(el.value);
      if (n >= 500 && n <= 8000) { state.goalMl = Math.round(n); save(); if (e.type === "change") render(); }
      return;
    }
    if (key === "weight") {
      var w = Number(el.value);
      if (w >= 20 && w <= 300) { state.weightKg = Math.round(w * 10) / 10; save(); }
      return;
    }
    if (key === "from") { state.notifications.from = el.value; save(); render(); return; }
    if (key === "to") { state.notifications.to = el.value; save(); render(); return; }
    if (key === "every") { state.notifications.everyMin = Number(el.value); save(); render(); return; }
    if (key === "drink-name" && ui.createDraft) {
      ui.createDraft.name = el.value.slice(0, 100);
      var c = document.querySelector(".counter");
      if (c) c.textContent = ui.createDraft.name.length + "/100";
      el.classList.remove("bad");
      var err = document.querySelector(".err");
      if (err) err.textContent = "";
      ui.nameError = false;
      return;
    }
    if (key === "hydration" && ui.createDraft) {
      ui.createDraft.hydration = Number(el.value);
      var b = document.querySelector(".hyd-val");
      if (b) b.textContent = el.value + "%";
    }
  }


  function applyHabitSchedule() {
    if (!window.HabitSchedule) { toast("Модуль расписания не загрузился"); render(); return; }
    var n = ensureAlerts();
    var auto = window.HabitSchedule.autoWindows(state.entries, {
      dayStart: state.dayStart || "02:00",
      afterWakeMin: n.afterWakeMin, beforeSleepMin: n.beforeSleepMin,
      todayIso: todayStr()
    });
    if (!auto.ok) { toast("Данных пока мало — предложение появится позже"); render(); return; }
    var changed = 0;
    for (var i = 0; i < 7; i++) {
      var w = { wake: auto.days7[i].wake, sleep: auto.days7[i].sleep };
      if (!n.days[i] || n.days[i].wake !== w.wake || n.days[i].sleep !== w.sleep) changed++;
      n.days[i] = w;
    }
    state.habitAuto = 1;
    save();
    alertsSync();
    toast(changed
      ? "Применено: будни в авторежиме по привычке, выходные — среднее"
      : "Авторежим включён: период уже совпадает с привычкой");
    render();
  }


  function applyPeriodGoal(key) {
    if (!window.HabitSchedule || !HabitSchedule.periods) { toast("Модуль расписания не загрузился"); render(); return; }
    var hit = null;
    periodList().forEach(function (pp) { if (pp.key === key && pp.ml) hit = pp; });
    if (!hit) { toast("Период ещё не накопил данных"); render(); return; }
    if (!state.paceGoals || typeof state.paceGoals !== "object") state.paceGoals = {};
    state.paceGoals[key] = hit.ml;
    save();
    alertsSync();
    toast("Период «" + hit.label + "»: напоминания ведут к " + hit.ml + " мл");
    render();
  }


  function applyAllPeriodGoals() {
    var pers = periodList().filter(function (pp) { return pp.ml; });
    if (!pers.length) { toast("Периоды ещё не накопили данных"); render(); return; }
    if (!state.paceGoals || typeof state.paceGoals !== "object") state.paceGoals = {};
    pers.forEach(function (pp) { state.paceGoals[pp.key] = pp.ml; });
    save();
    alertsSync();
    toast("Приняты объёмы периодов: " + pers.map(function (pp) { return pp.label.toLowerCase() + " " + pp.ml; }).join(", "));
    render();
  }


  function resetPeriodGoals() {
    state.paceGoals = {};
    save();
    alertsSync();
    toast("Периоды сброшены: напоминания ведут к норме дня");
    render();
  }


  var sheetSeen = null; /* механизм шторок донора (app.js 2275-2299) */
  var sheetLeaving = false, sheetLeaveToken = 0, sheetLeaveTimer = null;

  function markSheetEntrance() {
    var sheet = document.querySelector(".sheet");
    if (!sheet) { sheetSeen = null; return; }
    var key = String(ui.sheet || "");
    // Если предыдущая шторка в этот момент уезжала, а на её место пришла новая —
    // уезд отменяем, иначе отложенный финиш снесёт уже открытую шторку.
    if (sheetLeaving) {
      sheetLeaveToken++;
      sheetLeaving = false;
      clearTimeout(sheetLeaveTimer);
      sheetLeaveTimer = null;
      sheetSeen = null;
    }
    if (sheetSeen === key) return;
    sheetSeen = key;
    sheet.classList.add("enter");
    var scrim = document.querySelector(".scrim");
    if (scrim) scrim.classList.add("enter");
  }


  function dbFileNotes() {
    var n = (state.entries || []).length;
    return n + " " + ruCount(n, "запись", "записи", "записей");
  }


  function exportStamp() {
    var n = (state.entries || []).length;
    return todayStr() + "-" + nowHM().replace(":", "") + "-" + n;
  }


  function csvCell(text) {
    var s = String(text == null ? "" : text);
    return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }


  function ruCount(n, one, few, many) {
    var a = Math.abs(n) % 100;
    var b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b === 1) return one;
    if (b >= 2 && b <= 4) return few;
    return many;
  }


  function historyExportFilename(ext) {
    return "vodomer-history-" + exportStamp() + "." + ext;
  }


  function useSystemCalendar() {
    return !!(state && state.systemCalendar && (webHasDatePick() || useNative("Date")));
  }


  function webHasDatePick() {
    try {
      return !!(window.HTMLInputElement && HTMLInputElement.prototype &&
        typeof HTMLInputElement.prototype.showPicker === "function");
    } catch (e) { return false; }
  }


  function formulaGoal(kg, date) {
    var today = todayStr();
    var src = state;
    if (kg != null && Number(kg) !== Number(state.weightKg)) src = Object.assign({}, state, { weightKg: Number(kg) });
    return LC.goalOn(src, date || today, today);
  }


  function snapNumber(n, min, max, step, decimals) {
    var v = Number(n);
    if (!isFinite(v)) return null;
    if (step) v = Math.round(v / step) * step;
    var f = Math.pow(10, decimals || 0);
    v = Math.round(v * f) / f;
    if (v < min) v = min;
    if (v > max) v = max;
    return v;
  }


  function closeSheetThen(fn) {
    var sheet = document.querySelector(".sheet");
    if (!sheet || sheetLeaving) { ui.sheet = null; if (fn) fn(); render(); return; }
    sheetLeaving = true;
    var token = ++sheetLeaveToken;
    sheet.classList.remove("enter");
    sheet.classList.add("leave");
    var scrim = document.querySelector(".scrim");
    if (scrim) { scrim.classList.remove("enter"); scrim.classList.add("leave"); }
    var finished = false;
    function finish() {
      if (finished) return;
      // За время уезда открылась другая шторка — прежний уезд больше не в силе.
      if (token !== sheetLeaveToken) return;
      finished = true;
      clearTimeout(sheetLeaveTimer);
      sheetLeaveTimer = null;
      sheetLeaving = false;
      sheetSeen = null;
      ui.sheet = null;
      if (fn) fn();
      render();
    }
    sheet.addEventListener("animationend", function (e) {
      if (e.animationName === "sheet-down") finish();
    });
    // При отключённой анимации (системная настройка «меньше движения») уезда нет —
    // закрываем сразу, не выжидая страховочный таймер.
    if (window.getComputedStyle(sheet).animationName === "none") { finish(); return; }
    sheetLeaveTimer = setTimeout(finish, 320);
  }


  function useNative(kind) {
    try {
      if (!window.WaterNative) return false;
      if (kind === "Number") return !!WaterNative.hasNumber();
      if (kind === "Date") return !!WaterNative.hasDate();
      if (kind === "Time") return !!WaterNative.hasTime();
    } catch (e) { /* мост может не ответить — считаем, что нет */ }
    return false;
  }

  function cloudBridge() {
    return !!(window.WaterGoogle && typeof window.WaterGoogle.state === "function");
  }

  var PAINT_ROLES = [
    { id: "bg", label: "Фон экранов", vars: ["--bg", "--page", "--bg-deep"] },
    { id: "band", label: "Шапки и полосы", vars: ["--band"] },
    { id: "list", label: "Строки списков", vars: ["--listbg"] },
    { id: "line", label: "Разделители", vars: ["--line"] },
    { id: "nav", label: "Нижняя панель", vars: ["--nav"] },
    { id: "panel", label: "Меню и диалоги", vars: ["--panel"] },
    { id: "input", label: "Карточки и поля", vars: ["--input-bg"] },
    { id: "toast", label: "Уведомления", vars: ["--toast-bg"] },
    { id: "accent", label: "Акцент", vars: ["--blue", "--blue-2", "--blue-ink", "--blue-fill"] },
    { id: "title", label: "Заголовки экранов", vars: ["--title"] },
    { id: "text", label: "Основной текст", vars: ["--text"] },
    { id: "muted", label: "Приглушённый текст", vars: ["--muted"] },
    { id: "fill", label: "Прогресс и ползунки", vars: ["--fill"] },
    { id: "ptrack", label: "Дорожки прогресса", vars: ["--ptrack"] },
    { id: "tile", label: "Тёмные кнопки и плитки", vars: ["--row", "--pill"] },
    { id: "on", label: "Переключатели «вкл»", vars: ["--green"] }
  ];
  /* Порядок важен: от более специфичных селекторов к общим. */
  var PAINT_PICK = [
    [".progress .fill", "fill"],
    [".progress", "ptrack"],
    [".hslider", "fill"],
    [".nav", "nav"],
    [".top h1", "title"],
    [".top", "band"],
    [".n-section", "accent"],
    [".n-row small, .hint, .field-meta", "muted"],
    [".n-row .ttl", "text"],
    [".n-row", "list"],
    [".sheet", "panel"],
    [".modal", "panel"],
    [".toast", "toast"],
    [".preset", "input"],
    [".field, input", "input"],
    [".switch.on, .checksq.on", "on"],
    [".round.dark, .pin-add, .pill", "tile"],
    [".swipe-front", "panel"],
    [".entry", "text"]
  ];
  function paintRole(id) {
    for (var i = 0; i < PAINT_ROLES.length; i++) if (PAINT_ROLES[i].id === id) return PAINT_ROLES[i];
    return null;
  }
  function paintMap() {
    var m = state.paint && state.paint[resolvedTheme()];
    return m || {};
  }
  function applyPaint() {
    var root = document.documentElement;
    var m = paintMap();
    PAINT_ROLES.forEach(function (r) {
      var v = m[r.id];
      r.vars.forEach(function (name) {
        if (v) root.style.setProperty(name, v);
        else root.style.removeProperty(name);
      });
    });
  }
  var paintSaveT = 0;
  function commitPaint(color, persist) {
    if (!ui.paintRole) return;
    if (!state.paint) state.paint = {};
    var t = resolvedTheme();
    if (!state.paint[t]) state.paint[t] = {};
    state.paint[t][ui.paintRole] = color;
    applyPaint();
    if (persist) save();
    else { clearTimeout(paintSaveT); paintSaveT = setTimeout(save, 500); }
  }
  function resetPaint(id) {
    var t = resolvedTheme();
    var m = state.paint && state.paint[t];
    if (!m) return;
    if (id) {
      if (!m[id]) return;
      delete m[id];
      var r = paintRole(id);
      toast("Цвет сброшен: " + (r ? r.label : id));
    } else {
      if (!Object.keys(m).length) return;
      state.paint[t] = {};
      toast("Все цвета темы сброшены");
    }
    applyPaint();
    save();
    render();
  }
  function computedRoleColor(role) {
    var v = "";
    try { v = getComputedStyle(document.documentElement).getPropertyValue(role.vars[0]).trim(); } catch (e) {}
    return v || "#888888";
  }
  function openPaintColor(id) {
    var role = paintRole(id);
    if (!role) return;
    ui.paintRole = id;
    ui.paintReturn = ui.page || null;
    ui.colorPick = paintMap()[id] || computedRoleColor(role);
    ui.colorPage = colorPageOf(ui.colorPick);
    ui.colorTouched = false;
    ui.page = "colors";
    render();
  }
  function finishPaint() {
    save();
    var role = paintRole(ui.paintRole);
    if (role) toast("Цвет изменён: " + role.label);
    ui.paintRole = null;
    ui.page = ui.paintReturn || null;
    ui.paintReturn = null;
    render();
  }

  /* ===== Скин (студия кубиков, шаг 8c, спека docs/cube-studio-spec.md) =====
     Скин — файл ui-skin.json: { __rev, tokens, paint }. Токены размеров
     применяются инлайн на documentElement (как applyPaint), разметка не
     меняется вовсе. Краски НЕ живут в токенах: при принятии скина они
     сливаются со state.paint (снимок прежних значений хранится для сброса) —
     источник истины по цветам остаётся один, механизм покраски приложения.
     Проектная ревизия (__rev) перекрывает локальный скин при изменении —
     тот же контракт, что у раскладки SVG. Белый список токенов зеркалит
     группы студии (water-tracker/studio.html). */
  var SKIN_TOKENS = [
    "--header-h", "--header-pad", "--header-side", "--header-title",
    "--nav-ico", "--nav-ico-home", "--nav-ico-history", "--nav-ico-weight",
    "--nav-ico-settings", "--nav-ico-alerts",
    "--bubble", "--drink-w", "--drink-nm-f", "--row-ttl-f", "--row-sub-f",
    "--chip-pad-y", "--chip-pad-x", "--r-chip",
    "--sheet-radius", "--sheet-max-h", "--sheet-menu-max-h", "--sheet-date-f",
    "--edit-tag-f", "--sheet-act-h", "--act-round",
    "--sw-h", "--item", "--r-round", "--k", "--nav-h", "--prog-h"
  ];
  var SKIN_VALUE_RE = /^[0-9.]+(px|%)?$/;
  var SKIN_HEX_RE = /^#[0-9a-fA-F]{6}$/;
  function cleanSkin(data) {
    var out = { tokens: {}, paint: {} };
    if (!data || typeof data !== "object") return out;
    var t = data.tokens;
    if (t && typeof t === "object") {
      Object.keys(t).forEach(function (k) {
        var v = t[k];
        if (SKIN_TOKENS.indexOf(k) < 0 || typeof v !== "string") return;
        v = v.trim();
        if (!SKIN_VALUE_RE.test(v)) return;
        out.tokens[k] = v;
      });
    }
    var p = data.paint;
    if (p && typeof p === "object") {
      ["dark", "light"].forEach(function (th) {
        var m = p[th];
        if (!m || typeof m !== "object") return;
        Object.keys(m).forEach(function (role) {
          if (!paintRole(role) || !SKIN_HEX_RE.test(String(m[role]))) return;
          if (!out.paint[th]) out.paint[th] = {};
          out.paint[th][role] = String(m[role]).toLowerCase();
        });
      });
    }
    return out;
  }
  function skinCount(skin) {
    if (!skin) return 0;
    var n = Object.keys(skin.tokens || {}).length;
    ["dark", "light"].forEach(function (th) {
      n += Object.keys((skin.paint || {})[th] || {}).length;
    });
    return n;
  }
  function skinOn() { return skinCount(state.skin) > 0; }
  function applySkinTokens() {
    var root = document.documentElement;
    var m = (state.skin && state.skin.tokens) || {};
    SKIN_TOKENS.forEach(function (k) {
      if (m[k]) root.style.setProperty(k, m[k]);
      else root.style.removeProperty(k);
    });
  }
  /* Краски скина вливаются в state.paint; прежние значения ролей снимаются
     в снимок, чтобы «Сбросить скин» возвращал цвета честно. */
  function mergeSkinPaint() {
    var p = (state.skin && state.skin.paint) || {};
    var before = {};
    ["dark", "light"].forEach(function (th) {
      var m = p[th];
      if (!m) return;
      Object.keys(m).forEach(function (role) {
        if (!before[th]) before[th] = {};
        before[th][role] = (state.paint && state.paint[th] && state.paint[th][role]) || null;
        if (!state.paint) state.paint = {};
        if (!state.paint[th]) state.paint[th] = {};
        state.paint[th][role] = m[role];
      });
    });
    state.skinPaintBefore = before;
  }
  function unmergeSkinPaint() {
    var before = state.skinPaintBefore;
    if (before && state.paint) {
      ["dark", "light"].forEach(function (th) {
        var m = before[th];
        if (!m || !state.paint[th]) return;
        Object.keys(m).forEach(function (role) {
          if (m[role] == null) delete state.paint[th][role];
          else state.paint[th][role] = m[role];
        });
      });
    }
    state.skinPaintBefore = null;
  }
  function adoptSkin(clean, rev) {
    if (state.skin) unmergeSkinPaint();
    state.skin = clean;
    state.skinRev = rev;
    mergeSkinPaint();
    applySkinTokens();
    applyPaint();
    save();
  }
  /* Принять скин из текста (буфер обмена, диалог-фолбэк, стражи).
     Возвращает число принятых правок; 0 — нечего применять. */
  function applySkinFromText(text) {
    var data;
    try { data = JSON.parse(String(text || "")); } catch (e) {
      toast("Скин не применён: JSON не разбирается");
      return 0;
    }
    var clean = cleanSkin(data);
    var n = skinCount(clean);
    if (!n) { toast("В скине нет знакомых токенов или цветов"); return 0; }
    var rev = typeof data.__rev === "string" && data.__rev ? data.__rev : "без ревизии";
    adoptSkin(clean, "clip:" + rev);
    render();
    toast("Скин применён: правок " + n + " (" + rev + ")");
    return n;
  }
  function resetSkin() {
    if (!state.skin && !state.skinPaintBefore) return;
    unmergeSkinPaint();
    state.skin = null;
    /* Ревизию проекта держим: та же ревизия не должна повторно приходить
       после осознанного сброса; новая ревизия проекта перебьёт и сброс. */
    applySkinTokens();
    applyPaint();
    save();
    render();
    toast("Скин сброшен: размеры и цвета прежние");
  }
  /* Диалог-фолбэк вставки скина (буфер в WebView может быть закрыт). */
  function openSkinPasteDialog() {
    /* Тело диалога оборачивается в <p>…</p>: закрываем абзац перед полем
       вставки и открываем снова после — разметка остаётся валидной. */
    ui.modal = "dialog";
    ui.dialogSpec = {
      kind: "skin-paste",
      title: "Скин",
      body: "<p>Вставьте JSON скина (кнопка «Экспорт JSON» в студии кубиков):</p>" +
        '<textarea id="skin-paste-area" class="svg-export-text" spellcheck="false" aria-label="JSON скина"></textarea>',
      ok: "Применить",
      okAct: "skin-paste-apply"
    };
    render();
  }
  function adoptProjectSkin(done) {
    fetchT("data/ui-skin.json?t=" + Date.now(), 3000).then(function (r) {
      if (!r.ok) throw 0;
      return r.json();
    }).then(function (data) {
      var rev = data && typeof data.__rev === "string" ? data.__rev : "";
      var fresh = !!(rev && rev !== String(state.skinRev || ""));
      if (!fresh) { done && done(); return; }
      var clean = cleanSkin(data);
      if (!skinCount(clean)) { done && done(); return; }
      adoptSkin(clean, rev);
      done && done();
    }).catch(function () { done && done(); });
  }
  function cloudWhen(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    var now = new Date();
    var hm = pad(d.getHours()) + ":" + pad(d.getMinutes());
    var same = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    return same ? "сегодня " + hm : pad(d.getDate()) + "." + pad(d.getMonth() + 1) + " " + hm;
  }
  function cloudBackupLabel() {
    if (cloud.busy) return "идёт обмен с Диском…";
    var w = cloudWhen(cloud.lastBackup);
    return w ? "сохранено " + w : "копии пока нет";
  }
  function activityRow() { return null; }
  function activityIcon() { return null; }
  function weatherIcon() { return null; }
  /* Шимы к модулям next (сигнатуры донора → модули M13/M03/M04). */
  function ensureAlerts() { return N().ensureAlerts(state); }
  function freqLabel(min) { return P().freqLabel(min); }
  function alertSoundTitle(f) { return N().alertSoundTitle(f); }
  function nextSlot(now) { return N().nextSlot(state, now); }
  function notifyWindow(iso) { return N().notifyWindow(state, iso); }
  function dayWindow(i) { return N().dayWindow(state, i); }
  function weekdayIndex(iso) { return N().weekdayIndex(iso); }
  function parseHM(s) { return N().parseHM(s); }
  function shiftHM(hm, d) { return N().shiftHM(hm, d); }
  function wallMsNow() { return N().wallMsNow(); }
  /* v145 донор (5352-5378): диалог «взять настройки из копии» — состав частей
     перечисляется словами, по умолчанию только история. */
  function settingsChoiceDialogHtml() {
    var ch = ui.settingsChoice;
    if (!ch) return "";
    var st = null;
    try { st = ch.pack ? ch.pack.settings : JSON.parse(ch.text).settings; } catch (e) { st = null; }
    var parts = [];
    if (st) {
      if (st.theme) parts.push("тема");
      if (st.notifications) parts.push("уведомления");
      if (st.lc) parts.push("оформление жидкости");
      if (st.paceGoals && Object.keys(st.paceGoals).length) parts.push("объёмы периодов");
      if (st.rowCustom || st.cupLabel) parts.push("стакан и ряд");
    }
    return K().dialog({
      ui: "settings-choice",
      scrimAct: "settings-choice-hist",
      cls: "modal n-modal",
      title: "Применить настройки из копии?",
      body: '<p class="hint">История объединится в любом случае. Настройки копии (' +
        esc(parts.join(", ") || "пусто") + ") применяются только вашим выбором: " +
        "по умолчанию — только история, чтобы местные настройки не перезаписались.",
      actions: [
        { act: "settings-choice-hist", label: "Только историю" },
        { act: "settings-choice-both", label: "Историю и настройки" }
      ]
    });
  }

  function waterToday() { return N().waterToday(state); }
  function dayEntries(d) { return J().dayEntries(state, d); }

  function sumKey(list, key) {
    return list.reduce(function (s, e) { return s + Number(e[key] || 0); }, 0);
  }


  function goalFor(date) {
    var today = todayStr();
    var current = waterToday();
    if (date && date !== today && date !== current && state.dayGoals && state.dayGoals[date] != null) return Number(state.dayGoals[date]);
    return LC.goalOn(state, date, today);
  }


  function volLabel(ml) {
    var n = Math.round(Number(ml) || 0);
    if (!isImperial()) return n + " мл";
    return (Math.round(n / 29.5735295625 * 10) / 10).toFixed(1) + " унц.";
  }


  function fmtWeight(kg) {
    if (isImperial()) return kgToLb(kg).toFixed(1) + " фунт";
    return H().fmtKg(kg);
  }


  function isImperial() { return state && state.units === "imperial"; }


  function fmtDayStart() {
    var mins = LC.minutesOf(dayStartValue());
    return pad2(Math.floor(mins / 60)) + ":" + pad2(mins % 60);
  }


  function dayStartValue() {
    return (state && state.dayStart) || "02:00";
  }


  function ruDate(iso) {
    if (!iso || iso.length < 10) return "—";
    return iso.slice(8, 10) + "." + iso.slice(5, 7) + "." + iso.slice(0, 4);
  }


  function durationPhrase(mins, prefix) {
    mins = Math.max(0, Math.round(Number(mins) || 0));
    if (!mins) return "Сразу";
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    var parts = [];
    if (h) parts.push(h + " " + ruCount(h, "час", "часа", "часов"));
    if (m) parts.push(m + " " + ruCount(m, "минуту", "минуты", "минут"));
    return (prefix ? prefix + " " : "") + parts.join(" ");
  }


  function spanLabel(wake, sleep) {
    var d = parseHM(sleep) - parseHM(wake);
    if (d <= 0) d += 1440;
    var h = d / 60;
    if (Math.abs(h - Math.round(h)) < 0.05) return Math.round(h) + "ч";
    return (Math.round(h * 10) / 10).toString().replace(".", ",") + "ч";
  }


  function pad(n) { return String(n).padStart(2, "0"); }


  function kgToLb(kg) { return Math.round(Number(kg) * 2.2046226218 * 10) / 10; }


  function lbToKg(lb) { return Math.round(Number(lb) / 2.2046226218 * 10) / 10; }


  function useSystemClock() {
    /* В теме Oneplus 7 время всегда ставится своим круглым циферблатом. */
    if (resolvedTheme() === "oneplus") return false;
    return !!(state && state.systemClock && window.WaterNative && WaterNative.hasTime());
  }


  function useSystemDrums() {
    return !!(state && state.systemDrums && window.WaterNative && WaterNative.hasNumber());
  }


  function readTimePair(key, hN, mN, fbH, fbM) {
    if (ui.dial && ui.dialKey === key) return { h: ui.dial.h, m: ui.dial.m };
    return { h: readWheel(hN, fbH), m: readWheel(mN, fbM) };
  }


  function shareTextFile(name, text, mime) {
    var shell = window.WaterShell;
    if (shell && typeof shell.shareFile === "function") {
      try {
        shell.shareFile(name, mime || "text/plain", String(text));
        return "app";
      } catch (e) { /* ниже — браузерный путь */ }
    }
    try {
      var file = new File([String(text)], name, { type: mime || "text/plain" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: "База «Водомера»" }).catch(function () {});
        return "share";
      }
    } catch (e) { /* окна «Поделиться» нет */ }
    return "";
  }


  function saveTextFile(name, text, mime) {
    /* В приложении скачивание ссылкой не работает — файл кладёт оболочка. */
    var shell = window.WaterShell;
    if (shell && typeof shell.saveFile === "function") {
      try {
        shell.saveFile(name, mime || "text/plain", String(text));
        return true;
      } catch (e) { /* попробуем обычным способом */ }
    }
    try {
      var blob = new Blob([text], { type: mime });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      return true;
    } catch (e) { return false; }
  }


  function dbFileName() {
    return "vodomer-baza-" + exportStamp() + ".json";
  }


  function historyExportJson() {
    return JSON.stringify(Y().exportPack(state, lcEnv()), null, 1);
  }


  function historyExportCsv() {
    var pack = Y().exportPack(state, lcEnv());
    var head = ["date", "time", "drink", "volume_ml", "credited_ml"];
    var lines = [head.join(";")];
    pack.entries.forEach(function (e) {
      lines.push([e.date, e.time, csvCell(e.name), Number(e.volume) || 0, Number(e.credited) || 0].join(";"));
    });
    lines.push("");
    lines.push(["date", "weight_kg"].join(";"));
    pack.weights.forEach(function (w) { lines.push([w.date, w.kg].join(";")); });
    // BOM, иначе Excel открывает русский текст кракозябрами.
    return "\uFEFF" + lines.join("\r\n") + "\r\n";
  }


  function writeGoalSpan(from, to, kg) {
    if (!state || state.useRecommended === false) return;
    if (!from || !to || to < from) return;
    if (!state.dayGoals) state.dayGoals = {};
    var d = from;
    var guard = 0;
    while (d <= to && guard < 2000) {
      state.dayGoals[d] = formulaGoal(kg, d);
      if (d === to) break;
      d = LC.addDays(d, 1);
      guard++;
    }
  }


  function nextWeightDate(date) {
    var next = "";
    (state.weights || []).forEach(function (w) {
      if (w.date > date && (!next || w.date < next)) next = w.date;
    });
    return next;
  }


  function stampWeightGoals(date, kg) {
    var today = todayStr();
    var from = date && date <= today ? date : today;
    var next = nextWeightDate(from);
    var end = next ? LC.addDays(next, -1) : today;
    if (end > today) end = today;
    if (end < from) end = from;
    writeGoalSpan(from, end, kg);
    var water = waterToday();
    if (water !== today && water >= from && water <= end) writeGoalSpan(water, water, kg);
  }


  function syncRecommended() {
    if (!state || state.useRecommended === false) return;
    state.goalMl = LC.genderBase(state);
  }


  function recommendedMl() {
    return LC.recommendedOn(state, todayStr(), todayStr());
  }


  function resetAll() {
    /* v85 (владелец 25.10): сброс — чисто локальное действие. Прежняя версия
       помечала всё удалённым, метки разъезжались через облако и съедали
       историю на других устройствах (инцидент 25.10,
       docs/cloud-poison-incident.md). Теперь метки не ставятся, а старые
       стираются начисто. Чтобы история не вернулась сама, устройство не
       забирает облако, пока владелец сам не нажмёт «Синхронизация»
       (state.resetHold снимается в cloudSyncNow). */
    state = C().initialState();
    state.tombstones = { e: {}, w: {} };
    state.resetHold = 1;
    state.historyDismissed = true;
    ui.page = null;
    ui.sheet = null;
    ui.modal = null;
    ui.dialog = null;
    ui.historyDate = todayStr();
    ui.chartLeft = null;
    ui.openSwipe = null;
    ui.weightDraft = null;
    ui.weightAnchor = null;
    ui.goalDraft = null;
    ui.addDraft = null;
    ui.activityFrom = null;
    ui.sorting = false;
    ui.sortOrder = null;
    save();
    toast("Приложение как при первом запуске");
  }


  function structJsonText() {
    if (!window.SettingsUI || !window.SettingsUI.structJson) return "";
    return window.SettingsUI.structJson(settingsEnv());
  }


  function copyStructJson() {
    var txt = structJsonText();
    if (!txt) { toast("Структура недоступна: модуль настроек не загрузился"); return; }
    var done = function () { toast("Скопировано: дерево структуры в буфере"); };
    var fallback = function () {
      var ta = document.createElement("textarea");
      ta.value = txt;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
      toast(ok ? "Скопировано: дерево структуры в буфере" : "Не скопировалось: выделите текст в окне вручную");
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done, fallback);
    } else fallback();
  }


  function saveStructFile() {
    var txt = structJsonText();
    if (!txt) { toast("Структура недоступна: модуль настроек не загрузился"); return; }
    var name = "vodomer-struktura-" + todayStr() + ".json";
    var how = shareTextFile(name, txt, "application/json");
    if (how === "app") { toast("Файл " + name + " передан оболочке"); return; }
    if (how === "share") { toast("Открыто окно «Поделиться» — выберите, куда сохранить"); return; }
    /* Браузерный фолбэк без navigator.share: скачивание ссылкой. */
    try {
      var url = URL.createObjectURL(new Blob([txt], { type: "application/json" }));
      var a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      toast("Файл " + name + " скачивается");
    } catch (e) {
      toast("Не вышло файлом — скопируйте текст кнопкой «Скопировать»");
    }
  }


  function openHistoryExport() {
    if (!(state.entries || []).length) { toast("Истории пока нет — сначала запишите приём воды"); return; }
    ui.modal = "history-export";
    render();
  }


  // В окне — только начало списка: полторы тысячи строк JSON в textarea
  // подвешивают телефон, а честно выгружают кнопки. (Донор 6115-6117;
  // константа не доехала при переносе — диалог экспорта падал, 07.11.)
  var HIST_PREVIEW_ROWS = 60;

  function historyExportPreview() {
    var pack = Y().exportPack(state, lcEnv());
    var shown = pack.entries.slice(0, HIST_PREVIEW_ROWS);
    var head = "// Предпросмотр: первые " + shown.length + " из " + pack.counts.entries + " " +
      ruCount(pack.counts.entries, "записи", "записей", "записей") + ".\n" +
      "// Кнопки «Скопировать» и «Скачать JSON» отдают все " + pack.counts.entries + " " +
      ruCount(pack.counts.entries, "запись", "записи", "записей") + ".\n";
    return head + JSON.stringify({
      source: pack.source,
      version: pack.version,
      profile: pack.profile,
      counts: pack.counts,
      drinks: pack.drinks.map(function (d) { return d.id; }),
      weights: pack.weights,
      dayGoals: pack.dayGoals,
      entries: shown
    }, null, 1);
  }


  function dupesDialogHtml() {
    if (!window.UiKit) return "";
    var gs = dupGroups();
    var body = gs.length
      ? '<div class="dupe-list">' + gs.map(function (g) {
          return '<button type="button" class="dupe-row" data-act="goto-dupe" data-date="' + g.date + '">' +
            '<span class="dupe-date">' + fmtShort(g.date) + '</span>' +
            '<span class="dupe-what">' + esc(g.time + " · " + g.name + " " + g.volume + " мл") + '</span>' +
            '<span class="dupe-x">×' + g.count + '</span></button>';
        }).join("") + '</div>'
      : '<div class="empty">Повторов нет</div>';
    return K().dialog({ ui: "dupes",
      scrimAct: "dialog-cancel",
      cls: "modal n-modal dupes-modal",
      title: "Дубли в истории",
      body: body,
      actions: [ { act: "dialog-cancel", label: "Закрыть" } ]
    });
  }


  function historyExportDialogHtml() {
    var pack = Y().exportPack(state, lcEnv());
    var c = pack.counts;
    var note = c.entries + " " + ruCount(c.entries, "запись", "записи", "записей") + " (" + ruDate(c.from) + " — " + ruDate(c.to) + "), " +
      c.days + " " + ruCount(c.days, "день", "дня", "дней") + ", " + c.weights + ruCount(c.weights, " измерение", " измерения", " измерений") + " веса, цели по дням. " +
      "JSON принимает «Загрузить историю» на этом экране, CSV открывается в таблицах.";
    if (window.__singleFile) {
      note += " Загрузка файла здесь может не сработать, и в памяти держатся только последние " + c.entries +
        " " + ruCount(c.entries, "запись", "записи", "записей") + " — кнопка «Скопировать» отдаёт всё, что есть. " +
        "С сервера проекта выгружается история целиком.";
    }
    if (!window.UiKit) return "";
    return K().dialog({ ui: "export",
      scrimAct: "hist-export-close",
      cls: "modal n-modal svg-export hist-export",
      title: "Экспорт истории",
      body: K().noteArea({ ui: "export", note: note, areaLabel: "Предпросмотр выгрузки", text: historyExportPreview() }),
      actions: [
        { act: "hist-export-copy", label: "Скопировать" },
        { act: "hist-export-json", label: "Скачать JSON" },
        { act: "hist-export-csv", label: "Скачать CSV" },
        { act: "hist-export-close", label: "Отмена" }
      ]
    });
  }


  function dbSaveHint() {
    var inApp = !!(window.WaterShell && typeof window.WaterShell.saveFile === "function");
    return "JSON, " + dbFileNotes() + " — " + (inApp ? "ляжет в «Загрузки»" : "скачается файлом");
  }


  function dbShareHint() {
    var inApp = !!(window.WaterShell && typeof window.WaterShell.shareFile === "function");
    return inApp ? "файл через системное окно Android" : "файл через окно «Поделиться» браузера";
  }


  function systemCalNote() {
    return useSystemCalendar()
      ? "Дата веса — системный выбор даты"
      : webHasDatePick()
        ? "Дата веса. Системный выбор в браузере и приложении Android"
        : "Дата веса. Заработает в приложении Android";
  }


  function systemClockNote() {
    return useSystemClock()
      ? "Время приёма, сутки и сон — часы Android"
      : "Время приёма, сутки и сон. Заработает в приложении Android";
  }


  function systemDrumNote() {
    return useSystemDrums()
      ? "Вес, объём и норма — диалог Android"
      : "Вес, объём и норма. Заработает в приложении Android";
  }


  function duplicateStats() {
    var seen = {}, dubs = 0, first = null;
    (state.entries || []).forEach(function (e) {
      var k = J().entryKey(e);
      if (seen[k]) { dubs++; if (!first || k < first) first = k; return; }
      seen[k] = 1;
    });
    return { count: dubs, sample: first };
  }


  function historyExportSummary() {
    var n = (state.entries || []).length;
    var w = (state.weights || []).length;
    if (!n) return "Пока нечего выгружать";
    var pack = Y().exportPack(state, lcEnv());
    var c = pack.counts;
    return c.entries + " записей и " + w + ruCount(w, " измерение веса", " измерения веса", " измерений веса") + ", " + ruDate(c.from) + " — " + ruDate(c.to);
  }


  function timeEditorHtml(key, hN, mN, h, m, wCls) {
    if (!dialActive()) {
      ui.dial = null; ui.dialKey = null;
      if (!window.UiKit) return "";
      return K().wheelBlock({ ui: "time-editor",
        cls: wCls || "time-wheels",
        items: [{ wheel: { name: hN, value: h, min: 0, max: 23, step: 1, pad: true } },
                { sep: ":", sepCls: "colon" },
                { wheel: { name: mN, value: m, min: 0, max: 59, step: 1, pad: true } }]
      });
    }
    if (!ui.dial || ui.dialKey !== key || ui.dialSeed !== h + ":" + m) {
      ui.dial = { h: h, m: m, view: "h" };
      ui.dialKey = key;
      ui.dialSeed = h + ":" + m;
    }
    return dialHtml(ui.dial.h, ui.dial.m, ui.dial.view, key);
  }


  function freqSubLabel() {
    var n = ensureAlerts();
    if (!P().isPace(n)) return freqLabel(n.everyMin);
    var now = wallMsNow();
    /* v139: прозрачность фазы 2 — часы ритма словами: куда целится шаг. */
    if (window.PaceCurve && PaceCurve.explain) {
      var today = waterToday();
      var drunk = sumKey(dayEntries(today), "volume");
      var portion = window.HabitSchedule ? window.HabitSchedule.medianPortion(state.entries, today, 7) : 250;
      var ex = PaceCurve.explain(state.entries, periodOpts(), now, drunk, portion);
      if (ex) {
        return ex.ahead
          ? "По темпу: вы опережаете ритм «" + (ex.periodLabel || "периода") + "» — поддерживающий шаг 2 ч"
          : "По темпу: по ритму «" + ex.periodLabel + "» следующая порция около " + ex.wallHM +
            " · шаг " + ex.stepMin + " мин";
      }
    }
    var next = nextSlotMs(now);
    var tail = "";
    if (typeof next === "number" && next > now) {
      tail = " · следующее через " + durationPhrase(Math.max(1, Math.round((next - now) / 60000)));
    }
    return "По темпу: норма к концу бодрствования" + tail;
  }


  function askAlertPermission() {
    var bridge = window.WaterAlerts;
    if (bridge && typeof bridge.requestPermission === "function") {
      try { bridge.requestPermission(); } catch (e) {}
    }
  }


  function sysLaunch(act, text) {
    return '<button type="button" class="sys-launch" data-act="' + act + '">' + text + "</button>";
  }


  function splitKg(kg) {
    var n = Math.round(Number(kg) * 10) / 10;
    if (!(n >= 20 && n <= 300)) n = state.weightKg || 60;
    var whole = Math.floor(n + 1e-6);
    var frac = Math.round((n - whole) * 10);
    if (frac >= 10) { whole += 1; frac = 0; }
    if (whole < 20) whole = 20;
    if (whole > 300) whole = 300;
    return { whole: whole, frac: frac };
  }


  function splitLb(kg) {
    var n = kgToLb(kg);
    if (!(n >= 44 && n <= 661.9)) n = kgToLb(state.weightKg || 60);
    var whole = Math.floor(n + 1e-6);
    var frac = Math.round((n - whole) * 10);
    if (frac >= 10) { whole += 1; frac = 0; }
    if (whole < 44) whole = 44;
    if (whole > 661) whole = 661;
    return { whole: whole, frac: frac };
  }


  function initWheels() {
    document.querySelectorAll("[data-wheel]").forEach(setupWheel);
    var dface = document.querySelector("[data-dial-face]");
    if (dface) setupDialFace(dface);
  }


  var ITEM = 44; /* донор app.js:6 — высота пункта барабана; без неё колёса без data-item молча умирали в catch */
  function setupWheel(el) {
    var min = Number(el.dataset.min);
    var max = Number(el.dataset.max);
    var step = Number(el.dataset.step);
    var itemH = Number(el.dataset.item) || ITEM;
    var values = [];
    for (var v = min; v <= max; v += step) values.push(v);
    var value = Number(el.dataset.value);
    if (values.indexOf(value) < 0) {
      value = values.reduce(function (a, b) { return Math.abs(b - Number(el.dataset.value)) < Math.abs(a - Number(el.dataset.value)) ? b : a; });
    }
    el.dataset.value = value;
    var list = el.querySelector(".wheel-list");
    var pad = '<div class="wheel-pad"></div>';
    list.innerHTML = pad + values.map(function (n) {
      var label = el.dataset.pad === "1" ? pad2(n) : String(n);
      return '<div class="wheel-item" data-v="' + n + '">' + label + "</div>";
    }).join("") + pad;
    function pad2(n) { return String(n).padStart(2, "0"); }
    var idx = values.indexOf(value);
    function mark() {
      var i = Math.round(list.scrollTop / itemH);
      i = Math.max(0, Math.min(values.length - 1, i));
      var current = values[i];
      el.dataset.value = current;
      list.querySelectorAll(".wheel-item").forEach(function (n) {
        n.classList.toggle("on", Number(n.dataset.v) === current);
      });
      onWheel(el.dataset.wheel, current);
    }
    function scrollToIndex(i, smooth) {
      list.scrollTo({ top: i * itemH, behavior: smooth ? "smooth" : "auto" });
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        list.scrollTop = idx * itemH;
        mark();
      });
    });
    var timer;
    list.addEventListener("scroll", function () {
      mark();
      clearTimeout(timer);
      timer = setTimeout(function () {
        var i = Math.round(list.scrollTop / itemH);
        scrollToIndex(Math.max(0, Math.min(values.length - 1, i)), true);
      }, 90);
    });
    list.addEventListener("click", function (e) {
      var item = e.target.closest(".wheel-item");
      if (!item) return;
      var i = values.indexOf(Number(item.dataset.v));
      if (i >= 0) scrollToIndex(i, true);
    });
    el._setValue = function (next) {
      var i = values.indexOf(Number(next));
      if (i < 0) return;
      list.scrollTop = i * itemH;
      el.dataset.value = values[i];
      mark();
    };
  }


  function onWheel(name, value) {
    if (name === "volume") {
      if (ui.sheet === "volume") ui.volumeDraft = value;
      if (ui.sheet === "hist-add" && ui.addDraft) ui.addDraft.volume = value;
      document.querySelectorAll(".preset").forEach(function (p) {
        p.classList.toggle("on", Number(p.dataset.v) === value);
      });
    }
    if (name === "goal") {
      ui.goalDraft = value;
      document.querySelectorAll(".sheet.goal .preset").forEach(function (p) {
        p.classList.toggle("on", Number(p.dataset.v) === value);
      });
    }
    if ((name === "hour" || name === "minute") && ui.timeDraft) ui.timeDraft[name] = value;
    if ((name === "kg-int" || name === "kg-dec") && ui.weightDraft) {
      var whole = name === "kg-int" ? value : readWheel("kg-int", 0);
      var frac = name === "kg-dec" ? value : readWheel("kg-dec", 0);
      var num = Math.round((whole + frac / 10) * 10) / 10;
      ui.weightDraft.kg = (ui.sheet === "set-weight" && isImperial()) ? lbToKg(num) : num;
    }
  }


  function clockDate(water, time) {
    if (LC.minutesOf(time) < LC.minutesOf(J().dayStartOn(state, water))) return LC.addDays(water, 1);
    return water;
  }

  function openAdd(entry) {
    ui.historyDate = ui.historyDate || todayStr();
    if (entry) {
      ui.addDraft = {
        entryId: entry.id,
        drinkId: entry.drinkId,
        volume: entry.volume,
        time: entry.time,
        createdAt: entry.createdAt,
        snapshot: { id: entry.drinkId, name: entry.name, icon: entry.icon, color: entry.color, hydration: entry.hydration }
      };
    } else {
      var drink = currentDrink();
      ui.addDraft = { entryId: null, drinkId: drink.id, volume: state.profile.volume, time: nowHM(), createdAt: null, snapshot: null };
    }
    ui.sheet = "hist-add";
    ui.page = null;
    render();
  }

  function alertNoteDrank() {
    var bridge = window.WaterAlerts;
    if (bridge && typeof bridge.noteDrank === "function") {
      try { bridge.noteDrank(); } catch (e) { /* нет моста — не критично */ }
    }
  }

  function writeEntry(volume) {
    var draft = ui.addDraft;
    if (!draft) return;
    var drink = drinkById(draft.drinkId) || draft.snapshot;
    if (!drink) { toast("Выберите напиток"); return; }
    var water = ui.historyDate || waterToday();
    var date = clockDate(water, draft.time);
    var entry = {
      id: draft.entryId || uid(),
      date: date,
      time: draft.time,
      drinkId: drink.id,
      name: drink.name,
      icon: drink.icon,
      color: drink.color,
      hydration: drink.hydration,
      volume: volume,
      credited: LC.creditedMl(volume, drink.hydration),
      createdAt: draft.createdAt || Date.now()
    };
    var msg;
    var added = false;
    if (draft.entryId) {
      /* v84 (дубли при правке, инцидент 25.10): слияние между устройствами
         опознаёт записи по содержимому (дата|время|напиток|объём). Правка
         времени меняла содержимое — второе устройство принимало её как новую
         запись и оставляло себе старую копию: дубль, который следующим
         обменом возвращался и сюда. Теперь старая версия помечается
         удалённой (её больше не воскресить), новая — живой, и у правки есть
         updatedAt: при встрече версий побеждает свежайшая. */
      var prevE = state.entries.filter(function (e) { return e.id === draft.entryId; })[0];
      if (prevE && J().entryKey(prevE) !== J().entryKey(entry)) J().markDeleted(state, [prevE], "e");
      entry.updatedAt = Date.now();
      J().markAlive(state, entry, "e");
      state.entries = state.entries.map(function (e) { return e.id === draft.entryId ? entry : e; });
      msg = "Запись изменена";
    } else {
      J().markAlive(state, entry, "e");
      state.entries.push(entry);
      added = true;
      msg = "В историю: " + drink.name + " " + volume + " мл";
    }
    ui.addDraft = null;
    ui.openSwipe = null;
    save();
    if (added) alertNoteDrank();
    closeSheetThen(function () { toast(msg); });
  }

  function maybeWarnEntry(volume) {
    var draft = ui.addDraft;
    var drink = drinkById(draft.drinkId) || draft.snapshot;
    var water = ui.historyDate || waterToday();
    var before = sumKey(dayEntries(water), "volume");
    var old = draft.entryId ? state.entries.filter(function (e) { return e.id === draft.entryId; })[0] : null;
    var oldVol = old && entryDay(old) === water ? Number(old.volume) || 0 : 0;
    var goal = goalFor(water);
    writeEntry(volume);
  }


  function readWheel(name, fallback) {
    var el = document.querySelector('[data-wheel="' + name + '"]');
    if (!el || el.dataset.value === "" || el.dataset.value == null) return fallback;
    return Number(el.dataset.value);
  }


  /* Донор app.js:460: системный календарь через мост. При порте функция
     потерялась, а вызовы остались — открытие даты падало с
     «askNativeDate is not defined» и не показывало никакой календарь
     (жалоба владельца 07.11). Возвращена дословно. */
  function askNativeDate(spec, apply) {
    WaterNative.pickDate(spec).then(function (raw) {
      if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return;
      if (spec.max && raw > spec.max) return;
      apply(raw);
    });
  }

  function askNativeTime(spec, apply) {
    WaterNative.pickTime(spec).then(function (raw) {
      if (!raw) return;
      var parts = String(raw).split(":");
      var h = Number(parts[0]);
      var m = Number(parts[1]);
      if (!(h >= 0 && h <= 23) || !(m >= 0 && m <= 59)) return;
      apply(pad2(h) + ":" + pad2(m));
    });
  }


  function askNativeNumber(spec, apply) {
    WaterNative.pickNumber(spec).then(function (raw) {
      if (raw == null) return;
      var n = snapNumber(String(raw).replace(",", "."), spec.min, spec.max, spec.step, spec.decimals);
      if (n == null) return;
      apply(n);
    });
  }


  function restoreHistoryBackup() {
    var b = state.historyBackup;
    if (!b) { toast("Прежней истории нет"); return; }
    var now = {
      at: Date.now(),
      entries: state.entries,
      weights: state.weights || [],
      dayGoals: state.dayGoals || {},
      historySource: state.historySource || "",
      historyCounts: state.historyCounts || null,
      dayStart: state.dayStart,
      dayStartHistory: state.dayStartHistory || []
    };
    state.entries = b.entries || [];
    state.weights = b.weights || [];
    state.dayGoals = b.dayGoals || {};
    state.historySource = b.historySource || "";
    state.historyCounts = b.historyCounts || null;
    if (b.dayStart) state.dayStart = b.dayStart;
    if (Array.isArray(b.dayStartHistory) && b.dayStartHistory.length) state.dayStartHistory = b.dayStartHistory;
    state.historyBackup = now;   /* возврат тоже можно отменить */
    ui.historyDate = null;
    ui.chartLeft = null;
    save();
    render();
    toast("Вернул прежнюю историю: " + state.entries.length + " записей");
  }


  function dupGroups() {
    var g = {};
    (state.entries || []).forEach(function (e) { var k = J().entryKey(e); (g[k] = g[k] || []).push(e); });
    return Object.keys(g).filter(function (k) { return g[k].length > 1; })
      .map(function (k) {
        var a = g[k];
        return { key: k, date: a[0].date, time: a[0].time, name: a[0].name, volume: a[0].volume, count: a.length };
      })
      .sort(function (x, y) { return (x.date + x.time).localeCompare(y.date + y.time); });
  }


  function drinkById(id) {
    for (var i = 0; i < state.drinks.length; i++) if (state.drinks[i].id === id) return state.drinks[i];
    return null;
  }


  var habitAutoLast = "";
  function habitAutoTick() {
    if (!state.habitAuto || !window.HabitSchedule) return;
    var n = ensureAlerts();
    var today = todayStr();
    var auto = window.HabitSchedule.autoWindows(state.entries, {
      dayStart: state.dayStart || "02:00",
      afterWakeMin: n.afterWakeMin, beforeSleepMin: n.beforeSleepMin,
      todayIso: today
    });
    if (!auto.ok) return;
    var sig = today + "|" + auto.days7.map(function (d) { return d.wake + d.sleep; }).join(",");
    if (sig === habitAutoLast) return;
    habitAutoLast = sig;
    var changed = 0;
    for (var i = 0; i < 7; i++) {
      var w = { wake: auto.days7[i].wake, sleep: auto.days7[i].sleep };
      if (!n.days[i] || n.days[i].wake !== w.wake || n.days[i].sleep !== w.sleep) changed++;
      n.days[i] = w;
    }
    if (changed) { save(); alertsSync(); }
  }

  function weatherIcon(id, lock) {
    var file = { hot: "sunHot.svg", warm: "sunWarm.svg", everyday: "sunEveryday.svg", cold: "sunrise.svg" }[id] || "sunEveryday.svg";
    return '<span class="wicon"' + (lock ? ' data-svg-lock="1"' : '') + '><img class="ui-ico" src="assets/icons/' + file + '" data-svg-file="' + file + '" alt=""></span>';
  }

  function adjustBase() {
    return state.useRecommended === false ? state.goalMl : LC.genderBase(state);
  }

  function activityLevels() {
    return [
      ["heavy", "Тяж. тренировки", "run", "#e23b22"],
      ["training", "Тренировки", "run", "#f07f1f"],
      ["everyday", "Повседневная", "walk", "#d7d8dc"],
      ["none", "Нет", "stand", "#ffffff"]
    ];
  }

  function activityRow(level) {
    var rows = activityLevels();
    for (var i = 0; i < rows.length; i++) if (rows[i][0] === level) return rows[i];
    return rows[3];
  }

  function figureIcon(pose, color, lock) {
    var path = pose === "run"
      ? "M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9 1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"
      : pose === "walk"
        ? "M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"
        : "M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z";
    return '<span class="wicon fig"' + (lock ? ' data-svg-lock="1"' : '') + '><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="' + color + '" d="' + path + '"/></svg></span>';
  }

  function activityIcon(level, lock) {
    var row = activityRow(level);
    return figureIcon(row[2], row[3], lock);
  }

  function presetsHtml(value) {
    return K().chipRow({ values: LC.PRESETS, selected: value, act: "preset", ui: "sheet" });
  }

  function drinkRowItems(selectedId) {
    var drinks = state.drinks.slice(0, 8);
    if (selectedId && !drinks.some(function (d) { return d.id === selectedId; })) {
      var extra = drinkById(selectedId);
      if (extra) drinks = [extra].concat(drinks);
    }
    return drinks.map(function (d) {
      return { id: d.id, on: d.id === selectedId, color: d.color, name: esc(d.name), bubble: bubble(d, 52) };
    });
  }

  function volumeSheetBody(cfg) {
    var head = (cfg.editTag ? '<div class="edit-tag">Изменение записи</div>' : "") +
      (cfg.date ? '<div class="sheet-date">Дата ' + cfg.date + "</div>" : "");
    var row = cfg.pinning ? "" : K().drinkPickRow({
      ui: cfg.ui, act: cfg.pickAct, more: true, moreIcon: uiIcon("chevron"),
      items: drinkRowItems(cfg.selectedId)
    });
    return head + row + presetsHtml(cfg.volume) + cfg.wheel;
  }

  function openPinEditor(slot) {
    var pins = state.customShortcuts || [];
    var pin = pins[slot];
    var drink = pin && drinkById(pin.drinkId);
    ui.pinSlot = slot;
    ui.pinning = false;
    ui.pinDrinkId = drink ? drink.id : null;
    ui.volumeDraft = pin && Number(pin.volume) > 0 ? Number(pin.volume) : (state.profile.volume || 200);
    ui.page = "drinks";
    ui.drinkReturn = "pin";
    ui.sorting = false;
    ui.sheet = null;
    ui.modal = null;
    ui.openSwipe = null;
    render();
  }

  function initPinHold() {
    document.querySelectorAll(".home-dock > .shortcut[data-slot]").forEach(function (btn) {
      var holdTimer = null;
      var showTimer = null;
      var startX = 0;
      var startY = 0;
      var pid = null;
      var fired = false;
      function clearTimers() {
        clearTimeout(holdTimer);
        clearTimeout(showTimer);
        holdTimer = null;
        showTimer = null;
      }
      function detach() {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        pid = null;
      }
      function onMove(e) {
        if (fired || pid == null || e.pointerId !== pid) return;
        if (Math.abs(e.clientX - startX) > 12 || Math.abs(e.clientY - startY) > 12) {
          clearTimers();
          btn.classList.remove("holding");
          detach();
        }
      }
      function onUp(e) {
        if (pid == null || (e && e.pointerId != null && e.pointerId !== pid)) return;
        if (fired && e && e.type === "pointercancel") return;
        var didFire = fired;
        clearTimers();
        detach();
        fired = false;
        if (didFire) {
          suppressNextClick(450);
        }
      }
      btn.addEventListener("pointerdown", function (e) {
        if (e.button != null && e.button !== 0) return;
        fired = false;
        pid = e.pointerId;
        startX = e.clientX;
        startY = e.clientY;
        clearTimers();
        showTimer = setTimeout(function () { btn.classList.add("holding"); }, 140);
        holdTimer = setTimeout(function () {
          holdTimer = null;
          fired = true;
          suppressNextClick(500);
          swallowUntilRelease();
          try { if (navigator.vibrate) navigator.vibrate(12); } catch (err) { /* ignore */ }
          openPinEditor(Number(btn.dataset.slot));
        }, 450);
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
      });
      btn.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        if (fired) return;
        clearTimers();
        fired = true;
        suppressNextClick(500);
        swallowUntilRelease();
        openPinEditor(Number(btn.dataset.slot));
      });
    });
  }

  function swallowUntilRelease() {
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      window.removeEventListener("pointerup", onRelease);
      setTimeout(function () { document.removeEventListener("click", eat, true); }, 400);
    }
    function eat(e) {
      e.preventDefault();
      e.stopPropagation();
    }
    function onRelease(e) {
      if (!e || e.type !== "pointerup") return;
      finish();
    }
    document.addEventListener("click", eat, true);
    window.addEventListener("pointerup", onRelease);
    setTimeout(finish, 12000);
  }

  var COLOR_PAGES = [
    ["#61c2f9", "#41b6f9", "#26a6ef", "#0f97e3", "#018ad8", "#fb764b", "#f46233", "#ed4d1b", "#e6400c", "#dd3703", "#fdd752", "#f8cf41", "#ffb749", "#f8a322", "#fb8e0f", "#b4ed3e", "#a1e212", "#94d603", "#85c401", "#77ad01", "#57ef5e", "#38de3e", "#1ed851", "#16cb48", "#0abd3d", "#4aebf5", "#30dbe5", "#20ced9", "#11c1d9", "#00add2", "#4b7cf5", "#3266ee", "#2854f1", "#1f40ed", "#112fcf", "#e45cfa", "#da48f1", "#c648f1", "#b129e1", "#a40cd9"],
    ["#fa84d2", "#fd6ccb", "#ff53c3", "#ff49a0", "#ff4085", "#e8bb9a", "#dea882", "#c08e69", "#9e6e4a", "#a26539", "#ff656f", "#f4404b", "#f63434", "#fb2f2e", "#f71b1b", "#fca41e", "#fe9720", "#f78b0d", "#f57315", "#f46600", "#a259ff", "#ff5959"]
  ];



  var WHEEL_HUES = 36;
  var WHEEL_RINGS = 9;
  var WHEEL_HOLE = 0.12;
  var QUICK_COLORS = COLOR_PAGES[0].slice(0, 5);
  var BASE_COLORS = [
    "#26a6ef", "#ed4d1b", "#fdd752", "#94d603", "#1ed851",
    "#20ced9", "#2854f1", "#c648f1", "#ff53c3", "#c08e69",
    "#f63434", "#f78b0d", "#a259ff", "#ff5959", "#00add2"
  ];


  var RECENT_SLOTS = 14;

  function ensureRecent() {
    if (state.recentColors && state.recentColors.length > RECENT_SLOTS) {
      state.recentColors = state.recentColors.slice(0, RECENT_SLOTS);
    }
    if (!state.recentColors || state.recentColors.length !== RECENT_SLOTS) {
      state.recentColors = BASE_COLORS.slice(0, RECENT_SLOTS);
      state.recentCursor = 0;
    }
    if (state.recentCursor == null || state.recentCursor >= RECENT_SLOTS) state.recentCursor = 0;
  }

  function rememberColor(color) {
    if (!color) return;
    ensureRecent();
    var list = state.recentColors;
    for (var i = 0; i < list.length; i++) {
      if (sameColor(list[i], color)) return;
    }
    var at = state.recentCursor % list.length;
    list[at] = color;
    state.recentCursor = (at + 1) % list.length;
    save();
  }

  function hexToHsv(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return { h: 200, s: 0.7, v: 0.9 };
    var n = parseInt(m[1], 16);
    var r = ((n >> 16) & 255) / 255;
    var g = ((n >> 8) & 255) / 255;
    var b = (n & 255) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var d = max - min;
    var h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h: h, s: max ? d / max : 0, v: max };
  }

  function hsvToHex(h, s, v) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(1, s));
    v = Math.max(0, Math.min(1, v));
    var c = v * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = v - c;
    var r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    function hex(n) { return Math.round((n + m) * 255).toString(16).padStart(2, "0"); }
    return "#" + hex(r) + hex(g) + hex(b);
  }
  function recentVolumeRow(selected) {
    var vols = LC.recentVolumes(withWaterDay(state.entries), waterToday(), selected, 8);
    return K().chipRow({ cls: "vol-pick", values: vols, selected: selected, act: "pick-recent-volume", ui: "recent" });
  }

  function pageCreate() {
    ensureRecent();
    var d = ui.createDraft || { name: "", hydration: 100, icon: "drop", color: "#61c2f9" };
    var colors = state.recentColors.map(function (c) {
      var on = sameColor(c, d.color);
      return '<button type="button" class="cdot' + (on ? " on" : "") + '" style="background:' + c + ";--ring:" + c + '" data-act="pick-color" data-color="' + c + '" aria-label="Цвет"></button>';
    }).join("");
    var hyd = Math.max(0, Math.min(100, Math.round(Number(d.hydration) || 0)));
    var err = ui.nameError ? "Необходимо указать название" : "";
    return '' +
      K().header({ ui: "create", cls: "top band", back: uiIcon("back"), title: d.editing ? "Изменение напитка" : "Создание напитка" }) +
      '<div class="form"><div class="lbl">Название напитка</div>' +
      '<input class="field' + (ui.nameError ? " bad" : "") + '" data-field="drink-name" maxlength="100" placeholder="Название напитка" value="' + esc(d.name) + '">' +
      '<div class="field-meta"><span class="err">' + err + '</span><span class="counter">' + (d.name || "").length + "/100</span></div>" +
      '<div class="hyd-head"><span>Индекс гидратации</span><b class="hyd-val">' + hyd + "%</b></div>" +
      '<div class="hslider" style="--p:' + hyd + '" role="slider" tabindex="0" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + hyd + '" aria-label="Индекс гидратации">' +
      '<div class="hslider-track"><div class="hslider-fill"></div></div>' +
      '<div class="hslider-thumb"></div></div>' +
      '<p class="hint">Чем больше в напитке примесей, тем ниже его индекс гидратации.</p>' +
      '<div class="icon-line"><div><div class="lbl" style="margin-top:0">Иконка</div><p class="hint">Поможет Вам быстрее найти нужный напиток в списках</p></div>' +
      '<button type="button" class="bubble icon-pick" style="background:' + d.color + '" data-act="open-icons">' + glyph(d.icon) + "</button></div>" +
      '<div class="color-grid">' + colors +
      '<button type="button" class="cplus" data-act="open-colors" aria-label="Выбор цвета">' + uiIcon("plus") + "</button></div></div>";
  }

  function pageColors() {
    var picked = ui.colorPick || (ui.createDraft && ui.createDraft.color) || "#61c2f9";
    var page = ui.colorPage || 0;
    if (page < 0 || page >= COLOR_PAGES.length) page = 0;
    ui.colorPage = page;
    var cells = COLOR_PAGES[0].map(function (c) {
      var on = sameColor(c, picked);
      return '<button type="button" class="' + (on ? "on" : "") + '" style="background:' + c + ";--ring:" + c + '" data-act="pick-palette" data-color="' + c + '" aria-label="Цвет"></button>';
    }).join("");
    var shift = page === 1 ? "-50%" : "0";
    var prole = ui.paintRole ? paintRole(ui.paintRole) : null;
    return K().header({ ui: "colors", cls: "top band", back: uiIcon("back"), title: prole ? esc(prole.label) : "Выбор цвета" }) +
      '<div class="color-viewport" data-palette><div class="color-track" style="transform:translateX(' + shift + ')">' +
      '<div class="color-pane"><div class="palette">' + cells + "</div></div>" +
      '<div class="color-pane"><div class="wheel-page"><div class="wheel-box">' +
      '<canvas class="hue-wheel" aria-label="Цветовой круг"></canvas>' +
      '<div class="wheel-marker"></div></div></div></div></div></div>' +
      (prole ? '<div class="paint-bar"><button type="button" data-act="paint-reset" data-v="' + prole.id + '">Сброс к теме</button></div>' : "");
  }

  function pageIcons() {
    var keys = PICKER_ICONS;
    var picked = ui.iconPick;
    var cells = keys.map(function (k) {
      return '<button type="button" class="' + (k === picked ? "on" : "") + '" data-act="pick-icon" data-icon="' + k + '">' + glyph(k) + "</button>";
    }).join("");
    return K().header({ ui: "icons", back: uiIcon("back"), backAria: "", title: "Выбор иконки" }) + "<div class=\"igrid\">" + cells + "</div>";
  }

  function initSort() {
    var list = document.querySelector(".sort-list");
    if (!list) return;
    var dragEl = null;
    list.addEventListener("pointerdown", function (e) {
      var handle = e.target.closest(".handle");
      if (!handle) return;
      dragEl = handle.closest(".sort-item");
      dragEl.classList.add("drag");
      try { handle.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    list.addEventListener("pointermove", function (e) {
      if (!dragEl) return;
      var items = Array.prototype.slice.call(list.querySelectorAll(".sort-item"));
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it === dragEl) continue;
        var r = it.getBoundingClientRect();
        if (e.clientY > r.top && e.clientY < r.bottom) {
          list.insertBefore(dragEl, e.clientY < r.top + r.height / 2 ? it : it.nextSibling);
          break;
        }
      }
    });
    function end() {
      if (!dragEl) return;
      dragEl.classList.remove("drag");
      ui.sortOrder = Array.prototype.map.call(list.querySelectorAll(".sort-item"), function (it) { return it.dataset.id; });
      dragEl = null;
    }
    list.addEventListener("pointerup", end);
    list.addEventListener("pointercancel", end);
  }

  function setHydration(value) {
    if (!ui.createDraft) return;
    var v = Math.max(0, Math.min(100, Math.round(value)));
    ui.createDraft.hydration = v;
    var el = document.querySelector(".hslider");
    if (el) {
      el.style.setProperty("--p", String(v));
      el.setAttribute("aria-valuenow", String(v));
    }
    var b = document.querySelector(".hyd-val");
    if (b) b.textContent = v + "%";
  }

  function initHydSlider() {
    var el = document.querySelector(".hslider");
    if (!el) return;
    function fromPointer(e) {
      var r = el.getBoundingClientRect();
      var x = r.width ? (e.clientX - r.left) / r.width : 0;
      setHydration(x * 100);
    }
    el.addEventListener("pointerdown", function (e) {
      if (e.button != null && e.button !== 0) return;
      el.setPointerCapture(e.pointerId);
      fromPointer(e);
    });
    el.addEventListener("pointermove", function (e) {
      if (!el.hasPointerCapture(e.pointerId)) return;
      fromPointer(e);
    });
    el.addEventListener("keydown", function (e) {
      var cur = ui.createDraft ? ui.createDraft.hydration : 0;
      var next = cur;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") next = cur + 1;
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = cur - 1;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = 100;
      else return;
      e.preventDefault();
      setHydration(next);
    });
  }

  function wheelModel() {
    if (!ui.wheel) {
      var hsv = hexToHsv(ui.colorPick || "#61c2f9");
      ui.wheel = { h: hsv.h, s: hsv.s, v: hsv.v < 0.08 ? 1 : hsv.v };
    }
    return ui.wheel;
  }

  function snapWheel(h, s) {
    var step = 360 / WHEEL_HUES;
    var hs = (Math.floor((((h % 360) + 360) % 360) / step) + 0.5) * step;
    if (hs >= 360) hs -= 360;
    if (s <= 0.02) return { h: hs, s: 0 };
    var ring = Math.min(WHEEL_RINGS - 1, Math.max(0, Math.floor(s * WHEEL_RINGS)));
    return { h: hs, s: (ring + 0.5) / WHEEL_RINGS };
  }

  function drawHueWheel(canvas) {
    var box = canvas.parentElement;
    var size = Math.max(120, Math.round(canvas.clientWidth || box.clientWidth || 300));
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    var ctx = canvas.getContext("2d");
    var cx = canvas.width / 2;
    var cy = canvas.height / 2;
    var R = canvas.width / 2 - dpr;
    var hole = R * WHEEL_HOLE;
    var model = wheelModel();
    var v = model.v;
    for (var ring = 0; ring < WHEEL_RINGS; ring++) {
      var r0 = hole + (R - hole) * ring / WHEEL_RINGS;
      var r1 = hole + (R - hole) * (ring + 1) / WHEEL_RINGS;
      var s = (ring + 0.5) / WHEEL_RINGS;
      for (var i = 0; i < WHEEL_HUES; i++) {
        var h0 = i * (360 / WHEEL_HUES);
        var h1 = (i + 1) * (360 / WHEEL_HUES);
        var a0 = -h1 * Math.PI / 180;
        var a1 = -h0 * Math.PI / 180;
        ctx.beginPath();
        ctx.arc(cx, cy, r1, a0, a1, false);
        ctx.arc(cx, cy, r0, a1, a0, true);
        ctx.closePath();
        ctx.fillStyle = hsvToHex((h0 + h1) / 2, s, v);
        ctx.fill();
      }
    }
    ctx.beginPath();
    ctx.arc(cx, cy, hole + dpr, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }

  function placeWheelMarker() {
    var box = document.querySelector(".wheel-box");
    if (!box) return;
    var marker = box.querySelector(".wheel-marker");
    var canvas = box.querySelector(".hue-wheel");
    if (!marker || !canvas) return;
    var model = wheelModel();
    var snapped = snapWheel(model.h, model.s);
    var size = canvas.clientWidth || box.clientWidth;
    var R = size / 2;
    var hole = R * WHEEL_HOLE;
    var dist = snapped.s <= 0 ? hole * 0.35 : hole + snapped.s * (R - hole);
    var ang = -snapped.h * Math.PI / 180;
    marker.style.left = (R + Math.cos(ang) * dist) + "px";
    marker.style.top = (R + Math.sin(ang) * dist) + "px";
    marker.style.background = ui.colorPick || hsvToHex(snapped.h, snapped.s, model.v);
  }

  function applyWheelPoint(h, s, touched) {
    var model = wheelModel();
    var snapped = snapWheel(h, s);
    model.h = snapped.h;
    model.s = snapped.s;
    var hex = snapped.s <= 0 ? "#ffffff" : hsvToHex(snapped.h, snapped.s, model.v);
    ui.colorPick = hex;
    if (ui.paintRole) commitPaint(hex, false);
    if (touched) ui.colorTouched = true;
    placeWheelMarker();
  }

  /* Донор app.js:7467-7557 — жестовая машинка палитры: не доехала при
     переносе (initColorWheel ссылался на colorGesture в никуда, круг
     умирал с ReferenceError на первом касании). Возвращена дословно. */
  var colorGesture = { active: false, x: 0, y: 0, dx: 0, dy: 0, mode: "", pointerId: null };

  function classifyColorGesture() {
    if (colorGesture.mode) return colorGesture.mode;
    if (Math.abs(colorGesture.dx) < 8 && Math.abs(colorGesture.dy) < 8) return "";
    colorGesture.mode = Math.abs(colorGesture.dx) > Math.abs(colorGesture.dy) * 1.15 ? "swipe" : "pick";
    return colorGesture.mode;
  }

  function initPaletteSwipe() {
    var screen = document.querySelector(".colors-screen");
    var view = document.querySelector(".color-viewport");
    var track = document.querySelector(".color-track");
    if (!screen || !view || !track) return;
    function width() { return view.clientWidth || 412; }
    function pointerScale() {
      var app = document.getElementById("app");
      if (!app) return 1;
      var rect = app.getBoundingClientRect();
      var scale = rect.width / (app.offsetWidth || 412);
      return scale > 0 ? scale : 1;
    }
    function place(page, extra, animate) {
      track.style.transition = animate ? "transform .26s ease" : "none";
      track.style.transform = "translateX(" + ((-page * width()) + (extra || 0)) + "px)";
    }
    function syncPager() {
      document.querySelectorAll(".pager button").forEach(function (b) {
        b.classList.toggle("on", Number(b.dataset.page) === ui.colorPage);
      });
    }
    function onMove(e) {
      if (!colorGesture.active || e.pointerId !== colorGesture.pointerId) return;
      colorGesture.dx = e.clientX - colorGesture.x;
      colorGesture.dy = e.clientY - colorGesture.y;
      if (classifyColorGesture() !== "swipe") return;
      var w = width();
      var x = -ui.colorPage * w + colorGesture.dx / pointerScale();
      if (x > 0) x *= 0.3;
      if (x < -w) x = -w + (x + w) * 0.3;
      track.style.transition = "none";
      track.style.transform = "translateX(" + x + "px)";
    }
    function finish(e) {
      if (!colorGesture.active || (e && e.pointerId != null && e.pointerId !== colorGesture.pointerId)) return;
      var dx = colorGesture.dx;
      var dy = colorGesture.dy;
      var mode = colorGesture.mode;
      colorGesture.active = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      if (mode === "swipe" && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        var next = ui.colorPage + (dx < 0 ? 1 : -1);
        if (next >= 0 && next < COLOR_PAGES.length) {
          suppressNextClick(300);
          ui.colorPage = next;
          if (next === 1) ui.wheel = null;
          var canvas = document.querySelector(".hue-wheel");
          if (canvas && next === 1) {
            drawHueWheel(canvas);
            placeWheelMarker();
          }
          document.querySelectorAll(".palette button").forEach(function (b) {
            b.classList.toggle("on", sameColor(b.dataset.color, ui.colorPick));
          });
        }
        place(ui.colorPage, 0, true);
        syncPager();
        return;
      }
      if (Math.abs(dx) > 8) suppressNextClick(300);
      place(ui.colorPage, 0, true);
    }
    screen.addEventListener("pointerdown", function (e) {
      if (e.button != null && e.button !== 0) return;
      if (e.target.closest(".icon-btn")) return;
      colorGesture.active = true;
      colorGesture.x = e.clientX;
      colorGesture.y = e.clientY;
      colorGesture.dx = 0;
      colorGesture.dy = 0;
      colorGesture.mode = "";
      colorGesture.pointerId = e.pointerId;
      place(ui.colorPage, 0, false);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", finish);
    });
  }

  function initColorWheel() {
    var canvas = document.querySelector(".hue-wheel");
    if (!canvas) return;
    function paint() {
      drawHueWheel(canvas);
      placeWheelMarker();
    }
    paint();
    if (!canvas.clientWidth) requestAnimationFrame(paint);
    function fromPointer(e) {
      var r = canvas.getBoundingClientRect();
      var x = e.clientX - r.left - r.width / 2;
      var y = e.clientY - r.top - r.height / 2;
      var R = r.width / 2;
      var hole = R * WHEEL_HOLE;
      var dist = Math.sqrt(x * x + y * y);
      if (dist > R + 12) return;
      var h = -Math.atan2(y, x) * 180 / Math.PI;
      if (h < 0) h += 360;
      var s = dist <= hole ? 0 : Math.min(1, (dist - hole) / (R - hole));
      applyWheelPoint(h, s, true);
    }
    canvas.addEventListener("pointermove", function (e) {
      if (!colorGesture.active || e.pointerId !== colorGesture.pointerId) return;
      colorGesture.dx = e.clientX - colorGesture.x;
      colorGesture.dy = e.clientY - colorGesture.y;
      if (classifyColorGesture() !== "pick") return;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* swipe owns the gesture */ }
      fromPointer(e);
    });
    canvas.addEventListener("pointerup", function (e) {
      if (!colorGesture.active || colorGesture.mode === "swipe" || colorGesture.mode === "pick") return;
      if (!e.target.closest(".hue-wheel, .wheel-box")) return;
      fromPointer(e);
    });
  }


  function colorPageOf(color) {
    for (var i = 0; i < COLOR_PAGES[0].length; i++) {
      if (sameColor(COLOR_PAGES[0][i], color)) return 0;
    }
    return 1;
  }

  function sameColor(a, b) {
    return String(a || "").toLowerCase() === String(b || "").toLowerCase();
  }

  function ensureRecent() {
    if (state.recentColors && state.recentColors.length > RECENT_SLOTS) {
      state.recentColors = state.recentColors.slice(0, RECENT_SLOTS);
    }
    if (!state.recentColors || state.recentColors.length !== RECENT_SLOTS) {
      state.recentColors = BASE_COLORS.slice(0, RECENT_SLOTS);
      state.recentCursor = 0;
    }
    if (state.recentCursor == null || state.recentCursor >= RECENT_SLOTS) state.recentCursor = 0;
  }

  function withWaterDay(entries) {
    if (!LC.minutesOf(dayStartValue())) return entries;
    return entries.map(function (e) {
      var d = J().entryDay(state, e);
      return d === e.date ? e : Object.assign({}, e, { date: d });
    });
  }

  function uid() { return J().uid(); } /* m03 */
  function entryDay(e) { return J().entryDay(state, e); } /* донорский алиас m03 */
  function tzParts(d) { return N().tzParts(d); }

  function cupTarget(te, iso, mr) {
    var n = state.notifications;
    var everyEff = n && P().isPace(n) ? P().paceEveryMin() : Number(n && n.everyMin) || 0;
    if (n && n.enabled && everyEff > 0) return nextSlotMs(te);
    if (mr.mood <= 3) return te;
    var horizon = te + 36 * 3600000, t;
    for (t = te + 300000; t <= horizon; t += 300000) {
      if (LC.catMood(state, iso, t).mood <= 3) break;
    }
    if (t > horizon) return null;
    for (var q = t - 240000; q < t; q += 60000) {
      if (LC.catMood(state, iso, q).mood <= 3) return q;
    }
    return t;
  }


  function cupDurLabel(ms) {
    var min = Math.round(ms / 60000);
    if (min < 1) min = 1;
    var h = Math.floor(min / 60), m = min % 60;
    if (h && m) return h + " ч " + m + " мин";
    if (h) return h + " ч";
    return m + " мин";
  }


  function wallMsNowSec() {
    var fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
    });
    var map = {};
    /* обязательно от явного new Date(): formatToParts() без аргумента взял бы
       системное время мимо замороженных часов и патчей. */
    fmt.formatToParts(new Date()).forEach(function (p) { if (p.type !== "literal") map[p.type] = p.value; });
    if (map.hour === "24") map.hour = "00";
    return Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), Number(map.hour), Number(map.minute), Number(map.second));
  }


  function cupModel(now) {
    var today = waterToday();
    var es = dayEntries(today);
    if (!es.length) return { level: 0, kind: "empty", leftMs: 0, color: null };
    var maxVol = 0, last = null;
    es.forEach(function (e) {
      var v = Number(e.volume) || 0;
      if (v > maxVol) maxVol = v;
      var at = Number(e.createdAt) || 0;
      if (!last || at >= (Number(last.createdAt) || 0)) last = e;
    });
    /* createdAt — реальная эпоха; модель и слоты живут настенными мс пояса
       (SAMARA/UTC+4): переводим тем же мостом, что и планировщик слотов. */
    var te = Number(last.createdAt) || 0;
    if (te) {
      var q = tzParts(new Date(te));
      te = Date.UTC(Number(q.year), Number(q.month) - 1, Number(q.day), Number(q.hour), Number(q.minute));
    } else te = now;
    var color = (drinkById(last.drinkId) || {}).color || "#61c2f9";
    var mr = LC.catMood(state, today, now);
    if (mr.mood >= 6) return { level: 100, kind: "full", leftMs: 0, color: color };
    var T = cupTarget(te, today, mr);
    if (T == null || T <= te) return { level: 0, kind: "empty", leftMs: 0, color: color };
    var leftMs = T - wallMsNowSec();
    if (leftMs <= 0) return { level: 0, kind: "empty", leftMs: 0, color: color };
    var k = Math.max(0, Math.min(1, (T - now) / (T - te)));
    var level = Math.round(100 * (maxVol > 0 ? (Number(last.volume) || 0) / maxVol : 0) * k);
    return { level: level, kind: level <= 0 ? "empty" : "timer", leftMs: leftMs, color: color };
  }


  function cupLabelFor(cup, mode) {
    if (cup.kind === "full") return "полна";
    if (cup.kind === "empty") return "пусто";
    if (mode === "countdown") {
      var sec = Math.max(0, Math.round(cup.leftMs / 1000));
      var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
      return h > 0 ? h + ":" + pad(m) : pad(m) + ":" + pad(s);
    }
    return cupDurLabel(cup.leftMs);
  }


  function cupSecTick() {
    if (ui.sheet || ui.modal || ui.tab !== "home") return;
    var el = document.querySelector(".home-dock .cup-pill > span");
    if (!el) return;
    var cup = cupModel(wallMsNow());
    if (cup.kind !== ui._cupKind || cup.level !== ui._cupLv) { render(); return; }
    if (state.cupLabel !== "countdown" || cup.kind !== "timer") return;
    var lbl = cupLabelFor(cup, "countdown");
    if (el.textContent !== lbl) el.textContent = lbl;
  }


  function notifyTextsRender(cas) { return notifyPreview(cas); } /* донор app.js 3407, вызов из onField */

  function notifyPreview(cas) {
    /* m12-pace notifyTextsRender(ctx, cas): ctx донора app.js 3407. */
    /* Донор app.js 3407-3410: drunk — сумма записей водных суток,
       goal — цель напоминаний effGoalFor (v137). */
    var n = N().ensureAlerts(state);
    var today = N().waterToday(state);
    return P().notifyTextsRender({
      n: n, goal: N().effGoalFor(state, today),
      drunk: sumKey(dayEntries(today), "volume"), nowMs: N().wallMsNow()
    }, cas);
  }

  function SU() { return window.SettingsUI; }

  /* M25: обёртка сид-мест. Файл m25-settings-model.js остаётся байт-в-байт
     донорским; строки неприехавших модулей помечаются visible=false здесь —
     renderSettingsBlocks и pageFolder донора такие строки не рисуют, а
     rowsOfGroup/двери считают только живые. Двери подпапок без живых строк
     не рисуются (объявленное отклонение: донор рисует «Подпапка · пусто»). */
  function wrappedModel() {
    var SM = window.SettingsModel;
    if (!SM || SM.__wt2Wrapped) return SM;
    var SEAT_IDS = {
      animation: 1, warnExceed: 1 };
    function seatCustom(r) {
      /* живые цвета и волна перенесены: liqBlock/bubBlock/chartBlock/wave живые. */
      return false;
    }
    function mark(cat) {
      Object.keys(cat || {}).forEach(function (id) {
        var r = cat[id];
        if (!r || typeof r !== "object") return;
        if (SEAT_IDS[id] || seatCustom(r)) {
          if (r.visible !== false) cat[id] = Object.assign({}, r, { visible: false });
        }
      });
      return cat;
    }
    function live(lay, cat, gid) {
      return SM.rowsOfGroup(lay, cat, gid).filter(function (rid) {
        var r = cat[rid];
        return r && r.visible !== false;
      });
    }
    function doorSub(n) {
      return n ? "Подпапка · " + n + (n === 1 ? " строка" : (n < 5 ? " строки" : " строк")) : "Подпапка · пусто";
    }
    function filterBlocks(blocks, lay, cat) {
      return (blocks || []).map(function (b) {
        var items = [];
        (b.items || []).forEach(function (it) {
          if (!it) return;
          /* SM собирает items из своего немаркированного каталога —
             сверяем видимость по маркированному cat[id]. */
          if (!it.folder && cat[it.id] && cat[it.id].visible === false) return;
          if (it.folder) {
            var n = live(lay, cat, "@" + it.folder).length;
            if (!n) return;
            it = Object.assign({}, it, { sub: doorSub(n) });
          }
          items.push(it);
        });
        return Object.assign({}, b, { items: items });
      });
    }
    var w = Object.assign({}, SM, { __wt2Wrapped: true });
    w.fullCatalog = function (ctx) { return mark(SM.fullCatalog(ctx)); };
    w.rowsOfGroup = function (lay, cat, gid) { return live(lay, cat, gid); };
    function compose(fn, ctx, lay) {
      var cat = w.fullCatalog(ctx);
      var ml = SM.migrateLayout(lay, cat);
      return filterBlocks(fn(ctx, ml), ml, cat);
    }
    w.composeMain = function (ctx, lay) { return compose(SM.composeMain, ctx, lay); };
    w.composeLook = function (ctx, lay) { return compose(SM.composeLook, ctx, lay); };
    w.composeAdvanced = function (ctx, lay) { return compose(SM.composeAdvanced, ctx, lay); };
    w.composeAlerts = function (lay, cat) {
      /* Донор: composeAlerts(layout, catalog) → МАССИБ разделов {id,title,ids}. */
      var c = cat || SM.fullCatalog({ flags: {}, labels: {} });
      c = mark(Object.assign({}, c));
      var ml = SM.migrateLayout(lay, c);
      var secs = SM.composeAlerts(ml, c);
      return (secs || []).map(function (f) {
        return { id: f.id, title: f.title, ids: (f.ids || []).filter(function (rid) {
          var r = c[rid];
          return r && r.visible !== false;
        }) };
      });
    };
    return w;
  }

  function settingsEnv() {
    return {
      state: state, ui: ui, save: save, render: render, esc: esc, uiIcon: uiIcon,
      ALERT_SOUNDS: ALERT_SOUNDS, APP_VERSION: versionLabel(),
      UiKit: window.UiKit, SettingsModel: wrappedModel(), LiquidColor: window.LiquidColor, L: LC,
      cloud: cloud, avatarSrc: avatarSrc, cloudBridge: cloudBridge, cloudBackupLabel: cloudBackupLabel,
      drinkById: drinkById, currentDrink: currentDrink, fmtWeight: fmtWeight, volLabel: volLabel,
      recommendedMl: recommendedMl, isImperial: isImperial, fmtDayStart: fmtDayStart, dayStartValue: dayStartValue,
      THEME_NAMES: THEME_NAMES, resolvedTheme: resolvedTheme, ensureAlerts: ensureAlerts, freqLabel: freqLabel,
      freqSubLabel: freqSubLabel,
      alertSoundTitle: alertSoundTitle, nextSlot: nextSlot, notifyWindow: notifyWindow, weekdayIndex: weekdayIndex,
      spanLabel: spanLabel, parseHM: parseHM, shiftHM: shiftHM, pad: pad, waterToday: waterToday,
      dayEntries: dayEntries, sumKey: sumKey, goalFor: goalFor, activityRow: activityRow, activityIcon: activityIcon,
      weatherIcon: weatherIcon, wallMsNow: wallMsNow, todayStr: todayStr, skinOn: skinOn, skinCount: skinCount,
      duplicateStats: duplicateStats, historyExportSummary: historyExportSummary, dbSaveHint: dbSaveHint,
      dbShareHint: dbShareHint, systemCalNote: systemCalNote, systemClockNote: systemClockNote,
      systemDrumNote: systemDrumNote, noBuiltinBase: noBuiltinBase, durationPhrase: durationPhrase, catRiveFailed: catRiveFailed,
      dayWindow: dayWindow, ruDate: ruDate, timeEditorHtml: timeEditorHtml,
      HabitSchedule: window.HabitSchedule, notifyPreview: notifyPreview
    };
  }

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
    return '<div class="screen onb-screen">' + O().screenHtml(ui.onb, { catArt: onbOrbArt() }) + O().overHtml(ui) + "</div>";
  }


  function applyCalToHistory() {
    var d = ui.calDate && ui.calDate <= todayStr() ? ui.calDate : todayStr();
    ui.historyDate = d;
    if (ui.histBars) {
      for (var i = 0; i < ui.histBars.length; i++) {
        if (ui.histBars[i].date === d) {
          ui.chartLeft = Math.max(0, i * 82 - 120);
          break;
        }
      }
    }
    ui.histWin = null;
    ui._chartLeftLocked = 1;
  }

  function calMarksFor() {
    var marks = {};
    var sums = {};
    state.entries.forEach(function (e) {
      var dd = entryDay(e);
      sums[dd] = (sums[dd] || 0) + (e.volume || 0);
    });
    Object.keys(sums).forEach(function (dd) { marks[dd] = sums[dd] >= goalFor(dd) ? "ok" : "under"; });
    return marks;
  }

  function shiftPeriod(range, anchor, delta) {
    anchor = anchor || todayStr();
    if (range === "year") return (Number(anchor.slice(0, 4)) + delta) + "-01-01";
    if (range === "month") {
      var y = Number(anchor.slice(0, 4));
      var m = Number(anchor.slice(5, 7)) - 1 + delta;
      var d = new Date(Date.UTC(y, m, 1));
      return d.getUTCFullYear() + "-" + pad2(d.getUTCMonth() + 1) + "-01";
    }
    return L.addDays(weekStart(anchor), delta * 7);
  }

  function renderCalPanel() {
    var old = document.querySelector(".cal-panel");
    if (!old || !old.parentNode) { render(); return; }
    var tmp = document.createElement("div");
    tmp.innerHTML = calendarHtml(ui.calDate || (ui.weightDraft && ui.weightDraft.date) || todayStr(), ui.calMonth || todayStr().slice(0, 7));
    var fresh = tmp.querySelector(".cal-panel");
    if (!fresh) { render(); return; }
    old.parentNode.replaceChild(fresh, old);
  }

  function calendarHtml(selected, monthIso) {
    var names = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
    var gen = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
    var heads = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
    var today = todayStr();
    /* Календарь истории (спека 26.10.2026, схема меток владельца):
       синяя точка — норма выполнена, красная — недопоил, нет точки — записей нет;
       дни раньше первой записи базы неактивны. Для даты веса меток нет. */
    var marks = null, minIso = null;
    if (ui.calTarget === "hist") {
      /* v94: метки кэшируются на сеанс календаря (создан при открытии,
         сброшен при закрытии). База на тысячи записей пересчитывалась на
         каждый шаг месяца — именно это тормозило листание. */
      marks = ui.calMarks || null;
      if (!marks) { marks = calMarksFor(); ui.calMarks = marks; }
      minIso = ui.histBars && ui.histBars.length ? ui.histBars[0].date : null;
    }
    var y = Number(monthIso.slice(0, 4));
    var m = Number(monthIso.slice(5, 7));
    var firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    var lead = firstDow === 0 ? 6 : firstDow - 1;
    var days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    var cells = "";
    for (var i = 0; i < lead; i++) cells += '<span class="cal-day blank"></span>';
    for (var d = 1; d <= days; d++) {
      var iso = monthIso + "-" + pad2(d);
      if (iso > today) {
        cells += '<span class="cal-day future">' + d + "</span>";
      } else if (minIso && iso < minIso) {
        cells += '<span class="cal-day past-off">' + d + "</span>";
      } else {
        var dot = marks && marks[iso] ? (marks[iso] === "ok" ? " dot-ok" : " dot-under") : "";
        cells += '<button type="button" class="cal-day' + dot + (iso === selected ? " on" : "") + '" data-act="cal-pick" data-date="' + iso + '">' + d + "</button>";
      }
    }
    var sm = Number(selected.slice(5, 7)) - 1;
    var picked = Number(selected.slice(8, 10)) + " " + gen[sm] + " " + selected.slice(0, 4) + " г.";
    var nextStart = shiftPeriod("month", monthIso + "-01", 1);
    var nextBtn = nextStart <= today
      ? '<button type="button" data-act="cal-shift" data-delta="1" aria-label="Следующий месяц"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M9.5 6.5 15 12l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'
      : '<span class="cal-nav-gap"></span>';
    return '<div class="modal-scrim cal" data-act="close-calendar"></div><div class="cal-panel" role="dialog" aria-label="Дата">' +
      '<div class="cal-title">Дата</div>' +
      '<div class="cal-picked">' + picked + "</div>" +
      '<div class="cal-nav"><button type="button" data-act="cal-shift" data-delta="-1" aria-label="Предыдущий месяц"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M14.5 6.5 9 12l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button><span>' +
      names[m - 1] + " " + y + " г.</span>" + nextBtn + "</div>" +
      '<div class="cal-week">' + heads.map(function (h) { return "<span>" + h + "</span>"; }).join("") + "</div>" +
      '<div class="cal-grid">' + cells + "</div>" +
      '<div class="cal-actions">' + (ui.calTarget === "hist" ? '<button type="button" data-act="cal-today">Сегодня</button>' : "") + '<button type="button" data-act="close-calendar">Отмена</button><button type="button" data-act="cal-ok">Ок</button></div></div>';
  }

  function overlayHtml() {
    var out = "";
    if (ui.modal === "calendar") out += calendarHtml(ui.calDate || (ui.weightDraft && ui.weightDraft.date) || todayStr(), ui.calMonth || todayStr().slice(0, 7));
    if (!ui.page && ui.sheet === "activity") {
      /* Второй близнец: тот же кубик, другие данные. */
      var actToday = todayStr();
      out += window.UiKit ? K().choiceSheet({ ui: "activity",
        cls: "activity",
        title: "Физическая активность",
        current: LC.activityOn(state, actToday, actToday),
        pickAct: "pick-activity",
        save: { act: "toggle-activity-save", on: state.activitySave, label: "Сохранять выбор для последующих дней?" },
        options: activityLevels().map(function (row) {
          return { v: row[0], label: row[1], icon: figureIcon(row[2], row[3]), bonus: LC.activityBonus(adjustBase(), row[0]) };
        })
      }) : "";
    }
    if (!ui.page && ui.sheet === "weather") {
      /* Кубик choiceSheet (ui-kit): шторка-выбор собирается одним вызовом,
         разметка побайтово равна прежней ручной сборке. */
      var today = todayStr();
      out += window.UiKit ? K().choiceSheet({ ui: "weather",
        cls: "weather",
        title: "Погода",
        sub: "Сегодня " + LC.goalOn(state, today, today) + " мл",
        current: LC.levelOn(state, today, today),
        pickAct: "pick-weather",
        save: { act: "toggle-weather-save", on: state.weatherSave, label: "Сохранять выбор для последующих дней?" },
        options: [["hot", "Жарко"], ["warm", "Тепло"], ["everyday", "Повседневная"], ["cold", "Холодно"]].map(function (w) {
          return { v: w[0], label: w[1], icon: weatherIcon(w[0]), bonus: LC.weatherBonus(adjustBase(), w[0]) };
        })
      }) : "";
    }
    /* M22: FAB центром на линии М: история — добавить запись, вес — взвешивание. */
    if (!ui.sheet && !ui.modal && !ui.page && ui.tab === "history") {
      out += U().roundBtn({ ui: "add", role: "fab", act: "open-add", aria: "Добавить запись", icon: uiIcon("plus") });
    }
    if (!ui.sheet && !ui.modal && !ui.page && ui.tab === "weight") {
      out += U().roundBtn({ ui: "add-weight", role: "fab", act: "open-weight", aria: "Добавить", icon: uiIcon("plus") });
    }
    if (!ui.page && ui.sheet === "volume") {
      var volumeControl = useSystemDrums()
        ? sysLaunch("sys-volume", ui.volumeDraft + " мл")
        : (window.UiKit ? K().wheelBlock({ ui: "volume-add",
            cls: "wheel-block",
            items: [{ wheel: { name: "volume", value: ui.volumeDraft, min: 10, max: 2000, step: 10 } },
                    { unit: "мл", unitCls: "unit" }]
          }) : "");
      out += K().sheet({
        ui: "volume", scrimCls: ui.pinning ? " heavy" : " menu", cls: "volume" + (ui.pinning ? "" : " menu"),
        title: ui.pinning ? "Объём избранного" : null,
        body: volumeSheetBody({ ui: "volume", pinning: ui.pinning, pickAct: "pick-volume-drink",
          selectedId: ui.volumeDrinkId || (state.profile && state.profile.drinkId),
          volume: ui.volumeDraft, wheel: volumeControl }),
        tail: '<div class="sheet-actions">' + K().roundBtn({ ui: "commit-volume", role: "check", pos: "center", act: "commit-volume", aria: "Применить объём", icon: uiIcon("check") }) + "</div>"
      });
    }
    if (!ui.page && ui.sheet === "hist-add" && ui.addDraft) {
      var draft = ui.addDraft;
      /* Тело то же, что у домашнего меню: разница только по контракту шага 7
         (дата сверху, время справа снизу; метка изменения — состояние правки).
         Выбранный напиток записи мог исчезнуть из списка: snapshot из черновика. */
      if (draft.drinkId && !drinkById(draft.drinkId) && draft.snapshot) {
        state.drinks = [draft.snapshot].concat(state.drinks);
      }
      out += K().sheet({
        ui: "hist-add", scrimCls: " menu", cls: "volume menu",
        body: volumeSheetBody({ ui: "hist-add", pickAct: "pick-quick",
          editTag: !!draft.entryId, date: fmtLong(ui.historyDate || todayStr()),
          selectedId: draft.drinkId, volume: draft.volume,
          wheel: useSystemDrums()
            ? sysLaunch("sys-entry-volume", draft.volume + " мл")
            : (window.UiKit ? K().wheelBlock({ ui: "volume-edit",
                cls: "wheel-block",
                items: [{ wheel: { name: "volume", value: draft.volume, min: 10, max: 2000, step: 10 } },
                        { unit: "мл", unitCls: "unit" }]
              }) : "") }),
        tail: '<div class="sheet-actions">' + K().roundBtn({ ui: "commit-entry", role: "check", pos: "center", act: "commit-entry", icon: uiIcon("check") }) +
          K().roundBtn({ ui: "time-open", role: "time", act: "open-time", icon: uiIcon("clock"), text: esc(draft.time) }) + "</div>"
      });
    }
    if (ui.modal === "time" && ui.timeDraft) {
      out += window.UiKit ? K().dialog({ ui: "time",
        scrimAct: "time-cancel",
        cls: "modal",
        title: "Время приема напитка",
        body: timeEditorHtml("time", "hour", "minute", ui.timeDraft.hour, ui.timeDraft.minute, "time-wheels"),
        actions: [{ act: "time-cancel", label: "Отмена" }, { act: "time-ok", label: "Ок" }]
      }) : "";
    }
    if (ui.sheet === "weight") {
      var wd = ui.weightDraft || { date: todayStr(), kg: state.weightKg };
      var parts = splitKg(wd.kg);
      var weightControl = useSystemDrums()
        ? sysLaunch("sys-weight", fmtKg(wd.kg))
        : (window.UiKit ? K().wheelBlock({ ui: "weight-onb",
            cls: "kg-pick",
            items: [{ wheel: { name: "kg-int", value: parts.whole, min: 20, max: 300, step: 1, item: 60 } },
                    { sep: ",", aria: true },
                    { wheel: { name: "kg-dec", value: parts.frac, min: 0, max: 9, step: 1, item: 60 } },
                    { unit: "кг" }]
          }) : "");
      out += K().sheet({
        ui: "weight", scrimCls: " heavy", cls: "weight",
        body: weightControl,
        tail: '<div class="sheet-actions">' + K().roundBtn({ ui: "save-weight", role: "check", pos: "center", act: "save-weight", aria: "Сохранить вес", icon: uiIcon("check") }) +
          K().roundBtn({ ui: "weight-cal", role: "time", cls: "w-date", act: "open-weight-cal", aria: "Выбрать дату", icon: calendarIcon(), text: fmtShort(wd.date) }) +
          /* v107: вход живёт в разметке шита заранее (рабочий сниппет владельца):
             часть WebView молча не показывает пикер для input, созданного в
             том же тике, что и showPicker. */
          '<input type="date" class="wt-dateinp" value="' + wd.date + '" max="' + todayStr() + '" tabindex="-1" aria-hidden="true">' + "</div>"
      });
    }
    if (ui.sheet === "set-weight") {
      var imperial = isImperial();
      var sw = ui.weightDraft || { kg: state.weightKg };
      var sp = imperial ? splitLb(sw.kg) : splitKg(sw.kg);
      out += K().sheet({
        ui: "set-weight", scrimCls: " bare", cls: "weight set-weight",
        body: "" +
        (window.UiKit ? K().wheelBlock({ ui: "weight-edit",
          cls: "kg-pick",
          items: [{ wheel: { name: "kg-int", value: sp.whole, min: imperial ? 44 : 20, max: imperial ? 661 : 300, step: 1, item: 60 } },
                  { sep: ",", aria: true },
                  { wheel: { name: "kg-dec", value: sp.frac, min: 0, max: 9, step: 1, item: 60 } },
                  { unit: imperial ? "фунт" : "кг" }]
        }) : ""),
        tail: '<div class="sheet-actions">' + K().roundBtn({ ui: "save-set-weight", role: "check", pos: "center", act: "save-set-weight", aria: "Сохранить вес", icon: uiIcon("check") }) + "</div>"
      });;
    }
    if (ui.sheet === "goal") {
      var gv = ui.goalDraft || 1900;
      var goalPresets = K().chipRow({ baseCls: "goal-presets", values: [1600, 1800, 2000, 2100], selected: gv, act: "goal-preset", ui: "goal" });
      out += K().sheet({
        ui: "goal", scrimCls: " bare", cls: "goal",
        body: goalPresets +
        (useSystemDrums()
          ? sysLaunch("sys-goal", gv + " мл")
          : (window.UiKit ? K().wheelBlock({ ui: "goal",
              cls: "wheel-block goal-wheel",
              items: [{ wheel: { name: "goal", value: gv, min: 500, max: 5000, step: 10, item: 60 } },
                      { unit: "мл", unitCls: "unit" }]
            }) : "")),
        tail: '<div class="sheet-actions">' + K().roundBtn({ ui: "save-goal", role: "check", pos: "center", act: "save-goal", aria: "Сохранить норму", icon: uiIcon("check") }) + "</div>"
      });
    }
    if (ui.page === "alert-period") {
      /* Донор app.js 4271-4272: FAB-ы перехода периодов. */
      out += K().roundBtn({ ui: "alert-days-open", role: "fab", cls: "mark", act: "open-alert-days", aria: "Периоды активности", icon: SU().sunMoonIcon() });
    }
    if (ui.page === "alert-days") {
      out += K().roundBtn({ ui: "alert-edit-open", role: "fab", cls: "mark", act: "open-alert-edit", aria: "Настроить периоды", icon: uiIcon("pencil") });
    }
    if (ui.page === "alert-edit") {
      /* Донор app.js 4274: плавающая галочка сохранения периодов. */
      out += K().roundBtn({ ui: "save-alert-edit", role: "check", pos: "float", act: "save-alert-edit", aria: "Сохранить периоды", icon: uiIcon("check") });
    }
    if (ui.page === "drinks" && ui.sorting) out += K().roundBtn({ ui: "save-sort", role: "check", pos: "float", act: "save-sort", aria: "Сохранить порядок", icon: uiIcon("check") });
    if (ui.page === "create") out += K().roundBtn({ ui: "save-drink", role: "check", pos: "float", act: "save-drink", aria: "Сохранить напиток", icon: uiIcon("check") });
    if (ui.page === "icons") out += K().roundBtn({ ui: "save-icon", role: "check", pos: "float", act: "save-icon", aria: "Выбрать иконку", icon: uiIcon("check") });
    if (ui.page === "colors") {
      var dots = COLOR_PAGES.map(function (_, i) {
        return '<button type="button" class="' + (i === ui.colorPage ? "on" : "") + '" data-act="color-page" data-page="' + i + '" aria-label="Страница ' + (i + 1) + '"></button>';
      }).join("");
      out += '<div class="pager">' + dots + "</div>";
      out += '<button type="button" class="check float" data-act="save-color" aria-label="Выбрать цвет">' + uiIcon("check") + "</button>";
    }
    /* M25: модалки и окна донора (settings-ui modalsHtml + app.js dupes/export). */
    if (window.SettingsUI) out += SU().modalsHtml(settingsEnv());
    if (ui.modal === "dupes") out += dupesDialogHtml();
    if (ui.modal === "history-export") out += historyExportDialogHtml();
    if (ui.settingsChoice) { out += settingsChoiceDialogHtml(); }
    if (ui.modal === "dialog" && ui.dialogSpec) {
      var d = ui.dialogSpec;
      out += U().dialog({ ui: d.kind || "dialog", cls: "modal", scrimAct: d.scrimAct || "dialog-cancel",
        title: esc(d.title || ""), body: d.body || "<p>" + esc(d.text || "") + "</p>",
        actions: d.actions || [{ act: "dialog-cancel", label: "Отмена" }, { act: d.okAct || "dialog-ok", label: d.ok || "Готово" }] });
    }
    return out;
  }

  /* Скрытая страница облачных инструментов (слово владельца 07.11):
     открывается долгим удержанием портрета в окне «Профиль». Строки те же,
     что модель настроек держит для диагностики, но второй дороги в
     «Дополнительно» по слову владельца не делаем. */
  function pageCloudTools() {
    var back = K().header({ ui: "cloud-tools", cls: "top plain sub", back: uiIcon("back"), title: "Облачные инструменты" });
    return back + '<div class="n-section">Облако</div>' +
      K().row({ ui: "cloud-clear", act: "ask-cloud-clear", title: "Очистить облако", sub: "стереть копию и метки удалений на Диске" }) +
      K().row({ ui: "google-diag", act: "google-diag", title: "Параметры входа Google", sub: "пакет и отпечаток этой сборки" });
  }

  /* ---- рендер (донор 4520, сокращённый) ---- */
  /* ---------- Удержание прокрутки экрана (донор 2435-2494) ------------------
     Позиция каждого экрана живёт по ключу page/tab и возвращается после
     перестроения разметки; доводки гасят откат, пока браузер перекладывает
     узлы. Перенесено словом владельца 07.11: в next механизм не доехал,
     чекбоксы настроек бросали список вверх. */
  function screenKey() {
    return ui.page ? "page:" + ui.page : "tab:" + ui.tab;
  }
  function scrollTops() {
    if (!ui._scrollTops) ui._scrollTops = {};
    return ui._scrollTops;
  }
  function saveScroll() {
    var sc = document.querySelector(".chart-scroll");
    /* Переход из календаря: позицию задали мы сами, старую прокрутку
       не сохраняем (иначе она перетрёт заданную). */
    if (ui._chartLeftLocked) {
      ui._chartLeftLocked = 0;
      return;
    }
    if (sc && !sc._restoreGuard) ui.chartLeft = sc.scrollLeft;
    var screen = document.querySelector("#app > .screen");
    /* Ключ берём от прошлого построения: к этому моменту ui.page уже новый,
       а на экране ещё прежний список. */
    if (!screen || !ui._renderedKey) return;
    scrollTops()[ui._renderedKey] = screen.scrollTop;
  }
  function restoreScroll() {
    var screen = document.querySelector("#app > .screen");
    if (!screen || !ui._renderedKey) return;
    var top = scrollTops()[ui._renderedKey] || 0;
    if (top > 0) screen.scrollTop = top;
  }
  function holdScreenScroll() {
    var screen = document.querySelector("#app > .screen");
    var key = ui._renderedKey;
    if (!screen || !key) return;
    var top = screen.scrollTop;
    if (!(top > 0)) return;
    function put() {
      var s = document.querySelector("#app > .screen");
      if (!s || ui._renderedKey !== key) return;
      if (Math.abs(s.scrollTop - top) > 1) s.scrollTop = top;
    }
    requestAnimationFrame(put);
    setTimeout(put, 0);
    /* Усиление 07.11 (слово владельца: прыгало и в прототипе на телефоне):
       вторая доводка по второму кадру — медленный WebView перекладывает
       разметку позже одиночного кадра донора. */
    requestAnimationFrame(function () { requestAnimationFrame(put); });
  }

  function render() {
    animToken++;
    saveScroll();
    try {
      W.__waterRenders = (W.__waterRenders || 0) + 1;
      W.__hb = Date.now();
      if (!ui._hbTimer) ui._hbTimer = setInterval(function () { W.__hb = Date.now(); }, 1000);
    } catch (e) {}
    habitAutoTick(); /* донор 4531: авторежим будней по сигнатуре */
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
    else if (ui.page === "create") { main = pageCreate(); screenClass = "screen create-screen"; }
    else if (ui.page === "icons") { main = pageIcons(); screenClass = "screen icons-screen"; }
    else if (ui.page === "colors") { main = pageColors(); screenClass = "screen colors-screen"; }
    else if (ui.page === "volumes") { main = pageVolumes(); screenClass = "screen hist-screen volumes-screen"; }
    else if (ui.page === "folder-alerts") { main = pageAlerts(); screenClass = "screen alerts-screen"; }
      else if (ui.page === "look") { main = SU().pageLook(settingsEnv()); screenClass = "screen settings-screen"; }
      else if (ui.page === "register") { main = SU().pageRegister(settingsEnv()); screenClass = "screen settings-screen"; } /* донор 4569 */
      else if (ui.page === "cloud-tools") { main = pageCloudTools(); screenClass = "screen settings-screen"; }
      else if (ui.page === "advanced") { main = SU().pageAdvanced(settingsEnv()); screenClass = "screen settings-screen"; }
      else if (ui.page === "struct-export") { main = SU().pageStructExport(settingsEnv()); screenClass = "screen settings-screen"; }
      else if (String(ui.page || "").indexOf("folder-") === 0) { main = SU().pageFolder(settingsEnv(), ui.page.slice(7)); screenClass = "screen settings-screen"; }
    else if (ui.page === "alert-sound") { main = pageAlertSound(); screenClass = "screen alerts-screen"; }
    else if (ui.page === "alert-period") { main = SU().pageAlertPeriod(settingsEnv()); screenClass = "screen alerts-screen"; }
    else if (ui.page === "alert-texts") { main = SU().pageAlertTexts(settingsEnv()); screenClass = "screen alerts-screen"; }
    else if (ui.page === "alert-days") { main = SU().pageAlertDays(settingsEnv()); screenClass = "screen alerts-screen"; }
    else if (ui.page === "alert-edit") { main = SU().pageAlertEdit(settingsEnv()); screenClass = "screen alerts-screen"; }
    else if (ui.page === "alert-habit") { main = W.HabitSchedule ? W.HabitSchedule.page(settingsEnv()) : ""; screenClass = "screen alerts-screen"; }
    else if (ui.tab === "history") { main = pageHistory(); screenClass = "screen hist-screen"; }
    else if (ui.tab === "weight") { main = pageWeight(); screenClass = "screen weight-screen"; }
    else if (ui.tab === "settings") { main = pageSettings(); screenClass = "screen settings-screen"; }
    else if (ui.tab === "alerts") { main = pageAlerts(); screenClass = "screen alerts-screen"; }
    else { main = pageHome(); screenClass = "screen home-screen"; }
    ui._renderedKey = screenKey();
    if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) {
      try { document.activeElement.blur(); } catch (e) {}
    }
    root.innerHTML = '<div class="' + screenClass + '">' + main + "</div>" +
      U().navHtml(ui) + overlayHtml() + U().toastHtml(ui);
    restoreScroll();
    holdScreenScroll();
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

  /* Скрытая дорога (слово владельца 07.11): долгое удержание большого
     портрета в окне «Профиль» открывает «Облачные инструменты». Жест —
     тот же, что у ярлыков (initPinHold): 500 мс, отмена при движении
     пальца, вибрация, глушилка случайного клика после срабатывания. */
  function initAvatarHold() {
    var box = document.querySelector(".ava-round.ava-big");
    if (!box || !cloud.signedIn) return;
    var holdTimer = null, showTimer = null, fired = false, pid = null, startX = 0, startY = 0;
    function clearTimers() {
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
      if (showTimer) { clearTimeout(showTimer); showTimer = null; }
    }
    function detach() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    }
    function openTools() {
      fired = true;
      suppressNextClick(500);
      swallowUntilRelease();
      try { if (navigator.vibrate) navigator.vibrate(12); } catch (err) { /* ignore */ }
      ui.page = "cloud-tools";
      ui.modal = null;
      render();
    }
    function onMove(e) {
      if (fired || pid == null || e.pointerId !== pid) return;
      if (Math.abs(e.clientX - startX) > 12 || Math.abs(e.clientY - startY) > 12) {
        clearTimers();
        box.classList.remove("holding");
        detach();
      }
    }
    function onUp(e) {
      if (pid == null || (e && e.pointerId != null && e.pointerId !== pid)) return;
      if (fired && e && e.type === "pointercancel") return;
      var didFire = fired;
      clearTimers();
      box.classList.remove("holding");
      detach();
      fired = false;
      if (didFire) suppressNextClick(450);
    }
    box.addEventListener("pointerdown", function (e) {
      if (e.button != null && e.button !== 0) return;
      fired = false;
      pid = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      clearTimers();
      showTimer = setTimeout(function () { box.classList.add("holding"); }, 140);
      holdTimer = setTimeout(function () { holdTimer = null; openTools(); }, 500);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    });
    box.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      if (fired) return;
      clearTimers();
      openTools();
    });
  }

  function afterRender() {
    initPinHold(); /* донор: bindAll() из render (4603) */
    initAvatarHold(); /* скрытые облачные инструменты за портретом */
    initSort(); initHydSlider(); initColorWheel(); initPaletteSwipe(); /* донор 7296-7301: свайп палитры возвращён 07.11 */
    try { initWheels(); } catch (e) { /* v211: слепой catch больше не слепой */
      W.__wheelErr = (e && e.message) || String(e);
      if (W.console) console.error("initWheels: " + W.__wheelErr);
    } /* M25: колёса донора */
    try { markSheetEntrance(); } catch (e) {} /* M25: выезд шторки донора */
    markAvatars(); /* донор 4601 */
    try { initFields(); } catch (e) {} /* M25-mod2: поля текстов уведомлений */
    /* M23: колбэк файлового моста живёт один раз на приложение. */
    if (W.WT2F && !W.__wtFileHook) {
      W.__wtFileHook = function (text, err) {
        F().fileResult(state, text, err, {
          toast: toast,
          save: function () { C().save(state); },
          render: render,
          /* Осторожность владельца 05.11 + донор v145: пак с настройками
             спрашивает ДО применения — единый диалог выбора на обе дороги. */
          deferChoice: function (pack) {
            ui.settingsChoice = { src: "file", pack: pack };
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
  function copyLiquidSettings() {
    var txt = window.LiquidColor && LiquidColor.exportJson ? LiquidColor.exportJson() : "";
    if (!txt) { toast("Настройки недоступны"); return; }
    var done = function () { toast("Настройки скопированы — вставьте в чат с разработчиком"); };
    var fallback = function () {
      var ta = document.createElement("textarea");
      ta.value = txt;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var okCopy = false;
      try { okCopy = document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
      if (okCopy) done(); else toast("Скопировать не вышло");
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done, fallback);
    } else fallback();
  }

  function performAction(t, act) {
    var ds = t.dataset || {};
    if (act === "lc-export") { copyLiquidSettings(); return; }
    if (window.LiquidColor && LiquidColor.act(act, t)) { render(); return; }
    if (window.ChartColor && ChartColor.act(act, t)) { render(); return; }
    if (act === "goto") {
      /* v125 донора (app.js 8314-8317): колокольчик — ярлык: вкладка настроек
         и раскрытая подпапка уведомлений (до отдельной замены колокольчика). */
      if (ds.tab === "alerts") { ui.tab = "settings"; ui.page = "folder-alerts"; }
      else { ui.tab = ds.tab; ui.page = null; }
      ui.sheet = null; ui.modal = null;
      closeOpenSwipes(); render(); return;
    }
    if (act === "back") {
    if (ui.page === "volumes") { ui.page = null; render(); return; }
    if (ui.page === "colors" && ui.paintRole) { finishPaint(); return; }
    if (ui.page === "icons" || ui.page === "colors") { ui.page = "create"; render(); return; }
    if (ui.page === "create") { ui.page = "drinks"; ui.nameError = false; render(); return; }
    if (ui.page === "drinks" && ui.sorting) { ui.sorting = false; ui.sortOrder = null; render(); return; }
    if (ui.page === "drinks" && ui.drinkReturn === "pin") {
      ui.page = null;
      ui.drinkReturn = "home";
      ui.pinning = false;
      render();
      return;
    }
      if (ui.sheet) { ui.sheet = null; render(); return; }
      if (ui.page === "drinks") { ui.page = null; ui.tab = ui.drinkReturn || "home"; render(); return; }
      if (ui.page === "alert-sound") { ui.page = "folder-alerts"; render(); return; }
      if (ui.page === "struct-export") { ui.page = "advanced"; render(); return; }
      if (String(ui.page || "").indexOf("folder-") === 0 && ui.page !== "folder-alerts") { ui.page = ui.folderFrom || null; ui.folderFrom = null; render(); return; }
      if (ui.page === "alert-edit") { ui.page = "alert-days"; ui.modal = null; render(); return; }
      if (ui.page === "alert-days") {
        ui.page = ui.activityFrom === "settings" ? null : "alert-period";
        if (!ui.page) ui.activityFrom = null;
        render();
        return;
      }
      if (ui.page === "alert-period") { ui.page = "folder-alerts"; render(); return; }
      if (ui.page === "alert-habit") { ui.page = "folder-alerts"; render(); return; }
      if (ui.page === "alert-texts") { ui.page = "folder-alerts"; render(); return; }
      if (ui.page) { ui.page = null; render(); return; }
      render(); return;
    }
    if (act === "close-sheet") { ui.sheet = null; ui.pinning = false; render(); return; }
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
    if (act === "open-drinks" || act === "open-default-drink") {
      ui.page = "drinks";
      ui.drinkReturn = act === "open-default-drink" ? "settings" : "home";
      ui.pinning = false;
      ui.sorting = false;
      ui.sheet = null;
      ui.modal = null;
      ui.openSwipe = null;
      render();
      return;
    }
    if (act === "open-volume") {
      ui.volumeDraft = state.profile.volume;
      ui.volumeDrinkId = state.profile.drinkId;
      ui.pinning = false;
      ui.sheet = "volume";
      render();
      return;
    }
    if (act === "pick-drink") {
      if (ui.drinkReturn === "pin") {
        ui.pinDrinkId = t.dataset.id;
        ui.pinning = true;
        ui.page = null;
        ui.sheet = "volume";
        if (!(ui.volumeDraft > 0)) ui.volumeDraft = state.profile.volume || 200;
        render();
        return;
      }
      if (!D().drinkById(state, ds.id)) return;
      state.profile.drinkId = ds.id;
      save();
      ui.page = null; ui.tab = ui.drinkReturn || "home"; render(); return;
    }
    if (act === "pick-volume-drink") {
      if (!D().drinkById(state, ds.id)) return;
      ui.volumeDrinkId = ds.id; render(); return;
    }
    if (act === "vol-chip") { ui.volumeDraft = Number(ds.v); render(); return; }
    if (act === "commit-volume") {
      var chosenMl = readWheel("volume", ui.volumeDraft);
      if (ui.pinning && ui.pinDrinkId) {
        if (!state.customShortcuts) state.customShortcuts = [];
        state.customShortcuts[ui.pinSlot] = { drinkId: ui.pinDrinkId, volume: chosenMl };
        state.rowCustom = true;
        ui.pinning = false;
        ui.pinDrinkId = null;
        ui.pinSlot = null;
        save();
        closeSheetThen(function () {
          ui.page = null;
          toast("Избранный напиток сохранён");
        });
        return;
      }
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
      if (entry) openAdd(entry);
      return;
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
    if (act === "open-volumes") { ui.page = "volumes"; render(); return; }
    if (act === "open-theme") { ui.modal = "theme"; render(); return; }
    if (act === "theme-cancel") { ui.modal = null; render(); return; }
    /* M25: дверь уведомлений — донорский префикс-хендлер open-folder-* (v125). */
    if (act === "open-alert-freq") { ui.modal = "alert-freq"; render(); return; }
    if (act === "open-alert-sound") { ui.page = "alert-sound"; render(); return; }
    if (act === "pick-recent-volume") {
      state.profile.volume = Number(ds.v) || state.profile.volume;
      save(); render(); return;
    }

    if (act === "do-delete-all") { ui.modal = null; ui.dialogSpec = null; resetAll(); return; }
    if (act === "do-restore-history") { ui.modal = null; ui.dialogSpec = null; restoreHistoryBackup(); return; }

    if (act === "open-gender") { ui.modal = "gender"; render(); return; }
    if (act === "gender-cancel") { ui.modal = null; render(); return; }
    if (act === "gender") { state.gender = t.dataset.v; syncRecommended(); stampWeightGoals(todayStr(), state.weightKg); ui.modal = null; save(); render(); return; }
    if (act === "open-units") { ui.modal = "units"; render(); return; }
    if (act === "pick-units") {
      state.units = t.dataset.v === "imperial" ? "imperial" : "metric";
      syncRecommended();
      ui.modal = null;
      save();
      render();
      return;
    }
    if (act === "units-cancel") { ui.modal = null; render(); return; }
    if (act === "open-norm") { ui.modal = "norm"; render(); return; }
    if (act === "pick-norm") {
      if (t.dataset.v === "recommended") {
        state.useRecommended = true;
        syncRecommended();
      } else {
        state.useRecommended = false;
        if (state.customGoalMl) state.goalMl = state.customGoalMl;
      }
      ui.modal = null;
      save();
      if (t.dataset.v === "custom") {
        /* Сразу показываем выбор объёма — тот же путь, что «open-goal». */
        var ngStart = state.customGoalMl;
        if (!(ngStart >= 500 && ngStart <= 5000)) ngStart = 1900;
        ui.goalDraft = Math.round(ngStart / 10) * 10;
        ui.sheet = "goal";
      }
      render();
      return;
    }
    if (act === "norm-cancel") { ui.modal = null; render(); return; }
    if (act === "open-day-start") {
      if (useSystemClock()) {
        askNativeTime({ title: "Начало суток", value: fmtDayStart(), is24Hour: true }, function (hm) {
          J().setDayStart(state, hm, N().wallToday());
          ui.chartLeft = null;
          save();
          render();
        });
        return;
      }
      ui.modal = "day-start";
      render();
      return;
    }
    if (act === "day-start-ok") {
      var dp = readTimePair("day", "day-h", "day-m", 2, 0);
      var dh = dp.h;
      var dm = dp.m;
      J().setDayStart(state, pad2(dh) + ":" + pad2(dm), N().wallToday());
      ui.modal = null;
      ui.chartLeft = null;
      save();
      render();
      return;
    }
    if (act === "day-start-cancel") { ui.modal = null; render(); return; }
    if (act === "open-set-weight") {
      if (useSystemDrums()) {
        var imperialNow = isImperial();
        var shown = imperialNow ? kgToLb(state.weightKg) : state.weightKg;
        askNativeNumber({
          title: "Вес",
          value: Math.round(shown * 10) / 10,
          min: imperialNow ? 44 : 20,
          max: imperialNow ? 661.9 : 300,
          step: 0.1,
          decimals: 1,
          unit: imperialNow ? "фунт" : "кг"
        }, function (n) {
          var kg = imperialNow ? lbToKg(n) : n;
          kg = Math.round(kg * 10) / 10;
          if (!(kg >= 20 && kg <= 300)) { toast("Вес от 20 до 300 кг"); return; }
          state.weightKg = kg;
          syncRecommended();
          stampWeightGoals(todayStr(), kg);
          save();
          render();
        });
        return;
      }
      ui.weightDraft = { kg: state.weightKg, date: todayStr() };
      ui.sheet = "set-weight";
      ui.modal = null;
      render();
      return;
    }
    if (act === "save-set-weight") {
      var swWhole = readWheel("kg-int", 0);
      var swFrac = readWheel("kg-dec", 0);
      var swNum = Math.round((swWhole + swFrac / 10) * 10) / 10;
      var swKg = isImperial() ? lbToKg(swNum) : swNum;
      if (!(swKg >= 20 && swKg <= 300)) { toast("Вес от 20 до 300 кг"); return; }
      state.weightKg = swKg;
      syncRecommended();
      stampWeightGoals(todayStr(), swKg);
      ui.weightDraft = null;
      save();
      closeSheetThen(null);
      return;
    }
    if (act === "goal-preset") {
      var gv = Number(t.dataset.v);
      ui.goalDraft = gv;
      var gwheel = document.querySelector('[data-wheel="goal"]');
      if (gwheel && gwheel._setValue) gwheel._setValue(gv);
      document.querySelectorAll(".sheet.goal .preset").forEach(function (p) {
        p.classList.toggle("on", Number(p.dataset.v) === gv);
      });
      return;
    }
    if (act === "save-goal") {
      var ml = Math.round(readWheel("goal", ui.goalDraft || 1900) / 10) * 10;
      if (!(ml >= 500 && ml <= 5000)) { toast("Норма от 500 до 5000 мл"); return; }
      state.customGoalMl = ml;
      state.goalMl = ml;
      state.useRecommended = false;
      ui.goalDraft = null;
      save();
      closeSheetThen(null);
      return;
    }
    if (act === "open-look") {
      ui.page = "look";
      ui.modal = null;
      ui.sheet = null;
      render();
      return;
    }
    if (act === "open-advanced") {
      ui.page = "advanced";
      ui.modal = null;
      ui.sheet = null;
      render();
      return;
    }
    if (act === "open-struct") { ui.page = "struct-export"; ui.modal = null; render(); return; }
    if (act === "struct-copy") { copyStructJson(); return; }
    if (act === "struct-save") { saveStructFile(); return; }
    if (act === "ask-delete-all") {
      ui.dialogSpec = { title: "Удалить все данные", text: "Приложение вернётся к состоянию из коробки. Записи, вес, напитки и настройки будут стёрты.", ok: "Удалить", cancel: "Отмена", kind: "delete-all", okAct: "do-delete-all" };
      ui.modal = "dialog";
      render();
      return;
    }
    if (act === "sys-note") {
      var sb = window.WaterAlerts;
      if (sb && typeof sb.systemSettings === "function") { try { sb.systemSettings(); return; } catch (e) {} }
      toast("Звук и вибрация — в системе Android. В браузере этих настроек нет.");
      return;
    }
    if (act === "alert-test") {
      var ab = window.WaterAlerts;
      if (ab && typeof ab.test === "function") {
        try { ab.test(); toast("Проверочное уведомление отправлено"); return; } catch (e) {}
      }
      playAlertSound(ensureAlerts().sound);
      toast("В браузере уведомление не отправить — играем звук «" + alertSoundTitle(ensureAlerts().sound) + "»");
      return;
    }
    if (act === "open-dupes") {
      ui.modal = "dupes";
      render();
      return;
    }
    if (act === "goto-dupe") {
      /* Строка списка дублей: закрываем список и открываем день в истории.
         ui.page сбрасываем как в «goto»: пришли со страницы «Дополнительно». */
      ui.modal = null;
      ui.dialog = null;
      ui.sheet = null;
      ui.page = null;
      ui.tab = "history";
      ui.historyDate = t.dataset.date;
      render();
      return;
    }
    if (act === "restore-history") {
      ui.dialogSpec = {
        title: "Вернуть историю",
        text: "Вернуть " + state.historyBackup.entries.length + " записей, которые были до импорта? " +
          "Нынешние " + state.entries.length + " записей останутся в памяти — их тоже можно будет вернуть.",
        ok: "Вернуть",
        cancel: "Отмена",
        kind: "restore-history", okAct: "do-restore-history"
      };
      ui.modal = "dialog";
      render();
      return;
    }
    if (act === "open-history-export") { openHistoryExport(); return; }
    if (act === "hist-export-close") { ui.modal = null; render(); return; }
    if (act === "hist-export-copy") {
      var payload = historyExportJson();
      var rows = (state.entries || []).length;
      var okMsg = "История скопирована: " + rows + ruCount(rows, " запись", " записи", " записей") + ", " + payload.length + " символов";
      var fail = function () {
        toast("Скопируйте текст из окна: выделен автоматически");
        // Тост перерисовывает окно, поэтому выделяем уже после перерисовки.
        setTimeout(function () {
          var box = document.querySelector(".hist-export .svg-export-text");
          if (box) { box.focus(); box.select(); }
        }, 0);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(payload).then(function () { toast(okMsg); }).catch(fail);
      else fail();
      return;
    }
    if (act === "hist-export-json" || act === "hist-export-csv") {
      var csv = act === "hist-export-csv";
      var fname = historyExportFilename(csv ? "csv" : "json");
      var text = csv ? historyExportCsv() : historyExportJson();
      if (!saveTextFile(fname, text, csv ? "text/csv;charset=utf-8" : "application/json")) {
        toast("Скачать не удалось: скопируйте текст из окна");
        return;
      }
      toast(window.__singleFile
        ? "Файл " + fname + " отправлен в загрузки. Не появился — нажмите «Скопировать»"
        : "Файл " + fname + " предложен к сохранению");
      return;
    }
    if (act.indexOf("open-folder-") === 0) {
      /* v127: дверь подпапки может стоять на любом экране — возврат ведёт
         туда, откуда открыли (из «Внешнего вида» — обратно в него). */
      ui.folderFrom = ui.page || null;
      ui.page = "folder-" + act.slice("open-folder-".length);
      render();
      return;
    }
    if (act === "load-history") { F().request(ui, toast); return; }
    if (act === "cloud-sync") { cloudSyncNow("sync"); return; }
    if (act === "cloud-save") { cloudSyncNow("save"); return; }
    if (act === "cloud-restore") { cloudSyncNow("restore"); return; }
    if (act === "save-db-file" || act === "share-db-file") { F().save(state, ui, toast); return; }
    if (act === "file-open") { F().request(ui, toast); return; }
    if (act === "open-alert-period") { ui.page = "alert-period"; ui.modal = null; render(); return; }
    if (act === "open-alert-texts") { ui.page = "alert-texts"; ui.modal = null; render(); return; }
    if (act === "open-activity") {
      ui.activityFrom = "settings";
      ui.page = "alert-days";
      ui.modal = null;
      ui.sheet = null;
      render();
      return;
    }
    if (act === "open-alert-edit") {
      var nEdit = ensureAlerts();
      var only = t.dataset.day != null && t.dataset.day !== "" ? Number(t.dataset.day) : null;
      var seed = only != null ? nEdit.days[only] : nEdit.days[0];
      var flags = [false, false, false, false, false, false, false];
      if (only != null) flags[only] = true;
      else nEdit.days.forEach(function (d, i) { flags[i] = d.wake === seed.wake && d.sleep === seed.sleep; });
      ui.alertEdit = { wake: seed.wake, sleep: seed.sleep, days: flags };
      ui.page = "alert-edit";
      ui.modal = null;
      render();
      return;
    }
    if (act === "toggle-alert-day") {
      if (!ui.alertEdit) return;
      var di = Number(t.dataset.day);
      ui.alertEdit.days[di] = !ui.alertEdit.days[di];
      render();
      return;
    }
    if (act === "save-alert-edit") {
      if (!ui.alertEdit) return;
      var pickedDays = ui.alertEdit.days.some(Boolean);
      if (!pickedDays) { toast("Выберите хотя бы один день"); return; }
      var nSave = ensureAlerts();
      ui.alertEdit.days.forEach(function (on, i) {
        if (on) nSave.days[i] = { wake: ui.alertEdit.wake, sleep: ui.alertEdit.sleep };
      });
      var winSave = notifyWindow(todayStr());
      nSave.from = winSave.from;
      nSave.to = winSave.to;
      ui.page = "alert-days";
      save();
      render();
      return;
    }
    if (act === "open-gap") {
      ui.gapKind = t.dataset.kind === "before" ? "before" : "after";
      ui.modal = "alert-gap";
      render();
      return;
    }
    if (act === "gap-ok") {
      var gp = readTimePair("gap", "gap-h", "gap-m", 0, 0);
      var gh = gp.h;
      var gm = gp.m;
      var nGap = ensureAlerts();
      if (ui.gapKind === "before") nGap.beforeSleepMin = gh * 60 + gm;
      else nGap.afterWakeMin = gh * 60 + gm;
      var winGap = notifyWindow(todayStr());
      nGap.from = winGap.from;
      nGap.to = winGap.to;
      ui.modal = null;
      save();
      render();
      return;
    }
    if (act === "gap-cancel") { ui.modal = null; render(); return; }
    if (act === "dial-view") {
      /* v95: тап по «ЧЧ»/«ММ» шапки — тоже частичный обмен блока, без
         полной перерисовки экрана. */
      if (ui.dial) { ui.dial.view = t.dataset.v === "m" ? "m" : "h"; renderDialBlock(); }
      return;
    }
    if (act === "open-alert-clock") {
      ui.clockField = t.dataset.field === "sleep" ? "sleep" : "wake";
      var clockDraft = ui.alertEdit || { wake: "05:00", sleep: "23:00" };
      if (useSystemClock()) {
        askNativeTime({
          title: ui.clockField === "sleep" ? "Время отхода ко сну" : "Время пробуждения",
          value: clockDraft[ui.clockField] || "00:00",
          is24Hour: true
        }, function (hm) {
          if (ui.alertEdit) ui.alertEdit[ui.clockField] = hm;
          render();
        });
        return;
      }
      ui.modal = "alert-clock";
      render();
      return;
    }
    if (act === "clock-ok") {
      if (ui.alertEdit) {
        var cp = readTimePair("clock", "clock-h", "clock-m", 0, 0);
        var ch = cp.h;
        var cm = cp.m;
        ui.alertEdit[ui.clockField === "sleep" ? "sleep" : "wake"] = pad(ch) + ":" + pad(cm);
      }
      ui.modal = null;
      render();
      return;
    }
    if (act === "clock-cancel") { ui.modal = null; render(); return; }
    if (act === "open-alert-habit") { ui.page = "alert-habit"; ui.modal = null; render(); return; }
    if (act === "habit-apply") { applyHabitSchedule(); return; }
    if (act === "habit-period-apply") { applyPeriodGoal(t && t.dataset ? t.dataset.v : ""); return; }
    if (act === "habit-periods-apply-all") { applyAllPeriodGoals(); return; }
    if (act === "habit-periods-reset") { resetPeriodGoals(); return; }
    if (act === "habit-auto-off") { state.habitAuto = 0; save(); toast("Авторежим будней выключен: окна правятся вручную"); render(); return; }
    if (act === "open-alert-days") { ui.activityFrom = null; ui.page = "alert-days"; ui.modal = null; render(); return; }
    if (act === "open-cup-label") { ui.modal = "cup-label"; render(); return; }
    if (act === "cup-label-cancel") { ui.modal = null; render(); return; }
    if (act === "pick-cup-label") {
      state.cupLabel = t.dataset.mode === "countdown" ? "countdown" : null;
      ui.modal = null;
      save();
      render();
      return;
    }
    if (act === "open-weather") { ui.sheet = "weather"; render(); return; }
    if (act === "pick-weather") {
      LC.setWeather(state, t.dataset.level);
      save();
      render();
      return;
    }
    if (act === "toggle-weather-save") {
      LC.setWeatherSave(state, !state.weatherSave);
      save();
      render();
      return;
    }
    if (act === "open-fitness") { ui.sheet = "activity"; render(); return; }
    if (act === "pick-activity") {
      LC.setActivity(state, t.dataset.level);
      save();
      render();
      return;
    }
    if (act === "toggle-activity-save") {
      LC.setActivitySave(state, !state.activitySave);
      save();
      render();
      return;
    }
    if (act === "edit-row") {
      state.rowCustom = !state.rowCustom;
      save();
      render();
      return;
    }
    if (act === "add-pin") {
      openPinEditor(Number(t.dataset.slot));
      return;
    }
    if (act === "preset") {
      var pv = Number(t.dataset.v);
      if (ui.sheet === "volume") ui.volumeDraft = pv;
      if (ui.addDraft) ui.addDraft.volume = pv;
      var wheel = document.querySelector('[data-wheel="volume"]');
      if (wheel && wheel._setValue) wheel._setValue(pv);
      document.querySelectorAll(".preset").forEach(function (p) { p.classList.toggle("on", Number(p.dataset.v) === pv); });
      return;
    }
    if (act === "ask-del-drink") {
      if (state.drinks.length <= 1) { toast("Последний напиток удалить нельзя"); return; }
      var dd = drinkById(t.dataset.id);
      ui.dialogSpec = { title: "Удалить напиток", text: "Удалить «" + esc(dd ? dd.name : "") + "»? Записи в истории сохранятся.", ok: "Удалить", cancel: "Отмена", okAct: "del-drink-ok", drinkId: t.dataset.id };
      ui.modal = "dialog";
      render();
      return;
    }
    if (act === "del-drink-ok") {
      var id = ui.dialogSpec && ui.dialogSpec.drinkId;
      var victim = drinkById(id);
      state.drinks = state.drinks.filter(function (d) { return d.id !== id; });
      if (state.profile.drinkId === id) {
        var water = drinkById("water") || state.drinks[0];
        state.profile = { drinkId: water.id, volume: 200 };
      }
      ui.openSwipe = null;
      ui.modal = null; ui.dialogSpec = null;
      save();
      toast("Удалён: " + (victim ? victim.name : "напиток"));
      render();
      return;
    }
    if (act === "open-sort") {
      ui.sorting = true;
      ui.sortOrder = state.drinks.map(function (d) { return d.id; });
      render();
      return;
    }
    if (act === "save-sort") {
      var order = ui.sortOrder || state.drinks.map(function (d) { return d.id; });
      var map = {};
      state.drinks.forEach(function (d) { map[d.id] = d; });
      state.drinks = order.map(function (id) { return map[id]; }).filter(Boolean);
      ui.sorting = false;
      save();
      toast("Порядок сохранён");
      return;
    }
    if (act === "pick-recent-volume") {
      var rv = Number(t.dataset.v);
      if (!(rv > 0)) return;
      if (ui.drinkReturn === "history" && ui.addDraft) ui.addDraft.volume = rv;
      else if (ui.drinkReturn === "pin") ui.volumeDraft = rv;
      else {
        state.profile.volume = rv;
        save();
      }
      render();
      return;
    }
    if (act === "add-drink") {
      ui.createDraft = { name: "", hydration: 100, icon: "drop", color: QUICK_COLORS[0], editing: false };
      ui.nameError = false;
      ui.page = "create";
      render();
      return;
    }
    if (act === "edit-drink") {
      var ed = drinkById(t.dataset.id);
      if (!ed) return;
      ui.createDraft = { id: ed.id, name: ed.name, hydration: ed.hydration, icon: ed.icon, color: ed.color, editing: true };
      ui.nameError = false;
      ui.page = "create";
      ui.openSwipe = null;
      render();
      return;
    }
    if (act === "save-drink") {
      var draft = ui.createDraft;
      if (!draft || !String(draft.name || "").trim()) {
        ui.nameError = true;
        render();
        return;
      }
      draft.name = String(draft.name).trim().slice(0, 100);
      var savedMsg;
      if (draft.editing) {
        var target = drinkById(draft.id);
        if (target) {
          target.name = draft.name;
          target.hydration = Number(draft.hydration);
          target.icon = draft.icon;
          target.color = draft.color;
        }
        savedMsg = "Напиток обновлён. Старые записи не пересчитаны.";
      } else {
        state.drinks.push({ id: "c" + uid(), name: draft.name, hydration: Number(draft.hydration), icon: draft.icon, color: draft.color });
        savedMsg = "Напиток добавлен";
      }
      ui.page = "drinks";
      ui.nameError = false;
      save();
      toast(savedMsg);
      return;
    }
    if (act === "open-icons") {
      ui.iconPick = ui.createDraft ? ui.createDraft.icon : "drop";
      ui.page = "icons";
      render();
      return;
    }
    if (act === "pick-icon") {
      ui.iconPick = t.dataset.icon;
      document.querySelectorAll(".igrid button").forEach(function (b) { b.classList.toggle("on", b.dataset.icon === ui.iconPick); });
      return;
    }
    if (act === "save-icon") {
      if (ui.createDraft && ui.iconPick) ui.createDraft.icon = ui.iconPick;
      ui.page = "create";
      render();
      return;
    }
    if (act === "pick-color") {
      if (ui.createDraft) ui.createDraft.color = t.dataset.color;
      render();
      return;
    }
    if (act === "open-colors") {
      var current = ui.createDraft && ui.createDraft.color;
      ui.colorPick = current || "#61c2f9";
      ui.colorPage = colorPageOf(ui.colorPick);
      ui.colorTouched = false;
      ui.wheel = null;
      ui.page = "colors";
      render();
      return;
    }
    if (act === "pick-palette") {
      ui.colorPick = t.dataset.color;
      ui.colorTouched = true;
      ui.wheel = null;
      if (ui.paintRole) commitPaint(t.dataset.color, true);
      render();
      return;
    }
    if (act === "color-page") {
      ui.colorPage = Number(t.dataset.page) || 0;
      if (ui.colorPage === 1) ui.wheel = null;
      render();
      return;
    }
    if (act === "save-color") {
      if (ui.paintRole) { finishPaint(); return; }
      if (ui.createDraft && ui.colorPick) {
        ui.createDraft.color = ui.colorPick;
        if (ui.colorTouched) rememberColor(ui.colorPick);
      }
      ui.page = "create";
      render();
      return;
    }
    if (act === "more-drinks") {
      ui.page = "drinks";
      /* «Ещё» теперь есть в обоих меню: возврат туда, откуда открылись. */
      ui.drinkReturn = ui.sheet === "volume" ? "volume" : "history";
      ui.sorting = false;
      render();
      return;
    }
    if (act === "open-weight") {
      var latest = state.weights.slice().sort(function (a, b) { return a.date.localeCompare(b.date); }).pop();
      ui.weightDraft = { date: todayStr(), kg: latest ? latest.kg : state.weightKg };
      ui.sheet = "weight";
      ui.modal = null;
      ui.openSwipe = null;
      render();
      return;
    }
    if (act === "edit-weight") {
      var found = null;
      for (var wi = 0; wi < state.weights.length; wi++) if (state.weights[wi].id === t.dataset.id) found = state.weights[wi];
      if (!found) return;
      ui.weightDraft = { id: found.id, date: found.date, kg: found.kg };
      ui.sheet = "weight";
      ui.modal = null;
      ui.openSwipe = null;
      render();
      return;
    }
    if (act === "save-weight") {
      var kg;
      if (useSystemDrums() && ui.weightDraft) kg = ui.weightDraft.kg;
      else {
        var whole = readWheel("kg-int", 0);
        var frac = readWheel("kg-dec", 0);
        kg = Math.round((whole + frac / 10) * 10) / 10;
      }
      var date = ui.weightDraft && ui.weightDraft.date;
      if (!date || !(kg >= 20 && kg <= 300)) { toast("Нужна дата и вес от 20 до 300"); return; }
      var keepId = ui.weightDraft && ui.weightDraft.id;
      /* v84: правка измерения (тот же keepId, другой вес/дата) метит старую
         версию удалённой — иначе второе устройство оставит себе обе. */
      var prevW = keepId ? state.weights.filter(function (w) { return w.id === keepId; })[0] : null;
      if (prevW && J().weightKey(prevW) !== [date, Math.round(kg * 10)].join("|")) J().markDeleted(state, [prevW], "w");
      /* v83: удалёнными помечаем только измерения того же дня, которые
         заменяются свежим. Прежняя версия (w.date !== date) по ошибке метила
         ВСЮ остальную историю — следующая же синхронизация вычищала её
         (инцидент 25.10, docs/weight-tombstone-incident.md). */
      J().markDeleted(state, state.weights.filter(function (w) { return w.id !== keepId && w.date === date; }), "w");
      state.weights = state.weights.filter(function (w) { return w.id !== keepId && w.date !== date; });
      var freshW = { id: keepId || uid(), date: date, kg: kg, createdAt: Date.now() };
      J().markAlive(state, freshW, "w");
      state.weights.push(freshW);
      state.weights.sort(function (a, b) { return a.date.localeCompare(b.date); });
      state.weightKg = state.weights[state.weights.length - 1].kg;
      syncRecommended();
      stampWeightGoals(date, kg);
      ui.weightAnchor = date;
      ui.modal = null;
      ui.weightDraft = null;
      save();
      closeSheetThen(function () { toast("Вес записан"); });
      return;
    }
    if (act === "open-weight-cal") {
      var picked = (ui.weightDraft && ui.weightDraft.date) || todayStr();
      if (picked > todayStr()) picked = todayStr();
      if (useSystemCalendar()) {
        /* v110: цепочка без тишины, порядок по контракту: в APK первым мост
           (MaterialDatePicker — вид скрина 2, которого Blink в WebView не
           даёт); в браузере моста нет — ваша showPicker-схема на входе из
           разметки; нет ни того ни другого — наш календарь с точками. */
        if (useNative("Date")) {
          askNativeDate({ title: "Дата", value: picked, max: todayStr() }, function (iso) {
            if (iso > todayStr()) iso = todayStr();
            if (ui.weightDraft) ui.weightDraft.date = iso;
            render();
          });
          return;
        }
        var din = document.querySelector(".wt-dateinp");
        if (din && webHasDatePick()) {
          try {
            din.showPicker();
            return;
          } catch (e) {
            if (state.devMode) toast("showPicker: " + (e && e.name ? e.name : "ошибка"));
          }
        }
        /* падаем в наш календарь ниже */
      }
      ui.calDate = picked;
      ui.calMonth = picked.slice(0, 7);
      ui.calTarget = "weight";
      ui.calMarks = null; /* v94: кэш меток живёт один сеанс календаря */
      ui.modal = "calendar";
      render();
      return;
    }
    if (act === "open-cal-hist") {
      /* Календарь из заголовка истории (спека 26.10.2026): переход к дню. */
      var hd = ui.historyDate || todayStr();
      if (hd > todayStr()) hd = todayStr();
      if (useSystemCalendar()) {
        /* Системный календарь (слово владельца 07.11): в APK — мост
           (MaterialDatePicker), в вебе — showPicker по скрытому input
           (схема onb-time-sys); выбранный день — как cal-ok истории,
           с прокруткой графика. Не вышло — наш календарь ниже. */
        if (useNative("Date")) {
          askNativeDate({ title: "Дата", value: hd, max: todayStr() }, function (iso) {
            if (iso > todayStr()) iso = todayStr();
            ui.calDate = iso;
            applyCalToHistory();
            render();
          });
          return;
        }
        if (webHasDatePick()) {
          try {
            var dinH = document.createElement("input");
            dinH.type = "date"; dinH.value = hd; dinH.max = todayStr();
            dinH.style.cssText = "position:fixed;left:-40px;opacity:0";
            document.body.appendChild(dinH);
            dinH.addEventListener("change", function () {
              var v = dinH.value;
              dinH.remove();
              if (v && v <= todayStr()) { ui.calDate = v; applyCalToHistory(); render(); }
            });
            setTimeout(function () { if (dinH.parentNode) dinH.remove(); }, 60000);
            dinH.showPicker();
            return;
          } catch (e) { /* падаем в наш календарь ниже */ }
        }
      }
      ui.calDate = hd;
      ui.calMonth = hd.slice(0, 7);
      ui.calTarget = "hist";
      ui.calMarks = null; /* v94: свежий кэш меток на каждый сеанс */
      ui.modal = "calendar";
      render();
      return;
    }
    if (act === "cal-today") {
      /* v96 (мини-спека владельца 27.10): «Сегодня» — водный день, как во
         всём приложении (начало суток 02:00). Между 00:00 и 02:00
         календарный день уже «завтрашний», записей там нет, и кнопка
         уводила историю на пустой день. Днём waterToday() === todayStr(),
         поведение не меняется. */
      ui.calDate = waterToday();
      ui.calMonth = ui.calDate.slice(0, 7);
      ui.calMarks = null; /* v94 */
      if (ui.calTarget === "hist") {
        applyCalToHistory();
        ui.modal = null;
        ui.calTarget = null;
      }
      render();
      return;
    }
    if (act === "cal-shift") {
      var base = (ui.calMonth || todayStr().slice(0, 7)) + "-01";
      var delta = Number(t.dataset.delta) || 0;
      var nextMonth = shiftPeriod("month", base, delta);
      if (delta > 0 && nextMonth > todayStr()) return;
      ui.calMonth = nextMonth.slice(0, 7);
      renderCalPanel(); /* v94: только панель, не всё приложение */
      return;
    }
    if (act === "cal-pick") {
      if (t.dataset.date && t.dataset.date <= todayStr()) ui.calDate = t.dataset.date;
      renderCalPanel(); /* v94: тап по дню тоже не перерисовывает всё */
      return;
    }
    if (act === "cal-ok") {
      if (ui.calTarget === "hist") {
        applyCalToHistory();
      } else if (ui.weightDraft && ui.calDate && ui.calDate <= todayStr()) {
        ui.weightDraft.date = ui.calDate;
      }
      ui.modal = null;
      ui.calTarget = null;
      ui.calMarks = null; /* v94 */
      render();
      return;
    }
    if (act === "close-calendar") {
      ui.modal = null;
      ui.calTarget = null;
      ui.calMarks = null; /* v94 */
      render();
      return;
    }
    if (act === "skin-paste") {
      var useClip = navigator.clipboard && navigator.clipboard.readText;
      if (!useClip) { openSkinPasteDialog(); return; }
      navigator.clipboard.readText().then(function (text) {
        if (String(text || "").trim()) { applySkinFromText(text); return; }
        openSkinPasteDialog();
      }, function () { openSkinPasteDialog(); });
      return;
    }
    if (act === "skin-reset") { resetSkin(); return; }
    if (act === "skin-paste-apply") {
      var area2 = document.getElementById("skin-paste-area");
      var skinText2 = area2 ? area2.value : "";
      ui.modal = null;
      ui.dialogSpec = null;
      render();
      applySkinFromText(skinText2);
      return;
    }
    if (act === "toggle") {
      /* M25: ключи донора (app.js 9025) + прежние ключи next — одни поля M13.
         Ключи модулей-сидений (animation/warnExceed/dialTime/vibroDial/devMode/
         svgEditor) флаг пишут, лица своих модулей ждут. */
      var k = ds.key;
      var n = N().ensureAlerts(state);
      if (k === "alerts-enabled" || k === "alertOn") {
        n.enabled = !n.enabled;
        if (n.enabled) askAlertPermission();
      }
      else if (k === "hold-until" || k === "holdUntilDrink") n.holdUntilDrink = !n.holdUntilDrink;
      else if (k === "alertVibrate") n.vibrate = n.vibrate === false;
      else if (k === "whenGoalMet") n.whenGoalMet = !n.whenGoalMet;
      else if (k === "evenIfRecent") n.evenIfRecent = !n.evenIfRecent;
      else if (k === "animation") state.animation = !state.animation;
      else if (k === "warnExceed") state.warnExceed = !state.warnExceed;
      else if (k === "vibroDial") state.vibroDial = state.vibroDial === false;
      else if (k === "dialTime") { if (resolvedTheme() !== "oneplus") state.dialTime = !state.dialTime; }
      else if (k === "systemDrums" || k === "systemCalendar" || k === "systemClock") {
        /* Донор app.js:9057 (при порте ветка потерялась — тумблеры были
           мёртвыми): без доступного системного пикера не делаем вид,
           что включили, а говорим честно. */
        var sysFlag = k;
        var sysNative = k === "systemDrums" ? useNative("Number")
          : (k === "systemCalendar" ? (webHasDatePick() || useNative("Date")) : useNative("Time"));
        if (!state[sysFlag] && !sysNative) {
          toast(k === "systemDrums" ? "Системные барабаны доступны в приложении для Android"
            : k === "systemCalendar" ? "Системный календарь доступен в приложении для Android"
            : "Системные часы доступны в приложении для Android");
          return;
        }
        state[sysFlag] = !state[sysFlag];
      }
      else if (k === "devMode") state.devMode = !state.devMode;
      else if (k === "svgEditor") state.svgEditor = !state.svgEditor;
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
    if (act === "settings-choice-both" || act === "settings-choice-hist") {
      var ch = ui.settingsChoice;
      var both = act === "settings-choice-both";
      ui.settingsChoice = null;
      ui.modal = null;
      if (!ch) { render(); return; }
      if (ch.src === "cloud") {
        cloud.chunks = [ch.text];
        cloud.pending = ch.mode;
        cloud.busy = true;
        cloudApply(both);
      } else {
        var envF = lcEnv();
        if (both) envF.withSettings = true;
        var resF = Y().applyPack(state, ch.pack, "merge", envF);
        if (resF && resF.ok) save();
        toast(both ? "История и настройки применены из копии" : "История применена из копии");
      }
      render();
      return;
    }
    if (act === "open-profile") { ui.page = "register"; ui.modal = null; render(); return; }
    if (act === "ask-cloud-clear") {
      ui.dialogSpec = {
        title: "Очистить облако?",
        text: "Копия истории на Google Диске будет стёрта вместе с метками удалений. " +
          "Данные на этом устройстве останутся нетронутыми, а следующая «Синхронизация» " +
          "выложит текущую историю заново.",
        ok: "Очистить", cancel: "Отмена", kind: "cloud-clear", okAct: "do-cloud-clear"
      };
      ui.modal = "dialog";
      render();
      return;
    }
    if (act === "do-cloud-clear") { ui.modal = null; ui.dialogSpec = null; cloudClear(); return; }
    if (act === "google-diag") { cloudDiag(); return; }
    if (act === "google-diag-copy") {
      var ct = ui.dialogSpec && ui.dialogSpec.copyText;
      if (ct && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ct).then(function () { toast("Параметры скопированы"); },
          function () { toast("Скопировать не вышло — перепишите вручную"); });
      } else toast("Скопировать не вышло — перепишите вручную");
      return;
    }
    if (act === "google-signin") {
      if (!cloudBridge()) { toast("Вход через Google работает в приложении для Android"); return; }
      toast("Открываю окно Google…");
      window.WaterGoogle.signIn();
      return;
    }
    if (act === "cloud-signout") {
      if (cloudBridge()) window.WaterGoogle.signOut();
      toast("Вы вышли из аккаунта — история осталась на телефоне");
      render();
      return;
    }
    if (act === "cloud-profile") {
      if (window.WaterGoogle && typeof window.WaterGoogle.refreshProfile === "function") {
        toast("Запрашиваю данные профиля…");
        window.WaterGoogle.refreshProfile();
      } else {
        toast("Данные профиля обновятся при следующем входе");
      }
      return;
    }
    if (act === "cloud-sign") {
      if (!(window.WaterGoogle)) { toast("Вход через Google доступен в приложении Android"); return; }
      if (cloud.signedIn) window.WaterGoogle.signOut(); else window.WaterGoogle.signIn();
      return;
    }
    if (act === "cloud-save") { cloudUpload("manual"); return; }
    if (act === "open-add") { openAdd(null); return; }
    if (act === "more-drinks") {
      ui.page = "drinks";
      /* «Ещё» теперь есть в обоих меню: возврат туда, откуда открылись. */
      ui.drinkReturn = ui.sheet === "volume" ? "volume" : "history";
      ui.sorting = false;
      render();
      return;
    }
    if (act === "pick-quick") {
      if (ui.addDraft) {
        ui.addDraft.drinkId = t.dataset.id;
        ui.addDraft.snapshot = null;
      }
      render();
      return;
    }
    if (act === "commit-entry") {
      if (!ui.addDraft) return;
      maybeWarnEntry(readWheel("volume", ui.addDraft.volume));
      return;
    }
    if (act === "open-time") {
      var timeNow = (ui.addDraft && ui.addDraft.time) || nowHM();
      if (useSystemClock()) {
        askNativeTime({ title: "Время приема напитка", value: timeNow, is24Hour: true }, function (hm) {
          if (ui.addDraft) ui.addDraft.time = hm;
          render();
        });
        return;
      }
      var parts = timeNow.split(":");
      ui.timeDraft = { hour: Number(parts[0]), minute: Number(parts[1]) };
      /* v97: цвет напитка правки — для акцента циферблата. «Исчезнувший»
         напиток берём из snapshot черновика (та же политика, что у карточки). */
      var tdr = ui.addDraft && (drinkById(ui.addDraft.drinkId) || ui.addDraft.snapshot);
      ui.timeDrinkColor = (tdr && tdr.color) || null;
      /* Ошибка v88–v89 (жалоба владельца 26.10: «редактирую одно, а меняется
         другое»): циферблат жил между открытиями редактора (ключ один), и
         второе открытие показывало время ПРЕДЫДУЩЕЙ правки, да ещё на экране
         минут. Сбрасываем состояние при каждом открытии. */
      ui.dial = null;
      ui.dialKey = null;
      ui.modal = "time";
      render();
      return;
    }
    if (act === "time-ok") {
      var tp = readTimePair("time", "hour", "minute", ui.timeDraft ? ui.timeDraft.hour : 0, ui.timeDraft ? ui.timeDraft.minute : 0);
      var h = tp.h, m = tp.m;
      if (ui.addDraft) ui.addDraft.time = pad(h) + ":" + pad(m);
      ui.modal = null;
      ui.timeDraft = null;
      ui.timeDrinkColor = null; /* v97 */
      render();
      return;
    }
    if (act === "time-cancel" || act === "close-modal" || act === "dialog-cancel") {
      ui.modal = null;
      ui.dialogSpec = null;
      ui.timeDraft = null;
      ui.timeDrinkColor = null; /* v97 */
      render();
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
    if (act === "onb-weight") {
      ui.weightDraft = { date: todayStr(), kg: ui.onb ? ui.onb.kg : 60 };
      ui.modal = "onb-weight";
      render();
      return;
    }
    if (act === "onb-weight-cancel") {
      ui.modal = null;
      ui.weightDraft = null;
      render();
      return;
    }
    if (act === "onb-weight-ok") {
      if (ui.weightDraft && ui.onb) ui.onb.kg = ui.weightDraft.kg;
      ui.modal = null;
      ui.weightDraft = null;
      render();
      return;
    }
    if (act === "onb-time") { ui.modal = "onb-day"; render(); return; }
    if (act === "onb-day-cancel") { ui.modal = null; render(); return; }
    if (act === "onb-day-ok") {
      var odp = readTimePair("day", "day-h", "day-m", 2, 0);
      O().setDayStart(ui.onb, pad2(odp.h) + ":" + pad2(odp.m));
      ui.modal = null;
      render();
      return;
    }
    if (act === "onb-time-sys") {
      var d0 = ui.onb || {};
      if (window.WaterNative && WaterNative.hasTime && WaterNative.hasTime()) {
        askNativeTime({ title: "Начало суток", value: d0.dayStart || "02:00", is24Hour: true }, function (hm) {
          O().setDayStart(ui.onb, hm);
          render();
        });
      } else {
        /* Веб и оболочки без пикера: системный пикер времени через скрытый input
           (донор 8876-8892). */
        var inp = document.createElement("input");
        inp.type = "time";
        inp.value = d0.dayStart || "02:00";
        inp.style.position = "fixed";
        inp.style.left = "-40px";
        inp.style.opacity = "0";
        document.body.appendChild(inp);
        var picked = false;
        inp.addEventListener("change", function () {
          picked = true;
          if (inp.value) O().setDayStart(ui.onb, inp.value);
          inp.remove();
          render();
        });
        setTimeout(function () { if (!picked && inp.parentNode) inp.remove(); }, 60000);
        try { if (inp.showPicker) inp.showPicker(); else inp.focus(); } catch (e) { inp.focus(); }
      }
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
      if (el && el.classList && el.classList.contains("wt-dateinp")) {
        var iso = el.value;
        if (iso) {
          if (iso > todayStr()) iso = todayStr();
          if (ui.weightDraft) ui.weightDraft.date = iso;
          render();
        }
        return;
      }
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
    if (window.SettingsModel) window.SettingsModel = wrappedModel(); /* M25: сид-места */
    state = C().boot();
    ui = U().shellState();
    ui.pinning = false; ui.pinSlot = null; ui.pinDrinkId = null; /* пины (модуль 6) */
    ui.historyDate = null; ui.chartLeft = null; ui.drinkReturn = "home";
    ui.volumeDraft = null; ui.volumeDrinkId = null; ui.editId = null; ui.editDraft = null;
    ui.onb = null; ui.dialogSpec = null;
    U().ICON_BASE_SET("assets/icons/");
    N().ensureAlerts(state);
    applyTheme();
    applySkinTokens();
    bindEvents();
    var env = {
      shell: ui, render: render, closeSheet: closeSheet,
      closeSwipes: function () { closeOpenSwipes(); },
      getState: function () { return state; },
      has: function (sel) { return !!document.querySelector(sel); }
    };
    if (W.WT2X) W.WT2X.bind(env);
    /* Донор app.js:10194: раскладка значков проекта применяется до первого рендера. */
    /* v99 донора: применение в модуле цвета перерисовывает воду; фазы слоёв
       при смене скорости M07 сохраняет сам (кэш фаз по слоям). */
    if (window.LiquidColor && LiquidColor.onChange) LiquidColor.onChange(function () { render(); });
    adoptProjectLayout(function () { adoptProjectSkin(function () { render(); }); });
    /* Загрузочные шаги донора: разрешение на уведомления, облако, сверка слотов. */
    var n = N().ensureAlerts(state);
    if (n.enabled && !state.alertPermAsked) {
      state.alertPermAsked = true;
      save();
      if (window.WaterAlerts && typeof window.WaterAlerts.requestPermission === "function") {
        try { window.WaterAlerts.requestPermission(); } catch (e) {}
      }
    }
    avatarPurge(); /* донор boot 10338 */
    cloudRead();
    avatarFetch(); /* донор boot 10340 */
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
  /* v132: авторежим будней пересчитывает окна раз в 10 минут (плюс каждый
     render — по сигнатуре, без лишней работы). */
  setInterval(habitAutoTick, 600000);
  setInterval(cupSecTick, 1000); /* донор 4650: countdown миски每秒 */

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
