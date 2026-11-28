import FaqList, { FAQS } from './FaqList';
import { useSiteConfig } from '../lib/siteConfig';

export default function FaqSection() {
  const { config } = useSiteConfig();
  return (
    <div id="faq" className="mx-auto max-w-4xl scroll-mt-24 px-4 py-20 sm:px-6 lg:py-28">
      <p className="eyebrow mb-4">Questions</p>
      <h2 className="h-display text-3xl sm:text-4xl">Asked before you ask</h2>
      <p className="mt-4 max-w-2xl text-slate-400">
        Straight answers — including the ones that send some buyers to cheaper tools. That is
        fine; the right fit matters more than the sale.
      </p>

      <div className="mt-10">
        <FaqList items={config.faqs ?? FAQS} />
      </div>
    </div>
  );
}
