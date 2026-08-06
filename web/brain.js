// ============================================================
// PROJECT BRAIN — Research Intelligence Dashboard Engine
// ============================================================

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
const esc = s => (String(s == null ? "" : s)).replace(/[&<>"]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
const isFa = s => /[\u0600-\u06FF]/.test(s || "");
const fmt = n => new Intl.NumberFormat("fa-IR").format(n);

let B = null;   // brain data
let DBM = null; // database-mining data
let RI = null;  // research-intelligence data
let cy = null;  // cytoscape instance
const byId = {};

// ─── Lucide icons helper ───
const icon = name => `<i data-lucide="${name}"></i>`;
function refreshIcons(root) {
  if (window.lucide) lucide.createIcons({ nodes: root ? [root] : undefined });
}

// ─── Theme ───
function initTheme() {
  const saved = localStorage.getItem("gpe-theme") || "dark";
  applyTheme(saved);
  $("#themeBtn").onclick = () => {
    const cur = document.documentElement.getAttribute("data-theme");
    applyTheme(cur === "dark" ? "light" : "dark");
  };
}
function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem("gpe-theme", t);
  // Replace the SVG inside the theme button (Lucide replaces <i> with <svg>)
  const btn = $("#themeBtn");
  if (btn) {
    btn.innerHTML = `<i data-lucide="${t === "dark" ? "moon" : "sun"}"></i>`;
    refreshIcons(btn);
  }
  if (cy) styleGraph();
}

// ─── Boot ───
async function boot() {
  initTheme();
  try {
    B = await (await fetch("./brain.json", { cache: "no-store" })).json();
  } catch (e) {
    $("#loading").innerHTML = `<p style="color:var(--danger)">خطا در بارگذاری brain.json</p>`;
    return;
  }
  B.sources.forEach(s => byId[s.id] = s);
  try { DBM = await (await fetch("./db_mining.json", { cache: "no-store" })).json(); } catch (e) { DBM = null; }
  try { RI = await (await fetch("./research_intel.json", { cache: "no-store" })).json(); } catch (e) { RI = null; }
  $("#loading").remove();
  $("#ftmeta").textContent = `Project Brain — ${fmt(B.stats.sources)} منبع دیجست‌شده · آخرین به‌روزرسانی: ${new Date(B.generated).toLocaleString("fa-IR")}`;

  renderOverview();
  renderDossiers();
  renderChapters();
  renderGaps();
  renderMatrix();
  renderDatabases();
  renderFindings();

  // Use event delegation on the tabs container to handle clicks on icons/spans inside tabs
  $("#tabs").addEventListener("click", e => {
    const tab = e.target.closest(".tab");
    if (tab && tab.dataset.view) switchView(tab.dataset.view);
  });
  const h = location.hash.slice(1);
  if (h && $("#view-" + h)) switchView(h);
  $("#modalBg").onclick = e => { if (e.target.id === "modalBg") closeModal(); };
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

  refreshIcons();
}

function switchView(v) {
  $$("#tabs .tab").forEach(t => t.classList.toggle("active", t.dataset.view === v));
  $$(".view").forEach(s => s.classList.toggle("active", s.id === "view-" + v));
  location.hash = v;
  if (v === "graph") renderGraph();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ─── Animated Counter ───
function animateCounters() {
  $$(".kpi-val[data-target]").forEach(el => {
    const target = +el.dataset.target;
    const duration = 1200;
    const start = performance.now();
    const step = now => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = fmt(Math.round(target * ease));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

// ━━━━━━━━━━ OVERVIEW ━━━━━━━━━━
function renderOverview() {
  const v = $("#view-overview");
  const s = B.stats;
  const partial = s.sources < 198;
  const topThemes = B.themes.slice(0, 18);

  // Importance distribution
  const impCounts = { core: 0, supporting: 0, peripheral: 0 };
  B.sources.forEach(src => impCounts[src.importance] = (impCounts[src.importance] || 0) + 1);

  // Chapter bar data
  const maxCh = Math.max(...B.chapters.map(c => c.count));
  const chColors = ["var(--accent2)", "var(--accent)", "var(--violet)", "var(--accent3)", "var(--rose)", "var(--peri)"];

  v.innerHTML = `
    ${partial ? `<div class="progress-note">${icon("clock")}دیجست در حال تکمیل — ${fmt(s.sources)} از ۱۹۸ منبع پردازش شده</div>` : ""}
    <h1 class="hero-title">Project Brain: نقشه مفهومی منابع رساله</h1>
    <p class="hero-sub">شکل‌گیری پیمان جهانی محیط زیست و تأثیرات آن بر موافقت‌نامه‌های چندجانبه محیط‌زیستی</p>

    <div class="kpi-row">
      <div class="kpi">
        <div class="kpi-icon">${icon("database")}</div>
        <div class="kpi-val" data-target="${s.sources}">0</div>
        <div class="kpi-label">منبع دیجست‌شده</div>
      </div>
      <div class="kpi blue">
        <div class="kpi-icon">${icon("star")}</div>
        <div class="kpi-val" data-target="${s.core}">0</div>
        <div class="kpi-label">منبع هسته‌ای</div>
      </div>
      <div class="kpi amber">
        <div class="kpi-icon">${icon("tags")}</div>
        <div class="kpi-val" data-target="${s.themes}">0</div>
        <div class="kpi-label">محور موضوعی</div>
      </div>
      <div class="kpi rose">
        <div class="kpi-icon">${icon("alert-triangle")}</div>
        <div class="kpi-val" data-target="${s.gaps}">0</div>
        <div class="kpi-label">شکاف پژوهشی</div>
      </div>
      <div class="kpi violet">
        <div class="kpi-icon">${icon("sparkles")}</div>
        <div class="kpi-val" data-target="${s.novelty}">0</div>
        <div class="kpi-label">فرصت نوآوری</div>
      </div>
    </div>

    <div class="frame-row">
      <div class="frame-card q">
        <h4>${icon("help-circle")}پرسش اصلی پژوهش</h4>
        <p>شکل‌گیری «پیمان جهانی محیط زیست» چه تأثیری بر «موافقت‌نامه‌های چندجانبه محیط‌زیستی» (MEAs) خواهد داشت؟</p>
      </div>
      <div class="frame-card h">
        <h4>${icon("lightbulb")}فرضیه اصلی</h4>
        <p>نظر به پراکندگی و خلأهای هنجاری و فقدان سند الزام‌آور حاوی اصول بنیادین، پیمانِ الزام‌آور موجب نظم و توسعه هنجاری اصول و تبدیل حقوق نرم به حقوق سخت می‌شود.</p>
      </div>
    </div>

    <div class="dash-grid">
      <div class="dash-card">
        <h4>${icon("hash")}محورهای موضوعی پرتکرار</h4>
        <div class="chip-row" id="ov-themes"></div>
      </div>
      <div class="dash-card">
        <h4>${icon("pie-chart")}توزیع اهمیت منابع</h4>
        <div class="chart-box"><canvas id="impChart"></canvas></div>
      </div>
    </div>

    <div class="dash-card" style="margin-bottom:28px">
      <h4>${icon("book-open")}پوشش فصول رساله</h4>
      <div class="ch-strip" id="ch-strip">
        ${B.chapters.map((c, i) => `
          <div class="ch-bar">
            <div class="ch-bar-label">${esc(c.label.split("—")[0].trim())}</div>
            <div class="ch-bar-track"><div class="ch-bar-fill" style="width:0%;background:${chColors[i % chColors.length]}" data-w="${Math.round(c.count / maxCh * 100)}%"></div></div>
            <div class="ch-bar-count">${fmt(c.count)} منبع</div>
          </div>`).join("")}
      </div>
    </div>`;

  // Themes chips
  const box = $("#ov-themes");
  topThemes.forEach(t => {
    const c = el("button", "tagchip", `${esc(t.name)}<span class="n">${fmt(t.count)}</span>`);
    c.onclick = () => { switchView("dossiers"); filterByTheme(t.name); };
    box.append(c);
  });

  refreshIcons(v);
  animateCounters();

  // Animate chapter bars
  setTimeout(() => {
    $$(".ch-bar-fill").forEach(bar => { bar.style.width = bar.dataset.w; });
  }, 200);

  // Donut chart
  const ctx = document.getElementById("impChart");
  if (ctx) {
    new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["هسته‌ای", "پشتیبان", "حاشیه‌ای"],
        datasets: [{
          data: [impCounts.core, impCounts.supporting, impCounts.peripheral],
          backgroundColor: ["#00e68a", "#4da6ff", "#8896b0"],
          borderWidth: 0,
          spacing: 3,
          borderRadius: 6,
        }],
      },
      options: {
        cutout: "65%",
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: getComputedStyle(document.documentElement).getPropertyValue("--muted").trim(), font: { family: "Vazirmatn", size: 12 }, padding: 14 }
          }
        }
      }
    });
  }
}

// ━━━━━━━━━━ GRAPH ━━━━━━━━━━
function graphColors() {
  const cs = getComputedStyle(document.documentElement);
  return {
    core: cs.getPropertyValue("--core").trim(),
    supp: cs.getPropertyValue("--supp").trim(),
    peri: cs.getPropertyValue("--peri").trim(),
    theme: cs.getPropertyValue("--accent3").trim(),
    line: cs.getPropertyValue("--line").trim(),
    ink: cs.getPropertyValue("--ink").trim(),
    muted: cs.getPropertyValue("--muted").trim(),
    bg: cs.getPropertyValue("--panel").trim(),
  };
}
function styleGraph() {
  if (!cy) return;
  const c = graphColors();
  cy.style([
    { selector: "node[kind='source']", style: {
        "background-color": e => e.data("importance") === "core" ? c.core : e.data("importance") === "peripheral" ? c.peri : c.supp,
        width: e => e.data("importance") === "core" ? 24 : 16,
        height: e => e.data("importance") === "core" ? 24 : 16,
        label: "data(label)", "font-size": 7, color: c.muted,
        "text-valign": "center", "text-halign": "center", "text-margin-y": -14,
        "border-width": 0,
        "shadow-blur": e => e.data("importance") === "core" ? 12 : 0,
        "shadow-color": c.core, "shadow-opacity": 0.3
    }},
    { selector: "node[kind='theme']", style: {
        "background-color": c.theme, shape: "round-rectangle",
        label: "data(label)",
        width: e => 36 + Math.min(65, e.data("weight") * 5),
        height: 24, "font-size": 9, color: c.ink,
        "text-valign": "center", "text-halign": "center",
        "text-wrap": "wrap", "text-max-width": "90", padding: 5,
        "border-width": 0
    }},
    { selector: "edge", style: { width: 1.2, "line-color": c.line, opacity: 0.35, "curve-style": "haystack" }},
    { selector: ".faded", style: { opacity: 0.06 }},
    { selector: ".hl", style: { opacity: 1, "line-color": c.theme, width: 2.5 }},
  ]);
}
function renderGraph() {
  const v = $("#view-graph");
  if (v.dataset.built) return;
  v.dataset.built = "1";
  v.innerHTML = `
    <div class="view-head">
      <h2>${icon("share-2")}نقشه دانش</h2>
      <p>گره‌های دایره‌ای = منابع · مستطیل‌های کهربایی = محورهای موضوعی · خطوط = ارتباط منبع–محور</p>
    </div>
    <div class="graph-controls">
      <button class="facet active" data-imp="all">همه</button>
      <button class="facet" data-imp="core">فقط هسته‌ای</button>
      <button class="icon-btn" id="fitBtn" title="بازنشانی نما">${icon("maximize-2")}</button>
    </div>
    <div id="cy"></div>
    <div class="graph-legend">
      <span><i class="dot" style="background:var(--core);color:var(--core)"></i>هسته‌ای</span>
      <span><i class="dot" style="background:var(--supp);color:var(--supp)"></i>پشتیبان</span>
      <span><i class="dot" style="background:var(--peri);color:var(--peri)"></i>حاشیه‌ای</span>
      <span><i class="dot" style="background:var(--accent3);color:var(--accent3)"></i>محور موضوعی</span>
    </div>`;
  refreshIcons(v);

  cy = cytoscape({
    container: $("#cy"),
    elements: [...B.graph.nodes, ...B.graph.edges],
    layout: { name: "cose", animate: false, nodeRepulsion: 10000, idealEdgeLength: 75, padding: 35 },
    minZoom: 0.15, maxZoom: 3.5,
  });
  styleGraph();

  cy.on("tap", "node", evt => {
    const n = evt.target;
    cy.elements().addClass("faded");
    n.removeClass("faded");
    n.neighborhood().removeClass("faded").addClass("hl");
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
    cy.layout({ name: "cose", animate: false, nodeRepulsion: 10000, idealEdgeLength: 75 }).run();
  });
}

function showThemeSources(theme) {
  const ids = (B.themes.find(t => t.name === theme) || {}).source_ids || [];
  const body = `
    <div class="modal-hd">
      <div><h2>${icon("tag")} ${esc(theme)}</h2><div class="sub">${fmt(ids.length)} منبع به این محور می‌پردازند</div></div>
      <button class="x" onclick="closeModal()">×</button>
    </div>
    <div class="modal-bd"><div class="pill-list">${ids.map(id => {
      const s = byId[id]; if (!s) return "";
      return `<div class="it" style="cursor:pointer" onclick="openSource('${id}')">
        <b>${esc(s.title)}</b>
        <div class="muted" style="font-size:.76rem">${id} · ${esc(s.doc_type)} · <span class="imp ${s.importance}" style="font-size:.62rem">${impLabel(s.importance)}</span></div>
      </div>`;
    }).join("")}</div></div>`;
  showModal(body);
}

// ━━━━━━━━━━ MATRIX ━━━━━━━━━━
function renderMatrix() {
  const v = $("#view-matrix");
  const { cols, rows } = B.matrix;
  let html = `
    <div class="view-head">
      <h2>${icon("grid-3x3")}ماتریس ارتباط منبع × محور</h2>
      <p>هر خانه پررنگ = آن منبع به آن محور موضوعی می‌پردازد · روی نام منبع یا خانه کلیک کنید</p>
    </div>
    <div class="matrix-scroll"><table class="matrix"><thead><tr><th style="writing-mode:horizontal-tb;transform:none">منبع \\ محور</th>`;
  cols.forEach(c => html += `<th>${esc(c)}</th>`);
  html += `</tr></thead><tbody>`;
  rows.forEach(r => {
    const imp = byId[r.id] ? byId[r.id].importance : "";
    const impCls = imp === "core" ? "" : imp === "supporting" ? " i2" : " i3";
    html += `<tr><th title="${esc(r.title)}" onclick="openSource('${r.id}')">${esc(r.title.slice(0, 45))}</th>`;
    r.cells.forEach((c, i) => {
      html += `<td class="cell${c ? " on" + impCls : ""}" ${c ? `onclick="openSource('${r.id}')" title="${esc(r.title)} — ${esc(cols[i])}"` : ""}></td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table></div>`;
  v.innerHTML = html;
  refreshIcons(v);
}

// ━━━━━━━━━━ DOSSIERS ━━━━━━━━━━
let dossState = { q: "", cat: "all", imp: "all", theme: null };

function renderDossiers() {
  const v = $("#view-dossiers");
  const cats = [...new Set(B.sources.map(s => s.category))].sort();
  v.innerHTML = `
    <div class="view-head">
      <h2>${icon("library")}پرونده منابع</h2>
      <p>هر کارت یک «کارت مغزی» کامل: ادعاها، گزیده‌ها، نگاشت فصول، شکاف‌ها و نوآوری — کلیک کنید.</p>
    </div>
    <div class="controls">
      <div class="search-wrap">${icon("search")}<input type="search" id="dsearch" placeholder="جستجو در عنوان، چکیده، محورها…" /></div>
      <div class="facets" id="imp-facets">
        <button class="facet active" data-imp="all">همه اهمیت‌ها</button>
        <button class="facet" data-imp="core">${icon("star")} هسته‌ای</button>
        <button class="facet" data-imp="supporting">${icon("shield")} پشتیبان</button>
        <button class="facet" data-imp="peripheral">${icon("circle")} حاشیه‌ای</button>
      </div>
      <div class="facets" id="cat-facets">
        <button class="facet active" data-cat="all">همه دسته‌ها</button>
        ${cats.map(c => `<button class="facet" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}
      </div>
      <div class="facets" id="theme-active"></div>
    </div>
    <div class="doss-count" id="dossCount"></div>
    <div class="grid" id="doss-grid"></div>`;

  $("#dsearch").oninput = e => { dossState.q = e.target.value.trim().toLowerCase(); drawDoss(); };
  $$("#imp-facets .facet").forEach(b => b.onclick = () => { setFacet("#imp-facets", b); dossState.imp = b.dataset.imp; drawDoss(); });
  $$("#cat-facets .facet").forEach(b => b.onclick = () => { setFacet("#cat-facets", b); dossState.cat = b.dataset.cat; drawDoss(); });
  drawDoss();
  refreshIcons(v);
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
    (!dossState.q || (s.title + s.summary_fa + s.themes.join(" ") + s.filename + s.id).toLowerCase().includes(dossState.q)));

  const cnt = $("#dossCount");
  if (cnt) cnt.textContent = `${fmt(items.length)} منبع نمایش داده می‌شود`;

  g.innerHTML = items.length ? "" : `<p class="muted" style="grid-column:1/-1;text-align:center;padding:40px">موردی یافت نشد.</p>`;
  items.forEach(s => {
    const card = el("div", `doss ${s.importance}`);
    card.onclick = () => openSource(s.id);
    card.innerHTML = `
      <div class="row1"><span class="imp ${s.importance}">${impLabel(s.importance)}</span></div>
      <h3>${esc(s.title)}</h3>
      <div class="fn">${esc(s.id)} · ${esc(s.doc_type || "")}${s.year ? " · " + esc(s.year) : ""}${s.authors ? " · " + esc(s.authors) : ""}</div>
      <div class="sm">${esc(s.summary_fa)}</div>
      <div class="tset">${s.themes.slice(0, 5).map(t => `<span>${esc(t)}</span>`).join("")}${s.themes.length > 5 ? `<span>+${s.themes.length - 5}</span>` : ""}</div>
      <div class="meta">
        <span>${icon("file-text")} ${s.n_pages || "?"} ص</span>
        <span>${icon("quote")} ${s.citable_excerpts.length} گزیده</span>
        <span>${icon("sparkles")} ${s.novelty_fa.length} نوآوری</span>
        <span>${icon("alert-triangle")} ${s.research_gaps_fa.length} شکاف</span>
      </div>`;
    g.append(card);
  });
  refreshIcons(g);
}

function impLabel(i) {
  return i === "core" ? "هسته‌ای" : i === "peripheral" ? "حاشیه‌ای" : "پشتیبان";
}

// ━━━━━━━━━━ MODAL — Full Brain Card ━━━━━━━━━━
function openSource(id) {
  const s = byId[id]; if (!s) return;

  const claims = s.key_claims.map(c => `
    <div class="claim">
      <span class="pg">ص ${(c.pages || []).join("، ") || "?"}</span>
      <span>${esc(c.claim_fa)}</span>
    </div>`).join("") || `<p class="muted">—</p>`;

  const exc = s.citable_excerpts.map(e => {
    const q = esc(e.quote);
    const dirClass = isFa(e.quote) ? "" : "en";
    return `<div class="excerpt">
      <div class="q ${dirClass}">«${q}»</div>
      <div class="foot">
        <span>${esc(e.note_fa || "")}</span>
        <a href="${s.url}" target="_blank" rel="noopener">صفحه ${e.page ?? "?"} ↗</a>
      </div>
    </div>`;
  }).join("") || `<p class="muted">—</p>`;

  const maps = s.dissertation_mapping.map(m => `
    <div class="it map-it">
      <span class="chapbadge">${esc(m.chapter || "")}</span>
      <div>${esc(m.how_fa || "")}</div>
    </div>`).join("") || `<p class="muted">—</p>`;

  const gaps = s.research_gaps_fa.map(g => `<div class="it gap-it">${esc(g)}</div>`).join("") || `<p class="muted">—</p>`;
  const nov = s.novelty_fa.map(n => `<div class="it nov-it">${esc(n)}</div>`).join("") || `<p class="muted">—</p>`;
  const qh = s.question_hypothesis_links.map(x => `<div class="it">${esc(x)}</div>`).join("") || "";
  const rels = s.relationships.map(r => `<span class="tagchip">${esc(relType(r.type))}: ${esc(r.topic_fa || "")}</span>`).join("") || "";
  const themes = s.themes.map(t => `<span class="tagchip" onclick="switchView('dossiers');closeModal();filterByTheme('${t.replace(/'/g, "")}')">${esc(t)}</span>`).join("");

  const body = `
    <div class="modal-hd">
      <div>
        <h2>${esc(s.title)}</h2>
        <div class="sub">
          <span>${esc(s.id)}</span>
          <span>·</span>
          <span>${esc(s.doc_type || "")}</span>
          ${s.authors ? `<span>·</span><span>${esc(s.authors)}</span>` : ""}
          ${s.year ? `<span>·</span><span>${esc(s.year)}</span>` : ""}
          <span>·</span>
          <span class="imp ${s.importance}">${impLabel(s.importance)}</span>
          <span>·</span>
          <span>اعتماد: ${esc(s.confidence || "?")}</span>
        </div>
      </div>
      <button class="x" onclick="closeModal()">×</button>
    </div>
    <div class="modal-bd">
      <div class="sec"><h4>${icon("file-text")}چکیده مفهومی</h4><p style="line-height:1.85">${esc(s.summary_fa)}</p></div>
      <div class="sec"><h4>${icon("target")}چرا در پژوهش ما هست</h4><p style="line-height:1.85">${esc(s.why_included_fa)}</p></div>
      <div class="sec"><h4>${icon("key")}ادعاها و یافته‌های کلیدی</h4>${claims}</div>
      <div class="sec"><h4>${icon("quote")}گزیده‌های قابل‌استناد (با صفحه)</h4>${exc}</div>
      <div class="sec"><h4>${icon("book-open")}نگاشت به فصول رساله</h4><div class="pill-list">${maps}</div></div>
      ${qh ? `<div class="sec"><h4>${icon("help-circle")}ارتباط با پرسش/فرضیه</h4><div class="pill-list">${qh}</div></div>` : ""}
      <div class="sec"><h4>${icon("alert-triangle")}شکاف‌های پژوهشی</h4><div class="pill-list">${gaps}</div></div>
      <div class="sec"><h4>${icon("sparkles")}فرصت‌های نوآوری</h4><div class="pill-list">${nov}</div></div>
      ${rels ? `<div class="sec"><h4>${icon("link")}روابط با سایر منابع</h4><div class="chip-row">${rels}</div></div>` : ""}
      <div class="sec"><h4>${icon("tags")}محورهای موضوعی</h4><div class="chip-row">${themes}</div></div>
      <div class="sec" style="padding-top:8px"><a href="${s.url}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px">${icon("external-link")}باز کردن فایل اصلی منبع در GitHub</a></div>
    </div>`;
  showModal(body);
}

function relType(t) { return { supports: "پشتیبانی", contradicts: "تعارض", extends: "بسط", complements: "تکمیل" }[t] || t; }

function showModal(html) {
  $("#modal").innerHTML = html;
  $("#modalBg").classList.add("open");
  document.body.style.overflow = "hidden";
  refreshIcons($("#modal"));
}
window.closeModal = () => { $("#modalBg").classList.remove("open"); document.body.style.overflow = ""; };
window.openSource = openSource;
window.switchView = switchView;
window.filterByTheme = filterByTheme;

// ━━━━━━━━━━ CHAPTERS ━━━━━━━━━━
function renderChapters() {
  const v = $("#view-chapters");
  let html = `
    <div class="view-head">
      <h2>${icon("book-open")}نمای رساله‌محور</h2>
      <p>ساختار فصل‌های رساله — زیر هر فصل، منابع و نحوهٔ خوراک‌دهی</p>
    </div>
    <div class="chapters-timeline">`;

  B.chapters.forEach((c, i) => {
    html += `
      <div class="acc ${i < 2 ? "open" : ""}">
        <div class="acc-hd" onclick="this.parentElement.classList.toggle('open')">
          <span>${esc(c.label)}</span>
          <span class="cnt">${fmt(c.count)} منبع</span>
        </div>
        <div class="acc-bd">
          <div class="feed">
            ${c.items.map(it => `
              <div class="fitem" onclick="openSource('${it.id}')">
                <div class="ft">${esc(it.title)} <span class="muted">(${it.id})</span></div>
                <div class="fh">${esc(it.how_fa)}</div>
              </div>`).join("")}
          </div>
        </div>
      </div>`;
  });
  html += `</div>`;
  v.innerHTML = html;
  refreshIcons(v);
}

// ━━━━━━━━━━ GAPS & NOVELTY ━━━━━━━━━━
function renderGaps() {
  const v = $("#view-gaps");
  const LIMIT = 80; // initial render limit for performance
  let gapQ = "", novQ = "";

  v.innerHTML = `
    <div class="view-head">
      <h2>${icon("scan-search")}رادار شکاف‌ها و نوآوری</h2>
      <p>تجمیع شکاف‌های پژوهشی شناسایی‌شده و فرصت‌های نوآوری از کل ${fmt(B.stats.sources)} منبع</p>
    </div>
    <div class="two-col">
      <div class="col">
        <h3>${icon("alert-triangle")}شکاف‌های پژوهشی <span class="badge" style="background:var(--danger)">${fmt(B.gaps.length)}</span></h3>
        <input class="gap-search" id="gapSearch" placeholder="فیلتر شکاف‌ها…" />
        <div id="gapList"></div>
      </div>
      <div class="col">
        <h3>${icon("sparkles")}فرصت‌های نوآوری <span class="badge" style="background:var(--accent)">${fmt(B.novelty.length)}</span></h3>
        <input class="gap-search" id="novSearch" placeholder="فیلتر نوآوری‌ها…" />
        <div id="novList"></div>
      </div>
    </div>`;

  function renderGapList() {
    const filtered = gapQ ? B.gaps.filter(g => (g.text + g.title + g.id).toLowerCase().includes(gapQ)) : B.gaps;
    const show = filtered.slice(0, LIMIT);
    $("#gapList").innerHTML = show.map(g =>
      `<div class="gn-item g">${esc(g.text)}<span class="src" onclick="openSource('${g.id}')">${esc(g.title || g.id)} ↗</span></div>`
    ).join("") + (filtered.length > LIMIT ? `<p class="muted" style="text-align:center;padding:12px">… و ${fmt(filtered.length - LIMIT)} مورد دیگر</p>` : "");
  }
  function renderNovList() {
    const filtered = novQ ? B.novelty.filter(n => (n.text + n.title + n.id).toLowerCase().includes(novQ)) : B.novelty;
    const show = filtered.slice(0, LIMIT);
    $("#novList").innerHTML = show.map(n =>
      `<div class="gn-item n">${esc(n.text)}<span class="src" onclick="openSource('${n.id}')">${esc(n.title || n.id)} ↗</span></div>`
    ).join("") + (filtered.length > LIMIT ? `<p class="muted" style="text-align:center;padding:12px">… و ${fmt(filtered.length - LIMIT)} مورد دیگر</p>` : "");
  }

  renderGapList();
  renderNovList();

  $("#gapSearch").oninput = e => { gapQ = e.target.value.trim().toLowerCase(); renderGapList(); };
  $("#novSearch").oninput = e => { novQ = e.target.value.trim().toLowerCase(); renderNovList(); };

  refreshIcons(v);
}

// ─── Launch ───
boot();

// ━━━━━━━━━━ CITATION DATABASES ━━━━━━━━━━
const DBCOLORS = { "Scopus": "var(--accent2)", "HeinOnline": "var(--violet)", "Westlaw": "var(--accent3)" };
function renderDatabases() {
  const v = $("#view-databases");
  if (!DBM) { v.innerHTML = `<div class="view-head"><h2>پایگاه‌های استنادی</h2><p class="muted">داده در دسترس نیست.</p></div>`; return; }
  const m = DBM.meta, pr = DBM.prisma;
  const counts = {};
  DBM.articles.forEach(a => counts[a.db] = (counts[a.db] || 0) + 1);

  let html = `
    <div class="view-head">
      <h2>${icon("database")}${esc(m.title_fa)}</h2>
      <p>${esc(m.subtitle_fa)}</p>
    </div>
    <div class="db-note">${icon("info")}<div>${esc(m.note_fa)}</div></div>

    <div class="db-metrics">
      <div class="db-metric"><b>${fmt(pr.identified)}</b><span>شناسایی‌شده</span></div>
      <div class="db-metric"><b>${fmt(pr.after_dedup)}</b><span>پس از حذف تکراری</span></div>
      <div class="db-metric"><b>${fmt(pr.eligible)}</b><span>واجد شرایط</span></div>
      <div class="db-metric hi"><b>${fmt(pr.included)}</b><span>واردشده</span></div>
    </div>
    <p class="muted" style="margin:-4px 0 20px">${esc(pr.note_fa)}</p>

    <div class="card db-method">
      <h3>${icon("microscope")}روش‌شناسی و بازهٔ زمانی</h3>
      <p>${esc(m.methodology_fa)}</p>
      <p><b>بازهٔ زمانی:</b> ${esc(m.date_range_fa)}</p>
    </div>

    <h3 class="sec-title">${icon("filter")}پروتکل جست‌وجو به تفکیک پایگاه</h3>
    <div class="proto-grid">`;

  DBM.protocols.forEach(p => {
    html += `
      <div class="proto-card" style="--dbc:${DBCOLORS[p.db] || 'var(--accent)'}">
        <div class="proto-head"><span class="db-chip" style="background:${DBCOLORS[p.db] || 'var(--accent)'}">${esc(p.db)}</span><b>${esc(p.db_fa)}</b></div>
        <p class="proto-scope">${esc(p.scope_fa)}</p>
        <div class="proto-field">${icon("search")}<span>${esc(p.search_field_fa)}</span></div>
        <div class="proto-q">
          ${p.queries.map(q => `<code>${esc(q)}</code>`).join("")}
        </div>
        <div class="proto-filters">
          <b>${icon("sliders-horizontal")}فیلترها و محدودیت‌ها</b>
          <ul>${p.filters_fa.map(f => `<li>${esc(f)}</li>`).join("")}</ul>
        </div>
      </div>`;
  });
  html += `</div>`;

  // Article corpus with filter
  html += `
    <h3 class="sec-title">${icon("book-marked")}منابع شناسایی‌شده <span class="badge" style="background:var(--accent)">${fmt(DBM.articles.length)}</span></h3>
    <div class="db-filterbar" id="dbFilterBar">
      <button class="db-fbtn active" data-db="all">همه (${fmt(DBM.articles.length)})</button>
      ${Object.keys(counts).map(k => `<button class="db-fbtn" data-db="${k}"><span class="dot" style="background:${DBCOLORS[k]}"></span>${esc(k)} (${fmt(counts[k])})</button>`).join("")}
    </div>
    <div class="art-list" id="artList"></div>`;

  v.innerHTML = html;

  function drawArts(db) {
    const arts = (db === "all" ? DBM.articles : DBM.articles.filter(a => a.db === db))
      .slice().sort((a, b) => b.relevance - a.relevance);
    $("#artList").innerHTML = arts.map(a => `
      <div class="art-card" style="--dbc:${DBCOLORS[a.db] || 'var(--accent)'}">
        <div class="art-top">
          <span class="db-chip sm" style="background:${DBCOLORS[a.db] || 'var(--accent)'}">${esc(a.db)}</span>
          <span class="rel-badge" title="امتیاز ارتباط">${icon("target")}${a.relevance}٪</span>
        </div>
        <h4 class="art-title">${esc(a.title)}</h4>
        <p class="art-meta">${esc(a.authors)} · <span>${a.year}</span></p>
        <p class="art-venue">${esc(a.venue)}</p>
        ${a.doi ? `<a class="art-doi" href="https://doi.org/${esc(a.doi)}" target="_blank" rel="noopener">${icon("link")}DOI: ${esc(a.doi)}</a>` : (a.url ? `<a class="art-doi" href="${esc(a.url)}" target="_blank" rel="noopener">${icon("external-link")}مشاهدهٔ منبع</a>` : "")}
        <div class="art-finding"><b>یافتهٔ کلیدی:</b> ${esc(a.finding_fa)}</div>
        <div class="art-sw">
          <div class="sw s"><b>${icon("plus-circle")}قوت</b>${esc(a.strength_fa)}</div>
          <div class="sw w"><b>${icon("minus-circle")}ضعف</b>${esc(a.weakness_fa)}</div>
        </div>
        <div class="art-tags">
          ${(a.chapters || []).map(c => `<span class="tag ch">${esc(c)}</span>`).join("")}
          ${(a.questions || []).map(q => `<span class="tag q">پرسش ${esc(q)}</span>`).join("")}
        </div>
        <div class="art-note">${icon("quote")}${esc(a.citation_note_fa)}</div>
      </div>`).join("");
    refreshIcons($("#artList"));
  }
  drawArts("all");

  $("#dbFilterBar").addEventListener("click", e => {
    const b = e.target.closest(".db-fbtn");
    if (!b) return;
    $$("#dbFilterBar .db-fbtn").forEach(x => x.classList.toggle("active", x === b));
    drawArts(b.dataset.db);
  });

  refreshIcons(v);
}

// ━━━━━━━━━━ FINDINGS & RESEARCH TRAJECTORY ━━━━━━━━━━
function renderFindings() {
  const v = $("#view-findings");
  if (!RI) { v.innerHTML = `<div class="view-head"><h2>نتایج و مسیر پژوهش</h2><p class="muted">داده در دسترس نیست.</p></div>`; return; }
  const m = RI.meta;

  let html = `
    <div class="view-head">
      <h2>${icon("compass")}${esc(m.title_fa)}</h2>
      <p>${esc(m.subtitle_fa)}</p>
    </div>
    <div class="db-note">${icon("brain")}<div>${esc(m.note_fa)}</div></div>

    <div class="thesis-banner">
      <div class="thesis-banner-txt">
        ${icon("file-text")}
        <div>
          <b>پیش‌نویس رساله در حال نگارش است</b>
          <span>فصل اول (چارچوب پژوهش) به‌طور کامل و آغاز فصل دوم — منطبق بر آیین‌نامهٔ نگارش ۱۴۰۰، با استناد پانویسی به منابع پایگاه‌های استنادی.</span>
        </div>
      </div>
      <div class="thesis-banner-btns">
        <a class="tbtn tbtn-primary" href="thesis_draft.docx" download>${icon("download")}دریافت Word</a>
        <a class="tbtn" href="thesis_draft.pdf" target="_blank">${icon("eye")}مشاهدهٔ PDF</a>
      </div>
    </div>

    <h3 class="sec-title">${icon("lightbulb")}یافته‌های محتمل پژوهش <span class="badge" style="background:var(--accent)">${fmt(RI.findings.length)}</span></h3>
    <div class="find-grid">`;

  RI.findings.forEach((f, i) => {
    html += `
      <div class="find-card">
        <div class="find-head">
          <span class="find-num">${i + 1}</span>
          <h4>${esc(f.title_fa)}</h4>
        </div>
        <p class="find-thesis">${esc(f.thesis_fa)}</p>
        <div class="find-conf">
          <span>اطمینان استدلالی</span>
          <div class="conf-bar"><div class="conf-fill" style="width:${f.confidence}%"></div></div>
          <b>${f.confidence}٪</b>
        </div>
        <div class="find-ev"><b>${icon("list-checks")}شواهد:</b>
          <ul>${f.evidence_fa.map(e => `<li>${esc(e)}</li>`).join("")}</ul>
        </div>
        <div class="find-foot">
          <span class="find-map">${icon("git-branch")}${esc(f.maps_to_fa)}</span>
          <div class="find-src">${(f.sources || []).map(s => `<span class="tag">${esc(s)}</span>`).join("")}</div>
        </div>
      </div>`;
  });
  html += `</div>`;

  // Q/H evaluation
  const qh = RI.qh_evaluation;
  html += `
    <h3 class="sec-title">${icon("clipboard-check")}ارزیابی و ارتقای پرسش‌ها و فرضیه‌ها</h3>
    <p class="muted" style="margin-top:-6px">${esc(qh.intro_fa)}</p>
    <div class="qh-list">`;
  qh.items.forEach(it => {
    html += `
      <div class="qh-card">
        <div class="qh-top"><span class="qh-type">${esc(it.type_fa)}</span><span class="qh-prio p-${it.priority === 'بالا' ? 'hi' : 'mid'}">${esc(it.priority)}</span></div>
        ${it.current_fa && it.current_fa !== "—" ? `<div class="qh-row"><b>متن فعلی:</b> ${esc(it.current_fa)}</div>` : ""}
        <div class="qh-row asm"><b>${icon("search-check")}ارزیابی:</b> ${esc(it.assessment_fa)}</div>
        <div class="qh-row sug"><b>${icon("arrow-up-circle")}پیشنهاد ارتقا:</b> ${esc(it.suggestion_fa)}</div>
      </div>`;
  });
  html += `</div>`;

  // Scenario improvement
  const sc = RI.scenario_improvement;
  html += `
    <h3 class="sec-title">${icon("layout-list")}تحلیل و ارتقای سناریوی رساله</h3>
    <p class="muted" style="margin-top:-6px">${esc(sc.intro_fa)}</p>
    <div class="two-col">
      <div class="col">
        <h3>${icon("check-circle")}نقاط قوت</h3>
        ${sc.strengths_fa.map(s => `<div class="gn-item n">${esc(s)}</div>`).join("")}
      </div>
      <div class="col">
        <h3>${icon("alert-triangle")}خلأهای پوششی و رفع آن‌ها</h3>
        ${sc.gaps_fa.map(g => `<div class="gn-item g">${esc(g)}</div>`).join("")}
      </div>
    </div>
    <div class="card" style="margin-top:14px"><h3>${icon("scale")}کفایت پرداخت به پیمان جهانی</h3><p>${esc(sc.gpe_depth_fa)}</p></div>`;

  // Proposed TOC
  const toc = RI.toc_proposed;
  html += `
    <h3 class="sec-title">${icon("list-tree")}فهرست مطالب پیشنهادی</h3>
    <p class="muted" style="margin-top:-6px">${esc(toc.intro_fa)}</p>
    <div class="toc-wrap">`;
  toc.chapters.forEach(c => {
    html += `
      <div class="toc-ch">
        <div class="toc-ch-head"><b>${esc(c.num)}</b><span>${esc(c.title_fa)}</span>${c.cap_fa ? `<em class="toc-cap">${esc(c.cap_fa)}</em>` : ""}</div>
        <ul>${c.sections_fa.map(s => `<li>${esc(s)}</li>`).join("")}</ul>
      </div>`;
  });
  html += `</div>`;

  // Article blueprint
  const bp = RI.article_blueprint;
  html += `
    <h3 class="sec-title">${icon("route")}نقشهٔ نگارش رساله (جریان استدلال)</h3>
    <p class="muted" style="margin-top:-6px">${esc(bp.intro_fa)}</p>
    <div class="flow">
      ${bp.argument_flow_fa.map((s, i) => `<div class="flow-step"><span class="flow-n">${i + 1}</span><p>${esc(s)}</p></div>`).join("")}
    </div>
    <div class="card contrib">${icon("award")}<div><b>مشارکت اصیل رساله:</b> ${esc(bp.expected_contribution_fa)}</div></div>
    <div class="card"><h3>${icon("pen-tool")}نکات نگارشی</h3><ul class="tick">${bp.writing_notes_fa.map(n => `<li>${esc(n)}</li>`).join("")}</ul></div>`;

  v.innerHTML = html;
  refreshIcons(v);
}
