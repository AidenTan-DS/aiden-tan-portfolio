import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";

type CountryStats = {
  code: string;
  name: string;
  visits: number;
  lastSeen: string;
};

type VisitorStats = {
  totalVisits: number;
  countries: Record<string, CountryStats>;
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

const readStats = async () => {
  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  const stored = await store.get(STATS_KEY, { type: "json" });

  if (!stored || typeof stored !== "object") {
    return { store, stats: emptyStats() };
  }

  return { store, stats: stored as VisitorStats };
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
  const current = stats.countries[code] ?? {
    code,
    name,
    visits: 0,
    lastSeen: now,
  };

  stats.totalVisits += 1;
  stats.updatedAt = now;
  stats.countries[code] = {
    ...current,
    name,
    visits: current.visits + 1,
    lastSeen: now,
  };

  await store.setJSON(STATS_KEY, stats);

  return Response.json(stats, { headers: jsonHeaders });
};

export const config: Config = {
  path: "/api/visitor-stats",
  method: ["GET", "POST"],
};
