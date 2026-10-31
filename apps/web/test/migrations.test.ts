import { describe, expect, it } from "vitest";
import { freshProfile, migrateProfile } from "../src/state/migrations.ts";
import type { BattleLog, Profile } from "../src/state/types.ts";

describe("migrateProfile", () => {
  it("без сохранения — стартовый профиль", () => {
    expect(migrateProfile(null)).toEqual(freshProfile());
  });

  it("не меняет переданный объект", () => {
    const stored = { rv: 1, xpv: 1, xp: 9000, beaten: [0, 1], owned: { oscar: 1 } } as Partial<Profile>;
    const copy = JSON.parse(JSON.stringify(stored));
    migrateProfile(stored);
    expect(stored).toEqual(copy);
  });

  it("повторная миграция ничего не меняет", () => {
    const once = migrateProfile({
      rv: 1,
      unlocked: 5,
      beaten: [0, 1, 2, 3, 4],
      owned: { oscar: 1 },
      coins: 7,
    } as Partial<Profile>);
    expect(migrateProfile(once)).toEqual(once);
  });

  it("sb_hero учитывается только без sb2_profile", () => {
    expect(migrateProfile(null, { xp: 400 }).coins).toBe(100);
    expect(migrateProfile({ rv: 2, xpv: 2, coins: 5 }, { xp: 400 }).coins).toBe(5);
  });

  it("журнал боёв: у старых сохранений пустой, свой сохраняется, битый заменяется, повтор ничего не меняет", () => {
    const old = migrateProfile({ rv: 3, xpv: 2, xp: 100 } as Partial<Profile>);
    expect(old.hist).toEqual([]);
    expect(old.dlog).toEqual({});
    const hist: BattleLog[] = [{ t: 1, s: 60, k: "campaign", m: "pick", b: "Клякса", w: 1, a: [["берёза", 1]] }];
    const dlog = { "2026-10-15": { s: 60, r: 1, x: 0, n: 1, t: 0, l: 0 } };
    const once = migrateProfile({ rv: 3, xpv: 2, hist, dlog } as Partial<Profile>);
    expect(once.hist).toEqual(hist);
    expect(once.dlog).toEqual(dlog);
    expect(migrateProfile(once)).toEqual(once);
    const broken = migrateProfile({ rv: 3, xpv: 2, hist: {}, dlog: [] } as unknown as Partial<Profile>);
    expect(broken.hist).toEqual([]);
    expect(broken.dlog).toEqual({});
  });
});
