/* numunuu.com shared page script: header, footer, and local-file link fix.
   Pages include <header data-site-top data-page="camp"></header> and
   <footer data-site-foot></footer>; this fills them in. */
(function () {
  const PAGES = [
    ["herd", "Game"], ["stories", "Turning Points"], ["camp", "Camp"],
    ["plants", "Plants"], ["codetalkers", "Code Talkers"], ["treaties", "Treaties"]
  ];
  const top = document.querySelector("[data-site-top]");
  if (top){
    const cur = top.dataset.page;
    top.className = "site-top";
    top.innerHTML = `<div class="wrap"><a class="brand" href="../">N<span class="u">ʉ</span>m<span class="u">ʉ</span>n<span class="u">ʉʉ</span></a>
      <nav aria-label="numunuu.com">${PAGES.map(([p, l]) => `<a href="../${p}/"${p === cur ? ' aria-current="page"' : ""}>${l}</a>`).join("")}
      <a href="https://dictionary.numunuu.com">Dictionary ↗</a></nav></div>`;
  }
  const foot = document.querySelector("[data-site-foot]");
  if (foot){
    foot.className = "site-foot";
    foot.innerHTML = `<div class="wrap"><p>An independent, personal project of numunuu.com. Not affiliated with or endorsed by the Comanche Nation or any language committee. Corrections are welcome.</p><p><a href="../">numunuu.com</a></p></div>`;
  }
  /* Opened from your computer (file://)? Make folder links open their index.html. */
  if (location.protocol === "file:") document.querySelectorAll("a[href]").forEach(a => {
    const h = a.getAttribute("href"); if (/^(https?:|mailto:|#)/.test(h)) return;
    if (h.endsWith("/")) a.setAttribute("href", h + "index.html");
  });
})();
