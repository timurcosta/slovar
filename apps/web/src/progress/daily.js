// Задания дня и бонус за вход подряд.
import { today, yesterday } from "../lib/date.js";
import { hash, rng } from "../lib/random.js";
import { P, save } from "../state/profile.js";
import { addCoins, grantChest } from "./rewards.js";
import { towerOpen } from "./unlocks.js";
import { checkAch } from "./achievements.js";
import { sfx } from "../audio/sfx.js";
import { toast } from "../ui/toast.js";

export const QUESTS = {
  correct: { label: (n) => `Ответь правильно ${n} раз`, ns: [20, 30, 40] },
  bosses: { label: (n) => (n === 1 ? "Победи босса" : `Победи боссов: ${n}`), ns: [1, 2, 3] },
  streak: { label: (n) => `Сделай серию из ${n} подряд`, ns: [8, 10, 12], max: true },
  typed: { label: (n) => `Напиши целиком ${n} слов`, ns: [5, 10, 15] },
  flawless: { label: () => "Победи босса без ошибок", ns: [1] },
  crits: { label: (n) => `Нанеси ${n} критов`, ns: [8, 12, 16] },
  tower: { label: (n) => `Пройди этажей башни: ${n}`, ns: [2, 4, 6], needTower: true },
};
export function ensureDaily() {
  const d = today();
  if (P.daily && P.daily.date === d) return;
  const r = rng(hash(d));
  const pool = Object.keys(QUESTS).filter((t) => !QUESTS[t].needTower || towerOpen());
  const picked = [];
  while (picked.length < 3 && pool.length) picked.push(pool.splice((r() * pool.length) | 0, 1)[0]);
  P.daily = {
    date: d,
    bonus: false,
    q: picked.map((t) => {
      const ni = (r() * QUESTS[t].ns.length) | 0;
      return { t, n: QUESTS[t].ns[ni], p: 0, done: false, reward: 90 + ni * 45 };
    }),
  };
  save();
}
export function quest(t, v = 1) {
  ensureDaily();
  for (const q of P.daily.q) {
    if (q.t !== t || q.done) continue;
    q.p = QUESTS[t].max ? Math.max(q.p, v) : q.p + v;
    if (q.p >= q.n) {
      q.p = q.n;
      q.done = true;
      addCoins(q.reward, false);
      toast(`Задание выполнено: ${QUESTS[t].label(q.n)}. +${q.reward} монет`, "quest");
      sfx.coin();
    }
  }
  if (!P.daily.bonus && P.daily.q.every((q) => q.done)) {
    P.daily.bonus = true;
    save();
    grantChest(3, "Все задания дня! Большой сундук");
  }
  save();
}
export function touchDay() {
  const d = today();
  if (P.days.last === d) return;
  P.days.streak = P.days.last === yesterday() ? P.days.streak + 1 : 1;
  P.days.best = Math.max(P.days.best || 0, P.days.streak);
  P.days.last = d;
  save();
  const bonus = addCoins(30 * Math.min(P.days.streak, 7), false);
  toast(
    P.days.streak > 1 ? `${P.days.streak} дня подряд! Бонус +${bonus} монет` : `Бонус за вход сегодня: +${bonus} монет`,
    "quest",
  );
  checkAch();
}
