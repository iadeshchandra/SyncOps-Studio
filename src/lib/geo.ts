import type { PayRegionId } from './payments';

/**
 * Payment-region detection — the Sanatani Bandhan order, adapted:
 *   1. The client's own manual choice (portal region tabs) — always wins.
 *   2. A 24-hour cached detection.
 *   3. IP geolocation via ipapi.co (free, no key, 6s timeout).
 *   4. INTL as the safe default.
 *
 * (Sanatani also checks the profile phone's country code first; SyncOps
 * does not collect client phone numbers, so that step does not exist here.)
 */

const CACHE_KEY = 'syncops_pay_region';
const MANUAL_KEY = 'syncops_pay_region_manual';
const CACHE_MS = 24 * 3_600_000;

function readCached(): PayRegionId | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { region, at } = JSON.parse(raw) as { region: PayRegionId; at: number };
    if (Date.now() - at > CACHE_MS) return null;
    return region === 'BD' || region === 'IN' || region === 'INTL' ? region : null;
  } catch {
    return null;
  }
}

export function manualRegion(): PayRegionId | null {
  try {
    const v = localStorage.getItem(MANUAL_KEY);
    return v === 'BD' || v === 'IN' || v === 'INTL' ? v : null;
  } catch {
    return null;
  }
}

export function setManualRegion(region: PayRegionId): void {
  try {
    localStorage.setItem(MANUAL_KEY, region);
  } catch {
    /* storage unavailable */
  }
}

export function regionForCountry(countryCode: string | undefined): PayRegionId {
  if (countryCode === 'BD') return 'BD';
  if (countryCode === 'IN') return 'IN';
  return 'INTL';
}

/** Instant best guess (manual → cache → INTL), then refined by detectPayRegion(). */
export function initialRegion(): PayRegionId {
  return manualRegion() ?? readCached() ?? 'INTL';
}

export async function detectPayRegion(): Promise<PayRegionId> {
  const manual = manualRegion();
  if (manual) return manual;
  const cached = readCached();
  if (cached) return cached;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch('https://ipapi.co/json/', { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return 'INTL';
    const data = (await res.json()) as { country_code?: string };
    const region = regionForCountry(data.country_code);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ region, at: Date.now() }));
    } catch {
      /* storage unavailable */
    }
    return region;
  } catch {
    return 'INTL';
  }
}
