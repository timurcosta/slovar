import { describe, expect, it } from "vitest";
import type { Task } from "@repetitor/shared";
import { freshProfile, migrateProfile } from "../src/state/migrations.ts";
import {
  MONSTER_HP,
  guardianLeft,
  heartsLeft,
  hitMonster,
  missMonster,
  monsters,
  newProgress,
  pickWord,
  taskEntries,
  taskState,
  taskStatus,
} from "../src/progress/taskrules.ts";

const task = (over: Partial<Task> = {}): Task => ({
  id: "t1",
  title: "Удвоенные",
  words: ["кла(сс)", "гру(пп)а", "а(лл)ея", "кла(сс/с)"],
  coins: 150,
  createdAt: "2026-10-14T10:00:00.000Z",
  ...over,
});

describe("задания Ралины", () => {
  it("старый профиль получает пустые задания, повторная миграция ничего не меняет", () => {
    const p = migrateProfile({ rv: 3, xpv: 2, xp: 500, beaten: [0] });
    expect(p.tasks).toEqual({});
    expect(migrateProfile(p)).toEqual(p);
    expect(freshProfile().tasks).toEqual({});
  });

  it("одно слово — один монстр, даже если записано дважды", () => {
    expect(taskEntries(task()).map((e) => e.word)).toEqual(["класс", "группа", "аллея"]);
  });

  it("монстр побеждён после трёх верных подряд, ошибка возвращает все сердечки", () => {
    const t = task(),
      es = taskEntries(t),
      p = newProgress(t.title);
    expect(heartsLeft(es, p)).toBe(3 * MONSTER_HP);
    hitMonster(p, "класс");
    hitMonster(p, "класс");
    expect(missMonster(p, "класс")).toBe(2);
    expect(p.hp.класс).toBe(MONSTER_HP);
    for (let i = 0; i < 3; i++) hitMonster(p, "класс");
    expect(monsters(t, p)).toEqual({ beaten: 1, total: 3 });
    expect(p.right).toBe(5);
    expect(p.wrong).toEqual({ класс: 1 });
  });

  it("слово не выпадает два раза подряд и не выпадает побеждённое", () => {
    const t = task(),
      es = taskEntries(t),
      p = newProgress(t.title);
    p.hp.группа = 0;
    for (let i = 0; i < 20; i++) {
      const w = pickWord(es, p, "класс", i / 20)!.word;
      expect(w).toBe("аллея");
    }
    p.hp.аллея = 0;
    expect(pickWord(es, p, "класс", 0.5)!.word).toBe("класс"); // остался один — можно и подряд
    p.hp.класс = 0;
    expect(pickWord(es, p, null, 0.5)).toBeNull();
  });

  it("ушедший Хранитель возвращает монстров слов с ошибками", () => {
    const p = newProgress("x");
    p.hp = { класс: 0, группа: 0 };
    guardianLeft(p, ["группа"]);
    expect(p.hp).toEqual({ класс: 0, группа: MONSTER_HP });
  });

  it("статусы для кабинета", () => {
    const today = "2026-10-15";
    expect(taskState(task({ from: "2026-10-16" }), undefined, today)).toBe("planned");
    expect(taskStatus(task({ from: "2026-10-16" }), undefined, today).text).toBe("откроется завтра");
    expect(taskStatus(task(), undefined, today).text).toBe("открыто");
    const p = newProgress("x");
    p.hp.класс = 0;
    p.right = 4;
    expect(taskStatus(task(), p, today).text).toBe("в процессе 1/3");
    expect(taskStatus(task({ until: "2026-10-14" }), p, today).text).toBe("не успел, 1/3");
    expect(taskStatus(task({ until: "2026-10-14" }), undefined, today).text).toBe("не начато, срок прошёл");
    p.done = today;
    expect(taskStatus(task(), p, today).text).toBe("сделано сегодня");
    expect(taskStatus(task({ words: [] }), undefined, today).text).toBe("подарок ждёт");
  });
});
