/* M00 registry-bus — реестр модулей и шина событий (решения П1/П2, 04.11).
   Контракты: C-021 (процесс), карточка модуля из docs/architecture.md.
   Правила: продуктовые модули НЕ знают об отладчике; отладчик только
   подписывается на шину («*») и читает реестр. Рубильники setOn живут в
   отладчике (M18) и действуют ТОЛЬКО на модули с optional:true; состояние
   рубильников — в отдельном debug-ключе, не в продуктовом стейте и не в паке.
   Вызывающий код опционального модуля спрашивает WT2R.isOn и получает
   null-безопасную заглушку от реестра (WT2R.stub). */
(function (W) {
  "use strict";
  var DBG_KEY = "wt2-debug-v1";
  var cards = {};
  var off = {};
  var listeners = {};

  function loadOff() {
    try { off = JSON.parse(localStorage.getItem(DBG_KEY) || "{}") || {}; }
    catch (e) { off = {}; }
    Object.keys(off).forEach(function (id) {
      if (!cards[id] || !cards[id].optional) delete off[id];
    });
  }
  function saveOff() { try { localStorage.setItem(DBG_KEY, JSON.stringify(off)); } catch (e) {} }

  function register(card) {
    cards[card.id] = card;
    if (off[card.id] && !card.optional) delete off[card.id];
    return card;
  }
  function isOn(id) {
    var c = cards[id];
    if (!c) return false;
    return c.optional ? !off[id] : true;
  }
  function setOn(id, on) {
    var c = cards[id];
    if (!c || !c.optional) return false;
    off[id] = !on;
    saveOff();
    emit("registry:set", { id: id, on: !!on });
    return true;
  }
  /* Null-безопасная заглушка: объект, у которого любой метод — функция,
     возвращающая def; вызывающий код опционального модуля держит её, когда
     модуль выключен. */
  function stub(def) {
    return new Proxy({}, {
      get: function (t, k) {
        if (k === "__stub") return true;
        return function () { return def; };
      }
    });
  }

  function on(ev, fn) {
    (listeners[ev] = listeners[ev] || []).push(fn);
    return function () {
      listeners[ev] = (listeners[ev] || []).filter(function (f) { return f !== fn; });
    };
  }
  function emit(ev, data) {
    (listeners[ev] || []).slice().forEach(function (fn) { try { fn(data); } catch (e) {} });
    if (ev !== "*") (listeners["*"] || []).slice().forEach(function (fn) { try { fn({ ev: ev, data: data }); } catch (e) {} });
  }

  loadOff();
  W.WT2R = {
    DBG_KEY: DBG_KEY, register: register, isOn: isOn, setOn: setOn, stub: stub,
    cards: function () { return cards; }, on: on, emit: emit
  };
})(window);
