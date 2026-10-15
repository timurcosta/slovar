// Отрисовка спрайтов на canvas.
import { BLINK, PALS, SPR } from "../content/sprites.js";

export function drawSprite(cv, sp, pal, silhouette) {
  const rows = sp
    .trim()
    .split("\n")
    .map((r) => r.trim());
  const h = rows.length,
    w = Math.max(...rows.map((r) => r.length));
  cv.width = w;
  cv.height = h;
  const x = cv.getContext("2d");
  x.clearRect(0, 0, w, h);
  rows.forEach((r, y) =>
    [...r].forEach((ch, i) => {
      if (ch !== "." && pal[ch]) {
        x.fillStyle = silhouette ? "#c9d3e3" : pal[ch];
        x.fillRect(i, y, 1, 1);
      }
    }),
  );
}
export const drawBoss = (cv, b, sil, blink, angry) => {
  let pal = PALS[b.pal];
  if (angry && BLINK[b.pal]) {
    pal = { ...pal };
    Object.keys(BLINK[b.pal]).forEach((k) => {
      pal[k] = b.pal === "two" ? "#ffd23f" : "#ff2a2a";
    });
  } else if (blink && BLINK[b.pal]) {
    pal = { ...pal };
    Object.entries(BLINK[b.pal]).forEach(([k, v]) => {
      if (pal[v]) pal[k] = pal[v];
    });
  }
  drawSprite(cv, SPR[b.spr], pal, sil);
  // ширина босса в долях ширины холста героя (42 px): пиксель босса в BOSS_PX раз крупнее пикселя героя,
  // высокие спрайты чуть мельче — так все боссы одного масштаба и всегда крупнее героя
  cv.style.setProperty("--bk", (bossPx(cv) * cv.width) / 42);
};
export const BOSS_PX = 2.2;
/** Во сколько раз пиксель босса крупнее пикселя героя (после drawBoss). */
export const bossPx = (cv) => BOSS_PX * Math.min(1, 17 / Math.max(cv.width, cv.height));
