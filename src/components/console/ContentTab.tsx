import { useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';
import {
  useSiteConfig,
  saveSiteConfig,
  type ProofQuoteConfig,
  type PackageConfig,
  type TestimonialConfig,
} from '../../lib/siteConfig';
import { logAudit } from '../../lib/admin';
import { PACKAGES } from '../../data/content';
import { cx } from '../../lib/format';

/** Replace the item at index i with a patched copy. */
function updateAt<T>(arr: T[], i: number, patch: Partial<T>): T[] {
  return arr.map((item, idx) => (idx === i ? { ...item, ...patch } : item));
}

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

function SectionCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <section className="glass rounded-lg p-5 sm:p-6">
      <h3 className="h-display text-base">{title}</h3>
      <p className="mt-1 text-sm text-slate-400">{desc}</p>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

const DEFAULT_HERO_STATS = [
  { value: '99.99%', label: 'uptime SLA' },
  { value: '9.2', label: 'avg EMQ across deployments' },
  { value: '12ms', label: 'edge dispatch latency' },
];

export default function ContentTab() {
  const { config, loading } = useSiteConfig();

  const [pricing, setPricing] = useState<PackageConfig[]>([]);
  const [proofQuotes, setProofQuotes] = useState<ProofQuoteConfig[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialConfig[]>([]);
  const [heroStats, setHeroStats] = useState<{ value: string; label: string }[]>([]);
  const [tickerText, setTickerText] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [responseSla, setResponseSla] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (loading || hydrated) return;
    setPricing((config.pricing ?? PACKAGES).map((p) => ({ ...p, features: [...p.features] })));
    setProofQuotes((config.proofQuotes ?? []).map((q) => ({ ...q })));
    setTestimonials((config.testimonials ?? []).map((t) => ({ ...t })));
    setHeroStats((config.heroStats ?? DEFAULT_HERO_STATS).map((s) => ({ ...s })));
    setTickerText((config.tickerItems ?? []).join('\n'));
    setContactEmail(config.contactEmail ?? '');
    setResponseSla(config.responseSla ?? '');
    setHydrated(true);
  }, [loading, hydrated, config]);

  const publish = async () => {
    setSaving(true);
    setNotice(null);
    try {
      await saveSiteConfig({
        pricing,
        proofQuotes: proofQuotes,
        testimonials,
        heroStats,
        tickerItems: tickerText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        contactEmail: contactEmail.trim(),
        responseSla: responseSla.trim(),
      });
      await logAudit(
        'content.publish',
        `${pricing.length} tiers · ${proofQuotes.length} proof quotes · ${testimonials.length} testimonials`,
      );
      setNotice({ ok: true, text: 'Published — live on next load.' });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : 'Publish failed.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !hydrated) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="ml-2 text-sm">Loading site content…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Publish bar */}
      <div className="glass-strong flex flex-col gap-3 rounded-lg p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="h-display text-lg">Site content</h2>
          <p className="mt-1 text-sm text-slate-400">
            Edit marketing content below, then publish once. Overrides apply on next page load.
          </p>
        </div>
        <div className="flex items-center gap-3">
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
          <button className="btn-primary" onClick={publish} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Publish changes
          </button>
        </div>
      </div>

      {/* Pricing tiers */}
      <SectionCard
        title="Pricing tiers"
        desc="The three architecture packages shown on the landing page. Highlighted tier renders with the emerald 'most deployed' treatment."
      >
        {pricing.map((p, i) => (
          <div key={p.id} className="rounded-md border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="telemetry text-cyan-400">TIER {i + 1}</span>
              <button
                className="inline-flex items-center gap-1 text-xs font-medium text-rose-400/80 transition-colors hover:text-rose-300"
                onClick={() => setPricing(pricing.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Name">
                <input
                  className="input-dark"
                  value={p.name}
                  onChange={(e) => setPricing(updateAt(pricing, i, { name: e.target.value }))}
                />
              </Field>
              <Field label="Price (USD)">
                <input
                  type="number"
                  min={0}
                  className="input-dark"
                  value={p.price}
                  onChange={(e) => setPricing(updateAt(pricing, i, { price: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Price note">
                <input
                  className="input-dark"
                  value={p.priceNote}
                  onChange={(e) => setPricing(updateAt(pricing, i, { priceNote: e.target.value }))}
                />
              </Field>
              <Field label="CTA button text">
                <input
                  className="input-dark"
                  value={p.cta}
                  onChange={(e) => setPricing(updateAt(pricing, i, { cta: e.target.value }))}
                />
              </Field>
              <Field label="Tagline" className="sm:col-span-2">
                <input
                  className="input-dark"
                  value={p.tagline}
                  onChange={(e) => setPricing(updateAt(pricing, i, { tagline: e.target.value }))}
                />
              </Field>
              <Field label="Features (one per line)" className="sm:col-span-2">
                <textarea
                  rows={5}
                  className="input-dark font-mono text-xs"
                  value={p.features.join('\n')}
                  onChange={(e) =>
                    setPricing(
                      updateAt(pricing, i, {
                        features: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                      }),
                    )
                  }
                />
              </Field>
            </div>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded accent-emerald-500"
                checked={!!p.highlighted}
                onChange={(e) => setPricing(updateAt(pricing, i, { highlighted: e.target.checked }))}
              />
              Highlight as most-deployed tier
            </label>
          </div>
        ))}
        <button
          className="btn-ghost w-full"
          onClick={() =>
            setPricing([
              ...pricing,
              {
                id: `tier-${Date.now()}`,
                name: 'New Tier',
                tagline: '',
                price: 0,
                priceNote: 'One-time',
                features: [],
                cta: 'Deploy',
                highlighted: false,
              },
            ])
          }
        >
          <Plus className="h-4 w-4" /> Add tier
        </button>
      </SectionCard>

      {/* Client proof */}
      <SectionCard
        title="Client proof"
        desc="Real, verifiable review quotes shown in the landing proof section. Only add quotes that are public and attributable — never invent."
      >
        {proofQuotes.map((q, i) => (
          <div key={i} className="rounded-md border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="telemetry text-cyan-400">QUOTE {i + 1}</span>
              <button
                className="inline-flex items-center gap-1 text-xs font-medium text-rose-400/80 transition-colors hover:text-rose-300"
                onClick={() => setProofQuotes(proofQuotes.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
            <div className="mt-3 grid gap-3">
              <Field label="Quote">
                <textarea
                  rows={2}
                  className="input-dark"
                  value={q.quote}
                  onChange={(e) => setProofQuotes(updateAt(proofQuotes, i, { quote: e.target.value }))}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Author">
                  <input
                    className="input-dark"
                    value={q.author}
                    onChange={(e) => setProofQuotes(updateAt(proofQuotes, i, { author: e.target.value }))}
                  />
                </Field>
                <Field label="Context (e.g. Fiverr review · United States)">
                  <input
                    className="input-dark"
                    value={q.context}
                    onChange={(e) => setProofQuotes(updateAt(proofQuotes, i, { context: e.target.value }))}
                  />
                </Field>
              </div>
            </div>
          </div>
        ))}
        {proofQuotes.length === 0 && (
          <p className="text-sm text-slate-500">No overrides — the landing page shows the built-in verified Fiverr proof.</p>
        )}
        <button
          className="btn-ghost w-full"
          onClick={() =>
            setProofQuotes([
              ...proofQuotes,
              { quote: '', author: '', context: 'Fiverr review' },
            ])
          }
        >
          <Plus className="h-4 w-4" /> Add proof quote
        </button>
      </SectionCard>

      {/* Testimonials */}
      <SectionCard title="Testimonials" desc="Short quotes shown on the login showcase panel.">
        {testimonials.map((t, i) => (
          <div key={i} className="rounded-md border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="telemetry text-cyan-400">QUOTE {i + 1}</span>
              <button
                className="inline-flex items-center gap-1 text-xs font-medium text-rose-400/80 transition-colors hover:text-rose-300"
                onClick={() => setTestimonials(testimonials.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
            <div className="mt-3 grid gap-3">
              <Field label="Quote">
                <textarea
                  rows={2}
                  className="input-dark"
                  value={t.quote}
                  onChange={(e) => setTestimonials(updateAt(testimonials, i, { quote: e.target.value }))}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Author">
                  <input
                    className="input-dark"
                    value={t.author}
                    onChange={(e) => setTestimonials(updateAt(testimonials, i, { author: e.target.value }))}
                  />
                </Field>
                <Field label="Role">
                  <input
                    className="input-dark"
                    value={t.role}
                    onChange={(e) => setTestimonials(updateAt(testimonials, i, { role: e.target.value }))}
                  />
                </Field>
              </div>
            </div>
          </div>
        ))}
        <button
          className="btn-ghost w-full"
          onClick={() => setTestimonials([...testimonials, { quote: '', author: '', role: '' }])}
        >
          <Plus className="h-4 w-4" /> Add testimonial
        </button>
      </SectionCard>

      {/* Hero & ticker */}
      <SectionCard title="Hero & ticker" desc="Hero stat blocks, the scrolling stats ticker, and contact details.">
        <div className="grid gap-3 sm:grid-cols-3">
          {heroStats.map((s, i) => (
            <div key={i} className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex items-center justify-between">
                <span className="telemetry text-cyan-400">STAT {i + 1}</span>
                <button
                  className="text-rose-400/80 transition-colors hover:text-rose-300"
                  onClick={() => setHeroStats(heroStats.filter((_, idx) => idx !== i))}
                  aria-label="Remove stat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-2 space-y-2">
                <input
                  className="input-dark font-mono"
                  placeholder="99.99%"
                  value={s.value}
                  onChange={(e) => setHeroStats(updateAt(heroStats, i, { value: e.target.value }))}
                />
                <input
                  className="input-dark"
                  placeholder="uptime SLA"
                  value={s.label}
                  onChange={(e) => setHeroStats(updateAt(heroStats, i, { label: e.target.value }))}
                />
              </div>
            </div>
          ))}
        </div>
        <button className="btn-ghost" onClick={() => setHeroStats([...heroStats, { value: '', label: '' }])}>
          <Plus className="h-4 w-4" /> Add stat
        </button>
        <Field label="Ticker items (one per line)">
          <textarea
            rows={4}
            className="input-dark font-mono text-xs"
            placeholder={'99.99% UPTIME SLA\n9.2 AVG EVENT MATCH QUALITY'}
            value={tickerText}
            onChange={(e) => setTickerText(e.target.value)}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Contact email">
            <input
              type="email"
              className="input-dark font-mono text-sm"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </Field>
          <Field label="Response SLA">
            <input
              className="input-dark"
              placeholder="≤ 4h business SLA"
              value={responseSla}
              onChange={(e) => setResponseSla(e.target.value)}
            />
          </Field>
        </div>
      </SectionCard>
    </div>
  );
}
