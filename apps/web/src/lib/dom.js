// DOM-помощники без знаний об игре.

export const $ = (id) => document.getElementById(id);
export const TOUCH = !!(window.matchMedia && matchMedia("(hover: none) and (pointer: coarse)").matches);
export const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export function replay(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}
