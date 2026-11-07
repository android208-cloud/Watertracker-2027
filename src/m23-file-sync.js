/* M23 — file-sync: синхронизация с файлом (слово владельца 05.11: облако
   молчит до слова, файл — главная дорога переноса данных между донором и
   next). Формат пака — ОДИН с облаком (C-015: exportPack/applyPack M14,
   source watercat-24, могилы C-002): файл и облако не расходятся.
   Транспорт: Android-мост M17 (WaterBridge.wtSaveFile / wtRequestFile,
   системные диалоги SAF create/open документа); колбэк window.wtFileResult.
   В веб-режиме без моста кнопки честны: тост «доступно в приложении».
   Имя файла по умолчанию: vodomer-next-ГГГГ-ММ-ДД.json (дефолт спеки). */
(function (W) {
  "use strict";
  function todayName() {
    var d = new Date();
    var mm = ("0" + (d.getMonth() + 1)).slice(-2);
    var dd = ("0" + d.getDate()).slice(-2);
    return "vodomer-next-" + d.getFullYear() + "-" + mm + "-" + dd + ".json";
  }
  function packText(state) {
    var pack = W.WT2Y.exportPack(state, {});
    return JSON.stringify(pack);
  }
  function hasBridge() {
    return !!(window.WaterBridge && typeof window.WaterBridge.wtSaveFile === "function");
  }
  function save(state, ui, toast) {
    if (!hasBridge()) { if (toast) toast("Сохранение в файл доступно в приложении"); return false; }
    window.WaterBridge.wtSaveFile(todayName(), packText(state));
    if (toast) toast("Выберите, куда сохранить файл");
    return true;
  }
  function request(ui, toast) {
    if (!hasBridge()) { if (toast) toast("Чтение файла доступно в приложении"); return false; }
    window.WaterBridge.wtRequestFile();
    if (toast) toast("Выберите файл пака");
    return true;
  }
  /* Колбэк моста: текст файла или ошибка. Применяем пак тем же путём, что
     облако: applyPack с могилами, save, тост результата C-015. */
  function fileResult(state, text, err, hooks) {
    hooks = hooks || {};
    if (err || text == null) {
      if (hooks.toast) hooks.toast(err ? "Файл не прочитан: " + err : "Файл не выбран");
      return { ok: false };
    }
    var pack;
    try { pack = JSON.parse(text); } catch (e) {
      if (hooks.toast) hooks.toast("Файл не похож на пак watercat-24");
      return { ok: false };
    }
    /* v145 донор (5299-5304): пак с настройками спрашивает ДО применения:
       история и настройки ждут выбора в диалоге (слово владельца 05.11). */
    if (pack && pack.settings && Array.isArray(pack.entries) && pack.entries.length && hooks.deferChoice) {
      hooks.deferChoice(pack);
      return { ok: true, deferred: true };
    }
    var res = W.WT2Y.applyPack(state, pack, "merge", { importLc: function (lc) {
      if (window.LiquidColor && LiquidColor.importState) LiquidColor.importState(lc);
    } });
    if (!res || !res.ok) {
      if (hooks.toast) hooks.toast("Файл не похож на пак watercat-24");
      return { ok: false };
    }
    if (hooks.save) hooks.save();
    if (hooks.toast) hooks.toast("Из файла: добавлено " + res.added + ", пропущено " + res.dropped);
    if (hooks.render) hooks.render();
    return res;
  }
  W.WT2F = {
    todayName: todayName,
    packText: packText,
    hasBridge: hasBridge,
    save: save,
    request: request,
    fileResult: fileResult
  };
  /* мост зовёт нас по имени; крупные паки приходят кусками */
  var chunkBuf = [];
  W.wtFileChunk = function (seq, part) { chunkBuf[seq] = part; };
  W.wtFileDone = function () {
    var text = chunkBuf.join("");
    chunkBuf = [];
    if (W.__wtFileHook) W.__wtFileHook(text, null);
  };
  W.wtFileResult = function (text, err) {
    chunkBuf = [];
    if (W.__wtFileHook) W.__wtFileHook(text, err);
  };
})(window);
