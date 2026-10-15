// Контракт HTTP API между игрой, кабинетом репетитора и сервером. Все пути начинаются с /api.
import type { Profile, WordStats } from "./profile.ts";

/** Что репетитор задаёт ученику. Пустые поля — ученик решает сам (как в офлайн-игре). */
export interface TutorSettings {
  /** Режим слов: auto | a | ab | b | custom. */
  words?: string;
  /** Свои слова в формате м(о)локо, по одному в строке. */
  customWords?: string;
  /** Лимиты на день: min, fresh, correct, battles, mistakes (0 — без лимита). */
  lim?: Record<string, number>;
}

/** Ученик глазами репетитора. */
export interface Student {
  id: string;
  name: string;
  /** Код входа для ученика. */
  code: string;
  settings: TutorSettings;
  profile: Profile | null;
  stats: WordStats | null;
  /** Номер версии прогресса, растёт при каждом сохранении. */
  rev: number;
  createdAt: string;
  updatedAt: string;
  /** Когда ученик последний раз присылал прогресс. */
  lastSeenAt: string | null;
}

// POST /api/tutor/login
export interface LoginRequest {
  password: string;
}
export interface TokenResponse {
  token: string;
}

// GET /api/tutor/students → Student[]
// POST /api/tutor/students
export interface CreateStudentRequest {
  name: string;
}
// PATCH /api/tutor/students/:id
export interface UpdateStudentRequest {
  name?: string;
  settings?: TutorSettings;
}
// POST /api/tutor/students/:id/code — новый код, старый и все входы по нему перестают работать
// DELETE /api/tutor/students/:id

// POST /api/join
export interface JoinRequest {
  code: string;
}
export interface JoinResponse {
  token: string;
  name: string;
}

// GET /api/me
export interface MeResponse {
  name: string;
  settings: TutorSettings;
  profile: Profile | null;
  stats: WordStats | null;
  rev: number;
}

// PUT /api/me/progress
export interface ProgressRequest {
  profile: Profile;
  stats: WordStats;
  /** rev, на котором основаны изменения. Если на сервере уже другой — 409 и актуальные данные. */
  baseRev: number;
}
export interface ProgressResponse {
  rev: number;
}
/** Тело ответа 409. */
export type ProgressConflict = MeResponse;

export interface ApiError {
  error: string;
}
