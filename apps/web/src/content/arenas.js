// Тёмные фоны сцены боя: у каждого босса своя тема (по палитре босса, как ATTACK), рисует render/arena.js.
// На тёмном фоне эффекты pixelfx светятся так, как задуманы.

/** Тема по палитре босса. Кого нет в списке — ночной луг. */
export const ARENA = {
  // школа: доска
  ralina: "board",
  blot: "board",
  two: "board",
  eraser: "board",
  krakoz: "board",
  angelika: "board",
  olesya: "board",
  book: "board",
  // тыквенная ночь: не страшно, а весело
  pumpkin: "spooky",
  ghost: "spooky",
  skeleton: "spooky",
  mummy: "spooky",
  zombie: "spooky",
  // под водой
  octopus: "sea",
  jelly: "sea",
  shark: "sea",
  pirate: "sea",
  // космос и роботы
  robot: "space",
  alien: "space",
  ufo: "space",
  cyber: "space",
  mech: "space",
  // зима
  snowman: "winter",
  // вулкан
  golem: "lava",
  dragon: "lava",
  // тронный зал
  king: "castle",
  shadow: "castle",
  wizard: "castle",
};

/** Тема сцены для босса b в бою вида kind (тренировка и логово задания — у доски). */
export function arenaOf(b, kind) {
  if (kind === "training" || kind === "task") return "board";
  return ARENA[b.pal] || "night";
}
