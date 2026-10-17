import { Check } from 'lucide-react';
import { STAGES } from '../lib/portal';
import { cx } from '../lib/format';

export default function MilestoneTracker({ stageIndex }: { stageIndex: number }) {
  return (
    <div className="glass rounded-xl p-6">
      <p className="eyebrow mb-1">project_milestones</p>
      <h3 className="h-display text-lg">Build Progress</h3>

      <ol className="mt-6">
        {STAGES.map((stage, i) => {
          const done = i < stageIndex;
          const active = i === stageIndex;
          const last = i === STAGES.length - 1;
          return (
            <li key={stage.title} className="relative flex gap-4 pb-8 last:pb-0">
              {!last && (
                <span
                  aria-hidden
                  className={cx(
                    'absolute left-[15px] top-9 h-[calc(100%-2rem)] w-px',
                    done ? 'bg-emerald-500/50' : 'bg-slate-800',
                  )}
                />
              )}

              <span
                className={cx(
                  'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border',
                  done && 'border-emerald-600/70 bg-emerald-500/20 text-emerald-400',
                  active && 'border-cyan-400/70 bg-cyan-500/10',
                  !done && !active && 'border-slate-800 bg-slate-900 text-slate-600',
                )}
              >
                {done ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : active ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
                  </span>
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />
                )}
              </span>

              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-center gap-2">
                  <p
                    className={cx(
                      'text-sm font-bold tracking-tight',
                      done && 'text-slate-100',
                      active && 'text-slate-50',
                      !done && !active && 'text-slate-500',
                    )}
                  >
                    {stage.title}
                  </p>
                </div>
                <p
                  className={cx(
                    'mt-1 text-[13px] leading-relaxed',
                    done || active ? 'text-slate-400' : 'text-slate-600',
                  )}
                >
                  {stage.desc}
                </p>
                <p
                  className={cx(
                    'mt-1.5 font-mono text-[10px] uppercase tracking-[0.22em]',
                    done && 'text-emerald-400/90',
                    active && 'text-cyan-400',
                    !done && !active && 'text-slate-600',
                  )}
                >
                  {done ? 'complete' : active ? 'in progress' : 'queued'}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
