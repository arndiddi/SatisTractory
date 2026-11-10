import type { Direction } from "./health";

export interface TractValue {
  geoid: string;
  name: string;
  value: number;
  low: number;
  high: number;
  population: number | null;
}

/** 5-bin choropleth ramp (light → dark teal), as hex for the Google Maps Data layer. */
export const CHOROPLETH_COLORS = ["#e3f2f1", "#b8dcd9", "#83c2bd", "#4ba39c", "#2b7a75"];

/** Evenly spaced quantile edges: returns binCount + 1 edges over the sorted values. */
export function quantileBins(values: number[], binCount = 5): number[] {
  if (!values.length) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const edges: number[] = [];
  for (let i = 0; i <= binCount; i++) {
    const pos = (i / binCount) * (sorted.length - 1);
    const lo = sorted[Math.floor(pos)]!;
    const hi = sorted[Math.ceil(pos)]!;
    edges.push(lo + (hi - lo) * (pos - Math.floor(pos)));
  }
  return edges;
}

/** Which bin a value falls into (0-based), given edges from quantileBins. */
export function binIndex(value: number, edges: number[]): number {
  if (edges.length < 2) return 0;
  for (let i = 1; i < edges.length; i++) {
    if (value <= edges[i]!) return i - 1;
  }
  return edges.length - 2;
}

/** "Clearly above county average" only when the whole confidence interval sits above the mean. */
export function isClearlyAboveCountyMean(low: number, mean: number): boolean {
  return low > mean;
}

/** Rank tracts for the selected direction: most vulnerable or best-performing first. */
export function rankTracts(tracts: TractValue[], direction: Direction, limit = 10): TractValue[] {
  const sorted = [...tracts].sort((a, b) => (direction === "higherWorse" ? b.value - a.value : a.value - b.value));
  return sorted.slice(0, limit);
}

/** Average of the exterior ring of the largest polygon in a GeoJSON feature. */
export function centroidOf(feature: any): { lat: number; lon: number } | null {
  const geom = feature?.geometry;
  if (!geom) return null;
  const polys: number[][][] =
    geom.type === "Polygon" ? [geom.coordinates] : geom.type === "MultiPolygon" ? geom.coordinates : [];
  let best: { lat: number; lon: number } | null = null;
  let bestLen = 0;
  for (const poly of polys) {
    const ring = poly[0] as number[][] | undefined;
    if (!ring?.length || ring.length < bestLen) continue;
    let sx = 0;
    let sy = 0;
    for (const coord of ring) {
      sx += coord[0]!;
      sy += coord[1]!;
    }
    bestLen = ring.length;
    best = { lat: sy / ring.length, lon: sx / ring.length };
  }
  return best;
}

export interface StateInfo {
  abbr: string;
  name: string;
  fips: string;
}

export const US_STATES: StateInfo[] = [
  { abbr: "AL", name: "Alabama", fips: "01" }, { abbr: "AK", name: "Alaska", fips: "02" },
  { abbr: "AZ", name: "Arizona", fips: "04" }, { abbr: "AR", name: "Arkansas", fips: "05" },
  { abbr: "CA", name: "California", fips: "06" }, { abbr: "CO", name: "Colorado", fips: "08" },
  { abbr: "CT", name: "Connecticut", fips: "09" }, { abbr: "DE", name: "Delaware", fips: "10" },
  { abbr: "DC", name: "District of Columbia", fips: "11" }, { abbr: "FL", name: "Florida", fips: "12" },
  { abbr: "GA", name: "Georgia", fips: "13" }, { abbr: "HI", name: "Hawaii", fips: "15" },
  { abbr: "ID", name: "Idaho", fips: "16" }, { abbr: "IL", name: "Illinois", fips: "17" },
  { abbr: "IN", name: "Indiana", fips: "18" }, { abbr: "IA", name: "Iowa", fips: "19" },
  { abbr: "KS", name: "Kansas", fips: "20" }, { abbr: "KY", name: "Kentucky", fips: "21" },
  { abbr: "LA", name: "Louisiana", fips: "22" }, { abbr: "ME", name: "Maine", fips: "23" },
  { abbr: "MD", name: "Maryland", fips: "24" }, { abbr: "MA", name: "Massachusetts", fips: "25" },
  { abbr: "MI", name: "Michigan", fips: "26" }, { abbr: "MN", name: "Minnesota", fips: "27" },
  { abbr: "MS", name: "Mississippi", fips: "28" }, { abbr: "MO", name: "Missouri", fips: "29" },
  { abbr: "MT", name: "Montana", fips: "30" }, { abbr: "NE", name: "Nebraska", fips: "31" },
  { abbr: "NV", name: "Nevada", fips: "32" }, { abbr: "NH", name: "New Hampshire", fips: "33" },
  { abbr: "NJ", name: "New Jersey", fips: "34" }, { abbr: "NM", name: "New Mexico", fips: "35" },
  { abbr: "NY", name: "New York", fips: "36" }, { abbr: "NC", name: "North Carolina", fips: "37" },
  { abbr: "ND", name: "North Dakota", fips: "38" }, { abbr: "OH", name: "Ohio", fips: "39" },
  { abbr: "OK", name: "Oklahoma", fips: "40" }, { abbr: "OR", name: "Oregon", fips: "41" },
  { abbr: "PA", name: "Pennsylvania", fips: "42" }, { abbr: "RI", name: "Rhode Island", fips: "44" },
  { abbr: "SC", name: "South Carolina", fips: "45" }, { abbr: "SD", name: "South Dakota", fips: "46" },
  { abbr: "TN", name: "Tennessee", fips: "47" }, { abbr: "TX", name: "Texas", fips: "48" },
  { abbr: "UT", name: "Utah", fips: "49" }, { abbr: "VT", name: "Vermont", fips: "50" },
  { abbr: "VA", name: "Virginia", fips: "51" }, { abbr: "WA", name: "Washington", fips: "53" },
  { abbr: "WV", name: "West Virginia", fips: "54" }, { abbr: "WI", name: "Wisconsin", fips: "55" },
  { abbr: "WY", name: "Wyoming", fips: "56" },
];

export function stateByAbbr(abbr: string): StateInfo | undefined {
  return US_STATES.find((s) => s.abbr === abbr);
}
