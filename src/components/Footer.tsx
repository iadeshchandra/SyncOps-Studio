import type { MouseEvent, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

function JumpLink({ to, children }: { to: string; children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
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
    <a
      href={to}
      onClick={handle}
      className="block py-1 text-sm text-slate-400 transition-colors hover:text-slate-100"
    >
      {children}
    </a>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-black/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="eyebrow mb-4">Studio</p>
          <JumpLink to="#pipeline">How we work</JumpLink>
          <JumpLink to="#cases">Case studies</JumpLink>
          <JumpLink to="#pricing">Pricing</JumpLink>
          <Link to="/status" className="block py-1 text-sm text-slate-400 transition-colors hover:text-slate-100">
            Live status
          </Link>
          <Link to="/labs" className="block py-1 text-sm text-slate-400 transition-colors hover:text-slate-100">
            SyncOps Labs
          </Link>
        </div>

        <div>
          <p className="eyebrow mb-4">Services</p>
          <JumpLink to="#pricing">Single CAPI Node</JumpLink>
          <JumpLink to="#pricing">Omnichannel Server Stack</JumpLink>
          <JumpLink to="#pricing">Enterprise Cloud Run</JumpLink>
          <JumpLink to="#auditor">Tracking audit</JumpLink>
          <JumpLink to="#calculator">ROAS hemorrhage calculator</JumpLink>
        </div>

        <div>
          <p className="eyebrow mb-4">Resources</p>
          <Link to="/labs" className="block py-1 text-sm text-slate-400 transition-colors hover:text-slate-100">
            Payload builder
          </Link>
          <Link to="/labs" className="block py-1 text-sm text-slate-400 transition-colors hover:text-slate-100">
            CNAME record generator
          </Link>
          <Link to="/client/login" className="block py-1 text-sm text-slate-400 transition-colors hover:text-slate-100">
            Client login
          </Link>
          <Link to="/login" className="block py-1 text-sm text-slate-400 transition-colors hover:text-slate-100">
            Studio login
          </Link>
        </div>

        <div>
          <p className="eyebrow mb-4">Contact</p>
          <div className="space-y-2 font-mono text-xs text-slate-400">
            <p>
              <span className="text-slate-600">email&nbsp;&nbsp;&nbsp;</span>hello@syncops.studio
            </p>
            <p>
              <span className="text-slate-600">response&nbsp;</span>≤ 4h business SLA
            </p>
            <p>
              <span className="text-slate-600">uptime&nbsp;&nbsp;&nbsp;</span>
              <span className="text-emerald-400">99.99%</span>
            </p>
            <p>
              <span className="text-slate-600">edge&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
              <span className="text-cyan-300">12ms</span> p50 dispatch
            </p>
          </div>
          <Link
            to="/status"
            className="mt-5 inline-flex items-center gap-2 rounded-md border border-emerald-800/60 bg-emerald-950/60 px-3 py-2 font-mono text-[11px] tracking-[0.12em] text-emerald-300 transition-colors hover:border-emerald-600"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot" />
            99.99% UPTIME · LIVE TELEMETRY
          </Link>
        </div>
      </div>

      <div className="border-t border-slate-800/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 sm:flex-row sm:px-6">
          <p className="text-xs text-slate-500">© 2026 SyncOps Studio. All rights reserved.</p>
          <p className="font-mono text-[11px] tracking-[0.18em] text-slate-600">
            BUILT FOR SIGNAL FIDELITY
          </p>
        </div>
      </div>
    </footer>
  );
}
