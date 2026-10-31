// Наборы слов для боя: по классам, слова учителя, работа над ошибками, новые слова.
import { W12, W34 } from "./lists.js";
import { parseEntry, parseList } from "./parse.ts";
import { errorWords } from "./schedule.ts";
import { stats } from "../../state/stats.ts";
import { LS } from "../../state/storage.ts";
import { settings } from "../../state/settings.ts";
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
// работа над ошибками: недавние и частые ошибки (errorWords в schedule.ts)
export function errWords() {
  return errorWords(PAB.concat(settings.words === "custom" ? customPool() : []), stats, Date.now());
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
