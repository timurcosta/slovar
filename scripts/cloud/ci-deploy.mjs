// Выкладка из GitHub Actions (job «cloud» в .github/workflows/ci.yml): новая версия функции repetitor-api
// и файлы игры в бакет. Без ключей: GitHub выдаёт OIDC-токен, Yandex Cloud меняет его на IAM-токен
// сервисного аккаунта repetitor-deployer (федерация github-actions, только ветка main этого репо).
// Права у него узкие: обновлять функцию repetitor-api и писать в бакет. Шлюз, базу, роли он менять не может —
// это делает npm run cloud:deploy с компьютера владельца.
//
// Секреты функции (AUTH_SECRET, TUTOR_PASSWORD_HASH) в GitHub не хранятся: новая версия берёт
// переменные окружения у текущей версии $latest.
//
// Нужны переменные: YC_FOLDER_ID, YC_DEPLOYER_SA_ID; сборки apps/api/dist и apps/web/dist.
import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const { YC_FOLDER_ID: FOLDER, YC_DEPLOYER_SA_ID: SA } = process.env;
const FN = "repetitor-api";
const BUCKET = `repetitor-web-${FOLDER}`;
if (!FOLDER || !SA) throw new Error("Нужны YC_FOLDER_ID и YC_DEPLOYER_SA_ID");

// ---------- токен ----------
async function iamToken() {
  // для проверки с компьютера: YC_IAM_TOKEN=$(yc iam create-token --impersonate-service-account-id …)
  if (process.env.YC_IAM_TOKEN) return process.env.YC_IAM_TOKEN;
  const { ACTIONS_ID_TOKEN_REQUEST_URL: url, ACTIONS_ID_TOKEN_REQUEST_TOKEN: req } = process.env;
  if (!url || !req) throw new Error("Нет OIDC-токена GitHub: у job должно быть permissions: id-token: write");
  const gh = await fetch(url, { headers: { authorization: `Bearer ${req}` } }).then((r) => r.json());
  const res = await fetch("https://auth.yandex.cloud/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
      audience: SA,
      subject_token: gh.value,
      subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
    }),
  });
  const body = await res.json();
  if (!body.access_token) throw new Error(`Yandex Cloud не выдал токен: ${res.status} ${JSON.stringify(body)}`);
  return body.access_token;
}
const token = await iamToken();

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${url}: ${res.status} ${JSON.stringify(data)}`);
  return data;
}
async function wait(op) {
  for (let i = 0; !op.done && i < 120; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    op = await api("GET", `https://operation.api.cloud.yandex.net/operations/${op.id}`);
  }
  if (op.error) throw new Error(`Операция не удалась: ${JSON.stringify(op.error)}`);
  if (!op.done) throw new Error("Операция не завершилась за 4 минуты");
  return op.response;
}

// ---------- функция ----------
const FAPI = "https://serverless-functions.api.cloud.yandex.net/functions/v1";
const fns = await api("GET", `${FAPI}/functions?folderId=${FOLDER}&filter=${encodeURIComponent(`name="${FN}"`)}`);
const fn = fns.functions?.[0];
if (!fn) throw new Error(`Функции ${FN} нет — сначала npm run cloud:deploy с компьютера`);
const cur = await api("GET", `${FAPI}/versions:byTag?functionId=${fn.id}&tag=$latest`);

const zip = path.join(os.tmpdir(), "repetitor-api.zip");
fs.rmSync(zip, { force: true });
execFileSync("zip", ["-j", "-q", zip, "apps/api/dist/index.js", "apps/api/dist/package.json"], { cwd: ROOT });
const ver = await wait(
  await api("POST", `${FAPI}/versions`, {
    functionId: fn.id,
    runtime: cur.runtime,
    entrypoint: cur.entrypoint,
    resources: cur.resources,
    executionTimeout: cur.executionTimeout,
    serviceAccountId: cur.serviceAccountId,
    environment: cur.environment,
    content: fs.readFileSync(zip).toString("base64"),
  }),
);
console.log(`Функция ${FN}: новая версия ${ver.id}`);

// ---------- файлы игры ----------
const DIST = path.join(ROOT, "apps/web/dist");
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
// сначала ресурсы с хэшем в имени, потом страницы, которые на них ссылаются
files.sort((a, b) => (a.endsWith(".html") ? 1 : 0) - (b.endsWith(".html") ? 1 : 0));
for (const f of files) {
  const key = path.relative(DIST, f).split(path.sep).join("/");
  const res = await fetch(`https://storage.yandexcloud.net/${BUCKET}/${key}`, {
    method: "PUT",
    headers: {
      "X-YaCloud-SubjectToken": token,
      "content-type": TYPES[path.extname(f)] || "application/octet-stream",
      "cache-control": f.endsWith(".html") ? "no-cache" : "public, max-age=31536000, immutable",
    },
    body: fs.readFileSync(f),
  });
  if (!res.ok) throw new Error(`Загрузка ${key}: ${res.status} ${await res.text()}`);
  console.log(`  ${key}`);
}
console.log("Готово");
