import React, { useState } from 'react';
import { usePWA } from '../../hooks/usePWA';
import InstallAppModal from './InstallAppModal';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { storage } from '../../utils/storage';

const InstallAppBanner: React.FC = () => {
  const { isInstallable, isStandalone, isIOS, triggerPrompt } = usePWA();
  const [isDismissed, setIsDismissed] = useState(() => {
    return !!storage.local.get('pwa-banner-dismissed');
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isStandalone || isDismissed || (!isInstallable && !isIOS)) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    storage.local.set('pwa-banner-dismissed', 'true');
  };

  const handleInstallClick = () => {
    if (isIOS) {
      setIsModalOpen(true);
    } else {
      triggerPrompt();
    }
  };

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 z-40 md:left-auto md:right-6 md:w-96 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-white rounded-2xl flex items-center justify-between gap-3 p-4 transition-all duration-300">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl flex items-center justify-center font-black text-xl shrink-0">
            N
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
              Install Neislios
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Add to Home Screen for fast access
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
            className="btn-primary py-2 px-3.5 text-xs font-bold rounded-xl flex items-center gap-1.5"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>Install</span>
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
            aria-label="Dismiss banner"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <InstallAppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default InstallAppBanner;
