// Журнал боёв и итоги по дням (progress/history.ts): запись, кольцо, свёртка, календарь, группировка.
import { describe, expect, it } from "vitest";
import type { BattleLog, DayLog } from "@repetitor/shared";
import {
  DLOG_DAYS,
  HIST_MAX,
  LOG_ANSWERS,
  byDay,
  calendar,
  heat,
  logAnswer,
  missesOf,
  startLog,
  summary,
  writeLog,
} from "../src/progress/history.ts";
import { packSave, unpackSave } from "../src/state/savecode.ts";
import { migrateProfile } from "../src/state/migrations.ts";

const T0 = new Date("2026-10-15T10:00:00").getTime();
const day = (d: DayLog | Partial<DayLog>) => ({ s: 0, r: 0, x: 0, n: 0, t: 0, l: 0, ...d });

describe("журнал боёв", () => {
  it("бой копит ответы и выученные слова, запись без служебных полей", () => {
    const log = startLog(T0, "campaign", "grow", "Клякса");
    logAnswer(log, "берёза", true, false, false);
    logAnswer(log, "молоко", false, false, false);
    logAnswer(log, "берёза", true, true, true);
    log.s = 95;
    const p: { hist?: BattleLog[]; dlog?: Record<string, DayLog> } = {};
    expect(writeLog(p, log, true, "2026-10-15")).toBe(true);
    expect(p.hist).toEqual([
      {
        t: T0,
        s: 95,
        k: "campaign",
        m: "grow",
        b: "Клякса",
        w: 1,
        a: [
          ["берёза", 1],
          ["молоко", 0],
          ["берёза", 2],
        ],
        l: ["берёза"],
      },
    ]);
    expect(p.dlog).toEqual({ "2026-10-15": { s: 95, r: 2, x: 1, n: 1, t: 1, l: 1 } });
  });

  it("бой без ответов не пишется; этаж башни — только у башни; без выученных нет поля l", () => {
    const p: { hist?: BattleLog[] } = {};
    expect(writeLog(p, startLog(T0, "tower", "pick", "Злая Клякса", 12), false, "2026-10-15")).toBe(false);
    expect(p.hist).toBeUndefined();
    const t = startLog(T0, "tower", "pick", "Злая Клякса", 12);
    logAnswer(t, "класс", false, false, false);
    writeLog(p, t, false, "2026-10-15");
    expect(p.hist![0]).toMatchObject({ f: 12, w: 0 });
    expect("l" in p.hist![0]).toBe(false);
    expect("f" in startLog(T0, "campaign", "pick", "Клякса")).toBe(false);
  });

  it("ответов в записи не больше LOG_ANSWERS, итог дня — по всем", () => {
    const log = startLog(T0, "err", "type", "Тень Ошибок");
    for (let i = 0; i < LOG_ANSWERS + 10; i++) logAnswer(log, "слово" + i, true, true, false);
    const p: { hist?: BattleLog[]; dlog?: Record<string, DayLog> } = {};
    writeLog(p, log, true, "2026-10-15");
    expect(p.hist![0].a.length).toBe(LOG_ANSWERS);
    expect(p.dlog!["2026-10-15"].r).toBe(LOG_ANSWERS + 10);
    expect(p.dlog!["2026-10-15"].t).toBe(LOG_ANSWERS + 10);
  });

  it("кольцо: хранятся последние HIST_MAX боёв, дни старше DLOG_DAYS удаляются", () => {
    const p: { hist?: BattleLog[]; dlog?: Record<string, DayLog> } = {
      dlog: { "2026-01-01": day({ n: 1, s: 10 }), "2026-04-19": day({ n: 1 }), "2026-04-18": day({ n: 1 }) },
    };
    for (let i = 0; i < HIST_MAX + 5; i++) {
      const log = startLog(T0 + i, "new", "pick", "Книга Знаний");
      logAnswer(log, "w" + i, true, false, false);
      writeLog(p, log, true, "2026-10-15");
    }
    expect(p.hist!.length).toBe(HIST_MAX);
    expect(p.hist![0].a[0][0]).toBe("w5");
    expect(p.hist![HIST_MAX - 1].a[0][0]).toBe("w" + (HIST_MAX + 4));
    // 180 дней назад от 15.10 — 18.04: этот и старше удалены
    expect(Object.keys(p.dlog!).sort()).toEqual(["2026-04-19", "2026-10-15"]);
    expect(DLOG_DAYS).toBe(180);
    expect(p.dlog!["2026-10-15"].n).toBe(HIST_MAX + 5);
  });

  it("итог за 7 дней считает только дни с игрой в окне", () => {
    const dlog = {
      "2026-10-15": day({ s: 600, r: 10, x: 2, n: 2, t: 3, l: 1 }),
      "2026-10-12": day({ s: 120, r: 4, x: 1, n: 1 }),
      "2026-10-08": day({ s: 900, r: 20, n: 3 }), // 7 дней назад: уже мимо
    };
    expect(summary(dlog, "2026-10-15")).toEqual({ days: 2, sec: 720, r: 14, x: 3, t: 3, l: 1, n: 3 });
    expect(summary(undefined, "2026-10-15").days).toBe(0);
  });

  it("цвет клетки: 0 / до 5 минут / до 15 / больше", () => {
    expect(heat(undefined)).toBe(0);
    expect(heat(day({}))).toBe(0);
    expect(heat(day({ n: 1, s: 20 }))).toBe(1);
    expect(heat(day({ n: 1, s: 300 }))).toBe(1);
    expect(heat(day({ n: 1, s: 301 }))).toBe(2);
    expect(heat(day({ n: 1, s: 900 }))).toBe(2);
    expect(heat(day({ n: 1, s: 901 }))).toBe(3);
  });

  it("календарь: 12 недель с понедельника, последняя — с сегодняшним днём, дальше пусто", () => {
    // 15.10.2026 — четверг
    const cal = calendar({ "2026-10-15": day({ n: 1, s: 1000 }), "2026-07-27": day({ n: 1, s: 60 }) }, "2026-10-15");
    expect(cal.length).toBe(12);
    expect(cal.every((c) => c.length === 7)).toBe(true);
    expect(cal[0][0].day).toBe("2026-07-27"); // понедельник 11 недель назад
    expect(cal[0][0].heat).toBe(1);
    expect(cal[11][0].day).toBe("2026-10-12");
    expect(cal[11][3]).toMatchObject({ day: "2026-10-15", heat: 3, future: false });
    expect(cal[11][4].future).toBe(true);
    expect(cal[11][6].day).toBe("2026-10-18");
  });

  it("по дням: новые сверху, бои без ответов пропускаются, итог дня; ошибки по словам", () => {
    const h = (t: number, a: BattleLog["a"], l?: string[]): BattleLog => ({
      t,
      s: 60,
      k: "campaign",
      m: "pick",
      b: "Клякса",
      w: 1,
      a,
      ...(l ? { l } : {}),
    });
    const hist = [
      h(T0 - 86400000, [["кот", 0]]),
      h(T0, [
        ["берёза", 0],
        ["молоко", 1],
        ["берёза", 0],
      ]),
      h(T0 + 3600000, [["молоко", 2]], ["молоко"]),
      h(T0 + 7200000, []),
    ];
    const g = byDay(hist);
    expect(g.map((d) => d.day)).toEqual(["2026-10-15", "2026-10-14"]);
    expect(g[0].logs.map((e) => e.t)).toEqual([T0 + 3600000, T0]);
    expect(g[0].sum).toEqual({ s: 120, r: 2, x: 2, n: 2, t: 1, l: 1 });
    expect(missesOf(hist[1])).toEqual([["берёза", 2]]);
  });

  it("полный журнал проходит код сохранения и миграции; размер в разумных пределах", async () => {
    const words = ["берёза", "молоко", "собака", "корова", "воробей", "карандаш", "пенал", "тетрадь", "ученик"];
    const p = migrateProfile(null);
    for (let i = 0; i < HIST_MAX; i++) {
      const log = startLog(T0 + i * 3600000, "campaign", "grow", "Кибер-Двоечник");
      for (let j = 0; j < 15; j++) logAnswer(log, words[(i + j) % words.length], j % 4 !== 0, j % 3 === 0, j === 7);
      log.s = 240;
      writeLog(p, log, i % 3 !== 0, "2026-10-" + String(1 + (i % 15)).padStart(2, "0"));
    }
    const json = JSON.stringify({ hist: p.hist, dlog: p.dlog });
    expect(new TextEncoder().encode(json).length).toBeLessThan(40_000);
    const data = { v: 1 as const, p };
    const code = await packSave(data);
    expect(code.length).toBeLessThan(20_000);
    const back = await unpackSave(code);
    expect(migrateProfile(back.p)).toEqual(p);
  });
});
