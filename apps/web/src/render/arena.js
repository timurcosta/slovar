// Тёмные фоны сцены боя (темы — content/arenas.js). Пиксель фона = пиксель героя, поэтому фон сам собой простой:
// небо полосами, одна-две приметы темы наверху и по краям (там, где нет бойцов) и полоса земли, на которой стоят
// бойцы. fr — кадр анимации героя: мерцают звёзды, падает снег, поднимаются пузыри и искры.
import { rng } from "../lib/random.js";

let x = null,
  W = 0,
  H = 0,
  G = 0; // верх полосы земли

const R = (c, a, b, w = 1, h = 1) => {
  x.fillStyle = c;
  x.fillRect(Math.round(a), Math.round(b), w, h);
};
/** Небо полосами сверху вниз до земли, на стыках шахматка. */
function sky(cols) {
  const band = Math.ceil(G / cols.length);
  cols.forEach((c, i) => {
    R(c, 0, i * band, W, band + 1);
    if (i) for (let k = i % 2; k < W; k += 2) R(cols[i - 1], k, i * band);
  });
}
function disc(cx, cy, r, c) {
  for (let j = -r; j <= r; j++) {
    const w = Math.round(Math.sqrt(r * r - j * j));
    R(c, cx - w, cy + j, w * 2 + 1, 1);
  }
}
/** Звёзды: n штук до высоты maxY, каждая изредка вспыхивает крестиком. */
function stars(n, maxY, cols, fr, seed) {
  const r = rng(seed + W);
  for (let i = 0; i < n; i++) {
    const sx = Math.floor(r() * W),
      sy = Math.floor(r() * maxY),
      c = cols[i % cols.length];
    if ((fr + i * 5) % 31 === 0) {
      R("#ffffff", sx, sy);
      R(c, sx - 1, sy);
      R(c, sx + 1, sy);
      R(c, sx, sy - 1);
      R(c, sx, sy + 1);
    } else if ((fr + i * 3) % 17 !== 0) R(c, sx, sy);
  }
}
/** Полоса земли: заливка, светлая кромка сверху. */
function ground(base, edge) {
  R(base, 0, G, W, H - G);
  R(edge, 0, G, W, 1);
}
// буквы мелом 3×5
const CHALK = {
  А: [".#.", "#.#", "###", "#.#", "#.#"],
  Б: ["###", "#..", "###", "#.#", "###"],
  В: ["##.", "#.#", "##.", "#.#", "##."],
};
function chalk(text, cx, cy, c) {
  [...text].forEach((ch, n) =>
    (CHALK[ch] || []).forEach((row, j) => [...row].forEach((p, i) => p === "#" && R(c, cx + n * 4 + i, cy + j))),
  );
}

const THEMES = {
  board(fr) {
    R("#1d4636", 0, 0, W, H);
    const r = rng(7 + W);
    // следы тряпки и пыль мела
    for (let i = 0; i < 6; i++) R("rgba(255,255,255,.05)", r() * W, 3 + r() * G * 0.6, 6 + r() * 10, 1);
    for (let i = 0; i < 40; i++) R("#1a3f31", r() * W, r() * G);
    chalk("АБВ", 3, 3, "rgba(255,255,255,.28)");
    R("rgba(255,255,255,.18)", W - 12, 5, 8, 1); // подчёркнутое
    R("rgba(255,255,255,.18)", W - 10, 7, 5, 1);
    R("#5a3a1e", 0, 0, W, 1);
    // полка с мелом
    ground("#6b4423", "#8a5a32");
    R("#f4f1e6", W * 0.42, G - 1, 3, 1);
    R("#ff9ec4", W * 0.5, G - 1, 2, 1);
    void fr;
  },
  night(fr) {
    sky(["#0e1233", "#121840", "#17204d", "#1c285a", "#223066"]);
    stars(18, G * 0.55, ["#ffffff", "#c9d6ff", "#8fa4e8"], fr, 11);
    const mx = Math.round(W * 0.14) + 3;
    disc(mx, 5, 3, "#f3eccb");
    R("#d9cf9f", mx - 1, 4, 1, 1);
    R("#d9cf9f", mx + 1, 6, 1, 1);
    for (let i = 0; i < W; i++) {
      const h = Math.round(G - 6 - 3 * Math.sin(i / 9) - 2 * Math.sin(i / 4 + 1));
      R("#182150", i, h, 1, G - h);
    }
    ground("#1d3a2a", "#2c5a3c");
    for (let i = 2; i < W; i += 6) R("#3f7a4f", i, G - 1, 1, 1);
    // светлячки
    for (let i = 0; i < 3; i++)
      if ((fr + i * 4) % 9 < 6) R("#d7ff7a", (W * (0.3 + i * 0.22) + Math.sin(fr / 5 + i) * 3) | 0, G * 0.5 + i * 3);
  },
  spooky(fr) {
    sky(["#160c26", "#1d1030", "#26143c", "#301a4a", "#3a2058"]);
    stars(10, G * 0.5, ["#c9b6ff", "#8f7ad6"], fr, 23);
    const mx = Math.round(W * 0.16) + 4;
    for (let j = -7; j <= 7; j++)
      for (let i = -7; i <= 7; i++)
        if ((i + j) % 2 === 0 && i * i + j * j <= 49 && i * i + j * j > 30) R("#4a2a5a", mx + i, 8 + j);
    disc(mx, 8, 5, "#ffb347");
    disc(mx - 1, 7, 2, "#ffd27a");
    // летучие мышки машут крыльями
    for (let i = 0; i < 2; i++) {
      const bx = (((W * (0.45 + i * 0.25) + fr * 0.4 * (i ? -1 : 1)) % W) + W) % W,
        by = 5 + i * 4,
        up = (fr + i) % 4 < 2;
      R("#120a1c", bx, by);
      R("#120a1c", bx - 1, by - (up ? 1 : 0));
      R("#120a1c", bx + 1, by - (up ? 1 : 0));
    }
    ground("#20122e", "#2e1a40");
    // тыковки на земле
    for (const px of [W * 0.06, W * 0.94 - 3]) {
      R("#ff8a1a", px, G - 2, 3, 2);
      R("#3f7a4f", px + 1, G - 3);
    }
  },
  sea(fr) {
    sky(["#0f5068", "#0c4560", "#093a52", "#072f44", "#052536"]);
    // лучи сверху
    for (let k = 0; k < 3; k++)
      for (let y = 0; y < G; y++) R("rgba(160,230,255,.06)", W * (0.2 + k * 0.3) + y * 0.4, y, 3, 1);
    // пузыри поднимаются
    const r = rng(31 + W);
    for (let i = 0; i < 7; i++) {
      const bx = r() * W,
        by = (((r() * G - fr * 0.5) % G) + G) % G;
      R("#8fdcf0", bx + Math.sin(fr / 4 + i), by);
    }
    ground("#3b3524", "#554b30");
    // водоросли качаются
    for (const sx of [W * 0.05, W * 0.09, W * 0.95]) {
      for (let y = 0; y < 8; y++) R("#1f6b4a", sx + Math.round(Math.sin(fr / 3 + y / 2) * (y / 5)), G - 1 - y);
    }
  },
  space(fr) {
    sky(["#03040f", "#060818", "#0a0d24", "#0e1230", "#12173c"]);
    stars(28, G * 0.8, ["#ffffff", "#a8f0ff", "#ffd0f4"], fr, 41);
    const px = Math.round(W * 0.16) + 3;
    disc(px, 7, 4, "#8a4fd6");
    disc(px - 1, 6, 3, "#c77dff");
    R("#f0c0ff", px - 7, 8, 15, 1);
    R("#45d1e6", W * 0.62, 3, 2, 2);
    ground("#262b44", "#3a4166");
    for (let i = 4; i < W; i += 8) {
      R("#1c2035", i, G + 1, 1, H - G - 1);
      if ((fr + i) % 12 < 6) R("#45d1e6", i + 3, G + 1);
    }
  },
  winter(fr) {
    sky(["#0c1a36", "#10213f", "#14294b", "#193257", "#1f3c66"]);
    stars(8, G * 0.4, ["#ffffff", "#c9d6ff"], fr, 53);
    // ёлки на горизонте
    for (let t = 0; t < W; t += 9) {
      const h = 5 + (t % 4);
      for (let j = 0; j < h; j++) R("#0f2140", t + 4 - (j >> 1), G - h + j, (j >> 1) * 2 + 1, 1);
    }
    // снег падает
    const r = rng(61 + W);
    for (let i = 0; i < 22; i++) {
      const fx = r() * W,
        fy = (r() * G + fr * 0.6) % G;
      R("#ffffff", fx + Math.sin(fr / 6 + i) * 1.5, fy);
    }
    ground("#cfe0f2", "#ffffff");
    for (let i = 3; i < W; i += 7) R("#a9c3df", i, G + 2, 3, 1);
  },
  lava(fr) {
    sky(["#120606", "#1a0808", "#240b0a", "#320f0c", "#44140e"]);
    // вулкан с жерлом
    const vx = Math.round(W * 0.18),
      top = Math.round(G * 0.35);
    for (let y = top; y < G; y++) {
      const half = 2 + Math.round((y - top) * 0.9);
      R("#1a0a0a", vx - half, y, half * 2 + 1, 1);
    }
    R((fr >> 1) % 2 ? "#ff7a1a" : "#ffd23f", vx - 2, top, 5, 1);
    // искры летят вверх
    const r = rng(71 + W);
    for (let i = 0; i < 8; i++) {
      const ex = r() * W,
        ey = (((r() * G - fr * 0.8) % G) + G) % G;
      R(i % 3 ? "#ff7a1a" : "#ffd23f", ex, ey);
    }
    ground("#1f1212", "#2e1a18");
    for (let i = 5; i < W; i += 11) R((fr + i) % 6 < 3 ? "#ff7a1a" : "#ffd23f", i, G + 1, 3, 1);
  },
  castle(fr) {
    R("#1c1838", 0, 0, W, G);
    // кладка
    for (let y = 3; y < G; y += 4) {
      R("#15122b", 0, y, W, 1);
      for (let i = (y / 4) % 2 ? 0 : 4; i < W; i += 8) R("#15122b", i, y - 3, 1, 3);
    }
    // знамёна
    for (const bx of [W * 0.3, W * 0.7]) {
      R("#a01f3a", bx, 0, 5, 9);
      R("#ffd23f", bx, 0, 5, 1);
      R("#1c1838", bx + 2, 8);
      R("#ffd23f", bx + 2, 3);
    }
    // факелы
    for (const tx of [W * 0.08, W * 0.92]) {
      R("#5a3a1e", tx, 8, 1, 3);
      const f = fr % 3;
      R("#ff7a1a", tx - (f === 1 ? 1 : 0), 6, 2, 2);
      R("#ffd23f", tx, 6 + (f === 2 ? 1 : 0));
    }
    ground("#2a2540", "#3a3458");
    R("#7a1a2e", 0, G + 1, W, 1); // ковёр
  },
};

/** Нарисовать тему theme на холсте cv размером w×h пикселей (пиксель = пиксель героя), кадр fr. */
export function drawArena(cv, theme, w, h, fr = 0) {
  if (cv.width !== w) cv.width = w;
  if (cv.height !== h) cv.height = h;
  x = cv.getContext("2d");
  W = w;
  H = h;
  G = h - 3;
  x.clearRect(0, 0, W, H);
  (THEMES[theme] || THEMES.night)(fr);
}
