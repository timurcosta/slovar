// Работа с цветом для пиксельной графики.

export const shadeHex = (hex, f) =>
  "#" +
  [1, 3, 5]
    .map((i) =>
      Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * f)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
