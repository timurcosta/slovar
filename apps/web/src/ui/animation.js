// Живая анимация героев и босса (кадр каждые 170 мс).
import { $ } from "../lib/dom.js";
import { pick } from "../lib/random.js";
import { ITEM } from "../content/items.js";
import { drawHero } from "../render/hero.js";
import { drawBoss } from "../render/sprite.js";
import { P } from "../state/profile.ts";
import { tone } from "../audio/sfx.js";
import { bossCv, drawFighters, heroCv } from "../battle/hud.js";
import { G } from "../battle/run.js";
import { rel, say } from "../battle/effects.js";
import { drawKeeper, tryOn } from "./screens/shop.js";

// live hero animation (aura + pet) for the big hero views
const HERO_ANIM = [
  { cv: $("home-hero"), wrap: $("home-aura"), eq: () => P.equip },
  { cv: $("end-hero"), wrap: $("end-aura"), eq: () => P.equip },
  { cv: $("title-hero"), wrap: $("title-aura"), eq: () => P.equip },
  { cv: $("shop-hero"), wrap: $("shop-aura"), eq: () => (tryOn ? { ...P.equip, [ITEM[tryOn].slot]: tryOn } : P.equip) },
];
export let heroFrame = 0;
if (!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) {
  setInterval(() => {
    if (document.hidden) return;
    heroFrame++;
    HERO_ANIM.forEach((h) => {
      if (h.cv.offsetParent !== null) drawHero(h.cv, h.eq(), h.wrap, heroFrame);
    });
    if (heroCv.offsetParent !== null) drawFighters(heroFrame);
    if ($("keeper-cv").offsetParent !== null) drawKeeper(heroFrame);
    if (G && G.boss && bossCv.offsetParent !== null && !bossCv.classList.contains("dead")) {
      const angry = G.hp > 0 && G.hp / G.boss.hp < 0.3;
      drawBoss(bossCv, G.boss, false, !angry && (heroFrame % 13 === 0 || heroFrame % 13 === 1), angry);
      if (angry && !G.angryShown) {
        G.angryShown = true;
        say(pick(["Ррр! Теперь я в ярости!", "Ну всё, держись!", "Я ЗОЛ! Очень ЗОЛ!"]));
        tone(110, 0.4, "sawtooth", 0.05, 70);
      }
      $("boss-wrap").classList.toggle("angry", angry);
      if (angry && heroFrame % 3 === 0) {
        const st = document.createElement("div");
        st.className = "steam";
        const br = rel(bossCv);
        st.style.left = br.x + br.w * (0.25 + Math.random() * 0.5) + "px";
        st.style.top = br.y + 4 + "px";
        $("arena").appendChild(st);
        setTimeout(() => st.remove(), 900);
      }
    }
  }, 170);
}
