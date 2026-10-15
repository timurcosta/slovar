import { describe, expect, it } from "vitest";
import { AB, ATTACK, BOSSES, FORMS, LORE, towerBoss } from "../src/content/bosses.js";
import { BLINK, PALS, SPR } from "../src/content/sprites.js";

// Целостность данных боссов: всё, что нарисует бой, существует (иначе бой падает на первом слове).
describe("боссы", () => {
  it("у каждого босса кампании есть спрайт, палитра, моргание, реплики, лор и атака", () => {
    for (const b of BOSSES) {
      expect(SPR[b.spr], b.name).toBeTruthy();
      expect(PALS[b.pal], b.name).toBeTruthy();
      expect(BLINK[b.pal], b.name).toBeTruthy();
      expect(b.taunts?.length, b.name).toBeGreaterThan(2);
      expect(LORE[b.name], b.name).toBeTruthy();
      expect(ATTACK[b.pal], b.name).toBeTruthy();
      for (const a of b.ab) expect(AB[a], `${b.name}: ${a}`).toBeTruthy();
    }
  });

  it("формы ссылаются на настоящих боссов, спрайты и подлянки", () => {
    for (const [name, forms] of Object.entries(FORMS)) {
      const b = BOSSES.find((x) => x.name === name);
      expect(b, name).toBeTruthy();
      for (const f of forms) {
        expect(SPR[f.spr || b.spr], f.name).toBeTruthy();
        expect(PALS[f.pal || b.pal], f.name).toBeTruthy();
        expect(BLINK[f.pal || b.pal], f.name).toBeTruthy();
        expect(AB[f.ab], f.name).toBeTruthy();
      }
    }
  });

  it("у боссов башни все подлянки описаны", () => {
    for (let f = 1; f <= 40; f++)
      for (let n = 0; n < 30; n++) {
        const b = towerBoss(f);
        for (const a of b.ab) expect(AB[a], `этаж ${f}: ${a}`).toBeTruthy();
        for (const fm of b.forms || []) expect(AB[fm.ab], `этаж ${f}, форма: ${fm.ab}`).toBeTruthy();
      }
  });

  it("Король остался на прежней ступени сложности", () => {
    const king = BOSSES.find((b) => b.name === "Король Ошибок");
    expect(king.lvl).toBe(27);
    expect(king.hp).toBe(630);
  });
});
