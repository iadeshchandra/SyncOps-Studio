import { useEffect } from 'react';

/**
 * Per-page SEO meta management for the SPA.
 *
 * `setPageMeta` updates the document title plus the description / Open
 * Graph / Twitter Card tags, creating any tag that is missing from
 * index.html. `usePageMeta` is the React hook wrapper used by pages.
 */

function upsertMeta(
  selector: string,
  attributes: Record<string, string>,
  content: string
): void {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    for (const [key, value] of Object.entries(attributes)) {
      el.setAttribute(key, value);
    }
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function setPageMeta(title: string, description: string): void {
  document.title = title;
  // Canonical + og:url follow the actual route, so shares of /work, /notes
  // or /compare no longer canonicalise to the homepage (D-6).
  const url = window.location.origin + window.location.pathname;
  upsertMeta('meta[property="og:url"]', { property: 'og:url' }, url);
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', url);
  upsertMeta('meta[name="description"]', { name: 'description' }, description);
  upsertMeta('meta[property="og:title"]', { property: 'og:title' }, title);
  upsertMeta(
    'meta[property="og:description"]',
    { property: 'og:description' },
    description
  );
  upsertMeta('meta[property="og:type"]', { property: 'og:type' }, 'website');
  upsertMeta(
    'meta[name="twitter:card"]',
    { name: 'twitter:card' },
    'summary_large_image'
  );
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, title);
  upsertMeta(
    'meta[name="twitter:description"]',
    { name: 'twitter:description' },
    description
  );
}

/**
 * Injects a JSON-LD structured-data block (by id) for the lifetime of
 * the component — used for FAQPage schema so search engines can show
 * the questions directly in results. Removed on unmount.
 */
export function useJsonLd(id: string, data: unknown): void {
  useEffect(() => {
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    el.textContent = JSON.stringify(data);
    document.head.appendChild(el);
    return () => {
      el.remove();
    };
  }, [id, data]);
}

export function usePageMeta(title: string, description: string): void {
  useEffect(() => {
    setPageMeta(title, description);
  }, [title, description]);
}
