"use strict";
// Экраны: главная, гардероб (магазин), внешность, награды.

function heroCard(prefix){
  const {l, frac, need} = xpProgress(P.xp);
  drawHero($(prefix+"-hero"), P.equip, $(prefix+"-aura"));
  $(prefix+"-lvl").textContent = `УРОВЕНЬ ${l}`;
  $(prefix+"-name").textContent = P.name || "";
  $(prefix === "home" ? "home-title" : "end-title2").textContent = TITLES[l-1];
  $(prefix+"-xp").style.transform = `scaleX(${frac})`;
  if (l >= MAXL){ $(prefix+"-next").textContent = "Максимальный уровень! Ты Владыка Слова."; return; }
  const unlock = ITEMS.filter(i => i.lvl === l + 1 && i.price > 0).map(i => i.name);
  $(prefix+"-next").innerHTML = `До уровня ${l+1}: <b>${need}</b> опыта.` + (unlock.length ? ` Откроется: <b>${esc(unlock.join(", "))}</b>` : "");
}
function perkChips(g){
  const c = [`Сердца ${g.maxH}`, `Урон ${g.dmg}`];
  if (g.shield) c.push(`Щит ${g.shield}`);
  if (g.time) c.push(`+${g.time} с`);
  if (g.critMult > 2) c.push(`Крит x${g.critMult}`);
  if (g.heal8) c.push("Лечение");
  if (g.spikes) c.push("Шипы");
  if (g.heal6) c.push("Лечение");
  if (g.drone) c.push("Дрон");
  if (g.revive) c.push("Воскрешение");
  if (g.dodge) c.push(`Уклон ${Math.round(g.dodge*100)}%`);
  if (P.lep) c.push("Лепёшка: +1 сердце");
  return c.map((t,i) => `<span class="chip${i > 1 ? " gold" : ""}">${t}</span>`).join("");
}
function questsHTML(){
  ensureDaily();
  const rows = P.daily.q.map(q => `<div class="quest${q.done ? " done" : ""}"><span>${esc(QUESTS[q.t].label(q.n))}</span><b>${q.done ? "Готово" : `${q.p}/${q.n} · ${q.reward}`}</b><div class="qbar"><i style="transform:scaleX(${q.p/q.n})"></i></div></div>`).join("");
  const streak = P.days.streak > 1 ? `<span class="days">Дней подряд: ${P.days.streak}</span>` : "";
  return `<div class="row" style="justify-content:space-between"><h2>Задания дня</h2>${streak}</div>${rows}<p class="note">${P.daily.bonus ? "Все задания выполнены! Завтра будут новые." : "Выполни все три и получи большой сундук."}</p>`;
}
function frontier(){ for (let i = 0; i <= P.unlocked; i++) if (!P.beaten.includes(i)) return i; return P.unlocked; }
function renderHome(){
  ensureDaily();
  refreshCoins();
  heroCard("home");
  $("home-perks").innerHTML = perkChips(gear());
  $("home-badges").innerHTML = badgesHTML(); paintTrophies($("home-badges"));
  $("trophy-sub").textContent = `${TROPHIES.filter(t => (P.troph || {})[t.id]).length} из ${TROPHIES.length} · выучено ${learnedCount()} слов`;
  $("today-home").innerHTML = todayHTML();
  const lim = !!limitReason();
  ["btn-campaign","btn-tower","btn-train-err","btn-train-new"].forEach(id => $(id).classList.toggle("dim", lim));
  $("train-err-sub").textContent = errWords().length ? `слов с ошибками: ${errWords().length}` : "ошибок пока нет";
  $("train-new-sub").textContent = newWords().length ? `ещё не встречались: ${newWords().length}` : "все слова уже встречались";
  const f = frontier();
  $("campaign-sub").textContent = P.beaten.length >= BOSSES.length ? "Кампания пройдена! Выбери босса или иди в Башню" : `Босс ${f+1}: ${BOSSES[f].name}`;
  $("btn-tower").disabled = !towerOpen();
  $("tower-sub").textContent = towerOpen() ? (P.towerBest ? `рекорд: этаж ${P.towerBest}` : "бесконечные этажи") : "откроется после 6-го босса";
  $("awards-sub").textContent = `Достижения: ${Object.keys(P.ach).length} из ${ACH.length}`;
  $("home-quests").innerHTML = questsHTML();
  $("map").innerHTML = BOSSES.map((b,i) => {
    const open = i <= P.unlocked, done = P.beaten.includes(i), next = i === f && !done;
    return `<button class="bcard${open ? "" : " locked"}${next ? " next" : ""}" data-i="${i}" ${open ? "" : "disabled"} aria-label="${open ? esc(b.name) : "Закрытый босс"}">
      <canvas id="mp${i}"></canvas><span>${open ? esc(b.name) : "???"}</span><small>${i+1}</small>${done ? '<em class="done">✓</em>' : ""}</button>`;
  }).join("");
  BOSSES.forEach((b,i) => drawBoss($("mp"+i), b, i > P.unlocked));
  $("map").querySelectorAll(".bcard:not(.locked)").forEach(el => el.onclick = () => { if (!blockedToday()) startCampaign(+el.dataset.i); });
  document.querySelectorAll('input[name="play"]').forEach(r => r.checked = r.value === settings.play);
  syncDiff();
}

let shopTab = "weapon", tryOn = null;
function renderShop(){
  refreshCoins();
  $("tabs").innerHTML = SLOTS.concat([["look","Внешность"],["forge","Кузница"]]).map(([s,n]) => `<button class="tab" role="tab" aria-selected="${s === shopTab}" data-s="${s}">${n}</button>`).join("");
  $("tabs").querySelectorAll(".tab").forEach(b => b.onclick = () => { shopTab = b.dataset.s; tryOn = null; renderShop(); });
  const eq = tryOn ? {...P.equip, [ITEM[tryOn].slot]: tryOn} : P.equip;
  drawHero($("shop-hero"), eq, $("shop-aura"));
  $("shop-perks").innerHTML = perkChips(gear(eq));
  $("shop-pv-name").textContent = tryOn ? `Примерка: ${ITEM[tryOn].name}` : "Твой боец";
  const lvl = levelOf(P.xp);
  if (shopTab === "look"){ renderLook(); return; }
  if (shopTab === "forge"){
    $("items").className = "forge";
    $("items").innerHTML = UPGRADES.map(u => {
      const n = P.up[u.id] || 0, max = n >= u.max, cost = upCost(u, n);
      const bar = u.max <= 10 ? `<div class="lvlbar">${Array.from({length:u.max}, (_,k) => `<i class="${k < n ? "on" : ""}"></i>`).join("")}</div>` : `<span class="chip gold">Уровень ${n}</span>`;
      return `<div class="fcard"><b>${u.name}</b><small class="note">${u.d}. Сейчас: ${u.id === "str" ? "+" + n + " урона" : u.id === "hp" ? "+" + n + " сердец" : u.id === "time" ? "+" + (n*0.5) + " с" : "+" + (n*10) + "% монет"}</small>${bar}
        <button class="btn small ${!max && P.coins >= cost ? "gold" : ""}" data-up="${u.id}" ${max || P.coins < cost ? "disabled" : ""}>${max ? "Максимум" : `Улучшить · ${cost}`}</button></div>`;
    }).join("") + `<p class="note" style="grid-column:1/-1">Кузница бесконечная: Силу можно качать до 99. Чем выше этаж в Башне, тем больше монет.</p>`;
    $("items").querySelectorAll("[data-up]").forEach(b => b.onclick = () => {
      const u = UPGRADES.find(x => x.id === b.dataset.up), n = P.up[u.id] || 0, cost = upCost(u, n);
      if (P.coins < cost || n >= u.max) return;
      P.coins -= cost; P.up[u.id] = n + 1; save(); sfx.level(); toast(`${u.name}: уровень ${n + 1}!`, "quest"); renderShop();
    });
    return;
  }
  $("items").className = "items";
  const list = ITEMS.filter(i => i.slot === shopTab);
  $("items").innerHTML = list.map(i => {
    const own = !!P.owned[i.id], on = P.equip[i.slot] === i.id;
    const floorLock = !own && itemLocked(i), lvlLock = !own && i.lvl > lvl, locked = floorLock || lvlLock;
    const [rn, rc] = RARITY(i.price);
    let act;
    if (on) act = `<button class="btn small" disabled>Надето</button>`;
    else if (own) act = `<button class="btn small" data-eq="${i.id}">Надеть</button>`;
    else if (i.gift) act = `<button class="btn small" disabled>Подарок за победу над Ралиной</button>`;
    else if (floorLock) act = `<button class="btn small" disabled>Башня: ${i.floor} этаж</button>`;
    else if (lvlLock) act = `<button class="btn small" disabled>С ${i.lvl} уровня</button>`;
    else act = `<button class="btn small ${P.coins >= i.price ? "gold" : ""}" data-buy="${i.id}" ${P.coins >= i.price ? "" : "disabled"}>Купить · ${i.price}</button>`;
    const tier = i.price >= 40000 ? " ultra" : i.price >= 8000 ? " myth" : i.price >= 2000 ? " leg" : "";
    return `<div class="icard${on ? " on" : ""}${locked ? " lock" : ""}${tier}" data-try="${i.id}" tabindex="0"><canvas id="ic-${i.id}"></canvas>${i.price ? `<span class="rar" style="color:${rc}">${rn}</span>` : i.gift ? `<span class="rar" style="color:#2a9d8f">ПОДАРОК</span>` : ""}<b>${esc(i.name)}</b><small>${esc(i.perk)}</small><div class="act">${act}</div></div>`;
  }).join("");
  list.forEach(i => drawHero($("ic-"+i.id), {...P.equip, [i.slot]: i.id}));
  $("items").querySelectorAll("[data-try]").forEach(el => el.onclick = e => { if (e.target.closest("button")) return; tryOn = el.dataset.try; renderShop(); });
  $("items").querySelectorAll("[data-eq]").forEach(b => b.onclick = () => { const it = ITEM[b.dataset.eq]; P.equip[it.slot] = it.id; save(); tryOn = null; sfx.block(); renderShop(); });
  $("items").querySelectorAll("[data-buy]").forEach(b => b.onclick = () => {
    const it = ITEM[b.dataset.buy];
    if (P.coins < it.price) return;
    P.coins -= it.price; P.owned[it.id] = 1; P.equip[it.slot] = it.id; P.tot.bought++; save();
    sfx.coin(); toast(`Куплено: ${it.name}!`, "quest"); tryOn = null; checkAch(); renderShop();
  });
}
function renderLook(){
  const L = heroLook(), eq = P.equip, ck = COSTUME_KEY[eq.costume] || "school", masked = LOOK_MASKED.includes(ck);
  const good = hairMatches(eq), costumeName = ITEM[eq.costume].name;
  const sw = (group, dict, cur, starred) => `<div class="looksw">${Object.entries(dict).map(([k,[n,c]]) =>
    `<button class="swatch${k === cur ? " on" : ""}" data-g="${group}" data-v="${k}" aria-pressed="${k === cur}" title="${esc(n)}">
      <i style="background:${c || COSTUMES[ck][group === "eye" ? "eye" : group]}"${c ? "" : ' class="auto"'}></i><span>${esc(n)}${starred && starred.includes(k) ? " ★" : ""}</span></button>`).join("")}</div>`;
  $("items").className = "lookpanel";
  $("items").innerHTML = `
    ${masked ? `<p class="note lookwarn">Костюм «${esc(costumeName)}» закрывает лицо, поэтому внешности сейчас не видно. Она появится с другими костюмами.</p>` : ""}
    <div class="fcard"><b>Подобрать к образу</b>
      <small class="note">К костюму «${esc(costumeName)}»${ITEM[eq.armor].price ? ` и броне «${esc(ITEM[eq.armor].name)}»` : ""} лучше всего идут: ${good.map(h => LOOK_HAIR[h][0].toLowerCase()).join(", ")} волосы. Такие цвета отмечены ★</small>
      <div class="row"><button class="btn small gold" id="look-match">Подобрать</button><button class="btn small" id="look-reset">Как у костюма</button></div></div>
    <h3>Причёска</h3>
    ${!masked && (LOOK_FULLHELM.includes(eq.helmet) || ck === "space" || ck === "dragonknight") ? `<p class="note lookwarn">${ck === "space" ? "Космонавт в шлеме" : ck === "dragonknight" ? "Капюшон Рыцаря дракона" : `${esc(ITEM[eq.helmet].name)}`} закрывает макушку, поэтому Ёжик и Ирокез сейчас не видно. Длинные волосы и чёлка видны. Сними шлем, чтобы показать причёску целиком.</p>` : ""}
    <div class="items lookstyles">${Object.entries(LOOK_STYLE).map(([k,n]) => `<button class="icard${k === L.style ? " on" : ""}" data-g="style" data-v="${k}"><span class="headcrop"><canvas id="ls-${k}"></canvas></span><b>${n}</b></button>`).join("")}</div>
    <h3>Волосы</h3>${sw("hair", LOOK_HAIR, L.hair, good)}
    <h3>Кожа</h3>${LOOK_NOSKIN.includes(ck) ? `<p class="note">У ледяного костюма своя кожа, она не меняется.</p>` : ""}${sw("skin", LOOK_SKIN, L.skin)}
    <h3>Глаза</h3>${sw("eye", LOOK_EYE, L.eye)}
    <p class="note">Внешность бесплатная, меняй сколько хочешь.</p>`;
  const bare = {...eq, helmet:"nohelmet", weapon:"none", armor:"noarmor", back:"noback", pet:"nopet", aura:"noaura"};
  Object.keys(LOOK_STYLE).forEach(k => drawHero($("ls-"+k), {...bare, look:{...L, style:k}}));
  const setLook = (g, v) => { P.look = {...heroLook(), [g]: v}; save(); sfx.block(); renderShop(); };
  $("items").querySelectorAll("[data-g]").forEach(b => b.onclick = () => setLook(b.dataset.g, b.dataset.v));
  $("look-match").onclick = () => {
    const opts = good.filter(h => h !== L.hair); const h = opts.length ? pick(opts) : good[0];
    P.look = {...heroLook(), hair: h}; save(); sfx.coin(); toast(`${LOOK_HAIR[h][0]} волосы отлично подходят к образу!`, "quest"); renderShop();
  };
  $("look-reset").onclick = () => { P.look = {hair:"auto", skin:"auto", eye:"auto", style:L.style}; save(); sfx.block(); renderShop(); };
}
function renderAwards(){
  refreshCoins();
  $("aw-quests").innerHTML = questsHTML();
  $("aw-count").textContent = `Получено ${Object.keys(P.ach).length} из ${ACH.length}. За каждое дают монеты.`;
  $("achs").innerHTML = ACH.map(a => `<div class="ach${P.ach[a.id] ? "" : " off"}"><b>${esc(a.n)}</b><small>${esc(a.d)}</small><em>${P.ach[a.id] ? "ПОЛУЧЕНО" : `+${a.r} МОНЕТ`}</em></div>`).join("");
}
