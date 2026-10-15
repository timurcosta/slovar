// Эпичные фоны для картинки «Похвастаться» (кроме ночного замка — он в render/title.js).
// Как и замок, рисуются в низком разрешении и растягиваются без сглаживания. Кадр статичный
// и зависит только от размера, поэтому картинка всегда одинаковая. ground — линия земли (на ней герой).
import { rng } from "../lib/random.js";
import { PALS, SPR } from "../content/sprites.js";

function setup(cv, W, H) {
  cv.width = W;
  cv.height = H;
  const x = cv.getContext("2d");
  x.clearRect(0, 0, W, H);
  return x;
}

/** Небо полосами с «шахматкой» на стыках, как на заставке. */
function bands(x, cols, W, ground) {
  const band = Math.max(2, Math.ceil(ground / cols.length));
  cols.forEach((c, i) => {
    x.fillStyle = c;
    x.fillRect(0, i * band, W, band + 1);
    if (i) {
      x.fillStyle = cols[i - 1];
      for (let k = i % 2; k < W; k += 2) x.fillRect(k, i * band, 1, 1);
    }
  });
  x.fillStyle = cols[cols.length - 1];
  x.fillRect(0, cols.length * band, W, Math.max(0, ground - cols.length * band));
}

function stars(x, r, n, W, maxY, cols) {
  for (let i = 0; i < n; i++) {
    const sx = Math.floor(r() * W),
      sy = Math.floor(r() * maxY);
    x.fillStyle = cols[Math.floor(r() * cols.length)];
    x.fillRect(sx, sy, 1, 1);
    if (r() < 0.08) {
      x.fillStyle = "rgba(255,255,255,.5)";
      x.fillRect(sx - 1, sy, 1, 1);
      x.fillRect(sx + 1, sy, 1, 1);
      x.fillRect(sx, sy - 1, 1, 1);
      x.fillRect(sx, sy + 1, 1, 1);
    }
  }
}

function disc(x, cx, cy, rad, col) {
  x.fillStyle = col;
  for (let j = -rad; j <= rad; j++) {
    const w = Math.round(Math.sqrt(rad * rad - j * j));
    x.fillRect(cx - w, cy + j, w * 2 + 1, 1);
  }
}

/** Спрайт босса прямо на сцене: силуэтом одного цвета или в своих цветах. */
function sprite(x, name, sx, sy, col, mirror = false) {
  const rows = SPR[name]
    .trim()
    .split("\n")
    .map((r) => r.trim());
  const pal = PALS[name] || {};
  const w = Math.max(...rows.map((r) => r.length));
  rows.forEach((row, j) =>
    [...row].forEach((ch, i) => {
      if (ch === "." || !pal[ch]) return;
      x.fillStyle = col || pal[ch];
      x.fillRect(sx + (mirror ? w - 1 - i : i), sy + j, 1, 1);
    }),
  );
}

// ---------- Драконий вулкан ----------
export function drawVolcano(cv, W, H, ground) {
  const x = setup(cv, W, H),
    r = rng(W * 31 + ground);
  bands(
    x,
    ["#14040c", "#220712", "#350b16", "#4d1018", "#6a1718", "#8c2216", "#b03413", "#d24f14", "#ec7420"],
    W,
    ground,
  );
  stars(x, r, 40, W, ground * 0.35, ["#ffb38a", "#ff7a5a", "#ffe0c0"]);

  // пепельные облака
  for (let i = 0; i < 4; i++) {
    const cw = 18 + i * 6,
      cx = Math.floor(r() * (W - cw)),
      cy = Math.round(ground * (0.12 + i * 0.09));
    x.fillStyle = "#3a1018";
    x.fillRect(cx, cy, cw, 3);
    x.fillRect(cx + 4, cy - 2, cw - 9, 2);
    x.fillStyle = "#5a1a1e";
    x.fillRect(cx + 5, cy - 2, cw - 12, 1);
  }

  // дракон кружит над вулканом (силуэт)
  sprite(x, "dragon", Math.round(W * 0.06), Math.round(ground * 0.5), "#12030a");

  // вулкан
  const cx = Math.round(W * 0.8),
    peak = Math.round(ground * 0.4),
    crater = 6;
  for (let y = peak; y < ground; y++) {
    const half = crater + Math.round((y - peak) * 0.75);
    x.fillStyle = "#2a0b10";
    x.fillRect(cx - half, y, half * 2, 1);
    x.fillStyle = "#3e1216"; // светлый склон слева от зарева
    x.fillRect(cx - half, y, Math.max(1, Math.round(half * 0.25)), 1);
  }
  // зарево и лава в жерле
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI,
      d = 3 + r() * 14;
    x.fillStyle = r() < 0.5 ? "rgba(255,190,60,.55)" : "rgba(255,110,30,.45)";
    x.fillRect(Math.round(cx + Math.cos(a) * d * 1.3), Math.round(peak - Math.sin(a) * d), 1, 1);
  }
  x.fillStyle = "#ffd23f";
  x.fillRect(cx - crater + 1, peak - 1, crater * 2 - 2, 2);
  x.fillStyle = "#ff7a1a";
  x.fillRect(cx - crater, peak + 1, crater * 2, 1);
  // извержение: капли лавы
  [
    [-3, -6],
    [2, -9],
    [5, -5],
    [-6, -11],
    [0, -14],
    [7, -12],
  ].forEach(([dx, dy], i) => {
    x.fillStyle = i % 2 ? "#ffd23f" : "#ff7a1a";
    x.fillRect(cx + dx, peak + dy, 2, 2);
  });
  // ручьи лавы по склонам
  for (const dir of [-1, 1, -1]) {
    let lx = cx + dir * (2 + Math.floor(r() * 4)),
      ly = peak + 2;
    while (ly < ground - 1) {
      x.fillStyle = "rgba(255,90,26,.35)";
      x.fillRect(lx - 1, ly, 4, 2);
      x.fillStyle = r() < 0.3 ? "#ffd23f" : "#ff5a1a";
      x.fillRect(lx, ly, 2, 2);
      ly += 2;
      if (r() < 0.45) lx += dir;
    }
  }
  // искры
  for (let i = 0; i < 30; i++) {
    x.fillStyle = r() < 0.4 ? "#ffd23f" : "#ff8a3a";
    x.fillRect(Math.floor(r() * W), Math.floor(ground * 0.3 + r() * ground * 0.65), 1, 1);
  }

  // земля: застывшая лава с трещинами
  x.fillStyle = "#1c090c";
  x.fillRect(0, ground, W, H - ground);
  x.fillStyle = "#4a1a1a";
  x.fillRect(0, ground, W, 1);
  for (let i = 0; i < 14; i++) {
    let px = Math.floor(r() * W),
      py = ground + 3 + Math.floor(r() * (H - ground - 6));
    x.fillStyle = r() < 0.5 ? "#ff5a1a" : "#c23a12";
    for (let k = 0; k < 6; k++) {
      x.fillRect(px, py, 2, 1);
      px += 2;
      py += r() < 0.5 ? 1 : 0;
    }
  }
}

// ---------- Космос ----------
export function drawSpace(cv, W, H, ground) {
  const x = setup(cv, W, H),
    r = rng(W * 53 + ground);
  bands(x, ["#04030c", "#070618", "#0b0a24", "#100e32", "#16133f", "#1c1849"], W, ground);
  // туманности
  for (const [nx, ny, col] of [
    [W * 0.25, ground * 0.45, "rgba(154,107,255,.18)"],
    [W * 0.7, ground * 0.7, "rgba(69,209,230,.14)"],
    [W * 0.5, ground * 0.2, "rgba(255,79,216,.12)"],
  ])
    for (let i = 0; i < 260; i++) {
      const a = r() * Math.PI * 2,
        d = Math.pow(r(), 0.7) * 26;
      x.fillStyle = col;
      x.fillRect(Math.round(nx + Math.cos(a) * d * 1.6), Math.round(ny + Math.sin(a) * d * 0.8), 2, 2);
    }
  stars(x, r, 140, W, ground, ["#ffffff", "#c9d3ff", "#ffe9a8", "#a9a3e0", "#9df5ff"]);

  // планета с кольцом
  const px = Math.round(W * 0.72),
    py = Math.round(ground * 0.44),
    pr = 16;
  const ring = (front) => {
    for (let i = -32; i <= 32; i++) {
      const yy = Math.round(Math.sqrt(Math.max(0, 1 - (i * i) / (32 * 32))) * 6);
      for (const s of [-1, 1]) {
        if (s > 0 !== front) continue;
        const ry = py + s * yy - Math.round(i * 0.18);
        x.fillStyle = Math.abs(i) > 26 ? "#c9a46a" : "#f0d29a";
        x.fillRect(px + i, ry, 1, 1);
      }
    }
  };
  ring(false);
  disc(x, px, py, pr, "#d0603a");
  for (let j = -pr; j <= pr; j += 5) {
    const w = Math.round(Math.sqrt(pr * pr - j * j));
    x.fillStyle = j % 10 ? "#f08a4a" : "#a8442a";
    x.fillRect(px - w, py + j, w * 2 + 1, 2);
  }
  disc(x, px - 6, py - 6, 3, "rgba(255,255,255,.18)");
  ring(true);

  // маленькая луна и комета
  disc(x, Math.round(W * 0.16), Math.round(ground * 0.62), 5, "#45d1e6");
  disc(x, Math.round(W * 0.16) - 2, Math.round(ground * 0.62) - 2, 2, "#9df5ff");
  for (let i = 0; i < 16; i++) {
    x.fillStyle = i < 2 ? "#ffffff" : `rgba(157,245,255,${0.7 - i * 0.04})`;
    x.fillRect(Math.round(W * 0.42) - i, Math.round(ground * 0.12) + Math.round(i * 0.5), 1, 1);
  }
  // летающая тарелка вдалеке
  sprite(x, "ufo", Math.round(W * 0.06), Math.round(ground * 0.16));

  // лунный грунт с кратерами
  x.fillStyle = "#3a3d55";
  x.fillRect(0, ground, W, H - ground);
  x.fillStyle = "#6a6f92";
  x.fillRect(0, ground, W, 1);
  for (let i = 0; i < 9; i++) {
    const cx = Math.floor(r() * W),
      cy = ground + 4 + Math.floor(r() * (H - ground - 8)),
      cw = 3 + Math.floor(r() * 6);
    x.fillStyle = "#2a2c40";
    x.fillRect(cx - cw, cy, cw * 2, 2);
    x.fillStyle = "#56597a";
    x.fillRect(cx - cw, cy + 2, cw * 2, 1);
  }
}

// ---------- Неоновый город ----------
export function drawNeon(cv, W, H, ground) {
  const x = setup(cv, W, H),
    r = rng(W * 71 + ground);
  bands(
    x,
    ["#0a0320", "#14062e", "#22083e", "#350b4e", "#4d0e5c", "#6a1268", "#8c1872", "#b02078", "#d62a7c", "#f04a80"],
    W,
    ground,
  );
  stars(x, r, 45, W, ground * 0.4, ["#ffffff", "#ffd1f0", "#9df5ff"]);

  // солнце в полоску
  const sx = Math.round(W / 2),
    sy = Math.round(ground * 0.6),
    sr = 26;
  for (let j = -sr; j <= sr; j++) {
    if (j > 2 && j % 4 >= 4 - Math.min(3, Math.floor((j + 4) / 6))) continue; // прорези внизу
    const w = Math.round(Math.sqrt(sr * sr - j * j));
    const k = (j + sr) / (sr * 2);
    x.fillStyle = k < 0.35 ? "#ffe45a" : k < 0.6 ? "#ffb03a" : k < 0.8 ? "#ff7a5a" : "#ff4f8a";
    x.fillRect(sx - w, sy + j, w * 2 + 1, 1);
  }

  // небоскрёбы с окнами
  let bx = -2;
  while (bx < W) {
    const bw = 7 + Math.floor(r() * 10),
      bh = Math.round(ground * (0.18 + r() * 0.42)),
      top = ground - bh;
    x.fillStyle = "#14062a";
    x.fillRect(bx, top, bw, bh);
    x.fillStyle = "#2a0f4a";
    x.fillRect(bx, top, 1, bh);
    for (let wy = top + 3; wy < ground - 2; wy += 3)
      for (let wx = bx + 2; wx < bx + bw - 1; wx += 2)
        if (r() < 0.32) {
          x.fillStyle = ["#45d1e6", "#ff4fd8", "#ffd23f", "#9df5ff"][Math.floor(r() * 4)];
          x.fillRect(wx, wy, 1, 1);
        }
    if (r() < 0.4) {
      x.fillStyle = "#14062a";
      x.fillRect(bx + Math.floor(bw / 2), top - 5, 1, 5);
      x.fillStyle = "#ff3b3b";
      x.fillRect(bx + Math.floor(bw / 2), top - 6, 1, 1);
    }
    bx += bw + Math.floor(r() * 3);
  }

  // неоновая сетка до горизонта
  x.fillStyle = "#0b0418";
  x.fillRect(0, ground, W, H - ground);
  x.fillStyle = "#ff4fd8";
  x.fillRect(0, ground, W, 1);
  for (let k = 1, y = ground + 2; y < H; k++, y += k + 1) x.fillRect(0, y, W, 1);
  x.fillStyle = "#45d1e6";
  for (let i = -12; i <= 12; i++) {
    const x0 = W / 2 + i * 4,
      x1 = W / 2 + i * 22;
    for (let y = ground + 1; y < H; y++) {
      const t = (y - ground) / (H - ground);
      x.fillRect(Math.round(x0 + (x1 - x0) * t), y, 1, 1);
    }
  }
}
