// Подключение кнопок, PIN, анимация героя, история, коды сохранения, старт.
import "./styles/main.css";
import "./core/helpers.js";
import "./data/words.js";
import "./data/sprites.js";
import "./data/bosses.js";
import "./data/items.js";
import "./hero.js";
import "./core/profile.js";
import "./core/levels.js";
import "./core/sound.js";
import "./core/rewards.js";
import "./screens/home.js";
import "./game.js";
import "./screens/teacher.js";

import { $, esc, pick, show, toast, towerOpen } from "./core/helpers.js";
import { parseEntry } from "./data/words.js";
import { BOSSES, drawBoss } from "./data/bosses.js";
import { ITEM } from "./data/items.js";
import { drawHero } from "./hero.js";
import { LS, P, customRaw, save, setCustomRaw, settings, stats } from "./core/profile.js";
import { levelOf } from "./core/levels.js";
import { TRACKS, TRACK_ORDER, sfx, silentEl, startMusic, stopMusic, tone, unlockAudio } from "./core/sound.js";
import { checkAch, hash, renderTrophies } from "./core/rewards.js";
import { frontier, openShop, renderAwards, renderHome, tryOn } from "./screens/home.js";
import {
  G,
  answer,
  bossCv,
  customPool,
  heroCv,
  home,
  rel,
  say,
  startCampaign,
  startTower,
  startTraining,
  stopGame,
  syncDiff,
  typed,
} from "./game.js";
import { blockedToday, renderTeacher, saveSettings } from "./screens/teacher.js";

$("btn-campaign").onclick = () => {
  if (!blockedToday()) startCampaign(frontier());
};
$("btn-tower").onclick = () => {
  if (towerOpen() && !blockedToday()) startTower();
};
$("btn-shop").onclick = $("btn-end-shop").onclick = openShop;
$("btn-shop-back").onclick = home;
$("btn-awards").onclick = () => {
  renderAwards();
  show("s-awards");
};
$("btn-aw-back").onclick = home;
$("btn-trophy").onclick = () => {
  renderTrophies();
  show("s-trophy");
};
$("btn-tr-back").onclick = home;
$("btn-train-err").onclick = () => {
  if (!blockedToday()) startTraining("err");
};
$("btn-train-new").onclick = () => {
  if (!blockedToday()) startTraining("new");
};
$("btn-again").onclick = () => {
  const k = G && G.kind,
    t = G && G.trainKind;
  stopGame();
  if (blockedToday()) return;
  k === "tower" ? startTower() : k === "training" ? startTraining(t) : startCampaign(frontier());
};
$("btn-home").onclick = home;
$("btn-quit").onclick = home;
$("btn-back").onclick = home;
const pinHash = (v) => String(hash("sb-pin:" + v));
export const getPin = () => LS.get("sb_pin", "");
function openTeacher() {
  if (getPin()) {
    $("pin-in").value = "";
    $("pin-msg").textContent = "";
    show("s-pin");
    setTimeout(() => {
      try {
        $("pin-in").focus();
      } catch (e) {}
    }, 50);
  } else {
    renderTeacher();
    show("s-teacher");
  }
}
let pinFails = 0,
  pinLockUntil = 0;
$("pin-form").onsubmit = (ev) => {
  ev.preventDefault();
  if (Date.now() < pinLockUntil) {
    $("pin-msg").textContent = "Слишком много попыток. Подождите минуту.";
    return;
  }
  if (pinHash($("pin-in").value.trim()) === getPin()) {
    pinFails = 0;
    renderTeacher();
    show("s-teacher");
    return;
  }
  pinFails++;
  $("pin-in").value = "";
  if (pinFails >= 5) {
    pinLockUntil = Date.now() + 60000;
    pinFails = 0;
    $("pin-msg").textContent = "Неверно. Вход закрыт на минуту.";
  } else $("pin-msg").textContent = "Неверный PIN-код.";
};
$("btn-pin-back").onclick = home;
$("btn-pin-set").onclick = () => {
  const v = $("pin-new").value.trim(),
    m = $("pin-set-msg");
  if (!/^\d{4,8}$/.test(v)) {
    m.className = "msg err";
    m.textContent = "PIN: от 4 до 8 цифр.";
    return;
  }
  LS.set("sb_pin", pinHash(v));
  $("pin-new").value = "";
  renderTeacher();
  $("pin-set-msg").className = "msg okm";
  $("pin-set-msg").textContent = "PIN поставлен. Запомните его!";
};
$("btn-pin-off").onclick = () => {
  LS.set("sb_pin", "");
  renderTeacher();
  $("pin-set-msg").className = "msg okm";
  $("pin-set-msg").textContent = "PIN убран.";
};
$("btn-teacher-1").onclick = openTeacher;
$("opt0").onclick = () => answer(0);
$("opt1").onclick = () => answer(1);
$("typer").onsubmit = (ev) => {
  ev.preventDefault();
  typed($("type-in").value);
};
// tapping "Удар!" must not steal focus from the input: otherwise the phone keyboard closes and reopens every word
$("type-go").addEventListener("pointerdown", (e) => e.preventDefault());
$("type-go").addEventListener("mousedown", (e) => e.preventDefault());
const muteLabel = () => {
  ["btn-mute", "btn-mute-home"].forEach((id) => ($(id).textContent = "Звук: " + (settings.muted ? "выкл" : "вкл")));
  ["btn-music", "btn-music-home"].forEach(
    (id) => ($(id).textContent = "Музыка: " + (settings.music ? (TRACKS[settings.track] || TRACKS.calm).name : "выкл")),
  );
};
$("btn-mute").onclick = $("btn-mute-home").onclick = () => {
  settings.muted = !settings.muted;
  saveSettings();
  muteLabel();
  if (settings.muted) {
    stopMusic();
    if (silentEl) silentEl.pause();
  } else {
    unlockAudio();
    sfx.coin();
    if (G && !$("s-game").hidden) startMusic();
  }
};
$("btn-music").onclick = $("btn-music-home").onclick = () => {
  // cycle: track 1 → track 2 → track 3 → off → track 1
  if (!settings.music) {
    settings.music = true;
    settings.track = TRACK_ORDER[0];
  } else {
    const i = TRACK_ORDER.indexOf(settings.track);
    if (i >= TRACK_ORDER.length - 1) settings.music = false;
    else settings.track = TRACK_ORDER[i + 1];
  }
  saveSettings();
  muteLabel();
  stopMusic();
  if (settings.music && G && !$("s-game").hidden) {
    unlockAudio();
    setTimeout(startMusic, 450);
  }
};
muteLabel();
document.querySelectorAll('input[name="play"]').forEach(
  (r) =>
    (r.onchange = () => {
      settings.play = r.value;
      saveSettings();
    }),
);
document.querySelectorAll('input[name="diff"]').forEach(
  (r) =>
    (r.onchange = () => {
      settings.words = r.value;
      saveSettings();
    }),
);
document.querySelectorAll('input[name="words"]').forEach(
  (r) =>
    (r.onchange = () => {
      settings.words = r.value;
      saveSettings();
      syncDiff();
      if (r.value === "custom" && !customPool().length) {
        $("save-msg").className = "msg err";
        $("save-msg").textContent = "Сначала добавьте свои слова, пока будут стандартные.";
      }
    }),
);
$("opt-timer").onchange = (e) => {
  settings.timer = e.target.checked;
  saveSettings();
};
$("btn-gift").onclick = () => {
  const n = Math.max(1, Math.min(1000000, parseInt($("gift-n").value, 10) || 0));
  P.coins += n;
  save();
  $("gift-msg").className = "msg okm";
  $("gift-msg").textContent = `Выдано ${n} монет`;
  toast(`Учитель наградил тебя: +${n} монет!`, "quest");
  sfx.coin();
  renderTeacher();
  $("gift-msg").className = "msg okm";
  $("gift-msg").textContent = `Выдано ${n} монет`;
};
$("btn-save").onclick = () => {
  const lines = $("custom")
    .value.split(/\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
  const bad = lines.filter((l) => !parseEntry(l));
  setCustomRaw($("custom").value);
  LS.set("sb_custom", customRaw);
  const n = lines.length - bad.length,
    msg = $("save-msg");
  if (bad.length) {
    msg.className = "msg err";
    msg.textContent = `Сохранено слов: ${n}. Не понял: ${bad.slice(0, 4).join(", ")}${bad.length > 4 ? "…" : ""}. Нужны скобки, например м(о)локо.`;
  } else {
    msg.className = "msg okm";
    msg.textContent = `Сохранено слов: ${n}`;
  }
};
document.addEventListener("keydown", (e) => {
  if ($("s-game").hidden || !G) return;
  if (!$("boss-over").hidden) {
    if (e.key === "Enter") {
      const b = $("btn-fight") || $("btn-next");
      if (b && !$("boss-over").hidden) {
        e.preventDefault();
        b.click();
      }
    }
    return;
  }
  if (G.type) return;
  if (e.key === "1" || e.key === "ArrowLeft") answer(0);
  if (e.key === "2" || e.key === "ArrowRight") answer(1);
});

// live hero animation (aura + pet) for the big hero views
const HERO_ANIM = [
  { cv: $("home-hero"), wrap: $("home-aura"), eq: () => P.equip },
  {
    cv: heroCv,
    wrap: $("hero-aura"),
    eq: () =>
      G ? { ...P.equip, ...(G.swinging ? { weapon: "none" } : {}), ...(G.petBusy ? { pet: "nopet" } : {}) } : P.equip,
  },
  { cv: $("end-hero"), wrap: $("end-aura"), eq: () => P.equip },
  { cv: $("shop-hero"), wrap: $("shop-aura"), eq: () => (tryOn ? { ...P.equip, [ITEM[tryOn].slot]: tryOn } : P.equip) },
];
export let heroFrame = 0;
if (!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) {
  setInterval(() => {
    if (document.hidden) return;
    heroFrame++;
    HERO_ANIM.forEach((h) => {
      if (h.cv.offsetParent !== null) drawHero(h.cv, h.eq(), h.wrap, heroFrame);
    });
    if (G && G.boss && bossCv.offsetParent !== null && !bossCv.classList.contains("dead")) {
      const angry = G.hp > 0 && G.hp / G.boss.hp < 0.3;
      drawBoss(bossCv, G.boss, false, !angry && (heroFrame % 13 === 0 || heroFrame % 13 === 1), angry);
      if (angry && !G.angryShown) {
        G.angryShown = true;
        say(pick(["Ррр! Теперь я в ярости!", "Ну всё, держись!", "Я ЗОЛ! Очень ЗОЛ!"]));
        tone(110, 0.4, "sawtooth", 0.05, 70);
      }
      $("boss-wrap").classList.toggle("angry", angry);
      if (angry && heroFrame % 3 === 0) {
        const st = document.createElement("div");
        st.className = "steam";
        const br = rel(bossCv);
        st.style.left = br.x + br.w * (0.25 + Math.random() * 0.5) + "px";
        st.style.top = br.y + 4 + "px";
        $("arena").appendChild(st);
        setTimeout(() => st.remove(), 900);
      }
    }
  }, 170);
}

function showStory() {
  const nm = esc(P.name || "герой");
  const cast = [
    ["Ралина", "Репетитор Ралина"],
    ["Ангелика", "Ангел Ангелика"],
    ["Олеся", "Олеся Зоркая"],
    ["Король Ошибок", "Король Ошибок"],
  ];
  $("story-cast").innerHTML = cast.map(([t], i) => `<figure><canvas id="sc${i}"></canvas>${t}</figure>`).join("");
  cast.forEach(([, n], i) =>
    drawBoss(
      $("sc" + i),
      BOSSES.find((b) => b.name === n),
    ),
  );
  $("story-text").innerHTML = `
    <p>Давным-давно все слова жили в Великом Словаре, и каждая буква знала своё место.</p>
    <p>Но <b>Король Ошибок</b> терпеть не мог порядок. Он разорвал Словарь, а его монстры растащили страницы и перепутали буквы. С тех пор дети пишут «малако» и «сабака», а двойки размножаются.</p>
    <p><b>Репетитор Ралина</b> сберегла последнюю страницу и ищет героя, который вернёт буквы на места. Но сначала она проверит, готов ли ты, ${nm}.</p>
    <p>Король не дремлет: чарами Безграмотности он заколдовал близких Ралины. Её подругу, ангела <b>Ангелику</b>, и её сестру, отличницу <b>Олесю</b>. Победи их, и чары спадут.</p>
    <p>Собери страницы, расколдуй друзей и доберись до замка Короля. Удачи, ${nm}!</p>`;
  P.storySeen = 1;
  save();
  show("s-story");
}
$("btn-story").onclick = showStory;
$("btn-story-go").onclick = () => {
  renderHome();
  show("s-home");
};
/* ---------- save codes ---------- */
const b64u = (bytes) => {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const unb64u = (str) => {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str),
    out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};
const pipeBytes = (bytes, stream) =>
  new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then((b) => new Uint8Array(b));
async function packSave() {
  const raw = new TextEncoder().encode(JSON.stringify({ v: 1, p: P, s: stats }));
  try {
    return "SBZ" + b64u(await pipeBytes(raw, new CompressionStream("deflate-raw")));
  } catch (e) {
    return "SBJ" + b64u(raw);
  }
}
async function unpackSave(code) {
  code = String(code || "").replace(/\s+/g, "");
  const tag = code.slice(0, 3),
    body = code.slice(3);
  if ((tag !== "SBZ" && tag !== "SBJ") || !body) throw new Error("format");
  let bytes = unb64u(body);
  if (tag === "SBZ") bytes = await pipeBytes(bytes, new DecompressionStream("deflate-raw"));
  const d = JSON.parse(new TextDecoder().decode(bytes));
  if (!d || !d.p || typeof d.p.xp !== "number" || !Array.isArray(d.p.beaten)) throw new Error("data");
  return d;
}
let saveBack = "s-home",
  loadArm = null;
async function openSave(back) {
  saveBack = back;
  loadArm = null;
  $("save-copy-msg").textContent = "";
  $("load-msg").textContent = "";
  $("load-msg").className = "msg";
  $("load-code").value = "";
  $("btn-load-code").textContent = "Загрузить";
  const hasProgress = !!P.name;
  $("save-code").value = hasProgress ? "..." : "";
  $("save-code").hidden = !hasProgress;
  $("btn-save-copy").parentElement.hidden = !hasProgress;
  $("btn-save-share").hidden = !navigator.share;
  show("s-save");
  if (hasProgress) {
    try {
      $("save-code").value = await packSave();
    } catch (e) {
      $("save-code").value = "Не получилось сделать код";
    }
  }
}
$("btn-save").onclick = () => openSave("s-home");
$("btn-name-load").onclick = () => openSave("s-name");
$("btn-save-back").onclick = () => {
  if (saveBack === "s-name" && !P.name) askName();
  else {
    renderHome();
    show("s-home");
  }
};
$("save-code").onfocus = (e) => e.target.select();
$("btn-save-copy").onclick = async () => {
  const v = $("save-code").value,
    m = $("save-copy-msg");
  try {
    await navigator.clipboard.writeText(v);
    m.className = "msg okm";
    m.textContent = "Скопировано! Сохрани код где-нибудь, например в Telegram.";
  } catch (e) {
    const t = $("save-code");
    t.focus();
    t.select();
    try {
      document.execCommand("copy");
      m.className = "msg okm";
      m.textContent = "Скопировано!";
    } catch (err) {
      m.className = "msg";
      m.textContent = "Выдели код и скопируй вручную.";
    }
  }
};
$("btn-save-share").onclick = () => {
  navigator.share({ title: "Словарная битва: код сохранения", text: $("save-code").value }).catch(() => {});
};
$("load-code").oninput = () => {
  loadArm = null;
  $("btn-load-code").textContent = "Загрузить";
  $("load-msg").textContent = "";
};
$("btn-load-code").onclick = async () => {
  const m = $("load-msg");
  let d;
  try {
    d = await unpackSave($("load-code").value);
  } catch (e) {
    m.className = "msg err";
    m.textContent = "Код не подходит. Проверь, что он скопирован целиком.";
    loadArm = null;
    return;
  }
  const who = `${d.p.name || "Без имени"}, уровень ${levelOf(d.p.xp)}, боссов ${d.p.beaten.length}, монет ${d.p.coins || 0}`;
  if (P.name && P.xp > 0 && loadArm !== $("load-code").value) {
    loadArm = $("load-code").value;
    m.className = "msg";
    m.textContent = `В коде: ${who}. Текущий прогресс (${P.name}, уровень ${levelOf(P.xp)}) заменится. Нажми ещё раз, чтобы загрузить.`;
    $("btn-load-code").textContent = "Да, загрузить";
    return;
  }
  LS.set("sb2_profile", d.p);
  if (d.s) LS.set("sb_stats", d.s);
  m.className = "msg okm";
  m.textContent = `Загружено: ${who}. Перезапускаю...`;
  setTimeout(() => location.reload(), 700);
};
function cleanName(v) {
  return String(v || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 16);
}
export function askName() {
  drawHero($("name-hero"), P.equip);
  $("name-in").value = "";
  $("name-msg").textContent = "";
  show("s-name");
  setTimeout(() => {
    try {
      $("name-in").focus();
    } catch (e) {}
  }, 60);
}
$("name-form").onsubmit = (ev) => {
  ev.preventDefault();
  const v = cleanName($("name-in").value);
  if (!v) {
    $("name-msg").textContent = "Напиши имя, хотя бы одну букву.";
    return;
  }
  P.name = v;
  save();
  sfx.coin();
  toast(`Добро пожаловать, ${v}!`, "quest");
  renderHome();
  showStory();
};
$("btn-rename").onclick = () => {
  const v = cleanName($("rename-in").value);
  if (!v) {
    $("rename-msg").className = "msg err";
    $("rename-msg").textContent = "Имя пустое.";
    return;
  }
  P.name = v;
  save();
  $("rename-msg").className = "msg okm";
  $("rename-msg").textContent = "Имя сохранено.";
};

if (P.name) {
  renderHome();
  if (!P.storySeen) showStory();
  setTimeout(() => {
    checkAch();
    renderHome();
  }, 1200);
} else askName();
if (P.lepToast) {
  delete P.lepToast;
  save();
  setTimeout(
    () =>
      toast(
        "Ралина передала тебе подарки за победу: лепёшку с каймаком (+1 сердце) и татарский национальный костюм с тюбетейкой! Смотри в гардеробе.",
        "ach",
      ),
    1500,
  );
}
