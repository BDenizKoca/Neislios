import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { TmdbMediaDetails } from '../../services/tmdbService';
import { isMovieDetails } from '../../utils/tmdbUtils';
import { WatchlistItemWithDetails } from '../../hooks/useWatchlistItems';
import Modal from '../common/Modal';
import { SparklesIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface RandomItemPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: WatchlistItemWithDetails[];
  watchedMediaIds?: Set<string>;
}

type SpinPhase = 'idle' | 'spinning' | 'slowing' | 'landed';

const ITEM_HEIGHT = 48; // 48px per slot item height
const REEL_LENGTH = 44; // Total dummy items in reel sequence
const TARGET_INDEX = 35; // Index where winning item lands

const vibrate = (pattern: number | number[]) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

const vibrateSpinStart = () => vibrate([40, 20, 40]);
const vibrateWin = () => vibrate([150, 50, 250]);

const getItemTitle = (item: WatchlistItemWithDetails): string => {
  if (!item.tmdbDetails) return 'Unknown Title';
  return isMovieDetails(item.tmdbDetails) ? item.tmdbDetails.title : item.tmdbDetails.name;
};

export function RandomItemPickerModal({ isOpen, onClose, items, watchedMediaIds }: RandomItemPickerModalProps) {
  // State
  const [hasSpun, setHasSpun] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinPhase, setSpinPhase] = useState<SpinPhase>('idle');
  const [randomPick, setRandomPick] = useState<TmdbMediaDetails | null>(null);

  // Filters
  const [unwatchedOnly, setUnwatchedOnly] = useState(false);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [under120Only, setUnder120Only] = useState(false);

  // Reel animation state
  const [reelList, setReelList] = useState<string[]>([]);
  const [targetOffset, setTargetOffset] = useState<number>(0);

  // Timers ref for safe cleanup
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearSpinTimers = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
  };

  // Filtered items computation
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (!item.tmdbDetails) return false;

      if (unwatchedOnly && watchedMediaIds && watchedMediaIds.has(item.media_id)) {
        return false;
      }

      if (mediaTypeFilter !== 'all') {
        const isMovie = isMovieDetails(item.tmdbDetails);
        if (mediaTypeFilter === 'movie' && !isMovie) return false;
        if (mediaTypeFilter === 'tv' && isMovie) return false;
      }

      if (under120Only) {
        if (isMovieDetails(item.tmdbDetails)) {
          if (item.tmdbDetails.runtime && item.tmdbDetails.runtime > 120) {
            return false;
          }
        }
      }

      return true;
    });
  }, [items, unwatchedOnly, mediaTypeFilter, under120Only, watchedMediaIds]);

  // Reset state on modal open/close
  useEffect(() => {
    if (!isOpen) {
      clearSpinTimers();
      setHasSpun(false);
      setIsSpinning(false);
      setSpinPhase('idle');
      setRandomPick(null);
      setTargetOffset(0);
      setReelList([]);
    }
    return () => clearSpinTimers();
  }, [isOpen]);

  const handleRoll = () => {
    if (filteredItems.length === 0) {
      toast.error('No items match your filter criteria.');
      return;
    }

    clearSpinTimers();
    setIsSpinning(true);
    setHasSpun(false);
    setRandomPick(null);
    setSpinPhase('spinning');
    setTargetOffset(0);
    vibrateSpinStart();

    // Select random winning item
    const winnerIndex = Math.floor(Math.random() * filteredItems.length);
    const winnerItem = filteredItems[winnerIndex];
    const winnerTitle = getItemTitle(winnerItem);

    // Build slot reel sequence
    const titlesPool = filteredItems.map(getItemTitle);
    const dummyReel: string[] = [];

    for (let i = 0; i < REEL_LENGTH; i++) {
      if (i === TARGET_INDEX) {
        dummyReel.push(winnerTitle);
      } else {
        const randomTitle = titlesPool[Math.floor(Math.random() * titlesPool.length)];
        dummyReel.push(randomTitle);
      }
    }

    setReelList(dummyReel);

    // Rapid haptic vibration ticks during fast spin
    intervalRef.current = setInterval(() => {
      vibrate([12]);
    }, 85);

    // Phase 1 -> Phase 2: Start deceleration spin at 1100ms
    const t1 = setTimeout(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      const finalY = 48 - (TARGET_INDEX * ITEM_HEIGHT);
      setSpinPhase('slowing');
      setTargetOffset(finalY);

      // Decelerating haptic ticks as reel slows down to lock position
      const dt1 = setTimeout(() => vibrate([15]), 300);
      const dt2 = setTimeout(() => vibrate([22]), 600);
      const dt3 = setTimeout(() => vibrate([30]), 900);
      const dt4 = setTimeout(() => vibrate([40]), 1100);
      timeoutsRef.current.push(dt1, dt2, dt3, dt4);
    }, 1100);

    // Phase 2 -> Phase 3: Spin completes and lands on winner at 2350ms
    const t2 = setTimeout(() => {
      setSpinPhase('landed');
      setIsSpinning(false);
      setHasSpun(true);
      if (winnerItem.tmdbDetails) {
        setRandomPick(winnerItem.tmdbDetails);
        vibrateWin();
      }
    }, 2350);

    timeoutsRef.current.push(t1, t2);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      title="Random Item Picker"
      subtitle="Can't decide what to watch? Configure filters and roll!"
    >
      <div className="space-y-6">
        {/* Filter Section */}
        <div className="space-y-3 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Filter Options
            </span>
            <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-600/10 px-2.5 py-0.5 rounded-full">
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} available
            </span>
          </div>

          {/* Media Type Segmented Control */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              disabled={isSpinning}
              onClick={() => setMediaTypeFilter('all')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                mediaTypeFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All Types
            </button>
            <button
              type="button"
              disabled={isSpinning}
              onClick={() => setMediaTypeFilter('movie')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                mediaTypeFilter === 'movie'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Movies Only
            </button>
            <button
              type="button"
              disabled={isSpinning}
              onClick={() => setMediaTypeFilter('tv')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                mediaTypeFilter === 'tv'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              TV Series Only
            </button>
          </div>

          {/* Quick Filter Badges */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={isSpinning}
              onClick={() => setUnwatchedOnly(!unwatchedOnly)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                unwatchedOnly
                  ? 'bg-red-600/10 border-red-500/40 text-red-600 dark:text-red-400 shadow-sm'
                  : 'bg-slate-100/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <span>{unwatchedOnly ? '✓' : '+'}</span>
              <span>Unwatched Only</span>
            </button>

            <button
              type="button"
              disabled={isSpinning}
              onClick={() => setUnder120Only(!under120Only)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                under120Only
                  ? 'bg-red-600/10 border-red-500/40 text-red-600 dark:text-red-400 shadow-sm'
                  : 'bg-slate-100/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <span>{under120Only ? '✓' : '+'}</span>
              <span>Under 2 Hours</span>
            </button>
          </div>
        </div>

        {/* Slot Machine Display / Pick Result */}
        <div className="relative">
          {/* Initial / Spinning State: Slot Machine Box */}
          {(!hasSpun || isSpinning) && (
            <div className="relative slot-machine-container w-full glass-panel rounded-3xl overflow-hidden border border-red-500/30 shadow-2xl">
              {/* Highlight Window & Center Marker */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 bg-red-600/15 border-y-2 border-red-500/50 z-10 pointer-events-none flex items-center justify-between px-4 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
                <span className="text-red-500 font-black text-sm animate-pulse">▶</span>
                <span className="text-red-500 font-black text-sm animate-pulse">◀</span>
              </div>

              {!isSpinning && reelList.length === 0 ? (
                <div className="z-30 text-center px-4">
                  <SparklesIcon className="w-8 h-8 mx-auto mb-1 text-red-500 animate-pulse" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Ready to roll!
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Click the Roll button below to start the spin.
                  </p>
                </div>
              ) : (
                <div
                  className={`slot-reel ${spinPhase === 'spinning' ? 'animate-slot-spin' : ''}`}
                  style={{
                    transform: spinPhase === 'spinning' ? undefined : `translateY(${targetOffset}px)`,
                    transition: spinPhase === 'slowing' ? 'transform 1250ms cubic-bezier(0.08, 0.82, 0.17, 1.0)' : 'none',
                  }}
                >
                  {reelList.map((title, idx) => {
                    const isWinningItem = spinPhase === 'landed' && idx === TARGET_INDEX;
                    return (
                      <div
                        key={`reel-${idx}`}
                        className={`slot-item px-4 text-slate-800 dark:text-slate-100 truncate ${
                          isWinningItem ? 'text-red-600 dark:text-red-400 text-lg font-black slot-final-pick' : ''
                        }`}
                      >
                        {title}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Winner Result Card */}
          {hasSpun && !isSpinning && randomPick && (
            <div className="p-6 rounded-3xl glass-modal border border-red-500/40 text-center animate-hype shadow-xl shadow-red-600/10 space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-red-500 block">
                🎉 Selected Pick
              </span>
              <Link
                to={`/${randomPick.media_type}/${randomPick.id}`}
                onClick={onClose}
                className="block group"
              >
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-red-500 transition-colors tracking-tight">
                  {isMovieDetails(randomPick) ? randomPick.title : randomPick.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-1">
                  {isMovieDetails(randomPick) ? randomPick.release_date?.substring(0, 4) : randomPick.first_air_date?.substring(0, 4)}
                  {isMovieDetails(randomPick) && randomPick.runtime ? ` • ${randomPick.runtime} min` : ''}
                </p>
              </Link>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-3 pt-2">
          {!hasSpun ? (
            <button
              type="button"
              disabled={isSpinning || filteredItems.length === 0}
              onClick={handleRoll}
              className="btn-primary px-8 py-3 w-full sm:w-auto min-w-[160px] text-base"
            >
              <SparklesIcon className="w-5 h-5" />
              <span>{isSpinning ? 'Spinning...' : 'Roll!'}</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={isSpinning || filteredItems.length === 0}
                onClick={handleRoll}
                className="btn-primary px-6 py-2.5 min-w-[130px]"
              >
                <ArrowPathIcon className="w-4 h-4" />
                <span>Reroll</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary px-6 py-2.5 min-w-[130px]"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default RandomItemPickerModal;