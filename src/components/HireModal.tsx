import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection } from 'firebase/firestore';
import { X, ChevronLeft, ChevronRight, Check, AlertCircle, Loader2 } from 'lucide-react';
import { db, isDemoMode } from '../lib/firebase';
import { PACKAGES } from '../data/content';
import { cx, fmtUSD } from '../lib/format';

export interface HirePrefill {
  packageId?: string;
  adSpend?: number;
  roas?: number;
  recovery?: number;
}

interface HireModalState {
  open: boolean;
  nonce: number;
  prefill: HirePrefill;
}

interface HireModalContextValue {
  openHireModal: (prefill?: HirePrefill) => void;
  closeHireModal: () => void;
  modal: HireModalState;
}

const HireModalContext = createContext<HireModalContextValue | null>(null);

export function HireModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<HireModalState>({ open: false, nonce: 0, prefill: {} });

  const openHireModal = useCallback((prefill: HirePrefill = {}) => {
    setModal((m) => ({ open: true, nonce: m.nonce + 1, prefill }));
  }, []);

  const closeHireModal = useCallback(() => {
    setModal((m) => ({ ...m, open: false }));
  }, []);

  const value = useMemo(
    () => ({ openHireModal, closeHireModal, modal }),
    [openHireModal, closeHireModal, modal]
  );

  return <HireModalContext.Provider value={value}>{children}</HireModalContext.Provider>;
}

export function useHireModal(): { openHireModal: (prefill?: HirePrefill) => void } {
  const ctx = useContext(HireModalContext);
  if (!ctx) throw new Error('useHireModal must be used within HireModalProvider');
  return { openHireModal: ctx.openHireModal };
}

export function HireModalRoot() {
  const ctx = useContext(HireModalContext);
  if (!ctx || !ctx.modal.open) return null;
  return (
    <HireModal
      key={ctx.modal.nonce}
      prefill={ctx.modal.prefill}
      onClose={ctx.closeHireModal}
    />
  );
}

const STEPS = ['Package', 'Scope', 'Brand', 'Contact'];

const SCOPES = [
  'Shopify Plus',
  'Headless / Custom stack',
  'Meta CAPI',
  'TikTok CAPI',
  'Google Ads Enhanced Conversions',
  'Pinterest CAPI',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function HireModal({ prefill, onClose }: { prefill: HirePrefill; onClose: () => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [packageId, setPackageId] = useState(prefill.packageId ?? '');
  const [scope, setScope] = useState<string[]>([]);
  const [storeUrl, setStoreUrl] = useState('');
  const [adSpend, setAdSpend] = useState(prefill.adSpend != null ? String(prefill.adSpend) : '');
  const [networks, setNetworks] = useState('');
  const [launchDate, setLaunchDate] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const toggleScope = (s: string) =>
    setScope((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const validateStep = (s: number): string => {
    if (s === 0 && !packageId) return 'Select an architecture package to continue.';
    if (s === 2) {
      const u = storeUrl.trim();
      if (!u || !u.includes('.')) return 'Enter your store URL, e.g. brand.com.';
    }
    if (s === 3 && !EMAIL_RE.test(email.trim())) return 'Enter a valid email address.';
    return '';
  };

  const next = () => {
    const msg = validateStep(step);
    if (msg) {
      setError(msg);
      return;
    }
    setError('');
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const back = () => {
    setError('');
    setStep((s) => Math.max(0, s - 1));
  };

  const submit = async () => {
    const msg = validateStep(3);
    if (msg) {
      setError(msg);
      return;
    }
    setError('');
    setSubmitting(true);

    const payload = {
      clientName: name.trim(),
      clientEmail: email.trim(),
      brandUrl: storeUrl.trim(),
      packageId,
      scope,
      status: 'intake',
      stageIndex: 0,
      adSpend: Number(adSpend) || 0,
      primaryNetworks: networks.trim(),
      targetLaunchDate: launchDate,
      notes: notes.trim(),
      createdAt: Date.now(),
      deadlineAt: Date.now() + 14 * 86400000,
      revisions: [] as string[],
      ...(prefill.roas != null ? { roas: prefill.roas } : {}),
      ...(prefill.recovery != null ? { projectedRecovery: prefill.recovery } : {}),
    };

    try {
      let id: string;
      if (!isDemoMode && db) {
        const ref = await addDoc(collection(db, 'orders'), payload);
        id = ref.id;
      } else {
        id = `demo-${Date.now().toString(36)}`;
        const raw = localStorage.getItem('syncops_orders');
        const arr: unknown[] = raw ? (JSON.parse(raw) as unknown[]) : [];
        arr.push({ id, ...payload });
        localStorage.setItem('syncops_orders', JSON.stringify(arr));
      }
      onClose();
      navigate(`/client/portal/${id}`);
    } catch {
      setError('Submission failed — your details were not lost. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPackage = PACKAGES.find((p) => p.id === packageId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Hire SyncOps Studio"
    >
      <div
        className="glass-strong flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4">
          <div>
            <p className="eyebrow !text-[10px]">Architecture Intake</p>
            <h2 className="h-display mt-1 text-lg">Hire SyncOps Studio</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-700 text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="border-b border-slate-800/80 px-6 py-4">
          <div className="flex items-center">
            {STEPS.map((label, i) => (
              <div key={label} className="flex flex-1 items-center last:flex-none">
                <div className="flex items-center gap-2">
                  <span
                    className={cx(
                      'flex h-7 w-7 items-center justify-center rounded-md border font-mono text-[11px]',
                      i < step
                        ? 'border-emerald-500/60 bg-emerald-950/60 text-emerald-300'
                        : i === step
                          ? 'border-emerald-400 bg-emerald-500 font-bold text-slate-950'
                          : 'border-slate-700 text-slate-500'
                    )}
                  >
                    {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span
                    className={cx(
                      'hidden text-xs font-medium sm:inline',
                      i === step ? 'text-slate-100' : 'text-slate-500'
                    )}
                  >
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && <div className="mx-3 h-px flex-1 bg-slate-800" />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {error && (
            <p className="mb-5 flex items-center gap-2 rounded-md border border-rose-800/70 bg-rose-950/60 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </p>
          )}

          {step === 0 && (
            <div className="space-y-3">
              <p className="label-dark">Select your architecture package</p>
              {PACKAGES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPackageId(p.id)}
                  className={cx(
                    'flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-all',
                    packageId === p.id
                      ? 'border-emerald-500/70 bg-emerald-950/40'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'
                  )}
                  aria-pressed={packageId === p.id}
                >
                  <span
                    className={cx(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                      packageId === p.id ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'
                    )}
                  >
                    {packageId === p.id && <Check className="h-3.5 w-3.5 text-slate-950" />}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-slate-100">{p.name}</span>
                    <span className="block text-xs text-slate-500">{p.tagline}</span>
                  </span>
                  <span className="font-mono text-sm font-bold text-emerald-300">
                    {fmtUSD(p.price)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="label-dark">Architecture scope — select all that apply</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {SCOPES.map((s) => {
                  const active = scope.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleScope(s)}
                      className={cx(
                        'flex items-center gap-3 rounded-lg border px-4 py-3.5 text-left text-sm font-medium transition-all',
                        active
                          ? 'border-cyan-400/70 bg-cyan-950/40 text-cyan-100'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                      )}
                      aria-pressed={active}
                    >
                      <span
                        className={cx(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                          active ? 'border-cyan-400 bg-cyan-400' : 'border-slate-600'
                        )}
                      >
                        {active && <Check className="h-3.5 w-3.5 text-slate-950" />}
                      </span>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label htmlFor="hire-url" className="label-dark">
                  Store URL *
                </label>
                <input
                  id="hire-url"
                  type="text"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  placeholder="brand.com"
                  className="input-dark font-mono"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div>
                <label htmlFor="hire-spend" className="label-dark">
                  Monthly ad spend (USD)
                </label>
                <input
                  id="hire-spend"
                  type="number"
                  min={0}
                  value={adSpend}
                  onChange={(e) => setAdSpend(e.target.value)}
                  placeholder="120000"
                  className="input-dark font-mono"
                />
              </div>
              <div>
                <label htmlFor="hire-networks" className="label-dark">
                  Primary ad networks
                </label>
                <input
                  id="hire-networks"
                  type="text"
                  value={networks}
                  onChange={(e) => setNetworks(e.target.value)}
                  placeholder="Meta, Google, TikTok"
                  className="input-dark"
                />
              </div>
              <div>
                <label htmlFor="hire-launch" className="label-dark">
                  Target launch date
                </label>
                <input
                  id="hire-launch"
                  type="date"
                  value={launchDate}
                  onChange={(e) => setLaunchDate(e.target.value)}
                  className="input-dark font-mono"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                <p className="label-dark">Engagement summary</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Package</span>
                    <span className="font-semibold text-slate-100">
                      {selectedPackage ? selectedPackage.name : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Store</span>
                    <span className="font-mono text-slate-200">{storeUrl.trim() || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Monthly ad spend</span>
                    <span className="font-mono text-slate-200">
                      {adSpend ? fmtUSD(Number(adSpend) || 0) : '—'}
                    </span>
                  </div>
                  {scope.length > 0 && (
                    <div className="flex flex-wrap justify-end gap-1.5 pt-1">
                      {scope.map((s) => (
                        <span
                          key={s}
                          className="rounded-md border border-cyan-700/50 bg-cyan-950/40 px-2 py-0.5 font-mono text-[10px] text-cyan-200"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  {prefill.recovery != null && (
                    <div className="flex justify-between border-t border-slate-800 pt-2">
                      <span className="text-slate-500">Projected monthly recovery</span>
                      <span className="font-mono font-bold text-emerald-300">
                        {fmtUSD(prefill.recovery)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="hire-name" className="label-dark">
                  Your name
                </label>
                <input
                  id="hire-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jordan Ellis"
                  className="input-dark"
                  autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="hire-email" className="label-dark">
                  Work email *
                </label>
                <input
                  id="hire-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jordan@brand.com"
                  className="input-dark"
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="hire-notes" className="label-dark">
                  Anything we should know
                </label>
                <textarea
                  id="hire-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Current stack, blockers, timeline pressure…"
                  rows={3}
                  className="input-dark resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-800/80 px-6 py-4">
          <button
            type="button"
            onClick={back}
            disabled={step === 0 || submitting}
            className="btn-ghost !px-4 !py-2.5 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className="btn-primary !px-6 !py-2.5">
              Continue <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="btn-primary !px-6 !py-2.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Deploying…
                </>
              ) : (
                <>
                  Submit Architecture Order <Check className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
