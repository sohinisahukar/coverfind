# CoverFind 🏥

> You have insurance. You need care. Here's exactly where to go.

CoverFind is an insurance-aware healthcare locator built at Scarlet Hacks 2026 (Illinois Tech, April 5-6). Enter your zip code and insurance provider and get a map of nearby hospitals and clinics that accept your plan — with plain-English guidance on what to expect, what to bring, and what it will cost.

---

## The Problem

Finding a doctor or hospital that actually accepts your insurance is one of the most frustrating experiences in American healthcare. Your insurer's app shows providers but no map. Google Maps shows locations but has no insurance data. Zocdoc requires knowing which doctor you want before checking coverage. Nobody built the layer that connects all three.

For the 27 million uninsured Americans, the problem is worse — free and sliding-scale clinics exist in most cities but most people have never heard of them.

CoverFind solves both problems in one tool.

---

## Features

- Search by zip code and insurance provider
- Map view of nearby in-network hospitals and clinics
- AI-generated plain-English card for each result — cost estimate, what to bring, walk-in vs appointment
- Automatic routing to federally funded community health centers (FQHCs) for uninsured users
- Flags Health Professional Shortage Areas where wait times may be longer
- Supports: Aetna, UnitedHealthcare, BCBS, Cigna, ACA Marketplace plans, and Uninsured

---

## Tech Stack

- **Frontend:** Next.js + Tailwind CSS
- **Map:** Leaflet.js
- **AI:** Anthropic Claude API (clinic card generation)
- **Clinic data:** HRSA Health Center Program API
- **Hospital data:** CMS Provider Data Catalog
- **Insurance networks:** Insurer FHIR Provider Directory APIs (CMS-mandated public endpoints)
- **Provider lookup:** NPI Registry API

---

## Getting Started

### Prerequisites

- Node.js 18+
- An Anthropic API key (get one at console.anthropic.com)

### Installation
```bash
git clone https://github.com/your-username/coverfind.git
cd coverfind
npm install
```

### Environment Setup

Copy the example env file and add your API key:
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
