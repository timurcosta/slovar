// Журнал боёв (Profile.hist) и итоги по дням (Profile.dlog): запись в игре и расчёты для кабинета.
// Чистые функции без DOM и localStorage: их берут и бой (battle/run.js), и кабинет (tutor/history.ts).
import type { BattleKind, BattleLog, DayLog } from "@repetitor/shared";
import { addDays, dayKey } from "../lib/date.js";

/** Сколько последних боёв хранит журнал. */
export const HIST_MAX = 60;
/** Сколько последних дней хранят итоги по дням. */
export const DLOG_DAYS = 180;
/** Ответов в одной записи боя, не больше (итоги дня считаются по всем). */
export const LOG_ANSWERS = 40;

type Hist = { hist?: BattleLog[]; dlog?: Record<string, DayLog> };

export const emptyDay = (): DayLog => ({ s: 0, r: 0, x: 0, n: 0, t: 0, l: 0 });

/** Новая запись боя. Ответы и секунды копятся в ней по ходу боя (logAnswer, s++). */
export function startLog(
  t: number,
  k: BattleKind,
  m: BattleLog["m"],
  b: string,
  f?: number,
): BattleLog & { cnt: DayLog } {
  return { t, s: 0, k, m, b, ...(f ? { f } : {}), w: 0, a: [], cnt: emptyDay() };
}

/** Учесть ответ: ok — верно, typed — вписано целиком, learned — слово стало выученным на этом ответе. */
export function logAnswer(
  log: BattleLog & { cnt: DayLog },
  word: string,
  ok: boolean,
  typed: boolean,
  learned: boolean,
) {
  if (log.a.length < LOG_ANSWERS) log.a.push([word, ok ? (typed ? 2 : 1) : 0]);
  if (ok) log.cnt.r++;
  else log.cnt.x++;
  if (ok && typed) log.cnt.t++;
  if (learned) {
    log.cnt.l++;
    if (!(log.l || (log.l = [])).includes(word)) log.l.push(word);
  }
}

/**
 * Записать законченный бой: в кольцо hist (старые выкидываются) и в итог дня day (старше DLOG_DAYS
 * дней удаляются). Бой без ответов не пишется. Меняет p, возвращает true, если записал.
 */
export function writeLog(p: Hist, log: BattleLog & { cnt?: DayLog }, won: boolean, day: string): boolean {
  const { cnt, ...rest } = log;
  if (!rest.a.length) return false;
  const c = cnt || countAnswers(rest);
  const e: BattleLog = { ...rest, w: won ? 1 : 0 };
  if (!e.l?.length) delete e.l;
  const hist = (p.hist || []).concat(e);
  p.hist = hist.slice(Math.max(0, hist.length - HIST_MAX));
  const dlog = { ...(p.dlog || {}) },
    d = { ...emptyDay(), ...dlog[day] };
  d.s += e.s;
  d.r += c.r;
  d.x += c.x;
  d.n++;
  d.t += c.t;
  d.l += c.l;
  dlog[day] = d;
  const old = addDays(day, -DLOG_DAYS);
  for (const k of Object.keys(dlog)) if (k <= old) delete dlog[k];
  p.dlog = dlog;
  return true;
}

/** Счётчики по записанным ответам (если в записи нет cnt). */
export function countAnswers(log: Pick<BattleLog, "a" | "l">): DayLog {
  const c = emptyDay();
  for (const [, v] of log.a) {
    if (v) c.r++;
    else c.x++;
    if (v === 2) c.t++;
  }
  c.l = log.l?.length || 0;
  return c;
}

export interface Summary {
  /** Дней, когда играл. */
  days: number;
  sec: number;
  r: number;
  x: number;
  t: number;
  l: number;
  n: number;
}

/** Итог за n дней по today включительно. */
export function summary(dlog: Record<string, DayLog> | undefined, today: string, n = 7): Summary {
  const s: Summary = { days: 0, sec: 0, r: 0, x: 0, t: 0, l: 0, n: 0 };
  for (let i = 0; i < n; i++) {
    const d = dlog?.[addDays(today, -i)];
    if (!d || !(d.n || d.s)) continue;
    s.days++;
    s.sec += d.s;
    s.r += d.r;
    s.x += d.x;
    s.t += d.t;
    s.l += d.l;
    s.n += d.n;
  }
  return s;
}

/** Окраска клетки календаря по секундам дня: 0 — не играл, 1 — до 5 минут, 2 — до 15, 3 — больше. */
export const heat = (d: DayLog | undefined) => (!d || !(d.n || d.s) ? 0 : d.s <= 300 ? 1 : d.s <= 900 ? 2 : 3);

export interface CalCell {
  day: string;
  d?: DayLog;
  heat: number;
  /** После today: клетка пустая. */
  future: boolean;
}

/**
 * Календарь как у GitHub: weeks недель (колонки) × 7 дней (пн..вс), последняя неделя — с today.
 * Возвращает колонки по порядку от старой к новой.
 */
export function calendar(dlog: Record<string, DayLog> | undefined, today: string, weeks = 12): CalCell[][] {
  const [y, m, dd] = today.split("-").map(Number),
    wd = (new Date(y, m - 1, dd).getDay() + 6) % 7; // 0 — понедельник
  const start = addDays(today, -wd - (weeks - 1) * 7);
  const cols: CalCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: CalCell[] = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(start, w * 7 + i),
        d = dlog?.[day];
      col.push({ day, d, heat: heat(d), future: day > today });
    }
    cols.push(col);
  }
  return cols;
}

export interface HistDay {
  day: string;
  logs: BattleLog[];
  sum: DayLog;
}

/** Бои журнала по дням (местное время), новые дни и бои сверху. Бои без ответов пропускаются. */
export function byDay(hist: BattleLog[] | undefined): HistDay[] {
  const out: HistDay[] = [];
  for (const e of (hist || []).slice().sort((a, b) => b.t - a.t)) {
    if (!e.a?.length) continue;
    const day = dayKey(new Date(e.t));
    let g = out[out.length - 1];
    if (!g || g.day !== day) out.push((g = { day, logs: [], sum: emptyDay() }));
    g.logs.push(e);
    const c = countAnswers(e);
    g.sum.s += e.s || 0;
    g.sum.r += c.r;
    g.sum.x += c.x;
    g.sum.t += c.t;
    g.sum.l += c.l;
    g.sum.n++;
  }
  return out;
}

/** Слова с ошибками в бою: слово → сколько раз ошибся, по порядку первой ошибки. */
export function missesOf(e: Pick<BattleLog, "a">): [string, number][] {
  const m = new Map<string, number>();
  for (const [w, v] of e.a) if (!v) m.set(w, (m.get(w) || 0) + 1);
  return [...m];
}
