CREATE TABLE public.state_baselines (
  state text PRIMARY KEY,
  averages jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.state_baselines TO service_role;
ALTER TABLE public.state_baselines ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.tract_summaries (
  geoid text PRIMARY KEY,
  summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.tract_summaries TO service_role;
ALTER TABLE public.tract_summaries ENABLE ROW LEVEL SECURITY;