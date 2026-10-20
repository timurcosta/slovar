// Синхронизация с сервером репетитора. Игра работает и без сети: localStorage — основная копия на
// устройстве, сервер — общая. Без сети изменения копятся (sb_dirty) и уходят, когда она появится.
import type { JoinResponse, MeResponse, ProgressConflict, ProgressResponse } from "@repetitor/shared";
import { HttpError, request } from "./http.ts";
import { LS } from "../state/storage.ts";
import { P, onSave, replaceProfile, resetProfile } from "../state/profile.ts";
import { migrateProfile } from "../state/migrations.ts";
import { setStats, stats } from "../state/stats.ts";
import { saveSettings, settings } from "../state/settings.ts";
import { setCustomRaw } from "../topics/words/pools.js";
import { TASKS_KEY } from "../progress/tasks.ts";

const K = { token: "sb_token", rev: "sb_rev", dirty: "sb_dirty", name: "sb_tutor_name", guest: "sb_guest" };
// не чаще раза в 30 с: бесплатный уровень Yandex Cloud — 100 тыс. запросов к API Gateway в месяц
const PUSH_DELAY = 30_000;

export const linkedName = (): string | null => (LS.get<string | null>(K.token, null) ? LS.get(K.name, null) : null);

/** Гость: играет без кода, прогресс только на этом устройстве. Войдёт по коду — прогресс уйдёт учителю.
 * Выбор живёт до закрытия игры (sessionStorage): устройство бывает общим, и при новом запуске снова
 * спрашиваем «Кто играет?» — продолжить героя на устройстве или начать новым. */
export const isGuest = (): boolean => {
  try {
    return !linkedName() && sessionStorage.getItem(K.guest) === "1";
  } catch (e) {
    return false;
  }
};
export const setGuest = (on = true) => {
  try {
    if (on) sessionStorage.setItem(K.guest, "1");
    else sessionStorage.removeItem(K.guest);
  } catch (e) {}
};

/** Вызывается, когда данные пришли с сервера и экран надо перерисовать. */
let onRemote = () => {};
export const setOnRemote = (fn: () => void) => (onRemote = fn);

const api = <T>(method: string, path: string, body?: unknown, keepalive = false) =>
  request<T>(method, path, { body, keepalive, token: LS.get<string | null>(K.token, null) });

const hasProgress = () => !!P.name || P.xp > 0;

function forget() {
  // код сменили или ученика удалили: прогресс на устройстве остаётся, просто больше не отправляется
  LS.set(K.token, null);
  LS.set(K.dirty, false);
  LS.set(TASKS_KEY, []);
}

/** Берёт данные с сервера: прогресс, если он новее, и настройки репетитора. */
function adopt(me: MeResponse, takeProgress: boolean) {
  LS.set(K.name, me.name);
  LS.set(TASKS_KEY, me.tasks || []);
  const s = me.settings || {};
  if (s.words) settings.words = s.words;
  if (s.customWords !== undefined) {
    setCustomRaw(s.customWords);
    LS.set("sb_custom", s.customWords);
  }
  if (s.lim) settings.lim = { ...s.lim };
  saveSettings();
  if (takeProgress && me.profile) {
    replaceProfile(migrateProfile(me.profile));
    setStats(me.stats || {});
    LS.set("sb_stats", me.stats || {});
    LS.set(K.dirty, false);
  }
  LS.set(K.rev, me.rev);
  onRemote();
}

let pushing: Promise<void> | null = null;
async function push(keepalive = false): Promise<void> {
  if (!linkedName() || !LS.get(K.dirty, false)) return;
  if (pushing) return pushing;
  pushing = (async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await api<ProgressResponse>(
          "PUT",
          "/me/progress",
          { profile: P, stats, baseRev: LS.get(K.rev, 0) },
          keepalive,
        );
        LS.set(K.rev, r.rev);
        LS.set(K.dirty, false);
        return;
      } catch (e) {
        if (e instanceof HttpError && e.status === 409) {
          // прогресс меняли с другого устройства: побеждает тот, у кого больше опыта
          const me = e.body as ProgressConflict;
          if ((me.profile?.xp ?? -1) > P.xp) return adopt(me, true);
          LS.set(K.rev, me.rev);
          continue;
        }
        if (e instanceof HttpError && e.status === 401) return forget();
        return; // нет сети — попробуем позже
      }
    }
  })().finally(() => (pushing = null));
  return pushing;
}

let timer: ReturnType<typeof setTimeout> | undefined;
function schedule() {
  if (!linkedName()) return;
  LS.set(K.dirty, true);
  // таймер не сдвигается при новых изменениях: во время боя прогресс уходит раз в PUSH_DELAY, а не после боя
  if (timer === undefined)
    timer = setTimeout(() => {
      timer = undefined;
      push();
    }, PUSH_DELAY);
}

/** При запуске: забрать свежие данные и отправить то, что не успело уйти. */
export async function pull(): Promise<void> {
  if (!linkedName()) return;
  try {
    const me = await api<MeResponse>("GET", "/me");
    const newer = !!me.profile && me.rev > LS.get(K.rev, 0) && !LS.get(K.dirty, false);
    adopt(me, newer);
    if (!newer && (LS.get(K.dirty, false) || (!me.profile && hasProgress()))) {
      LS.set(K.dirty, true);
      await push();
    }
  } catch (e) {
    if (e instanceof HttpError && e.status === 401) forget();
  }
}

/** Вход по коду от репетитора. Возвращает имя ученика у репетитора. */
export async function join(code: string): Promise<string> {
  const r = await api<JoinResponse>("POST", "/join", { code });
  LS.set(K.token, r.token);
  LS.set(K.name, r.name);
  setGuest(false);
  const me = await api<MeResponse>("GET", "/me");
  // на сервере уже есть прогресс побольше — продолжаем его, иначе отправляем свой
  const takeServer = !!me.profile && (me.profile.xp ?? 0) >= P.xp;
  adopt(me, takeServer);
  if (!takeServer) {
    if (!P.name) {
      P.name = r.name;
      LS.set("sb2_profile", P);
    }
    LS.set(K.dirty, true);
    await push();
  }
  return r.name;
}

/** «Выйти»: устройство бывает общим (учитель дала поиграть со своего телефона). Сначала отправляем
 * прогресс, потом стираем ученика с устройства: иначе следующий игрок продолжит чужого героя, а войдя
 * по своему коду, отправит его к себе. Без сети не выходим — неотправленное потерялось бы. */
export async function logout(): Promise<boolean> {
  if (!linkedName()) return true;
  clearTimeout(timer);
  timer = undefined;
  if (LS.get(K.dirty, false)) await push();
  if (LS.get(K.dirty, false)) return false;
  LS.set(K.token, null);
  LS.set(K.name, null);
  LS.set(K.rev, 0);
  LS.set(TASKS_KEY, []);
  setGuest(false);
  resetProfile();
  LS.set("sb2_profile", P);
  setStats({});
  LS.set("sb_stats", {});
  // слова и лимиты задал учитель этому ученику; звук и музыка — устройства, их оставляем
  settings.words = "auto";
  delete settings.lim;
  saveSettings();
  setCustomRaw("");
  LS.set("sb_custom", "");
  return true;
}

onSave(schedule);
setInterval(() => push(), 60_000);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearTimeout(timer);
    timer = undefined;
    push(true);
  }
});
// сеть вернулась: забрать настройки и задания учителя и отправить то, что накопилось без неё
window.addEventListener("online", () => pull());
