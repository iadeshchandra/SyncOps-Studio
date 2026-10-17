import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useProducts } from '../lib/products';
import {
  ACCENT_STYLES,
  DEFAULT_PRODUCTS,
  STATUS_LABELS,
  type Product,
} from '../data/products';
import { cx } from '../lib/format';

/**
 * Landing "Built by the studio" strip. Wired into Landing.tsx by the parent
 * agent — this component only reads published products and links to /work.
 */
export default function WorkStrip() {
  const { products, loading } = useProducts();
  const list: Product[] = (
    loading ? DEFAULT_PRODUCTS.filter((p) => p.published) : products
  ).slice(0, 3);

  return (
    <section className="border-t border-slate-800/60 bg-black/30">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        <p className="eyebrow mb-4">Built by the Studio</p>
        <h2 className="h-display text-3xl sm:text-4xl">Our products</h2>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-400">
          We&apos;re a technology studio — we build and operate digital products, and we
          sell the infrastructure expertise behind them.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {list.map((p) => {
            const styles = ACCENT_STYLES[p.accent];
            return (
              <article
                key={p.id}
                className={cx(
                  'glass card-hover relative overflow-hidden rounded-lg p-6',
                  styles.glow
                )}
              >
                <div
                  className={cx('absolute inset-x-0 top-0 h-1', styles.bar)}
                  aria-hidden="true"
                />
                <span
                  className={cx(
                    'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10px] tracking-[0.18em]',
                    styles.badge
                  )}
                >
                  {p.status === 'live' && (
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" />
                  )}
                  {STATUS_LABELS[p.status]}
                </span>
                <h3 className="h-display mt-3 text-xl">{p.name}</h3>
                <p className={cx('mt-1 font-mono text-[11px] tracking-wide', styles.text)}>
                  {p.tagline}
                </p>
                {p.metrics.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                    {p.metrics.slice(0, 2).map((m) => (
                      <div key={m.label} className="flex items-baseline gap-1.5">
                        <span className="font-mono text-base font-black text-slate-100">
                          {m.value}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
                          {m.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <Link
                  to={`/work/${p.id}`}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-200 transition-colors hover:text-white"
                >
                  View case
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            );
          })}
        </div>

        <Link
          to="/work"
          className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
        >
          See all work
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
