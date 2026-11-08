/* M07 — wave: гребни ватерлинии и волнистые границы поясов (контракт C-028,
   очередь 04.11 «волна последней», слово владельца 05.11: «заставь волниться
   и промежуточные слои»). Донор ui-kit.js как спека: wtCrestPath (квадратный
   синус), запечённые кейфреймы дрейфа wt-wd-N, фазы от единых часов,
   всё движение — translateX/translateY на композиторе.
   Чтение слова «промежуточные слои» (дефолты спеки, оспоримы словом):
   1) средний полупрозрачный гребень между задней и передней волной
      ватерлинии (opacity .45, свои фаза и скорость);
   2) границы между поясами вместо плоских смешанных стыков — волнистые:
      каждый стык живёт своим гребнем цвета нижнего пояса, амплитуда 60%
      от ватерлинии, фаза со сдвигом 1300 мс на стык, скорости чередуются.
   Папка настроек «Волна» подключена (слово владельца 08.11): мастер-тумблер,
   число слоёв, геометрия и карточки слоёв читаются из LiquidColor.waveParams();
   без модуля цвета — прежние дефолты M07.
   Вектор: только inline-SVG path; ноль растра (дух C-025). */
(function (W) {
  "use strict";
  var BOX = 1000;                 /* квадратный холст круга M06 */
  var HEAD = 24;                  /* запас сверху: гребни не срезаются (донор) */
  var A = 14, WV = 150, GV = 150; /* дефолт гребня ватерлинии (донор 10/118 @766) */
  var A_EDGE = 8;                 /* стыки поясов: 60% амплитуды (слово 05.11) */
  var WDUR = [7000, 11000, 9000, 13000, 16000];  /* донор */
  var WDIR = [0, 1, 0, 1, 0];                    /* донор */
  var EPOCH = (window.performance && performance.now) ? performance.now() : Date.now();

  /* донор wtCrestPath байт-в-байт по форме. */
  function crestPath(a, w, g, width, dy) {
    dy = dy || 0;
    var d = "M0 " + dy, x = 0;
    while (x < width - 0.5) {
      d += " Q" + (x + w / 2) + " " + (dy - a) + " " + (x + w) + " " + dy;
      x += w;
      if (x >= width - 0.5) break;
      d += " Q" + (x + g / 2) + " " + (dy + a) + " " + (x + g) + " " + dy;
      x += g;
    }
    return d;
  }
  var keyNode = null, keySig = null;
  function ensureWaveKeys(loop) {
    if (!keyNode) {
      keyNode = document.createElement("style");
      keyNode.id = "wt-wavekeys";
      (document.head || document.documentElement).appendChild(keyNode);
    }
    if (keySig !== loop) {
      keySig = loop;
      var css = "";
      for (var i = 0; i < 5; i++) {
        var even = (i % 2 === 0);
        css += "@keyframes wt-wd-" + i + "{from{transform:translateX(" + (even ? "0%" : loop) +
          ")}to{transform:translateX(" + (even ? loop : "0%") + ")}}";
      }
      keyNode.textContent = css;
    }
  }
  function nowMs() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

  /* Параметры папки «Волна» (LiquidColor — единый источник, как в доноре).
     waves[i] — карточка слоя i+1: s скорость %, d направление, o смещение %,
     gd градиент %, op прозрачность %, intensity подмес белого %. */
  function params() {
    var fallback = { a: A, w: WV, g: GV, n: 3, waves: [
      { s: 100, d: 0, o: 0, gd: 0, op: 100, intensity: 100 },
      { s: 100, d: 1, o: 0, gd: 0, op: 80, intensity: 100 },
      { s: 100, d: 0, o: 0, gd: 0, op: 45, intensity: 100 } ] };
    try {
      var q = W.LiquidColor && W.LiquidColor.waveParams ? W.LiquidColor.waveParams() : null;
      if (q && isFinite(Number(q.a)) && isFinite(Number(q.w)) && isFinite(Number(q.g))) return q;
    } catch (e) {}
    return fallback;
  }
  function rgbOf(fill) {
    var m = /^#?([0-9a-f]{6})$/i.exec(fill || "");
    if (m) { var n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(fill || "");
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
  }
  /* Интенсивность цвета слоя: 100 — полный цвет, 0 — белый (донор v120). */
  function fillOf(fill, intensity) {
    var k = Number(intensity);
    if (!isFinite(k)) k = 100;
    k = Math.max(0, Math.min(100, k)) / 100;
    if (k >= 1) return { fill: fill, k: 1 };
    var c = rgbOf(fill);
    if (!c) return { fill: fill, k: k };
    var m = c.map(function (v) { return Math.round(255 + (v - 255) * k); });
    return { fill: "rgb(" + m.join(",") + ")", k: k };
  }
  /* Фазы слоёв: смена скорости не телепортирует гребень — доля цикла слоя
     сохраняется, эпоха слоя пересчитывается под новый период. */
  var layerClock = {};
  function phaseDelay(key, dur, phaseOff) {
    var now = nowMs(), off = phaseOff || 0;
    var c = layerClock[key];
    if (!c) { c = layerClock[key] = { epoch: EPOCH, dur: dur, f: 0 }; }
    if (c.dur !== dur) { c.epoch = now - c.f * dur - off; c.dur = dur; }
    var dd = ((now - c.epoch + off) % dur + dur) % dur;
    c.f = dd / dur;
    return dd;
  }
  var gradSeq = 0;

  /* Слой-гребень: div.cat-wave (дрейф) + inline-SVG path (форма и цвет).
     i — номер слоя (кейфреймы/направление донора), dur — период, fill — цвет,
     topPct — верх слоя в % родительского бокса, opac — прозрачность,
     a — амплитуда, phaseOff — сдвиг фазы мс (стыки поясов). */
  function waveLayer(o) {
    var P = (o.w || WV) + (o.g || GV);
    var WW = 2 * BOX + 4 * P;
    var loopPct = Math.round(4 * P / WW * 10000) / 100;
    ensureWaveKeys("-" + loopPct + "%");
    var dur = o.dur != null ? o.dur : WDUR[o.i % 5];
    var rev = (o.rev != null ? o.rev : WDIR[o.i % 5] !== (o.i % 2 === 0 ? 0 : 1));
    var dd = phaseDelay(o.phaseKey || ("w" + o.i), dur, o.phaseOff || 0);
    var f = dur > 0 ? dd / dur : 0;
    var F = (((o.i % 2 === 0) !== !!rev) ? f : 1 - f);
    var a = o.a != null ? o.a : A;
    var crest = crestPath(a, o.w || WV, o.g || GV, WW, HEAD);
    /* close 'line' (поясной режим, донор v136/v137): замыкание на базовой
       линии — гребневая полоса ±a, тело не красит пояс ниже; close 'box'
       (однотон): тело до дна, как прежняя плоская заливка. */
    var line = o.close === 'line';
    var H = line ? HEAD + 2 * a : BOX + HEAD;
    var Hc = line ? HEAD : BOX + HEAD;
    var hPct = line ? Math.round(H / BOX * 1000) / 10 : 102.4;
    /* Градиент гребня (карточка слоя): верх кромки растворяется в прозрачность;
       в поясном режиме фейд не уходит ниже ватерлинии (урок донора v137). */
    var fc = fillOf(o.fill || "#2ddaf9", o.intensity);
    var fillAttr = fc.fill, defs = "";
    var gd = Math.max(0, Math.min(100, Number(o.gd) || 0));
    if (gd > 0) {
      var gid = "wtg" + (++gradSeq);
      var gy1 = HEAD - a;
      var depth = Math.max(1, (line ? 2 : 20) * a * gd / 100);
      var gy2 = line ? Math.min(Hc, gy1 + depth) : gy1 + depth;
      defs = '<defs><linearGradient id="' + gid + '" gradientUnits="userSpaceOnUse" x1="0" y1="' + gy1 +
        '" x2="0" y2="' + gy2 + '"><stop offset="0" stop-color="' + fc.fill + '" stop-opacity="0"/>' +
        '<stop offset="1" stop-color="' + fc.fill + '" stop-opacity="1"/></linearGradient></defs>';
      fillAttr = "url(#" + gid + ")";
    }
    return '<div class="cat-wave wt-w' + o.i + '" style="top:' + (Math.round((o.topPct != null ? o.topPct : -HEAD / BOX * 100) * 100) / 100) +
      "%;height:" + hPct + "%;--wt-loop:-" + loopPct + "%;animation:wt-wd-" + (o.i % 5) + " " + Math.round(dur) + "ms linear infinite;animation-delay:-" + Math.round(dd) + "ms" +
      (rev ? ";animation-direction:reverse" : "") +
      ";transform:translateX(calc(var(--wt-loop, -50%) * " + F.toFixed(4) + "))" +
      (o.opac != null ? ";opacity:" + o.opac : "") + '">' +
      '<svg class="cat-wave-in" viewBox="0 0 ' + WW + " " + H + '" preserveAspectRatio="none" aria-hidden="true">' + defs +
      '<path d="' + crest + " L" + WW + " " + Hc + " L0 " + Hc + ' Z" fill="' + fillAttr + '"' +
      (fc.k < 1 ? ' data-wtint="' + fc.k + '"' : '') +
      (o.bi != null ? ' data-bi="' + o.bi + '"' : '') + ' data-wl="1"/></svg></div>';
  }

  /* Внутренность слоя подъёма: однотон с гребнями или пояса с волнистыми
     стыками. belts: [{c, from, to}] (доли объёмов, порядок M08). */
  function waterInner(o) {
    var q = params();
    var cards = q.waves && q.waves.length ? q.waves : [];
    var n = Math.max(1, Math.min(5, Math.round(Number(q.n) || cards.length || 1)));
    function layerFor(idx, fill, close) {
      var wv = cards[idx] || {};
      var speed = Math.max(20, Number(wv.s) || 100);
      return waveLayer({ i: idx, fill: fill, close: close, phaseKey: "wl" + idx,
        a: q.a, w: q.w, g: q.g,
        dur: WDUR[idx % 5] * 100 / speed,
        rev: (Number(wv.d) || 0) !== WDIR[idx % 5],
        topPct: -HEAD / BOX * 100 + (Number(wv.o) || 0),
        opac: wv.op == null ? 1 : Math.max(0, Math.min(100, Number(wv.op))) / 100,
        gd: wv.gd, intensity: wv.intensity });
    }
    function waterline(fill, close) {
      var out = "";
      for (var idx = n - 1; idx >= 0; idx--) out += layerFor(idx, fill, close);
      return out;
    }
    var belts = o.belts && o.belts.length ? o.belts : null;
    if (!belts) {
      var col = o.color || "#2ddaf9";
      return '<div class="cat-flat" style="background:' + col + '"></div>' + waterline(col, 'box');
    }
    var out = '<div class="cat-beltstack" style="height:' + (Math.round(Math.max(0, Number(o.spanPct) || 0) * 100) / 100) + '%">';
    var aEdge = Math.max(1, (Number(q.a) || A) * 0.6);
    var aPct = aEdge / BOX * 100;
    for (var k = 0; k < belts.length; k++) {
      var top = belts[k].from * 100;
      var bottom = (k + 1 < belts.length ? belts[k + 1].from * 100 : 100) + (k + 1 < belts.length ? aPct : 0);
      out += '<div class="cat-beltband" data-bi="' + k + '" style="top:' + (Math.round(top * 100) / 100) + "%;height:" +
        (Math.round((bottom - top) * 100) / 100) + "%;background:" + belts[k].c + '"></div>';
    }
    /* волнистые стыки: гребень цвета нижнего пояса на границе (слово 05.11);
       геометрия общая с ватерлинией, амплитуда — 60% от неё. */
    for (var b = 0; b < belts.length - 1; b++) {
      out += waveLayer({ i: 3 + b, dur: WDUR[(3 + b) % 5], fill: belts[b + 1].c, bi: b + 1, phaseKey: "seam" + b,
        topPct: belts[b + 1].from * 100 - HEAD / BOX * 100, a: aEdge, w: q.w, g: q.g, phaseOff: b * 1300, opac: 1, close: 'line' });
    }
    out += "</div>";
    /* гребни ватерлинии из карточек папки (задние — первыми в разметке) */
    out += waterline(belts[0].c, 'line');
    return out;
  }

  /* Включение — мастер-тумблер папки «Волна» (слово владельца 08.11:
     папка подключена, технический флаг wt2-waves retired). */
  function enabled() {
    try { return !!(W.LiquidColor && W.LiquidColor.waveOn && W.LiquidColor.waveOn()); }
    catch (e) { return false; }
  }

  W.WT2V = {
    enabled: enabled,
    crestPath: crestPath,
    ensureWaveKeys: ensureWaveKeys,
    waveLayer: waveLayer,
    waterInner: waterInner,
    params: params,
    DEF: { A: A, WV: WV, GV: GV, A_EDGE: A_EDGE, WDUR: WDUR, WDIR: WDIR, HEAD: HEAD, BOX: BOX }
  };
})(window);
