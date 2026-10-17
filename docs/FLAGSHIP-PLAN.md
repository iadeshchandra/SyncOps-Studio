# SyncOps Studio → Flagship Mothership: The Plan
*Plan of record — 2026-10-17. Status: v2 — BUILDING (owner approved "Go ahead" 2026-10-18).*

## 0. v2 decisions (2026-10-18, owner)

- **SaaS marketing engine, not a trophy shelf.** Most studio apps are SaaS — every product page must sell: why the app, features, benefits, conversion CTAs.
- **Studio Console = full CMS.** Owner adds a whole new app and writes/edits ALL its marketing content with zero code. Section-conditional rendering so partial content never looks broken; metrics real-or-omitted, never invented; product pages link out to the apps' own pricing (never duplicate it).
- **Three service lines** (Build → Measure → Grow): CAPI Infrastructure (flagship, high-ticket) / Analytics & Pixel Setup (Meta, Google, TikTok, Pinterest — mid-ticket, high-volume) / AI-Accelerated App Builds (on-demand custom apps; market validated — AI repriced who can afford custom software; portfolio IS the proof of method; headline the outcome not the AI; care plans = recurring revenue).
- **Positioning (v2):** "A technology studio that ships software — products of our own, and custom builds for clients — plus the data infrastructure to measure it all."

## 1. Positioning

**One line:** *SyncOps Studio is a technology studio that builds and operates digital products — and sells elite data-infrastructure services.*

**Two pillars, two doors, one roof:**
- **Services** — CAPI / server-side tagging infrastructure. This is the revenue engine. The landing hero, auditor, calculator, and hire funnel stay exactly as they are.
- **Products** — the portfolio. Shipped software that proves the studio can engineer at scale. This is the brand-equity engine.

**The flywheel (the strategic reason this works):** products prove capability → capability sells services → services fund the next product. Most studios fake this with mockups; every SyncOps product is real, shipped software. That is the moat.

**Guardrail:** never blend the pillars. A founder evaluating CAPI services must never wade through product marketing to reach the hire funnel, and a visitor discovering the products must never feel pitched services. Two doors, one roof.

## 2. Information architecture

| Route | Purpose | Status |
|---|---|---|
| `/` | CAPI service landing (unchanged) + new "Built by the studio" products strip + one-line manifesto | Phase 1 |
| `/work` | Showcase index — all products, filterable | Phase 1 |
| `/work/:slug` | Per-product detail page (template) | Phase 2 |
| `/status`, `/labs`, `/login`, `/client/*`, `/studio/console` | Unchanged | — |

**Nav:** Services (→ `/`), Work (→ `/work`), Labs, Status, Client Portal.
**Footer:** add a "Work" link under the Studio column.

## 3. Product lineup (v1)

| Product | Role | Status badge | Notes |
|---|---|---|---|
| Sanatani Bandhan | Flagship product | Live | ERP for Dharmic institutions; leads the showcase |
| XTRIVO | Ecosystem product | Building | Cross-platform download manager |
| ProofList | New venture | Building | Lead-gen tool (Leads-Sniper competitor) |
| CAPI Infrastructure | Service line | Client work | Positioned as the studio's service arm, not a product |

Status badges are owner-editable (Live / Beta / Building) — never fake a status.

## 4. Content model (`src/data/products.ts`)

```ts
interface Product {
  slug: string;            // 'sanatani-bandhan'
  name: string;
  tagline: string;         // one line
  status: 'live' | 'beta' | 'building';
  description: string;     // 2–3 sentences
  metrics: { value: string; label: string }[];  // 2–3 real numbers
  stack: string[];         // tech chips
  links: { label: string; url: string }[];       // live app, repo, store
  accent: string;          // per-product accent (Tailwind-safe token)
  featured?: boolean;
  narrative?: { challenge: string; build: string; outcome: string }; // Phase 2
}
```

Metrics must be real or omitted — never invented. Owner supplies per product (see §9).

## 5. Page blueprints

**Landing "Built by the studio" strip** (new section, below case studies, above pricing):
Eyebrow `THE STUDIO PORTFOLIO`, 3–4 product cards reusing the CaseStudies card pattern (status badge, tagline, 2 metrics, link). CTA: "See all work →" to `/work`.

**Manifesto line** (one sentence, above the strip): *"We're a technology studio — we build and operate digital products, and we sell the infrastructure expertise behind them."* Links: Services / Work.

**`/work` index:** hero (`Work` + one-liner), filter chips (All / Live / Building), card grid, closing CTA band ("Have something to build? Talk to the studio →" opens Hire Modal).

**`/work/:slug` detail (Phase 2):** hero with status badge + tagline → metric band → narrative (The challenge / What we built / The outcome) → stack chips → links → CTA band. Unknown slugs → home redirect (same pattern as existing `*` route).

## 6. Design language

- Reuse the obsidian system verbatim (bg-slate-950, glass cards, slate-800/80 borders, font-mono telemetry).
- Per-product accent color only on the status badge and card top-border — the studio chrome stays neutral.
- No new fonts, no new icon sets (lucide-react only). Zero dead clicks.

## 7. Console integration (Phase 3)

- Extend `SiteConfig` with `products: ProductConfig[] | null` (same nullable-override pattern as pricing/case studies).
- Studio Console → Content tab gains a **Products** section (add/edit/reorder/status).
- Firestore: `platformConfig/public` (public read, owner write — existing rule covers it).
- Until Phase 3, products are compiled-in data (Phase 1/2), exactly like pricing is today.

## 8. Phases

- **Phase 0 — DONE (push held):** v1.0 CAPI site + Studio Console + Firebase CI/CD. Push resumes first.
- **Phase 1 — Showcase foundation:** `products.ts`, landing strip, `/work` index, nav + footer links. Console: read-only. *Small, shippable.*
- **Phase 2 — Depth:** `/work/:slug` template + real copy/metrics for 3–4 products.
- **Phase 3 — Owner-operated:** console-managed products (add/edit without code).
- **Later (not committed):** `/services` page if the service line expands beyond CAPI; build log / changelog; testimonials wall.

## 9. Owner inputs needed (your hand)

1. One-line tagline per product (your words).
2. 2–3 real metrics per product (users, uptime, scale — or "omit" where not ready).
3. Links per product (live app URL, repo, store listings).
4. Confirm status badges (Live / Beta / Building).
5. Product logos/artwork — or I generate monochrome placeholder marks in the studio style.
6. The unchanged Firebase/CI steps in `docs/DEPLOY.md` whenever you're ready to go live.

## 10. Non-goals

- The CAPI funnel (auditor, calculator, hire modal, portal, status, labs) is untouched.
- Products keep their own brands; the studio never absorbs them.
- No blog, no newsletter, no social feeds in v1 — the site earns attention through shipped work, not content.

## 11. Success criteria

- **10-second test:** a first-time visitor can say "a tech studio that ships real products and sells infrastructure services."
- Each product page is standalone-convertible (link out or contact — no dead ends).
- The owner can add a fourth product in Phase 3 without touching code.
