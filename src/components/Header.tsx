import { useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { cx } from '../lib/format';

const JUMPS = [
  { label: 'Auditor', to: '#auditor' },
  { label: 'Calculator', to: '#calculator' },
  { label: 'Pipeline', to: '#pipeline' },
  { label: 'Case Studies', to: '#cases' },
  { label: 'Pricing', to: '#pricing' },
];

/** Anchor jump that works from any route: scrolls in place on `/`,
 *  otherwise navigates home first, then scrolls. */
function JumpLink({
  to,
  className,
  onNavigate,
  children,
}: {
  to: string;
  className?: string;
  onNavigate?: () => void;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onNavigate?.();
    if (pathname !== '/') {
      navigate(`/${to}`);
      let tries = 0;
      const t = window.setInterval(() => {
        const el = document.querySelector(to);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          window.clearInterval(t);
        }
        tries += 1;
        if (tries > 40) window.clearInterval(t);
      }, 100);
    } else {
      document.querySelector(to)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <a href={to} onClick={handle} className={className}>
      {children}
    </a>
  );
}

function LogoMark() {
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true">
      <rect x="1.5" y="1.5" width="37" height="37" rx="9" className="fill-slate-900" stroke="#334155" strokeWidth="1.5" />
      <path
        d="M6 22h6l3-8 4 14 3-10 2 4h10"
        fill="none"
        stroke="#34d399"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const navLinkCls =
    'text-[13px] font-medium text-slate-400 transition-colors hover:text-slate-100';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" aria-label="SyncOps Studio home">
          <LogoMark />
          <span className="text-[15px] font-black tracking-tight text-slate-50">
            SyncOps <span className="text-emerald-400">Studio</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          {JUMPS.map((j) => (
            <JumpLink key={j.to} to={j.to} className={navLinkCls}>
              {j.label}
            </JumpLink>
          ))}
          <Link to="/labs" className={navLinkCls}>
            Labs
          </Link>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/status"
            className="flex items-center gap-2 rounded-md border border-slate-800/80 bg-slate-900/60 px-3 py-1.5 transition-colors hover:border-emerald-700/60"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot" />
            <span className="font-mono text-[10px] tracking-[0.14em] text-emerald-300 hidden xl:inline">
              ALL SYSTEMS OPERATIONAL
            </span>
            <span className="font-mono text-[10px] tracking-[0.14em] text-emerald-300 xl:hidden">
              LIVE
            </span>
          </Link>
          <JumpLink
            to="#auditor"
            className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-[13px] font-bold text-slate-950 transition-all hover:bg-emerald-400 hover:shadow-[0_0_24px_rgba(52,211,153,0.35)]"
          >
            Audit My Tracking
          </JumpLink>
          <Link
            to="/client/login"
            className="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-900/60 px-4 py-2 text-[13px] font-semibold text-slate-200 transition-all hover:border-slate-500 hover:bg-slate-800/70"
          >
            Client Portal
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-800 text-slate-300 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-xl lg:hidden">
          <nav className="space-y-1 px-4 py-4" aria-label="Mobile">
            {JUMPS.map((j) => (
              <JumpLink
                key={j.to}
                to={j.to}
                onNavigate={close}
                className="block rounded-md px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-white"
              >
                {j.label}
              </JumpLink>
            ))}
            <Link
              to="/labs"
              onClick={close}
              className="block rounded-md px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-white"
            >
              Labs
            </Link>
            <Link
              to="/status"
              onClick={close}
              className={cx(
                'flex items-center gap-2 rounded-md px-3 py-2.5 font-mono text-xs tracking-[0.14em] text-emerald-300',
                'hover:bg-slate-900'
              )}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot" />
              ALL SYSTEMS OPERATIONAL
            </Link>
            <div className="flex gap-2 pt-2">
              <JumpLink
                to="#auditor"
                onNavigate={close}
                className="flex-1 rounded-md bg-emerald-500 px-4 py-2.5 text-center text-sm font-bold text-slate-950"
              >
                Audit My Tracking
              </JumpLink>
              <Link
                to="/client/login"
                onClick={close}
                className="flex-1 rounded-md border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-center text-sm font-semibold text-slate-200"
              >
                Client Portal
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
