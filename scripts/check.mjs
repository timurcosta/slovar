// Прогон игры в Chromium: несколько сценариев, скриншоты и итоговое состояние в папку shots/.
// Падает, если в консоли есть ошибки. Всё детерминировано (фиксированные время и Math.random),
// поэтому два прогона можно сравнить побайтно:
//   npm run check                                  → собрать и проверить apps/web/dist, результат в shots/
//   node scripts/check.mjs other/index.html out/   → прогнать другую сборку в другую папку
// Страницы отдаёт маленький локальный сервер (ES-модули не грузятся по file://) вместе с настоящим API
// из apps/api с базой в памяти, как шлюз в облаке. У каждого сценария свой сервер и своя база.
import { chromium } from "playwright";
import fs from "fs";
import http from "http";
import path from "path";
import { createApp } from "../apps/api/src/app.ts";
import { hashPassword, signToken } from "../apps/api/src/auth.ts";
import { MemoryStore } from "../apps/api/src/store/memory.ts";

const page_ = path.resolve(process.argv[2] || "apps/web/dist/index.html");
const outDir = path.resolve(process.argv[3] || "shots");
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
    const f = path.join(docRoot, decodeURIComponent(url.pathname).replace(/\/$/, "/index.html"));
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

const DIST = path.dirname(page_);
const NOW = new Date("2026-10-15T10:00:00");
// адрес игры в облаке, куда ведёт страница переезда со старого адреса (как GAME_URL в apps/web/src/moved.ts)
const GAME_URL = "https://d5dc1pebpoct5vvkti5h.l5v6loqa.apigw.yandexcloud.net/";
const SECRET = "check";

/** Игра и API с пустой базой. */
async function site() {
  const store = new MemoryStore();
  const api = createApp({ store, secret: SECRET, tutorPasswordHash: hashPassword("secret"), now: () => NOW });
  return { store, ...(await serve(DIST, api)) };
}

/**
 * Ученик, которого учитель уже завёл. С profile — он уже входил по коду и играл на этом устройстве:
 * возвращает его localStorage (прогресс, токен входа). Без profile — ещё не входил, localStorage пуст.
 */
async function addKid(store, { name, code = "ABC234", profile = null, stats = null, tasks = [] }) {
  const t = NOW.toISOString(),
    id = "kid-" + code;
  await store.createStudent({
    id,
    name,
    code,
    codeVersion: 1,
    settings: {},
    tasks,
    profile,
    stats,
    rev: profile ? 1 : 0,
    createdAt: t,
    updatedAt: t,
    lastSeenAt: profile ? t : null,
  });
  if (!profile) return {};
  return {
    sb2_profile: profile,
    ...(stats ? { sb_stats: stats } : {}),
    sb_token: signToken({ role: "student", sid: id, cv: 1 }, SECRET),
    sb_tutor_name: name,
    sb_rev: 1,
    sb_tasks: tasks,
  };
}

// задания Ралины: сегодня 2026-10-15
const TASK_WORDS = ["кла(сс)", "а(лл)ея", "гру(пп)а", "ми(лл)ион", "ко(лл)екция"];
const TASKS = [
  {
    id: "t-double",
    title: "Удвоенные согласные",
    words: TASK_WORDS,
    from: "2026-10-15",
    until: "2026-10-20",
    coins: 150,
    chest: true,
    medal: true,
    note: "Не торопись, читай слово целиком!",
    congrats: "{имя}, ты справился! Удвоенные теперь твои.",
    createdAt: "2026-10-14T10:00:00.000Z",
  },
  { id: "t-gift", title: "Подарок от Ралины", words: [], coins: 100, createdAt: "2026-10-14T10:00:00.000Z" },
  // откроется завтра: сегодня его не видно
  {
    id: "t-later",
    title: "Словарные на завтра",
    words: ["м(о)локо"],
    from: "2026-10-16",
    coins: 150,
    createdAt: "2026-10-14T10:00:00.000Z",
  },
];
/** Ответить верно: во всех словах задания верная буква — удвоенная. */
async function answerTask(p, right = true) {
  const opts = await p.locator("#opts .opt span").allTextContents();
  const i = opts.findIndex((o) => (o.length === 2) === right);
  await p.click(`#opt${i < 0 ? 0 : i}`);
}

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
  // не вошёл и не гость: открылось окно «Кто играет?», дальше решает сценарий
  if (await p.locator("#login:not([hidden])").count()) return;
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
  // короткий список: полоска «Готово» всё равно внизу окна, а не сразу под вещами
  await p.click('#tabs .tab[data-s="aura"]');
  await tick(p);
  await shot("02b-shop-aura");
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
    // учитель завёл ученика «Тест» с кодом ABC234, ученик открывает игру впервые
    name: "new",
    kid: { name: "Тест" },
    run: async (p, shot) => {
      await enter(p, shot);
      await shot("01-login");
      await p.fill("#join-in", "abc234");
      await p.click("#join-form button[type=submit]");
      await p.waitForSelector("#s-story:not([hidden])");
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
      // не отвечаем: босс бьёт по таймеру, пока не кончатся сердца — экран итогов
      for (let i = 0; i < 12 && (await p.locator("#s-end[hidden]").count()); i++) await tick(p, 5000);
      await tick(p, 1500);
      await shot("09-end");
    },
  },
  {
    name: "veteran",
    kid: { name: "Тест", profile: VETERAN, stats: { берёза: { right: 3, wrong: 2 }, ворона: { right: 1, wrong: 4 } } },
    run: async (p, shot) => {
      await enter(p, shot);
      await tick(p, 1100);
      await shot("01-home");
      await p.locator("#map").scrollIntoViewIfNeeded();
      await shot("01b-home-bottom");
      await p.click("#btn-prefs");
      await tick(p);
      await shot("01e-opts");
      await p.click("#btn-prefs-close");
      await p.click("#btn-share");
      await p.waitForFunction(
        () => document.getElementById("share-img").complete && !document.getElementById("share").hidden,
      );
      await tick(p);
      await shot("01c-share");
      // сама картинка с каждым фоном — чтобы посмотреть её целиком
      const saveCard = async (file) => {
        const card = await p.evaluate(async () => {
          const b = await (await fetch(document.getElementById("share-img").src)).blob();
          return await new Promise((r) => {
            const f = new FileReader();
            f.onload = () => r(String(f.result).split(",")[1]);
            f.readAsDataURL(b);
          });
        });
        fs.writeFileSync(path.join(outDir, file), Buffer.from(card, "base64"));
      };
      await saveCard("veteran-01d-share-castle.png");
      for (const bg of ["volcano", "space", "neon"]) {
        const before = await p.getAttribute("#share-img", "src");
        await p.click(`#share-bgs [data-bg="${bg}"]`);
        await p.waitForFunction((b) => document.getElementById("share-img").src !== b, before);
        await saveCard(`veteran-01d-share-${bg}.png`);
      }
      await p.click('#share-bgs [data-bg="castle"]');
      await tick(p);
      await p.click("#btn-share-close");
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
    // старое сохранение на прежнем адресе (GitHub Pages): страница переезда передаёт его игре в облаке
    name: "legacy",
    moved: true,
    storage: { sb2_profile: LEGACY },
    run: async (p, shot, { expect }) => {
      await tick(p, 500);
      await shot("00-moved");
      const arrived = p.waitForURL((u) => u.href.startsWith(GAME_URL) && !u.hash);
      await tick(p, 4000);
      await arrived;
      await p.evaluate(() => document.fonts.ready);
      await enter(p);
      await shot("01-login"); // герой со старого адреса уже здесь, кода пока нет — играем гостем
      await p.click("#btn-guest-new"); // «Начать новым героем» спрашивает ещё раз, герой цел
      await shot("01b-login-new-confirm");
      await p.click("#btn-guest");
      await tick(p, 2100);
      await shot("02-home");
      await p.click("#btn-prefs");
      await tick(p);
      await shot("03-opts-guest");
      await p.click("#btn-prefs-close");
      // новый запуск игры (выбор гостя живёт до закрытия): снова «Кто играет?», герой на месте
      await p.evaluate(() => sessionStorage.removeItem("sb_guest"));
      await p.reload();
      await p.evaluate(() => document.fonts.ready);
      await enter(p);
      expect(await p.locator("#login:not([hidden])").count(), "гость при новом запуске не спросили, кто играет");
      await shot("04-relaunch-login");
      await p.click("#btn-guest");
      await tick(p, 2100);
      expect((await p.textContent("#home-name")) === "Старичок", "гость при новом запуске потерял героя");
    },
  },
  {
    // нет сети: игра идёт как обычно, прогресс копится и уходит на сервер, когда сеть появляется
    name: "offline",
    offline: true,
    kid: { name: "Тест", profile: { ...VETERAN, coins: 100 } },
    run: async (p, shot, { ctx, store, expect }) => {
      await enter(p);
      await tick(p, 1100);
      await shot("01-home");
      await p.click("#btn-campaign");
      await tick(p);
      await p.click("#btn-fight");
      await tick(p, 800);
      // отвечаем, пока не попадём (нажатие может уйти на подлянку: миньона, пузырь)
      for (let n = 0; n < 10 && (await p.textContent("#score")) === "0"; n++) {
        await p.click(n % 2 ? "#opt1" : "#opt0");
        await tick(p, 2500);
      }
      await shot("02-fight");
      await tick(p, 31_000); // попытка отправки без сети
      const before = (await store.getStudent("kid-ABC234")).profile.coins;
      expect(before === 100, "без сети прогресс как-то дошёл до сервера");
      expect(
        await p.evaluate(() => localStorage.getItem("sb_dirty") === "true"),
        "без сети прогресс не помечен к отправке",
      );
      await ctx.unroute("**/api/**");
      const sent = p.waitForResponse((r) => r.url().endsWith("/api/me/progress") && r.request().method() === "PUT");
      await p.evaluate(() => window.dispatchEvent(new Event("online")));
      await sent;
      const after = (await store.getStudent("kid-ABC234")).profile;
      expect(after.coins > 100 && after.tot.correct > VETERAN.tot.correct, "после появления сети прогресс не дошёл");
    },
  },
  {
    // победа над боссом: сундук трясётся, открывается, монеты и вещь (Сила 99 убивает Кляксу с одного удара)
    name: "victory",
    kid: { name: "Тест", profile: { ...VETERAN, unlocked: 1, beaten: [0], up: { str: 99, hp: 0, time: 0, gold: 3 } } },
    run: async (p, shot) => {
      await enter(p);
      await tick(p, 1100);
      await p.click("#map .bcard[data-i='1']");
      await tick(p);
      await p.click("#btn-fight");
      await tick(p, 800);
      const dead = async () => (await p.locator("#boss-cv.shattered").count()) > 0;
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
  {
    // боссы: ответный удар, миньоны, напёрстки, пузыри, вторая форма, супер-удар и отбитый шар.
    // Кампания пройдена до Короля; Сила 120: удар 141 из 182 жизней Кактуса — сразу вторая форма.
    name: "bossfx",
    kid: {
      name: "Тест",
      profile: {
        ...VETERAN,
        rv: 3,
        unlocked: 36,
        beaten: Array.from({ length: 36 }, (_, i) => i),
        up: { ...VETERAN.up, str: 120 },
      },
    },
    run: async (p, shot) => {
      await enter(p);
      await tick(p, 1100);
      const has = async (sel) => (await p.locator(sel).count()) > 0;
      /** Тикать мелкими шагами, пока не появится sel (не дольше ms). */
      const until = async (sel, ms = 30000) => {
        for (let t = 0; t < ms && !(await has(sel)); t += 100) await tick(p, 100);
        if (!(await has(sel))) throw new Error(`не дождался ${sel}`);
      };
      const fight = async (i) => {
        if (await has("#s-game:not([hidden])")) await p.click("#btn-quit");
        await tick(p, 600);
        await p.click(`#map .bcard[data-i='${i}']`);
        await tick(p);
        await p.click("#btn-fight");
        await tick(p, 300);
      };
      // Ластик: миньоны садятся на кнопки; не отвечаем — по таймеру босс подбегает и кусает
      await fight(4);
      await until(".minion");
      await tick(p, 600);
      await shot("01-minions");
      await until("#feedback:has(u)");
      await tick(p, 240);
      await shot("02-attack-bite");
      // Медуза: пузыри и луч
      await fight(13);
      await until(".bubblecover");
      await tick(p, 500);
      await shot("03-bubbles");
      await until("#feedback:has(u)");
      await tick(p, 170);
      await shot("04-attack-zap");
      // Хамелеон: напёрстки посреди перемешивания
      await fight(20);
      await until(".cupcover");
      await tick(p, 700);
      await shot("05-cups");
      // Кактус: два щита, потом удар срезает жизни ниже трети — превращение
      await fight(6);
      for (let n = 0; n < 15 && !(await has("#boss-wrap.form2")); n++) {
        await p.click("#opt0");
        for (let t = 0; t < 26 && !(await has("#boss-wrap.form2")); t++) await tick(p, 100);
      }
      await until("#boss-wrap.form2", 3000);
      await tick(p, 200);
      await shot("06-second-form");
      // Мех Диктант: копит заряд, пока ты думаешь и ошибаешься; шар супер-удара отбивается нажатием
      await fight(32);
      await until(".orbhit", 60000);
      await tick(p, 500);
      await shot("07-super-orb");
      await p.click(".orbhit");
      await tick(p, 120);
      await shot("08-deflect");
    },
  },
  {
    // задание от Ралины: записка при входе, подарок, логово, монстр теряет сердечки и оживает
    name: "task",
    kid: { name: "Тест", profile: VETERAN, tasks: TASKS },
    run: async (p, shot, { expect }) => {
      await enter(p);
      await tick(p, 1100);
      expect(await p.locator("#task-note:not([hidden])").count(), "нет записки о новом задании");
      expect(!(await p.textContent("#note-body")).includes("на завтра"), "задание на завтра видно уже сегодня");
      await shot("01-note");
      await p.click("[data-gift='t-gift']");
      await tick(p, 600);
      await shot("02-note-gift");
      await p.click("#btn-note-later");
      await tick(p, 600);
      await shot("03-home-card");
      await p.click("[data-task='t-double']");
      await tick(p);
      await shot("04-lair");
      await p.click("#btn-task-go");
      await tick(p);
      await shot("05-intro");
      await p.click("#btn-fight");
      await tick(p, 800);
      await shot("06-monster");
      for (let n = 0; n < 4; n++) {
        await answerTask(p);
        await tick(p, 2500);
      }
      await shot("07-after-hits");
      await answerTask(p, false);
      await tick(p, 1200);
      await shot("08-monster-revived");
      await tick(p, 1500);
      await p.click("#btn-quit");
      await tick(p, 600);
      await p.click("[data-task='t-double']");
      await tick(p);
      await shot("09-lair-progress");
      const pr = (await p.evaluate(() => JSON.parse(localStorage.getItem("sb2_profile")))).tasks;
      expect(pr["t-double"]?.right === 4 && pr["t-gift"]?.done === "2026-10-15", "прогресс задания не сохранился");
      expect(!pr["t-later"], "задание на завтра уже начато");
    },
  },
  {
    // все монстры побеждены: Хранитель, победа с поздравлением, сундуком и медалью
    name: "task-guard",
    kid: {
      name: "Тест",
      profile: {
        ...VETERAN,
        tasks: {
          "t-double": {
            title: "Удвоенные согласные",
            hp: Object.fromEntries(TASK_WORDS.map((w) => [w.replace(/[()]/g, ""), 0])),
            wrong: { класс: 2, миллион: 1 },
            right: 21,
            guard: 0,
            seen: "2026-10-15",
          },
        },
      },
      tasks: TASKS.slice(0, 1),
    },
    run: async (p, shot, { expect }) => {
      await enter(p);
      await tick(p, 1100);
      await shot("01-home-guard");
      await p.click("[data-task='t-double']");
      await tick(p);
      await shot("02-lair-all-beaten");
      await p.click("#btn-task-go");
      await tick(p);
      await shot("03-guard-intro");
      await p.click("#btn-fight");
      await tick(p, 800);
      await shot("04-guard-fight");
      for (let n = 0; n < 5 && !(await p.locator("#boss-cv.shattered").count()); n++) {
        await answerTask(p);
        await tick(p, 2500);
      }
      await tick(p, 1300);
      await shot("05-task-done");
      await tick(p, 1000);
      await shot("06-task-chest");
      await p.click("#btn-task-home");
      await tick(p, 600);
      await shot("07-home-medal");
      await p.click("#btn-trophy");
      await tick(p);
      await shot("08-trophies-medal");
      const pr = (await p.evaluate(() => JSON.parse(localStorage.getItem("sb2_profile")))).tasks["t-double"];
      expect(pr?.done === "2026-10-15" && pr.medal === 1 && pr.guard === 1, "задание не засчитано после Хранителя");
    },
  },
  // маленький телефон (iPhone SE и узкие Android): всё должно влезать по ширине
  { name: "small", kid: { name: "Тест", profile: VETERAN }, viewport: { width: 360, height: 640 }, run: bigScreens },
  { name: "tablet", kid: { name: "Тест", profile: VETERAN }, viewport: { width: 820, height: 1180 }, run: bigScreens },
  { name: "laptop", kid: { name: "Тест", profile: VETERAN }, viewport: { width: 1024, height: 768 }, run: bigScreens },
  { name: "desktop", kid: { name: "Тест", profile: VETERAN }, viewport: { width: 1440, height: 900 }, run: bigScreens },
];

const tick = (p, ms = 400) => p.clock.runFor(ms);

const errors = [];
const browser = await chromium.launch();

/**
 * Новая вкладка с фиксированными временем и случайностью и заранее заданным localStorage (только на
 * адресе url: на другие адреса, куда уходит страница переезда, он не кладётся). setup(ctx) — до загрузки.
 */
async function openPage(label, url, storage = {}, viewport = { width: 390, height: 844 }, setup = async () => {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, locale: "ru-RU" });
  await setup(ctx);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(`[${label}] ${e.message}`));
  p.on("console", (m) => {
    // браузер пишет в консоль любой ответ 4xx; в online-сценарии они ожидаемы (неверный код),
    // в offline — оборванные запросы к API
    const expected =
      (label.startsWith("online") && /Failed to load resource: .* (404|409)/.test(m.text())) ||
      (label === "offline" && /Failed to load resource: net::ERR_FAILED/.test(m.text()));
    if (m.type() === "error" && !expected && !/fonts\.g/.test(m.text())) errors.push(`[${label}] console: ${m.text()}`);
  });
  await p.clock.install({ time: NOW });
  await p.clock.pauseAt(new Date(NOW.getTime() + 1000)); // время идёт только через tick()
  await p.addInitScript(
    ([storage, origin]) => {
      let a = 12345;
      Math.random = () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      if (location.origin === origin && !sessionStorage.getItem("seeded")) {
        sessionStorage.setItem("seeded", "1");
        localStorage.clear();
        for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, JSON.stringify(v));
      }
    },
    [storage, new URL(url).origin],
  );
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

// ONLY=task,online npm run check — только эти сценарии (при отладке)
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const wanted = (name) => !ONLY || ONLY.includes(name);
for (const sc of SCENARIOS.filter((sc) => wanted(sc.name))) {
  const game = await site();
  const expect = (cond, what) => cond || errors.push(`[${sc.name}] ${what}`);
  const storage = { ...(sc.kid ? await addKid(game.store, sc.kid) : {}), ...sc.storage };
  // старый адрес — отдельный сайт (другой origin, свой localStorage); адрес облака отдаёт наш сайт с API
  const old = sc.moved ? await serve(DIST) : null;
  const url = old ? old.base + "moved.html" : game.base + path.basename(page_);
  const { ctx, p, shot, dump } = await openPage(sc.name, url, storage, sc.viewport, async (ctx) => {
    await ctx.route(GAME_URL + "**", async (route) => {
      const u = new URL(route.request().url());
      await route.fulfill({ response: await route.fetch({ url: game.base + u.pathname.slice(1) + u.search }) });
    });
    if (sc.offline) await ctx.route("**/api/**", (route) => route.abort("failed"));
  });
  try {
    await sc.run(p, shot, { ctx, store: game.store, expect });
  } catch (e) {
    errors.push(`[${sc.name}] шаг упал: ${e.message.split("\n")[0]}`);
    await shot("FAILED");
  }
  await dump(sc.name);
  await ctx.close();
  game.server.close();
  old?.server.close();
}

// ---------- online: репетитор заводит ученика, ученик входит по коду, прогресс и настройки ходят через API ----------
const ran = SCENARIOS.filter((sc) => wanted(sc.name)).length + (wanted("online") ? 1 : 0);
if (wanted("online")) {
  const online = await site(),
    store = online.store;
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
    // первый вход паролем администратора → учитель задаёт себе свой пароль и дальше входит им
    await t.click('a[href="#/account"]');
    await t.waitForSelector("#pw");
    await tutor.shot("02b-account");
    await t.fill("#pw-cur", "secret");
    await t.fill("#pw-new", "ralina-2026");
    await t.fill("#pw-rep", "ralina-2026");
    await t.click("#pw button[type=submit]");
    await t.waitForSelector("#pw-msg.okm");
    await tutor.shot("02c-password-saved");
    await t.goto(online.base + "tutor.html#/");
    await t.waitForSelector("#logout");
    await t.click("#logout");
    await t.waitForSelector("#pass");
    await t.fill("#pass", "ralina-2026");
    await t.click("#login button[type=submit]");
    await t.waitForSelector("#add-name");
    expect(
      (
        await t.evaluate(() =>
          fetch("api/tutor/me", { headers: { authorization: "Bearer " + localStorage.getItem("tutor_token") } }).then(
            (r) => r.json(),
          ),
        )
      ).who === "tutor",
      "учитель не вошёл своим паролем",
    );
    await t.fill("#add-name", "Маша");
    await t.click("#add button[type=submit]");
    await t.waitForSelector("#code");
    const code = (await t.textContent("#code")).trim();
    await tutor.shot("03-new-student", ["#code"]);

    await tick(k, 1500);
    await k.click("#title-press");
    await tick(k, 400);
    await kid.shot("01-title");
    await k.click("#btn-login-close");
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
    await t.waitForSelector(".ttabs");
    await tutor.shot("05-student");
    // задания: одно сразу (свои слова и слово из поиска по словарю), второе — с завтра
    await t.click('.ttab[href$="/tasks"]');
    await t.waitForSelector("#tform");
    await t.fill("#t-title", "Удвоенные согласные");
    await t.fill("#t-words", "кла(сс)\nгру(пп)а");
    await t.fill("#t-find", "бер");
    await t.waitForSelector("#t-suggest [data-raw]");
    await tutor.shot("05b-task-form");
    await t.click("#t-suggest [data-raw]");
    await t.fill("#t-note", "Читай слово целиком!");
    await t.click("#t-save");
    await t.waitForSelector(".tcard-t");
    await t.fill("#t-title", "Словарные на завтра");
    await t.fill("#t-words", "м(о)локо");
    await t.click('[name="t-when"][value="date"]');
    await t.click("#t-save");
    await t.waitForFunction(() => document.querySelectorAll(".tcard-t").length === 2);
    await tutor.shot("05c-tasks");
    const tasks = (await store.listStudents())[0].tasks;
    expect(
      tasks.length === 2 && tasks[0].words.length === 3 && tasks[1].from === "2026-10-16",
      "задания из конструктора не дошли до сервера",
    );
    await t.click('.ttab[href$="/words"]');
    await t.waitForSelector("#settings");
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
    await kid.shot("06-note");
    expect(!(await k.textContent("#note-body")).includes("на завтра"), "задание на завтра видно уже сегодня");
    await k.click("#note-body [data-lair]");
    await tick(k);
    await kid.shot("07-lair");
    await k.click("#btn-task-go");
    await tick(k);
    await k.click("#btn-fight");
    await tick(k, 800);
    for (let n = 0; n < 3; n++) {
      await answerTask(k);
      await tick(k, 2500);
    }
    await kid.shot("08-lair-fight");
    const taskPush = progress(k);
    await tick(k, 30_000);
    await taskPush;
    await k.click("#btn-quit");
    await tick(k, 600);
    await kid.shot("09-home-after-settings");
    await t.click('.ttab[href$="/tasks"]');
    await t.waitForSelector(".tcard-t");
    await tutor.shot("07-task-progress");
    expect(
      (await t.textContent(".tcard-t:last-child .tstate")).startsWith("в процессе"),
      "в кабинете нет статуса задания",
    );
    await t.click('.ttab[href$="/login"]');
    await t.waitForSelector("#copy");
    await tutor.shot("08-login-tab", ["#code"]);
    await t.goto(online.base + "tutor.html#/");
    await t.waitForSelector("tr[data-id]");
    await tutor.shot("09-list-task");
    const ls = await kid.dump("online-kid");
    expect(ls.sb_settings?.words === "custom", "ученик не получил режим слов от репетитора");
    expect(ls.sb_settings?.lim?.min === 30, "ученик не получил лимит минут");
    expect(ls.sb_custom === "м(о)локо\nс(о)бака", "ученик не получил свои слова репетитора");
    const { code: _c, id: _i, ...stable } = (await store.listStudents())[0];
    fs.writeFileSync(path.join(outDir, "online-server.json"), JSON.stringify(stable, null, 2));
    // id заданий случайные: заменяем на порядковые, чтобы прогоны сравнивались побайтно
    for (const f of ["online-server.json", "online-kid-storage.json"]) {
      let text = fs.readFileSync(path.join(outDir, f), "utf8");
      stable.tasks.forEach((x, i) => (text = text.replaceAll(x.id, `task-${i + 1}`)));
      fs.writeFileSync(path.join(outDir, f), text);
    }
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

if (errors.length) {
  console.error("Ошибки:\n" + errors.join("\n"));
  process.exit(1);
}
console.log(`OK: ${ran} сценария, скриншоты в ${path.relative(process.cwd(), outDir) || "."}`);
