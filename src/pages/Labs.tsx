import { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, Clock, FlaskConical, Gauge, Play } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PayloadBuilder from '../components/PayloadBuilder';
import DnsGenerator from '../components/DnsGenerator';
import { cx } from '../lib/format';

const MASTERCLASSES = [
  {
    title: 'First-Party Proxy Deep Dive',
    duration: '42 min',
    level: 'Advanced',
    description:
      'Route every measurement request through your own subdomain. Covers CNAME cloaking, TLS termination, and cookie lifetime extension under Safari ITP.',
    lessons: [
      'How third-party pixels get blocked: ITP, ETP, and ad-blocker anatomy',
      'Designing the sgtm.* proxy topology on Stape and Cloud Run',
      'DNS, TLS, and certificate automation for the tagging subdomain',
      'Measuring the before/after: cookie TTL and match-rate lift',
      'Hardening the proxy against fingerprinting and abuse',
    ],
  },
  {
    title: 'CAPI Deduplication Masterclass',
    duration: '58 min',
    level: 'Advanced',
    description:
      'Send browser and server events without double-counting. event_id strategy, fbp/fbc stitching, and EMQ scoring from 7.2 to 9.4.',
    lessons: [
      'Why dedup fails: mismatched event_ids and clock skew',
      'Generating collision-proof event_ids at the data layer',
      'Browser pixel + server event pairing patterns',
      'Advanced matching: hashing, normalization, and field priority',
      'Reading the EMQ debugger like a Meta engineer',
    ],
  },
  {
    title: 'Safari ITP Survival Guide',
    duration: '35 min',
    level: 'Intermediate',
    description:
      'Understand exactly what Apple strips, when, and how server-side tagging restores a durable 180-day attribution window.',
    lessons: [
      'ITP 1.0 → 2.3: the 7-day and 24-hour cookie kill rules',
      'Private Relay and Link Tracking Protection explained',
      'First-party cookies set server-side: what survives',
      'Consent Mode v2 interplay for EU traffic',
      'Attribution modeling when identifiers are scarce',
    ],
  },
  {
    title: 'GA4 Measurement Protocol Lab',
    duration: '47 min',
    level: 'Intermediate',
    description:
      'Validate and dispatch server-side GA4 e-commerce events. Schema checks, debug mode, and reconciling with your CAPI stream.',
    lessons: [
      'Measurement Protocol vs gtag: when the server wins',
      'Building valid purchase, refund, and add_to_cart payloads',
      'Using the debug endpoint before production sends',
      'Client_id stitching across browser and server',
      'Reconciling GA4, Meta, and TikTok revenue numbers',
    ],
  },
];

function MasterclassCard({ mc }: { mc: (typeof MASTERCLASSES)[number] }) {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);

  return (
    <article className="glass card-hover flex flex-col rounded-xl p-5">
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? `Pause ${mc.title}` : `Play ${mc.title}`}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-cyan-700/60 bg-cyan-950/60 text-cyan-300 transition-all hover:border-cyan-400/80 hover:shadow-[0_0_20px_rgba(34,211,238,0.25)]"
        >
          {playing ? <span className="flex gap-1"><span className="h-4 w-1 bg-current" /><span className="h-4 w-1 bg-current" /></span> : <Play className="h-5 w-5 fill-current" />}
        </button>
        <div className="min-w-0">
          <h3 className="font-bold tracking-tight text-slate-50">{mc.title}</h3>
          <p className="telemetry mt-1 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {mc.duration}</span>
            <span className="inline-flex items-center gap-1"><Gauge className="h-3 w-3" /> {mc.level}</span>
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">{mc.description}</p>
      {playing && (
        <p className="mt-3 rounded-md border border-cyan-800/60 bg-cyan-950/40 px-3 py-2 font-mono text-[11px] text-cyan-300">
          preview stream requested — the full masterclass ships inside the client portal
        </p>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mt-4 inline-flex items-center gap-1.5 self-start font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400 transition-colors hover:text-cyan-300"
      >
        Curriculum
        <ChevronDown className={cx('h-3.5 w-3.5 transition-transform duration-300', open && 'rotate-180')} />
      </button>
      <div className={cx('grid transition-all duration-300 ease-in-out', open ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
        <ul className="space-y-2 overflow-hidden">
          {mc.lessons.map((lesson, i) => (
            <li key={lesson} className="flex gap-2.5 text-sm text-slate-300">
              <span className="font-mono text-[11px] text-cyan-400/80">{String(i + 1).padStart(2, '0')}</span>
              <span className="leading-relaxed">{lesson}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default function Labs() {
  useEffect(() => {
    document.title = 'SyncOps Labs — SyncOps Studio';
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/40 px-6 py-10 backdrop-blur-xl sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute -top-32 left-1/3 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 right-1/4 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative">
            <p className="eyebrow inline-flex items-center gap-2">
              <FlaskConical className="h-3.5 w-3.5" /> SyncOps Labs — engineering sandbox
            </p>
            <h1 className="h-display mt-4 text-4xl sm:text-5xl">
              Build the payload.<br className="hidden sm:block" /> Own the signal.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
              The same tooling our Lead Architects use on client engagements: a live Conversions API
              payload workbench and a first-party DNS generator. Everything runs in your browser —
              no data leaves this page until you dispatch it yourself.
            </p>
          </div>
        </section>

        {/* Sandbox grid */}
        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PayloadBuilder />
          </div>
          <div>
            <DnsGenerator />
          </div>
        </section>

        {/* Masterclasses */}
        <section className="mt-14">
          <div className="mb-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-cyan-400" />
            <p className="eyebrow">Video masterclasses</p>
          </div>
          <h2 className="h-display text-2xl sm:text-3xl">Architectural deep dives</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Recorded sessions from the studio floor — the exact mental models we deploy for
            7-to-9 figure brands fighting signal loss.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {MASTERCLASSES.map((mc) => (
              <MasterclassCard key={mc.title} mc={mc} />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
