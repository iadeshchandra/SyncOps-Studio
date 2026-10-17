import { ArrowRight, Check, Satellite, Radar, AppWindow } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SERVICE_LINES } from '../data/services';
import { useHireModal } from './HireModal';
import { cx } from '../lib/format';

const ICONS: Record<string, LucideIcon> = {
  Satellite,
  Radar,
  AppWindow,
};

export default function ServicesSection() {
  const { openHireModal } = useHireModal();

  return (
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
      <p className="eyebrow mb-4">Studio Services</p>
      <h2 className="h-display text-3xl sm:text-4xl">Three ways to work with us</h2>
      <p className="mt-4 max-w-2xl text-slate-400">
        Build it, measure it, or recover the signal you are losing — every engagement ships
        with a live project portal and an SLA-backed handover.
      </p>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {SERVICE_LINES.map((line, i) => {
          const Icon = ICONS[line.icon] ?? Satellite;
          const accents = [
            'border-emerald-500/40 bg-emerald-950/50 text-emerald-300',
            'border-cyan-500/40 bg-cyan-950/50 text-cyan-300',
            'border-indigo-500/40 bg-indigo-950/50 text-indigo-300',
          ];
          return (
            <div key={line.id} className="glass card-hover flex flex-col rounded-lg p-6 sm:p-8">
              <span
                className={cx(
                  'inline-flex h-12 w-12 items-center justify-center rounded-lg border',
                  accents[i % accents.length]
                )}
              >
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="h-display mt-5 text-xl">{line.name}</h3>
              <p className="mt-1 font-mono text-xs tracking-wide text-slate-500">{line.tagline}</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{line.description}</p>

              <p className="mt-5 font-mono text-2xl font-black tracking-tight text-slate-50">
                {line.packages[0].price.startsWith('$') ? (
                  <>
                    <span className="text-sm font-medium text-slate-500">From </span>
                    {line.packages[0].price}
                  </>
                ) : (
                  line.packages[0].price
                )}
              </p>

              <ul className="mt-5 flex-1 space-y-2.5 border-t border-slate-800/80 pt-5">
                {line.packages.map((p) => (
                  <li key={p.id} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span>
                      <span className="font-semibold text-slate-100">{p.name}</span>
                      <span className="font-mono text-slate-500"> — {p.price}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => openHireModal({ serviceLine: line.id })}
                className="btn-primary mt-8 w-full"
              >
                Start a project <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
