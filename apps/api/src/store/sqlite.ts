// Хранилище в SQLite (встроено в Node): для разработки на компьютере. В облаке используется YDB.
import { DatabaseSync } from "node:sqlite";
import type { Store, StudentRecord } from "./types.ts";

interface Row {
  id: string;
  data: string;
}

export class SqliteStore implements Store {
  private db: DatabaseSync;

  constructor(file: string) {
    this.db = new DatabaseSync(file);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS students (
        id   TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        rev  INTEGER NOT NULL,
        data TEXT NOT NULL
      )`);
  }

  private parse(row: Row | undefined): StudentRecord | null {
    return row ? (JSON.parse(row.data) as StudentRecord) : null;
  }

  async listStudents() {
    const rows = this.db.prepare("SELECT id, data FROM students").all() as unknown as Row[];
    return rows.map((r) => this.parse(r)!);
  }

  async getStudent(id: string) {
    return this.parse(this.db.prepare("SELECT id, data FROM students WHERE id = ?").get(id) as Row | undefined);
  }

  async findByCode(code: string) {
    return this.parse(this.db.prepare("SELECT id, data FROM students WHERE code = ?").get(code) as Row | undefined);
  }

  async createStudent(rec: StudentRecord) {
    this.db
      .prepare("INSERT INTO students (id, code, rev, data) VALUES (?, ?, ?, ?)")
      .run(rec.id, rec.code, rec.rev, JSON.stringify(rec));
  }

  async putStudent(rec: StudentRecord, expectedRev?: number) {
    const res =
      expectedRev === undefined
        ? this.db
            .prepare("UPDATE students SET code = ?, rev = ?, data = ? WHERE id = ?")
            .run(rec.code, rec.rev, JSON.stringify(rec), rec.id)
        : this.db
            .prepare("UPDATE students SET code = ?, rev = ?, data = ? WHERE id = ? AND rev = ?")
            .run(rec.code, rec.rev, JSON.stringify(rec), rec.id, expectedRev);
    return Number(res.changes) === 1;
  }

  async deleteStudent(id: string) {
    return Number(this.db.prepare("DELETE FROM students WHERE id = ?").run(id).changes) === 1;
  }
}
