import { useEffect, useRef, useState } from 'react';
import { Lock, Send, AlertTriangle, Loader2 } from 'lucide-react';
import { subscribeMessages, sendMessage } from '../lib/portal';
import type { OrderMessage } from '../lib/portal';
import { cx } from '../lib/format';

/** Merge server messages with local optimistic temp messages (dedupe by body). */
function mergeMessages(prev: OrderMessage[], incoming: OrderMessage[]): OrderMessage[] {
  const temps = prev.filter(
    (m) =>
      m.id.startsWith('temp-') &&
      !incoming.some(
        (s) => s.sender === m.sender && s.body === m.body && Math.abs(s.createdAt - m.createdAt) < 8000,
      ),
  );
  return [...incoming, ...temps];
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ArchitectChat({ orderId }: { orderId: string }) {
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return subscribeMessages(orderId, (incoming) => {
      setMessages((prev) => mergeMessages(prev, incoming));
    });
  }, [orderId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setDraft('');
    setError(null);
    const temp: OrderMessage = {
      id: `temp-${Date.now()}`,
      orderId,
      sender: 'client',
      body,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, temp]);
    setSending(true);
    try {
      await sendMessage(orderId, 'client', body);
    } catch {
      setError('Message failed to send. Please try again.');
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="glass flex h-[520px] flex-col overflow-hidden rounded-xl">
      {/* channel header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-emerald-400" />
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-300">
            Encrypted Channel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <p className="text-xs font-semibold text-slate-300">Lead Architect</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-400/80">online</p>
        </div>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="telemetry">no messages yet — start the conversation below.</p>
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender === 'client';
          return (
            <div key={m.id} className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
              <div
                className={cx(
                  'max-w-[80%] rounded-lg border px-4 py-3',
                  mine
                    ? 'border-emerald-700/50 bg-emerald-500/10'
                    : 'border-indigo-700/50 bg-indigo-500/10',
                )}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <p
                    className={cx(
                      'font-mono text-[10px] uppercase tracking-[0.2em]',
                      mine ? 'text-emerald-400' : 'text-indigo-400',
                    )}
                  >
                    {mine ? 'You' : 'Lead Architect'}
                  </p>
                  <p className="telemetry whitespace-nowrap">{fmtTime(m.createdAt)}</p>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-200">{m.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="flex items-center gap-2 border-t border-rose-800/60 bg-rose-950/50 px-5 py-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          <p className="text-sm text-rose-200">{error}</p>
        </div>
      )}

      {/* composer */}
      <div className="border-t border-slate-800/80 p-4">
        <div className="flex gap-2.5">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void send();
            }}
            placeholder="Message your Lead Architect…"
            className="input-dark"
            aria-label="Message"
          />
          <button
            onClick={() => void send()}
            disabled={!draft.trim() || sending}
            className="btn-primary shrink-0 px-4"
            aria-label="Send message"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
