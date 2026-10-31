// Интервальные повторения и порядок слов в бою. Чистые функции: статистику, время и случайность
// получают параметрами (в проверке Math.random и время зафиксированы, порядок должен повторяться).
import type { WordStat, WordStats } from "@repetitor/shared";

type Entry = { word: string };
type Random = () => number;

export const DAY = 24 * 60 * 60 * 1000;
/** Через сколько дней повторять слово при серии 1, 2, 3, 4, 5+ верных подряд. Ошибка — как серия 1. */
export const INTERVALS = [1, 3, 7, 14, 30];
/** Новых слов в начале очереди боя: от NEW_MIN до NEW_MAX (и не больше, чем разрешает лимит учителя). */
export const NEW_MIN = 3;
export const NEW_MAX = 5;
/** Столько просроченных повторений идут до новых слов; остальные повторения — после них. */
export const DUE_HEAD = 8;
/** Слово с ошибкой возвращается в том же бою через столько вопросов. */
export const RETURN_MIN = 3;
export const RETURN_MAX = 6;
/** Ошибка считается недавней (выше в работе над ошибками) столько дней. */
export const RECENT_WRONG_DAYS = 14;

export const intervalDays = (streak: number) => INTERVALS[Math.max(0, Math.min(INTERVALS.length - 1, streak - 1))];

const dayStart = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
/** Сколько календарных дней прошло от a до b (по местному времени: «завтра» начинается в полночь). */
export const daysBetween = (a: number, b: number) => Math.round((dayStart(b) - dayStart(a)) / DAY);

/**
 * На сколько дней просрочено повторение: 0 — пора сегодня, меньше нуля — ещё рано.
 * У записей старых сохранений нет времени ответа: повторение считается давно просроченным (Infinity).
 */
export function overdue(s: WordStat, now: number): number {
  if (typeof s.last !== "number") return Infinity;
  return daysBetween(s.last, now) - intervalDays(s.streak || 0);
}

/** Пора ли повторять слово. Слово без статистики новое, а не повторение. */
export const due = (s: WordStat | undefined, now: number) => !!s && overdue(s, now) >= 0;

function shuffled<T>(a: T[], random: Random): T[] {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const errScore = (s: WordStat) => s.wrong * 2 - s.right;

export interface QueueOpts {
  random: Random;
  /** Сколько новых слов ещё можно сегодня (лимит учителя); Infinity — без лимита. */
  freshLeft?: number;
}

/**
 * Очередь слов для боя:
 * 1. просроченные повторения, самые просроченные раньше (у старых записей без времени — сначала с ошибками),
 *    но не больше DUE_HEAD, чтобы большой долг не вытеснял новые слова;
 * 2. 3–5 новых слов (не больше, чем осталось по лимиту учителя);
 * 3. остальные просроченные;
 * 4. остальные знакомые слова;
 * 5. остальные новые слова — только если учитель не ограничил новые слова на день.
 * Внутри групп порядок случайный.
 */
export function buildQueue<T extends Entry>(pool: T[], stats: WordStats, now: number, opts: QueueOpts): T[] {
  const { random } = opts,
    freshLeft = opts.freshLeft ?? Infinity;
  const fresh: T[] = [],
    dueW: T[] = [],
    rest: T[] = [];
  const seen = new Set<string>();
  for (const e of pool) {
    if (seen.has(e.word)) continue;
    seen.add(e.word);
    const s = stats[e.word];
    (!s ? fresh : due(s, now) ? dueW : rest).push(e);
  }
  const od = (e: T) => overdue(stats[e.word], now);
  const dueSorted = shuffled(dueW, random).sort((a, b) => {
    const oa = od(a),
      ob = od(b);
    if (oa !== ob) return ob - oa; // Infinity − конечное = Infinity, порядок верный
    return oa === Infinity ? errScore(stats[b.word]) - errScore(stats[a.word]) : 0;
  });
  const freshMix = shuffled(fresh, random);
  const nNew = Math.max(0, Math.min(NEW_MIN + Math.floor(random() * (NEW_MAX - NEW_MIN + 1)), freshLeft));
  const q = [
    ...dueSorted.slice(0, DUE_HEAD),
    ...freshMix.slice(0, nNew),
    ...dueSorted.slice(DUE_HEAD),
    ...shuffled(rest, random),
    ...(freshLeft === Infinity ? freshMix.slice(nNew) : []),
  ];
  // все слова новые, а лимит на сегодня уже выбран: бой всё равно остановит лимит, очередь не пустая
  return q.length ? q : freshMix;
}

/**
 * Слово с ошибкой возвращается через RETURN_MIN..RETURN_MAX вопросов (один раз; ошибётся снова — вернётся снова).
 * Если очередь короче — встаёт в конец. Если слово и так попадётся раньше — очередь не меняется.
 */
export function requeueMiss<T extends Entry>(queue: T[], e: T, random: Random): T[] {
  const pos = Math.min(queue.length, RETURN_MIN + Math.floor(random() * (RETURN_MAX - RETURN_MIN + 1)));
  if (queue.slice(0, pos).some((x) => x.word === e.word)) return queue;
  const q = queue.slice();
  q.splice(pos, 0, e);
  return q;
}

/**
 * Работа над ошибками: слова, где ошибок много (wrong·2 > right) или последний ответ был ошибкой.
 * Недавние ошибки (RECENT_WRONG_DAYS) выше, дальше по весу ошибок, при равенстве — свежее раньше.
 */
export function errorWords<T extends Entry>(all: T[], stats: WordStats, now: number, max = 25): T[] {
  const byWord = new Map(all.map((e) => [e.word, e]));
  const recent = (s: WordStat) =>
    typeof s.lastWrong === "number" && now - s.lastWrong < RECENT_WRONG_DAYS * DAY ? 1 : 0;
  return Object.entries(stats)
    .filter(([w, s]) => s.wrong > 0 && byWord.has(w) && (s.wrong * 2 > s.right || s.streak === 0))
    .sort(
      ([, a], [, b]) => recent(b) - recent(a) || errScore(b) - errScore(a) || (b.lastWrong || 0) - (a.lastWrong || 0),
    )
    .slice(0, max)
    .map(([w]) => byWord.get(w)!);
}
