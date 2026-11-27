import { PACKAGES } from '../data/content';
import type { PackageConfig } from './siteConfig';
import { SERVICE_LINES } from '../data/services';

/**
 * The ONE price resolver (Deep Review #2, Batch 3 — A5/C-05/B-06).
 *
 * Before this module, every surface kept its own lookup against the 3 CAPI
 * packages in content.ts, so the other 9 sellable packages (Analytics,
 * App-Dev, ChatGPT Ads) resolved to $0 — no balance, no claim form, no
 * invoice. Now: an order's own stored `price` (owner-set) wins; otherwise
 * the package is priced from the owner's live pricing config when given,
 * then from every service line's package list.
 */
export interface PricedPackage {
  id: string;
  name: string;
  price: number;
}

function parsePriceLabel(label: string): number {
  const n = Number(String(label).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Every sellable package across all four service lines, numerically priced. */
export const ALL_PACKAGES: PricedPackage[] = (() => {
  const byId = new Map<string, PricedPackage>();
  for (const line of SERVICE_LINES) {
    for (const p of line.packages) {
      byId.set(p.id, { id: p.id, name: p.name, price: parsePriceLabel(p.price) });
    }
  }
  // content.ts PACKAGES carries authoritative numeric prices for the CAPI line.
  for (const p of PACKAGES) byId.set(p.id, { id: p.id, name: p.name, price: p.price });
  return [...byId.values()];
})();

export function priceForPackage(
  packageId: string,
  configPricing?: PackageConfig[] | null,
): number {
  if (configPricing) {
    const hit = configPricing.find((p) => p.id === packageId);
    if (hit) return hit.price;
  }
  return ALL_PACKAGES.find((p) => p.id === packageId)?.price ?? 0;
}

/** The agreed USD amount for an order: its own price, else its package's. */
export function agreedUsd(
  order: { price?: number; packageId: string },
  configPricing?: PackageConfig[] | null,
): number {
  if (typeof order.price === 'number' && order.price > 0) return order.price;
  return priceForPackage(order.packageId, configPricing);
}
