import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initMeasurement } from '../lib/measurement';

/**
 * Loads Google Tag Manager everywhere except the owner's console —
 * the architect's own clicks are not client analytics. Pageviews
 * (including SPA route changes) are the container's job; the app
 * itself only pushes product events via trackEvent.
 */
export default function Measurement() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname.startsWith('/hq-z8k4x7q2')) return;
    initMeasurement();
  }, [pathname]);
  return null;
}
