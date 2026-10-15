// Статистика по словам: {слово: {right, wrong}}.
import { save } from "./profile.ts";
import { LS } from "./storage.ts";
import { ensureDay } from "../progress/limits.js";
import type { WordStats } from "./types.ts";
import { LEARN_N } from "../content/rules.ts";

export { LEARN_N };

export let stats: WordStats = LS.get<WordStats>("sb_stats", {});
export function setStats(v: WordStats) {
  stats = v;
}
export const learnedCount = () => Object.values(stats).filter((s) => s.right >= LEARN_N).length;
export function stat(word: string, key: "right" | "wrong") {
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
