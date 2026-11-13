// Задания в кабинете: текущие задания со статусами и отчётом, прошлые (сделанные и с прошедшим сроком) —
// в свёрнутом блоке, конструктор — за кнопкой «+ Новое задание». Новое задание можно задать сразу нескольким
// ученикам, старое — повторить. Статус берётся из синхронизированного профиля ученика (P.tasks):
// без новых запросов и поллинга.
import type { Student, Task, TaskInput } from "@repetitor/shared";
import { esc } from "../lib/dom.js";
import { today } from "../lib/date.js";
import { parseEntry, splitEntries } from "../topics/words/parse.ts";
import {
  DEFAULT_CONGRATS,
  GUARD_FORGIVES,
  hardestWords,
  monsters,
  shortDate,
  taskEntries,
  taskStatus,
} from "../progress/taskrules.ts";
import { DICT, api, hardNow, knownStudents, loadStudents, msg, plural, q, rawOf } from "./common.ts";
import { wordsCheck } from "./settings.ts";

const MAX_WORDS = 40;
const DEFAULT_COINS = 150;

/** Слова, которые «Дать заданием» передаёт из обзора в конструктор. */
let prefill: string[] | null = null;
export const setPrefill = (words: string[]) => (prefill = words);
/** Что сказать после перезагрузки вкладки («Задано ещё двум ученикам: …»). */
let flash: { text: string; kind: "okm" | "err" } | null = null;

const progressOf = (s: Student, t: Task) => s.profile?.tasks?.[t.id];
const tomorrow = () => {
  const d = new Date(today() + "T12:00:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

/** Самое важное задание для колонки в списке: «Удвоенные 5/8», «сделано ✓», «откроется чт». */
export function taskCell(s: Student): { text: string; cls: string } {
  const d = today(),
    list = (s.tasks || []).map((t) => ({ t, st: taskStatus(t, progressOf(s, t), d) }));
  const open = list.find((x) => x.st.state === "open");
  const short = (t: Task) => (t.title.length > 16 ? t.title.slice(0, 15) + "…" : t.title);
  if (open) {
    const { beaten, total } = monsters(open.t, progressOf(s, open.t));
    return { text: total ? `${short(open.t)} ${beaten}/${total}` : `${short(open.t)}: подарок`, cls: "" };
  }
  const planned = list.find((x) => x.st.state === "planned");
  if (planned) return { text: `${short(planned.t)}: ${planned.st.text}`, cls: "soft" };
  if (list.some((x) => x.st.state === "done")) return { text: "сделано ✓", cls: "good" };
  return { text: "—", cls: "" };
}

/** Короткая сводка для обзора: открытые и запланированные задания; пусто — таких нет. */
export function tasksSummary(s: Student): string {
  const d = today(),
    rows = (s.tasks || [])
      .map((t) => ({ t, st: taskStatus(t, progressOf(s, t), d) }))
      .filter((x) => x.st.state === "open" || x.st.state === "planned");
  if (!rows.length) return "";
  return `<ul class="task-mini">${rows
    .map((x) => `<li><b>${esc(x.t.title)}</b> <span class="tstate ${x.st.state}">${esc(x.st.text)}</span></li>`)
    .join("")}</ul>`;
}

function reportHTML(s: Student, t: Task): string {
  const p = progressOf(s, t);
  if (!t.words.length) return "";
  if (!p || (!p.right && !Object.keys(p.wrong).length)) return `<p class="note">Ученик ещё не начинал.</p>`;
  const errs = Object.values(p.wrong).reduce((a, b) => a + b, 0),
    hard = hardestWords(p).filter(([, n]) => n > 0);
  const guard = p.done
    ? `Хранитель пройден ${p.guard <= 1 ? "с первой попытки" : `с ${p.guard}-й попытки`}`
    : p.guard
      ? `Хранитель: ${p.guard} ${plural(p.guard, ["попытка", "попытки", "попыток"])}`
      : "";
  return `<p class="treport">Верных ответов: <b>${p.right}</b> · ошибок: <b>${errs}</b>${guard ? ` · ${guard}` : ""}</p>
    ${hard.length ? `<p class="treport">Дольше всех держались: ${hard.map(([w, n]) => `<b>${esc(w)}</b> <small>×${n}</small>`).join(", ")}</p>` : ""}`;
}

function taskCard(s: Student, t: Task): string {
  const st = taskStatus(t, progressOf(s, t), today()),
    n = taskEntries(t).length;
  const when = [
    t.from ? `с ${shortDate(t.from, today())}` : "сразу",
    t.until ? `до ${shortDate(t.until, today())}` : "",
  ].filter(Boolean);
  const prize = [t.coins ? `${t.coins} монет` : "", t.chest ? "большой сундук" : "", t.medal ? "медаль" : ""].filter(
    Boolean,
  );
  return `<div class="tcard-t" data-task="${esc(t.id)}">
    <div class="row tcard-head"><b>${esc(t.title)}</b><span class="tstate ${st.state}">${esc(st.text)}</span></div>
    <p class="note">${n ? `${n} ${plural(n, ["слово", "слова", "слов"])}` : "подарок без слов"} · ${esc(when.join(" "))} · ${esc(prize.join(", ") || "без награды")}</p>
    ${
      n
        ? `<p class="twords">${taskEntries(t)
            .map((e) => esc(e.word))
            .join(", ")}</p>`
        : ""
    }
    ${reportHTML(s, t)}
    <div class="row"><button class="btn small" data-edit="${esc(t.id)}">Изменить</button><button class="link" data-again="${esc(t.id)}">Повторить</button><button class="link" data-del="${esc(t.id)}">Удалить</button><span class="msg" data-delmsg="${esc(t.id)}"></span></div>
  </div>`;
}

function formHTML(): string {
  return `<form class="panel tform" id="tform" hidden>
    <h2 id="tform-h">Новое задание</h2>
    <label>Название <input id="t-title" type="text" maxlength="60" placeholder="Удвоенные согласные" /></label>
    <div class="tfield">
      <span class="tlabel">Слова <small id="t-count"></small></span>
      <div class="row tsearch">
        <input id="t-find" type="search" placeholder="Найти в словаре: бер…" autocomplete="off" aria-label="Найти слово в словаре" />
        <button class="btn small" type="button" id="t-hard">+ трудные слова ученика</button>
      </div>
      <div class="tsuggest" id="t-suggest"></div>
      <textarea id="t-words" rows="7" placeholder="б(е)рёза&#10;кла(сс)&#10;м(о/а)локо"></textarea>
      <p class="note">Одно слово в строке, трудная буква в скобках: м(о)локо, ловушка через черту: м(о/а)локо. Без слов задание — просто подарок.</p>
      <p class="note">Подсказка после «|»: м(о)локо | корова мычит: мо-о — ученик увидит её только после ошибки.</p>
      <p class="msg" id="t-bad"></p>
      <div id="t-preview"></div>
    </div>
    <fieldset class="tfield trow">
      <legend class="tlabel">Когда</legend>
      <label class="tinline"><input type="radio" name="t-when" value="now" checked /> сразу</label>
      <label class="tinline"><input type="radio" name="t-when" value="date" /> с даты <input id="t-from" type="date" /></label>
      <label class="tinline">до (необязательно) <input id="t-until" type="date" /></label>
    </fieldset>
    <fieldset class="tfield trow">
      <legend class="tlabel">Награда</legend>
      <label class="tinline"><input id="t-coins" type="number" min="0" max="1000" step="10" value="${DEFAULT_COINS}" /> монет <small class="note">150 ≈ день игры</small></label>
      <label class="tinline"><input id="t-chest" type="checkbox" checked /> большой сундук</label>
      <label class="tinline"><input id="t-medal" type="checkbox" checked /> именная медаль</label>
    </fieldset>
    <details class="fold" id="t-texts">
      <summary>Напутствие и поздравление <small class="note">(необязательно)</small></summary>
      <div class="tfield">
        <label>Напутствие на записке<textarea id="t-note" rows="2" maxlength="300" placeholder="Не торопись, читай слово целиком!"></textarea></label>
        <label>Поздравление после победы <input id="t-congrats" type="text" maxlength="200" placeholder="${esc(DEFAULT_CONGRATS)}" /></label>
      </div>
    </details>
    <details class="fold" id="t-others">
      <summary>Задать и другим ученикам <b id="t-others-n"></b></summary>
      <div class="wchips" id="t-others-list"><span class="note">Загружаю…</span></div>
    </details>
    <p class="note">У каждого слова — монстр с тремя сердечками: верный ответ снимает одно, ошибка возвращает все. Когда все побеждены, выходит Хранитель: все слова по разу, прощает ${GUARD_FORGIVES} ошибки.</p>
    <div class="row"><button class="btn primary" type="submit" id="t-save">Задать</button><button class="link" type="button" id="t-cancel">Отмена</button><span class="msg" id="t-msg"></span></div>
  </form>`;
}

/** Вкладка «Задания»: root — контейнер вкладки, reload — перечитать ученика и перерисовать. */
export function renderTasksTab(root: HTMLElement, s: Student, reload: () => void) {
  const d = today(),
    all = [...(s.tasks || [])].reverse(),
    isPast = (t: Task) => ["done", "expired"].includes(taskStatus(t, progressOf(s, t), d).state),
    now = all.filter((t) => !isPast(t)),
    past = all.filter(isPast);
  // сверху кнопка и (по ней) конструктор, потом текущие задания; прошлые свёрнуты
  root.innerHTML = `
    <div class="row"><button class="btn primary small" type="button" id="t-new">+ Новое задание</button><span class="msg ${flash?.kind ?? ""}" id="t-flash">${esc(flash?.text ?? "")}</span></div>
    ${formHTML()}
    ${
      now.length
        ? `<div class="panel"><h2>Сейчас (${now.length})</h2>${now.map((t) => taskCard(s, t)).join("")}</div>`
        : all.length
          ? `<p class="note">Открытых заданий нет.</p>`
          : ""
    }
    ${
      past.length
        ? `<details class="panel sect" id="t-past"><summary><b>Прошлые</b><span class="sv">${past.length} · сделанные и с прошедшим сроком</span></summary>
            <div class="sect-in">${past.map((t) => taskCard(s, t)).join("")}</div></details>`
        : ""
    }`;
  flash = null;

  let editing: Task | null = null;
  const form = q<HTMLFormElement>("#tform"),
    words = q<HTMLTextAreaElement>("#t-words");
  const lines = () => splitEntries(words.value);
  const recount = wordsCheck({
    area: words,
    count: q("#t-count"),
    bad: q("#t-bad"),
    preview: q("#t-preview"),
    max: MAX_WORDS,
  });
  const add = (raws: string[]) => {
    const have = new Set(lines().map((l) => parseEntry(l)?.word ?? l));
    const fresh = raws.filter((r) => !have.has(parseEntry(r)?.word ?? r));
    if (fresh.length) words.value = [...lines(), ...fresh].join("\n");
    recount();
  };

  // поиск по словарю: «бер» → берёза; нажатие добавляет слово
  const find = q<HTMLInputElement>("#t-find");
  find.oninput = () => {
    const v = find.value.trim().toLowerCase().replace(/ё/g, "е");
    const hits = v ? DICT.filter((e) => e.word.toLowerCase().replace(/ё/g, "е").startsWith(v)).slice(0, 8) : [];
    q("#t-suggest").innerHTML = hits
      .map((e) => `<button type="button" class="chip tsug" data-raw="${esc(e.raw)}">${esc(e.word)}</button>`)
      .join("");
    q("#t-suggest")
      .querySelectorAll<HTMLButtonElement>("[data-raw]")
      .forEach(
        (b) =>
          (b.onclick = () => {
            add([b.dataset.raw!]);
            find.value = "";
            q("#t-suggest").innerHTML = "";
            find.focus();
          }),
      );
  };
  find.onkeydown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    q<HTMLButtonElement>("#t-suggest [data-raw]")?.click();
  };
  const hardRaws = () =>
    hardNow(s)
      .map(([w]) => rawOf(w, s.settings?.customWords))
      .filter((r): r is string => !!r);
  q<HTMLButtonElement>("#t-hard").disabled = !hardRaws().length;
  q<HTMLButtonElement>("#t-hard").onclick = () => add(hardRaws().slice(0, 10));

  // другие ученики: список подгружается, когда блок раскрыли (обычно он уже есть — из списка учеников)
  const others = q<HTMLDetailsElement>("#t-others");
  const picked = () =>
    [...others.querySelectorAll<HTMLInputElement>("input:checked")].map((c) => ({
      id: c.value,
      name: c.dataset.name!,
    }));
  let alone = false; // других учеников нет — блок не нужен
  const showOthers = (list: Student[]) => {
    const rest = list.filter((x) => x.id !== s.id);
    alone = !rest.length;
    if (alone) return (others.hidden = true);
    q("#t-others-list").innerHTML = rest
      .map(
        (x) =>
          `<label class="wchip"><input type="checkbox" value="${esc(x.id)}" data-name="${esc(x.name)}" />${esc(x.name)}</label>`,
      )
      .join("");
    others.onchange = () => (q("#t-others-n").textContent = picked().length ? String(picked().length) : "");
  };
  const known = knownStudents();
  if (known) showOthers(known);
  else
    others.ontoggle = async () => {
      if (!others.open || others.dataset.loaded) return;
      others.dataset.loaded = "1";
      try {
        showOthers(await loadStudents());
      } catch {
        q("#t-others-list").innerHTML = `<span class="note">Не получилось загрузить учеников.</span>`;
      }
    };

  /** Открыть конструктор: пустой, с заготовкой (слова из обзора, «Повторить») или с заданием на правку. */
  const fill = (t: Partial<Task> | null) => {
    editing = t && t.id ? (t as Task) : null;
    form.hidden = false;
    q("#t-new").hidden = true;
    q("#tform-h").textContent = editing ? `Изменить: ${editing.title}` : "Новое задание";
    q("#t-save").textContent = editing ? "Сохранить" : "Задать";
    // правка — только этого задания у этого ученика
    others.hidden = !!editing || alone;
    q<HTMLInputElement>("#t-title").value = t?.title ?? "";
    words.value = (t?.words ?? []).join("\n");
    q<HTMLInputElement>(`[name="t-when"][value="${t?.from ? "date" : "now"}"]`).checked = true;
    q<HTMLInputElement>("#t-from").value = t?.from ?? tomorrow();
    q<HTMLInputElement>("#t-until").value = t?.until ?? "";
    q<HTMLInputElement>("#t-coins").value = String(t?.coins ?? DEFAULT_COINS);
    // пустой конструктор и заготовка из одних слов — награда по умолчанию; правка и «Повторить» — как было
    const blank = !t || !("coins" in t);
    q<HTMLInputElement>("#t-chest").checked = blank || !!t.chest;
    q<HTMLInputElement>("#t-medal").checked = blank || !!t.medal;
    q<HTMLTextAreaElement>("#t-note").value = t?.note ?? "";
    q<HTMLInputElement>("#t-congrats").value = t?.congrats ?? "";
    q<HTMLDetailsElement>("#t-texts").open = !!(t?.note || t?.congrats);
    msg(q("#t-msg"), "");
    recount();
  };
  const close = () => {
    editing = null;
    form.hidden = true;
    q("#t-new").hidden = false;
  };
  q<HTMLButtonElement>("#t-new").onclick = () => {
    fill(null);
    q<HTMLInputElement>("#t-title").focus();
  };
  q<HTMLButtonElement>("#t-cancel").onclick = close;
  q("#t-from").onfocus = () => (q<HTMLInputElement>('[name="t-when"][value="date"]').checked = true);
  if (prefill) {
    fill({ words: prefill });
    prefill = null;
    q<HTMLInputElement>("#t-title").focus();
  } else if (!all.length) fill(null); // заданий ещё нет — сразу конструктор

  q<HTMLFormElement>("#tform").onsubmit = async (ev) => {
    ev.preventDefault();
    const m = q("#t-msg");
    const title = q<HTMLInputElement>("#t-title").value.trim();
    const ws = lines();
    if (!title) return msg(m, "Впишите название.", "err");
    if (ws.some((l) => !parseEntry(l))) return msg(m, "Поправьте слова, которые я не понял.", "err");
    if (ws.length > MAX_WORDS) return msg(m, `Не больше ${MAX_WORDS} слов.`, "err");
    const coins = Math.round(Number(q<HTMLInputElement>("#t-coins").value) || 0);
    if (coins < 0 || coins > 1000) return msg(m, "Монет — от 0 до 1000.", "err");
    const byDate = q<HTMLInputElement>('[name="t-when"][value="date"]').checked;
    const from = byDate ? q<HTMLInputElement>("#t-from").value : "";
    const until = q<HTMLInputElement>("#t-until").value;
    if (byDate && !from) return msg(m, "Выберите дату, с которой открыть задание.", "err");
    if (until && until < (from || today())) return msg(m, "«До» раньше, чем задание откроется.", "err");
    const chest = q<HTMLInputElement>("#t-chest").checked,
      medal = q<HTMLInputElement>("#t-medal").checked;
    if (!ws.length && !coins && !chest && !medal) return msg(m, "В подарке без слов должна быть награда.", "err");
    const body: TaskInput = {
      title,
      words: ws,
      coins,
      ...(from ? { from } : {}),
      ...(until ? { until } : {}),
      ...(chest ? { chest } : {}),
      ...(medal ? { medal } : {}),
      note: q<HTMLTextAreaElement>("#t-note").value.trim(),
      congrats: q<HTMLInputElement>("#t-congrats").value.trim(),
    };
    try {
      if (editing) await api("PUT", `/tutor/students/${s.id}/tasks/${editing.id}`, body);
      else await api("POST", `/tutor/students/${s.id}/tasks`, body);
    } catch {
      return msg(m, "Не получилось сохранить. Попробуйте ещё раз.", "err");
    }
    // то же задание другим ученикам: по одному запросу на ученика, неудачи называем по именам
    const also = editing ? [] : picked();
    if (also.length) {
      msg(m, "Задаю другим ученикам…");
      const ok: string[] = [],
        failed: string[] = [];
      for (const x of also)
        try {
          await api("POST", `/tutor/students/${x.id}/tasks`, body);
          ok.push(x.name);
        } catch {
          failed.push(x.name);
        }
      flash = failed.length
        ? { text: `Задано не всем. Не получилось: ${failed.join(", ")}.`, kind: "err" }
        : { text: `Задано и другим: ${ok.join(", ")}.`, kind: "okm" };
    }
    reload();
  };

  root.querySelectorAll<HTMLButtonElement>("[data-edit]").forEach(
    (b) =>
      (b.onclick = () => {
        fill(s.tasks.find((t) => t.id === b.dataset.edit) || null);
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      }),
  );
  // «Повторить»: новое задание с теми же словами и наградой, даты — заново
  root.querySelectorAll<HTMLButtonElement>("[data-again]").forEach(
    (b) =>
      (b.onclick = () => {
        const t = s.tasks.find((x) => x.id === b.dataset.again);
        if (!t) return;
        const { id: _id, createdAt: _at, from: _from, until: _until, ...copy } = t;
        fill(copy);
        form.scrollIntoView({ behavior: "smooth", block: "start" });
        q<HTMLInputElement>("#t-title").focus();
      }),
  );
  const armed = new Set<string>();
  root.querySelectorAll<HTMLButtonElement>("[data-del]").forEach(
    (b) =>
      (b.onclick = async () => {
        const id = b.dataset.del!,
          m = root.querySelector(`[data-delmsg="${id}"]`);
        if (!armed.has(id)) {
          armed.add(id);
          return msg(m, "Задание пропадёт у ученика (медаль, если получена, останется). Нажмите ещё раз.", "err");
        }
        try {
          await api("DELETE", `/tutor/students/${s.id}/tasks/${id}`);
          reload();
        } catch {
          msg(m, "Не получилось удалить.", "err");
        }
      }),
  );
}
