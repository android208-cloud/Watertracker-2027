/* M21-uikit — байт-порт донорского ui-kit.js (кубы разметки: sheet, dialog,
   optionList, swipeRow, row, checkBox, chipRow, roundBtn, drinkPickRow,
   header, clockDial, miniCup). Разметка кубиков побайтово равна донору —
   облик прежний (C-022). Модуль без зависимостей: иконки передаёт вызывающий. */
/* UI-кит «Лего», кубики первого поколения (спека docs/ui-kit-spec.md).
   Модуль без зависимостей: собирает разметку из параметров, домена не знает
   (иконки и бонусы считает app.js и передаёт готовыми). Тестируется без
   браузера: node tools/ui-kit-test.js

   Кубики этого файла:
     sheet       — общая шторка: scrim + карточка + заголовок/подзаголовок + тело;
     optionBonus — строка-вариант «выбери один» с иконкой и бонусом («+ N мл»);
     saveRow     — хвост шторки: подпись + тумблер;
     choiceSheet — sheet + список optionBonus + saveRow (близнецы «Погода»
                   и «Физическая активность» собираются одним вызовом);
     dialog      — модальное окно: scrim + карточка + h3 + тело + ряд кнопок;
     optionList  — список «выбери один» (радио-строки .freq-opt);
     noteArea    — тело диалога «заметка + необязательная textarea»;
     wheel       — один барабан чисел (data-wheel-атрибуты + пустые линии);
     wheelBlock  — рамка барабанов: барабаны, разделители, единицы;
     swipeRow    — свайп-строка: рамка .swipe + кнопки действий + фронт;
     row         — строка списка (n-row/drow-семьи), шаг 5;
     checkBox    — квадратик-кнопка настроек;
     chipRow     — ряд миллилитровых чипов (быстрый объём).
   Кубик с параметром ui ставит на корне data-ui="<кубик>.<роль>" — реестр
   элементов для будущего редактора (спека §7).

   Разметка кубиков побайтово равна исторической ручной сборке app.js:
   миграция не меняет вид ни на пиксель (доказано сверкой до/после). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); }
  else { root.UiKit = factory(); }
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* Метка реестра элементов (спека §7): data-ui="<кубик>.<роль>" на корне.
     Роль даёт вызывающий — только он знает доменное имя элемента. */
  /* v98–v100: живая вода векторного кота. p — точная доля 0..1.
     v100: вода — HTML-слой на композиторе: коробка .cat-water обрезана маской
     по силуэту тела (data-URI SVG), внутри — слой подъёма (translateY в %) и
     два гребня: div с однотонным фоном (цвет, transition для плавной смены)
     и маской-черепицей волны (repeat-x). Дрейф/подъём/всплеск — только
     transform HTML-слоев: композиторный поток, ноль перекрасок на кадр, волна
     не замирает на перерисовках основного потока. Вся геометрия в % и
     периодах черепицы — масштаб экрана не ломает бесшовность.
     Фаза дрейфа от единых часов (phaseA/phaseB) переживает перерисовку;
     скорости sa/sb (% от дефолта) дают duration инлайном.
     maskOk === false — фолбэк: прежняя SVG-вода (catWaterSvg). */
  var WT_Y0 = 68, WT_Y1 = 702; /* границы водного тела в холсте 944x766 */
  var WT_DUR_A = 7000, WT_DUR_B = 11000; /* дефолтные периоды циклов, мс */
  var WT_DEF = { a: 10, w: 118, g: 118, sa: 100, sb: 100 };
  var WT_HEAD = 24; /* запас сверху в черепице: гребни не срезаются */
  /* v118: счётчик id градиентов гребня: id глобальны на документ, а слоёв
     до пяти плюс оверлей смены цвета — каждому слою свой. */
  var wtGradSeq = 0;
  var WT_BOX_W = 944, WT_BOX_H = 766;
  function catWaterSurface(p) {
    var q = Math.max(0, Math.min(1, Number(p) || 0));
    return WT_Y1 - q * (WT_Y1 - WT_Y0);
  }
  function catWaterLiftPct(p) {
    return Math.round(catWaterSurface(p) / WT_BOX_H * 10000) / 100;
  }
  function wtClampParams(w) {
    var o = (w && typeof w === "object") ? w : {};
    function num(v, d, lo, hi) {
      var x = Math.round(Number(v != null ? v : d));
      if (!isFinite(x)) x = d;
      return Math.max(lo, Math.min(hi, x));
    }
    return {
      a: num(o.a, WT_DEF.a, 4, 24), w: num(o.w, WT_DEF.w, 60, 300),
      g: num(o.g, WT_DEF.g, 60, 300), sa: num(o.sa, WT_DEF.sa, 20, 300),
      sb: num(o.sb, WT_DEF.sb, 20, 300)
    };
  }
  /* v114: гребень без замыкания — для inline-SVG штриха и заливки. */
  function wtCrestPath(a, w, g, width, dy) {
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
  function wtWavePath(a, w, g, width, dy) {
    dy = dy || 0;
    var d = "M0 " + dy, x = 0;
    while (x < width - 0.5) {
      d += " Q" + (x + w / 2) + " " + (dy - a) + " " + (x + w) + " " + dy;
      x += w;
      if (x >= width - 0.5) break;
      d += " Q" + (x + g / 2) + " " + (dy + a) + " " + (x + g) + " " + dy;
      x += g;
    }
    return wtCrestPath(a, w, g, width, dy) + " L" + width + " " + (dy + 800) + " L0 " + (dy + 800) + " Z";
  }
  function wtUri(svg) {
    /* v101: пробелы НЕ восстанавливаем: сырые пробелы в data-URI ломают
       разбор path у растеризатора (числа слипаются); кавычки кодируем —
       data-URI живёт внутри url('...') в style="...". */
    return "data:image/svg+xml," + encodeURIComponent(svg).replace(/'/g, "%27");
  }
  /* v167: ключкадры дрейфа по слоям со ЗАПЕЧЁННЫМ значением цикла (узел
     wt-wavekeys в head, один на приложение). В @keyframes больше нет var():
     черепица cat-drift-* с var(--wt-loop) внутри кейфреймов — конструкция с
     худшей репутацией на старых WebView (слово владельца 04.11: «слой номер 1
     не анимируется»). Значения байт-в-байт те же, что были в cat-drift-*:
     чётные слои 0→loop, нечётные loop→0; reverse зеркалит, как прежде.
     Имена wt-wd-N стабильны: перерисовки стакана не рестартуют дрейф,
     текст узла переписывается только при смене ширины/зазора гребня. */
  var wtKeyNode = null, wtKeySig = "";
  function ensureWaveKeys(loop) {
    if (!wtKeyNode) {
      wtKeyNode = document.createElement("style");
      wtKeyNode.id = "wt-wavekeys";
      (document.head || document.documentElement).appendChild(wtKeyNode);
    }
    if (wtKeySig !== loop) {
      wtKeySig = loop;
      var css = "";
      for (var i = 0; i < 5; i++) {
        var even = (i % 2 === 0);
        css += "@keyframes wt-wd-" + i + "{from{transform:translateX(" + (even ? "0%" : loop) +
          ")}to{transform:translateX(" + (even ? loop : "0%") + ")}}";
      }
      wtKeyNode.textContent = css;
    }
  }
  /* Черепица гребня: один период P=w+g. v101: запас сверху зашит в path
     (dy=WT_HEAD), viewBox без отрицательных координат. Форма чёрная — для
     маски коробки не нужна; цветная — фоном волнового слоя. */
  function wtMaskUri(clipD) {
    return wtUri("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 944 766'><path d='" + clipD + "' fill='#000'/></svg>");
  }
  /* v100/v101: композиторная вода. v101: маска в стеке ОДНА (силуэт на
     коробке): вложенные маски Chromium ронял (волна становилась плоским
     прямоугольником). Гребни — цветная черепица фоном (без маски); плавная
     смена цвета v134 — водитель в app.js перекрашивает живые path. */
  /* v136: «Пояс графика» — поясная краска воды. Рампа (48 цветов сверху
     вниз) живёт слоем .cat-belt ПОД гребнями; гребни/поверхность/пузырьки
     красятся цветом ВЕРХНЕГО пояса (o.color уже он). Пролёт пояса — от
     ватерлинии до дна силуэта: beltSpan% коробки (маска) или единицы
     холста (SVG-фолбэк); водитель уровня в app.js правит его каждый кадр. */
  function beltCss(ramp) {
    return "linear-gradient(to bottom," + ramp.map(function (h, i) {
      return " " + h + " " + (Math.round(i / (ramp.length - 1) * 10000) / 100) + "%";
    }).join(",") + ")";
  }
  function beltDiv(ramp, spanPct) {
    return '<div class="cat-belt" style="height:' + (Math.round(Math.max(0, Number(spanPct) || 0) * 100) / 100) +
      "%;background:" + beltCss(ramp) + '"></div>';
  }
  function beltRect(ramp, spanU) {
    var gid = "wtbelt" + (wtGradSeq++);
    var y2 = Math.round(Math.max(1, Number(spanU) || 1) * 10) / 10;
    var stops = ramp.map(function (h, i) {
      return '<stop offset="' + (Math.round(i / (ramp.length - 1) * 1000) / 1000) + '" stop-color="' + h + '"/>';
    }).join("");
    return '<defs><linearGradient id="' + gid + '" data-beltgrad="1" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="' + y2 + '">' +
      stops + '</linearGradient></defs>' +
      '<rect class="cat-beltrect" x="0" y="0" width="944" height="' + y2 + '" fill="url(#' + gid + ')"/>';
  }
  function catWater(o) {
    o = o || {};
    if (o.maskOk === false) return catWaterSvg(o);
    var p = Math.max(0, Math.min(1, Number(o.p) || 0));
    var color = typeof o.color === "string" ? o.color : "#2ddaf9";
    /* v136: непустая рампа = поясная краска; плоская/пустая — прежний однотон
       (разметка байт-в-байт). */
    var ramp = (o.ramp && o.ramp.length > 1) ? o.ramp : null;
    if (ramp && ramp.every(function (h) { return h === ramp[0]; })) ramp = null;
    if (p <= 0.001) return '<div class="cat-water" hidden></div>';
    var q = o.wave === false ? null : wtClampParams(o.wave === true ? null : o.wave);
    var lp = catWaterLiftPct(p);
    var y0 = lp;
    /* v134: узел стартует с ВИДИМОГО процента лифта (водитель в app.js). */
    if (o.liftPct != null) y0 = Number(o.liftPct);
    var beltSpan = o.beltSpan != null ? Number(o.beltSpan) : Math.max(0, catWaterLiftPct(0.0001) - (o.liftPct != null ? Number(o.liftPct) : lp));
    var inner;
    if (!q) {
      inner = ramp
        ? beltDiv(ramp, beltSpan)
        : '<div class="cat-flat" style="background:' + color + '"></div>';
    } else {
      var P = q.w + q.g;
      /* v114: волна = inline-SVG path во всю ширину слоя + запас на цикл
         дрейфа. Никаких фонов и черепицы: путь и трансформ живут в любом
         движке, включая старые WebView (A10 владельца). */
      var WW = 2 * WT_BOX_W + 4 * P;
      var widthPct = Math.round(WW / (2 * WT_BOX_W) * 10000) / 100;
      var crestD = wtCrestPath(q.a, q.w, q.g, WW, WT_HEAD);
      /* v136: в поясном режиме тело воды красит .cat-belt под гребнями —
         волновой слой замыкается на базовой линии (полоса гребня).
         v137-фикс: замыкаем точно на ЭКРАННОЙ ватерлинии с учётом
         вертикального смещения слоя: замыкание «в своих» координатах при
         отрицательном смещении оставляло белую щель между низом задней
         волны и гребнем передней («белый слой между волнами»: в однотоне
         щель прятало тело до дна, в поясе — нет). Ниже ватерлинии заливка
         лежит поверх пояса того же цвета и невидима. */
      /* v137-фикс: замыкание каждой волны садится точно на экранную
         ватерлинию: смещение слоя (o, % коробки) и CSS-трансформ внутренней
         svg (.cat-wave-b-in: translate -1.044%, scaleY 1.4 — зеркалим
         константами) уводили низ задней волны выше ватерлинии, и при
         малой амплитуде между ней и гребнем передней белело тело кота
         («белый слой между волнами»; в однотоне щель прятало тело до дна).
         Ниже ватерлинии заливка лежит поверх пояса того же цвета и невидима. */
      var B_IN_TY = Math.round(0.01044 * (800 + WT_HEAD) * 1000) / 1000; /* ≈8.6 единиц */
      var bodyYOf = function (i) {
        if (!ramp) return 800 + WT_HEAD;
        var ov = (Number(WL[i].o) || 0) * WT_BOX_H / 100; /* % коробки → единицы холста */
        /* Заднюю волну считаем без scaleY: тогда замыкание приходится точно
           на ватерлинию в движках, где трансформ внутренней svg лежит
           иначе ( WebView владельца: белый зазор между волнами), а в
           Chromium с scaleY 1.4 хвост уйдёт НИЖЕ ватерлинии — поверх пояса
           того же цвета он невидим. */
        return i === 1
          ? Math.round((WT_HEAD + B_IN_TY - ov) * 100) / 100
          : WT_HEAD - ov;
      };
      var headTop = -Math.round(WT_HEAD / WT_BOX_H * 10000) / 100;
      var loopPct = Math.round(4 * P / (2 * WT_BOX_W) * 10000) / 100; /* % ширины слоя (200%) */
      ensureWaveKeys("-" + loopPct + "%"); /* v167: запечённые кейфреймы дрейфа */
      var phA = Math.max(0, Number(o.phaseA) || 0), phB = Math.max(0, Number(o.phaseB) || 0);
      /* v117: до пяти волн. Карточка волны: скорость, направление (0 влево,
         1 вправо), смещение по вертикали. База направлений чередуется, как
         ключкадры a/b; дефолт двух волн байтово равен выпуску v116. */
      var WL = (o.wave && o.wave.waves && o.wave.waves.length)
        ? o.wave.waves.slice(0, 5)
        : [{ s: q.sa, d: 0, o: 0 }, { s: q.sb, d: 1, o: 0 }];
      var WCLS = [["cat-wave-a", "cat-wave-a-in"], ["cat-wave-b", "cat-wave-b-in"],
        ["cat-wave-c", "cat-wave-c-in"], ["cat-wave-d", "cat-wave-d-in"], ["cat-wave-e", "cat-wave-e-in"]];
      var WDUR = [WT_DUR_A, WT_DUR_B, 9000, 13000, 16000];
      var WDIR = [0, 1, 0, 1, 0];
      var waveCss = function (dur, delay, top, rev, i) {
        /* v134: новый узел до первого тика анимации стоит на инлайн-позиции
           фазы — иначе гребень на один кадр прыгает в ноль при перерисовке.
           Тип ключкадров: чётные слои (a,c,e) едут 0→loop, нечётные loop→0;
           reverse зеркалит. F — доля пройденного пути к инлайн-трансформу. */
        /* v167: фаза сжата по модулю цикла: отрицательный delay раньше рос с
           аптаймом (часы дрейфа стартуют при запуске приложения — на устройстве
           владельца это часы/сутки), мелкие движки на огромных delay спотыкаются;
           видимая фаза цикла от модуля не меняется. */
        var dd = dur > 0 ? delay % dur : 0;
        var f = dur > 0 ? dd / dur : 0;
        var F = ((i % 2 === 0) !== !!rev) ? f : 1 - f;
        /* v167: дрейф от запечённых кейфреймов wt-wd-N (узел wt-wavekeys):
           var() из @keyframes ушёл полностью. delay/direction — инлайном. */
        var drift = "animation:wt-wd-" + i + " " + Math.round(dur) + "ms linear infinite;animation-delay:-" + Math.round(dd) + "ms" +
            (rev ? ";animation-direction:reverse" : "");
        return "top:" + top + "%;--wt-loop:-" + loopPct + "%;" + drift +
          ";transform:translateX(calc(var(--wt-loop, -50%) * " + F.toFixed(4) + "))";
      };
      /* v118: градиент гребня в прозрачность: vertical linearGradient от
         верха гребня (24−a) вниз на глубину 2a·gd/100; ниже — полный цвет
         (spread pad). gd=0 — заливка сплошная, разметка байтово прежняя.
         Градиент печётся в растр слоя один раз: дрейф на композиторе живёт. */
      function waveDiv(i, dur, delay, fill, extraCls, top, rev, intK) {
        var defs = "", fillAttr = fill;
        /* v119: градиент свой у каждой волны; глубина x10 против v118
           (владелец: «почти не видим, расширь границы в 10 раз»). */
        var gd = Math.max(0, Math.min(100, Number(WL[i].gd) || 0));
        /* v120: прозрачность слоя живёт на svg: оверлей плавной смены цвета
           трогает opacity внешнего div, конфликта нет. 100 = без стиля. */
        /* v121-фикс: ноль — законное значение (0 — невидимая волна),
           поэтому не «|| 100», а явная проверка числа. */
        var opV = Number(WL[i].op);
        if (!isFinite(opV)) opV = 100;
        var op = Math.max(0, Math.min(100, opV));
        var opCss = op >= 100 ? "" : ";opacity:" + (Math.round(op) / 100);
        if (gd > 0) {
          /* v136: однотон — глубина x10 (v119, тело того же цвета);
             пояс — градиент умещается в полосу гребня (2a). */
          var depth = Math.max(1, Math.round((ramp ? 2 : 20) * q.a * gd / 100));
          var gy1 = WT_HEAD - q.a;
          /* v137-фикс: в поясе фейд гребня не должен обрезаться базовой
             линией: хвост градиента ниже y=WT_HEAD оставлял полупрозрачную
             полосу на стыке гребня и пояса — сквозь неё белело тело кота
             («белый слой между волнами»). Фейд завершается не ниже
             ватерлинии; ниже заливка непрозрачна поверх пояса того же цвета. */
          var gy2 = ramp ? Math.min(bodyYOf(i), gy1 + depth) : gy1 + depth;
          var gid = "wtg" + (wtGradSeq++);
          defs = '<defs><linearGradient id="' + gid + '" gradientUnits="userSpaceOnUse" x1="0" y1="' + gy1 +
            '" x2="0" y2="' + gy2 + '"><stop offset="0" stop-color="' + fill + '" stop-opacity="0"/>' +
            '<stop offset="1" stop-color="' + fill + '" stop-opacity="1"/></linearGradient></defs>';
          fillAttr = "url(#" + gid + ")";
        }
        /* v168 (слово «Б»): в однотоне замыкание УХОДИТ НА ДНО слоя: прежняя
         линия замыкания по ватерлинии резала нижнюю полуволну синусоиды
         (впадины заливались тем же цветом выше кромки — «срезана нижняя
         часть синусоиды», слово владельца 04.11). В поясном режиме замыкание
         остаётся на ватерлинии: ниже живёт пояс, а впадины открывает его
         волнистый верх (waveBeltDiv). */
      var bodyY = ramp ? bodyYOf(i) : (800 + WT_HEAD);
      var fillD = crestD + " L" + WW + " " + bodyY + " L0 " + bodyY + " Z";
        return '<div class="cat-wave ' + WCLS[i][0] + (extraCls || "") + '" style="' + waveCss(dur, delay, top, rev, i) + '">' +
          '<svg class="cat-wave-in ' + WCLS[i][1] + '" style="width:' + widthPct + '%' + opCss + '" viewBox="0 0 ' + WW + " " +
          (800 + WT_HEAD) + '" preserveAspectRatio="none" aria-hidden="true">' + defs +
          '<path d="' + fillD + '" fill="' + fillAttr + '" data-wtint="' + (isFinite(intK) ? intK : 1) + '"/></svg></div>';
      }
      /* v120: интенсивность цвета волны: 100 = полный цвет напитка, ниже —
         подмес белого (автоосветление задних волн v117 ушло: у каждой волны
         своя настройка). 100 отдаём строкой цвета байтово как раньше. */
      /* v121-фикс: ноль интенсивности — законное значение (0 — белая волна),
         «|| 100» его проглатывал. v134: k дублируем в data-wtint path —
         водитель цвета перекрашивает живые узлы с тем же подмесом белого. */
      var intOf = function (i) {
        var iv = Number(WL[i].intensity);
        if (!isFinite(iv)) iv = 100;
        return Math.max(0, Math.min(100, iv)) / 100;
      };
      var fillOf = function (base, i) {
        var k = intOf(i);
        return k >= 1 ? base : wtMixHex("#ffffff", base, k);
      };
      var phOf = function (i) { return i === 0 ? phA : i === 1 ? phB : phA + i * 1300; };
      var topOf = function (w) {
        return w.o ? Math.round((headTop + w.o) * 100) / 100 : headTop;
      };
      /* v134: оверлея cat-wave-fade больше нет: плавную смену цвета ведёт
         водитель в app.js, перекрашивая живые path (узлы не пересоздаются —
         дрейф не рестартует, гребень не телепортирует). */
      /* v168 (слово «Б»): волнистый верх пояса. Прямой верх пояса красил
         впадины волны 1 своим цветом, и синусоида обрезалась по ватерлинии;
         теперь поясной слой носит ТОТ же гребень, что волна 1 (те же
         кейфреймы, длительность, фаза, направление, смещение), и кромка
         воды — полная синусоида: гребни над ватерлинией, впадины под ней.
         Градиент пояса прежний (data-beltgrad); водитель в app.js правит
         y2 с учётом data-beltdy и стопы. */
      function waveBeltDiv(ramp, spanPct) {
        var spanU = Math.max(1, Math.round(spanPct / 100 * WT_BOX_H));
        var gid = "wtb" + (wtGradSeq++);
        var stops = ramp.map(function (h, i) {
          return '<stop offset="' + (Math.round(i / (ramp.length - 1) * 1000) / 1000) + '" stop-color="' + h + '"/>';
        }).join("");
        var d0 = WDUR[0] / ((WL[0].s || 100) / 100);
        return '<div class="cat-wave cat-beltwave" style="' +
          waveCss(d0, phOf(0), topOf(WL[0]), WL[0].d !== WDIR[0], 0) + '">' +
          '<svg class="cat-wave-in" style="width:' + widthPct + '%" viewBox="0 0 ' + WW + " " +
          (800 + WT_HEAD) + '" preserveAspectRatio="none" aria-hidden="true">' +
          '<defs><linearGradient id="' + gid + '" data-beltgrad="1" data-beltdy="' + WT_HEAD +
          '" gradientUnits="userSpaceOnUse" x1="0" y1="' + WT_HEAD + '" x2="0" y2="' + (WT_HEAD + spanU) + '">' +
          stops + '</linearGradient></defs>' +
          '<path d="' + crestD + " L" + WW + " " + (800 + WT_HEAD) + " L0 " + (800 + WT_HEAD) +
          ' Z" fill="url(#' + gid + ')"/></svg></div>';
      }
      inner = ramp ? (q ? waveBeltDiv(ramp, beltSpan) : beltDiv(ramp, beltSpan)) : "";
      for (var wi2 = WL.length - 1; wi2 >= 0; wi2--) {
        inner += waveDiv(wi2, WDUR[wi2] / (WL[wi2].s / 100), phOf(wi2), fillOf(color, wi2), "", topOf(WL[wi2]), WL[wi2].d !== WDIR[wi2], intOf(wi2));
      }
    }
    var maskUri = wtMaskUri(o.clipD || "");
    return '<div class="cat-water cat-water-box" data-wp="' + Math.round(p * 100) + '" style="mask-image:url(&quot;' +
      maskUri + '&quot;);-webkit-mask-image:url(&quot;' + maskUri + '&quot;)">' +
      '<div class="cat-waterlift" data-lift-to="' + lp + '%" style="transform:translateY(' + y0 + '%)">' +
      inner + "</div></div>";
  }

  /* v101: штрих-линия воды ПОВЕРХ морды: на высоких уровнях ватерлиния
     прячется под полупрозрачной головой PNG-тела — штрих в фазе волны
     возвращает ей видимость (верх, бока). Белый блик 85%, без маски цвета. */
  /* v116: пузырьки без пересоздания слоя. Сигнатура = всё, чему нужна
     пересборка (маска, число, размер, скорость, старт, прозрачность, цвет,
     клип); уровень и фаза в сигнатуру НЕ входят — они правятся на месте. */
  /* v117: осветление задних волн, чтобы веер слоёв читался отдельными
     гребнями; при двух волнах не применяется (вид v116). */
  function wtMixHex(c1, c2, t) {
    var a = wtRgb(c1), b = wtRgb(c2), out = [];
    for (var i = 0; i < 3; i++) out.push(Math.round(a[i] + (b[i] - a[i]) * t));
    return "rgb(" + out.join(",") + ")";
  }
  function catBubblesSig(o) {
    o = o || {};
    var q = btClampParams(o.bubble);
    /* v116: цвет НЕ входит: его правим inplace (фейд цвета напитка не
       должен пересоздавать слой). */
    return [o.maskOk === false ? 0 : 1, q.n, q.s, q.v, q.st, q.x, q.t,
      o.clipD || ""].join("|");
  }
  /* v116: только геометрия колонн (верх/высота от уровня) — узлы и градиенты
     не трогаем, растер не повторяется. */
  function wtBubGrad(color) {
    var rgb = wtRgb(color || "#ffffff");
    return "radial-gradient(circle at 35% 30%, rgba(" + rgb.join(",") + ",1), rgba(" + rgb.join(",") + ",.4) 62%, rgba(" + rgb.join(",") + ",.13))";
  }
  function catBubblesRestyle(el, o) {
    if (!el || !el.querySelectorAll) return el;
    var p = Math.max(0, Math.min(1, Number(o && o.p) || 0));
    var q = btClampParams(o && o.bubble);
    /* v134: колонны стартуют от ВИДИМОЙ ватерлинии (водитель уровня может
       быть посреди подъёма) — явный liftPct важнее целевого p. */
    var y2 = o && o.liftPct != null && isFinite(Number(o.liftPct)) ? Number(o.liftPct) : catWaterLiftPct(p);
    var y1 = y2 + (97 - y2) * q.st / 100;
    if (p <= 0.001 || y1 - y2 < 3) { el.style.display = "none"; return el; }
    el.style.display = "";
    var grad = wtBubGrad(o.color);
    var op = Math.round(100 - q.t) / 100;
    var cols = el.querySelectorAll(".cat-bub-col");
    for (var i = 0; i < cols.length; i++) {
      cols[i].style.top = (Math.round(y2 * 100) / 100) + "%";
      cols[i].style.height = (Math.round((y1 - y2) * 100) / 100) + "%";
    }
    var bs = el.querySelectorAll(".cat-bub");
    for (var j = 0; j < bs.length; j++) {
      bs[j].style.background = grad;
      bs[j].style.opacity = op;
    }
    return el;
  }
  /* v116: после переноса узла в новый слот анимация стартует заново —
     отрицательная задержка из текущей фазы делает старт бесшовным. */
  function catBubblesPhase(el, phase) {
    if (!el || !el.querySelectorAll) return el;
    var ph = Math.max(0, Number(phase) || 0);
    var mv = el.querySelectorAll(".cat-bub-mover");
    for (var i = 0; i < mv.length; i++) {
      var dur = parseFloat(mv[i].style.animationDuration) || 6000;
      mv[i].style.animationDelay = -Math.round((ph + i * 900) % dur) + "ms";
    }
    return el;
  }

  /* v102 прототип: пузырьки. Колонна = путь от линии старта до ватерлинии;
     мувер плывёт translateY(100%→0) своего роста (композитор), пузырёк
     покачивается и целиком гаснет на линии. Старт — несколько по центру
     (джиттер мал); линия старта и состав — из настроек. Будущее: эффект
     переполнения (идея владельца). */
  var BT_DEF = { n: 5, s: 8, v: 100, st: 85, x: 50, t: 25 };
  var BT_JX = [-6, 5, -2, 8, 0, -9, 3, 6, -4, 2, -7, 9, -1, 4];
  var BT_JZ = [1, 0.8, 1.15, 0.9, 1.05, 0.75, 1.2, 0.95, 0.85, 1.1, 0.8, 1.25, 0.9, 1];
  var BT_JD = [1, 1.2, 0.85, 1.1, 0.95, 1.3, 0.9, 1.15, 1.05, 0.8, 1.25, 0.88, 1.02, 1.18];
  function wtRgb(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
    if (!m) return [255, 255, 255];
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function btClampParams(q) {
    q = q || {};
    var d = BT_DEF;
    function num(v, lo, hi, df) {
      v = Math.round(Number(v));
      if (!isFinite(v)) v = df;
      return Math.max(lo, Math.min(hi, v));
    }
    /* v103: размер до 70 (x5 по просьбе владельца, для теста); x — горизонталь. */
    /* v104: t — прозрачность 0..100 (0 — непрозрачные, деф 25 = вид прототипа). */
    return { n: num(q.n, 0, 14, d.n), s: num(q.s, 4, 70, d.s), v: num(q.v, 50, 200, d.v), st: num(q.st, 10, 100, d.st), x: num(q.x, 0, 100, d.x), t: num(q.t, 0, 100, d.t) };
  }
  function catBubbles(o) {
    o = o || {};
    if (o.maskOk === false) return "";
    var p = Math.max(0, Math.min(1, Number(o.p) || 0));
    if (p <= 0.001) return "";
    var q = btClampParams(o.bubble);
    if (q.n <= 0) return "";
    var y2 = catWaterLiftPct(p);
    var y1 = y2 + (97 - y2) * q.st / 100;
    if (y1 - y2 < 3) return "";
    var phase = Math.max(0, Number(o.phase) || 0);
    var cols = "";
    for (var i = 0; i < q.n; i++) {
      var k = i % 14;
      var wu = q.s * BT_JZ[k];
      var wPct = Math.round(wu / WT_BOX_W * 10000) / 100;
      var left = Math.round((q.x + BT_JX[k] - wu / WT_BOX_W * 100 / 2) * 100) / 100;
      var dur = Math.round(6000 / (q.v / 100) * BT_JD[k]);
      var delay = -Math.round((phase + i * 900) % dur);
      var sway = 1600 + i * 130;
      /* v104: прозрачность ползунком; цвет — белый или осветлённый напиток. */
      var op = Math.round((100 - q.t)) / 100;
      var grad = wtBubGrad(o.color);
      cols += '<div class="cat-bub-col" style="left:' + left + "%;width:" + wPct + "%;top:" +
        (Math.round(y2 * 100) / 100) + "%;height:" + (Math.round((y1 - y2) * 100) / 100) + '%">' +
        '<div class="cat-bub-mover" style="animation-duration:' + dur + "ms;animation-delay:" + delay + 'ms">' +
        '<div class="cat-bub" style="animation-duration:' + sway + "ms;animation-delay:-" + (i * 271) + "ms;opacity:" + op + ";background:" + grad + '"></div></div></div>';
    }
    var maskUri = wtMaskUri(o.clipD || "");
    return '<div class="cat-bubbles" style="mask-image:url(&quot;' + maskUri + '&quot;);-webkit-mask-image:url(&quot;' + maskUri + '&quot;)">' + cols + "</div>";
  }

  /* Фолбэк v98/v99: SVG-вода (для WebView без mask-image). */
  function catWaterSvg(o) {
    o = o || {};
    var p = Math.max(0, Math.min(1, Number(o.p) || 0));
    var color = typeof o.color === "string" ? o.color : "#2ddaf9";
    if (p <= 0.001) return '<svg class="cat-water cat-water-svg" viewBox="0 0 944 766" hidden aria-hidden="true"></svg>';
    var sy = catWaterSurface(p).toFixed(1);
    var y0 = sy;
    if (o.liftFrom != null) y0 = catWaterSurface(Math.max(0, Math.min(1, Number(o.liftFrom) || 0))).toFixed(1);
    /* v136: поясная рампа — SVG-градиент (фолбэк без mask-image); пролёт —
       от ватерлинии (0 в координатах лифта) до дна силуэта. */
    var ramp = (o.ramp && o.ramp.length > 1) ? o.ramp : null;
    if (ramp && ramp.every(function (h) { return h === ramp[0]; })) ramp = null;
    var spanU = ramp ? Math.max(1, catWaterSurface(0.0001) - Number(y0)) : 0;
    var inner;
    if (o.wave === false) {
      inner = ramp
        ? beltRect(ramp, spanU)
        : '<rect x="0" y="0" width="944" height="800" fill="' + color + '"/>';
    } else {
      var q = wtClampParams(o.wave === true ? null : o.wave);
      var P = q.w + q.g, loop = 4 * P;
      var width = Math.ceil((944 + loop) / P) * P;
      var d = ramp
        ? wtCrestPath(q.a, q.w, q.g, width, 0) + " L" + width + " 0 L0 0 Z"
        : wtWavePath(q.a, q.w, q.g, width);
      /* v137-фикс: в поясе задняя волна замыкается точно на ватерлинии
         (подъём -(a+6) оставлял белую щель между гребнями: однотонное тело
         её прятало, пояс — нет). Обратный масштаб translate: 1.4 от y_c
         минус (a+6) = 0. */
      var dBclose = ramp ? Math.round((q.a + 6) / 1.4 * 10) / 10 : 0;
      var dB = ramp
        ? wtCrestPath(q.a, q.w, q.g, width, 0) + " L" + width + " " + dBclose + " L0 " + dBclose + " Z"
        : d;
      var dAd = WT_DUR_A / (q.sa / 100), dBd = WT_DUR_B / (q.sb / 100);
      var phA = Math.max(0, Number(o.phaseA) || 0), phB = Math.max(0, Number(o.phaseB) || 0);
      inner = (ramp ? beltRect(ramp, spanU) : "") +
        '<g class="cat-wave cat-wave-b" style="--wt-loop:-' + loop + "px;animation-duration:" + Math.round(dBd) + "ms;animation-delay:-" + Math.round(phB % dBd) + 'ms"><g transform="translate(' + (q.w / 2) + ',-' + (q.a + 6) + ') scale(1,1.4)"><path d="' + dB + '" fill="' + color + '" fill-opacity="0.55"/></g></g>' +
        '<g class="cat-wave cat-wave-a" style="--wt-loop:-' + loop + "px;animation-duration:" + Math.round(dAd) + "ms;animation-delay:-" + Math.round(phA % dAd) + 'ms"><path d="' + d + '" fill="' + color + '"/></g>';
    }
    return '<svg class="cat-water cat-water-svg" viewBox="0 0 944 766" aria-hidden="true" data-wp="' + Math.round(p * 100) + '">' +
      '<clipPath id="catWaterClip"><path d="' + (o.clipD || "") + '"/></clipPath>' +
      '<g clip-path="url(#catWaterClip)"><g class="cat-waterlift" data-lift-to="' + sy + 'px" style="transform: translateY(' + y0 + 'px)">' +
      inner + "</g></g></svg>";
  }

  function uiAttr(name, o) {
    return o && o.ui ? ' data-ui="' + name + '.' + o.ui + '"' : '';
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* Строка-вариант с иконкой и бонусом: ода кнопка, выбранность — класс on.
     o = { v, label, icon?, bonus } */
  function optionBonus(o, pickAct, current, ui) {
    return '<button type="button" class="wrow' + (current === o.v ? " on" : "") +
      '" data-act="' + pickAct + '" data-level="' + o.v + '"' + uiAttr("optbonus", { ui: ui }) + '>' +
      (o.icon || "") + '<span class="nm">' + esc(o.label) + "</span>" +
      '<span class="plus">+ ' + o.bonus + " мл</span></button>";
  }

  /* Хвост шторки: вопрос + тумблер. save = { label, act, on } */
  function saveRow(save, ui) {
    if (!save) return "";
    return '<div class="save-row"' + uiAttr("save", { ui: ui }) + '><span>' + esc(save.label) + "</span>" +
      '<button type="button" class="switch' + (save.on ? " on" : "") +
      '" data-act="' + save.act + '"><i></i></button></div>';
  }

  /* Общая шторка: o = { cls, scrimCls?, title?, sub?, body?, tail? } */
  function sheet(o) {
    return '<div class="scrim' + (o.scrimCls ? " " + o.scrimCls : "") +
      '" data-act="close-sheet"></div><div class="sheet ' + o.cls + '"' + uiAttr("sheet", o) + '>' +
      (o.title ? "<h2>" + esc(o.title) + "</h2>" : "") +
      (o.sub ? '<div class="sub">' + o.sub + "</div>" : "") +
      (o.body || "") + (o.tail || "") + "</div>";
  }

  /* Шторка-выбор: c = { cls, title, sub?, options, current, pickAct, save? } */
  function choiceSheet(c) {
    var body = (c.options || []).map(function (o) {
      return optionBonus(o, c.pickAct, c.current, c.ui);
    }).join("");
    return sheet({
      scrimCls: "choice",
      cls: c.cls + " choice",
      title: c.title,
      sub: c.sub,
      body: body,
      tail: saveRow(c.save, c.ui),
      ui: c.ui
    });
  }

  /* Модальное окно: o = { scrimAct, cls, title, body?, actions: [{ act, label }] }.
     title и label приходят готовыми (динамику вызывающий экранирует сам —
     историческая разметка именно такая); body — произвольная разметка тела. */
  function dialog(o) {
    var acts = (o.actions || []).map(function (a) {
      return '<button type="button" data-act="' + a.act + '">' + a.label + "</button>";
    }).join("");
    return '<div class="modal-scrim" data-act="' + o.scrimAct + '"></div>' +
      '<div class="' + o.cls + '" role="dialog"' + uiAttr("dialog", o) + '><h3>' + o.title + "</h3>" +
      (o.body || "") + '<div class="modal-actions">' + acts + "</div></div>";
  }

  /* Список «выбери один» (радио): o = { act, attr, items: [{ value, label, on }] }.
     attr — имя data-атрибута значения («v», «min»...); label экранируется. */
  function optionList(o) {
    var attr = o.attr || "v";
    return (o.items || []).map(function (it) {
      return '<button type="button" class="freq-opt' + (it.on ? " on" : "") +
        '" data-act="' + o.act + '" data-' + attr + '="' + it.value + '"' + uiAttr("opt", o) + '>' +
        '<span class="radio"></span><span>' + esc(it.label) + "</span></button>";
    }).join("");
  }

  /* Тело диалога «заметка + необязательная textarea»:
     o = { note, areaLabel?, text? }. Значения экранируются. */
  function noteArea(o) {
    return '<p class="svg-export-note"' + uiAttr("note", o) + '>' + esc(o.note) + "</p>" +
      (o.areaLabel
        ? '<textarea class="svg-export-text" spellcheck="false" aria-label="' + o.areaLabel + '">' + esc(o.text || "") + "</textarea>"
        : "");
  }

  /* Один барабан чисел: o = { name, value, min, max, step, pad?, item? }.
     Разметка и порядок data-атрибутов — как исторический wheelHtml app.js. */
  function wheel(o) {
    /* v211: цифры барабана рисуются сразу в разметке (донор держит список
       пустым до JS-инициализации). На старых WebView инициализация может
       не пройти — барабан остаётся пустым; SSR-цифры страхуют, а setupWheel
       после просто пересобирает тот же список и вешает снап. */
    var min = Number(o.min), max = Number(o.max), step = Number(o.step);
    if (!(step > 0)) step = 1;
    if (!(max >= min)) max = min;
    var values = [];
    for (var v = min; v <= max; v += step) values.push(v);
    var value = Number(o.value);
    if (values.indexOf(value) < 0 && values.length) {
      value = values.reduce(function (a, b) {
        return Math.abs(b - Number(o.value)) < Math.abs(a - Number(o.value)) ? b : a;
      });
    }
    var pad = '<div class="wheel-pad"></div>';
    var items = values.map(function (n) {
      var label = o.pad ? (n < 10 ? "0" + n : String(n)) : String(n);
      return '<div class="wheel-item' + (n === value ? " on" : "") + '" data-v="' + n + '">' + label + "</div>";
    }).join("");
    return '<div class="wheel" data-wheel="' + o.name + '" data-value="' + value +
      '" data-min="' + o.min + '" data-max="' + o.max + '" data-step="' + o.step +
      '" data-pad="' + (o.pad ? "1" : "") + '" data-item="' + (o.item || "") + '"' + uiAttr("wheel", o) + '>' +
      '<div class="wheel-lines"></div><div class="wheel-list">' + pad + items + pad + "</div></div>";
  }

  /* Рамка барабанов: o = { cls, items }. Элемент items:
     { wheel: {...} }            — барабан;
     { sep, sepCls?, aria? }     — разделитель (класс по умолчанию .kg-comma;
                                   aria-hidden="true" добавляет флаг aria);
     { unit, unitCls? }          — единица (по умолчанию .kg-unit). */
  function wheelBlock(o) {
    return '<div class="' + o.cls + '"' + uiAttr("wheelblock", o) + '>' + (o.items || []).map(function (it) {
      if (it.wheel) return wheel(it.wheel);
      if (it.sep != null) {
        return '<span class="' + (it.sepCls || "kg-comma") + '"' +
          (it.aria ? ' aria-hidden="true"' : "") + ">" + it.sep + "</span>";
      }
      if (it.unit != null) {
        return '<span class="' + (it.unitCls || "kg-unit") + '">' + it.unit + "</span>";
      }
      return "";
    }).join("") + "</div>";
  }

  /* Свайп-строка: o = { sid, actions: [{ act, id?, cls?, aria?, icon }], front }.
     Рамка и кнопки действий (порядок атрибутов — как историческая сборка)
     принадле кубику; front — разметка лица строки, её даёт вызывающий. */
  function swipeRow(o) {
    var acts = (o.actions || []).map(function (a) {
      return '<button type="button"' + (a.cls ? ' class="' + a.cls + '"' : "") +
        ' data-act="' + a.act + '"' +
        (a.id != null ? ' data-id="' + a.id + '"' : "") +
        (a.aria ? ' aria-label="' + a.aria + '"' : "") + ">" + (a.icon || "") + "</button>";
    }).join("");
    return '<div class="swipe" data-sid="' + o.sid + '"' + uiAttr("swipe", o) + '><div class="swipe-actions">' +
      acts + "</div>" + o.front + "</div>";
  }

  /* Кубик строки списка (спека §2.7, шаг 5): одна геометрия и поведение для
     ВСЕХ рядов приложения — настройки, напоминания, профиль, выбор напитка,
     сортировка, «Объёмы». Разметка побайтово равна исторической ручной
     сборке app.js (сверено до/после кадрами).

     o = {
       baseCls  — базовый класс ряда: «n-row» (умолч.) или «drow»,
                  «swipe-front drow», «sort-item drow» (CSS-семьи рядов);
       cls      — добавочный класс («switch-row», «sound-row on», …);
       tag      — «button»|«div»; умолч. button при act, иначе div;
       act      — data-act; data — объект прочих data-* (key, file, day…);
       kind     — «switch»: div с role=switch/aria-checked/tabindex=0 и
                  data-act=toggle data-key=key (строка-переключатель);
       key, on  — ключ тумблера и состояние (для kind=switch и check);
       lead     — готовый html ДО имени (пузырь напитка, аватар, иконка);
       title    — имя (html уже экранирован вызывающим);
       sub      — подпись <small> внутри имени;
       nameClass— класс имени: «ttl» (умолч.) или «name» (семья drow);
       right    — готовый html ПОСЛЕ имени (span.pct, кнопка прослушивания…);
       check    — true: дорисовать квадратик-метку checksq (aria-hidden);
       tick     — готовый html галочки (иконки считает app.js).
     } */
  function row(o) {
    o = o || {};
    var kind = o.kind || "value";
    var tag = o.tag || (o.act ? "button" : "div");
    var cls = (o.baseCls || "n-row") + (o.cls ? " " + o.cls : "");
    var attrs = ' class="' + cls + '"';
    if (tag === "button") attrs += ' type="button"';
    if (kind === "switch") {
      attrs += ' role="switch" aria-checked="' + (o.on ? "true" : "false") + '" tabindex="0"';
    }
    if (kind === "switch") attrs += ' data-act="toggle" data-key="' + o.key + '"';
    else if (o.act) attrs += ' data-act="' + o.act + '"';
    Object.keys(o.data || {}).forEach(function (k) {
      attrs += " data-" + k + '="' + o.data[k] + '"';
    });
    attrs += uiAttr("row", o);
    var inner = (o.lead || "") +
      '<span class="' + (o.nameClass || "ttl") + '">' + (o.title || "") +
      (o.sub ? "<small>" + o.sub + "</small>" : "") + "</span>" +
      (o.right || "") +
      ((o.check || kind === "switch") ? '<span class="switch' + (o.on ? " on" : "") + '" aria-hidden="true"><i></i></span>' : "");
    return "<" + tag + attrs + ">" + inner + "</" + tag + ">";
  }

  /* Квадратик-кнопка настроек (не метка): нажимается отдельно от строки. */
  function checkBox(on, key, tick, ui) {
    return '<button type="button" class="switch' + (on ? " on" : "") +
      '" data-act="toggle" data-key="' + key + '"' + uiAttr("check", { ui: ui }) +
      ' role="switch" aria-checked="' + (on ? "true" : "false") + '"><i></i></button>';
  }

  /* Ряд миллилитровых чипов (быстрый объём): одна деталь для ряда недавних
     объёмов в выборе напитка, шторки добавления и редактора цели.
     o = { baseCls? («presets xscroll» умолч.), cls?, values, selected, act, ui? } */
  function chipRow(o) {
    var sel = Number(o.selected);
    return '<div class="' + (o.baseCls || "presets xscroll") + (o.cls ? " " + o.cls : "") + '"' +
      uiAttr("chips", o) + '>' + (o.values || []).map(function (v) {
        return '<button type="button" class="preset' + (Number(v) === sel ? " on" : "") +
          '" data-act="' + o.act + '" data-v="' + v + '">' + v + " мл</button>";
      }).join("") + "</div>";
  }

  /* Круглая кнопка (спека §2.8, шаг 6): ОДНА геометрия круга, четыре роли.
     role head  — icon-btn в шапках (side: left|right);
     role fab   — плавающая кнопка действия (cls: «mark»);
     role check — зелёная галка сохранения (pos: center|float);
     role time  — кнопка времени/даты (icon + текст в span).
     o = { role, side?, pos?, cls?, act, aria?, icon, text?, ui? } */
  function roundBtn(o) {
    var aria = o.aria ? ' aria-label="' + o.aria + '"' : "";
    if (o.role === "head") {
      return '<button type="button" class="icon-btn ' + o.side + '" data-act="' + o.act + '"' +
        aria + uiAttr("roundbtn", o) + ">" + (o.icon || "") + "</button>";
    }
    if (o.role === "fab") {
      return '<button type="button" class="fab' + (o.cls ? " " + o.cls : "") + '" data-act="' + o.act + '"' +
        aria + uiAttr("roundbtn", o) + ">" + (o.icon || "") + "</button>";
    }
    if (o.role === "check") {
      return '<button type="button" class="check ' + o.pos + '" data-act="' + o.act + '"' +
        aria + uiAttr("roundbtn", o) + ">" + (o.icon || "") + "</button>";
    }
    return '<button type="button" class="time-btn' + (o.cls ? " " + o.cls : "") + '" data-act="' + o.act + '"' +
      aria + uiAttr("roundbtn", o) + ">" + (o.icon || "") +
      (o.text ? "<span>" + o.text + "</span>" : "") + "</button>";
  }

  /* Шапка экрана (спека §2.12, шаг 6): четыре семьи классов .top.
     o = { cls («top» умолч.), title? (готовый html), back? (html иконки),
     backAria? (умолч. «Назад»), right? (html), ui? }.
     Порядок детей исторический: [кнопка назад] → h1 → правый слот. */
  /* Ряд напитков шторки «напиток + объём» (шаг 7, 23.10.2026): одна деталь для
     обоих меню (домашнее и историческое) — они обязаны быть одинаковыми.
     items: [{ id, on, color, name (готовый html), bubble (готовый html) }];
     more: добавить пузырёк «Ещё» (акт more-drinks), moreIcon — готовый html. */
  function drinkPickRow(o) {
    var cells = (o.items || []).map(function (it) {
      return '<button type="button" class="vol-drink' + (it.on ? " on" : "") + '" style="--ring:' + it.color + '" data-act="' + o.act + '" data-id="' + it.id + '">' +
        it.bubble + '<span class="nm">' + it.name + "</span></button>";
    }).join("");
    if (o.more) cells += '<button type="button" class="vol-drink qmore" data-act="more-drinks">' +
      '<span class="bubble" style="background:#2ea0ea;width:var(--bubble, 52px);height:var(--bubble, 52px)">' + (o.moreIcon || "") + '</span><span class="nm">Ещё</span></button>';
    return '<div class="vol-drinks xscroll"' + uiAttr("drinkrow", o) + ">" + cells + "</div>";
  }

  function header(o) {
    /* Позиция заголовка (контракт 23.10.2026, вариант А): кубик сам видит,
       какие края заняты. Занят один край — заголовок к свободному; заняты
       оба — по центру; свободны оба — кубик не вмешивается (прежние классы
       экрана решают). titlePos — ручной overrides: 'left'|'center'|'right'.
       Разметка: шапке класс al, заголовку t-<позиция> + ind-l/ind-r
       (отступ под занятый край, чтобы не наезжать на кнопку). */
    var hasL = !!o.back, hasR = !!o.right;
    var pos = o.titlePos || "auto";
    if (pos === "auto") pos = hasL && hasR ? "center" : hasL ? "right" : hasR ? "left" : null;
    var h1cls = pos ? ' class="t-' + pos + (hasL ? " ind-l" : "") + (hasR ? " ind-r" : "") + '"' : "";
    return '<header class="' + (o.cls || "top") + (pos ? " al" : "") + '"' + uiAttr("header", o) + '>' +
      (o.back ? roundBtn({ role: "head", side: "left", act: "back",
        aria: o.backAria === "" ? null : (o.backAria || "Назад"),
        icon: o.back, ui: "back" }) : "") +
      (o.title ? "<h1" + h1cls + ">" + o.title + "</h1>" : "") +
      (o.right || "") + "</header>";
  }

  /* Круглый циферблат выбора времени (спека §2.10, шаг 9a, 24.10.2026):
     освобождён из темы Oneplus 7. Разметка побайтово равна исторической
     dialHtml app.js (сверено литералами в ui-kit-test); поведение (клики по
     циферблату, углы, состояние ui.dial) остаётся в app.js — кубик только
     рисунок. o = { h, m, view («h»|«m»), ui? }: view — какое кольцо живо
     (часы с двумя кольцами 12/24 или минуты). */
  function clockDial(o) {
    o = o || {};
    var h = Number(o.h) || 0, m = Number(o.m) || 0;
    var view = o.view === "m" ? "m" : "h";
    /* v97: accent — цвет редактируемого напитка (шапка, пузырёк, стрелка,
       точка), ink — чернила поверх него (L.inkOn). Без accent разметка
       байт в байт прежняя — золотые тесты ниже на этом стоят. Нехексовый
       accent игнорируем: в inline-стиль может попасть только #rgb/#rrggbb. */
    var accent = (typeof o.accent === "string" && o.ink && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(o.accent.trim()))
      ? o.accent.trim() : null;
    var styleAttr = accent
      ? ' style="--dial-accent:' + accent + ";--dial-ink:" + o.ink.fg + ";--dial-ink-dim:" + o.ink.fgDim + '"'
      : "";
    function pad2(n) { return String(n).padStart(2, "0"); }
    function num(v, angleDeg, radius, cls) {
      var a = angleDeg * Math.PI / 180;
      var x = 50 + radius * Math.sin(a);
      var y = 50 - radius * Math.cos(a);
      return '<span class="dial-num' + (cls ? " " + cls : "") + '" style="left:' +
        x.toFixed(2) + "%;top:" + y.toFixed(2) + '%">' + v + "</span>";
    }
    var ang = view === "h" ? (h % 12) * 30 : m * 6;
    var ring = view === "h" && !(h >= 1 && h <= 12) ? 26 : 40;
    /* Индекс цифры под пузырьком (только при accent): у минут — лишь когда
       m кратен 5, иначе пузырёк стоит между цифрами и красить нечего. */
    var selI = -1;
    if (accent) {
      if (view === "m") selI = m % 5 === 0 ? m / 5 : -1;
      else selI = ring === 26 ? (h === 0 ? 0 : h - 12) : h % 12;
    }
    var nums = "", i;
    if (view === "h") {
      for (i = 0; i < 12; i++) {
        nums += num(i === 0 ? 12 : i, i * 30, 40, accent && ring === 40 && i === selI ? "sel" : "");
        nums += num(pad2(i === 0 ? 0 : i + 12), i * 30, 26, "inner" + (accent && ring === 26 && i === selI ? " sel" : ""));
      }
    } else {
      for (i = 0; i < 12; i++) nums += num(pad2(i * 5), i * 30, 40, accent && i === selI ? "sel" : "");
    }
    var a = ang * Math.PI / 180;
    var sx = 50 + ring * Math.sin(a), sy = 50 - ring * Math.cos(a);
    return '<div class="dial" role="group" aria-label="Выбор времени"' + uiAttr("clockdial", o) + styleAttr + '>' +
      '<div class="dial-head"><span class="dp' + (view === "h" ? " on" : "") + '" data-act="dial-view" data-v="h">' +
      pad2(h) + '</span><span class="dc">:</span><span class="dp' + (view === "m" ? " on" : "") +
      '" data-act="dial-view" data-v="m">' + pad2(m) + "</span></div>" +
      '<div class="dial-body"><div class="dial-face" data-dial-face="1" data-view="' + view + '">' +
      '<span class="dial-sel" style="left:' + sx.toFixed(2) + "%;top:" + sy.toFixed(2) + '%"></span>' +
      '<span class="dial-hand" style="height:' + ring + "%;transform:rotate(" + ang + 'deg)"></span>' +
      nums + '<span class="dial-dot"></span>' +
      "</div></div></div>";
  }

  /* v122: чашка-тамогочи — пилюля-таймер в нижнем ряду дока. level 0..100 —
     сколько жидкости осталось до ближайшего напоминания; color — цвет
     последней порции. Стакан рисуется контуром поверх жидкости, поэтому
     край жидкости всегда подрезан стенками. */
  function miniCup(level, color) {
    var lv = Math.round(Number(level));
    if (!isFinite(lv)) lv = 0;
    lv = Math.max(0, Math.min(100, lv));
    var col = typeof color === "string" && color ? color : "#61c2f9";
    var h = Math.round(14 * lv / 100);
    var liq = h > 0
      ? '<rect x="9" y="' + (21 - h) + '" width="10" height="' + h + '" fill="' + col + '"/>'
      : "";
    return '<svg class="mini-cup" viewBox="0 0 28 28" aria-hidden="true">' + liq +
      '<path d="M7 6h14l-1.6 15a2 2 0 0 1-2 1.8h-6.8a2 2 0 0 1-2-1.8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  }

  return {
    catWater: catWater,
    catBubbles: catBubbles,
    catBubblesSig: catBubblesSig,
    catBubblesRestyle: catBubblesRestyle,
    catBubblesPhase: catBubblesPhase,
    btClampParams: btClampParams,
    catWaterSvg: catWaterSvg,
    miniCup: miniCup,
    catWaterSurface: catWaterSurface,
    catWaterLiftPct: catWaterLiftPct,
    /* v136: пролёт пояса от видимой ватерлинии до дна силуэта —
       % коробки (маска) и единицы холста 944x766 (SVG-фолбэк). */
    beltSpanPct: function (liftPctNow) { return Math.max(0, catWaterLiftPct(0.0001) - (Number(liftPctNow) || 0)); },
    beltSpanUnits: function (liftPctNow) { return Math.max(1, catWaterSurface(0.0001) - (Number(liftPctNow) || 0) / 100 * WT_BOX_H); },
    esc: esc,
    optionBonus: optionBonus,
    saveRow: saveRow,
    sheet: sheet,
    choiceSheet: choiceSheet,
    dialog: dialog,
    optionList: optionList,
    noteArea: noteArea,
    wheel: wheel,
    wheelBlock: wheelBlock,
    swipeRow: swipeRow,
    row: row,
    drinkPickRow: drinkPickRow,
    checkBox: checkBox,
    chipRow: chipRow,
    roundBtn: roundBtn,
    header: header,
    clockDial: clockDial
  };
}));
