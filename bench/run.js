/* Стенд v0 Watertracker-next: меряет ДОНORA (старый www) как базовую линию.
   Запуск: node bench/run.js <store.json> <tag>
   Даёт bench/shots/<tag>.png + bench/reports/<tag>.json.
   Числа: уровень, слои волны (анимация, скорость px/s), геометрия кромки
   (размах вверх/вниз от ватерлинии WT_HEAD=24, доля плоских точек = детектор
   «среза»), пояс (y1/y2, стопы). */
const fs = require('fs');
const path = require('path');
const { chromium } = require('/home/user/pw/node_modules/playwright');

const WT_HEAD = 24;
const URL_OLD = 'http://127.0.0.1:8085/water-tracker-android/wtapp/app/src/main/assets/www/index.html';

(async () => {
  const [storeFile, tag] = process.argv.slice(2);
  if (!storeFile || !tag) { console.error('usage: run.js <store.json> <tag>'); process.exit(2); }
  const raw = JSON.parse(fs.readFileSync(storeFile, 'utf8'));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 900 } });
  await ctx.addInitScript(([t, l]) => {
    localStorage.setItem('cup-tracker-v1', t);
    if (l) localStorage.setItem('cup-liquid-color-v1', l);
  }, [JSON.stringify(raw.tracker), raw.liquid ? JSON.stringify(raw.liquid) : null]);
  const p = await ctx.newPage();
  await p.goto(URL_OLD);
  await p.waitForSelector('.nav', { timeout: 10000 });
  await p.waitForTimeout(1200);

  const snap = () => p.evaluate((HEAD) => {
    const out = { layers: [], crest: [], belt: null, level: null };
    const box = document.querySelector('.cat-water-box');
    if (box) out.level = { wp: box.getAttribute('data-wp') };
    const lift = document.querySelector('.cat-waterlift');
    if (lift) out.level.lift = lift.style.transform;
    document.querySelectorAll('.cat-wave').forEach((el) => {
      const cs = getComputedStyle(el);
      out.layers.push({
        cls: el.className.replace('cat-wave ', ''),
        name: cs.animationName, dur: cs.animationDuration, play: cs.animationPlayState,
        tx: cs.transform, live: el.getAnimations().length,
        belt: el.classList.contains('cat-beltwave')
      });
      const pa = el.querySelector('svg path');
      if (pa && pa.getTotalLength) {
        /* Меряем ТОЛЬКО кромку: команды d до первого L (замыкание заливки
           и его линия в размах не входят). */
        const d = pa.getAttribute('d') || '';
        const edgeD = d.split(/(?=L)/)[0];
        const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        tmp.setAttribute('d', edgeD);
        pa.ownerSVGElement.appendChild(tmp);
        const L = tmp.getTotalLength(); let up = 0, dn = 0, flat = 0, n = 240;
        for (let i = 0; i <= n; i++) {
          const y = tmp.getPointAtLength(L * i / n).y;
          up = Math.max(up, HEAD - y); dn = Math.max(dn, y - HEAD);
          if (Math.abs(y - HEAD) < 0.5) flat++;
        }
        tmp.remove();
        out.crest.push({ cls: el.className.replace('cat-wave ', ''), up: +up.toFixed(2), down: +dn.toFixed(2), flatFrac: +(flat / (n + 1)).toFixed(3) });
      }
    });
    const g = document.querySelector('[data-beltgrad]');
    if (g) out.belt = { y1: g.getAttribute('y1'), y2: g.getAttribute('y2'), stops: g.querySelectorAll('stop').length };
    return out;
  }, WT_HEAD);

  const s1 = await snap();
  await p.waitForTimeout(1000);
  const s2 = await snap();
  s1.layers.forEach((l, i) => {
    const m1 = /matrix\(1, 0, 0, 1, (-?[\d.]+)/.exec(l.tx || '');
    const m2 = /matrix\(1, 0, 0, 1, (-?[\d.]+)/.exec((s2.layers[i] || {}).tx || '');
    l.speedPxS = m1 && m2 ? +(Math.abs(parseFloat(m2[1]) - parseFloat(m1[1]))).toFixed(1) : null;
    delete l.tx;
  });

  const shots = path.join(__dirname, 'shots'); const reps = path.join(__dirname, 'reports');
  fs.mkdirSync(shots, { recursive: true }); fs.mkdirSync(reps, { recursive: true });
  await p.screenshot({ path: path.join(shots, tag + '.png'), clip: { x: 0, y: 60, width: 412, height: 560 } });
  const rep = { tag, ts: new Date().toISOString(), target: 'donor-v158', ...s1 };
  fs.writeFileSync(path.join(reps, tag + '.json'), JSON.stringify(rep, null, 1));
  console.log(JSON.stringify(rep, null, 1));
  await b.close();
})();
