/* Модуль цвета жидкости кота. Полностью автономен: своё хранилище, своя секция
   настроек, свой CSS. Удаление без вреда основному коду:
   1) убрать этот файл; 2) убрать тег <script src="liquid-color.js"> в index.html;
   3) убрать охраняемые упоминания window.LiquidColor в app.js
      (performAction, catStackLayers, страница «Дополнительно», onChange-хук).
   Основной код без модуля красит воду/хвост константой #2ddaf9. */
(function () {
  "use strict";
  var KEY = "cup-liquid-color-v1";
  var BASE = "#2ddaf9";        // арт-cyan воды
  var PORCELAIN = "#dbf2ff";   // фарфор для разбавления
  var MODES = [
    ["vessel", "Сосуд", "Порции смешиваются по порядку, след напитка вымывается водой"],
    ["dominant", "Доминирующий напиток", "Цвет напитка с наибольшим объёмом за сутки"],
    ["domhyst", "Доминирующий с гистерезисом", "Переключение при перевесе больше 10 п.п."],
    ["last", "Последняя порция", "Цвет самого свежего напитка"],
    ["belt", "Пояс графика", "Полосатая вода как график: пояса напитков со смешанными границами"],
    ["base", "Вода-база с тонировкой", "cyan тонируется долей неводного объёма"]
  ];

  function defs() {
    return { mode: "vessel", smooth: true, dilute: false, anchor: null, wave: true,
      /* v99: геометрия волны; дефолт = волна выпуска v98. */
      waveA: 12, waveW: 300, waveG: 238, waveSA: 100, waveSB: 100,
      /* v117: каталог волны: число волн и карточка каждой волны.
         Направления по базе ключкадров: 1 влево, 2 вправо, далее чередуясь.
         Дефолт — настройки владельца 08.11 (скриншот папки): одна передняя
         волна 12/300/238, скорость 180, влево, градиент 60, прозрачность 45,
         интенсивность 75. Остальные карточки — прежние. */
      waveN: 1,
      waveGD1: 60, waveGD2: 0, waveGD3: 0, waveGD4: 0, waveGD5: 0,
      waveOP1: 45, waveOP2: 80, waveOP3: 45, waveOP4: 30, waveOP5: 20,
      waveINT1: 75, waveINT2: 100, waveINT3: 100, waveINT4: 100, waveINT5: 100,
      waveS1: 180, waveS2: 100, waveS3: 100, waveS4: 100, waveS5: 100,
      waveD1: 0, waveD2: 1, waveD3: 0, waveD4: 1, waveD5: 0,
      waveO1: 0, waveO2: 0, waveO3: 0, waveO4: 0, waveO5: 0,
      bubN: 5, bubS: 8, bubV: 100, bubST: 85, bubX: 50, bubT: 25, bubCol: true };
  }
  function load() {
    var raw = {};
    try { raw = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
    var d = Object.assign(defs(), raw);
    /* v117: старые две скорости становятся скоростями волн 1 и 2. */
    if (raw.waveSA != null && raw.waveS1 == null) d.waveS1 = d.waveSA;
    if (raw.waveSB != null && raw.waveS2 == null) d.waveS2 = d.waveSB;
    /* v119: общий градиент v118 переезжает во все карточки волн. */
    if (raw.waveGD != null && raw.waveGD1 == null) {
      d.waveGD1 = d.waveGD; d.waveGD2 = d.waveGD; d.waveGD3 = d.waveGD; d.waveGD4 = d.waveGD; d.waveGD5 = d.waveGD;
    }
    return d;
  }
  var store = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }

  /* --- OKLab: смеси без серой грязи --- */
  function s2l(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function l2s(c) { c = Math.max(0, Math.min(1, c)); return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)); }
  function hex2rgb(h) {
    h = String(h || "").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n)) n = 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgb2hex(r) { return "#" + r.map(function (v) { return ("0" + v.toString(16)).slice(-2); }).join(""); }
  function rgb2oklab(r) {
    var R = s2l(r[0]), G = s2l(r[1]), B = s2l(r[2]);
    var l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
    var m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
    var s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    return [
      0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7576674620 * m - 0.7827195041 * s
    ];
  }
  function oklab2rgb(L) {
    var l = Math.pow(L[0] + 0.3963377774 * L[1] + 0.2158037573 * L[2], 3);
    var m = Math.pow(L[0] - 0.1055613458 * L[1] - 0.0638541728 * L[2], 3);
    var s = Math.pow(L[0] - 0.0894841775 * L[1] - 1.2914855480 * L[2], 3);
    return [
      l2s(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      l2s(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
      l2s(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)
    ];
  }
  function mix(a, b, t) {
    t = Math.max(0, Math.min(1, Number(t) || 0));
    if (t <= 0) return a;
    if (t >= 1) return b;
    var A = rgb2oklab(hex2rgb(a)), B = rgb2oklab(hex2rgb(b));
    return rgb2hex(oklab2rgb([
      A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t
    ]));
  }

  /* v138 (пересмотр владельца: «белое и смежные — наверх», молоко не забыть):
     порядок поясов котика и стопки графика — ТРИ ЗОНЫ, между ними сплошной
     разгон по светлоте. Корона: синие (тон 195–250°). Осадок: только
     НАСТОЯЩИЙ тёмный кофе (тон 10–50°, насыщенность < 50, светлота < 70);
     бледные бежевые (латте, капучино, макиато, ячменный) осадком НЕ считаются
     и по светлоте встают в пену под короной — белёсых прослоек посреди
     стакана не остаётся. Всё остальное — середина по светлоте.
     Тон и насыщенность — те же координаты, что рисует круглая палитра.
     Внутри зоны темнее ниже; при равенстве светлоты — порядок каталога. */
  function rgb2hsl(r) {
    var R = r[0] / 255, G = r[1] / 255, B = r[2] / 255;
    var mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn, h = 0;
    if (d) {
      if (mx === R) h = ((G - B) / d) % 6;
      else if (mx === G) h = (B - R) / d + 2;
      else h = (R - G) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return [h, d ? d / (1 - Math.abs(mx + mn - 1)) * 100 : 0];
  }
  function lightOf(hex) { return rgb2oklab(hex2rgb(hex))[0] * 100; }
  function zoneOf(hex) {
    var hs = rgb2hsl(hex2rgb(hex)), h = hs[0], sat = hs[1], L = lightOf(hex);
    if (h >= 10 && h <= 50 && sat < 50 && L < 70) return "brown";
    /* с 185°: собственный cyan воды (#2ddaf9, ~189°) — корона,
       а минеральная бирюза (~178°) — середина */
    if (h >= 185 && h < 250) return "blue";
    return "mid";
  }
  var ZONE_RANK = { blue: 0, mid: 1, brown: 2 };
  /* Сравнение СВЕРХУ ВНИЗ (рампа и стопка рисуются сверху вниз):
     зона рангом выше; в зоне светлее выше; ничья — каталог. */
  function beltCompare(ca, oa, cb, ob) {
    var ra = ZONE_RANK[zoneOf(ca)], rb = ZONE_RANK[zoneOf(cb)];
    if (ra !== rb) return ra - rb;
    var la = lightOf(ca), lb = lightOf(cb);
    if (la !== lb) return lb - la;
    return (oa || 0) - (ob || 0);
  }

  /* --- данные суток --- */
  function isWater(e) { return !!(e && (e.icon === "water" || e.id === "water")); }
  function drinkColor(e) { return isWater(e) ? BASE : (e && e.color) || BASE; }
  /* Минуты от начала суток (dayStart): ночные часы 00:00—01:59 принадлежат
     КОНЦУ водного дня. Без переноса строка «00:25» сортируется раньше
     «23:05» — ночная порция оказывалась «первой» и «несвежей»
     (ночное окно, урок 26.10.2026). */
  function dayMin(time, ds) {
    var t = String(time || "0:0").split(":");
    var d = String(ds || "02:00").split(":");
    return (((+t[0] || 0) * 60 + (+t[1] || 0)) - ((+d[0] || 0) * 60 + (+d[1] || 0)) + 2880) % 1440;
  }
  function todayList(state, today) {
    var ds = state.dayStart;
    return (state.entries || [])
      .filter(function (e) { return e.date === today && (e.volume || 0) > 0; })
      .sort(function (a, b) {
        return (dayMin(a.time, ds) - dayMin(b.time, ds)) || String(a.time).localeCompare(String(b.time));
      });
  }
  function volumes(list, ds) {
    var m = {};
    list.forEach(function (e) {
      var k = e.drinkId || e.name || e.icon || "water";
      var em = dayMin(e.time, ds);
      if (!m[k]) m[k] = { v: 0, t: e.time, tm: em, c: drinkColor(e) };
      m[k].v += e.volume || 0;
      if (em >= m[k].tm) { m[k].t = e.time; m[k].tm = em; }
    });
    return m;
  }

  /* --- v136: «Пояс графика» — полосатая вода кота.
     Пояса по напиткам сегодняшнего дня: доли = объёмы, порядок — по каталогу
     напитков (первый сверху, как сегменты столбца графика); границы
     смешиваются на ~8% высоты столба. Рампа — BELT_N точек сверху вниз;
     один напиток (или пустой день) — плоская рампа: краска байт-в-байт
     совпадает с прежней однотонной. «Разбавлять» тонирует каждый цвет. */
  var BELT_N = 48, BELT_BLEND = 0.08;
  function beltsFor(state, today) {
    var list = todayList(state, today);
    var m = volumes(list, state.dayStart);
    var ord = {};
    (state.drinks || []).forEach(function (d, i) { ord[d.id] = i; });
    /* v138: одинаковый цвет — один пояс (объёмы суммируются независимо от
       порядка в каталоге); порядок — семействами, не каталогом. */
    var byColor = {};
    Object.keys(m).forEach(function (k) {
      var c = m[k].c, o = ord[k] == null ? 999 : ord[k], cur = byColor[c];
      if (!cur) byColor[c] = { id: k, v: m[k].v, c: c, ord: o };
      else { cur.v += m[k].v; cur.id += "+" + k; if (o < cur.ord) cur.ord = o; }
    });
    var arr = Object.keys(byColor).map(function (c) { return byColor[c]; });
    arr.sort(function (a, b) { return beltCompare(a.c, a.ord, b.c, b.ord); });
    return arr;
  }
  function rampCore(state, today, fill, diluteOn) {
    var belts = beltsFor(state, today);
    if (!belts.length) {
      var c0 = diluteWith(diluteOn, BASE, fill);
      var flat0 = [];
      for (var z = 0; z < BELT_N; z++) flat0.push(c0);
      return { flat: true, top: c0, colors: flat0, belts: [] };
    }
    var tot = 0;
    belts.forEach(function (b) { tot += b.v; });
    var stops = [], cum = 0;
    belts.forEach(function (b) {
      var from = tot > 0 ? cum / tot : 0;
      cum += b.v;
      stops.push({ id: b.id, v: b.v, from: from, to: tot > 0 ? cum / tot : 1, c: diluteWith(diluteOn, b.c, fill) });
    });
    var half = BELT_BLEND / 2;
    function at(pos) {
      for (var i = 0; i < stops.length - 1; i++) {
        var bd = stops[i].to;
        if (pos < bd - half) return stops[i].c;
        if (pos <= bd + half) return mix(stops[i].c, stops[i + 1].c, (pos - (bd - half)) / BELT_BLEND);
      }
      return stops[stops.length - 1].c;
    }
    var colors = [];
    for (var i = 0; i < BELT_N; i++) colors.push(at(i / (BELT_N - 1)));
    var flat = colors.every(function (c) { return c === colors[0]; });
    return { flat: flat, top: stops[0].c, colors: colors, belts: stops };
  }
  function ramp(state, today, fill) {
    return rampCore(state, today, fill, !!store.dilute);
  }

  /* --- правила --- */
  function dominant(list, ds) {
    var m = volumes(list, ds), best = null;
    Object.keys(m).forEach(function (k) {
      var o = m[k];
      if (!best || o.v > best.v || (o.v === best.v && o.tm > best.tm)) best = o;
    });
    return best ? best.c : BASE;
  }
  function domhyst(list, holder, ds) {
    var m = volumes(list, ds);
    var tot = list.reduce(function (s, e) { return s + (e.volume || 0); }, 0) || 1;
    var lead = null;
    Object.keys(m).forEach(function (k) { if (!lead || m[k].v > m[lead].v) lead = k; });
    var anchor = holder.anchor && m[holder.anchor] ? holder.anchor : lead;
    if (lead && anchor !== lead && (m[lead].v - m[anchor].v) / tot > 0.10) anchor = lead;
    holder.anchor = anchor || null;
    return m[anchor] ? m[anchor].c : BASE;
  }
  function last(list) { return list.length ? drinkColor(list[list.length - 1]) : BASE; }
  function vessel(list) {
    var c = BASE, cum = 0;
    list.forEach(function (e) {
      var v = e.volume || 0;
      if (v <= 0) return;
      c = mix(c, drinkColor(e), v / (cum + v));
      cum += v;
    });
    return c;
  }
  function baseTint(list) {
    var tot = 0, non = 0, lab = null, addCount = 0, addHexOnly = null;
    list.forEach(function (e) {
      var v = e.volume || 0;
      tot += v;
      if (!isWater(e) && v > 0) {
        non += v;
        addCount += 1;
        addHexOnly = addCount === 1 ? drinkColor(e) : null;
        var L = rgb2oklab(hex2rgb(drinkColor(e))), w = v / non;
        lab = lab
          ? [lab[0] + (L[0] - lab[0]) * w, lab[1] + (L[1] - lab[1]) * w, lab[2] + (L[2] - lab[2]) * w]
          : L;
      }
    });
    if (!tot || !lab) return BASE;
    var addHex = addCount === 1 && addHexOnly ? addHexOnly : rgb2hex(oklab2rgb(lab));
    return mix(BASE, addHex, Math.min(1, non / tot));
  }
  function diluteWith(on, c, fill) {
    if (!on) return c;
    var f = Math.max(0, Math.min(1, Number(fill) || 0));
    return mix(PORCELAIN, c, 0.25 + 0.75 * f);
  }
  function dilute(c, fill) {
    return diluteWith(store.dilute, c, fill);
  }
  /* Чистое вычисление цвета дня по режиму: им пользуются и кот (color),
     и самостоятельный модуль цвета графика (colorWith) — логика одна,
     а настройки у каждого свои (решение владельца 24.10.2026).
     holder — держатель якоря гистерезиса (свой store у каждого потребителя). */
  function compute(mode, diluteOn, state, today, fill, holder) {
    var list = todayList(state, today);
    if (!list.length) return diluteWith(diluteOn, BASE, fill);
    var c;
    /* v136: belt — цвет ВЕРХНЕГО пояса (гребни, поверхность, пузырьки,
       хвост); разбавление уже применено к каждому цвету рампы. */
    if (mode === "belt") return rampCore(state, today, fill, !!diluteOn).top;
    if (mode === "dominant") c = dominant(list, state.dayStart);
    else if (mode === "domhyst") c = domhyst(list, holder || {}, state.dayStart);
    else if (mode === "last") c = last(list);
    else if (mode === "base") c = baseTint(list);
    else c = vessel(list);
    return diluteWith(diluteOn, c, fill);
  }
  function color(state, today, fill) {
    var a0 = store.anchor;
    var c = compute(store.mode, store.dilute, state, today, fill, store);
    if (store.anchor !== a0) save();
    return c;
  }
  function colorWith(mode, diluteOn, state, today, fill, holder) {
    return compute(mode, diluteOn, state, today, fill, holder);
  }

  /* --- CSS плавности и секция настроек --- */
  function applySmooth() {
    document.documentElement.classList.toggle("liq-smooth", !!store.smooth);
  }
  var styleTag = document.createElement("style");
  styleTag.textContent = ".liq-smooth .cat-art svg path { transition: fill 1.4s linear; }" +
    ".liq-smooth .cat-water .cat-flat { transition: transform .5s ease, opacity .5s ease, background-color 1.4s linear; }" +
    ".liq-slider { display: flex; align-items: center; gap: 10px; }" +
    ".liq-slider .ttl { flex: 1 1 auto; }" +
    ".liq-slider .ttl small { display: block; }" +
    ".liq-sl-wrap { display: flex; align-items: center; gap: 8px; flex: 0 0 46%; }" +
    ".liq-sl-wrap input[type=range] { flex: 1 1 auto; accent-color: #42a5f6; }" +
    ".liq-sl-val { min-width: 3ch; text-align: right; font-weight: 600; color: #9fd0ff; }";
  document.head.appendChild(styleTag);
  applySmooth();

  var TICK = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4Z" fill="currentColor"/></svg>';
  function row(title, sub, act, on, val) {
    return '<div class="n-row switch-row" role="switch" aria-checked="' + (on ? "true" : "false") +
      '" tabindex="0" data-act="' + act + '"' + (val ? ' data-v="' + val + '"' : "") + ">" +
      '<span class="ttl">' + title + (sub ? "<small>" + sub + "</small>" : "") + "</span>" +
      '<span class="switch' + (on ? " on" : "") + '" aria-hidden="true"><i></i></span></div>';
  }
  /* v99: ползунок параметра волны: значение применяем на отпускании пальца
     (change), подпись обновляем на каждом движении (input, без перерисовки). */
  function slider(title, key, min, max, step, val, sub) {
    return '<div class="n-row liq-slider"><span class="ttl">' + title +
      '<small>' + (sub || "единицы условные, дефолт подобран под нынешнюю волну") + '</small></span>' +
      '<span class="liq-sl-wrap"><input type="range" min="' + min + '" max="' + max + '" step="' + step +
      '" value="' + val + '" data-liq-p="' + key + '" aria-label="' + title + '"><b class="liq-sl-val">' + val + '</b></span></div>';
  }
  function clampP(key) {
    var lim = { waveA: [4, 24, 12], waveW: [60, 300, 300], waveG: [60, 300, 238], waveSA: [20, 300, 100], waveSB: [20, 300, 100],
    waveN: [1, 5, 1],
    waveGD1: [0, 100, 60], waveGD2: [0, 100, 60], waveGD3: [0, 100, 60], waveGD4: [0, 100, 60], waveGD5: [0, 100, 60],
    waveOP1: [0, 100, 45], waveOP2: [0, 100, 100], waveOP3: [0, 100, 100], waveOP4: [0, 100, 100], waveOP5: [0, 100, 100],
    waveINT1: [0, 100, 75], waveINT2: [0, 100, 100], waveINT3: [0, 100, 100], waveINT4: [0, 100, 100], waveINT5: [0, 100, 100],
    waveS1: [20, 300, 180], waveS2: [20, 300, 100], waveS3: [20, 300, 100], waveS4: [20, 300, 100], waveS5: [20, 300, 100],
    waveO1: [-20, 20, 0], waveO2: [-20, 20, 0], waveO3: [-20, 20, 0], waveO4: [-20, 20, 0], waveO5: [-20, 20, 0],
      bubN: [0, 14, 5], bubS: [4, 70, 8], bubV: [50, 200, 100], bubST: [10, 100, 85], bubX: [0, 100, 50], bubT: [0, 100, 25] }[key] || [0, 1, 0];
    var v = Math.round(Number(store[key]));
    if (!isFinite(v)) v = lim[2];
    return Math.max(lim[0], Math.min(lim[1], v));
  }
  /* v127: блоки «Цвет жидкости» и «Пузырьки» — самостоятельные custom-строки
     каталога (liqBlock в «Оформлении», bubBlock в «Дополнительно»); заголовки
     разделов даёт модель, поэтому здесь только содержимое. */
  function colorHtml() {
    var out = "";
    MODES.forEach(function (m) {
      out += row(m[1], m[2], "liq-mode", store.mode === m[0], m[0]);
    });
    out += row("Плавная смена цвета", "Перелив ~1,5 с при каждой порции", "liq-smooth", !!store.smooth);
    out += row("Разбавлять при малом заполнении", "Чем пустее кот, тем бледнее цвет", "liq-dilute", !!store.dilute);
    out += row("Пузырьки в цвет напитка", "Осветлённый оттенок напитка вместо белого блика", "liq-bubcol", store.bubCol !== false);
    return out;
  }
  function bubblesHtml() {
    var out = "";
    out += slider("Пузырьков в воде", "bubN", 0, 14, 1, clampP("bubN"), "0 — выключено; прототип: несколько по центру");
    out += slider("Размер пузырьков", "bubS", 4, 70, 1, clampP("bubS"), "до 70 включительно: максимум x5 для теста");
    out += slider("Скорость всплытия", "bubV", 50, 200, 10, clampP("bubV"), "% от дефолта ~6 с на пузырёк");
    out += slider("Линия старта пузырьков", "bubST", 10, 100, 5, clampP("bubST"), "% глубины воды: откуда всплывают к ватерлинии");
    out += slider("Положение пузырьков по горизонтали", "bubX", 0, 100, 1, clampP("bubX"), "% ширины: центр колонны пузырьков");
    out += slider("Прозрачность пузырьков", "bubT", 0, 100, 5, clampP("bubT"), "%: 0 — непрозрачные, 100 — невидимые; 25 — вид прототипа");
    return out;
  }
  /* v117: отдельный каталог волны: тумблер, число волн, общая геометрия
     и карточка каждой волны (направление, скорость, смещение). */
  function waveHtml() {
    var n = clampP("waveN");
    var out = row("Волна", "Покачивание воды и всплеск при новой порции", "liq-wave", store.wave !== false);
    out += slider("Число волн", "waveN", 1, 5, 1, n, "1–5: слои воды от передней к задним");
    out += slider("Высота гребня", "waveA", 4, 24, 2, clampP("waveA"));
    out += slider("Ширина гребня", "waveW", 60, 300, 2, clampP("waveW"));
    out += slider("Расстояние между волнами", "waveG", 60, 300, 2, clampP("waveG"));
    /* v120: экспорт настроек воды и волны — JSON владельцу для пересылки. */
    out += '<div class="n-row switch-row" role="button" tabindex="0" data-act="lc-export"><span class="ttl">Скопировать настройки' +
      "<small>JSON всех настроек цвета, волны и пузырьков — вставить в чат с разработчиком</small></span>" +
      '<span class="n-sec-chev" aria-hidden="true">›</span></div>';
    for (var i = 1; i <= n; i++) {
      out += '<div class="n-section">Волна ' + i + (i === 1 ? " (передняя)" : "") + "</div>";
      out += row("Направление вправо", "Выключено — волна идёт влево", "lc-wd", !!store["waveD" + i], String(i));
      out += slider("Скорость волны", "waveS" + i, 20, 300, 10, clampP("waveS" + i), "% от базовой скорости слоя");
      out += slider("Смещение по вертикали", "waveO" + i, -20, 20, 1, clampP("waveO" + i), "% высоты волны: плюс — выше ватерлинии");
      out += slider("Градиент гребня", "waveGD" + i, 0, 100, 5, clampP("waveGD" + i), "0 — кромка сплошная; 100 — растворяется на всю высоту гребня");
      out += slider("Прозрачность волны", "waveOP" + i, 0, 100, 5, clampP("waveOP" + i), "100 — непрозрачная; 0 — невидимая");
      out += slider("Интенсивность цвета", "waveINT" + i, 0, 100, 5, clampP("waveINT" + i), "100 — полный цвет напитка; 0 — белая");
    }
    return out;
  }
  function act(a, t) {
    if (a === "liq-mode") {
      var v = t && t.dataset ? t.dataset.v : "";
      if (MODES.some(function (m) { return m[0] === v; })) { store.mode = v; store.anchor = null; save(); }
      return true;
    }
    if (a === "liq-smooth") { store.smooth = !store.smooth; save(); applySmooth(); return true; }
    if (a === "liq-dilute") { store.dilute = !store.dilute; save(); return true; }
    if (a === "liq-wave") { store.wave = store.wave === false; save(); return true; }
    if (a === "lc-wd") {
      var wi = t && t.dataset ? Number(t.dataset.v) : 0;
      if (wi >= 1 && wi <= 5) { store["waveD" + wi] = store["waveD" + wi] ? 0 : 1; save(); }
      return true;
    }
    if (a === "liq-bubcol") { store.bubCol = store.bubCol === false; save(); return true; }
    return false;
  }

  var onChangeCb = null;
  document.addEventListener("input", function (e) {
    var el = e.target && e.target.closest ? e.target.closest(".liq-slider input") : null;
    if (!el) return;
    var b = el.parentNode && el.parentNode.querySelector(".liq-sl-val");
    if (b) b.textContent = el.value;
  });
  document.addEventListener("change", function (e) {
    var el = e.target && e.target.closest ? e.target.closest(".liq-slider input") : null;
    if (!el) return;
    var k = el.getAttribute("data-liq-p");
    if (k === "waveA" || k === "waveW" || k === "waveG" || k === "waveSA" || k === "waveSB" ||
        k === "waveN" || k === "waveS1" ||
        k === "waveGD1" || k === "waveGD2" || k === "waveGD3" || k === "waveGD4" || k === "waveGD5" ||
        k === "waveOP1" || k === "waveOP2" || k === "waveOP3" || k === "waveOP4" || k === "waveOP5" ||
        k === "waveINT1" || k === "waveINT2" || k === "waveINT3" || k === "waveINT4" || k === "waveINT5" || k === "waveS2" || k === "waveS3" || k === "waveS4" || k === "waveS5" ||
        k === "waveO1" || k === "waveO2" || k === "waveO3" || k === "waveO4" || k === "waveO5" ||
        k === "bubN" || k === "bubS" || k === "bubV" || k === "bubST" || k === "bubX" || k === "bubT") {
      store[k] = Math.round(Number(el.value));
      store[k] = clampP(k);
      save();
      if (onChangeCb) onChangeCb();
    }
  });

  window.LiquidColor = {
    color: color,
    colorWith: colorWith,
    waveOn: function () { return store.wave !== false; },
    waveParams: function () {
      var n = clampP("waveN");
      var waves = [];
      for (var i = 1; i <= n; i++) {
        waves.push({ s: clampP("waveS" + i), d: store["waveD" + i] ? 1 : 0, o: clampP("waveO" + i), gd: clampP("waveGD" + i), op: clampP("waveOP" + i), intensity: clampP("waveINT" + i) });
      }
      return { a: clampP("waveA"), w: clampP("waveW"), g: clampP("waveG"), sa: clampP("waveSA"), sb: clampP("waveSB"), n: n, gd: clampP("waveGD"), waves: waves };
    },
    bubbleParams: function () {
      return { n: clampP("bubN"), s: clampP("bubS"), v: clampP("bubV"), st: clampP("bubST"), x: clampP("bubX"), t: clampP("bubT"), col: store.bubCol !== false };
    },
    onChange: function (cb) { onChangeCb = cb; },
    /* v145: приём блока оформления из облачной копии: только известные ключи. */
    importState: function (obj) {
      if (!obj || typeof obj !== "object") return false;
      var d = defs(), n = 0;
      Object.keys(d).forEach(function (k) {
        if (obj[k] !== undefined) { store[k] = obj[k]; n++; }
      });
      if (n) { save(); if (onChangeCb) onChangeCb(); }
      return n > 0;
    },
    act: act,
    colorHtml: colorHtml,
    bubblesHtml: bubblesHtml,
    waveHtml: waveHtml,
    exportJson: function () { return JSON.stringify(store, null, 2); },
    mix: mix,
    zoneOf: zoneOf,
    lightOf: lightOf,
    beltCompare: beltCompare,
    /* v136: пояс графика — рампа, пояса, текущий режим, число точек. */
    ramp: ramp,
    belts: beltsFor,
    mode: function () { return store.mode; },
    BELT_N: BELT_N,
    store: function () { return store; },
    BASE: BASE,
    MODES: MODES.map(function (m) { return m[0]; }),
    /* Подписи режимов — для самостоятельной секции «Цвет графика». */
    MODES_DETAIL: MODES.map(function (m) { return { id: m[0], label: m[1], sub: m[2] }; }),
    /* v131: сколько волновых карточек сейчас рисуется — для выгрузки структуры. */
    waveCount: function () { return clampP("waveN"); }
  };
})();
