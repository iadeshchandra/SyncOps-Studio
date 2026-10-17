import { Globe, Server, GitCompareArrows, Send } from 'lucide-react';
import { PIPELINE_STEPS } from '../data/content';

const ICONS = [Globe, Server, GitCompareArrows, Send];

export default function ProtocolPipeline() {
  return (
    <div id="pipeline" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6 lg:py-28">
      <p className="eyebrow mb-4">Protocol Architecture</p>
      <h2 className="h-display text-3xl sm:text-4xl">The SyncOps Pipeline</h2>
      <p className="mt-4 max-w-2xl text-slate-400">
        Four stages. Zero browser dependency. Every conversion captured server-side,
        deduplicated deterministically and dispatched at the edge in ~12ms.
      </p>

      <div className="relative mt-12">
        <div
          className="pointer-events-none absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-emerald-500/60 via-cyan-500/60 to-indigo-500/60 lg:block"
          aria-hidden="true"
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE_STEPS.map((step, i) => {
            const Icon = ICONS[i];
            return (
              <div key={step.title} className="glass card-hover relative rounded-lg p-6">
                <div className="relative z-10 mb-5 flex h-16 w-16 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950">
                  <Icon className="h-7 w-7 text-cyan-300" />
                </div>
                <p className="mb-2 font-mono text-[11px] tracking-[0.24em] text-slate-500">
                  STAGE 0{i + 1}
                </p>
                <h3 className="text-base font-bold text-slate-50">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.desc}</p>
                <p className="mt-4 rounded-md border border-slate-800 bg-black/50 px-3 py-2 font-mono text-[11px] text-emerald-300/90">
                  {step.mono}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
