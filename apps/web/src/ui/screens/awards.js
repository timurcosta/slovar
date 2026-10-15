// Экран достижений и значки на главной.
import { $, esc } from "../../lib/dom.js";
import { TROPHIES } from "../../content/trophies.js";
import { P } from "../../state/profile.ts";
import { refreshCoins } from "../../progress/rewards.js";
import { ACH } from "../../progress/achievements.js";
import { questsHTML } from "./home.js";
import { medalIcon, trophyIcon } from "./trophies.js";
import { medals } from "../../progress/tasks.ts";

// best earned trophy of each kind, shown under the hero like ribbons on a uniform
export function badgesHTML() {
  P.troph = P.troph || {};
  const best = {};
  for (const t of TROPHIES) if (P.troph[t.id]) best[t.spr + t.m] = t;
  const list = Object.values(best);
  return (
    list.map((t) => trophyIcon(t)).join("") +
    medals()
      .map((m) => medalIcon(m))
      .join("")
  );
}
export function renderAwards() {
  refreshCoins();
  $("aw-quests").innerHTML = questsHTML();
  $("aw-count").textContent = `Получено ${Object.keys(P.ach).length} из ${ACH.length}. За каждое дают монеты.`;
  $("achs").innerHTML = ACH.map(
    (a) =>
      `<div class="ach${P.ach[a.id] ? "" : " off"}"><b>${esc(a.n)}</b><small>${esc(a.d)}</small><em>${P.ach[a.id] ? "ПОЛУЧЕНО" : `+${a.r} МОНЕТ`}</em></div>`,
  ).join("");
}
