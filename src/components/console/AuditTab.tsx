import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, ScrollText } from 'lucide-react';
import { readAuditLog, type AuditEntry } from '../../lib/admin';

function formatTs(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export default function AuditTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await readAuditLog(100));
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <div className="glass-strong flex flex-col gap-2 rounded-lg p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="h-display text-lg">Audit log</h2>
          <p className="mt-1 text-sm text-slate-400">
            Append-only record of console activity — newest first, last 100 entries.
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
            <span className="ml-2 text-sm">Reading audit log…</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center">
            <ScrollText className="mx-auto h-8 w-8 text-slate-700" />
            <p className="mt-3 text-sm font-medium text-slate-400">No console activity yet.</p>
            <p className="mt-1 text-xs text-slate-600">
              Publishes, key changes and settings updates will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">Timestamp</th>
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">Actor</th>
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">Action</th>
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-slate-800/60 last:border-0">
                    <td className="telemetry whitespace-nowrap px-4 py-3">{formatTs(e.createdAt)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{e.actor}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded border border-indigo-700/60 bg-indigo-950/60 px-2 py-0.5 font-mono text-[11px] text-indigo-300">
                        {e.action}
                      </span>
                    </td>
                    <td className="max-w-[320px] truncate px-4 py-3 text-xs text-slate-400" title={e.details ?? ''}>
                      {e.details || <span className="text-slate-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
