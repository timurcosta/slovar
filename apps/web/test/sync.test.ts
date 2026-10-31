// Синхронизация: настройки репетитора накладываются на настройки игры и стираются при выходе.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MeResponse, TutorSettings } from "../src/state/types.ts";

const me = (settings: TutorSettings): MeResponse => ({
  name: "Маша",
  settings,
  tasks: [],
  profile: null,
  stats: null,
  rev: 0,
});

/** Свежие модули с учеником, вошедшим по коду, и сервером, который отдаёт эти настройки. */
async function load(settings: TutorSettings) {
  localStorage.clear();
  localStorage.setItem("sb_token", JSON.stringify("k"));
  localStorage.setItem("sb_tutor_name", JSON.stringify("Маша"));
  let answer = me(settings);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: URL, init: RequestInit) => {
      const path = String(url);
      if (path.endsWith("/api/me")) return new Response(JSON.stringify(answer));
      if (path.endsWith("/api/me/progress") && init.method === "PUT") return new Response(JSON.stringify({ rev: 1 }));
      return new Response("{}", { status: 404 });
    }),
  );
  vi.resetModules();
  const sync = await import("../src/net/sync.ts");
  const { settings: game } = await import("../src/state/settings.ts");
  return { sync, game, serve: (s: TutorSettings) => (answer = me(s)) };
}

describe("режим ответа от репетитора", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("приходит в settings.answer и сохраняется в sb_settings", async () => {
    const { sync, game } = await load({ answer: "grow" });
    await sync.pull();
    expect(game.answer).toBe("grow");
    expect(JSON.parse(localStorage.getItem("sb_settings")!).answer).toBe("grow");
  });

  it("репетитор снял режим — снова решает ученик, его выбор play не трогаем", async () => {
    const { sync, game, serve } = await load({ answer: "type" });
    game.play = "type";
    await sync.pull();
    expect(game.answer).toBe("type");
    serve({});
    await sync.pull();
    expect(game.answer).toBeUndefined();
    expect(game.play).toBe("type");
  });

  it("при выходе стирается", async () => {
    const { sync, game } = await load({ answer: "pick" });
    await sync.pull();
    expect(game.answer).toBe("pick");
    expect(await sync.logout()).toBe(true);
    expect(game.answer).toBeUndefined();
    expect(JSON.parse(localStorage.getItem("sb_settings")!).answer).toBeUndefined();
  });

  it("гостю не приходит: без входа по коду запросов нет", async () => {
    const { sync, game } = await load({ answer: "type" });
    localStorage.removeItem("sb_token");
    await sync.pull();
    expect(game.answer).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });
});
