import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { TmdbMediaDetails } from '../../services/tmdbService';
import { isMovieDetails } from '../../utils/tmdbUtils';
import { WatchlistItemWithDetails } from '../../hooks/useWatchlistItems';
import Modal from '../common/Modal';

interface RandomItemPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: WatchlistItemWithDetails[];
  watchedMediaIds?: Set<string>;
}

const SPIN_DURATION = 2000;
const PROGRESS_UPDATE_INTERVAL = 25;

const vibrate = (pattern: number | number[]) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

const vibrateSpinStart = () => vibrate([50, 30, 50, 30, 100]);
const vibrateWin = () => vibrate([300, 100, 300, 100, 500]);
const vibrateProgressPulse = () => vibrate(25);

const extractTitles = (items: WatchlistItemWithDetails[]): string[] => {
  return items.map(item =>
    item.tmdbDetails ? (isMovieDetails(item.tmdbDetails) ? item.tmdbDetails.title : item.tmdbDetails.name) : 'Unknown'
  );
};

export function RandomItemPickerModal({ isOpen, onClose, items, watchedMediaIds }: RandomItemPickerModalProps) {
  const [randomPick, setRandomPick] = useState<TmdbMediaDetails | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showPickerContent, setShowPickerContent] = useState(false);
  const [spinProgress, setSpinProgress] = useState(0);
  const [availableTitles, setAvailableTitles] = useState<string[]>([]);
  const [isVisuallySpinning, setIsVisuallySpinning] = useState(false);
  const [triggerReroll, setTriggerReroll] = useState(0);

  // Smart Filters
  const [unwatchedOnly, setUnwatchedOnly] = useState(false);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [under120Only, setUnder120Only] = useState(false);

  const startRandomPick = () => setTriggerReroll(prev => prev + 1);

  useEffect(() => {
    if (!isOpen) {
      setRandomPick(null);
      setIsSpinning(false);
      setIsVisuallySpinning(false);
      setShowPickerContent(false);
      setSpinProgress(0);
      setAvailableTitles([]);
      return;
    }

    setRandomPick(null);
    setShowPickerContent(false);
    setSpinProgress(0);
    setAvailableTitles([]);

    // Apply smart filters
    let filteredItems = items.filter(item => item.tmdbDetails);

    if (unwatchedOnly && watchedMediaIds) {
      filteredItems = filteredItems.filter(item => !watchedMediaIds.has(item.media_id));
    }

    if (mediaTypeFilter !== 'all') {
      filteredItems = filteredItems.filter(item => {
        if (!item.tmdbDetails) return false;
        return mediaTypeFilter === 'movie' ? isMovieDetails(item.tmdbDetails) : !isMovieDetails(item.tmdbDetails);
      });
    }

    if (under120Only) {
      filteredItems = filteredItems.filter(item => {
        if (item.tmdbDetails && isMovieDetails(item.tmdbDetails)) {
          return item.tmdbDetails.runtime ? item.tmdbDetails.runtime <= 120 : true;
        }
        return true;
      });
    }

    if (filteredItems.length === 0) {
      toast.error("No items match your filter criteria.");
      setShowPickerContent(true);
      return;
    }

    if (filteredItems.length === 1) {
      const singleItemDetails = filteredItems[0].tmdbDetails;
      if (singleItemDetails) {
        setRandomPick(singleItemDetails);
        setShowPickerContent(true);
      } else {
        toast.error("Could not display available item.");
        setShowPickerContent(true);
      }
      return;
    }

    setIsSpinning(true);
    setIsVisuallySpinning(true);
    vibrateSpinStart();

    const titles = extractTitles(filteredItems);
    setAvailableTitles(titles);

    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      const progress = Math.min(elapsedTime, SPIN_DURATION);
      setSpinProgress(progress);
      if (Math.random() > 0.7) vibrateProgressPulse();

      if (progress >= SPIN_DURATION) {
        clearInterval(progressInterval);

        const randomIndex = Math.floor(Math.random() * filteredItems.length);
        const selectedItem = filteredItems[randomIndex];

        setTimeout(() => {
          setIsVisuallySpinning(false);
          if (selectedItem?.tmdbDetails) {
            setRandomPick(selectedItem.tmdbDetails);
            vibrateWin();
          }
          setIsSpinning(false);
          setShowPickerContent(true);
        }, 300);
      }
    }, PROGRESS_UPDATE_INTERVAL);

    return () => clearInterval(progressInterval);
  }, [isOpen, triggerReroll, items, unwatchedOnly, mediaTypeFilter, under120Only, watchedMediaIds]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      title="Random Item Picker"
      subtitle="Can't decide what to watch? Let randomness pick!"
    >
      <div className="space-y-5">
        {/* Smart Filter Pills */}
        {!isSpinning && (
          <div className="space-y-2 pb-2 border-b border-slate-100 dark:border-slate-800/60">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Filter Options
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setUnwatchedOnly(!unwatchedOnly)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  unwatchedOnly
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-slate-200/60 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                }`}
              >
                {unwatchedOnly ? '✓ Unwatched Only' : '+ Unwatched Only'}
              </button>

              <button
                onClick={() => setMediaTypeFilter(mediaTypeFilter === 'movie' ? 'all' : 'movie')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  mediaTypeFilter === 'movie'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-slate-200/60 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                }`}
              >
                {mediaTypeFilter === 'movie' ? '✓ Movies Only' : 'Movies Only'}
              </button>

              <button
                onClick={() => setMediaTypeFilter(mediaTypeFilter === 'tv' ? 'all' : 'tv')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  mediaTypeFilter === 'tv'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-slate-200/60 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                }`}
              >
                {mediaTypeFilter === 'tv' ? '✓ TV Series Only' : 'TV Series Only'}
              </button>

              <button
                onClick={() => setUnder120Only(!under120Only)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  under120Only
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-slate-200/60 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                }`}
              >
                {under120Only ? '✓ Under 2 Hours' : 'Under 2 Hours'}
              </button>
            </div>
          </div>
        )}

        {isSpinning || isVisuallySpinning ? (
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-bold mb-4 text-red-600 dark:text-red-500 animate-pulse">
              Selecting title...
            </h3>
            <div className="slot-machine-container h-44 mb-6 w-full glass-panel rounded-2xl p-4 overflow-hidden relative">
              <div className={`slot-reel ${isVisuallySpinning ? 'animate-slot-spin' : ''}`}>
                {[...availableTitles, ...availableTitles].map((title, index) => (
                  <div key={`slot-${index}`} className="slot-item text-slate-800 dark:text-slate-200">
                    {title}
                  </div>
                ))}
              </div>
            </div>
            <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-600 rounded-full transition-all duration-100"
                style={{ width: `${(spinProgress / SPIN_DURATION) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className={`transition-opacity duration-300 ${showPickerContent ? 'opacity-100' : 'opacity-0'}`}>
            {randomPick ? (
              <div className="space-y-4">
                <div className="p-6 rounded-3xl glass-modal border border-red-500/40 text-center animate-hype shadow-xl shadow-red-600/10">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-red-500 block mb-1">
                    Selected Pick
                  </span>
                  <Link
                    to={`/${randomPick.media_type}/${randomPick.id}`}
                    onClick={onClose}
                    className="block group"
                  >
                    <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-red-500 transition-colors">
                      {isMovieDetails(randomPick) ? randomPick.title : randomPick.name}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                      {isMovieDetails(randomPick) ? randomPick.release_date?.substring(0, 4) : randomPick.first_air_date?.substring(0, 4)}
                    </p>
                  </Link>
                </div>

                <div className="flex justify-center gap-4 pt-4 mt-2">
                  <button
                    onClick={startRandomPick}
                    className="btn-primary min-w-[120px]"
                  >
                    Reroll
                  </button>
                  <button
                    onClick={onClose}
                    className="btn-secondary min-w-[120px]"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 font-medium">No available items match your current filter selection.</p>
                <button
                  onClick={onClose}
                  className="btn-secondary px-6 py-2.5"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default RandomItemPickerModal;