/* M02 storage-keys — ключи и атомарные операции хранилища.
   Контракты: C-020 (ключи и форматы байт-совместимы с донором v158).
   Связей вверх нет; M01 и прочие читают ключи только отсюда. */
(function (W) {
  "use strict";
  var KEY = "cup-tracker-v1";            /* состояние приложения (JSON) */
  var LIQUID_KEY = "cup-liquid-color-v1"; /* настройки воды/волны (JSON), модуль M07 */
  var AVATAR_KEY = "cup-tracker-avatar";  /* умер: портрет живёт в облаке; донор purged */
  var PROBE_KEY = "cup-tracker-probe";    /* проба доступности localStorage */

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function remove(k) { try { localStorage.removeItem(k); } catch (e) {} }
  /* Проба записи (донор 4873): пишем и стираем маркер. */
  function writable() {
    try { localStorage.setItem(PROBE_KEY, "1"); localStorage.removeItem(PROBE_KEY); return true; }
    catch (e) { return false; }
  }

  W.WT2K = { KEY: KEY, LIQUID_KEY: LIQUID_KEY, AVATAR_KEY: AVATAR_KEY, PROBE_KEY: PROBE_KEY, get: get, set: set, remove: remove, writable: writable };
})(window);
