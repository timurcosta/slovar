// Раунд: следующий вопрос, таймер, ответ и его последствия.
import { $, esc, replay } from "../lib/dom.js";
import { pick, shuffle } from "../lib/random.js";
import { poolFor } from "../topics/words/pools.js";
import { stat } from "../state/stats.ts";
import { P, save } from "../state/profile.ts";
import { settings } from "../state/settings.ts";
import { gear } from "../progress/gear.js";
import { quest } from "../progress/daily.js";
import { limitReason } from "../progress/limits.js";
import { addCoins, addXP, refreshCoins } from "../progress/rewards.js";
import { checkAch } from "../progress/achievements.js";
import { sfx, tone } from "../audio/sfx.js";
import { startMusic } from "../audio/music.js";
import { bossCv, heroCv, renderHUD } from "./hud.js";
import { G, bossDown, endGame, limitStop } from "./run.js";
import { fx, petAttack, pop, say } from "./effects.js";
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
export function nextQ() {
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
