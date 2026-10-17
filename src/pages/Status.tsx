import { useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, History, RefreshCw, ShieldCheck } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import TelemetryBento from '../components/TelemetryBento';
import Terminal from '../components/Terminal';
import { NODES, type TelemetryNode } from '../lib/telemetry';

const POLL_SECONDS = 30;

function jitterMetric(value: string): string {
  const m = value.match(/^([\d.]+)(.*)$/);
  if (!m) return value;
  const num = parseFloat(m[1]);
  if (!Number.isFinite(num)) return value;
  const jittered = num * (1 + (Math.random() - 0.5) * 0.06);
  const formatted = num >= 100 ? String(Math.round(jittered)) : jittered.toFixed(1);
  return `${formatted}${m[2]}`;
}

const INCIDENTS = [
  {
    date: '2026-09-28',
    title: 'TikTok Events API elevated error rates',
    detail:
      'Upstream 5xx responses from the TikTok Events API caused retry storms on the relay. Automatic exponential backoff absorbed the spike; no events lost.',
    duration: '42 min',
  },
  {
    date: '2026-08-14',
    title: 'Firestore listener latency spike (us-central1)',
    detail:
      'Regional routing degradation pushed snapshot sync p50 from 18ms to 210ms. Traffic failed over to the multi-region replica within 4 minutes.',
    duration: '25 min',
  },
  {
    date: '2026-07-02',
    title: 'GA4 Measurement Protocol validation backlog',
    detail:
      'A schema update from Google rejected a subset of staging payloads. Validators were hot-patched and the backlog drained without production impact.',
    duration: '18 min',
  },
];

export default function Status() {
  const [secondsLeft, setSecondsLeft] = useState(POLL_SECONDS);
  const [nodes, setNodes] = useState<TelemetryNode[]>(NODES);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'System Status — SyncOps Studio';
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Deferred out of the updater so StrictMode never double-applies it.
          queueMicrotask(() => {
            setNodes((p) => p.map((n) => ({ ...n, metricValue: jitterMetric(n.metricValue) })));
            setLastRefresh(new Date().toISOString().slice(11, 19));
          });
          return POLL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const operationalCount = useMemo(() => nodes.filter((n) => n.status === 'operational').length, [nodes]);
  const ring = 2 * Math.PI * 26;
  const ringOffset = ring * (1 - secondsLeft / POLL_SECONDS);

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
        {/* SLA banner */}
        <section className="glass relative overflow-hidden rounded-xl p-6 sm:p-8">
          <div className="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="eyebrow">Live infrastructure telemetry</p>
              <div className="mt-3 flex items-end gap-4">
                <span className="h-display text-5xl sm:text-6xl">99.99%</span>
                <div className="pb-1.5">
                  <p className="text-sm font-semibold text-slate-200">90-day rolling SLA</p>
                  <p className="telemetry mt-0.5">all systems nominal</p>
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-emerald-700/80 bg-emerald-950/80 px-3 py-1.5 font-mono text-xs tracking-[0.14em] text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot" />
                {operationalCount}/{nodes.length} OPERATIONAL
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16">
                <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="#1e293b" strokeWidth="5" />
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={ring}
                    strokeDashoffset={ringOffset}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold text-slate-100">
                  {secondsLeft}s
                </span>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-200">
                  <RefreshCw className="h-3.5 w-3.5 text-cyan-400" /> Telemetry poll
                </p>
                <p className="telemetry mt-1">
                  refreshing in {secondsLeft}s{lastRefresh ? ` · last poll ${lastRefresh} UTC` : ' · just now'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Bento grid */}
        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            <h2 className="text-lg font-bold tracking-tight text-slate-50">Telemetry nodes</h2>
          </div>
          <TelemetryBento nodes={nodes} />
        </section>

        {/* Streaming terminal */}
        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <h2 className="text-lg font-bold tracking-tight text-slate-50">Live edge stream</h2>
          </div>
          <Terminal title="syncops-edge — live stdout" bodyClassName="h-[420px]" className="w-full" />
        </section>

        {/* Incident history */}
        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <History className="h-4 w-4 text-slate-400" />
            <h2 className="text-lg font-bold tracking-tight text-slate-50">Incident history</h2>
            <span className="telemetry ml-1">last 90 days</span>
          </div>
          <div className="space-y-3">
            {INCIDENTS.map((inc) => (
              <article key={inc.date} className="glass card-hover rounded-lg p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="telemetry">{inc.date}</span>
                  <span className="inline-flex items-center gap-1.5 rounded border border-emerald-700/80 bg-emerald-950/80 px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> RESOLVED
                  </span>
                  <span className="telemetry ml-auto">mitigated in {inc.duration}</span>
                </div>
                <h3 className="mt-2 font-semibold text-slate-100">{inc.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{inc.detail}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
