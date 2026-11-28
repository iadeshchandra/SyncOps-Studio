import { useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';
import {
  useSiteConfig,
  saveSiteConfig,
  type ProofQuoteConfig,
  type TestimonialConfig,
} from '../../lib/siteConfig';
import { logAudit } from '../../lib/admin';
import { EXTRA_FAQS, FAQS, type FaqItem } from '../../components/FaqList';
import {
  FOOTER_LINKS,
  NAV_LINKS,
  PAGE_SEO,
  PAGE_WORDS,
  PIPELINE_STEPS,
  PROOF_STATS,
  type LinkItem,
  type PageWords,
  type PageWordsKey,
  type SeoKey,
  type PipelineStep,
  type ProofStat,
} from '../../data/content';
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

  const [proofQuotes, setProofQuotes] = useState<ProofQuoteConfig[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialConfig[]>([]);
  const [heroStats, setHeroStats] = useState<{ value: string; label: string }[]>([]);
  const [heroEyebrow, setHeroEyebrow] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroHighlight, setHeroHighlight] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [seo, setSeo] = useState<Record<SeoKey, { title: string; description: string }>>(() => {
    const out = {} as Record<SeoKey, { title: string; description: string }>;
    (Object.keys(PAGE_SEO) as SeoKey[]).forEach((k) => {
      out[k] = { ...PAGE_SEO[k] };
    });
    return out;
  });
  const [navLinks, setNavLinks] = useState<LinkItem[]>([]);
  const [footerLinks, setFooterLinks] = useState<LinkItem[]>([]);
  const [pageWords, setPageWords] = useState<Record<PageWordsKey, PageWords>>({
    about: { ...PAGE_WORDS.about },
    process: { ...PAGE_WORDS.process },
    agencies: { ...PAGE_WORDS.agencies },
    contact: { ...PAGE_WORDS.contact },
  });
  const [faqsExtra, setFaqsExtra] = useState<FaqItem[]>([]);
  const [proofStats, setProofStats] = useState<ProofStat[]>([]);
  const [tickerText, setTickerText] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [responseSla, setResponseSla] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (loading || hydrated) return;
    setProofQuotes((config.proofQuotes ?? []).map((q) => ({ ...q })));
    setTestimonials((config.testimonials ?? []).map((t) => ({ ...t })));
    setHeroStats((config.heroStats ?? DEFAULT_HERO_STATS).map((s) => ({ ...s })));
    setHeroEyebrow(config.heroEyebrow ?? '');
    setHeroTitle(config.heroTitle ?? '');
    setHeroHighlight(config.heroHighlight ?? '');
    setHeroSubtitle(config.heroSubtitle ?? '');
    setPipelineSteps((config.pipelineSteps ?? PIPELINE_STEPS).map((s) => ({ ...s })));
    setProofStats((config.proofStats ?? PROOF_STATS).map((s) => ({ ...s })));
    setFaqs((config.faqs ?? FAQS).map((f) => ({ ...f })));
    setFaqsExtra((config.faqsExtra ?? EXTRA_FAQS).map((f) => ({ ...f })));
    setSeo(() => {
      const out = {} as Record<SeoKey, { title: string; description: string }>;
      (Object.keys(PAGE_SEO) as SeoKey[]).forEach((k) => {
        out[k] = { ...(config.seo?.[k] ?? PAGE_SEO[k]) };
      });
      return out;
    });
    setNavLinks((config.navLinks ?? NAV_LINKS).map((l) => ({ ...l })));
    setFooterLinks((config.footerLinks ?? FOOTER_LINKS).map((l) => ({ ...l })));
    setPageWords({
      about: { ...(config.pageWords?.about ?? PAGE_WORDS.about) },
      process: { ...(config.pageWords?.process ?? PAGE_WORDS.process) },
      agencies: { ...(config.pageWords?.agencies ?? PAGE_WORDS.agencies) },
      contact: { ...(config.pageWords?.contact ?? PAGE_WORDS.contact) },
    });
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
        heroEyebrow: heroEyebrow.trim(),
        heroTitle: heroTitle.trim(),
        heroHighlight: heroHighlight.trim(),
        heroSubtitle: heroSubtitle.trim(),
        pipelineSteps,
        proofStats,
        faqs,
        faqsExtra,
        pageWords,
        seo,
        navLinks,
        footerLinks,
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
        `${proofQuotes.length} proof quotes · ${testimonials.length} testimonials`,
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
        title="Homepage headline"
        desc="The big words at the very top of the homepage. The highlighted word is shown in colour — it must appear inside the headline exactly as written."
      >
        <Field label="Small line above the headline">
          <input
            className="input-dark"
            value={heroEyebrow}
            onChange={(e) => setHeroEyebrow(e.target.value)}
            placeholder="First-Party Data Infrastructure"
          />
        </Field>
        <Field label="Headline">
          <textarea
            rows={2}
            className="input-dark"
            value={heroTitle}
            onChange={(e) => setHeroTitle(e.target.value)}
            placeholder="Reclaim the 30% of ad signal Safari, iOS and ad blockers steal."
          />
        </Field>
        <Field label="Highlighted word (shown in colour)">
          <input
            className="input-dark font-mono"
            value={heroHighlight}
            onChange={(e) => setHeroHighlight(e.target.value)}
            placeholder="30%"
          />
        </Field>
        <Field label="Sub-headline (the paragraph under the headline)">
          <textarea
            rows={3}
            className="input-dark"
            value={heroSubtitle}
            onChange={(e) => setHeroSubtitle(e.target.value)}
          />
        </Field>
      </SectionCard>

      <SectionCard
        title="Search titles & descriptions"
        desc="What Google shows for each page: the blue title line and the short description under it. Changes apply to visitors right away; the copy baked in for crawlers refreshes on the next site update."
      >
        {(
          [
            ['home', 'HOME PAGE'],
            ['about', 'ABOUT'],
            ['process', 'PROCESS'],
            ['agencies', 'FOR AGENCIES'],
            ['contact', 'CONTACT'],
            ['faq', 'FAQ'],
            ['pricing', 'PRICING'],
            ['reviews', 'REVIEWS'],
            ['case-studies', 'CASE STUDIES'],
            ['notes', 'FIELD NOTES'],
            ['work', 'WORK'],
            ['compare', 'COMPARE'],
            ['labs', 'LABS'],
            ['status', 'STATUS'],
            ['terms', 'TERMS & REFUNDS'],
            ['privacy', 'PRIVACY'],
          ] as [SeoKey, string][]
        ).map(([key, label]) => (
          <div key={key} className="rounded-md border border-slate-800 bg-slate-950/60 p-4">
            <span className="telemetry text-cyan-400">{label}</span>
            <div className="mt-3 grid gap-3">
              <Field label="Title (the blue line in Google)">
                <input
                  className="input-dark"
                  value={seo[key].title}
                  onChange={(e) => setSeo({ ...seo, [key]: { ...seo[key], title: e.target.value } })}
                />
              </Field>
              <Field label="Description (the text under the title)">
                <textarea
                  rows={2}
                  className="input-dark"
                  value={seo[key].description}
                  onChange={(e) =>
                    setSeo({ ...seo, [key]: { ...seo[key], description: e.target.value } })
                  }
                />
              </Field>
            </div>
          </div>
        ))}
      </SectionCard>

      <SectionCard
        title="Menu & footer links"
        desc="The page links in the top menu (on phones the same list appears in the menu, now including About and Contact) and in the footer's Studio column. The address is the page path, like /about."
      >
        <p className="telemetry text-cyan-400">TOP MENU LINKS</p>
        {navLinks.map((l, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <Field label="Words shown">
                <input
                  className="input-dark"
                  value={l.label}
                  onChange={(e) => setNavLinks(updateAt(navLinks, i, { label: e.target.value }))}
                />
              </Field>
              <Field label="Goes to (page address)">
                <input
                  className="input-dark"
                  value={l.to}
                  onChange={(e) => setNavLinks(updateAt(navLinks, i, { to: e.target.value }))}
                />
              </Field>
            </div>
            <button
              className="mt-6 inline-flex shrink-0 items-center gap-1 text-xs font-medium text-rose-400/80 transition-colors hover:text-rose-300"
              onClick={() => setNavLinks(navLinks.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        ))}
        <button className="btn-ghost w-full" onClick={() => setNavLinks([...navLinks, { label: '', to: '/' }])}>
          <Plus className="h-4 w-4" /> Add menu link
        </button>

        <p className="telemetry !mt-8 text-cyan-400">FOOTER — STUDIO COLUMN</p>
        {footerLinks.map((l, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <Field label="Words shown">
                <input
                  className="input-dark"
                  value={l.label}
                  onChange={(e) => setFooterLinks(updateAt(footerLinks, i, { label: e.target.value }))}
                />
              </Field>
              <Field label="Goes to (page address)">
                <input
                  className="input-dark"
                  value={l.to}
                  onChange={(e) => setFooterLinks(updateAt(footerLinks, i, { to: e.target.value }))}
                />
              </Field>
            </div>
            <button
              className="mt-6 inline-flex shrink-0 items-center gap-1 text-xs font-medium text-rose-400/80 transition-colors hover:text-rose-300"
              onClick={() => setFooterLinks(footerLinks.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        ))}
        <button
          className="btn-ghost w-full"
          onClick={() => setFooterLinks([...footerLinks, { label: '', to: '/' }])}
        >
          <Plus className="h-4 w-4" /> Add footer link
        </button>
      </SectionCard>

      <SectionCard
        title="Page opening words"
        desc="The small line, headline and opening paragraph at the top of the About, Process, For Agencies and Contact pages."
      >
        {(
          [
            ['about', 'ABOUT PAGE'],
            ['process', 'PROCESS PAGE'],
            ['agencies', 'FOR AGENCIES PAGE'],
            ['contact', 'CONTACT PAGE'],
          ] as [PageWordsKey, string][]
        ).map(([key, label]) => (
          <div key={key} className="rounded-md border border-slate-800 bg-slate-950/60 p-4">
            <span className="telemetry text-cyan-400">{label}</span>
            <div className="mt-3 grid gap-3">
              <Field label="Small line above the headline">
                <input
                  className="input-dark"
                  value={pageWords[key].eyebrow}
                  onChange={(e) =>
                    setPageWords({ ...pageWords, [key]: { ...pageWords[key], eyebrow: e.target.value } })
                  }
                />
              </Field>
              <Field label="Headline">
                <input
                  className="input-dark"
                  value={pageWords[key].title}
                  onChange={(e) =>
                    setPageWords({ ...pageWords, [key]: { ...pageWords[key], title: e.target.value } })
                  }
                />
              </Field>
              <Field label="Opening paragraph">
                <textarea
                  rows={3}
                  className="input-dark"
                  value={pageWords[key].intro}
                  onChange={(e) =>
                    setPageWords({ ...pageWords, [key]: { ...pageWords[key], intro: e.target.value } })
                  }
                />
              </Field>
            </div>
          </div>
        ))}
      </SectionCard>

      <SectionCard
        title="Questions & answers"
        desc="The FAQ questions. The first group shows on the homepage and the FAQ page; the second group shows only on the FAQ page. The order here is the order on the site."
      >
        <p className="telemetry text-cyan-400">SHOWN EVERYWHERE</p>
        {faqs.map((f, i) => (
          <div key={i} className="rounded-md border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="telemetry text-cyan-400">QUESTION {i + 1}</span>
              <button
                className="inline-flex items-center gap-1 text-xs font-medium text-rose-400/80 transition-colors hover:text-rose-300"
                onClick={() => setFaqs(faqs.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
            <div className="mt-3 grid gap-3">
              <Field label="Question">
                <input
                  className="input-dark"
                  value={f.q}
                  onChange={(e) => setFaqs(updateAt(faqs, i, { q: e.target.value }))}
                />
              </Field>
              <Field label="Answer">
                <textarea
                  rows={3}
                  className="input-dark"
                  value={f.a}
                  onChange={(e) => setFaqs(updateAt(faqs, i, { a: e.target.value }))}
                />
              </Field>
            </div>
          </div>
        ))}
        <button className="btn-ghost w-full" onClick={() => setFaqs([...faqs, { q: '', a: '' }])}>
          <Plus className="h-4 w-4" /> Add question
        </button>

        <p className="telemetry !mt-8 text-cyan-400">FAQ PAGE ONLY</p>
        {faqsExtra.map((f, i) => (
          <div key={i} className="rounded-md border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="telemetry text-cyan-400">QUESTION {i + 1}</span>
              <button
                className="inline-flex items-center gap-1 text-xs font-medium text-rose-400/80 transition-colors hover:text-rose-300"
                onClick={() => setFaqsExtra(faqsExtra.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
            <div className="mt-3 grid gap-3">
              <Field label="Question">
                <input
                  className="input-dark"
                  value={f.q}
                  onChange={(e) => setFaqsExtra(updateAt(faqsExtra, i, { q: e.target.value }))}
                />
              </Field>
              <Field label="Answer">
                <textarea
                  rows={3}
                  className="input-dark"
                  value={f.a}
                  onChange={(e) => setFaqsExtra(updateAt(faqsExtra, i, { a: e.target.value }))}
                />
              </Field>
            </div>
          </div>
        ))}
        <button
          className="btn-ghost w-full"
          onClick={() => setFaqsExtra([...faqsExtra, { q: '', a: '' }])}
        >
          <Plus className="h-4 w-4" /> Add question
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
      <SectionCard
        title="How it works steps"
        desc="The four pipeline steps on the homepage. Keep the detail line short and technical-looking — it is the small mono text at the bottom of each step."
      >
        {pipelineSteps.map((s, i) => (
          <div key={i} className="rounded-md border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="telemetry text-cyan-400">STEP {i + 1}</span>
              <button
                className="inline-flex items-center gap-1 text-xs font-medium text-rose-400/80 transition-colors hover:text-rose-300"
                onClick={() => setPipelineSteps(pipelineSteps.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
            <div className="mt-3 grid gap-3">
              <Field label="Step title">
                <input
                  className="input-dark"
                  value={s.title}
                  onChange={(e) => setPipelineSteps(updateAt(pipelineSteps, i, { title: e.target.value }))}
                />
              </Field>
              <Field label="What happens in this step">
                <textarea
                  rows={2}
                  className="input-dark"
                  value={s.desc}
                  onChange={(e) => setPipelineSteps(updateAt(pipelineSteps, i, { desc: e.target.value }))}
                />
              </Field>
              <Field label="Detail line (small mono text)">
                <input
                  className="input-dark font-mono text-xs"
                  value={s.mono}
                  onChange={(e) => setPipelineSteps(updateAt(pipelineSteps, i, { mono: e.target.value }))}
                  placeholder="ss.brand.com → edge PoP · 12ms"
                />
              </Field>
            </div>
          </div>
        ))}
        <button
          className="btn-ghost w-full"
          onClick={() => setPipelineSteps([...pipelineSteps, { title: '', desc: '', mono: '' }])}
        >
          <Plus className="h-4 w-4" /> Add step
        </button>
      </SectionCard>

      <SectionCard
        title="Proof statistics"
        desc="The numbers band in the homepage proof section. Only real, checkable numbers — never invent."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {proofStats.map((s, i) => (
            <div key={i} className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex items-center justify-between">
                <span className="telemetry text-cyan-400">NUMBER {i + 1}</span>
                <button
                  className="text-rose-400/80 transition-colors hover:text-rose-300"
                  onClick={() => setProofStats(proofStats.filter((_, idx) => idx !== i))}
                  aria-label="Remove statistic"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-2 space-y-2">
                <input
                  className="input-dark font-mono"
                  placeholder="4.9/5"
                  value={s.value}
                  onChange={(e) => setProofStats(updateAt(proofStats, i, { value: e.target.value }))}
                />
                <input
                  className="input-dark"
                  placeholder="average rating · 323 Fiverr reviews"
                  value={s.label}
                  onChange={(e) => setProofStats(updateAt(proofStats, i, { label: e.target.value }))}
                />
              </div>
            </div>
          ))}
        </div>
        <button className="btn-ghost" onClick={() => setProofStats([...proofStats, { value: '', label: '' }])}>
          <Plus className="h-4 w-4" /> Add statistic
        </button>
      </SectionCard>

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
