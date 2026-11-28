import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, X, Trash2, PackageCheck, ExternalLink, History, MessageSquare, Plus, Star, Banknote, ListChecks, Wallet,
  FileEdit,
  Download,
} from 'lucide-react';
import {
  listOrders,
  updateOrder,
  deleteOrder,
  listDeliveries,
  createDelivery,
  createOrderByOwner,
  appendActivity,
  paidTotal,
  STAGES,
  orderRef,
  type Order,
  type Delivery,
} from '../../lib/portal';
import { getReview, setReviewPublished, type Review } from '../../lib/reviews';
import { listClaims, decideClaim, type PaymentClaim } from '../../lib/payments';
import { getIntakeForm, listRevisions, decideRevision, type IntakeForm, type RevisionRequest } from '../../lib/portal';
import { ACCESS_CHECKLIST, checklistProgress } from '../../lib/checklist';
import OrderFiles from '../OrderFiles';
import { openInvoice } from '../../lib/invoice';
import { getPaymentSettings, type PaymentSettings } from '../../lib/payments';
import { SERVICE_LINES, displayPrice, packagePriceUsd, type ServiceLine } from '../../data/services';
import { useServiceLines } from '../../lib/siteConfig';
import ArchitectChat from '../ArchitectChat';
import { logAudit } from '../../lib/admin';
import { useAuth } from '../../lib/auth';
import { fmtUSD, cx } from '../../lib/format';
import { agreedUsdIn } from '../../lib/pricing';

const DAY_MS = 86_400_000;
const STATUSES = ['intake', 'active', 'delivered', 'completed', 'cancelled', 'archived'] as const;
const PAYMENT_METHODS = ['Wise', 'Payoneer', 'bKash', 'Nagad', 'Bangla QR', 'UPI', 'Bank transfer', 'Fiverr', 'Upwork', 'Other', 'Correction'];

function priceOf(o: Order, lines: ServiceLine[]): number {
  return agreedUsdIn(lines, o);
}

const DELIVERY_TONE: Record<Delivery['status'], string> = {
  pending: 'border-amber-700/60 bg-amber-950/40 text-amber-300',
  accepted: 'border-emerald-700/60 bg-emerald-950/40 text-emerald-300',
  revision: 'border-rose-800/60 bg-rose-950/40 text-rose-300',
};

function ageDays(ts: number): string {
  const d = Math.floor((Date.now() - ts) / DAY_MS);
  return d <= 0 ? '<1d' : `${d}d`;
}

function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (s === 'intake') return 'border-amber-700/60 bg-amber-950/40 text-amber-300';
  if (s === 'delivered') return 'border-emerald-700/60 bg-emerald-950/40 text-emerald-300';
  if (s === 'completed') return 'border-violet-700/60 bg-violet-950/40 text-violet-300';
  if (s === 'cancelled') return 'border-rose-800/60 bg-rose-950/40 text-rose-300';
  if (s === 'archived') return 'border-slate-700 bg-slate-900/60 text-slate-400';
  return 'border-cyan-700/60 bg-cyan-950/40 text-cyan-300';
}

export default function OrdersTab() {
  const { user } = useAuth();
  const actor = user?.email ?? 'console';
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'deadline'>('newest');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const [claims, setClaims] = useState<PaymentClaim[]>([]);
  const [revisions, setRevisions] = useState<RevisionRequest[]>([]);
  const [revBusyId, setRevBusyId] = useState<string | null>(null);
  const [startOverrideOpen, setStartOverrideOpen] = useState(false);
  const [startOverrideReason, setStartOverrideReason] = useState('');
  const [deadlineInput, setDeadlineInput] = useState('');
  const [intakeForm, setIntakeForm] = useState<IntakeForm | null>(null);
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [creditInputs, setCreditInputs] = useState<Record<string, string>>({});
  const [claimBusyId, setClaimBusyId] = useState<string | null>(null);
  const [paySettings, setPaySettings] = useState<PaymentSettings | null>(null);

  useEffect(() => {
    getPaymentSettings()
      .then(setPaySettings)
      .catch(() => setPaySettings(null));
  }, []);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState(PAYMENT_METHODS[0]);
  const [payNote, setPayNote] = useState('');
  const [payBusy, setPayBusy] = useState(false);
  const [cancelArmed, setCancelArmed] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  // In-app delete confirmation. window.confirm is silently auto-dismissed
  // (returns false) in embedded/automated browsers, which made Delete order
  // a no-op there — the confirmation must live in the page, not the browser.
  const [deleteArmed, setDeleteArmed] = useState(false);
  useEffect(() => {
    setDeleteArmed(false);
  }, [selected?.id]);
  const [showNew, setShowNew] = useState(false);
  const [nName, setNName] = useState('');
  const [nEmail, setNEmail] = useState('');
  const [nBrand, setNBrand] = useState('');
  const lines = useServiceLines();
  const allPackages = lines.flatMap((l) => l.packages);
  const [nPkg, setNPkg] = useState(SERVICE_LINES[0]?.packages[0]?.id ?? '');
  const [nBusy, setNBusy] = useState(false);
  const [dNote, setDNote] = useState('');
  const [dLinks, setDLinks] = useState('');
  const [dBusy, setDBusy] = useState(false);

  const refreshDeliveries = useCallback(async (orderId: string) => {
    try {
      setDeliveries(await listDeliveries(orderId));
    } catch {
      setDeliveries([]);
    }
  }, []);

  useEffect(() => {
    if (selected) {
      void refreshDeliveries(selected.id);
      getReview(selected.id)
        .then(setReview)
        .catch(() => setReview(null));
      listClaims(selected.id)
        .then(setClaims)
        .catch(() => setClaims([]));
      listRevisions(selected.id)
        .then(setRevisions)
        .catch(() => setRevisions([]));
      setStartOverrideOpen(false);
      setStartOverrideReason('');
      setDeadlineInput(new Date(selected.deadlineAt).toISOString().slice(0, 10));
      getIntakeForm(selected.id)
        .then(setIntakeForm)
        .catch(() => setIntakeForm(null));
      setCancelArmed(false);
      setCancelReason('');
    } else {
      setDeliveries([]);
      setReview(null);
      setRevisions([]);
    }
  }, [selected?.id, refreshDeliveries]);

  const refresh = useCallback(async () => {
    try {
      setOrders(await listOrders());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Deep link from the attention queue / clients tab: preselect the order.
  useEffect(() => {
    const want = searchParams.get('order');
    if (want && orders.length > 0) {
      const found = orders.find((o) => o.id === want);
      if (found) setSelected(found);
    }
  }, [searchParams, orders]);

  const visibleOrders = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!needle) return true;
      return [o.clientName, o.clientEmail, o.brandUrl, orderRef(o), o.id]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
    return [...filtered].sort((a, b) =>
      sort === 'oldest'
        ? a.createdAt - b.createdAt
        : sort === 'deadline'
          ? a.deadlineAt - b.deadlineAt
          : b.createdAt - a.createdAt,
    );
  }, [orders, q, statusFilter, sort]);

  const mutate = async (fn: () => Promise<void>, auditAction: string, auditDetails: string) => {
    setSaving(true);
    setNotice(null);
    try {
      await fn();
      await logAudit(auditAction, auditDetails, actor);
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleStage = (order: Order, stageIndex: number) =>
    mutate(
      async () => {
        const activity = appendActivity(order, 'stage', `Stage advanced to S${stageIndex + 1} · ${STAGES[stageIndex]?.title ?? ''}`, 'architect');
        await updateOrder(order.id, { stageIndex, activity });
        setSelected((s) => (s && s.id === order.id ? { ...s, stageIndex, activity } : s));
      },
      'order.stage',
      `${order.id} -> stage ${stageIndex}`,
    );

  const handleStatus = (order: Order, status: string) =>
    mutate(
      async () => {
        const activity = appendActivity(order, 'status', `Status set to ${status}`, 'architect');
        await updateOrder(order.id, { status, activity });
        setSelected((s) => (s && s.id === order.id ? { ...s, status, activity } : s));
      },
      'order.status',
      `${order.id} -> ${status}`,
    );

  const handleDecideClaim = async (order: Order, claim: PaymentClaim, approve: boolean) => {
    const credited = Number(
      creditInputs[claim.id] ?? (claim.currency === 'USD' ? claim.amount : 0),
    );
    if (approve && (!credited || credited <= 0)) {
      setNotice('Enter the USD amount to credit for this claim first.');
      return;
    }
    setClaimBusyId(claim.id);
    setNotice(null);
    try {
      await decideClaim(order, claim, approve, credited, decisionNotes[claim.id]?.trim() || undefined);
      await logAudit(
        approve ? 'claim.approve' : 'claim.reject',
        `${order.id} ${claim.id} ${claim.currency} ${claim.amount}`,
        actor,
      );
      setClaims(await listClaims(order.id));
      const fresh = await listOrders();
      const updated = fresh.find((o) => o.id === order.id);
      if (updated) setSelected(updated);
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not decide the claim.');
    } finally {
      setClaimBusyId(null);
    }
  };

  const handleDecideRevision = async (
    order: Order,
    revision: RevisionRequest,
    decision: 'approved' | 'declined',
  ) => {
    setRevBusyId(revision.id);
    setNotice(null);
    try {
      await decideRevision(order, revision, decision);
      setRevisions(await listRevisions(order.id));
      await logAudit(`revision.${decision}`, `${order.id} ${revision.id}`, actor);
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not save the decision.');
    } finally {
      setRevBusyId(null);
    }
  };

  const handleSaveDeadline = async (order: Order) => {
    const ts = new Date(deadlineInput).getTime();
    if (!deadlineInput || Number.isNaN(ts)) {
      setNotice('Pick a valid deadline date first.');
      return;
    }
    const activity = appendActivity(
      order,
      'status',
      `Deadline moved to ${new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`,
      'architect',
    );
    try {
      await updateOrder(order.id, { deadlineAt: ts, activity });
      setSelected((s) => (s && s.id === order.id ? { ...s, deadlineAt: ts, activity } : s));
      await logAudit('order.deadline', `${order.id} ${ts}`, actor);
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not save the deadline.');
    }
  };

  const gateReady = (order: Order) => {
    const { done, total } = checklistProgress(order);
    return done === total && paidTotal(order) >= priceOf(order, lines);
  };

  const handleStartProject = async (order: Order, overrideReason?: string) => {
    const ready = gateReady(order);
    if (!ready && !overrideReason) return; // the UI collects a reason first
    const activity = appendActivity(
      order,
      'status',
      ready
        ? 'Project started — access complete and the agreed amount verified as paid.'
        : `Project started early by the studio — override reason: ${overrideReason}`,
      'architect',
    );
    // Starting also moves the project to stage 1 so it appears in Projects.
    const stageIndex = Math.max(order.stageIndex, 1);
    try {
      await updateOrder(order.id, { status: 'active', stageIndex, activity });
      setSelected((s) =>
        s && s.id === order.id ? { ...s, status: 'active', stageIndex, activity } : s,
      );
      await logAudit('order.start', order.id, actor);
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not start the project.');
    }
  };

  // Owner data export (F-8): the whole book, downloadable any time — the
  // app must never be the only place the studio's records exist.
  const exportOrders = (format: 'json' | 'csv') => {
    const stamp = new Date().toISOString().slice(0, 10);
    let content: string;
    let type: string;
    if (format === 'json') {
      content = JSON.stringify(orders, null, 2);
      type = 'application/json';
    } else {
      const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const rows = [
        ['ref', 'client', 'email', 'package', 'status', 'agreed_usd', 'paid_usd', 'created', 'deadline'].join(','),
        ...orders.map((o) =>
          [
            esc(o.ref), esc(o.clientName), esc(o.clientEmail), esc(o.packageName || o.packageId),
            esc(o.status), priceOf(o, lines), paidTotal(o),
            esc(new Date(o.createdAt).toISOString()), esc(new Date(o.deadlineAt).toISOString()),
          ].join(','),
        ),
      ];
      content = rows.join('\n');
      type = 'text/csv';
    }
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `syncops-orders-${stamp}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRecordPayment = async (order: Order) => {
    const amount = Number(payAmount);
    // Ledger corrections (B-05) are negative entries with a mandatory note —
    // the audit-style way to undo a typo without rewriting history.
    if (payMethod === 'Correction') {
      if (!amount || amount >= 0) {
        setNotice('A correction must be a negative amount (it reverses an earlier entry).');
        return;
      }
      if (payNote.trim().length < 4) {
        setNotice('A correction needs a note saying what it reverses.');
        return;
      }
    } else if (!amount || amount <= 0) {
      setNotice('Enter a payment amount above zero.');
      return;
    }
    setPayBusy(true);
    setNotice(null);
    try {
      const payments = [
        ...(order.payments ?? []),
        { amount, method: payMethod, note: payNote.trim() || undefined, at: Date.now() },
      ];
      const activity = appendActivity(
        order,
        'payment',
        payMethod === 'Correction'
          ? `Ledger correction — ${fmtUSD(amount)}: ${payNote.trim()}`
          : `Payment recorded — ${fmtUSD(amount)} via ${payMethod}.`,
        'architect',
      );
      await updateOrder(order.id, { payments, activity });
      setSelected((s) => (s && s.id === order.id ? { ...s, payments, activity } : s));
      setPayAmount('');
      setPayNote('');
      await logAudit('order.payment', `${order.id} ${amount} ${payMethod}`, actor);
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not record the payment.');
    } finally {
      setPayBusy(false);
    }
  };

  const handleCancelConfirm = (order: Order) =>
    mutate(
      async () => {
        const reason = cancelReason.trim();
        const activity = appendActivity(
          order,
          'status',
          reason ? `Order cancelled — ${reason}` : 'Order cancelled',
          'architect',
        );
        await updateOrder(order.id, { status: 'cancelled', cancelReason: reason, activity });
        setSelected((s) =>
          s && s.id === order.id ? { ...s, status: 'cancelled', cancelReason: reason, activity } : s,
        );
        setCancelArmed(false);
      },
      'order.status',
      `${order.id} -> cancelled`,
    );

  const handleCreateOrder = async () => {
    const pkg = allPackages.find((x) => x.id === nPkg) ?? allPackages[0];
    if (!pkg || nName.trim().length < 2 || !nEmail.includes('@')) {
      setNotice('New order needs a client name and a valid email.');
      return;
    }
    setNBusy(true);
    setNotice(null);
    try {
      const id = await createOrderByOwner({
        clientName: nName,
        clientEmail: nEmail,
        brandUrl: nBrand,
        packageId: pkg.id,
        packageName: pkg.name,
        price: packagePriceUsd(pkg),
      });
      await logAudit('order.create', id, actor);
      setShowNew(false);
      setNName('');
      setNEmail('');
      setNBrand('');
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not create the order.');
    } finally {
      setNBusy(false);
    }
  };

  const handleDeliver = async (order: Order) => {
    setDBusy(true);
    setNotice(null);
    try {
      const links = dLinks.split('\n').map((l) => l.trim()).filter(Boolean);
      await createDelivery(order.id, dNote, links);
      const activity = appendActivity(order, 'delivery', 'Delivery submitted — awaiting client review.', 'architect');
      await updateOrder(order.id, { activity });
      setSelected((s) => (s && s.id === order.id ? { ...s, activity } : s));
      setDNote('');
      setDLinks('');
      await refreshDeliveries(order.id);
      await logAudit('order.delivery', order.id, actor);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Delivery failed.');
    } finally {
      setDBusy(false);
    }
  };

  const handleDelete = (order: Order) => {
    void mutate(
      async () => {
        await deleteOrder(order.id);
        setDeleteArmed(false);
        setSelected(null);
      },
      'order.delete',
      order.id,
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="eyebrow">order_management</p>
          <h2 className="h-display mt-1 text-2xl">Orders</h2>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportOrders('json')}
            className="btn-ghost px-4 py-2.5 text-sm"
          >
            <Download className="h-4 w-4" /> Export JSON
          </button>
          <button
            type="button"
            onClick={() => exportOrders('csv')}
            className="btn-ghost px-4 py-2.5 text-sm"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="btn-primary px-4 py-2.5 text-sm"
          >
            <Plus className="h-4 w-4" /> New order
          </button>
        </div>
      </div>

      {error && (
        <div className="glass rounded-xl border-rose-800/60 p-4 text-sm text-rose-300">{error}</div>
      )}
      {notice && (
        <div className="glass rounded-xl border-amber-800/60 p-4 text-sm text-amber-300">
          {notice}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search client, email, brand or reference…"
          className="input-dark !w-72"
          aria-label="Search orders"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-dark !w-auto"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          <option value="In Progress">In Progress</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="input-dark !w-auto"
          aria-label="Sort orders"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="deadline">Deadline soonest</option>
        </select>
        <span className="telemetry ml-auto">
          {visibleOrders.length} of {orders.length} orders
        </span>
      </div>

      <div className="grid gap-3 md:hidden">
        {visibleOrders.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setSelected(o)}
            className="glass rounded-xl p-4 text-left transition-colors hover:bg-slate-800/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-100">{o.clientName}</p>
                <p className="telemetry truncate">{o.clientEmail}</p>
                <p className="telemetry text-cyan-300/80">{orderRef(o)}</p>
              </div>
              <span
                className={cx(
                  'shrink-0 rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
                  statusTone(o.status),
                )}
              >
                {o.status}
              </span>
            </div>
            <p className="mt-2 truncate text-sm text-slate-300">{o.packageName || o.packageId}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <span className="telemetry">{o.brandUrl}</span>
              <span className="telemetry">{fmtUSD(o.adSpend)}</span>
              <span className="telemetry">
                S{o.stageIndex + 1} · {STAGES[o.stageIndex]?.title ?? '?'}
              </span>
              <span className="telemetry">{ageDays(o.createdAt)}</span>
            </div>
          </button>
        ))}
        {visibleOrders.length === 0 && (
          <div className="glass rounded-xl px-4 py-10 text-center text-sm text-slate-500">
            {orders.length === 0
              ? 'No orders yet. New Hire Modal intakes will appear here.'
              : 'No orders match this search or filter.'}
          </div>
        )}
      </div>

      <div className="glass hidden overflow-x-auto rounded-xl md:block">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800/80">
              {['Client', 'Brand', 'Package', 'Ad spend', 'Stage', 'Status', 'Age'].map((h) => (
                <th key={h} className="label-dark !mb-0 px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleOrders.map((o) => (
              <tr
                key={o.id}
                onClick={() => setSelected(o)}
                className="cursor-pointer border-b border-slate-800/40 transition-colors last:border-0 hover:bg-slate-800/30"
              >
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-100">{o.clientName}</p>
                  <p className="telemetry">{o.clientEmail}</p>
                  <p className="telemetry text-cyan-300/80">{orderRef(o)}</p>
                </td>
                <td className="telemetry px-4 py-3">{o.brandUrl}</td>
                <td className="px-4 py-3 text-slate-300">{o.packageName || o.packageId}</td>
                <td className="telemetry px-4 py-3">{fmtUSD(o.adSpend)}</td>
                <td className="px-4 py-3">
                  <span className="telemetry rounded border border-slate-700 bg-slate-900/70 px-2 py-0.5">
                    S{o.stageIndex + 1} · {STAGES[o.stageIndex]?.title ?? '?'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cx(
                      'rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
                      statusTone(o.status),
                    )}
                  >
                    {o.status}
                  </span>
                </td>
                <td className="telemetry px-4 py-3">{ageDays(o.createdAt)}</td>
              </tr>
            ))}
            {visibleOrders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                  {orders.length === 0
                    ? 'No orders yet. New Hire Modal intakes will appear here.'
                    : 'No orders match this search or filter.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New order modal */}
      {showNew && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => !nBusy && setShowNew(false)}
        >
          <div
            className="glass-strong w-full max-w-lg rounded-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="eyebrow">new_order</p>
            <h3 className="h-display mt-1 text-xl">Create an order manually</h3>
            <p className="mt-1.5 text-sm text-slate-400">
              For clients who arrive via Fiverr, Upwork, WhatsApp or email. They sign in with this
              email to see the project in their portal.
            </p>
            <div className="mt-5 space-y-3">
              <input
                type="text"
                value={nName}
                onChange={(e) => setNName(e.target.value)}
                placeholder="Client name"
                className="input-dark w-full"
                aria-label="Client name"
              />
              <input
                type="email"
                value={nEmail}
                onChange={(e) => setNEmail(e.target.value)}
                placeholder="Client email"
                className="input-dark w-full"
                aria-label="Client email"
              />
              <input
                type="text"
                value={nBrand}
                onChange={(e) => setNBrand(e.target.value)}
                placeholder="Brand / store URL"
                className="input-dark w-full"
                aria-label="Brand or store URL"
              />
              <select
                value={nPkg}
                onChange={(e) => setNPkg(e.target.value)}
                className="input-dark w-full"
                aria-label="Package"
              >
                {lines.map((l) =>
                  l.packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {l.name}: {pkg.name} — {displayPrice(pkg)}
                    </option>
                  )),
                )}
              </select>
            </div>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                disabled={nBusy}
                onClick={() => void handleCreateOrder()}
                className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50"
              >
                {nBusy ? 'Creating…' : 'Create order'}
              </button>
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="btn-ghost px-4 py-2.5 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => !saving && setSelected(null)}
        >
          <div
            className="glass-strong max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">order_detail</p>
                <h3 className="h-display mt-1 text-xl">{selected.clientName}</h3>
                <p className="telemetry mt-1"><span className="text-cyan-300">{orderRef(selected)}</span> <span className="text-slate-600">· {selected.id}</span></p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="btn-ghost !px-2.5 !py-2"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ['Email', selected.clientEmail],
                ['Brand', selected.brandUrl],
                ['Package', selected.packageName || selected.packageId],
                ['Ad spend', fmtUSD(selected.adSpend)],
                ['Created', new Date(selected.createdAt).toLocaleString()],
                ['Deadline', new Date(selected.deadlineAt).toLocaleString()],
              ].map(([k, v]) => (
                <div key={k} className="rounded-md border border-slate-800/80 bg-slate-950/60 p-3">
                  <dt className="label-dark !mb-1">{k}</dt>
                  <dd className="telemetry !text-slate-200">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="label-dark !mb-0" htmlFor="order-deadline">
                Deadline
              </label>
              <input
                id="order-deadline"
                type="date"
                value={deadlineInput}
                onChange={(e) => setDeadlineInput(e.target.value)}
                className="input-dark px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                disabled={saving || !deadlineInput}
                onClick={() => void handleSaveDeadline(selected)}
                className="btn-ghost px-3.5 py-1.5 text-xs disabled:opacity-50"
              >
                Save deadline
              </button>
              <span className="text-xs text-slate-500">
                Currently {new Date(selected.deadlineAt).toLocaleDateString()}
              </span>
            </div>

            <div className="mt-5">
              <p className="label-dark">Milestone stage</p>
              <div className="flex flex-wrap gap-2">
                {STAGES.map((s, i) => (
                  <button
                    key={s.title}
                    type="button"
                    disabled={saving || i === selected.stageIndex}
                    onClick={() => void handleStage(selected, i)}
                    title={s.desc}
                    className={cx(
                      'rounded-md border px-3 py-2 text-xs font-semibold transition-all',
                      i === selected.stageIndex
                        ? 'border-emerald-600 bg-emerald-500/15 text-emerald-300'
                        : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500',
                      'disabled:cursor-default disabled:opacity-100',
                    )}
                  >
                    {i + 1} · {s.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="order-status" className="label-dark">
                  Status
                </label>
                <select
                  id="order-status"
                  value={STATUSES.includes(selected.status as (typeof STATUSES)[number]) ? selected.status : 'active'}
                  disabled={saving}
                  onChange={(e) => {
                    if (e.target.value === 'cancelled') setCancelArmed(true);
                    else void handleStatus(selected, e.target.value);
                  }}
                  className="input-dark !w-auto"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {deleteArmed ? (
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <span className="text-xs text-rose-200">
                    Delete {selected.ref ?? selected.id} and all its data — messages, claims,
                    files, review? This cannot be undone.
                  </span>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleDelete(selected)}
                    className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" /> {saving ? 'Working…' : 'Delete permanently'}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setDeleteArmed(false)}
                    className="rounded-md border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-500 disabled:opacity-50"
                  >
                    Keep order
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setDeleteArmed(true)}
                  className="ml-auto inline-flex items-center gap-2 rounded-md border border-rose-800/70 bg-rose-950/40 px-4 py-2.5 text-sm font-semibold text-rose-300 transition-colors hover:border-rose-600 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" /> Delete order
                </button>
              )}
            </div>

            {selected.status === 'intake' && (
              <div className="mt-5 rounded-md border border-cyan-800/50 bg-cyan-950/30 px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-cyan-100">
                    <span className="font-semibold">Start gate:</span> access{' '}
                    {checklistProgress(selected).done}/{checklistProgress(selected).total} · paid{' '}
                    {fmtUSD(paidTotal(selected))} of {fmtUSD(priceOf(selected, lines))}
                    {gateReady(selected)
                      ? ' — ready when you are.'
                      : ' — not fully green yet (access incomplete or the agreed amount is not fully verified).'}
                  </p>
                  {gateReady(selected) ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleStartProject(selected)}
                      className="btn-primary ml-auto px-4 py-2 text-sm disabled:opacity-50"
                    >
                      Start project
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setStartOverrideOpen((v) => !v)}
                      className="btn-ghost ml-auto px-4 py-2 text-sm"
                    >
                      Start anyway…
                    </button>
                  )}
                </div>
                {!gateReady(selected) && startOverrideOpen && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={startOverrideReason}
                      onChange={(e) => setStartOverrideReason(e.target.value)}
                      placeholder="Why start early? (recorded on the client's timeline)"
                      className="input-dark min-w-0 flex-1 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      disabled={saving || startOverrideReason.trim().length < 4}
                      onClick={() => void handleStartProject(selected, startOverrideReason.trim())}
                      className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
                    >
                      Confirm early start
                    </button>
                  </div>
                )}
              </div>
            )}
            {cancelArmed && selected.status !== 'cancelled' && (
              <div className="mt-5 rounded-md border border-rose-800/60 bg-rose-950/40 p-4">
                <p className="text-sm font-semibold text-rose-200">Cancel this order?</p>
                <p className="mt-1 text-sm text-rose-200/70">
                  The order stays in your records as cancelled — nothing is deleted.
                </p>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Reason (shown in the timeline)…"
                  className="input-dark mt-3 w-full"
                  aria-label="Cancellation reason"
                />
                <div className="mt-3 flex gap-2.5">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleCancelConfirm(selected)}
                    className="rounded-md border border-rose-600 bg-rose-600/20 px-4 py-2 text-sm font-semibold text-rose-100 disabled:opacity-50"
                  >
                    Confirm cancellation
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelArmed(false)}
                    className="btn-ghost px-4 py-2 text-sm"
                  >
                    Keep order
                  </button>
                </div>
              </div>
            )}
            {selected.status === 'cancelled' && selected.cancelReason && (
              <p className="mt-4 rounded-md border border-rose-800/50 bg-rose-950/30 px-3.5 py-2.5 text-sm text-rose-200">
                Cancelled — {selected.cancelReason}
              </p>
            )}

            {/* Requirements & access */}
            <div className="mt-6 border-t border-slate-800/80 pt-5">
              <p className="label-dark flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-cyan-300" /> Requirements & access
              </p>
              <p className="telemetry">
                access checklist — {checklistProgress(selected).done} of{' '}
                {checklistProgress(selected).total} done by the client
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ACCESS_CHECKLIST.map((item) => (
                  <span
                    key={item.id}
                    className={cx(
                      'rounded border px-2 py-0.5 text-[11px] font-semibold',
                      selected.checklist?.[item.id]
                        ? 'border-emerald-700/60 bg-emerald-950/50 text-emerald-300'
                        : 'border-slate-700 bg-slate-900 text-slate-500',
                    )}
                  >
                    {item.title.split(' — ')[0]}
                  </span>
                ))}
              </div>
              {intakeForm ? (
                <dl className="mt-3 space-y-1.5 text-sm">
                  {(
                    [
                      ['Store platform', intakeForm.storePlatform],
                      ['Ad account IDs', intakeForm.adAccountIds],
                      ['Goals', intakeForm.goals],
                      ['Brand assets', intakeForm.assetsNote],
                      ['Anything else', intakeForm.anythingElse],
                    ] as const
                  )
                    .filter(([, v]) => v.trim())
                    .map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <dt className="w-32 shrink-0 text-slate-500">{k}</dt>
                        <dd className="text-slate-200">{v}</dd>
                      </div>
                    ))}
                </dl>
              ) : (
                <p className="telemetry mt-2">requirements form — not submitted yet</p>
              )}
            </div>

            {/* Payment claims */}
            {claims.length > 0 && (
              <div className="mt-6 border-t border-slate-800/80 pt-5">
                <p className="label-dark flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-amber-300" /> Payment claims
                </p>
                <div className="space-y-2.5">
                  {claims.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-md border border-slate-800/80 bg-slate-950/60 px-3.5 py-3"
                    >
                      <p className="text-sm text-slate-200">
                        <span className="font-mono font-bold">
                          {c.currency} {c.amount.toLocaleString()}
                        </span>{' '}
                        via {c.method} · TrxID <span className="font-mono">{c.trxId}</span>
                        {c.sender ? ` · from ${c.sender}` : ''}
                        {c.note ? ` · ${c.note}` : ''}
                      </p>
                      <p className="telemetry mt-0.5">
                        {new Date(c.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        ·{' '}
                        <span
                          className={
                            c.status === 'approved'
                              ? 'text-emerald-300'
                              : c.status === 'rejected'
                                ? 'text-rose-300'
                                : 'text-amber-300'
                          }
                        >
                          {c.status}
                          {c.status === 'approved' && c.creditedUsd ? ` — credited $${c.creditedUsd}` : ''}
                        </span>
                      </p>
                      {c.status === 'pending' &&
                        claims.some(
                          (o) => o.id !== c.id && o.status === 'approved' && o.trxId === c.trxId,
                        ) && (
                          <p className="mt-2 rounded border border-rose-800/60 bg-rose-950/40 px-2.5 py-1.5 text-xs font-semibold text-rose-200">
                            Warning: this TrxID was already approved on this order — check
                            before crediting it twice.
                          </p>
                        )}
                      {c.status === 'pending' && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={creditInputs[c.id] ?? (c.currency === 'USD' ? String(c.amount) : '')}
                            onChange={(e) =>
                              setCreditInputs((m) => ({ ...m, [c.id]: e.target.value }))
                            }
                            placeholder="Credit USD"
                            className="input-dark !w-32"
                            aria-label="USD amount to credit"
                          />
                          <input
                            type="text"
                            value={decisionNotes[c.id] ?? ''}
                            onChange={(e) =>
                              setDecisionNotes((m) => ({ ...m, [c.id]: e.target.value }))
                            }
                            placeholder="Note for the client (e.g. why a claim can't be verified)"
                            className="input-dark min-w-0 flex-1 px-3 py-1.5 text-xs"
                          />
                          <button
                            type="button"
                            disabled={claimBusyId === c.id}
                            onClick={() => void handleDecideClaim(selected, c, true)}
                            className="btn-primary px-3.5 py-2 text-xs disabled:opacity-50"
                          >
                            Verify & approve
                          </button>
                          <button
                            type="button"
                            disabled={claimBusyId === c.id}
                            onClick={() => void handleDecideClaim(selected, c, false)}
                            className="btn-ghost px-3.5 py-2 text-xs"
                          >
                            Cannot verify
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scope revision requests */}
            {revisions.length > 0 && (
              <div className="mt-6 border-t border-slate-800/80 pt-5">
                <p className="label-dark flex items-center gap-2">
                  <FileEdit className="h-4 w-4 text-amber-300" /> Scope revision requests
                </p>
                <div className="mt-3 space-y-2.5">
                  {revisions.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-md border border-slate-800/80 bg-slate-950/60 px-3.5 py-3"
                    >
                      <p className="text-sm text-slate-200">
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-300">
                          {r.type}
                        </span>{' '}
                        · {r.details}
                      </p>
                      <p className="telemetry mt-0.5">
                        {new Date(r.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        ·{' '}
                        <span
                          className={
                            r.status === 'approved'
                              ? 'text-emerald-300'
                              : r.status === 'declined'
                                ? 'text-rose-300'
                                : 'text-amber-300'
                          }
                        >
                          {r.status}
                        </span>
                      </p>
                      {r.status === 'pending' && (
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={revBusyId === r.id}
                            onClick={() => void handleDecideRevision(selected, r, 'approved')}
                            className="btn-primary px-3.5 py-1.5 text-xs disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={revBusyId === r.id}
                            onClick={() => void handleDecideRevision(selected, r, 'declined')}
                            className="btn-ghost px-3.5 py-1.5 text-xs"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payments */}
            <div className="mt-6 border-t border-slate-800/80 pt-5">
              <div className="flex flex-wrap items-center gap-3">
                <p className="label-dark flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-emerald-400" /> Payments
                </p>
                <button
                  type="button"
                  onClick={() => openInvoice(selected, priceOf(selected, lines), paySettings)}
                  className="btn-ghost ml-auto px-3.5 py-2 text-xs"
                >
                  Download invoice (PDF)
                </button>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span className="text-slate-400">
                  Agreed <span className="font-mono font-bold text-slate-100">{fmtUSD(priceOf(selected, lines))}</span>
                </span>
                <span className="text-slate-400">
                  Paid <span className="font-mono font-bold text-emerald-300">{fmtUSD(paidTotal(selected))}</span>
                </span>
                <span className="text-slate-400">
                  Balance{' '}
                  <span className="font-mono font-bold text-amber-300">
                    {fmtUSD(Math.max(0, priceOf(selected, lines) - paidTotal(selected)))}
                  </span>
                </span>
              </div>
              {(selected.payments ?? []).length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {(selected.payments ?? []).map((pay, i) => (
                    <p key={`${pay.at}-${i}`} className="telemetry">
                      {new Date(pay.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                      · <span className="text-slate-200">{fmtUSD(pay.amount)}</span> · {pay.method}
                      {pay.note ? ` · ${pay.note}` : ''}
                    </p>
                  ))}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2.5">
                <input
                  type="number"
                  min="0"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Amount (USD)"
                  className="input-dark !w-36"
                  aria-label="Payment amount"
                />
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="input-dark !w-auto"
                  aria-label="Payment method"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="Note (e.g. deposit, final)…"
                  className="input-dark !w-52"
                  aria-label="Payment note"
                />
                <button
                  type="button"
                  disabled={payBusy}
                  onClick={() => void handleRecordPayment(selected)}
                  className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50"
                >
                  {payBusy ? 'Recording…' : 'Record payment'}
                </button>
              </div>
            </div>

            {/* Client review */}
            {review && (
              <div className="mt-6 border-t border-slate-800/80 pt-5">
                <p className="label-dark flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-400" /> Client review
                </p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={cx('h-4 w-4', n <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600')}
                    />
                  ))}
                  <span className="telemetry ml-2">
                    {review.published ? 'published on the site' : 'not published'}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">“{review.text}”</p>
                <button
                  type="button"
                  onClick={() => {
                    void setReviewPublished(review.id, !review.published).then(() =>
                      setReview({ ...review, published: !review.published }),
                    );
                  }}
                  className="btn-ghost mt-3 px-4 py-2 text-sm"
                >
                  {review.published ? 'Unpublish from site' : 'Publish on the site'}
                </button>
              </div>
            )}

            {/* Deliveries */}
            <div className="mt-6 border-t border-slate-800/80 pt-5">
              <p className="label-dark flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-emerald-400" /> Deliveries
              </p>
              <div className="space-y-3">
                {deliveries.map((d) => (
                  <div key={d.id} className="rounded-md border border-slate-800/80 bg-slate-950/60 p-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cx('rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider', DELIVERY_TONE[d.status])}>
                        {d.status === 'revision' ? 'revision requested' : d.status}
                      </span>
                      <span className="telemetry">{new Date(d.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{d.note}</p>
                    {d.links.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {d.links.map((l) => (
                          <a key={l} href={l} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-cyan-300 underline-offset-4 hover:underline">
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" /> <span className="break-all">{l}</span>
                          </a>
                        ))}
                      </div>
                    )}
                    {d.responseNote && (
                      <p className="mt-2 rounded border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-400">
                        Client: {d.responseNote}
                      </p>
                    )}
                  </div>
                ))}
                {deliveries.length === 0 && (
                  <p className="telemetry">no deliveries yet — submit the first one below.</p>
                )}
              </div>
              <div className="mt-3 space-y-2.5">
                <textarea
                  value={dNote}
                  onChange={(e) => setDNote(e.target.value)}
                  rows={3}
                  placeholder="Delivery note — what is included, what the client should check…"
                  className="input-dark w-full"
                  aria-label="Delivery note"
                />
                <textarea
                  value={dLinks}
                  onChange={(e) => setDLinks(e.target.value)}
                  rows={2}
                  placeholder="Deliverable links — one per line (Drive, container export, doc…)"
                  className="input-dark w-full font-mono text-xs"
                  aria-label="Deliverable links"
                />
                <button
                  type="button"
                  disabled={dBusy || dNote.trim().length < 4}
                  onClick={() => void handleDeliver(selected)}
                  className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50"
                >
                  <PackageCheck className="h-4 w-4" /> {dBusy ? 'Sending…' : 'Send delivery to client'}
                </button>
              </div>
            </div>

            {/* Client channel */}
            <div className="mt-6 border-t border-slate-800/80 pt-5">
              <p className="label-dark flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-400" /> Architect channel — {selected.clientName}
              </p>
              <ArchitectChat orderId={selected.id} sender="architect" peerName={selected.clientName} heightClass="h-[380px]" />
            </div>

            {/* Files */}
            <div className="mt-6 border-t border-slate-800/80 pt-5">
              <OrderFiles orderId={selected.id} by="architect" canDeleteAll />
            </div>

            {/* Timeline */}
            <div className="mt-6 border-t border-slate-800/80 pt-5">
              <p className="label-dark flex items-center gap-2">
                <History className="h-4 w-4 text-cyan-400" /> Order timeline
              </p>
              {(selected.activity ?? []).length === 0 ? (
                <p className="telemetry">no activity recorded yet.</p>
              ) : (
                <ol className="space-y-2.5">
                  {[...(selected.activity ?? [])].reverse().map((e, i) => (
                    <li key={`${e.at}-${i}`} className="flex gap-3 text-sm">
                      <span className="telemetry whitespace-nowrap pt-0.5">{new Date(e.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-slate-300">{e.text}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
