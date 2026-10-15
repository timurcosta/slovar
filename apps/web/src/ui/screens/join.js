// Вход по коду от учителя (только в сборке с сервером, VITE_BACKEND=1).
import { $ } from "../../lib/dom.js";
import { P } from "../../state/profile.ts";
import { BACKEND, join, linkedName } from "../../net/sync.ts";
import { show } from "../screens.js";
import { toast } from "../toast.js";
import { renderHome } from "./home.js";
import { showStory } from "./intro.js";
import { showTitle } from "./title.js";

const LEAD = $("join-lead").textContent;
let joinBack = "s-home",
  busy = false;

export function syncJoinButtons() {
  $("btn-join").hidden = !BACKEND;
  $("btn-join").textContent = linkedName() ? "У учителя ✓" : "Код учителя";
}

export function openJoin(back) {
  joinBack = back;
  const n = linkedName();
  $("join-lead").textContent = n
    ? `Ты подключён к учителю как ${n}. Прогресс сохраняется сам. Новый код нужен, только если учитель его сменил.`
    : LEAD;
  $("join-in").value = "";
  $("join-msg").textContent = "";
  $("join-msg").className = "msg";
  show("s-join");
  setTimeout(() => {
    try {
      $("join-in").focus();
    } catch (e) {}
  }, 60);
}

$("btn-join").onclick = () => openJoin("s-home");
$("btn-join-back").onclick = () => {
  if (joinBack === "s-title" || !P.name) showTitle();
  else {
    renderHome();
    show("s-home");
  }
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
    renderHome();
    if (!P.storySeen) showStory();
    else show("s-home");
  } catch (e) {
    m.className = "msg err";
    m.textContent =
      e && e.status === 404
        ? "Такого кода нет. Проверь буквы и цифры."
        : "Не получилось связаться с учителем. Проверь интернет и попробуй ещё раз.";
  } finally {
    busy = false;
  }
};
