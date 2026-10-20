// «Кто играет?»: вход по коду от учителя, игра гостем, ссылка в кабинет учителя. Окно поверх заставки или главной.
import { $ } from "../../lib/dom.js";
import { P, resetProfile, save } from "../../state/profile.ts";
import { setStats } from "../../state/stats.ts";
import { LS } from "../../state/storage.ts";
import { levelOf } from "../../progress/levels.ts";
import { isGuest, join, linkedName, logout, setGuest } from "../../net/sync.ts";
import { toast } from "../toast.js";
import { renderHome } from "./home.js";
import { enterGame } from "./title.js";

let busy = false,
  backFocus = null;

/** В настройках: «Войти по коду» — тем, кто ещё не вошёл (остальным прогресс сохраняется сам), «Выйти» — вошедшим. */
export function syncJoinButtons() {
  $("btn-join").hidden = !!linkedName();
  $("btn-logout").hidden = !linkedName();
  armLogout(false);
}

const GUEST_SUB =
  "Прогресс останется только на этом устройстве, учитель его не увидит, задания и слова учителя не придут. Войдёшь по коду позже — прогресс перейдёт к учителю.";

export function openLogin() {
  backFocus = document.activeElement;
  // герой уже есть на устройстве (прошлый гость или игравший на старом адресе): продолжить его или начать новым
  const hasHero = P.xp > 0,
    who = `${P.name ? P.name + ", у" : "У"}ровень ${levelOf(P.xp)}`;
  $("login-hero").hidden = !hasHero;
  $("login-hero").textContent = hasHero
    ? `На этом устройстве есть герой: ${who}. Войдёшь по коду — он перейдёт к учителю.`
    : "";
  $("btn-guest").hidden = isGuest(); // гость открыл окно, чтобы войти по коду
  $("guest-t").textContent = hasHero ? "Продолжить без кода" : "Играть как гость";
  $("guest-sub").textContent = hasHero
    ? `Герой: ${who}. Прогресс только на этом устройстве, учитель его не увидит.`
    : GUEST_SUB;
  $("btn-guest-new").hidden = !hasHero || isGuest();
  armNew(false);
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

/** «Начать новым героем» стирает героя на устройстве, поэтому со второго нажатия. */
let armed = false;
function armNew(on) {
  armed = on;
  $("btn-guest-new").classList.toggle("danger", on);
  $("guest-new-t").textContent = on ? "Точно начать заново?" : "Начать новым героем";
  $("guest-new-sub").textContent = on
    ? `Нажми ещё раз. Герой уровня ${levelOf(P.xp)} сотрётся, вернуть его не получится.`
    : "Если это не твой герой. Прошлый герой с этого устройства сотрётся.";
}
$("btn-guest-new").onclick = () => {
  if (!armed) {
    armNew(true);
    return;
  }
  resetProfile();
  save();
  setStats({});
  LS.set("sb_stats", {});
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

/** «Выйти»: телефон общий, ученик уходит, на устройстве никого. Ребёнок может нажать случайно, а код помнит
 * не всегда — поэтому со второго нажатия. */
let logoutArmed = false;
function armLogout(on, sub) {
  const name = linkedName() || "";
  logoutArmed = on;
  $("btn-logout").classList.toggle("danger", on);
  $("logout-t").textContent = on ? "Точно выйти?" : `Выйти: играет ${name}`;
  $("logout-sub").textContent =
    sub ||
    (on
      ? `Нажми ещё раз. Вернуться к герою можно только по коду от учителя.`
      : `Если играет не ${name}. Прогресс останется у учителя.`);
}
$("btn-prefs").addEventListener("click", () => armLogout(false));
$("btn-logout").onclick = async () => {
  if (busy) return;
  if (!logoutArmed) {
    armLogout(true);
    return;
  }
  busy = true;
  $("logout-sub").textContent = "Отправляю прогресс учителю…";
  try {
    // прогресс дошёл, ученика на устройстве больше нет: заново с заставки, там спросят «Кто играет?»
    if (await logout()) location.reload();
    else armLogout(false, "Нет интернета: прогресс ещё не дошёл до учителя. Выйти можно, когда появится сеть.");
  } finally {
    busy = false;
  }
};
