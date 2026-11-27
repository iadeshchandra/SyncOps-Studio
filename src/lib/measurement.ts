/**
 * The studio measures itself with the same stack it sells: Google Tag
 * Manager is the single loader; GA4 (and later the ad-platform tags)
 * live inside the container, never hardcoded page by page. The app
 * speaks only in dataLayer events (trackEvent below) — what each event
 * becomes is the container's business.
 *
 * The container (GTM-KB3LJS5Z, created 2026-11-28) holds the GA4
 * Google tag, the SPA page_view tag and the product-events tag; the
 * GA4 property's stream is G-18YDQMQDMM.
 */
export const GTM_ID = 'GTM-KB3LJS5Z';

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function initMeasurement(): void {
  if (!GTM_ID) return;
  if (document.getElementById('syncops-gtm')) return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const s = document.createElement('script');
  s.id = 'syncops-gtm';
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(s);
  const ns = document.createElement('noscript');
  ns.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
  document.body.appendChild(ns);
}

/** Push a product event to the dataLayer. Safe before GTM loads. */
export function trackEvent(event: string, params?: Record<string, unknown>): void {
  try {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ event, ...params });
  } catch {
    /* measurement must never break the product */
  }
}
