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
let TH = null;  // thesis (living menu) data
let SD = null;  // source-digest data (هضم منابع)
let cy = null;      // cytoscape instance
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
  try { TH = await (await fetch("./thesis.json", { cache: "no-store" })).json(); } catch (e) { TH = null; }
  try { SD = await (await fetch("./source_digest.json", { cache: "no-store" })).json(); } catch (e) { SD = null; }
  $("#loading").remove();
  $("#ftmeta").textContent = `Project Brain — ${fmt(B.stats.sources)} منبع دیجست‌شده · آخرین به‌روزرسانی: ${new Date(B.generated).toLocaleString("fa-IR")}`;

  renderOverview();
  renderDossiers();
  renderChapters();
  renderGaps();
  renderMatrix();
  renderDatabases();
  renderDigest();
  renderFindings();
  renderThesis();
  renderReview();
  renderCompile();
  renderProof();

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
  $$(".view").forEach(s => {
    const on = s.id === "view-" + v;
    s.classList.toggle("active", on);
    if (on) {
      // retrigger the enter animation
      s.classList.remove("view-enter");
      void s.offsetWidth;
      s.classList.add("view-enter");
    }
  });
  location.hash = v;
  if (v === "graph") renderGraph();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// programmatic nav used by hub cards
function goView(v) { switchView(v); }

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

    <div class="hub" id="ov-hub">
      ${[
        {v:"compile", ic:"book-marked", t:"تدوین پایان‌نامه", d:"مشاهدهٔ کاملِ رساله + دریافتِ Word و PDF در قالب ۱۴۰۰", hot:true},
        {v:"thesis",  ic:"file-pen-line", t:"نگارش رساله", d:"متنِ زندهٔ فصل‌ها با پانویس و انطباق ۱۴۰۰"},
        {v:"findings",ic:"compass", t:"نتایج و مسیر پژوهش", d:"یافته‌های کلیدی، نقشهٔ استدلال و پاسخِ پرسش‌ها"},
        {v:"review",  ic:"clipboard-check", t:"نقد و سناریو", d:"نقدِ بندبندِ پیش‌نویس‌ها و بازآراییِ ساختار"},
        {v:"databases",ic:"database", t:"پایگاه‌های استنادی", d:"۳۸ منبعِ شناسایی‌شده در Westlaw · HeinOnline · Scopus"},
        {v:"proof",   ic:"badge-check", t:"سندِ فرایند", d:"روشِ ساخت، تضمینِ اصالت و زنجیرهٔ استناد"}
      ].map((c,i)=>`
        <button class="hub-card ${c.hot?'hot':''}" style="--d:${i*70}ms" onclick="goView('${c.v}')">
          <span class="hub-ic">${icon(c.ic)}</span>
          <span class="hub-t">${esc(c.t)}</span>
          <span class="hub-d">${esc(c.d)}</span>
          <span class="hub-go">${icon("arrow-left")}</span>
        </button>`).join("")}
    </div>

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
// ── Knowledge graph: Cytoscape.js (clean solid nodes, clickable, detail panel) ──
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
  const isDark = document.documentElement.getAttribute("data-theme") !== "light";
  const halo = isDark ? "#0a1226" : "#ffffff";           // label halo for legibility
  cy.style([
    // ---- source nodes: clean solid discs ----
    { selector: "node[kind='source']", style: {
        "background-color": e => e.data("importance") === "core" ? c.core : e.data("importance") === "peripheral" ? c.peri : c.supp,
        "background-opacity": 1,
        width: e => e.data("importance") === "core" ? 26 : e.data("importance") === "peripheral" ? 13 : 18,
        height: e => e.data("importance") === "core" ? 26 : e.data("importance") === "peripheral" ? 13 : 18,
        "border-width": 1.5, "border-color": halo, "border-opacity": 0.9,
        color: c.ink, "font-size": 9, "font-weight": 600,
        "text-valign": "top", "text-halign": "center", "text-margin-y": -3,
        "text-outline-width": 2.5, "text-outline-color": halo, "text-outline-opacity": 1,
        // only label the important (core) sources by default → readable, uncluttered
        label: e => e.data("importance") === "core" ? (e.data("label") || "") : ""
    }},
    // ---- theme nodes: solid accent pills, always labelled ----
    { selector: "node[kind='theme']", style: {
        "background-color": c.theme, "background-opacity": 1, shape: "round-rectangle",
        label: "data(label)",
        width: e => 44 + Math.min(80, (e.data("weight") || 1) * 5),
        height: 26, "font-size": 10.5, "font-weight": 700, color: "#0a1226",
        "text-valign": "center", "text-halign": "center",
        "text-wrap": "wrap", "text-max-width": "110", padding: 6,
        "border-width": 0
    }},
    { selector: "edge", style: { width: 1, "line-color": c.line, opacity: 0.28, "curve-style": "haystack" }},
    // dim everything not in the selected neighbourhood
    { selector: ".faded", style: { opacity: 0.05, "text-opacity": 0 }},
    // highlighted neighbourhood: reveal labels of every connected source too
    { selector: ".hl", style: { opacity: 1 }},
    { selector: "node.hl[kind='source']", style: {
        label: "data(label)", "font-size": 10, "z-index": 20,
        "border-width": 2.5, "border-color": c.theme
    }},
    { selector: "edge.hl", style: { "line-color": c.theme, width: 2.5, opacity: 0.95 }},
  ]);
}

// Distinct hues for theme clusters → colourful, readable spheres (like the sample).
const THEME_PALETTE = [
  "#00e68a", "#4da6ff", "#f0b040", "#ff6b9d", "#a78bfa", "#5ad1c8",
  "#ffb703", "#ef6f6c", "#7cc4ff", "#c3f584", "#ff9f45", "#b892ff",
  "#4dd0a0", "#ffd166", "#f78fb3", "#6ee7ff", "#c0eb75", "#ffa07a",
  "#9be7c4", "#e0aaff", "#8ecae6", "#ff8fab"
];
let graph3d = null;

function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch (e) { return false; }
}

// Transform Cytoscape-style B.graph into {nodes, links} with colours + sizes.
function buildGraphData() {
  const nodes = B.graph.nodes.map(n => Object.assign({}, n.data));
  const links = B.graph.edges.map(e => ({ source: e.data.source, target: e.data.target }));
  const deg = {};
  links.forEach(l => { deg[l.source] = (deg[l.source] || 0) + 1; deg[l.target] = (deg[l.target] || 0) + 1; });
  // assign each theme a distinct colour
  const themeColor = {};
  let ti = 0;
  nodes.forEach(n => { if (n.kind === "theme") themeColor[n.id] = THEME_PALETTE[ti++ % THEME_PALETTE.length]; });
  // map each source → the themes it connects to
  const srcThemes = {};
  links.forEach(l => {
    const s = l.source, t = l.target;
    if (String(t).startsWith("T_")) (srcThemes[s] = srcThemes[s] || []).push(t);
    if (String(s).startsWith("T_")) (srcThemes[t] = srcThemes[t] || []).push(s);
  });
  // assign each source to ONE cluster, load-balanced across its themes → vibrant, evenly-coloured clusters
  const themeLoad = {}; Object.keys(themeColor).forEach(t => themeLoad[t] = 0);
  const srcTheme = {};
  Object.keys(srcThemes).forEach(s => {
    const ts = srcThemes[s];
    let best = ts[0];
    ts.forEach(t => { if ((themeLoad[t] || 0) < (themeLoad[best] || 0)) best = t; });
    srcTheme[s] = best; themeLoad[best] = (themeLoad[best] || 0) + 1;
  });
  nodes.forEach(n => {
    n.deg = deg[n.id] || 1;
    if (n.kind === "theme") {
      n.isTheme = true;
      n.color = themeColor[n.id];
      n.name = n.label;
      n.size = 8 + Math.min(46, n.deg * 1.4);
      n.tooltip = n.label;
    } else {
      const tc = srcTheme[n.id];
      n.color = tc ? themeColor[tc] : "#8ea2c4";
      n.size = n.importance === "core" ? 3 + Math.min(11, n.deg * 0.7)
             : n.importance === "peripheral" ? 1.6 : 2.4;
      n.tooltip = n.title || n.id;
    }
  });
  return { nodes, links };
}

const DIM_NODE = "rgba(120,140,175,0.10)";

function build3D(v) {
  v.innerHTML = `
    <div class="view-head">
      <h2>${icon("share-2")}نقشه دانش</h2>
      <p>هر کره یک منبع است؛ کره‌های بزرگِ برچسب‌دار، محورهای موضوعی‌اند و رنگِ هر منبع نشان‌دهندهٔ خوشهٔ موضوعیِ آن است. با ماوس بچرخانید، اسکرول کنید تا زوم شود و روی هر گره کلیک کنید تا جزئیات باز شود.</p>
    </div>
    <div class="graph-controls">
      <button class="icon-btn active" id="rotBtn" title="چرخش خودکار">${icon("rotate-cw")}</button>
      <button class="icon-btn" id="fitBtn" title="بازنشانی نما">${icon("maximize-2")}</button>
      <span class="g3d-hint">${icon("mouse-pointer-click")}<span>چرخش با درگ · زوم با اسکرول · کلیک برای جزئیات</span></span>
    </div>
    <div id="graph3d"></div>
    <div class="graph-legend">
      <span><i class="dot" style="background:#00e68a"></i>گره‌های بزرگ‌تر = پرارتباط‌تر</span>
      <span><i class="dot" style="background:#f0b040"></i>محورِ موضوعی (برچسب‌دار)</span>
      <span class="muted">رنگِ هر منبع = خوشهٔ موضوعیِ آن</span>
    </div>`;
  refreshIcons(v);

  const container = $("#graph3d");
  const data = buildGraphData();
  const light = document.documentElement.getAttribute("data-theme") === "light";
  const bg = light ? "#eaf0f8" : "#050a16";
  const baseLink = light ? "rgba(90,120,160,0.22)" : "rgba(130,160,210,0.14)";
  const hlLink = "#00e68a";

  let hlNode = null;
  const nbr = new Set();
  const nodeColor = n => (hlNode && !nbr.has(n.id)) ? DIM_NODE : n.color;
  const linkColor = l => {
    const s = typeof l.source === "object" ? l.source.id : l.source;
    const t = typeof l.target === "object" ? l.target.id : l.target;
    if (!hlNode) return baseLink;
    return (s === hlNode.id || t === hlNode.id) ? hlLink : "rgba(120,140,175,0.04)";
  };
  const refresh = () => { graph3d.nodeColor(nodeColor).linkColor(linkColor); };

  let fitted = false;
  graph3d = ForceGraph3D()(container)
    .graphData(data)
    .backgroundColor(bg)
    .showNavInfo(false)
    .nodeRelSize(4)
    .nodeVal(n => n.size)
    .nodeColor(nodeColor)
    .nodeOpacity(1)
    .nodeResolution(16)
    .linkColor(linkColor)
    .linkWidth(l => (hlNode && ((typeof l.source === "object" ? l.source.id : l.source) === hlNode.id || (typeof l.target === "object" ? l.target.id : l.target) === hlNode.id)) ? 1.2 : 0.4)
    .linkOpacity(0.5)
    .nodeLabel(n => `<div class="g3d-tip">${esc(n.tooltip)}</div>`)
    .onNodeClick(n => {
      hlNode = n; nbr.clear(); nbr.add(n.id);
      data.links.forEach(l => {
        const s = typeof l.source === "object" ? l.source.id : l.source;
        const t = typeof l.target === "object" ? l.target.id : l.target;
        if (s === n.id) nbr.add(t);
        if (t === n.id) nbr.add(s);
      });
      refresh();
      const r = Math.hypot(n.x, n.y, n.z) || 1;
      const k = 1 + 120 / r;
      graph3d.cameraPosition({ x: n.x * k, y: n.y * k, z: n.z * k }, n, 900);
      if (n.isTheme) showThemeSources(n.name); else openSource(n.id);
    })
    .onBackgroundClick(() => { hlNode = null; nbr.clear(); refresh(); })
    .cooldownTime(6000)
    .onEngineStop(() => graph3d.zoomToFit(700, 55));

  // spread clusters apart for a clean, readable layout
  graph3d.d3Force("charge").strength(-90);
  if (graph3d.d3Force("link")) graph3d.d3Force("link").distance(l => (typeof l.target === "object" && l.target.isTheme ? 30 : 44));

  const resize = () => graph3d.width(container.clientWidth).height(container.clientHeight);
  resize();
  window.addEventListener("resize", resize);
  // frame the cloud while the layout settles (safety, in case engine cools slowly)
  [1200, 2600, 4200, 6200].forEach(t => setTimeout(() => { if (!hlNode) graph3d.zoomToFit(600, 55); }, t));

  // controls
  let rotating = true;
  const controls = graph3d.controls();
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.55;
  $("#rotBtn").onclick = e => {
    rotating = !rotating;
    controls.autoRotate = rotating;
    e.currentTarget.classList.toggle("active", rotating);
  };
  $("#fitBtn").onclick = () => {
    hlNode = null; nbr.clear(); refresh();
    graph3d.zoomToFit(700, 40);
  };
}

// ── 2D fallback (Cytoscape) — used only when WebGL/3D is unavailable ──
function build2D(v) {
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

function renderGraph() {
  const v = $("#view-graph");
  if (v.dataset.built) return;
  v.dataset.built = "1";
  if (typeof ForceGraph3D !== "undefined" && webglOK()) {
    try { build3D(v); return; }
    catch (e) { console.warn("3D graph failed, using 2D fallback:", e); }
  }
  build2D(v);
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
  const freeCount = DBM.articles.filter(a => a.access_fa).length;

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
      <button class="db-fbtn free" data-db="__free"><span class="dot" style="background:var(--accent)"></span>دسترسی آزاد/رایگان (${fmt(freeCount)})</button>
      ${Object.keys(counts).map(k => `<button class="db-fbtn" data-db="${k}"><span class="dot" style="background:${DBCOLORS[k]}"></span>${esc(k)} (${fmt(counts[k])})</button>`).join("")}
    </div>
    <div class="art-list" id="artList"></div>`;

  v.innerHTML = html;

  function drawArts(db) {
    let arts;
    if (db === "all") arts = DBM.articles.slice();
    else if (db === "__free") arts = DBM.articles.filter(a => a.access_fa);
    else arts = DBM.articles.filter(a => a.db === db);
    arts = arts.sort((a, b) => b.relevance - a.relevance);
    $("#artList").innerHTML = arts.map(a => `
      <div class="art-card${a.access_fa ? ' has-free' : ''}" style="--dbc:${DBCOLORS[a.db] || 'var(--accent)'}">
        <div class="art-top">
          <span class="db-chip sm" style="background:${DBCOLORS[a.db] || 'var(--accent)'}">${esc(a.db)}</span>
          <span class="rel-badge" title="امتیاز ارتباط">${icon("target")}${a.relevance}٪</span>
        </div>
        <h4 class="art-title">${esc(a.title)}</h4>
        <p class="art-meta">${esc(a.authors)} · <span>${a.year}</span></p>
        <p class="art-venue">${esc(a.venue)}</p>
        ${a.access_fa ? `<div class="art-access">${icon("unlock")}${esc(a.access_fa)}</div>` : ""}
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

// ━━━━━━━━━━ SOURCE DIGEST (هضم منابع) ━━━━━━━━━━
function renderDigest() {
  const v = $("#view-digest");
  if (!v) return;
  if (!SD) { v.innerHTML = `<div class="view-head"><h2>هضم منابع</h2><p class="muted">داده در دسترس نیست.</p></div>`; return; }
  const m = SD.meta;

  let html = `
    <div class="view-head">
      <h2>${icon("brain-circuit")}${esc(m.title_fa)}</h2>
      <p>${esc(m.subtitle_fa)}</p>
    </div>
    <div class="db-note">${icon("info")}<div>${esc(m.note_fa)}</div></div>

    <div class="dg-report">
      ${icon("file-check-2")}
      <div class="dg-report-txt"><b>گزارشِ کاملِ تحلیلِ منابع</b><span>سندِ شفافیتِ استناد در قالبِ فایلِ قابلِ دانلود</span></div>
      <div class="dg-report-btns">
        <a class="dg-dl pdf" href="./${encodeURIComponent(SD.report.pdf)}" target="_blank" rel="noopener">${icon("file-text")}دانلود PDF</a>
        <a class="dg-dl doc" href="./${encodeURIComponent(SD.report.docx)}" target="_blank" rel="noopener">${icon("file-type-2")}دانلود Word</a>
      </div>
    </div>

    <div class="dg-intro">
      ${SD.intro.map(p => `<p>${esc(p)}</p>`).join("")}
    </div>

    <h3 class="sec-title">${icon("layers")}واکاویِ منبع‌به‌منبع <span class="badge" style="background:var(--accent)">${fmt(SD.sources.length)}</span></h3>
    <div class="dg-list">`;

  SD.sources.forEach((s, i) => {
    html += `
      <div class="dg-card${s.caution ? ' caution' : ''}">
        <div class="dg-head">
          <span class="dg-num">${fmt(i + 1)}</span>
          <span class="db-chip sm" style="background:var(--accent2)">${esc(s.id)}</span>
          <span class="rel-badge" title="امتیاز ارتباط">${icon("target")}${s.relevance}٪</span>
          ${s.caution ? `<span class="dg-warn">${icon("alert-triangle")}پیش‌چاپِ داوری‌نشده</span>` : ""}
        </div>
        <h4 class="dg-title">${esc(s.title_fa || s.title)}</h4>
        <p class="dg-meta">${esc(s.name_fa || s.authors)} · <span>${fmt(s.year)}</span> · ${esc(s.venue)}</p>
        <p class="dg-meta-en" dir="ltr">${esc(s.title)} — ${esc(s.authors)}</p>
        ${s.doi ? `<a class="art-doi" href="https://doi.org/${esc(s.doi)}" target="_blank" rel="noopener">${icon("link")}DOI: ${esc(s.doi)}</a>` : ""}

        <div class="dg-block">
          <div class="dg-block-h">${icon("search-check")}الف) چه استخراج شد؟</div>
          <p class="dg-finding">${esc(s.finding_fa)}</p>
          <ul class="dg-points">${(s.points || []).map(p => `<li>${esc(p)}</li>`).join("")}</ul>
        </div>

        <div class="art-sw">
          <div class="sw s"><b>${icon("plus-circle")}قوت</b>${esc(s.strength_fa)}</div>
          <div class="sw w"><b>${icon("minus-circle")}ضعف</b>${esc(s.weakness_fa)}</div>
        </div>

        <div class="dg-block">
          <div class="dg-block-h">${icon("git-merge")}ب) کجا و چگونه به‌کار رفت؟</div>
          <p>${esc(s.usage)}</p>
        </div>

        <div class="dg-block hi">
          <div class="dg-block-h">${icon("sparkles")}ج) چگونه نتیجه‌گیری را بهینه کرد؟</div>
          <p>${esc(s.opt)}</p>
        </div>

        <div class="dg-tags">
          ${(s.chapters || []).map(c => `<span class="tag ch">${esc(c)}</span>`).join("")}
          ${(s.questions || []).map(q => `<span class="tag q">پرسش ${esc(q)}</span>`).join("")}
        </div>
        <div class="art-note">${icon("quote")}<b>یادداشتِ استناد:</b> ${esc(s.citation_note_fa)}</div>
      </div>`;
  });
  html += `</div>`;

  // Synthesis
  html += `
    <h3 class="sec-title">${icon("combine")}جمع‌بندیِ ترکیبی</h3>
    <div class="dg-synth">
      ${SD.synthesis.map(p => `<p>${esc(p)}</p>`).join("")}
    </div>`;

  // Upgrades applied to the conclusion
  html += `
    <h3 class="sec-title">${icon("trending-up")}ارتقاهای اعمال‌شده بر نتیجه‌گیری</h3>
    <div class="dg-upg">
      <p class="dg-upg-intro">${esc(SD.upgrades_intro)}</p>
      <div class="dg-pillars">
        ${SD.upgrades.map((u, i) => `<div class="dg-pillar"><span class="dg-pnum">${fmt(i + 1)}</span><p>${esc(u)}</p></div>`).join("")}
      </div>
      <p class="dg-upg-tail">${esc(SD.upgrades_tail)}</p>
    </div>`;

  v.innerHTML = html;
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
        ${icon("file-pen-line")}
        <div>
          <b>رسالهٔ زنده روی همین پایپلاین میزبانی می‌شود</b>
          <span>ساختارِ فصل‌به‌فصل با متنِ واقعیِ پیش‌نویس‌های نگارنده (فصل ۲ و ۳ + پانویس‌ها) و فصل‌های تألیفیِ عامل (۱، ۴، ۵)، منطبق بر آیین‌نامهٔ نگارش ۱۴۰۰. خروجیِ Word/PDF از همین محتوا ساخته می‌شود.</span>
        </div>
      </div>
      <div class="thesis-banner-btns">
        <button class="tbtn tbtn-primary" onclick="switchView('thesis')">${icon("file-pen-line")}نگارش رساله</button>
        <button class="tbtn" onclick="switchView('review')">${icon("clipboard-check")}نقد و سناریو</button>
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



// ━━━━━━━━━━ THESIS (LIVING MENU) ━━━━━━━━━━
window.switchView = switchView;

// Render paragraph text, converting {{fn:N}} markers into superscript refs.
function thPara(text, fns) {
  const parts = String(text || "").split(/(\{\{fn:\d+\}\})/g);
  return parts.map(seg => {
    const m = seg.match(/^\{\{fn:(\d+)\}\}$/);
    if (m) {
      const n = +m[1];
      const fnTxt = (fns && fns[n - 1]) ? fns[n - 1] : "";
      return `<sup class="fnref" title="${esc(fnTxt)}">${fmt(n)}</sup>`;
    }
    return esc(seg);
  }).join("");
}

const TH_STATUS = {
  "written":    { cls: "st-written",   label: "نگاشتهٔ عامل" },
  "user-draft": { cls: "st-userdraft", label: "پیش‌نویس نگارنده" },
  "draft":      { cls: "st-draft",     label: "پیش‌نویس اولیه" },
  "planned":    { cls: "st-planned",   label: "برنامه‌ریزی‌شده" }
};
function thBadge(status) {
  const s = TH_STATUS[status] || { cls: "st-draft", label: status || "—" };
  return `<span class="th-badge ${s.cls}">${esc(s.label)}</span>`;
}

function renderThesis() {
  const v = $("#view-thesis");
  if (!TH) { v.innerHTML = `<div class="view-head"><h2>نگارش رساله</h2><p class="muted">داده در دسترس نیست (thesis.json).</p></div>`; return; }
  const m = TH.meta;
  const chs = TH.chapters || [];

  const totalParas = chs.reduce((a, c) => a + (c.stat_paras || 0), 0);
  const totalFns = chs.reduce((a, c) => a + (c.stat_fns || 0), 0);
  const totalSecs = chs.reduce((a, c) => a + (c.stat_sections || 0), 0);

  let html = `
    <div class="view-head">
      <h2>${icon("file-pen-line")}${esc(m.title_fa)}</h2>
      <p>${esc(m.subtitle_fa)}</p>
    </div>
    <div class="db-note">${icon("info")}<div>${esc(m.note_fa)}</div></div>

    <div class="db-metrics">
      <div class="db-metric"><b>${fmt(chs.length)}</b><span>فصل</span></div>
      <div class="db-metric"><b>${fmt(totalSecs)}</b><span>گفتار/بخش</span></div>
      <div class="db-metric"><b>${fmt(totalParas)}</b><span>بند</span></div>
      <div class="db-metric hi"><b>${fmt(totalFns)}</b><span>پانویس</span></div>
    </div>`;

  // 1400 compliance panel
  const cmp = TH.compliance_1400;
  if (cmp) {
    html += `
    <div class="card th-compliance">
      <h3>${icon("check-check")}انطباق با آیین‌نامهٔ نگارش ۱۴۰۰</h3>
      <p class="muted" style="margin-top:-4px">${esc(cmp.intro_fa)}</p>
      <div class="cmp-grid">
        ${cmp.items.map(it => `
          <div class="cmp-item ${it.status === 'ok' ? 'ok' : (it.status === 'todo' ? 'todo' : 'partial')}">
            ${icon(it.status === 'ok' ? 'check-circle-2' : (it.status === 'todo' ? 'circle-dashed' : 'circle-dot'))}
            <div><b>${esc(it.item_fa)}</b><span>${esc(it.rule_fa)}</span></div>
          </div>`).join("")}
      </div>
    </div>`;
  }

  // Chapter status legend
  html += `<div class="th-legend">
    ${Object.keys(TH_STATUS).map(k => `<span class="th-badge ${TH_STATUS[k].cls}">${esc(TH_STATUS[k].label)}</span>`).join("")}
    <span class="th-legend-note">${icon("mouse-pointer-click")} روی هر فصل بزنید تا باز/بسته شود؛ نشانهٔ عددی بالاِ متن، شمارهٔ پانویس است (نشانگر را روی آن نگه دارید).</span>
  </div>`;

  // Chapters accordion
  html += `<div class="th-chapters">`;
  chs.forEach((c, ci) => {
    html += `
      <div class="th-ch acc ${ci === 0 ? "open" : ""}">
        <div class="acc-hd th-ch-hd" onclick="this.parentElement.classList.toggle('open')">
          <div class="th-ch-title">
            <span class="th-ch-num">${esc(c.num)}</span>
            <b>${esc(c.title_fa)}</b>
            ${thBadge(c.status)}
          </div>
          <div class="th-ch-stats">
            ${c.cap_fa ? `<span class="th-cap">${esc(c.cap_fa)}</span>` : ""}
            <span class="cnt">${fmt(c.stat_sections)} بخش · ${fmt(c.stat_paras)} بند · ${fmt(c.stat_fns)} پانویس</span>
            ${icon("chevron-down")}
          </div>
        </div>
        <div class="acc-bd">
          ${c.summary_fa ? `<p class="th-ch-summary">${icon("quote")}${esc(c.summary_fa)}</p>` : ""}
          <div class="th-sections">`;
    (c.sections || []).forEach(s => {
      const lvl = Math.min(s.level || 1, 4);
      html += `
            <div class="th-sec lvl-${lvl}">
              <div class="th-sec-hd">
                <span class="th-sec-num">${esc(s.num || "")}</span>
                <h4>${esc(s.title_fa || "")}</h4>
                ${s.status ? thBadge(s.status) : ""}
              </div>
              <div class="th-sec-body">
                ${(s.paras || []).map(p => `<p class="th-p">${thPara(p, s.fns)}</p>`).join("")}
              </div>`;
      if (s.fns && s.fns.length) {
        html += `
              <details class="th-fns">
                <summary>${icon("list-ordered")}پانویس‌های این بخش (${fmt(s.fns.length)})</summary>
                <ol>${s.fns.map(f => `<li>${esc(f)}</li>`).join("")}</ol>
              </details>`;
      }
      if (s.sources && s.sources.length) {
        html += `<div class="th-sec-src">${icon("link")}${s.sources.map(x => `<span class="tag">${esc(x)}</span>`).join("")}</div>`;
      }
      html += `</div>`;
    });
    html += `
          </div>
        </div>
      </div>`;
  });
  html += `</div>`;

  v.innerHTML = html;
  refreshIcons(v);
}

// ━━━━━━━━━━ REVIEW (CRITIQUE + SCENARIO) ━━━━━━━━━━
const VERDICT = {
  keep:     { cls: "vd-keep",     label: "نگه‌داشتن",  ic: "check-circle-2" },
  complete: { cls: "vd-complete", label: "کامل‌کردن",  ic: "plus-circle" },
  fix:      { cls: "vd-fix",      label: "اصلاح",       ic: "wrench" },
  delete:   { cls: "vd-delete",   label: "حذف/انتقال", ic: "trash-2" }
};

function renderReview() {
  const v = $("#view-review");
  if (!TH || (!TH.critique && !TH.scenario)) {
    v.innerHTML = `<div class="view-head"><h2>نقد و سناریو</h2><p class="muted">داده در دسترس نیست.</p></div>`;
    return;
  }
  const cr = TH.critique, sc = TH.scenario;

  let html = `
    <div class="view-head">
      <h2>${icon("clipboard-check")}نقدِ پیش‌نویس‌ها و بازآراییِ سناریو</h2>
      <p>نقدِ بندبندِ پیش‌نویس‌های نگارنده (با حکم، دلیل و منبع) و مقایسهٔ سناریوی نگارنده با بازنویسیِ پیشنهادیِ عامل.</p>
    </div>`;

  // ── Critique ──
  if (cr) {
    html += `<div class="db-note">${icon("info")}<div>${esc(cr.intro_fa)}</div></div>`;
    // verdict legend
    html += `<div class="th-legend">
      ${Object.keys(VERDICT).map(k => `<span class="vd-chip ${VERDICT[k].cls}">${icon(VERDICT[k].ic)}${esc(VERDICT[k].label)}</span>`).join("")}
    </div>`;

    (cr.chapters || []).forEach((c, i) => {
      // counts per verdict
      const vc = {};
      c.comments.forEach(cm => vc[cm.verdict] = (vc[cm.verdict] || 0) + 1);
      html += `
        <div class="rv-ch acc ${i === 0 ? "open" : ""}">
          <div class="acc-hd rv-ch-hd" onclick="this.parentElement.classList.toggle('open')">
            <b>${esc(c.ch)}</b>
            <span class="rv-ch-counts">
              ${Object.keys(VERDICT).filter(k => vc[k]).map(k => `<span class="vd-mini ${VERDICT[k].cls}">${esc(VERDICT[k].label)} ${fmt(vc[k])}</span>`).join("")}
              ${icon("chevron-down")}
            </span>
          </div>
          <div class="acc-bd">
            ${c.overall_fa ? `<p class="rv-overall">${icon("scan-text")}${esc(c.overall_fa)}</p>` : ""}
            <div class="rv-comments">
              ${c.comments.map(cm => {
                const vd = VERDICT[cm.verdict] || { cls: "vd-fix", label: cm.verdict, ic: "dot" };
                return `
                <div class="rv-c ${vd.cls}">
                  <div class="rv-c-hd">
                    <span class="rv-target">${esc(cm.target_fa)}</span>
                    <span class="vd-chip ${vd.cls}">${icon(vd.ic)}${esc(vd.label)}</span>
                  </div>
                  <div class="rv-c-row"><b>${icon("message-square-text")}دلیل:</b> ${esc(cm.reason_fa)}</div>
                  <div class="rv-c-row src"><b>${icon("book-marked")}منبع/مبنا:</b> ${esc(cm.source_fa)}</div>
                </div>`;
              }).join("")}
            </div>
          </div>
        </div>`;
    });
  }

  // ── Scenario ──
  if (sc) {
    html += `<h3 class="sec-title">${icon("git-compare-arrows")}${esc(sc.rewrite_title_fa || "سناریو: نگارنده در برابر بازنویسیِ عامل")}</h3>`;
    html += `<p class="muted" style="margin-top:-6px">${esc(sc.intro_fa)}</p>`;

    // evaluation strengths/gaps
    if (sc.strengths_fa || sc.gaps_fa) {
      html += `<div class="two-col">`;
      if (sc.strengths_fa) html += `<div class="col"><h3>${icon("check-circle")}${esc(sc.eval_title_fa || "ارزیابی")} — نقاط قوت</h3>${sc.strengths_fa.map(s => `<div class="gn-item n">${esc(s)}</div>`).join("")}</div>`;
      if (sc.gaps_fa) html += `<div class="col"><h3>${icon("alert-triangle")}خلأها و اصلاح</h3>${sc.gaps_fa.map(g => `<div class="gn-item g">${esc(g)}</div>`).join("")}</div>`;
      html += `</div>`;
    }

    if (sc.rewrite_note_fa) html += `<div class="card contrib" style="margin-top:14px">${icon("sparkles")}<div>${esc(sc.rewrite_note_fa)}</div></div>`;

    // side-by-side chapters: author vs rewrite
    const authors = sc.author_scenario_fa || [];
    const rewrites = sc.rewrite_scenario_fa || [];
    const n = Math.max(authors.length, rewrites.length);
    html += `<div class="sc-compare-head"><div>${icon("user-pen")}${esc(sc.author_title_fa || "سناریوی نگارنده")}</div><div>${icon("bot")}${esc(sc.rewrite_title_fa || "بازنویسیِ عامل")}</div></div>`;
    html += `<div class="sc-compare">`;
    for (let i = 0; i < n; i++) {
      const a = authors[i], r = rewrites[i];
      html += `<div class="sc-row">
        <div class="sc-cell author">
          ${a ? `<div class="sc-ch-hd"><b>${esc(a.ch)}</b>${a.cap_fa ? `<em>${esc(a.cap_fa)}</em>` : ""}</div>
                 <p class="sc-ch-title">${esc(a.title_fa)}</p>
                 ${(a.goftar_fa && a.goftar_fa.length) ? `<ul>${a.goftar_fa.map(g => `<li>${esc(g)}</li>`).join("")}</ul>` : ""}` : `<p class="muted">—</p>`}
        </div>
        <div class="sc-cell rewrite">
          ${r ? `<div class="sc-ch-hd"><b>${esc(r.ch)}</b>${r.cap_fa ? `<em>${esc(r.cap_fa)}</em>` : ""}</div>
                 <p class="sc-ch-title">${esc(r.title_fa)}</p>
                 ${(r.goftar_fa && r.goftar_fa.length) ? `<ul>${r.goftar_fa.map(g => `<li>${esc(g)}</li>`).join("")}</ul>` : ""}
                 ${r.rationale_fa ? `<div class="sc-rationale">${icon("lightbulb")}${esc(r.rationale_fa)}</div>` : ""}` : `<p class="muted">—</p>`}
        </div>
      </div>`;
    }
    html += `</div>`;
  }

  v.innerHTML = html;
  refreshIcons(v);
}



// ━━━━━━━━━━ COMPILE THESIS (تدوین پایان‌نامه) ━━━━━━━━━━
function renderCompile() {
  const v = $("#view-compile");
  if (!TH) { v.innerHTML = `<div class="view-head"><h2>تدوین پایان‌نامه</h2><p class="muted">داده در دسترس نیست (thesis.json).</p></div>`; return; }
  const m = TH.meta;
  const chs = TH.chapters || [];
  const gl = TH.glossary || [];
  const db = TH.debate || {};
  const cm = TH.conclusion_methodology || {};
  const refs = TH.references || { fa: [], en: [] };
  const ab = TH.en_abstract || {};

  // ── Toolbar with download buttons ──
  let html = `
    <div class="view-head">
      <h2>${icon("book-marked")}تدوین و صدور پایان‌نامه</h2>
      <p>رسالهٔ کامل، منطبق بر آیین‌نامهٔ نگارش ۱۴۰۰، در همین‌جا قابل مشاهده است و می‌توانید نسخهٔ Word و PDF را دریافت کنید.</p>
    </div>

    <div class="compile-bar">
      <div class="cb-info">
        ${icon("shield-check")}
        <div>
          <b>خروجیِ منطبق بر قالب ۱۴۰۰</b>
          <span>قلم B Nazanin ۱۴، حاشیهٔ ۳/۳/۳٫۵/۳، فاصلهٔ خطوط ۱٫۳، پانویس‌های واقعیِ Word، فهرست خودکار</span>
        </div>
      </div>
      <div class="cb-actions">
        <a class="btn-dl docx" href="./thesis_1400.docx" download>${icon("file-text")}دریافت Word (۱۴۰۰)</a>
        <a class="btn-dl pdf" href="./thesis_1400.pdf" download>${icon("file-down")}دریافت رساله به‌صورت PDF</a>
        <button class="btn-dl print" onclick="window.print()">${icon("printer")}چاپ</button>
      </div>
    </div>

    <div class="dg-report" style="margin:14px 0 6px">
      ${icon("clipboard-check")}
      <div class="dg-report-txt"><b>گزارشِ اجرای اصلاحاتِ رساله (۹۰ بند)</b><span>سندِ شفافیتِ اجرا در پاسخ به گزارشِ بررسیِ تطبیقیِ نسخهٔ اول و دوم</span></div>
      <div class="dg-report-btns">
        <a class="dg-dl pdf" href="./${encodeURIComponent("گزارش_اصلاحات_رساله.pdf")}" target="_blank" rel="noopener">${icon("file-text")}دانلود PDF</a>
        <a class="dg-dl doc" href="./${encodeURIComponent("گزارش_اصلاحات_رساله.docx")}" target="_blank" rel="noopener">${icon("file-type-2")}دانلود Word</a>
      </div>
    </div>

    <div class="doc-scroll" id="doc-preview">`;

  // ── Cover / title page ──
  html += `
      <section class="doc-page cover">
        <div class="cover-top">
          <p class="cv-uni">${esc(m.university_fa || "")}</p>
          <p class="cv-deg">${esc(m.degree_fa || "")}</p>
        </div>
        <div class="cover-mid">
          <span class="cv-kicker">عنوان رساله</span>
          <h1 class="cv-title">${esc(m.subtitle_fa || m.title_fa)}</h1>
          <p class="cv-title-en">${esc(ab.title_en || "")}</p>
        </div>
        <div class="cover-bot">
          <p>${esc(m.supervisor_fa || "")}</p>
          <p class="cv-year">سال تحصیلی ۱۴۰۴–۱۴۰۵</p>
        </div>
      </section>`;

  // ── FA abstract (چکیده) ──
  html += `
      <section class="doc-block">
        <h3 class="doc-h">${icon("align-right")}چکیده</h3>
        <p class="doc-abs">${esc(compileFaAbstract())}</p>
        <p class="doc-kw"><b>واژگان کلیدی:</b> پیمان جهانی محیط زیست، موافقت‌نامه‌های چندجانبهٔ محیط‌زیستی، چندپارگیِ حقوق بین‌الملل، یکپارچه‌سازیِ نظام‌مند، حق بر محیط‌زیستِ سالم، سند چتر.</p>
      </section>`;

  // ── TOC ──
  html += `
      <section class="doc-block">
        <h3 class="doc-h">${icon("list-tree")}فهرست مطالب</h3>
        <div class="doc-toc">`;
  chs.forEach(c => {
    html += `<div class="toc-ch"><a onclick="jumpDoc('dc-${esc(c.num)}')"><span class="toc-num">${esc(c.num)}</span>${esc(c.title_fa)}</a></div>`;
    (c.sections || []).slice(0, 40).forEach(s => {
      if ((s.level || 1) <= 2) html += `<div class="toc-sec lvl-${Math.min(s.level||1,3)}"><span class="toc-num">${esc(s.num||"")}</span>${esc(s.title_fa||"")}</div>`;
    });
  });
  html += `
          <div class="toc-ch extra"><a onclick="jumpDoc('dc-glossary')">${icon("book-a")}واژه‌نامهٔ مستند</a></div>
          <div class="toc-ch extra"><a onclick="jumpDoc('dc-debate')">${icon("scale")}موافقان و مخالفانِ پیمان</a></div>
          <div class="toc-ch extra"><a onclick="jumpDoc('dc-method')">${icon("compass")}روش‌شناسیِ نتیجه‌گیری</a></div>
          <div class="toc-ch extra"><a onclick="jumpDoc('dc-refs')">${icon("library")}منابع و مآخذ</a></div>
          <div class="toc-ch extra"><a onclick="jumpDoc('dc-en')">${icon("languages")}Abstract (English)</a></div>
        </div>
      </section>`;

  // ── Chapters (full document flow) ──
  chs.forEach(c => {
    html += `
      <section class="doc-chapter" id="dc-${esc(c.num)}">
        <div class="doc-ch-head">
          <span class="doc-ch-kicker">فصل ${esc(c.num)}</span>
          <h2>${esc(c.title_fa)}</h2>
          ${c.status ? thBadge(c.status) : ""}
        </div>
        ${c.summary_fa ? `<p class="doc-ch-summary">${icon("quote")}${esc(c.summary_fa)}</p>` : ""}`;
    (c.sections || []).forEach(s => {
      const lvl = Math.min(s.level || 1, 4);
      html += `
        <div class="doc-sec lvl-${lvl}">
          <h${Math.min(lvl+2,6)} class="doc-sec-h"><span class="doc-sec-num">${esc(s.num||"")}</span>${esc(s.title_fa||"")}</h${Math.min(lvl+2,6)}>
          ${(s.paras||[]).map(p=>`<p class="doc-p">${thPara(p, s.fns)}</p>`).join("")}`;
      /* ── PRISMA 2020 official flow-diagram (image) for ۱-۵-۱ ── */
      if (s.table && s.table.caption && s.table.caption.includes("PRISMA")) {
        html += `<figure class="prisma-fig">
          <img class="prisma-img" src="./prisma_flow.png?v=3" alt="نمودار جریانی PRISMA 2020 — فرایند غربال‌گری منابع" loading="lazy">
          <figcaption class="prisma-cap">نمودار ۱-۱ · فرایندِ غربال‌گریِ منابع بر پایهٔ استانداردِ PRISMA 2020 (Page و همکاران، BMJ 2021;372:n71)</figcaption>
        </figure>`;
      }
      /* ── generic table (non-PRISMA) ── */
      else if (s.table && (s.table.headers || s.table.rows)) {
        const t = s.table;
        html += `<div class="doc-table-wrap">`;
        if (t.caption) html += `<div class="doc-table-cap">${esc(t.caption)}</div>`;
        html += `<table class="doc-table" dir="rtl">`;
        if (t.headers && t.headers.length) {
          html += `<thead><tr>${t.headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead>`;
        }
        if (t.rows && t.rows.length) {
          html += `<tbody>${t.rows.map(r=>`<tr>${r.map(cell=>`<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</tbody>`;
        }
        html += `</table></div>`;
      }
      if (s.fns && s.fns.length) {
        html += `<div class="doc-fns"><b>پانویس‌ها:</b><ol>${s.fns.map(f=>`<li>${esc(f)}</li>`).join("")}</ol></div>`;
      }
      html += `</div>`;
    });
    html += `</section>`;
  });

  // ── Glossary (documented) ──
  if (gl.length) {
    html += `
      <section class="doc-chapter" id="dc-glossary">
        <div class="doc-ch-head"><span class="doc-ch-kicker">پیوست</span><h2>${icon("book-a")}واژه‌نامهٔ مستندِ اصطلاحات</h2></div>
        <p class="doc-ch-summary">${icon("shield-check")}هر اصطلاحِ فنیِ رساله به یک منبعِ واقعیِ معتبر گره خورده است؛ هیچ اصطلاحِ ابداعیِ بی‌منبع به کار نرفته است.</p>
        <div class="gloss-grid">
          ${gl.map(g=>`
            <div class="gloss-card">
              <div class="gloss-term"><b>${esc(g.term_fa)}</b><span class="gloss-en">${esc(g.term_en)}</span></div>
              <p class="gloss-def">${esc(g.def_fa)}</p>
              <div class="gloss-src">${icon("book-marked")}${esc(g.source_fa)}</div>
            </div>`).join("")}
        </div>
      </section>`;
  }

  // ── Debate: proponents vs opponents ──
  if ((db.proponents||[]).length || (db.opponents||[]).length) {
    html += `
      <section class="doc-chapter" id="dc-debate">
        <div class="doc-ch-head"><span class="doc-ch-kicker">تحلیل</span><h2>${icon("scale")}موافقان و مخالفانِ پیمان جهانی</h2></div>
        <div class="debate-grid">
          <div class="debate-col pro">
            <h4>${icon("thumbs-up")}دیدگاهِ موافقان</h4>
            ${(db.proponents||[]).map(p=>`<div class="debate-item"><p>${esc(p.point_fa)}</p><span class="debate-src">${icon("book-marked")}${esc(p.source_fa)}</span></div>`).join("")}
          </div>
          <div class="debate-col opp">
            <h4>${icon("thumbs-down")}دیدگاهِ مخالفان</h4>
            ${(db.opponents||[]).map(p=>`<div class="debate-item"><p>${esc(p.point_fa)}</p><span class="debate-src">${icon("book-marked")}${esc(p.source_fa)}</span></div>`).join("")}
          </div>
        </div>
        ${db.synthesis_fa ? `<div class="debate-synth">${icon("git-merge")}<div><b>جمع‌بندیِ داوری‌شده</b><p>${esc(db.synthesis_fa)}</p></div></div>` : ""}
      </section>`;
  }

  // ── Conclusion methodology + citation chips ──
  if ((cm.models||[]).length) {
    html += `
      <section class="doc-chapter" id="dc-method">
        <div class="doc-ch-head"><span class="doc-ch-kicker">روش‌شناسی</span><h2>${icon("compass")}روش‌شناسیِ نتیجه‌گیری</h2></div>
        ${cm.intro_fa ? `<p class="doc-ch-summary">${icon("info")}${esc(cm.intro_fa)}</p>` : ""}
        <div class="method-grid">
          ${(cm.models||[]).map(md=>`
            <div class="method-card">
              <h4>${esc(md.name_fa)}</h4>
              <p class="method-app">${esc(md.approach_fa)}</p>
              <p class="method-adopt">${icon("check")}${esc(md.adopt_fa)}</p>
              <div class="cite-chip">${icon("book-marked")}${esc(md.source_fa)}</div>
            </div>`).join("")}
        </div>
        ${cm.our_method_fa ? `<div class="method-ours">${icon("sparkles")}<div><b>روشِ برگزیدهٔ این رساله</b><p>${esc(cm.our_method_fa)}</p></div></div>` : ""}
      </section>`;
  }

  // ── References FA + EN ──
  html += `
      <section class="doc-chapter" id="dc-refs">
        <div class="doc-ch-head"><span class="doc-ch-kicker">منابع</span><h2>${icon("library")}فهرست منابع و مآخذ</h2></div>
        <h4 class="refs-h">${icon("book")}الف) منابع فارسی</h4>
        <ol class="refs-list fa">${(refs.fa||[]).map(r=>`<li class="${r.cited?'':'uncited'}">${esc(r.text)}${r.cited?"":` <span class="ref-flag">${icon("alert-triangle")}نمونه — در صورت استفاده تکمیل شود</span>`}</li>`).join("")}</ol>
        <h4 class="refs-h">${icon("book")}ب) منابع لاتین (Latin References)</h4>
        <ol class="refs-list en" dir="ltr">${(refs.en||[]).map(r=>`<li>${esc(r.text)}</li>`).join("")}</ol>
      </section>`;

  // ── EN abstract ──
  if (ab.body_en) {
    html += `
      <section class="doc-chapter en-abstract" id="dc-en" dir="ltr">
        <div class="doc-ch-head"><span class="doc-ch-kicker">Abstract</span><h2>${esc(ab.title_en||"")}</h2></div>
        <p class="doc-abs en">${esc(ab.body_en)}</p>
        <p class="doc-kw en"><b>Keywords:</b> ${(ab.keywords_en||[]).map(esc).join("; ")}.</p>
      </section>`;
  }

  html += `</div>`; // doc-scroll
  v.innerHTML = html;
  refreshIcons(v);
}

// concise sourced FA abstract synthesized from the thesis' central argument
function compileFaAbstract() {
  return "این رساله فرایندِ شکل‌گیریِ «پیمان جهانی محیط زیست» (۲۰۱۷–۲۰۲۲) و تأثیرِ آن بر موافقت‌نامه‌های چندجانبهٔ محیط‌زیستی (MEAs) را بررسی می‌کند. پرسشِ اصلی این است که شکل‌گیریِ پیمان چه تأثیری بر نظامِ پراکندهٔ MEAها دارد. با روشِ توصیفی‑تحلیلیِ حقوقی و با تکیه بر سندِ چندپارگیِ کمیسیون حقوق بین‌الملل (۲۰۰۶) به‌عنوان چارچوبِ نظری، استدلال می‌شود که هدفِ پیمان — گردآوریِ اصولِ بنیادین در یک سندِ چترِ الزام‌آور و گذارِ تدریجیِ اصول از حقوق نرم به حقوق سخت از رهگذرِ «یکپارچه‌سازیِ نظام‌مند» (مادهٔ ۳۱(۳)(ج) کنوانسیون وین) — موجه بود، اما ابزارِ برگزیده (معاهدهٔ فراگیرِ اجماع‌محورِ واحد) با سرشتِ واکنشی، بخشی و تدریجیِ حقوق بین‌الملل محیط زیست ناسازگار افتاد و به همین سبب مذاکرات در ۲۰۲۲ به معاهده نینجامید. یافتهٔ کانونی این است که تأثیرِ واقعیِ پیمان نه از تصویبِ آن، بلکه از فرایندِ شکل‌گیری و ناکامیِ آن برخاست: تقویتِ گفتمانِ انسجام‌بخشی و زمینه‌سازی برای شناساییِ حقِ جهانی بر محیط‌زیستِ سالم در قطعنامهٔ ۷۶/۳۰۰ مجمع عمومی. رساله در پایان نقشهٔ راهی شش‌ستونه برای تحققِ همان هدف از مسیرهای واقع‌بینانه‌تر (توسعهٔ قضایی، تقویتِ نهادیِ برنامهٔ محیط زیست ملل متحد، بازنگریِ دوره‌ای، خوشه‌بندیِ معاهدات، کاربستِ راهبردیِ حقوق نرم و تفسیرِ یکسانِ اصول) پیشنهاد می‌کند و دلالت‌های آن را برای ایران بازمی‌نماید.";
}

function jumpDoc(id) {
  const t = document.getElementById(id);
  if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ━━━━━━━━━━ PROOF / PROCESS (سندِ فرایند) ━━━━━━━━━━
function renderProof() {
  const v = $("#view-proof");
  const nSrc = (B && B.stats ? B.stats.sources : 0);
  const nDb = (DBM && DBM.articles ? DBM.articles.length : 0);
  const nGloss = (TH && TH.glossary ? TH.glossary.length : 0);
  const chs = (TH && TH.chapters) ? TH.chapters : [];
  const totalFns = chs.reduce((a,c)=>a+(c.stat_fns||0),0);

  const pipeline = [
    { ic:"search", t:"۱) جست‌وجوی نظام‌مند", d:"پروتکلِ جست‌وجو در Westlaw، HeinOnline و Scopus؛ ثبتِ عبارت‌ها، فیلترها و بازهٔ زمانی برای قابلیتِ بازتولید (PRISMA)." },
    { ic:"filter", t:"۲) غربالگری و انتخاب", d:`از میان منابعِ شناسایی‌شده، ${fmt(nDb)} منبعِ مرتبط با معیارهای ورود/خروج انتخاب و به فصل‌ها و پرسش‌ها نگاشت شد.` },
    { ic:"brain-circuit", t:"۳) دیجستِ عمیق", d:`${fmt(nSrc)} منبع دیجست شد: یافته، نقطهٔ قوت، ضعف و یادداشتِ استناد برای هر منبع استخراج گردید.` },
    { ic:"pen-line", t:"۴) نگارشِ فصل‌به‌فصل", d:"فصولِ ۲ و ۳ متنِ واقعیِ نگارنده (پیش‌نویس)، و فصولِ ۱، ۴ و ۵ تألیفِ مستندِ عامل با استنادِ درون‌متنی و پانویسِ کامل." },
    { ic:"shield-check", t:"۵) تضمینِ اصالت", d:"پاکسازیِ کاملِ اصطلاحاتِ ابداعیِ بی‌منبع و جایگزینیِ آن‌ها با اصطلاحاتِ مستندِ کمیسیون حقوق بین‌الملل و کنوانسیون وین." },
    { ic:"book-marked", t:"۶) صدورِ خروجی", d:"تولیدِ نسخهٔ Word و PDF منطبق بر آیین‌نامهٔ ۱۴۰۰ از همان محتوای زنده، با فهرست و پانویسِ خودکار." }
  ];

  const guarantees = [
    { ic:"badge-check", t:"هر اصطلاح، یک منبع", d:`${fmt(nGloss)} اصطلاحِ فنی در واژه‌نامهٔ مستند، هرکدام گره‌خورده به منبعِ واقعی.` },
    { ic:"list-ordered", t:"استنادِ متراکم", d:`${fmt(totalFns)} پانویسِ واقعیِ Word در سرتاسرِ رساله؛ بدونِ ادعای بی‌منبع.` },
    { ic:"alert-triangle", t:"شفافیتِ اعتبار", d:"منبعِ پیش‌چاپِ داوری‌نشده (Damoah 2026) صراحتاً علامت‌گذاری شده و در کنارِ منابعِ داوری‌شده به‌کار رفته است." },
    { ic:"git-branch", t:"تفکیکِ مسئولیت", d:"وضعیتِ هر فصل/بخش (پیش‌نویسِ نگارنده / تألیفِ عامل / در دستِ تکمیل) شفاف نشان داده می‌شود." },
    { ic:"shield-x", t:"تفکیکِ دو پیمان", d:"«پیمان جهانی محیط زیست» هرگز با «پیمان برای آینده» (۲۰۲۴) خلط نشده است." },
    { ic:"scale", t:"داوریِ متوازن", d:"دیدگاهِ موافقان و مخالفان به‌تفصیل و با منبع آورده و سپس جمع‌بندیِ مستقل ارائه شده است." }
  ];

  let html = `
    <div class="view-head">
      <h2>${icon("badge-check")}سندِ فرایندِ ساخت و تضمینِ اصالت</h2>
      <p>این بخش نشان می‌دهد رساله چگونه و با چه تضمین‌هایی از دلِ یک سامانهٔ پژوهشیِ چندعاملی تولید شده است — با تأکید بر مستندبودنِ هر ادعا.</p>
    </div>

    <div class="proof-metrics">
      <div class="pm"><b>${fmt(nSrc)}</b><span>منبعِ دیجست‌شده</span></div>
      <div class="pm"><b>${fmt(nDb)}</b><span>منبعِ استنادیِ منتخب</span></div>
      <div class="pm"><b>${fmt(totalFns)}</b><span>پانویسِ واقعی</span></div>
      <div class="pm"><b>${fmt(nGloss)}</b><span>اصطلاحِ مستند</span></div>
    </div>

    <h3 class="sec-title">${icon("workflow")}زنجیرهٔ فرایندِ پژوهش</h3>
    <div class="proof-pipeline">
      ${pipeline.map((p,i)=>`
        <div class="pp-step" style="--d:${i*90}ms">
          <div class="pp-ic">${icon(p.ic)}</div>
          <div class="pp-body"><b>${esc(p.t)}</b><p>${esc(p.d)}</p></div>
        </div>`).join("")}
    </div>

    <h3 class="sec-title">${icon("shield-check")}تضمین‌های اصالت و کیفیت</h3>
    <div class="proof-grid">
      ${guarantees.map((g,i)=>`
        <div class="proof-card" style="--d:${i*70}ms">
          <div class="proof-ic">${icon(g.ic)}</div>
          <b>${esc(g.t)}</b>
          <p>${esc(g.d)}</p>
        </div>`).join("")}
    </div>

    <div class="proof-cta">
      ${icon("book-marked")}
      <div><b>آماده برای تدوینِ نهایی</b><p>برای مشاهدهٔ کاملِ رساله و دریافتِ نسخهٔ Word و PDF در قالب ۱۴۰۰، به بخشِ «تدوین پایان‌نامه» بروید.</p></div>
      <button class="btn-dl docx" onclick="goView('compile')">${icon("arrow-left")}رفتن به تدوین</button>
    </div>`;

  v.innerHTML = html;
  refreshIcons(v);
}
