// Точка входа для Yandex Cloud Functions: вызов от API Gateway → обычный Request → Hono-приложение.
// Настройки — переменные окружения функции (в репозитории их нет):
//   YDB_CONNECTION_STRING, AUTH_SECRET, TUTOR_PASSWORD_HASH
import { CredentialsProvider } from "@ydbjs/auth";
import { MetadataCredentialsProvider } from "@ydbjs/auth/metadata";
import { createApp } from "./app.ts";
import { YdbStore } from "./store/ydb.ts";

interface GatewayEvent {
  httpMethod: string;
  /** Путь запроса с query-строкой, как его прислал клиент. */
  url?: string;
  path: string;
  headers?: Record<string, string>;
  queryStringParameters?: Record<string, string>;
  body?: string;
  isBase64Encoded?: boolean;
}
interface FunctionContext {
  /** IAM-токен сервисного аккаунта функции. */
  token?: { access_token: string; expires_in: number };
}

/** Токен сервисного аккаунта из контекста вызова; если его нет — из сервиса метаданных. */
class FunctionTokenProvider extends CredentialsProvider {
  token: { value: string; until: number } | null = null;
  private fallback = new MetadataCredentialsProvider();
  async getToken(force?: boolean, signal?: AbortSignal) {
    if (!force && this.token && this.token.until > Date.now()) return this.token.value;
    return this.fallback.getToken(force, signal);
  }
}

const env = process.env;
const creds = new FunctionTokenProvider();
const app = createApp({
  store: new YdbStore(env.YDB_CONNECTION_STRING || "", creds),
  secret: env.AUTH_SECRET || "",
  tutorPasswordHash: env.TUTOR_PASSWORD_HASH || "",
});
const configured = !!(env.YDB_CONNECTION_STRING && env.AUTH_SECRET && env.TUTOR_PASSWORD_HASH);

export async function handler(event: GatewayEvent, context: FunctionContext) {
  if (!configured) {
    console.error("Не заданы YDB_CONNECTION_STRING, AUTH_SECRET или TUTOR_PASSWORD_HASH");
    return { statusCode: 500, headers: { "content-type": "application/json" }, body: '{"error":"not configured"}' };
  }
  if (context.token?.access_token)
    creds.token = { value: context.token.access_token, until: Date.now() + (context.token.expires_in - 60) * 1000 };

  let path = event.url || event.path;
  if (!event.url && event.queryStringParameters && Object.keys(event.queryStringParameters).length)
    path += "?" + new URLSearchParams(event.queryStringParameters).toString();
  const method = event.httpMethod.toUpperCase();
  const body =
    event.body && method !== "GET" && method !== "HEAD"
      ? event.isBase64Encoded
        ? Buffer.from(event.body, "base64")
        : event.body
      : undefined;

  const res = await app.fetch(
    new Request(new URL(path, "https://api.local"), { method, headers: event.headers, body }),
  );
  return {
    statusCode: res.status,
    headers: Object.fromEntries(res.headers),
    body: await res.text(),
    isBase64Encoded: false,
  };
}
