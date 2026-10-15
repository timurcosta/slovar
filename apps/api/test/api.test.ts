import { afterEach, describe, expect, it } from "vitest";
import type { MeResponse, Profile, Student } from "@repetitor/shared";
import { createApp } from "../src/app.ts";
import { hashPassword } from "../src/auth.ts";
import { MemoryStore } from "../src/store/memory.ts";
import { SqliteStore } from "../src/store/sqlite.ts";
import type { Store } from "../src/store/types.ts";

const HASH = hashPassword("secret");
const profile = (xp: number) => ({ xp, beaten: [0], coins: 1 }) as unknown as Profile;

for (const [kind, makeStore] of [
  ["memory", () => new MemoryStore()],
  ["sqlite", () => new SqliteStore(":memory:")],
] as [string, () => Store][]) {
  describe(`API (${kind})`, () => {
    let clock = Date.parse("2026-10-15T10:00:00Z");
    afterEach(() => (clock = Date.parse("2026-10-15T10:00:00Z")));

    function setup() {
      const app = createApp({ store: makeStore(), secret: "s", tutorPasswordHash: HASH, now: () => new Date(clock) });
      const call = async (method: string, path: string, body?: unknown, token?: string) => {
        const res = await app.request(`/api${path}`, {
          method,
          headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const text = await res.text();
        return { status: res.status, body: text ? JSON.parse(text) : null };
      };
      const tutor = async () => (await call("POST", "/tutor/login", { password: "secret" })).body.token as string;
      return { call, tutor };
    }

    it("пускает репетитора только с верным паролем", async () => {
      const { call } = setup();
      expect((await call("POST", "/tutor/login", { password: "nope" })).status).toBe(401);
      expect((await call("GET", "/tutor/students")).status).toBe(401);
      expect((await call("POST", "/tutor/login", { password: "secret" })).status).toBe(200);
    });

    it("блокирует перебор пароля на минуту", async () => {
      const { call } = setup();
      for (let i = 0; i < 5; i++) await call("POST", "/tutor/login", { password: "x" });
      expect((await call("POST", "/tutor/login", { password: "secret" })).status).toBe(429);
      clock += 61_000;
      expect((await call("POST", "/tutor/login", { password: "secret" })).status).toBe(200);
    });

    it("токен репетитора истекает через 30 дней", async () => {
      const { call, tutor } = setup();
      const t = await tutor();
      clock += 31 * 24 * 3600 * 1000;
      expect((await call("GET", "/tutor/students", undefined, t)).status).toBe(401);
    });

    it("ученик входит по коду, сохраняет и читает прогресс", async () => {
      const { call, tutor } = setup();
      const t = await tutor();
      const st = (await call("POST", "/tutor/students", { name: "  Маша  " }, t)).body as Student;
      expect(st.name).toBe("Маша");
      expect(st.code).toMatch(/^[A-Z2-9]{6}$/);

      expect((await call("POST", "/join", { code: "WRONG1" })).status).toBe(404);
      const join = await call("POST", "/join", { code: st.code.toLowerCase().split("").join(" ") });
      expect(join.body.name).toBe("Маша");
      const k = join.body.token;

      expect((await call("GET", "/me", undefined, k)).body).toMatchObject({ name: "Маша", profile: null, rev: 0 });
      expect((await call("PUT", "/me/progress", { profile: profile(10), stats: {}, baseRev: 0 }, k)).body).toEqual({
        rev: 1,
      });
      const me = (await call("GET", "/me", undefined, k)).body as MeResponse;
      expect(me.profile?.xp).toBe(10);
      expect(me.rev).toBe(1);

      const seen = (await call("GET", `/tutor/students/${st.id}`, undefined, t)).body as Student;
      expect(seen.profile?.xp).toBe(10);
      expect(seen.lastSeenAt).toBe("2026-10-15T10:00:00.000Z");
    });

    it("при устаревшем rev отвечает 409 с данными сервера", async () => {
      const { call, tutor } = setup();
      const t = await tutor();
      const st = (await call("POST", "/tutor/students", { name: "Петя" }, t)).body as Student;
      const k = (await call("POST", "/join", { code: st.code })).body.token;
      await call("PUT", "/me/progress", { profile: profile(50), stats: {}, baseRev: 0 }, k);
      const r = await call("PUT", "/me/progress", { profile: profile(20), stats: {}, baseRev: 0 }, k);
      expect(r.status).toBe(409);
      expect(r.body).toMatchObject({ rev: 1, profile: { xp: 50 } });
    });

    it("не принимает мусор вместо прогресса", async () => {
      const { call, tutor } = setup();
      const t = await tutor();
      const st = (await call("POST", "/tutor/students", { name: "Петя" }, t)).body as Student;
      const k = (await call("POST", "/join", { code: st.code })).body.token;
      expect((await call("PUT", "/me/progress", { profile: { xp: "1" }, stats: {}, baseRev: 0 }, k)).status).toBe(400);
      expect((await call("PUT", "/me/progress", { hello: 1 }, k)).status).toBe(400);
    });

    it("новый код отключает старый вход", async () => {
      const { call, tutor } = setup();
      const t = await tutor();
      const st = (await call("POST", "/tutor/students", { name: "Петя" }, t)).body as Student;
      const k = (await call("POST", "/join", { code: st.code })).body.token;
      const st2 = (await call("POST", `/tutor/students/${st.id}/code`, undefined, t)).body as Student;
      expect(st2.code).not.toBe(st.code);
      expect((await call("GET", "/me", undefined, k)).status).toBe(401);
      expect((await call("POST", "/join", { code: st.code })).status).toBe(404);
      expect((await call("POST", "/join", { code: st2.code })).status).toBe(200);
    });

    it("репетитор задаёт настройки, ученик их получает", async () => {
      const { call, tutor } = setup();
      const t = await tutor();
      const st = (await call("POST", "/tutor/students", { name: "Петя" }, t)).body as Student;
      expect((await call("PATCH", `/tutor/students/${st.id}`, { settings: { words: "zzz" } }, t)).status).toBe(400);
      await call(
        "PATCH",
        `/tutor/students/${st.id}`,
        {
          name: "Пётр",
          settings: { words: "custom", customWords: "м(о)локо", lim: { min: 20, junk: 5, correct: -3 } },
        },
        t,
      );
      const k = (await call("POST", "/join", { code: st.code })).body.token;
      const me = (await call("GET", "/me", undefined, k)).body as MeResponse;
      expect(me.name).toBe("Пётр");
      expect(me.settings).toEqual({
        words: "custom",
        customWords: "м(о)локо",
        lim: { min: 20, fresh: 0, correct: 0, battles: 0, mistakes: 0 },
      });
    });

    it("удаление ученика", async () => {
      const { call, tutor } = setup();
      const t = await tutor();
      const st = (await call("POST", "/tutor/students", { name: "Петя" }, t)).body as Student;
      const k = (await call("POST", "/join", { code: st.code })).body.token;
      expect((await call("DELETE", `/tutor/students/${st.id}`, undefined, t)).status).toBe(204);
      expect((await call("GET", "/tutor/students", undefined, t)).body).toEqual([]);
      expect((await call("GET", "/me", undefined, k)).status).toBe(401);
    });

    it("токен ученика не открывает кабинет репетитора", async () => {
      const { call, tutor } = setup();
      const t = await tutor();
      const st = (await call("POST", "/tutor/students", { name: "Петя" }, t)).body as Student;
      const k = (await call("POST", "/join", { code: st.code })).body.token;
      expect((await call("GET", "/tutor/students", undefined, k)).status).toBe(401);
      expect((await call("GET", "/me", undefined, t)).status).toBe(401);
    });
  });
}
