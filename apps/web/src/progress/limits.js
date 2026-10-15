// Лимиты учителя на день и счётчики дня.
import { $ } from "../lib/dom.js";
import { today } from "../lib/date.js";
import { plural } from "../lib/text.js";
import { P, save } from "../state/profile.js";
import { settings } from "../state/settings.js";
import { G } from "../battle/run.js";
import { toast } from "../ui/toast.js";
import { renderHome } from "../ui/screens/home.js";

export const LIM_KEYS = [
  ["min", ["минута игры", "минуты игры", "минут игры"]],
  ["fresh", ["новое слово", "новых слова", "новых слов"]],
  ["correct", ["верный ответ", "верных ответа", "верных ответов"]],
  ["battles", ["бой", "боя", "боёв"]],
  ["mistakes", ["ошибка", "ошибки", "ошибок"]],
];
export function ensureDay() {
  const d = today();
  if (!P.day || P.day.date !== d) {
    P.day = { date: d, sec: 0, fresh: 0, correct: 0, battles: 0, mistakes: 0 };
    save();
  }
  return P.day;
}
export const lims = () => Object.assign({ min: 0, fresh: 0, correct: 0, battles: 0, mistakes: 0 }, settings.lim || {});
const dayVal = (k) => {
  const d = ensureDay();
  return k === "min" ? Math.floor(d.sec / 60) : d[k];
};
export function limitReason() {
  const L = lims();
  for (const [k, n] of LIM_KEYS)
    if (L[k] > 0 && (k === "min" ? ensureDay().sec >= L.min * 60 : dayVal(k) >= L[k]))
      return `${L[k]} ${plural(L[k], n)}`;
  return null;
}
export function todayHTML() {
  const L = lims(),
    act = LIM_KEYS.filter(([k]) => L[k] > 0);
  if (!act.length) return "";
  const parts = act.map(([k, n]) => `${Math.min(dayVal(k), L[k])} / ${L[k]} ${plural(L[k], n)}`);
  const hit = limitReason();
  return `<div class="todaybar${hit ? " hit" : ""}"><b>${hit ? "На сегодня всё! Возвращайся завтра" : "Сегодня"}</b><span>${parts.join(" · ")}</span></div>`;
}
export function blockedToday() {
  const r = limitReason();
  if (!r) return false;
  toast(`На сегодня всё: лимит ${r}. Монеты и опыт сохранились, возвращайся завтра!`, "quest");
  renderHome();
  return true;
}
setInterval(() => {
  // play time: only while actually fighting
  if (!G || $("s-game").hidden || document.hidden || !$("boss-over").hidden) return;
  const d = ensureDay();
  d.sec++;
  if (d.sec % 10 === 0) save();
}, 1000);
