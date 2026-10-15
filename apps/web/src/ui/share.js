// «Похвастаться»: картинка с героем во весь рост, уровнем и заслугами на фоне ночного замка с заставки.
// Холст 1080×1350 (формат поста). Отдаётся системному «Поделиться» (телефон) или скачивается.
import { $ } from "../lib/dom.js";
import { ITEM, RARITY } from "../content/items.js";
import { BOSSES } from "../content/bosses.js";
import { AURA_GLOWC } from "../content/auras.js";
import { TIER, TROPHIES, TROPHY_SPR } from "../content/trophies.js";
import { drawHero } from "../render/hero.js";
import { drawSprite } from "../render/sprite.js";
import { drawTitleScene } from "../render/title.js";
import { drawNeon, drawSpace, drawVolcano } from "../render/scenes.js";
import { LS } from "../state/storage.ts";
import { P } from "../state/profile.ts";
import { learnedCount } from "../state/stats.ts";
import { TITLES, levelOf } from "../progress/levels.ts";

const CW = 1080,
  CH = 1350,
  S = 8, // пиксель фона
  GROUND = 112, // линия земли в пикселях фона (896 px)
  HS = 15; // пиксель героя
const PIXEL = '"Press Start 2P", monospace',
  BODY = '"Nunito", system-ui, sans-serif';

/** Текст пиксельным шрифтом с жёсткой тенью-обводкой, как логотип на заставке. */
function outlined(x, text, px, y, size, fill, align = "center") {
  x.font = `${size}px ${PIXEL}`;
  x.textAlign = align;
  x.textBaseline = "alphabetic";
  const o = Math.max(3, Math.round(size / 12));
  x.fillStyle = "#1b0f3a";
  for (const [dx, dy] of [
    [o, 0],
    [-o, 0],
    [0, o],
    [0, -o],
    [0, o * 2],
  ])
    x.fillText(text, px + dx, y + dy);
  x.fillStyle = fill;
  x.fillText(text, px, y);
}

/** Самая дорогая надетая вещь — ею и хвастаемся. */
function bestItem() {
  let best = null;
  for (const id of Object.values(P.equip)) {
    const it = ITEM[id];
    if (it && it.price > (best?.price || 0)) best = it;
  }
  return best;
}

/** Лучший трофей каждого вида (как ленточки под героем на главной). */
function bestTrophies() {
  const best = {};
  for (const t of TROPHIES) if ((P.troph || {})[t.id]) best[t.spr + t.m] = t;
  return Object.values(best);
}

/** Фоны на выбор: ребёнок листает их в окне «Похвастаться», выбор запоминается. */
export const BACKDROPS = [
  ["castle", "Замок", (bg, W, H, g) => drawTitleScene(bg, W, H, g, 5200, W / 2, 34)],
  ["volcano", "Вулкан", drawVolcano],
  ["space", "Космос", drawSpace],
  ["neon", "Неон-город", drawNeon],
];

export async function drawShareCard(cv, backdrop = "castle") {
  try {
    await Promise.all([document.fonts.load(`40px ${PIXEL}`), document.fonts.load(`800 30px ${BODY}`)]);
  } catch (e) {
    // без шрифтов нарисуем запасными
  }
  cv.width = CW;
  cv.height = CH;
  const x = cv.getContext("2d");
  x.imageSmoothingEnabled = false;

  // фон: сцена заставки в низком разрешении, растянутая без сглаживания (кадр фиксирован)
  const bg = document.createElement("canvas");
  const scene = (BACKDROPS.find((b) => b[0] === backdrop) || BACKDROPS[0])[2];
  scene(bg, CW / S, Math.ceil(CH / S), GROUND);
  x.drawImage(bg, 0, 0, bg.width * S, bg.height * S);

  outlined(x, "ОХОТНИКИ", CW / 2, 150, 92, "#ffd84a");
  outlined(x, "ЗА ОШИБКАМИ", CW / 2, 240, 52, "#ffe6f1");

  // сияние за героем цвета его ауры
  const glow = AURA_GLOWC[P.equip.aura] || "#ffd84a";
  const g = x.createRadialGradient(CW / 2, 640, 40, CW / 2, 640, 380);
  g.addColorStop(0, glow + "88");
  g.addColorStop(1, glow + "00");
  x.fillStyle = g;
  x.fillRect(0, 260, CW, 720);

  // герой во весь рост, ногами на земле
  const hero = document.createElement("canvas");
  drawHero(hero, P.equip, null, 0);
  const hw = hero.width * HS,
    hh = hero.height * HS;
  x.drawImage(hero, Math.round((CW - hw) / 2) - 2 * HS, GROUND * S - hh + HS, hw, hh);

  // табличка: имя, уровень, заслуги
  const top = 930,
    pad = 56;
  x.fillStyle = "rgba(14, 8, 40, 0.86)";
  x.fillRect(pad, top, CW - pad * 2, CH - top - 40);
  x.strokeStyle = "#ffd84a";
  x.lineWidth = 6;
  x.strokeRect(pad + 3, top + 3, CW - pad * 2 - 6, CH - top - 46);

  const l = levelOf(P.xp);
  outlined(x, (P.name || "Герой").toUpperCase(), CW / 2, top + 92, 56, "#ffffff");
  x.font = `800 34px ${BODY}`;
  x.textAlign = "center";
  x.fillStyle = "#ffd84a";
  x.fillText(`Уровень ${l} · ${TITLES[l - 1]}`, CW / 2, top + 148);

  const it = bestItem();
  if (it) {
    const [rn, rc] = RARITY(it.price);
    x.font = `800 28px ${BODY}`;
    x.fillStyle = "#d9d3ff";
    const label = `${it.name} · `,
      w1 = x.measureText(label).width;
    x.font = `900 28px ${BODY}`;
    const w2 = x.measureText(rn).width;
    const sx = CW / 2 - (w1 + w2) / 2;
    x.textAlign = "left";
    x.font = `800 28px ${BODY}`;
    x.fillText(label, sx, top + 194);
    x.font = `900 28px ${BODY}`;
    x.fillStyle = rc === "#5d6f93" ? "#aab6d6" : rc;
    x.fillText(rn, sx + w1, top + 194);
  }

  const cells = [
    [`${P.beaten.length}/${BOSSES.length}`, "боссов"],
    [P.towerBest ? `${P.towerBest}` : "—", "этаж башни"],
    [`${learnedCount()}`, "слов выучено"],
    [`${Object.keys(P.ach).length}`, "достижений"],
  ];
  const cw = (CW - pad * 2) / cells.length;
  cells.forEach(([v, k], i) => {
    const cx = pad + cw * i + cw / 2;
    outlined(x, v, cx, top + 262, 38, "#ffffff");
    x.font = `800 24px ${BODY}`;
    x.textAlign = "center";
    x.fillStyle = "#b9b2ef";
    x.fillText(k, cx, top + 300);
  });

  // ленточки лучших трофеев
  const tr = bestTrophies();
  const ic = document.createElement("canvas"),
    size = 40,
    gap = 10;
  let tx = CW / 2 - (tr.length * (size + gap) - gap) / 2;
  for (const t of tr) {
    drawSprite(ic, TROPHY_SPR[t.spr], { ...TIER[t.tier], R: "#d62839", B: "#2f55c8", D: "#6b4e31" });
    const k = size / Math.max(ic.width, ic.height);
    x.drawImage(ic, Math.round(tx), top + 330, Math.round(ic.width * k), Math.round(ic.height * k));
    tx += size + gap;
  }
}

let url = "",
  file = null,
  backdrop = LS.get("sb_share_bg", "castle");

$("share-bgs").innerHTML = BACKDROPS.map(
  ([id, name]) => `<button class="chip" type="button" data-bg="${id}">${name}</button>`,
).join("");
$("share-bgs")
  .querySelectorAll("[data-bg]")
  .forEach(
    (b) =>
      (b.onclick = () => {
        backdrop = b.dataset.bg;
        LS.set("sb_share_bg", backdrop);
        openShare();
      }),
  );

async function openShare() {
  $("share-bgs")
    .querySelectorAll("[data-bg]")
    .forEach((b) => b.setAttribute("aria-pressed", b.dataset.bg === backdrop));
  const cv = document.createElement("canvas");
  await drawShareCard(cv, backdrop);
  const blob = await new Promise((r) => cv.toBlob(r, "image/png"));
  if (url) URL.revokeObjectURL(url);
  url = URL.createObjectURL(blob);
  const name = `${P.name || "герой"}-уровень-${levelOf(P.xp)}.png`;
  file = new File([blob], name, { type: "image/png" });
  $("share-img").src = url;
  $("btn-share-save").href = url;
  $("btn-share-save").download = name;
  $("btn-share-send").hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
  $("share").hidden = false;
}
const closeShare = () => ($("share").hidden = true);

$("btn-share").onclick = openShare;
$("btn-share-close").onclick = closeShare;
$("share").addEventListener("click", (e) => {
  if (e.target === $("share")) closeShare();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeShare();
});
$("btn-share-send").onclick = () => {
  navigator.share({ files: [file], title: "Мой герой — Охотники за ошибками" }).catch(() => {});
};
