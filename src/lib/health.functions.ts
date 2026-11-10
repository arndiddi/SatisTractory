import { createServerFn } from "@tanstack/react-start";

export const lookupAddress = createServerFn({ method: "POST" })
  .inputValidator((input: { address: string }) => {
    const address = String(input?.address ?? "").trim().slice(0, 300);
    if (address.length < 5) throw new Error("Please enter a full U.S. address.");
    return { address };
  })
  .handler(async ({ data }) => {
    const { buildReport, FriendlyError } = await import("./health.server");
    try {
      return { ok: true as const, report: await buildReport(data.address) };
    } catch (e) {
      console.error(e);
      return {
        ok: false as const,
        error: e instanceof FriendlyError ? e.message : "Something went wrong while loading this neighborhood.",
      };
    }
  });

export const lookupTract = createServerFn({ method: "POST" })
  .inputValidator((input: { geoid: string }) => ({ geoid: String(input?.geoid ?? "") }))
  .handler(async ({ data }) => {
    const { buildTractReport, FriendlyError } = await import("./health.server");
    try {
      return { ok: true as const, report: await buildTractReport(data.geoid) };
    } catch (e) {
      console.error(e);
      return {
        ok: false as const,
        error: e instanceof FriendlyError ? e.message : "Something went wrong while loading this neighborhood.",
      };
    }
  });

export const getSummary = createServerFn({ method: "POST" })
  .inputValidator((input: { geoid: string }) => ({ geoid: String(input?.geoid ?? "") }))
  .handler(async ({ data }) => {
    const { getOrCreateSummary, FriendlyError } = await import("./health.server");
    try {
      return { ok: true as const, summary: await getOrCreateSummary(data.geoid) };
    } catch (e) {
      console.error(e);
      return {
        ok: false as const,
        error: e instanceof FriendlyError ? e.message : "The plain-language summary isn't available right now.",
      };
    }
  });
