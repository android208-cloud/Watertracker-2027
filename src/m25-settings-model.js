/* Модель настроек: каталог строк и раскладка экранов как данные.
   v125: вместо коллапсов — подпапки (строка-дверь во вложенный экран).
   v126: редактор порядка общий для всех экранов.
   v127: четвёртый системный экран «Внешний вид» (look) по дереву владельца:
   тема, волна (вложенная подпапка), живые настройки, цвет жидкости и
   графика, системный ввод; «Уведомления» переехали в блок «Мой профиль»;
   «Период активности» — в «Личные»; строка «Напиток по умолчанию» удалена
   (напиток профиля выбирается круглой кнопкой на домашнем экране).

   Раскладка живёт в state.sLayout:
     order   — плоский порядок ключей ВСЕХ экранов (id строк и двери «@folderId»);
     groups  — { ключ: группа }; группа = id секции главного («profile»,
               «personal», «main»), экран «Внешний вид» («look» — строки без
               раздела) или его раздел («look:live» …), раздел «Дополнительно»
               («adv:dev» …), раздел уведомлений («alr:perm», «alr:set»)
               либо подпапка («@folderId»);
     folders — [{ id, title }] — подпапки владельца (мигрировавшая «Волна» — здесь).

   Экраны: главный — секции profile/personal/main (каркас фиксирован);
   «Внешний вид» — куча «look» + разделы LOOK_SECTIONS, блоки выводятся
   в порядке появления их строк в order (две кучи — до и после разделов —
   возникают естественно); «Дополнительно» — разделы ADV_SECTIONS;
   «Уведомления» — разделы ALR_SECTIONS.

   Прибитые строки (в редакторе не участвуют): «Версия» — низ настроек,
   «Удалить все данные» — низ «Дополнительно»,
   Системные двери (look, advanced, alertsDoor) ходят только между секциями
   главного. Двери подпапок — между всеми экранными группами (в подпапки не
   ныряют: глубина остаётся 1, циклы невозможны). Обычные строки — куда угодно,
   включая подпапки.

   Зависимостей нет: модуль тестируется без браузера —
   node tools/settings-model-test.js

   Типы строк:
     row    — кнопка: { title, sub, act };
     switch — переключатель на всю строку: { title, sub, key, on };
     check  — строка с чекбоксом справа: { title, sub, key, on };
     custom — строку целиком рисует settings-ui/app (profile, sync, version,
              wave, liqBlock, chartBlock, bubBlock).
   enabled === false — строка видна, но серая и не нажимается (класс off);
   visible === false — строка/блок не рисуются вовсе. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SettingsModel = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* Секции главного экрана — фиксированный каркас. */
  var SECTIONS = [
    { id: "profile", title: "Мой профиль" },
    { id: "personal", title: "Личные настройки" },
    { id: "main", title: "Основные настройки" }
  ];

  /* Разделы экрана «Внешний вид» (v127). Строки группы «look» рисуются
     без заголовка; разделы — в порядке появления их строк в order.
     «Системный ввод» — dev-раздел (как в «Дополнительно»). */
  var LOOK_SECTIONS = [
    { id: "look:live", title: "Живые настройки" },
    { id: "look:liq", title: "Цвет жидкости" },
    { id: "look:chart", title: "Цвет графика" },
    { id: "look:pick", title: "Календарь и часы" },
    { id: "look:sys", title: "Системный ввод", dev: true }
  ];

  /* Разделы «Дополнительно» (v127): порядок по дереву владельца —
     «Режим разработчика» первым, «Пузырьки» остались здесь. */
  var ADV_SECTIONS = [
    { id: "adv:dev", title: "Режим разработчика" },
    { id: "adv:bub", title: "Пузырьки (прототип)" },
    { id: "adv:transfer", title: "Перенос данных" },
    { id: "adv:svg", title: "Редактор значков", dev: true },
    { id: "adv:skin", title: "Скин", dev: true },
    { id: "adv:diag", title: "Диагностика", dev: true, cloud: true }
  ];

  /* Разделы «Уведомлений». */
  var ALR_SECTIONS = [
    { id: "alr:perm", title: "Необходимые разрешения" },
    { id: "alr:set", title: "Настройки уведомлений" }
  ];

  var MAIN_SECTION_IDS = { profile: true, personal: true, main: true };
  /* Системные двери: только секции главного экрана. */
  var SYSTEM_KEYS = ["look", "advanced", "alertsDoor"];

  /* Экранная группа: куда можно положить дверь подпапки. */
  function screenGroup(g) {
    if (MAIN_SECTION_IDS[g] || g === "look") return true;
    return LOOK_SECTIONS.some(function (s) { return s.id === g; }) ||
      ADV_SECTIONS.some(function (s) { return s.id === g; }) ||
      ALR_SECTIONS.some(function (s) { return s.id === g; });
  }

  /* Каталог строк главного экрана. home — родная секция/группа: туда строка
     возвращается при удалении подпапки и туда встаёт, если раскладка её
     ещё не знает. v127: «Напиток по умолчанию» удалён из настроек —
     напиток профиля выбирается круглой кнопкой на домашнем экране. */
  function rowCatalog(ctx) {
    return {
      profile: { id: "profile", type: "custom", custom: "profile", home: "profile" },
      sync: { id: "sync", type: "custom", custom: "sync", home: "profile", visible: !!ctx.flags.signedIn },
      gender: { id: "gender", type: "row", title: "Пол", sub: ctx.labels.gender, act: "open-gender", home: "personal" },
      weight: { id: "weight", type: "row", title: "Вес", sub: ctx.labels.weight, act: "open-set-weight", home: "personal" },
      units: { id: "units", type: "row", title: "Единицы измерения", sub: ctx.labels.units, act: "open-units", home: "personal" },
      dayStart: { id: "dayStart", type: "row", title: "Начало суток", sub: ctx.labels.dayStart, act: "open-day-start", home: "personal" },
      norm: { id: "norm", type: "row", title: "Норма воды", sub: ctx.labels.norm, act: "open-norm", home: "personal" },
      activity: { id: "activity", type: "row", title: "Период активности", act: "open-activity", home: "personal" },
      /* v127: «Внешний вид» — четвёртая системная дверь (экран look). */
      look: { id: "look", type: "row", title: "Внешний вид", sub: "Тема, волна, цвета жидкости и графика", act: "open-look", home: "main", system: true },
      advanced: { id: "advanced", type: "row", title: "Дополнительно", act: "open-advanced", home: "main", system: true },
      /* v125: уведомления — строка-дверь; v127: живёт в блоке «Мой профиль». */
      alertsDoor: { id: "alertsDoor", type: "row", title: "Уведомления", sub: ctx.labels.alertsDoor, act: "open-folder-alerts", switchKey: "alertOn", on: ctx.flags.alertOn, home: "profile", system: true },
      /* v126: вход в редактор порядка — фиксированная строка, видна только
         в режиме разработчика; в раскладке не участвует. */
    };
  }

  /* Каталог экрана «Внешний вид» (v127). Куча — группа «look»;
     liqBlock/chartBlock — custom-строки: содержимое рисуют модули
     LiquidColor.colorHtml() / ChartColor.colorHtml(). */
  function lookCatalog(ctx) {
    return {
      theme: { id: "theme", type: "row", title: "Выбор темы", sub: ctx.labels.theme, act: "open-theme", home: "look" },
      cupLabel: { id: "cupLabel", type: "row", title: "Миска", sub: ctx.labels.cupLabel, act: "open-cup-label", home: "look" },
      dialTime: { id: "dialTime", type: "switch", title: "Циферблат вместо барабанов", sub: ctx.flags.oneplus ? "В этой теме циферблат всегда" : "Время и начало суток — круглым циферблатом", key: "dialTime", on: ctx.flags.oneplus || !!ctx.flags.dialTime, home: "look" },
      vibroDial: { id: "vibroDial", type: "switch", title: "Виброотклик циферблата", sub: "Короткий тик на шаг стрелки и на выбор цифры", key: "vibroDial", on: ctx.flags.vibroDial, home: "look" },
      animation: { id: "animation", type: "check", title: "Отключить анимацию на главном экране", sub: ctx.labels.animNote, key: "animation", on: ctx.flags.animOff, home: "look:live" },
      warnExceed: { id: "warnExceed", type: "check", title: "Включить предупреждение о превышении нормы", sub: "Котик входит в стадию «перепоил» с 2×N или литра за час", key: "warnExceed", on: ctx.flags.warnExceed, home: "look:live" },
      liqBlock: { id: "liqBlock", type: "custom", custom: "liqBlock", home: "look:liq" },
      chartBlock: { id: "chartBlock", type: "custom", custom: "chartBlock", home: "look:chart" },
      systemDrums: { id: "systemDrums", type: "switch", title: "Системные барабаны", sub: ctx.labels.drumsNote, key: "systemDrums", on: ctx.flags.systemDrums, home: "look:sys" },
      systemCalendar: { id: "systemCalendar", type: "switch", title: "Системный календарь", sub: ctx.labels.calNote, key: "systemCalendar", on: ctx.flags.systemCalendar, home: "look:pick" },
      systemClock: { id: "systemClock", type: "switch", title: "Системные часы", sub: ctx.labels.clockNote, key: "systemClock", on: ctx.flags.systemClock, home: "look:pick" },
      /* v117/v125: каталог волны — строка внутри подпапки «Волна»;
         при удалении подпапки возвращается в кучу «Внешнего вида». */
      waveBox: { id: "waveBox", type: "custom", custom: "wave", home: "look" }
    };
  }

  /* Каталог строк «Дополнительно» (v127). deleteAll — прибитая строка:
     разрушительное действие всегда в самом низу, вдали от повседневных. */
  function advancedCatalog(ctx) {
    var dev = !!ctx.flags.devMode;
    return {
      devMode: { id: "devMode", type: "switch", title: "Режим разработчика", sub: "Инструменты значков, системный ввод и диагностика", key: "devMode", on: dev, home: "adv:dev" },
      /* v127: пузырьки остались в «Дополнительно» — custom-строка модуля. */
      bubBlock: { id: "bubBlock", type: "custom", custom: "bubBlock", home: "adv:bub" },
      restoreHistory: { id: "restoreHistory", type: "row", title: "Вернуть историю до импорта", sub: ctx.flags.hasBackup ? ctx.labels.backupNote : "Резервной копии пока нет", act: "restore-history", enabled: !!ctx.flags.hasBackup, home: "adv:transfer" },
      dedupe: { id: "dedupe", type: "row", title: "Дубли в истории", sub: ctx.flags.hasDupes ? ctx.labels.dupesNote : "Повторов не найдено", act: "open-dupes", enabled: !!ctx.flags.hasDupes, home: "adv:transfer" },
      loadHistory: { id: "loadHistory", type: "row", title: "Загрузить историю", sub: ctx.labels.loadNote, act: "load-history", home: "adv:transfer" },
      exportHistory: { id: "exportHistory", type: "row", title: "Экспорт истории", sub: ctx.labels.exportNote, act: "open-history-export", home: "adv:transfer" },
      saveDb: { id: "saveDb", type: "row", title: "Сохранить базу файлом", sub: ctx.labels.saveDbNote, act: "save-db-file", home: "adv:transfer" },
      shareDb: { id: "shareDb", type: "row", title: "Поделиться базой", sub: ctx.labels.shareDbNote, act: "share-db-file", home: "adv:transfer" },
      svgEditor: { id: "svgEditor", type: "check", title: "Редактор SVG", sub: "Рамки, окошко чисел и откат. Кнопку ✎ можно перетащить", key: "svgEditor", on: ctx.flags.svgEditor, home: "adv:svg" },
      saveSvgLayout: { id: "saveSvgLayout", type: "row", title: "Записать правки SVG в проект", sub: ctx.labels.svgSaveNote, act: "save-svg-layout", home: "adv:svg" },
      svgExport: { id: "svgExport", type: "row", title: "Перенести раскладку значков", sub: "Выгрузить или вставить список правок", act: "open-svg-export", home: "adv:svg" },
      skinPaste: { id: "skinPaste", type: "row", title: "Скин: применить из буфера", sub: ctx.labels.skinNote, act: "skin-paste", home: "adv:skin" },
      skinReset: { id: "skinReset", type: "row", title: "Сбросить скин", sub: "Убрать токены размеров и вернуть цвета", act: "skin-reset", visible: !!ctx.flags.skinOn, home: "adv:skin" },
      googleDiag: { id: "googleDiag", type: "row", title: "Параметры входа Google", sub: "пакет и отпечаток этой сборки", act: "google-diag", home: "adv:diag" },
      cloudClear: { id: "cloudClear", type: "row", title: "Очистить облако", sub: "стереть копию и метки удалений на Диске", act: "ask-cloud-clear", home: "adv:diag" },
      deleteAll: { id: "deleteAll", type: "row", title: "Удалить все данные", sub: "Необратимо", act: "ask-delete-all", home: "adv:transfer", pinned: true }
    };
  }

  /* Каталог строк «Уведомлений». Живые подписи приходят через ctx;
     подсказки-абзацы привязаны к своим строкам и ходят вместе с ними. */
  function alertsCatalog(ctx) {
    ctx = ctx || { flags: {}, labels: {} };
    var f = ctx.flags, l = ctx.labels;
    return {
      whenGoalMet: { id: "whenGoalMet", type: "switch", title: "Присылать напоминания, когда норма уже выпита", key: "whenGoalMet", on: !!f.whenGoalMet, home: "alr:perm" },
      evenIfRecent: { id: "evenIfRecent", type: "switch", title: "Присылать напоминания, даже если недавно пили воду", key: "evenIfRecent", on: !!f.evenIfRecent, home: "alr:perm",
        hint: "Включено — слоты каждые N от начала периода активности. Выключено — каждые N после последнего приёма." },
      holdUntilDrink: { id: "holdUntilDrink", type: "switch", title: "Не гасить напоминание, пока не добавлена порция", key: "holdUntilDrink", on: !!f.holdUntilDrink, home: "alr:perm",
        hint: "Уведомление переживёт вход в приложение и уйдёт из шторки, когда запишете порцию." },
      alertSound: { id: "alertSound", type: "row", title: "Звук уведомления", sub: l.alertSoundSub || "", act: "open-alert-sound", home: "alr:set" },
      alertVibrate: { id: "alertVibrate", type: "switch", title: "Вибрация", key: "alertVibrate", on: f.alertVibrate !== false, home: "alr:set" },
      alertTest: { id: "alertTest", type: "row", title: "Проверить уведомление", sub: l.alertTestSub || "", act: "alert-test", home: "alr:set" },
      alertTexts: { id: "alertTexts", type: "row", title: "Тексты уведомлений", sub: l.alertTextsSub || "", act: "open-alert-texts", home: "alr:set", anchor: "alertTest" },
      sysNote: { id: "sysNote", type: "row", title: "Системные настройки", sub: "Звук, вибрация и приоритет в Android", act: "sys-note", home: "alr:set" },
      alertPeriod: { id: "alertPeriod", type: "row", title: "Период уведомлений", sub: l.alertPeriodSub || "", act: "open-alert-period", home: "alr:set" },
      habitSched: { id: "habitSched", type: "row", title: "Расписание по привычке", sub: l.habitSchedSub || "", act: "open-alert-habit", home: "alr:set", anchor: "alertPeriod" },
      alertFreq: { id: "alertFreq", type: "row", title: "Частота", sub: l.alertFreqSub || "", act: "open-alert-freq", home: "alr:set" },
      structExport: { id: "structExport", type: "row", title: "Структура настроек", sub: l.structExportSub || "", act: "open-struct", home: "adv:transfer", anchor: "shareDb" }
    };
  }

  /* Полный каталог всех экранов (ключи не пересекаются). */
  function fullCatalog(ctx) {
    ctx = ctx || { flags: {}, labels: {} };
    return Object.assign({}, rowCatalog(ctx), lookCatalog(ctx), advancedCatalog(ctx), alertsCatalog(ctx));
  }

  /* Родная группа строки: статическая таблица (без ctx). */
  var HOME = (function () {
    var h = {};
    var cat = fullCatalog({ flags: {}, labels: {} });
    Object.keys(cat).forEach(function (id) { h[id] = cat[id].home; });
    return h;
  })();

  function homeOf(key) {
    if (String(key).indexOf("@") === 0) return "main";
    return HOME[key] || "main";
  }

  /* Порядок по умолчанию (v127 = дерево владельца): главный, «Внешний вид»,
     «Дополнительно», «Уведомления» — одним плоским списком. */
  function defaultLayout() {
    var order = [
      /* главный: профиль → дверь уведомлений → личные → основные двери */
      "profile", "sync", "alertsDoor",
      "units", "gender", "weight", "norm", "dayStart", "activity",
      "look", "advanced",
      /* «Внешний вид» (v132, по дереву владельца): волна первой, темы нет
         второй — она в конце; виброотклик перед миской и циферблатом */
      "@wave", "animation", "warnExceed", "liqBlock", "chartBlock",
      "systemDrums", "systemCalendar", "systemClock",
      "vibroDial", "cupLabel", "dialTime", "theme",
      /* содержимое подпапки «Волна» */
      "waveBox",
      /* «Дополнительно»: dev первым, пузырьки, перенос, svg, скин, диагностика */
      "devMode", "bubBlock", "restoreHistory", "dedupe", "loadHistory",
      "exportHistory", "saveDb", "shareDb", "structExport", "svgEditor", "saveSvgLayout",
      "svgExport", "skinPaste", "skinReset", "googleDiag", "cloudClear",
      /* «Уведомления» */
      "whenGoalMet", "evenIfRecent", "holdUntilDrink", "alertSound",
      "alertVibrate", "alertTest", "alertTexts", "sysNote", "alertPeriod", "habitSched",
      "alertFreq"
    ];
    var cat = fullCatalog({ flags: {}, labels: {} });
    order = order.filter(function (k) { return k === "@wave" || !!cat[k]; });
    var groups = {};
    order.forEach(function (k) { groups[k] = homeOf(k); });
    groups["@wave"] = "look";
    groups["waveBox"] = "@wave";
    return { order: order, groups: groups, folders: [{ id: "wave", title: "Волна" }] };
  }

  /* Привести сохранённую раскладку к рабочему виду (или создать из дефолта).
     v126 → v127: раскладка без ключа «look» пересобирается по дереву
     владельца; двери пользовательских подпапок сохраняются (в конец
     «Основных»), содержимое подпапок не теряется.
     Далее обычная починка:
     - строки новых релизов, которых нет в order, встают на спек-позицию
       (anchor), иначе в конец родной группы, а если группы ещё нет — в конец;
     - мёртвые ключи (строк больше нет) выпадают;
     - группы чинятся: неизвестная/пустая группа → родная; двери подпапок —
       только экранные группы (сбитая → «Основные»). */
  function migrateLayout(stored, catalog) {
    if (!stored || !Array.isArray(stored.order) || !stored.order.length) return defaultLayout();
    var cat = catalog || {};
    var layout = {
      order: stored.order.slice(),
      groups: Object.assign({}, stored.groups || {}),
      folders: (Array.isArray(stored.folders) ? stored.folders : []).filter(function (f) {
        return f && f.id && f.title;
      }).map(function (f) { return { id: String(f.id), title: String(f.title) }; })
    };
    /* Переезд 07.11: «Системный календарь/часы» из dev-раздела в видимый
       «Календарь и часы» — сохранённую группу правим, иначе строки
       остались бы в скрытом разделе. */
    ["systemCalendar", "systemClock"].forEach(function (k) {
      if (layout.groups[k] === "look:sys") layout.groups[k] = "look:pick";
    });
    var folderIds = {};
    layout.folders.forEach(function (f) { folderIds["@" + f.id] = true; });

    /* Разовая пересборка v127: «look» ещё не знает — значит раскладка
       старая. Берём новый дефолт и переносим двери подпапок владельца. */
    if (layout.order.indexOf("look") < 0) {
      var base = defaultLayout();
      /* Системные подпапки v126 («Волна», разделы «Дополнительно» и
         «Уведомлений») в v127 стали экранными группами/разделами — их
         двери не должны всплывать пользовательскими дверями в «Основных». */
      var goneIds = { "wave": 1, "adv:dev": 1, "adv:transfer": 1, "adv:svg": 1, "adv:skin": 1, "adv:diag": 1, "alr:perm": 1, "alr:set": 1 };
      var extraDoors = layout.order.filter(function (k) {
        return k.indexOf("@") === 0 && folderIds[k] && !goneIds[k.slice(1)] && base.order.indexOf(k) < 0;
      });
      layout.order = base.order.concat(extraDoors);
      /* Содержимое пользовательских подпапок владельца переживает пересборку. */
      var kept = {};
      Object.keys(layout.groups).forEach(function (k) {
        var g = layout.groups[k];
        if (typeof g === "string" && g.indexOf("@") === 0 && folderIds[g] && !goneIds[g.slice(1)]) kept[k] = g;
      });
      layout.groups = Object.assign({}, base.groups, kept);
      extraDoors.forEach(function (k) { layout.groups[k] = "main"; });
      /* Папки: системная «Волна» из нового дефолта (иначе фильтр мёртвых
         ключей выбросит дверь @wave — хранилище v126 о ней не знает)
         плюс пользовательские подпапки владельца. */
      layout.folders = base.folders.concat(layout.folders.filter(function (f) {
        return !goneIds[f.id];
      }));
      folderIds = {};
      layout.folders.forEach(function (f) { folderIds["@" + f.id] = true; });
    }

    /* Мёртвые ключи — вон; дубли — вон. */
    var seen = {};
    layout.order = layout.order.filter(function (k) {
      if (seen[k]) return false;
      seen[k] = true;
      if (k.indexOf("@") === 0) return !!folderIds[k];
      return !cat || (!!cat[k] && !cat[k].fixed && !cat[k].pinned);
    });
    /* Новые строки каталога — на спек-позицию. fixed/pinned в order не живут. */
    Object.keys(cat).forEach(function (id) {
      var row = cat[id];
      if (!row || row.fixed || row.pinned || seen[id]) return;
      var at = -1;
      if (row.anchor) at = layout.order.indexOf(row.anchor);
      if (at >= 0) layout.order.splice(at + 1, 0, id);
      else {
        var last = -1;
        layout.order.forEach(function (k, i) { if (groupOf(layout, k) === row.home) last = i; });
        if (last >= 0) layout.order.splice(last + 1, 0, id);
        else layout.order.push(id);
      }
      seen[id] = true;
    });
    /* Группы: неизвестная/пустая → родная. Двери подпапок живут в экранных
       группах (секции главного, «Внешний вид» и его разделы, разделы
       «Дополнительно»/«Уведомлений»); битая группа двери → «Основные».
       (Фикс 30.10: сбрасываем только битую, не любую.) */
    layout.order.forEach(function (k) {
      var g = layout.groups[k];
      if (k.indexOf("@") === 0) { if (!screenGroup(g)) layout.groups[k] = "main"; return; }
      var row = cat && cat[k];
      var home = (row && row.home) || homeOf(k);
      var okFolder = g && g.indexOf("@") === 0 && folderIds[g];
      if (!g || (g.indexOf("@") === 0 && !okFolder) || (!okFolder && g.indexOf("@") !== 0 && !screenGroup(g))) {
        layout.groups[k] = home;
      }
    });
    /* Подпапки без двери в order — дверь в конец. */
    layout.folders.forEach(function (f) {
      var key = "@" + f.id;
      if (layout.order.indexOf(key) < 0) { layout.order.push(key); layout.groups[key] = "main"; }
    });
    return layout;
  }

  function groupOf(layout, key) {
    return (layout.groups && layout.groups[key]) || homeOf(key);
  }

  /* Общий фильтр строк группы из плоского порядка. */
  function rowsOfGroup(lay, cat, gid) {
    var out = [];
    lay.order.forEach(function (k) {
      if (groupOf(lay, k) !== gid) return;
      var row = cat[k];
      if (row && !row.fixed && !row.pinned) out.push(k);
    });
    return out;
  }

  /* Дверь подпапки как строка-кнопка (общая для всех экранов). */
  function doorItem(lay, cat, key, folderById) {
    var f = folderById[key.slice(1)];
    if (!f) return null;
    var n = rowsOfGroup(lay, cat, key).length;
    return { id: key, type: "row", title: f.title,
      sub: n ? "Подпапка · " + n + (n === 1 ? " строка" : (n < 5 ? " строки" : " строк")) : "Подпапка · пусто",
      act: "open-folder-" + f.id, folder: f.id };
  }

  function folderMap(lay) {
    var m = {};
    lay.folders.forEach(function (f) { m[f.id] = f; });
    return m;
  }

  /* Блоки главного экрана: секции-каркас + строки из раскладки + двери
     как обычные строки + «Порядок строк» (только dev) и версия (прибиты). */
  function composeMain(ctx, layout) {
    var cat = fullCatalog(ctx);
    var lay = migrateLayout(layout, cat);
    var folderById = folderMap(lay);
    function itemFor(key) {
      if (key.indexOf("@") === 0) return doorItem(lay, cat, key, folderById);
      var row = cat[key];
      return row && !row.fixed && !row.pinned ? row : null;
    }
    var blocks = SECTIONS.map(function (sec) {
      var items = [];
      lay.order.forEach(function (k) {
        if (groupOf(lay, k) !== sec.id) return;
        var it = itemFor(k);
        if (it) items.push(it);
      });
      return { title: sec.title, items: items };
    });
    blocks.push({ title: null, items: [{ id: "version", type: "custom", custom: "version" }] });
    return blocks;
  }

  /* Блоки «Внешнего вида» (v127): куча «look» без заголовка и разделы
     LOOK_SECTIONS; блоки идут в порядке появления их строк в order,
     поэтому куча может встречаться несколько раз (до и после разделов).
     dev-разделы («Системный ввод») без режима разработчика не рисуются. */
  function composeLook(ctx, layout) {
    var cat = fullCatalog(ctx);
    var lay = migrateLayout(layout, cat);
    var dev = !!ctx.flags.devMode;
    var secById = {};
    LOOK_SECTIONS.forEach(function (s) { secById[s.id] = s; });
    var folderById = folderMap(lay);
    var blocks = [];
    var curG = null;
    lay.order.forEach(function (k) {
      var g = groupOf(lay, k);
      if (g !== "look" && !secById[g]) return;
      var sec = secById[g];
      if (sec && sec.dev && !dev) return;
      var it = k.indexOf("@") === 0
        ? doorItem(lay, cat, k, folderById)
        : (cat[k] && !cat[k].fixed && !cat[k].pinned ? cat[k] : null);
      if (!it) return;
      if (it.visible === false) return;
      if (g !== curG) { blocks.push({ title: sec ? sec.title : null, items: [] }); curG = g; }
      blocks[blocks.length - 1].items.push(it);
    });
    return blocks;
  }

  /* Блоки «Дополнительно»: разделы-каркас, строки из раскладки,
     вход в редактор внутри «Режима разработчика» (при dev), прибитая
     «Удалить все данные» всегда внизу. */
  function composeAdvanced(ctx, layout) {
    var cat = fullCatalog(ctx);
    var lay = migrateLayout(layout, cat);
    var dev = !!ctx.flags.devMode;
    var blocks = ADV_SECTIONS.map(function (sec) {
      var vis = sec.dev ? (dev && (!sec.cloud || !!ctx.flags.cloudBridge)) : true;
      var items = rowsOfGroup(lay, cat, sec.id).map(function (k) { return cat[k]; });
      return { title: sec.title, visible: vis, items: items };
    });
    blocks.push({ title: null, items: [cat.deleteAll] });
    return blocks;
  }

  /* Разделы «Уведомлений»: заголовок и ids строк в порядке раскладки.
     Разметку строк рисует settings-ui.js (реестр data-ui сохраняется). */
  function composeAlerts(layout, catalog) {
    var cat = catalog || {};
    var lay = migrateLayout(layout, cat);
    return ALR_SECTIONS.map(function (sec) {
      return { id: sec.id, title: sec.title, ids: rowsOfGroup(lay, cat, sec.id) };
    });
  }

  /* Раскладка, пригодная для хранения: копируем и чиним. */
  function cloneLayout(layout) {
    return { order: layout.order.slice(), groups: Object.assign({}, layout.groups),
      folders: layout.folders.map(function (f) { return { id: f.id, title: f.title }; }) };
  }

  /* --- Операции редактора (все возвращают новый layout, старый не портят) --- */

  /* Стрелка вверх/вниз в плоском списке: обмен с соседом. Шаг через границу
     группы меняет группу строки на группу соседа. Системные двери остаются
     на главном; двери подпапок ходят между всеми экранными группами
     (в подпапки не ныряют — глубина 1, циклы невозможны). */
  function moveRow(layout, key, dir) {
    var lay = cloneLayout(layout);
    var i = lay.order.indexOf(key);
    var j = i + (dir > 0 ? 1 : -1);
    if (i < 0 || j < 0 || j >= lay.order.length) return null;
    var other = lay.order[j];
    lay.order.splice(i, 1);
    lay.order.splice(j, 0, key);
    var gOther = groupOf(lay, other);
    if (SYSTEM_KEYS.indexOf(key) >= 0) {
      if (MAIN_SECTION_IDS[gOther]) lay.groups[key] = gOther;
    } else if (key.indexOf("@") === 0) {
      if (screenGroup(gOther)) lay.groups[key] = gOther;
    } else {
      lay.groups[key] = gOther;
    }
    return lay;
  }

  /* Ярлычок группы: положить строку в секцию, подпапку или раздел любого
     экрана. Системные двери — только секции главного; двери подпапок —
     любые экранные группы (без подпапок); строки — куда угодно. */
  function setGroup(layout, key, groupId) {
    var lay = cloneLayout(layout);
    if (lay.order.indexOf(key) < 0) return null;
    var isFolder = String(groupId).indexOf("@") === 0;
    var isSys = SYSTEM_KEYS.indexOf(key) >= 0;
    var isDoor = key.indexOf("@") === 0;
    if (isSys) {
      if (!MAIN_SECTION_IDS[groupId]) return null;
    } else if (isDoor) {
      if (!screenGroup(groupId)) return null;
    } else if (isFolder) {
      if (!lay.folders.some(function (f) { return "@" + f.id === groupId; })) return null;
    } else if (!screenGroup(groupId)) return null;
    lay.groups[key] = groupId;
    /* Переносим строку к новой стае: в конец группы-приёмника (в order). */
    var i = lay.order.indexOf(key);
    lay.order.splice(i, 1);
    var last = -1;
    lay.order.forEach(function (k, idx) { if (groupOf(lay, k) === groupId) last = idx; });
    lay.order.splice(last + 1, 0, key);
    return lay;
  }

  function folderIdFromTitle(layout, title) {
    var base = "f" + (layout.folders.length + 1);
    var id = base, n = 2;
    var taken = {};
    layout.folders.forEach(function (f) { taken[f.id] = true; });
    while (taken[id]) { id = base + "-" + n; n++; }
    return id;
  }

  /* «Новая подпапка»: дверь встаёт в конец «Основных». */
  function createFolder(layout, title) {
    var lay = cloneLayout(layout);
    var clean = String(title || "").trim().slice(0, 40);
    if (!clean) return null;
    var id = folderIdFromTitle(lay, clean);
    lay.folders.push({ id: id, title: clean });
    var key = "@" + id;
    var last = -1;
    lay.order.forEach(function (k, i) { if (groupOf(lay, k) === "main") last = i; });
    lay.order.splice(last + 1, 0, key);
    lay.groups[key] = "main";
    return lay;
  }

  /* Удаление подпапки: строки возвращаются в родные группы (по каталогу),
     дверь исчезает. Содержимое не теряется. */
  function removeFolder(layout, id, catalog) {
    var lay = cloneLayout(layout);
    var key = "@" + id;
    if (!lay.folders.some(function (f) { return f.id === id; })) return null;
    lay.folders = lay.folders.filter(function (f) { return f.id !== id; });
    var i = lay.order.indexOf(key);
    if (i >= 0) lay.order.splice(i, 1);
    delete lay.groups[key];
    lay.order.forEach(function (k) {
      if (groupOf(lay, k) === key) {
        var row = catalog && catalog[k];
        lay.groups[k] = (row && row.home) || homeOf(k);
      }
    });
    return lay;
  }

  return {
    SECTIONS: SECTIONS,
    LOOK_SECTIONS: LOOK_SECTIONS,
    ADV_SECTIONS: ADV_SECTIONS,
    ALR_SECTIONS: ALR_SECTIONS,
    SYSTEM_KEYS: SYSTEM_KEYS,
    screenGroup: screenGroup,
    rowCatalog: rowCatalog,
    lookCatalog: lookCatalog,
    advancedCatalog: advancedCatalog,
    alertsCatalog: alertsCatalog,
    fullCatalog: fullCatalog,
    defaultLayout: defaultLayout,
    migrateLayout: migrateLayout,
    groupOf: groupOf,
    composeMain: composeMain,
    composeLook: composeLook,
    composeAdvanced: composeAdvanced,
    composeAlerts: composeAlerts,
    cloneLayout: cloneLayout,
    moveRow: moveRow,
    setGroup: setGroup,
    createFolder: createFolder,
    removeFolder: removeFolder,
    rowsOfGroup: rowsOfGroup
  };
});
