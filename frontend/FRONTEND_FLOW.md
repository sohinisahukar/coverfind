# Careculator — frontend flow

This document describes how the React app is structured and how users move through it **as implemented today**. Paths are relative to the `frontend/` folder unless noted.

---

## Shell layout (`App.tsx`)

1. **Full viewport** (`h-dvh`): outer column, `overflow-hidden`.
2. **`MedMotifBackground`** — fixed behind everything (pill-field canvas + gradient; reacts to light/dark theme).
3. **Foreground column** (`z-10`): **Navbar** → **`<main id="app-scroll-root">`** (scrollable route outlet) → **Footer**.

Primary scrolling happens on `#app-scroll-root` (used by “Back to top” and nested scroll reset).

---

## Global chrome

| Area | Behavior |
|------|------------|
| **Navbar** | Logo + “Careculator” **`Link` to `/`** (home). Theme toggle (Dark / Light). **Try Demo** → `navigate('/results')` with no query (empty search). Mobile: hamburger opens menu with **Try Demo** only. |
| **Footer** | Brand + demo disclaimer; **Back to top** (scrolls main + nested overflow regions). No Home / Try demo links in the footer. |
| **Theme** | `ThemeProvider` in `main.tsx`. `localStorage` key `careculator-theme`. Default theme is **dark**. `index.html` inline script sets `html.dark` before paint when stored value is not `light`. Tailwind `darkMode: 'class'`. |

---

## Routes (`react-router-dom`)

| Path | Page component | Role |
|------|----------------|------|
| `/` | `HomePage` | Search + optional insurance wizard → navigates to results with query string. |
| `/results` | `ResultsPage` | Clinic list, filters, compare strip; reads `q`, `zip`, `priority`, `flow`, optional insurance params. |
| `/compare` | `ComparePage` | Side-by-side compare; `?ids=id1,id2`. |
| `/compare/summary` | `SummaryPage` | Summary cards; `?ids=...`. |

---

## Home page flow (`pages/HomePage.tsx`)

State machine steps: `basics` → `insurance-prompt` → (*insurance path*) `provider` → `policy` → `finalize`, or (*skip insurance*) straight to `finalize` after `insurance-prompt`.

### Step 1 — `basics` (“Search for care”)

- **Care need** (text) + **Location / ZIP** (horizontal row from `sm` breakpoint). Placeholder for care is short (e.g. knee pain, urgent care).
- Empty: magnifying-glass icon on the right; with text: **clear (X)** only (field is `type="text"` to avoid browser search UI clash).
- **Continue** (centered) → requires non-empty care query → goes to **`insurance-prompt`**.

### Step 2 — `insurance-prompt`

- **Yes, add insurance** → `provider`.
- **No, skip for now** → `finalize` (cash flow; no provider/policy).

### Insurance path — `provider`

- Grid of insurer buttons. Data from **`GET /api/insurance/providers`** (`lib/api.ts` → backend `data/insuranceProviders.json`).
- Pick one → `policy`.

### Insurance path — `policy`

- **`PlanSelect`** (`components/PlanSelect.tsx`): themed custom dropdown (not native `<select>` list styling).
- Choosing a plan → `finalize`.

### Step — `finalize`

- **With insurance:** badges for insurer + plan; slider = **illustrative coverage %** (“you pay more” ↔ “plan pays more”).
- **Cash path:** slider = **cost vs. stronger outcomes** (same numeric mapping).
- **`Find Best Care`** → `navigate` to `/results` with built query string (see below).

### Quick searches (below the card)

- Pills call **`quickNavigate`**: jump to `/results` with preset `q`, `zip` (or `60616`), `priority=50`, `flow=cash`, `costFocus=50`.

### Progress bar

- Thin bar at top of the glass card; percentage from `progressPct(step, useInsuranceDetails)`.

### Later steps — “Your search” strip

- After `basics`, a summary row shows **query · location** and **Edit search** (resets to `basics` and clears insurance selections).

---

## Results URL contract (home → results)

Built in `buildResultsUrl` / `quickNavigate`:

| Param | Meaning |
|-------|---------|
| `q` | Search text (care need). |
| `zip` | Location; defaults to **`60616`** if blank. |
| `priority` | **`100 - sliderValue`** — backend `priorityWeight`: lower = more recovery-weighted ranking, higher = more cost-weighted. |
| `flow` | `insurance` if user completed provider + plan; else `cash`. |
| `providerId`, `policyId`, `coverage` | Present when `flow=insurance` (`coverage` = slider 0–100). |
| `costFocus` | Present when `flow=cash` (slider value, for display). |

---

## Results page (`pages/ResultsPage.tsx`)

- Loads **`fetchInsuranceProviders()`** once (for insurance banner lookup).
- Loads clinics with **`fetchClinics({ q, priorityWeight: priority })`** when `q` or `priority` changes.
- **Layout:** mobile top bar + toggleable filters sidebar; main column = results list, optional sticky **Compare** strip.
- **Empty `q`:** API still called; backend may return unfiltered or filtered list depending on implementation.
- **Insurance context banner** when `flow=insurance` and provider/policy resolve against loaded providers.

---

## Compare & summary

- **`ComparePage`:** loads **`fetchCompare(ids)`** from `?ids=`.
- **`SummaryPage`:** same pattern for summary grid.

---

## API client (`lib/api.ts`)

- **Dev:** `BASE` is `''` → browser calls same origin `/api/...`; Vite proxy forwards to backend (e.g. port **3001**).
- **Prod:** set `VITE_API_URL` or defaults to `http://localhost:3001` for API calls.

Main calls:

- `GET /api/clinics/search?...`
- `GET /api/clinics/compare?ids=...`
- `GET /api/insurance/providers`

---

## Notable UI components

| Component | Role |
|-----------|------|
| `MedMotifField` / `MedMotifBackground` | Animated pill background; `isDark` from theme. |
| `PlanSelect` | Accessible styled plan dropdown on home policy step. |
| `StatusBadge` | Clinic metric badges on results/compare. |

---

## Conventions / guardrails

- **`.cursor/rules/ui-no-internal-details.mdc`:** avoid showing file paths, ports, or internal filenames in user-visible copy.

---

*Last aligned with the codebase structure described above; update this file when flows or routes change.*
