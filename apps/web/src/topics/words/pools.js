// Наборы слов для боя: по классам, слова учителя, работа над ошибками, новые слова.
import { W12, W34 } from "./lists.js";
import { parseEntry, parseList } from "./parse.js";
import { stats } from "../../state/stats.js";
import { LS } from "../../state/storage.js";
import { settings } from "../../state/settings.js";
import { G } from "../../battle/run.js";

export const PA = parseList(W12),
  PB = parseList(W34),
  PAB = PA.concat(PB);
export let customRaw = LS.get("sb_custom", "");
export function setCustomRaw(v) {
  customRaw = v;
}
export const customPool = () => customRaw.split(/\n|,/).map(parseEntry).filter(Boolean);
export function poolFor(b) {
  if (b.pool === "train" && G && G.trainPool) return G.trainPool;
  if (settings.words === "custom") {
    const c = customPool();
    if (c.length) return c;
  }
  if (settings.words === "a") return PA;
  if (settings.words === "b") return PB;
  if (settings.words === "ab") return PAB;
  return b.pool === "a" ? PA : b.pool === "b" ? PB : PAB;
}
// words the pupil got wrong most (weighted: mistakes count more than later correct answers)
export function errWords() {
  const all = PAB.concat(settings.words === "custom" ? customPool() : []);
  const byWord = new Map(all.map((e) => [e.word, e]));
  return Object.entries(stats)
    .filter(([w, s]) => s.wrong > 0 && byWord.has(w) && s.wrong * 2 > s.right)
    .sort((a, b) => b[1].wrong * 2 - b[1].right - (a[1].wrong * 2 - a[1].right))
    .slice(0, 25)
    .map(([w]) => byWord.get(w));
}
export function newWords() {
  const base =
    settings.words === "custom" && customPool().length
      ? customPool()
      : settings.words === "a"
        ? PA
        : settings.words === "b"
          ? PB
          : PAB;
  return base.filter((e) => !stats[e.word]);
}
