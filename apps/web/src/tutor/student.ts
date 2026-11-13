// Страница ученика: вкладки «Обзор», «История», «Задания», «Настройки».
// В обзоре — неделя, «Отчёт родителям», задания, списки слов («Трудные», «Забывает», «Не видел») и «Слова на занятие»
// (расчёты — report.ts); у ученика, который ещё не входил, — код для входа. Настройки — settings.ts.
// Адрес вкладки: #/s/:id (обзор), #/s/:id/history, #/s/:id/tasks, #/s/:id/settings
// (старые #/s/:id/words и #/s/:id/login ведут в настройки).
import type { Student } from "@repetitor/shared";
import { esc } from "../lib/dom.js";
import { today } from "../lib/date.js";
import { type WordEntry } from "../topics/words/parse.ts";
import { LEARN_N } from "../content/rules.ts";
import { TITLES, levelOf } from "../progress/levels.ts";
import { TOTAL_WORDS, api, app, copyText, hardNow, learned, msg, plural, q, rawOf, seen, todayOf } from "./common.ts";
import {
  LESSON_DAYS,
  type LessonWord,
  forgetting,
  gapped,
  hardPast,
  lessonText,
  lessonWords,
  parentReport,
  unseenWords,
  weekReport,
} from "./report.ts";
import { renderTasksTab, setPrefill, tasksSummary } from "./tasks.ts";
import { drawHero } from "../render/hero.js";
import { renderHistoryTab } from "./history.ts";
import { heroInfo } from "./hero.ts";
import { accessHTML, bindAccess, renderSettingsTab } from "./settings.ts";

const TABS: [string, string][] = [
  ["", "Обзор"],
  ["history", "История"],
  ["tasks", "Задания"],
  ["settings", "Настройки"],
];
const tile = (k: string, v: string | number, cls = "") =>
  `<div class="stat ${cls}"><span>${k}</span><b>${esc(String(v))}</b></div>`;
export const tabUrl = (id: string, tab: string) => `#/s/${encodeURIComponent(id)}${tab ? "/" + tab : ""}`;

export async function renderStudent(id: string, tab: string) {
  app.innerHTML = `<section class="screen"><p class="note">Загружаю…</p></section>`;
  let s: Student;
  try {
    s = await api<Student>("GET", `/tutor/students/${encodeURIComponent(id)}`);
  } catch {
    app.innerHTML = `<section class="screen"><p class="note">Ученик не найден.</p><a class="link" href="#/">К списку</a></section>`;
    return;
  }
  // старые адреса: «Слова и лимиты» и «Вход» теперь разделы настроек
  const section = tab === "login" ? "access" : "";
  if (tab === "words" || tab === "login") tab = "settings";
  if (!TABS.some(([t]) => t === tab)) tab = "";
  const p = s.profile,
    lvl = p ? levelOf(p.xp) : 0;
  const line = p
    ? `последний вход: ${seen(s.lastSeenAt)} · уровень ${lvl} · выучено ${learned(s)} из ${TOTAL_WORDS}`
    : "входа в игру по коду ещё не было";
  app.innerHTML = `
    <section class="screen">
      <div class="row tutor-top"><a class="link" href="#/">← Все ученики</a><a class="link" href="#/account">Пароль</a></div>
      <h1>${esc(s.name)}</h1>
      <p class="note tline">${esc(line)}</p>
      <nav class="ttabs" role="tablist">${TABS.map(
        ([t, name]) =>
          `<a role="tab" href="${tabUrl(s.id, t)}" class="ttab${t === tab ? " on" : ""}" aria-selected="${t === tab}">${esc(name)}</a>`,
      ).join("")}</nav>
      <div id="tab"></div>
    </section>`;
  const root = q("#tab");
  const reload = () => renderStudent(s.id, tab);
  if (tab === "tasks") renderTasksTab(root, s, reload);
  else if (tab === "history") renderHistoryTab(root, s);
  else if (tab === "settings") renderSettingsTab(root, s, section, reload);
  else overviewTab(root, s, lvl);
}

/** Сколько строк списка слов видно сразу (остальные — по «Показать все»). */
const ROWS_FIRST = 8;
/** Сколько слов «Не видел ни разу» показывать сразу. */
const UNSEEN_FIRST = 30;
const MAX_GIVE = 40;
const shortDay = (t: number) => new Date(t).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
/** Слово с выделенными трудными буквами (для ответов репетитору). */
const marked = (e: WordEntry) =>
  e.segs.map((sg, i) => ("t" in sg ? esc(sg.t) : e.slots.includes(i) ? `<u>${esc(sg.c)}</u>` : esc(sg.c))).join("");
const check = (raw: string | null, word: string, on: boolean) =>
  raw
    ? `<input type="checkbox" class="hw" data-raw="${esc(raw)}"${on ? " checked" : ""} aria-label="${esc(word)}" />`
    : "";
/** Хвост из пары строк прятать незачем: список режется, только если он заметно длиннее. */
const cut = (n: number, first: number) => (n > first + 2 ? first : n);
const more = (n: number, first: number) =>
  n > cut(n, first) ? `<button class="link more" type="button">Показать все (${n})</button>` : "";

/** Три списка слов (вкладками внутри панели) и «Слова на занятие». Длинные списки показывают начало. */
function wordsPanel(s: Student): string {
  const custom = s.settings?.customWords,
    hard = hardNow(s),
    past = hardPast(s),
    forget = forgetting(s),
    unseen = unseenWords(s);
  const table = (head: string, rows: string[]) =>
    `<div class="tutor-scroll"><table class="wtable"><thead><tr><th></th><th>Слово</th>${head}</tr></thead><tbody>${rows.join("")}</tbody></table></div>${more(rows.length, ROWS_FIRST)}`;
  const tr = (i: number, n: number, cells: string) => `<tr${i >= cut(n, ROWS_FIRST) ? " hidden" : ""}>${cells}</tr>`;
  const pastHTML = past.length
    ? `<details class="fold"><summary>Уже выучены, а ошибки были <b>${past.length}</b></summary>
        <p class="wpast">${past.map(([w, x]) => `${esc(w)} <small>×${x.wrong}</small>`).join(", ")}</p></details>`
    : "";
  const lists: [string, string, number, string][] = [
    [
      "hard",
      "Трудные",
      hard.length,
      (hard.length
        ? `<p class="note">Слова с ошибками, которые ещё не выучены (${LEARN_N} верных подряд). Больше ошибок — выше.</p>` +
          table(
            `<th class="n">Ошибок</th><th class="n">Верно</th>`,
            hard.map(([w, x], i) =>
              tr(
                i,
                hard.length,
                `<td>${check(rawOf(w, custom), w, i < ROWS_FIRST)}</td><td>${esc(w)}</td><td class="n bad">${x.wrong}</td><td class="n">${x.right}</td>`,
              ),
            ),
          )
        : `<p class="note">${past.length ? "Все слова с ошибками уже выучены." : "Ошибок пока нет."}</p>`) + pastHTML,
    ],
    [
      "forget",
      "Забывает",
      forget.length,
      forget.length
        ? `<p class="note">Были выучены (${LEARN_N} верных подряд), потом ошибка. Пора повторить.</p>` +
          table(
            `<th class="n">Ошибка</th><th class="n">Ошибок</th><th class="n">Верно</th>`,
            forget.map((x, i) =>
              tr(
                i,
                forget.length,
                `<td>${check(rawOf(x.word, custom), x.word, i < ROWS_FIRST)}</td><td>${esc(x.word)}</td><td class="n">${esc(shortDay(x.at))}</td><td class="n bad">${x.stat.wrong}</td><td class="n">${x.stat.right}</td>`,
              ),
            ),
          )
        : `<p class="note">Выученные слова пока не забываются.</p>`,
    ],
    [
      "unseen",
      "Не видел",
      unseen.list.length,
      unseen.list.length
        ? `<p class="note">Набор «${esc(unseen.name)}»: ни разу не попадались ${unseen.list.length} из ${unseen.total}.</p>
          <div class="wchips">${unseen.list
            .map(
              (e, i) =>
                `<label class="wchip"${i >= cut(unseen.list.length, UNSEEN_FIRST) ? " hidden" : ""}>${check(e.raw, e.word, false)}${esc(e.word)}</label>`,
            )
            .join("")}</div>
          ${more(unseen.list.length, UNSEEN_FIRST)}`
        : `<p class="note">Все слова набора «${esc(unseen.name)}» уже встречались.</p>`,
    ],
  ];
  return `<div class="panel" id="words">
      <div class="row tutor-top"><h2>Слова</h2><button class="btn small" id="lesson-open">Слова на занятие</button></div>
      <div class="lesson" id="lesson" hidden></div>
      <div class="wtabs" role="tablist">${lists
        .map(
          ([k, name, n], i) =>
            `<button type="button" role="tab" class="wtab${i ? "" : " on"}" data-list="${k}" aria-selected="${!i}">${name} <b>${n}</b></button>`,
        )
        .join("")}</div>
      ${lists.map(([k, , , body], i) => `<div class="wlist" data-list="${k}"${i ? " hidden" : ""}>${body}</div>`).join("")}
      <div class="row"><button class="btn primary small" id="give">Дать заданием</button><span class="msg" id="give-msg"></span></div>
    </div>`;
}

function lessonHTML(s: Student): string {
  const ws = lessonWords(s, Date.now());
  if (!ws.length)
    return `<p class="note">За неделю ошибок не было, трудных слов тоже — диктовать пока нечего.</p>
      <div class="row"><button class="link" type="button" id="lesson-close">Закрыть</button></div>`;
  const why = (x: LessonWord) =>
    x.why === "week" ? `ошибок за неделю: ${x.misses}` : x.why === "forget" ? "забывает" : "трудное";
  return `<h3>Слова на занятие <small>${ws.length} ${plural(ws.length, ["слово", "слова", "слов"])}</small></h3>
    <p class="note">Сначала слова с ошибками за ${LESSON_DAYS} дней (больше ошибок — выше), потом «Забывает» и «Трудные».</p>
    <div class="tutor-scroll"><table class="lesson-t">
      <thead><tr><th></th><th>Для ученика</th><th>Ответ</th></tr></thead>
      <tbody>${ws
        .map(
          (x, i) =>
            `<tr><td class="ln">${i + 1}.</td><td class="lgap">${esc(gapped(x.entry))}</td><td class="lans">${marked(x.entry)} <small>${esc(why(x))}</small>${x.entry.hint ? `<i>${esc(x.entry.hint)}</i>` : ""}</td></tr>`,
        )
        .join("")}</tbody>
    </table></div>
    <textarea id="lesson-text" rows="8" readonly hidden aria-label="Слова на занятие текстом">${esc(lessonText(s.name, ws))}</textarea>
    <div class="row"><button class="btn small" type="button" id="lesson-copy">Скопировать</button><button class="btn primary small" type="button" id="lesson-give">Дать заданием</button><button class="link" type="button" id="lesson-close">Закрыть</button><span class="msg" id="lesson-msg"></span></div>`;
}

/** Неделя плитками и строка про сегодня; кнопка «Отчёт родителям» раскрывает готовый текст. */
function weekPanel(s: Student, lvl: number): string {
  const p = s.profile!,
    w = weekReport(p, s.stats, today()),
    d = todayOf(s);
  const todayLine = d
    ? `Сегодня: ${Math.floor(d.sec / 60)} мин · верно ${d.correct} · ошибок ${d.mistakes} · новых слов ${d.fresh}`
    : "Сегодня игры ещё не было";
  return `<div class="panel">
      <div class="row tutor-top"><h2>За 7 дней</h2><button class="btn small" id="parent-open">Отчёт родителям</button></div>
      <div class="lesson" id="parent" hidden>
        <h3>Сообщение родителям</h3>
        <p class="note">Готовый текст за неделю. Его можно поправить здесь же и скопировать в мессенджер.</p>
        <textarea id="parent-text" rows="7" aria-label="Сообщение родителям">${esc(parentReport(s, today(), Date.now()))}</textarea>
        <div class="row"><button class="btn primary small" type="button" id="parent-copy">Скопировать</button><button class="link" type="button" id="parent-close">Закрыть</button><span class="msg" id="parent-msg"></span></div>
      </div>
      <div class="stats wstats">${tile("Дней с игрой", `${w.days} из 7`)}${tile("Минут", w.min)}${tile("Выучено", w.learned)}${tile("Забыто", w.forgot, w.forgot ? "bad" : "")}</div>
      <p class="note">${esc(todayLine)} · дней подряд: ${p.days?.streak ?? 0} · ${esc(TITLES[lvl - 1])} <a class="link" href="${tabUrl(s.id, "history")}">История →</a></p>
    </div>`;
}

function overviewTab(root: HTMLElement, s: Student, lvl: number) {
  if (!s.profile) {
    // ученик ещё не входил: показывать нечего, зато нужен код
    root.innerHTML = `${accessHTML(s)}
      <p class="note">Когда ученик войдёт по коду и сыграет первый бой, здесь появятся неделя, слова и задания. Задание и свои слова можно задать уже сейчас — на соседних вкладках.</p>`;
    bindAccess(s);
    return;
  }
  const tasks = tasksSummary(s);
  root.innerHTML = `
    ${weekPanel(s, lvl)}
    <div class="panel">
      <div class="row tutor-top"><h2>Задания</h2><a class="link" href="${tabUrl(s.id, "tasks")}">${tasks ? "Все задания →" : "Задать →"}</a></div>
      ${tasks || `<p class="note">Открытых заданий нет.</p>`}
    </div>
    ${wordsPanel(s)}
    ${heroBlock(s, lvl)}`;
  animateHero(s.profile);
  const parent = q("#parent");
  q<HTMLButtonElement>("#parent-open").onclick = () => (parent.hidden = !parent.hidden);
  q<HTMLButtonElement>("#parent-close").onclick = () => (parent.hidden = true);
  q<HTMLButtonElement>("#parent-copy").onclick = async () => {
    const text = q<HTMLTextAreaElement>("#parent-text");
    if (await copyText(text.value)) return msg(q("#parent-msg"), "Скопировано.", "okm");
    text.focus();
    text.select();
    msg(q("#parent-msg"), "Текст выделен — скопируйте его вручную.", "");
  };
  const panel = q("#words"),
    give = (raws: string[], m: Element) => {
      if (!raws.length) return msg(m, "Отметьте хотя бы одно слово.", "err");
      setPrefill(raws.slice(0, MAX_GIVE));
      location.hash = tabUrl(s.id, "tasks");
    };
  panel.querySelectorAll<HTMLButtonElement>(".wtab").forEach(
    (b) =>
      (b.onclick = () => {
        panel.querySelectorAll<HTMLButtonElement>(".wtab").forEach((x) => {
          x.classList.toggle("on", x === b);
          x.setAttribute("aria-selected", String(x === b));
        });
        panel.querySelectorAll<HTMLElement>(".wlist").forEach((l) => (l.hidden = l.dataset.list !== b.dataset.list));
        msg(q("#give-msg"), "");
      }),
  );
  // «Показать все»: открывает спрятанный хвост своего списка
  panel.querySelectorAll<HTMLButtonElement>(".more").forEach(
    (b) =>
      (b.onclick = () => {
        b.closest(".wlist")!
          .querySelectorAll<HTMLElement>("tr[hidden], .wchip[hidden]")
          .forEach((x) => (x.hidden = false));
        b.remove();
      }),
  );
  q<HTMLButtonElement>("#give").onclick = () =>
    give(
      [...panel.querySelectorAll<HTMLInputElement>(".wlist:not([hidden]) .hw:checked")].map((c) => c.dataset.raw!),
      q("#give-msg"),
    );
  const lesson = q("#lesson");
  q<HTMLButtonElement>("#lesson-open").onclick = () => {
    lesson.innerHTML = lessonHTML(s);
    lesson.hidden = false;
    lesson.querySelector<HTMLButtonElement>("#lesson-close")!.onclick = () => (lesson.hidden = true);
    const text = lesson.querySelector<HTMLTextAreaElement>("#lesson-text");
    if (!text) return;
    const m = q("#lesson-msg");
    q<HTMLButtonElement>("#lesson-copy").onclick = async () => {
      if (await copyText(text.value)) return msg(m, "Скопировано: слова с пропусками и ответы.", "okm");
      // без доступа к буферу (старый браузер, не https): показываем текст выделенным
      text.hidden = false;
      text.focus();
      text.select();
      msg(m, "Текст выделен — скопируйте его вручную.", "");
    };
    q<HTMLButtonElement>("#lesson-give").onclick = () =>
      give(
        lessonWords(s, Date.now()).map((x) => x.entry.raw),
        m,
      );
  };
}

let heroTimer = 0;
/** Герой ученика во весь рост, с вещами и питомцем; кадр каждые 170 мс, пока холст на странице. */
function animateHero(p: NonNullable<Student["profile"]>) {
  clearInterval(heroTimer);
  const cv = document.getElementById("thero-cv") as HTMLCanvasElement | null,
    wrap = document.getElementById("thero-aura");
  if (!cv) return;
  const eq = { ...p.equip, look: { hair: "auto", skin: "auto", eye: "auto", style: "classic", ...(p.look || {}) } };
  let fr = 0;
  drawHero(cv, eq, wrap, fr);
  if (matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  heroTimer = window.setInterval(() => {
    if (!cv.isConnected) return clearInterval(heroTimer);
    if (!document.hidden) drawHero(cv, eq, wrap, ++fr);
  }, 170);
}

function heroBlock(s: Student, lvl: number): string {
  if (!s.profile) return "";
  const h = heroInfo(s.profile);
  const rows = h.rows
    .map(
      (r) =>
        `<tr><td>${esc(r.slot)}</td><td>${r.name ? esc(r.name) : "—"}</td><td>${r.name ? `<span class="rar" style="color:${r.color}">${esc(r.rarity)}</span>` : ""}</td></tr>`,
    )
    .join("");
  return `<details class="panel thero">
      <summary>Герой: уровень ${lvl} · ${esc(TITLES[lvl - 1])}</summary>
      <div class="thero-in">
        <div class="thero-av" id="thero-aura"><canvas id="thero-cv" aria-label="Герой ученика"></canvas></div>
        <div class="tutor-scroll"><table><tbody>${rows}</tbody></table></div>
      </div>
      <p class="note">Вещей: ${h.owned} · монет: ${h.coins} · лучший этаж башни: ${h.towerBest} · боссов кампании побеждено: ${h.beaten}</p>
      <p class="note">${h.medals.length ? `Медали заданий: ${h.medals.map(esc).join(", ")}` : "Медалей за задания пока нет."}</p>
    </details>`;
}
