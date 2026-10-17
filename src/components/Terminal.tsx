import { useEffect, useRef, useState } from 'react';
import { nextLogLine } from '../lib/telemetry';
import { cx } from '../lib/format';

interface TerminalProps {
  title?: string;
  className?: string;
  /** Override the scroll-area height, e.g. "h-[420px]". Defaults to h-[320px]. */
  bodyClassName?: string;
}

const MAX_LINES = 140;

interface Line {
  id: number;
  text: string;
}

function toneFor(text: string): string {
  if (/(error|fail|retry|timeout|denied)/i.test(text)) return 'text-rose-400';
  if (/(ok|success|200|heartbeat|complete|active)/i.test(text)) return 'text-emerald-400/90';
  if (/(dispatch|send|sync|drained)/i.test(text)) return 'text-cyan-300/90';
  return 'text-slate-400';
}

export default function Terminal({ title = 'syncops-edge — stdout', className, bodyClassName = 'h-[320px]' }: TerminalProps) {
  const [lines, setLines] = useState<Line[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLines((prev) => {
        const next = [...prev, { id: seqRef.current, text: nextLogLine(seqRef.current) }];
        seqRef.current += 1;
        return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
      });
    }, 850);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      const ts = new Date().toISOString().slice(11, 19);
      setLines((prev) => {
        const next = [
          ...prev,
          {
            id: seqRef.current,
            text: `${ts} [core] heartbeat cluster=healthy nodes=6/6 operational drift=+0.00s success`,
          },
        ];
        seqRef.current += 1;
        return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
      });
    }, 9000);
    return () => window.clearInterval(id);
  }, []);

  // Auto-scroll to bottom on new lines.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div className={cx('terminal-window overflow-hidden', className)}>
      <div className="flex items-center gap-2 border-b border-slate-800/70 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
        <span className="telemetry ml-2 truncate">{title}</span>
        <span className="telemetry ml-auto hidden sm:inline">
          {lines.length}/{MAX_LINES} lines
        </span>
      </div>
      <div
        ref={scrollRef}
        className={cx(
          'overflow-y-auto px-4 py-3 font-mono text-[11px] leading-relaxed sm:text-[12px]',
          bodyClassName,
        )}
        aria-live="off"
      >
        {lines.map((line) => (
          <div key={line.id} className={cx('whitespace-pre-wrap break-all', toneFor(line.text))}>
            {line.text}
          </div>
        ))}
        <div className="mt-1 flex items-center gap-1.5 text-slate-500">
          <span>$</span>
          <span className="inline-block h-4 w-2 animate-blink bg-emerald-400" />
        </div>
      </div>
    </div>
  );
}
