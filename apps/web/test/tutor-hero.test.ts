import { describe, expect, it } from "vitest";
import { heroInfo } from "../src/tutor/hero.ts";

describe("heroInfo", () => {
  it("пустой профиль не падает", () => {
    const h = heroInfo(null);
    expect(h.rows).toHaveLength(7);
    expect(h.owned).toBe(0);
    expect(h.medals).toEqual([]);
    expect(h.rows.find((r) => r.slot === "Питомец")?.name).toBeNull();
    expect(h.rows.find((r) => r.slot === "Оружие")?.name).toBe("Карандаш");
  });
  it("неизвестный id вещи — прочерк", () => {
    const h = heroInfo({ equip: { weapon: "нет-такой" } } as never);
    expect(h.rows[0].name).toBeNull();
  });
  it("вещь с редкостью, медали и счётчики", () => {
    const h = heroInfo({
      equip: { pet: "cat" },
      owned: { cat: 1, pencil: 1 },
      coins: 50,
      towerBest: 12,
      beaten: [0, 1, 2],
      tasks: { a: { medal: 1, title: "Охотник" }, b: {} },
    } as never);
    const pet = h.rows.find((r) => r.slot === "Питомец")!;
    expect(pet.name).toBeTruthy();
    expect(pet.rarity).toMatch(/[а-я]/);
    expect(h).toMatchObject({ owned: 2, coins: 50, towerBest: 12, beaten: 3, medals: ["Охотник"] });
  });
});
