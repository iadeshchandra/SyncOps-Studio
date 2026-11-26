import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, X, Trash2, PackageCheck, ExternalLink, History, MessageSquare, Plus, Star, Banknote } from 'lucide-react';
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
import { PACKAGES } from '../../data/content';
import { DEFAULT_SITE_CONFIG } from '../../lib/siteConfig';
import ArchitectChat from '../ArchitectChat';
import { logAudit } from '../../lib/admin';
import { useAuth } from '../../lib/auth';
import { fmtUSD, cx } from '../../lib/format';

const DAY_MS = 86_400_000;
const STATUSES = ['intake', 'active', 'delivered', 'completed', 'cancelled', 'archived'] as const;
const PAYMENT_METHODS = ['Wise', 'Payoneer', 'bKash', 'Bank transfer', 'Fiverr', 'Upwork', 'Other'];

function priceOf(o: Order): number {
  if (typeof o.price === 'number') return o.price;
  const list = DEFAULT_SITE_CONFIG.pricing ?? PACKAGES;
  return list.find((p) => p.id === o.packageId)?.price ?? 0;
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
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState(PAYMENT_METHODS[0]);
  const [payNote, setPayNote] = useState('');
  const [payBusy, setPayBusy] = useState(false);
  const [cancelArmed, setCancelArmed] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [nName, setNName] = useState('');
  const [nEmail, setNEmail] = useState('');
  const [nBrand, setNBrand] = useState('');
  const [nPkg, setNPkg] = useState(PACKAGES[0]?.id ?? '');
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
      setCancelArmed(false);
      setCancelReason('');
    } else {
      setDeliveries([]);
      setReview(null);
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

  const handleRecordPayment = async (order: Order) => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
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
        `Payment recorded — ${fmtUSD(amount)} via ${payMethod}.`,
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
    const pkg = (DEFAULT_SITE_CONFIG.pricing ?? PACKAGES).find((x) => x.id === nPkg) ?? PACKAGES[0];
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
        price: pkg.price,
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
    if (!window.confirm(`Delete order ${order.id} (${order.clientName})? This cannot be undone.`))
      return;
    void mutate(
      async () => {
        await deleteOrder(order.id);
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
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="btn-primary ml-auto px-4 py-2.5 text-sm"
        >
          <Plus className="h-4 w-4" /> New order
        </button>
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

      <div className="glass overflow-x-auto rounded-xl">
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
                {(DEFAULT_SITE_CONFIG.pricing ?? PACKAGES).map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} — {fmtUSD(pkg.price)}
                  </option>
                ))}
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
              <button
                type="button"
                disabled={saving}
                onClick={() => handleDelete(selected)}
                className="ml-auto inline-flex items-center gap-2 rounded-md border border-rose-800/70 bg-rose-950/40 px-4 py-2.5 text-sm font-semibold text-rose-300 transition-colors hover:border-rose-600 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> {saving ? 'Working…' : 'Delete order'}
              </button>
            </div>

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

            {/* Payments */}
            <div className="mt-6 border-t border-slate-800/80 pt-5">
              <p className="label-dark flex items-center gap-2">
                <Banknote className="h-4 w-4 text-emerald-400" /> Payments
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span className="text-slate-400">
                  Agreed <span className="font-mono font-bold text-slate-100">{fmtUSD(priceOf(selected))}</span>
                </span>
                <span className="text-slate-400">
                  Paid <span className="font-mono font-bold text-emerald-300">{fmtUSD(paidTotal(selected))}</span>
                </span>
                <span className="text-slate-400">
                  Balance{' '}
                  <span className="font-mono font-bold text-amber-300">
                    {fmtUSD(Math.max(0, priceOf(selected) - paidTotal(selected)))}
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
