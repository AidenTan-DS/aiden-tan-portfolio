const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector("[data-nav-links]");
const year = document.querySelector("[data-year]");
const visitorTotal = document.querySelector("[data-visitor-total]");
const visitorList = document.querySelector("[data-visitor-list]");
const mapPoints = document.querySelector("[data-map-points]");

const countryCoordinates = {
  AR: [310, 382],
  AT: [497, 183],
  AU: [785, 384],
  BE: [475, 174],
  BG: [527, 200],
  BR: [335, 330],
  CA: [210, 128],
  CH: [486, 188],
  CL: [290, 392],
  CN: [710, 210],
  CO: [270, 292],
  CZ: [500, 178],
  DE: [492, 169],
  DK: [493, 151],
  EG: [535, 242],
  ES: [455, 206],
  FI: [525, 122],
  FR: [470, 190],
  GB: [450, 160],
  GR: [520, 213],
  HK: [720, 248],
  ID: [705, 330],
  IE: [430, 160],
  IN: [650, 252],
  IT: [497, 205],
  JP: [785, 215],
  KE: [555, 300],
  KR: [755, 216],
  MY: [690, 306],
  MX: [205, 225],
  NG: [498, 284],
  NL: [480, 166],
  NO: [493, 126],
  NZ: [842, 425],
  PE: [275, 330],
  PH: [736, 286],
  PL: [512, 172],
  PT: [443, 209],
  RO: [525, 190],
  RU: [650, 132],
  SA: [570, 250],
  SE: [508, 130],
  SG: [682, 304],
  TH: [690, 274],
  TR: [548, 210],
  TW: [735, 247],
  UA: [548, 176],
  AE: [590, 252],
  US: [220, 190],
  VN: [705, 280],
  ZA: [520, 382],
  ZZ: [480, 250],
};

const countryDisplay = new Intl.DisplayNames(["en"], { type: "region" });

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

const getCountryName = (code, fallback) => {
  if (fallback) return fallback;

  try {
    return countryDisplay.of(code) || code;
  } catch {
    return code === "ZZ" ? "Unknown" : code;
  }
};

const renderVisitorStats = (stats) => {
  const countries = Object.values(stats.countries || {})
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 8);

  if (visitorTotal) {
    visitorTotal.textContent = String(stats.totalVisits || 0);
  }

  if (visitorList) {
    visitorList.innerHTML = countries.length
      ? countries.map((country) => `
          <div class="visitor-country">
            <strong>${getCountryName(country.code, country.name)}</strong>
            <span>${country.visits}</span>
          </div>
        `).join("")
      : '<p class="muted">No visits recorded yet.</p>';
  }

  if (mapPoints) {
    const maxVisits = Math.max(1, ...countries.map((country) => country.visits));
    mapPoints.innerHTML = countries.map((country) => {
      const [x, y] = countryCoordinates[country.code] || countryCoordinates.ZZ;
      const radius = 7 + Math.round((country.visits / maxVisits) * 18);
      const label = country.code === "ZZ" ? "Unknown" : country.code;

      return `
        <g>
          <circle class="visitor-dot" cx="${x}" cy="${y}" r="${radius}">
            <title>${getCountryName(country.code, country.name)}: ${country.visits} visits</title>
          </circle>
          <text class="visitor-label" x="${x + radius + 6}" y="${y + 4}">${label}</text>
        </g>
      `;
    }).join("");
  }
};

const loadVisitorStats = async () => {
  if (!visitorTotal && !visitorList && !mapPoints) return;

  try {
    const todayKey = new Date().toISOString().slice(0, 10);
    const storageKey = "aiden-portfolio-visitor-date";
    const shouldRecord = localStorage.getItem(storageKey) !== todayKey;
    const response = await fetch("/api/visitor-stats", {
      method: shouldRecord ? "POST" : "GET",
    });

    if (!response.ok) throw new Error("Visitor stats unavailable");

    const stats = await response.json();
    renderVisitorStats(stats);

    if (shouldRecord) {
      localStorage.setItem(storageKey, todayKey);
    }
  } catch {
    if (visitorList) {
      visitorList.innerHTML = '<p class="muted">Visitor map is available after the Netlify function deploys.</p>';
    }
  }
};

loadVisitorStats();
