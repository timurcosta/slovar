"use strict";
// Награды: монеты, опыт, сундуки, задания дня, достижения, трофеи.

function addCoins(n, useMul = true){
  if (useMul) n = Math.max(1, Math.round(n * gear().coinMul));
  P.coins += n; if (G) G.coinsGot += n; save(); refreshCoins();
  return n;
}
function refreshCoins(){ ["home-coins","hud-coins","shop-coins","aw-coins","tr-coins"].forEach(id => { if ($(id)) $(id).innerHTML = coinsHTML(P.coins); }); }
function addXP(n){
  n = Math.round(n * gear().xpMul);
  const before = levelOf(P.xp);
  P.xp += n; if (G) G.xpGot += n; save();
  const after = levelOf(P.xp);
  for (let l = before + 1; l <= after; l++){
    const bonus = addCoins(60 * l, false);
    const chest = grantChest(1, null, true);
    const msg = `Уровень ${l}: ${TITLES[l-1]}! +${bonus + chest.coins} монет${chest.item ? `, ${chest.item.name}` : ""}`;
    if (G && !$("s-game").hidden){
      setTimeout(() => {
        drawHero($("hero-cv"), P.equip, $("hero-aura")); replay($("hero-cv"), "glow"); sfx.level();
        const el = document.createElement("div"); el.className = "lvlup";
        el.innerHTML = `<b>УРОВЕНЬ ${l}!</b><span>${esc(TITLES[l-1])}. +${bonus + chest.coins} монет${chest.item ? `. Сундук: ${esc(chest.item.name)}!` : ""}</span>`;
        $("arena").appendChild(el); setTimeout(() => el.remove(), 2900);
      }, 450);
    } else toast(msg);
    const unlockedNow = ITEMS.filter(i => i.lvl === l && i.price > 0).map(i => i.name);
    if (unlockedNow.length) setTimeout(() => toast(`В гардеробе открылось: ${unlockedNow.join(", ")}`), 900);
  }
  checkAch();
}
function grantChest(tier, title, noItem){
  const lvl = levelOf(P.xp);
  const coins = addCoins(25 + tier*18 + Math.floor(Math.random()*(25 + tier*18)), false);
  let item = null;
  if (!noItem && Math.random() < 0.08 + 0.04*tier){
    const cand = ITEMS.filter(i => !P.owned[i.id] && i.price > 0 && i.price < 1500 && !i.floor && i.lvl <= lvl);
    if (cand.length){ item = pick(cand); P.owned[item.id] = 1; if (G) G.items.push(item.name); save(); }
  }
  if (title) toast(`${title}: +${coins} монет${item ? `, ${item.name}!` : ""}`, "quest");
  return {coins, item};
}
const QUESTS = {
  correct:{label:n => `Ответь правильно ${n} раз`, ns:[20,30,40]},
  bosses:{label:n => n === 1 ? "Победи босса" : `Победи боссов: ${n}`, ns:[1,2,3]},
  streak:{label:n => `Сделай серию из ${n} подряд`, ns:[8,10,12], max:true},
  typed:{label:n => `Напиши целиком ${n} слов`, ns:[5,10,15]},
  flawless:{label:() => "Победи босса без ошибок", ns:[1]},
  crits:{label:n => `Нанеси ${n} критов`, ns:[8,12,16]},
  tower:{label:n => `Пройди этажей башни: ${n}`, ns:[2,4,6], needTower:true}
};
function hash(s){ let h = 2166136261; for (const c of s){ h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function ensureDaily(){
  const d = today();
  if (P.daily && P.daily.date === d) return;
  const r = rng(hash(d));
  const pool = Object.keys(QUESTS).filter(t => !QUESTS[t].needTower || towerOpen());
  const picked = [];
  while (picked.length < 3 && pool.length) picked.push(pool.splice(r()*pool.length|0, 1)[0]);
  P.daily = {date:d, bonus:false, q:picked.map(t => { const ni = r()*QUESTS[t].ns.length|0; return {t, n:QUESTS[t].ns[ni], p:0, done:false, reward:90 + ni*45}; })};
  save();
}
function quest(t, v = 1){
  ensureDaily();
  for (const q of P.daily.q){
    if (q.t !== t || q.done) continue;
    q.p = QUESTS[t].max ? Math.max(q.p, v) : q.p + v;
    if (q.p >= q.n){ q.p = q.n; q.done = true; addCoins(q.reward, false); toast(`Задание выполнено: ${QUESTS[t].label(q.n)}. +${q.reward} монет`, "quest"); sfx.coin(); }
  }
  if (!P.daily.bonus && P.daily.q.every(q => q.done)){ P.daily.bonus = true; save(); grantChest(3, "Все задания дня! Большой сундук"); }
  save();
}
function touchDay(){
  const d = today();
  if (P.days.last === d) return;
  P.days.streak = P.days.last === yesterday() ? P.days.streak + 1 : 1;
  P.days.best = Math.max(P.days.best || 0, P.days.streak);
  P.days.last = d; save();
  const bonus = addCoins(30 * Math.min(P.days.streak, 7), false);
  toast(P.days.streak > 1 ? `${P.days.streak} дня подряд! Бонус +${bonus} монет` : `Бонус за вход сегодня: +${bonus} монет`, "quest");
  checkAch();
}
const ACH = [
  {id:"first", n:"Первая победа", d:"Победи любого босса", c:() => P.tot.bosses >= 1, r:30},
  {id:"b5", n:"Охотник", d:"Пройди 5 боссов кампании", c:() => P.beaten.length >= 5, r:60},
  {id:"b10", n:"Гроза монстров", d:"Пройди 10 боссов кампании", c:() => P.beaten.length >= 10, r:100},
  {id:"b16", n:"Спаситель словаря", d:"Пройди всю кампанию", c:() => P.beaten.length >= BOSSES.length, r:300},
  {id:"c100", n:"Сотня", d:"100 правильных ответов", c:() => P.tot.correct >= 100, r:50},
  {id:"c500", n:"Пятисотка", d:"500 правильных ответов", c:() => P.tot.correct >= 500, r:120},
  {id:"c1000", n:"Тысячник", d:"1000 правильных ответов", c:() => P.tot.correct >= 1000, r:250},
  {id:"s10", n:"Комбо-мастер", d:"Серия из 10 подряд", c:() => P.bestStreak >= 10, r:60},
  {id:"s20", n:"Неудержимый", d:"Серия из 20 подряд", c:() => P.bestStreak >= 20, r:120},
  {id:"s40", n:"Машина", d:"Серия из 40 подряд", c:() => P.bestStreak >= 40, r:250},
  {id:"flaw", n:"Чистая победа", d:"Победи босса без единой ошибки", c:() => P.tot.flawless >= 1, r:60},
  {id:"flaw10", n:"Перфекционист", d:"10 боссов без ошибок", c:() => P.tot.flawless >= 10, r:200},
  {id:"type50", n:"Писатель", d:"Напиши целиком 50 слов", c:() => P.tot.typed >= 50, r:80},
  {id:"type300", n:"Журналист", d:"Напиши целиком 300 слов", c:() => P.tot.typed >= 300, r:200},
  {id:"t5", n:"Альпинист", d:"Дойди до 5 этажа башни", c:() => P.towerBest >= 5, r:80},
  {id:"t15", n:"Покоритель башни", d:"Дойди до 15 этажа башни", c:() => P.towerBest >= 15, r:200},
  {id:"t30", n:"Небоскрёб", d:"Дойди до 30 этажа башни", c:() => P.towerBest >= 30, r:400},
  {id:"buy1", n:"Модник", d:"Купи первый предмет", c:() => P.tot.bought >= 1, r:20},
  {id:"own15", n:"Коллекционер", d:"Собери 15 предметов", c:() => ITEMS.filter(i => i.price > 0 && P.owned[i.id]).length >= 15, r:150},
  {id:"l5", n:"Уровень 5", d:"Достигни 5 уровня", c:() => levelOf(P.xp) >= 5, r:50},
  {id:"l10", n:"Уровень 10", d:"Достигни 10 уровня", c:() => levelOf(P.xp) >= 10, r:150},
  {id:"l20", n:"Король грамоты", d:"Достигни 20 уровня", c:() => levelOf(P.xp) >= 20, r:500},
  {id:"l30", n:"Абсолют", d:"Достигни 30 уровня", c:() => levelOf(P.xp) >= 30, r:2000},
  {id:"t50", n:"Выше облаков", d:"Дойди до 50 этажа башни", c:() => P.towerBest >= 50, r:1500},
  {id:"leg1", n:"Легендарный", d:"Получи предмет стоимостью от 2000", c:() => ITEMS.some(i => i.price >= 2000 && P.owned[i.id]), r:300},
  {id:"myth1", n:"Мифический", d:"Получи мифический предмет", c:() => ITEMS.some(i => i.price >= 8000 && P.owned[i.id]), r:1000},
  {id:"l50", n:"Владыка Слова", d:"Достигни 50 уровня", c:() => levelOf(P.xp) >= 50, r:10000},
  {id:"t100", n:"Сотый этаж", d:"Дойди до 100 этажа башни", c:() => P.towerBest >= 100, r:8000},
  {id:"ultra1", n:"Ультра", d:"Получи ультра-предмет", c:() => ITEMS.some(i => i.price >= 40000 && P.owned[i.id]), r:3000},
  {id:"forge10", n:"Кузнец", d:"Прокачай Силу до 10", c:() => (P.up.str || 0) >= 10, r:300},
  {id:"d3", n:"Три дня подряд", d:"Играй 3 дня подряд", c:() => P.days.streak >= 3, r:60},
  {id:"d7", n:"Неделя подряд", d:"Играй 7 дней подряд", c:() => P.days.streak >= 7, r:200},
  {id:"ralina", n:"Ралина довольна", d:"Победи Репетитора Ралину", c:() => P.beaten.includes(0), r:150},
  {id:"angel", n:"Друг ангела", d:"Расколдуй Ангелику", c:() => P.beaten.includes(15), r:600},
  {id:"sister", n:"Сестра спасена", d:"Расколдуй Олесю", c:() => P.beaten.includes(20), r:1000},
  {id:"king", n:"Король повержен", d:"Победи Короля Ошибок", c:() => P.beaten.includes(BOSSES.length - 1), r:2500},
  {id:"err1", n:"Работа над ошибками", d:"Пройди тренировку по ошибкам", c:() => (P.tot.errRuns || 0) >= 1, r:200},
  {id:"err10", n:"Ошибкоборец", d:"10 тренировок по ошибкам", c:() => (P.tot.errRuns || 0) >= 10, r:1200},
  {id:"new1", n:"Первооткрыватель", d:"Пройди тренировку новых слов", c:() => (P.tot.newRuns || 0) >= 1, r:200},
  {id:"new10", n:"Исследователь", d:"10 тренировок новых слов", c:() => (P.tot.newRuns || 0) >= 10, r:1200},
  {id:"hard1", n:"Смельчак", d:"Победи босса на сложной сложности", c:() => (P.tot.hardWins || 0) >= 1, r:300},
  {id:"hard25", n:"Железный характер", d:"25 побед на сложной сложности", c:() => (P.tot.hardWins || 0) >= 25, r:2500},
  {id:"clutch", n:"На волоске", d:"Победи босса, когда осталось 1 сердце", c:() => (P.tot.clutch || 0) >= 1, r:250},
  {id:"crit100", n:"Критовик", d:"Нанеси 100 критов", c:() => P.tot.crits >= 100, r:300},
  {id:"crit1000", n:"Мастер комбо", d:"Нанеси 1000 критов", c:() => P.tot.crits >= 1000, r:2000},
  {id:"pets4", n:"Зоопарк", d:"Собери 4 питомца", c:() => ITEMS.filter(i => i.slot === "pet" && i.price > 0 && P.owned[i.id]).length >= 4, r:800},
  {id:"skins5", n:"Модный приговор", d:"Собери 5 костюмов", c:() => ITEMS.filter(i => i.slot === "costume" && i.id !== "school" && P.owned[i.id]).length >= 5, r:800},
  {id:"fullset", n:"При полном параде", d:"Надень оружие, броню, шлем, спину, питомца и ауру сразу", c:() => ["armor","helmet","back","pet","aura"].every(s => !ITEM[P.equip[s]].id.startsWith("no")) && P.equip.weapon !== "pencil", r:500},
  {id:"rich10k", n:"Копилка", d:"Накопи 10 000 монет", c:() => P.coins >= 10000, r:500},
  {id:"d30", n:"Месяц без пропусков", d:"Играй 30 дней подряд", c:() => P.days.streak >= 30, r:2000},
  {id:"words100", n:"Знаток словаря", d:"Выучи 100 слов", c:() => learnedCount() >= 100, r:1500}
];
const LEARN_N = 3;   // a word is "learned" after this many correct answers
const learnedCount = () => Object.values(stats).filter(s => s.right >= LEARN_N).length;
const TROPHY_SPR = {
medal:`
.RR.BB.
.RR.BB.
..RBB..
..MMM..
.MMLMM.
.MLMMM.
.MMMMM.
..MMM..`,
cup:`
MMMMMMM
MMLMMMM
M.MLM.M
.MMMMM.
..MMM..
...M...
..MMM..
.DDDDD.`,
star:`
...M...
..MMM..
MMMLMMM
.MMMMM.
.MM.MM.
.M...M.`,
flame:`
...M...
..MM...
..MLM..
.MMLMM.
.MLLLM.
MMLLLMM
.MMMMM.`
};
const TIER = {bronze:{M:"#c87a3a",L:"#f0b07a"}, silver:{M:"#9aa7bd",L:"#ffffff"}, gold:{M:"#f0a000",L:"#fff3a0"}, diamond:{M:"#45d1e6",L:"#ffffff"}};
const TROPHIES = [
  {id:"m10", spr:"medal", tier:"bronze", n:10, m:"learned", name:"Бронзовая медаль", d:"Выучи 10 слов", r:300},
  {id:"m25", spr:"medal", tier:"silver", n:25, m:"learned", name:"Серебряная медаль", d:"Выучи 25 слов", r:700},
  {id:"m50", spr:"medal", tier:"gold", n:50, m:"learned", name:"Золотая медаль", d:"Выучи 50 слов", r:1500},
  {id:"c100", spr:"cup", tier:"bronze", n:100, m:"learned", name:"Бронзовый кубок", d:"Выучи 100 слов", r:3000},
  {id:"c150", spr:"cup", tier:"silver", n:150, m:"learned", name:"Серебряный кубок", d:"Выучи 150 слов", r:5000},
  {id:"call", spr:"cup", tier:"gold", n:0, m:"learned", all:true, name:"Золотой кубок Словаря", d:"Выучи все словарные слова", r:12000},
  {id:"s300", spr:"star", tier:"bronze", n:300, m:"correct", name:"Звезда грамотея", d:"300 верных ответов", r:400},
  {id:"s1500", spr:"star", tier:"silver", n:1500, m:"correct", name:"Звезда отличника", d:"1500 верных ответов", r:1500},
  {id:"s5000", spr:"star", tier:"gold", n:5000, m:"correct", name:"Звезда чемпиона", d:"5000 верных ответов", r:5000},
  {id:"s10000", spr:"star", tier:"diamond", n:10000, m:"correct", name:"Алмазная звезда", d:"10000 верных ответов", r:10000},
  {id:"f7", spr:"flame", tier:"bronze", n:7, m:"days", name:"Огонёк недели", d:"Играй 7 дней подряд", r:500},
  {id:"f14", spr:"flame", tier:"silver", n:14, m:"days", name:"Пламя двух недель", d:"Играй 14 дней подряд", r:1200},
  {id:"f30", spr:"flame", tier:"gold", n:30, m:"days", name:"Вечный огонь", d:"Играй 30 дней подряд", r:3000}
];
const trophyGoal = t => t.all ? PAB.length : t.n;
const trophyVal = t => t.m === "learned" ? learnedCount() : t.m === "correct" ? P.tot.correct : Math.max(P.days.best || 0, P.days.streak || 0);
function checkTrophies(){
  P.troph = P.troph || {};
  for (const t of TROPHIES){
    if (P.troph[t.id] || trophyVal(t) < trophyGoal(t)) continue;
    P.troph[t.id] = 1; save(); addCoins(t.r, false);
    toast(`Новый трофей: ${t.name}! +${t.r} монет`, "ach"); sfx.level();
  }
}
const trophyIcon = (t, cls = "") => `<canvas class="ticon ${cls}" data-tspr="${t.spr}" data-tier="${t.tier}"></canvas>`;
function paintTrophies(root){ root.querySelectorAll("canvas[data-tspr]").forEach(c => drawSprite(c, TROPHY_SPR[c.dataset.tspr], TIER[c.dataset.tier] && {...TIER[c.dataset.tier], R:"#d62839", B:"#2f55c8", D:"#6b4e31"}, c.classList.contains("off"))); }
// best earned trophy of each kind, shown under the hero like ribbons on a uniform
function badgesHTML(){
  P.troph = P.troph || {};
  const best = {};
  for (const t of TROPHIES) if (P.troph[t.id]) best[t.spr + t.m] = t;
  const list = Object.values(best);
  return list.length ? list.map(t => trophyIcon(t)).join("") : "";
}
function renderTrophies(){
  refreshCoins();
  P.troph = P.troph || {};
  const got = TROPHIES.filter(t => P.troph[t.id]).length;
  $("tr-count").textContent = `Получено ${got} из ${TROPHIES.length}. Выучено слов: ${learnedCount()} из ${PAB.length}. Слово считается выученным после ${LEARN_N} верных ответов.`;
  $("trophies").innerHTML = TROPHIES.map(t => {
    const v = Math.min(trophyVal(t), trophyGoal(t)), on = !!P.troph[t.id];
    return `<div class="tcard${on ? "" : " off"}">${trophyIcon(t, on ? "" : "off")}<b>${esc(t.name)}</b><small>${esc(t.d)}</small>
      <div class="xp"><i style="transform:scaleX(${v / trophyGoal(t)})"></i></div><em>${on ? "ПОЛУЧЕН" : `${v} / ${trophyGoal(t)} · +${t.r}`}</em></div>`;
  }).join("");
  paintTrophies($("trophies"));
}
function checkAch(){
  checkTrophies();
  for (const a of ACH){
    if (P.ach[a.id] || !a.c()) continue;
    P.ach[a.id] = 1; save();
    addCoins(a.r, false);
    toast(`Достижение: ${a.n}! +${a.r} монет`, "ach"); sfx.coin();
  }
}
