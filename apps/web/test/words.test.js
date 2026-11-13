import { describe, expect, it } from "vitest";
import { parseEntry, splitEntries } from "../src/topics/words/parse.ts";
import { PA, PAB, PB, customPool, setCustomRaw } from "../src/topics/words/pools.js";
import { taskEntries } from "../src/progress/taskrules.ts";

describe("parseEntry", () => {
  it("разбирает слово с явной ловушкой", () => {
    const e = parseEntry("б(е/и)рёза");
    expect(e.word).toBe("берёза");
    expect(e.slots).toEqual([1]);
    expect(e.segs[1]).toEqual({ c: "е", w: "и" });
  });

  it("подбирает ловушку сама", () => {
    expect(parseEntry("м(о)локо").segs[1]).toEqual({ c: "о", w: "а" });
    expect(parseEntry("а(лл)ея").segs[1]).toEqual({ c: "лл", w: "л" });
    expect(parseEntry("(М)осква").segs[0]).toEqual({ c: "М", w: "м" });
  });

  it("поддерживает несколько мест в слове", () => {
    expect(parseEntry("в(о/а)р(о/а)бей").slots).toEqual([1, 3]);
  });

  it("отбрасывает строки без вопроса", () => {
    expect(parseEntry("")).toBeNull();
    expect(parseEntry("молоко")).toBeNull();
    expect(parseEntry("(ж)ук")).toBeNull(); // для «ж» ловушки нет
  });
});

describe("подсказка репетитора после «|»", () => {
  it("всё после первой черты — подсказка, по краям без пробелов", () => {
    const e = parseEntry("  м(о)локо |  корова мычит: мо-о | и всё  ");
    expect(e.word).toBe("молоко"); // ключ статистики — без подсказки
    expect(e.hint).toBe("корова мычит: мо-о | и всё");
    expect(e.segs).toEqual(parseEntry("м(о)локо").segs);
    expect(e.raw).toBe("м(о)локо |  корова мычит: мо-о | и всё");
  });

  it("без черты и с пустой подсказкой — как раньше", () => {
    expect(parseEntry("м(о)локо")).not.toHaveProperty("hint");
    expect(parseEntry("м(о)локо |")).not.toHaveProperty("hint");
    expect(parseEntry("м(о)локо | ").word).toBe("молоко");
  });

  it("скобки в подсказке не становятся местом выбора", () => {
    const e = parseEntry("с(о)бака | (сторож) гав");
    expect(e.word).toBe("собака");
    expect(e.slots).toEqual([1]);
    expect(parseEntry("собака | (с)торож")).toBeNull();
  });

  it("строки своих слов: перевод строки и запятая, но строку с подсказкой запятая не делит", () => {
    expect(splitEntries("м(о)локо, с(о)бака\nв(о)рона | ворона, а не варона\n\n  кла(сс) ")).toEqual([
      "м(о)локо",
      "с(о)бака",
      "в(о)рона | ворона, а не варона",
      "кла(сс)",
    ]);
  });
});

describe("подсказка доходит до боя", () => {
  it("свои слова репетитора", () => {
    setCustomRaw("в(о)рона | ворона, а не варона\nм(о)локо, с(о)бака");
    expect(customPool().map((e) => [e.word, e.hint])).toEqual([
      ["ворона", "ворона, а не варона"],
      ["молоко", undefined],
      ["собака", undefined],
    ]);
    setCustomRaw("");
  });

  it("слова задания", () => {
    const es = taskEntries({ words: ["м(о)локо | корова мычит: мо-о", "м(о/а)локо", "кла(сс)"] });
    expect(es.map((e) => [e.word, e.hint])).toEqual([
      ["молоко", "корова мычит: мо-о"],
      ["класс", undefined],
    ]);
  });
});

describe("словарь", () => {
  it("списки слов на месте", () => {
    expect({ a: PA.length, b: PB.length, ab: PAB.length }).toMatchSnapshot();
  });

  it("все слова разобрались", () => {
    for (const e of PAB) expect(e.slots.length).toBeGreaterThan(0);
  });
});
