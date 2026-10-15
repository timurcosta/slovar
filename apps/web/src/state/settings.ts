// Настройки игры (звук, таймер, слова, лимиты) и их миграции.
import { LS } from "./storage.ts";
import type { Settings } from "./types.ts";

export const settings: Settings = Object.assign(
  { timer: true, words: "auto", muted: false, play: "pick", music: true, track: "calm" },
  LS.get<Partial<Settings>>("sb_settings", {}),
);
if (settings.mode === "custom" && !LS.get<Partial<Settings>>("sb_settings", {}).words) settings.words = "custom";
if (settings.musicV !== 2) {
  settings.track = "calm";
  settings.musicV = 2;
  LS.set("sb_settings", settings);
}
export const saveSettings = () => LS.set("sb_settings", settings);
