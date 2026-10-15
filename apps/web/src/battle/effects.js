// Визуальные эффекты боя: удары, оружие, питомцы, всплывающие надписи.
import { $, replay } from "../lib/dom.js";
import { BREATH, PET_ATK } from "../content/pets.js";
import { drawHero } from "../render/hero.js";
import { P } from "../state/profile.js";
import { sfx, tone } from "../audio/sfx.js";
import { bossCv, heroCv } from "./hud.js";
import { G } from "./run.js";
import { heroFrame } from "../ui/animation.js";

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
export function petAttack() {
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
export function fx(kind, col) {
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
