// Начисление монет и опыта, повышение уровня, сундуки.
import { $, esc, replay } from "../lib/dom.js";
import { pick } from "../lib/random.js";
import { ITEMS } from "../content/items.js";
import { drawHero } from "../render/hero.js";
import { P, save } from "../state/profile.js";
import { gear } from "./gear.js";
import { TITLES, levelOf } from "./levels.js";
import { checkAch } from "./achievements.js";
import { sfx } from "../audio/sfx.js";
import { G } from "../battle/run.js";
import { coinsHTML } from "../ui/icons.js";
import { toast } from "../ui/toast.js";

export function addCoins(n, useMul = true) {
  if (useMul) n = Math.max(1, Math.round(n * gear().coinMul));
  P.coins += n;
  if (G) G.coinsGot += n;
  save();
  refreshCoins();
  return n;
}
export function refreshCoins() {
  ["home-coins", "hud-coins", "shop-coins", "aw-coins", "tr-coins"].forEach((id) => {
    if ($(id)) $(id).innerHTML = coinsHTML(P.coins);
  });
}
export function addXP(n) {
  n = Math.round(n * gear().xpMul);
  const before = levelOf(P.xp);
  P.xp += n;
  if (G) G.xpGot += n;
  save();
  const after = levelOf(P.xp);
  for (let l = before + 1; l <= after; l++) {
    const bonus = addCoins(60 * l, false);
    const chest = grantChest(1, null, true);
    const msg = `Уровень ${l}: ${TITLES[l - 1]}! +${bonus + chest.coins} монет${chest.item ? `, ${chest.item.name}` : ""}`;
    if (G && !$("s-game").hidden) {
      setTimeout(() => {
        drawHero($("hero-cv"), P.equip, $("hero-aura"));
        replay($("hero-cv"), "glow");
        sfx.level();
        const el = document.createElement("div");
        el.className = "lvlup";
        el.innerHTML = `<b>УРОВЕНЬ ${l}!</b><span>${esc(TITLES[l - 1])}. +${bonus + chest.coins} монет${chest.item ? `. Сундук: ${esc(chest.item.name)}!` : ""}</span>`;
        $("arena").appendChild(el);
        setTimeout(() => el.remove(), 2900);
      }, 450);
    } else toast(msg);
    const unlockedNow = ITEMS.filter((i) => i.lvl === l && i.price > 0).map((i) => i.name);
    if (unlockedNow.length) setTimeout(() => toast(`В гардеробе открылось: ${unlockedNow.join(", ")}`), 900);
  }
  checkAch();
}
export function grantChest(tier, title, noItem) {
  const lvl = levelOf(P.xp);
  const coins = addCoins(25 + tier * 18 + Math.floor(Math.random() * (25 + tier * 18)), false);
  let item = null;
  if (!noItem && Math.random() < 0.08 + 0.04 * tier) {
    const cand = ITEMS.filter((i) => !P.owned[i.id] && i.price > 0 && i.price < 1500 && !i.floor && i.lvl <= lvl);
    if (cand.length) {
      item = pick(cand);
      P.owned[item.id] = 1;
      if (G) G.items.push(item.name);
      save();
    }
  }
  if (title) toast(`${title}: +${coins} монет${item ? `, ${item.name}!` : ""}`, "quest");
  return { coins, item };
}
