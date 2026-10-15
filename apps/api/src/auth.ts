// Пароль репетитора и токены входа. Токен — подписанная HMAC строка, сервер ничего не хранит о сессиях.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export type TokenPayload =
  | { role: "tutor"; exp: number }
  /** Токен ученика бессрочный, но перестаёт действовать при смене кода (cv). */
  | { role: "student"; sid: string; cv: number };

const b64u = (s: string | Buffer) => Buffer.from(s).toString("base64url");

export function signToken(payload: TokenPayload, secret: string): string {
  const body = b64u(JSON.stringify(payload));
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}

export function verifyToken(token: string, secret: string, now = Date.now()): TokenPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest();
  const got = Buffer.from(sig, "base64url");
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as TokenPayload;
    if (p.role === "tutor" && !(p.exp > now)) return null;
    return p;
  } catch {
    return null;
  }
}

/** Хэш пароля в формате scrypt$<соль>$<хэш>. Генерируется командой `npm run hash-password -w @repetitor/api`. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("base64url")}$${scryptSync(password, salt, 32).toString("base64url")}`;
}

export function checkPassword(password: string, stored: string): boolean {
  const [kind, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const want = Buffer.from(hash, "base64url");
  const got = scryptSync(password, Buffer.from(salt, "base64url"), want.length);
  return timingSafeEqual(got, want);
}

// Коды для учеников: без похожих символов (0/O, 1/I/L), чтобы ребёнок не путался.
const CODE_ABC = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function newCode(len = 6): string {
  const bytes = randomBytes(len);
  return [...bytes].map((b) => CODE_ABC[b % CODE_ABC.length]).join("");
}
export const normalizeCode = (s: string) =>
  String(s || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
