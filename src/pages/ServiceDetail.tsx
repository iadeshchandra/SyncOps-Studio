import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, Satellite, Radar, AppWindow, Bot } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { usePageMeta } from '../lib/meta';
import { useServiceLines } from '../lib/siteConfig';
import { useHireModal } from '../components/HireModal';

const ICONS: Record<string, LucideIcon> = { Satellite, Radar, AppWindow, Bot };

export default function ServiceDetail() {
  const { lineId } = useParams();
  const lines = useServiceLines();
  const { openHireModal } = useHireModal();
  const line = lines.find((l) => l.id === lineId);

  usePageMeta(
    line ? `${line.name} — SyncOps Studio` : 'Services — SyncOps Studio',
    line?.description ?? 'Fixed-scope, fixed-price service packages from SyncOps Studio.',
  );

  if (!line) return <Navigate to="/" replace />;
  const Icon = ICONS[line.icon] ?? Satellite;
  const others = lines.filter((l) => l.id !== line.id);

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6">
        <p className="eyebrow">services / {line.id}</p>
        <div className="mt-3 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950">
            <Icon className="h-7 w-7 text-cyan-300" />
          </div>
          <div>
            <h1 className="h-display text-3xl sm:text-4xl">{line.name}</h1>
            <p className="mt-1 text-lg text-slate-300">{line.tagline}</p>
          </div>
        </div>
        <p className="mt-5 max-w-3xl leading-relaxed text-slate-400">{line.description}</p>

        {line.proof && (
          <p className="mt-4 text-sm text-slate-400">
            <span className="font-semibold text-slate-200">{line.proof.text}</span>{' '}
            <a
              href={line.proof.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
            >
              {line.proof.urlLabel}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </p>
        )}
        {line.migrationNote && (
          <p className="mt-3 max-w-3xl rounded-lg border border-slate-800/80 bg-slate-900/40 px-4 py-3 text-sm leading-relaxed text-slate-300">
            {line.migrationNote}
          </p>
        )}

        <h2 className="h-display mt-12 text-2xl text-slate-100">Packages</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Fixed scope, fixed price. Pick the package that fits, or start with the free
          tracking audit and we will tell you honestly which one you need — including if
          the answer is none.
        </p>
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {line.packages.map((pkg) => (
            <div key={pkg.id} className="glass card-hover flex flex-col rounded-lg p-6">
              <h3 className="font-bold text-slate-50">{pkg.name}</h3>
              <p className="mt-2 font-mono text-3xl font-black text-slate-50">{pkg.price}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{pkg.blurb}</p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {pkg.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm leading-relaxed text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => openHireModal({ packageId: pkg.id })}
                className="mt-6 inline-flex items-center justify-center gap-1.5 rounded-md bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-300"
              >
                Start with {pkg.name}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="text-slate-500">Before you decide:</span>
          <Link to="/process" className="font-semibold text-cyan-300 transition-colors hover:text-cyan-200">
            How we work
          </Link>
          <Link to="/faq" className="font-semibold text-cyan-300 transition-colors hover:text-cyan-200">
            Questions, answered
          </Link>
          <Link to="/case-studies" className="font-semibold text-cyan-300 transition-colors hover:text-cyan-200">
            Proof from real engagements
          </Link>
        </div>

        {others.length > 0 && (
          <div className="mt-10 border-t border-slate-800/80 pt-8">
            <p className="eyebrow mb-4">Other service lines</p>
            <div className="flex flex-wrap gap-3">
              {others.map((o) => (
                <Link
                  key={o.id}
                  to={`/services/${o.id}`}
                  className="rounded-md border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:text-white"
                >
                  {o.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
