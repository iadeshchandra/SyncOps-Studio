# SyncOps Studio

Elite first-party data infrastructure, server-side tagging and Conversion API (CAPI)
architecture for 7-to-9 figure e-commerce brands. Obsidian cyber-infrastructure
web application: marketing site, live telemetry status page, engineering labs,
and a real-time client project portal.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 (`@import "tailwindcss"`)
- Firebase Auth + Firestore (with built-in demo fallback)
- react-router-dom, lucide-react

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # tsc --noEmit + vite build -> dist/
npm run preview  # serve the production build
```

## Firebase (owner step)

The app runs fully in **demo mode** with zero configuration — intake, portal,
chat and vault all work against local mock state.

To go live, follow the exact click-by-click owner guide: [`docs/DEPLOY.md`](docs/DEPLOY.md)
(Firebase project, Authentication, Firestore, GitHub Secrets, the deploy
workflow, and the owner allowlist bootstrap — no terminal, no card).

Build env vars consumed at deploy time: `VITE_FIREBASE_API_KEY`,
`VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
`VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`,
`VITE_FIREBASE_APP_ID`, plus `VITE_OWNER_EMAILS` (unlocks `/studio/console`).

CI deploys automatically on every push to `main` via
`.github/workflows/firebase-deploy.yml` (Hosting + Firestore rules).

## Routes

| Route | Surface |
|---|---|
| `/` | Landing: hero, ROAS hemorrhage calculator, tracking auditor, protocol pipeline, case studies, pricing |
| `/status` | Live infrastructure telemetry + streaming terminal |
| `/labs` | CAPI payload builder, DNS CNAME generator, masterclasses |
| `/login`, `/client/login` | Split-screen client authentication (demo account included) |
| `/client/dashboard`, `/client/portal/:id` | Protected real-time project portal |

## License

See LICENSE.
