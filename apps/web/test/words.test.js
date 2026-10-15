import { describe, expect, it } from "vitest";
import { parseEntry } from "../src/topics/words/parse.js";
import { PA, PAB, PB } from "../src/topics/words/pools.js";

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

describe("словарь", () => {
  it("списки слов на месте", () => {
    expect({ a: PA.length, b: PB.length, ab: PAB.length }).toMatchSnapshot();
  });

  it("все слова разобрались", () => {
    for (const e of PAB) expect(e.slots.length).toBeGreaterThan(0);
  });
});
