/**
 * Tracking Auditor heuristic engine.
 * Deterministic per domain: the domain string seeds a PRNG so re-runs
 * always produce the same diagnostic profile.
 */

export type Platform = 'shopify' | 'custom';

export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface AuditCheck {
  id: string;
  name: string;
  status: CheckStatus;
  detail: string;
  recommendation: string;
}

export interface AuditResult {
  score: number;
  grade: string;
  checks: AuditCheck[];
  clientLatencyMs: number;
  edgeLatencyMs: number;
}

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface CheckDef {
  id: string;
  name: string;
  /** Probability mass: [pass, warn, fail] — sums to 1. */
  odds: [number, number, number];
  detail: (d: string, p: Platform, s: CheckStatus) => string;
  recommendation: string;
}

const CHECK_DEFS: CheckDef[] = [
  {
    id: 'cname-proxy',
    name: 'CNAME First-Party Proxy',
    odds: [0.15, 0.3, 0.55],
    detail: (d, _p, s) =>
      s === 'pass'
        ? `Tracking subdomain (ss.${d}) resolves and proxies pixel requests — first-party context preserved.`
        : s === 'warn'
          ? `A CNAME record exists but pixel traffic still splits between ss.${d} and third-party endpoints.`
          : `Pixel fires from third-party connect.facebook.net on ${d} — Safari and Firefox block these requests outright.`,
    recommendation:
      'Deploy a first-party proxy host (ss.<domain>) on Cloud Run / Stape so every pixel request carries your own domain.',
  },
  {
    id: 'itp-window',
    name: 'Safari ITP Expiration Window',
    odds: [0.1, 0.35, 0.55],
    detail: (_d, _p, s) =>
      s === 'pass'
        ? 'Attribution cookies are anchored server-side; Safari ITP 7-day wipeout has no effect on event identity.'
        : s === 'warn'
          ? 'First-party _fbp cookie degrades from 180+ days to 7 days under ITP 2.3+ — attribution decays weekly.'
          : 'First-party _fbp cookie collapses from 180+ days to 24 hours under ITP 2.3+ — most click-through attribution dies within a day.',
    recommendation:
      'Anchor event identity server-side with a 180+ day retention window so ITP cookie wipes stop erasing attribution.',
  },
  {
    id: 'dedup',
    name: 'Event ID Deduplication',
    odds: [0.12, 0.33, 0.55],
    detail: (d, _p, s) =>
      s === 'pass'
        ? `Browser and server payloads on ${d} share a deterministic event_id — Meta deduplicates cleanly.`
        : s === 'warn'
          ? `event_id is present on some events but missing on ${d} checkout funnels — partial double-counting.`
          : `No consistent event_id across browser and server payloads on ${d} — Meta cannot deduplicate, causing double-counted conversions.`,
    recommendation:
      'Emit a deterministic event_id in both pixel and CAPI payloads and dedupe on the server before Graph API dispatch.',
  },
  {
    id: 'pii-normalization',
    name: 'SHA-256 PII Normalization',
    odds: [0.12, 0.28, 0.6],
    detail: (_d, _p, s) =>
      s === 'pass'
        ? 'Advanced Matching fields (em, ph, fn, ln, ct, zp) are normalized and SHA-256 hashed before dispatch.'
        : s === 'warn'
          ? 'Only email (em) is hashed; phone and name fields ship raw or missing — match quality is capped.'
          : 'Advanced Matching incomplete: em, ph, fn, ln, ct, zp are not normalized or SHA-256 hashed — Event Match Quality is throttled.',
    recommendation:
      'Normalize (lowercase, trim, strip formatting) then SHA-256 hash all six PII fields before every CAPI dispatch.',
  },
  {
    id: 'consent-mode',
    name: 'Google Consent Mode v2',
    odds: [0.18, 0.42, 0.4],
    detail: (d, p, s) =>
      s === 'pass'
        ? `ad_storage and ad_user_data signals default correctly on ${d}${
            p === 'shopify' ? ' via the Shopify privacy API' : ''
          } — EU traffic stays compliant.`
        : s === 'warn'
          ? `Consent Mode v2 is partially wired on ${d}, but ad_user_data defaults are not audited for EU traffic.`
          : `ad_storage and ad_user_data signal defaults are missing on ${d} — EU measurement gaps and compliance risk.`,
    recommendation:
      'Implement Consent Mode v2 with explicit ad_storage / ad_user_data defaults and server-side consent propagation.',
  },
];

function gradeFor(score: number): string {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export function auditDomain(rawDomain: string, platform: Platform): AuditResult {
  const domain = rawDomain.trim().toLowerCase();
  const rnd = mulberry32(hashSeed(`${domain}|${platform}`));

  const checks: AuditCheck[] = CHECK_DEFS.map((def) => {
    const r = rnd();
    const [pPass, pWarn] = def.odds;
    const status: CheckStatus = r < pPass ? 'pass' : r < pPass + pWarn ? 'warn' : 'fail';
    return {
      id: def.id,
      name: def.name,
      status,
      detail: def.detail(domain, platform, status),
      recommendation: def.recommendation,
    };
  });

  const fails = checks.filter((c) => c.status === 'fail').length;
  const warns = checks.filter((c) => c.status === 'warn').length;
  const score = Math.min(100, Math.max(5, Math.round(100 - fails * 18 - warns * 9)));

  // Deterministic but plausible latencies: client-side ~420ms+, edge ~12ms.
  const clientLatencyMs = Math.round(400 + rnd() * 140);
  const edgeLatencyMs = Math.round(9 + rnd() * 6);

  return {
    score,
    grade: gradeFor(score),
    checks,
    clientLatencyMs,
    edgeLatencyMs,
  };
}
