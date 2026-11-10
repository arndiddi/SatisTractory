import { describe, expect, it } from "vitest";
import { compare } from "@/lib/health";

describe("compare", () => {
  it("is similar when state average is inside the confidence interval", () => {
    expect(compare(26.6, 23.9, 29.6, 24.4, "higherWorse")).toBe("similar");
  });
  it("is worse when a higher-is-worse measure is above the state", () => {
    expect(compare(41.7, 37.9, 45.4, 34.7, "higherWorse")).toBe("worse");
  });
  it("is better when a higher-is-worse measure is below the state", () => {
    expect(compare(4.1, 3.6, 4.6, 9.8, "higherWorse")).toBe("better");
  });
  it("is worse when a higher-is-better measure (checkups) is below the state", () => {
    expect(compare(60, 55, 65, 75, "higherBetter")).toBe("worse");
  });
});
