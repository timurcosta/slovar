// Задания репетитора в игре. Сами задания приходят с сервера (net/sync.ts кладёт их в sb_tasks),
// открываются по дате на устройстве (работает и без сети), прогресс — в P.tasks и уходит учителю с профилем.
// Гостям заданий нет: только вошедшему по коду.
import type { Task, TaskProgress } from "@repetitor/shared";
import { today } from "../lib/date.js";
import { LS } from "../state/storage.ts";
import { P, save } from "../state/profile.ts";
import { addCoins, grantChest } from "./rewards.js";
import { DEFAULT_CONGRATS, monsters, newProgress, taskEntries, taskState } from "./taskrules.ts";

export const TASKS_KEY = "sb_tasks";

/** Задания с сервера (пустой список, если не вошёл по коду). */
export function allTasks(): Task[] {
  if (!LS.get<string | null>("sb_token", null)) return [];
  const list = LS.get<Task[]>(TASKS_KEY, []);
  return Array.isArray(list) ? list : [];
}
export const taskById = (id: string) => allTasks().find((t) => t.id === id) || null;

/** Прогресс по заданию; заводится при первом обращении. */
export function progressOf(task: Task): TaskProgress {
  P.tasks = P.tasks || {};
  const p = (P.tasks[task.id] ||= newProgress(task.title));
  p.title = task.title;
  return p;
}

/** Открытые сегодня и не сделанные задания, по порядку создания. */
export const openTasks = () => allTasks().filter((t) => taskState(t, P.tasks?.[t.id], today()) === "open");

/**
 * Что показать на записке при входе: новые задания и (раз в день) напоминание о начатых.
 * Отмечает показ, поэтому вызывается, только когда записка правда показывается.
 */
export function takeNote(): { fresh: Task[]; remind: Task[] } {
  const d = today(),
    fresh: Task[] = [],
    remind: Task[] = [];
  for (const t of openTasks()) {
    const p = P.tasks?.[t.id];
    if (!p?.seen) fresh.push(t);
    else if (p.seen !== d && p.remind !== d) remind.push(t);
  }
  if (!fresh.length && !remind.length) return { fresh, remind };
  for (const t of fresh) progressOf(t).seen = d;
  for (const t of remind) progressOf(t).remind = d;
  save();
  return { fresh, remind };
}
/** Есть ли что показать на записке (без отметки показа). */
export function hasNote(): boolean {
  const d = today();
  return openTasks().some((t) => {
    const p = P.tasks?.[t.id];
    return !p?.seen || (p.seen !== d && p.remind !== d);
  });
}

/** Задание выполнено: награда Ралины, сундук и медаль. */
export function finishTask(task: Task): { coins: number; chest: ReturnType<typeof grantChest> | null } {
  const p = progressOf(task);
  if (p.done) return { coins: 0, chest: null };
  p.done = today();
  if (task.medal) p.medal = 1;
  const coins = task.coins ? addCoins(task.coins, false) : 0;
  const chest = task.chest ? grantChest(3, null, false) : null;
  save();
  return { coins, chest };
}

export const congratsText = (task: Task) =>
  (task.congrats || DEFAULT_CONGRATS).replace(/\{имя\}/g, P.name || "Герой").replace(/\{name\}/g, P.name || "Герой");

/** Медали за задания: остаются, даже если задание удалили. */
export const medals = () =>
  Object.entries(P.tasks || {})
    .filter(([, p]) => p.medal)
    .map(([id, p]) => ({ id, title: p.title, date: p.done || "" }));

export { monsters, taskEntries };
