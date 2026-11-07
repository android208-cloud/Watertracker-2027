/* M06 — вода: уровень, лифт, однотон (очередь переезда 04.11, контракт C-026).
   Донор как спека: геометрия водного тела и водитель лифта байт-в-байт из
   ui-kit.js/app.js донора (WT_Y0/WT_Y1/WT_BOX_H, catWaterSurface,
   catWaterLiftPct, wtMaskUri/wtUri, LIFT_MS 3500, синус ин-аут).
   Осознанно отсутствуюt (украшательства, приедут позже): волны (M07),
   пузырьки, поясная рампа, режимы LiquidColor (хвост M15), кот (M05).
   Однотон (слово 05.11): одна краска — взвешенная смесь цветов напитков дня
   по зачтённым объёмам; день пуст — цвет выбранного напитка.
   Сосуд: векторный стакан (слово 05.11 «полностью в векторе»): задняя стенка
   с ручкой под водой, передняя стенка с бликами поверх; силуэт воды —
   донорский трафарет V.water["100"] (cat-vectors.js, байт-копия).
   Всё движение — transform на композиторе: DOM во время лифта не перерисовывается. */
(function (W) {
  "use strict";
  var WT_Y0 = 68, WT_Y1 = 702;   /* границы водного тела в холсте 944x766 (донор) */
  var WT_BOX_H = 766;
  var LIFT_MS = 3500;            /* донор v133/v134: длинная симметричная кривая */

  /* Донорская поверхность (тело: чаша + кот), байт-в-байт ui-kit. */
  function surface(p) {
    var q = Math.max(0, Math.min(1, Number(p) || 0));
    return WT_Y1 - q * (WT_Y1 - WT_Y0);
  }
  /* Слово владельца 05.11 (правка C-026): кота нет и сосуд не чаша — круг с
     жидкостью, отступ до краёв экрана равен А–Б. Ватерлиния честна по всей
     высоте круга: 0 — дно, 1 — верх; слой жидкости сдвигается translateY.
     Донорские surface/трафарет тела остаются в модуле про запас (M05). */
  function liftPct(p) {
    var q = Math.max(0, Math.min(1, Number(p) || 0));
    return Math.round((1 - q) * 10000) / 100;
  }
  function liftPctDonor(p) {
    return Math.round(surface(p) / WT_BOX_H * 10000) / 100;
  }
  function uri(svg) {
    return "data:image/svg+xml," + encodeURIComponent(svg).replace(/'/g, "%27");
  }
  function maskUri(clipD) {
    return uri("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 944 766'><path d='" + clipD + "' fill='#000'/></svg>");
  }
  function rgb(h) {
    var m = /^#?([0-9a-f]{6})$/i.exec(h || "");
    if (!m) return [42, 163, 232];
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function hexOf(r) {
    return "#" + r.map(function (v) { return ("0" + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2); }).join("");
  }
  /* Однотон: взвешенная смесь цветов напитков дня по зачтённым объёмам. */
  function liquidColor(state, waterMl) {
    var key = W.WT2N.waterToday(state);
    var es = (state.entries || []).filter(function (e) {
      return W.WT2J.entryDay(state, e) === key;
    });
    var acc = [0, 0, 0], sum = 0;
    es.forEach(function (e) {
      var w = Math.max(0, Number(e.credited) || 0);
      if (!w) return;
      var c = rgb(e.color);
      for (var i = 0; i < 3; i++) acc[i] += c[i] * w;
      sum += w;
    });
    if (!sum) {
      var d = (state.drinks || []).filter(function (x) { return x.id === state.profile.drinkId; })[0];
      return d ? d.color : "#2ea0ea";
    }
    return hexOf(acc.map(function (v) { return v / sum; }));
  }

  /* Однотонная вода: коробка с маской силуэта, внутри слой лифта. */
  function waterHtml(o) {
    var p = Math.max(0, Math.min(1, Number(o.frac) || 0));
    var y0 = o.liftPct != null ? Number(o.liftPct) : liftPct(p);
    var mask = orbMaskUri();
    /* M07/M08: внутренность слоя подъёма строит волновой модуль: однотон с
       гребнями ватерлинии или пояса с волнистыми стыками (слово 05.11). */
    var inner;
    if (W.WT2V && W.WT2V.enabled()) {
      inner = W.WT2V.waterInner({ belts: o.belts, color: o.color, spanPct: o.spanPct != null ? o.spanPct : 100 - y0 });
    } else if (o.rampColors && o.rampColors.length > 1 && o.rampColors.some(function (c) { return c !== o.rampColors[0]; })) {
      inner = W.WT2B.beltDiv(o.rampColors, o.spanPct != null ? o.spanPct : 100 - y0);
    } else {
      inner = '<div class="cat-flat" style="background:' + (o.color || "#2ddaf9") + '"></div>';
    }
    return '<div class="cat-water wt-orb-water' + (p <= 0.001 ? '" hidden' : '"') + '><div class="cat-water-box" style="mask-image:url(&quot;' + mask + '&quot;);-webkit-mask-image:url(&quot;' + mask + '&quot;)">' +
      '<div class="cat-waterlift" style="transform:translateY(' + y0 + '%)">' +
      inner +
      "</div></div></div>";
  }

  /* Векторный стакан: задняя стенка с ручкой (под водой) и передняя с бликами
     (поверх). Холст 944x766, как у силуета воды; стекло — полупрозрачные
     заливки и обводки, без растра. */
  /* Круг-сосуд: маска — круг в холсте 1000x1000, кольцо — векторная обводка. */
  var ORB_MASK_D = "<circle cx='500' cy='500' r='496' fill='#000'/>";
  var ORB_RING = '<svg class="cat-cup cat-orb-ring" viewBox="0 0 1000 1000" aria-hidden="true">' +
    '<circle cx="500" cy="500" r="492" fill="none" stroke="rgba(190,225,240,0.55)" stroke-width="14"/>' +
    '<path d="M212 320 C180 420 180 560 224 668" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="18" stroke-linecap="round"/>' +
    "</svg>";
  function orbMaskUri() {
    return uri("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 1000'>" + ORB_MASK_D + "</svg>");
  }

  /* Водитель лифта: видимый процент скользит к цели синусом ин-аут (донор). */
  var vis = null, tw = null, raf = null;
  function nowMs() { return window.performance && performance.now ? performance.now() : Date.now(); }
  function apply() {
    var lifts = document.querySelectorAll(".cat-art .cat-waterlift, .wt-orb .cat-waterlift");
    for (var i = 0; i < lifts.length; i++) lifts[i].style.transform = "translateY(" + vis + "%)";
    /* M08: пролёт пояса следует за видимой ватерлинией (донор applyWaterVis).
       07.11: водитель правил только .cat-beltstack (волновой режим), а
       релизный поясной слой .cat-belt оставался на высоте из разметки —
       при подъёме тело воды уезжало вверх, снизу росла пустота, пока
       чужая перерисовка не ставила высоту рывком (глаз владельца).
       Донор правит .cat-belt каждый кадр — возвращено. */
    if (W.WT2B && W.WT2B.beltSpanPct) {
      var stacks = document.querySelectorAll(".cat-art .cat-beltstack, .wt-orb .cat-beltstack, .cat-art .cat-belt, .wt-orb .cat-belt");
      var hPct = Math.round(W.WT2B.beltSpanPct(vis) * 100) / 100;
      for (var bi = 0; bi < stacks.length; bi++) stacks[bi].style.height = hPct + "%";
    }
  }
  function step() {
    raf = requestAnimationFrame(function () {
      if (!tw) { raf = null; return; }
      var pr = Math.max(0, Math.min(1, (nowMs() - tw.t0) / LIFT_MS));
      var e = 0.5 - Math.cos(Math.PI * pr) / 2;
      vis = pr >= 1 ? tw.to : tw.from + (tw.to - tw.from) * e;
      apply();
      if (pr >= 1) { tw = null; raf = null; return; }
      step();
    });
  }
  function syncTarget(frac) {
    var target = liftPct(frac);
    if (vis == null) { vis = target; apply(); return; }
    if (Math.abs(vis - target) < 0.01) { vis = target; tw = null; apply(); return; }
    tw = { from: vis, to: target, t0: nowMs() };
    if (!raf) step();
  }
  function visible() { return vis; }

  W.WT2W = {
    surface: surface,
    liftPctDonor: liftPctDonor,
    liftPct: liftPct,
    maskUri: maskUri,
    liquidColor: liquidColor,
    waterHtml: waterHtml,
    orbRing: ORB_RING,
    orbMaskUri: orbMaskUri,
    syncTarget: syncTarget,
    visible: visible,
    LIFT_MS: LIFT_MS
  };
})(window);
