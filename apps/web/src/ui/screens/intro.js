// Первый запуск: имя бойца и история.
import { $, esc } from "../../lib/dom.js";
import { BOSSES } from "../../content/bosses.js";
import { drawHero } from "../../render/hero.js";
import { drawBoss } from "../../render/sprite.js";
import { P, save } from "../../state/profile.js";
import { sfx } from "../../audio/sfx.js";
import { toast } from "../toast.js";
import { show } from "../screens.js";
import { renderHome } from "./home.js";

export function showStory() {
  const nm = esc(P.name || "герой");
  const cast = [
    ["Ралина", "Репетитор Ралина"],
    ["Ангелика", "Ангел Ангелика"],
    ["Олеся", "Олеся Зоркая"],
    ["Король Ошибок", "Король Ошибок"],
  ];
  $("story-cast").innerHTML = cast.map(([t], i) => `<figure><canvas id="sc${i}"></canvas>${t}</figure>`).join("");
  cast.forEach(([, n], i) =>
    drawBoss(
      $("sc" + i),
      BOSSES.find((b) => b.name === n),
    ),
  );
  $("story-text").innerHTML = `
    <p>Давным-давно все слова жили в Великом Словаре, и каждая буква знала своё место.</p>
    <p>Но <b>Король Ошибок</b> терпеть не мог порядок. Он разорвал Словарь, а его монстры растащили страницы и перепутали буквы. С тех пор дети пишут «малако» и «сабака», а двойки размножаются.</p>
    <p><b>Репетитор Ралина</b> сберегла последнюю страницу и ищет героя, который вернёт буквы на места. Но сначала она проверит, готов ли ты, ${nm}.</p>
    <p>Король не дремлет: чарами Безграмотности он заколдовал близких Ралины. Её подругу, ангела <b>Ангелику</b>, и её сестру, отличницу <b>Олесю</b>. Победи их, и чары спадут.</p>
    <p>Собери страницы, расколдуй друзей и доберись до замка Короля. Удачи, ${nm}!</p>`;
  P.storySeen = 1;
  save();
  show("s-story");
}
$("btn-story").onclick = showStory;
$("btn-story-go").onclick = () => {
  renderHome();
  show("s-home");
};
export function cleanName(v) {
  return String(v || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 16);
}
export function askName() {
  drawHero($("name-hero"), P.equip);
  $("name-in").value = "";
  $("name-msg").textContent = "";
  show("s-name");
  setTimeout(() => {
    try {
      $("name-in").focus();
    } catch (e) {}
  }, 60);
}
$("name-form").onsubmit = (ev) => {
  ev.preventDefault();
  const v = cleanName($("name-in").value);
  if (!v) {
    $("name-msg").textContent = "Напиши имя, хотя бы одну букву.";
    return;
  }
  P.name = v;
  save();
  sfx.coin();
  toast(`Добро пожаловать, ${v}!`, "quest");
  renderHome();
  showStory();
};
