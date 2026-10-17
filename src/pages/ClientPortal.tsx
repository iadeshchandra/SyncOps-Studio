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

  const orderId = id ?? 'demo-8f3a2c';

  const [order, setOrder] = useState<Order | null>(null);
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
    getOrder(orderId)
      .then((o) => {
        if (cancelled) return;
        setOrder(o);
        if (!o) setOrderError('No project found for this portal link.');
      })
      .catch(() => {
        if (!cancelled) setOrderError('Could not load this project. Please retry.');
      })
      .finally(() => {
        if (!cancelled) setOrderLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const refreshRevisions = useCallback(async () => {
    setRevLoading(true);
    try {
      setRevisions(await listRevisions(orderId));
    } catch {
      /* keep previous list on failure */
    } finally {
      setRevLoading(false);
    }
  }, [orderId]);

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
    await createRevision(orderId, type, details);
    await refreshRevisions();
  };

  if (orderLoading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Skeleton />
      </div>
    );
  }

  if (!order || orderError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="glass max-w-md rounded-xl p-8 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-rose-400" />
          <h2 className="h-display mt-4 text-xl">Project not found</h2>
          <p className="mt-2 text-sm text-slate-400">
            {orderError ?? 'This portal link does not match any active project.'}
          </p>
          <Link to="/client/dashboard" className="btn-primary mt-6 inline-flex">
            Open demo project
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
