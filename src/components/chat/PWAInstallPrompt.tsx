import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroidBanner, setShowAndroidBanner] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;

    if (isIOS && !isInStandaloneMode) {
      const dismissed = sessionStorage.getItem('pwa-ios-hint-dismissed');
      if (!dismissed) setShowIOSHint(true);
    }

    const handleInstallable = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowAndroidBanner(true);
    };

    const handleUpdate = () => setUpdateAvailable(true);

    window.addEventListener('beforeinstallprompt', handleInstallable);
    window.addEventListener('pwa-update-available', handleUpdate);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallable);
      window.removeEventListener('pwa-update-available', handleUpdate);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowAndroidBanner(false);
      setDeferredPrompt(null);
    }
  };

  const dismissAndroid = () => setShowAndroidBanner(false);

  const dismissIOS = () => {
    setShowIOSHint(false);
    sessionStorage.setItem('pwa-ios-hint-dismissed', '1');
  };

  if (updateAvailable) {
    return (
      <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <p className="text-xs text-blue-700">A new version of TaskFlow Chat is available</p>
        <button
          onClick={() => window.location.reload()}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 ml-3 underline"
        >
          Update now
        </button>
      </div>
    );
  }

  if (showAndroidBanner) {
    return (
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <img src="/pwa-64.png" className="w-8 h-8 rounded-lg flex-shrink-0" alt="TaskFlow" />
          <div className="min-w-0">
            <p className="text-xs font-semibold">Add TaskFlow Chat to home screen</p>
            <p className="text-xs text-slate-400">Get instant access from your phone</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={dismissAndroid} className="text-xs text-slate-400 hover:text-white p-1">
            <X className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleInstall}
            className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md font-medium"
          >
            Install
          </button>
        </div>
      </div>
    );
  }

  if (showIOSHint) {
    return (
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <img src="/pwa-64.png" className="w-8 h-8 rounded-lg flex-shrink-0" alt="TaskFlow" />
          <p className="text-xs text-slate-200 min-w-0">
            Install: tap <span className="font-semibold text-white">Share</span> then{' '}
            <span className="font-semibold text-white">Add to Home Screen</span>
          </p>
        </div>
        <button onClick={dismissIOS} className="text-slate-400 hover:text-white flex-shrink-0 p-1">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return null;
}
