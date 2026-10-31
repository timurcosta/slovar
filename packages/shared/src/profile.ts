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

/** Вид боя в журнале: кампания, башня, работа над ошибками, новые слова, задание репетитора. */
export type BattleKind = "campaign" | "tower" | "err" | "new" | "task";

/**
 * Ответ в журнале боя: [слово, код]. Код 0 — ошибка (или время вышло), 1 — верно выбором буквы,
 * 2 — верно вписал слово целиком.
 */
export type LogAnswer = [string, 0 | 1 | 2];

/**
 * Один бой (один босс) в журнале `Profile.hist`. Ключи короткие: профиль целиком ходит на сервер
 * и лежит там одной строкой. Пишется в конце боя: победа, поражение, выход или лимит дня.
 */
export interface BattleLog {
  /** Начало боя, мс (Date.now()). */
  t: number;
  /** Секунд в бою (как секунды дня для лимитов: только пока идёт бой и игра на экране). */
  s: number;
  /** Вид боя. */
  k: BattleKind;
  /** Режим ответа боя: выбор, ввод, «по росту». */
  m: "pick" | "type" | "grow";
  /** Имя босса; у задания — название задания. */
  b: string;
  /** Этаж башни. */
  f?: number;
  /** 1 — победа, 0 — поражение или вышел. */
  w: 0 | 1;
  /** Ответы по порядку, не больше LOG_ANSWERS (progress/history.ts). */
  a: LogAnswer[];
  /** Слова, которые стали выученными в этом бою (isLearned стало истинным). Пусто — поля нет. */
  l?: string[];
}

/** Итог дня в `Profile.dlog`: сумма боёв журнала за день. */
export interface DayLog {
  /** Секунд в боях. */
  s: number;
  /** Верных ответов. */
  r: number;
  /** Ошибок. */
  x: number;
  /** Боёв. */
  n: number;
  /** Верно вписанных целиком. */
  t: number;
  /** Слов выучено. */
  l: number;
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
  /** Журнал последних боёв (до HIST_MAX, старые выкидываются), новые в конце. */
  hist?: BattleLog[];
  /** Итоги по дням «ГГГГ-ММ-ДД» за последние DLOG_DAYS дней. */
  dlog?: Record<string, DayLog>;
  /** Версия раскладки боссов кампании. */
  rv: number;
  /** Версия формулы опыта. */
  xpv: number;
}

/**
 * Статистика одного слова. Поля кроме right/wrong появились в октябре 2026 и необязательны:
 * у старых сохранений их нет, тогда «выучено» считается по right (isLearned в content/rules.ts).
 */
export interface WordStat {
  right: number;
  wrong: number;
  /** Время последнего ответа, мс (Date.now()). */
  last?: number;
  /** Верных подряд; ошибка обнуляет. */
  streak?: number;
  /** Сколько раз верно вписал слово целиком (режим «Пишу сам»). */
  typed?: number;
  /** Время последней ошибки, мс. */
  lastWrong?: number;
  /** Последняя ошибка — при вписывании слова целиком (режим «по росту»: после неё слово один раз выбором). */
  missTyped?: boolean;
}

export type WordStats = Record<string, WordStat>;

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
  /** Режим ответа от репетитора (TutorSettings.answer); нет — как выбрал ученик в play. */
  answer?: "pick" | "type" | "grow";
}

/** Содержимое кода сохранения. */
export interface SaveData {
  v: 1;
  p: Profile;
  s?: WordStats;
}
