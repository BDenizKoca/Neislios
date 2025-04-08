import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth'; // Updated import path
import { CheckIcon } from '@heroicons/react/24/solid'; // For selected color indication

interface CreateWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWatchlistCreated: () => void;
}

// Predefined color palette
const colorPalette = [
  '#ffffff', // White (Default)
  '#ef4444', // Red-500
  '#f97316', // Orange-500
  '#eab308', // Yellow-500
  '#84cc16', // Lime-500
  '#22c55e', // Green-500
  '#14b8a6', // Teal-500
  '#06b6d4', // Cyan-500
  '#3b82f6', // Blue-500
  '#6366f1', // Indigo-500
  '#8b5cf6', // Violet-500
  '#d946ef', // Fuchsia-500
  '#ec4899', // Pink-500
  '#78716c', // Stone-500
  '#737373', // Neutral-500
  '#1f2937', // Gray-800 (Example dark color)
];


const CreateWatchlistModal: React.FC<CreateWatchlistModalProps> = ({
  isOpen,
  onClose,
  onWatchlistCreated,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [cardColor, setCardColor] = useState('#ffffff'); // Default to white
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

    } catch (err: unknown) { // Use unknown for catch block
      console.error("Error creating watchlist:", err);
      setError(err instanceof Error ? err.message : 'Failed to create watchlist.'); // Check error type
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4 border border-gray-200 dark:border-gray-700 transform transition-all duration-300 ease-in-out ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create New Watchlist</h2>
          <button onClick={onClose} className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-200">Title <span className="text-red-500">*</span></label>
            <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary focus:border-primary"/>
          </div>
          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-200">Description</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary focus:border-primary"/>
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
                        {cardColor === color && <CheckIcon className={`h-5 w-5 ${color === '#ffffff' || color === '#eab308' || color === '#84cc16' ? 'text-black' : 'text-white'}`} />} {/* Adjust checkmark color for light backgrounds */}
                    </button>
                ))}
             </div>
           </div>
          {/* Public/Private Toggle */}
          <div className="flex items-center">
            <input id="isPublic" type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"/>
            <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900 dark:text-gray-200">Make Publicly Viewable</label>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Watchlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateWatchlistModal;