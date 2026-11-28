import { Link } from 'react-router-dom';
import { ArrowRight, Building2, EyeOff, FileCheck2, MessagesSquare } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useSiteConfig } from '../lib/siteConfig';
import { PAGE_WORDS } from '../data/content';
import { useConfigPageMeta } from '../lib/meta';
import { PROOF_STATS } from '../data/content';
import { useHireModal } from '../components/HireModal';

const MODEL: { icon: typeof Building2; title: string; body: string }[] = [
  {
    icon: EyeOff,
    title: 'Invisible by default',
    body: 'Your client sees your agency. Deliverables — container exports, QA reports, handover documentation — can carry your branding, and communication can run entirely through you. We never contact your clients directly and never market to them. Ever.',
  },
  {
    icon: FileCheck2,
    title: 'Fixed prices you can mark up',
    body: 'Every package has a published, fixed price — the same prices on this site. Quote your client your number, keep the margin, and know the cost side cannot move mid-project. Scope changes are quoted before work, in writing.',
  },
  {
    icon: Building2,
    title: 'Built in the client\u2019s accounts',
    body: 'Containers, cloud projects and pixels are created under the end client\u2019s own accounts, exactly as our direct builds are. When the engagement ends, your client keeps working infrastructure — and you keep a client whose tracking finally works.',
  },
  {
    icon: MessagesSquare,
    title: 'One specialist, on the record',
    body: 'You deal with the architect who does the work — the same practitioner behind 320+ public reviews. Project progress lives in a portal record you can inspect any time, so reporting up to your client is never guesswork.',
  },
];

const FITS: string[] = [
  'Paid-media agencies whose clients\u2019 ROAS reporting does not match their stores',
  'Shopify and e-commerce agencies who keep getting asked "can you fix our tracking?"',
  'Freelance media buyers who need server-side depth without hiring for it',
  'Anyone reselling Stape-style setups who is tired of configuring them by hand',
];

export default function ForAgencies() {
  const { openHireModal } = useHireModal();
  useConfigPageMeta('agencies');

  const { config } = useSiteConfig();
  const w = config.pageWords?.agencies ?? PAGE_WORDS.agencies;

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
          <h2 className="h-display text-xl text-slate-100">How the model works</h2>
          <div className="mt-6 space-y-4">
            {MODEL.map((m) => (
              <div key={m.title} className="glass flex gap-4 rounded-lg p-5">
                <m.icon className="mt-0.5 h-6 w-6 shrink-0 text-cyan-300" />
                <div>
                  <h3 className="font-bold text-slate-100">{m.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">{m.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="h-display text-xl text-slate-100">Who this fits</h2>
          <ul className="mt-4 space-y-2.5">
            {FITS.map((f) => (
              <li key={f} className="flex gap-2 text-sm leading-relaxed text-slate-300">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-12 rounded-xl border border-slate-800/80 bg-slate-900/40 px-5 py-5">
          <p className="text-sm leading-relaxed text-slate-300">
            Start the way direct clients do —{' '}
            <button
              type="button"
              onClick={() => openHireModal()}
              className="font-semibold text-cyan-300 underline decoration-cyan-800 underline-offset-2 hover:text-cyan-200"
            >
              open a project
            </button>{' '}
            and note in the brief that it is an agency engagement, or{' '}
            <Link to="/contact" className="font-semibold text-cyan-300 underline decoration-cyan-800 underline-offset-2 hover:text-cyan-200">
              write to the studio
            </Link>{' '}
            first to talk through your roster. The packages and prices are the{' '}
            <Link to="/pricing" className="font-semibold text-cyan-300 underline decoration-cyan-800 underline-offset-2 hover:text-cyan-200">
              published ones
            </Link>{' '}
            — no separate agency price list, no surprises.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
