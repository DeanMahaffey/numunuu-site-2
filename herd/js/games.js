"use strict";
/* =======================================================================
   MAP
   ======================================================================= */
function catmull(pts){
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++){
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  return d;
}
const RIVERS = [
  ["Arkansas", [[120,22],[260,34],[400,46],[600,60],[800,66],[880,90],[960,170],[1000,205]], [520,48]],
  ["Canadian", [[90,170],[180,230],[250,282],[350,250],[450,236],[600,220],[800,252],[1000,278]], [560,214]],
  ["Red", [[405,300],[500,318],[600,336],[700,362],[820,392],[1000,396]], [880,384]],
  ["Brazos", [[400,420],[500,438],[600,448],[750,488],[880,580],[930,640],[1000,680]], [640,452]],
  ["Colorado", [[420,500],[480,530],[550,566],[700,612],[830,690],[950,750]], [600,575]],
  ["Pecos", [[50,250],[120,320],[160,380],[200,500],[300,580],[380,640],[460,730]], [178,440]],
  ["Río Grande", [[0,640],[120,700],[260,770],[400,792],[520,770],[640,800]], [300,768]]
];
function mapSVG(){
  const cur = LOCS[S.loc], se = seasonOf(S.moon);
  const caprock = catmull([[440,240],[452,320],[470,410],[488,500],[470,580],[430,640]]);
  return `<svg viewBox="0 0 1000 800" role="img" aria-label="Map of the Comanchería">
    <defs>
      <radialGradient id="pg" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#ead9b6"/><stop offset="1" stop-color="#c9ad80"/></radialGradient>
      <filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" result="n"/><feColorMatrix in="n" type="saturate" values="0"/>
        <feComponentTransfer><feFuncA type="table" tableValues="0 .12"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter>
      <pattern id="settle" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="10" stroke="#8a4a30" stroke-width="1.2" stroke-opacity=".35"/></pattern>
    </defs>
    <rect width="1000" height="800" fill="url(#pg)"/>
    <rect width="1000" height="800" fill="#000" filter="url(#rough)" opacity=".12"/>
    <path d="M0,0 L60,0 L40,300 L0,330 Z" fill="#b89e7a" opacity=".5"/>
    <path d="M760,800 L780,700 L860,640 L1000,600 L1000,800 Z" fill="url(#settle)"/>
    <path d="${catmull([[300,240],[440,240],[460,330],[480,450],[488,520],[440,600],[300,600],[220,520],[240,380]])}Z" fill="#e4cf9e" opacity=".55"/>
    <path d="${caprock}" fill="none" stroke="#8a5a3a" stroke-width="2.5" stroke-dasharray="2 7" stroke-linecap="round"/>
    ${RIVERS.map(([n, pts, lp]) => `<path d="${catmull(pts)}" fill="none" stroke="#5b8aa0" stroke-width="${n === "Río Grande" || n === "Arkansas" ? 3.4 : 2.4}" stroke-linecap="round" opacity=".85"/>
      <text x="${lp[0]}" y="${lp[1]}" font-family="Fira Sans Condensed, sans-serif" font-style="italic" font-weight="500" font-size="15" fill="#3d5f70" text-anchor="middle">${n}</text>`).join("")}
    <text x="340" y="455" font-family="Fira Sans Condensed, sans-serif" font-weight="600" font-size="15" letter-spacing="8" fill="#8a6a40" text-anchor="middle" opacity=".7">LLANO ESTACADO</text>
    <text x="500" y="140" font-family="Fira Sans Condensed, sans-serif" font-weight="800" font-size="44" letter-spacing="8" fill="#6b3f22" text-anchor="middle" opacity=".35">COMANCHERÍA</text>
    <text x="24" y="120" font-family="Fira Sans Condensed, sans-serif" font-weight="600" font-size="12" letter-spacing="3" fill="#5c4630" transform="rotate(-90 24 120)">NEW MEXICO</text>
    <text x="900" y="760" font-family="Fira Sans Condensed, sans-serif" font-weight="600" font-size="12" letter-spacing="3" fill="#7a3a22" text-anchor="middle">TEXAS SETTLEMENTS</text>
    <text x="520" y="790" font-family="Fira Sans Condensed, sans-serif" font-weight="600" font-size="12" letter-spacing="3" fill="#5c4630" text-anchor="middle">↓ MEXICO</text>
    ${worldMapLayer()}
    <g>${Object.values(LOCS).filter(L => L.id !== cur.id).map(L => {
      const d = dist(cur.id, L.id); return d <= reach() ? `<line x1="${cur.x}" y1="${cur.y}" x2="${L.x}" y2="${L.y}" stroke="#6b3f22" stroke-width="1.4" stroke-dasharray="4 6" opacity=".45"/>` : ""; }).join("")}</g>
    ${Object.values(LOCS).map(L => {
      const d = dist(cur.id, L.id), here = L.id === cur.id, ok = !here && d <= reach();
      const herd = herdChanceAt(L.id);
      return `<g class="node ${ok || here ? "" : "off"}" data-loc="${L.id}" tabindex="${ok ? 0 : -1}" role="button" aria-label="${esc(L.name)}${here ? " (you are here)" : ok ? "" : " (too far)"}">
        <circle class="ring" cx="${L.x}" cy="${L.y}" r="20" fill="none" stroke="#d97736" stroke-width="3" stroke-opacity="${here ? 1 : 0}"/>
        <circle class="dot" cx="${L.x}" cy="${L.y}" r="${here ? 11 : 9}" fill="${here ? "#d97736" : herd >= .6 ? "#5a3a24" : "#8a6a4a"}" stroke="#f6ead2" stroke-width="2.5"/>
        ${here ? `<path d="M${L.x},${L.y - 7} L${L.x - 6},${L.y + 5} L${L.x + 6},${L.y + 5} Z" fill="#f6ead2"/>` : ""}
        <text x="${L.x}" y="${L.y + (L.y < 80 ? 34 : -18)}" font-family="Fira Sans, sans-serif" font-size="15" font-weight="600" fill="#2e1d12" text-anchor="middle" paint-order="stroke" stroke="#ead9b6" stroke-width="4">${esc(L.name)}</text>
      </g>`; }).join("")}
  </svg>`;
}
function travelInfo(id){
  const L = LOCS[id], se = seasonOf(S.moon), cur = LOCS[S.loc];
  const herd = herdChanceAt(id), g = L.grass[se];
  const d = dist(cur.id, id);
  const lines = [
    `Buffalo: ${herdWord(herd)}`,
    ...S.rivals.filter(r => r.loc === id).map(r => `${rivalName(r)} camped there`),
    nearFrontier(id) ? "Near the frontier" : null,
    ["Grass: none","Grass: thin","Grass: good","Grass: rich"][g],
    L.shelter ? "Winter shelter" : L.exposed ? "Exposed to northers" : null,
    L.trade ? "Traders" : null,
    d > 230 ? "Long ride: tiring for the horses" : "Short ride"
  ].filter(Boolean);
  return `<div><h3>${esc(L.name)}</h3><p>${esc(L.sub)} · ${lines.join(" · ")}</p></div>`;
}
async function openMap(){
  let choice = null;
  const v = await modal(`<p class="eyebrow">Move camp · ${MONTHS[S.moon]} ${yearOf(S.moon)}</p><h2>Where will you go?</h2>
    <div class="mapwrap">${mapSVG()}</div>
    <div class="mapinfo" id="mapInfo"><p>Tap a place within reach. Your scouts can see herds inside the dotted circle; farther out, you only hear rumors. Small lodges are other bands.</p><div></div></div>
    <div class="btnrow"><button class="btn" data-v="cancel">Stay here</button></div>`, { cls:"mapcard", onMount:(wrap, close) => {
      const info = wrap.querySelector("#mapInfo");
      const choose = id => { if (!id || id === S.loc || dist(S.loc, id) > reach()) return; choice = id;
        wrap.querySelectorAll(".node circle.ring").forEach(r => r.setAttribute("stroke-opacity", r.parentNode.dataset.loc === S.loc ? 1 : 0));
        wrap.querySelector(`.node[data-loc="${id}"] circle.ring`).setAttribute("stroke-opacity", .9);
        info.innerHTML = travelInfo(id) + `<button class="btn primary" data-v="go">Travel here</button>`; };
      wrap.querySelectorAll(".node").forEach(n => { n.addEventListener("click", () => choose(n.dataset.loc));
        n.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); choose(n.dataset.loc); } }); });
    }});
  return v === "go" ? choice : null;
}

/* =======================================================================
   THE RUN: horseback hunt minigame
   Hold RIDE to speed up, release to ease off. Shoot when your horse is
   alongside a buffalo (the ring glows gold).
   ======================================================================= */
function theRun(opts = {}){
  return new Promise(resolve => {
    scene.hunting = true;
    const wrap = document.createElement("div"); wrap.id = "run";
    wrap.innerHTML = `<canvas></canvas>
      <div class="runhud"><div class="box"><div class="k">Buffalo</div><div class="v" id="rk">0</div></div>
        <div class="box" style="text-align:center"><div class="k">Time</div><div class="v" id="rt">30</div></div>
        <div class="box" style="text-align:right"><div class="k">Arrows · Horse</div><div class="v" id="ra">10</div><div class="meter"><i id="rs" style="width:100%"></i></div></div></div>
      <div class="runtip" id="rtip">${esc(opts.tip || "Hold RIDE to close in. Loose an ARROW when the ring turns gold.")}</div>
      <div class="runbtns"><button type="button" id="rideBtn">RIDE<small>hold · →</small></button><button type="button" id="shootBtn">ARROW<small>tap · space</small></button></div>`;
    document.body.appendChild(wrap);
    const cv = wrap.querySelector("canvas"), ctx = cv.getContext("2d");
    let W, H; const fit = () => { const d = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d,0,0,d,0,0); };
    fit(); addEventListener("resize", fit);
    const se = seasonOf(S.moon), L = LOCS[S.loc];
    const bg = { biome: L.biome === "canyon" ? "plains" : L.biome, season: se, herd:false, camp:false, caravan:false, scroll:0, t:0, seed:11 };
    const unit = () => Math.min(W, H * 1.5) / 900;  /* scale factor */
    const P = { x:0, v:6, stam:100, bob:0 }; let flash = 0;
    const herd = []; let kills = 0, sonKills = 0, sonT = 4, arrows = 10, time = 30, riding = false, over = false, flying = [], dust = [];
    const spawn = (x, lane) => ({ x, lane, v: 6.4 + Math.random() * 2.2, wob: Math.random() * 6, alive:true, fall:0, ph:Math.random() * 6 });
    for (let i = 0; i < 9; i++) herd.push(spawn(-200 + i * 170 + Math.random() * 60, 0));
    for (let i = 0; i < 14; i++) herd.push(spawn(-400 + i * 120, 1 + (i % 2)));
    const laneY = l => H * (l === 0 ? .7 : l === 1 ? .62 : .58);
    const playerY = () => H * .82;
    let target = null, aligned = false;
    const setRide = on => { riding = on; $("#rideBtn").classList.toggle("on", on); };
    const shoot = () => {
      if (over || arrows <= 0) return; arrows--;
      const hit = aligned && target && Math.random() < .88;
      flying.push({ x: P.x + 20, y: playerY() - 40 * unit(), tx: target ? target.x : P.x + 200, ty: target ? laneY(0) - 4 : laneY(0) - 30, t:0, hit, tgt: hit ? target : null });
      if (navigator.vibrate) try { navigator.vibrate(15); } catch {}
    };
    const rb = $("#rideBtn"), sb = $("#shootBtn");
    rb.addEventListener("pointerdown", e => { e.preventDefault(); setRide(true); });
    ["pointerup","pointerleave","pointercancel"].forEach(ev => rb.addEventListener(ev, () => setRide(false)));
    sb.addEventListener("pointerdown", e => { e.preventDefault(); shoot(); });
    const kd = e => { if (["ArrowRight","d","D","Shift"].includes(e.key)) setRide(true); if (e.key === " " || e.key === "ArrowUp"){ e.preventDefault(); shoot(); } };
    const ku = e => { if (["ArrowRight","d","D","Shift"].includes(e.key)) setRide(false); };
    addEventListener("keydown", kd); addEventListener("keyup", ku);
    let last = performance.now(), tipT = 0;
    const loop = now => {
      const dt = Math.min(.05, (now - last) / 1000); last = now; const k = dt * 60, u = unit();
      if (!over){
        time -= dt;
        if (riding && P.stam > 0){ P.v = Math.min(P.stam > 5 ? (opts.top || 10.5) : 7, P.v + .22 * k); P.stam = Math.max(0, P.stam - .45 * k); }
        else { P.v += (6 - P.v) * .04 * k; P.stam = Math.min(100, P.stam + .22 * k); }
        P.x += P.v * k * u * 1.6; P.bob += P.v * dt * 2.2;
        const cam = P.x - W * .32;
        herd.forEach(b => { if (b.alive){ b.x += (b.v + Math.sin(now / 900 + b.wob) * .6) * k * u * 1.6; b.ph += b.v * dt * 2.3;
            if (b.x < cam - 260 * u) { b.x = cam + W + Math.random() * 300 * u; b.v = 6.4 + Math.random() * 2.2; }
            if (b.x > cam + W + 700 * u) { b.x = cam - 200 * u - Math.random() * 200 * u; } }
          else b.fall = Math.min(1.35, b.fall + dt * 2.5); });
        target = null; let best = 1e9;
        herd.forEach(b => { if (b.alive && b.lane === 0){ const d = Math.abs(b.x - (P.x + 8 * u)); if (d < best){ best = d; target = b; } } });
        aligned = target && best < 24 * u;
        flying.forEach(f => { f.t += dt * 3.2; if (f.t >= 1 && !f.done){ f.done = true; if (f.hit && f.tgt && f.tgt.alive){ f.tgt.alive = false; kills++; S.buffalo++;
              herd.forEach(b => { if (b.alive) b.v += .35; }); } } });
        flying = flying.filter(f => f.t < 1.4);
        if (Math.random() < .5) dust.push({ x: P.x - 20 * u, y: playerY() + 14 * u, r: 4, a: .35 });
        dust.forEach(d => { d.r += .5 * k; d.a -= .006 * k; }); dust = dust.filter(d => d.a > 0);
        if (opts.son){ sonT -= dt; if (sonT <= 0){ sonT = rand(4, 7);
            const near = herd.find(b => b.alive && b.lane === 0 && Math.abs(b.x - (P.x - 70 * u)) < 90 * u);
            if (near && Math.random() < .45){ near.alive = false; sonKills++; S.buffalo++; flash = 1.6; } } }
        if (flash > 0) flash -= dt;
        tipT += dt; if (tipT > 5) $("#rtip").style.opacity = 0;
        if (time <= 0 || (arrows <= 0 && flying.length === 0)) { over = true; setTimeout(finish, 900); }
        $("#rk").textContent = kills; $("#rt").textContent = Math.max(0, Math.ceil(time)); $("#ra").textContent = arrows; $("#rs").style.width = P.stam + "%";
      }
      /* draw */
      const cam = P.x - W * .32; bg.scroll = cam * .9; bg.t += dt;
      paintScene(ctx, W, H, bg);
      const ord = herd.slice().sort((a, b) => b.lane - a.lane);
      ord.forEach(b => { const sx = b.x - cam; if (sx < -150 || sx > W + 150) return;
        const sc = (b.lane === 0 ? 1.15 : b.lane === 1 ? .8 : .65) * u;
        drawBuffalo(ctx, sx, laneY(b.lane) - (b.alive ? Math.abs(Math.sin(b.ph)) * 3 * sc : -10 * sc * b.fall), sc, b.ph,
          { fall: b.alive ? 0 : b.fall * .9, still: !b.alive, color: b.lane ? "#4a3626" : "#3d2b1f" }); });
      if (target && !over){ const sx = target.x - cam;
        ctx.strokeStyle = aligned ? "rgba(255,206,120,.95)" : "rgba(255,255,255,.45)"; ctx.lineWidth = aligned ? 3 : 2;
        ctx.beginPath(); ctx.ellipse(sx, laneY(0) + 20 * u, 36 * u, 9 * u, 0, 0, Math.PI*2); ctx.stroke(); }
      dust.forEach(d => { ctx.fillStyle = `rgba(214,190,150,${d.a})`; ctx.beginPath(); ctx.arc(d.x - cam, d.y, d.r * u, 0, Math.PI*2); ctx.fill(); });
      if (opts.son) drawHorse(ctx, P.x - cam - 80 * u, playerY() + 14 * u - Math.abs(Math.sin(P.bob + 1)) * 4 * u, 1.05 * u, P.bob + 1, { rider:true, bow:true, coat:"#5a3a26" });
      drawHorse(ctx, P.x - cam, playerY() - Math.abs(Math.sin(P.bob)) * 5 * u, 1.35 * u, P.bob, { rider:true, bow:true, pinto:true, coat: opts.coat || "#8a5634" });
      if (flash > 0){ ctx.font = `700 ${Math.round(18 * u + 6)}px "Fira Sans", sans-serif`; ctx.fillStyle = `rgba(255,220,160,${Math.min(1, flash)})`; ctx.textAlign = "center";
        ctx.fillText(opts.sonName + " brings one down!", W / 2, H * .3); ctx.textAlign = "left"; }
      flying.forEach(f => { const tt = Math.min(1, f.t), x = f.x + (f.tx - f.x) * tt - cam, y = f.y + (f.ty - f.y) * tt - Math.sin(tt * Math.PI) * 30 * u;
        ctx.strokeStyle = "#2a1a10"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 22 * u, y + 3 * u); ctx.stroke(); });
      if (!wrap.isConnected) return;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    function finish(){
      removeEventListener("keydown", kd); removeEventListener("keyup", ku); removeEventListener("resize", fit);
      wrap.remove(); scene.hunting = false; resolve({ kills, sonKills });
    }
  });
}

/* =======================================================================
   EVERY PART: match each part of the buffalo to what it became
   ======================================================================= */
function everyPart(kills){
  const set = shuffle(PARTS).slice(0, 5); const uses = shuffle(set);
  let sel = null, misses = 0, done = 0;
  return modal(`<p class="eyebrow">After the hunt · ${kills} buffalo</p><h2>Every Part</h2>
    <p>Nothing was wasted. Match each part to what it became. Tap a part, then its use.</p>
    <div class="ep"><div class="col"><h4>Part</h4>${set.map((p, i) => `<button class="part" data-p="${i}" aria-pressed="false">${esc(p.part)}</button>`).join("")}</div>
      <div class="col"><h4>Became</h4>${uses.map(p => `<button class="use" data-u="${set.indexOf(p)}">${esc(p.use)}</button>`).join("")}</div></div>
    <div class="fact" id="epFact" aria-live="polite">Tap a part to begin.</div>
    <div class="btnrow"><button class="btn primary" data-v="done" id="epDone" disabled>Finish processing</button></div>`, { onMount:(wrap) => {
      const fact = wrap.querySelector("#epFact");
      wrap.addEventListener("click", e => {
        const p = e.target.closest(".part"), u = e.target.closest(".use");
        if (p && !p.classList.contains("done")){ wrap.querySelectorAll(".part").forEach(x => x.setAttribute("aria-pressed","false")); p.setAttribute("aria-pressed","true"); sel = +p.dataset.p; fact.textContent = `${set[sel].part}: what did it become?`; }
        if (u && !u.classList.contains("done") && sel != null){
          if (+u.dataset.u === sel){ u.classList.add("done"); const pb = wrap.querySelector(`.part[data-p="${sel}"]`); pb.classList.add("done"); pb.setAttribute("aria-pressed","false");
            u.disabled = pb.disabled = true; fact.innerHTML = `<b>${esc(set[sel].part)} → ${esc(set[sel].use)}.</b> ${esc(set[sel].fact)}`; done++; sel = null;
            if (done === set.length) wrap.querySelector("#epDone").disabled = false; }
          else { misses++; u.classList.remove("wrong"); void u.offsetWidth; u.classList.add("wrong"); fact.textContent = "Not quite. Try another."; }
        }
      });
    }}).then(() => ({ score: clamp(5 - misses * .5, 0, 5) }));
}

/* =======================================================================
   HORSE RACE (summer gathering)
   A stride meter swings back and forth. Tap when the needle is in the
   gold zone to drive your horse on; tap badly and he breaks stride.
   ======================================================================= */
async function horseRace(s){
  const horse = s.mounts.war.alive ? mountName("war") : "a borrowed horse";
  const bet = await modal(`<p class="eyebrow">Summer gathering · the race</p><h2>Race ${esc(horse)}</h2>
    <p class="lead">Four riders line up on the flat by the creek: you on ${esc(horse)}, a Kiowa man on a tall black, Yellow Fox on his sorrel, and a Penateka boy on a gray.</p>
    <p>Tap <b>GO</b> (or space) when the swinging needle is in the gold. Hit it clean and your horse surges. Miss and he breaks stride. First to the cottonwood wins.</p>
    <p>How many horses will you bet?</p>
    <div class="btnrow"><button class="btn" data-v="0">No bet</button><button class="btn" data-v="10">10 horses</button><button class="btn primary" data-v="25">25 horses</button></div>`);
  const stake = Math.min(+bet || 0, Math.max(0, s.horses - 40));
  const place = await new Promise(resolve => {
    scene.hunting = true;
    const wrap = document.createElement("div"); wrap.id = "run";
    wrap.innerHTML = `<canvas></canvas>
      <div class="runhud"><div class="box"><div class="k">Place</div><div class="v" id="rp">4th</div></div>
        <div class="box" style="text-align:center;min-width:220px"><div class="k">Stride</div><div class="stride"><i class="zone"></i><i class="needle" id="rn"></i></div></div>
        <div class="box" style="text-align:right"><div class="k">Distance</div><div class="v" id="rd">0%</div></div></div>
      <div class="runtip" id="rtip">Tap GO when the needle hits the gold.</div>
      <div class="runbtns" style="justify-content:center"><button type="button" id="goRace" style="width:min(260px,70vw)">GO<small>tap · space</small></button></div>`;
    document.body.appendChild(wrap);
    const cv = wrap.querySelector("canvas"), ctx = cv.getContext("2d");
    let W, H; const fit = () => { const d = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d,0,0,d,0,0); };
    fit(); addEventListener("resize", fit);
    const bg = { biome:"river", season:1, herd:false, camp:false, caravan:false, scroll:0, t:0, seed:21 };
    const health = s.mounts.war.alive ? s.mounts.war.health / 100 : .6;
    const LEN = 8600;
    const racers = [
      { name:"You", x:0, v:0, base:6.3 + health * .9, coat:"#8a4a2c", pinto:true, you:true, ph:0, boost:0 },
      { name:"Kiowa black", x:0, v:0, base:7.05, coat:"#1f1a18", ph:1, surge:0 },
      { name:"Yellow Fox", x:0, v:0, base:6.85, coat:"#b0652e", ph:2, surge:0 },
      { name:"Penateka gray", x:0, v:0, base:6.7, coat:"#9a9289", ph:3, surge:0 }
    ];
    const me = racers[0];
    let needle = 0, nt = 0, done = false, finish = [], stumble = 0, flashT = 0, flashTxt = "";
    const tap = () => {
      if (done) return;
      const d = Math.abs(needle - .5);
      if (d < .05){ me.boost = Math.min(4, me.boost + 2.4); flashTxt = "Perfect!"; }
      else if (d < .12){ me.boost = Math.min(4, me.boost + 1.5); flashTxt = "Good"; }
      else { stumble = .5; me.boost = Math.max(0, me.boost - 1); flashTxt = "Broke stride"; }
      flashT = .7;
    };
    const btn = wrap.querySelector("#goRace");
    btn.addEventListener("pointerdown", e => { e.preventDefault(); tap(); btn.classList.add("on"); setTimeout(() => btn.classList.remove("on"), 120); });
    const kd = e => { if (e.key === " " || e.key === "ArrowUp" || e.key === "Enter"){ e.preventDefault(); tap(); } };
    addEventListener("keydown", kd);
    let last = performance.now(), tipT = 0;
    const loop = now => {
      const dt = Math.min(.05, (now - last) / 1000); last = now; const k = dt * 60, u = Math.min(W, H * 1.5) / 900;
      if (!done){
        nt += dt * (2.1 + me.x / LEN * 1.2); needle = .5 + .5 * Math.sin(nt * Math.PI);
        me.boost = Math.max(0, me.boost - dt * 1.1); stumble = Math.max(0, stumble - dt);
        me.v = me.base + me.boost - (stumble > 0 ? 2.2 : 0);
        racers.slice(1).forEach(r => { r.surge -= dt; if (r.surge <= 0) r.surge = rand(.8, 2.2), r.kick = rand(-.6, 1.3); r.v = r.base + r.kick * .8 + (r.x > LEN * .7 ? .35 : 0); });
        racers.forEach(r => { r.x += r.v * k; r.ph += r.v * dt * 2.3; if (r.x >= LEN && !finish.includes(r)) finish.push(r); });
        if (finish.includes(me) || finish.length >= 3){ done = true; setTimeout(end, 1100); }
        const order = racers.slice().sort((a, b) => b.x - a.x);
        const pl = order.indexOf(me) + 1; $("#rp").textContent = ["1st","2nd","3rd","4th"][pl - 1];
        $("#rd").textContent = Math.min(100, Math.round(me.x / LEN * 100)) + "%";
        $("#rn").style.left = (needle * 100) + "%";
        tipT += dt; if (tipT > 4) $("#rtip").style.opacity = 0;
        if (flashT > 0) flashT -= dt;
      }
      const cam = me.x * u * 1.6 - W * .4; bg.scroll = cam * .9; bg.t += dt;
      paintScene(ctx, W, H, bg);
      /* finish post: a lone cottonwood */
      const fx = LEN * u * 1.6 - cam;
      if (fx > -100 && fx < W + 100){ ctx.fillStyle = "#4a3828"; ctx.fillRect(fx - 4, H * .55, 8, H * .22);
        ctx.fillStyle = "#5d7d3a"; for (let i = 0; i < 6; i++){ ctx.beginPath(); ctx.ellipse(fx + (i - 2.5) * 16 * u, H * .52 - (i % 2) * 18 * u, 34 * u, 26 * u, 0, 0, Math.PI*2); ctx.fill(); } }
      racers.slice().reverse().forEach((r, i) => { const lane = racers.indexOf(r);
        const y = H * (.66 + lane * .055), sc = (1 + lane * .07) * u;
        drawHorse(ctx, r.x * u * 1.6 - cam, y - Math.abs(Math.sin(r.ph)) * 5 * sc, 1.15 * sc, r.ph, { rider:true, coat:r.coat, pinto:r.pinto }); });
      if (flashT > 0){ ctx.font = `800 ${Math.round(26 * u + 8)}px "Fira Sans Condensed", sans-serif`; ctx.textAlign = "center";
        ctx.fillStyle = flashTxt === "Broke stride" ? `rgba(255,140,120,${flashT})` : `rgba(255,220,150,${flashT})`; ctx.fillText(flashTxt, W / 2, H * .34); ctx.textAlign = "left"; }
      if (wrap.isConnected) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    function end(){ removeEventListener("keydown", kd); removeEventListener("resize", fit); wrap.remove(); scene.hunting = false;
      const order = racers.slice().sort((a, b) => b.x - a.x); resolve(order.indexOf(me) + 1); }
  });
  let line;
  if (place === 1){ s.horses += stake * 2; s.traits.brave++; s.harmony += 4; line = `${horse} wins by a length!${stake ? ` You take ${stake * 2} horses in bets.` : ""} The whole gathering is talking about him.`; }
  else if (place === 2){ line = `Second, by a nose. ${stake ? "Your bet is returned by custom, since it was so close." : "A good race."}`; }
  else { s.horses -= stake; line = `${["","First","Second","Third","Last"][place]} place.${stake ? ` You lose ${stake} horses.` : ""} ${place === 4 ? "The Kiowa will not let you forget it." : ""}`; }
  if (s.mounts.war.alive && chance(.15)) line += hurtMount(s, "war", 30) || ` ${mountName("war")} pulled up sore.`;
  return line.trim();
}

/* =======================================================================
   READING THE LAND: three choices, each with a real sign and two
   misleading ones. Teaches how people found water and lost children.
   ======================================================================= */
const LAND_ROUNDS = {
  water: [
    { q:"It is evening. What do you follow?", right:"Doves flying low and fast, all toward the same draw",
      wrong:["A hawk circling high over the flats","The direction the wind comes from"],
      why:"Doves must drink every day and fly straight to water around dusk. Hawks get water from their prey." },
    { q:"On the ground you see:", right:"Horse and buffalo trails worn deep, all bending one way",
      wrong:["Fresh antelope tracks, scattered everywhere","An old travois trail heading south"],
      why:"Animal trails converge on water. Antelope can go a long time without drinking, so their tracks wander." },
    { q:"On the horizon:", right:"A dark green line of hackberry and willow in a draw",
      wrong:["Bright yellow broomweed on a flat","A tall stand of yucca on a ridge"],
      why:"Willow and hackberry need water near the surface. Broomweed and yucca thrive in dry ground." }
  ],
  child: [
    { q:"Where she was last seen, the grass is:", right:"Bent in a thin line, still slowly springing back",
      wrong:["Flattened in a wide circle","Untouched in every direction"],
      why:"Fresh trail through grass springs back slowly. A wide flattened circle is where a buffalo bedded down." },
    { q:"In the soft dirt by a wallow:", right:"Small moccasin prints beside puppy tracks, heading downhill",
      wrong:["Coyote tracks circling","Big moccasin prints heading toward camp"],
      why:"Small children and small dogs both drift downhill, toward water and low ground." },
    { q:"It is getting dark. You:", right:"Stop, keep still, and listen for the puppy",
      wrong:["Ride fast in a straight line to cover ground","Go back to camp and wait for morning"],
      why:"On the open plains, sound carries at night. A dog barking or a child crying can be heard a long way off." }
  ]
};
async function readTheLand(s, mode = "water"){
  let score = 0;
  for (const [i, r] of LAND_ROUNDS[mode].entries()){
    const opts = shuffle([r.right, ...r.wrong]);
    const v = await modal(`<p class="eyebrow">${mode === "water" ? "Finding water" : "Searching for the child"} · sign ${i + 1} of 3</p><h2>${esc(r.q)}</h2>
      <div class="choices">${opts.map((o, k) => `<button class="choice" data-v="${k}"><b>${esc(o)}</b></button>`).join("")}</div>`);
    const ok = opts[+v] === r.right; if (ok) score++;
    await modal(`<p class="eyebrow">${ok ? "You read it right" : "Not that"}</p><h2>${ok ? "Good eyes." : "The sign was:"}</h2>
      <p class="lead">${esc(ok ? r.right : r.right)}</p><div class="note"><b>Why</b>${esc(r.why)}</div>
      <div class="btnrow"><button class="btn primary" data-v="ok">${i < 2 ? "Next sign" : "See what happens"}</button></div>`);
  }
  if (mode === "water"){
    if (score === 3){ s.traits.wise += 2; s.harmony += 4; return "You lead the camp straight to a seep in a draw, just as the light goes. People will remember who found it."; }
    if (score === 2){ const n = randi(4, 10); s.horses -= n; s.traits.wise++; return `You find water on the second day. ${n} weak horses don't make it.`; }
    const n = randi(20, 35); s.horses -= n; return `Three days wandering before you find water. ${n} horses die.${hurtMount(s, "runner", 20)}`;
  }
  if (score >= 2){ s.traits.wise++; s.harmony += 6; return "You find her asleep in a buffalo wallow with the puppy, both of them warm and fine. Her mother won't let go of you."; }
  return "A rider finds her at dawn, cold and scared but alive. It was closer than anyone wants to think about.";
}

/* =======================================================================
   TRADE WITH HAGGLING
   Each trader has patience. Push for a better rate and you may get it,
   or he may pack up and leave.
   ======================================================================= */
async function tradeScreen(kind){
  const T = {
    bent:       { name:"Bent's traders", patience:3, mood:["Friendly enough.","He's counting his kettles.","He's losing patience.","He's packing up."],
      offers:[ { t:l => `1 robe → ${2 + l} goods`, can:s => s.robes >= 1, go:(s,l) => { s.robes--; s.goods += 2 + l; } },
               { t:l => `5 horses → ${3 + l} goods`, can:s => s.horses >= 40, go:(s,l) => { s.horses -= 5; s.goods += 3 + l; } },
               { t:l => `2 goods → ${40 + l * 15} food (flour, sugar, coffee)`, can:s => s.goods >= 2, go:(s,l) => { s.goods -= 2; s.food += 40 + l * 15; } } ] },
    comanchero: { name:"The Comancheros", patience:4, mood:["All smiles.","Still smiling.","The smile is thin now.","Muttering in Spanish.","Hitching up the carts."],
      offers:[ { t:l => `1 robe → ${30 + l * 10} food (bread, flour)`, can:s => s.robes >= 1, go:(s,l) => { s.robes--; s.food += 30 + l * 10; } },
               { t:l => `1 robe → ${1 + l} goods (iron, cloth)`, can:s => s.robes >= 1, go:(s,l) => { s.robes--; s.goods += 1 + l; } },
               { t:l => `4 horses → ${60 + l * 20} food`, can:s => s.horses >= 40, go:(s,l) => { s.horses -= 4; s.food += 60 + l * 20; } } ] },
    torrey:     { name:"Torrey's trading house", patience:2, mood:["Businesslike.","Tapping his ledger.","Done talking."],
      offers:[ { t:l => `1 robe → ${2 + l} goods`, can:s => s.robes >= 1, go:(s,l) => { s.robes--; s.goods += 2 + l; } },
               { t:l => `1 robe → ${25 + l * 10} food (corn, flour)`, can:s => s.robes >= 1, go:(s,l) => { s.robes--; s.food += 25 + l * 10; } },
               { t:() => "3 goods as a gift → more trust", can:s => s.goods >= 3, go:s => { s.goods -= 3; s.standing += 6; }, fixed:true } ] }
  }[kind];
  const bonus = (bandOf().mods.patience?.[kind] || 0) + ((kind === "comanchero" && S.nat.comanchero >= 70) || (kind === "bent" && S.nat.americans >= 70) ? 1 : 0);
  const maxPat = T.patience + bonus;
  const start = snapshot(); let count = 0, pat = maxPat; const lv = T.offers.map(() => 0); let msg = "Make as many trades as you like. Push for a better rate and you might get it, or he might leave.";
  await modal(`<p class="eyebrow">Trade · takes the whole moon</p><h2>${T.name}</h2><p id="tMsg"></p>
    <p class="mono" id="tStock"></p><div class="choices" id="tOffers"></div>
    <div class="btnrow"><button class="btn primary" data-v="done">Finish trading</button></div>`, { onMount:(wrap) => {
      const draw = () => { clampState();
        wrap.querySelector("#tMsg").innerHTML = `${esc(msg)} <span class="tag">${esc(T.mood[Math.min(T.mood.length - 1, Math.round((maxPat - pat) / maxPat * (T.mood.length - 1)))])}</span>`;
        wrap.querySelector("#tStock").textContent = `Robes ${S.robes} · Goods ${S.goods} · Horses ${S.horses} · Food ${S.food}`;
        wrap.querySelector("#tOffers").innerHTML = T.offers.map((o, i) => { const ok = o.can(S) && pat > 0;
          return `<div class="offer"><button class="choice" data-o="${i}" ${ok ? "" : "disabled"}><b>${esc(o.t(lv[i]))}</b></button>
            ${o.fixed ? "" : `<button class="btn haggle" data-h="${i}" ${pat > 0 && lv[i] < 2 ? "" : "disabled"}>Haggle</button>`}</div>`; }).join(""); };
      draw();
      wrap.querySelector("#tOffers").addEventListener("click", e => {
        const b = e.target.closest("[data-o]"), h = e.target.closest("[data-h]");
        if (b && !b.disabled){ const i = +b.dataset.o; const o = T.offers[i]; if (o.can(S) && pat > 0){ o.go(S, lv[i]); count++; msg = "Done."; const nk = { bent:"americans", comanchero:"comanchero" }[kind]; if (nk) S.nat[nk] += 2; } }
        if (h && !h.disabled){ const i = +h.dataset.h; pat--;
          if (chance(.6)){ lv[i]++; msg = pat > 0 ? "He sighs and agrees to the better rate." : "He agrees, then says that's the last deal today."; }
          else msg = pat > 0 ? "He shakes his head. Not today." : "That's it. He's done trading with you this moon."; }
        draw();
      });
    }});
  const d = k => S[k] - start[k];
  const f = n => (n >= 0 ? "+" : "") + n;
  return count ? `Traded with ${T.name}: robes ${f(d("robes"))}, goods ${f(d("goods"))}, food ${f(d("food"))}, horses ${f(d("horses"))}.` : `Visited ${T.name} but made no trades.`;
}
