"use strict";
/* =======================================================================
   STATE
   ======================================================================= */
const SAVE_KEY = "follow-the-herd-v3";
let S = null;
let selected = null;
let lastSnap = null;

function newState(band, goal){
  const B = BANDS.find(b => b.id === band), m = B.mods;
  return {
    band, goal, moon:0, loc:B.start, people:140, food:320, horses:m.horses || 420, robes:m.robes ?? 18, goods:m.goods ?? 10,
    nat:{ ...NAT_DEFAULT, ...(m.nat || {}) }, herds:initHerds(), rivals:initRivals(band), frontier:0,
    standing:m.standing || 50, harmony:66, heat:0, councilHeld:false, herdHere:true, hunted:{}, seen:{}, queue:[], vseen:[], log:[],
    over:false, deaths:0, buffalo:0,
    loyal:{ peace:60, war:60, elder:75, camp:65 }, ignored:{ peace:0, war:0, elder:0, camp:0 },
    traits:{ generous:0, brave:0, wise:0, peace:0 }, earnedName:null,
    son:{ firstKill:false, firstKillMoon:0, newName:null, rodeCount:0 },
    daughter:{ status:"single", husband:null },
    elderAlive:true,
    mounts:{ runner:{ health:100, alive:true }, war:{ health:100, alive:true } },
    flags:{}
  };
}
function save(){ try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch {} }
function load(){ try { const v = JSON.parse(localStorage.getItem(SAVE_KEY)); return v && !v.over ? v : null; } catch { return null; } }
function clearSave(){ try { localStorage.removeItem(SAVE_KEY); } catch {} }
function clampState(){
  for (const k of ["people","food","horses","robes","goods"]) S[k] = Math.max(0, Math.round(S[k]));
  S.standing = clamp(Math.round(S.standing), 0, 100); S.harmony = clamp(Math.round(S.harmony), 0, 100);
  for (const k in S.loyal) S.loyal[k] = clamp(Math.round(S.loyal[k]), 0, 100);
  for (const k in S.nat) S.nat[k] = clamp(Math.round(S.nat[k]), 0, 100);
  for (const r of S.rivals) r.rel = clamp(Math.round(r.rel), 0, 100);
  S.flags.kiowa = S.nat.kiowa >= 70;
}
const snapshot = () => ({ people:S.people, food:S.food, horses:S.horses, robes:S.robes, goods:S.goods, standing:S.standing, harmony:S.harmony });
const sonName = () => S.son.newName || FAMILY.son.name;
function topTrait(s){ return Object.entries(s.traits).sort((a, b) => b[1] - a[1])[0][0]; }

/* =======================================================================
   ACTIONS + COUNCIL
   Each advisor's stance depends on the action, the situation, and how
   you have treated them. Lines vary from moon to moon.
   ======================================================================= */
const ACTIONS = {
  hunt:    { ic:"🦬", name:"Hunt the herd", sub:"Ride into the herd. Meat for the lodges, hides for robes." },
  rest:    { ic:"🔥", name:"Rest and graze", sub:"Let the horses fatten. Tan robes. Mend lodges." },
  move:    { ic:"🧭", name:"Move camp", sub:"Strike the lodges and travel. Open the map." },
  trade:   { ic:"⚖️", name:"Trade", sub:"Robes and horses for iron, cloth, and bread. Haggle if you dare." },
  mustang: { ic:"🐎", name:"Catch wild horses", sub:"Mustangs are running nearby. Rope and gentle them." },
  council: { ic:"🤝", name:"Council with the Texans", sub:"Sit with the Republic's commissioners. Gifts, and talk of lines.", trait:{ peace:2 } },
  raidTx:  { ic:"🌕", name:"Raid the settlements", sub:"Take horses from the Texan farms. They will come after you.", trait:{ brave:1 } },
  raidMx:  { ic:"🗡️", name:"Ride south to Mexico", sub:"The great war trail. Takes two moons. Many horses, real danger.", trait:{ brave:2 } }
};
/* base stance and lines: [vote, line, line, ...] */
const STANCE = {
  hunt:    { peace:[1,"Meat for every lodge.","A full camp is a peaceful camp."], war:[1,"Let the young men ride.","Finally. The horses are restless."],
             elder:[1,"The herd provides, if we are wise.","Take the cows, leave the young ones."], camp:[1,"Bring the hides. We will make them worth something.","Every hide is a robe, every robe is iron."] },
  rest:    { peace:[1,"A quiet moon keeps families together.","Let the people breathe."], war:[-1,"Fat horses and lazy men.","The young men will start fighting each other."],
             elder:[1,"Good grass is a gift. Use it.","Rest the horses now, ride them hard later."], camp:[1,"Time to finish the robes.","The lodge covers need mending. Thank you."] },
  move:    { peace:[0,"Where we go matters more than that we go."], war:[0,"Choose ground the Texans do not know."],
             elder:[0,"Follow the grass and the water."], camp:[0,"We can strike camp in an hour. Choose well."] },
  trade:   { peace:[1,"Traders are friends worth keeping.","Trade is better than raiding."], war:[0,"Get powder and lead.","Don't let them cheat you."],
             elder:[0,"Do not trade away the best horses.","Count twice. They will."], camp:[1,"Kettles and awls. Cloth for the children.","Iron needles. Please."] },
  mustang: { peace:[0,"Horses taken from no one."], war:[1,"Every boy should catch his own.","Let me pick the young men for it."],
             elder:[1,"Good stock, if you are patient.","A mustang gentled slow makes a horse for life."], camp:[0,"More horses, more grass needed."] },
  council: { peace:[1,"Talk costs nothing and brings gifts.","Sit with them. Promise little."], war:[-1,"They will draw a line and call it ours.","Talking is how they win."],
             elder:[0,"Listen. Promise nothing about the land."], camp:[1,"Their iron is good iron."] },
  raidTx:  { peace:[-1,"Every raid brings Rangers to our lodges.","Think of the children when the Rangers come."], war:[1,"Their horses are fat and close.","The Texans took the San Saba. Take their horses."],
             elder:[-1,"The Texans are many now, and angry.","There are more of them every year."], camp:[0,"More horses. More grieving, too."] },
  raidMx:  { peace:[0,"Mexico is far from our lodges."], war:[1,"Horses and mules beyond counting.","Two moons, and we come back rich."],
             elder:[1,"We have ridden south since my grandfather's time.","Take water. The desert south of the river kills more than bullets."], camp:[-1,"Two moons with the young men gone.","Who hunts for us while you're away?"] }
};
function stance(a, act){
  if (a.id === "elder" && !S.elderAlive) return null;
  const L = LOCS[S.loc], se = seasonOf(S.moon), hungry = S.food < S.people * 1.1;
  const [base, ...lines] = STANCE[act][a.id]; let v = base;
  let line = lines[(S.moon + act.length) % lines.length];
  /* situation */
  if (a.id === "camp"){
    if (hungry && act === "hunt"){ v = 1; line = "The racks are empty. Go, and bring meat."; }
    if (hungry && act === "rest"){ v = -1; line = "Rest? With empty racks?"; }
    if (act === "trade" && S.robes < 3){ v = -1; line = "Trade what? We have no robes left."; }
    if (S.goal === "trade" && act === "hunt" && se >= 2){ v = 1; line = "Winter hides! These are the robes we need."; }
  }
  if (a.id === "elder"){
    if (act === "move" && se >= 2 && !L.shelter){ v = 1; line = "Find shelter before the snow comes. I've buried people who didn't."; }
    if (act === "rest" && L.grass[se] <= 1){ v = -1; line = "The grass here is finished. Move."; }
    if (act === "hunt" && !S.herdHere){ v = 0; line = "There is nothing to hunt here."; }
  }
  if (a.id === "war"){
    if (S.loyal.war < 40 && v <= 0) line = pick(["Ask the old women. You always do.","Do what you like. You will anyway."]);
    if (S.goal === "horses" && (act === "raidMx" || act === "mustang")){ v = 1; line = "You want a great herd? This is how."; }
  }
  if (a.id === "peace"){
    if ((act === "raidTx") && S.standing < 30){ line = "Again? They will come for our children next."; }
    if (act === "move" && S.heat > 1){ v = 1; line = "Move. The Rangers know where we are."; }
  }
  /* memory: ignored advisors grow cold */
  if (S.ignored[a.id] >= 2 && v < 0) line = `${line} You never listen to me anyway.`;
  return [v, line];
}
function applyVotes(votes){
  let sum = 0;
  for (const a of ADVISORS){ const v = votes[a.id] || 0; if (!v || (a.id === "elder" && !S.elderAlive)) continue;
    sum += v; if (v > 0){ S.loyal[a.id] += 4; S.ignored[a.id] = 0; } else { S.loyal[a.id] -= 6; S.ignored[a.id]++; } }
  S.harmony += sum * 2;
}
function addTraits(t){ if (t) for (const k in t) S.traits[k] += t[k]; }

function availableActions(){
  const L = LOCS[S.loc], se = seasonOf(S.moon), list = [];
  list.push(["hunt", S.herdHere ? null : "No herd sighted here this moon"]);
  list.push(["rest", null]);
  list.push(["move", null]);
  if (L.trade) list.push(["trade", L.trade === "torrey" && S.standing < 35 ? "The traders will not deal with you after the raids" : null]);
  if (L.mustang && se <= 1) list.push(["mustang", null]);
  if (L.council) list.push(["council", S.councilHeld ? "You already held council this year" : S.standing < 25 ? "The commissioners will not meet you" : null]);
  if (L.texasRaid) list.push(["raidTx", null]);
  if (L.mexico) list.push(["raidMx", S.moon >= MAX_MOONS - 1 ? "Not enough moons left in the year" : null]);
  return list;
}

/* =======================================================================
   HUD + PANEL
   ======================================================================= */
function renderHUD(){
  const L = LOCS[S.loc], m = Math.min(S.moon, 11);
  $("#hud").innerHTML = `<div class="moon">Moon ${m + 1} of 12 · ${MONTHS[m]} ${yearOf(m)} · ${SEASONS[seasonOf(m)]}</div>
    <h1>${esc(L.name)}</h1><div class="sub">${esc(L.sub)}</div>`;
}
function statHTML(k, label, v, opt = {}){
  const d = lastSnap ? v - lastSnap[k] : 0;
  return `<div class="stat ${opt.warn ? "warn" : ""}"><div class="k">${label}</div>
    <div class="v">${v}${d ? `<span class="d ${d > 0 ? "pos" : "neg"}">${d > 0 ? "+" : ""}${d}</span>` : ""}</div>
    ${opt.bar != null ? `<div class="bar"><i style="width:${opt.bar}%;background:${opt.barCol || "var(--gold)"}"></i></div>` : ""}</div>`;
}
const hbar = (h, col) => `<span class="hbar"><i style="width:${h}%;background:${col || (h < 50 ? "var(--red)" : "var(--sage)")}"></i></span>`;
function renderPanel(){
  const L = LOCS[S.loc], se = seasonOf(S.moon);
  const moonsOfFood = S.people ? S.food / S.people : 9;
  const G = GOALS.find(g => g.id === S.goal);
  const tags = [
    S.herdHere ? `<span class="tag herd">Buffalo nearby</span>` : `<span class="tag">No herd sighted</span>`,
    `<span class="tag ${L.grass[se] >= 2 ? "good" : "bad"}">${["Grass: none","Grass: thin","Grass: good","Grass: rich"][L.grass[se]]}</span>`,
    L.shelter ? `<span class="tag good">Winter shelter</span>` : L.exposed ? `<span class="tag ${se === 3 ? "bad" : ""}">Exposed</span>` : "",
    L.trade ? `<span class="tag">Traders</span>` : "",
    nearFrontier(S.loc) ? `<span class="tag bad">Near the frontier</span>` : "",
    ...S.rivals.filter(r => r.loc === S.loc).map(r => `<span class="tag rival">${esc(rivalName(r))} camped here</span>`)
  ].join("");
  const acts = availableActions();
  if (selected && !acts.some(([k, why]) => k === selected && !why)) selected = null;
  const dstat = { single:"unmarried", promised:"promised to Yellow Fox", waiting:"waiting", married:`married to ${S.daughter.husband}` }[S.daughter.status];
  $("#panel").innerHTML = `
    <div class="stats">
      ${statHTML("people","People",S.people,{ warn:S.people < 90 })}
      ${statHTML("food","Food",S.food,{ warn:moonsOfFood < 1, bar:clamp(moonsOfFood / 3 * 100, 0, 100), barCol: moonsOfFood < 1 ? "var(--red)" : "var(--gold)" })}
      ${statHTML("horses","Horses",S.horses)}
      ${statHTML("robes","Robes",S.robes)}
      ${statHTML("goods","Trade goods",S.goods)}
      ${statHTML("harmony","Council",S.harmony,{ bar:S.harmony, barCol: S.harmony < 40 ? "var(--red)" : "var(--sage)", warn:S.harmony < 40 })}
    </div>
    <div class="goalbar ${G.done(S) ? "met" : ""}"><span class="gi">${G.icon}</span><span><b>${G.name}</b><small>${esc(G.progress(S))}</small></span>${G.done(S) ? `<span class="tag good">On track</span>` : ""}</div>
    <div class="pscroll">
      <div class="place">${tags}</div>
      <p class="desc">${esc(L.desc)}</p>
      <p class="harmony">${esc(S.band)} band · Food lasts about ${moonsOfFood < 10 ? moonsOfFood.toFixed(1) : "9+"} moons · Texans' trust ${S.standing}/100${S.flags.kiowa ? " · Kiowa allies" : ""}${S.earnedName ? ` · You are ${esc(S.earnedName)}` : ""}</p>
      <h2 class="sec">This moon</h2>
      <div class="actions" role="group" aria-label="Choose what to do this moon">
        ${acts.map(([k, why]) => { const a = ACTIONS[k]; return `<button type="button" class="act" data-act="${k}" aria-pressed="${selected===k}" ${why ? "disabled" : ""}>
          <span class="ic" aria-hidden="true">${a.ic}</span><span><b>${a.name}</b><small>${esc(why || a.sub)}</small></span></button>`; }).join("")}
      </div>
      <h2 class="sec">Your council</h2>
      <div class="council">${ADVISORS.map(a => {
        const gone = a.id === "elder" && !S.elderAlive;
        const r = selected && !gone ? stance(a, selected) : null;
        const vote = r ? (r[0] > 0 ? `<span class="vote y">for</span>` : r[0] < 0 ? `<span class="vote n">against</span>` : `<span class="vote m">—</span>`) : "";
        const mood = S.loyal[a.id] >= 75 ? "loyal" : S.loyal[a.id] < 40 ? "cold" : "";
        return `<div class="adv ${gone ? "gone" : ""}"><button class="face" type="button" data-bio="${a.id}" aria-label="About ${esc(a.name)}">${faceSVG(a)}</button>
          <div><div class="who"><b>${esc(a.name)}</b> · ${esc(a.role)}${mood ? ` <span class="mood ${mood}">${mood}</span>` : ""}</div>
          <div class="say ${r ? "" : "idle"}">${gone ? "His seat by the fire is empty." : r ? "“" + esc(r[1]) + "”" : "Waiting to hear your plan."}</div></div>${vote}</div>`; }).join("")}</div>
      <button type="button" class="go" id="goBtn" ${selected ? "" : "disabled"}>${selected ? (selected === "move" ? "Open the map" : "Decide: " + ACTIONS[selected].name) : "Choose what to do this moon"}</button>
      <details class="family"><summary>Family and horses</summary>
        <ul>
          <li><b>${esc(sonName())}</b>, your son. ${S.son.newName ? "Named a man this year." : S.son.firstKill ? "Made his first kill." : "Hasn't killed his first buffalo yet."}</li>
          <li><b>${FAMILY.daughter.name}</b>, your daughter. ${esc(dstat)}.</li>
          <li><b>Owl Feather</b>, your father. ${S.elderAlive ? "With you." : "Gone. His name is not spoken."}</li>
          ${S.flags.captive && !S.flags.captiveLeft ? `<li><b>The boy from the south</b>. Walks Quiet is raising him.</li>` : ""}
          ${MOUNTS.map(m => { const st = S.mounts[m.id]; return `<li><b>${m.name}</b>, ${m.kind}. ${st.alive ? hbar(st.health) : "Dead."}${S.flags.runnerResting > S.moon && m.id === "runner" ? " Resting." : ""}</li>`; }).join("")}
        </ul>
      </details>
      ${nationsHTML()}
    </div>`;
}
function refresh(){ clampState(); renderHUD(); renderPanel(); scene.herd = S.herdHere; scene.season = seasonOf(S.moon); scene.lodges = clamp(Math.round(S.people / 14), 3, 10); }

/* =======================================================================
   MODALS
   ======================================================================= */
function modal(html, { cls = "", onMount } = {}){
  return new Promise(resolve => {
    const wrap = document.createElement("div"); wrap.className = "modal";
    wrap.innerHTML = `<div class="card ${cls}" role="dialog" aria-modal="true"><div class="in">${html}</div></div>`;
    document.body.appendChild(wrap);
    const close = v => { wrap.remove(); resolve(v); };
    wrap.addEventListener("click", e => { const b = e.target.closest("[data-v]"); if (b && !b.disabled) close(b.dataset.v); });
    onMount && onMount(wrap, close);
    setTimeout(() => (wrap.querySelector("[data-v],button") || wrap).focus(), 40);
  });
}
const val = (x, s) => typeof x === "function" ? x(s) : x;

async function runEvent(ev){
  const choices = val(ev.choices, S), title = val(ev.title, S), text = val(ev.text, S);
  const v = await modal(`<p class="eyebrow">${MONTHS[Math.min(S.moon, 11)]} ${yearOf(S.moon)} · ${LOCS[S.loc].name}</p><h2>${esc(title)}</h2>
    <p class="lead">${esc(text)}</p>
    <div class="choices">${choices.map((c, i) => { const vs = ADVISORS.filter(a => c.votes && c.votes[a.id] && (a.id !== "elder" || S.elderAlive));
      return `<button class="choice" data-v="${i}"><b>${esc(c.label)}</b>${c.sub ? `<small>${esc(c.sub)}</small>` : ""}
      ${vs.length ? `<small class="votes">${vs.map(a => `<span class="${c.votes[a.id] > 0 ? "pos" : "neg"}">${esc(a.name)} ${c.votes[a.id] > 0 ? "✓" : "✗"}</span>`).join(" ")}</small>` : ""}</button>`; }).join("")}</div>`);
  const c = choices[+v];
  applyVotes(c.votes || {}); addTraits(c.trait);
  if (c.nat) for (const k in c.nat) S.nat[k] += c.nat[k];
  const line = await c.fx(S);
  (c.chain || []).forEach(([id, a, b]) => S.queue.push({ id, moon: S.moon + randi(a, b) }));
  clampState();
  await modal(`<p class="eyebrow">${esc(title)}</p><p class="lead">${esc(line)}</p>
    ${ev.note ? `<div class="note"><b>This really happened</b>${esc(ev.note)}</div>` : ""}
    <div class="btnrow"><button class="btn primary" data-v="ok">Continue</button></div>`);
  S.seen[ev.id] = true;
  return line;
}

/* which event this moon? chains first, then story arcs, then the deck */
function pickEvent(){
  const L = LOCS[S.loc], se = seasonOf(S.moon);
  const all = [...EVENTS, ...ARCS];
  const due = S.queue.findIndex(q => q.moon <= S.moon && all.find(e => e.id === q.id)?.when(S, L, se));
  if (due >= 0){ const q = S.queue.splice(due, 1)[0]; return all.find(e => e.id === q.id); }
  S.queue = S.queue.filter(q => q.moon > S.moon - 3); /* stale chains expire */
  const arc = ARCS.find(a => !a.chainOnly && !S.seen[a.id] && a.when(S, L, se));
  if (arc && chance(.85)) return arc;
  if (!chance(.75)) return null;
  const pool = EVENTS.filter(e => !e.chainOnly && (e.repeat || !S.seen[e.id]) && e.when(S, L, se));
  if (!pool.length) return null;
  let r = Math.random() * pool.reduce((a, e) => a + val(e.w, S), 0);
  for (const e of pool){ r -= val(e.w, S); if (r <= 0) return e; }
  return pool[0];
}

/* =======================================================================
   TURN FLOW
   ======================================================================= */
let busy = false;
async function doAction(key){
  if (busy) return; busy = true;
  const before = snapshot(); const results = []; const L = LOCS[S.loc]; const se = seasonOf(S.moon);
  const votes = {}; ADVISORS.forEach(a => { const r = stance(a, key); if (r) votes[a.id] = r[0]; });
  let moons = 1, moved = false;
  try {
    if (key === "move"){
      const to = await openMap(); if (!to) return;
      const d = dist(S.loc, to);
      const cost = Math.round(S.horses * (d / 100) * (se === 3 ? .03 : .012));
      Object.assign(scene, { camp:false, caravan:true, herd:false, speed:110 });
      $("#hud").innerHTML = `<div class="moon">On the move</div><h1>To ${esc(LOCS[to].name)}</h1>`;
      await sleep(2300);
      S.loc = to; moved = true; S.horses -= cost;
      results.push(`Struck camp and rode to ${LOCS[to].name}.${cost ? ` ${cost} horses worn out on the trail.` : ""}`);
    }
    if (key === "hunt") results.push(await huntFlow());
    if (key === "rest"){ const n = Math.round(S.horses * .05); S.horses += n; S.robes += randi(1, 3);
      for (const m of Object.values(S.mounts)) if (m.alive) m.health = Math.min(100, m.health + 25);
      results.push("A quiet moon. The horses gain weight, the women finish robes, and your own horses heal."); }
    if (key === "mustang"){ const n = randi(18, 45); S.horses += n; results.push(`The young men rope ${n} wild horses.${chance(.4) ? ` ${sonName()} gentles a yearling filly all by himself.` : ""}`); }
    if (key === "trade") results.push(await tradeScreen(L.trade));
    if (key === "council"){ S.councilHeld = true; S.standing += 15; S.goods += 8;
      const line = "The commissioners give gifts: blankets, kettles, tobacco. They ask for a line the Comanche will not cross. Your council will not agree to a line that shuts you out of your own country.";
      results.push(line);
      await modal(`<p class="eyebrow">Council</p><h2>Talk at Tehuacana Creek</h2><p class="lead">${esc(line)}</p>
        <div class="note"><b>This really happened</b>Republic of Texas commissioners held councils with Comanche leaders at Tehuacana Creek, near Torrey's trading house, in 1844 and 1845. Gifts were given, but the Comanche refused any boundary that cut them off from their land.</div>
        <div class="btnrow"><button class="btn primary" data-v="ok">Continue</button></div>`); }
    if (key === "raidTx"){
      const n = randi(40, 90); S.horses += n; S.standing -= 25; S.heat += 2; S.goods += randi(0, 3);
      let line = `The raiders return with ${n} horses.`;
      if (chance(.35)){ const d = lose(S, randi(2, 6)); line += ` Rangers caught their trail. ${d} men did not come home.`; }
      if (S.mounts.war.alive && chance(.3)) line += hurtMount(S, "war", 35) || ` ${mountName("war")} came back cut and lame.`;
      results.push(line);
      await modal(`<p class="eyebrow">Raid</p><h2>The frontier</h2><p class="lead">${esc(line)}</p>
        <div class="note"><b>This really happened</b>Horse raids on frontier farms built wealth and standing, and brought retaliation. Each side's raids fed the other's, and the cycle grew harder to stop every year.</div>
        <div class="btnrow"><button class="btn primary" data-v="ok">Continue</button></div>`);
    }
    if (key === "raidMx"){
      moons = 2;
      const n = randi(110, 220) + (S.flags.kiowa ? 40 : 0), g = randi(4, 10), d = lose(S, randi(0, 6));
      S.horses += n; S.goods += g; S.loyal.war += 10;
      const adopt = !S.flags.captive; if (adopt){ S.flags.captive = true; S.flags.captiveMoon = S.moon + 2; S.people += 1; }
      let line = `After two moons the raiders return${S.flags.kiowa ? " with their Kiowa allies" : ""}, driving ${n} horses and mules.${d ? ` ${d} men are lost.` : " Every man comes home."}`;
      if (adopt) line += " They also bring captives, as raiders of this era did. One is a boy of about eight from a ranch in Chihuahua. Walks Quiet takes him into your lodge.";
      if (S.mounts.war.alive && chance(.35)) line += hurtMount(S, "war", 40) || ` ${mountName("war")} came home thin and footsore.`;
      results.push(line);
      await modal(`<p class="eyebrow">Two moons later</p><h2>The trail south</h2><p class="lead">${esc(line)}</p>
        <div class="note"><b>This really happened</b>Comanche and Kiowa raids into northern Mexico peaked in the 1840s, reaching as far as Durango and Zacatecas. For the Comanche it meant wealth in horses and captives, some of whom were adopted and raised as Comanche. For northern Mexico it was devastating; historian Brian DeLay calls it the "War of a Thousand Deserts."</div>
        <div class="btnrow"><button class="btn primary" data-v="ok">Continue</button></div>`);
    }

    applyVotes(votes); addTraits(ACTIONS[key].trait);
    for (let i = 0; i < moons; i++){ results.push(...upkeep(i === moons - 1)); if (i < moons - 1) S.moon++; }
    if (moved) setScene(S.loc);

    /* event or arc */
    if (S.moon === 9 && !S.seen.annex) results.push(await runEvent(ANNEX));
    else {
      const ev = pickEvent();
      if (ev) results.push(await runEvent(ev));
    }
    /* naming */
    const t = topTrait(S);
    if (!S.earnedName && S.moon >= 5 && S.traits[t] >= 4){ S.earnedName = pick(TRAITS[t].names); results.push(await runEvent(NAMING)); }

    clampState();
    S.moon += 1;
    lastSnap = before;
    const after = snapshot();
    const labels = { people:"People", food:"Food", horses:"Horses", robes:"Robes", goods:"Goods", standing:"Texans' trust", harmony:"Council" };
    const chips = Object.keys(labels).map(k => { const d = after[k] - before[k]; return d ? `<span class="chip ${d > 0 ? "pos" : "neg"}">${labels[k]} ${d > 0 ? "+" : ""}${d}</span>` : ""; }).join("");
    const vg = pickVignette();
    const end = S.moon >= MAX_MOONS || S.people < 70;
    await modal(`<p class="eyebrow">End of ${MONTHS[S.moon - 1]} ${yearOf(S.moon - 1)}</p><h2>${end ? "The year is over" : "The moon wanes"}</h2>
      <ul class="report">${results.filter(Boolean).map(l => `<li>${esc(l)}</li>`).join("")}</ul>
      <div class="deltas">${chips}</div>
      ${vg ? `<div class="fire"><b>Around the fire</b>${esc(vg)}</div>` : ""}
      <div class="btnrow"><button class="btn primary" data-v="ok">${end ? "See your band's story" : `Begin ${MONTHS[Math.min(S.moon, 11)]}`}</button></div>`);
    if (end) return endGame();
    S.herdHere = chance(herdChanceAt(S.loc));
    selected = null; setScene(S.loc); refresh(); save();
  } finally { busy = false; }
}

async function huntFlow(){
  const se = seasonOf(S.moon);
  const sonCan = !S.son.firstKill;
  const resting = S.flags.runnerResting > S.moon || !S.mounts.runner.alive;
  const horseLine = resting ? `${mountName("runner")} ${S.mounts.runner.alive ? "is resting" : "is gone"}, so you ride a slower horse.` : `${mountName("runner")} is ${S.mounts.runner.health >= 80 ? "fresh and eager" : "willing, but not at his best"}.`;
  const intro = await modal(`<p class="eyebrow">The hunt</p><h2>The herd is close</h2>
    <p class="lead">Scouts have found buffalo grazing upwind. The hunters ready their best running horses. ${esc(horseLine)}</p>
    ${sonCan ? `<p>${esc(FAMILY.son.name)} is standing by your horse with his bow, not saying anything, which says everything.</p>` : ""}
    <p>Hold RIDE to close in, and loose an arrow when the ring under a buffalo turns gold. Thirty seconds, ten arrows.</p>
    <div class="choices">
      ${sonCan ? `<button class="choice" data-v="son"><b>Ride in with ${esc(FAMILY.son.name)}</b><small>His first hunt. Ride close and give him his chance.</small></button>` : ""}
      <button class="choice" data-v="run"><b>Ride into the herd</b><small>Play the hunt</small></button>
      <button class="choice" data-v="quick"><b>Let the hunters handle it</b><small>Skip the hunt</small></button>
    </div>`);
  const son = intro === "son";
  let kills, sonKills = 0, ep = { score:3 }, played = intro !== "quick";
  const top = resting ? 9.2 : 9 + S.mounts.runner.health / 100 * 1.6;
  if (played){
    const r = await theRun({ top, son, sonName:FAMILY.son.name, coat: resting ? "#6b4a32" : "#9a9289",
      tip: son ? `Ride close. ${FAMILY.son.name} is right behind you.` : undefined });
    kills = r.kills; sonKills = r.sonKills;
  } else { kills = randi(2, 6); S.buffalo += kills; if (son || (sonCan && chance(.3))) sonKills = chance(.5) ? 1 : 0; }
  const total = kills + sonKills + (kills + sonKills > 0 ? (bandOf().mods.huntBonus || 0) : 0);
  if (total > 0 && played) ep = await everyPart(total);
  const food = Math.round(total * 40 * (se === 2 ? 1.25 : 1) * (.85 + ep.score * .05));
  const robes = Math.round(total * (se >= 2 ? 1 : .6) * (.6 + ep.score * .08));
  S.food += food; S.robes += robes; S.hunted[S.loc] = S.moon; S.herdHere = false; depleteHerd(S.loc, total);
  let line = total ? `The hunt brought down ${total} buffalo: ${food} food${robes ? ` and ${robes} robes` : ""}.${se === 2 ? " Fall meat dries well for winter." : ""}` : "The herd ran clean away. No meat this time.";
  if (sonKills && !S.son.firstKill){
    S.son.firstKill = true; S.son.firstKillMoon = S.moon; S.traits.brave++;
    line += ` ${FAMILY.son.name} made his first kill!`;
    await modal(`<p class="eyebrow">The hunt</p><h2>${esc(FAMILY.son.name)}'s first buffalo</h2>
      <p class="lead">A young cow, one arrow behind the ribs, just where you taught him. He sits on his horse looking at it like he can't believe it. Then he looks at you.</p>
      <div class="note"><b>This really happened</b>A boy's first buffalo kill was a major moment. His father often celebrated it with a feast and gave away horses or goods in his son's honor.</div>
      <div class="btnrow"><button class="btn primary" data-v="ok">Continue</button></div>`);
  } else if (son && !sonKills) line += ` ${FAMILY.son.name} rode well but couldn't get close enough. Next time.`;
  if (son && chance(.1)){ line += ` ${FAMILY.son.name} was thrown and broke his arm. Walks Quiet set it. He is very proud of the splint.`; }
  if (!resting && S.mounts.runner.alive && played && chance(.25)) line += hurtMount(S, "runner", randi(15, 30)) || ` ${mountName("runner")} came back with a strained leg.`;
  return line;
}

function upkeep(last){
  worldTick();
  const lines = []; const L = LOCS[S.loc], se = seasonOf(S.moon);
  S.food -= S.people;
  if (S.food < 0){
    const need = -S.food, eat = Math.min(Math.max(0, S.horses - 30), Math.ceil(need / 8));
    if (eat){ S.horses -= eat; S.food += eat * 8; lines.push(`Food ran short. Families butchered ${eat} horses to eat.`); }
    if (S.food < 0){ const lost = lose(S, Math.ceil(-S.food / 14)); S.food = 0; S.harmony -= 10; lines.push(`Hunger in camp. ${lost} people died.`); }
  }
  const g = L.grass[se]; let r = [-.1, -.04, .01, .03][g];
  if (se === 0 && g >= 2) r += .05;
  if (se === 3 && L.shelter) r += .03;
  const dh = Math.round(S.horses * r); S.horses += dh;
  if (dh < -4) lines.push(`Thin grass. ${-dh} horses weakened and died.`);
  else if (dh > 4) lines.push(se === 0 ? `Spring foals and new grass: ${dh} more horses.` : `Good grass: the herd grows by ${dh}.`);
  if (se === 3 && L.shelter && last) lines.push("Cottonwood bark and canyon grass carry the herd through winter.");
  for (const m of Object.values(S.mounts)) if (m.alive) m.health = Math.min(100, m.health + 6);
  S.harmony += (60 - S.harmony) * .08;
  S.standing += (50 - S.standing) * .03;
  for (const k in S.loyal) S.loyal[k] += ((k === "elder" ? 70 : 60) - S.loyal[k]) * .05;
  if (S.heat > 0 && chance(.3)) S.heat--;
  clampState();
  return lines;
}

function pickVignette(){
  const se = seasonOf(Math.max(0, S.moon - 1));
  const pool = VIGNETTES.filter(v => !S.vseen.includes(v.id) && v.when(S, se));
  if (!pool.length) return null;
  const v = pick(pool); S.vseen.push(v.id);
  return val(v.text, S);
}

/* =======================================================================
   ENDING
   ======================================================================= */
function endGame(){
  S.over = true; clearSave();
  const G = GOALS.find(g => g.id === S.goal), met = G.done(S);
  const scattered = S.people < 70;
  const t = topTrait(S);
  const title = scattered ? "Scattered" : S.earnedName || (S.traits[t] >= 3 ? TRAITS[t].names[1] : "Still Here");
  const epi = [
    S.son.newName ? `Your son, now ${S.son.newName}, will lead this band one day.` : S.son.firstKill ? "Little Hawk made his first kill, but has not yet been honored with a name." : "Little Hawk is still waiting for his first buffalo. Next year.",
    S.daughter.status === "married" ? `Morning Grass and ${S.daughter.husband} have a lodge of their own.` : "Morning Grass has not married yet. She is in no hurry.",
    S.elderAlive ? "Owl Feather saw one more spring." : "Your father rests in the rocks above the winter camp.",
    S.flags.captive ? (S.flags.captiveLeft ? "The boy from the south went home to Chihuahua. Walks Quiet still keeps his moccasins." : "The boy from the south speaks only Comanche now. He has forgotten his old name.") : null,
    S.mounts.runner.alive ? `${mountName("runner")} is getting older, but he still runs the herd.` : `You still look for ${mountName("runner")} in the herd sometimes.`,
    S.loyal.war >= 70 ? "Rides Ahead stands with you. The young men follow him, and he follows you." : S.loyal.war < 40 ? "Rides Ahead talks about starting his own band." : null
  ].filter(Boolean);
  const share = `Follow the Herd · ${title}\n${G.name}: ${met ? "achieved" : "not reached"}.\nMy band came through 1845 with ${S.people} people, ${S.horses} horses, and ${S.robes} robes.\nnumunuu.com/herd`;
  setScene(S.loc); scene.season = 3;
  modal(`<p class="eyebrow">The year 1845 is over</p>
    <div class="story"><div class="sm">${S.earnedName ? "You are remembered as" : "Your band will be remembered as"}</div>
      <div class="t">${esc(title)}</div>
      <p style="margin:8px 0 0">${scattered ? "Too many lodges were lost. Survivors join other bands to carry on." : esc(TRAITS[t].line)}</p>
      <div class="goalres ${met ? "met" : ""}">${G.icon} <b>${G.name}</b>: ${met ? "achieved" : "not reached"} · ${esc(G.progress(S))}</div>
      <div class="grid"><div>People<b>${S.people}</b></div><div>Horses<b>${S.horses}</b></div><div>Robes<b>${S.robes}</b></div>
      <div>Buffalo taken<b>${S.buffalo}</b></div><div>Council<b>${S.harmony}</b></div><div>Lives lost<b>${S.deaths}</b></div></div></div>
    <h2 class="sec" style="margin:20px 0 6px">Your people</h2>
    <ul class="report">${epi.map(l => `<li>${esc(l)}</li>`).join("")}</ul>
    <h2 class="sec" style="margin:22px 0 4px">What came next</h2>
    <p>Your year sat near the height of Comanche power. Then the pressure came from every side.</p>
    <ul class="timeline">
      <li><b>1846</b><span>The Council Springs treaty brings the southern bands under U.S. "protection," with no boundary at all.</span></li>
      <li><b>1849</b><span>Cholera carried by gold-rush travelers devastates the southern bands.</span></li>
      <li><b>1867</b><span>The Medicine Lodge treaty sets a reservation and promises hunting "so long as the buffalo may range."</span></li>
      <li><b>1870s</b><span>Commercial hide hunters destroy the southern herd within a few years.</span></li>
      <li><b>1874</b><span>Soldiers attack the winter camps in Palo Duro Canyon and kill more than a thousand captured horses.</span></li>
      <li><b>1875</b><span>Quanah and the Quahadi, the last free band, come in to Fort Sill.</span></li>
      <li><b>Today</b><span>The Comanche Nation is headquartered near Lawton, Oklahoma. The people, and the language, are still here.</span></li>
    </ul>
    <div class="btnrow">
      <button class="btn primary" data-v="again">Play again</button>
      <button class="btn" id="shareBtn" type="button">Copy my story</button>
      <a class="btn" href="https://dictionary.numunuu.com" style="text-decoration:none">Learn Comanche words</a>
    </div>`, { onMount:(wrap) => {
      wrap.querySelector("#shareBtn").addEventListener("click", async () => { try { await navigator.clipboard.writeText(share); toast("Story copied"); } catch { toast("Copy failed"); } });
    }}).then(v => { if (v === "again") chooseBand(); });
}

/* =======================================================================
   BOOT: title → goal → intro
   ======================================================================= */
async function chooseBand(){
  const v = await modal(`<p class="eyebrow">Spring 1845</p><h2>Which band do you lead?</h2>
    <p>The Nʉmʉnʉʉ were never one camp. Each band governed itself, ranged over its own country, and made its own friends and enemies.</p>
    <div class="goals bands">${BANDS.map(b => `<button class="goal" data-v="${b.id}"><span class="gi">${b.icon}</span><b>${b.id}</b><small>${esc(b.gloss)}</small>
      <span class="ga">${esc(b.about)}</span><ul class="perks">${b.perks.map(p => `<li>${esc(p)}</li>`).join("")}</ul></button>`).join("")}</div>`, { cls:"wide" });
  chooseGoal(v);
}
async function chooseGoal(band){
  const v = await modal(`<p class="eyebrow">Before the year begins</p><h2>What matters most this year?</h2>
    <p>Choose one goal. Everything else still counts, but this is what your band will be judged on.</p>
    <div class="goals">${GOALS.map(g => `<button class="goal" data-v="${g.id}"><span class="gi">${g.icon}</span><b>${g.name}</b><small>${esc(g.short)}</small><span class="ga">${esc(g.about)}</span></button>`).join("")}</div>`, { cls:"wide" });
  startGame(band, v);
}
function startGame(band, goal){
  S = goal ? newState(band, goal) : (load() || newState("Penateka", "lodges"));
  lastSnap = null; selected = null;
  $("#title").hidden = true; $("#panel").hidden = false;
  setScene(S.loc); refresh(); save();
  if (goal) setTimeout(() => modal(`<p class="eyebrow">March 1845 · ${esc(LOCS[S.loc].name)}</p><h2>The grass is coming up</h2>
    <p class="lead">You lead a ${esc(S.band)} band of about 140 Nʉmʉnʉʉ, with ${S.horses} horses. Your father Owl Feather, your wife Walks Quiet, your son Little Hawk, and your daughter Morning Grass are with you.</p>
    <p>Each moon, choose one thing to do. Your council will tell you what they think, and they remember whether you listened. Tap a face to learn who they are.</p>
    <p>Watch your food: every moon the band eats. Hunt when the herd is near, move when the grass runs thin, and find shelter before winter.</p>
    <div class="btnrow"><button class="btn primary" data-v="ok">Begin</button></div>`), 300);
}

$("#panel").addEventListener("click", e => {
  const f = e.target.closest("[data-bio]");
  if (f){ const a = ADV[f.dataset.bio]; modal(`<div class="bio">${faceSVG(a, 72)}<div><p class="eyebrow">${esc(a.role)}</p><h2>${esc(a.name)}</h2></div></div>
    <p class="lead">${esc(a.bio)}</p><p>Trust in you: <b>${S.loyal[a.id]}</b>/100${S.ignored[a.id] >= 2 ? ". Lately, you haven't been listening to them." : "."}</p>
    <div class="btnrow"><button class="btn primary" data-v="ok">Close</button></div>`); return; }
  const a = e.target.closest("[data-act]");
  if (a && !a.disabled){ selected = a.dataset.act; renderPanel(); $("#goBtn")?.focus({ preventScroll:true }); return; }
  if (e.target.closest("#goBtn") && selected) doAction(selected);
});
$("#startBtn").addEventListener("click", chooseBand);
$("#contBtn").addEventListener("click", () => startGame(null, null));
$("#howBtn").addEventListener("click", () => modal(`<p class="eyebrow">How to play</p><h2>One year, twelve moons</h2>
  <p>Each moon you choose one action: hunt, rest, trade, move camp, or ride out. Then the moon passes: the band eats, the horses graze, and something may happen.</p>
  <p><b>Food</b> runs out fast. A hundred and forty people eat a lot of buffalo. Fall hunts make the best dried meat for winter.</p>
  <p><b>Horses</b> are your wealth. They need grass. Winter grass is thin everywhere, so camp somewhere sheltered.</p>
  <p><b>Your council</b> votes on every choice and remembers. Ignore someone too often and they grow cold. Ignore the War Leader and he may go his own way.</p>
  <p><b>Your family</b> has their own stories this year. Your son wants his first buffalo. Your daughter wants to marry. Your father is getting old.</p>
  <p><b>The hunt:</b> hold RIDE (or →) and tap ARROW (or space) when the ring under a buffalo glows gold. <b>The race:</b> tap GO when the needle is in the gold.</p>
  <div class="btnrow"><button class="btn primary" data-v="ok">Got it</button></div>`));

sceneCanvas = $("#scene"); sctx = sceneCanvas.getContext("2d");
new ResizeObserver(sizeScene).observe(sceneCanvas); sizeScene();
Object.assign(scene, { biome:"llano", season:0, herd:true, camp:false, caravan:true, speed:24, seed:3 });
if (load()) $("#contBtn").hidden = false;
requestAnimationFrame(frame);
