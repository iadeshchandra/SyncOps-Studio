import { } from 'react';
import { useConfigPageMeta } from '../lib/meta';
import { Link } from 'react-router-dom';
import { ArrowRight, NotebookPen } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { formatArticleDate, useArticles, type Article } from '../lib/articles';

function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="glass card-hover relative flex flex-col overflow-hidden rounded-lg p-6 sm:p-8">
      <div
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500/70 via-emerald-400/30 to-transparent"
        aria-hidden="true"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="telemetry text-emerald-400">{formatArticleDate(article.publishedAt)}</span>
        <span className="telemetry text-slate-600">FIELD NOTE</span>
      </div>

      <h3 className="h-display mt-4 text-2xl">{article.title}</h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">{article.excerpt}</p>

      {article.tags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {article.tags.map((t) => (
            <span
              key={t}
              className="rounded border border-slate-700/80 bg-slate-900/80 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <Link
        to={`/notes/${article.id}`}
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-200 transition-colors hover:text-white"
      >
        Read note
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

function SkeletonGrid() {
  return (
    <div className="mt-10 grid gap-6 md:grid-cols-2" aria-hidden="true">
      {[0, 1].map((i) => (
        <div key={i} className="glass rounded-lg p-6 sm:p-8">
          <div className="h-5 w-28 animate-pulse rounded bg-slate-800" />
          <div className="mt-4 h-7 w-3/4 animate-pulse rounded bg-slate-800" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-800/70" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-slate-800/70" />
        </div>
      ))}
    </div>
  );
}

export default function Notes() {
  const { articles, loading } = useArticles();

  useConfigPageMeta('notes');

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <p className="eyebrow mb-4">Field Notes</p>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <h1 className="h-display text-4xl sm:text-5xl">
                Notes from the
                <br />
                measurement layer.
              </h1>
              <p className="mt-5 text-base leading-relaxed text-slate-400">
                What we learn auditing and rebuilding tracking stacks for a living —
                signal loss, match quality, consent, and the plumbing in between.
                No growth hacks, no invented numbers: just how the platforms
                actually work.
              </p>
            </div>
            <span className="telemetry hidden items-center gap-2 lg:inline-flex">
              <NotebookPen className="h-4 w-4 text-emerald-400" />
              {articles.length} published
            </span>
          </div>

          {loading ? (
            <SkeletonGrid />
          ) : articles.length === 0 ? (
            <div className="glass mt-10 rounded-lg px-6 py-16 text-center">
              <p className="h-display text-base text-slate-300">No notes published yet</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                The first field note is being written. Check back soon.
              </p>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {articles.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
