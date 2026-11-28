import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Download } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ToolCta from '../../components/ToolCta';
import { useConfigPageMeta } from '../../lib/meta';
import { trackEvent } from '../../lib/measurement';
import { UTM_PRESETS } from '../../data/tools';

const TOOL = 'utm-builder';

function clean(value: string, lower: boolean): string {
  const v = value.trim().replace(/\s+/g, '_');
  return lower ? v.toLowerCase() : v;
}

function buildUrl(base: string, source: string, medium: string, campaign: string, term: string, content: string): string {
  const b = base.trim();
  if (!b) return '';
  const pairs: Array<[string, string]> = [];
  if (source) pairs.push(['utm_source', source]);
  if (medium) pairs.push(['utm_medium', medium]);
  if (campaign) pairs.push(['utm_campaign', campaign]);
  if (term) pairs.push(['utm_term', term]);
  if (content) pairs.push(['utm_content', content]);
  if (pairs.length === 0) return b;
  const qs = pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const sep = b.includes('?') ? (b.endsWith('?') || b.endsWith('&') ? '' : '&') : '?';
  const hashIdx = b.indexOf('#');
  if (hashIdx >= 0) return `${b.slice(0, hashIdx)}${sep}${qs}${b.slice(hashIdx)}`;
  return `${b}${sep}${qs}`;
}

export default function UtmBuilder() {
  useConfigPageMeta('toolUtmBuilder');

  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [presetId, setPresetId] = useState('meta-feed');
  const [base, setBase] = useState('https://your-store.com/products/example');
  const [bulkBases, setBulkBases] = useState('https://your-store.com/\nhttps://your-store.com/collections/bestsellers');
  const [source, setSource] = useState('facebook');
  const [medium, setMedium] = useState('paid_social');
  const [campaign, setCampaign] = useState('spring_sale');
  const [term, setTerm] = useState('');
  const [content, setContent] = useState('');
  const [lower, setLower] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const started = useRef(false);
  const completed = useRef(false);

  const markStarted = () => {
    if (!started.current) {
      started.current = true;
      trackEvent('tool_started', { tool: TOOL });
    }
  };

  const preset = UTM_PRESETS.find((p) => p.id === presetId) ?? UTM_PRESETS[0];

  const pickPreset = (id: string) => {
    markStarted();
    setPresetId(id);
    const p = UTM_PRESETS.find((x) => x.id === id);
    if (p) {
      setSource(p.source);
      setMedium(p.medium);
    }
  };

  const cSource = clean(source, lower);
  const cMedium = clean(medium, lower);
  const cCampaign = clean(campaign, lower);
  const cTerm = clean(term, lower);
  const cContent = clean(content, lower);

  const singleUrl = useMemo(
    () => buildUrl(base, cSource, cMedium, cCampaign, cTerm, cContent),
    [base, cSource, cMedium, cCampaign, cTerm, cContent],
  );

  const bulkRows = useMemo(() => {
    if (mode !== 'bulk') return [];
    return bulkBases
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean)
      .map((b) => ({ base: b, url: buildUrl(b, cSource, cMedium, cCampaign, '', '') }));
  }, [mode, bulkBases, cSource, cMedium, cCampaign]);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
    if (!completed.current) {
      completed.current = true;
      trackEvent('tool_completed', { tool: TOOL });
    }
  };

  const downloadCsv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
      ['landing_url', 'utm_source', 'utm_medium', 'utm_campaign', 'full_url'].join(','),
      ...bulkRows.map((r) => [esc(r.base), esc(cSource), esc(cMedium), esc(cCampaign), esc(r.url)].join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'utm-links.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    if (!completed.current) {
      completed.current = true;
      trackEvent('tool_completed', { tool: TOOL });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6">
        <p className="eyebrow">
          <Link to="/tools" className="hover:text-cyan-300">free studio tools</Link> · utm builder
        </p>
        <h1 className="h-display mt-2 text-3xl sm:text-4xl">UTM builder for ecommerce campaigns</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-slate-400">
          Google&apos;s own builder makes one link at a time with no memory of your channels.
          This one carries the source/medium pairs GA4 actually groups by, enforces the
          lowercase discipline that keeps reports clean, and builds a whole campaign&apos;s
          links in bulk.
        </p>

        <div className="mt-8 flex gap-2">
          {(['single', 'bulk'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { markStarted(); setMode(m); }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                mode === m ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-700' : 'border border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              {m === 'single' ? 'Single link' : 'Bulk mode'}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="glass rounded-xl p-6 lg:col-span-2">
            <label htmlFor="utm-preset" className="label-dark block">Channel preset</label>
            <select id="utm-preset" className="input-dark" value={presetId} onChange={(e) => pickPreset(e.target.value)}>
              {UTM_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{preset.hint}</p>

            {mode === 'single' ? (
              <>
                <label htmlFor="utm-base" className="label-dark mt-5 block">Landing page URL</label>
                <input id="utm-base" className="input-dark" value={base} onChange={(e) => { markStarted(); setBase(e.target.value); }} />
              </>
            ) : (
              <>
                <label htmlFor="utm-bases" className="label-dark mt-5 block">Landing page URLs — one per line</label>
                <textarea id="utm-bases" className="input-dark min-h-28" value={bulkBases} onChange={(e) => { markStarted(); setBulkBases(e.target.value); }} />
              </>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="utm-source" className="label-dark block">Source</label>
                <input id="utm-source" className="input-dark" value={source} onChange={(e) => { markStarted(); setSource(e.target.value); }} />
              </div>
              <div>
                <label htmlFor="utm-medium" className="label-dark block">Medium</label>
                <input id="utm-medium" className="input-dark" value={medium} onChange={(e) => { markStarted(); setMedium(e.target.value); }} />
              </div>
            </div>

            <label htmlFor="utm-campaign" className="label-dark mt-5 block">Campaign</label>
            <input id="utm-campaign" className="input-dark" value={campaign} onChange={(e) => { markStarted(); setCampaign(e.target.value); }} />

            {mode === 'single' && (
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="utm-term" className="label-dark block">Term (optional)</label>
                  <input id="utm-term" className="input-dark" value={term} onChange={(e) => { markStarted(); setTerm(e.target.value); }} />
                </div>
                <div>
                  <label htmlFor="utm-content" className="label-dark block">Content (optional)</label>
                  <input id="utm-content" className="input-dark" value={content} onChange={(e) => { markStarted(); setContent(e.target.value); }} />
                </div>
              </div>
            )}

            <label className="mt-5 flex cursor-pointer items-center gap-2.5 text-sm text-slate-300">
              <input type="checkbox" checked={lower} onChange={(e) => setLower(e.target.checked)} className="h-4 w-4 accent-cyan-400" />
              Force lowercase (GA4 is case-sensitive — Facebook ≠ facebook in reports)
            </label>
          </div>

          <div className="lg:col-span-3">
            {mode === 'single' ? (
              <div className="glass rounded-xl p-6">
                <h2 className="h-display text-lg">Your link</h2>
                <p className="mt-4 break-all rounded-lg border border-slate-800 bg-slate-900/60 p-4 font-mono text-sm text-cyan-200">
                  {singleUrl || 'Add a landing page URL to build your link.'}
                </p>
                <button type="button" disabled={!singleUrl} onClick={() => copy(singleUrl, 'single')} className="btn-primary mt-4 inline-flex items-center gap-1.5 disabled:opacity-50">
                  {copied === 'single' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied === 'single' ? 'Copied' : 'Copy link'}
                </button>
              </div>
            ) : (
              <div className="glass rounded-xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="h-display text-lg">{bulkRows.length} links</h2>
                  <div className="flex gap-2">
                    <button type="button" disabled={bulkRows.length === 0} onClick={() => copy(bulkRows.map((r) => r.url).join('\n'), 'all')} className="btn-ghost inline-flex items-center gap-1.5 disabled:opacity-50">
                      {copied === 'all' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy all
                    </button>
                    <button type="button" disabled={bulkRows.length === 0} onClick={downloadCsv} className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-50">
                      <Download className="h-4 w-4" /> CSV
                    </button>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {bulkRows.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                      <p className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed text-cyan-200">{r.url}</p>
                      <button type="button" onClick={() => copy(r.url, `row-${i}`)} className="shrink-0 rounded-md border border-slate-700 p-1.5 text-slate-300 transition-colors hover:border-cyan-600" aria-label="Copy this link">
                        {copied === `row-${i}` ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))}
                  {bulkRows.length === 0 && <p className="text-sm text-slate-400">Add at least one landing page URL.</p>}
                </div>
              </div>
            )}

            <div className="glass mt-6 rounded-xl p-6">
              <h2 className="h-display text-lg">The naming rules that keep GA4 clean</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-400">
                <li>Always lowercase: GA4 treats <em>Facebook</em> and <em>facebook</em> as two different sources.</li>
                <li>Underscores, never spaces: spaces become %20 in URLs and fragment your reports.</li>
                <li>Use the mediums GA4 groups by — <em>cpc</em> for paid search, <em>paid_social</em> for paid social, <em>email</em>, <em>social</em> for organic — invented mediums land in “Unassigned”.</li>
                <li>Name the campaign once and never rename it mid-flight; a rename splits one campaign into two report rows.</li>
                <li>Never put personal data (emails, names) in UTM values — they are visible to anyone who sees the link.</li>
              </ul>
            </div>
          </div>
        </div>

        <ToolCta servicePath="/services/analytics" serviceLabel="See Analytics & Pixel Setup" />
      </main>
      <Footer />
    </div>
  );
}
