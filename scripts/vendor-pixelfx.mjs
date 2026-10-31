// Копирует нужные эффекты из pixelfx (https://github.com/patch-gg/pixelfx, MIT) в apps/web/src/vendor/pixelfx.
// Берётся закреплённый коммит, повторный запуск безопасен: папка собирается заново.
//   node scripts/vendor-pixelfx.mjs            — склонировать репо во временную папку
//   node scripts/vendor-pixelfx.mjs <клон>     — взять уже скачанный
// Новый эффект: добавь его в FX и перезапусти. Ядро (src/core) копируется целиком.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REPO = "https://github.com/patch-gg/pixelfx";
const COMMIT = "fe7103c36d94e02f2d7df7d8f7a341e493837cde";
const FX = [
  "melee/sword-slash",
  "melee/double-slash",
  "melee/spin-slash",
  "melee/heavy-cleave",
  "impacts/blunt-hit",
  "impacts/crit-hit",
  "lightning/lightning-strike",
  "arcane/mana-burst",
  "explosions/small-explosion",
  "fire/meteor",
  "fire/fireball",
  "fire/fire-breath",
  "impacts/hit-spark",
  "impacts/shield-block",
  "melee/claw-swipe",
  "lightning/zap-hit",
  "ice/snowflake-burst",
  "holy/heal-aoe",
  "projectiles/magic-missile",
  "scifi/tractor-beam",
  "water/splash",
  "nature/acid-splash",
  "pickups/chest-open",
  "pickups/collect-burst",
  "explosions/firework-burst",
  "spawn/poof",
];

const root = new URL("..", import.meta.url).pathname;
const out = join(root, "apps/web/src/vendor/pixelfx");
let src = process.argv[2];
if (!src) {
  src = mkdtempSync(join(tmpdir(), "pixelfx-"));
  execFileSync("git", ["init", "-q", src]);
  execFileSync("git", ["-C", src, "fetch", "-q", "--depth", "1", REPO, COMMIT]);
  execFileSync("git", ["-C", src, "checkout", "-q", "FETCH_HEAD"]);
}
const head = execFileSync("git", ["-C", src, "rev-parse", "HEAD"]).toString().trim();
if (head !== COMMIT) throw new Error(`в ${src} коммит ${head}, нужен ${COMMIT}`);

rmSync(out, { recursive: true, force: true });
cpSync(join(src, "src/core"), join(out, "core"), { recursive: true });
for (const f of ["LICENSE", "NOTICE.md"]) cpSync(join(src, f), join(out, f));
const cats = new Set(FX.map((f) => f.split("/")[0]));
for (const c of cats) cpSync(join(src, "src/fx", c, "_lib.js"), join(out, "fx", c, "_lib.js"));
for (const f of FX) {
  const p = join(src, "src/fx", f + ".js");
  if (!existsSync(p)) throw new Error("нет эффекта " + f);
  cpSync(p, join(out, "fx", f + ".js"));
}
writeFileSync(
  join(out, "README.md"),
  `# pixelfx (копия)

Эффекты из ${REPO}, коммит \`${COMMIT}\`, лицензия MIT (\`LICENSE\`, \`NOTICE.md\`).
Файлы не правим руками: их пересобирает \`node scripts/vendor-pixelfx.mjs\`, список эффектов — там же.
Подключение к бою — \`pfx()\` в \`battle/vfx.js\`.

${FX.map((f) => "- `" + f + "`").join("\n")}
`,
);
console.log(`pixelfx ${COMMIT.slice(0, 7)}: ядро + ${FX.length} эффектов → ${out}`);
