import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Terminal,
  LogOut,
  MessageSquare,
  KeyRound,
  FileEdit,
  Plus,
  Pencil,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Globe,
  Package,
  Banknote,
  Info,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { isDemoMode } from '../lib/firebase';
import {
  getOrder,
  listMyOrders,
  listRevisions,
  createRevision,
} from '../lib/portal';
import type { Order, RevisionRequest } from '../lib/portal';
import MilestoneTracker from '../components/MilestoneTracker';
import SlaTimer from '../components/SlaTimer';
import RevisionModal from '../components/RevisionModal';
import ArchitectChat from '../components/ArchitectChat';
import VaultPanel from '../components/VaultPanel';
import { fmtUSD, cx } from '../lib/format';

type Tab = 'chat' | 'vault' | 'revisions';

const TABS: { key: Tab; label: string; icon: typeof MessageSquare }[] = [
  { key: 'chat', label: 'Architect Channel', icon: MessageSquare },
  { key: 'vault', label: 'Vault', icon: KeyRound },
  { key: 'revisions', label: 'Revisions', icon: FileEdit },
];

const REV_TYPE_META = {
  addition: { icon: Plus, label: 'Addition', tone: 'text-emerald-400 border-emerald-700/60 bg-emerald-950/50' },
  change: { icon: Pencil, label: 'Change', tone: 'text-cyan-400 border-cyan-700/60 bg-cyan-950/50' },
  revision: { icon: RefreshCw, label: 'Revision', tone: 'text-amber-400 border-amber-700/60 bg-amber-950/50' },
} as const;

const REV_STATUS_TONE = {
  pending: 'text-amber-300 border-amber-700/60 bg-amber-950/50',
  approved: 'text-emerald-300 border-emerald-700/60 bg-emerald-950/50',
  declined: 'text-rose-300 border-rose-800/60 bg-rose-950/50',
} as const;

function Skeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-8 sm:px-6">
      <div className="h-14 rounded-xl bg-slate-900/70" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="h-96 rounded-xl bg-slate-900/70" />
        <div className="space-y-6">
          <div className="h-36 rounded-xl bg-slate-900/70" />
          <div className="h-64 rounded-xl bg-slate-900/70" />
        </div>
      </div>
    </div>
  );
}

export default function ClientPortal() {
  const { id } = useParams();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [noProjects, setNoProjects] = useState(false);
  const [orderLoading, setOrderLoading] = useState(true);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('chat');
  const [revisions, setRevisions] = useState<RevisionRequest[]>([]);
  const [revLoading, setRevLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setOrderLoading(true);
    setOrderError(null);
    setNoProjects(false);
    const load = async () => {
      if (id) {
        const o = await getOrder(id);
        if (cancelled) return;
        setOrder(o);
        if (!o) setOrderError('notfound');
      } else {
        const mine = await listMyOrders(user?.email ?? '');
        if (cancelled) return;
        setMyOrders(mine);
        setOrder(mine[0] ?? null);
        if (mine.length === 0) setNoProjects(true);
      }
    };
    load()
      .catch(() => {
        if (!cancelled) setOrderError('failed');
      })
      .finally(() => {
        if (!cancelled) setOrderLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, user?.email]);

  const activeOrderId = order?.id;
  const refreshRevisions = useCallback(async () => {
    if (!activeOrderId) {
      setRevisions([]);
      return;
    }
    setRevLoading(true);
    try {
      setRevisions(await listRevisions(activeOrderId));
    } catch {
      /* keep previous list on failure */
    } finally {
      setRevLoading(false);
    }
  }, [activeOrderId]);

  useEffect(() => {
    void refreshRevisions();
  }, [refreshRevisions]);

  const handleSignOut = () => {
    signOut();
    navigate('/');
  };

  const handleRevisionSubmit = async (
    type: 'addition' | 'change' | 'revision',
    details: string,
  ) => {
    if (!order) return;
    await createRevision(order.id, type, details);
    await refreshRevisions();
  };

  if (orderLoading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Skeleton />
      </div>
    );
  }

  if (noProjects) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="glass max-w-md rounded-xl p-8 text-center">
          <Package className="mx-auto h-10 w-10 text-cyan-400" />
          <h2 className="h-display mt-4 text-xl">No projects yet</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            This account doesn&apos;t have a project with the studio yet. When you start one, its
            portal — milestones, architect messages and deliverables — will live here.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/" className="btn-primary inline-flex">
              Explore the studio
            </Link>
            <button onClick={handleSignOut} className="btn-ghost inline-flex px-4 py-2.5 text-sm">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!order || orderError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="glass max-w-md rounded-xl p-8 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-rose-400" />
          <h2 className="h-display mt-4 text-xl">We couldn&apos;t open this project</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {orderError === 'notfound'
              ? "This portal link doesn't match any project we can find. It may be incomplete or from an older email."
              : "The project couldn't be loaded. The most common cause: you're signed in with a different email than the one the project was created under."}
          </p>
          {user?.email && (
            <p className="telemetry mt-3">
              signed in as <span className="text-slate-300">{user.email}</span>
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/client/dashboard" className="btn-primary inline-flex">
              Go to my projects
            </Link>
            <a href="mailto:iadeshchandra@gmail.com" className="btn-ghost inline-flex px-4 py-2.5 text-sm">
              Email the studio
            </a>
          </div>
          <Link to="/" className="mt-4 inline-block text-sm text-slate-500 underline-offset-4 hover:text-slate-300 hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {isDemoMode && (
          <div className="mb-5 flex items-start gap-2 rounded-md border border-amber-700/60 bg-amber-950/40 px-3.5 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-sm text-amber-200">
              <span className="font-bold">Demo environment</span> — project data is stored locally
              in this browser. Connect Firebase to go live.
            </p>
          </div>
        )}

        {/* top bar */}
        <header className="glass flex flex-wrap items-center gap-3 rounded-xl px-4 py-3.5 sm:px-5">
          <Link to="/" className="flex items-center gap-2.5" aria-label="SyncOps Studio home">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400">
              <Terminal className="h-4 w-4" />
            </span>
            <p className="h-display text-sm">SyncOps Studio</p>
          </Link>
          <span className="hidden h-5 w-px bg-slate-800 sm:block" />
          <p className="telemetry">
            order_<span className="text-slate-300">{order.id}</span>
          </p>
          <div className="ml-auto flex items-center gap-3">
            <p className="hidden text-sm text-slate-300 sm:block">
              <span className="text-slate-500">Signed in as </span>
              <span className="font-semibold">{user?.name ?? order.clientName}</span>
            </p>
            <button onClick={handleSignOut} className="btn-ghost px-3.5 py-2 text-xs">
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </header>

        {!id && myOrders.length > 1 && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="telemetry">your projects</span>
            {myOrders.map((o) => (
              <Link
                key={o.id}
                to={`/client/portal/${o.id}`}
                className={cx(
                  'rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors',
                  o.id === order.id
                    ? 'border-emerald-700/60 bg-emerald-950/50 text-emerald-300'
                    : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200',
                )}
              >
                {o.packageName}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* left column */}
          <div className="space-y-6">
            <MilestoneTracker stageIndex={order.stageIndex} />

            <div className="glass rounded-xl p-6">
              <p className="eyebrow mb-1">project_meta</p>
              <h3 className="h-display text-lg">Project Details</h3>
              <dl className="mt-4 space-y-3.5">
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 shrink-0 text-indigo-400" />
                  <dt className="sr-only">Package</dt>
                  <dd className="text-sm text-slate-200">
                    <span className="font-semibold">{order.packageName}</span>
                    <span className="telemetry ml-2">{order.packageId}</span>
                  </dd>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 shrink-0 text-cyan-400" />
                  <dt className="sr-only">Brand</dt>
                  <dd className="font-mono text-sm text-slate-200">{order.brandUrl}</dd>
                </div>
                <div className="flex items-center gap-3">
                  <Banknote className="h-4 w-4 shrink-0 text-emerald-400" />
                  <dt className="sr-only">Monthly ad spend</dt>
                  <dd className="text-sm text-slate-200">
                    <span className="font-mono font-bold">{fmtUSD(order.adSpend)}</span>
                    <span className="text-slate-500"> / mo ad spend</span>
                  </dd>
                </div>
                <div className="pt-1">
                  <span className="inline-flex items-center rounded-md border border-emerald-700/60 bg-emerald-950/50 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-300">
                    {order.status}
                  </span>
                </div>
              </dl>
            </div>
          </div>

          {/* right column */}
          <div className="space-y-6">
            <SlaTimer deadlineAt={order.deadlineAt} />

            {/* tabs */}
            <div className="flex gap-1.5 rounded-lg border border-slate-800/80 bg-slate-900/50 p-1.5">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cx(
                    'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold transition-all',
                    tab === t.key
                      ? 'bg-slate-800 text-slate-50 shadow'
                      : 'text-slate-500 hover:text-slate-300',
                  )}
                >
                  <t.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>

            {tab === 'chat' && <ArchitectChat orderId={order.id} />}

            {tab === 'vault' && <VaultPanel order={order} />}

            {tab === 'revisions' && (
              <div className="glass rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="eyebrow mb-1">scope_revisions</p>
                    <h3 className="h-display text-lg">Revision Requests</h3>
                  </div>
                  <button onClick={() => setModalOpen(true)} className="btn-primary px-4 py-2.5 text-sm">
                    <Plus className="h-4 w-4" />
                    Request Revision
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {revLoading && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                    </div>
                  )}
                  {!revLoading && revisions.length === 0 && (
                    <p className="telemetry rounded-lg border border-slate-800/80 bg-slate-950/60 px-4 py-6 text-center">
                      no revision requests yet — scope is locked and on track.
                    </p>
                  )}
                  {revisions.map((r) => {
                    const meta = REV_TYPE_META[r.type];
                    return (
                      <div
                        key={r.id}
                        className="rounded-lg border border-slate-800/80 bg-slate-950/60 px-4 py-3.5"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cx(
                              'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em]',
                              meta.tone,
                            )}
                          >
                            <meta.icon className="h-3.5 w-3.5" />
                            {meta.label}
                          </span>
                          <span
                            className={cx(
                              'inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em]',
                              REV_STATUS_TONE[r.status],
                            )}
                          >
                            {r.status}
                          </span>
                          <p className="telemetry ml-auto">
                            {new Date(r.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <p className="mt-2.5 text-sm leading-relaxed text-slate-300">{r.details}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <RevisionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleRevisionSubmit}
      />
    </div>
  );
}
