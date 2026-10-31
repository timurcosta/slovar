// Статистика по словам: {слово: {right, wrong, last, streak, typed, lastWrong}} (WordStat в packages/shared).
import { save } from "./profile.ts";
import { LS } from "./storage.ts";
import { ensureDay } from "../progress/limits.js";
import type { WordStats } from "./types.ts";
import { LEARN_N, isLearned, recordAnswer } from "../content/rules.ts";

export { LEARN_N };

export let stats: WordStats = LS.get<WordStats>("sb_stats", {});
export function setStats(v: WordStats) {
  stats = v;
}
export const learnedCount = () => Object.values(stats).filter(isLearned).length;
/**
 * Ответ на слово: key — верно или нет, typed — слово вписано целиком (режим «Пишу сам»).
 * Возвращает true, если слово стало выученным на этом ответе (для журнала боя).
 */
export function stat(word: string, key: "right" | "wrong", typed = false, now = Date.now()): boolean {
  const s = stats[word] || (stats[word] = { wrong: 0, right: 0 }),
    d = ensureDay();
  if (key === "right") {
    if (!s.right) d.fresh++;
    d.correct++;
  } else d.mistakes++;
  const was = isLearned(s);
  recordAnswer(s, key === "right", typed, now);
  LS.set("sb_stats", stats);
  save();
  return !was && isLearned(s);
}
