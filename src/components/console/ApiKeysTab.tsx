import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Plus, RefreshCw, Trash2, XCircle } from 'lucide-react';
import { db, isDemoMode } from '../../lib/firebase';
import { logAudit } from '../../lib/admin';
import { cx } from '../../lib/format';

export interface KeyEntry {
  id: string;
  name: string;
  scope: 'client' | 'server';
  value: string;
  enabled: boolean;
  createdAt: number;
}

const LS_KEY = 'syncops_apikeys';

async function loadKeys(): Promise<KeyEntry[]> {
  if (isDemoMode || !db) {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as unknown;
      return Array.isArray(raw) ? (raw as KeyEntry[]) : [];
    } catch {
      return [];
    }
  }
  const snap = await getDoc(doc(db, 'platformConfig', 'apiKeys'));
  const data = snap.data() as { keys?: KeyEntry[] } | undefined;
  return Array.isArray(data?.keys) ? (data.keys as KeyEntry[]) : [];
}

async function persistKeys(keys: KeyEntry[]): Promise<void> {
  if (isDemoMode || !db) {
    localStorage.setItem(LS_KEY, JSON.stringify(keys));
    return;
  }
  await setDoc(doc(db, 'platformConfig', 'apiKeys'), { keys, updatedAt: Date.now() }, { merge: true });
}

/**
 * Client-safe key lookup for future in-app consumers (e.g. live-darshan
 * detection). Returns the value only for enabled, client-scoped keys —
 * server-scoped keys are never exposed through this helper.
 */
export async function getClientApiKey(name: string): Promise<string | null> {
  const keys = await loadKeys();
  const hit = keys.find((k) => k.name === name && k.scope === 'client' && k.enabled);
  return hit ? hit.value : null;
}

const PROVIDER_PRESETS = [
  { label: 'Custom', hint: 'myApiKey', note: 'Any third-party integration.' },
  { label: 'YouTube Data', hint: 'youtubeApiKey', note: 'Enables live-darshan detection on client sites.' },
  { label: 'Meta Graph', hint: 'metaGraphToken', note: 'Server-side Graph API dispatch probes.' },
  { label: 'TikTok Events', hint: 'tiktokEventsToken', note: 'TikTok Events API relay authentication.' },
  { label: 'Google Ads', hint: 'googleAdsToken', note: 'Enhanced Conversions API access.' },
] as const;

function maskValue(v: string): string {
  if (v.length <= 6) return '••••••••';
  return `${v.slice(0, 4)}••••••••${v.slice(-2)}`;
}

export default function ApiKeysTab() {
  const [keys, setKeys] = useState<KeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [scope, setScope] = useState<'client' | 'server'>('client');
  const [preset, setPreset] = useState<string>(PROVIDER_PRESETS[0].label);
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setKeys(await loadKeys());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = async (next: KeyEntry[], auditAction: string, auditDetail: string) => {
    setBusy(true);
    try {
      await persistKeys(next);
      setKeys(next);
      await logAudit(auditAction, auditDetail);
    } finally {
      setBusy(false);
    }
  };

  const addKey = async () => {
    setFormError(null);
    const n = name.trim() || PROVIDER_PRESETS.find((p) => p.label === preset)?.hint || 'apiKey';
    if (!value.trim()) {
      setFormError('Key value is required.');
      return;
    }
    if (keys.some((k) => k.name === n)) {
      setFormError('A key with this name already exists.');
      return;
    }
    const entry: KeyEntry = {
      id: `key-${Date.now()}`,
      name: n,
      scope,
      value: value.trim(),
      enabled: true,
      createdAt: Date.now(),
    };
    await save([...keys, entry], 'apikeys.add', `${n} (${scope})`);
    setName('');
    setValue('');
  };

  const toggleEnabled = (k: KeyEntry) =>
    save(
      keys.map((x) => (x.id === k.id ? { ...x, enabled: !x.enabled } : x)),
      k.enabled ? 'apikeys.disable' : 'apikeys.enable',
      k.name,
    );

  const deleteKey = (k: KeyEntry) => {
    setConfirmDelete(null);
    void save(
      keys.filter((x) => x.id !== k.id),
      'apikeys.delete',
      k.name,
    );
  };

  /** Read-only probe — validates format locally, never transmits the key. */
  const testKey = (k: KeyEntry) => {
    if (!k.enabled) {
      setTestResults((r) => ({ ...r, [k.id]: { ok: false, message: 'Key is disabled — enable it first.' } }));
      return;
    }
    const min = k.scope === 'client' ? 8 : 12;
    if (!k.value) {
      setTestResults((r) => ({ ...r, [k.id]: { ok: false, message: 'Empty value — nothing stored.' } }));
    } else if (k.value.length < min) {
      setTestResults((r) => ({
        ...r,
        [k.id]: { ok: false, message: `Too short — expected at least ${min} characters.` },
      }));
    } else {
      setTestResults((r) => ({
        ...r,
        [k.id]: { ok: true, message: 'Stored — format valid. Key never leaves this console.' },
      }));
    }
  };

  const presetNote = PROVIDER_PRESETS.find((p) => p.label === preset)?.note;

  return (
    <div className="space-y-6">
      <div className="glass-strong rounded-lg p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="h-display text-lg">API keys</h2>
            <p className="mt-1 text-sm text-slate-400">
              Owner-only document — never exposed to clients. Client-safe keys are readable via{' '}
              <span className="font-mono text-xs text-cyan-400">getClientApiKey()</span>; server-only keys stay
              in this console.
            </p>
          </div>
          <button className="btn-ghost" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={cx('h-4 w-4', loading && 'animate-spin')} /> Refresh
          </button>
        </div>
      </div>

      {/* Key table */}
      <section className="glass overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">Name</th>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">Scope</th>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">Value</th>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">Created</th>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">Status</th>
                <th className="px-4 py-3 text-right font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : keys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <KeyRound className="mx-auto h-6 w-6 text-slate-600" />
                    <p className="mt-2 text-sm text-slate-500">No keys yet. Add the first one below.</p>
                  </td>
                </tr>
              ) : (
                keys.map((k) => (
                  <tr key={k.id} className="border-b border-slate-800/60 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-slate-200">{k.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cx(
                          'inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider',
                          k.scope === 'client'
                            ? 'border-emerald-700/60 bg-emerald-950/60 text-emerald-400'
                            : 'border-rose-800/60 bg-rose-950/60 text-rose-400',
                        )}
                      >
                        {k.scope === 'client' ? 'client-safe' : 'server-only'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="group inline-flex items-center gap-2 font-mono text-xs text-slate-300"
                        onClick={() => setRevealed((r) => ({ ...r, [k.id]: !r[k.id] }))}
                        title={revealed[k.id] ? 'Mask value' : 'Reveal value'}
                      >
                        <span className={cx(!k.enabled && 'line-through opacity-50')}>
                          {revealed[k.id] ? k.value : maskValue(k.value)}
                        </span>
                        {revealed[k.id] ? (
                          <EyeOff className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300" />
                        ) : (
                          <Eye className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300" />
                        )}
                      </button>
                    </td>
                    <td className="telemetry px-4 py-3">
                      {new Date(k.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cx('telemetry', k.enabled ? 'text-emerald-400' : 'text-slate-500')}>
                        {k.enabled ? '● enabled' : '○ disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="rounded border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:border-cyan-500/60 hover:text-cyan-300"
                          onClick={() => testKey(k)}
                        >
                          Test
                        </button>
                        <button
                          className="rounded border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:border-amber-500/60 hover:text-amber-300"
                          onClick={() => void toggleEnabled(k)}
                          disabled={busy}
                        >
                          {k.enabled ? 'Disable' : 'Enable'}
                        </button>
                        {confirmDelete === k.id ? (
                          <span className="inline-flex items-center gap-1">
                            <button
                              className="rounded border border-rose-700 bg-rose-950/60 px-2.5 py-1 text-xs font-bold text-rose-300"
                              onClick={() => deleteKey(k)}
                            >
                              Confirm
                            </button>
                            <button
                              className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-400"
                              onClick={() => setConfirmDelete(null)}
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            className="rounded border border-slate-700 p-1.5 text-slate-400 transition-colors hover:border-rose-700 hover:text-rose-300"
                            onClick={() => setConfirmDelete(k.id)}
                            aria-label={`Delete ${k.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {testResults[k.id] && (
                        <p
                          className={cx(
                            'mt-1.5 flex items-center gap-1 text-right text-xs',
                            testResults[k.id].ok ? 'text-emerald-400' : 'text-rose-400',
                          )}
                        >
                          {testResults[k.id].ok ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {testResults[k.id].message}
                        </p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add form */}
      <section className="glass rounded-lg p-5 sm:p-6">
        <h3 className="h-display text-base">Add key</h3>
        <p className="mt-1 text-sm text-slate-400">
          {isDemoMode
            ? 'Demo mode — keys are stored in this browser only.'
            : 'Live mode — keys are stored in the owner-only platformConfig/apiKeys document.'}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label-dark">Provider preset</span>
            <select className="input-dark" value={preset} onChange={(e) => setPreset(e.target.value)}>
              {PROVIDER_PRESETS.map((p) => (
                <option key={p.label} value={p.label}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label-dark">Key name</span>
            <input
              className="input-dark font-mono text-sm"
              placeholder={PROVIDER_PRESETS.find((p) => p.label === preset)?.hint}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="label-dark">Key value</span>
            <input
              type="password"
              className="input-dark font-mono text-sm"
              placeholder="Paste the secret — it is masked everywhere else"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="block">
            <span className="label-dark">Scope</span>
            <select
              className="input-dark"
              value={scope}
              onChange={(e) => setScope(e.target.value as 'client' | 'server')}
            >
              <option value="client">client-safe — readable by the app at runtime</option>
              <option value="server">server-only — console use only, never shipped to clients</option>
            </select>
          </label>
        </div>
        {presetNote && <p className="mt-3 text-xs text-slate-500">{presetNote}</p>}
        {formError && <p className="mt-3 text-sm text-rose-400">{formError}</p>}
        <button className="btn-primary mt-4" onClick={() => void addKey()} disabled={busy}>
          <Plus className="h-4 w-4" /> Save key
        </button>
      </section>
    </div>
  );
}
