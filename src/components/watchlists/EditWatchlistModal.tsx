import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { Watchlist } from '../../types/watchlist';
import { logger } from '../../utils/logger';
import toast from 'react-hot-toast';
import { CheckIcon, TrashIcon } from '@heroicons/react/24/solid';
import { WATCHLIST_COLOR_PALETTE } from '../../constants/colors';
import Modal from '../common/Modal';

interface EditWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchlist: Watchlist | null;
  onWatchlistUpdated: () => void;
  onDelete: (watchlistId: string) => Promise<void>;
}

const EditWatchlistModal: React.FC<EditWatchlistModalProps> = ({
  isOpen,
  onClose,
  watchlist,
  onWatchlistUpdated,
  onDelete,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [cardColor, setCardColor] = useState('#ffffff');
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (watchlist) {
      setTitle(watchlist.title || '');
      setDescription(watchlist.description || '');
      setIsPublic(watchlist.is_public || false);
      setCardColor(watchlist.card_color || '#ffffff');
      setLoading(false);
      setDeleteLoading(false);
    }
  }, [watchlist, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !watchlist || !title.trim()) {
      toast.error('Title is required.');
      return;
    }
    setLoading(true);
    const toastId = toast.loading('Saving changes...');

    try {
      const { error: updateError } = await supabase
        .from('watchlists')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          is_public: isPublic,
          card_color: cardColor || '#ffffff',
          updated_at: new Date().toISOString(),
        })
        .eq('id', watchlist.id)
        .eq('owner_id', user.id);

      if (updateError) throw updateError;

      toast.success('Watchlist updated!', { id: toastId });
      onWatchlistUpdated();
      onClose();
    } catch (err: unknown) {
      logger.error("Error updating watchlist:", err);
      toast.error(err instanceof Error ? err.message : 'Failed to update watchlist.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!watchlist) return;
    if (window.confirm(`Are you sure you want to permanently delete the watchlist "${watchlist.title}"? This cannot be undone.`)) {
      setDeleteLoading(true);
      const toastId = toast.loading('Deleting watchlist...');
      try {
        await onDelete(watchlist.id);
      } catch (deleteErr: unknown) {
        logger.error("Error during delete callback:", deleteErr);
        toast.error(deleteErr instanceof Error ? deleteErr.message : "Failed to delete watchlist.", { id: toastId });
        setDeleteLoading(false);
      }
    }
  };

  if (!watchlist) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Watchlist"
      subtitle={`Updating settings for "${watchlist.title}"`}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="edit-title" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Title <span className="text-rose-500">*</span>
          </label>
          <input
            id="edit-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm"
          />
        </div>

        <div>
          <label htmlFor="edit-description" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Description
          </label>
          <textarea
            id="edit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Card Theme Color
          </label>
          <div className="flex flex-wrap gap-2.5">
            {WATCHLIST_COLOR_PALETTE.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setCardColor(color)}
                style={{ backgroundColor: color }}
                className={`w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center transition-transform active:scale-90 ${
                  cardColor === color ? 'ring-2 ring-offset-2 ring-red-500 scale-110' : ''
                }`}
                aria-label={`Select color ${color}`}
              >
                {cardColor === color && (
                  <CheckIcon className={`h-4 w-4 ${color === '#ffffff' || color === '#eab308' || color === '#84cc16' ? 'text-slate-950' : 'text-white'}`} />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-800/40">
          <input
            id="edit-isPublic"
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4 accent-red-600 rounded cursor-pointer"
          />
          <label htmlFor="edit-isPublic" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
            Make Publicly Viewable
          </label>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading || deleteLoading}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-bold transition-colors disabled:opacity-50 w-full sm:w-auto"
          >
            <TrashIcon className="w-4 h-4" />
            <span>{deleteLoading ? 'Deleting...' : 'Delete List'}</span>
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={loading || deleteLoading}
              className="btn-secondary text-sm flex-1 sm:flex-none justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || deleteLoading}
              className="btn-primary text-sm flex-1 sm:flex-none justify-center"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default EditWatchlistModal;