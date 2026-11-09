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
   ТЕЛО ВОДЫ с 08.11 — Canvas 2D (слово владельца; WebGL — стендовый эталон
   в /home/user/wavelab): canvasHtml/drawCanvas ниже; SVG-рисовальщик
   (waveLayer/waterInner) сохранён аварийным запасом при недоступном canvas. */
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
    var fallback = { a: 12, w: 300, g: 238, n: 1, waves: [
      { s: 180, d: 0, o: 0, gd: 60, op: 45, intensity: 75 },
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
    /* Градиент гребня (карточка слоя): верх кромки растворяется в прозрачность.
       Фейд живёт СТРОГО внутри кромки (±a от ватерлинии) в обоих режимах:
       глубокий фейд донора (x20) в круге съедал гребень до плоской линии,
       а на WebView давал висящую полоску над водой (глаз владельца 08.11). */
    var fc = fillOf(o.fill || "#2ddaf9", o.intensity);
    var fillAttr = fc.fill, defs = "";
    var gd = Math.max(0, Math.min(100, Number(o.gd) || 0));
    if (gd > 0) {
      var gid = "wtg" + (++gradSeq);
      var gy1 = HEAD - a;
      /* Глубина фейда — как в прототипе (донор waveDiv): однотон ×20 от
         амплитуды, пояс умещается в полосу гребня ×2 и не ниже ватерлинии. */
      var depth = Math.max(1, (o.close === 'line' ? 2 : 20) * a * gd / 100);
      var gy2 = Math.min(Hc, gy1 + depth);
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

  /* Движок волны из папки (слово владельца 09.11: волна прототипа —
     второй вариант через настройки): "canvas" — холст ниже, "proto" —
     слоёные гребни waterInner/waveLayer (донор ui-kit catWater: форма
     гребня, запечённые кейфреймы дрейфа, фазы единых часов). */
  function engine() {
    try {
      var q = W.LiquidColor && W.LiquidColor.waveParams ? W.LiquidColor.waveParams() : null;
      if (q && q.engine === "proto") return "proto";
      if (q && q.engine === "webgl") return "webgl";
      return "canvas";
    } catch (e) { return "canvas"; }
  }
  /* Состояние прото-движка для стражей стенда: слои в круге и их дрейф. */
  function protoState() {
    var layers = document.querySelectorAll(".wt-orb .cat-wave");
    var anim = null;
    if (layers.length) {
      try { anim = getComputedStyle(layers[0]).animationName; } catch (e) {}
    }
    return { engine: engine(), layers: layers.length, anim: anim,
      canvas: document.querySelectorAll(".wt-orb canvas.wt-wave-c").length };
  }


  /* ===== Canvas 2D — тело воды (слово владельца 08.11: начинаем с Canvas,
     WebGL остаётся стендовым эталоном). Canvas рисует всё внутри слоя
     подъёма M06: монотон слоями, пояса полосами, плоскую воду при
     выключенном мастере папки. Поверхность — сумма трёх гармоник с
     заострением гребня (полигон wavelab), амплитуда дышит, качка — от
     скорости лифта M06 и явного kick(). Параметры — папка «Волна»
     (params() выше): a/w/g — геометрия, карточки — скорость/направление/
     смещение/градиент/прозрачность/интенсивность слоя. Цвета и пояса
     читаются у водителей M08 каждый кадр (их плавные переходы сохраняются). */
  var splash = 0, splashTarget = 0, lastVis = null;
  /* Память холста между пересозданиями DOM: цвета и доли поясов доезжают
     плавно (lerp), а не встают финалом в момент render — иначе слои
     дёргаются при добавлении/отмене порции (глаз владельца 08.11). */
  var persist = { mono: null, belts: null };
  function kick() { splashTarget = 1; }
  function toRgba(fill, alpha) {
    var c = rgbOf(fill);
    if (!c) return fill;
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + Math.max(0, Math.min(1, alpha)) + ")";
  }
  /* Поверхность: сумма гармоник, вершина острее впадины (wavelab). */
  function surfY(x, base, amp, lam, t, dirSign, omega, phase) {
    var v = (Math.sin(x / lam * Math.PI * 2 + dirSign * omega * t + phase)
      + 0.38 * Math.sin(x / (lam * 0.45) * Math.PI * 2 - dirSign * omega * 1.7 * t + phase * 2.1)
      + 0.16 * Math.sin(x / (lam * 0.19) * Math.PI * 2 + dirSign * omega * 2.9 * t + phase * 4.7)) / 1.54;
    v = 0.62 * v + 0.38 * v * v * v;
    return base + v * amp;
  }
  var cState = { mode: "none", layers: 0, flat: true, belts: 0, topVar: 0, gdDepth: 0, frame: 0 };
  function canvasState() { return cState; }

  function drawCanvas(cv2, t, dt) {
    var c = cv2._wtc || (cv2._wtc = cv2.getContext("2d"));
    if (!c) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if (!cv2._cw || (cState.frame + (cv2._ph = (cv2._ph || 0) + 1)) % 30 === 0) {
      cv2._cw = cv2.clientWidth; cv2._ch = cv2.clientHeight; cv2._shade = null;
    }
    var cw = cv2._cw, ch = cv2._ch;
    if (!cw || !ch) return;
    if (cv2.width !== Math.round(cw * dpr) || cv2.height !== Math.round(ch * dpr)) {
      cv2.width = Math.round(cw * dpr); cv2.height = Math.round(ch * dpr);
    }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, cw, ch);
    var q = params();
    var on = enabled();
    var cards = q.waves && q.waves.length ? q.waves : [];
    var n = Math.max(1, Math.min(5, Math.round(Number(q.n) || cards.length || 1)));
    var orbH = ch * 100 / 106;              /* canvas: top -3%, height 106% */
    var topOff = ch * 0.03;
    var ampPx = Math.max(0, Number(q.a) || A) / BOX * orbH;
    var lam = Math.max(24, ((Number(q.w) || WV) + (Number(q.g) || GV)) / BOX * cw);
    /* Цвета — только из data-* самого холста (единый источник: та же
       система, что дала геометрию поясов). Брать цвета по индексу из
       чужого водителя нельзя: порядок поясов у LiquidColor и M08 разный,
       цвета съезжали на соседний пояс («морс цветом кофе», 08.11).
       Плавность перекраски холст делает сам: lerp к цели каждый кадр. */
    var lerpK = 1 - Math.exp(-(dt || 0.016) / 0.45);
    var monoCol = (function () {
      var tg = rgbOf(cv2.getAttribute("data-color") || "#2ddaf9");
      if (!tg) return cv2.getAttribute("data-color") || "#2ddaf9";
      if (!persist.mono) persist.mono = tg.slice();
      for (var ci = 0; ci < 3; ci++) persist.mono[ci] += (tg[ci] - persist.mono[ci]) * lerpK;
      return "rgb(" + Math.round(persist.mono[0]) + "," + Math.round(persist.mono[1]) + "," + Math.round(persist.mono[2]) + ")";
    })();
    var belts = null;
    try { belts = JSON.parse(cv2.getAttribute("data-belts") || "null"); } catch (e) { belts = null; }
    var liveBelts = null;
    if (belts) {
      if (!persist.belts || persist.belts.length !== belts.length) {
        var prev = persist.belts || [];
        persist.belts = belts.map(function (bb, bi) {
          if (prev[bi]) return prev[bi];
          var tg0 = rgbOf(bb.c) || [128, 128, 128];
          return { c: tg0.slice(), from: bb.to, to: bb.to }; /* новый пояс растёт из своей нижней границы */
        });
      }
      belts = belts.map(function (bb, bi) {
        var cur = persist.belts[bi];
        var tg = rgbOf(bb.c);
        if (tg) for (var ci2 = 0; ci2 < 3; ci2++) cur.c[ci2] += (tg[ci2] - cur.c[ci2]) * lerpK;
        cur.from += (bb.from - cur.from) * lerpK;
        cur.to += (bb.to - cur.to) * lerpK;
        return { c: "rgb(" + Math.round(cur.c[0]) + "," + Math.round(cur.c[1]) + "," + Math.round(cur.c[2]) + ")", from: cur.from, to: cur.to };
      });
      liveBelts = belts.map(function (bb) { return bb.c; });
      cState.beltFrom = belts.map(function (bb) { return Math.round(bb.from * 1000) / 1000; });
    }
    var span = Number(cv2.getAttribute("data-span"));
    if (W.WT2W && W.WT2W.visible && W.WT2W.visible() != null && W.WT2B && W.WT2B.beltSpanPct)
      span = W.WT2B.beltSpanPct(W.WT2W.visible());
    if (!isFinite(span)) span = 100;

    function layerAmp(idx) { return ampPx * [1, 0.82, 0.66, 0.55, 0.45][Math.min(4, idx)] * (1 + 0.16 * Math.sin(t * 0.45 + idx * 1.7)) * (1 + 2.1 * splash); }
    function layerBase(idx) {
      var wv = cards[idx] || {};
      return topOff + (Number(wv.o) || 0) / 100 * orbH + layerAmp(idx) * 0 ;
    }
    /* след поверхности переднего слоя для стража и блика */
    function frontSurf(x) {
      var wv = cards[0] || {};
      var dur = WDUR[0] * 100 / Math.max(20, Number(wv.s) || 100);
      var sign = ((Number(wv.d) || 0) !== WDIR[0]) ? 1 : -1;
      return surfY(x, layerBase(0) + layerAmp(0), layerAmp(0), lam, t, sign, Math.PI * 2 / (dur / 1000), 0);
    }
    var samples = [];
    for (var sx = 0; sx <= cw; sx += Math.max(8, cw / 24)) samples.push(frontSurf(sx));
    var mean = samples.reduce(function (a2, b2) { return a2 + b2; }, 0) / samples.length;
    cState.topVar = Math.round(samples.reduce(function (a2, b2) { return a2 + (b2 - mean) * (b2 - mean); }, 0) / samples.length * 100) / 100;

    function bodyPath(base, amp, lamL, dirSign, omega, phase, bottom) {
      c.beginPath();
      var step = Math.max(2, cw / 160);
      for (var x = 0; x <= cw; x += step) {
        var y = surfY(x, base, amp, lamL, t, dirSign, omega, phase);
        if (x === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.lineTo(cw, bottom); c.lineTo(0, bottom); c.closePath();
    }
    function depthShade(base, amp, lamL, dirSign, omega, phase, bottom) {
      c.save();
      bodyPath(base, amp, lamL, dirSign, omega, phase, bottom);
      c.clip();
      if (!cv2._shade) {
        var g2 = c.createLinearGradient(0, 0, 0, ch);
        g2.addColorStop(0, "rgba(255,255,255,0.10)");
        g2.addColorStop(0.22, "rgba(255,255,255,0)");
        g2.addColorStop(1, "rgba(5,18,32,0.30)");
        cv2._shade = g2;
      }
      c.fillStyle = cv2._shade; c.fillRect(0, Math.max(0, base - amp), cw, bottom);
      c.restore();
    }
    /* Световая плёнка по гребню: в однотоне волна того же цвета, что тело,
       одним силуэтом движение почти не читается (глаз владельца 08.11:
       «если добавлять только воду, анимации волны нет»). Тонкая светлая
       полоса вдоль поверхности делает дрейф видимым, геометрию и настройки
       слоёв не меняя. */
    function crestFilm(base, amp, lamL, dirSign, omega, phase, op) {
      if (!(amp > 0)) return;
      c.save();
      c.beginPath();
      var step = Math.max(2, cw / 160);
      for (var x = 0; x <= cw; x += step) {
        var y = surfY(x, base, amp, lamL, t, dirSign, omega, phase);
        if (x === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      for (var rx = cw; rx >= 0; rx -= step)
        c.lineTo(rx, surfY(rx, base, amp, lamL, t, dirSign, omega, phase) + amp * 1.7);
      c.closePath();
      var fg = c.createLinearGradient(0, base - amp, 0, base + amp * 1.7);
      fg.addColorStop(0, "rgba(255,255,255," + (0.34 * op).toFixed(3) + ")");
      fg.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = fg;
      c.fill();
      c.restore();
    }
    function crestLight(base, amp, lamL, dirSign, omega, phase) {
      c.save();
      c.beginPath();
      var step = Math.max(2, cw / 160);
      for (var x = 0; x <= cw; x += step) {
        var y = surfY(x, base, amp, lamL, t, dirSign, omega, phase);
        if (x === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      var hg = c.createLinearGradient(0, 0, cw, 0);
      hg.addColorStop(0, "rgba(255,255,255,0)");
      hg.addColorStop(0.35, "rgba(255,255,255,0.50)");
      hg.addColorStop(0.7, "rgba(255,255,255,0.25)");
      hg.addColorStop(1, "rgba(255,255,255,0)");
      c.lineWidth = Math.max(1.2, orbH / 220); c.strokeStyle = hg; c.stroke();
      c.restore();
    }

    cState.gdDepth = 0;
    if (belts && belts.length) {
      cState.mode = "belts"; cState.belts = belts.length; cState.layers = on ? n : 0; cState.flat = !on; cState.span = Math.round(span * 100) / 100;
      var spanH = span / 100 * orbH;
      var aEdge = ampPx * 0.6;
      function seamY(x, topY, bIdx) {
        if (!on) return topY;
        return surfY(x, topY, aEdge * (1 + splash), lam, t, bIdx % 2 ? 1 : -1, Math.PI * 2 / 9, bIdx * 1.3);
      }
      /* перехода без чёткого деления, но с чистым ядром пояса (слово
         владельца 08.11 + его же глаз на розовом поясе): внутри пояса —
         свой цвет целиком; растушёвка живёт только у границы и не шире
         45% меньшего из соседних поясов, иначе малый пояс растворяется
         в соседях и «не появляется». */
      function beltRgbAt(f) {
        function colOf(k2) { return rgbOf((liveBelts && liveBelts[k2]) || belts[k2].c) || [128, 128, 128]; }
        if (q.blend === false) {
          for (var k4 = 0; k4 < belts.length; k4++) if (f <= belts[k4].to || k4 === belts.length - 1) return colOf(k4);
          return colOf(belts.length - 1);
        }
        for (var b2 = 1; b2 < belts.length; b2++) {
          var pos = belts[b2].from;
          var half = Math.min(0.12,
            0.45 * (belts[b2 - 1].to - belts[b2 - 1].from),
            0.45 * (belts[b2].to - belts[b2].from));
          if (half > 0.002 && Math.abs(f - pos) < half) {
            var u = (f - (pos - half)) / (2 * half);
            u = u * u * (3 - 2 * u);
            var cA = colOf(b2 - 1), cB = colOf(b2);
            return [0, 1, 2].map(function (ch2) { return Math.round(cA[ch2] + (cB[ch2] - cA[ch2]) * u); });
          }
        }
        for (var k3 = 0; k3 < belts.length; k3++) if (f <= belts[k3].to || k3 === belts.length - 1) return colOf(k3);
        return colOf(belts.length - 1);
      }
      c.save();
      c.beginPath();
      var stp2 = Math.max(2, cw / 160);
      /* мастер выключен — кромка поясов плоская, как в однотоне (пояса
         забывали проверку и волнились при выключенной волне, 08.11) */
      var effAmp = on ? layerAmp(0) : 0;
      var baseSurf = on ? layerBase(0) + effAmp : topOff;
      for (var gx = 0; gx <= cw; gx += stp2) {
        var gy = surfY(gx, baseSurf, effAmp, lam, t, 1, Math.PI * 2 / 7, 0);
        if (gx === 0) c.moveTo(gx, gy); else c.lineTo(gx, gy);
      }
      c.lineTo(cw, topOff + spanH); c.lineTo(0, topOff + spanH); c.closePath();
      c.clip();
      var grad = c.createLinearGradient(0, topOff, 0, topOff + spanH);
      var SAMPLES = 64;
      for (var si2 = 0; si2 <= SAMPLES; si2++) {
        var fc3 = beltRgbAt(si2 / SAMPLES);
        grad.addColorStop(si2 / SAMPLES, "rgb(" + fc3[0] + "," + fc3[1] + "," + fc3[2] + ")");
      }
      c.fillStyle = grad;
      c.fillRect(0, topOff - ampPx * 2, cw, spanH + ampPx * 2);
      c.restore();
      depthShade(baseSurf, effAmp, lam, 1, Math.PI * 2 / 7, 0, topOff + spanH);
      /* гребни ватерлинии — полоски цвета верхнего пояса */
      if (on) {
        for (var li = n - 1; li >= 0; li--) {
          var wv2 = cards[li] || {};
          var dur2 = WDUR[li % 5] * 100 / Math.max(20, Number(wv2.s) || 100);
          var sign2 = ((Number(wv2.d) || 0) !== WDIR[li % 5]) ? 1 : -1;
          var fc2 = fillOf(belts[0].c, wv2.intensity);
          var op2 = wv2.op == null ? 1 : Math.max(0, Math.min(100, Number(wv2.op))) / 100;
          var base2 = layerBase(li) + layerAmp(li), amp2 = layerAmp(li);
          c.beginPath();
          var st2 = Math.max(2, cw / 160);
          for (var lx = 0; lx <= cw; lx += st2) {
            var ly = surfY(lx, base2, amp2, lam, t, sign2, Math.PI * 2 / (dur2 / 1000), li * 2.2);
            if (lx === 0) c.moveTo(lx, ly); else c.lineTo(lx, ly);
          }
          for (var r2 = cw; r2 >= 0; r2 -= st2)
            c.lineTo(r2, surfY(r2, base2, amp2, lam, t, sign2, Math.PI * 2 / (dur2 / 1000), li * 2.2) + amp2 * 1.7);
          c.closePath();
          c.fillStyle = toRgba(fc2.fill, op2);
          c.fill();
        }
        crestLight(layerBase(0) + layerAmp(0), layerAmp(0), lam, ((Number((cards[0] || {}).d) || 0) !== WDIR[0]) ? 1 : -1, Math.PI * 2 / (WDUR[0] * 100 / Math.max(20, Number((cards[0] || {}).s) || 100) / 1000), 0);
      }
      return;
    }

    /* однотон */
    cState.mode = "mono"; cState.belts = 0;
    if (!on) {
      cState.flat = true; cState.layers = 0;
      var fbase = topOff;
      c.beginPath(); c.moveTo(0, fbase); c.lineTo(cw, fbase); c.lineTo(cw, ch); c.lineTo(0, ch); c.closePath();
      c.fillStyle = monoCol; c.fill();
      depthShade(fbase, 0, lam, 1, 1, 0, ch);
      cState.topVar = 0;
      return;
    }
    cState.flat = false; cState.layers = n;
    /* сплошное тело воды полным цветом: волна — свет и слои поверх тела,
       а не само тело (иначе однотон с карточкой 45%/75% серый и прозрачный —
       «первый напиток сероватый», глаз владельца 08.11). */
    (function () {
      var wvB = cards[0] || {};
      var durB = WDUR[0] * 100 / Math.max(20, Number(wvB.s) || 100);
      var signB = ((Number(wvB.d) || 0) !== WDIR[0]) ? 1 : -1;
      var ampB = layerAmp(0), baseB = layerBase(0) + ampB;
      bodyPath(baseB, ampB, lam, signB, Math.PI * 2 / (durB / 1000), 0, ch);
      c.fillStyle = monoCol;
      c.fill();
      depthShade(baseB, ampB, lam, signB, Math.PI * 2 / (durB / 1000), 0, ch);
    })();
    for (var idx = n - 1; idx >= 0; idx--) {
      var wv = cards[idx] || {};
      var dur = WDUR[idx % 5] * 100 / Math.max(20, Number(wv.s) || 100);
      var sign = ((Number(wv.d) || 0) !== WDIR[idx % 5]) ? 1 : -1;
      var amp = layerAmp(idx), base = layerBase(idx) + amp;
      var fc = fillOf(monoCol, wv.intensity);
      var op = wv.op == null ? 1 : Math.max(0, Math.min(100, Number(wv.op))) / 100;
      var gd = Math.max(0, Math.min(100, Number(wv.gd) || 0));
      if (gd > 0) cState.gdDepth = Math.max(cState.gdDepth, Math.round(2 * gd / 100 * 100) / 100);
      bodyPath(base, amp, lam, sign, Math.PI * 2 / (dur / 1000), idx * 2.2, ch);
      if (gd > 0 && amp > 0) {
        var gr = c.createLinearGradient(0, base - amp, 0, base - amp + 2 * amp * gd / 100);
        gr.addColorStop(0, toRgba(fc.fill, 0));
        gr.addColorStop(1, toRgba(fc.fill, op));
        c.fillStyle = gr;
      } else c.fillStyle = toRgba(fc.fill, op);
      c.fill();
      if (idx === 0) {
        depthShade(base, amp, lam, sign, Math.PI * 2 / (dur / 1000), 0, ch);
        crestFilm(base, amp, lam, sign, Math.PI * 2 / (dur / 1000), 0, Math.max(0.35, op));
        crestLight(base, amp, lam, sign, Math.PI * 2 / (dur / 1000), 0);
      }
    }
  }

  /* ===== WebGL — третий движок (слово владельца 09.11: «в запасе остался
     ещё один способ»): шейдер стенда /home/user/wavelab (тот же surfY —
     сумма трёх гармоник с заострением гребня — плюс блики, рябь-ноиз и
     свет у поверхности), перенесённый на данные приложения: параметры
     папки «Волна», пояса M08 с растушёвкой, качка лифта, выключенный
     мастер = плоская вода. WebGL недоступен — M06 падает на Canvas. */
  var GL_VS = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";
  var GL_FS = [
    "precision highp float;",
    "uniform vec2 uRes; uniform float uTime; uniform float uSplash;",
    "uniform vec3 uMono; uniform float uOn; uniform float uN; uniform float uLam;",
    "uniform float uTopOff; uniform float uSpanH; uniform float uBelts; uniform float uBeltN; uniform float uBlend;",
    "uniform vec3 uBeltCol[8]; uniform float uBeltFrom[8]; uniform float uBeltTo[8];",
    "uniform float uLAmp[5]; uniform float uLBase[5]; uniform float uLOmega[5]; uniform float uLDir[5];",
    "uniform float uLPhase[5]; uniform float uLOp[5]; uniform vec3 uLCol[5]; uniform float uLGd[5];",
    "float surf(float x, float base, float amp, float om, float dir, float ph){",
    "  float v = (sin(x / uLam * 6.28318 + dir * om * uTime + ph)",
    "    + 0.38 * sin(x / (uLam * 0.45) * 6.28318 - dir * om * 1.7 * uTime + ph * 2.1)",
    "    + 0.16 * sin(x / (uLam * 0.19) * 6.28318 + dir * om * 2.9 * uTime + ph * 4.7)) / 1.54;",
    "  v = 0.62 * v + 0.38 * v * v * v;",
    "  return base + v * amp;",
    "}",
    "float hash(vec2 q){ return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }",
    "float noise(vec2 q){ vec2 i = floor(q), f = fract(q); f = f * f * (3.0 - 2.0 * f);",
    "  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }",
    "vec3 beltAt(float f){",
    "  vec3 col = uBeltCol[0];",
    "  for (int k = 0; k < 8; k++) {",
    "    if (float(k) >= uBeltN) break;",
    "    if (f <= uBeltTo[k] || float(k) == uBeltN - 1.0) { col = uBeltCol[k]; break; }",
    "  }",
    "  if (uBlend > 0.5) {",
    "    for (int b = 1; b < 8; b++) {",
    "      if (float(b) >= uBeltN) break;",
    "      float pos = uBeltFrom[b];",
    "      float hw = min(0.12, min(0.45 * (uBeltTo[b - 1] - uBeltFrom[b - 1]), 0.45 * (uBeltTo[b] - uBeltFrom[b])));",
    "      if (hw > 0.002 && abs(f - pos) < hw) {",
    "        float u = (f - (pos - hw)) / (2.0 * hw); u = u * u * (3.0 - 2.0 * u);",
    "        col = mix(uBeltCol[b - 1], uBeltCol[b], u);",
    "      }",
    "    }",
    "  }",
    "  return col;",
    "}",
    "vec3 shade(vec3 col, float y, float surfY0){",
    "  float d = clamp((y - surfY0) / max(1.0, uRes.y), 0.0, 1.0);",
    "  col += vec3(1.0) * 0.10 * exp(-d * 9.0);",
    "  col *= 1.0 - 0.30 * smoothstep(0.05, 0.9, d);",
    "  return col;",
    "}",
    "void main(){",
    "  vec2 P = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);",
    "  float x = P.x;",
    "  float surf0 = uOn > 0.5 ? surf(x, uLBase[0], uLAmp[0], uLOmega[0], uLDir[0], uLPhase[0]) : uTopOff;",
    "  vec3 col = vec3(0.0); float inWater = 0.0;",
    "  if (P.y >= surf0) {",
    "    inWater = 1.0;",
    "    if (uBelts > 0.5) {",
    "      float f = clamp((P.y - uTopOff) / max(1.0, uSpanH), 0.0, 1.0);",
    "      col = beltAt(f);",
    "    } else col = uMono;",
    "    col = shade(col, P.y, surf0);",
    "    if (uOn > 0.5) {",
    "      for (int i = 4; i >= 0; i--) {",
    "        if (float(i) >= uN) continue;",
    "        float sy = surf(x, uLBase[i], uLAmp[i], uLOmega[i], uLDir[i], uLPhase[i]);",
    "        float dBand = P.y - sy;",
    "        if (uBelts > 0.5) {",
    "          /* пояса: только гребневая полоска поверх тела */",
    "          if (dBand >= 0.0 && dBand <= uLAmp[i] * 1.7)",
    "            col = mix(col, uLCol[i], uLOp[i]);",
    "        } else if (P.y >= sy) {",
    "          float al = uLOp[i];",
    "          if (uLGd[i] > 0.5) al *= clamp((P.y - (sy - uLAmp[i])) / max(1.0, 2.0 * uLAmp[i] * uLGd[i] / 100.0), 0.0, 1.0);",
    "          col = mix(col, uLCol[i], al);",
    "        }",
    "      }",
    "      /* световая плёнка гребня + блики/рябь стенда — только однотон */",
    "      if (uBelts < 0.5) {",
    "        float d0 = P.y - surf0;",
    "        if (d0 >= 0.0 && d0 <= uLAmp[0] * 1.7)",
    "          col += vec3(1.0) * 0.30 * max(0.35, uLOp[0]) * (1.0 - d0 / max(1.0, uLAmp[0] * 1.7));",
    "        float dl = abs(P.y - surf0);",
    "        if (dl < 2.0) col += vec3(1.0) * 0.28 * (1.0 - dl / 2.0) * pow(max(0.0, sin(3.14159 * clamp(x / uRes.x, 0.0, 1.0))), 1.5);",
    "        float deep = max(0.0, d0);",
    "        col += vec3(1.0, 0.99, 0.95) * exp(-deep / max(1.0, uRes.y * 0.10)) * 0.05;",
    "        float sparkle = noise(vec2(x * 0.045 + uTime * 0.7, P.y * 0.07 - uTime * 1.1));",
    "        col += vec3(1.0, 0.99, 0.95) * pow(sparkle, 3.0) * exp(-deep / max(1.0, uRes.y * 0.20)) * 0.14;",
    "      } else {",
    "        float dl2 = abs(P.y - surf0);",
    "        if (dl2 < 2.0) col += vec3(1.0) * 0.22 * (1.0 - dl2 / 2.0) * pow(max(0.0, sin(3.14159 * clamp(x / uRes.x, 0.0, 1.0))), 1.5);",
    "      }",
    "    }",
    "  }",
    "  if (inWater < 0.5) { gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0); return; }",
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");
  var glState = { mode: "none", layers: 0, flat: true, belts: 0, frame: 0, ok: false };
  function glOk() {
    if (glOk._v != null) return glOk._v;
    try {
      var cv3 = document.createElement("canvas");
      var g = cv3.getContext("webgl", { alpha: true, antialias: true }) || cv3.getContext("experimental-webgl");
      glOk._v = !!g;
    } catch (e) { glOk._v = false; }
    return glOk._v;
  }
  function glInit(cv2) {
    var gl = cv2.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: false });
    if (!gl) { cv2._glFail = true; return null; }
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var vs = sh(gl.VERTEX_SHADER, GL_VS), fs = sh(gl.FRAGMENT_SHADER, GL_FS);
    if (!vs || !fs) { cv2._glFail = true; return null; }
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { cv2._glFail = true; return null; }
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {};
    ["uRes", "uTime", "uSplash", "uMono", "uOn", "uN", "uLam", "uTopOff", "uSpanH", "uBelts", "uBeltN", "uBlend",
     "uBeltCol", "uBeltFrom", "uBeltTo", "uLAmp", "uLBase", "uLOmega", "uLDir", "uLPhase", "uLOp", "uLCol", "uLGd"]
      .forEach(function (nm) { U[nm] = gl.getUniformLocation(prog, nm); });
    return cv2._gl = { gl: gl, U: U };
  }
  function drawGL(cv2, t, dt) {
    var G = cv2._gl || glInit(cv2);
    if (!G) return;
    var gl = G.gl, U = G.U;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var cw = cv2.clientWidth, ch = cv2.clientHeight;
    if (!cw || !ch) return;
    if (cv2.width !== Math.round(cw * dpr) || cv2.height !== Math.round(ch * dpr)) {
      cv2.width = Math.round(cw * dpr); cv2.height = Math.round(ch * dpr);
    }
    gl.viewport(0, 0, cv2.width, cv2.height);
    var q = params();
    var on = enabled();
    var cards = q.waves && q.waves.length ? q.waves : [];
    var n = on ? Math.max(1, Math.min(5, Math.round(Number(q.n) || cards.length || 1))) : 0;
    var orbH = ch * 100 / 106;
    var topOff = ch * 0.03;
    var ampPx = Math.max(0, Number(q.a) || A) / BOX * orbH;
    var lam = Math.max(24, ((Number(q.w) || WV) + (Number(q.g) || GV)) / BOX * cw);
    var lerpK = 1 - Math.exp(-(dt || 0.016) / 0.45);
    var tg = rgbOf(cv2.getAttribute("data-color") || "#2ddaf9") || [42, 163, 232];
    if (!persist.mono) persist.mono = tg.slice();
    for (var ci = 0; ci < 3; ci++) persist.mono[ci] += (tg[ci] - persist.mono[ci]) * lerpK;
    var belts = null;
    try { belts = JSON.parse(cv2.getAttribute("data-belts") || "null"); } catch (e) { belts = null; }
    var liveBelts = null;
    if (belts) {
      if (!persist.belts || persist.belts.length !== belts.length) {
        var prev = persist.belts || [];
        persist.belts = belts.map(function (bb, bi) {
          if (prev[bi]) return prev[bi];
          var tg0 = rgbOf(bb.c) || [128, 128, 128];
          return { c: tg0.slice(), from: bb.to, to: bb.to };
        });
      }
      liveBelts = belts.map(function (bb, bi) {
        var cur = persist.belts[bi];
        var tg2 = rgbOf(bb.c);
        if (tg2) for (var ci2 = 0; ci2 < 3; ci2++) cur.c[ci2] += (tg2[ci2] - cur.c[ci2]) * lerpK;
        cur.from += (bb.from - cur.from) * lerpK;
        cur.to += (bb.to - cur.to) * lerpK;
        return { rgb: cur.c.slice(), from: cur.from, to: cur.to };
      });
    }
    var span = Number(cv2.getAttribute("data-span"));
    if (W.WT2W && W.WT2W.visible && W.WT2W.visible() != null && W.WT2B && W.WT2B.beltSpanPct)
      span = W.WT2B.beltSpanPct(W.WT2W.visible());
    if (!isFinite(span)) span = 100;
    gl.uniform2f(U.uRes, cv2.width, cv2.height);
    gl.uniform1f(U.uTime, t);
    gl.uniform1f(U.uSplash, splash);
    gl.uniform3f(U.uMono, persist.mono[0] / 255, persist.mono[1] / 255, persist.mono[2] / 255);
    gl.uniform1f(U.uOn, on ? 1 : 0);
    gl.uniform1f(U.uN, Math.max(1, n));
    gl.uniform1f(U.uLam, lam * dpr);
    gl.uniform1f(U.uTopOff, topOff * dpr);
    gl.uniform1f(U.uSpanH, span / 100 * orbH * dpr);
    gl.uniform1f(U.uBelts, liveBelts ? 1 : 0);
    gl.uniform1f(U.uBlend, q.blend === false ? 0 : 1);
    var bCol = [], bFrom = [], bTo = [];
    for (var bk = 0; bk < 8; bk++) {
      var lb = liveBelts && liveBelts[Math.min(bk, liveBelts.length - 1)];
      bCol.push(lb ? lb.rgb[0] / 255 : 0, lb ? lb.rgb[1] / 255 : 0, lb ? lb.rgb[2] / 255 : 0);
      bFrom.push(lb ? lb.from : 0); bTo.push(lb ? lb.to : 1);
    }
    gl.uniform3fv(U["uBeltCol"], bCol);
    gl.uniform1fv(U["uBeltFrom"], bFrom);
    gl.uniform1fv(U["uBeltTo"], bTo);
    gl.uniform1f(U.uBeltN, liveBelts ? liveBelts.length : 0);
    var lAmp = [], lBase = [], lOm = [], lDir = [], lPh = [], lOp = [], lCol = [], lGd = [];
    for (var li = 0; li < 5; li++) {
      var wv = cards[li] || {};
      var dur = WDUR[li % 5] * 100 / Math.max(20, Number(wv.s) || 100);
      var amp = ampPx * [1, 0.82, 0.66, 0.55, 0.45][li] * (1 + 0.16 * Math.sin(t * 0.45 + li * 1.7)) * (1 + 2.1 * splash);
      var srcCol = liveBelts ? belts[0].c : ("rgb(" + Math.round(persist.mono[0]) + "," + Math.round(persist.mono[1]) + "," + Math.round(persist.mono[2]) + ")");
      var fc = fillOf(srcCol, wv.intensity);
      var rgb = rgbOf(fc.fill) || [128, 128, 128];
      lAmp.push(amp * dpr);
      lBase.push((topOff + (Number(wv.o) || 0) / 100 * orbH + amp) * dpr);
      lOm.push(Math.PI * 2 / (dur / 1000));
      lDir.push(((Number(wv.d) || 0) !== WDIR[li % 5]) ? 1 : -1);
      lPh.push(li * 2.2);
      lOp.push(wv.op == null ? 1 : Math.max(0, Math.min(100, Number(wv.op))) / 100);
      lCol.push(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
      lGd.push(Math.max(0, Math.min(100, Number(wv.gd) || 0)));
    }
    gl.uniform1fv(U["uLAmp"], lAmp);
    gl.uniform1fv(U["uLBase"], lBase);
    gl.uniform1fv(U["uLOmega"], lOm);
    gl.uniform1fv(U["uLDir"], lDir);
    gl.uniform1fv(U["uLPhase"], lPh);
    gl.uniform1fv(U["uLOp"], lOp);
    gl.uniform3fv(U["uLCol"], lCol);
    gl.uniform1fv(U["uLGd"], lGd);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    glState.mode = liveBelts ? "belts" : "mono";
    glState.layers = n; glState.flat = !on; glState.belts = liveBelts ? liveBelts.length : 0;
    glState.ok = true; glState.frame++;
  }
  function glStateFn() { return glState; }
  function glHtml(o) {
    startLoop();
    var beltsJson = "";
    if (o.belts && o.belts.length) {
      beltsJson = ' data-belts="' + JSON.stringify(o.belts).replace(/"/g, "&quot;") + '"';
    }
    return '<canvas class="wt-wave-gl" data-color="' + (o.color || "#2ddaf9") + '"' + beltsJson +
      ' data-span="' + (o.spanPct != null ? Math.round(Number(o.spanPct) * 100) / 100 : 100) + '"></canvas>';
  }

  var loopStarted = false;
  function startLoop() {
    if (loopStarted) return;
    loopStarted = true;
    function tick(now) {
      requestAnimationFrame(tick);
      if (document.hidden) return;
      var list = document.querySelectorAll("canvas.wt-wave-c");
      var glist = document.querySelectorAll("canvas.wt-wave-gl");
      if (!list.length && !glist.length) return;
      var vis = (W.WT2W && W.WT2W.visible) ? W.WT2W.visible() : null;
      if (vis != null && lastVis != null) {
        var vel = Math.abs(vis - lastVis);
        if (vel > 0.02) splashTarget = Math.min(1, splashTarget + vel * 0.06);
      }
      if (vis != null) lastVis = vis;
      var dt = Math.min(0.05, (now - (tick._p || now)) / 1000); tick._p = now;
      splashTarget *= Math.exp(-dt / 0.85);
      if (splashTarget < 0.001) splashTarget = 0;
      splash += (splashTarget - splash) * Math.min(1, dt * 9);
      if (splash < 0.001 && !splashTarget) splash = 0;
      var t = now / 1000;
      for (var i = 0; i < list.length; i++) drawCanvas(list[i], t, dt);
      for (var gi = 0; gi < glist.length; gi++) drawGL(glist[gi], t, dt);
      cState.frame++;
    }
    requestAnimationFrame(tick);
  }
  function canvasHtml(o) {
    startLoop();
    var beltsJson = "";
    if (o.belts && o.belts.length) {
      beltsJson = ' data-belts="' + JSON.stringify(o.belts).replace(/"/g, "&quot;") + '"';
    }
    return '<canvas class="wt-wave-c" data-color="' + (o.color || "#2ddaf9") + '"' + beltsJson +
      ' data-span="' + (o.spanPct != null ? Math.round(Number(o.spanPct) * 100) / 100 : 100) + '"></canvas>';
  }
  function canvasOk() {
    try { var cv2 = document.createElement("canvas"); return !!(cv2.getContext && cv2.getContext("2d")); }
    catch (e) { return false; }
  }

  W.WT2V = {
    enabled: enabled,
    engine: engine,
    protoState: protoState,
    crestPath: crestPath,
    ensureWaveKeys: ensureWaveKeys,
    waveLayer: waveLayer,
    waterInner: waterInner,
    canvasHtml: canvasHtml,
    canvasOk: canvasOk,
    glHtml: glHtml,
    glOk: glOk,
    glState: glStateFn,
    canvasState: canvasState,
    kick: kick,
    params: params,
    DEF: { A: A, WV: WV, GV: GV, A_EDGE: A_EDGE, WDUR: WDUR, WDIR: WDIR, HEAD: HEAD, BOX: BOX }
  };
})(window);
