// Уровни, титулы, итоговые статы героя gear().
import { ITEM } from "../data/items.js";
import { P, settings } from "./profile.js";

export const MAXL = 50;
const lvlXP = (n) => 50 * n * (n - 1) + n * n * n; // xp needed to reach level n (v2: late levels slower)
export const levelOf = (xp) => {
  let l = 1;
  while (l < MAXL && xp >= lvlXP(l + 1)) l++;
  return l;
};
export const TITLES = [
  "Новичок",
  "Ученик",
  "Знаток",
  "Отличник",
  "Рыцарь пера",
  "Страж словаря",
  "Мастер грамоты",
  "Охотник на ошибки",
  "Чемпион",
  "Легенда класса",
  "Гроза двоек",
  "Повелитель букв",
  "Магистр словаря",
  "Титан грамоты",
  "Звезда школы",
  "Супергерой",
  "Мега-герой",
  "Ультра-герой",
  "Бессмертный",
  "Король грамоты",
  "Повелитель драконов",
  "Космический рыцарь",
  "Хранитель башни",
  "Император слов",
  "Галактический герой",
  "Властелин орфографии",
  "Мифический воин",
  "Полубог грамоты",
  "Бог словаря",
  "Абсолют",
  "Звёздный странник",
  "Покоритель комет",
  "Страж галактики",
  "Повелитель сверхновых",
  "Хранитель вселенной",
  "Титан космоса",
  "Властелин чёрных дыр",
  "Звёздный император",
  "Легенда легенд",
  "Бесконечность",
  "Архимаг слова",
  "Космический гений",
  "Сверхразум",
  "Владыка вселенной",
  "Создатель звёзд",
  "Вечный герой",
  "Непобедимый",
  "Космический бог",
  "Абсолют всего",
  "Владыка Слова",
];
export function xpProgress(xp) {
  const l = levelOf(xp);
  if (l >= MAXL) return { l, frac: 1, need: 0 };
  const a = lvlXP(l),
    b = lvlXP(l + 1);
  return { l, frac: (xp - a) / (b - a), need: b - xp };
}
export function gear(eq = P.equip) {
  const w = ITEM[eq.weapon],
    a = ITEM[eq.armor],
    h = ITEM[eq.helmet],
    b = ITEM[eq.back],
    p = ITEM[eq.pet];
  const up = P.up || {};
  return {
    dmg: (w.dmg || 10) + (p.dmgPlus || 0) + (up.str || 0),
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
    critMult: p.critMult || 2,
    critAt: 3,
  };
}
