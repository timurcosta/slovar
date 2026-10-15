// Статистика по словам: {слово: {right, wrong}}.
import { save } from "./profile.js";
import { LS } from "./storage.js";
import { ensureDay } from "../progress/limits.js";

export let stats = LS.get("sb_stats", {});
export function setStats(v) {
  stats = v;
}
export const LEARN_N = 3; // a word is "learned" after this many correct answers
export const learnedCount = () => Object.values(stats).filter((s) => s.right >= LEARN_N).length;
export function stat(word, key) {
  const s = stats[word] || (stats[word] = { wrong: 0, right: 0 }),
    d = ensureDay();
  if (key === "right") {
    if (!s.right) d.fresh++;
    d.correct++;
  } else d.mistakes++;
  s[key]++;
  LS.set("sb_stats", stats);
  save();
}
