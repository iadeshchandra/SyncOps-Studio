import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Cloud,
  Cpu,
  Database,
  ExternalLink,
  Globe,
  KeyRound,
  Languages,
  Layers,
  MessageSquare,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Wifi,
  Zap,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useHireModal } from '../components/HireModal';
import { getProductDoc } from '../lib/products';
import {
  ACCENT_STYLES,
  STATUS_LABELS,
  type Product,
} from '../data/products';
import { cx } from '../lib/format';

/** Fixed icon pool — picked by index so the template never needs per-product icon config. */
const FEATURE_ICONS = [
  Zap,
  Globe,
  ShieldCheck,
  Database,
  Wifi,
  Languages,
  ShoppingBag,
  Sparkles,
  Layers,
  Cpu,
  Cloud,
  KeyRound,
];

function isExternal(url: string) {
  return /^https?:\/\//i.test(url) || /^mailto:/i.test(url);
}

function CtaButton({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const cls = cx('btn-primary', className);
  const inner = (
    <>
      {product.heroCtaLabel}
      <ArrowUpRight className="h-4 w-4" />
    </>
  );
  if (isExternal(product.heroCtaUrl)) {
    return (
      <a
        href={product.heroCtaUrl}
        target={product.heroCtaUrl.startsWith('http') ? '_blank' : undefined}
        rel={product.heroCtaUrl.startsWith('http') ? 'noreferrer' : undefined}
        className={cls}
      >
        {inner}
      </a>
    );
  }
  return (
    <Link to={product.heroCtaUrl} className={cls}>
      {inner}
    </Link>
  );
}

function FaqAccordion({ product }: { product: Product }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <p className="eyebrow mb-4">Questions</p>
      <h2 className="h-display text-3xl">FAQ</h2>
      <div className="mt-8 space-y-3">
        {product.faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} className="glass overflow-hidden rounded-lg">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-sm font-semibold text-slate-100">{f.q}</span>
                <ChevronDown
                  className={cx(
                    'h-4 w-4 shrink-0 text-slate-400 transition-transform',
                    isOpen && 'rotate-180'
                  )}
                />
              </button>
              {isOpen && (
                <p className="border-t border-slate-800/60 px-5 py-4 text-sm leading-relaxed text-slate-400">
                  {f.a}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { openHireModal } = useHireModal();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setProduct(undefined);
    if (slug) {
      void getProductDoc(slug).then((p) => {
        if (!cancelled) setProduct(p);
      });
    }
    window.scrollTo(0, 0);
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (product) {
      const prev = document.title;
      document.title = `${product.name} — SyncOps Studio`;
      return () => {
        document.title = prev;
      };
    }
  }, [product]);

  const styles = useMemo(
    () => (product ? ACCENT_STYLES[product.accent] : null),
    [product]
  );

  if (product === null) return <Navigate to="/work" replace />;

  if (product === undefined || !styles) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
          <div className="h-8 w-48 animate-pulse rounded bg-slate-800" />
          <div className="mt-4 h-12 w-3/4 animate-pulse rounded bg-slate-800" />
          <div className="mt-4 h-4 w-1/2 animate-pulse rounded bg-slate-800/70" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main>
        {/* HERO */}
        <div className="relative overflow-hidden border-b border-slate-800/60">
          <div
            className={cx('absolute inset-x-0 top-0 h-1', styles.bar)}
            aria-hidden="true"
          />
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
            <Link
              to="/work"
              className="inline-flex items-center gap-1.5 font-mono text-xs tracking-[0.14em] text-slate-500 transition-colors hover:text-slate-200"
            >
              <ArrowLeft className="h-4 w-4" />
              ALL WORK
            </Link>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10px] tracking-[0.18em]',
                  styles.badge
                )}
              >
                {product.status === 'live' && (
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" />
                )}
                {STATUS_LABELS[product.status]}
              </span>
              {product.featured && (
                <span className="font-mono text-[10px] tracking-[0.18em] text-slate-500">
                  FLAGSHIP PRODUCT
                </span>
              )}
            </div>
            <h1 className="h-display mt-4 max-w-3xl text-4xl sm:text-5xl">
              {product.heroHeadline}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-400">
              {product.heroSubcopy}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <CtaButton product={product} />
              <button
                type="button"
                onClick={() => openHireModal({})}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900/60 px-5 py-3 text-sm font-semibold text-slate-200 transition-all hover:border-slate-500 hover:bg-slate-800/70"
              >
                <MessageSquare className="h-4 w-4" />
                Talk to us
              </button>
            </div>
          </div>
        </div>

        {/* METRIC BAND */}
        {product.metrics.length > 0 && (
          <div className="border-b border-slate-800/60 bg-black/40">
            <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6 lg:grid-cols-4">
              {product.metrics.map((m) => (
                <div key={m.label}>
                  <p className="font-mono text-3xl font-black text-slate-50">{m.value}</p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">
                    {m.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WHY */}
        {product.whyPoints.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
            <p className="eyebrow mb-4">Why this exists</p>
            <h2 className="h-display max-w-2xl text-3xl">{product.whyTitle}</h2>
            <ul className="mt-8 grid gap-4 md:grid-cols-2">
              {product.whyPoints.map((point) => (
                <li key={point} className="glass rounded-lg p-5">
                  <p className="text-sm leading-relaxed text-slate-300">{point}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* FEATURES */}
        {product.features.length > 0 && (
          <section className="border-t border-slate-800/60 bg-black/30">
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
              <p className="eyebrow mb-4">Under the hood</p>
              <h2 className="h-display text-3xl">Features</h2>
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {product.features.map((f, i) => {
                  const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
                  return (
                    <div key={f.title} className="glass card-hover rounded-lg p-6">
                      <div
                        className={cx(
                          'inline-flex h-10 w-10 items-center justify-center rounded-md border',
                          styles.badge
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 text-base font-bold text-slate-100">{f.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">
                        {f.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* BENEFITS */}
        {product.benefits.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
            <p className="eyebrow mb-4">What you get</p>
            <h2 className="h-display text-3xl">Benefits</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {product.benefits.map((b) => (
                <div key={b.title} className="glass rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <span
                      className={cx(
                        'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                        styles.badge
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-slate-100">{b.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                        {b.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* STACK */}
        {product.stack.length > 0 && (
          <section className="border-t border-slate-800/60 bg-black/30">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
              <p className="eyebrow mb-5">Built with</p>
              <div className="flex flex-wrap gap-2.5">
                {product.stack.map((s) => (
                  <span
                    key={s}
                    className={cx(
                      'rounded-md border px-3 py-1.5 font-mono text-xs',
                      styles.chip
                    )}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* TESTIMONIALS */}
        {product.testimonials.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <p className="eyebrow mb-4">Loved by operators</p>
            <h2 className="h-display text-3xl">Testimonials</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {product.testimonials.map((t) => (
                <figure key={t.author} className="glass rounded-lg p-6">
                  <blockquote className="border-l-2 border-slate-700 pl-4 text-sm italic leading-relaxed text-slate-300">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-3 font-mono text-xs text-slate-500">
                    — {t.author}, {t.role}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        {product.faqs.length > 0 && <FaqAccordion product={product} />}

        {/* LINKS */}
        {product.links.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
            <div className="flex flex-wrap gap-3">
              {product.links.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target={l.url.startsWith('http') ? '_blank' : undefined}
                  rel={l.url.startsWith('http') ? 'noreferrer' : undefined}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-all hover:border-slate-500 hover:bg-slate-800/70"
                >
                  <ExternalLink className="h-4 w-4" />
                  {l.label}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* CLOSING CTA */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="glass overflow-hidden rounded-lg p-8 sm:p-12">
            <div className={cx('h-1 w-16 rounded-full', styles.bar)} aria-hidden="true" />
            <h2 className="h-display mt-5 text-2xl sm:text-3xl">
              Want software like {product.name}?
            </h2>
            <p className="mt-3 max-w-xl text-slate-400">
              We build custom products the same way — AI-accelerated, human-architected,
              shipped to production in weeks.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => openHireModal({})}
                className="btn-primary"
              >
                Start your build
                <ArrowUpRight className="h-4 w-4" />
              </button>
              <Link
                to="/work"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900/60 px-5 py-3 text-sm font-semibold text-slate-200 transition-all hover:border-slate-500 hover:bg-slate-800/70"
              >
                <ArrowLeft className="h-4 w-4" />
                All work
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
