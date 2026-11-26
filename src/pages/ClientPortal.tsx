import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
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
  PackageCheck,
  ExternalLink,
  CheckCircle2,
  History,
  Star,
  ListChecks,
  Wallet,
  Circle,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { isDemoMode } from '../lib/firebase';
import {
  getOrder,
  listMyOrders,
  listRevisions,
  createRevision,
  listDeliveries,
  respondDelivery,
  paidTotal,
  updateOrder,
  getIntakeForm,
  saveIntakeForm,
} from '../lib/portal';
import { ACCESS_CHECKLIST, checklistProgress } from '../lib/checklist';
import OrderFiles from '../components/OrderFiles';
import { openInvoice } from '../lib/invoice';
import {
  getPaymentSettings,
  listClaims,
  createClaim,
  type PaymentSettings,
  type PaymentClaim,
} from '../lib/payments';
import { getReview, submitReview } from '../lib/reviews';
import type { Review } from '../lib/reviews';
import { PACKAGES } from '../data/content';
import { DEFAULT_SITE_CONFIG } from '../lib/siteConfig';
import type { Order, RevisionRequest, Delivery } from '../lib/portal';
import { orderRef } from '../lib/portal';
import MilestoneTracker from '../components/MilestoneTracker';
import SlaTimer from '../components/SlaTimer';
import RevisionModal from '../components/RevisionModal';
import ArchitectChat from '../components/ArchitectChat';
import VaultPanel from '../components/VaultPanel';
import { fmtUSD, cx } from '../lib/format';

type Tab = 'chat' | 'deliveries' | 'vault' | 'revisions';

const TABS: { key: Tab; label: string; icon: typeof MessageSquare }[] = [
  { key: 'chat', label: 'Architect Channel', icon: MessageSquare },
  { key: 'deliveries', label: 'Deliveries', icon: PackageCheck },
  { key: 'vault', label: 'Vault', icon: KeyRound },
  { key: 'revisions', label: 'Revisions', icon: FileEdit },
];

const DELIVERY_TONE: Record<Delivery['status'], string> = {
  pending: 'text-amber-300 border-amber-700/60 bg-amber-950/50',
  accepted: 'text-emerald-300 border-emerald-700/60 bg-emerald-950/50',
  revision: 'text-rose-300 border-rose-800/60 bg-rose-950/50',
};

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
  const [searchParams] = useSearchParams();

  const [order, setOrder] = useState<Order | null>(null);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [noProjects, setNoProjects] = useState(false);
  const [orderLoading, setOrderLoading] = useState(true);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get('tab');
    return t === 'deliveries' || t === 'vault' || t === 'revisions' ? t : 'chat';
  });
  const [revisions, setRevisions] = useState<RevisionRequest[]>([]);
  const [revLoading, setRevLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [delivLoading, setDelivLoading] = useState(false);
  const [responseNotes, setResponseNotes] = useState<Record<string, string>>({});
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [respondError, setRespondError] = useState<string | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [reviewLoaded, setReviewLoaded] = useState(false);
  const [stars, setStars] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [claims, setClaims] = useState<PaymentClaim[]>([]);
  const [paySettings, setPaySettings] = useState<PaymentSettings | null>(null);
  const [cAmount, setCAmount] = useState('');
  const [cCurrency, setCCurrency] = useState<'BDT' | 'USD'>('BDT');
  const [cMethod, setCMethod] = useState('bKash');
  const [cTrx, setCTrx] = useState('');
  const [cSender, setCSender] = useState('');
  const [cNote, setCNote] = useState('');
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [checklistBusy, setChecklistBusy] = useState<string | null>(null);
  const [intake, setIntake] = useState({
    storePlatform: '',
    adAccountIds: '',
    goals: '',
    assetsNote: '',
    anythingElse: '',
  });
  const [intakeBusy, setIntakeBusy] = useState(false);
  const [intakeSaved, setIntakeSaved] = useState(false);

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

  const refreshDeliveries = useCallback(async () => {
    if (!activeOrderId) {
      setDeliveries([]);
      return;
    }
    setDelivLoading(true);
    try {
      setDeliveries(await listDeliveries(activeOrderId));
    } catch {
      /* keep previous list on failure */
    } finally {
      setDelivLoading(false);
    }
  }, [activeOrderId]);

  useEffect(() => {
    void refreshDeliveries();
  }, [refreshDeliveries]);

  const pendingDeliveries = deliveries.filter((d) => d.status === 'pending').length;

  useEffect(() => {
    if (!activeOrderId) return;
    let cancelled = false;
    getReview(activeOrderId)
      .then((r) => {
        if (!cancelled) setReview(r);
      })
      .catch(() => {
        /* no review yet */
      })
      .finally(() => {
        if (!cancelled) setReviewLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [activeOrderId]);

  const handleSubmitReview = async () => {
    if (!order) return;
    setReviewBusy(true);
    setReviewError(null);
    try {
      await submitReview(order.id, order.clientName, stars, reviewText);
      setReview({
        id: order.id,
        orderId: order.id,
        clientName: order.clientName,
        rating: stars,
        text: reviewText.trim(),
        createdAt: Date.now(),
        published: false,
      });
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : 'Could not save your review.');
    } finally {
      setReviewBusy(false);
    }
  };

  useEffect(() => {
    if (!activeOrderId) return;
    let cancelled = false;
    listClaims(activeOrderId)
      .then((c) => {
        if (!cancelled) setClaims(c);
      })
      .catch(() => {
        /* claims are optional until the client pays */
      });
    getPaymentSettings()
      .then((ps) => {
        if (!cancelled) setPaySettings(ps);
      })
      .catch(() => {
        /* payment details simply stay hidden */
      });
    getIntakeForm(activeOrderId)
      .then((f) => {
        if (!cancelled && f) {
          setIntake({
            storePlatform: f.storePlatform,
            adAccountIds: f.adAccountIds,
            goals: f.goals,
            assetsNote: f.assetsNote,
            anythingElse: f.anythingElse,
          });
          setIntakeSaved(true);
        }
      })
      .catch(() => {
        /* form simply starts empty */
      });
    return () => {
      cancelled = true;
    };
  }, [activeOrderId]);

  const toggleChecklist = async (itemId: string) => {
    if (!order) return;
    const next = { ...(order.checklist ?? {}), [itemId]: !order.checklist?.[itemId] };
    setChecklistBusy(itemId);
    try {
      await updateOrder(order.id, { checklist: next });
      setOrder({ ...order, checklist: next });
    } catch {
      /* the tick simply does not save; the client can retry */
    } finally {
      setChecklistBusy(null);
    }
  };

  const handleSaveIntake = async () => {
    if (!order) return;
    setIntakeBusy(true);
    try {
      await saveIntakeForm(order.id, intake);
      setIntakeSaved(true);
    } catch {
      setIntakeSaved(false);
    } finally {
      setIntakeBusy(false);
    }
  };

  const handleSubmitClaim = async () => {
    if (!order) return;
    setClaimBusy(true);
    setClaimError(null);
    try {
      await createClaim(order.id, {
        amount: Number(cAmount),
        currency: cCurrency,
        method: cMethod,
        trxId: cTrx,
        sender: cSender.trim(),
        note: cNote.trim(),
      });
      setClaims(await listClaims(order.id));
      setCAmount('');
      setCTrx('');
      setCNote('');
    } catch (e) {
      setClaimError(e instanceof Error ? e.message : 'Could not submit the claim.');
    } finally {
      setClaimBusy(false);
    }
  };

  const handleRespond = async (d: Delivery, accept: boolean) => {
    if (!order) return;
    setRespondingId(d.id);
    setRespondError(null);
    try {
      const res = await respondDelivery(order, d, accept, responseNotes[d.id] ?? '');
      setOrder({ ...order, status: res.status, activity: res.activity });
      await refreshDeliveries();
    } catch (e) {
      setRespondError(e instanceof Error ? e.message : 'Could not save your response.');
    } finally {
      setRespondingId(null);
    }
  };

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
            ref_<span className="text-slate-300">{orderRef(order)}</span>
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
                {(() => {
                  const agreed =
                    typeof order.price === 'number'
                      ? order.price
                      : ((DEFAULT_SITE_CONFIG.pricing ?? PACKAGES).find(
                          (x) => x.id === order.packageId,
                        )?.price ?? 0);
                  if (agreed <= 0) return null;
                  const paid = paidTotal(order);
                  return (
                    <>
                    <div className="rounded-md border border-slate-800/80 bg-slate-950/60 px-3 py-2.5">
                      <p className="text-sm text-slate-300">
                        Package <span className="font-mono font-bold text-slate-100">{fmtUSD(agreed)}</span>
                        <span className="text-slate-600"> · </span>
                        Paid <span className="font-mono font-bold text-emerald-300">{fmtUSD(paid)}</span>
                        {agreed - paid > 0 && (
                          <>
                            <span className="text-slate-600"> · </span>
                            Balance{' '}
                            <span className="font-mono font-bold text-amber-300">
                              {fmtUSD(agreed - paid)}
                            </span>
                          </>
                        )}
                        {agreed - paid <= 0 && (
                          <span className="text-emerald-300"> · paid in full</span>
                        )}
                      </p>
                    </div>

                    {agreed - paid > 0 && paySettings && (paySettings.bkashQrDataUrl || paySettings.bkashNumber || paySettings.wiseNote || paySettings.payoneerNote) && (
                      <div className="rounded-md border border-slate-800/80 bg-slate-950/60 px-3 py-3">
                        <p className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                          <Wallet className="h-4 w-4 text-emerald-400" /> How to pay
                        </p>
                        {paySettings.bkashQrDataUrl && (
                          <img
                            src={paySettings.bkashQrDataUrl}
                            alt="bKash Bangla QR — scan to Send Money"
                            className="mt-3 w-full max-w-[220px] rounded-md border border-slate-700"
                          />
                        )}
                        {paySettings.bkashNumber && (
                          <p className="mt-2 text-sm text-slate-300">
                            bKash Send Money: <span className="font-mono font-bold text-slate-50">{paySettings.bkashNumber}</span>
                          </p>
                        )}
                        {paySettings.wiseNote && (
                          <p className="mt-1 text-sm text-slate-400">Wise: {paySettings.wiseNote}</p>
                        )}
                        {paySettings.payoneerNote && (
                          <p className="mt-1 text-sm text-slate-400">Payoneer: {paySettings.payoneerNote}</p>
                        )}
                        <p className="telemetry mt-2">pay first, then submit the claim below — the studio verifies it</p>
                      </div>
                    )}

                    {agreed - paid > 0 && (
                      <div className="rounded-md border border-slate-800/80 bg-slate-950/60 px-3 py-3">
                        <p className="text-sm font-semibold text-slate-100">Already paid? Tell the studio</p>
                        <div className="mt-2.5 grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            min="0"
                            value={cAmount}
                            onChange={(e) => setCAmount(e.target.value)}
                            placeholder="Amount paid"
                            className="input-dark w-full"
                            aria-label="Amount paid"
                          />
                          <select
                            value={cCurrency}
                            onChange={(e) => setCCurrency(e.target.value as 'BDT' | 'USD')}
                            className="input-dark w-full"
                            aria-label="Currency"
                          >
                            <option value="BDT">BDT (৳)</option>
                            <option value="USD">USD ($)</option>
                          </select>
                          <select
                            value={cMethod}
                            onChange={(e) => setCMethod(e.target.value)}
                            className="input-dark w-full"
                            aria-label="Payment method"
                          >
                            <option value="bKash">bKash</option>
                            <option value="Wise">Wise</option>
                            <option value="Payoneer">Payoneer</option>
                            <option value="Bank transfer">Bank transfer</option>
                            <option value="Other">Other</option>
                          </select>
                          <input
                            type="text"
                            value={cTrx}
                            onChange={(e) => setCTrx(e.target.value)}
                            placeholder="Transaction ID"
                            className="input-dark w-full"
                            aria-label="Transaction ID"
                          />
                          <input
                            type="text"
                            value={cSender}
                            onChange={(e) => setCSender(e.target.value)}
                            placeholder="Your bKash number / name"
                            className="input-dark w-full"
                            aria-label="Sender number or name"
                          />
                          <input
                            type="text"
                            value={cNote}
                            onChange={(e) => setCNote(e.target.value)}
                            placeholder="Note (optional)"
                            className="input-dark w-full"
                            aria-label="Note"
                          />
                        </div>
                        {claimError && <p className="mt-2 text-sm text-rose-300">{claimError}</p>}
                        <button
                          type="button"
                          onClick={() => void handleSubmitClaim()}
                          disabled={claimBusy}
                          className="btn-primary mt-3 px-4 py-2.5 text-sm disabled:opacity-50"
                        >
                          {claimBusy ? 'Submitting…' : 'Submit payment claim'}
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => openInvoice(order, agreed, paySettings)}
                      className="btn-ghost w-fit px-3.5 py-2 text-xs"
                    >
                      Download invoice (PDF)
                    </button>

                    {claims.length > 0 && (
                      <div className="space-y-1.5">
                        {claims.map((c) => (
                          <p key={c.id} className="telemetry flex flex-wrap items-center gap-x-2">
                            <span className="text-slate-200">
                              {c.currency} {c.amount.toLocaleString()}
                            </span>
                            · {c.method} · TrxID {c.trxId} ·{' '}
                            <span
                              className={
                                c.status === 'approved'
                                  ? 'text-emerald-300'
                                  : c.status === 'rejected'
                                    ? 'text-rose-300'
                                    : 'text-amber-300'
                              }
                            >
                              {c.status === 'approved'
                                ? `verified — credited $${c.creditedUsd ?? ''}`
                                : c.status === 'rejected'
                                  ? 'could not be verified'
                                  : 'awaiting verification'}
                            </span>
                          </p>
                        ))}
                      </div>
                    )}
                    </>
                  );
                })()}
                <div className="pt-1">
                  <span className="inline-flex items-center rounded-md border border-emerald-700/60 bg-emerald-950/50 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-300">
                    {order.status}
                  </span>
                </div>
              </dl>
            </div>

            {(order.activity ?? []).length > 0 && (
              <div className="glass rounded-xl p-6">
                <p className="eyebrow mb-1 flex items-center gap-2">
                  <History className="h-3.5 w-3.5 text-cyan-400" /> order_activity
                </p>
                <h3 className="h-display text-lg">Timeline</h3>
                <ol className="mt-4 space-y-3">
                  {[...(order.activity ?? [])].slice(-6).reverse().map((e, i) => (
                    <li key={`${e.at}-${i}`} className="flex gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-400/70" />
                      <div>
                        <p className="text-sm leading-relaxed text-slate-300">{e.text}</p>
                        <p className="telemetry mt-0.5">
                          {new Date(e.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* right column */}
          <div className="space-y-6">
            <SlaTimer deadlineAt={order.deadlineAt} />

            {(order.status === 'intake' || checklistProgress(order).done < checklistProgress(order).total) && (
              <div className="glass rounded-xl p-6">
                <p className="eyebrow mb-1">before_we_start</p>
                <h3 className="h-display flex items-center gap-2 text-lg">
                  <ListChecks className="h-5 w-5 text-cyan-300" /> Access & requirements
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Your project starts as soon as access is in and your payment is verified — without
                  access, no build is possible. Work down the list; every item has the exact steps.
                </p>
                <p className="telemetry mt-3">
                  {checklistProgress(order).done} of {checklistProgress(order).total} access items done
                </p>
                <div className="mt-3 space-y-2">
                  {ACCESS_CHECKLIST.map((item) => {
                    const done = !!order.checklist?.[item.id];
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={checklistBusy === item.id}
                        onClick={() => void toggleChecklist(item.id)}
                        className="flex w-full items-start gap-2.5 rounded-md border border-slate-800/80 bg-slate-950/60 px-3 py-2.5 text-left transition-colors hover:border-slate-600 disabled:opacity-60"
                      >
                        {done ? (
                          <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-400" />
                        ) : (
                          <Circle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-slate-500" />
                        )}
                        <span>
                          <span className={cx('block text-sm font-semibold', done ? 'text-slate-400 line-through' : 'text-slate-100')}>
                            {item.title}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{item.how}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 border-t border-slate-800/80 pt-4">
                  <p className="text-sm font-semibold text-slate-100">Project requirements</p>
                  <div className="mt-2.5 space-y-2.5">
                    <input
                      type="text"
                      value={intake.storePlatform}
                      onChange={(e) => { setIntake({ ...intake, storePlatform: e.target.value }); setIntakeSaved(false); }}
                      placeholder="Store platform — Shopify / WooCommerce / other + store URL"
                      className="input-dark w-full"
                      aria-label="Store platform"
                    />
                    <input
                      type="text"
                      value={intake.adAccountIds}
                      onChange={(e) => { setIntake({ ...intake, adAccountIds: e.target.value }); setIntakeSaved(false); }}
                      placeholder="Ad account IDs — Meta / TikTok / Google (comma separated)"
                      className="input-dark w-full"
                      aria-label="Ad account IDs"
                    />
                    <textarea
                      value={intake.goals}
                      onChange={(e) => { setIntake({ ...intake, goals: e.target.value }); setIntakeSaved(false); }}
                      rows={2}
                      placeholder="What must this tracking prove? (e.g. every Purchase in Meta matching Shopify, within 5%)"
                      className="input-dark w-full"
                      aria-label="Goals"
                    />
                    <input
                      type="text"
                      value={intake.assetsNote}
                      onChange={(e) => { setIntake({ ...intake, assetsNote: e.target.value }); setIntakeSaved(false); }}
                      placeholder="Brand assets — logo/product feed links, or note what you will send"
                      className="input-dark w-full"
                      aria-label="Brand assets"
                    />
                    <textarea
                      value={intake.anythingElse}
                      onChange={(e) => { setIntake({ ...intake, anythingElse: e.target.value }); setIntakeSaved(false); }}
                      rows={2}
                      placeholder="Anything else the studio should know before starting?"
                      className="input-dark w-full"
                      aria-label="Anything else"
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void handleSaveIntake()}
                      disabled={intakeBusy}
                      className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50"
                    >
                      {intakeBusy ? 'Saving…' : 'Save requirements'}
                    </button>
                    {intakeSaved && <span className="telemetry text-emerald-300">saved — the studio can see these</span>}
                  </div>
                </div>
              </div>
            )}

            {order.status === 'completed' && reviewLoaded && (
              <div className="glass rounded-xl p-6">
                <p className="eyebrow mb-1">project_complete</p>
                <h3 className="h-display text-lg">
                  {review ? 'Thank you for your review' : 'How was the studio’s work?'}
                </h3>
                {review ? (
                  <div className="mt-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={cx(
                            'h-4 w-4',
                            n <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600',
                          )}
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">“{review.text}”</p>
                    <p className="telemetry mt-2">
                      {review.published
                        ? 'published on the studio site — thank you.'
                        : 'the studio may publish this on the site.'}
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setStars(n)}
                          aria-label={`${n} stars`}
                          className="p-0.5"
                        >
                          <Star
                            className={cx(
                              'h-6 w-6 transition-colors',
                              n <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-600 hover:text-slate-400',
                            )}
                          />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      rows={3}
                      placeholder="A few honest words about the work — what changed for your store?"
                      className="input-dark w-full"
                      aria-label="Your review"
                    />
                    {reviewError && <p className="text-sm text-rose-300">{reviewError}</p>}
                    <button
                      onClick={() => void handleSubmitReview()}
                      disabled={reviewBusy}
                      className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50"
                    >
                      {reviewBusy ? 'Saving…' : 'Leave review'}
                    </button>
                  </div>
                )}
              </div>
            )}

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
                  {t.key === 'deliveries' && pendingDeliveries > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 font-mono text-[10px] font-bold text-slate-950">
                      {pendingDeliveries}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {tab === 'chat' && <ArchitectChat orderId={order.id} />}

            {tab === 'deliveries' && (
              <div className="glass rounded-xl p-6">
                <p className="eyebrow mb-1">deliveries</p>
                <h3 className="h-display text-lg">Deliveries</h3>
                <p className="mt-1.5 text-sm text-slate-400">
                  Everything the studio hands over lands here. Review each delivery — accept it to
                  complete the order, or send it back with a note on what to change.
                </p>
                {respondError && (
                  <div className="mt-4 flex items-center gap-2 rounded-md border border-rose-800/60 bg-rose-950/50 px-3.5 py-2.5">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                    <p className="text-sm text-rose-200">{respondError}</p>
                  </div>
                )}
                <div className="mt-5 space-y-3">
                  {delivLoading && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                    </div>
                  )}
                  {!delivLoading && deliveries.length === 0 && (
                    <p className="telemetry rounded-lg border border-slate-800/80 bg-slate-950/60 px-4 py-6 text-center">
                      no deliveries yet — your first handover will appear here.
                    </p>
                  )}
                  {deliveries.map((d) => (
                    <div key={d.id} className="rounded-lg border border-slate-800/80 bg-slate-950/60 px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cx('inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em]', DELIVERY_TONE[d.status])}>
                          {d.status === 'revision' ? 'revision requested' : d.status}
                        </span>
                        <p className="telemetry ml-auto">
                          {new Date(d.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <p className="mt-2.5 text-sm leading-relaxed text-slate-300">{d.note}</p>
                      {d.links.length > 0 && (
                        <div className="mt-2.5 space-y-1.5">
                          {d.links.map((l) => (
                            <a key={l} href={l} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-cyan-300 underline-offset-4 hover:underline">
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" /> <span className="break-all">{l}</span>
                            </a>
                          ))}
                        </div>
                      )}
                      {d.status !== 'pending' && d.responseNote && (
                        <p className="mt-3 rounded border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-400">
                          Your note: {d.responseNote}
                        </p>
                      )}
                      {d.status === 'pending' && (
                        <div className="mt-4 space-y-2.5 border-t border-slate-800/80 pt-3.5">
                          <textarea
                            value={responseNotes[d.id] ?? ''}
                            onChange={(e) => setResponseNotes((m) => ({ ...m, [d.id]: e.target.value }))}
                            rows={2}
                            placeholder="Optional note — or, if something is off, tell us exactly what to change…"
                            className="input-dark w-full"
                            aria-label="Response note"
                          />
                          <div className="flex flex-wrap gap-2.5">
                            <button
                              onClick={() => void handleRespond(d, true)}
                              disabled={respondingId === d.id}
                              className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-4 w-4" /> Accept delivery
                            </button>
                            <button
                              onClick={() => void handleRespond(d, false)}
                              disabled={respondingId === d.id}
                              className="inline-flex items-center gap-2 rounded-md border border-amber-700/70 bg-amber-950/40 px-4 py-2.5 text-sm font-semibold text-amber-300 transition-colors hover:border-amber-500 disabled:opacity-50"
                            >
                              <RefreshCw className="h-4 w-4" /> Request revision
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'vault' && (
              <div className="space-y-6">
                <div className="glass rounded-xl p-6">
                  <OrderFiles orderId={order.id} by="client" />
                </div>
                <VaultPanel order={order} />
              </div>
            )}

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
