// Правила заданий репетитора без localStorage и DOM: их используют игра, кабинет и тесты.
// Задание — слова-монстры. У монстра три сердечка: верный ответ снимает одно, ошибка возвращает все.
// Когда побеждены все, выходит Хранитель: все слова по разу, прощает две ошибки.
import type { Task, TaskProgress } from "@repetitor/shared";
import { parseEntry, type WordEntry } from "../topics/words/parse.ts";

export const MONSTER_HP = 3;
/** Сколько ошибок прощает Хранитель (на следующей он уходит). */
export const GUARD_FORGIVES = 2;
export const DEFAULT_CONGRATS = "{имя}, ты справился!";

export const newProgress = (title: string): TaskProgress => ({ title, hp: {}, wrong: {}, right: 0, guard: 0 });

/** Слова задания, по одному на слово (одинаковые слова с разными местами — одно). */
export function taskEntries(task: Pick<Task, "words">): WordEntry[] {
  const out: WordEntry[] = [];
  for (const raw of task.words) {
    const e = parseEntry(raw);
    if (e && !out.some((x) => x.word === e.word)) out.push(e);
  }
  return out;
}

export const hpOf = (p: TaskProgress | undefined, word: string) => p?.hp[word] ?? MONSTER_HP;

/** Монстры: сколько побеждено и сколько всего. */
export function monsters(task: Pick<Task, "words">, p: TaskProgress | undefined) {
  const es = taskEntries(task);
  return { beaten: es.filter((e) => hpOf(p, e.word) <= 0).length, total: es.length };
}
/** Сердечек осталось у всех монстров (полоска жизней в логове). */
export const heartsLeft = (es: WordEntry[], p: TaskProgress | undefined) =>
  es.reduce((n, e) => n + Math.max(0, hpOf(p, e.word)), 0);

export type TaskState = "planned" | "open" | "done" | "expired";
/** Где задание сейчас: ещё не открылось, открыто, сделано, срок прошёл. */
export function taskState(task: Pick<Task, "from" | "until">, p: TaskProgress | undefined, today: string): TaskState {
  if (p?.done) return "done";
  if (task.from && today < task.from) return "planned";
  if (task.until && today > task.until) return "expired";
  return "open";
}

/**
 * Следующее слово в логове: из непобеждённых, слова с ошибками чаще, одно слово не два раза подряд
 * (если есть из чего выбрать). rnd — число 0..1.
 */
export function pickWord(es: WordEntry[], p: TaskProgress, last: string | null, rnd: number): WordEntry | null {
  const alive = es.filter((e) => hpOf(p, e.word) > 0);
  const pool = alive.length > 1 ? alive.filter((e) => e.word !== last) : alive;
  if (!pool.length) return null;
  const w = pool.map((e) => 1 + 2 * Math.min(3, p.wrong[e.word] || 0));
  let r = rnd * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) if ((r -= w[i]) < 0) return pool[i];
  return pool[pool.length - 1];
}

/** Верный ответ в логове: минус сердечко. Возвращает, сколько у монстра осталось. */
export function hitMonster(p: TaskProgress, word: string): number {
  p.right++;
  p.hp[word] = Math.max(0, hpOf(p, word) - 1);
  return p.hp[word];
}
/** Ошибка: монстр ожил, сердечки снова все. Возвращает, сколько сердечек вернулось. */
export function missMonster(p: TaskProgress, word: string): number {
  p.wrong[word] = (p.wrong[word] || 0) + 1;
  const back = MONSTER_HP - hpOf(p, word);
  p.hp[word] = MONSTER_HP;
  return back;
}
/** Ошибка у Хранителя: считается в задании, монстр пока не оживает. */
export function missGuardian(p: TaskProgress, word: string) {
  p.wrong[word] = (p.wrong[word] || 0) + 1;
}
/** Хранитель ушёл: слова, в которых ошибся, снова монстры. */
export function guardianLeft(p: TaskProgress, missed: string[]) {
  for (const w of missed) p.hp[w] = MONSTER_HP;
}

const WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const MON = ["янв.", "февр.", "марта", "апр.", "мая", "июня", "июля", "авг.", "сент.", "окт.", "нояб.", "дек."];
const day = (iso: string) => new Date(iso + "T12:00:00");
/** «чт» на этой неделе, иначе «23 окт.». */
export function shortDate(iso: string, today: string): string {
  const d = day(iso),
    diff = Math.round((d.getTime() - day(today).getTime()) / 86400000);
  if (diff === 0) return "сегодня";
  if (diff === 1) return "завтра";
  if (diff > 1 && diff < 7) return WD[d.getDay()];
  return `${d.getDate()} ${MON[d.getMonth()]}`;
}

/** Строка для репетитора: «запланировано на чт», «в процессе 5/8», «сделано 14 окт.», «не успел, 5/8». */
export function taskStatus(task: Task, p: TaskProgress | undefined, today: string): { state: TaskState; text: string } {
  const st = taskState(task, p, today),
    { beaten, total } = monsters(task, p),
    n = `${beaten}/${total}`;
  if (st === "done") return { state: st, text: `сделано ${shortDate(p!.done!, today)}` };
  if (st === "planned") return { state: st, text: `откроется ${shortDate(task.from!, today)}` };
  if (st === "expired")
    return { state: st, text: p && (p.right || beaten) ? `не успел, ${n}` : "не начато, срок прошёл" };
  if (!total) return { state: st, text: "подарок ждёт" };
  if (!p || (!p.right && !beaten && !Object.keys(p.wrong).length)) return { state: st, text: "открыто" };
  return { state: st, text: beaten === total ? "остался Хранитель" : `в процессе ${n}` };
}

/** Слова, на которых больше всего ошибок (для отчёта). */
export const hardestWords = (p: TaskProgress | undefined, n = 5) =>
  Object.entries(p?.wrong || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
