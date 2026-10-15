// Гардероб: костюмы, внешность, слоты, предметы, цены, прокачка, ауры.
import { P } from "../core/profile.js";

export const COSTUMES = {
  school:{skin:"#f2c09a",hair:"#5a3a22",eye:"#1d2f5c",mouth:"#b5485a",shirt:"#3a6fd8",pants:"#1d2f5c",shoe:"#3b2a20"},
  ninja:{skin:"#f2c09a",hair:"#1e1e28",eye:"#1d2f5c",mouth:"#1e1e28",shirt:"#2a2a36",pants:"#1e1e28",shoe:"#111111"},
  space:{skin:"#f2c09a",hair:"#5a3a22",eye:"#1d2f5c",mouth:"#b5485a",shirt:"#eef2f8",pants:"#c9d3e3",shoe:"#6f7d93"},
  robot:{skin:"#9aa7bd",hair:"#6f7d93",eye:"#ff3b3b",mouth:"#4a5670",shirt:"#6f7d93",pants:"#4a5670",shoe:"#2b2b3a"},
  fire:{skin:"#f2c09a",hair:"#ff7a1a",eye:"#1d2f5c",mouth:"#b5485a",shirt:"#e8501a",pants:"#8e1d2b",shoe:"#3b2a20"},
  ice:{skin:"#d9f2ff",hair:"#9fd0f0",eye:"#1d4f8c",mouth:"#5a8fc0",shirt:"#7fd3ff",pants:"#3a6fd8",shoe:"#1d4f8c"},
  shadow:{skin:"#6a6a8a",hair:"#15121f",eye:"#ff3b3b",mouth:"#15121f",shirt:"#2a2238",pants:"#1a1428",shoe:"#0d0a14"},
  tatar:{skin:"#f2c09a",hair:"#3b2418",eye:"#1d2f5c",mouth:"#b5485a",shirt:"#ffffff",pants:"#3a3a5a",shoe:"#2b9348"},
  gold:{skin:"#f2c09a",hair:"#ffd84a",eye:"#1d2f5c",mouth:"#b5485a",shirt:"#f0a000",pants:"#b07800",shoe:"#7a5200"}
};
/* appearance: free to change, applied on top of the costume */
export const LOOK_HAIR = {auto:["Как у костюма",null], brown:["Каштановые","#5a3a22"], black:["Чёрные","#1e1e28"], light:["Русые","#9a6a3a"], blond:["Светлые","#e8c35a"],
  ginger:["Рыжие","#c8541e"], red:["Красные","#c0283a"], silver:["Серебряные","#c9d3e3"], blue:["Синие","#3a6fd8"], mint:["Мятные","#3fbf9a"], purple:["Фиолетовые","#7a4fd6"]};
export const LOOK_SKIN = {auto:["Как у костюма",null], s1:["Светлая","#f8dcc4"], s2:["Обычная","#f2c09a"], s3:["Смуглая","#d9a27a"], s4:["Тёмная","#a8714f"], s5:["Очень тёмная","#85563a"]};
export const LOOK_EYE = {auto:["Как у костюма",null], blue:["Синие","#1d2f5c"], brown:["Карие","#5a3a22"], green:["Зелёные","#2b7a3a"], grey:["Серые","#4a5670"]};
export const LOOK_STYLE = {classic:"Классика", spiky:"Ёжик", bangs:"Чёлка", long:"Длинные", mohawk:"Ирокез"};
export const LOOK_MASKED = ["robot","alien","skeleton","spaceknight","shadow"];   // face fully covered by the costume
export const LOOK_NOSKIN = ["ice"];                                               // stylised skin stays
// which hair colours suit which outfit: costume first, armor narrows it down
const HAIR_FOR = {school:["brown","black","light","blond","ginger"], ninja:["black","red","silver"], space:["blond","brown","ginger","light"], fire:["ginger","red","black"],
  ice:["silver","blond","blue"], gold:["blond","brown","ginger"], cyberninja:["black","blue","mint"], dragonknight:["brown","ginger","black"], galaxy:["purple","silver","blue"],
  cyborg:["black","silver","red"], tatar:["black","brown","light"], wordlord:["blond","purple","silver"]};
const HAIR_ARMOR = {pads:["brown","black","ginger","light"], steel:["black","brown","silver","blond"], spikearmor:["black","red","silver"], cyber:["black","blue","mint"], goldarmor:["blond","brown","ginger"],
  dragonarmor:["ginger","brown","black"], mech:["ginger","black","silver"], titan:["black","red","silver"], stararmor:["purple","silver","blue"], supernova:["blond","ginger","silver"]};
export function hairMatches(eq){
  const base = HAIR_FOR[COSTUME_KEY[eq.costume] || "school"] || [];
  const arm = HAIR_ARMOR[eq.armor];
  if (!arm) return base;
  const both = base.filter(h => arm.includes(h));
  return both.length ? both : base;
}
export const LOOK_FULLHELM = ["knight","horns","dragonhelm","spacehelm","tubeteika"];          // cover the top of the head
export const shadeHex = (hex, f) => "#" + [1,3,5].map(i => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i+2), 16) * f))).toString(16).padStart(2, "0")).join("");
export const heroLook = () => Object.assign({hair:"auto", skin:"auto", eye:"auto", style:"classic"}, (typeof P === "object" && P && P.look) || {});

export const SLOTS = [
  ["weapon","Оружие"],["armor","Броня"],["helmet","Шлем"],["back","Спина"],["pet","Питомец"],["aura","Аура"],["costume","Костюм"]
];
/* Prices follow one ladder (see RARITY): ОБЫЧНЫЙ < 400, РЕДКИЙ 400–1499, ЭПИК 1500–4999, ЛЕГЕНДА 5000–14999, МИФ 15000+.
   Rough income: 15 minutes a day gives about 150–250 coins. */
export const ITEMS = [
  // weapons: school stuff → melee → guns → energy → mythic tech
  {id:"pencil",slot:"weapon",name:"Карандаш",price:0,lvl:1,dmg:10,fx:"slash",col:"#e0a800",perk:"Урон 10"},
  {id:"ruler",slot:"weapon",name:"Линейка-меч",price:60,lvl:1,dmg:11,fx:"slash",col:"#c9a227",perk:"Урон 11"},
  {id:"pen",slot:"weapon",name:"Синяя ручка",price:150,lvl:2,dmg:12,fx:"slash",col:"#1f4fd1",perk:"Урон 12"},
  {id:"spikebat",slot:"weapon",name:"Шипастая бита",price:450,lvl:4,dmg:13,fx:"smash",col:"#a8743f",perk:"Урон 13, сокрушающий удар"},
  {id:"blaster",slot:"weapon",name:"Бластер",price:800,lvl:6,dmg:15,fx:"bullets",col:"#45d1e6",perk:"Урон 15, стреляет лазером"},
  {id:"firestaff",slot:"weapon",name:"Огненный посох",price:1600,lvl:8,dmg:16,fx:"fire",col:"#ff7a1a",perk:"Урон 16, огненные шары"},
  {id:"lasersword",slot:"weapon",name:"Лазерный меч",price:2200,lvl:10,dmg:18,fx:"saber",col:"#45d1e6",perk:"Урон 18, светящийся разрез крест-накрест"},
  {id:"hammer",slot:"weapon",name:"Молот грома",price:3000,lvl:12,dmg:20,fx:"bolt",col:"#ffd23f",perk:"Урон 20, бьёт молнией"},
  {id:"goldsword",slot:"weapon",name:"Золотой меч",price:4000,lvl:13,dmg:21,fx:"goldslash",col:"#f0a000",perk:"Урон 21, двойной золотой удар"},
  {id:"dualblaster",slot:"weapon",name:"Двойные бластеры",price:5500,lvl:14,dmg:23,fx:"bullets2",col:"#ff7a1a",perk:"Урон 23, очередь из двух стволов"},
  {id:"rocket",slot:"weapon",name:"Ракетница",price:7500,lvl:16,dmg:25,fx:"rocket",col:"#d62839",perk:"Урон 25, ракета со взрывом"},
  {id:"scythe",slot:"weapon",name:"Плазменная коса",price:10000,lvl:18,floor:10,dmg:28,fx:"scythe",col:"#c77dff",perk:"Урон 28, широкий плазменный взмах"},
  {id:"railgun",slot:"weapon",name:"Рельсотрон",price:16000,lvl:21,floor:20,dmg:32,fx:"rail",col:"#45d1e6",perk:"Урон 32, сверхзвуковой выстрел с ударной волной"},
  {id:"dragonblade",slot:"weapon",name:"Клинок Дракона",price:22000,lvl:24,floor:30,dmg:37,fx:"fireslash",col:"#ff7a1a",perk:"Урон 37, огненный разрез"},
  {id:"annihilator",slot:"weapon",name:"Аннигилятор",price:32000,lvl:28,floor:45,dmg:46,fx:"annihilate",col:"#ff4fd8",perk:"Урон 46, разрушительный мега-луч, трясёт всю арену"},
  // armor
  {id:"noarmor",slot:"armor",name:"Без брони",price:0,lvl:1,perk:"Ничего"},
  {id:"pads",slot:"armor",name:"Шипастые наплечники",price:250,lvl:3,hp:1,perk:"+1 сердце"},
  {id:"steel",slot:"armor",name:"Стальная броня",price:900,lvl:6,hp:2,perk:"+2 сердца"},
  {id:"spikearmor",slot:"armor",name:"Броня с шипами",price:1900,lvl:9,hp:2,spikes:6,perk:"+2 сердца, шипы ранят босса, когда он бьёт"},
  {id:"cyber",slot:"armor",name:"Кибер-броня",price:3200,lvl:12,hp:3,perk:"+3 сердца"},
  {id:"goldarmor",slot:"armor",name:"Золотая броня",price:6000,lvl:15,hp:3,coinMul:1.25,perk:"+3 сердца, монеты +25%"},
  {id:"dragonarmor",slot:"armor",name:"Броня дракона",price:9000,lvl:18,floor:10,hp:4,spikes:10,perk:"+4 сердца, шипы 10"},
  {id:"mech",slot:"armor",name:"Мех-броня",price:16000,lvl:22,floor:20,hp:5,coinMul:1.3,perk:"+5 сердец, монеты +30%"},
  {id:"titan",slot:"armor",name:"Броня Титана",price:22000,lvl:25,floor:35,hp:6,spikes:16,perk:"+6 сердец, шипы 16"},
  {id:"stararmor",slot:"armor",name:"Звёздная броня",price:30000,lvl:28,floor:50,hp:7,coinMul:1.5,perk:"+7 сердец, монеты +50%"},
  // helmet
  {id:"nohelmet",slot:"helmet",name:"Без шлема",price:0,lvl:1,perk:"Ничего"},
  {id:"band",slot:"helmet",name:"Боевая повязка",price:80,lvl:1,perk:"Просто круто"},
  {id:"tubeteika",slot:"helmet",name:"Татарская тюбетейка",price:0,gift:true,lvl:1,xpMul:1.1,perk:"Подарок Ралины: опыт +10%"},
  {id:"knight",slot:"helmet",name:"Шлем с пером",price:550,lvl:4,shield:1,perk:"Щит: блокирует 1 ошибку в бою"},
  {id:"horns",slot:"helmet",name:"Рогатый шлем",price:1700,lvl:8,shield:1,firstCrit:true,perk:"Щит 1, первый удар в бою критический"},
  {id:"visor",slot:"helmet",name:"Кибер-визор",price:2800,lvl:11,shield:2,perk:"Щит: блокирует 2 ошибки в бою"},
  {id:"crown",slot:"helmet",name:"Корона",price:5500,lvl:15,shield:2,xpMul:1.25,perk:"Щит 2, опыт +25%"},
  {id:"dragonhelm",slot:"helmet",name:"Шлем дракона",price:9500,lvl:19,floor:15,shield:3,perk:"Щит 3"},
  {id:"spacehelm",slot:"helmet",name:"Шлем космодесанта",price:16000,lvl:23,floor:25,shield:3,xpMul:1.5,perk:"Щит 3, опыт +50%"},
  {id:"darkcrown",slot:"helmet",name:"Корона Тьмы",price:25000,lvl:27,floor:40,shield:4,firstCrit:true,perk:"Щит 4, первый удар крит"},
  // back
  {id:"noback",slot:"back",name:"Ничего",price:0,lvl:1,perk:"Ничего"},
  {id:"cape",slot:"back",name:"Плащ героя",price:120,lvl:2,time:1,perk:"+1 секунда на ответ"},
  {id:"wings",slot:"back",name:"Крылья",price:1000,lvl:6,time:2,perk:"+2 секунды на ответ"},
  {id:"jetpack",slot:"back",name:"Реактивный ранец",price:2400,lvl:10,time:3,perk:"+3 секунды на ответ"},
  {id:"dragonwings",slot:"back",name:"Крылья дракона",price:5500,lvl:15,time:4,perk:"+4 секунды на ответ"},
  {id:"phoenix",slot:"back",name:"Крылья феникса",price:10000,lvl:19,floor:15,time:5,revive:true,perk:"+5 секунд, один раз за забег воскрешает"},
  {id:"cloak",slot:"back",name:"Плащ-невидимка",price:18000,lvl:24,floor:30,time:5,dodge:0.25,perk:"+5 секунд, 25% шанс увернуться от удара"},
  // pet
  {id:"nopet",slot:"pet",name:"Без питомца",price:0,lvl:1,perk:"Ничего"},
  {id:"cat",slot:"pet",name:"Котик Оскар",price:500,lvl:4,heal8:true,perk:"Британец с медными глазами. Каждый 8-й верный ответ лечит сердце"},
  {id:"robodog",slot:"pet",name:"Робопёс",price:1800,lvl:9,dmgPlus:3,perk:"+3 к урону"},
  {id:"minidragon",slot:"pet",name:"Мини-дракон",price:4200,lvl:12,critMult:2.5,perk:"Крит наносит x2.5 вместо x2"},
  {id:"drone",slot:"pet",name:"Лазерный дрон",price:6500,lvl:16,drone:true,perk:"Каждый 4-й верный ответ: выстрел на двойной урон"},
  {id:"cyberwolf",slot:"pet",name:"Мини-танк",price:10000,lvl:20,floor:15,dmgPlus:4,heal6:true,perk:"+4 урона, стреляет из пушки, чинит сердце каждый 6-й ответ"},
  {id:"darkdragon",slot:"pet",name:"Дракончик Тьмы",price:20000,lvl:25,floor:35,critMult:3,perk:"Крит x3"},
  // aura (cosmetic)
  {id:"noaura",slot:"aura",name:"Без ауры",price:0,lvl:1,perk:"Ничего"},
  {id:"sparks",slot:"aura",name:"Искры",price:300,lvl:3,perk:"Для красоты"},
  {id:"fireaura",slot:"aura",name:"Огненная аура",price:1100,lvl:7,perk:"Для красоты"},
  {id:"storm",slot:"aura",name:"Грозовая аура",price:2200,lvl:10,perk:"Для красоты"},
  {id:"galaxy",slot:"aura",name:"Аура галактики",price:5500,lvl:15,perk:"Космическое сияние"},
  {id:"dragonfire",slot:"aura",name:"Пламя дракона",price:9500,lvl:20,floor:15,perk:"Огненное сияние"},
  {id:"godbolt",slot:"aura",name:"Молнии богов",price:18000,lvl:25,floor:30,perk:"Сияние легенды"},
  // costume (cosmetic)
  {id:"school",slot:"costume",name:"Школьник",price:0,lvl:1,perk:"Классика"},
  {id:"space",slot:"costume",name:"Космонавт",price:600,lvl:5,perk:"Скин"},
  {id:"robotc",slot:"costume",name:"Робот",price:900,lvl:6,perk:"Скин"},
  {id:"ninja",slot:"costume",name:"Ниндзя",price:1600,lvl:8,perk:"Скин"},
  {id:"firec",slot:"costume",name:"Огненный",price:2000,lvl:9,perk:"Скин"},
  {id:"icec",slot:"costume",name:"Ледяной",price:2000,lvl:9,perk:"Скин"},
  {id:"shadowc",slot:"costume",name:"Тень",price:3200,lvl:12,perk:"Скин"},
  {id:"cyberninja",slot:"costume",name:"Кибер-ниндзя",price:5500,lvl:15,perk:"Неоновый скин"},
  {id:"dragonknight",slot:"costume",name:"Рыцарь дракона",price:7000,lvl:17,perk:"Драконий скин"},
  {id:"alienc",slot:"costume",name:"Пришелец",price:8000,lvl:18,floor:10,perk:"Скин с другой планеты"},
  {id:"skeletonc",slot:"costume",name:"Скелет",price:11000,lvl:20,floor:20,perk:"Скин башни"},
  {id:"goldc",slot:"costume",name:"Золотой",price:16000,lvl:22,floor:25,perk:"Скин чемпиона"},
  {id:"galaxyc",slot:"costume",name:"Галактика",price:24000,lvl:26,floor:40,perk:"Космический скин"},
  {id:"cyborg",slot:"costume",name:"Киборг",price:32000,lvl:28,floor:50,perk:"Скин из будущего"},
  // ULTRA: top of the top, for levels 31+ and the high floors of the Tower
  {id:"comet",slot:"weapon",name:"Копьё Кометы",price:40000,lvl:31,floor:55,dmg:52,fx:"comet",col:"#45d1e6",perk:"Урон 52, ледяная комета"},
  {id:"blackhole",slot:"weapon",name:"Генератор чёрной дыры",price:60000,lvl:35,floor:70,dmg:58,fx:"blackhole",col:"#7a4fd6",perk:"Урон 58, засасывает босса в чёрную дыру"},
  {id:"novasword",slot:"weapon",name:"Меч Сверхновой",price:90000,lvl:40,floor:90,dmg:66,fx:"nova",col:"#fff3a0",perk:"Урон 66, самое мощное оружие: взрыв звезды"},
  {id:"supernova",slot:"armor",name:"Броня Сверхновой",price:70000,lvl:36,floor:75,hp:8,spikes:20,coinMul:1.6,perk:"+8 сердец, шипы 20, монеты +60%"},
  {id:"galaxycrown",slot:"helmet",name:"Корона Галактики",price:60000,lvl:34,floor:65,shield:5,xpMul:1.75,perk:"Щит 5, опыт +75%"},
  {id:"lightwings",slot:"back",name:"Крылья Света",price:80000,lvl:38,floor:80,time:6,revive:true,dodge:0.3,perk:"+6 секунд, воскрешение, 30% уклон"},
  {id:"phoenixpet",slot:"pet",name:"Феникс",price:45000,lvl:32,floor:60,dmgPlus:10,heal5:true,perk:"+10 урона, лечит каждый 5-й ответ"},
  {id:"stardragon",slot:"pet",name:"Звёздный дракон",price:75000,lvl:37,floor:85,critMult:3.5,perk:"Крит x3.5"},
  {id:"supernovaaura",slot:"aura",name:"Аура Сверхновой",price:50000,lvl:33,floor:60,perk:"Сияние звезды"},
  {id:"spaceknight",slot:"costume",name:"Космический рыцарь",price:55000,lvl:34,floor:65,perk:"Ультра-скин"},
  {id:"wordlord",slot:"costume",name:"Владыка Слова",price:100000,lvl:42,floor:100,perk:"Самый легендарный скин в игре"},
  {id:"tatarc",slot:"costume",name:"Татарский костюм",price:0,gift:true,lvl:1,perk:"Подарок Ралины: вышитая рубаха, бархатный камзол и ичиги"}
];
export const ITEM = Object.fromEntries(ITEMS.map(i => [i.id, i]));
export const RARITY = p => p >= 40000 ? ["УЛЬТРА","#ff4fd8"] : p >= 15000 ? ["МИФ","#d62839"] : p >= 5000 ? ["ЛЕГЕНДА","#c98500"] : p >= 1500 ? ["ЭПИК","#7a4fd6"] : p >= 400 ? ["РЕДКИЙ","#2f55c8"] : ["ОБЫЧНЫЙ","#5d6f93"];
export const COSTUME_KEY = {school:"school",ninja:"ninja",space:"space",robotc:"robot",firec:"fire",icec:"ice",shadowc:"shadow",goldc:"gold",
  cyberninja:"cyberninja",dragonknight:"dragonknight",alienc:"alien",skeletonc:"skeleton",galaxyc:"galaxy",cyborg:"cyborg",spaceknight:"spaceknight",wordlord:"wordlord",tatarc:"tatar"};
Object.assign(COSTUMES, {
  cyberninja:{skin:"#f2c09a",hair:"#1e1e28",eye:"#45d1e6",mouth:"#1e1e28",shirt:"#1f2440",pants:"#1e1e28",shoe:"#111111"},
  dragonknight:{skin:"#f2c09a",hair:"#7a4a26",eye:"#1d2f5c",mouth:"#b5485a",shirt:"#2b9348",pants:"#1b5e30",shoe:"#3b2a20"},
  alien:{skin:"#5cc95c",hair:"#5cc95c",eye:"#111111",mouth:"#2b5e2b",shirt:"#7a4fd6",pants:"#3d2a6b",shoe:"#1b1446"},
  skeleton:{skin:"#e9e4d4",hair:"#e9e4d4",eye:"#111111",mouth:"#111111",shirt:"#2a2a2a",pants:"#2a2a2a",shoe:"#111111"},
  galaxy:{skin:"#f2c09a",hair:"#7a4fd6",eye:"#1d2f5c",mouth:"#b5485a",shirt:"#1b1446",pants:"#140f33",shoe:"#0b0820"},
  cyborg:{skin:"#f2c09a",hair:"#1b1b1b",eye:"#1d2f5c",mouth:"#b5485a",shirt:"#1b1b1b",pants:"#2a2a36",shoe:"#111111"},
  spaceknight:{skin:"#2a2f4a",hair:"#2a2f4a",eye:"#45d1e6",mouth:"#2a2f4a",shirt:"#2a2f4a",pants:"#1f2440",shoe:"#14182b"},
  wordlord:{skin:"#f2c09a",hair:"#ffd84a",eye:"#7a4fd6",mouth:"#b5485a",shirt:"#7a4fd6",pants:"#3d2a6b",shoe:"#f0a000"}
});
export const UPGRADES = [
  {id:"str", name:"Сила", d:"+1 к урону за уровень", max:99, base:100, k:1.28},
  {id:"hp", name:"Живучесть", d:"+1 сердце за уровень", max:10, base:200, k:1.6},
  {id:"time", name:"Выдержка", d:"+0.5 секунды на ответ", max:10, base:150, k:1.45},
  {id:"gold", name:"Богатство", d:"+10% монет", max:10, base:200, k:1.5}
];
export const upCost = (u, n) => Math.round(u.base * Math.pow(u.k, n) / 10) * 10;
export const itemLocked = i => (i.floor && P.towerBest < i.floor);
export const DEFAULT_EQUIP = {weapon:"pencil",armor:"noarmor",helmet:"nohelmet",back:"noback",pet:"nopet",aura:"noaura",costume:"school"};

export const AURA_COL = {
  sparks:["#ffd84a","#fff3a0"], fireaura:["#ff7a1a","#ffd23f","#d62839"],
  storm:["#45d1e6","#a8f0ff","#7a4fd6"], rainbow:["#ff3b3b","#ff7a1a","#ffd23f","#5cc95c","#45d1e6","#7a4fd6"],
  galaxy:["#c77dff","#ffffff","#7a4fd6","#45d1e6"], dragonfire:["#ff3b3b","#ff7a1a","#ffd23f","#2b9348"], godbolt:["#ffffff","#45d1e6","#ffd23f","#a8f0ff"],
  supernovaaura:["#ffffff","#fff3a0","#ffd23f","#ff7a1a","#ff4fd8"]
};
export const EPIC_AURA = {galaxy:1, dragonfire:1, godbolt:1, supernovaaura:1};
export const AURA_GLOWC = {sparks:"#ffd84a", fireaura:"#ff7a1a", storm:"#45d1e6", galaxy:"#9a6bff", dragonfire:"#ff3b3b", godbolt:"#45d1e6", supernovaaura:"#ffb84a"};
// second animation frame for each pet: blink, tail wag, wing flap, propellers
export const PET_SPR2 = {
cat:`
..E.....E...
..EE...EE...
..EFFFFFE...
.FFFFFFFFF..
.FFMFNFMFF..
..FFMMMFF...
...LLLLL....
..LLLLLLL..E
..LSLLLSL..E
..LLLLLLL.EE
..PP.L.PPLL.`,
robodog:`
............A.....
............A.....
...........MMM....
..........MMDDM...
..........MRRDMM..
..T.......MMMMML..
...T.....DDMMM....
...T....DDMM......
...DDMMMMMMMD.....
...MCMMMCMMMD.....
...DMMMMMMMD......
....D.D.D.D.......
....M.M.M.M.......
...LL.LL.LLLL.....`,
minidragon:`
.............H..H.
..............HH..
.............GGGG.
............GGKGGG
............GGGGWR
..B.........GGG.WR
..BBB......GGG....
..BMMBBB..GGG.....
..SBMMMMBGGG......
.SGSBMMMMBGY......
TGGGGBBBBBYY......
TTG.GGGGGGYY......
.T...GGD..GD......
.....HH...HH......`,
drone:`
..YY........YY..
...L........L...
...DDDDDDDDDD...
..DMMMMMMMMMMD..
..DMCCMMMMRRMD..
..DMMMMMMMMRMD..
...DDMMMMMMDD...
.....D....D.....
....DD....DD....`,
cyberwolf:`
.........A........
..........A.......
.......DDDDD......
......DGGGGGDBBBBB
......DGCGGGDBBBBR
..DDDDDDDDDDDDD...
.DGGGGGGGGGGGGGD..
.DGYGGGGGGGGGYGD..
..TTTTTTTTTTTTT...
.TTWTTWTTWTTWTTW..
..TTTTTTTTTTTTT...`,
darkdragon:`
.............H..H.
..............HH..
.............GGGG.
............GGKGGG
............GGGGWR
..B.........GGG.WR
..BBB......GGG....
..BMMBBB..GGG.....
..SBMMMMBGGG......
.SGSBMMMMBGY......
TGGGGBBBBBYY......
TTG.GGGGGGYY......
.T...GGD..GD......
.....HH...HH......`,
phoenixpet:`
..........YY....
.........YRRR...
....Y....RRKRY..
...YRY...RRRR...
YY.YRRY.RRRR....
YRY.YRRRRRRR....
.YRY.RRRRRRR....
..YRRRRRRRRR....
...YYRRRRRR.....
.....YYRRR......
.......K.K......
.......K.K......`,
stardragon:`
.............H..H.
..............HH..
.............GGGG.
............GGKGGG
............GGGGWR
..B.........GGG.WR
..BBB......GGG....
..BMMBBB..GGG.....
..SBMMMMBGGG......
.SGSBMMMMBGY......
TGGGGBBBBBYY......
TTG.GGGGGGYY......
.T...GGD..GD......
.....HH...HH......`
};
