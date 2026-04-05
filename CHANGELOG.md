# Changelog

All notable changes to Careculator are documented here.

Format: **MAJOR.MINOR.PATCH**
- **MAJOR** — breaking changes (new architecture, removed APIs, incompatible data changes)
- **MINOR** — new features added in a backwards-compatible way
- **PATCH** — bug fixes, copy tweaks, style corrections

---

## [0.4.0] — 2026-04-05

### Added
- Animated SVG logo (`LogoMark`) — heart + medical cross, draw-in stroke animation
- Full-screen logo splash (`LogoSplash`) shown on every page transition (~1.5 s)
- Insurer search box in the wizard "Your insurer" step for quick filtering
- Theme toggle (lightbulb) now only visible on the homepage

### Changed
- Navbar icon replaced with real `LogoMark` component
- Splash triggers on every route change, not just first visit

---

## [0.3.1] — 2026-04-05

### Fixed
- Duplicate insurance company names in wizard — providers now deduplicated by brand name, policies merged by plan type
- Best Value badge was pre-computed in DB; now dynamically assigned post-sort (clinic with highest `costScore` wins)
- PlanSelect dropdown was semi-transparent — removed `backdrop-blur` and opacity from `bg-white/98`
- Removed `+ Use Insurance` filter button from results page sidebar

---

## [0.3.0] — 2026-04-05

### Added
- Light bulb theme toggle hanging from navbar (replaces Dark/Light pill buttons)
- Homepage title updated: "FIND CARE THAT HEALS—NOT JUST BILLS."
- Homepage subtitle updated to financial-risk framing
- Insurance wizard step fully restored with corrected slider logic
- Slider hint text (Lower Cost ↔ Stronger Outcomes) added to finalize step

### Changed
- Distance filter moved server-side (was client-side at 25 mi); default raised to 50 mi
- Priority slider inversion fixed: left = Lower Cost, right = Stronger Outcomes
- Removed "Try Demo" button from navbar

---

## [0.2.1] — 2026-04-05

### Fixed
- Backend DB path was wrong (`../data/` → `../../data/` relative to `src/config/`)
- Stale server process on port 3001 prevented insurance endpoint from loading
- Insurance endpoint returning 500 "Cannot open database" error

---

## [0.2.0] — 2026-04-05

### Added
- Insurance feature branch merged into main
- Insurance wizard: provider selection, plan selection, coverage slider
- GET `/api/insurance/providers` and `/api/insurance/tiers` endpoints
- Results page shows adjusted costs when insurance context is present

---

## [0.1.0] — Initial release

### Added
- Clinic search wizard (query + ZIP)
- Results page with distance filter and priority slider
- Compare page (side-by-side clinic comparison)
- SQLite database with 9,323 HRSA clinics
- Weighted scoring: `recoveryScore` ↔ `costScore` via `priorityWeight`
- Haversine distance computation
- Dark / light theme with `ThemeContext`
- Animated medical motif background
