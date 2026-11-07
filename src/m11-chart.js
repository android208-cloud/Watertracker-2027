/* M11 chart — график истории (столбцы дня) и график веса (неделя/месяц/год).
   Контракты: C-004 (динамический масштаб: наивысший столбец видимого окна
   касается потолка — масштаб донора считается по последним пяти дням и
   нормам; память владельца 04.11), C-021 (доказательства снимками стенда).
   Перенос с донора v158 как спеки: app.js 2644–2690 (полосы цели, окно
   столбцов, распорки), 2691–2726 (colHtml: высота, остатки сегментов по
   старшинству, подписи above/on-line), 2728–2747 (дорастание окна при
   прокрутке), 2814–2941 (weekStart/monShort/shiftPeriod/weightWindow/
   weightBefore/weightDrawnKg/weightScale), 2996–3110 (weightSvg: сетка,
   линия, точки, плоский шов, подписи-пилюли), 484–490 (fmtShort/fmtKg).
   Конструктор: данные приходят из M10 (WT2S.bars), разметка строк/шапок/
   свайпов — не здесь (экраны истории и веса соберёт M10-домашка и M15);
   модуль чист: state не трогает, кроме переданного fallbackKg.
   Связи: вниз — M10, M19 (addDays); вверх — экраны истории/веса. */
(function (W) {
  "use strict";
  var L = function () { return W.WT2L; };
  var PLOT_H = 146, COL_W = 82, DATE_AREA = 36;

  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function fmtShort(iso) { return iso.slice(8, 10) + "." + iso.slice(5, 7); }
  function fmtKg(n) { return (Math.round(Number(n) * 10) / 10).toFixed(1) + " кг"; }
  function monthEnd(iso) {
    var y = Number(iso.slice(0, 4));
    var m = Number(iso.slice(5, 7));
    var d = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return iso.slice(0, 7) + "-" + pad2(d);
  }

  /* --- график истории --- */
  /* Масштаб донора (2636–2643): по последним пяти столбцам — сырой объём и
     норма; наивысший из них касается потолка (память владельца C-004). */
  function scaleOf(bars) {
    var scale = 1;
    var visFrom = Math.max(0, bars.length - 5);
    for (var vi = visFrom; vi < bars.length; vi++) {
      if (bars[vi].raw > scale) scale = bars[vi].raw;
      if (bars[vi].goal > scale) scale = bars[vi].goal;
    }
    return scale;
  }
  function goalPxOf(bar, scale) { return Math.round(bar.goal / scale * PLOT_H); }

  /* Полосы цели донора (2646–2663): прогоны одинаковых норм, слева направо,
     шаг столбца 82 px. */
  function bandsHtml(bars) {
    var runs0 = [];
    bars.forEach(function (b, i) {
      var lastr = runs0[runs0.length - 1];
      if (lastr && lastr.goal === b.goal) lastr.end = i;
      else runs0.push({ goal: b.goal, start: i, end: i });
    });
    var nAll = bars.length;
    return runs0.map(function (run) {
      var gp = goalPxOf(bars[run.start], scaleOf(bars));
      var rightCols = nAll - run.end - 1;
      var span = run.end - run.start + 1;
      var left = run.start === 0 ? "0" : "calc(100% - " + ((rightCols + span) * COL_W + 1) + "px)";
      var width = run.start === 0 ? "calc(100% - " + (rightCols * COL_W) + "px)" : ((span * COL_W) + 1) + "px";
      var h = DATE_AREA + gp;
      return '<div class="chart-below" data-goal="' + run.goal + '" style="left:' + left + ";width:" + width + ";height:" + h + 'px"></div>' +
        '<div class="goal-line" data-goal="' + run.goal + '" style="left:' + left + ";width:" + width + ";bottom:" + h + 'px"></div>';
    }).join("");
  }

  /* Столбец донора (2691–2726): минимальная высота 2, остатки пикселей
     раздаются крупнейшим сегментам, соседние сегменты перекрываются на 1 px. */
  function colHtml(b, scale, selected) {
    var goalPx = goalPxOf(b, scale);
    var px = b.raw > 0 ? Math.max(2, Math.round(b.raw / scale * PLOT_H)) : 0;
    var segs = "";
    /* «Столбцы одним цветом» (модуль chart-color): если модуль даёт цвет —
       столбец окрашивается целиком, прежняя стопка сегментов не строится.
       Модуль снят — ветка не работает вовсе (донор 2699-2702). */
    if (px && window.ChartColor && window.__waterApp) {
      var cc = ChartColor.color(window.__waterApp.state, b.date, b.goal ? b.raw / b.goal : 0);
      if (cc) segs = '<i data-raw="' + b.raw + '" style="top:0;height:' + px + 'px;background:' + cc + '"></i>';
    }
    if (px && b.segs.length && !segs) {
      var rawSum = 0;
      b.segs.forEach(function (s) { rawSum += s.raw; });
      var hs = b.segs.map(function (s) { return Math.floor(s.raw / rawSum * px); });
      var used = 0;
      hs.forEach(function (h) { used += h; });
      var rest = px - used;
      var bySize = b.segs.map(function (s, i) { return i; }).sort(function (a, c) { return b.segs[c].raw - b.segs[a].raw; });
      for (var ri = 0; rest > 0; ri++) { hs[bySize[ri % bySize.length]] += 1; rest--; }
      var top = 0;
      for (var si = 0; si < b.segs.length; si++) {
        if (hs[si] <= 0) continue;
        var extra = si < b.segs.length - 1 ? 1 : 0;
        segs += '<i data-raw="' + b.segs[si].raw + '" style="top:' + top + "px;height:" + (hs[si] + extra) + "px;background:" + b.segs[si].color + '"></i>';
        top += hs[si];
      }
    }
    var label = "";
    if (b.raw > 0 && b.raw >= b.goal) label = '<span class="bar-label above" style="bottom:' + (px + 18) + 'px">' + b.raw + "</span>";
    else if (b.raw > 0) label = '<span class="bar-label on-line" style="bottom:' + goalPx + 'px">' + b.raw + "</span>";
    return '<div class="col" data-raw="' + b.raw + '" data-goal="' + b.goal + '"><div class="plot-space" data-act="pick-day" data-date="' + b.date + '">' +
      label + (px ? '<div class="bar" style="height:' + px + 'px">' + segs + "</div>" : "") +
      '</div><button type="button" class="date-btn' + (b.date === selected ? " on" : "") + '" data-act="pick-day" data-date="' + b.date + '">' + fmtShort(b.date) + "</button></div>";
  }

  /* Начальное окно донора (2668–2677): вокруг прокрутки или выбранного дня. */
  function windowInit(bars, selected, chartLeft) {
    var n = bars.length;
    var selI = -1;
    for (var sI = 0; sI < n; sI++) if (bars[sI].date === selected) { selI = sI; break; }
    var c0 = n - 1;
    if (chartLeft != null && chartLeft > 0) c0 = Math.floor(chartLeft / COL_W) + 3;
    var from = Math.max(0, c0 - 12);
    var to = Math.min(n, c0 + 26);
    if (selI >= 0) { from = Math.min(from, selI); to = Math.max(to, selI + 1); }
    return { from: from, to: to };
  }
  /* Дорастание окна при прокрутке (2728–2747): чистая математика границ. */
  function growWindow(w, n, scrollLeft, clientWidth) {
    var v0 = Math.max(0, Math.floor(scrollLeft / COL_W) - 8);
    var v1 = Math.min(n, Math.ceil((scrollLeft + clientWidth) / COL_W) + 8);
    if (v0 >= w.from && v1 <= w.to) return null;
    return { from: Math.min(w.from, v0), to: Math.max(w.to, v1) };
  }
  function rowHtml(bars, w, scale, selected, bands) {
    var cols = "";
    for (var ci = w.from; ci < w.to; ci++) cols += colHtml(bars[ci], scale, selected);
    var leftW = w.from * COL_W;
    var rightW = (bars.length - w.to) * COL_W;
    /* Порядок важен: левая распорка, столбцы, правая (ошибка v88). */
    return (bands || "") +
      (leftW ? '<div class="chart-spacer l" style="width:' + leftW + 'px"></div>' : "") + cols +
      (rightW ? '<div class="chart-spacer r" style="width:' + rightW + 'px"></div>' : "");
  }

  /* --- график веса --- */
  function weekStart(iso) {
    var p = iso.split("-").map(Number);
    var day = new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
    return L().addDays(iso, day === 0 ? -6 : 1 - day);
  }
  function monShort(iso) {
    var names = ["янв.", "февр.", "март", "апр.", "май", "июнь", "июль", "авг.", "сен.", "окт.", "нояб.", "дек."];
    return names[Number(iso.slice(5, 7)) - 1];
  }
  function shiftPeriod(range, anchor, delta, today) {
    anchor = anchor || today;
    if (range === "year") return (Number(anchor.slice(0, 4)) + delta) + "-01-01";
    if (range === "month") {
      var y = Number(anchor.slice(0, 4));
      var m = Number(anchor.slice(5, 7)) - 1 + delta;
      var d = new Date(Date.UTC(y, m, 1));
      return d.getUTCFullYear() + "-" + pad2(d.getUTCMonth() + 1) + "-01";
    }
    return L().addDays(weekStart(anchor), delta * 7);
  }
  function weightWindow(range, anchor, today) {
    anchor = anchor || today;
    var mon = ["Янв.", "Февр.", "Март", "Апр.", "Май", "Июнь", "Июль", "Авг.", "Сен.", "Окт.", "Ноя.", "Дек."];
    var full = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
    if (range === "week") {
      var start = weekStart(anchor);
      var end = L().addDays(start, 6);
      var names = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];
      var ticks = [], lines = [];
      for (var i = 0; i < 7; i++) {
        var iso = L().addDays(start, i);
        lines.push(iso);
        ticks.push({ iso: iso, label: names[i], on: iso === today });
      }
      return { start: start, end: end,
        title: Number(start.slice(8, 10)) + " " + monShort(start) + " - " + Number(end.slice(8, 10)) + " " + monShort(end),
        under: true, ticks: ticks, lines: lines };
    }
    if (range === "year") {
      var year = anchor.slice(0, 4);
      var months = [2, 4, 6, 8, 10, 12];
      return { start: year + "-01-01", end: year + "-12-31", title: year, cells: 12, cellMode: "year",
        ticks: months.map(function (m) {
          var key = year + "-" + pad2(m);
          return { iso: key + "-15", label: mon[m - 1], on: today.slice(0, 7) === key, slot: m - 1 };
        }) };
    }
    var monthKey = anchor.slice(0, 7);
    var mStart = monthKey + "-01";
    var mEnd = monthEnd(mStart);
    var days = Number(mEnd.slice(8, 10));
    var axisMon = ["янв.", "февр.", "март", "апр.", "май", "июнь", "июл.", "авг.", "сен.", "окт.", "нояб.", "дек."];
    var mTicks = [];
    for (var day = 2; day <= days; day += 4) {
      var dayIso = monthKey + "-" + pad2(day);
      mTicks.push({ iso: dayIso, label: dayIso.slice(8, 10) + " " + axisMon[Number(monthKey.slice(5, 7)) - 1], on: dayIso === today, cell: day - 0.5 });
    }
    return { start: mStart, end: mEnd, title: full[Number(monthKey.slice(5, 7)) - 1] + " " + monthKey.slice(0, 4),
      under: true, compact: true, ticks: mTicks, cells: days, cellMode: "day" };
  }
  function weightBefore(all, date) {
    for (var i = all.length - 1; i >= 0; i--) if (all[i].date < date) return all[i];
    return null;
  }
  function weightDrawnKg(all, win, today) {
    if (today < win.start) return [];
    var until = today < win.end ? today : win.end;
    var vals = [];
    if (win.cellMode === "year") {
      var byMonth = {};
      all.forEach(function (p) {
        if (p.date < win.start || p.date > until) return;
        byMonth[p.date.slice(0, 7)] = p.kg;
      });
      Object.keys(byMonth).forEach(function (k) { vals.push(byMonth[k]); });
    } else {
      all.forEach(function (p) {
        if (p.date >= win.start && p.date <= until) vals.push(p.kg);
      });
    }
    var before = weightBefore(all, win.start);
    if (before) vals.push(before.kg);
    return vals;
  }
  /* Шкала донора (2924–2941): шаг 1/2/5, границы кратны шагу. */
  function weightScale(all, windows, today, fallbackKg) {
    var vals = [];
    windows.forEach(function (win) {
      weightDrawnKg(all, win, today).forEach(function (kg) { vals.push(kg); });
    });
    var base = vals.length ? vals[vals.length - 1] : (fallbackKg || 60);
    var lo = base, hi = base;
    vals.forEach(function (v) { lo = Math.min(lo, v); hi = Math.max(hi, v); });
    var yMin = Math.floor(lo) - 1;
    var yMax = Math.ceil(hi) + 1;
    var span = yMax - yMin;
    var step = span <= 6 ? 1 : span <= 12 ? 2 : 5;
    yMin = Math.floor(yMin / step) * step;
    yMax = Math.ceil(yMax / step) * step;
    if (yMax === yMin) yMax = yMin + step;
    return { yMin: yMin, yMax: yMax, step: step };
  }
  /* SVG донора (2996–3110): сетка, линия по точкам, плоский шов до сегодня,
     подписи-пилюли для «наших» дней. */
  function weightSvg(all, today, win, scale, fallbackKg) {
    var Wd = 412, H = 150;
    var left = 54, right = 18, top = 8, bottom = 32;
    var plotW = Wd - left - right;
    var plotH = H - top - bottom;
    if (!scale) scale = weightScale(all, [win], today, fallbackKg);
    var yMin = scale.yMin, yMax = scale.yMax, step = scale.step;
    function tOf(iso) { return new Date(iso + "T00:00:00Z").getTime(); }
    var x0 = tOf(win.start);
    var x1 = tOf(win.end);
    if (x1 <= x0) x1 = x0 + 86400000;
    function xOf(iso) {
      if (win.cells) {
        var frac;
        if (win.cellMode === "year") {
          var mm = Number(iso.slice(5, 7));
          var dd = Number(iso.slice(8, 10));
          var dim = new Date(Date.UTC(Number(iso.slice(0, 4)), mm, 0)).getUTCDate() || 30;
          frac = ((mm - 1) + (dd - 0.5) / dim) / win.cells;
        } else {
          frac = (Number(iso.slice(8, 10)) - 0.5) / win.cells;
        }
        if (frac < 0) frac = 0;
        if (frac > 1) frac = 1;
        return left + frac * plotW;
      }
      var x = left + (tOf(iso) - x0) / (x1 - x0) * plotW;
      return Math.max(left, Math.min(left + plotW, x));
    }
    function yOf(kg) { return top + (yMax - kg) / (yMax - yMin) * plotH; }
    var grid = "";
    for (var kg = yMax; kg >= yMin; kg -= step) {
      var y = yOf(kg).toFixed(1);
      grid += '<line x1="' + left + '" y1="' + y + '" x2="' + (left + plotW) + '" y2="' + y + '" stroke="var(--grid)" stroke-width="1"/>';
      grid += '<text x="' + (left - 6) + '" y="' + y + '" text-anchor="end" dominant-baseline="middle" fill="var(--text)" font-size="12">' + kg + " кг</text>";
    }
    if (win.cellMode === "year") {
      var slots = win.cells || 12;
      for (var mi = 1; mi < slots - 1; mi++) {
        var mx = (left + mi / (slots - 1) * plotW).toFixed(1);
        grid += '<line x1="' + mx + '" y1="' + top + '" x2="' + mx + '" y2="' + (top + plotH) + '" stroke="var(--grid)" stroke-width="1"/>';
      }
    } else if (win.cells) {
      for (var cell = 1; cell < win.cells; cell++) {
        var cx = (left + cell / win.cells * plotW).toFixed(1);
        grid += '<line x1="' + cx + '" y1="' + top + '" x2="' + cx + '" y2="' + (top + plotH) + '" stroke="var(--grid)" stroke-width="1"/>';
      }
    } else {
      var guides = win.lines || win.ticks.map(function (tick) { return tick.iso; });
      guides.forEach(function (iso) {
        var gx = xOf(iso).toFixed(1);
        grid += '<line x1="' + gx + '" y1="' + top + '" x2="' + gx + '" y2="' + (top + plotH) + '" stroke="var(--grid)" stroke-width="1"/>';
      });
    }
    grid += '<rect x="' + left + '" y="' + top + '" width="' + plotW + '" height="' + plotH + '" fill="none" stroke="var(--grid)" stroke-width="1"/>';
    var before = weightBefore(all, win.start);
    var line = "", dots = "";
    var until = today < win.start ? null : (today < win.end ? today : win.end);
    var pts = [], dotPts = [];
    var esc = W.WT2U ? W.WT2U.esc : function (s) { return String(s == null ? "" : s); };
    if (until) {
      if (win.cellMode === "year") {
        var byM = {};
        all.forEach(function (p) {
          if (p.date < win.start || p.date > until) return;
          byM[Number(p.date.slice(5, 7)) - 1] = p.kg;
        });
        var months = Object.keys(byM).map(Number).sort(function (a, b) { return a - b; });
        var slotN = (win.cells || 12) - 1;
        function xMonth(index) { return left + (slotN > 0 ? index / slotN : 0) * plotW; }
        if (before && (!months.length || months[0] !== 0)) pts.push({ x: xMonth(0), y: yOf(before.kg) });
        months.forEach(function (index) {
          var pt = { x: xMonth(index), y: yOf(byM[index]) };
          pts.push(pt); dotPts.push(pt);
        });
        var endMonth = today > win.end ? slotN : Math.min(slotN, Number(today.slice(5, 7)) - 1);
        if (pts.length && xMonth(endMonth) > pts[pts.length - 1].x + 0.5) pts.push({ x: xMonth(endMonth), y: pts[pts.length - 1].y });
      } else {
        var inRange = all.filter(function (p) { return p.date >= win.start && p.date <= until; });
        if (before) pts.push({ x: left, y: yOf(before.kg) });
        inRange.forEach(function (p) {
          var pt = { x: xOf(p.date), y: yOf(p.kg) };
          pts.push(pt); dotPts.push(pt);
        });
        var endX = today > win.end ? left + plotW : xOf(today);
        if (pts.length && endX > pts[pts.length - 1].x + 0.5) pts.push({ x: endX, y: pts[pts.length - 1].y });
      }
    }
    if (pts.length > 1) {
      line = '<path d="' + pts.map(function (p, i) { return (i ? "L" : "M") + p.x.toFixed(1) + " " + p.y.toFixed(1); }).join(" ") + '" fill="none" stroke="var(--green)" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>';
    }
    dots = dotPts.map(function (p) {
      return '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="4.2" fill="var(--green)"/>';
    }).join("");
    if (!line && until) {
      var flatKg = before ? before.kg : (fallbackKg || 60);
      var flatY = yOf(flatKg);
      var flatEnd = win.cellMode === "year"
        ? left + (today > win.end ? 1 : Math.min(1, (Number(today.slice(5, 7)) - 1) / ((win.cells || 12) - 1))) * plotW
        : (today > win.end ? left + plotW : xOf(today));
      line = '<path d="M' + left + " " + flatY.toFixed(1) + " L" + flatEnd.toFixed(1) + " " + flatY.toFixed(1) + '" fill="none" stroke="var(--green)" stroke-width="2.4" stroke-linecap="round"/>';
    }
    var fs = win.compact ? 10 : 12;
    var labels = win.ticks.map(function (tick) {
      var x = tick.slot != null
        ? left + tick.slot / ((win.cells || 12) - 1) * plotW
        : (tick.cell != null && win.cells ? left + tick.cell / win.cells * plotW : xOf(tick.iso));
      if (tick.on) {
        var tw = Math.max(win.compact ? 0 : 28, tick.label.length * (win.compact ? 5.2 : 7.4) + (win.compact ? 8 : 12));
        var pillH = win.compact ? 18 : 20;
        return '<rect x="' + (x - tw / 2).toFixed(1) + '" y="' + (H - 6 - pillH) + '" width="' + tw.toFixed(1) + '" height="' + pillH + '" rx="8" fill="var(--blue-fill)"/>' +
          '<text x="' + x.toFixed(1) + '" y="' + (H - 6 - pillH / 2) + '" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="' + fs + '" font-weight="650">' + esc(tick.label) + "</text>";
      }
      return '<text x="' + x.toFixed(1) + '" y="' + (H - 14) + '" text-anchor="middle" dominant-baseline="middle" fill="var(--text)" font-size="' + fs + '">' + esc(tick.label) + "</text>";
    }).join("");
    var clipId = "wc" + String(win.start).replace(/[^0-9]/g, "");
    var clip = '<defs><clipPath id="' + clipId + '"><rect x="' + (left - 2) + '" y="' + (top - 2) + '" width="' + (plotW + 4) + '" height="' + (plotH + 4) + '"/></clipPath></defs>';
    return '<svg class="wchart" viewBox="0 0 ' + Wd + " " + H + '" role="img" aria-label="График веса">' + clip + grid + '<g clip-path="url(#' + clipId + ')">' + line + dots + "</g>" + labels + "</svg>";
  }

  if (W.WT2R) W.WT2R.register({
    id: "M11", file: "m11-chart.js", layer: 4, optional: false,
    contracts: ["C-004", "C-021"],
    events: [],
    status: "ported"
  });
  W.WT2H = {
    PLOT_H: PLOT_H, COL_W: COL_W,
    scaleOf: scaleOf, goalPxOf: goalPxOf, bandsHtml: bandsHtml, colHtml: colHtml,
    windowInit: windowInit, growWindow: growWindow, rowHtml: rowHtml,
    weekStart: weekStart, shiftPeriod: shiftPeriod, weightWindow: weightWindow,
    weightScale: weightScale, weightSvg: weightSvg,
    fmtShort: fmtShort, fmtKg: fmtKg, monthEnd: monthEnd
  };
})(window);
