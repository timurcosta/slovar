// Педагогика слов: статистика ответа, «выучено», интервальные повторения, очередь боя, возврат ошибки.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WordStat, WordStats } from "../src/state/types.ts";
import { LEARN_N, isLearned, isSolid, recordAnswer } from "../src/content/rules.ts";
import {
  DAY,
  DUE_HEAD,
  buildQueue,
  daysBetween,
  due,
  errorWords,
  intervalDays,
  overdue,
  requeueMiss,
} from "../src/topics/words/schedule.ts";

const NOW = new Date(2026, 9, 20, 15, 0).getTime(); // 20 октября 2026, 15:00 по местному времени
const daysAgo = (n: number, hour = 12) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
};
/** Предсказуемая «случайность» для тестов. */
const seq = (seed = 1) => {
  let a = seed;
  return () => ((a = (a * 16807) % 2147483647) - 1) / 2147483646;
};
const W = (...ws: string[]) => ws.map((word) => ({ word }));

describe("recordAnswer: статистика ответа", () => {
  it("верный ответ: серия, время, вписано целиком", () => {
    const s: WordStat = { right: 0, wrong: 0 };
    recordAnswer(s, true, false, 1000);
    expect(s).toEqual({ right: 1, wrong: 0, streak: 1, last: 1000 });
    recordAnswer(s, true, true, 2000);
    expect(s).toEqual({ right: 2, wrong: 0, streak: 2, last: 2000, typed: 1 });
  });

  it("ошибка обнуляет серию и запоминает время ошибки, вписанное не считает", () => {
    const s: WordStat = { right: 2, wrong: 0, streak: 2, last: 1000, typed: 1 };
    recordAnswer(s, false, true, 5000);
    expect(s).toEqual({ right: 2, wrong: 1, streak: 0, last: 5000, typed: 1, lastWrong: 5000 });
  });

  it("запись старого сохранения: выученное после верного ответа остаётся выученным", () => {
    const old: WordStat = { right: 7, wrong: 2 };
    expect(isLearned(old)).toBe(true);
    recordAnswer(old, true, false, 1000);
    expect(old.streak).toBe(LEARN_N);
    expect(isLearned(old)).toBe(true);
    expect(intervalDays(old.streak!)).toBe(7); // не сразу месяц
  });

  it("запись старого сохранения с 2 верными: третий верный делает выученным, как раньше", () => {
    const old: WordStat = { right: 2, wrong: 1 };
    expect(isLearned(old)).toBe(false);
    recordAnswer(old, true, false, 1000);
    expect(isLearned(old)).toBe(true);
  });
});

describe("stat(): запись в статистику игрока", () => {
  beforeEach(() => localStorage.clear());

  it("обновляет серию, вписанное и время, сохраняет в sb_stats", async () => {
    vi.resetModules();
    const m = await import("../src/state/stats.ts");
    m.stat("берёза", "right", true, 1000);
    m.stat("берёза", "right", false, 2000);
    m.stat("берёза", "wrong", false, 3000);
    m.stat("берёза", "right", false, 4000);
    const want = { right: 3, wrong: 1, streak: 1, typed: 1, last: 4000, lastWrong: 3000 };
    expect(m.stats["берёза"]).toEqual(want);
    expect(JSON.parse(localStorage.getItem("sb_stats")!)["берёза"]).toEqual(want);
    expect(m.learnedCount()).toBe(0); // 3 верных, но не подряд
  });

  it("learnedCount у старых сохранений считает по right", async () => {
    localStorage.setItem(
      "sb_stats",
      JSON.stringify({ а: { right: 3, wrong: 5 }, б: { right: 2, wrong: 0 }, в: { right: 9, wrong: 0, streak: 1 } }),
    );
    vi.resetModules();
    const m = await import("../src/state/stats.ts");
    expect(m.learnedCount()).toBe(1);
  });
});

describe("isLearned / isSolid", () => {
  it("выучено по серии верных подряд", () => {
    expect(isLearned(undefined)).toBe(false);
    expect(isLearned({ right: 10, wrong: 3, streak: 2 })).toBe(false);
    expect(isLearned({ right: 3, wrong: 3, streak: 3 })).toBe(true);
  });

  it("без серии (старое сохранение) — по числу верных", () => {
    expect(isLearned({ right: 3, wrong: 0 })).toBe(true);
    expect(isLearned({ right: 2, wrong: 0 })).toBe(false);
  });

  it("надёжно — выучено и хоть раз вписано", () => {
    expect(isSolid({ right: 3, wrong: 0, streak: 3 })).toBe(false);
    expect(isSolid({ right: 3, wrong: 0, streak: 3, typed: 1 })).toBe(true);
    expect(isSolid({ right: 3, wrong: 1, streak: 0, typed: 2 })).toBe(false);
  });
});

describe("интервалы повторения", () => {
  it("1, 3, 7, 14, 30 дней по серии; ошибка — через день", () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(intervalDays)).toEqual([1, 1, 3, 7, 14, 30, 30]);
  });

  it("дни считаются по календарю", () => {
    expect(daysBetween(daysAgo(1, 23), NOW)).toBe(1);
    expect(daysBetween(daysAgo(0, 1), NOW)).toBe(0);
  });

  it("due: новое слово — не повторение, старая запись без времени — пора", () => {
    expect(due(undefined, NOW)).toBe(false);
    expect(due({ right: 3, wrong: 0 }, NOW)).toBe(true);
    expect(overdue({ right: 3, wrong: 0 }, NOW)).toBe(Infinity);
  });

  it("due по серии и времени ответа", () => {
    expect(due({ right: 1, wrong: 0, streak: 1, last: daysAgo(0) }, NOW)).toBe(false);
    expect(due({ right: 1, wrong: 0, streak: 1, last: daysAgo(1) }, NOW)).toBe(true);
    expect(due({ right: 2, wrong: 0, streak: 2, last: daysAgo(2) }, NOW)).toBe(false);
    expect(due({ right: 2, wrong: 0, streak: 2, last: daysAgo(3) }, NOW)).toBe(true);
    expect(due({ right: 5, wrong: 0, streak: 5, last: daysAgo(29) }, NOW)).toBe(false);
    expect(due({ right: 5, wrong: 1, streak: 0, last: daysAgo(1) }, NOW)).toBe(true);
    expect(overdue({ right: 3, wrong: 0, streak: 3, last: daysAgo(10) }, NOW)).toBe(3);
  });
});

describe("очередь боя", () => {
  const S = (streak: number, ago: number, extra: Partial<WordStat> = {}): WordStat => ({
    right: streak,
    wrong: 0,
    streak,
    last: daysAgo(ago),
    ...extra,
  });

  it("сначала просроченные (самые просроченные раньше), потом 3–5 новых, потом остальные", () => {
    const stats: WordStats = {
      d1: S(1, 2), // просрочено на 1 день
      d5: S(2, 8), // на 5 дней
      d3: S(3, 10), // на 3 дня
      ok1: S(3, 1),
      ok2: S(1, 0),
    };
    const pool = W("n1", "ok1", "d1", "n2", "n3", "d5", "n4", "n5", "n6", "n7", "ok2", "d3");
    for (let seed = 1; seed < 30; seed++) {
      const q = buildQueue(pool, stats, NOW, { random: seq(seed) }).map((e) => e.word);
      expect(q.slice(0, 3)).toEqual(["d5", "d3", "d1"]);
      const firstOld = q.findIndex((w) => w.startsWith("ok"));
      const fresh = q.slice(3, firstOld);
      expect(fresh.length).toBeGreaterThanOrEqual(3);
      expect(fresh.length).toBeLessThanOrEqual(5);
      expect(fresh.every((w) => w.startsWith("n"))).toBe(true);
      expect(q.slice(firstOld, firstOld + 2).sort()).toEqual(["ok1", "ok2"]);
      expect(new Set(q).size).toBe(pool.length); // без лимита в конце остальные новые
    }
  });

  it("лимит новых слов учителя: новых не больше, чем осталось на сегодня", () => {
    const stats: WordStats = { ok1: S(3, 1) };
    const pool = W("ok1", "n1", "n2", "n3", "n4", "n5");
    const q = buildQueue(pool, stats, NOW, { random: seq(3), freshLeft: 1 }).map((e) => e.word);
    expect(q.filter((w) => w.startsWith("n"))).toHaveLength(1);
    expect(q).toHaveLength(2);
    const q0 = buildQueue(pool, stats, NOW, { random: seq(3), freshLeft: 0 }).map((e) => e.word);
    expect(q0).toEqual(["ok1"]);
    // все слова новые и лимит выбран: очередь не пустая (бой остановит сам лимит)
    expect(buildQueue(W("n1", "n2"), {}, NOW, { random: seq(1), freshLeft: 0 })).toHaveLength(2);
  });

  it("большой долг повторений не вытесняет новые слова", () => {
    const stats: WordStats = {};
    const words = Array.from({ length: 30 }, (_, i) => `d${i}`);
    for (const w of words) stats[w] = { right: 3, wrong: 0 }; // старое сохранение: все «пора»
    const q = buildQueue(W(...words, "n1", "n2", "n3"), stats, NOW, { random: seq(5) }).map((e) => e.word);
    expect(q.slice(DUE_HEAD, DUE_HEAD + 3).sort()).toEqual(["n1", "n2", "n3"]);
  });

  it("у старых записей без времени сначала слова с ошибками", () => {
    const stats: WordStats = { a: { right: 5, wrong: 0 }, b: { right: 1, wrong: 3 }, c: { right: 2, wrong: 1 } };
    const q = buildQueue(W("a", "b", "c"), stats, NOW, { random: seq(2) }).map((e) => e.word);
    expect(q).toEqual(["b", "c", "a"]);
  });

  it("одинаковый random — одинаковая очередь (проверка детерминирована)", () => {
    const pool = W("a", "b", "c", "d", "e", "f", "g");
    const stats: WordStats = { a: S(1, 0), b: S(1, 0) };
    const q1 = buildQueue(pool, stats, NOW, { random: seq(7) });
    const q2 = buildQueue(pool, stats, NOW, { random: seq(7) });
    expect(q1).toEqual(q2);
  });

  it("повторы слов в пуле не дублируются", () => {
    expect(buildQueue(W("a", "a", "b"), {}, NOW, { random: seq(1) })).toHaveLength(2);
  });
});

describe("ошибка возвращается в том же бою", () => {
  const Q = W("q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9");

  it("через 3–6 вопросов, один раз", () => {
    for (let seed = 1; seed < 40; seed++) {
      const q = requeueMiss(Q, { word: "x" }, seq(seed));
      const at = q.findIndex((e) => e.word === "x");
      expect(at).toBeGreaterThanOrEqual(3);
      expect(at).toBeLessThanOrEqual(6);
      expect(q.filter((e) => e.word === "x")).toHaveLength(1);
      expect(q).toHaveLength(Q.length + 1);
    }
    expect(Q).toHaveLength(9); // исходная очередь не меняется
  });

  it("короткая очередь — в конец", () => {
    expect(requeueMiss(W("a", "b"), { word: "x" }, () => 0.99).map((e) => e.word)).toEqual(["a", "b", "x"]);
    expect(requeueMiss([], { word: "x" }, () => 0).map((e) => e.word)).toEqual(["x"]);
  });

  it("слово и так скоро попадётся — не дублируется", () => {
    const q = requeueMiss(W("a", "x", "b", "c", "d", "e", "f"), { word: "x" }, () => 0.99);
    expect(q.map((e) => e.word)).toEqual(["a", "x", "b", "c", "d", "e", "f"]);
  });

  it("ошибся снова — возвращается снова", () => {
    let q = requeueMiss(Q, { word: "x" }, () => 0); // на 4-м месте
    q = q.slice(4); // три вопроса и само слово
    q = requeueMiss(q, { word: "x" }, () => 0);
    expect(q.findIndex((e) => e.word === "x")).toBe(3);
  });
});

describe("работа над ошибками", () => {
  const all = W("a", "b", "c", "d", "e");

  it("старые записи — по весу ошибок, как раньше", () => {
    const stats: WordStats = { a: { right: 0, wrong: 1 }, b: { right: 1, wrong: 4 }, c: { right: 5, wrong: 1 } };
    expect(errorWords(all, stats, NOW).map((e) => e.word)).toEqual(["b", "a"]);
  });

  it("недавние ошибки выше, последний ответ с ошибкой попадает в список", () => {
    const stats: WordStats = {
      a: { right: 0, wrong: 5, lastWrong: NOW - 30 * DAY, streak: 0 },
      b: { right: 1, wrong: 1, lastWrong: NOW - DAY, streak: 0 },
      c: { right: 6, wrong: 1, lastWrong: NOW - 2 * DAY, streak: 0 }, // много верных, но последний — ошибка
      d: { right: 6, wrong: 1, lastWrong: NOW - 2 * DAY, streak: 2 }, // исправил — не в списке
      zz: { right: 0, wrong: 9 }, // слова нет в наборе
    };
    expect(errorWords(all, stats, NOW).map((e) => e.word)).toEqual(["b", "c", "a"]);
  });
});
