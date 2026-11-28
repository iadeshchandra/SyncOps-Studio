import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, MailOpen, Trash2 } from 'lucide-react';
import { listLeads, deleteLead, type Lead } from '../../lib/leads';

function formatTs(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function gradeStyle(grade: string): string {
  if (grade === 'A+' || grade === 'A') return 'border-emerald-700/60 bg-emerald-950/60 text-emerald-300';
  if (grade === 'B') return 'border-cyan-700/60 bg-cyan-950/60 text-cyan-300';
  if (grade === 'C') return 'border-amber-700/60 bg-amber-950/60 text-amber-300';
  return 'border-rose-700/60 bg-rose-950/60 text-rose-300';
}

export default function LeadsTab() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setLeads(await listLeads());
      setLoadError(false);
    } catch (err) {
      // A failed load must never render as "no leads yet" (E-X4).
      console.error('Leads failed to load', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // In-app two-step delete (window.confirm is auto-dismissed in some
  // browsers, which silently vetoed the delete there).
  const [armedDeleteId, setArmedDeleteId] = useState<string | null>(null);
  const remove = async (id: string) => {
    await deleteLead(id);
    setArmedDeleteId(null);
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="glass-strong flex flex-col gap-2 rounded-lg p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="h-display text-lg">Leads</h2>
          <p className="mt-1 text-sm text-slate-400">
            Audit report requests from the landing page — newest first. Reply personally; that's
            the whole play.
          </p>
        </div>
        <button className="btn-ghost" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <section className="glass overflow-hidden rounded-lg">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="ml-2 text-sm">Reading leads…</span>
          </div>
        ) : loadError ? (
          <div className="py-16 text-center">
            <MailOpen className="mx-auto h-8 w-8 text-rose-700" />
            <p className="mt-3 text-sm font-medium text-rose-300">
              Leads could not be loaded — this is a connection problem, not an empty list.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Reopen the tab to try again. If it persists, check the console network tab.
            </p>
          </div>
        ) : leads.length === 0 ? (
          <div className="py-16 text-center">
            <MailOpen className="mx-auto h-8 w-8 text-slate-700" />
            <p className="mt-3 text-sm font-medium text-slate-400">No leads yet.</p>
            <p className="mt-1 text-xs text-slate-600">
              They appear here when a visitor requests their audit report by email.
            </p>
          </div>
        ) : (
          <>
          <div className="grid gap-3 md:hidden">
            {leads.map((l) => (
              <div key={l.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <a
                    href={`mailto:${l.email}?subject=Your%20SyncOps%20tracking%20audit%20report`}
                    className="break-all font-mono text-xs text-cyan-300 hover:text-cyan-200 hover:underline"
                  >
                    {l.email}
                  </a>
                  <span
                    className={`inline-flex shrink-0 items-center rounded border px-2 py-0.5 font-mono text-[11px] font-bold ${gradeStyle(l.grade)}`}
                  >
                    {l.grade} · {l.score}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="break-all font-mono text-xs text-slate-300">{l.domain}</p>
                  <p className="telemetry whitespace-nowrap">{formatTs(l.createdAt)}</p>
                </div>
                <div className="mt-1 text-right">
                  <button
                    className="inline-flex items-center gap-1 text-xs font-medium text-rose-400/80 transition-colors hover:text-rose-300"
                    onClick={() =>
                      armedDeleteId === l.id ? void remove(l.id) : setArmedDeleteId(l.id)
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {armedDeleteId === l.id ? 'Sure?' : ''}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">Email</th>
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">Domain</th>
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">Score</th>
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">Captured</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-b border-slate-800/60 last:border-0">
                    <td className="px-4 py-3">
                      <a
                        href={`mailto:${l.email}?subject=Your%20SyncOps%20tracking%20audit%20report`}
                        className="font-mono text-xs text-cyan-300 hover:text-cyan-200 hover:underline"
                      >
                        {l.email}
                      </a>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{l.domain}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[11px] font-bold ${gradeStyle(l.grade)}`}
                      >
                        {l.grade} · {l.score}
                      </span>
                    </td>
                    <td className="telemetry whitespace-nowrap px-4 py-3">{formatTs(l.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="inline-flex items-center gap-1 text-xs font-medium text-rose-400/80 transition-colors hover:text-rose-300"
                        onClick={() =>
                          armedDeleteId === l.id ? void remove(l.id) : setArmedDeleteId(l.id)
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {armedDeleteId === l.id ? 'Sure?' : ''}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </div>
  );
}
