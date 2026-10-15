// Гардероб: вкладки, покупка, примерка, внешность.
import { $, esc } from "../../lib/dom.js";
import { pick } from "../../lib/random.js";
import {
  LOOK_EYE,
  LOOK_FULLHELM,
  LOOK_HAIR,
  LOOK_MASKED,
  LOOK_NOSKIN,
  LOOK_SKIN,
  LOOK_STYLE,
  hairMatches,
} from "../../content/look.js";
import { ITEM, ITEMS, RARITY, SLOTS, UPGRADES, upCost } from "../../content/items.js";
import { COSTUMES, COSTUME_KEY } from "../../content/costumes.js";
import { drawHero } from "../../render/hero.js";
import { P, heroLook, save } from "../../state/profile.js";
import { gear } from "../../progress/gear.js";
import { levelOf } from "../../progress/levels.js";
import { refreshCoins } from "../../progress/rewards.js";
import { itemLocked } from "../../progress/unlocks.js";
import { checkAch } from "../../progress/achievements.js";
import { sfx } from "../../audio/sfx.js";
import { toast } from "../toast.js";
import { show } from "../screens.js";
import { perkChips } from "./home.js";

export let shopTab = "weapon",
  tryOn = null;
export function openShop() {
  tryOn = null;
  renderShop();
  show("s-shop");
}
function renderShop() {
  refreshCoins();
  $("tabs").innerHTML = SLOTS.concat([
    ["look", "Внешность"],
    ["forge", "Кузница"],
  ])
    .map(([s, n]) => `<button class="tab" role="tab" aria-selected="${s === shopTab}" data-s="${s}">${n}</button>`)
    .join("");
  $("tabs")
    .querySelectorAll(".tab")
    .forEach(
      (b) =>
        (b.onclick = () => {
          shopTab = b.dataset.s;
          tryOn = null;
          renderShop();
        }),
    );
  const eq = tryOn ? { ...P.equip, [ITEM[tryOn].slot]: tryOn } : P.equip;
  drawHero($("shop-hero"), eq, $("shop-aura"));
  $("shop-perks").innerHTML = perkChips(gear(eq));
  $("shop-pv-name").textContent = tryOn ? `Примерка: ${ITEM[tryOn].name}` : "Твой боец";
  const lvl = levelOf(P.xp);
  if (shopTab === "look") {
    renderLook();
    return;
  }
  if (shopTab === "forge") {
    $("items").className = "forge";
    $("items").innerHTML =
      UPGRADES.map((u) => {
        const n = P.up[u.id] || 0,
          max = n >= u.max,
          cost = upCost(u, n);
        const bar =
          u.max <= 10
            ? `<div class="lvlbar">${Array.from({ length: u.max }, (_, k) => `<i class="${k < n ? "on" : ""}"></i>`).join("")}</div>`
            : `<span class="chip gold">Уровень ${n}</span>`;
        return `<div class="fcard"><b>${u.name}</b><small class="note">${u.d}. Сейчас: ${u.id === "str" ? "+" + n + " урона" : u.id === "hp" ? "+" + n + " сердец" : u.id === "time" ? "+" + n * 0.5 + " с" : "+" + n * 10 + "% монет"}</small>${bar}
        <button class="btn small ${!max && P.coins >= cost ? "gold" : ""}" data-up="${u.id}" ${max || P.coins < cost ? "disabled" : ""}>${max ? "Максимум" : `Улучшить · ${cost}`}</button></div>`;
      }).join("") +
      `<p class="note" style="grid-column:1/-1">Кузница бесконечная: Силу можно качать до 99. Чем выше этаж в Башне, тем больше монет.</p>`;
    $("items")
      .querySelectorAll("[data-up]")
      .forEach(
        (b) =>
          (b.onclick = () => {
            const u = UPGRADES.find((x) => x.id === b.dataset.up),
              n = P.up[u.id] || 0,
              cost = upCost(u, n);
            if (P.coins < cost || n >= u.max) return;
            P.coins -= cost;
            P.up[u.id] = n + 1;
            save();
            sfx.level();
            toast(`${u.name}: уровень ${n + 1}!`, "quest");
            renderShop();
          }),
      );
    return;
  }
  $("items").className = "items";
  const list = ITEMS.filter((i) => i.slot === shopTab);
  $("items").innerHTML = list
    .map((i) => {
      const own = !!P.owned[i.id],
        on = P.equip[i.slot] === i.id;
      const floorLock = !own && itemLocked(i),
        lvlLock = !own && i.lvl > lvl,
        locked = floorLock || lvlLock;
      const [rn, rc] = RARITY(i.price);
      let act;
      if (on) act = `<button class="btn small" disabled>Надето</button>`;
      else if (own) act = `<button class="btn small" data-eq="${i.id}">Надеть</button>`;
      else if (i.gift) act = `<button class="btn small" disabled>Подарок за победу над Ралиной</button>`;
      else if (floorLock) act = `<button class="btn small" disabled>Башня: ${i.floor} этаж</button>`;
      else if (lvlLock) act = `<button class="btn small" disabled>С ${i.lvl} уровня</button>`;
      else
        act = `<button class="btn small ${P.coins >= i.price ? "gold" : ""}" data-buy="${i.id}" ${P.coins >= i.price ? "" : "disabled"}>Купить · ${i.price}</button>`;
      const tier = i.price >= 40000 ? " ultra" : i.price >= 8000 ? " myth" : i.price >= 2000 ? " leg" : "";
      return `<div class="icard${on ? " on" : ""}${locked ? " lock" : ""}${tier}" data-try="${i.id}" tabindex="0"><canvas id="ic-${i.id}"></canvas>${i.price ? `<span class="rar" style="color:${rc}">${rn}</span>` : i.gift ? `<span class="rar" style="color:#2a9d8f">ПОДАРОК</span>` : ""}<b>${esc(i.name)}</b><small>${esc(i.perk)}</small><div class="act">${act}</div></div>`;
    })
    .join("");
  list.forEach((i) => drawHero($("ic-" + i.id), { ...P.equip, [i.slot]: i.id }));
  $("items")
    .querySelectorAll("[data-try]")
    .forEach(
      (el) =>
        (el.onclick = (e) => {
          if (e.target.closest("button")) return;
          tryOn = el.dataset.try;
          renderShop();
        }),
    );
  $("items")
    .querySelectorAll("[data-eq]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const it = ITEM[b.dataset.eq];
          P.equip[it.slot] = it.id;
          save();
          tryOn = null;
          sfx.block();
          renderShop();
        }),
    );
  $("items")
    .querySelectorAll("[data-buy]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const it = ITEM[b.dataset.buy];
          if (P.coins < it.price) return;
          P.coins -= it.price;
          P.owned[it.id] = 1;
          P.equip[it.slot] = it.id;
          P.tot.bought++;
          save();
          sfx.coin();
          toast(`Куплено: ${it.name}!`, "quest");
          tryOn = null;
          checkAch();
          renderShop();
        }),
    );
}
function renderLook() {
  const L = heroLook(),
    eq = P.equip,
    ck = COSTUME_KEY[eq.costume] || "school",
    masked = LOOK_MASKED.includes(ck);
  const good = hairMatches(eq),
    costumeName = ITEM[eq.costume].name;
  const sw = (group, dict, cur, starred) =>
    `<div class="looksw">${Object.entries(dict)
      .map(
        ([k, [n, c]]) =>
          `<button class="swatch${k === cur ? " on" : ""}" data-g="${group}" data-v="${k}" aria-pressed="${k === cur}" title="${esc(n)}">
      <i style="background:${c || COSTUMES[ck][group === "eye" ? "eye" : group]}"${c ? "" : ' class="auto"'}></i><span>${esc(n)}${starred && starred.includes(k) ? " ★" : ""}</span></button>`,
      )
      .join("")}</div>`;
  $("items").className = "lookpanel";
  $("items").innerHTML = `
    ${masked ? `<p class="note lookwarn">Костюм «${esc(costumeName)}» закрывает лицо, поэтому внешности сейчас не видно. Она появится с другими костюмами.</p>` : ""}
    <div class="fcard"><b>Подобрать к образу</b>
      <small class="note">К костюму «${esc(costumeName)}»${ITEM[eq.armor].price ? ` и броне «${esc(ITEM[eq.armor].name)}»` : ""} лучше всего идут: ${good.map((h) => LOOK_HAIR[h][0].toLowerCase()).join(", ")} волосы. Такие цвета отмечены ★</small>
      <div class="row"><button class="btn small gold" id="look-match">Подобрать</button><button class="btn small" id="look-reset">Как у костюма</button></div></div>
    <h3>Причёска</h3>
    ${!masked && (LOOK_FULLHELM.includes(eq.helmet) || ck === "space" || ck === "dragonknight") ? `<p class="note lookwarn">${ck === "space" ? "Космонавт в шлеме" : ck === "dragonknight" ? "Капюшон Рыцаря дракона" : `${esc(ITEM[eq.helmet].name)}`} закрывает макушку, поэтому Ёжик и Ирокез сейчас не видно. Длинные волосы и чёлка видны. Сними шлем, чтобы показать причёску целиком.</p>` : ""}
    <div class="items lookstyles">${Object.entries(LOOK_STYLE)
      .map(
        ([k, n]) =>
          `<button class="icard${k === L.style ? " on" : ""}" data-g="style" data-v="${k}"><span class="headcrop"><canvas id="ls-${k}"></canvas></span><b>${n}</b></button>`,
      )
      .join("")}</div>
    <h3>Волосы</h3>${sw("hair", LOOK_HAIR, L.hair, good)}
    <h3>Кожа</h3>${LOOK_NOSKIN.includes(ck) ? `<p class="note">У ледяного костюма своя кожа, она не меняется.</p>` : ""}${sw("skin", LOOK_SKIN, L.skin)}
    <h3>Глаза</h3>${sw("eye", LOOK_EYE, L.eye)}
    <p class="note">Внешность бесплатная, меняй сколько хочешь.</p>`;
  const bare = {
    ...eq,
    helmet: "nohelmet",
    weapon: "none",
    armor: "noarmor",
    back: "noback",
    pet: "nopet",
    aura: "noaura",
  };
  Object.keys(LOOK_STYLE).forEach((k) => drawHero($("ls-" + k), { ...bare, look: { ...L, style: k } }));
  const setLook = (g, v) => {
    P.look = { ...heroLook(), [g]: v };
    save();
    sfx.block();
    renderShop();
  };
  $("items")
    .querySelectorAll("[data-g]")
    .forEach((b) => (b.onclick = () => setLook(b.dataset.g, b.dataset.v)));
  $("look-match").onclick = () => {
    const opts = good.filter((h) => h !== L.hair);
    const h = opts.length ? pick(opts) : good[0];
    P.look = { ...heroLook(), hair: h };
    save();
    sfx.coin();
    toast(`${LOOK_HAIR[h][0]} волосы отлично подходят к образу!`, "quest");
    renderShop();
  };
  $("look-reset").onclick = () => {
    P.look = { hair: "auto", skin: "auto", eye: "auto", style: L.style };
    save();
    sfx.block();
    renderShop();
  };
}
