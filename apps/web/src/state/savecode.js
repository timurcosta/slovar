// Коды сохранения: профиль и статистика → сжатая строка SBZ… и обратно.
import { stats } from "./stats.js";
import { P } from "./profile.js";

/* ---------- save codes ---------- */
const b64u = (bytes) => {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const unb64u = (str) => {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str),
    out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};
const pipeBytes = (bytes, stream) =>
  new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then((b) => new Uint8Array(b));
export async function packSave() {
  const raw = new TextEncoder().encode(JSON.stringify({ v: 1, p: P, s: stats }));
  try {
    return "SBZ" + b64u(await pipeBytes(raw, new CompressionStream("deflate-raw")));
  } catch (e) {
    return "SBJ" + b64u(raw);
  }
}
export async function unpackSave(code) {
  code = String(code || "").replace(/\s+/g, "");
  const tag = code.slice(0, 3),
    body = code.slice(3);
  if ((tag !== "SBZ" && tag !== "SBJ") || !body) throw new Error("format");
  let bytes = unb64u(body);
  if (tag === "SBZ") bytes = await pipeBytes(bytes, new DecompressionStream("deflate-raw"));
  const d = JSON.parse(new TextDecoder().decode(bytes));
  if (!d || !d.p || typeof d.p.xp !== "number" || !Array.isArray(d.p.beaten)) throw new Error("data");
  return d;
}
