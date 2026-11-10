import { ALL_MEASURES, SECTIONS, compare, type MeasureResult, type Report } from "./health";

const CDC = "https://data.cdc.gov/resource/cwsq-ngmh.json";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export class FriendlyError extends Error {}

export async function geocode(address: string) {
  const url =
    "https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=" +
    encodeURIComponent(address) +
    "&benchmark=Public_AR_Current&vintage=Current_Current&layers=Census%20Tracts&format=json";
  const res = await fetch(url);
  if (!res.ok) throw new FriendlyError("The address lookup service is unavailable right now. Please try again shortly.");
  const json: any = await res.json();
  const match = json?.result?.addressMatches?.[0];
  const tract = match?.geographies?.["Census Tracts"]?.[0];
  if (!match || !tract?.GEOID) {
    throw new FriendlyError("We couldn't find that address. Try including the street number, city, and state.");
  }
  return {
    matchedAddress: String(match.matchedAddress),
    geoid: String(tract.GEOID),
    tractName: String(tract.BASENAME ?? String(tract.NAME ?? tract.GEOID).replace(/^Census Tract /i, "")),
    lon: Number(match.coordinates.x),
    lat: Number(match.coordinates.y),
  };
}

async function fetchTract(geoid: string) {
  const url = `${CDC}?locationname=${geoid}&datavaluetypeid=CrdPrv&$limit=100`;
  const res = await fetch(url);
  if (!res.ok) throw new FriendlyError("CDC health data is unavailable right now. Please try again shortly.");
  return (await res.json()) as any[];
}

export async function getStateBaseline(state: string): Promise<Record<string, number>> {
  const db = await admin();
  const { data: cached } = await db.from("state_baselines").select("averages").eq("state", state).maybeSingle();
  if (cached?.averages) return cached.averages as Record<string, number>;
  const url = `${CDC}?$select=measureid,avg(data_value)&stateabbr=${encodeURIComponent(state)}&datavaluetypeid=CrdPrv&$group=measureid&$limit=200`;
  const res = await fetch(url);
  if (!res.ok) throw new FriendlyError("Couldn't load the state comparison data. Please try again shortly.");
  const rows = (await res.json()) as any[];
  const averages: Record<string, number> = {};
  for (const r of rows) {
    const v = Number(r.avg_data_value);
    if (r.measureid && Number.isFinite(v)) averages[r.measureid] = Math.round(v * 10) / 10;
  }
  if (Object.keys(averages).length) {
    await db.from("state_baselines").upsert({ state, averages });
  }
  return averages;
}

export async function buildTractData(geoid: string) {
  const rows = await fetchTract(geoid);
  if (!rows.length) {
    throw new FriendlyError("CDC PLACES has no estimates for this census tract (it may have very few residents).");
  }
  const first = rows[0];
  const state = String(first.stateabbr);
  const baseline = await getStateBaseline(state);
  const sectionOf = new Map(SECTIONS.flatMap((s) => s.measures.map((m) => [m.id, s.key] as const)));
  const measures: MeasureResult[] = [];
  for (const def of ALL_MEASURES) {
    const row = rows.find((r) => r.measureid === def.id);
    if (!row || row.data_value == null) continue;
    const value = Number(row.data_value);
    const low = Number(row.low_confidence_limit ?? value);
    const high = Number(row.high_confidence_limit ?? value);
    const stateAvg = baseline[def.id] ?? null;
    measures.push({
      id: def.id,
      label: def.label,
      section: sectionOf.get(def.id)!,
      value,
      low,
      high,
      stateAvg,
      comparison: stateAvg == null ? null : compare(value, low, high, stateAvg, def.direction),
    });
  }
  return {
    state,
    county: String(first.countyname ?? ""),
    population: first.totalpopulation ? Number(String(first.totalpopulation).replace(/,/g, "")) : null,
    measures,
  };
}

export async function buildReport(address: string): Promise<Report> {
  const g = await geocode(address);
  const t = await buildTractData(g.geoid);
  return {
    matchedAddress: g.matchedAddress,
    geoid: g.geoid,
    tract: g.tractName,
    county: t.county,
    state: t.state,
    population: t.population,
    lat: g.lat,
    lon: g.lon,
    measures: t.measures,
  };
}

/** Build a report directly from a census tract ID (used by the Explore an Area map). */
export async function buildTractReport(geoid: string): Promise<Report> {
  if (!/^\d{11}$/.test(geoid)) throw new FriendlyError("Invalid tract ID.");
  const where = `GEOID='${geoid}'`;
  const url =
    "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/10/query?where=" +
    encodeURIComponent(where) +
    "&outFields=GEOID,NAME&returnGeometry=true&outSR=4326&f=geojson";
  const res = await fetch(url);
  if (!res.ok) throw new FriendlyError("Couldn't load this census tract. Please try again shortly.");
  const geojson = await res.json();
  const feature = geojson?.features?.[0];
  if (!feature) throw new FriendlyError("We couldn't find that census tract.");
  const { centroidOf } = await import("./explore");
  const centroid = centroidOf(feature);
  if (!centroid) throw new FriendlyError("We couldn't locate this census tract on the map.");
  const tractName = String(feature.properties?.NAME ?? geoid);
  const t = await buildTractData(geoid);
  return {
    matchedAddress: `Census tract ${tractName}, ${t.county} County, ${t.state}`,
    geoid,
    tract: tractName,
    county: t.county,
    state: t.state,
    population: t.population,
    lat: centroid.lat,
    lon: centroid.lon,
    measures: t.measures,
  };
}

const INSTRUCTIONS = `You write plain-language neighborhood health summaries for community organizers (not clinicians).
Write 4–6 sentences as a single paragraph. Name the two or three largest gaps versus the state average, using the numbers given.
Stay neutral and non-stigmatizing: describe the neighborhood, never judge its residents. Do not give medical advice. Do not make causal claims or speculate about reasons.
Mention briefly that these are modeled estimates. Use only the numbers provided; do not invent any data.`;

export async function getOrCreateSummary(geoid: string): Promise<string> {
  if (!/^\d{11}$/.test(geoid)) throw new FriendlyError("Invalid tract ID.");
  const db = await admin();
  const { data: cached } = await db.from("tract_summaries").select("summary").eq("geoid", geoid).maybeSingle();
  if (cached?.summary) return cached.summary;
  const t = await buildTractData(geoid);
  const lines = t.measures
    .filter((m) => m.stateAvg != null)
    .map(
      (m) =>
        `- ${m.label}: tract ${m.value}% (range ${m.low}–${m.high}%), state average ${m.stateAvg}% → ${m.comparison}`,
    );
  const prompt = `Census tract ${geoid}, ${t.county} County, ${t.state}. Population ${t.population ?? "unknown"}.\nAdult prevalence estimates:\n${lines.join("\n")}`;
  const { generateSummary } = await import("./ai/summary.server");
  const summary = await generateSummary(prompt, INSTRUCTIONS);
  await db.from("tract_summaries").upsert({ geoid, summary });
  return summary;
}
