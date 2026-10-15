// Фон титульного экрана: ночное небо, луна, замок Короля Ошибок, холмы с параллаксом, летающие буквы, земля.
// Рисуется в маленьком разрешении (1 пиксель сцены = несколько пикселей экрана), CSS растягивает без сглаживания.
// t — время в мс, ground — y линии земли в пикселях сцены (на ней стоят герой и босс), skyTop — низ логотипа.
import { rng } from "../lib/random.js";

const SKY = [
  "#0b0a26",
  "#120f36",
  "#1a1446",
  "#241a55",
  "#322062",
  "#45266e",
  "#5d2b77",
  "#7c337c",
  "#9c3d7d",
  "#bb4c7b",
];
const GLYPH = {
  А: [".##.", "#..#", "####", "#..#", "#..#"],
  Б: ["####", "#...", "###.", "#..#", "###."],
  В: ["###.", "#..#", "###.", "#..#", "###."],
  Е: ["####", "#...", "###.", "#...", "####"],
  И: ["#..#", "#..#", "#.##", "##.#", "#..#"],
  О: [".##.", "#..#", "#..#", "#..#", ".##."],
  Ж: ["#.#.#", "#.#.#", ".###.", "#.#.#", "#.#.#"],
  Ш: ["#.#.#", "#.#.#", "#.#.#", "#.#.#", "#####"],
  Я: [".###", "#..#", ".###", ".#.#", "#..#"],
  Ы: ["#...#", "#...#", "###.#", "#.#.#", "###.#"],
  Ё: [".#.#", "####", "#...", "###.", "####"],
  Ч: ["#..#", "#..#", ".###", "...#", "...#"],
};
const LETTERS = Object.keys(GLYPH);

// раскладка звёзд, букв и травы зависит только от размера сцены: при одинаковом размере кадр одинаковый
let cache = { key: "", stars: [], letters: [], tufts: [] };
function layout(W, H, ground) {
  const key = `${W}x${H}x${ground}`;
  if (cache.key === key) return cache;
  const r = rng(W * 7919 + H * 31 + ground);
  const stars = [];
  for (let i = 0, n = Math.round((W * ground) / 110); i < n; i++)
    stars.push({ x: (r() * W) | 0, y: (r() * ground * 0.8) | 0, ph: r() * 6.28, big: r() < 0.08 });
  const letters = [];
  for (let i = 0, n = Math.max(7, Math.round(W / 22)); i < n; i++)
    letters.push({
      g: LETTERS[(r() * LETTERS.length) | 0],
      x: r() * W,
      ph: r(),
      sp: 0.006 + r() * 0.008,
      red: r() < 0.22,
    });
  const tufts = [];
  for (let x = 0; x < W; x += 2 + ((r() * 4) | 0))
    tufts.push({ x, h: 1 + ((r() * 2) | 0), fl: r() < 0.12 ? (r() < 0.5 ? "#ff8fb1" : "#ffe066") : null });
  cache = { key, stars, letters, tufts };
  return cache;
}

const ridge = (x, a, b, c) => Math.sin(x / a) * c + Math.sin(x / b + 1.7) * c * 0.6;

function castle(x, cx, base) {
  const R = (a, b, w, h, col) => {
    x.fillStyle = col;
    x.fillRect(cx + a, base - b - h, w, h);
  };
  const dark = "#140c30";
  // холм под замком
  for (let i = -26; i <= 26; i++) R(i, -1, 1, 6 - Math.round((i * i) / 120), dark);
  R(-15, 0, 30, 13, dark); // стена
  for (let i = -15; i < 15; i += 3) R(i, 13, 2, 2, dark); // зубцы
  R(-19, 0, 7, 21, dark); // левая башня
  R(12, 0, 7, 21, dark); // правая башня
  for (const t of [-19, 12]) {
    R(t - 1, 21, 9, 2, dark);
    for (let i = 0; i < 9; i += 2) R(t - 1 + i, 23, 1, 1, dark);
  }
  R(-5, 0, 10, 28, dark); // главная башня
  for (let i = 0; i < 7; i++) R(-5 + i, 28 + i, 10 - i * 2, 1, dark); // крыша
  R(-1, 0, 3, 6, "#07051a"); // ворота
  R(-2, 4, 5, 1, "#07051a");
}

function castleLights(x, cx, base, t) {
  const win = [
    [-17, 14],
    [-15, 9],
    [14, 14],
    [16, 9],
    [-2, 20],
    [1, 20],
    [-1, 13],
    [-9, 6],
    [8, 6],
  ];
  win.forEach(([a, b], i) => {
    const on = Math.sin(t / 900 + i * 2.1) > -0.6;
    x.fillStyle = on ? (i % 3 ? "#ffd23f" : "#ff9f3f") : "#3a2358";
    x.fillRect(cx + a, base - b - 2, 1, 2);
  });
  // флаг Короля Ошибок на главной башне
  const fx = cx,
    fy = base - 36;
  x.fillStyle = "#c9c2e8";
  x.fillRect(fx, fy - 6, 1, 7);
  const wave = Math.floor(t / 260) % 2;
  x.fillStyle = "#e0303f";
  x.fillRect(fx + 1, fy - 6, 4, 1);
  x.fillRect(fx + 1, fy - 5, 5, 1);
  x.fillRect(fx + 1, fy - 4, 4 + wave, 1);
}

function moon(x, mx, my, r) {
  for (let j = -r - 2; j <= r + 2; j++)
    for (let i = -r - 2; i <= r + 2; i++) {
      const d = i * i + j * j;
      if (d <= r * r) {
        x.fillStyle = d > (r - 1) * (r - 1) ? "#ffe9a8" : "#fff6cf";
        x.fillRect(mx + i, my + j, 1, 1);
      } else if (d <= (r + 2) * (r + 2) && (i + j) % 2 === 0) {
        x.fillStyle = "rgba(255, 240, 200, .18)";
        x.fillRect(mx + i, my + j, 1, 1);
      }
    }
  x.fillStyle = "#f0dc98";
  const c = Math.max(1, Math.round(r / 4));
  x.fillRect(mx - c * 2, my - c, c, c);
  x.fillRect(mx + c, my + c, c + 1, c);
  x.fillRect(mx - c, my + c * 2, c, 1);
}

function glyph(x, g, gx, gy, col, shadow) {
  const rows = GLYPH[g];
  rows.forEach((row, j) =>
    [...row].forEach((ch, i) => {
      if (ch !== "#") return;
      x.fillStyle = shadow;
      x.fillRect(gx + i + 1, gy + j + 1, 1, 1);
      x.fillStyle = col;
      x.fillRect(gx + i, gy + j, 1, 1);
    }),
  );
}

export function drawTitleScene(cv, W, H, ground, t, castleX, skyTop = 0) {
  if (cv.width !== W) cv.width = W;
  if (cv.height !== H) cv.height = H;
  const x = cv.getContext("2d");
  const L = layout(W, H, ground);
  // небо полосами с «шахматкой» на стыках, как в старых играх
  const band = Math.max(2, Math.ceil(ground / SKY.length));
  SKY.forEach((c, i) => {
    x.fillStyle = c;
    x.fillRect(0, i * band, W, band + 1);
    if (i) {
      x.fillStyle = SKY[i - 1];
      for (let k = (i * 3) % 2; k < W; k += 2) x.fillRect(k, i * band, 1, 1);
    }
  });
  x.fillStyle = SKY[SKY.length - 1];
  x.fillRect(0, SKY.length * band, W, Math.max(0, ground - SKY.length * band));

  L.stars.forEach((s) => {
    const b = Math.sin(t / 600 + s.ph);
    if (b < -0.2) return;
    x.fillStyle = b > 0.6 ? "#ffffff" : "#a9a3e0";
    x.fillRect(s.x, s.y, 1, 1);
    if (s.big && b > 0.7) {
      x.fillStyle = "rgba(255,255,255,.55)";
      x.fillRect(s.x - 1, s.y, 1, 1);
      x.fillRect(s.x + 1, s.y, 1, 1);
      x.fillRect(s.x, s.y - 1, 1, 1);
      x.fillRect(s.x, s.y + 1, 1, 1);
    }
  });

  const mr = Math.max(5, Math.round(Math.min(W, ground) * 0.055));
  moon(x, Math.round(W * 0.88), Math.max(Math.round(ground * 0.2), skyTop + 4) + mr, mr);

  // облака
  for (let i = 0; i < 3; i++) {
    const cw = 14 + i * 5,
      cx = Math.round((((t * (0.0012 + i * 0.0005) + i * 97) % (W + cw * 2)) + W + cw * 2) % (W + cw * 2)) - cw,
      cy = Math.round(ground * (0.16 + i * 0.13));
    x.fillStyle = "#3b2c74";
    x.fillRect(cx, cy, cw, 3);
    x.fillRect(cx + 3, cy - 2, cw - 8, 2);
    x.fillStyle = "#4b3b8a";
    x.fillRect(cx + 4, cy - 2, cw - 10, 1);
  }

  // дальние горы и замок, ближние холмы (холмы медленно едут — сцена «живая»)
  const far = t * 0.0015,
    near = t * 0.004;
  x.fillStyle = "#2c1d5a";
  for (let i = 0; i < W; i++) {
    const h = Math.round(ground * 0.2 + ridge(i + far, 13, 6.1, 4));
    x.fillRect(i, ground - h, 1, h);
  }
  castle(x, Math.round(castleX), ground - Math.round(ground * 0.16));
  castleLights(x, Math.round(castleX), ground - Math.round(ground * 0.16), t);
  x.fillStyle = "#1e1444";
  for (let i = 0; i < W; i++) {
    const h = Math.round(ground * 0.07 + ridge(i + near, 21, 9.3, 3));
    x.fillRect(i, ground - h, 1, h);
  }

  // буквы-светлячки поднимаются от земли к небу; красные — «ошибки», мигают
  const span = ground + 8;
  L.letters.forEach((l, i) => {
    const y = Math.round(ground - 2 - ((((t * l.sp + l.ph * span) % span) + span) % span));
    const lx = Math.round(l.x + Math.sin(t / 1100 + i) * 3);
    if (l.red && Math.sin(t / 180 + i) < -0.5) return;
    glyph(x, l.g, lx, y, l.red ? "#ff5a6e" : y < ground * 0.5 ? "#fff3b0" : "#ffd84a", "rgba(10,6,30,.55)");
  });

  // земля: трава, цветы, слои грунта
  x.fillStyle = "#3fae4a";
  x.fillRect(0, ground, W, 1);
  L.tufts.forEach((f) => {
    x.fillStyle = "#3fae4a";
    x.fillRect(f.x, ground - f.h, 1, f.h);
    if (f.fl) {
      x.fillStyle = f.fl;
      x.fillRect(f.x, ground - f.h - 1, 1, 1);
    }
  });
  x.fillStyle = "#2b7f3a";
  x.fillRect(0, ground + 1, W, 2);
  const soil = ["#3a2350", "#2f1c44", "#261638", "#1e112e", "#170c24"];
  const sh = Math.max(2, Math.ceil((H - ground - 3) / soil.length));
  soil.forEach((c, i) => {
    const y = ground + 3 + i * sh;
    x.fillStyle = c;
    x.fillRect(0, y, W, sh + 1);
    if (i) {
      x.fillStyle = soil[i - 1];
      for (let k = i % 2; k < W; k += 2) x.fillRect(k, y, 1, 1);
    }
  });
  // камешки в земле
  const r = rng(W + ground);
  for (let i = 0; i < W / 9; i++) {
    x.fillStyle = "#4a3266";
    x.fillRect((r() * W) | 0, ground + 4 + ((r() * (H - ground - 6)) | 0), 2, 1);
  }
}
