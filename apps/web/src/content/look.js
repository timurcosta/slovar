// Внешность героя: причёски, цвета волос, кожи и глаз, сочетания с костюмами и шлемами.
import { COSTUME_KEY } from "./costumes.js";

/* appearance: free to change, applied on top of the costume */
export const LOOK_HAIR = {
  auto: ["Как у костюма", null],
  brown: ["Каштановые", "#5a3a22"],
  black: ["Чёрные", "#1e1e28"],
  light: ["Русые", "#9a6a3a"],
  blond: ["Светлые", "#e8c35a"],
  ginger: ["Рыжие", "#c8541e"],
  red: ["Красные", "#c0283a"],
  silver: ["Серебряные", "#c9d3e3"],
  blue: ["Синие", "#3a6fd8"],
  mint: ["Мятные", "#3fbf9a"],
  purple: ["Фиолетовые", "#7a4fd6"],
};
export const LOOK_SKIN = {
  auto: ["Как у костюма", null],
  s1: ["Светлая", "#f8dcc4"],
  s2: ["Обычная", "#f2c09a"],
  s3: ["Смуглая", "#d9a27a"],
  s4: ["Тёмная", "#a8714f"],
  s5: ["Очень тёмная", "#85563a"],
};
export const LOOK_EYE = {
  auto: ["Как у костюма", null],
  blue: ["Синие", "#1d2f5c"],
  brown: ["Карие", "#5a3a22"],
  green: ["Зелёные", "#2b7a3a"],
  grey: ["Серые", "#4a5670"],
};
export const LOOK_STYLE = { classic: "Классика", spiky: "Ёжик", bangs: "Чёлка", long: "Длинные", mohawk: "Ирокез" };
export const LOOK_MASKED = ["robot", "alien", "skeleton", "spaceknight", "shadow"]; // face fully covered by the costume
export const LOOK_NOSKIN = ["ice"]; // stylised skin stays
// which hair colours suit which outfit: costume first, armor narrows it down
const HAIR_FOR = {
  school: ["brown", "black", "light", "blond", "ginger"],
  ninja: ["black", "red", "silver"],
  space: ["blond", "brown", "ginger", "light"],
  fire: ["ginger", "red", "black"],
  ice: ["silver", "blond", "blue"],
  gold: ["blond", "brown", "ginger"],
  cyberninja: ["black", "blue", "mint"],
  dragonknight: ["brown", "ginger", "black"],
  galaxy: ["purple", "silver", "blue"],
  cyborg: ["black", "silver", "red"],
  tatar: ["black", "brown", "light"],
  wordlord: ["blond", "purple", "silver"],
};
const HAIR_ARMOR = {
  pads: ["brown", "black", "ginger", "light"],
  steel: ["black", "brown", "silver", "blond"],
  spikearmor: ["black", "red", "silver"],
  cyber: ["black", "blue", "mint"],
  goldarmor: ["blond", "brown", "ginger"],
  dragonarmor: ["ginger", "brown", "black"],
  mech: ["ginger", "black", "silver"],
  titan: ["black", "red", "silver"],
  stararmor: ["purple", "silver", "blue"],
  supernova: ["blond", "ginger", "silver"],
};
export function hairMatches(eq) {
  const base = HAIR_FOR[COSTUME_KEY[eq.costume] || "school"] || [];
  const arm = HAIR_ARMOR[eq.armor];
  if (!arm) return base;
  const both = base.filter((h) => arm.includes(h));
  return both.length ? both : base;
}
export const LOOK_FULLHELM = ["knight", "horns", "dragonhelm", "spacehelm", "tubeteika"]; // cover the top of the head
