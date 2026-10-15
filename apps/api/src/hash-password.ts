// Хэш пароля репетитора для переменной TUTOR_PASSWORD_HASH:
//   npm run hash-password -w @repetitor/api -- 'пароль'
import { hashPassword } from "./auth.ts";

const pass = process.argv[2];
if (!pass) {
  console.error("Укажи пароль: npm run hash-password -w @repetitor/api -- 'пароль'");
  process.exit(1);
}
console.log(hashPassword(pass));
