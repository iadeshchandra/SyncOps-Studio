import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { CheckCircle2, Loader2, Plus, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';
import { db, isDemoMode } from '../../lib/firebase';
import { useSiteConfig, saveSiteConfig } from '../../lib/siteConfig';
import { OWNER_EMAILS, logAudit } from '../../lib/admin';
import { cx } from '../../lib/format';

const ADMINS_LS_KEY = 'syncops_admins';

async function loadManagedOwners(): Promise<string[]> {
  if (isDemoMode || !db) {
    try {
      const raw = JSON.parse(localStorage.getItem(ADMINS_LS_KEY) ?? '[]') as unknown;
      return Array.isArray(raw) ? (raw as string[]) : [];
    } catch {
      return [];
    }
  }
  const snap = await getDoc(doc(db, 'platformConfig', 'admins'));
  const data = snap.data() as { owners?: string[] } | undefined;
  return Array.isArray(data?.owners) ? data.owners : [];
}

async function saveManagedOwners(owners: string[]): Promise<void> {
  if (isDemoMode || !db) {
    localStorage.setItem(ADMINS_LS_KEY, JSON.stringify(owners));
    return;
  }
  await setDoc(doc(db, 'platformConfig', 'admins'), { owners, updatedAt: Date.now() }, { merge: true });
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-md border border-slate-800 bg-slate-950/60 px-4 py-3 text-left transition-colors hover:border-slate-600"
    >
      <span>
        <span className="block text-sm font-semibold text-slate-200">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>}
      </span>
      <span
        className={cx(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-emerald-500' : 'bg-slate-700',
        )}
      >
        <span
          className={cx(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </span>
    </button>
  );
}

export default function SettingsTab() {
  const { config, loading: configLoading } = useSiteConfig();

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [enableLabs, setEnableLabs] = useState(true);
  const [enableHireModal, setEnableHireModal] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  const [owners, setOwners] = useState<string[]>([]);
  const [ownersLoading, setOwnersLoading] = useState(true);
  const [newOwner, setNewOwner] = useState('');
  const [ownerError, setOwnerError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    if (configLoading || hydrated) return;
    setMaintenanceMode(!!config.maintenanceMode);
    setMaintenanceMessage(config.maintenanceMessage ?? '');
    setEnableLabs(config.enableLabs ?? true);
    setEnableHireModal(config.enableHireModal ?? true);
    setHydrated(true);
  }, [configLoading, hydrated, config]);

  const refreshOwners = useCallback(async () => {
    setOwnersLoading(true);
    try {
      setOwners(await loadManagedOwners());
    } finally {
      setOwnersLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshOwners();
  }, [refreshOwners]);

  const savePlatform = async (patch: Record<string, unknown>, auditAction: string, auditDetail?: string) => {
    setSaving(true);
    setNotice(null);
    try {
      await saveSiteConfig(patch);
      await logAudit(auditAction, auditDetail);
      setNotice({ ok: true, text: 'Saved.' });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : 'Save failed.' });
    } finally {
      setSaving(false);
    }
  };

  const addOwner = async () => {
    setOwnerError(null);
    const email = newOwner.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setOwnerError('Enter a valid email address.');
      return;
    }
    if (owners.includes(email) || OWNER_EMAILS.map((e) => e.toLowerCase()).includes(email)) {
      setOwnerError('This email already has owner access.');
      return;
    }
    const next = [...owners, email];
    await saveManagedOwners(next);
    setOwners(next);
    setNewOwner('');
    await logAudit('settings.owner.add', email);
  };

  const removeOwner = async (email: string) => {
    const next = owners.filter((o) => o !== email);
    await saveManagedOwners(next);
    setOwners(next);
    await logAudit('settings.owner.remove', email);
  };

  const resetDemoData = () => {
    const doomed = Object.keys(localStorage).filter((k) => k.startsWith('syncops_'));
    doomed.forEach((k) => localStorage.removeItem(k));
    setConfirmReset(false);
    setResetDone(true);
    void logAudit('settings.demo.reset', `${doomed.length} keys cleared`);
  };

  if (configLoading || !hydrated) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="ml-2 text-sm">Loading platform settings…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notice && (
        <div
          className={cx(
            'flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium',
            notice.ok
              ? 'border-emerald-700/60 bg-emerald-950/60 text-emerald-300'
              : 'border-rose-800/60 bg-rose-950/60 text-rose-300',
          )}
        >
          {notice.ok && <CheckCircle2 className="h-4 w-4" />}
          {notice.text}
        </div>
      )}

      {/* Maintenance */}
      <section className="glass rounded-lg p-5 sm:p-6">
        <h3 className="h-display text-base">Maintenance mode</h3>
        <p className="mt-1 text-sm text-slate-400">
          When on, public routes show the maintenance message instead of the site.
        </p>
        <div className="mt-4 space-y-3">
          <Toggle
            checked={maintenanceMode}
            onChange={setMaintenanceMode}
            label="Maintenance mode"
            hint={maintenanceMode ? 'Site is showing the maintenance message.' : 'Site is live.'}
          />
          <label className="block">
            <span className="label-dark">Maintenance message</span>
            <textarea
              rows={2}
              className="input-dark"
              placeholder="SyncOps Studio is undergoing scheduled infrastructure maintenance. Back shortly."
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
            />
          </label>
          <button
            className="btn-primary"
            disabled={saving}
            onClick={() =>
              void savePlatform(
                { maintenanceMode, maintenanceMessage: maintenanceMessage.trim() },
                'settings.maintenance',
                maintenanceMode ? 'enabled' : 'disabled',
              )
            }
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save maintenance settings
          </button>
        </div>
      </section>

      {/* Owner access */}
      <section className="glass rounded-lg p-5 sm:p-6">
        <h3 className="h-display text-base">Owner access</h3>
        <p className="mt-1 text-sm text-slate-400">
          Bootstrap: create the <span className="font-mono text-xs text-cyan-400">platformConfig/admins</span>{' '}
          document in the Firestore console once. Environment owners are read-only.
        </p>
        <div className="mt-4">
          <span className="label-dark">Environment owners</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {OWNER_EMAILS.length === 0 ? (
              <span className="telemetry">none configured</span>
            ) : (
              OWNER_EMAILS.map((e) => (
                <span key={e} className="rounded border border-slate-700 bg-slate-950/60 px-2.5 py-1 font-mono text-xs text-slate-300">
                  {e}
                </span>
              ))
            )}
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="label-dark">Firestore-managed owners</span>
            <button
              className="inline-flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-slate-200"
              onClick={() => void refreshOwners()}
            >
              <RefreshCw className={cx('h-3.5 w-3.5', ownersLoading && 'animate-spin')} /> Refresh
            </button>
          </div>
          {ownersLoading ? (
            <Loader2 className="mt-2 h-4 w-4 animate-spin text-slate-500" />
          ) : owners.length === 0 ? (
            <p className="telemetry mt-1.5">no managed owners yet</p>
          ) : (
            <ul className="mt-1.5 space-y-1.5">
              {owners.map((o) => (
                <li
                  key={o}
                  className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/60 px-3 py-2"
                >
                  <span className="font-mono text-xs text-slate-300">{o}</span>
                  <button
                    className="text-rose-400/80 transition-colors hover:text-rose-300"
                    onClick={() => void removeOwner(o)}
                    aria-label={`Remove ${o}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <input
              type="email"
              className="input-dark"
              placeholder="owner@example.com"
              value={newOwner}
              onChange={(e) => setNewOwner(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void addOwner();
              }}
            />
            <button className="btn-ghost shrink-0" onClick={() => void addOwner()}>
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
          {ownerError && <p className="mt-2 text-sm text-rose-400">{ownerError}</p>}
        </div>
      </section>

      {/* Feature flags */}
      <section className="glass rounded-lg p-5 sm:p-6">
        <h3 className="h-display text-base">Feature flags</h3>
        <p className="mt-1 text-sm text-slate-400">
          Stored in <span className="font-mono text-xs text-cyan-400">platformConfig/public</span>. Wired in a
          future pass — toggles persist now, consumption lands with the enforcement update.
        </p>
        <div className="mt-4 space-y-3">
          <Toggle
            checked={enableLabs}
            onChange={(v) => {
              setEnableLabs(v);
              void savePlatform({ enableLabs: v }, 'settings.flag', `enableLabs=${v}`);
            }}
            label="SyncOps Labs"
            hint="Public engineering sandbox at /labs."
          />
          <Toggle
            checked={enableHireModal}
            onChange={(v) => {
              setEnableHireModal(v);
              void savePlatform({ enableHireModal: v }, 'settings.flag', `enableHireModal=${v}`);
            }}
            label="Hire Modal intake"
            hint="Architecture order flow across the site."
          />
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-lg border border-rose-800/60 bg-rose-950/20 p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-base font-black tracking-tight text-rose-300">
          <ShieldAlert className="h-4 w-4" /> Danger zone
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Clears all <span className="font-mono text-xs">syncops_*</span> browser storage — demo user, demo orders,
          messages, keys, drafts. Works in demo mode.
        </p>
        {resetDone && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Demo data cleared.
          </p>
        )}
        <div className="mt-3">
          {confirmReset ? (
            <span className="inline-flex items-center gap-2">
              <button
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-rose-500"
                onClick={resetDemoData}
              >
                Confirm reset
              </button>
              <button className="btn-ghost" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </span>
          ) : (
            <button
              className="rounded-md border border-rose-700/70 bg-rose-950/40 px-4 py-2 text-sm font-bold text-rose-300 transition-colors hover:border-rose-500 hover:text-rose-200"
              onClick={() => {
                setResetDone(false);
                setConfirmReset(true);
              }}
            >
              Reset demo data
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
