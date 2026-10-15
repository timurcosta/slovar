// Раздел учителя: PIN, ученик, слова, лимиты, статистика.
import { $, esc } from "../../lib/dom.js";
import { hash } from "../../lib/random.js";
import { BOSSES } from "../../content/bosses.js";
import { parseEntry } from "../../topics/words/parse.ts";
import { PAB, customPool, customRaw, setCustomRaw } from "../../topics/words/pools.js";
import { LEARN_N, learnedCount, setStats, stats } from "../../state/stats.ts";
import { P, resetProfile, save } from "../../state/profile.ts";
import { LS } from "../../state/storage.ts";
import { saveSettings, settings } from "../../state/settings.ts";
import { TITLES, levelOf } from "../../progress/levels.ts";
import { LIM_KEYS, ensureDay, lims } from "../../progress/limits.js";
import { sfx } from "../../audio/sfx.js";
import { syncDiff } from "../../battle/difficulty.js";
import { toast } from "../toast.js";
import { show } from "../screens.js";
import { home } from "./home.js";
import { askName, cleanName } from "./intro.js";

let resetArm = false,
  resetT = 0,
  heroArm = false,
  heroT = 0;
let teacherTab = "pupil";
function showTeacherTab(t) {
  teacherTab = t;
  document.querySelectorAll("#ttabs .tab").forEach((b) => b.setAttribute("aria-selected", b.dataset.tt === t));
  document.querySelectorAll("#s-teacher [data-tp]").forEach((p) => (p.hidden = p.dataset.tp !== t));
}
document.querySelectorAll("#ttabs .tab").forEach((b) => (b.onclick = () => showTeacherTab(b.dataset.tt)));
function renderTeacher() {
  showTeacherTab(teacherTab);
  renderLimits();
  const ln = learnedCount();
  $("learned-note").innerHTML =
    `Выучено <b>${ln}</b> из ${PAB.length} словарных слов (слово считается выученным после ${LEARN_N} верных ответов). Встречалось: ${Object.keys(stats).length}. Сегодня новых слов: ${(ensureDay(), P.day.fresh)}.`;
  $("rename-in").value = P.name || "";
  $("rename-msg").textContent = "";
  $("pin-note").textContent = getPin()
    ? "PIN-код стоит. Ученик не сможет открыть этот раздел."
    : "PIN-код не поставлен: раздел может открыть кто угодно.";
  $("pin-set-msg").textContent = "";
  $("btn-pin-off").disabled = !getPin();
  document.querySelectorAll('input[name="words"]').forEach((r) => (r.checked = r.value === settings.words));
  $("opt-timer").checked = settings.timer;
  $("custom").value = customRaw;
  $("save-msg").textContent = "";
  $("save-msg").className = "msg";
  $("gift-msg").textContent = "";
  const rows = Object.entries(stats)
    .filter(([, s]) => s.wrong > 0)
    .sort((a, b) => b[1].wrong - a[1].wrong || a[0].localeCompare(b[0], "ru"));
  $("stats-wrap").innerHTML = rows.length
    ? `<table><thead><tr><th>Слово</th><th style="text-align:right">Ошибок</th><th style="text-align:right">Верно</th></tr></thead><tbody>${rows.map(([w, s]) => `<tr><td>${esc(w)}</td><td class="n bad">${s.wrong}</td><td class="n">${s.right}</td></tr>`).join("")}</tbody></table>`
    : `<p class="note">Пока ошибок нет. Здесь появятся слова, в которых ученик ошибается, по всем играм на этом устройстве.</p>`;
  const l = levelOf(P.xp);
  $("prog-note").textContent =
    `Уровень ${l} (${TITLES[l - 1]}), монет ${P.coins}, верных ответов ${P.tot.correct}, боссов кампании ${P.beaten.length} из ${BOSSES.length}, рекорд башни ${P.towerBest}, дней подряд ${P.days.streak}.`;
  resetArm = false;
  $("btn-reset").textContent = "Стереть статистику";
  heroArm = false;
  $("btn-reset-hero").textContent = "Начать бойца заново";
}
function renderLimits() {
  const L = lims();
  LIM_KEYS.forEach(([k]) => ($("lim-" + k).value = L[k] || 0));
  const d = ensureDay();
  $("today-stats").innerHTML = [
    ["Минут", Math.floor(d.sec / 60)],
    ["Новых слов", d.fresh],
    ["Верных", d.correct],
    ["Боёв", d.battles],
    ["Ошибок", d.mistakes],
  ]
    .map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`)
    .join("");
}
$("btn-lim-save").onclick = () => {
  settings.lim = {};
  LIM_KEYS.forEach(([k]) => (settings.lim[k] = Math.max(0, Math.min(2000, parseInt($("lim-" + k).value, 10) || 0))));
  saveSettings();
  renderLimits();
  $("lim-msg").className = "msg okm";
  $("lim-msg").textContent = "Лимиты сохранены.";
};
$("btn-lim-reset").onclick = () => {
  P.day = null;
  ensureDay();
  renderLimits();
  $("lim-msg").className = "msg okm";
  $("lim-msg").textContent = "Счётчики обнулены, можно играть дальше.";
};
$("btn-reset").onclick = () => {
  if (!resetArm) {
    resetArm = true;
    $("btn-reset").textContent = "Точно стереть? Нажмите ещё раз";
    clearTimeout(resetT);
    resetT = setTimeout(() => {
      resetArm = false;
      $("btn-reset").textContent = "Стереть статистику";
    }, 3000);
    return;
  }
  setStats({});
  LS.set("sb_stats", stats);
  renderTeacher();
};
$("btn-reset-hero").onclick = () => {
  if (!heroArm) {
    heroArm = true;
    $("btn-reset-hero").textContent = "Точно? Уровень, монеты и предметы обнулятся";
    clearTimeout(heroT);
    heroT = setTimeout(() => {
      heroArm = false;
      $("btn-reset-hero").textContent = "Начать бойца заново";
    }, 3000);
    return;
  }
  resetProfile();
  save();
  renderTeacher();
  askName();
};
const pinHash = (v) => String(hash("sb-pin:" + v));
const getPin = () => LS.get("sb_pin", "");
function openTeacher() {
  if (getPin()) {
    $("pin-in").value = "";
    $("pin-msg").textContent = "";
    show("s-pin");
    setTimeout(() => {
      try {
        $("pin-in").focus();
      } catch (e) {}
    }, 50);
  } else {
    renderTeacher();
    show("s-teacher");
  }
}
let pinFails = 0,
  pinLockUntil = 0;
$("pin-form").onsubmit = (ev) => {
  ev.preventDefault();
  if (Date.now() < pinLockUntil) {
    $("pin-msg").textContent = "Слишком много попыток. Подождите минуту.";
    return;
  }
  if (pinHash($("pin-in").value.trim()) === getPin()) {
    pinFails = 0;
    renderTeacher();
    show("s-teacher");
    return;
  }
  pinFails++;
  $("pin-in").value = "";
  if (pinFails >= 5) {
    pinLockUntil = Date.now() + 60000;
    pinFails = 0;
    $("pin-msg").textContent = "Неверно. Вход закрыт на минуту.";
  } else $("pin-msg").textContent = "Неверный PIN-код.";
};
$("btn-pin-back").onclick = home;
$("btn-pin-set").onclick = () => {
  const v = $("pin-new").value.trim(),
    m = $("pin-set-msg");
  if (!/^\d{4,8}$/.test(v)) {
    m.className = "msg err";
    m.textContent = "PIN: от 4 до 8 цифр.";
    return;
  }
  LS.set("sb_pin", pinHash(v));
  $("pin-new").value = "";
  renderTeacher();
  $("pin-set-msg").className = "msg okm";
  $("pin-set-msg").textContent = "PIN поставлен. Запомните его!";
};
$("btn-pin-off").onclick = () => {
  LS.set("sb_pin", "");
  renderTeacher();
  $("pin-set-msg").className = "msg okm";
  $("pin-set-msg").textContent = "PIN убран.";
};
$("btn-teacher-1").onclick = openTeacher;
document.querySelectorAll('input[name="words"]').forEach(
  (r) =>
    (r.onchange = () => {
      settings.words = r.value;
      saveSettings();
      syncDiff();
      if (r.value === "custom" && !customPool().length) {
        $("save-msg").className = "msg err";
        $("save-msg").textContent = "Сначала добавьте свои слова, пока будут стандартные.";
      }
    }),
);
$("opt-timer").onchange = (e) => {
  settings.timer = e.target.checked;
  saveSettings();
};
$("btn-gift").onclick = () => {
  const n = Math.max(1, Math.min(1000000, parseInt($("gift-n").value, 10) || 0));
  P.coins += n;
  save();
  $("gift-msg").className = "msg okm";
  $("gift-msg").textContent = `Выдано ${n} монет`;
  toast(`Учитель наградил тебя: +${n} монет!`, "quest");
  sfx.coin();
  renderTeacher();
  $("gift-msg").className = "msg okm";
  $("gift-msg").textContent = `Выдано ${n} монет`;
};
$("btn-save-words").onclick = () => {
  const lines = $("custom")
    .value.split(/\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
  const bad = lines.filter((l) => !parseEntry(l));
  setCustomRaw($("custom").value);
  LS.set("sb_custom", customRaw);
  const n = lines.length - bad.length,
    msg = $("save-msg");
  if (bad.length) {
    msg.className = "msg err";
    msg.textContent = `Сохранено слов: ${n}. Не понял: ${bad.slice(0, 4).join(", ")}${bad.length > 4 ? "…" : ""}. Нужны скобки, например м(о)локо.`;
  } else {
    msg.className = "msg okm";
    msg.textContent = `Сохранено слов: ${n}`;
  }
};
$("btn-rename").onclick = () => {
  const v = cleanName($("rename-in").value);
  if (!v) {
    $("rename-msg").className = "msg err";
    $("rename-msg").textContent = "Имя пустое.";
    return;
  }
  P.name = v;
  save();
  $("rename-msg").className = "msg okm";
  $("rename-msg").textContent = "Имя сохранено.";
};
