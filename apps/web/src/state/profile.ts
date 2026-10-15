// Профиль игрока P: загрузка с миграциями старых сохранений и save().
import { LS } from "./storage.ts";
import { applyRalinaGift, freshProfile, migrateProfile } from "./migrations.ts";
import type { Look, Profile } from "./types.ts";

export const heroLook = (): Look =>
  Object.assign(
    { hair: "auto", skin: "auto", eye: "auto", style: "classic" },
    (typeof P === "object" && P && P.look) || {},
  );

export let P: Profile = migrateProfile(LS.get<Partial<Profile> | null>("sb2_profile", null), LS.get("sb_hero", null));

const listeners: (() => void)[] = [];
/** Подписка на каждое сохранение прогресса (так синхронизация узнаёт об изменениях). */
export const onSave = (fn: () => void) => listeners.push(fn);

export const save = () => {
  LS.set("sb2_profile", P);
  listeners.forEach((fn) => fn());
};
export function resetProfile() {
  P = freshProfile();
}
/** Подменяет профиль пришедшим с сервера. Слушателей не зовёт: это не новое изменение игрока. */
export function replaceProfile(p: Profile) {
  P = p;
  LS.set("sb2_profile", P);
}
export function giftRalina(wear: boolean) {
  applyRalinaGift(P, wear);
  save();
}
LS.set("sb2_profile", P);
