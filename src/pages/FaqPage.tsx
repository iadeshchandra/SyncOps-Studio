import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FaqList, { EXTRA_FAQS, FAQS } from '../components/FaqList';
import { usePageMeta, useJsonLd } from '../lib/meta';
import { useSiteConfig } from '../lib/siteConfig';
import { useHireModal } from '../components/HireModal';

export default function FaqPage() {
  const { openHireModal } = useHireModal();
  const { config } = useSiteConfig();
  const allFaqs = [...(config.faqs ?? FAQS), ...(config.faqsExtra ?? EXTRA_FAQS)];
  usePageMeta(
    'FAQ — SyncOps Studio',
    'Straight answers about server-side tracking with SyncOps Studio: ownership, pricing, timelines, migration, payments, refunds and privacy.',
  );

  useJsonLd('faq-schema', {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allFaqs.map((f) => ({
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
          <FaqList items={allFaqs} />
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
