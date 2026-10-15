// Задания в кабинете: конструктор, список со статусами и отчёт по каждому.
// Статус берётся из синхронизированного профиля ученика (P.tasks): без новых запросов и поллинга.
import type { Student, Task, TaskInput } from "@repetitor/shared";
import { esc } from "../lib/dom.js";
import { today } from "../lib/date.js";
import { parseEntry } from "../topics/words/parse.ts";
import {
  DEFAULT_CONGRATS,
  GUARD_FORGIVES,
  hardestWords,
  monsters,
  shortDate,
  taskEntries,
  taskStatus,
} from "../progress/taskrules.ts";
import { DICT, api, hardWords, msg, plural, q, rawOf } from "./common.ts";

const MAX_WORDS = 40;
const DEFAULT_COINS = 150;

/** Слова, которые «Дать заданием» передаёт из обзора в конструктор. */
let prefill: string[] | null = null;
export const setPrefill = (words: string[]) => (prefill = words);

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

/** Короткая сводка для обзора: открытые и запланированные задания. */
export function tasksSummary(s: Student): string {
  const d = today(),
    rows = (s.tasks || [])
      .map((t) => ({ t, st: taskStatus(t, progressOf(s, t), d) }))
      .filter((x) => x.st.state === "open" || x.st.state === "planned");
  if (!rows.length) return `<p class="note">Открытых заданий нет.</p>`;
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
    ${n ? `<p class="twords">${t.words.map((w) => esc(w)).join(", ")}</p>` : ""}
    ${reportHTML(s, t)}
    <div class="row"><button class="btn small" data-edit="${esc(t.id)}">Изменить</button><button class="link" data-del="${esc(t.id)}">Удалить</button><span class="msg" data-delmsg="${esc(t.id)}"></span></div>
  </div>`;
}

function formHTML(): string {
  return `<form class="panel tform" id="tform">
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
      <p class="msg" id="t-bad"></p>
    </div>
    <fieldset class="tfield">
      <legend class="tlabel">Когда</legend>
      <label class="tinline"><input type="radio" name="t-when" value="now" checked /> сразу</label>
      <label class="tinline"><input type="radio" name="t-when" value="date" /> с даты <input id="t-from" type="date" /></label>
      <label class="tinline">до (необязательно) <input id="t-until" type="date" /></label>
    </fieldset>
    <fieldset class="tfield">
      <legend class="tlabel">Награда</legend>
      <label class="tinline"><input id="t-coins" type="number" min="0" max="1000" step="10" value="${DEFAULT_COINS}" /> монет <small class="note">150 ≈ день игры</small></label>
      <label class="tinline"><input id="t-chest" type="checkbox" checked /> большой сундук</label>
      <label class="tinline"><input id="t-medal" type="checkbox" checked /> именная медаль</label>
    </fieldset>
    <label>Напутствие на записке <small class="note">(необязательно)</small><textarea id="t-note" rows="2" maxlength="300" placeholder="Не торопись, читай слово целиком!"></textarea></label>
    <label>Поздравление после победы <input id="t-congrats" type="text" maxlength="200" placeholder="${esc(DEFAULT_CONGRATS)}" /></label>
    <p class="note">У каждого слова — монстр с тремя сердечками: верный ответ снимает одно, ошибка возвращает все. Когда все побеждены, выходит Хранитель: все слова по разу, прощает ${GUARD_FORGIVES} ошибки.</p>
    <div class="row"><button class="btn primary" type="submit" id="t-save">Задать</button><button class="link" type="button" id="t-cancel" hidden>Отмена</button><span class="msg" id="t-msg"></span></div>
  </form>`;
}

/** Вкладка «Задания»: root — контейнер вкладки, reload — перечитать ученика и перерисовать. */
export function renderTasksTab(root: HTMLElement, s: Student, reload: () => void) {
  const list = [...(s.tasks || [])].reverse();
  // сначала задания со статусами (их смотрят чаще), под ними конструктор
  root.innerHTML = `${
    list.length
      ? `<div class="panel"><h2>Задания (${list.length})</h2>${list.map((t) => taskCard(s, t)).join("")}</div>`
      : ""
  }${formHTML()}`;

  let editing: Task | null = null;
  const words = q<HTMLTextAreaElement>("#t-words");
  const lines = () =>
    words.value
      .split(/\n|,/)
      .map((l) => l.trim())
      .filter(Boolean);
  const recount = () => {
    const ls = lines(),
      bad = ls.filter((l) => !parseEntry(l));
    const n = ls.length - bad.length;
    q("#t-count").textContent = n ? `${n} ${plural(n, ["слово", "слова", "слов"])}` : "";
    msg(
      q("#t-bad"),
      bad.length
        ? `Не понял: ${bad.slice(0, 4).join(", ")}${bad.length > 4 ? "…" : ""}. Нужна трудная буква в скобках.`
        : ls.length > MAX_WORDS
          ? `Больше ${MAX_WORDS} слов не поместится в одно задание.`
          : "",
      bad.length || ls.length > MAX_WORDS ? "err" : "",
    );
  };
  const add = (raws: string[]) => {
    const have = new Set(lines().map((l) => parseEntry(l)?.word ?? l));
    const fresh = raws.filter((r) => !have.has(parseEntry(r)?.word ?? r));
    if (fresh.length) words.value = [...lines(), ...fresh].join("\n");
    recount();
  };
  words.oninput = recount;

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
    hardWords(s)
      .map(([w]) => rawOf(w, s.settings?.customWords))
      .filter((r): r is string => !!r);
  q<HTMLButtonElement>("#t-hard").disabled = !hardRaws().length;
  q<HTMLButtonElement>("#t-hard").onclick = () => add(hardRaws().slice(0, 10));

  const fill = (t: Partial<Task> | null) => {
    editing = t && t.id ? (t as Task) : null;
    q("#tform-h").textContent = editing ? `Изменить: ${editing.title}` : "Новое задание";
    q("#t-save").textContent = editing ? "Сохранить" : "Задать";
    q("#t-cancel").hidden = !editing;
    q<HTMLInputElement>("#t-title").value = t?.title ?? "";
    words.value = (t?.words ?? []).join("\n");
    q<HTMLInputElement>(`[name="t-when"][value="${t?.from ? "date" : "now"}"]`).checked = true;
    q<HTMLInputElement>("#t-from").value = t?.from ?? tomorrow();
    q<HTMLInputElement>("#t-until").value = t?.until ?? "";
    q<HTMLInputElement>("#t-coins").value = String(t?.coins ?? DEFAULT_COINS);
    q<HTMLInputElement>("#t-chest").checked = t ? !!t.chest : true;
    q<HTMLInputElement>("#t-medal").checked = t ? !!t.medal : true;
    q<HTMLTextAreaElement>("#t-note").value = t?.note ?? "";
    q<HTMLInputElement>("#t-congrats").value = t?.congrats ?? "";
    recount();
  };
  fill(prefill ? { words: prefill } : null);
  if (prefill) {
    prefill = null;
    q<HTMLInputElement>("#t-title").focus();
  }
  q("#t-from").onfocus = () => (q<HTMLInputElement>('[name="t-when"][value="date"]').checked = true);
  q<HTMLButtonElement>("#t-cancel").onclick = () => fill(null);

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
      reload();
    } catch {
      msg(m, "Не получилось сохранить. Попробуйте ещё раз.", "err");
    }
  };

  root.querySelectorAll<HTMLButtonElement>("[data-edit]").forEach(
    (b) =>
      (b.onclick = () => {
        fill(s.tasks.find((t) => t.id === b.dataset.edit) || null);
        q("#tform").scrollIntoView({ behavior: "smooth", block: "start" });
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
