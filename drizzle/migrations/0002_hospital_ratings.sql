CREATE TABLE public.hospital_ratings (
  facility_id TEXT PRIMARY KEY,
  facility_name TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  hospital_type TEXT,
  emergency_services TEXT,
  overall_rating TEXT,
  safety_better INT NOT NULL DEFAULT 0,
  safety_worse INT NOT NULL DEFAULT 0,
  mortality_better INT NOT NULL DEFAULT 0,
  mortality_worse INT NOT NULL DEFAULT 0,
  readmission_better INT NOT NULL DEFAULT 0,
  readmission_worse INT NOT NULL DEFAULT 0
);
CREATE INDEX hospital_ratings_zip_idx ON public.hospital_ratings (zip_code);
GRANT ALL ON public.hospital_ratings TO service_role;
ALTER TABLE public.hospital_ratings ENABLE ROW LEVEL SECURITY;