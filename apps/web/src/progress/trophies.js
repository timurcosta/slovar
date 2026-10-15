// Трофеи: прогресс и выдача.
import { TROPHIES } from "../content/trophies.js";
import { PAB } from "../topics/words/pools.js";
import { learnedCount } from "../state/stats.ts";
import { P, save } from "../state/profile.ts";
import { addCoins } from "./rewards.js";
import { sfx } from "../audio/sfx.js";
import { toast } from "../ui/toast.js";

export const trophyGoal = (t) => (t.all ? PAB.length : t.n);
export const trophyVal = (t) =>
  t.m === "learned"
    ? learnedCount()
    : t.m === "correct"
      ? P.tot.correct
      : Math.max(P.days.best || 0, P.days.streak || 0);
export function checkTrophies() {
  P.troph = P.troph || {};
  for (const t of TROPHIES) {
    if (P.troph[t.id] || trophyVal(t) < trophyGoal(t)) continue;
    P.troph[t.id] = 1;
    save();
    addCoins(t.r, false);
    toast(`Новый трофей: ${t.name}! +${t.r} монет`, "ach");
    sfx.level();
  }
}
