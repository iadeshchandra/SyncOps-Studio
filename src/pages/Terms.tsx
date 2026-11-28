import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useConfigPageMeta } from '../lib/meta';

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'The engagement',
    body: [
      'Every project starts as a fixed-scope package. Your client portal is the system of record: the scope, the agreed price, the timeline, every payment and every delivery live there, visible to you and the studio alike.',
      'Work begins when the start gate is green — your access checklist complete and the agreed amount verified — or earlier when the studio records an explicit early-start reason on your timeline.',
    ],
  },
  {
    title: 'Payments — coordination, never custody',
    body: [
      'You always pay the studio directly through the payment details shown inside your own portal (bKash, Wise or Payoneer). SyncOps Studio never holds client money in an app wallet and never asks for card details.',
      'Always put your order reference (it looks like SO-20260101-ABCD) in the payment note, and file a payment claim in your portal with the transaction ID. A claim is verified against the studio\u2019s own payment records — screenshots alone are never proof, for your protection as much as ours.',
      'Orders placed through Fiverr or Upwork are paid for and governed inside those marketplaces, under their terms.',
    ],
  },
  {
    title: 'Refunds',
    body: [
      'Before work starts: any verified payment is refunded in full, minus only a fee the payment rail itself charged and will not return.',
      'After work starts: stages not yet delivered are refunded pro-rata against the agreed price. A stage that has been delivered and accepted is not refundable — you keep the artifacts, exports and documentation from it.',
      'If the studio cannot deliver a stage at all, that stage is refunded in full. Refunds travel back over the same rail the payment arrived on, within 10 business days of agreement.',
    ],
  },
  {
    title: 'Revisions',
    body: [
      'Every delivery includes two revision rounds. Further changes are welcome — they are scoped as revision requests in your portal and quoted before work begins, so nothing is ever billed by surprise.',
    ],
  },
  {
    title: 'Timelines',
    body: [
      'Dates in your portal are working targets the studio plans against, not guarantees — ad-platform reviews, access delays and verification queues sit outside anyone\u2019s control. When a date moves, the new forecast and the reason appear on your timeline.',
    ],
  },
  {
    title: 'Your data',
    body: [
      'Your portal data — orders, messages, files, intake answers and reviews — exists to run your engagement. Email iadeshchandra@gmail.com at any time to ask for an export or for deletion; deletion removes those records within 30 days, keeping only what tax law requires the studio to retain.',
    ],
  },
];

export default function Terms() {
  useConfigPageMeta('terms');

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-12 sm:px-6">
        <p className="eyebrow">terms_&amp;_refunds</p>
        <h1 className="h-display mt-2 text-3xl sm:text-4xl">Terms &amp; Refunds</h1>
        <p className="mt-4 leading-relaxed text-slate-400">
          The short, plain version of how working with SyncOps Studio works — written to be
          read before you pay, not after a dispute. If anything here conflicts with a
          marketplace&apos;s own terms for an order placed there, the marketplace&apos;s terms
          govern that order.
        </p>

        <div className="mt-10 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="h-display text-xl text-slate-100">{s.title}</h2>
              {s.body.map((para, i) => (
                <p key={i} className="mt-3 leading-relaxed text-slate-400">
                  {para}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-slate-800/80 bg-slate-900/40 px-5 py-4">
          <p className="text-sm leading-relaxed text-slate-300">
            Questions about any of this? Email{' '}
            <a
              href="mailto:iadeshchandra@gmail.com"
              className="font-semibold text-cyan-300 underline decoration-cyan-800 underline-offset-2 hover:text-cyan-200"
            >
              iadeshchandra@gmail.com
            </a>{' '}
            — or, if you are already a client, ask in your portal&apos;s Architect Channel.
            Ready when you are: <Link to="/" className="font-semibold text-cyan-300 underline decoration-cyan-800 underline-offset-2 hover:text-cyan-200">back to the studio</Link>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
