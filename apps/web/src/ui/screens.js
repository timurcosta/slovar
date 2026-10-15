// Переключение экранов.
import { $ } from "../lib/dom.js";
import { screenMusic } from "../audio/music.js";

const SCREENS = ["s-title", "s-trophy", "s-home", "s-game", "s-end", "s-shop", "s-awards", "s-story"];
/** Экран, созданный из кода (меню разработчика), тоже участвует в переключении. */
export const addScreen = (id) => SCREENS.push(id);
export function show(id) {
  SCREENS.forEach((s) => ($(s).hidden = s !== id));
  document.body.classList.toggle("on-title", id === "s-title");
  window.scrollTo(0, 0);
  screenMusic(id);
}
