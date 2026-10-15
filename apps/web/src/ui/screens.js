// Переключение экранов.
import { $ } from "../lib/dom.js";

const SCREENS = [
  "s-trophy",
  "s-home",
  "s-game",
  "s-end",
  "s-shop",
  "s-awards",
  "s-teacher",
  "s-pin",
  "s-name",
  "s-story",
  "s-save",
  "s-join",
];
export function show(id) {
  SCREENS.forEach((s) => ($(s).hidden = s !== id));
  window.scrollTo(0, 0);
}
