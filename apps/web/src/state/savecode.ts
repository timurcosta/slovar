// Коды сохранения: профиль и статистика → сжатая строка SBZ… и обратно. Чистые функции без
// текущего профиля: ими пользуется и страница переезда со старого адреса (moved.html).
import type { SaveData } from "./types.ts";

const b64u = (bytes: Uint8Array) => {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const unb64u = (str: string) => {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str),
    out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};
const pipeBytes = (bytes: Uint8Array, stream: CompressionStream | DecompressionStream) =>
  new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream)).arrayBuffer().then((b) => new Uint8Array(b));

export async function packSave(data: SaveData): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify(data));
  try {
    return "SBZ" + b64u(await pipeBytes(raw, new CompressionStream("deflate-raw")));
  } catch (e) {
    return "SBJ" + b64u(raw);
  }
}

export async function unpackSave(code: unknown): Promise<SaveData> {
  const s = String(code || "").replace(/\s+/g, "");
  const tag = s.slice(0, 3),
    body = s.slice(3);
  if ((tag !== "SBZ" && tag !== "SBJ") || !body) throw new Error("format");
  let bytes = unb64u(body);
  if (tag === "SBZ") bytes = await pipeBytes(bytes, new DecompressionStream("deflate-raw"));
  const d = JSON.parse(new TextDecoder().decode(bytes));
  if (!d || !d.p || typeof d.p.xp !== "number" || !Array.isArray(d.p.beaten)) throw new Error("data");
  return d;
}
