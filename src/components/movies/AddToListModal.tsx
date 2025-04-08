import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth'; // Updated import path
import { TmdbSearchResult } from '../../services/tmdbService'; // Use union type
import toast from 'react-hot-toast';

interface AddToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItem: TmdbSearchResult | null; // Changed prop name and type
}

interface EditableListInfo {
    id: string;
    title: string;
}
// Type for the data structure returned by the Supabase query
// Supabase returns the joined table as an array, even for one-to-one/many-to-one joins
// Type for the data structure returned by the Supabase query
// Removed WatchlistMemberWithWatchlist interface, as we fetch IDs first now

const AddToListModal: React.FC<AddToListModalProps> = ({
  isOpen,
  onClose,
  mediaItem, // Use new prop name
}) => {
  const { user } = useAuth();
  const [editableLists, setEditableLists] = useState<EditableListInfo[]>([]);
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const fetchEditableLists = useCallback(async () => {
    if (!isOpen || !user) return;
    setLoading(true);
    setSelectedLists(new Set());

    try {
      // Step 1: Get IDs of watchlists where user is owner or editor
      const { data: membershipData, error: membershipError } = await supabase
        .from('watchlist_members')
        .select('watchlist_id')
        .eq('user_id', user.id)
        .in('role', ['owner', 'editor']); // Re-add role filter here

      if (membershipError) throw membershipError;

      const watchlistIds = membershipData?.map(m => m.watchlist_id) || [];

      let lists: EditableListInfo[] = [];
      if (watchlistIds.length > 0) {
        // Step 2: Fetch details for those specific watchlists
        const { data: watchlistData, error: watchlistError } = await supabase
          .from('watchlists')
          .select('id, title')
          .in('id', watchlistIds);

        if (watchlistError) throw watchlistError;
        // Ensure data is mapped correctly even if some lists weren't found (due to RLS/deletion)
        lists = watchlistData?.map(w => ({ id: w.id, title: w.title })) || [];
      }

      setEditableLists(lists);

    } catch (err: unknown) { // Use unknown for catch block
      console.error("Error fetching editable lists:", err);
      toast.error(err instanceof Error ? err.message : 'Failed to load your watchlists.'); // Check error type
      setEditableLists([]);
    } finally {
      setLoading(false);
    }
  }, [isOpen, user]);

  useEffect(() => {
    fetchEditableLists();
  }, [fetchEditableLists]);

  const handleCheckboxChange = (listId: string) => {
    setSelectedLists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(listId)) newSet.delete(listId);
      else newSet.add(listId);
      return newSet;
    });
  };

  const handleAddItems = async () => { // Renamed handler
    if (!user || !mediaItem || selectedLists.size === 0) return;
    setLoading(true);
    const toastId = toast.loading('Adding item to lists...');

    // Construct the correct media ID with prefix
    const mediaId = `${mediaItem.media_type === 'movie' ? 'tmdb:movie' : 'tmdb:tv'}:${mediaItem.id}`;

    const recordsToInsert = Array.from(selectedLists).map(listId => ({
      watchlist_id: listId,
      media_id: mediaId, // Use generic media_id
      added_by_user_id: user.id,
      // item_order will be set by trigger or default
    }));

    try {
      // Use the renamed table 'watchlist_items'
      const { error: insertError } = await supabase
        .from('watchlist_items') // Use renamed table
        .insert(recordsToInsert);

      if (insertError) {
         if (insertError.code === '23505') {
             console.warn("Attempted to add duplicate item(s) to some lists.");
             toast.success(`Item added (duplicates ignored).`, { id: toastId });
         } else { throw insertError; }
      } else {
        const title = mediaItem.media_type === 'movie' ? mediaItem.title : mediaItem.name;
        toast.success(`Added "${title}" to ${selectedLists.size} ${selectedLists.size > 1 ? 'lists' : 'list'}.`, { id: toastId });
      }

      setTimeout(() => { onClose(); }, 1500);

    } catch (err: unknown) { // Use unknown for catch block
      console.error("Error adding item to lists:", err);
      toast.error(err instanceof Error ? err.message : 'Failed to add item.', { id: toastId }); // Check error type
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mediaItem) return null;

  // Determine title based on media type
  const title = mediaItem.media_type === 'movie' ? mediaItem.title : mediaItem.name;

  return (
    <div className={`fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4 border border-gray-200 dark:border-gray-700 transform transition-all duration-300 ease-in-out ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Add "{title}" to...</h2>
          <button onClick={onClose} disabled={loading} className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading && <p className="text-center p-4">Loading...</p>}

        {!loading && editableLists.length === 0 && (
            <p className="text-gray-500 dark:text-gray-300">You don't have any editable watchlists.</p>
        )}

        {!loading && editableLists.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto mb-4 pr-2">
            {editableLists.map(list => (
              <div key={list.id} className="flex items-center">
                <input
                  id={`list-${list.id}`} type="checkbox"
                  checked={selectedLists.has(list.id)}
                  onChange={() => handleCheckboxChange(list.id)}
                  disabled={loading}
                  className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary disabled:opacity-50"
                />
                <label htmlFor={`list-${list.id}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-200">
                  {list.title}
                </label>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-2 border-t dark:border-gray-700">
          <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={handleAddItems} disabled={loading || selectedLists.size === 0 || !mediaItem} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50">
            {loading ? 'Adding...' : `Add to ${selectedLists.size} List(s)`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddToListModal;