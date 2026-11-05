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
  /* Фаза M06 (контракт C-026): кота нет — сосуд только чаша (372..700 холста),
     ватерлиния честна по всей высоте чаши: 0 — дно, 1 — обод. С приездом M05
     трафарет и формула возвращаются донорские (surface), вода окутает кота. */
  var CUP_Y0 = 372, CUP_Y1 = 700;
  function surfaceCup(p) {
    var q = Math.max(0, Math.min(1, Number(p) || 0));
    return CUP_Y1 - q * (CUP_Y1 - CUP_Y0);
  }
  function liftPct(p) {
    return Math.round(surfaceCup(p) / WT_BOX_H * 10000) / 100;
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
    if (p <= 0.001) return '<div class="cat-water" hidden></div>';
    var y0 = o.liftPct != null ? Number(o.liftPct) : liftPct(p);
    var mask = maskUri(o.clipD || CUP_INNER);
    return '<div class="cat-water"><div class="cat-water-box" style="mask-image:url(&quot;' + mask + '&quot;);-webkit-mask-image:url(&quot;' + mask + '&quot;)">' +
      '<div class="cat-waterlift" style="transform:translateY(' + y0 + '%)">' +
      '<div class="cat-flat" style="background:' + (o.color || "#2ddaf9") + '"></div>' +
      "</div></div></div>";
  }

  /* Векторный стакан: задняя стенка с ручкой (под водой) и передняя с бликами
     (поверх). Холст 944x766, как у силуета воды; стекло — полупрозрачные
     заливки и обводки, без растра. */
  var CUP_INNER = "M212 372 C212 560 320 700 472 700 C624 700 732 560 732 372 Z";
  var CUP_BACK = '<svg class="cat-cup cat-cup-back" viewBox="0 0 944 766" aria-hidden="true">' +
    '<path d="M188 372 C150 372 120 402 120 440 C120 478 150 508 188 508 L212 508 L212 478 L192 478 C168 478 150 462 150 440 C150 418 168 402 192 402 L212 402 L212 372 Z" fill="rgba(150,190,210,0.30)" stroke="rgba(190,225,240,0.55)" stroke-width="10"/>' +
    '<path d="' + CUP_INNER + '" fill="rgba(140,180,205,0.22)" stroke="rgba(190,225,240,0.50)" stroke-width="12"/>' +
    '<path d="M392 700 L392 722 C392 738 428 748 472 748 C516 748 552 738 552 722 L552 700 Z" fill="rgba(140,180,205,0.30)" stroke="rgba(190,225,240,0.50)" stroke-width="10"/>' +
    "</svg>";
  var CUP_FRONT = '<svg class="cat-cup cat-cup-front" viewBox="0 0 944 766" aria-hidden="true">' +
    '<ellipse cx="472" cy="372" rx="262" ry="42" fill="rgba(200,232,246,0.20)" stroke="rgba(205,235,248,0.75)" stroke-width="12"/>' +
    '<path d="M262 420 C282 560 360 636 452 646" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="16" stroke-linecap="round"/>' +
    '<path d="M668 430 C660 520 620 588 560 620" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="12" stroke-linecap="round"/>' +
    "</svg>";

  /* Водитель лифта: видимый процент скользит к цели синусом ин-аут (донор). */
  var vis = null, tw = null, raf = null;
  function nowMs() { return window.performance && performance.now ? performance.now() : Date.now(); }
  function apply() {
    var lifts = document.querySelectorAll(".cat-art .cat-waterlift");
    for (var i = 0; i < lifts.length; i++) lifts[i].style.transform = "translateY(" + vis + "%)";
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
    surfaceCup: surfaceCup,
    liftPctDonor: liftPctDonor,
    CUP_INNER: CUP_INNER,
    liftPct: liftPct,
    maskUri: maskUri,
    liquidColor: liquidColor,
    waterHtml: waterHtml,
    cupBack: CUP_BACK,
    cupFront: CUP_FRONT,
    syncTarget: syncTarget,
    visible: visible,
    LIFT_MS: LIFT_MS
  };
})(window);
