import { useMemo } from 'react';
import { Activity } from 'lucide-react';
import { NODES, type TelemetryNode } from '../lib/telemetry';
import { cx, fmtMs, fmtPct } from '../lib/format';

/** Seeded pseudo-random walk -> 24 deterministic sparkline points around the node latency. */
function sparkPoints(node: TelemetryNode): string {
  const W = 220;
  const H = 48;
  let seed = 0;
  for (const c of node.id) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const min = node.latencyMs * 0.4;
  const max = node.latencyMs * 1.6;
  const pts: string[] = [];
  let v = node.latencyMs;
  for (let i = 0; i < 24; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const jitter = (seed % 1000) / 1000 - 0.5; // -0.5 .. 0.5
    v = Math.min(max, Math.max(min, v + jitter * node.latencyMs * 0.35));
    const x = (i / 23) * W;
    const y = H - ((v - min) / (max - min || 1)) * (H - 6) - 3;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

function NodeCard({ node, wide }: { node: TelemetryNode; wide?: boolean }) {
  const points = useMemo(() => sparkPoints(node), [node]);
  const operational = node.status === 'operational';

  return (
    <article
      className={cx(
        'glass card-hover flex flex-col gap-3 rounded-lg p-5',
        wide && 'md:col-span-2 lg:col-span-2',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow">{node.subsystem}</span>
        <span
          className={cx(
            'inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[10px] tracking-[0.14em]',
            operational
              ? 'border-emerald-700/80 bg-emerald-950/80 text-emerald-400'
              : 'border-amber-700/80 bg-amber-950/80 text-amber-400',
          )}
        >
          <span
            className={cx(
              'h-1.5 w-1.5 rounded-full animate-pulse-dot',
              operational ? 'bg-emerald-400' : 'bg-amber-400',
            )}
          />
          {operational ? 'OPERATIONAL' : 'DEGRADED'}
        </span>
      </div>

      <h3 className="text-lg font-bold tracking-tight text-slate-50">{node.name}</h3>
      <p className="text-sm leading-relaxed text-slate-400">{node.description}</p>

      <div className="mt-1 flex items-end justify-between gap-4">
        <div>
          <p className="label-dark !mb-1">{node.metricLabel}</p>
          <p className="font-mono text-2xl font-bold text-slate-50">{node.metricValue}</p>
        </div>
        <svg
          viewBox="0 0 220 48"
          className="h-12 w-40 shrink-0 sm:w-48"
          role="img"
          aria-label={`${node.name} latency sparkline`}
        >
          <polyline
            points={points}
            fill="none"
            stroke="#34d399"
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.9"
          />
        </svg>
      </div>

      <div className="mt-auto flex items-center gap-4 border-t border-slate-800/70 pt-3">
        <span className="telemetry inline-flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-cyan-400" />
          p50 {fmtMs(node.latencyMs)}
        </span>
        <span className="telemetry">uptime {fmtPct(node.uptimePct)}</span>
      </div>
    </article>
  );
}

export default function TelemetryBento({ nodes = NODES }: { nodes?: TelemetryNode[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {nodes.map((node, i) => (
        <NodeCard key={node.id} node={node} wide={i === 0} />
      ))}
    </div>
  );
}
