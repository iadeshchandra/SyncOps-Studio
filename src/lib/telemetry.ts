import { demoHex } from './format';

export interface TelemetryNode {
  id: string;
  name: string;
  subsystem: string;
  description: string;
  metricLabel: string;
  metricValue: string;
  status: 'operational' | 'degraded';
  latencyMs: number;
  uptimePct: number;
}

export const NODES: TelemetryNode[] = [
  {
    id: 'capi-gateway',
    name: 'Global CAPI Gateway',
    subsystem: 'meta-graph-api-v21',
    description:
      'Meta Graph API v21.0 deduplication & event queuing cluster. Every browser pixel event is matched against its server twin by event_id before dispatch.',
    metricLabel: 'Events dispatched / min',
    metricValue: '48.2K',
    status: 'operational',
    latencyMs: 12,
    uptimePct: 99.99,
  },
  {
    id: 'auth-subsystem',
    name: 'Authentication Subsystem',
    subsystem: 'zero-trust-identity',
    description:
      'Zero-trust token guard & Google Identity. Short-lived session tokens, per-project RBAC scopes, and automatic credential rotation on the client portal.',
    metricLabel: 'Auth checks / min',
    metricValue: '9.6K',
    status: 'operational',
    latencyMs: 8,
    uptimePct: 99.99,
  },
  {
    id: 'db-routing',
    name: 'Database Routing Engine',
    subsystem: 'firestore-realtime',
    description:
      'Firestore real-time state machine. Orders, milestone timers, chat messages, and revision requests stream to every connected dashboard in milliseconds.',
    metricLabel: 'Snapshot syncs / min',
    metricValue: '21.4K',
    status: 'operational',
    latencyMs: 18,
    uptimePct: 99.99,
  },
  {
    id: 'client-dashboards',
    name: 'Client Dashboards & Telemetry',
    subsystem: 'edge-rendered-ui',
    description:
      'Edge-rendered milestone timers and project telemetry for active studio clients. Static-first shells hydrate live Firestore subscriptions on demand.',
    metricLabel: 'Active portal sessions',
    metricValue: '342',
    status: 'operational',
    latencyMs: 26,
    uptimePct: 99.97,
  },
  {
    id: 'ga4-mp',
    name: 'GA4 Measurement Protocol Node',
    subsystem: 'ga4-server-validation',
    description:
      'Server-side e-commerce validation via GA4 Measurement Protocol. Staging payloads are schema-checked against Google’s endpoint before any production send.',
    metricLabel: 'Validations / min',
    metricValue: '7.8K',
    status: 'operational',
    latencyMs: 34,
    uptimePct: 99.99,
  },
  {
    id: 'tt-pin-relay',
    name: 'TikTok & Pinterest CAPI Relay',
    subsystem: 'sha256-pii-normalizer',
    description:
      'TikTok Events API and Pinterest Conversions API relay with SHA-256 PII normalizer. Emails, phones, and addresses are hashed at the edge — never raw.',
    metricLabel: 'Hashed dispatches / min',
    metricValue: '13.1K',
    status: 'operational',
    latencyMs: 40,
    uptimePct: 99.99,
  },
];

/** Named services referenced by stdout log lines for flavor variety. */
export const SERVICE_NAMES = [
  'capi-gateway',
  'auth-guard',
  'db-router',
  'portal-edge',
  'ga4-mp',
  'tt-pin-relay',
  'dedup-worker',
  'emq-scorer',
] as const;

/** Realistic CAPI event names seen in the stream. */
const EVENT_NAMES = ['Purchase', 'Lead', 'AddToCart', 'InitiateCheckout', 'ViewContent'];

/**
 * Deterministic-enough realistic stdout line for the streaming terminal.
 * Cycles through dispatch logs, queue depth, EMQ scores, TLS handshakes,
 * Firestore snapshot syncs, and heartbeats based on the sequence number.
 */
export function nextLogLine(seq: number): string {
  const ts = new Date().toISOString().slice(11, 19);
  const svc = SERVICE_NAMES[seq % SERVICE_NAMES.length];
  const kind = seq % 7;

  switch (kind) {
    case 0: {
      const ev = EVENT_NAMES[seq % EVENT_NAMES.length];
      const eid = demoHex(`eid-${seq}`, 16);
      const dedup = demoHex(`dedup-${seq}`, 8);
      const ms = 8 + (seq % 24);
      return `${ts} [capi] dispatch event=${ev} event_id=${eid} dedup_key=${dedup} status=200 ok in ${ms}ms`;
    }
    case 1: {
      const depth = 40 + ((seq * 37) % 320);
      return `${ts} [queue] ${svc} depth=${depth} events drained=${depth} latency_p50=${8 + (seq % 20)}ms`;
    }
    case 2: {
      const emq = (9.0 + ((seq * 13) % 9) / 10).toFixed(1);
      return `${ts} [emq] ${svc} score=${emq}/10.0 match_rate=${94 + (seq % 5)}% window=7d success`;
    }
    case 3: {
      const region = ['iad', 'lhr', 'sin', 'bom', 'fra'][seq % 5];
      return `${ts} [tls] ${svc} handshake complete cipher=TLS_AES_256_GCM region=${region} rtt=${11 + (seq % 30)}ms`;
    }
    case 4: {
      const docs = 12 + ((seq * 7) % 140);
      return `${ts} [firestore] ${svc} snapshot sync docs=${docs} listeners=active ok in ${6 + (seq % 18)}ms`;
    }
    case 5: {
      const up = 99.97 + ((seq * 3) % 3) / 100;
      return `${ts} [health] ${svc} heartbeat status=operational uptime=${up.toFixed(2)}% mem=${38 + (seq % 22)}%`;
    }
    default: {
      const sha = demoHex(`sha-${seq}`, 12);
      return `${ts} [pii] ${svc} normalized em+ph hash=${sha}… raw_discarded=true ok`;
    }
  }
}
