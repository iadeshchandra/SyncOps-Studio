import { TrendingUp } from 'lucide-react';
import { CASE_STUDIES } from '../data/content';
import { fmtCompactUSD } from '../lib/format';

export default function CaseStudies() {
  return (
    <div id="cases" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6 lg:py-28">
      <p className="eyebrow mb-4">Verified Outcomes</p>
      <h2 className="h-display text-3xl sm:text-4xl">Case Studies</h2>
      <p className="mt-4 max-w-2xl text-slate-400">
        Real deployments, real dashboards. ROAS measured before and after the SyncOps
        server-side stack went live.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {CASE_STUDIES.map((c) => {
          const lift = ((c.roasAfter - c.roasBefore) / c.roasBefore) * 100;
          return (
            <article key={c.brand} className="glass card-hover rounded-lg p-6 sm:p-8">
              <p className="eyebrow !text-[10px]">{c.vertical}</p>
              <h3 className="h-display mt-2 text-2xl">{c.brand}</h3>

              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                  <span className="font-mono text-sm text-slate-500">{c.roasBefore.toFixed(1)}x</span>
                  <span className="text-slate-600">→</span>
                  <span className="font-mono text-xl font-black text-emerald-300">
                    {c.roasAfter.toFixed(1)}x
                  </span>
                  <span className="rounded-md border border-emerald-700/60 bg-emerald-950/60 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-300">
                    +{lift.toFixed(0)}%
                  </span>
                </div>
                <span className="rounded-md border border-cyan-700/60 bg-cyan-950/40 px-2.5 py-1 font-mono text-[11px] text-cyan-300">
                  EMQ {c.emq.toFixed(1)}
                </span>
              </div>

              <p className="telemetry mt-4">monthly ad spend {fmtCompactUSD(c.adSpend)}</p>

              <blockquote className="mt-4 border-l-2 border-slate-700 pl-4 text-sm italic leading-relaxed text-slate-300">
                “{c.quote}”
              </blockquote>
              <p className="mt-3 font-mono text-xs text-slate-500">— {c.author}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
