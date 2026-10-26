const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector("[data-nav-links]");
const year = document.querySelector("[data-year]");

if (year) {
  year.textContent = new Date().getFullYear();
}

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      navLinks.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

/* ---------- LeetCode ---------- */

const lcRoot = document.querySelector("[data-lc]");
const DAY = 86400;

const lcHeatLevel = (count) => {
  if (!count) return 0;
  if (count < 3) return 1;
  if (count < 7) return 2;
  if (count < 13) return 3;
  return 4;
};

const relativeTime = (seconds) => {
  const diff = Date.now() / 1000 - seconds;
  if (diff < 3600) return `${Math.max(1, Math.round(diff / 60))}m ago`;
  if (diff < DAY) return `${Math.round(diff / 3600)}h ago`;
  if (diff < DAY * 30) return `${Math.round(diff / DAY)}d ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(seconds * 1000);
};

const renderHeatmap = (container, calendar) => {
  // LeetCode keys each day by its UTC-midnight timestamp.
  const today = Math.floor(Date.now() / 1000 / DAY) * DAY;
  const todayWeekday = new Date(today * 1000).getUTCDay();
  const start = today - (52 * 7 + todayWeekday) * DAY;
  const cells = [];

  for (let day = start; day <= today; day += DAY) {
    const count = Number(calendar[day] || 0);
    const label = `${count} submission${count === 1 ? "" : "s"} on ${new Date(day * 1000).toISOString().slice(0, 10)}`;
    cells.push(`<i class="l${lcHeatLevel(count)}" title="${label}"></i>`);
  }

  container.innerHTML = cells.join("");
};

const renderLeetCode = (stats) => {
  const q = (selector) => lcRoot.querySelector(selector);
  const fmt = (value) => Number(value || 0).toLocaleString("en");

  q("[data-lc-solved]").textContent = fmt(stats.solved.all);
  q("[data-lc-total]").textContent = fmt(stats.total.all);
  q("[data-lc-active]").textContent = fmt(stats.activeDays);
  q("[data-lc-streak]").textContent = `${fmt(stats.maxStreak)}d`;

  q("[data-lc-bars]").innerHTML = ["easy", "medium", "hard"]
    .map((level) => {
      const solved = stats.solved[level] || 0;
      const total = stats.total[level] || 1;
      return `
        <div class="lc-bar lc-${level}">
          <div class="lc-bar-head"><span>${level}</span><span><b>${fmt(solved)}</b> / ${fmt(total)}</span></div>
          <div class="lc-track"><span style="width:${Math.max(1.5, (solved / total) * 100).toFixed(1)}%"></span></div>
        </div>`;
    })
    .join("");

  const maxLang = Math.max(...stats.languages.map((lang) => lang.solved), 1);
  q("[data-lc-langs]").innerHTML = `<span class="arch-label">Languages</span>${stats.languages
    .slice(0, 4)
    .map((lang) => `
      <div class="lc-lang">
        <span>${escapeHtml(lang.name)}</span>
        <span class="lc-lang-bar"><span style="width:${((lang.solved / maxLang) * 100).toFixed(1)}%"></span></span>
        <b>${fmt(lang.solved)}</b>
      </div>`)
    .join("")}`;

  renderHeatmap(q("[data-lc-heatmap]"), stats.calendar || {});

  q("[data-lc-recent]").innerHTML = stats.recent.length
    ? stats.recent
        .map((item) => `
          <li>
            <span class="ok">&#10003;</span>
            <a href="https://leetcode.com/problems/${encodeURIComponent(item.slug)}/" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>
            <time>${relativeTime(item.timestamp)}</time>
          </li>`)
        .join("")
    : '<li class="dim">No recent submissions.</li>';

  q("[data-lc-badges]").innerHTML = stats.badges
    .map((badge) => `<span>${escapeHtml(badge)}</span>`)
    .join("");
};

const loadLeetCode = async () => {
  if (!lcRoot) return;

  try {
    const response = await fetch("/api/leetcode");
    if (!response.ok) throw new Error("LeetCode stats unavailable");
    renderLeetCode(await response.json());
  } catch {
    lcRoot.querySelector("[data-lc-recent]").innerHTML =
      '<li class="dim">Live stats are unavailable right now. See the profile link above.</li>';
  }
};

/* ---------- Robot mascot ---------- */

const bot = document.querySelector("[data-bot]");
const botBubble = document.querySelector("[data-bot-bubble]");
const BOT_ACTIVITIES = [
  { name: "lift", say: "never skip leg day 🏋️" },
  { name: "cook", say: "cooking something good 🍳" },
  { name: "photo", say: "say cheese 📷" },
];
let botIndex = -1;
let botCycle;
let bubbleTimer;
let moodTimer;

const botSay = (text, ms = 2200) => {
  if (!botBubble) return;
  botBubble.textContent = text;
  botBubble.classList.add("is-visible");
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => botBubble.classList.remove("is-visible"), ms);
};

const botDo = (index, { speak = false } = {}) => {
  if (!bot) return;
  bot.classList.remove(...BOT_ACTIVITIES.map((activity) => `do-${activity.name}`));
  botIndex = index;
  const activity = BOT_ACTIVITIES[index];
  if (!activity) return;
  bot.classList.add(`do-${activity.name}`);
  if (speak) botSay(activity.say);
};

const botMood = (mood) => {
  if (!bot) return;
  bot.classList.remove("is-happy", "is-confused");
  void bot.offsetWidth;
  bot.classList.add(`is-${mood}`);
  clearTimeout(moodTimer);
  moodTimer = setTimeout(() => bot.classList.remove(`is-${mood}`), 1400);
};

// Idle, then one hobby, then idle again, cycling through the hobbies.
const startBotCycle = () => {
  let step = 0;
  clearInterval(botCycle);
  botCycle = setInterval(() => {
    step += 1;
    botDo(step % 2 ? (botIndex + 1) % BOT_ACTIVITIES.length : -1);
  }, 4200);
};

if (bot && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  startBotCycle();
}

bot?.addEventListener("click", () => {
  botDo((botIndex + 1) % BOT_ACTIVITIES.length, { speak: true });
  startBotCycle();
});

/* ---------- Interactive terminal ---------- */

const terminal = document.querySelector("[data-terminal]");
const terminalLog = document.querySelector("[data-terminal-log]");
const terminalForm = document.querySelector("[data-terminal-form]");
const terminalInput = terminalForm?.querySelector("input");
const RESUME_URL = "assets/Xingye_Tan_Resume.pdf";

const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

const jumpTo = (id) => () => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  return `<span class="dim">&rarr; jumping to #${id}</span>`;
};

/* ---------- Resume preview ---------- */

const pdfModal = document.querySelector("[data-pdf-modal]");
const pdfFrame = document.querySelector("[data-pdf-frame]");
const canPreviewPdf = () =>
  pdfModal && typeof pdfModal.showModal === "function" && window.matchMedia("(min-width: 768px)").matches;

// Phones open PDFs in their own viewer; desktop gets an in-page preview.
const openResume = () => {
  if (!canPreviewPdf()) {
    window.open(RESUME_URL, "_blank", "noopener");
    return;
  }
  if (!pdfFrame.src) pdfFrame.src = `${RESUME_URL}#view=FitH`;
  pdfModal.showModal();
  document.body.classList.add("modal-open");
};

document.querySelectorAll("[data-resume-link]").forEach((link) => {
  link.addEventListener("click", (event) => {
    if (!canPreviewPdf()) return;
    event.preventDefault();
    openResume();
  });
});

pdfModal?.addEventListener("close", () => document.body.classList.remove("modal-open"));
pdfModal?.querySelector("[data-pdf-close]")?.addEventListener("click", () => pdfModal.close());
pdfModal?.addEventListener("click", (event) => {
  if (event.target === pdfModal) pdfModal.close();
});

const openLink = (url, label) => () => {
  window.open(url, "_blank", "noopener");
  return `<span class="dim">&rarr; opening ${label}</span>`;
};

const terminalCommands = {
  help: () => [
    "available commands:",
    "  <b>about</b>       who I am",
    "  <b>ibm</b>         latest internship highlights",
    "  <b>experience</b>  <b>projects</b>  <b>stack</b>  <b>education</b>",
    "  <b>leetcode</b>    <b>contact</b>",
    "  <b>resume</b>      preview my resume (PDF)",
    "  <b>github</b>  <b>linkedin</b>  <b>email</b>",
    "  <b>hobbies</b>  <b>ls</b>  <b>clear</b>  <b>date</b>",
  ].join("\n"),
  whoami: () => "xingye_tan",
  hobbies: () => {
    botDo(0, { speak: true });
    return "off the clock: lifting 🏋️  cooking 🍳  photography 📷\n(click the robot to see)";
  },
  about: () =>
    "M.S. Data Science @ University of Washington.\nI like infrastructure and figuring out the logic underneath:\nclusters, data pipelines, and the systems models train on.",
  ibm: () => [
    "IBM watsonx Assistant · Speech Team · Jun-Sep 2026",
    "  ▸ streaming Conformer RNN-T for French ASR",
    "  ▸ WER down on all 15 benchmarks (~70% avg. relative)",
    "  ▸ 5.69M entries → 4.15M samples · 5,030+ hours",
    "  ▸ feature extraction 5.3h → 78min (LSF cores ↔ BLAS threads)",
  ].join("\n"),
  ls: () => "about/  experience/  projects/  stack/  education/  leetcode/  contact/  resume.pdf",
  experience: jumpTo("experience"),
  projects: jumpTo("projects"),
  stack: jumpTo("expertise"),
  skills: jumpTo("expertise"),
  education: jumpTo("education"),
  leetcode: jumpTo("leetcode"),
  contact: jumpTo("contact"),
  resume: () => {
    openResume();
    return '<span class="dim">&rarr; opening resume.pdf</span>';
  },
  "cat resume.pdf": () => terminalCommands.resume(),
  github: openLink("https://github.com/AidenTan-DS", "github.com/AidenTan-DS"),
  linkedin: openLink("https://www.linkedin.com/in/xingye-tan-817b7a225", "LinkedIn"),
  email: () => {
    window.location.href = "mailto:xtan4@uw.edu";
    return "xtan4@uw.edu";
  },
  date: () => new Date().toString(),
  sudo: () => "nice try. permission denied 🙂",
  hello: () => "hi there 👋  type <b>help</b> to look around.",
  hi: () => "hi there 👋  type <b>help</b> to look around.",
};

const commandHistory = [];
let historyIndex = 0;

const printLine = (html, className = "out") => {
  const line = document.createElement("p");
  line.className = className;
  line.innerHTML = html;
  terminalLog.append(line);
};

const runCommand = (raw) => {
  const input = raw.trim();
  printLine(`<span class="prompt">$</span> ${escapeHtml(input)}`, "");
  if (!input) return;

  const command = input.toLowerCase();

  if (command === "clear") {
    terminalLog.innerHTML = "";
    return;
  }

  if (command.startsWith("echo ")) {
    printLine(escapeHtml(input.slice(5)));
    return;
  }

  const handler = terminalCommands[command] || terminalCommands[command.split(/\s+/)[0]];
  printLine(
    handler ? handler() : `command not found: ${escapeHtml(input)}. Try <b>help</b>`,
    handler ? "out" : "out err",
  );
  botMood(handler ? "happy" : "confused");
};

if (terminal && terminalLog && terminalForm && terminalInput) {
  terminal.addEventListener("click", (event) => {
    if (!window.getSelection()?.toString() && event.target !== terminalInput) {
      terminalInput.focus({ preventScroll: true });
    }
  });

  terminalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = terminalInput.value;
    if (value.trim()) commandHistory.push(value);
    historyIndex = commandHistory.length;
    terminalInput.value = "";
    runCommand(value);
    terminalLog.scrollTop = terminalLog.scrollHeight;
  });

  terminalInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp" && historyIndex > 0) {
      historyIndex -= 1;
    } else if (event.key === "ArrowDown" && historyIndex < commandHistory.length) {
      historyIndex += 1;
    } else {
      return;
    }
    event.preventDefault();
    terminalInput.value = commandHistory[historyIndex] ?? "";
  });
}

/* ---------- Architecture diagrams ---------- */

const architectures = {
  ibm: {
    stages: [
      ["Data", [{ t: "Raw speech corpus", d: "5.69M entries", k: "data" }]],
      ["Filter", [{ t: "Quality filtering", d: "SNR · VAD · transcript checks", k: "proc" }]],
      ["Augment", [{ t: "7 augmentation branches", d: "4.15M samples · 5,030+ h", k: "proc" }]],
      ["Features", [{ t: "Feature extraction", d: "143GB · 5.3h → 78min", k: "proc" }]],
      ["Train", [{ t: "Streaming Conformer RNN-T", d: "distributed multi-GPU", k: "model" }]],
      ["Evaluate", [{ t: "15 benchmarks", d: "WER · ~70% avg. reduction", k: "out" }]],
    ],
    rail: ["Reliability", ["end-to-end smoke tests", "checkpoint check: 336/336 tensors", "CPU liveness monitoring", "LSF cores ↔ BLAS threads"]],
  },
  clinical: {
    stages: [
      ["Source", [{ t: "ClinicalTrials.gov", d: "22K+ unstructured records", k: "data" }]],
      ["Extract", [{ t: "ETL + LLM API parsing", d: "93% parse rate", k: "model" }]],
      ["Match", [
        { t: "Fuzzy + edit distance", d: "string-level", k: "proc" },
        { t: "Word2Vec embeddings", d: "semantic", k: "proc" },
      ]],
      ["Store", [{ t: "RAG-ready knowledge base", d: "matching 63% → 95% · 5x queries", k: "data" }]],
      ["Serve", [{ t: "Treatment recommendations", d: "evidence synthesis", k: "out" }]],
    ],
    rail: ["Quality", ["drift monitoring", "85% less manual review", "cross-functional validation"]],
  },
  seer: {
    stages: [
      ["Source", [{ t: "SEER registry", d: "390K+ records · 2000-2020", k: "data" }]],
      ["ETL", [{ t: "Databricks pipelines", d: "PySpark · Spark SQL", k: "proc" }]],
      ["Analyze", [{ t: "Survival analysis", d: "R · therapy cohorts", k: "model" }]],
      ["Present", [{ t: "Streamlit dashboard", d: "interactive survival curves", k: "out" }]],
    ],
  },
  rsna: {
    stages: [
      ["Input", [{ t: "Lumbar spine MRI", d: "10K+ scans", k: "data" }]],
      ["Detect", [
        { t: "YOLOv8 @ 384px", k: "model" },
        { t: "YOLOv8 @ 512px", k: "model" },
        { t: "YOLOv8 @ 768px", k: "model" },
      ]],
      ["Classify", [
        { t: "Base classifier", d: "all severities", k: "model" },
        { t: "Severe-case specialist", d: "+18% severe sensitivity", k: "model" },
      ]],
      ["Fuse", [{ t: "Cross-scale max pooling", d: "+ probability normalization", k: "proc" }]],
      ["Output", [{ t: "Severity prediction", d: "-13% weighted log-loss", k: "out" }]],
    ],
    rail: ["Tracking", ["MLflow experiments", "9 model variants benchmarked"]],
  },
  ev: {
    stages: [
      ["Sources", [
        { t: "AFDC charging stations", k: "data" },
        { t: "Traffic counts · streets", k: "data" },
        { t: "City Light power lines", k: "data" },
        { t: "ZIP demographics · zoning", k: "data" },
      ]],
      ["Clean & join", [{ t: "GeoPandas ETL", d: "fix ZIPs · aggregate by ZIP", k: "proc" }]],
      ["Model", [
        { t: "Coverage score", d: "demand gap per ZIP", k: "proc" },
        { t: "Logistic regression", d: "500m grid · power-line, road, housing features", k: "model" },
      ]],
      ["App", [
        { t: "Location tab", d: "stations by ZIP", k: "out" },
        { t: "Evaluation tab", d: "coverage scores", k: "out" },
        { t: "Prediction tab", d: "recommended sites", k: "out" },
      ]],
    ],
    rail: ["CI", ["GitHub Actions · Py 3.11-3.13", "Black + Pylint ≥ 8", "pytest + Codecov", "Safety dependency scan"]],
  },
  bank: {
    stages: [
      ["Data", [{ t: "Bank marketing CSV", d: "40K rows · 10 numeric features", k: "data" }]],
      ["Prep", [{ t: "StandardScaler", d: "z-score features", k: "proc" }]],
      ["Reduce", [{ t: "PCA (3 components)", d: "58.8% variance retained", k: "proc" }]],
      ["Cluster", [
        { t: "K-means", d: "from scratch", k: "model" },
        { t: "Bisecting k-means", d: "from scratch", k: "model" },
        { t: "k-means++", d: "scikit-learn baseline", k: "model" },
      ]],
      ["Evaluate", [{ t: "SSE + silhouette", d: "k = 2-10 · metrics.csv", k: "proc" }]],
      ["Explore", [{ t: "Streamlit app", d: "pick k · compare models in PCA space", k: "out" }]],
    ],
  },
};

const renderArchitecture = (container) => {
  const spec = architectures[container?.dataset.arch];
  if (!spec || container.childElementCount) return;

  const stages = spec.stages
    .map(([label, nodes]) => `
      <div class="arch-stage">
        <span class="arch-label">${label}</span>
        ${nodes.map((node) => `
          <div class="arch-node k-${node.k}">
            <b>${node.t}</b>${node.d ? `<small>${node.d}</small>` : ""}
          </div>`).join("")}
      </div>`)
    .join('<span class="arch-link" aria-hidden="true"></span>');

  const rail = spec.rail
    ? `<div class="arch-rail"><span class="arch-label">${spec.rail[0]}</span>${spec.rail[1].map((item) => `<span>${item}</span>`).join("")}</div>`
    : "";

  container.innerHTML = `<div class="arch-flow">${stages}</div>${rail}`;
};

document.querySelectorAll(".arch").forEach((details) => {
  details.addEventListener("toggle", () => {
    if (details.open) renderArchitecture(details.querySelector("[data-arch]"));
  });
});

/* ---------- Scroll reveal ---------- */

const revealTargets = document.querySelectorAll(
  ".reveal, .logo-wall, .timeline-item, .contact-section, .about-layout",
);

if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

  revealTargets.forEach((element, index) => {
    element.classList.add("reveal");
    element.style.setProperty("--reveal-delay", `${(index % 3) * 70}ms`);
    observer.observe(element);
  });
  document.documentElement.classList.add("reveal-ready");
}

loadLeetCode();
