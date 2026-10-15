// Что открыто игроку: башня, следующий босс, вещи за этажи.
import { P } from "../state/profile.ts";

export const towerOpen = () => P.beaten.includes(5);
export const itemLocked = (i) => i.floor && P.towerBest < i.floor;
export function frontier() {
  for (let i = 0; i <= P.unlocked; i++) if (!P.beaten.includes(i)) return i;
  return P.unlocked;
}
