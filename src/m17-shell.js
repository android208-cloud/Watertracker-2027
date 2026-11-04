/* M17 shell — оболочка: системные бары по измеренным цветам (C-010),
   «Назад» системой (C-013 через мост), нативные пикеры, спека иконки и
   стартового окна (C-011, C-012).
   Перенос с донора v158 как спеки: android-bridge.js целиком (байт-порт в
   m17-android-bridge.js): WaterBars синхронизирует цвета и флаги значков
   системных панелей по тому, что реально нарисовано (v149: флаги — настоящие
   булевы, числа 1/0 в Java-boolean на части WebView приходят как false);
   WaterBack отдаёт системную кнопку «Назад» цепи M20; WaterNative — системные
   NumberPicker/DatePicker/TimePickerDialog.
   Конструктор: мост не знает модулей — фасад навешивает крюки __backStep/
   __backAvailable/__waterGoHome из M20/M16 и зовёт syncBars после рендера.
   Спека иконки и стартового окна — числа контрактов, их исполняет сборка APK
   (ресурсы копируются из донора на шаге сборки, байты сверяются стендом).
   Связи: вниз — M20 (цепь «Назад», оболочка), M16 (goHome); вверх — Kotlin-
   оболочка WebView (WaterBridge/WaterShell). */
(function (W) {
  "use strict";
  /* C-011: legacy-мордочка и adaptive-фореграунд. */
  var ICON_SPEC = {
    legacy: { face: [0.5104, 0.5, 0.6146], bg: "#2EA0EA" },
    adaptive: { faceShare: 0.34, faceCy: 0.5746 }
  };
  /* C-012: стартовое окно и фон под WebView — с мордочкой. */
  var SPLASH_SPEC = { withFace: true, bgFollowsTheme: true };

  /* Крюки мостов: системная «Назад» идёт цепью M20, тап по уведомлению —
     goHome M16/M20. env = { shell (WT2U shellState-объект или fn), render }. */
  function bind(env) {
    W.__backAvailable = function () {
      var sh = typeof env.shell === "function" ? env.shell() : env.shell;
      return W.WT2U.backAvailable(sh);
    };
    W.__backStep = function () {
      var sh = typeof env.shell === "function" ? env.shell() : env.shell;
      return W.WT2U.backStep(sh, env.env || {
        has: function (sel) { return !!document.querySelector(sel); },
        render: env.render, closeSheet: env.closeSheet, closeSwipes: env.closeSwipes
      });
    };
    W.__waterGoHome = function () {
      var sh = typeof env.shell === "function" ? env.shell() : env.shell;
      W.WT2U.goHome(sh, env.env || { render: env.render, closeSwipes: env.closeSwipes });
    };
    if (W.WaterBars && typeof W.WaterBars.sync === "function") W.WaterBars.sync();
  }
  function syncBars() { if (W.WaterBars) W.WaterBars.sync(); }

  if (W.WT2R) W.WT2R.register({
    id: "M17", file: "m17-shell.js (+m17-android-bridge.js)", layer: 5, optional: false,
    contracts: ["C-010", "C-011", "C-012", "C-013"],
    events: [],
    status: "ported"
  });
  W.WT2X = { ICON_SPEC: ICON_SPEC, SPLASH_SPEC: SPLASH_SPEC, bind: bind, syncBars: syncBars };
})(window);
