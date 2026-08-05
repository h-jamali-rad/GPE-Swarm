// GPE Swarm dashboard — loads data.json and renders the UI.
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };

const TASKS = [
  { n: 1, t: "مطالعه عمیق منابع", d: "مطالعه تحلیلی–انتقادی کلیه منابع، استخراج یافته‌ها و تعیین نقاط قوت/ضعف هر منبع." },
  { n: 2, t: "جستجوی نظام‌مند پایگاه‌داده", d: "مراجعه به Westlaw، HeinOnline و Scopus و شناسایی و ارزیابی منابع مرتبط جدید." },
  { n: 3, t: "ارتقاء سؤال و فرضیه", d: "بررسی پرسش‌ها و فرضیه‌های پروپوزال از منظر وضوح، قابلیت تحقیق، نوآوری و ارتباط با عنوان." },
  { n: 4, t: "تحلیل و ارتقاء سناریو", d: "تحلیل سناریوی رساله، رفع خلأهای پوششی و افزودن رویکرد آینده‌پژوهی و درس‌آموخته‌ها." },
  { n: 5, t: "نسخه پیشنهادی سناریو", d: "تهیه نسخه حرفه‌ای سناریوی کلی و فهرست مطالب پیشنهادی." },
];

async function main() {
  let data;
  try {
    data = await (await fetch("./data.json", { cache: "no-store" })).json();
  } catch (e) {
    $("#hero-title").textContent = "خطا در بارگذاری داده‌ها (data.json)";
    return;
  }

  // hero
  $("#hero-title").textContent = data.title_fa;
  $("#hero-sub").textContent = data.subtitle_fa;
  const s = data.stats;
  const statDefs = [
    [s.sources, "سند پژوهشی"], [s.categories, "دسته منبع"],
    [s.agents, "ایجنت"], [s.tasks, "وظیفه اصلی"],
  ];
  const stats = $("#stats");
  statDefs.forEach(([n, l]) => stats.append(el("div", "stat", `<b>${n}</b><span>${l}</span>`)));
  $("#repo-note").innerHTML = `مخزن: <code>${data.repo_slug}</code> — این داشبورد برای نمایش پیشرفت و خروجی‌ها به پژوهشگر طراحی شده است.`;

  // footer
  $("#footer-title").textContent = data.title_fa;
  const d = new Date(data.generated);
  $("#footer-meta").textContent = `آخرین به‌روزرسانی داده‌ها: ${d.toLocaleString("fa-IR")}`;

  // pipeline
  const pipe = $("#pipeline");
  const order = ["source_analyst", "database_researcher", "question_hypothesis_evaluator", "scenario_analyst", "synthesis_writer"];
  order.forEach((id, i) => {
    const a = data.agents.find(x => x.id === id);
    pipe.append(el("span", "pill", a ? a.name_fa : id));
    if (i < order.length - 1) pipe.append(el("span", "arrow", "←"));
  });

  // research frame (title/question/hypothesis)
  const rf = $("#research-frame");
  rf.append(el("div", "rf-card", `<h4>پرسش اصلی</h4><p>شکل‌گیری پیمان جهانی محیط زیست چه تأثیری بر موافقت‌نامه‌های چندجانبه محیط‌زیستی خواهد داشت؟</p>`));
  rf.append(el("div", "rf-card", `<h4>فرضیه اصلی</h4><p>نظر به پراکندگی و خلأهای هنجاری و فقدان سند الزام‌آور، شکل‌گیری پیمان با ماهیت الزام‌آور موجب نظم و توسعه هنجاری اصول و تبدیل حقوق نرم به حقوق سخت خواهد شد.</p>`));
  const tasksCard = el("div", "rf-card");
  tasksCard.style.gridColumn = "1 / -1";
  tasksCard.innerHTML = `<h4>پنج وظیفه اصلی</h4><ul>${TASKS.map(t => `<li><b>وظیفه ${t.n} — ${t.t}:</b> ${t.d}</li>`).join("")}</ul>`;
  rf.append(tasksCard);

  // agents
  const ag = $("#agent-grid");
  data.agents.forEach(a => {
    ag.append(el("div", "agent-card",
      `${a.task !== "—" ? `<span class="task-badge">${a.task}</span>` : `<span class="task-badge">هماهنگی</span>`}
       <h3>${a.name_fa}</h3><div class="en">${a.name_en}</div><p>${a.desc}</p>`));
  });

  // sources
  renderSources(data);

  // outputs
  const og = $("#output-grid");
  data.outputs.forEach((o, i) => {
    const card = el("div", `out-card ${o.ready ? "ready" : "pending"}`);
    let filesHtml = "";
    if (o.ready) filesHtml = `<div class="files">${o.files.map(f => `<a href="../${f.path}">${f.name}</a>`).join("")}</div>`;
    card.innerHTML = `<span class="status">${o.ready ? "آماده" : "در انتظار"}</span>
      <div class="num">${i + 1}</div><h4>${o.label}</h4><div class="agent">${o.agent}</div>${filesHtml}`;
    og.append(card);
  });
}

function renderSources(data) {
  const listEl = $("#src-list"), emptyEl = $("#src-empty"), searchEl = $("#search"), chipsEl = $("#cat-chips");
  $("#src-count").textContent = `(${data.stats.sources} سند)`;
  let activeCat = "all", q = "";

  const chipAll = el("div", "chip active", `همه <span class="n">${data.stats.sources}</span>`);
  chipAll.dataset.cat = "all";
  chipsEl.append(chipAll);
  data.categories.forEach(c => {
    const chip = el("div", "chip", `${c.label} <span class="n">${c.count}</span>`);
    chip.dataset.cat = c.key;
    chipsEl.append(chip);
  });
  chipsEl.addEventListener("click", e => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    [...chipsEl.children].forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    activeCat = chip.dataset.cat;
    draw();
  });
  searchEl.addEventListener("input", () => { q = searchEl.value.trim().toLowerCase(); draw(); });

  function draw() {
    listEl.innerHTML = "";
    const items = data.documents.filter(d =>
      (activeCat === "all" || d.category === activeCat) &&
      (!q || d.filename.toLowerCase().includes(q)));
    emptyEl.hidden = items.length > 0;
    items.forEach(d => {
      const a = el("a", "src-item");
      a.href = d.url; a.target = "_blank"; a.rel = "noopener";
      a.innerHTML = `<span class="ext">${d.ext}</span>
        <span class="meta"><span class="fn">${d.filename}</span><span class="cat">${d.cat_label}</span></span>
        <span class="sz">${d.size_bytes ? (d.size_bytes/1024|0)+" KB" : ""}</span>`;
      listEl.append(a);
    });
  }
  draw();
}

main();
