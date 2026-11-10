# Roadmap

## What's nearby (report page)
- [x] Link Google Maps connection (managed, no user key needed)
- [x] DB cache tables: nearby places (7-day, per tract+radius+category), county tract geometry
- [x] Server: Places Nearby Search (hospital/doctor/pharmacy/school, 1/3/5 km), CMS hospital ratings by ZIP + fuzzy name match
- [x] UI: radius selector, category toggle chips, Google Map with per-category markers, summary card (nearest ED hospital, clinic count, school count), hospital cards with CMS stars + Google rating labels

## Explore an Area page (/explore)
- [x] Server: county-wide PLACES values, TIGERweb tract GeoJSON (cached), quantile bins, top-10 list, county mean vs CI flags
- [x] UI: metric dropdown (grouped), state/county picker, vulnerable/best toggle, worse-than-state filter, choropleth on Google Data layer + legend, hover tooltip, click → report page, top-10 side panel, uncertainty note

## Finish
- [x] Tests: direction config, quantile binning, "clearly above county average" rule
- [x] Playwright end-to-end check (nearby + explore; Google Map tiles can't render in the sandbox — verify on the preview origin)
- [ ] Commit
