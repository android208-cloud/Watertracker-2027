/* Модуль настроек «Лего» (v124): экраны «Настройки», «Дополнительно»,
   дерево уведомлений и их диалоги. Поведение (действия, состояние, бекап,
   помощники уведомлений) остаётся в app.js: модуль получает окружение
   вызовом и возвращает разметку. Переезд без визуальных изменений. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SettingsUI = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var E = null;

  /* ——— Общие «кубики» строк для блоков settings-model.js ——— */
  function sRow(title, sub, extra, act, cls) {
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    if (!window.UiKit) return "";
    return UiKit.row({ ui: act ? "set-" + act : "set-" + (cls || "plain"), title: title, sub: sub, right: extra, act: act, cls: cls });
  }
  function sBox(on, key) {
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    return UiKit.checkBox(on, key, uiIcon("tick"), "box-" + key);
  }
  /* Строка-переключатель: нажимается целиком, квадратик — только метка. */
  function sSwitch(title, sub, key, on) {
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    return UiKit.row({ ui: "sw-" + key, kind: "switch", cls: "switch-row", title: title, sub: sub, key: key, on: on, tick: uiIcon("tick") });
  }
  /* Рендер блоков модели настроек: заголовки, строки, переключатели,
     заказные строки (профиль/синхронизация/версия) из customs. */
  function renderSettingsBlocks(blocks, customs) {
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    var out = "";
    (blocks || []).forEach(function (b) {
      if (!b || b.visible === false) return;
      /* v125: коллапсов больше нет — секции только обычные, подпапки стали
         строками-дверями (модель их кладёт в items как type row).
         v127: содержимое собирается раньше заголовка — блок, оставшийся
         пустым (например, custom-строка отцепленного модуля цвета), не
         рисуется вовсе: дренаж модуля не оставляет висячих заголовков. */
      var body = "";
      (b.items || []).forEach(function (it) {
        if (!it || it.visible === false) return;
        if (it.type === "custom") { body += (customs && customs[it.custom]) || ""; return; }
        if (it.type === "switch") { body += sSwitch(it.title, it.sub || "", it.key, !!it.on); return; }
        var extra = it.type === "check" ? sBox(!!it.on, it.key) : "";
        var act = it.enabled === false ? "" : (it.act || "");
        var cls = it.enabled === false ? "off" : (it.cls || "");
        body += sRow(it.title, it.sub || "", extra, act, cls);
      });
      if (!body) return;
      if (b.title) out += "<div class=\"n-section\">" + b.title + "</div>";
      out += body;
    });
    return out;
  }

  /* «Норма воды»: рекомендуемая и своя норма выбираются в одном диалоге. */
  function normDialogHtml() {
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    var recommended = state.useRecommended !== false;
    var recLbl = volLabel(recommendedMl());
    var custLbl = volLabel(state.customGoalMl || state.goalMl || 1950);
    if (!window.UiKit) return "";
    return UiKit.dialog({ ui: "norm",
      scrimAct: "norm-cancel",
      cls: "modal n-modal norm-modal",
      title: "Норма воды",
      body: UiKit.optionList({ ui: "norm",
        act: "pick-norm", attr: "v", items: [
          { value: "recommended", label: "Рекомендуемая — " + recLbl, on: recommended },
          { value: "custom", label: "Своя — " + custLbl, on: !recommended }
        ]
      }),
      actions: [{ act: "norm-cancel", label: "Отмена" }]
    });
  }

  /* v123: меню подписи миски-тамогочи. */
  function cupLabelDialogHtml() {
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    if (!window.UiKit) return "";
    var mode = state.cupLabel === "countdown" ? "countdown" : "left";
    return UiKit.dialog({ ui: "cup-label",
      scrimAct: "cup-label-cancel",
      cls: "modal n-modal",
      title: "Миска",
      body: '<p class="svg-export-note">Подпись пилюли с чашкой рядом с котом: как показывать, сколько до пустой.</p>' +
        UiKit.optionList({ ui: "cup-label", act: "pick-cup-label", attr: "mode",
          items: [
            { value: "left", label: "По умолчанию — «1 ч», «41 мин»", on: mode === "left" },
            { value: "countdown", label: "Обратный отсчёт — «1:05», ниже часа «05:32»", on: mode === "countdown" }
          ] }),
      actions: [{ act: "cup-label-cancel", label: "Отмена" }]
    });
  }

  /* Подписи строк и вычисленные флаги — контекст для модели (v125: общий
     для главного экрана, подпапок и редактора порядка). */
  function settingsCtx() {
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    var signed = cloud.signedIn;
    var gender = state.gender === "female" ? "Женский" : "Мужской";
    var recommended = state.useRecommended !== false;
    var goal = state.goalMl || 1950;
    var n = ensureAlerts();
    var win0 = notifyWindow(todayStr());
    var hab = window.HabitSchedule ? window.HabitSchedule.computeProfile(state.entries, {
      dayStart: state.dayStart || "02:00", afterWakeMin: n.afterWakeMin,
      beforeSleepMin: n.beforeSleepMin, todayIso: todayStr()
    }) : null;
    return {
      flags: { signedIn: signed, dialTime: !!state.dialTime, oneplus: resolvedTheme() === "oneplus", vibroDial: state.vibroDial !== false,
        /* v126: дев-гейт входа в редактор + строки уведомлений для общего каталога. */
        devMode: !!state.devMode,
        whenGoalMet: n.whenGoalMet, evenIfRecent: n.evenIfRecent, holdUntilDrink: n.holdUntilDrink,
        alertVibrate: n.vibrate !== false, alertOn: !!n.enabled },
      labels: {
        alertSoundSub: esc(alertSoundTitle(n.sound)),
        alertTestSub: "Покажет напоминание со звуком «" + esc(alertSoundTitle(n.sound)) + "»",
        alertTextsSub: (function () {
          var t = n.texts && typeof n.texts === "object" ? n.texts : {};
          var c = 0;
          ["normal", "met"].forEach(function (k) { if (t[k] && (String(t[k].t || "").trim() || String(t[k].b || "").trim())) c++; });
          return c ? "Свои фразы: " + c + " из 2 случаев" : "Заголовки и тексты двух случаев";
        })(),
        alertPeriodSub: esc(win0.from + "-" + win0.to),
        habitSchedSub: hab ? window.HabitSchedule.subLabel(hab, esc) : "",
        alertFreqSub: esc(E.freqSubLabel ? E.freqSubLabel() : freqLabel(n.everyMin)),
        gender: esc(gender),
        weight: esc(fmtWeight(state.weightKg)),
        units: isImperial() ? "фунт./унц." : "кг/мл",
        dayStart: esc(fmtDayStart()),
        norm: esc(volLabel(recommended ? recommendedMl() : (state.customGoalMl || goal)) + (recommended ? " · рекомендуемая" : " · своя")),
        cupLabel: state.cupLabel === "countdown" ? "Подпись: обратный отсчёт" : "Подпись: остаток времени",
        theme: esc(THEME_NAMES[state.theme] || "Системная"),
        /* v125: живая подпись двери «Уведомления». */
        alertsDoor: n.enabled ? esc(freqLabel(n.everyMin)) : "выключены"
      }
    };
  }

  /* Строки, которые app.js рисует целиком (профиль, синхронизация, версия,
     каталог волны) — собираются один раз и передаются в renderSettingsBlocks. */
  function customRows() {
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    /* Профиль и синхронизация — из настоящего Google-аккаунта. */
    var signed = cloud.signedIn;
    var name = cloud.name || cloud.email || "Аккаунт Google";
    var cloudPic = signed ? avatarSrc() : "assets/images/profile.png";
    function line(title, sub, extra, act, cls) {
      var tag = act ? "button" : "div";
      return "<" + tag + " class=\"n-row" + (cls ? " " + cls : "") + "\"" + (act ? " type=\"button\" data-act=\"" + act + "\"" : "") + "><span class=\"ttl\">" + title + (sub ? "<small>" + sub + "</small>" : "") + "</span>" + (extra || "") + "</" + tag + ">";
    }
    /* Во время обмена с Диском стрелки крутятся — видно, что идёт работа. */
    var syncIco = "<span class=\"set-sync" + (cloud.busy ? " spinning" : "") + "\" aria-hidden=\"true\"><svg viewBox=\"0 0 24 24\"><path d=\"M20 12a8 8 0 0 1-13.5 5.8L4 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/><path d=\"M4 12a8 8 0 0 1 13.5-5.8L20 8\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/><path d=\"M20 4v4h-4M4 20v-4h4\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg></span>";
    var guest = "<span class=\"guest-ava\" aria-hidden=\"true\"><svg viewBox=\"0 0 48 48\"><circle cx=\"24\" cy=\"24\" r=\"22\" fill=\"#8b9198\"/><path d=\"M24 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z\" fill=\"none\" stroke=\"#fff\" stroke-width=\"1.8\"/><path d=\"M12.5 36.5c1.8-6 6-8.6 11.5-8.6s9.7 2.6 11.5 8.6\" fill=\"none\" stroke=\"#fff\" stroke-width=\"1.8\" stroke-linecap=\"round\"/></svg></span>";
    var profileRow = !cloudBridge()
      ? UiKit.row({ ui: "profile", cls: "profile-row", act: "cloud-needapp", lead: guest, title: "Войти через Google", sub: "доступно в приложении для Android" })
      : signed
      ? UiKit.row({ ui: "profile", cls: "profile-row", act: "open-profile", lead: "<span class=\"ava-round ava-row\"><img class=\"profile-ava\" src=\"" + esc(cloudPic) + "\" alt=\"></span>", title: esc(name) })
      : UiKit.row({ ui: "profile", cls: "profile-row", act: "google-signin", lead: guest, title: "Войти через Google" });
    var syncRow = signed ? line("Синхронизация", "<span class=\"sync-when\">" + esc(cloudBackupLabel()) + "</span>", syncIco, "cloud-sync") : "";
    return {
      profile: profileRow,
      sync: syncRow,
      version: "<p class=\"set-ver\">Версия " + APP_VERSION + "</p>",
      /* v117: каталог волны; с v125 живёт в подпапке «Волна». */
      wave: window.LiquidColor ? LiquidColor.waveHtml() : "",
      /* v127: блоки модулей цвета — строки каталога (разделы даёт модель). */
      liqBlock: window.LiquidColor ? LiquidColor.colorHtml() : "",
      bubBlock: window.LiquidColor ? LiquidColor.bubblesHtml() : "",
      chartBlock: window.ChartColor ? ChartColor.colorHtml() : ""
    };
  }

  function pageSettings(env) {
    E = env;
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    /* v125: состав и порядок экрана — раскладка state.sLayout (модель
       собирает блоки: секции-каркас, двери подпапок как обычные строки,
       фиксированные «Порядок строк» и версия). */
    return "" +
      "<header class=\"top plain\"><h1>Настройки</h1></header>" +
      renderSettingsBlocks(window.SettingsModel ? SettingsModel.composeMain(settingsCtx(), state.sLayout) : [], customRows());
  }

  /* v125: экран подпапки — шапка с возвратом и строки своей группы
     (глубина 1 уровень: дверей внутри подпапки не бывает). */
  function pageFolder(env, id) {
    E = env;
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    if (!window.SettingsModel) return "";
    /* v127: каталог полный — строки подпапки могут родом быть с любого
       экрана (waveBox/вибро теперь из «Внешнего вида»). */
    var cat = SettingsModel.fullCatalog(settingsCtx());
    var lay = SettingsModel.migrateLayout(state.sLayout, cat);
    var f = null;
    lay.folders.forEach(function (x) { if (x.id === id) f = x; });
    if (!f) return "";
    var items = [];
    lay.order.forEach(function (k) {
      if (k.indexOf("@") === 0) return;
      if (SettingsModel.groupOf(lay, k) !== "@" + id) return;
      if (cat[k] && cat[k].visible !== false) items.push(cat[k]);
    });
    var body = items.length
      ? renderSettingsBlocks([{ title: null, items: items }], customRows())
      : '<p class="hint">В подпапке пока пусто.</p>';
    return UiKit.header({ ui: "folder-" + id, cls: "top plain sub", back: uiIcon("back"), title: esc(f.title) }) + body;
  }

  /* v125: редактор порядка — плоский список строк всех экранов: стрелки
     с вибро-тиком (тик на стороне app.js), ярлычок-группа с меню «куда
     положить», внизу блок «Подпапки» с созданием и удалением. */
  function socialIcon(kind) {
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    if (kind === "fb") return "<svg viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"12\" fill=\"#1877f2\"/><path d=\"M13.4 19v-6h2l.3-2.3h-2.3V9.2c0-.7.2-1.1 1.2-1.1H16V6.1c-.2 0-.9-.1-1.7-.1-1.7 0-2.9 1-2.9 2.9v1.8H9.2V13h2.2v6h2z\" fill=\"#fff\"/></svg>";
    if (kind === "g") return "<svg viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"12\" fill=\"#fff\"/><path d=\"M17.6 12.2c0-.4 0-.8-.1-1.2H12v2.3h3.1c-.1.8-.6 1.5-1.3 2v1.6h2.1c1.2-1.1 1.7-2.8 1.7-4.7z\" fill=\"#4285f4\"/><path d=\"M12 18c1.7 0 3.1-.6 4.1-1.5l-2.1-1.6c-.6.4-1.3.6-2 .6-1.6 0-2.9-1-3.4-2.5H6.4v1.6C7.4 16.7 9.5 18 12 18z\" fill=\"#34a853\"/><path d=\"M8.6 13c-.1-.4-.2-.8-.2-1.2s.1-.8.2-1.2V9H6.4C6.1 9.6 6 10.3 6 11s.1 1.4.4 2l2.2-1.6z\" fill=\"#fbbc05\"/><path d=\"M12 8.5c.9 0 1.7.3 2.3.9l1.7-1.7C14.9 6.7 13.6 6 12 6 9.5 6 7.4 7.3 6.4 9l2.2 1.6c.5-1.5 1.8-2.1 3.4-2.1z\" fill=\"#ea4335\"/></svg>";
    if (kind === "vk") return "<svg viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"12\" fill=\"#2787f5\"/><path d=\"M12.6 16.2h1.1s.3 0 .5-.2c.1-.2.1-.5.1-.5s0-1.5.7-1.7 1.6 1.5 2.5 2.1c.7.5 1.2.4 1.2.4l2.5-.1s1.3-.1.7-1.1c-.1-.1-.5-.8-2.4-2.3-2-1.6-1.7-1.3.7-4.1 1.5-1.7 2-2.7 1.9-3.2-.2-.4-1.2-.3-1.2-.3l-2.8.1s-.2 0-.4.1c-.1.1-.2.3-.2.3s-.4 1.1-.9 2c-1.1 1.9-1.6 2-1.8 1.9-.4-.2-.3-1-.3-1.5 0-1.6.2-2.3-.5-2.5-.2 0-.4-.1-1-.1-.8 0-1.4 0-1.8.2-.2.1-.4.4-.3.4.2.1.4.2.6.6.2.4.2 1.3.2 1.3s.1 1.8-.5 2c-.5.2-1.1-.2-2.5-2.1-.7-.9-1.2-2-1.2-2s0-.2-.1-.3l-.4-.1h-2.7s-.4 0-.6.2c-.1.2 0 .5 0 .5s2.1 4.9 4.5 7.4c2.2 2.3 4.6 2.1 4.6 2.1z\" fill=\"#fff\"/></svg>";
    return "<svg viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"12\" fill=\"#fff\"/><path d=\"M16.2 8.2c-.8-.9-1.9-1.4-3.3-1.4-1.6 0-2.8.7-3.5 1.8-.4.6-.7 1.4-.7 2.2 0 .7.2 1.4.6 2 .8 1.2 2.1 1.9 3.6 1.9 1.2 0 2.2-.4 2.9-1.1-.2-.4-.5-.7-.9-.9-.6.6-1.3.9-2.1.9-1.1 0-2-.6-2.4-1.5h5.6v-.6c0-1.1-.3-2.1-.8-2.8zm-5.2 2.6c.3-.8 1-1.3 1.9-1.3.8 0 1.4.5 1.7 1.3h-3.6z\" fill=\"#111\"/></svg>";
  }

  function themeDialogHtml() {
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    var opts = [
      ["system", "По умолчанию"],
      ["light", "Светлая тема"],
      ["dark", "Тёмная тема"],
      ["oneplus", "Oneplus 7"]
    ];
    if (!window.UiKit) return "";
    return UiKit.dialog({ ui: "theme",
      scrimAct: "theme-cancel",
      cls: "modal n-modal theme-modal",
      title: "Выбор темы",
      body: UiKit.optionList({ ui: "theme",
        act: "pick-theme", attr: "v",
        items: opts.map(function (o) {
          return { value: o[0], label: o[1], on: state.theme === o[0] };
        })
      }),
      actions: [{ act: "theme-cancel", label: "Отмена" }]
    });
  }

  function pageAdvanced(env) {
    E = env;
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    var dupes = duplicateStats().count;
    var ctx = {
      flags: {
        devMode: !!state.devMode,
        animOff: !state.animation,
        warnExceed: !!state.warnExceed,
        svgEditor: !!state.svgEditor,
        systemDrums: !!state.systemDrums,
        systemCalendar: !!state.systemCalendar,
        systemClock: !!state.systemClock,
        hasBackup: !!state.historyBackup,
        hasDupes: !!dupes,
        skinOn: skinOn(),
        cloudBridge: !!(cloudBridge() && cloud.available)
      },
      labels: {
        animNote: state.animation
          ? (catRiveFailed ? "Играет готовая анимация" : "Анимация включена")
          : "Сейчас статичные кадры",
        backupNote: state.historyBackup
          ? state.historyBackup.entries.length + " записей, " + ruDate(new Date(state.historyBackup.at).toISOString().slice(0, 10))
          : "",
        dupesNote: "найдено повторов: " + dupes,
        loadNote: state.historyCounts
          ? state.historyCounts.entries + " записей, " + ruDate(state.historyCounts.from) + " — " + ruDate(state.historyCounts.to)
          : (noBuiltinBase ? "из файла: JSON или CSV" : "из базы оригинала (.db)"),
        exportNote: historyExportSummary(),
        saveDbNote: dbSaveHint(),
        shareDbNote: dbShareHint(),
        svgSaveNote: window.__singleFile ? "Отсюда запись недоступна — есть перенос" : "Размер и положение останутся после очистки браузера",
        skinNote: state.skin
          ? "Применён: " + String(state.skinRev || "без ревизии") + " · правок: " + skinCount(state.skin)
          : "Скина нет — JSON приходит из студии кубиков",
        drumsNote: systemDrumNote(),
        calNote: systemCalNote(),
        clockNote: systemClockNote()
      }
    };
    return UiKit.header({ ui: "advanced", cls: "top plain sub", back: uiIcon("back"), title: "Дополнительно" }) +
      renderSettingsBlocks(window.SettingsModel ? SettingsModel.composeAdvanced(ctx, state.sLayout) : [], customRows());
  }

  /* v127: «Внешний вид» — четвёртый системный экран: куча (дверь «Волны»,
     тема) → «Живые настройки» → «Цвет жидкости» → «Цвет графика» →
     «Системный ввод» (dev) → миска/циферблат/вибро. Блоки идут в порядке
     строк раскладки (composeLook), custom-строки рисуют модули цвета. */
  function pageLook(env) {
    E = env;
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    var sctx = settingsCtx();
    var ctx = {
      flags: Object.assign({}, sctx.flags, {
        animOff: !state.animation,
        warnExceed: !!state.warnExceed,
        systemDrums: !!state.systemDrums,
        systemCalendar: !!state.systemCalendar,
        systemClock: !!state.systemClock
      }),
      labels: Object.assign({}, sctx.labels, {
        animNote: state.animation
          ? (catRiveFailed ? "Играет готовая анимация" : "Анимация включена")
          : "Сейчас статичные кадры",
        drumsNote: systemDrumNote(),
        calNote: systemCalNote(),
        clockNote: systemClockNote()
      })
    };
    return UiKit.header({ ui: "look", cls: "top plain sub", back: uiIcon("back"), title: "Внешний вид" }) +
      renderSettingsBlocks(window.SettingsModel ? SettingsModel.composeLook(ctx, state.sLayout) : [], customRows());
  }

  /* Профиль: с Google-аккаунтом показываем имя, почту, ID и состояние копии;
     без него — приглашение войти. В браузере входа нет, и это сказано прямо. */
  function pageRegister() {
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    var noBridge = !cloudBridge();
    var back = UiKit.header({ ui: "register", cls: "top plain sub", back: uiIcon("back"), title: cloud.signedIn ? "Профиль" : "Регистрация" });
    if (cloud.signedIn) {
      var pic = avatarSrc();
      function field(label, value) {
        return '<div class="prof-field"><span class="lbl">' + label + '</span><span class="val">' + esc(value) + "</span></div>";
      }
      /* Данные профиля иногда не приходят с первого раза. Вместо прочерка
         говорим как есть и даём кнопку, чтобы попросить их ещё раз. */
      var noProfile = !cloud.email && !cloud.name;
      var refreshRow = noProfile || !cloud.email
        ? '<button type="button" class="reg-link" data-act="cloud-profile">Обновить данные профиля</button>'
        : "";
      return back +
        '<div class="prof-body">' +
        '<span class="ava-round ava-big"><img class="prof-ava" src="' + esc(pic) + '" alt=""></span>' +
        '<div class="prof-name">' + socialIcon("g") + "<span>" + esc(cloud.name || "Аккаунт Google") + "</span></div>" +
        '<div class="prof-fields">' +
        field("Почта", cloud.email || "не прочиталась") +
        (cloud.accountId ? field("ID", cloud.accountId) : "") +
        field("Синхронизация", cloudBackupLabel()) +
        "</div>" +
        '<div class="prof-actions">' +
        '<button type="button" class="reg-btn" data-act="cloud-save">Сохранить копию</button>' +
        '<button type="button" class="reg-link" data-act="cloud-restore">Восстановить из облака</button>' +
        refreshRow +
        '<button type="button" class="reg-link danger" data-act="cloud-signout">Выйти</button>' +
        "</div></div>";
    }
    var socials = noBridge ? "" :
      '<p class="reg-via">Другие способы</p>' +
      '<div class="reg-social">' +
      '<button type="button" data-act="reg-other" data-via="fb" aria-label="Facebook">' + socialIcon("fb") + "</button>" +
      '<button type="button" data-act="reg-google" aria-label="Google">' + socialIcon("g") + "</button>" +
      '<button type="button" data-act="reg-other" data-via="vk" aria-label="ВКонтакте">' + socialIcon("vk") + "</button>" +
      '<button type="button" data-act="reg-other" data-via="apple" aria-label="Apple">' + socialIcon("apple") + "</button>" +
      "</div>";
    return back +
      '<div class="reg-body"><p>' + (noBridge
        ? "Вход через Google работает в приложении для Android — в браузере его нет."
        : "Чтобы история не потерялась при смене телефона, войдите в Google-аккаунт: " +
          "копия будет лежать в вашей папке на Google Диске.") + "</p>" +
      '<button type="button" class="reg-btn" data-act="' + (noBridge ? "cloud-needapp" : "reg-google") + '">Войти через Google</button>' +
      socials + "</div>";
  }

  /* Строка-переключатель: нажимается целиком — на телефоне так надёжнее. */
  function alertSwitch(title, on, key) {
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    return UiKit.row({ ui: "sw-" + key, kind: "switch", cls: "switch-row", title: title, key: key, on: on, tick: uiIcon("tick") });
  }

  function pageAlerts(env) {
    E = env;
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    return UiKit.header({ ui: "alerts", cls: "top plain", title: "Уведомления" }) + alertsBody();
  }

  /* v125: колокольчик — ярлык: та же страница, но с возвратом в настройки. */
  function pageFolderAlerts(env) {
    E = env;
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    return UiKit.header({ ui: "folder-alerts", cls: "top plain sub", back: uiIcon("back"), title: "Уведомления" }) + alertsBody();
  }

  /* Содержимое экрана уведомлений — одно на ярлык и на подпапку.
     v126: состав и порядок — из раскладки (composeAlerts); свои строки
     рисуются прежней разметкой (реестр data-ui и подсказки на местах),
     чужие (переложенные с других экранов) — общими кубиками. */
  function alertsBody() {
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    var n = ensureAlerts();
    var win = notifyWindow(todayStr());
    var hab = window.HabitSchedule ? window.HabitSchedule.computeProfile(state.entries, {
      dayStart: state.dayStart || "02:00", afterWakeMin: n.afterWakeMin,
      beforeSleepMin: n.beforeSleepMin, todayIso: todayStr()
    }) : null;
    var mctx = settingsCtx();
    var acat = SettingsModel ? SettingsModel.fullCatalog(mctx) : {};
    var native = {
      whenGoalMet: function () { return alertSwitch("Присылать напоминания, когда норма уже выпита", n.whenGoalMet, "whenGoalMet"); },
      evenIfRecent: function () { return alertSwitch("Присылать напоминания, даже если недавно пили воду", n.evenIfRecent, "evenIfRecent"); },
      holdUntilDrink: function () { return alertSwitch("Не гасить напоминание, пока не добавлена порция", n.holdUntilDrink, "holdUntilDrink"); },
      alertSound: function () { return UiKit.row({ ui: "alert-sound", title: "Звук уведомления", sub: esc(alertSoundTitle(n.sound)), act: "open-alert-sound" }); },
      alertVibrate: function () { return UiKit.row({ ui: "alert-vibrate", kind: "switch", cls: "switch-row", title: "Вибрация", key: "alertVibrate", on: n.vibrate, tick: uiIcon("tick") }); },
      alertTest: function () { return UiKit.row({ ui: "alert-test", title: "Проверить уведомление", sub: "Покажет напоминание со звуком «" + esc(alertSoundTitle(n.sound)) + "»", act: "alert-test" }); },
      sysNote: function () { return UiKit.row({ ui: "sys-note", title: "Системные настройки", sub: "Звук, вибрация и приоритет в Android", act: "sys-note" }); },
      alertPeriod: function () { return UiKit.row({ ui: "alert-period", title: "Период уведомлений", sub: esc(win.from + "-" + win.to), act: "open-alert-period" }); },
      habitSched: function () { return UiKit.row({ ui: "alert-habit", title: "Расписание по привычке", sub: hab ? window.HabitSchedule.subLabel(hab, esc) : "", act: "open-alert-habit" }); },
      /* v133: живая подпись темпа («следующее через …») — через env app. */
      alertFreq: function () { return UiKit.row({ ui: "alert-freq", title: "Частота", sub: esc(E.freqSubLabel ? E.freqSubLabel() : freqLabel(n.everyMin)), act: "open-alert-freq" }); },
      alertOn: function () { return alertSwitch("Включить уведомления", n.enabled, "alertOn"); }
    };
    if (!window.SettingsModel) {
      /* Без модели — прежний фиксированный порядок (страховка). */
      return Object.keys(native).map(function (k) { return native[k](); }).join("");
    }
    var secs = SettingsModel.composeAlerts(state.sLayout, acat);
    return secs.map(function (sec) {
      if (!sec.ids.length) return "";
      var rows = sec.ids.map(function (id) {
        var html = native[id] ? native[id]() : renderSettingsBlocks([{ title: null, items: [acat[id]] }], customRows());
        var hint = (acat[id] || {}).hint;
        return html + (hint ? '<p class="hint">' + hint + "</p>" : "");
      }).join("");
      return '<div class="n-section">' + sec.title + "</div>" + rows;
    }).join("");
  }


  /* ── v131: выгрузка структуры настроек (дерево положений) ─────────────
     Модульные строки (цвет жидкости/графика, пузырьки, волна) рисуют сами
     модули — в каталоге настроек их нет. Для файла выгрузки держим зеркало
     их текущего содержимого; тест tools/struct-export-test.js сверяет
     зеркало с тем, что реально нарисовано на экранах (дрейф поймает). */
  var STRUCT_MIRROR = {
    liqBlock: [
      ["row", "Сосуд"], ["row", "Доминирующий напиток"], ["row", "Доминирующий с гистерезисом"],
      ["row", "Последняя порция"], ["row", "Пояс графика"], ["row", "Вода-база с тонировкой"],
      ["switch", "Плавная смена цвета"], ["switch", "Разбавлять при малом заполнении"], ["switch", "Пузырьки в цвет напитка"]
    ],
    /* v136: чистка «Цвета графика» — три режима, без «Разбавлять»
       («Пояс графика» живёт в цвете жидкости кота). */
    chartBlock: [
      ["switch", "Ежедневный график тем же цветом"],
      ["row", "Сосуд"], ["row", "Доминирующий напиток"], ["row", "Вода-база с тонировкой"]
    ],
    bubBlock: [
      ["slider", "Пузырьков в воде"], ["slider", "Размер пузырьков"], ["slider", "Скорость всплытия"],
      ["slider", "Линия старта пузырьков"], ["slider", "Положение пузырьков по горизонтали"], ["slider", "Прозрачность пузырьков"]
    ],
    waveCommon: [
      ["switch", "Волна"], ["slider", "Число волн"], ["slider", "Высота гребня"],
      ["slider", "Ширина гребня"], ["slider", "Расстояние между волнами"], ["row", "Скопировать настройки"]
    ],    waveCard: [
      ["switch", "Направление вправо"], ["slider", "Скорость волны"], ["slider", "Смещение по вертикали"],
      ["slider", "Градиент гребня"], ["slider", "Прозрачность волны"], ["slider", "Интенсивность цвета"]
    ]

  };

  function mirrorNodes(list) {
    return list.map(function (p) { return { kind: p[0], title: p[1] }; });
  }

  /* Блоки compose* приходят двух форм: {title, items:[строки]} (главный,
     «Внешний вид», «Дополнительно») и {title, ids:[ключи]} (уведомления);
     блоки без заголовка — «кучи» — их строки ложимся в родителя напрямую.
     Невидимые строки (visible:false) в дерево не попадают — на экране их нет. */
  function structChildren(secList, env, cat) {
    var out = [];
    (secList || []).forEach(function (sec) {
      var rows = sec.items ? sec.items
        : (sec.ids || []).map(function (id) { return cat[id]; }).filter(Boolean);
      var kids = [];
      rows.filter(function (r) { return r && r.id && r.visible !== false; }).forEach(function (r) {
        /* Модульный блок не даёт своего узла: его строки ложатся в секцию
           напрямую — как на экране, где блок рисует содержимое раздела. */
        if (STRUCT_MIRROR[r.id]) { kids = kids.concat(mirrorNodes(STRUCT_MIRROR[r.id])); return; }
        var n = structNode(r.id, env, cat);
        if (n) kids.push(n);
      });
      if (!kids.length) return;
      if (sec.title) out.push({ kind: "section", title: sec.title, children: kids });
      else out = out.concat(kids);
    });
    return out;
  }

  function structNode(id, env, cat) {
    var SM = env.SettingsModel, state = env.state;
    if (id === "look" || id === "advanced" || id === "alertsDoor") {
      var secs = id === "look" ? SM.composeLook({ flags: {}, labels: {} }, state.sLayout)
        : id === "advanced" ? SM.composeAdvanced({ flags: {}, labels: {} }, state.sLayout)
        : SM.composeAlerts(state.sLayout, cat);
      var row = cat[id] || {};
      return { kind: "screen", title: row.title || id, children: structChildren(secs, env, cat) };
    }
    if (id.charAt(0) === "@") {
      var fid = id.slice(1);
      var folder = (state.sLayout.folders || []).filter(function (f) { return f.id === fid; })[0];
      var title = folder ? folder.title : fid;
      var kids;
      if (fid === "wave") {
        kids = mirrorNodes(STRUCT_MIRROR.waveCommon);
        var n = (window.LiquidColor && window.LiquidColor.waveCount) ? window.LiquidColor.waveCount() : 2;
        for (var i = 1; i <= n; i++) {
          kids.push({ kind: "section", title: "Волна " + i + (i === 1 ? " (передняя)" : ""), children: mirrorNodes(STRUCT_MIRROR.waveCard) });
        }
      } else {
        kids = SM.rowsOfGroup(state.sLayout, cat, id).map(function (rid) { return structNode(rid, env, cat); }).filter(Boolean);
      }
      return { kind: "folder", title: title, children: kids };
    }
    var r = cat[id];
    if (!r) {
      /* «Версия» прибрита и в каталоге не живёт — в дереве ей место есть. */
      if (id === "version") return { kind: "row", title: "Версия", badge: "прибита внизу" };
      return null;
    }
    /* Кастомные строки (профиль, синхронизация) заголовок держат не в каталоге. */
    var CUSTOM_TITLES = { profile: "Профиль и вход", sync: "Синхронизация" };
    return { kind: r.type === "switch" ? "switch" : r.type === "check" ? "check" : "row", title: r.title || CUSTOM_TITLES[id] || id };
  }

  /* Дерево положений: экраны, разделы, строки — как видит владелец, плюс
     техническая раскладка (порядок/группы/подпапки) вторым ключом. */
  function structTree(env) {
    var SM = env.SettingsModel, state = env.state;
    var cat = SM.fullCatalog({ flags: {}, labels: {} });
    var kids = structChildren(SM.composeMain({ flags: {}, labels: {} }, state.sLayout), env, cat);
    var lay = state.sLayout || {};
    return {
      title: "Настройки", kind: "root", children: kids,
      layout: {
        order: (lay.order || []).slice(),
        groups: Object.assign({}, lay.groups || {}),
        folders: (lay.folders || []).map(function (f) { return { id: f.id, title: f.title }; })
      }
    };
  }

  function structJson(env) {
    return JSON.stringify(structTree(env), null, 1);
  }

  function pageStructExport(env) {
    E = env;
    var esc = E.esc, uiIcon = E.uiIcon, UiKit = E.UiKit, todayStr = E.todayStr;
    var json = structJson(env);
    var name = "vodomer-struktura-" + todayStr() + ".json";
    return UiKit.header({ ui: "struct-export", cls: "top plain sub", back: uiIcon("back"), title: "Структура настроек" })
      + '<textarea id="struct-json" readonly spellcheck="false" style="width:100%;box-sizing:border-box;min-height:45vh;font:11px/1.45 monospace;background:#101418;color:#cde3ff;border:1px solid #33506b;border-radius:6px;padding:8px">' + esc(json) + "</textarea>"
      + UiKit.row({ ui: "struct-copy", title: "Скопировать", sub: "текст структуры в буфер обмена", act: "struct-copy" })
      + UiKit.row({ ui: "struct-save", title: "Сохранить файлом", sub: name, act: "struct-save" })
      + '<p class="hint">Дерево отражает текущие положения пунктов: экраны, разделы, подпапки и порядок строк. Вторая часть файла — техническая раскладка: по ней положение можно восстановить один в один.</p>';
  }

  /* Список мелодий: слева название, справа кнопка прослушивания и галочка. */
  function pageAlertSound(env) {
    E = env;
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    var n = ensureAlerts();
    var play = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.6v12.8L18.4 12z" fill="currentColor"/></svg>';
    var rows = ALERT_SOUNDS.map(function (snd) {
      var on = n.sound === snd.file;
      return UiKit.row({ ui: "sound",
        tag: "div", cls: "sound-row" + (on ? " on" : ""), act: "pick-sound", data: { file: snd.file },
        title: esc(snd.title), sub: on ? "выбран" : "нажмите, чтобы выбрать",
        right: '<button type="button" class="sound-play" data-act="play-sound" data-file="' + snd.file + '" aria-label="Прослушать">' + play + "</button>",
        check: true, on: on, tick: uiIcon("tick")
      });
    }).join("");
    return UiKit.header({ ui: "alert-sound", cls: "top plain sub", back: uiIcon("back"), title: "Звук уведомления" }) +
      rows +
      '<p class="wake-note">Мелодия звучит в напоминаниях, когда приложение закрыто. В приложении Android звук можно поменять и в системных настройках уведомлений.</p>';
  }



  function pageAlertPeriod(env) {
    E = env;
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    var n = ensureAlerts();
    var names = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
    var lines = names.map(function (name, i) {
      return '<div class="period-line"><span>' + name + "</span><span>" + esc(dayWindow(i)) + "</span></div>";
    }).join("");
    return UiKit.header({ ui: "alert-period", cls: "top plain sub", back: uiIcon("back"), title: "Период уведомлений" }) +
      UiKit.row({ ui: "gap-after", title: "После пробуждения", sub: esc(durationPhrase(n.afterWakeMin, "Через")), act: "open-gap", data: { kind: "after" } }) +
      UiKit.row({ ui: "gap-before", title: "До отхода ко сну", sub: esc(durationPhrase(n.beforeSleepMin, "За")), act: "open-gap", data: { kind: "before" } }) +
      '<div class="period-card">' + lines + "</div>";
  }

  /* v135: «Тексты уведомлений» — два случая (обычное / после нормы),
     заголовок + текст, живой пример с сегодняшними цифрами, плейсхолдеры
     {drunk}/{goal}/{left}. Пустое поле = фраза по умолчанию. */
  function pageAlertTexts(env) {
    E = env;
    var esc = E.esc, uiIcon = E.uiIcon, UiKit = E.UiKit, ensureAlerts = E.ensureAlerts;
    var n = ensureAlerts();
    var tx = n.texts && typeof n.texts === "object" ? n.texts : {};
    var DEF = {
      normal: { t: "Пора выпить воды", b: "Выпито {drunk} из {goal} мл" },
      met: { t: "Можно выпить хотя бы немного воды", b: "Выпито {drunk} из {goal} мл" }
    };
    function block(cas, title, hint) {
      var c = tx[cas] || {};
      var pv = E.notifyPreview ? E.notifyPreview(cas) : DEF[cas];
      return '<div class="n-section">' + title + "</div>" +
        '<p class="hint">' + esc(hint) + "</p>" +
        '<div class="nt-card">' +
        '<div class="nt-preview" data-case="' + cas + '"><b>' + esc(pv.title) + "</b><span>" + esc(pv.text) + "</span></div>" +
        '<label class="nt-lbl">Заголовок</label>' +
        '<input class="field" data-field="ntitle-' + cas + '" maxlength="65" placeholder="' + esc(DEF[cas].t) + '" value="' + esc(String(c.t || "")) + '">' +
        '<label class="nt-lbl">Текст</label>' +
        '<input class="field" data-field="ntext-' + cas + '" maxlength="240" placeholder="' + esc(DEF[cas].b) + '" value="' + esc(String(c.b || "")) + '">' +
        "</div>";
    }
    return UiKit.header({ ui: "alert-texts", cls: "top plain sub", back: uiIcon("back"), title: "Тексты уведомлений" }) +
      block("normal", "Обычное напоминание", "Пока норма дня не закрыта.") +
      block("met", "После нормы", "Когда норма выпита и включён тумблер «Присылать напоминания, когда норма уже выпита». В темповом режиме такие напоминания приходят каждые 2 часа.") +
      '<p class="hint">Пустое поле — фраза по умолчанию. В тексте работают подстановки: {drunk} — выпито, {goal} — норма, {left} — осталось. Сверху в каждой карточке — живой пример с сегодняшними цифрами.</p>';
  }

  function pageAlertDays(env) {
    E = env;
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    var n = ensureAlerts();
    var names = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
    var rows = names.map(function (name, i) {
      var d = n.days[i];
      return UiKit.row({ ui: "day", title: name, sub: esc(d.wake + " - " + d.sleep), act: "open-alert-edit", data: { day: i } });
    }).join("");
    return UiKit.header({ ui: "alert-days", cls: "top plain sub", back: uiIcon("back"), title: "Периоды активности" }) + rows;
  }

  function pageAlertEdit(env) {
    E = env;
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    var draft = ui.alertEdit;
    if (!draft) return pageAlertDays();
    var chips = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"].map(function (name, i) {
      return '<button type="button" class="day-chip' + (draft.days[i] ? " on" : "") + '" data-act="toggle-alert-day" data-day="' + i + '">' + name + "</button>";
    }).join("");
    var sun = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 3.2v2.2M12 18.6v2.2M3.2 12h2.2M18.6 12h2.2M6.1 6.1l1.6 1.6M16.3 16.3l1.6 1.6M17.9 6.1l-1.6 1.6M7.7 16.3l-1.6 1.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    var moon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.2 3.4a8.2 8.2 0 1 0 5.4 12.6 6.6 6.6 0 1 1-5.4-12.6z" fill="currentColor"/></svg>';
    return UiKit.header({ ui: "alert-edit", cls: "top plain sub", back: uiIcon("back"), title: "Настройка периодов" }) +
      '<div class="wake-card"><div class="wake-pair"><button type="button" class="wake-side" data-act="open-alert-clock" data-field="wake"><span class="wake-ico">' + sun + '</span><span>Пробуждение</span><b>' + esc(draft.wake) + "</b></button>" +
      '<span class="wake-split" aria-hidden="true"></span>' +
      '<button type="button" class="wake-side" data-act="open-alert-clock" data-field="sleep"><span class="wake-ico moon">' + moon + '</span><span>Отход ко сну</span><b>' + esc(draft.sleep) + "</b></button></div></div>" +
      '<p class="wake-note">Действует для следующих дней:</p><div class="day-chips">' + chips + "</div>";
  }

  function gapDialogHtml() {
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    var n = ensureAlerts();
    var after = ui.gapKind !== "before";
    var mins = after ? n.afterWakeMin : n.beforeSleepMin;
    var h = Math.floor((mins || 0) / 60);
    var m = (mins || 0) % 60;
    var title = after ? "Интервал времени после пробуждения" : "Интервал времени до отхода ко сну";
    if (!window.UiKit) return "";
    return UiKit.dialog({ ui: "gap",
      scrimAct: "gap-cancel",
      cls: "modal n-modal",
      title: title,
      body: timeEditorHtml("gap", "gap-h", "gap-m", h, m, "time-wheels n-wheels"),
      actions: [{ act: "gap-cancel", label: "Отмена" }, { act: "gap-ok", label: "Ок" }]
    });
  }

  function genderDialogHtml() {
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    var male = state.gender !== "female";
    if (!window.UiKit) return "";
    return UiKit.dialog({ ui: "gender",
      scrimAct: "gender-cancel",
      cls: "modal n-modal gender-modal",
      title: "Пол",
      body: UiKit.optionList({ ui: "gender",
        act: "gender", attr: "v", items: [
          { value: "male", label: "Мужской", on: male },
          { value: "female", label: "Женский", on: !male }
        ]
      }),
      actions: [{ act: "gender-cancel", label: "Отмена" }]
    });
  }

  function dayStartDialogHtml() {
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    var mins = L.minutesOf(dayStartValue());
    if (!window.UiKit) return "";
    return UiKit.dialog({ ui: "daystart",
      scrimAct: "day-start-cancel",
      cls: "modal n-modal",
      title: "Начало суток",
      body: '<p class="wake-note">До этого времени приём относится к предыдущим суткам. Смена действует с текущего дня: прошлая история остаётся посчитанной по прежнему началу суток.</p>' +
        timeEditorHtml("day", "day-h", "day-m", Math.floor(mins / 60), mins % 60, "time-wheels n-wheels"),
      actions: [{ act: "day-start-cancel", label: "Отмена" }, { act: "day-start-ok", label: "Ок" }]
    });
  }

  function unitsDialogHtml() {
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    var metric = !isImperial();
    if (!window.UiKit) return "";
    return UiKit.dialog({ ui: "units",
      scrimAct: "units-cancel",
      cls: "modal n-modal units-modal",
      title: "Единицы измерения",
      body: UiKit.optionList({ ui: "units",
        act: "pick-units", attr: "v", items: [
          { value: "metric", label: "кг/мл", on: metric },
          { value: "imperial", label: "фунт./унц.", on: !metric }
        ]
      }),
      actions: [{ act: "units-cancel", label: "Отмена" }]
    });
  }

  function freqDialogHtml() {
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    var n = ensureAlerts();
    var opts = [10, 30, 60, 90, 120, 150, 180, -1, 0];
    if (!window.UiKit) return "";
    return UiKit.dialog({ ui: "freq",
      scrimAct: "freq-cancel",
      cls: "modal n-modal freq-modal",
      title: "Частота",
      body: UiKit.optionList({ ui: "freq",
        act: "pick-freq", attr: "min",
        items: opts.map(function (min) {
          return { value: min, label: freqLabel(min), on: Number(n.everyMin) === min };
        })
      }),
      actions: [{ act: "freq-cancel", label: "Отмена" }]
    });
  }

  function clockDialogHtml() {
    var state=E.state, ui=E.ui, save=E.save, render=E.render, esc=E.esc, uiIcon=E.uiIcon,
      UiKit=E.UiKit, SettingsModel=E.SettingsModel, LiquidColor=E.LiquidColor, L=E.L,
      cloud=E.cloud, avatarSrc=E.avatarSrc, cloudBridge=E.cloudBridge, cloudBackupLabel=E.cloudBackupLabel,
      drinkById=E.drinkById, currentDrink=E.currentDrink, fmtWeight=E.fmtWeight, volLabel=E.volLabel,
      recommendedMl=E.recommendedMl, isImperial=E.isImperial, fmtDayStart=E.fmtDayStart, dayStartValue=E.dayStartValue,
      THEME_NAMES=E.THEME_NAMES, resolvedTheme=E.resolvedTheme, ensureAlerts=E.ensureAlerts, freqLabel=E.freqLabel,
      alertSoundTitle=E.alertSoundTitle, nextSlot=E.nextSlot, notifyWindow=E.notifyWindow, weekdayIndex=E.weekdayIndex,
      spanLabel=E.spanLabel, parseHM=E.parseHM, shiftHM=E.shiftHM, pad=E.pad, waterToday=E.waterToday,
      dayEntries=E.dayEntries, sumKey=E.sumKey, goalFor=E.goalFor, activityRow=E.activityRow, activityIcon=E.activityIcon,
      weatherIcon=E.weatherIcon, wallMsNow=E.wallMsNow, todayStr=E.todayStr, skinOn=E.skinOn, skinCount=E.skinCount,
      duplicateStats=E.duplicateStats, historyExportSummary=E.historyExportSummary, dbSaveHint=E.dbSaveHint,
      dbShareHint=E.dbShareHint, systemCalNote=E.systemCalNote, systemClockNote=E.systemClockNote,
      systemDrumNote=E.systemDrumNote, APP_VERSION=E.APP_VERSION, ALERT_SOUNDS=E.ALERT_SOUNDS,
      noBuiltinBase=E.noBuiltinBase, durationPhrase=E.durationPhrase, dayWindow=E.dayWindow,
      ruDate=E.ruDate, timeEditorHtml=E.timeEditorHtml, catRiveFailed=E.catRiveFailed;

    var draft = ui.alertEdit || { wake: "05:00", sleep: "23:00" };
    var field = ui.clockField === "sleep" ? "sleep" : "wake";
    var parts = String(draft[field] || "00:00").split(":");
    var title = field === "sleep" ? "Время отхода ко сну" : "Время пробуждения";
    if (!window.UiKit) return "";
    return UiKit.dialog({ ui: "clock",
      scrimAct: "clock-cancel",
      cls: "modal n-modal",
      title: title,
      body: timeEditorHtml("clock", "clock-h", "clock-m", Number(parts[0]) || 0, Number(parts[1]) || 0, "time-wheels n-wheels"),
      actions: [{ act: "clock-cancel", label: "Отмена" }, { act: "clock-ok", label: "Ок" }]
    });
  }

  function sunMoonIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8.2" cy="8.2" r="2.5" fill="none" stroke="#fff" stroke-width="1.5"/><path d="M8.2 3.4v1.5M8.2 11.5v1.5M3.4 8.2h1.5M11.5 8.2h1.5M4.8 4.8l1 1M10.6 10.6l1 1M11.6 4.8l-1 1M5.8 10.6l-1 1" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/><path d="M5 19.2 15.2 5.6" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/><path d="M16.2 12.8a4.2 4.2 0 1 0 4 5.2 3.3 3.3 0 1 1-4-5.2z" fill="#fff"/></svg>';
  }

  /* v124: цепочка модалок настроек переехала вместе с экранами. */
  /* v125: меню «куда положить» — секции и подпапки (двери и системные
     строки ходят только между секциями: глубина 1 уровень). */
  function modalsHtml(env) {
    E = env;
    var ui = E.ui, out = "";
    if (ui.modal === "alert-gap") out += gapDialogHtml();
    if (ui.modal === "alert-freq") out += freqDialogHtml();
    if (ui.modal === "cup-label") out += cupLabelDialogHtml();
    if (ui.modal === "gender") out += genderDialogHtml();
    if (ui.modal === "units") out += unitsDialogHtml();
    if (ui.modal === "norm") out += normDialogHtml();
    if (ui.modal === "theme") out += themeDialogHtml();
    if (ui.modal === "day-start") out += dayStartDialogHtml();
    if (ui.modal === "alert-clock") out += clockDialogHtml();
    return out;
  }

  return {
    pageSettings: pageSettings,
    pageAdvanced: pageAdvanced,
    pageLook: pageLook,
    pageAlerts: pageAlerts,
    pageFolderAlerts: pageFolderAlerts,
    pageStructExport: pageStructExport,
    structJson: structJson,
    structTree: structTree,
    pageFolder: pageFolder,
    pageAlertSound: pageAlertSound,
    pageAlertPeriod: pageAlertPeriod,
    pageAlertTexts: pageAlertTexts,
    pageAlertDays: pageAlertDays,
    pageAlertEdit: pageAlertEdit,
    modalsHtml: modalsHtml,
    sunMoonIcon: sunMoonIcon
  };
});
