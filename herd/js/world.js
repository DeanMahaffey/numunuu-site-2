"use strict";
/* =======================================================================
   THE LIVING WORLD (Phase 2)
   - BANDS: which band you lead changes your home, friends, and strengths
   - NATIONS: relations that remember how you treated them
   - HERDS: buffalo herds that migrate across the map by season
   - RIVALS: other bands that move, hunt, and compete for the same grass
   - FRONTIER: the Texas settlement line, creeping west all year
   ======================================================================= */

const BANDS = [
  { id:"Penateka", gloss:"Honey Eaters", start:"sansaba", icon:"🌰",
    about:"The southernmost band, in the oak hills and pecan groves of central Texas. Closest to the Texans, for better and worse: the best trade, and the most pressure.",
    perks:["Start on the San Saba, near the frontier","Texans trust you more; Torrey's traders are patient","Pecan harvests yield more","Lipan Apache raids come more often"],
    mods:{ standing:62, nat:{ lipan:5, wichita:60 }, pecans:1.6, patience:{ torrey:2 } } },
  { id:"Yamparika", gloss:"Yap Eaters, after a root they dug", start:"timbers", icon:"🌾",
    about:"The northern band, along the Arkansas and Canadian. Friends of the Kiowa and Cheyenne, traders with Bent's Fort, and far from the Texas frontier.",
    perks:["Start at Big Timbers on the Arkansas","Kiowa and Cheyenne start as allies","Bent's traders are patient with you","Pawnee horse thieves are a constant threat"],
    mods:{ standing:40, nat:{ kiowa:72, cheyenne:70, americans:65, pawnee:5 }, patience:{ bent:2 } } },
  { id:"Kotsoteka", gloss:"Buffalo Eaters", start:"paloduro", icon:"🦬",
    about:"Bands of the Canadian River and the canyons of the caprock. Famous hunters, and close partners of the New Mexican Comancheros.",
    perks:["Start in Palo Duro Canyon","Every successful hunt brings one more buffalo","Comancheros are old friends","Fewer trade goods to start"],
    mods:{ nat:{ comanchero:72 }, huntBonus:1, goods:5, patience:{ comanchero:2 } } },
  { id:"Nokoni", gloss:"Those Who Turn Back, the wanderers", start:"red", icon:"🐎",
    about:"Always on the move between the Red River and the Canadian. Fast travelers with big horse herds and no fixed favorites.",
    perks:["Start on the Pease River","Ride farther in a single move","Start with 500 horses","Fewer robes to start"],
    mods:{ reach:430, horses:500, robes:10 } }
];
const bandOf = () => BANDS.find(b => b.id === S.band) || BANDS[0];
const reach = () => (S && bandOf().mods.reach) || REACH;

const NATIONS = {
  kiowa:      { name:"Kiowa", kind:"ally", about:"Your closest allies since about 1790. They camp, hunt, and raid alongside the Comanche." },
  cheyenne:   { name:"Cheyenne & Arapaho", kind:"north", about:"Former enemies to the north. A great peace was made with them near Bent's Fort in 1840." },
  comanchero: { name:"Comancheros", kind:"trade", about:"New Mexican traders who bring bread, flour, iron, and cloth onto the plains." },
  americans:  { name:"Bent's traders", kind:"trade", about:"American traders from Bent's Fort on the Arkansas." },
  wichita:    { name:"Wichita villages", kind:"trade", about:"Farming villages on the Red River. Corn, pumpkins, and tobacco for robes and meat." },
  lipan:      { name:"Lipan Apache", kind:"enemy", about:"Old enemies, driven south of the Comanchería in the 1700s." },
  pawnee:     { name:"Pawnee", kind:"enemy", about:"Enemies to the north who raid for horses." }
};
const NAT_DEFAULT = { kiowa:55, cheyenne:50, comanchero:55, americans:50, wichita:50, lipan:12, pawnee:15 };
function natWord(v){ return v >= 70 ? "Allied" : v >= 50 ? "Friendly" : v >= 30 ? "Wary" : "Hostile"; }

/* ---------------- Herds ---------------- */
/* Seasonal targets for each herd: [spring, summer, fall, winter] */
const HERD_PATHS = {
  north: { name:"Northern herd", path:[[520,210],[380,70],[470,220],[620,330]] },
  llano: { name:"Llano herd",    path:[[390,380],[320,430],[420,410],[450,300]] },
  south: { name:"Southern herd", path:[[600,470],[470,510],[620,520],[690,580]] }
};
function initHerds(){
  return Object.entries(HERD_PATHS).map(([id, h]) => { const [x, y] = h.path[3]; return { id, x: x + rand(-30, 30), y: y + rand(-30, 30), size: 100 }; });
}
function herdTick(){
  const se = seasonOf(S.moon);
  for (const h of S.herds){
    const [tx, ty] = HERD_PATHS[h.id].path[se];
    h.x += (tx - h.x) * .55 + rand(-28, 28); h.y += (ty - h.y) * .55 + rand(-22, 22);
    h.x = clamp(h.x, 40, 960); h.y = clamp(h.y, 30, 760);
    h.size = clamp(h.size + (se === 0 ? 7 : 2), 10, 120);
  }
}
/* chance a herd is near a place this moon */
function herdChanceAt(id){
  const L = LOCS[id]; let best = .04;
  for (const h of S.herds){ const d = Math.hypot(h.x - L.x, h.y - L.y); best = Math.max(best, (h.size / 100) * clamp(1.15 - d / 170, 0, 1)); }
  const rivals = S.rivals.filter(r => r.loc === id).length;
  best *= Math.pow(.72, rivals);
  if (nearFrontier(id)) best *= .6;
  if (S.flags.burned === id) best *= 1.3;
  return clamp(best, 0, .95);
}
function nearestHerd(id){ const L = LOCS[id]; return S.herds.slice().sort((a, b) => Math.hypot(a.x - L.x, a.y - L.y) - Math.hypot(b.x - L.x, b.y - L.y))[0]; }
function depleteHerd(id, kills){ const h = nearestHerd(id); if (h) h.size = Math.max(10, h.size - kills * 1.6); }
const herdWord = p => p >= .6 ? "likely" : p >= .35 ? "possible" : "scarce";

/* ---------------- Rival bands ---------------- */
const RIVAL_POOL = [
  { id:"yamp", band:"Yamparika", name:"Old Horn's Yamparika", home:["timbers","canadian","paloduro","wichita"] },
  { id:"kots", band:"Kotsoteka", name:"Wolf Lying Down's Kotsoteka", home:["canadian","paloduro","llano"] },
  { id:"pena", band:"Penateka", name:"Tall Tree's Penateka", home:["sansaba","bigspring","torrey","red"] },
  { id:"noko", band:"Nokoni", name:"Sore Back's Nokoni", home:["wichita","red","paloduro","llano"] },
  { id:"kiowa", band:"Kiowa", name:"Yellow Hide's Kiowa", home:["wichita","timbers","red","canadian"] }
];
function initRivals(band){
  const start = BANDS.find(b => b.id === band).start;
  return RIVAL_POOL.filter(r => r.band !== band).slice(0, 4).map(r => ({ id:r.id, loc: pick(r.home.filter(h => h !== start)) || r.home[0], rel:55, last:-9 }));
}
const rivalDef = id => RIVAL_POOL.find(r => r.id === id);
const rivalName = r => rivalDef(r.id).name;
const rivalRel = r => r.id === "kiowa" ? S.nat.kiowa : r.rel;
function rivalTick(){
  const se = seasonOf(S.moon);
  for (const r of S.rivals){
    const def = rivalDef(r.id);
    const opts = Object.keys(LOCS).filter(id => id === r.loc || dist(r.loc, id) <= 330);
    let best = r.loc, bestScore = -1;
    for (const id of opts){
      const L = LOCS[id];
      let sc = herdChanceAt(id) + L.grass[se] * .12 + (def.home.includes(id) ? .2 : 0) + rand(0, .35);
      if (se === 3 && L.shelter) sc += .4;
      if (id === "torrey" && def.band !== "Penateka") sc -= .5;
      if (sc > bestScore){ bestScore = sc; best = id; }
    }
    r.loc = best;
    /* rivals hunt where they camp */
    if (chance(.55)) depleteHerd(r.loc, randi(3, 8));
  }
}

/* ---------------- Frontier ---------------- */
const FRONT_A = [[1000,560],[900,610],[810,690],[770,800]];
const FRONT_B = [[1000,500],[850,520],[730,600],[680,700],[650,800]];
function frontierPts(){ const f = clamp(S.frontier, 0, 1); return FRONT_A.map((p, i) => [p[0] + (FRONT_B[i][0] - p[0]) * f, p[1] + (FRONT_B[i][1] - p[1]) * f]); }
function nearFrontier(id){
  const L = LOCS[id], pts = frontierPts();
  let dmin = 1e9;
  for (let i = 0; i < pts.length - 1; i++){ const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const t = clamp(((L.x - ax) * (bx - ax) + (L.y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2), 0, 1);
    dmin = Math.min(dmin, Math.hypot(L.x - (ax + t * (bx - ax)), L.y - (ay + t * (by - ay)))); }
  return dmin < 85 || id === "torrey";
}
function frontierTick(){ S.frontier = clamp(S.frontier + .085, 0, 1); }

/* one call per moon */
function worldTick(){ herdTick(); rivalTick(); frontierTick(); }

/* ---------------- Map overlay (herds, rivals, frontier) ---------------- */
function worldMapLayer(){
  const cur = LOCS[S.loc]; const scout = 340; const out = [];
  const fp = frontierPts();
  out.push(`<path d="M${fp.map(p => p.join(",")).join(" L")} L1000,800 Z" fill="#8a3a20" fill-opacity=".14"/>`);
  out.push(`<path d="M${fp.map(p => p.join(",")).join(" L")}" fill="none" stroke="#8a3a20" stroke-width="2.5" stroke-dasharray="10 6" opacity=".7"/>`);
  out.push(`<text x="${fp[3][0] + 14}" y="${fp[3][1] + 6}" font-family="Fira Sans Condensed, sans-serif" font-weight="700" font-size="13" fill="#7a2e16">Frontier, ${MONTHS[Math.min(S.moon, 11)]}</text>`);
  for (const h of S.herds){
    const seen = Math.hypot(h.x - cur.x, h.y - cur.y) <= scout;
    const r = 22 + h.size * .32; const rng = mulberry(h.id.length * 97 + S.moon);
    if (seen){
      let dots = ""; const n = Math.round(10 + h.size * .3);
      for (let i = 0; i < n; i++){ const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * r; dots += `<ellipse cx="${(h.x + Math.cos(a) * d).toFixed(1)}" cy="${(h.y + Math.sin(a) * d * .7).toFixed(1)}" rx="4.2" ry="2.8" fill="#3d2b1f"/>`; }
      out.push(`<g class="herdmk"><ellipse cx="${h.x}" cy="${h.y}" rx="${r + 8}" ry="${(r + 8) * .7}" fill="#5a3a24" fill-opacity=".12"/>${dots}
        <text x="${h.x}" y="${h.y + r * .7 + 18}" font-family="Fira Sans Condensed, sans-serif" font-weight="700" font-size="12" fill="#3d2b1f" text-anchor="middle">${HERD_PATHS[h.id].name} · ${h.size >= 80 ? "huge" : h.size >= 50 ? "large" : "thinning"}</text></g>`);
    } else {
      const jx = h.x + (rng() - .5) * 120, jy = h.y + (rng() - .5) * 90;
      out.push(`<g opacity=".55"><ellipse cx="${jx}" cy="${jy}" rx="${r + 20}" ry="${(r + 20) * .7}" fill="none" stroke="#5a3a24" stroke-width="1.5" stroke-dasharray="3 5"/>
        <text x="${jx}" y="${jy + 4}" font-family="Fira Sans Condensed, sans-serif" font-style="italic" font-size="12" fill="#5a3a24" text-anchor="middle">rumored herd</text></g>`);
    }
  }
  out.push(`<circle cx="${cur.x}" cy="${cur.y}" r="${scout}" fill="none" stroke="#d97736" stroke-width="1" stroke-opacity=".35" stroke-dasharray="2 6"/>`);
  /* rival camps */
  const byLoc = {}; S.rivals.forEach(r => (byLoc[r.loc] = byLoc[r.loc] || []).push(r));
  for (const [loc, rs] of Object.entries(byLoc)){ const L = LOCS[loc];
    rs.forEach((r, i) => { const x = L.x + 26 + i * 16, y = L.y + 14;
      out.push(`<g><path d="M${x},${y - 12} L${x - 7},${y + 2} L${x + 7},${y + 2} Z" fill="${r.id === "kiowa" ? "#2f4a5a" : "#7a4a2a"}" stroke="#f6ead2" stroke-width="1.2"/>
        <title>${esc(rivalName(r))}</title></g>`); });
    out.push(`<text x="${L.x + 26}" y="${L.y + 30}" font-family="Fira Sans Condensed, sans-serif" font-size="11.5" fill="#4a2e1a">${rs.map(r => esc(rivalName(r).split("'")[0])).join(", ")}</text>`);
  }
  return out.join("");
}

/* ---------------- Nations panel ---------------- */
function nationsHTML(){
  return `<details class="family nations"><summary>Nations and bands</summary><ul>
    <li><b>Texans</b> ${natBar(S.standing)} <span class="nw">${natWord(S.standing)}</span></li>
    ${Object.entries(NATIONS).map(([k, n]) => `<li><b>${n.name}</b> ${natBar(S.nat[k])} <span class="nw">${natWord(S.nat[k])}</span></li>`).join("")}
    ${S.rivals.filter(r => r.id !== "kiowa").map(r => `<li><b>${esc(rivalName(r))}</b> ${natBar(r.rel)} <span class="nw">${natWord(r.rel)}</span></li>`).join("")}
  </ul></details>`;
}
const natBar = v => `<span class="hbar"><i style="width:${v}%;background:${v >= 70 ? "var(--sage)" : v >= 40 ? "var(--gold)" : "var(--red)"}"></i></span>`;

/* ---------------- Phase 2 events ---------------- */
const rivalHere = s => s.rivals.find(r => r.loc === s.loc && s.moon - r.last >= 3);
EVENTS.push(
  { id:"rival-camp", w:5, repeat:true, when:s => !!rivalHere(s), title:s => `${rivalName(rivalHere(s))} camp beside you`,
    text:s => { const r = rivalHere(s); return `Lodges going up across the creek: ${rivalName(r)}. ${rivalRel(r) >= 60 ? "Old friends." : rivalRel(r) < 35 ? "There is bad blood between your bands." : "Not friends, not enemies."} Two bands on the same ground means less grass and fewer buffalo for both.`; },
    choices:s => { const r = rivalHere(s); return [
      { label:"Hunt together and share the meat", votes:{ peace:1, elder:1 }, trait:{ generous:1 }, fx:s => { r.last = s.moon; r.rel += 12; if (r.id === "kiowa") s.nat.kiowa += 8; s.food += 50; return "A big surround with both bands' riders. Meat for everyone, and a good feeling between the camps."; } },
      { label:"Feast them", sub:"Costs 40 food", votes:{ peace:1, camp:-1 }, trait:{ generous:1 }, fx:s => { r.last = s.moon; s.food -= 40; r.rel += 18; if (r.id === "kiowa") s.nat.kiowa += 10; s.goods += 2; return "Singing late into the night. Their chief gives you a fine bow and two kettles."; } },
      { label:"Tell them to move on", sub:"This is your ground", votes:{ war:1, peace:-1 }, trait:{ brave:1 }, fx:s => { r.last = s.moon; r.rel -= 18; if (r.id === "kiowa") s.nat.kiowa -= 12; const alt = Object.keys(LOCS).filter(id => id !== s.loc && dist(s.loc, id) < 330); r.loc = pick(alt) || r.loc; return "Hard words between the young men. In the morning their lodges are down and they are gone."; } }
    ]; },
    note:"Comanche bands shared the same territory without fixed borders. Bands camped together often, but competition for grass and herds was real, and leaders worked to keep it friendly." },

  { id:"rival-ran", w:4, repeat:true, when:s => !s.herdHere && s.rivals.some(r => r.loc === s.loc), title:"Someone ran the herd first",
    text:s => `Scouts found the herd, or what's left of it. ${rivalName(s.rivals.find(r => r.loc === s.loc))} hunted it two days ago. The buffalo have scattered.`,
    choices:s => { const r = s.rivals.find(r => r.loc === s.loc); return [
      { label:"Ask for a share", votes:{ peace:1, camp:1 }, fx:s => rivalRel(r) >= 50 ? (s.food += 60, r.rel += 4, "They send over packhorses of meat. That is how it should be between relatives.") : (r.rel -= 4, "They say they need it all. Maybe they do.") },
      { label:"Complain loudly at their fire", votes:{ war:1, peace:-1 }, fx:s => { r.rel -= 10; return "Words, nothing more. But they will remember them."; } },
      { label:"Let it go", votes:{ elder:1 }, trait:{ wise:1 }, fx:() => "Buffalo are not owned. There will be other herds." }
    ]; },
    note:"Hunting before a band's organized hunt could scatter a herd for everyone. Within a band, hunt police punished anyone who ran the herd early." },

  { id:"rival-join", w:3, when:s => s.harmony >= 72 && s.rivals.some(r => r.id !== "kiowa" && r.rel >= 55), title:"Families want to join you",
    text:s => { const r = s.rivals.filter(r => r.id !== "kiowa" && r.rel >= 55)[0]; return `Six lodges from ${rivalName(r)} ask to camp with you from now on. They say your camp is well run and your hunts are good.`; },
    choices:s => { const r = s.rivals.filter(r => r.id !== "kiowa" && r.rel >= 55)[0]; return [
      { label:"Welcome them", votes:{ peace:1, camp:1, war:1 }, fx:s => { s.people += 16; s.horses += 45; r.rel -= 12; return "Sixteen more people and their horses. Your band grows. Their old chief is not pleased."; } },
      { label:"Send them home", sub:"Keep peace with their chief", votes:{ peace:1 }, trait:{ wise:1 }, fx:() => { r.rel += 8; return "You tell them to stay with their own people. Their chief hears of it and respects you for it."; } }
    ]; },
    note:"People moved freely between bands. A leader's band grew or shrank depending on how well he provided for and protected his people." },

  { id:"wichita-corn", w:3, when:(s,L) => ["wichita","red"].includes(L.id), title:"Wichita traders",
    text:"Wichita traders arrive from their villages on the Red River, their horses loaded with dried corn, pumpkin, melons, and tobacco.",
    choices:[
      { label:"Trade robes for corn", sub:"4 robes for 110 food", votes:{ camp:1, elder:1 }, nat:{ wichita:10 }, fx:s => { const n = Math.min(4, s.robes); s.robes -= n; s.food += Math.round(n * 27.5); return n ? `${n} robes for sacks of corn and dried pumpkin.` : "You have no robes to trade."; } },
      { label:"Trade meat for tobacco", sub:"40 food for 2 goods", votes:{ war:1 }, nat:{ wichita:6 }, fx:s => { s.food -= 40; s.goods += 2; return "Meat for tobacco. The old men are happy."; } },
      { label:"Send them home", nat:{ wichita:-6 }, fx:() => "The Wichita turn back to their villages." }
    ],
    note:"The Wichita were farmers who lived in grass-house villages. Comanches traded meat and robes for their corn, squash, and tobacco, a partnership that lasted generations." },

  { id:"kiowa-sundance", w:3, when:(s,L,se) => se === 1 && s.nat.kiowa >= 55 && ["wichita","red","timbers","canadian"].includes(L.id), title:"An invitation from the Kiowa",
    text:"Kiowa messengers ride in: their Sun Dance is a few days away, and your band is invited to camp as guests.",
    choices:[
      { label:"Go, and bring gifts", sub:"20 horses", votes:{ peace:1, elder:1, war:1 }, trait:{ generous:1 }, nat:{ kiowa:15 }, fx:s => { s.horses -= 20; s.harmony += 8; return "Days of ceremony, visiting, and trading. The Kiowa will not forget your gifts."; } },
      { label:"Send regrets", nat:{ kiowa:-5 }, fx:() => "You send a messenger with your regrets." }
    ],
    note:"The Kiowa held their Sun Dance each summer, gathering all their bands. Allies, including Comanches, often camped nearby as guests." },

  { id:"new-braunfels", w:6, when:(s,L) => s.moon <= 3 && ["sansaba","torrey","bigspring"].includes(L.id), title:"Germans on the Guadalupe",
    text:"Scouts report a new town on the Guadalupe River: hundreds of strangers who speak neither English nor Spanish, cutting cedar and building cabins. They say a German prince sent them.",
    choices:[
      { label:"Ride in to look and trade", votes:{ peace:1, camp:1 }, trait:{ peace:1 }, fx:s => { s.goods += 3; s.standing += 3; return "The Germans are nervous but polite, and pay well in iron and cloth. They ask a lot of questions about the land to the northwest."; } },
      { label:"Run off their horses", votes:{ war:1, peace:-1 }, trait:{ brave:1 }, fx:s => { s.horses += 25; s.standing -= 12; s.heat++; return "Twenty-five horses. The settlers will build a stockade now."; } },
      { label:"Leave them be", fx:() => "You watch from the hills and ride on." }
    ],
    note:"German colonists founded New Braunfels in March 1845 and Fredericksburg in 1846. In 1847 their leader John Meusebach made a treaty with Penateka chiefs that both sides kept. You can read it in the Treaties exhibit at numunuu.com/treaties." },

  { id:"cabins", w:4, when:(s,L) => nearFrontier(L.id) && s.frontier >= .45, title:"Cabins where you camped",
    text:"Two winters ago you camped here. Now there is a cabin, a split-rail fence, and a field of corn where the horse herd used to graze.",
    choices:[
      { label:"Take their horses", votes:{ war:1, peace:-1 }, trait:{ brave:1 }, fx:s => { s.horses += randi(10, 25); s.standing -= 15; s.heat++; return "You take what horses they have. The family hides in the cabin."; } },
      { label:"Trade with them", sub:"Meat for coffee and sugar", votes:{ peace:1, camp:1 }, trait:{ peace:1 }, fx:s => { s.food -= 20; s.goods += 2; s.standing += 4; return "A strange afternoon: a settler family and your people trading over a fence."; } },
      { label:"Move on", votes:{ elder:1 }, fx:() => "Owl Feather looks at the fence a long time before you ride away." }
    ],
    note:"The Texas frontier advanced west through the 1840s and 1850s, onto land the Comanche had never ceded. Each new farm pushed the herds, and the people, farther out." },

  { id:"comanchero-guns", w:3, when:(s,L) => s.nat.comanchero >= 68 && ["canadian","llano","paloduro"].includes(L.id), title:"Old friends from the Pecos",
    text:"A Comanchero you have traded with for years rides in alone. He has something special: a few good rifles, powder, and lead.",
    choices:[
      { label:"Trade for the guns", sub:"25 horses", votes:{ war:1 }, nat:{ comanchero:5 }, fx:s => { s.horses -= 25; s.goods += 8; s.traits.brave++; return "Five rifles and powder. The young men fight over who gets to carry them."; } },
      { label:"Not this time", nat:{ comanchero:-2 }, fx:() => "He shrugs and rides back toward the Pecos." }
    ],
    note:"Comancheros traded guns and ammunition onto the plains despite Mexican, and later U.S., laws against it." }
);

/* make enemy raids scale with how bad relations are */
for (const e of EVENTS){
  if (e.id === "pawnee") e.w = s => 1 + (50 - s.nat.pawnee) / 18;
  if (e.id === "lipan")  e.w = s => 1 + (50 - s.nat.lipan) / 18;
}
