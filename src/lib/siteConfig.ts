import { useEffect, useSyncExternalStore } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { logAudit } from './admin';
import type { Package, ProofQuote } from '../data/content';
import { SERVICE_LINES, type ServiceLine } from '../data/services';

/**
 * Studio-wide site configuration (the "GodMode-lite" layer).
 *
 * Resolution order (config-first with local fallback):
 *   1. Firestore `platformConfig/public` (owner-published via Studio Console)
 *   2. localStorage mirror `syncops_site_config` (demo edits + offline)
 *   3. DEFAULT_SITE_CONFIG (compiled-in fallbacks — the site always renders)
 *
 * `pricing` / `caseStudies` / `testimonials` / `services` are `null` by
 * default, which makes every consumer fall back to its compiled-in dataset.
 * `services` stores the Studio Console-edited service lines; the ServiceLine
 * shape is plain JSON (its `icon` is a lucide icon *name* string that
 * components map to a component), so it round-trips through Firestore as-is.
 */

export interface HeroStat {
  value: string;
  label: string;
}

export interface LoginTestimonial {
  quote: string;
  name: string;
  role: string;
}

/**
 * Shared content-shape aliases consumed by the Studio Console tabs.
 * PackageConfig mirrors the pricing dataset in data/content.ts;
 * ProofQuoteConfig mirrors the client-proof quotes (real Fiverr reviews);
 * TestimonialConfig is the console's canonical testimonial shape
 * (the login panel falls back to LoginTestimonial).
 */
export type PackageConfig = Package & { highlighted?: boolean };
export type ProofQuoteConfig = ProofQuote;
export interface TestimonialConfig {
  quote: string;
  author: string;
  role: string;
}

export interface SiteConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  contactEmail: string;
  responseSla: string;
  heroStats: HeroStat[];
  tickerItems: string[];
  pricing: PackageConfig[] | null;
  proofQuotes: ProofQuote[] | null;
  testimonials: TestimonialConfig[] | null;
  services: ServiceLine[] | null;
  enableLabs?: boolean;
  enableHireModal?: boolean;
}

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  maintenanceMode: false,
  maintenanceMessage:
    'SyncOps Studio is undergoing scheduled infrastructure maintenance. Live telemetry remains available on the status page.',
  contactEmail: 'iadeshchandra@gmail.com',
  responseSla: '≤ 4h business SLA',
  heroStats: [
    { value: '240+', label: 'businesses served' },
    { value: '4.9/5', label: 'average client rating' },
    { value: '322', label: 'verified Fiverr reviews' },
  ],
  tickerItems: [
    'SERVER-SIDE TRACKING',
    'META CAPI',
    'TIKTOK EVENTS API',
    'GOOGLE ENHANCED CONVERSIONS',
    '240+ BUSINESSES SERVED',
    '4.9/5 CLIENT RATING',
  ],
  pricing: null,
  proofQuotes: null,
  testimonials: null,
  services: null,
};

const LOCAL_KEY = 'syncops_site_config';

interface StoreState {
  config: SiteConfig;
  booted: boolean;
}

let state: StoreState = { config: DEFAULT_SITE_CONFIG, booted: false };
let inflight: Promise<SiteConfig> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setState(patch: Partial<StoreState>) {
  state = { ...state, ...patch };
  emit();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function getSnapshot(): StoreState {
  return state;
}

function mergeConfig(partial: Partial<SiteConfig>): SiteConfig {
  return { ...DEFAULT_SITE_CONFIG, ...partial };
}

function readLocal(): Partial<SiteConfig> {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return JSON.parse(raw) as Partial<SiteConfig>;
  } catch {
    /* corrupted or unavailable storage — fall through to defaults */
  }
  return {};
}

/** Load the effective config (Firestore public doc wins, local mirror next, defaults last). */
export async function loadSiteConfig(): Promise<SiteConfig> {
  if (inflight) return inflight;
  inflight = (async () => {
    const local = readLocal();
    if (db) {
      try {
        const snap = await getDoc(doc(db, 'platformConfig', 'public'));
        if (snap.exists()) {
          const config = mergeConfig({ ...local, ...(snap.data() as Partial<SiteConfig>) });
          setState({ config, booted: true });
          return config;
        }
      } catch {
        /* offline or permission-denied — fall through to local/defaults */
      }
    }
    const config = mergeConfig(local);
    setState({ config, booted: true });
    return config;
  })();
  return inflight;
}

/**
 * Persist a config patch. Always mirrors to localStorage; writes to
 * Firestore `platformConfig/public` when a live backend is configured
 * (owner-gated by rules).
 */
export async function saveSiteConfig(patch: Partial<SiteConfig>, actor?: string): Promise<void> {
  const config = mergeConfig({ ...state.config, ...patch });
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(config));
  } catch {
    /* storage unavailable — Firestore remains the source of truth */
  }
  setState({ config, booted: true });
  if (db) {
    await setDoc(doc(db, 'platformConfig', 'public'), patch, { merge: true });
  }
  await logAudit('site-config.update', Object.keys(patch).sort().join(','), actor);
}

/**
 * Effective service lines for the marketing site and hire flow: the
 * owner-published `config.services` when the Studio Console has saved an
 * override, otherwise the compiled-in SERVICE_LINES from data/services.ts.
 */
export function useServiceLines(): ServiceLine[] {
  const { config } = useSiteConfig();
  // An empty saved array is treated as "no override" — consumers index
  // lines[0] and line.packages[0], so the effective list is never empty.
  return config.services && config.services.length > 0 ? config.services : SERVICE_LINES;
}

/** Shared reactive config for every component. Safe to call anywhere — no provider needed. */
export function useSiteConfig(): {
  config: SiteConfig;
  loading: boolean;
  refresh: () => Promise<SiteConfig>;
} {
  const { config, booted } = useSyncExternalStore(subscribe, getSnapshot);
  useEffect(() => {
    void loadSiteConfig();
  }, []);
  return {
    config,
    loading: !booted,
    refresh: () => {
      inflight = null;
      return loadSiteConfig();
    },
  };
}
