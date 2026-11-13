// Страница ученика: вкладки «Обзор», «История», «Задания», «Слова и лимиты», «Вход».
// В обзоре — списки слов «Трудные», «Забывает», «Не видел» и «Слова на занятие» (расчёты — report.ts).
// Адрес вкладки: #/s/:id (обзор), #/s/:id/history, #/s/:id/tasks, #/s/:id/words, #/s/:id/login.
import type { AnswerMode, Student, TutorSettings } from "@repetitor/shared";
import { esc } from "../lib/dom.js";
import { parseEntry, splitEntries, type WordEntry } from "../topics/words/parse.ts";
import { LEARN_N } from "../content/rules.ts";
import { TITLES, levelOf } from "../progress/levels.ts";
import { TOTAL_WORDS, api, app, hardWords, learned, msg, plural, q, rawOf, seen, todayOf } from "./common.ts";
import { LESSON_DAYS, type LessonWord, forgetting, gapped, lessonText, lessonWords, unseenWords } from "./report.ts";
import { renderTasksTab, setPrefill, tasksSummary } from "./tasks.ts";
import { renderHistoryTab, weekLine } from "./history.ts";

const TABS: [string, string][] = [
  ["", "Обзор"],
  ["history", "История"],
  ["tasks", "Задания"],
  ["words", "Слова и лимиты"],
  ["login", "Вход"],
];
const MODES: [string, string][] = [
  ["", "Как выберет ученик"],
  ["auto", "Как в кампании: сначала 1–2 класс, потом 3–4"],
  ["a", "Только 1–2 класс"],
  ["ab", "Все слова вперемешку"],
  ["b", "Только 3–4 класс"],
  ["custom", "Только мои слова"],
];
/** Режим ответа: значение, название, пояснение для репетитора. */
const ANSWERS: [string, string, string][] = [
  ["", "Как выберет ученик", "Переключатель «Выбор буквы | Пишу сам» на главной у ребёнка."],
  ["pick", "Только выбор буквы", "Из двух вариантов. Проще, но угадать можно в половине случаев."],
  ["type", "Только пишет сам", "Слово целиком с клавиатуры, награда ×2 и больше времени на ответ."],
  [
    "grow",
    "По росту",
    "Новое слово — выбором; после 2 верных подряд вписывает целиком. Ошибся при вписывании — слово один раз снова выбором.",
  ],
];
const LIMS: [string, string][] = [
  ["min", "Минут игры"],
  ["fresh", "Новых слов"],
  ["correct", "Верных ответов"],
  ["battles", "Боёв"],
  ["mistakes", "Ошибок"],
];
const tile = (k: string, v: string | number) => `<div class="stat"><span>${k}</span><b>${esc(String(v))}</b></div>`;
const tabUrl = (id: string, tab: string) => `#/s/${encodeURIComponent(id)}${tab ? "/" + tab : ""}`;

export async function renderStudent(id: string, tab: string) {
  app.innerHTML = `<section class="screen"><p class="note">Загружаю…</p></section>`;
  let s: Student;
  try {
    s = await api<Student>("GET", `/tutor/students/${encodeURIComponent(id)}`);
  } catch {
    app.innerHTML = `<section class="screen"><p class="note">Ученик не найден.</p><a class="link" href="#/">К списку</a></section>`;
    return;
  }
  if (!TABS.some(([t]) => t === tab)) tab = "";
  const p = s.profile,
    lvl = p ? levelOf(p.xp) : 0;
  const line = p
    ? `был(а) ${seen(s.lastSeenAt)} · уровень ${lvl} · выучено ${learned(s)} из ${TOTAL_WORDS}`
    : "ещё не входил(а) в игру по коду";
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
  else if (tab === "words") wordsTab(root, s);
  else if (tab === "login") loginTab(root, s);
  else overviewTab(root, s, lvl);
}

/** Сколько слов «Не видел ни разу» показывать сразу (остальные — по «Показать все»). */
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

/** Три списка слов (вкладками внутри панели) и «Слова на занятие». */
function wordsPanel(s: Student): string {
  const custom = s.settings?.customWords,
    hard = hardWords(s),
    forget = forgetting(s),
    unseen = unseenWords(s);
  const table = (head: string, rows: string[]) =>
    `<div class="tutor-scroll"><table class="wtable"><thead><tr><th></th><th>Слово</th>${head}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
  const lists: [string, string, number, string][] = [
    [
      "hard",
      "Трудные",
      hard.length,
      hard.length
        ? `<p class="note">Все слова с ошибками, больше ошибок — выше.</p>` +
          table(
            `<th class="n">Ошибок</th><th class="n">Верно</th>`,
            hard.map(
              ([w, x], i) =>
                `<tr><td>${check(rawOf(w, custom), w, i < 8)}</td><td>${esc(w)}</td><td class="n bad">${x.wrong}</td><td class="n">${x.right}</td></tr>`,
            ),
          )
        : `<p class="note">Ошибок пока нет.</p>`,
    ],
    [
      "forget",
      "Забывает",
      forget.length,
      forget.length
        ? `<p class="note">Были выучены (${LEARN_N} верных подряд), потом ошибка. Пора повторить.</p>` +
          table(
            `<th class="n">Ошибка</th><th class="n">Ошибок</th><th class="n">Верно</th>`,
            forget.map(
              (x, i) =>
                `<tr><td>${check(rawOf(x.word, custom), x.word, i < 8)}</td><td>${esc(x.word)}</td><td class="n">${esc(shortDay(x.at))}</td><td class="n bad">${x.stat.wrong}</td><td class="n">${x.stat.right}</td></tr>`,
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
                `<label class="wchip"${i >= UNSEEN_FIRST ? " hidden" : ""}>${check(e.raw, e.word, false)}${esc(e.word)}</label>`,
            )
            .join("")}</div>
          ${unseen.list.length > UNSEEN_FIRST ? `<button class="link" type="button" id="unseen-all">Показать все (${unseen.list.length})</button>` : ""}`
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

function overviewTab(root: HTMLElement, s: Student, lvl: number) {
  const d = todayOf(s);
  root.innerHTML = `
    <div class="panel">
      <h2>Сегодня</h2>
      ${
        d
          ? `<div class="stats">${tile("Минут", Math.floor(d.sec / 60))}${tile("Верных", d.correct)}${tile("Ошибок", d.mistakes)}${tile("Новых слов", d.fresh)}</div>`
          : `<p class="note">Сегодня ещё не играл(а).</p>`
      }
      ${s.profile ? `<p class="note">${esc(weekLine(s))} <a class="link" href="${tabUrl(s.id, "history")}">История →</a></p>` : ""}
      ${s.profile ? `<p class="note">${esc(TITLES[lvl - 1])} · дней подряд: ${s.profile.days?.streak ?? 0} · верных ответов всего: ${s.profile.tot?.correct ?? 0}</p>` : ""}
    </div>
    <div class="panel">
      <div class="row tutor-top"><h2>Задания</h2><a class="link" href="${tabUrl(s.id, "tasks")}">Все задания →</a></div>
      ${tasksSummary(s)}
    </div>
    ${wordsPanel(s)}`;
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
  panel.querySelector<HTMLButtonElement>("#unseen-all")?.addEventListener("click", (ev) => {
    panel.querySelectorAll<HTMLElement>(".wchip[hidden]").forEach((c) => (c.hidden = false));
    (ev.target as HTMLElement).remove();
  });
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
      try {
        await navigator.clipboard.writeText(text.value);
        msg(m, "Скопировано: слова с пропусками и ответы.", "okm");
      } catch {
        // без доступа к буферу (старый браузер, не https): показываем текст выделенным
        text.hidden = false;
        text.focus();
        text.select();
        msg(m, "Текст выделен — скопируйте его вручную.", "");
      }
    };
    q<HTMLButtonElement>("#lesson-give").onclick = () =>
      give(
        lessonWords(s, Date.now()).map((x) => x.entry.raw),
        m,
      );
  };
}

function wordsTab(root: HTMLElement, s: Student) {
  const set = s.settings || {};
  root.innerHTML = `
    <form class="panel" id="settings">
      <h2>Какие слова</h2>
      ${MODES.map(
        ([v, t]) =>
          `<label class="mode"><input type="radio" name="words" value="${v}"${(set.words || "") === v ? " checked" : ""} /><span><b>${esc(t)}</b></span></label>`,
      ).join("")}
      <h2>Как отвечает</h2>
      ${ANSWERS.map(
        ([v, t, d]) =>
          `<label class="mode"><input type="radio" name="answer" value="${v}"${(set.answer || "") === v ? " checked" : ""} /><span><b>${esc(t)}${v === "grow" ? ' <em class="rec">рекомендую</em>' : ""}</b><small>${esc(d)}</small></span></label>`,
      ).join("")}
      <h2>Мои слова</h2>
      <p class="note">Одно слово в строке, трудная буква в скобках: м(о)локо, неправильный вариант через черту: м(о/а)локо.</p>
      <p class="note">Подсказка после черты «|»: м(о)локо | корова мычит: мо-о — ученик увидит её только после ошибки.</p>
      <textarea id="custom" rows="6" placeholder="м(о)локо&#10;с(о)бака">${esc(set.customWords ?? "")}</textarea>
      <h2>Лимиты на день</h2>
      <p class="note">0 — без лимита. Когда лимит достигнут, игра мягко останавливается до завтра. Задания открыты и после лимита.</p>
      <div class="tutor-lims">
        ${LIMS.map(([k, t]) => `<label>${esc(t)} <input type="number" min="0" max="2000" name="lim-${k}" value="${set.lim?.[k] ?? 0}" /></label>`).join("")}
      </div>
      <div class="row"><button class="btn primary small" type="submit">Сохранить</button><span class="msg" id="set-msg"></span></div>
      <p class="note">Ученик получит настройки при следующем запуске игры.</p>
    </form>`;
  q<HTMLFormElement>("#settings").onsubmit = async (ev) => {
    ev.preventDefault();
    const f = ev.target as HTMLFormElement;
    const words = f.querySelector<HTMLInputElement>('input[name="words"]:checked')?.value || "";
    const customWords = q<HTMLTextAreaElement>("#custom").value;
    const bad = splitEntries(customWords).filter((l) => !parseEntry(l));
    const lim = Object.fromEntries(
      LIMS.map(([k]) => [k, Number(f.querySelector<HTMLInputElement>(`[name="lim-${k}"]`)!.value) || 0]),
    );
    const answer = (f.querySelector<HTMLInputElement>('input[name="answer"]:checked')?.value || "") as AnswerMode;
    const settings: TutorSettings = { ...(words ? { words } : {}), customWords, lim, ...(answer ? { answer } : {}) };
    try {
      await api("PATCH", `/tutor/students/${s.id}`, { settings });
      s.settings = settings;
      msg(
        q("#set-msg"),
        bad.length
          ? `Сохранено. Не понял слова: ${bad.slice(0, 4).join(", ")}${bad.length > 4 ? "…" : ""}`
          : "Сохранено.",
        bad.length ? "err" : "okm",
      );
    } catch {
      msg(q("#set-msg"), "Не получилось сохранить.", "err");
    }
  };
}

function loginTab(root: HTMLElement, s: Student) {
  root.innerHTML = `
    <div class="panel">
      <h2>Код для входа</h2>
      <div class="row"><span class="tutor-code" id="code">${esc(s.code)}</span><button class="btn small" id="copy">Скопировать</button></div>
      <p class="note">В игре: «Кто играет?» после заставки или «Код учителя» в настройках. После входа прогресс ученика сохраняется здесь.</p>
      <div class="row"><button class="btn small" id="new-code">Выдать новый код</button><span class="msg" id="code-msg"></span></div>
    </div>
    <div class="panel">
      <h2>Имя</h2>
      <form class="pinrow" id="rename">
        <input id="name" type="text" maxlength="30" value="${esc(s.name)}" aria-label="Имя ученика" />
        <button class="btn small" type="submit">Переименовать</button>
      </form>
    </div>
    <div class="panel">
      <h2>Удалить</h2>
      <div class="row"><button class="btn small" id="delete">Удалить ученика</button><span class="msg" id="del-msg"></span></div>
    </div>`;
  q<HTMLButtonElement>("#copy").onclick = async () => {
    try {
      await navigator.clipboard.writeText(q("#code").textContent || "");
      msg(q("#code-msg"), "Код скопирован.", "okm");
    } catch {
      msg(q("#code-msg"), "Не получилось скопировать: выделите код и скопируйте вручную.", "err");
    }
  };
  let codeArm = false;
  q<HTMLButtonElement>("#new-code").onclick = async () => {
    if (!codeArm) {
      codeArm = true;
      return msg(q("#code-msg"), "Старый код перестанет работать, ученику нужно будет войти заново. Нажмите ещё раз.");
    }
    codeArm = false;
    const r = await api<Student>("POST", `/tutor/students/${s.id}/code`);
    q("#code").textContent = r.code;
    msg(q("#code-msg"), "Новый код выдан.", "okm");
  };
  q<HTMLFormElement>("#rename").onsubmit = async (ev) => {
    ev.preventDefault();
    const name = q<HTMLInputElement>("#name").value.trim();
    if (!name) return;
    await api("PATCH", `/tutor/students/${s.id}`, { name });
    renderStudent(s.id, "login");
  };
  let delArm = false;
  q<HTMLButtonElement>("#delete").onclick = async () => {
    if (!delArm) {
      delArm = true;
      return msg(q("#del-msg"), "Весь прогресс ученика на сервере будет удалён. Нажмите ещё раз.", "err");
    }
    await api("DELETE", `/tutor/students/${s.id}`);
    location.hash = "#/";
  };
}
