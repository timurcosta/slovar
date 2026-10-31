// Правила, общие для игры и кабинета репетитора.
import type { WordStat } from "@repetitor/shared";

/** Слово считается выученным после стольких верных ответов подряд. */
export const LEARN_N = 3;

/**
 * Серия верных подряд. У записей старых сохранений серии нет (поле появилось позже), тогда
 * берём все верные ответы: так считалось «выучено» раньше, и у детей оно не должно упасть.
 */
export const streakOf = (s: WordStat) => (typeof s.streak === "number" ? s.streak : s.right || 0);

/** Выучено: LEARN_N верных подряд (выбор из двух букв за всю жизнь легко угадать). */
export const isLearned = (s: WordStat | undefined) => !!s && streakOf(s) >= LEARN_N;

/** Надёжно выучено: выучено и хотя бы раз верно вписано целиком. */
export const isSolid = (s: WordStat | undefined) => !!s && isLearned(s) && (s.typed || 0) > 0;

/**
 * Учесть ответ в статистике слова (меняет s). Первая серия у записи старого сохранения
 * продолжается с min(right, LEARN_N − 1): выученное слово после верного ответа остаётся
 * выученным, но не получает сразу длинный интервал повторения.
 */
export function recordAnswer(s: WordStat, ok: boolean, typed: boolean, now: number): WordStat {
  const prev = typeof s.streak === "number" ? s.streak : Math.min(s.right || 0, LEARN_N - 1);
  if (ok) {
    s.right = (s.right || 0) + 1;
    s.streak = prev + 1;
    if (typed) s.typed = (s.typed || 0) + 1;
  } else {
    s.wrong = (s.wrong || 0) + 1;
    s.streak = 0;
    s.lastWrong = now;
  }
  s.last = now;
  return s;
}

/** Урон, жизни боссов и очки показываются ×10: «−100» смотрится сильнее, чем «−10». Считается всё в мелких числах. */
export const DMG_SHOW = 10;
export const shownDmg = (n: number) => n * DMG_SHOW;
