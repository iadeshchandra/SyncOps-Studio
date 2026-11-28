import { useEffect, useState } from 'react';
import { Download, RefreshCw, Share, X } from 'lucide-react';
import { applyPwaUpdate, canInstall, isIos, isStandalone, promptInstall } from '../lib/pwa';

const DISMISS_KEY = 'syncops-pwa-install-dismissed';

/**
 * The two small PWA pills, bottom-left (the chat bubble owns the
 * bottom-right):
 *  - "New version ready" with a Refresh button, when an updated
 *    service worker is waiting. Never auto-reloads over the user's work.
 *  - "Install SyncOps Studio", when the browser offers an install
 *    prompt — or, on iOS (which has no prompt), a one-line hint for
 *    Share → Add to Home Screen. Dismissal is remembered.
 */
export default function PwaNudges() {
  const [updateReady, setUpdateReady] = useState(false);
  const [updateHidden, setUpdateHidden] = useState(false);
  const [installable, setInstallable] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => window.localStorage.getItem(DISMISS_KEY) === '1',
  );

  useEffect(() => {
    const onUpdate = () => {
      setUpdateReady(true);
      setUpdateHidden(false);
    };
    const onInstallable = () => setInstallable(canInstall());
    window.addEventListener('pwa-update-ready', onUpdate);
    window.addEventListener('pwa-installable', onInstallable);
    onInstallable();
    return () => {
      window.removeEventListener('pwa-update-ready', onUpdate);
      window.removeEventListener('pwa-installable', onInstallable);
    };
  }, []);

  const dismissInstall = () => {
    window.localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  const showUpdate = updateReady && !updateHidden;
  const showIosHint = !showUpdate && !dismissed && !isStandalone() && isIos() && !installable;
  const showInstall = !showUpdate && !dismissed && !isStandalone() && installable;

  if (!showUpdate && !showInstall && !showIosHint) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[80] max-w-[calc(100vw-2rem)] sm:max-w-xs">
      <div className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur">
        {showUpdate ? (
          <>
            <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-100">A new version is ready</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                Refresh to get the latest SyncOps Studio.
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={applyPwaUpdate}
                  className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition-colors hover:bg-emerald-400"
                >
                  Refresh now
                </button>
                <button
                  type="button"
                  onClick={() => setUpdateHidden(true)}
                  className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-500"
                >
                  Later
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {showIosHint ? (
              <Share className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
            ) : (
              <Download className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-100">Install SyncOps Studio</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                {showIosHint
                  ? 'Tap Share, then “Add to Home Screen” — the studio, portal and console open like an app.'
                  : 'Put the studio, client portal and console on your home screen — opens like an app, works on a weak connection.'}
              </p>
              {showInstall && (
                <button
                  type="button"
                  onClick={async () => {
                    if (await promptInstall()) setInstallable(false);
                  }}
                  className="mt-2.5 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition-colors hover:bg-emerald-400"
                >
                  Install the app
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={dismissInstall}
              aria-label="Dismiss install suggestion"
              className="shrink-0 rounded-md p-1 text-slate-500 transition-colors hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
