import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Activity,
  Chrome,
  Zap,
  AlertTriangle,
  Loader2,
  Terminal,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { isDemoMode } from '../lib/firebase';
import { cx } from '../lib/format';

const TESTIMONIALS = [
  {
    quote: 'Signal loss was eating 31% of our attributed revenue. SyncOps recovered it in eleven days.',
    name: 'Maya R.',
    role: 'CMO, $40M beauty brand',
  },
  {
    quote: 'The cleanest server-side migration we have ever run. Zero downtime on Black Friday traffic.',
    name: 'Daniel K.',
    role: 'Founder, Shopify Plus apparel',
  },
  {
    quote: 'EMQ went from 4.2 to 9.3. Our media buyers finally trust the dashboard again.',
    name: 'Sofia L.',
    role: 'Head of Growth, DTC wellness',
  },
];

const BADGES = [
  { icon: ShieldCheck, label: 'Zero-trust auth' },
  { icon: Lock, label: 'Encrypted channel' },
  { icon: Activity, label: '99.99% SLA' },
];

export default function Login() {
  const { user, loading, signInDemo, signInEmail, signUpEmail, signInGoogle } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }
  if (user) return <Navigate to="/client/dashboard" replace />;

  const go = () => navigate('/client/dashboard');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (tab === 'signin') await signInEmail(email.trim(), password);
      else await signUpEmail(name.trim(), email.trim(), password);
      go();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signInGoogle();
      go();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const demo = () => {
    signInDemo();
    go();
  };

  return (
    <div className="grid min-h-screen bg-slate-950 lg:grid-cols-2">
      {/* left showcase panel */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-950/60 via-slate-950 to-slate-950"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-emerald-500/10 blur-3xl"
        />

        <div className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400">
            <Terminal className="h-5 w-5" />
          </span>
          <p className="h-display text-lg">SyncOps Studio</p>
        </div>

        <div className="relative max-w-xl">
          <p className="eyebrow mb-4">client_portal</p>
          <h1 className="h-display text-4xl leading-tight xl:text-5xl">
            Your tracking infrastructure, engineered live.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-400">
            Watch every milestone land in real time — provisioning, QA, deduplication — and talk
            directly to the Lead Architect building it.
          </p>

          <div className="mt-8 space-y-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="glass rounded-lg p-4">
                <blockquote className="text-sm leading-relaxed text-slate-300">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  {t.name} — {t.role}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="flex flex-wrap items-center gap-2.5">
            {BADGES.map((b) => (
              <span
                key={b.label}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-300"
              >
                <b.icon className="h-3.5 w-3.5 text-emerald-400" />
                {b.label}
              </span>
            ))}
          </div>
          <p className="telemetry mt-4">uptime: 99.99% · nodes: 6/6 online · edge_latency: 12ms</p>
        </div>
      </div>

      {/* right auth panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {isDemoMode && (
            <div className="mb-5 flex items-start gap-2 rounded-md border border-amber-700/60 bg-amber-950/40 px-3.5 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-sm text-amber-200">
                <span className="font-bold">Demo environment</span> — no Firebase configured. Any
                well-formed email works here.
              </p>
            </div>
          )}

          <p className="eyebrow mb-2">client_access</p>
          <h2 className="h-display text-2xl">Project Tracking Portal</h2>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to follow your build, message your architect, and open the credentials vault.
          </p>

          {/* tabs */}
          <div className="mt-6 grid grid-cols-2 rounded-md border border-slate-800 bg-slate-950/70 p-1">
            {(['signin', 'signup'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setError(null);
                }}
                className={cx(
                  'rounded px-4 py-2.5 text-sm font-bold transition-all',
                  tab === t ? 'bg-slate-800 text-slate-50' : 'text-slate-500 hover:text-slate-300',
                )}
              >
                {t === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            {tab === 'signup' && (
              <div>
                <label htmlFor="login-name" className="label-dark">
                  Full name
                </label>
                <input
                  id="login-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ava Founder"
                  className="input-dark"
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <label htmlFor="login-email" className="label-dark">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@brand.com"
                className="input-dark"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="label-dark">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="input-dark"
                autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-rose-800/60 bg-rose-950/50 px-3 py-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <p className="text-sm text-rose-200">{error}</p>
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {tab === 'signin' ? 'Signing in…' : 'Creating account…'}
                </>
              ) : tab === 'signin' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-800" />
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">or</p>
            <span className="h-px flex-1 bg-slate-800" />
          </div>

          <button onClick={google} disabled={busy} className="btn-ghost w-full">
            <Chrome className="h-4 w-4 text-slate-300" />
            Continue with Google
          </button>

          <button onClick={demo} className="btn-ghost mt-3 w-full border-emerald-700/60 bg-emerald-950/40 hover:border-emerald-500/70">
            <Zap className="h-4 w-4 text-emerald-400" />
            Continue with Demo Client Account
          </button>

          <p className="telemetry mt-6 text-center">
            protected by zero-trust session guard · soc2-aligned ops
          </p>
        </div>
      </div>
    </div>
  );
}
