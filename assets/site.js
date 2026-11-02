/* numunuu.com shared page script: header, footer, and local-file link fix.
   Pages include <header data-site-top data-page="camp"></header> and
   <footer data-site-foot></footer>; this fills them in. */
(function () {
  const MAIN = [["map", "Map"], ["timeline", "Timeline"], ["herd", "Game"]];
  const EXHIBITS = [
    ["november", "30 Days of Comanche"], ["stories", "Turning Points"], ["treaties", "The Treaties"], ["catlin", "Painted in 1834"],
    ["quanah", "Quanah and the Star House"], ["beadwork", "Beads, Paint, and Fringe"], ["school", "Fort Sill Indian School"],
    ["codetalkers", "The Code Talkers"], ["honor", "Honor Wall"], ["ancestors", "Finding Comanche Ancestors"], ["camp", "Walk Through a Camp"], ["plants", "Plants of the Comanchería"]
  ];
  /* Winter as a Weapon joins the menu on December 1, 2026 (Lawton time). */
  const ct = new Intl.DateTimeFormat("en-CA", { timeZone:"America/Chicago", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date());
  const topEl = document.querySelector("[data-site-top]");
  if (ct >= "2026-12-01" || (topEl && topEl.dataset.page === "winter")) EXHIBITS.splice(2, 0, ["winter", "Winter as a Weapon"]);
  const top = document.querySelector("[data-site-top]");
  if (top){
    const cur = top.dataset.page, inEx = EXHIBITS.some(([p]) => p === cur), B = top.dataset.base != null ? top.dataset.base : cur === "home" ? "" : "../";
    const a = ([p, l]) => `<a href="${B}${p}/"${p === cur ? ' aria-current="page"' : ""}>${l}</a>`;
    top.className = "site-top";
    top.innerHTML = `<div class="wrap"><a class="brand" href="${B || "./"}" aria-label="numunuu.com home">N<span class="u">ʉ</span>m<span class="u">ʉ</span>n<span class="u">ʉʉ</span></a>
      <nav aria-label="numunuu.com">${MAIN.map(a).join("")}
      <details class="exmenu"><summary${inEx ? ' class="cur"' : ""}>Exhibits</summary><div class="exlist">${EXHIBITS.map(a).join("")}<a class="mob" href="${B}visit/">Visit the museum</a><a class="mob" href="${B}herd/">Follow the Herd (game)</a><a class="mob" href="https://dictionary.numunuu.com">Dictionary ↗</a></div></details>
      ${a(["visit", "Visit"])}<a href="https://dictionary.numunuu.com">Dictionary ↗</a>
      <button class="sbtn" type="button" aria-label="Search the site" title="Search (press /)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></button></nav></div>`;
    const d = top.querySelector(".exmenu");
    document.addEventListener("click", e => { if (d.open && !d.contains(e.target)) d.open = false; });
    document.addEventListener("keydown", e => { if (e.key === "Escape") d.open = false; });
  }
  const foot = document.querySelector("[data-site-foot]");
  if (foot){
    const B2 = top && top.dataset.base != null ? top.dataset.base : top && top.dataset.page === "home" ? "" : "../";
    foot.className = "site-foot";
    foot.innerHTML = `<div class="wrap"><p>© ${new Date().getFullYear() > 2026 ? "2026–" + new Date().getFullYear() : "2026"} Numunuu. Text, design and code are original to this site. Historic images and documents are public domain or used under the licenses shown with each one.</p><p>An independent, personal project. Not affiliated with or endorsed by the Comanche Nation or any language committee. Corrections are welcome.</p><p><a href="${B2}calendar/">2027 calendar</a> · <a href="${B2}about/#copyright">Copyright</a> · <a href="${B2}about/">About and sources</a> · <a href="${B2 || "./"}">numunuu.com</a></p></div>`;
  }
  /* Opened from your computer (file://)? Make folder links open their index.html. */
  if (location.protocol === "file:") document.querySelectorAll("a[href]").forEach(a => {
    const h = a.getAttribute("href"); if (/^(https?:|mailto:|#)/.test(h)) return;
    if (h.endsWith("/")) a.setAttribute("href", h + "index.html");
  });
})();

/* ---------- photos: our own copy loads first; a sharper museum copy replaces it if it arrives ---------- */
document.querySelectorAll("img[data-hi]").forEach(img => {
  const hi = new Image(); hi.onload = () => { img.src = hi.src; }; hi.src = img.dataset.hi;
});

/* ---------- site search: index in assets/search.json, opened from the header ---------- */
(function () {
  const top = document.querySelector("[data-site-top]"), btn = top && top.querySelector(".sbtn");
  if (!btn) return;
  const B = top.dataset.base != null ? top.dataset.base : top.dataset.page === "home" ? "" : "../";
  let data = null, dlg = null, inp = null, list = null, sel = 0, hits = [];
  const fold = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ʉ/g, "u").replace(/[’']/g, "'");
  const escS = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
  function hrefFor(e){
    const base = e.u ? B + e.u : (B || "./");
    if (e.a) return base + "#" + e.a;
    if (e.top) return base;
    return base + "#:~:text=" + encodeURIComponent(e.t);
  }
  function mark(text, terms){
    let out = escS(text);
    terms.forEach(t => { if (t.length < 2) return;
      const re = new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
      out = out.replace(re, "<mark>$1</mark>"); });
    return out;
  }
  function snippet(x, terms){
    if (!x) return "";
    const f = fold(x); let i = -1;
    for (const t of terms){ i = f.indexOf(t); if (i >= 0) break; }
    if (i < 0) return x.slice(0, 140) + (x.length > 140 ? "…" : "");
    const a = Math.max(0, i - 50);
    return (a ? "…" : "") + x.slice(a, a + 160) + (x.length > a + 160 ? "…" : "");
  }
  function run(q){
    const terms = fold(q).split(/[^a-z0-9']+/).filter(Boolean);
    if (!terms.length){ hits = []; render(q, terms); return; }
    hits = data.map(e => {
      const T = e._t || (e._t = fold(e.t)), X = e._x || (e._x = fold(e.x)), P = e._p || (e._p = fold(e.pg || e.t));
      let sc = 0;
      for (const t of terms){
        const wb = new RegExp("(^|[^a-z0-9])" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
        if (wb.test(T)) sc += 8; else if (T.includes(t)) sc += 4;
        else if (wb.test(X)) sc += 2; else if (X.includes(t)) sc += 1;
        else if (P.includes(t)) sc += 1;
        else return null;
      }
      if (e.top) sc += 3;
      return { e, sc };
    }).filter(Boolean).sort((a, b) => b.sc - a.sc).slice(0, 30).map(h => h.e);
    render(q, terms);
  }
  function render(q, terms){
    sel = 0;
    if (!q.trim()){
      list.innerHTML = `<p class="shint">Try <button type="button" data-q="Quanah">Quanah</button> <button type="button" data-q="code talkers">code talkers</button> <button type="button" data-q="Medicine Lodge">Medicine Lodge</button> <button type="button" data-q="beadwork">beadwork</button> <button type="button" data-q="pecans">pecans</button></p>`;
      return;
    }
    const dict = `<a class="sres dict" href="https://dictionary.numunuu.com" rel="noopener"><b>Look up words in the Comanche dictionary ↗</b><small>dictionary.numunuu.com</small></a>`;
    if (!hits.length){ list.innerHTML = `<p class="snone">Nothing on the site matches “${escS(q)}”.</p>` + dict; return; }
    list.innerHTML = hits.map((e, i) => `<a class="sres${i === 0 ? " on" : ""}" href="${escS(hrefFor(e))}"><span class="spg">${escS(e.top ? "Page" : e.pg)}</span><b>${mark(e.t, terms)}</b><small>${mark(snippet(e.x, terms), terms)}</small></a>`).join("") + dict;
  }
  function move(d){
    const rs = list.querySelectorAll(".sres"); if (!rs.length) return;
    sel = (sel + d + rs.length) % rs.length;
    rs.forEach((r, i) => r.classList.toggle("on", i === sel)); rs[sel].scrollIntoView({ block:"nearest" });
  }
  function build(){
    dlg = document.createElement("dialog"); dlg.className = "sdlg"; dlg.setAttribute("aria-label", "Search numunuu.com");
    dlg.innerHTML = `<div class="sbox"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
      <input type="search" placeholder="Search people, places, treaties, plants…" aria-label="Search" autocomplete="off" spellcheck="false"><button type="button" class="sx" aria-label="Close">Esc</button></div>
      <div class="slist" role="list"></div>`;
    document.body.appendChild(dlg);
    inp = dlg.querySelector("input"); list = dlg.querySelector(".slist");
    inp.addEventListener("input", () => { if (data) run(inp.value); });
    inp.addEventListener("keydown", e => {
      if (e.key === "ArrowDown"){ e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp"){ e.preventDefault(); move(-1); }
      else if (e.key === "Enter"){ const r = list.querySelectorAll(".sres")[sel]; if (r){ e.preventDefault(); r.click(); } }
    });
    list.addEventListener("click", e => { const b = e.target.closest("button[data-q]"); if (b){ inp.value = b.dataset.q; run(inp.value); inp.focus(); } else { const l = e.target.closest("a"); if (l && new URL(l.href, location.href).pathname === location.pathname) dlg.close(); } });
    dlg.querySelector(".sx").addEventListener("click", () => dlg.close());
    dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
  }
  async function open(){
    if (!dlg) build();
    if (!dlg.open) dlg.showModal();
    inp.select(); render(inp.value, []);
    if (!data){
      list.innerHTML = `<p class="shint">Loading…</p>`;
      try { data = await (await fetch(B + "assets/search.json")).json(); } catch { list.innerHTML = `<p class="snone">Search couldn't load. Try again in a moment.</p>`; return; }
    }
    run(inp.value);
  }
  btn.addEventListener("click", open);
  document.addEventListener("keydown", e => {
    if (e.key === "/" && !e.metaKey && !e.ctrlKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable){ e.preventDefault(); open(); }
  });
})();

/* ---------- polish: scroll reveal, count-up numbers, card tilt ---------- */
(function () {
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const css = document.createElement("style");
  css.textContent = `.rv{opacity:0;transform:translateY(22px);transition:opacity .8s ease,transform .8s cubic-bezier(.2,.7,.2,1)}
    .rv.in{opacity:1;transform:none}
    [data-tilt]{transition:transform .25s ease;will-change:transform}`;
  document.head.appendChild(css);
  if (still) return;
  /* reveal: only things that start below the fold, so nothing flashes on load */
  const REVEAL = ".chapter,.section .card,.more a,.facts .card,.senses > li,.hist a,.roll > div,.sources,.note,.tool,.codes,.room-head,.wall .work,.voice,.read .card,.see .card,.stop,.prep a,.when li,.ch,.ev,.years div,.alumni > *,.compare > div,.status div,.list > div";
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin:"0px 0px -8% 0px" });
  document.querySelectorAll(REVEAL).forEach((el, i) => {
    if (el.getBoundingClientRect().top < innerHeight * .92) return;
    el.classList.add("rv"); el.style.transitionDelay = (i % 4) * 60 + "ms"; io.observe(el);
  });
  /* count-up: <b data-count="17">17</b>, optional data-prefix */
  const co = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return; co.unobserve(e.target);
    const el = e.target, to = +el.dataset.count, pre = el.dataset.prefix || "", t0 = performance.now(), dur = 1200;
    const step = (now) => { const k = Math.min(1, (now - t0) / dur), v = Math.round(to * (1 - Math.pow(1 - k, 3)));
      el.textContent = pre + v; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), { threshold:.6 });
  document.querySelectorAll("[data-count]").forEach((el) => co.observe(el));
  /* tilt: cards lean toward the pointer */
  if (!matchMedia("(hover: hover)").matches) return;
  const TILT = ".more a,.hist a,.preview,a.tl,.plant,.goal,.code,.prep a";
  let cur = null;
  document.addEventListener("pointermove", (e) => {
    const el = e.target.closest && e.target.closest(TILT);
    if (cur && cur !== el){ cur.style.transform = ""; cur = null; }
    if (!el) return; cur = el; el.dataset.tilt = "";
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    if (el.classList.contains("code") && el.classList.contains("flip")) return;
    el.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-3px)`;
  }, { passive:true });
  document.addEventListener("pointerleave", () => { if (cur){ cur.style.transform = ""; cur = null; } });
})();
