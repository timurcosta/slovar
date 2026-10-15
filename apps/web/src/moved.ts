// Страница переезда для старого адреса (GitHub Pages). Игра теперь одна — с сервером в Yandex Cloud.
// Прогресс детей лежит в localStorage старого адреса, новый адрес его не видит: страница упаковывает
// его в код сохранения и передаёт в адресе (#import=SBZ…). Игра берёт код, если у неё прогресса меньше.
// Если шлюз пересоздали (аварийное выключение → новый адрес), поменяй GAME_URL и выложи заново.
import "./styles/main.css";
import { LS } from "./state/storage.ts";
import { migrateProfile } from "./state/migrations.ts";
import { packSave } from "./state/savecode.ts";
import { levelOf } from "./progress/levels.ts";
import type { Profile, WordStats } from "./state/types.ts";

export const GAME_URL = "https://d5dc1pebpoct5vvkti5h.l5v6loqa.apigw.yandexcloud.net/";

const $ = (id: string) => document.getElementById(id)!;
const stored = LS.get<Partial<Profile> | null>("sb2_profile", null);

// Код передаётся при каждом заходе: игра сама возьмёт его, только если у неё на устройстве опыта меньше.
// Так прогресс не потеряется, даже если первый переход сорвался (нет сети).
async function main() {
  if (!stored || !stored.name || !stored.xp) return location.replace(GAME_URL);
  const p = migrateProfile(stored);
  let url = GAME_URL;
  try {
    const code = await packSave({ v: 1, p: stored as Profile, s: LS.get<WordStats>("sb_stats", {}) });
    url += "#import=" + code;
  } catch {
    // не получилось упаковать — пусть хотя бы откроется игра
  }
  $("moved-who").textContent = `Твой герой ${p.name}, уровень ${levelOf(p.xp)}, переедет вместе с тобой.`;
  ($("moved-go") as HTMLAnchorElement).href = url;
  $("moved").hidden = false;
  setTimeout(() => location.replace(url), 4000);
}
main();
