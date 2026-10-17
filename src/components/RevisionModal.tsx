import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { X, Plus, Pencil, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { cx } from '../lib/format';

type RevisionType = 'addition' | 'change' | 'revision';

interface Props {
  open: boolean;
  onClose(): void;
  onSubmit(type: RevisionType, details: string): Promise<void>;
}

const TYPES: {
  value: RevisionType;
  icon: typeof Plus;
  title: string;
  desc: string;
  ring: string;
  iconTone: string;
}[] = [
  {
    value: 'addition',
    icon: Plus,
    title: 'Addition',
    desc: 'Add new scope — a channel, event, or integration.',
    ring: 'peer-checked:border-emerald-500/70 peer-checked:bg-emerald-950/40',
    iconTone: 'text-emerald-400',
  },
  {
    value: 'change',
    icon: Pencil,
    title: 'Change',
    desc: 'Adjust existing scope — mapping, naming, config.',
    ring: 'peer-checked:border-cyan-500/70 peer-checked:bg-cyan-950/40',
    iconTone: 'text-cyan-400',
  },
  {
    value: 'revision',
    icon: RefreshCw,
    title: 'Revision',
    desc: 'Rework something already delivered or in review.',
    ring: 'peer-checked:border-amber-500/70 peer-checked:bg-amber-950/40',
    iconTone: 'text-amber-400',
  },
];

export default function RevisionModal({ open, onClose, onSubmit }: Props) {
  const [type, setType] = useState<RevisionType>('addition');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setType('addition');
      setDetails('');
      setSubmitting(false);
      setError(null);
    }
  }, [open ]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const valid = details.trim().length >= 12;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(type, details.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Request scope revision"
    >
      <div
        className="glass-strong w-full max-w-lg rounded-xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow mb-1">scope_revision</p>
            <h3 className="h-display text-xl">Request Revision</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-5">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {TYPES.map((t) => (
              <label key={t.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="revision-type"
                  value={t.value}
                  checked={type === t.value}
                  onChange={() => setType(t.value)}
                  className="peer sr-only"
                />
                <div
                  className={cx(
                    'rounded-lg border border-slate-800 bg-slate-950/60 p-3.5 transition-all',
                    t.ring,
                  )}
                >
                  <t.icon className={cx('h-5 w-5', t.iconTone)} />
                  <p className="mt-2 text-sm font-bold text-slate-100">{t.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{t.desc}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-4">
            <label htmlFor="revision-details" className="label-dark">
              Details — minimum 12 characters
            </label>
            <textarea
              id="revision-details"
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe exactly what you want added, changed, or reworked…"
              className="input-dark resize-none"
            />
            <p className={cx('mt-1.5 text-right font-mono text-[11px]', valid ? 'text-emerald-400' : 'text-slate-600')}>
              {details.trim().length}/12+
            </p>
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-rose-800/60 bg-rose-950/50 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <p className="text-sm text-rose-200">{error}</p>
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">
              Cancel
            </button>
            <button type="submit" disabled={!valid || submitting} className="btn-primary flex-1">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                </>
              ) : (
                'Submit Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
