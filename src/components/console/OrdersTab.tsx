import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, X, Trash2, PackageCheck, ExternalLink, History, MessageSquare } from 'lucide-react';
import {
  listOrders,
  updateOrder,
  deleteOrder,
  listDeliveries,
  createDelivery,
  appendActivity,
  STAGES,
  orderRef,
  type Order,
  type Delivery,
} from '../../lib/portal';
import ArchitectChat from '../ArchitectChat';
import { logAudit } from '../../lib/admin';
import { useAuth } from '../../lib/auth';
import { fmtUSD, cx } from '../../lib/format';

const DAY_MS = 86_400_000;
const STATUSES = ['intake', 'active', 'delivered', 'completed', 'archived'] as const;

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
    if (selected) void refreshDeliveries(selected.id);
    else setDeliveries([]);
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
      <div>
        <p className="eyebrow">order_management</p>
        <h2 className="h-display mt-1 text-2xl">Orders</h2>
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
                  onChange={(e) => void handleStatus(selected, e.target.value)}
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
