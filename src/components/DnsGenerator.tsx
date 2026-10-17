import { useMemo, useState } from 'react';
import { CheckCircle2, Copy, Globe, ListChecks, Server } from 'lucide-react';

const TARGET = 't.syncops-edge.run.app';

function isValidDomain(d: string): boolean {
  return /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*\.[A-Za-z]{2,}$/.test(d);
}

const STEPS = [
  { title: 'Add the record at your registrar', detail: 'Create the CNAME above in your DNS provider (Cloudflare, Route 53, GoDaddy). Proxying must stay OFF for the tagging subdomain.' },
  { title: 'Wait for propagation', detail: 'Most providers resolve within 5–30 minutes. TTL 3600 keeps the first-party cookie window stable across edge regions.' },
  { title: 'Verify with dig', detail: 'The command below must return the tagging-server target. A direct IP or parking page means the record is wrong.' },
  { title: 'Bind in the server container', detail: 'In your Stape / Cloud Run tagging server, add the custom domain and upload the TLS certificate so requests terminate at your subdomain.' },
];

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      window.setTimeout(() => setDone(false), 1600);
    } catch {
      setDone(false);
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${label}`}
      className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 font-mono text-[11px] text-slate-300 transition-colors hover:border-cyan-400/60 hover:text-cyan-300"
    >
      {done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? 'Copied' : label}
    </button>
  );
}

export default function DnsGenerator() {
  const [subdomain, setSubdomain] = useState('sgtm');
  const [domain, setDomain] = useState('');

  const trimmedDomain = domain.trim().toLowerCase();
  const trimmedSub = subdomain.trim().toLowerCase();
  const host = trimmedSub && trimmedDomain ? `${trimmedSub}.${trimmedDomain}` : trimmedDomain;
  const domainTouched = domain.length > 0;
  const valid = trimmedDomain.length > 0 && isValidDomain(trimmedDomain) && /^[a-z0-9-]{1,63}$/.test(trimmedSub);
  const error = useMemo(() => {
    if (!domainTouched) return null;
    if (!trimmedDomain) return 'Enter your store root domain, e.g. yourstore.com';
    if (!isValidDomain(trimmedDomain)) return 'That does not look like a valid domain — use the bare root, e.g. yourstore.com';
    if (!/^[a-z0-9-]{1,63}$/.test(trimmedSub)) return 'Subdomain may only contain lowercase letters, digits, and hyphens';
    return null;
  }, [domainTouched, trimmedDomain, trimmedSub]);

  const digCmd = host ? `dig CNAME ${host} +short` : 'dig CNAME sgtm.yourstore.com +short';

  return (
    <div className="glass flex h-full flex-col overflow-hidden rounded-xl">
      <div className="flex items-center gap-3 border-b border-slate-800/70 px-5 py-4">
        <Globe className="h-5 w-5 text-cyan-400" />
        <div>
          <h3 className="font-bold tracking-tight text-slate-50">DNS CNAME Generator</h3>
          <p className="telemetry">First-party proxy record for your tagging server</p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-dark" htmlFor="dns-sub">Subdomain</label>
            <input
              id="dns-sub"
              type="text"
              className="input-dark font-mono"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              placeholder="sgtm"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="label-dark" htmlFor="dns-domain">Root domain</label>
            <input
              id="dns-domain"
              type="text"
              className="input-dark font-mono"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="yourstore.com"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>

        {error && (
          <p className="rounded-md border border-rose-800/70 bg-rose-950/50 px-3 py-2 text-xs text-rose-300" role="alert">
            {error}
          </p>
        )}

        {valid && (
          <div className="overflow-hidden rounded-lg border border-slate-800">
            <table className="w-full text-left font-mono text-[12px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Host</th>
                  <th className="px-4 py-2.5 font-medium">Value</th>
                  <th className="px-4 py-2.5 font-medium">TTL</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-800/60 bg-slate-950/60">
                  <td className="px-4 py-3"><span className="rounded border border-cyan-700/60 bg-cyan-950/60 px-1.5 py-0.5 text-cyan-300">CNAME</span></td>
                  <td className="break-all px-4 py-3 text-slate-200">{host}</td>
                  <td className="break-all px-4 py-3 text-emerald-300">{TARGET}</td>
                  <td className="px-4 py-3 text-slate-400">3600</td>
                  <td className="px-4 py-3 text-right"><CopyButton text={host} label="Copy host" /></td>
                </tr>
                <tr className="bg-slate-950/40">
                  <td className="px-4 py-3 text-slate-500" colSpan={4}>
                    <span className="text-slate-400">Target value:</span> <span className="text-emerald-300">{TARGET}</span>
                    <span className="text-slate-600"> — SyncOps tagging-server endpoint</span>
                  </td>
                  <td className="px-4 py-3 text-right"><CopyButton text={TARGET} label="Copy value" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div>
          <p className="label-dark inline-flex items-center gap-1.5">
            <ListChecks className="h-3.5 w-3.5 text-cyan-400" /> Verification checklist
          </p>
          <ol className="space-y-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-700 bg-slate-900/70 font-mono text-[11px] text-cyan-300">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{s.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{s.detail}</p>
                  {i === 2 && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-slate-800 bg-black/60 px-3 py-2">
                      <code className="flex-1 break-all font-mono text-[11px] text-emerald-300">$ {digCmd}</code>
                      <CopyButton text={digCmd} label="Copy" />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-indigo-800/60 bg-indigo-950/40 px-3 py-2.5 text-xs leading-relaxed text-indigo-200/90">
          <Server className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-400" />
          <span>
            Once the record resolves, all measurement traffic flows through <span className="font-mono text-indigo-100">{valid ? host : 'your subdomain'}</span> — first-party, ITP-resistant, and ad-blocker invisible.
          </span>
        </div>
      </div>
    </div>
  );
}
