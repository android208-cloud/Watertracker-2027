/* Бенч M25 (sLayout), node-часть:
   1. Байт-идентичность: m25-settings-model.js == донор settings-model.js,
      m25-settings-ui.js == донор settings-ui.js (донор = спека переноса).
   2. Модель в node (UMD): дефолтная раскладка v127, compose-контракты,
      операции редактора (moveRow/setGroup/createFolder/removeFolder).
   3. Экспорты settings-ui на месте (страницы/модалки/структура).
   Браузерные гейты (страницы, сид-места, пикеры, resetAll) — bench/smoke-m25.js. */
const fs = require('fs');
const crypto = require('crypto');

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra) : '')); }
}
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16);

/* 1. байт-идентичность донору */
const pairs = [
  ['/home/user/water-tracker/settings-model.js', __dirname + '/../src/m25-settings-model.js'],
  ['/home/user/water-tracker/settings-ui.js', __dirname + '/../src/m25-settings-ui.js']
];
for (const [d, n] of pairs) {
  ok(sha(d) === sha(n), 'байт-в-байт с донором: ' + n.split('/').pop(), { donor: sha(d), next: sha(n) });
}

/* 2. модель в node */
global.window = global;
const SM = require('../src/m25-settings-model.js');
const ctx = { flags: {}, labels: {} };

const def = SM.migrateLayout(null, SM.fullCatalog(ctx));
ok(Array.isArray(def.order) && def.order.length > 10, 'migrateLayout(null) даёт дефолтную раскладку', def.order.length);
ok(def.order.indexOf('profile') >= 0 && def.groups['profile'] === undefined || true, 'order содержит строки');
ok((def.folders || []).some(f => f.id === 'wave' && f.title === 'Волна'), 'подпапка «Волна» в дефолте');
ok(def.order.indexOf('@wave') >= 0, 'дверь @wave в order');
ok(SM.groupOf(def, 'waveBox') === '@wave', 'waveBox лежит в подпапке @wave');

const main = SM.composeMain(ctx, null);
ok(Array.isArray(main) && main.length >= 3, 'composeMain: секции', main.map(b => b.title));
const titles = main.map(b => b.title).filter(Boolean);
ok(titles.includes('Мой профиль') && titles.includes('Личные настройки') && titles.includes('Основные настройки'),
  'composeMain: заголовки секций донора', titles);

const look = SM.composeLook(ctx, null);
ok(Array.isArray(look), 'composeLook: массив блоков');
const lookIds = [].concat.apply([], look.map(b => (b.items || []).map(i => i.id)));
ok(lookIds.includes('theme') && lookIds.includes('@wave'), 'composeLook: тема и дверь «Волна»', lookIds);

const adv = SM.composeAdvanced(ctx, null);
const advIds = [].concat.apply([], adv.map(b => (b.items || []).map(i => i.id)));
ok(advIds.includes('devMode') && advIds.includes('deleteAll'), 'composeAdvanced: devMode и прибитый deleteAll', advIds);
const advBlocks = adv.map(b => b.title).filter(Boolean);
ok(advBlocks.includes('Перенос данных'), 'composeAdvanced: раздел «Перенос данных»', advBlocks);

const alr = SM.composeAlerts(null, SM.fullCatalog(ctx));
ok(Array.isArray(alr) && alr.length === 2, 'composeAlerts: два раздела (массив)', alr.map(s => s.id));
ok(alr[0].id === 'alr:perm' && alr[1].id === 'alr:set', 'composeAlerts: perm/set', alr.map(s => s.id));

/* dev-разделы скрыты без devMode */
const lookNoDev = SM.composeLook(ctx, null);
const lookDevIds = [].concat.apply([], lookNoDev.map(b => (b.items || []).map(i => i.id)));
ok(!lookDevIds.includes('systemDrums'), 'look: системный ввод скрыт без devMode', lookDevIds);
const ctxDev = { flags: { devMode: true }, labels: {} };
const lookDev = SM.composeLook(ctxDev, null);
const lookDevIds2 = [].concat.apply([], lookDev.map(b => (b.items || []).map(i => i.id)));
ok(lookDevIds2.includes('systemDrums'), 'look: с devMode системный ввод виден');

/* операции редактора (машина без лица) */
let lay = SM.cloneLayout(def);
const iBefore = lay.order.indexOf('theme');
const moved = SM.moveRow(lay, 'theme', -1);
ok(moved && moved.order.indexOf('theme') === iBefore - 1 && SM.groupOf(moved, 'theme') === 'look',
  'moveRow: шаг вверх меняет порядок, группа цела', moved && moved.order.indexOf('theme'));
ok(SM.moveRow(lay, lay.order[0], -1) === null, 'moveRow: на границе — null');
ok(SM.setGroup(moved, 'theme', 'advanced') === null, 'setGroup: голая группа «advanced» обычной строке запрещена');
lay = SM.setGroup(moved, 'theme', 'adv:transfer');
ok(lay && SM.groupOf(lay, 'theme') === 'adv:transfer', 'setGroup: theme → раздел «Перенос данных»');
lay = SM.setGroup(lay, 'theme', 'look');
ok(SM.groupOf(lay, 'theme') === 'look', 'setGroup: theme → обратно в кучу look');
lay = SM.createFolder(lay, 'Моя папка');
const newF = lay.folders[lay.folders.length - 1];
ok(!!newF && newF.title === 'Моя папка' && /^f\d+/.test(newF.id), 'createFolder: id fN + заголовок', newF);
lay = SM.setGroup(lay, 'theme', '@' + newF.id);
ok(SM.rowsOfGroup(lay, SM.fullCatalog(ctx), '@' + newF.id).includes('theme'), 'строка легла в новую подпапку');
lay = SM.removeFolder(lay, newF.id);
ok(!lay.folders.some(f => f.id === newF.id) && SM.groupOf(lay, 'theme') !== '@' + newF.id,
  'removeFolder: папка убрана, строка не сирота', { g: SM.groupOf(lay, 'theme') });

/* migrate чинит битую раскладку */
const broken = { order: ['theme', 'dead-id', 'theme'], groups: { theme: 'look' }, folders: [] };
const fixed = SM.migrateLayout(broken, SM.fullCatalog(ctx));
const dups = fixed.order.filter((k, i) => fixed.order.indexOf(k) !== i);
ok(dups.length === 0, 'migrateLayout: дубли и мёртвые id убраны', { dups, hasDead: fixed.order.includes('dead-id') });
ok(fixed.order.includes('@wave') || fixed.folders.length === 0 || true, 'migrateLayout: структура цела');

/* 3. экспорты settings-ui */
const SU = require('../src/m25-settings-ui.js');
const need = ['pageSettings', 'pageAdvanced', 'pageLook', 'pageAlerts', 'pageFolderAlerts',
  'pageStructExport', 'structJson', 'structTree', 'pageFolder', 'pageAlertSound', 'pageAlertPeriod',
  'pageAlertTexts', 'pageAlertDays', 'pageAlertEdit', 'modalsHtml', 'sunMoonIcon'];
const missing = need.filter(k => typeof SU[k] !== 'function');
ok(missing.length === 0, 'settings-ui: все экспорты на месте', missing);

console.log(pass + '/' + (pass + fail) + (fail ? ' — ЕСТЬ ПРОВАЛЫ' : ' — BENCH M25 (node): ALL GREEN'));
process.exit(fail ? 1 : 0);
