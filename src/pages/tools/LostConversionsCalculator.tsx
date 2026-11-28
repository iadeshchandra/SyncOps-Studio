import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ToolCta from '../../components/ToolCta';
import { useConfigPageMeta } from '../../lib/meta';
import { trackEvent } from '../../lib/measurement';
import { PLATFORM_PRESETS, RECOVERY_BAND } from '../../data/tools';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const num = (n: number) => Math.round(n).toLocaleString('en-US');

export default function LostConversionsCalculator() {
  useConfigPageMeta('toolLostConversions');

  const [platformId, setPlatformId] = useState('meta');
  const [orders, setOrders] = useState('1000');
  const [aov, setAov] = useState('60');
  const [adSpend, setAdSpend] = useState('');
  const [missedPct, setMissedPct] = useState(25);
  const started = useRef(false);
  const completed = useRef(false);

  const preset = PLATFORM_PRESETS.find((p) => p.id === platformId) ?? PLATFORM_PRESETS[0];

  const markStarted = () => {
    if (!started.current) {
      started.current = true;
      trackEvent('tool_started', { tool: 'lost-conversions-calculator' });
    }
  };

  const pickPlatform = (id: string) => {
    markStarted();
    setPlatformId(id);
    const p = PLATFORM_PRESETS.find((x) => x.id === id);
    if (p) setMissedPct(Math.round(p.missedShare * 100));
  };

  const r = useMemo(() => {
    const o = Math.max(0, Number(orders) || 0);
    const a = Math.max(0, Number(aov) || 0);
    const spend = Math.max(0, Number(adSpend) || 0);
    const share = missedPct / 100;
    const missed = o * share;
    const recLow = missed * RECOVERY_BAND.low;
    const recHigh = missed * RECOVERY_BAND.high;
    return {
      valid: o > 0 && a > 0,
      missed,
      recLow,
      recHigh,
      revLow: recLow * a,
      revHigh: recHigh * a,
      blindSpend: spend > 0 ? spend * share : null,
    };
  }, [orders, aov, adSpend, missedPct]);

  useEffect(() => {
    if (r.valid && !completed.current) {
      completed.current = true;
      trackEvent('tool_completed', { tool: 'lost-conversions-calculator' });
    }
  }, [r.valid]);

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6">
        <p className="eyebrow">
          <Link to="/tools" className="hover:text-cyan-300">free studio tools</Link> · calculator
        </p>
        <h1 className="h-display mt-2 text-3xl sm:text-4xl">How many conversions are your ads not seeing?</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-slate-400">
          Safari and Firefox tracking prevention, ad blockers and consent refusals mean a share
          of your real orders never reaches Meta, Google or TikTok — so their algorithms
          optimise against a partial picture. This calculator estimates that invisible share
          and what server-side tracking could recover. It is an estimate with its formula
          printed below, not a measurement.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-5">
          <div className="glass rounded-xl p-6 lg:col-span-2">
            <h2 className="h-display text-lg">Your numbers</h2>

            <label htmlFor="lc-platform" className="label-dark mt-5 block">Main ad platform</label>
            <select
              id="lc-platform"
              className="input-dark"
              value={platformId}
              onChange={(e) => pickPlatform(e.target.value)}
            >
              {PLATFORM_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{preset.note}</p>

            <label htmlFor="lc-orders" className="label-dark mt-5 block">Orders per month</label>
            <input
              id="lc-orders" type="number" min="0" className="input-dark" value={orders}
              onChange={(e) => { markStarted(); setOrders(e.target.value); }}
            />

            <label htmlFor="lc-aov" className="label-dark mt-5 block">Average order value (USD)</label>
            <input
              id="lc-aov" type="number" min="0" className="input-dark" value={aov}
              onChange={(e) => { markStarted(); setAov(e.target.value); }}
            />

            <label htmlFor="lc-spend" className="label-dark mt-5 block">Monthly ad spend (USD, optional)</label>
            <input
              id="lc-spend" type="number" min="0" className="input-dark" value={adSpend}
              placeholder="e.g. 5000"
              onChange={(e) => { markStarted(); setAdSpend(e.target.value); }}
            />

            <label htmlFor="lc-missed" className="label-dark mt-6 block">
              Conversions the platform misses: <span className="text-cyan-300">{missedPct}%</span>
            </label>
            <input
              id="lc-missed" type="range" min="5" max="40" step="1" value={missedPct}
              className="w-full accent-cyan-400"
              onChange={(e) => { markStarted(); setMissedPct(Number(e.target.value)); }}
            />
            <p className="mt-1 flex justify-between text-xs text-slate-500">
              <span>5% — light loss</span><span>40% — Safari-heavy store</span>
            </p>
          </div>

          <div className="lg:col-span-3">
            <div className="glass rounded-xl p-6">
              <h2 className="h-display text-lg">The estimate</h2>
              {r.valid ? (
                <>
                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                      <p className="telemetry">invisible conversions / mo</p>
                      <p className="h-display mt-2 text-2xl text-rose-300">{num(r.missed)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                      <p className="telemetry">recoverable conversions / mo</p>
                      <p className="h-display mt-2 text-2xl text-cyan-300">{num(r.recLow)}–{num(r.recHigh)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                      <p className="telemetry">recoverable revenue / mo</p>
                      <p className="h-display mt-2 text-2xl text-emerald-300">{money(r.revLow)}–{money(r.revHigh)}</p>
                    </div>
                  </div>
                  {r.blindSpend !== null && (
                    <p className="mt-4 text-sm leading-relaxed text-slate-400">
                      At a {missedPct}% miss rate, roughly <strong className="text-slate-200">{money(r.blindSpend)}</strong> of
                      your monthly ad spend is being optimised against conversions the platform
                      cannot see — the algorithm is steering with part of the map missing.
                    </p>
                  )}
                  <p className="mt-4 text-sm leading-relaxed text-slate-400">
                    Per year, the recoverable range is <strong className="text-slate-200">{money(r.revLow * 12)}–{money(r.revHigh * 12)}</strong> —
                    against a one-time server-side build, not a subscription.
                  </p>
                </>
              ) : (
                <p className="mt-4 text-sm text-slate-400">Enter your monthly orders and average order value to see the estimate.</p>
              )}
            </div>

            <div className="glass mt-6 rounded-xl p-6">
              <h2 className="h-display text-lg">The formula — nothing hidden</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-400">
                <li>Invisible conversions = orders × missed share ({missedPct}% above; platform presets start between 15–25%).</li>
                <li>Recoverable = invisible × <strong className="text-slate-200">30–50%</strong>. Server-side tracking recovers a share of missed events — never all of them, and any tool promising 100% recovery is inventing numbers.</li>
                <li>Recoverable revenue = recoverable conversions × average order value.</li>
                <li>Your real numbers will differ: consent rates, browser mix and checkout setup all move them. A full audit measures them on your store instead of estimating.</li>
              </ul>
            </div>
          </div>
        </div>

        <ToolCta servicePath="/services/capi" serviceLabel="See CAPI Infrastructure" />
      </main>
      <Footer />
    </div>
  );
}
