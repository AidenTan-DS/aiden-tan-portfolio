import { getStore } from "@netlify/blobs";

type Config = {
  path: string;
  method: string[];
};

type Context = {
  geo?: {
    city?: string;
    country?: {
      code?: string;
      name?: string;
    };
    latitude?: number | string;
    longitude?: number | string;
    subdivision?: {
      name?: string;
    };
  };
};

type CountryStats = {
  code: string;
  name: string;
  visits: number;
  lastSeen: string;
};

type LocationStats = {
  id: string;
  label: string;
  countryCode: string;
  countryName: string;
  latitude: number;
  longitude: number;
  visits: number;
  lastSeen: string;
};

type VisitorStats = {
  totalVisits: number;
  countries: Record<string, CountryStats>;
  locations: Record<string, LocationStats>;
  startedAt: string | null;
  updatedAt: string | null;
};

const STORE_NAME = "visitor-stats";
const STATS_KEY = "country-counts";

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const emptyStats = (): VisitorStats => ({
  totalVisits: 0,
  countries: {},
  locations: {},
  startedAt: null,
  updatedAt: null,
});

const countryName = (code: string, fallback?: string) => {
  if (fallback) return fallback;

  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
};

const normalizeCode = (code?: string | null) => {
  const normalized = code?.trim().toUpperCase();
  return normalized && /^[A-Z]{2}$/.test(normalized) ? normalized : "ZZ";
};

const numberOrNull = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const locationKey = (
  code: string,
  city?: string | null,
  subdivision?: string | null,
  latitude?: number | null,
  longitude?: number | null,
) => {
  const namePart = [city, subdivision, code]
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const coordinatePart =
    latitude !== null && longitude !== null
      ? `${latitude.toFixed(2)},${longitude.toFixed(2)}`
      : "unknown";

  return `${namePart || code.toLowerCase()}-${coordinatePart}`;
};

const normalizeStats = (stored: unknown): VisitorStats => {
  if (!stored || typeof stored !== "object") return emptyStats();

  const stats = stored as Partial<VisitorStats>;

  return {
    totalVisits: Number(stats.totalVisits) || 0,
    countries: stats.countries ?? {},
    locations: stats.locations ?? {},
    startedAt: stats.startedAt ?? stats.updatedAt ?? null,
    updatedAt: stats.updatedAt ?? null,
  };
};

const readStats = async () => {
  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  const stored = await store.get(STATS_KEY, { type: "json" });

  return { store, stats: normalizeStats(stored) };
};

export default async (_req: Request, context: Context) => {
  const { store, stats } = await readStats();

  if (_req.method === "GET") {
    return Response.json(stats, { headers: jsonHeaders });
  }

  if (_req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, POST" },
    });
  }

  const now = new Date().toISOString();
  const code = normalizeCode(context.geo?.country?.code);
  const name = countryName(code, context.geo?.country?.name);
  const latitude = numberOrNull(context.geo?.latitude);
  const longitude = numberOrNull(context.geo?.longitude);
  const city = context.geo?.city ?? null;
  const subdivision = context.geo?.subdivision?.name ?? null;
  const hasCoordinates = latitude !== null && longitude !== null;
  const locationId = locationKey(code, city, subdivision, latitude, longitude);
  const locationLabel = [city, subdivision, name].filter(Boolean).join(", ") || name;
  const current = stats.countries[code] ?? {
    code,
    name,
    visits: 0,
    lastSeen: now,
  };
  const currentLocation = stats.locations[locationId] ?? {
    id: locationId,
    label: locationLabel,
    countryCode: code,
    countryName: name,
    latitude: latitude ?? 0,
    longitude: longitude ?? 0,
    visits: 0,
    lastSeen: now,
  };

  stats.totalVisits += 1;
  stats.startedAt = stats.startedAt ?? now;
  stats.updatedAt = now;
  stats.countries[code] = {
    ...current,
    name,
    visits: current.visits + 1,
    lastSeen: now,
  };

  if (hasCoordinates) {
    stats.locations[locationId] = {
      ...currentLocation,
      label: locationLabel,
      countryCode: code,
      countryName: name,
      latitude,
      longitude,
      visits: currentLocation.visits + 1,
      lastSeen: now,
    };
  }

  await store.setJSON(STATS_KEY, stats);

  return Response.json(stats, { headers: jsonHeaders });
};

export const config: Config = {
  path: "/api/visitor-stats",
  method: ["GET", "POST"],
};
