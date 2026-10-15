// Экран трофеев.
import { $, esc } from "../../lib/dom.js";
import { TASK_MEDAL_PAL, TIER, TROPHIES, TROPHY_SPR } from "../../content/trophies.js";
import { medals } from "../../progress/tasks.ts";
import { drawSprite } from "../../render/sprite.js";
import { PAB } from "../../topics/words/pools.js";
import { LEARN_N, learnedCount } from "../../state/stats.ts";
import { P } from "../../state/profile.ts";
import { refreshCoins } from "../../progress/rewards.js";
import { trophyGoal, trophyVal } from "../../progress/trophies.js";

export const trophyIcon = (t, cls = "") =>
  `<canvas class="ticon ${cls}" data-tspr="${t.spr}" data-tier="${t.tier}"></canvas>`;
/** Именная медаль за задание Ралины. */
export const medalIcon = (m, cls = "") =>
  `<canvas class="ticon medal ${cls}" data-medal="1" title="${esc(m.title)}" aria-label="Медаль «${esc(m.title)}»"></canvas>`;
export function paintTrophies(root) {
  root.querySelectorAll("canvas[data-medal]").forEach((c) => drawSprite(c, TROPHY_SPR.medal, TASK_MEDAL_PAL));
  root
    .querySelectorAll("canvas[data-tspr]")
    .forEach((c) =>
      drawSprite(
        c,
        TROPHY_SPR[c.dataset.tspr],
        TIER[c.dataset.tier] && { ...TIER[c.dataset.tier], R: "#d62839", B: "#2f55c8", D: "#6b4e31" },
        c.classList.contains("off"),
      ),
    );
}
export function renderTrophies() {
  refreshCoins();
  P.troph = P.troph || {};
  const got = TROPHIES.filter((t) => P.troph[t.id]).length;
  $("tr-count").textContent =
    `Получено ${got} из ${TROPHIES.length}. Выучено слов: ${learnedCount()} из ${PAB.length}. Слово считается выученным после ${LEARN_N} верных ответов.`;
  $("trophies").innerHTML = TROPHIES.map((t) => {
    const v = Math.min(trophyVal(t), trophyGoal(t)),
      on = !!P.troph[t.id];
    return `<div class="tcard${on ? "" : " off"}">${trophyIcon(t, on ? "" : "off")}<b>${esc(t.name)}</b><small>${esc(t.d)}</small>
      <div class="xp"><i style="transform:scaleX(${v / trophyGoal(t)})"></i></div><em>${on ? "ПОЛУЧЕН" : `${v} / ${trophyGoal(t)} · +${t.r}`}</em></div>`;
  }).join("");
  const ms = medals();
  $("tr-medals").hidden = !ms.length;
  $("tr-medals").innerHTML = ms.length
    ? `<h2>Медали от Ралины</h2><div class="trophies">${ms
        .map(
          (m) =>
            `<div class="tcard">${medalIcon(m)}<b>${esc(m.title)}</b><small>Задание выполнено${m.date ? ` ${esc(m.date.split("-").reverse().join("."))}` : ""}</small></div>`,
        )
        .join("")}</div>`
    : "";
  paintTrophies($("tr-medals"));
  paintTrophies($("trophies"));
}
