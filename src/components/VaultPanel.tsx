import { useState } from 'react';
import {
  Download,
  FileJson,
  FileText,
  ScrollText,
  Eye,
  EyeOff,
  Copy,
  Check,
  Lock,
  Info,
} from 'lucide-react';
import type { Order } from '../lib/portal';
import { demoHex, cx } from '../lib/format';

function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildContainerJson(order: Order): string {
  const tag = (name: string, type: string, params: Record<string, string>) => ({
    name,
    type,
    firingTriggerId: ['2147479553'],
    parameter: Object.entries(params).map(([k, v]) => ({ key: k, type: 'template', value: v })),
  });
  const doc = {
    exportFormatVersion: 2,
    exportTime: new Date().toISOString(),
    containerVersion: {
      accountId: demoHex(order.id + 'acct', 10),
      containerId: `GTM-${demoHex(order.id + 'ctn', 6).toUpperCase()}`,
      name: `SyncOps Server — ${order.brandUrl}`,
      description: `Server-side tagging container provisioned by SyncOps Studio. Order ${order.id}.`,
      serverContainerUrl: `https://sgtm.${order.brandUrl}`,
      tag: [
        tag('Meta CAPI — Server', 'meta_capi_server', {
          datasetId: demoHex(order.id + 'ds', 16),
          accessToken: '*** see Credentials Vault ***',
          eventId: '{{event_id}}',
        }),
        tag('GA4 Measurement Protocol — Server', 'ga4_mp_server', {
          measurementId: `G-${demoHex(order.id + 'ga', 8).toUpperCase()}`,
          apiSecret: '*** see Credentials Vault ***',
        }),
        tag('TikTok Events API — Server', 'tiktok_events_server', {
          pixelId: demoHex(order.id + 'tt', 16),
          accessToken: '*** see Credentials Vault ***',
        }),
      ],
      variable: [
        { name: 'event_id', type: 'event_id', parameter: [] },
        { name: 'user_data.em', type: 'sha256_normalized', parameter: [{ key: 'field', value: 'email' }] },
        { name: 'user_data.ph', type: 'sha256_normalized', parameter: [{ key: 'field', value: 'phone' }] },
      ],
      trigger: [
        { name: 'All Server Events', type: 'custom', customEventFilter: [] },
      ],
    },
  };
  return JSON.stringify(doc, null, 2);
}

function buildDnsGuide(order: Order): string {
  const b = order.brandUrl;
  return [
    '; ============================================================',
    ';  SyncOps Studio — Server-side tagging DNS records',
    `;  Brand : ${b}`,
    `;  Order : ${order.id}`,
    `;  Date  : ${new Date().toISOString()}`,
    '; ============================================================',
    ';',
    '; Add these records at your DNS provider (Cloudflare recommended).',
    '; Allow up to 24h for full propagation, then ping your architect.',
    ';',
    '; 1) First-party tagging subdomain — CNAME cloaking for server GTM',
    `sgtm.${b}.        300  IN  CNAME  edge.syncops.global.`,
    ';',
    '; 2) Fallback server endpoint (active only during migration windows)',
    `ss.${b}.          300  IN  CNAME  ghs.googlehosted.com.`,
    ';',
    '; 3) Domain ownership verification (SyncOps will request this value)',
    `_syncops.${b}.    300  IN  TXT   "syncops-site-verification=${demoHex(order.id + 'ver', 32)}"`,
    ';',
    '; 4) SPF-safe sender record for server-side order notifications',
    `@.${b}.           300  IN  TXT   "v=spf1 include:_spf.syncops.global ~all"`,
    '; ============================================================',
  ].join('\n');
}

function buildTestLog(order: Order): string {
  const events = [
    ['PageView', '9.4'],
    ['ViewContent', '9.1'],
    ['AddToCart', '9.6'],
    ['InitiateCheckout', '9.3'],
    ['Purchase', '9.8'],
  ];
  const lines = [
    `# SyncOps Studio — SHA-256 Event Test Log`,
    `# Order: ${order.id}   Brand: ${order.brandUrl}`,
    `# Generated: ${new Date().toISOString()}`,
    `#`,
    `# ts | event | event_id | em(sha256) | match_quality | dedup`,
  ];
  const base = Date.now() - 6 * 3_600_000;
  events.forEach(([event, emq], i) => {
    const ts = new Date(base + i * 41_000).toISOString();
    lines.push(
      `${ts}  event=${event.padEnd(16)} event_id=evt_${demoHex(order.id + event, 12)} ` +
        `em=${demoHex(order.id + event + 'em', 64).slice(0, 16)}… ` +
        `match_quality=${emq} dedup=OK`,
    );
  });
  lines.push('# RESULT: 5/5 events deduplicated browser↔server — EMQ 9.0+ PASS');
  return lines.join('\n');
}

interface Credential {
  key: string;
  label: string;
  value: string;
}

export default function VaultPanel({ order }: { order: Order }) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const credentials: Credential[] = [
    { key: 'url', label: 'Tagging Server URL', value: `https://sgtm.${order.brandUrl}` },
    { key: 'apikey', label: 'Container API Key', value: `sk_live_${demoHex(order.id + 'key', 32)}` },
    { key: 'capi', label: 'CAPI Access Token', value: `CAA${demoHex(order.id + 'token', 40)}` },
  ];

  const files = [
    {
      name: `syncops-gtm-server-${order.id}.json`,
      label: 'GTM Server Container',
      desc: 'Import-ready server container JSON with CAPI, GA4 MP and TikTok tags.',
      icon: FileJson,
      tone: 'text-cyan-400',
      build: () => buildContainerJson(order),
      mime: 'application/json',
    },
    {
      name: `syncops-dns-${order.id}.txt`,
      label: 'DNS Records Guide',
      desc: `CNAME cutover rows for ${order.brandUrl}, ready to paste at your DNS provider.`,
      icon: FileText,
      tone: 'text-indigo-400',
      build: () => buildDnsGuide(order),
      mime: 'text/plain',
    },
    {
      name: `syncops-event-test-${order.id}.log`,
      label: 'SHA-256 Event Test Log',
      desc: 'Latest deduplication run — event IDs, hashed PII fields, EMQ scores.',
      icon: ScrollText,
      tone: 'text-emerald-400',
      build: () => buildTestLog(order),
      mime: 'text/plain',
    },
  ];

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* clipboard unavailable */
    }
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
  };

  return (
    <div className="space-y-6">
      {/* deliverables */}
      <div className="glass rounded-xl p-6">
        <p className="eyebrow mb-1">deliverables</p>
        <h3 className="h-display text-lg">Build Artifacts</h3>
        <div className="mt-4 space-y-2.5">
          {files.map((f) => (
            <div
              key={f.name}
              className="flex items-center gap-4 rounded-lg border border-slate-800/80 bg-slate-950/60 px-4 py-3.5"
            >
              <f.icon className={cx('h-6 w-6 shrink-0', f.tone)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-100">{f.label}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{f.desc}</p>
              </div>
              <button
                onClick={() => downloadFile(f.name, f.build(), f.mime)}
                className="btn-ghost shrink-0 px-3.5 py-2 text-xs"
                aria-label={`Download ${f.label}`}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* credentials */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-emerald-400" />
          <h3 className="h-display text-lg">Credentials</h3>
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-800/80">
          {credentials.map((c, i) => {
            const show = revealed[c.key];
            return (
              <div
                key={c.key}
                className={cx(
                  'flex items-center gap-3 px-4 py-3.5',
                  i > 0 && 'border-t border-slate-800/60',
                  'bg-slate-950/60',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="label-dark mb-0.5">{c.label}</p>
                  <p className="truncate font-mono text-sm text-slate-100">
                    {show ? c.value : '••••••••••••••••••••'}
                  </p>
                </div>
                <button
                  onClick={() => setRevealed((r) => ({ ...r, [c.key]: !r[c.key] }))}
                  className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
                  aria-label={show ? `Hide ${c.label}` : `Reveal ${c.label}`}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => void copy(c.key, c.value)}
                  className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
                  aria-label={`Copy ${c.label}`}
                >
                  {copied === c.key ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-md border border-slate-800/80 bg-slate-950/60 px-3 py-2.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
          <p className="text-xs leading-relaxed text-slate-400">
            Rotate credentials from the Architect channel — never share these values over email or
            in public repos.
          </p>
        </div>
      </div>
    </div>
  );
}
