// Страница ученика: вкладки «Обзор», «Задания», «Слова и лимиты», «Вход».
// Адрес вкладки: #/s/:id (обзор), #/s/:id/tasks, #/s/:id/words, #/s/:id/login.
import type { Student, TutorSettings } from "@repetitor/shared";
import { esc } from "../lib/dom.js";
import { parseEntry } from "../topics/words/parse.ts";
import { TITLES, levelOf } from "../progress/levels.ts";
import { TOTAL_WORDS, api, app, hardWords, learned, msg, q, rawOf, seen, todayOf } from "./common.ts";
import { renderTasksTab, setPrefill, tasksSummary } from "./tasks.ts";

const TABS: [string, string][] = [
  ["", "Обзор"],
  ["tasks", "Задания"],
  ["words", "Слова и лимиты"],
  ["login", "Вход"],
];
const MODES: [string, string][] = [
  ["", "Как выберет ученик"],
  ["auto", "Как в кампании: сначала 1–2 класс, потом 3–4"],
  ["a", "Только 1–2 класс"],
  ["ab", "Все слова вперемешку"],
  ["b", "Только 3–4 класс"],
  ["custom", "Только мои слова"],
];
const LIMS: [string, string][] = [
  ["min", "Минут игры"],
  ["fresh", "Новых слов"],
  ["correct", "Верных ответов"],
  ["battles", "Боёв"],
  ["mistakes", "Ошибок"],
];
const tile = (k: string, v: string | number) => `<div class="stat"><span>${k}</span><b>${esc(String(v))}</b></div>`;
const tabUrl = (id: string, tab: string) => `#/s/${encodeURIComponent(id)}${tab ? "/" + tab : ""}`;

export async function renderStudent(id: string, tab: string) {
  app.innerHTML = `<section class="screen"><p class="note">Загружаю…</p></section>`;
  let s: Student;
  try {
    s = await api<Student>("GET", `/tutor/students/${encodeURIComponent(id)}`);
  } catch {
    app.innerHTML = `<section class="screen"><p class="note">Ученик не найден.</p><a class="link" href="#/">К списку</a></section>`;
    return;
  }
  if (!TABS.some(([t]) => t === tab)) tab = "";
  const p = s.profile,
    lvl = p ? levelOf(p.xp) : 0;
  const line = p
    ? `был(а) ${seen(s.lastSeenAt)} · уровень ${lvl} · выучено ${learned(s)} из ${TOTAL_WORDS}`
    : "ещё не входил(а) в игру по коду";
  app.innerHTML = `
    <section class="screen">
      <div class="row tutor-top"><a class="link" href="#/">← Все ученики</a><a class="link" href="#/account">Пароль</a></div>
      <h1>${esc(s.name)}</h1>
      <p class="note tline">${esc(line)}</p>
      <nav class="ttabs" role="tablist">${TABS.map(
        ([t, name]) =>
          `<a role="tab" href="${tabUrl(s.id, t)}" class="ttab${t === tab ? " on" : ""}" aria-selected="${t === tab}">${esc(name)}</a>`,
      ).join("")}</nav>
      <div id="tab"></div>
    </section>`;
  const root = q("#tab");
  const reload = () => renderStudent(s.id, tab);
  if (tab === "tasks") renderTasksTab(root, s, reload);
  else if (tab === "words") wordsTab(root, s);
  else if (tab === "login") loginTab(root, s);
  else overviewTab(root, s, lvl);
}

function overviewTab(root: HTMLElement, s: Student, lvl: number) {
  const d = todayOf(s),
    hard = hardWords(s);
  root.innerHTML = `
    <div class="panel">
      <h2>Сегодня</h2>
      ${
        d
          ? `<div class="stats">${tile("Минут", Math.floor(d.sec / 60))}${tile("Верных", d.correct)}${tile("Ошибок", d.mistakes)}${tile("Новых слов", d.fresh)}</div>`
          : `<p class="note">Сегодня ещё не играл(а).</p>`
      }
      ${s.profile ? `<p class="note">${esc(TITLES[lvl - 1])} · дней подряд: ${s.profile.days?.streak ?? 0} · верных ответов всего: ${s.profile.tot?.correct ?? 0}</p>` : ""}
    </div>
    <div class="panel">
      <div class="row tutor-top"><h2>Задания</h2><a class="link" href="${tabUrl(s.id, "tasks")}">Все задания →</a></div>
      ${tasksSummary(s)}
    </div>
    <div class="panel">
      <h2>Трудные слова</h2>
      ${
        hard.length
          ? `<p class="note">Отметьте слова и дайте их заданием: каждое станет монстром в логове.</p>
            <div class="tutor-scroll"><table><thead><tr><th></th><th>Слово</th><th class="n">Ошибок</th><th class="n">Верно</th></tr></thead><tbody>
              ${hard
                .map(([w, x], i) => {
                  const raw = rawOf(w, s.settings?.customWords);
                  return `<tr><td>${raw ? `<input type="checkbox" class="hw" data-raw="${esc(raw)}"${i < 8 ? " checked" : ""} aria-label="${esc(w)}" />` : ""}</td><td>${esc(w)}</td><td class="n bad">${x.wrong}</td><td class="n">${x.right}</td></tr>`;
                })
                .join("")}
            </tbody></table></div>
            <div class="row"><button class="btn primary small" id="give">Дать заданием</button><span class="msg" id="give-msg"></span></div>`
          : `<p class="note">Ошибок пока нет.</p>`
      }
    </div>`;
  root.querySelector<HTMLButtonElement>("#give")?.addEventListener("click", () => {
    const raws = [...root.querySelectorAll<HTMLInputElement>(".hw:checked")].map((c) => c.dataset.raw!);
    if (!raws.length) return msg(q("#give-msg"), "Отметьте хотя бы одно слово.", "err");
    setPrefill(raws.slice(0, 40));
    location.hash = tabUrl(s.id, "tasks");
  });
}

function wordsTab(root: HTMLElement, s: Student) {
  const set = s.settings || {};
  root.innerHTML = `
    <form class="panel" id="settings">
      <h2>Какие слова</h2>
      ${MODES.map(
        ([v, t]) =>
          `<label class="mode"><input type="radio" name="words" value="${v}"${(set.words || "") === v ? " checked" : ""} /><span><b>${esc(t)}</b></span></label>`,
      ).join("")}
      <h2>Мои слова</h2>
      <p class="note">Одно слово в строке, трудная буква в скобках: м(о)локо, неправильный вариант через черту: м(о/а)локо.</p>
      <textarea id="custom" rows="6" placeholder="м(о)локо&#10;с(о)бака">${esc(set.customWords ?? "")}</textarea>
      <h2>Лимиты на день</h2>
      <p class="note">0 — без лимита. Когда лимит достигнут, игра мягко останавливается до завтра. Задания открыты и после лимита.</p>
      <div class="tutor-lims">
        ${LIMS.map(([k, t]) => `<label>${esc(t)} <input type="number" min="0" max="2000" name="lim-${k}" value="${set.lim?.[k] ?? 0}" /></label>`).join("")}
      </div>
      <div class="row"><button class="btn primary small" type="submit">Сохранить</button><span class="msg" id="set-msg"></span></div>
      <p class="note">Ученик получит настройки при следующем запуске игры.</p>
    </form>`;
  q<HTMLFormElement>("#settings").onsubmit = async (ev) => {
    ev.preventDefault();
    const f = ev.target as HTMLFormElement;
    const words = f.querySelector<HTMLInputElement>('input[name="words"]:checked')?.value || "";
    const customWords = q<HTMLTextAreaElement>("#custom").value;
    const bad = customWords
      .split(/\n|,/)
      .map((l) => l.trim())
      .filter((l) => l && !parseEntry(l));
    const lim = Object.fromEntries(
      LIMS.map(([k]) => [k, Number(f.querySelector<HTMLInputElement>(`[name="lim-${k}"]`)!.value) || 0]),
    );
    const settings: TutorSettings = { ...(words ? { words } : {}), customWords, lim };
    try {
      await api("PATCH", `/tutor/students/${s.id}`, { settings });
      s.settings = settings;
      msg(
        q("#set-msg"),
        bad.length
          ? `Сохранено. Не понял слова: ${bad.slice(0, 4).join(", ")}${bad.length > 4 ? "…" : ""}`
          : "Сохранено.",
        bad.length ? "err" : "okm",
      );
    } catch {
      msg(q("#set-msg"), "Не получилось сохранить.", "err");
    }
  };
}

function loginTab(root: HTMLElement, s: Student) {
  root.innerHTML = `
    <div class="panel">
      <h2>Код для входа</h2>
      <div class="row"><span class="tutor-code" id="code">${esc(s.code)}</span><button class="btn small" id="copy">Скопировать</button></div>
      <p class="note">В игре: «Кто играет?» после заставки или «Код учителя» в настройках. После входа прогресс ученика сохраняется здесь.</p>
      <div class="row"><button class="btn small" id="new-code">Выдать новый код</button><span class="msg" id="code-msg"></span></div>
    </div>
    <div class="panel">
      <h2>Имя</h2>
      <form class="pinrow" id="rename">
        <input id="name" type="text" maxlength="30" value="${esc(s.name)}" aria-label="Имя ученика" />
        <button class="btn small" type="submit">Переименовать</button>
      </form>
    </div>
    <div class="panel">
      <h2>Удалить</h2>
      <div class="row"><button class="btn small" id="delete">Удалить ученика</button><span class="msg" id="del-msg"></span></div>
    </div>`;
  q<HTMLButtonElement>("#copy").onclick = async () => {
    try {
      await navigator.clipboard.writeText(q("#code").textContent || "");
      msg(q("#code-msg"), "Код скопирован.", "okm");
    } catch {
      msg(q("#code-msg"), "Не получилось скопировать: выделите код и скопируйте вручную.", "err");
    }
  };
  let codeArm = false;
  q<HTMLButtonElement>("#new-code").onclick = async () => {
    if (!codeArm) {
      codeArm = true;
      return msg(q("#code-msg"), "Старый код перестанет работать, ученику нужно будет войти заново. Нажмите ещё раз.");
    }
    codeArm = false;
    const r = await api<Student>("POST", `/tutor/students/${s.id}/code`);
    q("#code").textContent = r.code;
    msg(q("#code-msg"), "Новый код выдан.", "okm");
  };
  q<HTMLFormElement>("#rename").onsubmit = async (ev) => {
    ev.preventDefault();
    const name = q<HTMLInputElement>("#name").value.trim();
    if (!name) return;
    await api("PATCH", `/tutor/students/${s.id}`, { name });
    renderStudent(s.id, "login");
  };
  let delArm = false;
  q<HTMLButtonElement>("#delete").onclick = async () => {
    if (!delArm) {
      delArm = true;
      return msg(q("#del-msg"), "Весь прогресс ученика на сервере будет удалён. Нажмите ещё раз.", "err");
    }
    await api("DELETE", `/tutor/students/${s.id}`);
    location.hash = "#/";
  };
}
