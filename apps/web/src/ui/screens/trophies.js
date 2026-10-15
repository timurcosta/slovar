// Экран трофеев.
import { $, esc } from "../../lib/dom.js";
import { TIER, TROPHIES, TROPHY_SPR } from "../../content/trophies.js";
import { drawSprite } from "../../render/sprite.js";
import { PAB } from "../../topics/words/pools.js";
import { LEARN_N, learnedCount } from "../../state/stats.js";
import { P } from "../../state/profile.js";
import { refreshCoins } from "../../progress/rewards.js";
import { trophyGoal, trophyVal } from "../../progress/trophies.js";

export const trophyIcon = (t, cls = "") =>
  `<canvas class="ticon ${cls}" data-tspr="${t.spr}" data-tier="${t.tier}"></canvas>`;
export function paintTrophies(root) {
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
  paintTrophies($("trophies"));
}
