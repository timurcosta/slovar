// Расчёты для кабинета по словам ученика: «Трудные», «Забывает», «Не видел ни разу», «Слова на занятие»
// и недельный отчёт в списке учеников. Чистые функции без DOM и localStorage (тесты — test/report.test.ts).
import type { BattleLog, DayLog, Task, TaskProgress, TutorSettings, WordStat, WordStats } from "@repetitor/shared";
import { LEARN_N, isLearned } from "../content/rules.ts";
import { W12, W34 } from "../topics/words/lists.js";
import { parseEntry, parseList, splitEntries, type WordEntry } from "../topics/words/parse.ts";
import { summary } from "../progress/history.ts";
import { monsters, taskState } from "../progress/taskrules.ts";
import { addDays } from "../lib/date.js";
import { plural } from "../lib/text.js";

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

/** «Трудные» сейчас: с ошибками и ещё не выучены (серия LEARN_N верных подряд не набрана). */
export const hardNow = (s: { stats?: WordStats | null }) => hardWords(s).filter(([, w]) => !isLearned(w));
/** Были трудными: ошибки были, но слово уже выучено. */
export const hardPast = (s: { stats?: WordStats | null }) => hardWords(s).filter(([, w]) => isLearned(w));

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
 * (по журналу боёв; больше ошибок — выше, при равенстве недавние), потом «Забывает», потом «Трудные»
 * (только те, что ещё не выучены: выученное диктовать незачем).
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
    ...hardNow(s).map(([w]): [string, "hard"] => [w, "hard"]),
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
  if (!r.days && !r.forgot) return { main: "игры не было", sub: "" };
  const main = [`${r.days} дн`, `${r.min} мин`, ...(r.typedPct === null ? [] : [`ввод ${r.typedPct}%`])].join(" · ");
  const sub = [r.learned ? `выучено ${r.learned}` : "", r.forgot ? `забыто ${r.forgot}` : ""].filter(Boolean);
  return { main, sub: sub.join(" · ") };
}

// ---------- на кого посмотреть: пометки в списке учеников ----------

/** Пометка у ученика в списке. bad и warn — нужно внимание, soft — к сведению, good — есть за что похвалить. */
export interface Flag {
  text: string;
  level: "bad" | "warn" | "soft" | "good";
}
/** Столько дней без игры — жёлтая пометка, столько — красная. */
export const IDLE_WARN = 3,
  IDLE_BAD = 7;
/** Сколько дней помнить про сделанное или просроченное задание. */
const TASK_FRESH = 7;
/** Открытое задание без единого ответа столько дней — пометка «не начато». */
const TASK_IDLE = 2;

const localDay = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const daysBetween = (from: string, to: string) => {
  const t = (k: string) => {
    const [y, m, d] = k.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((t(to) - t(from)) / DAY_MS);
};

interface Watched {
  profile?: {
    dlog?: Record<string, DayLog>;
    hist?: BattleLog[];
    tasks?: Record<string, TaskProgress>;
  } | null;
  stats?: WordStats | null;
  tasks?: Task[];
  lastSeenAt?: string | null;
}

/** Сколько дней назад ученик заходил в игру (по последней синхронизации); null — ни разу. */
export function idleDays(s: Pick<Watched, "lastSeenAt">, today: string): number | null {
  if (!s.lastSeenAt) return null;
  return Math.max(0, daysBetween(localDay(new Date(s.lastSeenAt).getTime()), today));
}

/**
 * Пометки ученика для списка: давно не было игры, задание не начато или не сделано в срок, забывает слова;
 * из хорошего — задание сделано на днях. Порядок: сначала самое важное.
 */
export function attention(s: Watched, today: string): Flag[] {
  if (!s.profile) return [{ text: "входа по коду ещё не было", level: "soft" }];
  const out: Flag[] = [];
  const idle = idleDays(s, today);
  if (idle !== null && idle >= IDLE_WARN)
    out.push({
      text: `${idle} ${plural(idle, ["день", "дня", "дней"])} без игры`,
      level: idle >= IDLE_BAD ? "bad" : "warn",
    });
  let late = 0,
    idleTask = 0,
    done = 0;
  for (const t of s.tasks || []) {
    const p = s.profile.tasks?.[t.id],
      st = taskState(t, p, today);
    if (st === "expired" && t.until && daysBetween(t.until, today) <= TASK_FRESH) late++;
    else if (st === "done" && p?.done && daysBetween(p.done, today) <= TASK_FRESH) done++;
    else if (st === "open" && t.words.length && !p?.right && !Object.keys(p?.wrong || {}).length) {
      const since = t.from || localDay(new Date(t.createdAt).getTime());
      if (daysBetween(since, today) >= TASK_IDLE) idleTask++;
    }
  }
  if (late) out.push({ text: "задание не сделано в срок", level: "warn" });
  if (idleTask) out.push({ text: "задание не начато", level: "warn" });
  const forget = forgetting(s).length;
  if (forget) out.push({ text: `забывает ${forget} ${plural(forget, ["слово", "слова", "слов"])}`, level: "warn" });
  if (done) out.push({ text: "задание сделано", level: "good" });
  return out;
}

/** Насколько ученику нужно внимание: больше — выше в списке. */
export const attentionScore = (flags: Flag[]) =>
  flags.reduce((n, f) => n + (f.level === "bad" ? 4 : f.level === "warn" ? 2 : f.level === "soft" ? 1 : 0), 0);

// ---------- отчёт родителям ----------

/** Слова, ставшие выученными в боях журнала не раньше since (мс), без повторов, по порядку. */
export function learnedSince(hist: BattleLog[] | undefined, since: number): string[] {
  const out: string[] = [];
  for (const e of (hist || []).slice().sort((a, b) => a.t - b.t))
    if (e.t >= since) for (const w of e.l || []) if (!out.includes(w)) out.push(w);
  return out;
}

const listed = (ws: string[], n: number) => ws.slice(0, n).join(", ") + (ws.length > n ? " и другие" : "");

/**
 * Сообщение родителям за 7 дней — готовый текст для мессенджера: сколько дней и минут была игра,
 * что выучено, над чем работаем, как дела с заданиями. Без оценок и без пола ученика.
 */
export function parentReport(
  s: Watched & { name: string; settings?: TutorSettings },
  today: string,
  now: number,
): string {
  const head = `${s.name}: неделя в игре «Охотники за ошибками»`;
  if (!s.profile) return [head, "Входа в игру по коду пока не было."].join("\n");
  const w = summary(s.profile.dlog, today),
    since = now - 7 * DAY_MS,
    lines = [head];
  if (!w.days) lines.push("На этой неделе игры не было. Хорошо бы заходить каждый день хотя бы на 10 минут.");
  else {
    const min = Math.max(1, Math.round(w.sec / 60));
    lines.push(
      `Дней с игрой: ${w.days} из 7, всего ${min} ${plural(min, ["минута", "минуты", "минут"])}.`,
      `Верных ответов: ${w.r}, ошибок: ${w.x}.`,
    );
    const learned = learnedSince(s.profile.hist, since);
    if (w.l) lines.push(`Выучено слов: ${w.l}${learned.length ? ` (${listed(learned, 8)})` : ""}.`);
  }
  const work = lessonWords(s, now, 6).map((x) => x.word);
  if (work.length) lines.push(`Над чем работаем: ${work.join(", ")}.`);
  for (const t of s.tasks || []) {
    const p = s.profile.tasks?.[t.id],
      st = taskState(t, p, today);
    if (st === "planned" || !t.words.length) continue;
    if (st === "done") {
      if (p?.done && daysBetween(p.done, today) <= TASK_FRESH) lines.push(`Задание «${t.title}»: сделано.`);
    } else if (st === "expired") {
      if (t.until && daysBetween(t.until, today) <= TASK_FRESH)
        lines.push(`Задание «${t.title}»: срок прошёл, не доделано.`);
    } else {
      const { beaten, total } = monsters(t, p);
      lines.push(
        `Задание «${t.title}»: ${beaten === total ? "остался последний шаг" : p?.right ? `в процессе, ${beaten} из ${total}` : "ещё не начато"}.`,
      );
    }
  }
  return lines.join("\n");
}
