// Снимки баланса: если тест упал, значит изменились цифры экономики. Это нормально, только если так и задумано
// (тогда обнови снимок: npx vitest -u) — см. правило «не меняй баланс без спроса» в CLAUDE.md.
import { afterEach, describe, expect, it, vi } from "vitest";
import { BOSSES, towerBoss } from "../src/content/bosses.js";
import { ITEMS, RARITY, UPGRADES, upCost } from "../src/content/items.js";
import { MAXL, levelOf } from "../src/progress/levels.js";

afterEach(() => vi.restoreAllMocks());

describe("уровни", () => {
  const firstXP = (l) => {
    let x = 0;
    while (levelOf(x) < l) x++;
    return x;
  };

  it("опыт до уровня: 50·n·(n−1) + n³", () => {
    for (const n of [2, 3, 10, 25, 50]) expect(firstXP(n)).toBe(50 * n * (n - 1) + n ** 3);
  });

  it("уровень не выше максимума", () => {
    expect(levelOf(10 ** 9)).toBe(MAXL);
  });
});

describe("боссы", () => {
  it("кампания: жизни и время", () => {
    expect(BOSSES.map((b) => [b.name, b.hp, b.time])).toMatchSnapshot();
  });

  it("башня: жизни, время и число способностей по этажам", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(
      [1, 3, 6, 10, 15, 30].map((f) => [f, towerBoss(f).hp, towerBoss(f).time, towerBoss(f).ab.length]),
    ).toMatchSnapshot();
  });
});

describe("магазин", () => {
  it("цены прокачки", () => {
    expect(Object.fromEntries(UPGRADES.map((u) => [u.id, [0, 1, 2, 5, 9].map((n) => upCost(u, n))]))).toMatchSnapshot();
  });

  it("цены и уровни предметов", () => {
    expect(
      ITEMS.map((i) => `${i.slot}/${i.id}: ${i.price} lvl${i.lvl ?? "-"} ${RARITY(i.price)[0]}`),
    ).toMatchSnapshot();
  });
});
