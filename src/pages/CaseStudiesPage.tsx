import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CaseStudies from '../components/CaseStudies';
import { useConfigPageMeta } from '../lib/meta';
import { formatArticleDate, useArticles } from '../lib/articles';

export default function CaseStudiesPage() {
  const { articles, loading } = useArticles();
  const cases = articles.filter((a) => a.tags.some((t) => t.toLowerCase() === 'case study'));
  useConfigPageMeta('case-studies');

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main>
        <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:pt-24">
          <p className="eyebrow mb-4">Case Studies</p>
          <h1 className="h-display max-w-3xl text-4xl sm:text-5xl">
            Documented repairs, not testimonials with charts
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-400">
            Each report below is a real engagement with the client&apos;s details removed:
            what was broken, how it was found, what fixed it, and the proof it worked.
            The numbers we claim anywhere are the ones you can check.
          </p>
        </div>

        <CaseStudies />

        <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
          <p className="eyebrow mb-4">Field reports</p>
          <h2 className="h-display text-2xl sm:text-3xl">From the repair bench</h2>
          {loading ? (
            <p className="mt-6 text-sm text-slate-500">Loading reports…</p>
          ) : cases.length === 0 ? (
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-slate-400">
              The written reports are being prepared for publication. In the meantime the
              review record above is the proof — every word of it public on Fiverr.
            </p>
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {cases.map((a) => (
                <article key={a.id} className="glass card-hover relative flex flex-col overflow-hidden rounded-lg p-6 sm:p-8">
                  <div
                    className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500/70 via-emerald-400/30 to-transparent"
                    aria-hidden="true"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <span className="telemetry text-emerald-400">{formatArticleDate(a.publishedAt)}</span>
                    <span className="telemetry text-slate-600">CASE STUDY</span>
                  </div>
                  <h3 className="h-display mt-4 text-2xl">{a.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">{a.excerpt}</p>
                  <Link
                    to={`/notes/${a.id}`}
                    className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-200 transition-colors hover:text-white"
                  >
                    Read the report
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
