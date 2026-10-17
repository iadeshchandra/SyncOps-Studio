import { useCallback, useEffect, useState } from 'react';
import { Loader2, X, Trash2 } from 'lucide-react';
import {
  listOrders,
  updateOrder,
  deleteOrder,
  STAGES,
  type Order,
} from '../../lib/portal';
import { logAudit } from '../../lib/admin';
import { useAuth } from '../../lib/auth';
import { fmtUSD, cx } from '../../lib/format';

const DAY_MS = 86_400_000;
const STATUSES = ['intake', 'active', 'delivered', 'archived'] as const;

function ageDays(ts: number): string {
  const d = Math.floor((Date.now() - ts) / DAY_MS);
  return d <= 0 ? '<1d' : `${d}d`;
}

function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (s === 'intake') return 'border-amber-700/60 bg-amber-950/40 text-amber-300';
  if (s === 'delivered') return 'border-emerald-700/60 bg-emerald-950/40 text-emerald-300';
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
        await updateOrder(order.id, { stageIndex });
        setSelected((s) => (s && s.id === order.id ? { ...s, stageIndex } : s));
      },
      'order.stage',
      `${order.id} -> stage ${stageIndex}`,
    );

  const handleStatus = (order: Order, status: string) =>
    mutate(
      async () => {
        await updateOrder(order.id, { status });
        setSelected((s) => (s && s.id === order.id ? { ...s, status } : s));
      },
      'order.status',
      `${order.id} -> ${status}`,
    );

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
            {orders.map((o) => (
              <tr
                key={o.id}
                onClick={() => setSelected(o)}
                className="cursor-pointer border-b border-slate-800/40 transition-colors last:border-0 hover:bg-slate-800/30"
              >
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-100">{o.clientName}</p>
                  <p className="telemetry">{o.clientEmail}</p>
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
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                  No orders yet. New Hire Modal intakes will appear here.
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
            className="glass-strong max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">order_detail</p>
                <h3 className="h-display mt-1 text-xl">{selected.clientName}</h3>
                <p className="telemetry mt-1">{selected.id}</p>
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
          </div>
        </div>
      )}
    </div>
  );
}
