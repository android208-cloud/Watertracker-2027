/* smoke-profile — гейты линии «Вес и портрет» (07.11).
   W: строка «Вес» открывает шторку с колёсами и сохраняет значение.
   A: живой портрет: свой fetch -> квадрат 256; приём __googlePicture от оболочки;
      выход -> иконка по умолчанию. Мост на стенде подменяется состоянием напрямую. */
const { chromium } = require('/home/user/pw/node_modules/playwright');
const fs = require('fs');
const OWNER = JSON.parse(fs.readFileSync('/home/user/uploads/vodomer-baza-owner.json','utf8'));
function seed(){const s=OWNER.settings||{},pr=OWNER.profile||{};return{goalMl:pr.consumptionRate||1900,gender:pr.gender||'male',weightKg:pr.weightKg||59,units:'metric',dayStart:pr.dayStart||'02:00',theme:'dark',animation:false,onboarded:1,historyDismissed:1,alertPermAsked:1,profile:{drinkId:'water',volume:250},drinks:OWNER.drinks||[],entries:OWNER.entries||[],weights:[],dayGoals:{},tombstones:{e:{},w:{}},notifications:{enabled:false,everyMin:120,days:[]},cupLabel:s.cupLabel,rowCustom:s.rowCustom,habitAuto:s.habitAuto,paceGoals:s.paceGoals,lc:s.lc};}
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { if (cond) { pass++; console.log('  PASS  ' + name); } else { fail++; console.log('  FAIL  ' + name + (extra ? '  ' + extra : '')); } };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 } });
  await ctx.addInitScript(`localStorage.setItem('cup-tracker-v1', ${JSON.stringify(JSON.stringify(seed()))});`);
  const p = await ctx.newPage();
  /* Заглушка моста WaterGoogle (как в bench M09): без неё страница честно
     прячет строку профиля — «облако только в приложении». */
  await p.exposeFunction('__wtStubState', () => {});
  await ctx.addInitScript(`window.__wtG = '{"signedIn":false}';
    window.WaterGoogle = { state: function () { return window.__wtG; },
      signIn: function () {}, signOut: function () {}, check: function () {},
      backup: function () {}, restore: function () {}, fetchPicture: function () {} };`);
  await p.goto('http://127.0.0.1:8085/wt2/index.html');
  await p.waitForFunction(() => window.__waterApp && window.__waterApp.state);
  const gstate = o => p.evaluate(j => { window.__wtG = j; window.__googleState(j); }, JSON.stringify(o));
  const nat = s => p.evaluate(x => { const el = document.querySelector(x); if (!el) return 'NOEL'; el.click(); return 'ok'; }, s);

  /* --- W: вес --- */
  await nat('[data-tab="settings"]'); await p.waitForTimeout(250);
  await p.evaluate(() => { window.__waterApp.ui.page = 'personal'; window.__waterApp.render(); });
  await p.waitForTimeout(250);
  const r1 = await nat('[data-act="open-set-weight"]');
  await p.waitForTimeout(350);
  const sheetOn = await p.evaluate(() => ({
    sheet: window.__waterApp.ui.sheet,
    node: !!document.querySelector('.sheet.set-weight'),
    wheels: document.querySelectorAll('.sheet.set-weight .wheel').length
  }));
  ok('W1 строка «Вес» открыла шторку с колёсами', r1 === 'ok' && sheetOn.sheet === 'set-weight' && sheetOn.node && sheetOn.wheels >= 2, JSON.stringify(sheetOn) + ' r=' + r1);
  const r2 = await nat('[data-act="save-set-weight"]');
  await p.waitForTimeout(350);
  const w1 = await p.evaluate(() => ({ kg: window.__waterApp.state.weightKg, sheet: window.__waterApp.ui.sheet,
    sub: (document.querySelector('[data-act="open-set-weight"] small') || {}).textContent }));
  ok('W2 сохранение закрыло шторку и оставило живой вес', r2 === 'ok' && w1.sheet === null && w1.kg >= 20 && w1.kg <= 300 && !!w1.sub, JSON.stringify(w1));

  /* --- A: портрет --- */
  /* Донор скачивает фото только по https (Google всегда https); на стенде
     https-домен перехватывает Playwright и отдаёт байты фикстуры. */
  await ctx.route('https://ava.test/**', route => route.fulfill({
    status: 200, contentType: 'image/png',
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: fs.readFileSync('bench/ava-test.png')
  }));
  /* строка профиля с портретом — на главной настроек (секция «Мой профиль») */
  await p.evaluate(() => { window.__waterApp.ui.page = null; window.__waterApp.render(); });
  await p.waitForTimeout(200);
  const picUrl = 'https://ava.test/ava.png';
  await gstate({ signedIn: true, name: 'Тест', email: 't@t.ru', picture: picUrl });
  await p.waitForTimeout(700);
  const a1 = await p.evaluate(() => {
    const img = document.querySelector('.ava-round img');
    return { info: window.__avatarInfo(), src: img ? (img.getAttribute('src') || '').slice(0, 12) : 'noimg',
             loaded: img && img.parentNode.classList.contains('loaded') };
  });
  ok('A1 после входа портрет скачался и встал квадратом', a1.info.вПамяти === true && a1.src.indexOf('data:image/') === 0 && a1.loaded === true, JSON.stringify(a1));

  const a2 = await p.evaluate(() => {
    window.__googlePicture({ url: 'https://ava.test/other.png', data: '' }); /* чужая ссылка и пустые байты — тихий игнор */
    const img = document.querySelector('.ava-round img');
    return { src: (img.getAttribute('src') || '').slice(0, 12), live: window.__avatarInfo().вПамяти };
  });
  ok('A2 пустой/чужой пакет от оболочки ничего не ломает', a2.src.indexOf('data:image/') === 0 && a2.live === true, JSON.stringify(a2));

  const a5 = await p.evaluate(() => {
    const row = document.querySelector('[data-act="open-profile"]');
    return { txt: row ? row.textContent.replace(/\s+/g, ' ').trim() : 'no row' };
  });
  ok('A5 строка профиля подписана именем из аккаунта', a5.txt.indexOf('Тест') >= 0, JSON.stringify(a5));

  /* большой портрет на странице профиля */
  const r4 = await nat('[data-act="open-profile"]');
  await p.waitForTimeout(400);
  const a4 = await p.evaluate(() => {
    const img = document.querySelector('.ava-round.ava-big img');
    return { r: 0, src: img ? (img.getAttribute('src') || '').slice(0, 12) : 'noimg',
             loaded: !!(img && img.parentNode.classList.contains('loaded')) };
  });
  ok('A4 страница профиля: большой портрет загружен', r4 === 'ok' && a4.src.indexOf('data:image/') === 0 && a4.loaded, JSON.stringify(a4) + ' r=' + r4);
  await nat('[data-act="back"]');
  await p.waitForTimeout(250);

  /* повторное обновление состояния с пустой ссылкой (оболочка после входа):
     портрет обязан уцелеть — на устройстве он исчезал через секунду */
  await gstate({ signedIn: true, name: 'Тест', email: 't@t.ru', picture: '' });
  await p.waitForTimeout(400);
  const a6 = await p.evaluate(() => {
    const img = document.querySelector('.ava-round img');
    return { src: img ? (img.getAttribute('src') || '').slice(0, 12) : 'norow', live: window.__avatarInfo().вПамяти };
  });
  ok('A6 повторное обновление с пустой ссылкой портрет не сносит', a6.live === true && a6.src.indexOf('data:image/') === 0, JSON.stringify(a6));

  await gstate({ signedIn: false });
  await p.waitForTimeout(400);
  const a3 = await p.evaluate(() => {
    const img = document.querySelector('.ava-round img');
    return { src: img ? (img.getAttribute('src') || '') : 'norow', live: window.__avatarInfo().вПамяти };
  });
  ok('A3 после выхода — снова иконка по умолчанию', a3.live === false && (a3.src.indexOf('profile.png') >= 0 || a3.src === 'norow'), JSON.stringify(a3));

  console.log('\nИТОГ: ' + pass + ' PASS / ' + fail + ' FAIL');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
