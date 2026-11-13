// Вкладка «Настройки» ученика: сворачиваемые разделы с текущим значением в заголовке — какие слова,
// как отвечает, мои слова, лимиты (одна форма, одна кнопка «Сохранить»), ниже вход по коду, имя и удаление.
// Несохранённые правки: появляется полоска «Не сохранено», а уход со вкладки срабатывает со второго раза.
import type { AnswerMode, Student, TutorSettings } from "@repetitor/shared";
import { esc } from "../lib/dom.js";
import { parseEntry, splitEntries, type WordEntry } from "../topics/words/parse.ts";
import { api, copyText, msg, plural, q, setLeaveGuard } from "./common.ts";

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
const LIMS: [string, string, string][] = [
  ["min", "Минут игры", "мин"],
  ["fresh", "Новых слов", "новых слов"],
  ["correct", "Верных ответов", "верных"],
  ["battles", "Боёв", "боёв"],
  ["mistakes", "Ошибок", "ошибок"],
];
const nameOf = (list: [string, string, ...string[]][], v: string) => list.find(([k]) => k === v)?.[1] ?? list[0][1];

/** Слово так, как его спросит игра: трудная буква подчёркнута, рядом ловушка — «м<u>о</u>локо · не «а»». */
export function previewChip(e: WordEntry): string {
  const word = e.segs
    .map((sg, i) => ("t" in sg ? esc(sg.t) : e.slots.includes(i) ? `<u>${esc(sg.c)}</u>` : esc(sg.c)))
    .join("");
  const traps = e.slots.map((i) => `«${esc((e.segs[i] as { w: string }).w)}»`);
  return `<span class="pchip">${word} <small>не ${traps.join(", ")}</small>${e.hint ? `<i title="${esc(e.hint)}">подсказка</i>` : ""}</span>`;
}

/**
 * Живая проверка поля со словами: сколько слов понято, какие строки нет, и как каждое слово спросит игра
 * (ловушку игра часто подбирает сама — её стоит видеть до сохранения). max — предел числа слов (0 — нет).
 */
export function wordsCheck(o: {
  area: HTMLTextAreaElement;
  count: Element;
  bad: Element;
  preview: Element;
  max?: number;
}): () => { lines: string[]; bad: string[] } {
  const run = () => {
    const lines = splitEntries(o.area.value),
      es = lines.map(parseEntry),
      bad = lines.filter((_, i) => !es[i]),
      good = es.filter((e): e is WordEntry => !!e);
    o.count.textContent = good.length ? `${good.length} ${plural(good.length, ["слово", "слова", "слов"])}` : "";
    const over = !!o.max && lines.length > o.max;
    msg(
      o.bad,
      bad.length
        ? `Не понял: ${bad.slice(0, 4).join(", ")}${bad.length > 4 ? "…" : ""}. Нужна трудная буква в скобках.`
        : over
          ? `Больше ${o.max} слов не поместится в одно задание.`
          : "",
      bad.length || over ? "err" : "",
    );
    // предпросмотр перерисовывается на каждую букву: раскрытым он должен оставаться раскрытым
    const open = !!o.preview.querySelector("details[open]");
    o.preview.innerHTML = good.length
      ? `<details class="fold"${open ? " open" : ""}><summary>Как спросит игра <b>${good.length}</b></summary><div class="pchips">${good.map(previewChip).join("")}</div></details>`
      : "";
    return { lines, bad };
  };
  o.area.addEventListener("input", run);
  return run;
}

/** Текст для родителей: адрес игры, код и что нажать. */
export const joinMessage = (code: string, url: string) =>
  `Игра «Охотники за ошибками»: ${url}\nКод для входа: ${code}\nОткройте ссылку, нажмите «Нажми, чтобы начать» и введите код в окне «Кто играет?».`;

/** Панель с кодом для входа (в настройках и в обзоре ученика, который ещё не входил). */
export function accessHTML(s: Student): string {
  return `<div class="panel" id="access">
      <h2>Код для входа</h2>
      <div class="row"><span class="tutor-code" id="code">${esc(s.code)}</span><button class="btn small" id="copy">Скопировать код</button><button class="btn primary small" id="copy-msg">Сообщение родителям</button></div>
      <p class="msg" id="code-msg"></p>
      <p class="note">«Сообщение родителям» — адрес игры, код и что нажать. В игре код вводится в окне «Кто играет?» после заставки или в настройках («Код учителя»).</p>
      <div class="row"><button class="link" id="new-code">Выдать новый код</button></div>
    </div>`;
}
export function bindAccess(s: Student) {
  const m = q("#code-msg"),
    code = () => q("#code").textContent || "";
  q<HTMLButtonElement>("#copy").onclick = async () =>
    (await copyText(code()))
      ? msg(m, "Код скопирован.", "okm")
      : msg(m, "Не получилось скопировать: выделите код и скопируйте вручную.", "err");
  q<HTMLButtonElement>("#copy-msg").onclick = async () => {
    const text = joinMessage(code(), new URL("./", location.href).href);
    if (await copyText(text)) return msg(m, "Сообщение скопировано: адрес игры, код и что нажать.", "okm");
    msg(m, text, "");
  };
  let armed = false;
  q<HTMLButtonElement>("#new-code").onclick = async () => {
    if (!armed) {
      armed = true;
      return msg(m, "Старый код перестанет работать, ученику нужно будет войти заново. Нажмите ещё раз.");
    }
    armed = false;
    try {
      const r = await api<Student>("POST", `/tutor/students/${s.id}/code`);
      s.code = r.code;
      q("#code").textContent = r.code;
      msg(m, "Новый код выдан.", "okm");
    } catch {
      msg(m, "Не получилось выдать код. Проверьте сеть и попробуйте ещё раз.", "err");
    }
  };
}

const sect = (id: string, title: string, value: string, body: string, open: boolean) =>
  `<details class="panel sect" data-sect="${id}"${open ? " open" : ""}>
      <summary><b>${title}</b><span class="sv" id="sv-${id}">${esc(value)}</span></summary>
      <div class="sect-in">${body}</div>
    </details>`;

const limText = (lim: Record<string, number> | undefined) => {
  const on = LIMS.filter(([k]) => (lim?.[k] ?? 0) > 0).map(([k, , unit]) => `${lim![k]} ${unit}`);
  return on.length ? on.join(" · ") : "без лимитов";
};
const customText = (raw: string | undefined) => {
  const n = splitEntries(raw ?? "").filter(parseEntry).length;
  return n ? `${n} ${plural(n, ["слово", "слова", "слов"])}` : "нет";
};

/** section — какой раздел раскрыть сразу («access» — вход по коду). */
export function renderSettingsTab(root: HTMLElement, s: Student, section: string, reload: () => void) {
  const set = s.settings || {};
  window.onbeforeunload = null;
  root.innerHTML = `
    <form id="settings" class="tset">
      ${sect(
        "words",
        "Какие слова",
        nameOf(MODES, set.words || ""),
        MODES.map(
          ([v, t]) =>
            `<label class="mode"><input type="radio" name="words" value="${v}"${(set.words || "") === v ? " checked" : ""} /><span><b>${esc(t)}</b></span></label>`,
        ).join(""),
        section === "words",
      )}
      ${sect(
        "answer",
        "Как отвечает",
        nameOf(ANSWERS, set.answer || ""),
        ANSWERS.map(
          ([v, t, d]) =>
            `<label class="mode"><input type="radio" name="answer" value="${v}"${(set.answer || "") === v ? " checked" : ""} /><span><b>${esc(t)}${v === "grow" ? ' <em class="rec">рекомендую</em>' : ""}</b><small>${esc(d)}</small></span></label>`,
        ).join(""),
        section === "answer",
      )}
      ${sect(
        "custom",
        "Мои слова",
        customText(set.customWords),
        `<p class="note">Одно слово в строке, трудная буква в скобках: м(о)локо, неправильный вариант через черту: м(о/а)локо.</p>
        <p class="note">Подсказка после черты «|»: м(о)локо | корова мычит: мо-о — ученик увидит её только после ошибки.</p>
        <textarea id="custom" rows="6" placeholder="м(о)локо&#10;с(о)бака">${esc(set.customWords ?? "")}</textarea>
        <p class="msg" id="custom-bad"></p>
        <div id="custom-preview"></div>
        <p class="note">Чтобы в боях были только эти слова, выберите «Только мои слова» в разделе «Какие слова».</p>`,
        section === "custom",
      )}
      ${sect(
        "lim",
        "Лимиты на день",
        limText(set.lim),
        `<p class="note">0 — без лимита. Когда лимит достигнут, игра мягко останавливается до завтра. Задания открыты и после лимита.</p>
        <div class="tutor-lims">
          ${LIMS.map(([k, t]) => `<label>${esc(t)} <input type="number" min="0" max="2000" name="lim-${k}" value="${set.lim?.[k] ?? 0}" /></label>`).join("")}
        </div>`,
        section === "lim",
      )}
      <div class="savebar" id="savebar" hidden>
        <button class="btn primary small" type="submit">Сохранить</button>
        <span class="msg" id="set-msg"></span>
      </div>
    </form>
    <details class="panel sect" data-sect="access"${section === "access" ? " open" : ""}>
      <summary><b>Вход и имя</b><span class="sv">код, имя</span></summary>
      <div class="sect-in">
        ${accessHTML(s)}
        <div class="panel">
          <h2>Имя</h2>
          <form class="pinrow" id="rename">
            <input id="name" type="text" maxlength="30" value="${esc(s.name)}" aria-label="Имя ученика" />
            <button class="btn small" type="submit">Переименовать</button>
          </form>
          <p class="msg" id="name-msg"></p>
        </div>
      </div>
    </details>
    <details class="panel sect" data-sect="delete">
      <summary><b>Удалить ученика</b><span class="sv">с прогрессом</span></summary>
      <div class="sect-in">
        <p class="note">Прогресс ученика на сервере удаляется насовсем, вернуть его будет нельзя.</p>
        <div class="row"><button class="btn small" id="delete">Удалить ученика</button><span class="msg" id="del-msg"></span></div>
      </div>
    </details>`;

  const form = q<HTMLFormElement>("#settings"),
    bar = q("#savebar"),
    m = q("#set-msg"),
    custom = q<HTMLTextAreaElement>("#custom");
  const picked = (name: string) => form.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value || "";
  const limNow = () =>
    Object.fromEntries(
      LIMS.map(([k]) => [k, Number(form.querySelector<HTMLInputElement>(`[name="lim-${k}"]`)!.value) || 0]),
    );
  const recheck = wordsCheck({
    area: custom,
    count: document.createElement("span"),
    bad: q("#custom-bad"),
    preview: q("#custom-preview"),
  });
  recheck();

  // несохранённое: полоска с кнопкой, заголовки разделов сразу показывают новое значение
  let dirty = false,
    leaving = false;
  const setDirty = (on: boolean) => {
    dirty = on;
    leaving = false;
    window.onbeforeunload = on ? (e) => e.preventDefault() : null;
  };
  setLeaveGuard(() => {
    if (!dirty || leaving) return false;
    leaving = true;
    bar.hidden = false;
    msg(m, "Изменения не сохранены. Сохраните — или перейдите ещё раз, чтобы уйти без сохранения.", "err");
    bar.scrollIntoView({ block: "nearest" });
    return true;
  });
  const titles = () => {
    q("#sv-words").textContent = nameOf(MODES, picked("words"));
    q("#sv-answer").textContent = nameOf(ANSWERS, picked("answer"));
    q("#sv-custom").textContent = customText(custom.value);
    q("#sv-lim").textContent = limText(limNow());
  };
  form.addEventListener("input", () => {
    setDirty(true);
    titles();
    bar.hidden = false;
    msg(m, "Не сохранено.", "");
  });
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const words = picked("words"),
      answer = picked("answer") as AnswerMode,
      customWords = custom.value,
      { bad } = recheck();
    const settings: TutorSettings = {
      ...(words ? { words } : {}),
      customWords,
      lim: limNow(),
      ...(answer ? { answer } : {}),
    };
    try {
      await api("PATCH", `/tutor/students/${s.id}`, { settings });
      s.settings = settings;
      setDirty(false);
      bar.hidden = false;
      msg(
        m,
        bad.length
          ? `Сохранено, но ${bad.length} ${plural(bad.length, ["строку", "строки", "строк"])} в «Моих словах» игра не поймёт и пропустит.`
          : "Сохранено. Ученик получит настройки при следующем запуске игры.",
        bad.length ? "err" : "okm",
      );
    } catch {
      msg(m, "Не получилось сохранить. Проверьте сеть и попробуйте ещё раз.", "err");
    }
  };

  bindAccess(s);
  q<HTMLFormElement>("#rename").onsubmit = async (ev) => {
    ev.preventDefault();
    const name = q<HTMLInputElement>("#name").value.trim();
    if (!name) return msg(q("#name-msg"), "Впишите имя.", "err");
    if (name === s.name) return;
    try {
      await api("PATCH", `/tutor/students/${s.id}`, { name });
      reload();
    } catch {
      msg(q("#name-msg"), "Не получилось переименовать. Проверьте сеть и попробуйте ещё раз.", "err");
    }
  };
  let delArm = false;
  q<HTMLButtonElement>("#delete").onclick = async () => {
    if (!delArm) {
      delArm = true;
      return msg(q("#del-msg"), "Весь прогресс ученика на сервере будет удалён. Нажмите ещё раз.", "err");
    }
    try {
      await api("DELETE", `/tutor/students/${s.id}`);
      setDirty(false);
      location.hash = "#/";
    } catch {
      msg(q("#del-msg"), "Не получилось удалить. Проверьте сеть и попробуйте ещё раз.", "err");
    }
  };
}
