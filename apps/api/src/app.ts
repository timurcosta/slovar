// HTTP API на Hono. Не знает, где запущен (компьютер, Yandex Cloud Functions) и какая база под ним.
import { randomUUID } from "node:crypto";
import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import type {
  ChangePasswordRequest,
  CreateStudentRequest,
  JoinRequest,
  JoinResponse,
  LoginRequest,
  MeResponse,
  ProgressRequest,
  Student,
  TokenResponse,
  TutorMeResponse,
  TutorSettings,
  UpdateStudentRequest,
} from "@repetitor/shared";
import {
  checkPassword,
  hashPassword,
  newCode,
  normalizeCode,
  signToken,
  verifyToken,
  type TokenPayload,
} from "./auth.ts";
import type { Store, StudentRecord } from "./store/types.ts";

export interface AppConfig {
  store: Store;
  /** Секрет для подписи токенов. */
  secret: string;
  /**
   * Хэш пароля администратора (владелец: отладка, первый вход учителя). Учитель задаёт себе свой пароль
   * в кабинете — его хэш лежит в базе (Store.getTutor), а этот продолжает работать.
   */
  tutorPasswordHash: string;
  now?: () => Date;
}

type Env = { Variables: { auth: TokenPayload } };

const TUTOR_TTL = 30 * 24 * 3600 * 1000;
const WORD_MODES = ["auto", "a", "ab", "b", "custom"];
const LIM_KEYS = ["min", "fresh", "correct", "battles", "mistakes"];

const bad = (c: Context, error: string, status: 400 | 401 | 403 | 404 | 409 | 429 = 400) => c.json({ error }, status);

const toStudent = ({ codeVersion: _cv, ...s }: StudentRecord): Student => s;

function cleanName(v: unknown): string | null {
  const s = String(v ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30);
  return s || null;
}

function cleanSettings(v: unknown): TutorSettings | null {
  if (!v || typeof v !== "object") return null;
  const s = v as Record<string, unknown>,
    out: TutorSettings = {};
  if (s.words !== undefined && s.words !== null && s.words !== "") {
    if (!WORD_MODES.includes(String(s.words))) return null;
    out.words = String(s.words);
  }
  if (typeof s.customWords === "string") out.customWords = s.customWords.slice(0, 20000);
  if (s.lim && typeof s.lim === "object") {
    out.lim = {};
    for (const k of LIM_KEYS) {
      const n = Math.floor(Number((s.lim as Record<string, unknown>)[k]) || 0);
      out.lim[k] = Math.max(0, Math.min(2000, n));
    }
  }
  return out;
}

// тот же минимум, что проверяет игра при загрузке кода сохранения
const looksLikeProgress = (b: Partial<ProgressRequest>) =>
  !!b.profile &&
  typeof b.profile === "object" &&
  typeof b.profile.xp === "number" &&
  Array.isArray(b.profile.beaten) &&
  !!b.stats &&
  typeof b.stats === "object" &&
  typeof b.baseRev === "number";

export function createApp(cfg: AppConfig) {
  const { store, secret } = cfg;
  const now = cfg.now ?? (() => new Date());
  const app = new Hono<Env>().basePath("/api");

  app.use("*", bodyLimit({ maxSize: 512 * 1024, onError: (c) => bad(c, "too large", 400) }));
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: "server error" }, 500);
  });

  const readJson = async <T>(c: Context): Promise<Partial<T> | null> => {
    try {
      const v = await c.req.json();
      return v && typeof v === "object" ? v : null;
    } catch {
      return null;
    }
  };

  const auth =
    (role: TokenPayload["role"]) =>
    async (c: Context<Env>, next: () => Promise<void>): Promise<Response | void> => {
      const token = (c.req.header("authorization") || "").replace(/^Bearer\s+/i, "");
      const p = token ? verifyToken(token, secret, now().getTime()) : null;
      if (!p || p.role !== role) return bad(c, "unauthorized", 401);
      c.set("auth", p);
      await next();
    };

  app.get("/health", (c) => c.json({ ok: true }));

  // ---------- репетитор ----------

  // простая защита от перебора пароля (в пределах одного экземпляра сервера)
  let fails = 0,
    lockedUntil = 0;
  const failed = () => {
    if (++fails >= 5) {
      fails = 0;
      lockedUntil = now().getTime() + 60_000;
    }
  };
  /** Чей это пароль: учителя (из базы) или администратора (из настроек сервера). */
  async function whoseIs(password: unknown): Promise<"admin" | "tutor" | null> {
    if (typeof password !== "string" || !password) return null;
    // база недоступна — администратор всё равно должен войти
    const tutor = await store.getTutor().catch((e) => (console.error(e), null));
    if (tutor && checkPassword(password, tutor.passwordHash)) return "tutor";
    return checkPassword(password, cfg.tutorPasswordHash) ? "admin" : null;
  }

  app.post("/tutor/login", async (c) => {
    if (now().getTime() < lockedUntil) return bad(c, "too many attempts", 429);
    const b = await readJson<LoginRequest>(c);
    const who = await whoseIs(b?.password);
    if (!who) {
      failed();
      return bad(c, "wrong password", 401);
    }
    fails = 0;
    const res: TokenResponse = {
      token: signToken({ role: "tutor", who, exp: now().getTime() + TUTOR_TTL }, secret),
    };
    return c.json(res);
  });

  app.use("/tutor/students/*", auth("tutor"));
  app.use("/tutor/students", auth("tutor"));
  app.use("/tutor/me", auth("tutor"));
  app.use("/tutor/password", auth("tutor"));

  app.get("/tutor/me", async (c) => {
    const p = c.get("auth");
    const tutor = await store.getTutor().catch(() => null);
    const res: TutorMeResponse = {
      who: p.role === "tutor" && p.who === "tutor" ? "tutor" : "admin",
      tutorPasswordAt: tutor?.updatedAt ?? null,
    };
    return c.json(res);
  });

  // свой пароль учителя: первый раз учитель входит паролем администратора и задаёт себе свой
  app.post("/tutor/password", async (c) => {
    if (now().getTime() < lockedUntil) return bad(c, "too many attempts", 429);
    const b = await readJson<ChangePasswordRequest>(c);
    if (!(await whoseIs(b?.current))) {
      failed();
      return bad(c, "wrong password", 403);
    }
    const next = typeof b?.next === "string" ? b.next : "";
    if (next.length < 8 || next.length > 200) return bad(c, "password must be 8..200 chars");
    await store.putTutor({ passwordHash: hashPassword(next), updatedAt: now().toISOString() });
    return c.body(null, 204);
  });

  app.get("/tutor/students", async (c) => {
    const list = (await store.listStudents()).map(toStudent);
    list.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    return c.json(list);
  });

  async function uniqueCode(): Promise<string> {
    for (;;) {
      const code = newCode();
      if (!(await store.findByCode(code))) return code;
    }
  }

  app.post("/tutor/students", async (c) => {
    const b = await readJson<CreateStudentRequest>(c);
    const name = cleanName(b?.name);
    if (!name) return bad(c, "name required");
    const t = now().toISOString();
    const rec: StudentRecord = {
      id: randomUUID(),
      name,
      code: await uniqueCode(),
      codeVersion: 1,
      settings: {},
      profile: null,
      stats: null,
      rev: 0,
      createdAt: t,
      updatedAt: t,
      lastSeenAt: null,
    };
    await store.createStudent(rec);
    return c.json(toStudent(rec), 201);
  });

  app.get("/tutor/students/:id", async (c) => {
    const rec = await store.getStudent(c.req.param("id"));
    return rec ? c.json(toStudent(rec)) : bad(c, "not found", 404);
  });

  app.patch("/tutor/students/:id", async (c) => {
    const rec = await store.getStudent(c.req.param("id"));
    if (!rec) return bad(c, "not found", 404);
    const b = await readJson<UpdateStudentRequest>(c);
    if (!b) return bad(c, "bad request");
    if (b.name !== undefined) {
      const name = cleanName(b.name);
      if (!name) return bad(c, "name required");
      rec.name = name;
    }
    if (b.settings !== undefined) {
      const s = cleanSettings(b.settings);
      if (!s) return bad(c, "bad settings");
      rec.settings = s;
    }
    rec.updatedAt = now().toISOString();
    await store.putStudent(rec);
    return c.json(toStudent(rec));
  });

  app.post("/tutor/students/:id/code", async (c) => {
    const rec = await store.getStudent(c.req.param("id"));
    if (!rec) return bad(c, "not found", 404);
    rec.code = await uniqueCode();
    rec.codeVersion++;
    rec.updatedAt = now().toISOString();
    await store.putStudent(rec);
    return c.json(toStudent(rec));
  });

  app.delete("/tutor/students/:id", async (c) =>
    (await store.deleteStudent(c.req.param("id"))) ? c.body(null, 204) : bad(c, "not found", 404),
  );

  // ---------- ученик ----------

  app.post("/join", async (c) => {
    const b = await readJson<JoinRequest>(c);
    const code = normalizeCode(String(b?.code ?? ""));
    const rec = code ? await store.findByCode(code) : null;
    if (!rec) return bad(c, "wrong code", 404);
    const res: JoinResponse = {
      token: signToken({ role: "student", sid: rec.id, cv: rec.codeVersion }, secret),
      name: rec.name,
    };
    return c.json(res);
  });

  app.use("/me", auth("student"));
  app.use("/me/*", auth("student"));

  /** Ученик по токену; токен старого кода не подходит. */
  async function me(c: Context<Env>): Promise<StudentRecord | null> {
    const p = c.get("auth");
    if (p.role !== "student") return null;
    const rec = await store.getStudent(p.sid);
    return rec && rec.codeVersion === p.cv ? rec : null;
  }
  const meResponse = (r: StudentRecord): MeResponse => ({
    name: r.name,
    settings: r.settings,
    profile: r.profile,
    stats: r.stats,
    rev: r.rev,
  });

  app.get("/me", async (c) => {
    const rec = await me(c);
    return rec ? c.json(meResponse(rec)) : bad(c, "unauthorized", 401);
  });

  app.put("/me/progress", async (c) => {
    const rec = await me(c);
    if (!rec) return bad(c, "unauthorized", 401);
    const b = await readJson<ProgressRequest>(c);
    if (!b || !looksLikeProgress(b)) return bad(c, "bad progress");
    if (b.baseRev !== rec.rev) return c.json(meResponse(rec), 409);
    const t = now().toISOString();
    const next: StudentRecord = {
      ...rec,
      profile: b.profile!,
      stats: b.stats!,
      rev: rec.rev + 1,
      updatedAt: t,
      lastSeenAt: t,
    };
    // кто-то успел записать между чтением и записью — пусть клиент перечитает
    if (!(await store.putStudent(next, rec.rev))) {
      const fresh = await store.getStudent(rec.id);
      return fresh ? c.json(meResponse(fresh), 409) : bad(c, "unauthorized", 401);
    }
    return c.json({ rev: next.rev });
  });

  return app;
}
