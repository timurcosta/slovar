// Список учеников карточками: кому нужно внимание (пометки), последний вход, неделя, слова, задание.
// На телефоне карточка складывается в столбик, на широком экране — в строку; широкой таблицы нет.
import type { Student } from "@repetitor/shared";
import { esc } from "../lib/dom.js";
import { today } from "../lib/date.js";
import { levelOf } from "../progress/levels.ts";
import { TOKEN, api, app, hardNow, learned, loadStudents, msg, seen, todayOf } from "./common.ts";
import { taskCell } from "./tasks.ts";
import { type Flag, attention, attentionScore, weekCell, weekReport } from "./report.ts";

/** Порядок списка: care — сначала те, кому нужно внимание; name — по имени. Запоминается на устройстве. */
const SORT = "tutor_sort";
type Sort = "care" | "name";
const sortNow = (): Sort => (localStorage.getItem(SORT) === "name" ? "name" : "care");

const cell = (label: string, main: string, sub = "", cls = "") =>
  `<span class="sc-cell ${cls}"><small class="sc-l">${label}</small><span class="sc-v">${main}</span>${sub ? `<small class="sc-s">${sub}</small>` : ""}</span>`;

function card(s: Student, flags: Flag[]): string {
  const p = s.profile,
    d = todayOf(s),
    task = taskCell(s),
    hard = hardNow(s).length;
  const week = p ? weekCell(weekReport(p, s.stats, today())) : { main: "—", sub: "" };
  return `<li><a class="scard" href="#/s/${encodeURIComponent(s.id)}" data-id="${esc(s.id)}">
      <span class="sc-name"><b>${esc(s.name)}</b>${p ? `<small>уровень ${levelOf(p.xp)}</small>` : ""}</span>
      ${flags.length ? `<span class="sc-flags">${flags.map((f) => `<i class="flag ${f.level}">${esc(f.text)}</i>`).join("")}</span>` : ""}
      ${cell("Последний вход", esc(seen(s.lastSeenAt)), d ? `сегодня: ${Math.floor(d.sec / 60)} мин · верно ${d.correct}` : "")}
      ${cell("За 7 дней", esc(week.main), esc(week.sub), "wk")}
      ${cell("Слова", p ? `выучено ${learned(s)}` : "—", hard ? `<span class="bad">трудных ${hard}</span>` : "")}
      ${cell("Задание", esc(task.text), "", `tcell ${task.cls}`)}
    </a></li>`;
}

export async function renderList(onLogout: () => void) {
  app.innerHTML = `<section class="screen"><h1>Ученики</h1><p class="note">Загружаю…</p></section>`;
  try {
    draw(await loadStudents(), onLogout);
  } catch {
    app.querySelector(".note")!.textContent = "Не получилось загрузить список. Обновите страницу.";
  }
}

/** Нарисовать уже загруженный список (смена порядка — без нового запроса). */
function draw(list: Student[], onLogout: () => void) {
  const sort = sortNow(),
    rows = list.map((s) => ({ s, flags: attention(s, today()) }));
  // сервер отдаёт по имени; «сначала важное» поднимает тех, у кого пометки весомее (при равенстве — по имени)
  if (sort === "care") rows.sort((a, b) => attentionScore(b.flags) - attentionScore(a.flags));
  const care = rows.filter((r) => r.flags.some((f) => f.level === "bad" || f.level === "warn")).length;
  app.innerHTML = `
    <section class="screen">
      <div class="row tutor-top"><h1>Ученики</h1><span class="row"><a class="link" href="#/account">Пароль</a><button class="link" id="logout">Выйти</button></span></div>
      <div class="row list-bar">
        <button class="btn primary small" type="button" id="add-open" aria-expanded="${!list.length}">+ Ученик</button>
        ${
          list.length > 1
            ? `<span class="wtabs" role="group" aria-label="Порядок списка">
                <button type="button" class="wtab${sort === "care" ? " on" : ""}" data-sort="care" aria-pressed="${sort === "care"}">Сначала важное${care ? ` <b>${care}</b>` : ""}</button>
                <button type="button" class="wtab${sort === "name" ? " on" : ""}" data-sort="name" aria-pressed="${sort === "name"}">По имени</button>
              </span>`
            : ""
        }
      </div>
      <div class="panel" id="add-panel"${list.length ? " hidden" : ""}>
        <h2>Новый ученик</h2>
        <form class="pinrow" id="add">
          <input id="add-name" type="text" maxlength="30" autocomplete="off" placeholder="Имя ученика" aria-label="Имя ученика" />
          <button class="btn primary" type="submit">Добавить</button>
        </form>
        <p class="note">Ученик получит код, по которому войдёт в игру.</p>
        <p class="msg" id="add-msg"></p>
      </div>
      ${list.length ? `<ul class="slist">${rows.map((r) => card(r.s, r.flags)).join("")}</ul>` : ""}
    </section>`;
  app.querySelector<HTMLButtonElement>("#logout")!.onclick = () => {
    localStorage.removeItem(TOKEN);
    onLogout();
  };
  const addOpen = app.querySelector<HTMLButtonElement>("#add-open")!,
    addPanel = app.querySelector<HTMLElement>("#add-panel")!;
  addOpen.onclick = () => {
    addPanel.hidden = !addPanel.hidden;
    addOpen.setAttribute("aria-expanded", String(!addPanel.hidden));
    if (!addPanel.hidden) app.querySelector<HTMLInputElement>("#add-name")!.focus();
  };
  app.querySelectorAll<HTMLButtonElement>("[data-sort]").forEach(
    (b) =>
      (b.onclick = () => {
        localStorage.setItem(SORT, b.dataset.sort!);
        draw(list, onLogout);
      }),
  );
  app.querySelector<HTMLFormElement>("#add")!.onsubmit = async (ev) => {
    ev.preventDefault();
    const name = app.querySelector<HTMLInputElement>("#add-name")!.value.trim();
    if (!name) return msg(app.querySelector("#add-msg"), "Впишите имя.", "err");
    try {
      const s = await api<Student>("POST", "/tutor/students", { name });
      location.hash = `#/s/${s.id}`; // у нового ученика в обзоре первым делом код для входа
    } catch {
      msg(app.querySelector("#add-msg"), "Не получилось добавить. Попробуйте ещё раз.", "err");
    }
  };
}
