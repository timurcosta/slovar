// Раунд: следующий вопрос, таймер, ответ и его последствия.
import { $, TOUCH, esc, replay } from "../lib/dom.js";
import { pick, shuffle } from "../lib/random.js";
import { FORM2 } from "../content/bosses.js";
import { shownDmg } from "../content/rules.ts";
import { poolFor } from "../topics/words/pools.js";
import { stat } from "../state/stats.ts";
import { P, save } from "../state/profile.ts";
import { settings } from "../state/settings.ts";
import { gear } from "../progress/gear.js";
import { quest } from "../progress/daily.js";
import { limitReason } from "../progress/limits.js";
import { addCoins, addXP, refreshCoins } from "../progress/rewards.js";
import { checkAch } from "../progress/achievements.js";
import { noiseSweep, sfx, tone } from "../audio/sfx.js";
import { startMusic } from "../audio/music.js";
import { bossCv, heroCv, renderHUD } from "./hud.js";
import { G, abilChips, bossDown, endGame, limitStop } from "./run.js";
import { PET_RUN, droneVolley, fx, petAttack, petHitDelay, petRunsIn, petStartAt, pop, say } from "./effects.js";
import { diffMul } from "./difficulty.js";

export function clearRound() {
  if (!G) return;
  if (G.raf) {
    cancelAnimationFrame(G.raf);
    G.raf = null;
  }
  G.ints.forEach(clearInterval);
  G.ints = [];
}
export function later(fn, ms) {
  G.timers.push(setTimeout(fn, ms));
}
// классы, которыми подлянки меняют слово; снимаются перед каждым вопросом и после ответа
const WORD_FX = ["fog", "flip", "tiny", "dark", "lens", "glitchy", "scrambled", "inky"];
const HAND = TOUCH ? "пальцем" : "мышкой";
/** Убрать следы подлянок: классы слова, кляксы, двойки, лёд, часы, перелёт кнопок. */
function clearTricks() {
  $("word").classList.remove(...WORD_FX);
  $("opts").classList.remove("swapping");
  document.querySelectorAll(".trick").forEach((el) => el.remove());
  ["opt0", "opt1", "type-in"].forEach((id) => $(id).classList.remove("frozen"));
  if (G) {
    G.ice = 0;
    G.swapping = false;
    G.web = null;
  }
}
/** Подсказка под словом: как справиться с подлянкой. */
function tip(text) {
  let t = $("word").querySelector(".tip");
  if (!t) {
    t = document.createElement("small");
    t.className = "tip trick";
    $("word").appendChild(t);
  }
  t.textContent = text;
}
const dropTip = () => $("word").querySelector(".tip")?.remove();
/** Текстовые узлы слова без служебных вставок (облако, двойки, подсказка). */
function wordTexts(w, skipGap) {
  const nodes = [];
  const walk = (el) =>
    el.childNodes.forEach((ch) => {
      if (ch.nodeType === 3) nodes.push(ch);
      else if (
        ch.nodeType === 1 &&
        !ch.classList.contains("trick") &&
        !ch.classList.contains("cloudcover") &&
        !(skipGap && ch.classList.contains("gap"))
      )
        walk(ch);
    });
  walk(w);
  return nodes;
}
/** Перемешка: каждая буква отлетает в сторону, порядок и написание не меняются. */
function scatter(w) {
  const jump = (el) => {
    el.classList.add("sc");
    el.style.setProperty("--dx", Math.round(Math.random() * 56 - 28) + "px");
    el.style.setProperty("--dy", Math.round(Math.random() * 36 - 18) + "px");
    el.style.setProperty("--r", Math.round(Math.random() * 80 - 40) + "deg");
  };
  wordTexts(w, true).forEach((t) => {
    if (!t.nodeValue.trim()) return;
    const g = document.createElement("span");
    g.className = "scg";
    [...t.nodeValue].forEach((ch) => {
      const s = document.createElement("span");
      s.textContent = ch;
      jump(s);
      g.appendChild(s);
    });
    t.replaceWith(g);
  });
  w.querySelectorAll(".gap").forEach(jump);
  void w.offsetWidth; // чтобы буквы разлетелись с анимацией
  w.classList.add("scrambled");
}
/** Нажатие на слово: увеличить крошечное, собрать перемешанное; кляксы стираются нажатием или «потри».
 *  Вешается в main.js на pointerdown и pointermove слова. */
export function wordPress(ev) {
  const w = $("word");
  if (ev.type === "pointerdown") {
    if (w.classList.contains("tiny")) {
      w.classList.remove("tiny");
      dropTip();
      tone(400, 0.16, "sine", 0.04, 900);
    }
    if (w.classList.contains("scrambled")) {
      w.classList.remove("scrambled");
      dropTip();
      tone(500, 0.16, "triangle", 0.04, 1000);
    }
  }
  if (!w.classList.contains("inky") || (ev.type === "pointermove" && !ev.buttons)) return;
  let left = 0;
  w.querySelectorAll(".blot").forEach((b) => {
    if (b.classList.contains("gone")) return;
    const r = b.getBoundingClientRect(),
      dx = ev.clientX - (r.left + r.width / 2),
      dy = ev.clientY - (r.top + r.height / 2);
    if (dx * dx + dy * dy <= (r.width / 2 + 12) ** 2) {
      const ink = +b.dataset.ink - (ev.type === "pointerdown" ? 0.5 : 0.08);
      b.dataset.ink = ink;
      b.style.opacity = Math.max(0, ink) * 0.88;
      if (ink <= 0) {
        b.classList.add("gone");
        tone(1600, 0.1, "triangle", 0.02, 500);
      }
    }
    if (!b.classList.contains("gone")) left++;
  });
  if (!left) {
    w.classList.remove("inky");
    dropTip();
  }
}
/** Удар по льду: нажатие на лёд или любая клавиша. Три удара, и кнопки оттаяли. */
export function hitIce() {
  if (!G || !G.ice) return;
  G.ice--;
  if (!G.ice) {
    melt(true);
    return;
  }
  const ice = document.querySelector(".icecover");
  tone(1500 + (3 - G.ice) * 300, 0.07, "square", 0.03, 2600);
  if (ice) {
    ice.dataset.hits = 3 - G.ice;
    ice.querySelector("small").textContent = `ещё ${G.ice}`;
    replay(ice, "wiggle");
  }
}
function tearWeb() {
  const w = $("opt" + G.web.k).querySelector(".webcover");
  noiseSweep(3000, 900, 0.12, 0.05, 0.4);
  if (--G.web.hits > 0) {
    if (w) {
      w.classList.add("torn");
      replay(w, "wiggle");
    }
    return;
  }
  G.web = null;
  if (w) {
    w.classList.add("gone");
    setTimeout(() => w.remove(), 250);
  }
}
function melt(broken) {
  G.ice = 0;
  const ice = document.querySelector(".icecover");
  if (ice) {
    ice.classList.add("broken");
    setTimeout(() => ice.remove(), 300);
  }
  ["opt0", "opt1", "type-in"].forEach((id) => $(id).classList.remove("frozen"));
  if (G.type && !G.locked) $("type-in").readOnly = false;
  if (broken) {
    tone(2400, 0.18, "triangle", 0.04, 800);
    pop("Лёд разбит!", "shield", "30%");
  }
}
export function nextQ() {
  G.hpLag = 0; // все удары прошлого ответа уже показаны
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
  clearTricks();
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
  // робопёс-сторож отогнал подлянки: в этом слове способности босса не срабатывают
  const ab = G.guard ? [] : G.boss.ab;
  G.guard = false;
  const still = () => G && G.qid === qid && !G.locked;
  const RT = roundTime() * 1000;
  if (ab.includes("tiny") && Math.random() < 0.6)
    later(() => {
      if (!still()) return;
      $("word").classList.add("tiny");
      tip("нажми на слово, и оно вырастет");
      say("Уменьшатор! Хи-хи");
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
          b.className = "blot trick";
          b.dataset.ink = 1;
          Object.assign(b.style, {
            width: sz + "px",
            height: sz + "px",
            left: 10 + Math.random() * 70 + "%",
            top: Math.random() * 30 - 10 + "px",
          });
          w.appendChild(b);
        }
        w.classList.add("inky");
        tip(`потри кляксы ${HAND}`);
        say("Шлёп! Чернила!");
      },
      400 + Math.random() * 700,
    );
  if (ab.includes("stamp") && Math.random() < 0.7)
    later(
      () => {
        if (!still()) return;
        const n = 2 + ((Math.random() * 2) | 0);
        for (let k = 0; k < n; k++)
          later(() => {
            if (!still()) return;
            const st = document.createElement("span");
            st.className = "stamp trick";
            st.textContent = "2";
            Object.assign(st.style, { left: 6 + Math.random() * 74 + "%", top: Math.random() * 20 - 6 + "px" });
            st.style.setProperty("--r", Math.round(Math.random() * 40 - 20) + "deg");
            st.addEventListener("pointerdown", (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              if (st.classList.contains("off")) return;
              st.classList.add("off");
              tone(900, 0.1, "square", 0.03, 1800);
              setTimeout(() => st.remove(), 300);
              if (!$("word").querySelector(".stamp:not(.off)")) dropTip();
            });
            st.addEventListener("mousedown", (ev) => ev.preventDefault());
            $("word").appendChild(st);
            tone(140, 0.09, "square", 0.05, 70);
          }, k * 260);
        tip("сбивай двойки: нажимай на них");
        say(pick(["Ставлю тебе двойку!", "Шлёп! Двойка!", "Дневник на подпись!"]));
      },
      400 + Math.random() * 500,
    );
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
        c.innerHTML = "<small>нажми, чтобы сдуть</small>";
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
  if (ab.includes("scramble") && Math.random() < 0.6)
    later(
      () => {
        if (!still()) return;
        scatter($("word"));
        tip("нажми на слово, и буквы соберутся");
        say(pick(["Буквы, разбегайтесь!", "Перемешка! Хи-хи", "Бу! Где буква?"]));
        later(() => {
          if (still() && $("word").classList.contains("scrambled")) {
            $("word").classList.remove("scrambled");
            dropTip();
          }
        }, 3200);
      },
      300 + Math.random() * 400,
    );
  if (ab.includes("glitch") && Math.random() < 0.75) {
    const GL = "ЖЩЪЫЭЮЯФЦШ#%&@";
    const glitch = (n) =>
      later(
        () => {
          if (!still()) return;
          const w = $("word"),
            nodes = wordTexts(w, true);
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
        els.forEach((e) => e.classList.add("frozen"));
        if (G.type) $("type-in").readOnly = true;
        G.ice = 3;
        const ice = document.createElement("div");
        ice.className = "icecover trick";
        ice.innerHTML = `<b>ЛЁД!</b><small>${TOUCH ? "нажми" : "кликни или жми клавиши"} 3 раза</small>`;
        ice.addEventListener("pointerdown", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          hitIce();
        });
        ice.addEventListener("mousedown", (ev) => ev.preventDefault());
        (G.type ? $("typer") : $("opts")).appendChild(ice);
        tone(1800, 0.25, "sine", 0.03, 2600);
        say("Заморозка! Брр!");
        // не застрять: лёд тает сам
        later(() => {
          if (still() && G.ice) melt(false);
        }, 4000);
      },
      900 + Math.random() * Math.max(600, RT * 0.45),
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
      // паутина на одной кнопке (на любой, не подсказка): нажатия рвут её, а не отвечают
      later(() => {
        if (!still()) return;
        const k = Math.random() < 0.5 ? 0 : 1;
        G.web = { k, hits: 2 };
        const w = document.createElement("span");
        w.className = "webcover trick";
        w.innerHTML = `<small>${TOUCH ? "порви: нажми 2 раза" : "порви: 2 клика или клавиша " + (k + 1) + " дважды"}</small>`;
        $("opt" + k).appendChild(w);
        tone(300, 0.2, "triangle", 0.03, 150);
        say(pick(["Запутаю в паутине!", "Попался в сети!"]));
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
        const c = document.createElement("span");
        c.className = "clock trick";
        c.innerHTML = "<i></i>";
        let caught = false;
        c.addEventListener("pointerdown", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (caught) return;
          caught = true;
          // остановить часы там, где их поймали
          const r = c.getBoundingClientRect(),
            a = $("arena").getBoundingClientRect();
          c.style.left = r.left - a.left + r.width / 2 + "px";
          c.style.top = r.top - a.top + r.height / 2 + "px";
          c.classList.add("caught");
          tone(1200, 0.14, "sine", 0.04, 2000);
          pop("Поймал!", "heal", "46%");
          setTimeout(() => c.remove(), 300);
        });
        c.addEventListener("mousedown", (ev) => ev.preventDefault());
        $("arena").appendChild(c);
        say(pick(["Лови часики! Хи-хи", "Время, вперёд!"]));
        tone(600, 0.1, "square", 0.03, 900);
        later(() => {
          if (caught) return;
          c.remove();
          if (!still() || !G.rage) return;
          G.rage.t0 -= G.rage.T * 0.3;
          replay($("rage-wrap"), "wiggle");
          tone(1200, 0.2, "square", 0.03, 2400);
        }, 1800);
      },
      700 + Math.random() * Math.max(500, RT * 0.3),
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
  // путаница только в выборе буквы: кнопки заметно перелетают крест-накрест, во время перелёта не нажимаются
  if (ab.includes("swap") && !G.type && Math.random() < 0.6)
    later(
      () => {
        if (!still()) return;
        G.swapping = true;
        $("opts").classList.add("swapping");
        tone(500, 0.3, "triangle", 0.03, 1100);
        say("Путаница! Хи-хи!");
        later(() => {
          if (!G || G.qid !== qid) return;
          $("opts").classList.remove("swapping");
          G.swapping = false;
          if (G.locked) return;
          G.cur.opts.reverse();
          [0, 1].forEach((i) => ($("opt" + i).querySelector("span").textContent = G.cur.opts[i]));
        }, 480);
      },
      500 + Math.random() * 400,
    );
  if (ab.includes("regen")) {
    const iv = setInterval(() => {
      if (!G || G.locked || G.qid !== qid || G.hp <= 0) return;
      const before = G.hp;
      G.hp = Math.min(G.boss.hp, G.hp + 3);
      if (G.hp > before) {
        pop("+" + shownDmg(3), "heal", "72%");
        renderHUD();
      }
    }, 2000);
    G.ints.push(iv);
  }
  startRage();
}
/** Вторая форма финального босса: другой облик и имя на арене, новая подлянка со следующего слова. */
function secondForm(f) {
  if (!G || G.hp <= 0 || G.form2) return;
  G.form2 = true;
  const ab = G.boss.ab.filter((a) => a !== "enrage");
  if (!ab.includes(f.ab)) ab.push(f.ab);
  G.boss = { ...G.boss, ab: [...ab, "enrage"] };
  $("boss-name").textContent = f.name;
  $("boss-abil").innerHTML = abilChips(G.boss.ab);
  $("boss-wrap").style.filter = f.filter;
  $("boss-wrap").classList.add("form2");
  replay(bossCv, "glow");
  sfx.boom(true);
  pop("ВТОРАЯ ФОРМА!", "crit form2", "50%");
  say(f.say);
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
  // Ускорение и Ярость видно на полоске: иначе ребёнок не замечает, что времени стало меньше
  const fast = G.boss.ab.includes("haste") ? Math.round((1 - Math.pow(0.95, G.q - 1)) * 100) : 0;
  $("rage-label").textContent = G.enraged
    ? "Атака босса · ЯРОСТЬ!"
    : fast
      ? `Атака босса · быстрее на ${fast}%`
      : "Атака босса";
  $("rage-wrap").classList.toggle("hot", G.enraged || fast >= 10);
  if (fast && G.q % 4 === 1) later(() => say(pick(["Ускоряюсь!", "Быстрее, быстрее!", "Не успеешь!"])), 1200);
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
export function answer(i) {
  if (!G || G.locked || !$("boss-over").hidden) return;
  if (G.type) {
    typed(i === null ? null : $("type-in").value);
    return;
  }
  // во льду нажатие бьёт по льду; во время перелёта кнопок нажатие не считается
  if (i !== null && G.ice) {
    hitIce();
    return;
  }
  if (i !== null && G.swapping) return;
  if (i !== null && G.web && G.web.k === i) {
    tearWeb();
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
  clearTricks();
  renderWord(chosen);
  resolve(chosen === correct, i === null);
}
export function typed(text) {
  if (!G || G.locked || !$("boss-over").hidden) return;
  if (text !== null && !text.trim()) return;
  if (text !== null && G.ice) {
    hitIce();
    return;
  }
  G.locked = true;
  clearRound();
  $("type-in").readOnly = true;
  $("type-go").disabled = true;
  clearTricks();
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
    // без доли питомца: от неё считается залп дрона (как было до отдельного удара питомца)
    const heroBase = G.type ? Math.round((g.dmg - g.petDmg) * 1.5) : g.dmg - g.petDmg;
    let blocked = false;
    if (G.armorLeft > 0) {
      G.armorLeft--;
      dmg = 0;
      blocked = true;
    }
    stat(e.word, "right");
    // урон делится: свою долю питомец наносит сам, своей атакой; полоска жизней падает в момент каждого удара
    const petPart = blocked || !g.petDmg ? 0 : Math.round((dmg * g.petDmg) / g.dmg),
      heroPart = dmg - petPart;
    G.hpLag = dmg;
    // питомец ближнего боя подбегает после удара героя (герой его ждёт), стрелок стреляет со своего места
    const petRun = !blocked && petRunsIn();
    const delay = fx(g.fx, g.fxCol, petRun);
    const petAt = petRun ? petStartAt(delay) : delay + 140,
      petHit = petAt + petHitDelay();
    if (!blocked) later(petAttack, petAt);
    later(() => {
      if (blocked) {
        // щит на боссе разлетается: видно, что удар не пропал, а сломал защиту
        const sh = [...$("boss-shields").querySelectorAll(".shield:not(.broke)")].pop();
        if (sh) sh.classList.add("broke");
        pop("ЩИТ РАЗБИТ!", "crit", "40%");
        sfx.block();
        noiseSweep(2600, 400, 0.25, 0.08, 0.5);
        replay(bossCv, "hit");
        say(G.armorLeft ? "Мой панцирь крепче!" : "Ой! Мой панцирь!");
      } else {
        replay(bossCv, g.fx === "smash" ? "smashed" : "hit");
        if (crit) {
          pop(`КРИТ! -${shownDmg(heroPart)}`, "crit");
          sfx.crit();
          P.tot.crits++;
          quest("crits");
        } else pop(`-${shownDmg(heroPart)}`);
      }
      G.hpLag = Math.max(0, G.hpLag - heroPart);
      renderHUD();
    }, delay);
    if (petPart)
      later(() => {
        pop(`-${shownDmg(petPart)}`, "pet" + (crit ? " crit" : ""), "62%");
        G.hpLag = Math.max(0, G.hpLag - petPart);
        renderHUD();
      }, petHit);
    G.hp = Math.max(0, G.hp - dmg);
    G.score += dmg;
    if (!G.enraged && G.boss.ab.includes("enrage") && G.hp > 0 && G.hp / G.boss.hp < 0.35) {
      G.enraged = true;
      $("boss-wrap").classList.add("enraged");
      const f2 = FORM2[G.boss.name];
      later(() => (f2 ? secondForm(f2) : say("Я В ЯРОСТИ! Быстрее!")), delay + 300);
    }
    fb.className = "feedback good";
    fb.textContent = blocked
      ? G.armorLeft
        ? "Щит разбит! Остался ещё один"
        : "Все щиты разбиты! Бей!"
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
    if (g.guard5 && !blocked && G.boss.ab.length) {
      G.guardN = (G.guardN || 0) + 1;
      if (G.guardN % 5 === 0) {
        G.guard = true;
        later(() => {
          pop("Гав! Сторожу!", "pet", "14%");
          sfx.bark();
        }, petHit + 250);
      }
    }
    let volleyEnd = 0;
    if (g.drone && !blocked && G.hp > 0) {
      G.droneN = (G.droneN || 0) + 1;
      if (G.droneN % 4 === 0) {
        const dd = heroBase * 2;
        G.hp = Math.max(0, G.hp - dd);
        G.score += dd;
        G.hpLag += dd;
        volleyEnd = petHit + 700;
        later(() => {
          droneVolley();
          later(() => {
            pop(`Дрон -${shownDmg(dd)}`, "crit", "60%");
            replay(bossCv, "hit");
            G.hpLag = Math.max(0, G.hpLag - dd);
            renderHUD();
          }, 180);
        }, petHit + 260);
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
    later(
      () => (G.hp <= 0 ? bossDown() : nextQ()),
      Math.max(900, delay + 650, petPart ? petHit + 300 : 0, petRun ? petAt + PET_RUN + 120 : 0, volleyEnd),
    );
  } else {
    G.streak = 0;
    G.bossMistakes++;
    stat(e.word, "wrong");
    G.mistakes[e.word] = (G.mistakes[e.word] || 0) + 1;
    G.queue.splice(Math.min(2, G.queue.length), 0, e);
    replay(bossCv, "lunge");
    say(pick(G.boss.taunts).replace(/\{name\}/g, P.name || "герой"));
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
        pop(`+${shownDmg(vh)}`, "heal", "72%");
        say(pick(["Ам! Твоя ошибка вкусная!", "Ммм, сил прибавилось!", "Спасибо за подарочек!"]));
        renderHUD();
      }, 700);
    }
    if (G.boss.ab.includes("steal") && P.coins > 0) {
      const n = Math.min(P.coins, 5 + Math.floor((G.boss.idx || G.boss.floor || 0) / 2));
      P.coins -= n;
      G.coinsGot -= n;
      G.stolen = (G.stolen || 0) + n; // вернутся, если победить босса
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
        pop(`Шипы! -${shownDmg(g.spikes)}`, "", "72%");
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
