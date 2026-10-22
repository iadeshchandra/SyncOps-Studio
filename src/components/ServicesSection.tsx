import { ArrowRight, ArrowUpRight, Check, Satellite, Radar, AppWindow, Bot, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SERVICE_LINES } from '../data/services';
import { useHireModal } from './HireModal';
import { cx } from '../lib/format';

const ICONS: Record<string, LucideIcon> = {
  Satellite,
  Radar,
  AppWindow,
  Bot,
};

export default function ServicesSection() {
  const { openHireModal } = useHireModal();

  return (
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
      <p className="eyebrow mb-4">Studio Services</p>
      <h2 className="h-display text-3xl sm:text-4xl">Four ways to work with us</h2>
      <p className="mt-4 max-w-2xl text-slate-400">
        Build it, measure it, or recover the signal you are losing — every engagement ships
        with a live project portal and an SLA-backed handover.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {SERVICE_LINES.map((line, i) => {
          const Icon = ICONS[line.icon] ?? Satellite;
          const accents = [
            'border-emerald-500/40 bg-emerald-950/50 text-emerald-300',
            'border-cyan-500/40 bg-cyan-950/50 text-cyan-300',
            'border-indigo-500/40 bg-indigo-950/50 text-indigo-300',
            'border-amber-500/40 bg-amber-950/50 text-amber-300',
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

              {line.proof && (
                <a
                  href={line.proof.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 block rounded-md border border-amber-700/40 bg-amber-950/30 px-3 py-2.5 transition-colors hover:border-amber-600/60"
                >
                  <span className="flex items-center gap-2 text-xs text-amber-200/90">
                    <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                    {line.proof.text}
                  </span>
                  <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-100 underline underline-offset-2">
                    {line.proof.urlLabel}
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
                </a>
              )}

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

              {line.migrationNote && (
                <p className="mt-5 rounded-md border border-cyan-800/50 bg-cyan-950/30 px-3 py-2.5 text-xs leading-relaxed text-cyan-200/90">
                  {line.migrationNote}
                </p>
              )}

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

      {/* Why not SaaS? — honest positioning vs Stape / PixelFly style tools */}
      <div className="glass mt-12 overflow-hidden rounded-lg">
        <div className="grid md:grid-cols-2">
          <div className="p-6 sm:p-8">
            <p className="eyebrow mb-3 !text-[10px]">DIY SaaS · Stape / PixelFly style</p>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li className="flex gap-2.5"><span className="text-slate-600">—</span>You configure containers, tags and deduplication yourself</li>
              <li className="flex gap-2.5"><span className="text-slate-600">—</span>$15–100/mo per seat of infrastructure, forever</li>
              <li className="flex gap-2.5"><span className="text-slate-600">—</span>Great if you have an in-house tracking specialist</li>
            </ul>
          </div>
          <div className="border-t border-slate-800/80 bg-emerald-950/20 p-6 sm:p-8 md:border-l md:border-t-0">
            <p className="eyebrow mb-3 !text-[10px] !text-emerald-400">Done-for-you · SyncOps Studio</p>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />Architected for your stack by a 4.9★ practitioner</li>
              <li className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />One fixed price — you own the infrastructure after handover</li>
              <li className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />Live project portal, EMQ verification and SLA-backed handover</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
