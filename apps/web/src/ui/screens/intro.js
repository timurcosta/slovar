// История для нового героя (имя задаёт учитель при заведении ученика).
import { $, esc, replay } from "../../lib/dom.js";
import { BOSSES } from "../../content/bosses.js";
import { drawHero } from "../../render/hero.js";
import { drawBoss } from "../../render/sprite.js";
import { P, save } from "../../state/profile.ts";
import { sfx } from "../../audio/sfx.js";
import { show } from "../screens.js";
import { renderHome } from "./home.js";

// История комиксом: картинка и одна-две строки на кадр, дети 7–8 лет длинный текст пролистывают
const FRAMES = [
  {
    cast: [["Король Ошибок", "Король Ошибок"]],
    text: "Злой <b>Король Ошибок</b> разорвал Великий Словарь. Буквы перепутались, и все стали писать «малако»!",
  },
  {
    cast: [["Ралина", "Репетитор Ралина"]],
    text: "<b>Репетитор Ралина</b> спасла последнюю страницу. Ей нужен герой. Это ты, {name}!",
  },
  {
    cast: [
      ["Ангелика", "Ангел Ангелика"],
      ["Олеся", "Олеся Отличница"],
    ],
    text: "Король заколдовал подругу Ралины <b>Ангелику</b> и её сестру <b>Олесю</b>. Победи их, и чары спадут!",
  },
  { hero: true, text: "Собери страницы Словаря и дойди до замка Короля. Вперёд, {name}!" },
];
let frame = 0;
function paintFrame() {
  const f = FRAMES[frame],
    nm = esc(P.name || "герой");
  const cast = f.hero ? [[P.name || "Ты"]] : f.cast;
  $("story-cast").innerHTML = cast.map(([t], i) => `<figure><canvas id="sc${i}"></canvas>${esc(t)}</figure>`).join("");
  if (f.hero) drawHero($("sc0"), P.equip);
  else
    cast.forEach(([, n], i) =>
      drawBoss(
        $("sc" + i),
        BOSSES.find((b) => b.name === n),
      ),
    );
  $("story-text").innerHTML = `<p>${f.text.replace(/\{name\}/g, nm)}</p>`;
  $("story-dots").innerHTML = FRAMES.map((_, i) => `<i class="${i === frame ? "on" : ""}"></i>`).join("");
  $("btn-story-go").textContent = frame < FRAMES.length - 1 ? "Дальше" : "В поход!";
  replay($("story-cast"), "framein");
}
export function showStory() {
  frame = 0;
  paintFrame();
  P.storySeen = 1;
  save();
  show("s-story");
}
$("btn-story").onclick = showStory;
$("btn-story-go").onclick = () => {
  if (frame < FRAMES.length - 1) {
    frame++;
    sfx.block();
    paintFrame();
    return;
  }
  renderHome();
  show("s-home");
};
