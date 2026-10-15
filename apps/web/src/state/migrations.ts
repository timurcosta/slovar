// Сборка профиля из сохранённых данных любой старой версии. Чистые функции: без localStorage и DOM,
// поэтому их можно тестировать и переиспользовать на сервере. Миграции не удаляй: старые коды
// сохранения проходят через них при каждой загрузке.
import { BOSSES } from "../content/bosses.js";
import { DEFAULT_EQUIP, ITEM, ITEMS } from "../content/items.js";
import type { Equip, Profile, Slot } from "./types.ts";

interface ItemInfo {
  id: string;
  slot: Slot;
  price: number;
  gift?: boolean;
}
const items = ITEMS as ItemInfo[];
const itemById = ITEM as Record<string, ItemInfo | undefined>;
const defaultEquip = DEFAULT_EQUIP as Equip;
const bossNames = (BOSSES as unknown as { name: string }[]).map((b) => b.name);
/** Версия порядка боссов в кампании. */
const RV = 3;
/** Кампания rv 2 (28 боссов, до 16.10.2026). Имена нынешние: «Олеся Зоркая» стала «Олеся Отличница». */
const CAMPAIGN_V2 = [
  "Репетитор Ралина",
  "Клякса",
  "Слизняк Опечатка",
  "Двойка",
  "Мышь Путаница",
  "Кактус Колючка",
  "Кракозябра",
  "Робот Проверятор",
  "Тыква Тыквус",
  "Паук Каракуль",
  "Осьминог Чернильный",
  "Пришелец Зырк",
  "Снеговик Запятушка",
  "Скелет Безударный",
  "Призрак Пропуска",
  "Ангел Ангелика",
  "Гоблин Безграмотный",
  "Мумия Задачник",
  "Капитан Клякс",
  "Тарелка Похититель",
  "Олеся Отличница",
  "Злой Учебник",
  "Зомби Списун",
  "Кибер-Акула",
  "Маг Безграмот",
  "Кибер-Двоечник",
  "Словарный дракон",
  "Король Ошибок",
];
/** rv 1: ещё без Кракозябры, Ангелики и Олеси; rv 0: и без Ралины. */
const CAMPAIGN_V1 = CAMPAIGN_V2.filter((n) => !["Кракозябра", "Ангел Ангелика", "Олеся Отличница"].includes(n));
const CAMPAIGN_V0 = CAMPAIGN_V1.filter((n) => n !== "Репетитор Ралина");

export function freshProfile(): Profile {
  const owned: Record<string, number> = {};
  items.filter((i) => i.price === 0 && !i.gift).forEach((i) => (owned[i.id] = 1));
  return {
    xp: 0,
    coins: 0,
    owned,
    equip: { ...defaultEquip },
    up: { str: 0, hp: 0, time: 0, gold: 0 },
    unlocked: 0,
    beaten: [],
    towerBest: 0,
    rv: RV,
    xpv: 2,
    tot: { correct: 0, typed: 0, bosses: 0, flawless: 0, bought: 0, crits: 0 },
    bestStreak: 0,
    ach: {},
    daily: null,
    days: { last: "", streak: 0 },
    best: 0,
  };
}

/** Подарки Ралины за победу над первым боссом: лепёшка (+1 сердце), тюбетейка и татарский костюм. */
export function applyRalinaGift(p: Profile, wear: boolean): void {
  p.lep = 1;
  p.owned.tubeteika = 1;
  p.owned.tatarc = 1;
  if (wear || p.equip.helmet === "nohelmet" || p.equip.helmet === "band") p.equip.helmet = "tubeteika";
  if (wear || p.equip.costume === "school") p.equip.costume = "tatarc";
}

/**
 * @param stored сохранённый профиль (`sb2_profile`) или null, если его нет
 * @param legacyHero самый старый формат (`sb_hero`), учитывается только без `sb2_profile`
 */
export function migrateProfile(stored: Partial<Profile> | null, legacyHero?: { xp?: number } | null): Profile {
  const st: Partial<Profile> = stored ? JSON.parse(JSON.stringify(stored)) : {};
  const P = Object.assign(freshProfile(), st) as Profile;

  if (legacyHero && legacyHero.xp && !stored) {
    P.xp = legacyHero.xp;
    P.coins = Math.floor(legacyHero.xp / 4);
  }
  items.filter((i) => i.price === 0 && !i.gift).forEach((i) => (P.owned[i.id] = 1));
  P.equip = Object.assign({ ...defaultEquip }, P.equip);
  (Object.keys(defaultEquip) as Slot[]).forEach((sl) => {
    const it = itemById[P.equip[sl]];
    if (!it || it.slot !== sl) P.equip[sl] = defaultEquip[sl];
  });

  // rv: перенос прогресса, когда в кампанию вставляются новые боссы. Победы хранятся индексами, поэтому
  // старый индекс → имя по списку той версии → индекс в нынешней кампании.
  const rv = st.rv || 0;
  if (!Object.keys(st).length || rv >= RV) P.rv = RV;
  else {
    const old = rv >= 2 ? CAMPAIGN_V2 : rv === 1 ? CAMPAIGN_V1 : CAMPAIGN_V0;
    const idx = (n: string) => bossNames.indexOf(n);
    P.beaten = (P.beaten || []).map((i) => idx(old[i])).filter((i) => i >= 0);
    const u = idx(old[Math.min(P.unlocked || 0, old.length - 1)]);
    P.unlocked = u >= 0 ? u : P.unlocked || 0;
    // за последним побеждённым открыт следующий (Тень Короля за Королём); вставленные раньше — уже открыты
    if (P.beaten.length) P.unlocked = Math.max(P.unlocked, Math.max(...P.beaten) + 1);
    P.rv = RV;
  }

  // xpv 2: поздние уровни стали дороже, поэтому опыт поднимается до прежнего уровня
  if (!Object.keys(st).length || (st.xpv ?? 0) >= 2) P.xpv = 2;
  else {
    const oldLvl = (xp: number) => {
      let l = 1;
      while (l < 50 && xp >= 50 * (l + 1) * l) l++;
      return l;
    };
    const l = oldLvl(P.xp || 0),
      need = 50 * l * (l - 1) + l * l * l;
    if ((P.xp || 0) < need) P.xp = need;
    P.xpv = 2;
  }

  P.unlocked = Math.min(P.unlocked || 0, bossNames.length - 1);
  P.tot = Object.assign(freshProfile().tot, P.tot);
  P.up = Object.assign({ str: 0, hp: 0, time: 0, gold: 0 }, P.up);

  // котик Оскар заменён обычным котом, разница возвращается монетами
  if (P.owned && P.owned.oscar) {
    delete P.owned.oscar;
    P.owned.cat = 1;
    P.coins += 2500;
    if (P.equip.pet === "oscar") P.equip.pet = "cat";
  }
  // подарки Ралины для тех, кто победил её до их появления
  if ((!P.lep || !P.owned.tatarc) && (P.beaten || []).includes(0)) {
    applyRalinaGift(P, false);
    P.lepToast = 1;
  }
  return P;
}
