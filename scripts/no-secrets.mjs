// Не даёт закоммитить ключи и пароли: репо публичное.
//   node scripts/no-secrets.mjs file1 file2 …   — проверить файлы (так вызывает хук перед коммитом)
//   node scripts/no-secrets.mjs                 — проверить все файлы в git (так вызывает CI)
// Если сработало ложно, перепиши строку так, чтобы она не выглядела как ключ.
import { execFileSync } from "child_process";
import fs from "fs";

const RULES = [
  ["OAuth-токен Яндекса", /\by0_[A-Za-z0-9_-]{30,}/],
  ["IAM-токен Yandex Cloud", /\bt1\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/],
  ["статический ключ доступа Yandex Cloud", /\bYCAJ[A-Za-z0-9_-]{20,}/],
  ["секретный ключ Yandex Cloud", /\bYC[A-Za-z0-9_-]{36,}/],
  ["API-ключ Yandex Cloud", /\bAQVN[A-Za-z0-9_-]{30,}/],
  ["закрытый ключ", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["хэш пароля репетитора", /scrypt\$[A-Za-z0-9_-]{16,}\$[A-Za-z0-9_-]{20,}/],
  ["токен GitHub", /\bgh[pousr]_[A-Za-z0-9]{30,}/],
  [
    "значение секрета в переменной",
    /\b(AUTH_SECRET|TUTOR_PASSWORD_HASH)\s*[=:]\s*["']?[A-Za-z0-9$_+/=-]{12,}(?![\w(])/,
  ],
];
const SKIP = /(^|\/)(package-lock\.json|node_modules\/|dist(-online)?\/|shots\/)|\.(png|jpe?g|gif|ico|woff2?)$/;

const files = (
  process.argv.length > 2
    ? process.argv.slice(2)
    : execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean)
).filter((f) => !SKIP.test(f) && fs.existsSync(f) && fs.statSync(f).isFile());

const hits = [];
for (const f of files) {
  const lines = fs.readFileSync(f, "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const [what, re] of RULES) if (re.test(line)) hits.push(`${f}:${i + 1}: похоже на ${what}`);
  });
}
if (hits.length) {
  console.error("Похоже, в файлах есть секреты. Их нельзя коммитить, репо публичное:\n" + hits.join("\n"));
  process.exit(1);
}
