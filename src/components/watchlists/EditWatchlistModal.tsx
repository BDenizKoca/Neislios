import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth'; // Updated import path
import { Watchlist } from '../../types/watchlist';
import toast from 'react-hot-toast';
import { CheckIcon } from '@heroicons/react/24/solid'; // Import CheckIcon

interface EditWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchlist: Watchlist | null;
  onWatchlistUpdated: () => void;
  onDelete: (watchlistId: string) => Promise<void>;
}

// Predefined color palette (same as Create modal)
const colorPalette = [
  '#ffffff', '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef',
  '#ec4899', '#78716c', '#737373', '#1f2937',
];

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
        .eq('owner_id', user.id); // Ensure only owner can update

      if (updateError) throw updateError;

      toast.success('Watchlist updated!', { id: toastId });
      onWatchlistUpdated();
      onClose();

    } catch (err: unknown) { // Use unknown for catch block
      console.error("Error updating watchlist:", err);
      toast.error(err instanceof Error ? err.message : 'Failed to update watchlist.', { id: toastId }); // Check error type
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
            // Let parent handle closing on success via subscription/refresh
        } catch (deleteErr: unknown) { // Use unknown for catch block
             console.error("Error during delete callback:", deleteErr);
             toast.error(deleteErr instanceof Error ? deleteErr.message : "Failed to delete watchlist.", { id: toastId }); // Check error type
             setDeleteLoading(false);
        }
    }
  };

  if (!isOpen || !watchlist) return null;

  return (
    <div className={`fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4 border border-gray-200 dark:border-gray-700 transform transition-all duration-300 ease-in-out ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Edit Watchlist</h2>
          <button onClick={onClose} disabled={loading || deleteLoading} className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-500">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 dark:text-gray-200">Title <span className="text-red-500">*</span></label>
            <input id="edit-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary focus:border-primary"/>
          </div>
          {/* Description */}
          <div>
            <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 dark:text-gray-200">Description</label>
            <textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary focus:border-primary"/>
          </div>
           {/* Card Color Swatches */}
           <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Card Background Color</label>
             <div className="flex flex-wrap gap-2">
                {colorPalette.map(color => (
                    <button
                        key={color}
                        type="button"
                        onClick={() => setCardColor(color)}
                        className={`w-8 h-8 rounded-full border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${cardColor === color ? 'ring-2 ring-offset-1 ring-primary' : 'border-gray-300 dark:border-gray-600'}`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                    >
                        {cardColor === color && <CheckIcon className={`h-5 w-5 ${color === '#ffffff' || color === '#eab308' || color === '#84cc16' ? 'text-black' : 'text-white'}`} />}
                    </button>
                ))}
             </div>
           </div>
          {/* Public/Private Toggle */}
          <div className="flex items-center">
            <input id="edit-isPublic" type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"/>
            <label htmlFor="edit-isPublic" className="ml-2 block text-sm text-gray-900 dark:text-gray-200">Make Publicly Viewable</label>
          </div>

          {/* Removed static error display */}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t dark:border-gray-700 mt-4">
             {/* Delete Button */}
             <button type="button" onClick={handleDelete} disabled={loading || deleteLoading} className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50">
                {deleteLoading ? 'Deleting...' : 'Delete List'}
             </button>
             {/* Save/Cancel Buttons */}
             <div className="flex space-x-3">
                <button type="button" onClick={onClose} disabled={loading || deleteLoading} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                  Cancel
                </button>
                <button type="submit" disabled={loading || deleteLoading} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50">
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
             </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditWatchlistModal;