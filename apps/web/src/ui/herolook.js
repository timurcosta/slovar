// Внешность героя для рисовалки берётся из профиля игрока (в кабинете её передают явно).
import { heroLook } from "../state/profile.ts";
import { setLookSource } from "../render/hero.js";

setLookSource(heroLook);
