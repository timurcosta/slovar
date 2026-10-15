// Панель боя: сердца, очки, жизни босса.
import { $ } from "../lib/dom.js";
import { P } from "../state/profile.ts";
import { shownDmg } from "../content/rules.ts";
import { gear } from "../progress/gear.js";
import { levelOf, xpProgress } from "../progress/levels.ts";
import { refreshCoins } from "../progress/rewards.js";
import { G } from "./run.js";
import { heartSVG } from "../ui/icons.js";
import { PET_SPR } from "../content/pets.js";
import { drawHero, drawPet } from "../render/hero.js";

export const bossCv = $("boss-cv"),
  heroCv = $("hero-cv"),
  petCv = $("pet-cv");
/** Герой и питомец в бою. Питомец на своём холсте и действует сам: не едет с героем при замахе. */
export function drawFighters(fr = 0) {
  drawHero(heroCv, { ...P.equip, pet: "nopet", ...(G && G.swinging ? { weapon: "none" } : {}) }, $("hero-aura"), fr);
  petCv.hidden = !PET_SPR[P.equip.pet];
  $("stage").classList.toggle("nopet", petCv.hidden);
  if (petCv.hidden) return;
  drawPet(petCv, P.equip, fr);
  petCv.style.width = `calc(var(--hw) * ${petCv.width} / 42)`; // ширина холста питомца разная
}
export function renderHUD() {
  const g = gear(),
    l = levelOf(P.xp);
  const nH = Math.max(g.maxH, G.hearts);
  $("hearts").classList.toggle("many", nH > 9);
  $("hearts").innerHTML = Array.from({ length: nH }, (_, i) => heartSVG(i < G.hearts)).join("");
  $("st-chips").innerHTML = G.shieldLeft ? `<span class="chip">ЩИТ ${G.shieldLeft}</span>` : ""; // щиты босса нарисованы на нём самом
  $("hearts").setAttribute("aria-label", `Жизни: ${G.hearts} из ${g.maxH}`);
  $("score").textContent = shownDmg(G.score);
  $("streak").textContent = G.streak >= 2 ? `СЕРИЯ x${G.streak}` : "";
  // hpLag — урон, который уже посчитан, но удар ещё летит: полоска падает в момент попадания
  $("hp-fill").style.transform = `scaleX(${Math.max(0, Math.min(1, (G.hp + (G.hpLag || 0)) / G.boss.hp))})`;
  $("hud-lvl").textContent = P.name ? `${P.name.toUpperCase()} · УР ${l}` : `УР ${l}`;
  $("hud-xp").style.transform = `scaleX(${xpProgress(P.xp).frac})`;
  refreshCoins();
}
