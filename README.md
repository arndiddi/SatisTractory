<div align="center">

<img src="src/assets/satisfactory-logo.png" alt="SatisTractory logo" width="380" />

## Your neighbourhood's health, in plain language.

**🥇 1st place, Lovable Hackathon x Startup Trek (November 2026)**

[Try the live app](https://satistractory.lovable.app/) · [Walkthrough](#a-60-second-walkthrough) · [How we treat uncertainty](#reading-the-numbers-honestly) · [Under the hood](#under-the-hood) · [Team](#the-team)

![React 19](https://img.shields.io/badge/React-19-20232A?logo=react&logoColor=61DAFB)
![TanStack Start](https://img.shields.io/badge/TanStack-Start-FF4154)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)
![Vitest](https://img.shields.io/badge/tests-13_passing-6E9F18?logo=vitest&logoColor=white)
![Built with Lovable](https://img.shields.io/badge/built_with-Lovable-ff5b9a)

</div>

---

> **Two miles. Twenty-three years.**
> Back Bay and Roxbury sit about ten minutes apart by car in Boston. In one Back Bay census tract, life expectancy is **92**. In one Roxbury tract, it's **69** ([Boston Public Health Commission, 2025](https://www.boston.gov/sites/default/files/file/2025/02/Live%20Long%20and%20Well%20Report_Final_Feb2025.pdf)).

That gap isn't mostly about genes or personal choices. It's about place: whether there's a grocery store nearby, whether you can get to a doctor, whether you have someone to call when things get hard. Public health researchers put it bluntly: **your ZIP code can say more about your health than your genetic code.**

The data that shows this already exists. The CDC's PLACES project publishes model-based estimates for dozens of health measures in roughly **79,000 U.S. census tracts**. But it lives in government data portals behind FIPS codes and measure IDs. Residents don't know what their neighbourhood is at risk for, and the people setting policy don't have an easy way to see where help is needed most. Public mapping tools are also disappearing; the EPA took EJScreen offline in early 2025.

So we asked one question: **what if anyone could type an address, or click a map, and understand their neighbourhood's health in plain language?**

That's **SatisTractory**.

<p align="center">
  <img src="docs/screenshots/report.png" alt="A SatisTractory neighbourhood report" width="880" />
</p>

## Who it's for

| | What they get |
|---|---|
| 🏠 **Residents & homeowners** | A clear picture of what their block is at higher (or lower) risk for, compared to the rest of the state |
| 🤝 **Community organizers** | A fast way to see where outreach, food programs, or mental-health support would matter most |
| 🏛️ **Planners & policymakers** | A county-wide view that ranks tracts on any measure, with the uncertainty shown instead of hidden |

## A 60-second walkthrough

This is the same path we demoed to the judges.

1. **Look up Harvard.** Type `35 Oxford St, Cambridge, MA`. The tract around Harvard shows *lower* chronic disease than the Massachusetts average, but *higher* loneliness and lack of social and emotional support.
2. **Look up Northeastern.** Try `440 Huntington Ave, Boston, MA`. Here, depression and frequent mental distress sit above the state average.
3. **Check what's nearby.** Scroll to *What's nearby* to see hospitals, clinics, pharmacies, and schools within 1, 3, or 5 km, with official CMS quality stars shown separately from Google reviews.
4. **Switch to the Explorer.** Open *Explore an area*, choose Suffolk County, MA and *Food insecurity*, and see which tracts carry the heaviest burden.

Both example addresses are one-click chips on the home page.

## What it does

### 🔎 Neighbourhood report
Enter any U.S. address. SatisTractory finds its census tract and shows **19 measures** grouped into four sections. Every card shows the tract's value, the state average, a likely range (95% confidence interval), and a *worse / similar / better* label.

<p align="center"><img src="docs/screenshots/measure-cards.png" alt="Measure cards" width="820" /></p>

### 💬 AI summary in plain language
A short, neutral paragraph that names the biggest gaps versus the state. The server writes it from numbers it fetches itself, not from anything the browser sends, so the prompt can't be tampered with. It avoids blame, causal claims, and medical advice.

### 🏥 What's nearby
Hospitals, clinics and doctors, pharmacies, and schools within 1, 3, or 5 km, on a map and in a list. A summary shows the nearest hospital with an emergency department and how many clinics and schools are close by. Hospital cards keep **Google user ratings** and **CMS federal quality ratings** visibly separate, because a hospital that's popular online isn't necessarily one that scores well on safety, mortality, and readmissions.

<p align="center"><img src="docs/screenshots/nearby.png" alt="What's nearby map and hospital cards" width="820" /></p>

### 🗺️ Explore an area
Pick a state, a county, and any measure. You get a shaded map of every tract (five quantile bins), a hover tooltip, a top-10 list of the most vulnerable or best-performing tracts, and an optional filter for tracts worse than the state average. Click any tract to open its full report.

<p align="center"><img src="docs/screenshots/explorer.png" alt="Explore an area" width="820" /></p>

### The 19 measures

<details>
<summary>Show all measures</summary>

| Section | Measures |
|---|---|
| **Mental health & social connection** | Depression · Frequent mental distress · Loneliness · Lack of social & emotional support · Short sleep |
| **Chronic disease** | Diabetes · Obesity · High blood pressure · Current asthma · COPD · Coronary heart disease |
| **Social needs** | Food insecurity · Housing insecurity · Lack of reliable transportation · Utility shut-off threat · SNAP receipt |
| **Access to care** | No health insurance (ages 18–64) · Routine checkup · Dental visit |

</details>

## Reading the numbers honestly

Small-area estimates are noisy, and neighbouring tracts are often statistically the same. Ranking them by raw numbers can turn noise into headlines and stigmatize communities. So every comparison in SatisTractory is built around the uncertainty:

- **Report labels.** A measure is *worse* or *better* only when the state average falls **outside** the tract's 95% range. Otherwise it's *similar*.
- **Explorer flags.** A tract is marked *clearly above county average* only when its **entire** range sits above the county mean.
- **Direction-aware.** Each measure knows which way is good. More routine checkups is better; more uninsured adults is worse.
- **Fair shading.** Map colours use five quantile bins computed for that county and measure.
- **Always visible.** The Explorer reminds users that close rankings are often within the margin of error, and the footer explains these are modelled estimates.

These rules are covered by unit tests in `src/test/health-compare.test.ts` and `src/test/explore.test.ts`.

## Under the hood

```text
 Browser  (React 19 + TanStack Router)
    │   only calls typed server functions, never third-party APIs
    ▼
 Server functions  (TanStack Start, src/lib/*.functions.ts → *.server.ts)
    ├─ U.S. Census Geocoder ......... address → census tract
    ├─ Census TIGERweb .............. 2020 tract boundaries for the Explorer map
    ├─ CDC PLACES (Socrata API) ..... tract values + state baselines
    ├─ Google Places (New) .......... nearby hospitals, clinics, pharmacies, schools
    └─ Lovable AI Gateway ........... plain-language summary
    │
    ▼
 Postgres (Lovable Cloud)
    caches: AI summaries · state baselines · county tract shapes ·
            nearby places (7-day refresh) · CMS hospital ratings snapshot
```

Design choices worth knowing:

- **Nothing sensitive in the browser.** All outside data and AI calls happen on the server. Cache tables are server-only.
- **CMS ratings are a stored snapshot.** CMS's data portal blocks requests from serverless hosts, so the app keeps its own copy of the CMS *Hospital General Information* dataset (about 5,400 hospitals) and matches hospitals by ZIP code plus a fuzzy name match. If no confident match is found, the card says "Not rated by CMS" instead of guessing.
- **Caching keeps it fast and cheap.** Repeat lookups for the same tract, county, or radius come straight from the database.

### Tech stack

TanStack Start v1 (React 19, Vite 7) · TypeScript · Tailwind CSS v4 · Postgres via Lovable Cloud · Google Maps JavaScript API + Places API (New) · Lovable AI Gateway · Vitest

## Data sources

| Source | What we use it for |
|---|---|
| [CDC PLACES: Local Data for Better Health](https://data.cdc.gov/500-Cities-Places/PLACES-Local-Data-for-Better-Health-Census-Tract-D/cwsq-ngmh/about_data), census tract data, 2025 release (2023 BRFSS), dataset `cwsq-ngmh` | Every health estimate and state baseline |
| [U.S. Census Geocoder](https://geocoding.geo.census.gov/geocoder/) | Turning an address into a census tract |
| [Census TIGERweb](https://tigerweb.geo.census.gov/) | 2020 tract boundaries |
| [CMS Provider Data: Hospital General Information](https://data.cms.gov/provider-data/dataset/xubh-q36u) | Hospital overall star ratings, emergency services, and measure counts |
| [Google Maps Platform](https://developers.google.com/maps) | Maps and nearby places |

## Run it yourself

```sh
git clone <this-repo-url>
cd SatisTractory
npm install
npm run dev      # start the app on http://localhost:8080
npm test         # run the unit tests
```

The Census and CDC lookups work without any keys. The AI summary, maps, and nearby places need server-side credentials (an AI provider and Google Maps Platform) plus a Postgres database for the caches. In Lovable these are provided by Lovable Cloud and the Google Maps connector.

## Known limits

- **Estimates, not counts.** PLACES values are modelled from survey data and are less certain in small tracts.
- **Crude rates, not age-adjusted.** Tracts full of students (like those around Harvard and Northeastern) show low chronic disease mostly because residents are young.
- **Description, not diagnosis.** The app shows *where* gaps exist, not *why*.
- **State average = mean of tracts.** It isn't weighted by population.
- **Hospital matching is a best guess.** When no confident ZIP and name match exists, we show "Not rated" rather than a possibly wrong rating.
- **Maps need an allowed domain.** The Google map renders only on approved domains; elsewhere the rest of the report still works.

## What's next

Ideas from our original brainstorm that didn't make the hackathon cut:

- [ ] **Compare two addresses side by side**
- [ ] **Food access layer** from the USDA Food Access Research Atlas
- [ ] **Air quality** from OpenAQ, and **heat alerts** from api.weather.gov
- [ ] **Time trends** across PLACES releases, and how local policy changes line up with them
- [ ] **More context**, such as home prices and other neighbourhood covariates
- [ ] **Age-adjusted comparisons** to remove the student-population effect

## The team

Built at the **Lovable Hackathon x Startup Trek**, where SatisTractory took **🥇 1st place**.

- **Arnav Diddi**
- **Dong Hyuk Shin**
- **Jonathon Tseng**
- **Catherine Li**
- **Franco Miguel**
- **Zach Derhake**

Designed and iterated on with [Lovable](https://lovable.dev).

---

<div align="center">
<sub><b>Where you live shouldn't decide how long you live.</b> SatisTractory helps people see where it does, so they can start to change it.<br/>It describes neighbourhoods; it doesn't judge them. Not medical advice.</sub>
</div>
