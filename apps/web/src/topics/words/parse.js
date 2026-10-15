// Разбор формата слов: б(е/и)рёза → слово, места для выбора, ловушки.

const PAIRS = { о: "а", а: "о", е: "и", и: "е", я: "е", ё: "о", ю: "у", у: "ю", ы: "и", э: "е" };
function autoWrong(c) {
  if (c.length === 2 && c[0] === c[1]) return c[0];
  const low = c.toLowerCase();
  if (low !== c) return low;
  return PAIRS[c] || "";
}
export function parseEntry(raw) {
  raw = raw.trim();
  if (!raw) return null;
  const segs = [];
  const re = /\(([^()/]+)(?:\/([^()]+))?\)/g;
  let last = 0,
    m;
  while ((m = re.exec(raw))) {
    if (m.index > last) segs.push({ t: raw.slice(last, m.index) });
    const c = m[1].trim();
    const w = (m[2] || "").trim() || autoWrong(c);
    segs.push({ c, w });
    last = re.lastIndex;
  }
  if (last < raw.length) segs.push({ t: raw.slice(last) });
  const slots = segs.map((s, i) => (s.c !== undefined && s.w && s.w !== s.c ? i : -1)).filter((i) => i >= 0);
  if (!slots.length) return null;
  const word = segs.map((s) => (s.t !== undefined ? s.t : s.c)).join("");
  return { raw, segs, slots, word };
}
export const parseList = (str) => str.split(",").map(parseEntry).filter(Boolean);
