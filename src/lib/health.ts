export type Direction = "higherWorse" | "higherBetter";

export interface MeasureDef {
  id: string;
  label: string;
  direction: Direction;
}

export const SECTIONS: { key: string; title: string; blurb: string; measures: MeasureDef[] }[] = [
  {
    key: "mental",
    title: "Mental health & social connection",
    blurb: "How adults report feeling, sleeping, and staying connected.",
    measures: [
      { id: "DEPRESSION", label: "Depression", direction: "higherWorse" },
      { id: "MHLTH", label: "Frequent mental distress", direction: "higherWorse" },
      { id: "LONELINESS", label: "Loneliness", direction: "higherWorse" },
      { id: "EMOTIONSPT", label: "Lack of social & emotional support", direction: "higherWorse" },
      { id: "SLEEP", label: "Short sleep (<7 hours)", direction: "higherWorse" },
    ],
  },
  {
    key: "chronic",
    title: "Chronic disease",
    blurb: "Long-term conditions among adults.",
    measures: [
      { id: "DIABETES", label: "Diabetes", direction: "higherWorse" },
      { id: "OBESITY", label: "Obesity", direction: "higherWorse" },
      { id: "BPHIGH", label: "High blood pressure", direction: "higherWorse" },
      { id: "CASTHMA", label: "Current asthma", direction: "higherWorse" },
      { id: "COPD", label: "COPD", direction: "higherWorse" },
      { id: "CHD", label: "Coronary heart disease", direction: "higherWorse" },
    ],
  },
  {
    key: "social",
    title: "Social needs",
    blurb: "Everyday necessities: food, housing, transportation, utilities.",
    measures: [
      { id: "FOODINSECU", label: "Food insecurity", direction: "higherWorse" },
      { id: "HOUSINSECU", label: "Housing insecurity", direction: "higherWorse" },
      { id: "LACKTRPT", label: "Lack of reliable transportation", direction: "higherWorse" },
      { id: "SHUTUTILITY", label: "Utility shut-off threat", direction: "higherWorse" },
      { id: "FOODSTAMP", label: "Received SNAP benefits", direction: "higherWorse" },
    ],
  },
  {
    key: "access",
    title: "Access to care",
    blurb: "Insurance coverage and routine preventive visits.",
    measures: [
      { id: "ACCESS2", label: "No health insurance (18–64)", direction: "higherWorse" },
      { id: "CHECKUP", label: "Routine checkup in past year", direction: "higherBetter" },
      { id: "DENTAL", label: "Dental visit in past year", direction: "higherBetter" },
    ],
  },
];

export const ALL_MEASURES = SECTIONS.flatMap((s) => s.measures);

/**
 * Direction config: which way is "vulnerable" for each measure.
 * CHECKUP, DENTAL and COLON_SCREEN are preventive care — higher is better.
 * Everything else (including ACCESS2 = lack of insurance and EMOTIONSPT = lack
 * of support) is a burden — higher is worse.
 */
export const MEASURE_DIRECTION: Record<string, Direction> = Object.fromEntries([
  ...ALL_MEASURES.map((m) => [m.id, m.direction] as const),
  ["COLON_SCREEN", "higherBetter"] as const,
]);

export type Comparison = "worse" | "similar" | "better";

/** "Similar" when the state average falls inside the tract's confidence interval. */
export function compare(
  value: number,
  low: number,
  high: number,
  stateAvg: number,
  direction: Direction,
): Comparison {
  if (stateAvg >= low && stateAvg <= high) return "similar";
  const higher = value > stateAvg;
  if (direction === "higherWorse") return higher ? "worse" : "better";
  return higher ? "better" : "worse";
}

export interface MeasureResult {
  id: string;
  label: string;
  section: string;
  value: number;
  low: number;
  high: number;
  stateAvg: number | null;
  comparison: Comparison | null;
}

export interface Report {
  matchedAddress: string;
  geoid: string;
  tract: string;
  county: string;
  state: string;
  population: number | null;
  lat: number;
  lon: number;
  measures: MeasureResult[];
}
