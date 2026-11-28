import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, X, Mail, StickyNote, ArrowRight } from 'lucide-react';
import { listOrders, orderRef, STAGES, type Order } from '../../lib/portal';
import { summarizeClients, getClientNote, saveClientNote, type ClientSummary } from '../../lib/clients';
import { fmtUSD, cx } from '../../lib/format';
import { agreedUsd } from '../../lib/pricing';

function priceOf(o: Order): number {
  return agreedUsd(o);
}

export default function ClientsTab() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ClientSummary | null>(null);
  const [note, setNote] = useState('');
  const [noteState, setNoteState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const refresh = useCallback(async () => {
    try {
      setClients(summarizeClients(await listOrders(), priceOf));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load clients.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selected) return;
    setNoteState('idle');
    getClientNote(selected.email)
      .then(setNote)
      .catch(() => setNote(''));
  }, [selected?.email]);

  const handleSaveNote = async () => {
    if (!selected) return;
    setNoteState('saving');
    try {
      await saveClientNote(selected.email, note);
      setNoteState('saved');
    } catch {
      setNoteState('idle');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="eyebrow">client_roster</p>
        <h2 className="h-display mt-1 text-2xl">Clients</h2>
        <p className="mt-1 text-sm text-slate-400">
          Every client in one place — their orders, their value, and your private notes.
        </p>
      </div>

      {error && (
        <div className="glass rounded-xl border-rose-800/60 p-4 text-sm text-rose-300">{error}</div>
      )}

      <div className="grid gap-3 md:hidden">
        {clients.map((c) => (
          <button
            key={c.email}
            type="button"
            onClick={() => setSelected(c)}
            className="glass rounded-xl p-4 text-left transition-colors hover:bg-slate-800/30"
          >
            <p className="truncate font-semibold text-slate-100">{c.name}</p>
            <p className="telemetry truncate">{c.email}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <span className="telemetry">{c.orders.length} orders</span>
              <span className="telemetry">{c.activeCount} active</span>
              <span className="telemetry">{fmtUSD(c.totalValue)}</span>
              <span className="telemetry">
                last{' '}
                {new Date(c.lastActivityAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </button>
        ))}
        {clients.length === 0 && (
          <div className="glass rounded-xl px-4 py-10 text-center text-sm text-slate-500">
            No clients yet. Clients appear here automatically from their first order.
          </div>
        )}
      </div>

      <div className="glass hidden overflow-x-auto rounded-xl md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800/80">
              {['Client', 'Orders', 'Active', 'Total value', 'Last order'].map((h) => (
                <th key={h} className="label-dark !mb-0 px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr
                key={c.email}
                onClick={() => setSelected(c)}
                className="cursor-pointer border-b border-slate-800/40 transition-colors last:border-0 hover:bg-slate-800/30"
              >
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-100">{c.name}</p>
                  <p className="telemetry">{c.email}</p>
                </td>
                <td className="telemetry px-4 py-3">{c.orders.length}</td>
                <td className="telemetry px-4 py-3">{c.activeCount}</td>
                <td className="telemetry px-4 py-3">{fmtUSD(c.totalValue)}</td>
                <td className="telemetry px-4 py-3">
                  {new Date(c.lastActivityAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                  No clients yet. Clients appear here automatically from their first order.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="glass-strong max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">client_detail</p>
                <h3 className="h-display mt-1 text-xl">{selected.name}</h3>
                <a
                  href={`mailto:${selected.email}`}
                  className="telemetry mt-1 inline-flex items-center gap-1.5 text-cyan-300 hover:underline"
                >
                  <Mail className="h-3.5 w-3.5" /> {selected.email}
                </a>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="btn-ghost !px-2.5 !py-2"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="label-dark mt-6">Orders ({selected.orders.length})</p>
            <div className="space-y-2">
              {selected.orders.map((o: Order) => (
                <Link
                  key={o.id}
                  to={`/ekanto?tab=orders&order=${o.id}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-slate-800/80 bg-slate-950/60 px-3.5 py-2.5 transition-colors hover:border-slate-600"
                >
                  <span className="font-semibold text-slate-100">{o.packageName || o.packageId}</span>
                  <span className="telemetry text-cyan-300/80">{orderRef(o)}</span>
                  <span className="telemetry">
                    S{o.stageIndex + 1} · {STAGES[o.stageIndex]?.title ?? '?'}
                  </span>
                  <span
                    className={cx(
                      'rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
                      o.status === 'completed'
                        ? 'border-violet-700/60 bg-violet-950/40 text-violet-300'
                        : 'border-slate-700 bg-slate-900/60 text-slate-300',
                    )}
                  >
                    {o.status}
                  </span>
                  <ArrowRight className="ml-auto h-4 w-4 text-slate-500" />
                </Link>
              ))}
            </div>

            <p className="label-dark mt-6 flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-amber-400" /> Private studio note — only you see this
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Pays via Wise · prefers WhatsApp · store timezone GMT+3…"
              className="input-dark w-full"
              aria-label="Private studio note"
            />
            <div className="mt-2.5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => void handleSaveNote()}
                disabled={noteState === 'saving'}
                className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50"
              >
                {noteState === 'saving' ? 'Saving…' : 'Save note'}
              </button>
              {noteState === 'saved' && <span className="telemetry text-emerald-300">saved</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
