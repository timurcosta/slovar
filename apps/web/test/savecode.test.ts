// Код сохранения: им старая версия на github.io передаёт прогресс игре на новом адресе (moved.html → #import=).
import { describe, expect, it } from "vitest";
import { packSave, unpackSave } from "../src/state/savecode.ts";
import { migrateProfile } from "../src/state/migrations.ts";
import type { Profile } from "../src/state/types.ts";

const OLD = {
  name: "Старичок",
  xp: 9000,
  coins: 500,
  rv: 1,
  unlocked: 5,
  beaten: [0, 1, 2, 3, 4],
} as unknown as Profile;

describe("код сохранения", () => {
  it("упаковка и распаковка возвращают те же данные", async () => {
    const data = { v: 1 as const, p: OLD, s: { берёза: { right: 3, wrong: 1 } } };
    const code = await packSave(data);
    expect(code.startsWith("SBZ")).toBe(true);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/); // безопасно для адреса (#import=…)
    expect(await unpackSave(code)).toEqual(data);
  });

  it("старое сохранение после распаковки проходит миграции", async () => {
    const d = await unpackSave(await packSave({ v: 1, p: OLD }));
    const p = migrateProfile(d.p);
    expect(p.name).toBe("Старичок");
    expect(p.rv).toBe(2);
    expect(p.xp).toBeGreaterThanOrEqual(9000);
  });

  it("чужие строки не принимаются", async () => {
    await expect(unpackSave("SBZ")).rejects.toThrow();
    await expect(unpackSave("привет")).rejects.toThrow();
    await expect(unpackSave("SBJ" + btoa(JSON.stringify({ v: 1, p: { xp: "lots" } })))).rejects.toThrow();
  });
});
