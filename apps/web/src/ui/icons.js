// Пиксельные иконки в HTML: монета, сердце.

const COIN_SVG = `<svg class="coin" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true"><rect x="2" y="0" width="4" height="8" fill="#f0a000"/><rect x="0" y="2" width="8" height="4" fill="#f0a000"/><rect x="1" y="1" width="6" height="6" fill="#f0a000"/><rect x="2" y="1" width="4" height="6" fill="#ffd84a"/><rect x="1" y="2" width="6" height="4" fill="#ffd84a"/><rect x="3" y="2" width="2" height="4" fill="#f0a000"/></svg>`;
export const coinsHTML = (n) => `${COIN_SVG}<span>${n}</span>`;
export function heartSVG(full) {
  const px = [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."];
  let r = "";
  px.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === "X") r += `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`;
    }),
  );
  return `<svg viewBox="0 0 7 6" fill="${full ? "var(--pen)" : "var(--grid)"}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}

// Пиксельные иконки главной. Буквы — цвета из палитры, K — цвет текста кнопки (currentColor).
const ICON_PAL = {
  K: "currentColor",
  S: "#9aa7bd",
  D: "#4a5670",
  R: "#d62839",
  W: "#ffd23f",
  Y: "#f0a000",
  L: "#ffd84a",
  B: "#6b4e31",
  C: "#45d1e6",
  E: "#e6eef8",
};
const ICONS = {
  tower: [
    "....KRRR...",
    "....KRR....",
    "....K......",
    "S.S.S.S.S.S",
    "SSSSSSSSSSS",
    ".SSSSSSSSS.",
    ".SSWSSSWSS.",
    ".SSSSSSSSS.",
    ".SSSSSSSSS.",
    ".SSSSDSSSS.",
    ".SSSDDDSSS.",
    ".SSSDDDSSS.",
  ],
  sword: [
    "..........E",
    ".........EC",
    "........EC.",
    ".......EC..",
    "......EC...",
    ".....EC....",
    "..Y.EC.....",
    "...YC......",
    "...BYY.....",
    "..B..Y.....",
    ".B.........",
    "B..........",
  ],
  star: [
    ".....L.....",
    ".....L.....",
    "....LLL....",
    "....LLL....",
    "LLLLLYLLLLL",
    ".LLLYYYLLL.",
    "..LLYYYLL..",
    "...LLYLL...",
    "..LLLLLLL..",
    "..LLL.LLL..",
    ".LL.....LL.",
    ".L.......L.",
  ],
  cup: [
    "KKKKKKKKKKK",
    "KYWYYYYYYYK",
    "KYWYYYYYYYK",
    ".KYWYYYYYK.",
    "..KYYYYYK..",
    "...KYYYK...",
    "....KYK....",
    ".....Y.....",
    ".....Y.....",
    "....YYY....",
    "...KKKKK...",
    "...KBBBK...",
  ],
  gear: [
    "....K....",
    ".K.KKK.K.",
    "..KKKKK..",
    ".KKK.KKK.",
    "KKK...KKK",
    ".KKK.KKK.",
    "..KKKKK..",
    ".K.KKK.K.",
    "....K....",
  ],
  share: [
    "....K....",
    "...KKK...",
    "..K.K.K..",
    "....K....",
    "....K....",
    "K...K...K",
    "K.......K",
    "K.......K",
    "KKKKKKKKK",
  ],
};
export function iconSVG(name) {
  const rows = ICONS[name],
    w = Math.max(...rows.map((r) => r.length));
  let r = "";
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (ICON_PAL[c]) r += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${ICON_PAL[c]}"/>`;
    }),
  );
  return `<svg viewBox="0 0 ${w} ${rows.length}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
/** Заполняет все <span class="ico" data-ico="…"> внутри root. */
export function paintIcons(root = document) {
  root.querySelectorAll(".ico[data-ico]").forEach((el) => (el.innerHTML = iconSVG(el.dataset.ico)));
}
