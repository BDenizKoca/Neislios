import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { CheckIcon } from '@heroicons/react/24/solid';
import { WATCHLIST_COLOR_PALETTE } from '../../constants/colors';
import Modal from '../common/Modal';

interface CreateWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWatchlistCreated: () => void;
}

const CreateWatchlistModal: React.FC<CreateWatchlistModalProps> = ({
  isOpen,
  onClose,
  onWatchlistCreated,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [cardColor, setCardColor] = useState('#ffffff');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setIsPublic(false);
      setCardColor('#ffffff');
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) {
      setError('Title is required.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('watchlists')
        .insert({
          owner_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          is_public: isPublic,
          card_color: cardColor || '#ffffff',
        });

      if (insertError) throw insertError;

      onWatchlistCreated();
      onClose();
    } catch (err: unknown) {
      console.error("Error creating watchlist:", err);
      setError(err instanceof Error ? err.message : 'Failed to create watchlist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Watchlist"
      subtitle="Organize movies and shows to watch together"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="create-title" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Title <span className="text-rose-500">*</span>
          </label>
          <input
            id="create-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Sci-Fi Favorites, Friday Night Movies"
            required
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm"
          />
        </div>

        <div>
          <label htmlFor="create-description" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Description
          </label>
          <textarea
            id="create-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this watchlist about?"
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Card Theme Color
          </label>
          <div className="flex flex-wrap gap-2.5 p-1">
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
            id="create-isPublic"
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4 accent-red-600 rounded cursor-pointer"
          />
          <label htmlFor="create-isPublic" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
            Make Publicly Viewable
          </label>
        </div>

        {error && <p className="text-xs font-semibold text-rose-500">{error}</p>}

        <div className="flex justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary text-sm"
          >
            {loading ? 'Creating...' : 'Create Watchlist'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateWatchlistModal;
