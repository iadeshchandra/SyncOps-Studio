import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Info, XCircle } from 'lucide-react';
import ToolCta from '../../components/ToolCta';
import { useConfigPageMeta } from '../../lib/meta';
import { trackEvent } from '../../lib/measurement';
import { GA4_SPEC_SOURCE } from '../../data/tools';
import { validateDataLayer, type Severity } from '../../lib/datalayerValidator';

const GOOD_SAMPLE = `dataLayer.push({
  event: "purchase",
  ecommerce: {
    transaction_id: "T-1042",
    value: 74.98,
    currency: "USD",
    items: [
      { item_id: "SKU-100", item_name: "Trail Shoes", price: 34.99, quantity: 2 },
      { item_id: "SKU-205", item_name: "Wool Socks", price: 5.00, quantity: 1 }
    ]
  }
});`;

const BROKEN_SAMPLE = `dataLayer.push({
  event: "purchase",
  ecommerce: {
    value: "129.00",
    currency: "usd",
    items: [
      { item_name: "Leather Wallet", price: "59.00", quantity: 1 },
      { price: 70.00, quantity: 1 }
    ]
  }
});`;

const SEVERITY_STYLE: Record<Severity, { icon: typeof XCircle; classes: string; label: string }> = {
  error: { icon: XCircle, classes: 'border-rose-400/30 bg-rose-400/10 text-rose-200', label: 'Error' },
  warning: { icon: AlertTriangle, classes: 'border-amber-400/30 bg-amber-400/10 text-amber-200', label: 'Warning' },
  note: { icon: Info, classes: 'border-sky-400/30 bg-sky-400/10 text-sky-200', label: 'Note' },
};

export default function DatalayerValidator() {
  useConfigPageMeta('toolDatalayerValidator');
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const startedRef = useRef(false);
  const completedRef = useRef(false);

  const result = useMemo(() => (submitted ? validateDataLayer(submitted) : null), [submitted]);

  const markStarted = () => {
    if (!startedRef.current) {
      startedRef.current = true;
      trackEvent('tool_started', { tool: 'datalayer-validator' });
    }
  };

  const run = (text: string) => {
    markStarted();
    setSubmitted(text);
    if (!completedRef.current && text.trim()) {
      completedRef.current = true;
      trackEvent('tool_completed', { tool: 'datalayer-validator' });
    }
  };

  const verdict = result
    ? result.parseError
      ? null
      : result.errors > 0
        ? { text: 'Problems found', classes: 'text-rose-300' }
        : result.warnings > 0
          ? { text: 'Valid, with warnings', classes: 'text-amber-300' }
          : { text: 'Matches the specification', classes: 'text-emerald-300' }
    : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6">
      <Link to="/tools" className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-emerald-300">
        <ArrowLeft className="h-4 w-4" /> All tools
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl">GA4 dataLayer Validator</h1>
      <p className="mt-4 max-w-2xl leading-relaxed text-slate-400">
        Paste a <code className="rounded bg-white/5 px-1.5 py-0.5 text-[0.9em] text-slate-200">dataLayer.push(…)</code> from
        your site — a purchase, an add_to_cart, any ecommerce event — and see it checked line by line against Google's GA4
        ecommerce specification. Everything runs in your browser: nothing you paste is sent anywhere or stored.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => { setInput(GOOD_SAMPLE); run(GOOD_SAMPLE); }}
          className="rounded-full border border-emerald-400/40 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/10"
        >
          Try a correct purchase
        </button>
        <button
          type="button"
          onClick={() => { setInput(BROKEN_SAMPLE); run(BROKEN_SAMPLE); }}
          className="rounded-full border border-rose-400/40 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/10"
        >
          Try a broken one
        </button>
      </div>

      <label className="mt-6 block">
        <span className="text-sm font-medium text-slate-300">Your dataLayer event</span>
        <textarea
          value={input}
          onChange={(e) => { setInput(e.target.value); markStarted(); }}
          rows={12}
          spellCheck={false}
          placeholder={'dataLayer.push({ event: "purchase", ecommerce: { … } })'}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 p-4 font-mono text-[13px] leading-relaxed text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50"
        />
      </label>
      <button
        type="button"
        onClick={() => run(input)}
        disabled={!input.trim()}
        className="mt-4 rounded-full bg-emerald-400 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Validate this event
      </button>

      {result && (
        <div className="mt-10">
          {result.parseError ? (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-5 text-sm leading-relaxed text-rose-100">
              {result.parseError}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <p className={`inline-flex items-center gap-2 text-lg font-bold ${verdict?.classes ?? ''}`}>
                  {result.errors === 0 && result.warnings === 0
                    ? <CheckCircle2 className="h-5 w-5" />
                    : <AlertTriangle className="h-5 w-5" />}
                  {verdict?.text}
                </p>
                <p className="text-sm text-slate-400">
                  {result.events.length} event{result.events.length === 1 ? '' : 's'} checked · {result.errors} errors ·{' '}
                  {result.warnings} warnings · {result.notes} notes
                </p>
              </div>

              <div className="mt-6 space-y-6">
                {result.events.map((ev, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <h2 className="font-mono text-sm font-bold text-white">{ev.name}</h2>
                    <ul className="mt-4 space-y-3">
                      {ev.findings.map((f, j) => {
                        const s = SEVERITY_STYLE[f.severity];
                        const Icon = s.icon;
                        return (
                          <li key={j} className={`rounded-xl border p-4 ${s.classes}`}>
                            <p className="flex items-center gap-2 text-sm font-bold">
                              <Icon className="h-4 w-4 shrink-0" />
                              {s.label} — {f.title}
                            </p>
                            <p className="mt-1.5 text-sm leading-relaxed opacity-90">{f.detail}</p>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-sm leading-relaxed text-slate-500">
                What this proves, honestly: the event <em>as pasted</em> matches the specification. It cannot prove the
                event actually fires on your live checkout, fires only once, or reaches GA4 and the ad platforms — that
                takes a live test order, which is exactly what our audits do.
              </p>
            </>
          )}
        </div>
      )}

      <p className="mt-10 text-xs text-slate-600">{GA4_SPEC_SOURCE}</p>

      <ToolCta servicePath="/services/analytics" serviceLabel="See Analytics & Pixel Setup" />
    </div>
  );
}
