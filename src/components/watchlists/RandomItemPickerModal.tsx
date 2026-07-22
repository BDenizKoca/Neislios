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
}

const SPIN_DURATION = 2000;
const ITEM_HEIGHT = 86;
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

export function RandomItemPickerModal({ isOpen, onClose, items }: RandomItemPickerModalProps) {
  const [randomPick, setRandomPick] = useState<TmdbMediaDetails | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showPickerContent, setShowPickerContent] = useState(false);
  const [spinProgress, setSpinProgress] = useState(0);
  const [availableTitles, setAvailableTitles] = useState<string[]>([]);
  const [reelTranslation, setReelTranslation] = useState<number>(0);
  const [isVisuallySpinning, setIsVisuallySpinning] = useState(false);
  const [triggerReroll, setTriggerReroll] = useState(0);

  const startRandomPick = () => setTriggerReroll(prev => prev + 1);

  useEffect(() => {
    if (!isOpen) {
      setRandomPick(null);
      setIsSpinning(false);
      setIsVisuallySpinning(false);
      setShowPickerContent(false);
      setSpinProgress(0);
      setAvailableTitles([]);
      setReelTranslation(0);
      return;
    }

    setRandomPick(null);
    setShowPickerContent(false);
    setSpinProgress(0);
    setAvailableTitles([]);
    setReelTranslation(0);

    const availableItems = items.filter(item => item.tmdbDetails);

    if (availableItems.length === 0) {
      toast.error("No available items to pick from.");
      setShowPickerContent(true);
      return;
    }

    if (availableItems.length === 1) {
      const singleItemDetails = availableItems[0].tmdbDetails;
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

    const titles = extractTitles(availableItems);
    setAvailableTitles(titles);
    setReelTranslation(-titles.length * ITEM_HEIGHT);

    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      const progress = Math.min(elapsedTime, SPIN_DURATION);
      setSpinProgress(progress);
      if (Math.random() > 0.7) vibrateProgressPulse();

      if (progress >= SPIN_DURATION) {
        clearInterval(progressInterval);

        const randomIndex = Math.floor(Math.random() * availableItems.length);
        const selectedItem = availableItems[randomIndex];

        setTimeout(() => {
          setIsVisuallySpinning(false);
          if (selectedItem?.tmdbDetails) {
            setRandomPick(selectedItem.tmdbDetails);
            vibrateWin();
          }
          setIsSpinning(false);
          setShowPickerContent(true);
        }, 150);
      }
    }, PROGRESS_UPDATE_INTERVAL);

    return () => clearInterval(progressInterval);
  }, [isOpen, items, triggerReroll]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Random Selector"
      subtitle="Select a random title from your watchlist"
      maxWidthClass="max-w-md"
    >
      <div className="text-center py-2">
        {isSpinning || isVisuallySpinning ? (
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-bold mb-4 gradient-text animate-pulse">
              Selecting title...
            </h3>
            <div className="slot-machine-container h-48 mb-6 w-full glass-panel rounded-2xl p-4">
              <div
                className={`slot-reel ${isVisuallySpinning ? 'animate-slot-spin' : ''}`}
                style={{ '--reel-translation': `${reelTranslation}px` } as React.CSSProperties}
              >
                {availableTitles.map((title, index) => (
                  <div key={`slot-${index}`} className="slot-item h-12 flex items-center justify-center font-bold text-slate-800 dark:text-slate-200">
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
                <div className="p-6 rounded-3xl bg-slate-900 border border-red-500/40 text-center animate-hype shadow-xl shadow-red-600/10">
                  <span className="text-xs font-bold uppercase tracking-wider text-red-500 block mb-1">
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
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {isMovieDetails(randomPick) ? randomPick.release_date?.substring(0, 4) : randomPick.first_air_date?.substring(0, 4)}
                    </p>
                  </Link>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={startRandomPick}
                    className="flex-1 btn-primary"
                  >
                    Reroll
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 btn-secondary"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">No available items to pick from.</p>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold"
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