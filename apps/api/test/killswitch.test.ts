import { describe, expect, it } from "vitest";
import { shouldStop } from "../src/killswitch.ts";

describe("аварийное выключение", () => {
  it("не выключает на пороге 50%", () => {
    expect(shouldStop({ amount: 51.2, budgeted_amount: 100 })).toBe(false);
  });
  it("выключает, когда расходы дошли до бюджета", () => {
    expect(shouldStop({ amount: 100, budgeted_amount: 100 })).toBe(true);
    expect(shouldStop({ amount: 99.5, budgeted_amount: 100 })).toBe(true);
    expect(shouldStop({ amount: 140, budgeted_amount: 100 })).toBe(true);
  });
});
