// Визуальные эффекты боя: удары, оружие, питомцы, всплывающие надписи.
import { $, replay } from "../lib/dom.js";
import { BREATH, PET_ATK } from "../content/pets.js";
import { drawHero, petMouth } from "../render/hero.js";
import { P } from "../state/profile.ts";
import { sfx, tone } from "../audio/sfx.js";
import { bossCv, drawFighters, heroCv, petCv } from "./hud.js";
import { G } from "./run.js";
import { heroFrame } from "../ui/animation.js";
import { duckMusic } from "../audio/music.js";
import * as vfx from "./vfx.js";

export function pop(text, cls = "", left = "72%") {
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
export function rel(el) {
  const a = $("arena").getBoundingClientRect(),
    r = el.getBoundingClientRect();
  return { x: r.left - a.left, y: r.top - a.top, w: r.width, h: r.height };
}
// cut the weapon pixels out of the hero sprite, so the weapon itself can be swung around the hand
function weaponLayer() {
  const a = document.createElement("canvas"),
    b = document.createElement("canvas");
  drawHero(a, { ...P.equip, pet: "nopet" }, null, 0);
  drawHero(b, { ...P.equip, pet: "nopet", weapon: "none" }, null, 0);
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
const REDUCED = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
// хореография удара с питомцем ближнего боя: герой подбегает и бьёт, ждёт у босса, питомец подбегает
// и бьёт, обратно оба бегут одновременно. Время от старта питомца:
export const PET_RUN = 720; // весь заход питомца: разбег, удар, возвращение
const PET_BACK = 470; // когда питомец (и ждущий герой) бегут назад
const HERO_BACK = 475; // когда герой без ожидания бежит назад (от начала его атаки)
/** Когда стартует питомец после начала атаки героя: чуть позже удара героя (delay). */
export const petStartAt = (delay) => delay + 60;

/** Рывок героя к боссу и обратно; hold — сколько мс ждать у босса перед возвращением. */
function heroDash(el, smash, dash, hold) {
  if (REDUCED) return;
  const T = 660 + hold,
    f = smash
      ? [
          ["translate(-4px, -18px) rotate(-8deg)", 210],
          [`translate(${dash}px, 3px) rotate(9deg)`, 315],
          [`translate(${dash}px, 0) rotate(3deg)`, HERO_BACK + 15 + hold],
        ]
      : [
          ["translateX(-6px) rotate(-6deg)", 200],
          [`translateX(${dash}px) rotate(5deg)`, 300],
          [`translateX(${dash}px) rotate(2deg)`, HERO_BACK + hold],
        ];
  el.animate(
    [
      { transform: "none", offset: 0, easing: "ease-in-out" },
      ...f.map(([transform, ms]) => ({ transform, offset: ms / T, easing: "ease-in-out" })),
      { transform: "none", offset: 1 },
    ],
    { duration: T },
  );
}
/** Разбег питомца вприпрыжку к боссу, удар (прыжок с царапками или укус с тряской), возвращение. */
function petDash(dx, bite) {
  if (REDUCED) return;
  const at = (x, y, r = 0) => `translate(${x}px, ${y}px) rotate(${r}deg)`;
  const f = [
    [at(0, 0), 0],
    [at(dx * 0.25, -7), 70],
    [at(dx * 0.5, 0), 140],
    [at(dx * 0.75, -7), 210],
    [at(dx, 0), 270],
    [bite ? at(dx, 0, -8) : at(dx, -8, -6), 320],
    [bite ? at(dx, 0, 6) : at(dx, 0, 4), 380],
    [at(dx, 0), PET_BACK],
    [at(dx * 0.5, -6), 600],
    [at(0, 0), PET_RUN],
  ];
  petCv.animate(
    f.map(([transform, ms]) => ({ transform, offset: ms / PET_RUN })),
    { duration: PET_RUN },
  );
}
function swing(style, dash, glow, hold = 0) {
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
  drawFighters(heroFrame);
  heroDash(wrap, style === "smash", dash, hold);
  setTimeout(
    () => {
      w.remove();
      if (G) G.swinging = false;
      drawFighters(heroFrame);
    },
    style === "double" ? 760 : 680,
  );
}
/** Питомец ближнего боя: сам добегает (допрыгивает, долетает) до босса. */
export const petRunsIn = () => ["pounce", "bite", "swoop"].includes(PET_ATK[P.equip.pet]);
const PET_HIT = { pounce: 320, bite: 320, breath: 330, laser: 160, shell: 300, swoop: 300 };
/** Через сколько мс после старта атаки питомец попадает по боссу. */
export const petHitDelay = () => PET_HIT[PET_ATK[P.equip.pet]] || 300;
/** Залп дрона (каждый 4-й ответ): мощный лазер из самого дрона. */
export function droneVolley() {
  if (petCv.hidden) return;
  const p = rel(petCv),
    b = rel(bossCv),
    m = petMouth(P.equip.pet);
  sfx.laser();
  sfx.zap();
  vfx.laser([p.x + p.w * m.x, p.y + p.h * m.y], [b.x + b.w * 0.45, b.y + b.h * 0.55], "#ff3b3b", true);
}
/** Атака питомца. Он на своём холсте рядом с героем и действует сам: прыгает или стреляет от себя. */
export function petAttack() {
  const pet = P.equip.pet,
    kind = PET_ATK[pet];
  if (!kind || !G || G.petBusy || petCv.hidden) return;
  const p = rel(petCv),
    b = rel(bossCv);
  // пасть питомца (по спрайту: голова дракона, ствол танка) и точка попадания
  const m = petMouth(pet),
    mouth = [p.x + p.w * m.x, p.y + p.h * m.y],
    at = [b.x + b.w * 0.45, b.y + b.h * 0.6];
  // добежать: морда питомца встаёт вплотную к боссу
  const dx = Math.max(30, b.x + b.w * 0.12 - (p.x + p.w * m.x));
  petCv.style.setProperty("--dx", dx + "px");
  if (kind === "pounce" || kind === "bite") petDash(dx, kind === "bite");
  else replay(petCv, "pa-" + kind);
  G.petBusy = true;
  const hitAt = PET_HIT[kind];
  if (kind === "pounce") {
    sfx.meow();
    setTimeout(() => {
      vfx.claws(at);
      sfx.scratch();
    }, hitAt - 30);
  }
  if (kind === "bite")
    setTimeout(() => {
      vfx.bite(at);
      sfx.bark();
    }, hitAt - 20);
  if (kind === "breath") {
    sfx.roar();
    setTimeout(() => vfx.breath(mouth, at, BREATH[pet]), 100);
  }
  if (kind === "laser") {
    sfx.beep();
    setTimeout(() => sfx.laser(), 140);
    vfx.droneShot(mouth, at);
  }
  if (kind === "shell") {
    sfx.cannon();
    vfx.shell(mouth, at);
    setTimeout(() => sfx.boom(false), hitAt);
  }
  if (kind === "swoop") {
    sfx.screech();
    vfx.phoenix(mouth, at, hitAt);
  }
  setTimeout(() => G && replay(bossCv, "hit"), hitAt);
  setTimeout(() => G && (G.petBusy = false), PET_RUN);
}
/** Насколько подбежать, чтобы грудь героя (64% холста) встала вплотную к боссу, а не въехала в него. */
const dashTo = (h, b) => Math.max(40, b.x + b.w * 0.08 - (h.x + h.w * 0.64));
/** Атака оружием. Возвращает, через сколько мс удар достигает босса (тогда показывается урон). */
export function fx(kind, col, petRun = false) {
  // герой ближнего боя ждёт у босса, пока подбежит и ударит питомец
  const hold = (delay) => (petRun ? petStartAt(delay) + PET_BACK - HERO_BACK : 0);
  const h = rel(heroCv),
    b = rel(bossCv);
  // ствол пушки, кончик посоха (оружие наклонено вперёд) и точка попадания
  const gun = [h.x + h.w * 0.94, h.y + h.h * 0.58],
    tip = [h.x + h.w * 0.95, h.y + h.h * 0.16],
    hit = [b.x + b.w * 0.45, b.y + b.h * 0.55];
  const tx = hit[0],
    ty = hit[1];
  const add = (cls, style) => {
    const el = document.createElement("div");
    el.className = "fx " + cls;
    Object.entries(style).forEach(([k, v]) => (k.startsWith("--") ? el.style.setProperty(k, v) : (el.style[k] = v)));
    $("arena").appendChild(el);
    setTimeout(() => el.remove(), 700);
    return el;
  };
  if (kind === "beam" || kind === "bigbeam") {
    sfx.laser();
    return vfx.laser(gun, hit, col, kind === "bigbeam") + 20;
  }
  if (kind === "bullets" || kind === "bullets2") {
    const two = kind === "bullets2";
    return vfx.plasma(gun, hit, {
      n: two ? 6 : 3,
      gap: two ? 60 : 90,
      spread: two ? 3 : 0,
      cols: two ? ["#ffffff", "#fff3a0", col || "#ff7a1a"] : ["#ffffff", "#a8f0ff", col || "#45d1e6"],
      sound: (i) => sfx.pew(i),
    });
  }
  if (kind === "fire") {
    sfx.fireball();
    const t = vfx.fireball(tip, hit);
    setTimeout(() => sfx.boom(false), t);
    return t;
  }
  if (kind === "comet") {
    sfx.comet();
    const t = vfx.comet(tip, hit);
    setTimeout(() => {
      sfx.shatter();
      sfx.boom(false);
    }, t);
    return t;
  }
  if (kind === "blackhole") {
    sfx.laser();
    const t = vfx.blackhole(gun, hit);
    setTimeout(() => {
      replay(bossCv, "sucked");
      sfx.vortex();
    }, t);
    return t + 200;
  }
  if (kind === "rail") {
    const charge = 300;
    duckMusic(1000);
    sfx.charge(charge, 2600);
    setTimeout(() => sfx.railShot(), charge);
    return vfx.rail(gun, hit, charge);
  }
  if (kind === "annihilate") {
    const charge = 380,
      beam = 460;
    duckMusic(1600);
    sfx.charge(charge, 1400);
    setTimeout(() => sfx.beam(beam), charge);
    setTimeout(() => sfx.boom(true), charge + beam);
    return vfx.annihilate(gun, hit, charge, beam);
  }
  if (kind === "rocket") {
    duckMusic(1200);
    sfx.rocketLaunch();
    const t = vfx.rocket(gun, hit);
    setTimeout(() => sfx.boom(true), t);
    return t;
  }
  if (kind === "bolt") {
    // молот поднимается, бьёт оземь — и с неба бьёт молния
    swing("smash", 0, "#ffd23f");
    tone(140, 0.18, "triangle", 0.04, 260);
    setTimeout(() => {
      sfx.thunder();
      vfx.lightning(hit, 0);
    }, 240);
    return 300;
  }
  if (kind === "nova") {
    const dash = dashTo(h, b);
    swing("smash", dash, "#fff3a0", hold(340));
    tone(140, 0.18, "triangle", 0.04, 260);
    setTimeout(() => sfx.saber(), 190);
    setTimeout(() => {
      vfx.starburst(hit);
      add("slash saber", { left: tx - 34 + "px", top: ty - 34 + "px", color: "#fff3a0" });
      sfx.bolt();
      sfx.crit();
    }, 320);
    return 340;
  }
  // melee: wind up, run in and swing the actual weapon
  const dash = dashTo(h, b);
  const style = kind === "smash" ? "smash" : kind === "scythe" ? "sweep" : kind === "saber" ? "double" : "slash";
  swing(style, dash, kind === "saber" || kind === "goldslash" || kind === "fireslash" ? col : null, hold(330));
  tone(140, 0.18, "triangle", 0.04, 260); // wind-up
  setTimeout(() => {
    if (kind === "saber") sfx.saber();
    else sfx.whoosh(kind === "smash");
  }, 190);
  const c = kind === "smash" ? "#a8743f" : col || "#1d2f5c";
  setTimeout(() => {
    vfx.meleeHit(hit, kind === "smash" ? "#e3e8f0" : col, kind === "smash" || kind === "scythe");
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
      sfx.clang();
      setTimeout(() => sfx.clang(), 90);
    } else if (kind === "smash") {
      sfx.thud();
      replay($("arena"), "quake");
    } else {
      add("slash", { left: tx - 30 + "px", top: ty - 30 + "px", color: c });
      if (kind === "fireslash") vfx.meleeHit(hit, "#ff7a1a", true);
      sfx.clang();
    }
  }, 300);
  return 330;
}
