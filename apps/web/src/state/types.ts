// Типы сохраняемых данных. Это контракт формата сохранений: его же будет использовать бэкенд.
// Поле добавляй необязательным или с миграцией (см. migrations.ts), иначе старые сохранения сломаются.

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
