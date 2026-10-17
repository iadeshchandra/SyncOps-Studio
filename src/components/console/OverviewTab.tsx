import { useEffect, useState } from 'react';
import { ClipboardList, Inbox, Rocket, Banknote, Loader2, TriangleAlert } from 'lucide-react';
import { listOrders, STAGES, type Order } from '../../lib/portal';
import { PACKAGES } from '../../data/content';
import { DEFAULT_SITE_CONFIG } from '../../lib/siteConfig';
import { fmtUSD } from '../../lib/format';

const DAY_MS = 86_400_000;

function ageDays(ts: number): string {
  const d = Math.floor((Date.now() - ts) / DAY_MS);
  return d <= 0 ? '<1d' : `${d}d`;
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof ClipboardList;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="glass card-hover rounded-xl p-5">
      <div className="flex items-center gap-3">
        <span className={`rounded-md border p-2 ${tone}`}>
          <Icon className="h-4 w-4" />
        </span>
        <p className="eyebrow">{label}</p>
      </div>
      <p className="h-display mt-3 font-mono text-3xl">{value}</p>
    </div>
  );
}

export default function OverviewTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listOrders()
      .then((o) => {
        if (!cancelled) setOrders(o);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load orders.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-xl border-rose-800/60 p-6 text-sm text-rose-300">
        Could not load orders: {error}
      </div>
    );
  }

  const priceList = DEFAULT_SITE_CONFIG.pricing ?? PACKAGES;
  const intake = orders.filter((o) => o.status === 'intake');
  const active = orders.filter((o) => o.stageIndex >= 1 && o.stageIndex <= 3);
  const pipelineValue = orders.reduce(
    (sum, o) => sum + (priceList.find((p) => p.id === o.packageId)?.price ?? 0),
    0,
  );
  const stale = intake.filter((o) => Date.now() - o.createdAt > 48 * 3_600_000);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow">console_overview</p>
        <h2 className="h-display mt-1 text-2xl">Studio at a glance</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={ClipboardList}
          label="total_orders"
          value={String(orders.length)}
          tone="border-cyan-700/60 bg-cyan-950/40 text-cyan-300"
        />
        <Kpi
          icon={Inbox}
          label="in_pipeline"
          value={String(intake.length)}
          tone="border-amber-700/60 bg-amber-950/40 text-amber-300"
        />
        <Kpi
          icon={Rocket}
          label="active_projects"
          value={String(active.length)}
          tone="border-indigo-700/60 bg-indigo-950/40 text-indigo-300"
        />
        <Kpi
          icon={Banknote}
          label="pipeline_value"
          value={fmtUSD(pipelineValue)}
          tone="border-emerald-700/60 bg-emerald-950/40 text-emerald-300"
        />
      </div>

      {stale.length > 0 && (
        <div className="glass rounded-xl border-amber-800/60 p-5">
          <div className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-amber-400" />
            <p className="eyebrow !text-amber-400/90">attention_queue</p>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {stale.map((o) => (
              <li key={o.id} className="telemetry flex items-center justify-between gap-3">
                <span className="truncate">
                  <span className="text-slate-200">{o.clientName}</span> · {o.brandUrl} · waiting{' '}
                  {ageDays(o.createdAt)}
                </span>
                <span className="shrink-0 rounded border border-amber-700/60 bg-amber-950/40 px-2 py-0.5 text-[10px] uppercase tracking-widest text-amber-300">
                  intake &gt; 48h
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="glass rounded-xl p-5">
        <p className="eyebrow">recent_orders</p>
        {orders.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No orders yet. New Hire Modal intakes will appear here.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-800/60">
            {orders.slice(0, 5).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-100">{o.clientName}</p>
                  <p className="telemetry truncate">{o.id}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm text-slate-300">{o.packageName || o.packageId}</p>
                  <p className="telemetry">
                    {STAGES[o.stageIndex]?.title ?? `stage ${o.stageIndex}`} · {ageDays(o.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
