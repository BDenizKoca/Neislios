import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { TmdbSearchResult } from '../../services/tmdbService';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import { MagnifyingGlassIcon, PlusIcon, CheckIcon } from '@heroicons/react/24/outline';

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
  const [existingListIds, setExistingListIds] = useState<Set<string>>(new Set());
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [creatingLoading, setCreatingLoading] = useState(false);

  const fetchEditableLists = useCallback(async () => {
    if (!isOpen || !user || !mediaItem) return;
    setLoading(true);
    setSelectedLists(new Set());
    setExistingListIds(new Set());
    setSearchQuery('');
    setIsCreatingNew(false);
    setNewTitle('');

    const mediaId = `${mediaItem.media_type === 'movie' ? 'tmdb:movie' : 'tmdb:tv'}:${mediaItem.id}`;

    try {
      // 1. Fetch user's editable watchlist IDs
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

        // 2. Fetch lists where this movie already exists
        const { data: existingItemsData } = await supabase
          .from('watchlist_items')
          .select('watchlist_id')
          .eq('media_id', mediaId)
          .in('watchlist_id', watchlistIds);

        const existingSet = new Set((existingItemsData || []).map(item => item.watchlist_id));
        setExistingListIds(existingSet);
      }

      setEditableLists(lists);
    } catch (err: unknown) {
      console.error("Error fetching editable lists:", err);
      toast.error(err instanceof Error ? err.message : 'Failed to load your watchlists.');
      setEditableLists([]);
    } finally {
      setLoading(false);
    }
  }, [isOpen, user, mediaItem]);

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

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle.trim()) return;

    setCreatingLoading(true);
    try {
      const { data: newList, error: insertError } = await supabase
        .from('watchlists')
        .insert({
          owner_id: user.id,
          title: newTitle.trim(),
          is_public: false,
          card_color: '#ffffff',
        })
        .select('id, title')
        .single();

      if (insertError) throw insertError;

      if (newList) {
        setEditableLists(prev => [newList, ...prev]);
        setSelectedLists(prev => new Set(prev).add(newList.id));
        toast.success(`Created watchlist "${newList.title}"!`);
        setNewTitle('');
        setIsCreatingNew(false);
      }
    } catch (err: unknown) {
      console.error("Error creating new watchlist:", err);
      toast.error(err instanceof Error ? err.message : 'Failed to create watchlist.');
    } finally {
      setCreatingLoading(false);
    }
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

      setTimeout(() => { onClose(); }, 600);
    } catch (err: unknown) {
      console.error("Error adding item to lists:", err);
      toast.error(err instanceof Error ? err.message : 'Failed to add item.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (!mediaItem) return null;

  const itemTitle = mediaItem.media_type === 'movie' ? mediaItem.title : mediaItem.name;
  const filteredLists = editableLists.filter(l => l.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add "${itemTitle}"`}
      subtitle="Select which watchlists to include this title in"
    >
      <div className="space-y-3.5">
        {/* Search & New Watchlist Controls */}
        <div className="space-y-2">
          {editableLists.length > 3 && (
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search your watchlists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
              />
            </div>
          )}

          {/* Quick Create New Watchlist Bar */}
          {!isCreatingNew ? (
            <button
              type="button"
              onClick={() => setIsCreatingNew(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-dashed border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs font-bold transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Create New Watchlist</span>
            </button>
          ) : (
            <form onSubmit={handleCreateWatchlist} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="New Watchlist Title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
                required
                className="flex-1 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
              />
              <button
                type="submit"
                disabled={creatingLoading || !newTitle.trim()}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                {creatingLoading ? 'Saving...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            </form>
          )}
        </div>

        {/* Watchlists Selection List */}
        {loading ? (
          <div className="text-center py-6 text-sm text-slate-500 animate-pulse font-medium">Loading watchlists...</div>
        ) : filteredLists.length === 0 ? (
          <p className="text-center py-6 text-sm text-slate-500 dark:text-slate-400 font-medium">
            {searchQuery ? 'No watchlists match your search.' : 'You do not have any editable watchlists yet.'}
          </p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {filteredLists.map(list => {
              const isAlreadyIn = existingListIds.has(list.id);
              const isChecked = selectedLists.has(list.id);

              return (
                <label
                  key={list.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer ${
                    isChecked
                      ? 'bg-red-500/10 border-red-500/40 text-slate-900 dark:text-slate-100'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleCheckboxChange(list.id)}
                      className="h-4 w-4 accent-red-600 rounded cursor-pointer"
                    />
                    <span className="text-sm font-semibold truncate text-slate-900 dark:text-slate-100">
                      {list.title}
                    </span>
                  </div>

                  {isAlreadyIn && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold shrink-0 flex items-center gap-1">
                      <CheckIcon className="w-3.5 h-3.5" />
                      <span>In List</span>
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-secondary text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAddItems}
            disabled={loading || selectedLists.size === 0}
            className="btn-primary text-sm"
          >
            {loading ? 'Adding...' : `Add to ${selectedLists.size} ${selectedLists.size === 1 ? 'List' : 'Lists'}`}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AddToListModal;
