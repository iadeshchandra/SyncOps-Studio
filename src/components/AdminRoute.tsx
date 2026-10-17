import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useIsAdmin } from '../lib/admin';

/**
 * Owner-only route guard for the Studio Console.
 * Admin = owner email (VITE_OWNER_EMAILS) or a successful read of the
 * owner-gated `platformConfig/admins` doc (see lib/admin.ts). In demo mode
 * the demo client account is treated as the owner so the console stays
 * explorable with zero configuration.
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

  if (!user) return <Navigate to="/client/login" replace />;

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
