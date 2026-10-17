/** Join class names, dropping falsy values. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** $1.24M / $860K style compact USD. */
export function fmtCompactUSD(n: number): string {
  if (!isFinite(n)) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/** Full USD with cents trimmed when whole. */
export function fmtUSD(n: number): string {
  if (!isFinite(n)) return '$0';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  });
}

/** 99.99% style. */
export function fmtPct(n: number, digits = 2): string {
  return `${n.toFixed(digits)}%`;
}

/** 12ms / 420ms style. */
export function fmtMs(n: number): string {
  return `${Math.round(n)}ms`;
}

/** Deterministic pseudo-random hex for demo hashes (stable per seed). */
export function demoHex(seed: string, length = 16): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let out = '';
  let x = h >>> 0;
  while (out.length < length) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    out += x.toString(16).padStart(8, '0');
  }
  return out.slice(0, length);
}

/** Clamp a number into [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
