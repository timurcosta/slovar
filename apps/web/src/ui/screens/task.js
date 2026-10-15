// Задания от Ралины: записка при входе, карточка на главной, экран логова с монстрами.
import { $, esc } from "../../lib/dom.js";
import { today } from "../../lib/date.js";
import { plural } from "../../lib/text.js";
import { PALS, SPR } from "../../content/sprites.js";
import { drawSprite } from "../../render/sprite.js";
import { P } from "../../state/profile.ts";
import { refreshCoins } from "../../progress/rewards.js";
import { finishTask, hasNote, openTasks, progressOf, takeNote, taskById } from "../../progress/tasks.ts";
import { MONSTER_HP, hpOf, monsters, shortDate, taskEntries } from "../../progress/taskrules.ts";
import { sfx } from "../../audio/sfx.js";
import { drawMonster, gapWord, heartsRow, startTask } from "../../battle/task.js";
import { show } from "../screens.js";
import { toast } from "../toast.js";
import { confetti } from "../confetti.js";
import { renderHome } from "./home.js";

const words = (n) => `${n} ${plural(n, ["монстра", "монстров", "монстров"])}`;
/** «150 монет, большой сундук и именную медаль». */
function prize(t) {
  const parts = [];
  if (t.coins) parts.push(`${t.coins} ${plural(t.coins, ["монету", "монеты", "монет"])}`);
  if (t.chest) parts.push("большой сундук");
  if (t.medal) parts.push("именную медаль");
  return parts.length > 1 ? parts.slice(0, -1).join(", ") + " и " + parts[parts.length - 1] : parts[0] || "";
}
const until = (t) => (t.until ? ` До ${shortDate(t.until, today())} включительно.` : "");

/** Подарок без слов: сразу награда. */
function claimGift(t) {
  const { coins, chest } = finishTask(t);
  confetti(140, 2400);
  sfx.fanfare(true);
  const got = coins + (chest ? chest.coins : 0);
  toast(
    `Подарок от Ралины: ${got ? `+${got} монет` : ""}${chest?.item ? `, ${chest.item.name}` : ""}${t.medal ? `${got ? ", " : ""}медаль «${t.title}»` : ""}!`,
    "ach",
  );
  refreshCoins();
}

// ---------- записка ----------
function closeNote() {
  $("task-note").hidden = true;
  renderHome();
}
function noteItem(t, fresh) {
  const es = taskEntries(t),
    p = P.tasks?.[t.id];
  if (!es.length)
    return `<div class="note-task"><b>${esc(t.title)}</b><p>Ралина дарит тебе ${esc(prize(t))}!</p>
      ${t.note ? `<p class="hand">${esc(t.note)}</p>` : ""}
      <button class="btn gold" data-gift="${t.id}">Забрать подарок</button></div>`;
  const { beaten, total } = monsters(t, p);
  const sprites = es
    .slice(0, 8)
    .map((e) => `<canvas data-mon="${esc(e.word)}"></canvas>`)
    .join("");
  const what = fresh
    ? `Победи ${words(total)} и Хранителя${prize(t) ? ` — получишь ${esc(prize(t))}` : ""}.${until(t)}`
    : `Монстры ещё ждут: осталось ${total - beaten} из ${total}.${until(t)}`;
  return `<div class="note-task"><b>${esc(t.title)}</b><p>${what}</p><div class="note-mons">${sprites}</div>
    ${fresh && t.note ? `<p class="hand">${esc(t.note)}</p>` : ""}
    <button class="btn primary" data-lair="${t.id}">В логово!</button></div>`;
}
/** Показать записку, если есть новое задание или пора напомнить (раз в день). Только на главной. */
export function maybeNote() {
  if ($("s-home").hidden || !$("task-note").hidden || !$("login").hidden || !$("prefs").hidden) return;
  if (!hasNote()) return;
  const { fresh, remind } = takeNote();
  const name = P.name ? esc(P.name) + ", " : "";
  $("note-h").innerHTML = fresh.length
    ? `${name}${fresh.length > 1 ? "новые задания" : "новое задание"} от Ралины!`
    : `${name}монстры ещё ждут!`;
  $("note-body").innerHTML = [...fresh.map((t) => noteItem(t, true)), ...remind.map((t) => noteItem(t, false))].join(
    "",
  );
  $("note-btns").innerHTML = `<button class="btn" id="btn-note-later">Потом</button>`;
  drawSprite($("note-ralina"), SPR.ralina, PALS.ralina);
  $("note-body")
    .querySelectorAll("canvas[data-mon]")
    .forEach((c) => drawMonster(c, c.dataset.mon));
  $("note-body")
    .querySelectorAll("[data-lair]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          $("task-note").hidden = true;
          openLair(b.dataset.lair);
        }),
    );
  $("note-body")
    .querySelectorAll("[data-gift]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const t = taskById(b.dataset.gift);
          if (t) claimGift(t);
          b.disabled = true;
          b.textContent = "Получено!";
        }),
    );
  $("btn-note-later").onclick = closeNote;
  $("task-note").hidden = false;
  sfx.note();
  $("note-body").querySelector("button")?.focus();
}
if ($("task-note")) {
  $("btn-note-close").onclick = closeNote;
  $("task-note").addEventListener("click", (e) => {
    if (e.target === $("task-note")) closeNote();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("task-note").hidden) closeNote();
  });
}

// ---------- карточка на главной ----------
/** Карточки открытых заданий над «В бой!»; пусто, если заданий нет. */
export function renderTaskCards() {
  const el = $("home-tasks");
  const list = openTasks();
  el.hidden = !list.length;
  el.innerHTML = list
    .map((t) => {
      const es = taskEntries(t),
        { beaten, total } = monsters(t, P.tasks?.[t.id]);
      const sub = !es.length
        ? `Подарок: ${esc(prize(t))}`
        : beaten === total
          ? "Монстры побеждены! Остался Хранитель"
          : `Монстры: ${beaten} из ${total}`;
      return `<button class="strip taskcard" type="button" data-task="${t.id}">
        <canvas data-mon="${esc(es[0]?.word || "")}"></canvas><b>Задание от Ралины: ${esc(t.title)}</b>
        <span class="minibars"><i class="on"><em style="transform:scaleX(${total ? beaten / total : 0})"></em></i></span><small>${sub}</small></button>`;
    })
    .join("");
  el.querySelectorAll("canvas[data-mon]").forEach((c) => {
    if (c.dataset.mon) drawMonster(c, c.dataset.mon);
    else drawSprite(c, SPR.chest, PALS.chest);
  });
  el.querySelectorAll("[data-task]").forEach(
    (b) =>
      (b.onclick = () => {
        const t = taskById(b.dataset.task);
        if (!t) return;
        if (!taskEntries(t).length) {
          claimGift(t);
          renderHome();
        } else openLair(t.id);
      }),
  );
}

// ---------- логово ----------
let lairId = null;
export function openLair(id) {
  const t = taskById(id);
  if (!t) return;
  lairId = id;
  const p = progressOf(t),
    es = taskEntries(t),
    { beaten, total } = monsters(t, p);
  refreshCoins();
  $("task-title").textContent = t.title;
  const guard = beaten === total;
  $("task-sub").innerHTML = guard
    ? `Все ${words(total)} побеждены! Остался Хранитель: все слова по разу, две ошибки он простит.`
    : `Побеждено ${beaten} из ${total}. У монстра ${MONSTER_HP} сердечка: верный ответ снимает одно, ошибка возвращает все.${prize(t) ? ` Награда: ${esc(prize(t))}.` : ""}${until(t)}`;
  $("lair").innerHTML = es
    .map((e) => {
      const hp = hpOf(p, e.word),
        dead = hp <= 0;
      return `<div class="mcard${dead ? " dead" : ""}"><canvas data-mon="${esc(e.word)}"></canvas>
        <b>${esc(dead ? e.word : gapWord(e))}</b><span class="mhearts">${dead ? "побеждён" : heartsRow(hp)}</span></div>`;
    })
    .join("");
  $("lair")
    .querySelectorAll("canvas[data-mon]")
    .forEach((c) => drawMonster(c, c.dataset.mon, c.closest(".dead")));
  $("btn-task-go").textContent = guard ? "К Хранителю!" : "В бой!";
  show("s-task");
  $("btn-task-go").focus();
}
if ($("s-task")) {
  $("btn-task-go").onclick = () => {
    if (lairId && !startTask(lairId)) {
      toast("Это задание уже недоступно", "quest");
      renderHome();
      show("s-home");
    }
  };
  $("btn-task-back").onclick = () => {
    renderHome();
    show("s-home");
  };
}
