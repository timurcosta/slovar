// Расчёты для кабинета по словам ученика: «Трудные», «Забывает», «Не видел ни разу», «Слова на занятие»
// и недельный отчёт в списке учеников. Чистые функции без DOM и localStorage (тесты — test/report.test.ts).
import type { BattleLog, DayLog, TutorSettings, WordStat, WordStats } from "@repetitor/shared";
import { LEARN_N, isLearned } from "../content/rules.ts";
import { W12, W34 } from "../topics/words/lists.js";
import { parseEntry, parseList, splitEntries, type WordEntry } from "../topics/words/parse.ts";
import { summary } from "../progress/history.ts";
import { addDays } from "../lib/date.js";

export const PA = parseList(W12),
  PB = parseList(W34);
export const DICT = PA.concat(PB);

const DAY_MS = 86400000;
/** Сколько слов «Слова на занятие» собирают для диктанта. */
export const LESSON_N = 10;
/** «Слова на занятие»: ошибки за столько последних дней. */
export const LESSON_DAYS = 7;

/** Все слова с ошибками: больше ошибок — выше, при равенстве по алфавиту. */
export const hardWords = (s: { stats?: WordStats | null }): [string, WordStat][] =>
  Object.entries(s.stats || ({} as WordStats))
    .filter(([, w]) => w.wrong > 0)
    .sort((a, b) => b[1].wrong - a[1].wrong || a[0].localeCompare(b[0], "ru"));

/** Свои слова репетитора (по одному на слово, с подсказками). */
export const customEntries = (custom = ""): WordEntry[] => uniq(splitEntries(custom).map(parseEntry));

function uniq(es: (WordEntry | null)[]): WordEntry[] {
  const seen = new Set<string>(),
    out: WordEntry[] = [];
  for (const e of es)
    if (e && !seen.has(e.word)) {
      seen.add(e.word);
      out.push(e);
    }
  return out;
}

/**
 * Слово из статистики («берёза») → запись в формате заданий («б(е)рёза»): ищем в своих словах
 * ученика (с подсказкой, если она есть), потом в словаре. null — если слово не нашлось.
 */
export function rawOf(word: string, custom = ""): string | null {
  return entryOf(word, custom)?.raw ?? null;
}
export const entryOf = (word: string, custom = ""): WordEntry | null =>
  customEntries(custom).find((e) => e.word === word) ?? DICT.find((e) => e.word === word) ?? null;

/**
 * Когда слово «забылось»: было выучено (LEARN_N верных подряд), а потом дало ошибку. Слово → время
 * последней такой ошибки, мс. Два источника, оба без ложных срабатываний:
 *
 * 1. Журнал боёв (`hist`): слово стало выученным в бою (`BattleLog.l`), а в одном из следующих боёв на нём
 *    ошибка. Если в том же бою последний ответ на слово — ошибка, оно забылось прямо в этом бою (выученным
 *    оно стало раньше, на верном ответе). Время — начало боя с ошибкой.
 * 2. Статистика слова: до последней ошибки было r = right − streak верных ответов и e = wrong − 1 других
 *    ошибок. Если r ≥ (e + 1)·(LEARN_N − 1) + 1, то среди этих верных точно была серия из LEARN_N подряд
 *    (e ошибок делят верные на e + 1 серий). Время — lastWrong. Нужна серия `streak` (у записей
 *    старых сохранений её нет, пока ученик не ответит на слово).
 *
 * Журнал хранит последние 60 боёв, а статистика не знает порядка ответов, поэтому часть забытых слов
 * сюда не попадёт: лучше пропустить, чем зря назвать слово забытым.
 */
export function forgetTimes(stats: WordStats | null | undefined, hist: BattleLog[] | undefined): Map<string, number> {
  const out = new Map<string, number>();
  const mark = (w: string, t: number) => out.set(w, Math.max(out.get(w) ?? 0, t));
  const learned = new Set<string>();
  for (const e of (hist || []).slice().sort((a, b) => a.t - b.t)) {
    const lastOf = new Map<string, number>();
    for (const [w, v] of e.a) {
      if (!v && learned.has(w)) {
        mark(w, e.t);
        learned.delete(w);
      }
      lastOf.set(w, v);
    }
    for (const w of e.l || []) {
      if (lastOf.get(w) === 0) mark(w, e.t);
      else learned.add(w);
    }
  }
  for (const [w, s] of Object.entries(stats || {})) {
    if (typeof s.streak !== "number" || !s.wrong || !s.lastWrong) continue;
    const r = (s.right || 0) - s.streak,
      e = s.wrong - 1;
    if (r >= (e + 1) * (LEARN_N - 1) + 1) mark(w, s.lastWrong);
  }
  return out;
}

/**
 * «Забывает»: слова, которые были выучены и потом дали ошибку (forgetTimes), и сейчас не выучены
 * (серия ещё не набралась заново). Недавно забытые выше.
 */
export function forgetting(s: { stats?: WordStats | null; profile?: { hist?: BattleLog[] } | null }) {
  const stats = s.stats || {},
    at = forgetTimes(stats, s.profile?.hist);
  return [...at]
    .filter(([w]) => stats[w] && !isLearned(stats[w]))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"))
    .map(([w, t]) => ({ word: w, stat: stats[w], at: t }));
}

/**
 * Набор слов ученика по настройкам репетитора: «a» — 1–2 класс, «b» — 3–4, «ab» — весь словарь,
 * «custom» — свои слова (если они есть, иначе как в игре — словарь). «auto» и «как выберет ученик» —
 * весь словарь: в кампании ученик дойдёт до всех слов, а свой выбор ученика кабинет не видит.
 */
export function wordSet(set: TutorSettings | undefined): { name: string; list: WordEntry[] } {
  const w = set?.words || "";
  if (w === "custom") {
    const c = customEntries(set?.customWords);
    if (c.length) return { name: "свои слова", list: c };
  }
  if (w === "a") return { name: "1–2 класс", list: uniq(PA) };
  if (w === "b") return { name: "3–4 класс", list: uniq(PB) };
  return { name: "весь словарь", list: uniq(DICT) };
}

/** «Не видел ни разу»: слова набора ученика, которых нет в его статистике (по порядку набора). */
export function unseenWords(s: { settings?: TutorSettings; stats?: WordStats | null }) {
  const ws = wordSet(s.settings),
    stats = s.stats || {};
  return { name: ws.name, total: ws.list.length, list: ws.list.filter((e) => !stats[e.word]) };
}

/** Ошибки по словам в боях журнала, начатых не раньше since (мс): слово → [ошибок, время последней]. */
export function recentMisses(hist: BattleLog[] | undefined, since: number): Map<string, [number, number]> {
  const m = new Map<string, [number, number]>();
  for (const e of hist || [])
    if (e.t >= since)
      for (const [w, v] of e.a)
        if (!v) {
          const x = m.get(w) || [0, 0];
          m.set(w, [x[0] + 1, Math.max(x[1], e.t)]);
        }
  return m;
}

export interface LessonWord {
  word: string;
  entry: WordEntry;
  /** Откуда слово: ошибки за неделю, «Забывает», «Трудные». */
  why: "week" | "forget" | "hard";
  /** Ошибок за последние LESSON_DAYS дней. */
  misses: number;
}

/**
 * «Слова на занятие» — до n слов для диктанта: сначала слова с ошибками за последние LESSON_DAYS дней
 * (по журналу боёв; больше ошибок — выше, при равенстве недавние), потом «Забывает», потом «Трудные».
 * Без повторов; слова, которых нет ни в своих словах, ни в словаре (не из чего сделать пропуск), пропускаются.
 */
export function lessonWords(
  s: { stats?: WordStats | null; profile?: { hist?: BattleLog[] } | null; settings?: TutorSettings },
  now: number,
  n = LESSON_N,
): LessonWord[] {
  const custom = s.settings?.customWords,
    week = recentMisses(s.profile?.hist, now - LESSON_DAYS * DAY_MS);
  const cand: [string, LessonWord["why"]][] = [
    ...[...week]
      .sort((a, b) => b[1][0] - a[1][0] || b[1][1] - a[1][1] || a[0].localeCompare(b[0], "ru"))
      .map(([w]): [string, "week"] => [w, "week"]),
    ...forgetting(s).map(({ word }): [string, "forget"] => [word, "forget"]),
    ...hardWords(s).map(([w]): [string, "hard"] => [w, "hard"]),
  ];
  const out: LessonWord[] = [];
  for (const [word, why] of cand) {
    if (out.length >= n) break;
    if (out.some((x) => x.word === word)) continue;
    const entry = entryOf(word, custom);
    if (entry) out.push({ word, entry, why, misses: week.get(word)?.[0] ?? 0 });
  }
  return out;
}

/** Слово с пропусками на месте трудных букв: м(о)локо → «м_локо», в(о/а)р(о/а)бей → «в_р_бей». */
export const gapped = (e: WordEntry) =>
  e.segs.map((sg, i) => ("t" in sg ? sg.t : e.slots.includes(i) ? "_" : sg.c)).join("");

/** Текст для копирования: слова с пропусками и отдельно ответы (с подсказками репетитора). */
export function lessonText(name: string, ws: LessonWord[]): string {
  return [
    `Слова на занятие${name ? ` (${name})` : ""}`,
    ...ws.map((x, i) => `${i + 1}. ${gapped(x.entry)}`),
    "",
    "Ответы",
    ...ws.map((x, i) => `${i + 1}. ${x.word}${x.entry.hint ? ` — ${x.entry.hint}` : ""}`),
  ].join("\n");
}

export interface WeekReport {
  /** Дней, когда играл (из последних 7, включая сегодня). */
  days: number;
  min: number;
  /** Доля вписанных целиком среди верных ответов, %; null — верных не было. */
  typedPct: number | null;
  /** Слов стало выученными. */
  learned: number;
  /** Слов забыто (forgetTimes: ошибка после «выучено» за эти 7 дней). */
  forgot: number;
}

/**
 * Неделя ученика для списка: 7 дней по today включительно. Дни, минуты, выучено — итоги дней (dlog);
 * доля ввода — верно вписанные (DayLog.t) от верных ответов (DayLog.r): ошибки при вводе итоги не различают;
 * забыто — по forgetTimes с ошибкой не раньше начала первого из 7 дней.
 */
export function weekReport(
  p: { dlog?: Record<string, DayLog>; hist?: BattleLog[] } | null | undefined,
  stats: WordStats | null | undefined,
  today: string,
): WeekReport {
  const w = summary(p?.dlog, today),
    [y, m, d] = addDays(today, -6).split("-").map(Number),
    since = new Date(y, m - 1, d).getTime();
  let forgot = 0;
  for (const t of forgetTimes(stats, p?.hist).values()) if (t >= since) forgot++;
  return {
    days: w.days,
    min: Math.round(w.sec / 60),
    typedPct: w.r ? Math.round((100 * w.t) / w.r) : null,
    learned: w.l,
    forgot,
  };
}

/** Ячейка списка: «4 дн · 34 мин · ввод 30%» и мелко «выучено 5 · забыто 2». */
export function weekCell(r: WeekReport): { main: string; sub: string } {
  if (!r.days && !r.forgot) return { main: "не играл(а)", sub: "" };
  const main = [`${r.days} дн`, `${r.min} мин`, ...(r.typedPct === null ? [] : [`ввод ${r.typedPct}%`])].join(" · ");
  const sub = [r.learned ? `выучено ${r.learned}` : "", r.forgot ? `забыто ${r.forgot}` : ""].filter(Boolean);
  return { main, sub: sub.join(" · ") };
}
