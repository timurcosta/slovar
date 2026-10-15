// Главный экран.
import { $, esc } from "../../lib/dom.js";
import { ITEMS } from "../../content/items.js";
import { BOSSES } from "../../content/bosses.js";
import { TROPHIES } from "../../content/trophies.js";
import { drawHero } from "../../render/hero.js";
import { drawBoss } from "../../render/sprite.js";
import { errWords, newWords } from "../../topics/words/pools.js";
import { learnedCount } from "../../state/stats.js";
import { P } from "../../state/profile.js";
import { settings } from "../../state/settings.js";
import { gear } from "../../progress/gear.js";
import { QUESTS, ensureDaily } from "../../progress/daily.js";
import { MAXL, TITLES, xpProgress } from "../../progress/levels.js";
import { blockedToday, limitReason, todayHTML } from "../../progress/limits.js";
import { refreshCoins } from "../../progress/rewards.js";
import { frontier, towerOpen } from "../../progress/unlocks.js";
import { ACH } from "../../progress/achievements.js";
import { startCampaign, stopGame } from "../../battle/run.js";
import { syncDiff } from "../../battle/difficulty.js";
import { show } from "../screens.js";
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
  const c = [`Сердца ${g.maxH}`, `Урон ${g.dmg}`];
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
  $("awards-sub").textContent = `Достижения: ${Object.keys(P.ach).length} из ${ACH.length}`;
  $("home-quests").innerHTML = questsHTML();
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
