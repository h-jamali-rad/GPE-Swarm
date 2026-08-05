// ===== Project Brain — front-end for all views =====
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (t, c, h) => { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; };
const esc = s => (s || "").replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
const isFa = s => /[\u0600-\u06FF]/.test(s || "");

let B = null;         // brain data
let cy = null;        // cytoscape instance
const byId = {};      // id -> source

// ---------- theme ----------
function initTheme() {
  const saved = localStorage.getItem("gpe-theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  $("#themeBtn").textContent = saved === "dark" ? "🌙" : "☀️";
  $("#themeBtn").onclick = () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const nxt = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nxt);
    localStorage.setItem("gpe-theme", nxt);
    $("#themeBtn").textContent = nxt === "dark" ? "🌙" : "☀️";
    if (cy) styleGraph();
  };
}

// ---------- boot ----------
async function boot() {
  initTheme();
  try {
    B = await (await fetch("./brain.json", { cache: "no-store" })).json();
  } catch (e) {
    $("#loading").textContent = "خطا در بارگذاری brain.json";
    return;
  }
  B.sources.forEach(s => byId[s.id] = s);
  $("#loading").remove();
  $("#ftmeta").textContent = `مغز پروژه — ${B.stats.sources} منبع دیجست‌شده · آخرین به‌روزرسانی: ${new Date(B.generated).toLocaleString("fa-IR")}`;

  renderOverview(); renderDossiers(); renderChapters(); renderGaps(); renderMatrix();

  $$("#tabs .tab").forEach(t => t.onclick = () => switchView(t.dataset.view));
  // deep-link via hash
  const h = location.hash.slice(1);
  if (h && $("#view-" + h)) switchView(h);
  $("#modalBg").onclick = e => { if (e.target.id === "modalBg") closeModal(); };
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
}

function switchView(v) {
  $$("#tabs .tab").forEach(t => t.classList.toggle("active", t.dataset.view === v));
  $$(".view").forEach(s => s.classList.toggle("active", s.id === "view-" + v));
  location.hash = v;
  if (v === "graph") renderGraph();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------- OVERVIEW ----------
function renderOverview() {
  const v = $("#view-overview");
  const s = B.stats;
  const partial = B.stats.sources < 198;
  const topThemes = B.themes.slice(0, 14);
  v.innerHTML = `
    ${partial ? `<div class="progress-note">⏳ دیجست در حال تکمیل است — هم‌اکنون ${s.sources} از ۱۹۸ منبع پردازش شده. با پایان پردازش، این ارقام به‌روز می‌شوند.</div>` : ""}
    <h1>مغز پروژه: نقشه مفهومی منابع رساله</h1>
    <p class="sub">شکل‌گیری پیمان جهانی محیط زیست و تأثیرات آن بر موافقت‌نامه‌های چندجانبه محیط‌زیستی</p>
    <div class="stats">
      <div class="stat"><b>${s.sources}</b><span>منبع دیجست‌شده</span></div>
      <div class="stat"><b>${s.core}</b><span>منبع هسته‌ای</span></div>
      <div class="stat"><b>${s.themes}</b><span>محور موضوعی</span></div>
      <div class="stat"><b>${s.gaps}</b><span>شکاف پژوهشی</span></div>
      <div class="stat"><b>${s.novelty}</b><span>فرصت نوآوری</span></div>
    </div>
    <div class="frame-grid">
      <div class="card"><h4>پرسش اصلی</h4><p>شکل‌گیری «پیمان جهانی محیط زیست» چه تأثیری بر «موافقت‌نامه‌های چندجانبه محیط‌زیستی» (MEAs) خواهد داشت؟</p></div>
      <div class="card"><h4>فرضیه اصلی</h4><p>نظر به پراکندگی و خلأهای هنجاری و فقدان سند الزام‌آور حاوی اصول بنیادین، پیمانِ الزام‌آور موجب نظم و توسعه هنجاری اصول و تبدیل حقوق نرم به حقوق سخت می‌شود.</p></div>
    </div>
    <div class="card">
      <h4>محورهای موضوعی پرتکرار</h4>
      <div class="chip-row" id="ov-themes"></div>
    </div>`;
  const box = $("#ov-themes");
  topThemes.forEach(t => {
    const c = el("button", "tagchip", `${esc(t.name)}<span class="n">${t.count}</span>`);
    c.onclick = () => { switchView("dossiers"); filterByTheme(t.name); };
    box.append(c);
  });
}

// ---------- GRAPH ----------
function graphColors() {
  const cs = getComputedStyle(document.documentElement);
  return {
    core: cs.getPropertyValue("--core").trim(), supp: cs.getPropertyValue("--supp").trim(),
    peri: cs.getPropertyValue("--peri").trim(), theme: cs.getPropertyValue("--accent3").trim(),
    line: cs.getPropertyValue("--line").trim(), ink: cs.getPropertyValue("--ink").trim(),
    muted: cs.getPropertyValue("--muted").trim(),
  };
}
function styleGraph() {
  if (!cy) return;
  const c = graphColors();
  cy.style([
    { selector: "node[kind='source']", style: {
        "background-color": e => e.data("importance") === "core" ? c.core : e.data("importance") === "peripheral" ? c.peri : c.supp,
        "width": e => e.data("importance") === "core" ? 22 : 15, "height": e => e.data("importance") === "core" ? 22 : 15,
        "label": "data(label)", "font-size": 7, "color": c.muted, "text-valign": "center", "text-halign": "center",
        "text-margin-y": -12, "border-width": 0 } },
    { selector: "node[kind='theme']", style: {
        "background-color": c.theme, "shape": "round-rectangle", "label": "data(label)",
        "width": e => 30 + Math.min(60, e.data("weight") * 6), "height": 22,
        "font-size": 9, "color": c.ink, "text-valign": "center", "text-halign": "center",
        "text-wrap": "wrap", "text-max-width": "90", "padding": 4 } },
    { selector: "edge", style: { "width": 1, "line-color": c.line, "opacity": .5, "curve-style": "haystack" } },
    { selector: ".faded", style: { "opacity": .08 } },
    { selector: ".hl", style: { "opacity": 1, "line-color": c.theme, "width": 2 } },
  ]);
}
function renderGraph() {
  const v = $("#view-graph");
  if (v.dataset.built) return;
  v.dataset.built = "1";
  v.innerHTML = `
    <div class="view-head"><h2>نقشه دانش</h2>
      <p>گره‌های دایره‌ای = منابع (سبز: هسته‌ای)، مستطیل‌های کهربایی = محورهای موضوعی. روی هر گره کلیک کنید. اتصال‌ها نشان می‌دهند هر منبع به کدام محورها می‌پردازد.</p></div>
    <div class="graph-controls">
      <button class="facet active" data-imp="all">همه</button>
      <button class="facet" data-imp="core">فقط هسته‌ای</button>
      <button class="icon-btn" id="fitBtn" title="بازنشانی نما">⤢</button>
    </div>
    <div id="cy"></div>
    <div class="graph-legend">
      <span><i class="dot" style="background:var(--core)"></i>منبع هسته‌ای</span>
      <span><i class="dot" style="background:var(--supp)"></i>منبع پشتیبان</span>
      <span><i class="dot" style="background:var(--peri)"></i>منبع حاشیه‌ای</span>
      <span><i class="dot" style="background:var(--accent3)"></i>محور موضوعی</span>
    </div>`;
  cy = cytoscape({
    container: $("#cy"),
    elements: [...B.graph.nodes, ...B.graph.edges],
    layout: { name: "cose", animate: false, nodeRepulsion: 9000, idealEdgeLength: 70, padding: 30 },
    minZoom: .2, maxZoom: 3,
  });
  styleGraph();
  cy.on("tap", "node", evt => {
    const n = evt.target;
    cy.elements().addClass("faded");
    n.removeClass("faded"); n.neighborhood().removeClass("faded").addClass("hl");
    n.connectedEdges().removeClass("faded").addClass("hl");
    if (n.data("kind") === "source") openSource(n.id());
    else showThemeSources(n.data("label"));
  });
  cy.on("tap", e => { if (e.target === cy) cy.elements().removeClass("faded hl"); });
  $("#fitBtn").onclick = () => { cy.elements().removeClass("faded hl"); cy.fit(null, 30); };
  $$("#view-graph .facet[data-imp]").forEach(b => b.onclick = () => {
    $$("#view-graph .facet[data-imp]").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    const imp = b.dataset.imp;
    cy.batch(() => {
      cy.nodes("[kind='source']").forEach(n => {
        n.style("display", imp === "all" || n.data("importance") === "core" ? "element" : "none");
      });
    });
    cy.layout({ name: "cose", animate: false, nodeRepulsion: 9000, idealEdgeLength: 70 }).run();
  });
}
function showThemeSources(theme) {
  const ids = (B.themes.find(t => t.name === theme) || {}).source_ids || [];
  const body = `<div class="modal-hd"><div><h2>${esc(theme)}</h2><div class="sub">${ids.length} منبع به این محور می‌پردازند</div></div><button class="x" onclick="closeModal()">×</button></div>
    <div class="modal-bd"><div class="pill-list">${ids.map(id => {
      const s = byId[id]; if (!s) return "";
      return `<div class="it" style="cursor:pointer" onclick="openSource('${id}')"><b>${esc(s.title)}</b><div class="muted" style="font-size:.78rem">${id} · ${esc(s.doc_type)}</div></div>`;
    }).join("")}</div></div>`;
  showModal(body);
}

// ---------- MATRIX ----------
function renderMatrix() {
  const v = $("#view-matrix");
  const { cols, rows } = B.matrix;
  let html = `<div class="view-head"><h2>ماتریس ارتباط منبع × محور</h2>
    <p>هر خانه پررنگ یعنی آن منبع به آن محور موضوعی می‌پردازد. روی نام منبع یا خانه کلیک کنید تا پرونده کامل باز شود.</p></div>
    <div class="matrix-scroll"><table class="matrix"><thead><tr><th style="writing-mode:horizontal-tb;transform:none">منبع \\ محور</th>`;
  cols.forEach(c => html += `<th>${esc(c)}</th>`);
  html += `</tr></thead><tbody>`;
  rows.forEach(r => {
    html += `<tr><th title="${esc(r.title)}" onclick="openSource('${r.id}')">${esc(r.title.slice(0, 42))}</th>`;
    r.cells.forEach((c, i) => {
      html += `<td class="cell ${c ? "on" : ""}" ${c ? `onclick="openSource('${r.id}')" title="${esc(r.title)} — ${esc(cols[i])}"` : ""}></td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table></div>`;
  v.innerHTML = html;
}

// ---------- DOSSIERS ----------
let dossState = { q: "", cat: "all", imp: "all", theme: null };
function renderDossiers() {
  const v = $("#view-dossiers");
  const cats = [...new Set(B.sources.map(s => s.category))].sort();
  v.innerHTML = `
    <div class="view-head"><h2>پرونده منابع</h2><p>هر کارت یک «کارت مغزی» کامل است. برای دیدن ادعاها، گزیده‌های صفحه‌دار، نگاشت به فصول، شکاف‌ها و نوآوری، روی کارت کلیک کنید.</p></div>
    <div class="controls">
      <input type="search" id="dsearch" placeholder="جستجو در عنوان، چکیده، محورها…" />
      <div class="facets" id="imp-facets">
        <button class="facet active" data-imp="all">همه اهمیت‌ها</button>
        <button class="facet" data-imp="core">هسته‌ای</button>
        <button class="facet" data-imp="supporting">پشتیبان</button>
        <button class="facet" data-imp="peripheral">حاشیه‌ای</button>
      </div>
      <div class="facets" id="cat-facets">
        <button class="facet active" data-cat="all">همه دسته‌ها</button>
        ${cats.map(c => `<button class="facet" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}
      </div>
      <div class="facets" id="theme-active"></div>
    </div>
    <div class="grid" id="doss-grid"></div>`;
  $("#dsearch").oninput = e => { dossState.q = e.target.value.trim().toLowerCase(); drawDoss(); };
  $$("#imp-facets .facet").forEach(b => b.onclick = () => { setFacet("#imp-facets", b); dossState.imp = b.dataset.imp; drawDoss(); });
  $$("#cat-facets .facet").forEach(b => b.onclick = () => { setFacet("#cat-facets", b); dossState.cat = b.dataset.cat; drawDoss(); });
  drawDoss();
}
function setFacet(sel, btn) { $$(sel + " .facet").forEach(x => x.classList.remove("active")); btn.classList.add("active"); }
function filterByTheme(theme) { dossState.theme = theme; renderThemeActive(); drawDoss(); }
function renderThemeActive() {
  const box = $("#theme-active"); if (!box) return;
  box.innerHTML = dossState.theme ? `<button class="facet active" onclick="clearTheme()">محور: ${esc(dossState.theme)} ✕</button>` : "";
}
window.clearTheme = () => { dossState.theme = null; renderThemeActive(); drawDoss(); };
function drawDoss() {
  const g = $("#doss-grid"); if (!g) return;
  const items = B.sources.filter(s =>
    (dossState.imp === "all" || s.importance === dossState.imp) &&
    (dossState.cat === "all" || s.category === dossState.cat) &&
    (!dossState.theme || s.themes.includes(dossState.theme)) &&
    (!dossState.q || (s.title + s.summary_fa + s.themes.join(" ") + s.filename).toLowerCase().includes(dossState.q)));
  g.innerHTML = items.length ? "" : `<p class="muted">موردی یافت نشد.</p>`;
  items.forEach(s => {
    const card = el("div", `doss ${s.importance}`);
    card.onclick = () => openSource(s.id);
    card.innerHTML = `
      <div class="row1"><span class="imp ${s.importance}">${impLabel(s.importance)}</span></div>
      <h3>${esc(s.title)}</h3>
      <div class="fn">${esc(s.id)} · ${esc(s.doc_type || "")}${s.year ? " · " + esc(s.year) : ""}</div>
      <div class="sm">${esc(s.summary_fa)}</div>
      <div class="tset">${s.themes.slice(0, 4).map(t => `<span>${esc(t)}</span>`).join("")}</div>
      <div class="meta"><span>📄 ${s.n_pages || "?"} ص</span><span>💬 ${s.citable_excerpts.length} گزیده</span><span>🎯 ${s.novelty_fa.length} نوآوری</span></div>`;
    g.append(card);
  });
}
function impLabel(i) { return i === "core" ? "هسته‌ای" : i === "peripheral" ? "حاشیه‌ای" : "پشتیبان"; }

// ---------- MODAL: full brain card ----------
function openSource(id) {
  const s = byId[id]; if (!s) return;
  const claims = s.key_claims.map(c => `<div class="claim"><span class="pg">ص ${(c.pages || []).join("، ") || "?"}</span><span>${esc(c.claim_fa)}</span></div>`).join("") || `<p class="muted">—</p>`;
  const exc = s.citable_excerpts.map(e => {
    const q = esc(e.quote); const dirClass = isFa(e.quote) ? "" : "en";
    return `<div class="excerpt"><div class="q ${dirClass}">«${q}»</div>
      <div class="foot"><span>${esc(e.note_fa || "")}</span><a href="${s.url}" target="_blank" rel="noopener">صفحه ${e.page ?? "?"} ↗</a></div></div>`;
  }).join("") || `<p class="muted">—</p>`;
  const maps = s.dissertation_mapping.map(m => `<div class="it map-it"><span class="chapbadge">${esc(m.chapter || "")}</span><div>${esc(m.how_fa || "")}</div></div>`).join("") || `<p class="muted">—</p>`;
  const gaps = s.research_gaps_fa.map(g => `<div class="it gap-it">${esc(g)}</div>`).join("") || `<p class="muted">—</p>`;
  const nov = s.novelty_fa.map(n => `<div class="it nov-it">${esc(n)}</div>`).join("") || `<p class="muted">—</p>`;
  const qh = s.question_hypothesis_links.map(x => `<div class="it">${esc(x)}</div>`).join("") || "";
  const rels = s.relationships.map(r => `<span class="tagchip">${esc(relType(r.type))}: ${esc(r.topic_fa || "")}</span>`).join("") || "";
  const themes = s.themes.map(t => `<span class="tagchip" onclick="switchView('dossiers');closeModal();filterByTheme('${t.replace(/'/g, "")}')">${esc(t)}</span>`).join("");
  const body = `
    <div class="modal-hd">
      <div>
        <h2>${esc(s.title)}</h2>
        <div class="sub">${esc(s.id)} · ${esc(s.doc_type || "")}${s.authors ? " · " + esc(s.authors) : ""}${s.year ? " · " + esc(s.year) : ""} · <span class="imp ${s.importance}">${impLabel(s.importance)}</span> · اعتماد: ${esc(s.confidence || "?")}</div>
      </div>
      <button class="x" onclick="closeModal()">×</button>
    </div>
    <div class="modal-bd">
      <div class="sec"><h4><span class="ic">📄</span>چکیده مفهومی</h4><p>${esc(s.summary_fa)}</p></div>
      <div class="sec"><h4><span class="ic">🎯</span>چرا در پژوهش ما هست</h4><p>${esc(s.why_included_fa)}</p></div>
      <div class="sec"><h4><span class="ic">🔑</span>ادعاها و یافته‌های کلیدی</h4>${claims}</div>
      <div class="sec"><h4><span class="ic">💬</span>گزیده‌های قابل‌استناد (با صفحه)</h4>${exc}</div>
      <div class="sec"><h4><span class="ic">📚</span>نگاشت به فصول رساله</h4><div class="pill-list">${maps}</div></div>
      ${qh ? `<div class="sec"><h4><span class="ic">❓</span>ارتباط با پرسش/فرضیه</h4><div class="pill-list">${qh}</div></div>` : ""}
      <div class="sec"><h4><span class="ic">🕳️</span>شکاف‌های پژوهشی</h4><div class="pill-list">${gaps}</div></div>
      <div class="sec"><h4><span class="ic">✨</span>فرصت‌های نوآوری</h4><div class="pill-list">${nov}</div></div>
      ${rels ? `<div class="sec"><h4><span class="ic">🔗</span>روابط با سایر منابع</h4><div class="chip-row">${rels}</div></div>` : ""}
      <div class="sec"><h4><span class="ic">🏷️</span>محورهای موضوعی</h4><div class="chip-row">${themes}</div></div>
      <div class="sec"><a href="${s.url}" target="_blank" rel="noopener">باز کردن فایل اصلی منبع در GitHub ↗</a></div>
    </div>`;
  showModal(body);
}
function relType(t) { return { supports: "پشتیبانی", contradicts: "تعارض", extends: "بسط", complements: "تکمیل" }[t] || t; }
function showModal(html) { $("#modal").innerHTML = html; $("#modalBg").classList.add("open"); document.body.style.overflow = "hidden"; }
window.closeModal = () => { $("#modalBg").classList.remove("open"); document.body.style.overflow = ""; };
window.openSource = openSource; window.switchView = switchView; window.filterByTheme = filterByTheme;

// ---------- CHAPTERS ----------
function renderChapters() {
  const v = $("#view-chapters");
  let html = `<div class="view-head"><h2>نمای رساله‌محور</h2><p>از ساختار فصل‌های رساله شروع کنید؛ زیر هر فصل، منابعی که به آن بخش خوراک می‌دهند و نحوهٔ استفاده آمده است.</p></div>`;
  B.chapters.forEach((c, i) => {
    html += `<div class="acc ${i < 2 ? "open" : ""}"><div class="acc-hd" onclick="this.parentElement.classList.toggle('open')">
      <span>${esc(c.label)}</span><span class="cnt">${c.count} منبع</span></div>
      <div class="acc-bd"><div class="feed">${c.items.map(it => `
        <div class="fitem"><div class="ft" style="cursor:pointer" onclick="openSource('${it.id}')">${esc(it.title)} <span class="muted">(${it.id})</span></div>
        <div class="fh">${esc(it.how_fa)}</div></div>`).join("")}</div></div></div>`;
  });
  v.innerHTML = html;
}

// ---------- GAPS & NOVELTY ----------
function renderGaps() {
  const v = $("#view-gaps");
  v.innerHTML = `<div class="view-head"><h2>رادار شکاف‌ها و نوآوری</h2><p>تجمیع شکاف‌های پژوهشی شناسایی‌شده و فرصت‌های نوآوری در کل منابع. روی «منبع» کلیک کنید تا پرونده کامل باز شود.</p></div>
    <div class="two-col">
      <div class="col"><h3>🕳️ شکاف‌های پژوهشی <span class="muted">(${B.gaps.length})</span></h3>
        ${B.gaps.map(g => `<div class="gn-item g">${esc(g.text)}<span class="src" onclick="openSource('${g.id}')">${esc(g.title || g.id)} ↗</span></div>`).join("")}</div>
      <div class="col"><h3>✨ فرصت‌های نوآوری <span class="muted">(${B.novelty.length})</span></h3>
        ${B.novelty.map(n => `<div class="gn-item n">${esc(n.text)}<span class="src" onclick="openSource('${n.id}')">${esc(n.title || n.id)} ↗</span></div>`).join("")}</div>
    </div>`;
}

boot();
