// Развёртывание в Yandex Cloud. Можно запускать сколько угодно раз: создаёт недостающее и обновляет остальное.
//   npm run cloud:deploy
// Нужны: вход в yc (yc init) и .env с TUTOR_PASSWORD_HASH (npm run cloud:password).
//
// Что получается (всё в каталоге из yc config):
//   YDB serverless «repetitor»     — база (создана заранее, ограничена 1 ГБ и 10 RU/s)
//   бакет repetitor-web-<каталог>  — файлы игры, приватный, не больше 1 ГБ
//   функция repetitor-api          — API, не больше 2 копий на зону
//   API Gateway repetitor          — один адрес: /api/* → функция, остальное → файлы из бакета
//   сервисные аккаунты: repetitor-api (только база), repetitor-gateway (вызов функции и чтение бакета)
import { execFileSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { hashPassword } from "../../apps/api/src/auth.ts";
import { readEnv, writeEnv } from "./env.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const ENV = { ...process.env, PATH: `${os.homedir()}/yandex-cloud/bin:${process.env.PATH}` };
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { env: ENV, encoding: "utf8", cwd: ROOT, ...opts });
const yc = (...args) => {
  const out = run("yc", [...args, "--format", "json"], { stdio: ["ignore", "pipe", "pipe"] });
  return out.trim() ? JSON.parse(out) : null;
};
const ycTry = (...args) => {
  try {
    return yc(...args);
  } catch {
    return null;
  }
};
const step = (s) => console.log(`\n▸ ${s}`);

// ---------- секреты ----------
let env = readEnv();
// без пароля кабинет закрыт: ставится хэш случайного пароля, которого никто не знает
const tutorHash = env.TUTOR_PASSWORD_HASH || hashPassword(crypto.randomBytes(32).toString("base64url"));
if (!env.TUTOR_PASSWORD_HASH)
  console.log("⚠ Пароль кабинета не задан — вход в кабинет закрыт. Задать: npm run cloud:password");
if (!env.AUTH_SECRET) {
  writeEnv({ AUTH_SECRET: crypto.randomBytes(32).toString("base64url") });
  env = readEnv();
}

const folderId = run("yc", ["config", "get", "folder-id"]).trim();
const DB = "repetitor",
  FN = "repetitor-api",
  GW = "repetitor",
  SA_API = "repetitor-api",
  SA_GW = "repetitor-gateway",
  BUCKET = `repetitor-web-${folderId}`;

// ---------- база ----------
step("База YDB");
const db = yc("ydb", "database", "get", DB);
console.log(`  ${db.status}, ${db.endpoint}`);

// ---------- сервисные аккаунты ----------
step("Сервисные аккаунты");
const ensureSa = (name, description) =>
  ycTry("iam", "service-account", "get", name) ??
  yc("iam", "service-account", "create", name, "--description", description);
const saApi = ensureSa(SA_API, "API игры: доступ только к базе repetitor");
const saGw = ensureSa(SA_GW, "API Gateway игры: вызов функции и чтение файлов игры");
console.log(`  ${SA_API}: ${saApi.id}\n  ${SA_GW}: ${saGw.id}`);

const bind = (what, ...args) => {
  // повторная выдача той же роли — не ошибка
  try {
    run("yc", args, { stdio: ["ignore", "pipe", "pipe"] });
    console.log(`  + ${what}`);
  } catch (e) {
    if (/already|exists|уже/i.test(String(e.stderr))) console.log(`  = ${what}`);
    else throw e;
  }
};
bind(
  `${SA_API} → ydb.editor на базе ${DB}`,
  "ydb",
  "database",
  "add-access-binding",
  DB,
  "--role",
  "ydb.editor",
  "--service-account-id",
  saApi.id,
);

// ---------- бакет ----------
step(`Бакет ${BUCKET}`);
if (!ycTry("storage", "bucket", "get", BUCKET))
  yc(
    "storage",
    "bucket",
    "create",
    "--name",
    BUCKET,
    "--default-storage-class",
    "standard",
    "--max-size",
    String(1024 ** 3),
  );
yc(
  "storage",
  "bucket",
  "update",
  "--name",
  BUCKET,
  "--grants",
  `grant-type=grant-type-account,grantee-id=${saGw.id},permission=permission-read`,
);
console.log(`  приватный, читать может только ${SA_GW}`);

// ---------- таблица ----------
step("Таблица students");
run(
  "node",
  [
    "--disable-warning=ExperimentalWarning",
    "--input-type=module",
    "-e",
    `import { YdbStore } from "./apps/api/src/store/ydb.ts";
     import { AccessTokenCredentialsProvider } from "@ydbjs/auth/access-token";
     const s = new YdbStore(process.env.CS, new AccessTokenCredentialsProvider({ token: process.env.TOKEN }));
     await s.ensureSchema(); s.driver.close(); process.exit(0);`,
  ],
  { env: { ...ENV, CS: db.endpoint, TOKEN: run("yc", ["iam", "create-token"]).trim() }, stdio: "inherit" },
);
console.log("  есть");

// ---------- сборка ----------
step("Сборка");
run("npm", ["run", "build", "-w", "@repetitor/api"], { stdio: ["ignore", "ignore", "inherit"] });
run("npm", ["run", "build:online"], { stdio: ["ignore", "ignore", "inherit"] });
const zip = path.join(os.tmpdir(), `repetitor-api-${Date.now()}.zip`);
run("zip", ["-j", "-q", zip, "apps/api/dist/index.js", "apps/api/dist/package.json"]);
console.log(`  функция: ${(fs.statSync(zip).size / 1024).toFixed(0)} КБ в архиве`);

// ---------- функция ----------
step(`Функция ${FN}`);
const fn = ycTry("serverless", "function", "get", FN) ?? yc("serverless", "function", "create", "--name", FN);
const ver = yc(
  "serverless",
  "function",
  "version",
  "create",
  "--function-id",
  fn.id,
  "--runtime",
  "nodejs22",
  "--entrypoint",
  "index.handler",
  "--memory",
  "256m",
  "--execution-timeout",
  "10s",
  "--service-account-id",
  saApi.id,
  "--source-path",
  zip,
  "--environment",
  `YDB_CONNECTION_STRING=${db.endpoint},AUTH_SECRET=${env.AUTH_SECRET},TUTOR_PASSWORD_HASH=${tutorHash}`,
);
fs.rmSync(zip);
console.log(`  версия ${ver.id}`);
yc(
  "serverless",
  "function",
  "set-scaling-policy",
  fn.id,
  "--tag",
  "$latest",
  "--zone-instances-limit",
  "2",
  "--zone-requests-limit",
  "4",
);
console.log("  не больше 2 копий на зону");
bind(
  `${SA_GW} → functions.functionInvoker на ${FN}`,
  "serverless",
  "function",
  "add-access-binding",
  fn.id,
  "--role",
  "functions.functionInvoker",
  "--service-account-id",
  saGw.id,
);

// ---------- файлы игры ----------
step("Файлы игры");
const DIST = path.join(ROOT, "apps/web/dist-online");
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};
const files = [];
const walk = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : files.push(path.join(d, e.name))));
walk(DIST);
// сначала ресурсы с хэшем в имени (кэшируются надолго), потом страницы (всегда свежие)
files.sort((a, b) => (a.endsWith(".html") ? 1 : 0) - (b.endsWith(".html") ? 1 : 0));
for (const f of files) {
  const key = path.relative(DIST, f).split(path.sep).join("/");
  const html = f.endsWith(".html");
  run("yc", [
    "storage",
    "s3",
    "cp",
    f,
    `s3://${BUCKET}/${key}`,
    "--content-type",
    TYPES[path.extname(f)] || "application/octet-stream",
    "--cache-control",
    html ? "no-cache" : "public, max-age=31536000, immutable",
  ]);
  console.log(`  ${key}`);
}

// ---------- шлюз ----------
step(`API Gateway ${GW}`);
const spec = `openapi: 3.0.0
info:
  title: repetitor
  version: 1.0.0
x-yc-apigateway:
  service_account_id: ${saGw.id}
paths:
  /:
    get:
      x-yc-apigateway-integration:
        type: object_storage
        bucket: ${BUCKET}
        object: index.html
  /api/{path+}:
    x-yc-apigateway-any-method:
      parameters:
        - name: path
          in: path
          required: true
          schema:
            type: string
      x-yc-apigateway-integration:
        type: cloud_functions
        function_id: ${fn.id}
        tag: $latest
        payload_format_version: "0.1"
  /{file+}:
    get:
      parameters:
        - name: file
          in: path
          required: true
          schema:
            type: string
      x-yc-apigateway-integration:
        type: object_storage
        bucket: ${BUCKET}
        object: "{file}"
        error_object:
          object: index.html
          statusCode: 404
`;
const specFile = path.join(os.tmpdir(), "repetitor-gateway.yaml");
fs.writeFileSync(specFile, spec);
const gw = ycTry("serverless", "api-gateway", "get", GW)
  ? yc("serverless", "api-gateway", "update", GW, "--spec", specFile)
  : yc("serverless", "api-gateway", "create", "--name", GW, "--spec", specFile);
fs.rmSync(specFile);
console.log(`\n✓ Готово: https://${gw.domain}/  ·  кабинет: https://${gw.domain}/tutor.html`);
