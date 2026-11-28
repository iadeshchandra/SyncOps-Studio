import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from '../lib/format';

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQS: FaqItem[] = [
  {
    q: 'How is this different from Stape or PixelFly?',
    a: 'Those are excellent DIY platforms — you rent the infrastructure and configure everything yourself. SyncOps is done-for-you: a practitioner architects the stack for your store, verifies it with test traffic, and hands it over with an SLA. If you have an in-house tracking specialist, SaaS is cheaper. If you want it engineered and guaranteed, that is us.',
  },
  {
    q: 'Which platforms and stacks do you work with?',
    a: 'Meta, TikTok, Pinterest, Snapchat, Google Ads and GA4 on the destination side; Shopify, WooCommerce, Wix, Squarespace, ClickFunnels, GoHighLevel and custom headless builds on the store side. Server containers run on Google Cloud or Stape-style hosting — your choice at handover.',
  },
  {
    q: 'Do I keep paying monthly after the handover?',
    a: 'No. You pay once for the build. The infrastructure itself (typically $20–100/month in cloud costs depending on volume) is yours — we hand over the keys, the container exports and the documentation. Optional care plans exist if you want us watching it.',
  },
  {
    q: 'What does the 9.0+ Event Match Quality guarantee mean?',
    a: 'After QA we measure your Meta Event Match Quality on live traffic. If it is under 9.0, we keep working — extra parameters, better hashing coverage, deduplication tuning — until it clears. You do not pay more for the extra rounds.',
  },
  {
    q: 'How long does an engagement take?',
    a: 'A Single CAPI Node typically ships in 7–10 days from the architecture call. Omnichannel stacks run 2–3 weeks. Enterprise deployments are scoped individually. Your project portal shows the live milestone timeline from day one.',
  },
  {
    q: 'I already have pixels running. Do you migrate?',
    a: 'Yes — migration from Stape, PixelFly or plain GTM setups is free with any package. We run browser and server events in parallel with deduplication IDs during cutover, so there is zero tracking downtime.',
  },
  {
    q: 'What do you need from me to start?',
    a: 'Access to your ad accounts, GTM containers and store backend (via the encrypted vault — never email), plus one 45-minute architecture call. Everything else is on us.',
  },
  {
    q: 'Is my data private?',
    a: 'Completely. We never see raw customer data in transit — PII is SHA-256 hashed before it leaves your server, and credentials live in your vault, never in chat or email. Nothing is resold, shared or used for any other client.',
  },
];

export const EXTRA_FAQS: FaqItem[] = [
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

/** The FAQ accordion. `items` defaults to the studio's core eight. */
export default function FaqList({ items = FAQS }: { items?: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-slate-800/80 rounded-lg border border-slate-800/80 bg-slate-950/40">
      {items.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-7"
            >
              <span className={cx('text-[15px] font-bold', isOpen ? 'text-slate-50' : 'text-slate-200')}>
                {f.q}
              </span>
              <ChevronDown
                className={cx(
                  'h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200',
                  isOpen && 'rotate-180 text-cyan-300'
                )}
              />
            </button>
            {isOpen && (
              <p className="px-5 pb-6 text-sm leading-relaxed text-slate-400 sm:px-7">{f.a}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
