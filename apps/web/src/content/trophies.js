// Трофеи: спрайты, металлы и пороги.

export const TROPHY_SPR = {
  medal: `
.RR.BB.
.RR.BB.
..RBB..
..MMM..
.MMLMM.
.MLMMM.
.MMMMM.
..MMM..`,
  cup: `
MMMMMMM
MMLMMMM
M.MLM.M
.MMMMM.
..MMM..
...M...
..MMM..
.DDDDD.`,
  star: `
...M...
..MMM..
MMMLMMM
.MMMMM.
.MM.MM.
.M...M.`,
  flame: `
...M...
..MM...
..MLM..
.MMLMM.
.MLLLM.
MMLLLMM
.MMMMM.`,
};
export const TIER = {
  bronze: { M: "#c87a3a", L: "#f0b07a" },
  silver: { M: "#9aa7bd", L: "#ffffff" },
  gold: { M: "#f0a000", L: "#fff3a0" },
  diamond: { M: "#45d1e6", L: "#ffffff" },
};
export const TROPHIES = [
  {
    id: "m10",
    spr: "medal",
    tier: "bronze",
    n: 10,
    m: "learned",
    name: "Бронзовая медаль",
    d: "Выучи 10 слов",
    r: 300,
  },
  {
    id: "m25",
    spr: "medal",
    tier: "silver",
    n: 25,
    m: "learned",
    name: "Серебряная медаль",
    d: "Выучи 25 слов",
    r: 700,
  },
  { id: "m50", spr: "medal", tier: "gold", n: 50, m: "learned", name: "Золотая медаль", d: "Выучи 50 слов", r: 1500 },
  {
    id: "c100",
    spr: "cup",
    tier: "bronze",
    n: 100,
    m: "learned",
    name: "Бронзовый кубок",
    d: "Выучи 100 слов",
    r: 3000,
  },
  {
    id: "c150",
    spr: "cup",
    tier: "silver",
    n: 150,
    m: "learned",
    name: "Серебряный кубок",
    d: "Выучи 150 слов",
    r: 5000,
  },
  {
    id: "call",
    spr: "cup",
    tier: "gold",
    n: 0,
    m: "learned",
    all: true,
    name: "Золотой кубок Словаря",
    d: "Выучи все словарные слова",
    r: 12000,
  },
  {
    id: "s300",
    spr: "star",
    tier: "bronze",
    n: 300,
    m: "correct",
    name: "Звезда грамотея",
    d: "300 верных ответов",
    r: 400,
  },
  {
    id: "s1500",
    spr: "star",
    tier: "silver",
    n: 1500,
    m: "correct",
    name: "Звезда отличника",
    d: "1500 верных ответов",
    r: 1500,
  },
  {
    id: "s5000",
    spr: "star",
    tier: "gold",
    n: 5000,
    m: "correct",
    name: "Звезда чемпиона",
    d: "5000 верных ответов",
    r: 5000,
  },
  {
    id: "s10000",
    spr: "star",
    tier: "diamond",
    n: 10000,
    m: "correct",
    name: "Алмазная звезда",
    d: "10000 верных ответов",
    r: 10000,
  },
  { id: "f7", spr: "flame", tier: "bronze", n: 7, m: "days", name: "Огонёк недели", d: "Играй 7 дней подряд", r: 500 },
  {
    id: "f14",
    spr: "flame",
    tier: "silver",
    n: 14,
    m: "days",
    name: "Пламя двух недель",
    d: "Играй 14 дней подряд",
    r: 1200,
  },
  { id: "f30", spr: "flame", tier: "gold", n: 30, m: "days", name: "Вечный огонь", d: "Играй 30 дней подряд", r: 3000 },
];
