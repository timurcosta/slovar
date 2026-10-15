// Панель боя: сердца, очки, жизни босса.
import { $ } from "../lib/dom.js";
import { P } from "../state/profile.ts";
import { gear } from "../progress/gear.js";
import { levelOf, xpProgress } from "../progress/levels.ts";
import { refreshCoins } from "../progress/rewards.js";
import { G } from "./run.js";
import { heartSVG } from "../ui/icons.js";

export const bossCv = $("boss-cv"),
  heroCv = $("hero-cv");
export function renderHUD() {
  const g = gear(),
    l = levelOf(P.xp);
  const nH = Math.max(g.maxH, G.hearts);
  $("hearts").classList.toggle("many", nH > 9);
  $("hearts").innerHTML = Array.from({ length: nH }, (_, i) => heartSVG(i < G.hearts)).join("");
  $("st-chips").innerHTML =
    (G.shieldLeft ? `<span class="chip">ЩИТ ${G.shieldLeft}</span>` : "") +
    (G.armorLeft ? `<span class="chip red">ПАНЦИРЬ ${G.armorLeft}</span>` : "");
  $("hearts").setAttribute("aria-label", `Жизни: ${G.hearts} из ${g.maxH}`);
  $("score").textContent = G.score;
  $("streak").textContent = G.streak >= 2 ? `СЕРИЯ x${G.streak}` : "";
  $("hp-fill").style.transform = `scaleX(${Math.max(0, G.hp / G.boss.hp)})`;
  $("hud-lvl").textContent = P.name ? `${P.name.toUpperCase()} · УР ${l}` : `УР ${l}`;
  $("hud-xp").style.transform = `scaleX(${xpProgress(P.xp).frac})`;
  refreshCoins();
}
