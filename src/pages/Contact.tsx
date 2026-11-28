import { Link } from 'react-router-dom';
import { ArrowUpRight, Mail, MessagesSquare, ShieldCheck } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { PAGE_WORDS } from '../data/content';
import { usePageMeta } from '../lib/meta';
import { useSiteConfig } from '../lib/siteConfig';
import { PROOF_URL } from '../data/content';
import { useHireModal } from '../components/HireModal';

const NEXT_STEPS: { title: string; body: string }[] = [
  {
    title: 'You write',
    body: 'Tell us what looks wrong: the platform, the store, the number that does not match. Screenshots help; a perfect brief is not required.',
  },
  {
    title: 'The architect answers',
    body: 'You get a reply from the person who would do the work — with the questions that matter, or a free tracking audit of your current setup.',
  },
  {
    title: 'A fixed-scope proposal',
    body: 'If there is a fit, you receive a package with a fixed price in your own client portal. If there is not, you keep the audit and the honest answer.',
  },
];

export default function Contact() {
  const { config } = useSiteConfig();
  const { openHireModal } = useHireModal();
  const email = config.contactEmail;
  usePageMeta(
    'Contact — SyncOps Studio',
    'Contact SyncOps Studio: email the architect directly, use live chat, or order through Fiverr. What happens after you write, step by step.',
  );

  const w = config.pageWords?.contact ?? PAGE_WORDS.contact;

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-12 sm:px-6">
        <p className="eyebrow">{w.eyebrow}</p>
        <h1 className="h-display mt-2 text-3xl sm:text-4xl">{w.title}</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-slate-400">{w.intro}</p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <a
            href={`mailto:${email}`}
            className="glass card-hover rounded-lg p-5"
          >
            <Mail className="h-6 w-6 text-cyan-300" />
            <h2 className="mt-3 font-bold text-slate-100">Email</h2>
            <p className="mt-1 break-all text-sm text-slate-400">{email}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Best for project enquiries and anything with attachments.
            </p>
          </a>

          <div className="glass rounded-lg p-5">
            <MessagesSquare className="h-6 w-6 text-cyan-300" />
            <h2 className="mt-3 font-bold text-slate-100">Live chat</h2>
            <p className="mt-1 text-sm text-slate-400">The bubble at the bottom-right of this site.</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Best for a quick question before you commit to an email.
            </p>
          </div>

          <a href={PROOF_URL} target="_blank" rel="noreferrer" className="glass card-hover rounded-lg p-5">
            <ShieldCheck className="h-6 w-6 text-cyan-300" />
            <h2 className="mt-3 font-bold text-slate-100">Fiverr</h2>
            <p className="mt-1 inline-flex items-center gap-1 text-sm text-slate-400">
              Order inside the marketplace
              <ArrowUpRight className="h-3.5 w-3.5" />
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Prefer marketplace protection and escrow? The same practice, since 2019.
            </p>
          </a>
        </div>

        <section className="mt-12">
          <h2 className="h-display text-xl text-slate-100">What happens after you write</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {NEXT_STEPS.map((s, i) => (
              <div key={s.title} className="glass rounded-lg p-5">
                <p className="font-mono text-[11px] tracking-[0.24em] text-slate-500">
                  STEP 0{i + 1}
                </p>
                <h3 className="mt-2 font-bold text-slate-100">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-12 space-y-3 rounded-xl border border-slate-800/80 bg-slate-900/40 px-5 py-5 text-sm leading-relaxed text-slate-300">
          <p>
            <span className="font-semibold text-slate-100">Already a client?</span> Your
            portal is the fastest channel — the Architect Channel there is read first.{' '}
            <Link to="/client/login" className="font-semibold text-cyan-300 underline decoration-cyan-800 underline-offset-2 hover:text-cyan-200">
              Client login
            </Link>
          </p>
          <p>
            <span className="font-semibold text-slate-100">A note on payment safety:</span>{' '}
            the studio&apos;s payment details live only inside your client portal — never
            trust payment instructions sent by email. That rule protects you, not us.
          </p>
          <p>
            Ready to skip the conversation?{' '}
            <button
              type="button"
              onClick={() => openHireModal()}
              className="font-semibold text-cyan-300 underline decoration-cyan-800 underline-offset-2 hover:text-cyan-200"
            >
              Start a project
            </button>{' '}
            — the portal walks you through the rest.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
