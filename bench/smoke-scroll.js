/* smoke-scroll — гейты удержания прокрутки (донор app.js 2435-2494 перенесён в m21).
   ВАЖНО: клики — нативные (row.click()), без Playwright-автоскролла: pw.click сам
   прокручивает контейнер к элементу и ломает измерение. Живой палец так не делает. */
const { chromium } = require('/home/user/pw/node_modules/playwright');
const fs = require('fs');
const OWNER = JSON.parse(fs.readFileSync('/home/user/uploads/vodomer-baza-owner.json','utf8'));
function seed(theme){const s=OWNER.settings||{},pr=OWNER.profile||{};return{goalMl:pr.consumptionRate||1900,gender:pr.gender||'male',weightKg:pr.weightKg||59,units:'metric',dayStart:pr.dayStart||'02:00',theme,animation:false,onboarded:1,historyDismissed:1,alertPermAsked:1,profile:{drinkId:'water',volume:250},drinks:OWNER.drinks||[],entries:OWNER.entries||[],weights:[],dayGoals:{},tombstones:{e:{},w:{}},notifications:{enabled:false,everyMin:120,days:[]},cupLabel:s.cupLabel,rowCustom:s.rowCustom,habitAuto:s.habitAuto,paceGoals:s.paceGoals,lc:s.lc};}
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { if (cond) { pass++; console.log('  PASS  ' + name); } else { fail++; console.log('  FAIL  ' + name + (extra ? '  ' + extra : '')); } };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 } });
  await ctx.addInitScript(`localStorage.setItem('cup-tracker-v1', ${JSON.stringify(JSON.stringify(seed('dark')))});`);
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:8085/wt2/index.html');
  await p.waitForFunction(() => window.__waterApp && window.__waterApp.state);
  const top = () => p.evaluate(() => (document.querySelector('#app > .screen')||{}).scrollTop);
  const clickNative = (sel) => p.evaluate(s => document.querySelector(s).click(), sel);

  await clickNative('[data-tab="settings"]');
  await p.waitForTimeout(250);
  await clickNative('[data-act="open-look"]');
  await p.waitForTimeout(300);
  await p.evaluate(() => { document.querySelector('#app > .screen').scrollTop = 500; });
  await p.waitForTimeout(120);
  await clickNative('[data-act="liq-smooth"]');
  await p.waitForTimeout(450);
  ok('S1 look: чекбокс «плавные цвета» удержал 500', await top() === 500, 'top=' + await top());

  await clickNative('[data-act="back"]');
  await p.waitForTimeout(300);
  await clickNative('[data-act="open-advanced"]');
  await p.waitForTimeout(350);
  await clickNative('[data-key="devMode"]'); /* строка на самом верху — сценарий владельца */
  await p.waitForTimeout(450);
  const t2a = await top();
  const devOk = await p.evaluate(() => window.__waterApp.state.devMode === true);
  ok('S2a advanced: devMode переключился, top остался 0', t2a === 0 && devOk, 'top=' + t2a + ' dev=' + devOk);
  await p.evaluate(() => { document.querySelector('#app > .screen').scrollTop = 1000; });
  await p.waitForTimeout(120);
  await clickNative('[data-key="svgEditor"]'); /* toggle в середине длинной dev-страницы */
  await p.waitForTimeout(450);
  const t2b = await top();
  const m2b = await p.evaluate(() => {
    const sc = document.querySelector('#app > .screen');
    return { svg: window.__waterApp.state.svgEditor === true, max: sc.scrollHeight - sc.clientHeight };
  });
  /* контент при svgEditor=true чуть короче — легитимный clamp к максимуму, как в доноре */
  ok('S2b advanced: переключатель на 1000 удержал прокрутку', t2b === Math.min(1000, m2b.max) && m2b.svg, 'top=' + t2b + ' max=' + m2b.max + ' svg=' + m2b.svg);

  await clickNative('[data-act="back"]');
  await p.waitForTimeout(300);
  await clickNative('[data-act="open-look"]');
  await p.waitForTimeout(450);
  const t3 = await top();
  ok('S3 возврат на look вернул 500', t3 === 500, 'top=' + t3);

  await clickNative('[data-act="back"]');
  await p.waitForTimeout(250);
  await clickNative('[data-tab="home"]');
  await p.waitForTimeout(350);
  const t4 = await top();
  ok('S4 home стартует с 0', t4 === 0, 'top=' + t4);

  console.log('\nИТОГ: ' + pass + ' PASS / ' + fail + ' FAIL');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
