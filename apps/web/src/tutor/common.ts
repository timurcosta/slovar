// Общее для страниц кабинета: запросы к API, даты, мелкие помощники.
import type { Student, WordStats } from "@repetitor/shared";
import { today } from "../lib/date.js";
import { LEARN_N } from "../content/rules.ts";
import { W12, W34 } from "../topics/words/lists.js";
import { parseEntry, parseList } from "../topics/words/parse.ts";
import { HttpError, request } from "../net/http.ts";

export const app = document.getElementById("app")!;
export const TOKEN = "tutor_token";
export const DICT = parseList(W12).concat(parseList(W34));
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

export const plural = (n: number, f: [string, string, string]) => {
  const a = Math.abs(n) % 100,
    b = a % 10;
  return f[a > 10 && a < 20 ? 2 : b === 1 ? 0 : b >= 2 && b <= 4 ? 1 : 2];
};

export function seen(iso: string | null): string {
  if (!iso) return "ещё не заходил(а)";
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

export const learned = (s: Student) => Object.values(s.stats || {}).filter((w) => w.right >= LEARN_N).length;
export const hardWords = (s: Pick<Student, "stats">) =>
  Object.entries(s.stats || ({} as WordStats))
    .filter(([, w]) => w.wrong > 0)
    .sort((a, b) => b[1].wrong - a[1].wrong || a[0].localeCompare(b[0], "ru"));
export const todayOf = (s: Student) => (s.profile?.day && s.profile.day.date === today() ? s.profile.day : null);

/**
 * Слово из статистики («берёза») → запись в формате заданий («б(е)рёза»): ищем в своих словах
 * ученика, потом в словаре. null — если слово не нашлось.
 */
export function rawOf(word: string, custom = ""): string | null {
  for (const line of custom.split(/\n|,/)) {
    const e = parseEntry(line);
    if (e && e.word === word) return e.raw;
  }
  return DICT.find((e) => e.word === word)?.raw ?? null;
}

export function msg(el: Element | null, text: string, kind: "err" | "okm" | "" = "") {
  if (!el) return;
  el.className = `msg ${kind}`;
  el.textContent = text;
}
export const q = <T extends Element = HTMLElement>(sel: string) => app.querySelector<T>(sel)!;
