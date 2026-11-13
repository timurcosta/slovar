// Разбор формата слов: б(е/и)рёза → слово, места для выбора, ловушки.
// После первой «|» — подсказка репетитора (мнемоника): м(о)локо | корова мычит: мо-о.

/** Кусок слова: обычный текст или место выбора (c — верно, w — ловушка). */
export type Seg = { t: string } | { c: string; w: string };
export interface WordEntry {
  raw: string;
  segs: Seg[];
  /** Индексы в segs, где можно спросить. */
  slots: number[];
  word: string;
  /** Подсказка репетитора (всё после первой «|»). Показывается в бою только после ошибки. */
  hint?: string;
}

const PAIRS: Record<string, string> = {
  о: "а",
  а: "о",
  е: "и",
  и: "е",
  я: "е",
  ё: "о",
  ю: "у",
  у: "ю",
  ы: "и",
  э: "е",
};
function autoWrong(c: string): string {
  if (c.length === 2 && c[0] === c[1]) return c[0];
  const low = c.toLowerCase();
  if (low !== c) return low;
  return PAIRS[c] || "";
}
/**
 * Строка → слово. raw — вся строка (с подсказкой), word — слово без скобок и подсказки: это ключ статистики.
 * null — если в слове нет места для выбора.
 */
export function parseEntry(raw: string): WordEntry | null {
  raw = raw.trim();
  if (!raw) return null;
  const bar = raw.indexOf("|"),
    body = (bar < 0 ? raw : raw.slice(0, bar)).trim(),
    hint = bar < 0 ? "" : raw.slice(bar + 1).trim();
  const segs: Seg[] = [];
  const re = /\(([^()/]+)(?:\/([^()]+))?\)/g;
  let last = 0,
    m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    if (m.index > last) segs.push({ t: body.slice(last, m.index) });
    const c = m[1].trim();
    const w = (m[2] || "").trim() || autoWrong(c);
    segs.push({ c, w });
    last = re.lastIndex;
  }
  if (last < body.length) segs.push({ t: body.slice(last) });
  const slots = segs.map((s, i) => ("c" in s && s.w && s.w !== s.c ? i : -1)).filter((i) => i >= 0);
  if (!slots.length) return null;
  const word = segs.map((s) => ("t" in s ? s.t : s.c)).join("");
  return hint ? { raw, segs, slots, word, hint } : { raw, segs, slots, word };
}
/**
 * Свои слова репетитора (или слова задания) → строки по одному слову. Слова разделяются переводом строки
 * или запятой; строка с подсказкой («|») запятой не делится: в подсказке запятая — просто запятая.
 */
export const splitEntries = (str: string) =>
  str
    .split("\n")
    .flatMap((l) => (l.includes("|") ? [l] : l.split(",")))
    .map((l) => l.trim())
    .filter(Boolean);
export const parseList = (str: string) =>
  str
    .split(",")
    .map(parseEntry)
    .filter((e): e is WordEntry => e !== null);
