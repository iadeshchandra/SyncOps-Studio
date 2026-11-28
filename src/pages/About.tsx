import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, KeyRound, Scale, FileCheck2, FlaskConical, UserCheck } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useSiteConfig } from '../lib/siteConfig';
import { PAGE_WORDS } from '../data/content';
import { useConfigPageMeta } from '../lib/meta';
import { PROOF_STATS, PROOF_URL } from '../data/content';
import { useHireModal } from '../components/HireModal';

const PRINCIPLES: { icon: typeof KeyRound; title: string; body: string }[] = [
  {
    icon: KeyRound,
    title: 'You own everything',
    body: 'Containers, cloud projects, exports and documentation live in your accounts, under your keys. If we vanished tomorrow, your tracking would keep running — that is the test every build has to pass.',
  },
  {
    icon: Scale,
    title: 'Honest numbers, or none',
    body: 'Every figure on this site is checkable: the review count is public, the match-quality guarantee is measured on your live traffic, and anything we cannot verify does not get printed.',
  },
  {
    icon: FileCheck2,
    title: 'Fixed scope, fixed price',
    body: 'You approve a package with a known price and a known deliverable list before money moves. Scope changes are quoted in your portal before work begins — never billed by surprise.',
  },
  {
    icon: FlaskConical,
    title: 'Proof over promises',
    body: 'A setup is done when a real order arrives in the platform\u2019s test events with the right value — not when a dashboard looks pretty. Our field notes show the receipts.',
  },
  {
    icon: UserCheck,
    title: 'One architect',
    body: 'The person who scopes your build is the person who builds it and the person who answers you in the portal. No account managers, no hand-offs, no telephone game.',
  },
];

export default function About() {
  const { openHireModal } = useHireModal();
  useConfigPageMeta('about');

  const { config } = useSiteConfig();
  const w = config.pageWords?.about ?? PAGE_WORDS.about;

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-12 sm:px-6">
        <p className="eyebrow">{w.eyebrow}</p>
        <h1 className="h-display mt-2 text-3xl sm:text-4xl">{w.title}</h1>
        <p className="mt-4 leading-relaxed text-slate-400">{w.intro}</p>

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

        <section className="mt-12">
          <h2 className="h-display text-xl text-slate-100">How it started</h2>
          <p className="mt-3 leading-relaxed text-slate-400">
            The practice began on Fiverr in 2019, fixing pixels and tag manager setups for
            stores that could not understand why their ad platforms disagreed with their
            order books. Then the ground moved: iOS privacy changes, ad blockers and browser
            cookie limits quietly broke browser-side tracking, and the work became what it
            is now — server-side infrastructure. Conversions APIs, deduplication, consent
            wiring, match quality. The questions clients ask have not changed since 2019,
            though: <em className="text-slate-300">where did my sales actually come from, and why do the numbers not match?</em>
          </p>
          <p className="mt-3 leading-relaxed text-slate-400">
            Six years and 240+ businesses later, the studio is the same practice with a
            proper front door: a client portal where scope, payments, files and deliveries
            live in the open, field notes that document real repairs, and products of our
            own built with the same discipline we sell.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="h-display text-xl text-slate-100">What we hold to</h2>
          <div className="mt-6 space-y-4">
            {PRINCIPLES.map((p) => (
              <div key={p.title} className="glass flex gap-4 rounded-lg p-5">
                <p.icon className="mt-0.5 h-6 w-6 shrink-0 text-cyan-300" />
                <div>
                  <h3 className="font-bold text-slate-100">{p.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="h-display text-xl text-slate-100">Two doors, one roof</h2>
          <p className="mt-3 leading-relaxed text-slate-400">
            Services are one door: the measurement work above, for clients. Products are the
            other: software the studio builds and runs itself — Sanatani Bandhan, an ERP for
            Sanatana Dharma institutions, is live; XTRIVO, a cross-platform download manager,
            is in build. The two sides keep each other honest: the studio sells only what it
            would run, and runs what it sells.
          </p>
          <Link
            to="/work"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
          >
            See the products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <div className="mt-12 rounded-xl border border-slate-800/80 bg-slate-900/40 px-5 py-5">
          <p className="text-sm leading-relaxed text-slate-300">
            The record is public —{' '}
            <a
              href={PROOF_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-cyan-300 underline decoration-cyan-800 underline-offset-2 hover:text-cyan-200"
            >
              read the reviews on Fiverr
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>{' '}
            — or skip the reading and{' '}
            <button
              type="button"
              onClick={() => openHireModal()}
              className="font-semibold text-cyan-300 underline decoration-cyan-800 underline-offset-2 hover:text-cyan-200"
            >
              start a project
            </button>
            . Questions first? See{' '}
            <Link to="/process" className="font-semibold text-cyan-300 underline decoration-cyan-800 underline-offset-2 hover:text-cyan-200">
              how we work
            </Link>{' '}
            or{' '}
            <Link to="/contact" className="font-semibold text-cyan-300 underline decoration-cyan-800 underline-offset-2 hover:text-cyan-200">
              contact the studio
            </Link>
            .
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
