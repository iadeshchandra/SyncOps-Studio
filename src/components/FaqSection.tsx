import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from '../lib/format';

const FAQS: { q: string; a: string }[] = [
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

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div id="faq" className="mx-auto max-w-4xl scroll-mt-24 px-4 py-20 sm:px-6 lg:py-28">
      <p className="eyebrow mb-4">Questions</p>
      <h2 className="h-display text-3xl sm:text-4xl">Asked before you ask</h2>
      <p className="mt-4 max-w-2xl text-slate-400">
        Straight answers — including the ones that send some buyers to cheaper tools. That is
        fine; the right fit matters more than the sale.
      </p>

      <div className="mt-10 divide-y divide-slate-800/80 rounded-lg border border-slate-800/80 bg-slate-950/40">
        {FAQS.map((f, i) => {
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
    </div>
  );
}
