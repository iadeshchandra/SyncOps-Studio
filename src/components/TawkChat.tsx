import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Tawk.to live chat — public surface only.
 *
 * The widget is for prospective clients on the marketing pages. It is
 * never injected on auth, client-portal or console routes: signed-in
 * clients already have the in-portal Lead Architect channel, and the
 * owner doesn't need a chat bubble inside his own console.
 *
 * Loading is lazy (after first paint) so the widget never competes
 * with the page's own critical render.
 */
const TAWK_SRC = 'https://embed.tawk.to/6b07c472c92de43d0454392d/default';
const EXCLUDED_PREFIXES = ['/login', '/client', '/ekanto'];

declare global {
  interface Window {
    Tawk_API?: {
      hideWidget?: () => void;
      showWidget?: () => void;
    };
    Tawk_LoadStart?: Date;
  }
}

let injected = false;

function isExcluded(pathname: string): boolean {
  return EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function TawkChat() {
  const { pathname } = useLocation();

  // Inject the script once, shortly after the first public page paints.
  useEffect(() => {
    if (injected || isExcluded(pathname)) return;
    injected = true;
    const t = setTimeout(() => {
      window.Tawk_API = window.Tawk_API || {};
      window.Tawk_LoadStart = new Date();
      const s1 = document.createElement('script');
      s1.async = true;
      s1.src = TAWK_SRC;
      s1.charset = 'UTF-8';
      s1.setAttribute('crossorigin', '*');
      const s0 = document.getElementsByTagName('script')[0];
      s0.parentNode?.insertBefore(s1, s0);
    }, 1800);
    return () => clearTimeout(t);
    // Runs once on mount by design — later mounts are guarded by `injected`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the widget hidden if the visitor wanders into a private surface.
  useEffect(() => {
    const api = window.Tawk_API;
    if (!api) return;
    if (isExcluded(pathname)) api.hideWidget?.();
    else api.showWidget?.();
  }, [pathname]);

  return null;
}
