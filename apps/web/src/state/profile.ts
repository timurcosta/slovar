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
export const save = () => LS.set("sb2_profile", P);
export function resetProfile() {
  P = freshProfile();
}
export function giftRalina(wear: boolean) {
  applyRalinaGift(P, wear);
  save();
}
save();
