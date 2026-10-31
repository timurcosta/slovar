// Пиксельные эффекты боя: canvas поверх арены (1 пиксель эффекта = пиксель героя на экране), снаряды со
// шлейфами, искры, дым, взрывы, лучи, молнии, спираль рельсы. Координаты на входе — как у rel()
// (CSS px от угла арены), внутри — пиксели эффекта. Цикл крутится, только пока есть что рисовать.
import { $, replay } from "../lib/dom.js";
import { createFrame, clearFrame, createFx, composite, hex } from "../vendor/pixelfx/core/index.js";
import * as smallExplosion from "../vendor/pixelfx/fx/explosions/small-explosion.js";
import * as fireballFx from "../vendor/pixelfx/fx/fire/fireball.js";
import * as meteor from "../vendor/pixelfx/fx/fire/meteor.js";

let PX = 3,
  cv = null,
  ctx = null,
  W = 0,
  H = 0,
  ox = 0,
  oy = 0,
  raf = 0,
  last = 0;
const items = [];

const rnd = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, k) => a + (b - a) * k;

function ensure() {
  const ar = $("arena");
  // пиксель эффекта = пиксель героя: снаряды соразмерны бойцам на любом экране
  const hero = $("hero-cv").getBoundingClientRect().width;
  if (!items.length && hero) PX = Math.max(3, Math.round(hero / 42));
  if (!cv || !ar.contains(cv)) {
    cv = document.createElement("canvas");
    cv.className = "vfx";
    ar.appendChild(cv);
    ctx = cv.getContext("2d");
  }
  W = Math.ceil(ar.clientWidth / PX);
  H = Math.ceil(ar.clientHeight / PX);
  if (cv.width !== W) cv.width = W;
  if (cv.height !== H) cv.height = H;
  cv.style.width = W * PX + "px";
  cv.style.height = H * PX + "px";
  // rel() считает от внешнего края арены, canvas стоит внутри рамки
  ox = ar.clientLeft;
  oy = ar.clientTop;
  ensureQ(ar, hero);
}
/** CSS px арены → пиксели эффекта. */
const P = (x, y) => [(x - ox) / PX, (y - oy) / PX];

function tick(now) {
  const dt = Math.min(50, now - (last || now));
  last = now;
  ctx.clearRect(0, 0, W, H);
  if (qimg) qimg.data.fill(0);
  if (limg) limg.data.fill(0);
  qdrawn = false;
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    it.age += dt;
    if (it.age < 0) continue; // ещё не стартовал (delay)
    if (it.age >= it.life) {
      items.splice(i, 1);
      if (it.done) it.done();
      continue;
    }
    it.step(it.age / it.life, dt, it.age);
  }
  if (qdrawn || qshown) {
    qctx.putImageData(qimg, 0, 0);
    lctx.putImageData(limg, 0, 0);
  }
  qshown = qdrawn;
  if (items.length) raf = requestAnimationFrame(tick);
  else {
    raf = 0;
    last = 0;
    ctx.clearRect(0, 0, W, H);
  }
}
/** Добавить эффект: step(k 0..1, dt, age) рисует кадр; delay — через сколько мс начать. */
function add(life, step, delay = 0, done) {
  if (!ctx) ensure();
  items.push({ life, step, age: -delay, done });
  if (!raf) raf = requestAnimationFrame(tick);
}

// ---------- pixelfx ----------
// Эффекты из vendor/pixelfx (MIT) рисуют в свой кадр: буфер цвета и буфер свечения. В тёмном окне сцены — как у
// pixelfx: цвет на одном холсте, свечение на другом, который складывается с тем, что под ним (plus-lighter).
// Вне окна арена — белая бумага (paper): яркое свечение становится сплошными пикселями, ореол — полупрозрачным,
// сплошные пятна получают тёмный контур, как у героя. Их персонаж ростом 38 пикселей, наш 27: пиксель эффекта —
// 27/38 пикселя героя (QK), округлён до пикселя экрана, и эффекты соразмерны бойцам как в галерее pixelfx.
let qcv = null,
  qctx = null,
  lcv = null, // свечение в окне сцены: отдельный холст, складывается со всем, что под ним (plus-lighter)
  lctx = null,
  limg = null,
  qimg = null,
  QX = 3,
  qdrawn = false,
  qshown = false;
const QK = 0.71,
  INK = [0x14, 0x1a, 0x33];
function ensureQ(ar, hero) {
  const dpr = window.devicePixelRatio || 1;
  if (!items.length && hero) QX = Math.max(1, Math.round((hero / 42) * QK * dpr)) / dpr;
  if (!qcv || !ar.contains(qcv)) {
    qcv = document.createElement("canvas");
    qcv.className = "vfx";
    ar.appendChild(qcv);
    qctx = qcv.getContext("2d");
    lcv = document.createElement("canvas");
    lcv.className = "vfx";
    lcv.style.mixBlendMode = CSS.supports("mix-blend-mode", "plus-lighter") ? "plus-lighter" : "screen";
    ar.appendChild(lcv);
    lctx = lcv.getContext("2d");
    qimg = null;
  }
  // арена бывает скрыта (экран сменился, пока ждал таймер): холст 1×1, эффекты не рисуются
  const w = Math.max(1, Math.ceil(ar.clientWidth / QX)),
    h = Math.max(1, Math.ceil(ar.clientHeight / QX));
  if (qcv.width !== w || qcv.height !== h || !qimg) {
    qcv.width = lcv.width = w;
    qcv.height = lcv.height = h;
    qimg = qctx.createImageData(w, h);
    limg = lctx.createImageData(w, h);
  }
  qcv.style.width = lcv.style.width = w * QX + "px";
  qcv.style.height = lcv.style.height = h * QX + "px";
  // окно сцены с тёмным фоном (render/arena.js): внутри него свечение как задумано в pixelfx
  const st = $("stage");
  if (st && st.classList.contains("scene")) {
    const a = ar.getBoundingClientRect(),
      r = st.getBoundingClientRect();
    scene = [r.left - a.left, r.top - a.top, r.right - a.left, r.bottom - a.top].map((v, i) =>
      Math.round((v - (i % 2 ? oy : ox)) / QX),
    );
  } else scene = null;
}
/** Сколько CSS px в пикселе pixelfx. */
export const qx = () => (ensure(), QX);
/** CSS px арены → пиксели pixelfx. */
const Q = (x, y) => [(x - ox) / QX, (y - oy) / QX];
let tmp = null,
  solid = null,
  thick = null,
  scene = null;
const inScene = (i, w, sc) => {
  const x = i % w,
    y = (i / w) | 0;
  return x >= sc[0] && x < sc[2] && y >= sc[1] && y < sc[3];
};
/**
 * Кадр эффекта поверх qimg; soft — сила дыма и тумана. На бумаге сплошное — с контуром, ореол — полупрозрачный;
 * в тёмном окне сцены — как у pixelfx над пустотой: свечение прибавляется к цвету и становится прозрачностью.
 */
function paper(f, soft, out = qimg.data, sc = scene) {
  const { w, h, color: C, light: L } = f,
    n = w * h;
  if (out === qimg.data && (w !== qimg.width || h !== qimg.height)) return; // арена сменила размер посреди эффекта
  if (!tmp || tmp.length < n * 4) {
    tmp = new Uint8ClampedArray(n * 4);
    solid = new Uint8Array(n);
    thick = new Uint8Array(n);
  }
  tmp.fill(0, 0, n * 4);
  solid.fill(0, 0, n);
  thick.fill(0, 0, n);
  for (let i = 0; i < n; i++) {
    const c = C[i],
      l = L[i] & 0xffffff;
    let ca = c >>> 24;
    if (!ca && !l) continue;
    if (ca && ca < 200) ca = ca * soft;
    const lr = l & 255,
      lg = (l >>> 8) & 255,
      lb = (l >>> 16) & 255,
      m = Math.max(lr, lg, lb),
      j = i * 4;
    if (sc && inScene(i, w, sc)) {
      // как composite() у pixelfx над фоном: цвет как есть (дым полупрозрачный), свечение прибавляется
      const raw = c >>> 24;
      if (raw >= 8) {
        tmp[j] = c & 255;
        tmp[j + 1] = (c >>> 8) & 255;
        tmp[j + 2] = (c >>> 16) & 255;
        tmp[j + 3] = raw;
      }
      if (m) {
        const L = limg.data;
        L[j] += lr;
        L[j + 1] += lg;
        L[j + 2] += lb;
        L[j + 3] = 255;
      }
      continue;
    }
    if (ca >= 8) {
      tmp[j] = (c & 255) + lr;
      tmp[j + 1] = ((c >>> 8) & 255) + lg;
      tmp[j + 2] = ((c >>> 16) & 255) + lb;
      tmp[j + 3] = ca;
      if (ca > 200) solid[i] = 1;
    } else if (m > 24) {
      // свечение: яркое ядро — сплошное, ореол — полупрозрачный, тускнеет быстрее, чем на тёмном фоне
      const k = 255 / m,
        a = m > 150 ? 255 : 230 * Math.pow((m - 24) / 126, 1.6);
      tmp[j] = lr * k;
      tmp[j + 1] = lg * k;
      tmp[j + 2] = lb * k;
      tmp[j + 3] = a;
      if (m > 150) solid[i] = 1;
    }
  }
  // контур только у толстых пятен (есть сплошной квадрат 2×2): искры, пыль и тонкие кольца остаются без него,
  // иначе превращаются в сор и двойные штрихи
  for (let i = w; i < n - w; i++) {
    const x = i % w;
    thick[i] =
      solid[i] &&
      ((x < w - 1 && solid[i + 1] && ((solid[i - w] && solid[i - w + 1]) || (solid[i + w] && solid[i + w + 1]))) ||
        (x > 0 && solid[i - 1] && ((solid[i - w] && solid[i - w - 1]) || (solid[i + w] && solid[i + w - 1]))))
        ? 1
        : 0;
  }
  for (let i = 0; i < n; i++) {
    if (tmp[i * 4 + 3] || i % w === 0 || i % w === w - 1 || i < w || i >= n - w || (sc && inScene(i, w, sc))) continue;
    const a = thick[i - 1],
      b = thick[i + 1],
      u = thick[i - w],
      d = thick[i + w];
    if (a || b || u || d) {
      const j = i * 4;
      tmp[j] = INK[0];
      tmp[j + 1] = INK[1];
      tmp[j + 2] = INK[2];
      tmp[j + 3] = 255;
    }
  }
  for (let i = 0; i < n; i++) {
    const j = i * 4,
      a = tmp[j + 3];
    if (!a) continue;
    if (a === 255 || !out[j + 3]) {
      out[j] = tmp[j];
      out[j + 1] = tmp[j + 1];
      out[j + 2] = tmp[j + 2];
      out[j + 3] = a;
    } else {
      const k = a / 255;
      for (let c = 0; c < 3; c++) out[j + c] = tmp[j + c] * k + out[j + c] * (1 - k);
      out[j + 3] = Math.max(a, out[j + 3]);
    }
  }
  qdrawn = true;
}
/**
 * Эффекты pixelfx на отдельном холсте cv (w×h пикселей): поверх тёмного фона bg — как в галерее pixelfx, без bg —
 * прозрачно, под белую бумагу (сундук на окне победы).
 * list: [{mod, at: [x, y] в пикселях холста, delay мс, until с, hold с — замереть, ...опции}]. Крутится, пока холст
 * на странице.
 */
export function playOn(cv, w, h, bg, list) {
  cv.width = w;
  cv.height = h;
  const c = cv.getContext("2d"),
    img = c.createImageData(w, h),
    frame = createFrame(w, h),
    back = bg ? hex(bg) : null,
    live = list.map(({ mod, at, delay = 0, until = Infinity, hold = Infinity, ...o }) => ({
      fx: createFx(mod, { ...o, x: at[0], y: at[1] }),
      delay,
      until,
      hold,
      age: 0,
    }));
  let last = 0;
  const step = (now) => {
    if (!cv.isConnected) return;
    const dt = Math.min(50, now - (last || now));
    last = now;
    clearFrame(frame);
    let alive = 0;
    for (const e of live) {
      e.age += dt;
      if (e.age < e.delay) {
        alive++;
        continue;
      }
      if (e.fx.t < e.hold) e.fx.update(dt / 1000); // hold: замереть на этом кадре (открытый сундук)
      if (e.fx.t >= e.until) e.fx.stop();
      if (e.fx.done()) continue;
      alive++;
      e.fx.draw(frame);
    }
    if (back !== null) composite(frame, img.data, back);
    else {
      img.data.fill(0);
      paper(frame, 0.15, img.data, null); // без фона — под бумагу, с контуром, дым почти убран
    }
    c.putImageData(img, 0, 0);
    if (alive) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
/** Направить эффект pixelfx (он смотрит вправо) из from в to: зеркало, если цель левее, и поворот. */
export function aim(from, to) {
  const dx = to[0] - from[0],
    dy = to[1] - from[1];
  return dx < 0 ? { flip: true, angle: Math.atan2(-dy, -dx) } : { angle: Math.atan2(dy, dx) };
}
/** Пиксели движка vfx → CSS px арены (для pfx). */
const css = (x, y) => [x * PX + ox, y * PX + oy];
/** Ступени цвета от тёмного к белому — палитра pixelfx из одного цвета оружия. */
export function shades(col) {
  const n = parseInt(col.slice(1), 16),
    rgb = [n >> 16, (n >> 8) & 255, n & 255],
    dark = [0x14, 0x1a, 0x33];
  const hex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  const mix = (a, k) => rgb.map((v, i) => v + (a[i] - v) * k);
  return [
    mix(dark, 0.75),
    mix(dark, 0.5),
    mix(dark, 0.25),
    rgb,
    mix([255, 255, 255], 0.35),
    mix([255, 255, 255], 0.7),
    [255, 255, 255],
  ].map(hex);
}
/**
 * Эффект pixelfx в точке арены (CSS px, как rel()). anchor — какая точка эффекта (в его пикселях от начала)
 * встаёт в at; from — с какой секунды эффекта начать (пропустить замах); until — когда начать гаснуть;
 * soft — сила дыма и тумана (0 — убрать); move: {to, ms} — лететь из at в to (снаряды-петли pixelfx);
 * delay — мс до старта; остальное уходит в опции эффекта (palette, flip, angle, seed...). Возвращает мс до старта.
 */
export function pfx(mod, at, { anchor = [0, 0], from = 0, until = Infinity, soft = 0.6, delay = 0, move, ...o } = {}) {
  ensure();
  if (qimg.width < 2) return delay;
  const fl = o.flip ? -1 : 1,
    D = mod.meta.duration,
    place = ([x, y]) => {
      const [qx, qy] = Q(x, y);
      return [Math.round(qx - anchor[0] * fl), Math.round(qy - anchor[1])];
    },
    [x0, y0] = place(at),
    [x1, y1] = move ? place(move.to) : [x0, y0];
  const fx = createFx(mod, { ...o, x: x0, y: y0 });
  if (from) fx.update(from);
  const life = (Math.min(D, until + 0.3) - from) * 1000;
  const frame = createFrame(qimg.width, qimg.height);
  add(
    life,
    (k, dt, age) => {
      if (move) {
        const m = Math.min(1, age / move.ms);
        fx.options.x = Math.round(lerp(x0, x1, m));
        fx.options.y = Math.round(lerp(y0, y1, m));
      }
      fx.update(dt / 1000);
      if (fx.t >= until) fx.stop();
      clearFrame(frame);
      fx.draw(frame);
      paper(frame, soft);
    },
    delay,
  );
  return delay;
}

const px = (x, y, c, s = 1) => {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s);
};
function line(x0, y0, x1, y1, c, w = 1) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= n; i++) px(lerp(x0, x1, i / n), lerp(y0, y1, i / n), c, w);
}
function circle(cx, cy, r, c, w = 1) {
  const n = Math.max(12, Math.ceil(r * 7));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, c, w);
  }
}
function disc(cx, cy, r, c) {
  ctx.fillStyle = c;
  for (let j = -r; j <= r; j++) {
    const w = Math.round(Math.sqrt(r * r - j * j));
    ctx.fillRect(Math.round(cx - w), Math.round(cy + j), w * 2 + 1, 1);
  }
}
/** Цвет по возрасту частицы: список от рождения к смерти. */
const ramp = (cols, k) => cols[Math.min(cols.length - 1, Math.floor(k * cols.length))];

// ---------- примитивы ----------

/** Облако частиц из точки. */
function burstParticles(
  x,
  y,
  { n = 10, cols = ["#fff", "#ffd23f"], speed = 60, life = 400, size = 1, grav = 0, drag = 2, up = 0 } = {},
) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2),
      v = rnd(speed * 0.3, speed);
    let vx = Math.cos(a) * v,
      vy = Math.sin(a) * v - up,
      px0 = x,
      py0 = y;
    const s = typeof size === "number" ? size : Math.round(rnd(size[0], size[1]));
    add(rnd(life * 0.6, life), (k, dt) => {
      const d = dt / 1000;
      vx *= 1 - drag * d;
      vy = vy * (1 - drag * d) + grav * d;
      px0 += vx * d;
      py0 += vy * d;
      px(px0, py0, ramp(cols, k), s);
    });
  }
}
function smoke(x, y, n = 6, size = 3, life = 700) {
  for (let i = 0; i < n; i++) {
    const vx = rnd(-12, 12),
      vy = rnd(-22, -6),
      r0 = rnd(size * 0.6, size);
    let sx = x + rnd(-3, 3),
      sy = y + rnd(-3, 3);
    add(rnd(life * 0.7, life), (k, dt) => {
      sx += (vx * dt) / 1000;
      sy += (vy * dt) / 1000;
      disc(sx, sy, Math.round(r0 * (0.6 + k)), ramp(["#8a8aa0", "#6f6f86", "#55556b", "#3e3e52"], k));
    });
  }
}
function ring(x, y, r0, r1, cols, life = 300, w = 1, delay = 0) {
  add(life, (k) => circle(x, y, lerp(r0, r1, 1 - (1 - k) * (1 - k)), ramp(cols, k), w), delay);
}
/** Вспышка на всю арену. */
function flash(c = "#ffffff", life = 140, a = 0.7, delay = 0) {
  add(
    life,
    (k) => {
      ctx.globalAlpha = a * (1 - k);
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    },
    delay,
  );
}
const shake = () => replay($("arena"), "quake");
function muzzle(x, y, cols, size = 3, life = 90) {
  add(life, (k) => {
    const r = Math.round(size * (1 - k * 0.5));
    disc(x, y, r, cols[0]);
    if (r > 1) disc(x, y, r - 1, cols[1] || "#fff");
    px(x + r + 1, y, cols[0]);
  });
}
/** Частицы стягиваются к точке — заряд оружия. */
function charge(x, y, cols, ms, r = 18, n = 16) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2),
      d = rnd(r * 0.6, r),
      delay = rnd(0, ms * 0.5);
    add(
      ms - delay,
      (k) => {
        const e = k * k;
        px(x + Math.cos(a) * d * (1 - e), y + Math.sin(a) * d * (1 - e), ramp(cols, k));
      },
      delay,
    );
  }
  add(ms, (k) => {
    const r2 = Math.round(1 + k * 3 + Math.sin(k * 40) * 0.6);
    disc(x, y, r2, cols[0]);
    disc(x, y, Math.max(0, r2 - 1), "#ffffff");
  });
}
/** Взрыв (pixelfx): вспышка, огненный шар, обломки, дым, тряска; cols — свои цвета (от светлого к тёмному). */
function explosion(x, y, big = false, cols = null) {
  flash("#fff7e0", big ? 160 : 90, big ? 0.5 : 0.3);
  const o = { anchor: [0, -10], size: big ? 0.65 : 0.45, from: 0.08, until: 0.75, soft: 0.35 };
  pfx(smallExplosion, css(x, y), cols ? { ...o, palette: [...cols].reverse() } : o);
  shake();
}
function sparks(x, y, cols, n = 12, speed = 90) {
  burstParticles(x, y, { n, cols, speed, life: 320, size: 1, drag: 4 });
}

// ---------- оружие ----------

/** Плазменные выстрелы бластера: n зарядов с шагом gap мс. Возвращает время первого попадания. */
export function plasma(
  from,
  to,
  { n = 3, gap = 90, cols = ["#ffffff", "#a8f0ff", "#45d1e6"], spread = 0, sound } = {},
) {
  ensure();
  const [x0, y0] = P(...from),
    [x1, y1] = P(...to);
  const fly = 150;
  for (let i = 0; i < n; i++) {
    const dy = spread ? (i % 2 ? spread : -spread) : rnd(-2, 2),
      ty = y1 + rnd(-4, 4);
    setTimeout(() => {
      if (sound) sound(i);
      muzzle(x0, y0 + dy, [cols[2], cols[0]], 4, 80);
    }, i * gap);
    add(
      fly,
      (k) => {
        const x = lerp(x0, x1, k),
          y = lerp(y0 + dy, ty, k);
        // шлейф, светящаяся оболочка и белое ядро заряда
        for (let t = 1; t <= 8; t++)
          px(x - 4 - t * 2, lerp(y0 + dy, ty, Math.max(0, k - t * 0.025)), ramp(cols, t / 9), t < 4 ? 3 : 2);
        ctx.fillStyle = cols[2];
        ctx.fillRect(Math.round(x - 6), Math.round(y - 2), 12, 5);
        ctx.fillRect(Math.round(x - 4), Math.round(y - 3), 8, 7);
        ctx.fillStyle = cols[1];
        ctx.fillRect(Math.round(x - 5), Math.round(y - 1), 10, 3);
        ctx.fillStyle = cols[0];
        ctx.fillRect(Math.round(x - 3), Math.round(y), 7, 1);
      },
      i * gap,
      () => {
        add(180, (k) => {
          ctx.globalAlpha = 1 - k;
          disc(x1, ty, Math.round(2 + k * 5), cols[2]);
          disc(x1, ty, Math.round(1 + k * 3), cols[0]);
          ctx.globalAlpha = 1;
        });
        sparks(x1, ty, cols, 12, 100);
        ring(x1, ty, 2, 9, cols, 200);
      },
    );
  }
  return fly;
}

/** Огненный шар по дуге с шлейфом пламени и дымом. */
export function fireball(
  from,
  to,
  { big = false, cols = ["#ffffff", "#fff3a0", "#ffd23f", "#ff7a1a", "#d62839"] } = {},
) {
  ensure();
  const fly = 340;
  charge(...P(...from), cols.slice(1), 140, 10, 8);
  pfx(fireballFx, from, {
    move: { to, ms: fly },
    until: fly / 1000,
    radius: big ? 7 : 5,
    delay: 140,
    ...aim(from, to),
  });
  setTimeout(() => explosion(...P(...to), big), 140 + fly);
  return 140 + fly;
}

/** Ракета: большой пиксельный снаряд, дым за ним, огонь из сопла, мощный взрыв. */
export function rocket(from, to) {
  ensure();
  const [x0, y0] = P(...from),
    [x1, y1] = P(...to);
  const fly = 520,
    arc = Math.min(26, Math.abs(x1 - x0) * 0.22);
  smoke(x0 - 4, y0, 5, 3, 600); // выхлоп назад
  muzzle(x0, y0, ["#ffd23f", "#ffffff"], 4, 110);
  let px0 = x0,
    py0 = y0;
  add(
    fly,
    (k, dt, age) => {
      const e = k * k * (3 - 2 * k) * 0.35 + k * k * 0.65; // разгон
      const x = lerp(x0, x1, e),
        y = lerp(y0, y1, e) - Math.sin(e * Math.PI) * arc + Math.sin(age / 30) * 0.6;
      const ang = Math.atan2(y - py0, x - px0 || 0.01);
      px0 = x;
      py0 = y;
      if (Math.random() < 0.85) smoke(x - Math.cos(ang) * 12, y - Math.sin(ang) * 12, 1, 2, 650);
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      ctx.rotate(ang);
      const fl = Math.floor(age / 35) % 3;
      const R = (a, b, w, h, c) => {
        ctx.fillStyle = c;
        ctx.fillRect(a, b, w, h);
      };
      // пламя из сопла
      R(-11 - fl, -1, 3 + fl, 3, ["#fff3a0", "#ffd23f", "#ff7a1a"][fl]);
      R(-10, -1, 1, 3, "#ffffff");
      // корпус
      R(-9, -2, 11, 5, "#3a3f5c");
      R(-8, -1, 10, 3, "#e3e8f0");
      R(-8, 1, 10, 1, "#9aa7bd");
      R(-4, -1, 1, 3, "#d62839");
      R(-1, -1, 1, 1, "#45d1e6");
      // головная часть
      R(2, -2, 2, 5, "#3a3f5c");
      R(2, -1, 3, 3, "#d62839");
      R(5, 0, 1, 1, "#d62839");
      // стабилизаторы
      R(-9, -4, 3, 2, "#d62839");
      R(-9, 3, 3, 2, "#d62839");
      ctx.restore();
    },
    0,
    () => explosion(x1, y1, true),
  );
  return fly;
}

/** Рельса: заряд у ствола, мгновенный луч и двойная спираль вокруг него, которая медленно тает. */
export function rail(from, to, chargeMs = 300) {
  ensure();
  const [x0, y0] = P(...from),
    [x1, y1] = P(...to);
  const len = Math.hypot(x1 - x0, y1 - y0),
    ux = (x1 - x0) / len,
    uy = (y1 - y0) / len;
  charge(x0, y0, ["#ffffff", "#a8f0ff", "#45d1e6", "#2a6bd6"], chargeMs, 22, 22);
  // луч
  add(
    220,
    (k) => {
      const w = k < 0.3 ? 4 : 2;
      line(x0, y0, x1, y1, "#2a6bd6", w + 4);
      line(x0, y0, x1, y1, k < 0.5 ? "#a8f0ff" : "#45d1e6", w + 2);
      line(x0, y0, x1, y1, "#ffffff", w);
    },
    chargeMs,
  );
  // спираль: две нити, синус по длине луча, раскручиваются и бледнеют
  add(
    1100,
    (k, dt, age) => {
      const amp = 5 + k * 6,
        ph = age / 80;
      const cols = [
        ["#ffffff", "#a8f0ff", "#45d1e6", "#2a6bd6"],
        ["#a8f0ff", "#45d1e6", "#2a6bd6", "#1b3a8a"],
      ];
      for (let s = 0; s < len; s += 0.7) {
        if (s > len * Math.min(1, k * 6)) break; // спираль «бежит» по лучу
        for (let strand = 0; strand < 2; strand++) {
          const a = s / 3.2 + ph + strand * Math.PI,
            off = Math.sin(a) * amp,
            front = Math.cos(a) > 0;
          if (k > 0.5 && Math.random() < (k - 0.5) * 2) continue; // тает
          px(x0 + ux * s - uy * off, y0 + uy * s + ux * off, ramp(cols[strand], k * (front ? 0.8 : 1)), front ? 2 : 1);
        }
      }
    },
    chargeMs,
  );
  // кольца вдоль луча
  [0.25, 0.5, 0.75].forEach((t, i) =>
    ring(lerp(x0, x1, t), lerp(y0, y1, t), 1, 8, ["#ffffff", "#a8f0ff", "#45d1e6"], 260, 1, chargeMs + i * 30),
  );
  setTimeout(() => {
    flash("#a8f0ff", 120, 0.45);
    muzzle(x0, y0, ["#a8f0ff", "#ffffff"], 4, 120);
    sparks(x1, y1, ["#ffffff", "#a8f0ff", "#45d1e6"], 22, 130);
    burstParticles(x1, y1, { n: 10, cols: ["#ffffff", "#a8f0ff"], speed: 160, life: 300, drag: 1 }); // насквозь
    ring(x1, y1, 2, 16, ["#ffffff", "#a8f0ff", "#45d1e6"], 300, 1);
    shake();
  }, chargeMs);
  return chargeMs + 20;
}

/** Аннигилятор: долгий заряд, толстый пульсирующий луч, в конце большой взрыв. */
export function annihilate(from, to, chargeMs = 380, beamMs = 460) {
  ensure();
  const [x0, y0] = P(...from),
    [x1, y1] = P(...to);
  const pink = ["#ffffff", "#ffd0f4", "#ff4fd8", "#a01f8a"];
  charge(x0, y0, pink, chargeMs, 26, 30);
  flash("#2a0a2a", chargeMs, 0.25);
  add(
    beamMs,
    (k, dt, age) => {
      const reach = Math.min(1, k * 5),
        ex = lerp(x0, x1, reach),
        ey = lerp(y0, y1, reach);
      const w = 7 + Math.sin(age / 25) * 2 - k * 3;
      line(x0, y0, ex, ey, "#a01f8a", w + 4);
      line(x0, y0, ex, ey, "#ff4fd8", w);
      line(x0, y0, ex, ey, "#ffd0f4", Math.max(1, w - 4));
      line(x0, y0, ex, ey, "#ffffff", 1);
      disc(x0, y0, Math.round(w / 2 + 2), "#ff4fd8");
      disc(x0, y0, Math.round(w / 2), "#ffffff");
      // частицы бегут вдоль луча
      for (let i = 0; i < 3; i++) {
        const t = Math.random() * reach;
        px(lerp(x0, x1, t), lerp(y0, y1, t) + rnd(-w, w), ramp(pink, Math.random()));
      }
      if (reach >= 1 && Math.random() < 0.6) sparks(x1, y1, pink, 3, 110);
    },
    chargeMs,
    () => explosion(x1, y1, true, ["#ffffff", "#ffd0f4", "#ff4fd8", "#c77dff", "#a01f8a", "#3a0a3a"]),
  );
  return chargeMs + beamMs / 5;
}

/** Комета сверху по дуге с ледяным хвостом, удар — ледяные осколки. */
export function comet(from, to) {
  ensure();
  const ice = ["#ffffff", "#a8f0ff", "#45d1e6", "#2a6bd6"];
  charge(...P(...from), ice, 120, 12, 10);
  // метеор падает слева сверху и бьёт в 0.62 с своего времени: с 0.2 с до удара 0.42 с
  pfx(meteor, to, {
    anchor: [0, -6],
    from: 0.2,
    until: 0.9,
    soft: 0.2,
    light: 0.5,
    palette: ["#10204a", ...[...ice].reverse()],
  });
  setTimeout(() => {
    flash("#a8f0ff", 180, 0.5);
    shake();
  }, 420);
  return 420;
}

/** Чёрная дыра: тёмный шар с орбитами, у босса закручивается воронка и затягивает частицы. */
export function blackhole(from, to) {
  ensure();
  const [x0, y0] = P(...from),
    [x1, y1] = P(...to);
  const vio = ["#ffffff", "#c77dff", "#7a4fd6", "#3d2a6b"];
  const fly = 330;
  add(
    fly,
    (k, dt, age) => {
      const x = lerp(x0, x1, k),
        y = lerp(y0, y1, k);
      disc(x, y, 5, "#7a4fd6");
      disc(x, y, 4, "#000000");
      for (let i = 0; i < 4; i++) {
        const a = age / 50 + (i * Math.PI) / 2;
        px(x + Math.cos(a) * 8, y + Math.sin(a) * 4, vio[i % 3], 2);
      }
    },
    0,
    () => {
      flash("#1b0f3a", 260, 0.3);
      add(750, (k, dt, age) => {
        const grow = Math.sin(k * Math.PI);
        // три спиральных рукава вращаются и втягиваются к центру
        for (let arm = 0; arm < 3; arm++)
          for (let d = 2; d < 24 * grow + 4; d += 1) {
            const a = age / 110 + arm * ((Math.PI * 2) / 3) + d / 5;
            px(x1 + Math.cos(a) * d, y1 + Math.sin(a) * d * 0.7, ramp(vio, d / 28), d < 8 ? 2 : 1);
          }
        disc(x1, y1, Math.round(2 + grow * 3), "#000000");
        circle(x1, y1, Math.round(3 + grow * 3), vio[1], 1);
      });
      for (let i = 0; i < 24; i++) {
        const a = rnd(0, Math.PI * 2),
          d0 = rnd(18, 30);
        add(
          rnd(400, 650),
          (k) => {
            const d = d0 * (1 - k),
              aa = a + k * 4;
            px(x1 + Math.cos(aa) * d, y1 + Math.sin(aa) * d * 0.7, ramp(vio, 1 - k), 2);
          },
          rnd(0, 250),
        );
      }
    },
  );
  return fly;
}

/** Лазерный луч (дрон и т. п.). */
export function laser(from, to, col = "#ff3b3b", big = false) {
  ensure();
  const [x0, y0] = P(...from),
    [x1, y1] = P(...to);
  add(200, (k) => {
    const w = (big ? 4 : 2) * (1 - k * 0.6);
    line(x0, y0, x1, y1, col, w + 2);
    line(x0, y0, x1, y1, "#ffffff", Math.max(1, w - 1));
  });
  muzzle(x0, y0, [col, "#ffffff"], 3, 90);
  setTimeout(() => sparks(x1, y1, ["#ffffff", col], 12, 100), 30);
  return 40;
}

// ---------- питомцы ----------

/** Робопёс: челюсти с зубами смыкаются на боссе. */
export function bite(at) {
  ensure();
  const [x, y] = P(...at);
  add(380, (k) => {
    const close = Math.min(1, k * 3),
      gap = Math.round(12 * (1 - close)) + 1;
    const shake = k > 0.33 ? Math.round(Math.sin(k * 60)) : 0;
    for (const dir of [-1, 1]) {
      const yy = y + dir * gap + shake;
      ctx.fillStyle = "#4a5670";
      ctx.fillRect(Math.round(x - 10), Math.round(yy + (dir < 0 ? -4 : 1)), 20, 3);
      for (let t = 0; t < 5; t++) {
        ctx.fillStyle = "#ffffff";
        const tx = Math.round(x - 9 + t * 4);
        if (dir < 0) ctx.fillRect(tx, Math.round(yy - 1), 3, 2);
        else ctx.fillRect(tx, Math.round(yy - 1), 3, 2);
        ctx.fillStyle = "#e3e8f0";
        ctx.fillRect(tx + 1, Math.round(yy + (dir < 0 ? 1 : -2)), 1, 1);
      }
    }
  });
  setTimeout(() => {
    sparks(x, y, ["#ffffff", "#ff3b3b", "#ffd23f"], 14, 100);
    ring(x, y, 2, 12, ["#ffffff", "#ff3b3b"], 220);
  }, 130);
}

/** Дрон: мигающий прицел, потом лазер. */
export function droneShot(from, to) {
  ensure();
  const [x0, y0] = P(...from),
    [x1, y1] = P(...to);
  add(140, (k, dt, age) => {
    if (Math.floor(age / 35) % 2) line(x0, y0, x1, y1, "#ff3b3b", 1);
    circle(x1, y1, 5 - k * 2, "#ff3b3b", 1);
  });
  add(
    180,
    (k) => {
      const w = 3 * (1 - k * 0.5);
      line(x0, y0, x1, y1, "#ff3b3b", w + 2);
      line(x0, y0, x1, y1, "#ffffff", Math.max(1, w - 1));
    },
    140,
    () => sparks(x1, y1, ["#ffffff", "#ff3b3b", "#ffd23f"], 14, 110),
  );
  muzzle(x0, y0, ["#ff3b3b", "#ffffff"], 3, 90);
}

/** Мини-танк: снаряд по дуге с дымком, взрыв. */
export function shell(from, to) {
  ensure();
  const [x0, y0] = P(...from),
    [x1, y1] = P(...to);
  const fly = 300,
    arc = Math.min(18, Math.abs(x1 - x0) * 0.2);
  muzzle(x0, y0, ["#ffd23f", "#ffffff"], 4, 100);
  smoke(x0, y0, 4, 2, 500);
  add(
    fly,
    (k) => {
      const x = lerp(x0, x1, k),
        y = lerp(y0, y1, k) - Math.sin(k * Math.PI) * arc;
      if (Math.random() < 0.6) smoke(x, y, 1, 1, 400);
      ctx.fillStyle = "#2a2f2a";
      ctx.fillRect(Math.round(x - 2), Math.round(y - 1), 5, 3);
      ctx.fillStyle = "#ffd23f";
      ctx.fillRect(Math.round(x + 2), Math.round(y), 1, 1);
    },
    0,
    () => explosion(x1, y1, false),
  );
}

/** Феникс: огненный шлейф по дуге полёта, у босса огненное кольцо. */
export function phoenix(from, to, ms = 300) {
  ensure();
  const [x0, y0] = P(...from),
    [x1, y1] = P(...to);
  const fire = ["#ffffff", "#fff3a0", "#ffd23f", "#ff7a1a", "#d62839"];
  const rise = 40 / PX;
  add(ms, (k) => {
    const x = lerp(x0, x1, k),
      y = lerp(y0, y1, k) - Math.sin(k * Math.PI) * rise;
    for (let n = 0; n < 3; n++) {
      let fx = x + rnd(-2, 2),
        fy = y + rnd(-2, 2);
      add(rnd(250, 420), (kk, d) => {
        fy -= (d / 1000) * 14;
        px(fx, fy, ramp(fire, kk), kk < 0.4 ? 2 : 1);
      });
    }
  });
  setTimeout(() => {
    ring(x1, y1, 3, 20, fire, 360, 2);
    burstParticles(x1, y1, { n: 20, cols: fire, speed: 110, life: 520, size: [1, 2], up: 50 });
    flash("#ffd23f", 140, 0.3);
  }, ms);
}

// ---------- атаки боссов (по герою) ----------
// Всё мультяшное: клякса шлёпает, кость прилетает и отскакивает. Возвращают, через сколько мс попадание.

/** Капля по дуге: чернила, слизь, паутина. На герое клякса, которая стекает. */
export function splat(from, to, cols) {
  ensure();
  const [x0, y0] = P(...from),
    [x1, y1] = P(...to);
  const fly = 320,
    arc = Math.min(24, Math.abs(x1 - x0) * 0.3);
  add(
    fly,
    (k, dt, age) => {
      const x = lerp(x0, x1, k),
        y = lerp(y0, y1, k) - Math.sin(k * Math.PI) * arc;
      const wob = Math.floor(age / 60) % 2;
      disc(x, y, 4 + wob, cols[2]);
      disc(x, y, 3, cols[1]);
      px(x - 1, y - 2, cols[0], 2);
      if (Math.random() < 0.5) {
        let dx = x,
          dy = y;
        add(260, (kk, d) => {
          dy += (d / 1000) * 30;
          px(dx, dy, ramp([cols[1], cols[2]], kk), 2);
        });
      }
    },
    0,
    () => {
      // клякса растекается и стекает каплями
      add(560, (k) => {
        ctx.globalAlpha = k < 0.7 ? 1 : (1 - k) / 0.3;
        const r = Math.round(lerp(3, 8, Math.min(1, k * 4)));
        disc(x1, y1, r, cols[2]);
        disc(x1 - 1, y1 - 1, r - 2, cols[1]);
        for (let i = -2; i <= 2; i++) px(x1 + i * 3, y1 + r + k * 10 * (1 + (i & 1)), cols[2], 2);
        ctx.globalAlpha = 1;
      });
      burstParticles(x1, y1, { n: 14, cols: [cols[1], cols[2]], speed: 90, life: 420, size: [1, 2], grav: 160 });
    },
  );
  return fly;
}

const TWO = ["11110", "00001", "00001", "01110", "10000", "10000", "11111"];
/** Огромная красная «2» падает сверху и штампует героя. */
export function stampDrop(to, cols) {
  ensure();
  const [x1, y1] = P(...to);
  const fall = 280,
    S = 2;
  // контур, потом заливка: цифра читается на любом фоне
  const draw = (x, y, rot) =>
    [
      [cols[2], -1, S + 2],
      [cols[1], 0, S],
    ].forEach(([c, o, sz]) => {
      ctx.fillStyle = c;
      TWO.forEach((row, j) =>
        [...row].forEach((ch, i) => {
          if (ch === "1")
            ctx.fillRect(Math.round(x + (i - 2) * S + (j - 3) * S * rot) + o, Math.round(y + (j - 3) * S) + o, sz, sz);
        }),
      );
    });
  add(
    fall,
    (k) => draw(x1, lerp(-10, y1 - 4, k * k), 0.15 * (1 - k)),
    0,
    () => {
      add(380, (k) => {
        ctx.globalAlpha = k < 0.6 ? 1 : (1 - k) / 0.4;
        draw(x1, y1 - 4, 0);
        ctx.globalAlpha = 1;
      });
      ring(x1, y1 + 6, 3, 18, [cols[0], cols[1]], 300, 1);
      smoke(x1, y1 + 8, 4, 2, 500);
      shake();
    },
  );
  return fall;
}

/** Веер игл (кактус, пчела): тонкие иглы с белым кончиком. */
export function needles(from, to, cols, n = 5) {
  ensure();
  const [x0, y0] = P(...from),
    [x1, y1] = P(...to);
  const fly = 240,
    gap = 45;
  for (let i = 0; i < n; i++) {
    const ty = y1 + (i - (n - 1) / 2) * 3 + rnd(-1, 1);
    add(
      fly,
      (k) => {
        const x = lerp(x0, x1, k),
          y = lerp(y0, ty, k);
        const a = Math.atan2(ty - y0, x1 - x0);
        line(x, y, x - Math.cos(a) * 6, y - Math.sin(a) * 6, cols[2], 1);
        px(x, y, cols[0], 1);
      },
      i * gap,
      () => sparks(x1, ty, [cols[0], cols[1]], 4, 60),
    );
  }
  return fly + ((n - 1) * gap) / 2;
}

/** Луч из глаза: короткий заряд, потом лазер. */
export function zap(from, to, cols) {
  ensure();
  const [x0, y0] = P(...from);
  charge(x0, y0, [cols[1], cols[0]], 160, 10, 8);
  setTimeout(() => laser(from, to, cols[1], false), 160);
  return 200;
}

/** Заклинание: крутящийся сгусток со звёздочками, небольшой взрыв. n сгустков друг за другом. */
export function spell(from, to, cols, n = 1) {
  ensure();
  const [x0, y0] = P(...from),
    [x1, y1] = P(...to);
  const fly = 360,
    gap = 130;
  for (let i = 0; i < n; i++) {
    const off = n > 1 ? (i - (n - 1) / 2) * 10 : 0;
    add(
      fly,
      (k, dt, age) => {
        const x = lerp(x0, x1, k),
          y = lerp(y0, y1, k) + Math.sin(k * Math.PI) * off;
        for (let s = 0; s < 3; s++) {
          const a = age / 70 + (s * Math.PI * 2) / 3;
          px(x + Math.cos(a) * 6, y + Math.sin(a) * 6, cols[s % 2 ? 2 : 1], 2);
        }
        disc(x, y, 3, cols[2]);
        disc(x, y, 2, cols[1]);
        px(x, y, cols[0], 2);
        if (Math.random() < 0.6) {
          const sx = x + rnd(-2, 2),
            sy = y + rnd(-2, 2);
          add(280, (kk) => px(sx, sy, ramp(cols, kk), 1));
        }
      },
      i * gap,
      () => {
        ring(x1, y1 + off * 0.3, 2, 14, cols, 300, 1);
        burstParticles(x1, y1, { n: 14, cols, speed: 100, life: 400, size: [1, 2] });
        flash(cols[2], 120, 0.2);
      },
    );
  }
  return fly + (n - 1) * gap;
}

/** Бумеранг (кость, бинт): крутится, бьёт и возвращается к боссу. */
export function bone(from, to, cols) {
  ensure();
  const [x0, y0] = P(...from),
    [x1, y1] = P(...to);
  const fly = 300;
  const draw = (x, y, a) => {
    const c = Math.cos(a) * 5,
      s = Math.sin(a) * 5;
    line(x - c, y - s, x + c, y + s, cols[2], 3);
    line(x - c, y - s, x + c, y + s, cols[1], 1);
    px(x - c, y - s, cols[0], 3);
    px(x + c, y + s, cols[0], 3);
  };
  add(
    fly,
    (k, dt, age) => draw(lerp(x0, x1, k), lerp(y0, y1, k) - Math.sin(k * Math.PI) * 14, age / 40),
    0,
    () => {
      sparks(x1, y1, [cols[0], "#ffd23f"], 10, 90);
      ring(x1, y1, 2, 10, [cols[0], cols[1]], 220, 1);
      add(320, (k, dt, age) => draw(lerp(x1, x0, k), lerp(y1, y0, k) + Math.sin(k * Math.PI) * 10, -age / 40));
    },
  );
  return fly;
}

/** Сюрикены: две крутящиеся звёздочки. */
export function shuriken(from, to, cols) {
  ensure();
  const [x0, y0] = P(...from),
    [x1, y1] = P(...to);
  const fly = 220,
    gap = 90;
  for (let i = 0; i < 2; i++) {
    const ty = y1 + (i ? 5 : -4);
    add(
      fly,
      (k, dt, age) => {
        const x = lerp(x0, x1, k),
          y = lerp(y0, ty, k),
          a = age / 25;
        for (let r = 0; r < 4; r++) {
          const aa = a + (r * Math.PI) / 2;
          line(x, y, x + Math.cos(aa) * 4, y + Math.sin(aa) * 4, cols[1], 1);
          px(x + Math.cos(aa + 0.5) * 2, y + Math.sin(aa + 0.5) * 2, cols[2], 1);
        }
        px(x, y, cols[0], 2);
        if (Math.random() < 0.7) {
          const sx = x,
            sy = y;
          add(120, (kk) => px(sx, sy, ramp([cols[1], cols[2]], kk), 1));
        }
      },
      i * gap,
      () => sparks(x1, ty, [cols[0], cols[1]], 8, 90),
    );
  }
  return fly;
}

/** Снежок по дуге: на герое иней. */
export function snowball(from, to, cols) {
  ensure();
  const [x0, y0] = P(...from),
    [x1, y1] = P(...to);
  const fly = 340,
    arc = Math.min(30, Math.abs(x1 - x0) * 0.3);
  add(
    fly,
    (k) => {
      const x = lerp(x0, x1, k),
        y = lerp(y0, y1, k) - Math.sin(k * Math.PI) * arc;
      disc(x, y, 4, cols[2]);
      disc(x, y, 3, cols[1]);
      disc(x - 1, y - 1, 1, cols[0]);
    },
    0,
    () => {
      burstParticles(x1, y1, { n: 22, cols, speed: 120, life: 500, size: [1, 2], grav: 120 });
      ring(x1, y1, 3, 16, cols, 320, 2);
      flash("#d6f3ff", 160, 0.3);
    },
  );
  return fly;
}

/** Язык хамелеона: выстреливает, шлёпает, втягивается. */
export function tongue(from, to, cols) {
  ensure();
  const [x0, y0] = P(...from),
    [x1, y1] = P(...to);
  add(420, (k) => {
    const reach = k < 0.3 ? k / 0.3 : k < 0.5 ? 1 : 1 - (k - 0.5) / 0.5;
    const x = lerp(x0, x1, reach),
      y = lerp(y0, y1, reach) + Math.sin(reach * Math.PI) * 3;
    line(x0, y0, x, y, cols[2], 3);
    line(x0, y0, x, y, cols[1], 1);
    disc(x, y, 3, cols[1]);
    px(x - 1, y - 1, cols[0], 1);
  });
  setTimeout(() => {
    sparks(x1, y1, [cols[0], cols[1]], 10, 80);
    ring(x1, y1, 2, 10, [cols[0], cols[1]], 200, 1);
  }, 130);
  return 130;
}

/** Бумажный самолётик (шпаргалка): летит волной, на герое — клочки бумаги. */
/** Рой пчёл: n полосатых пчёлок летят зигзагом из from в to, крылышки мелькают. Возвращает мс до попадания. */
export function swarm(from, to, n = 7) {
  ensure();
  const [x0, y0] = P(...from),
    [x1, y1] = P(...to),
    fly = 520,
    gap = 45,
    dir = x1 < x0 ? -1 : 1;
  for (let i = 0; i < n; i++) {
    const ph = rnd(0, 6),
      amp = rnd(3, 7),
      dy = rnd(-5, 5);
    add(
      fly,
      (k, dt, age) => {
        const e = k * k * (3 - 2 * k),
          x = Math.round(lerp(x0, x1, e) + Math.sin(k * 9 + ph) * 2),
          y = Math.round(lerp(y0, y1 + dy, e) + Math.sin(k * 14 + ph) * amp * (1 - k)),
          up = Math.floor(age / 40) % 2;
        // пчёлка в квадратиках 2×2, чтобы рой было видно издалека
        const b = (i, j, c) => px(x + i * 2 * dir, y + j * 2, c, 2);
        b(2, 0, "#2a2238"); // голова
        b(1, 0, "#ffd23f");
        b(0, 0, "#2a2238");
        b(-1, 0, "#ffd23f");
        b(-2, 0, "#2a2238"); // жало
        b(0, -1 - up, "#ffffff"); // крылышки
        b(-1, -1 - up, "#d6f3ff");
      },
      i * gap,
    );
  }
  return fly + ((n - 1) * gap) / 2;
}
export function plane(from, to, cols, n = 1) {
  ensure();
  const [x0, y0] = P(...from),
    [x1, y1] = P(...to);
  const fly = 420,
    gap = 120;
  for (let i = 0; i < n; i++) {
    const ty = y1 + (n > 1 ? (i - (n - 1) / 2) * 6 : 0);
    add(
      fly,
      (k) => {
        const x = lerp(x0, x1, k),
          y = lerp(y0 - 6, ty, k) + Math.sin(k * Math.PI * 3) * 4;
        // летит влево: нос слева, крылья треугольником
        for (let j = 0; j < 7; j++) {
          const h = Math.floor(j / 2);
          ctx.fillStyle = cols[0];
          ctx.fillRect(Math.round(x + j), Math.round(y - h), 1, h + 1);
          ctx.fillStyle = cols[2];
          ctx.fillRect(Math.round(x + j), Math.round(y + 1), 1, Math.max(1, h - 1));
        }
        px(x + 3, y, cols[1], 1);
      },
      i * gap,
      () =>
        burstParticles(x1, ty, {
          n: 10,
          cols: [cols[0], cols[1], cols[0]],
          speed: 80,
          life: 520,
          size: 2,
          grav: 90,
        }),
    );
  }
  return fly + (n - 1) * gap;
}

/** Нить жизни от героя к боссу (вампир). */
export function drain(from, to) {
  ensure();
  const [x0, y0] = P(...from),
    [x1, y1] = P(...to);
  const cols = ["#ffffff", "#b8ff9a", "#3fbf5a"];
  for (let i = 0; i < 16; i++)
    add(
      420,
      (k) => {
        const x = lerp(x0, x1, k),
          y = lerp(y0, y1, k) - Math.sin(k * Math.PI) * 12 + Math.sin(k * 12 + i) * 2;
        px(x, y, ramp(cols, k), 2);
      },
      i * 30,
    );
  setTimeout(() => ring(x1, y1, 2, 12, cols, 260, 1), 420);
}

/** Монетки летят от героя к боссу-воришке. */
export function coinsFly(from, to, n = 5) {
  ensure();
  const [x0, y0] = P(...from),
    [x1, y1] = P(...to);
  for (let i = 0; i < Math.min(8, n); i++) {
    const up = rnd(10, 22);
    add(
      460,
      (k, dt, age) => {
        const x = lerp(x0, x1, k),
          y = lerp(y0, y1, k) - Math.sin(k * Math.PI) * up;
        const w = Math.floor(age / 70) % 2 ? 1 : 3;
        ctx.fillStyle = "#a86400";
        ctx.fillRect(Math.round(x - w / 2) - 1, Math.round(y) - 2, w + 2, 5);
        ctx.fillStyle = "#ffd23f";
        ctx.fillRect(Math.round(x - w / 2), Math.round(y) - 1, w, 3);
      },
      i * 50,
    );
  }
}

/** Босс превращается: стягивающиеся частицы, кольца, вспышка. */
export function transform(at, cols = ["#ffffff", "#fff3a0", "#ffd23f", "#ff7a1a"]) {
  ensure();
  const [x, y] = P(...at);
  charge(x, y, cols, 700, 34, 40);
  flash("#ffffff", 260, 0.8, 700);
  ring(x, y, 4, 40, cols, 520, 2, 700);
  ring(x, y, 2, 28, cols, 420, 1, 820);
  setTimeout(() => {
    burstParticles(x, y, { n: 40, cols, speed: 170, life: 700, size: [1, 3] });
    shake();
  }, 700);
}

/** Босс повержен: рассыпается на свои же пиксели, они разлетаются и падают. */
export function shatter(cv, rect, filter = "") {
  ensure();
  const w = cv.width,
    h = cv.height;
  if (!w || !h) return;
  let data;
  try {
    // с тем же CSS-фильтром, что у босса на арене (башня, вторая форма), где браузер умеет
    const tmp = document.createElement("canvas");
    tmp.width = w;
    tmp.height = h;
    const t = tmp.getContext("2d");
    if (filter && "filter" in t) t.filter = filter.replace(/drop-shadow\([^)]*\)/g, "").trim() || "none";
    t.drawImage(cv, 0, 0);
    data = t.getImageData(0, 0, w, h).data;
  } catch (e) {
    return;
  }
  const s = rect.w / w / PX; // размер пикселя босса в пикселях эффекта
  const [ox0, oy0] = P(rect.x, rect.y);
  const cx = w / 2,
    cy = h / 2;
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const o = (j * w + i) * 4;
      if (data[o + 3] < 128) continue;
      const col = `rgb(${data[o]},${data[o + 1]},${data[o + 2]})`;
      let x = ox0 + (i + 0.5) * s,
        y = oy0 + (j + 0.5) * s,
        vx = (i - cx) * rnd(5, 12) + rnd(-15, 15),
        vy = (j - cy) * rnd(3, 8) - rnd(40, 110);
      const size = Math.max(1, Math.round(s));
      add(
        rnd(700, 1100),
        (k, dt) => {
          const d = dt / 1000;
          vy += 260 * d;
          x += vx * d;
          y += vy * d;
          ctx.globalAlpha = k < 0.7 ? 1 : (1 - k) / 0.3;
          ctx.fillStyle = col;
          ctx.fillRect(Math.round(x), Math.round(y), size, size);
          ctx.globalAlpha = 1;
        },
        rnd(0, 120),
      );
    }
  flash("#ffffff", 200, 0.5);
  shake();
}

/** Супер-удар босса: большой медленный шар, который можно отбить нажатием. Рисует, пока жив `alive()`. */
export function superOrb(from, to, cols, ms, alive) {
  ensure();
  const [x0, y0] = P(...from),
    [x1, y1] = P(...to);
  let pos = [x0, y0];
  add(ms, (k, dt, age) => {
    if (!alive()) return;
    const x = lerp(x0, x1, k),
      y = lerp(y0, y1, k) - Math.sin(k * Math.PI) * 10;
    pos = [x, y];
    const r = 6 + (Math.floor(age / 80) % 2);
    disc(x, y, r + 2, cols[2]);
    disc(x, y, r, cols[1]);
    disc(x - 1, y - 1, r - 3, cols[0]);
    for (let s = 0; s < 4; s++) {
      const a = age / 60 + (s * Math.PI) / 2;
      px(x + Math.cos(a) * (r + 4), y + Math.sin(a) * (r + 4), cols[0], 2);
    }
  });
  return () => pos.map((v, i) => v * PX + (i ? oy : ox)); // где шар сейчас, в CSS px арены
}
/** Отбитый шар улетает обратно в босса. */
export function deflect(from, to, cols) {
  ensure();
  const [x0, y0] = P(...from),
    [x1, y1] = P(...to);
  ring(x0, y0, 3, 20, ["#ffffff", "#a8f0ff"], 260, 2);
  sparks(x0, y0, ["#ffffff", "#a8f0ff", "#ffd23f"], 18, 140);
  add(
    220,
    (k) => {
      const x = lerp(x0, x1, k),
        y = lerp(y0, y1, k);
      disc(x, y, 6, cols[2]);
      disc(x, y, 4, cols[1]);
      px(x, y, cols[0], 3);
    },
    0,
    () => explosion(x1, y1, true),
  );
  return 220;
}

/** Взрыв в точке арены (CSS px). */
export function boomAt(at, big = true) {
  ensure();
  explosion(...P(...at), big);
}
