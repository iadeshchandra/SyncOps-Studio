/**
 * PWA plumbing: service-worker registration with a polite update
 * handshake, plus the deferred browser install prompt. The visible UI
 * lives in components/PwaNudges.tsx; this module only talks to the
 * browser and broadcasts window events ('pwa-update-ready',
 * 'pwa-installable'). Everything is best-effort: a PWA failure must
 * never break the app.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function initPwa(): void {
  if (!import.meta.env.PROD) return;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        const announce = () => {
          if (reg.waiting) window.dispatchEvent(new Event('pwa-update-ready'));
        };
        announce();
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) announce();
          });
        });
        let reloading = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (reloading) return;
          reloading = true;
          window.location.reload();
        });
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => undefined);
        });
      } catch {
        /* enhancement only */
      }
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event('pwa-installable'));
  });
}

export function applyPwaUpdate(): void {
  navigator.serviceWorker
    ?.getRegistration()
    .then((reg) => reg?.waiting?.postMessage('SKIP_WAITING'))
    .catch(() => undefined);
}

export function canInstall(): boolean {
  return deferredPrompt !== null;
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return choice.outcome === 'accepted';
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
