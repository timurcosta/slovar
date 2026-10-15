// Бой: подбор слов, сложность, раунды, ответы, эффекты, победа/поражение.
import { $, TOUCH, defeatedWord, esc, heartSVG, pick, replay, show, shuffle, toast } from "./core/helpers.js";
import { PA, PAB, PB, parseEntry } from "./data/words.js";
import { PALS, SPR, drawSprite } from "./data/sprites.js";
import { AB, BOSSES, LORE, WIN_LORE, drawBoss, loreText, towerBoss } from "./data/bosses.js";
import { ITEMS } from "./data/items.js";
import { drawHero } from "./hero.js";
import { LS, P, customRaw, giftRalina, save, settings, stats } from "./core/profile.js";
import { gear, levelOf, xpProgress } from "./core/levels.js";
import { confetti, duckMusic, sfx, startMusic, stopMusic, tone } from "./core/sound.js";
import { addCoins, addXP, checkAch, grantChest, quest, refreshCoins, touchDay } from "./core/rewards.js";
import { heroCard, renderHome } from "./screens/home.js";
import { blockedToday, ensureDay, limitReason, limitStop, plural } from "./screens/teacher.js";
import { heroFrame } from "./main.js";

export let G = null;
export const bossCv = $("boss-cv"),
  heroCv = $("hero-cv");
export const customPool = () => customRaw.split(/\n|,/).map(parseEntry).filter(Boolean);
function poolFor(b) {
  if (b.pool === "train" && G && G.trainPool) return G.trainPool;
  if (settings.words === "custom") {
    const c = customPool();
    if (c.length) return c;
  }
  if (settings.words === "a") return PA;
  if (settings.words === "b") return PB;
  if (settings.words === "ab") return PAB;
  return b.pool === "a" ? PA : b.pool === "b" ? PB : PAB;
}
const DIFF_MUL = { ab: 1.5, b: 2 };
const DIFF_BOSS = { ab: { hp: 1.3, time: 0.8, extra: 1 }, b: { hp: 1.7, time: 0.62, extra: 2 } };
const EXTRA_AB = [
  "haste",
  "swap",
  "shake",
  "ink",
  "tiny",
  "freeze",
  "fog",
  "rush",
  "flip",
  "mirror",
  "web",
  "dark",
  "double",
  "armor",
  "regen",
  "glitch",
  "cloud",
  "lens",
];
function applyDiff(b) {
  const d = DIFF_BOSS[settings.words];
  if (!d || b.training) return b;
  const ab = b.ab.filter((a) => a !== "enrage");
  shuffle(EXTRA_AB.filter((a) => !ab.includes(a)))
    .slice(0, d.extra)
    .forEach((a) => ab.push(a));
  ab.push("enrage");
  return {
    ...b,
    ab,
    hp: Math.round((b.hp * d.hp) / 10) * 10,
    time: Math.max(4, b.time * d.time),
    diff: settings.words,
  };
}
const diffMul = () => DIFF_MUL[settings.words] || 1;
const DIFF_NAME = {
  auto: "по боссам",
  a: "лёгкие (1–2 класс)",
  ab: "все вперемешку",
  b: "сложные (3–4 класс)",
  custom: "слова учителя",
};
export function syncDiff() {
  const cust = settings.words === "custom";
  $("diff-modes").hidden = cust;
  $("diff-custom").hidden = !cust;
  document.querySelectorAll('input[name="diff"]').forEach((r) => (r.checked = r.value === settings.words));
}
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
// words the pupil got wrong most (weighted: mistakes count more than later correct answers)
export function errWords() {
  const all = PAB.concat(settings.words === "custom" ? customPool() : []);
  const byWord = new Map(all.map((e) => [e.word, e]));
  return Object.entries(stats)
    .filter(([w, s]) => s.wrong > 0 && byWord.has(w) && s.wrong * 2 > s.right)
    .sort((a, b) => b[1].wrong * 2 - b[1].right - (a[1].wrong * 2 - a[1].right))
    .slice(0, 25)
    .map(([w]) => byWord.get(w));
}
export function newWords() {
  const base =
    settings.words === "custom" && customPool().length
      ? customPool()
      : settings.words === "a"
        ? PA
        : settings.words === "b"
          ? PB
          : PAB;
  return base.filter((e) => !stats[e.word]);
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
function renderHUD() {
  const g = gear(),
    l = levelOf(P.xp);
  const nH = Math.max(g.maxH, G.hearts);
  $("hearts").classList.toggle("many", nH > 9);
  $("hearts").innerHTML = Array.from({ length: nH }, (_, i) => heartSVG(i < G.hearts)).join("");
  $("st-chips").innerHTML =
    (G.shieldLeft ? `<span class="chip">ЩИТ ${G.shieldLeft}</span>` : "") +
    (G.armorLeft ? `<span class="chip red">ПАНЦИРЬ ${G.armorLeft}</span>` : "");
  $("hearts").setAttribute("aria-label", `Жизни: ${G.hearts} из ${g.maxH}`);
  $("score").textContent = G.score;
  $("streak").textContent = G.streak >= 2 ? `СЕРИЯ x${G.streak}` : "";
  $("hp-fill").style.transform = `scaleX(${Math.max(0, G.hp / G.boss.hp)})`;
  $("hud-lvl").textContent = P.name ? `${P.name.toUpperCase()} · УР ${l}` : `УР ${l}`;
  $("hud-xp").style.transform = `scaleX(${xpProgress(P.xp).frac})`;
  refreshCoins();
}
function clearRound() {
  if (!G) return;
  if (G.raf) {
    cancelAnimationFrame(G.raf);
    G.raf = null;
  }
  G.ints.forEach(clearInterval);
  G.ints = [];
}
function later(fn, ms) {
  G.timers.push(setTimeout(fn, ms));
}
function nextQ() {
  {
    const lr = limitReason();
    if (lr) {
      limitStop(lr);
      return;
    }
  }
  startMusic();
  if (!G.queue.length) G.queue = shuffle(poolFor(G.boss));
  const e = G.queue.shift();
  const slot = pick(e.slots);
  const s = e.segs[slot];
  G.cur = { e, slot, opts: shuffle([s.c, s.w]) };
  G.locked = false;
  G.q++;
  const qid = ++G.qid;
  $("word").classList.remove("fog", "flip", "shakeW", "tiny", "mirror", "dark", "lens", "glitchy");
  $("opts").classList.remove("runaway");
  if (G.type) {
    renderTyped(null);
    const inp = $("type-in");
    inp.value = "";
    inp.readOnly = false;
    $("type-go").disabled = false;
    if (document.activeElement !== inp) {
      try {
        inp.focus({ preventScroll: true });
      } catch (err) {}
    }
  } else {
    renderWord(null);
    [0, 1].forEach((i) => {
      const b = $("opt" + i);
      b.className = "opt";
      b.disabled = false;
      b.querySelector("span").textContent = G.cur.opts[i];
    });
  }
  $("feedback").textContent = "";
  $("feedback").className = "feedback";
  const ab = G.boss.ab;
  const still = () => G && G.qid === qid && !G.locked;
  if (ab.includes("shake")) $("word").classList.add("shakeW");
  if (ab.includes("tiny") && Math.random() < 0.6)
    later(() => {
      if (still()) {
        $("word").classList.add("tiny");
        say("Уменьшатор! Хи-хи");
      }
    }, 500);
  if (ab.includes("flip") && Math.random() < 0.55)
    later(
      () => {
        if (!still()) return;
        $("word").classList.add("flip");
        say("Оп! Читай вверх ногами!");
      },
      300 + Math.random() * 400,
    );
  if (ab.includes("ink") && Math.random() < 0.65)
    later(
      () => {
        if (!still()) return;
        const w = $("word");
        for (let k = 0; k < 3; k++) {
          const b = document.createElement("span"),
            sz = 34 + Math.random() * 30;
          b.className = "blot";
          Object.assign(b.style, {
            width: sz + "px",
            height: sz + "px",
            left: 10 + Math.random() * 70 + "%",
            top: Math.random() * 30 - 10 + "px",
          });
          w.appendChild(b);
        }
        say("Шлёп! Чернила!");
      },
      400 + Math.random() * 700,
    );
  const RT = roundTime() * 1000;
  if (ab.includes("lens") && Math.random() < 0.75)
    later(
      () => {
        if (still()) {
          $("word").classList.add("lens");
          say(pick(["Мои очки всё видят, а ты?", "Смотри через линзу!"]));
        }
      },
      300 + Math.random() * 500,
    );
  if (ab.includes("cloud") && Math.random() < 0.7)
    later(
      () => {
        if (!still()) return;
        const c = document.createElement("span");
        c.className = "cloudcover";
        c.innerHTML = "<small>тапни, чтобы сдуть</small>";
        const blow = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (c.classList.contains("puff")) return;
          c.classList.add("puff");
          tone(700, 0.18, "sine", 0.04, 1400);
          setTimeout(() => c.remove(), 320);
        };
        c.addEventListener("pointerdown", blow);
        c.addEventListener("mousedown", (ev) => ev.preventDefault());
        $("word").appendChild(c);
        say(pick(["Спрячу за облачком!", "Пуф! Облачко!"]));
      },
      300 + Math.random() * Math.max(400, RT * 0.3),
    );
  if (ab.includes("glitch") && Math.random() < 0.75) {
    const GL = "ЖЩЪЫЭЮЯФЦШ#%&@";
    const glitch = (n) =>
      later(
        () => {
          if (!still()) return;
          const w = $("word"),
            nodes = [];
          const walk = (el) =>
            el.childNodes.forEach((ch) => {
              if (ch.nodeType === 3) nodes.push(ch);
              else if (ch.nodeType === 1 && !ch.classList.contains("gap") && !ch.classList.contains("cloudcover"))
                walk(ch);
            });
          walk(w);
          const orig = nodes.map((t) => t.nodeValue);
          nodes.forEach(
            (t) => (t.nodeValue = t.nodeValue.replace(/[а-яё]/gi, () => GL[(Math.random() * GL.length) | 0])),
          );
          w.classList.add("glitchy");
          tone(180, 0.12, "sawtooth", 0.03, 90);
          if (!n) say("Кракозябры! Хи-хи!");
          later(() => {
            w.classList.remove("glitchy");
            nodes.forEach((t, i) => {
              if (t.isConnected) t.nodeValue = orig[i];
            });
          }, 1100);
          if (n < 1) glitch(n + 1);
        },
        (n ? 1900 : 500) + Math.random() * 900,
      );
    glitch(0);
  }
  if (ab.includes("freeze") && Math.random() < 0.7)
    later(
      () => {
        if (!still()) return;
        const els = G.type ? [$("type-in")] : [$("opt0"), $("opt1")];
        els.forEach((e) => {
          e.classList.add("frozen");
          if (G.type) e.readOnly = true;
          else e.disabled = true;
        });
        say("Заморозка! Брр!");
        later(() => {
          if (!still()) {
            els.forEach((e) => e.classList.remove("frozen"));
            return;
          }
          els.forEach((e) => {
            e.classList.remove("frozen");
            if (G.type) e.readOnly = false;
            else e.disabled = false;
          });
        }, 1500);
      },
      900 + Math.random() * Math.max(600, RT * 0.45),
    );
  if (ab.includes("mirror") && Math.random() < 0.55)
    later(
      () => {
        if (still()) {
          $("word").classList.add("mirror");
          say("Зеркало! Задом наперёд!");
        }
      },
      300 + Math.random() * 400,
    );
  if (ab.includes("dark") && Math.random() < 0.6)
    later(
      () => {
        if (still()) {
          $("word").classList.add("dark");
          say("Кто выключил свет? Хи-хи");
        }
      },
      500 + Math.random() * 600,
    );
  if (ab.includes("web") && Math.random() < 0.65) {
    if (!G.type) {
      later(() => {
        if (still()) {
          $("opts").classList.add("runaway");
          say("Паутинка качается!");
        }
      }, 400);
    } else {
      const stick = (tries) =>
        later(
          () => {
            if (!still()) return;
            const inp = $("type-in");
            if (!inp.value.trim()) {
              if (tries > 0) stick(tries - 1);
              return;
            }
            inp.value += pick(["ы", "ъ", "ь", "щ", "ж", "й"]);
            replay($("typer"), "wiggle");
            say("Хи-хи, лишняя буква! Найди её");
          },
          1600 + Math.random() * 1500,
        );
      stick(3);
    }
  }
  if (ab.includes("rush") && settings.timer && Math.random() < 0.6)
    later(
      () => {
        if (!still() || !G.rage) return;
        G.rage.t0 -= G.rage.T * 0.3;
        replay($("rage-wrap"), "wiggle");
        say("Время, вперёд!");
        tone(1200, 0.2, "square", 0.03, 2400);
      },
      900 + Math.random() * Math.max(600, RT * 0.35),
    );
  if (ab.includes("fog"))
    later(
      () => {
        if (G && G.qid === qid && !G.locked) {
          $("word").classList.add("fog");
        }
      },
      G.type ? 2200 : 1800,
    );
  if (ab.includes("swap") && G.type && Math.random() < 0.6)
    later(
      () => {
        if (!G || G.qid !== qid || G.locked) return;
        const { e } = G.cur;
        $("word").innerHTML = e.segs
          .map((s, i) =>
            s.t !== undefined ? esc(s.t) : i === G.cur.slot ? `<span class="gap decoy">${esc(s.w)}</span>` : esc(s.c),
          )
          .join("");
        say(pick(["Подсказочка от меня! Хи-хи", "Вот так правильно, честно-честно!", "Пиши как я показал!"]));
      },
      1000 + Math.random() * 800,
    );
  if (ab.includes("swap") && !G.type && Math.random() < 0.6)
    later(
      () => {
        if (!G || G.qid !== qid || G.locked) return;
        G.cur.opts.reverse();
        [0, 1].forEach((i) => ($("opt" + i).querySelector("span").textContent = G.cur.opts[i]));
        replay($("opts"), "wiggle");
        say("Путаница! Хи-хи!");
      },
      900 + Math.random() * 900,
    );
  if (ab.includes("regen")) {
    const iv = setInterval(() => {
      if (!G || G.locked || G.qid !== qid || G.hp <= 0) return;
      const before = G.hp;
      G.hp = Math.min(G.boss.hp, G.hp + 3);
      if (G.hp > before) {
        pop("+3", "heal", "72%");
        renderHUD();
      }
    }, 2000);
    G.ints.push(iv);
  }
  startRage();
}
function renderWord(chosen) {
  const { e, slot } = G.cur;
  $("word").classList.toggle("long", e.word.length > 11);
  $("word").innerHTML = e.segs
    .map((s, i) => {
      if (s.t !== undefined) return esc(s.t);
      if (i !== slot) return esc(s.c);
      if (chosen === null) return `<span class="gap">?</span>`;
      if (chosen === s.c) return `<span class="gap okc">${esc(s.c)}</span>`;
      return `<span class="gap bad">${chosen ? `<s>${esc(chosen)}</s>` : ""}${esc(s.c)}</span>`;
    })
    .join("");
}
const norm = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ");
function renderTyped(typed) {
  const { e } = G.cur;
  $("word").classList.toggle("long", e.word.length > 11);
  if (typed === null) {
    const slot = G.cur.slot;
    $("word").innerHTML = e.segs
      .map((s, i) => {
        if (s.t !== undefined) return esc(s.t);
        if (i !== slot) return esc(s.c);
        const tricky = s.c.length > 1 || s.w.length > 1 || s.c.toLowerCase() === s.w.toLowerCase();
        if (!tricky) return `<span class="gap">?</span>`;
        const [a, b] = [s.c, s.w].sort((x, y) => x.length - y.length || x.localeCompare(y, "ru"));
        return `<span class="gap hint">${esc(a)}<i>/</i>${esc(b)}</span>`;
      })
      .join("");
    return;
  }
  const ok = norm(typed) === norm(e.word);
  const body = e.segs.map((s) => (s.t !== undefined ? esc(s.t) : `<u>${esc(s.c)}</u>`)).join("");
  $("word").innerHTML = ok
    ? `<span class="wfull okw">${esc(e.word)}</span>`
    : `<span class="wfull badw">${typed ? `<s>${esc(typed)}</s>` : ""}${body}</span>`;
}
function roundTime() {
  const g = gear(),
    b = G.boss;
  let t = b.time * (G.type ? 1.8 : 1);
  if (b.ab.includes("haste")) t *= Math.pow(0.95, G.q - 1);
  if (G.enraged) t *= 0.65;
  return Math.max(3.5, t) + g.time;
}
function startRage() {
  if (G.raf) {
    cancelAnimationFrame(G.raf);
    G.raf = null;
  }
  $("rage-wrap").hidden = !settings.timer;
  $("rage-fill").style.transform = "scaleX(0)";
  if (!settings.timer) return;
  const T = roundTime() * 1000;
  G.rage = { T, t0: performance.now() };
  const tick = (now) => {
    const t0 = G.rage.t0,
      p = Math.min(1, (now - t0) / T);
    $("rage-fill").style.transform = `scaleX(${p})`;
    $("rage-sec").textContent = Math.max(0, Math.ceil((T - (now - t0)) / 1000)) + " с";
    if (p >= 1) {
      G.raf = null;
      answer(null);
    } else G.raf = requestAnimationFrame(tick);
  };
  G.raf = requestAnimationFrame(tick);
}
function pop(text, cls = "", left = "72%") {
  const el = document.createElement("div");
  el.className = "pop " + cls;
  el.textContent = text;
  el.style.left = left;
  $("arena").appendChild(el);
  setTimeout(() => el.remove(), 1000);
}
export function say(text) {
  const b = $("bubble");
  b.textContent = text;
  b.classList.add("show");
  clearTimeout(say.t);
  say.t = setTimeout(() => b.classList.remove("show"), 1700);
}
function stat(word, key) {
  const s = stats[word] || (stats[word] = { wrong: 0, right: 0 }),
    d = ensureDay();
  if (key === "right") {
    if (!s.right) d.fresh++;
    d.correct++;
  } else d.mistakes++;
  s[key]++;
  LS.set("sb_stats", stats);
  save();
}

export function rel(el) {
  const a = $("arena").getBoundingClientRect(),
    r = el.getBoundingClientRect();
  return { x: r.left - a.left, y: r.top - a.top, w: r.width, h: r.height };
}
// cut the weapon pixels out of the hero sprite, so the weapon itself can be swung around the hand
function weaponLayer() {
  const a = document.createElement("canvas"),
    b = document.createElement("canvas");
  drawHero(a, { ...P.equip }, null, 0);
  drawHero(b, { ...P.equip, weapon: "none" }, null, 0);
  const ca = a.getContext("2d"),
    da = ca.getImageData(0, 0, a.width, a.height),
    db = b.getContext("2d").getImageData(0, 0, b.width, b.height).data;
  for (let i = 0; i < da.data.length; i += 4) {
    if (
      da.data[i] === db[i] &&
      da.data[i + 1] === db[i + 1] &&
      da.data[i + 2] === db[i + 2] &&
      da.data[i + 3] === db[i + 3]
    )
      da.data[i + 3] = 0;
  }
  ca.putImageData(da, 0, 0);
  return a;
}
function swing(style, dash, glow) {
  const wrap = $("hero-aura");
  if (!G) return;
  wrap.querySelectorAll(".wpn").forEach((e) => e.remove());
  const w = weaponLayer();
  w.className = "wpn sw-" + style;
  Object.assign(w.style, {
    left: heroCv.offsetLeft + "px",
    top: heroCv.offsetTop + "px",
    width: heroCv.offsetWidth + "px",
    height: heroCv.offsetHeight + "px",
  });
  if (glow) w.style.filter = `drop-shadow(0 0 3px ${glow}) drop-shadow(0 0 6px ${glow})`;
  wrap.appendChild(w);
  G.swinging = true;
  drawHero(heroCv, { ...P.equip, weapon: "none", ...(G.petBusy ? { pet: "nopet" } : {}) }, wrap, heroFrame);
  wrap.style.setProperty("--dash", dash + "px");
  replay(wrap, "hb-" + (style === "smash" ? "smash" : "slash"));
  setTimeout(
    () => {
      w.remove();
      if (G) G.swinging = false;
      drawHero(heroCv, G && G.petBusy ? { ...P.equip, pet: "nopet" } : P.equip, wrap, heroFrame);
    },
    style === "double" ? 760 : 680,
  );
}
// cut the pet pixels out of the hero sprite, so the pet can jump / fly / recoil on its own
function petLayer() {
  const a = document.createElement("canvas"),
    b = document.createElement("canvas");
  drawHero(a, { ...P.equip, weapon: "none" }, null, 0);
  drawHero(b, { ...P.equip, weapon: "none", pet: "nopet" }, null, 0);
  const ca = a.getContext("2d"),
    da = ca.getImageData(0, 0, a.width, a.height),
    db = b.getContext("2d").getImageData(0, 0, b.width, b.height).data;
  for (let i = 0; i < da.data.length; i += 4) {
    if (
      da.data[i] === db[i] &&
      da.data[i + 1] === db[i + 1] &&
      da.data[i + 2] === db[i + 2] &&
      da.data[i + 3] === db[i + 3]
    )
      da.data[i + 3] = 0;
  }
  ca.putImageData(da, 0, 0);
  return a;
}
const PET_ATK = {
  cat: "pounce",
  robodog: "bite",
  minidragon: "breath",
  darkdragon: "breath",
  stardragon: "breath",
  drone: "laser",
  cyberwolf: "shell",
  phoenixpet: "swoop",
};
const BREATH = {
  minidragon: ["#ffd23f", "#ff7a1a"],
  darkdragon: ["#ffb0f0", "#ff4fd8"],
  stardragon: ["#ffffff", "#45d1e6"],
};
function petAttack() {
  const pet = P.equip.pet,
    kind = PET_ATK[pet];
  if (!kind || !G || G.petBusy) return;
  const wrap = $("hero-aura"),
    h = rel(heroCv),
    b = rel(bossCv);
  const px = h.x + h.w * 0.4,
    py = h.y + h.h * (pet === "drone" ? 0.55 : 0.72),
    tx = b.x + b.w * 0.45,
    ty = b.y + b.h * 0.6;
  const add = (cls, style) => {
    const el = document.createElement("div");
    el.className = "fx " + cls;
    Object.entries(style).forEach(([k, v]) => (k.startsWith("--") ? el.style.setProperty(k, v) : (el.style[k] = v)));
    $("arena").appendChild(el);
    setTimeout(() => el.remove(), 700);
    return el;
  };
  const ov = petLayer();
  ov.className = "petov pa-" + kind;
  Object.assign(ov.style, {
    left: heroCv.offsetLeft + "px",
    top: heroCv.offsetTop + "px",
    width: heroCv.offsetWidth + "px",
    height: heroCv.offsetHeight + "px",
  });
  ov.style.setProperty("--dx", Math.max(30, tx - px - 10) + "px");
  wrap.querySelectorAll(".petov").forEach((e) => e.remove());
  wrap.appendChild(ov);
  G.petBusy = true;
  drawHero(heroCv, { ...P.equip, pet: "nopet", ...(G.swinging ? { weapon: "none" } : {}) }, wrap, heroFrame);
  const hitAt = { pounce: 260, bite: 240, breath: 330, laser: 120, shell: 300, swoop: 300 }[kind];
  if (kind === "breath") {
    const [c1, c2] = BREATH[pet];
    setTimeout(() => {
      const f = add("ball", {
        left: px + 10 + "px",
        top: py - 9 + "px",
        "--dx": tx - px - 10 + "px",
        "--dy": ty - py + "px",
      });
      f.style.background = `radial-gradient(circle,#fff 15%,${c1} 40%,${c2} 70%)`;
      f.style.boxShadow = `0 0 12px ${c2}`;
    }, 120);
    tone(220, 0.25, "sawtooth", 0.03, 90, 0.1);
  }
  if (kind === "laser") {
    add("beam", {
      left: px + "px",
      top: py - 2 + "px",
      width: Math.max(10, tx - px) + "px",
      color: "#ff3b3b",
      height: "3px",
    });
    tone(1500, 0.1, "square", 0.025, 2600);
  }
  if (kind === "shell") {
    add("burst", { left: px + 14 + "px", top: py - 26 + "px", color: "#ff7a1a", width: "24px", height: "24px" });
    setTimeout(
      () =>
        add("bullet", {
          left: px + 20 + "px",
          top: py - 16 + "px",
          color: "#2a2f2a",
          "--dx": tx - px - 20 + "px",
          "--dy": ty - py + 16 + "px",
        }),
      60,
    );
    tone(90, 0.25, "sawtooth", 0.06, 40);
  }
  if (kind === "pounce" || kind === "bite" || kind === "swoop")
    tone(kind === "pounce" ? 900 : 500, 0.12, "triangle", 0.03, kind === "pounce" ? 1400 : 300);
  setTimeout(() => {
    if (!G) return;
    const c = {
      pounce: "#ffffff",
      bite: "#ff3b3b",
      breath: (BREATH[pet] || [])[1],
      laser: "#ff3b3b",
      shell: "#ff7a1a",
      swoop: "#ffd23f",
    }[kind];
    if (kind === "pounce") {
      add("slash", { left: tx - 24 + "px", top: ty - 30 + "px", color: c, width: "44px", height: "44px" });
      add("slash x2", { left: tx - 24 + "px", top: ty - 30 + "px", color: c, width: "44px", height: "44px" });
    } else add("burst", { left: tx - 22 + "px", top: ty - 22 + "px", color: c, width: "44px", height: "44px" });
    replay(bossCv, "hit");
  }, hitAt);
  setTimeout(() => {
    ov.remove();
    if (G) G.petBusy = false;
    drawHero(heroCv, G && G.swinging ? { ...P.equip, weapon: "none" } : P.equip, wrap, heroFrame);
  }, 640);
}
function fx(kind, col) {
  const h = rel(heroCv),
    b = rel(bossCv);
  const sx = h.x + h.w * 0.85,
    sy = h.y + h.h * 0.45,
    tx = b.x + b.w * 0.5,
    ty = b.y + b.h * 0.5;
  const add = (cls, style, html = "") => {
    const el = document.createElement("div");
    el.className = "fx " + cls;
    Object.entries(style).forEach(([k, v]) => (k.startsWith("--") ? el.style.setProperty(k, v) : (el.style[k] = v)));
    el.innerHTML = html;
    $("arena").appendChild(el);
    setTimeout(() => el.remove(), 700);
    return el;
  };
  if (kind === "beam" || kind === "bigbeam") {
    add("beam" + (kind === "bigbeam" ? " big" : ""), {
      left: sx + "px",
      top: sy - (kind === "bigbeam" ? 6 : 3) + "px",
      width: Math.max(10, tx - sx) + "px",
      color: col,
    });
    add("burst", { left: tx - 35 + "px", top: ty - 35 + "px", color: col });
    sfx.laser();
    return 180;
  }
  if (kind === "bullets" || kind === "bullets2") {
    const nb = kind === "bullets2" ? 6 : 3;
    for (let i = 0; i < nb; i++)
      setTimeout(
        () =>
          add("bullet", {
            left: sx + "px",
            top: sy + (i % 3) * 4 - 4 + (kind === "bullets2" && i % 2 ? 10 : 0) + "px",
            color: col,
            "--dx": tx - sx + "px",
            "--dy": ty - sy + "px",
          }),
        i * 70,
      );
    sfx.laser();
    return 300;
  }
  if (kind === "fire") {
    add("ball", { left: sx - 9 + "px", top: sy - 9 + "px", "--dx": tx - sx + "px", "--dy": ty - sy + "px" });
    setTimeout(() => add("burst", { left: tx - 35 + "px", top: ty - 35 + "px", color: "#ff7a1a" }), 320);
    sfx.fire();
    return 340;
  }
  if (kind === "comet") {
    add("ball comet", { left: sx - 10 + "px", top: sy - 10 + "px", "--dx": tx - sx + "px", "--dy": ty - sy + "px" });
    setTimeout(() => {
      add("burst big", { left: tx - 50 + "px", top: ty - 50 + "px", color: "#a8f0ff" });
      add("burst", { left: tx - 35 + "px", top: ty - 35 + "px", color: "#45d1e6" });
      sfx.zap();
    }, 330);
    sfx.laser();
    return 350;
  }
  if (kind === "blackhole") {
    add("ball hole", { left: sx - 10 + "px", top: sy - 10 + "px", "--dx": tx - sx + "px", "--dy": ty - sy + "px" });
    setTimeout(() => {
      add("vortex", { left: tx - 45 + "px", top: ty - 45 + "px" });
      replay(bossCv, "sucked");
      sfx.thud();
      tone(300, 0.7, "sine", 0.06, 40);
    }, 330);
    tone(60, 0.6, "sawtooth", 0.05, 30);
    return 1000;
  }
  if (kind === "rail") {
    add("beam", {
      left: sx + "px",
      top: sy - 2 + "px",
      width: Math.max(10, tx - sx) + "px",
      color: "#ffffff",
      height: "4px",
    });
    [0.3, 0.6, 0.9].forEach((k, i) =>
      setTimeout(() => add("ring", { left: sx + (tx - sx) * k - 14 + "px", top: sy - 14 + "px" }), i * 40),
    );
    setTimeout(() => add("burst big", { left: tx - 50 + "px", top: ty - 50 + "px", color: "#45d1e6" }), 120);
    sfx.laser();
    tone(2400, 0.08, "square", 0.03, 800);
    return 150;
  }
  if (kind === "annihilate") {
    add("beam big", {
      left: sx + "px",
      top: sy - 10 + "px",
      width: Math.max(10, tx - sx) + "px",
      color: col,
      height: "20px",
    });
    setTimeout(() => {
      add("nova pink", { left: tx - 80 + "px", top: ty - 80 + "px" });
      replay($("arena"), "quake");
      sfx.bolt();
      sfx.thud();
    }, 180);
    sfx.laser();
    tone(80, 0.5, "sawtooth", 0.06, 40);
    return 220;
  }
  if (kind === "nova") {
    const dash = Math.max(40, b.x - h.x - h.w * 0.3);
    swing("smash", dash, "#fff3a0");
    tone(140, 0.18, "triangle", 0.04, 260);
    setTimeout(() => sfx.saber(), 190);
    setTimeout(() => {
      add("nova", { left: tx - 80 + "px", top: ty - 80 + "px" });
      add("slash saber", { left: tx - 34 + "px", top: ty - 34 + "px", color: "#fff3a0" });
      sfx.bolt();
      sfx.crit();
    }, 320);
    return 340;
  }
  if (kind === "rocket") {
    add("rocketfx", { left: sx + "px", top: sy - 3 + "px", "--dx": tx - sx + "px", "--dy": ty - sy + "px" });
    setTimeout(() => {
      add("burst big", { left: tx - 50 + "px", top: ty - 50 + "px", color: "#ff7a1a" });
      add("burst", { left: tx - 35 + "px", top: ty - 35 + "px", color: "#d62839" });
    }, 300);
    sfx.fire();
    setTimeout(() => sfx.bolt(), 300);
    return 330;
  }
  if (kind === "bolt") {
    add(
      "boltfx",
      { left: tx - 22 + "px", top: b.y - 30 + "px" },
      `<svg width="44" height="${Math.round(b.h + 40)}" viewBox="0 0 44 100" preserveAspectRatio="none"><polyline points="26,0 12,38 28,42 10,100" fill="none" stroke="#ffd23f" stroke-width="6"/><polyline points="26,0 12,38 28,42 10,100" fill="none" stroke="#ffffff" stroke-width="2"/></svg>`,
    );
    sfx.bolt();
    return 120;
  }
  // melee: wind up, run in and swing the actual weapon
  const dash = Math.max(40, b.x - h.x - h.w * 0.3);
  const style = kind === "smash" ? "smash" : kind === "scythe" ? "sweep" : kind === "saber" ? "double" : "slash";
  swing(style, dash, kind === "saber" || kind === "goldslash" || kind === "fireslash" ? col : null);
  tone(140, 0.18, "triangle", 0.04, 260); // wind-up
  setTimeout(() => {
    if (kind === "saber") sfx.saber();
    else sfx.whoosh(kind === "smash");
  }, 190);
  const c = kind === "smash" ? "#a8743f" : col || "#1d2f5c";
  setTimeout(() => {
    if (kind === "saber") {
      add("slash saber", { left: tx - 34 + "px", top: ty - 34 + "px", color: c });
      add("slash saber x2", { left: tx - 34 + "px", top: ty - 34 + "px", color: "#ffffff" });
      sfx.zap();
    } else if (kind === "scythe") {
      add("slash wide", { left: tx - 55 + "px", top: ty - 55 + "px", color: c });
      sfx.zap();
    } else if (kind === "goldslash") {
      add("slash", { left: tx - 30 + "px", top: ty - 30 + "px", color: "#f0a000" });
      add("slash x2", { left: tx - 30 + "px", top: ty - 30 + "px", color: "#ffd84a" });
      add("burst", { left: tx - 35 + "px", top: ty - 35 + "px", color: "#ffd84a" });
      sfx.clang();
      setTimeout(() => sfx.clang(), 90);
    } else if (kind === "smash") {
      add("burst big", { left: tx - 50 + "px", top: ty - 50 + "px", color: c });
      sfx.thud();
    } else {
      add("slash", { left: tx - 30 + "px", top: ty - 30 + "px", color: c });
      if (kind === "fireslash") add("burst", { left: tx - 35 + "px", top: ty - 35 + "px", color: "#ff7a1a" });
      sfx.clang();
    }
    if (kind === "smash") replay($("arena"), "quake");
  }, 300);
  return 330;
}

export function answer(i) {
  if (!G || G.locked || !$("boss-over").hidden) return;
  if (G.type) {
    typed(i === null ? null : $("type-in").value);
    return;
  }
  G.locked = true;
  clearRound();
  const { e, slot, opts } = G.cur;
  const correct = e.segs[slot].c;
  const chosen = i === null ? "" : opts[i];
  [0, 1].forEach((k) => {
    const b = $("opt" + k);
    b.disabled = true;
    if (opts[k] === correct) b.classList.add("okb");
    else if (k === i) b.classList.add("badb");
  });
  $("word").classList.remove("fog", "flip", "shakeW", "tiny", "mirror", "dark", "lens", "glitchy");
  $("opts").classList.remove("runaway");
  renderWord(chosen);
  resolve(chosen === correct, i === null);
}
export function typed(text) {
  if (!G || G.locked || !$("boss-over").hidden) return;
  if (text !== null && !text.trim()) return;
  G.locked = true;
  clearRound();
  $("type-in").readOnly = true;
  $("type-go").disabled = true;
  $("word").classList.remove("fog", "flip", "shakeW", "tiny", "mirror", "dark", "lens", "glitchy");
  $("opts").classList.remove("runaway");
  renderTyped(text === null ? "" : text.trim());
  resolve(text !== null && norm(text) === norm(G.cur.e.word), text === null);
}
function resolve(ok, timeout) {
  const { e, slot } = G.cur;
  const g = gear(),
    fb = $("feedback");
  if (ok) {
    G.streak++;
    G.bestStreak = Math.max(G.bestStreak, G.streak);
    if (G.streak > P.bestStreak) {
      P.bestStreak = G.streak;
    }
    P.tot.correct++;
    if (G.type) P.tot.typed++;
    const crit = G.streak >= g.critAt || (g.firstCrit && !G.firstHit);
    G.firstHit = true;
    let base = G.type ? Math.round(g.dmg * 1.5) : g.dmg;
    let dmg = crit ? Math.round(base * g.critMult) : base;
    let blocked = false;
    if (G.armorLeft > 0) {
      G.armorLeft--;
      dmg = 0;
      blocked = true;
    }
    stat(e.word, "right");
    const delay = fx(g.fx, g.fxCol);
    if (!blocked) later(petAttack, delay + 140);
    later(() => {
      if (blocked) {
        pop("БЛОК", "block");
        sfx.block();
        say("Мой панцирь крепче!");
      } else {
        replay(bossCv, g.fx === "smash" ? "smashed" : "hit");
        if (crit) {
          pop(`КРИТ! -${dmg}`, "crit");
          sfx.crit();
          P.tot.crits++;
          quest("crits");
        } else pop(`-${dmg}`);
      }
    }, delay);
    G.hp = Math.max(0, G.hp - dmg);
    G.score += dmg;
    if (!G.enraged && G.boss.ab.includes("enrage") && G.hp > 0 && G.hp / G.boss.hp < 0.35) {
      G.enraged = true;
      $("boss-wrap").classList.add("enraged");
      later(() => say("Я В ЯРОСТИ! Быстрее!"), delay + 300);
    }
    fb.className = "feedback good";
    fb.textContent = blocked
      ? "Панцирь! Бей ещё"
      : crit
        ? pick(["Комбо!", "Мощно!", "Разнёс!", "Сокрушительно!"])
        : pick(["Бац!", "Точно!", "Есть!", "Попал!", "Отлично!"]);
    if (G.streak % 5 === 0 && G.hearts < g.maxH) {
      G.hearts++;
      later(() => {
        pop("+1 сердце", "heal", "22%");
        sfx.heal();
      }, 350);
      fb.textContent = "Зелье! Плюс сердце";
    }
    if (g.heal8) {
      G.healCount++;
      if (G.healCount % 8 === 0 && G.hearts < g.maxH) {
        G.hearts++;
        later(() => {
          pop("Оскар мурлычет! +1", "heal", "22%");
          sfx.heal();
        }, 600);
      }
    }
    if (g.heal5) {
      G.heal5 = (G.heal5 || 0) + 1;
      if (G.heal5 % 5 === 0 && G.hearts < g.maxH) {
        G.hearts++;
        later(() => {
          pop("Феникс лечит!", "heal", "22%");
          sfx.heal();
        }, 600);
      }
    }
    if (g.heal6) {
      G.heal6 = (G.heal6 || 0) + 1;
      if (G.heal6 % 6 === 0 && G.hearts < g.maxH) {
        G.hearts++;
        later(() => {
          pop("Танк чинит! +1", "heal", "22%");
          sfx.heal();
        }, 600);
      }
    }
    if (g.drone && !blocked && G.hp > 0) {
      G.droneN = (G.droneN || 0) + 1;
      if (G.droneN % 4 === 0) {
        const dd = base * 2;
        G.hp = Math.max(0, G.hp - dd);
        G.score += dd;
        later(() => {
          fx("beam", "#ff3b3b");
          later(() => {
            pop(`Дрон -${dd}`, "crit", "60%");
            replay(bossCv, "hit");
          }, 180);
        }, delay + 260);
      }
    }
    const mult = (G.type ? 2 : 1) * diffMul();
    addCoins((crit ? 6 : 3) * mult);
    addXP((crit ? 15 : 10) * mult);
    quest("correct");
    quest("streak", G.streak);
    if (G.type) quest("typed");
    renderHUD();
    checkAch();
    later(() => (G.hp <= 0 ? bossDown() : nextQ()), Math.max(900, delay + 650));
  } else {
    G.streak = 0;
    G.bossMistakes++;
    stat(e.word, "wrong");
    G.mistakes[e.word] = (G.mistakes[e.word] || 0) + 1;
    G.queue.splice(Math.min(2, G.queue.length), 0, e);
    replay(bossCv, "lunge");
    say(pick(G.boss.taunts));
    const shown = e.segs
      .map((s, k) => (s.t !== undefined ? esc(s.t) : G.type || k === slot ? `<u>${esc(s.c)}</u>` : esc(s.c)))
      .join("");
    fb.className = "feedback";
    if (G.shieldLeft > 0) {
      G.shieldLeft--;
      sfx.block();
      later(() => pop("ЩИТ!", "shield", "22%"), 200);
      fb.innerHTML = "Щит спас! Правильно: " + shown;
    } else if (g.dodge && Math.random() < g.dodge) {
      sfx.block();
      later(() => pop("УКЛОН!", "shield", "22%"), 200);
      fb.innerHTML = "Увернулся! Правильно: " + shown;
    } else {
      const dmg = G.boss.ab.includes("double") ? 2 : 1;
      G.hearts = Math.max(0, G.hearts - dmg);
      sfx.hurt();
      later(() => {
        replay(heroCv, "ouch");
        if (dmg > 1) pop("-2", "", "22%");
      }, 180);
      document.body.classList.remove("hurt");
      void document.body.offsetWidth;
      document.body.classList.add("hurt");
      fb.innerHTML = (timeout ? "Время вышло! " : "") + "Правильно: " + shown;
    }
    if (G.boss.ab.includes("vampire") && G.hp > 0) {
      const vh = Math.round(G.boss.hp * 0.12);
      G.hp = Math.min(G.boss.hp, G.hp + vh);
      later(() => {
        pop(`+${vh}`, "heal", "72%");
        say(pick(["Ам! Твоя ошибка вкусная!", "Ммм, сил прибавилось!", "Спасибо за подарочек!"]));
        renderHUD();
      }, 700);
    }
    if (G.boss.ab.includes("steal") && P.coins > 0) {
      const n = Math.min(P.coins, 5 + Math.floor((G.boss.idx || G.boss.floor || 0) / 2));
      P.coins -= n;
      G.coinsGot -= n;
      save();
      refreshCoins();
      later(() => {
        pop(`-${n} монет`, "", "40%");
        say(pick(["Хе-хе, моё!", "Спасибо за монетки!", "Это я забираю!"]));
      }, 650);
    }
    if (g.spikes && G.hp > 0) {
      G.hp = Math.max(1, G.hp - g.spikes);
      later(() => {
        pop(`Шипы! -${g.spikes}`, "", "72%");
        replay(bossCv, "hit");
      }, 420);
    }
    renderHUD();
    save();
    later(() => {
      if (G.hearts <= 0 && g.revive && !G.revived) {
        G.revived = true;
        G.hearts = 3;
        pop("ФЕНИКС! +3", "heal", "22%");
        replay(heroCv, "glow");
        sfx.level();
        renderHUD();
        $("feedback").className = "feedback good";
        $("feedback").textContent = "Крылья феникса воскресили тебя!";
        later(nextQ, 1200);
        return;
      }
      G.hearts <= 0 ? endGame(false) : nextQ();
    }, 1900);
  }
  save();
}
function bossDown() {
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
function endGame(won) {
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
export function home() {
  stopGame();
  renderHome();
  show("s-home");
}
