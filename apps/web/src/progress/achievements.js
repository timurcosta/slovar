// Достижения: условия, награды, проверка.
import { ITEM, ITEMS } from "../content/items.js";
import { BOSSES } from "../content/bosses.js";
import { learnedCount } from "../state/stats.js";
import { P, save } from "../state/profile.js";
import { levelOf } from "./levels.js";
import { addCoins } from "./rewards.js";
import { checkTrophies } from "./trophies.js";
import { sfx } from "../audio/sfx.js";
import { toast } from "../ui/toast.js";

export const ACH = [
  { id: "first", n: "Первая победа", d: "Победи любого босса", c: () => P.tot.bosses >= 1, r: 30 },
  { id: "b5", n: "Охотник", d: "Пройди 5 боссов кампании", c: () => P.beaten.length >= 5, r: 60 },
  { id: "b10", n: "Гроза монстров", d: "Пройди 10 боссов кампании", c: () => P.beaten.length >= 10, r: 100 },
  { id: "b16", n: "Спаситель словаря", d: "Пройди всю кампанию", c: () => P.beaten.length >= BOSSES.length, r: 300 },
  { id: "c100", n: "Сотня", d: "100 правильных ответов", c: () => P.tot.correct >= 100, r: 50 },
  { id: "c500", n: "Пятисотка", d: "500 правильных ответов", c: () => P.tot.correct >= 500, r: 120 },
  { id: "c1000", n: "Тысячник", d: "1000 правильных ответов", c: () => P.tot.correct >= 1000, r: 250 },
  { id: "s10", n: "Комбо-мастер", d: "Серия из 10 подряд", c: () => P.bestStreak >= 10, r: 60 },
  { id: "s20", n: "Неудержимый", d: "Серия из 20 подряд", c: () => P.bestStreak >= 20, r: 120 },
  { id: "s40", n: "Машина", d: "Серия из 40 подряд", c: () => P.bestStreak >= 40, r: 250 },
  { id: "flaw", n: "Чистая победа", d: "Победи босса без единой ошибки", c: () => P.tot.flawless >= 1, r: 60 },
  { id: "flaw10", n: "Перфекционист", d: "10 боссов без ошибок", c: () => P.tot.flawless >= 10, r: 200 },
  { id: "type50", n: "Писатель", d: "Напиши целиком 50 слов", c: () => P.tot.typed >= 50, r: 80 },
  { id: "type300", n: "Журналист", d: "Напиши целиком 300 слов", c: () => P.tot.typed >= 300, r: 200 },
  { id: "t5", n: "Альпинист", d: "Дойди до 5 этажа башни", c: () => P.towerBest >= 5, r: 80 },
  { id: "t15", n: "Покоритель башни", d: "Дойди до 15 этажа башни", c: () => P.towerBest >= 15, r: 200 },
  { id: "t30", n: "Небоскрёб", d: "Дойди до 30 этажа башни", c: () => P.towerBest >= 30, r: 400 },
  { id: "buy1", n: "Модник", d: "Купи первый предмет", c: () => P.tot.bought >= 1, r: 20 },
  {
    id: "own15",
    n: "Коллекционер",
    d: "Собери 15 предметов",
    c: () => ITEMS.filter((i) => i.price > 0 && P.owned[i.id]).length >= 15,
    r: 150,
  },
  { id: "l5", n: "Уровень 5", d: "Достигни 5 уровня", c: () => levelOf(P.xp) >= 5, r: 50 },
  { id: "l10", n: "Уровень 10", d: "Достигни 10 уровня", c: () => levelOf(P.xp) >= 10, r: 150 },
  { id: "l20", n: "Король грамоты", d: "Достигни 20 уровня", c: () => levelOf(P.xp) >= 20, r: 500 },
  { id: "l30", n: "Абсолют", d: "Достигни 30 уровня", c: () => levelOf(P.xp) >= 30, r: 2000 },
  { id: "t50", n: "Выше облаков", d: "Дойди до 50 этажа башни", c: () => P.towerBest >= 50, r: 1500 },
  {
    id: "leg1",
    n: "Легендарный",
    d: "Получи предмет стоимостью от 2000",
    c: () => ITEMS.some((i) => i.price >= 2000 && P.owned[i.id]),
    r: 300,
  },
  {
    id: "myth1",
    n: "Мифический",
    d: "Получи мифический предмет",
    c: () => ITEMS.some((i) => i.price >= 8000 && P.owned[i.id]),
    r: 1000,
  },
  { id: "l50", n: "Владыка Слова", d: "Достигни 50 уровня", c: () => levelOf(P.xp) >= 50, r: 10000 },
  { id: "t100", n: "Сотый этаж", d: "Дойди до 100 этажа башни", c: () => P.towerBest >= 100, r: 8000 },
  {
    id: "ultra1",
    n: "Ультра",
    d: "Получи ультра-предмет",
    c: () => ITEMS.some((i) => i.price >= 40000 && P.owned[i.id]),
    r: 3000,
  },
  { id: "forge10", n: "Кузнец", d: "Прокачай Силу до 10", c: () => (P.up.str || 0) >= 10, r: 300 },
  { id: "d3", n: "Три дня подряд", d: "Играй 3 дня подряд", c: () => P.days.streak >= 3, r: 60 },
  { id: "d7", n: "Неделя подряд", d: "Играй 7 дней подряд", c: () => P.days.streak >= 7, r: 200 },
  { id: "ralina", n: "Ралина довольна", d: "Победи Репетитора Ралину", c: () => P.beaten.includes(0), r: 150 },
  { id: "angel", n: "Друг ангела", d: "Расколдуй Ангелику", c: () => P.beaten.includes(15), r: 600 },
  { id: "sister", n: "Сестра спасена", d: "Расколдуй Олесю", c: () => P.beaten.includes(20), r: 1000 },
  {
    id: "king",
    n: "Король повержен",
    d: "Победи Короля Ошибок",
    c: () => P.beaten.includes(BOSSES.length - 1),
    r: 2500,
  },
  {
    id: "err1",
    n: "Работа над ошибками",
    d: "Пройди тренировку по ошибкам",
    c: () => (P.tot.errRuns || 0) >= 1,
    r: 200,
  },
  { id: "err10", n: "Ошибкоборец", d: "10 тренировок по ошибкам", c: () => (P.tot.errRuns || 0) >= 10, r: 1200 },
  { id: "new1", n: "Первооткрыватель", d: "Пройди тренировку новых слов", c: () => (P.tot.newRuns || 0) >= 1, r: 200 },
  { id: "new10", n: "Исследователь", d: "10 тренировок новых слов", c: () => (P.tot.newRuns || 0) >= 10, r: 1200 },
  { id: "hard1", n: "Смельчак", d: "Победи босса на сложной сложности", c: () => (P.tot.hardWins || 0) >= 1, r: 300 },
  {
    id: "hard25",
    n: "Железный характер",
    d: "25 побед на сложной сложности",
    c: () => (P.tot.hardWins || 0) >= 25,
    r: 2500,
  },
  {
    id: "clutch",
    n: "На волоске",
    d: "Победи босса, когда осталось 1 сердце",
    c: () => (P.tot.clutch || 0) >= 1,
    r: 250,
  },
  { id: "crit100", n: "Критовик", d: "Нанеси 100 критов", c: () => P.tot.crits >= 100, r: 300 },
  { id: "crit1000", n: "Мастер комбо", d: "Нанеси 1000 критов", c: () => P.tot.crits >= 1000, r: 2000 },
  {
    id: "pets4",
    n: "Зоопарк",
    d: "Собери 4 питомца",
    c: () => ITEMS.filter((i) => i.slot === "pet" && i.price > 0 && P.owned[i.id]).length >= 4,
    r: 800,
  },
  {
    id: "skins5",
    n: "Модный приговор",
    d: "Собери 5 костюмов",
    c: () => ITEMS.filter((i) => i.slot === "costume" && i.id !== "school" && P.owned[i.id]).length >= 5,
    r: 800,
  },
  {
    id: "fullset",
    n: "При полном параде",
    d: "Надень оружие, броню, шлем, спину, питомца и ауру сразу",
    c: () =>
      ["armor", "helmet", "back", "pet", "aura"].every((s) => !ITEM[P.equip[s]].id.startsWith("no")) &&
      P.equip.weapon !== "pencil",
    r: 500,
  },
  { id: "rich10k", n: "Копилка", d: "Накопи 10 000 монет", c: () => P.coins >= 10000, r: 500 },
  { id: "d30", n: "Месяц без пропусков", d: "Играй 30 дней подряд", c: () => P.days.streak >= 30, r: 2000 },
  { id: "words100", n: "Знаток словаря", d: "Выучи 100 слов", c: () => learnedCount() >= 100, r: 1500 },
];
export function checkAch() {
  checkTrophies();
  for (const a of ACH) {
    if (P.ach[a.id] || !a.c()) continue;
    P.ach[a.id] = 1;
    save();
    addCoins(a.r, false);
    toast(`Достижение: ${a.n}! +${a.r} монет`, "ach");
    sfx.coin();
  }
}
