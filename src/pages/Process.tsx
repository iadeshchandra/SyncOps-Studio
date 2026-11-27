import { Link } from 'react-router-dom';
import { Search, FileText, KeyRound, Wrench, BadgeCheck, PackageCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProtocolPipeline from '../components/ProtocolPipeline';
import { usePageMeta } from '../lib/meta';
import { useHireModal } from '../components/HireModal';

const STEPS: { icon: LucideIcon; title: string; body: string; mono: string }[] = [
  {
    icon: Search,
    title: 'Architecture call & audit',
    body: 'We start with a 45-minute call and a free audit of your current tracking: what fires, what is missing, what is double-counted. You keep the findings either way — if your setup is already healthy, we will say so.',
    mono: '45 min · findings in writing',
  },
  {
    icon: FileText,
    title: 'Fixed-scope proposal',
    body: 'You receive a package with a fixed price and a named deliverable list in your client portal. Nothing starts on a handshake or a chat message; the portal record is the agreement both sides work from.',
    mono: 'fixed price · no hourly billing',
  },
  {
    icon: KeyRound,
    title: 'Access & the start gate',
    body: 'A short checklist in your portal — ad accounts, tag manager, store, DNS — each item with click-by-click instructions. Payment goes directly to the studio and is verified by transaction ID. When the gate is green, the timeline starts.',
    mono: 'checklist · verified payment · timeline live',
  },
  {
    icon: Wrench,
    title: 'The build',
    body: 'The server container, deduplication core and consent wiring are built inside your accounts — the four-stage pipeline below is the technical shape of every tracking build.',
    mono: 'your accounts · your keys',
  },
  {
    icon: BadgeCheck,
    title: 'Verification on real traffic',
    body: 'Test events first, then live traffic: events watched arriving with the right values, deduplication confirmed, match quality measured. For CAPI work the 9.0+ Event Match Quality guarantee applies — under it, we keep tuning at no extra cost.',
    mono: 'test events · EMQ measured · 9.0+ guaranteed',
  },
  {
    icon: PackageCheck,
    title: 'Handover, with the keys',
    body: 'Container exports, documentation and credentials are handed over inside a 7-day SLA. You own the infrastructure outright; optional care plans exist if you want us watching it afterwards.',
    mono: 'exports · docs · 7-day handover SLA',
  },
];

const NEEDS: string[] = [
  'Access to your ad accounts (Meta, TikTok, Google — whichever the build touches)',
  'Your GTM web and server containers, or permission to create them in your account',
  'Store backend access (Shopify, WooCommerce or your platform of choice)',
  'DNS access for the first-party tracking subdomain',
  'One 45-minute architecture call — after that, the portal carries the conversation',
];

export default function Process() {
  const { openHireModal } = useHireModal();
  usePageMeta(
    'How We Work — SyncOps Studio',
    'The SyncOps engagement process: architecture call and free audit, fixed-scope proposal, access checklist and start gate, build, verification on real traffic, and a handover with the keys.',
  );

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main>
        <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
          <p className="eyebrow">how_we_work</p>
          <h1 className="h-display mt-2 max-w-3xl text-3xl sm:text-4xl">
            From first call to handover — nothing off the record
          </h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-slate-400">
            Most tracking engagements fail in the gaps: the vague brief, the access hunt, the
            &ldquo;is it done?&rdquo; silence. This process removes the gaps. Every step
            happens in your client portal, where you can watch it happen.
          </p>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="glass card-hover rounded-lg p-6">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950">
                  <s.icon className="h-6 w-6 text-cyan-300" />
                </div>
                <p className="mb-2 font-mono text-[11px] tracking-[0.24em] text-slate-500">
                  STEP 0{i + 1}
                </p>
                <h2 className="text-base font-bold text-slate-50">{s.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.body}</p>
                <p className="mt-4 rounded-md border border-slate-800 bg-black/50 px-3 py-2 font-mono text-[11px] text-emerald-300/90">
                  {s.mono}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="glass rounded-lg p-6">
              <h2 className="h-display text-xl text-slate-100">What we need from you</h2>
              <ul className="mt-4 space-y-2.5">
                {NEEDS.map((n) => (
                  <li key={n} className="flex gap-2 text-sm leading-relaxed text-slate-300">
                    <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                That is the whole list. Credentials are shared through the portal&apos;s
                vault — never by email or chat.
              </p>
            </div>
            <div className="glass rounded-lg p-6">
              <h2 className="h-display text-xl text-slate-100">How long it takes</h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                A Single CAPI Node typically ships in 7–10 days from the architecture call.
                Omnichannel stacks run 2–3 weeks. Larger and enterprise builds are scoped
                individually, with the timeline written into the proposal before you pay.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Dates in your portal are working targets the studio plans against. When a
                platform review or an access delay moves one, the new forecast and the reason
                appear on your timeline — you will never have to ask where things stand.
              </p>
              <button
                type="button"
                onClick={() => openHireModal()}
                className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-300"
              >
                Start with the free audit path
              </button>
              <p className="mt-3 text-xs text-slate-500">
                Or read the{' '}
                <Link to="/faq" className="font-semibold text-cyan-300 hover:text-cyan-200">
                  questions buyers ask first
                </Link>
                .
              </p>
            </div>
          </div>
        </div>

        <ProtocolPipeline />
      </main>
      <Footer />
    </div>
  );
}
