// Локальный .env с секретами для развёртывания (он в .gitignore, в репозиторий не попадает).
import fs from "fs";
import path from "path";

export const ENV_FILE = path.resolve(import.meta.dirname, "../../.env");

export function readEnv() {
  if (!fs.existsSync(ENV_FILE)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(ENV_FILE, "utf8")
      .split("\n")
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
  );
}

export function writeEnv(vars) {
  const all = { ...readEnv(), ...vars };
  fs.writeFileSync(
    ENV_FILE,
    "# Секреты для развёртывания. Не коммитить (файл в .gitignore).\n" +
      Object.entries(all)
        .map(([k, v]) => `${k}=${v}`)
        .join("\n") +
      "\n",
    { mode: 0o600 },
  );
}
