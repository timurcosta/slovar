// Главный экран.
import { $, esc } from "../../lib/dom.js";
import { ITEMS } from "../../content/items.js";
import { shownDmg } from "../../content/rules.ts";
import { BOSSES } from "../../content/bosses.js";
import { TROPHIES } from "../../content/trophies.js";
import { drawHero } from "../../render/hero.js";
import { drawBoss } from "../../render/sprite.js";
import { errWords, newWords } from "../../topics/words/pools.js";
import { learnedCount } from "../../state/stats.ts";
import { P } from "../../state/profile.ts";
import { settings } from "../../state/settings.ts";
import { gear } from "../../progress/gear.js";
import { QUESTS, ensureDaily } from "../../progress/daily.js";
import { MAXL, TITLES, levelOf, xpProgress } from "../../progress/levels.ts";
import { blockedToday, limitReason, todayHTML } from "../../progress/limits.js";
import { refreshCoins } from "../../progress/rewards.js";
import { frontier, itemLocked, towerOpen } from "../../progress/unlocks.js";
import { ACH } from "../../progress/achievements.js";
import { startCampaign, stopGame } from "../../battle/run.js";
import { syncDiff } from "../../battle/difficulty.js";
import { show } from "../screens.js";
import { openShop } from "./shop.js";
import { badgesHTML } from "./awards.js";
import { paintTrophies } from "./trophies.js";

export function heroCard(prefix) {
  const { l, frac, need } = xpProgress(P.xp);
  drawHero($(prefix + "-hero"), P.equip, $(prefix + "-aura"));
  $(prefix + "-lvl").textContent = `УРОВЕНЬ ${l}`;
  $(prefix + "-name").textContent = P.name || "";
  $(prefix === "home" ? "home-title" : "end-title2").textContent = TITLES[l - 1];
  $(prefix + "-xp").style.transform = `scaleX(${frac})`;
  if (l >= MAXL) {
    $(prefix + "-next").textContent = "Максимальный уровень! Ты Владыка Слова.";
    return;
  }
  const unlock = ITEMS.filter((i) => i.lvl === l + 1 && i.price > 0).map((i) => i.name);
  $(prefix + "-next").innerHTML =
    `До уровня ${l + 1}: <b>${need}</b> опыта.` + (unlock.length ? ` Откроется: <b>${esc(unlock.join(", "))}</b>` : "");
}
export function perkChips(g) {
  const c = [`Сердца ${g.maxH}`, `Урон ${shownDmg(g.dmg)}`];
  if (g.shield) c.push(`Щит ${g.shield}`);
  if (g.time) c.push(`+${g.time} с`);
  if (g.critMult > 2) c.push(`Крит x${g.critMult}`);
  if (g.heal8) c.push("Лечение");
  if (g.spikes) c.push("Шипы");
  if (g.heal6) c.push("Лечение");
  if (g.drone) c.push("Дрон");
  if (g.revive) c.push("Воскрешение");
  if (g.dodge) c.push(`Уклон ${Math.round(g.dodge * 100)}%`);
  if (P.lep) c.push("Лепёшка: +1 сердце");
  return c.map((t, i) => `<span class="chip${i > 1 ? " gold" : ""}">${t}</span>`).join("");
}
export function questsHTML() {
  ensureDaily();
  const rows = P.daily.q
    .map(
      (q) =>
        `<div class="quest${q.done ? " done" : ""}"><span>${esc(QUESTS[q.t].label(q.n))}</span><b>${q.done ? "Готово" : `${q.p}/${q.n} · ${q.reward}`}</b><div class="qbar"><i style="transform:scaleX(${q.p / q.n})"></i></div></div>`,
    )
    .join("");
  const streak = P.days.streak > 1 ? `<span class="days">Дней подряд: ${P.days.streak}</span>` : "";
  return `<div class="row" style="justify-content:space-between"><h2>Задания дня</h2>${streak}</div>${rows}<p class="note">${P.daily.bonus ? "Все задания выполнены! Завтра будут новые." : "Выполни все три и получи большой сундук."}</p>`;
}
/** Задания дня одной полоской под «В бой!»: на телефоне полный список ниже первого экрана. */
function questStrip() {
  const q = P.daily.q,
    done = q.filter((x) => x.done).length;
  const bars = q
    .map((x) => `<i class="${x.done ? "on" : ""}"><em style="transform:scaleX(${x.p / x.n})"></em></i>`)
    .join("");
  return `<b>Задания дня: ${done} из ${q.length}</b><span class="minibars">${bars}</span><small>${P.daily.bonus ? "Все выполнены! Завтра новые" : "За все три: большой сундук"}</small>`;
}
/** Ближайшая покупка: что уже по карману или сколько осталось накопить. */
function goal() {
  const lvl = levelOf(P.xp),
    open = ITEMS.filter((i) => i.price > 0 && !i.gift && !P.owned[i.id] && i.lvl <= lvl && !itemLocked(i));
  const can = open.filter((i) => i.price <= P.coins).sort((a, b) => b.price - a.price)[0];
  if (can) return [can, `<b>Можно купить: ${esc(can.name)}!</b><small>Загляни в гардероб</small>`];
  const next = open.sort((a, b) => a.price - b.price)[0];
  if (!next) return null;
  return [
    next,
    `<b>Цель: ${esc(next.name)}</b><span class="minibars"><i><em style="transform:scaleX(${P.coins / next.price})"></em></i></span><small>ещё ${next.price - P.coins} монет</small>`,
  ];
}
export function renderHome() {
  ensureDaily();
  refreshCoins();
  heroCard("home");
  $("home-perks").innerHTML = perkChips(gear());
  $("home-badges").innerHTML = badgesHTML();
  paintTrophies($("home-badges"));
  $("trophy-sub").textContent =
    `${TROPHIES.filter((t) => (P.troph || {})[t.id]).length} из ${TROPHIES.length} · выучено ${learnedCount()} слов`;
  $("today-home").innerHTML = todayHTML();
  const lim = !!limitReason();
  ["btn-campaign", "btn-tower", "btn-train-err", "btn-train-new"].forEach((id) => $(id).classList.toggle("dim", lim));
  $("train-err-sub").textContent = errWords().length ? `слов с ошибками: ${errWords().length}` : "ошибок пока нет";
  $("train-new-sub").textContent = newWords().length
    ? `ещё не встречались: ${newWords().length}`
    : "все слова уже встречались";
  const f = frontier();
  $("campaign-sub").textContent =
    P.beaten.length >= BOSSES.length
      ? "Кампания пройдена! Выбери босса или иди в Башню"
      : `Босс ${f + 1}: ${BOSSES[f].name}`;
  $("btn-tower").disabled = !towerOpen();
  $("tower-sub").textContent = towerOpen()
    ? P.towerBest
      ? `рекорд: этаж ${P.towerBest}`
      : "бесконечные этажи"
    : "откроется после 6-го босса";
  $("awards-sub").textContent = `${Object.keys(P.ach).length} из ${ACH.length}`;
  $("home-quests").innerHTML = questsHTML();
  $("home-qstrip").innerHTML = questStrip();
  $("home-qstrip").onclick = () => $("home-quests").scrollIntoView({ behavior: "smooth", block: "center" });
  const gl = goal();
  $("home-goal").hidden = !gl;
  if (gl) {
    $("home-goal").innerHTML = gl[1];
    $("home-goal").onclick = () => openShop(gl[0].slot);
  }
  $("map").innerHTML = BOSSES.map((b, i) => {
    const open = i <= P.unlocked,
      done = P.beaten.includes(i),
      next = i === f && !done;
    return `<button class="bcard${open ? "" : " locked"}${next ? " next" : ""}" data-i="${i}" ${open ? "" : "disabled"} aria-label="${open ? esc(b.name) : "Закрытый босс"}">
      <canvas id="mp${i}"></canvas><span>${open ? esc(b.name) : "???"}</span><small>${i + 1}</small>${done ? '<em class="done">✓</em>' : ""}</button>`;
  }).join("");
  BOSSES.forEach((b, i) => drawBoss($("mp" + i), b, i > P.unlocked));
  $("map")
    .querySelectorAll(".bcard:not(.locked)")
    .forEach(
      (el) =>
        (el.onclick = () => {
          if (!blockedToday()) startCampaign(+el.dataset.i);
        }),
    );
  document.querySelectorAll('input[name="play"]').forEach((r) => (r.checked = r.value === settings.play));
  syncDiff();
}
export function home() {
  stopGame();
  renderHome();
  show("s-home");
}
