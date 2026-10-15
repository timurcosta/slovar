// Общие помощники: $, esc, show(), toast(), даты, сердечки и монетки в HTML.
import { P } from "./profile.js";

export const $ = id => document.getElementById(id);
export const TOUCH = !!(window.matchMedia && matchMedia("(hover: none) and (pointer: coarse)").matches);
export function shuffle(a){ a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.random()*(i+1)|0; [a[i],a[j]] = [a[j],a[i]]; } return a; }
export function pick(a){ return a[Math.random()*a.length|0]; }
export const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const SCREENS = ["s-trophy","s-home","s-game","s-end","s-shop","s-awards","s-teacher","s-pin","s-name","s-story","s-save"];
export function show(id){ SCREENS.forEach(s => $(s).hidden = s !== id); window.scrollTo(0,0); }
const COIN_SVG = `<svg class="coin" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true"><rect x="2" y="0" width="4" height="8" fill="#f0a000"/><rect x="0" y="2" width="8" height="4" fill="#f0a000"/><rect x="1" y="1" width="6" height="6" fill="#f0a000"/><rect x="2" y="1" width="4" height="6" fill="#ffd84a"/><rect x="1" y="2" width="6" height="4" fill="#ffd84a"/><rect x="3" y="2" width="2" height="4" fill="#f0a000"/></svg>`;
export const coinsHTML = n => `${COIN_SVG}<span>${n}</span>`;
export function heartSVG(full){
  const px = [".XX.XX.","XXXXXXX","XXXXXXX",".XXXXX.","..XXX..","...X..."];
  let r = ""; px.forEach((row,y) => [...row].forEach((c,x) => { if (c === "X") r += `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`; }));
  return `<svg viewBox="0 0 7 6" fill="${full ? "var(--pen)" : "var(--grid)"}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
export function replay(el, cls){ el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
export const defeatedWord = b => b.f ? "повержена" : "повержен";
const pad = n => String(n).padStart(2, "0");
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const today = () => dayKey(new Date());
export const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };
export function toast(text, kind=""){
  const t = document.createElement("div"); t.className = "toast " + kind; t.textContent = text;
  $("toasts").appendChild(t); setTimeout(() => t.remove(), 3300);
  while ($("toasts").children.length > 3) $("toasts").firstChild.remove();
}
export const towerOpen = () => P.beaten.includes(5);
