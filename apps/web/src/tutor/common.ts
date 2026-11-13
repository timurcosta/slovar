// Общее для страниц кабинета: запросы к API, даты, мелкие помощники.
import type { Student } from "@repetitor/shared";
import { today } from "../lib/date.js";
import { isLearned } from "../content/rules.ts";
import { HttpError, request } from "../net/http.ts";
import { DICT } from "./report.ts";

import { plural } from "../lib/text.js";
export { plural };
export { DICT, hardNow, hardWords, rawOf } from "./report.ts";
export const app = document.getElementById("app")!;
export const TOKEN = "tutor_token";
export const TOTAL_WORDS = DICT.length;

export const getToken = () => localStorage.getItem(TOKEN);
/** Что делать, когда токен истёк (main.ts показывает вход). */
let onUnauthorized = () => {};
export const setOnUnauthorized = (fn: () => void) => (onUnauthorized = fn);
export const api = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
  try {
    return await request<T>(method, path, { body, token: getToken() });
  } catch (e) {
    if (e instanceof HttpError && e.status === 401 && path !== "/tutor/login") {
      localStorage.removeItem(TOKEN);
      onUnauthorized();
    }
    throw e;
  }
};

export function seen(iso: string | null): string {
  if (!iso) return "входа ещё не было";
  const d = new Date(iso),
    now = new Date();
  const days = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86400000,
  );
  const hm = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (days === 0) return `сегодня в ${hm}`;
  if (days === 1) return `вчера в ${hm}`;
  if (days < 7) return `${days} ${plural(days, ["день", "дня", "дней"])} назад`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

export const learned = (s: Student) => Object.values(s.stats || {}).filter(isLearned).length;
export const todayOf = (s: Student) => (s.profile?.day && s.profile.day.date === today() ? s.profile.day : null);

export function msg(el: Element | null, text: string, kind: "err" | "okm" | "" = "") {
  if (!el) return;
  el.className = `msg ${kind}`;
  el.textContent = text;
}
export const q = <T extends Element = HTMLElement>(sel: string) => app.querySelector<T>(sel)!;

/** Список учеников, загруженный последним: его же берёт конструктор заданий («Задать и другим ученикам»). */
let students: Student[] | null = null;
export const knownStudents = () => students;
export async function loadStudents(): Promise<Student[]> {
  students = await api<Student[]>("GET", "/tutor/students");
  return students;
}

/**
 * Страж ухода со страницы: вкладка с несохранёнными правками ставит функцию, которая возвращает true,
 * если переход надо остановить (и сама объясняет почему). main.ts спрашивает её перед сменой адреса.
 */
let leaveGuard: (() => boolean) | null = null;
export const setLeaveGuard = (fn: (() => boolean) | null) => (leaveGuard = fn);
export const blocksLeave = () => !!leaveGuard && leaveGuard();

/** Скопировать текст; false — буфер недоступен (старый браузер, не https). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
