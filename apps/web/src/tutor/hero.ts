// Блок «Герой» в обзоре ученика: что надето и чем гордится. Без DOM, чтобы проверять тестом.
import type { Profile } from "@repetitor/shared";
import { DEFAULT_EQUIP, ITEM, RARITY, SLOTS } from "../content/items.js";

export interface HeroRow {
  slot: string;
  /** Название вещи; null — слот пуст («—»). */
  name: string | null;
  rarity: string;
  /** Цвет редкости, как в магазине. */
  color: string;
}

export interface HeroInfo {
  rows: HeroRow[];
  owned: number;
  coins: number;
  towerBest: number;
  beaten: number;
  medals: string[];
}

/** Слоты героя: подпись, вещь, редкость по цене (RARITY из content/items.js, как в магазине). */
export function heroInfo(p: Partial<Profile> | null | undefined): HeroInfo {
  const equip = (p?.equip ?? {}) as Record<string, string | undefined>;
  const def = DEFAULT_EQUIP as Record<string, string>;
  const rows = (SLOTS as string[][]).map(([slot, label]) => {
    const id = equip[slot] ?? def[slot];
    const it = (ITEM as Record<string, { name: string; price: number } | undefined>)[id];
    // «Без брони» и подобные пустышки показываем прочерком; неизвестный id — тоже, без падения.
    if (!it || (id === def[slot] && /^no/.test(id))) return { slot: label, name: null, rarity: "", color: "" };
    const [rarity, color] = RARITY(it.price);
    return { slot: label, name: it.name, rarity: rarity.toLowerCase(), color };
  });
  const medals = Object.values(p?.tasks ?? {})
    .filter((t) => t?.medal)
    .map((t) => t.title || "Медаль");
  return {
    rows,
    owned: Object.keys(p?.owned ?? {}).length,
    coins: p?.coins ?? 0,
    towerBest: p?.towerBest ?? 0,
    beaten: p?.beaten?.length ?? 0,
    medals,
  };
}
