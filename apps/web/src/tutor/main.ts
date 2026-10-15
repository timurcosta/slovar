// Кабинет репетитора: вход по паролю, ученики, их прогресс, трудные слова и настройки.
// Модули игры, которые при загрузке читают профиль игрока (state/profile и др.), сюда не импортируем.
import "../styles/main.css";
import "./tutor.css";
import type { Student, TokenResponse, TutorMeResponse, TutorSettings } from "@repetitor/shared";
import { esc } from "../lib/dom.js";
import { today } from "../lib/date.js";
import { BOSSES } from "../content/bosses.js";
import { drawBoss } from "../render/sprite.js";
import { LEARN_N } from "../content/rules.ts";
import { TITLES, levelOf } from "../progress/levels.ts";
import { W12, W34 } from "../topics/words/lists.js";
import { parseEntry, parseList } from "../topics/words/parse.ts";
import { HttpError, request } from "../net/http.ts";

const app = document.getElementById("app")!;
const TOKEN = "tutor_token";
const TOTAL_WORDS = parseList(W12).length + parseList(W34).length;

const getToken = () => localStorage.getItem(TOKEN);
const api = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
  try {
    return await request<T>(method, path, { body, token: getToken() });
  } catch (e) {
    if (e instanceof HttpError && e.status === 401 && path !== "/tutor/login") {
      localStorage.removeItem(TOKEN);
      route();
    }
    throw e;
  }
};

const plural = (n: number, f: [string, string, string]) => {
  const a = Math.abs(n) % 100,
    b = a % 10;
  return f[a > 10 && a < 20 ? 2 : b === 1 ? 0 : b >= 2 && b <= 4 ? 1 : 2];
};

function seen(iso: string | null): string {
  if (!iso) return "ещё не заходил(а)";
  const d = new Date(iso),
    now = new Date();
  const days = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86400000,
  );
  const hm = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (days === 0) return `сегодня в ${hm}`;
  if (days === 1) return `вчера в ${hm}`;
  if (days < 7) return `${days} ${plural(days, ["день", "дня", "дней"])} назад`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

const learned = (s: Student) => Object.values(s.stats || {}).filter((w) => w.right >= LEARN_N).length;
const hardWords = (s: Student) =>
  Object.entries(s.stats || {})
    .filter(([, w]) => w.wrong > 0)
    .sort((a, b) => b[1].wrong - a[1].wrong || a[0].localeCompare(b[0], "ru"));
const todayOf = (s: Student) => (s.profile?.day && s.profile.day.date === today() ? s.profile.day : null);

function msg(el: Element | null, text: string, kind: "err" | "okm" | "" = "") {
  if (!el) return;
  el.className = `msg ${kind}`;
  el.textContent = text;
}

// ---------- вход ----------

function renderLogin() {
  app.innerHTML = `
    <section class="screen tutor-login">
      <div class="panel tutor-login-card">
        <canvas id="login-ralina" aria-hidden="true"></canvas>
        <h1>Кабинет учителя</h1>
        <p class="note">Ученики, их прогресс и трудные слова. Здесь же задаются слова, лимиты и задания.</p>
        <form id="login">
          <label for="pass">Пароль</label>
          <input id="pass" type="password" autocomplete="current-password" />
          <button class="btn primary" type="submit">Войти</button>
        </form>
        <p class="msg" id="login-msg"></p>
        <a class="link" href="./">← В игру</a>
      </div>
    </section>`;
  drawBoss(
    app.querySelector("#login-ralina")!,
    BOSSES.find((b) => b.name === "Репетитор Ралина"),
  );
  const form = app.querySelector<HTMLFormElement>("#login")!;
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const password = app.querySelector<HTMLInputElement>("#pass")!.value;
    try {
      const r = await api<TokenResponse>("POST", "/tutor/login", { password });
      localStorage.setItem(TOKEN, r.token);
      route();
    } catch (e) {
      const st = e instanceof HttpError ? e.status : 0;
      msg(
        app.querySelector("#login-msg"),
        st === 401
          ? "Неверный пароль."
          : st === 429
            ? "Слишком много попыток. Подождите минуту."
            : "Сервер недоступен.",
        "err",
      );
    }
  };
  app.querySelector<HTMLInputElement>("#pass")!.focus();
}

// ---------- список ----------

async function renderList() {
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
        d = todayOf(s);
      return `<tr data-id="${esc(s.id)}" tabindex="0">
        <td><b>${esc(s.name)}</b></td>
        <td class="n">${p ? levelOf(p.xp) : "—"}</td>
        <td>${esc(seen(s.lastSeenAt))}</td>
        <td class="n">${d ? `${Math.floor(d.sec / 60)} мин · ${d.correct} верно` : "—"}</td>
        <td class="n">${learned(s)}</td>
        <td class="n${hardWords(s).length ? " bad" : ""}">${hardWords(s).length}</td>
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
              <thead><tr><th>Имя</th><th class="n">Уровень</th><th>Последний раз</th><th class="n">Сегодня</th><th class="n">Выучено</th><th class="n">Трудных слов</th></tr></thead>
              <tbody>${rows}</tbody></table></div>`
          : `<p class="note">Добавьте первого ученика: он получит код, по которому войдёт в игру.</p>`
      }
    </section>`;
  app.querySelector<HTMLButtonElement>("#logout")!.onclick = () => {
    localStorage.removeItem(TOKEN);
    route();
  };
  app.querySelector<HTMLFormElement>("#add")!.onsubmit = async (ev) => {
    ev.preventDefault();
    const name = app.querySelector<HTMLInputElement>("#add-name")!.value.trim();
    if (!name) return msg(app.querySelector("#add-msg"), "Впишите имя.", "err");
    try {
      const s = await api<Student>("POST", "/tutor/students", { name });
      location.hash = `#/s/${s.id}`;
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

// ---------- ученик ----------

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

async function renderStudent(id: string) {
  app.innerHTML = `<section class="screen"><p class="note">Загружаю…</p></section>`;
  let s: Student;
  try {
    s = await api<Student>("GET", `/tutor/students/${encodeURIComponent(id)}`);
  } catch {
    app.innerHTML = `<section class="screen"><p class="note">Ученик не найден.</p><a class="link" href="#/">К списку</a></section>`;
    return;
  }
  const p = s.profile,
    d = todayOf(s),
    hard = hardWords(s),
    set = s.settings || {};
  const tile = (k: string, v: string | number) => `<div class="stat"><span>${k}</span><b>${esc(String(v))}</b></div>`;
  const lvl = p ? levelOf(p.xp) : 0;
  app.innerHTML = `
    <section class="screen">
      <a class="link" href="#/">← Все ученики</a>
      <h1>${esc(s.name)}</h1>

      <div class="panel">
        <h2>Код для входа</h2>
        <p class="tutor-code" id="code">${esc(s.code)}</p>
        <p class="note">В игре: «Войти по коду» на заставке игры или «Код учителя» внизу главной.
          После входа прогресс ученика сохраняется здесь.</p>
        <div class="row"><button class="btn small" id="new-code">Выдать новый код</button><span class="msg" id="code-msg"></span></div>
      </div>

      <div class="panel">
        <h2>Прогресс</h2>
        ${
          p
            ? `<div class="stats">
                ${tile("Уровень", `${lvl} · ${TITLES[lvl - 1]}`)}
                ${tile("Последний раз", seen(s.lastSeenAt))}
                ${tile("Выучено слов", `${learned(s)} из ${TOTAL_WORDS}`)}
                ${tile("Верных ответов", p.tot?.correct ?? 0)}
                ${tile("Боссов кампании", `${p.beaten.length} из ${BOSSES.length}`)}
                ${tile("Рекорд башни", p.towerBest ? `этаж ${p.towerBest}` : "—")}
                ${tile("Дней подряд", p.days?.streak ?? 0)}
                ${tile("Монет", p.coins)}
              </div>`
            : `<p class="note">Ученик ещё не входил в игру по коду.</p>`
        }
        ${
          d
            ? `<h2>Сегодня</h2><div class="stats">
                ${tile("Минут", Math.floor(d.sec / 60))}${tile("Новых слов", d.fresh)}${tile("Верных", d.correct)}${tile("Боёв", d.battles)}${tile("Ошибок", d.mistakes)}
              </div>`
            : ""
        }
      </div>

      <div class="panel">
        <h2>Трудные слова</h2>
        ${
          hard.length
            ? `<div class="tutor-scroll"><table><thead><tr><th>Слово</th><th class="n">Ошибок</th><th class="n">Верно</th></tr></thead><tbody>
                ${hard.map(([w, x]) => `<tr><td>${esc(w)}</td><td class="n bad">${x.wrong}</td><td class="n">${x.right}</td></tr>`).join("")}
              </tbody></table></div>`
            : `<p class="note">Ошибок пока нет.</p>`
        }
      </div>

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
        <p class="note">0 — без лимита. Когда лимит достигнут, игра мягко останавливается до завтра.</p>
        <div class="tutor-lims">
          ${LIMS.map(([k, t]) => `<label>${esc(t)} <input type="number" min="0" max="2000" name="lim-${k}" value="${set.lim?.[k] ?? 0}" /></label>`).join("")}
        </div>
        <div class="row"><button class="btn primary small" type="submit">Сохранить</button><span class="msg" id="set-msg"></span></div>
        <p class="note">Ученик получит настройки при следующем запуске игры.</p>
      </form>

      <div class="panel">
        <h2>Ученик</h2>
        <form class="pinrow" id="rename">
          <input id="name" type="text" maxlength="30" value="${esc(s.name)}" aria-label="Имя ученика" />
          <button class="btn small" type="submit">Переименовать</button>
        </form>
        <div class="row"><button class="btn small" id="delete">Удалить ученика</button><span class="msg" id="del-msg"></span></div>
      </div>
    </section>`;

  const q = <T extends Element>(sel: string) => app.querySelector<T>(sel)!;

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

  q<HTMLFormElement>("#settings").onsubmit = async (ev) => {
    ev.preventDefault();
    const f = ev.target as HTMLFormElement;
    const words = (f.querySelector<HTMLInputElement>('input[name="words"]:checked')?.value || "") as string;
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

  q<HTMLFormElement>("#rename").onsubmit = async (ev) => {
    ev.preventDefault();
    const name = q<HTMLInputElement>("#name").value.trim();
    if (!name) return;
    await api("PATCH", `/tutor/students/${s.id}`, { name });
    renderStudent(s.id);
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

// ---------- пароль учителя ----------

const day = (iso: string) => new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

async function renderAccount() {
  app.innerHTML = `<section class="screen"><p class="note">Загружаю…</p></section>`;
  let me: TutorMeResponse;
  try {
    me = await api<TutorMeResponse>("GET", "/tutor/me");
  } catch {
    app.querySelector(".note")!.textContent = "Не получилось загрузить. Обновите страницу.";
    return;
  }
  const about =
    me.who === "tutor"
      ? `Вы вошли своим паролем (задан ${day(me.tutorPasswordAt!)}). Чтобы сменить, введите текущий и новый.`
      : me.tutorPasswordAt
        ? `Вы вошли паролем администратора. У учителя уже есть свой пароль (задан ${day(me.tutorPasswordAt)}) — здесь его можно сменить.`
        : "Вы вошли паролем администратора. Придумайте свой пароль учителя и дальше входите им. Пароль администратора останется у владельца для отладки.";
  app.innerHTML = `
    <section class="screen">
      <a class="link" href="#/">← Все ученики</a>
      <h1>Пароль</h1>
      <div class="panel tutor-account">
        <p class="note" id="pw-about">${esc(about)}</p>
        <form class="tutor-form" id="pw">
          <label for="pw-cur">${me.who === "tutor" ? "Текущий пароль" : "Пароль, которым вы вошли"}</label>
          <input id="pw-cur" type="password" autocomplete="current-password" />
          <label for="pw-new">Новый пароль учителя (от 8 символов)</label>
          <input id="pw-new" type="password" autocomplete="new-password" minlength="8" />
          <label for="pw-rep">Ещё раз</label>
          <input id="pw-rep" type="password" autocomplete="new-password" minlength="8" />
          <button class="btn primary" type="submit">Сохранить пароль</button>
        </form>
        <p class="msg" id="pw-msg"></p>
      </div>
    </section>`;
  const v = (id: string) => app.querySelector<HTMLInputElement>(id)!.value;
  app.querySelector<HTMLFormElement>("#pw")!.onsubmit = async (ev) => {
    ev.preventDefault();
    const m = app.querySelector("#pw-msg");
    if (v("#pw-new").length < 8) return msg(m, "Новый пароль: хотя бы 8 символов.", "err");
    if (v("#pw-new") !== v("#pw-rep")) return msg(m, "Пароли не совпали.", "err");
    try {
      await api("POST", "/tutor/password", { current: v("#pw-cur"), next: v("#pw-new") });
      app.querySelector<HTMLFormElement>("#pw")!.reset();
      app.querySelector("#pw-about")!.textContent =
        "Пароль учителя задан. Дальше учитель входит им, пароль администратора остаётся у владельца.";
      msg(m, "Пароль сохранён. Дальше входите им.", "okm");
    } catch (e) {
      const st = e instanceof HttpError ? e.status : 0;
      msg(
        m,
        st === 403
          ? "Текущий пароль не подошёл."
          : st === 429
            ? "Слишком много попыток. Подождите минуту."
            : "Не получилось сохранить. Попробуйте ещё раз.",
        "err",
      );
    }
  };
}

// ---------- маршруты ----------

function route() {
  if (!getToken()) return renderLogin();
  const m = /^#\/s\/(.+)$/.exec(location.hash);
  if (m) renderStudent(decodeURIComponent(m[1]));
  else if (location.hash === "#/account") renderAccount();
  else renderList();
}
window.addEventListener("hashchange", route);
route();
