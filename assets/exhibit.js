/* numunuu.com online exhibits: builds the walls and the image viewer from window.EX.
   EX = { rooms:[{ no, title, intro, wide, works:[key...], voice:{q,c}, cards:[{t,html}] }],
          works:{ key:{ t, d, src, big, r, lab, q, qc, credit, link } } }
   src/big are image URLs; r is width/height. */
(function () {
  const EX = window.EX; if (!EX) return;
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const W = EX.works, ORDER = EX.rooms.flatMap(r => r.works);
  const roomOf = k => EX.rooms.find(r => r.works.includes(k));
  const host = document.getElementById("rooms");
  if (host) host.innerHTML = EX.rooms.map(r => `
<section class="room" aria-labelledby="room${r.no}">
  <div class="wrap">
    <div class="room-head"><span class="no">${r.no}</span><h2 id="room${r.no}">${r.title}</h2><p>${r.intro}</p></div>
    <div class="wall${r.wide ? " wide" : ""}">
      ${r.works.map(k => { const w = W[k]; return `<button class="work" type="button" data-k="${k}" aria-label="${esc(w.t)}${w.d ? ", " + esc(w.d) : ""}. Open.">
        <span class="frame" style="aspect-ratio:${w.r.toFixed(3)}"><img loading="lazy" decoding="async" alt="${esc(w.alt || w.t)}" src="${w.src}"><span class="miss">This image could not load right now.</span></span>
        <span class="t">${w.t}</span>${w.d ? `<span class="d">${w.d}</span>` : ""}</button>`; }).join("")}
      ${(r.cards || []).map(c => `<div class="textcard"><b>${c.t}</b>${c.html}</div>`).join("")}
    </div>
    ${r.voice ? `<blockquote class="voice"><p>“${r.voice.q}”</p><cite>${r.voice.c}</cite></blockquote>` : ""}
  </div>
</section>`).join("");

  /* fade images in; note if they fail */
  document.querySelectorAll(".frame img,.ch figure img").forEach(img => {
    const done = () => img.classList.add("on");
    if (img.complete && img.naturalWidth) done();
    else { img.addEventListener("load", done); img.addEventListener("error", () => img.parentElement.classList.add("err")); }
  });

  /* hero photo over the painted fallback */
  const art = document.getElementById("heroArt");
  if (art){
    const show = () => { art.classList.add("on"); const c = document.getElementById("heroCap"); if (c) c.hidden = false; };
    if (art.complete && art.naturalWidth) show(); else art.addEventListener("load", show);
    const cv = document.getElementById("heroCv");
    if (cv && typeof paintScene === "function"){
      const ctx = cv.getContext("2d"), o = Object.assign({ biome:"granite", season:2, tod:.3, herd:false, camp:false, caravan:false, scroll:0, t:0, seed:7 }, EX.scene || {});
      let w = 0, h = 0, last = 0;
      const fit = () => { const d = Math.min(2, devicePixelRatio || 1); w = cv.clientWidth; h = cv.clientHeight; cv.width = w * d; cv.height = h * d; ctx.setTransform(d,0,0,d,0,0); };
      new ResizeObserver(fit).observe(cv); fit();
      const loop = ts => { const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts; o.t += dt;
        if (art.classList.contains("on")) return; if (w) paintScene(ctx, w, h, o); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }
  }

  /* viewer */
  if (!ORDER.length) return;
  document.body.insertAdjacentHTML("beforeend", `<dialog class="viewer" id="viewer" aria-labelledby="vTitle"><div class="vw">
    <button class="x" type="button" data-close aria-label="Close">×</button>
    <div class="pic" id="vPic"><img id="vImg" alt=""><span class="hint">Tap to zoom</span></div>
    <div class="txt"><p class="eyebrow" id="vRoom"></p><h3 id="vTitle"></h3><p class="meta" id="vMeta"></p><p class="lab" id="vLab"></p><div id="vQuote"></div><p class="credit" id="vCredit"></p>
    <div class="nav"><button class="btn" type="button" data-step="-1">← Previous</button><button class="btn" type="button" data-step="1">Next →</button></div></div></div></dialog>`);
  const dlg = document.getElementById("viewer"), pic = document.getElementById("vPic"), vImg = document.getElementById("vImg");
  let cur = null;
  function show(k){
    const w = W[k], r = roomOf(k); cur = k; pic.classList.remove("zoom");
    vImg.src = w.src; vImg.alt = w.alt || w.t;
    if (w.big){ const b = new Image(); b.onload = () => { if (cur === k) vImg.src = b.src; }; b.src = w.big; }
    document.getElementById("vRoom").textContent = `${EX.roomWord || "Wall"} ${r.no} · ${r.title}`;
    document.getElementById("vTitle").textContent = w.t;
    document.getElementById("vMeta").textContent = w.meta || w.d || "";
    document.getElementById("vLab").innerHTML = w.lab || "";
    document.getElementById("vQuote").innerHTML = w.q ? `<blockquote>“${w.q}”<small>${w.qc || ""}</small></blockquote>` : "";
    document.getElementById("vCredit").innerHTML = (w.credit || "") + (w.link ? ` <a href="${w.link}" rel="noopener">Source ↗</a>` : "");
    history.replaceState(null, "", "#" + k);
  }
  const step = n => show(ORDER[(ORDER.indexOf(cur) + n + ORDER.length) % ORDER.length]);
  document.addEventListener("click", e => { const b = e.target.closest && e.target.closest(".work[data-k]"); if (!b) return; show(b.dataset.k); dlg.showModal(); });
  dlg.addEventListener("click", e => {
    if (e.target === dlg || e.target.closest("[data-close]")) return dlg.close();
    const s = e.target.closest("[data-step]"); if (s) step(+s.dataset.step);
  });
  pic.addEventListener("click", e => { const b = vImg.getBoundingClientRect();
    vImg.style.setProperty("--ox", ((e.clientX - b.left) / b.width * 100) + "%"); vImg.style.setProperty("--oy", ((e.clientY - b.top) / b.height * 100) + "%");
    pic.classList.toggle("zoom"); });
  document.addEventListener("keydown", e => { if (dlg.open && (e.key === "ArrowRight" || e.key === "ArrowLeft")) step(e.key === "ArrowRight" ? 1 : -1); });
  dlg.addEventListener("close", () => history.replaceState(null, "", location.pathname));
  if (location.hash && W[location.hash.slice(1)]){ show(location.hash.slice(1)); dlg.showModal(); }
})();
