// Забег: старт кампании, башни и тренировок, босс, победа, конец игры. G — состояние забега.
import { $, TOUCH, esc } from "../lib/dom.js";
import { plural } from "../lib/text.js";
import { pick, shuffle } from "../lib/random.js";
import { ITEMS } from "../content/items.js";
import { AB, BOSSES, LORE, WIN_LORE, defeatedWord, towerBoss } from "../content/bosses.js";
import { PALS, SPR } from "../content/sprites.js";
import { drawHero } from "../render/hero.js";
import { drawBoss, drawSprite } from "../render/sprite.js";
import { errWords, newWords, poolFor } from "../topics/words/pools.js";
import { P, giftRalina, save } from "../state/profile.js";
import { settings } from "../state/settings.js";
import { gear } from "../progress/gear.js";
import { quest, touchDay } from "../progress/daily.js";
import { blockedToday, ensureDay, limitReason } from "../progress/limits.js";
import { addCoins, addXP, grantChest } from "../progress/rewards.js";
import { checkAch } from "../progress/achievements.js";
import { sfx } from "../audio/sfx.js";
import { duckMusic, stopMusic } from "../audio/music.js";
import { bossCv, heroCv, renderHUD } from "./hud.js";
import { clearRound, later, nextQ } from "./round.js";
import { DIFF_NAME, applyDiff, diffMul } from "./difficulty.js";
import { toast } from "../ui/toast.js";
import { show } from "../ui/screens.js";
import { confetti } from "../ui/confetti.js";
import { heroCard, home } from "../ui/screens/home.js";

const loreText = (t) => esc(t.replace(/\{name\}/g, P.name || "герой"));
export let G = null;
function newRun(kind) {
  touchDay();
  const g = gear();
  G = {
    kind,
    hearts: g.maxH,
    score: 0,
    streak: 0,
    bestStreak: 0,
    mistakes: {},
    beaten: 0,
    floor: 0,
    xpGot: 0,
    coinsGot: 0,
    items: [],
    timers: [],
    ints: [],
    type: settings.play === "type",
    healCount: 0,
    qid: 0,
  };
  $("opts").hidden = G.type;
  $("typer").hidden = !G.type;
  document.body.classList.toggle("kb", TOUCH && G.type);
  drawHero(heroCv, P.equip, $("hero-aura"));
  show("s-game");
}
export function startTraining(kind) {
  const pool = kind === "err" ? errWords() : newWords().slice(0, 20);
  if (!pool.length) {
    toast(kind === "err" ? "Слов с ошибками нет. Отлично!" : "Новых слов не осталось: все уже встречались!", "quest");
    return;
  }
  newRun("training");
  G.trainKind = kind;
  G.trainPool = pool;
  const g = gear(),
    lvlIdx = Math.min(P.beaten.length, BOSSES.length - 1);
  const b =
    kind === "err"
      ? {
          name: "Тень Ошибок",
          spr: "ghost",
          pal: "ghost",
          f: true,
          ab: [],
          pool: "train",
          idx: lvlIdx,
          filter: "brightness(.6) saturate(1.6) hue-rotate(200deg)",
          taunts: ["Я помню все твои ошибки!", "Опять эта буква?", "Ну-ка, вспомни правило!"],
        }
      : {
          name: "Книга Знаний",
          spr: "book",
          pal: "book",
          f: true,
          ab: [],
          pool: "train",
          idx: lvlIdx,
          filter: "hue-rotate(160deg) saturate(1.3)",
          taunts: ["Новое слово! Запоминай!", "Читай внимательно!", "Это слово ты ещё не встречал!"],
        };
  b.hp = Math.round(Math.max(6, Math.min(20, pool.length)) * (g.dmg * 1.6));
  b.time = 12;
  b.training = kind;
  startBoss(b);
}
export function startCampaign(idx) {
  newRun("campaign");
  G.bossIdx = idx;
  startBoss(BOSSES[idx]);
}
export function startTower() {
  newRun("tower");
  G.floor = 1;
  startBoss(towerBoss(1));
}
function startBoss(b) {
  clearRound();
  b = applyDiff(b);
  const g = gear();
  G.boss = b;
  G.hp = b.hp;
  G.queue = shuffle(poolFor(b));
  G.shieldLeft = g.shield;
  G.armorLeft = b.ab.includes("armor") ? 2 : 0;
  G.firstHit = false;
  G.q = 0;
  G.enraged = false;
  G.bossMistakes = 0;
  G.angryShown = false;
  $("boss-wrap").classList.remove("angry");
  bossCv.className = "";
  $("boss-wrap").style.filter = b.filter || "";
  $("boss-wrap").classList.remove("enraged");
  drawBoss(bossCv, b);
  heroCv.className = "";
  drawHero(heroCv, P.equip, $("hero-aura"));
  $("boss-name").textContent = b.name;
  $("boss-num").textContent =
    G.kind === "tower" ? `ЭТАЖ ${b.floor}` : G.kind === "training" ? "ТРЕНИРОВКА" : `${b.idx + 1}/${BOSSES.length}`;
  $("boss-abil").innerHTML = b.ab
    .map((a) => `<span class="chip${a === "enrage" ? " red" : ""}" title="${esc(AB[a].d)}">${AB[a].n}</span>`)
    .join("");
  $("word").innerHTML = "";
  $("feedback").textContent = "";
  [0, 1].forEach((i) => {
    $("opt" + i).disabled = true;
    $("opt" + i).querySelector("span").textContent = "";
  });
  renderHUD();
  // intro
  const ov = $("boss-over");
  ov.hidden = false;
  ov.innerHTML = `<canvas id="intro-cv"></canvas><h2>${esc(b.name)}</h2>
    ${LORE[b.name] && G.kind !== "tower" ? `<p class="lore">${loreText(LORE[b.name])}</p>` : ""}
    ${b.training ? `<p class="lore">${b.training === "err" ? `Тренировка: ${G.trainPool.length} ${plural(G.trainPool.length, ["слово", "слова", "слов"])}, в которых ты ошибался. Каждый верный ответ стирает ошибку из памяти Тени.` : `Тренировка: ${G.trainPool.length} ${plural(G.trainPool.length, ["слово", "слова", "слов"])}, которые ты ещё не встречал. Запоминай!`}</p>` : ""}
    ${b.diff ? `<p class="note"><b>${b.diff === "b" ? "Сложный" : "Средний"} режим:</b> босс злее обычного</p>` : ""}
    ${b.ab.length ? `<ul>${b.ab.map((a) => `<li>${AB[a].n}: ${esc(AB[a].d)}</li>`).join("")}</ul>` : b.training ? "" : b.spr === "ralina" ? "<p>Добрая, но строгая. Разминка перед настоящими монстрами! Победишь, и она тебя чем-то угостит.</p>" : "<p>Разминка!</p>"}
    <p class="note">Жизни ${b.hp} · время ${Math.round((b.time + g.time) * (G.type ? 1.8 : 1))} с · слова: ${DIFF_NAME[settings.words] || "по боссам"}</p>
    <button class="btn primary" id="btn-fight">Бой!</button>`;
  drawBoss($("intro-cv"), b);
  $("intro-cv").style.filter = b.filter || "";
  $("opts").hidden = true;
  $("typer").hidden = true;
  $("btn-fight").onclick = () => {
    const lr = limitReason();
    if (lr) {
      limitStop(lr);
      return;
    }
    ensureDay().battles++;
    save();
    ov.hidden = true;
    $("opts").hidden = G.type;
    $("typer").hidden = !G.type;
    nextQ();
    if (G.type && TOUCH && !G.scrolled) {
      G.scrolled = true;
      setTimeout(() => {
        try {
          $("typer").scrollIntoView({ block: "end" });
        } catch (e) {}
      }, 400);
    }
  };
  $("btn-fight").focus();
}
export function bossDown() {
  clearRound();
  const b = G.boss,
    g = gear();
  G.beaten++;
  P.tot.bosses++;
  const flawless = G.bossMistakes === 0;
  if (flawless) P.tot.flawless++;
  let unlockedNew = false;
  if (settings.words === "b" && G.kind !== "training") P.tot.hardWins = (P.tot.hardWins || 0) + 1;
  if (G.hearts === 1) P.tot.clutch = (P.tot.clutch || 0) + 1;
  if (G.kind === "training") {
    if (b.training === "err") P.tot.errRuns = (P.tot.errRuns || 0) + 1;
    else P.tot.newRuns = (P.tot.newRuns || 0) + 1;
  } else if (G.kind === "campaign") {
    if (!P.beaten.includes(b.idx)) P.beaten.push(b.idx);
    if (b.spr === "ralina" && !P.lep) {
      giftRalina(true);
      G.hearts++;
      G.gotGift = true;
    }
    if (b.idx + 1 < BOSSES.length && P.unlocked < b.idx + 1) {
      P.unlocked = b.idx + 1;
      unlockedNew = true;
    }
  } else {
    const prev = P.towerBest;
    P.towerBest = Math.max(P.towerBest, b.floor);
    quest("tower");
    if (P.towerBest > prev) {
      const un = ITEMS.filter((i) => i.floor && i.floor > prev && i.floor <= P.towerBest).map((i) => i.name);
      if (un.length) setTimeout(() => toast(`Башня открыла в гардеробе: ${un.join(", ")}`, "ach"), 1200);
    }
    if (b.floor % 10 === 0) {
      const bonus = addCoins(300 + b.floor * 20, false);
      setTimeout(() => toast(`Этаж ${b.floor} покорён! Бонус +${bonus} монет`, "ach"), 600);
    }
  }
  save();
  $("boss-wrap").classList.remove("angry");
  bossCv.className = "dead";
  sfx.fanfare(G.kind === "campaign" && b.idx === BOSSES.length - 1);
  duckMusic(2600);
  G.score += 50;
  const bossCoins = addCoins(Math.round((G.kind === "tower" ? 30 + b.floor * 9 : 30 + b.idx * 9) * diffMul()));
  addXP(Math.round((G.kind === "tower" ? 30 + b.floor * 4 : 30 + b.idx * 5) * diffMul()));
  const chest = grantChest(G.kind === "tower" ? (b.floor % 5 === 0 ? 3 : 1) : unlockedNew ? 2 : 1, null);
  quest("bosses");
  if (flawless) quest("flawless");
  if (G.hearts < g.maxH) G.hearts++;
  checkAch();
  renderHUD();
  const lastCampaign = G.kind === "campaign" && b.idx === BOSSES.length - 1;
  if (G.kind === "training") {
    later(() => {
      const ov = $("boss-over");
      ov.hidden = false;
      $("opts").hidden = true;
      $("typer").hidden = true;
      $("word").innerHTML = "";
      $("feedback").textContent = "";
      confetti(120, 2200);
      const left = b.training === "err" ? errWords().length : newWords().length;
      ov.innerHTML = `<div class="victory"><b>ТРЕНИРОВКА ПРОЙДЕНА!</b><span>${P.name ? esc(P.name) + ", " : ""}так держать!</span></div>
        <p class="reward">+${bossCoins + chest.coins} монет${flawless ? " · без ошибок!" : ""}</p>
        <p>${b.training === "err" ? (left ? `Осталось слов с ошибками: <b>${left}</b>` : "Все ошибки исправлены!") : left ? `Ещё не встречалось: <b>${left}</b>` : "Ты встретил все слова!"}</p>
        <div class="row" style="justify-content:center">${left ? `<button class="btn primary" id="btn-train-more">Ещё тренировка</button>` : ""}<button class="btn" id="btn-train-home">На главную</button></div>`;
      if (left)
        $("btn-train-more").onclick = () => {
          const k = b.training;
          stopGame();
          if (!blockedToday()) startTraining(k);
        };
      $("btn-train-home").onclick = home;
    }, 1100);
    return;
  }
  later(() => {
    const ov = $("boss-over");
    ov.hidden = false;
    $("opts").hidden = true;
    $("typer").hidden = true;
    $("word").innerHTML = "";
    $("feedback").textContent = "";
    const reward = `<p class="reward">+${bossCoins + chest.coins} монет${flawless ? " · без ошибок!" : ""}</p>${chest.item ? `<p class="reward">В сундуке: ${esc(chest.item.name)}!</p>` : ""}`;
    const praise = pick([
      "ты наш герой!",
      "так держать!",
      "вот это удар!",
      "отличная работа!",
      "словарь гордится тобой!",
      "ты лучше всех!",
      "настоящий чемпион!",
    ]);
    const cheer = `<div class="victory"><b>ПОБЕДА!</b><span>${P.name ? esc(P.name) + ", " + praise : praise.charAt(0).toUpperCase() + praise.slice(1)}</span></div>`;
    confetti(lastCampaign ? 260 : 150, lastCampaign ? 3600 : 2600);
    if (lastCampaign) {
      ov.innerHTML = `${cheer}<p>${esc(b.name)} ${defeatedWord(b)}!</p>${WIN_LORE[b.name] ? `<p class="lore">${loreText(WIN_LORE[b.name])}</p>` : ""}<canvas class="chest" id="chest-cv"></canvas>${reward}<p><b>Кампания пройдена!</b> Дальше ждёт Башня.</p>`;
      drawSprite($("chest-cv"), SPR.chest, PALS.chest);
      later(() => endGame(true), 2200);
      return;
    }
    const nb = G.kind === "tower" ? null : BOSSES[b.idx + 1];
    const gift = G.gotGift;
    G.gotGift = false;
    ov.innerHTML = `${cheer}<p>${esc(b.name)} ${defeatedWord(b)}!</p>${G.kind !== "tower" && WIN_LORE[b.name] ? `<p class="lore">${loreText(WIN_LORE[b.name])}</p>` : ""}
      ${gift ? `<div class="gifts"><canvas id="gift-lep"></canvas><canvas id="gift-hat"></canvas></div><p class="reward">Подарки от Ралины: лепёшка с каймаком (+1 сердце навсегда) и татарский национальный костюм с тюбетейкой, уже на тебе!</p>` : `<canvas class="chest" id="chest-cv"></canvas>`}${reward}
      ${chest.item ? `<button class="link" id="btn-equip-new">Надеть ${esc(chest.item.name)}</button>` : ""}
      <p>${G.kind === "tower" ? `Следующий этаж: ${b.floor + 1}` : `${unlockedNew ? "Открыт новый босс" : "Следующий босс"}: <b>${esc(nb.name)}</b>`}</p>
      <button class="btn primary" id="btn-next">Дальше</button>`;
    if (gift) {
      drawSprite($("gift-lep"), SPR.lep, PALS.lep);
      drawHero($("gift-hat"), {
        ...P.equip,
        weapon: "none",
        armor: "noarmor",
        back: "noback",
        pet: "nopet",
        aura: "noaura",
      });
      sfx.level();
      renderHUD();
      drawHero(heroCv, P.equip, $("hero-aura"));
    } else drawSprite($("chest-cv"), SPR.chest, PALS.chest);
    if (chest.item)
      $("btn-equip-new").onclick = () => {
        P.equip[chest.item.slot] = chest.item.id;
        save();
        drawHero(heroCv, P.equip, $("hero-aura"));
        $("btn-equip-new").textContent = "Надето!";
        $("btn-equip-new").disabled = true;
        renderHUD();
      };
    $("btn-next").onclick = () => {
      if (G.kind === "tower") {
        G.floor++;
        startBoss(towerBoss(G.floor));
      } else {
        G.bossIdx++;
        startBoss(BOSSES[G.bossIdx]);
      }
    };
    $("btn-next").focus();
  }, 1100);
}
export function endGame(won) {
  stopGame(false);
  if (!won) sfx.lose();
  const isRecord = G.score > P.best;
  P.best = Math.max(P.best, G.score);
  save();
  const tower = G.kind === "tower";
  $("end-title").textContent = won ? "Кампания пройдена!" : tower ? `Башня: этаж ${G.floor}` : "Босс оказался сильнее";
  let sub = won
    ? "Словарь спасён! Теперь попробуй Башню."
    : "Монеты и опыт сохранились. Загляни в гардероб и попробуй ещё раз.";
  if (isRecord && G.score > 0) sub = `Новый рекорд очков! ${sub}`;
  $("end-sub").textContent = sub;
  heroCard("end");
  const cells = [
    ["Очки", G.score + (isRecord ? " ★" : "")],
    ["Монеты", "+" + G.coinsGot],
    ["Опыт", "+" + G.xpGot],
    ["Лучшая серия", G.bestStreak],
  ];
  if (tower) cells.push(["Рекорд башни", `этаж ${P.towerBest}`]);
  else cells.push(["Боссов побеждено", G.beaten]);
  cells.push(["Всего монет", P.coins]);
  $("end-stats").innerHTML = cells.map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join("");
  $("end-loot").hidden = !G.items.length;
  $("end-loot").innerHTML = G.items.length
    ? `<h2>Новые предметы</h2><ul>${G.items.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>`
    : "";
  const m = Object.entries(G.mistakes).sort((a, b) => b[1] - a[1]);
  $("end-mist").innerHTML = m.length
    ? `<h2>Повторить слова</h2><ul>${m.map(([w, n]) => `<li>${esc(w)}${n > 1 ? ` <small>x${n}</small>` : ""}</li>`).join("")}</ul>`
    : `<h2>Ни одной ошибки!</h2>`;
  show("s-end");
}
export function stopGame(drop = true) {
  document.body.classList.remove("kb");
  stopMusic();
  if (G) {
    clearRound();
    G.timers.forEach(clearTimeout);
    G.timers = [];
  }
  if (drop) G = null;
}
export function limitStop(r) {
  stopGame(false);
  const ov = $("boss-over");
  ov.hidden = false;
  $("opts").hidden = true;
  $("typer").hidden = true;
  ov.innerHTML = `<div class="victory"><b>НА СЕГОДНЯ ВСЁ!</b><span>${P.name ? esc(P.name) + ", ты" : "Ты"} отлично поработал</span></div>
    <p>Лимит на сегодня: <b>${esc(r)}</b>. Монеты, опыт и вещи сохранились.</p><p class="note">Завтра бои снова откроются. Отдыхай, герой!</p>
    <button class="btn primary" id="btn-lim-home">На главную</button>`;
  $("btn-lim-home").onclick = home;
  sfx.level();
}
