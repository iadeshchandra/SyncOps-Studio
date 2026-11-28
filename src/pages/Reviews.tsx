import { useEffect, useState } from 'react';
import { ArrowUpRight, BadgeCheck, Star } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useConfigPageMeta } from '../lib/meta';
import { PROOF_STATS, PROOF_URL } from '../data/content';
import { PROOF_QUOTES } from '../data/content';
import { useSiteConfig } from '../lib/siteConfig';
import { listPublishedReviews, type Review } from '../lib/reviews';
import { cx } from '../lib/format';

export default function Reviews() {
  const { config } = useSiteConfig();
  const quotes = config.proofQuotes ?? PROOF_QUOTES;
  const [studioReviews, setStudioReviews] = useState<Review[]>([]);

  useEffect(() => {
    let cancelled = false;
    listPublishedReviews()
      .then((r) => {
        if (!cancelled) setStudioReviews(r);
      })
      .catch(() => {
        /* the Fiverr record stands alone */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useConfigPageMeta('reviews');

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6">
        <p className="eyebrow">reviews</p>
        <h1 className="h-display mt-2 text-3xl sm:text-4xl">Rated by the people who paid</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-slate-400">
          Two sources, both checkable. The Fiverr record is public — six years of it, and
          we cannot edit a word. Studio reviews come from completed engagements here and
          are published only after the work is delivered and accepted.
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

        <h2 className="h-display mt-12 text-2xl text-slate-100">From the Fiverr record</h2>
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
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
        >
          Read all 322 reviews on Fiverr
          <ArrowUpRight className="h-4 w-4" />
        </a>

        <h2 className="h-display mt-12 text-2xl text-slate-100">From studio engagements</h2>
        {studioReviews.length === 0 ? (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">
            The studio&apos;s own review shelf fills as engagements complete — the first
            portal clients are in progress now. Until then, the public Fiverr record above
            is the whole story, and we would rather show you that than a wall of curated
            quotes.
          </p>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {studioReviews.map((r) => (
              <figure key={r.id} className="glass card-hover rounded-lg p-6">
                <div className="flex items-center gap-1" aria-label={`${r.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={cx(
                        'h-4 w-4',
                        i <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600',
                      )}
                    />
                  ))}
                </div>
                <blockquote className="mt-4 text-sm italic leading-relaxed text-slate-300">
                  “{r.text}”
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-2 font-mono text-xs text-slate-500">
                  <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{r.clientName} · studio client</span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
