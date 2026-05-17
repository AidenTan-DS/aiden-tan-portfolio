const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector("[data-nav-links]");
const year = document.querySelector("[data-year]");
const visitorTotal = document.querySelector("[data-visitor-total]");
const visitorList = document.querySelector("[data-visitor-list]");
const visitorSince = document.querySelector("[data-visitor-since]");
const visitorMapElement = document.querySelector("#visitor-map");

const countryCoordinates = {
  AR: [-38.42, -63.62],
  AT: [47.52, 14.55],
  AU: [-25.27, 133.78],
  BE: [50.5, 4.47],
  BG: [42.73, 25.49],
  BR: [-14.24, -51.93],
  CA: [56.13, -106.35],
  CH: [46.82, 8.23],
  CL: [-35.68, -71.54],
  CN: [35.86, 104.2],
  CO: [4.57, -74.3],
  CZ: [49.82, 15.47],
  DE: [51.17, 10.45],
  DK: [56.26, 9.5],
  EG: [26.82, 30.8],
  ES: [40.46, -3.75],
  FI: [61.92, 25.75],
  FR: [46.23, 2.21],
  GB: [55.38, -3.44],
  GR: [39.07, 21.82],
  HK: [22.32, 114.17],
  ID: [-0.79, 113.92],
  IE: [53.41, -8.24],
  IN: [20.59, 78.96],
  IT: [41.87, 12.57],
  JP: [36.2, 138.25],
  KE: [-0.02, 37.91],
  KR: [35.91, 127.77],
  MY: [4.21, 101.98],
  MX: [23.63, -102.55],
  NG: [9.08, 8.68],
  NL: [52.13, 5.29],
  NO: [60.47, 8.47],
  NZ: [-40.9, 174.89],
  PE: [-9.19, -75.02],
  PH: [12.88, 121.77],
  PL: [51.92, 19.15],
  PT: [39.4, -8.22],
  RO: [45.94, 24.97],
  RU: [61.52, 105.32],
  SA: [23.89, 45.08],
  SE: [60.13, 18.64],
  SG: [1.35, 103.82],
  TH: [15.87, 100.99],
  TR: [38.96, 35.24],
  TW: [23.7, 120.96],
  UA: [48.38, 31.17],
  AE: [23.42, 53.85],
  US: [37.09, -95.71],
  VN: [14.06, 108.28],
  ZA: [-30.56, 22.94],
  ZZ: [20, 0],
};

const countryDisplay = new Intl.DisplayNames(["en"], { type: "region" });
let visitorMap;
let markerLayer;

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

const formatDate = (value) => {
  if (!value) return "Since first recorded visit";

  return `Since ${new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))}`;
};

const initVisitorMap = () => {
  if (!visitorMapElement || typeof L === "undefined") return null;
  if (visitorMap) return visitorMap;

  visitorMap = L.map(visitorMapElement, {
    attributionControl: false,
    maxBounds: [[-85, -180], [85, 180]],
    maxBoundsViscosity: 0.9,
    minZoom: 1,
    worldCopyJump: true,
  }).setView([20, 0], 1);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 5,
    noWrap: true,
  }).addTo(visitorMap);

  markerLayer = L.layerGroup().addTo(visitorMap);
  return visitorMap;
};

const locationFromCountry = (country) => {
  const [latitude, longitude] = countryCoordinates[country.code] || countryCoordinates.ZZ;

  return {
    id: country.code,
    label: getCountryName(country.code, country.name),
    countryName: getCountryName(country.code, country.name),
    latitude,
    longitude,
    visits: country.visits,
  };
};

const getLocations = (stats, countries) => {
  const locations = Object.values(stats.locations || {})
    .filter((location) => Number.isFinite(location.latitude) && Number.isFinite(location.longitude));

  if (locations.length) {
    return locations.sort((a, b) => b.visits - a.visits);
  }

  return countries.map(locationFromCountry);
};

const renderMapPoints = (locations) => {
  const map = initVisitorMap();
  if (!map || !markerLayer) return;

  markerLayer.clearLayers();

  locations.forEach((location) => {
    const radius = Math.min(18, 7 + Math.sqrt(location.visits) * 3);
    const marker = L.circleMarker([location.latitude, location.longitude], {
      radius,
      color: "#ffffff",
      weight: 2,
      fillColor: "#ff5a45",
      fillOpacity: 0.9,
    }).bindTooltip(`${location.label}: ${location.visits} pageviews`);

    marker.addTo(markerLayer);
  });
};

const renderVisitorStats = (stats) => {
  const countries = Object.values(stats.countries || {})
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 10);
  const locations = getLocations(stats, countries);

  if (visitorTotal) {
    visitorTotal.textContent = Number(stats.totalVisits || 0).toLocaleString();
  }

  if (visitorSince) {
    visitorSince.textContent = formatDate(stats.startedAt || stats.updatedAt);
  }

  if (visitorList) {
    visitorList.innerHTML = countries.length
      ? countries.map((country) => `
          <div class="visitor-country">
            <strong>${getCountryName(country.code, country.name)}</strong>
            <span>${country.visits.toLocaleString()}</span>
          </div>
        `).join("")
      : '<p class="muted">No visits recorded yet.</p>';
  }

  renderMapPoints(locations);
};

const loadVisitorStats = async () => {
  if (!visitorTotal && !visitorList && !visitorMapElement) return;

  try {
    initVisitorMap();
    const response = await fetch("/api/visitor-stats", { method: "POST" });

    if (!response.ok) throw new Error("Visitor stats unavailable");

    renderVisitorStats(await response.json());
  } catch {
    if (visitorList) {
      visitorList.innerHTML = '<p class="muted">Visitor map is available after the Netlify function deploys.</p>';
    }
  }
};

loadVisitorStats();
