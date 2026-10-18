import { useEffect, useRef, useState } from 'react';
import { CircleCheck, TriangleAlert, XCircle, ScanLine, ArrowRight, AlertCircle, MailCheck, Send } from 'lucide-react';
import { auditDomain } from '../lib/auditor';
import type { AuditResult, Platform } from '../lib/auditor';
import { saveLead } from '../lib/leads';
import { cx } from '../lib/format';
import { useHireModal } from './HireModal';

const SCAN_STAGES = [
  'Resolving DNS & CNAME records…',
  'Simulating Safari ITP cookie decay…',
  'Verifying event_id deduplication & PII hashing…',
];

function gradeStyle(grade: string): string {
  if (grade === 'A+' || grade === 'A') return 'text-emerald-400 border-emerald-500/60';
  if (grade === 'B') return 'text-cyan-400 border-cyan-500/60';
  if (grade === 'C') return 'text-amber-400 border-amber-500/60';
  if (grade === 'D') return 'text-orange-400 border-orange-500/60';
  return 'text-rose-400 border-rose-500/60';
}

function statusIcon(status: 'pass' | 'warn' | 'fail') {
  if (status === 'pass') return <CircleCheck className="h-5 w-5 shrink-0 text-emerald-400" />;
  if (status === 'warn') return <TriangleAlert className="h-5 w-5 shrink-0 text-amber-400" />;
  return <XCircle className="h-5 w-5 shrink-0 text-rose-400" />;
}

export default function TrackingAuditor() {
  const [domain, setDomain] = useState('');
  const [platform, setPlatform] = useState<Platform>('shopify');
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'done'>('idle');
  const [stageIdx, setStageIdx] = useState(0);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadState, setLeadState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const timers = useRef<number[]>([]);
  const { openHireModal } = useHireModal();

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const runDiagnostic = () => {
    const d = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(d)) {
      setError('Enter a valid store domain, e.g. brand.com');
      return;
    }
    setError('');
    setResult(null);
    setLeadEmail('');
    setLeadState('idle');
    setPhase('scanning');
    setStageIdx(0);
    SCAN_STAGES.forEach((_, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setStageIdx(i + 1);
          if (i === SCAN_STAGES.length - 1) {
            timers.current.push(
              window.setTimeout(() => {
                setResult(auditDomain(d, platform));
                setPhase('done');
              }, 500)
            );
          }
        }, 650 * (i + 1))
      );
    });
  };

  const progress = Math.round((stageIdx / SCAN_STAGES.length) * 100);

  const submitLead = async () => {
    const email = leadEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !result) {
      setLeadState('error');
      return;
    }
    setLeadState('sending');
    await saveLead({
      email,
      domain: domain.trim().toLowerCase(),
      score: result.score,
      grade: result.grade,
    });
    setLeadState('sent');
  };

  return (
    <div id="auditor" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6 lg:py-28">
      <p className="eyebrow mb-4">Diagnostic Suite</p>
      <h2 className="h-display text-3xl sm:text-4xl">The Tracking Auditor</h2>
      <p className="mt-4 max-w-2xl text-slate-400">
        Enter your store domain. The auditor simulates the five failure modes that silently
        drain attribution — CNAME cloaking gaps, ITP decay, dedup breaks, hashing gaps and
        consent defaults.
      </p>

      <div className="glass mt-8 rounded-lg p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex-1">
            <label htmlFor="audit-domain" className="label-dark">
              Store domain
            </label>
            <input
              id="audit-domain"
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runDiagnostic();
              }}
              placeholder="brand.com"
              className="input-dark font-mono"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div>
            <span className="label-dark">Platform</span>
            <div className="flex gap-2">
              {(['shopify', 'custom'] as Platform[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={cx(
                    'rounded-md border px-4 py-3 text-sm font-semibold transition-all',
                    platform === p
                      ? 'border-cyan-400/70 bg-cyan-950/50 text-cyan-200'
                      : 'border-slate-700 bg-slate-950/60 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  )}
                  aria-pressed={platform === p}
                >
                  {p === 'shopify' ? 'Shopify' : 'Custom'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={runDiagnostic}
              disabled={phase === 'scanning'}
              className="btn-primary w-full lg:w-auto"
            >
              <ScanLine className="h-4 w-4" />
              {phase === 'scanning' ? 'Scanning…' : 'Run Diagnostic'}
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-4 flex items-center gap-2 text-sm text-rose-400">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}

        {phase === 'scanning' && (
          <div className="mt-6 border-t border-slate-800/80 pt-6">
            <div className="mb-3 flex justify-between font-mono text-xs text-slate-400">
              <span>Auditing {domain || 'domain'}…</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-4 space-y-2">
              {SCAN_STAGES.map((s, i) => (
                <p
                  key={s}
                  className={cx(
                    'font-mono text-xs transition-colors',
                    i < stageIdx ? 'text-emerald-400' : i === stageIdx ? 'text-cyan-300' : 'text-slate-600'
                  )}
                >
                  {i < stageIdx ? '✓ ' : i === stageIdx ? '› ' : '· '}
                  {s}
                </p>
              ))}
            </div>
          </div>
        )}

        {phase === 'done' && result && (
          <div className="mt-6 border-t border-slate-800/80 pt-8">
            {/* Grade gauge */}
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
              <div
                className={cx(
                  'flex h-32 w-32 shrink-0 flex-col items-center justify-center rounded-2xl border-2 bg-slate-950/80',
                  gradeStyle(result.grade)
                )}
              >
                <span className="font-mono text-5xl font-black">{result.grade}</span>
                <span className="mt-1 font-mono text-[10px] tracking-[0.2em] text-slate-500">
                  SIGNAL HEALTH
                </span>
              </div>
              <div className="w-full">
                <div className="mb-2 flex justify-between font-mono text-xs">
                  <span className="text-slate-400">Overall score</span>
                  <span className="font-bold text-slate-100">{result.score}/100</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={cx(
                      'h-full rounded-full transition-all duration-700',
                      result.score >= 80
                        ? 'bg-emerald-400'
                        : result.score >= 60
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                    )}
                    style={{ width: `${result.score}%` }}
                  />
                </div>
                <p className="mt-3 text-sm text-slate-400">
                  {result.checks.filter((c) => c.status === 'fail').length} critical ·{' '}
                  {result.checks.filter((c) => c.status === 'warn').length} warnings ·{' '}
                  {result.checks.filter((c) => c.status === 'pass').length} passing
                </p>
              </div>
            </div>

            {/* Checks */}
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {result.checks.map((c) => (
                <div key={c.id} className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-5">
                  <div className="flex items-start gap-3">
                    {statusIcon(c.status)}
                    <div>
                      <p className="text-sm font-bold text-slate-100">{c.name}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{c.detail}</p>
                      <p className="mt-2.5 border-l-2 border-cyan-500/40 pl-3 font-mono text-[11px] leading-relaxed text-cyan-200/80">
                        {c.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Latency benchmark */}
            <div className="mt-8 rounded-lg border border-slate-800/80 bg-slate-950/60 p-5 sm:p-6">
              <p className="label-dark">Latency benchmark</p>
              <div className="space-y-4">
                <div>
                  <div className="mb-1.5 flex justify-between font-mono text-xs">
                    <span className="text-rose-300">Client-side pixel</span>
                    <span className="text-rose-300">~{result.clientLatencyMs}ms overhead</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-800">
                    <div className="h-full w-full rounded-full bg-rose-500/80" />
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between font-mono text-xs">
                    <span className="text-emerald-300">SyncOps server edge</span>
                    <span className="text-emerald-300">~{result.edgeLatencyMs}ms dispatch</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{
                        width: `${Math.max(4, (result.edgeLatencyMs / result.clientLatencyMs) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              <p className="telemetry mt-4">
                {Math.round(result.clientLatencyMs / result.edgeLatencyMs)}× faster on the edge —
                and invisible to ad blockers.
              </p>
            </div>

            <button type="button" onClick={() => openHireModal()} className="btn-primary mt-8">
              Deploy Remediation Architecture <ArrowRight className="h-4 w-4" />
            </button>

            {/* Lead capture — email me the full report */}
            <div className="mt-6 rounded-lg border border-cyan-800/50 bg-cyan-950/20 p-5 sm:p-6">
              {leadState === 'sent' ? (
                <p className="flex items-center gap-2.5 text-sm font-semibold text-emerald-300">
                  <MailCheck className="h-5 w-5" />
                  Report on its way — check your inbox. We reply to every audit personally.
                </p>
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-100">Get the full report by email</p>
                  <p className="mt-1 text-sm text-slate-400">
                    The complete findings, prioritized fixes, and what each one costs you in
                    lost signal — plus a human read of your stack.
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <input
                      type="email"
                      value={leadEmail}
                      onChange={(e) => {
                        setLeadEmail(e.target.value);
                        if (leadState === 'error') setLeadState('idle');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitLead();
                      }}
                      placeholder="you@brand.com"
                      className="input-dark flex-1 font-mono"
                      autoComplete="email"
                      aria-label="Email for the full audit report"
                    />
                    <button
                      type="button"
                      onClick={submitLead}
                      disabled={leadState === 'sending'}
                      className="btn-ghost whitespace-nowrap border-cyan-700/60 text-cyan-200 hover:border-cyan-500 hover:text-cyan-100"
                    >
                      <Send className="h-4 w-4" />
                      {leadState === 'sending' ? 'Sending…' : 'Email my report'}
                    </button>
                  </div>
                  {leadState === 'error' && (
                    <p className="mt-2 text-sm text-rose-400">
                      Enter a valid email address to receive the report.
                    </p>
                  )}
                  <p className="telemetry mt-3">No spam, no list — one report, one reply.</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
