import { useEffect, useSyncExternalStore } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { logAudit } from './admin';
import type { Package, CaseStudy } from '../data/content';

/**
 * Studio-wide site configuration (the "GodMode-lite" layer).
 *
 * Resolution order (config-first with local fallback):
 *   1. Firestore `platformConfig/public` (owner-published via Studio Console)
 *   2. localStorage mirror `syncops_site_config` (demo edits + offline)
 *   3. DEFAULT_SITE_CONFIG (compiled-in fallbacks — the site always renders)
 *
 * `pricing` / `caseStudies` / `testimonials` are `null` by default, which
 * makes every consumer fall back to its compiled-in dataset.
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
 * PackageConfig/CaseStudyConfig mirror the marketing datasets in
 * data/content.ts; TestimonialConfig is the console's canonical
 * testimonial shape (the login panel falls back to LoginTestimonial).
 */
export type PackageConfig = Package & { highlighted?: boolean };
export type CaseStudyConfig = CaseStudy;
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
  caseStudies: CaseStudy[] | null;
  testimonials: TestimonialConfig[] | null;
  enableLabs?: boolean;
  enableHireModal?: boolean;
}

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  maintenanceMode: false,
  maintenanceMessage:
    'SyncOps Studio is undergoing scheduled infrastructure maintenance. Live telemetry remains available on the status page.',
  contactEmail: 'hello@syncops.studio',
  responseSla: '≤ 4h business SLA',
  heroStats: [
    { value: '99.99%', label: 'uptime SLA' },
    { value: '9.2', label: 'avg EMQ across deployments' },
    { value: '12ms', label: 'edge dispatch latency' },
  ],
  tickerItems: [
    '99.99% UPTIME SLA',
    '9.2 AVG EVENT MATCH QUALITY',
    '12MS EDGE LATENCY',
    '2.4B EVENTS PROCESSED / YR',
    '38% AVG RECOVERED REVENUE',
  ],
  pricing: null,
  caseStudies: null,
  testimonials: null,
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
