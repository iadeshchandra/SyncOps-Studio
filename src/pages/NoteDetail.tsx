import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FileQuestion, Rocket } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useHireModal } from '../components/HireModal';
import { formatArticleDate, getArticleDoc, type Article } from '../lib/articles';

/** A short line written in ALL CAPS in the body renders as a section heading. */
function isHeading(paragraph: string): boolean {
  const t = paragraph.trim();
  return t.length > 0 && t.length <= 90 && /[A-Z]/.test(t) && t === t.toUpperCase();
}

function BodyParagraphs({ body }: { body: string }) {
  const paragraphs = useMemo(
    () =>
      body
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean),
    [body],
  );
  return (
    <div>
      {paragraphs.map((p, i) =>
        isHeading(p) ? (
          <h2 key={i} className="h-display mt-10 text-xl first:mt-0 sm:text-2xl">
            {p.charAt(0) + p.slice(1).toLowerCase()}
          </h2>
        ) : (
          <p key={i} className="mt-5 leading-[1.85] text-slate-300 first:mt-0">
            {p}
          </p>
        ),
      )}
    </div>
  );
}

export default function NoteDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { openHireModal } = useHireModal();
  const [article, setArticle] = useState<Article | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setArticle(undefined);
    if (slug) {
      void getArticleDoc(slug).then((a) => {
        if (!cancelled) setArticle(a);
      });
    }
    window.scrollTo(0, 0);
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (article) {
      const prev = document.title;
      document.title = `${article.title} — SyncOps Studio`;
      return () => {
        document.title = prev;
      };
    }
  }, [article]);

  if (article === undefined) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-24 sm:px-6">
          <div className="h-5 w-32 animate-pulse rounded bg-slate-800" />
          <div className="mt-6 h-10 w-3/4 animate-pulse rounded bg-slate-800" />
          <div className="mt-3 h-10 w-1/2 animate-pulse rounded bg-slate-800" />
          <div className="mt-8 h-4 w-full animate-pulse rounded bg-slate-800/70" />
          <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-slate-800/70" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-slate-800/70" />
        </main>
        <Footer />
      </div>
    );
  }

  if (article === null) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-24 sm:px-6">
          <div className="glass flex flex-col items-center rounded-lg px-6 py-16 text-center">
            <FileQuestion className="h-8 w-8 text-slate-500" />
            <p className="h-display mt-4 text-lg text-slate-200">Note not found</p>
            <p className="mt-2 max-w-sm text-sm text-slate-500">
              This field note doesn't exist — it may have been moved, renamed, or
              unpublished.
            </p>
            <Link to="/notes" className="btn-ghost mt-6">
              <ArrowLeft className="h-4 w-4" /> Back to field notes
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main>
        {/* Article header */}
        <div className="relative overflow-hidden border-b border-slate-800/60">
          <div
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500/70 via-emerald-400/30 to-transparent"
            aria-hidden="true"
          />
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:py-20">
            <Link
              to="/notes"
              className="inline-flex items-center gap-1.5 font-mono text-xs tracking-[0.14em] text-slate-500 transition-colors hover:text-slate-200"
            >
              <ArrowLeft className="h-4 w-4" />
              ALL FIELD NOTES
            </Link>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="telemetry text-emerald-400">
                {formatArticleDate(article.publishedAt)}
              </span>
              {article.tags.map((t) => (
                <span
                  key={t}
                  className="rounded border border-slate-700/80 bg-slate-900/80 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400"
                >
                  {t}
                </span>
              ))}
            </div>
            <h1 className="h-display mt-5 text-3xl leading-tight sm:text-5xl">
              {article.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-400">
              {article.excerpt}
            </p>
          </div>
        </div>

        {/* Body */}
        <article className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
          <BodyParagraphs body={article.body} />
        </article>

        {/* CTA row */}
        <div className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
          <section className="glass relative overflow-hidden rounded-xl p-6 sm:p-8">
            <div className="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-md">
                <p className="eyebrow">Sound familiar?</p>
                <h2 className="h-display mt-2 text-2xl">
                  Get your stack audited and rebuilt.
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  We measure exactly how much signal your ad platforms are losing,
                  then rebuild the pipeline server-side — deduplicated, consented,
                  and matched.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:items-end">
                <button type="button" className="btn-primary" onClick={() => openHireModal()}>
                  <Rocket className="h-4 w-4" /> Start a project
                </button>
                <Link
                  to="/notes"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-300 transition-colors hover:text-white"
                >
                  More field notes
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
