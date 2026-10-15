// Всплывающие уведомления.
import { $ } from "../lib/dom.js";

export function toast(text, kind = "") {
  const t = document.createElement("div");
  t.className = "toast " + kind;
  t.textContent = text;
  $("toasts").appendChild(t);
  setTimeout(() => t.remove(), 3300);
  while ($("toasts").children.length > 3) $("toasts").firstChild.remove();
}
