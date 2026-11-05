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
   Папка настроек «Волна» — хвост M15; сейчас дефолты донора (a/w/g/sa/sb).
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
    var phase = (nowMs() - EPOCH) + (o.phaseOff || 0);
    var dd = dur > 0 ? phase % dur : 0;
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
    return '<div class="cat-wave wt-w' + o.i + '" style="top:' + (Math.round((o.topPct != null ? o.topPct : -HEAD / BOX * 100) * 100) / 100) +
      "%;height:" + hPct + "%;--wt-loop:-" + loopPct + "%;animation:wt-wd-" + (o.i % 5) + " " + Math.round(dur) + "ms linear infinite;animation-delay:-" + Math.round(dd) + "ms" +
      (rev ? ";animation-direction:reverse" : "") +
      ";transform:translateX(calc(var(--wt-loop, -50%) * " + F.toFixed(4) + "))" +
      (o.opac != null ? ";opacity:" + o.opac : "") + '">' +
      '<svg class="cat-wave-in" viewBox="0 0 ' + WW + " " + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="' + crest + " L" + WW + " " + Hc + " L0 " + Hc + ' Z" fill="' + (o.fill || "#2ddaf9") + '"' +
      (o.bi != null ? ' data-bi="' + o.bi + '"' : '') + ' data-wl="1"/></svg></div>';
  }

  /* Внутренность слоя подъёма: однотон с гребнями или пояса с волнистыми
     стыками. belts: [{c, from, to}] (доли объёмов, порядок M08). */
  function waterInner(o) {
    var belts = o.belts && o.belts.length ? o.belts : null;
    if (!belts) {
      var col = o.color || "#2ddaf9";
      return '<div class="cat-flat" style="background:' + col + '"></div>' +
        waveLayer({ i: 1, fill: col, opac: 0.8, close: 'box' }) +
        waveLayer({ i: 2, fill: col, opac: 0.45, close: 'box' }) +
        waveLayer({ i: 0, fill: col, close: 'box' });
    }
    var out = '<div class="cat-beltstack" style="height:' + (Math.round(Math.max(0, Number(o.spanPct) || 0) * 100) / 100) + '%">';
    var aPct = A_EDGE / BOX * 100;
    for (var k = 0; k < belts.length; k++) {
      var top = belts[k].from * 100;
      var bottom = (k + 1 < belts.length ? belts[k + 1].from * 100 : 100) + (k + 1 < belts.length ? aPct : 0);
      out += '<div class="cat-beltband" data-bi="' + k + '" style="top:' + (Math.round(top * 100) / 100) + "%;height:" +
        (Math.round((bottom - top) * 100) / 100) + "%;background:" + belts[k].c + '"></div>';
    }
    /* волнистые стыки: гребень цвета нижнего пояса на границе (слово 05.11) */
    for (var b = 0; b < belts.length - 1; b++) {
      out += waveLayer({ i: 3 + b, dur: WDUR[(3 + b) % 5], fill: belts[b + 1].c, bi: b + 1,
        topPct: belts[b + 1].from * 100 - HEAD / BOX * 100, a: A_EDGE, phaseOff: b * 1300, opac: 1, close: 'line' });
    }
    out += "</div>";
    /* гребни ватерлинии: задний, средний полупрозрачный, передний */
    out += waveLayer({ i: 1, fill: belts[0].c, opac: 0.8, close: 'line' }) +
      waveLayer({ i: 2, fill: belts[0].c, opac: 0.45, close: 'line' }) +
      waveLayer({ i: 0, fill: belts[0].c, close: 'line' });
    return out;
  }

  /* Релизный флаг (слово владельца 05.11): волна не включена в релиз до
     разбора граблей, увиданных глазом; флаг wt2-waves=1 будит модуль
     (стенды m07/m08 ставят его сами). */
  function enabled() {
    try { return window.localStorage.getItem("wt2-waves") === "1"; } catch (e) { return false; }
  }

  W.WT2V = {
    enabled: enabled,
    crestPath: crestPath,
    ensureWaveKeys: ensureWaveKeys,
    waveLayer: waveLayer,
    waterInner: waterInner,
    DEF: { A: A, WV: WV, GV: GV, A_EDGE: A_EDGE, WDUR: WDUR, WDIR: WDIR, HEAD: HEAD, BOX: BOX }
  };
})(window);
