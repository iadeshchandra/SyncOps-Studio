import { useEffect, useRef, useState } from 'react';
import { TriangleAlert, TrendingUp, ArrowRight } from 'lucide-react';
import { calcRoas } from '../lib/roas';
import { fmtCompactUSD, fmtUSD } from '../lib/format';
import { useHireModal } from './HireModal';

/** Smoothly tweens toward `target` whenever it changes. */
function useAnimatedNumber(target: number, duration = 450): number {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = displayRef.current;
    if (from === target) {
      setDisplay(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (target - from) * eased;
      displayRef.current = v;
      setDisplay(v);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

export default function RoasCalculator() {
  const [spend, setSpend] = useState(120000);
  const [roas, setRoas] = useState(2.8);
  const { openHireModal } = useHireModal();

  const r = calcRoas({ spend, roas });
  const hiddenMonthly = useAnimatedNumber(r.hiddenRevenue);
  const annualized = useAnimatedNumber(r.annualizedHemorrhage);
  const recoverable = useAnimatedNumber(r.recoverableRevenue);

  return (
    <div id="calculator" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6 lg:py-28">
      <p className="eyebrow mb-4">Revenue Diagnostic</p>
      <h2 className="h-display text-3xl sm:text-4xl">The ROAS Hemorrhage Calculator</h2>
      <p className="mt-4 max-w-2xl text-slate-400">
        Your dashboard ROAS is computed on the events your pixel survives to see. Drag the
        sliders to expose what signal loss is quietly costing you every month.
      </p>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {/* Inputs */}
        <div className="glass rounded-lg p-6 sm:p-8">
          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <label htmlFor="spend" className="label-dark !mb-0">
                Monthly paid media spend
              </label>
              <span className="font-mono text-sm font-bold text-emerald-300">{fmtUSD(spend)}</span>
            </div>
            <input
              id="spend"
              type="range"
              min={10000}
              max={500000}
              step={5000}
              value={spend}
              onChange={(e) => setSpend(Number(e.target.value))}
              className="slider-dark"
              aria-label="Monthly paid media spend"
            />
            <div className="mt-1.5 flex justify-between font-mono text-[10px] text-slate-600">
              <span>$10K</span>
              <span>$500K</span>
            </div>
          </div>

          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <label htmlFor="roas-input" className="label-dark !mb-0">
                Reported blended ROAS
              </label>
              <span className="font-mono text-sm font-bold text-emerald-300">{roas.toFixed(1)}x</span>
            </div>
            <input
              id="roas-input"
              type="range"
              min={1}
              max={5}
              step={0.1}
              value={roas}
              onChange={(e) => setRoas(Number(e.target.value))}
              className="slider-dark"
              aria-label="Reported blended ROAS"
            />
            <div className="mt-1.5 flex justify-between font-mono text-[10px] text-slate-600">
              <span>1.0x</span>
              <span>5.0x</span>
            </div>
          </div>

          <div className="space-y-2.5 border-t border-slate-800/80 pt-5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Attributed monthly revenue</span>
              <span className="font-mono text-slate-200">{fmtUSD(r.attributedRevenue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Signal loss coefficient</span>
              <span className="font-mono text-rose-400">
                {(r.signalLossCoeff * 100).toFixed(0)}% · ITP / blockers / relay
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">True unrestricted monthly revenue</span>
              <span className="font-mono font-bold text-slate-100">{fmtUSD(r.trueRevenue)}</span>
            </div>
          </div>
        </div>

        {/* Outputs */}
        <div className="flex flex-col gap-6">
          <div className="rounded-lg border border-rose-800/80 bg-rose-950/80 p-6 shadow-[0_0_40px_rgba(244,63,94,0.12)] sm:p-8">
            <div className="flex items-center gap-2.5">
              <TriangleAlert className="h-5 w-5 text-rose-400" />
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-rose-300">
                Signal hemorrhage
              </p>
            </div>
            <p className="mt-4 font-mono text-4xl font-black tracking-tight text-rose-300 sm:text-5xl">
              {fmtCompactUSD(hiddenMonthly)}
              <span className="text-lg font-bold text-rose-400/70">/mo</span>
            </p>
            <p className="mt-2 font-mono text-sm text-rose-200/80">
              {fmtUSD(annualized)} bleeding away every year — invisible to your dashboard.
            </p>
          </div>

          <div className="rounded-lg border border-emerald-700/80 bg-emerald-950/80 p-6 shadow-[0_0_40px_rgba(52,211,153,0.12)] sm:p-8">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-emerald-300">
                Recoverable with SyncOps CAPI
              </p>
            </div>
            <p className="mt-4 font-mono text-4xl font-black tracking-tight text-emerald-300 sm:text-5xl">
              {fmtCompactUSD(recoverable)}
              <span className="text-lg font-bold text-emerald-400/70">/mo</span>
            </p>
            <p className="mt-2 text-sm text-emerald-200/80">
              90% capture rate at 9.0+ Event Match Quality — recovered, deduplicated, dispatched.
            </p>
          </div>

          <button
            type="button"
            className="btn-primary w-full"
            onClick={() =>
              openHireModal({ adSpend: spend, roas, recovery: r.recoverableRevenue })
            }
          >
            Recover My Revenue <ArrowRight className="h-4 w-4" />
          </button>
          <p className="telemetry text-center">
            Prefills your intake with these exact figures — no re-typing.
          </p>
        </div>
      </div>
    </div>
  );
}
