import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, FlaskConical, Rocket } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useHireModal } from '../components/HireModal';
import { useProducts } from '../lib/products';
import {
  ACCENT_STYLES,
  STATUS_LABELS,
  type Product,
  type ProductStatus,
} from '../data/products';
import { cx } from '../lib/format';

type Filter = 'all' | ProductStatus;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live' },
  { id: 'beta', label: 'Beta' },
  { id: 'building', label: 'Building' },
];

function StatusBadge({ product }: { product: Product }) {
  const styles = ACCENT_STYLES[product.accent];
  const pulse = product.status === 'live';
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10px] tracking-[0.18em]',
        styles.badge
      )}
    >
      {pulse && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" />}
      {STATUS_LABELS[product.status]}
    </span>
  );
}

function ProductCard({ product }: { product: Product }) {
  const styles = ACCENT_STYLES[product.accent];
  return (
    <article
      className={cx(
        'glass card-hover relative overflow-hidden rounded-lg p-6 sm:p-8',
        styles.glow
      )}
    >
      <div className={cx('absolute inset-x-0 top-0 h-1', styles.bar)} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <StatusBadge product={product} />
        {product.featured && (
          <span className="font-mono text-[10px] tracking-[0.18em] text-slate-500">
            FLAGSHIP
          </span>
        )}
      </div>

      <h3 className="h-display mt-4 text-2xl">{product.name}</h3>
      <p className={cx('mt-1 font-mono text-xs tracking-wide', styles.text)}>
        {product.tagline}
      </p>
      <p className="mt-4 text-sm leading-relaxed text-slate-400">{product.description}</p>

      {product.metrics.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-3 border-t border-slate-800/60 pt-5">
          {product.metrics.slice(0, 3).map((m) => (
            <div key={m.label}>
              <p className="font-mono text-xl font-black text-slate-100">{m.value}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                {m.label}
              </p>
            </div>
          ))}
        </div>
      )}

      <Link
        to={`/work/${product.id}`}
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-200 transition-colors hover:text-white"
      >
        View case
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

function SkeletonGrid() {
  return (
    <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="glass rounded-lg p-6 sm:p-8">
          <div className="h-6 w-24 animate-pulse rounded bg-slate-800" />
          <div className="mt-4 h-7 w-3/4 animate-pulse rounded bg-slate-800" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-800/70" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-slate-800/70" />
        </div>
      ))}
    </div>
  );
}

export default function Work() {
  const { products, loading } = useProducts();
  const { openHireModal } = useHireModal();
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(
    () => (filter === 'all' ? products : products.filter((p) => p.status === filter)),
    [products, filter]
  );

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <p className="eyebrow mb-4">The Studio Portfolio</p>
          <h1 className="h-display text-4xl sm:text-5xl">Work</h1>
          <p className="mt-4 max-w-2xl text-slate-400">
            Real software, shipped. Every product below was engineered by the studio —
            this is what we can build for you.
          </p>

          <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Filter products">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cx(
                  'rounded-md border px-4 py-2 font-mono text-xs tracking-[0.14em] transition-colors',
                  filter === f.id
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                )}
              >
                {f.label.toUpperCase()}
              </button>
            ))}
          </div>

          {loading ? (
            <SkeletonGrid />
          ) : visible.length === 0 ? (
            <p className="telemetry mt-10">
              No products in this lane yet — check back soon.
            </p>
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          <div className="glass mt-16 overflow-hidden rounded-lg p-8 sm:p-12">
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <p className="eyebrow mb-3">Custom builds</p>
                <h2 className="h-display text-2xl sm:text-3xl">Have something to build?</h2>
                <p className="mt-3 max-w-xl text-slate-400">
                  Tell us what you&apos;re dreaming up — we ship production software in
                  weeks, not quarters, AI-accelerated and human-architected.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openHireModal({})}
                className="btn-primary shrink-0"
              >
                Start a project
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
            <p className="telemetry mt-6 flex items-center gap-2">
              <Rocket className="h-4 w-4 text-emerald-400" />
              <FlaskConical className="h-4 w-4 text-cyan-400" />
              every product above began as a client-style brief
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
