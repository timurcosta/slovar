// Титульный экран: живая сцена (твой герой против злодеев), логотип, музыка меню и вход в игру.
// Сначала «Нажми, чтобы начать»: браузеры не дают играть звук до касания, а так музыка стартует сразу.
import { $, replay } from "../../lib/dom.js";
import { BOSSES } from "../../content/bosses.js";
import { PET_SPR } from "../../content/pets.js";
import { drawHero } from "../../render/hero.js";
import { bossPx, drawBoss } from "../../render/sprite.js";
import { drawTitleScene } from "../../render/title.js";
import { P } from "../../state/profile.ts";
import { settings } from "../../state/settings.ts";
import { TITLES, levelOf } from "../../progress/levels.ts";
import { frontier } from "../../progress/unlocks.js";
import { sfx } from "../../audio/sfx.js";
import { startMusic, stopMusic } from "../../audio/music.js";
import { unlockAudio } from "../../audio/context.js";
import { isGuest, linkedName } from "../../net/sync.ts";
import { show } from "../screens.js";
import { renderHome } from "./home.js";
import { showStory } from "./intro.js";
import { openLogin } from "./join.js";

const REDUCED = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
// враги на титуле — злодеи кампании, без заколдованных друзей; первым выходит следующий босс игрока
const FRIENDS = ["Репетитор Ралина", "Ангел Ангелика", "Олеся Зоркая"];
const FOES = BOSSES.filter((b) => !FRIENDS.includes(b.name));
const FOE_MS = 4200;

let started = false,
  raf = 0,
  geo = null,
  foe = -1,
  foeStart = 0,
  onEnter = () => {},
  entered = false;

/** Что сделать при первом входе в игру с титула (достижения, подарки). */
export const setOnEnter = (fn) => (onEnter = fn);

const visible = () => !$("s-title").hidden;

function measure() {
  const sec = $("s-title"),
    r = sec.getBoundingClientRect(),
    hs = $("title-hero-spot").getBoundingClientRect(),
    bs = $("title-boss-spot").getBoundingClientRect();
  // F — размер пикселя героя, S — пикселя фона (чуть мельче: фон «дальше»)
  const F = Math.max(2, Math.min(7, Math.floor(Math.min(hs.width / 44, bs.width / 34, hs.height / 36))));
  const S = Math.max(2, Math.round(F * 0.75));
  sec.style.setProperty("--fx", F);
  const cv = $("title-sky"),
    W = Math.ceil(r.width / S),
    H = Math.ceil(r.height / S);
  cv.style.width = W * S + "px";
  cv.style.height = H * S + "px";
  $("title-hero").style.width = 42 * F + "px";
  return {
    W,
    H,
    F,
    ground: Math.floor((Math.max(hs.bottom, bs.bottom) - r.top) / S),
    castleX: W * (r.width > r.height ? 0.66 : 0.5),
    // в портрете логотип во всю ширину — луна ниже него; в ландшафте справа от логотипа места хватает
    skyTop:
      r.width > r.height ? 0 : Math.ceil((sec.querySelector(".ts-logo").getBoundingClientRect().bottom - r.top) / S),
  };
}

function render(now) {
  if (!geo) geo = measure();
  drawTitleScene($("title-sky"), geo.W, geo.H, geo.ground, now, geo.castleX, geo.skyTop);
  const i = (foeStart + Math.floor(now / FOE_MS)) % FOES.length,
    cv = $("title-boss");
  const fr = Math.floor(now / 170);
  if (i !== foe) {
    foe = i;
    if (!REDUCED) replay(cv, "ts-pop");
  }
  drawBoss(cv, FOES[i], false, fr % 13 === 0 || fr % 13 === 1);
  cv.style.width = cv.width * Math.round(bossPx(cv) * geo.F) + "px";
}

function frame(now) {
  if (!visible()) {
    raf = 0;
    return;
  }
  render(now);
  raf = REDUCED ? 0 : requestAnimationFrame(frame);
}

/** Можно сразу в игру: вошёл по коду или выбрал игру гостем. Иначе «Играть» спрашивает, кто играет. */
const canEnter = () => !!linkedName() || isGuest();

function renderMenu() {
  const linked = linkedName(),
    l = levelOf(P.xp);
  $("title-greet").hidden = !linked;
  $("title-greet").textContent = linked ? `С возвращением, ${P.name || linked}!` : "";
  $("title-play-t").textContent = "Играть";
  $("title-play-sub").textContent = canEnter() ? `${linked ? "" : "Гость · "}уровень ${l} · ${TITLES[l - 1]}` : "";
  $("btn-title-join").hidden = !isGuest();
}

export function showTitle() {
  renderMenu();
  show("s-title");
  geo = null;
  foe = -1;
  const f = FOES.indexOf(BOSSES[frontier()]);
  foeStart = f < 0 ? 0 : f;
  drawHero($("title-hero"), P.equip, $("title-aura"));
  $("title-hero-spot").classList.toggle("nopet", !PET_SPR[P.equip.pet]);
  if (!raf) raf = requestAnimationFrame(frame);
  if (started) startMusic("title");
}

function start(byKey) {
  if (started) return;
  started = true;
  $("s-title").classList.add("started");
  unlockAudio();
  if (settings.music && !settings.muted) startMusic("title");
  else sfx.coin();
  if (byKey) $("btn-title-play").focus();
  // ещё не вошёл и не гость: сразу спрашиваем, кто играет (меню остаётся под окном)
  if (!canEnter()) setTimeout(openLogin, 350);
}

/** С заставки в игру: история для нового героя, иначе главная. */
export function enterGame() {
  stopMusic();
  renderHome();
  if (P.storySeen) show("s-home");
  else showStory();
  if (!entered) {
    entered = true;
    onEnter();
  }
}

function play() {
  if (canEnter()) enterGame();
  else openLogin();
}

$("s-title").addEventListener("click", (e) => {
  if (!started && !e.target.closest(".ts-foot")) start(false);
});
document.addEventListener("keydown", (e) => {
  if (!visible() || started || e.target.closest?.(".ts-foot")) return;
  if (e.key === "Enter" || e.key === " ") e.preventDefault();
  start(true);
});
$("btn-title-play").onclick = play;
$("btn-title-join").onclick = openLogin;
const relayout = () => {
  geo = null;
  if (visible() && !raf) render(performance.now());
};
window.addEventListener("resize", relayout);
// шрифт логотипа догружается позже и сдвигает землю: следим за размером мест героя и босса
if (window.ResizeObserver) {
  const ro = new ResizeObserver(relayout);
  ro.observe($("title-hero-spot"));
  ro.observe($("title-boss-spot"));
}
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && visible() && started) startMusic("title");
});
