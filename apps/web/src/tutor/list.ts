// Список учеников: кто когда играл, сколько выучил, трудные слова и текущее задание.
import type { Student } from "@repetitor/shared";
import { esc } from "../lib/dom.js";
import { levelOf } from "../progress/levels.ts";
import { TOKEN, api, app, hardWords, learned, msg, seen, todayOf } from "./common.ts";
import { taskCell } from "./tasks.ts";

export async function renderList(onLogout: () => void) {
  app.innerHTML = `<section class="screen"><h1>Ученики</h1><p class="note">Загружаю…</p></section>`;
  let list: Student[];
  try {
    list = await api<Student[]>("GET", "/tutor/students");
  } catch {
    app.querySelector(".note")!.textContent = "Не получилось загрузить список. Обновите страницу.";
    return;
  }
  const rows = list
    .map((s) => {
      const p = s.profile,
        d = todayOf(s),
        task = taskCell(s);
      return `<tr data-id="${esc(s.id)}" tabindex="0">
        <td><b>${esc(s.name)}</b></td>
        <td class="n">${p ? levelOf(p.xp) : "—"}</td>
        <td>${esc(seen(s.lastSeenAt))}</td>
        <td class="n">${d ? `${Math.floor(d.sec / 60)} мин · ${d.correct} верно` : "—"}</td>
        <td class="n">${learned(s)}</td>
        <td class="n${hardWords(s).length ? " bad" : ""}">${hardWords(s).length}</td>
        <td class="tcell ${task.cls}">${esc(task.text)}</td>
      </tr>`;
    })
    .join("");
  app.innerHTML = `
    <section class="screen">
      <div class="row tutor-top"><h1>Ученики</h1><span class="row"><a class="link" href="#/account">Пароль</a><button class="link" id="logout">Выйти</button></span></div>
      <div class="panel">
        <h2>Добавить ученика</h2>
        <form class="pinrow" id="add">
          <input id="add-name" type="text" maxlength="30" autocomplete="off" placeholder="Имя ученика" aria-label="Имя ученика" />
          <button class="btn primary" type="submit">Добавить</button>
        </form>
        <p class="msg" id="add-msg"></p>
      </div>
      ${
        list.length
          ? `<div class="panel tutor-scroll"><table class="tutor-table">
              <thead><tr><th>Имя</th><th class="n">Уровень</th><th>Последний раз</th><th class="n">Сегодня</th><th class="n">Выучено</th><th class="n">Трудных слов</th><th>Задание</th></tr></thead>
              <tbody>${rows}</tbody></table></div>`
          : `<p class="note">Добавьте первого ученика: он получит код, по которому войдёт в игру.</p>`
      }
    </section>`;
  app.querySelector<HTMLButtonElement>("#logout")!.onclick = () => {
    localStorage.removeItem(TOKEN);
    onLogout();
  };
  app.querySelector<HTMLFormElement>("#add")!.onsubmit = async (ev) => {
    ev.preventDefault();
    const name = app.querySelector<HTMLInputElement>("#add-name")!.value.trim();
    if (!name) return msg(app.querySelector("#add-msg"), "Впишите имя.", "err");
    try {
      const s = await api<Student>("POST", "/tutor/students", { name });
      location.hash = `#/s/${s.id}/login`; // новому ученику первым делом нужен код
    } catch {
      msg(app.querySelector("#add-msg"), "Не получилось добавить. Попробуйте ещё раз.", "err");
    }
  };
  app.querySelectorAll<HTMLTableRowElement>("tr[data-id]").forEach((tr) => {
    const open = () => (location.hash = `#/s/${tr.dataset.id}`);
    tr.onclick = open;
    tr.onkeydown = (e) => e.key === "Enter" && open();
  });
}
