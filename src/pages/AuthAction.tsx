import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Terminal, Loader2, ShieldCheck, AlertTriangle, Check } from 'lucide-react';
import {
  applyActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from 'firebase/auth';
import { auth, isDemoMode } from '../lib/firebase';

/**
 * The studio's own handler for Firebase email action links (verification,
 * password reset, email change). Firebase appends ?mode=&oobCode= to the
 * custom action URL configured in Authentication → Templates, so the link
 * in every auth email lands on syncopsstudio.web.app — branded, on our
 * domain — instead of the default firebaseapp.com handler page.
 */

type Phase =
  | { kind: 'working' }
  | { kind: 'reset-form'; code: string }
  | { kind: 'done'; title: string; body: string }
  | { kind: 'error'; body: string };

export default function AuthAction() {
  const [params] = useSearchParams();
  const [phase, setPhase] = useState<Phase>({ kind: 'working' });
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const mode = params.get('mode') ?? '';
    const code = params.get('oobCode') ?? '';
    if (isDemoMode || !auth) {
      setPhase({ kind: 'error', body: 'This link cannot be used in the demo environment.' });
      return;
    }
    if (!code) {
      setPhase({
        kind: 'error',
        body: 'This link is incomplete. Please use the newest email from the studio, or request a fresh link.',
      });
      return;
    }
    const liveAuth = auth;
    (async () => {
      try {
        if (mode === 'resetPassword') {
          await verifyPasswordResetCode(liveAuth, code);
          setPhase({ kind: 'reset-form', code });
        } else if (mode === 'verifyEmail') {
          await applyActionCode(liveAuth, code);
          setPhase({
            kind: 'done',
            title: 'Email verified',
            body: 'Your email address is verified. Your projects, payments and deliveries are now unlocked in the portal.',
          });
        } else if (mode === 'verifyAndChangeEmail') {
          await applyActionCode(liveAuth, code);
          setPhase({
            kind: 'done',
            title: 'Email changed',
            body: 'Your account email has been updated to this address. Sign in with it from now on.',
          });
        } else if (mode === 'recoverEmail') {
          await applyActionCode(liveAuth, code);
          setPhase({
            kind: 'done',
            title: 'Email restored',
            body: 'Your previous account email has been restored. If you did not ask for this, contact the studio immediately.',
          });
        } else {
          setPhase({
            kind: 'error',
            body: 'This link type is not recognised. Please request a fresh link from the sign-in page.',
          });
        }
      } catch {
        setPhase({
          kind: 'error',
          body: 'This link has expired or was already used. Please request a fresh one from the sign-in page.',
        });
      }
    })();
  }, [params]);

  const submitReset = async (e: FormEvent) => {
    e.preventDefault();
    if (phase.kind !== 'reset-form' || busy || !auth) return;
    if (password.length < 12) {
      setFormError('Password must be at least 12 characters.');
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await confirmPasswordReset(auth, phase.code, password);
      setPhase({
        kind: 'done',
        title: 'Password set',
        body: 'Your new password is active. Sign in with it to reach your portal.',
      });
    } catch {
      setFormError('This reset link has expired. Please request a fresh one from the sign-in page.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400">
            <Terminal className="h-5 w-5" />
          </span>
          <p className="h-display text-lg">SyncOps Studio</p>
        </div>

        <div className="glass rounded-xl p-6">
          {phase.kind === 'working' && (
            <div className="flex items-center gap-3 text-slate-300">
              <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
              <p className="text-sm">Checking your link…</p>
            </div>
          )}

          {phase.kind === 'reset-form' && (
            <form onSubmit={submitReset}>
              <h1 className="h-display text-xl">Set a new password</h1>
              <p className="mt-2 text-sm text-slate-400">
                Choose a new password for your SyncOps Studio account — at least 12 characters.
              </p>
              <label htmlFor="aa-password" className="label-dark mt-5 block">
                New password
              </label>
              <input
                id="aa-password"
                type="password"
                className="input-dark"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Minimum 12 characters"
              />
              {formError && (
                <div className="mt-3 flex items-start gap-2 rounded-md border border-rose-800/60 bg-rose-950/50 px-3 py-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  <p className="text-sm text-rose-200">{formError}</p>
                </div>
              )}
              <button type="submit" disabled={busy || !password} className="btn-primary mt-5 w-full">
                {busy ? 'Setting…' : 'Set password'}
              </button>
            </form>
          )}

          {phase.kind === 'done' && (
            <div>
              <p className="flex items-center gap-2 text-emerald-400">
                <Check className="h-5 w-5" />
                <span className="h-display text-xl text-slate-50">{phase.title}</span>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{phase.body}</p>
              <Link to="/client/login" className="btn-primary mt-6 inline-flex">
                Go to sign in
              </Link>
            </div>
          )}

          {phase.kind === 'error' && (
            <div>
              <p className="flex items-center gap-2 text-rose-300">
                <AlertTriangle className="h-5 w-5" />
                <span className="h-display text-xl text-slate-50">Link problem</span>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{phase.body}</p>
              <Link to="/client/login" className="btn-ghost mt-6 inline-flex">
                Back to sign in
              </Link>
            </div>
          )}
        </div>

        <p className="telemetry mt-5 flex items-center justify-center gap-1.5 text-center">
          <ShieldCheck className="h-3.5 w-3.5" /> handled on syncopsstudio.web.app — the studio&apos;s own domain
        </p>
      </div>
    </div>
  );
}
