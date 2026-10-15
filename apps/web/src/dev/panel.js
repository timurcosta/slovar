// Меню разработчика: галерея боссов и вещей, песочница боя с любым боссом, способностью и экипировкой.
// Подключается только в npm run dev (main.js, import.meta.env.DEV) — в сборку для детей не попадает.
// Открыть: кнопка DEV в углу или адрес с #dev. Песочница после выхода из боя возвращает профиль как был.
import "./dev.css";
import { $, esc } from "../lib/dom.js";
import { AB, BOSSES, TOWER_FILTER } from "../content/bosses.js";
import { ITEMS, SLOTS } from "../content/items.js";
import { drawHero } from "../render/hero.js";
import { drawBoss } from "../render/sprite.js";
import { P, save } from "../state/profile.ts";
import { setStats, stats } from "../state/stats.ts";
import { LS } from "../state/storage.ts";
import { settings } from "../state/settings.ts";
import { gear } from "../progress/gear.js";
import { frontier } from "../progress/unlocks.js";
import { G, startCustom } from "../battle/run.js";
import { renderHUD } from "../battle/hud.js";
import { answer } from "../battle/round.js";
import { petAttack } from "../battle/effects.js";
import { addScreen, show } from "../ui/screens.js";
import { home } from "../ui/screens/home.js";
import { showStory } from "../ui/screens/intro.js";
import { showTitle } from "../ui/screens/title.js";

const TABS = [
  ["bosses", "Боссы"],
  ["hero", "Вещи"],
  ["abil", "Способности"],
  ["screens", "Экраны"],
];
let tab = "bosses",
  slot = "weapon",
  angry = false,
  tower = -1,
  boss = 0,
  equip = { ...P.equip },
  backup = null,
  god = true,
  frame = 0;

const sec = document.createElement("section");
sec.className = "screen dev";
sec.id = "s-dev";
sec.hidden = true;
document.querySelector("main.sheet").appendChild(sec);
addScreen("s-dev");

const fab = document.createElement("button");
fab.className = "dev-fab";
fab.textContent = "DEV";
fab.onclick = () => open();
document.body.appendChild(fab);

const bar = document.createElement("div");
bar.className = "dev-bar";
bar.hidden = true;
bar.innerHTML = `
  <button data-a="ok">Верно</button><button data-a="crit">Крит</button><button data-a="bad">Ошибка</button>
  <button data-a="pet">Питомец</button><button data-a="rage">Ярость</button><button data-a="kill">Добить</button>
  <label><input type="checkbox" data-a="god" checked> Бессмертие</label>`;
document.body.appendChild(bar);

function open() {
  equip = backup ? equip : { ...P.equip };
  boss = Math.min(frontier(), BOSSES.length - 1);
  render();
  show("s-dev");
}

function render() {
  sec.innerHTML = `
    <div class="topbar"><h1>Разработчик</h1><button class="btn small" id="dev-close">Закрыть</button></div>
    <p class="note">Видно только в <b>npm run dev</b>. Бой из песочницы не меняет прогресс: после выхода профиль возвращается как был.</p>
    <div class="tabs">${TABS.map(([k, n]) => `<button class="tab" data-tab="${k}" aria-selected="${k === tab}">${n}</button>`).join("")}</div>
    <div id="dev-body"></div>`;
  $("dev-close").onclick = () => (P.name ? home() : showTitle());
  sec.querySelectorAll("[data-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        tab = b.dataset.tab;
        render();
      }),
  );
  const body = $("dev-body");
  if (tab === "bosses") bossesTab(body);
  if (tab === "hero") heroTab(body);
  if (tab === "abil") abilTab(body);
  if (tab === "screens") screensTab(body);
}

function bossesTab(body) {
  body.innerHTML = `
    <div class="row">
      <label><input type="checkbox" id="dev-angry" ${angry ? "checked" : ""}> Ярость (красные глаза)</label>
      <label>Башня: <select id="dev-tower"><option value="-1">обычные</option>${TOWER_FILTER.map((f, i) => `<option value="${i}" ${i === tower ? "selected" : ""}>фильтр ${i + 1}</option>`).join("")}</select></label>
    </div>
    <p class="note">Нажми на босса, чтобы начать с ним бой со всеми его способностями.</p>
    <div class="dev-grid">${BOSSES.map(
      (
        b,
        i,
      ) => `<button class="dev-card" data-boss="${i}"><canvas class="bob" data-b="${i}"></canvas><b>${i + 1}. ${esc(b.name)}</b>
        <small>${b.ab.map((a) => AB[a].n).join(", ") || "без способностей"} · ${b.hp} жизней</small></button>`,
    ).join("")}</div>`;
  $("dev-angry").onchange = (e) => (angry = e.target.checked);
  $("dev-tower").onchange = (e) => {
    tower = +e.target.value;
    render();
  };
  body.querySelectorAll("[data-boss]").forEach((b) => (b.onclick = () => fight(BOSSES[+b.dataset.boss])));
}

function heroTab(body) {
  body.innerHTML = `
    <div class="dev-hero"><canvas id="dev-hero"></canvas><div>
      <p class="note">Песочница носит эту экипировку. Твой профиль не меняется.</p>
      <div class="row"><button class="btn small" id="dev-mine">Как у меня</button>
      <button class="btn small primary" id="dev-go">В бой: ${esc(BOSSES[boss].name)}</button></div>
    </div></div>
    <div class="tabs">${SLOTS.map(([k, n]) => `<button class="tab" data-slot="${k}" aria-selected="${k === slot}">${n}</button>`).join("")}</div>
    <div class="dev-grid">${ITEMS.filter((i) => i.slot === slot)
      .map(
        (i) =>
          `<button class="dev-card${equip[slot] === i.id ? " on" : ""}" data-item="${i.id}"><canvas data-eq="${i.id}"></canvas>
          <b>${esc(i.name)}</b><small>${i.id} · ${i.price}</small></button>`,
      )
      .join("")}</div>`;
  body.querySelectorAll("[data-slot]").forEach(
    (b) =>
      (b.onclick = () => {
        slot = b.dataset.slot;
        render();
      }),
  );
  body.querySelectorAll("[data-item]").forEach(
    (b) =>
      (b.onclick = () => {
        equip = { ...equip, [slot]: b.dataset.item };
        render();
      }),
  );
  $("dev-mine").onclick = () => {
    equip = { ...P.equip };
    render();
  };
  $("dev-go").onclick = () => fight(BOSSES[boss]);
}

function abilTab(body) {
  body.innerHTML = `
    <label>Босс: <select id="dev-boss">${BOSSES.map((b, i) => `<option value="${i}" ${i === boss ? "selected" : ""}>${i + 1}. ${esc(b.name)}</option>`).join("")}</select></label>
    <p class="note">Бой, где у босса только одна способность. Срабатывают они случайно, жми «Верно», пока не увидишь.</p>
    <div class="dev-list">${Object.entries(AB)
      .map(([k, a]) => `<button class="btn small" data-ab="${k}"><b>${esc(a.n)}</b><small>${esc(a.d)}</small></button>`)
      .join("")}</div>`;
  $("dev-boss").onchange = (e) => (boss = +e.target.value);
  body
    .querySelectorAll("[data-ab]")
    .forEach(
      (b) =>
        (b.onclick = () => fight({ ...BOSSES[boss], ab: b.dataset.ab === "enrage" ? ["enrage"] : [b.dataset.ab] })),
    );
}

function screensTab(body) {
  body.innerHTML = `<div class="dev-list">
    <button class="btn small" id="dev-title">Заставка</button>
    <button class="btn small" id="dev-story">История</button>
    <button class="btn small" id="dev-home">Главная</button></div>`;
  $("dev-title").onclick = showTitle;
  $("dev-story").onclick = showStory;
  $("dev-home").onclick = home;
}

/** Бой-песочница: снимок профиля, экипировка из меню, огромный запас жизней у босса. */
function fight(b) {
  if (!backup) backup = { p: JSON.parse(JSON.stringify(P)), stats: JSON.parse(JSON.stringify(stats)) };
  Object.assign(P.equip, equip);
  const play = settings.play;
  settings.play = "pick"; // кнопки «Верно»/«Ошибка» жмут варианты ответа
  startCustom({ ...b, hp: 99999, filter: tower >= 0 ? TOWER_FILTER[tower] : b.filter });
  settings.play = play;
  bar.hidden = false;
}

function restore() {
  Object.keys(P).forEach((k) => delete P[k]);
  Object.assign(P, backup.p);
  save();
  setStats(backup.stats);
  LS.set("sb_stats", backup.stats);
  backup = null;
  bar.hidden = true;
}

function pickOpt(right) {
  if (!G || !G.cur || G.locked || !$("boss-over").hidden) return;
  const { e, slot: s, opts } = G.cur,
    c = e.segs[s].c;
  answer(right ? opts.indexOf(c) : 1 - opts.indexOf(c));
}
bar.addEventListener("click", (e) => {
  const a = e.target.dataset && e.target.dataset.a;
  if (!G || !a) return;
  if (a === "ok") pickOpt(true);
  if (a === "bad") pickOpt(false);
  if (a === "crit") {
    G.streak = Math.max(G.streak, 10);
    pickOpt(true);
  }
  if (a === "pet") petAttack();
  if (a === "rage") {
    G.hp = Math.ceil(G.boss.hp * 0.25);
    renderHUD();
  }
  if (a === "kill") {
    G.hp = 1;
    renderHUD();
    pickOpt(true);
  }
});
bar.addEventListener("change", (e) => {
  if (e.target.dataset.a === "god") god = e.target.checked;
});

setInterval(() => {
  frame++;
  if (backup && G && god && G.hearts < 2) {
    G.hearts = gear().maxH;
    renderHUD();
  }
  // бой закончился и игрок ушёл с экранов боя — вернуть профиль
  if (backup && $("s-game").hidden && $("s-end").hidden) {
    restore();
    open();
  }
  if (sec.hidden) return;
  sec.querySelectorAll("canvas[data-b]").forEach((cv) => {
    const b = BOSSES[+cv.dataset.b];
    drawBoss(cv, b, false, !angry && frame % 13 < 2, angry);
    cv.style.filter = tower >= 0 ? TOWER_FILTER[tower] : "";
  });
  sec
    .querySelectorAll("canvas[data-eq]")
    .forEach((cv) => drawHero(cv, { ...equip, [slot]: cv.dataset.eq }, null, frame));
  const hero = $("dev-hero");
  if (hero) drawHero(hero, equip, null, frame);
}, 170);

window.addEventListener("hashchange", () => location.hash === "#dev" && open());
if (location.hash === "#dev") setTimeout(open, 0);
