import { describe, expect, it } from "vitest";
import { MEASURE_DIRECTION } from "@/lib/health";
import { binIndex, isClearlyAboveCountyMean, quantileBins, rankTracts, type TractValue } from "@/lib/explore";

describe("measure direction config", () => {
  it("treats preventive care as higher-is-better", () => {
    expect(MEASURE_DIRECTION["CHECKUP"]).toBe("higherBetter");
    expect(MEASURE_DIRECTION["DENTAL"]).toBe("higherBetter");
    expect(MEASURE_DIRECTION["COLON_SCREEN"]).toBe("higherBetter");
  });

  it("treats burdens, including lack of insurance and lack of support, as higher-is-worse", () => {
    expect(MEASURE_DIRECTION["ACCESS2"]).toBe("higherWorse");
    expect(MEASURE_DIRECTION["EMOTIONSPT"]).toBe("higherWorse");
    expect(MEASURE_DIRECTION["DEPRESSION"]).toBe("higherWorse");
  });
});

describe("quantile bins", () => {
  it("splits values into 5 bins with 6 edges from min to max", () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const edges = quantileBins(values, 5);
    expect(edges).toHaveLength(6);
    expect(edges[0]).toBe(10);
    expect(edges[5]).toBe(100);
    for (let i = 1; i < edges.length; i++) expect(edges[i]!).toBeGreaterThanOrEqual(edges[i - 1]!);
  });

  it("assigns values to the correct bin", () => {
    const edges = [0, 20, 40, 60, 80, 100];
    expect(binIndex(10, edges)).toBe(0);
    // A value exactly on an edge falls in the lower bin.
    expect(binIndex(20, edges)).toBe(0);
    expect(binIndex(21, edges)).toBe(1);
    expect(binIndex(99, edges)).toBe(4);
    expect(binIndex(100, edges)).toBe(4);
  });
});

describe("clearly above county average", () => {
  it("requires the whole confidence interval to sit above the county mean", () => {
    expect(isClearlyAboveCountyMean(25.1, 25)).toBe(true);
    expect(isClearlyAboveCountyMean(24.9, 25)).toBe(false);
    expect(isClearlyAboveCountyMean(25, 25)).toBe(false);
  });
});

describe("rankTracts", () => {
  const tracts: TractValue[] = [
    { geoid: "a", name: "1", value: 30, low: 25, high: 35, population: 1000 },
    { geoid: "b", name: "2", value: 10, low: 5, high: 15, population: 2000 },
    { geoid: "c", name: "3", value: 20, low: 15, high: 25, population: 3000 },
  ];

  it("ranks highest first for higher-is-worse measures", () => {
    expect(rankTracts(tracts, "higherWorse").map((t) => t.geoid)).toEqual(["a", "c", "b"]);
  });

  it("ranks lowest first for higher-is-better measures", () => {
    expect(rankTracts(tracts, "higherBetter").map((t) => t.geoid)).toEqual(["b", "c", "a"]);
  });

  it("limits the list to 10", () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ ...tracts[0]!, geoid: `g${i}`, value: i }));
    expect(rankTracts(many, "higherWorse")).toHaveLength(10);
  });
});
