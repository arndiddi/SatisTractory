import { createServerFn } from "@tanstack/react-start";

export const getNearby = createServerFn({ method: "POST" })
  .inputValidator((input: { geoid: string; lat: number; lon: number; radiusKm: number }) => ({
    geoid: String(input?.geoid ?? ""),
    lat: Number(input?.lat),
    lon: Number(input?.lon),
    radiusKm: Number(input?.radiusKm),
  }))
  .handler(async ({ data }) => {
    const { getNearbyPlaces, NearbyError } = await import("./nearby.server");
    try {
      return { ok: true as const, nearby: await getNearbyPlaces(data.geoid, data.lat, data.lon, data.radiusKm) };
    } catch (e) {
      console.error(e);
      return {
        ok: false as const,
        error: e instanceof NearbyError ? e.message : "The nearby search isn't available right now.",
      };
    }
  });
