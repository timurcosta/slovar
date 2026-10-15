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
