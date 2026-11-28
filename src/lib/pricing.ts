import type { PackageConfig } from './siteConfig';
import { SERVICE_LINES, packagePriceUsd, type ServiceLine } from '../data/services';

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

/** Every sellable package across all four service lines, numerically priced. */
export const ALL_PACKAGES: PricedPackage[] = (() => {
  const byId = new Map<string, PricedPackage>();
  for (const line of SERVICE_LINES) {
    for (const p of line.packages) {
      byId.set(p.id, { id: p.id, name: p.name, price: packagePriceUsd(p) });
    }
  }
  return [...byId.values()];
})();

/** Price of a package within a resolved set of service lines (Batch 6: the one dataset). */
export function priceForPackageIn(lines: ServiceLine[], packageId: string): number {
  for (const line of lines) {
    const hit = line.packages.find((p) => p.id === packageId);
    if (hit) return packagePriceUsd(hit);
  }
  return 0;
}

/** Agreed USD within a resolved set of lines: the order's own price wins. */
export function agreedUsdIn(
  lines: ServiceLine[],
  order: { price?: number; packageId: string },
): number {
  if (typeof order.price === 'number' && order.price > 0) return order.price;
  return priceForPackageIn(lines, order.packageId);
}

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
