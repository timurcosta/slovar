// «Кто играет?»: вход по коду от учителя, игра гостем, ссылка в кабинет учителя. Окно поверх заставки или главной.
import { $ } from "../../lib/dom.js";
import { P } from "../../state/profile.ts";
import { levelOf } from "../../progress/levels.ts";
import { isGuest, join, linkedName, setGuest } from "../../net/sync.ts";
import { toast } from "../toast.js";
import { renderHome } from "./home.js";
import { enterGame } from "./title.js";

let busy = false,
  backFocus = null;

/** «Войти по коду» внизу главной — только тем, кто ещё не вошёл: остальным прогресс сохраняется сам. */
export function syncJoinButtons() {
  $("btn-join").hidden = !!linkedName();
}

export function openLogin() {
  backFocus = document.activeElement;
  // герой уже есть на устройстве (гость или игравший на старом адресе): пусть знает, что он не пропадёт
  const hasHero = P.xp > 0;
  $("login-hero").hidden = !hasHero;
  $("login-hero").textContent = hasHero
    ? `Твой герой${P.name ? " " + P.name : ""}, уровень ${levelOf(P.xp)}, перейдёт к учителю после входа.`
    : "";
  $("btn-guest").hidden = isGuest(); // гость открыл окно, чтобы войти по коду
  $("join-in").value = "";
  $("join-msg").textContent = "";
  $("join-msg").className = "msg";
  $("login").hidden = false;
  setTimeout(() => {
    try {
      $("join-in").focus();
    } catch (e) {}
  }, 60);
}

export function closeLogin() {
  if ($("login").hidden) return;
  $("login").hidden = true;
  try {
    backFocus?.focus();
  } catch (e) {}
}

$("btn-join").onclick = openLogin;
$("btn-login-close").onclick = closeLogin;
$("login").addEventListener("click", (e) => {
  if (e.target === $("login")) closeLogin();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLogin();
});

$("btn-guest").onclick = () => {
  setGuest();
  closeLogin();
  enterGame();
};

$("join-form").onsubmit = async (ev) => {
  ev.preventDefault();
  if (busy) return;
  const code = $("join-in").value.trim(),
    m = $("join-msg");
  if (!code) {
    m.className = "msg err";
    m.textContent = "Впиши код от учителя.";
    return;
  }
  busy = true;
  m.className = "msg";
  m.textContent = "Проверяю…";
  try {
    const name = await join(code);
    toast(`Привет, ${name}! Теперь прогресс сохраняется у учителя.`, "quest");
    syncJoinButtons();
    closeLogin();
    if ($("s-home").hidden) enterGame();
    else renderHome();
  } catch (e) {
    m.className = "msg err";
    m.textContent =
      e && e.status === 404
        ? "Такого кода нет. Проверь буквы и цифры."
        : "Для входа нужен интернет. Проверь его и попробуй ещё раз. Потом играть можно и без интернета.";
  } finally {
    busy = false;
  }
};
