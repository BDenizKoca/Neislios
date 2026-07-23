import React from 'react';
import Modal from './Modal';
import { ShareIcon, PlusIcon } from '@heroicons/react/24/outline';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Install Neislios"
      subtitle="Add this app to your Home Screen for the best experience"
    >
      <div className="space-y-6 pt-2">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          It looks like you are using iOS Safari! Apple doesn't allow automatic installs, but it only takes two taps to install Neislios as a native app on your home screen:
        </p>

        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600">
              <ShareIcon className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Step 1</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Tap the <strong>Share</strong> icon in your browser's bottom navigation bar.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600">
              <PlusIcon className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Step 2</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Scroll down the menu and tap <strong>Add to Home Screen</strong>.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="btn-primary w-full"
          >
            Got it!
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default InstallAppModal;
