import { MEASURE_DIRECTION, compare } from "./health";
import {
  isClearlyAboveCountyMean,
  quantileBins,
  rankTracts,
  stateByAbbr,
  type TractValue,
} from "./explore";
import { getStateBaseline, FriendlyError } from "./health.server";

const CDC = "https://data.cdc.gov/resource/cwsq-ngmh.json";
const TIGER =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/10/query";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export interface CountyOption {
  fips: string; // 3-digit county FIPS within the state
  name: string;
}

export async function listCounties(stateAbbr: string): Promise<CountyOption[]> {
  if (!stateByAbbr(stateAbbr)) throw new FriendlyError("Unknown state.");
  const url = `${CDC}?$select=countyfips,countyname&stateabbr=${encodeURIComponent(stateAbbr)}&$group=countyfips,countyname&$limit=5000`;
  const res = await fetch(url);
  if (!res.ok) throw new FriendlyError("Couldn't load the county list. Please try again shortly.");
  const rows = (await res.json()) as any[];
  const seen = new Map<string, string>();
  for (const r of rows) {
    const fips = String(r.countyfips ?? "");
    if (fips.length === 5 && r.countyname) seen.set(fips.slice(2), String(r.countyname));
  }
  return [...seen.entries()]
    .map(([fips, name]) => ({ fips, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function getCountyGeometry(stateFips: string, countyFips: string): Promise<any> {
  const db = await admin();
  const { data: cached } = await db
    .from("county_geometry_cache")
    .select("geojson")
    .eq("state_fips", stateFips)
    .eq("county_fips", countyFips)
    .maybeSingle();
  if (cached?.geojson) return cached.geojson;

  const where = `STATE='${stateFips}' AND COUNTY='${countyFips}'`;
  const url =
    `${TIGER}?where=${encodeURIComponent(where)}&outFields=GEOID,NAME` +
    `&returnGeometry=true&outSR=4326&f=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new FriendlyError("Couldn't load the tract boundaries. Please try again shortly.");
  const geojson = await res.json();
  if (!geojson?.features?.length) throw new FriendlyError("No tract boundaries found for this county.");
  await db.from("county_geometry_cache").upsert({ state_fips: stateFips, county_fips: countyFips, geojson });
  return geojson;
}

export interface ExploreResult {
  measureId: string;
  direction: "higherWorse" | "higherBetter";
  countyName: string;
  stateAbbr: string;
  countyMean: number;
  edges: number[];
  tracts: TractValue[];
  clearlyAbove: Record<string, boolean>;
  top10: TractValue[];
  geojson: any;
}

export async function getCountyExplore(input: {
  stateAbbr: string;
  countyFips: string;
  measureId: string;
  worseOnly: boolean;
}): Promise<ExploreResult> {
  const state = stateByAbbr(input.stateAbbr);
  if (!state) throw new FriendlyError("Unknown state.");
  if (!/^\d{3}$/.test(input.countyFips)) throw new FriendlyError("Unknown county.");
  const direction = MEASURE_DIRECTION[input.measureId];
  if (!direction) throw new FriendlyError("Unknown measure.");

  const countyFips5 = `${state.fips}${input.countyFips}`;
  const url =
    `${CDC}?countyfips=${countyFips5}&measureid=${encodeURIComponent(input.measureId)}` +
    `&datavaluetypeid=CrdPrv&$limit=5000`;
  const res = await fetch(url);
  if (!res.ok) throw new FriendlyError("CDC health data is unavailable right now. Please try again shortly.");
  const rows = (await res.json()) as any[];
  if (!rows.length) throw new FriendlyError("CDC PLACES has no estimates for this county and measure.");

  let tracts: TractValue[] = rows
    .filter((r) => r.data_value != null)
    .map((r) => ({
      geoid: String(r.locationname),
      name: String(r.locationname), // replaced by tract NAME from the boundary data on the client
      value: Number(r.data_value),
      low: Number(r.low_confidence_limit ?? r.data_value),
      high: Number(r.high_confidence_limit ?? r.data_value),
      population: r.totalpopulation ? Number(String(r.totalpopulation).replace(/,/g, "")) : null,
    }));

  if (input.worseOnly) {
    const baseline = await getStateBaseline(state.abbr);
    const stateAvg = baseline[input.measureId];
    if (stateAvg != null) {
      tracts = tracts.filter((t) => compare(t.value, t.low, t.high, stateAvg, direction) === "worse");
    }
  }

  const geojson = await getCountyGeometry(state.fips, input.countyFips);
  const nameByGeoid = new Map<string, string>(
    geojson.features.map((f: any) => [
      String(f.properties?.GEOID),
      String(f.properties?.NAME ?? "").replace(/^Census Tract /i, ""),
    ]),
  );
  for (const t of tracts) {
    const n = nameByGeoid.get(t.geoid);
    if (n) t.name = n;
  }

  const values = tracts.map((t) => t.value);
  const countyMean = values.reduce((a, b) => a + b, 0) / values.length;
  const clearlyAbove: Record<string, boolean> = {};
  for (const t of tracts) clearlyAbove[t.geoid] = isClearlyAboveCountyMean(t.low, countyMean);

  return {
    measureId: input.measureId,
    direction,
    countyName: String(rows[0].countyname ?? ""),
    stateAbbr: state.abbr,
    countyMean: Math.round(countyMean * 10) / 10,
    edges: quantileBins(values, 5).map((e) => Math.round(e * 10) / 10),
    tracts,
    clearlyAbove,
    top10: rankTracts(tracts, direction, 10),
    geojson,
  };
}
