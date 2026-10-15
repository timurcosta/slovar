// Экран кода сохранения: показать, скопировать, загрузить.
import { $ } from "../../lib/dom.js";
import { P } from "../../state/profile.js";
import { LS } from "../../state/storage.js";
import { packSave, unpackSave } from "../../state/savecode.js";
import { levelOf } from "../../progress/levels.js";
import { show } from "../screens.js";
import { renderHome } from "./home.js";
import { askName } from "./intro.js";

let saveBack = "s-home",
  loadArm = null;
async function openSave(back) {
  saveBack = back;
  loadArm = null;
  $("save-copy-msg").textContent = "";
  $("load-msg").textContent = "";
  $("load-msg").className = "msg";
  $("load-code").value = "";
  $("btn-load-code").textContent = "Загрузить";
  const hasProgress = !!P.name;
  $("save-code").value = hasProgress ? "..." : "";
  $("save-code").hidden = !hasProgress;
  $("btn-save-copy").parentElement.hidden = !hasProgress;
  $("btn-save-share").hidden = !navigator.share;
  show("s-save");
  if (hasProgress) {
    try {
      $("save-code").value = await packSave();
    } catch (e) {
      $("save-code").value = "Не получилось сделать код";
    }
  }
}
$("btn-save").onclick = () => openSave("s-home");
$("btn-name-load").onclick = () => openSave("s-name");
$("btn-save-back").onclick = () => {
  if (saveBack === "s-name" && !P.name) askName();
  else {
    renderHome();
    show("s-home");
  }
};
$("save-code").onfocus = (e) => e.target.select();
$("btn-save-copy").onclick = async () => {
  const v = $("save-code").value,
    m = $("save-copy-msg");
  try {
    await navigator.clipboard.writeText(v);
    m.className = "msg okm";
    m.textContent = "Скопировано! Сохрани код где-нибудь, например в Telegram.";
  } catch (e) {
    const t = $("save-code");
    t.focus();
    t.select();
    try {
      document.execCommand("copy");
      m.className = "msg okm";
      m.textContent = "Скопировано!";
    } catch (err) {
      m.className = "msg";
      m.textContent = "Выдели код и скопируй вручную.";
    }
  }
};
$("btn-save-share").onclick = () => {
  navigator.share({ title: "Словарная битва: код сохранения", text: $("save-code").value }).catch(() => {});
};
$("load-code").oninput = () => {
  loadArm = null;
  $("btn-load-code").textContent = "Загрузить";
  $("load-msg").textContent = "";
};
$("btn-load-code").onclick = async () => {
  const m = $("load-msg");
  let d;
  try {
    d = await unpackSave($("load-code").value);
  } catch (e) {
    m.className = "msg err";
    m.textContent = "Код не подходит. Проверь, что он скопирован целиком.";
    loadArm = null;
    return;
  }
  const who = `${d.p.name || "Без имени"}, уровень ${levelOf(d.p.xp)}, боссов ${d.p.beaten.length}, монет ${d.p.coins || 0}`;
  if (P.name && P.xp > 0 && loadArm !== $("load-code").value) {
    loadArm = $("load-code").value;
    m.className = "msg";
    m.textContent = `В коде: ${who}. Текущий прогресс (${P.name}, уровень ${levelOf(P.xp)}) заменится. Нажми ещё раз, чтобы загрузить.`;
    $("btn-load-code").textContent = "Да, загрузить";
    return;
  }
  LS.set("sb2_profile", d.p);
  if (d.s) LS.set("sb_stats", d.s);
  m.className = "msg okm";
  m.textContent = `Загружено: ${who}. Перезапускаю...`;
  setTimeout(() => location.reload(), 700);
};
