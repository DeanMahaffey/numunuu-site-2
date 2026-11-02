/* numunuu.com shared page script: header, footer, and local-file link fix.
   Pages include <header data-site-top data-page="camp"></header> and
   <footer data-site-foot></footer>; this fills them in. */
(function () {
  const MAIN = [["map", "Map"], ["timeline", "Timeline"], ["herd", "Game"]];
  const EXHIBITS = [
    ["november", "30 Days of Comanche"], ["stories", "Turning Points"], ["treaties", "The Treaties"], ["catlin", "Painted in 1834"],
    ["quanah", "Quanah and the Star House"], ["beadwork", "Beads, Paint, and Fringe"], ["school", "Fort Sill Indian School"],
    ["codetalkers", "The Code Talkers"], ["honor", "Honor Wall"], ["camp", "Walk Through a Camp"], ["plants", "Plants of the Comanchería"]
  ];
  const top = document.querySelector("[data-site-top]");
  if (top){
    const cur = top.dataset.page, inEx = EXHIBITS.some(([p]) => p === cur), B = cur === "home" ? "" : "../";
    const a = ([p, l]) => `<a href="${B}${p}/"${p === cur ? ' aria-current="page"' : ""}>${l}</a>`;
    top.className = "site-top";
    top.innerHTML = `<div class="wrap"><a class="brand" href="${B || "./"}" aria-label="numunuu.com home">N<span class="u">ʉ</span>m<span class="u">ʉ</span>n<span class="u">ʉʉ</span></a>
      <nav aria-label="numunuu.com">${MAIN.map(a).join("")}
      <details class="exmenu"><summary${inEx ? ' class="cur"' : ""}>Exhibits</summary><div class="exlist">${EXHIBITS.map(a).join("")}<a class="mob" href="${B}herd/">Follow the Herd (game)</a><a class="mob" href="https://dictionary.numunuu.com">Dictionary ↗</a></div></details>
      ${a(["visit", "Visit"])}<a href="https://dictionary.numunuu.com">Dictionary ↗</a></nav></div>`;
    const d = top.querySelector(".exmenu");
    document.addEventListener("click", e => { if (d.open && !d.contains(e.target)) d.open = false; });
    document.addEventListener("keydown", e => { if (e.key === "Escape") d.open = false; });
  }
  const foot = document.querySelector("[data-site-foot]");
  if (foot){
    const B2 = top && top.dataset.page === "home" ? "" : "../";
    foot.className = "site-foot";
    foot.innerHTML = `<div class="wrap"><p>© ${new Date().getFullYear() > 2026 ? "2026–" + new Date().getFullYear() : "2026"} Numunuu. Text, design and code are original to this site. Historic images and documents are public domain or used under the licenses shown with each one.</p><p>An independent, personal project. Not affiliated with or endorsed by the Comanche Nation or any language committee. Corrections are welcome.</p><p><a href="${B2}about/#copyright">Copyright</a> · <a href="${B2}about/">About and sources</a> · <a href="${B2 || "./"}">numunuu.com</a></p></div>`;
  }
  /* Opened from your computer (file://)? Make folder links open their index.html. */
  if (location.protocol === "file:") document.querySelectorAll("a[href]").forEach(a => {
    const h = a.getAttribute("href"); if (/^(https?:|mailto:|#)/.test(h)) return;
    if (h.endsWith("/")) a.setAttribute("href", h + "index.html");
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
