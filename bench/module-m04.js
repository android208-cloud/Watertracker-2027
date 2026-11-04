/* Стенд M04: каталог напитков против чек-листа донора v158. */
const { chromium } = require('/home/user/pw/node_modules/playwright');
let fails = 0;
const ok = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage();
  await p.goto('http://127.0.0.1:8085/wt2/bench/harness3.html');
  await p.waitForFunction(() => window.__harnessReady === 1);
  const r = await p.evaluate(() => {
    const D = window.WT2D, J = window.WT2J, out = {};
    const st = () => ({ dayStart: '02:00', entries: [], weights: [], tombstones: { e: {}, w: {} },
      profile: { drinkId: 'water', volume: 350 },
      drinks: [{ id: 'water', name: 'Вода', hydration: 100, icon: 'drop', color: '#4aa3e8' },
               { id: 'tea', name: 'Чай', hydration: 90, icon: 'cup', color: '#f0a04b' }] });
    // 1 add
    const s = st();
    const d = D.addDrink(s, { name: '  Мятый лимонад   ', hydration: 85, icon: 'glass', color: '#f5c542' });
    out.add = [d.id.slice(0, 1), d.name, s.drinks.length];
    // 2 edit не пересчитывает записи (C-002)
    const s2 = st();
    const e = J.addEntry(s2, { date: '2026-11-04', time: '10:00', volume: 200, drink: s2.drinks[1] }, 5);
    D.editDrink(s2, 'tea', { hydration: 50, name: 'Чай чёрный' });
    out.edit = [s2.entries[0].hydration, s2.entries[0].credited, s2.drinks[1].hydration, s2.drinks[1].name];
    // 3 delete: guard последнего, записи живут, профиль падает на воду
    const s3 = st();
    J.addEntry(s3, { date: '2026-11-04', time: '10:00', volume: 200, drink: s3.drinks[1] }, 6);
    const del = D.deleteDrink(s3, 'tea');
    out.del = [del, s3.entries.length, s3.drinks.length, s3.profile.drinkId];
    const s3b = st(); s3b.profile.drinkId = 'tea';
    D.deleteDrink(s3b, 'tea');
    out.profileFallback = s3b.profile;
    const s3c = st(); s3c.profile.drinkId = 'water';
    D.deleteDrink(s3c, 'water');
    out.waterDeleted = [s3c.profile.drinkId, s3c.profile.volume, s3c.drinks.map(x => x.id)];
    const s3d = st();
    out.lastGuard = [D.deleteDrink(s3d, 'water'), D.deleteDrink(s3d, 'tea'), s3d.drinks.length];
    // 4 reorder с мусорным id
    const s4 = st();
    const ro = D.reorderDrinks(s4, ['tea', 'ghost', 'water']);
    out.reorder = [ro, s4.drinks.map(x => x.id)];
    // 5 defaultDrink при протухшем профиле
    const s5 = st(); s5.profile.drinkId = 'ghost';
    out.def = D.defaultDrink(s5).id;
    // 6 события
    const seen = [];
    window.WT2R.on('catalog:add', () => seen.push('add'));
    window.WT2R.on('catalog:delete', () => seen.push('del'));
    const s6 = st();
    const nd = D.addDrink(s6, { name: 'Кисель', hydration: 95 });
    D.deleteDrink(s6, nd.id);
    out.bus = seen;
    return out;
  });
  ok('add: id c*, name trim', r.add[0] === 'c' && r.add[1] === 'Мятый лимонад' && r.add[2] === 3, r.add);
  ok('edit: записи заморожены (C-002)', JSON.stringify(r.edit) === JSON.stringify([90, 180, 50, 'Чай чёрный']), r.edit);
  ok('delete: записи живут, профиль цел', JSON.stringify(r.del) === JSON.stringify([true, 1, 1, 'water']), r.del);
  ok('profile fallback to water', JSON.stringify(r.profileFallback) === JSON.stringify({ drinkId: 'water', volume: 200 }), r.profileFallback);
  ok('water deleted -> first drink, vol 200', r.waterDeleted[0] === 'tea' && r.waterDeleted[1] === 200, r.waterDeleted);
  ok('last drink guard: 2->1 ok, then blocked', JSON.stringify(r.lastGuard) === JSON.stringify([true, false, 1]), r.lastGuard);
  ok('reorder drops ghost', r.reorder[0] === true && JSON.stringify(r.reorder[1]) === JSON.stringify(['tea', 'water']), r.reorder);
  ok('defaultDrink stale profile -> first', r.def === 'water', r.def);
  ok('bus catalog events', JSON.stringify(r.bus) === JSON.stringify(['add', 'del']), r.bus);
  await b.close();
  console.log(fails ? 'BENCH M04: FAILS=' + fails : 'BENCH M04: ALL GREEN');
  process.exit(fails ? 1 : 0);
})();
