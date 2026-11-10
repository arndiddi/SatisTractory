CREATE TABLE public.nearby_cache (
  geoid TEXT NOT NULL,
  radius_km INT NOT NULL,
  category TEXT NOT NULL,
  results JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (geoid, radius_km, category)
);
GRANT ALL ON public.nearby_cache TO service_role;
ALTER TABLE public.nearby_cache ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.county_geometry_cache (
  state_fips TEXT NOT NULL,
  county_fips TEXT NOT NULL,
  geojson JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (state_fips, county_fips)
);
GRANT ALL ON public.county_geometry_cache TO service_role;
ALTER TABLE public.county_geometry_cache ENABLE ROW LEVEL SECURITY;