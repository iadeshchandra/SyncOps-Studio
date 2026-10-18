import { ArrowUpRight, BadgeCheck, Star } from 'lucide-react';
import { PROOF_QUOTES, PROOF_STATS, PROOF_URL } from '../data/content';
import { useSiteConfig } from '../lib/siteConfig';

/**
 * Client proof section (id="cases" — nav anchor preserved).
 * Everything here is real and verifiable: the founder's Fiverr practice
 * (322 reviews at 4.9★) with a link to read them. Never invented.
 * The owner can edit the quotes from Studio Console → Content.
 */
export default function CaseStudies() {
  const { config } = useSiteConfig();
  const quotes = config.proofQuotes ?? PROOF_QUOTES;
  return (
    <div id="cases" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6 lg:py-28">
      <p className="eyebrow mb-4">Verified Proof</p>
      <h2 className="h-display text-3xl sm:text-4xl">Trusted where it counts</h2>
      <p className="mt-4 max-w-2xl text-slate-400">
        Before the studio, six years of hands-on tracking work — every review below is
        public and verifiable on Fiverr.
      </p>

      <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {PROOF_STATS.map((s) => (
          <div key={s.label} className="glass rounded-lg p-5">
            <p className="font-mono text-2xl font-black text-slate-50">{s.value}</p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {quotes.map((q) => (
          <figure key={q.author + q.quote.slice(0, 12)} className="glass card-hover rounded-lg p-6">
            <div className="flex items-center gap-1" aria-label="5 out of 5 stars">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <blockquote className="mt-4 text-sm italic leading-relaxed text-slate-300">
              “{q.quote}”
            </blockquote>
            <figcaption className="mt-4 flex items-center gap-2 font-mono text-xs text-slate-500">
              <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                {q.author} · {q.context}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>

      <a
        href={PROOF_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
      >
        Read all 322 reviews on Fiverr
        <ArrowUpRight className="h-4 w-4" />
      </a>
    </div>
  );
}
