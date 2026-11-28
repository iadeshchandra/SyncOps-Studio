import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  Braces,
  ChevronDown,
  Coins,
  Link2,
  Radar,
  ShieldCheck,
  TrendingDown,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { TOOLS, type ToolMeta } from '../data/tools';
import { cx } from '../lib/format';

/**
 * The header Tools mega menu — structural code on purpose: it is NOT part
 * of the console-editable nav links, so it can never be shadowed or
 * deleted from the console. Live tools link; upcoming tools carry their
 * honest phase badge and are not links.
 */

const ICONS: Record<string, LucideIcon> = {
  'lost-conversions-calculator': TrendingDown,
  'utm-builder': Link2,
  'datalayer-validator': Braces,
  'tracking-checker': Radar,
  'consent-mode-checker': ShieldCheck,
  'sgtm-cost-estimator': Coins,
};

function iconFor(tool: ToolMeta): LucideIcon {
  return ICONS[tool.slug] ?? Wrench;
}

function ToolRow({ tool, onNavigate }: { tool: ToolMeta; onNavigate?: () => void }) {
  const Icon = iconFor(tool);
  const inner = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/70 text-slate-300">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-slate-100">
          {tool.name}
          {tool.status !== 'live' && (
            <span className="rounded-full border border-slate-700 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400">
              {tool.phase}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-slate-400">{tool.benefit}</span>
      </span>
    </>
  );
  const cls = 'flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5';
  if (tool.status !== 'live') {
    return <div className={cx(cls, 'cursor-default opacity-70')} aria-disabled="true">{inner}</div>;
  }
  return (
    <Link
      to={`/tools/${tool.slug}`}
      onClick={onNavigate}
      className={cx(cls, 'transition-colors hover:bg-slate-900 hover:text-white')}
    >
      {inner}
    </Link>
  );
}

function HeroCard({ tool, onNavigate }: { tool: ToolMeta; onNavigate?: () => void }) {
  const Icon = iconFor(tool);
  return (
    <Link
      to={`/tools/${tool.slug}`}
      onClick={onNavigate}
      className="group rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-4 transition-colors hover:border-emerald-400/50 hover:bg-emerald-400/[0.1]"
    >
      <span className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
          <Icon className="h-5 w-5" />
        </span>
        <ArrowRight className="h-4 w-4 text-emerald-300 opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
      <span className="mt-3 block text-sm font-bold text-slate-50">{tool.name}</span>
      <span className="mt-1 block text-[13px] leading-relaxed text-slate-300">{tool.benefit}</span>
      <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-300">
        Free · No sign-up
      </span>
    </Link>
  );
}

export function ToolsMenuDesktop() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open ]);

  const live = TOOLS.filter((t) => t.status === 'live');
  const heroes = live.slice(0, 2);
  const rest = TOOLS.filter((t) => !heroes.includes(t));

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-1 text-[13px] font-semibold text-slate-100 transition-colors hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
      >
        <Wrench className="h-3.5 w-3.5 text-emerald-400" />
        Tools
        <ChevronDown className={cx('h-3.5 w-3.5 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-1/2 top-full z-50 w-[min(92vw,660px)] -translate-x-1/2 pt-2">
          <div
            role="menu"
            aria-label="Free tools"
            className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/95 shadow-2xl shadow-black/60 backdrop-blur-xl"
          >
            <div className="grid grid-cols-2 gap-3 p-4">
              {heroes.map((t) => (
                <HeroCard key={t.slug} tool={t} onNavigate={() => setOpen(false)} />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-1 px-2 pb-2 sm:grid-cols-2">
              {rest.map((t) => (
                <ToolRow key={t.slug} tool={t} onNavigate={() => setOpen(false)} />
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-slate-800/80 px-5 py-3">
              <Link
                to="/tools"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-300 transition-colors hover:text-emerald-200"
              >
                See all free tools <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                Free forever · No sign-up
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ToolsMenuMobile({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="pt-3">
      <p className="flex items-center gap-2 px-3 pb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-300">
        <Wrench className="h-3.5 w-3.5" /> Free tools
      </p>
      <div className="space-y-1">
        {TOOLS.map((t) => (
          <ToolRow key={t.slug} tool={t} onNavigate={onNavigate} />
        ))}
      </div>
      <Link
        to="/tools"
        onClick={onNavigate}
        className="mt-1 flex min-h-[44px] items-center gap-1.5 rounded-md px-3 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-slate-900"
      >
        See all free tools <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
