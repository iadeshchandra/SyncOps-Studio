import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Lock, ShieldAlert } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useIsAdmin } from '../lib/admin';

/**
 * Owner-only route guard for the Studio Console.
 * Admin = owner email (VITE_OWNER_EMAILS) or a successful read of the
 * owner-gated `platformConfig/admins` doc (see lib/admin.ts). In demo mode
 * the demo client account is treated as the owner so the console stays
 * explorable with zero configuration.
 *
 * The console door carries its OWN sign-in (OwnerGate below): a signed-out
 * visitor at the console address signs in right there and is never sent to
 * the client login pages.
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  if (authLoading || adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!user) return <OwnerGate />;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="glass max-w-md rounded-lg p-8 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-rose-400" />
          <p className="eyebrow mt-4">restricted_area</p>
          <h1 className="h-display mt-2 text-xl">Owner access only</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            The Studio Console is reserved for the studio owner. You are signed in as{' '}
            <span className="font-mono text-slate-300">{user.email}</span>.
          </p>
          <Link to="/" className="btn-ghost mt-6 w-full">
            Back to site
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * The console's own sign-in panel. Email + password and Google, using the
 * same auth helpers as the public login page — but rendered at the console
 * address itself, so the owner never passes through the client portal.
 * A successful sign-in re-renders AdminRoute straight into the console.
 */
function OwnerGate() {
  const { signInEmail, signInGoogle, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await signInEmail(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await signInGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function onForgot() {
    if (!email.trim()) {
      setError('Enter your email above first, then tap Forgot password.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await resetPassword(email.trim());
      setNotice('Password reset email sent — set the new password from your inbox.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset email.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="glass w-full max-w-md rounded-lg p-8">
        <Lock className="mx-auto h-10 w-10 text-cyan-400" />
        <p className="eyebrow mt-4 text-center">owner_access</p>
        <h1 className="h-display mt-2 text-center text-xl">Studio Console</h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-slate-400">
          This door is for the studio owner only. Sign in here — clients never see this page.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
          />
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
          />
          {error && <p className="text-sm text-rose-400">{error}</p>}
          {notice && <p className="text-sm text-emerald-400">{notice}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <button
          type="button"
          onClick={onForgot}
          disabled={busy}
          className="mt-3 w-full text-center text-xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
        >
          Forgot password?
        </button>

        <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest text-slate-500">
          <span className="h-px flex-1 bg-slate-800" />
          or
          <span className="h-px flex-1 bg-slate-800" />
        </div>

        <button type="button" onClick={onGoogle} disabled={busy} className="btn-ghost w-full">
          Continue with Google
        </button>

        <Link to="/" className="mt-6 block text-center text-xs text-slate-500 hover:text-slate-300">
          Back to site
        </Link>
      </div>
    </div>
  );
}
