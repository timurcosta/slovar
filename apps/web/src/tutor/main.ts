// Кабинет репетитора: вход по паролю, ученики, их прогресс, трудные слова, задания и настройки.
// Модули игры, которые при загрузке читают профиль игрока (state/profile и др.), сюда не импортируем.
import "../styles/main.css";
import "./tutor.css";
import type { TokenResponse, TutorMeResponse } from "@repetitor/shared";
import { BOSSES } from "../content/bosses.js";
import { drawBoss } from "../render/sprite.js";
import { esc } from "../lib/dom.js";
import { HttpError } from "../net/http.ts";
import { TOKEN, api, app, getToken, msg, setOnUnauthorized } from "./common.ts";
import { renderList } from "./list.ts";
import { renderStudent } from "./student.ts";

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
  const m = /^#\/s\/([^/]+)(?:\/(\w+))?$/.exec(location.hash);
  if (m) renderStudent(decodeURIComponent(m[1]), m[2] || "");
  else if (location.hash === "#/account") renderAccount();
  else renderList(route);
}
setOnUnauthorized(route);
window.addEventListener("hashchange", route);
route();
