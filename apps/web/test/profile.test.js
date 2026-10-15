// Миграции сохранений: профиль собирается при загрузке модуля, поэтому каждый тест
// кладёт данные в localStorage и загружает модуль заново.
import { beforeEach, describe, expect, it, vi } from "vitest";

async function load(storage) {
  localStorage.clear();
  for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, JSON.stringify(v));
  vi.resetModules();
  const m = await import("../src/state/profile.ts");
  return { P: m.P, saved: JSON.parse(localStorage.getItem("sb2_profile")) };
}

beforeEach(() => localStorage.clear());

describe("профиль", () => {
  it("новый игрок получает стартовый профиль", async () => {
    const { P, saved } = await load({});
    expect(P.xp).toBe(0);
    expect(P.coins).toBe(0);
    expect(P.equip.weapon).toBe("pencil");
    expect(P.owned.pencil).toBe(1);
    expect(P.owned.tatarc).toBeUndefined(); // подарок, а не стартовая вещь
    expect(saved).toEqual(P);
  });

  it("вложенные поля доливаются в старый профиль", async () => {
    const { P } = await load({ sb2_profile: { rv: 2, xpv: 2, tot: { correct: 5 }, up: { str: 3 } } });
    expect(P.tot).toMatchObject({ correct: 5, typed: 0, bosses: 0 });
    expect(P.up).toEqual({ str: 3, hp: 0, time: 0, gold: 0 });
  });

  it("неизвестные вещи в экипировке сбрасываются", async () => {
    const { P } = await load({ sb2_profile: { rv: 2, xpv: 2, equip: { weapon: "нет-такого", armor: "pencil" } } });
    expect(P.equip.weapon).toBe("pencil");
    expect(P.equip.armor).toBe("noarmor");
  });

  it("rv 1 → 2: индексы боссов переносятся по именам", async () => {
    const { P } = await load({ sb2_profile: { rv: 1, xpv: 2, unlocked: 5, beaten: [0, 1, 2, 3, 4] } });
    expect({ rv: P.rv, unlocked: P.unlocked, beaten: P.beaten }).toMatchSnapshot();
  });

  it("rv 0 → 2: ещё без Ралины", async () => {
    const { P } = await load({ sb2_profile: { unlocked: 3, beaten: [0, 1, 2], xpv: 2 } });
    expect({ rv: P.rv, unlocked: P.unlocked, beaten: P.beaten }).toMatchSnapshot();
  });

  it("xpv 2: опыт поднимается, чтобы уровень не упал", async () => {
    const { P } = await load({ sb2_profile: { rv: 2, xp: 9000 } });
    expect(P.xpv).toBe(2);
    expect(P.xp).toBeGreaterThanOrEqual(9000);
    expect(P.xp).toMatchSnapshot();
  });

  it("Оскар превращается в кота с компенсацией", async () => {
    const { P } = await load({ sb2_profile: { rv: 2, xpv: 2, coins: 10, owned: { oscar: 1 } } });
    expect(P.owned.oscar).toBeUndefined();
    expect(P.owned.cat).toBe(1);
    expect(P.coins).toBe(2510);
  });

  it("победа над Ралиной без подарков → подарки выдаются", async () => {
    const { P } = await load({ sb2_profile: { rv: 2, xpv: 2, beaten: [0] } });
    expect(P.lep).toBe(1);
    expect(P.owned).toMatchObject({ tubeteika: 1, tatarc: 1 });
    expect(P.equip).toMatchObject({ helmet: "tubeteika", costume: "tatarc" });
    expect(P.lepToast).toBe(1);
  });

  it("самый старый формат sb_hero", async () => {
    const { P } = await load({ sb_hero: { xp: 400 } });
    expect(P.coins).toBe(100);
    expect(P.xp).toBeGreaterThanOrEqual(400);
  });
});
