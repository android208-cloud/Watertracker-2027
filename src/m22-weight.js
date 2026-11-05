/* M22 — weight: экран веса в скелете истории (канон второстепенных экранов,
   слово владельца 05.11, макет weight-layout v1). Линейный график веса —
   донор weightSvg как спека, одет в семью графика M11: сетка, оси, подписи.
   Периоды неделя/месяц/год, две страницы периода со свапом вперёд до сегодня
   (донор v83) живут в ui.weightRange/ui.weightAnchor композитора. */
(function (W) {
  "use strict";
  var RANGES = { week: 7, month: 30, year: 365 };
  var MONTHS = ["Янв.", "Февр.", "Мар.", "Апр.", "Май", "Июнь", "Июль", "Авг.", "Сент.", "Окт.", "Нояб.", "Дек."];
  function fmtKg(kg) { return (Math.round(Number(kg) * 10) / 10).toFixed(1); }
  function addDays(d, n) {
    var p = d.split("-").map(Number);
    var t = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
    return t.toISOString().slice(0, 10);
  }
  function windowOf(range, anchor) {
    var n = RANGES[range] || RANGES.month;
    return { from: addDays(anchor, -(n - 1)), to: anchor };
  }
  /* Линейный график: сетка 6x7, ось кг слева, подписи периода снизу,
     зелёная линия с точками по записям окна. */
  function chartSvg(ws, range, anchor) {
    var win = windowOf(range, anchor);
    var pts = (ws || []).filter(function (w) { return w.date >= win.from && w.date <= win.to; })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.createdAt || 0) - (b.createdAt || 0); });
    var Wd = 412, H = 186, L = 44, R = 8, T = 8, B = 24;
    var iw = Wd - L - R, ih = H - T - B;
    var ks = pts.map(function (p) { return Number(p.kg); });
    var mn = ks.length ? Math.floor(Math.min.apply(null, ks)) : 56;
    var mx = ks.length ? Math.ceil(Math.max.apply(null, ks)) : 61;
    if (mx - mn < 2) { mn -= 1; mx += 1; }
    var rows = 6;
    var out = '<svg viewBox="0 0 ' + Wd + " " + H + '" aria-hidden="true">';
    out += '<rect x="' + L + '" y="' + T + '" width="' + iw + '" height="' + ih + '" fill="rgba(127,127,127,0.07)"/>';
    for (var r = 0; r < rows; r++) {
      var y = T + ih * r / (rows - 1);
      var kv = mx - (mx - mn) * r / (rows - 1);
      out += '<line x1="' + L + '" y1="' + y + '" x2="' + (Wd - R) + '" y2="' + y + '" stroke="rgba(127,127,127,0.18)"/>';
      out += '<text x="' + (L - 6) + '" y="' + (y + 3) + '" fill="#9aa0a6" font-size="10" text-anchor="end">' +
        ((mx - mn) <= 5 ? kv.toFixed(1) : Math.round(kv)) + " кг</text>";
    }
    var cols = 7;
    for (var c = 0; c <= cols; c++) {
      var x = L + iw * c / cols;
      out += '<line x1="' + x + '" y1="' + T + '" x2="' + x + '" y2="' + (T + ih) + '" stroke="rgba(127,127,127,0.12)"/>';
    }
    /* подписи периода */
    var labs = [];
    if (range === "year") {
      for (var m = 0; m < 12; m++) {
        var d0 = anchor.slice(0, 5) + "01";
        for (var mm = 0; mm < 12; mm++) {
          var dd = addDays(anchor, -Math.floor(365 / 12) * (11 - mm));
          if (dd >= win.from && dd <= win.to) labs.push([dd, MONTHS[new Date(dd + "T00:00:00Z").getUTCMonth()]]);
        }
        break;
      }
      labs = labs.filter(function (x, i) { return i % 2 === 0; }).slice(0, 6);
    } else {
      var n = RANGES[range] || 30;
      for (var k = 0; k < 4; k++) {
        var dk = addDays(anchor, -Math.round((n - 1) * (1 - k / 3)));
        labs.push([dk, dk.slice(8, 10) + "." + dk.slice(5, 7)]);
      }
    }
    labs.forEach(function (lb) {
      var t = (new Date(lb[0] + "T00:00:00Z") - new Date(win.from + "T00:00:00Z")) / 86400000 / (RANGES[range] - 1);
      var x = L + iw * Math.max(0, Math.min(1, t));
      out += '<text x="' + x + '" y="' + (H - 8) + '" fill="#9aa0a6" font-size="10" text-anchor="middle">' + lb[1] + "</text>";
    });
    if (pts.length) {
      var span = Math.max(1, RANGES[range] - 1);
      var poly = pts.map(function (p) {
        var t = (new Date(p.date + "T00:00:00Z") - new Date(win.from + "T00:00:00Z")) / 86400000 / span;
        var x = L + iw * Math.max(0, Math.min(1, t));
        var y = T + ih * (mx - Number(p.kg)) / (mx - mn);
        return x.toFixed(1) + "," + y.toFixed(1);
      });
      out += '<polyline points="' + poly.join(" ") + '" fill="none" stroke="#57c465" stroke-width="3"/>';
      pts.forEach(function (p) {
        var t = (new Date(p.date + "T00:00:00Z") - new Date(win.from + "T00:00:00Z")) / 86400000 / span;
        var x = L + iw * Math.max(0, Math.min(1, t));
        var y = T + ih * (mx - Number(p.kg)) / (mx - mn);
        out += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4" fill="#57c465"/>';
      });
    } else {
      out += '<text x="' + (L + iw / 2) + '" y="' + (T + ih / 2) + '" fill="#9aa0a6" font-size="12" text-anchor="middle">Нет взвешиваний за период</text>';
    }
    out += "</svg>";
    return out;
  }
  function shiftPeriod(range, anchor, delta) {
    return addDays(anchor, -RANGES[range] * delta);
  }
  W.WT2Q = {
    RANGES: RANGES,
    fmtKg: fmtKg,
    addDays: addDays,
    windowOf: windowOf,
    chartSvg: chartSvg,
    shiftPeriod: shiftPeriod,
    rangeLabel: function (r) { return r === "week" ? "НЕДЕЛЯ" : r === "year" ? "ГОД" : "МЕСЯЦ"; }
  };
})(window);
