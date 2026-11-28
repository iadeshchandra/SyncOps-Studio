import { Link } from 'react-router-dom';
import { ArrowRight, Wrench } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useConfigPageMeta } from '../lib/meta';
import { TOOLS } from '../data/tools';

export default function Tools() {
  useConfigPageMeta('tools');

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6">
        <p className="eyebrow">free studio tools</p>
        <h1 className="h-display mt-2 text-3xl sm:text-4xl">Tools that show their working</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-slate-400">
          The same instruments the studio uses in paid audits, published free. No sign-up, no
          email wall before a result, and every estimate prints its formula and assumptions —
          a number you cannot inspect is a number you should not trust.
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) =>
            tool.status === 'live' ? (
              <Link
                key={tool.slug}
                to={`/tools/${tool.slug}`}
                className="glass group rounded-xl p-6 transition-colors hover:border-cyan-700"
              >
                <p className="flex items-center gap-2 text-emerald-400">
                  <Wrench className="h-4 w-4" />
                  <span className="telemetry">{tool.phase}</span>
                </p>
                <h2 className="h-display mt-3 text-xl">{tool.name}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{tool.blurb}</p>
                <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300">
                  Open the tool <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </p>
              </Link>
            ) : (
              <div key={tool.slug} className="glass rounded-xl p-6 opacity-70">
                <p className="telemetry text-slate-500">{tool.phase}</p>
                <h2 className="h-display mt-3 text-xl text-slate-300">{tool.name}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{tool.blurb}</p>
              </div>
            ),
          )}
        </div>

        <section className="mt-16 max-w-3xl">
          <h2 className="h-display text-2xl">How these tools treat your data</h2>
          <p className="mt-3 leading-relaxed text-slate-400">
            Everything runs in your browser. The calculators and builders send nothing to a
            server — close the tab and the numbers are gone. Where a tool offers a full report
            by email, the email is the only thing collected, and only when you ask for the
            report. Estimates are labelled as estimates, with the formula on the page; a
            checker result always shows the evidence it found, and &ldquo;not found&rdquo; is
            reported as &ldquo;not found in public code&rdquo; — never as &ldquo;not
            installed&rdquo;.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
