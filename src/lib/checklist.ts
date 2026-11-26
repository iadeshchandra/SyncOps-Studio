export interface ChecklistItem {
  id: string;
  title: string;
  how: string;
}

/**
 * The access checklist every tracking build needs before work can start.
 * Agencies lose days chasing these one by one — here the client works down
 * one list, in the portal, with the click-path written out.
 */
export const ACCESS_CHECKLIST: ChecklistItem[] = [
  {
    id: 'gtm',
    title: 'Google Tag Manager — Admin access',
    how: 'GTM → Admin → User Management → add the studio email with the Admin role (Publish rights needed to ship containers).',
  },
  {
    id: 'ga4',
    title: 'Google Analytics 4 — Admin access',
    how: 'GA4 → Admin → Access management → add the studio email as Administrator, or grant Editor if your policy requires it.',
  },
  {
    id: 'meta',
    title: 'Meta — Business Partner access',
    how: 'Meta Business Settings → Partners → Add partner by Business ID (the studio shares its ID in the chat) → grant the Page, Ad Account and Pixel/Dataset.',
  },
  {
    id: 'tiktok',
    title: 'TikTok — Events Manager access',
    how: 'TikTok Ads Manager → Business Center → Users → invite the studio email, with access to the ad account and its Events Manager pixel.',
  },
  {
    id: 'ads',
    title: 'Ad accounts — Google Ads / others',
    how: 'Google Ads → Tools → Access and security → invite the studio email as Standard (or share your customer ID for an MCC link request).',
  },
  {
    id: 'store',
    title: 'Store platform — staff account',
    how: 'Shopify: Settings → Users → add a staff account for the studio email with Apps + Themes permissions. WooCommerce: Users → Add New → Administrator (or Shop Manager).',
  },
  {
    id: 'dns',
    title: 'DNS — subdomain for the tracking server',
    how: 'Your domain registrar or Cloudflare: be ready to add one subdomain record (e.g. track.yourstore.com) — the studio sends the exact record when the server is provisioned.',
  },
];

export function checklistProgress(order: { checklist?: Record<string, boolean> }): {
  done: number;
  total: number;
} {
  const total = ACCESS_CHECKLIST.length;
  const done = ACCESS_CHECKLIST.filter((i) => order.checklist?.[i.id]).length;
  return { done, total };
}
