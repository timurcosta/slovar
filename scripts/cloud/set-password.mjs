// Задать пароль кабинета репетитора: спрашивает пароль (ввод скрыт) и сохраняет в .env только его хэш.
//   npm run cloud:password
// После этого: npm run cloud:deploy
import readline from "readline";
import { hashPassword } from "../../apps/api/src/auth.ts";
import { ENV_FILE, writeEnv } from "./env.mjs";

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => rl.output.write(s.includes(question) ? s : s.replace(/[^\r\n]/g, "•"));
    rl.question(question, (a) => {
      rl.close();
      process.stdout.write("\n");
      resolve(a);
    });
  });
}

const p1 = await ask("Пароль для кабинета учителя: ");
if (p1.length < 8) {
  console.error("Нужно хотя бы 8 символов.");
  process.exit(1);
}
const p2 = await ask("Ещё раз: ");
if (p1 !== p2) {
  console.error("Пароли не совпали.");
  process.exit(1);
}
writeEnv({ TUTOR_PASSWORD_HASH: hashPassword(p1) });
console.log(`Готово: хэш пароля сохранён в ${ENV_FILE}. Теперь запусти npm run cloud:deploy`);
