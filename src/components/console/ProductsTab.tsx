import { useEffect, useState, type ReactNode } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { cx } from '../../lib/format';
import {
  deleteProduct,
  loadAllProducts,
  saveProduct,
} from '../../lib/products';
import type { Product, ProductStatus } from '../../data/products';

/* ------------------------------------------------------------------ */
/* Product types come from the studio-wide model in src/lib/products.ts */
/* (single source of truth shared with /work and the detail pages).    */
/* ------------------------------------------------------------------ */

/* ------------------------- storage helpers ------------------------ */

const STATUSES: ProductStatus[] = ['live', 'beta', 'building'];
const ACCENTS: Product['accent'][] = ['emerald', 'cyan', 'amber', 'rose', 'indigo'];

const STATUS_STYLE: Record<ProductStatus, string> = {
  live: 'bg-emerald-500/15 text-emerald-300',
  beta: 'bg-cyan-500/15 text-cyan-300',
  building: 'bg-amber-500/15 text-amber-300',
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* --------------------------- UI primitives ------------------------ */

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx('block', className)}>
      <span className="label-dark">{label}</span>
      {children}
    </label>
  );
}

function Accordion({
  title,
  desc,
  open,
  onToggle,
  children,
}: {
  title: string;
  desc: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="glass overflow-hidden rounded-lg">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-5 text-left transition-colors hover:bg-slate-800/30 sm:px-6"
      >
        <h3 className="h-display flex-1 text-base">{title}</h3>
        <ChevronDown
          className={cx(
            'h-4 w-4 shrink-0 text-slate-500 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="border-t border-slate-800/80 p-5 sm:px-6">
          <p className="mb-5 text-sm text-slate-400">{desc}</p>
          <div className="space-y-5">{children}</div>
        </div>
      )}
    </section>
  );
}

function ItemCard({
  index,
  label,
  onRemove,
  children,
}: {
  index: number;
  label: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="telemetry text-cyan-400">
          {label} {index + 1}
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium text-rose-400/80 transition-colors hover:text-rose-300"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" /> Remove
        </button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

/** Replace the item at index i with a patched copy. */
function updateAt<T>(arr: T[], i: number, patch: Partial<T>): T[] {
  return arr.map((item, idx) => (idx === i ? { ...item, ...patch } : item));
}

function blankProduct(order: number): Product {
  return {
    id: '',
    name: '',
    tagline: '',
    status: 'building',
    description: '',
    heroHeadline: '',
    heroSubcopy: '',
    heroCtaLabel: '',
    heroCtaUrl: '',
    whyTitle: '',
    whyPoints: [],
    features: [],
    benefits: [],
    metrics: [],
    stack: [],
    testimonials: [],
    faqs: [],
    links: [],
    accent: 'cyan',
    featured: false,
    published: false,
    order,
  };
}

export default function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Product | null>(null);
  const [idTouched, setIdTouched] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({ basics: true });

  useEffect(() => {
    let cancelled = false;
    loadAllProducts()
      .then((list) => {
        if (!cancelled) setProducts(list);
      })
      .catch(() => {
        if (!cancelled) setNotice({ ok: false, text: 'Failed to load products.' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleSection = (id: string) =>
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  const patch = (p: Partial<Product>) => {
    setDraft((d) => (d ? { ...d, ...p } : d));
    setDirty(true);
  };

  const guardUnsaved = (): boolean => {
    if (dirty && !window.confirm('Discard unsaved changes?')) return false;
    return true;
  };

  const select = (id: string) => {
    if (!guardUnsaved()) return;
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setSelectedId(id);
    setDraft({ ...p });
    setIdTouched(true);
    setDirty(false);
    setNotice(null);
    setOpen({ basics: true });
  };

  const startNew = () => {
    if (!guardUnsaved()) return;
    setSelectedId(null);
    setDraft(blankProduct(products.length));
    setIdTouched(false);
    setDirty(false);
    setNotice(null);
    setOpen({ basics: true });
  };

  const handleNameChange = (name: string) => {
    setDraft((d) => {
      if (!d) return d;
      const next: Product = { ...d, name };
      // Auto-suggest the slug from the name until the owner edits the id by hand.
      if (selectedId === null && !idTouched) next.id = slugify(name);
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    if (!draft) return;
    const clean: Product = { ...draft, id: draft.id.trim() };
    if (!clean.id) {
      setNotice({ ok: false, text: 'Product ID / slug is required.' });
      return;
    }
    if (!clean.name.trim()) {
      setNotice({ ok: false, text: 'Product name is required.' });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      await saveProduct(clean);
      setProducts((prev) => {
        const rest = prev.filter((p) => p.id !== clean.id);
        return [...rest, clean].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
      });
      setSelectedId(clean.id);
      setDraft(clean);
      setIdTouched(true);
      setDirty(false);
      setNotice({ ok: true, text: 'Saved — live on next load.' });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : 'Save failed.' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft) return;
    if (
      !window.confirm(
        `Delete product "${draft.name || draft.id}" (${draft.id})? This cannot be undone.`,
      )
    )
      return;
    setDeleting(true);
    try {
      await deleteProduct(draft.id);
      setProducts((prev) => prev.filter((p) => p.id !== draft.id));
      setSelectedId(null);
      setDraft(null);
      setDirty(false);
      setNotice({ ok: true, text: 'Product deleted.' });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : 'Delete failed.' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="ml-2 text-sm">Loading products…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="glass-strong flex flex-col gap-3 rounded-lg p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="h-display text-lg">Products</h2>
          <p className="mt-1 text-sm text-slate-400">
            Full CMS for the /work showcase — add an app once, write every section, publish.
            Empty sections are skipped on the page, never rendered broken.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {dirty && (
            <span className="telemetry text-amber-300">● UNSAVED CHANGES</span>
          )}
          {notice && (
            <span
              className={cx(
                'inline-flex items-center gap-1.5 text-sm font-medium',
                notice.ok ? 'text-emerald-400' : 'text-rose-400',
              )}
            >
              {notice.ok && <CheckCircle2 className="h-4 w-4" />}
              {notice.text}
            </span>
          )}
          {draft?.id && (
            <a
              href={`/work/${draft.id}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost !px-3 !py-2 text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View page
            </a>
          )}
          {draft && selectedId && (
            <button
              type="button"
              className="btn-ghost !px-3 !py-2 text-xs !text-rose-400/90 hover:!text-rose-300"
              onClick={remove}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Delete
            </button>
          )}
          <button className="btn-primary" onClick={save} disabled={saving || !draft}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save product
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Product list */}
        <aside className="glass h-fit rounded-lg p-4">
          <button type="button" className="btn-primary w-full" onClick={startNew}>
            <Plus className="h-4 w-4" /> New product
          </button>
          <div className="mt-3 space-y-2">
            {products.map((p) => {
              const selected = p.id === selectedId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => select(p.id)}
                  className={cx(
                    'w-full rounded-md border p-3 text-left transition-colors',
                    selected
                      ? 'border-cyan-500/40 bg-cyan-500/10'
                      : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-slate-200">
                      {p.name || p.id}
                    </span>
                    {p.published ? (
                      <Eye className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span
                      className={cx(
                        'telemetry rounded px-1.5 py-0.5',
                        STATUS_STYLE[p.status],
                      )}
                    >
                      {p.status.toUpperCase()}
                    </span>
                    <span className="telemetry text-slate-600">#{p.order}</span>
                  </div>
                </button>
              );
            })}
            {products.length === 0 && (
              <p className="p-3 text-sm text-slate-500">
                No products yet. Create the first one — it appears on /work once
                published.
              </p>
            )}
          </div>
        </aside>

        {/* Editor */}
        <div className="min-w-0">
          {!draft ? (
            <div className="glass flex flex-col items-center rounded-lg px-6 py-16 text-center">
              <p className="h-display text-base text-slate-300">No product selected</p>
              <p className="mt-2 max-w-sm text-sm text-slate-500">
                Pick a product from the list, or create a new one to start writing
                its marketing page.
              </p>
              <button type="button" className="btn-ghost mt-5" onClick={startNew}>
                <Plus className="h-4 w-4" /> New product
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Basics */}
              <Accordion
                title="Basics"
                desc="Identity of the product — slug, name, status, and publishing."
                open={!!open.basics}
                onToggle={() => toggleSection('basics')}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Product ID / slug (used in /work/:id)">
                    <input
                      className="input-dark font-mono text-sm"
                      placeholder="sanatani-bandhan"
                      value={draft.id}
                      onChange={(e) => {
                        setIdTouched(true);
                        patch({ id: slugify(e.target.value) });
                      }}
                    />
                  </Field>
                  <Field label="Name">
                    <input
                      className="input-dark"
                      placeholder="Sanatani Bandhan"
                      value={draft.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                    />
                  </Field>
                  <Field label="Tagline" className="sm:col-span-2">
                    <input
                      className="input-dark"
                      placeholder="One line — what it is and who it is for"
                      value={draft.tagline}
                      onChange={(e) => patch({ tagline: e.target.value })}
                    />
                  </Field>
                  <Field label="Status">
                    <select
                      className="input-dark"
                      value={draft.status}
                      onChange={(e) => patch({ status: e.target.value as ProductStatus })}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s === 'live' ? 'Live' : s === 'beta' ? 'Beta' : 'In development'}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Accent color">
                    <select
                      className="input-dark"
                      value={draft.accent}
                      onChange={(e) => patch({ accent: e.target.value as Product['accent'] })}
                    >
                      {ACCENTS.map((a) => (
                        <option key={a} value={a}>
                          {a.charAt(0).toUpperCase() + a.slice(1)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Description" className="sm:col-span-2">
                    <textarea
                      rows={3}
                      className="input-dark"
                      placeholder="2–3 sentences shown on the /work index card."
                      value={draft.description}
                      onChange={(e) => patch({ description: e.target.value })}
                    />
                  </Field>
                  <Field label="Display order (lower first)">
                    <input
                      type="number"
                      min={0}
                      className="input-dark"
                      value={draft.order}
                      onChange={(e) => patch({ order: Number(e.target.value) })}
                    />
                  </Field>
                  <div className="flex flex-col justify-end gap-3 pb-1 sm:flex-row sm:items-center">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded accent-emerald-500"
                        checked={!!draft.featured}
                        onChange={(e) => patch({ featured: e.target.checked })}
                      />
                      Featured on landing strip
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded accent-emerald-500"
                        checked={draft.published}
                        onChange={(e) => patch({ published: e.target.checked })}
                      />
                      Published (visible on /work)
                    </label>
                  </div>
                </div>
              </Accordion>

              {/* Hero */}
              <Accordion
                title="Hero"
                desc="The top of the product page — headline, subcopy, and the primary call to action."
                open={!!open.hero}
                onToggle={() => toggleSection('hero')}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Hero headline" className="sm:col-span-2">
                    <input
                      className="input-dark"
                      placeholder="e.g. The operating system for Dharmic institutions"
                      value={draft.heroHeadline}
                      onChange={(e) => patch({ heroHeadline: e.target.value })}
                    />
                  </Field>
                  <Field label="Hero subcopy" className="sm:col-span-2">
                    <textarea
                      rows={3}
                      className="input-dark"
                      placeholder="One or two sentences expanding the headline."
                      value={draft.heroSubcopy}
                      onChange={(e) => patch({ heroSubcopy: e.target.value })}
                    />
                  </Field>
                  <Field label="CTA button text">
                    <input
                      className="input-dark"
                      placeholder="e.g. Try it live"
                      value={draft.heroCtaLabel}
                      onChange={(e) => patch({ heroCtaLabel: e.target.value })}
                    />
                  </Field>
                  <Field label="CTA URL">
                    <input
                      className="input-dark font-mono text-sm"
                      placeholder="https://…"
                      value={draft.heroCtaUrl}
                      onChange={(e) => patch({ heroCtaUrl: e.target.value })}
                    />
                  </Field>
                </div>
              </Accordion>

              {/* Why */}
              <Accordion
                title="Why this app"
                desc="The pain it kills — a title plus a bullet list of reasons. Keep each point to one line."
                open={!!open.why}
                onToggle={() => toggleSection('why')}
              >
                <Field label="Section title">
                  <input
                    className="input-dark"
                    placeholder="e.g. Why institutions were stuck on paper registers"
                    value={draft.whyTitle}
                    onChange={(e) => patch({ whyTitle: e.target.value })}
                  />
                </Field>
                <div className="space-y-2">
                  {draft.whyPoints.map((pt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        className="input-dark flex-1"
                        placeholder={`Reason ${i + 1}`}
                        value={pt}
                        onChange={(e) =>
                          patch({
                            whyPoints: draft.whyPoints.map((x, idx) =>
                              idx === i ? e.target.value : x,
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        className="shrink-0 text-rose-400/80 transition-colors hover:text-rose-300"
                        aria-label="Remove point"
                        onClick={() =>
                          patch({ whyPoints: draft.whyPoints.filter((_, idx) => idx !== i) })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn-ghost w-full"
                    onClick={() => patch({ whyPoints: [...draft.whyPoints, ''] })}
                  >
                    <Plus className="h-4 w-4" /> Add reason
                  </button>
                </div>
              </Accordion>

              {/* Features */}
              <Accordion
                title="Features"
                desc="What the app does — title + one-line description per feature."
                open={!!open.features}
                onToggle={() => toggleSection('features')}
              >
                {draft.features.map((f, i) => (
                  <ItemCard
                    key={i}
                    index={i}
                    label="FEATURE"
                    onRemove={() =>
                      patch({ features: draft.features.filter((_, idx) => idx !== i) })
                    }
                  >
                    <Field label="Title">
                      <input
                        className="input-dark"
                        value={f.title}
                        onChange={(e) =>
                          patch({ features: updateAt(draft.features, i, { title: e.target.value }) })
                        }
                      />
                    </Field>
                    <Field label="Description">
                      <textarea
                        rows={2}
                        className="input-dark"
                        value={f.description}
                        onChange={(e) =>
                          patch({
                            features: updateAt(draft.features, i, { description: e.target.value }),
                          })
                        }
                      />
                    </Field>
                  </ItemCard>
                ))}
                <button
                  type="button"
                  className="btn-ghost w-full"
                  onClick={() =>
                    patch({ features: [...draft.features, { title: '', description: '' }] })
                  }
                >
                  <Plus className="h-4 w-4" /> Add feature
                </button>
              </Accordion>

              {/* Benefits */}
              <Accordion
                title="Benefits"
                desc="What the user gains — outcomes, not capabilities."
                open={!!open.benefits}
                onToggle={() => toggleSection('benefits')}
              >
                {draft.benefits.map((b, i) => (
                  <ItemCard
                    key={i}
                    index={i}
                    label="BENEFIT"
                    onRemove={() =>
                      patch({ benefits: draft.benefits.filter((_, idx) => idx !== i) })
                    }
                  >
                    <Field label="Title">
                      <input
                        className="input-dark"
                        value={b.title}
                        onChange={(e) =>
                          patch({ benefits: updateAt(draft.benefits, i, { title: e.target.value }) })
                        }
                      />
                    </Field>
                    <Field label="Description">
                      <textarea
                        rows={2}
                        className="input-dark"
                        value={b.description}
                        onChange={(e) =>
                          patch({
                            benefits: updateAt(draft.benefits, i, { description: e.target.value }),
                          })
                        }
                      />
                    </Field>
                  </ItemCard>
                ))}
                <button
                  type="button"
                  className="btn-ghost w-full"
                  onClick={() =>
                    patch({ benefits: [...draft.benefits, { title: '', description: '' }] })
                  }
                >
                  <Plus className="h-4 w-4" /> Add benefit
                </button>
              </Accordion>

              {/* Metrics */}
              <Accordion
                title="Metrics"
                desc="Proof numbers — value + label. Real numbers only; leave empty rather than inventing."
                open={!!open.metrics}
                onToggle={() => toggleSection('metrics')}
              >
                {draft.metrics.map((m, i) => (
                  <ItemCard
                    key={i}
                    index={i}
                    label="METRIC"
                    onRemove={() =>
                      patch({ metrics: draft.metrics.filter((_, idx) => idx !== i) })
                    }
                  >
                    <Field label="Value">
                      <input
                        className="input-dark font-mono"
                        placeholder="99.99%"
                        value={m.value}
                        onChange={(e) =>
                          patch({ metrics: updateAt(draft.metrics, i, { value: e.target.value }) })
                        }
                      />
                    </Field>
                    <Field label="Label">
                      <input
                        className="input-dark"
                        placeholder="uptime SLA"
                        value={m.label}
                        onChange={(e) =>
                          patch({ metrics: updateAt(draft.metrics, i, { label: e.target.value }) })
                        }
                      />
                    </Field>
                  </ItemCard>
                ))}
                <button
                  type="button"
                  className="btn-ghost w-full"
                  onClick={() => patch({ metrics: [...draft.metrics, { value: '', label: '' }] })}
                >
                  <Plus className="h-4 w-4" /> Add metric
                </button>
              </Accordion>

              {/* Stack */}
              <Accordion
                title="Tech stack"
                desc="Comma-separated list rendered as chips on the product page."
                open={!!open.stack}
                onToggle={() => toggleSection('stack')}
              >
                <Field label="Stack (comma-separated)">
                  <input
                    className="input-dark font-mono text-sm"
                    placeholder="React, TypeScript, Firebase, Tailwind CSS"
                    value={draft.stack.join(', ')}
                    onChange={(e) =>
                      patch({
                        stack: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </Field>
              </Accordion>

              {/* Testimonials */}
              <Accordion
                title="Testimonials"
                desc="Short quotes with author and role. Real quotes only."
                open={!!open.testimonials}
                onToggle={() => toggleSection('testimonials')}
              >
                {draft.testimonials.map((t, i) => (
                  <ItemCard
                    key={i}
                    index={i}
                    label="QUOTE"
                    onRemove={() =>
                      patch({ testimonials: draft.testimonials.filter((_, idx) => idx !== i) })
                    }
                  >
                    <Field label="Quote" className="sm:col-span-2">
                      <textarea
                        rows={2}
                        className="input-dark"
                        value={t.quote}
                        onChange={(e) =>
                          patch({
                            testimonials: updateAt(draft.testimonials, i, { quote: e.target.value }),
                          })
                        }
                      />
                    </Field>
                    <Field label="Author">
                      <input
                        className="input-dark"
                        value={t.author}
                        onChange={(e) =>
                          patch({
                            testimonials: updateAt(draft.testimonials, i, {
                              author: e.target.value,
                            }),
                          })
                        }
                      />
                    </Field>
                    <Field label="Role">
                      <input
                        className="input-dark"
                        value={t.role}
                        onChange={(e) =>
                          patch({
                            testimonials: updateAt(draft.testimonials, i, { role: e.target.value }),
                          })
                        }
                      />
                    </Field>
                  </ItemCard>
                ))}
                <button
                  type="button"
                  className="btn-ghost w-full"
                  onClick={() =>
                    patch({
                      testimonials: [...draft.testimonials, { quote: '', author: '', role: '' }],
                    })
                  }
                >
                  <Plus className="h-4 w-4" /> Add testimonial
                </button>
              </Accordion>

              {/* FAQ */}
              <Accordion
                title="FAQ"
                desc="Questions prospects ask, answered in your voice."
                open={!!open.faq}
                onToggle={() => toggleSection('faq')}
              >
                {draft.faqs.map((f, i) => (
                  <ItemCard
                    key={i}
                    index={i}
                    label="FAQ"
                    onRemove={() => patch({ faqs: draft.faqs.filter((_, idx) => idx !== i) })}
                  >
                    <Field label="Question" className="sm:col-span-2">
                      <input
                        className="input-dark"
                        value={f.q}
                        onChange={(e) =>
                          patch({ faqs: updateAt(draft.faqs, i, { q: e.target.value }) })
                        }
                      />
                    </Field>
                    <Field label="Answer" className="sm:col-span-2">
                      <textarea
                        rows={3}
                        className="input-dark"
                        value={f.a}
                        onChange={(e) =>
                          patch({ faqs: updateAt(draft.faqs, i, { a: e.target.value }) })
                        }
                      />
                    </Field>
                  </ItemCard>
                ))}
                <button
                  type="button"
                  className="btn-ghost w-full"
                  onClick={() => patch({ faqs: [...draft.faqs, { q: '', a: '' }] })}
                >
                  <Plus className="h-4 w-4" /> Add FAQ
                </button>
              </Accordion>

              {/* Links */}
              <Accordion
                title="Links"
                desc="Outbound destinations — live app, repo, store listings. Rendered as buttons on the page."
                open={!!open.links}
                onToggle={() => toggleSection('links')}
              >
                {draft.links.map((l, i) => (
                  <ItemCard
                    key={i}
                    index={i}
                    label="LINK"
                    onRemove={() => patch({ links: draft.links.filter((_, idx) => idx !== i) })}
                  >
                    <Field label="Label">
                      <input
                        className="input-dark"
                        placeholder="Try it live"
                        value={l.label}
                        onChange={(e) =>
                          patch({ links: updateAt(draft.links, i, { label: e.target.value }) })
                        }
                      />
                    </Field>
                    <Field label="URL">
                      <input
                        className="input-dark font-mono text-sm"
                        placeholder="https://…"
                        value={l.url}
                        onChange={(e) =>
                          patch({ links: updateAt(draft.links, i, { url: e.target.value }) })
                        }
                      />
                    </Field>
                  </ItemCard>
                ))}
                <button
                  type="button"
                  className="btn-ghost w-full"
                  onClick={() => patch({ links: [...draft.links, { label: '', url: '' }] })}
                >
                  <Plus className="h-4 w-4" /> Add link
                </button>
              </Accordion>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
