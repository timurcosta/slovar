// Типы сохраняемых данных. Это контракт формата сохранений: его же использует сервер.
// Поле добавляй необязательным или с миграцией (apps/web/src/state/migrations.ts), иначе старые сохранения сломаются.

export type Slot = "weapon" | "armor" | "helmet" | "back" | "pet" | "aura" | "costume";
export type Equip = Record<Slot, string>;

export interface Look {
  hair: string;
  skin: string;
  eye: string;
  style: string;
}

export interface Upgrades {
  str: number;
  hp: number;
  time: number;
  gold: number;
}

export interface Totals {
  correct: number;
  typed: number;
  bosses: number;
  flawless: number;
  bought: number;
  crits: number;
  hardWins?: number;
  clutch?: number;
  errRuns?: number;
  newRuns?: number;
}

export interface DailyQuest {
  t: string;
  n: number;
  p: number;
  done: boolean;
  reward: number;
}

export interface Daily {
  date: string;
  bonus: boolean;
  q: DailyQuest[];
}

/** Счётчики сегодняшнего дня для лимитов учителя. */
export interface DayCounters {
  date: string;
  sec: number;
  fresh: number;
  correct: number;
  battles: number;
  mistakes: number;
}

/** Прогресс по заданию репетитора (само задание приходит с сервера, Task в api.ts). */
export interface TaskProgress {
  /** Название: медаль остаётся, даже если задание удалят. */
  title: string;
  /** Сердечки монстров: слово → 0..3, 0 — монстр побеждён. Нет слова — у монстра все три. */
  hp: Record<string, number>;
  /** Ошибки по словам за всё задание. */
  wrong: Record<string, number>;
  /** Верных ответов за всё задание. */
  right: number;
  /** Сколько раз выходил против Хранителя. */
  guard: number;
  /** День, когда показана записка (YYYY-MM-DD). */
  seen?: string;
  /** День последнего напоминания. */
  remind?: string;
  /** День, когда задание выполнено. */
  done?: string;
  /** Получена именная медаль. */
  medal?: number;
}

export interface Profile {
  name?: string;
  xp: number;
  coins: number;
  /** id предмета → 1, если куплен или получен. */
  owned: Record<string, number>;
  equip: Equip;
  look?: Look;
  up: Upgrades;
  /** Индекс самого дальнего открытого босса кампании (индекс в BOSSES). */
  unlocked: number;
  /** Индексы побеждённых боссов кампании. */
  beaten: number[];
  towerBest: number;
  best: number;
  bestStreak: number;
  tot: Totals;
  ach: Record<string, number>;
  troph?: Record<string, number>;
  daily: Daily | null;
  days: { last: string; streak: number; best?: number };
  day?: DayCounters | null;
  /** Лепёшка Ралины: +1 сердце навсегда. */
  lep?: number;
  /** Показать при запуске сообщение о подарках Ралины. */
  lepToast?: number;
  storySeen?: number;
  /** Задания репетитора: id задания → прогресс. */
  tasks?: Record<string, TaskProgress>;
  /** Версия раскладки боссов кампании. */
  rv: number;
  /** Версия формулы опыта. */
  xpv: number;
}

export type WordStats = Record<string, { right: number; wrong: number }>;

export interface Settings {
  timer: boolean;
  words: string;
  muted: boolean;
  play: string;
  music: boolean;
  track: string;
  musicV?: number;
  /** Устаревшее поле старых версий. */
  mode?: string;
  lim?: Record<string, number>;
}

/** Содержимое кода сохранения. */
export interface SaveData {
  v: 1;
  p: Profile;
  s?: WordStats;
}
