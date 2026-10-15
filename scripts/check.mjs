// Прогон игры в Chromium: несколько сценариев, скриншоты и итоговое состояние в папку shots/.
// Падает, если в консоли есть ошибки. Всё детерминировано (фиксированные время и Math.random),
// поэтому два прогона можно сравнить побайтно:
//   npm run check                                  → собрать и проверить apps/web/dist(-online), результат в shots/
//   node scripts/check.mjs other/index.html out/   → прогнать другую сборку в другую папку
// Страницы отдаёт маленький локальный сервер: ES-модули не грузятся по file://.
// Сценарий online берёт сборку dist-online (рядом с проверяемой) и настоящий API из apps/api с базой в памяти.
import { chromium } from "playwright";
import fs from "fs";
import http from "http";
import path from "path";
import { createApp } from "../apps/api/src/app.ts";
import { hashPassword } from "../apps/api/src/auth.ts";
import { MemoryStore } from "../apps/api/src/store/memory.ts";

const page_ = path.resolve(process.argv[2] || "apps/web/dist/index.html");
const outDir = path.resolve(process.argv[3] || "shots");
const onlineRoot = path.join(path.dirname(page_), "..", "dist-online");
fs.mkdirSync(outDir, { recursive: true });
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

/** Статика из docRoot и, если передан api, запросы /api/* в него (как API Gateway в облаке). */
async function serve(docRoot, api) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://x");
    if (api && url.pathname.startsWith("/api/")) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const r = await api.fetch(
        new Request(url, {
          method: req.method,
          headers: req.headers,
          body: chunks.length ? Buffer.concat(chunks) : undefined,
        }),
      );
      res.writeHead(r.status, Object.fromEntries(r.headers));
      res.end(Buffer.from(await r.arrayBuffer()));
      return;
    }
    const f = path.join(docRoot, decodeURIComponent(url.pathname));
    if (!f.startsWith(docRoot) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, base: `http://127.0.0.1:${server.address().port}/` };
}

const offline = await serve(path.dirname(page_));
const URL_ = offline.base + path.basename(page_);
const NOW = new Date("2026-10-15T10:00:00");

// «прокачанный» игрок: много вещей, кампания почти пройдена, башня открыта
const VETERAN = {
  name: "Тест",
  xp: 60000,
  coins: 12345,
  rv: 2,
  xpv: 2,
  storySeen: 1,
  lep: 1,
  towerBest: 12,
  best: 900,
  bestStreak: 25,
  unlocked: 8,
  beaten: [0, 1, 2, 3, 4, 5, 6, 7],
  owned: Object.fromEntries(
    [
      "ruler",
      "pen",
      "blaster",
      "lasersword",
      "steel",
      "cyber",
      "knight",
      "crown",
      "tubeteika",
      "tatarc",
      "wings",
      "phoenix",
      "cat",
      "minidragon",
      "drone",
      "sparks",
      "galaxy",
      "space",
      "ninja",
      "cyberninja",
    ].map((id) => [id, 1]),
  ),
  equip: {
    weapon: "lasersword",
    armor: "cyber",
    helmet: "tubeteika",
    back: "phoenix",
    pet: "minidragon",
    aura: "galaxy",
    costume: "tatarc",
  },
  up: { str: 5, hp: 2, time: 1, gold: 1 },
  tot: { correct: 800, typed: 120, bosses: 40, flawless: 9, bought: 20, crits: 300 },
};
/** Титульный экран: «Нажми, чтобы начать», меню, «Играть». */
async function enter(p, shot) {
  await tick(p, 1500);
  if (shot) await shot("00-title");
  await p.click("#title-press");
  await tick(p, 400);
  if (shot) await shot("00-title-menu");
  await p.click("#btn-title-play");
  await tick(p);
}

/** История комиксом: «Дальше» до последнего кадра и «В поход!». */
async function storyThrough(p, shot) {
  for (let i = 0; i < 3; i++) {
    await p.click("#btn-story-go");
    await tick(p);
  }
  if (shot) await shot("02b-story-last");
  await p.click("#btn-story-go");
}

/** Экраны «прокачанного» игрока на большом экране: титул, главная, гардероб, бой. */
async function bigScreens(p, shot) {
  await enter(p, shot);
  await tick(p, 1100);
  await shot("01-home");
  await p.click("#btn-shop");
  await tick(p);
  await shot("02-shop");
  await p.click("#btn-shop-back");
  await p.click("#btn-awards");
  await tick(p);
  await shot("03-awards");
  await p.click("#btn-aw-back");
  await p.click("#btn-tower");
  await tick(p);
  await shot("04-tower-intro");
  await p.click("#btn-fight");
  await tick(p, 800);
  await p.click("#opt0");
  await tick(p, 2500);
  await shot("05-tower-fight");
  await p.click("#btn-quit");
  await p.click("#btn-teacher-1");
  await tick(p);
  await shot("06-teacher");
}

// старое сохранение: до вставки новых боссов (rv:1) и до новой формулы опыта (xpv нет)
const LEGACY = {
  name: "Старичок",
  xp: 9000,
  coins: 500,
  rv: 1,
  unlocked: 5,
  beaten: [0, 1, 2, 3, 4],
  owned: { oscar: 1 },
  equip: { pet: "oscar" },
  storySeen: 1,
};

const SCENARIOS = [
  {
    name: "new",
    storage: {},
    run: async (p, shot) => {
      await enter(p, shot);
      await shot("01-name");
      await p.fill("#name-in", "Тест");
      await p.click("#name-form button[type=submit]");
      await tick(p, 500);
      await shot("02-story");
      await storyThrough(p, shot);
      await tick(p, 1500);
      await shot("03-home");
      await p.click("#btn-shop");
      await tick(p);
      await shot("04-shop");
      await p.click("#btn-shop-back");
      await p.click("#btn-campaign");
      await tick(p);
      await shot("05-intro");
      await p.click("#btn-fight");
      await tick(p, 800);
      await shot("06-question");
      await p.click("#opt0");
      await tick(p, 2500);
      await shot("07-after-answer");
      await p.click("#opt1");
      await tick(p, 2500);
      await shot("08-after-answer");
    },
  },
  {
    name: "veteran",
    storage: { sb2_profile: VETERAN, sb_stats: { берёза: { right: 3, wrong: 2 }, ворона: { right: 1, wrong: 4 } } },
    run: async (p, shot) => {
      await enter(p, shot);
      await tick(p, 1100);
      await shot("01-home");
      await p.click("#btn-shop");
      await tick(p);
      await shot("02-shop");
      for (const tab of ["armor", "pet", "aura", "costume", "look"]) {
        const t = p.locator(`#tabs .tab[data-s="${tab}"]`);
        if (await t.count()) {
          await t.click();
          await tick(p);
          await shot(`03-shop-${tab}`);
        }
      }
      await p.click("#btn-shop-back");
      await p.click("#btn-awards");
      await tick(p);
      await shot("04-awards");
      await p.click("#btn-aw-back");
      await p.click("#btn-trophy");
      await tick(p);
      await shot("05-trophies");
      await p.click("#btn-tr-back");
      await p.click("#btn-teacher-1");
      await tick(p);
      await shot("06-teacher");
      for (const tab of ["limits", "stats", "pin", "guide", "words"]) {
        await p.click(`#ttabs .tab[data-tt="${tab}"]`);
        await tick(p);
        await shot(`06-teacher-${tab}`);
      }
      await p.fill("#custom", "м(о)локо\nс(о)бака\nбез скобок");
      await p.click("#btn-save-words");
      await tick(p);
      await shot("06b-teacher-words");
      await p.click("#btn-back");
      await p.click("#btn-tower");
      await tick(p);
      await shot("07-tower-intro");
      await p.click("#btn-fight");
      await tick(p, 800);
      await p.click("#opt0");
      await tick(p, 2500);
      await shot("08-tower-fight");
    },
  },
  {
    name: "legacy",
    storage: { sb2_profile: LEGACY },
    run: async (p, shot) => {
      await enter(p);
      await tick(p, 2100);
      await shot("01-home");
    },
  },
  {
    // победа над боссом: сундук трясётся, открывается, монеты и вещь (Сила 99 убивает Кляксу с одного удара)
    name: "victory",
    storage: {
      sb2_profile: { ...VETERAN, unlocked: 1, beaten: [0], up: { str: 99, hp: 0, time: 0, gold: 3 } },
    },
    run: async (p, shot) => {
      await enter(p);
      await tick(p, 1100);
      await p.click("#map .bcard[data-i='1']");
      await tick(p);
      await p.click("#btn-fight");
      await tick(p, 800);
      const dead = async () => (await p.locator("#boss-cv.dead").count()) > 0;
      for (let i = 0; i < 8 && !(await dead()); i++) {
        await p.click("#opt0");
        for (let t = 0; t < 30 && !(await dead()); t++) await tick(p, 100);
      }
      await tick(p, 1300); // экран победы появляется через 1.1 с
      await shot("01-chest-shaking");
      await tick(p, 1000);
      await shot("02-chest-open");
    },
  },
  { name: "tablet", storage: { sb2_profile: VETERAN }, viewport: { width: 820, height: 1180 }, run: bigScreens },
  { name: "laptop", storage: { sb2_profile: VETERAN }, viewport: { width: 1024, height: 768 }, run: bigScreens },
  { name: "desktop", storage: { sb2_profile: VETERAN }, viewport: { width: 1440, height: 900 }, run: bigScreens },
];

const tick = (p, ms = 400) => p.clock.runFor(ms);

const errors = [];
const browser = await chromium.launch();

/** Новая вкладка с фиксированными временем и случайностью и заранее заданным localStorage. */
async function openPage(label, url, storage = {}, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, locale: "ru-RU" });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(`[${label}] ${e.message}`));
  p.on("console", (m) => {
    // браузер пишет в консоль любой ответ 4xx; в online-сценарии они ожидаемы (неверный код)
    const expected = label.startsWith("online") && /Failed to load resource: .* (404|409)/.test(m.text());
    if (m.type() === "error" && !expected && !/fonts\.g/.test(m.text())) errors.push(`[${label}] console: ${m.text()}`);
  });
  await p.clock.install({ time: NOW });
  await p.clock.pauseAt(new Date(NOW.getTime() + 1000)); // время идёт только через tick()
  await p.addInitScript((storage) => {
    let a = 12345;
    Math.random = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    if (!sessionStorage.getItem("seeded")) {
      sessionStorage.setItem("seeded", "1");
      localStorage.clear();
      for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, JSON.stringify(v));
    }
  }, storage);
  await p.goto(url);
  await p.evaluate(() => document.fonts.ready);
  const shot = async (name, mask = []) =>
    p.screenshot({
      path: path.join(outDir, `${label}-${name}.png`),
      animations: "disabled",
      // полоска таймера идёт по реальным кадрам rAF, её край дрожит на 1px
      mask: [p.locator("#rage-fill").locator(".."), ...mask.map((m) => p.locator(m))],
    });
  const dump = async (file) => {
    const ls = await p.evaluate(() =>
      Object.fromEntries(
        Object.keys(localStorage)
          .sort()
          .map((k) => [k, JSON.parse(localStorage.getItem(k))]),
      ),
    );
    fs.writeFileSync(path.join(outDir, `${file}-storage.json`), JSON.stringify(ls, null, 2));
    return ls;
  };
  return { ctx, p, shot, dump };
}

for (const sc of SCENARIOS) {
  const { ctx, p, shot, dump } = await openPage(sc.name, URL_, sc.storage, sc.viewport);
  try {
    await sc.run(p, shot);
  } catch (e) {
    errors.push(`[${sc.name}] шаг упал: ${e.message.split("\n")[0]}`);
    await shot("FAILED");
  }
  await dump(sc.name);
  await ctx.close();
}

// ---------- online: репетитор заводит ученика, ученик входит по коду, прогресс и настройки ходят через API ----------
let ran = SCENARIOS.length;
if (fs.existsSync(path.join(onlineRoot, "index.html"))) {
  ran++;
  const store = new MemoryStore();
  const api = createApp({ store, secret: "check", tutorPasswordHash: hashPassword("secret"), now: () => NOW });
  const online = await serve(onlineRoot, api);
  const expect = (cond, what) => cond || errors.push(`[online] ${what}`);
  const wide = { width: 1024, height: 900 };
  const tutor = await openPage("online-tutor", online.base + "tutor.html", {}, wide);
  const kid = await openPage("online-kid", online.base + "index.html");
  const progress = (pg) =>
    pg.waitForResponse((r) => r.url().endsWith("/api/me/progress") && r.request().method() === "PUT");
  try {
    const t = tutor.p,
      k = kid.p;
    await tutor.shot("01-login");
    await t.fill("#pass", "secret");
    await t.click("#login button[type=submit]");
    await t.waitForSelector("#add-name");
    await tutor.shot("02-empty");
    await t.fill("#add-name", "Маша");
    await t.click("#add button[type=submit]");
    await t.waitForSelector("#code");
    const code = (await t.textContent("#code")).trim();
    await tutor.shot("03-new-student", ["#code"]);

    await tick(k, 1500);
    await k.click("#title-press");
    await tick(k, 400);
    await kid.shot("01-title");
    await k.click("#btn-title-play");
    await tick(k);
    await kid.shot("02-join");
    await k.fill("#join-in", "нет такого");
    await k.click("#join-form button[type=submit]");
    await k.waitForSelector("#join-msg.err");
    await kid.shot("03-join-wrong");
    await k.fill("#join-in", code.toLowerCase());
    const firstPush = progress(k);
    await k.click("#join-form button[type=submit]");
    await firstPush;
    await k.waitForSelector("#s-story:not([hidden])");
    await tick(k, 500);
    await kid.shot("04-story");
    await storyThrough(k);
    await tick(k, 1500);
    await kid.shot("05-home");
    await k.click("#btn-campaign");
    await tick(k);
    await k.click("#btn-fight");
    await tick(k, 800);
    for (const opt of ["#opt0", "#opt1", "#opt0"]) {
      await k.click(opt);
      await tick(k, 2500);
    }
    const battlePush = progress(k);
    await tick(k, 30_000);
    await battlePush;
    const rec = (await store.listStudents())[0];
    expect(rec?.profile?.name === "Маша", "на сервере нет профиля Маши");
    expect((rec?.profile?.tot?.correct ?? 0) + Object.keys(rec?.stats ?? {}).length > 0, "на сервер не дошли ответы");

    await t.goto(online.base + "tutor.html#/");
    await t.waitForSelector("tr[data-id]");
    await tutor.shot("04-list");
    await t.click("tr[data-id]");
    await t.waitForSelector("#settings");
    await tutor.shot("05-student", ["#code"]);
    await t.click('label.mode:has(input[value="custom"])');
    await t.fill("#custom", "м(о)локо\nс(о)бака");
    await t.fill('[name="lim-min"]', "30");
    await t.click("#settings button[type=submit]");
    await t.waitForSelector("#set-msg.okm");
    await tutor.shot("06-settings-saved", ["#code"]);

    const pulled = k.waitForResponse((r) => r.url().endsWith("/api/me"));
    await k.reload();
    await pulled;
    await enter(k);
    await tick(k, 1100);
    await kid.shot("06-home-after-settings");
    const ls = await kid.dump("online-kid");
    expect(ls.sb_settings?.words === "custom", "ученик не получил режим слов от репетитора");
    expect(ls.sb_settings?.lim?.min === 30, "ученик не получил лимит минут");
    expect(ls.sb_custom === "м(о)локо\nс(о)бака", "ученик не получил свои слова репетитора");
    const { code: _c, id: _i, ...stable } = (await store.listStudents())[0];
    fs.writeFileSync(path.join(outDir, "online-server.json"), JSON.stringify(stable, null, 2));
  } catch (e) {
    errors.push(`[online] шаг упал: ${e.message.split("\n")[0]}`);
    await tutor.shot("FAILED");
    await kid.shot("FAILED");
  }
  await tutor.ctx.close();
  await kid.ctx.close();
  online.server.close();
}

await browser.close();
offline.server.close();

if (errors.length) {
  console.error("Ошибки:\n" + errors.join("\n"));
  process.exit(1);
}
console.log(`OK: ${ran} сценария, скриншоты в ${path.relative(process.cwd(), outDir) || "."}`);
