const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";
const CACHE_DAYS = 7;
export const RADIUS_OPTIONS = [1, 3, 5] as const;

export class NearbyError extends Error {}

export const CATEGORIES = [
  { key: "hospital", label: "Hospitals", type: "hospital" },
  { key: "doctor", label: "Clinics & doctors", type: "doctor" },
  { key: "pharmacy", label: "Pharmacies", type: "pharmacy" },
  { key: "school", label: "Schools", type: "school" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

export interface CmsInfo {
  rating: number | null; // 1–5, null when "Not Available"
  hospitalType: string | null;
  emergencyServices: boolean | null;
  safety: { better: number; worse: number };
  mortality: { better: number; worse: number };
  readmission: { better: number; worse: number };
}

export interface NearbyPlace {
  name: string;
  address: string;
  lat: number;
  lng: number;
  googleRating: number | null;
  distanceKm: number;
  cms: CmsInfo | null; // only hospitals; null = not rated by CMS
}

export interface NearbyResult {
  radiusKm: number;
  places: Record<CategoryKey, NearbyPlace[]>;
  summary: {
    nearestEdHospital: { name: string; distanceKm: number } | null;
    clinicCount: number;
    schoolCount: number;
  };
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

async function searchNearby(lat: number, lon: number, radiusKm: number, type: string): Promise<NearbyPlace[]> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !connectionKey) throw new NearbyError("The places search isn't configured yet.");

  const res = await fetch(`${GATEWAY}/places/v1/places:searchNearby`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
      "Content-Type": "application/json",
      "X-Goog-FieldMask": "places.displayName,places.location,places.formattedAddress,places.types,places.rating",
    },
    body: JSON.stringify({
      includedTypes: [type],
      maxResultCount: 20,
      locationRestriction: {
        circle: { center: { latitude: lat, longitude: lon }, radius: radiusKm * 1000 },
      },
    }),
  });
  if (res.status === 403) {
    const details: Array<{ reason?: string }> = (await res.json().catch(() => null))?.error?.details ?? [];
    const reason = details.find((d) => d.reason)?.reason;
    if (reason === "API_KEY_HTTP_REFERRER_BLOCKED" || reason === "API_KEY_SERVICE_BLOCKED") {
      throw new NearbyError("The Google Maps server key is restricted. Its restrictions need updating in Google Cloud Console.");
    }
    throw new NearbyError("The places search was denied (403). Check the Google Maps key restrictions.");
  }
  if (!res.ok) {
    const body = await res.text();
    console.error(`Places search failed [${res.status}]: ${body}`);
    throw new NearbyError("The places search is unavailable right now. Please try again shortly.");
  }
  const json: any = await res.json();
  return ((json?.places ?? []) as any[]).map((p) => ({
    name: String(p.displayName?.text ?? "Unknown"),
    address: String(p.formattedAddress ?? ""),
    lat: Number(p.location?.latitude),
    lng: Number(p.location?.longitude),
    googleRating: typeof p.rating === "number" ? p.rating : null,
    distanceKm: Math.round(haversineKm(lat, lon, Number(p.location?.latitude), Number(p.location?.longitude)) * 100) / 100,
    cms: null,
  }));
}

// ---- CMS hospital quality ----

const STOPWORDS = new Set([
  "the", "of", "at", "and", "a", "an", "hospital", "hospitals", "medical", "center", "centre",
  "health", "healthcare", "system", "systems", "inc", "llc", "regional", "memorial", "general",
  "community", "university", "saint", "st",
]);

function nameTokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w));
}

function matchCmsRow(placeName: string, rows: any[]): any | null {
  const pt = new Set(nameTokens(placeName));
  if (!pt.size) return null;
  let best: any = null;
  let bestScore = 0;
  for (const row of rows) {
    const rt = nameTokens(String(row.facility_name ?? ""));
    if (!rt.length) continue;
    const overlap = rt.filter((w) => pt.has(w)).length;
    const score = overlap / rt.length;
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  return bestScore >= 0.5 ? best : null;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function enrichHospitalsWithCms(places: NearbyPlace[]): Promise<void> {
  // CMS ratings come from the hospital_ratings table (a snapshot of the CMS Provider
  // Data API "Hospital overall rating" dataset) — data.cms.gov blocks serverless
  // fetches, so the app reads its own copy instead of calling the API per request.
  const db = await admin();
  const byZip = new Map<string, any[]>();
  for (const p of places) {
    const zip = p.address.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1];
    if (!zip) continue;
    if (!byZip.has(zip)) {
      const { data } = await db.from("hospital_ratings").select("*").eq("zip_code", zip);
      byZip.set(zip, data ?? []);
    }
    const rows = byZip.get(zip)!;
    if (!rows.length) continue;
    const row = matchCmsRow(p.name, rows);
    if (!row) continue;
    const ratingRaw = String(row.overall_rating ?? "");
    const rating = /^\d+$/.test(ratingRaw) ? Number(ratingRaw) : null;
    p.cms = {
      rating,
      hospitalType: row.hospital_type ? String(row.hospital_type) : null,
      emergencyServices:
        row.emergency_services === "Yes" ? true : row.emergency_services === "No" ? false : null,
      safety: { better: num(row.safety_better), worse: num(row.safety_worse) },
      mortality: { better: num(row.mortality_better), worse: num(row.mortality_worse) },
      readmission: { better: num(row.readmission_better), worse: num(row.readmission_worse) },
    };
  }
}

// ---- Public entry point ----

export async function getNearbyPlaces(geoid: string, lat: number, lon: number, radiusKm: number): Promise<NearbyResult> {
  if (!/^\d{11}$/.test(geoid)) throw new NearbyError("Invalid tract ID.");
  if (!RADIUS_OPTIONS.includes(radiusKm as (typeof RADIUS_OPTIONS)[number])) {
    throw new NearbyError("Radius must be 1, 3, or 5 km.");
  }
  const db = await admin();
  const freshSince = new Date(Date.now() - CACHE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const places = {} as Record<CategoryKey, NearbyPlace[]>;
  for (const cat of CATEGORIES) {
    const { data: cached } = await db
      .from("nearby_cache")
      .select("results, fetched_at")
      .eq("geoid", geoid)
      .eq("radius_km", radiusKm)
      .eq("category", cat.key)
      .maybeSingle();
    if (cached?.results && cached.fetched_at >= freshSince) {
      places[cat.key] = cached.results as unknown as NearbyPlace[];
      continue;
    }
    const results = await searchNearby(lat, lon, radiusKm, cat.type);
    if (cat.key === "hospital") await enrichHospitalsWithCms(results);
    places[cat.key] = results;
    await db
      .from("nearby_cache")
      .upsert({ geoid, radius_km: radiusKm, category: cat.key, results: JSON.parse(JSON.stringify(results)), fetched_at: new Date().toISOString() });
  }

  const edHospitals = places.hospital.filter((p) => p.cms?.emergencyServices === true);
  const nearestEd = edHospitals.length ? edHospitals.reduce((a, b) => (a.distanceKm <= b.distanceKm ? a : b)) : null;

  return {
    radiusKm,
    places,
    summary: {
      nearestEdHospital: nearestEd ? { name: nearestEd.name, distanceKm: nearestEd.distanceKm } : null,
      clinicCount: places.doctor.length,
      schoolCount: places.school.length,
    },
  };
}
