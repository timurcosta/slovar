// Хранилище учеников. Сервер работает только через этот интерфейс, поэтому базу можно менять:
// память (тесты), SQLite (разработка на компьютере), YDB (Yandex Cloud).
import type { Profile, TutorSettings, WordStats } from "@repetitor/shared";

export interface StudentRecord {
  id: string;
  name: string;
  code: string;
  /** Растёт при смене кода: старые токены ученика перестают действовать. */
  codeVersion: number;
  settings: TutorSettings;
  profile: Profile | null;
  stats: WordStats | null;
  rev: number;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
}

/** Учётка учителя: свой пароль, который он задаёт в кабинете. Пароль администратора — в настройках сервера. */
export interface TutorRecord {
  passwordHash: string;
  updatedAt: string;
}

export interface Store {
  listStudents(): Promise<StudentRecord[]>;
  getStudent(id: string): Promise<StudentRecord | null>;
  findByCode(code: string): Promise<StudentRecord | null>;
  createStudent(rec: StudentRecord): Promise<void>;
  /** Записывает ученика целиком. С expectedRev пишет, только если rev в базе совпадает, иначе возвращает false. */
  putStudent(rec: StudentRecord, expectedRev?: number): Promise<boolean>;
  deleteStudent(id: string): Promise<boolean>;
  getTutor(): Promise<TutorRecord | null>;
  putTutor(rec: TutorRecord): Promise<void>;
}
