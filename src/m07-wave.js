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
      var depth = Math.max(1, 2 * a * gd / 100);
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
      var baseSurf = layerBase(0) + layerAmp(0);
      for (var gx = 0; gx <= cw; gx += stp2) {
        var gy = surfY(gx, baseSurf, layerAmp(0), lam, t, 1, Math.PI * 2 / 7, 0);
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
      depthShade(baseSurf, layerAmp(0), lam, 1, Math.PI * 2 / 7, 0, topOff + spanH);
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

  var loopStarted = false;
  function startLoop() {
    if (loopStarted) return;
    loopStarted = true;
    function tick(now) {
      requestAnimationFrame(tick);
      if (document.hidden) return;
      var list = document.querySelectorAll("canvas.wt-wave-c");
      if (!list.length) return;
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
    crestPath: crestPath,
    ensureWaveKeys: ensureWaveKeys,
    waveLayer: waveLayer,
    waterInner: waterInner,
    canvasHtml: canvasHtml,
    canvasOk: canvasOk,
    canvasState: canvasState,
    kick: kick,
    params: params,
    DEF: { A: A, WV: WV, GV: GV, A_EDGE: A_EDGE, WDUR: WDUR, WDIR: WDIR, HEAD: HEAD, BOX: BOX }
  };
})(window);
