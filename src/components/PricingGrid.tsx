import { Check } from 'lucide-react';
import { PACKAGES } from '../data/content';
import { cx, fmtUSD } from '../lib/format';
import { useSiteConfig, type PackageConfig } from '../lib/siteConfig';
import { useHireModal } from './HireModal';

export default function PricingGrid() {
  const { openHireModal } = useHireModal();
  const { config } = useSiteConfig();
  const packages: PackageConfig[] = config.pricing ?? PACKAGES;

  return (
    <div id="pricing" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6 lg:py-28">
      <p className="eyebrow mb-4">Transparent Pricing</p>
      <h2 className="h-display text-3xl sm:text-4xl">Fixed Architecture Tiers</h2>
      <p className="mt-4 max-w-2xl text-slate-400">
        One-time engineering fees. No retainers, no percentage-of-spend, no surprises.
        Every tier ships with a live project portal and an SLA-backed handover.
      </p>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {packages.map((pkg, i) => {
          const featured = pkg.highlighted ?? i === 1;
          return (
            <div
              key={pkg.id}
              className={cx(
                'relative flex flex-col rounded-lg p-6 sm:p-8',
                featured
                  ? 'border border-emerald-500/60 bg-slate-900/80 shadow-[0_0_50px_rgba(52,211,153,0.12)] backdrop-blur-xl'
                  : 'glass card-hover'
              )}
            >
              {featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-emerald-500 px-3 py-1 font-mono text-[10px] font-bold tracking-[0.2em] text-slate-950">
                  MOST DEPLOYED
                </span>
              )}
              <p className="eyebrow !text-[10px]">{pkg.id.replace(/-/g, ' ').toUpperCase()}</p>
              <h3 className="h-display mt-2 text-xl">{pkg.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{pkg.tagline}</p>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-mono text-4xl font-black tracking-tight text-slate-50">
                  {fmtUSD(pkg.price)}
                </span>
              </div>
              <p className="telemetry mt-1">{pkg.priceNote}</p>

              <ul className="mt-6 flex-1 space-y-2.5 border-t border-slate-800/80 pt-6">
                {pkg.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => openHireModal({ packageId: pkg.id })}
                className={cx('mt-8 w-full', featured ? 'btn-primary' : 'btn-ghost')}
              >
                {pkg.cta}
              </button>
            </div>
          );
        })}
      </div>

      <p className="telemetry mt-8 text-center">
        Every engagement includes the client project portal, revision management and the
        encrypted Lead Architect channel.
      </p>
    </div>
  );
}
