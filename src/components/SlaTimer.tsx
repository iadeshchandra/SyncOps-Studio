import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { cx } from '../lib/format';

const HOUR = 3_600_000;

export default function SlaTimer({ deadlineAt }: { deadlineAt: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = deadlineAt - now;
  const overdue = remaining <= 0;
  const critical = !overdue && remaining < 24 * HOUR;
  const warning = !overdue && !critical && remaining < 48 * HOUR;

  const tone = overdue || critical
    ? { text: 'text-rose-400', border: 'border-rose-800/60', glow: 'bg-rose-950/50' }
    : warning
      ? { text: 'text-amber-400', border: 'border-amber-700/60', glow: 'bg-amber-950/40' }
      : { text: 'text-emerald-400', border: 'border-emerald-700/60', glow: 'bg-emerald-950/40' };

  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / HOUR);
  const mins = Math.floor((remaining % HOUR) / 60_000);
  const secs = Math.floor((remaining % 60_000) / 1000);
  const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0');
  const countdown = `${Math.max(0, days)}d ${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;

  return (
    <div className={cx('rounded-xl border backdrop-blur-xl p-5', tone.border, tone.glow)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Timer className={cx('h-5 w-5', tone.text)} />
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-400">
            Estimated Handover
          </p>
        </div>
        <p className="telemetry hidden sm:block">
          sla_target: {new Date(deadlineAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>
      <p className={cx('mt-3 font-mono text-4xl font-black tracking-tight tabular-nums sm:text-5xl', tone.text)}>
        {overdue ? 'OVERDUE' : countdown}
      </p>
      <p className="mt-2 text-[13px] text-slate-400">
        {overdue
          ? 'Handover target passed — your Lead Architect has been notified and is re-forecasting.'
          : critical
            ? 'Handover window is under 24 hours. Final QA is underway.'
            : warning
              ? 'Approaching the handover window. Milestones are on track.'
              : 'Build is on schedule against the agreed SLA.'}
      </p>
    </div>
  );
}
