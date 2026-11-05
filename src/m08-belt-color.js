/* M08 — belt-color: рампа поясов, водители пояса и цвета (контракт C-027,
   очередь 04.11, донор liquid-color.js/ui-kit.js/app.js как спека).
   Полосатая вода v136: рампа BELT_N точек сверху вниз, границы поясов
   смешаны на BELT_BLEND; одинаковый цвет — один пояс (объёмы суммируются);
   порядок поясов — beltCompare: ПОКА зоны C-004/C-009 отложены словом
   владельца, beltCompare = порядок каталога (байт-в-байт нынешний график
   M10/M11); ранги зон и светлость лежат выключенными до слова владельца —
   тогда вода и график переключатся синхронно из одного источника.
   Плоская рампа (один цвет дня) — пояс не создаётся, краска байт-в-байт
   однотон M06 (правило донора v136).
   Водители: цвет 1500 мс и рампа 1500 мс (каждая из 48 точек), rAF,
   перекраска живых узлов без пересоздания (дрейф и лифт не рестартуют).
   dilute и режимы (сосуд/пояс) — хвост настроек M15, здесь выключены. */
(function (W) {
  "use strict";
  var BELT_N = 48, BELT_BLEND = 0.08;   /* донор liquid-color */
  var COL_MS = 1500;                    /* донор app.js */

  function rgb(h) {
    var m = /^#?([0-9a-f]{6})$/i.exec(h || "");
    if (!m) return null;
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function hexOf(r) {
    return "#" + r.map(function (v) { return ("0" + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2); }).join("");
  }
  function mix(c1, c2, t) {
    var a = rgb(c1), b = rgb(c2);
    if (!a || !b) return c2 || c1;
    return hexOf(a.map(function (v, i) { return v + (b[i] - v) * t; }));
  }
  /* До слова о зонах (C-004/C-009) — порядок каталога, как нынешний график.
     ЗОННЫЕ РАНГИ И СВЕТЛОСТЬ (донор beltCompare) вернутся словом владельца:
     return rankDiff || lightDiff || ordDiff. */
  function beltCompare(ca, oa, cb, ob) {
    return (oa == null ? 999 : oa) - (ob == null ? 999 : ob);
  }
  function beltsFor(state, today) {
    var es = (state.entries || []).filter(function (e) { return W.WT2J.entryDay(state, e) === today; });
    var m = {};
    es.forEach(function (e) {
      var id = e.drinkId || e.name;
      if (!m[id]) m[id] = { v: 0, c: e.color };
      m[id].v += Number(e.volume) || 0;
    });
    var ord = {};
    (state.drinks || []).forEach(function (d, i) { ord[d.id] = i; });
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
  function rampCore(state, today) {
    var belts = beltsFor(state, today);
    if (!belts.length) {
      var flat0 = [];
      for (var z = 0; z < BELT_N; z++) flat0.push(null);
      return { flat: true, top: null, colors: flat0, belts: [] };
    }
    var tot = 0;
    belts.forEach(function (b) { tot += b.v; });
    var stops = [], cum = 0;
    belts.forEach(function (b) {
      var from = tot > 0 ? cum / tot : 0;
      cum += b.v;
      stops.push({ id: b.id, v: b.v, from: from, to: tot > 0 ? cum / tot : 1, c: b.c });
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
  function ramp(state, today) { return rampCore(state, today); }

  function beltGradCss(colors) {
    return "linear-gradient(to bottom," + colors.map(function (h, i) {
      return " " + h + " " + (Math.round(i / (colors.length - 1) * 10000) / 100) + "%";
    }).join(",") + ")";
  }
  function beltDiv(rampColors, spanPct) {
    return '<div class="cat-belt" style="height:' + (Math.round(Math.max(0, Number(spanPct) || 0) * 100) / 100) +
      "%;background:" + beltGradCss(rampColors) + '"></div>';
  }
  /* Круг M06: пролёт пояса от ватерлинии до дна круга. */
  function beltSpanPct(liftPctNow) { return Math.max(0, 100 - (Number(liftPctNow) || 0)); }

  /* --- водители цвета и рампы (донор app.js, COL_MS 1500, rAF) --- */
  var colVis = null, colTw = null, colRaf = null;
  var beltVis = null, beltTw = null, beltRaf = null;
  var beltColsVis = null, beltColsTw = null;
  function nowMs() { return window.performance && performance.now ? performance.now() : Date.now(); }
  function applyColorVis() {
    if (!colVis) return;
    var css = "rgb(" + colVis.map(Math.round).join(",") + ")";
    var flats = document.querySelectorAll(".cat-art .cat-flat, .wt-orb .cat-flat");
    for (var i = 0; i < flats.length; i++) flats[i].style.background = css;
    /* M07: гребни ватерлинии без поясного индекса красит водитель цвета. */
    var crs = document.querySelectorAll(".wt-orb path[data-wl]:not([data-bi]), .cat-art path[data-wl]:not([data-bi])");
    for (var k = 0; k < crs.length; k++) crs[k].setAttribute("fill", css);
  }
  function stepColorVis() {
    colRaf = requestAnimationFrame(function () {
      if (!colTw) { colRaf = null; return; }
      var pr = Math.max(0, Math.min(1, (nowMs() - colTw.t0) / COL_MS));
      colVis = pr >= 1 ? colTw.to : colTw.from.map(function (v, i) { return v + (colTw.to[i] - v) * pr; });
      applyColorVis();
      if (pr >= 1) { colTw = null; colRaf = null; return; }
      stepColorVis();
    });
  }
  function syncColorTarget(hex, smooth) {
    var target = rgb(hex);
    if (!target) return;
    if (!colVis) { colVis = target; applyColorVis(); return; }
    if (colVis[0] === target[0] && colVis[1] === target[1] && colVis[2] === target[2]) { colTw = null; return; }
    if (!smooth) { colVis = target; colTw = null; applyColorVis(); return; }
    colTw = { from: colVis.slice(), to: target, t0: nowMs() };
    if (!colRaf) stepColorVis();
  }
  function applyBeltVis() {
    if (!beltVis) return;
    var css = beltGradCss(beltVis.map(function (c) { return "rgb(" + c.map(Math.round).join(",") + ")"; }));
    var belts = document.querySelectorAll(".cat-art .cat-belt, .wt-orb .cat-belt");
    for (var i = 0; i < belts.length; i++) belts[i].style.background = css;
    /* M07: поясные бэнды и гребни стыков красятся по своим индексам. */
    if (beltColsVis) {
      var hexes = beltColsVis.map(function (c) { return "rgb(" + c.map(Math.round).join(",") + ")"; });
      var bands = document.querySelectorAll(".wt-orb .cat-beltband, .cat-art .cat-beltband");
      for (var b = 0; b < bands.length; b++) {
        var bi = Number(bands[b].getAttribute("data-bi"));
        if (hexes[bi]) bands[b].style.background = hexes[bi];
      }
      var crs = document.querySelectorAll(".wt-orb path[data-bi], .cat-art path[data-bi]");
      for (var k = 0; k < crs.length; k++) {
        var ci = Number(crs[k].getAttribute("data-bi"));
        if (hexes[ci]) crs[k].setAttribute("fill", hexes[ci]);
      }
    }
  }
  function stepBeltVis() {
    beltRaf = requestAnimationFrame(function () {
      if (!beltTw) { beltRaf = null; return; }
      var pr = Math.max(0, Math.min(1, (nowMs() - beltTw.t0) / COL_MS));
      beltVis = pr >= 1 ? beltTw.to : beltTw.from.map(function (c, i) {
        return c.map(function (v, k) { return v + (beltTw.to[i][k] - v) * pr; });
      });
      if (beltColsTw) {
        beltColsVis = pr >= 1 ? beltColsTw.to : beltColsTw.from.map(function (c, i) {
          return c.map(function (v, k) { return v + (beltColsTw.to[i][k] - v) * pr; });
        });
      }
      applyBeltVis();
      if (pr >= 1) { beltTw = null; beltRaf = null; return; }
      stepBeltVis();
    });
  }
  function syncBeltTarget(colors, smooth, beltCols) {
    if (!colors || !colors.length) { beltVis = null; beltTw = null; beltColsVis = null; beltColsTw = null; return; }
    var target = colors.map(rgb);
    if (target.some(function (x) { return !x; })) return;
    if (beltCols) {
      var tc = beltCols.map(rgb);
      if (!beltColsVis || beltColsVis.length !== tc.length) beltColsVis = tc;
      else beltColsTw = { from: beltColsVis.map(function (c) { return c.slice(); }), to: tc, t0: nowMs() };
    }
    if (!beltVis || beltVis.length !== target.length) { beltVis = target; applyBeltVis(); return; }
    if (!smooth) { beltVis = target; beltTw = null; applyBeltVis(); return; }
    beltTw = { from: beltVis.map(function (c) { return c.slice(); }), to: target, t0: nowMs() };
    if (!beltRaf) stepBeltVis();
  }
  function visibleColor() { return colVis ? "rgb(" + colVis.map(Math.round).join(",") + ")" : null; }
  function visibleRamp() { return beltVis ? beltVis.map(function (c) { return "rgb(" + c.map(Math.round).join(",") + ")"; }) : null; }
  function visibleBelts() { return beltColsVis ? beltColsVis.map(function (c) { return "rgb(" + c.map(Math.round).join(",") + ")"; }) : null; }

  W.WT2B = {
    BELT_N: BELT_N,
    BELT_BLEND: BELT_BLEND,
    COL_MS: COL_MS,
    beltCompare: beltCompare,
    beltsFor: beltsFor,
    ramp: ramp,
    beltGradCss: beltGradCss,
    beltDiv: beltDiv,
    beltSpanPct: beltSpanPct,
    syncColorTarget: syncColorTarget,
    syncBeltTarget: syncBeltTarget,
    visibleColor: visibleColor,
    visibleRamp: visibleRamp,
    visibleBelts: visibleBelts,
    mix: mix
  };
})(window);
