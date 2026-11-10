import { createServerFn } from "@tanstack/react-start";

export const listCountiesFn = createServerFn({ method: "GET" })
  .inputValidator((input: { state: string }) => ({ state: String(input?.state ?? "") }))
  .handler(async ({ data }) => {
    const { listCounties } = await import("./explore.server");
    const { FriendlyError } = await import("./health.server");
    try {
      return { ok: true as const, counties: await listCounties(data.state) };
    } catch (e) {
      console.error(e);
      return {
        ok: false as const,
        error: e instanceof FriendlyError ? e.message : "Couldn't load the county list.",
      };
    }
  });

export const getCountyExploreFn = createServerFn({ method: "POST" })
  .inputValidator((input: { state: string; county: string; measure: string; worseOnly?: boolean }) => ({
    state: String(input?.state ?? ""),
    county: String(input?.county ?? ""),
    measure: String(input?.measure ?? ""),
    worseOnly: Boolean(input?.worseOnly),
  }))
  .handler(async ({ data }) => {
    const { getCountyExplore } = await import("./explore.server");
    const { FriendlyError } = await import("./health.server");
    try {
      return {
        ok: true as const,
        result: await getCountyExplore({
          stateAbbr: data.state,
          countyFips: data.county,
          measureId: data.measure,
          worseOnly: data.worseOnly,
        }),
      };
    } catch (e) {
      console.error(e);
      return {
        ok: false as const,
        error: e instanceof FriendlyError ? e.message : "Couldn't load this area. Please try again shortly.",
      };
    }
  });
