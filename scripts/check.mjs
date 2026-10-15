// Прогон игры в Chromium: несколько сценариев, скриншоты и итоговый профиль в папку shots/.
// Падает, если в консоли есть ошибки. Всё детерминировано (фиксированные время и Math.random),
// поэтому два прогона можно сравнить побайтно:
//   npm run check                          → проверить ./index.html, результат в shots/
//   node scripts/check.mjs other.html out/ → прогнать другой файл в другую папку
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const page_ = path.resolve(process.argv[2] || "index.html");
const outDir = path.resolve(process.argv[3] || "shots");
fs.mkdirSync(outDir, { recursive: true });
const URL_ = pathToFileURL(page_).href;
const NOW = new Date("2026-10-15T10:00:00");

// «прокачанный» игрок: много вещей, кампания почти пройдена, башня открыта
const VETERAN = {
  name: "Тест", xp: 60000, coins: 12345, rv: 2, xpv: 2, storySeen: 1, lep: 1, towerBest: 12, best: 900, bestStreak: 25,
  unlocked: 8, beaten: [0, 1, 2, 3, 4, 5, 6, 7],
  owned: Object.fromEntries(["ruler", "pen", "blaster", "lasersword", "steel", "cyber", "knight", "crown", "tubeteika", "tatarc",
    "wings", "phoenix", "cat", "minidragon", "drone", "sparks", "galaxy", "space", "ninja", "cyberninja"].map(id => [id, 1])),
  equip: { weapon: "lasersword", armor: "cyber", helmet: "tubeteika", back: "phoenix", pet: "minidragon", aura: "galaxy", costume: "tatarc" },
  up: { str: 5, hp: 2, time: 1, gold: 1 },
  tot: { correct: 800, typed: 120, bosses: 40, flawless: 9, bought: 20, crits: 300 },
};
// старое сохранение: до вставки новых боссов (rv:1) и до новой формулы опыта (xpv нет)
const LEGACY = { name: "Старичок", xp: 9000, coins: 500, rv: 1, unlocked: 5, beaten: [0, 1, 2, 3, 4], owned: { oscar: 1 }, equip: { pet: "oscar" }, storySeen: 1 };

const SCENARIOS = [
  { name: "new", storage: {}, run: async (p, shot) => {
    await shot("01-name");
    await p.fill("#name-in", "Тест"); await p.click("#name-form button[type=submit]"); await tick(p, 500);
    await shot("02-story");
    await p.click("#btn-story-go"); await tick(p, 1500);
    await shot("03-home");
    await p.click("#btn-shop"); await tick(p); await shot("04-shop");
    await p.click("#btn-shop-back"); await p.click("#btn-campaign"); await tick(p); await shot("05-intro");
    await p.click("#btn-fight"); await tick(p, 800); await shot("06-question");
    await p.click("#opt0"); await tick(p, 2500); await shot("07-after-answer");
    await p.click("#opt1"); await tick(p, 2500); await shot("08-after-answer");
  } },
  { name: "veteran", storage: { sb2_profile: VETERAN, sb_stats: { "берёза": { right: 3, wrong: 2 }, "ворона": { right: 1, wrong: 4 } } }, run: async (p, shot) => {
    await tick(p, 1500); await shot("01-home");
    await p.click("#btn-shop"); await tick(p); await shot("02-shop");
    for (const tab of ["armor", "pet", "aura", "costume", "look"]){
      const t = p.locator(`#tabs .tab[data-s="${tab}"]`);
      if (await t.count()){ await t.click(); await tick(p); await shot(`03-shop-${tab}`); }
    }
    await p.click("#btn-shop-back"); await p.click("#btn-awards"); await tick(p); await shot("04-awards");
    await p.click("#btn-aw-back"); await p.click("#btn-trophy"); await tick(p); await shot("05-trophies");
    await p.click("#btn-tr-back"); await p.click("#btn-teacher-1"); await tick(p); await shot("06-teacher");
    await p.click("#btn-back"); await p.click("#btn-tower"); await tick(p); await shot("07-tower-intro");
    await p.click("#btn-fight"); await tick(p, 800); await p.click("#opt0"); await tick(p, 2500); await shot("08-tower-fight");
  } },
  { name: "legacy", storage: { sb2_profile: LEGACY }, run: async (p, shot) => { await tick(p, 2500); await shot("01-home"); } },
];

const tick = (p, ms = 400) => p.clock.runFor(ms);

const errors = [];
const browser = await chromium.launch();
for (const sc of SCENARIOS){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "ru-RU" });
  const p = await ctx.newPage();
  p.on("pageerror", e => errors.push(`[${sc.name}] ${e.message}`));
  p.on("console", m => { if (m.type() === "error" && !/fonts\.g/.test(m.text())) errors.push(`[${sc.name}] console: ${m.text()}`); });
  await p.clock.install({ time: NOW });
  await p.clock.pauseAt(new Date(NOW.getTime() + 1000));   // время идёт только через tick()
  await p.addInitScript(storage => {
    let a = 12345; Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    if (!sessionStorage.getItem("seeded")){
      sessionStorage.setItem("seeded", "1"); localStorage.clear();
      for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, JSON.stringify(v));
    }
  }, sc.storage);
  await p.goto(URL_);
  await p.evaluate(() => document.fonts.ready);
  const shot = async name => p.screenshot({ path: path.join(outDir, `${sc.name}-${name}.png`), animations: "disabled",
    mask: [p.locator("#rage-fill").locator("..")] });   // полоска таймера идёт по реальным кадрам rAF, край дрожит на 1px
  try { await sc.run(p, shot); }
  catch (e){ errors.push(`[${sc.name}] шаг упал: ${e.message.split("\n")[0]}`); await shot("FAILED"); }
  const ls = await p.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, JSON.parse(localStorage.getItem(k))])));
  fs.writeFileSync(path.join(outDir, `${sc.name}-storage.json`), JSON.stringify(ls, null, 2));
  await ctx.close();
}
await browser.close();

if (errors.length){ console.error("Ошибки:\n" + errors.join("\n")); process.exit(1); }
console.log(`OK: ${SCENARIOS.length} сценария, скриншоты в ${path.relative(process.cwd(), outDir) || "."}`);
