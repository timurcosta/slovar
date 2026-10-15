// Хранилище в YDB (Yandex Cloud, serverless). Ученик целиком лежит JSON-строкой, как в SQLite:
// данных мало (один репетитор), а схема профиля меняется вместе с игрой.
import { Driver } from "@ydbjs/core";
import type { CredentialsProvider } from "@ydbjs/auth";
import { identifier, query } from "@ydbjs/query";
import { Int64, Text } from "@ydbjs/value/primitive";
import type { Store, StudentRecord } from "./types.ts";

type DataRow = { data: string };

export class YdbStore implements Store {
  readonly driver: Driver;
  private sql: ReturnType<typeof query>;
  private t: ReturnType<typeof identifier>;

  /**
   * @param connectionString grpcs://ydb.serverless.yandexcloud.net:2135/?database=/ru-central1/…
   * @param table имя таблицы (в тестах — отдельная)
   */
  constructor(connectionString: string, credentialsProvider: CredentialsProvider, table = "students") {
    this.driver = new Driver(connectionString, { credentialsProvider, "ydb.sdk.enable_discovery": false });
    this.sql = query(this.driver);
    this.t = identifier(table);
  }

  /** Создаёт таблицу, если её нет. Вызывается при развёртывании, не на каждый запрос. */
  async ensureSchema() {
    await this.driver.ready();
    await this.sql`CREATE TABLE IF NOT EXISTS ${this.t} (
      id Utf8 NOT NULL,
      code Utf8 NOT NULL,
      rev Int64 NOT NULL,
      data Utf8 NOT NULL,
      PRIMARY KEY (id)
    )`;
  }

  async listStudents() {
    const [rows] = await this.sql<[DataRow]>`SELECT data FROM ${this.t}`.idempotent(true);
    return rows.map((r) => JSON.parse(r.data) as StudentRecord);
  }

  async getStudent(id: string) {
    const [rows] = await this.sql<[DataRow]>`SELECT data FROM ${this.t} WHERE id = ${new Text(id)}`.idempotent(true);
    return rows[0] ? (JSON.parse(rows[0].data) as StudentRecord) : null;
  }

  async findByCode(code: string) {
    // учеников единицы, поэтому без вторичного индекса
    const [rows] = await this.sql<
      [DataRow]
    >`SELECT data FROM ${this.t} WHERE code = ${new Text(code)} LIMIT 1`.idempotent(true);
    return rows[0] ? (JSON.parse(rows[0].data) as StudentRecord) : null;
  }

  private values(rec: StudentRecord) {
    return [new Text(rec.id), new Text(rec.code), new Int64(BigInt(rec.rev)), new Text(JSON.stringify(rec))] as const;
  }

  async createStudent(rec: StudentRecord) {
    const [id, code, rev, data] = this.values(rec);
    await this.sql`INSERT INTO ${this.t} (id, code, rev, data) VALUES (${id}, ${code}, ${rev}, ${data})`;
  }

  async putStudent(rec: StudentRecord, expectedRev?: number) {
    const [id, code, rev, data] = this.values(rec);
    return this.sql.begin(async (tx) => {
      const [rows] = await tx<[{ rev: bigint }]>`SELECT rev FROM ${this.t} WHERE id = ${id}`;
      if (!rows[0]) return false;
      if (expectedRev !== undefined && Number(rows[0].rev) !== expectedRev) return false;
      await tx`UPSERT INTO ${this.t} (id, code, rev, data) VALUES (${id}, ${code}, ${rev}, ${data})`;
      return true;
    });
  }

  async deleteStudent(id: string) {
    const key = new Text(id);
    return this.sql.begin(async (tx) => {
      const [rows] = await tx<[{ id: string }[]]>`SELECT id FROM ${this.t} WHERE id = ${key}`;
      if (!rows[0]) return false;
      await tx`DELETE FROM ${this.t} WHERE id = ${key}`;
      return true;
    });
  }

  /** Только для тестов. */
  async _clear() {
    await this.sql`DELETE FROM ${this.t}`;
  }

  async _drop() {
    await this.sql`DROP TABLE ${this.t}`;
  }
}
