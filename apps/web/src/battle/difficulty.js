// Сложность: множители наград и усиление боссов по выбранным словам.
import { $ } from "../lib/dom.js";
import { shuffle } from "../lib/random.js";
import { settings } from "../state/settings.js";

const DIFF_MUL = { ab: 1.5, b: 2 };
const DIFF_BOSS = { ab: { hp: 1.3, time: 0.8, extra: 1 }, b: { hp: 1.7, time: 0.62, extra: 2 } };
const EXTRA_AB = [
  "haste",
  "swap",
  "shake",
  "ink",
  "tiny",
  "freeze",
  "fog",
  "rush",
  "flip",
  "mirror",
  "web",
  "dark",
  "double",
  "armor",
  "regen",
  "glitch",
  "cloud",
  "lens",
];
export function applyDiff(b) {
  const d = DIFF_BOSS[settings.words];
  if (!d || b.training) return b;
  const ab = b.ab.filter((a) => a !== "enrage");
  shuffle(EXTRA_AB.filter((a) => !ab.includes(a)))
    .slice(0, d.extra)
    .forEach((a) => ab.push(a));
  ab.push("enrage");
  return {
    ...b,
    ab,
    hp: Math.round((b.hp * d.hp) / 10) * 10,
    time: Math.max(4, b.time * d.time),
    diff: settings.words,
  };
}
export const diffMul = () => DIFF_MUL[settings.words] || 1;
export const DIFF_NAME = {
  auto: "по боссам",
  a: "лёгкие (1–2 класс)",
  ab: "все вперемешку",
  b: "сложные (3–4 класс)",
  custom: "слова учителя",
};
export function syncDiff() {
  const cust = settings.words === "custom";
  $("diff-modes").hidden = cust;
  $("diff-custom").hidden = !cust;
  document.querySelectorAll('input[name="diff"]').forEach((r) => (r.checked = r.value === settings.words));
}
