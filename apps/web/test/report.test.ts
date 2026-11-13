// Кабинет: «Трудные», «Забывает», «Не видел», «Слова на занятие», недельный отчёт (tutor/report.ts).
import { describe, expect, it } from "vitest";
import type { BattleLog, DayLog, WordStat, WordStats } from "@repetitor/shared";
import {
  DICT,
  PA,
  forgetTimes,
  forgetting,
  gapped,
  hardWords,
  lessonText,
  lessonWords,
  rawOf,
  recentMisses,
  unseenWords,
  weekCell,
  weekReport,
  wordSet,
} from "../src/tutor/report.ts";
import { parseEntry } from "../src/topics/words/parse.ts";

const NOW = new Date("2026-10-15T10:00:00").getTime();
const DAY = 86400000;
const TODAY = "2026-10-15";
const st = (x: Partial<WordStat>): WordStat => ({ right: 0, wrong: 0, ...x });
/** Бой n дней назад: «слово!» — ошибка, «слово+» — вписал, l — выученные в бою. */
const battle = (n: number, words: string, l?: string[]): BattleLog => ({
  t: NOW - n * DAY,
  s: 60,
  k: "campaign",
  m: "pick",
  b: "Клякса",
  w: 1,
  a: words
    .split(" ")
    .map((x): [string, 0 | 1 | 2] => [x.replace(/[!+]$/, ""), x.endsWith("!") ? 0 : x.endsWith("+") ? 2 : 1]),
  ...(l ? { l } : {}),
});

describe("«Забывает»: forgetTimes и forgetting", () => {
  it("по журналу: выучено в одном бою, ошибка в следующем", () => {
    const hist = [battle(5, "молоко молоко молоко", ["молоко"]), battle(2, "молоко! собака")];
    expect(forgetTimes({}, hist)).toEqual(new Map([["молоко", NOW - 2 * DAY]]));
  });

  it("по журналу: выучено и забыто в том же бою, если последний ответ на слово — ошибка", () => {
    expect(forgetTimes({}, [battle(1, "берёза берёза берёза берёза!", ["берёза"])]).get("берёза")).toBe(NOW - DAY);
    // ошибка до «выучено» в том же бою — не забывание
    expect(forgetTimes({}, [battle(1, "берёза! берёза берёза берёза", ["берёза"])]).size).toBe(0);
  });

  it("по журналу: ошибка без «выучено» раньше — не забывание; повторное забывание — позднее время", () => {
    expect(forgetTimes({}, [battle(3, "ворона!"), battle(2, "ворона ворона ворона", ["ворона"])]).size).toBe(0);
    const twice = [
      battle(6, "ворона ворона ворона", ["ворона"]),
      battle(5, "ворона!"),
      battle(4, "ворона! ворона ворона ворона ворона", ["ворона"]),
      battle(1, "ворона!"),
    ];
    expect(forgetTimes({}, twice).get("ворона")).toBe(NOW - DAY);
  });

  it("журнал не по порядку — сортируется по времени", () => {
    const hist = [battle(2, "молоко!"), battle(5, "молоко молоко молоко", ["молоко"])];
    expect(forgetTimes({}, hist).get("молоко")).toBe(NOW - 2 * DAY);
  });

  it("по статистике: до последней ошибки точно была серия из 3 верных", () => {
    const t = NOW - 3 * DAY;
    const stats: WordStats = {
      // В В В О → забыл
      молоко: st({ right: 3, wrong: 1, streak: 0, lastWrong: t }),
      // В О В О В О В: верных до последней ошибки 3, ошибок между ними 2 — серии из 3 может не быть
      собака: st({ right: 4, wrong: 3, streak: 1, lastWrong: t }),
      // 5 верных и 1 другая ошибка до последней: 5 ≥ 2·2+1 — серия точно была
      ворона: st({ right: 6, wrong: 2, streak: 1, lastWrong: t }),
      // без серии (старое сохранение) — не знаем
      берёза: st({ right: 9, wrong: 1, lastWrong: t }),
      // без ошибок
      пенал: st({ right: 5, wrong: 0, streak: 5 }),
    };
    expect([...forgetTimes(stats, [])].sort()).toEqual([
      ["ворона", t],
      ["молоко", t],
    ]);
  });

  it("в списке только те, что сейчас не выучены, недавние выше", () => {
    const stats: WordStats = {
      молоко: st({ right: 3, wrong: 1, streak: 0, lastWrong: NOW - 3 * DAY }),
      ворона: st({ right: 7, wrong: 1, streak: 4, lastWrong: NOW - 2 * DAY }), // забыл и снова выучил
      собака: st({ right: 4, wrong: 1, streak: 1, lastWrong: NOW - DAY }),
    };
    expect(forgetting({ stats }).map((x) => x.word)).toEqual(["собака", "молоко"]);
    expect(forgetting({ stats: null, profile: null })).toEqual([]);
  });
});

describe("«Не видел ни разу»", () => {
  it("набор по режиму слов репетитора", () => {
    expect(wordSet({ words: "a" }).list.length).toBe(new Set(PA.map((e) => e.word)).size);
    expect(wordSet({}).name).toBe("весь словарь");
    expect(wordSet({ words: "auto" }).list.length).toBe(new Set(DICT.map((e) => e.word)).size);
    // свои слова пустые — как в игре, словарь
    expect(wordSet({ words: "custom", customWords: " " }).name).toBe("весь словарь");
  });

  it("свои слова: без повторов и с подсказками; встреченные не показываются", () => {
    const u = unseenWords({
      settings: { words: "custom", customWords: "м(о)локо | корова мычит: мо-о\nс(о)бака, м(о/а)локо\nкла(сс)" },
      stats: { собака: st({ right: 1 }) },
    });
    expect(u.total).toBe(3);
    expect(u.list.map((e) => [e.word, e.hint])).toEqual([
      ["молоко", "корова мычит: мо-о"],
      ["класс", undefined],
    ]);
  });
});

describe("«Трудные» и rawOf", () => {
  it("больше ошибок выше", () => {
    const stats = { a: st({ wrong: 1 }), б: st({ wrong: 3 }), в: st({ right: 4 }) };
    expect(hardWords({ stats }).map(([w]) => w)).toEqual(["б", "a"]);
  });

  it("запись слова: сначала свои слова (с подсказкой), потом словарь", () => {
    expect(rawOf("молоко", "м(о)локо | корова мычит: мо-о")).toBe("м(о)локо | корова мычит: мо-о");
    expect(rawOf("берёза")).toBe(DICT.find((e) => e.word === "берёза")!.raw);
    expect(rawOf("нетслова")).toBeNull();
  });
});

describe("«Слова на занятие»", () => {
  it("пропуск на месте трудной буквы", () => {
    expect(gapped(parseEntry("м(о)локо")!)).toBe("м_локо");
    expect(gapped(parseEntry("в(о/а)р(о/а)бей")!)).toBe("в_р_бей");
    expect(gapped(parseEntry("а(лл)ея | две л")!)).toBe("а_ея");
  });

  it("ошибки за неделю (больше — выше), потом «Забывает», потом «Трудные», без повторов", () => {
    const s = {
      settings: { customWords: "м(о)локо | корова мычит: мо-о" },
      profile: {
        hist: [
          battle(10, "пенал! пенал!"), // старше недели — не в первой группе
          battle(3, "молоко! берёза!"),
          battle(1, "берёза! ворона нетслова! нетслова!"),
        ],
      },
      stats: {
        берёза: st({ right: 1, wrong: 2, streak: 0, lastWrong: NOW - DAY }),
        молоко: st({ right: 0, wrong: 1, streak: 0, lastWrong: NOW - 3 * DAY }),
        собака: st({ right: 3, wrong: 1, streak: 0, lastWrong: NOW - 9 * DAY }),
        пенал: st({ right: 0, wrong: 5, streak: 0, lastWrong: NOW - 10 * DAY }),
        нетслова: st({ right: 0, wrong: 2, streak: 0 }),
      },
    };
    expect(recentMisses(s.profile.hist, NOW - 7 * DAY)).toEqual(
      new Map([
        ["молоко", [1, NOW - 3 * DAY]],
        ["берёза", [2, NOW - DAY]],
        ["нетслова", [2, NOW - DAY]],
      ]),
    );
    const ws = lessonWords(s, NOW);
    expect(ws.map((x) => [x.word, x.why, x.misses])).toEqual([
      ["берёза", "week", 2],
      ["молоко", "week", 1],
      ["собака", "forget", 0],
      ["пенал", "hard", 0],
    ]);
    expect(ws[1].entry.raw).toBe("м(о)локо | корова мычит: мо-о");
    expect(lessonWords(s, NOW, 2).length).toBe(2);
    expect(lessonText("Маша", ws.slice(0, 2))).toBe(
      "Слова на занятие (Маша)\n1. б_рёза\n2. м_локо\n\nОтветы\n1. берёза\n2. молоко — корова мычит: мо-о",
    );
  });

  it("пусто, если ошибок нет", () => {
    expect(lessonWords({ stats: { пенал: st({ right: 3, streak: 3 }) } }, NOW)).toEqual([]);
  });
});

describe("неделя в списке учеников", () => {
  const day = (d: Partial<DayLog>): DayLog => ({ s: 0, r: 0, x: 0, n: 1, t: 0, l: 0, ...d });
  it("дни, минуты, доля ввода среди верных, выучено и забыто за 7 дней", () => {
    const dlog = {
      "2026-10-15": day({ s: 600, r: 20, t: 5, l: 2 }),
      "2026-10-12": day({ s: 1440, r: 20, t: 7, l: 1 }),
      "2026-10-08": day({ s: 600, r: 10, t: 10, l: 5 }), // восьмой день — не в счёт
    };
    const stats = {
      молоко: st({ right: 3, wrong: 1, streak: 0, lastWrong: new Date("2026-10-08T23:59:00").getTime() }), // восьмой день
      собака: st({ right: 3, wrong: 1, streak: 0, lastWrong: new Date("2026-10-09T00:00:00").getTime() }), // первый из 7
    };
    const r = weekReport({ dlog }, stats, TODAY);
    expect(r).toEqual({ days: 2, min: 34, typedPct: 30, learned: 3, forgot: 1 });
    expect(weekCell(r)).toEqual({ main: "2 дн · 34 мин · ввод 30%", sub: "выучено 3 · забыто 1" });
  });

  it("не играл; без верных ответов доли ввода нет", () => {
    expect(weekCell(weekReport({}, null, TODAY))).toEqual({ main: "не играл(а)", sub: "" });
    expect(weekCell(weekReport({ dlog: { [TODAY]: day({ s: 120, x: 4 }) } }, {}, TODAY))).toEqual({
      main: "1 дн · 2 мин",
      sub: "",
    });
  });
});
