// localStorage, настройки, профиль P и миграции старых сохранений.
import { BOSSES } from "../data/bosses.js";
import { DEFAULT_EQUIP, ITEM, ITEMS } from "../data/items.js";

export const LS = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  },
};
export let settings = Object.assign(
  { timer: true, words: "auto", muted: false, play: "pick", music: true, track: "calm" },
  LS.get("sb_settings", {}),
);
if (settings.mode === "custom" && !LS.get("sb_settings", {}).words) settings.words = "custom";
if (settings.musicV !== 2) {
  settings.track = "calm";
  settings.musicV = 2;
  LS.set("sb_settings", settings);
}
export let customRaw = LS.get("sb_custom", "");
export let stats = LS.get("sb_stats", {});
function freshProfile() {
  const owned = {};
  ITEMS.filter((i) => i.price === 0 && !i.gift).forEach((i) => (owned[i.id] = 1));
  return {
    xp: 0,
    coins: 0,
    owned,
    equip: { ...DEFAULT_EQUIP },
    up: { str: 0, hp: 0, time: 0, gold: 0 },
    unlocked: 0,
    beaten: [],
    towerBest: 0,
    rv: 2,
    xpv: 2,
    tot: { correct: 0, typed: 0, bosses: 0, flawless: 0, bought: 0, crits: 0 },
    bestStreak: 0,
    ach: {},
    daily: null,
    days: { last: "", streak: 0 },
    best: 0,
  };
}
export let P = Object.assign(freshProfile(), LS.get("sb2_profile", {}));
(() => {
  const old = LS.get("sb_hero", null);
  if (old && old.xp && !LS.get("sb2_profile", null)) {
    P.xp = old.xp;
    P.coins = Math.floor(old.xp / 4);
  }
})();
ITEMS.filter((i) => i.price === 0 && !i.gift).forEach((i) => (P.owned[i.id] = 1));
P.equip = Object.assign({ ...DEFAULT_EQUIP }, P.equip);
Object.keys(DEFAULT_EQUIP).forEach((sl) => {
  const it = ITEM[P.equip[sl]];
  if (!it || it.slot !== sl) P.equip[sl] = DEFAULT_EQUIP[sl];
});
(() => {
  // перенос прогресса, когда в кампанию вставляются новые боссы
  const st = LS.get("sb2_profile", {}),
    rv = st.rv || 0;
  if (!Object.keys(st).length || rv >= 2) {
    P.rv = 2;
    return;
  }
  const NEW = ["Кракозябра", "Ангел Ангелика", "Олеся Зоркая"];
  const v1 = BOSSES.map((b) => b.name).filter((n) => !NEW.includes(n));
  const old = rv === 1 ? v1 : v1.filter((n) => n !== "Репетитор Ралина");
  const idx = (n) => BOSSES.findIndex((b) => b.name === n);
  P.beaten = (P.beaten || []).map((i) => idx(old[i])).filter((i) => i >= 0);
  const u = idx(old[Math.min(P.unlocked || 0, old.length - 1)]);
  P.unlocked = u >= 0 ? u : P.unlocked || 0;
  P.rv = 2;
})();
(() => {
  // v2 economy: slower late levels, so lift xp to keep the level the player already had
  const st = LS.get("sb2_profile", {});
  if (!Object.keys(st).length || st.xpv >= 2) {
    P.xpv = 2;
    return;
  }
  const oldLvl = (xp) => {
    let l = 1;
    while (l < 50 && xp >= 50 * (l + 1) * l) l++;
    return l;
  };
  const l = oldLvl(P.xp || 0),
    need = 50 * l * (l - 1) + l * l * l;
  if ((P.xp || 0) < need) P.xp = need;
  P.xpv = 2;
})();
P.unlocked = Math.min(P.unlocked || 0, BOSSES.length - 1);
P.tot = Object.assign(freshProfile().tot, P.tot);
P.up = Object.assign({ str: 0, hp: 0, time: 0, gold: 0 }, P.up);
export const save = () => LS.set("sb2_profile", P);
export function resetProfile() {
  P = freshProfile();
}
export function setStats(v) {
  stats = v;
}
export function setCustomRaw(v) {
  customRaw = v;
}
// подарки Ралины за победу над первым боссом (вызывается и при загрузке профиля, поэтому живёт здесь)
export function giftRalina(wear) {
  P.lep = 1;
  P.owned.tubeteika = 1;
  P.owned.tatarc = 1;
  if (wear || P.equip.helmet === "nohelmet" || P.equip.helmet === "band") P.equip.helmet = "tubeteika";
  if (wear || P.equip.costume === "school") P.equip.costume = "tatarc";
  save();
}
if (P.owned && P.owned.oscar) {
  delete P.owned.oscar;
  P.owned.cat = 1;
  P.coins += 2500;
  if (P.equip.pet === "oscar") P.equip.pet = "cat";
  save();
}
(() => {
  if ((!P.lep || !P.owned.tatarc) && (P.beaten || []).includes(0)) {
    giftRalina(false);
    P.lepToast = 1;
  }
})();
save();
