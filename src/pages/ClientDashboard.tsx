import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Terminal,
  LogOut,
  Package,
  Loader2,
  PackageCheck,
  MessageSquare,
  ArrowRight,
  Plus,
  Clock3,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { loadProfile, profileProgress } from '../lib/profile';
import type { ClientProfile } from '../lib/profile';
import { useHireModal } from '../components/HireModal';
import { listMyOrders, getOrderSignals, orderRef, STAGES } from '../lib/portal';
import type { Order, OrderSignals } from '../lib/portal';
import { cx } from '../lib/format';

interface Row {
  order: Order;
  signals: OrderSignals | null;
}

function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (s === 'completed') return 'border-violet-700/60 bg-violet-950/50 text-violet-300';
  if (s === 'delivered') return 'border-emerald-700/60 bg-emerald-950/50 text-emerald-300';
  if (s === 'intake') return 'border-amber-700/60 bg-amber-950/50 text-amber-300';
  return 'border-cyan-700/60 bg-cyan-950/50 text-cyan-300';
}

function VerifyEmailBanner() {
  const { user, resendVerification } = useAuth();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!user || user.emailVerified !== false) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-amber-700/50 bg-amber-950/30 px-4 py-3">
      <ShieldAlert className="h-5 w-5 shrink-0 text-amber-400" />
      <p className="min-w-0 flex-1 text-sm text-amber-100">
        <span className="font-bold">Verify your email to unlock your projects.</span>{' '}
        We sent a verification link to {user.email}. Until it is clicked, your projects,
        payments and deliveries stay locked — this protects your account from anyone who
        might register with your address.
      </p>
      <button
        type="button"
        disabled={busy || sent}
        onClick={async () => {
          setBusy(true);
          try {
            await resendVerification();
            setSent(true);
          } finally {
            setBusy(false);
          }
        }}
        className="btn-ghost px-3.5 py-2 text-xs"
      >
        {sent ? 'Verification email sent' : busy ? 'Sending…' : 'Resend verification email'}
      </button>
    </div>
  );
}

export default function ClientDashboard() {
  const { user, signOut } = useAuth();
  const { openHireModal } = useHireModal();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    loadProfile(user.uid)
      .then((p) => {
        if (!cancelled) {
          setProfile(p);
          setProfileLoaded(true);
        }
      })
      .catch(() => {
        /* profile is guidance, never a blocker */
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const mine = await listMyOrders(user?.email ?? '');
      const withSignals = await Promise.all(
        mine.map(async (order) => {
          try {
            return { order, signals: await getOrderSignals(order.id) };
          } catch {
            return { order, signals: null };
          }
        }),
      );
      // Orders needing the client's review first, then newest.
      withSignals.sort((a, b) => {
        const pa = (a.signals?.pendingDeliveries ?? 0) > 0 ? 0 : 1;
        const pb = (b.signals?.pendingDeliveries ?? 0) > 0 ? 0 : 1;
        return pa - pb || b.order.createdAt - a.order.createdAt;
      });
      if (!cancelled) setRows(withSignals);
    };
    load()
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  const handleSignOut = () => {
    signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const awaitingReview = rows.filter((r) => (r.signals?.pendingDeliveries ?? 0) > 0);
  const inboxRows = rows.filter((r) => r.signals?.latestMessage);

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <VerifyEmailBanner />
        <header className="glass flex flex-wrap items-center gap-3 rounded-xl px-4 py-3.5 sm:px-5">
          <Link to="/" className="flex items-center gap-2.5" aria-label="SyncOps Studio home">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400">
              <Terminal className="h-4 w-4" />
            </span>
            <p className="h-display text-sm">SyncOps Studio</p>
          </Link>
          <span className="hidden h-5 w-px bg-slate-800 sm:block" />
          <p className="telemetry">my_account</p>
          <div className="ml-auto flex items-center gap-3">
            <p className="hidden text-sm text-slate-300 sm:block">
              <span className="text-slate-500">Signed in as </span>
              <span className="font-semibold">{user?.name ?? user?.email}</span>
            </p>
            <Link to="/client/profile" className="btn-ghost px-3.5 py-2 text-xs">
              Profile
            </Link>
            <button onClick={handleSignOut} className="btn-ghost px-3.5 py-2 text-xs">
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </header>

        <div className="mt-8">
          <p className="eyebrow">welcome back</p>
          <h1 className="h-display mt-1 text-3xl">{user?.name ?? 'Your account'}</h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Every project with the studio, its messages and its deliveries — in one place.
          </p>
        </div>

        {profileLoaded &&
          (() => {
            const prog = profileProgress(profile);
            if (prog.done >= prog.total) return null;
            const needsPhoneForIntake =
              !profile?.phone && rows.some((r) => r.order.status === 'intake');
            return (
              <div className="glass mt-6 rounded-xl p-5">
                <p className="font-semibold text-slate-100">
                  Complete your profile — {prog.done} of {prog.total} done
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  A complete profile means the studio can reach you fast and your projects
                  stay unmistakably yours — one account, one email, one phone number.
                </p>
                {needsPhoneForIntake && (
                  <p className="mt-2 text-sm font-semibold text-amber-300">
                    Add your phone number so work can start on your project.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {prog.gaps.map((g) => (
                    <Link
                      key={g.id}
                      to="/client/profile"
                      className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-cyan-600"
                    >
                      Add: {g.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })()}

        {failed && user?.emailVerified === false ? (
          <div className="glass mt-6 rounded-xl p-5 text-sm text-slate-300">
            Your projects unlock here as soon as your email is verified — one click on the
            link we sent you (the banner above can resend it). This pause is deliberate: it
            keeps anyone who registers with your address from ever seeing your projects.
          </div>
        ) : failed ? (
          <div className="glass mt-6 rounded-xl border-rose-800/60 p-5 text-sm text-rose-300">
            We couldn&apos;t load your projects just now. Please refresh, or email the studio at
            iadeshchandra@gmail.com.
          </div>
        ) : null}

        {!failed && rows.length === 0 && (
          <div className="glass mt-6 rounded-xl p-8 text-center">
            <Package className="mx-auto h-10 w-10 text-cyan-400" />
            <h2 className="h-display mt-4 text-xl">No projects yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
              This account doesn&apos;t have a project with the studio yet. When you start one, it
              will live here — milestones, messages and deliveries.
            </p>
            <Link to="/" className="btn-primary mt-6 inline-flex">
              <Plus className="h-4 w-4" /> Start a project
            </Link>
          </div>
        )}

        {awaitingReview.length > 0 && (
          <div className="mt-6 rounded-xl border border-amber-700/50 bg-amber-950/30 p-5">
            <p className="flex items-center gap-2 font-semibold text-amber-200">
              <PackageCheck className="h-5 w-5" /> A delivery is waiting for your review
            </p>
            <div className="mt-3 space-y-2">
              {awaitingReview.map((r) => (
                <Link
                  key={r.order.id}
                  to={`/client/portal/${r.order.id}?tab=deliveries`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-amber-800/50 bg-slate-950/60 px-3.5 py-2.5 transition-colors hover:border-amber-600"
                >
                  <span className="font-semibold text-slate-100">
                    {r.order.packageName || r.order.packageId}
                  </span>
                  <span className="telemetry text-cyan-300/80">{orderRef(r.order)}</span>
                  <span className="text-sm text-amber-200">
                    {r.signals?.pendingDeliveries} deliver
                    {r.signals?.pendingDeliveries === 1 ? 'y' : 'ies'} to review
                  </span>
                  <ArrowRight className="ml-auto h-4 w-4 text-amber-300" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <>
            <h2 className="h-display mt-8 text-lg">Your projects</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {rows.map((r) => (
                <Link
                  key={r.order.id}
                  to={`/client/portal/${r.order.id}`}
                  className="glass card-hover rounded-xl p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cx(
                        'rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
                        statusTone(r.order.status),
                      )}
                    >
                      {r.order.status}
                    </span>
                    {(r.signals?.pendingDeliveries ?? 0) > 0 && (
                      <span className="rounded border border-amber-700/60 bg-amber-950/50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                        {r.signals?.pendingDeliveries} to review
                      </span>
                    )}
                    <span className="telemetry ml-auto">{orderRef(r.order)}</span>
                  </div>
                  <p className="mt-3 font-semibold text-slate-50">
                    {r.order.packageName || r.order.packageId}
                  </p>
                  <p className="telemetry mt-1">{r.order.brandUrl}</p>
                  <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-400">
                    <Clock3 className="h-4 w-4 text-slate-500" />
                    Stage {r.order.stageIndex + 1} of {STAGES.length} ·{' '}
                    {STAGES[r.order.stageIndex]?.title ?? ''}
                    <span className="text-slate-600">·</span>
                    due{' '}
                    {new Date(r.order.deadlineAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openHireModal({ packageId: r.order.packageId });
                    }}
                    className="btn-ghost mt-4 px-3.5 py-2 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" /> Book this package again
                  </button>
                </Link>
              ))}
            </div>
          </>
        )}

        {inboxRows.length > 0 && (
          <>
            <h2 className="h-display mt-8 flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-indigo-400" /> Latest messages
            </h2>
            <div className="mt-3 space-y-2">
              {inboxRows.map((r) => (
                <Link
                  key={r.order.id}
                  to={`/client/portal/${r.order.id}?tab=chat`}
                  className="glass flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-4 py-3 transition-colors hover:border-slate-600"
                >
                  <span className="font-semibold text-slate-100">
                    {r.order.packageName || r.order.packageId}
                  </span>
                  <span className="telemetry">
                    {r.signals?.latestMessage?.sender === 'architect' ? 'Studio: ' : 'You: '}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-400">
                    {r.signals?.latestMessage?.body}
                  </span>
                  <span className="telemetry">
                    {new Date(r.signals?.latestMessage?.createdAt ?? 0).toLocaleDateString(
                      'en-US',
                      { month: 'short', day: 'numeric' },
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="glass mt-8 flex flex-wrap items-center gap-3 rounded-xl p-5">
          <div>
            <p className="font-semibold text-slate-100">{user?.email}</p>
            <p className="telemetry">your studio account — projects, messages and deliveries</p>
          </div>
          <Link to="/" className="btn-primary ml-auto inline-flex px-4 py-2.5 text-sm">
            <Plus className="h-4 w-4" /> Start a new project
          </Link>
        </div>

        <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-900/40 px-5 py-4">
          <p className="text-sm font-semibold text-slate-200">Your data</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-400">
            Your projects, messages, files and reviews belong to you. Ask for an export or for
            deletion at any time — deletion removes them within 30 days. The{' '}
            <Link to="/terms" className="text-cyan-300 underline decoration-cyan-800 underline-offset-2">
              Terms &amp; Refunds
            </Link>{' '}
            spell out the details.
          </p>
          <a
            href="mailto:iadeshchandra@gmail.com?subject=Data%20request%20—%20SyncOps%20Studio%20account"
            className="btn-ghost mt-3 inline-flex px-4 py-2 text-sm"
          >
            Request export or deletion
          </a>
        </div>
      </div>
    </div>
  );
}
