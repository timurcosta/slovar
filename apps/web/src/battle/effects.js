// Визуальные эффекты боя: удары, оружие, питомцы, всплывающие надписи.
import { $, replay } from "../lib/dom.js";
import { BREATH, PET_ATK } from "../content/pets.js";
import { ATTACK } from "../content/bosses.js";
import { drawHero, petMouth } from "../render/hero.js";
import { P } from "../state/profile.ts";
import { sfx, tone } from "../audio/sfx.js";
import { bossCv, drawFighters, heroCv, petCv } from "./hud.js";
import { G } from "./run.js";
import { heroFrame } from "../ui/animation.js";
import { duckMusic } from "../audio/music.js";
import * as vfx from "./vfx.js";
import * as swordSlash from "../vendor/pixelfx/fx/melee/sword-slash.js";
import * as doubleSlash from "../vendor/pixelfx/fx/melee/double-slash.js";
import * as spinSlash from "../vendor/pixelfx/fx/melee/spin-slash.js";
import * as heavyCleave from "../vendor/pixelfx/fx/melee/heavy-cleave.js";
import * as bluntHit from "../vendor/pixelfx/fx/impacts/blunt-hit.js";
import * as critHit from "../vendor/pixelfx/fx/impacts/crit-hit.js";
import * as lightningStrike from "../vendor/pixelfx/fx/lightning/lightning-strike.js";
import * as manaBurst from "../vendor/pixelfx/fx/arcane/mana-burst.js";
import * as fireBreath from "../vendor/pixelfx/fx/fire/fire-breath.js";
import * as hitSpark from "../vendor/pixelfx/fx/impacts/hit-spark.js";
import * as shieldBlock from "../vendor/pixelfx/fx/impacts/shield-block.js";
import * as clawSwipe from "../vendor/pixelfx/fx/melee/claw-swipe.js";
import * as zapHit from "../vendor/pixelfx/fx/lightning/zap-hit.js";
import * as snowflakeBurst from "../vendor/pixelfx/fx/ice/snowflake-burst.js";
import * as healAoe from "../vendor/pixelfx/fx/holy/heal-aoe.js";
import * as magicMissile from "../vendor/pixelfx/fx/projectiles/magic-missile.js";
import * as tractorBeam from "../vendor/pixelfx/fx/scifi/tractor-beam.js";
import * as splash from "../vendor/pixelfx/fx/water/splash.js";
import * as acidSplash from "../vendor/pixelfx/fx/nature/acid-splash.js";
import * as chestOpen from "../vendor/pixelfx/fx/pickups/chest-open.js";
import * as collectBurst from "../vendor/pixelfx/fx/pickups/collect-burst.js";
import * as fireworkBurst from "../vendor/pixelfx/fx/explosions/firework-burst.js";
import * as poof from "../vendor/pixelfx/fx/spawn/poof.js";

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
  // дракон подлетает, если струя огня (~110 пикселей pixelfx) не достаёт до босса — на широком экране далеко
  const fly = kind === "breath" && !REDUCED ? Math.max(0, at[0] - mouth[0] - 110 * vfx.qx()) : 0;
  if (kind === "pounce" || kind === "bite") petDash(dx, kind === "bite");
  else if (fly)
    petCv.animate(
      [
        { transform: "none" },
        { transform: `translate(${fly}px, -4px)`, offset: 0.28, easing: "ease-out" },
        { transform: `translate(${fly}px, -2px)`, offset: 0.72, easing: "ease-in-out" },
        { transform: "none" },
      ],
      { duration: 760 },
    );
  else replay(petCv, "pa-" + kind);
  G.petBusy = true;
  const hitAt = PET_HIT[kind];
  if (kind === "pounce") {
    sfx.meow();
    setTimeout(() => {
      vfx.pfx(clawSwipe, at, { anchor: [30, -17], palette: GOLD });
      sfx.scratch();
    }, hitAt - 30);
  }
  if (kind === "bite")
    setTimeout(() => {
      vfx.bite(at);
      spark(at, "#ff3b3b");
      sfx.bark();
    }, hitAt - 20);
  if (kind === "breath") {
    sfx.roar();
    const from = [mouth[0] + fly, mouth[1] - (fly ? 4 : 0)];
    vfx.pfx(fireBreath, from, {
      ...vfx.aim(from, at),
      palette: vfx.shades(BREATH[pet][1]),
      until: 0.45,
      delay: fly ? 200 : 100,
    });
  }
  if (kind === "laser") {
    sfx.beep();
    setTimeout(() => sfx.laser(), 140);
    vfx.droneShot(mouth, at);
    spark(at, "#ff3b3b", hitAt);
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
const GOLD = ["#5a2a00", "#a0560a", "#e08a10", "#ffc23a", "#ffe680", "#fff6c8", "#ffffff"];
/** Искры попадания pixelfx в точке at цвета col через delay мс; flip — удар справа налево (по герою). */
function spark(at, col, delay = 0, flip = false) {
  vfx.pfx(hitSpark, at, { anchor: [0, -20], palette: vfx.shades(col), delay, flip });
}
/** Ноги героя на земле. */
function heroFeet() {
  const h = rel(heroCv);
  return [h.x + h.w * 0.6, h.y + h.h * 0.97];
}
/** Щит героя отбивает удар в точке at (перед героем). */
export function guardFx(at, delay = 0) {
  vfx.pfx(shieldBlock, at, { anchor: [17, -26], delay });
}
/**
 * Сундук на экране победы — сундук pixelfx прямо на окне: трясётся, распахивается в момент ms (на 0.8 с своего
 * времени), выбрасывает монеты и самоцветы и остаётся открытым; искры цвета col (редкость вещи или сундука), с вещью —
 * ещё и салют. Холст больше места под сундук, чтобы монеты не обрезались. Наш спрайт прячется (при «уменьшить
 * движение» эффектов нет — остаётся он).
 */
export function chestFx(chestCv, col, item, ms) {
  if (REDUCED || !chestCv) return;
  const box = document.createElement("div"),
    cv = document.createElement("canvas");
  box.className = "chestbox";
  cv.className = "chestfx";
  chestCv.replaceWith(box);
  box.append(cv, chestCv);
  // монеты разлетаются на ±78 пикселей и взлетают на ~52: холст под весь размах (пиксель — 2 CSS px)
  const W = 166,
    H = 60,
    at = [W / 2, H - 4];
  vfx.playOn(cv, W, H, null, [
    { mod: chestOpen, at, delay: ms - 800, hold: 2.4 },
    { mod: collectBurst, at: [at[0], at[1] - 4], delay: ms, palette: vfx.shades(col) },
    ...(item ? [{ mod: fireworkBurst, at: [W / 2, H * 0.45], delay: ms + 250 }] : []),
  ]);
}
/** Победа над боссом: салют в окне сцены. */
export function victoryFx() {
  const s = rel($("stage"));
  vfx.pfx(fireworkBurst, [s.x + s.w * 0.62, s.y + s.h * 0.4], { delay: 150, seed: 9 });
  vfx.pfx(fireworkBurst, [s.x + s.w * 0.3, s.y + s.h * 0.3], { delay: 450, seed: 4 });
}
/** Босс превращается: облачко «пуф» у его ног. */
export function formFx() {
  const b = rel(bossCv);
  vfx.pfx(poof, [b.x + b.w * 0.5, b.y + b.h * 0.96], { until: 1 });
}
/** Лечение: зелёное кольцо и столб света у героя. */
export function healFx() {
  vfx.pfx(healAoe, heroFeet(), { until: 0.9 });
}
const PLASMA = ["#2a0a4a", "#5a1f9a", "#8a3fd6", "#c77dff", "#e8b8ff", "#f6e6ff", "#ffffff"],
  ICE_SPARKS = ["#ffffff", "#a8f0ff", "#45d1e6", "#2a6bd6"];
/**
 * Удары ближнего боя из pixelfx: список [эффект, опции]. Взмахи (feet) рисуются, как в pixelfx, от ног бьющего: герой
 * после рывка стоит у босса, дуга идёт из замаха в цель. Остальное — anchor (точка эффекта в его пикселях) встаёт в
 * точку попадания. lead — за сколько мс до попадания стартовать. Палитра — из цвета оружия.
 */
const MELEE = {
  slash: (c) => [[swordSlash, { feet: true, lead: 40, palette: vfx.shades(c || "#1f4fd1") }]],
  smash: () => [[bluntHit, { anchor: [0, -22], lead: 0, until: 0.8 }]],
  saber: (c) => [[doubleSlash, { feet: true, lead: 100, palette: vfx.shades(c || "#45d1e6") }]],
  goldslash: () => [[spinSlash, { feet: true, lead: 120, palette: GOLD }]],
  // плазменная коса: широкий взмах и следом второй, наклонный
  scythe: () => [
    [swordSlash, { feet: true, lead: 40, radius: 54, palette: PLASMA, sparks: ICE_SPARKS }],
    [swordSlash, { feet: true, lead: -120, radius: 44, angle: 0.45, seed: 5, palette: PLASMA, sparks: ICE_SPARKS }],
  ],
  fireslash: () => [[heavyCleave, { feet: true, lead: 200, from: 0.2, until: 1.4 }]],
};
/**
 * Удар героя оружием kind (цвет col). Возвращает момент попадания (мс): тогда показывается урон.
 * crit — поверх удара вспыхивает крит.
 */
export function fx(kind, col, petRun = false, crit = false) {
  const t = strike(kind, col, petRun);
  if (crit) {
    const b = rel(bossCv);
    vfx.pfx(critHit, [b.x + b.w * 0.45, b.y + b.h * 0.55], { anchor: [0, -25], delay: Math.max(0, t - 50) });
  }
  return t;
}
function strike(kind, col, petRun) {
  // герой ближнего боя ждёт у босса, пока подбежит и ударит питомец
  const hold = (delay) => (petRun ? petStartAt(delay) + PET_BACK - HERO_BACK : 0);
  const h = rel(heroCv),
    b = rel(bossCv);
  // ствол пушки, кончик посоха (оружие наклонено вперёд) и точка попадания
  const gun = [h.x + h.w * 0.94, h.y + h.h * 0.58],
    tip = [h.x + h.w * 0.95, h.y + h.h * 0.16],
    hit = [b.x + b.w * 0.45, b.y + b.h * 0.55],
    ground = [b.x + b.w * 0.5, b.y + b.h * 0.96];
  if (kind === "beam" || kind === "bigbeam") {
    sfx.laser();
    return vfx.laser(gun, hit, col, kind === "bigbeam") + 20;
  }
  if (kind === "bullets" || kind === "bullets2") {
    const two = kind === "bullets2",
      n = two ? 6 : 3,
      gap = two ? 60 : 90;
    for (let i = 0; i < n; i++) spark(hit, col || (two ? "#ff7a1a" : "#45d1e6"), i * gap + 150);
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
    setTimeout(() => sfx.thunder(), 240);
    vfx.pfx(lightningStrike, ground, { from: 0.75, until: 1.6, soft: 0, delay: 200 });
    return 300;
  }
  if (kind === "nova") {
    const dash = dashTo(h, b);
    swing("smash", dash, "#fff3a0", hold(340));
    tone(140, 0.18, "triangle", 0.04, 260);
    setTimeout(() => sfx.saber(), 190);
    vfx.pfx(manaBurst, hit, { anchor: [0, -29], palette: GOLD, until: 0.5, delay: 70 });
    setTimeout(() => {
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
  // ноги бьющего: герой после рывка у края босса; взмах pixelfx ложится правее ног (середина дуги ~26 пикселей
  // вперёд), поэтому ставим ноги так, чтобы дуга пришлась на босса, но не дальше, чем стоит герой
  const feet = [Math.min(h.x + h.w * 0.64 + dash, hit[0] - 26 * vfx.qx()), h.y + h.h * 0.97];
  for (const [mod, { lead, feet: fromFeet, ...o }] of (MELEE[kind] || MELEE.slash)(col))
    vfx.pfx(mod, fromFeet ? feet : hit, { ...o, delay: 300 - lead });
  setTimeout(() => {
    if (kind === "saber" || kind === "scythe") sfx.zap();
    else if (kind === "goldslash") {
      sfx.clang();
      setTimeout(() => sfx.clang(), 90);
    } else if (kind === "smash") {
      sfx.thud();
      replay($("arena"), "quake");
    } else sfx.clang();
  }, 300);
  return 330;
}

/** Рывок босса к герою и обратно (укус). */
function bossDash(dx) {
  if (REDUCED) return;
  bossCv.animate(
    [
      { transform: "none" },
      { transform: "translateX(8px) rotate(4deg)", offset: 0.2 },
      { transform: `translateX(${-dx}px) rotate(-6deg)`, offset: 0.45 },
      { transform: `translateX(${-dx}px) rotate(3deg)`, offset: 0.6 },
      { transform: "none" },
    ],
    { duration: 560, easing: "ease-in-out" },
  );
}
/** Попадание ответного удара по герою (pixelfx) поверх снаряда босса. */
const INK = ["#0b0f24", "#141a33", "#1f2a55", "#2c3f7a", "#4a5fa0", "#7a8cc8", "#a8b8ff", "#d6e0ff"];
function hitFx(k, to, c, t, pal) {
  const col = c.at(-1),
    floor = [to[0], heroFeet()[1]];
  // брызги на земле у героя: чернила, слизь, вода (не красное — чтобы не было похоже на кровь)
  if (pal === "blot" || pal === "octopus") vfx.pfx(splash, floor, { from: 0.3, until: 0.9, palette: INK, delay: t });
  if (pal === "slime") vfx.pfx(acidSplash, floor, { from: 0.32, until: 0.9, palette: vfx.shades(col), delay: t });
  if (pal === "shark") vfx.pfx(splash, floor, { from: 0.3, until: 0.9, delay: t });
  if (SIG[pal]) return; // у фирменных атак своё попадание
  if (k === "zap")
    vfx.pfx(zapHit, to, { anchor: [0, -7], flip: true, palette: vfx.shades(col), until: 0.45, delay: t - 60 });
  else if (k === "snow") vfx.pfx(snowflakeBurst, to, { anchor: [0, -48], from: 0.1, until: 0.7, delay: t - 50 });
  else if (!["fire", "cannon", "rocket", "royal"].includes(k)) spark(to, col, t, true);
}
/** Заклинание: магический снаряд pixelfx летит по дуге из пасти в героя и рассыпается звёздами. */
function missile({ mouth, to, c }) {
  sfx.spell();
  const reach = Math.max(30, (mouth[0] - to[0]) / vfx.qx());
  vfx.pfx(magicMissile, [mouth[0], to[1]], {
    anchor: [0, -26],
    flip: true,
    reach,
    from: 0.35,
    until: 1.2,
    palette: vfx.shades(c.at(-1)),
  });
  setTimeout(() => sfx.zap(), 520);
  return 520;
}
/** Фирменные атаки боссов (по палитре; во второй форме — обычная атака формы). Возвращают мс до попадания. */
const SIG = {
  // пчела: рой полосатых пчёлок зигзагом
  bee: ({ mouth, to }) => {
    tone(180, 0.5, "sawtooth", 0.015, 240);
    const t = vfx.swarm(mouth, to, 7);
    setTimeout(() => sfx.scratch(2), t);
    return t;
  },
  // тарелка-похититель: луч похищения над героем
  ufo: ({ to, c }) => {
    sfx.beep();
    setTimeout(() => sfx.laser(), 200);
    vfx.pfx(tractorBeam, [to[0], heroFeet()[1]], { until: 0.9, palette: vfx.shades(c.at(-1)) });
    return 380;
  },
  wizard: missile,
  krakoz: missile,
  book: missile,
  angelika: missile,
  ghost: missile,
};
const DEF_ATK = { k: "spell", c: ["#ffffff", "#ffd0f4", "#c77dff"] };
/**
 * Ответная атака босса на ошибку: у каждого свой удар (ATTACK по палитре, во второй форме G.boss.atk).
 * outcome: "hit" — попал, "block" — отбил щит героя, "dodge" — герой увернулся (снаряд пролетает ниже).
 * Возвращает, через сколько мс удар доходит до героя: тогда сердце и «ой».
 */
export function bossAttack(outcome = "hit") {
  if (!G) return 0;
  const atk = G.boss.atk || ATTACK[G.boss.pal] || DEF_ATK,
    c = atk.c || DEF_ATK.c,
    n = atk.n || 1;
  const h = rel(heroCv),
    b = rel(bossCv);
  const mouth = [b.x + b.w * 0.22, b.y + b.h * 0.45],
    body = [h.x + h.w * 0.6, h.y + h.h * 0.5];
  const to =
    outcome === "block" ? [h.x + h.w * 0.92, body[1]] : outcome === "dodge" ? [h.x + h.w * 0.2, h.y + h.h * 0.9] : body;
  const cast = () => replay(bossCv, "cast");
  let t;
  const sig = !G.boss.atk && SIG[G.boss.pal];
  if (sig) {
    cast();
    t = sig({ mouth, to, c, outcome });
  } else
    switch (atk.k) {
      case "splat":
        cast();
        sfx.whoosh(false);
        t = vfx.splat(mouth, to, c);
        setTimeout(() => sfx.splat(), t);
        break;
      case "stamp":
        cast();
        tone(700, 0.25, "square", 0.025, 200);
        t = vfx.stampDrop(to, c);
        setTimeout(() => sfx.thud(), t);
        break;
      case "needles":
        cast();
        sfx.whoosh(false);
        t = vfx.needles(mouth, to, c, n > 1 ? n : 5);
        setTimeout(() => sfx.scratch(2), t);
        break;
      case "zap":
        cast();
        sfx.beep();
        setTimeout(() => sfx.laser(), 160);
        t = vfx.zap(mouth, to, c);
        break;
      case "spell":
        cast();
        sfx.spell();
        t = vfx.spell(mouth, to, c, n);
        setTimeout(() => sfx.zap(), t);
        break;
      case "bone":
        cast();
        sfx.whoosh(false);
        t = vfx.bone(mouth, to, c);
        setTimeout(() => sfx.clang(), t);
        break;
      case "shuriken":
        cast();
        sfx.whoosh(false);
        setTimeout(() => sfx.whoosh(false), 90);
        t = vfx.shuriken(mouth, to, c);
        setTimeout(() => sfx.clang(), t);
        break;
      case "snow":
        cast();
        sfx.whoosh(false);
        t = vfx.snowball(mouth, to, c);
        setTimeout(() => sfx.shatter(), t);
        break;
      case "tongue":
        tone(300, 0.1, "triangle", 0.04, 900);
        t = vfx.tongue(mouth, to, c);
        setTimeout(() => sfx.splat(), t);
        break;
      case "plane":
        cast();
        sfx.paper();
        t = vfx.plane(mouth, to, c, n);
        setTimeout(() => sfx.paper(), t);
        break;
      case "fire":
        if (atk.big) {
          sfx.fireball();
          t = vfx.fireball(mouth, to, { big: true });
          setTimeout(() => sfx.boom(false), t);
        } else {
          cast();
          sfx.roar(300);
          vfx.pfx(fireBreath, mouth, { ...vfx.aim(mouth, to), palette: vfx.shades(c.at(-1)), until: 0.4, soft: 0.25 });
          t = 220;
        }
        break;
      case "cannon":
        cast();
        sfx.cannon();
        vfx.shell(mouth, to);
        t = 300;
        setTimeout(() => sfx.boom(false), t);
        break;
      case "rocket":
        cast();
        sfx.rocketLaunch();
        t = vfx.rocket(mouth, to);
        setTimeout(() => sfx.boom(true), t);
        break;
      case "royal":
        // скипетр вверх — и молния с неба в героя
        cast();
        tone(140, 0.18, "triangle", 0.04, 260);
        for (let i = 0; i < n; i++)
          setTimeout(
            () => {
              sfx.thunder();
              vfx.pfx(lightningStrike, [to[0], heroFeet()[1]], { from: 0.75, until: 1.1, soft: 0 });
            },
            240 + i * 220,
          );
        t = 300 + (n - 1) * 220;
        break;
      default: {
        // bite: подбегает и кусает
        const dx = Math.max(30, b.x + b.w * 0.1 - (h.x + h.w * 0.85));
        bossDash(dx);
        tone(140, 0.18, "triangle", 0.04, 260);
        t = 270;
        setTimeout(() => {
          vfx.bite(to);
          sfx.chomp();
        }, t - 20);
      }
    }
  if (outcome === "dodge") setTimeout(() => replay(heroCv, "dodge"), Math.max(0, t - 180));
  if (outcome === "block") {
    guardFx(to, Math.max(0, t - 60));
    setTimeout(() => sfx.block(), t);
  }
  if (outcome === "hit") hitFx(atk.k, to, c, t, G.boss.atk ? null : G.boss.pal);
  return t;
}
/** Вампир тянет жизнь из героя. */
export function bossDrain() {
  const h = rel(heroCv),
    b = rel(bossCv);
  vfx.drain([h.x + h.w * 0.6, h.y + h.h * 0.45], [b.x + b.w * 0.45, b.y + b.h * 0.5]);
}
/** Воришка: монетки летят от героя к боссу. */
export function bossSteal(n) {
  const h = rel(heroCv),
    b = rel(bossCv);
  vfx.coinsFly([h.x + h.w * 0.6, h.y + h.h * 0.4], [b.x + b.w * 0.4, b.y + b.h * 0.4], n);
  sfx.coin();
}
