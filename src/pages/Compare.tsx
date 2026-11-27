import { } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Award,
  Clock,
  Crosshair,
  Globe,
  Layers,
  LifeBuoy,
  ScanSearch,
  Star,
  Tag,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useHireModal } from '../components/HireModal';
import { usePageMeta } from '../lib/meta';
import { cx } from '../lib/format';

/* ------------------------------------------------------------------ */
/* Data — honest, sourced from public pages (Oct 2026). Studio        */
/* figures come from src/data/services.ts; competitor pricing is      */
/* linked, never restated beyond what their pages publish.            */
/* ------------------------------------------------------------------ */

interface Cell {
  text: string;
  linkLabel?: string;
  linkHref?: string;
}

interface Row {
  label: string;
  icon: LucideIcon;
  studio: Cell;
  stape: Cell;
  pixelfly: Cell;
}

const PROVIDERS = [
  {
    id: 'studio',
    name: 'SyncOps Studio',
    tag: 'DONE-FOR-YOU STUDIO',
    blurb: 'A tracking architect builds, verifies and hands over your stack.',
  },
  {
    id: 'stape',
    name: 'Stape',
    tag: 'DIY SAAS · SGTM HOSTING',
    blurb: 'Server-side GTM hosting you configure and maintain yourself.',
  },
  {
    id: 'pixelfly',
    name: 'PixelFly',
    tag: 'DIY SAAS · BANGLADESH',
    blurb: 'Server-side tracking SaaS with local billing and Bangla support.',
  },
] as const;

const ROWS: Row[] = [
  {
    label: 'Model',
    icon: Layers,
    studio: { text: 'Done-for-you service — we build it, verify it, and you own it outright.' },
    stape: { text: 'DIY SaaS — hosting and tools; the build is yours.' },
    pixelfly: { text: 'DIY SaaS — hosting and tools; the build is yours.' },
  },
  {
    label: "Who it's for",
    icon: Users,
    studio: { text: '7–9 figure brands and lean teams with no tracking engineer on staff.' },
    stape: { text: 'Technical marketers and agencies comfortable running server GTM themselves.' },
    pixelfly: { text: 'Bangladesh and regional stores that want local SaaS pricing and billing.' },
  },
  {
    label: 'Starting price',
    icon: Tag,
    studio: { text: 'Project packages from $590 (Analytics & Pixel Setup) and $2,400 (CAPI Infrastructure). One-time — no platform subscription after handover.' },
    stape: {
      text: 'Monthly per-container subscription, priced by event volume.',
      linkLabel: 'Check current pricing',
      linkHref: 'https://stape.io/pricing',
    },
    pixelfly: {
      text: 'From $15/mo for 500K events.',
      linkLabel: 'See pricing',
      linkHref: 'https://pixelfly.io/pricing',
    },
  },
  {
    label: 'Setup',
    icon: Wrench,
    studio: { text: 'Done for you — architecture, build, QA verification pass and SLA-backed handover.' },
    stape: { text: 'Do-it-yourself — you configure containers, tags, triggers and destinations.' },
    pixelfly: { text: 'Do-it-yourself — guided setup flows, but the configuration is yours.' },
  },
  {
    label: 'Event Match Quality',
    icon: Crosshair,
    studio: { text: '9.0+ EMQ guarantee on CAPI packages — if it does not clear, we keep working until it does.' },
    stape: { text: 'Your responsibility — the platform reports EMQ, improving it is on you.' },
    pixelfly: { text: 'Your responsibility — enrichment tools provided, results not guaranteed.' },
  },
  {
    label: 'Migration',
    icon: ArrowLeftRight,
    studio: { text: 'Free with any package — we migrate you off Stape, PixelFly or plain GTM ourselves.' },
    stape: { text: 'Self-guided — templates and documentation.' },
    pixelfly: { text: 'Self-guided — step-by-step migration guides from other platforms.' },
  },
  {
    label: 'Platforms covered',
    icon: Globe,
    studio: { text: 'Meta, TikTok, Pinterest, GA4, Google Ads, ChatGPT Ads and more — one deduplication core.' },
    stape: { text: 'Meta, GA4, TikTok, Google Ads and other major destinations.' },
    pixelfly: { text: 'Meta, GA4, TikTok, LinkedIn, Snapchat and Pinterest.' },
  },
  {
    label: 'Support',
    icon: LifeBuoy,
    studio: { text: 'Direct access to the architect who built your stack · ≤4h business SLA.' },
    stape: { text: 'SaaS support team via tickets and chat.' },
    pixelfly: { text: 'Bangla-language support and bKash/Nagad billing — a genuine advantage for local stores.' },
  },
  {
    label: 'Your time required',
    icon: Clock,
    studio: { text: 'One kickoff call and approvals — we handle the rest.' },
    stape: { text: 'Hours of setup, plus ongoing maintenance, debugging and updates.' },
    pixelfly: { text: 'Hours of setup, plus ongoing maintenance, debugging and updates.' },
  },
  {
    label: 'Best for',
    icon: Award,
    studio: { text: 'Brands that want attribution owned end-to-end, with a guarantee behind it.' },
    stape: { text: 'Teams with in-house tracking skills who want hosting only.' },
    pixelfly: { text: 'BD stores that want an affordable DIY stack with local support.' },
  },
];

function CellBody({ cell }: { cell: Cell }) {
  return (
    <>
      <p className="text-sm leading-relaxed text-slate-300">{cell.text}</p>
      {cell.linkHref && (
        <a
          href={cell.linkHref}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 underline-offset-2 transition-colors hover:text-cyan-200 hover:underline"
        >
          {cell.linkLabel ?? 'Learn more'}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      )}
    </>
  );
}

export default function Compare() {
  const { openHireModal } = useHireModal();

  usePageMeta(
    'Compare — SyncOps Studio vs Stape vs PixelFly',
    'An honest comparison of SyncOps Studio with Stape and PixelFly: what each tool really does, where each one stops, and what a hands-on studio adds.',
  );

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
        {/* Hero */}
        <section className="glass relative overflow-hidden rounded-xl p-6 sm:p-10">
          <div className="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <p className="eyebrow">Compare</p>
          <h1 className="h-display mt-3 max-w-3xl text-4xl sm:text-5xl">
            Done-for-you vs DIY server-side tracking
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
            Stape and PixelFly rent you the infrastructure and hand you the tools. SyncOps Studio
            builds the whole stack for you, guarantees the match quality, and hands you the keys.
            Here is the honest side-by-side — including where the DIY tools genuinely win.
          </p>
          <a
            href="https://www.fiverr.com/adesh_chandra"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-md border border-amber-700/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-200/90 transition-colors hover:border-amber-600/60"
          >
            <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
            Studio proof: 4.9/5 from 322 Fiverr reviews · 240+ businesses tracked since 2019
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </section>

        {/* Desktop table */}
        <section className="mt-8 hidden lg:block">
          <div className="grid grid-cols-[180px_1.25fr_1fr_1fr] overflow-hidden rounded-xl border border-white/10">
            {/* Header row */}
            <div className="border-b border-white/10 bg-white/[0.02] p-5">
              <p className="telemetry">side-by-side</p>
            </div>
            {PROVIDERS.map((p) => (
              <div
                key={p.id}
                className={cx(
                  'border-b border-l border-white/10 p-5',
                  p.id === 'studio'
                    ? 'bg-emerald-500/[0.07]'
                    : 'bg-white/[0.02]'
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold tracking-tight text-slate-50">{p.name}</h2>
                  {p.id === 'studio' && (
                    <span className="rounded border border-emerald-700/80 bg-emerald-950/80 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] text-emerald-400">
                      THIS STUDIO
                    </span>
                  )}
                </div>
                <p className="telemetry mt-1.5">{p.tag}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{p.blurb}</p>
              </div>
            ))}

            {/* Body rows */}
            {ROWS.map((row, i) => {
              const Icon = row.icon;
              const cells: Cell[] = [row.studio, row.stape, row.pixelfly];
              return (
                <div key={row.label} className="contents">
                  <div
                    className={cx(
                      'flex items-start gap-2 p-5',
                      i < ROWS.length - 1 && 'border-b border-white/10'
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                    <span className="text-sm font-semibold text-slate-100">{row.label}</span>
                  </div>
                  {cells.map((cell, ci) => (
                    <div
                      key={PROVIDERS[ci].id}
                      className={cx(
                        'border-l border-white/10 p-5',
                        i < ROWS.length - 1 && 'border-b',
                        PROVIDERS[ci].id === 'studio' && 'bg-emerald-500/[0.04]'
                      )}
                    >
                      <CellBody cell={cell} />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </section>

        {/* Mobile stacked cards */}
        <section className="mt-8 space-y-3 lg:hidden">
          {ROWS.map((row) => {
            const Icon = row.icon;
            const cells: { provider: (typeof PROVIDERS)[number]; cell: Cell }[] = [
              { provider: PROVIDERS[0], cell: row.studio },
              { provider: PROVIDERS[1], cell: row.stape },
              { provider: PROVIDERS[2], cell: row.pixelfly },
            ];
            return (
              <article key={row.label} className="glass rounded-lg p-5">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-cyan-400" />
                  <h2 className="text-sm font-semibold text-slate-100">{row.label}</h2>
                </div>
                <div className="mt-4 space-y-4">
                  {cells.map(({ provider, cell }) => (
                    <div
                      key={provider.id}
                      className={cx(
                        'rounded-md border p-3.5',
                        provider.id === 'studio'
                          ? 'border-emerald-700/50 bg-emerald-500/[0.05]'
                          : 'border-white/10 bg-white/[0.02]'
                      )}
                    >
                      <p className="font-mono text-[10px] tracking-[0.14em] text-slate-400">
                        {provider.name.toUpperCase()} · {provider.tag}
                      </p>
                      <div className="mt-1.5">
                        <CellBody cell={cell} />
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>

        {/* Honest summary */}
        <section className="mt-10">
          <div className="mb-4 flex items-center gap-2">
            <ScanSearch className="h-4 w-4 text-emerald-400" />
            <h2 className="text-lg font-bold tracking-tight text-slate-50">The honest summary</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="glass card-hover rounded-lg p-6 sm:p-8">
              <p className="telemetry">choose diy saas if…</p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-300">
                <li className="flex gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                  You have a technical marketer or developer who enjoys owning server GTM.
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                  Your ad spend is still small, so a low monthly fee beats a project fee.
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                  You have the time to debug match quality, consent wiring and dedup yourself.
                </li>
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                Stape is the mature global option; PixelFly adds local billing and Bangla support.
                Both are good tools — in the right hands.
              </p>
            </div>
            <div className="glass card-hover rounded-lg border-emerald-700/40 p-6 sm:p-8">
              <p className="telemetry">choose the studio if…</p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-300">
                <li className="flex gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  Signal loss is already costing you real money every month.
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  Nobody on your team should be spending their week inside a GTM container.
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  You want a 9.0+ EMQ guarantee and an SLA-backed handover — not another dashboard.
                </li>
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                One project fee, no platform subscription afterwards, and the infrastructure is
                yours. Already on Stape or PixelFly? Migration is free with any package.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="glass relative mt-10 overflow-hidden rounded-xl p-6 sm:p-10">
          <div className="pointer-events-none absolute -bottom-24 left-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <h2 className="h-display max-w-2xl text-3xl sm:text-4xl">
            Not sure how much signal you are losing?
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-400">
            Run the free Tracking Auditor first — it grades your current setup in under a minute.
            If the grade hurts, we will build the fix end-to-end.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => openHireModal({ serviceLine: 'capi' })}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
            >
              Start a project
              <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              to="/#auditor"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/10"
            >
              <ScanSearch className="h-4 w-4 text-cyan-300" />
              Run the free Tracking Auditor
            </Link>
          </div>
          <p className="telemetry mt-6">
            Competitor details reflect their public pricing pages as of October 2026 — check their
            sites for current offers.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
