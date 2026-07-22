import React from 'react';
import { ShareIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import { Watchlist } from '../../types/watchlist';

interface ShareListModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchlist: Watchlist;
}

export const ShareListModal: React.FC<ShareListModalProps> = ({
  isOpen,
  onClose,
  watchlist,
}) => {
  const [copied, setCopied] = React.useState(false);
  const shareUrl = `${window.location.origin}/watchlist/${watchlist.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
      toast.error('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    if ('share' in navigator) {
      try {
        await navigator.share({
          title: watchlist.title,
          text: watchlist.description || `Check out ${watchlist.title} on Neislios!`,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-md"
      title="Share Watchlist"
      subtitle={`Spread "${watchlist.title}" with friends`}
      footer={
        <button onClick={onClose} className="btn-secondary w-full">
          Done
        </button>
      }
    >
      <div className="space-y-5">
        {/* Link Field */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Watchlist Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 text-sm focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="btn-primary shrink-0 py-2.5 px-4 text-xs"
            >
              {copied ? (
                <>
                  <CheckIcon className="w-4 h-4" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <ClipboardDocumentIcon className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Native Web Share API */}
        {'share' in navigator && (
          <div>
            <button
              onClick={handleNativeShare}
              className="btn-secondary w-full flex items-center justify-center gap-2 py-3"
            >
              <ShareIcon className="w-5 h-5 text-red-500" />
              <span>Share via Apps...</span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ShareListModal;
