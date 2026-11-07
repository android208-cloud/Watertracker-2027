/* M16 onboarding — экран приветствия и «restore без онбординга».
   Контракты: C-014 (принятая история значит, человек уже живёт в приложении:
   приветствие и предложение файла не показываем), C-021 (доказательства
   снимками стенда).
   Перенос с донора v158 как спеки: app.js 569 (миграция флага — уже в M01),
   4410–4444 (черновик и разметка экрана), 4527 (гейт рендера), 8831–8908
   (акты: пол, вес, начало суток, системные часы, «Начать»), 9952–9955
   (restore ставит onboarded и historyDismissed).
   Конструктор: арт кота в hero приходит готовым html из M05 (catStackLayers),
   колёса веса/времени — кубики M15 (здесь только флаги модалок и коммит
   значений), окно импорта после «Начать» открывает M14 по сигналу importHint.
   Связи: вниз — M01 (state), M19 (genderBase), M03 (dayStartOn); вверх —
   M14 (importHint), M20 (роутер актов, цепь «Назад»). */
(function (W) {
  "use strict";
  var L = function () { return W.WT2L; };
  var J = function () { return W.WT2J; };

  function need(state) { return !state.onboarded; }

  /* Черновик донора (4410–4417): пол из состояния, вес из состояния или 59.1,
     начало суток — действующее по истории смен. */
  function draft(ui, state, today) {
    if (!ui.onb) {
      ui.onb = {
        gender: state.gender || "male",
        kg: Number(state.weightKg) || 59.1,
        dayStart: J() ? J().dayStartOn(state, today || todayStr()) : (state.dayStart || "02:00")
      };
    }
    return ui.onb;
  }
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  /* Дисплей веса донора (3968–3975): округление до 0.1, границы 20–300. */
  function splitKg(kg, fallback) {
    var n = Math.round(Number(kg) * 10) / 10;
    if (!(n >= 20 && n <= 300)) n = fallback || 60;
    var whole = Math.floor(n + 1e-6);
    var frac = Math.round((n - whole) * 10);
    if (frac >= 10) { whole += 1; frac = 0; }
    if (whole < 20) whole = 20;
    if (whole > 300) { whole = 300; frac = 0; }
    return { whole: whole, frac: frac };
  }

  /* Разметка экрана (4420–4444): hero с котом-слотом, три карточки, норма,
     «Начать». o = { catArt (готовый html), esc }. */
  function screenHtml(d, o) {
    var U = W.WT2U;
    var esc = U ? U.esc : function (s) { return String(s == null ? "" : s); };
    var goal = L() ? L().genderBase({ gender: d.gender, weightKg: d.kg }) : 0;
    var sp = splitKg(d.kg);
    return '<div class="onb">' +
      '<div class="onb-hero"><span class="cat-art onb-cat" aria-hidden="true">' + (o && o.catArt ? o.catArt : "") + "</span>" +
      "<h1>Привет! Я Водомер</h1><p>Три вопроса — и всё настроено под вас</p></div>" +
      '<div class="onb-card"><div class="onb-lbl">Пол</div><div class="seg">' +
        '<button type="button" class="' + (d.gender === "female" ? "on" : "") + '" data-act="onb-gender" data-v="female">Женский</button>' +
        '<button type="button" class="' + (d.gender !== "female" ? "on" : "") + '" data-act="onb-gender" data-v="male">Мужской</button>' +
      "</div></div>" +
      '<div class="onb-card"><div class="onb-lbl">Вес</div>' +
        '<div class="onb-val" role="button" data-act="onb-weight"><span class="n">' + sp.whole + (sp.frac ? "," + sp.frac : "") + "<small>кг</small></span></div>" +
        '<div class="hint">Нажмите на число — барабаны веса; норма — 30 мл на кг, для мужского пола ×1,1</div></div>' +
      '<div class="onb-card"><div class="onb-lbl">Начало суток</div>' +
        '<div class="onb-val" role="button" data-act="onb-time"><span class="n">' + esc(d.dayStart) + "</span>" +
        '<button type="button" class="onb-clock" data-act="onb-time-sys" aria-label="Системные часы">' + (U ? U.uiIcon("clock") : "") + "</button></div>" +
        '<div class="hint">Нажмите на время — барабаны часов; белые часы — системный выбор</div></div>' +
      '<div class="onb-goal">Ваша норма: ' + goal + " мл</div>" +
      '<div class="onb-cta"><button type="button" data-act="onb-done">Начать</button>' +
      "<p>Пол, вес и начало суток можно поменять позже в настройках</p></div>" +
      "</div>";
  }

  /* Оверлей донора (4456-4483): вес и начало суток — диалоги с барабанами
     M15 (kg-int/kg-dec и day-h/day-m), Отмена/Ок. Никаких чип-шторок. */
  function overHtml(ui) {
    var U = W.UiKit;
    if (ui.modal === "onb-weight") {
      var kg = ui.weightDraft ? ui.weightDraft.kg : (ui.onb ? ui.onb.kg : 60);
      var parts = splitKg(kg);
      if (!U) return "";
      return U.dialog({ ui: "onb-time",
        scrimAct: "onb-weight-cancel",
        cls: "modal n-modal",
        title: "Вес",
        body: U.wheelBlock({ ui: "onb-time",
          cls: "kg-pick",
          items: [{ wheel: { name: "kg-int", value: parts.whole, min: 20, max: 300, step: 1, item: 60 } },
                  { sep: ",", aria: true },
                  { wheel: { name: "kg-dec", value: parts.frac, min: 0, max: 9, step: 1, item: 60 } },
                  { unit: "кг" }]
        }),
        actions: [{ act: "onb-weight-cancel", label: "Отмена" }, { act: "onb-weight-ok", label: "Ок" }]
      });
    }
    if (ui.modal === "onb-day") {
      var d = ui.onb || {};
      var mins = L() && L().minutesOf ? L().minutesOf(d.dayStart || "02:00") : 120;
      if (!U) return "";
      return U.dialog({ ui: "onb-weight",
        scrimAct: "onb-day-cancel",
        cls: "modal n-modal",
        title: "Начало суток",
        body: U.wheelBlock({ ui: "onb-weight",
          cls: "kg-pick",
          items: [{ wheel: { name: "day-h", value: Math.floor(mins / 60), min: 0, max: 23, step: 1, pad: true, item: 60 } },
                  { sep: ":", aria: true },
                  { wheel: { name: "day-m", value: mins % 60, min: 0, max: 59, step: 1, pad: true, item: 60 } }]
        }),
        actions: [{ act: "onb-day-cancel", label: "Отмена" }, { act: "onb-day-ok", label: "Ок" }]
      });
    }
    return "";
  }

  /* Акты черновика: меняют только черновик, состояние трогает done. */
  function setGender(d, v) { d.gender = v === "female" ? "female" : "male"; }
  function setKg(d, kg) { d.kg = Number(kg) || d.kg; }
  function setDayStart(d, hm) { if (hm) d.dayStart = hm; }

  /* «Начать» (8889–8908): черновик становится состоянием, норма от пола и
     веса, флаг онбординга гаснет. Возвращаем сигнал importHint: сборки без
     встроенной базы при пустой истории и неотклонённой подсказке заряжают
     окно импорта поверх главного экрана — окно не должно теряться за
     онбордингом. */
  function done(state, d, env, ui) {
    state.gender = d.gender;
    state.weightKg = d.kg;
    if (J() && J().setDayStart) J().setDayStart(state, d.dayStart);
    else state.dayStart = d.dayStart;
    state.onboarded = 1;
    state.goalMl = L() ? L().genderBase(state) : state.goalMl;
    if (ui) { ui.onb = null; ui.sheet = null; ui.modal = null; }
    var hint = !!(env && env.noBuiltinBase) && !state.historyDismissed &&
      !(state.entries && state.entries.length);
    return { importHint: hint };
  }

  /* C-014: принятая история (restore/импорт) — человек уже живёт в приложении:
     приветствие и предложение файла не показываем (донор 9952–9955). */
  function markRestored(state) {
    state.onboarded = 1;
    state.historyDismissed = 1;
  }

  /* Цепь «Назад»: модалки онбординга (колесо веса/времени) закрываются на
     экран приветствия; сам экран назад не отпускает (донор: backAvailable
     ложен — оболочка выходит из приложения). */
  function backModal(shell) {
    if (shell.modal === "onb-weight" || shell.modal === "onb-day") {
      shell.modal = null;
      return true;
    }
    return false;
  }

  if (W.WT2R) {
    W.WT2R.register({
      id: "M16", file: "m16-onboarding.js", layer: 2, optional: false,
      contracts: ["C-014", "C-021"],
      events: [],
      status: "ported"
    });
    W.WT2R.registerBackModal ? W.WT2R.registerBackModal(backModal) : null;
  }
  if (W.WT2U && W.WT2U.registerBackModal) W.WT2U.registerBackModal(backModal);
  W.WT2O = {
    need: need, draft: draft, splitKg: splitKg, screenHtml: screenHtml,
    overHtml: overHtml,
    setGender: setGender, setKg: setKg, setDayStart: setDayStart,
    done: done, markRestored: markRestored, backModal: backModal
  };
})(window);
