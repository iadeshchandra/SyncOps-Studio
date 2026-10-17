import { useCallback, useEffect, useState } from 'react';
import { Loader2, Inbox, ArrowRight } from 'lucide-react';
import { listOrders, updateOrder, STAGES, type Order } from '../../lib/portal';
import { logAudit } from '../../lib/admin';
import { useAuth } from '../../lib/auth';
import MilestoneTracker from '../MilestoneTracker';
import SlaTimer from '../SlaTimer';

export default function ProjectsTab() {
  const { user } = useAuth();
  const actor = user?.email ?? 'console';
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const all = await listOrders();
      setOrders(all.filter((o) => o.stageIndex >= 1 && o.stageIndex <= 3));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load projects.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const advance = async (order: Order) => {
    const next = Math.min(4, order.stageIndex + 1);
    if (next === order.stageIndex) return;
    setAdvancing(order.id);
    try {
      await updateOrder(order.id, { stageIndex: next });
      await logAudit('order.stage', `${order.id} -> stage ${next}`, actor);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not advance stage.');
    } finally {
      setAdvancing(null);
    }
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
        <p className="eyebrow">project_operations</p>
        <h2 className="h-display mt-1 text-2xl">Active Projects</h2>
        <p className="mt-1 text-sm text-slate-400">
          Orders in build stages 1–3. Advance milestones as work completes.
        </p>
      </div>

      {error && (
        <div className="glass rounded-xl border-rose-800/60 p-4 text-sm text-rose-300">{error}</div>
      )}

      {orders.length === 0 ? (
        <div className="glass flex flex-col items-center rounded-xl px-6 py-16 text-center">
          <Inbox className="h-10 w-10 text-slate-600" />
          <p className="h-display mt-4 text-lg">No active projects</p>
          <p className="mt-2 max-w-sm text-sm text-slate-400">
            Projects appear here once an intake moves past Consultation Scheduled.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {orders.map((o) => (
            <div key={o.id} className="glass flex flex-col gap-4 rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="h-display truncate text-lg">{o.clientName}</h3>
                  <p className="telemetry truncate">
                    {o.brandUrl} · {o.id}
                  </p>
                </div>
                <span className="telemetry shrink-0 rounded border border-indigo-700/60 bg-indigo-950/40 px-2 py-0.5 text-indigo-300">
                  {o.packageName || o.packageId}
                </span>
              </div>

              <SlaTimer deadlineAt={o.deadlineAt} />
              <MilestoneTracker stageIndex={o.stageIndex} />

              <button
                type="button"
                disabled={advancing === o.id}
                onClick={() => void advance(o)}
                className="btn-primary w-full"
              >
                {advancing === o.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Advancing…
                  </>
                ) : (
                  <>
                    Advance to {STAGES[Math.min(4, o.stageIndex + 1)]?.title}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
