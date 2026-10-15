// Локальный сервер для разработки: SQLite в apps/api/.data/, порт 8787.
// Пароль репетитора берётся из TUTOR_PASSWORD_HASH, иначе для разработки подходит пароль "dev".
import { mkdirSync } from "node:fs";
import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { hashPassword } from "./auth.ts";
import { SqliteStore } from "./store/sqlite.ts";

const port = Number(process.env.PORT || 8787);
mkdirSync(new URL("../.data/", import.meta.url), { recursive: true });
const store = new SqliteStore(new URL("../.data/dev.sqlite", import.meta.url).pathname);
const tutorPasswordHash = process.env.TUTOR_PASSWORD_HASH || hashPassword("dev");
if (!process.env.TUTOR_PASSWORD_HASH) console.log('Пароль репетитора для разработки: "dev"');

const app = createApp({ store, secret: process.env.AUTH_SECRET || "dev-secret", tutorPasswordHash });
serve({ fetch: app.fetch, port }, () => console.log(`API: http://localhost:${port}/api`));
