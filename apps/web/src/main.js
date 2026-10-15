// Точка входа: стили, подключение всех модулей, общие кнопки и запуск игры.
import "./styles/main.css";
import "./lib/dom.js";
import "./lib/date.js";
import "./lib/text.js";
import "./lib/random.js";
import "./content/look.js";
import "./content/pets.js";
import "./content/auras.js";
import "./content/items.js";
import "./content/bosses.js";
import "./content/sprites.js";
import "./content/costumes.js";
import "./content/trophies.js";
import "./render/hero.js";
import "./render/color.js";
import "./render/sprite.js";
import "./topics/words/lists.js";
import "./topics/words/parse.ts";
import "./topics/words/pools.js";
import "./state/stats.ts";
import "./state/profile.ts";
import "./state/storage.ts";
import "./state/savecode.ts";
import "./state/settings.ts";
import "./progress/gear.js";
import "./progress/daily.js";
import "./progress/levels.ts";
import "./progress/limits.js";
import "./progress/rewards.js";
import "./progress/unlocks.js";
import "./progress/trophies.js";
import "./progress/achievements.js";
import "./audio/sfx.js";
import "./audio/music.js";
import "./audio/context.js";
import "./battle/hud.js";
import "./battle/run.js";
import "./battle/round.js";
import "./battle/effects.js";
import "./battle/difficulty.js";
import "./ui/icons.js";
import "./ui/toast.js";
import "./ui/screens.js";
import "./ui/confetti.js";
import "./ui/animation.js";
import "./ui/screens/home.js";
import "./ui/screens/shop.js";
import "./ui/screens/intro.js";
import "./ui/screens/awards.js";
import "./ui/screens/trophies.js";
import "./ui/screens/title.js";
import "./ui/share.js";

import { $ } from "./lib/dom.js";
import { P, save } from "./state/profile.ts";
import { LS } from "./state/storage.ts";
import { unpackSave } from "./state/savecode.ts";
import { saveSettings, settings } from "./state/settings.ts";
import { blockedToday } from "./progress/limits.js";
import { frontier, towerOpen } from "./progress/unlocks.js";
import { checkAch } from "./progress/achievements.js";
import { sfx } from "./audio/sfx.js";
import { TRACK_ORDER, battleTrack, pauseMusic, resumeMusic } from "./audio/music.js";
import { silentEl, unlockAudio } from "./audio/context.js";
import { G, startCampaign, startTower, startTraining, stopGame } from "./battle/run.js";
import { answer, trickKey, typed, wordPress } from "./battle/round.js";
import { toast } from "./ui/toast.js";
import { show } from "./ui/screens.js";
import { home, renderHome } from "./ui/screens/home.js";
import { openShop } from "./ui/screens/shop.js";
import { renderAwards } from "./ui/screens/awards.js";
import { renderTrophies } from "./ui/screens/trophies.js";
import { pull, setOnRemote } from "./net/sync.ts";
import { syncJoinButtons } from "./ui/screens/join.js";
import { setOnEnter, showTitle } from "./ui/screens/title.js";

$("btn-campaign").onclick = () => {
  if (!blockedToday()) startCampaign(frontier());
};
$("btn-tower").onclick = () => {
  if (towerOpen() && !blockedToday()) startTower();
};
$("btn-shop").onclick = $("btn-end-shop").onclick = openShop;
$("btn-shop-back").onclick = home;
$("btn-awards").onclick = () => {
  renderAwards();
  show("s-awards");
};
$("btn-aw-back").onclick = home;
$("btn-trophy").onclick = () => {
  renderTrophies();
  show("s-trophy");
};
$("btn-tr-back").onclick = home;
$("btn-train-err").onclick = () => {
  if (!blockedToday()) startTraining("err");
};
$("btn-train-new").onclick = () => {
  if (!blockedToday()) startTraining("new");
};
$("btn-again").onclick = () => {
  const k = G && G.kind,
    t = G && G.trainKind;
  stopGame();
  if (blockedToday()) return;
  k === "tower" ? startTower() : k === "training" ? startTraining(t) : startCampaign(frontier());
};
$("btn-home").onclick = home;
$("btn-quit").onclick = home;
$("word").addEventListener("pointerdown", wordPress);
$("word").addEventListener("pointermove", wordPress);
// слово не выделяется и не уводит фокус из поля ввода
$("word").addEventListener("mousedown", (ev) => ev.preventDefault());
$("opt0").onclick = () => answer(0);
$("opt1").onclick = () => answer(1);
$("typer").onsubmit = (ev) => {
  ev.preventDefault();
  typed($("type-in").value);
};
// tapping "Удар!" must not steal focus from the input: otherwise the phone keyboard closes and reopens every word
$("type-go").addEventListener("pointerdown", (e) => e.preventDefault());
$("type-go").addEventListener("mousedown", (e) => e.preventDefault());
const muteLabel = () => {
  ["btn-mute", "btn-mute-home"].forEach((id) => ($(id).textContent = "Звук: " + (settings.muted ? "выкл" : "вкл")));
  ["btn-music", "btn-music-home"].forEach(
    (id) => ($(id).textContent = "Музыка: " + (settings.music ? battleTrack().name : "выкл")),
  );
  $("btn-title-music").textContent = "Музыка: " + (settings.music && !settings.muted ? "вкл" : "выкл");
};
$("btn-title-music").onclick = () => {
  const on = !(settings.music && !settings.muted);
  settings.music = on;
  if (on) settings.muted = false;
  saveSettings();
  muteLabel();
  pauseMusic();
  if (on) {
    unlockAudio();
    setTimeout(resumeMusic, 450);
  }
};
$("btn-mute").onclick = $("btn-mute-home").onclick = () => {
  settings.muted = !settings.muted;
  saveSettings();
  muteLabel();
  if (settings.muted) {
    pauseMusic();
    if (silentEl) silentEl.pause();
  } else {
    unlockAudio();
    sfx.coin();
    resumeMusic();
  }
};
$("btn-music").onclick = $("btn-music-home").onclick = () => {
  // боевые треки по кругу, потом «выкл»; вне боя играет музыка экрана, её кнопка только включает и выключает
  if (G) G.final = false; // перелистнул сам — играет выбранный, даже у финального босса
  if (!settings.music) {
    settings.music = true;
    settings.track = TRACK_ORDER[0];
  } else {
    const i = TRACK_ORDER.indexOf(settings.track);
    if (i >= TRACK_ORDER.length - 1) settings.music = false;
    else settings.track = TRACK_ORDER[i + 1];
  }
  saveSettings();
  muteLabel();
  if (!settings.music) pauseMusic();
  else {
    unlockAudio();
    if (G && !$("s-game").hidden) pauseMusic();
    setTimeout(resumeMusic, 450);
  }
};
muteLabel();
window.addEventListener("musicchange", muteLabel);
document.querySelectorAll('input[name="play"]').forEach(
  (r) =>
    (r.onchange = () => {
      settings.play = r.value;
      saveSettings();
    }),
);
document.querySelectorAll('input[name="diff"]').forEach(
  (r) =>
    (r.onchange = () => {
      settings.words = r.value;
      saveSettings();
    }),
);
document.addEventListener("keydown", (e) => {
  if ($("s-game").hidden || !G) return;
  if (!$("boss-over").hidden) {
    if (e.key === "Enter") {
      const b = $("btn-fight") || $("btn-next");
      if (b && !$("boss-over").hidden) {
        e.preventDefault();
        b.click();
      }
    }
    return;
  }
  // лёд, супер-удар, миньоны и пузырь на поле ввода: любая клавиша (на компьютере не надо тянуться к мышке)
  if (trickKey(e)) {
    e.preventDefault();
    return;
  }
  if (G.type) return;
  if (e.key === "1" || e.key === "ArrowLeft") answer(0);
  if (e.key === "2" || e.key === "ArrowRight") answer(1);
});
syncJoinButtons();
setOnRemote(() => {
  syncJoinButtons();
  if (!$("s-home").hidden) renderHome();
  if (!$("s-title").hidden) showTitle();
});
// при первом входе с титула: достижения, которые могли открыться после обновления, и старый подарок
setOnEnter(() => {
  setTimeout(() => {
    checkAch();
    if (!$("s-home").hidden) renderHome();
  }, 1200);
  if (P.lepToast) {
    delete P.lepToast;
    save();
    setTimeout(
      () =>
        toast(
          "Ралина передала тебе подарки за победу: лепёшку с каймаком (+1 сердце) и татарский национальный костюм с тюбетейкой! Смотри в гардеробе.",
          "ach",
        ),
      1500,
    );
  }
});
// переезд со старого адреса: moved.html передаёт прогресс кодом сохранения в адресе (#import=SBZ…).
// Берём его, только если на этом устройстве опыта меньше; потом перезапуск без кода в адресе.
async function importFromHash() {
  const code = decodeURIComponent(location.hash.slice("#import=".length));
  history.replaceState(null, "", location.pathname + location.search);
  try {
    const d = await unpackSave(code);
    if (d.p.xp > P.xp) {
      LS.set("sb2_profile", d.p);
      if (d.s) LS.set("sb_stats", d.s);
      LS.set("sb_dirty", true); // если ученик уже вошёл по коду, прогресс уйдёт учителю
    }
  } catch (e) {
    // битый код — просто открываем игру
  }
  location.reload();
}
if (location.hash.startsWith("#import=")) importFromHash();
else {
  showTitle();
  pull();
}
// меню разработчика: только в npm run dev, из сборки вырезается целиком
if (import.meta.env.DEV) import("./dev/panel.js");
