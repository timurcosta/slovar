"use strict";
// Раздел учителя: статистика, лимиты на день.

let resetArm = false, resetT = 0, heroArm = false, heroT = 0;
let teacherTab = "pupil";
function showTeacherTab(t){
  teacherTab = t;
  document.querySelectorAll("#ttabs .tab").forEach(b => b.setAttribute("aria-selected", b.dataset.tt === t));
  document.querySelectorAll("#s-teacher [data-tp]").forEach(p => p.hidden = p.dataset.tp !== t);
}
document.querySelectorAll("#ttabs .tab").forEach(b => b.onclick = () => showTeacherTab(b.dataset.tt));
function renderTeacher(){
  showTeacherTab(teacherTab); renderLimits();
  const ln = learnedCount();
  $("learned-note").innerHTML = `Выучено <b>${ln}</b> из ${PAB.length} словарных слов (слово считается выученным после ${LEARN_N} верных ответов). Встречалось: ${Object.keys(stats).length}. Сегодня новых слов: ${(ensureDay(), P.day.fresh)}.`;
  $("rename-in").value = P.name || ""; $("rename-msg").textContent = "";
  $("pin-note").textContent = getPin() ? "PIN-код стоит. Ученик не сможет открыть этот раздел." : "PIN-код не поставлен: раздел может открыть кто угодно.";
  $("pin-set-msg").textContent = ""; $("btn-pin-off").disabled = !getPin();
  document.querySelectorAll('input[name="words"]').forEach(r => r.checked = r.value === settings.words);
  $("opt-timer").checked = settings.timer;
  $("custom").value = customRaw;
  $("save-msg").textContent = ""; $("save-msg").className = "msg"; $("gift-msg").textContent = "";
  const rows = Object.entries(stats).filter(([,s]) => s.wrong > 0).sort((a,b) => b[1].wrong - a[1].wrong || a[0].localeCompare(b[0], "ru"));
  $("stats-wrap").innerHTML = rows.length
    ? `<table><thead><tr><th>Слово</th><th style="text-align:right">Ошибок</th><th style="text-align:right">Верно</th></tr></thead><tbody>${rows.map(([w,s]) => `<tr><td>${esc(w)}</td><td class="n bad">${s.wrong}</td><td class="n">${s.right}</td></tr>`).join("")}</tbody></table>`
    : `<p class="note">Пока ошибок нет. Здесь появятся слова, в которых ученик ошибается, по всем играм на этом устройстве.</p>`;
  const l = levelOf(P.xp);
  $("prog-note").textContent = `Уровень ${l} (${TITLES[l-1]}), монет ${P.coins}, верных ответов ${P.tot.correct}, боссов кампании ${P.beaten.length} из ${BOSSES.length}, рекорд башни ${P.towerBest}, дней подряд ${P.days.streak}.`;
  resetArm = false; $("btn-reset").textContent = "Стереть статистику";
  heroArm = false; $("btn-reset-hero").textContent = "Начать бойца заново";
}
const saveSettings = () => LS.set("sb_settings", settings);
const plural = (n, f) => { const a = Math.abs(n) % 100, b = a % 10; return f[a > 10 && a < 20 ? 2 : b === 1 ? 0 : b >= 2 && b <= 4 ? 1 : 2]; };
const LIM_KEYS = [["min",["минута игры","минуты игры","минут игры"]],["fresh",["новое слово","новых слова","новых слов"]],["correct",["верный ответ","верных ответа","верных ответов"]],["battles",["бой","боя","боёв"]],["mistakes",["ошибка","ошибки","ошибок"]]];
function ensureDay(){
  const d = today();
  if (!P.day || P.day.date !== d){ P.day = {date:d, sec:0, fresh:0, correct:0, battles:0, mistakes:0}; save(); }
  return P.day;
}
const lims = () => Object.assign({min:0, fresh:0, correct:0, battles:0, mistakes:0}, settings.lim || {});
const dayVal = k => { const d = ensureDay(); return k === "min" ? Math.floor(d.sec / 60) : d[k]; };
function limitReason(){
  const L = lims();
  for (const [k, n] of LIM_KEYS) if (L[k] > 0 && (k === "min" ? ensureDay().sec >= L.min * 60 : dayVal(k) >= L[k])) return `${L[k]} ${plural(L[k], n)}`;
  return null;
}
function todayHTML(){
  const L = lims(), act = LIM_KEYS.filter(([k]) => L[k] > 0);
  if (!act.length) return "";
  const parts = act.map(([k, n]) => `${Math.min(dayVal(k), L[k])} / ${L[k]} ${plural(L[k], n)}`);
  const hit = limitReason();
  return `<div class="todaybar${hit ? " hit" : ""}"><b>${hit ? "На сегодня всё! Возвращайся завтра" : "Сегодня"}</b><span>${parts.join(" · ")}</span></div>`;
}
function renderLimits(){
  const L = lims(); LIM_KEYS.forEach(([k]) => $("lim-" + k).value = L[k] || 0);
  const d = ensureDay();
  $("today-stats").innerHTML = [["Минут", Math.floor(d.sec / 60)], ["Новых слов", d.fresh], ["Верных", d.correct], ["Боёв", d.battles], ["Ошибок", d.mistakes]].map(([k,v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join("");
}
$("btn-lim-save").onclick = () => {
  settings.lim = {}; LIM_KEYS.forEach(([k]) => settings.lim[k] = Math.max(0, Math.min(2000, parseInt($("lim-" + k).value, 10) || 0)));
  saveSettings(); renderLimits(); $("lim-msg").className = "msg okm"; $("lim-msg").textContent = "Лимиты сохранены.";
};
$("btn-lim-reset").onclick = () => { P.day = null; ensureDay(); renderLimits(); $("lim-msg").className = "msg okm"; $("lim-msg").textContent = "Счётчики обнулены, можно играть дальше."; };
function blockedToday(){
  const r = limitReason(); if (!r) return false;
  toast(`На сегодня всё: лимит ${r}. Монеты и опыт сохранились, возвращайся завтра!`, "quest"); renderHome(); return true;
}
function limitStop(r){
  stopGame(false);
  const ov = $("boss-over"); ov.hidden = false; $("opts").hidden = true; $("typer").hidden = true;
  ov.innerHTML = `<div class="victory"><b>НА СЕГОДНЯ ВСЁ!</b><span>${P.name ? esc(P.name) + ", ты" : "Ты"} отлично поработал</span></div>
    <p>Лимит на сегодня: <b>${esc(r)}</b>. Монеты, опыт и вещи сохранились.</p><p class="note">Завтра бои снова откроются. Отдыхай, герой!</p>
    <button class="btn primary" id="btn-lim-home">На главную</button>`;
  $("btn-lim-home").onclick = home; sfx.level();
}
setInterval(() => {   // play time: only while actually fighting
  if (!G || $("s-game").hidden || document.hidden || !$("boss-over").hidden) return;
  const d = ensureDay(); d.sec++; if (d.sec % 10 === 0) save();
}, 1000);
