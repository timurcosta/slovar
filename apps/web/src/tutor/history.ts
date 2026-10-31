// Вкладка «История» (#/s/:id/history): календарь занятий за 12 недель, итог недели и бои по дням.
// Данные — Profile.dlog (итоги дней) и Profile.hist (последние бои), расчёты в progress/history.ts.
import type { BattleLog, DayLog, Student } from "@repetitor/shared";
import { esc } from "../lib/dom.js";
import { today } from "../lib/date.js";
import { byDay, calendar, missesOf, summary } from "../progress/history.ts";
import { plural } from "./common.ts";

const MODE: Record<BattleLog["m"], string> = { pick: "выбор", type: "ввод", grow: "по росту" };
const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const WEEKDAYS = ["пн", "", "ср", "", "пт", "", ""];

export const minutes = (sec: number) => Math.round(sec / 60);
const minText = (sec: number) => (sec > 0 && sec < 60 ? "меньше минуты" : `${minutes(sec)} мин`);
const dayDate = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Вид боя по-русски: «Кампания: Клякса», «Башня: 12 этаж», «Работа над ошибками»… */
export function kindText(e: BattleLog): string {
  if (e.k === "tower") return e.f ? `Башня: ${e.f} этаж` : "Башня";
  if (e.k === "err") return "Работа над ошибками";
  if (e.k === "new") return "Новые слова";
  if (e.k === "task") return `Задание: ${e.b}`;
  return `Кампания: ${e.b}`;
}

/** Строка дня: «Сегодня, 15 октября», «Вчера, …», «понедельник, 12 октября». */
export function dayTitle(key: string, now = today()): string {
  const d = dayDate(key),
    date = d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  const n = Math.round((dayDate(now).getTime() - d.getTime()) / 86400000);
  if (n === 0) return `Сегодня, ${date}`;
  if (n === 1) return `Вчера, ${date}`;
  return `${d.toLocaleDateString("ru-RU", { weekday: "long" })}, ${date}`;
}

const dayTotals = (d: DayLog) =>
  `${minText(d.s)} · ${d.n} ${plural(d.n, ["бой", "боя", "боёв"])} · верно ${d.r} · ошибок ${d.x}${d.l ? ` · выучено ${d.l}` : ""}`;

/** Короткая строка для обзора: «За 7 дней: 3 дня, 25 минут». */
export function weekLine(s: Student): string {
  const w = summary(s.profile?.dlog, today());
  if (!w.days) return "За 7 дней не играл(а).";
  return `За 7 дней: ${w.days} ${plural(w.days, ["день", "дня", "дней"])}, ${minutes(w.sec)} ${plural(minutes(w.sec), ["минута", "минуты", "минут"])}.`;
}

/** Сколько дней играл за последние 7 (список учеников). */
export const weekDays = (s: Student) => summary(s.profile?.dlog, today()).days;

function calendarHTML(dlog: Record<string, DayLog> | undefined, now: string): string {
  const cols = calendar(dlog, now);
  // подпись месяца — над первой неделей месяца; у первой колонки, только если месяц в ней не кончается
  const monthOf = (c: { day: string }[]) => dayDate(c[c.length - 1].day).getMonth();
  const months = cols
    .map((c, i) => {
      const m = monthOf(c),
        show = i === 0 ? cols.length > 1 && monthOf(cols[1]) === m : monthOf(cols[i - 1]) !== m;
      return `<span>${show ? MONTHS[m] : ""}</span>`;
    })
    .join("");
  const cells = cols
    .map((c) =>
      c
        .map((x) => {
          if (x.future) return `<i class="hc future"></i>`;
          const date = dayDate(x.day).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
          const tip =
            x.d && x.heat ? `${date}: ${minText(x.d.s)}, верно ${x.d.r}, ошибок ${x.d.x}` : `${date}: не играл(а)`;
          return `<i class="hc h${x.heat}${x.day === now ? " now" : ""}" title="${esc(tip)}"></i>`;
        })
        .join(""),
    )
    .join("");
  return `<div class="hcal" aria-label="Календарь занятий за 12 недель">
      <div class="hcal-m">${months}</div>
      <div class="hcal-d">${WEEKDAYS.map((w) => `<span>${w}</span>`).join("")}</div>
      <div class="hcal-g">${cells}</div>
    </div>
    <div class="hlegend"><span>не играл(а)</span><i class="hc h0"></i><i class="hc h1"></i><i class="hc h2"></i><i class="hc h3"></i><span>больше 15 мин</span></div>`;
}

function battleHTML(e: BattleLog): string {
  const time = new Date(e.t).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const right = e.a.filter(([, v]) => v).length,
    miss = missesOf(e),
    learned = e.l || [];
  const words = [
    ...miss.map(([w, n]) => `<span class="hword bad">${esc(w)}${n > 1 ? ` ×${n}` : ""}</span>`),
    ...learned.map((w) => `<span class="hword good">${esc(w)} <small>выучил(а)</small></span>`),
  ];
  return `<li class="hb">
      <div class="hb-head"><b>${esc(time)}</b> <span>${esc(kindText(e))}</span>
        <span class="hb-res ${e.w ? "win" : "lose"}">${e.w ? "победа" : "без победы"}</span></div>
      <div class="hb-sub">${MODE[e.m] || e.m} · ${minText(e.s)} · верно ${right} · ошибок ${e.a.length - right}</div>
      <div class="hb-words">${miss.length ? "" : `<span class="hword ok">без ошибок</span>`}${words.join("")}</div>
    </li>`;
}

export function renderHistoryTab(root: HTMLElement, s: Student) {
  const p = s.profile;
  if (!p) {
    root.innerHTML = `<div class="panel"><p class="note">Ученик ещё не входил(а) в игру по коду.</p></div>`;
    return;
  }
  const now = today(),
    w = summary(p.dlog, now),
    days = byDay(p.hist);
  root.innerHTML = `
    <div class="panel">
      <h2>Календарь занятий</h2>
      ${calendarHTML(p.dlog, now)}
      <h2>За 7 дней</h2>
      <div class="stats hstats">${[
        ["Дней", w.days],
        ["Минут", minutes(w.sec)],
        ["Верных", w.r],
        ["Ошибок", w.x],
        ["Вписал(а)", w.t],
        ["Выучено", w.l],
      ]
        .map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`)
        .join("")}</div>
    </div>
    <div class="panel">
      <h2>Бои</h2>
      ${
        days.length
          ? `<p class="note">Последние бои, новые сверху. Красным — слова с ошибками, зелёным — выученные в этом бою.</p>
            ${days
              .map(
                (d) => `<section class="hday">
                  <h3>${esc(dayTitle(d.day, now))} <small>${esc(dayTotals(p.dlog?.[d.day] || d.sum))}</small></h3>
                  <ul class="hlist">${d.logs.map(battleHTML).join("")}</ul>
                </section>`,
              )
              .join("")}`
          : `<p class="note">Боёв пока нет. История появится после первого боя в новой версии игры.</p>`
      }
    </div>`;
}
