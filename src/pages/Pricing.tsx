import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useConfigPageMeta } from '../lib/meta';
import { useServiceLines } from '../lib/siteConfig';
import { displayPrice } from '../data/services';
import { useHireModal } from '../components/HireModal';

export default function Pricing() {
  const lines = useServiceLines();
  const { openHireModal } = useHireModal();
  useConfigPageMeta('pricing');

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6">
        <p className="eyebrow">pricing</p>
        <h1 className="h-display mt-2 text-3xl sm:text-4xl">Every package, every price</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-slate-400">
          One-time engineering fees — no hourly billing, no retainers, no percentage of ad
          spend. You pay once for the build; the infrastructure is yours, and its running
          cost (typically $20–100/month in cloud fees, paid by you to the cloud provider)
          is the only recurring number. Optional care plans exist if you want us watching
          it afterwards.
        </p>

        {lines.map((line) => (
          <section key={line.id} className="mt-14">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="h-display text-2xl text-slate-100">{line.name}</h2>
                <p className="mt-1 text-sm text-slate-400">{line.tagline}</p>
              </div>
              <Link
                to={`/services/${line.id}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
              >
                Full details &amp; feature lists
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              {line.packages.map((pkg) => (
                <div key={pkg.id} className="glass card-hover flex flex-col rounded-lg p-6">
                  <h3 className="font-bold text-slate-50">{pkg.name}</h3>
                  <p className="mt-2 font-mono text-3xl font-black text-slate-50">{displayPrice(pkg)}</p>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{pkg.blurb}</p>
                  <button
                    type="button"
                    onClick={() => openHireModal({ packageId: pkg.id })}
                    className="mt-6 inline-flex items-center justify-center gap-1.5 rounded-md bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-300"
                  >
                    Start with {pkg.name}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <div className="glass rounded-lg p-6">
            <h2 className="h-display text-xl text-slate-100">How payment works</h2>
            <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-slate-300">
              {[
                'You pay the studio directly — bKash, Wise or Payoneer — using the details inside your own client portal.',
                'Put your order reference in the payment note and file the claim in your portal; it is verified against the studio\u2019s records by transaction ID.',
                'Never trust payment details sent by email. Portal-only is a rule that protects you.',
                'Prefer a marketplace? The same packages can be ordered through Fiverr, under its terms.',
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="glass rounded-lg p-6">
            <h2 className="h-display text-xl text-slate-100">If it does not work out</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Before work starts, verified payments come back in full, minus only a fee the
              payment rail itself keeps. After work starts, stages not yet delivered are
              refunded pro-rata; delivered and accepted stages are not refundable, and you
              keep their artifacts, exports and documentation. Refunds return over the same
              rail within 10 business days.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              The complete policy — revisions, timelines, your data rights — is on the{' '}
              <Link to="/terms" className="font-semibold text-cyan-300 underline decoration-cyan-800 underline-offset-2 hover:text-cyan-200">
                Terms &amp; Refunds page
              </Link>
              , written to be read before you pay.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Not sure which package fits? The{' '}
              <Link to="/faq" className="font-semibold text-cyan-300 hover:text-cyan-200">
                FAQ
              </Link>{' '}
              answers it honestly — including when the answer is a cheaper tool instead.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
