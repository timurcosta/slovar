// Настройки игры (звук, таймер, слова, лимиты) и их миграции.
import { LS } from "./storage.js";

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
export const saveSettings = () => LS.set("sb_settings", settings);
