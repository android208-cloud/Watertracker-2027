/* smoke-cloudtools — гейты линии «Скрытые облачные инструменты» (07.11).
   Дорога одна: долгое удержание портрета в окне «Профиль».
   T1 короткий тап инструменты НЕ открывает;
   T2 удержание 500+ мс открывает страницу «Облачные инструменты»;
   T3 очистка: отмена диалога — мост молчит;
   T4 очистка: подтверждение — на Диск уходит именно пустой пак;
   T5 параметры входа: диалог показывает пакет и отпечаток моста. */
const { chromium } = require('/home/user/pw/node_modules/playwright');
const fs = require('fs');
const OWNER = JSON.parse(fs.readFileSync('/home/user/uploads/vodomer-baza-owner.json','utf8'));
function seed(){const s=OWNER.settings||{},pr=OWNER.profile||{};return{goalMl:pr.consumptionRate||1900,gender:pr.gender||'male',weightKg:pr.weightKg||59,units:'metric',dayStart:pr.dayStart||'02:00',theme:'dark',animation:false,onboarded:1,historyDismissed:1,alertPermAsked:1,profile:{drinkId:'water',volume:250},drinks:OWNER.drinks||[],entries:OWNER.entries||[],weights:[],dayGoals:{},tombstones:{e:{},w:{}},notifications:{enabled:false,everyMin:120,days:[]},cupLabel:s.cupLabel,rowCustom:s.rowCustom,habitAuto:s.habitAuto,paceGoals:s.paceGoals,lc:s.lc};}
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { if (cond) { pass++; console.log('  PASS  ' + name); } else { fail++; console.log('  FAIL  ' + name + (extra ? '  ' + extra : '')); } };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 } });
  await ctx.addInitScript(`localStorage.setItem('cup-tracker-v1', ${JSON.stringify(JSON.stringify(seed()))});
    window.__backups = [];
    window.__wtG = JSON.stringify({ signedIn: true, name: 'Тест Владелец', email: 't@t.ru', picture: '',
      pkg: 'ru.watermeter.tracker.next', sha1: 'AA:BB:CC', available: true });
    window.WaterGoogle = { state: function () { return window.__wtG; }, signIn(){}, signOut(){}, check(){},
      backup: function (t) { window.__backups.push(t); }, restore(){}, fetchPicture(){} };`);
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:8085/wt2/index.html');
  await p.waitForFunction(() => window.__waterApp && window.__waterApp.state);
  const nat = s => p.evaluate(x => { const el = document.querySelector(x); if (!el) return 'NOEL'; el.click(); return 'ok'; }, s);
  await p.evaluate(() => window.__googleState(JSON.parse(window.__wtG)));
  await nat('[data-tab="settings"]'); await p.waitForTimeout(300);
  await nat('[data-act="open-profile"]'); await p.waitForTimeout(400);
  const page0 = await p.evaluate(() => window.__waterApp.ui.page);
  ok('профиль открыт', page0 === 'register', page0);

  /* T1: короткий тап */
  const box = await p.locator('.ava-round.ava-big').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await p.mouse.move(cx, cy); await p.mouse.down(); await p.waitForTimeout(120); await p.mouse.up();
  await p.waitForTimeout(300);
  const page1 = await p.evaluate(() => window.__waterApp.ui.page);
  ok('T1 короткий тап инструменты не открывает', page1 === 'register', page1);

  /* T2: долгое удержание */
  await p.mouse.move(cx, cy); await p.mouse.down(); await p.waitForTimeout(750); await p.mouse.up();
  await p.waitForTimeout(400);
  const t2 = await p.evaluate(() => ({ page: window.__waterApp.ui.page,
    rows: Array.from(document.querySelectorAll('#app [data-act]')).map(e => e.getAttribute('data-act')) }));
  ok('T2 удержание открыло «Облачные инструменты»', t2.page === 'cloud-tools' && t2.rows.indexOf('ask-cloud-clear') >= 0 && t2.rows.indexOf('google-diag') >= 0, JSON.stringify(t2));

  /* T3: очистка — отмена (пауза > глушилки клика после удержания) */
  await p.waitForTimeout(700);
  await nat('[data-act="ask-cloud-clear"]'); await p.waitForTimeout(350);
  const dlg = await p.evaluate(() => { const d = document.querySelector('.modal'); return d ? d.textContent.replace(/\s+/g, ' ').slice(0, 80) : 'нет диалога'; });
  await nat('[data-act="dialog-cancel"]'); await p.waitForTimeout(300);
  const nBack1 = await p.evaluate(() => window.__backups.length);
  ok('T3 диалог очистки есть, отмена — мост молчит', dlg.indexOf('Очистить облако?') >= 0 && nBack1 === 0, dlg + ' backups=' + nBack1);

  /* T4: очистка — подтверждение пишет пустой пак */
  await nat('[data-act="ask-cloud-clear"]'); await p.waitForTimeout(300);
  await nat('[data-act="do-cloud-clear"]'); await p.waitForTimeout(300);
  const pack = await p.evaluate(() => { try { return JSON.parse(window.__backups[0] || 'null'); } catch (e) { return null; } });
  ok('T4 на Диск ушёл пустой пак', !!pack && pack.source === 'watercat-24' && pack.entries.length === 0 && pack.weights.length === 0
      && Object.keys(pack.tombstones.e).length === 0 && Object.keys(pack.tombstones.w).length === 0, JSON.stringify(pack).slice(0, 120));
  await p.evaluate(() => window.__googleCloud({ ok: true, action: 'backup', at: '2026-11-07T00:00:00Z' }));
  await p.waitForTimeout(300);
  const busy = await p.evaluate(() => { const t = document.querySelector('.toast'); return t ? t.textContent : ''; });
  ok('T4 ответ моста принят, тост про очистку', busy.indexOf('очищена') >= 0, busy);

  /* T5: параметры входа */
  await nat('[data-act="google-diag"]'); await p.waitForTimeout(350);
  const diag = await p.evaluate(() => { const d = document.querySelector('.modal'); return d ? d.textContent.replace(/\s+/g, ' ') : 'нет диалога'; });
  ok('T5 диалог показывает пакет и отпечаток', diag.indexOf('ru.watermeter.tracker.next') >= 0 && diag.indexOf('AA:BB:CC') >= 0, diag.slice(0, 140));
  await nat('[data-act="dialog-cancel"]'); await p.waitForTimeout(250);

  console.log('\nИТОГ: ' + pass + ' PASS / ' + fail + ' FAIL');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
