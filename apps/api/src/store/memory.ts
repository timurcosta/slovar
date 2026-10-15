// Хранилище в памяти: для тестов и e2e-проверки.
import type { Store, StudentRecord } from "./types.ts";

const clone = <T>(v: T): T => structuredClone(v);

export class MemoryStore implements Store {
  private rows = new Map<string, StudentRecord>();

  async listStudents() {
    return [...this.rows.values()].map(clone);
  }

  async getStudent(id: string) {
    const r = this.rows.get(id);
    return r ? clone(r) : null;
  }

  async findByCode(code: string) {
    for (const r of this.rows.values()) if (r.code === code) return clone(r);
    return null;
  }

  async createStudent(rec: StudentRecord) {
    if (this.rows.has(rec.id)) throw new Error("exists");
    this.rows.set(rec.id, clone(rec));
  }

  async putStudent(rec: StudentRecord, expectedRev?: number) {
    const cur = this.rows.get(rec.id);
    if (!cur) return false;
    if (expectedRev !== undefined && cur.rev !== expectedRev) return false;
    this.rows.set(rec.id, clone(rec));
    return true;
  }

  async deleteStudent(id: string) {
    return this.rows.delete(id);
  }
}
