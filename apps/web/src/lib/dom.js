// DOM-помощники без знаний об игре.

export const $ = (id) => document.getElementById(id);
export const TOUCH = !!(window.matchMedia && matchMedia("(hover: none) and (pointer: coarse)").matches);
/** iPhone и iPad (новые iPad представляются Mac с сенсорным экраном). */
export const IOS =
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
export const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export function replay(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}
