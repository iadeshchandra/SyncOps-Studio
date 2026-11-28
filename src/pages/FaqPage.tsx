import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FaqList, { FAQS, type FaqItem } from '../components/FaqList';
import { usePageMeta, useJsonLd } from '../lib/meta';
import { useHireModal } from '../components/HireModal';

const EXTRA_FAQS: FaqItem[] = [
  {
    q: 'What happens after I hire you?',
    a: 'Your project opens in your client portal: scope, agreed price, timeline, the access checklist and the payment step, all in one place. Work starts when the start gate is green — checklist complete and the agreed amount verified — and every delivery, revision and message stays in that portal, on the record.',
  },
  {
    q: 'How do I pay?',
    a: 'Directly to the studio, never into an app wallet: bKash, Wise or Payoneer, using the payment details shown inside your own portal (never trust payment details sent by email). You file a payment claim with the transaction ID, we verify it against our own records, and the credit appears in your portal ledger. Full terms are on the Terms & Refunds page.',
  },
  {
    q: 'What if it does not work out — refunds?',
    a: 'Before work starts, verified payments are refunded in full (minus only a fee the payment rail itself keeps). After work starts, undelivered stages are refunded pro-rata; a delivered and accepted stage is not refundable, and you keep its artifacts and documentation. The full policy is written in plain language on the Terms & Refunds page.',
  },
  {
    q: 'Can I order through Fiverr instead?',
    a: 'Yes. The studio is the same practice that has operated on Fiverr since 2019 — if you prefer marketplace escrow and its terms, order there. Portal projects and marketplace orders get the same architect and the same standard.',
  },
  {
    q: 'Where are you based, and who will I talk to?',
    a: 'The studio is based in Bangladesh and works with clients worldwide — the review record spans the US, Europe and beyond. Whoever you talk to, it is the architect who does the work: one person, on the record, in your portal.',
  },
];

export default function FaqPage() {
  const { openHireModal } = useHireModal();
  usePageMeta(
    'FAQ — SyncOps Studio',
    'Straight answers about server-side tracking with SyncOps Studio: ownership, pricing, timelines, migration, payments, refunds and privacy.',
  );

  useJsonLd('faq-schema', {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [...FAQS, ...EXTRA_FAQS].map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  });

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-12 sm:px-6">
        <p className="eyebrow">faq</p>
        <h1 className="h-display mt-2 text-3xl sm:text-4xl">Questions, answered straight</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-slate-400">
          The questions buyers actually ask before trusting someone with their measurement —
          including the ones whose honest answer is sometimes &ldquo;use the cheaper tool
          instead&rdquo;.
        </p>

        <div className="mt-10">
          <FaqList items={[...FAQS, ...EXTRA_FAQS]} />
        </div>

        <div className="mt-12 rounded-xl border border-slate-800/80 bg-slate-900/40 px-5 py-4">
          <p className="text-sm leading-relaxed text-slate-300">
            Still deciding? Read{' '}
            <Link to="/process" className="font-semibold text-cyan-300 underline decoration-cyan-800 underline-offset-2 hover:text-cyan-200">
              how we work
            </Link>{' '}
            or{' '}
            <Link to="/contact" className="font-semibold text-cyan-300 underline decoration-cyan-800 underline-offset-2 hover:text-cyan-200">
              ask the studio directly
            </Link>
            . Ready?{' '}
            <button
              type="button"
              onClick={() => openHireModal()}
              className="font-semibold text-cyan-300 underline decoration-cyan-800 underline-offset-2 hover:text-cyan-200"
            >
              Start a project
            </button>
            .
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
