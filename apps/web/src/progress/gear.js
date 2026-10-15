// gear(): итоговые статы героя из экипировки, прокачки и настроек.
import { ITEM } from "../content/items.js";
import { P } from "../state/profile.ts";
import { settings } from "../state/settings.ts";

export function gear(eq = P.equip) {
  const w = ITEM[eq.weapon],
    a = ITEM[eq.armor],
    h = ITEM[eq.helmet],
    b = ITEM[eq.back],
    p = ITEM[eq.pet];
  const up = P.up || {};
  return {
    dmg: (w.dmg || 10) + (p.dmgPlus || 0) + (up.str || 0), // вместе с питомцем
    petDmg: p.dmgPlus || 0, // доля питомца: он бьёт её сам, своей атакой
    fx: w.fx,
    fxCol: w.col,
    maxH: 5 + (a.hp || 0) + (up.hp || 0) + (settings.words === "a" ? 2 : 0) + (P.lep ? 1 : 0),
    spikes: a.spikes || 0,
    coinMul: (a.coinMul || 1) * (p.coinMul || 1) * (1 + 0.1 * (up.gold || 0)),
    shield: h.shield || 0,
    firstCrit: !!h.firstCrit,
    xpMul: h.xpMul || 1,
    time: (b.time || 0) + 0.5 * (up.time || 0) + (settings.words === "a" ? 1.5 : 0),
    revive: !!b.revive,
    dodge: b.dodge || 0,
    heal8: !!p.heal8,
    heal6: !!p.heal6,
    heal5: !!p.heal5,
    drone: !!p.drone,
    guard5: !!p.guard5,
    critMult: p.critMult || 2,
    critAt: 3,
  };
}
