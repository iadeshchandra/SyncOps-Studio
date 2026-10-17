import { useMemo, useState, type ReactNode } from 'react';
import {
  Braces,
  CheckCircle2,
  Copy,
  Dices,
  Info,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { cx, demoHex } from '../lib/format';

const EVENT_NAMES = ['Purchase', 'Lead', 'AddToCart', 'InitiateCheckout', 'ViewContent'] as const;
const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'BDT'] as const;

const PII_FIELDS = [
  { key: 'em', label: 'Email', placeholder: 'buyer@brand.com' },
  { key: 'ph', label: 'Phone', placeholder: '+1 415 555 0132' },
  { key: 'fn', label: 'First name', placeholder: 'Aarav' },
  { key: 'ln', label: 'Last name', placeholder: 'Sharma' },
  { key: 'ct', label: 'City', placeholder: 'Mumbai' },
  { key: 'st', label: 'State', placeholder: 'MH' },
  { key: 'zp', label: 'ZIP / PIN', placeholder: '400001' },
  { key: 'country', label: 'Country code', placeholder: 'IN' },
] as const;

type PiiKey = (typeof PII_FIELDS)[number]['key'];

interface Issue {
  level: 'error' | 'warning' | 'info';
  message: string;
}

function newEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 24);
  }
  let out = '';
  const chars = 'abcdef0123456789';
  for (let i = 0; i < 24; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Tiny syntax tinter: keys cyan, strings emerald, numbers amber, literals indigo. */
function highlightJson(json: string): ReactNode[] {
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+\.?\d*(?:[eE][+-]?\d+)?)|\b(true|false|null)\b/g;
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(json)) !== null) {
    if (m.index > last) out.push(<span key={k++} className="text-slate-400">{json.slice(last, m.index)}</span>);
    const [tok, isKey] = [m[0], m[2]];
    let cls = 'text-slate-400';
    if (m[1] && isKey) cls = 'text-cyan-300';
    else if (m[1]) cls = 'text-emerald-300/90';
    else if (m[3]) cls = 'text-amber-300';
    else if (/^(true|false|null)$/.test(tok)) cls = 'text-indigo-300';
    out.push(<span key={k++} className={cls}>{tok}</span>);
    last = m.index + tok.length;
  }
  if (last < json.length) out.push(<span key={k++} className="text-slate-400">{json.slice(last)}</span>);
  return out;
}

const DISPATCH_STEPS = ['Normalizing & SHA-256 hashing PII', 'Checking event_id deduplication window', 'Dispatching to Graph API v21.0'];

export default function PayloadBuilder() {
  const [eventName, setEventName] = useState<string>('Purchase');
  const [eventId, setEventId] = useState<string>(() => newEventId());
  const [eventTime, setEventTime] = useState<string>(() => toLocalInput(new Date()));
  const [value, setValue] = useState<string>('129.00');
  const [currency, setCurrency] = useState<string>('USD');
  const [pii, setPii] = useState<Record<PiiKey, string>>({
    em: '', ph: '', fn: '', ln: '', ct: '', st: '', zp: '', country: '',
  });
  const [copied, setCopied] = useState(false);
  const [dispatchStep, setDispatchStep] = useState(-1); // -1 idle, 0..2 progress, 3 done
  const [receipt, setReceipt] = useState<{ eventId: string; dedupKey: string } | null>(null);

  const setPiiField = (key: PiiKey, v: string) =>
    setPii((prev) => ({ ...prev, [key]: v }));

  const payload = useMemo(() => {
    const hashedUserData: Record<string, string[]> = {};
    for (const f of PII_FIELDS) {
      const raw = pii[f.key].trim().toLowerCase();
      if (raw) hashedUserData[f.key] = [demoHex(`${f.key}:${raw}`, 64)];
    }
    const epoch = Math.floor(new Date(eventTime).getTime() / 1000);
    return {
      data: [
        {
          event_name: eventName,
          event_time: Number.isFinite(epoch) ? epoch : null,
          event_id: eventId.trim(),
          action_source: 'website',
          event_source_url: 'https://yourstore.com/checkout',
          user_data: hashedUserData,
          custom_data: {
            value: Number.parseFloat(value) || 0,
            currency,
          },
        },
      ],
    };
  }, [eventName, eventId, eventTime, value, currency, pii]);

  const json = useMemo(() => JSON.stringify(payload, null, 2), [payload]);

  const issues: Issue[] = useMemo(() => {
    const list: Issue[] = [];
    const id = eventId.trim();
    if (!id) {
      list.push({ level: 'error', message: 'event_id is required — browser/server deduplication is impossible without it.' });
    } else if (!/^[A-Za-z0-9_.-]{8,64}$/.test(id)) {
      list.push({ level: 'error', message: 'event_id must be 8–64 chars: letters, digits, _ . - only.' });
    }
    const t = new Date(eventTime).getTime();
    if (!eventTime || !Number.isFinite(t)) {
      list.push({ level: 'error', message: 'event_time is not a valid date.' });
    }
    const empty = PII_FIELDS.filter((f) => !pii[f.key].trim()).length;
    if (empty > 2) {
      list.push({
        level: 'warning',
        message: `${empty} of 8 PII fields empty — Event Match Quality will degrade below the 9.0 target.`,
      });
    }
    list.push({
      level: 'info',
      message: 'Add a test_event_code from Meta Events Manager to route this payload to Test Events before going live.',
    });
    return list;
  }, [eventId, eventTime, pii]);

  const hasErrors = issues.some((i) => i.level === 'error');

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const sendTest = () => {
    if (hasErrors || dispatchStep >= 0) return;
    setReceipt(null);
    setDispatchStep(0);
    DISPATCH_STEPS.forEach((_, i) => {
      window.setTimeout(() => setDispatchStep(i + 1), (i + 1) * 900);
    });
    window.setTimeout(() => {
      setReceipt({ eventId: eventId.trim(), dedupKey: demoHex(`dedup:${eventId}`, 8) });
      setDispatchStep(3);
      window.setTimeout(() => setDispatchStep(-1), 12000);
    }, DISPATCH_STEPS.length * 900 + 400);
  };

  const issueStyle = (level: Issue['level']) =>
    level === 'error'
      ? 'border-rose-800/70 bg-rose-950/50 text-rose-300'
      : level === 'warning'
        ? 'border-amber-800/60 bg-amber-950/40 text-amber-300'
        : 'border-slate-700/70 bg-slate-900/60 text-slate-400';

  const issueIcon = (level: Issue['level']) =>
    level === 'error' ? (
      <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-rose-400" />
    ) : level === 'warning' ? (
      <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-400" />
    ) : (
      <Info className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
    );

  return (
    <div className="glass overflow-hidden rounded-xl">
      <div className="flex items-center gap-3 border-b border-slate-800/70 px-5 py-4">
        <Braces className="h-5 w-5 text-cyan-400" />
        <div>
          <h3 className="font-bold tracking-tight text-slate-50">CAPI Payload Builder</h3>
          <p className="telemetry">Build, validate & test a Meta Conversions API event — fully client-side</p>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-2">
        {/* Left: form */}
        <div className="space-y-4 border-b border-slate-800/70 p-5 lg:border-b-0 lg:border-r">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-dark" htmlFor="pb-event-name">event_name</label>
              <select
                id="pb-event-name"
                className="input-dark"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
              >
                {EVENT_NAMES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-dark" htmlFor="pb-event-time">event_time</label>
              <input
                id="pb-event-time"
                type="datetime-local"
                className="input-dark"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label-dark" htmlFor="pb-event-id">event_id (deduplication key)</label>
            <div className="flex gap-2">
              <input
                id="pb-event-id"
                type="text"
                className="input-dark font-mono"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                placeholder="unique event id"
              />
              <button
                type="button"
                onClick={() => setEventId(newEventId())}
                className="btn-ghost shrink-0 !px-3"
                title="Regenerate event_id"
              >
                <Dices className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-dark" htmlFor="pb-value">value</label>
              <input
                id="pb-value"
                type="number"
                min="0"
                step="0.01"
                className="input-dark font-mono"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div>
              <label className="label-dark" htmlFor="pb-currency">currency</label>
              <select
                id="pb-currency"
                className="input-dark"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <label className="label-dark !mb-0">user_data (PII)</label>
              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400/90">
                <ShieldCheck className="h-3 w-3" /> SHA-256 hashed at dispatch — never transmitted raw
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {PII_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="label-dark" htmlFor={`pb-pii-${f.key}`}>
                    {f.key} · {f.label}
                  </label>
                  <input
                    id={`pb-pii-${f.key}`}
                    type="text"
                    className="input-dark font-mono !py-2 text-[13px]"
                    value={pii[f.key]}
                    onChange={(e) => setPiiField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: preview + validator */}
        <div className="flex flex-col gap-4 p-5">
          <div className="terminal-window overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800/70 px-4 py-2">
              <span className="telemetry">payload.json — live preview</span>
              <button
                type="button"
                onClick={copyJson}
                className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900/70 px-2.5 py-1 font-mono text-[11px] text-slate-300 transition-colors hover:border-cyan-400/60 hover:text-cyan-300"
              >
                {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy JSON'}
              </button>
            </div>
            <pre className="max-h-[380px] overflow-auto whitespace-pre-wrap break-all px-4 py-3 font-mono text-[11px] leading-relaxed">
              {highlightJson(json)}
            </pre>
          </div>

          <div className="space-y-2">
            <p className="label-dark">Validator</p>
            {issues.map((issue, i) => (
              <div key={i} className={cx('flex items-start gap-2 rounded-md border px-3 py-2 text-xs leading-relaxed', issueStyle(issue.level))}>
                {issueIcon(issue.level)}
                <span>{issue.message}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-2">
            <button type="button" onClick={sendTest} disabled={hasErrors || dispatchStep >= 0} className="btn-primary w-full">
              {dispatchStep >= 0 && dispatchStep < 3 ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {dispatchStep === -1 ? 'Send Test Event' : dispatchStep < 3 ? DISPATCH_STEPS[dispatchStep] : 'Dispatch Complete'}
            </button>

            {dispatchStep >= 0 && dispatchStep < 3 && (
              <div className="mt-3 space-y-1.5">
                {DISPATCH_STEPS.map((step, i) => (
                  <div key={step} className="flex items-center gap-2 font-mono text-[11px]">
                    {i < dispatchStep ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : i === dispatchStep ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                    ) : (
                      <span className="h-3.5 w-3.5 rounded-full border border-slate-700" />
                    )}
                    <span className={i <= dispatchStep ? 'text-slate-300' : 'text-slate-600'}>{step}</span>
                  </div>
                ))}
              </div>
            )}

            {receipt && dispatchStep === 3 && (
              <div className="mt-3 rounded-md border border-emerald-700/70 bg-emerald-950/50 px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> Test event accepted (simulated)
                </p>
                <p className="telemetry mt-2 break-all">
                  event_id: <span className="text-emerald-300">{receipt.eventId}</span>
                </p>
                <p className="telemetry mt-1 break-all">
                  dedup_key: <span className="text-cyan-300">{receipt.dedupKey}</span> · receipt: ok
                </p>
                <button
                  type="button"
                  onClick={() => { setReceipt(null); setDispatchStep(-1); }}
                  className="mt-2 inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-400 transition-colors hover:text-slate-200"
                >
                  <RefreshCw className="h-3 w-3" /> Reset test
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
