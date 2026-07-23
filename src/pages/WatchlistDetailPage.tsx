import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '../components/common/SortableItem';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { TmdbMediaDetails } from '../services/tmdbService';
import MediaListItem from '../components/movies/MovieListItem';
import MovieListItemSkeleton from '../components/movies/MovieListItemSkeleton';
import Skeleton from 'react-loading-skeleton';
import toast from 'react-hot-toast';
import { useLayoutActions } from '../hooks/useLayoutActions';
import { useHeader } from '../hooks/useHeader';
import { useWatchlistDetails } from '../hooks/useWatchlistDetails';
import { useWatchlistItems, WatchlistItemWithDetails } from '../hooks/useWatchlistItems';
import { useWatchlistMembers } from '../hooks/useWatchlistMembers';
import { RandomItemPickerModal } from '../components/watchlists/RandomItemPickerModal';
import { useWatchlistAI } from '../hooks/useWatchlistAI';
import MediaRecommendationModal from '../components/recommendations/MediaRecommendationModal';
import ShareListModal from '../components/watchlists/ShareListModal';
import ExportListModal from '../components/watchlists/ExportListModal';
import { computeWatchlistStats } from '../utils/watchlistStats';
import { isMovieDetails } from '../utils/tmdbUtils';
import { LightBulbIcon, ShareIcon, ArrowDownTrayIcon, MagnifyingGlassIcon, CheckCircleIcon, SparklesIcon, ChevronDownIcon, ChevronUpIcon, CheckIcon } from '@heroicons/react/24/outline';
import CollaboratorAvatars from '../components/watchlists/CollaboratorAvatars';
import { sortWatchlistItems } from '../utils/sortUtils';

const SCROLL_STORAGE_KEY = 'watchlistDetailScrollPosition';

const sortOptions = [
  { value: 'item_order', label: 'Manual Order' },
  { value: 'added_at_desc', label: 'Added (Newest)' },
  { value: 'added_at_asc', label: 'Added (Oldest)' },
  { value: 'title_asc', label: 'Title (A-Z)' },
  { value: 'title_desc', label: 'Title (Z-A)' },
  { value: 'rating_desc', label: 'Rating (High-Low)' },
  { value: 'rating_asc', label: 'Rating (Low-High)' },
];

const GenreMultiSelectDropdown: React.FC<{
  availableGenres: string[];
  selectedGenres: string[];
  onChange: (genres: string[]) => void;
}> = ({ availableGenres, selectedGenres, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      onChange(selectedGenres.filter(g => g !== genre));
    } else {
      onChange([...selectedGenres, genre]);
    }
  };

  const handleSelectAll = () => {
    onChange([]);
  };

  let labelText = 'All Genres';
  if (selectedGenres.length === 1) {
    labelText = selectedGenres[0];
  } else if (selectedGenres.length > 1) {
    labelText = `${selectedGenres.length} Genres`;
  }

  return (
    <div className="relative inline-block text-left w-full sm:w-auto" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 text-xs sm:text-sm py-2 px-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-[#131b2a] text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 w-full hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
      >
        <span className="truncate">{labelText}</span>
        <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#131b2a] border border-slate-300 dark:border-slate-700/80 shadow-2xl z-50 p-2 space-y-1 max-h-64 overflow-y-auto no-scrollbar">
          <button
            type="button"
            onClick={handleSelectAll}
            className={`w-full text-left px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-between transition-colors ${
              selectedGenres.length === 0
                ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>All Genres</span>
            {selectedGenres.length === 0 && <CheckIcon className="w-4 h-4 text-red-600 dark:text-red-400" />}
          </button>
          
          <div className="my-1 border-t border-slate-200 dark:border-slate-800" />

          {availableGenres.map((genre) => {
            const isSelected = selectedGenres.includes(genre);
            return (
              <label
                key={genre}
                className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleGenre(genre)}
                  className="h-4 w-4 accent-red-600 rounded cursor-pointer"
                />
                <span className="truncate">{genre}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SortByDropdown: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentOption = sortOptions.find((o) => o.value === value) || sortOptions[0];

  return (
    <div className="relative inline-block text-left w-full sm:w-auto" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 text-xs sm:text-sm py-2 px-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-[#131b2a] text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 w-full hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
      >
        <span className="truncate">{currentOption.label}</span>
        <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white dark:bg-[#131b2a] border border-slate-300 dark:border-slate-700/80 shadow-2xl z-50 p-2 space-y-1">
          {sortOptions.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <span>{option.label}</span>
                {isSelected && <CheckIcon className="w-4 h-4 text-red-600 dark:text-red-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

function WatchlistDetailPage() {
  const { id: watchlistId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const pageRef = useRef<HTMLDivElement>(null);
  const { registerRandomPickTrigger } = useLayoutActions();
  const { setHeaderTitle } = useHeader();

  const navigateWithScrollSave = useCallback((to: string) => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      const currentScroll = mainElement.scrollTop;
      sessionStorage.setItem(SCROLL_STORAGE_KEY, currentScroll.toString());
    }
    navigate(to);
  }, [navigate]);

  const {
    watchlist,
    userRole,
    loading: loadingDetails,
    error: errorDetails,
  } = useWatchlistDetails(watchlistId);

  const {
    items: watchlistItems,
    loading: loadingItems,
    error: errorItems,
    refetch: refetchItems
  } = useWatchlistItems(watchlistId);

  const {
    members,
    membersWatchedMediaMap,
    loading: loadingMembers,
    error: errorMembers,
  } = useWatchlistMembers(watchlistId);

  const { loading: checkingAIEligibility, error: errorAIEligibility } = useWatchlistAI(watchlistId);

  useEffect(() => {
    const handleWatchlistUpdate = (event: CustomEvent) => {
      const { watchlistId: updatedWatchlistId } = event.detail;
      if (updatedWatchlistId === watchlistId) {
        if (typeof refetchItems === 'function') {
          refetchItems();
        }
      }
    };

    window.addEventListener('watchlist-updated', handleWatchlistUpdate as EventListener);
    return () => {
      window.removeEventListener('watchlist-updated', handleWatchlistUpdate as EventListener);
    };
  }, [watchlistId, refetchItems]);

  // --- Local UI State ---
  const [watchedMedia, setWatchedMedia] = useState<Set<string>>(new Set());
  const [hideWatched, setHideWatched] = useState(false);
  const [sortBy, setSortBy] = useState<string>('item_order');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [showRandomPickModal, setShowRandomPickModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [sortedAndFilteredItems, setSortedAndFilteredItems] = useState<WatchlistItemWithDetails[]>([]);
  const [isAIEligible, setIsAIEligible] = useState(false);
  const [showAIRecommendModal, setShowAIRecommendModal] = useState(false);
  const [showMobileDetails, setShowMobileDetails] = useState(false);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSortedAndFilteredItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  useEffect(() => {
    if (watchlistItems && watchlistItems.length >= 10) {
      setIsAIEligible(true);
    } else {
      setIsAIEligible(false);
    }
  }, [watchlistItems]);

  // In-memory Filter & Sort
  const sortAndFilterItems = useCallback(() => {
    let sorted = sortWatchlistItems(watchlistItems, sortBy, hideWatched, watchedMedia);

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      sorted = sorted.filter(item => {
        if (!item.tmdbDetails) return false;
        const title = isMovieDetails(item.tmdbDetails) ? item.tmdbDetails.title : item.tmdbDetails.name;
        return title.toLowerCase().includes(term);
      });
    }

    if (selectedGenres.length > 0) {
      sorted = sorted.filter(item => {
        if (!item.tmdbDetails?.genres) return false;
        const itemGenreNames = item.tmdbDetails.genres.map(g => g.name.toLowerCase());
        return selectedGenres.some(sg => itemGenreNames.includes(sg.toLowerCase()));
      });
    }

    setSortedAndFilteredItems(sorted);
  }, [watchlistItems, sortBy, hideWatched, watchedMedia, searchTerm, selectedGenres]);

  useEffect(() => {
    sortAndFilterItems();
  }, [sortAndFilterItems]);

  useEffect(() => {
    if (watchlist?.title) {
      setHeaderTitle(watchlist.title);
    }
    return () => setHeaderTitle('');
  }, [watchlist, setHeaderTitle]);

  useEffect(() => {
    const fetchWatched = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase.from('user_watched_items').select('media_id').eq('user_id', user.id);
        if (error) throw error;
        setWatchedMedia(new Set(data?.map(m => m.media_id) || []));
      } catch (err) { console.error("Failed to fetch watched media:", err); }
    };
    fetchWatched();
  }, [user]);

  const handleToggleWatched = async (item: TmdbMediaDetails, currentState: boolean) => {
    if (!user || !item) return;
    const mediaId = `${item.media_type === 'movie' ? 'tmdb:movie' : 'tmdb:tv'}:${item.id}`;

    setWatchedMedia(prev => {
        const newSet = new Set(prev);
        if (currentState) {
            newSet.delete(mediaId);
        } else {
            newSet.add(mediaId);
        }
        return newSet;
    });

    const toastId = toast.loading(currentState ? 'Marking as unwatched...' : 'Marking as watched...');
    try {
        let operationError;
        if (currentState) {
            const { error } = await supabase.from('user_watched_items').delete().match({ user_id: user.id, media_id: mediaId });
            operationError = error;
        } else {
            const { error } = await supabase.from('user_watched_items').insert({ user_id: user.id, media_id: mediaId });
            operationError = error;
        }
        if (operationError) throw operationError;
        toast.success(currentState ? 'Marked as unwatched.' : 'Marked as watched.', { id: toastId });
    } catch (err: unknown) {
        console.error("Supabase Error (Toggle Watched):", err);
        setWatchedMedia(prev => {
            const revertedSet = new Set(prev);
            if (currentState) {
                revertedSet.add(mediaId);
            } else {
                revertedSet.delete(mediaId);
            }
            return revertedSet;
        });
        toast.error(err instanceof Error ? err.message : 'Failed to update watched status.', { id: toastId });
    }
  };

  const handlePickRandom = useCallback(() => {
    const availableItems = sortedAndFilteredItems.filter(item => item.tmdbDetails);
    if (availableItems.length === 0) {
      toast.error("No available items to pick from.");
      return;
    }
    setShowRandomPickModal(true);
  }, [sortedAndFilteredItems]);

  useEffect(() => {
    registerRandomPickTrigger(handlePickRandom);
    return () => {
      registerRandomPickTrigger(null);
    };
  }, [registerRandomPickTrigger, handlePickRandom]);

  const isLoading = loadingDetails || loadingItems || loadingMembers;
  const overallError = errorDetails || errorItems || errorMembers || errorAIEligibility;
  const stats = computeWatchlistStats(watchlistItems, watchedMedia);

  // Extract unique genres across items
  const availableGenres = Array.from(
    new Set(
      watchlistItems
        .flatMap(item => item.tmdbDetails?.genres?.map(g => g.name) || [])
        .filter(Boolean)
    )
  ).sort();

  if (isLoading && !watchlist) {
    return (
      <div className="container mx-auto p-4 max-w-5xl">
        <Skeleton height={30} width={200} className="mb-4" />
        <Skeleton height={20} width={150} className="mb-4" />
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => <MovieListItemSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (overallError) {
    return <div className="text-rose-500 p-6 text-center font-bold">Error loading watchlist: {overallError}</div>;
  }

  if (!watchlist) {
    return <div className="p-6 text-center text-slate-500 font-semibold">Watchlist not found.</div>;
  }

  const canAccess = userRole === 'owner' || userRole === 'editor' || userRole === 'viewer';
  const canEdit = userRole === 'owner' || userRole === 'editor';

  return (
    <div ref={pageRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full space-y-5">
      {/* Watchlist Header Panel */}
      <div className="p-4 sm:p-6 glass-panel rounded-3xl space-y-3.5">
        {/* Top Header Row (Title & Mobile Chevron Toggle) */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight break-words">
              {watchlist.title}
            </h1>
            {watchlistItems.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-red-600/10 text-red-600 dark:text-red-400 font-extrabold text-xs shrink-0">
                {stats.percentage}%
              </span>
            )}
            {members && members.length > 0 && (
              <CollaboratorAvatars 
                members={members}
                ownerId={watchlist.owner_id}
                maxVisible={4}
                size="sm"
                textColor="text-slate-600 dark:text-slate-400"
              />
            )}
          </div>

          {/* Mobile Collapse Toggle Button */}
          <button
            type="button"
            onClick={() => setShowMobileDetails(!showMobileDetails)}
            className="sm:hidden p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 bg-slate-200/80 dark:bg-slate-800/60 border border-slate-300/80 dark:border-slate-700/60 shrink-0 transition-colors"
            aria-label="Toggle details"
          >
            {showMobileDetails ? (
              <ChevronUpIcon className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            )}
          </button>
        </div>

        {/* Collapsible Content Area (Always visible on Desktop, toggled on Mobile) */}
        <div className={`${showMobileDetails ? 'block' : 'hidden sm:block'} space-y-4 pt-1`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Description & Owner */}
            <div className="space-y-1.5 flex-1">
              <p className="text-xs sm:text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-2xl">
                {watchlist.description || 'No description provided.'}
              </p>
              <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                Owner: <span className="font-semibold text-slate-700 dark:text-slate-200">{watchlist.owner?.display_name || 'Unknown'}</span>
              </div>
            </div>

            {/* Progress Card (Compact & right aligned on desktop) */}
            {watchlistItems.length > 0 && (
              <div className="w-full lg:w-80 p-3 sm:p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5 shrink-0">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                    <span>{stats.watched} of {stats.total} Watched</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-red-600/10 text-red-600 dark:text-red-400 font-extrabold text-[11px]">
                    {stats.percentage}%
                  </span>
                </div>
                <div className="h-2 sm:h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600 rounded-full transition-all duration-500"
                    style={{ width: `${stats.percentage}%` }}
                  />
                </div>
                {stats.formattedRuntime !== '0m' && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {stats.formattedRuntime} • {stats.movieCount} Movies, {stats.tvCount} TV Shows
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Structured Action Buttons Grid (2 Columns on Mobile, Flex on Desktop) */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
            <button
              onClick={handlePickRandom}
              className="btn-primary text-xs sm:text-sm px-3.5 py-2.5 justify-center shadow-md shadow-red-600/20"
            >
              <SparklesIcon className="h-4 w-4" />
              <span>Random Pick</span>
            </button>

            {isAIEligible && (
              <button
                onClick={() => setShowAIRecommendModal(true)}
                className="btn-secondary text-xs sm:text-sm px-3.5 py-2.5 justify-center"
                disabled={checkingAIEligibility}
              >
                <LightBulbIcon className="h-4 w-4 text-amber-500" />
                <span>{checkingAIEligibility ? 'Checking...' : 'AI Recommend'}</span>
              </button>
            )}

            <button
              onClick={() => setShowShareModal(true)}
              className="btn-secondary text-xs sm:text-sm px-3.5 py-2.5 justify-center"
            >
              <ShareIcon className="h-4 w-4 text-red-500" />
              <span>Share</span>
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="btn-secondary text-xs sm:text-sm px-3.5 py-2.5 justify-center"
            >
              <ArrowDownTrayIcon className="h-4 w-4 text-slate-400" />
              <span>Export</span>
            </button>

            {canAccess && (
              <>
                <button
                  onClick={() => navigateWithScrollSave(`/watchlist/${watchlistId}/manage`)}
                  className="btn-secondary text-xs sm:text-sm px-3.5 py-2.5 justify-center"
                >
                  {userRole === 'viewer' ? 'View List' : 'Manage List'}
                </button>
                {userRole === 'owner' && (
                  <button
                    onClick={() => navigateWithScrollSave(`/watchlist/${watchlistId}/collaborators`)}
                    className="btn-secondary text-xs sm:text-sm px-3.5 py-2.5 justify-center"
                  >
                    <span>Collaborators</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Instant In-Memory Filter & Controls Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search in this list..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Structured Filter Controls Layout */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 shrink-0">
          {availableGenres.length > 0 && (
            <GenreMultiSelectDropdown
              availableGenres={availableGenres}
              selectedGenres={selectedGenres}
              onChange={setSelectedGenres}
            />
          )}

          <SortByDropdown
            value={sortBy}
            onChange={setSortBy}
          />

          <label 
            htmlFor="hideWatchedToggle" 
            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <input
              id="hideWatchedToggle"
              type="checkbox"
              checked={hideWatched}
              onChange={(e) => setHideWatched(e.target.checked)}
              className="h-4 w-4 accent-red-600 rounded cursor-pointer"
            />
            <span>Hide Watched</span>
          </label>
        </div>
      </div>

      {/* Watchlist Items Header + Right-Aligned Manage List Button */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            Items ({sortedAndFilteredItems.length})
          </h3>
          {canEdit && (
            <Link
              to={`/watchlist/${watchlist.id}/manage`}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors inline-flex items-center shadow-sm"
              title="Add or Manage Items"
            >
              <span>Manage List</span>
            </Link>
          )}
        </div>

        {watchlistItems.length === 0 && !isLoading ? (
          <p className="text-slate-500 dark:text-slate-400 font-medium">No items added yet.</p>
        ) : sortedAndFilteredItems.length === 0 && !isLoading ? (
          <p className="text-slate-500 dark:text-slate-400 font-medium">No items match the current search filter.</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext items={sortedAndFilteredItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {sortedAndFilteredItems.map(item => {
                  const addedByUser = members.find(m => m.id === item.added_by_user_id);
                  const memberWatcherIds = membersWatchedMediaMap.get(item.media_id) || new Set<string>();
                  const membersWhoWatched = members.filter(m => memberWatcherIds.has(m.id));
                  
                  return (
                    <SortableItem key={item.id} id={item.id}>
                      {({ attributes, listeners, ref, className }) => (
                        <div
                          ref={ref}
                          className={className}
                          {...attributes}
                          {...listeners}
                          style={{ touchAction: 'manipulation' }}
                        >
                        {item.tmdbDetails ? (
                          <MediaListItem
                            mediaItem={item.tmdbDetails}
                            isWatched={watchedMedia.has(item.media_id)}
                            onToggleWatched={handleToggleWatched}
                            addedBy={addedByUser}
                            watchedByMembers={membersWhoWatched}
                            watchlistId={watchlistId}
                          />
                        ) : (
                          <div className="p-3 border rounded dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-500 flex items-center space-x-2">
                            <Skeleton circle height={24} width={24} />
                            <span>Could not load details for {item.media_id}</span>
                          </div>
                        )}
                        </div>
                      )}
                    </SortableItem>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Modals */}
      <RandomItemPickerModal
        isOpen={showRandomPickModal}
        onClose={() => setShowRandomPickModal(false)}
        items={sortedAndFilteredItems}
        watchedMediaIds={watchedMedia}
      />

      <ShareListModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        watchlist={watchlist}
      />

      <ExportListModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        watchlist={watchlist}
        items={watchlistItems}
      />

      {watchlistId && (
        <MediaRecommendationModal
          isOpen={showAIRecommendModal}
          onClose={() => setShowAIRecommendModal(false)}
          watchlistId={watchlistId}
        />
      )}
    </div>
  );
}

export default WatchlistDetailPage;
