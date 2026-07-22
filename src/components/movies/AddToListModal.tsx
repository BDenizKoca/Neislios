import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { TmdbSearchResult } from '../../services/tmdbService';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';

interface AddToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItem: TmdbSearchResult | null;
}

interface EditableListInfo {
  id: string;
  title: string;
}

const AddToListModal: React.FC<AddToListModalProps> = ({
  isOpen,
  onClose,
  mediaItem,
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
      const { data: membershipData, error: membershipError } = await supabase
        .from('watchlist_members')
        .select('watchlist_id')
        .eq('user_id', user.id)
        .in('role', ['owner', 'editor']);

      if (membershipError) throw membershipError;

      const watchlistIds = membershipData?.map(m => m.watchlist_id) || [];

      let lists: EditableListInfo[] = [];
      if (watchlistIds.length > 0) {
        const { data: watchlistData, error: watchlistError } = await supabase
          .from('watchlists')
          .select('id, title')
          .in('id', watchlistIds);

        if (watchlistError) throw watchlistError;
        lists = watchlistData?.map(w => ({ id: w.id, title: w.title })) || [];
      }

      setEditableLists(lists);
    } catch (err: unknown) {
      console.error("Error fetching editable lists:", err);
      toast.error(err instanceof Error ? err.message : 'Failed to load your watchlists.');
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

  const handleAddItems = async () => {
    if (!user || !mediaItem || selectedLists.size === 0) return;
    setLoading(true);
    const toastId = toast.loading('Adding item to lists...');

    const mediaId = `${mediaItem.media_type === 'movie' ? 'tmdb:movie' : 'tmdb:tv'}:${mediaItem.id}`;

    const recordsToInsert = Array.from(selectedLists).map(listId => ({
      watchlist_id: listId,
      media_id: mediaId,
      added_by_user_id: user.id,
    }));

    try {
      const { error: insertError } = await supabase
        .from('watchlist_items')
        .insert(recordsToInsert);

      if (insertError) {
        if (insertError.code === '23505') {
          toast.success(`Item added (duplicates ignored).`, { id: toastId });
        } else {
          throw insertError;
        }
      } else {
        const itemTitle = mediaItem.media_type === 'movie' ? mediaItem.title : mediaItem.name;
        toast.success(`Added "${itemTitle}" to ${selectedLists.size} ${selectedLists.size > 1 ? 'lists' : 'list'}.`, { id: toastId });
      }

      setTimeout(() => { onClose(); }, 800);
    } catch (err: unknown) {
      console.error("Error adding item to lists:", err);
      toast.error(err instanceof Error ? err.message : 'Failed to add item.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (!mediaItem) return null;

  const itemTitle = mediaItem.media_type === 'movie' ? mediaItem.title : mediaItem.name;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add "${itemTitle}"`}
      subtitle="Select which watchlists to include this title in"
    >
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-6 text-sm text-slate-500 animate-pulse">Loading watchlists...</div>
        ) : editableLists.length === 0 ? (
          <p className="text-center py-6 text-sm text-slate-500 dark:text-slate-400">
            You don't have any editable watchlists yet.
          </p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {editableLists.map(list => (
              <label
                key={list.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedLists.has(list.id)}
                  onChange={() => handleCheckboxChange(list.id)}
                  className="h-4 w-4 text-violet-600 rounded border-slate-300 focus:ring-violet-500"
                />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{list.title}</span>
              </label>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAddItems}
            disabled={loading || selectedLists.size === 0}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold shadow-md shadow-violet-600/20 transition-all disabled:opacity-50"
          >
            {loading ? 'Adding...' : `Add to ${selectedLists.size} ${selectedLists.size === 1 ? 'List' : 'Lists'}`}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AddToListModal;