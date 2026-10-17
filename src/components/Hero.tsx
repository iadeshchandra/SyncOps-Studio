import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Terminal } from 'lucide-react';
import { demoHex } from '../lib/format';

const EVENTS = ['Purchase', 'InitiateCheckout', 'AddToCart', 'ViewContent', 'Lead', 'CompleteRegistration'];

interface TermLine {
  id: number;
  time: string;
  event: string;
  eventId: string;
  emq: string;
  ms: number;
}

function makeLine(tick: number): TermLine {
  const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
  return {
    id: tick,
    time,
    event: EVENTS[tick % EVENTS.length],
    eventId: demoHex(`syncops-evt-${tick}`, 12),
    emq: (9.0 + ((tick * 37) % 80) / 100).toFixed(2),
    ms: 9 + ((tick * 53) % 7),
  };
}

const TICKER = [
  '99.99% UPTIME SLA',
  '9.2 AVG EVENT MATCH QUALITY',
  '12MS EDGE LATENCY',
  '2.4B EVENTS PROCESSED / YR',
  '38% AVG RECOVERED REVENUE',
];

function TerminalVisualizer() {
  const [lines, setLines] = useState<TermLine[]>(() => [1, 2, 3, 4, 5, 6].map(makeLine));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let tick = 6;
    const id = window.setInterval(() => {
      tick += 1;
      const line = makeLine(tick);
      setLines((prev) => [...prev.slice(-39), line]);
    }, 700);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div className="terminal-window overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-800/80 px-4 py-3">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
        </span>
        <span className="ml-2 flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
          <Terminal className="h-3.5 w-3.5" />
          capi-live — edge-us1 · Meta Graph API v21.0
        </span>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
          STREAMING
        </span>
      </div>
      <div ref={scrollRef} className="h-72 overflow-y-auto px-4 py-3 font-mono text-[11px] leading-6">
        {lines.map((l) => (
          <div key={l.id} className="whitespace-nowrap">
            <span className="text-slate-600">{l.time}</span>{' '}
            <span className="text-cyan-400">POST</span>{' '}
            <span className="text-slate-400">/v21.0/&lt;pixel_id&gt;/events</span>{' '}
            <span className="text-slate-600">→</span>{' '}
            <span className="text-emerald-400">{l.event}</span>{' '}
            <span className="text-slate-600">id=</span>
            <span className="text-amber-300">{l.eventId}</span>{' '}
            <span className="text-slate-600">emq=</span>
            <span className="text-emerald-300">{l.emq}</span>{' '}
            <span className="text-slate-600">{l.ms}ms</span>{' '}
            <span className="text-emerald-500">dedup=ok</span>
          </div>
        ))}
        <div className="text-emerald-400">
          <span className="text-slate-600">$</span> <span className="animate-blink">▊</span>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(720px 320px at 20% -5%, rgba(52,211,153,0.09), transparent 65%), radial-gradient(640px 300px at 85% 10%, rgba(99,102,241,0.10), transparent 65%)',
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 lg:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow mb-5">First-Party Data Infrastructure</p>
            <h1 className="h-display text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
              Reclaim the{' '}
              <span className="bg-gradient-to-r from-rose-400 to-rose-500 bg-clip-text text-transparent">
                30%
              </span>{' '}
              of ad signal Safari, iOS and ad blockers steal.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
              SyncOps Studio engineers first-party data infrastructure for 7–9 figure brands —
              server-side tagging and Conversion API architecture that defeats Safari ITP, iOS
              14.5+ and ad blockers with 9.0+ Event Match Quality.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#auditor" className="btn-primary">
                Audit My Tracking
              </a>
              <Link to="/status" className="btn-ghost">
                View Live Telemetry
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
              {[
                ['99.99%', 'uptime SLA'],
                ['9.2', 'avg EMQ across deployments'],
                ['12ms', 'edge dispatch latency'],
              ].map(([v, l]) => (
                <div key={l}>
                  <p className="font-mono text-xl font-bold text-slate-100">{v}</p>
                  <p className="telemetry">{l}</p>
                </div>
              ))}
            </div>
          </div>
          <TerminalVisualizer />
        </div>
      </div>

      <div className="relative border-y border-slate-800/80 bg-black/40">
        <div className="overflow-hidden py-3.5">
          <div className="flex w-max animate-ticker items-center gap-8 whitespace-nowrap">
            {[...TICKER, ...TICKER].map((item, i) => (
              <span key={i} className="flex items-center gap-8">
                <span className="font-mono text-xs tracking-[0.22em] text-slate-400">{item}</span>
                <span className="text-emerald-500/60">·</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
