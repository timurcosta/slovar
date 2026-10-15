// Бой по заданию репетитора: логово словесных монстров и Хранитель задания.
// Движок обычный (оружие, питомцы, криты, монеты за ответы как в тренировке), но жизни — это сердечки
// монстров: у каждого слова три, верный ответ снимает одно, ошибка возвращает все.
import { $, esc } from "../lib/dom.js";
import { shuffle } from "../lib/random.js";
import { plural } from "../lib/text.js";
import { PALS, SPR } from "../content/sprites.js";
import { TASK_MEDAL_PAL, TROPHY_SPR } from "../content/trophies.js";
import { drawBoss, drawSprite } from "../render/sprite.js";
import { P, save } from "../state/profile.ts";
import { quest } from "../progress/daily.js";
import { checkAch } from "../progress/achievements.js";
import { congratsText, finishTask, progressOf, taskById } from "../progress/tasks.ts";
import {
  GUARD_FORGIVES,
  MONSTER_HP,
  guardianLeft,
  heartsLeft,
  hitMonster,
  hpOf,
  missGuardian,
  missMonster,
  monsters,
  pickWord,
  taskEntries,
} from "../progress/taskrules.ts";
import { sfx } from "../audio/sfx.js";
import { duckMusic } from "../audio/music.js";
import { heartSVG } from "../ui/icons.js";
import { confetti } from "../ui/confetti.js";
import { home } from "../ui/screens/home.js";
import { G, newRun, openChest, startBoss } from "./run.js";
import { bossCv, renderHUD } from "./hud.js";
import { clearRound, later } from "./round.js";
import { pop, rel } from "./effects.js";
import * as vfx from "./vfx.js";

/** Сердечко монстра в единицах жизней боя: полоска — сумма сердечек всех монстров. */
export const TASK_U = 10;

/** Словесные монстры: у каждого слова свой, по хэшу слова — у одного слова всегда один и тот же. */
const MONSTERS = [
  ["blot", "Кляксун"],
  ["slime", "Слизняк Путаник"],
  ["two", "Хитрая Двойка"],
  ["bat", "Буквоед"],
  ["spider", "Паучок Пропуск"],
  ["ghost", "Призрак Ошибки"],
  ["pumpkin", "Тыква Перепутка"],
  ["jelly", "Желе Забывака"],
  ["octopus", "Осьминог Каракуля"],
  ["cactus", "Колючка Ошибайка"],
  ["goblin", "Гоблин Глотатель"],
  ["eraser", "Ластик Стирайка"],
  ["bee", "Пчела Жужа"],
  ["chameleon", "Хамелеон Прятка"],
];
const TAUNTS = [
  "Я ожил! Хи-хи!",
  "Эту букву я съел!",
  "Не поймаешь, {name}!",
  "Ещё разок попробуй!",
  "Хи-хи, перепутал!",
];
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
export function monsterOf(word) {
  const [spr, name] = MONSTERS[hash(word) % MONSTERS.length];
  return { spr, pal: spr, name };
}
/** Слово с пропуском для подписи монстра: «кла?» (длина пропуска не подсказывает ответ). */
export function gapWord(e) {
  const slot = e.slots[0];
  return e.segs.map((s, i) => ("t" in s ? s.t : i === slot ? "?" : s.c)).join("");
}
export const heartsRow = (n) => Array.from({ length: MONSTER_HP }, (_, i) => heartSVG(i < n)).join("");
export function drawMonster(cv, word, dead) {
  const m = monsterOf(word);
  drawSprite(cv, SPR[m.spr], PALS[m.pal], dead);
}

function lairBoss(task, es) {
  const p = progressOf(task),
    first = es.find((e) => hpOf(p, e.word) > 0) || es[0],
    m = monsterOf(first.word),
    { beaten, total } = monsters(task, p);
  return {
    ...m,
    name: "Логово монстров",
    f: false,
    ab: [],
    pool: "train",
    task: "lair",
    idx: 0,
    lvl: 0,
    time: 12,
    hp: es.length * MONSTER_HP * TASK_U,
    hp0: heartsLeft(es, p) * TASK_U,
    taunts: TAUNTS,
    intro: `<p class="lore">Задание от Ралины: <b>${esc(task.title)}</b>. Здесь живут словесные монстры, по одному на слово. У каждого три сердечка: верный ответ снимает одно, ошибка возвращает все. Монстр побеждён после трёх верных подряд.</p>
      <p class="note">Побеждено: <b>${beaten} из ${total}</b>. Выйти можно в любой момент, монстры запомнят свои сердечки.</p>`,
  };
}
function guardianBoss(task, es) {
  const p = progressOf(task);
  return {
    spr: "golem",
    pal: "golem",
    name: "Хранитель задания",
    f: false,
    ab: [],
    pool: "train",
    task: "guard",
    idx: 0,
    lvl: 0,
    time: 12,
    hp: es.length * TASK_U,
    filter: "sepia(.5) saturate(1.8) hue-rotate(-12deg) brightness(1.08)",
    taunts: ["Внимательнее, {name}!", "Хранитель всё видит!", "Это слово ещё не твоё!"],
    intro: `<p class="lore">Все монстры задания «${esc(task.title)}» побеждены! Последний — Хранитель. Он спросит все ${es.length} ${plural(es.length, ["слово", "слова", "слов"])} по разу и простит ${GUARD_FORGIVES} ошибки. На третьей он уйдёт, а слова с ошибками снова станут монстрами.</p>
      ${p.guard ? `<p class="note">Попытка ${p.guard + 1}</p>` : ""}`,
  };
}

/** Начать бой по заданию: логово или (когда все монстры побеждены) Хранитель. */
export function startTask(id) {
  const task = taskById(id);
  if (!task) return false;
  const es = taskEntries(task);
  if (!es.length) return false;
  const p = progressOf(task),
    guard = es.every((e) => hpOf(p, e.word) <= 0);
  newRun("task");
  G.task = task;
  G.trainPool = es;
  G.guardian = guard;
  G.lastWord = null;
  G.monstersDown = 0;
  if (guard) {
    G.gMissed = [];
    p.guard++;
    save();
  }
  startBoss(guard ? guardianBoss(task, es) : lairBoss(task, es));
  return true;
}

/** Следующее слово боя по заданию; в логове на арену выходит монстр этого слова. */
export function taskNext() {
  if (G.guardian) {
    if (!G.queue.length) G.queue = shuffle(G.trainPool);
    $("boss-abil").innerHTML =
      `<span class="chip">Прощу ошибок: ${Math.max(0, GUARD_FORGIVES - (G.gMiss || 0))}</span>`;
    return G.queue.shift();
  }
  const p = progressOf(G.task),
    e = pickWord(G.trainPool, p, G.lastWord, Math.random()) || G.trainPool[0];
  if (e.word !== G.lastWord) {
    const m = monsterOf(e.word);
    G.boss = { ...G.boss, spr: m.spr, pal: m.pal, name: m.name };
    bossCv.className = "";
    drawBoss(bossCv, G.boss);
    $("boss-name").textContent = m.name;
  }
  G.lastWord = e.word;
  $("boss-abil").innerHTML = `<span class="mhearts" aria-label="Сердечки монстра">${heartsRow(hpOf(p, e.word))}</span>`;
  return e;
}

/** Верный ответ: монстр теряет сердечко (у Хранителя жизни просто убывают). delay — момент попадания. */
export function taskHit(e, delay) {
  if (G.guardian) return;
  const p = progressOf(G.task),
    left = hitMonster(p, e.word);
  G.hp = heartsLeft(G.trainPool, p) * TASK_U;
  save();
  later(() => {
    $("boss-abil").innerHTML = `<span class="mhearts">${heartsRow(left)}</span>`;
    if (left > 0) return;
    G.monstersDown++;
    // монстр рассыпается; следующий выйдет со следующим словом
    vfx.shatter(bossCv, rel(bossCv), $("boss-wrap").style.filter);
    bossCv.className = "shattered";
    G.lastWord = null;
    pop("Монстр побеждён!", "crit", "40%");
    sfx.level();
  }, delay + 80);
}

/** Ошибка: монстр оживает (сердечки снова все); Хранитель считает ошибки. */
export function taskMiss(e, hitAt) {
  const p = progressOf(G.task);
  if (G.guardian) {
    missGuardian(p, e.word);
    if (!G.gMissed.includes(e.word)) G.gMissed.push(e.word);
    G.gMiss = (G.gMiss || 0) + 1;
    const left = GUARD_FORGIVES - G.gMiss;
    later(() => pop(left >= 0 ? `Прощаю! Осталось ${left}` : "Хранитель уходит…", "", "40%"), hitAt + 300);
    save();
    return;
  }
  const back = missMonster(p, e.word);
  save();
  if (!back) return;
  G.hp = heartsLeft(G.trainPool, p) * TASK_U;
  G.hpLag = -back * TASK_U; // полоска подрастает, когда монстр ожил
  later(() => {
    G.hpLag = 0;
    pop(`Монстр ожил! +${back}`, "heal", "72%");
    $("boss-abil").innerHTML = `<span class="mhearts">${heartsRow(MONSTER_HP)}</span>`;
    renderHUD();
  }, hitAt + 500);
}
/** После ошибки: Хранитель ушёл (третья ошибка) — вместо следующего слова. */
export const guardianGone = () => G.guardian && (G.gMiss || 0) > GUARD_FORGIVES;

function overlay(html) {
  const ov = $("boss-over");
  ov.hidden = false;
  $("opts").hidden = true;
  $("typer").hidden = true;
  $("word").innerHTML = "";
  $("feedback").textContent = "";
  ov.innerHTML = html;
  return ov;
}

/** Хранитель ушёл: слова с ошибками снова монстры. */
export function guardianLeaves() {
  clearRound();
  const p = progressOf(G.task);
  guardianLeft(p, G.gMissed);
  save();
  const words = G.gMissed.map((w) => `<b>${esc(w)}</b>`).join(", ");
  overlay(`<canvas id="intro-cv"></canvas><h2>Хранитель ушёл</h2>
    <p class="lore">«Почти! Эти слова пока не твои: ${words}. Победи их монстров, и я вернусь».</p>
    <div class="row" style="justify-content:center"><button class="btn primary" id="btn-task-lair">В логово</button><button class="btn" id="btn-task-home">На главную</button></div>`);
  drawBoss($("intro-cv"), G.boss);
  $("intro-cv").style.filter = G.boss.filter || "";
  const id = G.task.id;
  $("btn-task-lair").onclick = () => startTask(id);
  $("btn-task-home").onclick = () => home();
  $("btn-task-lair").focus();
}

/** Жизни кончились: все монстры логова побеждены или Хранитель повержен. */
export function taskDown() {
  clearRound();
  const task = G.task;
  vfx.shatter(bossCv, rel(bossCv), $("boss-wrap").style.filter);
  bossCv.className = "shattered";
  $("boss-charge").hidden = true;
  duckMusic(2600);
  if (!G.guardian) {
    sfx.fanfare(false);
    later(() => {
      confetti(100, 2000);
      overlay(`<div class="victory"><b>МОНСТРЫ ПОБЕЖДЕНЫ!</b><span>${P.name ? esc(P.name) + ", " : ""}вот это охота!</span></div>
        <canvas id="intro-cv"></canvas>
        <p class="lore">Остался последний — <b>Хранитель задания</b>. Он спросит все слова по разу и простит ${GUARD_FORGIVES} ошибки.</p>
        <div class="row" style="justify-content:center"><button class="btn primary" id="btn-task-guard">К Хранителю!</button><button class="btn" id="btn-task-home">Потом</button></div>`);
      drawBoss($("intro-cv"), { spr: "golem", pal: "golem" }, true);
      $("btn-task-guard").onclick = () => startTask(task.id);
      $("btn-task-home").onclick = () => home();
      $("btn-task-guard").focus();
    }, 1100);
    return;
  }
  G.beaten++;
  P.tot.bosses++;
  if (!G.bossMistakes) P.tot.flawless++;
  const { coins, chest } = finishTask(task);
  quest("bosses");
  if (!G.bossMistakes) quest("flawless");
  save();
  checkAch();
  renderHUD();
  sfx.fanfare(true);
  later(() => {
    confetti(220, 3200);
    const medal = task.medal
      ? `<div class="medalrow"><canvas id="medal-cv"></canvas><span>Медаль «${esc(task.title)}»</span></div>`
      : "";
    const reward = coins ? `<p class="reward">Награда от Ралины: +${coins} монет</p>` : "";
    overlay(`<div class="victory"><b>ЗАДАНИЕ ВЫПОЛНЕНО!</b><span>${esc(task.title)}</span></div>
      <p class="note-ralina">${esc(congratsText(task))}<small>— Ралина</small></p>
      ${medal}
      ${chest ? `<div class="chestrow"><canvas class="chest shaking" id="chest-cv"></canvas><div class="loot" id="chest-loot" hidden></div></div>` : reward}
      <button class="btn primary" id="btn-task-home">На главную</button>`);
    if (task.medal) drawSprite($("medal-cv"), TROPHY_SPR.medal, TASK_MEDAL_PAL);
    if (chest) openChest(chest, 3, `${reward}<p class="reward">Сундук: +${chest.coins} монет</p>`);
    $("btn-task-home").onclick = () => home();
    $("btn-task-home").focus();
  }, 1100);
}
