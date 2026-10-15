// Предпросмотр строкового спрайта в PNG без сборки и браузера.
// node preview-sprite.mjs <spr> [палитра] [--blink] [--angry] [--scale=8]   |   pet:<ключ>
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..", "..");
const { SPR, PALS, BLINK } = await import(join(root, "apps/web/src/content/sprites.js"));
const { PET_SPR, PET_SPR2, PET_PAL } = await import(join(root, "apps/web/src/content/pets.js"));
const { merchantSprite, MERCHANT_PAL, MERCHANT_BLINK } = await import(join(root, "apps/web/src/content/merchant.js"));

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flags = process.argv.slice(2).filter((a) => a.startsWith("--"));
const scale = +(flags.find((f) => f.startsWith("--scale="))?.split("=")[1] || 8);
if (!args.length) {
  console.log("Боссы:", Object.keys(SPR).join(" "));
  console.log("Палитры:", Object.keys(PALS).join(" "));
  console.log(
    "Питомцы:",
    Object.keys(PET_SPR)
      .map((k) => "pet:" + k)
      .join(" "),
  );
  process.exit(0);
}

const frames = [];
let name = args[0];
if (name === "merchant") {
  // Котофей из гардероба: хвост 0 и 1, моргание, довольный
  const blink = { ...MERCHANT_PAL };
  for (const [k, v] of Object.entries(MERCHANT_BLINK)) blink[k] = MERCHANT_PAL[v];
  frames.push(
    [merchantSprite(0), MERCHANT_PAL],
    [merchantSprite(1), MERCHANT_PAL],
    [merchantSprite(0), blink],
    [merchantSprite(1, true), MERCHANT_PAL],
  );
} else if (name.startsWith("pet:")) {
  const k = name.slice(4);
  if (!PET_SPR[k]) throw new Error("нет питомца " + k);
  frames.push([PET_SPR[k], PET_PAL[k]], [PET_SPR2[k] || PET_SPR[k], PET_PAL[k]]);
  name = "pet-" + k;
} else {
  const palKey = args[1] || name;
  if (!SPR[name]) throw new Error("нет спрайта " + name);
  if (!PALS[palKey]) throw new Error("нет палитры " + palKey);
  let pal = { ...PALS[palKey] };
  if (flags.includes("--angry") && BLINK[palKey])
    for (const k of Object.keys(BLINK[palKey])) pal[k] = palKey === "two" ? "#ffd23f" : "#ff2a2a";
  else if (flags.includes("--blink") && BLINK[palKey])
    for (const [k, v] of Object.entries(BLINK[palKey])) if (pal[v]) pal[k] = pal[v];
  frames.push([SPR[name], pal]);
  if (args[1]) name += "-" + palKey;
  if (flags.includes("--blink")) name += "-blink";
  if (flags.includes("--angry")) name += "-angry";
}

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const grids = frames.map(([sp, pal]) => {
  const rows = sp
    .trim()
    .split("\n")
    .map((r) => r.trim());
  const w = Math.max(...rows.map((r) => r.length));
  return { rows, w, h: rows.length, pal };
});
const gap = 2;
const W = grids.reduce((s, g) => s + g.w, 0) + gap * (grids.length + 1);
const H = Math.max(...grids.map((g) => g.h)) + gap * 2;
const px = new Uint8Array(W * H * 4);
const bg = [20, 26, 51];
for (let i = 0; i < W * H; i++) px.set([...bg, 255], i * 4);
let x0 = gap;
for (const g of grids) {
  g.rows.forEach((r, y) =>
    [...r].forEach((ch, x) => {
      if (ch === "." || !g.pal[ch]) return;
      px.set([...hex(g.pal[ch]), 255], ((y + gap) * W + x0 + x) * 4);
    }),
  );
  x0 += g.w + gap;
}

// PNG: масштабируем nearest-neighbour и кодируем вручную (zlib есть в Node)
const SW = W * scale,
  SH = H * scale;
const raw = Buffer.alloc((SW * 4 + 1) * SH);
for (let y = 0; y < SH; y++) {
  raw[y * (SW * 4 + 1)] = 0;
  for (let x = 0; x < SW; x++) {
    const s = (((y / scale) | 0) * W + ((x / scale) | 0)) * 4;
    raw.set(px.subarray(s, s + 4), y * (SW * 4 + 1) + 1 + x * 4);
  }
}
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (b) => {
  let c = 0xffffffff;
  for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SW, 0);
ihdr.writeUInt32BE(SH, 4);
ihdr.set([8, 6, 0, 0, 0], 8);
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0)),
]);
const outDir = join(here, "..", "out");
mkdirSync(outDir, { recursive: true });
const out = join(outDir, name + ".png");
writeFileSync(out, png);
console.log(out, `${W}×${H} px, ×${scale}`);
